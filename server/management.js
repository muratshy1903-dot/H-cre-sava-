import crypto from 'node:crypto';
export function createManagement({db,account,save,atomic,budget,fail,json,sha,worlds,worldFor,connections,rooms,roomTiming,clients}){
 db.exec(`CREATE TABLE IF NOT EXISTS room_settings(room TEXT PRIMARY KEY,base_prize INTEGER NOT NULL DEFAULT 50000,closed INTEGER NOT NULL DEFAULT 0);
 CREATE TABLE IF NOT EXISTS management_settings(key TEXT PRIMARY KEY,value TEXT);
 CREATE TABLE IF NOT EXISTS room_history(room TEXT PRIMARY KEY,winner_name TEXT,winner_score INTEGER,highest_score INTEGER NOT NULL DEFAULT 0,at INTEGER);
 CREATE TABLE IF NOT EXISTS reports(id INTEGER PRIMARY KEY AUTOINCREMENT,reporter INTEGER,target INTEGER,text TEXT,at INTEGER,status TEXT DEFAULT 'Açık');`);
 const log=(p,action,target,detail)=>db.prepare('INSERT INTO audit(actor,action,target,detail,at) VALUES(?,?,?,?,?)').run(p.id,action,target||0,detail||'',Date.now());
 const config=room=>db.prepare('SELECT * FROM room_settings WHERE room=?').get(room)||{room,base_prize:50000,closed:0};
 const setupAvailable=()=>!!process.env.AGARM_ADMIN_SETUP_HASH&&!db.prepare("SELECT value FROM management_settings WHERE key='admin_claimed'").get()&&!db.prepare("SELECT id FROM accounts WHERE json_extract(profile,'$.role')='admin' LIMIT 1").get();
 const roomList=()=>rooms.map(r=>({...r,...roomTiming(r.id),...config(r.id),players:[...(worlds.get(r.id)?.players.values()||[])].filter(p=>!p.bot&&!p.spectator).length}));
 async function route(req,res,url,p,data){
  if(url.pathname==='/api/management-status'){json(res,200,{setupAvailable:setupAvailable()});return true;}
  if(url.pathname==='/api/admin-setup'&&req.method==='POST'){
   if(!p)fail('Önce kendi hesabına giriş yap',401);budget(req,'admin-setup',5,900000);
   const expected=process.env.AGARM_ADMIN_SETUP_HASH||'',hash=sha(String(data.code||'').slice(0,256));
   if(!setupAvailable()||expected.length!==64||!crypto.timingSafeEqual(Buffer.from(hash),Buffer.from(expected)))fail('Kurulum kodu geçersiz veya daha önce kullanılmış',403);
   atomic(()=>{if(!setupAvailable())fail('Yönetici kurulumu tamamlandı',403);p.role='admin';save(p);db.prepare("INSERT INTO management_settings VALUES('admin_claimed',?)").run(String(p.id));log(p,'adminSetup',p.id,'İlk yönetici etkinleştirildi')},p,'adminSetup');
   json(res,200,{ok:true});return true;
  }
  if(url.pathname!=='/api/management')return false;
  if(p?.role!=='admin')fail('Yönetici yetkisi gerekli',403);
  if(req.method==='GET'){
   const users=db.prepare('SELECT id FROM accounts ORDER BY id DESC LIMIT 200').all().map(r=>account(r.id));
   json(res,200,{stats:{accounts:db.prepare('SELECT count(*) n FROM accounts').get().n,online:clients().size,activeRooms:worlds.size},rooms:roomList(),users:users.map(a=>({id:a.id,name:a.name,gold:a.gold,bonus:a.bonus,premiumUntil:a.premiumUntil,bannedUntil:a.bannedUntil||0,mutedUntil:a.mutedUntil||0,role:a.role||'player'})),reports:db.prepare('SELECT * FROM reports ORDER BY id DESC LIMIT 100').all()});return true;
  }
  if(req.method!=='POST')fail('Yöntem desteklenmiyor',405);
  budget(req,'management',40);const action=String(data.action||''),reason=String(data.reason||'').trim().slice(0,200);let result={ok:true};
  if(['wallet','premium','mute','kick'].includes(action)){
   const a=account(Number(data.target));if(!a)fail('Hesap bulunamadı',404);
   atomic(()=>{
    account(a.id);
    if(action==='wallet'){const amount=Number(data.amount),wallet=data.wallet;if(!['gold','bonus'].includes(wallet)||!Number.isSafeInteger(amount)||Math.abs(amount)>100000000||!reason)fail('Bakiye, tutar ve işlem nedeni gerekli');if(a[wallet]+amount<0||!Number.isSafeInteger(a[wallet]+amount))fail('Yetersiz veya geçersiz bakiye');a[wallet]+=amount;save(a);}
    if(action==='premium'){const days=Number(data.days);if(!Number.isInteger(days)||days<0||days>365)fail('Gün 0-365 olmalı');a.premiumUntil=days?Math.max(Date.now(),a.premiumUntil)+days*86400000:0;save(a);}
    if(action==='mute'){const hours=Number(data.hours);if(a.id===p.id||!Number.isInteger(hours)||hours<0||hours>8760)fail('Susturma süresi veya hesap geçersiz');a.mutedUntil=hours?Date.now()+hours*3600000:0;save(a);}
    log(p,action,a.id,JSON.stringify({amount:data.amount,wallet:data.wallet,days:data.days,hours:data.hours,reason}));
   },p,'admin:'+action);
   if(action==='kick')connections.get(a.id)?.close(1008,'Yönetici tarafından oyundan çıkarıldın');
  }else if(action==='room'){
   const id=String(data.room||'');if(!rooms.some(r=>r.id===id))fail('Oda bulunamadı');const base=Number(data.basePrize),extra=Number(data.extraPrize||0);if(!Number.isSafeInteger(base)||base<0||base>100000000||!Number.isSafeInteger(extra)||extra<0||extra>100000000)fail('Ödül 0-100.000.000 arasında olmalı');const w=worlds.get(id);const old=config(id);if(w&&w.prize+extra>1000000000)fail('Oda ödül sınırı');
   atomic(()=>{db.prepare('INSERT INTO room_settings(room,base_prize,closed) VALUES(?,?,?) ON CONFLICT(room) DO UPDATE SET base_prize=excluded.base_prize,closed=excluded.closed').run(id,base,data.closed===true?1:0);log(p,'room',0,JSON.stringify({room:id,base,extra,closed:data.closed===true}));},p,'admin:room');
   if(w){w.basePrize=base;w.prize=Math.max(0,w.prize+base-old.base_prize+extra);}else if(extra){const w=worldFor(id);w.prize+=extra;}
  }else if(action==='finishRoom'){
   const id=String(data.room||'');if(!rooms.some(r=>r.id===id))fail('Oda bulunamadı');const w=worldFor(id);w.finishRequested=[...w.players.values()].some(a=>!a.bot&&a.cells.length);if(!w.finishRequested){w.prize=w.basePrize;const t=roomTiming(id);w.roundStart=t.startsAt;w.roundEnd=t.endsAt;}log(p,action,0,id);
  }else if(action==='announce'){
   const text=String(data.text||'').trim().slice(0,300);if(!text)fail('Duyuru yaz');const packet=JSON.stringify({type:'chat',name:'YÖNETİM',text});for(const ws of clients())if(ws.readyState===1)ws.send(packet);log(p,action,0,text);
  }else if(action==='pin'){
   const kind=data.kind,amount=Number(data.amount);if(!['gold','premium'].includes(kind)||!Number.isSafeInteger(amount)||amount<1||amount>(kind==='premium'?365:100000000))fail('PIN türü veya miktar geçersiz');const code='AGM-'+crypto.randomBytes(16).toString('hex').toUpperCase();db.prepare('INSERT INTO pins(hash,kind,amount) VALUES(?,?,?)').run(sha(code),kind,amount);log(p,'pin',0,kind+':'+amount);result={ok:true,code};
  }else if(action==='reportStatus'){
   if(!['Açık','İnceleniyor','Çözüldü'].includes(data.status))fail('Durum geçersiz');db.prepare('UPDATE reports SET status=? WHERE id=?').run(data.status,Number(data.target));log(p,action,Number(data.target),data.status);
  }else fail('İşlem bulunamadı',404);
  json(res,200,result);return true;
 }
 return {route,config,roomList};
}
