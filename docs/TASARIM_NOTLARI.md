# Tasarım notları · v0.2 (1 Kasım 2026)

v0.2'nin amacı: her oyunun dört perdenin hepsine ulaşması, tek Gölge'nin finale kadar yaşaması ve masa büyüdükçe dengenin bozulmaması. Fiziksel basım ve Vaka Üreteci sonraya bırakıldı; şu an dijital prototiple test ediliyor.

## v0.2'de ne değişti

| Değişiklik | Neden |
| --- | --- |
| **Bulanık iz.** Ceset ve Delil pulu katilin bir özelliğini "ya şu ya bu" diye iki değerle gösterir. | v0.1'de iki doğru iz Gölge'yi hemen ele veriyordu. |
| **Suç Ortağı (7–8 kişi).** İkinci Gölge yerine gece hamlesi olmayan, Gölge'yi tanıyan bir yalancı. Büyük Divan'da gösterilirse "Gölge değil" çıkar. | İki Gölge 7–8 kişide %70 kazanıyordu. |
| **Gölge'nin gizli görevi.** 6 görev kartından biri: iki belirli tılsım kayıp, ilk üç vakadan biri yanlış ya da iki Muhafız Ruh. Büyük Divan başında açılır; tamamsa Gölge kazanır. | Gölge'ye saklanmaktan başka bir hedef ve masaya okunacak bir niyet. |
| **Ruh perili yapar.** Ölen oyuncu her gün bir mekânı perili yapar: o gece orada suikast, hırsızlık ve sahte iz olmaz. Rüya ipucu yalnız bir kez. | Ölen oyuncu oyundan kopmasın. |
| **Gözaltı (sürgün yerine).** Perde II ve III Divan'ında en fazla 2 kez; gözaltındaki oyuncu bir sonraki perde eylem yapamaz, Gölge'yse gece hamlesi de yapamaz. Rol kartı kapalı kalır. | Erken sürgün oyunu Perde II'de bitiriyordu. |
| **Divan'da herkes oy verir.** Katil ve yöntem çoğunlukla seçilir; oylar deftere yazılır. Gölge ve Ortak yalan oy verebilir. | Tek kişinin karar verdiği Divan, tartışmayı öldürüyordu. |
| **Yöntem önemli.** Katil doğruysa vaka çözülür; yöntem de doğruysa kayıp bir tılsım geri gelir. Her 2 çözülen vaka finalde 1 Delil pulu açar. | Yöntem tahmini sonucu etkilemiyordu; final kanıtı fazlaydı. |
| **Kalabalık masa.** 7–8 kişide her perde bir gün kısa. | Oyun süresi 75 dakikayı aşmasın. |
| **Sahte iz Perde IV'te kazı alanlarına da** bırakılabilir. | Finalde Gölge'nin karşı hamlesi olsun. |
| **Rövanş.** Oyun sonunda "aynı masa, yeni roller" ve test raporu (.md / .json) indirme. | Ekip testleri hızlı tekrarlansın, notlar kaybolmasın. |

## Simülasyon bulguları

`npm run sim -- 200` ile her oyuncu sayısı için 200 bot oyunu. Botlar kusursuz mantıkçı olduğu için finalde insanlardan daha isabetli; sonuçlar nereye bakılacağını gösterir, insanlı testin yerini tutmaz.

| Oyuncu | Kötü takım | Muhafız kazanır | Gölge kazanır | Görevle kazanan Gölge | Ort. çözülen vaka | Ort. kalan tılsım | Ort. cinayet | IV. perdeden önce biten |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 4 | Gölge | %60 | %41 | %22 | 2,83 | 4,07 | 0,95 | %13 |
| 5 | Gölge | %66 | %34 | %28 | 2,96 | 4,87 | 1,72 | %5 |
| 6 | Gölge | %67 | %34 | %28 | 2,98 | 5,52 | 2,05 | %2 |
| 7 | Gölge + Ortak | %69 | %31 | %20 | 2,98 | 5,60 | 1,78 | %0 |
| 8 | Gölge + Ortak | %74 | %26 | %24 | 3,00 | 6,08 | 2,04 | %0 |

