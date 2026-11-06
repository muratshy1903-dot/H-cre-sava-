import fs from 'node:fs';
import {crystalRound} from '../server/crystal-game.js';
import {CRYSTAL_RULES,crystalMath} from '../dist/crystal-rules.js';
const arg=(key,fallback)=>{const i=process.argv.indexOf(key);return i<0?fallback:Number(process.argv[i+1]);};
const trials=arg('--rounds',100000),bet=arg('--bet',100000),seed=arg('--seed',20261106);
const mode=process.argv.includes('--buy')?'buy':'natural';
const targetRtp=arg('--target',CRYSTAL_RULES.targetRtp),math=crystalMath(targetRtp,mode);
math.payScale=arg('--scale',math.payScale);math.scatterScale=arg('--scatter-scale',math.payScale);
let rng=seed>>>0;
const random=max=>{rng^=rng<<13;rng^=rng>>>17;rng^=rng<<5;return Math.floor((rng>>>0)/4294967296*max);};
const samples=process.argv.includes('--calibrate-buy')?new Float64Array(trials):null;
let mean=0,m2=0,freeSpins=0,triggers=0,caps=0,maxWin=0,maxTumbles=0,scatterPaid=0;
for(let i=1;i<=trials;i++){
  let r=mode==='buy'?{payout:0,scatterPayout:0,bonusAwarded:15,capped:false,tumbles:0}:crystalRound(bet,{random,capture:false,math}),total=r.payout,remaining=r.capped?0:r.bonusAwarded,multiplier=0;
  scatterPaid+=r.scatterPayout;
  if(remaining)triggers++;if(r.capped)caps++;
  maxTumbles=Math.max(maxTumbles,r.tumbles);
  while(remaining>0){
    r=crystalRound(bet,{random,capture:false,math,free:true,featureMultiplier:multiplier,cap:bet*CRYSTAL_RULES.maxPayoutRate-total});
    total+=r.payout;multiplier=r.featureMultiplier;remaining=r.capped?0:remaining-1+r.bonusAwarded;freeSpins++;scatterPaid+=r.scatterPayout;
    maxTumbles=Math.max(maxTumbles,r.tumbles);if(r.capped)caps++;
  }
  if(samples)samples[i-1]=total/bet;
  const x=total/(bet*(mode==='buy'?100:1)),delta=x-mean;mean+=delta/i;m2+=delta*(x-mean);maxWin=Math.max(maxWin,x);
}
const se=Math.sqrt(m2/(trials-1)/trials)*100;
const report={rulesVersion:CRYSTAL_RULES.version,mode,targetRtp,rounds:trials,bet,seed,payScale:math.payScale,scatterScale:math.scatterScale,measuredRtp:mean*100,ci95:[mean*100-1.96*se,mean*100+1.96*se],standardError:se,freeSpins,triggers,caps,maxWin,maxTumbles,scatterRtp:scatterPaid/(trials*bet*(mode==='buy'?100:1))*100};
if(samples){
  samples.sort();const prefix=new Float64Array(trials+1);for(let i=0;i<trials;i++)prefix[i+1]=prefix[i]+samples[i];
  const expected=scale=>{let lo=0,hi=trials;const threshold=5000/scale;while(lo<hi){const mid=(lo+hi)>>>1;if(samples[mid]<threshold)lo=mid+1;else hi=mid;}return(prefix[lo]*scale+(trials-lo)*5000)/trials;};
  report.buyCurve=[...new Set([...Array.from({length:41},(_,i)=>i*5),99.99])].sort((a,b)=>a-b).map(targetRtp=>{if(!targetRtp)return{targetRtp,scale:0};let lo=0,hi=100;for(let i=0;i<45;i++){const mid=(lo+hi)/2;if(expected(mid)<targetRtp)lo=mid;else hi=mid;}return{targetRtp,scale:(lo+hi)/2};});
}
const output=process.argv.indexOf('--output');if(output>=0)fs.writeFileSync(process.argv[output+1],JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
