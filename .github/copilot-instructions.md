# Jeopardy Game System - AI Agent Instructions

## Project Overview

A dual-window synchronized Angular 20+ application that runs a Jeopardy-style quiz game with a **Host UI** (control console) and **Board UI** (contestant/audience display in popup window). Both UIs stay synchronized in real-time using BroadcastChannel API. The game is **offline-first with zero backend dependencies**.

**Key Routes**: `/host` (control console) | `/board` (display for second screen)

## Architecture & Data Flow

### Single Source of Truth Pattern
- **Host owns all state**: `GameStateService` in host context is authoritative
- **Board is read-only**: receives state updates, never mutates state directly
- **Unidirectional flow**: Host → BroadcastChannel → Board
- Board can only request sync via `BOARD_READY` message on reconnection

### Synchronization Protocol
- **Primary**: BroadcastChannel (`jeopardy-sync`) for same-machine multi-window sync
- **Fallback**: `window.postMessage` for unsupported browsers
- **Message types** (see [sync-protocol.md](../specs/001-jeopardy-game-app/contracts/sync-protocol.md)):
  - `STATE_SYNC`: Full state update (host → board)
  - `BUZZ`: Player buzzed in (host → board)
  - `SCORE_UPDATE`: Score changed (host → board)
  - `CLUE_REVEALED`: New clue displayed (host → board)
  - `BOARD_READY`: Board requests sync (board → host)

### Project Structure
```
src/app/
├── host/               # Host console route & components
├── board/              # Board display route & components  
├── shared/
│   ├── models/         # TypeScript interfaces (GameState, Player, Clue)
│   ├── services/       # State, sync, validation services
│   ├── components/     # Reusable UI components
│   └── utils/          # Helper functions
├── app.routes.ts       # Route definitions
└── app.config.ts       # App-level config
```

## TypeScript & Angular Conventions

### Strict Mode Requirements
- **TypeScript strict mode enabled** (`tsconfig.json`)
- All interfaces in `shared/models/` must be explicitly typed
- No `any` types - use `unknown` and type guards when needed
- Explicit null/undefined handling with `| null` unions

### Angular 19+ Best Practices
- **Standalone components only** - no `NgModule` declarations
- **Signals for reactive state** - prefer `signal()` and `computed()` over BehaviorSubject where appropriate
- **Zoneless change detection** - `provideZonelessChangeDetection()` configured in `app.config.ts`
- **Control flow syntax** - use `@if`, `@for`, `@switch` instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- Component selectors use `app-` prefix (configured in `angular.json`)

### Component Structure Pattern
```typescript
@Component({
  selector: 'app-example',
  imports: [CommonModule, /* other imports */],
  templateUrl: './example.component.html',
  styleUrl: './example.component.scss'
})
export class ExampleComponent {
  // Signals for reactive state
  protected readonly data = signal<DataType | null>(null);
  
  // Services injected via constructor or inject()
  constructor(private readonly service: SomeService) {}
}
```

## Core Data Model

### Key Interfaces (see [data-model.md](../specs/001-jeopardy-game-app/data-model.md))
- **GameState**: Root state object with phase, players, active clue, buzzer state
- **Player**: Contestant with id, name, score, buzzKey
- **GameSet**: Complete game content (Round 1, Round 2, Final Jeopardy)
- **Clue**: Individual question with clueText, correctResponse, value, optional dailyDouble/media

### State Validation Rules
- 2-3 players required
- Each round: 6 categories × 5 clues
- Round 1 values: 200-1000 (default, configurable)
- Round 2 values: 400-2000 (default, configurable)
- Daily Double wager: min $5, max (player score OR highest board value)

### Game Phase Flow
```
setup → round1 → round2 → final-category → final-wager → 
final-clue → final-response → final-reveal → complete
```

## Development Workflows

### Running the App
```bash
npm start          # Dev server at http://localhost:4200
npm test           # Jasmine/Karma tests
npm run build      # Production build to dist/
```

### Testing Dual-Window Sync
1. Start dev server: `npm start`
2. Open host: `http://localhost:4200/host`
3. Host opens board popup via "Open Board" button
4. Test sync: changes in host should reflect on board within <100ms
5. Test reconnection: refresh board window, verify `BOARD_READY` triggers state sync

### Keyboard Buzzer Testing
- Players buzz using configured keys (default: A, S, D for players 1-3)
- First keypress within 10ms accuracy locks buzzer
- Test for race conditions with simultaneous keypresses

## Service Layer Contracts

### GameStateService (see [service-interfaces.md](../specs/001-jeopardy-game-app/contracts/service-interfaces.md))
- `getState(): Observable<GameState>` - subscribe to state changes
- `selectClue(categoryId, clueId)` - activate clue on board
- `lockBuzz(playerId, timestamp)` - handle buzz-in
- `updatePlayerScore(playerId, delta)` - add/subtract points

### SyncService
- `sendEvent(event: SyncEvent)` - broadcast to board
- `onEvent(): Observable<SyncEvent>` - receive events
- Auto-reconnection when board reloads

### ValidationService
- `validateGameSet(json)` - verify imported game content structure
- Returns errors array with specific validation failures

## Critical Constraints

### Performance Requirements
- **<10ms first-buzz detection** - use high-resolution timestamps (`performance.now()`)
- **<100ms sync latency** - host to board update time
- **<2s reconnection** - board state resync after reload

### UI Optimization
- **Board display**: optimized for 1080p+ screens, readable from 10+ feet away
- **Host console**: usable on 1366×768 laptop screens
- Use responsive units (rem, viewport-relative) and CSS custom properties

### Offline Capability
- No HTTP requests after initial page load
- Game content loaded via JSON file import (no API calls)
- Optional LocalStorage for saving user preferences only

## Code Generation Guidelines

When implementing features:
1. **Check constitution** in [plan.md](../specs/001-jeopardy-game-app/plan.md) for architectural principles
2. **Reference contracts** in `specs/001-jeopardy-game-app/contracts/` for service/sync interfaces
3. **Use existing models** from `shared/models/` - don't duplicate interfaces
4. **Maintain unidirectional flow** - board components never call state-mutating methods
5. **Add JSDoc comments** for public service methods with @param and @returns

## Common Gotchas

- **Don't create NgModules** - Angular 19 uses standalone components
- **Board popup requires window.open()** - not `<a target="_blank">`; maintain window reference for postMessage fallback
- **BroadcastChannel same-origin only** - host and board must be same domain/port
- **Set.has() vs Array.includes()** - `usedClueIds` is a Set for O(1) lookup
- **Zoneless change detection** - use signals, avoid ChangeDetectorRef manual triggers

## Documentation References

- Full spec: [spec.md](../spec.md)
- Implementation plan: [specs/001-jeopardy-game-app/plan.md](../specs/001-jeopardy-game-app/plan.md)
- Data model: [specs/001-jeopardy-game-app/data-model.md](../specs/001-jeopardy-game-app/data-model.md)
- Sync protocol: [specs/001-jeopardy-game-app/contracts/sync-protocol.md](../specs/001-jeopardy-game-app/contracts/sync-protocol.md)
- Service interfaces: [specs/001-jeopardy-game-app/contracts/service-interfaces.md](../specs/001-jeopardy-game-app/contracts/service-interfaces.md)
