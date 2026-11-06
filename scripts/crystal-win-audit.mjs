import fs from 'node:fs';
import {planCrystalFeature} from '../server/crystal-win.js';
import {crystalRound} from '../server/crystal-game.js';
import {crystalMath} from '../dist/crystal-rules.js';
const i=process.argv.indexOf('--rounds'),count=i<0?100000:Number(process.argv[i+1]);
let state=20261121;
const random=max=>{state^=state<<13;state^=state>>>17;state^=state<<5;return Math.floor((state>>>0)/4294967296*max);};
const report=[];
for(const mode of ['natural','buy']){
 let wins=0,chosen=0,paid=0,symbols=0,support=0,turns=0,maxBaseWin=0;
 for(let n=0;n<count;n++){
  const p=planCrystalFeature({bet:100000,math:crystalMath(99.99,mode),mode,winChance:99.99,random,capture:false},crystalRound);
  if(p.chosenWin)chosen++;if(p.total>p.cost)wins++;
  if((p.total>p.cost)!==p.chosenWin)throw Error('Net result does not match the selected outcome');
  if(p.chosenWin&&p.total<p.cost+Math.ceil(p.cost/100))throw Error('Missing minimum net profit');
  paid+=p.cost;turns+=p.rounds.length;maxBaseWin=Math.max(maxBaseWin,p.total/100000);
  for(const r of p.rounds){symbols+=r.symbolPayout;support+=r.supportPayout;}
 }
 report.push({mode,starts:count,configuredWinChance:99.99,selectedWins:chosen,netProfitableStarts:wins,measuredWinPercent:wins/count*100,totalRounds:turns,totalReturnPercent:(symbols+support)/paid*100,symbolReturnPercent:symbols/paid*100,supportReturnPercent:support/paid*100,maxBaseWin});
}
const output=process.argv.indexOf('--output');if(output>=0)fs.writeFileSync(process.argv[output+1],JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
