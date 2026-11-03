import test from 'node:test';
import assert from 'node:assert/strict';
import {World,VIRUS_FEED_COUNT,VIRUS_RADIUS,VIRUS_LAUNCH_DISTANCE} from '../dist/engine.js';

test('four absorbed pellets do not spawn a virus; fifth spawns and resets the parent',()=>{
 const w=new World('FFA-1',{now:1000});w.items=[];w.replenishVirus=()=>false;
 const parent=w.spawn('virus',4250,4250);
 const hit=()=>{w.spawn('eject',parent.x-20,parent.y,{vx:100});w.step(.001)};
 assert.equal(VIRUS_FEED_COUNT,5);
 for(let n=1;n<=4;n++){hit();assert.equal(w.items.filter(v=>v.type==='virus').length,1);assert.equal(parent.fed,n)}
 hit();assert.equal(w.items.filter(v=>v.type==='virus').length,2);assert.equal(parent.fed,0);
});

test('launch settles at 2.5 diameters regardless of frame size or direction',()=>{
 for(const dt of [.01,.05,.1])for(const [dx,dy] of [[1,0],[0,-1],[.6,.8]]){
  const w=new World('FFA-1',{now:1000});w.items=[];w.replenishVirus=()=>false;
  const parent=w.spawn('virus',4250,4250);
  for(let n=0;n<5;n++)w.spawn('eject',4230,4250,{vx:dx*100,vy:dy*100});w.step(.001);
  const child=w.items.find(v=>v.type==='virus'&&v!==parent);
  assert.ok(child);
  for(let t=0;t<1.5;t+=dt)w.step(dt);
  assert.ok(Math.abs(Math.hypot(child.x-parent.x,child.y-parent.y)-VIRUS_LAUNCH_DISTANCE)<1e-6);
  assert.equal(VIRUS_LAUNCH_DISTANCE,2.5*2*VIRUS_RADIUS);
  assert.equal(child.vx,0);assert.equal(child.vy,0);
  const end={x:child.x,y:child.y};w.step(.1);assert.equal(child.x,end.x);assert.equal(child.y,end.y);
 }
});
