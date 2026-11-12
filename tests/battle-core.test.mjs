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

test('a wrong answer never costs hearts', () => {
  const b = createBattle([createEnemy('e', 3, 0, 1000)]);
  for (let i = 0; i < 20; i++) castSkill(b, at(0, 0), false);
  assert.equal(b.hearts, BATTLE.hearts);
  assert.equal(b.faints, 0);
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
  assert.ok(1 / BATTLE.hearts <= 0.4);
});

test('losing all hearts revives on the spot with full hearts and slows later attacks', () => {
  const b = createBattle([createEnemy('e', 3, 0, 1000)]);
  const before = telegraphTime(b);
  let fainted = 0;
  run(b, at(0, 0), 40, (bb) => { if (bb.events.fainted) fainted++; });
  assert.ok(fainted >= 1, 'chua nga lan nao');
  assert.ok(b.hearts >= 1 && b.hearts <= BATTLE.hearts);
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
