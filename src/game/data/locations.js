// 16 mekân. x,y oyun tahtası SVG koordinatlarıdır (viewBox 0 0 840 440).
// names: çağa göre mekân adı. notes: o çağa ait kısa tarih notu (Sorgula eyleminde okunur).
// Çağ anahtarları: c532, c1580, c1933, bugun

export const LOCATIONS = {
  surlar: {
    x: 78, y: 352, label: [0, 24, 'middle'],
    names: { c532: 'Theodosius Surları', c1580: 'Yedikule Zindanı', c1933: 'Yedikule Surları', bugun: 'Yedikule Surları' },
    notes: {
      c532: 'Kara surları 5. yüzyılda II. Theodosius döneminde yapıldı; şehri bin yıl korudu.',
      c1580: 'Fetihten sonra surların güney ucuna Yedikule Hisarı eklendi; bir dönem zindan ve hazine olarak kullanıldı.',
      c1933: 'Surlar artık savunma işlevi taşımaz; çevresinde bostanlar ve mahalleler vardır.',
      bugun: 'Kara surları, Tarihi Yarımada ile birlikte UNESCO Dünya Mirası listesindedir.',
    },
  },
  yenikapi: {
    x: 210, y: 378, label: [0, 24, 'middle'],
    names: { c532: 'Theodosius Limanı', c1580: 'Langa Bostanları', c1933: 'Yenikapı', bugun: 'Yenikapı Kazısı' },
    notes: {
      c532: 'Marmara kıyısındaki büyük liman, şehrin tahıl gemilerini karşılar.',
      c1580: 'Eski liman zamanla dolmuş, yerini bostanlara bırakmıştır.',
      c1933: 'Kıyı mahallesi; eski limanın varlığı unutulmuştur.',
      bugun: 'Marmaray kazısında Theodosius Limanı ve onlarca batık gemi gün ışığına çıktı.',
    },
  },
  suleymaniye: {
    x: 232, y: 232, label: [0, -16, 'middle'],
    names: { c532: null, c1580: 'Süleymaniye Külliyesi', c1933: 'Süleymaniye', bugun: 'Süleymaniye' },
    notes: {
      c1580: 'Mimar Sinan\'ın 1557\'de tamamladığı külliye; medreseleri, darüşşifası ve muvakkithanesi vardır.',
      c1933: 'Külliye şehrin silüetine hâkimdir; Sinan\'ın türbesi hemen yanındadır.',
      bugun: 'Haliç\'e bakan tepeden Tarihi Yarımada\'nın en geniş manzarasından biri görülür.',
    },
  },
  kapalicarsi: {
    x: 232, y: 300, label: [-14, 4, 'end'],
    names: { c532: null, c1580: 'Kapalıçarşı', c1933: 'Kapalıçarşı', bugun: 'Kapalıçarşı' },
    notes: {
      c1580: 'Çekirdeği 1461\'de yapılan bedesten, kuyumcu ve usturlapçı dükkânlarıyla doludur.',
      c1933: 'Antikacılar ve sarraflar çarşının iç sokaklarında çalışır.',
      bugun: 'Dünyanın en eski ve en büyük kapalı çarşılarından biridir.',
    },
  },
  cemberlitas: {
    x: 300, y: 318, label: [0, 24, 'middle'], tilsim: true,
    names: { c532: 'Konstantin Forumu', c1580: 'Çemberlitaş', c1933: 'Çemberlitaş', bugun: 'Çemberlitaş' },
    notes: {
      c532: 'Konstantin\'in sütunu forumun ortasında yükselir; altında kutsal emanetlerin gömülü olduğu anlatılır.',
      c1580: 'Yangınlarda çatlayan sütun demir çemberlerle sarılmıştır; adı buradan gelir.',
      c1933: 'Sütun, tramvay yolunun kenarında şehrin en eski anıtlarından biri olarak durur.',
      bugun: 'Konstantin Sütunu yaklaşık 1700 yaşındadır.',
    },
  },
  hipodrom: {
    x: 356, y: 362, label: [0, 24, 'middle'], tilsim: true,
    names: { c532: 'Hipodrom', c1580: 'At Meydanı', c1933: 'Sultanahmet Meydanı', bugun: 'Sultanahmet Meydanı' },
    notes: {
      c532: 'Araba yarışları Maviler ve Yeşiller arasında geçer; Ocak 532\'de Nika İsyanı burada patlar.',
      c1580: 'Hipodromun yerinde At Meydanı vardır; Yılanlı Sütun ve Dikilitaş hâlâ ayaktadır.',
      c1933: 'Meydanda Dikilitaş, Yılanlı Sütun ve Örme Sütun yan yana durur.',
      bugun: 'Yılanlı Sütun Delfi\'den getirilmiştir; Osmanlı\'da şehri yılanlardan koruduğuna inanılırdı.',
    },
  },
  yerebatan: {
    x: 372, y: 300, label: [-14, -10, 'end'], tilsim: true,
    names: { c532: 'Sarnıç İnşaatı', c1580: 'Yerebatan', c1933: 'Yerebatan Sarnıcı', bugun: 'Yerebatan Sarnıcı' },
    notes: {
      c532: 'Justinianus, Nika İsyanı\'ndan sonra büyük bir yeraltı sarnıcı yaptırır; sütunların bir kısmı eski yapılardan getirilmiştir.',
      c1580: 'Sarnıç evlerin altında unutulmuştur; mahalleli kuyulardan su çeker, balık tutar.',
      c1933: 'Sarnıç karanlık ve sessizdir; ziyaretçiler kayıkla dolaşır.',
      bugun: 'İki sütunun kaidesinde biri yan, biri ters konmuş Medusa başları vardır.',
    },
  },
  ayasofya: {
    x: 418, y: 318, label: [14, 20, 'start'], tilsim: true,
    names: { c532: 'Ayasofya İnşaatı', c1580: 'Ayasofya Camii', c1933: 'Ayasofya Camii', bugun: 'Ayasofya' },
    notes: {
      c532: 'İsyanda yanan kilisenin yerine Anthemios ve İsidoros\'un tasarladığı yeni yapı yükselmeye başlar; 537\'de açılır.',
      c1580: '1453\'ten beri camidir; Sinan yapıyı destek duvarlarıyla güçlendirmiştir.',
      c1933: 'Hâlâ camidir; 1934\'te müzeye dönüştürülmesine karar verilecektir.',
      bugun: 'İçindeki "terleyen sütun"a dilek ve şifa için dokunulduğu anlatılır.',
    },
  },
  topkapi: {
    x: 462, y: 262, label: [0, -16, 'middle'],
    names: { c532: 'Akropolis', c1580: 'Topkapı Sarayı', c1933: 'Topkapı Sarayı Müzesi', bugun: 'Topkapı Sarayı' },
    notes: {
      c532: 'Sarayburnu, antik Byzantion\'un akropolüdür.',
      c1580: 'Osmanlı sultanlarının sarayıdır; divan burada toplanır.',
      c1933: 'Saray 1924\'te müzeye dönüştürülmüştür.',
      bugun: 'Saray müzesi; kutsal emanetler ve hazine dairesi ziyaret edilir.',
    },
  },
  sirkeci: {
    x: 378, y: 236, label: [-14, -8, 'end'],
    names: { c532: 'Prosphorion Limanı', c1580: 'Eminönü İskelesi', c1933: 'Sirkeci Garı', bugun: 'Sirkeci (Marmaray)' },
    notes: {
      c532: 'Haliç ağzındaki eski liman, şehrin ticaret kapılarından biridir.',
      c1580: 'Kayıklar Galata\'ya ve Üsküdar\'a buradan geçer.',
      c1933: 'Doğu Ekspresi\'nin son durağı Sirkeci Garı 1890\'da açılmıştır.',
      bugun: 'Marmaray, Boğaz\'ın altından geçerek Sirkeci\'yi Üsküdar\'a bağlar.',
    },
  },
  galata: {
    x: 392, y: 136, label: [-14, 4, 'end'], tilsim: true,
    names: { c532: 'Sykai', c1580: 'Galata Kulesi', c1933: 'Galata Kulesi', bugun: 'Galata Kulesi' },
    notes: {
      c532: 'Haliç\'in karşı kıyısındaki Sykai semtidir; bugünkü kule henüz yoktur.',
      c1580: 'Kule 1348\'de Cenevizliler tarafından yapılmıştır; Galata\'da yabancı tüccarlar yaşar.',
      c1933: 'Kule uzun süre yangın gözetleme kulesi olarak kullanılmıştır.',
      bugun: 'Evliya Çelebi, Hezarfen Ahmed Çelebi\'nin buradan Üsküdar\'a uçtuğunu anlatır.',
    },
  },
  tophane: {
    x: 482, y: 128, label: [0, 26, 'middle'], tilsim: true,
    names: { c532: 'Kıyı Yamacı', c1580: 'Tophane Rasathanesi', c1933: 'Tophane', bugun: 'Tophane' },
    notes: {
      c532: 'Boğaz kıyısında küçük iskeleler ve bağlar vardır.',
      c1580: 'Takiyüddin\'in 1577\'de kurduğu rasathane 1580\'de yıktırılır.',
      c1933: 'Top dökümhanesinin adını taşıyan semt, kıyı boyunca uzanır.',
      bugun: 'Kıyıdaki eski depolar müzeye ve sanat mekânlarına dönüşmüştür.',
    },
  },
  pera: {
    x: 430, y: 72, label: [-14, 4, 'end'],
    names: { c532: 'Bağlar', c1580: 'Pera Bağları', c1933: 'Pera Palas', bugun: 'İstiklal' },
    notes: {
      c532: 'Sırtlar bağ ve bahçelerle kaplıdır.',
      c1580: 'Venedik balyosu ve yabancı elçiler bu sırtlarda konaklar.',
      c1933: 'Pera Palas 1892\'de Doğu Ekspresi yolcuları için açılmıştır; Tünel ve tramvay yakındadır.',
      bugun: 'İstiklal Caddesi, tarihi tramvayıyla şehrin en kalabalık caddelerinden biridir.',
    },
  },
  rumelihisari: {
    x: 566, y: 44, label: [-14, 4, 'end'],
    names: { c532: null, c1580: 'Rumeli Hisarı', c1933: 'Rumeli Hisarı', bugun: 'Rumeli Hisarı' },
    notes: {
      c1580: 'Hisar 1452\'de Fatih Sultan Mehmed tarafından birkaç ay içinde yaptırılmıştır.',
      c1933: 'Hisarın içinde küçük bir mahalle yaşamaktadır.',
      bugun: 'Hisar müze ve açık hava sahnesi olarak kullanılır.',
    },
  },
  kizkulesi: {
    x: 612, y: 300, label: [0, 26, 'middle'], tilsim: true, island: true,
    names: { c532: 'Kayalık', c1580: 'Kız Kulesi', c1933: 'Kız Kulesi Feneri', bugun: 'Kız Kulesi' },
    notes: {
      c532: 'Boğaz\'ın ağzındaki küçük kayalık hakkında pek çok efsane anlatılır.',
      c1580: 'Kayalığın üzerinde bir kule vardır.',
      c1933: 'Kule deniz feneri olarak çalışır.',
      bugun: 'Efsaneye göre kehanetten korunmak için buraya kapatılan prensesi bir yılan sokmuştur. Kule 2023\'te restorasyondan sonra yeniden açıldı.',
    },
  },
  uskudar: {
    x: 740, y: 262, label: [0, 26, 'middle'],
    names: { c532: 'Khrysopolis', c1580: 'Üsküdar', c1933: 'Haydarpaşa Garı', bugun: 'Üsküdar' },
    notes: {
      c532: 'Asya kıyısındaki Khrysopolis, Boğaz geçişinin karşı ucudur.',
      c1580: 'Mihrimah Sultan Camii, Sinan\'ın eseri olarak iskelenin başında durur.',
      c1933: 'Haydarpaşa Garı 1908\'de açılmıştır; Anadolu trenleri buradan kalkar.',
      bugun: 'Üsküdar iskelesi, vapur ve Marmaray ile iki yakayı bağlar.',
    },
  },
};

