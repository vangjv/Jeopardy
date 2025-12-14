# Phase 6: Daily Double Implementation

## Overview

Phase 6 (User Story 4) implements the Daily Double special round feature with wager validation, single-contestant answer mechanics, and synchronized display across host and board interfaces.

**Status:** ✅ COMPLETE - All 10 tasks implemented

## Implementation Summary

### What Was Already Done (Phases 1-5)

The following functionality was already implemented in previous phases:

1. **T072** - Daily Double UI indicator in `ClueDisplayComponent`
   - Board display shows "DAILY DOUBLE!" header when `clue.dailyDouble` is true
   - Already integrated in board/components/clue-display/clue-display.component.html

2. **T074** - Daily Double detection in `GameStateService.selectClue()`
   - Line 318: `buzzerEnabled: !foundClue!.dailyDouble`
   - Automatically disables buzzer when Daily Double is detected

3. **T075** - Disable buzzing for non-selecting contestants
   - Handled by setting `buzzerEnabled: false` in selectClue()
   - Only the control player (who selected the clue) can buzz

4. **T076** - Wager validation logic in `ValidationService.validateDailyDoubleWager()`
   - Lines 231-264 implement full validation
   - Checks player exists, wager is positive integer, within allowed range

5. **T077** - Wager min/max calculation in `wager-calculator.ts`
   - `getMinDailyDoubleWager()`: Returns $5 (standard Jeopardy minimum)
   - `getMaxDailyDoubleWager()`: Returns max(playerScore, highestBoardValue)
   - `isValidDailyDoubleWager()`: Validates wager is in range

6. **T079** - Score adjudication using `dailyDoubleWager`
   - Line 35 of score-adjudication.component.ts: Uses `state.dailyDoubleWager || state.activeClue.clue.value`
   - Correctly applies wagered amount when marking correct/incorrect

7. **T081** - Display Daily Double indicator and wager on board
   - ClueDisplayComponent already shows dailyDouble indicator
   - Value display uses dailyDoubleWager when available (line 36)

### What Was Implemented in Phase 6

#### 1. Added Daily Double Wager Sync Event (T080)

**Files Modified:**
- `src/app/shared/models/sync-event.model.ts`
- `src/app/shared/services/sync.service.ts`
- `src/app/shared/services/game-state.service.ts`

**Changes:**
- Added `DAILY_DOUBLE_WAGER` to SyncEventType enum
- Created `DailyDoubleWagerPayload` interface with wager, playerId, playerName
- Implemented `broadcastDailyDoubleWager()` method in SyncService
- Implemented `onDailyDoubleWager()` subscription method in SyncService
- Updated ISyncService interface for type safety
- GameStateService.setDailyDoubleWager() now broadcasts sync event

#### 2. Created DailyDoubleWagerComponent (T073, T078)

**Files Created:**
- `src/app/host/components/daily-double-wager/daily-double-wager.component.ts`
- `src/app/host/components/daily-double-wager/daily-double-wager.component.html`
- `src/app/host/components/daily-double-wager/daily-double-wager.component.scss`

**Features:**
- Shows only when Daily Double is active and wager not yet set
- Displays control player name and current score
- Shows min/max wager limits
- Number input with $100 step increments
- Real-time validation with error messages
- Defaults to max allowed wager
- Integrates with ValidationService for validation
- Calls GameStateService.setDailyDoubleWager() on submit

**Files Modified:**
- `src/app/host/host.component.ts` - Added import and component to imports array
- `src/app/host/host.component.html` - Added `<app-daily-double-wager>` to left column

## Architecture

### Data Flow

```
1. Host selects Daily Double clue
   ↓
2. GameStateService.selectClue() detects dailyDouble flag
   ↓
3. Sets buzzerEnabled=false, activeClue.isDailyDouble=true
   ↓
4. DailyDoubleWagerComponent shows (showWagerInput signal becomes true)
   ↓
5. Host enters wager amount
   ↓
6. ValidationService.validateDailyDoubleWager() checks validity
   ↓
7. GameStateService.setDailyDoubleWager() stores wager
   ↓
8. SyncService.broadcastDailyDoubleWager() syncs to board
   ↓
9. Sets buzzerEnabled=true (only control player can buzz)
   ↓
10. ScoreAdjudicationComponent uses dailyDoubleWager for scoring
```

### State Management

**GameState properties:**
- `dailyDoubleWager: number | null` - Current wager amount
- `activeClue.isDailyDouble: boolean` - Whether clue is DD
- `buzzerEnabled: boolean` - Controls buzzer availability
- `controlPlayerId: string | null` - Player who selected the clue

**Component Signals:**
- `showWagerInput` - Controls visibility of wager form
- `controlPlayer` - The player making the wager
- `wagerAmount` - Two-way bound input value
- `minWager` / `maxWager` - Calculated limits
- `errorMessage` - Validation error display

## Validation Rules

### Wager Constraints

- **Minimum**: $5 (standard Jeopardy rule)
- **Maximum**: `max(playerScore, highestBoardValue)`
  - If player has positive score: Use their score OR highest board value (whichever is greater)
  - If player has zero/negative score: Use highest board value

