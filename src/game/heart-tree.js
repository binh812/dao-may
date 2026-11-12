// Cay Tam: lon len theo so ky nang be da thanh thao (GDD 5.4). Chi la hinh anh; so lieu den tu learn/adaptive.js.
import * as THREE from 'three';

const SPOT = { x: -1.6, z: 5.2 };
const GROW_EVERY = 3, MAX_STAGE = 4;                 // cu 3 ky nang thi cay lon them mot bac
const FRUIT_COLOR = 0xffe27a, FRUIT_GLOW = 2.6;      // qua sang hon 1 de bloom bat duoc

/** Vi tri qua thu i tren tan cay (xoan oc quanh tan, on dinh giua cac lan ve). */
function fruitOffset(i, crownRadius) {
  const angle = i * 2.399963, height = 0.15 + ((i * 0.37) % 1) * 0.7;
  const r = crownRadius * Math.sqrt(1 - Math.pow(height - 0.5, 2) * 1.6);
  return new THREE.Vector3(Math.cos(angle) * r, height * crownRadius * 1.6, Math.sin(angle) * r);
}

export function createHeartTree(scene, makeToon, groundAt) {
  const group = new THREE.Group(), y = groundAt(SPOT.x, SPOT.z);
  group.position.set(SPOT.x, Number.isFinite(y) ? y : 0, SPOT.z); scene.add(group);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.2, 1, 10), makeToon({ vertexColors: false, color: 0x8b5a3a }));
  const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 3), makeToon({ vertexColors: false, color: 0x7fd6b0 }));
  trunk.castShadow = crown.castShadow = true;
  const fruitGeo = new THREE.SphereGeometry(0.11, 12, 10), fruitMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(FRUIT_COLOR).multiplyScalar(FRUIT_GLOW) });
  const fruits = new THREE.Group();
  group.add(trunk, crown, fruits);
  let shown = -1, pulse = 0;

  return {
    spot: SPOT,
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
