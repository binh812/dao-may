// Che do choi: noi dau vao -> loi di chuyen -> nhan vat va may quay bam sau lung.
// Khong chua luat choi; luat nam o player-core.js (co test).
import * as THREE from 'three';
import { camera, controls, U } from '../core/stage.js';
import { realm } from '../world/realm.js';
import { chr, eyes, sprout, squash } from '../actors/mam.js';
import { TUNING, createPlayer, stepPlayer } from './player-core.js';
import { cameraRelative, steerYaw } from './input-core.js';
import { createTouchControls } from './touch-controls.js';

const CAMERA = { distance: 8.5, portraitDistance: 10.5, pitch: 0.42, minPitch: 0.12, maxPitch: 1.1, lookHeight: 1.1, clearance: 0.6, follow: 9, yawPerPixel: 0.006, pitchPerPixel: 0.004, steerAfter: 1.5, steerRate: 0.8 };
const HINT_SECONDS = 6;
const WALL_HEIGHT = 1e5; // the gioi tra do cao tu muc nay tro len cho vung khong duoc vao

const angleDelta = (from, to) => Math.atan2(Math.sin(to - from), Math.cos(to - from));

export function createPlay() {
  controls.enabled = false; controls.autoRotate = false;
  const world = { heightAt: (x, z) => realm.groundAt(x, z), colliders: realm.colliders, safeRadius: realm.safeRadius };
  const player = createPlayer(realm.spawn.x, realm.spawn.z, world);
  const input = createTouchControls(document.body);
  const cam = { yaw: realm.cameraYaw, pitch: realm.cameraPitch ?? CAMERA.pitch, idle: 99, snapped: false };
  player.yaw = cam.yaw + Math.PI; chr.rotation.y = player.yaw; // luc dau quay lung ve may quay
  const anim = { bob: 0, land: 0, lean: 0, leafAngle: 0, leafSpeed: 0, blink: 2 };
  const target = new THREE.Vector3(), desired = new THREE.Vector3(), lookAt = new THREE.Vector3();

  const panel = document.getElementById('panel');
  if (panel) { panel.style.zIndex = '5'; panel.classList.add('min'); }
  const hint = document.createElement('div');
  hint.textContent = 'Kéo bên trái để chạy · Chạm Nhảy để bật lên · Giữ Nhảy trên không để lượn';
  hint.style.cssText = 'position:fixed;left:50%;top:calc(max(10px,env(safe-area-inset-top)) + 46px);transform:translateX(-50%);z-index:4;max-width:86vw;padding:9px 14px;border-radius:14px;background:rgba(28,22,34,.55);color:#fff;font:600 14px/1.35 system-ui,sans-serif;text-align:center;pointer-events:none;transition:opacity .8s;';
  document.body.append(hint);
  let hintLeft = HINT_SECONDS;

  function updateCamera(dt, stick) {
    const portrait = innerHeight > innerWidth, dist = portrait ? CAMERA.portraitDistance : CAMERA.distance;
    if (cam.idle > CAMERA.steerAfter) cam.yaw += steerYaw(stick, dt, CAMERA.steerRate);
    target.set(player.x, player.y + (realm.cameraLookHeight ?? CAMERA.lookHeight), player.z);
    const cp = Math.cos(cam.pitch);
    desired.set(target.x + Math.sin(cam.yaw) * cp * dist, target.y + Math.sin(cam.pitch) * dist, target.z + Math.cos(cam.yaw) * cp * dist);
    const under = realm.groundAt(desired.x, desired.z); // ngoai mep (-Infinity) hoac tuong chan (rat lon) thi bo qua
    if (Number.isFinite(under) && under < WALL_HEIGHT) desired.y = Math.max(desired.y, under + CAMERA.clearance);
    const k = cam.snapped ? 1 - Math.exp(-dt * CAMERA.follow) : 1;
    camera.position.lerp(desired, k); lookAt.lerp(target, k); cam.snapped = true;
    camera.lookAt(lookAt);
  }

  function updateActor(dt, speed) {
    const running = player.grounded && speed > 0.5;
    anim.bob = running ? anim.bob + dt * speed * 2.3 : 0;
    if (player.events.landed) anim.land = 1;
    anim.land = Math.max(0, anim.land - dt * 5);
    const hop = running ? Math.abs(Math.sin(anim.bob)) : 0;
    const stretch = player.grounded ? 1 + hop * 0.08 - anim.land * 0.22 : 1 + THREE.MathUtils.clamp(player.vy * 0.02, -0.06, 0.16);
    const wide = 1 / Math.sqrt(stretch);
    squash.scale.set(wide, stretch, wide);
    chr.position.set(player.x, player.y + hop * 0.14, player.z);
    chr.rotation.y += angleDelta(chr.rotation.y, player.yaw) * (1 - Math.exp(-dt * 14));
    anim.lean += ((player.gliding ? 0.38 : running ? 0.1 : 0) - anim.lean) * (1 - Math.exp(-dt * 8));
    squash.rotation.x = anim.lean;
    // mam la: lo xo theo van toc dung, xoe to khi luon
    anim.leafSpeed += (-90 * (anim.leafAngle + player.vy * 0.05) - 9 * anim.leafSpeed) * dt; anim.leafAngle += anim.leafSpeed * dt;
    sprout.rotation.x = THREE.MathUtils.clamp(anim.leafAngle, -1, 1);
    const leaf = sprout.scale.x + ((player.gliding ? 2.6 : 1) - sprout.scale.x) * (1 - Math.exp(-dt * 12));
    sprout.scale.set(leaf, 1, leaf);
    anim.blink -= dt; if (anim.blink < 0) anim.blink = 2 + Math.random() * 3;
    const lid = anim.blink < 0.12 ? 0.12 : 1.15; eyes.forEach((e) => { e.scale.y = lid; });
    U.player.value.set(player.x, player.y, player.z);
  }

  return {
    player,
    update(dt) {
      const r = input.read();
      if (r.lookDX || r.lookDY) {
        cam.yaw -= r.lookDX * CAMERA.yawPerPixel;
        cam.pitch = THREE.MathUtils.clamp(cam.pitch + r.lookDY * CAMERA.pitchPerPixel, CAMERA.minPitch, CAMERA.maxPitch);
        cam.idle = 0;
      } else cam.idle += dt;
      const move = cameraRelative({ x: r.stickX, y: r.stickY }, cam.yaw);
      stepPlayer(player, { moveX: move.x, moveZ: move.z, jump: r.jump }, dt, world);
      const speed = Math.hypot(player.vx, player.vz);
      updateActor(dt, speed);
      updateCamera(dt, { x: r.stickX, y: r.stickY });
      if (hintLeft > 0) { hintLeft -= dt; if (hintLeft <= 0 || speed > TUNING.runSpeed * 0.5 && hintLeft < HINT_SECONDS - 2) { hint.style.opacity = '0'; hintLeft = 0; } }
    },
    focusDistance: () => camera.position.distanceTo(chr.position),
  };
}
