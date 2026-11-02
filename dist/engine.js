import {allyMarkers} from './minimap.js';
export const COLORS=['#8454f3','#13b9e3','#ff595e','#ffb627','#32cb83','#e54bcb','#4386ed'];
const ffaRooms=Array.from({length:77},(_,i)=>({id:`FFA-${i+1}`,mode:'ffa',minutes:60}));
export const ROOMS=[{id:'MMA-1',mode:'special',minutes:15},{id:'MMA-2',mode:'special',minutes:15},{id:'MMA-3',mode:'special',minutes:15},...ffaRooms.slice(0,10),{id:'Etkinlik-1',mode:'event',minutes:20},{id:'Alan-1',mode:'area',minutes:5},{id:'Alan-2',mode:'area',minutes:5},...ffaRooms.slice(10),{id:'CFFA-1',mode:'team',minutes:60},{id:'VS-CFFA',mode:'team',minutes:12},{id:'VS-FFA',mode:'ffa',minutes:12},{id:'VS-GSZ',mode:'nogold',minutes:12},{id:'EKP-1',mode:'event',minutes:30},{id:'GSZ-1',mode:'nogold',minutes:60},{id:'BOOST-1',mode:'boost',minutes:10}];
const scheduleIds=[...ffaRooms.map(r=>r.id),'MMA-1','Alan-2','Etkinlik-1','Alan-1','CFFA-1','VS-CFFA','VS-FFA','VS-GSZ','EKP-1','GSZ-1','BOOST-1','MMA-2','MMA-3'];
export const DEFAULT_ROOMS=structuredClone(ROOMS);
export const AUTO_SPLIT_MASS=220000;
export const MAX_CELL_MASS=220084;
export const isMmaRoom=id=>/^MMA-[123]$/.test(id);
export function roomMassLimits(id){const split=id==='MMA-2'?250000:id==='MMA-3'?350000:AUTO_SPLIT_MASS;return {split,maxCell:split===AUTO_SPLIT_MASS?MAX_CELL_MASS:split,total:split*25}}
export const ROOM_CYCLE_MS=3600000;
export const VIRUS_RADIUS=48;
export const roomMapSize=id=>id==='MMA-2'?10000:id==='MMA-3'?12000:8500;
export function roomTiming(id,now=Date.now()){
 const index=ROOMS.findIndex(r=>r.id===id);if(index<0)throw Error('Oda bulunamadı');
 const room=ROOMS[index];
 const cycle=room.durationMs||(isMmaRoom(id)?900000:0)||(room.mode==='boost'?600000:ROOM_CYCLE_MS);
 if(isMmaRoom(id)&&!room.durationMs&&!room.scheduleEnd){const offset=(Number(id.slice(-1))-1)*300000,endsAt=(Math.floor((now-offset)/cycle)+1)*cycle+offset;return {startsAt:endsAt-cycle,roundDurationMs:cycle,endsAt,timeLeft:Math.ceil((endsAt-now)/1000),serverNow:now};}
 if(room.scheduleEnd){const endsAt=room.scheduleEnd+Math.max(0,Math.floor((now-room.scheduleEnd)/cycle)+1)*cycle;return {startsAt:endsAt-cycle,roundDurationMs:cycle,endsAt,timeLeft:Math.ceil((endsAt-now)/1000),serverNow:now};}
 const offset=id==='MMA-2'?Math.floor(ROOM_CYCLE_MS/261):id==='MMA-3'?Math.floor(ROOM_CYCLE_MS*2/261):ROOMS[index].mode==='boost'?0:Math.floor(Math.max(0,scheduleIds.indexOf(id))*ROOM_CYCLE_MS/87);
 const endsAt=(Math.floor((now-offset)/cycle)+1)*cycle+offset;
 return {startsAt:endsAt-cycle,roundDurationMs:cycle,endsAt,timeLeft:Math.ceil((endsAt-now)/1000),serverNow:now};
}
// Integer wire masses retain the exact total score across split fragments.
export function wireCells(cells){const masses=cells.map(c=>Math.floor(c.mass)),target=Math.floor(cells.reduce((n,c)=>n+c.mass,0)+1e-7);let left=target-masses.reduce((a,b)=>a+b,0);const order=cells.map((c,i)=>({i,f:c.mass-masses[i]})).sort((a,b)=>b.f-a.f);for(const x of order){if(left<=0)break;masses[x.i]++;left--}return cells.map((c,i)=>({id:c.id,x:Math.round(c.x),y:Math.round(c.y),mass:masses[i]}))}
export const radius=m=>Math.sqrt(Math.max(1,m))*3;
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
class Grid{constructor(size=240){this.size=size;this.cells=new Map()}put(v){const k=`${Math.floor(v.x/this.size)},${Math.floor(v.y/this.size)}`;if(!this.cells.has(k))this.cells.set(k,[]);this.cells.get(k).push(v)}query(x,y,r){let out=[];for(let a=Math.floor((x-r)/this.size);a<=Math.floor((x+r)/this.size);a++)for(let b=Math.floor((y-r)/this.size);b<=Math.floor((y+r)/this.size);b++){const q=this.cells.get(`${a},${b}`);if(q)out.push(...q)}return out}}
export class World{
 constructor(room='FFA-1',{bots=0,now=Date.now(),continuous=false}={}){this.continuous=continuous;this.config=ROOMS.find(x=>x.id===room)||ROOMS[0];if(continuous)this.config={...this.config,minutes:this.config.durationMs?this.config.durationMs/60000:isMmaRoom(room)?15:this.config.mode==='boost'?10:60};this.room=this.config.id;this.massConfig=Object.freeze(roomMassLimits(this.room));this.size=this.config.mode==='boost'?4500:roomMapSize(this.room);this.time=now;this.roundStart=now;this.roundEnd=now+this.config.minutes*60000;if(continuous){const timing=roomTiming(this.room,now);this.roundStart=timing.startsAt;this.roundEnd=timing.endsAt;}this.players=new Map();this.items=[];this.seq=1;this.events=[];this.winner=null;this.frame=0;this.round=1;this.bossHealth=10000;this.peak=0;this.finishedRecord=0;this.tickMs=0;this.goldToPrize=true;this.basePrize=50000;this.prize=this.basePrize;for(let i=0;i<(this.config.mode==='event'?750:450);i++)this.spawn('food');for(let i=0;i<(this.config.mode==='boss'?0:80);i++)this.spawn('virus');for(let i=0;i<bots;i++)this.addPlayer('bot-'+i,{name:'Bot '+(i+1),bot:true,gold:0,bonus:0});if(this.config.mode==='boss')this.addPlayer('boss',{name:'VORAK',bot:true,boss:true,gold:0})}
 random(){return 150+Math.random()*(this.size-300)}
 spawn(type,x=this.random(),y=this.random(),extra={}){const v={id:this.seq++,type,x,y,mass:type==='virus'?150:type==='eject'?10:10,color:COLORS[this.seq%COLORS.length],...extra};this.items.push(v);return v}
 virusPositionOpen(x,y,ignoreId=null){const r=VIRUS_RADIUS;if(x<r||y<r||x>this.size-r||y>this.size-r)return false;for(const p of this.players.values())for(const c of p.cells)if(!c.dead&&Math.hypot(x-c.x,y-c.y)<radius(c.mass)+r+15)return false;return !this.items.some(v=>!v.dead&&v.id!==ignoreId&&v.type==='virus'&&Math.hypot(x-v.x,y-v.y)<r*2+10)}
 replenishVirus(){if(this.items.filter(v=>!v.dead&&v.type==='virus').length>=80)return false;for(let i=0;i<40;i++){const x=this.random(),y=this.random();if(this.virusPositionOpen(x,y)){this.spawn('virus',x,y);return true}}return false}
 feedViruses(grid){
  let count=this.items.filter(v=>!v.dead&&v.type==='virus').length;
  for(const food of this.items.slice()){
   if(food.dead||food.type!=='eject')continue;
   const virus=grid.query(food.x,food.y,60).find(v=>!v.dead&&v.type==='virus'&&Math.hypot(v.x-food.x,v.y-food.y)<=VIRUS_RADIUS+8);
   if(!virus)continue;food.dead=true;virus.fed=Math.min(7,(virus.fed||0)+1);if(virus.fed<7||count>=800)continue;
   const moving=Math.hypot(food.vx||0,food.vy||0)>.01,a=Math.atan2(moving?(food.vy||0):virus.y-food.y,moving?(food.vx||0):virus.x-food.x),distance=VIRUS_RADIUS*1.05,x=virus.x+Math.cos(a)*distance,y=virus.y+Math.sin(a)*distance;
   if(!this.virusPositionOpen(x,y,virus.id))continue;
   this.spawn('virus',x,y,{vx:Math.cos(a)*1400,vy:Math.sin(a)*1400,shotUntil:this.time+1200});count++;virus.fed=0;
  }
 }

