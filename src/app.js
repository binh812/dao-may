// Phan dung chung cho moi the gioi: doi kich thuoc, vong lap khung hinh. Duoc nap SAU khi the gioi da dang ky (xem main.js).
import './fx/particles.js';
import './render/post.js';
import './fx/weather.js';
import './ui/panel.js';
import * as THREE from 'three';
import { Q, qs } from './core/quality.js';
import { SUN_DIR, U, camera, controls, motesScale, renderer, scene, sun } from './core/stage.js';
import { aoQuad, aoRT, combinePass, composer, dofPass, fxaaPass, keepSharp, rtScene, volMat, volQuad, volRT } from './render/post.js';
import { realm } from './world/realm.js';
import { createPlay } from './game/play.js';
import { HERO_HEIGHT, updateHero } from './actors/hero.js';
import { chr } from './actors/mam.js';
import { createSession } from './game/session.js';
import { updateWeather, weatherNow } from './fx/weather.js';

// ---------------------------------------------------------------- resize / dynamic resolution
let resScale = 1;
function resize() {
  const w = innerWidth, h = innerHeight, pr = Math.min(devicePixelRatio || 1, Q.dpr) * resScale, W = Math.max(2, Math.round(w * pr)), Hh = Math.max(2, Math.round(h * pr));
  renderer.setPixelRatio(pr); renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.fov = w < h ? 52 : 38; camera.updateProjectionMatrix();
  rtScene.setSize(W, Hh); aoRT.setSize(W >> 1, Hh >> 1); volRT.setSize(Math.max(2, W >> 2), Math.max(2, Hh >> 2));
  composer.setPixelRatio(pr); composer.setSize(w, h);
  combinePass.uniforms.uAOTexel.value.set(2 / W, 2 / Hh);
  dofPass.uniforms.uTexel.value.set(1 / W, 1 / Hh).multiplyScalar(Hh / 1080 * 3.2);
  fxaaPass.material.uniforms.resolution.value.set(1 / W, 1 / Hh);
  motesScale.value = Hh;
}
addEventListener('resize', resize); resize();

// ---------------------------------------------------------------- loop
// Mac dinh la che do choi; ?mode=view giu che do ngam canh cu (xoay tu do, Mam tu nhay theo vong).
const play = qs.get('mode') === 'view' ? null : createPlay();
const session = play ? createSession(play) : null;
if (session && qs.has('mill')) setTimeout(() => session.debugMill(), 600); // chi de chup anh kiem tra me bot
if (session && qs.has('shop')) setTimeout(() => session.debugShop(), 600); // chi de chup anh kiem tra bang doi do
if (session && qs.has('puzzle')) setTimeout(() => session.debugPuzzle(qs.get('puzzle')), 600); // chi de chup anh kiem tra do vui: ?puzzle=balance|pour|pattern|garden
if (session && qs.has('oanquan')) setTimeout(() => session.debugOanQuan(), 600); // chi de chup anh kiem tra ban o an quan
if (session && qs.has('ask')) setTimeout(() => session.debugAsk(), 600); // chi de chup anh kiem tra the bai tap
const clock = new THREE.Clock(), fpsEl = document.getElementById('fps'), infoEl = document.getElementById('info');
let frames = 0, accTime = 0, slow = 0;
const sharpCentre = new THREE.Vector3();
function tick() {
  const dt = Math.min(clock.getDelta(), 0.05), t = (U.time.value += dt);
  if (play) { play.update(dt * session.timeScale()); session.update(dt); } else { controls.update(); updateHero(dt, 0, true); }   // ngam canh: Mam van tho, khong dung cung o tu the goc
  realm.sky.position.copy(camera.position);
  // Mam khong qua lop loc net co: mat va trang phuc giu net (nua be ngang va nua chieu cao tinh ca mu, choi la)
  keepSharp(sharpCentre.set(chr.position.x, chr.position.y + HERO_HEIGHT * 0.56, chr.position.z), HERO_HEIGHT * 0.42, HERO_HEIGHT * 0.72);
  U.sunView.value.copy(SUN_DIR).transformDirection(camera.matrixWorldInverse);

  realm.update(dt, t, { playing: Boolean(play), wind: weatherNow.wind, player: play ? play.player : null });
  dofPass.uniforms.uFocus.value = play ? play.focusDistance() : camera.position.distanceTo(controls.target);
  dofPass.uniforms.uRange.value = dofPass.uniforms.uFocus.value * 0.5;

  updateWeather(dt);
  renderer.info.reset();
  renderer.setRenderTarget(rtScene); renderer.render(scene, camera);
  const calls = renderer.info.render.calls, tris = renderer.info.render.triangles;
  if (combinePass.uniforms.uAO.value > 0) { renderer.setRenderTarget(aoRT); aoQuad.render(renderer); }
  if (combinePass.uniforms.uVolOn.value > 0 && sun.shadow.map) { volMat.uniforms.tShadow.value = sun.shadow.map.texture; renderer.setRenderTarget(volRT); volQuad.render(renderer); }
  renderer.setRenderTarget(null);
  composer.render(dt);

  frames++; accTime += dt;
  if (accTime >= 1) {
    const fps = frames / accTime; frames = 0; accTime = 0;
    fpsEl.textContent = fps.toFixed(0) + ' fps';
    infoEl.textContent = `${calls} lệnh vẽ · ${(tris / 1000).toFixed(0)}k tam giác · ${Math.round(resScale * 100)}%`;
    if (qs.get('dyn') !== '0') {
      if (fps < 42) { if (++slow >= 2 && resScale > 0.6) { resScale = Math.max(0.6, resScale - 0.1); slow = 0; resize(); } }
      else { slow = 0; if (fps > 57 && resScale < 1) { resScale = Math.min(1, resScale + 0.05); resize(); } }
    }
  }
  requestAnimationFrame(tick);
}
renderer.compile(scene, camera);
requestAnimationFrame(() => { tick(); const l = document.getElementById('loading'); l.style.opacity = 0; setTimeout(() => l.remove(), 700); });
