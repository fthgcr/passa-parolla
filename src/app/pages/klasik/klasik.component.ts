import {
  Component,
  HostListener,
  OnInit,
  PLATFORM_ID,
  inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  trigger,
  transition,
  style,
  animate,
  keyframes,
  query,
  stagger,
} from '@angular/animations';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  KlasikData,
  KlasikGuess,
  KlasikService,
  KlasikWord,
  TileState,
  TR_ALPHABET,
} from '../../services/klasik.service';

type Phase = 'setup' | 'playing' | 'won' | 'lost';
type GameMode = 'daily' | 'free';

/** Klasik Wordle hakkı: uzunluk değişse de 6 kalır */
const MAX_ATTEMPTS = 6;
const LENGTHS = [4, 5, 6, 7];
const STORAGE_PREFIX = 'evetabi:klasik';

interface SavedGame {
  guesses: KlasikGuess[];
  phase: Phase;
}

@Component({
  selector: 'app-klasik',
  templateUrl: './klasik.component.html',
  styleUrl: './klasik.component.scss',
  animations: [
    // Tahmin onaylandığında harfler soldan sağa sırayla açılır
    trigger('rowIn', [
      transition('* => done', [
        query(
          '.tile',
          [
            style({ transform: 'rotateX(-90deg)', opacity: 0 }),
            stagger(120, [
              animate(
                '260ms cubic-bezier(0.34, 1.4, 0.64, 1)',
                style({ transform: 'rotateX(0)', opacity: 1 })
              ),
            ]),
          ],
          { optional: true }
        ),
      ]),
    ]),
    trigger('shake', [
      transition('* => *', [
        animate(
          '420ms',
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
    trigger('panelIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(18px) scale(0.96)' }),
        animate(
          '420ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          style({ opacity: 1, transform: 'translateY(0) scale(1)' })
        ),
      ]),
    ]),
  ],
})
export class KlasikComponent implements OnInit {
  readonly maxAttempts = MAX_ATTEMPTS;
  readonly lengths = LENGTHS;
  readonly alphabet = TR_ALPHABET;
  // Türkçe Q klavye dizilimi. Fiziksel Q klavyedeki q/w/x tuşları Türk
  // alfabesinde olmadığı için yer almıyor; kalan 29 harf aynı sırada.
  readonly keyboardRows = [
    'ertyuıopğü'.split(''),
    'asdfghjklşi'.split(''),
    'zcvbnmöç'.split(''),
  ];
  readonly rows: number[] = Array.from({ length: MAX_ATTEMPTS }, (_, i) => i);

  phase: Phase = 'setup';
  mode: GameMode = 'daily';
  length = 5;

  data: KlasikData | null = null;
  loading = true;
  loadError = false;

  secret: KlasikWord | null = null;
  guesses: KlasikGuess[] = [];
  input: string[] = [];
  cols: number[] = [];
  keyState: { [letter: string]: TileState } = {};

  shakeState = 0;
  showRules = false;

  private platformId = inject(PLATFORM_ID);
  private isBrowser = false;

  constructor(
    public service: KlasikService,
    private snack: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.isBrowser = isPlatformBrowser(this.platformId);
    // SSR/prerender sırasında göreli URL ile HTTP isteği atılamaz.
    if (!this.isBrowser) return;

    this.service.load().subscribe({
      next: (data) => {
        this.data = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.loadError = true;
      },
    });
  }

  // --- Oyun kurulumu -------------------------------------------------------

  get currentPool(): KlasikWord[] {
    return this.data?.answers[String(this.length)] || [];
  }

  private get validWords(): Set<string> {
    return this.data?.valid[String(this.length)] || new Set<string>();
  }

  selectLength(len: number): void {
    this.length = len;
  }

  selectMode(mode: GameMode): void {
    this.mode = mode;
  }

  start(): void {
    const pool = this.currentPool;
    if (!pool.length) {
      this.snack.open('Bu uzunlukta kelime bulunamadı', 'Tamam', { duration: 1800 });
      return;
    }

    this.resetState();

    if (this.mode === 'daily') {
      this.secret = this.service.pickDaily(pool, this.length);
      const saved = this.load();
      if (saved) {
        this.guesses = saved.guesses;
        this.phase = saved.phase;
        this.refreshKeys();
        return;
      }
    } else {
      this.secret = this.service.pickRandom(pool);
    }

    this.phase = 'playing';
  }

  /** Serbest modda yeni kelime; günlük modda kurulum ekranına döner */
  playAgain(): void {
    if (this.mode === 'daily') {
      this.phase = 'setup';
      return;
    }
    this.start();
  }

  backToSetup(): void {
    this.phase = 'setup';
  }

  private resetState(): void {
    this.guesses = [];
    this.input = [];
    this.keyState = {};
    this.cols = Array.from({ length: this.length }, (_, i) => i);
  }

  // --- Tahta ---------------------------------------------------------------

  get attemptsLeft(): number {
    return MAX_ATTEMPTS - this.guesses.length;
  }

  get isPlaying(): boolean {
    return this.phase === 'playing';
  }

  tileAt(row: number, col: number): string {
    if (row < this.guesses.length) {
      return this.upper(this.guesses[row].letters[col]);
    }
    if (row === this.guesses.length && this.isPlaying) {
      return this.upper(this.input[col] || '');
    }
    return '';
  }

