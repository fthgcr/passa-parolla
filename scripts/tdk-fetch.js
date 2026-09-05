/**
 * TDK Güncel Türkçe Sözlük'ü indirir.
 *
 * Çıktı : data/tdk-raw.jsonl   (her satır bir kelime, ham TDK yanıtı)
 *         data/frekans.txt     (OpenSubtitles Türkçe frekans listesi)
 *         data/madde-listesi.txt (madde başları)
 *
 * NOT — TDK uçları hakkında:
 *   sozluk.gov.tr/autocomplete.json  ölü, HTML döndürüyor
 *   sozluk.gov.tr/gts_id?id=…        ölü, geçerli id'de bile "Sonuç bulunamadı"
 *   sozluk.gov.tr/gts?ara=<kelime>   ÇALIŞIYOR — kullandığımız bu
 *
 *   Madde başı listesini TDK vermediği için CanNuhlar/Turkce-Kelime-Listesi
 *   (TDK imla kılavuzundan derlenmiş 76k kelime) üzerinden gidiyoruz.
 *   Kendi listen varsa: --liste yol/dosya.txt (satır başına bir kelime)
 *
 * Kesintiye uğrarsa kaldığı yerden devam eder — dosyayı silmeden tekrar çalıştır.
 *
 * Kullanım:
 *   node scripts/tdk-fetch.js                 # tamamı (~54k kelime, 25-40 dk)
 *   node scripts/tdk-fetch.js --limit 200     # deneme
 *   node scripts/tdk-fetch.js --concurrency 8
 *   node scripts/tdk-fetch.js --min 3 --max 12
 *   node scripts/tdk-fetch.js --probe         # uçları test et, indirme yapma
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const RAW = path.join(DATA_DIR, 'tdk-raw.jsonl');
const FREQ = path.join(DATA_DIR, 'frekans.txt');
const MADDE = path.join(DATA_DIR, 'madde-listesi.txt');

const GTS = (w) => `https://sozluk.gov.tr/gts?ara=${encodeURIComponent(w)}`;
const LISTE_URL =
  'https://raw.githubusercontent.com/CanNuhlar/Turkce-Kelime-Listesi/master/turkce_kelime_listesi.txt';
const FREQ_URL =
  'https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/tr/tr_full.txt';

const argv = process.argv.slice(2);
const argOf = (n, d) => { const i = argv.indexOf(n); return i === -1 ? d : argv[i + 1]; };
const LIMIT = Number(argOf('--limit', 0)) || 0;
const CONCURRENCY = Number(argOf('--concurrency', 6)) || 6;
const MIN_LEN = Number(argOf('--min', 3)) || 3;
const MAX_LEN = Number(argOf('--max', 12)) || 12;
const LISTE_DOSYA = argOf('--liste', null);
const PROBE = argv.includes('--probe');

const ALPHABET = 'abcçdefgğhıijklmnoöprsştuüvyz';
const AB = new Set(ALPHABET.split(''));
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const trLower = (s) => s.replace(/İ/g, 'i').replace(/I/g, 'ı').toLocaleLowerCase('tr');

async function getJson(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': UA,
          Accept: 'application/json,text/plain,*/*',
          Referer: 'https://sozluk.gov.tr/',
        },
      });
      if (res.status === 429 || res.status >= 500) throw new Error('HTTP ' + res.status);
      const text = await res.text();
      const t = text.trim();
      if (!t.startsWith('[') && !t.startsWith('{')) {
        throw new Error('JSON değil (ilk 60: ' + t.slice(0, 60).replace(/\s+/g, ' ') + ')');
      }
      return JSON.parse(t);
    } catch (e) {
      if (i === tries - 1) throw e;
      await sleep(600 * Math.pow(2, i) + Math.random() * 400);
    }
  }
}

