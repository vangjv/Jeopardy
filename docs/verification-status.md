# Verification status

Last updated: 2026-10-19

## Native JSON import picker regression (2026-10-19)

- Root cause: the import button was an interactive descendant of a file-input
  label. Clicking it did not forward activation to the hidden input. The button
  now explicitly clicks the input through an Angular template reference.
- The input value is cleared after capturing the selected `File`, allowing the
  same JSON file to be selected again after correcting player setup. Cancellation
  leaves the existing game and success/error state unchanged.
- Baselines: `npm run test:unit -- --include
  src\app\shared\services\validation.service.spec.ts` passed (3 tests);
  existing `archive-import` browser coverage passed (1 test), but bypassed the
  button via `setInputFiles`. The new regression failed before the fix with a
  5000 ms timeout waiting for the `filechooser` event.
- Focused unit command: `npm run test:unit -- --include
  src\app\host\components\game-import\game-import.component.spec.ts --include
  src\app\shared\services\validation.service.spec.ts` passed (5 tests).
  The new component tests explicitly use zoneless change detection.
- Focused browser command (2 passed):

  ```powershell
  $env:PLAYWRIGHT_HTML_OUTPUT_DIR='build\import-picker-report'
  node scripts\run-playwright.mjs import-picker archive-import --project=chromium --output=build\import-picker-verification --reporter=list,html
  ```

  The regression asserts mouse and Enter-key chooser activation, single JSON-file
  selection, empty-selection cancellation, player-validation failure, successful
  retry of the same file, 30 loaded clue tiles, and no console/page errors.
  Existing archive import still verifies popup synchronization and board reload.
  With `$env:IMPORT_GAME_PATH='games\game-9553.json'`, the same regression passed
  against the user-provided sample; report:
  `build\import-picker-9553-report\index.html`, output:
  `build\import-picker-9553`. The normal regression uses original sample content.
- Inspected `host-import-ready.png` and `host-import-loaded.png` in
  `build\import-picker-verification\import-picker-Import-JSON--2a6a4--and-retrying-the-same-file-chromium`.
  Both show readable import controls; the latter includes the success message.
  No visual baselines were changed.
- `npm run verify` passed: production build, 13 app unit tests, 49 archive tests,
  20 Chromium tests (including visual comparisons), and 1 full-game receipt.
  Log: `build\import-picker-verify.log`.
- Isolated receipt: `npm run test:receipt --
  --output=build\import-picker-receipt --reporter=list,html` passed (1 test), with
  `$env:PLAYWRIGHT_HTML_OUTPUT_DIR='build\import-picker-receipt-report'`.
  Report: `build\import-picker-receipt-report\index.html`; videos, screenshots,
  and trace: `build\import-picker-receipt`. No remaining import failure was found.

## Archive UI-marker regression (2026-10-18)

- Reproduced the reported failure on both ordinary live requests:
  `https://j-archive.com/showgame.php?game_id=9553` and
  `https://j-archive.com/showgame.php?game_id=9555`. Each page contained 183
  clue-prefixed IDs: 61 questions, 61 `_r` responses, and 61 `_stuck` UI markers.
  The original strict allowlist rejected `clue_J_1_1_stuck`.
- The allowlist now accepts exactly the known `_stuck` suffix for valid J/DJ
  coordinates and Final, without weakening unknown-ID, coordinate, duplicate-ID,
  response, value-ladder, Daily Double, or app-schema validation.
- Original-content fixtures now model nested clue headers, J/DJ marker cells,
  sibling hidden response nodes, and Final's nested clue table and `<var>` marker.
  No downloaded clue text or generated live games were saved.
- Baseline `npm run test:archive`: 42 passed. Before the parser fix, the expanded
  fixture suite reproduced the marker error (16 failed of 49). After the fix:
  49 passed, including malformed coordinates, unknown suffixes, out-of-range
  response/marker IDs, malformed Final marker, and duplicate marker rejection.
- Both live pages subsequently passed the CLI's `fetchHtml` → `parseArchive`
  pathway and its existing app AJV schema entirely in memory: six categories
  with five clues in each round, one Final clue, and 1/2 Daily Doubles.
  Game 9553 emitted 7 review warnings; 9555 emitted 14. No further coupled
  parsing failure surfaced. This verifies live conversion, not live CLI file
  publication or media usability. Requests used the existing bounded ordinary
  fetch, without retries, redirects, authentication/CAPTCHA bypass, or media fetches.
