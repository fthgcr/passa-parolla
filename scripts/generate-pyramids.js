/*
 * Piramit üretici — anagram zinciri kuralı
 * Kural: kısa kelimenin harfleri = uzun kelimenin harfleri - 1 harf (sıra önemsiz).
 * words.json'dan, her tepe için 3 harfe inen zincirler kurar; sızıntılı/gecersiz ipuclarini eler.
 *
 * NOT: Başlangıç uzunluğu = piramit yüksekliği + 2 (8 harften 3'e = 6 seviye).
 * words.json büyüdükçe 8 harfli zincirler bollaşıyor; uzunluğa göre azalan sırayla
 * seçip ilk 150'yi almak havuzu tamamen en yüksek piramitlerle dolduruyordu — hiç
 * kısa piramit çıkmıyordu. Bunun yerine her başlangıç uzunluğuna (5..8) eşit kota
 * ayırıyoruz ki 4-7 seviyeli piramitler karışık gelsin.
 *
 * Calistir:  node scripts/generate-pyramids.js   ->  src/assets/words/pyramids.json
 */
const fs=require('fs');
// data/words.json — build girdisi, src/assets değil (bkz. build-sozluk.js başı).
const words=JSON.parse(fs.readFileSync('data/words.json','utf8'));
const re=/^[a-zçğıöşü]+$/;

const TOPLAM = 150;
const BASLANGIC_UZUNLUKLARI = [8, 7, 6, 5]; // height 6, 5, 4, 3

function removeMastar(t){const l3=t.slice(-3),l2=t.slice(-2);if(l2==='ma'||l2==='me')return t.slice(0,-2);if(l3==='mak'||l3==='mek')return t.slice(0,-3);return t;}
function lower(text){let s=text.toString();const m={'İ':'i','I':'i','ı':'i','Ş':'s','ş':'s','Ğ':'g','ğ':'g','Ü':'u','ü':'u','Ö':'o','ö':'o','Ç':'c','ç':'c'};s=s.replace(/(([İIıŞşĞğÜüÇçÖö]))/g,l=>m[l]);return removeMastar(s.toLowerCase());}
function noLeak(clue,word){ // cevap ipucunda geçmesin
  const v=lower(word);
  for(let s of clue.split(' ')){ s=lower(s.replace(',','')); if(s.length>0&&(s.includes(v)||v.includes(s))) return false; }
  return true;
}
function validClue(c){ if(typeof c!=='string')return false; const t=c.trim(); return t && t.toLowerCase()!=='yok' && !t.includes('>'); }
function fixValue(v){ const l=v.charAt(v.length-1); return (l==='.'||l===':')?v.slice(0,-1):v; }
function trUpper(s){ const m={'i':'İ','ı':'I','ç':'Ç','ş':'Ş','ğ':'Ğ','ö':'Ö','ü':'Ü'}; return s.split('').map(c=>m[c]||c.toUpperCase()).join(''); }
function sig(w){ return w.split('').sort().join(''); }
function shuffle(a){ for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }

// geçerli + sızıntısız kelimeleri topla, uzunluğa göre sig indexle
const byLen={}; const clueOf={};
for(const L in words){ for(const w in words[L]){ const c=words[L][w];
  if(re.test(w)&&w.length>=3&&w.length<=8&&validClue(c)&&noLeak(c,w)){
    const fixed=fixValue(c.trim()); if(!fixed||!fixed.trim()) continue; (byLen[w.length]??={}); const s=sig(w); (byLen[w.length][s]??=[]).push(w); clueOf[w]=fixed;
  }
}}
function children(w){ const L=w.length,res=new Set(),seen=new Set(),ch=w.split('');
  for(let i=0;i<L;i++){ if(seen.has(ch[i]))continue; seen.add(ch[i]); const sub=ch.slice(0,i).concat(ch.slice(i+1)).sort().join(''); if(byLen[L-1]&&byLen[L-1][sub]) byLen[L-1][sub].forEach(x=>res.add(x)); }
  return [...res];
}
// 3'e ulaşabilir mi (memo)
const reach={};
function canReach(w){ if(w in reach)return reach[w]; if(w.length===3)return reach[w]=true; let ok=false; for(const c of children(w)){ if(canReach(c)){ok=true;break;} } return reach[w]=ok; }

