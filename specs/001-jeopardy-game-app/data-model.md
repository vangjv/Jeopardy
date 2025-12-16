# Data Model

**Feature**: Jeopardy-Style Quiz Game System  
**Date**: 2025-12-14  
**Status**: Draft

## Overview

This document defines the TypeScript interfaces and data structures for the Jeopardy game application. All interfaces follow TypeScript strict mode conventions with explicit null handling.

## Core Game State

### GameState

The root state object managed by GameStateService. Owned by host, synchronized to board.

```typescript
interface GameState {
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
```

**Validation Rules**:
- `players.length` must be 2-3
- `controlPlayerId` must reference valid player or be null
- `lockedPlayerId` must reference valid player or be null
- `activeClue` must reference a clue that exists in current round
- Phase transitions follow: setup → round1 → round2 → final → complete

---

### GamePhase

Enum representing the current state of the game.

```typescript
type GamePhase = 
  | 'setup'           // Configuring contestants and settings
  | 'round1'          // Playing Jeopardy round
  | 'round2'          // Playing Double Jeopardy round
  | 'final-category'  // Showing Final Jeopardy category
  | 'final-wager'     // Collecting Final Jeopardy wagers
  | 'final-clue'      // Showing Final Jeopardy clue
  | 'final-response'  // Collecting Final Jeopardy responses
  | 'final-reveal'    // Revealing Final Jeopardy results
  | 'complete';       // Game finished, winner determined
```

**State Transitions**:
- setup → round1 (start game)
- round1 → round2 (all round1 clues used or host advances)
- round2 → final-category (all round2 clues used or host advances)
- final-category → final-wager → final-clue → final-response → final-reveal → complete

---

### Player

Represents a game contestant.

```typescript
interface Player {
  id: string;                  // UUID
  name: string;                // Display name
  score: number;               // Current score (can be negative)
  buzzerKey: string;           // KeyboardEvent.code (e.g., 'KeyA', 'Space')
  color: string;               // Hex color for UI differentiation
  
  // Final Jeopardy state (when applicable)
  finalWager?: number;         // Final Jeopardy wager
  finalResponse?: string;      // Final Jeopardy response text
  finalCorrect?: boolean;      // Whether final response was correct
}
```

**Validation Rules**:
- `name` must be 1-50 characters, non-empty
- `buzzerKey` must be unique across all players
- `buzzerKey` must be a valid KeyboardEvent.code value
- `score` can be any integer (including negative)
- `color` must be valid CSS hex color
- `finalWager` must be 0 ≤ wager ≤ score (if score positive) or 0 (if score negative)

**Default Colors**: `['#3b82f6', '#ef4444', '#10b981']` (blue, red, green)

---

### ActiveClue

Represents the currently displayed clue.

```typescript
interface ActiveClue {
  clue: Clue;                  // The clue data
  categoryTitle: string;       // Category name for display
  revealed: boolean;           // Whether correct response is shown
  startTime: number;           // DOMHighResTimeStamp when clue was selected
  isDailyDouble: boolean;      // Whether this is a Daily Double
}
```

**Lifecycle**:
1. Created when host selects clue
2. `revealed` set to true when host reveals answer or adjudicates
3. Cleared when returning to board

---

### RoundType

Enum for game rounds.

```typescript
type RoundType = 'round1' | 'round2' | 'final';
```

---

## Game Content Structure

### GameSet

Root structure for a complete game's content.

```typescript
interface GameSet {
  id: string;                  // UUID or filename-based ID
  title: string;               // Game set name
  author?: string;             // Optional creator attribution
  createdAt: Date;             // When game set was created
  round1: Round;               // Jeopardy round
  round2: Round;               // Double Jeopardy round
  final: FinalRound;           // Final Jeopardy
}
```

**File Format**: JSON serialization of this interface

---

### Round

Represents a standard round (Jeopardy or Double Jeopardy).

```typescript
interface Round {
  categories: Category[];      // Must have exactly 6 categories
}
```

**Validation Rules**:
- `categories.length === 6`
- Each category must have exactly 5 clues
- Round 1 values: [200, 400, 600, 800, 1000] (default)
- Round 2 values: [400, 800, 1200, 1600, 2000] (default)
- Exactly 1 Daily Double in Round 1, exactly 2 in Round 2

---

### Category

Represents a trivia category.

```typescript
interface Category {
  id: string;                  // UUID
  title: string;               // Category name (e.g., "U.S. PRESIDENTS")
  clues: Clue[];               // Must have exactly 5 clues
}
```

**Validation Rules**:
- `title` must be 1-50 characters
- `clues.length === 5`
- Clue values must be in ascending order

