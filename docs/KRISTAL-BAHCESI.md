# Kristal Bahçesi — 1.16.0 / matematik sürümü 2

Menü: Kristal Bahçesi (`/?page=crystal`). Çevrimiçi giriş gerekir. Normal Gold ve Bonus Gold ayrı seçilir; kazanç seçilen bakiyeye eklenir. Gold gerçek parayla satılmaz; para çekme veya gerçek ödül eklenmez.

## Mekanik

- Tur bedelleri: 100, 500, 1.000, 5.000, 10.000, 50.000, 100.000, 500.000, 1.000.000 ve 5.000.000.
- 6×5 alan; 8–9, 10–11 ve 12+ aynı sembol ayrı ödeme basamaklarıdır. Sembollerin yan yana olması gerekmez.
- Eşleşen semboller silinir; kalanlar aşağı düşer ve yeni semboller üstten gelir. Eşleşme kalana veya azami kazanca ulaşana kadar takla devam eder. Sabit takla sınırı yoktur.
- Bütün takla kazançları toplanır. Aynı turdaki küre değerleri toplanır ve sonuç bir kez çarpılır. Değerler: 2, 3, 5, 10, 25, 50, 100, 250, 500.
- 4 / 5 / 6+ yıldız sırasıyla bedelin 3 / 5 / 100 katını çarpan uygulanmadan öder. Dört veya daha fazla yıldız 15 ücretsiz tur açar. Ücretsiz turda üç veya daha fazla yıldız +5 tur verir.
- Kazançlı ücretsiz turdaki küreler, bonusun toplam çarpanına eklenir. Birikmiş çarpan yeni küre gelen kazançlı turda uygulanır; küre gelmezse sembol kazancı çarpansız ödenir. Kazançsız turdaki küre bonus çarpanına eklenmez.
- Normal tur ve onun açtığı bütün ücretsiz turlar için ortak sınır 5.000× ilk tur bedelidir. 5 milyonluk turda toplam üst sınır 25 milyardır. Sınırda fazla kazanç kesilir, bonus ve kalan ücretsiz turlar kapanır.
- Bonus boyunca bakiye türü ve bedel kilitlidir; yeniden bağlanınca ücretsiz tur sayısı, çarpan ve toplam kazanç devam eder.
- Kullanıcı kazanılmış ücretsiz turları otomatik sürdürebilir ve durdurabilir. Bu seçenek yeni ücretli tur başlatmaz. Hızlı sonuç sadece animasyonu kısaltır.

Görseller ve ödül tablosu Agarm’a özgüdür. Yayınlanmış Gates serisi kurallarındaki takla/pay-anywhere/toplanan çarpan/free-spin ilişkileri referans alınır; bu, sağlayıcının oyunu veya lisanslı entegrasyonu değildir. Kaynak: https://www.pragmaticplay.com/en/news/zeus-strikes-mighty-multipliers-in-pragmatic-plays-latest-release-gates-of-olympus-1000/ ve sağlayıcının oyun kuralları belgesi https://yesplay.bet/assets/documents/pragmatic-play-Gates-of-Olympus-1000-rules.pdf . Sağlayıcının RTP’si ve ödül tablosu kopyalanmaz.

## RTP

Hedef %90’dır. Her bir ücretli turun açtığı ücretsiz turlar, yeniden tetiklemeler ve 5.000× sınır dahil edilerek ölçülür. Ayar, bütün hesaplar için aynıdır; bakiye, geçmiş kayıp veya kullanıcı kimliğine göre sonuç değiştirilmez. Üretimde Node kriptografik rastgelelik kaynağı kullanılır.

Tekrar üretilebilir ölçüm:

```sh
node scripts/crystal-rtp.mjs --rounds 20000000 --seed 20261108 --scale 1 --output docs/CRYSTAL-RTP-BASELINE.json
node scripts/crystal-rtp.mjs --rounds 20000000 --seed 20261109 --output docs/CRYSTAL-RTP-VALIDATION.json
node scripts/crystal-rtp.mjs --rounds 5000000 --bet 100 --seed 20261110 --output docs/CRYSTAL-RTP-MINIMUM.json
```

Kalibrasyon ve bağımsız doğrulama farklı tohumlar kullanır. JSON raporları ücretli tur sayısı, tüm ücretsiz turlar, ölçülen RTP, standart hata ve yaklaşık %95 güven aralığı içerir. Bu bir matematiksel ispat veya bağımsız sertifikasyon değildir. Sonlu örneklem ve tam sayı Gold yuvarlaması nedeniyle tam %90 veya her oturumda %90 geri ödeme garanti edilmez.

### Ölçüm sonucu

| Ölçüm | Ücretli tur | Tur bedeli | Ölçülen RTP | Yaklaşık %95 güven aralığı |
| --- | ---: | ---: | ---: | --- |
| Ayar öncesi kalibrasyon (`payScale=1`) | 20.000.000 | 100.000 | %100,8544 | %100,2448–%101,4640 |
| Bağımsız final doğrulama (`payScale=0.88`) | 20.000.000 | 100.000 | %90,1348 | %89,5891–%90,6805 |
| En küçük bedel (`payScale=0.88`) | 5.000.000 | 100 | %90,6486 | %89,5411–%91,7560 |

Final doğrulama 6.676.545 ücretsiz tur içerir. Hedef %90, iki final kontrolünün güven aralığının içindedir. 5.000× sınırına erişilebilirlik ayrıca kontrollü rastgele dizisiyle test edilir; bu örneklemlerde maksimum sonucun görülmemesi sınırın erişilemez olduğu anlamına gelmez. Kalibrasyondan elde edilen ölçek, anlaşılır bir ödül tablosu için 0.88’e yuvarlanmıştır. Raporlar Node üretim hesaplayıcısını kullanır; yalnızca kriptografik rastgele kaynağın yerine tekrar üretilebilir bir PRNG geçirilir.

## İşlem güvenliği

`GET /api/crystal`: kendi bakiye, bekleyen bonus, son 20 tur. `POST /api/crystal`: `requestId`, `wallet`, `bet`; sonuç istemciden alınmaz. Sunucu aynı SQLite transaction içinde tur, bakiye, bonus, toplam kazanç ve hesap hareketini kaydeder. Tekrarlanan kimlik ikinci ücret veya ikinci free spin tüketmez. Bonus turları da 900 ms alt aralıkla oynanamaz.

`crystal_bonus` tablosuna `multiplier`, `won`, `version` sütunları eklenir. Var olan hesaplar, bakiyeler ve bekleyen ücretsiz tur sayıları korunur. Toplamlar 32 bit işlemlerle kesilmez; 25 milyar ödül JS güvenli tam sayı alanındadır. Sınır ve bakiye kontrolleri sunucudadır.

Ücretsiz Render servisinin geçici diski güncellemede veri kaybı riski taşır; kalıcı depolama ve doğrulanmış yedek ayrıca gereklidir. Kullanıcının mevcut ücretsiz servise yayın talimatı, bu altyapı riskini ortadan kaldırmaz.
