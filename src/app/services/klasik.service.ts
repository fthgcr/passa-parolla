import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, forkJoin, map, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  TR_ALPHABET,
  isTrLetter,
  seededIndex,
  todayKey,
  trLower,
  trUpper,
} from './turkish';

/** Cevap havuzundaki bir kelime: w = kelime, m = anlamı */
export interface KlasikWord {
  w: string;
  m: string;
}

/** Bir harfin durumu: yerinde / kelimede var ama başka yerde / kelimede yok */
export type TileState = 'green' | 'yellow' | 'gray';

export interface KlasikGuess {
  letters: string[];
  states: TileState[];
}

export type AnswerPool = { [length: string]: KlasikWord[] };
export type ValidPool = { [length: string]: string[] };

/**
 * Günlük kelime takvimi — build sırasında üretiliyor (scripts/generate-takvim.js).
 * Kelime artık havuzdan hash ile seçilmiyor: havuzu yenilediğimizde programlanmış
 * günler oynamasın ve aynı kelime yıl içinde tekrar etmesin diye.
 */
export interface Takvim {
  uretildi: string;
  baslangic: string;
  sayilar: { [length: string]: number };
  gunler: { [dateKey: string]: { [length: string]: KlasikWord } };
}

export interface KlasikData {
  answers: AnswerPool;
  valid: { [length: string]: Set<string> };
  validCount: { [length: string]: number };
  takvim: Takvim | null;
}

export { TR_ALPHABET };

@Injectable({ providedIn: 'root' })
export class KlasikService {
  constructor(private http: HttpClient) {}

  /** load() sırasında dolar; pickDaily buradan okur */
  private takvim: Takvim | null = null;

  /** Cevap havuzu + geçerli tahmin sözlüğü + günlük takvim birlikte yüklenir */
  load(): Observable<KlasikData> {
    return forkJoin({
      answers: this.http.get<AnswerPool>('/assets/words/klasik.json'),
      valid: this.http.get<ValidPool>('/assets/words/klasik-gecerli.json'),
      // Takvim yoksa oyun eski yönteme düşsün, patlamasın.
      takvim: this.http
        .get<Takvim>('/assets/words/klasik-takvim.json')
        .pipe(catchError(() => of(null))),
    }).pipe(
      map(({ answers, valid, takvim }) => {
        const sets: { [length: string]: Set<string> } = {};
        const counts: { [length: string]: number } = {};
        for (const len of Object.keys(valid || {})) {
          sets[len] = new Set(valid[len]);
          counts[len] = valid[len].length;
        }
        this.takvim = takvim;
        return { answers: answers || {}, valid: sets, validCount: counts, takvim };
      })
    );
  }

  // --- Geri bildirim -------------------------------------------------------

  /**
   * Klasik Wordle değerlendirmesi: her harf için ayrı renk.
   *
   * Tekrar eden harfler iki turda çözülür. Önce yerinde olanlar işaretlenip
   * cevaptaki o harfler tüketilir; kalan harfler ancak cevapta tüketilmemiş bir
   * eşi varsa sarı olur. Böylece cevapta bir "a" varken tahmindeki iki "a"nın
   * yalnızca biri renk alır — Wordle'ın davranışı budur.
   */
  evaluate(guess: string[], answer: string): TileState[] {
    const target = answer.split('');
    const used = new Array(target.length).fill(false);
    const states: TileState[] = new Array(guess.length).fill('gray');

    for (let i = 0; i < guess.length; i++) {
      if (target[i] === guess[i]) {
        states[i] = 'green';
        used[i] = true;
      }
    }

    for (let i = 0; i < guess.length; i++) {
      if (states[i] === 'green') continue;
      const idx = target.findIndex((t, j) => !used[j] && t === guess[i]);
      if (idx !== -1) {
        used[idx] = true;
        states[i] = 'yellow';
      }
    }

    return states;
  }

  isWin(states: TileState[]): boolean {
    return states.length > 0 && states.every((s) => s === 'green');
  }

  /**
   * Klavyede her harfin gösterileceği renk. Bir harf birden çok tahminde
   * geçtiyse en iyi bilgi kazanır: yeşil > sarı > gri.
   */
  keyStates(guesses: KlasikGuess[]): { [letter: string]: TileState } {
    const rank: { [k in TileState]: number } = { gray: 1, yellow: 2, green: 3 };
    const map: { [letter: string]: TileState } = {};
    for (const g of guesses) {
      g.letters.forEach((letter, i) => {
        const next = g.states[i];
        const current = map[letter];
        if (!current || rank[next] > rank[current]) map[letter] = next;
      });
    }
    return map;
  }

  // --- Kelime seçimi -------------------------------------------------------

  todayKey(d: Date = new Date()): string {
    return todayKey(d);
  }

  /** Tarih + uzunluk için deterministik indeks (herkeste aynı günlük kelime) */
  dailyIndex(dateKey: string, length: number, poolSize: number): number {
    return seededIndex(`klasik#${dateKey}#${length}`, poolSize);
  }

  /**
   * Günün kelimesi. Önce takvime bakılır; takvim yoksa ya da o gün
   * programlanmamışsa eski hash yöntemine düşülür.
   */
  pickDaily(pool: KlasikWord[], length: number, dateKey = this.todayKey()): KlasikWord {
    const planlanan = this.takvim?.gunler?.[dateKey]?.[String(length)];
    if (planlanan) return planlanan;
    return pool[this.dailyIndex(dateKey, length, pool.length)];
  }

  /** Takvimin son günü — bitmeden yenisini üretmek için */
  takvimSonGun(): string | null {
    const gunler = this.takvim?.gunler;
    if (!gunler) return null;
    const keys = Object.keys(gunler);
    return keys.length ? keys[keys.length - 1] : null;
  }

  pickRandom(pool: KlasikWord[]): KlasikWord {
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // --- Türkçe yardımcıları -------------------------------------------------

  upper(text: string): string {
    return trUpper(text);
  }

  lower(text: string): string {
    return trLower(text);
  }

  isLetter(ch: string): boolean {
    return isTrLetter(ch);
  }
}
