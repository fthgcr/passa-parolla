import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

/** Havuzdaki tek bir kelime: w = kelime, m = anlamı */
export interface SecretWord {
  w: string;
  m: string;
}

/** Bir tahminin sonucu. Word500'de hangi harfin hangi renk olduğu SÖYLENMEZ,
 *  sadece adetleri verilir; oyuncu tümdengelimle çözer. */
export interface GuessFeedback {
  /** Doğru harf, doğru yer */
  green: number;
  /** Kelimede var ama yanlış yerde */
  yellow: number;
  /** Kelimede hiç yok */
  red: number;
}

export interface Guess {
  letters: string[];
  feedback: GuessFeedback;
}

export type WordPool = { [length: string]: SecretWord[] };

export const TR_ALPHABET = 'abcçdefgğhıijklmnoöprsştuüvyz'.split('');
/** Bilinmeyen harf yer tutucusu (boşluk tuşu) */
export const BLANK = '_';

@Injectable({ providedIn: 'root' })
export class GizliKelimeService {
  constructor(private http: HttpClient) {}

  getPool(): Observable<WordPool> {
    return this.http.get<WordPool>('/assets/words/gizli-kelime.json');
  }

  // --- Geri bildirim -------------------------------------------------------

  /**
   * Klasik Wordle sayımı, ama sonuç harf harf değil toplam olarak döner.
   * `_` (BLANK) nötrdür: hiçbir kovaya sayılmaz, böylece oyuncu bilmediği
   * harfleri atlayıp kısmi desen deneyebilir.
   */
  evaluate(guess: string[], answer: string): GuessFeedback {
    const target = answer.split('');
    const used = new Array(target.length).fill(false);
    let green = 0;
    let yellow = 0;
    let blanks = 0;

    // 1. tur: yerinde olanlar
    for (let i = 0; i < guess.length; i++) {
      const ch = guess[i];
      if (ch === BLANK) {
        blanks++;
        continue;
      }
      if (target[i] === ch) {
        green++;
        used[i] = true;
      }
    }

    // 2. tur: kelimede var ama başka yerde
    for (let i = 0; i < guess.length; i++) {
      const ch = guess[i];
      if (ch === BLANK || target[i] === ch) continue;
      const idx = target.findIndex((t, j) => !used[j] && t === ch);
      if (idx !== -1) {
        used[idx] = true;
        yellow++;
      }
    }

    return { green, yellow, red: guess.length - green - yellow - blanks };
  }

  private sameFeedback(a: GuessFeedback, b: GuessFeedback): boolean {
    return a.green === b.green && a.yellow === b.yellow && a.red === b.red;
  }

  /**
   * Şimdiye kadarki tüm geri bildirimlerle tutarlı bir kelime döndürür.
   * Aday kelime için aynı tahminleri değerlendirip aynı sayıları veriyor mu
   * diye bakıyoruz; bu, `_` içeren tahminlerle de doğru çalışır.
   */
  hint(pool: SecretWord[], guesses: Guess[], exclude: string[] = []): SecretWord | null {
    const candidates = pool.filter((c) => {
      if (exclude.includes(c.w)) return false;
      return guesses.every((g) =>
        this.sameFeedback(this.evaluate(g.letters, c.w), g.feedback)
      );
    });
    if (!candidates.length) return null;
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  /** Verilen tahminlerle tutarlı kaç kelime kaldı (oyuncuya "daralma" göstergesi) */
  remainingCount(pool: SecretWord[], guesses: Guess[]): number {
    if (!guesses.length) return pool.length;
    return pool.filter((c) =>
      guesses.every((g) => this.sameFeedback(this.evaluate(g.letters, c.w), g.feedback))
    ).length;
  }

  // --- Kelime seçimi -------------------------------------------------------

  /** YYYY-MM-DD (yerel saat) */
  todayKey(d: Date = new Date()): string {
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  /** Tarih + uzunluk için deterministik indeks (herkeste aynı günlük kelime) */
  dailyIndex(dateKey: string, length: number, poolSize: number): number {
    let h = 2166136261;
    const seed = `${dateKey}#${length}`;
    for (let i = 0; i < seed.length; i++) {
      h ^= seed.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return Math.abs(h) % poolSize;
  }

  pickDaily(pool: SecretWord[], length: number, dateKey = this.todayKey()): SecretWord {
    return pool[this.dailyIndex(dateKey, length, pool.length)];
  }

  pickRandom(pool: SecretWord[]): SecretWord {
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // --- Türkçe yardımcıları -------------------------------------------------

  /** Türkçe kurallı büyük harf (i -> İ, ı -> I) */
  upper(text: string): string {
    return text.toLocaleUpperCase('tr-TR');
  }

  /** Türkçe kurallı küçük harf (I -> ı, İ -> i) */
  lower(text: string): string {
    return text.toLocaleLowerCase('tr-TR');
  }

  isLetter(ch: string): boolean {
    return TR_ALPHABET.includes(ch);
  }
}
