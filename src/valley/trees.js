// Cay tan la cua thung lung: moi cay la mot chum khoi tron to mau theo mang (dam o duoi, sang o dinh) nhu net co cham.
// Ve bang InstancedMesh; cay moc doc bo rao cac o ruong, thanh cum o dong co va le te quanh lang.
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { MATS, toon } from '../world/materials.js';
import { Q, tierName } from '../core/quality.js';
import { C, blob, noise, rnd, smooth } from '../core/util.js';
import { EDGE, MILL, VILLAGE, fieldAmount, fieldCoords, forestMask, heightAt, pathDistance } from './terrain.js';

const TREES_PER_FIELD = 1 / 7;                 // so cay tan la = Q.field x he so nay
const HEDGE_SHARE = 0.5, CLUMP_SHARE = 0.35;   // phan con lai la cay le
const HEDGE_EDGE = 0.44;                       // phan le cua toa do o ruong tu day tro len la bo rao
const CLEAR = { path: 4.5, spawn: 16, village: VILLAGE.r * 0.78, mill: 12 };
const TRUNK = { radius: 0.12, height: 0.6 };
const SHAPES = [                               // [so khoi tan, ban kinh tan, do cao tan, do xoe ngang]
  { blobs: 6, radius: 0.70, lift: 0.95, spread: 0.62 },
  { blobs: 5, radius: 0.56, lift: 1.25, spread: 0.40 },
];
const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _e = new THREE.Euler(), _c = new THREE.Color();

function paint(geometry, colorAt) {
  // gop dinh trung nhau de phap tuyen muot: tan cay thanh mang sang toi tron nhu net co, khong lo mat da giac
  geometry.deleteAttribute('uv'); geometry.deleteAttribute('normal');
  const flat = mergeVertices(geometry); flat.computeVertexNormals();
  const p = flat.attributes.position, colors = new Float32Array(p.count * 3), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) { colorAt(c, p.getX(i), p.getY(i), p.getZ(i)); colors.set([c.r, c.g, c.b], i * 3); }
  flat.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return flat;
}

function treeGeometry(shape, seed) {
  const dark = C(0x1c6a3a), mid = C(0x3d9a3e), light = C(0x86c94c), bark = C(0x6b4a3a), parts = [];
  parts.push(paint(new THREE.CylinderGeometry(TRUNK.radius, TRUNK.radius * 1.5, TRUNK.height, 6).translate(0, TRUNK.height / 2, 0), (c) => c.copy(bark)));
  const top = shape.lift + shape.radius, bottom = shape.lift - shape.radius;
  for (let b = 0; b < shape.blobs; b++) {
    const angle = b / (shape.blobs - 1) * Math.PI * 2 + seed, off = b === 0 ? 0 : shape.spread, r = shape.radius * (b === 0 ? 1 : 0.72 + 0.2 * Math.sin(seed + b * 2.4));
    const g = blob(r, 1, 0.2, 1.6, seed * 7 + b * 3).translate(Math.cos(angle) * off, shape.lift + (b === 0 ? 0.18 : -0.12 + 0.1 * Math.cos(b * 1.9)), Math.sin(angle) * off);
    parts.push(paint(g, (c, x, y, z) => {
      const h = smooth(bottom, top, y + noise.noise(x * 4 + seed, y * 4, z * 4) * 0.22);     // cham mau lech nhau nhu net co
      if (h < 0.45) c.copy(dark).lerp(mid, smooth(0.2, 0.45, h)); else c.copy(mid).lerp(light, smooth(0.55, 0.85, h));
    }));
  }
  return mergeGeometries(parts, false);
}

