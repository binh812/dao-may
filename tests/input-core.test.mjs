import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stickFromDrag, cameraRelative, steerYaw } from '../src/game/input-core.js';

const near = (actual, expected, msg) => assert.ok(Math.abs(actual - expected) < 1e-9, `${msg}: ${actual} != ${expected}`);

test('dead zone returns zero', () => {
  assert.deepEqual(stickFromDrag(5, 0), { x: 0, y: 0 });
});

test('clamps to unit length', () => {
  const s = stickFromDrag(500, 0);
  near(s.x, 1, 'x'); near(s.y, 0, 'y');
  const d = stickFromDrag(400, -400);
  near(Math.hypot(d.x, d.y), 1, 'diagonal length');
});

test('up is positive y', () => {
  near(stickFromDrag(0, -56).y, 1, 'y');
});

test('dead zone is rescaled, not a jump', () => {
  const justOutside = stickFromDrag(56 * 0.16, 0);
  assert.ok(justOutside.x > 0 && justOutside.x < 0.05, `x=${justOutside.x}`);
});

test('yaw 0 pushes away from camera', () => {
  const m = cameraRelative({ x: 0, y: 1 }, 0);
  near(m.x, 0, 'x'); near(m.z, -1, 'z');
});

test('yaw 90 degrees rotates', () => {
  const m = cameraRelative({ x: 0, y: 1 }, Math.PI / 2);
  near(m.x, -1, 'x'); near(m.z, 0, 'z');
});

test('steering is bounded and only follows the stick', () => {
  near(steerYaw({ x: 1, y: 0 }, 0.5, 0.8), -0.4, 'full right for half a second');
  near(steerYaw({ x: 0, y: 1 }, 0.5, 0.8), 0, 'straight ahead never turns');
  near(steerYaw({ x: 0, y: -1 }, 0.5, 0.8), 0, 'straight back never turns');
  // 10 s of full sideways stick turns exactly rate * time, independent of the player's heading
  let yaw = 0; for (let i = 0; i < 600; i++) yaw += steerYaw({ x: -1, y: 0 }, 1 / 60, 0.8);
  near(yaw, 8, 'ten seconds left');
});

test('right is right', () => {
  const m = cameraRelative({ x: 1, y: 0 }, 0);
  near(m.x, 1, 'x'); near(m.z, 0, 'z');
});
