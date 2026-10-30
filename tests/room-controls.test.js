import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {once} from 'node:events';
import WebSocket from 'ws';
import {World} from '../dist/engine.js';

test('room Boost multiplies affordable Gold equally, expires and respects input intervals',()=>{
 const w=new World('FFA-1',{now:1000}),p=w.addPlayer('p',{gold:1200});w.items=[];
 p.cells=[w.cell(p,100,4000,4000),w.cell(p,100,4100,4000)];w.boost={gold:10,feedMs:50,splitMs:50,until:1100};
 assert.equal(w.gold(p,'big'),true);assert.equal(p.gold,200);assert.deepEqual(p.cells.map(c=>c.mass),[1350,1350]);assert.equal(w.prize,51000);
 assert.equal(w.gold(p,'big'),false);w.time=1050;assert.equal(w.gold(p,'big'),true);assert.equal(p.gold,0);assert.deepEqual(p.cells.map(c=>c.mass),[1600,1600]);
 w.time=1100;p.gold=1000;w.gold(p,'big');assert.equal(p.gold,900);assert.equal(w.snapshot('p').boost.gold,1);
 w.time=2000;w.boost={gold:1,feedMs:500,splitMs:500,until:0};w.eject(p);w.time+=100;assert.equal(w.eject(p),false);w.time+=400;assert.equal(w.eject(p),true);
 w.split(p);w.time+=100;assert.equal(w.split(p),false);w.time+=400;assert.equal(w.split(p),true);
});

test('100 mass splits retain 100 and merge after 15 seconds without food',()=>{
 const w=new World('FFA-1',{now:1000}),p=w.addPlayer('p');w.items=[];w.spawn=()=>{};p.cells[0].x=p.cells[0].y=4250;p.aim={x:4250,y:3750};w.split(p);const start=w.time;
 while(w.time-start<15000)w.step(.05);
 assert.equal(p.cells.length,2);w.step(.05);assert.equal(p.cells.length,1);assert.equal(p.score,100);
});

