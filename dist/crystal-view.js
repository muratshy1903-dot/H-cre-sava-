import {CrystalAutoplay} from './crystal-auto.js';
import {CRYSTALS,CRYSTAL_BETS,CRYSTAL_RULES,crystalPayRate,crystalMath} from './crystal-rules.js';
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
  <div class="crystal-buy"><button type="button" data-crystal-buy disabled>15 free spin satın al</button><strong data-buy-price>—</strong></div>
  <section class="crystal-buy-confirm" data-buy-confirm hidden><p data-buy-summary></p><button type="button" data-buy-accept>Bedeli öde ve 15 free spin aç</button><button type="button" data-buy-cancel>Vazgeç</button></section>
  <form class="crystal-autoplay" data-auto-form><label>Otomatik ücretli tur sayısı<input type="number" name="count" value="10" min="1" max="9007199254740991" step="1" required></label><button type="submit" data-auto-start disabled>Otomatik başlat</button><button type="button" data-auto-stop disabled>Durdur</button><span data-auto-status role="status">Bonus turları bu sayıya dahil değildir. Her ücretli turda bedel ayrıca düşer.</span></form>
  <div class="crystal-options"><button type="button" data-free-auto aria-pressed="false" disabled>Ücretsiz turları otomatik sürdür</button><label><input type="checkbox" data-crystal-fast> Hızlı sonuç</label></div>
  <p class="crystal-note">Yalnızca oyun içi puan. Para yatırma, para çekme ve gerçek ödül yok. Sonuçlar rastgeledir; tur bedelini kaybedebilirsin. <span data-rtp-note>Hedef RTP yükleniyor.</span> Kısa bir oturum için geri ödeme garantisi yoktur.</p>
  <details class="crystal-rules"><summary>Takla, çarpan, free spin ve RTP kuralları</summary><p>6 × 5 alanda aynı sembolden herhangi 8 veya fazlası eşleşir. Eşleşenler silinir, üsttekiler düşer. Yeni eşleşme varsa takla devam eder; sabit takla sayısı sınırı yoktur. Eşleşme kalmayınca veya azami ödüle ulaşınca tur biter.</p>
  <div class="crystal-paytable" data-paytable></div>
  <p>Takla kazançları toplanır. Alandaki 2×–500× kürelerin değerleri toplanır ve takla toplamına bir kez uygulanır. Küre tek başına ödeme yapmaz.</p><p>4 / 5 / 6+ yıldız ayrıca ödeme yapar; güncel değerler yukarıdaki tabloya bağlı RTP ayarıyla hesaplanır. Normal turda en az 4 yıldız 15 ücretsiz tur açar; ücretsiz turda en az 3 yıldız +5 tur verir. Kazançlı ücretsiz turdaki küreler bonus çarpanına eklenir. Birikmiş çarpan yeni küre gelen kazançlı turda uygulanır; küre gelmezse sembol kazancı çarpansız ödenir.</p>
  <p>15 free spin satın alma bedeli seçilen tur bedelinin 100 katıdır. Satın alınan bonus ayrı kalibrasyon ve ödül tablosu kullanır; aktif bonus tablosu ekranda gösterilir. Bedel seçilen bakiyeden bir kez düşer. Bonus bitmeden yeni paket alınamaz. Kazanç garantisi yoktur.</p>
  <p>Normal tur ve bağlı bütün ücretsiz turlar için toplam sınır 5.000× temel tur bedelidir. Satın alınan bonusta da sınır temel tur bedeline göre hesaplanır; paket ücretine göre değil. En yüksek bedelde sınır 25 milyar Gold’dur. Sınıra ulaşınca kalan ücretsiz turlar iptal edilir.</p>
  <p>RTP bir uzun vadeli hedeftir; kesin teorik oran veya sertifika değildir. Paneldeki yeni ayar yeni turlara uygulanır; açık bonusun ayarı korunur. Oyuncular aynı hedefte aynı kurallarla oynar. Otomatik oynatma sayısı ücretli ana turları sayar; kazanılan ücretsiz turlar ayrıca tamamlanır. Durdur, sonraki turları iptal eder; gönderilmiş tur sonuçlanır. Sayfayı kapatınca veya yenileyince otomatik oynatma durur.</p></details>
  <h3>Son 20 tur</h3><div class="crystal-history" aria-live="polite"></div>
