import test from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,rm} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import crypto from 'node:crypto';import {once} from 'node:events';import {DatabaseSync} from 'node:sqlite';import WebSocket from 'ws';
test('Pass API rejects forged XP and duplicate awards, debits once and shares equipped cosmetics in real game snapshots',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'agarm-season-'));process.env.AGARM_DATA=dir;const {startServer}=await import('../server/index.js');const server=startServer({port:0});await once(server,'listening');const base='http://127.0.0.1:'+server.address().port,fixture=new DatabaseSync(path.join(dir,'agarm.sqlite'));let ws;
 const p={name:'Pass test',gold:500000,bonus:0,xp:1000,premiumUntil:0,inventory:[],claimed:[],wins:0,names:[],skins:[],following:[],bio:'',clanId:null,favorites:[],settings:{}};
 const id=Number(fixture.prepare('INSERT INTO accounts(email,hash,salt,profile) VALUES(?,?,?,?)').run('pass@example.test','00'.repeat(64),'test-only',JSON.stringify(p)).lastInsertRowid),token=crypto.randomBytes(32).toString('hex');fixture.prepare('INSERT INTO sessions VALUES(?,?,?)').run(crypto.createHash('sha256').update(token).digest('hex'),id,Date.now()+60000);const cookie='agarm_session='+token;
 const call=async(data,auth=cookie)=>{const r=await fetch(base+'/api/action',{method:'POST',headers:{Origin:base,Cookie:auth,'content-type':'application/json'},body:JSON.stringify(data)});return {status:r.status,body:await r.json()}};
 try{
  assert.equal((await call({action:'claim',level:1,lane:'free'},'')).status,401);
  assert.equal((await call({action:'claim',level:30,lane:'free',xp:9000})).status,400);
  assert.equal((await call({action:'claim',level:5,lane:'paid'})).status,400);
  const buys=await Promise.all([call({action:'pass'}),call({action:'pass'})]);assert.deepEqual(buys.map(r=>r.status).sort(),[200,400]);assert.equal(buys.find(r=>r.status===200).body.user.gold,350000);
  const claims=await Promise.all([call({action:'claim',level:1,lane:'paid'}),call({action:'claim',level:1,lane:'paid'})]);assert.deepEqual(claims.map(r=>r.status).sort(),[200,400]);
  const reward=await call({action:'claim',level:5,lane:'paid'});assert.equal(reward.status,200);const item=Object.values(reward.body.user.cosmetics)[0];assert.equal(item.type,'nick');
  assert.equal((await call({action:'equipCosmetic',value:item.id,kind:'border'})).status,400);
  assert.equal((await call({action:'equipCosmetic',value:'forged',kind:'nick'})).status,400);
  assert.equal((await call({action:'equipCosmetic',value:item.id,kind:'nick'})).status,200);
  ws=new WebSocket(base.replace('http:','ws:')+'/ws',{headers:{Origin:base,Cookie:cookie}});await once(ws,'open');const snapshot=new Promise(resolve=>ws.on('message',raw=>{const m=JSON.parse(raw);if(m.type==='state')resolve(m)}));ws.send(JSON.stringify({type:'join',room:'FFA-1',name:'Pass test'}));const snap=await snapshot;assert.equal(snap.players.find(p=>p.id===snap.self.id).look.nick.id,item.id);assert.ok(snap.players[0].enteredAt>0);
  const rank=await (await fetch(base+'/api/season-rankings')).json();assert.equal(rank[0].seasonXP,1000);
  const bulk=await call({action:'claimAll'});assert.equal(bulk.status,200);assert.equal(bulk.body.user.gold,425000);assert.equal((await call({action:'claimAll'})).status,400);
  const disk=JSON.parse(fixture.prepare('SELECT profile FROM accounts WHERE id=?').get(id).profile);assert.equal(disk.gold,425000);assert.equal(disk.loadout.nick,item.id);assert.ok(disk.season.claimed.includes('paid:5'));
 }finally{ws?.terminate();await new Promise(r=>server.shutdown(r));fixture.close();await rm(dir,{recursive:true,force:true})}
});
