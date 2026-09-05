/**
 * Gizli Kelime (Word500 tarzı) modu için kelime havuzu üretir.
 *
 * Kaynak : src/assets/words/sozluk.json  (build-sozluk.js üretir)
 * Çıktı  : src/assets/words/gizli-kelime.json   { "4": [{w, m, z}], ... }
 *
 * Klasik'ten farkı: aynı harf iki kez geçemez (Word500 standart zorluğu).
 * Diğer süzgeçler ortak — havuz.js içinde.
 *
 * Kullanım: node scripts/generate-gizli-kelime.js
 */
const fs = require('fs');
const path = require('path');
const { yukle, cevapOlurMu, sirala } = require('./lib/havuz');

const OUT = path.join(__dirname, '..', 'src', 'assets', 'words', 'gizli-kelime.json');

const MIN_LEN = 4;
const MAX_LEN = 7;

const sozluk = yukle();
const buckets = {};
for (let l = MIN_LEN; l <= MAX_LEN; l++) buckets[l] = [];

for (const k of sozluk) {
  if (cevapOlurMu(k, MIN_LEN, MAX_LEN, { tekrarsizHarf: true })) {
    buckets[k.w.length].push({ w: k.w, m: k.m, z: k.z });
  }
}

// Günlük kelime tarihe göre deterministik seçildiği için sıralama sabit olmalı.
for (const l of Object.keys(buckets)) buckets[l].sort(sirala);

fs.writeFileSync(OUT, JSON.stringify(buckets), 'utf8');

for (const l of Object.keys(buckets)) {
  const z = [1, 2, 3].map((n) => buckets[l].filter((a) => a.z === n).length);
  console.log(`${l} harf: ${buckets[l].length} kelime (kolay ${z[0]} / orta ${z[1]} / zor ${z[2]})`);
}
console.log('Yazıldı ->', OUT);
