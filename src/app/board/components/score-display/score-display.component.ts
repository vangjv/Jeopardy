/**
 * ScoreDisplayComponent - Contestant score display for board
 * Shows all player names and scores
 */

import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStateService } from '../../../shared/services/game-state.service';
import { Player } from '../../../shared/models/player.model';

@Component({
  selector: 'app-score-display',
  imports: [CommonModule],
  templateUrl: './score-display.component.html',
  styleUrl: './score-display.component.scss'
})
export class ScoreDisplayComponent implements OnInit {
  protected readonly players = signal<Player[]>([]);

  constructor(private readonly gameStateService: GameStateService) {}

  ngOnInit(): void {
    this.gameStateService.getState().subscribe(state => {
      this.players.set(state.players);
    });
  }

  /**
   * Format score with proper sign
   */
  protected formatScore(score: number): string {
    return score >= 0 ? `$${score}` : `-$${Math.abs(score)}`;
  }

  /**
   * Get CSS class for score value
   */
  protected getScoreClass(score: number): string {
    if (score > 0) return 'positive';
    if (score < 0) return 'negative';
    return 'zero';
  }
}
