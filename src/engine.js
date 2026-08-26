// Pure game logic for Battleship. No DOM access here so it can be unit tested in Node.

export const BOARD_SIZE = 10;

export const FLEET = [
  { name: 'Carrier', size: 5 },
  { name: 'Battleship', size: 4 },
  { name: 'Cruiser', size: 3 },
  { name: 'Submarine', size: 3 },
  { name: 'Destroyer', size: 2 },
];

export const idx = (row, col) => row * BOARD_SIZE + col;
export const rowOf = (i) => Math.floor(i / BOARD_SIZE);
export const colOf = (i) => i % BOARD_SIZE;
export const inBounds = (row, col) =>
  row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;

export function shipCells(row, col, size, horizontal) {
  const cells = [];
  for (let n = 0; n < size; n++) {
    const r = horizontal ? row : row + n;
    const c = horizontal ? col + n : col;
    if (!inBounds(r, c)) return null;
    cells.push(idx(r, c));
  }
  return cells;
}

export class Board {
  constructor() {
    this.ships = [];
    this.occupied = new Map(); // cell index -> ship
    this.shots = new Map(); // cell index -> 'hit' | 'miss'
  }

  canPlace(row, col, size, horizontal) {
    const cells = shipCells(row, col, size, horizontal);
    if (!cells) return false;
    return cells.every((cell) => !this.occupied.has(cell));
  }

  place(name, row, col, size, horizontal) {
    if (!this.canPlace(row, col, size, horizontal)) return null;
    const cells = shipCells(row, col, size, horizontal);
    const ship = { name, size, cells, hits: new Set(), horizontal };
    this.ships.push(ship);
    for (const cell of cells) this.occupied.set(cell, ship);
    return ship;
  }

  removeShip(ship) {
    const at = this.ships.indexOf(ship);
    if (at === -1) return false;
    this.ships.splice(at, 1);
    for (const cell of ship.cells) this.occupied.delete(cell);
    return true;
  }

  clear() {
    this.ships = [];
    this.occupied.clear();
    this.shots.clear();
  }

  alreadyShot(cell) {
    return this.shots.has(cell);
  }

  /**
   * Resolve an incoming shot.
   * Returns { result: 'repeat' | 'miss' | 'hit' | 'sunk', ship, cell }.
   */
  receiveShot(cell) {
    if (this.shots.has(cell)) return { result: 'repeat', ship: null, cell };
    const ship = this.occupied.get(cell);
    if (!ship) {
      this.shots.set(cell, 'miss');
      return { result: 'miss', ship: null, cell };
    }
    this.shots.set(cell, 'hit');
    ship.hits.add(cell);
    const sunk = ship.hits.size === ship.size;
    return { result: sunk ? 'sunk' : 'hit', ship, cell };
  }

  isSunk(ship) {
    return ship.hits.size === ship.size;
  }

  allSunk() {
    return this.ships.length > 0 && this.ships.every((s) => this.isSunk(s));
  }

  remainingShips() {
    return this.ships.filter((s) => !this.isSunk(s));
  }
}

export function randomFleet(board, fleet = FLEET, rng = Math.random) {
  board.clear();
  for (const { name, size } of fleet) {
    let placed = null;
    let guard = 0;
    while (!placed) {
      if (++guard > 10000) throw new Error('Could not place fleet');
      const horizontal = rng() < 0.5;
      const row = Math.floor(rng() * BOARD_SIZE);
      const col = Math.floor(rng() * BOARD_SIZE);
      placed = board.place(name, row, col, size, horizontal);
    }
  }
  return board;
}
