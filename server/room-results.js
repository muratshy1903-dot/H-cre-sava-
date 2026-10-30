export function createRoomResults(db){
 db.exec(`CREATE TABLE IF NOT EXISTS room_records(room TEXT PRIMARY KEY,name TEXT NOT NULL,score INTEGER NOT NULL,at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS round_announcements(id INTEGER PRIMARY KEY AUTOINCREMENT,room TEXT NOT NULL,name TEXT NOT NULL,score INTEGER NOT NULL,is_record INTEGER NOT NULL DEFAULT 0,record_score INTEGER NOT NULL DEFAULT 0,at INTEGER NOT NULL);`);
 const records=new Map(db.prepare('SELECT * FROM room_records').all().map(r=>[r.room,r])),winners=new Map(db.prepare('SELECT * FROM room_history').all().map(r=>[r.room,{name:r.winner_name,score:r.winner_score,at:r.at}])),dirty=new Set();
 for(const r of db.prepare('SELECT * FROM room_history').all())if(!records.has(r.room)&&r.highest_score)records.set(r.room,{room:r.room,name:r.highest_score===r.winner_score?r.winner_name:'Önceki rekor',score:r.highest_score,at:r.at});
 const decode=r=>r?{room:r.room,name:r.name,score:r.score,isRecord:!!r.is_record,recordScore:r.record_score,at:r.at}:null;
 let latest=decode(db.prepare('SELECT * FROM round_announcements ORDER BY id DESC LIMIT 1').get());
 if(!latest){const r=db.prepare('SELECT * FROM room_history ORDER BY at DESC LIMIT 1').get();if(r)latest={room:r.room,name:r.winner_name,score:r.winner_score,isRecord:false,recordScore:r.highest_score,at:r.at};}
 function hydrate(w){const r=records.get(w.room);if(r){w.peak=r.score;w.finishedRecord=r.score;w.peakName=r.name;w.peakAt=r.at;}w.roundRecord=false;}
 function observe(w){}
 function flush(){for(const id of dirty){const r=records.get(id);db.prepare('INSERT INTO room_records(room,name,score,at) VALUES(?,?,?,?) ON CONFLICT(room) DO UPDATE SET name=excluded.name,score=excluded.score,at=excluded.at').run(r.room,r.name,r.score,r.at);}dirty.clear();}
 function finish(w,e,now=Date.now()){
  const previous=records.get(w.room),isRecord=e.winner.score>(previous?.score||0);if(isRecord){records.set(w.room,{room:w.room,name:e.winner.name,score:e.winner.score,at:now});dirty.add(w.room);}const record=records.get(w.room);latest={room:w.room,name:e.winner.name,score:e.winner.score,isRecord,recordScore:record?.score||e.winner.score,at:now};winners.set(w.room,{name:e.winner.name,score:e.winner.score,at:now});
  db.prepare('INSERT INTO round_announcements(room,name,score,is_record,record_score,at) VALUES(?,?,?,?,?,?)').run(latest.room,latest.name,latest.score,latest.isRecord?1:0,latest.recordScore,now);db.exec('DELETE FROM round_announcements WHERE id NOT IN (SELECT id FROM round_announcements ORDER BY id DESC LIMIT 1000)');flush();
 }
 return {hydrate,observe,flush,finish,record:id=>records.get(id)||null,winner:id=>winners.get(id)||null,get latest(){return latest},clear(){records.clear();winners.clear();dirty.clear();latest=null}};
}