v0.1'de: Gölge 4–6 kişide %2–16, 7–8 kişide %69–73 kazanıyordu ve 5–6 kişilik oyunların %80'i Perde IV'e ulaşmadan bitiyordu.

**Ne öğrendik**

1. **Dört perde artık oynanıyor.** Gözaltı oyuncuyu oyundan atmadığı için oyunlar finale ulaşıyor (4 kişide %87, 6+ kişide neredeyse hepsi).
2. **Gölge'nin kazancının çoğu görevden geliyor.** Büyük Divan'da botlar Gölge'yi hâlâ çok iyi buluyor. İnsanlarla final oylaması daha belirsiz olacağı için insanlı testte Gölge'nin kazanma oranı muhtemelen yükselecek.
3. **8 kişi Muhafız'a biraz fazla kolay.** İnsanlı testte de böyleyse 8 kişide `DELIL_PER_CASES` 3'e çıkarılabilir.

## Ayar düğmeleri (`src/game/engine.js` → `RULES`)

| Ayar | Şu an | Etkisi |
| --- | --- | --- |
| `ACTIONS_PER_DAY` | 2 | Gün başına eylem |
| `TILSIM_START` / `TILSIM_LOSE_AT` | 7 / 2 | Tılsım bu sayıya düşünce Gölge kazanır |
| `KILLS_PER_ERA` | 1 | Perde başına en fazla suikast |
| `MIN_MUHAFIZ_ALIVE` | 2 | Suikastın inemeyeceği Muhafız sayısı |
| `EXILE_MODE` | `'gozalti'` | `'surgun'` yazılırsa v0.1'deki sürgün döner |
| `EXILE_FROM_ERA` / `EXILES_BEFORE_FINAL` | 1 / 2 | Gözaltı Perde II'den itibaren, en fazla 2 kez |
| `BLURRY_BODY_IZ` / `DELIL_BLURRY` | true | Ceset izi ve Delil pulu "ya şu ya bu" |
| `ACCOMPLICE_AT` | 7 | Bu oyuncu sayısından itibaren Suç Ortağı |
| `CROWD_DAY_CUT` | 7 | Bu oyuncu sayısından itibaren perde bir gün kısa |
| `MISSIONS` / `MISSION_CHECK_ERA` | true / 3 | Gizli görev açık; Büyük Divan başında kontrol |
| `SOLVE_RESTORES` | `'method'` | Tılsım yalnız yöntem de doğruysa geri gelir |
| `DELIL_PER_CASES` | 2 | Kaç çözülen vakaya 1 Delil pulu |
| `RUH_HAUNT` / `RUH_HINT_ONCE` | true / true | Ruh perili yapar; rüya ipucu bir kez |
| `FINAL_FAKES` | true | Gölge Perde IV kazı alanlarına sahte iz bırakabilir |

## İnsanlı testte bakılacaklar

Her oyundan sonra **Test raporunu indir** düğmesiyle raporu al ve "Test notları" bölümünü doldur.

- Gölge görevini masa ne zaman sezdi? Görev çok mu belli, çok mu gizli?
- Gözaltı oylaması tartışma yarattı mı, yoksa rastgele mi oy verildi?
- Ruh oyuncu perili hamlesiyle oyunda kaldığını hissetti mi?
- Divan oylaması tek kişinin sesine mi kaldı?
- Süre: 4 perde kaç dakika sürdü?

## Bilinen eksikler

- Bazı karakter yetenekleri prototip için sadeleştirildi (Arşiv, Katman).
- Botlar masadaki konuşmayı bilmiyor; yalnız açık delilleri ve iddiaları kullanıyor.
- v2 görselleri (Suç Ortağı, görev kartları, iz simgeleri, şüpheli portreleri, tahta) henüz yok; `src/assets/v2/` klasörüne girdiklerinde kod onları kendiliğinden kullanır.

## Sıradaki adımlar

1. Ekip içinde 3–4 insanlı test, her oyundan sonra test raporu.
2. v2 görsellerinin yerleştirilmesi.
3. Sonra: Vaka Üreteci, basılı prototip.
