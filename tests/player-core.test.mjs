import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TUNING, createPlayer, stepPlayer } from '../src/game/player-core.js';

const FRAME = 1 / 60;
const flat = (over = {}) => ({ heightAt: () => 0, colliders: [], safeRadius: 1000, ...over });
const idle = { moveX: 0, moveZ: 0, jump: false };

/** Runs fixed frames; returns per-frame snapshots of what the callback collects. */
function run(state, world, seconds, inputAt, onFrame) {
  const frames = Math.round(seconds / FRAME);
  for (let i = 0; i < frames; i++) {
    stepPlayer(state, typeof inputAt === 'function' ? inputAt(i * FRAME, state) : inputAt, FRAME, world);
    if (onFrame) onFrame(state, i * FRAME);
  }
  return state;
}

test('runs at run speed', () => {
  const world = flat(), s = createPlayer(0, 0, world);
  run(s, world, 1, { moveX: 1, moveZ: 0, jump: false });
  assert.ok(s.x > 4 && s.x < 5.3, `x=${s.x}`);
  assert.equal(s.y, 0);
  assert.equal(s.grounded, true);
});

test('jump apex', () => {
  const world = flat(), s = createPlayer(0, 0, world);
  let top = 0;
  run(s, world, 1.2, (t) => ({ moveX: 0, moveZ: 0, jump: t < 0.1 }), (st) => { top = Math.max(top, st.y); });
  assert.ok(top > 1.3 && top < 1.8, `apex=${top}`);
});

test('holding jump does not auto-repeat', () => {
  const world = flat(), s = createPlayer(0, 0, world);
  let jumps = 0;
  run(s, world, 3, { moveX: 0, moveZ: 0, jump: true }, (st) => { if (st.events.jumped) jumps++; });
  assert.equal(jumps, 1);
});

test('glide caps fall speed', () => {
  const world = flat({ heightAt: () => -1000 });
  const gliding = createPlayer(0, 0, world); gliding.y = 10; gliding.grounded = false;
  run(gliding, world, 1, { moveX: 0, moveZ: 0, jump: true });
  assert.equal(gliding.vy, -TUNING.glideFall);
  assert.equal(gliding.gliding, true);
  const falling = createPlayer(0, 0, world); falling.y = 10; falling.grounded = false;
  run(falling, world, 1, idle);
  assert.ok(falling.vy < -10, `vy=${falling.vy}`);
});

test('wall blocks', () => {
  const world = flat({ heightAt: (x) => (x > 2 ? 3 : 0) }), s = createPlayer(0, 0, world);
  run(s, world, 2, { moveX: 1, moveZ: 0, jump: false });
  assert.ok(s.x <= 2 - TUNING.radius + 0.05, `x=${s.x}`);
});

test('small step is climbed', () => {
  const world = flat({ heightAt: (x) => (x > 2 ? 0.4 : 0) }), s = createPlayer(0, 0, world);
  run(s, world, 2, { moveX: 1, moveZ: 0, jump: false });
  assert.ok(s.x > 2.5, `x=${s.x}`);
  assert.equal(s.y, 0.4);
});

test('ledge 0.8 needs a jump', () => {
  const world = flat({ heightAt: (x) => (x > 2 ? 0.8 : 0) });
  const walker = createPlayer(0, 0, world);
  run(walker, world, 2, { moveX: 1, moveZ: 0, jump: false });
  assert.ok(walker.x <= 2, `walker x=${walker.x}`);
  const jumper = createPlayer(0.6, 0, world);
  run(jumper, world, 2, (t) => ({ moveX: 1, moveZ: 0, jump: t < 0.3 }));
  assert.ok(jumper.x > 2, `jumper x=${jumper.x}`);
  assert.equal(jumper.y, 0.8);
});

test('holding jump while walking off a ledge does not glide', () => {
  const world = flat({ heightAt: (x) => (x < 1 ? 5 : 0) }), s = createPlayer(0, 0, world);
  let glided = false, jumps = 0;
  run(s, world, 3, { moveX: 1, moveZ: 0, jump: true }, (st) => { if (st.gliding) glided = true; if (st.events.jumped) jumps++; });
  assert.equal(jumps, 1, 'only the initial jump');
  // sau cu nhay dau, nut van giu suot: roi khoi mep khong duoc tu luon
  const walker = createPlayer(0, 0, world); walker.jumpLatch = true;
  let walkerGlided = false;
  run(walker, world, 3, { moveX: 1, moveZ: 0, jump: true }, (st) => { if (st.gliding) walkerGlided = true; });
  assert.equal(walkerGlided, false);
  assert.equal(glided, false);
});

test('spawning with no ground under it fails loudly', () => {
  const world = flat({ heightAt: () => -Infinity });
  assert.throws(() => createPlayer(0, 0, world), RangeError);
});

test('collider pushes out', () => {
  const world = flat({ colliders: [{ x: 3, z: 0, r: 1 }] }), s = createPlayer(0, 0, world);
  run(s, world, 2, { moveX: 1, moveZ: 0, jump: false });
  assert.ok(Math.hypot(s.x - 3, s.z) >= 1 + TUNING.radius - 0.01, `dist=${Math.hypot(s.x - 3, s.z)}`);
});

test('spawn inside collider is pushed out', () => {
  const world = flat({ colliders: [{ x: 3, z: 0, r: 1 }] }), s = createPlayer(3, 0, world);
  stepPlayer(s, idle, FRAME, world);
  assert.ok(Math.hypot(s.x - 3, s.z) >= 1 + TUNING.radius - 0.01);
});

test('falling off respawns on safe ground', () => {
  const world = flat({ heightAt: (x) => (x < 5 ? 0 : -Infinity), safeRadius: 4 }), s = createPlayer(0, 0, world);
  let respawns = 0;
  run(s, world, 6, { moveX: 1, moveZ: 0, jump: false }, (st) => { if (st.events.respawned) respawns++; });
  assert.ok(respawns >= 1, 'never respawned');
  run(s, world, 1, idle);
  assert.equal(s.grounded, true);
  assert.ok(s.x < 5, `x=${s.x}`);
});

test('big dt does not tunnel', () => {
  // Vach mong 0,5 m: mot buoc lon duy nhat se nhay qua no neu khong chia buoc con.
  const world = flat({ heightAt: (x) => (x > 2 && x < 2.5 ? 3 : 0) }), s = createPlayer(1.4, 0, world);
  s.vx = TUNING.runSpeed;
  stepPlayer(s, { moveX: 1, moveZ: 0, jump: false }, 0.5, world);
  assert.ok(s.x <= 2, `x=${s.x}`);
});

test('coyote jump', () => {
  const world = flat({ heightAt: (x) => (x < 1 ? 1 : 0) }), s = createPlayer(0, 0, world);
  let leftAt = null, jumped = false;
  run(s, world, 2, (t, st) => {
    if (leftAt === null && !st.grounded) leftAt = t;
    return { moveX: 1, moveZ: 0, jump: leftAt !== null && t >= leftAt + 0.08 && t < leftAt + 0.2 };
  }, (st) => { if (st.events.jumped) jumped = true; });
  assert.notEqual(leftAt, null, 'never left the ledge');
  assert.equal(jumped, true);
});
