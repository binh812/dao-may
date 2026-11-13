// Luat xay bot: moi chuyen mot me, sai van xong me va van co cong, dung thi them hat, khong nhan thuong hai lan.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MILL_JOB, answer, canStart, cancelJob, createMill, reviveBonus, startJob } from '../src/game/mill-core.js';

const run = (mill, wave, answers) => { assert.equal(startJob(mill, wave), true); let last; for (const a of answers) last = answer(mill, a); return last; };

test('a batch takes exactly the set number of answers and pays base plus one per correct answer', () => {
  const mill = createMill();
  assert.equal(startJob(mill, 1), true);
  assert.deepEqual(answer(mill, true), { done: false, left: MILL_JOB.questions - 1 });
  assert.deepEqual(answer(mill, false), { done: false, left: MILL_JOB.questions - 2 });
  assert.equal(mill.bonus, 0, 'chua xong me thi chua thuong');
  assert.deepEqual(answer(mill, true), { done: true, reward: MILL_JOB.base + 2 * MILL_JOB.perCorrect, correct: 2 });
  assert.equal(mill.bonus, 3);
});

test('all wrong still finishes the batch and still pays the base: wrong answers never punish or block', () => {
  const mill = createMill(5);
  const end = run(mill, 1, [false, false, false]);
  assert.deepEqual(end, { done: true, reward: MILL_JOB.base, correct: 0 });
  assert.equal(mill.bonus, 5 + MILL_JOB.base);
  assert.ok(MILL_JOB.base >= 1);
});

test('all correct pays the most', () => {
  const mill = createMill();
  assert.equal(run(mill, 1, [true, true, true]).reward, MILL_JOB.base + MILL_JOB.questions * MILL_JOB.perCorrect);
});

test('one batch per journey: the same wave cannot be milled twice, the next wave can', () => {
  const mill = createMill();
  run(mill, 2, [true, true, true]);
  assert.equal(canStart(mill, 2), false);
  assert.equal(startJob(mill, 2), false);
  assert.equal(mill.job, null);
  assert.equal(mill.bonus, 4, 'khong thuong lan hai');
  assert.equal(canStart(mill, 3), true);
  run(mill, 3, [false, true, false]);
  assert.equal(mill.bonus, 4 + 2);
});

test('a batch in progress cannot be restarted, and answering without a batch is an error', () => {
  const mill = createMill();
  startJob(mill, 1); answer(mill, true);
  assert.equal(startJob(mill, 1), false);
  assert.equal(mill.job.answered, 1, 'me dang xay khong bi xoa');
  assert.throws(() => answer(createMill(), true), /Chua bat dau/);
});

test('a cancelled batch pays nothing and can be tried again in the same journey', () => {
  const mill = createMill();
  startJob(mill, 1); answer(mill, true); cancelJob(mill);
  assert.equal(mill.bonus, 0);
  assert.equal(canStart(mill, 1), true);
  assert.equal(run(mill, 1, [true, true, true]).reward, 4);
});

test('saved bonus is sanitised and bad wave numbers are rejected', () => {
  for (const junk of [-1, 2.5, NaN, '7', null, undefined, {}, Infinity]) assert.equal(reviveBonus(junk), 0);
  assert.equal(reviveBonus(12), 12);
  assert.equal(createMill('x').bonus, 0);
  assert.throws(() => startJob(createMill(), 0), RangeError);
  assert.throws(() => startJob(createMill(), 1.5), RangeError);
  assert.throws(() => startJob(createMill(), -2), RangeError);
  assert.throws(() => startJob(createMill(), NaN), RangeError);
});
