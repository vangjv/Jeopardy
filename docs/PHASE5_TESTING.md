# Phase 5 Testing Guide

## Overview
This document provides comprehensive testing scenarios for Phase 5 features: enhanced buzzer system with validation, lockout management, and visual indicators.

## Prerequisites
- Node.js installed
- Dependencies installed: `npm install`
- Development server running: `npm start`

## Test Environment Setup

### 1. Start Development Server
```bash
npm start
# Server starts at http://localhost:4200
```

### 2. Open Host Interface
Navigate to: `http://localhost:4200/host`

### 3. Open Board Display
- Click "Open Board" button in host interface
- Board opens in new window at: `http://localhost:4200/board`
- Keep both windows visible side-by-side for testing

## Test Scenarios

### Scenario 1: Buzzer Key Validation (T061-T062)

**Purpose**: Verify real-time key conflict detection

**Steps**:
1. In host interface, navigate to player setup
2. Add Player 1 with buzzer key "A"
3. Add Player 2 with buzzer key "S"
4. Add Player 3 with buzzer key "D"
5. Try to change Player 2's key to "A"

**Expected Results**:
- ✅ Visual conflict indicator appears for Player 2
- ✅ Conflict warning highlights the duplicate key
- ✅ Both players with "A" show conflict state
- ✅ System prevents saving invalid configuration

**Pass Criteria**: Duplicate keys cannot be assigned, clear visual feedback provided

---

### Scenario 2: First-Buzz Detection (T063-T064)

**Purpose**: Verify accurate first-buzz determination with <10ms accuracy

**Steps**:
1. Complete player setup with 3 players
2. Load sample game content (if available, or skip clue selection)
3. Select any clue to display
4. Enable buzzer (automatically enabled after clue selection)
5. Press keys A, S, D simultaneously
6. Observe which player is registered as first

**Expected Results**:
- ✅ Only ONE player is registered as buzzing in
- ✅ Timestamp is recorded using performance.now()
- ✅ Buzzer locks immediately after first press
- ✅ Subsequent key presses are ignored
- ✅ Host shows which player buzzed
- ✅ Board shows buzz indicator with player name

**Pass Criteria**: First buzz accurately detected, other presses ignored

---

### Scenario 3: Lockout on Incorrect Response (T065-T067)

**Purpose**: Verify contestant lockout functionality

**Steps**:
1. Continue from Scenario 2 with player buzzed in
2. In host interface, click "Incorrect" button
3. Observe lockout indicators
4. Try pressing the locked-out player's key again
5. Try pressing another player's key

**Expected Results**:

**Host Interface**:
- ✅ Player appears in "Locked Out" list in Buzzer Panel
- ✅ Player name shown with visual indicator
- ✅ "Clear Lockouts" button appears
- ✅ Score adjusted if penalty rule enabled

**Board Display**:
- ✅ Floating lockout indicator appears (bottom-right)
- ✅ Shows 🚫 icon and "Locked Out" title
- ✅ Lists locked-out player name
- ✅ Score display shows 🚫 badge next to player name
- ✅ Player score has red border and tinted background
- ✅ Lockout badge pulses for attention

**Buzzer Behavior**:
- ✅ Locked-out player's key press is ignored
- ✅ Other players can still buzz
- ✅ Buzzer remains functional for non-locked players

**Pass Criteria**: Lockout prevents buzzing, visual indicators appear on both displays

---

### Scenario 4: Multiple Player Lockouts (T066-T067)

**Purpose**: Verify system handles multiple locked-out players

**Steps**:
1. Continue from Scenario 3
2. Have second player buzz and answer incorrectly
3. Have second player also locked out
4. Observe indicators with 2 locked-out players
5. Try having third player buzz

**Expected Results**:
- ✅ Both locked-out players shown in host lockout list
- ✅ Board lockout indicator shows both player names
- ✅ Both players have 🚫 badges on score display
- ✅ Only third player can buzz
- ✅ Visual indicators remain clear and readable

**Pass Criteria**: Multiple lockouts tracked correctly, UI remains clear

---

### Scenario 5: Lockout Reset (T068-T069)

**Purpose**: Verify host can clear all lockouts

**Steps**:
1. Continue from Scenario 4 with 2 players locked out
2. Click "Clear Lockouts" button in host Buzzer Panel
3. Observe indicator changes
4. Test buzzer with previously locked-out players

**Expected Results**:

**Immediate Effects**:
- ✅ Host lockout list clears
- ✅ "Clear Lockouts" button disappears
- ✅ Board floating lockout indicator disappears
- ✅ Score display 🚫 badges removed
- ✅ Red border/background removed from scores

**Buzzer Functionality**:
- ✅ Previously locked-out players can now buzz
- ✅ All players treated equally
- ✅ First-buzz detection works correctly

