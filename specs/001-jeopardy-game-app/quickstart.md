# Developer Quickstart Guide

**Feature**: Jeopardy-Style Quiz Game System  
**Date**: 2025-12-14  
**Audience**: New developers joining the project

## Overview

This guide will get you up and running with the Jeopardy game application in under 15 minutes. You'll learn the architecture, run the app, and understand the key workflows.

## Prerequisites

- **Node.js**: 18.x or higher
- **npm**: 9.x or higher
- **Git**: For version control
- **IDE**: VS Code recommended (with Angular Language Service extension)
- **Browser**: Chrome, Firefox, Edge, or Safari (modern versions)

## Quick Start (5 minutes)

### 1. Clone and Install

```bash
cd C:\Projects\Jeopardy
npm install
```

### 2. Start Development Server

```bash
npm start
```

Server starts at `http://localhost:4200`

### 3. Open Host and Board Interfaces

1. Navigate to `http://localhost:4200/host`
2. Click "Open Board Display" button to launch board in popup
3. Both windows are now synchronized!

### 4. Try a Basic Game Flow

1. In host interface:
   - Add 2-3 contestants with names and buzzer keys
   - Load sample game content (or import JSON)
   - Click "Start Round 1"

2. On board display:
   - See the 6×5 clue board appear
   - Scores visible at top

3. Back in host:
   - Click any clue to display it
   - Click "Enable Buzzer"
   - Press assigned buzzer key (e.g., 'A', 'B', or 'C')
   - See contestant name appear on both screens
   - Click "Correct" or "Incorrect"
   - See score update on both screens
   - Return to board

**You're now running a synchronized dual-window quiz game!**

---

## Architecture Overview (10 minutes)

### High-Level Structure

```
┌─────────────────┐         BroadcastChannel         ┌─────────────────┐
│  Host Interface │  ←─────────────────────────────→  │ Board Display   │
│  /host route    │        (jeopardy-sync)           │  /board route   │
└─────────────────┘                                   └─────────────────┘
        │                                                      │
        ├─ Game controls                                      ├─ Read-only view
        ├─ Buzzer detection                                   ├─ Clue display
        ├─ Score adjudication                                 ├─ Score display
        └─ Owns GameState  ─────(broadcasts updates)─────→    └─ Receives updates
```

### Key Concepts

#### 1. Dual-Window Architecture

- **Host**: Control interface for game operator
  - Manages contestants, selects clues, adjudicates responses
  - Detects keyboard buzzer input
  - Owns authoritative `GameState`
  
- **Board**: Display interface for contestants/audience
  - Shows clue board, active clues, scores
  - Read-only (no state mutations)
  - Syncs with host via BroadcastChannel

#### 2. State Management

**Single Source of Truth**: Host owns the state

```typescript
GameState {
  phase: 'setup' | 'round1' | 'round2' | 'final-*' | 'complete'
  players: Player[]
  currentRound: 'round1' | 'round2' | 'final'
  activeClue: ActiveClue | null
  buzzerEnabled: boolean
  // ... more fields
}
```

**State Flow**:
```
User Action (host) 
  → GameStateService.updateState()
  → SyncService.broadcast()
  → BroadcastChannel message
  → Board receives update
  → Board UI renders new state
```

#### 3. Buzzer System

**Keyboard-Based Input**:
- Each contestant assigned a key (e.g., 'KeyA', 'KeyB', 'KeyC')
- BuzzerService listens for keydown events
- First press within enabled window locks the buzz
- DOMHighResTimeStamp provides microsecond precision

**Accuracy**: <10ms detection window for simultaneous presses

#### 4. Offline-First Design

- No backend server required
- All game logic executes client-side
- Game content loaded via JSON import
- BroadcastChannel for multi-window sync (same browser instance)

---

## Project Structure

```
src/
├── app/
│   ├── host/                          # Host console
│   │   ├── host.component.ts          # Main host route component
│   │   ├── host.component.html
│   │   ├── host.component.scss
│   │   └── components/                # Host-specific UI
│   │       ├── player-setup/          # Contestant configuration
│   │       ├── game-board-control/    # Clue selection interface
│   │       ├── buzzer-panel/          # Buzz detection display
│   │       └── score-adjudication/    # Correct/incorrect buttons
│   │
│   ├── board/                         # Board display
│   │   ├── board.component.ts         # Main board route component
│   │   ├── board.component.html
│   │   ├── board.component.scss
│   │   └── components/                # Board-specific UI
│   │       ├── clue-board/            # 6×5 category/clue grid
│   │       ├── clue-display/          # Full-screen clue view
│   │       ├── score-display/         # Contestant scores
│   │       └── buzz-indicator/        # Who buzzed in
│   │
│   ├── shared/                        # Shared code
│   │   ├── models/                    # TypeScript interfaces
│   │   │   ├── game-state.model.ts    # GameState, GamePhase
│   │   │   ├── player.model.ts        # Player, BuzzEvent
│   │   │   ├── game-content.model.ts  # GameSet, Round, Clue
│   │   │   └── sync-event.model.ts    # SyncEvent types
│   │   │
│   │   ├── services/                  # Business logic
│   │   │   ├── game-state.service.ts  # State management
│   │   │   ├── sync.service.ts        # BroadcastChannel wrapper
│   │   │   ├── validation.service.ts  # Content validation
│   │   │   ├── buzzer.service.ts      # Keyboard input
│   │   │   └── game-content.service.ts # File I/O
│   │   │
│   │   ├── components/                # Reusable UI components
│   │   │   └── (shared components)
│   │   │
│   │   └── utils/                     # Helper functions
│   │       ├── wager-calculator.ts
│   │       ├── phase-transitions.ts
│   │       └── type-guards.ts
│   │
│   ├── app.routes.ts                  # Route configuration
│   ├── app.config.ts                  # App configuration
│   └── app.ts                         # Root component
│
├── assets/                            # Static files
│   ├── game-sets/                     # Sample game JSON files
│   │   └── sample-game.json
│   ├── images/                        # (optional media)
│   └── styles/                        # (theme files)
│
└── styles.scss                        # Global styles
```

