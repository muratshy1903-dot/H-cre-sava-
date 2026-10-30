import test from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,rm} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import crypto from 'node:crypto';import {once} from 'node:events';
test('management requires one-use setup, rejects regular players and audits wallet, rooms, premium and pins',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'agarm-admin-'));process.env.AGARM_DATA=dir;const code=crypto.randomBytes(24).toString('hex');process.env.AGARM_ADMIN_SETUP_HASH=crypto.createHash('sha256').update(code).digest('hex');
 const {startServer}=await import('../server/index.js');const server=startServer({port:0});await once(server,'listening');const base='http://127.0.0.1:'+server.address().port;
 const call=async(route,data,cookie)=>{const r=await fetch(base+'/api/'+route,{method:data?'POST':'GET',headers:{Origin:base,...(data?{'content-type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},body:data?JSON.stringify(data):undefined});return{status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]}};
 try{
  const a=await call('register',{email:'admin@example.test',password:'test-only-passphrase',name:'Yönetici'}),b=await call('register',{email:'player@example.test',password:'test-only-passphrase',name:'Oyuncu'});
  assert.equal((await call('management')).status,403);
  assert.equal((await call('admin-setup',{code:'wrong'},a.cookie)).status,403);
  assert.equal((await call('admin-setup',{code},a.cookie)).status,200);
  assert.equal((await call('admin-setup',{code},b.cookie)).status,403);
  assert.equal((await call('management',null,b.cookie)).status,403);
  const panel=await call('management',null,a.cookie);assert.equal(panel.status,200);assert.equal(panel.body.rooms.length,88);assert.ok(!JSON.stringify(panel.body).includes('example.test'));
  const manage=data=>call('management',data,a.cookie);
  const denied=await call('management',{action:'wallet',target:b.body.user.id,wallet:'gold',amount:999999,reason:'no authority'},b.cookie);assert.equal(denied.status,403);
  const balance=b.body.user.gold;
  assert.equal((await manage({action:'wallet',target:b.body.user.id,wallet:'gold',amount:1000,reason:'Test ödülü'})).status,200);
  assert.equal((await call('me',null,b.cookie)).body.user.gold,balance+1000);
  assert.equal((await manage({action:'wallet',target:b.body.user.id,wallet:'gold',amount:-1e8,reason:'Sınır testi'})).status,400);
  assert.equal((await call('me',null,b.cookie)).body.user.gold,balance+1000);
  assert.ok((await call('ledger',null,b.cookie)).body.some(l=>l.gold_delta===1000));
  assert.equal((await manage({action:'premium',target:b.body.user.id,days:7})).status,200);
  assert.ok((await call('me',null,b.cookie)).body.user.premiumUntil>Date.now());
  assert.equal((await manage({action:'mute',target:b.body.user.id,hours:1})).status,200);
  assert.equal((await manage({action:'room',room:'FFA-3',basePrize:70000,extraPrize:2000,closed:true})).status,200);
  const r=(await call('rooms')).body.find(r=>r.id==='FFA-3');assert.equal(r.closed,true);assert.ok(r.timeLeft>0&&r.timeLeft<=3600);
  const pin=await manage({action:'pin',kind:'gold',amount:5000});assert.ok(pin.body.code);
  assert.equal((await call('action',{action:'redeem',value:pin.body.code},b.cookie)).status,200);
  assert.equal((await call('action',{action:'redeem',value:pin.body.code},b.cookie)).status,400);
  assert.equal((await call('action',{action:'report',target:a.body.user.id,value:'İncelenecek test bildirimi'},b.cookie)).status,200);
  assert.equal((await call('management',null,a.cookie)).body.reports.length,1);
 }finally{await new Promise(r=>server.shutdown(r));delete process.env.AGARM_ADMIN_SETUP_HASH;await rm(dir,{recursive:true,force:true})}
});