- Real CLI persistence and browser import were verified with original content:

  ```powershell
  $env:PLAYWRIGHT_HTML_OUTPUT_DIR='build\archive-stuck-report'
  node scripts\run-playwright.mjs archive-import --project=chromium --output=build\archive-stuck-verification --reporter=list,html
  ```

  Result: 1 passed. The CLI writes JSON that the host validates/imports through
  FileReader; popup sync, host-only response, board reload, overflow, and browser
  diagnostics assertions pass. Inspected `archive-original-round-1.png`,
  `archive-original-clue.png`, and `archive-original-host.png` under
  `build\archive-stuck-verification`: clear board/clue text and host-only answer.
  HTML report: `build\archive-stuck-report\index.html`.
- `npm run verify` passed on rerun: production build, 10 app unit tests,
  49 archive tests, 17 Chromium tests, and 1 receipt. Retained full log:
  `build\archive-stuck-verify.log` (`npm run verify *> build\archive-stuck-verify.log`).
  The initial run hit the already-documented `double-jeopardy-board.png` timing
  mismatch: inspected actual board, expected transition splash, and diff.
  The unchanged rerun passed; no visual baselines or unrelated code were edited.
  This intermittent visual-gate limitation remains.
- An isolated receipt also passed:

  ```powershell
  $env:PLAYWRIGHT_HTML_OUTPUT_DIR='build\archive-stuck-receipt-report'
  node scripts\run-playwright.mjs --project=receipt --output=build\archive-stuck-receipt --reporter=list,html
  ```

  Result: 1 passed; retained report at
  `build\archive-stuck-receipt-report\index.html`, videos/screenshots/trace under
  `build\archive-stuck-receipt`. All saved game content in this evidence is original.

## Response timeout enforcement (2026-10-18)

- Response timeout now defaults to 10 seconds in game state and Game Options.
  The configured value is preserved when game content is loaded; 0 or empty
  remains the explicit no-timeout setting.
- A standard-clue buzz starts the host-side countdown. If it expires before
  adjudication, the existing Incorrect action plays `incorrect.mp3`, applies the
  configured score deduction and lockout, then reopens the buzzer for eligible
  contestants. Daily Doubles do not use the buzzer response timeout.
- `npm run test:unit`: passed (10 tests). `npm run test:e2e --
  e2e/adjudication.spec.ts`: passed (3 tests). `npm run test:receipt`: passed
  (1 full-game receipt).
- `npm run verify`: build, unit, archive, and 16 of 17 Chromium tests passed;
  the remaining failure is the existing `double-jeopardy-board.png` visual
  comparison. The expected image shows the round-transition splash while the
  test expects the post-transition board; actual, expected, and diff images
  were inspected, and no visual baseline was changed.

## Archive conversion tooling (2026-10-18)

- Added `npm run import:archive -- --game-id ID --output PATH` and
  `--input PATH --output PATH` for legitimately obtained saved HTML.
  This is developer tooling only; no game UI or import behavior was changed.
- Baseline: `npm run test:unit -- --include
  src/app/shared/services/validation.service.spec.ts` passed (3 tests).
- Focused: `npm run test:archive` passed (42 tests). Original synthetic HTML
  covers both rounds/Final, coordinate-vs-play-order mapping, face values instead
  of DD wagers, hidden-response isolation, entities/whitespace, category links,
  notes/media warnings, structural and length failures, CLI validation,
  no-clobber publication, and stub/local-server HTTP/error/timeout/size checks.
  The existing app AJV schema is compiled directly, not copied.
- Browser: `node scripts\run-playwright.mjs archive-import --project=chromium`
  passed. An original fixture is converted by the real CLI, uploaded through
  the host's FileReader path, synchronized with the popup in one context, and
  recovered after board reload. The answer remains host-only; page/console
  errors and viewport overflow assertions pass.
- Full gate: `npm run verify` passed: production build, 8 app unit tests,
  42 archive-tooling tests, 16 Chromium tests (including existing visual
  comparisons), and 1 full-game receipt. No visual baselines were changed.
- Retained evidence was rerun into isolated ignored output because concurrent
  verification clears the default `test-results` directory:

  ```powershell
  $env:PLAYWRIGHT_HTML_OUTPUT_DIR='build\archive-import-report'
  node scripts\run-playwright.mjs --project=chromium --project=receipt --grep 'CLI-generated original|canonical playable' --output=build\archive-import-verification --reporter=list,html
  ```

  Result: 2 passed. HTML report: `build\archive-import-report\index.html`.
  Under `build\archive-import-verification`, the archive-import test directory
  contains inspected `archive-original-round-1.png`,
  `archive-original-clue.png`, and `archive-original-host.png`, plus original
  HTML/generated JSON. The full-episode directory contains `game-board.webm`,
  `host-board.webm`, named screenshots, and a trace. Screenshots show readable
  categories/values, an unclipped clue, and the host-only answer.
