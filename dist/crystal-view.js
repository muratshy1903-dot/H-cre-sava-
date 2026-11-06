import {CRYSTALS,CRYSTAL_BETS,CRYSTAL_RULES,CRYSTAL_RTP_CHECK,crystalPayRate} from './crystal-rules.js';
const fmt=n=>Number(n||0).toLocaleString('tr-TR');
const walletName=w=>w==='bonus'?'Bonus Gold':'Normal Gold';
const gem=id=>{if(id.startsWith('orb-'))return `<span class="crystal-orb" aria-label="${Number(id.slice(4))} kat çarpan">${Number(id.slice(4))}×</span>`;const s=CRYSTALS.find(x=>x.id===id)||CRYSTALS[0];return `<span class="crystal-gem" style="--gem:${s.color}" aria-label="${s.name}">${s.icon}</span>`;};
export const crystalHTML=()=>`<section class="crystal-game" id="crystal-game">
  <header class="crystal-heading"><div><small>AGARM · TAKLA VE BONUS TURLARI</small><h2>Kristal Bahçesi</h2><p>Eşleşmeler sürsün, çarpanlar biriksin.</p></div><span class="crystal-emblem" aria-hidden="true">✿</span></header>
  <div class="crystal-wallets"><div><small>NORMAL GOLD</small><strong data-crystal-gold>—</strong></div><div><small>BONUS GOLD</small><strong data-crystal-bonus>—</strong></div></div>
  <div class="crystal-feature" data-crystal-feature>Azami tur bedeli 5.000.000 · Azami toplam ödül 5.000×</div>
  <div class="crystal-board" aria-label="Altı sütun, beş satırlık sembol alanı">${Array.from({length:30},(_,i)=>gem(CRYSTALS[i%6].id)).join('')}</div>
  <p class="crystal-result" role="status" aria-live="polite">Bakiyen yükleniyor…</p>
  <form class="crystal-controls"><label>Bakiye<select name="wallet"><option value="gold">Normal Gold</option><option value="bonus">Bonus Gold</option></select></label><label>Tur bedeli<select name="bet">${CRYSTAL_BETS.map(b=>`<option value="${b}">${fmt(b)}</option>`).join('')}</select></label><button class="crystal-play" disabled>Bir tur oyna</button></form>
  <div class="crystal-options"><button type="button" data-free-auto aria-pressed="false" disabled>Ücretsiz turları otomatik sürdür</button><label><input type="checkbox" data-crystal-fast> Hızlı sonuç</label></div>
  <p class="crystal-note">Yalnızca oyun içi puan. Para yatırma, para çekme ve gerçek ödül yok. Sonuçlar rastgeledir; tur bedelini kaybedebilirsin. Hedef RTP %90’dır; kısa bir oturumda %90 geri ödeme garantisi değildir.</p>
  <details class="crystal-rules"><summary>Takla, çarpan, free spin ve RTP kuralları</summary><p>6 × 5 alanda aynı sembolden herhangi 8 veya fazlası eşleşir. Eşleşenler silinir, üsttekiler düşer. Yeni eşleşme varsa takla devam eder; sabit takla sayısı sınırı yoktur. Eşleşme kalmayınca veya azami ödüle ulaşınca tur biter.</p>
  <div class="crystal-paytable"><div>Sembol</div><b>8–9</b><b>10–11</b><b>12+</b>${CRYSTALS.filter(s=>s.rate).map(s=>`<span>${gem(s.id)} ${s.name}</span>${[8,10,12].map(n=>`<span>${crystalPayRate(s,n).toLocaleString('tr-TR',{maximumFractionDigits:6})}×</span>`).join('')}`).join('')}</div>
  <p>Taklaların sembol kazançları toplanır. Alandaki 2×–500× çarpan kürelerinin değerleri toplanır ve takla toplamına bir kez uygulanır. Küre tek başına ödeme yapmaz.</p><p>4 / 5 / 6+ yıldız, çarpan uygulanmadan 3× / 5× / 100× ödeme yapar. Normal turda en az 4 yıldız, 15 ücretsiz tur açar. Ücretsiz turlarda en az 3 yıldız +5 tur ekler. Kazançlı ücretsiz turdaki küreler bonus çarpanına eklenir; bu çarpan sonraki ücretsiz turlara taşınır ve yeni küre gelen kazançlı turda uygulanır. Yeni küre gelmezse sembol kazancı çarpansız ödenir. Kazançsız turdaki küre birikmez.</p><p>Normal tur ve açtığı tüm ücretsiz turların toplam ödülü en fazla ilk tur bedelinin 5.000 katıdır. Sınıra ulaşınca kalan ücretsiz turlar iptal edilir ve bonus kapanır. 5 milyonluk turda üst sınır 25 milyar Gold’dur. Bakiye ve bedel ücretsiz turlar bitene kadar değişmez.</p><p>RTP, normal ve ücretsiz turlar birlikte değerlendirilerek uzun vadeli hedef olarak ayarlanır. ${fmt(CRYSTAL_RTP_CHECK.rounds)} ücretli tur ve bütün bonus turlarını içeren bağımsız simülasyonda ölçülen RTP %${CRYSTAL_RTP_CHECK.measuredRtp.toLocaleString('tr-TR',{maximumFractionDigits:2})}; yaklaşık %95 güven aralığı %${CRYSTAL_RTP_CHECK.ci95.map(n=>n.toLocaleString('tr-TR',{maximumFractionDigits:2})).join('–%')}. Bu ölçüm, kesin teorik RTP veya bağımsız sertifika değildir. Sonuçlar hesap veya bakiyeye göre değiştirilmez. Otomatik oynatma düğmesi yalnızca kazanılmış ücretsiz turları sürdürür; normal ücretli tur başlatmaz.</p></details>
  <h3>Son 20 tur</h3><div class="crystal-history" aria-live="polite"></div>
</section>`;