---

### Clue

Represents a single question/answer pair.

```typescript
interface Clue {
  id: string;                  // UUID
  clueText: string;            // The question text
  correctResponse: string;     // The correct answer
  value: number;               // Point value
  dailyDouble: boolean;        // Whether this is a Daily Double
  media?: ClueMedia;           // Optional media attachment
}
```

**Validation Rules**:
- `clueText` must be 1-500 characters
- `correctResponse` must be 1-200 characters
- `value` must be positive integer
- Only one `dailyDouble: true` per round (2 for round2)

---

### ClueMedia

Optional media attachment for a clue.

```typescript
interface ClueMedia {
  type: 'image' | 'audio' | 'video';
  url: string;                 // URL or data URI
  altText?: string;            // For images (accessibility)
}
```

**Validation Rules**:
- `url` must be valid URL or data URI
- Image formats: png, jpg, gif, webp
- Audio formats: mp3, wav, ogg
- Video formats: mp4, webm

---

### FinalRound

Final Jeopardy structure.

```typescript
interface FinalRound {
  category: FinalCategory;
}

interface FinalCategory {
  id: string;                  // UUID
  title: string;               // Category name
  clue: Clue;                  // Single clue (value ignored)
}
```

**Validation Rules**:
- Exactly 1 clue
- Clue value not used (wagers determine score change)

---

## Final Jeopardy State

### FinalJeopardyState

Tracks Final Jeopardy progression.

```typescript
interface FinalJeopardyState {
  phase: FinalJeopardyPhase;
  wagers: Map<string, number>;        // playerId → wager
  responses: Map<string, string>;     // playerId → response text
  adjudications: Map<string, boolean>; // playerId → correct/incorrect
}

type FinalJeopardyPhase = 
  | 'category-reveal'
  | 'wager-collection'
  | 'clue-reveal'
  | 'response-collection'
  | 'adjudication';
```

**Lifecycle**:
1. category-reveal: Show category, contestants think
2. wager-collection: Host enters wagers for each contestant
3. clue-reveal: Show clue, contestants write responses
4. response-collection: Host enters responses
5. adjudication: Host marks each response correct/incorrect

---

## Game Rules Configuration

### GameRules

Configurable rule toggles.

```typescript
interface GameRules {
  // Scoring rules
  wrongAnswerSubtractsValue: boolean;     // Default: true
  allowNegativeScores: boolean;           // Default: true
  
  // Buzzer rules
  lockoutWrongResponder: boolean;         // Default: true
  buzzerTimeoutSeconds: number | null;    // Default: null (no timeout)
  responseTimeoutSeconds: number | null;  // Default: null (no timeout)
  
  // Display rules
  showCorrectResponseOnBoard: boolean;    // Default: false (host only)
  showWagersOnBoard: boolean;             // Default: false
  showResponsesOnBoard: boolean;          // Default: false (for Final J)
  
  // Value configuration
  round1Values: number[];                 // Default: [200, 400, 600, 800, 1000]
  round2Values: number[];                 // Default: [400, 800, 1200, 1600, 2000]
}
```

**Defaults**:
```typescript
const DEFAULT_RULES: GameRules = {
  wrongAnswerSubtractsValue: true,
  allowNegativeScores: true,
  lockoutWrongResponder: true,
  buzzerTimeoutSeconds: null,
  responseTimeoutSeconds: null,
  showCorrectResponseOnBoard: false,
  showWagersOnBoard: false,
  showResponsesOnBoard: false,
  round1Values: [200, 400, 600, 800, 1000],
  round2Values: [400, 800, 1200, 1600, 2000],
};
```

---

## Synchronization Events

### SyncEvent

Base interface for BroadcastChannel messages.

```typescript
interface SyncEvent {
  type: SyncEventType;
  timestamp: number;           // DOMHighResTimeStamp
  payload: unknown;            // Type depends on event type
}

type SyncEventType =
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
  | 'FINAL_PHASE_CHANGED';      // Final Jeopardy phase change
```

### Event Payloads

```typescript
interface StateSyncPayload {
  gameState: GameState;
}

interface RoundChangedPayload {
  round: RoundType;
}

interface ClueSelectedPayload {
  clue: ActiveClue;
}

interface BuzzLockedPayload {
  playerId: string;
  timestamp: number;
}

interface ScoresUpdatedPayload {
  players: Player[];
}
```

---

## Validation Schemas

### JSON Schema for GameSet Import