/** Chon cho moc cay; tra ve danh sach { x, z, s, shape }. */
function placements(total) {
  const spots = [];
  const free = (x, z) => Math.hypot(x, z) > CLEAR.spawn && Math.hypot(x, z) < EDGE + 250 && pathDistance(x, z) > CLEAR.path
    && Math.hypot(x - VILLAGE.x, z - VILLAGE.z) > CLEAR.village && Math.hypot(x - MILL.x, z - MILL.z) > CLEAR.mill && forestMask(x, z) < 0.62;
  const push = (x, z, s) => { if (free(x, z)) spots.push({ x, z, s, shape: rnd() < 0.7 ? 0 : 1 }); };
  // doc bo rao cac o ruong
  for (let guard = 0, want = total * HEDGE_SHARE; spots.length < want && guard < total * 60; guard++) {
    const a = rnd() * Math.PI * 2, r = 70 + Math.sqrt(rnd()) * 400, x = VILLAGE.x + Math.cos(a) * r, z = VILLAGE.z + Math.sin(a) * r;
    if (fieldAmount(x, z) < 0.5) continue;
    const [u, v] = fieldCoords(x, z), edge = Math.max(Math.abs(u - Math.floor(u) - 0.5), Math.abs(v - Math.floor(v) - 0.5));
    if (edge > HEDGE_EDGE) push(x, z, 1.9 + rnd() * 1.6);
  }
  // cum cay o dong co
  for (let guard = 0, want = total * (HEDGE_SHARE + CLUMP_SHARE); spots.length < want && guard < total; guard++) {
    const a = rnd() * Math.PI * 2, r = 40 + Math.sqrt(rnd()) * 900, cx = Math.cos(a) * r, cz = Math.sin(a) * r;
    for (let t = 0, count = 3 + Math.floor(rnd() * 6); t < count; t++) push(cx + (rnd() - .5) * 30, cz + (rnd() - .5) * 30, 2.8 + rnd() * 2.6);
  }
  // cay le va vanh cay quanh lang
  for (let guard = 0; spots.length < total && guard < total * 20; guard++) {
    if (rnd() < 0.35) { const a = rnd() * Math.PI * 2, r = VILLAGE.r * (0.8 + rnd() * 0.5); push(VILLAGE.x + Math.cos(a) * r, VILLAGE.z + Math.sin(a) * r, 2.6 + rnd() * 2); }
    else { const a = rnd() * Math.PI * 2, r = 30 + Math.sqrt(rnd()) * 1000; push(Math.cos(a) * r, Math.sin(a) * r, 3 + rnd() * 3); }
  }
  return spots;
}

/** Dung cay tan la; tra ve vat can (than cay) trong vung di duoc. */
export function createTrees(scene) {
  const total = Math.round(Q.field * TREES_PER_FIELD), spots = placements(total);
  const material = toon(); material.userData.patch = MATS.foliage.userData.patch;       // la rung rinh theo gio nhu tan cay tren dao
  SHAPES.forEach((shape, index) => {
    const mine = spots.filter((spot) => spot.shape === index), mesh = new THREE.InstancedMesh(treeGeometry(shape, 1.3 + index * 4.1), material, mine.length);
    mine.forEach((spot, i) => {
      _m.compose(_p.set(spot.x, heightAt(spot.x, spot.z) - 0.25, spot.z), _q.setFromEuler(_e.set(0, rnd() * 6.283, 0)), _s.set(spot.s * (0.9 + rnd() * 0.3), spot.s, spot.s * (0.9 + rnd() * 0.3)));
      mesh.setMatrixAt(i, _m);
      const warm = rnd(); mesh.setColorAt(i, _c.setRGB(0.86 + warm * 0.34, 0.92 + rnd() * 0.16, 0.80 + rnd() * 0.2));
    });
    mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.frustumCulled = false; mesh.castShadow = tierName === 'high'; mesh.receiveShadow = false;
    scene.add(mesh);
  });
  return spots.filter((spot) => Math.hypot(spot.x, spot.z) < EDGE + 50).map((spot) => ({ x: spot.x, z: spot.z, r: TRUNK.radius * 2.6 * spot.s }));
}
