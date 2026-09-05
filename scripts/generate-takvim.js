/**
 * Günlük kelime takvimini üretir.
 *
 * Kaynak : src/assets/words/sozluk.json
 * Çıktı  : src/assets/words/klasik-takvim.json
 *          src/assets/words/gizli-takvim.json
 *
 * Neden takvim?
 *   Eski yöntem günün kelimesini havuzdan hash ile seçiyordu:
 *   seededIndex("klasik#2026-09-05#5", havuz.length). Bu, kelimeyi havuzun
 *   uzunluğuna bağlı kılıyor — havuza tek kelime eklemek 365 günün 365'ini
 *   birden değiştiriyor. Üstelik seçim tekrar edebiliyor (1992 kelimelik
 *   havuzda bir yılda 23 tekrar; "oktan" üç kez).
 *
 *   Takvim bunu tersine çeviriyor: program bir kez üretilip dosyaya yazılıyor.
 *   Havuzu sonradan yenilesen de yazılmış günler oynamıyor, tekrar olmuyor,
 *   ve yayına almadan önce listeyi elle gözden geçirebiliyorsun.
 *
 * Tekrar çalıştırma:
 *   Mevcut takvimdeki günler KORUNUR, sadece eksik günler eklenir. Yani bunu
 *   yılda bir çalıştırıp takvimi uzatabilirsin. Bir kelimeyi beğenmezsen
 *   JSON'dan o günü sil ve tekrar çalıştır — yerine yenisi gelir.
 *
 * Kullanım:
 *   node scripts/generate-takvim.js                 # bugünden itibaren 400 gün
 *   node scripts/generate-takvim.js --gun 800
 *   node scripts/generate-takvim.js --baslangic 2026-09-06
 *   node scripts/generate-takvim.js --sifirla       # mevcut takvimi yok say
 */
const fs = require('fs');
const path = require('path');
const { yukle, cevapOlurMu, sirala } = require('./lib/havuz');

const WORDS_DIR = path.join(__dirname, '..', 'src', 'assets', 'words');
const UZUNLUKLAR = [4, 5, 6, 7];

const argv = process.argv.slice(2);
const argOf = (n, d) => { const i = argv.indexOf(n); return i === -1 ? d : argv[i + 1]; };
const GUN_SAYISI = Number(argOf('--gun', 400)) || 400;
const SIFIRLA = argv.includes('--sifirla');

const p2 = (n) => String(n).padStart(2, '0');
const anahtar = (d) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
const BUGUN = anahtar(new Date());
const BASLANGIC = argOf('--baslangic', BUGUN);

/**
 * Haftanın gününe göre zorluk tercihi (JS getDay: 0 Pazar … 6 Cumartesi).
 * Sıradaki değerler tercih sırası: ilk kova boşsa sonrakine düşer.
 */
const ZORLUK_TAKVIMI = {
  1: [1, 2],      // Pazartesi — kolay başla
  2: [1, 2],
  3: [2, 1, 3],
  4: [2, 1, 3],
  5: [2, 3, 1],
  6: [2, 3, 1],   // Cumartesi
  0: [3, 2, 1],   // Pazar — haftanın en zoru
};

