import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

type Situation = 's' | 'w' | 'p' | 'e';

@Component({
  selector: 'app-end-game',
  templateUrl: './end-game.component.html',
  styleUrl: './end-game.component.scss',
})
export class EndGameComponent implements OnInit {
  constructor(
    public dialogRef: MatDialogRef<EndGameComponent>,
    @Inject(MAT_DIALOG_DATA) public questions: any[] // Use an interface if needed
  ) {}

  /** Özet sayaçlar */
  correctCount = 0;
  wrongCount = 0;
  passCount = 0;
  emptyCount = 0;
  total = 0;
  successRate = 0;

  /** Performansa göre değişen başlık */
  headline = '';
  subline = '';

  /** Izgarada seçili olan sorunun indeksi (-1 = seçim yok) */
  selectedIndex = -1;

  ngOnInit(): void {
    this.setBackgroundColor();
    this.calculateScore();
    this.setHeadline();
    this.selectFirstNotable();
  }

  setBackgroundColor() {
    this.questions.forEach((question) => {
      if (question.situation === 'w') {
        question['color'] = '#da5151';
      } else if (question.situation === 's') {
        question['color'] = '#3baea0';
      } else if (question.situation === 'p') {
        question['color'] = '#ffe79a';
      } else {
        question['color'] = '#5b6977';
      }
    });
  }

  private calculateScore(): void {
    this.total = this.questions.length;
    this.correctCount = this.countBy('s');
    this.wrongCount = this.countBy('w');
    this.passCount = this.countBy('p');
    this.emptyCount = this.countBy('e');
    this.successRate = this.total
      ? Math.round((this.correctCount / this.total) * 100)
      : 0;
  }

  private countBy(situation: Situation): number {
    return this.questions.filter((q) => q.situation === situation).length;
  }

  private setHeadline(): void {
    const rate = this.successRate;
    if (rate >= 90) {
      this.headline = 'Efsanesin!';
      this.subline = 'Bu tabloyu çerçeveletmek lazım.';
    } else if (rate >= 70) {
      this.headline = 'Çok iyi!';
      this.subline = 'Birkaç soru daha olsa tamamdı.';
    } else if (rate >= 50) {
      this.headline = 'Fena değil';
      this.subline = 'Yarıyı geçtin, gerisi kolay.';
    } else if (rate >= 25) {
      this.headline = 'Isınma turu';
      this.subline = 'Bir daha dene, kas hafızası gelişiyor.';
    } else {
      this.headline = 'Daha iyisini yaparsın';
      this.subline = 'Herkes bir yerden başlıyor abi.';
    }
  }

  /** Açılışta ilk yanlış/pas soruyu seçili getir — insan önce onlara bakar */
  private selectFirstNotable(): void {
    const notable = this.questions.findIndex(
      (q) => q.situation === 'w' || q.situation === 'p'
    );
    this.selectedIndex = notable !== -1 ? notable : this.questions.length ? 0 : -1;
  }

  select(index: number): void {
    this.selectedIndex = this.selectedIndex === index ? -1 : index;
  }

  get selectedQuestion(): any | null {
    return this.selectedIndex >= 0
      ? this.questions[this.selectedIndex] ?? null
      : null;
  }

  /** Izgaradaki kareler ve detay paneli için durum etiketi */
  situationLabel(situation: Situation | string): string {
    switch (situation) {
      case 's':
        return 'Doğru';
      case 'w':
        return 'Yanlış';
      case 'p':
        return 'Pas';
      default:
        return 'Boş';
    }
  }

  /** Klavyeyle de gezilebilsin */
  onGridKeydown(event: KeyboardEvent, index: number): void {
    const last = this.questions.length - 1;
    let next: number | null = null;

    if (event.key === 'ArrowRight') next = Math.min(index + 1, last);
    else if (event.key === 'ArrowLeft') next = Math.max(index - 1, 0);
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = last;

    if (next !== null) {
      event.preventDefault();
      this.selectedIndex = next;
      const el = document.getElementById('result-cell-' + next);
      el?.focus();
    }
  }

  restart(): void {
    this.dialogRef.close('restart');
  }

  goToMenu(): void {
    this.dialogRef.close('menu');
  }

  trackByIndex(index: number): number {
    return index;
  }
}
