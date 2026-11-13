// Nhan vat Mam: dung chung cho moi the gioi.
import * as THREE from 'three';
import { scene } from '../core/stage.js';

// ---------------------------------------------------------------- character
const chr = new THREE.Group(), squash = new THREE.Group(), sprout = new THREE.Group(); chr.add(squash); scene.add(chr);
const eyes = [];
{
  const plush = new THREE.MeshPhysicalMaterial({ color: 0xfff3e2, roughness: 0.92, sheen: 1, sheenRoughness: 0.45, sheenColor: new THREE.Color(0xffd0b0) });
  const orange = new THREE.MeshPhysicalMaterial({ color: 0xff9a3d, roughness: 0.6, sheen: 0.6, sheenColor: new THREE.Color(0xffd0a0) });
  const eyeMat = new THREE.MeshPhysicalMaterial({ color: 0x1a1320, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.05 });
  const leaf = new THREE.MeshPhysicalMaterial({ color: 0x66d06a, roughness: 0.45, clearcoat: 0.5 });
  const add = (parent, geo, mat, px, py, pz, sx = 1, sy = sx, sz = sx, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); m.scale.set(sx, sy, sz); m.rotation.z = rz; m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
  const sph = (r) => new THREE.SphereGeometry(r, 32, 24);
  add(squash, sph(0.5), plush, 0, 0.5, 0, 1, 0.93, 0.95);
  add(squash, sph(0.3), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.95, sheen: 1, sheenColor: new THREE.Color(0xffe8d8) }), 0, 0.4, 0.26, 1, 1, 0.75);
  for (const s of [-1, 1]) {
    add(squash, sph(0.14), orange, s * 0.2, 0.07, 0.1, 1, 0.6, 1.35);
    add(squash, sph(0.13), plush, s * 0.49, 0.42, 0.06, 0.7, 1.25, 0.8, s * 0.5);
    add(squash, sph(0.16), plush, s * 0.3, 0.93, -0.02, 0.8, 1.0, 0.6, -s * 0.35);
    const e = add(squash, sph(0.078), eyeMat, s * 0.175, 0.6, 0.425, 1, 1.15, 0.7); eyes.push(e);
    const hl = add(e, new THREE.SphereGeometry(0.024, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }), s * 0.01 + 0.025, 0.03, 0.065); hl.castShadow = false;
    add(squash, sph(0.075), new THREE.MeshStandardMaterial({ color: 0xff9db0, roughness: 0.9 }), s * 0.31, 0.47, 0.385, 1, 0.6, 0.35);
  }
  add(squash, sph(0.05), orange, 0, 0.5, 0.485, 1.1, 0.7, 0.9);
  sprout.position.set(0, 0.95, 0); squash.add(sprout);
  add(sprout, new THREE.CylinderGeometry(0.018, 0.024, 0.22, 8), leaf, 0, 0.11, 0);
  add(sprout, sph(0.14), leaf, 0.12, 0.25, 0, 1, 0.16, 0.5, 0.45);
  add(sprout, sph(0.11), leaf, -0.1, 0.23, 0, 1, 0.16, 0.5, -0.55);
}

export { chr, eyes, sprout, squash };
