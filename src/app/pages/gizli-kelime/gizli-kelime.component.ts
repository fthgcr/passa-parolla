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
  BLANK,
  Guess,
  GizliKelimeService,
  SecretWord,
  TR_ALPHABET,
  WordPool,
} from '../../services/gizli-kelime.service';

type Phase = 'setup' | 'playing' | 'won' | 'lost';
type GameMode = 'daily' | 'free';
/** Oyuncunun kendi tuttuğu not: 0 işaretsiz, 1 kırmızı (yok), 2 sarı (var), 3 yeşil (yeri belli) */
type Mark = 0 | 1 | 2 | 3;

const MAX_ATTEMPTS = 8;
const LENGTHS = [4, 5, 6, 7];
const STORAGE_PREFIX = 'evetabi:gizli-kelime';

interface SavedGame {
  guesses: Guess[];
  marks: { [letter: string]: Mark };
  /** Tahtadaki kutu notlari: anahtar "satir:sutun" */
  tileMarks?: { [cell: string]: Mark };
  phase: Phase;
}

@Component({
  selector: 'app-gizli-kelime',
  templateUrl: './gizli-kelime.component.html',
  styleUrl: './gizli-kelime.component.scss',
  animations: [
    // Satır 'done' durumuna geçtiğinde (tahmin onaylandığında) harfler sırayla oturur
    trigger('rowIn', [
      transition('* => done', [
        query(
          '.tile',
          [
            style({ opacity: 0, transform: 'scale(0.4)' }),
            stagger(45, [
              animate(
                '300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                style({ opacity: 1, transform: 'scale(1)' })
              ),
            ]),
          ],
          { optional: true }
        ),
      ]),
    ]),
    trigger('scoreIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(-10px)' }),
        animate('320ms 180ms ease-out', style({ opacity: 1, transform: 'translateX(0)' })),
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
export class GizliKelimeComponent implements OnInit {
  readonly maxAttempts = MAX_ATTEMPTS;
  readonly lengths = LENGTHS;
  readonly blank = BLANK;
  readonly alphabet = TR_ALPHABET;
  /** Ekran klavyesi satırları (Türkçe alfabe, okunur şekilde bölünmüş) */
  // Türkçe Q klavye dizilimi. Fiziksel Q klavyedeki q/w/x tuşları Türk
  // alfabesinde olmadığı için yer almıyor; kalan 29 harf aynı sırada.
  readonly keyboardRows = [
    'ertyuıopğü'.split(''),
    'asdfghjklşi'.split(''),
    'zcvbnmöç'.split(''),
  ];

  phase: Phase = 'setup';
  mode: GameMode = 'daily';
  length = 5;

  pool: WordPool = {};
  loading = true;
  loadError = false;

  secret: SecretWord | null = null;
  guesses: Guess[] = [];
  input: string[] = [];
  marks: { [letter: string]: Mark } = {};
  /** Oyuncunun tahtadaki kutulara verdigi renk notu; anahtar "satir:sutun" */
  tileMarks: { [cell: string]: Mark } = {};

  shakeState = 0;
  hintWord: string | null = null;
  hintCount = 0;
  showRules = false;

  private platformId = inject(PLATFORM_ID);
  private isBrowser = false;

  constructor(
    public service: GizliKelimeService,
    private snack: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.isBrowser = isPlatformBrowser(this.platformId);
    // SSR/prerender sırasında göreli URL ile HTTP isteği atılamaz.
    if (!this.isBrowser) return;

    this.service.getPool().subscribe({
      next: (data) => {
        this.pool = data || {};
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.loadError = true;
      },
    });
  }

  // --- Oyun kurulumu -------------------------------------------------------

  get currentPool(): SecretWord[] {
    return this.pool[String(this.length)] || [];
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
        this.marks = saved.marks || {};
        this.tileMarks = saved.tileMarks || {};
        this.phase = saved.phase;
        this.refreshRemaining();
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
    this.marks = {};
    this.tileMarks = {};
    this.hintWord = null;
    this.hintCount = 0;
    this.cols = Array.from({ length: this.length }, (_, i) => i);
    this.remaining = this.currentPool.length;
  }

  // --- Tahta ---------------------------------------------------------------

  readonly rows: number[] = Array.from({ length: MAX_ATTEMPTS }, (_, i) => i);
  cols: number[] = [];

  get attemptsLeft(): number {
    return MAX_ATTEMPTS - this.guesses.length;
  }

  get isPlaying(): boolean {
    return this.phase === 'playing';
  }

  /** Satırdaki bir hücrede gösterilecek harf */
  tileAt(row: number, col: number): string {
    if (row < this.guesses.length) {
      return this.upper(this.guesses[row].letters[col]);
    }
    if (row === this.guesses.length && this.isPlaying) {
      return this.upper(this.input[col] || '');
    }
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

  pressBlank(): void {
    this.press(BLANK);
  }

  backspace(): void {
    if (!this.isPlaying) return;
    this.input = this.input.slice(0, -1);
  }

  submit(): void {
    if (!this.isPlaying || !this.secret) return;

    if (this.input.length < this.length) {
      this.shakeState++;
      this.snack.open(`${this.length} kutunun hepsini doldur`, 'Tamam', { duration: 1400 });
      return;
    }

    if (this.input.every((c) => c === BLANK)) {
      this.shakeState++;
      this.snack.open('En az bir harf yazmalısın', 'Tamam', { duration: 1400 });
      return;
    }

    const letters = [...this.input];
    const feedback = this.service.evaluate(letters, this.secret.w);
    this.guesses = [...this.guesses, { letters, feedback }];
    this.input = [];
    this.hintWord = null;

    if (feedback.green === this.length) {
      this.phase = 'won';
    } else if (this.guesses.length >= MAX_ATTEMPTS) {
      this.phase = 'lost';
    }

    this.refreshRemaining();
    this.save();
  }

  giveUp(): void {
    if (!this.isPlaying) return;
    this.phase = 'lost';
    this.save();
  }

  // --- İpucu ---------------------------------------------------------------

  get canHint(): boolean {
    return this.isPlaying && this.guesses.length > 0;
  }

  askHint(): void {
    if (!this.canHint) return;
    const used = this.guesses.map((g) => g.letters.join(''));
    const suggestion = this.service.hint(this.currentPool, this.guesses, used);
    if (!suggestion) {
      this.snack.open('İpuçlarına uyan başka kelime bulamadım', 'Tamam', { duration: 2000 });
      return;
    }
    this.hintWord = suggestion.w;
    this.hintCount++;
  }

  /** İpucu kelimesini doğrudan giriş satırına yaz */
  useHint(): void {
    if (!this.hintWord || !this.isPlaying) return;
    this.input = this.hintWord.split('');
  }

  /**
   * Geri bildirimlerle tutarlı kalan kelime sayısı. Havuz taraması pahalı
   * olduğu için her change detection'da değil, sadece tahmin sonrası hesaplanır.
   */
  remaining = 0;

  private refreshRemaining(): void {
    this.remaining = this.guesses.length
      ? this.service.remainingCount(this.currentPool, this.guesses)
      : this.currentPool.length;
  }

  // --- Harf işaretleme (oyuncunun kendi notu) -------------------------------

  markOf(letter: string): Mark {
    return this.marks[letter] || 0;
  }

  cycleMark(letter: string): void {
    const next = (((this.marks[letter] || 0) + 1) % 4) as Mark;
    this.marks = { ...this.marks, [letter]: next };
    this.save();
  }

  clearMarks(): void {
    this.marks = {};
    this.tileMarks = {};
    this.save();
  }

  markClass(letter: string): string {
    return ['none', 'red', 'yellow', 'green'][this.markOf(letter)];
  }

  // --- Tahtada kutu boyama (Word500 tarzi) ---------------------------------

  private tileKey(row: number, col: number): string {
    return `${row}:${col}`;
  }

  /** Sadece onaylanmis tahmin satirlarindaki gercek harfler boyanabilir */
  canMarkTile(row: number, col: number): boolean {
    if (row >= this.guesses.length) return false;
    return this.guesses[row].letters[col] !== BLANK;
  }

  tileMarkOf(row: number, col: number): Mark {
    return this.tileMarks[this.tileKey(row, col)] || 0;
  }

  tileMarkClass(row: number, col: number): string {
    return ['mark-none', 'mark-red', 'mark-yellow', 'mark-green'][this.tileMarkOf(row, col)];
  }

  /**
   * Kutuya tiklayinca renk sirayla doner: renksiz -> yesil -> sari -> kirmizi.
   * Gizli kelimede ayni harf iki kez gecmedigi icin harfin durumu evrenseldir;
   * bu yuzden alttaki alfabe notu da ayni renge cekilir.
   */
  cycleTileMark(row: number, col: number): void {
    if (!this.canMarkTile(row, col)) return;
    const order: Mark[] = [0, 3, 2, 1];
    const current = this.tileMarkOf(row, col);
    const next = order[(order.indexOf(current) + 1) % order.length];

    this.tileMarks = { ...this.tileMarks, [this.tileKey(row, col)]: next };

    const letter = this.guesses[row].letters[col];
    this.marks = { ...this.marks, [letter]: next };

    this.save();
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
    if (event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
      this.pressBlank();
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
      const data: SavedGame = {
        guesses: this.guesses,
        marks: this.marks,
        tileMarks: this.tileMarks,
        phase: this.phase,
      };
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

  /** Kelimeyi sızdırmadan, sadece sayı desenini paylaşır */
  get shareText(): string {
    const head =
      this.mode === 'daily'
        ? `Evet Abi · Gizli Kelime ${this.service.todayKey()} (${this.length} harf)`
        : `Evet Abi · Gizli Kelime (${this.length} harf)`;
    const result = this.phase === 'won' ? `${this.guesses.length}/${MAX_ATTEMPTS}` : `X/${MAX_ATTEMPTS}`;
    const lines = this.guesses.map(
      (g) => `🟩${g.feedback.green} 🟨${g.feedback.yellow} 🟥${g.feedback.red}`
    );
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
    if (text === BLANK) return BLANK;
    return this.service.upper(text);
  }

  poolSize(len: number): number {
    return (this.pool[String(len)] || []).length;
  }

  toggleRules(): void {
    this.showRules = !this.showRules;
  }
}
