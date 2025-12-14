/**
 * BoardComponent - Main container for board display interface
 */

import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStateService } from '../shared/services/game-state.service';
import { ClueBoardComponent } from './components/clue-board/clue-board.component';
import { ClueDisplayComponent } from './components/clue-display/clue-display.component';
import { ScoreDisplayComponent } from './components/score-display/score-display.component';
import { BuzzIndicatorComponent } from './components/buzz-indicator/buzz-indicator.component';

@Component({
  selector: 'app-board',
  imports: [
    CommonModule,
    ClueBoardComponent,
    ClueDisplayComponent,
    ScoreDisplayComponent,
    BuzzIndicatorComponent
  ],
  templateUrl: './board.component.html',
  styleUrl: './board.component.scss'
})
export class BoardComponent implements OnInit {
  protected readonly showClue = signal(false);

  constructor(private readonly gameStateService: GameStateService) {}

  ngOnInit(): void {
    // Subscribe to game state
    this.gameStateService.getState().subscribe(state => {
      // Show clue display if there's an active clue
      this.showClue.set(state.activeClue !== null);
    });
  }
}