export async function mountCrystal(root,{profile,updateProfile}){
  const form=root.querySelector('form'),button=form.querySelector('button'),status=root.querySelector('.crystal-result'),board=root.querySelector('.crystal-board');
  const storageKey='agarm_crystal_pending_'+profile.id;
  let state,busy=false,pending,autoFree=false,autoTimer;
  const autoButton=root.querySelector('[data-free-auto]');
  const stopAuto=()=>{autoFree=false;clearTimeout(autoTimer);autoButton.setAttribute('aria-pressed','false');autoButton.textContent='Ücretsiz turları otomatik sürdür';autoButton.disabled=!state?.bonus;};
  autoButton.onclick=event=>{event.stopPropagation();if(autoFree){stopAuto();return;}if(!state?.bonus)return;autoFree=true;autoButton.setAttribute('aria-pressed','true');autoButton.textContent='Otomatik ücretsiz turları durdur';if(!busy)form.requestSubmit();};
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
    autoButton.disabled=!next.bonus&&!autoFree;
    root.querySelector('[data-crystal-feature]').textContent=next.bonus?`${next.bonus.remaining} ücretsiz tur · Biriken çarpan ${next.bonus.multiplier||0}× · Bonus toplamı ${fmt(next.bonus.won||0)} / ${fmt(next.bonus.bet*CRYSTAL_RULES.maxPayoutRate)}`:'Azami tur bedeli 5.000.000 · Azami toplam ödül 5.000×';
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
      for(const frame of next.round.frames){if(!root.isConnected)break;board.innerHTML=frame.grid.map((id,i)=>`<div class="${frame.cleared.includes(i)?'crystal-match':''}">${gem(id)}</div>`).join('');status.textContent=`Takla toplamı ${fmt(frame.total??frame.win)} · Çarpan ${frame.multiplier||1}×`;if(!root.querySelector('[data-crystal-fast]').checked)await new Promise(resolve=>setTimeout(resolve,350));}
      const r=next.round;
      status.textContent=`${r.payout?'Ödül: '+fmt(r.payout)+' '+walletName(r.wallet)+(r.multiplier>1?' · '+r.multiplier+'× çarpan':''):'Bu turda eşleşme yok.'} · Net ${r.net>0?'+':''}${fmt(r.net)}${r.bonusAwarded?' · +'+r.bonusAwarded+' ücretsiz tur!':r.remaining?' · '+r.remaining+' ücretsiz tur kaldı.':''}`;
      if(r.capped)status.textContent+=' · 5.000× azami ödüle ulaşıldı; bonus tamamlandı.';
      state=next;
    }catch(e){stopAuto();if(e.status&&e.status<500)remember(null);status.textContent=e.message+(pending?' Sonucu aynı tur kimliğiyle tekrar kontrol edebilirsin.':'');}
    finally{busy=false;board.classList.remove('crystal-busy');render(state);if(autoFree&&state.bonus&&root.isConnected)autoTimer=setTimeout(()=>{if(autoFree&&!busy&&root.isConnected)form.requestSubmit();},1000);else if(!state.bonus||!root.isConnected)stopAuto();}
  };
}
