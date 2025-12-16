# Service Interface Contracts

**Feature**: Jeopardy-Style Quiz Game System  
**Date**: 2025-12-14  
**Version**: 1.0.0

## Overview

This document defines the TypeScript interfaces for Angular services that manage game state, synchronization, and business logic.

## GameStateService

**Responsibility**: Maintain authoritative game state, provide state update methods, emit state changes to subscribers

**Location**: `src/app/shared/services/game-state.service.ts`

**Provider**: `providedIn: 'root'` (singleton)

### Interface

```typescript
interface IGameStateService {
  // State observation
  getState(): Observable<GameState>;
  getCurrentState(): GameState;
  
  // Game lifecycle
  initializeGame(players: Player[], gameSet: GameSet, rules?: Partial<GameRules>): void;
  startRound(round: RoundType): void;
  endGame(): void;
  
  // Player management
  addPlayer(player: Omit<Player, 'id'>): string;  // Returns new player ID
  removePlayer(playerId: string): void;
  updatePlayerScore(playerId: string, delta: number): void;
  setPlayerScore(playerId: string, score: number): void;
  
  // Clue management
  selectClue(categoryId: string, clueId: string): void;
  markClueUsed(clueId: string): void;
  clearActiveClue(): void;
  revealCorrectResponse(): void;
  
  // Buzzer management
  enableBuzzer(): void;
  disableBuzzer(): void;
  lockBuzz(playerId: string, timestamp: number): void;
  resetBuzz(): void;
  addLockout(playerId: string): void;
  clearLockouts(): void;
  
  // Daily Double
  setDailyDoubleWager(wager: number): void;
  validateDailyDoubleWager(playerId: string, wager: number): ValidationResult;
  
  // Final Jeopardy
  startFinalJeopardy(): void;
  setFinalWager(playerId: string, wager: number): void;
  setFinalResponse(playerId: string, response: string): void;
  adjudicateFinalResponse(playerId: string, correct: boolean): void;
  validateFinalWager(playerId: string, wager: number): ValidationResult;
  
  // Game control
  setControlPlayer(playerId: string | null): void;
  advanceRound(): void;
  
  // Rules management
  updateRules(rules: Partial<GameRules>): void;
  getRules(): GameRules;
  
  // Utility
  isRoundComplete(): boolean;
  getWinner(): Player | null;
  exportGameState(): string;  // JSON serialization
  importGameState(json: string): ValidationResult;
}
```

### Usage Example

```typescript
@Component({...})
export class HostComponent {
  gameState$ = this.gameStateService.getState();
  
  constructor(private gameStateService: GameStateService) {}
  
  onClueSelected(categoryId: string, clueId: string) {
    this.gameStateService.selectClue(categoryId, clueId);
    this.gameStateService.enableBuzzer();
  }
  
  onBuzzDetected(playerId: string, timestamp: number) {
    this.gameStateService.lockBuzz(playerId, timestamp);
  }
  
  onResponseCorrect() {
    const state = this.gameStateService.getCurrentState();
    if (state.activeClue && state.lockedPlayerId) {
      this.gameStateService.updatePlayerScore(
        state.lockedPlayerId, 
        state.activeClue.clue.value
      );
      this.gameStateService.markClueUsed(state.activeClue.clue.id);
      this.gameStateService.clearActiveClue();
    }
  }
}
```

---

## SyncService

**Responsibility**: Send/receive synchronization events via BroadcastChannel, coordinate state sharing between host and board

**Location**: `src/app/shared/services/sync.service.ts`

**Provider**: `providedIn: 'root'` (singleton)

### Interface

```typescript
interface ISyncService {
  // Channel management
  initialize(role: 'host' | 'board'): void;
  destroy(): void;
  
  // Publishing (host only)
  broadcastStateSync(gameState: GameState): void;
  broadcastClueSelected(clue: ActiveClue): void;
  broadcastClueCleared(): void;
  broadcastBuzzEnabled(enabled: boolean): void;
  broadcastBuzzLocked(playerId: string, playerName: string, timestamp: number): void;
  broadcastBuzzReset(): void;
  broadcastScoresUpdated(players: Player[]): void;
  broadcastCorrectResponseRevealed(correctResponse: string): void;
  broadcastRoundChanged(round: RoundType): void;
  broadcastFinalPhaseChanged(phase: FinalJeopardyPhase, data?: any): void;
  broadcastWinnerAnnounced(winnerId: string, winnerName: string, finalScore: number, allPlayers: Player[]): void;
  
  // Subscribing (board only)
  onStateSync(): Observable<GameState>;
  onClueSelected(): Observable<ActiveClue>;
  onClueCleared(): Observable<void>;
  onBuzzEnabled(): Observable<boolean>;
  onBuzzLocked(): Observable<{ playerId: string; playerName: string; timestamp: number }>;
  onBuzzReset(): Observable<void>;
  onScoresUpdated(): Observable<Player[]>;
  onCorrectResponseRevealed(): Observable<string>;
  onRoundChanged(): Observable<RoundType>;
  onFinalPhaseChanged(): Observable<{ phase: FinalJeopardyPhase; data?: any }>;
  onWinnerAnnounced(): Observable<{ winnerId: string; winnerName: string; finalScore: number; allPlayers: Player[] }>;
  
  // Board requests (board only)
  requestStateSync(boardInstanceId: string): void;
  
  // Connection monitoring
  isConnected(): Observable<boolean>;
  getLastMessageTime(): number;
}
```