  /** Onaylanmış satırlarda harf rengi; henüz oynanmamış satırlarda boş */
  tileState(row: number, col: number): string {
    if (row < this.guesses.length) return this.guesses[row].states[col];
    return '';
  }

  rowClass(row: number): string {
    if (row < this.guesses.length) return 'done';
    if (row === this.guesses.length && this.isPlaying) return 'active';
    return 'idle';
  }

  isCursor(row: number, col: number): boolean {
    return this.isPlaying && row === this.guesses.length && col === this.input.length;
  }

  // --- Giriş ---------------------------------------------------------------

  press(letter: string): void {
    if (!this.isPlaying) return;
    if (this.input.length >= this.length) return;
    this.input = [...this.input, letter];
  }

  backspace(): void {
    if (!this.isPlaying) return;
    this.input = this.input.slice(0, -1);
  }

  submit(): void {
    if (!this.isPlaying || !this.secret) return;

    if (this.input.length < this.length) {
      this.reject(`${this.length} harfin hepsini yaz`);
      return;
    }

    const word = this.input.join('');
    // Klasik Wordle kuralı: tahmin sözlükte olmalı
    if (!this.validWords.has(word)) {
      this.reject('Kelime listesinde yok');
      return;
    }

    const letters = [...this.input];
    const states = this.service.evaluate(letters, this.secret.w);
    this.guesses = [...this.guesses, { letters, states }];
    this.input = [];
    this.refreshKeys();

    if (this.service.isWin(states)) {
      this.phase = 'won';
    } else if (this.guesses.length >= MAX_ATTEMPTS) {
      this.phase = 'lost';
    }

    this.save();
  }

  private reject(message: string): void {
    this.shakeState++;
    this.snack.open(message, 'Tamam', { duration: 1400 });
  }

  giveUp(): void {
    if (!this.isPlaying) return;
    this.phase = 'lost';
    this.save();
  }

  private refreshKeys(): void {
    this.keyState = this.service.keyStates(this.guesses);
  }

  keyClass(letter: string): string {
    return this.keyState[letter] || 'none';
  }

  // --- Klavye --------------------------------------------------------------

  @HostListener('window:keydown', ['$event'])
  onKey(event: KeyboardEvent): void {
    if (!this.isPlaying) return;
    if (event.ctrlKey || event.altKey || event.metaKey) return;

    if (event.key === 'Enter') {
      event.preventDefault();
      this.submit();
      return;
    }
    if (event.key === 'Backspace') {
      event.preventDefault();
      this.backspace();
      return;
    }
    if (event.key.length === 1) {
      const ch = this.service.lower(event.key);
      if (this.service.isLetter(ch)) {
        event.preventDefault();
        this.press(ch);
      }
    }
  }

  // --- Kayıt (sadece günlük mod) -------------------------------------------

  private storageKey(): string {
    return `${STORAGE_PREFIX}:${this.service.todayKey()}:${this.length}`;
  }

  private save(): void {
    if (!this.isBrowser || this.mode !== 'daily') return;
    try {
      const data: SavedGame = { guesses: this.guesses, phase: this.phase };
      localStorage.setItem(this.storageKey(), JSON.stringify(data));
    } catch {
      // Depolama kapalıysa oyun yine de oynanabilsin
    }
  }

  private load(): SavedGame | null {
    if (!this.isBrowser || this.mode !== 'daily') return null;
    try {
      const raw = localStorage.getItem(this.storageKey());
      if (!raw) return null;
      const data = JSON.parse(raw) as SavedGame;
      if (!data || !Array.isArray(data.guesses)) return null;
      return data;
    } catch {
      return null;
    }
  }

  // --- Paylaşım ------------------------------------------------------------

  /** Kelimeyi sızdırmadan renk desenini paylaşır */
  get shareText(): string {
    const head =
      this.mode === 'daily'
        ? `Evet Abi · Klasik ${this.service.todayKey()} (${this.length} harf)`
        : `Evet Abi · Klasik (${this.length} harf)`;
    const result = this.phase === 'won' ? `${this.guesses.length}/${MAX_ATTEMPTS}` : `X/${MAX_ATTEMPTS}`;
    const emoji: { [k in TileState]: string } = {
      green: '🟩',
      yellow: '🟨',
      gray: '⬜',
    };
    const lines = this.guesses.map((g) => g.states.map((s) => emoji[s]).join(''));
    return [`${head} — ${result}`, ...lines].join('\n');
  }

  share(): void {
    if (!this.isBrowser) return;
    const text = this.shareText;
    const done = () => this.snack.open('Sonuç kopyalandı', 'Tamam', { duration: 1600 });
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(done, () => this.fallbackCopy(text, done));
    } else {
      this.fallbackCopy(text, done);
    }
  }

  private fallbackCopy(text: string, done: () => void): void {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    try {
      document.execCommand('copy');
      done();
    } catch {
      this.snack.open('Kopyalanamadı', 'Tamam', { duration: 1600 });
    }
    document.body.removeChild(area);
  }

  // --- Yardımcılar ---------------------------------------------------------

  upper(text: string): string {
    return this.service.upper(text);
  }

  poolSize(len: number): number {
    return (this.data?.answers[String(len)] || []).length;
  }

  toggleRules(): void {
    this.showRules = !this.showRules;
  }
}
