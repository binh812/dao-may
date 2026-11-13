// Cay Tam: lon len theo so ky nang be da thanh thao (GDD 5.4). Chi la hinh anh; so lieu den tu learn/adaptive.js.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { blob } from '../core/util.js';

const GROW_EVERY = 3, MAX_STAGE = 4;                 // cu 3 ky nang thi cay lon them mot bac
const FRUIT_COLOR = 0xffe27a, FRUIT_GLOW = 2.6;      // qua sang hon 1 de bloom bat duoc

const CROWN_LOBES = 6, CROWN_TONES = [0xd45f8c, 0xf59cbc, 0xffe1ec];   // tan hoa hong: dam o duoi, nhat o dinh

/** Tan cay ban kinh ~1: mot khoi giua va cac khoi con quanh, to mau theo do cao nhu net co cham. */
function crownGeometry() {
  const [deep, mid, pale] = CROWN_TONES.map((hex) => new THREE.Color(hex)), parts = [], c = new THREE.Color();
  for (let i = 0; i <= CROWN_LOBES; i++) {
    const angle = i / CROWN_LOBES * Math.PI * 2, off = i === 0 ? 0 : 0.56, radius = i === 0 ? 0.78 : 0.5 + 0.08 * Math.sin(i * 2.7);
    const g = blob(radius, 2, 0.16, 2.1, i * 5.3).translate(Math.cos(angle) * off, i === 0 ? 0.22 : -0.1 + 0.12 * Math.cos(i * 1.7), Math.sin(angle) * off).toNonIndexed();
    g.deleteAttribute('uv'); g.computeVertexNormals();
    const p = g.attributes.position, colors = new Float32Array(p.count * 3);
    for (let v = 0; v < p.count; v++) {
      const h = THREE.MathUtils.smoothstep(p.getY(v) + 0.2 * Math.sin(p.getX(v) * 6 + p.getZ(v) * 5), -0.6, 0.9);
      if (h < 0.5) c.copy(deep).lerp(mid, h * 2); else c.copy(mid).lerp(pale, h * 2 - 1);
      colors.set([c.r, c.g, c.b], v * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3)); parts.push(g);
  }
  return mergeGeometries(parts, false);
}

/** Vi tri qua thu i tren tan cay (xoan oc quanh tan, on dinh giua cac lan ve). */
function fruitOffset(i, crownRadius) {
  const angle = i * 2.399963, height = 0.15 + ((i * 0.37) % 1) * 0.7;
  const r = crownRadius * Math.sqrt(1 - Math.pow(height - 0.5, 2) * 1.6);
  return new THREE.Vector3(Math.cos(angle) * r, height * crownRadius * 1.6, Math.sin(angle) * r);
}

export function createHeartTree(scene, makeToon, groundAt, spot) {
  const group = new THREE.Group(), y = groundAt(spot.x, spot.z);
  group.position.set(spot.x, Number.isFinite(y) ? y : 0, spot.z); scene.add(group);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.2, 1, 10), makeToon({ vertexColors: false, color: 0x7a4d36 }));
  const crown = new THREE.Mesh(crownGeometry(), makeToon());
  trunk.castShadow = crown.castShadow = true;
  const fruitGeo = new THREE.SphereGeometry(0.11, 12, 10), fruitMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(FRUIT_COLOR).multiplyScalar(FRUIT_GLOW) });
  const fruits = new THREE.Group();
  group.add(trunk, crown, fruits);
  let shown = -1, pulse = 0;

  return {
    spot,
    /** Ve lai cay cho so ky nang da thanh thao. */
    setMastered(count) {
      if (count === shown) return;
      const stage = Math.min(Math.floor(count / GROW_EVERY), MAX_STAGE), trunkHeight = 1.0 + stage * 0.45, crownRadius = 0.55 + stage * 0.22;
      trunk.scale.set(1 + stage * 0.25, trunkHeight, 1 + stage * 0.25); trunk.position.y = trunkHeight / 2;
      crown.scale.set(crownRadius, crownRadius * 0.9, crownRadius); crown.position.y = trunkHeight + crownRadius * 0.6;
      fruits.position.y = trunkHeight - crownRadius * 0.15;
      while (fruits.children.length > count) fruits.remove(fruits.children.at(-1));
      for (let i = fruits.children.length; i < count; i++) { const f = new THREE.Mesh(fruitGeo, fruitMat); f.position.copy(fruitOffset(i, crownRadius)); fruits.add(f); }
      fruits.children.forEach((f, i) => f.position.copy(fruitOffset(i, crownRadius)));
      if (shown >= 0 && count > shown) pulse = 1;   // vua co ky nang moi: cay rung nhe
      shown = count;
    },
    update(dt, time) {
      pulse = Math.max(0, pulse - dt * 1.2);
      const breathe = 1 + Math.sin(time * 1.5) * 0.015 + pulse * 0.18 * Math.sin(time * 18);
      group.scale.setScalar(breathe);
    },
  };
}
