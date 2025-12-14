/**
 * GameStateService - Manages authoritative game state
 * Host owns this state, board receives synchronized copies
 */

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { GameState, GamePhase, GameRules, DEFAULT_GAME_RULES, ActiveClue, FinalJeopardyState } from '../models/game-state.model';
import { Player } from '../models/player.model';
import { GameSet, RoundType, Clue } from '../models/game-content.model';
import { ValidationResult } from '../models/validation.model';
import { generateUUID, getWinner, isRoundComplete } from '../utils/game-helpers';

@Injectable({
  providedIn: 'root'
})
export class GameStateService {
  private stateSubject: BehaviorSubject<GameState>;
  public state$: Observable<GameState>;

  constructor() {
    // Initialize with default empty state
    const initialState = this.createInitialState();
    this.stateSubject = new BehaviorSubject<GameState>(initialState);
    this.state$ = this.stateSubject.asObservable();
  }

  /**
   * Create initial empty game state
   */
  private createInitialState(): GameState {
    return {
      sessionId: generateUUID(),
      createdAt: new Date(),
      phase: 'setup',
      players: [],
      controlPlayerId: null,
      gameSet: null,
      currentRound: 'round1',
      usedClueIds: new Set<string>(),
      buzzerEnabled: false,
      buzzLocked: false,
      lockedPlayerId: null,
      lockedOutPlayerIds: new Set<string>(),
      activeClue: null,
      dailyDoubleWager: null,
      finalJeopardyState: null,
      rules: { ...DEFAULT_GAME_RULES },
      winnerId: null,
    };
  }

  /**
   * Get current state snapshot
   */
  getCurrentState(): GameState {
    return this.stateSubject.value;
  }

  /**
   * Get state as observable
   */
  getState(): Observable<GameState> {
    return this.state$;
  }

  /**
   * Update state and emit to subscribers
   */
  private updateState(updater: (state: GameState) => Partial<GameState>): void {
    const currentState = this.getCurrentState();
    const updates = updater(currentState);
    const newState = { ...currentState, ...updates };
    this.stateSubject.next(newState);
  }

  // ========== Game Lifecycle ==========

  /**
   * Initialize game with players and content
   */
  initializeGame(players: Player[], gameSet: GameSet, rules?: Partial<GameRules>): void {
    this.updateState(() => ({
      sessionId: generateUUID(),
      createdAt: new Date(),
      phase: 'round1',
      players,
      controlPlayerId: players[0]?.id || null,
      gameSet,
      currentRound: 'round1',
      usedClueIds: new Set<string>(),
      buzzerEnabled: false,
      buzzLocked: false,
      lockedPlayerId: null,
      lockedOutPlayerIds: new Set<string>(),
      activeClue: null,
      dailyDoubleWager: null,
      finalJeopardyState: null,
      rules: { ...DEFAULT_GAME_RULES, ...rules },
      winnerId: null,
    }));
  }

  /**
   * Start a specific round
   */
  startRound(round: RoundType): void {
    this.updateState(() => ({
      phase: round as GamePhase,
      currentRound: round,
      usedClueIds: new Set<string>(),
      activeClue: null,
      buzzerEnabled: false,
      buzzLocked: false,
      lockedPlayerId: null,
      lockedOutPlayerIds: new Set<string>(),
    }));
  }

  /**
   * Advance to next round
   */
  advanceRound(): void {
    const state = this.getCurrentState();
    if (state.currentRound === 'round1') {
      this.startRound('round2');
    } else if (state.currentRound === 'round2') {
      this.startFinalJeopardy();
    }
  }

  /**
   * End game and determine winner
   */
  endGame(): void {
    const state = this.getCurrentState();
    const winner = getWinner(state.players);
    this.updateState(() => ({
      phase: 'complete',
      winnerId: winner?.id || null,
    }));
  }

  // ========== Player Management ==========

  /**
   * Add a new player
   */
  addPlayer(playerData: Omit<Player, 'id'>): string {
    const playerId = generateUUID();
    const player: Player = { id: playerId, ...playerData };
    
    const state = this.getCurrentState();
    const players = [...state.players, player];
    
    this.updateState(() => ({ players }));
    
    // Set as control player if first player
    if (players.length === 1) {
      this.setControlPlayer(playerId);
    }
    
    return playerId;
  }

  /**
   * Remove a player
   */
  removePlayer(playerId: string): void {
    const state = this.getCurrentState();
    const players = state.players.filter(p => p.id !== playerId);
    
    let updates: Partial<GameState> = { players };
    
    // Update control player if removed
    if (state.controlPlayerId === playerId) {
      updates.controlPlayerId = players[0]?.id || null;
    }
    
    this.updateState(() => updates);
  }

  /**
   * Update player properties
   */
  updatePlayer(playerId: string, updates: Partial<Omit<Player, 'id'>>): void {
    const state = this.getCurrentState();
    const players = state.players.map(p => 
      p.id === playerId ? { ...p, ...updates } : p
    );
    this.updateState(() => ({ players }));
  }

