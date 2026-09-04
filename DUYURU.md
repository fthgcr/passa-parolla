# Evet Abi — Duyuru Taslakları

2026-08-08 tarihli 7 commit temel alınmıştır. Üç farklı uzunlukta versiyon var; birini seç, gerisini sil.

---

## 1. Kısa versiyon (WhatsApp / Discord)

> **Passa Parola öldü, yaşasın Evet Abi.**
>
> 624 gün boyunca projeye hiç dokunmadım, sonra bir günde 7 commit attım. Bilim bunu henüz açıklayamıyor.
>
> Yenilikler:
> • **Piramit modu** — 150 piramit, her doğru cevapta bir harf eksiliyor, tabandan tepeye tırmanıyorsun
> • **9.486 kelimelik** yeni soru havuzu
> • Cevabı sorunun içinde geçen **1.045 soruyu** ayıkladım. Evet, o kadar vardı. Evet, utanıyorum.
> • Yeni ana menü — artık "nereye tıklayacağım" faslı yok
> • Geniş ekranda artık devasa çocuk kitabı gibi görünmüyor
>
> Adı neden Evet Abi? Çünkü cevap butonunda zaten öyle yazıyordu. Marka dediğin böyle doğar.

---

## 2. Orta versiyon (X / Instagram — thread olarak)

**1/**
İki yıl önce yaptığım Passa Parola klonunu açtım, "bir iki ufak şey düzeltirim" dedim.
Sonuç: isim değişti, yeni bir oyun modu doğdu ve 20 aylık suskunluk tek günde 7 commit'e dönüştü.

**2/**
Önce isim. Artık adı **Evet Abi**.
Kaynak: cevap butonunda zaten bunu yazıyordu. Rebranding süreci toplam 4 saniye sürdü, ajans ücreti alınmadı.

**3/**
Yeni mod: **Piramit**.
Tabanda 8 harfli bir kelime var. Her doğru cevapta bir harf eksiliyor, tepede 3 harfliye çıkıyorsun.
150 piramit üretildi — 96'sı 5 katlı, 54'ü 6 katlı. Hepsini elle mi yazdım? Hayır, onu yapan scripti yazdım. Tembellik mühendisliktir.

**4/**
Kelime havuzu **9.486** kelimeye çıktı.
Bu arada eski havuzda cevabı doğrudan sorunun içinde geçen **1.045 soru** varmış. "Abanoz nedir?" → "Abanozgillerin ağır, sert ve siyah renkli tahtası." Teşekkürler, çok yardımcı oldu.
Hepsi ayıklandı.

**5/**
Ve itiraf: zamanlayıcı her **1.5 saniyede** bir sayacı 1 azaltıyordu.
Yani ekranda "5 dakika" yazıyordu ama gerçekte **7.5 dakika** oynuyordunuz.
Eski skorlarınızla gurur duyanlar: geçmiş olsun. Artık saat düzgün çalışıyor ve süreyi kendiniz seçiyorsunuz (3/5/7 dk).

---

## 3. Uzun versiyon (esprili sürüm notları / GitHub release)

### Evet Abi v2.0 — "Uyandı"

Son commit: 22 Kasım 2024. Bir sonraki commit: 8 Ağustos 2026.
Arada geçen süre: **624 gün**. Aynı gün atılan commit sayısı: **7**.
Proje yönetimi dersi olarak okutulmasını beklemiyorum.

#### Yeni

**Piramit modu.** Tabanda karışık harfler, yukarı doğru her seviyede bir harf eksiliyor. 150 hazır piramit var (96 tanesi 5 katlı, 54 tanesi 6 katlı). Bunları üreten script anagram zinciri kuruyor, yani "meridyen → deneyim → medeni → demin" gibi zincirleri kendi buluyor. Ben sadece izledim.

**Ana menü.** Eskiden siteyi açınca doğrudan oyunun ortasına düşüyordunuz. Şimdi bir menü var, mod seçiyorsunuz. Bu bir yenilik olarak sayılmamalı ama sayıyorum.

**Süre seçimi.** 3, 5 veya 7 dakika. Kendi başarısızlığınızın süresini artık siz belirliyorsunuz.

**GitHub imza rozeti.** Her sayfanın altında. Kimin yaptığını merak eden olursa diye. Olmadı ama yine de duruyor.

#### Düzeltildi

**Zamanlayıcı.** Eski kod her 1.5 saniyede bir sayacı 1 azaltıyordu. Ekranda 5 dakika, gerçekte 7.5 dakika. Bu bir hata değildi, cömertlikti. Şaka bir yana: artık gerçek zamana bakıyor, sekme değiştirince kaymıyor ve sayfadan çıkınca arka planda çalışmaya devam etmiyor.

**Spoiler soruları.** Cevabı doğrudan ipucunun içinde geçen 1.045 soru ayıklandı. "Abartı" kelimesinin ipucu "Abartma, mübalağa" idi. Oyun değil, ikram.

**Geniş ekran ölçekleme.** Harfler 4K monitörde tabela boyutundaydı. Küçültüldü.

**Menü başlığındaki gradyan.** Metnin altı kırpılıyordu. Şimdi kırpılmıyor. Bu commit'in tek işi buydu ve gurur duyuyorum.

#### İsim değişikliği

Passa Parola → **Evet Abi**.

Gerekçe: piyasada parolla.app zaten var ve iyi de iş çıkarıyor. Aynı isimle yanına park etmek yerine kendi tabelamı astım. İsim de zaten oyunun içinden çıktı — cevap gönderme butonunda ilk günden beri "Evet Abi" yazıyor.

Oyun modunun adı hâlâ Passaparola. O bir format, marka değil.

---

## Serbest kullanım için tek satırlık esprilerr

- "624 gün ara verdim, dönüşümü bir günde 7 commit'le yaptım. Denge önemli."
- "Yeni ismi bulmak için beyin fırtınası yaptım, sonra kendi butonuma baktım."
- "1.045 soru cevabını kendisi söylüyordu. Artık söylemiyor. Oyun zorlaştı, özür dilerim."
- "Zamanlayıcı 1.5 saniyede bir sayıyordu. Tüm rekorlarınız iptal."
- "Piramitleri üretmek için script yazdım çünkü 150 tanesini elle yazmak yerine 79 satır kod yazmak daha kolaydı. Bu matematik tutuyor mu bilmiyorum."
- "3 farklı ses dosyası, 3 farklı format: mp3, wav, ogg. Tutarlılık bir sonraki sürümde."
