/**
 * sozluk.json üzerinden oyun havuzlarını süzen ortak katman.
 * generate-klasik.js ve generate-gizli-kelime.js bunu kullanır.
 */
const fs = require('fs');
const path = require('path');

const ALPHABET = 'abcçdefgğhıijklmnoöprsştuüvyz';
const AB = new Set(ALPHABET.split(''));

/**
 * AYAR — gerçek TDK verisini gördükten sonra oynayacağın tek yer burası.
 *
 * mekanikTuremeyiEle : "açma / bakış / dolma" gibi tanımı "…mak işi" olan
 *   biçimler cevap havuzundan çıkar. Bazıları ("dikiş", "çıkış") aslında iyi
 *   cevaplar — havuzu dar bulursan bunu false yap ya da yalnızca nadir
 *   olanları ele: enAzZorlukMekanik = 2.
 * enAzZorlukMekanik : mekanik türeme yalnızca bu zorluk ve üstündeyse elenir.
 *   1 = hepsi elenir, 2 = çok yaygın olanlar (z=1) korunur, 3 = sadece nadirler.
 * sozlukselNadirEle : "bağlama, çiftçi" gibi sözlükselleşmiş türemeler yalnızca
 *   nadir (z=3) olduklarında elenir.
 */
const AYAR = {
  mekanikTuremeyiEle: true,
  enAzZorlukMekanik: 2,
  sozlukselNadirEle: true,
};

// data/ — build girdisi, src/assets değil (Angular tüm assets klasörünü
// olduğu gibi deploy'a kopyalıyor; sozluk.json hiçbir bileşen tarafından
// fetch edilmiyor, deploy'a girmemeli).
const SOZLUK = path.join(__dirname, '..', '..', 'data', 'sozluk.json');

function yukle() {
  if (!fs.existsSync(SOZLUK)) {
    console.error('data/sozluk.json yok. Önce:');
    console.error('  node scripts/tdk-fetch.js');
    console.error('  node scripts/build-sozluk.js');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(SOZLUK, 'utf8'));
}

/** Sadece Türk alfabesi harfleri, boşluk/tire/kesme yok */
const yazimTemiz = (w) => [...w].every((c) => AB.has(c));

/**
 * Geçerli tahmin havuzu: oyuncunun yazabileceği her gerçek kelime.
 * Burada cömert davranıyoruz — eskimiş, türemiş, özel isim hariç her şey kabul.
 */
function gecerliMi(k, min, max) {
  return k.w.length >= min && k.w.length <= max && yazimTemiz(k.w) && !k.o;
}

/**
 * Cevap havuzu: günün kelimesi olabilecekler.
 *  - anlamı olacak (oyun sonunda gösteriyoruz)
 *  - özel isim olmayacak
 *  - eskimiş / halk ağzı / argo olmayacak
 *  - türemiş biçim olmayacak (açılma, adama…)
 *
 * Anlam sızdırma (k.s) burada elenmiyor: Klasik ve Gizli Kelime'de anlam
 * yalnızca oyun bittikten sonra gösteriliyor. Anlamın ipucu olarak
 * kullanıldığı modlarda (piramit, passaparola) opt.sizmasin ile ele.
 */
function cevapOlurMu(k, min, max, opt = {}) {
  if (!gecerliMi(k, min, max)) return false;
  if (!k.m) return false;
  if (k.e.length) return false;
  if (AYAR.mekanikTuremeyiEle && k.d === 1 && k.z >= AYAR.enAzZorlukMekanik) return false;
  if (AYAR.sozlukselNadirEle && k.d === 2 && k.z === 3) return false;
  if (opt.sizmasin && k.s) return false;
  if (opt.maxZorluk && k.z > opt.maxZorluk) return false;
  if (opt.tekrarsizHarf) {
    const ch = [...k.w];
    if (new Set(ch).size !== ch.length) return false;
  }
  return true;
}

const sirala = (a, b) => a.w.localeCompare(b.w, 'tr');

module.exports = { AYAR, ALPHABET, AB, yukle, yazimTemiz, gecerliMi, cevapOlurMu, sirala };
