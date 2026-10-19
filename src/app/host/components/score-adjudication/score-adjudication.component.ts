/**
 * ScoreAdjudicationComponent - Score adjudication controls
 * Provides correct/incorrect buttons for host to update player scores
 */

import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { GameStateService } from '../../../shared/services/game-state.service';
import { AudioService } from '../../../shared/services/audio.service';
import { Player } from '../../../shared/models/player.model';
import { GameState } from '../../../shared/models/game-state.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-score-adjudication',
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule],
  templateUrl: './score-adjudication.component.html',
  styleUrl: './score-adjudication.component.scss'
})
export class ScoreAdjudicationComponent implements OnInit, OnDestroy {
  private stateSubscription?: Subscription;
  private responseTimeout: ReturnType<typeof setTimeout> | null = null;
  private responseTimeoutKey: string | null = null;
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

  constructor(
    private readonly gameStateService: GameStateService,
    private readonly audioService: AudioService,
  ) {}

  ngOnInit(): void {
    this.stateSubscription = this.gameStateService.getState().subscribe(state => {
      this.updateResponseTimeout(state);
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

  ngOnDestroy(): void {
    this.clearResponseTimeout();
    this.stateSubscription?.unsubscribe();
  }

  /**
   * Mark response as correct
   */
  protected markCorrect(): void {
    const player = this.lockedPlayer();
    const clue = this.activeClue();
    const state = this.gameStateService.getCurrentState();

    if (!player || !clue) return;

    this.audioService.play('correct');

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

    this.audioService.play('incorrect');

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

      // Nobody is left to buzz, so close the clue instead of waiting forever.
      if (state.players.length > 0 && state.players.every(p => newLockouts.has(p.id))) {
        if (state.rules.showCorrectResponseOnBoard) {
          this.gameStateService.revealCorrectResponse();
        }
        this.gameStateService.clearActiveClue();
        return;
      }
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

  /**
   * Clear lockouts and reopen buzzing for the active clue
   */
  protected resetClue(): void {
    this.gameStateService.resetClue();
  }

  private updateResponseTimeout(state: GameState): void {
    const activeClue = state.activeClue;
    const timeoutSeconds = state.rules.responseTimeoutSeconds;
    const playerId = state.lockedPlayerId;
    const timeoutKey =
      activeClue &&
      !activeClue.isDailyDouble &&
      state.buzzLocked &&
      playerId &&
      timeoutSeconds !== null &&
      timeoutSeconds > 0
        ? `${activeClue.clue.id}:${playerId}:${timeoutSeconds}`
        : null;

    if (timeoutKey === this.responseTimeoutKey) {
      return;
    }

    this.clearResponseTimeout();
    if (!timeoutKey || !activeClue || !playerId || timeoutSeconds === null) {
      return;
    }

    this.responseTimeoutKey = timeoutKey;
    const clueId = activeClue.clue.id;
    this.responseTimeout = setTimeout(() => {
      this.responseTimeout = null;

      const currentState = this.gameStateService.getCurrentState();
      if (
        currentState.activeClue?.clue.id === clueId &&
        !currentState.activeClue.isDailyDouble &&
        currentState.buzzLocked &&
        currentState.lockedPlayerId === playerId &&
        currentState.rules.responseTimeoutSeconds === timeoutSeconds
      ) {
        this.markIncorrect();
      }
    }, timeoutSeconds * 1000);
  }

  private clearResponseTimeout(): void {
    if (this.responseTimeout !== null) {
      clearTimeout(this.responseTimeout);
      this.responseTimeout = null;
    }
    this.responseTimeoutKey = null;
  }
}
