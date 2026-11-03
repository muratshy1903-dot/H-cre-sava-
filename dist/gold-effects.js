// Receipts preserve individual A/S charges even when several arrive in one state.
export function goldCharges(previous,next){
 if(!previous?.self||!next?.self||previous.room!==next.room||previous.self.id!==next.self.id)return [];
 const before=previous.self,after=next.self;
 if(Number.isSafeInteger(after.goldReceiptSeq)&&Array.isArray(after.goldReceipts)){
  const seq=before.goldReceiptSeq||0;
  if(after.goldReceiptSeq<seq)return [];
  return after.goldReceipts.filter(r=>Number.isSafeInteger(r.seq)&&r.seq>seq&&r.seq<=after.goldReceiptSeq&&Number.isSafeInteger(r.amount)&&r.amount>0).map(r=>r.amount);
 }
 const delta=(after.goldSpent||0)-(before.goldSpent||0);
 return delta>0?[delta]:[];
}