  /**
   * Update player score by delta
   */
  updatePlayerScore(playerId: string, delta: number): void {
    const state = this.getCurrentState();
    const players = state.players.map(p => 
      p.id === playerId ? { ...p, score: p.score + delta } : p
    );
    this.updateState(() => ({ players }));
  }

  /**
   * Set player score to absolute value
   */
  setPlayerScore(playerId: string, score: number): void {
    const state = this.getCurrentState();
    const players = state.players.map(p => 
      p.id === playerId ? { ...p, score } : p
    );
    this.updateState(() => ({ players }));
  }

  /**
   * Set control player (who selects next clue)
   */
  setControlPlayer(playerId: string | null): void {
    this.updateState(() => ({ controlPlayerId: playerId }));
  }

  // ========== Clue Management ==========

  /**
   * Select and display a clue
   */
  selectClue(categoryId: string, clueId: string): void {
    const state = this.getCurrentState();
    
    if (!state.gameSet) {
      console.error('No game set loaded');
      return;
    }

    const round = state.gameSet[state.currentRound];
    if (!round || state.currentRound === 'final') {
      console.error('Invalid round');
      return;
    }

    // Type guard to ensure we have a regular round, not FinalRound
    if (!('categories' in round)) {
      console.error('Invalid round type');
      return;
    }

    // Find the clue
    let foundClue: Clue | null = null;
    let categoryTitle = '';
    
    for (const category of round.categories) {
      if (category.id === categoryId) {
        categoryTitle = category.title;
        foundClue = category.clues.find((c: Clue) => c.id === clueId) || null;
        break;
      }
    }

    if (!foundClue) {
      console.error('Clue not found');
      return;
    }

    const activeClue: ActiveClue = {
      clue: foundClue,
      categoryTitle,
      revealed: false,
      startTime: performance.now(),
      isDailyDouble: foundClue.dailyDouble,
    };

    this.updateState(() => ({ 
      activeClue,
      buzzerEnabled: !foundClue!.dailyDouble, // Enable buzzer unless Daily Double
      buzzLocked: false,
      lockedPlayerId: null,
      lockedOutPlayerIds: new Set<string>(),
    }));
  }

  /**
   * Mark a clue as used
   */
  markClueUsed(clueId: string): void {
    const state = this.getCurrentState();
    const usedClueIds = new Set(state.usedClueIds);
    usedClueIds.add(clueId);
    this.updateState(() => ({ usedClueIds }));
  }

  /**
   * Clear active clue and return to board
   */
  clearActiveClue(): void {
    this.updateState(() => ({ 
      activeClue: null,
      buzzerEnabled: false,
      buzzLocked: false,
      lockedPlayerId: null,
      lockedOutPlayerIds: new Set<string>(),
      dailyDoubleWager: null,
    }));
  }

  /**
   * Reveal correct response
   */
  revealCorrectResponse(): void {
    const state = this.getCurrentState();
    if (state.activeClue) {
      const activeClue = { ...state.activeClue, revealed: true };
      this.updateState(() => ({ activeClue }));
    }
  }

  // ========== Buzzer Management ==========

  /**
   * Enable buzzer
   */
  enableBuzzer(): void {
    this.updateState(() => ({ 
      buzzerEnabled: true,
      buzzLocked: false,
      lockedPlayerId: null,
    }));
  }

  /**
   * Disable buzzer
   */
  disableBuzzer(): void {
    this.updateState(() => ({ buzzerEnabled: false }));
  }

  /**
   * Lock buzz for a player
   */
  lockBuzz(playerId: string, timestamp: number): void {
    const state = this.getCurrentState();
    
    // Check if player is locked out
    if (state.lockedOutPlayerIds.has(playerId)) {
      return;
    }
    
    this.updateState(() => ({ 
      buzzLocked: true,
      lockedPlayerId: playerId,
      buzzerEnabled: false,
    }));
  }

  /**
   * Reset buzz state
   */
  resetBuzz(): void {
    this.updateState(() => ({ 
      buzzLocked: false,
      lockedPlayerId: null,
      buzzerEnabled: true,
    }));
  }

  /**
   * Add player to lockout list
   */
  addLockout(playerId: string): void {
    const state = this.getCurrentState();
    const lockedOutPlayerIds = new Set(state.lockedOutPlayerIds);
    lockedOutPlayerIds.add(playerId);
    this.updateState(() => ({ 
      lockedOutPlayerIds,
      buzzLocked: false,
      lockedPlayerId: null,
      buzzerEnabled: true,
    }));
  }

  /**
   * Clear all lockouts
   */
  clearLockouts(): void {
    this.updateState(() => ({ 
      lockedOutPlayerIds: new Set<string>(),
    }));
  }

  /**
   * Set locked-out players
   */
  setLockedOutPlayers(playerIds: Set<string>): void {
    this.updateState(() => ({ 
      lockedOutPlayerIds: playerIds,
    }));
  }

  // ========== Daily Double ==========

  /**
   * Set Daily Double wager
   */
  setDailyDoubleWager(wager: number): void {
    this.updateState(() => ({ 
      dailyDoubleWager: wager,
      buzzerEnabled: true, // Enable buzzer after wager set
    }));
  }

