# Synchronization Protocol Contract

**Feature**: Jeopardy-Style Quiz Game System  
**Date**: 2025-12-14  
**Version**: 1.0.0

## Overview

This document defines the communication protocol between the Host interface and Board display interface using the BroadcastChannel API.

## Channel Configuration

**Channel Name**: `jeopardy-sync`

**Transport**: 
- Primary: BroadcastChannel API
- Fallback: window.postMessage (for unsupported browsers or cross-window scenarios)

**Message Format**: All messages are structured as `SyncEvent` objects

## Message Types

### 1. STATE_SYNC

**Direction**: Host → Board  
**Purpose**: Synchronize complete game state  
**Trigger**: Board initialization, reconnection, or explicit sync request

**Payload**:
```typescript
interface StateSyncPayload {
  gameState: GameState;  // Complete game state object
}
```

**Example**:
```json
{
  "type": "STATE_SYNC",
  "timestamp": 1234567890123.456,
  "payload": {
    "gameState": {
      "sessionId": "uuid-123",
      "phase": "round1",
      "players": [...],
      "currentRound": "round1",
      // ... complete state
    }
  }
}
```

**Board Response**: None (one-way)

**Frequency**: On-demand (not throttled)

---

### 2. BOARD_READY

**Direction**: Board → Host  
**Purpose**: Request full state synchronization  
**Trigger**: Board component initialization, page refresh, reconnection

**Payload**:
```typescript
interface BoardReadyPayload {
  requestSync: true;
  boardInstanceId: string;  // Unique ID for this board instance
}
```

**Example**:
```json
{
  "type": "BOARD_READY",
  "timestamp": 1234567890123.456,
  "payload": {
    "requestSync": true,
    "boardInstanceId": "board-uuid-456"
  }
}
```

**Host Response**: STATE_SYNC message with current game state

**Timeout**: Host should respond within 500ms

---

### 3. CLUE_SELECTED

**Direction**: Host → Board  
**Purpose**: Display a clue to all participants  
**Trigger**: Host selects a clue from the board

**Payload**:
```typescript
interface ClueSelectedPayload {
  clue: Clue;
  categoryTitle: string;
  isDailyDouble: boolean;
}
```

**Example**:
```json
{
  "type": "CLUE_SELECTED",
  "timestamp": 1234567890123.456,
  "payload": {
    "clue": {
      "id": "clue-uuid-789",
      "clueText": "This president was known for his top hat",
      "correctResponse": "Who is Abraham Lincoln?",
      "value": 400,
      "dailyDouble": false
    },
    "categoryTitle": "U.S. PRESIDENTS",
    "isDailyDouble": false
  }
}
```

**Board Action**: Display clue in full-screen view, hide board

**Display Rules**: 
- Clue text shown immediately
- Correct response hidden until CORRECT_RESPONSE_REVEALED event

---

### 4. CLUE_CLEARED

**Direction**: Host → Board  
**Purpose**: Return to board view after clue is complete  
**Trigger**: Host closes clue after adjudication

**Payload**: None (empty object)

**Example**:
```json
{
  "type": "CLUE_CLEARED",
  "timestamp": 1234567890123.456,
  "payload": {}
}
```

**Board Action**: Hide clue view, show updated board with used clue marked

---

### 5. BUZZ_ENABLED

**Direction**: Host → Board  
**Purpose**: Enable or disable buzzer input  
**Trigger**: Host enables buzzers for a clue or disables after a buzz

**Payload**:
```typescript
interface BuzzEnabledPayload {
  enabled: boolean;
}
```

**Example**:
```json
{
  "type": "BUZZ_ENABLED",
  "timestamp": 1234567890123.456,
  "payload": {
    "enabled": true
  }
}
```

**Board Action**: 
- If enabled: Show "BUZZ IN NOW" indicator
- If disabled: Hide buzz indicator

**Note**: Board is display-only; actual keyboard event handling is in host

---

### 6. BUZZ_LOCKED

**Direction**: Host → Board  
**Purpose**: Indicate a contestant has buzzed in  
**Trigger**: First contestant presses buzzer key

**Payload**:
```typescript
interface BuzzLockedPayload {
  playerId: string;
  playerName: string;
  timestamp: number;  // DOMHighResTimeStamp of buzz event
}
```

