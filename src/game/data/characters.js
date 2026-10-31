// İz sistemi: her değer tam iki karakterde, herhangi iki karakter en fazla bir izi paylaşır.
export const IZ_CATEGORIES = {
  ayakkabi: { label: 'Ayakkabı', values: ['Sandalet', 'Mest', 'Potin', 'Rugan'] },
  koku: { label: 'Koku', values: ['Mürekkep', 'Deniz tuzu', 'Tütün', 'Gül suyu'] },
  nesne: { label: 'Nesne', values: ['Anahtar', 'Pusula', 'Kalem', 'Cep saati'] },
  renk: { label: 'Renk', values: ['Lacivert', 'Zümrüt', 'Bordo', 'Hardal'] },
};

export const CHARACTERS = [
  {
    id: 'eleni', name: 'Kâtip Eleni', era: '532', image: 'assets/karakter_eleni.webp',
    ability: 'arsiv', abilityName: 'Arşiv',
    abilityText: 'Bu çağda başka birinin Gizli İncele ile okuduğu son paragrafı sen de okursun. Yalan yakalamanın en güvenli yolu.',
    iz: { ayakkabi: 'Sandalet', koku: 'Mürekkep', nesne: 'Anahtar', renk: 'Lacivert' },
  },
  {
    id: 'yorgo', name: 'Kayıkçı Yorgo', era: '1580', image: 'assets/karakter_yorgo.webp',
    ability: 'kurek', abilityName: 'Kürek', passive: true,
    abilityText: 'Her zaman geçerli: deniz geçişi tek adım sayılır ve Yürü ile 3 adım gidersin.',
    iz: { ayakkabi: 'Sandalet', koku: 'Deniz tuzu', nesne: 'Pusula', renk: 'Zümrüt' },
  },
  {
    id: 'zeynep', name: 'Hattat Zeynep', era: '1580', image: 'assets/karakter_zeynep.webp',
    ability: 'hat', abilityName: 'Hat Bilgisi', passive: true,
    abilityText: 'Her zaman geçerli: bulmacalarda ipucu görürsün ve yanlış cevap ceza getirmez.',
    iz: { ayakkabi: 'Mest', koku: 'Mürekkep', nesne: 'Kalem', renk: 'Bordo' },
  },
  {
    id: 'riza', name: 'Hafiye Rıza Efendi', era: '1933', image: 'assets/karakter_riza.webp',
    ability: 'takip', abilityName: 'Takip',
    abilityText: 'Aynı mekândaki bir oyuncuya Takip koy. O gece suikast yaparsa sabah herkes öğrenir.',
    iz: { ayakkabi: 'Mest', koku: 'Tütün', nesne: 'Cep saati', renk: 'Lacivert' },
  },
  {
    id: 'deniz', name: 'Arkeolog Deniz', era: 'Bugün', image: 'assets/karakter_deniz.webp',
    ability: 'katman', abilityName: 'Katman',
    abilityText: 'Bulunduğun mekânın derin katmanını kazarsın: vakanın bu mekândaki gizli ek ipucunu okursun.',
    iz: { ayakkabi: 'Potin', koku: 'Deniz tuzu', nesne: 'Anahtar', renk: 'Hardal' },
  },
  {
    id: 'nevres', name: 'Hekim Nevres Hanım', era: '1933', image: 'assets/karakter_nevres.webp',
    ability: 'otopsi', abilityName: 'Otopsi',
    abilityText: 'Cesetli bir mekânda kullan: Gölge\'nin Delil Kutusu\'ndaki izlerinden birini gizlice görürsün.',
    iz: { ayakkabi: 'Potin', koku: 'Gül suyu', nesne: 'Cep saati', renk: 'Zümrüt' },
  },
  {
    id: 'agop', name: 'Fotoğrafçı Agop', era: '1933', image: 'assets/karakter_agop.webp',
    ability: 'pozlama', abilityName: 'Pozlama',
    abilityText: 'Bulunduğun mekâna Fotoğraf koy: bu gece orada ne suikast ne tılsım hırsızlığı olabilir.',
    iz: { ayakkabi: 'Rugan', koku: 'Tütün', nesne: 'Pusula', renk: 'Bordo' },
  },
  {
    id: 'selma', name: 'Gazeteci Selma', era: '1933', image: 'assets/karakter_selma.webp',
    ability: 'manset', abilityName: 'Manşet', passive: true,
    abilityText: 'Her zaman geçerli: Açık İncele sana 1 eylem tutar.',
    iz: { ayakkabi: 'Rugan', koku: 'Gül suyu', nesne: 'Kalem', renk: 'Hardal' },
  },
];

export const CHAR_BY_ID = Object.fromEntries(CHARACTERS.map((c) => [c.id, c]));
