/**
 * Type guard utility functions
 */

import { GamePhase } from '../models/game-state.model';
import { RoundType, Round, FinalRound } from '../models/game-content.model';

/**
 * Check if value is a valid game phase
 */
export function isValidGamePhase(phase: string): phase is GamePhase {
  return ['setup', 'round1', 'round2', 'final-category', 'final-wager', 
          'final-clue', 'final-response', 'final-reveal', 'complete']
    .includes(phase);
}

/**
 * Check if current phase is a playing round (round1 or round2)
 */
export function isPlayingRound(phase: GamePhase): boolean {
  return phase === 'round1' || phase === 'round2';
}

/**
 * Check if current phase is any Final Jeopardy phase
 */
export function isFinalJeopardy(phase: GamePhase): boolean {
  return phase.startsWith('final-');
}

/**
 * Check if value is a valid round type
 */
export function isValidRoundType(round: string): round is RoundType {
  return ['round1', 'round2', 'final'].includes(round);
}

/**
 * Check if a round object is a regular Round (not FinalRound)
 */
export function isRound(round: Round | FinalRound): round is Round {
  return 'categories' in round;
}

/**
 * Check if a string is a valid keyboard event code
 */
export function isValidKeyboardCode(code: string): boolean {
  // Basic validation - starts with Key, Digit, Space, or special keys
  return /^(Key[A-Z]|Digit[0-9]|Space|Enter|Arrow(Up|Down|Left|Right))$/.test(code);
}

/**
 * Check if a string is a valid hex color
 */
export function isValidHexColor(color: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}

/**
 * Check if a value is a positive integer
 */
export function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

/**
 * Check if a value is a non-negative integer
 */
export function isNonNegativeInteger(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}