async function indir(url, hedef, ad) {
  if (fs.existsSync(hedef)) { console.log(`${ad} zaten var, atlanıyor`); return fs.readFileSync(hedef, 'utf8'); }
  console.log(`${ad} indiriliyor…`);
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${ad} indirilemedi: HTTP ${res.status}`);
  return await res.text();
}

async function frekansHazirla() {
  if (fs.existsSync(FREQ)) { console.log('frekans.txt zaten var, atlanıyor'); return; }
  const text = await indir(FREQ_URL, '/dev/null/yok', 'Frekans listesi');
  const out = [];
  for (const line of text.split('\n')) {
    const i = line.indexOf(' ');
    if (i < 1) continue;
    const w = line.slice(0, i);
    const c = Number(line.slice(i + 1));
    if (!(c >= 3) || w.length < 2 || w.length > 14) continue;
    if ([...w].every((ch) => AB.has(ch))) out.push(w + ' ' + c);
  }
  fs.writeFileSync(FREQ, out.join('\n'), 'utf8');
  console.log(`frekans.txt yazıldı — ${out.length} kelime`);
}

async function maddeListesi() {
  let text;
  if (LISTE_DOSYA) {
    console.log('Madde listesi (yerel):', LISTE_DOSYA);
    text = fs.readFileSync(LISTE_DOSYA, 'utf8');
  } else if (fs.existsSync(MADDE)) {
    console.log('madde-listesi.txt zaten var, atlanıyor');
    text = fs.readFileSync(MADDE, 'utf8');
  } else {
    text = await indir(LISTE_URL, MADDE, 'Madde listesi');
  }

  const set = new Set();
  for (const satir of text.split('\n')) {
    const w = trLower(satir.trim());
    if (!w) continue;
    if (/[\s\/\-’']/.test(w)) continue;              // "a / e", birleşik yazımlar
    if (w.length < MIN_LEN || w.length > MAX_LEN) continue;
    if (![...w].every((c) => AB.has(c))) continue;
    set.add(w);
  }
  const liste = [...set].sort((a, b) => a.localeCompare(b, 'tr'));
  if (!fs.existsSync(MADDE)) fs.writeFileSync(MADDE, liste.join('\n'), 'utf8');
  return liste;
}

function yapilanlar() {
  const done = new Set();
  if (!fs.existsSync(RAW)) return done;
  let satir = 0;
  for (const line of fs.readFileSync(RAW, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    satir++;
    try { const o = JSON.parse(line); if (o.w) done.add(o.w); } catch { /* yarım son satır */ }
  }
  console.log(`Önceki kayıt: ${satir} satır, ${done.size} kelime tamam`);
  return done;
}

async function probe() {
  const testler = [
    ['gts?ara=kalem      ', 'https://sozluk.gov.tr/gts?ara=kalem'],
    ['gts_id?id=37625    ', 'https://sozluk.gov.tr/gts_id?id=37625'],
    ['autocomplete.json  ', 'https://sozluk.gov.tr/autocomplete.json'],
  ];
  for (const [ad, url] of testler) {
    try {
      const d = await getJson(url, 1);
      const ilk = Array.isArray(d) ? d[0] : d;
      console.log(`  ${ad} OK  ${ilk?.madde ? 'madde=' + ilk.madde : JSON.stringify(ilk).slice(0, 60)}`);
    } catch (e) {
      console.log(`  ${ad} HATA  ${e.message.slice(0, 70)}`);
    }
  }
}

(async () => {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  if (PROBE) { console.log('TDK uç testleri:'); await probe(); return; }

  await frekansHazirla();
  let liste = await maddeListesi();
  console.log(`Madde listesi: ${liste.length} kelime (${MIN_LEN}-${MAX_LEN} harf)`);
  if (LIMIT) liste = liste.slice(0, LIMIT);

  const done = yapilanlar();
  const todo = liste.filter((w) => !done.has(w));
  if (!todo.length) { console.log('Her şey zaten indirilmiş.'); return; }
  console.log(`İndirilecek: ${todo.length} kelime (eşzamanlı ${CONCURRENCY})\n`);

  const out = fs.createWriteStream(RAW, { flags: 'a' });
  let ok = 0, yok = 0, fail = 0, i = 0;
  const t0 = Date.now();

  async function worker() {
    while (i < todo.length) {
      const w = todo[i++];
      try {
        const data = await getJson(GTS(w));
        // Bulunamayanı da yazıyoruz ki tekrar çalıştırmada boşuna sorulmasın.
        const bos = !Array.isArray(data) || !data.length || data.error;
        out.write(JSON.stringify({ w, d: bos ? null : data }) + '\n');
        bos ? yok++ : ok++;
      } catch (e) {
        fail++;
        if (fail <= 15) console.warn(`  ! ${w}: ${e.message.slice(0, 70)}`);
        if (fail === 16) console.warn('  … sonraki hatalar susturuldu');
      }
      const n = ok + yok + fail;
      if (n % 500 === 0) {
        const hz = n / ((Date.now() - t0) / 1000);
        console.log(
          `  ${n}/${todo.length}  (${hz.toFixed(1)}/sn, ~${Math.round((todo.length - n) / hz / 60)} dk kaldı,` +
          ` bulunan ${ok}, sözlükte yok ${yok}, hata ${fail})`
        );
      }
      await sleep(40);
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  out.end();
  console.log(`\nBitti — ${ok} madde indi, ${yok} kelime sözlükte yok, ${fail} hata.`);
  if (fail > todo.length * 0.05) {
    console.log('Hata oranı yüksek. Komutu tekrar çalıştır — eksikler tamamlanır.');
  }
  console.log('Sıradaki adım: npm run sozluk:kur');
})().catch((e) => {
  console.error('\nHATA:', e.message);
  console.error('Dosya korundu — komutu tekrar çalıştırınca kaldığı yerden devam eder.');
  console.error('Uçları test etmek için: node scripts/tdk-fetch.js --probe');
  process.exit(1);
});
