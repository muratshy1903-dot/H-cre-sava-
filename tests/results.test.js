import test from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,rm} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {once} from 'node:events';import WebSocket from 'ws';
test('round winner and true room-record flag reach other rooms and new joins; later lower winner does not claim record',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'agarm-results-'));process.env.AGARM_DATA=dir;const {startServer,grantAdmin}=await import('../server/index.js'),server=startServer({port:0});await once(server,'listening');const base='http://127.0.0.1:'+server.address().port,sockets=[];
 const call=async(route,data,cookie)=>{const r=await fetch(base+'/api/'+route,{method:data?'POST':'GET',headers:{Origin:base,...(cookie?{Cookie:cookie}:{}),'content-type':'application/json'},body:data?JSON.stringify(data):undefined});return {status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]}};
 const wait=async(ws,check,action)=>{const start=ws.messages.length;action?.();const end=Date.now()+3000;while(Date.now()<end){const found=ws.messages.slice(start).find(check);if(found)return found;await new Promise(r=>setTimeout(r,10))}throw Error('Result snapshot not delivered')};
 async function connect(room,cookie){const ws=new WebSocket(base.replace('http:','ws:')+'/ws',{headers:{Origin:base,...(cookie?{Cookie:cookie}:{})}});sockets.push(ws);ws.messages=[];ws.on('message',raw=>ws.messages.push(JSON.parse(raw)));await once(ws,'open');await wait(ws,m=>m.type==='state',()=>ws.send(JSON.stringify({type:'join',room,name:cookie?'Rekor Oyuncusu':'İzleyici',spectator:!cookie})));return ws}
 try{
  const admin=await call('register',{email:'results-admin@example.test',name:'Admin',password:'results-test-password'}),p=await call('register',{email:'results-player@example.test',name:'Rekor Oyuncusu',password:'results-test-password'});grantAdmin('results-admin@example.test');
  const playing=await connect('FFA-1',p.cookie),other=await connect('FFA-2');
  assert.equal((await call('management',{action:'score',target:p.body.user.id,amount:400000,reason:'Record test'},admin.cookie)).status,200);
  const finish=()=>call('management',{action:'finishRoom',room:'FFA-1'},admin.cookie);
  const first=await wait(other,m=>m.type==='state'&&m.lastRound?.room==='FFA-1',()=>finish());assert.equal(first.lastRound.name,'Rekor Oyuncusu');assert.equal(first.lastRound.isRecord,true);assert.ok(first.lastRound.recordScore>=400000);assert.ok(first.lastRound.score>390000);
  const newRoom=await connect('FFA-3');assert.equal(newRoom.messages.find(m=>m.type==='state').lastRound.name,'Rekor Oyuncusu');
  const second=await wait(other,m=>m.type==='state'&&m.lastRound?.at>first.lastRound.at,()=>finish());assert.equal(second.lastRound.isRecord,false);assert.equal(second.lastRound.recordScore,first.lastRound.recordScore);
  const rooms=(await call('rooms')).body,room=rooms.find(r=>r.id==='FFA-1');assert.equal(room.recordName,'Rekor Oyuncusu');assert.equal(room.highestScore,first.lastRound.recordScore);
 }finally{for(const ws of sockets)ws.terminate();await new Promise(r=>server.shutdown(r));await rm(dir,{recursive:true,force:true})}
});
