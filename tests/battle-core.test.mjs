import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BATTLE, allAwake, chargePouch, createBattle, createEnemy, leafAttack, nearestEnemy, revivePouch, stepBattle, telegraphTime, throwOrb } from '../src/game/battle-core.js';

const FRAME = 1 / 60;
const at = (x, z) => ({ x, z });
function run(b, player, seconds, onFrame) {
  for (let i = 0, n = Math.round(seconds / FRAME); i < n; i++) { stepBattle(b, typeof player === 'function' ? player(i * FRAME) : player, FRAME); if (onFrame) onFrame(b); }
}

test('leaf attack hits the nearest sleeping enemy and respects its cooldown', () => {
  const b = createBattle([createEnemy('far', 5, 0, 1000), createEnemy('near', 2, 0, 1000)]);
  const first = leafAttack(b, at(0, 0));
  assert.equal(first.target.id, 'near');
  assert.equal(first.target.wake, BATTLE.leafDamage);
  assert.equal(leafAttack(b, at(0, 0)), null, 'dang hoi chieu');
  run(b, at(0, 0), BATTLE.leafCooldown + 0.05);
  assert.notEqual(leafAttack(b, at(0, 0)), null);
});

test('leaf attack out of range does nothing', () => {
  const b = createBattle([createEnemy('e', BATTLE.leafRange + 1, 0)]);
  assert.equal(leafAttack(b, at(0, 0)), null);
  assert.equal(b.enemies[0].wake, 0);
});

test('holding the leaf button wakes an ordinary Shadow in about two seconds with no question at all', () => {
  const b = createBattle([createEnemy('e', 3, 0)]);
  let seconds = 0;
  while (!b.enemies[0].awake && seconds < 10) { leafAttack(b, at(0, 0)); stepBattle(b, at(50, 50), FRAME); seconds += FRAME; }   // buoc tran voi Mam o xa de dich khong tan cong
  assert.equal(b.enemies[0].awake, true);
  assert.ok(seconds <= 2.2, `mat ${seconds.toFixed(2)} giay`);
});

test('one puzzle fills the pouch: first-try 3 orbs, later 2, shown solution still 1; never above the cap', () => {
  const b = createBattle([]);
  assert.equal(b.pouch, 0);
  assert.equal(chargePouch(b, 'shown'), 1);
  assert.equal(chargePouch(b, 'later'), 2);
  assert.equal(b.pouch, 3);
  assert.equal(chargePouch(b, 'first'), 0, 'tui day roi');
  assert.equal(b.pouch, BATTLE.pouchMax);
  assert.equal(chargePouch(createBattle([]), 'first'), BATTLE.pouchMax);
  assert.ok(Object.values(BATTLE.charge).every((n) => n >= 1), 'giai kieu nao cung phai duoc it nhat mot vien');
  assert.throws(() => chargePouch(b, 'wrong'), RangeError);
  assert.throws(() => chargePouch(b, undefined), RangeError);
});

test('one orb wakes an ordinary Shadow outright and splashes onto its neighbours, not onto far ones', () => {
  const b = createBattle([createEnemy('a', 3, 0), createEnemy('b', 3 + BATTLE.orbSplash - 0.5, 0), createEnemy('far', 3 + BATTLE.orbSplash + 2, 0), createEnemy('big', 3, 2, BATTLE.bigWake, true)], 0, 3);
  const thrown = throwOrb(b, at(0, 0));
  assert.equal(thrown.target.id, 'a');
  assert.deepEqual(thrown.hits.map((h) => [h.enemy.id, h.woke]), [['a', true], ['b', true], ['big', false]]);
  assert.equal(b.pouch, 2);
  assert.equal(b.enemies[2].wake, 0, 'con o xa khong bi lan');
  assert.equal(b.enemies[3].wake, BATTLE.orbDamage);
  assert.ok(BATTLE.orbDamage >= BATTLE.wake && BATTLE.orbDamage * 2 >= BATTLE.bigWake, 'mot tui nang phai du cho ca Bong Lang lon');
});

test('throwing with an empty pouch or with nobody in range costs nothing', () => {
  const empty = createBattle([createEnemy('e', 3, 0)]);
  assert.equal(throwOrb(empty, at(0, 0)), null);
  assert.equal(empty.enemies[0].wake, 0);
  const far = createBattle([createEnemy('e', BATTLE.orbRange + 3, 0)], 0, 2);
  assert.equal(throwOrb(far, at(0, 0)), null);
  assert.equal(far.pouch, 2, 'khong mat vien nao');
});

