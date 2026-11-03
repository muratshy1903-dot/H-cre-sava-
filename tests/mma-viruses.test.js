import test from 'node:test';import assert from 'node:assert/strict';
import {World,ROOMS,radius} from '../dist/engine.js';
import {mmaWallet,MMA_GOLD,MMA_RENEW_MS} from '../dist/room-wallet.js';
test('MMA wallet refills exactly at five hours and survives room changes without global transfers',()=>{
 const profile={gold:123,bonus:456},now=100000000;
 assert.equal(mmaWallet(profile,now).balance,MMA_GOLD);const end=profile.mmaWallet.renewsAt;
 profile.mmaWallet.balance=42;const restored=JSON.parse(JSON.stringify(profile));
 assert.equal(mmaWallet(restored,end-1).balance,42);assert.equal(mmaWallet(restored,end).balance,MMA_GOLD);
 restored.mmaWallet.balance=1;assert.equal(mmaWallet(restored,end+3*MMA_RENEW_MS).balance,MMA_GOLD);assert.ok(restored.mmaWallet.renewsAt>end+3*MMA_RENEW_MS);
 const w=new World('MMA-1',{now}),p=w.addPlayer('p',{gold:123,bonus:456});w.items=[];w.gold(p,'big');assert.equal(p.mmaGold,MMA_GOLD-100);assert.equal(p.gold,123);assert.equal(p.bonus,456);assert.equal(w.prize,50000);
 w.step(.05,now+MMA_RENEW_MS);assert.equal(p.mmaGold,MMA_GOLD);assert.equal(p.gold,50123);assert.equal(p.bonus,456);
 assert.ok(ROOMS.some(r=>r.id==='MMA-1'));assert.ok(!ROOMS.some(r=>r.id==='SPVS-1'));
});
test('food gives ten mass and normal movement is reduced',()=>{
 const w=new World(),p=w.addPlayer('p');w.items=[];p.cells[0].x=p.cells[0].y=4250;p.aim={x:4250,y:4250};w.spawn('food',4250,4250);w.step(.05);assert.equal(p.cells[0].mass,110);
 w.items=[];p.aim={x:8000,y:4250};const x=p.cells[0].x;w.step(.1);assert.ok(p.cells[0].x-x<=25.01);
});
test('normal virus baseline is 80; feed creates one at five hits with a strict 800 cap',()=>{
 const w=new World();assert.equal(w.items.filter(v=>v.type==='virus').length,80);w.items=[];const v=w.spawn('virus',4250,4250);
 const feed=()=>{for(let i=0;i<5;i++)w.spawn('eject',v.x-20,v.y,{vx:100,vy:0});w.step(.001)};
 feed();assert.equal(w.items.filter(v=>v.type==='virus').length,2);
 w.items=[v];v.fed=0;for(let i=1;i<800;i++)w.spawn('virus',100,100);feed();assert.equal(w.items.filter(v=>v.type==='virus').length,800);
});
test('covered map prevents natural spawning and fed-virus multiplication',()=>{
 const w=new World(),p=w.addPlayer('p');w.items=[];p.cells=[w.cell(p,10000000,4250,4250)];assert.equal(w.replenishVirus(),false);assert.equal(w.items.length,0);
 const v=w.spawn('virus',4250,4250);for(let i=0;i<5;i++)w.spawn('eject',4230,4250,{vx:100});
 // A distant player covers the proposed child location without eating the parent.
 p.cells=[w.cell(p,100,4250+radius(150)*2+15,4250)];p.aim={...p.cells[0]};w.step(.001);assert.equal(w.items.filter(v=>v.type==='virus').length,1);
});
test('server MMA spending survives reconnect and never changes account Gold or Bonus',async()=>{
 const {mkdtemp,rm}=await import('node:fs/promises'),{tmpdir}=await import('node:os'),{once}=await import('node:events'),{default:WebSocket}=await import('ws');
 const dir=await mkdtemp(tmpdir()+'/mma-wallet-');process.env.AGARM_DATA=dir;
 const {startServer}=await import('../server/index.js');const server=startServer({port:0});await once(server,'listening');const origin='http://127.0.0.1:'+server.address().port;let ws;
 try{
  const r=await fetch(origin+'/api/register',{method:'POST',headers:{'content-type':'application/json',origin},body:JSON.stringify({email:'mma@test.example',password:'safe-test-password',name:'MMA test'})});assert.equal(r.status,201);const cookie=r.headers.get('set-cookie').split(';')[0],initial=(await r.json()).user;
  const state=(check=()=>true)=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>{ws.off('message',on);reject(Error('State timeout'))},2500);function on(raw){const m=JSON.parse(raw);if(m.type==='state'&&check(m)){clearTimeout(timer);ws.off('message',on);resolve(m)}}ws.on('message',on)});
  const join=async room=>{const pending=state(m=>m.room===room);ws.send(JSON.stringify({type:'join',room,name:'MMA test'}));return pending};
  ws=new WebSocket(origin.replace('http:','ws:')+'/ws',{headers:{Origin:origin,Cookie:cookie}});await once(ws,'open');const first=await join('MMA-1');assert.equal(first.self.roomGold,MMA_GOLD);
  const next=state(m=>m.self.roomGold===MMA_GOLD-100);ws.send(JSON.stringify({type:'gold',kind:'big'}));assert.equal((await next).self.roomGold,MMA_GOLD-100);
  const ffa=await join('FFA-1');assert.equal(ffa.self.gold,initial.gold);assert.equal(ffa.self.bonus,initial.bonus);assert.equal(ffa.self.roomGold,null);
  assert.equal((await join('MMA-1')).self.roomGold,MMA_GOLD-100);
  ws.terminate();await new Promise(r=>server.shutdown(r));
  const {DatabaseSync}=await import('node:sqlite');const disk=new DatabaseSync(dir+'/agarm.sqlite',{readOnly:true});try{const stored=JSON.parse(disk.prepare('SELECT profile FROM accounts WHERE email=?').get('mma@test.example').profile);assert.equal(stored.mmaWallet.balance,MMA_GOLD-100);assert.equal(stored.gold,initial.gold);assert.equal(stored.bonus,initial.bonus);}finally{disk.close()}
  const again=startServer({port:0});await once(again,'listening');try{const response=await fetch('http://127.0.0.1:'+again.address().port+'/api/me',{headers:{cookie}});const user=(await response.json()).user;assert.equal(user.mmaWallet.balance,MMA_GOLD-100);assert.equal(user.gold,initial.gold);assert.equal(user.bonus,initial.bonus);}finally{await new Promise(r=>again.shutdown(r))}
 }finally{ws?.terminate();if(server.listening)await new Promise(r=>server.shutdown(r));await rm(dir,{recursive:true,force:true})}
});
