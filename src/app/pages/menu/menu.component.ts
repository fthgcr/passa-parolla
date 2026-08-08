import { Component } from '@angular/core';
import {
  trigger,
  transition,
  style,
  animate,
  query,
  stagger,
} from '@angular/animations';

@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.scss',
  animations: [
    // Başlık yukarıdan yumuşakça iner
    trigger('titleIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-24px)' }),
        animate(
          '600ms cubic-bezier(0.22, 1, 0.36, 1)',
          style({ opacity: 1, transform: 'translateY(0)' })
        ),
      ]),
    ]),
    // Kartlar sırayla belirir
    trigger('cardsIn', [
      transition(':enter', [
        query(
          '.card',
          [
            style({ opacity: 0, transform: 'translateY(28px) scale(0.94)' }),
            stagger(120, [
              animate(
                '520ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                style({ opacity: 1, transform: 'translateY(0) scale(1)' })
              ),
            ]),
          ],
          { optional: true }
        ),
      ]),
    ]),
  ],
})
export class MenuComponent {}
