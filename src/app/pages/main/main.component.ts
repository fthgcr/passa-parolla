import { Component, OnDestroy, OnInit, inject } from '@angular/core';
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
export class MainComponent implements OnInit {
  constructor(private service: WordsService, private pyramid: PyramidService) {}

  readonly dialog = inject(MatDialog);
  private _snackBar = inject(MatSnackBar);
  private destroy$ = new Subject<void>();
  dialogRef: MatDialogRef<any>;

  letters: string[] = 'ABCÇDEFGHIJKLMNOÖPRSŞTUÜVYZ'.split('');
  selectedIndex: number = 0;
  timer: number = 300;
  timeCounter : string = "05:00";
  questions: any[] = [];
  userInput: String = '';
  isGameOver: boolean = false;

  ngOnInit(): void {
    this.getQuestions();
    this.openStartDialog();
    //this.test();
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
    const dialogRef = this.dialog.open(EndGameComponent, {
      data: this.questions,
    });
    dialogRef.afterClosed().subscribe((result) => {
      //window.location.reload();
      window.location.href = 'https://passa-parolla.onrender.com/';
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

  startCountdown(): void {
    setTimeout(() => {
      this.timer--;
      if(this.timer === 0){
        this.endGame();
      } else {
        if(this.timer % 60 < 10){
          this.timeCounter = "0"+(this.timer / 60).toString().charAt(0)+":0"+this.timer % 60;
        } else {
          this.timeCounter = "0"+(this.timer / 60).toString().charAt(0)+":"+this.timer % 60;
        }
          //this.timeCounter = "0"+(this.timer / 60).toString().charAt(0)+":"+this.timer % 60;
        
        this.startCountdown();
      }

      if(this.timer === 150){
        this.openSnackBar("Süre bitiyor. Oyalanma.", "Devaam");
      }
    
    }, 1500);
  }

  openStartDialog() {
    this.dialogRef = this.dialog.open(StartGameComponent,{ disableClose: true });
    this.dialogRef.afterClosed().subscribe((result) => {
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

