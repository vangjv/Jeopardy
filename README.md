# Jeopardy game

An original, game-show-inspired Jeopardy-style game built with Angular. It runs
entirely in the browser with two synchronized windows:

- `/host` is the authoritative operator console. The host loads content, manages
  contestants, selects clues, adjudicates responses, and controls each round.
- `/board` is the read-only audience display, designed for a 1920x1080 screen.

There is no backend and no multi-device networking. Run both windows on the same
computer and in the same browser profile so `BroadcastChannel` synchronization
is available.

## Prerequisites

- Node.js `20.19+`, `22.12+`, or `24+`
- npm `8+`
- A Chromium-based browser for the game
- Playwright's pinned Chromium build if you will run browser verification

## First-time setup

Install the exact dependency versions from the lockfile:

```powershell
npm ci
```

The game itself is now ready to run. To install the browser used by the
Playwright verification suite, keep it with the project dependencies:

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH='0'
npx playwright install chromium
```

On macOS or Linux, use:

```bash
PLAYWRIGHT_BROWSERS_PATH=0 npx playwright install chromium
```

Fonts, icons, and application assets are local dependencies. Building and
running the game does not require a Google Fonts request or another external
runtime asset download.

## Start the game

From the repository root:

```powershell
npm start
```

Then:

1. Open `http://127.0.0.1:4200/host`.
2. Select **Open Board** in the host toolbar.
3. Allow the popup if the browser blocks it, then move the board window to the
   audience display and make it full screen.
4. Keep keyboard focus on the host window during clue play; contestant buzz keys
   are handled there.

The **Open Board** button requests a 1920x1080 popup. Browser and operating-system
window chrome may affect its initial size, so full-screen the audience window for
the intended presentation.

## Set up a game

### Use the included sample

The quickest playable setup is:

1. Select **Load Sample Game** under **Game Content**. If no contestants exist,
   this creates Player 1, Player 2, and Player 3 with the `A`, `S`, and `D` buzz
   keys.
2. In **Player Setup**, edit the names and one-character buzz keys as needed.
   Each game requires two or three contestants and every key must be unique.
3. Review **Game Rules Configuration** and select **Apply Rules** after making
   changes.
4. Select **Open Board**, then **Start Game**. Starting the game returns the
   session to a fresh Round 1 board.

After content loads, **Game setup** collapses so the live controls stay prominent.
Select its summary at any time to reopen the content, contestant, and rules
controls.

### Import custom game content

Create two or three contestants before selecting **Import JSON File**. Imported
content is validated before it replaces the current game. Use
`src/assets/game-sets/sample-game.json` as the reference format.

A valid game set contains:

- Round 1 with exactly six categories and five clues per category
- Double Jeopardy with exactly six categories and five clues per category
- one Final Jeopardy category and clue
- unique IDs, clue text, correct responses, values, and Daily Double flags
- exactly one Round 1 Daily Double and two Double Jeopardy Daily Doubles
- optional image, audio, or video media with a URL and optional alternative text

Invalid JSON or content displays a validation message in the host rather than
starting a partial game.

## How the game works

### Regular clues

1. The contestant shown with **CONTROL** chooses the next category and value; the
   host selects that tile in **Game Board**.
2. The audience board switches to the clue. Buzzing opens automatically for a
   regular clue. The host's **Response desk** immediately shows the clue and the
   host-only correct response.
3. The first eligible contestant to press their configured key is locked in.
   The response desk highlights that contestant and presents the two primary
   adjudication actions.
4. Select **Correct** to add the clue value, give that contestant control, mark
   the clue used, and return to the board.
5. Select **Incorrect** to apply the configured penalty. With the default rules,
   the clue value is deducted, that contestant is locked out for the clue, and
   buzzing reopens for another contestant in the same action.
6. Use **No response · close clue** to mark a clue used without changing a score.
   Use **Release buzz**, **Clear lockouts**, or a contestant row under
   **Score & control** when the host needs to correct the live state.

Correct responses stay visible to the host in **Response desk** for the entire
active clue. They remain hidden from the audience unless
**Show Correct Response on Board** is enabled.

