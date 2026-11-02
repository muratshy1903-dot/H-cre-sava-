import test from 'node:test';import assert from 'node:assert/strict';import {World,roomMassLimits,ROOMS} from '../dist/engine.js';import {mmaWallet,MMA_GOLD,MMA_RENEW_MS} from '../dist/room-wallet.js';import {SKIN_CATALOG} from '../dist/skin-catalog.js';import sharp from 'sharp';import {mkdtemp,rm} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import crypto from 'node:crypto';import {once} from 'node:events';import WebSocket from 'ws';

test('three MMA rooms use distinct 220k/250k/350k limits for growth, splits, merges, food and full capacity',()=>{
 assert.deepEqual(ROOMS.filter(r=>/^MMA-/.test(r.id)).map(r=>r.id),['MMA-1','MMA-2','MMA-3']);
 for(const [room,limit] of [['MMA-2',250000],['MMA-3',350000]]){
  const w=new World(room,{now:100000}),p=w.addPlayer('p');w.items=[];const c=p.cells[0];c.mass=limit-50;p.aim={x:c.x+2000,y:c.y};w.addMass(p,50);assert.equal(p.cells.length,2,room);assert.equal(p.score,limit);
  p.cells=Array.from({length:25},(_,i)=>w.cell(p,limit-10,500+i%5*1500,500+Math.floor(i/5)*1500));p.aim=w.center(p);const added=w.addMass(p,1000);assert.equal(added,250);assert.equal(p.cells.length,25);assert.ok(p.cells.every(c=>c.mass===limit));assert.equal(p.score,limit*25);assert.equal(w.growthCapacity(p),0);const wallet=p.mmaGold;assert.equal(w.gold(p,'big'),false);assert.equal(p.mmaGold,wallet);
  p.cells=[w.cell(p,limit/2,4250,4250),w.cell(p,limit/2,4250,4250)];for(const c of p.cells)c.mergeAt=w.time-1;w.separateCells(p);assert.equal(p.cells.length,2,'merging cannot recreate an oversized fragment');assert.equal(w.snapshot('p').massLimits.split,limit);assert.equal(w.snapshot('p').massLimits.total,limit*25);
 }
 assert.equal(roomMassLimits('FFA-1').total,5500000);assert.equal(roomMassLimits('MMA-1').maxCell,220084);
});

test('MMA room wallets are independently renewed and existing MMA-1 balance is preserved',()=>{
 const p={gold:123,bonus:456,mmaWallet:{balance:17,renewsAt:100000+MMA_RENEW_MS}},now=100000;
 assert.equal(mmaWallet(p,now,'MMA-1').balance,17);mmaWallet(p,now,'MMA-2').balance=111;mmaWallet(p,now,'MMA-3').balance=222;
 const stored=JSON.parse(JSON.stringify(p));assert.equal(mmaWallet(stored,now,'MMA-1').balance,17);assert.equal(mmaWallet(stored,now,'MMA-2').balance,111);assert.equal(mmaWallet(stored,now,'MMA-3').balance,222);assert.equal(mmaWallet(stored,now+MMA_RENEW_MS,'MMA-2').balance,MMA_GOLD);assert.equal(stored.mmaWallets['MMA-3'].balance,222);assert.equal(stored.gold,123);assert.equal(stored.bonus,456);
 assert.ok(SKIN_CATALOG.filter(x=>x.category==='AgarZ').length>=29);assert.ok(!SKIN_CATALOG.some(x=>['skin1','skin2','skin3','skin4'].includes(x.id)));
});

