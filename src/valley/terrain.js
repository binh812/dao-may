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
// Duong mon dat: tu doi co xuong lang, nhanh re sang coi xay, nhanh ra bia rung. Moi doan la [x1, z1, x2, z2].
export const PATH_SEGMENTS = [[0, 0, 95, -70], [95, -70, 205, -150], [205, -150, 292, -208], [292, -208, 360, -280], [292, -208, 440, -185], [440, -185, 470, -150], [0, 0, 150, 185]];
const PATH_WOBBLE = 4, PATH_WOBBLE_X = 0.045, PATH_WOBBLE_Z = 0.05;   // duong uon luon nhe thay vi thang tap
// O ruong quanh lang: he truc xoay nghieng, moi o 70 x 46 m
const FIELD_AXIS = [0.88, 0.48], FIELD_CELL = [70, 46], FIELD_NEAR = [60, 110], FIELD_FAR = [460, 330];
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

/** Khoang cach (m) tu (x, z) toi duong mon gan nhat. Shader dung cung cong thuc (PATH_GLSL). */
export function pathDistance(x, z) {
  const px = x + Math.sin(z * PATH_WOBBLE_X) * PATH_WOBBLE, pz = z + Math.sin(x * PATH_WOBBLE_Z) * PATH_WOBBLE;
  let best = Infinity;
  for (const [ax, az, bx, bz] of PATH_SEGMENTS) {
    const ux = bx - ax, uz = bz - az, t = Math.min(Math.max(((px - ax) * ux + (pz - az) * uz) / (ux * ux + uz * uz), 0), 1);
    best = Math.min(best, Math.hypot(px - ax - ux * t, pz - az - uz * t));
  }
  return best;
}
const glslFloat = (n) => (Number.isInteger(n) ? n + '.' : String(n));
export const PATH_GLSL = /* glsl */`
  float pathSegment(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a, ba = b - a; return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0., 1.)); }
  float pathDist(vec2 p){
    p += vec2(sin(p.y * ${PATH_WOBBLE_X}), sin(p.x * ${PATH_WOBBLE_Z})) * ${glslFloat(PATH_WOBBLE)};
    float d = 1e5;
${PATH_SEGMENTS.map(([ax, az, bx, bz]) => `    d = min(d, pathSegment(p, vec2(${glslFloat(ax)}, ${glslFloat(az)}), vec2(${glslFloat(bx)}, ${glslFloat(bz)})));`).join('\n')}
    return d;
  }`;

/** Toa do o ruong cua (x, z): u, v tinh theo so o; mep o la noi phan le gan 0 hoac 1 (bo rao). */
export function fieldCoords(x, z) {
  return [(x * FIELD_AXIS[0] + z * FIELD_AXIS[1]) / FIELD_CELL[0], (-x * FIELD_AXIS[1] + z * FIELD_AXIS[0]) / FIELD_CELL[1]];
}
/** 0..1: muc do "la ruong" tai (x, z): vanh quanh lang, khong tinh rung. */
export function fieldAmount(x, z) {
  const dv = Math.hypot(x - VILLAGE.x, z - VILLAGE.z);
  return smooth(FIELD_NEAR[0], FIELD_NEAR[1], dv) * smooth(FIELD_FAR[0], FIELD_FAR[1], dv) * (1 - smooth(0.5, 0.6, forestMask(x, z)));
}

/** 0..1: cho nao la rung thong. Tranh doi co luc dau va lang. */
export function forestMask(x, z) {
  const r = Math.hypot(x, z), dv = Math.hypot(x - VILLAGE.x, z - VILLAGE.z);
  return (fbm(x / 330 + 80, z / 330 + 20, 3) * 0.5 + 0.5) * smooth(110, 240, r) * smooth(170, 330, dv) + smooth(900, 1500, r) * 0.25;
}

const PALETTE = { deep: C(0x4ea63a), meadow: C(0x6cc23c), light: C(0x9bd94a), field: C(0xc9d84e), wheat: C(0xe2cf6a), hedge: C(0x2f8040), forest: C(0x1f6b45), far: C(0x5fae7c), rock: C(0x8f9aa0), snow: C(0xf6f9ff) };

function groundColor(out, x, z, h) {
  const r = Math.hypot(x, z), t = fbm(x / 260 + 5, z / 260, 3) * 0.5 + 0.5;
  out.copy(PALETTE.deep).lerp(PALETTE.meadow, smooth(0.25, 0.5, t)).lerp(PALETTE.light, smooth(0.5, 0.8, t));
  out.lerp(PALETTE.forest, smooth(0.5, 0.6, forestMask(x, z)));
  out.lerp(PALETTE.far, smooth(500, 1500, r) * 0.55);
  return out;
}

