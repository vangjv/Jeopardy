/**
 * RoundTransitionComponent - Displays round transition animation
 * T083: Create RoundTransitionComponent for round change display
 */

import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RoundType } from '../../../shared/models/game-content.model';

@Component({
  selector: 'app-round-transition',
  imports: [CommonModule],
  templateUrl: './round-transition.component.html',
  styleUrl: './round-transition.component.scss'
})
export class RoundTransitionComponent {
  @Input() set round(value: RoundType) {
    this._round.set(value);
  }

  protected readonly _round = signal<RoundType>('round1');

  /**
   * Get round title for display
   */
  protected getRoundTitle(): string {
    switch (this._round()) {
      case 'round1':
        return 'Jeopardy!';
      case 'round2':
        return 'Double Jeopardy!';
      case 'final':
        return 'Final Jeopardy!';
      default:
        return 'Jeopardy!';
    }
  }

  /**
   * Get round subtitle
   */
  protected getRoundSubtitle(): string {
    switch (this._round()) {
      case 'round1':
        return 'Round 1';
      case 'round2':
        return 'Round 2 - Values Doubled!';
      case 'final':
        return 'Final Round';
      default:
        return '';
    }
  }
}
