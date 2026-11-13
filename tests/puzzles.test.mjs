// Do vui tuong tac: moi cau do sinh ra phai giai duoc, chua giai san, vua suc lop, va loi giai dua ra phai dung.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FLOWERS, POUR_MOVES, PUZZLE_KINDS, balanceSums, countGardenSolutions, hintText, initialState, isSolved, makePuzzle, pickKind, pourMove, solutionState, solutionSteps, solvePour } from '../src/learn/puzzles.js';

const ROUNDS = 300, GRADES = [1, 2, 3];
/** Bo sinh so co seed (mulberry32) de test lap lai duoc. */
function seeded(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function each(kind, check) {
  for (const grade of GRADES) { const rng = seeded(grade * 7919 + kind.length); for (let i = 0; i < ROUNDS; i++) check(makePuzzle(kind, grade, rng), grade); }
}

test('every puzzle of every kind starts unsolved and its offered solution solves it', () => {
  for (const kind of PUZZLE_KINDS) each(kind, (p) => {
    assert.equal(isSolved(p, initialState(p)), false, `${kind}: da giai san`);
    assert.equal(isSolved(p, solutionState(p)), true, `${kind}: loi giai khong dung ${JSON.stringify(p)}`);
    assert.ok(p.prompt.length > 10 && p.title.length > 3);
    assert.ok(solutionSteps(p).length >= 1 && solutionSteps(p).every((line) => line.length > 5));
  });
});

test('balance: weights are positive, the answer uses each tray weight at most once and totals fit the grade', () => {
  const LIMIT = { 1: 12, 2: 23, 3: 45 };
  each('balance', (p, grade) => {
    const total = p.left.reduce((a, b) => a + b, 0);
    assert.ok(p.left.every((w) => Number.isInteger(w) && w >= 1));
    assert.equal(new Set(p.answer).size, p.answer.length);
    assert.equal(p.answer.reduce((sum, i) => sum + p.tray[i], 0), total);
    assert.ok(total <= LIMIT[grade], `lop ${grade}: tong ${total}`);
    assert.equal(p.left.length, grade === 1 ? 1 : p.left.length);
    assert.ok(grade === 1 ? p.left.length === 1 : p.left.length <= 2);
    // bo bot mot qua can khoi loi giai thi can phai lech
    const state = solutionState(p); state.on[p.answer[0]] = false;
    assert.equal(isSolved(p, state), false);
    assert.ok(balanceSums(p, state).right < total);
  });
});

test('pour: the stored path is a shortest one, its length fits the grade, and the target is not a jug size', () => {
  const STEPS = { 1: [2, 2], 2: [2, 4], 3: [4, 6] };
  each('pour', (p, grade) => {
    const best = solvePour(p.capA, p.capB, p.target);
    assert.equal(p.path.length, best.length);
    assert.ok(p.path.length >= STEPS[grade][0] && p.path.length <= STEPS[grade][1], `lop ${grade}: ${p.path.length} buoc`);
    assert.ok(p.target !== p.capA && p.target !== p.capB && p.target >= 1 && p.target < p.capB);
    assert.equal(solutionSteps(p).length, p.path.length);
    assert.ok(p.prompt.includes(String(p.target)));
  });
});

test('pour moves never create or lose water beyond the jugs and never go negative', () => {
  const p = { capA: 3, capB: 5 };
  for (let a = 0; a <= 3; a++) for (let b = 0; b <= 5; b++) for (const move of POUR_MOVES) {
    const next = pourMove(p, { a, b }, move);
    assert.ok(next.a >= 0 && next.a <= 3 && next.b >= 0 && next.b <= 5, `${move} tu ${a},${b}`);
    if (move === 'AtoB' || move === 'BtoA') assert.equal(next.a + next.b, a + b, 'rot khong lam mat nuoc');
  }
  assert.deepEqual(pourMove(p, { a: 3, b: 4 }, 'AtoB'), { a: 2, b: 5 });
  assert.deepEqual(pourMove(p, { a: 1, b: 5 }, 'emptyB'), { a: 1, b: 0 });
  assert.deepEqual(pourMove(p, { a: 1, b: 5 }, 'emptyA'), { a: 0, b: 5 });
  assert.throws(() => pourMove(p, { a: 0, b: 0 }, 'spill'), RangeError);
  assert.equal(solvePour(2, 4, 3), null, 'hai binh chan khong dong duoc so le');
  assert.deepEqual(solvePour(3, 5, 2), ['fillB', 'BtoA']);
});

test('pattern: the shown cells fix the rule, both answers are on the palette, and a wrong fill is not accepted', () => {
  each('pattern', (p, grade) => {
    assert.equal(p.blanks.length, 2);
    assert.equal(p.numeric, grade > 1);
    assert.equal(new Set(p.palette).size, p.palette.length, 'bang chon bi trung');
    assert.ok(p.palette.length >= 3);
    for (const cell of p.blanks) assert.ok(p.palette.includes(p.cells[cell]));
    if (p.numeric) {
      assert.ok(p.blanks.every((cell) => cell >= 3), 'ba so dau phai hien');
      assert.ok(p.cells.every((v) => Number.isInteger(v) && v > 0), `co so khong duong: ${p.cells}`);
      const diff = p.cells[1] - p.cells[0], ratio = p.cells[1] / p.cells[0];
      const arithmetic = p.cells.every((v, i) => i === 0 || v - p.cells[i - 1] === diff), doubling = p.cells.every((v, i) => i === 0 || v / p.cells[i - 1] === ratio);
      assert.ok(arithmetic || doubling);
      if (grade === 2) assert.ok(arithmetic && Math.max(...p.cells) <= 60);
    } else {
      // moi o trong phai bang o cach no dung mot chu ky, va chu ky da hien du it nhat mot lan truoc do
      const shown = p.cells.slice(0, p.blanks[0]);
      const period = [2, 3].find((size) => shown.every((v, i) => i < size || v === shown[i - size]));
      assert.ok(period && shown.length >= period * 2 - 1, `khong thay chu ky: ${p.cells}`);
      for (const cell of p.blanks) assert.equal(p.cells[cell], p.cells[cell - period]);
    }
    const wrong = solutionState(p); wrong.fill[1] = p.palette.find((v) => v !== p.cells[p.blanks[1]]);
    assert.equal(isSolved(p, wrong), false);
  });
});

test('garden: exactly one way to finish, enough empty cells, and a duplicate in a row is rejected', () => {
  const MIN_BLANKS = { 1: 2, 2: 4, 3: 6 };
  each('garden', (p, grade) => {
    assert.equal(p.given.length, p.n * p.n);
    assert.equal(countGardenSolutions(p.n, p.given, 3), 1);
    const blanks = p.given.filter((v) => v === null).length;
    assert.ok(blanks >= MIN_BLANKS[grade], `lop ${grade}: chi co ${blanks} o trong`);
    assert.equal(p.flowers.length, p.n);
    assert.ok(p.flowers.every((f) => FLOWERS.includes(f)));
    const bad = solutionState(p), cell = p.given.indexOf(null), row = Math.floor(cell / p.n);
    bad.grid[cell] = bad.grid[row * p.n + ((cell % p.n) + 1) % p.n];
    assert.equal(isSolved(p, bad), false);
    const half = solutionState(p); half.grid[cell] = null;
    assert.equal(isSolved(p, half), false, 'con o trong thi chua xong');
  });
});

test('hints guide without giving the answer away', () => {
  for (const kind of PUZZLE_KINDS) each(kind, (p) => {
    const hint = hintText(p);
    assert.ok(hint.length > 15);
    if (kind === 'balance') for (const i of p.answer) assert.ok(!new RegExp(`(^|\\D)${p.tray[i]}(\\D|$)`).test(hint));
    if (kind === 'pattern' && p.numeric) for (const cell of p.blanks) assert.ok(!hint.includes(String(p.cells[cell])));
  });
});

test('kinds rotate: the next kind is never the one just played; unknown kinds and odd grades are handled', () => {
  const rng = seeded(5);
  let last = null; const seen = new Set();
  for (let i = 0; i < 200; i++) { const kind = pickKind(last, rng); assert.notEqual(kind, last); seen.add(kind); last = kind; }
  assert.equal(seen.size, PUZZLE_KINDS.length);
  assert.throws(() => makePuzzle('maze', 1, rng), RangeError);
  assert.equal(makePuzzle('garden', 9, rng).grade, 3);
  assert.equal(makePuzzle('garden', 0, rng).grade, 1);
  assert.equal(makePuzzle('pour', 'abc', rng).grade, 1);
});
