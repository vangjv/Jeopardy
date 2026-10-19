## 1) Product overview

Build an **Angular 21+ single-page app** that runs a **Jeopardy-style game** in a browser with **two synchronized UIs**:

* **Host UI**: controls the game, manages contestants, reveals clues, enters/validates responses, scores, timers.
* **Board (Contestant/Audience) UI**: separate **popup window** intended for a second screen; shows the Jeopardy board and clue display (read-only).

The two windows stay synchronized in real time (same machine, same browser profile).

---

## 2) App structure

### Routes

* `/host` — host console
* `/board` — board display (opened by host as popup)

### Window sync

* Primary: **BroadcastChannel**
* Fallback: `window.postMessage` between opener and popup

**Requirement:** if `/board` reloads, it requests a full state sync and resumes.

---

## 3) Data model (game content)

### Game set format (spec-defined)

A “game” consists of:

* **Round 1**: Jeopardy (6 categories × 5 clues)
* **Round 2**: Double Jeopardy (6 categories × 5 clues)
* **Final Jeopardy**: 1 category × 1 clue

Each clue includes:

* `clueText`
* `correctResponse` (host-only until revealed)
* `value` (e.g., 200, 400…; doubles in Round 2)
* optional `dailyDouble: boolean`
* optional `media` (image/audio/video) with safe URL or embedded asset reference

**Validation requirements**

* Exactly 6 categories per round; each has 5 clues
* Values must match configured board values (configurable)
* A clue can only be selected once

---

## 4) Core game flow (MVP)

### A. Setup

Host configures:

* Player names (2–3 players)
* Starting scores (default 0)
* Buzz-in keys per player (configurable; conflict detection)
* Board values set (defaults: Round 1 = 200–1000, Round 2 = 400–2000; configurable)

### B. Round play

1. Board shows unrevealed clue grid.
2. Host selects (or confirms) a clue when a player chooses it.
3. Board switches to **Clue View**:

   * shows category + value + clue text
   * (optional) starts clue read timer
4. Buzz-in phase begins when host enables it (or auto after N seconds).

### C. Buzz-in

* Players buzz using keystrokes.
* First buzz locks in (host can reset/reopen).
* Board displays which player buzzed first.
* Host marks the response:

  * **Correct** → add clue value
  * **Incorrect** → subtract clue value (MVP default), optionally lock out that player until reset
  * **No response / time** → host can reveal correct response and reopen buzz (optional)

### D. Control of board

* The player who answered correctly selects next clue (host can track “control” player).
* Host can override control at any time.

### E. Daily Double (MVP support)

When a Daily Double clue is selected:

* Board indicates “Daily Double” (show-like)
* **Buzzing disabled**
* Host sets/enters **wager** for the selecting player:

  * Minimum: $5 (or configurable)
  * Maximum: the player’s score or the highest value on the board (Jeopardy rule variant; configurable)
* Host marks response correct/incorrect:

  * Correct → add wager
  * Incorrect → subtract wager
* Return to board

### F. Round end

* When all clues are used, host transitions to next round.
* On starting Double Jeopardy, board updates to round 2 categories and values.

### G. Final Jeopardy (MVP support)

1. Board shows Final category.
2. Host enters wagers for each player (host-only).
3. Board displays final clue text.
4. Host collects responses (host-only) and then reveals:

   * player responses (optional on board)
   * correct response
5. Host marks each player correct/incorrect; apply wagers; show final scores and winner.

---

## 5) Host UI specification

### Sections

1. **Game Setup**

   * players (name, score)
   * buzzer keys
   * rule toggles (see section 9)
2. **Game Content**

   * select game set / round
   * category/clue editor (optional)
   * validation warnings panel
3. **Round Control**

   * start round / next round / final
   * enable/disable buzzing
   * timer controls (start/stop/reset)
4. **Clue Control**

   * show clue
   * reveal correct response (host-only button; optionally board reveal after adjudication)
   * adjudication buttons: Correct / Incorrect / No Answer
   * lockout controls (reopen buzz, reset lockouts)
5. **Daily Double Control**

   * wager entry + validation
   * adjudication
6. **Score Control**

   * manual score adjustment
   * undo last action (nice-to-have)
7. **Board Control**

   * mark clue as used/unused (admin override)
   * set current control player

### Host-only visibility

