// Phan hoi "da tay" cho moi hanh dong: so bay len tu cho trung don, chop sang man hinh, rung may quay, bang dem lien hoan.
// Chi la hinh; khong chua luat. May dat "giam chuyen dong" thi bo rung va chop, chi giu so bay.
import * as THREE from 'three';

/** Do rung hien tai cua may quay; play.js doc va lam tat dan moi khung hinh. */
export const shake = { power: 0 };
const POP_MS = 850, STREAK_HOLD_MS = 1700, STREAK_FROM = 3, MAX_POPS = 14;

export function createJuice(camera) {
  const calm = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const layer = document.createElement('div');
  layer.style.cssText = 'position:fixed;inset:0;z-index:2;pointer-events:none;overflow:hidden;';
  const flashEl = document.createElement('div');
  flashEl.style.cssText = 'position:absolute;inset:0;opacity:0;';
  const streakEl = document.createElement('div');
  streakEl.style.cssText = 'position:absolute;left:50%;top:21%;transform:translateX(-50%);padding:4px 16px;border-radius:999px;background:linear-gradient(#ffb84d,#ff7a3d);color:#fff;font:900 22px system-ui,sans-serif;text-shadow:0 2px 0 rgba(120,40,0,.45);box-shadow:0 4px 14px rgba(120,40,0,.35);opacity:0;transition:opacity .3s;white-space:nowrap;';
  layer.append(flashEl, streakEl); document.body.append(layer);
  const point = new THREE.Vector3();
  let pops = 0, streakTimer = 0;

  return {
    /** Chu bay len tu mot diem trong the gioi (vd. "+1", "+8", "Thuc roi!"). */
    pop(x, y, z, text, { color = '#fff', size = 24 } = {}) {
      point.set(x, y, z).project(camera);
      if (point.z > 1 || Math.abs(point.x) > 1.1 || Math.abs(point.y) > 1.1 || pops >= MAX_POPS) return;
      const el = document.createElement('div');
      el.textContent = text;
      el.style.cssText = `position:absolute;left:${(point.x * 0.5 + 0.5) * 100}%;top:${(-point.y * 0.5 + 0.5) * 100}%;transform:translate(-50%,-50%);color:${color};font:900 ${size}px system-ui,sans-serif;text-shadow:0 2px 0 rgba(40,20,60,.55),0 0 10px rgba(255,255,255,.35);white-space:nowrap;will-change:transform,opacity;`;
      layer.append(el); pops++;
      const drift = (Math.random() - 0.5) * 50;
      const done = () => { el.remove(); pops--; };
      if (typeof el.animate !== 'function') { setTimeout(done, POP_MS); return; }
      el.animate([
        { transform: 'translate(-50%,-50%) scale(.4)', opacity: 0 },
        { transform: 'translate(-50%,-90%) scale(1.35)', opacity: 1, offset: 0.18 },
        { transform: `translate(calc(-50% + ${drift}px),-260%) scale(1)`, opacity: 0 },
      ], { duration: POP_MS, easing: 'cubic-bezier(.2,.8,.3,1)' }).onfinish = done;
    },
    /** Chop sang toan man hinh (mau nhat o giua, dam o vien). */
    flash(color, strength = 0.4) {
      if (calm || typeof flashEl.animate !== 'function') return;
      flashEl.style.background = `radial-gradient(circle, transparent 30%, ${color} 130%)`;
      flashEl.animate([{ opacity: strength }, { opacity: 0 }], { duration: 380, easing: 'ease-out' });
    },
    /** Rung may quay; amount la do lech lon nhat tinh bang met. */
    bump(amount) { if (!calm) shake.power = Math.max(shake.power, amount); },
    /** Bang dem don trung lien tiep; duoi nguong thi khong hien. */
    streak(count) {
      if (count < STREAK_FROM) return;
      streakEl.textContent = `Liên hoàn ×${count}`; streakEl.style.opacity = '1';
      if (!calm && typeof streakEl.animate === 'function') streakEl.animate([{ transform: 'translateX(-50%) scale(1.45)' }, { transform: 'translateX(-50%) scale(1)' }], { duration: 220, easing: 'ease-out' });
      clearTimeout(streakTimer); streakTimer = setTimeout(() => { streakEl.style.opacity = '0'; }, STREAK_HOLD_MS);
    },
    dispose() { clearTimeout(streakTimer); layer.remove(); },
  };
}
