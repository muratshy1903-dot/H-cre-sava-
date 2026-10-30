import test from 'node:test';import assert from 'node:assert/strict';import {World} from '../dist/engine.js';
test('rapid manual splits are queued, preserve their individual aim and conserve mass',()=>{
 const w=new World(),p=w.addPlayer('p');w.items=[];p.cells[0].mass=1000;p.cells[0].x=p.cells[0].y=4250;
 w.command('p',{type:'move',x:8000,y:4250});assert.equal(w.command('p',{type:'split'}),true);assert.equal(p.cells.length,2);
 w.command('p',{type:'move',x:4250,y:0});assert.equal(w.command('p',{type:'split'}),true);assert.equal(p.splitQueue.length,1);
 w.step(.05);assert.equal(p.cells.length,2);w.step(.05);assert.equal(p.cells.length,4);assert.equal(p.splitQueue.length,0);
 assert.ok(p.cells.slice(2).every(c=>c.vy<0));assert.ok(Math.abs(p.cells.reduce((n,c)=>n+c.mass,0)-1000)<1);
 w.respawn(p);assert.equal(p.splitQueue.length,0);
});
test('normal Gold is spread evenly and keeps wallet, prize and mass caps correct',()=>{
 const w=new World(),p=w.addPlayer('p',{gold:1000});p.cells=[w.cell(p,100),w.cell(p,100)];
 assert.equal(w.gold(p,'big'),true);assert.deepEqual(p.cells.map(c=>c.mass),[225,225]);assert.equal(p.gold,900);assert.equal(w.prize,50100);
 w.time+=50;assert.equal(w.gold(p,'big'),true);assert.deepEqual(p.cells.map(c=>c.mass),[350,350]);
 p.cells[0].mass=220080;p.cells[1].mass=100;w.time+=50;w.gold(p,'big');assert.equal(p.cells.length,3);assert.ok(Math.abs(p.cells.reduce((n,c)=>n+c.mass,0)-220430)<1e-6);assert.ok(p.cells.every(c=>c.mass<220000));assert.equal(p.gold,700);
});
test('overlapping fragments separate, then rejoin once the merge timer expires',()=>{
 const w=new World(),p=w.addPlayer('p');w.items=[];p.cells[0].mass=4000;w.burst(p,p.cells[0]);w.step(.05);
 assert.ok(new Set(p.cells.map(c=>c.x.toFixed(2)+','+c.y.toFixed(2))).size>1);
 p.cells=[w.cell(p,50,4250,4250),w.cell(p,50,4260,4250)];for(const c of p.cells)c.mergeAt=0;
 w.step(.05);assert.equal(p.cells.length,1);assert.ok(p.cells[0].mass>99);
});
