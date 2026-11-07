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

## Deploy to Cloudflare

This follows the `WhoWantsToBeARich` repository's deployment pattern:
**Cloudflare Workers static assets**, not Pages or an Angular SSR server.
Cloudflare's [Angular guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/more-web-frameworks/angular/)
supports this approach. No Worker script, database, or runtime backend is needed.
The existing [`wrangler.toml`](wrangler.toml) publishes only
`dist/jeopardy/browser`, not source files or the parent build directory.
Its [SPA routing setting](https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/)
serves `index.html` for deep links, including direct navigation and reloads at
`/host` and `/board`.

Cloudflare limits each static asset to **25 MiB**. The unused 53 MiB reference
dataset `public/jeopardy-dataset/200k_questions.json` exceeds this limit.
[`public/.assetsignore`](public/.assetsignore) excludes just that file from
Cloudflare uploads (and local Wrangler serving); it remains available locally.
The playable built-in library is bundled separately and is still deployed.
See Cloudflare's [asset exclusion documentation](https://developers.cloudflare.com/workers/static-assets/binding/#ignoring-assets).

### Build, validate, and publish

Use Node.js **22.12+ or 24+** for deployment: the locally installed Wrangler 4
requires Node 22+, even though Angular itself also supports Node 20.19.
Install dependencies with `npm ci`, then run:

```powershell
# Safe local check: production build + Wrangler validation, no login/upload
npm run deploy:dry-run

# One-time Cloudflare authentication (opens a browser)
npx wrangler login

# Production build + live deployment
npm run deploy

# Production build + version upload, without shifting production traffic
npm run deploy:preview

# Advanced: publish already-built output; ensure it is current first
npm run deploy -- --skip-build

# Options and deployment-script tests
node scripts\deploy.mjs --help
npm run test:deploy
```

[`scripts/deploy.mjs`](scripts/deploy.mjs) checks authentication for uploads,
runs Angular's production build (which cleans its own output), checks for
`index.html`, and invokes the project-local Wrangler CLI. Failed commands stop
the script with a nonzero exit code. Unknown flags and combining `--preview`
with `--dry-run` are rejected before any commands run. `--skip-build` also works
with preview/dry-run commands but may publish stale output.