 cell(p,mass=100,x=this.random(),y=this.random()){return{id:this.seq++,owner:p.id,x,y,mass,vx:0,vy:0,mergeAt:this.time+15000}}
 addPlayer(id,opts={}){if(this.players.has(id))return this.players.get(id);const p={id,joinedAt:this.time,name:opts.name||'Oyuncu',bot:!!opts.bot,mobile:opts.mobile===true,boss:!!opts.boss,skin:opts.skin||'',team:opts.team||'',clanId:opts.clanId||null,color:opts.color||COLORS[this.players.size%COLORS.length],mmaGold:opts.mmaGold??80000000,mmaRenewsAt:opts.mmaRenewsAt??this.time+18000000,gold:opts.gold??100000,bonus:opts.bonus??50000,cells:[],aim:{x:this.size/2,y:this.size/2},feed:false,hold:'',lastInput:this.time,lastGold:0,lastFeed:0,lastSplit:0,score:0,max:0,kills:0,food:0,wins:opts.wins||0,spectator:!!opts.spectator};if(!p.spectator)this.respawn(p);this.players.set(id,p);return p}
 respawn(p){const mass=p.boss?35000:100,r=radius(mass);let x=this.random(),y=this.random(),best=-Infinity;const threats=[...this.players.values()].filter(q=>q.id!==p.id).flatMap(q=>q.cells).filter(c=>c.mass>mass*1.2);for(let i=0;i<40;i++){const nx=clamp(this.random(),r+20,this.size-r-20),ny=clamp(this.random(),r+20,this.size-r-20);const gap=threats.length?Math.min(...threats.map(c=>Math.hypot(nx-c.x,ny-c.y)-radius(c.mass)-r)):10000;if(gap>best){x=nx;y=ny;best=gap}if(gap>250)break}p.cells=[this.cell(p,mass,x,y)];p.aim={x,y};p.score=p.cells[0].mass;p.max=Math.max(p.max,p.score);p.hold='';p.holdPersistent=false;p.feed=false;p.splitQueue=[];p.lifeStart=this.time;p.lifePeak=mass;p.lifeKills=p.kills;p.lifeFood=p.food;p.lifeSpent=p.spent||0;p.lastInput=this.time}
 removePlayer(id){this.players.delete(id)}
 command(id,cmd){const p=this.players.get(id);if(!p||!cmd||typeof cmd!=='object')return false;if(cmd.type==='spectate'){if(!p.spectator)return false;const ranked=this.ranking();if(!ranked.length){p.spectateId=null;return false}let index=ranked.findIndex(q=>q.id===p.spectateId);if(index<0)index=0;if(cmd.target){if(!ranked.some(q=>q.id===cmd.target))return false;p.spectateId=cmd.target}else{index=cmd.direction==='leader'?0:cmd.direction==='prev'?(index<0?ranked.length-1:(index-1+ranked.length)%ranked.length):(index+1)%ranked.length;p.spectateId=ranked[index].id}return true}if(p.spectator||!p.cells.length)return false;p.lastInput=this.time;
  if(cmd.type==='move'){if(Number.isFinite(cmd.x)&&Number.isFinite(cmd.y))p.aim={x:clamp(cmd.x,0,this.size),y:clamp(cmd.y,0,this.size)};return true}
  if(cmd.type==='split'){p.splitQueue??=[];if(p.cells.length>=25)return false;if(this.time-p.lastSplit>=this.rates().splitMs&&!p.splitQueue.length)return this.split(p);if(p.splitQueue.length>=4)return false;p.splitQueue.push({aim:{...p.aim},at:this.time});return true}
  if(cmd.type==='gold')return this.gold(p,cmd.kind);
  if(cmd.type==='boost')return false;
  if(cmd.type==='hold'){if(!['','small','big','both'].includes(cmd.kind)){p.hold='';return false}p.hold=cmd.kind;p.holdPersistent=!!cmd.kind&&cmd.persistent===true;return true}
  if(cmd.type==='feed'){p.feed=!!cmd.on;return true}
  if(cmd.type==='eject')return this.eject(p);
  return false;
 }
 rates(){return this.boost&&(!this.boost.until||this.boost.until>this.time)?this.boost:{gold:1,feedMs:90,splitMs:80,until:0}}
 splitCell(p,c,aim=p.aim,angleOffset=0){
  if(p.cells.length>=25||c.mass<80)return false;
  const a=Math.atan2(aim.y-c.y,aim.x-c.x)+angleOffset,mass=c.mass/2,r=radius(mass),x=c.x,y=c.y,offset=r*1.03,launch=clamp(r*4,950,3500);
  c.mass=mass;c.mergeAt=this.time+15000;c.x=clamp(x-Math.cos(a)*offset,0,this.size);c.y=clamp(y-Math.sin(a)*offset,0,this.size);
  const n=this.cell(p,mass,clamp(x+Math.cos(a)*offset,0,this.size),clamp(y+Math.sin(a)*offset,0,this.size));n.vx=Math.cos(a)*launch;n.vy=Math.sin(a)*launch;p.cells.push(n);return true;
 }
 split(p,all=true,aim=p.aim){if(this.time-p.lastSplit<this.rates().splitMs)return false;p.lastSplit=this.time;let done=false;for(const c of p.cells.slice()){if(p.cells.length>=25)break;if(this.splitCell(p,c,aim)){done=true;if(!all)break}}return done}
 massLimits(){return this.massConfig}
 autoSplit(p){let count=0;while(p.cells.length<25){const c=p.cells.find(c=>!c.dead&&c.mass+1e-7>=this.massLimits().split);if(!c)break;if(!this.splitCell(p,c,p.aim,(count%3-1)*.3))break;count++}if(count)this.events.push({type:'autosplit',id:p.id,threshold:this.massLimits().split,cells:p.cells.length});return count}
 growthCapacity(p){const capacity=Math.max(0,Math.min(this.massLimits().total-p.cells.reduce((n,c)=>n+c.mass,0),p.cells.reduce((n,c)=>n+Math.max(0,this.massLimits().maxCell-c.mass),0)+(25-p.cells.length)*this.massLimits().maxCell));return capacity<1e-7?0:capacity;}
 separateCells(p){
  for(let pass=0;pass<(p.cells.length>8?6:3);pass++)for(let a=0;a<p.cells.length;a++)for(let b=a+1;b<p.cells.length;b++){
   const c=p.cells[a],v=p.cells[b];if(c.dead||v.dead)continue;let dx=v.x-c.x,dy=v.y-c.y,d=Math.hypot(dx,dy),rr=radius(c.mass)+radius(v.mass);
   if(d<.01){const angle=(c.id*2.399963+v.id)%(Math.PI*2);dx=Math.cos(angle);dy=Math.sin(angle);d=0}else{dx/=d;dy/=d}
   const ready=this.time>c.mergeAt&&this.time>v.mergeAt;
   if(ready&&d<rr*.97&&c.mass+v.mass<this.massLimits().split){const total=c.mass+v.mass;c.x=(c.x*c.mass+v.x*v.mass)/total;c.y=(c.y*c.mass+v.y*v.mass)/total;c.mass=total;v.dead=true;continue}
   const target=rr*(ready?.94:1.015);if(d<target){const push=(target-d)*.8,total=c.mass+v.mass;c.x-=dx*push*v.mass/total;c.y-=dy*push*v.mass/total;v.x+=dx*push*c.mass/total;v.y+=dy*push*c.mass/total;}
  }
  p.cells=p.cells.filter(c=>!c.dead);for(const c of p.cells){const r=radius(c.mass);c.x=clamp(c.x,0,this.size);c.y=clamp(c.y,0,this.size)}
 }
 rememberPeak(p){const score=Math.floor(p.cells.reduce((n,c)=>n+c.mass,0)+1e-7);if(score>this.peak){this.peak=score;this.peakName=p.name;this.peakOwner=p.id;this.peakAt=this.time;this.roundRecord=true;}return score}

