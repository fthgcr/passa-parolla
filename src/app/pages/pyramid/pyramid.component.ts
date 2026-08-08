import { Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  trigger,
  transition,
  style,
  animate,
  keyframes,
} from '@angular/animations';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { WordsService } from '../../services/words.service';

interface Level {
  word: string;
  clue: string;
  letters: string;
  removed: string | null;
}
interface Pyramid {
  height: number;
  levels: Level[];
}

@Component({
  selector: 'app-pyramid',
  templateUrl: './pyramid.component.html',
  styleUrl: './pyramid.component.scss',
  animations: [
    // Aktif satırdaki harf kutuları tek tek belirir
    trigger('tileIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.3) translateY(-12px)' }),
        animate(
          '350ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          style({ opacity: 1, transform: 'scale(1) translateY(0)' })
        ),
      ]),
    ]),
    // Doğru cevapta satır nabız atar
    trigger('rowPulse', [
      transition('* => solved', [
        animate(
          '520ms ease-out',
          keyframes([
            style({ transform: 'scale(1)', offset: 0 }),
            style({ transform: 'scale(1.09)', offset: 0.4 }),
            style({ transform: 'scale(1)', offset: 1 }),
          ])
        ),
      ]),
    ]),
    // Düşen harf rozeti: satırlar arasında yukarı doğru süzülerek belirir
    trigger('dropIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px) scale(0.6)' }),
        animate(
          '420ms 120ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          style({ opacity: 1, transform: 'translateY(0) scale(1)' })
        ),
      ]),
    ]),
    // Yanlış cevapta sallanma
    trigger('shake', [
      transition('* => *', [
        animate(
          '430ms',
          keyframes([
            style({ transform: 'translateX(0)', offset: 0 }),
            style({ transform: 'translateX(-9px)', offset: 0.2 }),
            style({ transform: 'translateX(9px)', offset: 0.4 }),
            style({ transform: 'translateX(-6px)', offset: 0.6 }),
            style({ transform: 'translateX(6px)', offset: 0.8 }),
            style({ transform: 'translateX(0)', offset: 1 }),
          ])
        ),
      ]),
    ]),
  ],
})
export class PyramidComponent implements OnInit {
  pool: Pyramid[] = [];
  pyramid: Pyramid | null = null;
  currentLevel = 0;
  userInput = '';
  solved: { [i: number]: boolean } = {};
  revealed: { [i: number]: boolean } = {};
  won = false;
  loading = true;
  shakeState = 0;

  constructor(
    private http: HttpClient,
    private service: WordsService,
    private snack: MatSnackBar
  ) {}

  private platformId = inject(PLATFORM_ID);

  ngOnInit(): void {
    // SSR/prerender sırasında göreli URL ile HTTP isteği atılamaz.
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.http.get<Pyramid[]>('/assets/words/pyramids.json').subscribe({
      next: (data) => {
        this.pool = data || [];
        this.loading = false;
        this.newPyramid();
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  newPyramid(): void {
    if (!this.pool.length) return;
    this.pyramid = this.pool[Math.floor(Math.random() * this.pool.length)];
    this.currentLevel = 0; // en alt (en uzun) kelimeden başla
    this.userInput = '';
    this.solved = {};
    this.revealed = {};
    this.won = false;
  }

  get levels(): Level[] {
    return this.pyramid ? this.pyramid.levels : [];
  }

  // Görsel piramit: en kısa (tepe) üstte, en uzun (taban) altta
  get displayRows(): Level[] {
    return this.levels.slice().reverse();
  }

  realIndex(displayIdx: number): number {
    return this.levels.length - 1 - displayIdx;
  }

  get current(): Level | null {
    return this.levels[this.currentLevel] || null;
  }

  rowState(realIdx: number): string {
    if (this.solved[realIdx]) return 'solved';
    if (this.revealed[realIdx]) return 'revealed';
    if (realIdx === this.currentLevel && !this.won) return 'active';
    return 'locked';
  }

  tilesFor(realIdx: number): string[] {
    if (this.solved[realIdx] || this.revealed[realIdx]) {
      return this.upper(this.levels[realIdx].word).split('');
    }
    if (realIdx === this.currentLevel) {
      return this.levels[realIdx].letters.split('');
    }
    return new Array(this.levels[realIdx].word.length).fill('');
  }

  /**
   * levels[i].removed = i. seviyeden bir üst seviyeye çıkarken düşen harf.
   * Sadece o satır çözülmüş/açılmışsa gösterilir; yoksa bir üst kelime hakkında
   * bilgi sızdırmış oluruz.
   */
  droppedLetter(realIdx: number): string | null {
    const level = this.levels[realIdx];
    if (!level || !level.removed) return null;
    if (!this.solved[realIdx] && !this.revealed[realIdx]) return null;
    return level.removed;
  }

  submit(): void {
    if (this.won || !this.pyramid) return;
    const val = this.userInput.trim();
    if (!val) return;
    const answer = this.levels[this.currentLevel].word;
    if (this.service.checkAnswer(val, answer)) {
      this.solved[this.currentLevel] = true;
      this.play('correct');
      this.advance();
    } else {
      this.play('incorrect');
      this.shakeState++;
      this.snack.open('Yanlış, tekrar dene', 'Tamam', { duration: 1400 });
    }
    this.userInput = '';
  }

  reveal(): void {
    if (this.won || !this.pyramid) return;
    this.revealed[this.currentLevel] = true;
    this.userInput = '';
    this.advance();
  }

  private advance(): void {
    if (this.currentLevel >= this.levels.length - 1) {
      this.won = true;
    } else {
      this.currentLevel++;
    }
  }

  get solvedCount(): number {
    return Object.keys(this.solved).length;
  }

  private upper(s: string): string {
    const m: { [k: string]: string } = {
      i: 'İ', ı: 'I', ç: 'Ç', ş: 'Ş', ğ: 'Ğ', ö: 'Ö', ü: 'Ü',
    };
    return s
      .split('')
      .map((c) => m[c] || c.toUpperCase())
      .join('');
  }

  private play(kind: 'correct' | 'incorrect'): void {
    const audio = new Audio();
    audio.src =
      kind === 'correct'
        ? '../assets/sound/correct.mp3'
        : '../assets/sound/incorrect.wav';
    audio.load();
    audio.play().catch(() => {});
  }
}
