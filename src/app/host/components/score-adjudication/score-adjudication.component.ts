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
  protected readonly activeClue = signal<{ value: number; correctResponse: string } | null>(null);
  protected readonly lockedPlayer = signal<Player | null>(null);
  protected readonly canAdjudicate = signal(false);

  constructor(private readonly gameStateService: GameStateService) {}

  ngOnInit(): void {
    this.gameStateService.getState().subscribe(state => {
      // Show adjudication controls when a player has buzzed in
      const canAdj = state.buzzLocked && state.lockedPlayerId !== null && state.activeClue !== null;
      this.canAdjudicate.set(canAdj);

      if (state.activeClue) {
        this.activeClue.set({
          value: state.dailyDoubleWager || state.activeClue.clue.value,
          correctResponse: state.activeClue.clue.correctResponse
        });
      } else {
        this.activeClue.set(null);
      }

      if (state.lockedPlayerId) {
        const player = state.players.find(p => p.id === state.lockedPlayerId);
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

    // T120: Auto-reveal correct response if rule is enabled
    if (state.rules.showCorrectResponseOnBoard) {
      this.gameStateService.revealCorrectResponse();
    }

    // Close clue and reset buzzer
    this.gameStateService.clearActiveClue();
    this.gameStateService.resetBuzz();
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

    // Add to lockouts if rule is enabled
    if (state.rules.lockoutWrongResponder) {
      const newLockouts = new Set(state.lockedOutPlayerIds);
      newLockouts.add(player.id);
      this.gameStateService.setLockedOutPlayers(newLockouts);
    }

    // Reset buzzer to allow other players to buzz
    this.gameStateService.resetBuzz();
    this.gameStateService.enableBuzzer();
  }

  /**
   * Skip clue without penalty
   */
  protected skipClue(): void {
    this.gameStateService.clearActiveClue();
    this.gameStateService.resetBuzz();
  }
}
