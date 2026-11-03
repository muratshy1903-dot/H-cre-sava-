import test from 'node:test';
import assert from 'node:assert/strict';
import {World,VIRUS_BURST_MASS} from '../dist/engine.js';

test('335 threshold is inclusive and applies per cell before the virus reward',()=>{
 assert.equal(VIRUS_BURST_MASS,335);
 for(const [mass,bursts] of [[334.99,false],[335.01,true]]){
  const w=new World('FFA-1',{now:1000}),p=w.addPlayer('p');w.items=[];
  const c=p.cells[0];c.x=c.y=4250;c.mass=mass;p.aim={x:4250,y:4250};
  w.spawn('virus',4250,4250);w.step(.001);
  assert.equal(p.cells.length>1,bursts);
  assert.equal(w.items.some(v=>v.type==='virus'),!bursts);
 }
 const w=new World('FFA-1',{now:1000}),p=w.addPlayer('p');
 p.cells[0].mass=334.999;w.burst(p,p.cells[0]);assert.equal(p.cells.length,1);
 p.cells[0].mass=335;w.burst(p,p.cells[0]);assert.ok(p.cells.length>1);
 const q=w.addPlayer('q');q.cells=[w.cell(q,200,1000,1000),w.cell(q,200,2000,2000)];
 w.items=[];w.spawn('virus',1000,1000);q.aim=w.center(q);w.step(.001);
 assert.equal(q.cells.length,2);assert.ok(w.items.some(v=>v.type==='virus'));
});
