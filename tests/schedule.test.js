import test from 'node:test';import assert from 'node:assert/strict';
import {World,ROOMS,roomTiming,ROOM_CYCLE_MS} from '../dist/engine.js';
test('87 room clocks advance without players and preserve ordered stagger across restart',()=>{
 const hour=Date.UTC(2026,9,29,10),at=hour+1;
 const ends=ROOMS.filter(r=>r.mode!=='boost').map(r=>roomTiming(r.id,at).endsAt);
 assert.equal(new Set(ends).size,87);
 for(let i=1;i<87;i++){
  // FFA-1 is the next hourly boundary; other rooms in the current hour finish first.
  if(i>1)assert.ok(ends[i]>ends[i-1]);
 }
 const firstEnd=roomTiming('FFA-1',hour-1).endsAt;
 assert.equal(firstEnd,hour);
 assert.ok(roomTiming('FFA-2',hour).timeLeft<=42);
 for(const r of ROOMS){const before=roomTiming(r.id,at),later=roomTiming(r.id,at+10000);assert.equal(later.endsAt,before.endsAt);assert.equal(later.timeLeft,before.timeLeft-10);assert.equal(roomTiming(r.id,at+ROOM_CYCLE_MS).endsAt,before.endsAt+ROOM_CYCLE_MS);}
 const a=new World('FFA-8',{now:at,continuous:true});
 const b=new World('FFA-8',{now:at+10000,continuous:true});
 assert.equal(a.roundEnd,b.roundEnd);
});
test('online round pays once on wall-clock expiry and keeps fixed schedule after delayed tick',()=>{
 const end=roomTiming('FFA-3',Date.UTC(2026,9,29,10)).endsAt;
 const w=new World('FFA-3',{now:end-100,continuous:true});
 const p=w.addPlayer('p',{gold:0});p.cells[0].mass=200;
 w.step(.05,end+1000);
 assert.equal(w.events.filter(e=>e.type==='round').length,1);
 assert.equal(p.gold,50000);
 assert.equal(w.roundEnd,end+ROOM_CYCLE_MS);
 w.step(.05,end+1050);assert.equal(w.events.filter(e=>e.type==='round').length,0);assert.equal(p.gold,50000);
});
