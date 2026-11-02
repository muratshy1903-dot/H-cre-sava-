import test from 'node:test';
import assert from 'node:assert/strict';
import {detectMobile} from '../dist/device.js';
import {translateText} from '../dist/i18n.js';
import {World} from '../dist/engine.js';
import {once} from 'node:events';
import {mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import WebSocket from 'ws';

test('language selection translates core labels and dynamic score labels without rewriting player data',()=>{
 for(const [code,play,score] of [['en','Play','Score'],['es','Jugar','Puntuación'],['de','Spielen','Punkte'],['ru','Играть','Счёт']]){
  assert.equal(translateText('Oyna',code),play);assert.equal(translateText('Skor: 1.234',code),score+': 1.234');assert.notEqual(translateText('Skin Galerisi',code),'Skin Galerisi');
  assert.equal(translateText('27 SEFİRİ',code),'27 SEFİRİ');assert.equal(translateText('FFA-77',code),'FFA-77');
 }
 assert.equal(translateText('Oyna','tr'),'Oyna');assert.equal(translateText('Oyna','invalid'),'Oyna');
});
test('mobile detection includes Android, iOS and iPad desktop mode while desktop touch alone is not a phone',()=>{
 assert.equal(detectMobile({userAgent:'Mozilla Android'}),true);assert.equal(detectMobile({userAgent:'iPhone'}),true);assert.equal(detectMobile({platform:'MacIntel',maxTouchPoints:5}),true);
 assert.equal(detectMobile({userAgentData:{mobile:true}}),true);assert.equal(detectMobile({platform:'Win32',maxTouchPoints:10}),false);assert.equal(detectMobile({userAgent:'Mozilla Windows NT'}),false);
});
test('a natural pellet awards ten score and 25-cell virus farming preserves cell count and awards current configured hundred mass',()=>{
 const w=new World('FFA-1',{now:10000}),p=w.addPlayer('p');w.items=[];const c=p.cells[0];p.aim={x:c.x,y:c.y};w.spawn('food',c.x,c.y);w.step(.001);assert.equal(p.score,110);
 p.cells=Array.from({length:25},(_,i)=>w.cell(p,1000,500+i%5*1400,500+Math.floor(i/5)*1400));w.items=[];p.aim=w.center(p);w.spawn('virus',p.cells[0].x,p.cells[0].y);const before=p.cells.reduce((n,c)=>n+c.mass,0);w.step(.001);const after=p.cells.reduce((n,c)=>n+c.mass,0);assert.equal(p.cells.length,25);assert.ok(after-before>99&&after-before<=100);
});
test('mobile hint reaches other players, spectators and room transitions through real WebSocket state',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'agarm-device-'));process.env.AGARM_DATA=dir;
 const {startServer}=await import('../server/index.js');const server=startServer({port:0});await once(server,'listening');const base='http://127.0.0.1:'+server.address().port,sockets=[];
 const connect=async ua=>{const ws=new WebSocket(base.replace('http:','ws:')+'/ws',{headers:{Origin:base,'User-Agent':ua}});sockets.push(ws);await once(ws,'open');return ws};
 const state=(ws,check)=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>{ws.off('message',listen);reject(Error('state timeout'))},4000);function listen(raw){const p=JSON.parse(raw);if(p.type==='state'&&check(p)){clearTimeout(timer);ws.off('message',listen);resolve(p)}}ws.on('message',listen)});
 try{
  const phone=await connect('Mozilla Android'),desktop=await connect('Mozilla Windows NT');
  const observed=state(desktop,p=>p.ranking.some(x=>x.name==='Phone'));
  phone.send(JSON.stringify({type:'join',name:'Phone',room:'FFA-1'}));desktop.send(JSON.stringify({type:'join',name:'Desktop',room:'FFA-1'}));
  const snap=await observed;assert.equal(snap.ranking.find(p=>p.name==='Phone').mobile,true);assert.equal(snap.ranking.find(p=>p.name==='Desktop').mobile,false);
  const moved=state(phone,p=>p.room==='FFA-2'&&p.ranking.some(x=>x.name==='Phone'&&x.mobile));phone.send(JSON.stringify({type:'join',name:'Phone',room:'FFA-2'}));const movedSnap=await moved;assert.equal(movedSnap.players.find(p=>p.name==='Phone').mobile,true);const spectator=state(desktop,p=>p.room==='FFA-2'&&p.ranking.some(x=>x.name==='Phone'&&x.mobile));desktop.send(JSON.stringify({type:'join',room:'FFA-2',name:'Desktop',spectator:true}));await spectator;
 }finally{for(const ws of sockets)ws.terminate();await new Promise(r=>server.shutdown(r));await rm(dir,{recursive:true,force:true})}
});
