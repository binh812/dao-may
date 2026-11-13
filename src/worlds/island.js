// The gioi "Dao May": dao bay ban dau. Thu tu import ben duoi la thu tu dung canh (giu nguyen chuoi so ngau nhien).
import '../core/quality.js';
import '../core/util.js';
import '../world/layout.js';
import '../core/stage.js';
import '../world/sky.js';
import '../world/materials.js';
import '../world/island.js';
import '../world/village.js';
import '../world/flora.js';
import '../world/windmill.js';
import '../world/scenery.js';
import '../world/meadow.js';
import '../world/water.js';
import '../actors/actors.js';
import * as THREE from 'three';
import { U } from '../core/stage.js';
import { clamp } from '../core/util.js';
import { R, WATER_Y, height } from '../world/layout.js';
import { colliders, groundAt } from '../world/colliders.js';
import { sky } from '../world/sky.js';
import { grass } from '../world/meadow.js';
import { rotor } from '../world/windmill.js';
import { clouds } from '../world/scenery.js';
import { butterflies, chrState, walk } from '../actors/actors.js';
import { chr, eyes, sprout, squash } from '../actors/mam.js';

const _v = new THREE.Vector3(), _t = new THREE.Vector3();

/** Che do ngam canh: Mam tu nhay theo mot vong quanh san. */
function autoWalk(dt) {
  const st = chrState; st.hop += dt * 2.3; const ph = st.hop % 1, air = ph < 0.62;
  if (air) st.u = (st.u + dt * 0.03) % 1;
  walk.getPointAt(st.u, _v); walk.getTangentAt(st.u, _t);
  const jump = air ? Math.sin(Math.PI * ph / 0.62) : 0, land = air ? 0 : Math.sin(Math.PI * (ph - 0.62) / 0.38);
  const gy = height(_v.x, _v.z), y = gy + jump * 0.42;
  chr.position.set(_v.x, y, _v.z); chr.rotation.y = Math.atan2(_t.x, _t.z);
  const sy = 1 + jump * 0.13 - land * 0.2, sxz = 1 / Math.sqrt(sy);
  squash.scale.set(sxz, sy, sxz);
  const vy = (y - st.lastY) / Math.max(dt, 1e-3); st.lastY = y;
  st.sv += (-90 * (st.sa + vy * 0.12) - 9 * st.sv) * dt; st.sa += st.sv * dt; sprout.rotation.x = clamp(st.sa, -1, 1);
  st.blink -= dt; const bl = st.blink < 0.12 ? 0.12 : 1.15; if (st.blink < 0) st.blink = 2 + Math.random() * 3;
  eyes.forEach((e) => { e.scale.y = bl; });
  U.player.value.set(_v.x, gy, _v.z);
}

export default {
  name: 'island',
  groundAt, colliders, safeRadius: R - 1.5,
  spawn: { x: -3.2, z: 2.4 },
  spawnSpots: [[1.5, 6.0], [-6.5, 5.5], [-0.5, -2.0], [-7.5, 2.0], [2.5, -3.0], [0, 8.5], [-4, 9]],
  treeSpot: { x: -1.6, z: 5.2 },
  cameraYaw: -0.75, fogScale: 1, paint: false,
  sky,
  setGrassVisible(visible) { grass.visible = visible; },
  update(dt, time, ctx) {
    if (!ctx.playing) autoWalk(dt);
    rotor.rotation.z += dt * 0.7 * ctx.wind;
    clouds.rotation.y += dt * 0.006 * ctx.wind;
    for (const b of butterflies) {
      const a = time * b.sp + b.ph, x = b.c.x + Math.sin(a) * 1.8 + Math.sin(a * 2.3) * 0.5, z = b.c.z + Math.cos(a * 0.8) * 1.8;
      b.g.position.set(x, Math.max(height(x, z), WATER_Y) + 0.9 + Math.sin(a * 3.1) * 0.3, z);
      b.g.rotation.y = Math.atan2(Math.cos(a) * 1.8, -Math.sin(a * 0.8) * 1.44);
      const f = Math.sin(time * 16 + b.ph) * 0.9; b.l.rotation.z = f; b.r.rotation.z = -f;
    }
  },
};
