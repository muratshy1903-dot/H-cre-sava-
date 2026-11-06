// Original Agarm game. All amounts are integer in-game currency.
export const CRYSTAL_BETS = [100, 500, 1000, 5000];
export const CRYSTALS = [
  {id:'leaf',name:'Yaprak',icon:'❧',color:'#4dcc9a',weight:4,rate:25},
  {id:'drop',name:'Damla',icon:'◆',color:'#65bafa',weight:4,rate:30},
  {id:'sun',name:'Güneş',icon:'✺',color:'#ffd16e',weight:4,rate:40},
  {id:'bloom',name:'Çiçek',icon:'✿',color:'#f796ba',weight:3,rate:50},
  {id:'moon',name:'Ay',icon:'☾',color:'#bba0ff',weight:3,rate:75},
  {id:'crown',name:'Taç',icon:'♛',color:'#ffad76',weight:2,rate:100},
  {id:'star',name:'Bonus yıldızı',icon:'✦',color:'#fff1ab',weight:1,rate:0}
];
export const CRYSTAL_RULES = {columns:5,rows:4,match:6,maxCascades:5,maxMultiplier:5,bonusTurns:3,maxPayoutRate:100};
