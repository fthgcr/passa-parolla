import {
  Component,
  Inject,
  OnInit,
  ChangeDetectionStrategy,
  viewChild,
  ViewEncapsulation,
  AfterViewInit,
} from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatAccordion, MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { DOCUMENT } from '@angular/common';

@Component({
  selector: 'app-start-game',
  templateUrl: './start-game.component.html',
  styleUrl: './start-game.component.scss',
})
export class StartGameComponent implements OnInit {
  constructor(
    public dialogRef: MatDialogRef<StartGameComponent>,
    @Inject(MAT_DIALOG_DATA) public questions: any[], // Use an interface if needed,
    @Inject(DOCUMENT) private document: Document
  ) {}

  /** Seçilebilir oyun süreleri */
  readonly durations = [
    { label: '3 dk', seconds: 180 },
    { label: '5 dk', seconds: 300 },
    { label: '7 dk', seconds: 420 },
  ];

  /** Varsayılan: 5 dakika */
  selectedSeconds: number = 300;

  selectDuration(seconds: number): void {
    this.selectedSeconds = seconds;
  }

  ngOnInit(): void {
    if (this.document.defaultView && this.document.defaultView.Audio) {
      this.openingMusic();
    }
    
  }

  openingMusic() {
    setTimeout(() => {
      const audio = new Audio();
      audio.src = '../assets/sound/opening.mp3';
      audio.load();
      audio.play()
      .then;
    }, 1500);
  }
}
