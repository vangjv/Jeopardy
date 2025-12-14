/**
 * SyncService - Manages BroadcastChannel communication between host and board
 */

import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import {
  SyncEvent,
  SyncEventType,
  StateSyncPayload,
  BoardReadyPayload,
  RoundChangedPayload,
  ClueSelectedPayload,
  BuzzEnabledPayload,
  BuzzLockedPayload,
  ScoresUpdatedPayload,
  CorrectResponseRevealedPayload,
  FinalPhaseChangedPayload,
  WinnerAnnouncedPayload,
} from '../models/sync-event.model';
import { GameState, FinalJeopardyPhase, ActiveClue } from '../models/game-state.model';
import { Player } from '../models/player.model';
import { RoundType } from '../models/game-content.model';

@Injectable({
  providedIn: 'root'
})
export class SyncService {
  private readonly CHANNEL_NAME = 'jeopardy-sync';
  private channel: BroadcastChannel | null = null;
  private role: 'host' | 'board' | null = null;
  private eventSubject = new Subject<SyncEvent>();

  constructor() {}

  /**
   * Initialize sync service with role
   */
  initialize(role: 'host' | 'board'): void {
    this.role = role;
    
    try {
      this.channel = new BroadcastChannel(this.CHANNEL_NAME);
      
      this.channel.onmessage = (event: MessageEvent) => {
        this.handleMessage(event.data);
      };

      this.channel.onmessageerror = (event: MessageEvent) => {
        console.error('BroadcastChannel message error:', event);
      };
      
      console.log(`SyncService initialized as ${role}`);
    } catch (error) {
      console.error('Failed to create BroadcastChannel:', error);
      // TODO: Implement postMessage fallback for unsupported browsers
    }
  }

  /**
   * Clean up channel on service destruction
   */
  destroy(): void {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    this.eventSubject.complete();
  }

  /**
   * Handle incoming message
   */
  private handleMessage(event: SyncEvent): void {
    this.eventSubject.next(event);
  }

  /**
   * Send sync event
   */
  private sendEvent<T>(type: SyncEventType, payload: T): void {
    if (!this.channel) {
      console.warn('Cannot send event: BroadcastChannel not initialized');
      return;
    }

    const event: SyncEvent<T> = {
      type,
      timestamp: performance.now(),
      payload,
    };

    try {
      this.channel.postMessage(event);
    } catch (error) {
      console.error('Failed to send sync event:', error);
    }
  }

  /**
   * Get observable for specific event type
   */
  private getEventObservable<T>(eventType: SyncEventType): Observable<T> {
    return this.eventSubject.pipe(
      filter(event => event.type === eventType),
      map(event => event.payload as T)
    );
  }

  // ========== Publishing Methods (Host) ==========

  /**
   * Broadcast full state sync
   */
  broadcastStateSync(gameState: GameState): void {
    this.sendEvent<StateSyncPayload>('STATE_SYNC', { gameState });
  }

  /**
   * Broadcast clue selected
   */
  broadcastClueSelected(clue: ActiveClue): void {
    this.sendEvent<ClueSelectedPayload>('CLUE_SELECTED', { clue });
  }

  /**
   * Broadcast clue cleared (return to board)
   */
  broadcastClueCleared(): void {
    this.sendEvent('CLUE_CLEARED', {});
  }

  /**
   * Broadcast buzzer enabled/disabled
   */
  broadcastBuzzEnabled(enabled: boolean): void {
    this.sendEvent<BuzzEnabledPayload>('BUZZ_ENABLED', { enabled });
  }

  /**
   * Broadcast buzz locked
   */
  broadcastBuzzLocked(playerId: string, playerName: string, timestamp: number): void {
    this.sendEvent<BuzzLockedPayload>('BUZZ_LOCKED', { playerId, playerName, timestamp });
  }

  /**
   * Broadcast buzz reset
   */
  broadcastBuzzReset(): void {
    this.sendEvent('BUZZ_RESET', {});
  }

  /**
   * Broadcast scores updated
   */
  broadcastScoresUpdated(players: Player[]): void {
    this.sendEvent<ScoresUpdatedPayload>('SCORES_UPDATED', { players });
  }

  /**
   * Broadcast correct response revealed
   */
  broadcastCorrectResponseRevealed(correctResponse: string): void {
    this.sendEvent<CorrectResponseRevealedPayload>('CORRECT_RESPONSE_REVEALED', { correctResponse });
  }