  /**
   * Validate Daily Double wager (placeholder - actual validation in ValidationService)
   */
  validateDailyDoubleWager(playerId: string, wager: number): ValidationResult {
    // This would delegate to ValidationService in real implementation
    return { valid: true, errors: [] };
  }

  // ========== Final Jeopardy ==========

  /**
   * Start Final Jeopardy
   */
  startFinalJeopardy(): void {
    this.updateState(() => ({
      phase: 'final-category',
      currentRound: 'final',
      finalJeopardyState: {
        phase: 'category-reveal',
        wagers: new Map<string, number>(),
        responses: new Map<string, string>(),
        adjudications: new Map<string, boolean>(),
      },
    }));
  }

  /**
   * Set Final Jeopardy wager for a player
   */
  setFinalWager(playerId: string, wager: number): void {
    const state = this.getCurrentState();
    if (!state.finalJeopardyState) return;

    const wagers = new Map(state.finalJeopardyState.wagers);
    wagers.set(playerId, wager);

    this.updateState(() => ({
      finalJeopardyState: {
        ...state.finalJeopardyState!,
        wagers,
      },
    }));
  }

  /**
   * Set Final Jeopardy response for a player
   */
  setFinalResponse(playerId: string, response: string): void {
    const state = this.getCurrentState();
    if (!state.finalJeopardyState) return;

    const responses = new Map(state.finalJeopardyState.responses);
    responses.set(playerId, response);

    this.updateState(() => ({
      finalJeopardyState: {
        ...state.finalJeopardyState!,
        responses,
      },
    }));
  }

  /**
   * Adjudicate Final Jeopardy response
   */
  adjudicateFinalResponse(playerId: string, correct: boolean): void {
    const state = this.getCurrentState();
    if (!state.finalJeopardyState) return;

    const adjudications = new Map(state.finalJeopardyState.adjudications);
    adjudications.set(playerId, correct);

    // Update player's final correct status
    const players = state.players.map(p => {
      if (p.id === playerId) {
        return { ...p, finalCorrect: correct };
      }
      return p;
    });

    // Apply score change based on wager
    const wager = state.finalJeopardyState.wagers.get(playerId) || 0;
    const scoreDelta = correct ? wager : -wager;
    
    const updatedPlayers = players.map(p => {
      if (p.id === playerId) {
        return { ...p, score: p.score + scoreDelta };
      }
      return p;
    });

    this.updateState(() => ({
      players: updatedPlayers,
      finalJeopardyState: {
        ...state.finalJeopardyState!,
        adjudications,
      },
    }));
  }

  /**
   * Validate Final Jeopardy wager (placeholder)
   */
  validateFinalWager(playerId: string, wager: number): ValidationResult {
    return { valid: true, errors: [] };
  }

  // ========== Rules Management ==========

  /**
   * Update game rules
   */
  updateRules(rules: Partial<GameRules>): void {
    const state = this.getCurrentState();
    this.updateState(() => ({
      rules: { ...state.rules, ...rules },
    }));
  }

  /**
   * Get current rules
   */
  getRules(): GameRules {
    return this.getCurrentState().rules;
  }

  // ========== Utility ==========

  /**
   * Check if current round is complete
   */
  isRoundComplete(): boolean {
    return isRoundComplete(this.getCurrentState());
  }

  /**
   * Get winner
   */
  getWinner(): Player | null {
    return getWinner(this.getCurrentState().players);
  }

  /**
   * Export game state as JSON
   */
  exportGameState(): string {
    const state = this.getCurrentState();
    // Convert Sets to Arrays for JSON serialization
    const exportState = {
      ...state,
      usedClueIds: Array.from(state.usedClueIds),
      lockedOutPlayerIds: Array.from(state.lockedOutPlayerIds),
      finalJeopardyState: state.finalJeopardyState ? {
        ...state.finalJeopardyState,
        wagers: Array.from(state.finalJeopardyState.wagers.entries()),
        responses: Array.from(state.finalJeopardyState.responses.entries()),
        adjudications: Array.from(state.finalJeopardyState.adjudications.entries()),
      } : null,
    };
    return JSON.stringify(exportState, null, 2);
  }

  /**
   * Import game state from JSON
   */
  importGameState(json: string): ValidationResult {
    try {
      const importedState = JSON.parse(json);
      
      // Convert Arrays back to Sets
      const state: GameState = {
        ...importedState,
        usedClueIds: new Set(importedState.usedClueIds || []),
        lockedOutPlayerIds: new Set(importedState.lockedOutPlayerIds || []),
        finalJeopardyState: importedState.finalJeopardyState ? {
          ...importedState.finalJeopardyState,
          wagers: new Map(importedState.finalJeopardyState.wagers || []),
          responses: new Map(importedState.finalJeopardyState.responses || []),
          adjudications: new Map(importedState.finalJeopardyState.adjudications || []),
        } : null,
      };
      
      this.stateSubject.next(state);
      return { valid: true, errors: [] };
    } catch (error) {
      return {
        valid: false,
        errors: [{
          path: '/',
          message: `Failed to parse JSON: ${error}`,
          code: 'PARSE_ERROR',
          severity: 'error',
        }],
      };
    }
  }
}
