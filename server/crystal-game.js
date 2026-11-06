import {planCrystalFeature} from './crystal-win.js';
import {randomInt} from 'node:crypto';
import {CRYSTALS,CRYSTAL_BETS,CRYSTAL_RULES,CRYSTAL_MULTIPLIERS,crystalPayRate,crystalMath,CRYSTAL_LEGACY_MATH} from '../dist/crystal-rules.js';

export function crystalRound(bet,{random=randomInt,free=false,featureMultiplier=0,cap=bet*CRYSTAL_RULES.maxPayoutRate,capture=true,math=crystalMath()}={}) {
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
    for(let i=0;i<CRYSTALS.length;i++)if(CRYSTALS[i].rate&&counts[i]>=8){winning[i]=true;matched=true;win+=Math.floor(bet*crystalPayRate(CRYSTALS[i],counts[i],math));}
    base+=win;stars=counts[CRYSTALS.length-1];
    // The accumulated bonus multiplier applies when a new orb lands on a winning free spin.
    const activeMultiplier=orbTotal>0?(free?featureMultiplier+orbTotal:orbTotal):1;
    multiplier=base>0?Math.max(1,activeMultiplier):1;
    const scatterWin=Math.floor(bet*(stars>=6?100:stars===5?5:stars===4?3:0)*math.scatterScale);
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
  const scatterPayout=Math.min(Math.max(0,cap-base*multiplier),Math.floor(bet*(stars>=6?100:stars===5?5:stars===4?3:0)*math.scatterScale));
  return {frames,tumbles,base,multiplier,orbTotal,payout,scatterPayout,bonusAwarded,featureMultiplier:nextMultiplier,capped:payout>=cap};
}