### Usage Example

```typescript
@Component({...})
export class BoardComponent implements OnInit, OnDestroy {
  gameState$ = this.syncService.onStateSync();
  
  constructor(private syncService: SyncService) {}
  
  ngOnInit() {
    this.syncService.initialize('board');
    this.syncService.requestStateSync('board-' + Date.now());
    
    this.syncService.onClueSelected().subscribe(clue => {
      this.displayClue(clue);
    });
    
    this.syncService.onScoresUpdated().subscribe(players => {
      this.updateScores(players);
    });
  }
  
  ngOnDestroy() {
    this.syncService.destroy();
  }
}
```

---

## ValidationService

**Responsibility**: Validate game content, wagers, player configurations, and state transitions

**Location**: `src/app/shared/services/validation.service.ts`

**Provider**: `providedIn: 'root'` (singleton)

### Interface

```typescript
interface IValidationService {
  // Game content validation
  validateGameSet(gameSet: unknown): ValidationResult;
  validateRound(round: unknown, roundNumber: 1 | 2): ValidationResult;
  validateCategory(category: unknown): ValidationResult;
  validateClue(clue: unknown): ValidationResult;
  validateDailyDoubleCount(round: Round, expectedCount: number): ValidationResult;
  
  // Player validation
  validatePlayer(player: Omit<Player, 'id'>): ValidationResult;
  validateBuzzerKey(key: string, existingPlayers: Player[]): ValidationResult;
  
  // Wager validation
  validateDailyDoubleWager(wager: number, player: Player, highestBoardValue: number): ValidationResult;
  validateFinalWager(wager: number, player: Player): ValidationResult;
  
  // State validation
  validatePhaseTransition(from: GamePhase, to: GamePhase): ValidationResult;
  validateClueSelection(clueId: string, usedClueIds: Set<string>): ValidationResult;
  
  // Media validation
  validateMediaUrl(url: string, type: 'image' | 'audio' | 'video'): Promise<ValidationResult>;
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ValidationError {
  code: string;
  message: string;
  path?: string;  // JSON path for nested errors (e.g., "round1.categories[2].clues[4].value")
}

interface ValidationWarning {
  code: string;
  message: string;
  path?: string;
}
```

### Usage Example

```typescript
@Component({...})
export class GameSetupComponent {
  constructor(private validationService: ValidationService) {}
  
  async onFileImported(file: File) {
    const content = await file.text();
    const gameSet = JSON.parse(content);
    
    const result = this.validationService.validateGameSet(gameSet);
    
    if (!result.valid) {
      this.showErrors(result.errors);
      return;
    }
    
    if (result.warnings.length > 0) {
      const proceed = confirm(
        'Warnings detected:\n' + 
        result.warnings.map(w => w.message).join('\n') +
        '\n\nProceed anyway?'
      );
      if (!proceed) return;
    }
    
    this.gameStateService.initializeGame(this.players, gameSet);
  }
}
```

---

## BuzzerService

**Responsibility**: Handle keyboard input for buzzer detection, coordinate with GameStateService

**Location**: `src/app/shared/services/buzzer.service.ts`

**Provider**: `providedIn: 'root'` (singleton)

**Note**: Used only in host interface (not board)

### Interface

```typescript
interface IBuzzerService {
  // Initialization
  initialize(players: Player[]): void;
  destroy(): void;
  
  // Buzzer detection
  onBuzz(): Observable<BuzzEvent>;
  
  // Configuration
  setKeyBindings(bindings: Map<string, string>): void;  // KeyCode → PlayerId
  getKeyBindings(): Map<string, string>;
  
  // State
  isListening(): boolean;
  getLastBuzzTime(): number | null;
}

interface BuzzEvent {
  playerId: string;
  playerName: string;
  keyCode: string;
  timestamp: number;  // DOMHighResTimeStamp
}
```

### Usage Example

```typescript
@Component({...})
export class HostComponent implements OnInit {
  constructor(
    private buzzerService: BuzzerService,
    private gameStateService: GameStateService
  ) {}
  
  ngOnInit() {
    const state = this.gameStateService.getCurrentState();
    this.buzzerService.initialize(state.players);
    
    this.buzzerService.onBuzz().subscribe(event => {
      const state = this.gameStateService.getCurrentState();
      
      if (state.buzzerEnabled && !state.buzzLocked) {
        this.gameStateService.lockBuzz(event.playerId, event.timestamp);
      }
    });
  }
}
```

---

## GameContentService

**Responsibility**: Load, parse, and cache game content from files or assets

**Location**: `src/app/shared/services/game-content.service.ts`

**Provider**: `providedIn: 'root'` (singleton)

### Interface

