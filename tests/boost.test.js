import test from 'node:test';import assert from 'node:assert/strict';import {World,roomTiming} from '../dist/engine.js';
test('Boost charges affordable Gold once, grows mass, adds prize and respects release and nogold',()=>{
 const w=new World('FFA-1'),p=w.addPlayer('p',{gold:1200});w.items=[];
 const before=p.cells[0].mass;assert.equal(w.command('p',{type:'boost'}),true);
 assert.equal(p.gold,700);assert.equal(p.cells[0].mass,before+1250);assert.equal(w.prize,50500);
 assert.equal(w.command('p',{type:'boost'}),false);
 w.time+=100;w.command('p',{type:'boost'});assert.equal(p.gold,200);
 w.time+=100;w.command('p',{type:'boost'});assert.equal(p.gold,0);assert.equal(w.prize,51200);
 w.command('p',{type:'hold',kind:'boost'});w.command('p',{type:'hold',kind:''});p.gold=500;
 w.step(.1);assert.equal(p.gold,500);
 const no=new World('GSZ-1'),q=no.addPlayer('q',{gold:10000});assert.equal(no.command('q',{type:'boost'}),false);assert.equal(q.gold,10000);
});
test('BOOST-1 has its own 10-minute clock, compact map, double Boost and existing FFA clocks stay fixed',()=>{
 const now=Date.parse('2026-10-30T10:03:00Z'),w=new World('BOOST-1',{now,continuous:true}),p=w.addPlayer('p',{gold:2000});
 assert.equal(w.size,4500);assert.equal(w.roundEnd-w.roundStart,600000);
 assert.equal(roomTiming('FFA-2',now).endsAt%3600000,Math.floor(3600000/87));
 const mass=p.cells[0].mass;w.command('p',{type:'boost'});assert.equal(p.gold,1000);assert.equal(p.cells[0].mass,mass+2500);
 w.step(.05,w.roundEnd);assert.equal(w.roundEnd-w.roundStart,600000);
});
test('admin mass grants update score without Gold, stay within cell and overall caps and reject dead players',()=>{
 const w=new World('FFA-1'),p=w.addPlayer('p',{gold:5000});const prize=w.prize;
 assert.equal(w.addMass(p,10000),10000);assert.equal(p.score,10100);assert.equal(p.gold,5000);assert.equal(w.prize,prize);
 assert.equal(w.addMass(p,5500000),220084-10100);assert.equal(p.score,220084);
 assert.equal(w.addMass(p,1),0);p.cells=[];assert.equal(w.addMass(p,1),0);
});
