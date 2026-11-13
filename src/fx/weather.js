import * as THREE from 'three';
import { Q, qs } from '../core/quality.js';
import { U, hemi, lanternLight, scene, sun } from '../core/stage.js';
import { smooth } from '../core/util.js';
import { rainMesh, snowFlakes, windLeaves } from './particles.js';
import { volMat } from '../render/post.js';
import { realm } from '../world/realm.js';

// ---------------------------------------------------------------- weather
const T = { vol: Q.volSteps > 0, shadow: true, ao: Q.aoTaps > 0, bloom: true, dof: Q.dofTaps > 0, grass: true, env: true, spin: true };
const WBASE = { fog: 0.004, mist: 0.15, vol: 0.8, sunI: 1.75, hemiI: 1.45, overcast: 0, rain: 0, wind: 1, night: 0, snow: 0, flash: 0 };
const WEATHER = {
  sun:   { ...WBASE, label: 'Nắng' },
  wind:  { ...WBASE, label: 'Gió',   wind: 2.8, overcast: 0.12 },
  mist:  { ...WBASE, label: 'Sương', fog: 0.006, mist: 1.0, vol: 1.3, sunI: 1.6, hemiI: 1.35, overcast: 0.22, wind: 0.6 },
  rain:  { ...WBASE, label: 'Mưa',   fog: 0.013, mist: 0.55, vol: 0.3, sunI: 0.6, hemiI: 1.5, overcast: 1, rain: 1, wind: 1.4 },
  storm: { ...WBASE, label: 'Bão',   fog: 0.017, mist: 0.4, vol: 0.15, sunI: 0.3, hemiI: 1.0, overcast: 1.2, rain: 1, wind: 3.2, flash: 1 },
  snow:  { ...WBASE, label: 'Tuyết', fog: 0.010, mist: 0.5, vol: 0.5, sunI: 1.1, hemiI: 1.6, overcast: 0.7, snow: 1, wind: 0.8 },
  night: { ...WBASE, label: 'Đêm',   fog: 0.005, mist: 0.5, vol: 1.0, sunI: 0.6, hemiI: 0.5, night: 1, wind: 0.7 },
};
const weatherState = { name: WEATHER[qs.get('w')] ? qs.get('w') : 'sun' };
const weatherNow = { ...WEATHER[weatherState.name] };
const FOG_CLEAR = new THREE.Color(0.60, 0.82, 0.97), FOG_GREY = new THREE.Color(0.50, 0.56, 0.63);
const FOG_NIGHT = new THREE.Color(0.03, 0.05, 0.12), SUN_DAY = new THREE.Color(1.0, 0.94, 0.82), SUN_MOON = new THREE.Color(0.52, 0.66, 1.0);
const HEMI_DAY = new THREE.Color(0.52, 0.76, 1.0), HEMI_NIGHT = new THREE.Color(0.22, 0.32, 0.70), VOL_DAY = new THREE.Color(1.0, 0.93, 0.78), VOL_MOON = new THREE.Color(0.40, 0.55, 0.95);
const WKEYS = ['fog', 'mist', 'vol', 'sunI', 'hemiI', 'overcast', 'rain', 'wind', 'night', 'snow'];
let flashTimer = 2, flashEcho = -1;
function updateWeather(dt) {
  const target = WEATHER[weatherState.name], k = 1 - Math.exp(-dt * 1.2);
  for (const key of WKEYS) weatherNow[key] += (target[key] - weatherNow[key]) * k;
  // lightning: a flash and a quick echo, only while a storm is the target
  U.flash.value = Math.max(0, U.flash.value - dt * 5);
  if (target.flash || qs.has('flash')) {
    flashTimer -= dt; if (flashTimer < 0) { U.flash.value = 1; flashTimer = 2.5 + Math.random() * 5; flashEcho = 0.14; }
    if (flashEcho > 0) { flashEcho -= dt; if (flashEcho <= 0) U.flash.value = 0.8; }
    if (qs.has('flash')) U.flash.value = Number(qs.get('flash')) || 0.7;
  }
  const fl = U.flash.value, storm = Math.max(weatherNow.overcast - 1, 0) * 5;
  sun.intensity = weatherNow.sunI + fl * 1.5; sun.color.copy(SUN_DAY).lerp(SUN_MOON, weatherNow.night);
  hemi.intensity = weatherNow.hemiI + fl * 2.2; hemi.color.copy(HEMI_DAY).lerp(HEMI_NIGHT, weatherNow.night);
  scene.fog.density = weatherNow.fog * 0.6 * realm.fogScale;
  scene.fog.color.copy(FOG_CLEAR).lerp(FOG_GREY, Math.min(weatherNow.overcast, 1)).multiplyScalar(1 - 0.45 * storm).lerp(FOG_NIGHT, weatherNow.night);
  if (T.env) scene.environmentIntensity = 0.4 * (1 - 0.8 * weatherNow.night);
  lanternLight.intensity = 3 + 16 * weatherNow.night;
  U.overcast.value = weatherNow.overcast; U.rain.value = weatherNow.rain; U.night.value = weatherNow.night; U.snow.value = weatherNow.snow; U.wind.value = weatherNow.wind;
  U.windT.value += dt * (0.4 + 0.6 * weatherNow.wind); U.gust.value = smooth(1.8, 2.6, weatherNow.wind) * 0.9;
  U.dim.value = (1 - 0.72 * weatherNow.night) * (1 - 0.3 * storm) + fl * 0.3;
  rainMesh.visible = weatherNow.rain > 0.02; snowFlakes.visible = weatherNow.snow > 0.02; windLeaves.visible = U.gust.value > 0.02;
  volMat.uniforms.uVol.value = weatherNow.vol; volMat.uniforms.uMist.value = weatherNow.mist; volMat.uniforms.uFog.value = weatherNow.fog;
  volMat.uniforms.uSunCol.value.copy(VOL_DAY).lerp(VOL_MOON, weatherNow.night); volMat.uniforms.uSkyCol.value.copy(scene.fog.color);
}

export { T, WEATHER, updateWeather, weatherNow, weatherState };
