// O an quan: rai dung, an dung, khong mat vien nao, van nao cung ket thuc, ban choi cung chi di nuoc hop le.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OQ, SIDES, chooseMove, cloneGame, createGame, legalMoves, playMove, totalValue, winner } from '../src/game/oanquan-core.js';

function seeded(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
/** Ban co tuy y de dung tinh huong: dan la 12 so, quan la hai o quan con hay khong. */
function board(dan, { quan0 = true, quan6 = true, turn = 'player' } = {}) {
  const g = createGame();
  g.dan = [...dan]; g.quan = dan.map((_, i) => (i === 0 ? quan0 : i === 6 ? quan6 : false)); g.turn = turn;
  return g;
}

test('a new game has 5 stones in each of the ten small cells and a quan at both ends', () => {
  const g = createGame();
  assert.deepEqual(g.dan, [0, 5, 5, 5, 5, 5, 0, 5, 5, 5, 5, 5]);
  assert.deepEqual([g.quan[0], g.quan[6]], [true, true]);
  assert.equal(totalValue(g), 10 * OQ.perCell + 2 * OQ.quanValue);
  assert.equal(legalMoves(g, 'player').length, 10);
  assert.equal(winner(g), null);
});

test('sowing drops one stone per cell in the chosen direction, then scoops the next cell and carries on', () => {
  // o 1 co 2 vien, rai sang phai: o 2, o 3 moi o them mot; o 4 co soi nen boc 1 vien rai tiep vao o 5; o 6 la quan -> het luot
  const g = board([0, 2, 0, 0, 1, 0, 0, 3, 0, 0, 0, 0]);
  const steps = playMove(g, 'player', 1, 1);
  assert.deepEqual(steps.map((s) => `${s.type}${s.cell ?? ''}`), ['take1', 'sow2', 'sow3', 'take4', 'sow5']);
  assert.deepEqual(g.dan, [0, 0, 1, 1, 0, 1, 0, 3, 0, 0, 0, 0]);
  assert.equal(g.score.player, 0);
  assert.equal(g.turn, 'rival');
});

test('an empty cell followed by a filled one is a capture, and captures chain across single gaps', () => {
  // o 1 co 1 vien rai vao o 2; o 3 trong, o 4 co 4 -> an; o 5 trong, o 6 (quan + 2 dan) -> an tiep ca quan
  const g = board([0, 1, 0, 0, 4, 0, 2, 3, 0, 0, 0, 0]);
  const steps = playMove(g, 'player', 1, 1);
  assert.deepEqual(steps.filter((s) => s.type === 'capture').map((s) => [s.cell, s.gain]), [[4, 4], [6, 2 + OQ.quanValue]]);
  assert.equal(g.score.player, 4 + 2 + OQ.quanValue);
  assert.equal(g.quan[6], false);
  assert.equal(g.over, false, 'con mot o quan thi chua tan cuoc');
});

test('two empty cells in a row, or a quan cell with stones ahead, end the turn with nothing taken', () => {
  const twoGaps = board([0, 1, 0, 0, 0, 7, 0, 3, 0, 0, 0, 0]);
  assert.equal(playMove(twoGaps, 'player', 1, 1).some((s) => s.type === 'capture'), false);
  assert.equal(twoGaps.dan[5], 7);
  const quanAhead = board([0, 0, 0, 0, 1, 0, 0, 3, 0, 0, 0, 0]);   // o 4 rai vao o 5, o ke la o quan 6 con quan
  const steps = playMove(quanAhead, 'player', 4, 1);
  assert.deepEqual(steps.map((s) => s.type), ['take', 'sow']);
  assert.equal(quanAhead.quan[6], true);
});

test('sowing to the left works the same way, mirrored', () => {
  const g = board([0, 0, 4, 0, 1, 0, 0, 3, 0, 0, 0, 0]);
  playMove(g, 'player', 4, -1);       // rai vao o 3; o 2 co 4 vien -> boc rai tiep vao o 1, 0, 11, 10; o 9 trong, o 8 trong -> het luot
  assert.deepEqual(g.dan, [1, 1, 0, 1, 0, 0, 0, 3, 0, 0, 1, 1]);
  assert.equal(g.score.player, 0);
});

test('the game ends when both quan cells are empty and leftover stones go to their own side', () => {
  const h = board([0, 0, 1, 0, 0, 0, 0, 3, 0, 0, 0, 0], { quan6: false });
  const steps = playMove(h, 'player', 2, -1);   // rai vao o 1; o ke (0) la o quan con quan -> dung, khong an
  assert.equal(steps.at(-1).type, 'sow');
  assert.equal(h.over, false);
  const k = board([0, 0, 0, 1, 0, 0, 0, 3, 0, 0, 0, 2], { quan6: false });
  const end = playMove(k, 'player', 3, -1);     // rai vao o 2; o 1 trong, o 0 co quan -> an quan; ca hai o quan da het -> tan cuoc
  assert.equal(end.at(-1).type, 'end');
  assert.equal(k.over, true);
  assert.equal(k.score.player, OQ.quanValue + 1, 'quan vua an + vien con lai o hang cua be');
  assert.equal(k.score.rival, 3 + 2, 'soi con lai ben nao ve ben do');
  assert.equal(k.dan.reduce((a, b) => a + b, 0), 0);
  assert.equal(winner(k), 'player');
  assert.deepEqual(legalMoves(k, 'rival'), []);
  assert.throws(() => playMove(k, 'rival', 7, 1), /ket thuc/);
});

test('a side with five bare cells must scatter five of its captured stones, borrowing if short', () => {
  const g = board([3, 1, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0]);
  g.score.rival = 2;
  const steps = playMove(g, 'player', 1, 1);    // sau nuoc nay hang cua ban choi cung van trong -> phai rai lai
  assert.equal(steps.at(-1).type, 'scatter');
  assert.deepEqual(SIDES.rival.map((cell) => g.dan[cell]), [1, 1, 1, 1, 1]);
  assert.equal(g.score.rival, 2 - OQ.scatter);
  assert.equal(g.turn, 'rival');
  assert.ok(legalMoves(g, 'rival').length > 0, 'rai lai xong thi phai co nuoc di');
});

test('illegal moves are refused: wrong turn, not your cell, empty cell, bad direction', () => {
  const g = createGame();
  assert.throws(() => playMove(g, 'rival', 7, 1), /Chua toi luot/);
  assert.throws(() => playMove(g, 'player', 7, 1), RangeError);
  assert.throws(() => playMove(g, 'player', 0, 1), RangeError);
  assert.throws(() => playMove(g, 'player', 1, 2), RangeError);
  const bare = board([0, 0, 5, 5, 5, 5, 0, 5, 5, 5, 5, 5]);
  assert.throws(() => playMove(bare, 'player', 1, 1), RangeError);
  assert.equal(totalValue(g), 70, 'nuoc bi tu choi khong doi ban co');
});

test('random games never lose a stone, always alternate turns and always finish', () => {
  for (let seed = 1; seed <= 300; seed++) {
    const rng = seeded(seed), g = createGame();
    let turns = 0;
    while (!g.over && turns < 600) {
      const side = g.turn, move = chooseMove(g, side, rng, seed % 2 ? 0.55 : 0);
      assert.ok(move, `seed ${seed}: het nuoc di ma chua tan cuoc`);
      assert.ok(SIDES[side].includes(move.cell) && g.dan[move.cell] > 0);
      const steps = playMove(g, side, move.cell, move.dir);
      assert.ok(steps.length < OQ.maxSteps, `seed ${seed}: rai mai khong dung`);
      assert.equal(totalValue(g), 70, `seed ${seed}: mat soi`);
      assert.ok(g.dan.every((n) => n >= 0));
      if (!g.over) assert.notEqual(g.turn, side);
      turns++;
    }
    assert.equal(g.over, true, `seed ${seed}: ${turns} luot chua xong`);
    assert.equal(g.score.player + g.score.rival, 70);
    assert.ok(['player', 'rival', 'draw'].includes(winner(g)));
  }
});

test('the greedy rival takes the biggest capture on offer and choosing never changes the real board', () => {
  const g = board([0, 3, 0, 0, 0, 0, 0, 1, 0, 6, 0, 0], { quan0: false, turn: 'rival' });
  const before = cloneGame(g);
  // nuoc duoc chon phai la nuoc an nhieu nhat trong moi nuoc hop le
  const move = chooseMove(g, 'rival', () => 0, 1);
  assert.deepEqual(g, before);
  const gains = legalMoves(g, 'rival').map((m) => { const t = cloneGame(g); playMove(t, 'rival', m.cell, m.dir); return t.score.rival; });
  const chosen = cloneGame(g); playMove(chosen, 'rival', move.cell, move.dir);
  assert.equal(chosen.score.rival, Math.max(...gains));
  assert.ok(Math.max(...gains) > Math.min(...gains), 'tinh huong phai co nuoc hon kem thi phep thu moi co nghia');
  assert.equal(chooseMove(board([0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], { turn: 'rival' }), 'rival'), null);
});
