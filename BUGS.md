# Debugging log — bugs found and how they were fixed

The game was debugged in two passes: automated tests (26 of them — engine and AI
unit tests plus DOM tests that click the real `index.html` inside jsdom), and a
manual browser pass driving the live page in Chrome (placement, a full win, a
full loss, reset, mobile width, console audit).

Eight defects were found. All are fixed, and every logic bug has a regression
test that fails against the old code.

---

## 1. AI drew a straight line through hits from two different ships

**Symptom.** With two ships in the same row — say A3–A4 and A7–A9 — one hit on
each made the AI treat both as a single long ship. It only ever fired at the two
outer ends of that imaginary line (A2 and A10) and never probed A5 or A6, the
cells that actually continue the ships it had hit. Leads were left dangling and
the AI wasted turns.

**Cause.** `AIPlayer.lineTargets()` collected every open hit in a row, sorted the
columns, and extended from `min - 1` to `max + 1`. Nothing checked that the hits
were adjacent.

**Fix.** Open hits are now grouped into *contiguous runs* per row and per column;
only a run of two or more touching hits produces line targets. Unconnected hits
fall back to neighbour probing, so each lead is followed independently.
(`src/ai.js`, `lineTargets`)

**Test.** `AI never fires at a cell that touches no known hit while in target
mode` — asserts every candidate touches a real hit, and that the true
continuations are actually probed.

## 2. The same ship could be placed several times

**Symptom.** After the full fleet was deployed, clicking any remaining open water
kept dropping more ships onto the board. A test that clicked every free cell
ended up with **15 ships** on a 10x10 grid, and "Start battle" stayed disabled
because the fleet count no longer matched.

**Cause.** `handlePlacement()` always placed `FLEET[state.selected]`. When the
last ship was placed, `state.selected` kept pointing at it, and `Board.place()`
happily created a second ship with the same name.

**Fix.** Placement now goes through `activeShipIndex()`, which returns the
selected ship only if it is still unplaced, otherwise the next unplaced ship, or
`-1` when the fleet is complete — in which case the click is ignored with a
status message. (`src/ui.js`)

**Test.** `a ship can never be placed twice`.

## 3. Ships could be rotated in the middle of a battle

**Symptom.** The rotate button and the <kbd>R</kbd> key stayed live after the
battle started, flipping the orientation label and the internal placement state
while the player was firing.

**Fix.** `rotate()` returns immediately unless the game is in the setup phase.
(`src/ui.js`)

**Test.** `rotation only applies during setup`.

## 4. A duplicate AI shot crashed the turn handler

**Symptom.** `TypeError: Cannot read properties of null (reading 'name')` inside
`aiTurn()`, hit by a test that shot at the player's own board.

**Cause.** `Board.receiveShot()` returns `{ result: 'repeat', ship: null }` for a
cell that was already fired at, but `aiTurn()` only branched on `miss`/`hit` and
fell through to the "sunk" log line, which dereferences `shot.ship.name`.

**Fix.** `aiTurn()` now handles `repeat` explicitly: it discards the duplicate,
asks the AI for another cell, and only logs a real outcome. A normal game cannot
produce a repeat (the AI tracks its own shots), but the turn handler no longer
depends on that invariant. (`src/ui.js`)

**Test.** `losing every ship ends the game in defeat` now plays real AI turns
until the fleet is gone instead of poking the board directly.

## 5. No feedback when a ship hung off the edge of the board

**Symptom.** Hovering near the right or bottom edge with a long ship showed *no*
preview at all, so it looked like the board had stopped responding. Clicking then
produced only a text message.

**Cause.** `shipCells()` returns `null` for an out-of-bounds ship, and the render
code skipped the preview entirely in that case.

**Fix.** The on-board portion of an overhanging ship is drawn in red
(`.invalid`), so the player sees exactly how far the ship sticks out.
(`src/ui.js`, `renderPlayerBoard`)

**Test.** `hover preview flags placements that run off the board`.

## 6. Preview kept following the cursor after the fleet was complete

**Symptom.** With all five ships deployed, hovering the board still previewed the
last ship — a placement that a click would (correctly) refuse.

**Fix.** The preview uses the same `activeShipIndex()` as placement, so it
disappears when nothing is left to place. (`src/ui.js`)

**Test.** `no preview is shown once every ship is placed`.

## 7. The cell under the cursor was the wrong colour (found in the browser)

**Symptom.** Hovering B2 with the Carrier selected highlighted B2–B6, but B2
itself stayed blue while B3–B6 were teal, so the preview looked shifted one cell
to the right.

**Cause.** Grid cells are `<button>` elements, and the generic
`button:hover:not(:disabled)` rule has the same specificity as `.cell.preview`
but comes later in the stylesheet, so it won on the hovered cell.

**Fix.** The generic button hover rule now excludes grid cells
(`button:not(.cell):hover`), and the enemy board got its own explicit hover
colour. (`src/styles.css`)

## 8. Board rows grew as soon as they contained a hit (found in the browser)

**Symptom.** Mid-game `getComputedStyle(board).gridTemplateRows` read
`37px 53px 37px 53px 53px 37px …` — every row holding a hit marker was ~16px
taller. Cells stopped being square and the rows below shifted downwards between
turns, which moved click targets under the cursor and caused mis-clicks.

**Cause.** The grid only declared `grid-template-columns`, so row heights were
content-sized and grew to fit the `✕` glyph of a hit marker.

**Fix.** The board declares `grid-template-rows: repeat(10, 1fr)` and cells use
`min-height: 0; line-height: 1; overflow: hidden`, so the grid stays a fixed
10x10 of square cells no matter what is drawn inside. (`src/styles.css`)

---

## Things that were checked and were already correct

- Ships may touch but never overlap or hang off the board (manual and random placement).
- 200 seeded random fleets always place all five ships with no overlap.
- Firing twice at the same cell never double-counts damage and never costs a turn.
- The player cannot fire while the AI is thinking, or before the battle starts.
- An AI shot still pending on a timer when "New game" is pressed is discarded
  instead of landing on the fresh board.
- Win and loss both end the game, reveal the result and reset cleanly.
- 500 simulated games: the AI always terminates, never repeats a shot, and needs
  ~52 shots on average versus ~95 for random firing.
- No JavaScript errors or warnings in the browser console across a full session,
  and no horizontal overflow at a 400px-wide viewport.

## Testing gotcha (harness, not the game)

Root-level `test.beforeEach()` in the Node test runner did not run for the
top-level tests in the DOM test file, so state leaked between tests and produced
two misleading failures. Each DOM test now calls `api.resetGame()` explicitly.
