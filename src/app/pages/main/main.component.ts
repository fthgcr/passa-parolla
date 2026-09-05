import { Component, NgZone, OnDestroy, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  trigger,
  transition,
  style,
  animate,
  keyframes
} from '@angular/animations';
import { WordsService } from '../../services/words.service';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { EndGameComponent } from '../end-game/end-game.component';
import {MatSnackBar} from '@angular/material/snack-bar';
import { StartGameComponent } from '../start-game/start-game.component';
import { Subject, takeUntil } from 'rxjs';
import { PyramidService } from '../../services/pyramid.service';


@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrl: './main.component.scss',
  animations: [
    // Harf carousel: sağdan yaylanarak girer, sola süzülerek çıkar
    trigger('slideAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(45px) scale(0.4)' }),
        animate(
          '450ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          style({ opacity: 1, transform: 'translateX(0) scale(1)' })
        ),
      ]),
      transition(':leave', [
        animate(
          '280ms cubic-bezier(0.4, 0, 1, 1)',
          style({ opacity: 0, transform: 'translateX(-45px) scale(0.4)' })
        ),
      ]),
    ]),
    // Soru metni her değişimde aşağıdan yumuşakça belirir
    trigger('questionAnimation', [
      transition('* => *', [
        style({ opacity: 0, transform: 'translateY(18px)' }),
        animate(
          '400ms 80ms cubic-bezier(0.22, 1, 0.36, 1)',
          style({ opacity: 1, transform: 'translateY(0)' })
        ),
      ]),
    ]),
    // Sayaç her saniye hafifçe nabız atar
    trigger('tickAnimation', [
      transition('* => *', [
        animate(
          '600ms ease-out',
          keyframes([
            style({ transform: 'scale(1)', offset: 0 }),
            style({ transform: 'scale(1.18)', offset: 0.3 }),
            style({ transform: 'scale(1)', offset: 1 }),
          ])
        ),
      ]),
    ]),
  ],
})
export class MainComponent implements OnInit, OnDestroy {
  constructor(private service: WordsService, private pyramid: PyramidService) {}

  readonly dialog = inject(MatDialog);
  private _snackBar = inject(MatSnackBar);
  private destroy$ = new Subject<void>();
  private zone = inject(NgZone);
  private platformId = inject(PLATFORM_ID);
  dialogRef: MatDialogRef<any>;

  letters: string[] = 'ABCÇDEFGHIJKLMNOÖPRSŞTUÜVYZ'.split('');
  selectedIndex: number = 0;

  /** Harf görünümü: 'strip' kayan şerit, 'ring' klasik rosco çemberi. */
  viewMode: 'strip' | 'ring' = 'strip';
  private readonly viewKey = 'evetabi.passaparola.view';

  /** Oyunun toplam süresi (saniye). Başlangıç ekranından seçilir. */
  totalSeconds: number = 300;
  /** Kalan süre (saniye) — her zaman gerçek geçen süreden türetilir. */
  timer: number = 300;
  timeCounter: string = '05:00';

  /** Süre bitiş anı (epoch ms). Tek doğruluk kaynağı budur. */
  private deadline: number = 0;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private countdownStarted: boolean = false;
  private warningShown: boolean = false;

  questions: any[] = [];
  userInput: String = '';
  isGameOver: boolean = false;

  ngOnInit(): void {
    // Sunucuda (SSR/prerender) HTTP ve dialog çalıştırmıyoruz:
    // göreli URL'ler Node tarafında çözülemediği için build sırasında hata veriyordu.
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.restoreViewMode();
    this.getQuestions();
    this.openStartDialog();
    //this.test();
  }

  // --- Harf görünümü ------------------------------------------------------