### Daily Doubles

A Daily Double belongs to the contestant currently in control and never opens
normal buzzing.

1. Select the Daily Double tile.
2. Enter an integer wager in the displayed range and select **Set Wager**. The
   minimum is $5; the maximum is the greater of the contestant's score and the
   highest value in the current round.
3. Read the clue and select **Correct** or **Incorrect**. The wager is added or
   deducted, the clue is marked used, and the board returns to the grid.

Wagers are host-only unless **Show Wagers on Board** is enabled.

### Round transitions

The **Advance** button becomes available after all 30 clues in the current round
are used:

- Advancing from Round 1 starts Double Jeopardy with a fresh 30-clue board and
  doubled default values.
- Advancing from Double Jeopardy starts Final Jeopardy.

The **Round 1** and **Round 2** toolbar buttons are direct operator controls. They
start the selected round and reset that round's used-clue state, so use them
deliberately during a live game.

### Final Jeopardy and the winner

After entering Final Jeopardy, use the host's vertical workflow in order:

1. **Reveal Category** sends the category to the audience board.
2. Enter a wager from $0 through each contestant's current non-negative score,
   then select **Confirm Wagers**.
3. Select **Reveal Clue** and collect the contestants' written answers.
4. Enter every response and select **Confirm Responses**.
5. Mark every contestant **Correct** or **Incorrect**. Each wager is applied once.
6. Select **Show Winner on Board** to replace the results view with the champion
   display.

The display settings can keep Final wagers and responses host-only or include
them in the audience reveal.

## Synchronization and recovery

The host owns the complete game state and sends updates to the board through
`BroadcastChannel`, with `window.postMessage` support for the popup relationship.
If the board is reloaded during a board, clue, buzz, Daily Double, or Final
Jeopardy state, it requests a fresh authoritative snapshot from the host. A
serialized local snapshot is also available as a recovery fallback.

If synchronization is lost, confirm that both pages use the same origin and
browser profile, keep the host open, and reopen the audience window with
**Open Board**.

## Verification

```powershell
npm run verify:quick
npm run test:e2e
npm run test:visual
npm run test:receipt
npm audit --audit-level=high
npm run verify
```

- `verify:quick` creates a production build and runs 8 non-interactive Vitest
  tests in jsdom.
- `test:e2e` runs 15 Playwright tests covering setup, popup synchronization,
  reload recovery, scoring, control, Daily Doubles, round transitions, Final
  Jeopardy, media fallbacks, accessibility, and the approved presentation states.
- `test:visual` compares ten named host and board states with committed
  screenshots at the required viewports.
- `test:receipt` plays all 60 clues and Final Jeopardy, announces a winner, and
  records screenshots, a trace, both page videos, and an HTML report.
- `npm audit --audit-level=high` is the online security check and fails for any
  unresolved high or critical finding.
- `verify` runs the production build, unit tests, complete browser suite
  (including visual comparisons), and the full-game receipt.

Each Playwright command starts and owns an Angular server on an available local
port, so an old process on port 4200 cannot contaminate a run. To test an already
running server instead, set `PLAYWRIGHT_BASE_URL` before invoking the command.

The latest verification artifacts are written to:

- `playwright-report/index.html` — self-contained HTML report
- `test-results/` — traces, screenshots, videos, and test attachments
- `e2e/visual.spec.ts-snapshots/` — ten committed visual baselines

Playwright clears its generated output at the start of a run. Run
`npm run test:receipt` last when you want the complete-game evidence to remain in
`test-results/` and `playwright-report/`.

Only update visual baselines after reviewing the expected, actual, and diff
images and confirming that the change still satisfies the visual rubric:

```powershell
npm run test:visual:update
```

## Project references

- `spec.md` — product behavior and content model
- `docs/visual-rubric.md` — measurable 1920x1080 presentation criteria
- `docs/verification-status.md` — current test coverage and artifact status
- `docs/security-audit.md` — dependency findings and upgrade record
- `.agents/skills/jeopardy-iteration/references/acceptance-matrix.md` — completion
  evidence for every acceptance criterion
- `AGENTS.md` — repository development and verification workflow
