import crypto from 'node:crypto';
export function createManagement({db,account,save,atomic,budget,fail,json,sha,worlds,worldFor,connections,rooms,roomTiming,clients}){
 db.exec(`CREATE TABLE IF NOT EXISTS room_pools(room TEXT PRIMARY KEY,round_end INTEGER NOT NULL,prize INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS room_settings(room TEXT PRIMARY KEY,base_prize INTEGER NOT NULL DEFAULT 50000,closed INTEGER NOT NULL DEFAULT 0);
 CREATE TABLE IF NOT EXISTS management_settings(key TEXT PRIMARY KEY,value TEXT);
 CREATE TABLE IF NOT EXISTS room_history(room TEXT PRIMARY KEY,winner_name TEXT,winner_score INTEGER,highest_score INTEGER NOT NULL DEFAULT 0,at INTEGER);
 CREATE TABLE IF NOT EXISTS reports(id INTEGER PRIMARY KEY AUTOINCREMENT,reporter INTEGER,target INTEGER,text TEXT,at INTEGER,status TEXT DEFAULT 'Açık');`);
 db.exec(`CREATE TABLE IF NOT EXISTS room_controls(room TEXT PRIMARY KEY,definition TEXT NOT NULL,boost TEXT NOT NULL DEFAULT '{}');`);
 for(const row of db.prepare('SELECT * FROM room_controls').all()){const definition=JSON.parse(row.definition),existing=rooms.find(r=>r.id===row.room);if(existing)Object.assign(existing,definition);else rooms.push(definition);}
 const boostConfig=id=>{const row=db.prepare('SELECT boost FROM room_controls WHERE room=?').get(id);return row?JSON.parse(row.boost):{gold:1,feedMs:90,splitMs:80,until:0}};
 const persistControl=(definition,boost=boostConfig(definition.id))=>db.prepare('INSERT INTO room_controls(room,definition,boost) VALUES(?,?,?) ON CONFLICT(room) DO UPDATE SET definition=excluded.definition,boost=excluded.boost').run(definition.id,JSON.stringify(definition),JSON.stringify(boost));
 const log=(p,action,target,detail)=>db.prepare('INSERT INTO audit(actor,action,target,detail,at) VALUES(?,?,?,?,?)').run(p.id,action,target||0,detail||'',Date.now());
 const config=room=>db.prepare('SELECT * FROM room_settings WHERE room=?').get(room)||{room,base_prize:50000,closed:0};
 const setupAvailable=()=>!!process.env.AGARM_ADMIN_SETUP_HASH&&!db.prepare("SELECT value FROM management_settings WHERE key='admin_claimed'").get()&&!db.prepare("SELECT id FROM accounts WHERE json_extract(profile,'$.role')='admin' LIMIT 1").get();
 const pool=(room,end)=>{const row=db.prepare('SELECT prize FROM room_pools WHERE room=? AND round_end=?').get(room,end);return row?.prize};
 const persistPool=w=>db.prepare('INSERT INTO room_pools(room,round_end,prize) VALUES(?,?,?) ON CONFLICT(room) DO UPDATE SET round_end=excluded.round_end,prize=excluded.prize').run(w.room,w.roundEnd,Math.floor(w.prize));
 const roomList=()=>rooms.map(r=>{const timing=roomTiming(r.id),w=worlds.get(r.id),list=[...(w?.players.values()||[])].filter(p=>!p.bot),conf=config(r.id);return{...r,...timing,...conf,boost:boostConfig(r.id),prize:w&&w.roundEnd===timing.endsAt?w.prize:pool(r.id,timing.endsAt)??conf.base_prize,players:list.filter(p=>!p.spectator&&p.cells.length).length,spectators:list.filter(p=>p.spectator).length,connections:list.length}});
 const livePlayers=()=>[...clients()].filter(ws=>ws.readyState===1&&ws.world).map(ws=>{const player=ws.world.players.get(ws.pid),a=ws.user;return{connection:ws.pid,accountId:a?.id||null,name:player?.name||a?.name||'Misafir',room:ws.world.room,score:Math.floor(player?.cells.reduce((sum,c)=>sum+c.mass,0)||0),max:player?.max||0,cells:player?.cells.length||0,gold:Math.floor(player?.gold||0),bonus:Math.floor(player?.bonus||0),spectator:!!player?.spectator,alive:!!player?.cells.length,team:player?.team||'',clanId:a?.clanId||null,premium:!!(a?.premiumUntil>Date.now()),role:a?.role||'player',mutedUntil:a?.mutedUntil||0,lastPingAgoMs:Math.max(0,Date.now()-ws.lastPing)}});

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
   const users=db.prepare('SELECT id FROM accounts ORDER BY id DESC LIMIT 200').all().map(r=>account(r.id)),live=livePlayers();
   json(res,200,{stats:{accounts:db.prepare('SELECT count(*) n FROM accounts').get().n,online:live.length,activePlayers:live.filter(p=>p.alive&&!p.spectator).length,spectators:live.filter(p=>p.spectator).length,guests:live.filter(p=>!p.accountId).length,activeRooms:new Set(live.map(p=>p.room)).size},livePlayers:live,serverNow:Date.now(),rooms:roomList(),users:users.map(a=>({id:a.id,name:a.name,gold:a.gold,bonus:a.bonus,premiumUntil:a.premiumUntil,bannedUntil:a.bannedUntil||0,mutedUntil:a.mutedUntil||0,role:a.role||'player'})),reports:db.prepare('SELECT * FROM reports ORDER BY id DESC LIMIT 100').all()});return true;
  }
  if(req.method!=='POST')fail('Yöntem desteklenmiyor',405);
  budget(req,'management',40);const action=String(data.action||''),reason=String(data.reason||'').trim().slice(0,200);let result={ok:true};
  if(action==='createRoom'){
   const id=String(data.room||'').trim(),minutes=Number(data.minutes),base=Number(data.basePrize);if(!/^[\p{L}\p{N}][\p{L}\p{N} _-]{0,23}$/u.test(id)||rooms.some(r=>r.id.toLocaleLowerCase('tr')===id.toLocaleLowerCase('tr')))fail('Oda adı geçersiz veya zaten kullanılıyor');if(rooms.length>=250)fail('En fazla 250 oda açılabilir');if(!Number.isInteger(minutes)||minutes<1||minutes>1440||!Number.isSafeInteger(base)||base<0||base>100000000)fail('Süre 1-1440 dakika, ödül 0-100.000.000 olmalı');if(!['ffa','nogold','special','boost'].includes(data.mode))fail('Oda türü geçersiz');const definition={id,mode:data.mode,minutes,durationMs:minutes*60000,scheduleEnd:Date.now()+minutes*60000,custom:true};
   atomic(()=>{persistControl(definition);db.prepare('INSERT INTO room_settings(room,base_prize,closed) VALUES(?,?,0)').run(id,base);log(p,action,0,JSON.stringify(definition));},p,'admin:createRoom');rooms.push(definition);result={ok:true,room:id};
  }else if(action==='addTime'){
   const id=String(data.room||''),minutes=Number(data.minutes),definition=rooms.find(r=>r.id===id);if(!definition||!Number.isInteger(minutes)||minutes<1||minutes>1440)fail('Oda ve 1-1440 dakika ek süre gerekli');const w=worldFor(id),oldEnd=w.roundEnd,end=oldEnd+minutes*60000;if(end-Date.now()>7*86400000)fail('Kalan süre en fazla 7 gün olabilir');const next={...definition,scheduleEnd:end};
   atomic(()=>{persistControl(next);db.prepare('UPDATE room_pools SET round_end=? WHERE room=? AND round_end=?').run(end,id,oldEnd);log(p,action,0,JSON.stringify({room:id,minutes,end}));},p,'admin:addTime');Object.assign(definition,next);w.roundEnd=end;persistPool(w);result={ok:true,endsAt:end};
  }else if(action==='roomBoost'){
   const id=String(data.room||''),definition=rooms.find(r=>r.id===id),gold=Number(data.goldRate),feedMs=Number(data.feedMs),splitMs=Number(data.splitMs),minutes=Number(data.minutes);if(!definition||!Number.isInteger(gold)||gold<1||gold>50||![feedMs,splitMs].every(n=>Number.isInteger(n)&&n>=50&&n<=1000)||!Number.isInteger(minutes)||minutes<0||minutes>10080)fail('Gold çarpanı 1-50, yem/bölünme aralığı 50-1000 ms, süre 0-10080 dakika olmalı');if(definition.mode==='nogold'&&gold>1)fail('Goldsuz odada Gold Boost açılamaz');const boost={gold,feedMs,splitMs,until:minutes?Date.now()+minutes*60000:0};
   atomic(()=>{persistControl(definition,boost);log(p,action,0,JSON.stringify({room:id,...boost}));},p,'admin:roomBoost');const w=worlds.get(id);if(w)w.boost=boost;result={ok:true,boost};
  }else if(['wallet','premium','mute'].includes(action)){
   const a=account(Number(data.target));if(!a)fail('Hesap bulunamadı',404);
   atomic(()=>{
    account(a.id);
    if(action==='wallet'){const amount=Number(data.amount),wallet=data.wallet;if(!['gold','bonus'].includes(wallet)||!Number.isSafeInteger(amount)||Math.abs(amount)>100000000||!reason)fail('Bakiye, tutar ve işlem nedeni gerekli');if(a[wallet]+amount<0||!Number.isSafeInteger(a[wallet]+amount))fail('Yetersiz veya geçersiz bakiye');a[wallet]+=amount;save(a);}
    if(action==='premium'){const days=Number(data.days);if(!Number.isInteger(days)||days<0||days>365)fail('Gün 0-365 olmalı');a.premiumUntil=days?Math.max(Date.now(),a.premiumUntil)+days*86400000:0;save(a);}
    if(action==='mute'){const hours=Number(data.hours);if(a.id===p.id||!Number.isInteger(hours)||hours<0||hours>8760)fail('Susturma süresi veya hesap geçersiz');a.mutedUntil=hours?Date.now()+hours*3600000:0;save(a);}
    log(p,action,a.id,JSON.stringify({amount:data.amount,wallet:data.wallet,days:data.days,hours:data.hours,reason}));
   },p,'admin:'+action);
   
  }else if(action==='kick'){
   const peer=data.connection?[...clients()].find(ws=>ws.pid===String(data.connection)&&ws.readyState===1):connections.get(Number(data.target));
   if(!peer)fail('Aktif bağlantı bulunamadı');
   atomic(()=>log(p,'kick',peer.user?.id||0,JSON.stringify({connection:peer.pid,room:peer.world?.room,reason})),p,'admin:kick');peer.close(1008,'Yönetici tarafından oyundan çıkarıldın');
  }else if(action==='reward'){
   const id=String(data.room||''),amount=Number(data.amount);if(!rooms.some(r=>r.id===id)||!Number.isSafeInteger(amount)||amount<1||amount>100000000||!reason)fail('Oda, 1-100.000.000 arası ödül ve işlem nedeni gerekli');
   const w=worldFor(id);if(w.prize+amount>1000000000)fail('Oda ödül sınırı');
   atomic(()=>{db.prepare('INSERT INTO room_pools(room,round_end,prize) VALUES(?,?,?) ON CONFLICT(room) DO UPDATE SET round_end=excluded.round_end,prize=excluded.prize').run(w.room,w.roundEnd,Math.floor(w.prize+amount));log(p,'reward',0,JSON.stringify({room:id,amount,reason}));},p,'admin:reward');w.prize+=amount;result={ok:true,prize:w.prize};
  }else if(action==='score'){
   const peer=connections.get(Number(data.target)),w=peer?.world,player=w?.players.get(peer.pid),amount=Number(data.amount);
   if(!player||player.spectator||!player.cells.length)fail('Oyuncu hesabıyla bir odada canlı olmalı');
   if(!Number.isSafeInteger(amount)||amount<1||amount>5500000||!reason)fail('1-5.500.000 arasında skor ve işlem nedeni gerekli');
   const capacity=Math.max(0,Math.min(5500000-Math.ceil(player.cells.reduce((sum,c)=>sum+c.mass,0)),player.cells.reduce((sum,c)=>sum+Math.max(0,220084-c.mass),0))),added=Math.min(capacity,amount);
   if(added<=0)fail('Oyuncu kütle sınırında');
   atomic(()=>log(p,'score',Number(data.target),JSON.stringify({room:w.room,requested:amount,added,reason})),p,'admin:score');
   result={ok:true,added:w.addMass(player,amount)};
  }else if(action==='room'){
   const id=String(data.room||'');if(!rooms.some(r=>r.id===id))fail('Oda bulunamadı');const base=Number(data.basePrize),extra=Number(data.extraPrize||0);if(!Number.isSafeInteger(base)||base<0||base>100000000||!Number.isSafeInteger(extra)||extra<0||extra>100000000)fail('Ödül 0-100.000.000 arasında olmalı');const w=worlds.get(id);const old=config(id);if(w&&w.prize+extra>1000000000)fail('Oda ödül sınırı');
   atomic(()=>{db.prepare('INSERT INTO room_settings(room,base_prize,closed) VALUES(?,?,?) ON CONFLICT(room) DO UPDATE SET base_prize=excluded.base_prize,closed=excluded.closed').run(id,base,data.closed===true?1:0);log(p,'room',0,JSON.stringify({room:id,base,extra,closed:data.closed===true}));},p,'admin:room');
   if(w){w.basePrize=base;w.prize=Math.max(0,w.prize+extra);persistPool(w);}else if(extra){const w=worldFor(id);w.prize+=extra;persistPool(w);}
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
 return {route,config,roomList,pool,persistPool,boostConfig};
}