---

## Key Workflows

### Workflow 1: Game Setup

```typescript
// Host: Configure contestants
gameStateService.addPlayer({
  name: 'Alice',
  score: 0,
  buzzerKey: 'KeyA',
  color: '#3b82f6'
});

// Load game content
const result = await gameContentService.loadFromFile(file);
gameStateService.initializeGame(players, result.gameSet);

// Start game
gameStateService.startRound('round1');
// → Broadcasts STATE_SYNC to board
```

### Workflow 2: Clue Selection and Buzzer

```typescript
// Host: User clicks clue
gameStateService.selectClue(categoryId, clueId);
// → Broadcasts CLUE_SELECTED to board

gameStateService.enableBuzzer();
// → Broadcasts BUZZ_ENABLED to board

// BuzzerService detects keypress
buzzerService.onBuzz().subscribe(event => {
  gameStateService.lockBuzz(event.playerId, event.timestamp);
  // → Broadcasts BUZZ_LOCKED to board
});

// Host adjudicates
gameStateService.updatePlayerScore(playerId, clueValue);
// → Broadcasts SCORES_UPDATED to board

gameStateService.clearActiveClue();
// → Broadcasts CLUE_CLEARED to board
```

### Workflow 3: Board Reconnection

```typescript
// Board: Component initializes
ngOnInit() {
  syncService.initialize('board');
  syncService.requestStateSync('board-' + Date.now());
  // → Sends BOARD_READY message
}

// Host: Receives BOARD_READY
syncService.onBoardReady().subscribe(() => {
  const state = gameStateService.getCurrentState();
  syncService.broadcastStateSync(state);
  // → Board receives full state and resumes
});
```

---

## Development Workflows

### Running Tests

```bash
# Unit tests (Jasmine/Karma)
npm test

# Watch mode for TDD
npm test -- --watch
```

### Linting and Formatting

```bash
# Check for linting errors
npm run lint

# Auto-fix linting issues
npm run lint -- --fix

# Format code with Prettier
npm run format
```

### Building for Production

```bash
# Create production build
npm run build

# Output: dist/jeopardy/
```

### Serving Production Build Locally

```bash
# Install http-server globally
npm install -g http-server

# Serve from dist
cd dist/jeopardy
http-server -p 8080
```

---

## Common Development Tasks

### Adding a New Component

```bash
# Host component
ng generate component host/components/new-feature --standalone

# Board component
ng generate component board/components/new-display --standalone

# Shared component
ng generate component shared/components/reusable-widget --standalone
```

### Adding a New Service

```bash
ng generate service shared/services/new-service
```

### Adding a New Model

Create `src/app/shared/models/new-model.model.ts`:

```typescript
export interface NewModel {
  id: string;
  // ... fields
}
```

### Adding a Sync Event

