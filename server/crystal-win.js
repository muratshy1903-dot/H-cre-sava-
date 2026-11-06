import {randomInt} from 'node:crypto';
import {CRYSTAL_RULES} from '../dist/crystal-rules.js';

// A win is a positive net result after the paid spin/package and all of its bonus spins.
// The support payment is explicit; it is never represented as a symbol match.
export function planCrystalFeature({bet,math,mode='natural',winChance=99.99,random=randomInt,capture=true},round){
  if(!Number.isSafeInteger(bet)||bet<1||!Number.isFinite(winChance)||winChance<0||winChance>100)throw Error('Geçersiz kazanma ayarı');
  const cost=bet*(mode==='buy'?CRYSTAL_RULES.buyPriceRate:1),cap=bet*CRYSTAL_RULES.maxPayoutRate;
  const minimum=cost+Math.max(1,Math.ceil(cost/100));
  const chosenWin=random(10000)<Math.round(winChance*100);
  const sample=()=>{
    const rounds=[];let won=0,multiplier=0,remaining=mode==='buy'?CRYSTAL_RULES.bonusTurns:0;
    const draw=free=>{
      const r={...round(bet,{free,featureMultiplier:multiplier,cap:cap-won,math,random,capture})};
      if(!Number.isSafeInteger(r.payout)||r.payout<0)throw Error('Geçersiz tur ödülü');
      r.payout=Math.min(r.payout,cap-won);won+=r.payout;multiplier=r.featureMultiplier||0;
      r.capped=!!r.capped||won>=cap;
      rounds.push({...r,symbolPayout:r.payout,supportPayout:0});
      remaining=r.capped?0:(free?remaining-1:0)+(r.bonusAwarded||0);
    };
    if(mode!=='buy')draw(false);
    while(remaining>0&&won<cap)draw(true);
    return {rounds,total:won};
  };
  let plan;
  for(let attempt=0;attempt<128;attempt++){
    plan=sample();
    if(chosenWin||plan.total<=cost)break;
    plan=null;
  }
  if(!plan){
    const grid=Array.from({length:30},(_,i)=>['leaf','drop','sun','bloom','moon','crown','ruby','crystal'][i%8]);
    const empty=()=>({frames:capture?[{grid:[...grid],cleared:[],win:0,total:0,multiplier:1}]:[],payout:0,symbolPayout:0,supportPayout:0,bonusAwarded:0,featureMultiplier:0,multiplier:1,capped:false});
    plan={rounds:Array.from({length:mode==='buy'?15:1},empty),total:0};
  }
  if(chosenWin&&plan.total<minimum){
    const last=plan.rounds.at(-1),support=minimum-plan.total;
    last.supportPayout=support;last.payout+=support;plan.total+=support;
  }
  return {...plan,cost,chosenWin};
}
