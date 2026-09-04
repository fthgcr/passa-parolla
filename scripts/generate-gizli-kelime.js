/**
 * Gizli Kelime (Word500 tarzı) modu için kelime havuzu üretir.
 *
 * Kaynak : src/assets/words/words.json  (harf -> { kelime: anlam })
 * Çıktı  : src/assets/words/gizli-kelime.json
 *
 * Kurallar:
 *  - 4..7 harf arası kelimeler
 *  - Sadece Türk alfabesi harfleri (tire, boşluk, kesme işareti olan kelimeler elenir)
 *  - Aynı harf iki kez geçmesin (Word500 standart zorluğu)
 *  - Anlamı olsun ("yok" veya HTML yönlendirmesi olanlar elenir)
 *
 * Kullanım: node scripts/generate-gizli-kelime.js
 */
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'src', 'assets', 'words', 'words.json');
const OUT = path.join(__dirname, '..', 'src', 'assets', 'words', 'gizli-kelime.json');

const ALPHABET = 'abcçdefgğhıijklmnoöprsştuüvyz'.split('');
const MIN_LEN = 4;
const MAX_LEN = 7;

function isValidWord(w) {
  const chars = w.split('');
  if (chars.some((c) => !ALPHABET.includes(c))) return false;
  if (new Set(chars).size !== chars.length) return false; // tekrar eden harf
  return true;
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
const buckets = {};
for (let l = MIN_LEN; l <= MAX_LEN; l++) buckets[l] = [];

const seen = new Set();
for (const letterKey of Object.keys(raw)) {
  for (const [word, meaning] of Object.entries(raw[letterKey])) {
    const w = word.trim();
    if (seen.has(w)) continue;
    if (w.length < MIN_LEN || w.length > MAX_LEN) continue;
    if (!isValidWord(w)) continue;
    if (!isValidMeaning(meaning)) continue;
    seen.add(w);
    buckets[w.length].push({ w, m: cleanMeaning(meaning) });
  }
}

// Günlük kelime tarihe göre deterministik seçildiği için sıralama sabit olmalı.
for (const l of Object.keys(buckets)) {
  buckets[l].sort((a, b) => a.w.localeCompare(b.w, 'tr'));
}

fs.writeFileSync(OUT, JSON.stringify(buckets), 'utf8');

for (const l of Object.keys(buckets)) {
  console.log(`${l} harf: ${buckets[l].length} kelime`);
}
console.log('Yazıldı ->', OUT);
