import test from 'node:test';import assert from 'node:assert/strict';
import {World} from '../dist/engine.js';import {mmaPrize} from '../dist/mma-prize.js';
import {seasonMeta,seasonState,seasonProgress,SEASON_LENGTH} from '../dist/season.js';
import {chooseZirvePath,activateZirve,claimZirve,zirveProgress,zirveState,zirveEntry} from '../dist/zirve-yolu.js';
import {ownsRewardSkin,rewardSkinInfo} from '../dist/reward-skins.js';
import {flagIcon} from '../dist/flags.js';

test('MMA reward thresholds count active humans only and pay the winner normal Gold, preserving the personal MMA wallet',()=>{
 for(const [count,reward]of [[0,50000],[1,50000],[4,50000],[5,100000],[9,100000],[10,150000],[14,150000],[15,200000],[19,200000],[20,250000],[30,250000]])assert.equal(mmaPrize(count),reward);
 const w=new World('MMA-2',{now:1000});w.items=[];for(let i=0;i<20;i++)w.addPlayer('p'+i,{gold:1000});w.addPlayer('watch',{spectator:true});const dead=w.addPlayer('dead');dead.cells=[];const bot=w.addPlayer('b',{bot:true});assert.equal(w.prize,250000);
 w.removePlayer('p19');assert.equal(w.prize,200000);w.removePlayer('p18');assert.equal(w.prize,200000);w.roundEnd=w.time+50;w.step(.05);const e=w.events.find(e=>e.type==='round');assert.equal(e.prize,200000);const winner=w.players.get(e.winner.id);assert.equal(winner.gold,201000);assert.equal(winner.mmaGold,80000000);assert.equal(winner.bonus,50000);
});

test('Zirve Yolu charges once, fixes one path, allows one reward per level and preserves seasonal titles and skins',()=>{
 const now=Date.now(),p={gold:5000000,bonus:12,premiumUntil:0,xp:0,inventory:[],claimed:[],skins:[]};
 chooseZirvePath(p,'avci',now);assert.throws(()=>chooseZirvePath(p,'klan',now));assert.throws(()=>claimZirve(p,5,'skin',now));activateZirve(p,now);assert.equal(p.gold,0);assert.throws(()=>activateZirve(p,now));assert.equal(p.gold,0);
 seasonProgress(p,{food:2500,kills:15,bestScore:75000,seconds:6000},now);assert.equal(zirveProgress(p,now),20);assert.throws(()=>claimZirve(p,5,'forged',now));claimZirve(p,5,'skin',now);const id='zirve-'+seasonMeta(now).number+'-avci-5';assert.equal(ownsRewardSkin(p,id),true);assert.equal(ownsRewardSkin({},id),false);assert.ok(rewardSkinInfo(id).name.includes('Sezon'));assert.throws(()=>claimZirve(p,5,'gold',now));assert.equal(p.gold,0);
 claimZirve(p,20,'premium',now);assert.equal(p.premiumUntil,now+4*86400000);assert.match(zirveEntry(p),/Sezon Avcısı/);const restored=JSON.parse(JSON.stringify(p));zirveState(restored,now+SEASON_LENGTH);assert.equal(restored.zirveYolu.path,null);assert.equal(ownsRewardSkin(restored,id),true);assert.match(zirveEntry(restored),/Sezon Avcısı/);assert.equal(restored.bonus,12);assert.equal(restored.gold,0);
});
test('flags retain accessible SVGs without overlaid country-code text',()=>{for(const code of ['tr','en','es','de','ru']){const html=flagIcon(code);assert.ok(html.startsWith('<svg'));assert.equal(html.includes('<b>'),false)}});

test('new path copy and numeric missions follow the selected language',async()=>{const {translateText}=await import('../dist/i18n.js');assert.equal(translateText('Zirve Yolu','en'),'Summit Path');assert.equal(translateText('500 yem topla','en'),'Collect 500 food');assert.equal(translateText('3 rakip yen','es'),'Derrota a 3 rivales');assert.equal(translateText('1 MMA turu kazan','de'),'Gewinne 1 MMA-Runden');assert.equal(translateText('1. Sezon · 25 gün 08:00:00','en'),'1. Season · 25 days 08:00:00')});