  /**
   * Broadcast round changed
   */
  broadcastRoundChanged(round: RoundType): void {
    this.sendEvent<RoundChangedPayload>('ROUND_CHANGED', { round });
  }

  /**
   * Broadcast Final Jeopardy phase changed
   */
  broadcastFinalPhaseChanged(phase: FinalJeopardyPhase, data?: unknown): void {
    this.sendEvent<FinalPhaseChangedPayload>('FINAL_PHASE_CHANGED', { phase, data });
  }

  /**
   * Broadcast winner announced
   */
  broadcastWinnerAnnounced(
    winnerId: string, 
    winnerName: string, 
    finalScore: number, 
    allPlayers: Player[]
  ): void {
    this.sendEvent<WinnerAnnouncedPayload>('WINNER_ANNOUNCED', { 
      winnerId, 
      winnerName, 
      finalScore, 
      allPlayers 
    });
  }

  /**
   * Request sync from host (Board sends this)
   */
  requestStateSync(boardInstanceId: string): void {
    this.sendEvent<BoardReadyPayload>('BOARD_READY', { 
      requestSync: true, 
      boardInstanceId 
    });
  }

  // ========== Subscription Methods (Board) ==========

  /**
   * Subscribe to state sync events
   */
  onStateSync(): Observable<GameState> {
    return this.getEventObservable<StateSyncPayload>('STATE_SYNC').pipe(
      map(payload => payload.gameState)
    );
  }

  /**
   * Subscribe to board ready requests (Host listens for this)
   */
  onBoardReady(): Observable<BoardReadyPayload> {
    return this.getEventObservable<BoardReadyPayload>('BOARD_READY');
  }

  /**
   * Subscribe to clue selected events
   */
  onClueSelected(): Observable<ActiveClue> {
    return this.getEventObservable<ClueSelectedPayload>('CLUE_SELECTED').pipe(
      map(payload => payload.clue)
    );
  }

  /**
   * Subscribe to clue cleared events
   */
  onClueCleared(): Observable<void> {
    return this.getEventObservable('CLUE_CLEARED').pipe(
      map(() => undefined)
    );
  }

  /**
   * Subscribe to buzzer enabled events
   */
  onBuzzEnabled(): Observable<boolean> {
    return this.getEventObservable<BuzzEnabledPayload>('BUZZ_ENABLED').pipe(
      map(payload => payload.enabled)
    );
  }

  /**
   * Subscribe to buzz locked events
   */
  onBuzzLocked(): Observable<{ playerId: string; playerName: string; timestamp: number }> {
    return this.getEventObservable<BuzzLockedPayload>('BUZZ_LOCKED');
  }

  /**
   * Subscribe to buzz reset events
   */
  onBuzzReset(): Observable<void> {
    return this.getEventObservable('BUZZ_RESET').pipe(
      map(() => undefined)
    );
  }

  /**
   * Subscribe to scores updated events
   */
  onScoresUpdated(): Observable<Player[]> {
    return this.getEventObservable<ScoresUpdatedPayload>('SCORES_UPDATED').pipe(
      map(payload => payload.players)
    );
  }

  /**
   * Subscribe to correct response revealed events
   */
  onCorrectResponseRevealed(): Observable<string> {
    return this.getEventObservable<CorrectResponseRevealedPayload>('CORRECT_RESPONSE_REVEALED').pipe(
      map(payload => payload.correctResponse)
    );
  }

  /**
   * Subscribe to round changed events
   */
  onRoundChanged(): Observable<RoundType> {
    return this.getEventObservable<RoundChangedPayload>('ROUND_CHANGED').pipe(
      map(payload => payload.round)
    );
  }

  /**
   * Subscribe to Final Jeopardy phase changed events
   */
  onFinalPhaseChanged(): Observable<FinalPhaseChangedPayload> {
    return this.getEventObservable<FinalPhaseChangedPayload>('FINAL_PHASE_CHANGED');
  }

  /**
   * Subscribe to winner announced events
   */
  onWinnerAnnounced(): Observable<WinnerAnnouncedPayload> {
    return this.getEventObservable<WinnerAnnouncedPayload>('WINNER_ANNOUNCED');
  }
}
