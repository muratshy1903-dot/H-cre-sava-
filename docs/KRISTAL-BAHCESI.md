# Kristal Bahçesi — 1.15.0

Agarm menüsünden Kristal Bahçesi açılır (`/?page=crystal`). Yalnızca giriş yapılmış çevrimiçi hesaplar kullanabilir. Kullanıcı talebi: Gold para ile satın alınmaz, kazançlar tamamen oyun içinde kalır. Bu özellik ödeme, para çekme, gerçek ödül veya satın alma bağlantısı eklemez. Bu belge hukuki uygunluk onayı değildir.

## Oyun

- Normal Gold ve Bonus Gold ayrı seçilir; ödül seçilen bakiyeye eklenir.
- Tur bedelleri: 100, 500, 1.000 ve 5.000.
- 5 × 4 alanda aynı sembolden her 6 adet bir grup sayılır. Konumdan bağımsız ödeme yapılır; 12 adet iki, 18 adet üç grup eder.
- Semboller silinir ve üsttekiler düşer; tur başına en fazla beş sonuç değerlendirilir.
- Yaprak, Damla, Güneş, Çiçek, Ay, Taç sırasıyla 0,25 / 0,30 / 0,40 / 0,50 / 0,75 / 1 kat öder. Çekiliş ağırlıkları 4 / 4 / 4 / 3 / 3 / 2; bonus yıldızının ağırlığı 1 (toplam 21).
- Kazançlı turda %10 ihtimalle eşit olasılıklı 2, 3 veya 5 çarpanı gelir. Toplam ödeme en fazla tur bedelinin 100 katıdır. Garantili kazanç veya ölçülmüş RTP iddiası yoktur.
- Aynı sonuçta en az üç yıldız, üç ücretsiz tur verir. Ücretsiz tur kendi başına yeni bonus açmaz. Bakiye ve bedel bonus bitene kadar kilitlidir. Bonus turları yenilemede ve süreç yeniden başladığında korunur.
- Her tur elle başlatılır. Otomatik oynatma ve bonus satın alma yoktur.

## Kayıt ve doğrulama

`GET /api/crystal`: kendi bakiyeleri, bekleyen bonus ve son 20 tur.
`POST /api/crystal`: sunucunun hesapladığı sonuç; `requestId`, `wallet`, `bet` dışında istemciden sonuç alınmaz.

Kriptografik rastgelelik sunucudadır. Tur, bakiye, bonus durumu ve hesap hareketi aynı SQLite transaction içinde yazılır. `(account_id, request_id)` tekildir; tekrar gönderim aynı sonucu döndürür ve ücret düşürmez. Aynı kimliği farklı bakiye/bedelle kullanma reddedilir. Tur aralığı en az 900 ms’dir. Bağlantı sorunu olursa tarayıcı aynı kimlik ile sonucu kontrol eder. Sonuç özetinde bedel, brüt ödül ve net değişim ayrı gösterilir.

`crystal_rounds` ve `crystal_bonus` tabloları eklenir; mevcut hesap profilleri, odalar, rekorlar ve galibiyetler değiştirilmez. Hesap sıfırlama mevcut genel sıfırlama işleminin parçası olarak bu tabloları da temizler.

## Yayın koşulu

Render deneme servisi halen free plandadır. RELEASING.md gereği kalıcı depolama ve doğrulanmış tutarlı yedek olmadan üretime yayınlanmaz. Bu değişiklik ayrı dalda hazırlanır; üretim dalı değiştirilmez.
