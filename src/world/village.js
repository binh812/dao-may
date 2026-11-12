import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { HOUSE, PATH, WATER_Y, height, pathDist } from './layout.js';
import { C, TRS, blob, lerp, rnd, smooth } from '../core/util.js';
import { B } from './island.js';
import { lanternLight, scene } from '../core/stage.js';

// ---------------------------------------------------------------- house
{
  const y0 = height(HOUSE.x, HOUSE.z);
  const H = (...a) => TRS(HOUSE.x, y0, HOUSE.z, 0, HOUSE.ry, 0).multiply(TRS(...a));
  B.add('clay', new RoundedBoxGeometry(3.7, 0.4, 3.3, 4, 0.14), H(0, 0.08, 0), 0xb9aa9c);
  B.add('clay', new RoundedBoxGeometry(3.2, 2.2, 2.8, 8, 0.3), H(0, 1.3, 0), (c, x, y) => c.set(0xfff0d8).lerp(C(0xf3d2ae), smooth(y0 + 1.0, y0 + 0.2, y)));
  const sh = new THREE.Shape(); sh.moveTo(-2.15, 0); sh.quadraticCurveTo(-0.9, 0.55, 0, 1.75); sh.quadraticCurveTo(0.9, 0.55, 2.15, 0); sh.closePath();
  const roof = new THREE.ExtrudeGeometry(sh, { depth: 3.3, bevelEnabled: true, bevelSize: 0.14, bevelThickness: 0.14, bevelSegments: 5, curveSegments: 16 });
  B.add('gloss', roof, H(0, 2.32, -1.65), (c, x, y) => c.set(0xe9573f).lerp(C(0xff8a5c), smooth(y0 + 2.4, y0 + 4.2, y)));
  B.add('clay', new RoundedBoxGeometry(0.55, 1.2, 0.55, 4, 0.1), H(0.95, 3.5, -0.5), 0xc9785e);
  B.add('clay', new RoundedBoxGeometry(0.72, 0.16, 0.72, 3, 0.07), H(0.95, 4.12, -0.5), 0xf2e3d0);
  B.add('gloss', new RoundedBoxGeometry(0.86, 1.5, 0.14, 5, 0.07), H(0, 0.98, 1.4), 0x2fb3a6);
  B.add('clay', new RoundedBoxGeometry(1.06, 1.68, 0.1, 4, 0.05), H(0, 1.02, 1.37), 0xfffaf0);
  B.add('metal', new THREE.SphereGeometry(0.06, 16, 12), H(0.26, 0.95, 1.5), 0xffc94d);
  B.add('clay', new RoundedBoxGeometry(1.3, 0.16, 0.7, 3, 0.07), H(0, 0.3, 1.75), 0xcbbcae);
  for (const sx of [-1.05, 1.05]) {
    B.add('clay', new THREE.TorusGeometry(0.36, 0.075, 12, 32), H(sx, 1.55, 1.42), 0xfffaf0);
    B.add('glow', new THREE.CircleGeometry(0.34, 32), H(sx, 1.55, 1.425), C(0xffc56b), { ao: false, gain: 3.4 });
    B.add('clay', new RoundedBoxGeometry(0.05, 0.7, 0.04, 2, 0.015), H(sx, 1.55, 1.45), 0xfffaf0);
    B.add('clay', new RoundedBoxGeometry(0.7, 0.05, 0.04, 2, 0.015), H(sx, 1.55, 1.45), 0xfffaf0);
    B.add('clay', new RoundedBoxGeometry(0.8, 0.2, 0.26, 3, 0.07), H(sx, 1.02, 1.5), 0x9a6844);
    for (let i = 0; i < 5; i++) B.add('clay', blob(0.11, 2, 0.2, 6, i * 3.1), H(sx - 0.3 + i * 0.15, 1.2 + (i % 2) * 0.04, 1.52), [0xff7fa8, 0xffd15c, 0xff9f6b, 0xfff3f0, 0xc58cff][i]);
  }
  B.add('clay', new THREE.TorusGeometry(0.3, 0.065, 12, 28), H(1.615, 1.6, 0.1, 0, Math.PI / 2, 0), 0xfffaf0);
  B.add('glow', new THREE.CircleGeometry(0.28, 28), H(1.62, 1.6, 0.1, 0, Math.PI / 2, 0), C(0xffc56b), { ao: false, gain: 3.0 });
  // fence
  const posts = [];
  for (let a = -0.5; a <= 2.6; a += 0.21) {
    const x = HOUSE.x + Math.sin(HOUSE.ry + a - 1.0) * 5.0, z = HOUSE.z + Math.cos(HOUSE.ry + a - 1.0) * 4.4;
    posts.push(pathDist(x, z) < 1.0 ? null : [x, z]);
  }
  posts.forEach((p, i) => {
    if (!p) return;
    const y = height(p[0], p[1]);
    B.add('clay', new RoundedBoxGeometry(0.13, 0.78, 0.13, 3, 0.05), TRS(p[0], y + 0.36, p[1], 0, rnd() * 0.3, (rnd() - .5) * 0.08), 0xfff6ea);
    const n = posts[i + 1];
    if (n) for (const hh of [0.28, 0.56]) {
      const yn = height(n[0], n[1]), len = Math.hypot(n[0] - p[0], n[1] - p[1]);
      B.add('clay', new RoundedBoxGeometry(len + 0.1, 0.07, 0.05, 2, 0.02), TRS((p[0] + n[0]) / 2, (y + yn) / 2 + hh, (p[1] + n[1]) / 2, 0, -Math.atan2(n[1] - p[1], n[0] - p[0]), Math.atan2(yn - y, len)), 0xfff6ea);
    }
  });
}