**Pass Criteria**: Lockouts cleared, all players can buzz again

---

### Scenario 6: Buzz Reset (T068)

**Purpose**: Verify buzzer reset clears active buzz

**Steps**:
1. Have player buzz in
2. Before adjudicating, click "Reset Buzzer" button
3. Observe state changes

**Expected Results**:
- ✅ Buzz indicator disappears on board
- ✅ Locked player indicator clears
- ✅ Buzzer re-enabled for all players
- ✅ No lockouts applied
- ✅ Players can buzz again immediately

**Pass Criteria**: Buzz cleared without penalty, buzzer operational

---

### Scenario 7: Visual Indicator Verification (T070-T071)

**Purpose**: Verify all visual indicators are clear and readable

**Setup**: Position board display on large screen or project on wall

**Checklist**:

**Floating Lockout Indicator (Bottom-Right)**:
- [ ] Indicator appears when players locked out
- [ ] Disappears when no lockouts
- [ ] Red background clearly visible
- [ ] 🚫 icon and title legible
- [ ] Player names readable from 10+ feet
- [ ] Doesn't obstruct game content
- [ ] Stacks properly with other UI elements

**Score Display Lockout Badges**:
- [ ] 🚫 emoji visible next to locked-out players
- [ ] Red border around locked-out player score
- [ ] Red tinted background applied
- [ ] Pulsing animation draws attention
- [ ] Score remains readable with reduced opacity
- [ ] Player name color change visible (#ff8888)
- [ ] Multiple locked-out players clearly distinguished

**Accessibility**:
- [ ] Color contrast sufficient (WCAG guidelines)
- [ ] Multiple visual cues (not color-only)
- [ ] Animation doesn't cause distraction
- [ ] Text remains readable at all sizes

**Pass Criteria**: All indicators visible, clear, and accessible

---

## Automated Tests

### Run Unit Tests
```bash
npm test -- --watch=false --browsers=ChromeHeadless
```

**Expected**: All tests pass (2 specs as of Phase 5)

### Run Build Verification
```bash
npm run build
```

**Expected**: Build succeeds without TypeScript errors

---

## Performance Verification

### Buzz Timing Accuracy (T063)
- First-buzz detection uses `performance.now()`
- Target: <10ms accuracy
- Monitor: BuzzerService line 117

### Sync Latency (Phase 4 + 5)
- Lockout state synchronized via GameStateService
- Target: <100ms from host to board
- Test: Click "Clear Lockouts", measure board update

### Visual Animation Performance
- Lockout badge pulsing animation
- Score display transitions
- Target: 60 FPS, GPU-accelerated
- Monitor: No jank or lag in animations

---

## Regression Testing

After Phase 5 changes, verify previous features still work:

### Phase 3 Features (User Story 1)
- [ ] Player setup (add/remove/edit)
- [ ] Clue selection and display
- [ ] Basic buzzer input
- [ ] Score adjudication (correct/incorrect)

### Phase 4 Features (User Story 2)
- [ ] Host-board synchronization
- [ ] Board popup window
- [ ] State resync on reconnection
- [ ] Connection status indicator

---

## Known Limitations

1. **Lockout Persistence**: Lockouts clear when clue is closed
2. **No Partial Lockouts**: All-or-nothing per clue
3. **Manual Override Only**: Host must clear lockouts manually
4. **No Lockout History**: No tracking of past lockouts

These limitations are by design for Phase 5 scope. Future phases may address them.

---

## Troubleshooting

### Issue: Board doesn't show lockout indicator
**Solutions**:
1. Verify board display is connected (check connection indicator)
2. Refresh board window (sends BOARD_READY to resync)
3. Check browser console for sync errors
4. Ensure BroadcastChannel API supported (modern browsers)

### Issue: Locked-out player can still buzz
**Solutions**:
1. Verify `rules.lockoutWrongResponder` is enabled
2. Check BuzzerService lockout validation (line 109)
3. Confirm player ID matches in lockout set
4. Review GameStateService.setLockedOutPlayers() calls

### Issue: Visual indicators not appearing
**Solutions**:
1. Check component subscriptions to game state
2. Verify signals updating (Angular DevTools)
3. Review CSS classes applied correctly
4. Check z-index stacking order

---

## Success Criteria Summary

Phase 5 is complete when:
- ✅ All 11 tasks (T061-T071) implemented
- ✅ Build succeeds without errors
- ✅ All unit tests pass
- ✅ Manual testing scenarios pass
- ✅ Visual indicators clear on both displays
- ✅ Performance targets met (<10ms buzz, <100ms sync)
- ✅ Regression tests pass (Phases 3-4 features work)

---

**Document Version**: 1.0  
**Last Updated**: December 14, 2025  
**Phase**: 5 (User Story 3)  
**Status**: Complete ✅
