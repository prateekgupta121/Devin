// DOM-level tests: the real index.html is loaded into jsdom and driven with clicks.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { JSDOM } from 'jsdom';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'index.html'), 'utf8');

const dom = new JSDOM(html, { url: 'http://localhost/', pretendToBeVisual: true });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.HTMLElement = dom.window.HTMLElement;

const api = await import('../src/ui.js').then(() => dom.window.__battleship);
const { state, FLEET, idx } = api;

const $ = (sel) => document.querySelector(sel);
const playerCell = (r, c) => document.querySelectorAll('#player-board .cell')[idx(r, c)];
const enemyCell = (r, c) => document.querySelectorAll('#enemy-board .cell')[idx(r, c)];
const click = (node) => node.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));

test('boards render 100 cells each', () => {
  api.resetGame();
  assert.equal(document.querySelectorAll('#player-board .cell').length, 100);
  assert.equal(document.querySelectorAll('#enemy-board .cell').length, 100);
});

test('placing every ship enables the start button', () => {
  api.resetGame();
  assert.equal($('#start-btn').disabled, true);
  click($('#random-btn'));
  assert.equal(state.player.ships.length, FLEET.length);
  assert.equal($('#start-btn').disabled, false);
});

test('a ship can never be placed twice', () => {
  api.resetGame();
  click($('#random-btn'));
  // Fleet is complete; clicking any remaining open water must not add a 6th ship.
  for (let cell = 0; cell < 100; cell++) {
    if (!state.player.occupied.has(cell)) {
      click(document.querySelectorAll('#player-board .cell')[cell]);
    }
  }
  assert.equal(state.player.ships.length, FLEET.length);
  const names = state.player.ships.map((s) => s.name);
  assert.equal(new Set(names).size, FLEET.length);
});

test('clicking a placed ship picks it back up', () => {
  api.resetGame();
  click($('#random-btn'));
  const ship = state.player.ships[0];
  click(document.querySelectorAll('#player-board .cell')[ship.cells[0]]);
  assert.equal(state.player.ships.length, FLEET.length - 1);
  assert.equal($('#start-btn').disabled, true);
});

test('manual placement respects overlap and edges', () => {
  api.resetGame();
  click(playerCell(0, 6)); // Carrier (5) horizontally from column 7 -> off board
  assert.equal(state.player.ships.length, 0);
  click($('#rotate-btn'));
  click(playerCell(0, 4)); // Carrier vertically down column 5
  assert.equal(state.player.ships.length, 1);
  click($('#rotate-btn'));
  click(playerCell(2, 1)); // Battleship would cross the carrier
  assert.equal(state.player.ships.length, 1);
  click(playerCell(2, 0)); // C1-C4 is clear, so this one fits
  assert.equal(state.player.ships.length, 2);
});

test('hover preview flags placements that run off the board', () => {
  api.resetGame();
  const hover = (node) => node.dispatchEvent(new dom.window.MouseEvent('mouseenter', { bubbles: false }));
  hover(playerCell(0, 0));
  assert.equal(document.querySelectorAll('#player-board .preview').length, 5);
  assert.equal(document.querySelectorAll('#player-board .invalid').length, 0);
  hover(playerCell(0, 8));
  assert.equal(document.querySelectorAll('#player-board .preview').length, 0);
  assert.equal(document.querySelectorAll('#player-board .invalid').length, 2, 'off-board overhang must be flagged');
});

test('no preview is shown once every ship is placed', () => {
  api.resetGame();
  click($('#random-btn'));
  playerCell(0, 0).dispatchEvent(new dom.window.MouseEvent('mouseenter', { bubbles: false }));
  assert.equal(document.querySelectorAll('#player-board .preview, #player-board .invalid').length, 0);
});

test('enemy board is not clickable during setup', () => {
  api.resetGame();
  click(enemyCell(0, 0));
  assert.equal(state.enemy.shots.size, 0);
});

