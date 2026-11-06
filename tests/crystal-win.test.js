import test from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';
import {planCrystalFeature} from '../server/crystal-win.js';import {createCrystalGame} from '../server/crystal-game.js';import {crystalMath} from '../dist/crystal-rules.js';
const zero=()=>({payout:0,frames:[],bonusAwarded:0,featureMultiplier:0,multiplier:1,capped:false});
test('0, 50, 99.99 and 100 percent select the exact profitable portion of 10000 equally likely bins',()=>{
 for(const probability of [0,50,99.99,100]){
  let wins=0;
  for(let bucket=0;bucket<10000;bucket++){
   const r=planCrystalFeature({bet:100,math:crystalMath(),winChance:probability,random:()=>bucket,capture:false},zero);
   if(r.total>r.cost){wins++;assert.ok(r.total>=101);}else assert.ok(r.total<=r.cost);
  }
  assert.equal(wins,Math.round(probability*100));
 }
});
test('purchased support pays once at the end, preserves genuine symbol payouts, and stays inside the cap',()=>{
 const r=planCrystalFeature({bet:5000000,math:crystalMath(99.99,'buy'),mode:'buy',winChance:100,random:()=>0},zero);
 assert.equal(r.rounds.length,15);assert.equal(r.cost,500000000);assert.equal(r.total,505000000);
 assert.ok(r.rounds.slice(0,-1).every(x=>x.payout===0&&x.supportPayout===0));assert.equal(r.rounds.at(-1).supportPayout,505000000);assert.equal(r.rounds.at(-1).symbolPayout,0);
 const jackpot=planCrystalFeature({bet:5000000,math:crystalMath(),winChance:100,random:()=>0},()=>({...zero(),payout:25000000000,capped:true}));
 assert.equal(jackpot.total,25000000000);assert.equal(jackpot.rounds[0].supportPayout,0);
 let draws=0;const loss=planCrystalFeature({bet:100,math:crystalMath(),winChance:0,random:()=>9999},()=>{draws++;return{...zero(),payout:1000};});
 assert.equal(draws,128);assert.equal(loss.total,0);assert.equal(loss.rounds[0].frames[0].cleared.length,0);
});
test('queued purchased results survive recreation and a later chance change, with no future results exposed',()=>{
 const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE accounts(id INTEGER PRIMARY KEY);INSERT INTO accounts VALUES(1)');let clock=1000,result;
 const p={id:1,gold:20000,bonus:100},deps={db,now:()=>clock,round:zero,atomic:fn=>fn(),save(){},spend(p,n,w){if(p[w]<n)throw Error('insufficient');p[w]-=n;},fail:message=>{throw Error(message);},mePublic:p=>({...p}),json(res,status,payload){result=payload;}};
 let game=createCrystalGame(deps);db.exec('UPDATE crystal_settings SET win_chance_bps=10000');
 const play=(kind,id)=>{game.route({method:'POST'},{},{pathname:'/api/crystal'},p,{kind,bet:100,wallet:'gold',requestId:id,settingsRevision:1});return result;};
 try{
  const bought=play('buy','bought-plan-test-001');assert.equal(p.gold,10000);assert.equal(bought.bonus.remaining,15);assert.equal(Object.hasOwn(bought.bonus,'plan'),false);assert.equal(Object.hasOwn(bought.round,'chosenWin'),false);
  play('buy','bought-plan-test-001');assert.equal(p.gold,10000);
  for(let i=0;i<7;i++){clock+=1000;play('spin','free-plan-test-000'+i);}
  game=createCrystalGame(deps);db.exec('UPDATE crystal_settings SET win_chance_bps=0,revision=2');
  for(let i=7;i<15;i++){clock+=1000;const r=play('spin','free-plan-test-000'+i);assert.equal(r.round.math.winChance,100);}
  assert.equal(p.gold,20100);assert.equal(p.bonus,100);assert.equal(result.round.supportPayout,10100);assert.equal(result.round.featureNet,100);assert.equal(result.bonus,null);
  const same=play('spin','free-plan-test-00014');assert.equal(same.user.gold,20100);
 }finally{db.close();}
});
