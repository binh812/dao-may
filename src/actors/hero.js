// Mam dang nguoi: nap mo hinh .glb (dung bang tools/blender/tu_anh.py tu ban ve), thay cho than bong tron cu, va chay hoat anh
// dung yen / di bo theo toc do. Mo hinh nam trong nhom `squash` nen van nhun, nghieng, co gian nhu truoc; choi la va trang phuc
// duoc dat lai cho khop dang moi. Nap khong duoc thi giu than cu: game van choi binh thuong.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { body, squash } from './mam.js';
import { fitOutfit } from './outfit.js';

const MODEL_URL = new URL('../../assets/models/mam.glb', import.meta.url).href;
const HEIGHT = 1.3;                               // chieu cao cua Mam trong game (m); mo hinh goc cao 1 don vi
// cho dat trang phuc tren dang moi: dinh mu trum, co, va ti le so voi than bong cu (ban kinh 0.5)
const FIT = { sproutY: 1.27, hatY: 1.24, hatScale: 0.46, scarfY: 0.93, scarfScale: 0.40 };
const WALK_STRIDE_SPEED = 2.4;                    // toc do (m/s) ma doan Walk chay dung nhip goc
const BAKED_GLOW = 0.38;                          // phan mau cua anh luon hien du o trong bong: giu duoc net ve, khong bi den kit khi quay lung ve nang
const BLEND_RATE = 9, MOVING_FROM = 0.5, AIR_WALK = 0.35;

export const hero = { ready: false, failed: null };
let mixer = null, idle = null, walk = null, moving = 0;

new GLTFLoader().load(MODEL_URL, (gltf) => {
  const model = gltf.scene;
  model.scale.setScalar(HEIGHT);
  model.traverse((node) => {
    if (!node.isMesh) return;
    // anh da ve san sang toi: dung vat lieu Lambert de van chiu den va bong cua canh (dem thi toi di) ma khong bong lay
    node.material = new THREE.MeshLambertMaterial({ map: node.material.map, emissiveMap: node.material.map, emissive: new THREE.Color(BAKED_GLOW, BAKED_GLOW, BAKED_GLOW) });
    node.castShadow = true; node.receiveShadow = false; node.frustumCulled = false;   // luoi co xuong: khung bao khong theo hoat anh
  });
  squash.add(model);
  for (const mesh of body) mesh.visible = false;
  fitOutfit(FIT);
  mixer = new THREE.AnimationMixer(model);
  const clip = (name) => { const found = gltf.animations.find((a) => a.name === name); if (!found) throw new Error(`mam.glb thieu doan hoat anh ${name}`); return mixer.clipAction(found); };
  idle = clip('Idle'); walk = clip('Walk');
  idle.play(); walk.play(); walk.setEffectiveWeight(0);
  hero.ready = true;
}, undefined, (error) => {
  hero.failed = error;
  console.error('Khong nap duoc mo hinh Mam, giu hinh cu:', error);
});

/** Goi moi khung hinh: tron giua dung yen va di bo theo toc do ngang; tren khong thi chan dua cham. */
export function updateHero(dt, speed, grounded) {
  if (!hero.ready) return;
  const target = speed > MOVING_FROM ? 1 : 0;
  moving += (target - moving) * (1 - Math.exp(-dt * BLEND_RATE));
  walk.setEffectiveWeight(moving); idle.setEffectiveWeight(1 - moving);
  walk.timeScale = grounded ? Math.max(speed / WALK_STRIDE_SPEED, 0.6) : AIR_WALK;
  mixer.update(dt);
}
