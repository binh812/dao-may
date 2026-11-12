// Diem vao: noi cac module, doi kich thuoc, vong lap khung hinh.
// thu tu nap module = thu tu dung canh (giu nguyen chuoi so ngau nhien)
import './core/quality.js';
import './core/util.js';
import './world/layout.js';
import './core/stage.js';
import './world/sky.js';
import './world/materials.js';
import './world/island.js';
import './world/village.js';
import './world/flora.js';
import './world/windmill.js';
import './world/scenery.js';
import './world/meadow.js';
import './world/water.js';
import './actors/actors.js';
import './fx/particles.js';
import './render/post.js';
import './fx/weather.js';
import './ui/panel.js';
import * as THREE from 'three';
import { Q, qs } from './core/quality.js';
import { SUN_DIR, U, camera, controls, renderer, scene, sun } from './core/stage.js';
import { aoQuad, aoRT, combinePass, composer, dofPass, fxaaPass, rtScene, volMat, volQuad, volRT } from './render/post.js';
import { motesScale } from './world/meadow.js';
import { sky } from './world/sky.js';
import { butterflies, chr, chrState, eyes, sprout, squash, walk } from './actors/actors.js';
import { WATER_Y, height } from './world/layout.js';
import { clamp } from './core/util.js';
import { rotor } from './world/windmill.js';
import { createPlay } from './game/play.js';
import { updateWeather, weatherNow } from './fx/weather.js';
import { clouds } from './world/scenery.js';

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
const clock = new THREE.Clock(), fpsEl = document.getElementById('fps'), infoEl = document.getElementById('info');
const _v = new THREE.Vector3(), _t = new THREE.Vector3();
let frames = 0, accTime = 0, slow = 0;
function tick() {
  const dt = Math.min(clock.getDelta(), 0.05), t = (U.time.value += dt);
  if (play) play.update(dt); else controls.update();
  sky.position.copy(camera.position);
  U.sunView.value.copy(SUN_DIR).transformDirection(camera.matrixWorldInverse);

  if (!play) {
  // character: hop along the loop
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
  eyes.forEach(e => e.scale.y = bl);
  U.player.value.set(_v.x, gy, _v.z);
  }

  rotor.rotation.z += dt * 0.7 * weatherNow.wind;
  clouds.rotation.y += dt * 0.006 * weatherNow.wind;
  for (const b of butterflies) {
    const a = t * b.sp + b.ph, x = b.c.x + Math.sin(a) * 1.8 + Math.sin(a * 2.3) * 0.5, z = b.c.z + Math.cos(a * 0.8) * 1.8;
    b.g.position.set(x, Math.max(height(x, z), WATER_Y) + 0.9 + Math.sin(a * 3.1) * 0.3, z);
    b.g.rotation.y = Math.atan2(Math.cos(a) * 1.8, -Math.sin(a * 0.8) * 1.44);
    const f = Math.sin(t * 16 + b.ph) * 0.9; b.l.rotation.z = f; b.r.rotation.z = -f;
  }
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
