# Research & Technology Decisions

**Feature**: Jeopardy-Style Quiz Game System  
**Date**: 2025-12-14  
**Status**: Complete

## Overview

This document captures research findings and technology decisions for implementing a dual-window synchronized Angular application for Jeopardy-style quiz games.

## Key Research Areas

### 1. Multi-Window Synchronization

**Decision**: BroadcastChannel API (primary) with window.postMessage fallback

**Rationale**:
- BroadcastChannel provides simple, low-latency communication between same-origin browser contexts
- Automatic message delivery to all listening contexts (broadcast pattern)
- Native browser API with wide support (Chrome 54+, Firefox 38+, Edge 79+, Safari 15.4+)
- No serialization overhead for structured cloneable data
- Simpler than SharedWorker or ServiceWorker approaches

**Alternatives Considered**:
- **LocalStorage events**: Rejected due to unreliable event firing, storage limitations, and synchronous I/O
- **SharedWorker**: Rejected as overly complex for simple state sync; adds worker lifecycle management
- **WebSocket/WebRTC**: Rejected as requires server infrastructure, violates offline-first constraint
- **window.opener.postMessage()**: Suitable only as fallback; requires parent-child window relationship

**Implementation Pattern**:
```typescript
// Host publishes state updates
const channel = new BroadcastChannel('jeopardy-sync');
channel.postMessage({ type: 'STATE_SYNC', payload: gameState });

// Board subscribes to updates
channel.onmessage = (event) => {
  if (event.data.type === 'STATE_SYNC') {
    this.gameState = event.data.payload;
  }
};
```

**Best Practices**:
- Use typed message interfaces for all events
- Include message type discriminator for pattern matching
- Implement request/response pattern for board reconnection (BOARD_READY → STATE_SYNC)
- Close channel on component destroy to prevent memory leaks
- Add error handling for postMessage serialization failures

**Reference**: [MDN BroadcastChannel API](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel)

---

### 2. First-Buzz Detection Accuracy

**Decision**: Keyboard event listener with high-resolution timestamps and client-side arbitration

**Rationale**:
- JavaScript event timestamps use DOMHighResTimeStamp (microsecond precision)
- Keyboard events fire immediately on key press in modern browsers
- Single-threaded event loop ensures deterministic event ordering
- No network round-trip eliminates latency variability

**Alternatives Considered**:
- **Server-side arbitration**: Rejected due to network latency (50-200ms), violates offline-first
- **WebRTC DataChannel**: Rejected as adds unnecessary complexity; still requires server for signaling
- **Hardware buzzers via USB HID**: Rejected for MVP; can be added later via WebUSB API

**Implementation Pattern**:
```typescript
@HostListener('window:keydown', ['$event'])
handleBuzzer(event: KeyboardEvent) {
  if (this.buzzerEnabled && !this.buzzLocked) {
    const playerId = this.keyBindings.get(event.code);
    if (playerId && !this.lockedOutPlayers.has(playerId)) {
      this.buzzLocked = true;
      this.firstBuzzTimestamp = event.timeStamp;
      this.winnerPlayerId = playerId;
      this.broadcastBuzzEvent(playerId, event.timeStamp);
    }
  }
}
```

**Best Practices**:
- Use event.code (physical key) instead of event.key (character) for consistency across layouts
- Prevent default browser behavior (e.g., Cmd+W close window) when buzzer keys are active
- Use event.timeStamp for ordering (not Date.now() which has lower precision)
- Validate key codes against configured bindings
- Implement lockout state to prevent double-buzzing

**Performance Target**: <10ms detection window achieved via synchronous event handling

