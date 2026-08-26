# Battleship

A browser Battleship game: you against a computer opponent that hunts your fleet
with a parity search and follows up on hits. No build step, no framework, no
runtime dependencies — plain HTML, CSS and ES modules.

**Play:** see the GitHub Pages link on this repository.

## Rules implemented

- 10x10 grid, classic fleet: Carrier (5), Battleship (4), Cruiser (3), Submarine (3), Destroyer (2).
- Ships are placed horizontally or vertically, may touch, may not overlap or hang off the board.
- Players alternate single shots. Hits do **not** grant an extra turn (a common house rule; not used here).
- The first side to sink all five enemy ships wins.

## Playing

1. Pick a ship, hover your own grid to preview it, click to drop it.
   Press <kbd>R</kbd> (or the rotate button) to switch direction, click a placed
   ship to pick it up again, or press **Random fleet**.
2. Press **Start battle** once all five ships are deployed.
3. Click a cell on the enemy grid to fire. The log and the enemy fleet tracker
   show what has been hit and sunk.

## How the AI works

`src/ai.js` implements the standard two-mode strategy:

- **Hunt**: fires only at cells where `(row + col)` is even. The smallest ship is
  two cells long, so this checkerboard cannot hide a ship and it halves the
  search space.
- **Target**: after a hit, it probes the four neighbouring cells. Once two
  *adjacent* hits are known it extends that line from both ends until the ship
  sinks. Hits are grouped into contiguous runs, so hits belonging to two
  different ships are never mistaken for one long ship.
- When a ship sinks, its cells are dropped from the list of open leads so the AI
  stops chasing a wreck.

Measured over 500 simulated games: ~52 shots to clear the board, versus ~95 for
firing at random.

## Project layout

```
index.html        markup and layout
src/styles.css    styling
src/engine.js     board, fleet placement and shot resolution (no DOM)
src/ai.js         opponent AI
src/ui.js         rendering, input handling, turn sequencing
test/game.test.js engine + AI unit tests
test/ui.test.js   DOM tests driven through jsdom by clicking the real index.html
BUGS.md           bugs found while debugging and how they were fixed
```

## Running locally

```bash
python3 -m http.server 8000   # or: npm run serve
# open http://localhost:8000
```

## Tests

```bash
npm install   # jsdom, only needed for the DOM tests
npm test      # 26 tests
```
