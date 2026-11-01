import test from 'node:test';import assert from 'node:assert/strict';
import {playerTextColor,playerRelation,PLAYER_COLORS,cameraTarget} from '../dist/player-relations.js';
import {World} from '../dist/engine.js';
import {MotionSmoother} from '../dist/smoothing.js';
test('self/team/clan/other priority is correct, empty tags never imply membership',()=>{
 const self={id:'me',team:'T',clanId:42};
 assert.equal(playerTextColor(self,self,true),PLAYER_COLORS.self);assert.equal(playerTextColor(self,self),PLAYER_COLORS.other);
 assert.equal(playerRelation({id:'both',team:'T',clanId:42},self),'team');assert.equal(playerTextColor({id:'both',team:'T',clanId:42},self),PLAYER_COLORS.team);
 assert.equal(playerRelation({id:'clan',team:'other',clanId:42},self),'clan');assert.equal(playerTextColor({id:'clan',clanId:42},self),PLAYER_COLORS.clan);
 assert.equal(playerRelation({id:'other',team:'',clanId:null},{id:'me',team:'',clanId:null}),'other');
 const w=new World(),a=w.addPlayer('a',{team:'T',clanId:42}),b=w.addPlayer('b',{team:'T',clanId:42});b.cells[0].x=8000;
 const snap=w.snapshot('a',{w:400,h:300});assert.equal(snap.self.team,'T');assert.equal(snap.self.clanId,42);assert.equal(snap.ranking.find(p=>p.id==='b').clanId,42);assert.equal(snap.ranking.find(p=>p.id==='b').team,'T');
});
test('camera follows weighted player centre and selected spectator target, never fixed map centre',()=>{
 const player={id:'a',cells:[{x:1000,y:2000,mass:100},{x:2000,y:3000,mass:300}]},other={id:'b',cells:[{x:7000,y:6000,mass:100}]},snap={size:8500,players:[player,other],following:{id:'b'}};
 assert.deepEqual(cameraTarget(snap,'a'),{x:1750,y:2750,mass:400});assert.deepEqual(cameraTarget(snap,'spectator'),{x:7000,y:6000,mass:100});
 player.cells.forEach(c=>c.x+=500);assert.equal(cameraTarget(snap,'a').x,2250);
});
test('fed viruses fire in pellet direction and travel, including pure vertical feeds',()=>{
 for(const [vx,vy] of [[1000,0],[0,1000],[-1000,0],[0,-1000]]){
  const w=new World();w.items=[];const v=w.spawn('virus',4250,4250);
  for(let i=0;i<7;i++)w.spawn('eject',4250-vx/100,4250-vy/100,{vx,vy});w.step(.001);
  const child=w.items.find(x=>x.type==='virus'&&x.id!==v.id);assert.ok(child);const x=child.x,y=child.y;
  assert.ok(Math.abs(child.vx-vx/1000*1400)<1e-6);assert.ok(Math.abs(child.vy-vy/1000*1400)<1e-6);
  w.step(.05);assert.ok(Math.hypot(child.x-x,child.y-y)>50);assert.equal(v.x,4250);assert.equal(v.y,4250);
 }
});
test('virus projectiles interpolate instead of jumping between network snapshots',()=>{
 const smoother=new MotionSmoother(100),frame=x=>({players:[],items:[{id:1,type:'virus',x,y:100,mass:150}]});smoother.push(frame(100),0);smoother.push(frame(200),100);assert.equal(smoother.sample(150).items[0].x,150);
});
