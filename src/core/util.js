import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js';

// ---------------------------------------------------------------- helpers
function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rnd = mulberry32(20261112);
const noise = new ImprovedNoise();
const clamp = THREE.MathUtils.clamp, lerp = THREE.MathUtils.lerp;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const fbm = (x, z, o = 4) => { let a = 0, amp = .5, f = 1; for (let i = 0; i < o; i++) { a += amp * noise.noise(x * f, z * f, 7.3); amp *= .5; f *= 2; } return a; };
const _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _e = new THREE.Euler();
function TRS(px, py, pz, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
  return new THREE.Matrix4().compose(_p.set(px, py, pz), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz));
}
const C = (hex) => new THREE.Color(hex);

class Builder {
  constructor() { this.b = new Map(); }
  add(key, geo, m, color, opt = {}) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    for (const n of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(n)) g.deleteAttribute(n);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    g.applyMatrix4(m);
    const pos = g.attributes.position, nor = g.attributes.normal, n = pos.count, col = new Float32Array(n * 3);
    const c = new THREE.Color(), base = typeof color === 'function' ? null : new THREE.Color(color), k = opt.gain ?? 1;
    for (let i = 0; i < n; i++) {
      if (base) c.copy(base); else color(c, pos.getX(i), pos.getY(i), pos.getZ(i), nor.getX(i), nor.getY(i), nor.getZ(i));
      const ao = opt.ao === false ? 1 : 0.72 + 0.28 * (nor.getY(i) * 0.5 + 0.5);
      col[i * 3] = c.r * ao * k; col[i * 3 + 1] = c.g * ao * k; col[i * 3 + 2] = c.b * ao * k;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    if (!this.b.has(key)) this.b.set(key, []);
    this.b.get(key).push(g);
  }
  build(parent, mats, { cast = true, receive = true } = {}) {
    for (const [k, list] of this.b) {
      const geo = mergeGeometries(list, false);
      list.forEach(g => g.dispose());
      const mesh = new THREE.Mesh(geo, mats[k]);
      mesh.castShadow = cast && k !== 'glow' && k !== 'cloud';
      mesh.receiveShadow = receive && k !== 'glow' && k !== 'cloud';
      parent.add(mesh);
    }
    this.b.clear();
  }
}
function blob(radius, detail, amp, freq, seed) {
  const g = new THREE.IcosahedronGeometry(radius, detail), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const k = 1 + amp * noise.noise(x * freq + seed, y * freq + seed * 1.7, z * freq - seed);
    p.setXYZ(i, x * k, y * k, z * k);
  }
  return g;
}

export { Builder, C, TRS, _e, _p, _q, _s, blob, clamp, fbm, lerp, noise, rnd, smooth };
