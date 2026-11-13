// Luat nhat Hat Nang: cham thi nhat, khong nhat hai lan, nho qua cac lan choi, khong nhat khi bay ngang tren cao.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COLLECT, createCollection, isMilestone, stepCollection, takenIds } from '../src/game/collect-core.js';

const row = (n) => Array.from({ length: n }, (_, i) => ({ id: `s${i}`, x: i * 10, y: 1, z: 0 }));

test('touching a seed picks it exactly once', () => {
  const c = createCollection(row(3));
  stepCollection(c, { x: 10.4, y: 0.2, z: 0.5 });
  assert.deepEqual(c.events.picked.map((i) => i.id), ['s1']);
  assert.equal(c.count, 1);
  stepCollection(c, { x: 10.4, y: 0.2, z: 0.5 });
  assert.deepEqual(c.events.picked, [], 'dung yen tai cho khong duoc nhat lan nua');
  assert.equal(c.count, 1);
});

test('a seed just outside the pick radius is left alone, just inside is picked', () => {
  const c = createCollection(row(1));
  stepCollection(c, { x: COLLECT.radius + 0.05, y: 1, z: 0 });
  assert.equal(c.count, 0);
  stepCollection(c, { x: COLLECT.radius - 0.05, y: 1, z: 0 });
  assert.equal(c.count, 1);
});

test('distance counts both ground axes, and two seeds touched at once are both picked', () => {
  const far = createCollection([{ id: 'a', x: 0, y: 1, z: 5 }]);
  stepCollection(far, { x: 0, y: 1, z: 0 });
  assert.equal(far.count, 0, 'cach 5 m theo truc z thi chua cham');
  const pair = createCollection([{ id: 'a', x: 0.4, y: 1, z: 0 }, { id: 'b', x: -0.4, y: 1, z: 0.3 }]);
  stepCollection(pair, { x: 0, y: 1, z: 0 });
  assert.deepEqual(pair.events.picked.map((i) => i.id), ['a', 'b']);
});

test('gliding high above a seed does not pick it', () => {
  const c = createCollection(row(1));
  stepCollection(c, { x: 0, y: 1 + COLLECT.reach + 0.5, z: 0 });
  assert.equal(c.count, 0);
});

test('seeds taken in an earlier visit stay taken, and stale saved ids are ignored', () => {
  const c = createCollection(row(3), ['s2', 'khong-con-ton-tai']);
  assert.equal(c.count, 1);
  stepCollection(c, { x: 20, y: 1, z: 0 });
  assert.equal(c.count, 1, 'vat da nhat tu truoc khong duoc tinh lan nua');
  stepCollection(c, { x: 0, y: 1, z: 0 });
  assert.deepEqual(takenIds(c).sort(), ['s0', 's2']);
});

test('milestones fire on every tenth seed and on the last one', () => {
  const c = createCollection(row(12));
  const picked = [];
  for (let i = 0; i < 12; i++) { stepCollection(c, { x: i * 10, y: 1, z: 0 }); if (isMilestone(c)) picked.push(c.count); }
  assert.deepEqual(picked, [COLLECT.milestone, 12]);
  assert.equal(isMilestone(createCollection(row(3))), false, 'chua nhat gi thi khong khen');
});

test('bad data is rejected loudly', () => {
  assert.throws(() => createCollection([{ id: 'a', x: 0, y: 0, z: 0 }, { id: 'a', x: 1, y: 0, z: 0 }]), RangeError);
  assert.throws(() => createCollection([{ id: 'a', x: 0, y: NaN, z: 0 }]), RangeError);
});
