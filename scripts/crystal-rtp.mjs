import fs from 'node:fs';
import {crystalRound} from '../server/crystal-game.js';
import {CRYSTAL_RULES} from '../dist/crystal-rules.js';
const arg=(key,fallback)=>{const i=process.argv.indexOf(key);return i<0?fallback:Number(process.argv[i+1]);};
const trials=arg('--rounds',100000),bet=arg('--bet',100000),seed=arg('--seed',20261106);
CRYSTAL_RULES.payScale=arg('--scale',CRYSTAL_RULES.payScale);
let rng=seed>>>0;
const random=max=>{rng^=rng<<13;rng^=rng>>>17;rng^=rng<<5;return Math.floor((rng>>>0)/4294967296*max);};
let mean=0,m2=0,freeSpins=0,triggers=0,caps=0,maxWin=0,maxTumbles=0,scatterPaid=0;
for(let i=1;i<=trials;i++){
  let r=crystalRound(bet,{random,capture:false}),total=r.payout,remaining=r.capped?0:r.bonusAwarded,multiplier=0;
  scatterPaid+=r.scatterPayout;
  if(remaining)triggers++;if(r.capped)caps++;
  maxTumbles=Math.max(maxTumbles,r.tumbles);
  while(remaining>0){
    r=crystalRound(bet,{random,capture:false,free:true,featureMultiplier:multiplier,cap:bet*CRYSTAL_RULES.maxPayoutRate-total});
    total+=r.payout;multiplier=r.featureMultiplier;remaining=r.capped?0:remaining-1+r.bonusAwarded;freeSpins++;scatterPaid+=r.scatterPayout;
    maxTumbles=Math.max(maxTumbles,r.tumbles);if(r.capped)caps++;
  }
  const x=total/bet,delta=x-mean;mean+=delta/i;m2+=delta*(x-mean);maxWin=Math.max(maxWin,x);
}
const se=Math.sqrt(m2/(trials-1)/trials)*100;
const report={rulesVersion:CRYSTAL_RULES.version,targetRtp:90,rounds:trials,bet,seed,payScale:CRYSTAL_RULES.payScale,measuredRtp:mean*100,ci95:[mean*100-1.96*se,mean*100+1.96*se],standardError:se,freeSpins,triggers,caps,maxWin,maxTumbles,scatterRtp:scatterPaid/(trials*bet)*100};
const output=process.argv.indexOf('--output');if(output>=0)fs.writeFileSync(process.argv[output+1],JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