function buildGrid(size, cells, sink) {
  const row = cells + 1, half = size / 2, step = size / cells, heights = new Float32Array(row * row);
  const pos = new Float32Array(row * row * 3), col = new Float32Array(row * row * 3), field = new Float32Array(row * row), idx = [], c = new THREE.Color();
  for (let j = 0; j < row; j++) for (let i = 0; i < row; i++) {
    const k = j * row + i, x = -half + i * step, z = -half + j * step, h = heightAt(x, z);
    heights[k] = h; pos.set([x, h - sink, z], k * 3);
    groundColor(c, x, z, h); col.set([c.r, c.g, c.b], k * 3); field[k] = fieldAmount(x, z);
  }
  for (let j = 0; j < cells; j++) for (let i = 0; i < cells; i++) {
    const a = j * row + i, b = a + 1, cc = a + row, d = cc + 1;
    idx.push(a, cc, b, b, cc, d);                                  // duong cheo b-c: groundAt ben duoi phai dung cung cach chia
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('aField', new THREE.BufferAttribute(field, 1));
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

// Lop "ve" tren mat dat gan: mang mau dam nhat nhu net co, o ruong sac canh co bo rao va luong cay, duong mon dat.
// Mau viet theo sRGB roi doi sang tuyen tinh.
function paintGround(shader) {
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nattribute float aField; varying vec3 vGround;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGround = vec3(position.xz, aField);');
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', `#include <common>
      varying vec3 vGround;
      float pvHash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
      float pvNoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
        return mix(mix(pvHash(i), pvHash(i + vec2(1, 0)), f.x), mix(pvHash(i + vec2(0, 1)), pvHash(i + vec2(1, 1)), f.x), f.y); }
      ${PATH_GLSL}`)
    .replace('#include <color_fragment>', `#include <color_fragment>
      vec2 wp = vGround.xy;
      float dab = pvNoise(wp * 0.11) * 0.6 + pvNoise(wp * 0.34 + 7.) * 0.4;
      diffuseColor.rgb *= mix(0.88, 1.10, smoothstep(0.38, 0.62, dab));
      vec2 fuv = vec2(wp.x * ${FIELD_AXIS[0]} + wp.y * ${FIELD_AXIS[1]}, -wp.x * ${FIELD_AXIS[1]} + wp.y * ${FIELD_AXIS[0]}) / vec2(${glslFloat(FIELD_CELL[0])}, ${glslFloat(FIELD_CELL[1])});
      fuv += (vec2(pvNoise(wp * 0.035), pvNoise(wp * 0.035 + 31.)) - 0.5) * 0.10;
      vec2 cell = floor(fuv), inCell = fract(fuv) - 0.5; float pick = pvHash(cell), edge = max(abs(inCell.x), abs(inCell.y));
      vec3 tint = pick < 0.22 ? vec3(0.61, 0.85, 0.29) : pick < 0.42 ? vec3(0.80, 0.86, 0.32) : pick < 0.58 ? vec3(0.90, 0.81, 0.42) : pick < 0.78 ? vec3(0.33, 0.67, 0.24) : vec3(0.44, 0.77, 0.25);
      tint *= 1. - 0.07 * step(0.5, fract(inCell.x * 16.)) * step(0.42, pick) * step(pick, 0.78);       // luong cay
      tint = mix(tint, vec3(0.16, 0.44, 0.22), smoothstep(0.462, 0.475, edge));                         // bo rao
      diffuseColor.rgb = mix(diffuseColor.rgb, pow(tint, vec3(2.2)) * mix(0.92, 1.06, smoothstep(0.38, 0.62, dab)), vGround.z * 0.92);
      float pd = pathDist(wp) + (pvNoise(wp * 0.6) - 0.5) * 1.1;
      diffuseColor.rgb = mix(diffuseColor.rgb, pow(vec3(0.84, 0.74, 0.50), vec3(2.2)) * mix(0.9, 1.05, dab), smoothstep(1.9, 1.35, pd) * 0.92);`);
}

export function createTerrain(scene) {
  const material = toon(); material.userData.patch = paintGround;
  const nearMesh = new THREE.Mesh(near.geometry, material), farMesh = new THREE.Mesh(far.geometry, toon({ flatShading: true }));
  nearMesh.receiveShadow = true; nearMesh.frustumCulled = false; farMesh.frustumCulled = false;
  scene.add(nearMesh, farMesh);
  return { nearMesh, farMesh };
}
