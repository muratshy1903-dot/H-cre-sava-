import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {crystalRound,createCrystalGame} from '../server/crystal-game.js';

test('tumbles continue past five evaluations until matches end',()=>{
  let calls=0;
  const result=crystalRound(100000,{random:()=>calls++<210?0:((calls-211)%8)*12});
  assert.equal(result.tumbles,7);assert.equal(result.frames.length,8);assert.equal(result.frames.at(-1).cleared.length,0);
  assert.equal(result.payout,result.frames.reduce((sum,f)=>sum+f.win,0));
});

test('four scatters award 15 spins, three retrigger 5 free spins, losing orbs do not accumulate',()=>{
  const scatter=(count,free=false)=>{let i=0;return crystalRound(100,{free,random:()=>i++<count?96:((i-count-1)%8)*12});};
  assert.equal(scatter(4).bonusAwarded,15);assert.equal(scatter(4).scatterPayout,300);assert.equal(scatter(5).scatterPayout,500);assert.equal(scatter(6).scatterPayout,10000);assert.equal(scatter(3).bonusAwarded,0);assert.equal(scatter(3,true).bonusAwarded,5);
  let i=0;const loss=crystalRound(100,{free:true,featureMultiplier:7,random:max=>max===1000?0:i++===0?99:((i-2)%8)*12});
  assert.equal(loss.payout,0);assert.equal(loss.featureMultiplier,7);
});

test('orb values add once across tumbles and a winning free spin carries its multiplier forward',()=>{
  let i=0;
  const r=crystalRound(100000,{free:true,featureMultiplier:7,random:max=>{if(max===1000)return 0;const n=i++;return n<8?0:n===8?99:12+((n-9)%7)*12;}});
  assert.equal(r.orbTotal,2);assert.equal(r.multiplier,9);assert.equal(r.featureMultiplier,9);assert.equal(r.payout,r.base*9);
  let j=0;const withoutOrb=crystalRound(100000,{free:true,featureMultiplier:9,random:()=>j++<8?0:12+((j-9)%7)*12});
  assert.ok(withoutOrb.base>0);assert.equal(withoutOrb.multiplier,1);assert.equal(withoutOrb.payout,withoutOrb.base);assert.equal(withoutOrb.featureMultiplier,9);
});

test('maximum stake can win exactly 5000x without 32-bit truncation and stops the tumble',()=>{
  let i=0;
  const r=crystalRound(5000000,{random:max=>max===1000?999:i++<8?84:i<=30?99:84});
  assert.equal(r.payout,25000000000);assert.equal(r.capped,true);assert.ok(Number.isSafeInteger(r.payout));
  let j=0;const remainder=crystalRound(5000000,{free:true,featureMultiplier:500,cap:12345,random:()=>j++<30?84:0});
  assert.equal(remainder.payout,12345);assert.equal(remainder.capped,true);
});

test('existing bonus schema migrates without losing turns, and the 5000x cap closes retriggers',()=>{
  const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE accounts(id INTEGER PRIMARY KEY);INSERT INTO accounts VALUES(1);CREATE TABLE crystal_bonus(account_id INTEGER PRIMARY KEY,wallet TEXT,bet INTEGER,remaining INTEGER);INSERT INTO crystal_bonus VALUES(1,\'gold\',5000000,3)');
  const p={id:1,gold:0,bonus:100},fail=message=>{throw Error(message);};let response;
  const game=createCrystalGame({db,fail,save(){},spend(){throw Error('Free spins must not charge');},atomic:fn=>fn(),mePublic:p=>p,json(res,status,payload){response=payload;},round(bet,options){assert.equal(options.free,true);assert.equal(options.featureMultiplier,100);assert.equal(options.cap,123);return{payout:123,bonusAwarded:5,featureMultiplier:102,capped:true,frames:[]};}});
  try{
    assert.equal(db.prepare('SELECT remaining FROM crystal_bonus').get().remaining,3);
    db.prepare('UPDATE crystal_bonus SET won=?,multiplier=100').run(25000000000-123);
    game.route({method:'POST'},{},{pathname:'/api/crystal'},p,{requestId:'feature-cap-test-0001',wallet:'gold',bet:5000000});
    assert.equal(response.round.remaining,0);assert.equal(response.round.featureWon,25000000000);assert.equal(response.bonus,null);assert.equal(p.gold,123);assert.equal(p.bonus,100);
  }finally{db.close();}
});

test('bonus state survives service recreation, keeps its wallet and stake, and does not charge free turns',()=>{
  const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE accounts(id INTEGER PRIMARY KEY)');db.exec('INSERT INTO accounts VALUES(1)');
  const p={id:1,gold:1000,bonus:500},fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
  let clock=1000,draws=0;
  const deps={db,now:()=>clock,fail,mePublic:p=>({...p}),save(){},spend(p,n,w){if(p[w]<n)fail('Yetersiz');p[w]-=n;},
    atomic(fn){const before={...p};db.exec('BEGIN');try{const r=fn();db.exec('COMMIT');return r;}catch(e){db.exec('ROLLBACK');Object.assign(p,before);throw e;}},
    round(){draws++;return{frames:[{grid:Array(20).fill('leaf'),cleared:[],win:0}],multiplier:1,payout:25,bonusAwarded:draws===1?3:0};},
    json(res,status,payload){res.status=status;res.payload=payload;}};
  const play=(game,id,wallet='bonus',bet=100)=>{const res={};game.route({method:'POST'},res,{pathname:'/api/crystal'},p,{requestId:id,wallet,bet});return res.payload;};
  try{
    let game=createCrystalGame(deps);const paid=play(game,'first-request-0001');assert.equal(paid.round.cost,100);assert.equal(p.bonus,425);assert.equal(p.gold,1000);assert.equal(paid.bonus.remaining,3);
    clock+=1000;game=createCrystalGame(deps);
    assert.throws(()=>play(game,'wrong-wallet-0001','gold'),/Bonus turlarını/);assert.equal(p.gold,1000);
    const free=play(game,'second-request-001');assert.equal(free.round.cost,0);assert.equal(free.bonus.remaining,2);assert.equal(p.bonus,450);
    const repeat=play(game,'second-request-001');assert.equal(repeat.round.requestId,free.round.requestId);assert.equal(p.bonus,450);assert.equal(draws,2);
    for(const id of ['third-request-0001','fourth-request-001']){clock+=1000;play(game,id);}
    assert.equal(p.bonus,500);assert.equal(db.prepare('SELECT count(*) n FROM crystal_bonus').get().n,0);
    clock+=1000;const before=p.bonus;deps.round=()=>{throw Error('injected failure');};game=createCrystalGame(deps);
    assert.throws(()=>play(game,'rollback-request-1'),/injected failure/);assert.equal(p.bonus,before);assert.equal(db.prepare('SELECT count(*) n FROM crystal_rounds').get().n,4);
  }finally{db.close();}
});