  setViewMode(mode: 'strip' | 'ring'): void {
    if (this.viewMode === mode) return;
    this.viewMode = mode;
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      localStorage.setItem(this.viewKey, mode);
    } catch {
      // Gizli sekmede / depolama kapalıysa sessizce geç
    }
  }

  private restoreViewMode(): void {
    try {
      const saved = localStorage.getItem(this.viewKey);
      if (saved === 'ring' || saved === 'strip') {
        this.viewMode = saved;
      }
    } catch {
      // Depolama okunamıyorsa varsayılan görünümde kal
    }
  }

  /** Paslanan harfin zemini açık sarı; beyaz yazı okunmuyor, koyulaştırıyoruz. */
  isPassed(letter: string): boolean {
    const q = this.questions.find((question) => question.mainKey === letter);
    return q?.situation === 'p';
  }

  /**
   * Çemberdeki i. harfin yerleşimi. Harf, merkezden dışa doğru itiliyor;
   * ikinci rotate ile tekrar dikleştirilerek yazı düz kalıyor.
   */
  ringTransform(index: number): string {
    const angle = (360 / this.letters.length) * index - 90;
    return `rotate(${angle}deg) translate(var(--ring-r)) rotate(${-angle}deg)`;
  }

  ngOnDestroy(): void {
    // Sayfadan çıkıldığında sayaç arka planda çalışmaya devam etmesin
    this.stopCountdown();
    this.destroy$.next();
    this.destroy$.complete();
  }


  test(){
    const a = this.service.compareWordsAndValues("Üç tepe noktası, üç açısı, üç kenarı olan geometri biçimi, müselles:", "üçgen");
    console.log("a : " + a);
  }

  submit() {
    if (
      this.userInput.length < 1 ||
      this.userInput.replace(/\s+/g, '').length < 1
    ) {
    } else if (this.service.lowerCase(this.questions[this.selectedIndex].mainKey) !== this.service.lowerCase(this.userInput.charAt(0)) && this.service.lowerCase(this.userInput) !== 'pas' && this.service.lowerCase(this.userInput) !== 'bitir') {
      this.openSnackBar(this.questions[this.selectedIndex].mainKey + " Harfi ile Başlıyor Kör Müsün amk", "Tamam Kes!");
    } else if (this.service.lowerCase(this.userInput) === 'pas') {
      this.passSound();
      this.changeQuestionSituation('p');
    } else if (this.service.lowerCase(this.userInput) === 'bitir') {
      this.endGame();
    } else {
      if (
        this.service.checkAnswer(
          this.userInput,
          this.questions[this.selectedIndex].nestedKey
        )
      ) {
        //Answer is true
        this.correctSound();
        this.questions[this.selectedIndex]['user'] = this.userInput;
        this.changeQuestionSituation('s');
      } else {
        ////Answer is false
        this.incorrectSound();
        this.questions[this.selectedIndex]['user'] = this.userInput;
        this.changeQuestionSituation('w');
      }
    }

    this.userInput = '';
  }

  /** Pas butonu — yazıyla "pas" göndermekle aynı işi yapar */
  pass(): void {
    if (this.isGameOver || !this.questions[this.selectedIndex]) {
      return;
    }
    this.userInput = '';
    this.passSound();
    this.changeQuestionSituation('p');
  }

  changeQuestionSituation(situation: any) {
    this.questions[this.selectedIndex].situation = situation;
    if (this.questions[this.selectedIndex].situation === 'w') {
      this.questions[this.selectedIndex]['color'] = '#da5151';
    } else if (this.questions[this.selectedIndex].situation === 's') {
      this.questions[this.selectedIndex]['color'] = '#3baea0';
    } else if (this.questions[this.selectedIndex].situation === 'p') {
      this.questions[this.selectedIndex]['color'] = '#ffe79a';
    }
    this.findNextQuestion();
  }

  endGame() {
    if(this.isGameOver){
      return;
    }
    this.isGameOver = true;
    this.stopCountdown();
    const dialogRef = this.dialog.open(EndGameComponent, {
      data: this.questions,
      panelClass: 'game-dialog',
      maxWidth: '560px',
      width: '92vw',
    });
    dialogRef
      .afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((result) => {
        // Tam yeniden yükleme ile oyun durumu (sorular, sayaç) sıfırlanır
        window.location.href = result === 'restart' ? '/passaparola' : '/';
      });
  }

  getQuestions() {
    this.service.getJsonData().subscribe((data) => {
      this.questions = this.service.questions(data);
    });
  }

  openSnackBar(message: string, action: string) {
    this._snackBar.open(message, action);
  }

  setBackground(letter: any) {
    const index = this.questions.findIndex(
      (question) => question.mainKey === letter
    );

    if (index !== -1) {
      return this.questions[index].color;
    } else {
      return 'white';
    }
  }

  getVisibleLetters(): string[] {
    const maxVisible = 7;
    let start = Math.max(0, this.selectedIndex - Math.floor(maxVisible / 2));
    let end = start + maxVisible;

    // Adjust start and end to fit the range properly
    if (end > this.letters.length) {
      end = this.letters.length;
      start = Math.max(0, end - maxVisible);
    }

    return this.letters.slice(start, end);
  }

  findNextQuestion() {
    const total = this.letters.length;
    // Geçerli konumdan itibaren, dönerek bir sonraki boş ('e') veya paslı ('p') soruyu bul
    for (let step = 1; step <= total; step++) {
      const index = (this.selectedIndex + step) % total;
      const situation = this.questions[index]?.situation;
      if (situation === 'e' || situation === 'p') {
        this.selectedIndex = index;
        return;
      }
    }
    // Boş/paslı soru kalmadı → oyun biter
    this.endGame();
  }

  previous(): void {
    if (this.selectedIndex > 0) {
      this.selectedIndex--;
    }
  }

  trackByFn(index: number, letter: string): string {
    return letter; // Use the letter itself as the unique identifier
  }

  next(): void {
    if (this.selectedIndex < this.letters.length - 1) {
      this.selectedIndex++;
    } else if (this.selectedIndex === this.letters.length - 1) {
      this.selectedIndex = 0;
    }
  }

  /** Saniyeyi mm:ss biçimine çevirir (10 dakika üstünde de doğru çalışır). */
  private formatTime(totalSeconds: number): string {
    const safe = Math.max(0, totalSeconds);
    const minutes = Math.floor(safe / 60);
    const seconds = safe % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  startCountdown(): void {
    // Çift başlatmaya karşı koruma: ikinci bir sayaç zinciri süreyi hızlandırırdı
    if (this.countdownStarted || this.isGameOver) {
      return;
    }
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.countdownStarted = true;
    this.warningShown = false;
    this.timer = this.totalSeconds;
    this.timeCounter = this.formatTime(this.timer);
    this.deadline = Date.now() + this.totalSeconds * 1000;

    // Duvar saatine göre hesapladığımız için sekme arka plana atılsa,
    // tarayıcı zamanlayıcıyı kıssa bile ekrandaki süre gerçek süreyle aynı kalır.
    this.zone.runOutsideAngular(() => {
      this.intervalId = setInterval(() => this.tick(), 250);
    });
  }

  private tick(): void {
    const remaining = Math.max(0, Math.ceil((this.deadline - Date.now()) / 1000));

    if (remaining === this.timer) {
      return; // Görünen değer değişmedi, change detection tetiklemeye gerek yok
    }

    this.zone.run(() => {
      this.timer = remaining;
      this.timeCounter = this.formatTime(remaining);

      if (!this.warningShown && remaining > 0 && remaining <= Math.floor(this.totalSeconds / 2)) {
        this.warningShown = true;
        this.openSnackBar('Süre bitiyor. Oyalanma.', 'Devaam');
      }

      if (remaining === 0) {
        this.stopCountdown();
        this.endGame();
      }
    });
  }

  private stopCountdown(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  openStartDialog() {
    this.dialogRef = this.dialog.open(StartGameComponent, {
      disableClose: true,
      panelClass: 'game-dialog',
      maxWidth: '520px',
      width: '92vw',
    });
    this.dialogRef
      .afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((result) => {
        // Dialog seçilen süreyi (saniye) döndürür; yoksa varsayılan 5 dakika
        const chosen = Number(result);
        if (Number.isFinite(chosen) && chosen > 0) {
          this.totalSeconds = chosen;
        }
        this.startCountdown();
      });
  }

  correctSound(){
    const audio = new Audio();
    audio.src = "../assets/sound/correct.mp3";
    audio.load();
    audio.play();
  }

  incorrectSound(){
    const audio = new Audio();
    audio.src = "../assets/sound/incorrect.wav";
    audio.load();
    audio.play();
  }

  passSound(){
    const audio = new Audio();
    audio.src = "../assets/sound/pass.ogg";
    audio.load();
    audio.play();
  }

  ////

  
}

