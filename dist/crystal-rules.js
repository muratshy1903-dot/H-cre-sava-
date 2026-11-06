// Original Agarm art and economy; all currency stays inside the game.
export const CRYSTAL_BETS = [100,500,1000,5000,10000,50000,100000,500000,1000000,5000000];
export const CRYSTALS = [
  {id:'leaf',name:'Yaprak',icon:'❧',color:'#4dcc9a',weight:12,rate:25},
  {id:'drop',name:'Damla',icon:'◆',color:'#65bafa',weight:12,rate:30},
  {id:'sun',name:'Güneş',icon:'✺',color:'#ffd16e',weight:12,rate:40},
  {id:'bloom',name:'Çiçek',icon:'✿',color:'#f796ba',weight:12,rate:50},
  {id:'moon',name:'Ay',icon:'☾',color:'#bba0ff',weight:12,rate:75},
  {id:'crown',name:'Taç',icon:'♛',color:'#ffad76',weight:12,rate:100},
  {id:'ruby',name:'Yakut',icon:'⬟',color:'#ff718b',weight:12,rate:150},
  {id:'crystal',name:'Kristal',icon:'✧',color:'#baf3ff',weight:12,rate:200},
  {id:'star',name:'Bonus yıldızı',icon:'✦',color:'#fff1ab',weight:3,rate:0}
];
export const CRYSTAL_MULTIPLIERS = [{value:2,weight:600},{value:3,weight:200},{value:5,weight:100},{value:10,weight:50},{value:25,weight:30},{value:50,weight:10},{value:100,weight:6},{value:250,weight:3},{value:500,weight:1}];
export const CRYSTAL_RULES = {version:2,columns:6,rows:5,match:8,maxPayoutRate:5000,bonusTurns:15,retriggerTurns:5,targetRtp:90,payScale:0.88};
export const crystalPayRate=(symbol,count)=>symbol.rate/100*CRYSTAL_RULES.payScale*(count>=12?4:count>=10?2:1);

export const CRYSTAL_RTP_CHECK = {"rounds":20000000,"measuredRtp":90.13479079999446,"ci95":[89.58907673602837,90.68050486396055],"bet":100000,"seed":20261109};
