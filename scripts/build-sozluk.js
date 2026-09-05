/**
 * Ham TDK verisini oyunun kullanacağı zengin sözlüğe çevirir.
 *
 * Girdi  : data/tdk-raw.jsonl   (tdk-fetch.js üretir)
 *          data/frekans.txt     (tdk-fetch.js indirir)
 * Çıktı  : src/assets/words/sozluk.json  -> yeni ana kaynak
 *          src/assets/words/words.json   -> eski şema (piramit + passaparola bunu okuyor)
 *
 * sozluk.json'daki bir kayıt:
 *   w   kelime
 *   m   anlam (tek cümle, temizlenmiş)
 *   t   söz türü        ["isim"] / ["sıfat","zarf"]
 *   e   kullanım etiketi ["eskimiş"] / ["argo"] / ["halk ağzı"]  — boşsa temiz
 *   a   alan etiketi     ["tıp"] / ["denizcilik"] — uzmanlık kelimesi
 *   o   1 ise özel isim (Afrika, Abhaz…)
 *   k   köken ("Arapça", "Farsça", "Fransızca"…)
 *   f   frekans (OpenSubtitles sayımı, 0 = hiç geçmiyor)
 *   z   zorluk 1=kolay 2=orta 3=zor
 *   d   1 ise türemiş biçim (açılma, adama…) — cevap olmaz, tahmin olarak geçerli
 *   s   1 ise anlam kelimenin kendisini sızdırıyor
 *
 * Kullanım: node scripts/build-sozluk.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const RAW = path.join(DATA_DIR, 'tdk-raw.jsonl');
const FREQ = path.join(DATA_DIR, 'frekans.txt');

/*
 * sozluk.json ve words.json BİLEREK src/assets/words dışında tutuluyor.
 * İkisi de sadece build script'lerinin okuduğu ara ürün — hiçbir bileşen
 * bunları fetch etmiyor (PyramidService.getJsonData() inject ediliyor ama
 * hiç çağrılmıyor; piramit ekranı hazır pyramids.json'u okuyor). src/assets
 * altına konsaydı Angular tüm klasörü olduğu gibi kopyalar ve bu ~10 MB
 * her ziyaretçiye deploy edilirdi. data/ zaten .gitignore'da.
 */
const OUT_SOZLUK = path.join(DATA_DIR, 'sozluk.json');
const OUT_WORDS = path.join(DATA_DIR, 'words.json');

const ALPHABET = 'abcçdefgğhıijklmnoöprsştuüvyz';
const AB = new Set(ALPHABET.split(''));

/** Cevap havuzundan çıkarılacak kullanım etiketleri (TDK "tam_adi" değerleri) */
const KOTU_ETIKET = new Set([
  'eskimiş', 'halk ağzında', 'argo', 'teklifsiz konuşmada', 'kaba konuşmada',
  'hakaret yollu', 'şaka yollu', 'alay yollu', 'çocuk dili',
]);

/** Söz türleri — bunlar etiket değil, kelimenin türü */
const SOZ_TURU = new Set([
  'isim', 'sıfat', 'zarf', 'zamir', 'edat', 'bağlaç', 'ünlem',
  'yardımcı fiil', 'birleşik fiil', 'geçişli fiil', 'geçişsiz fiil', 'nesnesiz fiil',
]);

// --- yardımcılar -----------------------------------------------------------

const trLower = (s) => s.replace(/İ/g, 'i').replace(/I/g, 'ı').toLocaleLowerCase('tr');

function temizAnlam(m) {
  if (typeof m !== 'string') return '';
  let t = m
    .replace(/<[^>]*>/g, '')       // TDK anlam_html kalıntıları
    .replace(/\s+/g, ' ')
    .trim();
  while (t.endsWith('.') || t.endsWith(':') || t.endsWith(',')) t = t.slice(0, -1);
  return t.trim();
}

/**
 * Anlam kelimenin kendisini ele veriyor mu?
 * Sadece anlamın ipucu olarak gösterildiği modlarda (piramit, passaparola) önemli;
 * Klasik/Gizli Kelime'de anlam oyun bittikten sonra çıkıyor.
 * Projedeki mevcut mantıkla aynı: anlamdaki her sözcüğün gövdesi kelimeyle
 * karşılıklı olarak içeriliyor mu diye bakılıyor.
 */
function sizdiriyorMu(anlam, kelime) {
  const kok = trLower(kelime).replace(/(mak|mek|ma|me)$/, '');
  if (kok.length < 3) return false;
  for (let s of trLower(anlam).split(/[\s,;()]+/)) {
    s = s.replace(/(mak|mek|ma|me)$/, '');
    if (s.length < 3) continue;
    if (s.includes(kok) || kok.includes(s)) return true;
  }
  return false;
}

