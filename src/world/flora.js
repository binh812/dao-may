import * as THREE from 'three';
import { C, TRS, blob, clamp, noise, rnd, smooth } from '../core/util.js';
import { B } from './island.js';
import { Q } from '../core/quality.js';
import { CRAGS, HOUSE, MILL, POND, R, height, inCrag, pathDist } from './layout.js';

// ---------------------------------------------------------------- trees, rocks, mushrooms, bushes
const PAL = {
  green: [C(0x0c5f48), C(0x62bd47)], green2: [C(0x117052), C(0x8fcf4c)],
  blossom: [C(0xd9508f), C(0xffc9df)], autumn: [C(0xd2551f), C(0xffc23f)], pine: [C(0x0a5a5c), C(0x46d39a)],
};
const LEAF = { pos: [], nor: [], uv: [], col: [], leaf: [], idx: [] };
const _lc = new THREE.Color();
function leafBlob(cx, cy, cz, br, sy, pal, tint, count, size) {
  for (let i = 0; i < count; i++) {
    let dx = rnd() * 2 - 1, dy = rnd() * 2 - 1, dz = rnd() * 2 - 1; const l = Math.hypot(dx, dy, dz) || 1; dx /= l; dy /= l; dz /= l;
    if (dy < -0.4) dy = -dy * 0.5;
    const rr = br * (0.84 + rnd() * 0.24), px = cx + dx * rr, py = cy + dy * rr * sy, pz = cz + dz * rr;
    _lc.copy(pal[0]).lerp(pal[1], smooth(0.2, 0.95, dy * 0.5 + 0.5)).multiplyScalar(tint * (0.9 + rnd() * 0.2));
    const nl = Math.hypot(dx, dy + 0.35, dz), sz = size * (0.75 + rnd() * 0.5), rot = rnd() * 6.283, base = LEAF.pos.length / 3;
    for (const [u, v] of [[0, 0], [1, 0], [1, 1], [0, 1]]) {
      LEAF.pos.push(px, py, pz); LEAF.nor.push(dx / nl, (dy + 0.35) / nl, dz / nl); LEAF.uv.push(u, v); LEAF.col.push(_lc.r, _lc.g, _lc.b); LEAF.leaf.push(sz, rot);
    }
    LEAF.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
}
function crown(list, pal, s) {
  for (const [cx, cy, cz, br, sy] of list) {
    const tint = 0.9 + rnd() * 0.2;
    B.add('foliage', blob(br * 0.8, 2, 0.12, 1.5 / s, rnd() * 50), TRS(cx, cy, cz, 0, rnd() * 6, 0, 1, sy, 1), (c, px, py) => c.copy(pal[0]).lerp(pal[1], smooth(cy - br * sy, cy + br * sy, py) * 0.7).multiplyScalar(tint * 0.85), { ao: false });
    leafBlob(cx, cy, cz, br, sy, pal, tint, Math.round(Q.leaves * br * br * (0.5 + sy * 0.5)), 0.66 * Math.sqrt(br));
  }
}
const blossomCrowns = [];
function tree(x, z, s, palName, yBase) {
  const y = yBase ?? height(x, z), lean = (rnd() - .5) * 0.3, pal = PAL[palName], pine = palName === 'pine', th = (pine ? 4.4 : 2.5) * s;
  const tg = new THREE.CylinderGeometry(0.11 * s, 0.3 * s, th, 8, 8), tp = tg.attributes.position;
  for (let i = 0; i < tp.count; i++) { const yy = tp.getY(i) / th + 0.5; tp.setX(i, tp.getX(i) + Math.sin(yy * 2.2) * lean * s); }
  tg.computeVertexNormals();
  B.add('clay', tg, TRS(x, y + th * 0.46, z, 0, rnd() * 6.28, 0), (c, px, py) => c.set(pine ? 0x6b4a44 : 0x8b5a3a).multiplyScalar(0.62 + 0.5 * clamp((py - y) / (2 * s), 0, 1)));
  const list = [];
  if (pine) {
    for (let k = 0; k < 5; k++) { const a = k * 2.4 + rnd(), off = (k === 4 ? 0 : 0.45) * s; list.push([x + Math.cos(a) * off, y + (1.8 + k * 0.72) * s, z + Math.sin(a) * off, (1.5 - k * 0.24) * s, 0.4]); }
  } else {
    const n = 7 + (rnd() * 3 | 0);
    for (let k = 0; k < n; k++) {
      const a = k / n * 6.283 + rnd(), rr = k === 0 ? 0 : (0.75 + rnd() * 0.5) * s, br = (k === 0 ? 1.4 : 0.85 + rnd() * 0.45) * s;
      list.push([x + Math.cos(a) * rr, y + 2.75 * s + (k === 0 ? 0.6 * s : (rnd() - 0.3) * 0.75 * s), z + Math.sin(a) * rr, br, 0.86]);
    }
  }
  crown(list, pal, s);
  if (palName === 'blossom') blossomCrowns.push(new THREE.Vector3(x, y + 2.9 * s, z));
}
const TREES = [[-9.8, -4.4, 1.1, 'blossom'], [1.0, -8.6, 0.9, 'pine'], [8.0, 9.0, 1.05, 'blossom'], [-9.8, 8.0, 1.1, 'green2'], [-11.6, 1.6, 0.85, 'pine'], [1.4, 11.4, 0.7, 'pine'], [-1.2, -5.2, 0.95, 'green2']];
TREES.forEach(t => tree(...t));
const rockColor = (c, px, py, pz, nx, ny) => c.set(0x8ea3c6).lerp(C(0x6680ad), clamp(noise.noise(px * .6, py * .6, pz * .6) + .5, 0, 1)).lerp(C(0xc4d0e6), smooth(0.15, 0.6, ny) * 0.7).lerp(C(0x5cc04a), smooth(0.62, 0.8, ny));
function facet(detail, amp, freq, seed, shape) {
  const g = new THREE.IcosahedronGeometry(1, detail), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (shape) { const hz = Math.hypot(x, z) || 1e-4, k = Math.pow(hz, 0.45) / hz; x *= k; z *= k; y = clamp(y * 1.15, -1, 0.9); }
    const k = 1 + amp * noise.noise(x * freq + seed, y * freq + seed * 1.7, z * freq - seed);
    p.setXYZ(i, x * k, y, z * k);
  }
  g.computeVertexNormals(); return g;
}
function rock(x, y, z, r) { B.add('clay', facet(1, 0.3, 1.3, rnd() * 40), TRS(x, y, z, rnd() * 0.4, rnd() * 6, rnd() * 0.4, r, r * (0.6 + rnd() * 0.25), r * (0.8 + rnd() * 0.3)), rockColor); }
for (const [x, z, r, h] of CRAGS) {
  const y0 = height(x, z) - 0.8;
  B.add('clay', facet(2, 0.2, 1.5, rnd() * 60, true), TRS(x, y0 + h * 0.5, z, 0, rnd() * 6, 0, r, h * 0.55, r), rockColor);
  for (let k = 0; k < 3; k++) { const a = rnd() * 6.283, d = r * (0.95 + rnd() * 0.25), bx = x + Math.cos(a) * d, bz = z + Math.sin(a) * d; if (Math.hypot(bx, bz) < R - 0.6) rock(bx, height(bx, bz) + 0.3, bz, 0.5 + rnd() * 0.7); }
  if (h > 5) tree(x + (rnd() - .5) * r * 0.5, z + (rnd() - .5) * r * 0.5, 0.6 + rnd() * 0.2, rnd() < 0.7 ? 'pine' : 'green', y0 + h * 0.97);
}
for (let i = 0; i < 26; i++) {
  const a = rnd() * 6.283, r = i < 9 ? POND.r + 0.5 + rnd() * 0.9 : 3 + rnd() * 9.5;
  const x = (i < 9 ? POND.x : 0) + Math.cos(a) * r, z = (i < 9 ? POND.z : 0) + Math.sin(a) * r;
  if (pathDist(x, z) < 0.9 || Math.hypot(x - HOUSE.x, z - HOUSE.z) < 3.2 || Math.hypot(x, z) > R - 1 || (x > 1 && x < 4.6 && z > 2 && z < 4) || inCrag(x, z)) continue;
  const s = 0.18 + rnd() * rnd() * 0.6; rock(x, height(x, z) + s * 0.2, z, s);
}
for (let i = 0; i < 16; i++) {
  const t = TREES[i % TREES.length], a = rnd() * 6.283, d = 0.7 + rnd() * 1.4, x = t[0] + Math.cos(a) * d, z = t[1] + Math.sin(a) * d;
  if (Math.hypot(x, z) > R - 1.2) continue;
  const y = height(x, z), s = 0.5 + rnd() * 0.8, tilt = (rnd() - .5) * 0.3, capCol = rnd() < 0.7 ? 0xe5404a : 0xffa63d;
  B.add('clay', new THREE.CylinderGeometry(0.06 * s, 0.09 * s, 0.3 * s, 10), TRS(x, y + 0.13 * s, z, tilt, 0, tilt), 0xfff2de);
  B.add('gloss', new THREE.SphereGeometry(0.2 * s, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), TRS(x, y + 0.26 * s, z, tilt, 0, tilt, 1, 0.85, 1), capCol);
  for (let k = 0; k < 5; k++) { const da = k * 1.25 + rnd(), dr = 0.11 * s, dy = 0.14 * s; B.add('clay', new THREE.SphereGeometry(0.028 * s, 8, 6), TRS(x + Math.cos(da) * dr, y + 0.26 * s + dy, z + Math.sin(da) * dr), 0xffffff, { ao: false }); }
}
for (let i = 0; i < 12; i++) {
  const a = rnd() * 6.283, r = 4 + rnd() * 8.4, x = Math.cos(a) * r, z = Math.sin(a) * r;
  if (pathDist(x, z) < 1.3 || Math.hypot(x - HOUSE.x, z - HOUSE.z) < 3.4 || Math.hypot(x - POND.x, z - POND.z) < POND.r + 1.2 || Math.hypot(x - MILL.x, z - MILL.z) < 5.6 || inCrag(x, z)) continue;
  const y = height(x, z), s = 0.45 + rnd() * 0.4;
  for (let k = 0; k < 3; k++) {
    const bx = x + (rnd() - .5) * s * 1.3, bz = z + (rnd() - .5) * s * 1.3, cy = y + s * 0.5;
    crown([[bx, cy, bz, s * (0.7 + rnd() * 0.4), 0.8]], PAL.green, 1);
  }
  for (let k = 0; k < 6; k++) B.add('gloss', new THREE.SphereGeometry(0.05, 10, 8), TRS(x + (rnd() - .5) * s * 1.6, y + s * (0.5 + rnd() * 0.6), z + (rnd() - .5) * s * 1.6), 0xff4f6d);
}

export { LEAF, blossomCrowns, tree };