test('the pouch carries into the next journey and junk values become an empty pouch', () => {
  assert.equal(createBattle([], 0, 2).pouch, 2);
  for (const junk of [-1, 1.5, 99, NaN, '2', null, undefined, {}]) assert.equal(revivePouch(junk), 0);
  assert.equal(createBattle([], 0, 99).pouch, 0);
});

test('a whole camp can be woken with leaves alone: puzzles are never required', () => {
  const b = createBattle([createEnemy('a', 3, 0), createEnemy('b', -3, 0), createEnemy('c', 0, 3), createEnemy('big', 0, -3, BATTLE.bigWake, true)]);
  let seconds = 0;
  while (!allAwake(b) && seconds < 60) { leafAttack(b, at(0, 0)); stepBattle(b, at(0, 0), FRAME); seconds += FRAME; }
  assert.equal(allAwake(b), true);
  assert.ok(seconds < 15, `mat ${seconds.toFixed(1)} giay`);
  assert.equal(b.pouch, 0);
});

test('enemy wakes exactly once and is then ignored', () => {
  const b = createBattle([createEnemy('e', 2, 0, 4)], 0, 3);
  const thrown = throwOrb(b, at(0, 0));
  assert.equal(thrown.hits[0].woke, true);
  assert.equal(allAwake(b), true);
  assert.equal(nearestEnemy(b, at(0, 0), 99), null);
  assert.equal(throwOrb(b, at(0, 0)), null);
  assert.equal(leafAttack(b, at(0, 0)), null);
});

test('standing still in the warned circle costs one heart; stepping out avoids it', () => {
  const still = createBattle([createEnemy('e', 3, 0, 1000)]);
  let hits = 0;
  run(still, at(0, 0), BATTLE.attackEvery + BATTLE.telegraph + 0.2, (b) => { if (b.events.hit) hits++; });
  assert.equal(hits, 1);
  assert.equal(still.hearts, BATTLE.hearts - 1);

  const dodger = createBattle([createEnemy('e', 3, 0, 1000)]);
  let warnedAt = null, dodgeHits = 0;
  run(dodger, (t) => {
    if (warnedAt === null && dodger.enemies[0].attack.phase === 'telegraph') warnedAt = t;
    return warnedAt === null ? at(0, 0) : at(0, Math.min((t - warnedAt) * 5.2, 4)); // chay ra khoi vong voi toc do chay cua Mam
  }, BATTLE.attackEvery + BATTLE.telegraph + 0.2, (b) => { if (b.events.hit) dodgeHits++; });
  assert.notEqual(warnedAt, null, 'chua tung bao truoc');
  assert.equal(dodgeHits, 0);
});

test('one hit never takes more than 40% of the hearts', () => {
  const b = createBattle([createEnemy('a', 3, 0, 1000), createEnemy('b', -3, 0, 1000), createEnemy('c', 0, 3, 1000)]);
  let worst = 0, last = b.hearts;
  run(b, at(0, 0), 30, (bb) => { if (bb.events.hit && !bb.events.fainted) worst = Math.max(worst, last - bb.hearts); last = bb.hearts; });
  assert.ok(worst > 0, 'chua tung trung don');
  assert.ok(worst / BATTLE.hearts <= 0.4, `mot khung hinh mat ${worst} tim`);
});

test('losing all hearts revives on the spot with full hearts and slows later attacks', () => {
  const b = createBattle([createEnemy('e', 3, 0, 1000)]);
  const before = telegraphTime(b);
  let fainted = 0;
  run(b, at(0, 0), 40, (bb) => { if (bb.events.fainted) { fainted++; assert.equal(bb.hearts, BATTLE.hearts, 'tinh lai phai day tim'); } });
  assert.ok(fainted >= 1, 'chua nga lan nao');
  assert.equal(b.faints, fainted);
  assert.equal(createBattle([], b.faints).faints, fainted, 'luat thuong hai theo sang chuyen sau');
  assert.ok(telegraphTime(b) > before);
  b.faints = 999;
  assert.equal(telegraphTime(b), BATTLE.telegraph + BATTLE.mercyMax, 'thuong hai co tran');
});

test('enemies outside aggro range stay asleep and still', () => {
  const b = createBattle([createEnemy('e', BATTLE.aggroRange + 5, 0)]);
  run(b, at(0, 0), 10);
  assert.equal(b.enemies[0].x, BATTLE.aggroRange + 5);
  assert.equal(b.hearts, BATTLE.hearts);
});

test('enemies approach but keep their distance', () => {
  const b = createBattle([createEnemy('e', 7, 0, 1000)]);
  run(b, at(0, 0), 20);
  assert.ok(Math.abs(b.enemies[0].x - BATTLE.keepDistance) < 0.05, `x=${b.enemies[0].x}`);
});
