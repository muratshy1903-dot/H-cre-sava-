import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
export function createGameReset({db,dataDir,fail,json,budget,scrypt,sha,isOwner,profileNew,flush,clearRuntime,getGeneration=()=>0}){
 db.exec('CREATE TABLE IF NOT EXISTS reset_backups(id TEXT PRIMARY KEY,owner INTEGER NOT NULL,path TEXT NOT NULL,created INTEGER NOT NULL)');
 const challenges=new Map();
 const sessionHash=req=>sha(req.headers.cookie?.match(/(?:^|;\s*)agarm_session=([^;]+)/)?.[1]||'');
 const summary=owner=>({accounts:db.prepare('SELECT count(*) n FROM accounts WHERE id<>?').get(owner).n,records:db.prepare('SELECT count(*) n FROM records').get().n,customRooms:db.prepare("SELECT count(*) n FROM room_controls WHERE json_extract(definition,'$.custom')=1").get().n});
 async function route(req,res,url,p,data){const generation=getGeneration();
  const backup=url.pathname.match(/^\/api\/management-backup\/([a-f0-9]{32})$/);
  if(!backup&&!url.pathname.startsWith('/api/management-reset/'))return false;
  if(!isOwner(p))fail('Bu işlem yalnızca hesap sahibine açık',403);
  if(backup){if(req.method!=='GET')fail('Yöntem desteklenmiyor',405);const row=db.prepare('SELECT * FROM reset_backups WHERE id=? AND owner=?').get(backup[1],p.id);if(!row||!fs.existsSync(row.path))fail('Yedek bulunamadı',404);res.writeHead(200,{'content-type':'application/octet-stream','content-disposition':'attachment; filename="Agarm-sifirlama-yedegi-'+row.id+'.sqlite"','cache-control':'no-store','x-content-type-options':'nosniff'});fs.createReadStream(row.path).pipe(res);return true;}
  if(req.method!=='POST')fail('Yöntem desteklenmiyor',405);
  if(url.pathname==='/api/management-reset/prepare'){
   budget(req,'reset-password',5,900000);const row=db.prepare('SELECT hash,salt FROM accounts WHERE id=?').get(p.id),hash=await scrypt(String(data.password||'').slice(0,128),row.salt,64);
   if(generation!==getGeneration())fail('Oyun sıfırlandı. Sayfayı yenile.',409);
   if(!crypto.timingSafeEqual(hash,Buffer.from(row.hash,'hex')))fail('Hesap parolanı doğrula',401);
   if(!isOwner(p))fail('Hesap sahibi yetkisi gerekli',403);
   const nonce=crypto.randomBytes(32).toString('hex'),expires=Date.now()+180000;challenges.set(p.id,{hash:sha(nonce),session:sessionHash(req),expires});json(res,200,{ok:true,nonce,expires,summary:summary(p.id)});return true;
  }
  if(url.pathname!=='/api/management-reset/execute')fail('İşlem bulunamadı',404);
  budget(req,'game-reset',3,3600000);const challenge=challenges.get(p.id);
  if(String(data.confirmation||'').trim()!=='SIFIRLA'||!challenge||challenge.expires<Date.now()||challenge.session!==sessionHash(req)||challenge.hash!==sha(String(data.nonce||'')))fail('Onay geçersiz veya süresi doldu. Parolanla yeniden hazırla.');
  challenges.delete(p.id);flush();const counts=summary(p.id),id=crypto.randomBytes(16).toString('hex'),created=Date.now(),dir=path.join(dataDir,'reset-backups');fs.mkdirSync(dir,{recursive:true,mode:0o700});const backupPath=path.join(dir,id+'.sqlite');
  db.prepare('VACUUM INTO ?').run(backupPath);fs.chmodSync(backupPath,0o600);
  const fresh={...profileNew(p.name),role:'admin',emailVerified:!!p.emailVerified};
  db.exec('BEGIN IMMEDIATE');
  try{
   const keep=new Set(['accounts','sessions','recovery','audit','reset_backups']);
   for(const {name}of db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all())if(!keep.has(name)){if(!/^[a-z_]+$/.test(name))throw Error('Unsupported table');db.exec('DELETE FROM "'+name+'"');}
   db.prepare('DELETE FROM sessions WHERE token<>? OR account_id<>?').run(sessionHash(req),p.id);db.prepare('DELETE FROM recovery WHERE account_id<>?').run(p.id);db.prepare('DELETE FROM accounts WHERE id<>?').run(p.id);db.prepare('UPDATE accounts SET profile=? WHERE id=?').run(JSON.stringify(fresh),p.id);
   db.prepare('INSERT INTO reset_backups(id,owner,path,created) VALUES(?,?,?,?)').run(id,p.id,backupPath,created);
   db.prepare('INSERT INTO audit(actor,action,target,detail,at) VALUES(?,?,?,?,?)').run(p.id,'gameReset',p.id,JSON.stringify({...counts,backup:id,ownerPreserved:true}),created);
   db.exec("UPDATE sqlite_sequence SET seq=(SELECT MAX(id) FROM accounts) WHERE name='accounts'");db.exec('COMMIT');
  }catch(error){db.exec('ROLLBACK');throw error;}
  const ownerId=p.id,email=p.email;for(const key of Object.keys(p))delete p[key];Object.assign(p,{id:ownerId,email,...fresh});clearRuntime(p);
  json(res,200,{ok:true,backupUrl:'/api/management-backup/'+id,created,summary:counts});return true;
 }
 return {route};
}
