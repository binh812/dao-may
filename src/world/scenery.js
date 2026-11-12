import * as THREE from 'three';
import { POND, WATER_Y } from './layout.js';
import { Builder, C, TRS, blob, rnd, smooth } from '../core/util.js';
import { B, world } from './island.js';
import { LEAF, tree } from './flora.js';
import { MATS, toon } from './materials.js';
import { U, scene } from '../core/stage.js';

// ---------------------------------------------------------------- lily pads, islets
for (let i = 0; i < 6; i++) {
  const a = i * 1.1 + 0.4, r = 0.6 + (i % 3) * 0.75, x = POND.x + Math.cos(a) * r, z = POND.z + Math.sin(a) * r, s = 0.26 + rnd() * 0.18;
  B.add('gloss', new THREE.CylinderGeometry(s, s, 0.025, 20, 1, false, 0, 5.6), TRS(x, WATER_Y + 0.02, z, 0, rnd() * 6, 0), C(0x4fae4f).multiplyScalar(0.85 + rnd() * 0.3), { ao: false });
  if (i % 2 === 0) { for (let k = 0; k < 6; k++) B.add('clay', new THREE.SphereGeometry(0.06, 10, 8), TRS(x + Math.cos(k * 1.05) * 0.05, WATER_Y + 0.07, z + Math.sin(k * 1.05) * 0.05, 0, -k * 1.05, 0.7, 1.3, 0.5, 0.7), 0xffb3d1, { ao: false }); B.add('clay', new THREE.SphereGeometry(0.035, 8, 6), TRS(x, WATER_Y + 0.1, z), 0xffd95c); }
}
function islet(cx, cy, cz, r, pal) {
  const g = blob(r, 3, 0.28, 0.9 / r, rnd() * 90), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setY(i, y > 0 ? y * 0.14 : y * 1.5); }
  g.computeVertexNormals();
  B.add('clay', g, TRS(cx, cy, cz), (c, px, py, pz, nx, ny) => c.set(0x8ea3c6).lerp(C(0x6680ad), 0.5 + 0.5 * Math.sin(py * 3)).lerp(C(0x5cc04a), smooth(0.4, 0.8, ny)), { ao: false });
  tree(cx, cz, r * 0.38, pal, cy + r * 0.08);
}
islet(-24, 2.5, -9, 3.2, 'green'); islet(21, -1.5, -17, 2.6, 'blossom'); islet(-17, 5.5, -26, 2.2, 'autumn'); islet(25, 4, 10, 2.0, 'green2');
B.build(world, MATS);
{
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const g2 = cv.getContext('2d'); g2.translate(64, 64); g2.fillStyle = '#fff';
  for (let i = 0; i < 6; i++) { g2.save(); g2.rotate(i / 6 * 6.283 + (i % 2) * 0.25); g2.beginPath(); g2.moveTo(0, 4); g2.bezierCurveTo(34, -8, 26, -50, 0, -58); g2.bezierCurveTo(-26, -50, -34, -8, 0, 4); g2.fill(); g2.restore(); }
  g2.beginPath(); g2.arc(0, 0, 34, 0, 6.3); g2.fill();
  const leafTex = new THREE.CanvasTexture(cv); leafTex.colorSpace = THREE.SRGBColorSpace;
  const leafMat = toon({ map: leafTex, alphaTest: 0.5 });
  leafMat.userData.patch = (sh) => {
    sh.uniforms.uTime = U.time; sh.uniforms.uWind = U.wind;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime, uWind; attribute vec2 aLeaf;')
      .replace('#include <project_vertex>', `
        vec4 mvPosition = modelViewMatrix * vec4(transformed + vec3(sin(uTime * 1.3 + position.y * 1.4 + position.x * 0.8), 0.0, cos(uTime * 1.1 + position.z * 1.2)) * 0.05 * uWind, 1.0);
        float la = aLeaf.y + sin(uTime * 1.6 + position.x * 3.0 + position.z * 2.0) * 0.16 * min(uWind, 2.5);
        mvPosition.xy += mat2(cos(la), -sin(la), sin(la), cos(la)) * (uv - 0.5) * aLeaf.x;
        gl_Position = projectionMatrix * mvPosition;`);
  };
  const lg = new THREE.BufferGeometry();
  lg.setAttribute('position', new THREE.Float32BufferAttribute(LEAF.pos, 3)); lg.setAttribute('normal', new THREE.Float32BufferAttribute(LEAF.nor, 3));
  lg.setAttribute('uv', new THREE.Float32BufferAttribute(LEAF.uv, 2)); lg.setAttribute('color', new THREE.Float32BufferAttribute(LEAF.col, 3));
  lg.setAttribute('aLeaf', new THREE.Float32BufferAttribute(LEAF.leaf, 2)); lg.setIndex(LEAF.idx);
  const leaves = new THREE.Mesh(lg, leafMat); leaves.receiveShadow = true; leaves.frustumCulled = false; world.add(leaves);
}

// ---------------------------------------------------------------- clouds
const clouds = new THREE.Group(); scene.add(clouds);
{
  const CB = new Builder();
  for (let i = 0; i < 11; i++) {
    const a = i / 11 * 6.283 + rnd(), r = 30 + rnd() * 26, cx = Math.cos(a) * r, cz = Math.sin(a) * r, cy = -9 + rnd() * 20, s = 2 + rnd() * 2.6;
    for (let k = 0; k < 6; k++) CB.add('cloud', blob(s * (0.6 + rnd() * 0.6), 3, 0.12, 0.5, rnd() * 20), TRS(cx + (k - 2.5) * s * 0.62, cy + (rnd() - .3) * s * 0.4, cz + (rnd() - .5) * s, 0, 0, 0, 1, 0.62, 1), 0xffffff);
  }
  CB.build(clouds, MATS, { cast: false, receive: false });
}

export { clouds };