* Correct responses
* Player wagers (Daily Double / Final)
* Optional notes per clue

---

## 6) Board (Contestant/Audience) UI specification

### Board view

* 6 category headers
* 5 rows of values (unrevealed clues show the dollar amount)
* used clues show blank / dimmed / logo tile
* footer shows player names + scores + “control” highlight

### Clue view

* category name + value
* clue text (large)
* buzzing indicator (“Buzz In!”)
* shows who buzzed first
* optional timer countdown indicator

### Daily Double view

* “Daily Double” splash
* then clue view (without buzzing)
* optionally show wager (configurable; default hidden to audience)

### Final Jeopardy view

* final category splash
* final clue
* optional reveal sequence of player responses and wagers (configurable)

---

## 7) State model & events (recommended)

### Single source of truth

Host window owns authoritative `GameState`. Board subscribes.

### `GameState` (minimal)

* `players: { id, name, score, buzzerKey, lockedOut?: boolean }[]`
* `game: { round: 'J'|'DJ'|'FJ', controlPlayerId?: string }`
* `board: { categories: { id, title, clues: { id, value, used, dailyDouble?, clueText, correctResponse, media? }[] }[] }`
* `activeClue?: { clueId, categoryId, value, phase }`
* `buzz: { enabled, locked, winnerPlayerId?, timestamp? }`
* `timers: { clueSecondsRemaining?, running? }`
* `wagers: { dailyDouble?: { playerId, amount }, final?: { [playerId]: amount } }`
* `settings: { rules toggles }`

### Events (host → board)

* `STATE_SYNC`
* `ROUND_CHANGED`
* `CLUE_SELECTED`
* `BUZZ_ENABLED/BUZZ_DISABLED`
* `BUZZ_LOCKED`
* `CLUE_MARKED_USED`
* `SCORES_UPDATED`
* `FINAL_PHASE_CHANGED`

Board → host (optional)

* `BOARD_READY`
* `RESYNC_REQUEST`

---

## 8) Input handling (buzzers)

### Requirements

* keystroke-based buzzers mapped per player
* first buzz locks in when buzzing is enabled
* optional lockout: wrong responder cannot buzz again until host resets/reopens
* host can:

  * reset buzz lock
  * clear lockouts
  * disable buzzing (Daily Double / pre-read)

---

## 9) Rules configuration (toggles)

Add host-configurable options (defaults in parentheses):

* Wrong answer subtracts value (ON)
* Lock out wrong responder until buzz reset (ON)
* Buzzing enabled immediately vs after host starts it (HOST CONTROL)
* Show wagers on board (OFF)
* Reveal correct response on board automatically afterz (OFF; host-controlled)
* Daily Double max wager rule:

  * max = player score or top board value (configurable)
* Timeouts:

  * clue buzz window seconds (optional)
  * response time seconds (10-second default; 0 or empty disables the timeout)
  * if a contestant does not answer before their response timeout, automatically
    adjudicate the buzz as incorrect, including the configured score deduction,
    wrong-responder lockout, and incorrect-response sound

---

## 10) Non-functional requirements

* No backend required for MVP (single browser instance)
* Works offline after load (optional PWA)
* Board optimized for 1080p/4K display
* Navigation guard to prevent accidental refresh/close mid-game
* Import validation + warnings (never crash on bad data)

---

## 11) Acceptance criteria (MVP)

1. Host can configure 2–3 players, buzzer keys, and start a game.
2. Host can open `/board` in a popup and it stays in sync.
3. Board displays a 6×5 clue grid for Round 1 and updates to Round 2.
4. Host can select a clue; board shows clue view.
5. Buzzers work via keystrokes only when enabled; first buzz locks; host can reset.
6. Host adjudicates correct/incorrect; scores update accordingly in both views.
7. Used clues are marked and cannot be selected again (unless host override).
8. Daily Double flow works (no buzzing; wager; adjudication).
9. Final Jeopardy flow works (category, wagers host-only, clue, adjudication, final scores).

---

## 12) Out of scope (for MVP)

* Multi-device play over the network (would need server/WebSocket)
* Speech-to-text response matching
* Licensed Jeopardy assets/sounds (can do “inspired-by” styling)
* Full animation package

If you want, I can also draft a **game-set JSON schema** (Round 1/2/Final) plus a simple **importer/validator** spec so you can drop your clue packs in the same way you did for Family Feud.
