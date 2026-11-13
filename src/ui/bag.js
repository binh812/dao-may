// Tui do: nut nho tren man hinh (tong so vat) va bang liet ke vat lieu kem nut doi lay Hat Nang.
// Chi la giao dien; luat o game/bag-core.js. Nut doi chi bat khi Mam dang dung o quay hang.
import { node } from './puzzle-widgets.js';

const PILL = 'position:fixed;z-index:3;left:max(96px,env(safe-area-inset-left));top:calc(max(10px,env(safe-area-inset-top)) + 78px);min-height:44px;padding:0 14px;border:0;border-radius:999px;background:rgba(255,250,240,.92);color:#3a2a4a;font:800 15px system-ui,sans-serif;cursor:pointer;touch-action:manipulation;box-shadow:0 3px 10px rgba(40,20,60,.25);';
const CARD = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:8;width:min(94vw,430px);max-height:94vh;overflow-y:auto;box-sizing:border-box;padding:14px;border-radius:22px;background:#fffaf0;box-shadow:0 10px 30px rgba(40,20,60,.35);font-family:system-ui,"Segoe UI",Roboto,sans-serif;color:#3a2a4a;user-select:none;-webkit-user-select:none;';
const BTN = 'min-height:46px;padding:0 14px;border:0;border-radius:14px;font:800 15px system-ui,sans-serif;color:#3a2a4a;cursor:pointer;touch-action:manipulation;';
const TAP_GUARD_MS = 350;

/** getView() -> { items: bagView(...), total, canTrade }; onTrade(id) thuc hien mot lan doi; canOpen() cho biet luc nay mo duoc khong. */
export function createBagUi({ getView, onTrade, canOpen }) {
  const pill = node('button', PILL);
  pill.type = 'button';
  let card = null, list = null, note = null, lastTap = 0;

  function render() {
    const view = getView();
    pill.textContent = `🎒 ${view.total}`;
    pill.setAttribute('aria-label', `Túi đồ: ${view.total} vật`);
    if (!card) return;
    list.replaceChildren(...view.items.map((item) => {
      const row = node('div', 'display:flex;align-items:center;gap:10px;padding:8px 4px;border-bottom:1px solid #eadfce;');
      const trade = node('button', BTN + 'margin-left:auto;background:#ffd978;', `Đổi ${item.give} lấy ${item.get} ✦`);
      trade.type = 'button'; trade.disabled = !view.canTrade || item.times < 1; trade.style.opacity = trade.disabled ? '.45' : '1';
      trade.onclick = () => { const now = performance.now(); if (now - lastTap < TAP_GUARD_MS) return; lastTap = now; onTrade(item.id); render(); };
      row.append(node('div', 'font-size:28px;width:38px;text-align:center;', item.icon), node('div', 'font:700 16px system-ui,sans-serif;', `${item.name} × ${item.count}`), trade);
      return row;
    }));
    note.textContent = view.canTrade ? 'Cô Thỏ Bông: "Bé có gì đổi cho cô nào?"' : 'Mang đồ tới quầy cô Thỏ Bông ở cổng làng để đổi lấy Hạt Nắng nhé.';
  }
  function close() { if (card) { card.remove(); card = null; removeEventListener('keydown', onKey); } }
  const onKey = (e) => { if (e.code === 'Escape') close(); };
  function open() {
    if (card || !canOpen()) return;
    card = node('div', CARD);
    const head = node('div', 'display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;');
    const shut = node('button', BTN + 'background:#eadfce;', 'Đóng'); shut.type = 'button'; shut.onclick = close;
    head.append(node('div', 'font:800 20px system-ui,sans-serif;', 'Túi đồ của Mầm'), shut);
    list = node('div', ''); note = node('div', 'font:600 14px/1.35 system-ui,sans-serif;color:#7a4a1a;margin-top:10px;text-align:center;');
    card.append(head, list, note); document.body.append(card);
    lastTap = performance.now(); addEventListener('keydown', onKey);
    render();
  }
  pill.onclick = open;
  document.body.append(pill);
  render();
  return { refresh: render, open, close, isOpen: () => card !== null };
}