/** Deterministik karıştırma; aynı girdi her makinede aynı takvimi versin */
function tohum(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function rng(seed) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function karistir(arr, seed) {
  const r = rng(seed);
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function tarihler(basKey, adet) {
  const [y, m, d] = basKey.split('-').map(Number);
  const t = new Date(y, m - 1, d);
  const out = [];
  for (let i = 0; i < adet; i++) { out.push(new Date(t)); t.setDate(t.getDate() + 1); }
  return out;
}

/**
 * Bir mod için takvim kurar.
 * @param ad       dosya adı
 * @param opt      cevapOlurMu seçenekleri (ör. { tekrarsizHarf: true })
 */
function takvimKur(ad, opt) {
  const dosya = path.join(WORDS_DIR, ad);
  const eski = !SIFIRLA && fs.existsSync(dosya)
    ? JSON.parse(fs.readFileSync(dosya, 'utf8'))
    : { gunler: {} };
  const gunler = eski.gunler || {};

  // Havuzu zorluk kovalarına ayır, deterministik karıştır
  const kova = {};   // uzunluk -> zorluk -> [kelime]
  const sayilar = {};
  for (const l of UZUNLUKLAR) { kova[l] = { 1: [], 2: [], 3: [] }; }
  for (const k of sozluk) {
    if (!cevapOlurMu(k, 4, 7, opt)) continue;
    kova[k.w.length][k.z].push({ w: k.w, m: k.m });
  }
  for (const l of UZUNLUKLAR) {
    sayilar[l] = kova[l][1].length + kova[l][2].length + kova[l][3].length;
    for (const z of [1, 2, 3]) {
      kova[l][z].sort(sirala);
      kova[l][z] = karistir(kova[l][z], tohum(`${ad}#${l}#${z}`));
    }
  }

  // Zaten programlanmış kelimeler tekrar kullanılmasın
  const kullanilan = new Set();
  for (const g of Object.values(gunler)) {
    for (const l of UZUNLUKLAR) if (g[l]) kullanilan.add(g[l].w);
  }

  const imlec = {};  // uzunluk -> zorluk -> sıradaki indeks
  for (const l of UZUNLUKLAR) imlec[l] = { 1: 0, 2: 0, 3: 0 };

  let turSayisi = { 4: 1, 5: 1, 6: 1, 7: 1 };

  function dene(l, tercih) {
    for (const z of tercih) {
      const liste = kova[l][z];
      while (imlec[l][z] < liste.length) {
        const aday = liste[imlec[l][z]++];
        if (!kullanilan.has(aday.w)) { kullanilan.add(aday.w); return aday; }
      }
    }
    return null;
  }

  function sec(l, gun) {
    const tercih = ZORLUK_TAKVIMI[gun.getDay()];
    let aday = dene(l, tercih);
    if (aday) return aday;

    // Havuz tükendi: o uzunluk için yeni tura başla. Her kelime bir kez
    // kullanıldıktan sonra tekrar sıraya girer — boş gün bırakmaktan iyidir.
    if (!kova[l][1].length && !kova[l][2].length && !kova[l][3].length) return null;
    for (const g of Object.values(gunler)) if (g[l]) kullanilan.delete(g[l].w);
    imlec[l] = { 1: 0, 2: 0, 3: 0 };
    turSayisi[l]++;
    aday = dene(l, tercih);
    if (aday) return aday;
    // Tercih edilen zorluklar bittiyse hangi kova doluysa oradan al
    return dene(l, [1, 2, 3]);
  }

  const gunListesi = tarihler(BASLANGIC, GUN_SAYISI);
  let eklenen = 0, tukenen = 0;
  for (const gun of gunListesi) {
    const key = anahtar(gun);
    const mevcut = gunler[key] || {};
    let degisti = false;
    for (const l of UZUNLUKLAR) {
      if (mevcut[l]) continue;
      const aday = sec(l, gun);
      if (!aday) { tukenen++; continue; }
      mevcut[l] = aday;
      degisti = true;
    }
    if (degisti) eklenen++;
    gunler[key] = mevcut;
  }

  // Tarihe göre sırala (dosyayı elle okurken kolaylık)
  const sirali = {};
  for (const k of Object.keys(gunler).sort()) sirali[k] = gunler[k];

  const cikti = { uretildi: BUGUN, baslangic: BASLANGIC, sayilar, gunler: sirali };
  fs.writeFileSync(dosya, JSON.stringify(cikti), 'utf8');

  const toplam = Object.keys(sirali).length;
  const kb = Math.round(fs.statSync(dosya).size / 1024);
  console.log(`${ad}`);
  console.log(`  havuz      : ${UZUNLUKLAR.map((l) => `${l}h ${sayilar[l]}`).join(', ')}`);
  console.log(`  takvim     : ${toplam} gün (${eklenen} gün yeni eklendi)`);
  console.log(`  son gün    : ${Object.keys(sirali).pop()}`);
  const ikinciTur = UZUNLUKLAR.filter((l) => turSayisi[l] > 1);
  if (ikinciTur.length) {
    console.log(`  NOT        : ${ikinciTur.map((l) => `${l}h`).join(', ')} havuzu tükendi,` +
      ` kelimeler ikinci tura girdi (havuzu büyütmeyi düşün)`);
  }
  if (tukenen) console.log(`  UYARI      : ${tukenen} slot doldurulamadı — havuz boş`);
  console.log(`  dosya      : ${kb} KB`);
}

const sozluk = yukle();
takvimKur('klasik-takvim.json', {});
console.log();
takvimKur('gizli-takvim.json', { tekrarsizHarf: true });
console.log('\nTakvimi yayına almadan önce dosyayı gözden geçir; beğenmediğin bir günü');
console.log('sil ve scripti tekrar çalıştır, yerine yeni kelime gelir.');
