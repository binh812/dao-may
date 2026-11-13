// San choi o an quan: chieu coi, ban co ve tren chieu, may dong soi va la co de be thay tu xa. The gioi dat `realm.playground` thi co.
import * as THREE from 'three';

const MAT_SIZE = { w: 3.4, d: 2.2 }, FLAG_HEIGHT = 3.2, PEBBLE_CELLS = 5;

export function createPlayground(scene, makeToon, groundAt, spot) {
  const root = new THREE.Group(), y = groundAt(spot.x, spot.z);
  root.position.set(spot.x, y, spot.z); root.rotation.y = spot.yaw ?? 0;
  const solid = (color) => makeToon({ vertexColors: false, color });
  const mat = new THREE.Mesh(new THREE.BoxGeometry(MAT_SIZE.w, 0.08, MAT_SIZE.d), solid(0xd9b877)); mat.position.y = 0.06; mat.receiveShadow = true;
  const board = new THREE.Mesh(new THREE.BoxGeometry(MAT_SIZE.w * 0.86, 0.03, MAT_SIZE.d * 0.62), solid(0xf3e2bd)); board.position.y = 0.115;
  root.add(mat, board);
  const pebbleGeo = new THREE.SphereGeometry(0.07, 8, 6), pebbleMat = solid(0x8d99a8), quanMat = solid(0xb0552f);
  const cellW = (MAT_SIZE.w * 0.86 * 0.72) / PEBBLE_CELLS;
  for (let row = 0; row < 2; row++) for (let col = 0; col < PEBBLE_CELLS; col++) for (let k = 0; k < 3; k++) {
    const pebble = new THREE.Mesh(pebbleGeo, pebbleMat);
    pebble.position.set((col - 2) * cellW + (k - 1) * 0.11, 0.17, (row - 0.5) * 0.62 + (k % 2) * 0.1 - 0.05);
    root.add(pebble);
  }
  for (const side of [-1, 1]) { const quan = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), quanMat); quan.position.set(side * MAT_SIZE.w * 0.38, 0.22, 0); quan.scale.y = 0.7; root.add(quan); }
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, FLAG_HEIGHT, 8), solid(0x9a744a)); pole.position.set(-MAT_SIZE.w * 0.62, FLAG_HEIGHT / 2, -MAT_SIZE.d * 0.5); pole.castShadow = true;
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.6, 6, 1), new THREE.MeshBasicMaterial({ color: 0xff7a59, side: THREE.DoubleSide }));
  flag.position.set(pole.position.x + 0.5, FLAG_HEIGHT - 0.38, pole.position.z);
  root.add(pole, flag); scene.add(root);
  const wave = flag.geometry.attributes.position, restX = Float32Array.from(wave.array);
  return {
    update(time) {
      for (let i = 0; i < wave.count; i++) { const x = restX[i * 3] + 0.475; wave.setZ(i, Math.sin(time * 4 + x * 5) * 0.09 * x); }
      wave.needsUpdate = true;
    },
  };
}