**Example**:
```json
{
  "type": "BUZZ_LOCKED",
  "timestamp": 1234567890123.456,
  "payload": {
    "playerId": "player-uuid-123",
    "playerName": "Alice",
    "timestamp": 1234567890100.789
  }
}
```

**Board Action**: 
- Display "{playerName} buzzed in!" message
- Highlight player's score panel
- Show "waiting for response" state

---

### 7. BUZZ_RESET

**Direction**: Host → Board  
**Purpose**: Clear buzz lock, allow other contestants to buzz  
**Trigger**: Host resets buzz after incorrect response or timeout

**Payload**: None (empty object)

**Example**:
```json
{
  "type": "BUZZ_RESET",
  "timestamp": 1234567890123.456,
  "payload": {}
}
```

**Board Action**: 
- Clear buzz indicator
- Remove player highlight
- Return to "buzz in" state if buzzers still enabled

---

### 8. SCORES_UPDATED

**Direction**: Host → Board  
**Purpose**: Update contestant scores  
**Trigger**: Correct/incorrect adjudication, manual score adjustment

**Payload**:
```typescript
interface ScoresUpdatedPayload {
  players: Player[];  // Complete player array with updated scores
}
```

**Example**:
```json
{
  "type": "SCORES_UPDATED",
  "timestamp": 1234567890123.456,
  "payload": {
    "players": [
      { "id": "p1", "name": "Alice", "score": 1200, "buzzerKey": "KeyA", "color": "#3b82f6" },
      { "id": "p2", "name": "Bob", "score": -400, "buzzerKey": "KeyB", "color": "#ef4444" },
      { "id": "p3", "name": "Charlie", "score": 800, "buzzerKey": "KeyC", "color": "#10b981" }
    ]
  }
}
```

**Board Action**: Update score displays with animation (optional)

---

### 9. CORRECT_RESPONSE_REVEALED

**Direction**: Host → Board  
**Purpose**: Show the correct response to the audience  
**Trigger**: Host reveals answer or adjudicates response

**Payload**:
```typescript
interface CorrectResponseRevealedPayload {
  correctResponse: string;
}
```

**Example**:
```json
{
  "type": "CORRECT_RESPONSE_REVEALED",
  "timestamp": 1234567890123.456,
  "payload": {
    "correctResponse": "Who is Abraham Lincoln?"
  }
}
```

**Board Action**: 
- Display correct response on screen
- Optionally show alongside clue text

**Display Rule**: Only if `rules.showCorrectResponseOnBoard === true` or explicitly triggered

---

### 10. ROUND_CHANGED

**Direction**: Host → Board  
**Purpose**: Transition to a new round  
**Trigger**: Host advances from Round 1 to Round 2 or Final Jeopardy

**Payload**:
```typescript
interface RoundChangedPayload {
  round: RoundType;  // 'round1' | 'round2' | 'final'
}
```

**Example**:
```json
{
  "type": "ROUND_CHANGED",
  "timestamp": 1234567890123.456,
  "payload": {
    "round": "round2"
  }
}
```

**Board Action**: 
- Show round transition animation
- Load new board with updated categories and values
- Reset used clue tracking

---

### 11. FINAL_PHASE_CHANGED

**Direction**: Host → Board  
**Purpose**: Advance through Final Jeopardy phases  
**Trigger**: Host progresses through FJ workflow

**Payload**:
```typescript
interface FinalPhaseChangedPayload {
  phase: FinalJeopardyPhase;
  data?: {
    category?: string;           // For category-reveal
    clue?: string;               // For clue-reveal
    wagers?: Map<string, number>; // For reveal (if rules allow)
    responses?: Map<string, string>; // For reveal
    adjudications?: Map<string, boolean>; // For reveal
  };
}
```

**Example**:
```json
{
  "type": "FINAL_PHASE_CHANGED",
  "timestamp": 1234567890123.456,
  "payload": {
    "phase": "category-reveal",
    "data": {
      "category": "WORLD CAPITALS"
    }
  }
}
```

**Board Action**: 
- category-reveal: Show category title only
- clue-reveal: Show clue text
- adjudication: Show results based on game rules

