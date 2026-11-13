// Thung lung: dia hinh rong 2,4 km (luoi 10 m) + vanh doi nui xa (luoi tho). Mot ham do cao la nguon su that;
// luoi, ban do do cao cho co va mat dat cua nhan vat deu lay tu cung mot mang.
import * as THREE from 'three';
import { toon } from '../world/materials.js';
import { C, fbm, lerp, smooth } from '../core/util.js';

export const SIZE = 2400;                      // canh vung dia hinh chi tiet (m)
export const CELLS = 240;                      // so o luoi moi canh (10 m mot o)
export const EDGE = 1050;                      // ban kinh vung duoc di
export const WALL = 1e6;                       // do cao tra ve cho vung khong duoc vao (nguoi choi bi chan lai)
export const VILLAGE = { x: 360, z: -280, r: 85 };
export const MILL = { x: 470, z: -150 };
const HALF = SIZE / 2, STEP = SIZE / CELLS, ROW = CELLS + 1;
const FAR_SIZE = 11000, FAR_CELLS = 110, FAR_SINK = 14;

function rawHeight(x, z) {
  const r = Math.hypot(x, z), dv = Math.hypot(x - VILLAGE.x, z - VILLAGE.z);
  let h = fbm(x / 520, z / 520, 4) * 60 + fbm(x / 140 + 31, z / 140, 3) * 8;
  h += 26 * Math.exp(-(r * r) / (170 * 170));                 // doi co noi bat dau, nhin xuong thung lung
  h -= 22 * Math.exp(-(dv * dv) / (300 * 300));               // long thung lung quanh lang
  h += Math.pow(smooth(620, 1500, r), 1.4) * 80;              // vanh doi bao quanh (thap, de troi rong)
  h += smooth(2300, 4600, r) * 110;                           // chan nui xa
  return h;
}
const VILLAGE_LEVEL = rawHeight(VILLAGE.x, VILLAGE.z), MILL_LEVEL = rawHeight(MILL.x, MILL.z) + 3;

/** Do cao giai tich tai (x, z); dung de dat vat the. Mat dat nguoi choi dung la groundAt (khop voi luoi). */
export function heightAt(x, z) {
  let h = rawHeight(x, z);
  h = lerp(h, VILLAGE_LEVEL, smooth(VILLAGE.r * 1.6, VILLAGE.r * 0.7, Math.hypot(x - VILLAGE.x, z - VILLAGE.z)));
  return lerp(h, MILL_LEVEL, smooth(40, 14, Math.hypot(x - MILL.x, z - MILL.z)));
}

/** 0..1: cho nao la rung thong. Tranh doi co luc dau va lang. */
export function forestMask(x, z) {
  const r = Math.hypot(x, z), dv = Math.hypot(x - VILLAGE.x, z - VILLAGE.z);
  return (fbm(x / 330 + 80, z / 330 + 20, 3) * 0.5 + 0.5) * smooth(110, 240, r) * smooth(170, 330, dv) + smooth(900, 1500, r) * 0.25;
}

const PALETTE = { deep: C(0x4ea63a), meadow: C(0x6cc23c), light: C(0x9bd94a), field: C(0xc9d84e), wheat: C(0xe2cf6a), hedge: C(0x2f8040), forest: C(0x1f6b45), far: C(0x5fae7c), rock: C(0x8f9aa0), snow: C(0xf6f9ff) };
const FIELD_TINTS = [PALETTE.light, PALETTE.field, PALETTE.wheat, PALETTE.deep, PALETTE.meadow];
const hash2 = (i, j) => { const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return s - Math.floor(s); };