test('a shot fired at the enemy is recorded once and passes the turn', () => {
  api.resetGame();
  click($('#random-btn'));
  click($('#start-btn'));
  assert.equal(state.phase, 'player');
  click(enemyCell(3, 3));
  assert.equal(state.enemy.shots.size, 1);
  click(enemyCell(3, 3)); // repeat click must be ignored
  assert.equal(state.enemy.shots.size, 1);
  assert.equal(state.phase, 'ai');
  click(enemyCell(4, 4)); // player cannot fire while the AI is thinking
  assert.equal(state.enemy.shots.size, 1);
});

test('the AI replies and hands the turn back', () => {
  api.resetGame();
  click($('#random-btn'));
  click($('#start-btn'));
  click(enemyCell(3, 3));
  api.aiTurn();
  assert.equal(state.player.shots.size, 1);
  assert.equal(state.phase, 'player');
  assert.equal(state.busy, false);
});

test('sinking the whole enemy fleet ends the game in victory', () => {
  api.resetGame();
  click($('#random-btn'));
  click($('#start-btn'));
  for (const ship of [...state.enemy.ships]) {
    for (const cell of ship.cells) {
      state.phase = 'player';
      state.busy = false;
      click(document.querySelectorAll('#enemy-board .cell')[cell]);
    }
  }
  assert.equal(state.phase, 'over');
  assert.equal($('#overlay').classList.contains('hidden'), false);
  assert.match($('#overlay-title').textContent, /Victory/);
});

test('losing every ship ends the game in defeat', () => {
  api.resetGame();
  click($('#random-btn'));
  click($('#start-btn'));
  let turns = 0;
  while (state.phase !== 'over') {
    assert.ok(++turns < 300, 'AI never finished the player fleet');
    state.phase = 'ai';
    api.aiTurn();
  }
  assert.equal(state.player.allSunk(), true);
  assert.match($('#overlay-title').textContent, /Defeat/);
});

test('new game clears both boards and the log', () => {
  api.resetGame();
  click($('#random-btn'));
  click($('#start-btn'));
  click(enemyCell(5, 5));
  api.aiTurn();
  click($('#restart-btn'));
  assert.equal(state.phase, 'setup');
  assert.equal(state.player.ships.length, 0);
  assert.equal(state.enemy.shots.size, 0);
  assert.equal($('#log').children.length, 0);
  assert.equal($('#overlay').classList.contains('hidden'), true);
  assert.equal(document.querySelectorAll('#enemy-board .hit, #enemy-board .miss').length, 0);
  assert.equal(document.querySelectorAll('#player-board .hit, #player-board .miss').length, 0);
});

test('a pending AI shot from the previous game never lands after a restart', () => {
  api.resetGame();
  click($('#random-btn'));
  click($('#start-btn'));
  click(enemyCell(6, 6));
  assert.equal(state.phase, 'ai');
  click($('#restart-btn')); // restart while the AI timer is still pending
  api.aiTurn(); // simulate the queued timer firing
  assert.equal(state.player.shots.size, 0);
  assert.equal(state.phase, 'setup');
});

test('20 full games always terminate with a result', () => {
  for (let game = 0; game < 20; game++) {
    api.resetGame();
    click($('#random-btn'));
    click($('#start-btn'));
    let turns = 0;
    while (state.phase !== 'over') {
      assert.ok(++turns < 500, 'game did not terminate');
      if (state.phase === 'player') {
        const open = [...Array(100).keys()].filter((c) => !state.enemy.shots.has(c));
        click(document.querySelectorAll('#enemy-board .cell')[open[turns % open.length]]);
      } else if (state.phase === 'ai') {
        api.aiTurn();
      }
    }
    assert.equal($('#overlay').classList.contains('hidden'), false);
    assert.ok(state.enemy.allSunk() || state.player.allSunk());
  }
});

test('rotation only applies during setup', () => {
  api.resetGame();
  assert.equal(state.horizontal, true);
  click($('#rotate-btn'));
  assert.equal(state.horizontal, false);
  assert.equal($('#orientation-label').textContent, 'vertical');
  click($('#random-btn'));
  click($('#start-btn'));
  click($('#rotate-btn'));
  assert.equal(state.horizontal, false, 'rotating mid-battle must be a no-op');
});
