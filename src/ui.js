// DOM layer: rendering, input handling and turn sequencing.
import {
  BOARD_SIZE,
  FLEET,
  Board,
  randomFleet,
  shipCells,
  rowOf,
  colOf,
  idx,
} from './engine.js';
import { AIPlayer } from './ai.js';

const AI_DELAY = 650;

const el = {
  playerBoard: document.getElementById('player-board'),
  enemyBoard: document.getElementById('enemy-board'),
  fleetList: document.getElementById('fleet-list'),
  enemyFleet: document.getElementById('enemy-fleet'),
  rotateBtn: document.getElementById('rotate-btn'),
  randomBtn: document.getElementById('random-btn'),
  clearBtn: document.getElementById('clear-btn'),
  startBtn: document.getElementById('start-btn'),
  restartBtn: document.getElementById('restart-btn'),
  orientation: document.getElementById('orientation-label'),
  status: document.getElementById('status'),
  log: document.getElementById('log'),
  setup: document.getElementById('setup'),
  overlay: document.getElementById('overlay'),
  overlayTitle: document.getElementById('overlay-title'),
  overlayText: document.getElementById('overlay-text'),
  overlayBtn: document.getElementById('overlay-btn'),
};

const state = {
  phase: 'setup', // 'setup' | 'player' | 'ai' | 'over'
  player: new Board(),
  enemy: new Board(),
  ai: new AIPlayer(),
  horizontal: true,
  selected: 0, // index into FLEET of the ship being placed
  hover: null,
  busy: false,
  lastPlayerShot: null,
  lastAiShot: null,
};

const playerCells = [];
const enemyCells = [];

function buildBoard(container, cells, onClick, onHover, onLeave) {
  container.innerHTML = '';
  cells.length = 0;
  for (let cell = 0; cell < BOARD_SIZE * BOARD_SIZE; cell++) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'cell';
    button.dataset.cell = String(cell);
    button.setAttribute(
      'aria-label',
      `${String.fromCharCode(65 + rowOf(cell))}${colOf(cell) + 1}`
    );
    if (onClick) button.addEventListener('click', () => onClick(cell));
    if (onHover) button.addEventListener('mouseenter', () => onHover(cell));
    container.appendChild(button);
    cells.push(button);
  }
  if (onLeave) container.addEventListener('mouseleave', onLeave);
}

function log(message) {
  const item = document.createElement('li');
  item.textContent = message;
  el.log.prepend(item);
}

function setStatus(message) {
  el.status.textContent = message;
}

function coord(cell) {
  return `${String.fromCharCode(65 + rowOf(cell))}${colOf(cell) + 1}`;
}

function nextUnplacedShip() {
  return FLEET.findIndex((ship) => !state.player.ships.some((s) => s.name === ship.name));
}

function renderFleetList() {
  el.fleetList.innerHTML = '';
  FLEET.forEach((ship, i) => {
    const placed = state.player.ships.some((s) => s.name === ship.name);
    const li = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = [i === state.selected ? 'selected' : '', placed ? 'placed' : '']
      .filter(Boolean)
      .join(' ');
    const pips = document.createElement('span');
    pips.className = 'pips';
    for (let n = 0; n < ship.size; n++) {
      const pip = document.createElement('span');
      pip.className = 'pip';
      pips.appendChild(pip);
    }
    button.append(`${ship.name} `, pips);
    button.addEventListener('click', () => {
      state.selected = i;
      if (placed) {
        const existing = state.player.ships.find((s) => s.name === ship.name);
        state.player.removeShip(existing);
      }
      renderAll();
    });
    li.appendChild(button);
    el.fleetList.appendChild(li);
  });
  el.startBtn.disabled = state.player.ships.length !== FLEET.length;
}

function renderEnemyTracker() {
  el.enemyFleet.innerHTML = '';
  for (const ship of state.enemy.ships) {
    const li = document.createElement('li');
    li.textContent = `${ship.name} (${ship.size})`;
    if (state.enemy.isSunk(ship)) li.classList.add('down');
    el.enemyFleet.appendChild(li);
  }
}

/** Index of the ship the next click would place, or -1 when the fleet is full. */
function activeShipIndex() {
  const selected = FLEET[state.selected];
  if (selected && !isPlaced(selected.name)) return state.selected;
  return nextUnplacedShip();
}

