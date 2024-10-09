import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import {
  trigger,
  transition,
  style,
  animate,
  query,
  stagger,
} from '@angular/animations';
import { WordsService } from '../../services/words.service';
import { MatDialog } from '@angular/material/dialog';
import { EndGameComponent } from '../end-game/end-game.component';
import {MatSnackBar} from '@angular/material/snack-bar';
import { interval, Subscription, timer } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { StartGameComponent } from '../start-game/start-game.component';


@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrl: './main.component.scss',
  animations: [
    trigger('slideAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(20px)' }),
        animate(
          '300ms ease-out',
          style({ opacity: 1, transform: 'translateX(0)' })
        ),
      ]),
      transition(':leave', [
        animate(
          '300ms ease-in',
          style({ opacity: 0, transform: 'translateX(-20px)' })
        ),
      ]),
    ]),
  ],
})
export class MainComponent implements OnInit  {
  constructor(private service: WordsService) {
    
  }

  readonly dialog = inject(MatDialog);
  private _snackBar = inject(MatSnackBar);

  letters: string[] = 'ABCÇDEFGHIJKLMNOÖPRSŞTUÜVYZ'.split('');
  selectedIndex: number = 0;
  timer: number = 300;
  timeCounter : string = "05:00";
  questions: any[] = [];

  userInput: String = '';

  ngOnInit(): void {
    this.getQuestions();
    this.openStartDialog();
  }

  submit() {
    debugger;
    if (
      this.userInput.length < 1 ||
      this.userInput.replace(/\s+/g, '').length < 1
    ) {
    } else if (this.service.lowerCase(this.questions[this.selectedIndex].mainKey) !== this.service.lowerCase(this.userInput.charAt(0)) && this.service.lowerCase(this.userInput) !== 'pas' && this.service.lowerCase(this.userInput) !== 'bitir') {
      this.openSnackBar(this.questions[this.selectedIndex].mainKey + " Harfi ile Başlıyor Kör Müsün amk", "Tamam Kes!");
    } else if (this.service.lowerCase(this.userInput) === 'pas') {
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
        this.questions[this.selectedIndex]['user'] = this.userInput;
        this.changeQuestionSituation('s');
      } else {
        ////Answer is false
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
    const dialogRef = this.dialog.open(EndGameComponent, {
      data: this.questions,
    });
    dialogRef.afterClosed().subscribe((result) => {
      window.location.reload();
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
    debugger;
    if (this.selectedIndex === this.letters.length - 1) {
      this.selectedIndex = -1;
      this.findNextQuestion();
    } else {
      for (let index = this.selectedIndex + 1; index < 27; index++) {
        if (index === this.selectedIndex) {
          break;
        } else if (
          this.questions[index].situation === 'e' ||
          this.questions[index].situation === 'p'
        ) {
          this.selectedIndex = index;
          break;
        }
      }
    }
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
        this.timeCounter = "0"+(this.timer / 60).toString().charAt(0)+":"+this.timer % 60;
        this.startCountdown();
      }

      if(this.timer === 150){
        this.openSnackBar("Süre bitiyor. Oyalanma.", "Devaam");
      }
    
    }, 1500);
  }

  openStartDialog() {
    const dialogRef = this.dialog.open(StartGameComponent);
    dialogRef.afterClosed().subscribe((result) => {
      this.startCountdown();
    });
  } 
}
