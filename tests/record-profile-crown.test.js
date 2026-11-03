import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createRecordAssets} from '../server/record-assets.js';
import {isRoomRecordHolder} from '../dist/record-crown.js';
import {profilePage} from '../dist/profile.js';

test('all current room records use canonical account ownership, exclude old/tied/lost records and follow transfers',()=>{
 const db=new DatabaseSync(':memory:');
 db.exec('CREATE TABLE records(id INTEGER PRIMARY KEY,account_id INTEGER,room TEXT,name TEXT,score INTEGER,at INTEGER);CREATE TABLE room_records(room TEXT PRIMARY KEY,name TEXT,score INTEGER,at INTEGER);CREATE TABLE record_assets(record_id INTEGER PRIMARY KEY,owner INTEGER,display_name TEXT);');
 const add=db.prepare('INSERT INTO records VALUES(?,?,?,?,?,?)');
 add.run(1,1,'FFA-1','Same name',1000,1);add.run(2,2,'FFA-1','Same name',1000,2);add.run(3,1,'FFA-2','Owner',2000,3);add.run(4,1,'FFA-3','Old',1000,4);add.run(5,2,'FFA-3','New',3000,5);
 db.prepare('INSERT INTO room_records VALUES(?,?,?,?)').run('FFA-4','Guest',5000,6);add.run(6,1,'FFA-4','Old',1000,6);
 const assets=createRecordAssets({db,account:()=>null,fail:message=>{throw Error(message)}});
 assert.deepEqual(assets.currentForOwner({id:1}).map(r=>r.room),['FFA-2','FFA-1']);
 assert.deepEqual(assets.currentForOwner({id:2}).map(r=>r.room),['FFA-3']);
 let record=assets.currentForOwner({id:1}).find(r=>r.room==='FFA-1');
 assert.equal(isRoomRecordHolder(record,{id:'u1'},'FFA-1'),true);
 assert.equal(isRoomRecordHolder(record,{id:'u2',name:'Same name'},'FFA-1'),false);
 assert.equal(isRoomRecordHolder(record,{id:'u1'},'FFA-2'),false);
 assert.equal(isRoomRecordHolder(record,{id:'g1',name:'Same name'},'FFA-1'),false);
 db.prepare('INSERT INTO record_assets VALUES(?,?,?)').run(1,2,'Renamed');
 assert.deepEqual(assets.currentForOwner({id:1}).map(r=>r.room),['FFA-2']);
 record=assets.currentForOwner({id:2}).find(r=>r.room==='FFA-1');assert.equal(record.name,'Renamed');
 assert.equal(isRoomRecordHolder(record,{id:'u2'},'FFA-1'),true);assert.equal(isRoomRecordHolder(record,{id:'u1'},'FFA-1'),false);db.close();
});

test('profile renders every supplied current record, including rooms absent from the current room menu',async()=>{
 const records=Array.from({length:110},(_,i)=>({id:i+1,room:'ODA-'+i,name:'Owner',score:1000+i}));
 const html=await profilePage({S:{online:true,profile:{id:1,name:'Owner',skins:[],following:[],favorites:[],names:[],inventory:[],gold:0,bonus:0}},api:async route=>route==='profile-records'?records:[],esc:String,fmt:String,form:()=>'',input:()=>'',modeNotice:()=>'',skinGrid:()=>'',uploadPanel:async()=>'',featurePage:async()=>'',getList:async()=>[]});
 assert.equal((html.match(/class="reference-trophy"/g)||[]).length,110);assert.match(html,/ODA-109 rekortmen/);assert.match(html,/Rekorlarım \(110\)/);
});
