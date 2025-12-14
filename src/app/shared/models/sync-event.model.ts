/**
 * Synchronization event models for BroadcastChannel communication
 */

import { Player } from './player.model';
import { RoundType } from './game-content.model';
import { ActiveClue, FinalJeopardyPhase, GameState } from './game-state.model';

/**
 * Base interface for BroadcastChannel messages
 */
export interface SyncEvent<T = unknown> {
  type: SyncEventType;
  timestamp: number;           // DOMHighResTimeStamp
  payload: T;
}

/**
 * Sync event type discriminator
 */
export type SyncEventType =
  | 'STATE_SYNC'                // Full state update
  | 'ROUND_CHANGED'             // Round transition
  | 'CLUE_SELECTED'             // Clue opened
  | 'CLUE_CLEARED'              // Return to board
  | 'BUZZ_ENABLED'              // Buzzer enabled/disabled
  | 'BUZZ_LOCKED'               // Someone buzzed in
  | 'BUZZ_RESET'                // Buzz cleared
  | 'SCORES_UPDATED'            // Score changes
  | 'BOARD_READY'               // Board requests sync
  | 'CORRECT_RESPONSE_REVEALED' // Answer shown
  | 'FINAL_PHASE_CHANGED'       // Final Jeopardy phase change
  | 'WINNER_ANNOUNCED';         // Game complete with winner

/**
 * Event payload interfaces
 */

export interface StateSyncPayload {
  gameState: GameState;
}

export interface BoardReadyPayload {
  requestSync: true;
  boardInstanceId: string;
}

export interface RoundChangedPayload {
  round: RoundType;
}

export interface ClueSelectedPayload {
  clue: ActiveClue;
}

export interface BuzzEnabledPayload {
  enabled: boolean;
}

export interface BuzzLockedPayload {
  playerId: string;
  playerName: string;
  timestamp: number;
}

export interface ScoresUpdatedPayload {
  players: Player[];
}

export interface CorrectResponseRevealedPayload {
  correctResponse: string;
}

export interface FinalPhaseChangedPayload {
  phase: FinalJeopardyPhase;
  data?: unknown;
}

export interface WinnerAnnouncedPayload {
  winnerId: string;
  winnerName: string;
  finalScore: number;
  allPlayers: Player[];
}

/**
 * Type guards for sync events
 */
export function isStateSyncEvent(event: SyncEvent): event is SyncEvent<StateSyncPayload> {
  return event.type === 'STATE_SYNC';
}

export function isBoardReadyEvent(event: SyncEvent): event is SyncEvent<BoardReadyPayload> {
  return event.type === 'BOARD_READY';
}

export function isClueSelectedEvent(event: SyncEvent): event is SyncEvent<ClueSelectedPayload> {
  return event.type === 'CLUE_SELECTED';
}

export function isBuzzLockedEvent(event: SyncEvent): event is SyncEvent<BuzzLockedPayload> {
  return event.type === 'BUZZ_LOCKED';
}
