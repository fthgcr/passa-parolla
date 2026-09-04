import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { KlasikGuess, KlasikService, TileState } from './klasik.service';

describe('KlasikService', () => {
  let service: KlasikService;

  /** Sonucu okunur kısaltmaya çevirir: G yeşil, Y sarı, . gri */
  const ev = (guess: string, answer: string): string =>
    service
      .evaluate(guess.split(''), answer)
      .map((s) => ({ green: 'G', yellow: 'Y', gray: '.' })[s])
      .join('');

  const guess = (word: string, answer: string): KlasikGuess => ({
    letters: word.split(''),
    states: service.evaluate(word.split(''), answer),
  });

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(KlasikService);
  });

  describe('evaluate', () => {
    it('doğru kelimede tüm harfler yeşil', () => {
      expect(ev('kitap', 'kitap')).toBe('GGGGG');
    });

    it('yerinde olanı yeşil, kelimede olanı sarı yapar', () => {
      expect(ev('kalem', 'kitap')).toBe('GY...');
    });

    it('cevapta tek olan harfin fazlası griye düşer', () => {
      // "kitap"ta tek "a" var; tahmindeki ikinci "a" renk almamalı
      expect(ev('sarma', 'kitap')).toBe('.Y...');
    });

    it('yeşiller sarılardan önce tüketilir', () => {
      // "masal"daki "a"ların biri yerinde, kalan "a" sarı olabilir
      expect(ev('sasma', 'masal')).toBe('.GGYY');
    });

    it('tekrar eden harfleri cevaptaki adediyle sınırlar', () => {
      expect(ev('elele', 'elmas')).toBe('GG...');
      expect(ev('anane', 'kanat')).toBe('YYY..');
      expect(ev('aaaaa', 'araba')).toBe('G.G.G');
    });

    it('aynı harf birden çok kez yerinde olabilir', () => {
      expect(ev('kekik', 'kepek')).toBe('GG..G');
    });
  });

  describe('isWin', () => {
    it('sadece hepsi yeşilse kazanır', () => {
      expect(service.isWin(service.evaluate('kitap'.split(''), 'kitap'))).toBeTrue();
      expect(service.isWin(service.evaluate('kalem'.split(''), 'kitap'))).toBeFalse();
    });
  });

  describe('keyStates', () => {
    it('bir harfin en iyi bilgisini tutar (yeşil > sarı > gri)', () => {
      const states = service.keyStates([
        guess('kalem', 'kitap'), // a burada sarı
        guess('katar', 'kitap'), // a burada yeşil
      ]);
      expect(states['k']).toBe('green');
      expect(states['a']).toBe('green');
      expect(states['l']).toBe('gray');
    });

    it('yeşil bilgisi sonraki gri tahminle bozulmaz', () => {
      const states = service.keyStates([guess('kanat', 'kanat'), guess('aslan', 'kanat')]);
      expect(states['a']).toBe('green');
    });

    it('denenmemiş harf renksiz kalır', () => {
      const states: { [letter: string]: TileState } = service.keyStates([
        guess('kalem', 'kitap'),
      ]);
      expect(states['p']).toBeUndefined();
    });
  });

  describe('günlük kelime', () => {
    it('aynı gün ve uzunluk için hep aynı indeksi verir', () => {
      const a = service.dailyIndex('2026-09-04', 5, 2003);
      const b = service.dailyIndex('2026-09-04', 5, 2003);
      expect(a).toBe(b);
      expect(a).toBeLessThan(2003);
    });

    it('farklı gün farklı kelime seçer', () => {
      const a = service.dailyIndex('2026-09-04', 5, 2003);
      const b = service.dailyIndex('2026-09-05', 5, 2003);
      expect(a).not.toBe(b);
    });
  });
});