export function createCrystalGame({db,atomic,save,spend,fail,json,mePublic,hasPermission=()=>false,now=Date.now,round=crystalRound}){
  db.exec(`CREATE TABLE IF NOT EXISTS crystal_rounds(
    id INTEGER PRIMARY KEY AUTOINCREMENT,account_id INTEGER NOT NULL REFERENCES accounts(id),
    request_id TEXT NOT NULL,wallet TEXT NOT NULL,bet INTEGER NOT NULL,at INTEGER NOT NULL,result TEXT NOT NULL,
    UNIQUE(account_id,request_id));
    CREATE INDEX IF NOT EXISTS crystal_history ON crystal_rounds(account_id,id DESC);
    CREATE TABLE IF NOT EXISTS crystal_bonus(account_id INTEGER PRIMARY KEY REFERENCES accounts(id),wallet TEXT NOT NULL,bet INTEGER NOT NULL,remaining INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS crystal_settings(id INTEGER PRIMARY KEY CHECK(id=1),revision INTEGER NOT NULL,target_bps INTEGER NOT NULL,updated_at INTEGER NOT NULL);
    INSERT OR IGNORE INTO crystal_settings(id,revision,target_bps,updated_at) VALUES(1,1,9999,0);`);
  const columns=new Set(db.prepare('PRAGMA table_info(crystal_bonus)').all().map(c=>c.name));
  for(const [name,definition] of [['multiplier','INTEGER NOT NULL DEFAULT 0'],['won','INTEGER NOT NULL DEFAULT 0'],['version','INTEGER NOT NULL DEFAULT 1'],['math','TEXT'],['plan','TEXT']])if(!columns.has(name))db.exec('ALTER TABLE crystal_bonus ADD COLUMN '+name+' '+definition);
  const settingColumns=new Set(db.prepare('PRAGMA table_info(crystal_settings)').all().map(c=>c.name));
  for(const [name,definition] of [['win_chance_bps','INTEGER NOT NULL DEFAULT 9999'],['win_control','INTEGER NOT NULL DEFAULT 1']])if(!settingColumns.has(name))db.exec('ALTER TABLE crystal_settings ADD COLUMN '+name+' '+definition);
  const settings=()=>{db.prepare('INSERT OR IGNORE INTO crystal_settings(id,revision,target_bps,updated_at) VALUES(1,1,9999,0)').run();const r=db.prepare('SELECT * FROM crystal_settings WHERE id=1').get();return{revision:r.revision,targetRtp:r.target_bps/100,updatedAt:r.updated_at,buyPriceRate:CRYSTAL_RULES.buyPriceRate,winChance:r.win_chance_bps/100,winControlEnabled:!!r.win_control};};
  const bonus=(p,privatePlan=false)=>{const r=db.prepare('SELECT wallet,bet,remaining,multiplier,won,version,math,plan FROM crystal_bonus WHERE account_id=? AND remaining>0').get(p.id);if(!r)return null;const {plan,...visible}=r;return{...visible,math:r.math?JSON.parse(r.math):CRYSTAL_LEGACY_MATH,...(privatePlan?{plan:plan?JSON.parse(plan):null}:{})};};
  const history=p=>db.prepare('SELECT result FROM crystal_rounds WHERE account_id=? ORDER BY id DESC LIMIT 20').all(p.id).map(r=>JSON.parse(r.result));
  const persistBonus=(p,wallet,bet,remaining,multiplier,won,math,plan=null)=>db.prepare('INSERT INTO crystal_bonus(account_id,wallet,bet,remaining,multiplier,won,version,math,plan) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(account_id) DO UPDATE SET wallet=excluded.wallet,bet=excluded.bet,remaining=excluded.remaining,multiplier=excluded.multiplier,won=excluded.won,version=excluded.version,math=excluded.math,plan=excluded.plan').run(p.id,wallet,bet,remaining,multiplier,won,math.version,JSON.stringify(math),plan?JSON.stringify(plan):null);
  function route(req,res,url,p,data){
    if(!['/api/crystal','/api/crystal/settings'].includes(url.pathname))return false;
    if(!p)fail('Mini oyun için hesabına giriş yapmalısın.',401);
    if(url.pathname==='/api/crystal/settings'){
      if(!hasPermission(p,'crystalRtp')&&!hasPermission(p,'crystalWinChance'))fail('Kristal ayarları için panel yetkisi gerekli.',403);
      if(req.method==='GET'){json(res,200,{settings:settings()});return true;}
      if(req.method!=='POST')fail('Yöntem desteklenmiyor',405);
      const changeRtp=Object.hasOwn(data,'targetRtp'),changeWin=Object.hasOwn(data,'winChance')||Object.hasOwn(data,'winControlEnabled');
      if(!changeRtp&&!changeWin)fail('Değiştirilecek ayar gerekli.');
      if(changeRtp&&!hasPermission(p,'crystalRtp')||changeWin&&!hasPermission(p,'crystalWinChance'))fail('Bu ayar için panel yetkin yok.',403);
      const validPercent=(value,max)=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=max&&Math.abs(value*100-Math.round(value*100))<1e-7;
      if(changeRtp&&!validPercent(data.targetRtp,200))fail('RTP 0–200 arası, en fazla iki ondalık basamaklı olmalı.');
      if(changeWin&&(!validPercent(data.winChance,100)||typeof data.winControlEnabled!=='boolean'))fail('Kazanma ihtimali 0–100 arası olmalı ve mod seçilmeli.');
      const updated=atomic(()=>{
        const before=settings();if(data.revision!==before.revision)fail('Ayar başka bir yönetici tarafından değiştirildi. Paneli yenile.',409);
        const targetRtp=changeRtp?data.targetRtp:before.targetRtp,winChance=changeWin?data.winChance:before.winChance,enabled=changeWin?data.winControlEnabled:before.winControlEnabled;
        if(targetRtp===before.targetRtp&&winChance===before.winChance&&enabled===before.winControlEnabled)return before;
        db.prepare('UPDATE crystal_settings SET revision=revision+1,target_bps=?,win_chance_bps=?,win_control=?,updated_at=? WHERE id=1').run(Math.round(targetRtp*100),Math.round(winChance*100),enabled?1:0,now());
        db.prepare('INSERT INTO audit(actor,action,target,detail,at) VALUES(?,?,?,?,?)').run(p.id,changeWin?'crystalWinChance':'crystalRtp',0,JSON.stringify({before,after:{targetRtp,winChance,winControlEnabled:enabled},revision:before.revision+1}),now());return settings();
      },p,changeWin?'crystalWinChance':'crystalRtp');
      json(res,200,{settings:updated});return true;
    }
    if(req.method==='GET'){json(res,200,{user:mePublic(p),settings:settings(),bonus:bonus(p),history:history(p)});return true;}
    if(req.method!=='POST')fail('Yöntem desteklenmiyor',405);
    const {requestId,wallet,bet}=data,kind=data.kind??'spin';
    if(typeof requestId!=='string'||!/^[a-zA-Z0-9-]{16,64}$/.test(requestId))fail('Geçersiz tur kimliği');
    if(!['spin','buy'].includes(kind)||!['gold','bonus'].includes(wallet)||!CRYSTAL_BETS.includes(bet))fail('Geçerli bir işlem, bakiye ve tur bedeli seç.');
    const result=atomic(()=>{
      const existing=db.prepare('SELECT result,wallet,bet FROM crystal_rounds WHERE account_id=? AND request_id=?').get(p.id,requestId);
      if(existing){const receipt=JSON.parse(existing.result);if(existing.wallet!==wallet||existing.bet!==bet||(receipt.kind||'spin')!==kind)fail('Bu tur kimliği farklı bir işlem için kullanıldı.',409);return receipt;}
      const at=now(),last=db.prepare('SELECT at FROM crystal_rounds WHERE account_id=? ORDER BY id DESC LIMIT 1').get(p.id);
      if(last&&at-last.at<900)fail('Sonraki tur için bir saniye bekle.',429);
      const feature=bonus(p,true),free=!!feature,config=settings();
      if(kind==='buy'&&feature)fail('Yeni paket almadan önce bekleyen ücretsiz turlarını tamamla.');
      if(feature&&(feature.wallet!==wallet||feature.bet!==bet))fail('Bonus turlarını başladığın bakiye ve bedelle tamamla.');
      if(!free&&(data.settingsRevision!==undefined||kind==='buy')&&data.settingsRevision!==config.revision)fail('RTP ayarı değişti. Güncel ayarı görmek için bölümü yeniden aç.',409);
      const math=feature?.math||{...crystalMath(config.targetRtp,kind==='buy'?'buy':'natural',config.revision),winControlEnabled:config.winControlEnabled,winChance:config.winChance};
      const cost=kind==='buy'?bet*CRYSTAL_RULES.buyPriceRate:free?0:bet;
      if(cost)spend(p,cost,wallet);
      let receipt,prepared;
      if(!feature&&math.winControlEnabled)prepared=planCrystalFeature({bet,math,mode:kind==='buy'?'buy':'natural',winChance:math.winChance},round);
      if(kind==='buy'){
        if(!Number.isSafeInteger(p[wallet]))fail('Bakiye sınırına ulaşıldı.');
        persistBonus(p,wallet,bet,15,0,0,math,prepared?.rounds||null);
        receipt={kind,requestId,at,wallet,bet,free:false,cost,payout:0,net:-cost,remaining:15,bonusAwarded:15,featureWon:0,featureMultiplier:0,multiplier:1,frames:[],math,rulesVersion:math.version};
      }else{
        const queued=feature?.plan||prepared?.rounds||null;
        const cap=bet*CRYSTAL_RULES.maxPayoutRate-(feature?.won||0),outcome=queued?queued.shift():round(bet,{free,featureMultiplier:feature?.multiplier||0,cap,math}),won=(feature?.won||0)+outcome.payout;
        if(!Number.isSafeInteger(p[wallet])||!Number.isSafeInteger(p[wallet]+outcome.payout))fail('Bakiye sınırına ulaşıldı.');
        p[wallet]+=outcome.payout;
        const remaining=outcome.capped?0:(free?feature.remaining-1:0)+outcome.bonusAwarded;
        if(remaining>0)persistBonus(p,wallet,bet,remaining,outcome.featureMultiplier||0,won,math,queued);
        else db.prepare('DELETE FROM crystal_bonus WHERE account_id=?').run(p.id);
        receipt={...outcome,kind,requestId,at,wallet,bet,free,cost,net:outcome.payout-cost,remaining,featureWon:won,featureNet:won-bet*(math.mode==='buy'?100:1),math,rulesVersion:math.version};
      }
      db.prepare('INSERT INTO crystal_rounds(account_id,request_id,wallet,bet,at,result) VALUES(?,?,?,?,?,?)').run(p.id,requestId,wallet,bet,at,JSON.stringify(receipt));
      save(p);return receipt;
    },p,kind==='buy'?'crystalBuy':'crystalRound');
    json(res,200,{user:mePublic(p),round:result,settings:settings(),bonus:bonus(p),history:history(p)});return true;
  }
  return {route,settings};
}
