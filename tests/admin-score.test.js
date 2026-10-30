import test from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,rm} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {once} from 'node:events';import WebSocket from 'ws';
test('only admin can grant mass to a live account and every grant is audited',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'agarm-score-'));process.env.AGARM_DATA=dir;
 const {startServer,grantAdmin}=await import('../server/index.js'),server=startServer({port:0});await once(server,'listening');const base='http://127.0.0.1:'+server.address().port;let ws;
 const call=async(route,data,cookie='')=>{const r=await fetch(base+'/api/'+route,{method:data?'POST':'GET',headers:{Origin:base,Cookie:cookie,'content-type':'application/json'},body:data?JSON.stringify(data):undefined});return{status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]}};
 try{
  const a=await call('register',{name:'Admin',email:'score-admin@example.test',password:'test-password-123'}),b=await call('register',{name:'Player',email:'score-player@example.test',password:'test-password-123'});grantAdmin('score-admin@example.test');
  const action={action:'score',target:b.body.user.id,amount:10000,reason:'Test grant'};
  assert.equal((await call('management',action,b.cookie)).status,403);
  assert.equal((await call('management',action,a.cookie)).status,400);
  ws=new WebSocket(base.replace('http:','ws:')+'/ws',{headers:{Origin:base,Cookie:b.cookie}});await once(ws,'open');
  const joined=new Promise(resolve=>ws.on('message',raw=>{if(JSON.parse(raw).type==='joined')resolve()}));ws.send(JSON.stringify({type:'join',room:'BOOST-1',name:'Player'}));await joined;
  const result=await call('management',action,a.cookie);assert.equal(result.status,200);assert.equal(result.body.added,10000);
  assert.equal((await call('management',{...action,amount:-1},a.cookie)).status,400);
  assert.equal((await call('me',null,b.cookie)).body.user.gold,b.body.user.gold);
  const audit=await call('admin',null,a.cookie);assert.ok(audit.body.audit.some(row=>row.action==='score'&&row.target===b.body.user.id));
  const panel=await call('management',null,a.cookie);assert.equal(panel.body.stats.activePlayers,1);assert.equal(panel.body.stats.activeRooms,1);assert.equal(panel.body.livePlayers[0].room,'BOOST-1');assert.equal(panel.body.livePlayers[0].accountId,b.body.user.id);assert.ok(panel.body.livePlayers[0].score>10000);
  const reward={action:'reward',room:'BOOST-1',amount:12345,reason:'Tournament bonus'};
  assert.equal((await call('management',reward,b.cookie)).status,403);
  assert.equal((await call('management',{...reward,amount:-1},a.cookie)).status,400);
  const awarded=await call('management',reward,a.cookie);assert.equal(awarded.status,200);assert.equal(awarded.body.prize,62345);
  const room=(await call('management',null,a.cookie)).body.rooms.find(r=>r.id==='BOOST-1');assert.equal(room.prize,62345);assert.equal(room.base_prize,50000);
  const closed=once(ws,'close');const kicked=await call('management',{action:'kick',connection:panel.body.livePlayers[0].connection},a.cookie);assert.equal(kicked.status,200);await closed;
  assert.equal((await call('management',null,a.cookie)).body.stats.activePlayers,0);

 }finally{ws?.terminate();await new Promise(r=>server.shutdown(r));await rm(dir,{recursive:true,force:true})}
});
