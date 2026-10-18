# Takipçi Şehri

Yorum yapan herkese, yorumunda yazdığı ilde 3D bir ev. Türkiye 81 ilde birden büyür.
Mahalle tipleri: ızgara (ortası bahçe), halka (ortası park), çıkmaz sokaklı, kıvrımlı.

## Çalıştırma
```
python3 -m http.server 8731
```
- Takipçi görünümü: http://localhost:8731
- Yönetim: http://localhost:8731/?admin
- Belirli bir ev: http://localhost:8731/#ev=57

Kontroller: sürükle = kaydır, tekerlek/pinch = yakınlaş, sağ tık sürükle (veya Shift) = döndür, eve tıkla = ev kartı.
Arama kutusuna kullanıcı adı ya da il adı yazılabilir.

## Her video (3 adım)
1. **Yorumları getir** — Instagram sekmesi (anahtarla), Dosya (CSV/JSON/TXT) ya da Deneme (sahte yorumlar).
   Yorumdaki il otomatik bulunur: "İstanbul'dan", "izmirliyim", "34", "antep", "kadıköy" gibi.
   Her kullanıcıya bir ev (ikinci yorumu sayılmaz). İl yazmayanlar atlanır.
2. **Videoyu oynat** — ekran kaydını başlat. Akış: GÜN N → evler illere yağar → en kalabalık 3 il → "senin ilin kaçıncı?". Bitince Esc.
3. **Siteyi güncelle** — data.json'u indir, siteye yükle. Herkes evini arayıp bulabilir.

## Instagram erişim anahtarı nasıl alınır
Resmi Instagram API'si kullanılır. Kazıma (scraping) yapılmaz, hesap riske girmez.
1. Instagram hesabını **Profesyonel** yap (Ayarlar → Hesap türü → İçerik üreticisi veya İşletme).
2. https://developers.facebook.com → **Uygulama oluştur** → kullanım alanı olarak Instagram'ı seç.
3. Uygulamada **Instagram → Instagram girişi ile API kurulumu** bölümüne gir.
4. **Erişim belirteci oluştur** kısmında kendi Instagram hesabını ekle ve izin ver
   (`instagram_business_basic`, `instagram_business_manage_comments`). Çıkan uzun anahtarı kopyala.
5. Panelde Instagram sekmesine yapıştır → **Gönderilerimi getir** → videoyu seç → **Yorumları çek**.

Notlar: Uygulama "geliştirme modunda" kalabilir, kendi hesabın için onay gerekmez. Anahtar yaklaşık 60 gün geçerli.
Anahtar sadece bu tarayıcıda kalır, data.json'a yazılmaz. Meta'nın ekran adları zamanla değişebilir.
Instagram bağlantısı çalışmazsa yorumları bir dışa aktarma aracıyla CSV olarak alıp **Dosya** sekmesinden yükle.

## Yayına alma
Canlı site: https://fethiyewebtasarimi-pixel.github.io/takipci-sehri/
Yönetim: https://fethiyewebtasarimi-pixel.github.io/takipci-sehri/?admin

GitHub Pages, `main` dalından yayınlar. Güncellemek için yeni `data.json`'u (ve değişen dosyaları)
depoya gönder; site 1 dakika içinde yenilenir. Yönetim sayfasını açan herkes sadece kendi
tarayıcısında değişiklik yapabilir; herkesin gördüğü şehir yalnızca depodaki `data.json`'dur.

## Yeni şey eklemek (game.js)
- Yeni yapı: `BUILDINGS` objesine giriş ekle (w, h, build → THREE.Group). Panel listesine kendiliğinden gelir.
- Hazır 3D model: `.glb` dosyasını `models/` klasörüne koy, panelden "📦 3D Model" ile yerleştir.
- Renk: yapı eklerken "mor", "altın" veya #hex yazılabilir.
- Yeni etkinlik: `EVENTS` objesine giriş ekle (run).
- Veri bir olay günlüğü (`DATA.log`): her açılışta baştan oynatılır. Video ve site aynı
  `data.json`'dan beslendiği için videoda ne kurulduysa sitede aynı yerde durur.
