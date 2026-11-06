import {randomInt} from 'node:crypto';
import {CRYSTALS,CRYSTAL_BETS,CRYSTAL_RULES,CRYSTAL_MULTIPLIERS,crystalPayRate} from '../dist/crystal-rules.js';

export function crystalRound(bet,{random=randomInt,free=false,featureMultiplier=0,cap=bet*CRYSTAL_RULES.maxPayoutRate,capture=true}={}) {
  const draw=()=>{
    let n=random(100);
    for(let i=0;i<CRYSTALS.length;i++){n-=CRYSTALS[i].weight;if(n<0)return i;}
    let m=random(1000);
    for(const orb of CRYSTAL_MULTIPLIERS){m-=orb.weight;if(m<0)return 1000+orb.value;}
    throw Error('Invalid random draw');
  };
  let grid=Array.from({length:30},draw),base=0,tumbles=0,payout=0,multiplier=1,orbTotal=0,stars=0;
  const frames=[];
  // No arbitrary tumble limit: matching symbols fall until the board settles or the feature cap is reached.
  for(;;){
    const counts=new Array(CRYSTALS.length).fill(0);orbTotal=0;
    for(const id of grid){if(id>=1000)orbTotal+=id-1000;else counts[id]++;}
    const winning=new Array(CRYSTALS.length).fill(false);let win=0,matched=false;
    for(let i=0;i<CRYSTALS.length;i++)if(CRYSTALS[i].rate&&counts[i]>=8){winning[i]=true;matched=true;win+=Math.floor(bet*crystalPayRate(CRYSTALS[i],counts[i]));}
    base+=win;stars=counts[CRYSTALS.length-1];
    // The accumulated bonus multiplier applies when a new orb lands on a winning free spin.
    const activeMultiplier=orbTotal>0?(free?featureMultiplier+orbTotal:orbTotal):1;
    multiplier=base>0?Math.max(1,activeMultiplier):1;
    const scatterWin=bet*(stars>=6?100:stars===5?5:stars===4?3:0);
    payout=Math.min(cap,base*multiplier+scatterWin);
    if(capture)frames.push({grid:grid.map(id=>id>=1000?'orb-'+(id-1000):CRYSTALS[id].id),cleared:grid.flatMap((id,index)=>winning[id]?[index]:[]),win,total:base,multiplier});
    if(!matched||payout>=cap)break;
    tumbles++;
    const next=new Array(30);
    for(let col=0;col<6;col++){
      const remaining=[];
      for(let row=0;row<5;row++){const id=grid[row*6+col];if(!winning[id])remaining.push(id);}
      const empty=5-remaining.length;
      for(let row=0;row<empty;row++)next[row*6+col]=draw();
      for(let row=0;row<remaining.length;row++)next[(row+empty)*6+col]=remaining[row];
    }
    grid=next;
  }
  const nextMultiplier=free&&base>0?featureMultiplier+orbTotal:featureMultiplier;
  const bonusAwarded=free?(stars>=3?5:0):(stars>=4?15:0);
  const scatterPayout=Math.min(Math.max(0,cap-base*multiplier),bet*(stars>=6?100:stars===5?5:stars===4?3:0));
  return {frames,tumbles,base,multiplier,orbTotal,payout,scatterPayout,bonusAwarded,featureMultiplier:nextMultiplier,capped:payout>=cap};
}

