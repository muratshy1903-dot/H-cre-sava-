import test from 'node:test';import assert from 'node:assert/strict';
import {CrystalAutoplay} from '../dist/crystal-auto.js';
test('custom autoplay counts paid spins once, finishes bonuses and never treats a purchase as a paid spin',()=>{
 const auto=new CrystalAutoplay();for(const count of [0,-1,1.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1])assert.throws(()=>auto.start(count,'gold',100));
 auto.start(2,'gold',5000000);assert.equal(auto.next(null),true);
 auto.record({requestId:'purchase',kind:'buy',free:false});assert.equal(auto.remaining,2);
 auto.record({requestId:'paid1',kind:'spin',free:false});auto.record({requestId:'paid1',kind:'spin',free:false});assert.equal(auto.remaining,1);
 auto.record({requestId:'free1',kind:'spin',free:true});assert.equal(auto.remaining,1);
 auto.record({requestId:'paid2',kind:'spin',free:false});assert.equal(auto.remaining,0);assert.equal(auto.next(null),false);assert.equal(auto.next({remaining:15}),true);
 auto.stop();assert.equal(auto.next({remaining:15}),false);
 auto.start(1234567,'bonus',100);assert.equal(auto.remaining,1234567);assert.equal(auto.wallet,'bonus');auto.stop();assert.equal(auto.active,false);
});
