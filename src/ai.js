// Opponent AI: parity-based "hunt" search plus a "target" mode that follows up on hits.
import { BOARD_SIZE, idx, rowOf, colOf, inBounds } from './engine.js';

export class AIPlayer {
  constructor(rng = Math.random) {
    this.rng = rng;
    this.shots = new Set(); // cells this AI has already fired at
    this.openHits = []; // hits belonging to ships that are not sunk yet
  }

  pick(list) {
    return list[Math.floor(this.rng() * list.length)];
  }

  neighbors(cell) {
    const r = rowOf(cell);
    const c = colOf(cell);
    return [
      [r - 1, c],
      [r + 1, c],
      [r, c - 1],
      [r, c + 1],
    ]
      .filter(([rr, cc]) => inBounds(rr, cc))
      .map(([rr, cc]) => idx(rr, cc))
      .filter((n) => !this.shots.has(n));
  }

  /**
   * Cells that extend a run of two or more *adjacent* hits. Hits are grouped
   * into contiguous runs first, so unrelated hits from different ships are
   * never treated as one long line.
   */
  lineTargets() {
    if (this.openHits.length < 2) return [];
    const open = new Set(this.openHits);
    const targets = [];

    const scan = (fixedIsRow) => {
      const groups = new Map(); // fixed coordinate -> sorted varying coordinates
      for (const hit of this.openHits) {
        const fixed = fixedIsRow ? rowOf(hit) : colOf(hit);
        const varying = fixedIsRow ? colOf(hit) : rowOf(hit);
        if (!groups.has(fixed)) groups.set(fixed, []);
        groups.get(fixed).push(varying);
      }
      for (const [fixed, values] of groups) {
        values.sort((a, b) => a - b);
        let start = 0;
        for (let i = 1; i <= values.length; i++) {
          if (i === values.length || values[i] !== values[i - 1] + 1) {
            const runLength = i - start;
            if (runLength >= 2) {
              for (const v of [values[start] - 1, values[i - 1] + 1]) {
                const r = fixedIsRow ? fixed : v;
                const c = fixedIsRow ? v : fixed;
                if (inBounds(r, c) && !this.shots.has(idx(r, c))) targets.push(idx(r, c));
              }
            }
            start = i;
          }
        }
      }
    };

    scan(true); // horizontal runs
    scan(false); // vertical runs
    return targets.filter((cell) => !open.has(cell));
  }

  huntTargets() {
    const parity = [];
    const any = [];
    for (let cell = 0; cell < BOARD_SIZE * BOARD_SIZE; cell++) {
      if (this.shots.has(cell)) continue;
      any.push(cell);
      if ((rowOf(cell) + colOf(cell)) % 2 === 0) parity.push(cell);
    }
    return parity.length ? parity : any;
  }

  /** Returns the next cell to fire at, or null when the board is exhausted. */
  nextMove() {
    const line = this.lineTargets();
    if (line.length) return this.pick(line);

    if (this.openHits.length) {
      const around = this.openHits.flatMap((hit) => this.neighbors(hit));
      if (around.length) return this.pick(around);
    }

    const hunt = this.huntTargets();
    return hunt.length ? this.pick(hunt) : null;
  }

  /** Feed the outcome of a shot back into the AI's memory. */
  record(cell, result, ship) {
    this.shots.add(cell);
    if (result === 'hit') {
      this.openHits.push(cell);
    } else if (result === 'sunk' && ship) {
      const sunkCells = new Set(ship.cells);
      this.openHits = this.openHits.filter((c) => !sunkCells.has(c));
    }
  }
}
