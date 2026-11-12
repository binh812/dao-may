// Giao dien trong tran: tim, combo, nut chieu, thong bao, bang "dao da thuc giac".

const BUTTON = 'position:fixed;z-index:3;border-radius:50%;display:grid;place-items:center;color:#fff;font:700 14px system-ui,sans-serif;text-shadow:0 1px 3px rgba(0,0,0,.45);border:2px solid rgba(255,255,255,.75);user-select:none;-webkit-user-select:none;touch-action:none;cursor:pointer;';
const PILL = 'position:fixed;z-index:3;padding:6px 12px;border-radius:999px;background:rgba(28,22,34,.5);color:#fff;font:700 15px system-ui,sans-serif;pointer-events:none;';

function node(tag, css, text = '') {
  const el = document.createElement(tag);
  el.style.cssText = css; el.textContent = text;
  return el;
}

export function createHud({ onLeaf, onSkill }) {
  const hearts = node('div', PILL + 'left:max(96px,env(safe-area-inset-left));top:max(10px,env(safe-area-inset-top));letter-spacing:2px;');
  const progress = node('div', PILL + 'right:max(12px,env(safe-area-inset-right));top:max(10px,env(safe-area-inset-top));font-weight:600;font-size:13px;');
  const combo = node('div', PILL + 'right:max(118px,env(safe-area-inset-right));bottom:max(232px,env(safe-area-inset-bottom));background:rgba(255,170,40,.9);opacity:0;transition:opacity .3s;');
  const leaf = node('div', BUTTON + 'right:max(122px,env(safe-area-inset-right));bottom:max(34px,env(safe-area-inset-bottom));width:68px;height:68px;background:rgba(80,190,90,.75);', 'Lá');
  const skill = node('div', BUTTON + 'right:max(64px,env(safe-area-inset-right));bottom:max(128px,env(safe-area-inset-bottom));width:80px;height:80px;background:rgba(255,180,40,.85);font-size:15px;', 'Tia Nắng');
  const toastBox = node('div', 'position:fixed;z-index:6;left:50%;top:30%;transform:translateX(-50%);max-width:86vw;padding:10px 16px;border-radius:16px;background:rgba(28,22,34,.62);color:#fff;font:700 17px/1.35 system-ui,sans-serif;text-align:center;pointer-events:none;opacity:0;transition:opacity .35s;');
  const all = [hearts, progress, combo, leaf, skill, toastBox];
  hearts.style.display = progress.style.display = 'none'; // chua co tran thi chua hien
  document.body.append(...all);
  leaf.addEventListener('pointerdown', (e) => { e.preventDefault(); onLeaf(); });
  skill.addEventListener('pointerdown', (e) => { e.preventDefault(); onSkill(); });
  const onKey = (e) => { if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return; if (e.code === 'KeyJ') onLeaf(); if (e.code === 'KeyK') onSkill(); };
  addEventListener('keydown', onKey);

  let toastTimer = 0, bannerEl = null;
  return {
    setHearts(now, max) { hearts.textContent = '♥'.repeat(now) + '♡'.repeat(Math.max(0, max - now)); hearts.style.display = 'block'; },
    setCombo(tier) { combo.textContent = tier > 1 ? `Combo ×${tier}` : ''; combo.style.opacity = tier > 1 ? '1' : '0'; },
    setProgress(text) { progress.textContent = text; progress.style.display = text ? 'block' : 'none'; },
    setSkillReady(ready) { skill.style.opacity = ready ? '1' : '.45'; },
    toast(text, ms = 1800) { toastBox.textContent = text; toastBox.style.opacity = '1'; clearTimeout(toastTimer); toastTimer = setTimeout(() => { toastBox.style.opacity = '0'; }, ms); },
    /** Bang giua man hinh co mot nut; goi lai voi null de go. */
    banner(title, lines, buttonLabel, onClick) {
      if (bannerEl) { bannerEl.remove(); bannerEl = null; }
      if (!title) return;
      bannerEl = node('div', 'position:fixed;z-index:7;left:50%;top:50%;transform:translate(-50%,-50%);width:min(88vw,420px);box-sizing:border-box;padding:18px;border-radius:24px;background:rgba(255,250,240,.96);box-shadow:0 10px 30px rgba(40,20,60,.35);font-family:system-ui,sans-serif;color:#3a2a4a;text-align:center;');
      bannerEl.append(node('div', 'font:800 26px system-ui,sans-serif;margin-bottom:8px;', title));
      for (const line of lines) bannerEl.append(node('div', 'font:500 15px/1.4 system-ui,sans-serif;', line));
      const b = node('button', 'margin-top:14px;min-height:56px;padding:0 26px;border:0;border-radius:16px;background:#ffb44d;color:#3a2408;font:800 19px system-ui,sans-serif;cursor:pointer;', buttonLabel);
      b.onclick = () => { bannerEl.remove(); bannerEl = null; onClick(); };
      bannerEl.append(b); document.body.append(bannerEl);
    },
    dispose() { removeEventListener('keydown', onKey); clearTimeout(toastTimer); all.forEach((el) => el.remove()); if (bannerEl) bannerEl.remove(); },
  };
}
