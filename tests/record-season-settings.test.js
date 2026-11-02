import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {activeRecordNotice,RECORD_NOTICE_MS} from '../dist/announcements.js';
import {createRoomResults} from '../server/room-results.js';
import {createSeasonChampions} from '../server/season-champions.js';
import {SEASON_ANCHOR,SEASON_LENGTH,seasonMeta} from '../dist/season.js';
import {catalogSkin,SKIN_CATALOG} from '../dist/skin-catalog.js';
import {World} from '../dist/engine.js';

test('new record replaces the global 60-minute notice; ordinary winners do not restart it; restart preserves expiry',()=>{
 const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE room_history(room TEXT,winner_name TEXT,winner_score INTEGER,highest_score INTEGER,at INTEGER)');const r=createRoomResults(db),w={room:'FFA-1'};
 r.finish(w,{winner:{name:'First',score:1000}},1000);const first=r.recordNotice(1000);assert.equal(first.expiresAt,1000+RECORD_NOTICE_MS);
 r.finish(w,{winner:{name:'Lower',score:500}},100000);assert.equal(r.recordNotice(100000).name,'First');assert.equal(r.recordNotice(100000).expiresAt,first.expiresAt);
 r.finish({room:'FFA-2'},{winner:{name:'Second',score:2000}},200000);assert.equal(r.recordNotice(200000).name,'Second');assert.equal(r.recordNotice(200000).expiresAt,200000+RECORD_NOTICE_MS);
 const restored=createRoomResults(db);assert.equal(restored.recordNotice(200000+RECORD_NOTICE_MS-1).name,'Second');assert.equal(restored.recordNotice(200000+RECORD_NOTICE_MS),null);assert.equal(activeRecordNotice({isRecord:false,at:1},2),null);db.close();
});

test('30-day season winners use that season wins, persist titles, include season number and expire entry notice',()=>{
 const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE records(id INTEGER PRIMARY KEY,account_id INTEGER,at INTEGER);CREATE TABLE accounts(id INTEGER PRIMARY KEY,profile TEXT)');
 for(const [id,name] of [[1,'One'],[2,'Two']])db.prepare('INSERT INTO accounts VALUES(?,?)').run(id,JSON.stringify({name}));const win=(id,at)=>db.prepare('INSERT INTO records(account_id,at) VALUES(?,?)').run(id,at);
 win(1,SEASON_ANCHOR+10);win(1,SEASON_ANCHOR+20);win(2,SEASON_ANCHOR+30);
 const s2=SEASON_ANCHOR+SEASON_LENGTH;win(2,s2);win(2,s2+30);win(1,s2+20);const s3=s2+SEASON_LENGTH;
 const seasons=createSeasonChampions(db);assert.equal(seasonMeta(s2).number,2);assert.equal(SEASON_LENGTH,30*86400000);assert.equal(seasons.entry(1,'One',s2).text,'One · 1. Sezon en iyisi');assert.equal(seasons.entry(1,'One',s2).expiresAt,s2+12000);assert.equal(seasons.entry(2,'Two',s2),null);assert.deepEqual(seasons.rankings(s2+100).map(x=>[x.id,x.wins]),[[2,2],[1,1]]);
 assert.equal(seasons.entry(2,'New name',s3).text,'New name · 2. Sezon en iyisi');assert.equal(seasons.status(s3).champions[0].account_id,2);
 const restored=createSeasonChampions(db);assert.equal(restored.entry(1,'One',s3).text,'One · 1. Sezon en iyisi');assert.equal(restored.status(s3).endsAt,s3+SEASON_LENGTH);db.close();
});

test('Agarm skin names/codes retain old AgarZ codes as aliases; Gold prize switch preserves MMA isolation',()=>{
 const skins=SKIN_CATALOG.filter(x=>x.category==='Agarm');assert.equal(skins.length,29);assert.ok(skins.every(x=>x.id.startsWith('agarm')&&x.name.startsWith('agarm')));assert.equal(catalogSkin('agarz1'),catalogSkin('agarm1'));
 const w=new World('FFA-1',{now:1000}),p=w.addPlayer('p',{gold:1000});w.items=[];w.goldToPrize=false;w.gold(p,'big');assert.equal(w.prize,50000);w.time+=50;w.goldToPrize=true;w.gold(p,'big');assert.equal(w.prize,50100);
 const mma=new World('MMA-1',{now:1000}),m=mma.addPlayer('m');mma.goldToPrize=true;mma.gold(m,'big');assert.equal(mma.prize,50000);
});
