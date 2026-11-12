import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { MILL, height } from './layout.js';
import { B, world } from './island.js';
import { Builder, C, TRS, smooth } from '../core/util.js';
import { MATS } from './materials.js';

// ---------------------------------------------------------------- windmill
const rotor = new THREE.Group();
{
  const y0 = height(MILL.x, MILL.z), ry = -0.75;
  B.add('clay', new THREE.CylinderGeometry(0.72, 1.15, 3.7, 24, 6), TRS(MILL.x, y0 + 1.8, MILL.z), (c, x, y) => c.set(0xfff0d8).lerp(C(0xf0cba6), smooth(y0 + 1.2, y0, y)));
  B.add('gloss', new THREE.ConeGeometry(1.02, 1.25, 28, 4), TRS(MILL.x, y0 + 4.25, MILL.z), 0x3aa7c9);
  B.add('gloss', new RoundedBoxGeometry(0.6, 1.1, 0.14, 4, 0.06), TRS(MILL.x + Math.sin(ry) * 1.03, y0 + 0.6, MILL.z + Math.cos(ry) * 1.03, 0.12, ry, 0), 0xe9573f);
  B.add('glow', new THREE.CircleGeometry(0.2, 24), TRS(MILL.x + Math.sin(ry) * 0.9, y0 + 2.3, MILL.z + Math.cos(ry) * 0.9, 0.12, ry, 0), C(0xffc56b), { ao: false, gain: 3 });
  const RB = new Builder();
  RB.add('clay', new THREE.SphereGeometry(0.2, 16, 12), TRS(0, 0, 0), 0x8a5f3f);
  RB.add('clay', new THREE.CylinderGeometry(0.07, 0.07, 0.5, 10), TRS(0, 0, -0.25, Math.PI / 2, 0, 0), 0x8a5f3f);
  for (let k = 0; k < 4; k++) {
    const a = k * Math.PI / 2, m = TRS(0, 0, 0.05, 0, 0, a);
    RB.add('clay', new RoundedBoxGeometry(0.07, 2.5, 0.07, 2, 0.025), m.clone().multiply(TRS(0, 1.25, 0)), 0x8a5f3f);
    RB.add('clay', new RoundedBoxGeometry(0.5, 1.75, 0.035, 3, 0.015), m.clone().multiply(TRS(0.27, 1.55, 0.02, 0, 0.12, 0)), 0xfff6ea);
  }
  RB.build(rotor, MATS);
  rotor.position.set(MILL.x + Math.sin(ry) * 1.0, y0 + 3.35, MILL.z + Math.cos(ry) * 1.0);
  rotor.rotation.order = 'YXZ'; rotor.rotation.y = ry;
  world.add(rotor);
}

export { rotor };