```typescript
const GameSetSchema = {
  type: 'object',
  required: ['round1', 'round2', 'final'],
  properties: {
    id: { type: 'string' },
    title: { type: 'string', minLength: 1, maxLength: 100 },
    author: { type: 'string', maxLength: 100 },
    round1: { $ref: '#/definitions/Round' },
    round2: { $ref: '#/definitions/Round' },
    final: { $ref: '#/definitions/FinalRound' },
  },
  definitions: {
    Round: {
      type: 'object',
      required: ['categories'],
      properties: {
        categories: {
          type: 'array',
          minItems: 6,
          maxItems: 6,
          items: { $ref: '#/definitions/Category' },
        },
      },
    },
    Category: {
      type: 'object',
      required: ['id', 'title', 'clues'],
      properties: {
        id: { type: 'string' },
        title: { type: 'string', minLength: 1, maxLength: 50 },
        clues: {
          type: 'array',
          minItems: 5,
          maxItems: 5,
          items: { $ref: '#/definitions/Clue' },
        },
      },
    },
    Clue: {
      type: 'object',
      required: ['id', 'clueText', 'correctResponse', 'value'],
      properties: {
        id: { type: 'string' },
        clueText: { type: 'string', minLength: 1, maxLength: 500 },
        correctResponse: { type: 'string', minLength: 1, maxLength: 200 },
        value: { type: 'number', minimum: 1 },
        dailyDouble: { type: 'boolean' },
        media: { $ref: '#/definitions/ClueMedia' },
      },
    },
    ClueMedia: {
      type: 'object',
      required: ['type', 'url'],
      properties: {
        type: { enum: ['image', 'audio', 'video'] },
        url: { type: 'string', format: 'uri' },
        altText: { type: 'string' },
      },
    },
    FinalRound: {
      type: 'object',
      required: ['category'],
      properties: {
        category: { $ref: '#/definitions/FinalCategory' },
      },
    },
    FinalCategory: {
      type: 'object',
      required: ['id', 'title', 'clue'],
      properties: {
        id: { type: 'string' },
        title: { type: 'string', minLength: 1, maxLength: 50 },
        clue: { $ref: '#/definitions/Clue' },
      },
    },
  },
};
```

---

## Derived/Computed Values

These values are computed on-demand, not stored in state:

```typescript
// Get highest value on current board
function getHighestBoardValue(gameState: GameState): number {
  const round = gameState.currentRound;
  const values = round === 'round1' 
    ? gameState.rules.round1Values 
    : gameState.rules.round2Values;
  return Math.max(...values);
}

// Calculate Daily Double max wager
function getMaxDailyDoubleWager(player: Player, gameState: GameState): number {
  const highestBoardValue = getHighestBoardValue(gameState);
  return player.score > 0 
    ? Math.max(player.score, highestBoardValue)
    : highestBoardValue;
}

// Calculate Final Jeopardy max wager
function getMaxFinalWager(player: Player): number {
  return Math.max(0, player.score);
}

// Determine current leader
function getLeader(players: Player[]): Player {
  return players.reduce((leader, player) => 
    player.score > leader.score ? player : leader
  );
}

// Check if all clues used
function isRoundComplete(gameState: GameState): boolean {
  const currentRound = gameState.gameSet?.[gameState.currentRound];
  if (!currentRound) return false;
  
  const totalClues = currentRound.categories.length * 5;
  return gameState.usedClueIds.size >= totalClues;
}
```

---

## State Persistence (Optional)

If local persistence is added:

```typescript
interface PersistedState {
  lastGameState: GameState | null;     // For crash recovery
  savedGameSets: GameSet[];            // User's game library
  recentGames: GameSummary[];          // Game history
}

interface GameSummary {
  sessionId: string;
  title: string;
  players: string[];                   // Player names
  winner: string | null;
  completedAt: Date;
}
```

Stored in `localStorage` with key `jeopardy-app-state`.

---

## Type Guards

```typescript
function isValidGamePhase(phase: string): phase is GamePhase {
  return ['setup', 'round1', 'round2', 'final-category', 'final-wager', 
          'final-clue', 'final-response', 'final-reveal', 'complete']
    .includes(phase);
}

function isPlayingRound(phase: GamePhase): boolean {
  return phase === 'round1' || phase === 'round2';
}

function isFinalJeopardy(phase: GamePhase): boolean {
  return phase.startsWith('final-');
}
```

---

## Summary

This data model provides:
- **Strong typing** for all game entities
- **Clear validation rules** for game content
- **Explicit state transitions** via GamePhase
- **Synchronization contracts** via SyncEvent types
- **Immutable update patterns** via service methods
- **Extensibility** for future features (timers, sounds, etc.)

All interfaces are designed to be serializable for BroadcastChannel transmission and JSON import/export.
