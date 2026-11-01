# 3D Tahta ve Kart Çevirme · Kısa Brief

Platform: web (mevcut tarayıcı oyunu, Vite + vanilla JS). Kural motoru (`src/game/`) değişmez; yalnızca sunum katmanı yenilenir.

## 1. Hedef oyuncu deneyimi

Oyuncu tarayıcıyı açınca bir **masanın başında oturuyormuş** hissi almalı: loş, sıcak ışıklı bir ahşap masa; üstünde İstanbul tahtası, ona ait piyonlar ve jetonlar. Eylem yapınca piyon tahtada yürür, jeton masaya düşer, kart elde çevrilir. Amaç gösteriş değil, "Minyatür Noir" atmosferini ve masadaki dokunsallığı vermek; bilgi okunabilirliği her zaman önce gelir. Hedef kullanıcı: aynı cihazı paylaşan veya botlarla oynayan 4–8 kişilik masa oyunu grubu; tek cümleyle problem: "dijital prototip düz bir şema gibi duruyor, masadaki gizem ve dokunsallık hissini vermiyor."

## 2. MVP kapsamı

**3D sahne** (Three.js benzeri hafif bir kütüphane, tek `<canvas>`; seçim `mimari` odasında)
- **Tahta:** 16 mekânlı mevcut şema (`src/ui/board.js`) doku olarak masa üstünde eğik düzlem; mekân vurgusu, yol ve seçilebilir hedef ışıması.
- **Piyonlar:** oyuncu başına bir piyon (8 karakter, `avatar_*` görsellerinden renk/etiket); yürüme animasyonu.
- **Jetonlar:** tılsım, nöbet, fotoğraf (iz) ve ceset jetonları; konma/kalkma animasyonu, mekân üstünde yığılma.
- **Kamera:** varsayılan sabit "oturma" açısı; parmakla/fareyle sınırlı döndürme ve yakınlaştırma, "tahtayı sıfırla" düğmesi. Serbest uçuş yok.
- Çağ değişince (532, 1580, 1933, bugün) ışık/doku geçişi (basit).

**Flip'li kartlar** (CSS 3D veya sahnede; ön/arka: `kart_arkasi.webp`)
- **Rol kartı** (`gateView`, main.js ~150): gizli rol açılışı, "Yalnız X baksın" ekranında en kritik flip.
- **Karakter kartı** (`charCard`, ~166, ~378).
- **Ruh rüya/ipucu kartları** (~445–449) ve **iz kartları**: seçince çevrilir.
- **Vaka/bulmaca kartları** ve **Delil Kutusu pulları** (Büyük Divan, ~485): açılış anında çevrilir.
- Sonuç ekranı rol ifşası (~500): Gölge ifşasında yavaş flip.

**Genel deneyim:** yükleme göstergesi, ses yok (kapsam dışı), animasyon hızı ayarı (Hızlı / Normal / Kapalı).

## 3. Kapsam dışı (bilerek)
- Kural, denge, bot veya veri değişikliği.
- Fizik motoru, zar fiziği, serbest kamera, karakter modelleri/iskelet animasyonu.
- Çok oyunculu ağ, hesap, ödeme, ses/müzik, VR/AR.
- Yeni görsel üretimi (mevcut WebP'ler kullanılır; 3D modeller basit geometri).
- Kalan 15 mekân kartı görselleri (ayrı iş).

## 4. Başarı ölçütleri
1. **Akıcılık:** orta seviye telefonda (ör. 3–4 yaş Android) tahta ekranında ≥ 30 FPS; ilk yükleme ek yük ≤ ~1 MB (sıkıştırılmış), kütüphane dahil.
2. **2D yedek:** WebGL yoksa, cihaz zayıfsa veya kullanıcı "Basit görünüm" seçerse mevcut SVG tahta ve düz kartlar aynen çalışır; seçim hatırlanır. Oyun iki modda da tamamlanabilir.
3. **Erişilebilirlik:** `prefers-reduced-motion` altında flip/yürüme animasyonu kapalı; kart içeriği ve piyon konumları DOM'da metin olarak da bulunur (ekran okuyucu); klavye ile mekân/kart seçimi; renk dışında ayırt edici simge/etiket.
4. **Regresyon:** `npm test` (engine) ve `scripts/ui-smoke.mjs` değişmeden geçer; `npm run sim` sonuçları aynı kalır.
5. **Anlaşılırlık:** insanlı testte oyuncular "piyonum nerede / sıra kimde" sorusuna 3 sn içinde cevap verebilmeli (denetlenecek soru, ölçüm test formuna eklenir).

## 5. Açık sorular (Emre'ye)
1. Hedef cihaz önceliği: telefon mu, masaüstü/tablet mi? (Aynı cihazı paylaşma senaryosu telefon ekranını zorlar.)
2. Kamera: sabit açı + hafif döndürme yeterli mi, yoksa tam serbest mi istiyorsun?
3. 3D, 2D'nin yerine mi geçsin, yoksa "Basit görünüm" kalıcı ikinci mod olarak mı kalsın? (Brief ikincisini varsayıyor; bu bir öneri.)
4. Tahta dokusu: mevcut `harita.webp` şemayla örtüşmüyor (TASARIM_NOTLARI). Şema mı doku olsun, yoksa yeni tahta görseli üretilsin mi (fal.ai maliyet onayı gerekir)?
5. Kütüphane ve ek bağımlılık (Three.js) eklenmesine onay var mı?
6. Ses (kart çevirme, jeton sesi) bir sonraki aşamaya mı bırakılsın?