function renderPlayerBoard() {
  const preview = new Set();
  let previewValid = true;
  const active = state.phase === 'setup' ? activeShipIndex() : -1;
  if (state.hover !== null && active >= 0) {
    const ship = FLEET[active];
    const row = rowOf(state.hover);
    const col = colOf(state.hover);
    previewValid = state.player.canPlace(row, col, ship.size, state.horizontal);
    const cells = shipCells(row, col, ship.size, state.horizontal);
    if (cells) {
      for (const cell of cells) preview.add(cell);
    } else {
      // Ship runs off the board: highlight the part that is still on it so the
      // player sees why the placement is refused.
      for (let n = 0; n < ship.size; n++) {
        const r = state.horizontal ? row : row + n;
        const c = state.horizontal ? col + n : col;
        if (r < BOARD_SIZE && c < BOARD_SIZE) preview.add(idx(r, c));
      }
    }
  }

  playerCells.forEach((node, cell) => {
    const ship = state.player.occupied.get(cell);
    const shot = state.player.shots.get(cell);
    node.className = 'cell';
    if (ship) node.classList.add('ship');
    if (shot === 'miss') node.classList.add('miss');
    if (shot === 'hit') {
      node.classList.add('hit');
      if (state.player.isSunk(ship)) node.classList.add('sunk');
    }
    if (preview.has(cell)) node.classList.add(previewValid ? 'preview' : 'invalid');
    if (cell === state.lastAiShot) node.classList.add('last-shot');
  });
}

function renderEnemyBoard() {
  const playable = state.phase === 'player' && !state.busy;
  el.enemyBoard.classList.toggle('locked', !playable);
  enemyCells.forEach((node, cell) => {
    const shot = state.enemy.shots.get(cell);
    node.className = 'cell';
    if (shot) node.classList.add('shot');
    if (shot === 'miss') node.classList.add('miss');
    if (shot === 'hit') {
      node.classList.add('hit');
      const ship = state.enemy.occupied.get(cell);
      if (ship && state.enemy.isSunk(ship)) node.classList.add('sunk');
    }
    if (state.phase === 'over' && !shot && state.enemy.occupied.has(cell)) {
      node.classList.add('ship');
    }
    if (cell === state.lastPlayerShot) node.classList.add('last-shot');
    node.disabled = !playable || Boolean(shot);
  });
}

function renderAll() {
  renderFleetList();
  renderPlayerBoard();
  renderEnemyBoard();
  renderEnemyTracker();
}

function isPlaced(name) {
  return state.player.ships.some((s) => s.name === name);
}

function handlePlacement(cell) {
  if (state.phase !== 'setup') return;
  const placedShip = state.player.occupied.get(cell);
  if (placedShip) {
    // Clicking an existing ship picks it back up for repositioning.
    state.player.removeShip(placedShip);
    state.selected = FLEET.findIndex((s) => s.name === placedShip.name);
    renderAll();
    return;
  }
  // The selected ship may already be on the board (e.g. after placing the last
  // one); fall back to the next ship that still needs a home.
  const active = activeShipIndex();
  if (active === -1) {
    setStatus('Your whole fleet is deployed — start the battle.');
    return;
  }
  state.selected = active;
  const ship = FLEET[active];
  const created = state.player.place(
    ship.name,
    rowOf(cell),
    colOf(cell),
    ship.size,
    state.horizontal
  );
  if (!created) {
    setStatus("That ship doesn't fit there.");
    return;
  }
  const next = nextUnplacedShip();
  state.selected = next === -1 ? state.selected : next;
  setStatus(
    next === -1 ? 'Fleet ready — start the battle!' : `Place your ${FLEET[next].name}.`
  );
  renderAll();
}

function startGame() {
  if (state.player.ships.length !== FLEET.length) return;
  randomFleet(state.enemy);
  state.ai = new AIPlayer();
  state.phase = 'player';
  state.hover = null;
  el.setup.classList.add('hidden');
  setStatus('Your turn — fire at the enemy waters.');
  log('Battle stations! You fire first.');
  renderAll();
}

function finish(playerWon) {
  state.phase = 'over';
  state.busy = false;
  el.overlayTitle.textContent = playerWon ? 'Victory!' : 'Defeat';
  el.overlayText.textContent = playerWon
    ? 'You sank the entire enemy fleet. Well fought, Admiral.'
    : 'Your fleet is at the bottom of the sea. Better luck next time.';
  el.overlay.classList.remove('hidden');
  setStatus(playerWon ? 'You win!' : 'The AI wins.');
  renderAll();
}

