import test from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,rm} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import crypto from 'node:crypto';import {DatabaseSync} from 'node:sqlite';import {once} from 'node:events';
test('crystal API authenticates, isolates wallets, prevents duplicate charges and persists receipts with the ledger',async()=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'agarm-crystal-'));process.env.AGARM_DATA=dir;
  const {startServer}=await import('../server/index.js');const server=startServer({port:0});await once(server,'listening');const base='http://127.0.0.1:'+server.address().port,db=new DatabaseSync(path.join(dir,'agarm.sqlite'));
  const seed=(name,gold,bonus)=>{const p={name,gold,bonus,wins:0,xp:0,premiumUntil:0,inventory:[],skins:[],claimed:[],names:[],favorites:[],following:[],settings:{}};const id=Number(db.prepare('INSERT INTO accounts(email,hash,salt,profile) VALUES(?,?,?,?)').run(name+'@crystal.test','00'.repeat(64),'fixture',JSON.stringify(p)).lastInsertRowid),token=crypto.randomBytes(32).toString('hex');db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(crypto.createHash('sha256').update(token).digest('hex'),id,Date.now()+60000);return{id,cookie:'agarm_session='+token};};
  const player=seed('player',10000,5000),other=seed('other',0,0);
  const call=async(data,who=player,origin=base)=>{const r=await fetch(base+'/api/crystal',{method:data?'POST':'GET',headers:{Origin:origin,Cookie:who?.cookie||'','content-type':'application/json'},body:data?JSON.stringify(data):undefined});return{status:r.status,body:await r.json()};};
  const request={requestId:'duplicate-request-001',wallet:'gold',bet:100};
  try{
    assert.equal((await call(null,null)).status,401);assert.equal((await call(request,player,'https://foreign.test')).status,403);
    for(const patch of [{wallet:'__proto__'},{bet:-100},{bet:0},{bet:1.5},{bet:'100'},{requestId:'x'}])assert.equal((await call({...request,...patch})).status,400);
    assert.equal((await call(request,other)).status,400);
    const responses=await Promise.all([call(request),call(request)]);assert.deepEqual(responses.map(r=>r.status),[200,200]);
    const r=responses[0].body.round;assert.deepEqual(responses[1].body.round,r);
    let current=(await call()).body;assert.equal(current.user.gold,10000+r.net);assert.equal(current.user.bonus,5000);assert.equal(current.history.length,1);
    assert.equal(db.prepare('SELECT count(*) n FROM ledger WHERE account_id=? AND reason=?').get(player.id,'crystalRound').n,r.net?1:0);
    assert.equal((await call({...request,wallet:'bonus'})).status,409);
    const rapid=await call({...request,requestId:'rapid-request-0001'});assert.equal(rapid.status,429);
    if(!current.bonus){db.prepare('UPDATE crystal_rounds SET at=at-2000 WHERE account_id=?').run(player.id);const b=await call({...request,requestId:'bonus-wallet-0001',wallet:'bonus'});assert.equal(b.status,200);assert.equal(b.body.user.gold,current.user.gold);assert.equal(b.body.user.bonus,5000+b.body.round.net);}
    assert.equal((await call(null,other)).body.history.length,0);
    current=(await call()).body;const saved=JSON.parse(db.prepare('SELECT profile FROM accounts WHERE id=?').get(player.id).profile);assert.equal(saved.gold,current.user.gold);assert.equal(saved.bonus,current.user.bonus);
    const repeated=await call(request);assert.equal(repeated.status,200);assert.equal(repeated.body.user.gold,current.user.gold);assert.equal(repeated.body.history.length,current.history.length);
  }finally{await new Promise(resolve=>server.shutdown(resolve));db.close();await rm(dir,{recursive:true,force:true});}
});