test('each successful upload costs 10k, stays registered after relogin, and a copied skin code cannot be used by another account',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'agarm-private-skin-'));process.env.AGARM_DATA=dir;delete process.env.AGARM_OWNER_BOOTSTRAP;const setup=crypto.randomBytes(24).toString('hex');process.env.AGARM_ADMIN_SETUP_HASH=crypto.createHash('sha256').update(setup).digest('hex');
 const {startServer}=await import('../server/index.js');const server=startServer({port:0});await once(server,'listening');const base='http://127.0.0.1:'+server.address().port,sockets=[];
 const call=async(route,data,cookie)=>{const r=await fetch(base+'/api/'+route,{method:data?'POST':'GET',headers:{Origin:base,...(data?{'content-type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},body:data?JSON.stringify(data):undefined});return {status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]}};
 const connect=async(cookie)=>{const ws=new WebSocket(base.replace('http:','ws:')+'/ws',{headers:{Origin:base,Cookie:cookie}});sockets.push(ws);await once(ws,'open');return ws};
 const packet=(ws,check)=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>{ws.off('message',on);reject(Error('packet timeout'))},4000);function on(raw){const data=JSON.parse(raw);if(check(data)){clearTimeout(timer);ws.off('message',on);resolve(data)}}ws.on('message',on)});
 try{
  const admin=await call('register',{email:'admin@skin.test',password:'safe-test-password',name:'Admin'});await call('admin-setup',{code:setup},admin.cookie);
  const a=await call('register',{email:'a@skin.test',password:'safe-test-password',name:'A'}),b=await call('register',{email:'b@skin.test',password:'safe-test-password',name:'B'}),initial=a.body.user.gold;
  const png=await sharp({create:{width:32,height:32,channels:3,background:'#abcdef'}}).png().toBuffer(),image='data:image/png;base64,'+png.toString('base64');
  const first=await call('upload',{image},a.cookie),second=await call('upload',{image},a.cookie);assert.equal(first.status,201);assert.equal(second.status,201);assert.notEqual(first.body.id,second.body.id);assert.equal(second.body.user.gold,initial-20000);assert.ok(second.body.user.skins.includes('custom-'+first.body.id));assert.ok(second.body.user.skins.includes('custom-'+second.body.id));
  const invalid=await call('upload',{image:'data:image/png;base64,AAAA'},a.cookie);assert.equal(invalid.status,400);assert.equal((await call('me',null,a.cookie)).body.user.gold,initial-20000);
  const alog=await call('login',{email:'a@skin.test',password:'safe-test-password'});assert.equal((await call('my-uploads',null,alog.cookie)).body.length,2);assert.ok(alog.body.user.skins.includes('custom-'+first.body.id));assert.equal((await call('my-uploads',null,b.cookie)).body.length,0);assert.equal((await call('action',{action:'customSkin',value:first.body.id},b.cookie)).status,400);
  const ownerWs=await connect(a.cookie);let response=packet(ownerWs,p=>p.type==='error');ownerWs.send(JSON.stringify({type:'join',room:'MMA-2',skin:'custom-'+first.body.id}));await response;
  await call('action',{action:'adminUpload',target:first.body.id,value:'approved'},admin.cookie);
  response=packet(ownerWs,p=>p.type==='state'&&p.self?.cells>0);ownerWs.send(JSON.stringify({type:'join',room:'MMA-2',skin:'custom-'+first.body.id}));const own=await response;assert.equal(own.massLimits.split,250000);assert.equal(own.self.roomGold,MMA_GOLD);assert.equal(own.players.find(p=>p.id===own.self.id).skin,'custom-'+first.body.id);
  const otherWs=await connect(b.cookie);response=packet(otherWs,p=>p.type==='error');otherWs.send(JSON.stringify({type:'join',room:'MMA-2',skin:'custom-'+first.body.id}));assert.match((await response).message,/skin/i);
  // A different player can see an approved skin on its owner but cannot equip it.
  assert.equal((await fetch(base+'/skins/'+first.body.id+'.webp')).status,200);
  const before=own.self.roomGold;response=packet(ownerWs,p=>p.type==='state'&&p.self?.roomGold===before-100);ownerWs.send(JSON.stringify({type:'gold',kind:'big'}));await response;
  response=packet(ownerWs,p=>p.type==='state'&&p.room==='MMA-3');ownerWs.send(JSON.stringify({type:'join',room:'MMA-3'}));assert.equal((await response).massLimits.split,350000);
  response=packet(ownerWs,p=>p.type==='state'&&p.room==='MMA-2');ownerWs.send(JSON.stringify({type:'join',room:'MMA-2'}));assert.equal((await response).self.roomGold,before-100);
 }finally{for(const ws of sockets)ws.terminate();await new Promise(r=>server.shutdown(r));await rm(dir,{recursive:true,force:true})}
});
