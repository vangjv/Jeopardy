/**
 * ScoreAdjudicationComponent - Score adjudication controls
 * Provides correct/incorrect buttons for host to update player scores
 */

import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { GameStateService } from '../../../shared/services/game-state.service';
import { Player } from '../../../shared/models/player.model';

@Component({
  selector: 'app-score-adjudication',
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule],
  templateUrl: './score-adjudication.component.html',
  styleUrl: './score-adjudication.component.scss'
})
export class ScoreAdjudicationComponent implements OnInit {
  protected readonly activeClue = signal<{
    categoryTitle: string;
    clueText: string;
    value: number;
    correctResponse: string;
    isDailyDouble: boolean;
  } | null>(null);
  protected readonly lockedPlayer = signal<Player | null>(null);
  protected readonly buzzerEnabled = signal(false);
  protected readonly buzzLocked = signal(false);
  protected readonly lockedOutPlayers = signal<Player[]>([]);
  protected readonly wrongAnswerSubtractsValue = signal(true);
  protected readonly canAdjudicate = signal(false);

  constructor(private readonly gameStateService: GameStateService) {}

  ngOnInit(): void {
    this.gameStateService.getState().subscribe(state => {
      const dailyDoubleReady =
        state.activeClue?.isDailyDouble === true &&
        state.dailyDoubleWager !== null &&
        state.controlPlayerId !== null;
      const standardClueReady =
        state.activeClue?.isDailyDouble !== true &&
        state.buzzLocked &&
        state.lockedPlayerId !== null;
      const canAdj = state.activeClue !== null && (dailyDoubleReady || standardClueReady);
      this.canAdjudicate.set(canAdj);
      this.buzzerEnabled.set(state.buzzerEnabled);
      this.buzzLocked.set(state.buzzLocked);
      this.lockedOutPlayers.set(
        state.players.filter(player => state.lockedOutPlayerIds.has(player.id))
      );
      this.wrongAnswerSubtractsValue.set(state.rules.wrongAnswerSubtractsValue);

      if (state.activeClue) {
        this.activeClue.set({
          categoryTitle: state.activeClue.categoryTitle,
          clueText: state.activeClue.clue.clueText,
          value: state.dailyDoubleWager || state.activeClue.clue.value,
          correctResponse: state.activeClue.clue.correctResponse,
          isDailyDouble: state.activeClue.isDailyDouble,
        });
      } else {
        this.activeClue.set(null);
      }

      const respondingPlayerId = state.activeClue?.isDailyDouble
        ? state.controlPlayerId
        : state.lockedPlayerId;
      if (respondingPlayerId) {
        const player = state.players.find(p => p.id === respondingPlayerId);
        this.lockedPlayer.set(player || null);
      } else {
        this.lockedPlayer.set(null);
      }
    });
  }

  /**
   * Mark response as correct
   */
  protected markCorrect(): void {
    const player = this.lockedPlayer();
    const clue = this.activeClue();
    const state = this.gameStateService.getCurrentState();

    if (!player || !clue) return;

    // Add points
    this.gameStateService.updatePlayerScore(player.id, clue.value);
    this.gameStateService.setControlPlayer(player.id);

    // T120: Auto-reveal correct response if rule is enabled
    if (state.rules.showCorrectResponseOnBoard) {
      this.gameStateService.revealCorrectResponse();
    }

    // Close clue. The next clue selection will reopen buzzing when appropriate.
    this.gameStateService.clearActiveClue();
  }

  /**
   * Mark response as incorrect
   */
  protected markIncorrect(): void {
    const player = this.lockedPlayer();
    const clue = this.activeClue();
    const state = this.gameStateService.getCurrentState();

    if (!player || !clue) return;

    // Subtract points if rule is enabled
    if (state.rules.wrongAnswerSubtractsValue) {
      this.gameStateService.updatePlayerScore(player.id, -clue.value);
    }

    if (state.activeClue?.isDailyDouble) {
      this.gameStateService.clearActiveClue();
      return;
    }

    // Add to lockouts if rule is enabled
    if (state.rules.lockoutWrongResponder) {
      const newLockouts = new Set(state.lockedOutPlayerIds);
      newLockouts.add(player.id);
      this.gameStateService.setLockedOutPlayers(newLockouts);
    }

    // Reset buzzer to allow other players to buzz
    this.gameStateService.resetBuzz();
  }

  /**
   * Skip clue without penalty
   */
  protected skipClue(): void {
    this.gameStateService.clearActiveClue();
  }

  protected resetBuzz(): void {
    this.gameStateService.resetBuzz();
  }
}
