/**
 * Game state models representing the complete game state
 */

import { Player } from './player.model';
import { GameSet, RoundType, Clue } from './game-content.model';

/**
 * Root state object managed by GameStateService
 * Host owns this state, board receives synchronized updates
 */
export interface GameState {
  // Game session metadata
  sessionId: string;                    // UUID for this game instance
  createdAt: Date;                      // When game was initialized
  
  // Current game phase
  phase: GamePhase;                     // Current phase of the game
  
  // Contestants
  players: Player[];                    // 2-3 contestants
  controlPlayerId: string | null;       // Player who can select next clue
  
  // Game content
  gameSet: GameSet | null;              // Loaded game content
  
  // Active round state
  currentRound: RoundType;              // 'round1' | 'round2' | 'final'
  usedClueIds: Set<string>;             // IDs of clues already played
  
  // Buzzer state
  buzzerEnabled: boolean;               // Whether contestants can buzz
  buzzLocked: boolean;                  // Whether a buzz is currently locked
  lockedPlayerId: string | null;        // Player who buzzed in
  lockedOutPlayerIds: Set<string>;      // Players locked out for current clue
  
  // Active clue state
  activeClue: ActiveClue | null;        // Currently displayed clue
  
  // Daily Double state
  dailyDoubleWager: number | null;      // Current DD wager
  
  // Final Jeopardy state
  finalJeopardyState: FinalJeopardyState | null;
  
  // Game rules configuration
  rules: GameRules;                     // Configurable game rules
  
  // Winner tracking
  winnerId: string | null;              // Set after Final Jeopardy
}

/**
 * Game phase enum representing current state of the game
 */
export type GamePhase = 
  | 'setup'           // Configuring contestants and settings
  | 'round1'          // Playing Jeopardy round
  | 'round2'          // Playing Double Jeopardy round
  | 'final-category'  // Showing Final Jeopardy category
  | 'final-wager'     // Collecting Final Jeopardy wagers
  | 'final-clue'      // Showing Final Jeopardy clue
  | 'final-response'  // Collecting Final Jeopardy responses
  | 'final-reveal'    // Revealing Final Jeopardy results
  | 'complete';       // Game finished, winner determined

/**
 * Currently displayed clue
 */
export interface ActiveClue {
  clue: Clue;                  // The clue data
  categoryTitle: string;       // Category name for display
  revealed: boolean;           // Whether correct response is shown
  startTime: number;           // DOMHighResTimeStamp when clue was selected
  isDailyDouble: boolean;      // Whether this is a Daily Double
}

/**
 * Final Jeopardy progression state
 */
export interface FinalJeopardyState {
  phase: FinalJeopardyPhase;
  wagers: Map<string, number>;        // playerId → wager
  responses: Map<string, string>;     // playerId → response text
  adjudications: Map<string, boolean>; // playerId → correct/incorrect
}

/**
 * Final Jeopardy phase enum
 */
export type FinalJeopardyPhase = 
  | 'category-reveal'
  | 'wager-collection'
  | 'clue-reveal'
  | 'response-collection'
  | 'adjudication';

/**
 * Configurable game rules
 */
export interface GameRules {
  // Scoring rules
  wrongAnswerSubtractsValue: boolean;     // Default: true
  allowNegativeScores: boolean;           // Default: true
  
  // Buzzer rules
  lockoutWrongResponder: boolean;         // Default: true
  buzzerTimeoutSeconds: number | null;    // Default: null (no timeout)
  responseTimeoutSeconds: number | null;  // Default: 10 seconds
  
  // Display rules
  showCorrectResponseOnBoard: boolean;    // Default: false (host only)
  showWagersOnBoard: boolean;             // Default: false
  showResponsesOnBoard: boolean;          // Default: false (for Final J)
  
  // Value configuration
  round1Values: number[];                 // Default: [200, 400, 600, 800, 1000]
  round2Values: number[];                 // Default: [400, 800, 1200, 1600, 2000]
}

/**
 * Default game rules configuration
 */
export const DEFAULT_GAME_RULES: GameRules = {
  wrongAnswerSubtractsValue: true,
  allowNegativeScores: true,
  lockoutWrongResponder: true,
  buzzerTimeoutSeconds: null,
  responseTimeoutSeconds: 10,
  showCorrectResponseOnBoard: false,
  showWagersOnBoard: false,
  showResponsesOnBoard: false,
  round1Values: [200, 400, 600, 800, 1000],
  round2Values: [400, 800, 1200, 1600, 2000],
};

/**
 * Type guards for game phases
 */
export function isValidGamePhase(phase: string): phase is GamePhase {
  return ['setup', 'round1', 'round2', 'final-category', 'final-wager', 
          'final-clue', 'final-response', 'final-reveal', 'complete']
    .includes(phase);
}

export function isPlayingRound(phase: GamePhase): boolean {
  return phase === 'round1' || phase === 'round2';
}

export function isFinalJeopardy(phase: GamePhase): boolean {
  return phase.startsWith('final-');
}
