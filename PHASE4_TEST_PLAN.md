# Phase 4 Testing Plan - Synchronized Display

## Overview
This document outlines manual testing procedures to verify that User Story 2 (Synchronized Display) is working correctly.

## Test Environment Setup

1. **Start Development Server**:
   ```bash
   npm start
   ```
   Server runs at: http://localhost:4200

2. **Browser Requirements**:
   - Chrome, Firefox, Edge, or Safari (latest versions)
   - BroadcastChannel API support (all modern browsers)
   - Two browser windows/tabs

## Test Scenarios

### Test 1: Basic Connection and Initialization

**Objective**: Verify that board display can connect to host and receive initial state

**Steps**:
1. Open http://localhost:4200/host in Window 1
2. Observe host console interface loads
3. Click "Open Board Display" button
4. Verify board window opens at http://localhost:4200/board
5. Check connection status indicator in top-right corner of board
6. Verify status shows "Connected" with green background

**Expected Results**:
- ✅ Board window opens in new window
- ✅ Connection status shows green "Connected"
- ✅ No errors in browser console
- ✅ Board shows empty game board or setup state

### Test 2: Player Setup Synchronization

**Objective**: Verify player additions/changes sync to board

**Steps**:
1. Continue from Test 1 with both windows open
2. In host window, add Player 1 (name: "Alice", buzzer: "A")
3. Observe board window score display
4. Add Player 2 (name: "Bob", buzzer: "S")
5. Add Player 3 (name: "Charlie", buzzer: "D")
6. Verify all players appear in board score display

**Expected Results**:
- ✅ Each player addition appears on board within 100ms
- ✅ Player names and initial scores (0) displayed
- ✅ No lag or delays in synchronization

### Test 3: Game Content Import and Board Sync

**Objective**: Verify game content loads and syncs to board

**Steps**:
1. Continue from Test 2
2. In host window, import game content JSON
3. Verify board updates to show category titles
4. Verify board shows clue values (200-1000)
5. Click "Start Game" in host
6. Verify board transitions to Round 1 display

**Expected Results**:
- ✅ Board displays 6 categories × 5 clues grid
- ✅ Category titles visible
- ✅ Clue values displayed correctly
- ✅ Round indicator shows "Round 1"

### Test 4: Clue Selection Synchronization

**Objective**: Verify clue selection broadcasts to board

**Steps**:
1. Continue from Test 3 with game started
2. In host window, click a clue (e.g., Category 1, $200)
3. Observe board window immediately
4. Verify clue text displays full-screen on board
5. Verify host shows clue with control buttons

**Expected Results**:
- ✅ Board switches to full-screen clue display within 100ms
- ✅ Clue text readable and properly formatted
- ✅ Category title shown on board
- ✅ Clue value displayed

### Test 5: Buzzer State Synchronization

**Objective**: Verify buzzer enable/lock/reset sync to board

