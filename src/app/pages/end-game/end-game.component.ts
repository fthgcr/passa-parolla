import {
  Component,
  Inject,
  OnInit,
  ChangeDetectionStrategy,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatAccordion, MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-end-game',
  templateUrl: './end-game.component.html',
  styleUrl: './end-game.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class EndGameComponent implements OnInit {
  constructor(
    public dialogRef: MatDialogRef<EndGameComponent>,
    @Inject(MAT_DIALOG_DATA) public questions: any[] // Use an interface if needed
  ) {}

  letters: string[] = 'ABCÇDEFGHIJKLMNOÖPRSŞTUÜVYZ'.split('');

  ngOnInit(): void {
    this.setBackgroundColor();
  }

  setBackgroundColor(){
    this.questions.forEach(question => {
      if(question.situation === 'w'){
        question["color"] = "#da5151";
      } else if (question.situation === 's'){
        question["color"] = "#3baea0";
      } else if (question.situation === 'p'){
        question["color"] = "#ffe79a";
      } else {
        question["color"] = "#5b6977";
      }
    });
  }
  hoverElement(){
    
  }

}
