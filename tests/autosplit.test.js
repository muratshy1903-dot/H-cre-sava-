import test from 'node:test';import assert from 'node:assert/strict';import {World,radius,AUTO_SPLIT_MASS} from '../dist/engine.js';
const isolated=()=>{const w=new World('FFA-1',{now:1000});w.items=[];w.spawn=()=>{};return w};
test('220k auto split affects only eligible cells, conserves purchased mass and stays inside 25 parts',()=>{
 const w=isolated(),p=w.addPlayer('p',{gold:1000000});p.cells=[w.cell(p,219900,4250,4250),w.cell(p,100,5000,4250)];p.aim={x:8000,y:4250};const small=p.cells[1].id;
 w.gold(p,'big');assert.equal(p.cells.length,3);assert.ok(p.cells.some(c=>c.id===small));assert.equal(p.gold,999900);assert.equal(w.prize,50100);assert.ok(Math.abs(p.cells.reduce((n,c)=>n+c.mass,0)-220250)<1e-6);assert.ok(p.cells.every(c=>c.mass<AUTO_SPLIT_MASS));
 const cells=p.cells.slice(0);w.command('p',{type:'hold',kind:'boost'});assert.equal(w.snapshot('p').self.goldBoostMultiplier,5);w.boost={gold:7,feedMs:90,splitMs:80,until:0};assert.equal(w.snapshot('p').self.goldBoostMultiplier,35);w.command('p',{type:'hold',kind:''});assert.equal(w.snapshot('p').self.goldBoostMultiplier,7);
 const before=p.score,added=w.addMass(p,5500000);assert.equal(added,5500000-before);assert.equal(p.score,5500000);assert.equal(p.cells.length,25);assert.ok(p.cells.every(c=>c.mass<=220084));assert.equal(w.addMass(p,1),0);assert.equal(w.gold(p,'big'),false);
});
test('fresh split fragments are visibly separated and manual cooldown does not block automatic splitting',()=>{
 const w=isolated(),p=w.addPlayer('p');p.cells[0].mass=1000;p.cells[0].x=p.cells[0].y=4250;p.aim={x:8000,y:4250};w.split(p);const [a,b]=p.cells;assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>radius(a.mass)+radius(b.mass));
 a.mass=220000;const before=p.cells.length;w.autoSplit(p);assert.equal(p.cells.length,before+1);assert.equal(p.lastSplit,w.time);assert.ok(p.cells.every(c=>Number.isFinite(c.x)&&Number.isFinite(c.y)));
});
test('25 coincident fragments separate while parked and while moving; no permanent pile-up',()=>{
 for(const aim of [{x:4250,y:4250},{x:8000,y:4250}]){const w=isolated(),p=w.addPlayer('p');p.cells=Array.from({length:25},()=>w.cell(p,100,4250,4250));p.aim=aim;for(let tick=0;tick<40;tick++)w.step(.05);assert.equal(p.cells.length,25);assert.equal(p.score,2500);for(let a=0;a<p.cells.length;a++)for(let b=a+1;b<p.cells.length;b++)assert.ok(Math.hypot(p.cells[a].x-p.cells[b].x,p.cells[a].y-p.cells[b].y)>.98*(radius(p.cells[a].mass)+radius(p.cells[b].mass)));}
});

test('displayed Gold Boost multiplier matches actual server spending rate',()=>{const normal=isolated(),boost=isolated(),a=normal.addPlayer('p',{gold:100000}),b=boost.addPlayer('p',{gold:100000});normal.command('p',{type:'hold',kind:'big'});boost.command('p',{type:'hold',kind:'boost'});for(let i=0;i<10;i++){normal.step(.05);boost.step(.05)}assert.equal(100000-b.gold,5*(100000-a.gold));assert.equal(boost.snapshot('p').self.goldBoostMultiplier,5);});
