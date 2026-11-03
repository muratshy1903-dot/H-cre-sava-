import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../dist/engine.js';
import {goldCharges} from '../dist/gold-effects.js';

test('A and S remain separate receipts across a bundled snapshot and repeated states',()=>{
 const w=new World('FFA-1',{now:1000}),p=w.addPlayer('me',{gold:1000});
 const before=w.snapshot('me');
 assert.equal(w.gold(p,'small'),true);
 assert.equal(w.gold(p,'big'),true);
 const after=w.snapshot('me');
 assert.deepEqual(goldCharges(before,after),[10,100]);
 assert.equal(p.gold,890);
 assert.deepEqual(goldCharges(after,after),[]);
 assert.deepEqual(goldCharges(null,after),[]);
 assert.deepEqual(goldCharges({...before,room:'FFA-2'},after),[]);
 assert.deepEqual(goldCharges({...before,self:{...before.self,id:'other'}},after),[]);
});

test('receipts only reflect successful charges, include boosts, and stay bounded',()=>{
 const w=new World('MMA-1',{now:1000}),p=w.addPlayer('me',{gold:1,mmaGold:1000});
 w.boost={gold:3,feedMs:90,splitMs:80,until:100000};
 const before=w.snapshot('me');
 assert.equal(w.gold(p,'big'),true);
 assert.equal(w.gold(p,'big'),false);
 assert.deepEqual(goldCharges(before,w.snapshot('me')),[300]);
 assert.equal(p.gold,1);assert.equal(p.mmaGold,700);
 p.mmaGold=0;w.time+=50;
 assert.equal(w.gold(p,'big'),false);
 assert.equal(p.goldReceiptSeq,1);
 p.mmaGold=100000;
 for(let i=0;i<200;i++){w.time+=50;w.gold(p,'small');w.gold(p,'big')}
 assert.ok(p.goldReceipts.length<=64);
 w.time+=1501;
 assert.deepEqual(w.snapshot('me').self.goldReceipts,[]);
});

test('legacy cumulative costs work without inventing individual transactions',()=>{
 const state=n=>({room:'FFA-1',self:{id:'me',goldSpent:n}});
 assert.deepEqual(goldCharges(state(0),state(200)),[200]);
 assert.deepEqual(goldCharges(state(200),state(0)),[]);
});
