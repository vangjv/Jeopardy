# Acceptance matrix

Update this file as verified behavior changes. `complete` requires the evidence in
the final column; `partial` means some automated coverage exists; `pending` means
the criterion still needs implementation or proof.

| ID | Priority | Status | Criterion | Required evidence |
| --- | --- | --- | --- | --- |
| GAME-01 | P0 | complete | Load valid game content and create 2-3 contestants with unique buzz keys. | `validation.service.spec.ts`, `game-import.component.spec.ts`, `e2e/setup.spec.ts`, and `e2e/import-picker.spec.ts` (native chooser, mouse/keyboard activation, cancellation, same-file retry); inspected screenshots/report in `build\import-picker-verification` / `build\import-picker-report`; tagged 9553 sample also passed. Exact commands in `docs/verification-status.md`. |
| GAME-02 | P0 | complete | Open `/board` from `/host` and synchronize the current board. | `e2e/sync.spec.ts` popup assertion. |
| GAME-03 | P0 | complete | Reloading the board restores the authoritative host state. | `e2e/sync.spec.ts` reload assertion. |
| GAME-04 | P0 | complete | Selecting an unused clue displays its category, value, and text on the board. | `e2e/game-flow.spec.ts`. |
| GAME-05 | P0 | complete | First eligible buzz locks the player and ignores later buzzes. | Playwright buzz assertion. |
| GAME-06 | P0 | complete | Correct adjudication updates score and marks the clue used. | Playwright score and board assertions. |
| GAME-07 | P0 | complete | Incorrect adjudication deducts value, locks out that contestant, and lets another contestant buzz. When every contestant is locked out the clue closes automatically, and the host can reset (clear lockouts) or close a clue while listening for a buzz. | `e2e/adjudication.spec.ts` host answer visibility, explicit reopen action, multi-player handoff, all-incorrect auto-close, and listening-state reset/close; `game-state.service.spec.ts` `resetClue` assertions. |
| GAME-08 | P0 | complete | Control passes to the correct contestant and can be overridden by the host. | Unit state assertions and `e2e/adjudication.spec.ts`. |
| GAME-09 | P0 | complete | Daily Double disables normal buzzing, validates the wager, scores it, and returns to the board. | `e2e/adjudication.spec.ts`, receipt, and `daily-double` baseline. |
| GAME-10 | P0 | complete | Completing Round 1 enables a transition to Double Jeopardy with fresh clue usage. | `e2e/round-transition.spec.ts` and full-game receipt. |
| GAME-11 | P0 | complete | Final Jeopardy collects legal wagers and responses, adjudicates each contestant, and announces the winner. | `e2e/final-jeopardy.spec.ts` and full-game receipt. |
| GAME-12 | P1 | complete | Board recovery works during an active clue, buzz, Daily Double, and Final Jeopardy. | `e2e/sync.spec.ts` and `e2e/final-jeopardy.spec.ts` reload assertions. |
| GAME-13 | P1 | complete | Supported clue media renders accessibly and fails gracefully. | `e2e/media.spec.ts` image alternative and fallback assertions. |
| GAME-14 | P1 | complete | No expected journey emits uncaught page errors or unexpected console errors. | Shared error collectors in every Playwright journey. |
| GAME-15 | P0 | complete | A response timeout defaults to 10 seconds and automatically adjudicates an unanswered buzz as incorrect. | `game-state.service.spec.ts` default/persistence assertions and `e2e/adjudication.spec.ts` timeout sound, deduction, lockout, and next-player buzz assertions. |
| VIS-01 | P0 | complete | The 1920x1080 Round 1 board meets the visual rubric. | Approved `round-1-board` baseline and geometry assertions. |
| VIS-02 | P0 | complete | Standard clue view meets the visual rubric. | Approved `standard-clue` baseline and geometry assertions. |
| VIS-03 | P0 | complete | Buzz, Daily Double, round transition, Final Jeopardy, and winner states meet the visual rubric. | Approved named baselines for buzz, Daily Double, Double Jeopardy, three Final states, and winner. |
| VIS-04 | P1 | complete | The host remains usable at 1440x900 without hidden critical controls or horizontal scrolling. | Approved buzz-state `host-console` baseline plus answer, adjudication, board, score-alignment, and viewport geometry assertions. |
| A11Y-01 | P1 | complete | Host and board pass automated accessibility checks and keyboard-only critical journeys. | Axe serious/critical scan and keyboard journey in `e2e/accessibility.spec.ts`. |
| OPS-01 | P0 | complete | A clean checkout installs and passes build, unit, e2e, and receipt commands without runtime font downloads. | Isolated source-only copy: `npm ci`, project-local Chromium install, and `npm run verify` passed on 2026-07-28. |
| OPS-02 | P0 | complete | A canonical journey emits a successful video receipt, screenshots, trace, and HTML report. | `e2e/full-episode.spec.ts`; configurable `npm run record:game`; named `game-board.webm`, `host-board.webm`, state screenshots, trace, and HTML report artifacts. |
| OPS-03 | P1 | complete | Production and development dependencies have no unresolved high or critical audit findings. | Authorized online audit: 0 high/0 critical; intentional Angular 20 LTS and Vitest migration record in `docs/security-audit.md`. |
| OPS-04 | P1 | complete | Convert complete modern archive HTML from a saved file or bounded live request into schema-valid JSON, rejecting incomplete/unsupported content and reporting media/category notes. | `npm run test:archive` (49 original-fixture/stub-network tests, including J/DJ/Final `_stuck` UI markers and strict ID regressions), `e2e/archive-import.spec.ts` real CLI-to-FileReader/popup/reload journey; live 9553/9555 conversion/schema validation in memory. `npm run verify` passed on unchanged rerun 2026-10-18 after the documented intermittent visual mismatch. Inspected screenshots/report in `build\archive-stuck-verification` / `build\archive-stuck-report`; full log `build\archive-stuck-verify.log`; commands/limitations in `docs/verification-status.md`. |
| PERF-01 | P1 | complete | Production bundle and component styles meet intentionally chosen warning budgets. | Warning-free production build; routes are lazy-loaded and component warning budget is 10 kB. |
