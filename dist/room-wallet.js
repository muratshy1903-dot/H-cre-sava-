export const MMA_GOLD=80000000;
export const MMA_RENEW_MS=5*60*60*1000;
// Stored inside the account profile, never in the transferable Gold/Bonus wallets.
export function mmaWallet(profile,now=Date.now()){
 let w=profile.mmaWallet;
 if(!w||!Number.isSafeInteger(w.balance)||w.balance<0||w.balance>MMA_GOLD||!Number.isSafeInteger(w.renewsAt))w=profile.mmaWallet={balance:MMA_GOLD,renewsAt:now+MMA_RENEW_MS};
 if(now>=w.renewsAt){w.balance=MMA_GOLD;w.renewsAt+=(Math.floor((now-w.renewsAt)/MMA_RENEW_MS)+1)*MMA_RENEW_MS;}
 return w;
}
