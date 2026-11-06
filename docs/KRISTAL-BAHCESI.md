# Kristal Bahçesi — 1.17.0 / matematik sürümü 3

`/?page=crystal`: yalnızca giriş yapılmış çevrimiçi hesap. Gold ve Bonus Gold oyun içinde kalır; ödeme veya para çekme eklenmez. 6×5 alan, 8/10/12+ eşleşme, eşleşme kalana kadar takla, 2×–500× küreler ve 5.000× temel bedel toplam kazanç sınırı korunur. 4 yıldız 15 free spin; bonus içinde 3 yıldız +5 tur verir. Her turdaki sembol kazancı ve yıldız ödemeleri aktif matematik ölçeğiyle hesaplanır.

## Satın alma

Seçilen temel tur bedelinin 100 katı karşılığında 15 free spin. Örneğin 100 Gold’luk tur için 10.000; 5.000.000’luk tur için 500.000.000 Gold. Bakiye türü seçilir, fiyat ve azami toplam ödül onaydan önce gösterilir. Paket ücreti bir kez alınır; ücretsiz turlar ayrıca ücretlendirilmez. Başka bir bonus devam ederken paket alınamaz. Toplam ödül sınırı paket ücretinin değil temel tur bedelinin 5.000 katıdır; en fazla 25 milyar Gold.

`POST /api/crystal`: `kind: "buy"`, `requestId`, `wallet`, `bet`, `settingsRevision`. Satın alma makbuzu, bakiye, ledger ve 15 tur aynı transaction içinde kaydedilir. Tekrarlanan istekte aynı makbuz döner; ikinci ücret veya ikinci paket verilmez. Aynı kimliği spin ve buy olarak kullanmak reddedilir. Eski fiyat/RTP sürümüyle yeni satın alma yapılmaz. Sonraki ücretsiz turlar `kind: "spin"` kullanır.

## Otomatik oyun

Pozitif güvenli tam sayı kadar ücretli ana tur seçilir. Sayı 10/50/100 gibi sabit seçeneklerle sınırlı değildir. Her ücretli turda normal bedel ayrı düşer; önceden toplu ücret alınmaz. Bonuslar seçilen sayıdan düşmez ve son ana turun açtığı bonus da tamamlanır. Bakiye yetersizliği, istek hatası, Durdur veya sayfadan çıkış yeni turları keser. Gönderilmiş bir tur sonuçlanır; Durdur bu turu geri almaz. Yenilemede otomatik oyun kendiliğinden devam etmez. Bağlantı sorunu olan son işlem aynı kimlikle kontrol edilir. Otomatik paket satın alınmaz.

## RTP paneli

Yönetim → Ekonomi → Kristal RTP. `crystalRtp` (Kristal RTP ayarı) yetkisi gerekir; yalnızca Gold düzenleme yetkisi bu işlemi açmaz; menüyü saklamanın yanında sunucu ayrı yetki kontrolü uygular.

- Varsayılan hedef %99,99; 0–200 arası iki ondalıklı hedef desteklenir.
- GET/POST `/api/crystal/settings`. POST, hedefi sayı ve beklenen `revision` ile gönderir. Başka yönetici arada değiştirirse 409 döner.
- Kalıcı SQLite tablosunda yüzde × 100 tam sayı saklanır. Önceki/yeni değer ve yönetici kimliği audit’e yazılır.
- Bütün oyuncular için aynı ayar geçerlidir ve oyun ekranında gösterilir. Hedef kimlik, bakiye veya geçmiş kayba göre değiştirilmez.
- Yeni ayar yeni ücretli turlara ve yeni satın almalara uygulanır. Açılmış bonusun `math` anlık görüntüsü, hedefi, ölçeği ve sürümü korunur. Bekleyen eski v2 bonuslar eski %90 ayarlarını kullanır.
- Ayar, üretim hesaplayıcısındaki sembol ve yıldız ödeme ölçeklerini değiştirir. Yalnızca arayüz etiketi değildir. Olasılıklar veya kişiler için ayrı gizli kurallar eklenmez.

## Matematik ve doğrulama

Normal oyun için baz dönüş ölçümü %100,8543785’tir (`payScale=scatterScale=1`); hedefe göre ortak ölçek uygulanır. Satın alınan paket için 100× bedel ödenip 15 ücretsiz turdan başlanır. Bu modun %99,99 hedefe ulaşması için ayrı ölçek gerekir. 1.000.000 ham bonus örneğinden, 5.000× kazanç sınırını hesaba katan hedef/ölçek eğrisi çıkarılır; ara hedefler arasında doğrusal geçiş kullanılır. Aktif bonus tablosu oyuncuya gösterilir. Bu yüzden satın alınan bonusun ödül tablosu doğal bonusla aynı değildir.

| Bağımsız kontrol | Başlangıç sayısı | Hedef | Ölçülen RTP | Yaklaşık %95 güven aralığı |
| --- | ---: | ---: | ---: | --- |
| Normal ücretli tur ve açtığı bütün bonuslar | 5.000.000 | %99,99 | %99,2097 | %98,0087–%100,4107 |
| Satın alınan 15 free spin ve bütün yeniden tetiklemeler | 1.000.000 paket | %99,99 | %100,1004 | %99,5241–%100,6767 |

İki kontrolün güven aralığı %99,99 hedefini içerir. Bu sonlu Monte Carlo ölçümüdür; kesin teorik ispat veya bağımsız sertifika değildir. Başka panel değerleri, düşük bedellerde tam sayı yuvarlaması ve üst sınıra ulaşan çok nadir sonuçlar nedeniyle hedef ile gerçekleşen oran farklı olabilir. Panelde seçilen her değer ayrıca sertifikalandırılmış sayılmaz. 100 üzerindeki hedefler Gold arzını artırabilir. Sonuçlar oturum başına geri ödeme veya kazanç garantisi değildir.

```sh
node scripts/crystal-rtp.mjs --buy --scale 1 --rounds 1000000 --seed 20261111 --calibrate-buy --output docs/CRYSTAL-BUY-CALIBRATION.json
node scripts/crystal-rtp.mjs --buy --rounds 1000000 --seed 20261112 --output docs/CRYSTAL-BUY-VALIDATION-9999.json
node scripts/crystal-rtp.mjs --rounds 5000000 --seed 20261113 --output docs/CRYSTAL-VALIDATION-9999.json
```

Ölçümler üretim `crystalRound` fonksiyonunu kullanır. Yalnızca kriptografik rastgelelik yerine tekrar üretilebilir PRNG geçirilir. Doğrulama tohumları kalibrasyondan ayrıdır. Önceki `CRYSTAL-RTP-*` raporları v2 matematiğinin tarihsel ölçümleridir; v3 için geçerli sonuç gibi sunulmaz.

## Veri ve yayın

Bonus tablosuna `math` alanı eklenir; eski kalan ücretsiz turlar ve bakiyeler kaynak göçünde silinmez. RTP ayarı `crystal_settings` tablosunda tutulur. Uygulamanın genel test sıfırlaması bu ayarı da temizler; sonraki istekte %99,99 varsayılanı geri gelir. Ücretsiz Render’ın geçici diski yeni yayında veri kaybı riski taşımaya devam eder; bu özellik kalıcı depolama sağlamaz.
