export class CrystalAutoplay {
  active=false;
  remaining=0;
  lastId=null;
  start(count,wallet,bet){
    if(!Number.isSafeInteger(count)||count<1)throw Error('Otomatik tur sayısı pozitif bir tam sayı olmalı.');
    if(!['gold','bonus'].includes(wallet)||!Number.isSafeInteger(bet)||bet<1)throw Error('Geçerli bir bakiye ve bedel seç.');
    this.active=true;this.remaining=count;this.wallet=wallet;this.bet=bet;this.lastId=null;
  }
  record(round){
    if(!this.active||round.requestId===this.lastId)return;
    this.lastId=round.requestId;
    if(!round.free&&(round.kind||'spin')==='spin')this.remaining=Math.max(0,this.remaining-1);
  }
  next(bonus){return this.active&&(!!bonus||this.remaining>0);}
  stop(){this.active=false;}
}
