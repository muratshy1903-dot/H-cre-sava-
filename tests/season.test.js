import test from 'node:test';import assert from 'node:assert/strict';
import {seasonMeta,seasonState,SEASON_LENGTH,SEASON_ANCHOR,SEASON_QUESTS,rewardFor,claimReward,claimAllRewards,buyPass,claimSeasonQuest,equipCosmetic,cosmeticLook,levelForXP,PASS_PRICE} from '../dist/season.js';
import {DAILY_QUESTS,claimDaily,progress,daily} from '../dist/progression.js';
const t=SEASON_ANCHOR+86400000,profile=()=>({gold:1000000,bonus:0,xp:0,premiumUntil:0,inventory:[],claimed:[]});
test('ZirvePass has 30 tiers, 3 extra milestones and exact published reward totals',()=>{
 assert.equal(levelForXP(0),0);assert.equal(levelForXP(199),0);assert.equal(levelForXP(200),1);assert.equal(levelForXP(6000),30);assert.equal(levelForXP(9000),30);
 for(const [lane,total]of [['free',160000],['paid',800000]])assert.equal(Array.from({length:33},(_,i)=>rewardFor(i+1,lane)?.amount||0).reduce((a,b)=>a+b,0),total);
 assert.equal(DAILY_QUESTS.reduce((n,q)=>n+q.xp,0),250);assert.equal(SEASON_QUESTS.reduce((n,q)=>n+q.xp,0),6500);
 assert.equal(rewardFor(2,'free'),null);assert.equal(rewardFor(34,'paid'),null);
});
test('free and paid claims are independent, late purchase unlocks earlier paid rewards once',()=>{
 const p=profile(),s=seasonState(p,t);s.xp=6000;const start=p.gold;
 assert.throws(()=>claimReward(p,5,'paid',t));claimReward(p,1,'free',t);assert.equal(p.gold,start+2500);assert.throws(()=>claimReward(p,1,'free',t));
 buyPass(p,t);assert.equal(p.gold,start+2500-PASS_PRICE);assert.throws(()=>buyPass(p,t));claimReward(p,1,'paid',t);assert.equal(p.gold,start+2500-PASS_PRICE+15000);
 claimReward(p,5,'paid',t);const nick=rewardFor(5,'paid',seasonMeta(t));assert.ok(p.inventory.includes(nick.id));equipCosmetic(p,nick.id,'nick',t);assert.equal(cosmeticLook(p).nick.name,nick.name);assert.throws(()=>equipCosmetic(p,nick.id,'border',t));
 const count=claimAllRewards(p,t);assert.ok(count>30);assert.equal(p.gold,start-PASS_PRICE+135000+675000);assert.equal(p.premiumUntil,t+3*86400000);assert.throws(()=>claimAllRewards(p,t));
 assert.throws(()=>claimReward(p,31,'free',t));s.xp=7000;claimReward(p,31,'free',t);s.xp=7999;assert.throws(()=>claimReward(p,32,'free',t));s.xp=9000;claimAllRewards(p,t);assert.equal(p.gold,start-PASS_PRICE+960000);
});
test('season rollover resets progress and purchase, keeps permanent collection, loadout and balances',()=>{
 const p=profile();seasonState(p,t).xp=3000;buyPass(p,t);claimReward(p,5,'paid',t);const item=rewardFor(5,'paid',seasonMeta(t));equipCosmetic(p,item.id,'nick',t);const before=p.gold;
 const fresh=seasonState(p,t+SEASON_LENGTH);assert.equal(fresh.xp,0);assert.equal(fresh.paid,false);assert.deepEqual(fresh.claimed,[]);assert.equal(p.gold,before);assert.ok(p.inventory.includes(item.id));assert.equal(cosmeticLook(p).nick.id,item.id);assert.equal(p.seasonArchive.length,1);
 assert.throws(()=>claimReward(p,5,'paid',t+SEASON_LENGTH));
 const restored=JSON.parse(JSON.stringify(p));assert.equal(seasonState(restored,t+SEASON_LENGTH).id,fresh.id);assert.equal(cosmeticLook(restored).nick.id,item.id);
});
test('quest XP is authoritative, daily claims reset at Istanbul midnight and seasonal quests are single-use',()=>{
 const p=profile();seasonState(p,t);progress(p,{food:100,seconds:600,goldSpent:5000,kills:3},t);
 for(const q of DAILY_QUESTS)claimDaily(p,q.id,t);assert.equal(p.season.xp,250);assert.throws(()=>claimDaily(p,'food',t));
 assert.throws(()=>claimSeasonQuest(p,'season-food',t));progress(p,{food:9900},t);claimSeasonQuest(p,'season-food',t);assert.equal(p.season.xp,1250);assert.throws(()=>claimSeasonQuest(p,'season-food',t));
 const next=t+86400000;assert.equal(daily(p,next).food,0);assert.equal(p.season.questClaims.length,1);assert.throws(()=>claimSeasonQuest(p,'season-food',next));
});
test('old Pass and claims migrate once without granting duplicate currency or discarding old cosmetics',()=>{
 const p={...profile(),xp:1000,inventory:['pass','neon-5'],equipped:'neon-5',claimed:[1,2]};const balance=p.gold,s=seasonState(p,t);assert.equal(s.xp,1000);assert.equal(s.paid,true);assert.ok(s.claimed.includes('free:1'));assert.ok(s.claimed.includes('paid:1'));assert.equal(p.gold,balance);assert.ok(p.inventory.includes('neon-5'));assert.equal(p.equipped,'neon-5');assert.ok(!p.inventory.includes('pass'));assert.throws(()=>claimReward(p,1,'paid',t));seasonState(p,t+SEASON_LENGTH);assert.equal(p.season.xp,0);assert.equal(p.season.paid,false);
});