function playerFire(cell) {
  if (state.phase !== 'player' || state.busy) return;
  if (state.enemy.alreadyShot(cell)) return;

  const shot = state.enemy.receiveShot(cell);
  state.lastPlayerShot = cell;
  if (shot.result === 'miss') log(`You fired at ${coord(cell)} — miss.`);
  else if (shot.result === 'hit') log(`You fired at ${coord(cell)} — hit!`);
  else log(`You fired at ${coord(cell)} — sank the enemy ${shot.ship.name}!`);

  if (state.enemy.allSunk()) {
    renderAll();
    finish(true);
    return;
  }

  state.phase = 'ai';
  state.busy = true;
  setStatus('Enemy is taking aim…');
  renderAll();
  setTimeout(aiTurn, AI_DELAY);
}

function aiTurn() {
  if (state.phase !== 'ai') return;
  let cell = state.ai.nextMove();
  let shot = cell === null ? null : state.player.receiveShot(cell);
  // Defensive: never let a duplicate shot burn the AI's turn or fall through
  // the logging branches below with no ship attached.
  while (shot && shot.result === 'repeat') {
    state.ai.record(cell, 'repeat', null);
    cell = state.ai.nextMove();
    shot = cell === null ? null : state.player.receiveShot(cell);
  }
  if (shot === null) {
    state.phase = 'player';
    state.busy = false;
    setStatus('Your turn — fire at the enemy waters.');
    renderAll();
    return;
  }
  state.ai.record(cell, shot.result, shot.ship);
  state.lastAiShot = cell;

  if (shot.result === 'miss') log(`Enemy fired at ${coord(cell)} — miss.`);
  else if (shot.result === 'hit') log(`Enemy fired at ${coord(cell)} — hit on your ${shot.ship.name}!`);
  else log(`Enemy fired at ${coord(cell)} — your ${shot.ship.name} was sunk!`);

  if (state.player.allSunk()) {
    renderAll();
    finish(false);
    return;
  }

  state.phase = 'player';
  state.busy = false;
  setStatus('Your turn — fire at the enemy waters.');
  renderAll();
}

function resetGame() {
  state.phase = 'setup';
  state.player = new Board();
  state.enemy = new Board();
  state.ai = new AIPlayer();
  state.horizontal = true;
  state.selected = 0;
  state.hover = null;
  state.busy = false;
  state.lastPlayerShot = null;
  state.lastAiShot = null;
  el.log.innerHTML = '';
  el.overlay.classList.add('hidden');
  el.setup.classList.remove('hidden');
  el.orientation.textContent = 'horizontal';
  setStatus('Deploy your fleet to begin.');
  renderAll();
}

function rotate() {
  if (state.phase !== 'setup') return;
  state.horizontal = !state.horizontal;
  el.orientation.textContent = state.horizontal ? 'horizontal' : 'vertical';
  renderPlayerBoard();
}

buildBoard(
  el.playerBoard,
  playerCells,
  handlePlacement,
  (cell) => {
    if (state.phase !== 'setup') return;
    state.hover = cell;
    renderPlayerBoard();
  },
  () => {
    state.hover = null;
    renderPlayerBoard();
  }
);

buildBoard(el.enemyBoard, enemyCells, playerFire, null, null);

el.rotateBtn.addEventListener('click', rotate);
el.randomBtn.addEventListener('click', () => {
  if (state.phase !== 'setup') return;
  randomFleet(state.player);
  state.selected = 0;
  setStatus('Fleet ready — start the battle!');
  renderAll();
});
el.clearBtn.addEventListener('click', () => {
  if (state.phase !== 'setup') return;
  state.player.clear();
  state.selected = 0;
  setStatus('Deploy your fleet to begin.');
  renderAll();
});
el.startBtn.addEventListener('click', startGame);
el.restartBtn.addEventListener('click', resetGame);
el.overlayBtn.addEventListener('click', resetGame);
document.addEventListener('keydown', (event) => {
  if (event.key === 'r' || event.key === 'R') rotate();
});

resetGame();

// Exposed for the automated UI tests and for debugging in the console.
window.__battleship = { state, playerFire, aiTurn, resetGame, startGame, idx, FLEET };
