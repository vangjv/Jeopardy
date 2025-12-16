/**
 * Helper functions for game logic
 */

import { Player } from '../models/player.model';
import { GameState } from '../models/game-state.model';

/**
 * Determine current leader by score
 */
export function getLeader(players: Player[]): Player | null {
  if (players.length === 0) return null;
  return players.reduce((leader, player) => 
    player.score > leader.score ? player : leader
  );
}

/**
 * Get player by ID
 */
export function getPlayerById(players: Player[], playerId: string): Player | null {
  return players.find(p => p.id === playerId) || null;
}

/**
 * Check if all clues in current round are used
 */
export function isRoundComplete(gameState: GameState): boolean {
  const currentRound = gameState.gameSet?.[gameState.currentRound];
  if (!currentRound || gameState.currentRound === 'final') return false;
  
  // Type guard to ensure we have a regular round with categories
  if (!('categories' in currentRound)) return false;
  
  const totalClues = currentRound.categories.length * 5; // 6 categories × 5 clues
  return gameState.usedClueIds.size >= totalClues;
}

/**
 * Calculate final scores including Final Jeopardy wagers
 */
export function calculateFinalScores(players: Player[]): Player[] {
  return players.map(player => {
    if (player.finalWager !== undefined && player.finalCorrect !== undefined) {
      const wagerDelta = player.finalCorrect ? player.finalWager : -player.finalWager;
      return { ...player, score: player.score + wagerDelta };
    }
    return player;
  });
}

/**
 * Determine winner from player list
 */
export function getWinner(players: Player[]): Player | null {
  if (players.length === 0) return null;
  
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const topScore = sortedPlayers[0].score;
  
  // Check for tie
  const winners = sortedPlayers.filter(p => p.score === topScore);
  if (winners.length > 1) {
    // In case of tie, return first player (host decides)
    return winners[0];
  }
  
  return sortedPlayers[0];
}

/**
 * Generate a simple UUID (for browser environments without crypto.randomUUID)
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback UUID generation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Check if buzzer keys are unique across all players
 */
export function hasUniqueBuzzerKeys(players: Player[]): boolean {
  const keys = players.map(p => p.buzzerKey);
  return new Set(keys).size === keys.length;
}

/**
 * Validate player count is within allowed range (2-3)
 */
export function isValidPlayerCount(count: number): boolean {
  return count >= 2 && count <= 3;
}
