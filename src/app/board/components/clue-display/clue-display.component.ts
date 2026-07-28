/**
 * ClueDisplayComponent - Full-screen clue display for board
 * Shows clue text, category, and optionally the correct response
 */

import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStateService } from '../../../shared/services/game-state.service';
import { ClueMedia } from '../../../shared/models/game-content.model';

interface ClueDisplay {
  categoryTitle: string;
  clueText: string;
  value: number;
  correctResponse: string;
  showResponse: boolean;
  dailyDouble: boolean;
  waitingForWager: boolean;
  media?: ClueMedia;
}

@Component({
  selector: 'app-clue-display',
  imports: [CommonModule],
  templateUrl: './clue-display.component.html',
  styleUrl: './clue-display.component.scss'
})
export class ClueDisplayComponent implements OnInit {
  protected readonly clue = signal<ClueDisplay | null>(null);
  protected readonly mediaFailed = signal(false);

  constructor(private readonly gameStateService: GameStateService) {}

  ngOnInit(): void {
    this.gameStateService.getState().subscribe(state => {
      if (state.activeClue) {
        if (this.clue()?.clueText !== state.activeClue.clue.clueText) {
          this.mediaFailed.set(false);
        }
        const waitingForWager = state.activeClue.isDailyDouble && state.dailyDoubleWager === null;
        this.clue.set({
          categoryTitle: state.activeClue.categoryTitle,
          clueText: state.activeClue.clue.clueText,
          value: state.dailyDoubleWager || state.activeClue.clue.value,
          correctResponse: state.activeClue.clue.correctResponse,
          showResponse: false, // For Phase 3, don't show response yet
          dailyDouble: state.activeClue.isDailyDouble,
          waitingForWager,
          media: state.activeClue.clue.media,
        });
      } else {
        this.clue.set(null);
      }
    });
  }

  protected handleMediaError(): void {
    this.mediaFailed.set(true);
  }
}