Production is served at `https://jeopardy.<your-subdomain>.workers.dev`;
Wrangler prints the actual URL. Configure your account's Workers subdomain on
first use if prompted. Preview uploads use a
[version URL](https://developers.cloudflare.com/workers/versions-and-deployments/version-urls/)
and do not replace the live version. Make the first production deployment before
using preview uploads for an existing Worker. Version URLs are explicitly enabled
in the configuration and are public; use Cloudflare Access if access restriction
is needed. Add an optional custom domain through **Workers & Pages → jeopardy →
Settings → Domains & Routes**. No domain is required for `workers.dev`.

### CI and Cloudflare Workers Builds

Store `CLOUDFLARE_API_TOKEN` (Cloudflare's **Edit Cloudflare Workers** token
template, scoped to the target account) and `CLOUDFLARE_ACCOUNT_ID` in your CI
secret store, not in source control. Use Node 22.12+ or 24+, then run:

```powershell
npm ci
npm run deploy
```

For Cloudflare Workers Builds, set the build command to `npm run build` and the
deploy command to `npm run deploy -- --skip-build` to avoid building twice.
For another CI provider, see Cloudflare's
[external CI/CD guidance](https://developers.cloudflare.com/workers/ci-cd/external-cicd/).
Local `.wrangler/`, `.dev.vars*`, and environment secret files are ignored.

### Verify the hosted game

Open the deployed `/host`, select **Open Board**, load the sample game, select a
clue, and reload the audience popup to check state recovery. Keep host and board
on the **same origin** (including preview/custom domain) and browser profile;
hosting does not add cross-device synchronization. Existing browser checks can
also target the deployment or a local Wrangler static-assets server:

```powershell
# Local Cloudflare runtime, after building; leave running in another terminal
npx wrangler dev --ip 127.0.0.1 --port 8787

# Run against that server, or replace with the deployed HTTPS origin
$env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:8787'
node scripts\run-playwright.mjs sync.spec.ts --project=chromium
Remove-Item Env:\PLAYWRIGHT_BASE_URL
```

Cloudflare serves the application files; gameplay still runs locally in the
browser. Bundled games, fonts, and icons need no external runtime downloads.
This does not install a service worker or enable a fresh offline page load:
load both windows before disconnecting. Imported content and any external clue
media retain their existing behavior.

## Set up a game

### Browse and preview games

**Game Content** contains the offline built-in library: all 22 JSON files in the
repository's `games/` folder, plus the separately labeled **Sample Jeopardy
Game**. These are statically included in the host bundle; choosing a game does
not fetch it from a server. Search by title or Round 1 category, then select a
result to stage it.

The Round 1, Double Jeopardy, and Final Jeopardy tabs show a host-only preview.
Select any clue to read the question; its response stays hidden until **Reveal
answer** is selected. Preview content is not sent to the audience display and
does not alter the live game. **Cancel preview** discards the staged selection.

Both a built-in selection and **Import JSON file** follow the same workflow:

1. Select or import content to validate and stage it. No contestants are
   created or changed, and preview is available before player setup.
2. Configure two or three contestants with unique buzzer keys in **Player
   Setup**. Names, keys, and existing scores remain host-controlled.
3. Review **Game Rules Configuration** and select **Apply Rules** after making
   changes.
4. Select **Load game** to commit the staged question content. An invalid
   roster blocks the load; the staged preview remains available. Replacing a
   game that has progressed asks for confirmation.
5. Select **Open Board**, then **Start Game** when ready. Loading prepares a
   fresh Round 1; it does not start play.

After content loads, **Game setup** collapses so the live controls stay prominent.
Select its summary at any time to reopen the content, contestant, and rules
controls.

### Import custom game content

Select **Import JSON file** to choose a local JSON game set. A valid file is
staged for the same preview and explicit **Load game** commit as built-in
content. Invalid files report validation details and do not discard a valid
staged game or replace the live game. The input resets after selection so the
same file can be selected again. Picker cancellation has no effect. Use
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

### Convert J-Archive HTML (developer CLI)

With the project development dependencies installed (`npm ci`), run from the
repository root:

```powershell
npm run import:archive -- --help
npm run import:archive -- --game-id 9553 --output ".\games\game-9553.json"
npm run import:archive -- --game-id 9555 --output ".\games\game-9555.json"
npm run import:archive -- --input ".\games\saved-game.html" --output ".\games\saved-game.json"
```

Use either `--game-id` or `--input`, not both. Output parents are created;
existing output files are never overwritten. Choose a new filename for another
conversion. Invalid/incomplete content fails without publishing a partial JSON
file. Then create contestants and use **Import JSON File** in the host.

This tool uses the existing jsdom parser (no page scripts or external resources
execute), the app's AJV schema, and additional archive coordinate, value, ID, and
Daily Double checks. It extracts visible clue text by board coordinate and only
`em.correct_response` from the matching hidden response node—not contestant
responses, results tables, commentary, play order, or Daily Double wagers.
Final Jeopardy is emitted with `value: 1` and `dailyDouble: false`.

Supported input is a complete modern game: six categories of five clues in each
round, exactly one/two Daily Doubles, $200–$1000/$400–$2000 value ladders, and one
Final clue. Historical hover-JavaScript-only answers, older value ladders,
incomplete boards, and fields exceeding the app limits are rejected, never
guessed or truncated. Category/clue/response limits are 50/500/200 characters;
the game title limit is 100. Whitespace and HTML entities are normalized.

**Media review is required where warnings identify links or embedded media.**
Nothing is downloaded or attached as `media`. Category notes/instructions and
all clue/response/category links are explicitly reported on stderr, including
links that might merely be references. Review them and prepare any necessary
permitted local assets/instructions before offline play; generated JSON alone
may not be playable for media-dependent clues. Save stderr separately if you
need a lasting source/notes report:

```powershell
npm run import:archive -- --input ".\games\saved-game.html" --output ".\games\review.json" 2> ".\games\review-report.txt"
```

The title retains the source episode title/date and `author` identifies
J-Archive. The source URL/path is reported separately to avoid invalid extra
schema properties. `createdAt` uses the deterministic sentinel
`1970-01-01T00:00:00.000Z` (not the episode date); live IDs use the game ID,
while saved-input IDs use a hash of the HTML. Repeating the same input produces
identical JSON, independent of conversion time.

Live mode makes one ordinary HTTPS request with a 15-second total timeout and
5 MiB response limit. It does not follow redirects, retry, evade HTTP denials,
or bypass access controls; failures explain how to use legitimately saved HTML
instead. Use only content you have permission to access and reuse, follow site
terms, retain appropriate attribution, and do not commit archive clues/media
to this repository. Automated tests use only original synthetic content and
stub/local-server networking.

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
   buzzing reopens for another contestant in the same action. When every
   contestant has been locked out, the clue closes automatically and is marked
   used.
6. Use **No response · close clue** to mark a clue used without changing a score;
   it is available both after a buzz and while listening for one. While
   listening, **Reset clue · clear lockouts** lets locked-out contestants buzz
   again. Use **Release buzz**, **Clear lockouts**, or a contestant row under
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
npm run test:archive
npm run test:e2e
npm run test:visual
npm run test:receipt
npm run record:game
npm audit --audit-level=high
npm run verify
```

- `verify:quick` creates a production build and runs the app Vitest tests in
  jsdom and deterministic archive-tooling tests in Node.
- `test:archive` covers original HTML conversion, validation failures, CLI
  arguments, safe file publication, and bounded network failures.
- `test:e2e` runs 16 Playwright tests covering setup, popup synchronization,
  reload recovery, scoring, control, Daily Doubles, round transitions, Final
  Jeopardy, media fallbacks, original archive-CLI file import, accessibility, and
  the approved presentation states.
- `test:visual` compares ten named host and board states with committed
  screenshots at the required viewports.
- `test:receipt` plays all 60 clues and Final Jeopardy, announces a winner, and
  records screenshots, a trace, both page videos, and an HTML report.
- `record:game` runs that same full episode with the bundled questions and three
  default contestants. It saves named `game-board.webm` and `host-board.webm`
  recordings and attaches both to the HTML report.
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

To record a custom question pack and contestant roster, pass a valid game-set JSON
file plus two or three comma-separated `Name:Key` pairs:

```powershell
npm run record:game -- --game-set .\src\assets\game-sets\sample-game.json --players "Ada:A,Grace:S,Linus:D"
```

The automation configures the contestants, imports the questions, explicitly
starts Round 1, plays every regular clue and Daily Double through both rounds,
completes Final Jeopardy, and shows the winner. The host and audience board share
one browser context so synchronization matches production. The named videos,
state assertions, screenshots, trace, and report are emitted beneath
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
