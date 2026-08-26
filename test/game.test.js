import test from 'node:test';
import assert from 'node:assert/strict';
import {
  Board,
  FLEET,
  BOARD_SIZE,
  randomFleet,
  shipCells,
  idx,
} from '../src/engine.js';
import { AIPlayer } from '../src/ai.js';

// Deterministic pseudo-random generator so games are reproducible.
function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

test('ships cannot hang off the edge of the board', () => {
  const board = new Board();
  assert.equal(shipCells(0, 7, 5, true), null);
  assert.equal(board.place('Carrier', 0, 7, 5, true), null);
  assert.equal(board.place('Carrier', 7, 0, 5, false), null);
  assert.ok(board.place('Carrier', 0, 5, 5, true));
});

test('ships cannot overlap', () => {
  const board = new Board();
  board.place('Carrier', 4, 0, 5, true);
  assert.equal(board.place('Cruiser', 4, 4, 3, true), null);
  assert.equal(board.place('Cruiser', 2, 4, 3, false), null);
  assert.ok(board.place('Cruiser', 5, 4, 3, true));
});

test('repeated shots do not double-count damage', () => {
  const board = new Board();
  const ship = board.place('Destroyer', 0, 0, 2, true);
  assert.equal(board.receiveShot(idx(0, 0)).result, 'hit');
  assert.equal(board.receiveShot(idx(0, 0)).result, 'repeat');
  assert.equal(ship.hits.size, 1);
  assert.equal(board.allSunk(), false);
  assert.equal(board.receiveShot(idx(0, 1)).result, 'sunk');
  assert.equal(board.allSunk(), true);
});

test('an empty board is not a win', () => {
  assert.equal(new Board().allSunk(), false);
});

test('random fleet always places the full fleet without overlap', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const board = randomFleet(new Board(), FLEET, makeRng(seed));
    assert.equal(board.ships.length, FLEET.length);
    const cells = new Set();
    for (const ship of board.ships) {
      assert.equal(ship.cells.length, ship.size);
      for (const cell of ship.cells) {
        assert.equal(cells.has(cell), false, 'overlapping ship cell');
        cells.add(cell);
      }
    }
    assert.equal(cells.size, FLEET.reduce((n, s) => n + s.size, 0));
  }
});

test('removing a ship frees its cells', () => {
  const board = new Board();
  const ship = board.place('Cruiser', 3, 3, 3, true);
  assert.equal(board.canPlace(3, 3, 3, true), false);
  board.removeShip(ship);
  assert.equal(board.canPlace(3, 3, 3, true), true);
  assert.equal(board.ships.length, 0);
});

test('AI never repeats a shot and always finishes the board', () => {
  for (let seed = 1; seed <= 50; seed++) {
    const rng = makeRng(seed);
    const board = randomFleet(new Board(), FLEET, rng);
    const ai = new AIPlayer(rng);
    const seen = new Set();
    let turns = 0;
    while (!board.allSunk()) {
      const cell = ai.nextMove();
      assert.notEqual(cell, null, 'AI ran out of moves before winning');
      assert.equal(seen.has(cell), false, `AI repeated cell ${cell}`);
      seen.add(cell);
      const shot = board.receiveShot(cell);
      assert.notEqual(shot.result, 'repeat');
      ai.record(cell, shot.result, shot.ship);
      turns++;
      assert.ok(turns <= BOARD_SIZE * BOARD_SIZE, 'AI exceeded board size');
    }
  }
});

test('AI targeting is meaningfully better than random shooting', () => {
  let total = 0;
  const games = 60;
  for (let seed = 1; seed <= games; seed++) {
    const rng = makeRng(seed * 7919);
    const board = randomFleet(new Board(), FLEET, rng);
    const ai = new AIPlayer(rng);
    let turns = 0;
    while (!board.allSunk()) {
      const cell = ai.nextMove();
      const shot = board.receiveShot(cell);
      ai.record(cell, shot.result, shot.ship);
      turns++;
    }
    total += turns;
  }
  const average = total / games;
  assert.ok(average < 70, `expected < 70 shots on average, got ${average}`);
});

test('AI does not chase cells of an already sunk ship', () => {
  const board = new Board();
  board.place('Destroyer', 0, 0, 2, true); // A1-A2
  board.place('Carrier', 9, 5, 5, true);
  const ai = new AIPlayer(makeRng(3));
  for (const cell of [idx(0, 0), idx(0, 1)]) {
    const shot = board.receiveShot(cell);
    ai.record(cell, shot.result, shot.ship);
  }
  assert.equal(ai.openHits.length, 0);
});

test('AI never fires at a cell that touches no known hit while in target mode', () => {
  // Two separate horizontal ships in row 0 with a gap between them: A3-A4 and A7-A9.
  const board = new Board();
  board.place('Destroyer', 0, 2, 2, true);
  board.place('Cruiser', 0, 6, 3, true);
  const legal = new Set([
    idx(0, 1), idx(0, 3), idx(1, 2), // around the A3 hit
    idx(0, 5), idx(0, 7), idx(1, 6), // around the A7 hit
  ]);
  const seen = new Set();
  for (let seed = 1; seed <= 80; seed++) {
    const ai = new AIPlayer(makeRng(seed * 7919));
    for (const cell of [idx(0, 2), idx(0, 6)]) {
      ai.record(cell, board.occupied.has(cell) ? 'hit' : 'miss', null);
    }
    const move = ai.nextMove();
    assert.ok(legal.has(move), `AI targeted ${move}, which touches no known hit`);
    seen.add(move);
  }
  // The two hits belong to different ships, so the AI must treat them as two
  // independent leads instead of extrapolating one long line through the gap.
  assert.ok(seen.has(idx(0, 3)), 'AI never probes the real continuation A4');
  assert.ok(seen.has(idx(0, 5)), 'AI never probes the real continuation A6');
});
