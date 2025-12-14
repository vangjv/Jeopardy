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
import { Subscription } from 'rxjs';
import { generateUUID } from '../shared/utils/game-helpers';

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
export class BoardComponent implements OnInit, OnDestroy {
  protected readonly showClue = signal(false);
  protected readonly connectionStatus = signal<'connected' | 'disconnected' | 'connecting'>('connecting');
  
  private readonly boardInstanceId = generateUUID();
  private subscriptions: Subscription[] = [];
  private lastSyncTimestamp = 0;
  private connectionCheckInterval?: number;

  constructor(
    private readonly gameStateService: GameStateService,
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
        this.lastSyncTimestamp = performance.now();
        this.connectionStatus.set('connected');
      })
    );

    // Note: Individual event subscriptions (T046, T048, T050, T052, T054, T056)
    // are not needed because all state updates come through onStateSync() above.
    // Child components (ClueDisplayComponent, BuzzIndicatorComponent, ScoreDisplayComponent)
    // subscribe to GameStateService.getState() to render the synchronized state.

    // Subscribe to game state for local display updates
    this.subscriptions.push(
      this.gameStateService.getState().subscribe(state => {
        // Show clue display if there's an active clue
        this.showClue.set(state.activeClue !== null);
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
}
