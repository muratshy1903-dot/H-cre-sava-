import test from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,rm} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {once} from 'node:events';import WebSocket from 'ws';import {DatabaseSync} from 'node:sqlite';
test('same-room joins preserve the live cell; selecting another room moves the player and removes the old cell',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'agarm-resume-'));process.env.AGARM_DATA=dir;const {startServer}=await import('../server/index.js');const server=startServer({port:0});await once(server,'listening');const origin='http://127.0.0.1:'+server.address().port;
 const ws=new WebSocket(origin.replace('http:','ws:')+'/ws',{headers:{Origin:origin}});
 const packet=predicate=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>{ws.off('message',onMessage);reject(Error('packet timeout'))},3000);function onMessage(raw){const m=JSON.parse(raw);if(predicate(m)){clearTimeout(timer);ws.off('message',onMessage);resolve(m)}}ws.on('message',onMessage)});
 try{
  await once(ws,'open');const initial=packet(m=>m.type==='state');ws.send(JSON.stringify({type:'join',room:'FFA-1',name:'Original'}));const state=await initial,cell=state.players.find(p=>p.id===state.self.id).cells[0].id;
  for(const spectator of [true,false]){
   const joined=packet(m=>m.type==='joined'),next=packet(m=>m.type==='state');ws.send(JSON.stringify({type:'join',room:'FFA-1',name:'Replacement',spectator}));
   const result=await joined,s=await next;assert.equal(result.resumed,true);assert.equal(result.spectator,false);assert.equal(s.room,'FFA-1');const p=s.players.find(p=>p.id===state.self.id);assert.equal(p.name,'Original');assert.equal(p.cells[0].id,cell);assert.equal(s.humans,1);
  }
  const switched=packet(m=>m.type==='joined'),newState=packet(m=>m.type==='state'&&m.room==='FFA-2');ws.send(JSON.stringify({type:'join',room:'FFA-2',name:'Replacement'}));assert.equal((await switched).room,'FFA-2');const next=await newState;assert.equal(next.room,'FFA-2');assert.equal(next.players.find(p=>p.id===next.self.id).name,'Replacement');
  const fixture=new DatabaseSync(path.join(dir,'agarm.sqlite'));fixture.prepare('INSERT INTO room_settings(room,base_prize,closed) VALUES(?,?,1)').run('FFA-3',50000);fixture.close();const rejected=packet(m=>m.type==='error'),preserved=packet(m=>m.type==='state'&&m.room==='FFA-2');ws.send(JSON.stringify({type:'join',room:'FFA-3'}));assert.match((await rejected).message,/kapat/);assert.equal((await preserved).room,'FFA-2');
  const oldRoom=new WebSocket(origin.replace('http:','ws:')+'/ws',{headers:{Origin:origin}});await once(oldRoom,'open');const oldState=new Promise(resolve=>oldRoom.on('message',raw=>{const m=JSON.parse(raw);if(m.type==='state'&&m.room==='FFA-1')resolve(m)}));oldRoom.send(JSON.stringify({type:'join',room:'FFA-1',spectator:true}));assert.equal((await oldState).humans,0);oldRoom.terminate();
 }finally{ws.terminate();await new Promise(r=>server.shutdown(r));await rm(dir,{recursive:true,force:true})}
});