test('custom rooms, time, rewards and Boost persist across restart; mute blocks chat until removed',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'agarm-controls-')),code=crypto.randomBytes(24).toString('hex');let child;const sockets=[];
 async function start(){child=spawn(process.execPath,['--input-type=module','-e',"import {startServer} from './server/index.js';const s=startServer({port:0});process.on('SIGTERM',()=>s.shutdown(()=>process.exit(0)));"],{cwd:path.resolve(import.meta.dirname,'..'),env:{...process.env,AGARM_DATA:dir,AGARM_ADMIN_SETUP_HASH:crypto.createHash('sha256').update(code).digest('hex')},stdio:['ignore','pipe','pipe']});child.stderr.resume();return new Promise((resolve,reject)=>{let out='';child.stdout.on('data',b=>{out+=b;const m=out.match(/Agarm (http:\/\/[^\s]+)/);if(m)resolve(m[1])});child.once('error',reject);child.once('exit',c=>reject(Error('Early exit '+c)))})}
 async function stop(){for(const ws of sockets)ws.terminate();const done=once(child,'exit');child.kill('SIGTERM');await done;child=null}
 const call=async(base,route,data,cookie)=>{const r=await fetch(base+'/api/'+route,{method:data?'POST':'GET',headers:{origin:base,...(data?{'content-type':'application/json'}:{}),...(cookie?{cookie}:{})},body:data?JSON.stringify(data):undefined});return {status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]}};
 async function connect(base,cookie){const ws=new WebSocket(base.replace('http','ws')+'/ws',{headers:{Origin:base,...(cookie?{Cookie:cookie}:{})}});sockets.push(ws);ws.messages=[];ws.on('message',raw=>ws.messages.push(JSON.parse(raw)));await once(ws,'open');return ws}
 async function next(ws,type,action){const start=ws.messages.length;action?.();const end=Date.now()+3000;while(Date.now()<end){const m=ws.messages.slice(start).find(m=>m.type===type);if(m)return m;await new Promise(r=>setTimeout(r,10))}throw Error('No '+type)}
 try{
  let base=await start();const admin=await call(base,'register',{email:'controls-admin@example.test',name:'Admin',password:'test-room-controls'}),player=await call(base,'register',{email:'controls-player@example.test',name:'Player',password:'test-room-controls'});
  await call(base,'admin-setup',{code},admin.cookie);const manage=data=>call(base,'management',data,admin.cookie);
  assert.equal((await call(base,'management',{action:'createRoom',room:'YASAK',mode:'ffa',minutes:10,basePrize:1},player.cookie)).status,403);
  assert.equal((await manage({action:'createRoom',room:'TEST-ODA',mode:'ffa',minutes:20,basePrize:80000})).status,200);
  assert.equal((await manage({action:'createRoom',room:'test-oda',mode:'ffa',minutes:20,basePrize:1})).status,400);
  assert.equal((await manage({action:'createRoom',room:'<script>',mode:'ffa',minutes:20,basePrize:1})).status,400);
  let rooms=(await call(base,'rooms')).body;assert.equal(rooms.length,89);const initial=rooms.find(r=>r.id==='TEST-ODA');assert.equal(initial.roundDurationMs,1200000);
  const ws=await connect(base,player.cookie);await next(ws,'joined',()=>ws.send(JSON.stringify({type:'join',room:'TEST-ODA',name:'Player'})));
  await manage({action:'reward',room:'TEST-ODA',amount:5000,reason:'Test'});
  assert.equal((await manage({action:'addTime',room:'TEST-ODA',minutes:10})).status,200);
  assert.equal((await manage({action:'addTime',room:'TEST-ODA',minutes:-1})).status,400);
  assert.equal((await call(base,'management',{action:'roomBoost',room:'TEST-ODA',goldRate:50,feedMs:50,splitMs:50,minutes:60},player.cookie)).status,403);
  assert.equal((await manage({action:'roomBoost',room:'TEST-ODA',goldRate:7,feedMs:50,splitMs:50,minutes:60})).status,200);
  assert.equal((await manage({action:'roomBoost',room:'TEST-ODA',goldRate:Infinity,feedMs:50,splitMs:50,minutes:60})).status,400);
  const snap=await next(ws,'state');assert.equal(snap.boost.gold,7);assert.equal(snap.prize,85000);assert.equal(snap.self.cells,1);assert.ok(snap.timeLeft>1700);
  const panel=(await call(base,'management',null,admin.cookie)).body;assert.equal(panel.stats.activePlayers,1);assert.equal(panel.rooms.length,89);assert.equal(panel.livePlayers[0].room,'TEST-ODA');assert.equal(panel.rooms.find(r=>r.id==='TEST-ODA').endsAt,initial.endsAt+600000);
  assert.equal((await manage({action:'mute',target:player.body.user.id,hours:24})).status,200);
  const error=await next(ws,'error',()=>ws.send(JSON.stringify({type:'chat',text:'blocked'})));assert.match(error.message,/Sohbet/);
  assert.equal((await manage({action:'mute',target:player.body.user.id,hours:0})).status,200);
  const chat=await next(ws,'chat',()=>ws.send(JSON.stringify({type:'chat',text:'allowed'})));assert.equal(chat.text,'allowed');
  await stop();base=await start();rooms=(await call(base,'rooms')).body;const restored=rooms.find(r=>r.id==='TEST-ODA');assert.equal(restored.endsAt,initial.endsAt+600000);assert.equal(restored.boost.gold,7);
  const after=await connect(base);const joined=await next(after,'state',()=>after.send(JSON.stringify({type:'join',room:'TEST-ODA'})));assert.equal(joined.prize,85000);assert.equal(joined.boost.gold,7);
 }finally{if(child)await stop();await rm(dir,{recursive:true,force:true})}
});