// ---------------------------------------------------------------- lantern, path stones, dock
const lanternPos = new THREE.Vector3(-2.0, 0, 0.1); lanternPos.y = height(lanternPos.x, lanternPos.z);
{
  const { x, y, z } = lanternPos;
  B.add('clay', new THREE.CylinderGeometry(0.05, 0.08, 2.1, 10), TRS(x, y + 1.05, z), 0x4a3b45);
  B.add('clay', new RoundedBoxGeometry(0.5, 0.06, 0.06, 2, 0.02), TRS(x + 0.2, y + 2.08, z), 0x4a3b45);
  B.add('clay', new RoundedBoxGeometry(0.3, 0.08, 0.3, 3, 0.03), TRS(x + 0.4, y + 1.98, z), 0x4a3b45);
  B.add('glow', new RoundedBoxGeometry(0.22, 0.3, 0.22, 4, 0.08), TRS(x + 0.4, y + 1.8, z), C(0xffb657), { ao: false, gain: 5 });
  const pl = lanternLight; pl.position.set(x + 0.4, y + 1.75, z); scene.add(pl);
  for (let i = 0; i < PATH.length - 1; i++) {
    const [ax, az] = PATH[i], [bx, bz] = PATH[i + 1], len = Math.hypot(bx - ax, bz - az), n = Math.floor(len / 0.72);
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n, sx = lerp(ax, bx, t) + (rnd() - .5) * 0.22, sz = lerp(az, bz, t) + (rnd() - .5) * 0.22, r = 0.26 + rnd() * 0.12;
      B.add('clay', new THREE.CylinderGeometry(r, r * 1.08, 0.12, 14, 1), TRS(sx, height(sx, sz) + 0.03, sz, (rnd() - .5) * 0.08, rnd() * 6, (rnd() - .5) * 0.08, 1, 1, 0.8 + rnd() * 0.3), C(0xd9c9b4).multiplyScalar(0.9 + rnd() * 0.2));
    }
  }
  const dAng = Math.atan2(0.5, 2.6);
  for (let i = 0; i < 8; i++) {
    const t = i / 7, px = lerp(1.5, 4.1, t), pz = lerp(2.7, 3.2, t);
    B.add('clay', new RoundedBoxGeometry(0.3, 0.08, 1.15, 3, 0.03), TRS(px, WATER_Y + 0.3 + (rnd() - .5) * 0.02, pz, 0, -dAng + (rnd() - .5) * 0.06, 0), C(0xb98558).multiplyScalar(0.88 + rnd() * 0.25));
    if (i % 3 === 1) for (const s of [-0.55, 0.55]) B.add('clay', new THREE.CylinderGeometry(0.07, 0.08, 1.3, 10), TRS(px - Math.sin(dAng) * s, WATER_Y - 0.1, pz + Math.cos(dAng) * s), 0x8a5f3f);
  }
}
