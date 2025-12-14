# Implementation Plan: Jeopardy-Style Quiz Game System

**Branch**: `001-jeopardy-game-app` | **Date**: 2025-12-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-jeopardy-game-app/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Build a dual-window synchronized Angular application for running Jeopardy-style quiz games. The system includes a host control interface for managing game flow and a separate board display interface for contestants/audience. Features include contestant buzzer input via keyboard, score tracking, Daily Double and Final Jeopardy support, real-time synchronization via BroadcastChannel, and JSON-based game content import. The application is offline-first with no backend dependencies.

## Technical Context

**Language/Version**: TypeScript 5.9+ / Angular 19+  
**Primary Dependencies**: 
  - @angular/core, @angular/router (routing), @angular/forms (reactive forms)
  - @angular/material (optional, for host UI controls)
  - ngx-layout or native CSS Grid/Flexbox (responsive layouts)
**Storage**: Browser LocalStorage (optional for saved settings), in-memory state management with services  
**Testing**: Jasmine/Karma (configured via Angular CLI), manual dual-window QA for synchronization  
**Target Platform**: Modern web browsers (Chrome, Firefox, Edge, Safari) on desktop/laptop systems  
**Project Type**: Single-page Angular web application with dual-route architecture (/host and /board)  
**Performance Goals**: 
  - <10ms first-buzz detection accuracy for simultaneous buzzer input
  - <100ms synchronization latency between host and board display (local same-machine)
  - <2s board reconnection and state resync after disconnect
**Constraints**: 
  - Offline-capable after initial load (no network dependencies)
  - Board UI optimized for 1080p+ displays (readable from 10+ feet)
  - Host UI usable on laptop screens (1366×768+)
  - No backend infrastructure required
**Scale/Scope**: 
  - 2-3 contestants per game session
  - 60 total clues per game (2 rounds × 30 clues + 1 Final Jeopardy)
  - Single browser instance, multi-window/tab support via BroadcastChannel

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Constitution Reference**: See `.specify/memory/constitution.md` for detailed principles

- [x] **Component-Based Architecture**: Components follow single-responsibility, standalone pattern
  - ✓ Design uses separate host/ and board/ component trees
  - ✓ Shared components isolated in shared/components/
  - ✓ Each component serves one UI purpose (clue display, score board, buzzer indicator, etc.)
  - ✓ Standalone components per Angular 19 best practices

- [x] **Single Source of Truth**: Host owns state; unidirectional flow maintained; events documented
  - ✓ Host interface owns authoritative GameState
  - ✓ Board display receives state updates via BroadcastChannel events
  - ✓ Board never mutates state, only requests sync
  - ✓ State synchronization protocol documented in constitution

- [x] **Offline-First & No Backend**: No server dependencies; BroadcastChannel/postMessage for sync
  - ✓ All game logic executes client-side
  - ✓ Game content loaded via JSON import/file upload (no API calls)
  - ✓ BroadcastChannel primary, postMessage fallback for sync
  - ✓ No HTTP requests after initial page load

- [x] **Type Safety & Validation**: TypeScript strict mode; interfaces defined; runtime validation present
  - ✓ tsconfig.json uses strict mode
  - ✓ Interfaces for GameState, Player, Clue, Category, Round, sync events
  - ✓ Imported game content validated against schema with error reporting
  - ✓ No implicit any, explicit null/undefined handling

- [x] **Responsive & Display-Optimized**: Board UI optimized for 1080p+; host UI usable on laptop screens
  - ✓ Board display targets large screens (1080p min, 4K preferred)
  - ✓ Host console designed for laptop screens (1366×768+)
  - ✓ Responsive units (rem, viewport, CSS variables) for scaling
  - ✓ High contrast and large fonts for board display readability

**Gate Status**: ✅ PASS - All constitutional principles align with planned architecture. No deviations required.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

**Project Type**: Angular Single-Page Application (dual-window synchronized UI)

```text
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

**Structure Decision**: Angular application with route-based feature separation (host vs board). 
Shared models/services ensure consistent state management. Per constitution, components are standalone.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |

## Post-Design Constitution Re-Check

**Date**: 2025-12-14  
**Status**: ✅ PASS

After completing Phase 1 design (data model, contracts, quickstart), re-evaluation confirms:

### Component-Based Architecture
- ✓ data-model.md defines clear entity boundaries (GameState, Player, Clue, etc.)
- ✓ service-interfaces.md shows single-responsibility services
- ✓ quickstart.md demonstrates component organization (host/, board/, shared/)
- **Verdict**: No violations. Each component has clear purpose.

### Single Source of Truth
- ✓ GameState interface clearly owned by host
- ✓ sync-protocol.md documents unidirectional flow (host → board)
- ✓ Board BOARD_READY request pattern for reconnection
- ✓ No board-initiated state mutations
- **Verdict**: No violations. Clean unidirectional architecture.

### Offline-First & No Backend
- ✓ All state managed in-memory via services
- ✓ Game content loaded via JSON file import
- ✓ BroadcastChannel for sync (browser-native, no network)
- ✓ Optional LocalStorage for preferences only
- **Verdict**: No violations. Fully offline-capable.

### Type Safety & Validation
- ✓ data-model.md defines complete TypeScript interfaces
- ✓ ValidationService interface provides runtime validation
- ✓ JSON Schema for game content import validation
- ✓ Type guards for discriminated unions (GamePhase)
- **Verdict**: No violations. Strong typing throughout.

### Responsive & Display-Optimized
- ✓ quickstart.md documents viewport targets (1080p+ board, 1366×768+ host)
- ✓ research.md specifies CSS Grid for board, Flexbox for controls
- ✓ CSS variables and clamp() for responsive scaling
- **Verdict**: No violations. Display optimization planned.

**Final Gate Status**: ✅ PASS - Design maintains constitutional compliance. Ready for Phase 2 (task breakdown).

---

## Phase 0 Artifacts

- ✅ [research.md](./research.md) - Technology decisions and best practices
  - Multi-window synchronization (BroadcastChannel)
  - First-buzz detection (keyboard events with high-res timestamps)
  - State management (RxJS BehaviorSubjects)
  - Game content validation (ajv + JSON Schema)
  - Responsive layout (CSS Grid/Flexbox)
  - Navigation guards (CanDeactivate)

## Phase 1 Artifacts

- ✅ [data-model.md](./data-model.md) - Complete TypeScript interfaces
  - GameState, Player, Clue, Category, Round, GameSet
  - SyncEvent types and payloads
  - Validation schemas
  - Computed values and type guards

- ✅ [contracts/sync-protocol.md](./contracts/sync-protocol.md) - BroadcastChannel message protocol
  - 12 message types defined
  - Payload schemas for each event
  - Error handling patterns
  - Performance targets (<100ms sync latency)

- ✅ [contracts/service-interfaces.md](./contracts/service-interfaces.md) - Service APIs
  - GameStateService: State management
  - SyncService: BroadcastChannel abstraction
  - ValidationService: Content validation
  - BuzzerService: Keyboard input handling
  - GameContentService: File I/O

- ✅ [quickstart.md](./quickstart.md) - Developer onboarding guide
  - 5-minute quick start
  - Architecture overview
  - Project structure walkthrough
  - Common workflows and debugging tips

## Next Steps

**Command**: `/speckit.tasks` to generate Phase 2 task breakdown

This will create `tasks.md` with:
- Story-driven task organization
- Implementation order based on dependencies
- Acceptance criteria for each task
- Estimated complexity

**Branch**: `001-jeopardy-game-app` is ready for implementation once tasks are defined.
