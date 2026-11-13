// Hinh cua vat hai luom (hoa, nam, go, da pha le): moi loai mot InstancedMesh, nhat roi thi thu nho ve 0.
// Du lieu la mot bo suu tap cua collect-core.js ma moi vat co them `kind`.
import * as THREE from 'three';

const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _e = new THREE.Euler();
const GLOW = 1.9;   // da pha le sang hon 1 de lop bloom bat duoc
const STYLES = {
  hoa: { geometry: () => new THREE.IcosahedronGeometry(0.42, 0), color: 0xff8fb8, lift: 0.8, tilt: 0, spin: 0.6, bob: 0.05 },
  nam: { geometry: () => new THREE.ConeGeometry(0.46, 0.5, 10), color: 0xe9503f, lift: 0.72, tilt: 0, spin: 0, bob: 0 },
  go: { geometry: () => new THREE.CylinderGeometry(0.2, 0.24, 1.1, 8), color: 0x9a6b3e, lift: 0.55, tilt: 0.35, spin: 0, bob: 0 },
  da: { geometry: () => new THREE.OctahedronGeometry(0.4, 0), color: 0x7fe6ff, lift: 0.95, tilt: 0, spin: 1.6, bob: 0.1, glow: true },
};

export function createGatherViews(scene, makeToon, collection) {
  const groups = Object.entries(STYLES).map(([kind, style]) => {
    const items = collection.items.filter((item) => item.kind === kind);
    const material = style.glow ? new THREE.MeshBasicMaterial({ color: new THREE.Color(style.color).multiplyScalar(GLOW) }) : makeToon({ vertexColors: false, color: style.color });
    const mesh = new THREE.InstancedMesh(style.geometry(), material, Math.max(items.length, 1));
    mesh.count = items.length; mesh.frustumCulled = false; mesh.castShadow = !style.glow; scene.add(mesh);
    return { items, style, mesh };
  });
  return {
    update(time) {
      for (const { items, style, mesh } of groups) {
        items.forEach((item, i) => {
          const size = item.taken ? 0 : 1 + 0.06 * Math.sin(time * 2.4 + i);
          _m.compose(_p.set(item.x, item.y + style.lift + Math.sin(time * 2 + i) * style.bob, item.z), _q.setFromEuler(_e.set(0, time * style.spin + i * 1.7, style.tilt)), _s.set(size, size, size));
          mesh.setMatrixAt(i, _m);
        });
        mesh.instanceMatrix.needsUpdate = true;
      }
    },
  };
}