function groundColor(out, x, z, h) {
  const r = Math.hypot(x, z), t = fbm(x / 260 + 5, z / 260, 3) * 0.5 + 0.5;
  out.copy(PALETTE.deep).lerp(PALETTE.meadow, smooth(0.25, 0.5, t)).lerp(PALETTE.light, smooth(0.5, 0.8, t));
  // ruong quanh lang: cac o chu nhat xoay nghieng, co bo rao sam mau
  const dv = Math.hypot(x - VILLAGE.x, z - VILLAGE.z), fields = smooth(60, 110, dv) * smooth(460, 330, dv);
  if (fields > 0) {
    const u = (x * 0.88 + z * 0.48) / 70, v = (-x * 0.48 + z * 0.88) / 46, edge = Math.max(Math.abs(u - Math.floor(u) - 0.5), Math.abs(v - Math.floor(v) - 0.5));
    out.lerp(FIELD_TINTS[Math.floor(hash2(Math.floor(u), Math.floor(v)) * FIELD_TINTS.length)], fields * 0.85);
    out.lerp(PALETTE.hedge, fields * smooth(0.44, 0.48, edge) * 0.6);
  }
  out.lerp(PALETTE.forest, smooth(0.5, 0.6, forestMask(x, z)));
  out.lerp(PALETTE.far, smooth(500, 1500, r) * 0.55);
  return out;
}

function buildGrid(size, cells, sink) {
  const row = cells + 1, half = size / 2, step = size / cells, heights = new Float32Array(row * row);
  const pos = new Float32Array(row * row * 3), col = new Float32Array(row * row * 3), idx = [], c = new THREE.Color();
  for (let j = 0; j < row; j++) for (let i = 0; i < row; i++) {
    const k = j * row + i, x = -half + i * step, z = -half + j * step, h = heightAt(x, z);
    heights[k] = h; pos.set([x, h - sink, z], k * 3);
    groundColor(c, x, z, h); col.set([c.r, c.g, c.b], k * 3);
  }
  for (let j = 0; j < cells; j++) for (let i = 0; i < cells; i++) {
    const a = j * row + i, b = a + 1, cc = a + row, d = cc + 1;
    idx.push(a, cc, b, b, cc, d);                                  // duong cheo b-c: groundAt ben duoi phai dung cung cach chia
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return { geometry: g, heights };
}

const near = buildGrid(SIZE, CELLS, 0), far = buildGrid(FAR_SIZE, FAR_CELLS, FAR_SINK);
const HEIGHTS = near.heights;

/** Mat dat nguoi choi dung: noi suy dung theo tam giac cua luoi; ngoai EDGE la tuong chan. */
export function groundAt(x, z) {
  if (Math.hypot(x, z) > EDGE) return WALL;
  const fx = (x + HALF) / STEP, fz = (z + HALF) / STEP, i = Math.min(Math.floor(fx), CELLS - 1), j = Math.min(Math.floor(fz), CELLS - 1), tx = fx - i, tz = fz - j;
  const a = HEIGHTS[j * ROW + i], b = HEIGHTS[j * ROW + i + 1], c = HEIGHTS[(j + 1) * ROW + i], d = HEIGHTS[(j + 1) * ROW + i + 1];
  return tx + tz <= 1 ? a + (b - a) * tx + (c - a) * tz : d + (c - d) * (1 - tx) + (b - d) * (1 - tz);
}

/** Ban do do cao cho shader co: R16F, loc tuyen tinh (co san trong WebGL2), texel nam dung tai dinh luoi. */
export const heightTexture = (() => {
  const data = new Uint16Array(ROW * ROW);
  for (let k = 0; k < data.length; k++) data[k] = THREE.DataUtils.toHalfFloat(HEIGHTS[k]);
  const t = new THREE.DataTexture(data, ROW, ROW, THREE.RedFormat, THREE.HalfFloatType);
  t.minFilter = t.magFilter = THREE.LinearFilter; t.needsUpdate = true;
  return t;
})();

export function createTerrain(scene) {
  const material = toon();
  const nearMesh = new THREE.Mesh(near.geometry, material), farMesh = new THREE.Mesh(far.geometry, toon({ flatShading: true }));
  nearMesh.receiveShadow = true; nearMesh.frustumCulled = false; farMesh.frustumCulled = false;
  scene.add(nearMesh, farMesh);
  return { nearMesh, farMesh };
}
