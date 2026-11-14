// Mam dang nguoi: nap mo hinh .glb (dung bang tools/blender/tu_anh.py tu ban ve), thay cho than bong tron cu, va chay hoat anh
// dung yen / di bo theo toc do, nhay / luon khi o tren khong. Mo hinh nam trong nhom `squash` nen van nhun, nghieng, co gian nhu truoc; choi la va trang phuc
// duoc dat lai cho khop dang moi. Nap khong duoc thi giu than cu: game van choi binh thuong.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { body, squash } from './mam.js';
import { carryOutfit, fitOutfit } from './outfit.js';

const MODEL_URL = new URL('../../assets/models/mam.glb', import.meta.url).href;
const HEIGHT = 1.5;                               // chieu cao cua Mam trong game (m); mo hinh goc cao 1 don vi
export const HERO_HEIGHT = HEIGHT;
// cho dat trang phuc tren dang moi (ti le theo chieu cao): dinh mu trum, co, va co so voi than bong cu (ban kinh 0.5)
const FIT = { sproutY: 0.977 * HEIGHT, hatY: 0.954 * HEIGHT, hatScale: 0.354 * HEIGHT, scarfY: 0.715 * HEIGHT, scarfScale: 0.308 * HEIGHT };
const WALK_STRIDE_SPEED = 2.4;                    // toc do (m/s) ma doan Walk chay dung nhip goc
const BAKED_GLOW = 0.38;                          // phan mau cua anh luon hien du o trong bong: giu duoc net ve, khong bi den kit khi quay lung ve nang
const BLEND_RATE = 9, MOVING_FROM = 0.5, AIR_WALK = 0.35;
const AIR_RATE = 14, GLIDE_RATE = 7;              // roi dat thi vao tu the nhay gan nhu ngay; dang tay luon thi tu tu hon

export const hero = { ready: false, failed: null };
// Mu, choi la bam theo xuong dau; khan bam theo xuong nguc. Moi khung phu mang do lech cua xuong so voi tu the nghi,
// nen trang phuc van dat theo toa do cua `squash` nhu truoc ma van gat gu, nghieng theo dau.
const CARRIERS = ['head', 'chest'];
let carried = [];                                 // [{ bone, rig, restInverse }]
const toSquash = new THREE.Matrix4();
let mixer = null, idle = null, walk = null, jump = null, glide = null, moving = 0, air = 0, soaring = 0;

new GLTFLoader().load(MODEL_URL, (gltf) => {
  const model = gltf.scene;
  // kiem du doan hoat anh TRUOC khi dung vao canh: thieu thi nem loi o day, than cu van con nguyen
  const clips = Object.fromEntries(['Idle', 'Walk'].map((name) => [name, gltf.animations.find((a) => a.name === name)]));
  for (const [name, found] of Object.entries(clips)) if (!found) throw new Error(`mam.glb thieu doan hoat anh ${name}`);
  model.scale.setScalar(HEIGHT);
  model.traverse((node) => {
    if (!node.isMesh) return;
    // anh da ve san sang toi: dung vat lieu Lambert de van chiu den va bong cua canh (dem thi toi di) ma khong bong lay
    node.material = new THREE.MeshLambertMaterial({ map: node.material.map, emissiveMap: node.material.map, emissive: new THREE.Color(BAKED_GLOW, BAKED_GLOW, BAKED_GLOW), side: THREE.DoubleSide });
    node.material.map.anisotropy = 8;                 // nhin xien van net
    node.castShadow = true; node.receiveShadow = false; node.frustumCulled = false;   // luoi co xuong: khung bao khong theo hoat anh
  });
  squash.add(model);
  for (const mesh of body) mesh.visible = false;
  fitOutfit(FIT);
  const bones = CARRIERS.map((name) => model.getObjectByName(name));
  if (bones.every(Boolean)) {                         // thieu xuong thi trang phuc o nguyen tren `squash`
    squash.updateWorldMatrix(true, true);
    toSquash.copy(squash.matrixWorld).invert();
    carried = bones.map((bone) => {
      const rig = new THREE.Group(); rig.matrixAutoUpdate = false; squash.add(rig);
      return { bone, rig, restInverse: new THREE.Matrix4().multiplyMatrices(toSquash, bone.matrixWorld).invert() };
    });
    carryOutfit(carried[0].rig, carried[1].rig);
  }
  mixer = new THREE.AnimationMixer(model);
  idle = mixer.clipAction(clips.Idle); walk = mixer.clipAction(clips.Walk);
  idle.play(); walk.play(); walk.setEffectiveWeight(0);
  // Jump va Glide la tuy chon: mo hinh cu khong co thi tren khong van dua chan cham nhu truoc
  const airClips = ['Jump', 'Glide'].map((name) => gltf.animations.find((a) => a.name === name));
  if (airClips.every(Boolean)) {
    [jump, glide] = airClips.map((clip) => mixer.clipAction(clip));
    for (const action of [jump, glide]) { action.play(); action.setEffectiveWeight(0); }
  }
  hero.ready = true;
}, undefined, (error) => {
  hero.failed = error;
  console.error('Khong nap duoc mo hinh Mam, giu hinh cu:', error);
});

/** Goi moi khung hinh: tren mat dat tron giua dung yen va di bo theo toc do ngang; tren khong tron sang nhay, dang luon thi sang luon. */
export function updateHero(dt, speed, grounded, gliding = false) {
  if (!hero.ready || !Number.isFinite(dt) || !Number.isFinite(speed)) return;   // so hong ma lot vao mixer thi luoi bien mat han
  const target = speed > MOVING_FROM ? 1 : 0;
  moving += (target - moving) * (1 - Math.exp(-dt * BLEND_RATE));
  if (jump) {
    air += ((grounded ? 0 : 1) - air) * (1 - Math.exp(-dt * AIR_RATE));
    soaring += ((gliding && !grounded ? 1 : 0) - soaring) * (1 - Math.exp(-dt * (grounded ? AIR_RATE : GLIDE_RATE)));   // cham dat thi bo tu the luon ngay, kem lan nhay ke tiep khong con dang tay
    jump.setEffectiveWeight(air * (1 - soaring)); glide.setEffectiveWeight(air * soaring);
  }
  walk.setEffectiveWeight(moving * (1 - air)); idle.setEffectiveWeight((1 - moving) * (1 - air));
  walk.timeScale = grounded ? Math.max(speed / WALK_STRIDE_SPEED, 0.6) : AIR_WALK;
  mixer.update(dt);
  if (!carried.length) return;
  squash.updateWorldMatrix(true, true);               // xuong vua doi tu the: tinh lai ma tran roi lay do lech so voi luc nghi
  toSquash.copy(squash.matrixWorld).invert();
  for (const { bone, rig, restInverse } of carried) { rig.matrix.multiplyMatrices(toSquash, bone.matrixWorld).multiply(restInverse); rig.matrixWorldNeedsUpdate = true; }
}
