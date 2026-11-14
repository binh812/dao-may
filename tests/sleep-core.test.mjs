// Vung ngu va thuc: vung trum het cac Bong Lang, cang nhieu con thuc cang bot nhat, thuc het thi mau loang ra roi het han, so hong khong lam vo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SLEEP, createZone, isAwake, stepZone } from '../src/game/sleep-core.js';

const CAMP = [{ x: 10, z: 4 }, { x: -9, z: 8 }, { x: 5, z: -12 }];
const settle = (zone, awake, total, seconds = 10) => { for (let t = 0; t < seconds; t += 1 / 30) stepZone(zone, 1 / 30, awake, total); return zone; };

test('the zone is centred on the sleepers and covers every one of them with room to spare', () => {
  const zone = createZone(CAMP);
  assert.ok(Math.abs(zone.x - 2) < 1e-9 && Math.abs(zone.z - 0) < 1e-9);
  for (const spot of CAMP) assert.ok(Math.hypot(spot.x - zone.x, spot.z - zone.z) + SLEEP.margin <= zone.radius + 1e-9);
  assert.ok(createZone([{ x: 3, z: 3 }]).radius >= SLEEP.minRadius, 'mot con cung co vung du rong de thay');
  assert.throws(() => createZone([]), RangeError);
  assert.throws(() => createZone(null), RangeError);
});

test('a fully asleep camp starts pale but never loses all its colour', () => {
  const zone = createZone(CAMP);
  assert.equal(zone.amount, SLEEP.deepest);
  assert.ok(SLEEP.deepest < 0.8 && SLEEP.lightest > 0.2 && SLEEP.lightest < SLEEP.deepest);
  assert.equal(zone.clear, 0);
});

test('each sleeper woken makes the zone less pale, and it stays visibly pale until the last one wakes', () => {
  const amounts = [0, 1, 2].map((awake) => settle(createZone(CAMP), awake, 3).amount);
  assert.ok(amounts[0] > amounts[1] && amounts[1] > amounts[2], amounts.join(' > '));
  assert.ok(Math.abs(amounts[0] - SLEEP.deepest) < 1e-3);
  assert.ok(Math.abs(amounts[2] - SLEEP.lightest) < 1e-3);
  assert.equal(settle(createZone(CAMP), 2, 3).clear, 0, 'chua thuc het thi mau chua loang');
});

test('paleness eases instead of jumping when a sleeper wakes', () => {
  const zone = settle(createZone(CAMP), 0, 3);
  const before = zone.amount;
  stepZone(zone, 1 / 60, 1, 3);
  assert.ok(zone.amount < before && before - zone.amount < 0.02);
});

test('when the last sleeper wakes, colour washes outward from the centre and then the zone is fully awake', () => {
  const zone = settle(createZone(CAMP), 2, 3);
  const pale = zone.amount;
  let last = 0;
  for (let t = 0; t < SLEEP.washSeconds * 0.5; t += 1 / 30) { stepZone(zone, 1 / 30, 3, 3); assert.ok(zone.clear >= last); last = zone.clear; }
  assert.ok(zone.clear > 0 && zone.clear < zone.radius, 'giua chung: mau moi loang mot phan');
  assert.equal(zone.amount, pale, 'trong luc loang, phan chua toi van nhat nhu cu');
  assert.equal(isAwake(zone), false);
  settle(zone, 3, 3, SLEEP.washSeconds);
  assert.ok(zone.clear >= zone.radius, 'vong mau phu het vung');
  assert.equal(isAwake(zone), true);
  assert.equal(zone.amount, 0);
});

test('the wash ends past the edge of even the smallest zone, so switching the effect off never pops', () => {
  assert.ok(SLEEP.minRadius * SLEEP.washOvershoot - SLEEP.washEdge >= SLEEP.minRadius, 'mep loang phai ra khoi vung truoc khi tat');
});

test('a camp with a single sleeper is pale until it wakes, then washes clean', () => {
  const zone = settle(createZone([{ x: 0, z: 0 }]), 0, 1);
  assert.ok(Math.abs(zone.amount - SLEEP.deepest) < 1e-3);
  assert.equal(isAwake(settle(zone, 1, 1)), true);
});

test('bad time steps and odd counts leave the zone sane', () => {
  const zone = createZone(CAMP), snapshot = { ...zone };
  for (const dt of [NaN, -1, Infinity, undefined]) assert.deepEqual({ ...stepZone(zone, dt, 1, 3) }, snapshot);
  stepZone(zone, 0, 1, 3);
  assert.deepEqual({ ...zone }, snapshot, 'dt = 0 (dang mo bang: session truyen 0) khong doi gi');
  for (const [awake, total] of [[5, 3], [-2, 3], [0, 0]]) { const z = settle(createZone(CAMP), awake, total, 1); assert.ok(z.amount >= 0 && z.amount <= SLEEP.deepest && Number.isFinite(z.clear)); }
});
