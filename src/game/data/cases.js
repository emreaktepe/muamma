// Dört perdenin vakaları. Katiller, kurbanlar ve şüpheliler kurgusaldır.
// clues[mekan]: text = Açık/Gizli İncele ile okunan paragraf, summary = deftere düşen kısa özet,
// points = şüpheliyi gösteren ağırlık, alibi = aklanan şüpheliler, method = yöntemi gösteren ipucu,
// deep = Arkeolog Deniz'in "Katman" yeteneğiyle okunan ek ipucu.

export const CASES = {
  c532: {
    title: 'Hipodrom\'da Ölüm',
    victim: 'Arabacı Kalinikos',
    intro: 'Ocak 532. Nika İsyanı\'nın dumanı hâlâ Hipodrom\'un üzerinde. Mavilerin en ünlü arabacısı Kalinikos, yapımı yeni başlayan büyük sarnıcın kuru bölümünde ölü bulundu. Yanında kırık bir pirinç dişli var: usturlabın ilk parçası.',
    scene: 'yerebatan',
    suspects: [
      { id: 'faustos', name: 'Faustos', desc: 'Yeşillerin elebaşı; Kalinikos\'u açıkça tehdit etmişti.' },
      { id: 'andreas', name: 'Usta Andreas', desc: 'Sarnıç inşaatının ustabaşı.' },
      { id: 'theodotos', name: 'Kâtip Theodotos', desc: 'Saray kâtibi; yarış bahisleriyle ilgilenir, borçludur.' },
      { id: 'markos', name: 'Oymacı Markos', desc: 'Sarnıç için eski taşları taşıyan oymacı.' },
    ],
    methods: [
      { id: 'zehir', label: 'Zehirli şarap' },
      { id: 'bogulma', label: 'Sarnıç suyunda boğma' },
      { id: 'darbe', label: 'Ağır taşla darbe' },
    ],
    solution: {
      suspect: 'theodotos', method: 'zehir',
      text: 'Kâtip Theodotos yarış sonuçlarına hile karıştırıyordu. Kalinikos bunu öğrenip saraya bildireceğini söyleyince, kâtip onu "barışalım" diyerek sarnıca çağırdı ve mühürlü testideki zehirli şarabı ikram etti.',
    },
    clues: {
      yerebatan: {
        text: 'Ceset sarnıcın henüz su verilmemiş kuru bölümünde. Ağzının kenarında mor lekeler, yanında kırık bir şarap testisi. Üstü başı kuru: boğulma değil. Başında darbe izi yok.',
        summary: 'Ceset kuru bölümde; mor lekeler ve kırık şarap testisi. Boğulma ve darbe değil, zehir.',
        method: 'zehir', points: {},
        deep: 'Testinin kırık sapında saray kâtiplerinin kullandığı kurşun mühürden bir parça var.',
      },
      hipodrom: {
        text: 'Ahırdaki seyis anlatıyor: "Kalinikos yarıştan önce çok öfkeliydi. Kâtibin hesabını herkesin önünde açacağım, dedi. Sonra sarnıç tarafına yürüdü."',
        summary: 'Seyis: Kalinikos "kâtibin hesabını açacağım" demişti.',
        points: { theodotos: 2 },
      },
      ayasofya: {
        text: 'Yeni kilisenin temellerinde gece boyunca meşaleyle çalışılmış. Ustabaşı Andreas sabaha kadar işçilerinin başında, yüz kişinin gözü önündeymiş.',
        summary: 'Usta Andreas bütün gece Ayasofya inşaatında, yüz işçinin gözü önündeydi.',
        alibi: ['andreas'],
      },
      cemberlitas: {
        text: 'Forumdaki şarapçı hatırlıyor: "Saraydan bir kâtip akşamüstü mühürlü bir testi aldı. Özel bir misafir için, dedi; testiyi kendisi kapattı."',
        summary: 'Şarapçı: Bir saray kâtibi akşamüstü mühürlü testi aldı.',
        points: { theodotos: 2 }, method: 'zehir',
      },
      topkapi: {
        text: 'Akropolis\'teki saray yazmanlığında yarış bahislerinin kayıtları kazınarak silinmiş. Kazıntının yanındaki mühür izi Theodotos\'a ait.',
        summary: 'Saray kayıtlarında bahis defteri kazınmış; mühür izi Kâtip Theodotos\'un.',
        points: { theodotos: 1 },
      },
      yenikapi: {
        text: 'Liman kayıtları: Oymacı Markos o gece eski tapınaklardan sökülen taşları taşıyan kadırgadaydı. Kadırga ancak sabah yanaştı.',
        summary: 'Oymacı Markos gece boyunca limana gelen kadırgadaydı.',
        alibi: ['markos'],
      },
      sirkeci: {
        text: 'Prosphorion Limanı\'nda gece Yeşillerin adamları meşale yakıp toplandı. Faustos başlarındaydı ve gün doğana kadar ayrılmadı. Öfkesi büyüktü ama oradaydı.',
        summary: 'Faustos bütün gece limanda adamlarının başındaydı.',
        alibi: ['faustos'],
      },
    },
    witnesses: {
      hipodrom: 'Maviler ve Yeşiller yalnız yarış takımları değil, siyasi gruplardır. İsyan "Nika!" (Zafer!) sloganıyla anılır.',
      ayasofya: 'İşçiler tuğla ve harçla yeni bir kubbe hazırlığında. Kimse daha önce böyle büyük bir kubbe görmemiştir.',
    },
    puzzles: {
      hipodrom: {
        title: 'Arabacının Kemeri',
        text: 'Kalinikos\'un kemerinde Grek harfleriyle bir sıra var: Γ Δ Β. Eski Grek sayı sisteminde Α=1, Β=2, Γ=3, Δ=4, Ε=5. Harflerin sayılarını yan yana yaz.',
        hint: 'Her harfi tek bir rakama çevir, toplamayın.',
        answers: ['342'],
        reward: { type: 'clue', text: 'Kemerin içindeki not: "Kâtibin testisine dokunma." Kalinikos tuzağı sezmiş ama yine de gitmişti.', summary: 'Kemer notu: "Kâtibin testisine dokunma."', points: { theodotos: 2 } },
      },
      ayasofya: {
        title: 'Kubbe Hesabı',
        text: 'İnşaat ustası soruyor: "Kubbeyi taşıyan dört büyük ayak var. Her ayağın üstünde iki kemer birleşiyor ama her kemer iki ayağı paylaşıyor. Kaç büyük kemer gerekir?"',
        hint: 'Dört ayak bir kare çizer; kemerler karenin kenarlarıdır.',
        answers: ['4', 'dört', 'dort'],
        reward: { type: 'tilsim', text: 'Usta memnun: Ayasofya\'daki tılsım bu çağ boyunca güvende.' },
      },
    },
  },

  c1580: {
    title: 'Yıldızların Sustuğu Gece',
    victim: 'Hesap Çırağı Yusuf',
    intro: '1580. Tophane sırtındaki rasathane ferman üzerine yıkılıyor. Rasathanenin genç hesap çırağı Yusuf, Galata Kulesi\'nin dibinde ölü bulundu. Rasathanenin en değerli belgesi Yıldız Cetveli kayıp. Avucunda ikinci pirinç dişli var.',
    scene: 'galata',
    suspects: [
      { id: 'hasan', name: 'Müneccim Hasan Efendi', desc: 'Saray müneccimi; rasathaneye karşı olduğu biliniyor.' },
      { id: 'lorenzo', name: 'Lorenzo', desc: 'Venedik balyosunun kâtibi; yıldız tablolarıyla ilgilenir.' },
      { id: 'kirkor', name: 'Usturlapçı Kirkor', desc: 'Kapalıçarşı\'da usturlap ustası; çırağı tanırdı.' },
      { id: 'salih', name: 'Kayıkçı Salih', desc: 'Eminönü–Galata arasında kayık çeker.' },
    ],
    methods: [
      { id: 'hancer', label: 'Hançer' },
      { id: 'dusurme', label: 'Kuleden düşürme' },
      { id: 'zehir', label: 'Zehir' },
    ],
    solution: {
      suspect: 'lorenzo', method: 'dusurme',
      text: 'Lorenzo, Yıldız Cetveli\'ni Venedik\'e götürmek istiyordu. Yıkım kargaşasında belgeyi çaldı; çırak onu fark edip Galata Kulesi\'ne kadar izleyince Lorenzo onu kulenin balkonundan itti.',
    },
    clues: {
      galata: {
        text: 'Çırak kulenin dibinde yatıyor. Kemiklerinde yüksekten düşme izleri var; bıçak yarası yok, ağzında köpük yok. Avucunda Venedik işi mavi bir cam boncuk.',
        summary: 'Kuleden düşmüş; yara ya da zehir yok. Avucunda Venedik işi cam boncuk.',
        method: 'dusurme', points: { lorenzo: 1 },
        deep: 'Balkon korkuluğunda taze bir çizik ve Latin harfli bir yüzükten kopmuş taş.',
      },
      tophane: {
        text: 'Yıkım ustası: "Gece rasathanenin sandığı açılmış, Yıldız Cetveli yok. Kilit kırılmamış; Latin harfli bir anahtarla açılmış."',
        summary: 'Rasathane sandığı Latin harfli bir anahtarla açılmış; Yıldız Cetveli çalınmış.',
        points: { lorenzo: 1 },
      },
      kapalicarsi: {
        text: 'Usturlapçı Kirkor: "Yusuf akşam bana bir usturlap tamire getirdi. Ben dükkânı kapatıp yatsı namazına Beyazıt Camii\'ne gittim, sonra da cemaatle sohbete kaldım. Hepsi şahidimdir."',
        summary: 'Usturlapçı Kirkor yatsı vakti camide, cemaatin gözü önündeydi.',
        alibi: ['kirkor'],
      },
      pera: {
        text: 'Balyos konağının bekçisi: "Kâtip Lorenzo gece yarısı çamurlu çizmelerle döndü. Kucağında rulo hâlinde kâğıtlar vardı, kimseyle konuşmadan odasına çıktı."',
        summary: 'Bekçi: Lorenzo gece yarısı çamurlu çizmelerle, kucağında rulo kâğıtlarla döndü.',
        points: { lorenzo: 2 },
      },
      suleymaniye: {
        text: 'Muvakkithanenin vakit defteri: Müneccim Hasan Efendi o gece yatsıdan sabaha kadar burada yıldız gözlemi yapmış. Sayfaların her birinde kendi el yazısı ve saat kayıtları var.',
        summary: 'Müneccim Hasan Efendi bütün gece Süleymaniye muvakkithanesinde, kayıtlı.',
        alibi: ['hasan'],
      },
      sirkeci: {
        text: 'Kayıkçı Salih: "Gece bir yabancıyı Eminönü\'nden Galata\'ya geçirdim. Latin işi şapkası vardı, dönüşte de beni beklemedi. Ben sabaha kadar iskelede uyudum, öteki kayıkçılar gördü."',
        summary: 'Salih gece bir Latin yabancıyı Galata\'ya geçirmiş; kendisi iskelede kalmış.',
        points: { lorenzo: 1 }, alibi: ['salih'],
      },
      topkapi: {
        text: 'Saraydaki rivayet: Rasathanenin yıkılması fermanı yakın zamanda çıktı. Saray müneccimi Hasan Efendi\'nin rasathaneyi kıskandığı konuşuluyor.',
        summary: 'Saray dedikodusu: Müneccim rasathaneyi kıskanıyordu.',
        points: { hasan: 1 },
      },
    },
    witnesses: {
      tophane: 'Takiyüddin\'in rasathanesi döneminin en gelişmiş gözlemevlerinden biriydi. 1577 kuyruklu yıldızı burada gözlenmişti.',
      suleymaniye: 'Muvakkit, namaz vakitlerini güneşin ve yıldızların konumundan hesaplar. Usturlap onun en önemli aletidir.',
    },
    puzzles: {
      sirkeci: {
        title: 'Kitabedeki Yıl',
        text: 'İskele çeşmesinin kitabesinde üç harf altınla işlenmiş: Zı, Fe, Ha. Ebced tablosu: Elif=1, Dal=4, Ha=8, Mim=40, Nun=50, Fe=80, Zı=900. Üç harfin değerini topla: hangi hicri yıl?',
        hint: 'Yalnız altınla işlenmiş üç harfi topla: 900 + 80 + 8.',
        answers: ['988'],
        reward: { type: 'clue', text: 'Hicri 988, miladi 1580\'dir. Kitabenin altındaki not: "Sandığı Latin harfli anahtar açtı; anahtar balyos konağının kâtibindedir."', summary: 'Kitabe notu: Sandığı açan Latin anahtar balyos kâtibinde.', points: { lorenzo: 2 } },
      },
      tophane: {
        title: 'Usturlap Ayarı',
        text: 'Usturlabın halkası 360 derecedir ve gökyüzü her saatte 15 derece döner. Öğle vaktinden 3 saat sonra halkayı kaç derece çevirmelisin?',
        hint: '3 saat × 15 derece.',
        answers: ['45'],
        reward: { type: 'tilsim', text: 'Usturlap doğru ayarlandı: Tophane\'deki tılsım bu çağ boyunca güvende.' },
      },
    },
  },

  c1933: {
    title: 'Oda 411',
    victim: 'Koleksiyoncu Mr. Ashworth',
    intro: 'Ekim 1933. Şehir Cumhuriyet\'in 10. yılı için bayraklarla süslü. İngiliz antika koleksiyoncusu Mr. Ashworth, Pera Palas\'ın 411 numaralı odasında ölü bulundu. Masasında yarım kalmış bir mektup ve üçüncü pirinç dişli var.',
    scene: 'pera',
    suspects: [
      { id: 'vera', name: 'Kontes Vera Orlova', desc: 'Beyaz Rus göçmeni; Ashworth\'a borçlu olduğu söyleniyor.' },
      { id: 'husnu', name: 'Antikacı Hüsnü Bey', desc: 'Kapalıçarşı\'da antikacı; Ashworth\'a "Bizans mührü" satmıştı.' },
      { id: 'kosta', name: 'Garson Kosta', desc: 'Pera\'daki pastanede garson; o akşam odaya servis yapmıştı.' },
      { id: 'necdet', name: 'Muhabir Necdet', desc: 'Gazete muhabiri; Ashworth\'la tartışırken görülmüştü.' },
    ],
    methods: [
      { id: 'zehir', label: 'Kahvede zehir' },
      { id: 'bogma', label: 'İpek eşarpla boğma' },
      { id: 'samdan', label: 'Ağır şamdanla darbe' },
    ],
    solution: {
      suspect: 'husnu', method: 'zehir',
      text: 'Hüsnü Bey, Ashworth\'a sattığı Bizans mührünün sahte olduğunun gazeteye yazılacağını öğrendi. Teslimat bahanesiyle odaya çıktı ve kahveye acı badem kokulu zehri döktü.',
    },
    clues: {
      pera: {
        text: 'Oda 411. Fincanda acı badem kokusu. Boğuşma izi yok, şamdanlar yerinde. Masada yarım kalmış mektup: "Size satılan mührün sahte olduğunu yarın gazeteye..." Mektubun altında eski harflerle bir imza karalanmış.',
        summary: 'Fincanda acı badem kokusu, boğuşma yok. Mektup: satılan mühür sahteymiş.',
        method: 'zehir', points: {},
        deep: 'Halının kenarında Kapalıçarşı\'nın bir dükkânından çıkmış, damgalı bir paket sicimi.',
      },
      kapalicarsi: {
        text: 'Çırak anlatıyor: "Hüsnü Bey öğleden sonra dükkânı erken kapattı. Pera\'ya teslimat var, dedi. Cebine küçük kahverengi bir şişe koydu."',
        summary: 'Çırak: Hüsnü Bey "Pera\'ya teslimat" deyip cebine küçük bir şişe koydu.',
        points: { husnu: 2 }, method: 'zehir',
      },
      sirkeci: {
        text: 'Doğu Ekspresi\'nin kondüktörü: "Kontes Orlova akşam trenindeydi. Tren 21.40\'ta Sirkeci\'ye vardı, kontes de son inenlerdendi." Doktor ölümü 21.00 civarı olarak tahmin ediyor.',
        summary: 'Kontes Orlova 21.40\'ta trenle geldi; ölüm 21.00 civarı.',
        alibi: ['vera'],
      },
      galata: {
        text: 'Yangın gözetleyicisi: "Saat dokuz sularında Tünel\'den çıkan, elinde paket taşıyan şişman bir adam Pera\'ya yürüdü. Garson Kosta ise o saatte aşağıda, kardeşinin düğünündeydi; davulunu ben de duydum."',
        summary: 'Gözetleyici: 21.00\'de paketli şişman bir adam Tünel\'den Pera\'ya çıktı. Kosta düğündeydi.',
        points: { husnu: 1 }, alibi: ['kosta'],
      },
      tophane: {
        text: 'İtfaiyeciler: "Muhabir Necdet akşam boyunca Tophane\'deki depo yangınını takip etti, gece yarısına kadar yanımızdaydı."',
        summary: 'Muhabir Necdet gece yarısına kadar Tophane yangınında, itfaiyecilerle.',
        alibi: ['necdet'],
      },
      topkapi: {
        text: 'Müze müdürü: "Mr. Ashworth geçen hafta bir Bizans mührünü incelememizi istedi. Sahte çıktı. Mührü Kapalıçarşı\'dan aldığını söyledi."',
        summary: 'Müze: Ashworth\'un mührü sahte, Kapalıçarşı\'dan alınmış.',
        points: { husnu: 1 },
      },
      uskudar: {
        text: 'Haydarpaşa\'daki hamal: "Kontes\'in valizlerini öğlen Anadolu treninden aldım, sonra Avrupa yakasına gitmek için Sirkeci\'ye dolaştı." Kontes\'in Ashworth\'a borcu olduğu doğru görünüyor.',
        summary: 'Kontes\'in Ashworth\'a borcu olduğu doğrulanıyor.',
        points: { vera: 1 },
      },
    },
    witnesses: {
      pera: 'Pera Palas 1892\'de Doğu Ekspresi yolcuları için açıldı. Otelin tarihî asansörü İstanbul\'un ilk elektrikli asansörlerindendir.',
      sirkeci: 'Sirkeci Garı\'nın bekleme salonu, Doğu Ekspresi\'nin efsanesini anlatan eşyalarla doludur.',
    },
    puzzles: {
      pera: {
        title: 'Eski Harfli İmza',
        text: 'Mektubun altındaki imza 1928 öncesi harflerle yazılmış: ح س ن ی. Tablo: ح = H, س = S, ن = N, ی = İ. Eski yazıda kısa sesliler çoğu zaman yazılmaz. İmzayı oku: kimin adı?',
        hint: 'H-S-N-İ harflerinin arasına sesli ekle: H?SN?',
        answers: ['hüsnü', 'husnu', 'hüsni', 'husni', 'hüsnü bey', 'husnu bey'],
        reward: { type: 'clue', text: 'İmza Hüsnü\'ye ait: Ashworth mektubu ona yazıyordu, yani sahtekârlığı ifşa edilecek kişi oydu.', summary: 'Mektuptaki eski harfli imza: Hüsnü.', points: { husnu: 2 } },
      },
      galata: {
        title: 'Tünel Yolculuğu',
        text: 'Tünel hattı yaklaşık 570 metredir. Vagon dakikada 190 metre giderse Karaköy\'den Pera\'ya kaç dakikada çıkar?',
        hint: '570 / 190.',
        answers: ['3', 'üç', 'uc'],
        reward: { type: 'tilsim', text: 'Tünel\'i doğru hesapladın: Galata\'daki tılsım bu çağ boyunca güvende.' },
      },
    },
  },

  // Perde IV: vakanın katili masadaki Gölge'dir. İpuçları oyun başında Gölge'nin izlerinden üretilir.
  bugun: {
    title: 'Batan Gemiler',
    victim: 'Restorasyon Uzmanı',
    intro: 'Bugün. Usturlabın dört dişlisi tamamlandı ve ilk cinayetin gecesine döndünüz: Yerebatan\'daki restorasyon uzmanını kim öldürdü? Bu sefer şüpheliler masadaki oyunculardır. Kazı alanları, kameralar ve sarnıç, katilin izlerini bulanık da olsa saklıyor.',
    scene: 'yerebatan',
    dynamic: true,
    clueLocations: {
      yenikapi: { cat: 'ayakkabi', text: 'Kazı çamurunda taze bir ayak izi. Biçimi bulanık: ya {a} ya {b}.' },
      yerebatan: { cat: 'koku', text: 'Medusa başının yanında hâlâ bir koku var. Uzmanlar ikisinden birini söylüyor: {a} ya da {b}.' },
      galata: { cat: 'renk', text: 'Kule kamerasının görüntüsü karanlık: katilin giysisi ya {a} ya {b}.' },
      kizkulesi: { cat: 'nesne', text: 'Kız Kulesi iskelesinde unutulmuş bir eşya, tanıklar emin değil: ya {a} ya {b}.' },
    },
    puzzles: {
      yenikapi: {
        title: 'Katmanlı Harita',
        text: 'Şeffaf Bizans haritasını bugünkü haritanın üstüne koyuyorsun. Theodosius Limanı\'nın yerine bugün hangi semt düşüyor?',
        hint: 'Marmaray kazısının yapıldığı semt.',
        answers: ['yenikapı', 'yenikapi'],
        reward: { type: 'delil', text: 'Katmanlar çakıştı: Delil Kutusu\'ndan bir pul açılır.' },
      },
      sirkeci: {
        title: 'Marmaray Hesabı',
        text: 'Marmaray tüneli Boğaz\'ın altından geçer. Tren 1,4 km\'lik deniz altı bölümünü dakikada 1,4 km hızla geçerse kaç dakika sürer?',
        hint: 'Mesafe / hız.',
        answers: ['1', 'bir'],
        reward: { type: 'action', text: 'Hızlı geçtin: bu gün 1 eylem fazlan var.' },
      },
    },
    witnesses: {
      yenikapi: 'Marmaray kazısında Theodosius Limanı ve onlarca batık gemi bulundu; İstanbul\'un tarihinin 8000 yıl öncesine uzandığını gösteren buluntular da çıktı.',
    },
  },
};

// Gölge'nin Sahte İz jetonu: okununca yanlış bir şüpheliyi işaret eden paragraf.
export const FAKE_CLUE_TEMPLATES = [
  'Yerde, {s} adına işlenmiş bir mendil buldun. Sanki biri onu buraya özellikle bırakmış gibi.',
  'Bir tanık fısıldıyor: "O gece {s} buradaydı, gözlerimle gördüm." Ama tanık çok hızlı ortadan kayboldu.',
  'Duvara aceleyle yazılmış bir not: "{s} her şeyi biliyor."',
];
