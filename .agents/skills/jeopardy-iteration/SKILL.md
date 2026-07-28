---
name: jeopardy-iteration
description: Iteratively improve and verify this repository's Angular Jeopardy-style game. Use for gameplay, host/board synchronization, visual polish, browser testing, screenshots, video receipts, acceptance review, or full-game readiness.
---

# Jeopardy iteration

1. Read the root `AGENTS.md`, `spec.md`, `docs/visual-rubric.md`, and
   `references/acceptance-matrix.md`.
2. Inspect current code and `docs/verification-status.md`; run the fastest relevant
   baseline before editing.
3. Select the highest-priority incomplete acceptance criterion. Work on one
   vertical slice unless coupled changes are required for correctness.
4. Implement the slice and add deterministic assertions. Prefer accessible roles
   or stable test IDs over CSS structure in browser tests.
5. Run focused unit and Playwright checks. Use one browser context for `/host` and
   `/board`.
6. Fail on unexpected `console.error`, uncaught page errors, synchronization
   timeouts, clipping, overflow, or broken layout.
7. Capture named screenshots at stable states. Inspect screenshots and diff images
   before accepting or updating a baseline.
8. Run `npm run verify` after focused checks pass. Run `npm run test:receipt` when
   the changed behavior participates in the canonical game journey.
9. Update the acceptance matrix and verification status with the exact command and
   artifact. Mark a row complete only when its stated evidence exists.
10. Continue with the next incomplete criterion while safe work remains. Yield only
    when all criteria are complete or a concrete user decision or permission is
    required.

Never treat video alone as proof of state correctness. Pair recorded evidence with
DOM/state assertions. Never regenerate screenshots solely to hide a regression.