/**
 * Türemiş biçim tespiti — iki kademeli.
 *
 * Ek kuralı tek başına yetmiyor: "belli", "çiftçi", "cinsel", "çöplük" de ek
 * almış ama bunlar gayet iyi cevaplar. Ayırt edici işaret TDK'nın tanımı:
 * içi boş türemelerin anlamı "…mak işi", "… olma durumu" kalıbında yazılıyor.
 *
 *   d = 1  mekanik türeme  (açma: "Açmak işi") -> cevap havuzundan çıkar
 *   d = 2  sözlükselleşmiş (bağlama: bir çalgı) -> yalnızca nadirse çıkar
 */
const EKLER = [
  // fiilden isim: açılma, adama, abartma / bakış, geliş
  { ek: ['ma', 'me'], kokEk: ['mak', 'mek'] },
  { ek: ['ış', 'iş', 'uş', 'üş'], kokEk: ['mak', 'mek'] },
  // isimden isim/sıfat
  { ek: ['lık', 'lik', 'luk', 'lük'] },
  { ek: ['sız', 'siz', 'suz', 'süz'] },
  { ek: ['lı', 'li', 'lu', 'lü'] },
  { ek: ['cı', 'ci', 'cu', 'cü', 'çı', 'çi', 'çu', 'çü'] },
  { ek: ['ca', 'ce', 'ça', 'çe'] },
  { ek: ['sal', 'sel'] },
];

/** "Açmak işi", "Aç olma durumu", "Abartma işi veya biçimi" gibi içi boş tanımlar */
const BOS_TANIM = /(işi|işi veya biçimi|olma durumu|olma işi|olma hâli|durumu)$/;

function turemisMi(w, anlamlar, headSet) {
  let ekVar = false;
  for (const kural of EKLER) {
    for (const ek of kural.ek) {
      if (!w.endsWith(ek) || w.length - ek.length < 2) continue;
      const govde = w.slice(0, -ek.length);
      if (kural.kokEk) {
        if (kural.kokEk.some((ke) => headSet.has(govde + ke))) ekVar = true;
      } else if (headSet.has(govde)) {
        ekVar = true;
      }
    }
  }
  if (!ekVar) return 0;
  // Tanımların TAMAMI içi boşsa mekanik; bir tanesi bile gerçek anlam
  // taşıyorsa (bağlama = çalgı) kelime sözlükselleşmiştir.
  if (!anlamlar.length) return 2;
  return anlamlar.every((m) => BOS_TANIM.test(trLower(m).trim())) ? 1 : 2;
}

function zorluk(f) {
  if (f >= 400) return 1;
  if (f >= 25) return 2;
  return 3;
}

// --- frekans ---------------------------------------------------------------

if (!fs.existsSync(RAW)) {
  console.error('data/tdk-raw.jsonl yok. Önce: node scripts/tdk-fetch.js');
  process.exit(1);
}

const frekans = new Map();
if (fs.existsSync(FREQ)) {
  for (const line of fs.readFileSync(FREQ, 'utf8').split('\n')) {
    const i = line.indexOf(' ');
    if (i < 1) continue;
    const w = line.slice(0, i);
    if (!frekans.has(w)) frekans.set(w, Number(line.slice(i + 1)));
  }
  console.log(`Frekans listesi: ${frekans.size} kelime`);
} else {
  console.warn('UYARI: data/frekans.txt yok — zorluk katmanı hesaplanamayacak (hepsi z=3).');
}

// --- ham veriyi oku --------------------------------------------------------

const kayitlar = new Map(); // kelime -> kayıt
const headSet = new Set();  // türemiş tespiti için tüm madde başları
const ham = [];

let satir = 0, bos = 0, essesli = 0;
for (const line of fs.readFileSync(RAW, 'utf8').split('\n')) {
  if (!line.trim()) continue;
  satir++;
  let o;
  try { o = JSON.parse(line); } catch { continue; }

  // gts?ara= eşsesli maddeleri dizi olarak döndürüyor: "yüz" (sayı) / "yüz" (çehre)
  const liste = Array.isArray(o.d) ? o.d : o.d ? [o.d] : [];
  const gecerli = liste.filter((d) => d && !d.error && d.madde);
  if (!gecerli.length) { bos++; continue; }
  if (gecerli.length > 1) essesli++;

  const w = trLower(String(gecerli[0].madde).trim());
  headSet.add(w);
  ham.push({ w, liste: gecerli });
}
console.log(
  `Ham kayıt: ${satir} satır, ${bos} sözlükte yok, ${essesli} eşsesli, ${headSet.size} tekil madde`
);

// --- kayıtları kur ---------------------------------------------------------