 gold(p,kind,units=1){const cooldown=50;units*=this.rates().gold;if(!p||p.spectator||!p.cells.length||!['small','big'].includes(kind)||this.config.mode==='nogold'||this.time-(p[kind==='big'?'lastGoldBig':'lastGoldSmall']??-Infinity)<cooldown)return false;const wallet=isMmaRoom(this.room)?'mmaGold':this.config.mode==='special'?'bonus':'gold',baseCost=kind==='big'?100:10,baseMass=kind==='big'?250:50;const capacity=this.growthCapacity(p);if(capacity<=0)return false;units=Math.min(units,Math.floor(p[wallet]/baseCost),Math.ceil(capacity/baseMass));if(units<1)return false;const cost=baseCost*units,mass=baseMass*units;p[wallet]-=cost;p.lastGold=this.time;p[kind==='big'?'lastGoldBig':'lastGoldSmall']=this.time;this.growEvenly(p,Math.min(capacity,mass));p.spent=(p.spent||0)+cost;if(!isMmaRoom(this.room)&&this.goldToPrize)this.prize+=cost;return true}
 eject(p){if(this.time-p.lastFeed<this.rates().feedMs)return false;p.lastFeed=this.time;let done=false;for(const c of p.cells){if(c.mass<40||this.items.length>2200)continue;c.mass-=12;const a=Math.atan2(p.aim.y-c.y,p.aim.x-c.x),r=radius(c.mass);this.spawn('eject',c.x+Math.cos(a)*(r+14),c.y+Math.sin(a)*(r+14),{owner:p.id,vx:Math.cos(a)*650,vy:Math.sin(a)*650,until:this.time+9000,color:p.color});done=true}return done}
 burst(p,c){const slots=25-p.cells.length;if(!slots||c.mass<210)return;const n=Math.min(slots,Math.floor(c.mass/35)-1);if(n<1)return;const each=c.mass/(n+1);c.mass=each;c.mergeAt=this.time+14000;for(let i=0;i<n;i++){const a=i/n*Math.PI*2;const v=this.cell(p,each,c.x,c.y);v.vx=Math.cos(a)*650;v.vy=Math.sin(a)*650;v.mergeAt=this.time+14000;p.cells.push(v)}this.events.push({type:'burst',id:p.id})}
 growEvenly(p,amount){
  let remaining=Math.min(amount,this.growthCapacity(p)),target=remaining;this.autoSplit(p);
  while(remaining>1e-7){const cap=p.cells.length<25?this.massLimits().split:this.massLimits().maxCell,eligible=p.cells.filter(c=>c.mass<cap-1e-7);if(!eligible.length)break;const share=remaining/eligible.length;let used=0;for(const c of eligible){const add=Math.min(share,cap-c.mass);c.mass+=add;used+=add;}remaining-=used;this.autoSplit(p);if(used<=1e-7)break;}
  p.score=this.rememberPeak(p);p.max=Math.max(p.max,p.score);p.lifePeak=Math.max(p.lifePeak||0,p.score);return target-remaining;
 }
 addMass(p,amount){if(!p||p.spectator||!p.cells.length||!Number.isSafeInteger(amount)||amount<1)return 0;return this.growEvenly(p,amount)}

