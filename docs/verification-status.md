# Verification status

Last updated: 2026-07-28

## Current automated foundation

- `npm run verify`: passed on 2026-07-28 from an isolated source-only copy after
  `npm ci` and a project-local pinned Chromium install; passed again after the
  host response-desk redesign.
- Angular production build: passes without warnings, external font downloads, or
  runtime asset dependencies.
- Unit tests: 8 passing non-interactive Vitest tests in jsdom. The legacy Karma,
  glob, rimraf, minimatch, and brace-expansion dependency chain was removed.
- Browser tests: 15 passing Playwright tests across setup, synchronization, active
  state recovery, scoring, control, Daily Doubles, round transitions, Final
  Jeopardy, media fallbacks, accessibility, and visual presentation.
- Each Playwright command allocates and owns an isolated dynamic-port Angular
  server, preventing a stale process on port 4200 from contaminating a test run.
- Receipt: a complete 60-clue, two-round game plus Final Jeopardy passes and emits
  screenshots, a trace, videos for both pages, and an HTML report.
- Visual review: ten approved baselines cover Round 1, a clue, buzz winner, Daily
  Double, Double Jeopardy, Final category/clue/results, winner, and the host
  console. The host baseline now captures a locked buzz with the host-only answer
  and adjudication actions above the fold. Geometry assertions guard the answer,
  action buttons, clue board, score alignment, viewport overflow, and clipping.

## Host operator coverage

- The active clue and correct response remain visible before and after a buzz.
- **Incorrect** deducts, locks out the responder, and reopens buzzing in one
  action; the next eligible contestant can buzz immediately.
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
- Test output, traces, screenshots, and videos: `test-results/`
- Committed visual baselines: adjacent `*-snapshots/` directories under `e2e/`
