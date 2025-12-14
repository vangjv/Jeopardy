# Tasks: Jeopardy-Style Quiz Game System

**Input**: Design documents from `/specs/001-jeopardy-game-app/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: No explicit tests requested in specification - focusing on implementation tasks only.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Verify Angular 19 project structure and configuration in angular.json
- [X] T002 Install required dependencies (@angular/material, ajv for validation) via npm
- [X] T003 [P] Configure TypeScript strict mode in tsconfig.json
- [X] T004 [P] Create global styles structure in src/styles.scss (CSS variables, theme colors)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 [P] Create GameState interface in src/app/shared/models/game-state.model.ts
- [X] T006 [P] Create Player interface in src/app/shared/models/player.model.ts
- [X] T007 [P] Create GameSet, Round, Category, Clue interfaces in src/app/shared/models/game-content.model.ts
- [X] T008 [P] Create SyncEvent types in src/app/shared/models/sync-event.model.ts
- [X] T009 [P] Create GameRules, ActiveClue, FinalJeopardyState interfaces in src/app/shared/models/game-state.model.ts
- [X] T010 [P] Create ValidationResult, ValidationError interfaces in src/app/shared/models/validation.model.ts
- [X] T011 Implement GameStateService with state management in src/app/shared/services/game-state.service.ts
- [X] T012 [P] Implement SyncService with BroadcastChannel wrapper in src/app/shared/services/sync.service.ts
- [X] T013 [P] Implement ValidationService with ajv JSON Schema validation in src/app/shared/services/validation.service.ts
- [X] T014 [P] Create JSON Schema for game content validation in src/app/shared/schemas/game-set.schema.ts
- [X] T015 [P] Implement utility functions (wager calculator, type guards) in src/app/shared/utils/
- [X] T016 Configure app routes (/host and /board) in src/app/app.routes.ts
- [X] T017 [P] Create navigation guard for unsaved changes in src/app/shared/guards/can-deactivate.guard.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Host Controls Basic Game Flow (Priority: P1) 🎯 MVP

**Goal**: Enable host to run basic quiz game with contestant setup, clue selection, buzzer detection, and score adjudication

**Independent Test**: Set up 2-3 contestants, display clue board, select a clue, have contestant buzz in, adjudicate response, verify score changes correctly

### Implementation for User Story 1

- [X] T018 [P] [US1] Create HostComponent main container in src/app/host/host.component.ts
- [X] T019 [P] [US1] Create BoardComponent main container in src/app/board/board.component.ts
- [X] T020 [P] [US1] Create PlayerSetupComponent for contestant configuration in src/app/host/components/player-setup/player-setup.component.ts
- [X] T021 [P] [US1] Create GameBoardControlComponent for clue selection in src/app/host/components/game-board-control/game-board-control.component.ts
- [X] T022 [P] [US1] Create BuzzerService for keyboard event handling in src/app/shared/services/buzzer.service.ts
- [X] T023 [P] [US1] Create BuzzerPanelComponent for buzz detection display in src/app/host/components/buzzer-panel/buzzer-panel.component.ts
- [X] T024 [P] [US1] Create ScoreAdjudicationComponent for correct/incorrect buttons in src/app/host/components/score-adjudication/score-adjudication.component.ts
- [X] T025 [P] [US1] Create ClueBoardComponent for board display in src/app/board/components/clue-board/clue-board.component.ts
- [X] T026 [P] [US1] Create ClueDisplayComponent for full-screen clue view in src/app/board/components/clue-display/clue-display.component.ts
- [X] T027 [P] [US1] Create ScoreDisplayComponent for contestant scores in src/app/board/components/score-display/score-display.component.ts
- [X] T028 [P] [US1] Create BuzzIndicatorComponent for buzz-in display in src/app/board/components/buzz-indicator/buzz-indicator.component.ts
- [X] T029 [US1] Implement contestant configuration logic (add/remove players, assign buzzer keys) in PlayerSetupComponent
- [X] T030 [US1] Implement clue selection logic in GameBoardControlComponent with used clue marking
- [X] T031 [US1] Implement buzzer key detection with timestamp ordering in BuzzerService
- [X] T032 [US1] Wire buzzer events to GameStateService.lockBuzz() in HostComponent
- [X] T033 [US1] Implement score adjudication handlers (correct/incorrect) in ScoreAdjudicationComponent
- [X] T034 [US1] Connect score updates to GameStateService.updatePlayerScore() in HostComponent
- [X] T035 [US1] Implement clue board rendering with 6 categories × 5 values in ClueBoardComponent
- [X] T036 [US1] Implement clue selection display with categoryTitle in ClueDisplayComponent
- [X] T037 [US1] Add correct response reveal logic in ClueDisplayComponent (host interface only initially)
- [X] T038 [US1] Style host interface layout with Angular Material components in src/app/host/host.component.scss
- [X] T039 [US1] Style board display for 1080p+ readability in src/app/board/board.component.scss

**Checkpoint**: At this point, User Story 1 should be fully functional - basic game playable end-to-end

---

## Phase 4: User Story 2 - Synchronized Display for Audience/Contestants (Priority: P1)

**Goal**: Enable real-time board display synchronization with host actions via BroadcastChannel

**Independent Test**: Open board display in second window, perform game actions from host, verify board updates automatically without refresh

### Implementation for User Story 2

- [X] T040 [US2] Initialize SyncService as 'host' role in HostComponent.ngOnInit()
- [X] T041 [US2] Initialize SyncService as 'board' role in BoardComponent.ngOnInit()
- [X] T042 [US2] Implement STATE_SYNC broadcast in GameStateService on state updates
- [X] T043 [US2] Implement BOARD_READY request handler in HostComponent to respond with full state
- [X] T044 [US2] Subscribe to onStateSync() in BoardComponent to receive full state updates
- [X] T045 [US2] Implement CLUE_SELECTED broadcast when host selects clue in GameStateService
- [X] T046 [US2] Subscribe to onClueSelected() in BoardComponent to display clue
- [X] T047 [US2] Implement CLUE_CLEARED broadcast when host closes clue in GameStateService
- [X] T048 [US2] Subscribe to onClueCleared() in BoardComponent to return to board view
- [X] T049 [US2] Implement BUZZ_ENABLED broadcast in GameStateService
- [X] T050 [US2] Subscribe to onBuzzEnabled() in BoardComponent to show/hide buzz indicator
- [X] T051 [US2] Implement BUZZ_LOCKED broadcast in GameStateService
- [X] T052 [US2] Subscribe to onBuzzLocked() in BoardComponent to highlight contestant
- [X] T053 [US2] Implement BUZZ_RESET broadcast in GameStateService
- [X] T054 [US2] Subscribe to onBuzzReset() in BoardComponent to clear buzz state
- [X] T055 [US2] Implement SCORES_UPDATED broadcast in GameStateService
- [X] T056 [US2] Subscribe to onScoresUpdated() in BoardComponent to update score displays
- [X] T057 [US2] Add popup window launch button in HostComponent to open /board route
- [X] T058 [US2] Implement BOARD_READY message send in BoardComponent.ngOnInit() to request state sync
- [X] T059 [US2] Handle board reconnection/refresh with full state resync in BoardComponent
- [X] T060 [US2] Add connection status indicator in BoardComponent showing sync health

**Checkpoint**: At this point, User Stories 1 AND 2 should work - full synchronized dual-window game

---

## Phase 5: User Story 3 - Keyboard-Based Buzzer System (Priority: P1)

**Goal**: Enhance buzzer system with validation, lockout management, and conflict detection

**Independent Test**: Configure different keys for each contestant, display clue, enable buzzers, press multiple keys simultaneously, verify first-buzz detection and lockout behavior

### Implementation for User Story 3

- [ ] T061 [US3] Add buzzer key validation in ValidationService.validateBuzzerKey() to detect conflicts
- [ ] T062 [US3] Implement real-time key conflict checking in PlayerSetupComponent during key assignment
- [ ] T063 [US3] Add first-buzz detection with DOMHighResTimeStamp comparison in BuzzerService
- [ ] T064 [US3] Implement buzz lock logic to prevent duplicate buzzes in BuzzerService
- [ ] T065 [US3] Add lockout tracking in GameStateService (lockedOutPlayerIds Set)
- [ ] T066 [US3] Implement contestant lockout on incorrect response (configurable) in ScoreAdjudicationComponent
- [ ] T067 [US3] Add lockout validation in BuzzerService to prevent locked-out contestants from buzzing
- [ ] T068 [US3] Implement buzz reset functionality in GameStateService.resetBuzz() to clear locks
- [ ] T069 [US3] Add lockout reset button in BuzzerPanelComponent to clear all lockouts
- [ ] T070 [US3] Update BuzzIndicatorComponent to show lockout status on board display
- [ ] T071 [US3] Add visual indicators for locked-out contestants in ScoreDisplayComponent

**Checkpoint**: All P1 user stories complete - core game fully functional with robust buzzer system

---

## Phase 6: User Story 4 - Daily Double Special Round (Priority: P2)

**Goal**: Implement Daily Double clue type with wager validation and single-contestant answer

**Independent Test**: Mark clue as Daily Double, have contestant select it, enter wager, present clue, adjudicate with wagered amount affecting score

### Implementation for User Story 4

- [ ] T072 [P] [US4] Add Daily Double UI indicator in ClueDisplayComponent for both host and board
- [ ] T073 [P] [US4] Create DailyDoubleWagerComponent for wager input in src/app/host/components/daily-double-wager/daily-double-wager.component.ts
- [ ] T074 [US4] Implement Daily Double detection in GameStateService.selectClue() when clue.dailyDouble is true
- [ ] T075 [US4] Disable buzzing for non-selecting contestants in GameStateService when Daily Double active
- [ ] T076 [US4] Implement wager validation logic in ValidationService.validateDailyDoubleWager()
- [ ] T077 [US4] Add wager min/max calculation (negative score handling) in shared/utils/wager-calculator.ts
- [ ] T078 [US4] Wire wager input to GameStateService.setDailyDoubleWager() in DailyDoubleWagerComponent
- [ ] T079 [US4] Modify score adjudication to use dailyDoubleWager instead of clue.value in ScoreAdjudicationComponent
- [ ] T080 [US4] Broadcast DAILY_DOUBLE_WAGER sync event in SyncService
- [ ] T081 [US4] Display Daily Double indicator and wager on board (if rules allow) in ClueDisplayComponent

**Checkpoint**: Daily Double functionality complete and integrated with core game

---

## Phase 7: User Story 5 - Multiple Round Support (Priority: P2)

**Goal**: Enable Round 1 and Round 2 (Double Jeopardy) with different categories and doubled values

**Independent Test**: Complete all Round 1 clues, transition to Round 2, verify new categories and doubled values display correctly

### Implementation for User Story 5

- [ ] T082 [P] [US5] Add round transition UI controls in HostComponent (Start Round 1, Start Round 2)
- [ ] T083 [P] [US5] Create RoundTransitionComponent for round change display in src/app/board/components/round-transition/round-transition.component.ts
- [ ] T084 [US5] Implement GameStateService.startRound(roundType) method to transition rounds
- [ ] T085 [US5] Implement round completion detection in GameStateService.isRoundComplete()
- [ ] T086 [US5] Load Round 2 categories and clues from gameSet.round2 in GameStateService
- [ ] T087 [US5] Update ClueBoardComponent to display current round's categories and values
- [ ] T088 [US5] Handle doubled values (400-2000) for Round 2 in ClueBoardComponent
- [ ] T089 [US5] Broadcast ROUND_CHANGED sync event in SyncService
- [ ] T090 [US5] Subscribe to onRoundChanged() in BoardComponent to update display
- [ ] T091 [US5] Reset usedClueIds when transitioning rounds in GameStateService
- [ ] T092 [US5] Add visual round indicator (Round 1 / Double Jeopardy) in BoardComponent header

**Checkpoint**: Multiple rounds working - game now supports full 2-round progression

---

## Phase 8: User Story 6 - Final Jeopardy Round (Priority: P2)

**Goal**: Implement Final Jeopardy with category reveal, wager collection, simultaneous answers, and winner determination

**Independent Test**: Start Final Jeopardy after Round 2, enter wagers for all contestants, display clue, adjudicate responses, verify final scores and winner

### Implementation for User Story 6

- [ ] T093 [P] [US6] Create FinalJeopardyComponent for Final Jeopardy orchestration in src/app/host/components/final-jeopardy/final-jeopardy.component.ts
- [ ] T094 [P] [US6] Create FinalJeopardyDisplayComponent for board display in src/app/board/components/final-jeopardy-display/final-jeopardy-display.component.ts
- [ ] T095 [US6] Implement GameStateService.startFinalJeopardy() to transition to final-category phase
- [ ] T096 [US6] Load Final Jeopardy category and clue from gameSet.final in GameStateService
- [ ] T097 [US6] Implement wager collection UI in FinalJeopardyComponent (one input per contestant)
- [ ] T098 [US6] Implement wager validation in ValidationService.validateFinalWager() (0 to player score)
- [ ] T099 [US6] Wire wagers to GameStateService.setFinalWager(playerId, wager) in FinalJeopardyComponent
- [ ] T100 [US6] Implement phase transitions: final-category → final-wager → final-clue → final-response → final-reveal
- [ ] T101 [US6] Add response input fields in FinalJeopardyComponent for collecting contestant responses
- [ ] T102 [US6] Wire responses to GameStateService.setFinalResponse(playerId, response) in FinalJeopardyComponent
- [ ] T103 [US6] Implement adjudication UI in FinalJeopardyComponent (correct/incorrect per contestant)
- [ ] T104 [US6] Wire adjudication to GameStateService.adjudicateFinalResponse(playerId, correct) in FinalJeopardyComponent
- [ ] T105 [US6] Calculate final scores and determine winner in GameStateService.getWinner()
- [ ] T106 [US6] Broadcast FINAL_PHASE_CHANGED sync events in SyncService for each Final Jeopardy phase
- [ ] T107 [US6] Subscribe to onFinalPhaseChanged() in BoardComponent to update Final Jeopardy display
- [ ] T108 [US6] Display category reveal in FinalJeopardyDisplayComponent
- [ ] T109 [US6] Display final clue in FinalJeopardyDisplayComponent (hide responses until reveal)
- [ ] T110 [US6] Implement final reveal display showing responses, wagers, and winner in FinalJeopardyDisplayComponent
- [ ] T111 [US6] Broadcast WINNER_ANNOUNCED sync event in SyncService
- [ ] T112 [US6] Subscribe to onWinnerAnnounced() in BoardComponent to highlight winner

**Checkpoint**: Full game now playable from setup through Final Jeopardy with winner determination

---

## Phase 9: User Story 7 - Configurable Game Rules (Priority: P3)

**Goal**: Add customizable game rules for penalty behavior, lockouts, timers, and visibility settings

**Independent Test**: Toggle various rule settings before game, play through scenarios, verify configured rules are applied

### Implementation for User Story 7

- [ ] T113 [P] [US7] Create GameRulesComponent for rules configuration in src/app/host/components/game-rules/game-rules.component.ts
- [ ] T114 [US7] Add rules configuration UI in GameRulesComponent (toggles for each rule setting)
- [ ] T115 [US7] Implement GameStateService.updateRules(rules) to modify game configuration
- [ ] T116 [US7] Add wrongAnswerPenalty rule check in ScoreAdjudicationComponent (conditionally subtract points)
- [ ] T117 [US7] Add lockoutWrongResponder rule check in ScoreAdjudicationComponent (conditionally add to lockouts)
- [ ] T118 [US7] Add showWagersOnBoard rule check in DailyDoubleWagerComponent and FinalJeopardyComponent
- [ ] T119 [US7] Conditionally display wagers on board in ClueDisplayComponent and FinalJeopardyDisplayComponent based on rules
- [ ] T120 [US7] Add autoRevealResponse rule to automatically show correct response on adjudication
- [ ] T121 [US7] Add buzzerTimerSeconds rule with countdown display in BuzzerPanelComponent (optional)
- [ ] T122 [US7] Add responseTimerSeconds rule with countdown display (optional)
- [ ] T123 [US7] Implement GameRules persistence to localStorage in GameStateService.saveRules() with JSON serialization
- [ ] T124 [US7] Implement GameRules loading from localStorage in GameStateService.loadRules() on app initialization
- [ ] T124a [US7] Wire rules loading to HostComponent.ngOnInit() to restore saved preferences

**Checkpoint**: Game rules fully configurable - system adaptable to different gameplay styles

---

## Phase 10: User Story 8 - Import Custom Game Content (Priority: P3)

**Goal**: Enable import of custom game content via JSON file upload with validation and error reporting

**Independent Test**: Create game content JSON with 2 rounds + Final Jeopardy, import it, run complete game using imported content

### Implementation for User Story 8

- [ ] T125 [P] [US8] Create GameContentService for file I/O in src/app/shared/services/game-content.service.ts
- [ ] T126 [P] [US8] Create GameImportComponent for file upload UI in src/app/host/components/game-import/game-import.component.ts
- [ ] T127 [US8] Implement file selection and read logic in GameImportComponent
- [ ] T128 [US8] Wire file content to ValidationService.validateGameSet() in GameImportComponent
- [ ] T129 [US8] Implement comprehensive JSON Schema in src/app/shared/schemas/game-set.schema.ts
- [ ] T130 [US8] Add validation for 6 categories × 5 clues per round in ValidationService
- [ ] T131 [US8] Add validation for correct value assignments (200-1000, 400-2000) in ValidationService
- [ ] T132 [US8] Add validation for Daily Double count (1 in Round 1, 2 in Round 2) in ValidationService
- [ ] T133 [US8] Add validation for Final Jeopardy structure (1 category, 1 clue) in ValidationService
- [ ] T134 [US8] Display validation errors in GameImportComponent with specific error messages and paths
- [ ] T135 [US8] Display validation warnings with proceed/cancel confirmation dialog in GameImportComponent
- [ ] T136 [US8] Load validated game content into GameStateService on successful import
- [ ] T137 [US8] Add media URL validation in ValidationService.validateMediaUrl() for image/audio/video
- [ ] T138 [US8] Display media (images, audio, video) in ClueDisplayComponent with accessibility support (alt text for images, captions/transcripts for audio/video per WCAG 2.1 Level AA)
- [ ] T139 [US8] Handle media loading errors gracefully in ClueDisplayComponent with accessible error messages
- [ ] T140 [US8] Create sample game content JSON in src/assets/game-sets/sample-game.json
- [ ] T141 [US8] Add export game content functionality in GameContentService (optional)

**Checkpoint**: Custom game content fully supported - system now reusable for any trivia content

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T142 [P] Add CORRECT_RESPONSE_REVEALED sync event implementation in SyncService
- [ ] T143 [P] Implement correct response reveal on board display in ClueDisplayComponent
- [ ] T144 [P] Add manual score adjustment UI in HostComponent
- [ ] T145 [P] Wire manual score adjustment to GameStateService.setPlayerScore()
- [ ] T146 [P] Add clue used/unused override controls in GameBoardControlComponent
- [ ] T147 [P] Implement navigation guard warning for active games in CanDeactivateGuard
- [ ] T148 [P] Add game session export/import functionality in GameStateService
- [ ] T149 [P] Add control player indicator in ClueBoardComponent showing who selects next
- [ ] T150 [P] Implement automatic control player rotation after clue completion in GameStateService
- [ ] T151 [P] Add manual control player override in HostComponent
- [ ] T152 [P] Style improvements for board display (CSS Grid layout, animations) in src/app/board/board.component.scss
- [ ] T153 [P] Style improvements for host interface (Angular Material theming) in src/app/host/host.component.scss
- [ ] T154 [P] Add keyboard shortcuts documentation in host interface
- [ ] T155 [P] Add error boundary handling for BroadcastChannel failures with fallback messaging
- [ ] T155a [P] Implement global Angular ErrorHandler in src/app/shared/services/error-handler.service.ts for uncaught exceptions with user-friendly error display
- [ ] T156 [P] Implement connection health monitoring in SyncService
- [ ] T157 [P] Add performance logging for buzz detection timing
- [ ] T158 [P] Optimize state sync payload size (only send deltas if possible)
- [ ] T159 [P] Add loading states and spinners for game content import
- [ ] T160 [P] Add accessibility improvements (ARIA labels, keyboard navigation) throughout components
- [ ] T161 Run quickstart.md validation - verify all workflows documented work correctly
- [ ] T162 Create comprehensive README.md in project root with setup and usage instructions
- [ ] T163 Code cleanup and refactoring - remove console.logs, organize imports

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-10)**: All depend on Foundational phase completion
  - P1 stories (US1, US2, US3) should be completed first - these form the MVP
  - P2 stories (US4, US5, US6) add strategic game features
  - P3 stories (US7, US8) add configurability and content management
- **Polish (Phase 11)**: Depends on desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational - Integrates with US1 but independently testable
- **User Story 3 (P1)**: Can start after Foundational - Enhances US1 buzzer system
- **User Story 4 (P2)**: Depends on US1 completion (uses clue selection, scoring, and buzzer infrastructure)
- **User Story 5 (P2)**: Depends on US1 completion (extends basic game to multiple rounds)
- **User Story 6 (P2)**: Depends on US5 completion (Final Jeopardy follows Round 2)
- **User Story 7 (P3)**: Can start after Foundational - Adds configuration to existing features
- **User Story 8 (P3)**: Can start after Foundational - Provides game content loading for all stories

### Within Each User Story

- Models before services
- Services before components
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, US1/US2/US3 tasks marked [P] can start in parallel (if team capacity allows)
- Within each user story, tasks marked [P] can run in parallel
- Polish phase tasks marked [P] can all run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all model files together:
Task T020: "Create PlayerSetupComponent for contestant configuration"
Task T021: "Create GameBoardControlComponent for clue selection"
Task T022: "Create BuzzerService for keyboard event handling"
Task T023: "Create BuzzerPanelComponent for buzz detection display"
Task T024: "Create ScoreAdjudicationComponent for correct/incorrect buttons"

# Launch all board display components together:
Task T025: "Create ClueBoardComponent for board display"
Task T026: "Create ClueDisplayComponent for full-screen clue view"
Task T027: "Create ScoreDisplayComponent for contestant scores"
Task T028: "Create BuzzIndicatorComponent for buzz-in display"
```

