export const PASS_NAME='ZirvePass';
export const PASS_PRICE=5000000;
export const SEASON_ANCHOR=Date.parse('2026-10-29T21:00:00Z');
export const SEASON_LENGTH=14*86400000;
export const COSMETIC_TYPES={nick:'Nick stili',title:'Unvan',entry:'Odaya giriş',border:'Hücre kenarı',theme:'Sayfa teması'};
export const SEASON_QUESTS=[
 {id:'season-food',metric:'food',name:'10.000 yem topla',target:10000,xp:1000},
 {id:'season-kills',metric:'kills',name:'100 rakip yen',target:100,xp:1000},
 {id:'season-time',metric:'seconds',name:'10 saat oyna',target:36000,xp:1500},
 {id:'season-gold',metric:'goldSpent',name:'1.000.000 Gold kullan',target:1000000,xp:1000},
 {id:'season-games',metric:'games',name:'100 oyuna katıl',target:100,xp:1000},
 {id:'season-wins',metric:'wins',name:'10 tur kazan',target:10,xp:1000}
];
const free={1:2500,3:2500,5:5000,7:5000,9:5000,11:5000,13:7500,15:7500,17:7500,19:7500,21:10000,23:10000,25:12500,27:12500,29:15000,30:20000,31:12500,32:5000,33:7500};
const paid={1:15000,2:15000,3:15000,4:20000,6:20000,7:25000,8:25000,9:25000,11:30000,12:30000,13:30000,14:35000,16:35000,17:40000,18:40000,19:45000,21:45000,24:50000,26:60000,28:75000,31:50000,32:30000,33:45000};
const specials={5:['nick','İyon Nick · Buz','#5cddff'],10:['nick','İyon Nick · Gül','#ff65b7'],15:['title','Öncü','#ddff75'],22:['nick','İyon Nick · Mor','#b38bff'],23:['theme','Sayfa Teması · İyon','#5cddff'],25:['border','İyon Kenar · Halka','#5cddff'],27:['border','İyon Kenar · Prizma','#b38bff'],29:['border','İyon Kenar · Radar','#ddff75'],30:['entry','İyon Giriş','#5cddff']};
export function seasonMeta(now=Date.now()){
 const index=Math.max(0,Math.floor((now-SEASON_ANCHOR)/SEASON_LENGTH)),startsAt=SEASON_ANCHOR+index*SEASON_LENGTH;
 return{id:'zirve-'+(index+1),number:index+1,title:['İyon Fırtınası','Kozmik Akım','Plazma Dalgası'][index%3],startsAt,endsAt:startsAt+SEASON_LENGTH};
}
export function seasonState(p,now=Date.now()){
 const meta=seasonMeta(now);p.inventory??=[];p.cosmetics??={};p.loadout??={};
 if(p.season?.id!==meta.id){
  const legacy=!p.seasonVersion;const old=p.season;
  if(old){p.seasonArchive??=[];p.seasonArchive.unshift({id:old.id,xp:old.xp,paid:old.paid,claimed:old.claimed});p.seasonArchive=p.seasonArchive.slice(0,12)}
  p.season={id:meta.id,xp:legacy?Math.max(0,Math.floor(p.xp||0)):0,paid:legacy&&p.inventory.includes('pass'),claimed:legacy?(p.claimed||[]).flatMap(level=>p.inventory.includes('pass')?[`free:${level}`,`paid:${level}`]:[`free:${level}`]):[],questClaims:[],stats:{food:0,kills:0,seconds:0,goldSpent:0,games:0,wins:0}};
  p.seasonVersion=1;p.inventory=p.inventory.filter(x=>x!=='pass');
 }
 return p.season;
}
export function seasonProgress(p,delta,now=Date.now()){
 const s=seasonState(p,now);for(const key of ['food','kills','seconds','goldSpent','games','wins'])s.stats[key]=(s.stats[key]||0)+Math.max(0,Number(delta[key])||0);
}
export function passXP(p,n,now=Date.now()){const s=seasonState(p,now);if(!Number.isFinite(n)||n<0)throw Error('Geçersiz XP');s.xp+=n;}
export const levelForXP=xp=>Math.min(30,Math.max(0,Math.floor(xp/200)));
export const rewardXP=level=>level<=30?level*200:6000+(level-30)*1000;
export function rewardFor(level,lane,meta=seasonMeta()){
 if(!Number.isInteger(level)||level<1||level>33||!['free','paid'].includes(lane))return null;
 const amount=(lane==='free'?free:paid)[level];if(amount)return{kind:'gold',amount,name:amount.toLocaleString('tr-TR')+' Gold'};
 if(lane==='free')return null;
 if(level===20)return{kind:'premium',days:3,name:'3 Gün Premium'};
 const item=specials[level];return item?{kind:'cosmetic',type:item[0],name:item[1],color:item[2],id:meta.id+'-'+item[0]+'-'+level}:null;
}
export function buyPass(p,now=Date.now()){
 const s=seasonState(p,now);if(s.paid)throw Error('Bu sezonun ZirvePass bileti zaten açık');if(p.gold<PASS_PRICE)throw Error('Yetersiz Gold');p.gold-=PASS_PRICE;s.paid=true;
}
function grant(p,reward,now){
 if(reward.kind==='gold')p.gold+=reward.amount;
 else if(reward.kind==='premium')p.premiumUntil=Math.max(now,p.premiumUntil||0)+reward.days*86400000;
 else{p.cosmetics[reward.id]={...reward,season:seasonMeta(now).id};if(!p.inventory.includes(reward.id))p.inventory.push(reward.id)}
}
export function claimReward(p,level,lane,now=Date.now()){
 const s=seasonState(p,now),reward=rewardFor(level,lane,seasonMeta(now)),key=lane+':'+level;
 if(!reward||s.xp<rewardXP(level)||s.claimed.includes(key)||lane==='paid'&&!s.paid)throw Error('Ödül kilitli, zaten toplandı veya ZirvePass gerekli');
 s.claimed.push(key);grant(p,reward,now);return reward;
}
export function claimAllRewards(p,now=Date.now()){
 const s=seasonState(p,now);let count=0;for(let level=1;level<=33;level++)for(const lane of ['free','paid']){const key=lane+':'+level;if(rewardFor(level,lane,seasonMeta(now))&&s.xp>=rewardXP(level)&&!s.claimed.includes(key)&&(lane==='free'||s.paid)){claimReward(p,level,lane,now);count++}}
 if(!count)throw Error('Toplanabilecek ödül yok');return count;
}
export function claimSeasonQuest(p,id,now=Date.now()){
 const s=seasonState(p,now),q=SEASON_QUESTS.find(q=>q.id===id);if(!q||s.stats[q.metric]<q.target||s.questClaims.includes(id))throw Error('Görev tamamlanmadı veya XP toplandı');s.questClaims.push(id);passXP(p,q.xp,now);p.xp=(p.xp||0)+q.xp;
}
export function equipCosmetic(p,id,type,now=Date.now()){
 seasonState(p,now);if(!Object.hasOwn(COSMETIC_TYPES,type))throw Error('Geçersiz kozmetik türü');
 if(!id){delete p.loadout[type];return}const item=p.cosmetics[id];if(!item||item.type!==type||!p.inventory.includes(id))throw Error('Bu kozmetik envanterinde değil');p.loadout[type]=id;
}
export function cosmeticLook(p){return Object.fromEntries(Object.entries(p?.loadout||{}).filter(([type,id])=>p.cosmetics?.[id]?.type===type).map(([type,id])=>[type,p.cosmetics[id]]));}
