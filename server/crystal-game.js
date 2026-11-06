import {randomInt} from 'node:crypto';
import {CRYSTALS,CRYSTAL_BETS,CRYSTAL_RULES} from '../dist/crystal-rules.js';

export function crystalRound(bet,{random=randomInt,free=false}={}) {
  const draw=()=>{let n=random(21);for(const s of CRYSTALS){n-=s.weight;if(n<0)return s.id;}throw Error('Invalid random draw');};
  let grid=Array.from({length:20},draw),base=0,stars=0;
  const frames=[];
  for(let i=0;i<CRYSTAL_RULES.maxCascades;i++){
    stars=Math.max(stars,grid.filter(s=>s==='star').length);
    const matches=CRYSTALS.filter(s=>s.rate&&grid.filter(x=>x===s.id).length>=6);
    const cleared=grid.flatMap((id,index)=>matches.some(s=>s.id===id)?[index]:[]);
    const win=matches.reduce((sum,s)=>sum+Math.floor(bet*s.rate* Math.floor(grid.filter(x=>x===s.id).length/6)/100),0);
    base+=win;frames.push({grid:[...grid],cleared,win});
    if(!cleared.length||i===CRYSTAL_RULES.maxCascades-1)break;
    const next=[...grid];
    for(let col=0;col<5;col++){
      const remaining=Array.from({length:4},(_,row)=>row*5+col).filter(index=>!cleared.includes(index)).map(index=>grid[index]);
      const column=[...Array.from({length:4-remaining.length},draw),...remaining];
      column.forEach((id,row)=>{next[row*5+col]=id;});
    }
    grid=next;
  }
  const multiplier=base>0&&random(10)===0?[2,3,5][random(3)]:1;
  return {frames,multiplier,payout:Math.min(bet*100,base*multiplier),bonusAwarded:!free&&stars>=3?3:0};
}

export function createCrystalGame({db,atomic,save,spend,fail,json,mePublic,now=Date.now,round=crystalRound}){
  db.exec(`CREATE TABLE IF NOT EXISTS crystal_rounds(
    id INTEGER PRIMARY KEY AUTOINCREMENT,account_id INTEGER NOT NULL REFERENCES accounts(id),
    request_id TEXT NOT NULL,wallet TEXT NOT NULL,bet INTEGER NOT NULL,at INTEGER NOT NULL,result TEXT NOT NULL,
    UNIQUE(account_id,request_id));
    CREATE INDEX IF NOT EXISTS crystal_history ON crystal_rounds(account_id,id DESC);
    CREATE TABLE IF NOT EXISTS crystal_bonus(account_id INTEGER PRIMARY KEY REFERENCES accounts(id),wallet TEXT NOT NULL,bet INTEGER NOT NULL,remaining INTEGER NOT NULL);`);
  const bonus=p=>db.prepare('SELECT wallet,bet,remaining FROM crystal_bonus WHERE account_id=? AND remaining>0').get(p.id)||null;
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
      const outcome=round(bet,{free});
      if(!Number.isSafeInteger(p[wallet])||!Number.isSafeInteger(p[wallet]+outcome.payout))fail('Bakiye sınırına ulaşıldı.');
      p[wallet]+=outcome.payout;
      const remaining=free?feature.remaining-1:outcome.bonusAwarded;
      if(remaining>0)db.prepare('INSERT INTO crystal_bonus VALUES(?,?,?,?) ON CONFLICT(account_id) DO UPDATE SET wallet=excluded.wallet,bet=excluded.bet,remaining=excluded.remaining').run(p.id,wallet,bet,remaining);
      else db.prepare('DELETE FROM crystal_bonus WHERE account_id=?').run(p.id);
      const receipt={...outcome,requestId,at,wallet,bet,free,cost:free?0:bet,net:outcome.payout-(free?0:bet),remaining};
      db.prepare('INSERT INTO crystal_rounds(account_id,request_id,wallet,bet,at,result) VALUES(?,?,?,?,?,?)').run(p.id,requestId,wallet,bet,at,JSON.stringify(receipt));
      save(p);return receipt;
    },p,'crystalRound');
    json(res,200,{user:mePublic(p),round:result,bonus:bonus(p),history:history(p)});return true;
  }
  return {route};
}
