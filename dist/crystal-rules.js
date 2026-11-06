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
export const CRYSTAL_RULES = {version:3,columns:6,rows:5,match:8,maxPayoutRate:5000,bonusTurns:15,retriggerTurns:5,targetRtp:99.99,payScale:99.99/100.8543785,buyPriceRate:100};
export const crystalPayRate=(symbol,count,math=crystalMath())=>symbol.rate/100*math.payScale*(count>=12?4:count>=10?2:1);


// Baselines are measured with payScale=scatterScale=1, including complete bonus features.
export const CRYSTAL_NORMAL_BASE_RTP = 100.8543785;
export const CRYSTAL_BUY_BASE_RETURN = 22.767238349999673;
export const crystalMath=(targetRtp=CRYSTAL_RULES.targetRtp,mode='natural',revision=1)=>({version:3,targetRtp,mode,revision,payScale:mode==='buy'?crystalBuyScale(targetRtp):targetRtp/CRYSTAL_NORMAL_BASE_RTP,scatterScale:mode==='buy'?crystalBuyScale(targetRtp):targetRtp/CRYSTAL_NORMAL_BASE_RTP});
export const CRYSTAL_LEGACY_MATH = {version:2,targetRtp:90,mode:'natural',revision:0,payScale:0.88,scatterScale:1};

export const CRYSTAL_BUY_CURVE = [{"targetRtp":0,"scale":0},{"targetRtp":5,"scale":0.21961381187765028},{"targetRtp":10,"scale":0.43922762375672164},{"targetRtp":15,"scale":0.658841435635793},{"targetRtp":20,"scale":0.8784552475148644},{"targetRtp":25,"scale":1.098227851262834},{"targetRtp":30,"scale":1.3186669408511875},{"targetRtp":35,"scale":1.53977091185169},{"targetRtp":40,"scale":1.7618308639995917},{"targetRtp":45,"scale":1.9849981665785776},{"targetRtp":50,"scale":2.209281858593215},{"targetRtp":55,"scale":2.434712397122496},{"targetRtp":60,"scale":2.6616175726658753},{"targetRtp":65,"scale":2.890046629225651},{"targetRtp":70,"scale":3.1198916140326105},{"targetRtp":75,"scale":3.350994678727659},{"targetRtp":80,"scale":3.5835583310401375},{"targetRtp":85,"scale":3.817825968270938},{"targetRtp":90,"scale":4.053487479903595},{"targetRtp":95,"scale":4.290691674189873},{"targetRtp":99.99,"scale":4.528827702851856},{"targetRtp":100,"scale":4.529306285509449},{"targetRtp":105,"scale":4.769253774240667},{"targetRtp":110,"scale":5.01085001653081},{"targetRtp":115,"scale":5.254412147566256},{"targetRtp":120,"scale":5.499241040418212},{"targetRtp":125,"scale":5.745472783284811},{"targetRtp":130,"scale":5.992989462443177},{"targetRtp":135,"scale":6.241655377208133},{"targetRtp":140,"scale":6.491376048832365},{"targetRtp":145,"scale":6.742703580063392},{"targetRtp":150,"scale":6.995135658196716},{"targetRtp":155,"scale":7.2484717282847555},{"targetRtp":160,"scale":7.502803484705112},{"targetRtp":165,"scale":7.758155026449742},{"targetRtp":170,"scale":8.014771899711093},{"targetRtp":175,"scale":8.272439980349588},{"targetRtp":180,"scale":8.531134476622526},{"targetRtp":185,"scale":8.790935872976036},{"targetRtp":190,"scale":9.051923297666065},{"targetRtp":195,"scale":9.313932287498972},{"targetRtp":200,"scale":9.576950348018443}];
export function crystalBuyScale(target){
  if(target<=0)return 0;
  for(let i=1;i<CRYSTAL_BUY_CURVE.length;i++){const a=CRYSTAL_BUY_CURVE[i-1],b=CRYSTAL_BUY_CURVE[i];if(target<=b.targetRtp)return a.scale+(b.scale-a.scale)*(target-a.targetRtp)/(b.targetRtp-a.targetRtp);}
  return CRYSTAL_BUY_CURVE.at(-1).scale;
}
