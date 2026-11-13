// Bang doi do o quay hang: be xem cac mon, doi bang Hat Nang, mac hoac coi mon da co. Luat nam o game/shop-core.js.

const FONT = 'system-ui,"Segoe UI",Roboto,sans-serif';
const PANEL = `position:fixed;z-index:9;inset:max(10px,env(safe-area-inset-top)) max(10px,env(safe-area-inset-right)) max(10px,env(safe-area-inset-bottom)) max(10px,env(safe-area-inset-left));margin:auto;max-width:520px;max-height:640px;display:flex;flex-direction:column;border-radius:24px;background:rgba(255,250,240,.98);box-shadow:0 10px 30px rgba(40,20,60,.4);font-family:${FONT};color:#3a2a4a;overflow:hidden;`;
const BTN = `min-height:48px;min-width:112px;padding:0 14px;border:0;border-radius:14px;font:700 15px ${FONT};color:#3a2a4a;cursor:pointer;`;
const TAP_GUARD_MS = 350;   // sau khi bang ve lai, bo qua cham trong khoang nay: be hay cham dup, lan thu hai se roi vao nut vua doi chu
const BUTTON_LOOK = {
  'can-buy': (item) => ({ text: `Đổi ✦ ${item.price}`, css: 'background:#ffb44d;' }),
  short: (item) => ({ text: `✦ ${item.price} · thiếu ${item.missing}`, css: 'background:#eadfce;opacity:.7;cursor:default;' }),
  owned: () => ({ text: 'Mặc', css: 'background:#b9ecaa;' }),
  worn: () => ({ text: 'Đang mặc ✓', css: 'background:#8fd6ff;' }),
};

function node(tag, css, text = '') {
  const el = document.createElement(tag);
  el.style.cssText = css; el.textContent = text;
  return el;
}

/**
 * actions: { getView() -> { balance, slots: [{ id, name }], items: [shelf item] }, onBuy(id), onWear(id) }
 * onBuy/onWear lam xong thi bang tu ve lai.
 */
export function createShopPanel(actions) {
  let panel = null, drawnAt = 0;
  function close() { if (panel) { panel.remove(); panel = null; } }

  function render() {
    const scrolled = panel ? panel.lastChild.scrollTop : 0;   // ve lai thi giu nguyen cho be dang cuon toi
    close();
    const view = actions.getView();
    panel = node('div', PANEL);
    const head = node('div', 'display:flex;align-items:center;gap:10px;padding:14px 16px 8px;');
    const closeBtn = node('button', BTN + 'background:#ffd978;margin-left:auto;min-width:0;', 'Đóng');
    closeBtn.onclick = close;
    head.append(node('div', `font:800 21px ${FONT};`, 'Quầy cô Thỏ Bông'), closeBtn);
    const body = node('div', 'flex:1;overflow:auto;padding:4px 16px 16px;');
    body.append(node('div', `font:700 17px ${FONT};padding:8px 12px;border-radius:14px;background:#fff3dc;`, `Bé đang có ✦ ${view.balance} Hạt Nắng`));
    for (const slot of view.slots) {
      body.append(node('div', `font:800 16px ${FONT};margin:14px 0 4px;`, slot.name));
      for (const item of view.items.filter((i) => i.slot === slot.id)) {
        const row = node('div', 'display:flex;align-items:center;gap:12px;margin:6px 0;');
        const look = BUTTON_LOOK[item.status](item), button = node('button', BTN + look.css, look.text);
        if (item.status === 'short') button.disabled = true;
        else button.onclick = () => { if (performance.now() - drawnAt < TAP_GUARD_MS) return; if (item.status === 'can-buy') actions.onBuy(item.id); else actions.onWear(item.id); if (panel) render(); };
        row.append(node('div', `flex:none;width:34px;height:34px;border-radius:50%;background:${item.swatch};box-shadow:inset 0 -4px 0 rgba(0,0,0,.12);`),
          node('div', `flex:1;font:600 16px ${FONT};`, item.name), button);
        body.append(row);
      }
    }
    body.append(node('div', `font:500 13px/1.4 ${FONT};opacity:.75;margin-top:14px;`, 'Hạt Nắng nằm dọc đường mòn, quanh hồ và quanh cối xay. Món đã đổi là của bé mãi mãi, mặc hay cởi lúc nào cũng được.'));
    panel.append(head, body); document.body.append(panel);
    body.scrollTop = scrolled; drawnAt = performance.now();
  }

  return { open: render, close, isOpen: () => panel !== null, dispose: close };
}