1. Add event type to `SyncEventType` union in [sync-event.model.ts](file:///c%3A/Projects/Jeopardy/src/app/shared/models/sync-event.model.ts)
2. Add payload interface if needed
3. Add broadcast method to [sync.service.ts](file:///c%3A/Projects/Jeopardy/src/app/shared/services/sync.service.ts)
4. Add observable method for board subscription
5. Update [contracts/sync-protocol.md](./contracts/sync-protocol.md)

---

## Debugging Tips

### Viewing BroadcastChannel Messages

```javascript
// In browser console (both host and board windows):
const debug = new BroadcastChannel('jeopardy-sync');
debug.onmessage = (e) => console.log('SYNC:', e.data);
```

### Inspecting Game State

```typescript
// In host component or service:
console.log('Current state:', this.gameStateService.getCurrentState());
```

### Testing Buzz Detection

```typescript
// In BuzzerService:
console.log('Buzz detected:', {
  playerId: event.playerId,
  timestamp: event.timestamp,
  timeSinceEnable: event.timestamp - this.enabledTimestamp
});
```

### Simulating Board Disconnection

1. Open board display
2. In board's browser console: `location.reload()`
3. Verify BOARD_READY sent and STATE_SYNC received
4. Verify board displays current game state

---

## Configuration

### Angular Configuration

**File**: `angular.json`

Key settings:
- `outputPath`: "dist/jeopardy"
- `index`: "src/index.html"
- `main`: "src/main.ts"
- `styles`: ["src/styles.scss"]

### TypeScript Configuration

**File**: `tsconfig.json`

Key settings:
- `strict`: true (enforces strict type checking)
- `target`: "ES2022"
- `module`: "ES2022"

### ESLint Configuration

**File**: `.eslintrc.json`

Enforces Angular best practices and TypeScript rules

---

## Game Content Format

### Sample Game JSON Structure

**File**: `assets/game-sets/sample-game.json`

```json
{
  "id": "sample-001",
  "title": "Sample Jeopardy Game",
  "author": "Dev Team",
  "round1": {
    "categories": [
      {
        "id": "cat1",
        "title": "U.S. PRESIDENTS",
        "clues": [
          {
            "id": "clue1",
            "clueText": "This president was known for his top hat",
            "correctResponse": "Who is Abraham Lincoln?",
            "value": 200,
            "dailyDouble": false
          },
          // ... 4 more clues
        ]
      },
      // ... 5 more categories
    ]
  },
  "round2": { /* same structure, doubled values */ },
  "final": {
    "category": {
      "id": "final1",
      "title": "WORLD CAPITALS",
      "clue": { /* single clue */ }
    }
  }
}
```

**Validation**: See [data-model.md](./data-model.md) for complete schema

---

## Keyboard Shortcuts (Host)

Default buzzer keys:
- **Player 1**: `A`
- **Player 2**: `B`
- **Player 3**: `C`

(Configurable in player setup)

---

## Browser Compatibility

| Browser | Version | BroadcastChannel Support | Notes |
|---------|---------|-------------------------|-------|
| Chrome  | 54+     | ✅ Yes                  | Recommended |
| Firefox | 38+     | ✅ Yes                  | Fully supported |
| Edge    | 79+     | ✅ Yes                  | Chromium-based |
| Safari  | 15.4+   | ✅ Yes                  | Requires macOS 12+ |

**Fallback**: If BroadcastChannel unavailable, app uses `window.postMessage()`

---

## Common Issues

### Issue: Board not syncing with host

**Solution**:
1. Ensure both windows are from same origin (`localhost:4200`)
2. Check browser console for BroadcastChannel errors
3. Verify SyncService initialized in both components
4. Try refreshing board window (triggers STATE_SYNC request)

### Issue: Buzzer not detecting keypresses

**Solution**:
1. Ensure host window has focus
2. Verify buzzer enabled (check host UI state)
3. Check player key assignments (no conflicts)
4. Look for console logs in BuzzerService

### Issue: Game content validation fails

**Solution**:
1. Verify JSON file has exactly 6 categories per round
2. Check each category has exactly 5 clues
3. Ensure Round 1 has 1 Daily Double, Round 2 has 2
4. Validate clue values are positive integers
5. Review detailed error messages in validation result

---

## Next Steps

1. **Read Architecture Docs**:
   - [data-model.md](./data-model.md) - Complete data structures
   - [contracts/sync-protocol.md](./contracts/sync-protocol.md) - Communication protocol
   - [contracts/service-interfaces.md](./contracts/service-interfaces.md) - Service APIs

2. **Explore Codebase**:
   - Start with `host.component.ts` to see control flow
   - Review `game-state.service.ts` for state management
   - Examine `sync.service.ts` for synchronization logic

3. **Try Modifications**:
   - Add a new game rule toggle
   - Create a custom clue board theme
   - Implement a timer feature

4. **Run Manual Tests**:
   - Complete game flow (setup → round1 → round2 → final)
   - Board reconnection scenarios
   - Multi-buzz detection
   - Daily Double wager validation

---

## Getting Help

- **Constitution**: See [.specify/memory/constitution.md](../../.specify/memory/constitution.md) for architecture principles
- **Spec**: See [spec.md](./spec.md) for complete requirements
- **Research**: See [research.md](./research.md) for technology decisions
- **Issues**: Check for existing issues or create new one in repo

---

## Glossary

- **BroadcastChannel**: Browser API for same-origin cross-window messaging
- **Daily Double**: Special clue where only selecting contestant answers with wager
- **Final Jeopardy**: Final round where all contestants wager and answer simultaneously
- **Game Phase**: Current state of game (setup, round1, round2, final phases, complete)
- **Game Set**: Complete game content (2 regular rounds + 1 final round)
- **Lockout**: Preventing a contestant from buzzing again after incorrect response
- **State Sync**: Process of updating board display with host's authoritative game state

---

**Last Updated**: 2025-12-14  
**Version**: 1.0.0
