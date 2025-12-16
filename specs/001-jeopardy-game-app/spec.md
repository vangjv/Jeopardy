# Feature Specification: Jeopardy-Style Quiz Game System

**Feature Branch**: `001-jeopardy-game-app`  
**Created**: December 14, 2025  
**Status**: Draft  
**Input**: User description: "Jeopardy-style game with synchronized host and board interfaces for running quiz games with multiple contestants, buzzer support, scoring, and Daily Double/Final Jeopardy rounds"

## Clarifications

### Session 2025-12-14

- Q: When a Daily Double is revealed for a contestant with a negative score, what is the maximum wager allowed? → A: Negative scores use highest board value only (e.g., $1000 or $2000)
- Q: When importing game content, what file format(s) should the system support? → A: JSON only
- Q: How many Daily Doubles should appear per round? → A: 1 in Round 1, 2 in Round 2 (standard Jeopardy rules)
- Q: When the host opens the board display in a popup window, should the system provide a helper button/link to launch it, or does the host manually navigate to the URL? → A: Provide launch button in host interface
- Q: When a clue is selected but not yet answered, can contestants see the correct response on the board display, or is it hidden until the host explicitly reveals it? → A: Hidden until host reveals

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Host Controls Basic Game Flow (Priority: P1)

A game host needs to run a quiz game session with 2-3 contestants, where contestants select clues from a board, buzz in to answer, and accumulate points based on correct/incorrect responses.

**Why this priority**: This is the core game mechanic - without it, there is no game. This delivers immediate value by enabling basic quiz gameplay.

**Independent Test**: Can be fully tested by setting up contestants, displaying a clue board, allowing a contestant to select a clue, buzzing in, and adjudicating the response with score changes. Delivers a complete quiz game experience.

**Acceptance Scenarios**:

1. **Given** the host has configured 2-3 contestant names and starting scores, **When** the host starts a game round, **Then** a board with 6 categories and 5 value tiers per category is displayed
2. **Given** a clue board is displayed, **When** a contestant selects a clue, **Then** the clue text is displayed to all participants
3. **Given** a clue is being displayed, **When** the host enables buzzer input and a contestant buzzes in first, **Then** the system identifies which contestant buzzed first and prevents other contestants from buzzing
4. **Given** a contestant has buzzed in, **When** the host marks the response as correct, **Then** the contestant's score increases by the clue value and the clue is marked as used
5. **Given** a contestant has buzzed in, **When** the host marks the response as incorrect, **Then** the contestant's score decreases by the clue value and other contestants can buzz in
6. **Given** a clue has been used, **When** the board is displayed again, **Then** the used clue is not selectable

---

### User Story 2 - Synchronized Display for Audience/Contestants (Priority: P1)

Contestants and audience members need to see the current game board, clues, contestant scores, and who buzzed in on a separate display that stays synchronized with the host's control interface.

**Why this priority**: Essential for the game experience - contestants and audience must see what's happening. Without this, only the host can see the game state.

**Independent Test**: Can be tested by opening the board display on a second screen or window, then performing game actions from the host interface and verifying the board display updates in real-time without manual refresh.

**Acceptance Scenarios**:

1. **Given** the host interface is running, **When** the host opens the board display interface, **Then** a synchronized view of the game board appears showing categories, available clues, and contestant scores
2. **Given** the board display is open, **When** the host selects a clue, **Then** the board display immediately shows the clue text without requiring manual refresh
3. **Given** the board display is open, **When** a contestant buzzes in, **Then** the board display immediately indicates which contestant buzzed
4. **Given** the board display is open, **When** scores change due to correct/incorrect responses, **Then** the board display immediately reflects the updated scores
5. **Given** the board display has been closed or refreshed, **When** it reconnects, **Then** it requests and receives the current game state and resumes synchronized operation
6. **Given** the host interface is running, **When** the host clicks the "Open Board Display" launch button, **Then** the board display opens in a new popup window at /board route and immediately synchronizes with the current game state