### Examples

| Player Score | Round | Highest Value | Min Wager | Max Wager |
|--------------|-------|---------------|-----------|-----------|
| $800         | 1     | $1000         | $5        | $1000     |
| $1500        | 1     | $1000         | $5        | $1500     |
| $0           | 2     | $2000         | $5        | $2000     |
| -$500        | 2     | $2000         | $5        | $2000     |
| $3000        | 2     | $2000         | $5        | $3000     |

## User Interface

### Host Console

**Daily Double Wager Card:**
- Gold gradient background (#ffd700 to #ffed4e)
- Brown border (#b8860b) for visual distinction
- Player info section:
  - Player name (bold, 1.2rem)
  - Current score display
- Wager limits display (min/max)
- Number input field with $ prefix
- "Set Wager" button (disabled if validation error)
- Real-time error messages below input

**Visibility Logic:**
- Only shows when: `activeClue.isDailyDouble && dailyDoubleWager === null`
- Hides after: Wager is successfully submitted
- Position: Left column, between game-import and buzzer-panel

### Board Display

**Daily Double Indicator:**
- "DAILY DOUBLE!" header (already implemented in Phase 3)
- Value display shows wager amount (not original clue value)
- Controlled by `showWagersOnBoard` rule (default: false)

## Sync Protocol

### Event: DAILY_DOUBLE_WAGER

**Direction:** Host → Board

**Payload:**
```typescript
{
  wager: number;      // The wagered amount
  playerId: string;   // Control player's ID
  playerName: string; // Control player's name
}
```

**Trigger:** When host submits valid wager via DailyDoubleWagerComponent

**Board Handling:** Updates local state to reflect wager (via STATE_SYNC event)

## Testing Checklist

### Manual Test Scenarios

- [ ] Start game with 2-3 players
- [ ] Import game content with Daily Doubles marked
- [ ] Select a Daily Double clue
- [ ] Verify wager input appears with correct player info
- [ ] Test min wager validation ($5)
- [ ] Test max wager validation (score vs board value)
- [ ] Test negative score scenario (max = board value)
- [ ] Submit valid wager
- [ ] Verify wager input disappears
- [ ] Verify clue displays with wagered value
- [ ] Mark answer correct - verify score increases by wager
- [ ] Select another Daily Double
- [ ] Mark answer incorrect - verify score decreases by wager
- [ ] Test board sync - wager shows on second screen
- [ ] Test with `showWagersOnBoard` rule enabled/disabled

### Edge Cases

1. **Negative Score Player:**
   - Max wager should be highest board value (not player score)
   - Min wager still $5

2. **Very High Score:**
   - Max wager should be player score (exceeds board value)
   - E.g., $5000 score in Round 1 allows $5000 wager (not just $1000)

3. **Zero Score:**
   - Treated same as negative score
   - Max = highest board value

4. **Board Reconnection:**
   - If board refreshes mid-Daily-Double, wager should sync
   - STATE_SYNC event includes dailyDoubleWager

## Known Limitations

1. **Single Attempt Only:**
   - Daily Double allows only the control player to attempt
   - Other players cannot buzz in
   - This is by design (standard Jeopardy rules)

2. **Wager Visibility:**
   - Board display controlled by `rules.showWagersOnBoard`
   - Default is false (host only sees wager before reveal)
   - Can be changed in Phase 7 (configurable rules)

3. **No Timer:**
   - No automatic timeout for wager entry
   - Host must manually skip if player takes too long
   - Timer feature is in Phase 7 (optional)

## Integration Points

### Depends On:
- GameStateService (Phase 2)
- ValidationService (Phase 2)
- SyncService (Phase 2)
- ClueDisplayComponent (Phase 3)
- ScoreAdjudicationComponent (Phase 3)
- Wager calculation utilities (Phase 2)

### Used By:
- Phase 7: Game rules configuration (showWagersOnBoard setting)
- Phase 8: Custom game content import (dailyDouble flag in JSON)

## Files Modified

### Core Services
- `src/app/shared/services/game-state.service.ts`
- `src/app/shared/services/sync.service.ts`

### Models
- `src/app/shared/models/sync-event.model.ts`

### Host Components
- `src/app/host/host.component.ts`
- `src/app/host/host.component.html`
- `src/app/host/components/daily-double-wager/` (new directory)

### Documentation
- `specs/001-jeopardy-game-app/tasks.md`

## Build & Runtime Status

✅ **TypeScript Compilation:** Clean (no errors)  
✅ **Production Build:** Successful  
✅ **Dev Server:** Running on http://localhost:4200  
⚠️ **Bundle Size:** 649.75 kB (exceeds 500 kB budget by 149.75 kB)  
⚠️ **ajv Dependencies:** CommonJS modules (acceptable for validation library)

## Next Phase

Phase 7 will add configurable game rules, including:
- `showWagersOnBoard` - Display wagers on board during Daily Double
- `buzzerTimeoutSeconds` - Optional timer for wager entry
- Other penalty and display settings

Phase 6 provides the foundation for all Daily Double mechanics.
