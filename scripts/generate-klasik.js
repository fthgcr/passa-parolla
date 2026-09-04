/**
 * Klasik (Wordle) modu için kelime havuzlarını üretir.
 *
 * Kaynak : src/assets/words/words.json  (harf -> { kelime: anlam })
 * Çıktı  : src/assets/words/klasik.json          -> cevap havuzu  { "4": [{w, m}], ... }
 *          src/assets/words/klasik-gecerli.json  -> geçerli tahminler { "4": ["abla", ...], ... }
 *
 * Gizli Kelime havuzundan farkı: burada aynı harf birden fazla kez geçebilir
 * (KİTAP, ELELE gibi), çünkü klasik Wordle'da geri bildirim harf harf veriliyor.
 *
 * Cevap havuzu = anlamı olan kelimeler (oyun sonunda anlamı gösteriyoruz).
 * Geçerli tahmin listesi = sözlükteki tüm kelimeler (anlamı olmayanlar dahil),
 * böylece oyuncunun yazdığı gerçek kelimeler boşuna reddedilmiyor.
 *
 * Kullanım: node scripts/generate-klasik.js
 */
const fs = require('fs');
const path = require('path');

const WORDS_DIR = path.join(__dirname, '..', 'src', 'assets', 'words');
const SRC = path.join(WORDS_DIR, 'words.json');
const OUT_ANSWERS = path.join(WORDS_DIR, 'klasik.json');
const OUT_VALID = path.join(WORDS_DIR, 'klasik-gecerli.json');

const ALPHABET = 'abcçdefgğhıijklmnoöprsştuüvyz'.split('');
const MIN_LEN = 4;
const MAX_LEN = 7;

function isValidWord(w) {
  return w.split('').every((c) => ALPHABET.includes(c));
}

function isValidMeaning(m) {
  if (typeof m !== 'string') return false;
  const t = m.trim();
  if (!t || t === 'yok') return false;
  if (t.includes('>')) return false; // "<I>bakınız</I> ..." gibi yönlendirmeler
  return true;
}

function cleanMeaning(m) {
  let t = m.trim();
  while (t.endsWith('.') || t.endsWith(':')) t = t.slice(0, -1);
  return t.trim();
}

const raw = JSON.parse(fs.readFileSync(SRC, 'utf8'));

const answers = {};
const valid = {};
for (let l = MIN_LEN; l <= MAX_LEN; l++) {
  answers[l] = [];
  valid[l] = [];
}

const seen = new Set();
for (const letterKey of Object.keys(raw)) {
  for (const [word, meaning] of Object.entries(raw[letterKey])) {
    const w = word.trim();
    if (seen.has(w)) continue;
    if (w.length < MIN_LEN || w.length > MAX_LEN) continue;
    if (!isValidWord(w)) continue;
    seen.add(w);

    valid[w.length].push(w);
    if (isValidMeaning(meaning)) {
      answers[w.length].push({ w, m: cleanMeaning(meaning) });
    }
  }
}

// Günlük kelime tarihe göre deterministik seçildiği için sıralama sabit olmalı.
for (let l = MIN_LEN; l <= MAX_LEN; l++) {
  answers[l].sort((a, b) => a.w.localeCompare(b.w, 'tr'));
  valid[l].sort((a, b) => a.localeCompare(b, 'tr'));
}

fs.writeFileSync(OUT_ANSWERS, JSON.stringify(answers), 'utf8');
fs.writeFileSync(OUT_VALID, JSON.stringify(valid), 'utf8');

for (let l = MIN_LEN; l <= MAX_LEN; l++) {
  console.log(`${l} harf: ${answers[l].length} cevap / ${valid[l].length} geçerli tahmin`);
}
console.log('Yazıldı ->', OUT_ANSWERS);
console.log('Yazıldı ->', OUT_VALID);
