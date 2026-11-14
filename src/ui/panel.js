import { controls, flatAmbient, hemi, scene, sun } from '../core/stage.js';
import { T, WEATHER, weatherState } from '../fx/weather.js';
import { bloomPass, combinePass, dofPass, paintPass } from '../render/post.js';
import { Q, TIERS, qs, tierName } from '../core/quality.js';
import { realm } from '../world/realm.js';

// ---------------------------------------------------------------- UI / toggles
const WORLD_LABELS = [['island', 'Đảo Mây'], ['valley', 'Thung lũng']];
const DOF_STRENGTH = 0.55;   // do mo cua canh xa/gan; 1 la muc cu, lam lang va nui mo qua tay
const LABEL = { vol: 'Tia nắng + sương', shadow: 'Bóng đổ', ao: 'AO', bloom: 'Bloom', dof: 'Xa gần', grass: 'Cỏ', env: 'Ánh sáng trời', spin: 'Tự xoay' };
function applyToggles() {
  sun.castShadow = T.shadow;
  combinePass.uniforms.uAO.value = T.ao && Q.aoTaps > 0 ? 1 : 0;
  bloomPass.enabled = T.bloom;
  combinePass.uniforms.uVolOn.value = T.vol && Q.volSteps > 0 ? 1 : 0;
  dofPass.uniforms.uMaxBlur.value = T.dof && Q.dofTaps > 0 ? DOF_STRENGTH : 0;
  realm.setGrassVisible(T.grass);
  scene.environmentIntensity = T.env ? 0.4 : 0; hemi.visible = T.env; flatAmbient.visible = !T.env;
  controls.autoRotate = T.spin;
  document.querySelectorAll('#toggles button').forEach(b => b.classList.toggle('on', T[b.dataset.k]));
}
{
  const tg = document.getElementById('toggles'), tiers = document.getElementById('tiers'), worlds = document.getElementById('worlds');
  for (const [id, label] of WORLD_LABELS) { const b = document.createElement('button'); b.textContent = label; b.classList.toggle('on', id === realm.name); b.onclick = () => { qs.set('world', id); location.search = qs.toString(); }; worlds.append(b); }
  if (realm.paint && Q.paintRadius > 0) { const b = document.createElement('button'); b.textContent = 'Nét cọ'; b.classList.add('on'); b.onclick = () => { paintPass.enabled = !paintPass.enabled; b.classList.toggle('on', paintPass.enabled); }; worlds.append(b); }
  for (const k of Object.keys(T)) { const b = document.createElement('button'); b.textContent = LABEL[k]; b.dataset.k = k; b.onclick = () => { T[k] = !T[k]; applyToggles(); }; tg.append(b); }
  for (const k of Object.keys(TIERS)) { const b = document.createElement('button'); b.textContent = TIERS[k].label; b.classList.toggle('on', k === tierName); b.onclick = () => { qs.set('q', k); location.search = qs.toString(); }; tiers.append(b); }
  const wr = document.getElementById('weather');
  for (const k of Object.keys(WEATHER)) { const b = document.createElement('button'); b.textContent = WEATHER[k].label; b.dataset.w = k; b.classList.toggle('on', k === weatherState.name); b.onclick = () => { weatherState.name = k; wr.querySelectorAll('button').forEach(x => x.classList.toggle('on', x.dataset.w === k)); }; wr.append(b); }
  let saved = null;
  const flat = document.getElementById('flat');
  flat.onclick = () => {
    if (saved) { Object.assign(T, saved); saved = null; flat.classList.remove('on'); }
    else { saved = { ...T }; for (const k of ['vol', 'shadow', 'ao', 'bloom', 'dof', 'grass', 'env']) T[k] = false; flat.classList.add('on'); }
    applyToggles();
  };
  document.getElementById('head').onclick = () => document.getElementById('panel').classList.toggle('min');
  if (qs.has('ui') && qs.get('ui') === '0') document.getElementById('panel').style.display = 'none';
  if (qs.has('spin') && qs.get('spin') === '0') T.spin = false;
  if (qs.has('flat')) flat.onclick();
}
applyToggles();