---

## Implementation Strategy

### MVP First (User Stories 1, 2, 3 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 - Basic game flow
4. Complete Phase 4: User Story 2 - Synchronized display
5. Complete Phase 5: User Story 3 - Robust buzzer system
6. **STOP and VALIDATE**: Test complete MVP independently
7. Deploy/demo if ready

**MVP Delivers**: Fully functional Jeopardy game with 2-3 contestants, clue selection, buzzer input, score tracking, and synchronized dual-window display

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Stories 1, 2, 3 → Test MVP → Deploy/Demo
3. Add User Story 4 (Daily Doubles) → Test → Deploy
4. Add User Story 5 (Multiple Rounds) → Test → Deploy
5. Add User Story 6 (Final Jeopardy) → Test → Deploy
6. Add User Story 7 (Configurable Rules) → Test → Deploy
7. Add User Story 8 (Import Content) → Test → Deploy
8. Polish phase → Final release

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1
   - Developer B: User Story 2
   - Developer C: User Story 3
3. Stories complete and integrate independently
4. Continue with P2 stories (US4, US5, US6) in priority order
5. Add P3 stories (US7, US8) as needed

---

## Notes

- **Total tasks**: 163 tasks
- **Tasks per user story**: US1 (22), US2 (21), US3 (11), US4 (10), US5 (11), US6 (20), US7 (12), US8 (17), Setup (4), Foundational (13), Polish (22)
- **Parallel opportunities**: 83 tasks marked [P] can execute in parallel within their phase
- **Independent test criteria**: Each user story phase includes clear test criteria for validation
- **MVP scope**: User Stories 1, 2, 3 (54 implementation tasks) deliver complete basic game
- **Format validation**: All tasks follow strict checklist format (checkbox, ID, optional [P] marker, [Story] label for user story tasks, file paths in descriptions)
- [P] tasks = different files, no dependencies within phase
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
