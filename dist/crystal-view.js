import {CRYSTALS,CRYSTAL_BETS} from './crystal-rules.js';
const fmt=n=>Number(n||0).toLocaleString('tr-TR');
const walletName=w=>w==='bonus'?'Bonus Gold':'Normal Gold';
const gem=id=>{const s=CRYSTALS.find(x=>x.id===id)||CRYSTALS[0];return `<span class="crystal-gem" style="--gem:${s.color}" aria-label="${s.name}">${s.icon}</span>`;};
export const crystalHTML=()=>`<section class="crystal-game" id="crystal-game">
  <header class="crystal-heading"><div><small>AGARM · MİNİ OYUN</small><h2>Kristal Bahçesi</h2><p>Kristaller düşsün, bahçen parlasın.</p></div><span class="crystal-emblem" aria-hidden="true">✿</span></header>
  <div class="crystal-wallets"><div><small>NORMAL GOLD</small><strong data-crystal-gold>—</strong></div><div><small>BONUS GOLD</small><strong data-crystal-bonus>—</strong></div></div>
  <div class="crystal-board" aria-label="Beş sütun, dört satırlık sembol alanı">${Array.from({length:20},(_,i)=>gem(CRYSTALS[i%6].id)).join('')}</div>
  <p class="crystal-result" role="status" aria-live="polite">Bakiyen yükleniyor…</p>
  <form class="crystal-controls"><label>Bakiye<select name="wallet"><option value="gold">Normal Gold</option><option value="bonus">Bonus Gold</option></select></label><label>Tur bedeli<select name="bet">${CRYSTAL_BETS.map(b=>`<option value="${b}">${fmt(b)}</option>`).join('')}</select></label><button class="crystal-play" disabled>Bir tur oyna</button></form>
  <p class="crystal-note">Yalnızca oyun içi puan. Para yatırma, para çekme ve gerçek ödül yok. Sonuçlar rastgeledir; tur bedelini kaybedebilirsin.</p>
  <details class="crystal-rules"><summary>Nasıl oynanır ve ödüller</summary><p>Aynı sembolden alanın herhangi bir yerinde 6 veya fazlası eşleşir. Eşleşenler silinir, üsttekiler düşer. Bir turda en fazla 5 sonuç değerlendirilir.</p><div class="crystal-payouts">${CRYSTALS.filter(s=>s.rate).map(s=>`<span>${gem(s.id)} 6 adet: ${(s.rate/100).toLocaleString('tr-TR')}×</span>`).join('')}</div><p>Her 6’lı grup için tabloda yazan katsayı tur bedeline uygulanır. Kazançlı turda %10 ihtimalle eşit olasılıklı 2×, 3× veya 5× çarpan gelir. Tur başına toplam ödül en fazla bedelin 100 katıdır.</p><p>Bir sonuçta 3 bonus yıldızı ✦, 3 ücretsiz tur açar. Bu turlar aynı bakiye ve bedelle oynanır; yeniden bonus açmaz. Kazanç seçilen bakiyeye eklenir. Otomatik oynatma yoktur.</p></details>
  <h3>Son 20 tur</h3><div class="crystal-history" aria-live="polite"></div>
</section>`;

