# Visual quality rubric

Use this rubric for screenshot review. Generate baselines in the pinned Playwright
Chromium environment; do not compare baselines created by different browser or OS
renderers.

## Required viewports

- Audience board: 1920x1080.
- Host console: 1440x900.

## Board geometry

- The document has no horizontal or vertical scrollbar.
- Six category columns have equal width within 2 px.
- Five clue rows align across all columns.
- Board content fills the viewport without important content touching the edge.
- Category, clue, score, and value elements satisfy
  `scrollWidth <= clientWidth` and `scrollHeight <= clientHeight`.

## Visual language

- Use original broadcast-game-show styling: deep cobalt/navy surfaces, warm gold
  values, dark gutters, clear white clue text, and restrained highlights.
- Values dominate clue tiles; category labels remain readable from across a room.
- Clue text is centered, balanced, and comfortably readable at 1920x1080.
- Scores and buzz state are visually distinct without relying only on color.
- Animation supports transitions and never blocks host interaction unnecessarily.

## Required named screenshots

1. `round-1-board`
2. `standard-clue`
3. `buzz-winner`
4. `daily-double`
5. `double-jeopardy-board`
6. `final-category`
7. `final-clue`
8. `final-results`
9. `winner`
10. `host-console`

For each visual change, inspect expected, actual, and diff images. Update a baseline
only when the change is intentional and still satisfies this rubric.

## Review questions

- Is the current game state obvious in under two seconds?
- Is any text clipped, crowded, too small, or low contrast?
- Does the board read as one cohesive display rather than a collection of cards?
- Are used clues, control, lockouts, and buzz state unambiguous?
- Do host controls follow the operator's likely sequence of actions?
- Are focus, hover, active, disabled, loading, empty, and error states intentional?