</section>`;

export async function mountCrystal(root,{profile,updateProfile}){
  const form=root.querySelector('.crystal-controls'),button=form.querySelector('button'),status=root.querySelector('.crystal-result'),board=root.querySelector('.crystal-board');
  const buyButton=root.querySelector('[data-crystal-buy]'),buyConfirm=root.querySelector('[data-buy-confirm]'),buyAccept=root.querySelector('[data-buy-accept]');
  const autoForm=root.querySelector('[data-auto-form]'),autoStart=root.querySelector('[data-auto-start]'),autoStop=root.querySelector('[data-auto-stop]'),autoButton=root.querySelector('[data-free-auto]');
  const autoplay=new CrystalAutoplay(),storageKey='agarm_crystal_pending_'+profile.id;
  let state,busy=false,pending,autoFree=false,autoTimer,quote=null;
  const stopAuto=()=>{autoplay.stop();autoFree=false;clearTimeout(autoTimer);};
  const remember=value=>{pending=value;try{if(value)sessionStorage.setItem(storageKey,JSON.stringify(value));else sessionStorage.removeItem(storageKey);}catch{}};
  try{pending=JSON.parse(sessionStorage.getItem(storageKey));}catch{}
  if(!pending||!['gold','bonus'].includes(pending.wallet)||!CRYSTAL_BETS.includes(pending.bet)||typeof pending.requestId!=='string')pending=null;
  async function call(data){const res=await fetch('/api/crystal',{method:data?'POST':'GET',credentials:'same-origin',headers:data?{'content-type':'application/json'}:{},body:data?JSON.stringify(data):undefined});const payload=await res.json();if(!res.ok){const e=Error(payload.error||'İşlem tamamlanamadı.');e.status=res.status;throw e;}return payload;}
  function render(next){
    state=next;updateProfile(next.user);
    const config=next.settings||{revision:1,targetRtp:99.99,buyPriceRate:100},running=autoplay.active||autoFree;
    root.querySelector('[data-crystal-gold]').textContent=fmt(next.user.gold);root.querySelector('[data-crystal-bonus]').textContent=fmt(next.user.bonus);
    const locked=pending||next.bonus||(autoplay.active?autoplay:null);
    if(locked){form.elements.wallet.value=locked.wallet;form.elements.bet.value=String(locked.bet);}
    form.elements.wallet.disabled=busy||!!locked||autoFree;form.elements.bet.disabled=busy||!!locked||autoFree;
    const wallet=form.elements.wallet.value,bet=Number(form.elements.bet.value),cost=bet*config.buyPriceRate,math=next.bonus?.math||crystalMath(config.targetRtp);
    root.querySelector('[data-rtp-note]').textContent=`Yeni turlar için hedef RTP %${config.targetRtp.toLocaleString('tr-TR')}.`+(next.bonus?` Aktif bonus hedefi %${math.targetRtp.toLocaleString('tr-TR')}.`:'');
    root.querySelector('[data-paytable]').innerHTML='<div>Sembol</div><b>8–9</b><b>10–11</b><b>12+</b>'+CRYSTALS.filter(s=>s.rate).map(s=>`<span>${gem(s.id)} ${s.name}</span>${[8,10,12].map(n=>`<span>${crystalPayRate(s,n,math).toLocaleString('tr-TR',{maximumFractionDigits:5})}×</span>`).join('')}`).join('')+`<span>4 / 5 / 6+ yıldız</span>${[3,5,100].map(n=>`<span>${(n*math.scatterScale).toLocaleString('tr-TR',{maximumFractionDigits:5})}×</span>`).join('')}`;
    root.querySelector('[data-crystal-feature]').textContent=next.bonus?`${next.bonus.remaining} ücretsiz tur · Çarpan ${next.bonus.multiplier||0}× · Toplam ${fmt(next.bonus.won||0)} / ${fmt(next.bonus.bet*5000)} · ${math.mode==='buy'?'Satın alınan':'Kazanılan'} bonus`:'Azami tur bedeli 5.000.000 · Azami toplam ödül 5.000×';
    button.disabled=busy||running;button.textContent=busy?'Tur sonuçlanıyor…':pending?'Bekleyen işlemi kontrol et':next.bonus?`Ücretsiz tur · ${next.bonus.remaining} kaldı`:'Bir tur oyna';
    buyButton.disabled=busy||running||!!next.bonus||!!pending;buyAccept.disabled=busy;
    root.querySelector('[data-buy-price]').textContent=fmt(cost)+' '+walletName(wallet)+' · 15 free spin';
    autoStart.disabled=busy||running||!!pending;autoForm.elements.count.disabled=busy||running||!!pending;autoStop.disabled=!running;
    autoButton.disabled=autoplay.active||(!next.bonus&&!autoFree)||!!pending;autoButton.setAttribute('aria-pressed',String(autoFree));autoButton.textContent=autoFree?'Ücretsiz turları durdur':'Ücretsiz turları otomatik sürdür';
    root.querySelector('[data-auto-status]').textContent=autoplay.active?`Kalan ücretli tur: ${fmt(autoplay.remaining)}${next.bonus?' · Ücretsiz turlar tamamlanıyor.':''}`:autoFree?'Yalnızca mevcut ücretsiz turlar sürdürülüyor.':'Otomatik oynatma kapalı. Bonus turları seçilen sayıya dahil değildir.';
    root.querySelector('.crystal-history').innerHTML=next.history.length?next.history.map(r=>`<div class="crystal-history-row"><span>${new Date(r.at).toLocaleTimeString('tr-TR')} · ${walletName(r.wallet)}${r.kind==='buy'?' · Free spin satın alma':r.free?' · Ücretsiz':''}</span><span>Bedel ${fmt(r.cost)} · Ödül ${fmt(r.payout)}</span><strong class="${r.net>0?'positive':''}">${r.net>0?'+':''}${fmt(r.net)}</strong></div>`).join(''):'<p>Henüz tur oynamadın.</p>';
  }
  async function execute(kind='spin'){
    if(busy||!root.isConnected)return;
    clearTimeout(autoTimer);
    if(autoplay.active&&!state.bonus&&!pending&&state.user[autoplay.wallet]<autoplay.bet){stopAuto();status.textContent='Bakiye yetersiz. Otomatik oynatma durdu.';render(state);return;}
    busy=true;
    if(!pending)remember({requestId:Array.from(crypto.getRandomValues(new Uint8Array(16)),n=>n.toString(16).padStart(2,'0')).join(''),kind,wallet:form.elements.wallet.value,bet:Number(form.elements.bet.value),settingsRevision:state.settings?.revision??1});
    quote=null;buyConfirm.hidden=true;render(state);status.textContent='İşlem hesaplanıyor…';board.classList.add('crystal-busy');
    try{
      const next=await call(pending);remember(null);autoplay.record(next.round);
      for(const frame of next.round.frames||[]){if(!root.isConnected)break;board.innerHTML=frame.grid.map((id,i)=>`<div class="${frame.cleared.includes(i)?'crystal-match':''}">${gem(id)}</div>`).join('');status.textContent=`Takla toplamı ${fmt(frame.total??frame.win)} · Çarpan ${frame.multiplier||1}×`;if(!root.querySelector('[data-crystal-fast]').checked)await new Promise(resolve=>setTimeout(resolve,350));}
      const r=next.round;
      status.textContent=r.kind==='buy'?`${fmt(r.cost)} ${walletName(r.wallet)} karşılığında 15 free spin açıldı.`:`Ödül ${fmt(r.payout)} ${walletName(r.wallet)} · Net ${r.net>0?'+':''}${fmt(r.net)}${r.multiplier>1?' · '+r.multiplier+'× çarpan':''}${r.bonusAwarded?' · +'+r.bonusAwarded+' ücretsiz tur':''}`;
      if(r.capped)status.textContent+=' · 5.000× azami ödül; bonus tamamlandı.';
      state=next;
    }catch(e){stopAuto();if(e.status&&e.status<500){remember(null);if(e.status===409)try{state=await call();}catch{}}status.textContent=e.message+(pending?' Aynı işlemi tekrar kontrol edebilirsin; ikinci kez ücret alınmaz.':'');}
    finally{
      busy=false;board.classList.remove('crystal-busy');
      const go=autoplay.next(state.bonus)||(autoFree&&!!state.bonus);
      if(!go||!root.isConnected)stopAuto();render(state);
      if(go&&root.isConnected)autoTimer=setTimeout(()=>{if(root.isConnected&&(autoplay.next(state.bonus)||(autoFree&&state.bonus)))execute();},1100);
    }
  }
  form.onsubmit=event=>{event.preventDefault();event.stopPropagation();execute();};
  form.onchange=()=>{quote=null;buyConfirm.hidden=true;if(state)render(state);};
  autoForm.onsubmit=event=>{event.preventDefault();event.stopPropagation();if(busy||pending)return;try{stopAuto();autoplay.start(Number(autoForm.elements.count.value),form.elements.wallet.value,Number(form.elements.bet.value));quote=null;buyConfirm.hidden=true;render(state);execute();}catch(e){status.textContent=e.message;render(state);}};
  autoStop.onclick=event=>{event.stopPropagation();stopAuto();status.textContent=busy?'Otomatik oynatma durduruldu. Gönderilmiş tur sonuçlanacak.':'Otomatik oynatma durduruldu.';render(state);};
  autoButton.onclick=event=>{event.stopPropagation();if(autoFree){stopAuto();render(state);return;}if(!state?.bonus||busy)return;stopAuto();autoFree=true;render(state);execute();};
  buyButton.onclick=event=>{event.stopPropagation();if(busy||pending||state.bonus||autoplay.active||autoFree)return;quote={wallet:form.elements.wallet.value,bet:Number(form.elements.bet.value),revision:state.settings.revision};root.querySelector('[data-buy-summary]').textContent=`${fmt(quote.bet*100)} ${walletName(quote.wallet)} ödeyerek ${fmt(quote.bet)} temel tur bedelinde 15 free spin açılacak. Hedef RTP %${state.settings.targetRtp.toLocaleString('tr-TR')}; azami toplam ödül ${fmt(quote.bet*5000)}. Kazanç garantisi yoktur.`;buyConfirm.hidden=false;};
  root.querySelector('[data-buy-cancel]').onclick=event=>{event.stopPropagation();quote=null;buyConfirm.hidden=true;};
  buyAccept.onclick=event=>{event.stopPropagation();if(!quote||busy||quote.wallet!==form.elements.wallet.value||quote.bet!==Number(form.elements.bet.value)||quote.revision!==state.settings.revision)return;execute('buy');};
  try{render(await call());status.textContent=pending?'Bekleyen işlemi aynı kimlikle kontrol edebilirsin.':state.bonus?`${state.bonus.remaining} ücretsiz turun kaldı.`:'Bakiye ve tur bedeli seç.';const last=state.history.find(r=>r.frames?.length);if(last)board.innerHTML=last.frames.at(-1).grid.map(gem).join('');}
  catch(e){status.textContent=e.message+' Bölümü yeniden açarak tekrar dene.';}
}