**Steps**:
1. Continue from Test 4 with clue displayed
2. In host window, enable buzzer
3. Observe board shows "buzz in" indicator
4. Press "A" key (Alice's buzzer)
5. Verify board highlights Alice immediately
6. Verify board shows "Alice buzzed in!" message
7. In host, click "Reset Buzz"
8. Verify board clears buzz indicator

**Expected Results**:
- ✅ Buzz indicator appears on board when enabled
- ✅ Alice's buzz registered within 10ms (check console timestamps)
- ✅ Board highlights Alice's score panel
- ✅ Buzz reset clears all indicators on board

### Test 6: Score Update Synchronization

**Objective**: Verify score changes sync to board

**Steps**:
1. Continue from Test 5 with Alice buzzed in
2. In host, click "Correct" (+200 for $200 clue)
3. Observe Alice's score on board
4. Verify score updates to 200
5. Close clue in host
6. Select another clue ($400)
7. Enable buzzer, press "S" (Bob)
8. Click "Incorrect" (-400 if penalties enabled)
9. Verify Bob's score updates on board

**Expected Results**:
- ✅ Alice's score updates to 200 within 100ms
- ✅ Bob's score updates correctly (0 or -400)
- ✅ No flicker or visual glitches
- ✅ Scores remain visible and accurate

### Test 7: Board Reconnection/Refresh

**Objective**: Verify board can reconnect after refresh

**Steps**:
1. Continue from Test 6 with active game state
2. Note current game state (players, scores, active clue)
3. In board window, press F5 to refresh
4. Observe connection status indicator
5. Verify status briefly shows "Connecting..." (yellow)
6. Verify status changes to "Connected" (green)
7. Verify game state restored (players, scores, clue/board)

**Expected Results**:
- ✅ Connection status shows "Connecting..." briefly
- ✅ Status changes to "Connected" within 2 seconds
- ✅ BOARD_READY message sent (check console)
- ✅ Host responds with STATE_SYNC (check console)
- ✅ Board displays restored to current game state
- ✅ No data loss or corruption

### Test 8: Connection Loss Detection

**Objective**: Verify board detects when host disconnects

**Steps**:
1. Continue from Test 7
2. Close the host window (Window 1)
3. Wait 5+ seconds
4. Observe board connection status indicator
5. Verify status changes to "Disconnected" (red)

**Expected Results**:
- ✅ Board detects no messages for 5 seconds
- ✅ Connection status changes to red "Disconnected"
- ✅ Error message displayed: "Disconnected - Refresh to reconnect"

### Test 9: Multiple Event Sequence

**Objective**: Verify rapid state changes sync correctly

**Steps**:
1. Open fresh host and board windows
2. Rapidly add 3 players
3. Import game content
4. Start game
5. Select clue → enable buzzer → buzz → correct → close clue
6. Repeat 3 times quickly
7. Verify board stays synchronized throughout

**Expected Results**:
- ✅ All state changes reflect on board
- ✅ No missed events or out-of-order updates
- ✅ No console errors
- ✅ Board remains responsive

### Test 10: Browser Console Verification

**Objective**: Verify sync events logged correctly

**Steps**:
1. Open browser DevTools console for both windows
2. Perform Test 4 (clue selection)
3. Check console logs for sync events

**Expected to see in Host console**:
```
SyncService initialized as host
Broadcasting: CLUE_SELECTED
Broadcasting: BUZZ_ENABLED
Broadcasting: BUZZ_LOCKED
Broadcasting: SCORES_UPDATED
Broadcasting: CLUE_CLEARED
```

**Expected to see in Board console**:
```
SyncService initialized as board
Sending: BOARD_READY
Received: STATE_SYNC
Received: CLUE_SELECTED
Received: BUZZ_ENABLED
Received: BUZZ_LOCKED
Received: SCORES_UPDATED
Received: CLUE_CLEARED
```

## Performance Benchmarks

### Latency Targets
- **First-buzz detection**: < 10ms (performance.now() timestamps)
- **Sync latency**: < 100ms (host action → board update)
- **Reconnection time**: < 2s (refresh → state restored)

### Measuring Performance
1. Open DevTools console
2. Enable timestamp logging
3. Record timestamp of host action
4. Record timestamp of board update
5. Calculate delta

Example:
```javascript
// In host console after buzzer press:
Host timestamp: 1234567890100.789

// In board console after buzz display:
Board timestamp: 1234567890100.850

// Latency = 0.061ms (well under 100ms target)
```

## Known Issues and Limitations

### MVP Scope
- ❌ No heartbeat mechanism (will be added in Phase 11)
- ❌ No message acknowledgment/retry (will be added in Phase 11)
- ❌ No multiple board instances support (Phase 11)
- ⚠️ Connection loss requires manual refresh (Phase 11 will add auto-retry)

### Browser Compatibility
- ✅ BroadcastChannel works on same machine only (by design)
- ✅ Requires modern browser (Chrome 54+, Firefox 38+, Edge 79+, Safari 15.4+)
- ❌ No IE11 support (deprecated)

## Troubleshooting

### Board not connecting
1. Check console for errors
2. Verify both windows on same origin (http://localhost:4200)
3. Verify BroadcastChannel support: `typeof BroadcastChannel !== 'undefined'`
4. Try refreshing board (sends BOARD_READY)

### Events not syncing
1. Check if SyncService initialized in both components
2. Verify console logs show message send/receive
3. Check if GameStateService has sync reference: host component sets it
4. Verify no console errors blocking execution

### Performance issues
1. Check browser console for errors
2. Monitor network tab for unexpected requests
3. Check CPU usage (should be low)
4. Verify state updates not triggering infinite loops

## Success Criteria

Phase 4 is considered **COMPLETE** when:

- ✅ All 10 test scenarios pass
- ✅ Sync latency < 100ms consistently
- ✅ Reconnection works reliably
- ✅ No console errors during normal operation
- ✅ Connection status indicator accurate
- ✅ All 21 tasks marked complete in tasks.md

## Next Steps

After Phase 4 validation:
- **Phase 5**: Implement User Story 3 (Enhanced Buzzer System)
- **Phase 6**: Implement User Story 4 (Daily Double)
- **Phase 7**: Implement User Story 5 (Multiple Rounds)
- **Phase 8**: Implement User Story 6 (Final Jeopardy)
