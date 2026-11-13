// The gioi "Thung lung Ve": khong gian rong ~2 km, ve theo kieu phong nen phim hoat hinh ve tay
// (may tich dinh trang phang, dong co la dai mau phang, cac lop doi xa mo dan, rung thong sam, lang mai cam).
// Cung luat choi, cung nhan vat va he hoc tap voi Dao May; chi khac the gioi.
import '../core/quality.js';
import '../core/util.js';
import '../core/stage.js';
import '../world/materials.js';
import { SUN_DIR, U, camera, controls, scene, sun } from '../core/stage.js';
import { chr } from '../actors/mam.js';
import { EDGE, createTerrain, groundAt } from '../valley/terrain.js';
import { createSky } from '../valley/sky.js';
import { createGrass } from '../valley/grass.js';
import { createScenery } from '../valley/scenery.js';

const FAR_PLANE = 9000, SHADOW_HALF = 26, SHADOW_DISTANCE = 70;
const SPAWN = { x: 0, z: 0 };

// nang cao, hoi chech sau lung nguoi choi luc dau: dong co sang, may co khoi
SUN_DIR.set(-0.38, 0.78, 0.5).normalize();
camera.far = FAR_PLANE; camera.updateProjectionMatrix();
controls.target.set(0, groundAt(0, 0) + 2, 0); controls.maxDistance = 120;
camera.position.set(-14, groundAt(0, 0) + 9, 18);
Object.assign(sun.shadow.camera, { left: -SHADOW_HALF, right: SHADOW_HALF, top: SHADOW_HALF, bottom: -SHADOW_HALF, near: 1, far: SHADOW_DISTANCE * 2 });
sun.shadow.camera.updateProjectionMatrix();

createTerrain(scene);
const sky = createSky();
const grass = createGrass();
const scenery = createScenery(scene);
chr.position.set(SPAWN.x, groundAt(SPAWN.x, SPAWN.z), SPAWN.z);

export default {
  name: 'valley',
  groundAt, colliders: scenery.colliders, safeRadius: EDGE - 10,
  spawn: SPAWN,
  spawnSpots: [[14, 6], [-12, 10], [6, -16], [-18, -8], [22, -10], [-6, 20], [18, 18]],
  treeSpot: { x: 5, z: -6 },
  cameraYaw: -0.92, cameraPitch: 0.1, cameraLookHeight: 2.4, fogScale: 0.18, paint: true,
  sky,
  setGrassVisible(visible) { grass.group.visible = visible; },
  update(dt, time, ctx) {
    const focus = ctx.player ?? controls.target;
    grass.setCenter(focus.x, focus.z);
    if (!ctx.playing) U.player.value.set(SPAWN.x, chr.position.y, SPAWN.z);
    // bong do chi phu vung quanh nguoi choi
    sun.target.position.set(focus.x, ctx.player ? ctx.player.y : controls.target.y, focus.z);
    sun.position.copy(sun.target.position).addScaledVector(SUN_DIR, SHADOW_DISTANCE);
    scenery.rotor.rotation.z += dt * 0.5 * ctx.wind;
  },
};