```typescript
interface IGameContentService {
  // Loading
  loadFromFile(file: File): Promise<LoadResult>;
  loadFromUrl(url: string): Promise<LoadResult>;
  loadSampleGame(): Promise<LoadResult>;
  
  // Caching
  getSavedGameSets(): GameSet[];
  saveGameSet(gameSet: GameSet): void;
  deleteGameSet(id: string): void;
  
  // Export
  exportGameSet(gameSet: GameSet): string;  // JSON string
  downloadGameSet(gameSet: GameSet, filename: string): void;  // Trigger download
}

interface LoadResult {
  success: boolean;
  gameSet?: GameSet;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}
```

### Usage Example

```typescript
@Component({...})
export class GameSetupComponent {
  savedGames$ = this.gameContentService.getSavedGameSets();
  
  constructor(private gameContentService: GameContentService) {}
  
  async onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    
    const result = await this.gameContentService.loadFromFile(file);
    
    if (result.success && result.gameSet) {
      this.gameStateService.initializeGame(this.players, result.gameSet);
    } else {
      this.showErrors(result.errors);
    }
  }
  
  onLoadSample() {
    this.gameContentService.loadSampleGame().then(result => {
      if (result.gameSet) {
        this.gameStateService.initializeGame(this.players, result.gameSet);
      }
    });
  }
}
```

---

## AudioService (Optional Enhancement)

**Responsibility**: Play sound effects for buzzes, correct/incorrect responses, transitions

**Location**: `src/app/shared/services/audio.service.ts`

**Provider**: `providedIn: 'root'` (singleton)

**Note**: Not required for MVP, but interface included for future implementation

### Interface

```typescript
interface IAudioService {
  // Initialization
  initialize(): void;
  setEnabled(enabled: boolean): void;
  isEnabled(): boolean;
  
  // Playback
  playBuzz(): void;
  playCorrect(): void;
  playIncorrect(): void;
  playDailyDouble(): void;
  playFinalJeopardy(): void;
  playRoundTransition(): void;
  
  // Volume control
  setVolume(volume: number): void;  // 0.0 to 1.0
  getVolume(): number;
}
```

---

## Service Dependency Graph

```
GameStateService
    ↓
    ├──> SyncService (publishes state changes)
    └──> ValidationService (validates updates)

BuzzerService
    ↓
    └──> GameStateService (locks buzz)

GameContentService
    ↓
    ├──> ValidationService (validates imported content)
    └──> GameStateService (initializes game with content)

HostComponent
    ↓
    ├──> GameStateService (manages state)
    ├──> BuzzerService (detects buzzes)
    └──> GameContentService (loads games)

BoardComponent
    ↓
    └──> SyncService (receives updates)
```

---

## Error Handling Patterns

All services follow these error handling conventions:

### Synchronous Methods

Return `ValidationResult` or throw typed errors:

```typescript
class GameStateError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'GameStateError';
  }
}

// Usage
updatePlayerScore(playerId: string, delta: number): void {
  const player = this.players.find(p => p.id === playerId);
  if (!player) {
    throw new GameStateError(`Player ${playerId} not found`, 'PLAYER_NOT_FOUND');
  }
  // ... update logic
}
```

### Asynchronous Methods

Return `Promise<Result>` with success/error union:

```typescript
async loadFromFile(file: File): Promise<LoadResult> {
  try {
    const content = await file.text();
    const gameSet = JSON.parse(content);
    const validation = this.validationService.validateGameSet(gameSet);
    
    return {
      success: validation.valid,
      gameSet: validation.valid ? gameSet : undefined,
      errors: validation.errors,
      warnings: validation.warnings,
    };
  } catch (error) {
    return {
      success: false,
      errors: [{ code: 'PARSE_ERROR', message: error.message }],
      warnings: [],
    };
  }
}
```

### Observable Streams

Emit errors via RxJS error handling:

```typescript
onBuzz(): Observable<BuzzEvent> {
  return this.buzzSubject.asObservable().pipe(
    catchError(error => {
      console.error('Buzzer error:', error);
      return EMPTY;  // Don't crash, just log
    })
  );
}
```

---

## Testing Contracts

Each service MUST provide test doubles for unit testing:

```typescript
// game-state.service.mock.ts
export class MockGameStateService implements IGameStateService {
  private state = new BehaviorSubject<GameState>(mockGameState);
  
  getState() { return this.state.asObservable(); }
  getCurrentState() { return this.state.value; }
  // ... mock implementations
}

// Usage in tests
TestBed.configureTestingModule({
  providers: [
    { provide: GameStateService, useClass: MockGameStateService }
  ]
});
```

---

## Version History

**v1.0.0** (2025-12-14): Initial service contracts
- GameStateService: Complete state management API
- SyncService: BroadcastChannel abstraction
- ValidationService: Content and rule validation
- BuzzerService: Keyboard event handling
- GameContentService: File I/O and caching
- AudioService: Placeholder for future enhancement

---

## Future Enhancements (Not in MVP)

- HistoryService: Undo/redo functionality
- AnalyticsService: Track game statistics
- ThemeService: Customizable color schemes
- AccessibilityService: Screen reader support, high contrast modes
