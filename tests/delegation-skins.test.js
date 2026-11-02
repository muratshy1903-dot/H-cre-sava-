import test from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,rm} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import crypto from 'node:crypto';import {once} from 'node:events';import sharp from 'sharp';import {World,wireCells} from '../dist/engine.js';import {PANEL_ACTIONS} from '../dist/panel-permissions.js';import {SKIN_CATALOG,skinImageUrl} from '../dist/skin-catalog.js';
test('delegation grants selected capabilities, blocks escalation and owner bans, and revokes existing sessions immediately; skins are free and uploads charge atomically',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'agarm-delegation-'));process.env.AGARM_DATA=dir;delete process.env.AGARM_OWNER_BOOTSTRAP;const code=crypto.randomBytes(24).toString('hex');process.env.AGARM_ADMIN_SETUP_HASH=crypto.createHash('sha256').update(code).digest('hex');
 const {startServer}=await import('../server/index.js'),server=startServer({port:0});await once(server,'listening');const base='http://127.0.0.1:'+server.address().port;
 const call=async(route,data,cookie)=>{const r=await fetch(base+'/api/'+route,{method:data?'POST':'GET',headers:{Origin:base,...(data?{'content-type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},body:data?JSON.stringify(data):undefined});return{status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]}};
 try{
  const owner=await call('register',{email:'owner@delegate.test',password:'test-passphrase-only',name:'Owner'}),mod=await call('register',{email:'mod@delegate.test',password:'test-passphrase-only',name:'Mod'});
  assert.equal((await call('admin-setup',{code},owner.cookie)).status,200);const target=mod.body.user.id,oid=owner.body.user.id;
  const manage=(data,cookie=owner.cookie)=>call('management',data,cookie);
  assert.equal((await manage({action:'panelAccess',target,permissions:['root']})).status,400);
  assert.equal((await manage({action:'panelAccess',target:oid,permissions:[]})).status,403);
  assert.equal((await manage({action:'panelAccess',target:'mod@delegate.test',permissions:['live','skins']})).status,200);
  const me=(await call('me',null,mod.cookie)).body.user;assert.equal(me.isAdmin,true);assert.equal(me.isOwner,false);assert.deepEqual(me.panelPermissions,['live','skins']);
  const panel=await call('management',null,mod.cookie);assert.equal(panel.status,200);assert.equal(panel.body.canDelegate,false);assert.deepEqual(panel.body.permissionCatalog,{});assert.deepEqual(panel.body.users,[]);
  const extra=await call('admin',null,mod.cookie);assert.equal(extra.status,200);assert.deepEqual(extra.body.tickets,[]);assert.deepEqual(extra.body.audit,[]);
  assert.equal((await manage({action:'panelAccess',target:oid,permissions:['economy']},mod.cookie)).status,403);
  for(const action of ['wallet','premium','mute','kick','reward','score','room','roomBoost','pin','finishRoom','createRoom','announce','reportStatus'])assert.equal((await manage({action,target:oid,amount:1,reason:'unauthorized'},mod.cookie)).status,403,action);
  for(const action of ['adminBan','adminTicket'])assert.equal((await call('action',{action,target:oid,hours:1,value:'Çözüldü'},mod.cookie)).status,403,action);
  assert.equal((await manage({action:'panelAccess',target,permissions:['bans','chat']})).status,200);
  assert.equal((await call('action',{action:'adminBan',target:oid,hours:1},mod.cookie)).status,403);
  assert.equal((await manage({action:'mute',target:oid,hours:1},mod.cookie)).status,403);
  assert.equal((await manage({action:'panelAccess',target,permissions:[]})).status,200);assert.equal((await call('management',null,mod.cookie)).status,403);assert.equal((await call('admin',null,mod.cookie)).status,403);
  // Empty wallet still selects free gallery skins; uploaded images remain an independently paid service.
  await manage({action:'wallet',target,wallet:'gold',amount:-100000,reason:'test empty balance'});
  for(const skin of SKIN_CATALOG){const result=await call('action',{action:'skin',value:skin.id},mod.cookie);assert.equal(result.status,200);assert.equal(result.body.user.gold,0);const image=await fetch(base+skin.image);assert.equal(image.status,200);assert.match(image.headers.get('content-type'),/image\/webp/)}
  const png=await sharp({create:{width:32,height:32,channels:3,background:'#abcdef'}}).png().toBuffer(),image='data:image/png;base64,'+png.toString('base64');
  assert.equal((await call('upload',{image},mod.cookie)).status,400);assert.equal((await call('my-uploads',null,mod.cookie)).body.length,0);
  await manage({action:'wallet',target,wallet:'gold',amount:10000,reason:'test one upload'});
  assert.equal((await call('upload',{image:'data:image/png;base64,AAAA'},mod.cookie)).status,400);assert.equal((await call('me',null,mod.cookie)).body.user.gold,10000);
  const uploads=await Promise.all([call('upload',{image},mod.cookie),call('upload',{image},mod.cookie)]);assert.deepEqual(uploads.map(x=>x.status).sort(),[201,400]);assert.equal((await call('me',null,mod.cookie)).body.user.gold,0);assert.equal((await call('my-uploads',null,mod.cookie)).body.length,1);
  const ledger=(await call('ledger',null,mod.cookie)).body.filter(x=>x.reason==='skinUpload');assert.equal(ledger.length,1);assert.equal(ledger[0].gold_delta,-10000);
 }finally{await new Promise(r=>server.shutdown(r));await rm(dir,{recursive:true,force:true})}
});
test('A gives 50 for ten Gold and farming viruses at 25 pieces adds mass without extra fragments or cap overflow',()=>{
 const w=new World(),p=w.addPlayer('p',{gold:10});w.items=[];assert.equal(w.gold(p,'small'),true);assert.equal(p.gold,0);assert.equal(p.cells[0].mass,150);
 p.cells=Array.from({length:25},(_,i)=>w.cell(p,1000,500+i%5*1400,500+Math.floor(i/5)*1400));p.aim=w.center(p);const c=p.cells[0];w.spawn('virus',c.x,c.y);const before=p.cells.reduce((n,c)=>n+c.mass,0);w.step(.001);assert.equal(p.cells.length,25);assert.ok(p.cells.reduce((n,c)=>n+c.mass,0)>before+99);assert.equal(w.items.filter(x=>x.type==='virus').length,0);
 assert.equal(skinImageUrl('https://evil.test/x'),null);assert.equal(skinImageUrl('custom-../x'),null);assert.ok(skinImageUrl('skin72').startsWith('/skin-art/'));
});

test('fractional fragment serialization preserves the exact authoritative score for replay and HUD',()=>{const cells=Array.from({length:25},(_,i)=>({id:i,x:10,y:20,mass:1000.55})),wire=wireCells(cells);assert.equal(wire.reduce((n,c)=>n+c.mass,0),Math.floor(cells.reduce((n,c)=>n+c.mass,0)));assert.ok(wire.every(c=>c.mass===1000||c.mass===1001));assert.equal(cells[0].mass,1000.55)});
