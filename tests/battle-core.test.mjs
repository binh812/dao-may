import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BATTLE, allAwake, castSkill, createBattle, createEnemy, leafAttack, nearestEnemy, stepBattle, telegraphTime } from '../src/game/battle-core.js';

const FRAME = 1 / 60;
const at = (x, z) => ({ x, z });
function run(b, player, seconds, onFrame) {
  for (let i = 0, n = Math.round(seconds / FRAME); i < n; i++) { stepBattle(b, typeof player === 'function' ? player(i * FRAME) : player, FRAME); if (onFrame) onFrame(b); }
}

test('leaf attack hits the nearest sleeping enemy and respects its cooldown', () => {
  const b = createBattle([createEnemy('far', 5, 0), createEnemy('near', 2, 0)]);
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

test('correct answers build combo tiers; a wrong one resets and still lands a weak hit', () => {
  const b = createBattle([createEnemy('e', 3, 0, 1000)]);
  const hits = [true, true, true, true].map((ok) => castSkill(b, at(0, 0), ok));
  assert.deepEqual(hits.map((h) => h.tier), [1, 2, 3, 3]);
  assert.deepEqual(hits.map((h) => h.damage), [4, 6, 8, 8]);
  const miss = castSkill(b, at(0, 0), false);
  assert.equal(miss.damage, BATTLE.weakSkillDamage);
  assert.equal(miss.tier, 0);
  assert.equal(b.combo, 0);
  assert.equal(castSkill(b, at(0, 0), true).tier, 1, 'combo bat dau lai tu bac 1');
});

test('wrong answers never cost hearts, even with the fight running between them', () => {
  // dich nam ngoai tam duoi theo (khong tan cong) nhung trong tam chieu: moi thay doi cua tim chi co the den tu cau tra loi
  const b = createBattle([createEnemy('e', BATTLE.aggroRange + 0.5, 0, 1000)]);
  assert.ok(BATTLE.aggroRange + 0.5 <= BATTLE.skillRange);
  for (let i = 0; i < 30; i++) { assert.notEqual(castSkill(b, at(0, 0), false), null); run(b, at(0, 0), 1); }
  assert.equal(b.hearts, BATTLE.hearts);
  assert.equal(b.faints, 0);
  assert.equal(b.enemies[0].wake, 30 * BATTLE.weakSkillDamage);
});

test('casting with no enemy in range changes nothing, including the combo', () => {
  const b = createBattle([createEnemy('e', BATTLE.skillRange + 3, 0, 1000)]);
  b.combo = 2;
  assert.equal(castSkill(b, at(0, 0), true), null);
  assert.equal(castSkill(b, at(0, 0), false), null);
  assert.equal(b.combo, 2);
  assert.equal(b.enemies[0].wake, 0);
});

test('enemy wakes exactly once and is then ignored', () => {
  const b = createBattle([createEnemy('e', 2, 0, 4)]);
  const hit = castSkill(b, at(0, 0), true);
  assert.equal(hit.woke, true);
  assert.equal(allAwake(b), true);
  assert.equal(nearestEnemy(b, at(0, 0), 99), null);
  assert.equal(castSkill(b, at(0, 0), true), null);
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
  run(b, at(0, 0), 40, (bb) => { if (bb.events.fainted) { fainted++; assert.equal(bb.hearts, BATTLE.hearts, 'tinh lai phai day tim'); assert.equal(bb.combo, 0); } });
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
