# Tasarım notları · v0.1 (1 Kasım 2026)

## Simülasyon bulguları

`npm run sim -- 200` ile her oyuncu sayısı için 200 bot oyunu. Bu sonuçlar bot stratejilerine bağlıdır; insanlarla yapılacak testlerin yerini tutmaz, nereye bakılacağını gösterir.

| Oyuncu | Gölge | Muhafız kazanır | Gölge kazanır | Ort. çözülen vaka | Ort. kalan tılsım | Ort. cinayet | IV. perdeden önce biten |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 4 | 1 | %85 | %16 | 2,75 | 4,22 | 0,95 | %44 |
| 5 | 1 | %97 | %4 | 2,48 | 5,49 | 1,72 | %79 |
| 6 | 1 | %98 | %2 | 2,46 | 5,77 | 1,79 | %81 |
| 7 | 2 | %28 | %73 | 2,87 | 4,04 | 2,48 | %7 |
| 8 | 2 | %32 | %69 | 2,87 | 4,51 | 2,82 | %6 |

(Yüzdeler yuvarlandığı için toplam 100'ü bir puan aşabilir.)

**Ne öğrendik**

1. **Tek Gölge çok çabuk yakalanıyor.** İz sisteminde iki farklı doğru iz tek kişiyi gösteriyor. Ceset izi ve Ruh rüyası birleşince 5–6 kişilik masalarda Gölge çoğunlukla I. ya da II. perdede sürgün ediliyor. Hikâye finale ulaşmıyor.
2. **İki Gölge fazla güçlü.** 7–8 kişide iki Gölge Büyük Divan'da birbirini kolluyor, oylar bölünüyor.
3. **Ara düzeltmeler işe yaradı.** "Sayıca eşitlik" kuralı kaldırıldı (Ruh'lar takımda sayılıyor), suikastlar 2 Muhafız'ın altına inemiyor ve Büyük Divan'dan önce yalnız 1 sürgün hakkı var. Bu üçü 4 kişilik oyunu %11'den %85 Muhafız kazanmaya taşıdı.

## Ayar düğmeleri (`src/game/engine.js` → `RULES`)

| Ayar | Şu an | Etkisi |
| --- | --- | --- |
| `ACTIONS_PER_DAY` | 2 | Gün başına eylem |
| `TILSIM_LOSE_AT` | 2 | Tılsım bu sayıya düşünce Gölge kazanır |
| `KILLS_PER_ERA` | 1 | Çağ başına en fazla suikast |
| `EXILES_BEFORE_FINAL` | 1 | Büyük Divan'dan önceki sürgün hakkı |
| `PARITY_RULE` | false | Vampir Köylü tarzı "sayıca eşitlik" kaybı |
| `MIN_MUHAFIZ_ALIVE` | 2 | Suikastın inemeyeceği Muhafız sayısı |
| `FINAL_HITS_NEEDED` | 1 | Büyük Divan'da kazanmak için ifşa edilecek Gölge |

## Denenecek fikirler (insanlı testten önce/sonra)

- **İz belirsizliği:** Ceset izi "ya şu ya bu" diye iki değer göstersin (Perde IV'teki gibi). Tek Gölge'yi yaşatır.
- **Sürgün yalnız II. perdeden sonra:** Perde I öğrenme perdesi olarak kalsın.
- **İki Gölge'ye ayrı hedefler:** Biri tılsım, biri suikast; ya da 7–8 kişide 1 Gölge + 1 "Şüpheli Muhafız" rolü.
- **Gölge'nin yalanı daha ucuz olsun:** Sahte iz jetonu bir mekândaki doğru paragrafı tamamen örtsün.

## Bilinen eksikler

- Bazı karakter yetenekleri prototip için sadeleştirildi (Arşiv, Katman).
- İnsanların masada konuşarak yaptığı tartışma burada yok; botlar yalnız açık delilleri ve iddiaları kullanıyor.
- Sürgün edilen masum Ruh'un "fısıltısı" rastgele bir oyuncuya +1 eylem veriyor; seçim insana bırakılmalı.
- Harita görseli (ChatGPT) oyun tahtası şemasıyla bire bir örtüşmüyor; tahtada şema kullanılıyor.

## Sıradaki adımlar

1. Ekip içinde 3–4 insanlı test; her oyundan sonra kısa form (süre, sıkıldığın an, "aha" anı).
2. Denge için yukarıdaki iki fikri `RULES` üzerinden dene ve simülasyonla karşılaştır.
3. Kalan 15 mekân kartının ve bulmaca kartlarının görselleri.
4. Basılı prototip: usturlap çağ kadranı, tılsım jetonları ve piyonlar için lazer kesim dosyaları.
