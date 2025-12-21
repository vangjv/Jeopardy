/**
 * BoardComponent - Main container for board display interface
 */

import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStateService } from '../shared/services/game-state.service';
import { SyncService } from '../shared/services/sync.service';
import { ClueBoardComponent } from './components/clue-board/clue-board.component';
import { ClueDisplayComponent } from './components/clue-display/clue-display.component';
import { ScoreDisplayComponent } from './components/score-display/score-display.component';
import { BuzzIndicatorComponent } from './components/buzz-indicator/buzz-indicator.component';
import { RoundTransitionComponent } from './components/round-transition/round-transition.component';
import { FinalJeopardyDisplayComponent } from './components/final-jeopardy-display/final-jeopardy-display.component';
import { RoundType } from '../shared/models/game-content.model';
import { ActiveClue, GameState } from '../shared/models/game-state.model';
import { Subscription } from 'rxjs';
import { generateUUID } from '../shared/utils/game-helpers';

@Component({
  selector: 'app-board',
  imports: [
    CommonModule,
    ClueBoardComponent,
    ClueDisplayComponent,
    ScoreDisplayComponent,
    BuzzIndicatorComponent,
    RoundTransitionComponent,
    FinalJeopardyDisplayComponent
  ],
  templateUrl: './board.component.html',
  styleUrl: './board.component.scss'
})
export class BoardComponent implements OnInit, OnDestroy {
  protected readonly showClue = signal(false);
  protected readonly showRoundTransition = signal(false);
  protected readonly showFinalJeopardy = signal(false);
  protected readonly currentRound = signal<RoundType>('round1');
  protected readonly connectionStatus = signal<'connected' | 'disconnected' | 'connecting'>('connecting');

  private readonly boardInstanceId = generateUUID();
  private subscriptions: Subscription[] = [];
  private lastSyncTimestamp = 0;
  private connectionCheckInterval?: number;

  constructor(
    protected readonly gameStateService: GameStateService,
    private readonly syncService: SyncService
  ) {}

  ngOnInit(): void {
    // Initialize SyncService as board (T041)
    this.syncService.initialize('board');

    // Request initial state sync (T058)
    this.syncService.requestStateSync(this.boardInstanceId);

    // Subscribe to state sync events (T044)
    this.subscriptions.push(
      this.syncService.onStateSync().subscribe(gameState => {
        this.gameStateService.loadState(gameState);
        this.markConnected();
      })
    );

    // Buzzer + clue events: patch local state immediately for low-latency UI
    this.subscriptions.push(
      this.syncService.onBuzzEnabled().subscribe(enabled => {
        const state = this.gameStateService.getCurrentState();
        this.applyPatch({
          buzzerEnabled: enabled,
          buzzLocked: enabled ? false : state.buzzLocked,
          lockedPlayerId: enabled ? null : state.lockedPlayerId,
        });
      })
    );

    this.subscriptions.push(
      this.syncService.onBuzzLocked().subscribe(({ playerId }) => {
        this.applyPatch({
          buzzLocked: true,
          lockedPlayerId: playerId,
          buzzerEnabled: false,
        });
      })
    );

    this.subscriptions.push(
      this.syncService.onBuzzReset().subscribe(() => {
        this.applyPatch({
          buzzLocked: false,
          lockedPlayerId: null,
          buzzerEnabled: true,
        });
      })
    );

    this.subscriptions.push(
      this.syncService.onClueSelected().subscribe((clue: ActiveClue) => {
        this.applyPatch({
          activeClue: clue,
          buzzerEnabled: !clue.isDailyDouble,
          buzzLocked: false,
          lockedPlayerId: null,
          lockedOutPlayerIds: new Set<string>(),
        });
      })
    );

    this.subscriptions.push(
      this.syncService.onClueCleared().subscribe(() => {
        this.applyPatch({
          activeClue: null,
          buzzerEnabled: false,
          buzzLocked: false,
          lockedPlayerId: null,
          lockedOutPlayerIds: new Set<string>(),
        });
      })
    );

    this.subscriptions.push(
      this.syncService.onScoresUpdated().subscribe(players => {
        this.applyPatch({ players });
      })
    );

    // T090: Subscribe to onRoundChanged() to show transition
    this.subscriptions.push(
      this.syncService.onRoundChanged().subscribe(round => {
        this.currentRound.set(round);
        this.showRoundTransition.set(true);

        // Hide transition after 3 seconds
        setTimeout(() => {
          this.showRoundTransition.set(false);
        }, 3000);
      })
    );

    // Subscribe to game state for local display updates
    this.subscriptions.push(
      this.gameStateService.getState().subscribe(state => {
        // Show clue display if there's an active clue
        this.showClue.set(state.activeClue !== null);

        // T092: Update current round indicator
        this.currentRound.set(state.currentRound);

        // T107: Show Final Jeopardy display if in Final Jeopardy phase
        this.showFinalJeopardy.set(
          state.currentRound === 'final' &&
          state.finalJeopardyState !== null
        );
      })
    );

    // T107: Subscribe to Final Phase Changed events
    this.subscriptions.push(
      this.syncService.onFinalPhaseChanged().subscribe(() => {
        // State is already updated via onStateSync, just ensure display is shown
        const state = this.gameStateService.getCurrentState();
        this.showFinalJeopardy.set(state.finalJeopardyState !== null);
      })
    );

    // T112: Subscribe to Winner Announced events
    this.subscriptions.push(
      this.syncService.onWinnerAnnounced().subscribe(() => {
        // Winner display is handled by FinalJeopardyDisplayComponent
        // which subscribes to game state
      })
    );

    // Start connection health monitoring (T060)
    this.startConnectionMonitoring();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.syncService.destroy();
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
    }
  }

  /**
   * Monitor connection health and handle reconnection (T059, T060)
   */
  private startConnectionMonitoring(): void {
    this.connectionCheckInterval = setInterval(() => {
      const timeSinceLastSync = performance.now() - this.lastSyncTimestamp;

      // If no sync in 5 seconds during active game, mark as disconnected
      if (timeSinceLastSync > 5000 && this.lastSyncTimestamp > 0) {
        this.connectionStatus.set('disconnected');

        // Try to reconnect
        this.syncService.requestStateSync(this.boardInstanceId);

        // If no response after 2 more seconds, stay disconnected
        setTimeout(() => {
          const newTimeSinceLastSync = performance.now() - this.lastSyncTimestamp;
          if (newTimeSinceLastSync > 7000) {
            this.connectionStatus.set('disconnected');
          }
        }, 2000);
      }
    }, 1000);
  }

  /**
   * Apply a partial state update locally to minimize perceived latency.
   */
  private applyPatch(patch: Partial<GameState>): void {
    const current = this.gameStateService.getCurrentState();
    this.gameStateService.loadState({ ...current, ...patch });
    this.markConnected();
  }

  /**
   * Mark the board as connected and refresh last sync timestamp.
   */
  private markConnected(): void {
    this.lastSyncTimestamp = performance.now();
    this.connectionStatus.set('connected');
  }
}