---

### User Story 3 - Keyboard-Based Buzzer System (Priority: P1)

Contestants need to buzz in using keyboard keys assigned to them, with the system accurately detecting the first buzz and optionally locking out contestants who answered incorrectly.

**Why this priority**: The buzzer mechanism is fundamental to the game format - contestants must compete to answer first. This is a defining characteristic of the game.

**Independent Test**: Can be tested by configuring different keyboard keys for each contestant, displaying a clue, enabling buzzers, and having multiple people press their assigned keys simultaneously to verify first-buzz detection works correctly.

**Acceptance Scenarios**:

1. **Given** the host is configuring contestants, **When** the host assigns a keyboard key to each contestant, **Then** the system validates there are no conflicting key assignments
2. **Given** a clue is displayed and buzzing is enabled, **When** multiple contestants press their buzzer keys within milliseconds of each other, **Then** the system accurately identifies and locks in the first contestant who buzzed
3. **Given** a contestant has buzzed in and answered incorrectly with lockout enabled, **When** the host reopens buzzing for the same clue, **Then** the incorrect contestant cannot buzz again until the host resets lockouts
4. **Given** buzzing is currently locked to one contestant, **When** the host resets the buzz lock, **Then** all non-locked-out contestants can buzz in again

---

### User Story 4 - Daily Double Special Round (Priority: P2)

The host needs to present special "Daily Double" clues where the contestant who selected the clue wagers an amount and answers alone without other contestants buzzing in.

**Why this priority**: Daily Doubles add strategic depth and excitement to the game, but the core game can function without them.

**Independent Test**: Can be tested by marking a clue as a Daily Double, having a contestant select it, entering a wager, presenting the clue, and adjudicating the response with the wagered amount affecting the score.

**Acceptance Scenarios**:

