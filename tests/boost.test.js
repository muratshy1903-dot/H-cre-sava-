import test from 'node:test';import assert from 'node:assert/strict';import {World,roomTiming} from '../dist/engine.js';
test('players cannot activate personal Boost; admin room rates apply to normal Gold controls only in that room',()=>{
 const w=new World('FFA-1',{now:1000}),p=w.addPlayer('p',{gold:1200});w.items=[];
 const before=p.cells[0].mass;
 assert.equal(w.command('p',{type:'boost'}),false);
 assert.equal(w.command('p',{type:'hold',kind:'boost'}),false);
 assert.equal(p.hold,'');assert.equal(p.gold,1200);assert.equal(p.cells[0].mass,before);
 w.boost={gold:5,feedMs:50,splitMs:50,until:1200};
 assert.equal(w.command('p',{type:'gold',kind:'big'}),true);
 assert.equal(p.gold,700);assert.equal(p.cells[0].mass,before+1250);assert.equal(w.prize,50500);
 assert.equal(w.snapshot('p').self.goldBoostMultiplier,5);
 const other=new World('FFA-2',{now:1000}),q=other.addPlayer('q',{gold:1200});
 other.command('q',{type:'gold',kind:'big'});assert.equal(q.gold,1100);assert.equal(other.snapshot('q').self.goldBoostMultiplier,1);
 w.time=1200;w.command('p',{type:'gold',kind:'big'});assert.equal(p.gold,600);assert.equal(w.snapshot('p').self.goldBoostMultiplier,1);
 const no=new World('GSZ-1'),g=no.addPlayer('g',{gold:10000});no.boost={gold:5,feedMs:50,splitMs:50,until:0};assert.equal(no.command('g',{type:'gold',kind:'big'}),false);assert.equal(g.gold,10000);
});
test('BOOST-1 keeps its 10-minute clock and compact map while Gold rate is controlled by the administrator',()=>{
 const now=Date.parse('2026-10-30T10:03:00Z'),w=new World('BOOST-1',{now,continuous:true}),p=w.addPlayer('p',{gold:2000});
 assert.equal(w.size,4500);assert.equal(w.roundEnd-w.roundStart,600000);
 assert.equal(roomTiming('FFA-2',now).endsAt%3600000,Math.floor(3600000/87));
 assert.equal(w.command('p',{type:'boost'}),false);w.command('p',{type:'gold',kind:'big'});assert.equal(p.gold,1900);
 w.step(.05,w.roundEnd);assert.equal(w.roundEnd-w.roundStart,600000);
});
test('admin mass grants update score without Gold, stay within cell and overall caps and reject dead players',()=>{
 const w=new World('FFA-1'),p=w.addPlayer('p',{gold:5000});const prize=w.prize;
 assert.equal(w.addMass(p,10000),10000);assert.equal(p.score,10100);assert.equal(p.gold,5000);assert.equal(w.prize,prize);
 assert.equal(w.addMass(p,5500000),5500000-10100);assert.equal(p.score,5500000);assert.equal(p.cells.length,25);assert.ok(p.cells.every(c=>c.mass<=220084));
 assert.equal(w.addMass(p,1),0);p.cells=[];assert.equal(w.addMass(p,1),0);
});
