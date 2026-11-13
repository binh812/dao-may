// Luat can bot: moi chuyen mot me (mot cau do), giai kieu nao cung xong me va co cong, khong nhan thuong hai lan.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MILL_JOB, canStart, cancelJob, createMill, finishJob, reviveBonus, startJob } from '../src/game/mill-core.js';

test('a batch is one puzzle and pays the base plus a bonus for how it was solved', () => {
  for (const [quality, extra] of [['first', 3], ['later', 2], ['shown', 1]]) {
    const mill = createMill();
    assert.equal(startJob(mill, 1), true);
    assert.equal(mill.bonus, 0, 'chua xong me thi chua thuong');
    assert.equal(finishJob(mill, quality), MILL_JOB.base + extra);
    assert.equal(mill.bonus, MILL_JOB.base + extra);
    assert.equal(mill.job, null);
  }
});

test('seeing the solution still finishes the batch and still pays: never punished, never stuck', () => {
  const mill = createMill(5);
  startJob(mill, 1);
  const reward = finishJob(mill, 'shown');
  assert.ok(reward >= 2 && MILL_JOB.base >= 1);
  assert.equal(mill.bonus, 5 + reward);
  assert.ok(MILL_JOB.bonus.first > MILL_JOB.bonus.later && MILL_JOB.bonus.later > MILL_JOB.bonus.shown);
});

test('one batch per journey: the same wave cannot be milled twice, the next wave can', () => {
  const mill = createMill();
  startJob(mill, 2); finishJob(mill, 'first');
  assert.equal(canStart(mill, 2), false);
  assert.equal(startJob(mill, 2), false);
  assert.equal(mill.job, null);
  assert.equal(mill.bonus, 4, 'khong thuong lan hai');
  assert.equal(canStart(mill, 3), true);
  startJob(mill, 3); finishJob(mill, 'later');
  assert.equal(mill.bonus, 4 + 3);
});

test('a batch in progress cannot be restarted; finishing without a batch or with a bad quality is an error', () => {
  const mill = createMill();
  startJob(mill, 1);
  assert.equal(startJob(mill, 1), false);
  assert.throws(() => finishJob(mill, 'perfect'), RangeError);
  assert.equal(mill.bonus, 0);
  assert.notEqual(mill.job, null, 'loi thi me van con de thu lai');
  assert.throws(() => finishJob(createMill(), 'first'), /Chua bat dau/);
});

test('a batch put off for later pays nothing and can be tried again in the same journey', () => {
  const mill = createMill();
  startJob(mill, 1); cancelJob(mill);
  assert.equal(mill.bonus, 0);
  assert.equal(canStart(mill, 1), true);
  startJob(mill, 1);
  assert.equal(finishJob(mill, 'first'), 4);
});

test('saved bonus is sanitised and bad wave numbers are rejected', () => {
  for (const junk of [-1, 2.5, NaN, '7', null, undefined, {}, Infinity]) assert.equal(reviveBonus(junk), 0);
  assert.equal(reviveBonus(12), 12);
  assert.equal(createMill('x').bonus, 0);
  for (const wave of [0, 1.5, -2, NaN]) assert.throws(() => startJob(createMill(), wave), RangeError);
});
