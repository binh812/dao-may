// Dau vao cua nguoi choi: can ao noi o nua trai, keo nua phai de xoay may quay, nut Nhay o goc duoi phai,
// va ban phim (WASD/mui ten + Space) de thu tren PC. Chi doc DOM; toan can ao nam o input-core.js.
import { stickFromDrag } from './input-core.js';

const STICK_RADIUS = 56;
const KEY_AXES = { KeyW: [0, 1], ArrowUp: [0, 1], KeyS: [0, -1], ArrowDown: [0, -1], KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0] };

function el(css, text = '') {
  const node = document.createElement('div');
  node.style.cssText = css; node.textContent = text;
  return node;
}

export function createTouchControls(host) {
  const layer = el('position:fixed;inset:0;z-index:1;touch-action:none;user-select:none;-webkit-user-select:none;');
  const base = el(`position:absolute;width:${STICK_RADIUS * 2}px;height:${STICK_RADIUS * 2}px;margin:-${STICK_RADIUS}px 0 0 -${STICK_RADIUS}px;border-radius:50%;background:rgba(255,255,255,.16);border:2px solid rgba(255,255,255,.5);display:none;pointer-events:none;`);
  const knob = el('position:absolute;left:50%;top:50%;width:52px;height:52px;margin:-26px 0 0 -26px;border-radius:50%;background:rgba(255,255,255,.75);');
  const jumpButton = el('position:absolute;right:max(22px,env(safe-area-inset-right));bottom:max(26px,env(safe-area-inset-bottom));width:84px;height:84px;border-radius:50%;background:rgba(255,255,255,.28);border:2px solid rgba(255,255,255,.7);color:#fff;font:700 15px system-ui,sans-serif;display:grid;place-items:center;text-shadow:0 1px 3px rgba(0,0,0,.4);', 'Nhảy');
  base.append(knob); layer.append(base, jumpButton); host.append(layer);

  const stick = { id: null, originX: 0, originY: 0, x: 0, y: 0 };
  const look = { id: null, lastX: 0, lastY: 0, dx: 0, dy: 0 };
  const jumpPointers = new Set(), keys = new Set();

  function releaseStick() { stick.id = null; stick.x = stick.y = 0; base.style.display = 'none'; }

  function onDown(e) {
    if (e.target === jumpButton) return;
    if (e.clientX < innerWidth * 0.5 && stick.id === null) {
      stick.id = e.pointerId; stick.originX = e.clientX; stick.originY = e.clientY;
      base.style.display = 'block'; base.style.left = e.clientX + 'px'; base.style.top = e.clientY + 'px'; knob.style.transform = '';
    } else if (look.id === null) {
      look.id = e.pointerId; look.lastX = e.clientX; look.lastY = e.clientY;
    } else return;
    layer.setPointerCapture(e.pointerId);
  }
  function onMove(e) {
    if (e.pointerId === stick.id) {
      const dx = e.clientX - stick.originX, dy = e.clientY - stick.originY, s = stickFromDrag(dx, dy, STICK_RADIUS);
      stick.x = s.x; stick.y = s.y;
      const len = Math.hypot(dx, dy), k = len > STICK_RADIUS ? STICK_RADIUS / len : 1;
      knob.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
    } else if (e.pointerId === look.id) {
      look.dx += e.clientX - look.lastX; look.dy += e.clientY - look.lastY; look.lastX = e.clientX; look.lastY = e.clientY;
    }
  }
  function onUp(e) {
    if (e.pointerId === stick.id) releaseStick();
    if (e.pointerId === look.id) look.id = null;
  }
  const jumpDown = (e) => { jumpPointers.add(e.pointerId); jumpButton.setPointerCapture(e.pointerId); jumpButton.style.background = 'rgba(255,255,255,.5)'; e.preventDefault(); };
  const jumpUp = (e) => { jumpPointers.delete(e.pointerId); if (!jumpPointers.size) jumpButton.style.background = 'rgba(255,255,255,.28)'; };
  const keyDown = (e) => { if (e.code in KEY_AXES || e.code === 'Space') { keys.add(e.code); e.preventDefault(); } };
  const keyUp = (e) => keys.delete(e.code);
  const clearAll = () => { keys.clear(); jumpPointers.clear(); releaseStick(); look.id = null; };

  layer.addEventListener('pointerdown', onDown); layer.addEventListener('pointermove', onMove);
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) { layer.addEventListener(type, onUp); jumpButton.addEventListener(type, jumpUp); }
  jumpButton.addEventListener('pointerdown', jumpDown);
  layer.addEventListener('contextmenu', (e) => e.preventDefault());
  addEventListener('keydown', keyDown); addEventListener('keyup', keyUp); addEventListener('blur', clearAll);

  return {
    /** Trang thai dau vao hien tai; luong keo xoay may quay duoc tra roi dat lai ve 0. */
    read() {
      let x = stick.x, y = stick.y;
      for (const code of keys) if (code in KEY_AXES) { x += KEY_AXES[code][0]; y += KEY_AXES[code][1]; }
      const len = Math.hypot(x, y); if (len > 1) { x /= len; y /= len; }
      const result = { stickX: x, stickY: y, jump: jumpPointers.size > 0 || keys.has('Space'), lookDX: look.dx, lookDY: look.dy };
      look.dx = look.dy = 0;
      return result;
    },
    dispose() {
      removeEventListener('keydown', keyDown); removeEventListener('keyup', keyUp); removeEventListener('blur', clearAll);
      layer.remove();
    },
  };
}
