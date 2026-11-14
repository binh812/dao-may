// Dan lang: nhan vat dung san trong the gioi (the gioi khai bao o `realm.villagers`). Moi nguoi la mot mo hinh .glb dung tu ban ve
// (tools/blender/tu_anh.py), dung tho tai cho, quay mat ve phia Mam khi be lai gan va chao mot cau. Khong giao bai, khong doi gi:
// chi de the gioi co nguoi. Nap khong duoc mo hinh nao thi bo qua nguoi do, game van chay.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const BAKED_GLOW = 0.38;                 // nhu Mam: phan mau cua anh luon hien du o trong bong
const TURN_RATE = 5;                     // toc do quay mat ve phia Mam (1/giay)
const NOTICE = 9, GREET = 4.2, FORGET = 12;   // (m) thay Mam thi quay lai; gan hon thi chao; di xa hon muc nay moi chao lai
const BODY_RADIUS = 0.45;                // (m) dan lang la vat can: Mam di vong qua chu khong xuyen qua
const BETWEEN_GREETINGS = 4;             // (giay) hai nguoi dung gan nhau khong chao de len nhau: nguoi sau cho nguoi truoc noi xong

function angleDelta(from, to) { return Math.atan2(Math.sin(to - from), Math.cos(to - from)); }

/**
 * spots: [{ id, model, name, height, x, z, yaw, radius?, lines: [cau chao...] }]; `colliders` la mang vat can cua the gioi (them vao tai cho). Tra ve { update(dt, player, canGreet) -> cau chao moi hoac null }.
 */
export function createVillagers(scene, spots, groundAt, colliders) {
  const people = [], loader = new GLTFLoader();
  let quiet = 0;
  for (const spot of spots) {
    const person = { spot, root: new THREE.Group(), mixer: null, yaw: spot.yaw ?? 0, greeted: false, next: 0 };
    person.root.position.set(spot.x, groundAt(spot.x, spot.z), spot.z); person.root.rotation.y = person.yaw;
    scene.add(person.root); people.push(person);
    loader.load(new URL(`../../assets/models/${spot.model}.glb`, import.meta.url).href, (gltf) => {
      const idle = gltf.animations.find((clip) => clip.name === 'Idle');
      if (!idle) { console.error(`Mo hinh ${spot.model} thieu doan Idle, bo qua nguoi nay`); return; }
      const model = gltf.scene;
      model.scale.setScalar(spot.height);                // mo hinh nhin ve +Z, cung quy uoc yaw voi Mam
      model.traverse((node) => {
        if (!node.isMesh) return;
        // mo hinh dung tu ban ve (co anh hoa tiet): vat lieu nhu Mam. Mo hinh to mau tron (ban Nhim) giu vat lieu goc.
        const painted = (material) => { const map = material.map; if (!map) return material; map.anisotropy = 4; return new THREE.MeshLambertMaterial({ map, emissiveMap: map, emissive: new THREE.Color(BAKED_GLOW, BAKED_GLOW, BAKED_GLOW), side: THREE.DoubleSide }); };
        node.material = Array.isArray(node.material) ? node.material.map(painted) : painted(node.material);
        node.castShadow = true; node.frustumCulled = false;
      });
      person.root.add(model);
      colliders.push({ x: spot.x, z: spot.z, r: spot.radius ?? BODY_RADIUS });   // chi thanh vat can khi da hien hinh: nap loi thi khong de lai buc tuong vo hinh
      person.mixer = new THREE.AnimationMixer(model);
      const action = person.mixer.clipAction(idle); action.time = people.indexOf(person) * 0.7; action.play();   // lech nhip de hai nguoi khong tho deu tam tap
    }, undefined, (error) => console.error(`Khong nap duoc mo hinh ${spot.model}:`, error));
  }
  return {
    /**
     * Goi moi khung hinh. Tra ve { id, name, text } khi mot nguoi vua chao Mam, nguoc lai null. `canGreet` = false (dang mo bang, dang
     * giai do) thi chua chao: loi chao de danh den khi be nhin thay duoc.
     */
    update(dt, player, canGreet = true) {
      let said = null;
      if (Number.isFinite(dt)) quiet = Math.max(0, quiet - dt);
      for (const person of people) {
        if (!person.mixer || !Number.isFinite(dt)) continue;
        person.mixer.update(dt);
        const dx = player.x - person.spot.x, dz = player.z - person.spot.z, far = Math.hypot(dx, dz);
        const facing = far < NOTICE ? Math.atan2(dx, dz) : (person.spot.yaw ?? 0);
        person.yaw += angleDelta(person.yaw, facing) * (1 - Math.exp(-dt * TURN_RATE));
        person.root.rotation.y = person.yaw;
        if (far > FORGET) person.greeted = false;
        if (far < GREET && !person.greeted && canGreet && quiet === 0) {
          person.greeted = true; quiet = BETWEEN_GREETINGS;
          said = { id: person.spot.id, name: person.spot.name, text: person.spot.lines[person.next++ % person.spot.lines.length] };
        }
      }
      return said;
    },
  };
}
