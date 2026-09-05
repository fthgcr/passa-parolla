# Kelime havuzu pipeline'ı

Oyunun tüm kelime verisi tek bir ana kaynaktan üretiliyor: **`src/assets/words/sozluk.json`**.
Onu da TDK Güncel Türkçe Sözlük'ün tamamından + bir frekans listesinden kuruyoruz.

```
TDK GTS API ──┐
              ├─> data/tdk-raw.jsonl ──> sozluk.json ──┬─> klasik.json + klasik-gecerli.json
frekans ──────┘                       └─> words.json  ├─> gizli-kelime.json
                                       (eski şema)    └─> pyramids.json
```

## Çalıştırma

```bash
npm run sozluk:hepsi     # üçünü sırayla
```

ya da tek tek:

```bash
npm run sozluk:cek       # TDK'yı indir  -> data/tdk-raw.jsonl  (~92k madde, 25-45 dk)
npm run sozluk:kur       # sözlüğü kur   -> sozluk.json + words.json
npm run sozluk:havuz     # oyun havuzları -> klasik / gizli-kelime / pyramids
```

`sozluk:cek` kesintiye uğrarsa **dosyayı silme**, komutu tekrar çalıştır; kaldığı
yerden devam eder. Deneme için: `node scripts/tdk-fetch.js --limit 300`.

`data/` klasörü `.gitignore`'da — ham veri repoya girmiyor, sadece üretilen
JSON'lar commit'leniyor.

## sozluk.json şeması

Bir kayıt:

| alan | anlamı |
|---|---|
| `w` | kelime |
| `m` | anlam (ilk gerçek tanım, yönlendirmeler atılmış) |
| `t` | söz türü — `["isim"]`, `["sıfat","zarf"]` |
| `e` | kullanım etiketi — `["eskimiş"]`, `["argo"]`, `["halk ağzında"]` |
| `a` | alan etiketi — `["tıp"]`, `["denizcilik"]` |
| `o` | `1` ise özel isim (Afrika, Abhaz…) |
| `k` | köken — `"Arapça"`, `"Fransızca"` |
| `f` | frekans (OpenSubtitles sayımı, `0` = hiç geçmiyor) |
| `z` | zorluk — `1` kolay, `2` orta, `3` zor |
| `d` | `1` mekanik türeme (*açma: "Açmak işi"*), `2` sözlükselleşmiş (*bağlama: çalgı*) |
| `s` | `1` ise anlam kelimeyi sızdırıyor |

## Süzgeçler

Havuz kuralları tek yerde: **`scripts/lib/havuz.js`**.

- **Geçerli tahmin havuzu** geniş: özel isim dışında her gerçek kelime kabul.
  Oyuncunun yazdığı kelime boşuna reddedilmesin diye.
- **Cevap havuzu** dar: anlamı var + özel isim değil + eskimiş/argo/halk ağzı
  değil + mekanik türeme değil.
- `s` (anlam sızdırma) Klasik ve Gizli Kelime'de **elenmiyor** — oralarda anlam
  zaten oyun bittikten sonra gösteriliyor. Anlamın ipucu olduğu modlarda
  (piramit, passaparola) `cevapOlurMu(k, min, max, { sizmasin: true })` ile ele.

### Ayar

`havuz.js` başındaki `AYAR` bloğu tek oynama noktası:

```js
const AYAR = {
  mekanikTuremeyiEle: true,
  enAzZorlukMekanik: 2,   // 1 = hepsini ele, 2 = çok yaygın olanları koru, 3 = sadece nadirler
  sozlukselNadirEle: true,
};
```

Gerçek TDK verisini indirdikten sonra `npm run sozluk:kur` çıktısındaki
dağılıma bakıp burayı ayarla.

## Zorluk katmanı

`klasik.json` ve `gizli-kelime.json` artık her kelimede `z` taşıyor.
Günün kelimesini haftanın gününe göre zorlaştırmak istersen, servis içinde
havuzu seçmeden önce süz — örneğin Pazartesi `z === 1`, hafta sonu `z <= 3`.

## Dikkat

Havuz değişince **günün kelimesi de değişir** (tarihe göre deterministik seçim
havuzun sırasına bağlı). Yeni havuzu yayına almadan önce bunu bekle; devam eden
serileri bozmak istemiyorsan sürüm geçişini gece yarısına denk getir.
