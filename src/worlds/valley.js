// The gioi "Thung lung Ve": khong gian rong ~2 km, ve theo kieu phong nen phim hoat hinh ve tay
// (may tich dinh trang phang, dong co la dai mau phang, cac lop doi xa mo dan, rung thong sam, lang mai cam).
// Cung luat choi, cung nhan vat va he hoc tap voi Dao May; chi khac the gioi.
import { qs } from '../core/quality.js';
import '../core/util.js';
import '../core/stage.js';
import '../world/materials.js';
import { SUN_DIR, U, camera, controls, scene, sun } from '../core/stage.js';
import { chr } from '../actors/mam.js';
import { CAMP_SPOTS, EDGE, createTerrain, groundAt } from '../valley/terrain.js';
import { createSky } from '../valley/sky.js';
import { createGrass } from '../valley/grass.js';
import { createScenery } from '../valley/scenery.js';

const FAR_PLANE = 10500, SHADOW_HALF = 26, SHADOW_DISTANCE = 70;
// Tham so thu `at=x,z`: sinh ra o cho khac de chup anh kiem tra (vd. at=300,-215 la mep lang)
const askedSpot = (qs.get('at') ?? '').split(',').map(Number);
const SPAWN = askedSpot.length === 2 && askedSpot.every(Number.isFinite) && Math.hypot(...askedSpot) < EDGE - 20 ? { x: askedSpot[0], z: askedSpot[1] } : { x: 0, z: 0 };
// Moi chuyen di, Bong Lang ngu o mot noi xa dan: doi co -> bia dong -> duong xuong thung -> mep lang -> coi xay -> bia rung.
const CAMP_HINTS = [
  { hint: 'Các Bóng Lặng đang ngủ quanh đây. Lại gần và đánh thức chúng!' },
  { hint: 'Chuyến 2: có Bóng Lặng ngủ ở bìa đồng cỏ. Đi theo mũi tên nhé!' },
  { hint: 'Chuyến 3: Bóng Lặng đang ngủ trên đường xuống thung lũng.' },
  { hint: 'Chuyến 4: ngôi làng mái cam đang ngủ gật. Tới đánh thức nào!' },
  { hint: 'Chuyến 5: cối xay gió ngừng quay rồi. Bóng Lặng ở quanh đó.' },
  { hint: 'Chuyến 6: Bóng Lặng trốn ở bìa rừng thông.' },
];
const CAMPS = CAMP_SPOTS.map(([x, z], i) => ({ x, z, hint: CAMP_HINTS[i].hint }));
const CAMP_RING = [[10, 4], [-9, 8], [5, -12], [-13, -6], [15, -8], [-4, 14], [12, 12]];
const campFor = (wave) => CAMPS[(wave - 1) % CAMPS.length];
const MASSIF_HIDDEN_OVERCAST = 0.6;
const MIST_BELOW_PLAYER = 5; // suong dong o cho trung, thap hon cho nguoi choi dung

// nang cao, hoi chech sau lung nguoi choi luc dau: dong co sang, may co khoi
SUN_DIR.set(-0.38, 0.78, 0.5).normalize();
camera.far = FAR_PLANE; camera.updateProjectionMatrix();
controls.target.set(SPAWN.x, groundAt(SPAWN.x, SPAWN.z) + 2, SPAWN.z); controls.maxDistance = 120;
camera.position.set(SPAWN.x - 14, groundAt(SPAWN.x, SPAWN.z) + 9, SPAWN.z + 18);
Object.assign(sun.shadow.camera, { left: -SHADOW_HALF, right: SHADOW_HALF, top: SHADOW_HALF, bottom: -SHADOW_HALF, near: 1, far: SHADOW_DISTANCE * 2 });
sun.shadow.camera.updateProjectionMatrix();

createTerrain(scene);
const sky = createSky();
const grass = createGrass();
const scenery = createScenery(scene, grass.center);
chr.position.set(SPAWN.x, groundAt(SPAWN.x, SPAWN.z), SPAWN.z);

export default {
  name: 'valley',
  groundAt, colliders: scenery.colliders, safeRadius: EDGE - 10,
  respawnY: -Infinity,                 // co tuong chan o mep, khong the roi; long thung lung nam duoi muc roi mac dinh
  mistScale: 0.12, mistFloor: 0,                        // cap nhat moi khung hinh: suong bam theo mat dat cho nguoi choi dung
  spawn: SPAWN,
  spawnSpots: CAMP_RING.map(([dx, dz]) => [CAMPS[0].x + dx, CAMPS[0].z + dz]),
  spotsForWave: (wave) => { const camp = campFor(wave); return CAMP_RING.map(([dx, dz]) => [camp.x + dx, camp.z + dz]); },
  waveHint: (wave) => campFor(wave).hint,
  sprintScale: 1.9,                    // the gioi rong: giu can het co thi Mam chay nhanh gan gap doi
  treeSpot: { x: 3.5, z: -9 },
  cameraYaw: -0.92, cameraPitch: 0.04, cameraLookHeight: 3.0, fogScale: 0.18, paint: true,
  sky: sky.mesh,
  setGrassVisible(visible) { grass.group.visible = visible; },
  update(dt, time, ctx) {
    const focus = ctx.player ?? controls.target;
    grass.setCenter(focus.x, focus.z);
    this.mistFloor = groundAt(focus.x, focus.z) - MIST_BELOW_PLAYER;
    if (!ctx.playing) U.player.value.set(SPAWN.x, chr.position.y, SPAWN.z);
    // bong do chi phu vung quanh nguoi choi
    sun.target.position.set(focus.x, ctx.player ? ctx.player.y : controls.target.y, focus.z);
    sun.position.copy(sun.target.position).addScaledVector(SUN_DIR, SHADOW_DISTANCE);
    scenery.rotor.rotation.z += dt * 0.5 * ctx.wind;
    sky.drift(dt, ctx.wind);
    scenery.life.update(dt, time);
    scenery.massifs.visible = U.overcast.value < MASSIF_HIDDEN_OVERCAST;   // troi mua: nui xa khuat sau man may (nui khong chiu suong cua canh)
  },
};