---

### 12. WINNER_ANNOUNCED

**Direction**: Host → Board  
**Purpose**: Display final winner  
**Trigger**: Final Jeopardy complete, winner determined

**Payload**:
```typescript
interface WinnerAnnouncedPayload {
  winnerId: string;
  winnerName: string;
  finalScore: number;
  allPlayers: Player[];  // Final scores for all contestants
}
```

**Example**:
```json
{
  "type": "WINNER_ANNOUNCED",
  "timestamp": 1234567890123.456,
  "payload": {
    "winnerId": "p1",
    "winnerName": "Alice",
    "finalScore": 18400,
    "allPlayers": [...]
  }
}
```

**Board Action**: 
- Show winner with celebration animation
- Display final scoreboard

---

## Error Handling

### Malformed Messages

If a message cannot be parsed or has invalid structure:

```typescript
interface ErrorPayload {
  error: string;
  originalMessage?: unknown;
}
```

**Board Behavior**: 
- Log error to console
- Request STATE_SYNC to recover
- Do not crash or show user-facing error

### Channel Unavailable

If BroadcastChannel is not supported:

1. Attempt window.opener.postMessage() as fallback
2. If no opener (board not launched from host), show error:
   "Board must be opened from host interface"

### Connection Lost

Board detects connection loss when:
- No messages received for >5 seconds during active game
- Explicit host disconnect event (not in MVP)

**Recovery**:
1. Send BOARD_READY message
2. Wait 2 seconds for STATE_SYNC
3. If no response, show "Connection lost - refresh board"

---

## Message Sequencing

### Game Start Sequence

1. Host: STATE_SYNC (initial state, phase='setup')
2. Host: STATE_SYNC (after contestants configured, phase='round1')
3. Board: Display round 1 board

### Clue Flow Sequence

1. Host: CLUE_SELECTED
2. Board: Display clue
3. Host: BUZZ_ENABLED (enabled=true)
4. Board: Show "buzz in" indicator
5. Host: BUZZ_LOCKED (playerId)
6. Board: Highlight player
7. Host: SCORES_UPDATED (after adjudication)
8. Board: Update scores
9. Host: CLUE_CLEARED
10. Board: Return to board

### Round Transition Sequence

1. Host: ROUND_CHANGED (round='round2')
2. Board: Show transition animation
3. Host: STATE_SYNC (new board state)
4. Board: Display round 2 board

---

## Performance Considerations

**Message Size**: 
- STATE_SYNC: ~5-10 KB (full game state)
- Other events: <1 KB each

**Frequency**:
- STATE_SYNC: 1-2 per game (initial + reconnect)
- SCORES_UPDATED: 30-60 per game (one per clue)
- Other events: 100-200 per game total

**Latency Target**: <100ms for all events (local same-machine)

**Throttling**: Not required for MVP (low frequency events)

---

## Testing Scenarios

### Test 1: Board Reconnection
1. Start game in host
2. Open board
3. Refresh board page
4. Verify board sends BOARD_READY
5. Verify host responds with STATE_SYNC
6. Verify board displays current state

### Test 2: Simultaneous Buzz
1. Host selects clue
2. Host enables buzzer
3. Two people press buzzer keys simultaneously
4. Verify only one BUZZ_LOCKED event sent
5. Verify correct player highlighted on board

### Test 3: Score Update Synchronization
1. Board displays scores: Alice=400, Bob=0
2. Host adjudicates correct response for Bob (+600)
3. Verify SCORES_UPDATED sent
4. Verify board updates Bob's score to 600 within 100ms

### Test 4: Channel Unavailable Fallback
1. Disable BroadcastChannel in browser (if possible)
2. Open board from host (window.open)
3. Verify postMessage fallback works
4. Verify all events still synchronized

---

## Version History

**v1.0.0** (2025-12-14): Initial protocol definition
- 12 message types defined
- Error handling specified
- Performance targets set

---

## Future Enhancements (Not in MVP)

- Heartbeat mechanism for connection monitoring
- Message acknowledgment and retry logic
- Compression for large STATE_SYNC payloads
- Delta updates instead of full state sync
- Multiple board instances with unique IDs
