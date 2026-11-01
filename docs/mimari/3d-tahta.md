# 3D Tahta ve Kart Çevirme · Mimari (kısa)

Kapsam: yalnızca sunum katmanı. `src/game/` değişmez. Brief: `docs/strateji/3d-tahta-brief.md`.

## 1. Kararlar

| Konu | Karar | Gerekçe |
|---|---|---|
| Kütüphane | `three` (npm bağımlılığı), yalnızca `await import('three')` ile, ayrı chunk | Vite otomatik böler; 2D yolunda sıfır ek yük. Yalnızca gereken sınıflar kullanılır (tree-shaking), gzip hedefi ~150–180 KB |
| Tahta yüzeyi | **Prosedürel doku**: `board.js` SVG'sini değil, ayrı bir `drawBoardTexture(ctx)` ile 2D canvas'a (1680x880, 840x440'ın 2 katı) çizip `CanvasTexture` olarak düzleme kaplamak | SVG -> Image -> canvas yolu asenkron ve etiket fontlarını bozabilir; canvas çizimi senkron, yol/su/kara geometrisi `board.js`'deki sabitlerden alınır. Üçgen sayısı: tek düzlem. Çağ değişince yalnızca doku yeniden çizilir (`needsUpdate`) |
| Masa | Tek geometri (kutu) + küçük bir ahşap dokusu (canvas'ta gürültü ile üretilir; yeni görsel dosyası yok) | Brief: yeni görsel yok, ≤ 1 MB |
| Piyonlar | `CylinderGeometry` gövde + üstte avatar'lı daire (`assets/avatar_<charId>.webp`, `CircleGeometry`/sprite yerine ayakta duran disk). 8 küçük mesh | Karakter modeli kapsam dışı |
| Jetonlar | Nöbet = turkuaz kutu, fotoğraf = siyah/altın ince kutu, ceset = kırmızı X'li disk, tılsım = yıldız (`ExtrudeGeometry`, tek kez). Mekân başına yığın `y` kaydırması | Paylaşılan geometri + malzeme (instancing gerekmez, <100 nesne) |
| Kamera | Perspektif, sabit "oturma" açısı; `OrbitControls` kullanılmaz (bağımlılık ağırlığı). Kendi küçük denetleyici: azimut ±25 derece, yakınlaştırma sınırlı, "sıfırla" düğmesi | Brief: serbest uçuş yok |
| Mekân tıklama | `Raycaster` ile **tahta düzlemine** tek ışın; kesişim (u,v) -> 840x440 uzay (x,y) -> en yakın `LOCATIONS[id]` (yarıçap ~22 birim, mobilde 30). Mesh başına raycast yok | Mekân koordinatları zaten 840x440; hızlı ve sağlam |
| Render döngüsü | Talep üzerine: `requestAnimationFrame` yalnız animasyon/sürükleme sırasında; boştayken durur. Piksel oranı `min(devicePixelRatio, 2)` | Pil ve 30 FPS hedefi |
| Kart çevirme | DOM'da CSS 3D (sahnede değil) | Metin okunabilirliği, erişilebilirlik, sahne ile bağımsız |

## 2. Kritik kısıt: `render()` tüm DOM'u yeniden yazıyor

`src/main.js` `render()` her durum değişiminde `app.innerHTML = html` yapar; canvas içeride olsaydı her seferinde yok olurdu (WebGL bağlamı yeniden kurulurdu). Çözüm:

- Canvas'ı **kalıcı bir host** (`div#stage`) içinde tut; bu eleman `#app` dışında (body'de, `display:none`) yaşar.
- `gameView()` `<section class="boardwrap">` içine `<div data-board-slot></div>` yazar (SVG yerine; 3D modda). `render()` sonunda `board3d.attach(slot)` host'u slota `appendChild` ile taşır (taşıma bağlamı yok etmez).
- Her `render()` sonunda `board3d.update(S, { reach, currentId, showRuh })`: durum farkını (piyon konumu, jetonlar, tılsım, çağ, ulaşılabilir mekânlar) hesaplar ve yalnızca farkı canlandırır.
- Oyun dışı ekranlarda (`!S`, roles, prolog) `board3d.detach()` host'u gizler; `quit`te `dispose()`.

## 3. Yedek ve modlar

- Mod: `localStorage['muamma.view']` = `3d` | `basit`. Varsayılan: WebGL2 varsa ve `navigator.hardwareConcurrency >= 4` ise `3d`, yoksa `basit` (brief: 2D kalıcı ikinci mod).
- `canUse3D()`: `canvas.getContext('webgl2')` denemesi; `webglcontextlost` olayında otomatik `basit`'e düşüp `render()`.
- `basit` modda `boardSVG()` aynen kullanılır (dokunulmaz). Dinamik import hata verirse (ağ) aynı yedek.
- Üst çubuğa "Basit görünüm" düğmesi: `data-act="view-toggle"` (headerView, ~192).
- Erişilebilirlik: 3D modda canvas `aria-hidden`; yanında görünmez (`.sr-only`) metin listesi: "Mekân: oyuncular, jetonlar" ve mekân düğmeleri (`<button data-act="node" data-loc=...>`, yalnız `reach` içindekiler odaklanabilir). Klavye ile seçim 2D'deki akışla aynıdır.
- `prefers-reduced-motion` (ve ayar "Kapalı"): piyon yürüme/jeton düşme/kamera geçişi anında; çağ geçişi çapraz solma yerine ani. CSS flip yerine `opacity` geçişi veya ani değişim. Ayar: `ui.anim` = `hizli|normal|kapali` (varsayılan sistem tercihi; `matchMedia('(prefers-reduced-motion: reduce)')`).

## 4. Mekân tıklama uyumu (`data-act="node"`)

Mevcut işleyici (`main.js` ~558) `el.dataset.loc` bekler. 3D'de ışın sonucu mekân bulunca canvas üzerinde sentetik olay yok; bunun yerine `board3d` host'una `onPick(locId)` geri çağrısı verilir ve `main.js` şu küçük sarmalayıcıyı kullanır: `pickNode(loc)` -> mevcut `case 'node'` gövdesi (fonksiyona çıkarılır). Böylece 2D (`click` -> `data-act`) ve 3D aynı kuralı çalıştırır (bot sırası, `S.pending`, `reachable`). Erişilebilir gizli düğmeler zaten `data-act="node"` olduğundan ek bir şey gerekmez. Hover: `reach` içindeki mekânda imleç `pointer`, halka parlaması.

## 5. Flip kartları (DOM, `src/ui/flip.js`)

Bileşen: `flipCard({ front, back, flipped, onFlip })` -> HTML dizgesi; `.flip > .flip-inner` (`transform-style: preserve-3d`, `rotateY(180deg)`, `backface-visibility: hidden`, `perspective` kapsayıcıda). Arka yüz `assets/kart_arkasi.webp`. Durum `render()` ile DOM yeniden yazıldığı için `data-flip-id` + `ui.flipped[id]` içinde tutulur; yeni çizimde sınıf yalnızca *ilk kez* gösterilen kart için ters başlar ve bir sonraki karede `flipped` eklenir (animasyon yeniden başlar, ama tekrarlamaz). Ön yüz metni DOM'da kalır (ekran okuyucu); arka yüz `aria-hidden`.

main.js uygulama noktaları:

| Kart | Fonksiyon (yaklaşık satır) | Davranış |
|---|---|---|
| Rol kartı | `roleView` (~134–160), `.reveal` içindeki `card-img` | "Rolümü göster"den sonra arka -> ön flip; en yavaş (≈900 ms) |
| Karakter kartı | `charCard` (~166); `gateView` (~76) çağrıları, `setupView` seçimi (~378 civarı) | Açılışta flip |
| Ruh ipucu kartları | `divanView` (~445–449) `.claims` düğmeleri | Seçilince flip (düğme yapısı ve `data-act="ruh"` korunur) |
| İz kartları / chip | `izChips` (~162), `suspectTable` (~277) | Yalnız yeni açılan iz için |
| Vaka/bulmaca | `caseView` (~255), `puzzleModal` (~352) | Modal açılışında flip |
| Delil Kutusu pulları | `divanView` Büyük Divan bölümü (~485) | Açılışta sıralı gecikmeyle |
| Sonuç ifşası | `overView` (~497) | Gölge rolleri için yavaş flip |

Kısıt: `data-act` nitelikleri ve metin şablonları aynı kalır; `flip.js` yalnızca sarmalayıcı HTML ve `.flip` sınıfları ekler.

## 6. Dosya yapısı

```
src/ui/board.js        (dokunulmaz; basit mod)
src/ui/board3d.js      yaşam döngüsü: canUse3D, attach, update, detach, dispose, onPick  [A]
src/ui/board3d/scene.js    masa, ışık, kamera denetleyici, render döngüsü               [A]
src/ui/board3d/texture.js  drawBoardTexture(ctx, state), ahşap dokusu                    [A]
src/ui/board3d/pieces.js   piyon + jeton mesh'leri, konum/yığın, animasyon               [A]
src/ui/board3d/pick.js     ışın -> (x,y) -> mekân id                                     [A]
src/ui/flip.js         flipCard(), flip durumu yardımcıları                              [B]
src/ui/flip.css        .flip kuralları, reduced-motion                                   [B]
src/ui/anim.js         ui.anim ayarı, reducedMotion() (ortak, B yazar, A okur)           [B]
```

## 7. main.js entegrasyon noktaları (en az dokunuş)

1. İçe aktarma: `import { flipCard } from './ui/flip.js'` ve `import './ui/flip.css'` (B); `board3d`'yi **statik import etme**, `loadBoard3D()` içinde `import('./ui/board3d.js')` (A).
2. `gameView()` (~306): moda göre `boardSVG(...)` veya `<div data-board-slot></div>` (A).
3. `render()` (~508) sonuna `syncBoard()` çağrısı: 3D açıksa `attach/update`, değilse `detach` (A).
4. `case 'node'` gövdesini `pickNode(loc)` fonksiyonuna çıkar (A).
5. `headerView()` (~192) `view-toggle` düğmesi + `case 'view-toggle'` (A); animasyon hızı seçimi `setupView`/header (B).
6. Kart fonksiyonlarında `flipCard` sarmalama (B) tablosu 5.

Entegrasyon çakışması: `main.js` iki pakette de değişir; **sıra: B önce (yalnız kart fonksiyonları), A sonra (gameView/render/click/header)**; düzenlenen bölgeler ayrık olduğundan birleştirme sorunsuz olmalı. Ortak `ui.anim` alanı B'de tanımlanır (`defaultSetup`/`ui` nesnesi), A yalnızca okur.

## 8. İş paketleri

**Paket A · 3D tahta** (bağımsız; B bitmeden de çalışır, `reducedMotion` için geçici yerel kopya kullanır)
- Yeni: `src/ui/board3d.js`, `src/ui/board3d/*`.
- Değiştirir: `package.json` (+`three`), `main.js` (maddeler 2, 3, 4, 5-header), `src/styles.css` (yalnız `.boardwrap`/`.stage`/`.sr-only` ekleri, dosyanın sonuna ayrı bölüm), `vite.config.js` (gerekirse `manualChunks: { three: ['three'] }`).
- Teslim: açılış < 1 MB ek, ≥ 30 FPS, WebGL yok -> SVG yedeği, `scripts/ui-smoke.mjs` ve `npm test` değişmeden geçer, `npm run sim` aynı.

**Paket B · Kart flip + CSS** (bağımsız)
- Yeni: `src/ui/flip.js`, `src/ui/flip.css`, `src/ui/anim.js`.
- Değiştirir: `main.js` yalnızca kart üreten fonksiyonlar (`roleView`, `charCard`, `izChips`, `caseView`, `puzzleModal`, `divanView`, `overView`) ve `ui.anim` ayarı; `src/styles.css`'e dokunmaz (CSS kendi dosyasında).
- Teslim: tüm flip noktaları, `prefers-reduced-motion` ve "Kapalı" ayarı, ekran okuyucuda içerik erişilebilir, mevcut testler yeşil.

Çakışma özeti: A `board3d*` + `package.json` + `styles.css` (ek bölüm) + `main.js` (gameView/render/click/header); B `flip*`, `anim.js` + `main.js` (kart fonksiyonları). Ortak tek dosya `main.js`, bölgeler ayrık.

## 9. Riskler ve açık noktalar

- iOS Safari'de WebGL bağlam kaybı ve arka plan sekmesi: `webglcontextlost/restored` işlenmeli.
- `render()` her bot adımında çalıştığı için `update()` fark tabanlı olmalı, aksi halde animasyon sürekli yeniden başlar.
- Mekân etiketleri 3D'de ayrı DOM katmanı mı (kolay okunur) yoksa dokuda mı? Öneri: dokuda (`pointer-events` sorunu yok); okunabilirlik testi Paket A'da.
- Brief açık soruları (cihaz önceliği, kamera serbestliği, 3D'nin 2D'nin yerine geçmesi, Three.js onayı) Emre'den yanıt bekliyor; bu tasarım "Basit görünüm kalıcı ikinci mod" ve "Three.js onaylı" varsayımına dayanır, varsayım kodlamadan önce teyit edilmelidir.
