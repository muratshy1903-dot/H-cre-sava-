import {seasonMeta,SEASON_ANCHOR,SEASON_LENGTH} from '../dist/season.js';
export function createSeasonChampions(db){
 db.exec(`CREATE TABLE IF NOT EXISTS season_champions(season INTEGER PRIMARY KEY,account_id INTEGER,name TEXT,wins INTEGER NOT NULL,starts_at INTEGER NOT NULL,ends_at INTEGER NOT NULL);
 CREATE INDEX IF NOT EXISTS records_season_wins ON records(at,account_id);`);
 let synced=0,titles=new Map();
 const leaders=(start,end)=>db.prepare(`SELECT r.account_id id,COUNT(*) wins,MAX(r.at) last_win,json_extract(a.profile,'$.name') name FROM records r JOIN accounts a ON a.id=r.account_id WHERE r.at>=? AND r.at<? GROUP BY r.account_id ORDER BY wins DESC,last_win ASC,r.account_id ASC`).all(start,end);
 function sync(now=Date.now()){
  const meta=seasonMeta(now);if(synced===meta.number)return meta;
  for(let n=1;n<meta.number;n++)if(!db.prepare('SELECT season FROM season_champions WHERE season=?').get(n)){
   const start=SEASON_ANCHOR+(n-1)*SEASON_LENGTH,end=start+SEASON_LENGTH,winner=leaders(start,end)[0];
   db.prepare('INSERT INTO season_champions(season,account_id,name,wins,starts_at,ends_at) VALUES(?,?,?,?,?,?)').run(n,winner?.id||null,winner?.name||null,winner?.wins||0,start,end);
  }
  titles=new Map();for(const c of db.prepare('SELECT * FROM season_champions WHERE account_id IS NOT NULL ORDER BY season').all()){if(!titles.has(c.account_id))titles.set(c.account_id,[]);titles.get(c.account_id).push(c.season)}synced=meta.number;return meta;
 }
 function entry(accountId,name,now=Date.now()){sync(now);const seasons=titles.get(accountId);return seasons?.length?{text:name+' · '+seasons.map(n=>n+'. Sezon en iyisi').join(' · '),at:now,expiresAt:now+12000}:null}
 return {sync,entry,rankings(now=Date.now()){const m=sync(now);return leaders(m.startsAt,m.endsAt)},status(now=Date.now()){return {...sync(now),serverNow:now,durationDays:30,champions:db.prepare('SELECT season,account_id,name,wins FROM season_champions WHERE account_id IS NOT NULL ORDER BY season DESC').all()}},clear(){synced=0;titles.clear()}};
}
