import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {once} from 'node:events';
import {DatabaseSync} from 'node:sqlite';
import {PANEL_PERMISSIONS,PANEL_SECTIONS} from '../dist/panel-permissions.js';
test('removed game cannot be opened or played; historical rows and account balances survive',async()=>{
 const dir=await mkdtemp(tmpdir()+'/agarm-removed-');process.env.AGARM_DATA=dir;const db=new DatabaseSync(dir+'/agarm.sqlite');db.exec('CREATE TABLE crystal_rounds(id INTEGER PRIMARY KEY, result TEXT); INSERT INTO crystal_rounds VALUES(1,\'{"legacy":true}\')');const {startServer}=await import('../server/index.js');const server=startServer({port:0});await once(server,'listening');const base='http://127.0.0.1:'+server.address().port;
 try{
  const r=await fetch(base+'/api/register',{method:'POST',headers:{origin:base,'content-type':'application/json'},body:JSON.stringify({email:'removed@example.test',password:'test-only-passphrase',name:'Removal test'})});assert.equal(r.status,201);const initial=(await r.json()).user,cookie=r.headers.get('set-cookie').split(';')[0];
  for(const route of ['/api/crystal','/api/crystal/settings','/api/crystal/buy'])for(const method of ['GET','POST']){const response=await fetch(base+route,{method,headers:{origin:base,cookie,'content-type':'application/json'},body:method==='POST'?'{}':undefined});assert.equal(response.status,410)}
  for(const route of ['/crystal-view.js','/crystal-rules.js','/crystal-auto.js','/crystal.css'])assert.equal((await fetch(base+route)).status,404);
  const page=await(await fetch(base)).text();assert.ok(!page.includes('page=crystal'));assert.ok(!page.includes('crystal.css'));assert.ok(!('crystal' in PANEL_SECTIONS));assert.ok(!('crystalRtp' in PANEL_PERMISSIONS));assert.ok(!('crystalWinChance' in PANEL_PERMISSIONS));
  const after=(await(await fetch(base+'/api/me',{headers:{cookie}})).json()).user;for(const key of ['gold','bonus','wins'])assert.equal(after[key],initial[key]);assert.equal(db.prepare('SELECT result FROM crystal_rounds WHERE id=1').get().result,'{"legacy":true}');
 }finally{await new Promise(resolve=>server.shutdown(resolve));db.close();await rm(dir,{recursive:true,force:true})}
});