export async function mountCrystal(root,{profile,updateProfile}){
  const form=root.querySelector('form'),button=form.querySelector('button'),status=root.querySelector('.crystal-result'),board=root.querySelector('.crystal-board');
  const storageKey='agarm_crystal_pending_'+profile.id;
  let state,busy=false,pending;
  try{pending=JSON.parse(sessionStorage.getItem(storageKey));}catch{}
  if(!pending||!['gold','bonus'].includes(pending.wallet)||!CRYSTAL_BETS.includes(pending.bet)||typeof pending.requestId!=='string')pending=null;
  const remember=value=>{pending=value;try{if(value)sessionStorage.setItem(storageKey,JSON.stringify(value));else sessionStorage.removeItem(storageKey);}catch{}};
  async function call(data){const res=await fetch('/api/crystal',{method:data?'POST':'GET',credentials:'same-origin',headers:data?{'content-type':'application/json'}:{},body:data?JSON.stringify(data):undefined});const payload=await res.json();if(!res.ok){const e=Error(payload.error||'İşlem tamamlanamadı.');e.status=res.status;throw e;}return payload;}
  function render(next){
    state=next;updateProfile(next.user);
    root.querySelector('[data-crystal-gold]').textContent=fmt(next.user.gold);
    root.querySelector('[data-crystal-bonus]').textContent=fmt(next.user.bonus);
    const locked=pending||next.bonus;
    if(locked){form.elements.wallet.value=locked.wallet;form.elements.bet.value=String(locked.bet);}
    form.elements.wallet.disabled=busy||!!locked;form.elements.bet.disabled=busy||!!locked;
    button.disabled=busy;button.textContent=busy?'Tur oynanıyor…':pending?'Bekleyen turu kontrol et':next.bonus?`Ücretsiz tur · ${next.bonus.remaining} kaldı`:'Bir tur oyna';
    root.querySelector('.crystal-history').innerHTML=next.history.length?next.history.map(r=>`<div class="crystal-history-row"><span>${new Date(r.at).toLocaleTimeString('tr-TR')} · ${walletName(r.wallet)}${r.free?' · Ücretsiz':''}</span><span>Bedel ${fmt(r.cost)} · Ödül ${fmt(r.payout)}</span><strong class="${r.net>0?'positive':''}">${r.net>0?'+':''}${fmt(r.net)}</strong></div>`).join(''):'<p>Henüz tur oynamadın.</p>';
  }
  try{render(await call());status.textContent=pending?'Önceki turun sonucu kontrol edilmeyi bekliyor. Aynı tur tekrar ücretlendirilmez.':state.bonus?`${state.bonus.remaining} ücretsiz turun hazır. Bakiye ve tur bedeli bu turlar bitince değiştirilebilir.`:'Hazırsan bakiyeni ve tur bedelini seç.';if(state.history.length)board.innerHTML=state.history[0].frames.at(-1).grid.map(gem).join('');}
  catch(e){status.textContent=e.message+' Bölümü yeniden açarak tekrar dene.';return;}
  form.onsubmit=async event=>{
    event.preventDefault();event.stopPropagation();if(busy)return;busy=true;
    if(!pending)remember({requestId:Array.from(crypto.getRandomValues(new Uint8Array(16)),n=>n.toString(16).padStart(2,'0')).join(''),wallet:form.elements.wallet.value,bet:Number(form.elements.bet.value)});
    render(state);status.textContent='Tur hesaplanıyor…';board.classList.add('crystal-busy');
    try{
      const next=await call(pending);remember(null);
      for(const frame of next.round.frames){if(!root.isConnected)break;board.innerHTML=frame.grid.map((id,i)=>`<div class="${frame.cleared.includes(i)?'crystal-match':''}">${gem(id)}</div>`).join('');await new Promise(resolve=>setTimeout(resolve,350));}
      const r=next.round;
      status.textContent=`${r.payout?'Ödül: '+fmt(r.payout)+' '+walletName(r.wallet)+(r.multiplier>1?' · '+r.multiplier+'× çarpan':''):'Bu turda eşleşme yok.'} · Net ${r.net>0?'+':''}${fmt(r.net)}${r.bonusAwarded?' · 3 ücretsiz tur kazandın!':r.remaining?' · '+r.remaining+' ücretsiz tur kaldı.':''}`;
      state=next;
    }catch(e){if(e.status&&e.status<500)remember(null);status.textContent=e.message+(pending?' Sonucu aynı tur kimliğiyle tekrar kontrol edebilirsin.':'');}
    finally{busy=false;board.classList.remove('crystal-busy');render(state);}
  };
}