for (const { w, liste } of ham) {
  if (kayitlar.has(w)) continue;

  // Eşsesli maddeler birleştiriliyor: anlamlar sırayla, etiketler birleşim.
  const gecerliAnlamlar = [];
  const turler = new Set();
  const etiketler = new Set();
  const alanlar = new Set();
  let kokenler = [];

  for (const d of liste) {
    const anlamlar = Array.isArray(d.anlamlarListe) ? d.anlamlarListe : [];
    for (const a of anlamlar) {
      const m = temizAnlam(a.anlam);
      // Yönlendirmeler (► bakınız) gösterilebilir tanım değil
      if (!m || m.startsWith('►') || m.startsWith('bakınız')) continue;
      gecerliAnlamlar.push(m);
    }
    for (const a of anlamlar) {
      for (const oz of a.ozelliklerListe || []) {
        const ad = String(oz.tam_adi || '').trim();
        if (!ad) continue;
        if (SOZ_TURU.has(ad)) turler.add(ad);
        else if (KOTU_ETIKET.has(ad)) etiketler.add(ad);
        else alanlar.add(ad);
      }
    }
    const k = (String(d.lisan || '').split(' ')[0] || '').trim();
    if (k) kokenler.push(k);
  }
  if (/(mak|mek)$/.test(w)) turler.add('fiil');

  // Özel isim sayılması için TÜM eşsesli maddelerin özel olması gerekiyor;
  // bir tanesi bile cins isimse kelime oyunda kullanılabilir.
  const hepsiOzel = liste.every((d) => String(d.ozel_mi) === '1');

  const f = frekans.get(w) ?? 0;
  const kayit = {
    w,
    m: gecerliAnlamlar[0] || '',
    t: [...turler],
    e: [...etiketler],
    a: [...alanlar],
    o: hepsiOzel ? 1 : 0,
    k: kokenler[0] || '',
    f,
    z: zorluk(f),
  };
  if (kayit.m && sizdiriyorMu(kayit.m, w)) kayit.s = 1;
  kayit._anlamlar = gecerliAnlamlar;
  kayitlar.set(w, kayit);
}

// türemiş bayrağı (tüm madde başları toplandıktan sonra)
let mekanik = 0, sozluksel = 0;
for (const k of kayitlar.values()) {
  const t = turemisMi(k.w, k._anlamlar, headSet);
  if (t) { k.d = t; t === 1 ? mekanik++ : sozluksel++; }
  delete k._anlamlar;
}

const liste = [...kayitlar.values()].sort((a, b) => a.w.localeCompare(b.w, 'tr'));
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.writeFileSync(OUT_SOZLUK, JSON.stringify(liste), 'utf8');

// --- eski şema (words.json) ------------------------------------------------

const eski = {};
for (const k of liste) {
  const bas = k.w[0].toLocaleUpperCase('tr');
  (eski[bas] ??= {})[k.w] = k.m || 'yok';
}
fs.writeFileSync(OUT_WORDS, JSON.stringify(eski, null, 2), 'utf8');

// --- rapor -----------------------------------------------------------------

const temiz = liste.filter(
  (k) => k.m && !k.o && !k.e.length && k.d !== 1 && !(k.d === 2 && k.z === 3)
    && [...k.w].every((c) => AB.has(c))
);
const uz = {};
for (const k of temiz) if (k.w.length >= 4 && k.w.length <= 7) (uz[k.w.length] ??= [0, 0, 0]) && uz[k.w.length][k.z - 1]++;

console.log(`\nsozluk.json  -> ${liste.length} madde`);
console.log(`  anlamı olan       : ${liste.filter((k) => k.m).length}`);
console.log(`  özel isim         : ${liste.filter((k) => k.o).length}`);
console.log(`  eskimiş/argo/ağız : ${liste.filter((k) => k.e.length).length}`);
console.log(`  mekanik türeme    : ${mekanik}  (açma: "Açmak işi" — cevap olmaz)`);
console.log(`  sözlükselleşmiş   : ${sozluksel}  (bağlama: bir çalgı — nadirse çıkar)`);
console.log(`  anlamı sızdıran   : ${liste.filter((k) => k.s).length}`);
console.log(`\nCevap havuzuna uygun (4-7 harf), zorluğa göre:`);
for (const l of [4, 5, 6, 7]) {
  const [a, b, c] = uz[l] || [0, 0, 0];
  console.log(`  ${l} harf: kolay ${a}, orta ${b}, zor ${c}  (toplam ${a + b + c})`);
}
console.log(`\nYazıldı -> ${OUT_SOZLUK}`);
console.log(`Yazıldı -> ${OUT_WORDS}`);
console.log('\nSıradaki adım: node scripts/generate-klasik.js && node scripts/generate-gizli-kelime.js');