1. **Given** a clue is marked as a Daily Double, **When** a contestant selects that clue, **Then** the system displays a "Daily Double" indicator and disables buzzing for other contestants
2. **Given** a Daily Double has been revealed, **When** the host enters a wager for the selecting contestant, **Then** the system validates the wager is between the minimum ($5) and maximum (contestant's current score or highest board value, whichever is greater)
3. **Given** a Daily Double wager has been set, **When** the host displays the clue and adjudicates the response as correct, **Then** the contestant's score increases by the wagered amount
4. **Given** a Daily Double wager has been set, **When** the host displays the clue and adjudicates the response as incorrect, **Then** the contestant's score decreases by the wagered amount
5. **Given** a Daily Double has been completed, **When** the game returns to the board, **Then** the next contestant in control selects the next clue

---

### User Story 5 - Multiple Round Support (Priority: P2)

The host needs to run games with multiple rounds (Round 1, Round 2/Double Jeopardy) where the second round has doubled clue values and new categories.

**Why this priority**: Multiple rounds add variety and progression to the game experience, but a single-round game is still functional.

**Independent Test**: Can be tested by completing all clues in Round 1, transitioning to Round 2, and verifying the board updates with new categories and doubled values.

**Acceptance Scenarios**:

1. **Given** all clues in Round 1 have been used, **When** the host transitions to Round 2, **Then** the board displays 6 new categories with 5 clues each at doubled values (400-2000 instead of 200-1000)
2. **Given** Round 2 is active, **When** clues are played, **Then** scoring and buzzer mechanics work the same as Round 1 but with doubled values
3. **Given** the host has configured custom value sets, **When** a new round begins, **Then** the board displays the configured values instead of defaults

---

### User Story 6 - Final Jeopardy Round (Priority: P2)

The host needs to conduct a Final Jeopardy round where all contestants simultaneously wager and submit answers to a single clue, with the highest score after final adjudication determining the winner.

**Why this priority**: Final Jeopardy provides a dramatic conclusion to the game, but the main game rounds are more important to implement first.

**Independent Test**: Can be tested by starting Final Jeopardy, entering wagers for each contestant, displaying the final clue, collecting responses, adjudicating each response, and calculating final scores to determine the winner.

**Acceptance Scenarios**:

1. **Given** Round 2 has been completed, **When** the host starts Final Jeopardy, **Then** the system displays a single category
2. **Given** Final Jeopardy has started, **When** the host enters a wager for each contestant, **Then** the system validates each wager is between $0 and the contestant's current score
3. **Given** all wagers are entered, **When** the host displays the final clue, **Then** all contestants see the clue text simultaneously
4. **Given** the final clue is displayed, **When** the host collects and enters each contestant's response, **Then** responses are recorded but not yet revealed to the board
5. **Given** all responses are collected, **When** the host adjudicates each response as correct/incorrect, **Then** wagers are added/subtracted accordingly and final scores determine the winner
6. **Given** Final Jeopardy is complete, **When** the host reveals results, **Then** the board optionally shows contestant responses, wagers, and final scores with the winner highlighted

---

### User Story 7 - Configurable Game Rules (Priority: P3)

The host needs to customize game rules such as whether wrong answers subtract points, whether contestants get locked out after wrong answers, timer durations, and whether certain information is visible on the audience board.

**Why this priority**: Configurability enhances the system's flexibility for different contexts, but default rules work fine for most games.

**Independent Test**: Can be tested by toggling various rule settings before starting a game, then playing through scenarios to verify the configured rules are applied correctly.

**Acceptance Scenarios**:

1. **Given** the host is configuring game rules, **When** the host disables "wrong answer subtracts value", **Then** incorrect responses do not decrease contestant scores
2. **Given** the host is configuring game rules, **When** the host disables "lockout wrong responder", **Then** contestants who answer incorrectly can buzz in again for the same clue
3. **Given** the host is configuring game rules, **When** the host enables "show wagers on board", **Then** Daily Double and Final Jeopardy wagers are visible on the audience board
4. **Given** the host is configuring game rules, **When** the host sets buzzer timing windows, **Then** the system enforces the configured time limits for buzzing and responding

---

### User Story 8 - Import Custom Game Content (Priority: P3)

Game organizers need to create and import custom game content (categories, clues, correct responses, values, Daily Double placements) from structured data files to run games with their own trivia content.

**Why this priority**: Custom content makes the system reusable for different events and topics, but test/default content can demonstrate all functionality.

**Independent Test**: Can be tested by creating a game content file with 6 categories and 5 clues each for two rounds plus Final Jeopardy, importing it, and running a complete game using that content.

**Acceptance Scenarios**:

1. **Given** the host has a game content file, **When** the host imports the file, **Then** the system validates the file contains exactly 6 categories with 5 clues each for Round 1, 6 categories with 5 clues each for Round 2, and 1 category with 1 clue for Final Jeopardy
2. **Given** the host has imported game content, **When** validation errors are detected (missing clues, incorrect value assignments, duplicate Daily Doubles in a round), **Then** the system displays specific error messages but does not crash
3. **Given** game content includes media references (images, audio, video), **When** a clue with media is displayed, **Then** the media is shown alongside the clue text
4. **Given** the host imports a game file, **When** the file specifies Daily Double locations, **Then** those clues are marked as Daily Doubles in the game

---

### Edge Cases

- What happens when a contestant's score goes negative due to incorrect responses?
  - System allows negative scores; contestant can still buzz in and recover
- What happens when the board display loses connection mid-game?
  - Board requests full state sync upon reconnection and resumes from current game state
- What happens when the host accidentally closes the host interface?
  - System warns before closing if a game is in progress; includes navigation guard
- What happens when a contestant presses their buzzer key before buzzing is enabled?
  - System ignores the input; only registers buzzes when explicitly enabled
- What happens when a contestant buzzes in but the host does not adjudicate the response?
  - Host can clear the buzz and reopen for other contestants; no automatic timeout enforcement (unless configured)
- What happens when the host needs to manually correct a score?
  - Host interface includes manual score adjustment controls
- What happens when a clue is accidentally marked as used?
  - Host can override and mark clue as unused via admin controls
- What happens when all contestants have negative scores in Final Jeopardy?
  - Game proceeds normally; wagers are validated against each contestant's score (minimum $0 if negative)
- What happens when multiple people press the same buzzer key simultaneously?
  - System registers a single buzz for that contestant
- What happens when game content validation fails on import?
  - System displays detailed validation warnings but allows the host to proceed at their own risk or fix the file

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow the host to configure 2-3 contestants with unique names and starting scores (default $0)
- **FR-002**: System MUST allow the host to assign a unique keyboard key to each contestant for buzzer input
- **FR-003**: System MUST detect and warn the host about conflicting buzzer key assignments
- **FR-004**: System MUST display a game board with 6 categories and 5 clue value tiers per category
- **FR-005**: System MUST support two main rounds (Round 1 with values 200-1000, Round 2 with values 400-2000) plus Final Jeopardy, with configurable value sets
- **FR-006**: System MUST allow the host to select clues and display the clue text to all participants
- **FR-007**: System MUST enable/disable buzzer input on host command (controls when contestants can initiate buzzes)
- **FR-008**: System MUST accurately detect and lock in the first contestant to press their buzzer key when buzzing is enabled
- **FR-009**: System MUST allow the host to adjudicate responses as correct, incorrect, or no response
- **FR-010**: System MUST increase a contestant's score by the clue value when marked correct
- **FR-011**: System MUST decrease a contestant's score by the clue value when marked incorrect (configurable)
- **FR-012**: System MUST mark clues as used after adjudication and prevent re-selection
- **FR-013**: System MUST support Daily Double clues where only the selecting contestant can answer
- **FR-014**: System MUST validate Daily Double wagers (minimum $5, maximum contestant's score or highest board value, whichever is greater; for negative scores, maximum is highest board value only)
- **FR-015**: System MUST support Final Jeopardy with category reveal, wager collection, clue display, and final adjudication
- **FR-016**: System MUST validate Final Jeopardy wagers (minimum $0, maximum contestant's current score)
- **FR-017**: System MUST maintain real-time synchronization between host interface and board display interface
- **FR-018**: System MUST support the board display requesting full state synchronization if connection is lost or page is refreshed
- **FR-019**: System MUST display current contestant scores on both host and board interfaces
- **FR-020**: System MUST indicate which contestant currently has board control (right to select next clue)
- **FR-021**: System MUST allow the host to manually override board control
- **FR-022**: System MUST allow the host to reset buzz locks and clear contestant lockouts (resets state after a contestant has buzzed; distinct from FR-007 which controls whether buzzing is initially enabled)
- **FR-023**: System MUST optionally lock out contestants who answered incorrectly for the current clue only; lockouts automatically clear when returning to board or can be manually cleared via FR-022 (configurable)
- **FR-024**: System MUST import game content from JSON files
- **FR-025**: System MUST validate imported game content (6 categories × 5 clues per round, correct value assignments, exactly 1 Daily Double in Round 1 and 2 Daily Doubles in Round 2) and return structured validation results with error severity (CRITICAL/WARNING), field path (e.g., 'round1.categories[2].clues[4]'), and descriptive message
- **FR-026**: System MUST display validation warnings without crashing when invalid game content is imported
- **FR-027**: System MUST support media (images, audio, video) in clues with the following constraints: max file size 10MB, supported formats (images: png/jpg/gif/webp, audio: mp3/wav/ogg, video: mp4/webm), graceful fallback display with error message on load failure
- **FR-028**: System MUST display the correct response on the host interface at all times (see also FR-029 for board visibility)
- **FR-029**: System MUST hide the correct response on the board display by default until the host explicitly reveals it (optionally configurable to auto-reveal; see also FR-028, FR-037)
- **FR-030**: System MUST allow the host to manually adjust contestant scores
- **FR-031**: System MUST allow the host to mark/unmark clues as used (admin override)
- **FR-032**: System MUST support configurable rule toggles (wrong answer penalty, lockout behavior, visibility settings, timer durations)
- **FR-033**: System MUST warn the host before navigating away or closing during an active game
- **FR-034**: System MUST allow negative contestant scores
- **FR-035**: System MUST determine and display the winner based on final scores after Final Jeopardy
- **FR-036**: System MUST display which contestant buzzed first when multiple contestants buzz
- **FR-037**: System MUST provide a launch button in the host interface to open the board display in a popup window

### Key Entities

- **Contestant**: Represents a game participant with a name, current score, assigned buzzer key, and lockout status
- **Game Session**: Represents a complete game instance with configured contestants, active round, current control contestant, rule settings, and game state
- **Category**: Represents a topic area containing 5 related clues
- **Clue**: Represents a question/answer pair with clue text, correct response, dollar value, used status, optional Daily Double flag, and optional media
- **Game Round**: Represents one phase of the game (Round 1, Round 2/Double Jeopardy, Final Jeopardy) with associated categories and value structures
- **Buzz Event**: Represents a buzzer activation by a contestant with timestamp for first-buzz detection
- **Wager**: Represents a contestant's monetary stake for Daily Double or Final Jeopardy
- **Game Board**: Represents the visual layout of categories and clues for the current round
- **Synchronization State**: Represents the current game state that must be kept consistent between host and board interfaces

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A host can configure contestants and start a game within 2 minutes
- **SC-002**: The system accurately detects the first buzz within 10 milliseconds when multiple contestants buzz simultaneously (measured as timestamp delta between buzzer events, not end-to-end UI processing latency)
- **SC-003**: The board display synchronizes with host actions in under 100 milliseconds for local same-machine setups
- **SC-004**: A complete game (2 rounds + Final Jeopardy, 60 total clues) can be run without errors or crashes
- **SC-005**: The board display successfully reconnects and resynchronizes state within 2 seconds after a refresh or connection loss
- **SC-006**: Imported game content validation identifies 100% of structural errors (missing clues, incorrect value counts) without crashing
- **SC-007**: The game system supports offline operation after initial page load
- **SC-008**: The board display interface is optimized for 1080p and 4K displays with readable text from 10+ feet away (minimum font sizes: clue text 3rem/48px, category headers 2rem/32px, scores 1.5rem/24px; WCAG AAA contrast ratio 7:1)
- **SC-009**: Host can adjudicate a response and update scores within 3 button clicks/actions
- **SC-010**: System prevents accidental game interruption by warning before navigation/close 100% of the time when a game is active

## Assumptions

- The game will run on a single computer with the host and board interfaces in the same browser (potentially different windows/tabs)
- Contestants will have physical access to a keyboard to use their assigned buzzer keys
- The host will manually read clues aloud or contestants will read from the board display
- Game content will be prepared in advance using a defined file format
- The board display will be shown on a separate screen/monitor/projector visible to contestants and audience
- Internet connectivity is not required after initial load (offline-capable)
- The host is trusted to correctly adjudicate responses (no automatic answer checking)
- Media files referenced in game content are either embedded or available locally
- The system will use industry-standard web browser capabilities for rendering and input handling
- Timing/buzzers are enforced through keyboard input detection, not specialized hardware
- The host interface requires more detailed controls while the board interface prioritizes visual clarity
- Default game rules match standard Jeopardy gameplay but should be configurable for variations

## Out of Scope

- Network-based multiplayer across different computers (would require server infrastructure)
- Automatic speech-to-text response validation
- Specialized buzzer hardware integration (beyond keyboard input)
- Licensed Jeopardy branding, sounds, or visual assets
- Complex animations and transition effects beyond basic UI updates
- Mobile device support for contestants or board display
- Persistent game state across browser sessions (session-based only)
- User authentication or multi-user access controls
- Cloud-based game content library or sharing
- Live audience participation features (polling, voting)
- Detailed analytics or game replay functionality
- Accessibility features beyond standard web accessibility (for MVP)
