import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {crystalRound,createCrystalGame} from '../server/crystal-game.js';

test('original crystal rules pay matches, apply one multiplier and award bonus only on paid turns',()=>{
  const matched=crystalRound(100,{random:()=>0});
  assert.equal(matched.frames.length,5);assert.equal(matched.multiplier,2);
  assert.equal(matched.payout,750);assert.equal(matched.bonusAwarded,0);
  const bonus=free=>{let i=0;return crystalRound(100,{free,random:()=>i++<3?20:[0,4,8,12,15,18][(i-4)%6]});};
  assert.equal(bonus(false).bonusAwarded,3);assert.equal(bonus(true).bonusAwarded,0);
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