- Limits: complete modern $200/$400 ladders and DOM response nodes only;
  historical hover-only answers fail clearly. Media is never downloaded or
  attached; links and category instructions are reported for operator review.
  Live mode is bounded to one ordinary request, 15 seconds, and 5 MiB, without
  redirects/retries or access-control workarounds. Live archive games were not
  downloaded/generated as deliverables; automated verification uses only
  original content. No additional dependencies or app runtime network requests
  were introduced.

## Current automated foundation

- `npm run verify`: passed on 2026-07-28 from an isolated source-only copy after
  `npm ci` and a project-local pinned Chromium install; passed again after the
  host response-desk redesign.
- Angular production build: passes without warnings, external font downloads, or
  runtime asset dependencies.
- Unit tests: 8 passing non-interactive Vitest tests in jsdom. The legacy Karma,
  glob, rimraf, minimatch, and brace-expansion dependency chain was removed.
- Browser tests: 16 passing Playwright tests across setup, synchronization, active
  state recovery, scoring, control, Daily Doubles, round transitions, Final
  Jeopardy, media fallbacks, original archive-CLI file import, accessibility, and
  visual presentation.
- Each Playwright command allocates and owns an isolated dynamic-port Angular
  server, preventing a stale process on port 4200 from contaminating a test run.
- Receipt: a complete 60-clue, two-round game plus Final Jeopardy passes and emits
  named screenshots, a trace, videos for both pages, and an HTML report. The
  `record:game` wrapper accepts a custom game-set JSON path and two or three
  `Name:Key` contestant pairs.
- Visual review: ten approved baselines cover Round 1, a clue, buzz winner, Daily
  Double, Double Jeopardy, Final category/clue/results, winner, and the host
  console. The host baseline now captures a locked buzz with the host-only answer
  and adjudication actions above the fold. Geometry assertions guard the answer,
  action buttons, clue board, score alignment, viewport overflow, and clipping.

## Host operator coverage

- The active clue and correct response remain visible before and after a buzz.
- **Incorrect** deducts, locks out the responder, and reopens buzzing in one
  action; the next eligible contestant can buzz immediately.
- Current-clue **Correct** and **Incorrect** actions each request their matching
  response sound once on the host; the adjudication Playwright test asserts the
  actual `play()` source paths and confirms the board requests neither sound.
  Command: `npm run test:e2e -- e2e/adjudication.spec.ts`. Buzz-state screenshot:
  `test-results\adjudication-an-incorrect--22e34-pens-for-another-contestant-chromium\host-current-clue-buzzed.png`.
- **Release buzz** is available for a mistaken lock without changing a score.
- Clue tiles are disabled while a clue is active, preventing accidental
  overlapping selections.
- Game setup collapses after load and is explicitly reopened in the media-import
  browser journey.

## Off-happy-path coverage

- Reload the board during an active clue, after a buzz lock, during a Daily Double,
  and throughout Final Jeopardy.
- Reject duplicate buzz keys, ignore ineligible later buzzes, lock out an incorrect
  contestant, and allow a different contestant to answer.
- Reject invalid Daily Double and Final wagers, make Final adjudication idempotent,
  and show a stable fallback when clue media fails.

## Dependency security

- The original tree reported 29 high and 1 critical affected instances.
- Angular remains on the patched 20 LTS line, and the unit runner was migrated
  from Karma to Vitest rather than forcing incompatible transitive overrides.
- An authorized online `npm audit --json` against the installed clean lockfile
  reports 0 high, 0 critical, and 3 moderate development-tool findings.
- The full review and intentional upgrade record are in
  `docs/security-audit.md`.

## Completion source of truth

Use
`.agents/skills/jeopardy-iteration/references/acceptance-matrix.md`.
`npm run verify` proves that implemented gates are green; it does not override
incomplete acceptance rows.

## Artifact locations

- HTML report: `playwright-report/index.html`
- Test output, traces, named state screenshots, `game-board.webm`, and
  `host-board.webm`: `test-results/`
- Committed visual baselines: adjacent `*-snapshots/` directories under `e2e/`

## Latest configurable recording

- Command: `npm run record:game -- --game-set
  .\src\assets\game-sets\sample-game.json --players "Ada:A,Grace:S,Linus:D"`
- Result: passed on 2026-07-28; both recordings are 1280x720 and cover the
  complete synchronized journey through the winner display.
