import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../dist/engine.js';
const isolated=()=>{const w=new World('FFA-1',{now:1000});w.items=[];w.replenishVirus=()=>false;const p=w.addPlayer('p');p.cells[0].x=p.cells[0].y=16000;p.aim={x:16000,y:16000};return {w,p}};
test('requested split threshold, mass conservation, merge clock and 32-step launch',()=>{
 const {w,p}=isolated();p.cells[0].mass=35.99;assert.equal(w.split(p),false);w.time+=80;p.cells[0].mass=36;p.aim.x=20000;assert.equal(w.split(p),true);assert.deepEqual(p.cells.map(c=>c.mass),[18,18]);assert.ok(p.cells.every(c=>c.mergeAt-w.time===15360));assert.equal(p.cells[1].launchUntil-w.time,1600);
 const launch=p.cells[1].vx;w.step(.05);assert.ok(Math.abs(p.cells[1].vx-launch*.85)<1e-8);for(let i=1;i<32;i++)w.step(.05);assert.equal(p.cells[1].vx,0);assert.equal(p.cells[1].vy,0);assert.equal(p.cells.reduce((a,c)=>a+c.mass,0),36);
});
test('W is forbidden below 32; E starts immediately, charges 16 and emits 12 towards aim',()=>{
 const {w,p}=isolated();p.cells[0].mass=31.99;assert.equal(w.command('p',{type:'eject'}),false);w.time+=90;p.cells[0].mass=32;p.aim.x=20000;w.command('p',{type:'feed',on:true});assert.equal(p.cells[0].mass,16);assert.equal(w.items.length,1);assert.equal(w.items[0].mass,12);assert.equal(w.items[0].vx,3200);assert.equal(w.items[0].vy,0);w.command('p',{type:'feed',on:true});assert.equal(w.items.length,1);w.command('p',{type:'feed',on:false});w.step(.1);assert.equal(w.items.length,1);
});
test('decay is consistent across tick sizes, respects 100 floor and stops in final three seconds',()=>{
 const results=[];for(const dt of [.01,.05,.1]){const {w,p}=isolated();p.cells[0].mass=1000;for(let i=0;i<Math.round(1/dt);i++)w.step(dt);results.push(p.cells[0].mass);assert.ok(Math.abs(p.cells[0].mass-1000*Math.exp(-.006))<1e-7);w.roundEnd=w.time+3000;const before=p.cells[0].mass;w.step(dt);assert.equal(p.cells[0].mass,before);p.cells[0].mass=100;w.roundEnd=w.time+100000;w.step(dt);assert.equal(p.cells[0].mass,100)}assert.ok(Math.max(...results)-Math.min(...results)<1e-7);
});
test('requested map, initial counts and full virus mass award apply in the actual simulation',()=>{
 const w=new World('FFA-1',{now:1000});assert.equal(w.size,32000);assert.equal(w.roundEnd-w.roundStart,3600000);assert.equal(w.items.filter(i=>i.type==='food').length,450);assert.equal(w.items.filter(i=>i.type==='virus').length,75);assert.ok(w.items.filter(i=>i.type==='virus').every(i=>i.mass===250));const p=w.addPlayer('p');p.cells=Array.from({length:25},(_,i)=>w.cell(p,1000,1000+i*1000,16000));p.aim=w.center(p);w.items=[];w.spawn('virus',p.cells[0].x,p.cells[0].y);w.roundEnd=w.time+3000;w.step(.001);assert.equal(p.cells.length,25);assert.equal(p.score,25250);
});