**Reference**: [MDN KeyboardEvent.timeStamp](https://developer.mozilla.org/en-US/docs/Web/API/Event/timeStamp)

---

### 3. State Management Patterns

**Decision**: Service-based state management with RxJS Subjects/BehaviorSubjects

**Rationale**:
- Angular services provide singleton instances across components
- BehaviorSubject emits current value to new subscribers (important for board reconnection)
- RxJS observables integrate naturally with Angular's async pipe
- Immutable state updates prevent accidental mutations
- Simpler than NgRx/NGXS for this scale (60 clues, 2-3 contestants)

**Alternatives Considered**:
- **NgRx**: Rejected as overkill for single-user, client-only application
- **Signals (Angular 19)**: Considered for future refactor; RxJS chosen for initial implementation due to team familiarity
- **Direct component state**: Rejected due to duplication across host/board; requires manual sync logic

**Implementation Pattern**:
```typescript
@Injectable({ providedIn: 'root' })
export class GameStateService {
  private gameState$ = new BehaviorSubject<GameState>(initialState);
  
  getState(): Observable<GameState> {
    return this.gameState$.asObservable();
  }
  
  updateState(updater: (state: GameState) => GameState): void {
    const newState = updater(this.gameState$.value);
    this.gameState$.next(newState);
    this.syncService.broadcast('STATE_SYNC', newState);
  }
}
```

**Best Practices**:
- Use immer or spread operators for immutable updates
- Expose only observables to components (hide Subject)
- Implement state snapshot method for board reconnection
- Add state validation on updates
- Use typed interfaces for all state shapes

**Reference**: [Angular Services](https://angular.dev/guide/di/creating-injectable-service), [RxJS BehaviorSubject](https://rxjs.dev/api/index/class/BehaviorSubject)

---

### 4. Game Content Validation

**Decision**: JSON Schema validation via ajv library with detailed error reporting

**Rationale**:
- JSON Schema provides declarative validation rules
- ajv is fast (compiled validators), widely used, TypeScript-friendly
- Detailed error paths enable specific user feedback
- Schema serves as documentation for game content format
- Allows graceful degradation (warnings instead of crashes)

**Alternatives Considered**:
- **Zod**: Good alternative, slightly more TypeScript-native but larger bundle
- **Manual validation**: Rejected as error-prone and hard to maintain
- **TypeScript only**: Insufficient for runtime validation of imported JSON

**Implementation Pattern**:
```typescript
import Ajv from 'ajv';

const schema = {
  type: 'object',
  required: ['round1', 'round2', 'final'],
  properties: {
    round1: { $ref: '#/definitions/Round' },
    // ... schema definitions
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
          items: { $ref: '#/definitions/Category' }
        }
      }
    }
  }
};

const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(schema);

export function validateGameContent(data: unknown): ValidationResult {
  const valid = validate(data);
  return {
    valid,
    errors: validate.errors?.map(formatError) || []
  };
}
```

**Best Practices**:
- Compile schema once at service initialization
- Map ajv errors to user-friendly messages with file paths
- Allow "proceed anyway" option for warnings (e.g., non-standard values)
- Validate Daily Double counts (1 in Round 1, 2 in Round 2)
- Check for duplicate IDs and proper value progression

**Reference**: [ajv documentation](https://ajv.js.org/), [JSON Schema](https://json-schema.org/)

---

### 5. Responsive Layout Strategy

**Decision**: CSS Grid for board layout, Flexbox for controls, CSS custom properties for theming

**Rationale**:
- CSS Grid ideal for 6×5 clue board (fixed row/column structure)
- Flexbox better for variable-length control panels
- CSS variables enable easy theme switching (host vs board)
- Native CSS more performant than layout libraries for this use case
- Angular CDK Layout module for responsive breakpoints (optional)

**Alternatives Considered**:
- **ngx-layout (Flex Layout)**: In maintenance mode; Angular team recommends native CSS
- **Bootstrap**: Rejected as too heavyweight; conflicts with custom design needs
- **Tailwind CSS**: Good option but adds build complexity; vanilla CSS chosen for simplicity

**Implementation Pattern**:
```scss
// Board grid
.game-board {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  grid-template-rows: auto repeat(5, 1fr);
  gap: var(--grid-gap, 2px);
  height: 100vh;
  padding: var(--board-padding, 1rem);
}

.clue-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--clue-bg, #0c4da2);
  color: var(--clue-text, #fff);
  font-size: clamp(1.5rem, 3vw, 4rem);
  cursor: pointer;
  
  &.used {
    background: var(--used-bg, #1a1a1a);
    cursor: not-allowed;
  }
}
```

**Best Practices**:
- Use clamp() for responsive font sizing
- Define CSS variables at :root for global theming
- Use aspect-ratio for maintaining cell proportions
- Implement @media queries for portrait/landscape orientations
- Test on actual 1080p/4K displays, not just browser dev tools

**Reference**: [CSS Grid Layout](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout), [CSS Custom Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/--*)

---

### 6. Navigation Guards & Unsaved Changes

**Decision**: Angular CanDeactivate guard with browser beforeunload event

**Rationale**:
- CanDeactivate guard prevents accidental navigation within Angular routes
- beforeunload event catches browser/tab close attempts
- User confirmation dialog prevents data loss
- Standard Angular pattern for unsaved changes protection

**Implementation Pattern**:
```typescript
@Injectable({ providedIn: 'root' })
export class UnsavedChangesGuard implements CanDeactivate<HostComponent> {
  canDeactivate(component: HostComponent): boolean {
    if (component.gameInProgress()) {
      return confirm('A game is in progress. Exit anyway?');
    }
    return true;
  }
}

// In HostComponent
@HostListener('window:beforeunload', ['$event'])
handleUnload(event: BeforeUnloadEvent): void {
  if (this.gameInProgress()) {
    event.preventDefault();
    event.returnValue = ''; // Chrome requires returnValue
  }
}
```

**Best Practices**:
- Apply guard to host route only (board can refresh safely)
- Use standardized confirmation message
- Reset guard flag when game officially ends
- Test across browsers (some ignore custom messages)

**Reference**: [Angular CanDeactivate](https://angular.dev/api/router/CanDeactivate)

---

## Technology Stack Summary

| Layer | Technology | Version | Rationale |
|-------|-----------|---------|-----------|
| Framework | Angular | 19+ | Mature SPA framework, strong TypeScript support, standalone components |
| Language | TypeScript | 5.9+ | Type safety, excellent Angular integration, IDE support |
| UI Components | Angular Material | 17+ | Optional for host controls (buttons, inputs), custom for board |
| Layout | CSS Grid/Flexbox | Native | Performance, flexibility, no dependencies |
| State Management | RxJS | 7.8+ | Built into Angular, observable patterns, BehaviorSubject for replay |
| Validation | ajv | 8.12+ | Fast JSON Schema validation, detailed errors |
| Sync Protocol | BroadcastChannel | Native | Simple multi-window messaging, wide browser support |
| Build Tool | Angular CLI | 19+ | Standard Angular tooling, webpack bundling |
| Testing | Jasmine/Karma | Default | Included with Angular, sufficient for unit tests |

## Open Questions & Future Research

### Phase 1 Design Questions (to be resolved during design phase):
- What is the exact state shape for GameState interface?
- How should keyboard event handling interact with Angular's zone.js?
- Should we use OnPush change detection for board components?
- What is the optimal message size for BroadcastChannel to avoid serialization overhead?

### Potential Future Enhancements (out of current scope):
- WebUSB API for hardware buzzer integration
- Web Audio API for sound effects and audio clues
- IndexedDB for persistent game content library
- Angular Signals migration for reactive state (Angular 19+ feature)
- Accessibility (ARIA labels, keyboard navigation, screen reader support)

## References & Resources

- [Angular v19 Documentation](https://angular.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [BroadcastChannel API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel)
- [RxJS Documentation](https://rxjs.dev/)
- [Angular Material](https://material.angular.io/)
- [Web Performance Best Practices](https://web.dev/explore/fast)
- [JSON Schema Specification](https://json-schema.org/)
