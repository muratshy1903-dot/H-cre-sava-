import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {once} from 'node:events';
import WebSocket from 'ws';
import {ROOMS} from '../dist/engine.js';
test('87 odanın tamamına WebSocket üzerinden katılınır; hesap olmadan bakiye işlemi yapılamaz',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'agarm-rooms-'));process.env.AGARM_DATA=dir;
 const {startServer}=await import('../server/index.js');const server=startServer({port:0});await once(server,'listening');
 const origin='http://127.0.0.1:'+server.address().port;
 const ws=new WebSocket(origin.replace('http:','ws:')+'/ws',{headers:{Origin:origin}});
 try{
  await once(ws,'open');
  for(const room of ROOMS){
   const state=await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{ws.off('message',message);reject(Error('Oda yanıtı gelmedi: '+room.id))},3000);
    function message(raw){const m=JSON.parse(raw);if(m.type==='error'){clearTimeout(timer);ws.off('message',message);reject(Error(m.message))}else if(m.type==='state'&&m.room===room.id){clearTimeout(timer);ws.off('message',message);resolve(m)}}
    ws.on('message',message);ws.send(JSON.stringify({type:'join',room:room.id,name:'Oda kontrolü'}));
   });
   assert.equal(state.room,room.id);assert.equal(state.self.cells,1);assert.equal(state.self.gold,0);assert.ok(state.timeLeft>0);
   // Stay below the protocol's 60 input messages per second limit.
   await new Promise(r=>setTimeout(r,25));
  }
  const denied=await fetch(origin+'/api/action',{method:'POST',headers:{Origin:origin,'content-type':'application/json'},body:JSON.stringify({action:'premium'})});assert.equal(denied.status,401);
 }finally{ws.terminate();await new Promise(r=>server.shutdown(r));await rm(dir,{recursive:true,force:true})}
});
