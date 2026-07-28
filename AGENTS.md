# Jeopardy game development

## Product outcome

Deliver a reliable two-screen Jeopardy-style game:

- `/host` is the authoritative control surface.
- `/board` is the read-only 1920x1080 audience display.
- A complete game supports setup, both rounds, Daily Doubles, Final Jeopardy,
  scoring, buzzing, lockouts, synchronization, reload recovery, and a winner display.
- Use an original broadcast-game-show treatment unless licensed branding or assets
  are explicitly supplied.

Read `spec.md` for product behavior, `docs/visual-rubric.md` for presentation
criteria, and
`.agents/skills/jeopardy-iteration/references/acceptance-matrix.md` for completion
status.

## Working loop

For each meaningful change:

1. Reproduce or identify one concrete gap.
2. Implement the smallest complete vertical slice.
3. Run the relevant unit tests.
4. Exercise the behavior through Playwright.
5. Check browser console and page errors.
6. Capture and inspect the affected screenshots.
7. Fix observed functional or visual problems.
8. Run the full verification gate before claiming completion.

Continue iterating while safe, in-scope work remains. Stop only when the definition
of done is met or progress requires a user decision or new authority.

## Verification commands

- Fast gate: `npm run verify:quick`
- Browser gate: `npm run test:e2e`
- Visual comparisons: `npm run test:visual`
- Full-game evidence: `npm run test:receipt`
- Full gate: `npm run verify`
- Intentionally update visual baselines: `npm run test:visual:update`

Do not report success unless the relevant gates pass. Do not update visual
baselines merely to make a test pass: inspect actual, expected, and diff images
and explain why the change is intentional.

## Browser requirements

Verification must eventually cover:

- Host opens and synchronizes the board popup.
- Board reload requests and receives complete state.
- Selecting a clue updates both windows.
- Buzzing locks the first eligible player.
- Incorrect answers deduct value and apply configured lockout behavior.
- Correct answers add value and transfer control.
- Daily Double wagering and scoring work.
- Round transitions work.
- Final wagers, responses, adjudication, scoring, and winner display work.
- No uncaught page errors or unexpected console errors occur.

Use one Playwright browser context for host and board so BroadcastChannel behavior
matches production.

## Visual acceptance

At 1920x1080, the board must:

- Fill the viewport without scrolling.
- Show six equal category columns and five aligned clue rows.
- Avoid clipped or overlapping category, value, and clue text.
- Use strong game-show hierarchy, deep blue surfaces, gold values, high contrast,
  consistent gutters, and restrained animation.
- Present clue, Daily Double, Final Jeopardy, and winner states clearly.

The host is optimized for efficient operation rather than imitating the TV board.

## Angular conventions

- Preserve standalone components and strict TypeScript.
- Prefer signals for local component state and pure state transitions.
- Keep logic, template, and SCSS in their existing component files.
- Avoid unrelated refactors during a verification slice.
- Do not introduce external runtime font or asset dependencies.

## Definition of done

The game is complete only when:

- Every acceptance-matrix row is marked `complete` with automated or recorded
  evidence.
- `npm run verify` passes from a clean checkout.
- Approved visual baselines cover all named states in the visual rubric.
- A successful full-game video receipt and Playwright HTML report are available.
- README setup and operator instructions match the implemented behavior.
