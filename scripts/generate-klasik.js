/**
 * Klasik (Wordle) modu için kelime havuzlarını üretir.
 *
 * Kaynak : src/assets/words/sozluk.json  (build-sozluk.js üretir)
 * Çıktı  : src/assets/words/klasik.json          -> cevap havuzu  { "4": [{w, m, z}], ... }
 *          src/assets/words/klasik-gecerli.json  -> geçerli tahminler { "4": ["abla", ...], ... }
 *
 * Cevap havuzu süzgeci (havuz.js):
 *   anlamı var + özel isim değil + eskimiş/argo/halk ağzı değil
 *   + türemiş biçim değil + anlam kelimeyi sızdırmıyor
 * Geçerli tahmin havuzu geniş tutulur ki oyuncunun yazdığı gerçek kelime
 * boşuna reddedilmesin.
 *
 * z alanı zorluk: 1 kolay, 2 orta, 3 zor. Günlük kelime zorluğunu haftaya
 * yaymak istersen klasik.service içinde bu alana göre filtre uygulayabilirsin.
 *
 * Kullanım: node scripts/generate-klasik.js
 */
const fs = require('fs');
const path = require('path');
const { yukle, gecerliMi, cevapOlurMu, sirala, yazimTemiz } = require('./lib/havuz');

const WORDS_DIR = path.join(__dirname, '..', 'src', 'assets', 'words');
const MADDE = path.join(__dirname, '..', 'data', 'madde-listesi.txt');
const OUT_ANSWERS = path.join(WORDS_DIR, 'klasik.json');
const OUT_VALID = path.join(WORDS_DIR, 'klasik-gecerli.json');

const MIN_LEN = 4;
const MAX_LEN = 7;

const sozluk = yukle();

const answers = {};
const validSet = {};
for (let l = MIN_LEN; l <= MAX_LEN; l++) { answers[l] = []; validSet[l] = new Set(); }

for (const k of sozluk) {
  if (gecerliMi(k, MIN_LEN, MAX_LEN)) validSet[k.w.length].add(k.w);
  if (cevapOlurMu(k, MIN_LEN, MAX_LEN)) answers[k.w.length].push({ w: k.w, m: k.m, z: k.z });
}

/*
 * TDK GTS'de karşılığı çıkmayan ama imla kılavuzunda geçen kelimeler de geçerli
 * tahmin sayılmalı — oyuncunun yazdığı gerçek kelime reddedilmesin. Cevap
 * olamazlar (anlamları yok), sadece tahmin havuzuna giriyorlar.
 */
let imlaEk = 0;
if (fs.existsSync(MADDE)) {
  for (const satir of fs.readFileSync(MADDE, 'utf8').split('\n')) {
    const w = satir.trim();
    if (w.length < MIN_LEN || w.length > MAX_LEN || !yazimTemiz(w)) continue;
    if (!validSet[w.length].has(w)) { validSet[w.length].add(w); imlaEk++; }
  }
  console.log(`Madde listesinden eklenen geçerli tahmin: ${imlaEk}`);
} else {
  console.warn('NOT: data/madde-listesi.txt yok — geçerli tahmin havuzu yalnızca sözlükten.');
}

const valid = {};
for (let l = MIN_LEN; l <= MAX_LEN; l++) valid[l] = [...validSet[l]];

// Günlük kelime tarihe göre deterministik seçildiği için sıralama sabit olmalı.
for (let l = MIN_LEN; l <= MAX_LEN; l++) {
  answers[l].sort(sirala);
  valid[l].sort((a, b) => a.localeCompare(b, 'tr'));
}

fs.writeFileSync(OUT_ANSWERS, JSON.stringify(answers), 'utf8');
fs.writeFileSync(OUT_VALID, JSON.stringify(valid), 'utf8');

for (let l = MIN_LEN; l <= MAX_LEN; l++) {
  const z = [1, 2, 3].map((n) => answers[l].filter((a) => a.z === n).length);
  console.log(
    `${l} harf: ${answers[l].length} cevap (kolay ${z[0]} / orta ${z[1]} / zor ${z[2]})` +
    ` — ${valid[l].length} geçerli tahmin`
  );
}
console.log('Yazıldı ->', OUT_ANSWERS);
console.log('Yazıldı ->', OUT_VALID);
