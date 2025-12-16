/**
 * Wager calculation utilities for Daily Double and Final Jeopardy
 */

import { Player } from '../models/player.model';
import { GameState } from '../models/game-state.model';

/**
 * Get highest value on current board
 */
export function getHighestBoardValue(gameState: GameState): number {
  const round = gameState.currentRound;
  const values = round === 'round1' 
    ? gameState.rules.round1Values 
    : gameState.rules.round2Values;
  return Math.max(...values);
}

/**
 * Calculate Daily Double max wager
 * Min: $5 (standard Jeopardy rule)
 * Max: player score OR highest board value, whichever is greater
 */
export function getMaxDailyDoubleWager(player: Player, gameState: GameState): number {
  const highestBoardValue = getHighestBoardValue(gameState);
  return player.score > 0 
    ? Math.max(player.score, highestBoardValue)
    : highestBoardValue;
}

/**
 * Calculate Daily Double min wager
 */
export function getMinDailyDoubleWager(): number {
  return 5; // Standard Jeopardy minimum wager
}

/**
 * Calculate Final Jeopardy max wager
 * Max: player's current score (or 0 if negative)
 */
export function getMaxFinalWager(player: Player): number {
  return Math.max(0, player.score);
}

/**
 * Calculate Final Jeopardy min wager
 */
export function getMinFinalWager(): number {
  return 0; // Players can wager nothing
}

/**
 * Validate Daily Double wager is within allowed range
 */
export function isValidDailyDoubleWager(
  wager: number, 
  player: Player, 
  gameState: GameState
): boolean {
  const min = getMinDailyDoubleWager();
  const max = getMaxDailyDoubleWager(player, gameState);
  return wager >= min && wager <= max && Number.isInteger(wager);
}

/**
 * Validate Final Jeopardy wager is within allowed range
 */
export function isValidFinalWager(wager: number, player: Player): boolean {
  const min = getMinFinalWager();
  const max = getMaxFinalWager(player);
  return wager >= min && wager <= max && Number.isInteger(wager);
}
