import { clamp, fbm, lerp, smooth } from '../core/util.js';

// ---------------------------------------------------------------- world layout
const R = 14, WATER_Y = -0.38;
const POND = { x: 5.2, z: 3.2, r: 3.3 };
const HOUSE = { x: -5, z: -3.5, ry: 0.45 };
const MILL = { x: 6, z: -6 };
const CRAGS = [[10.6, 1.6, 3.1, 7.6], [11.8, 5.2, 2.5, 5.4], [9.9, -2.0, 2.3, 4.4], [12.2, -0.8, 2.7, 9.2], [-6.5, -10.6, 3.0, 8.0], [-2.9, -11.6, 2.6, 6.0], [-9.6, -8.6, 2.4, 5.0], [-4.6, -12.2, 2.9, 10.5]];
const inCrag = (x, z) => CRAGS.some(c => Math.hypot(x - c[0], z - c[1]) < c[2] * 0.95) || streamInfo(x, z).d < 0.85;
const TERRACE_STEP = 0.8;
function terrace(x, z) {
  const d = Math.hypot(x - MILL.x, z - MILL.z), b = 3.2 * smooth(5.4, 1.3, d), v = b / TERRACE_STEP, lv = Math.floor(v), ramp = smooth(0.7, 1.0, v - lv);
  return { h: (lv + ramp) * TERRACE_STEP, wall: clamp(ramp * (1 - ramp) * 4, 0, 1), level: lv, flat: ramp < 0.02 && d < 5.3 };
}
const PATH = [[HOUSE.x + Math.sin(HOUSE.ry) * 2.0, HOUSE.z + Math.cos(HOUSE.ry) * 2.0], [-2.6, 1.2], [-0.4, 2.6], [1.5, 2.7]];
const STREAM = [[5.9, 5.4], [5.7, 8.0], [4.8, 10.4], [4.3, 12.2], [4.2, 13.2]];
const STREAM_LEN = STREAM.slice(1).reduce((a, p, i) => a + Math.hypot(p[0] - STREAM[i][0], p[1] - STREAM[i][1]), 0);
function streamInfo(x, z) {
  let best = 1e9, bt = 0, acc = 0;
  for (let i = 0; i < STREAM.length - 1; i++) {
    const [ax, az] = STREAM[i], [bx, bz] = STREAM[i + 1], dx = bx - ax, dz = bz - az, len = Math.hypot(dx, dz);
    const t = clamp(((x - ax) * dx + (z - az) * dz) / (len * len), 0, 1), d = Math.hypot(x - ax - dx * t, z - az - dz * t);
    if (d < best) { best = d; bt = (acc + t * len) / STREAM_LEN; }
    acc += len;
  }
  return { d: best, t: bt };
}
const streamBed = (t) => WATER_Y - 0.28 - t * 0.9;
function pathDist(x, z) {
  let best = 1e9;
  for (let i = 0; i < PATH.length - 1; i++) {
    const [ax, az] = PATH[i], [bx, bz] = PATH[i + 1], dx = bx - ax, dz = bz - az;
    const t = clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz), 0, 1);
    best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return best;
}
function height(x, z) {
  const r = Math.hypot(x, z);
  let h = fbm(x * .09, z * .09) * 2.4 + 0.25 * fbm(x * .3 + 9, z * .3);
  h = lerp(h, 0.35, smooth(6, 2.6, Math.hypot(x - HOUSE.x, z - HOUSE.z)));
  h = lerp(h, 0.3, smooth(6.6, 5.0, Math.hypot(x - MILL.x, z - MILL.z))) + terrace(x, z).h;
  const dp = Math.hypot(x - POND.x, z - POND.z);
  h = lerp(h, 0.05, smooth(POND.r + 3.2, POND.r + 0.2, dp));
  h -= smooth(POND.r + 1.2, POND.r - 1.4, dp) * 1.35;
  const si = streamInfo(x, z); h = lerp(h, streamBed(si.t), smooth(1.35, 0.4, si.d));
  const e = smooth(R - 2.6, R, r);
  h -= e * e * 1.3;
  return h;
}

export { CRAGS, HOUSE, MILL, PATH, POND, R, STREAM, WATER_Y, height, inCrag, pathDist, terrace };
