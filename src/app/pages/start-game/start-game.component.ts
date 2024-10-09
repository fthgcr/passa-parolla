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
  selector: 'app-start-game',
  templateUrl: './start-game.component.html',
  styleUrl: './start-game.component.scss'
})
export class StartGameComponent  {
  constructor(
    public dialogRef: MatDialogRef<StartGameComponent>,
    @Inject(MAT_DIALOG_DATA) public questions: any[] // Use an interface if needed
  ) {}

  

}
