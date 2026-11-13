// Hinh anh cua Hat Nang: nhung vien sang vang lo lung, xoay va nhap nho; nhat roi thi bien mat. Du lieu den tu collect-core.js.
import * as THREE from 'three';

const SEED_COLOR = 0xffd75e, SEED_GLOW = 2.4;        // sang hon 1 de lop bloom bat duoc
const SEED_SIZE = 0.24, BOB = 0.14, SPIN = 1.8;
const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _e = new THREE.Euler();

export function createSeedViews(scene, collection) {
  const mesh = new THREE.InstancedMesh(new THREE.OctahedronGeometry(SEED_SIZE, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color(SEED_COLOR).multiplyScalar(SEED_GLOW) }), collection.items.length);
  mesh.frustumCulled = false; scene.add(mesh);
  return {
    update(time) {
      collection.items.forEach((item, i) => {
        const size = item.taken ? 0 : 1 + 0.12 * Math.sin(time * 3 + i);
        _m.compose(_p.set(item.x, item.y + Math.sin(time * 2 + i * 1.3) * BOB, item.z), _q.setFromEuler(_e.set(0, time * SPIN + i, 0)), _s.set(size, size * 1.35, size));
        mesh.setMatrixAt(i, _m);
      });
      mesh.instanceMatrix.needsUpdate = true;
    },
    /** Go khoi canh (Hat Nang moc lai chi song mot chuyen di). */
    dispose() { scene.remove(mesh); mesh.geometry.dispose(); mesh.material.dispose(); },
  };
}
