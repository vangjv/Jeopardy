<!--
Sync Impact Report - 2025-12-14

Version Change: None → 1.0.0
Type: Initial Constitution Creation
Principles Established: 5 core principles for Angular Jeopardy game application
Sections Created: Core Principles, Technical Standards, Development Workflow, Governance
Templates Status:
  ✅ spec-template.md - aligned with user story prioritization
  ✅ plan-template.md - aligned with Angular project structure
  ✅ tasks-template.md - aligned with story-driven task organization
Follow-up: None - all placeholders filled

Rationale for v1.0.0: Initial constitution establishing foundational governance for dual-window 
synchronized game application with Angular best practices.
-->

# Jeopardy Game Application Constitution

## Core Principles

### I. Component-Based Architecture

Angular components MUST be:
- **Single-responsibility**: Each component serves one clear UI or logical purpose
- **Self-contained**: Components own their templates, styles, and logic
- **Reusable**: Built to work across both host and board UIs where applicable
- **Standalone**: Prefer standalone components (Angular 19+ pattern) over NgModules

**Rationale**: Component isolation enables independent testing, parallel development, and reduces coupling. The dual-window nature of this application requires components that can be composed into different contexts (host vs board).

### II. Single Source of Truth (State Management)

The application state MUST follow these rules:
- **Host ownership**: The `/host` route owns the authoritative `GameState`
- **Unidirectional flow**: State changes flow host → board, never board → host (except sync requests)
- **Immutability**: State updates use immutable patterns; no direct mutation
- **Event-driven sync**: State changes trigger explicit events via BroadcastChannel/postMessage
- **Recovery resilience**: Board MUST be able to request and receive full state after disconnection

**Rationale**: The dual-window synchronized architecture requires clear ownership to prevent state conflicts. Host-as-authority simplifies debugging and ensures consistency.

### III. Offline-First & No Backend

The application MUST:
- **Function without network**: All game logic executes client-side within a single browser instance
- **Self-contained data**: Game content (clues, categories) loaded via JSON imports or file upload
- **Zero server calls**: No API dependencies for MVP functionality
- **Browser-only sync**: Use BroadcastChannel (primary) and window.postMessage (fallback) for multi-window communication
- **Local validation**: All game rule enforcement happens in-browser

**Rationale**: Eliminates deployment complexity and network latency for MVP. Supports offline play and simplifies testing.

### IV. Type Safety & Validation

TypeScript MUST be used to enforce:
- **Strict mode enabled**: `"strict": true` in tsconfig.json
- **Interface-driven design**: Define interfaces for `GameState`, `Player`, `Clue`, `Category`, events
- **Runtime validation**: Validate imported game content against schema; surface errors gracefully (never crash)
- **Null safety**: Explicit handling of undefined/null (no implicit anys)
- **Type guards**: Use type predicates for discriminated unions (e.g., `phase` discriminators)

**Rationale**: Prevents entire classes of bugs in complex state management and multi-window synchronization scenarios.

### V. Responsive & Display-Optimized

The board UI (contestant/audience view) MUST:
- **Optimize for large displays**: Target 1080p minimum, 4K preferred
- **Use responsive units**: CSS variables, rem/em, viewport units over fixed pixels
- **Support host on smaller screens**: Host console usable on laptop screens (1366×768+)
- **Test dual-window layout**: Verify appearance when windows span different displays
- **Maintain readability**: High contrast, large fonts for clues visible from distance

**Rationale**: The board view is intended for a second screen or projector; host view is a control console. Different constraints require different optimizations.

## Technical Standards

### Framework & Tooling

- **Angular Version**: 19+ (leveraging standalone components, signals, improved reactivity)
- **Language**: TypeScript 5.9+
- **UI Library**: Angular Material (optional for host controls; custom styling for board)
- **Layout**: ngx-layout or CSS Grid/Flexbox for responsive layouts
- **Build Tool**: Angular CLI (webpack under the hood)
- **Linting**: ESLint with Angular-specific rules
- **Formatting**: Prettier (already configured in package.json)

### Project Structure

```
src/
├── app/
│   ├── host/                    # Host console route & components
│   │   ├── host.component.ts
│   │   ├── host.component.html
│   │   └── components/          # Host-specific UI pieces
│   ├── board/                   # Board display route & components
│   │   ├── board.component.ts
│   │   ├── board.component.html
│   │   └── components/          # Board-specific UI pieces
│   ├── shared/                  # Shared across host & board
│   │   ├── components/          # Reusable UI components
│   │   ├── models/              # TypeScript interfaces (GameState, Player, Clue, etc.)
│   │   ├── services/            # State, sync, validation services
│   │   └── utils/               # Helper functions
│   ├── app.routes.ts            # /host and /board routes
│   └── app.config.ts            # Root config
├── assets/                      # Game content JSON, images, audio
└── styles.scss                  # Global styles
```

