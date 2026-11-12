import * as THREE from 'three';
import { scene } from '../core/stage.js';
import { Builder, C, clamp, fbm, lerp, noise, smooth } from '../core/util.js';
import { R, WATER_Y, height, pathDist, terrace } from './layout.js';
import { toon } from './materials.js';

// ---------------------------------------------------------------- island
const world = new THREE.Group(); scene.add(world);
const B = new Builder();
{
  const NR = 60, NU = 26, NS = 144, rows = NR + NU + 1;
  const pos = new Float32Array(rows * NS * 3), col = new Float32Array(rows * NS * 3), idx = [];
  const cGrassA = C(0x2a8a46), cGrassB = C(0x48a544), cSand = C(0xf2dfae), cBed = C(0x3fa9a0), cSoil = C(0x8ea3c6), cRockA = C(0x7f93b8), cRockB = C(0x596d96), cRockC = C(0xb4c2dc), cWall = C(0xb8c2d6), c = new THREE.Color();
  for (let i = 0; i < rows; i++) {
    for (let s = 0; s < NS; s++) {
      const ang = s / NS * Math.PI * 2, k = (i * NS + s) * 3;
      let x, y, z;
      if (i <= NR) {
        const r = R * Math.pow(i / NR, 0.9);
        x = Math.cos(ang) * r; z = Math.sin(ang) * r; y = height(x, z);
        c.copy(cGrassA).lerp(cGrassB, clamp(0.5 + fbm(x * .25, z * .25, 3), 0, 1));
        c.lerp(cSand, smooth(1.0, 0.35, pathDist(x, z)) * 0.95);
        c.lerp(cSand, smooth(WATER_Y + 0.35, WATER_Y + 0.05, y));
        c.lerp(cBed, smooth(WATER_Y - 0.1, WATER_Y - 0.9, y));
        c.lerp(cWall, terrace(x, z).wall);
        c.lerp(cSoil, smooth(R - 0.9, R - 0.15, r));
      } else {
        const t = (i - NR) / NU, lump = 1 + 0.16 * noise.noise(Math.cos(ang) * 2.2, t * 3.0, Math.sin(ang) * 2.2) + 0.05 * noise.noise(Math.cos(ang) * 7, t * 9, Math.sin(ang) * 7);
        const r = R * Math.pow(1 - t, 0.62) * lump * (1 - 0.02 * t) + (t < 0.12 ? 0.25 * Math.sin(t / 0.12 * Math.PI) : 0);
        x = Math.cos(ang) * r; z = Math.sin(ang) * r;
        y = height(Math.cos(ang) * R, Math.sin(ang) * R) - 0.25 - 11.5 * Math.pow(t, 0.85) * (1 + 0.18 * noise.noise(Math.cos(ang) * 1.5, 3.3, Math.sin(ang) * 1.5));
        const band = 0.5 + 0.5 * Math.sin(y * 2.4 + noise.noise(x * .4, y * .4, z * .4) * 3);
        c.copy(cRockA).lerp(cRockB, band).lerp(cRockC, clamp(noise.noise(x * .7, y * .7, z * .7) * 0.9, 0, 1));
        c.lerp(cSoil, smooth(0.14, 0.0, t)).multiplyScalar(lerp(1, 0.55, t));
      }
      pos[k] = x; pos[k + 1] = y; pos[k + 2] = z; col[k] = c.r; col[k + 1] = c.g; col[k + 2] = c.b;
    }
  }
  for (let i = 0; i < rows - 1; i++) for (let s = 0; s < NS; s++) {
    const a = i * NS + s, b = (i + 1) * NS + s, cc = i * NS + (s + 1) % NS, d = (i + 1) * NS + (s + 1) % NS;
    idx.push(a, cc, b, b, cc, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(idx); g.computeVertexNormals();
  const island = new THREE.Mesh(g, toon({ flatShading: true }));
  island.castShadow = true; island.receiveShadow = true; world.add(island);
}

export { B, world };