 runSummary(p){return {score:Math.floor(p.lifePeak||0),kills:Math.max(0,p.kills-(p.lifeKills||0)),food:Math.max(0,p.food-(p.lifeFood||0)),goldSpent:Math.max(0,(p.spent||0)-(p.lifeSpent||0)),seconds:Math.max(0,Math.floor((this.time-(p.lifeStart??this.time))/1000))}}
 center(p){let total=0,x=0,y=0;for(const c of p?.cells||[]){total+=c.mass;x+=c.x*c.mass;y+=c.y*c.mass}return{x:total?x/total:this.size/2,y:total?y/total:this.size/2,mass:total}}
 step(seconds=0.05,wallNow){const start=globalThis.performance?.now?.()||0;const dt=clamp(seconds,0.001,0.1);this.time=Number.isFinite(wallNow)?wallNow:this.time+dt*1000;this.frame++;this.events=[];
  if(this.time>=this.roundEnd){const ranked=this.ranking();this.winner=ranked[0]||null;if(this.winner){const p=this.players.get(this.winner.id);p.wins++;if(!isMmaRoom(this.room))p[this.config.mode==='special'?'bonus':'gold']+=this.prize;this.events.push({type:'round',winner:{...this.winner,skin:p.skin,color:p.color},prize:this.prize,room:this.room,round:this.round,isRecord:this.winner.score>this.finishedRecord,recordScore:Math.max(this.finishedRecord,this.winner.score)})}this.roundReplayFinal=this.winner?this.snapshot(this.winner.id,{w:10000,h:10000}):null;if(this.winner)this.finishedRecord=Math.max(this.finishedRecord,this.winner.score);this.roundRecord=false;this.prize=this.basePrize;this.round++;this.roundStart=this.time;this.roundEnd=this.time+this.config.minutes*60000;if(this.continuous){const timing=roomTiming(this.room,this.time);this.roundStart=timing.startsAt;this.roundEnd=timing.endsAt;}this.bossHealth=10000;for(const p of this.players.values())if(!p.spectator)this.respawn(p)}
  const grid=new Grid();for(const v of this.items){if(v.until&&v.until<this.time)v.dead=true;if(v.vx||v.vy){const edge=v.type==='virus'?VIRUS_RADIUS:0;v.x=clamp(v.x+(v.vx||0)*dt,edge,this.size-edge);v.y=clamp(v.y+(v.vy||0)*dt,edge,this.size-edge);const drag=Math.pow(v.type==='virus'?.08:.04,dt);v.vx=(v.vx||0)*drag;v.vy=(v.vy||0)*drag;if(v.shotUntil&&this.time>=v.shotUntil){v.vx=0;v.vy=0}}if(!v.dead)grid.put(v)}
  this.feedViruses(grid);
  for(const p of this.players.values()){
   if(isMmaRoom(this.room)&&this.time>=p.mmaRenewsAt){p.mmaGold=80000000;p.mmaRenewsAt+= (Math.floor((this.time-p.mmaRenewsAt)/18000000)+1)*18000000;}
   if(p.bot&&!p.cells.length&&(!p.boss||this.bossHealth>0)&&Math.random()<dt/3)this.respawn(p);if(!p.cells.length||p.spectator)continue;
   if(p.bot&&this.frame%12===0){const c=p.cells[0];let target=this.items.filter(x=>x.type==='food'&&!x.dead).reduce((best,v)=>!best||Math.hypot(v.x-c.x,v.y-c.y)<Math.hypot(best.x-c.x,best.y-c.y)?v:best,null);if(target)p.aim={x:target.x,y:target.y};if(p.boss){const h=[...this.players.values()].find(x=>!x.bot&&x.cells.length);if(h)p.aim=this.center(h)}}
   if(!p.bot&&this.time-p.lastInput>5000){if(!p.holdPersistent)p.hold='';p.feed=false}if(p.splitQueue?.length&&this.time-p.lastSplit>=this.rates().splitMs){const queued=p.splitQueue.shift();if(this.time-queued.at<=500)this.split(p,true,queued.aim)}if(p.hold==='both'){this.gold(p,'small');this.gold(p,'big')}else if(p.hold)this.gold(p,p.hold);if(p.feed)this.eject(p);
   const groupCenter=this.center(p),parked=Math.hypot(p.aim.x-groupCenter.x,p.aim.y-groupCenter.y)<Math.max(20,radius(groupCenter.mass)*.4);
   for(const c of p.cells.slice()){
    let dx=p.aim.x-c.x,dy=p.aim.y-c.y,d=parked&&this.time<c.mergeAt?0:Math.hypot(dx,dy);const r=radius(c.mass),speed=clamp(250/Math.pow(c.mass/100,.18),25,270);if(d>2){const f=Math.min(d,speed*dt*(this.config.mode==='boost'?1.3:1));c.x+=dx/d*f;c.y+=dy/d*f}c.x=clamp(c.x+c.vx*dt,0,this.size);c.y=clamp(c.y+c.vy*dt,0,this.size);c.vx*=Math.pow(.025,dt);c.vy*=Math.pow(.025,dt);if(c.mass>100)c.mass=Math.max(100,c.mass*(1-dt*.002));
    if(this.config.mode==='area'){const safe=Math.max(600,this.size*.55*(1-(this.time-this.roundStart)/(this.roundEnd-this.roundStart))+.05*this.size);if(Math.hypot(c.x-this.size/2,c.y-this.size/2)>safe)c.mass*=1-dt*.35}
    for(const v of grid.query(c.x,c.y,r+50)){if(v.dead)continue;const dist=Math.hypot(c.x-v.x,c.y-v.y);if(dist>r)continue;if(v.type==='virus'){if(c.mass>210){v.dead=true;c.mass=Math.min(this.massLimits().maxCell,c.mass+Math.min(100,this.growthCapacity(p)));this.burst(p,c);p.food++}}else if(p.boss&&v.type==='eject'&&v.owner!==p.id){v.dead=true;this.bossHealth-=400;if(this.bossHealth<=0){p.cells=[];const killer=this.players.get(v.owner);if(killer){killer.gold+=50000;this.events.push({type:'boss',winner:killer.name})}}}else if(v.type==='eject'&&v.owner===p.id&&v.until-this.time>8000){}else{v.dead=true;c.mass=Math.min(this.massLimits().maxCell,c.mass+v.mass);p.food++}}
   }
   this.autoSplit(p);this.separateCells(p);
   p.cells=p.cells.filter(c=>!c.dead);p.score=this.rememberPeak(p);p.max=Math.max(p.max,p.score);p.lifePeak=Math.max(p.lifePeak||0,p.score);if(!isMmaRoom(this.room)&&!p.bot&&p.score>1000){p.earned=(p.earned||0)+dt;if(p.earned>=1){p.gold+=Math.floor(p.earned);p.earned%=1}}
  }
  const cells=new Grid(400);for(const p of this.players.values())for(const c of p.cells)cells.put(c);
  for(const p of this.players.values())for(const c of p.cells){for(const b of cells.query(c.x,c.y,radius(c.mass)+80)){if(b.dead||c.dead||b.owner===c.owner)continue;const q=this.players.get(b.owner);if(this.config.mode==='team'&&p.team&&p.team===q.team)continue;if(c.mass>b.mass*1.2&&Math.hypot(c.x-b.x,c.y-b.y)<radius(c.mass)-radius(b.mass)*.35){c.mass=Math.min(this.massLimits().maxCell,c.mass+b.mass);b.dead=true;if(q.cells.filter(z=>!z.dead).length===0){p.kills++;this.events.push({type:'death',id:q.id,killer:p.name,score:q.lifePeak,summary:this.runSummary(q)})}}}}
  for(const p of this.players.values()){p.cells=p.cells.filter(c=>!c.dead);if(this.autoSplit(p))this.separateCells(p);p.score=this.rememberPeak(p);p.max=Math.max(p.max,p.score);p.lifePeak=Math.max(p.lifePeak||0,p.score);if(!p.cells.length){p.hold='';p.holdPersistent=false;p.feed=false;p.splitQueue=[]}}
  this.items=this.items.filter(v=>!v.dead);if(this.frame%4===0){const foods=this.items.filter(v=>v.type==='food').length;if(foods<450)for(let i=0;i<Math.min(8,450-foods);i++)this.spawn('food');if(this.config.mode!=='boss')this.replenishVirus()}
  this.tickMs=(globalThis.performance?.now?.()||start)-start;
 }
 ranking(){return[...this.players.values()].filter(p=>p.cells.length&&!p.spectator).map(p=>({id:p.id,name:p.name,score:Math.floor(p.cells.reduce((s,c)=>s+c.mass,0)),bot:p.bot,mobile:p.mobile,skin:p.skin,color:p.color,team:p.team,clanId:p.clanId||null})).sort((a,b)=>b.score-a.score)}
 snapshot(id,view={w:2000,h:1500}){const self=this.players.get(id),watch=self?.spectator?this.players.get(self.spectateId):null,target=self?.cells.length?self:watch?.cells.length&&!watch.spectator?watch:this.players.get(this.ranking()[0]?.id),center=this.center(target);const w=clamp(Number(view.w)||2000,400,10000),h=clamp(Number(view.h)||1500,300,10000);const visible=(x,y,r=100)=>Math.abs(x-center.x)<w/2+r&&Math.abs(y-center.y)<h/2+r;return{type:'state',allyMarkers:allyMarkers(this.players.values(),self,p=>this.center(p)),massLimits:this.massLimits(),boost:this.rates(),room:this.room,prize:this.prize,following:self?.spectator&&target?{id:target.id,name:target.name}:null,mode:this.config.mode,size:this.size,timeLeft:Math.max(0,Math.ceil((this.roundEnd-this.time)/1000)),serverTime:this.time,players:[...this.players.values()].filter(p=>p.cells.length).map(p=>({id:p.id,name:p.name,bot:p.bot,mobile:p.mobile,boss:p.boss,color:p.color,skin:p.skin,team:p.team,clanId:p.clanId||null,clan:p.clanName||'',premiumUntil:p.premiumUntil||0,equipped:p.equipped||'',look:p.look||{},enteredAt:p.joinedAt,cells:wireCells(p.cells.filter(c=>p.id===id||visible(c.x,c.y,radius(c.mass))))})).filter(p=>p.cells.length),items:this.items.filter(v=>visible(v.x,v.y)).map(v=>({id:v.id,type:v.type,x:Math.round(v.x),y:Math.round(v.y),mass:v.mass,color:v.color})),self:self?{id:self.id,team:self.team,clanId:self.clanId||null,goldSpent:self.spent||0,roomGold:isMmaRoom(this.room)?self.mmaGold:null,roomGoldRenewsAt:isMmaRoom(this.room)?self.mmaRenewsAt:null,gold:self.gold,bonus:self.bonus,score:self.score,max:self.max,cells:self.cells.length,goldBoostMultiplier:this.rates().gold,kills:self.kills,food:self.food,run:this.runSummary(self)}:null,ranking:this.ranking().slice(0,10),humans:[...this.players.values()].filter(p=>!p.bot&&!p.spectator).length,bots:[...this.players.values()].filter(p=>p.bot).length,spectators:[...this.players.values()].filter(p=>!p.bot&&p.spectator).length,premiumPlayers:[...this.players.values()].filter(p=>!p.bot&&!p.spectator&&p.cells.length&&p.premiumUntil>this.time).length,viruses:this.items.filter(x=>x.type==='virus').length,bossHealth:this.config.mode==='boss'?Math.max(0,this.bossHealth):null,areaRadius:this.config.mode==='area'?Math.max(600,this.size*.55*(1-(this.time-this.roundStart)/(this.roundEnd-this.roundStart))+.05*this.size):null,winner:this.winner,events:this.events,tickMs:Math.round(this.tickMs*100)/100}}
}
