import test from 'node:test';
import assert from 'node:assert/strict';
import {MotionSmoother} from '../dist/smoothing.js';
const snap=(x,ids=['c'])=>({players:[{id:'p',cells:ids.map(id=>({id,x,y:0,mass:100}))}],items:[],self:{score:100}});
test('network positions move continuously, stay authoritative and stop at target',()=>{
 const s=new MotionSmoother(60),a=snap(0),b=snap(60);
 s.push(a,0);s.push(b,100);
 assert.equal(s.sample(130).players[0].cells[0].x,30);
 assert.equal(b.players[0].cells[0].x,60);
 assert.equal(s.sample(200).players[0].cells[0].x,60);
 s.push(snap(120),200);assert.equal(s.sample(230).players[0].cells[0].x,90);
});
test('split, death, respawn and room reset leave no ghost cells',()=>{
 const s=new MotionSmoother();s.push(snap(0),0);s.push(snap(10,['new']),50);
 assert.equal(s.sample(70).players[0].cells.length,1);
 assert.equal(s.sample(70).players[0].cells[0].id,'new');
 s.push(snap(20,[]),100);assert.equal(s.sample(120).players[0].cells.length,0);
 s.reset();assert.equal(s.sample(200),null);
 s.push(snap(5000),250);assert.equal(s.sample(250).players[0].cells[0].x,5000);
});