export function createCrystalGame({db,atomic,save,spend,fail,json,mePublic,now=Date.now,round=crystalRound}){
  db.exec(`CREATE TABLE IF NOT EXISTS crystal_rounds(
    id INTEGER PRIMARY KEY AUTOINCREMENT,account_id INTEGER NOT NULL REFERENCES accounts(id),
    request_id TEXT NOT NULL,wallet TEXT NOT NULL,bet INTEGER NOT NULL,at INTEGER NOT NULL,result TEXT NOT NULL,
    UNIQUE(account_id,request_id));
    CREATE INDEX IF NOT EXISTS crystal_history ON crystal_rounds(account_id,id DESC);
    CREATE TABLE IF NOT EXISTS crystal_bonus(account_id INTEGER PRIMARY KEY REFERENCES accounts(id),wallet TEXT NOT NULL,bet INTEGER NOT NULL,remaining INTEGER NOT NULL);`);
  const columns=new Set(db.prepare('PRAGMA table_info(crystal_bonus)').all().map(c=>c.name));
  for(const [name,definition] of [['multiplier','INTEGER NOT NULL DEFAULT 0'],['won','INTEGER NOT NULL DEFAULT 0'],['version','INTEGER NOT NULL DEFAULT 1']])if(!columns.has(name))db.exec('ALTER TABLE crystal_bonus ADD COLUMN '+name+' '+definition);
  const bonus=p=>db.prepare('SELECT wallet,bet,remaining,multiplier,won,version FROM crystal_bonus WHERE account_id=? AND remaining>0').get(p.id)||null;
  const history=p=>db.prepare('SELECT result FROM crystal_rounds WHERE account_id=? ORDER BY id DESC LIMIT 20').all(p.id).map(r=>JSON.parse(r.result));
  function route(req,res,url,p,data){
    if(url.pathname!=='/api/crystal')return false;
    if(!p)fail('Mini oyun için hesabına giriş yapmalısın.',401);
    if(req.method==='GET'){json(res,200,{user:mePublic(p),bonus:bonus(p),history:history(p)});return true;}
    if(req.method!=='POST')fail('Yöntem desteklenmiyor',405);
    const {requestId,wallet,bet}=data;
    if(typeof requestId!=='string'||!/^[a-zA-Z0-9-]{16,64}$/.test(requestId))fail('Geçersiz tur kimliği');
    if(!['gold','bonus'].includes(wallet)||!CRYSTAL_BETS.includes(bet))fail('Geçerli bir bakiye ve tur bedeli seç.');
    const result=atomic(()=>{
      const existing=db.prepare('SELECT result,wallet,bet FROM crystal_rounds WHERE account_id=? AND request_id=?').get(p.id,requestId);
      if(existing){if(existing.wallet!==wallet||existing.bet!==bet)fail('Bu tur kimliği farklı bir işlem için kullanıldı.',409);return JSON.parse(existing.result);}
      const at=now(),last=db.prepare('SELECT at FROM crystal_rounds WHERE account_id=? ORDER BY id DESC LIMIT 1').get(p.id);
      if(last&&at-last.at<900)fail('Sonraki tur için bir saniye bekle.',429);
      const feature=bonus(p),free=!!feature;
      if(feature&&(feature.wallet!==wallet||feature.bet!==bet))fail('Bonus turlarını başladığın bakiye ve bedelle tamamla.');
      if(!free)spend(p,bet,wallet);
      const cap=bet*CRYSTAL_RULES.maxPayoutRate-(feature?.won||0);
      const outcome=round(bet,{free,featureMultiplier:feature?.multiplier||0,cap});
      const won=(feature?.won||0)+outcome.payout;
      if(!Number.isSafeInteger(p[wallet])||!Number.isSafeInteger(p[wallet]+outcome.payout))fail('Bakiye sınırına ulaşıldı.');
      p[wallet]+=outcome.payout;
      const remaining=outcome.capped?0:(free?feature.remaining-1:0)+outcome.bonusAwarded;
      if(remaining>0)db.prepare('INSERT INTO crystal_bonus(account_id,wallet,bet,remaining,multiplier,won,version) VALUES(?,?,?,?,?,?,?) ON CONFLICT(account_id) DO UPDATE SET wallet=excluded.wallet,bet=excluded.bet,remaining=excluded.remaining,multiplier=excluded.multiplier,won=excluded.won,version=excluded.version').run(p.id,wallet,bet,remaining,outcome.featureMultiplier||0,won,CRYSTAL_RULES.version);
      else db.prepare('DELETE FROM crystal_bonus WHERE account_id=?').run(p.id);
      const receipt={...outcome,requestId,at,wallet,bet,free,cost:free?0:bet,net:outcome.payout-(free?0:bet),remaining,featureWon:won,rulesVersion:CRYSTAL_RULES.version};
      db.prepare('INSERT INTO crystal_rounds(account_id,request_id,wallet,bet,at,result) VALUES(?,?,?,?,?,?)').run(p.id,requestId,wallet,bet,at,JSON.stringify(receipt));
      save(p);return receipt;
    },p,'crystalRound');
    json(res,200,{user:mePublic(p),round:result,bonus:bonus(p),history:history(p)});return true;
  }
  return {route};
}