// Kara yolları (maliyet 1)
export const LAND_EDGES = [
  ['surlar', 'yenikapi'], ['surlar', 'suleymaniye'], ['yenikapi', 'cemberlitas'],
  ['suleymaniye', 'kapalicarsi'], ['kapalicarsi', 'cemberlitas'], ['cemberlitas', 'yerebatan'],
  ['cemberlitas', 'hipodrom'], ['hipodrom', 'ayasofya'], ['yerebatan', 'ayasofya'], ['ayasofya', 'topkapi'],
  ['yerebatan', 'sirkeci'], ['sirkeci', 'topkapi'], ['suleymaniye', 'sirkeci'],
  ['galata', 'pera'], ['galata', 'tophane'], ['pera', 'tophane'], ['tophane', 'rumelihisari'],
];

// Deniz yolları (kayık / vapur). Normalde bir Yürü eyleminin tamamını harcar.
export const SEA_EDGES = [
  ['sirkeci', 'galata'], ['topkapi', 'kizkulesi'], ['tophane', 'uskudar'],
  ['kizkulesi', 'uskudar'], ['rumelihisari', 'uskudar'],
];

// Yalnız "Bugün" çağında: Marmaray (Boğaz'ın altından tek adım)
export const RAIL_EDGES = [['sirkeci', 'uskudar']];

export const TILSIMLAR = {
  hipodrom: 'Yılanlı Sütun',
  yerebatan: 'Medusa Başları',
  cemberlitas: 'Çemberlitaş',
  ayasofya: 'Terleyen Sütun',
  kizkulesi: 'Kız Kulesi',
  galata: 'Hezarfen\'in Kanatları',
  tophane: 'Yıldız Cetveli',
};

export const LOCATION_IDS = Object.keys(LOCATIONS);