// bir kelimeden 3'e inen bir zincir kur (rastgele çocuk seç, 3'e ulaşanı)
function buildChain(w){ const chain=[w]; let cur=w; while(cur.length>3){ const cs=shuffle(children(cur).filter(canReach)); if(!cs.length)return null; cur=cs[0]; chain.push(cur); } return chain; }

// çıkan harf: uzun kelime - kısa kelime (çoklu küme farkı)
function removedLetter(longW,shortW){ const a=longW.split('').sort(),b=shortW.split('').sort(); let i=0,j=0; while(j<b.length){ if(a[i]===b[j]){i++;j++;} else return a[i++]; } return a[i]; }

// başlangıç adayları, uzunluğa göre ayrı kovalar (3'e ulaşanlar)
const startsByLen = {};
for (const L of BASLANGIC_UZUNLUKLARI) {
  startsByLen[L] = [];
  if (!byLen[L]) continue;
  for (const s in byLen[L]) for (const w of byLen[L][s]) if (canReach(w)) startsByLen[L].push(w);
  shuffle(startsByLen[L]);
}
console.log(
  "3'e inebilen başlangıç kelimesi: " +
  BASLANGIC_UZUNLUKLARI.map((L) => `${L}h ${startsByLen[L].length}`).join(', ')
);

// piramit havuzu üret: her başlangıç uzunluğuna eşit kota, tepe başına sınır,
// tam-küme tekrarını engelle.
const kota = Math.ceil(TOPLAM / BASLANGIC_UZUNLUKLARI.length);
const pool = [];
const seenSet = new Set();
const topCount = {};

function birUzunlukIsle(L, limit) {
  let uretilen = 0;
  for (const w of startsByLen[L]) {
    if (uretilen >= limit || pool.length >= TOPLAM) break;
    const chain = buildChain(w);
    if (!chain) continue;
    const key = chain.slice().sort().join('|');
    if (seenSet.has(key)) continue;
    const top = chain[chain.length - 1];
    if ((topCount[top] || 0) >= 3) continue; // aynı tepeden en çok 3
    seenSet.add(key);
    topCount[top] = (topCount[top] || 0) + 1;

    // seviyeleri kur (alttan üste = uzundan kısaya) + görsel tahta (bir harf eksilerek)
    let board = shuffle(trUpper(chain[0]).split(''));
    const levels = [];
    for (let i = 0; i < chain.length; i++) {
      const word = chain[i];
      let removed = null;
      if (i < chain.length - 1) removed = trUpper(removedLetter(chain[i], chain[i + 1]));
      levels.push({ word, clue: clueOf[word], letters: board.join(''), removed });
      if (removed) { const idx = board.indexOf(removed); const nb = board.slice(); nb.splice(idx, 1); board = nb; }
    }
    pool.push({ height: chain.length, levels });
    uretilen++;
  }
  return uretilen;
}

for (const L of BASLANGIC_UZUNLUKLARI) birUzunlukIsle(L, kota);

// Bir uzunluk kotasını dolduramadıysa (havuz azsa) boşalan payı diğerlerine dağıt.
let eksik = TOPLAM - pool.length;
if (eksik > 0) {
  for (const L of BASLANGIC_UZUNLUKLARI) {
    if (eksik <= 0) break;
    eksik -= birUzunlukIsle(L, eksik);
  }
}

shuffle(pool); // yükseklikler karışık sırayla gelsin

// yüksekliğe göre dağılım
const dist={}; pool.forEach(p=>dist[p.height]=(dist[p.height]||0)+1);
console.log('Üretilen piramit:', pool.length, '| yükseklik dağılımı:', JSON.stringify(dist));
fs.writeFileSync('src/assets/words/pyramids.json', JSON.stringify(pool,null,2));
// örnek yazdır
console.log('\nÖrnek (yüksek):');
const ex=pool.find(p=>p.height===Math.max(...pool.map(x=>x.height)));
ex.levels.forEach(l=>console.log(`  ${l.letters.padEnd(9)} → ${l.word.toUpperCase().padEnd(9)} : ${l.clue.slice(0,45)}`));