### Game Content Schema

Game sets MUST conform to this structure:

```typescript
interface GameSet {
  round1: Round;        // Jeopardy (6 categories × 5 clues)
  round2: Round;        // Double Jeopardy (6 categories × 5 clues)
  final: FinalRound;    // 1 category × 1 clue
}

interface Round {
  categories: Category[]; // length === 6
}

interface Category {
  id: string;
  title: string;
  clues: Clue[];          // length === 5
}

interface Clue {
  id: string;
  clueText: string;
  correctResponse: string;
  value: number;
  dailyDouble?: boolean;
  media?: { type: 'image' | 'audio' | 'video'; url: string };
}
```

Validation errors MUST be surfaced to the host with specific line/clue references; the application MUST NOT crash on invalid data.

### State Synchronization Protocol

Events published via BroadcastChannel on channel `"jeopardy-sync"`:

| Event Type            | Direction   | Payload                                  |
|-----------------------|-------------|------------------------------------------|
| `STATE_SYNC`          | Host → Board| Full `GameState` object                  |
| `ROUND_CHANGED`       | Host → Board| `{ round: 'J' | 'DJ' | 'FJ' }`           |
| `CLUE_SELECTED`       | Host → Board| `{ clueId, categoryId, value, phase }`   |
| `BUZZ_ENABLED`        | Host → Board| `{ enabled: boolean }`                   |
| `BUZZ_LOCKED`         | Host → Board| `{ winnerPlayerId, timestamp }`          |
| `SCORES_UPDATED`      | Host → Board| `{ players: Player[] }`                  |
| `BOARD_READY`         | Board → Host| `{ requestSync: true }`                  |

Fallback to `window.opener.postMessage()` if BroadcastChannel unavailable.

## Development Workflow

### Feature Development

1. **Specification**: Update `spec.md` with new requirements or changes
2. **Design**: Create interfaces/models in `src/app/shared/models/`
3. **Implement**: Build components, services following architecture principles
4. **Manual Test**: Verify in dual-window setup (npm start, open /board in popup)
5. **Validate**: Ensure no ESLint errors, Prettier formatting applied

### Testing Strategy (Optional for MVP)

When tests are written:
- **Unit tests**: Components, services, utilities (Jasmine/Karma as configured)
- **Integration tests**: State sync between host/board
- **Manual QA**: Dual-window scenarios, buzzer input, navigation guards

**Note**: Per project instructions, automated tests are deferred for MVP. Manual testing checklist required.

### Code Review Checklist

- [ ] Follows single-responsibility principle
- [ ] State changes immutable and event-driven
- [ ] TypeScript strict mode passes (no `any` without justification)
- [ ] Components standalone (no NgModule dependencies)
- [ ] Host/board sync events documented
- [ ] Game content validation handles errors gracefully
- [ ] Responsive styling verified (host + board viewports)

### Branching & Commits

- Feature branches from `main`: `feature/[description]`
- Commit messages follow Angular convention: `type(scope): message`
  - Types: `feat`, `fix`, `refactor`, `docs`, `style`, `chore`
  - Example: `feat(host): add daily double wager input`

## Governance

This constitution defines non-negotiable rules and standards for the Jeopardy Game Application.

### Compliance

- All code changes MUST align with Core Principles (I–V)
- Deviations require documented justification in PR description
- Technical Standards define the tech stack and structure; changes require team consensus
- Game content schema is versioned; breaking changes require migration tooling

### Amendment Process

1. Propose amendment with rationale in issue or discussion
2. Identify affected code, templates, or workflows
3. Increment version: MAJOR (principle removal/redefinition), MINOR (new principle/section), PATCH (clarification/typo)
4. Update constitution and propagate changes to `.specify/templates/`
5. Document in Sync Impact Report (HTML comment at top of this file)

### Conflict Resolution

In case of ambiguity:
1. Consult `spec.md` for functional requirements
2. Defer to Core Principles for architectural decisions
3. Prioritize user experience (responsiveness, sync reliability) over implementation convenience

**Version**: 1.0.0 | **Ratified**: 2025-12-14 | **Last Amended**: 2025-12-14
