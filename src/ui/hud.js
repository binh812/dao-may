// Giao dien trong tran: tim, nut La (giu de ban lien tuc), nut Tui Nang, thong bao, bang "dao da thuc giac".

const BUTTON = 'position:fixed;z-index:3;border-radius:50%;display:grid;place-items:center;color:#fff;font:700 14px system-ui,sans-serif;text-shadow:0 1px 3px rgba(0,0,0,.45);border:2px solid rgba(255,255,255,.75);user-select:none;-webkit-user-select:none;touch-action:none;cursor:pointer;';
const PILL = 'position:fixed;z-index:3;padding:6px 12px;border-radius:999px;background:rgba(28,22,34,.5);color:#fff;font:700 15px system-ui,sans-serif;pointer-events:none;';

function node(tag, css, text = '') {
  const el = document.createElement(tag);
  el.style.cssText = css; el.textContent = text;
  return el;
}

export function createHud({ onLeaf, onSkill, onAction, worldLabel, onSwitchWorld }) {
  // Man hinh hep (dien thoai 350 diem anh): hang tren cung chi du cho o fps va o tien do, nen trai tim nam ngay duoi o fps.
  const hearts = node('div', PILL + 'left:max(14px,env(safe-area-inset-left));top:calc(max(10px,env(safe-area-inset-top)) + 50px);letter-spacing:2px;');
  const progress = node('div', PILL + 'right:max(12px,env(safe-area-inset-right));top:max(10px,env(safe-area-inset-top));font-weight:600;font-size:12px;box-sizing:border-box;max-width:calc(100vw - 112px);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;');
  const leaf = node('div', BUTTON + 'right:max(122px,env(safe-area-inset-right));bottom:max(34px,env(safe-area-inset-bottom));width:68px;height:68px;background:rgba(80,190,90,.75);', 'Lá');
  const skill = node('div', BUTTON + 'right:max(64px,env(safe-area-inset-right));bottom:max(128px,env(safe-area-inset-bottom));width:84px;height:84px;background:rgba(255,180,40,.88);font-size:14px;line-height:1.25;text-align:center;white-space:pre-line;', 'Nạp nắng');
  const toastBox = node('div', 'position:fixed;z-index:6;left:50%;top:30%;transform:translateX(-50%);width:max-content;max-width:86vw;box-sizing:border-box;padding:10px 16px;border-radius:16px;background:rgba(28,22,34,.62);color:#fff;font:700 17px/1.35 system-ui,sans-serif;text-align:center;pointer-events:none;opacity:0;transition:opacity .35s;');
  const switcher = node('div', PILL + 'right:max(12px,env(safe-area-inset-right));top:calc(max(10px,env(safe-area-inset-top)) + 82px);pointer-events:auto;cursor:pointer;background:rgba(255,250,240,.9);color:#3a2a4a;font-size:13px;', `Sang ${worldLabel}`);
  switcher.addEventListener('pointerdown', (e) => { e.preventDefault(); onSwitchWorld(); });
  const seeds = node('div', PILL + 'left:calc(max(14px,env(safe-area-inset-left)) + 82px);top:calc(max(10px,env(safe-area-inset-top)) + 40px);display:none;font-size:14px;color:#ffe9a8;');
  const guide = node('div', PILL + 'left:max(14px,env(safe-area-inset-left));bottom:max(18px,env(safe-area-inset-bottom));display:none;font-size:14px;box-sizing:border-box;max-width:calc(100vw - 214px);line-height:1.25;border-radius:18px;');   // khong lan sang nut La
  const arrow = node('span', 'display:inline-block;margin-right:8px;font-size:18px;', '▲'), guideText = node('span', '');
  guide.append(arrow, guideText);
  const action = node('div', PILL + 'left:50%;transform:translateX(-50%);bottom:max(40px,env(safe-area-inset-bottom));display:none;pointer-events:auto;cursor:pointer;padding:14px 22px;background:rgba(255,180,77,.96);color:#3a2408;font-size:17px;box-shadow:0 4px 14px rgba(40,20,60,.3);');
  action.addEventListener('pointerdown', (e) => { e.preventDefault(); onAction(); });
  const all = [hearts, progress, leaf, skill, toastBox, switcher, guide, seeds, action];
  hearts.style.display = progress.style.display = 'none'; // chua co tran thi chua hien
  document.body.append(...all);
  // giu nut La (hoac phim J) thi ban lien tuc; noi goi hoi leafHeld() moi khung hinh
  let leafHeld = false;
  const releaseLeaf = () => { leafHeld = false; leaf.style.transform = ''; };
  leaf.addEventListener('pointerdown', (e) => { e.preventDefault(); leafHeld = true; leaf.style.transform = 'scale(.92)'; leaf.setPointerCapture(e.pointerId); onLeaf(); });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) leaf.addEventListener(type, releaseLeaf);
  skill.addEventListener('pointerdown', (e) => { e.preventDefault(); onSkill(); });
  const onKey = (e) => { if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return; if (e.code === 'KeyJ') { leafHeld = true; onLeaf(); } if (e.code === 'KeyK') onSkill(); if (e.code === 'KeyE' && action.style.display !== 'none') onAction(); };
  const onKeyUp = (e) => { if (e.code === 'KeyJ') releaseLeaf(); };
  addEventListener('keydown', onKey); addEventListener('keyup', onKeyUp); addEventListener('blur', releaseLeaf);

  let toastTimer = 0, bannerEl = null;
  return {
    setHearts(now, max) { hearts.textContent = '♥'.repeat(now) + '♡'.repeat(Math.max(0, max - now)); hearts.style.display = 'block'; },
    leafHeld: () => leafHeld,
    /** Nut Tui Nang: con vien thi la nut nem (hien so vien), het thi la nut moi be nap bang mot cau do. */
    setPouch(count, max) { const label = count > 0 ? `Ném nắng\n${'●'.repeat(count)}${'○'.repeat(Math.max(0, max - count))}` : 'Nạp nắng\n○○○'; if (skill.textContent !== label) skill.textContent = label; },
    setProgress(text) { progress.textContent = text; progress.style.display = text ? 'block' : 'none'; },
    /** So Hat Nang dang co de doi do, kem so da nhat tren tong so cua the gioi. */
    setSeeds(count, total, spendable) { seeds.textContent = `✦ ${spendable} · nhặt ${count}/${total}`; seeds.style.display = 'block'; },
    /** Nut viec lam tai cho (vao quay hang, xay bot...) hien khi Mam dung gan; null de an. */
    setAction(label) { action.style.display = label ? 'block' : 'none'; if (label && action.textContent !== label) action.textContent = label; },
    setSkillReady(ready) { skill.style.opacity = ready ? '1' : '.45'; },
    /** Mui ten chi huong: angle (rad, 0 = thang truoc mat, duong = ben phai) va khoang cach (m); null de an. */
    setGuide(angle, meters) {
      if (angle === null) { guide.style.display = 'none'; return; }
      guide.style.display = 'block'; arrow.style.transform = `rotate(${angle}rad)`;
      guideText.textContent = `Bóng Lặng cách ${Math.round(meters / 5) * 5} m`;
    },
    /** Thong bao giua man hinh. `onShown` chi duoc goi khi thong bao hien DU thoi gian; bi thong bao khac chen ngang thi khong goi. */
    toast(text, ms = 1800, onShown = null) { toastBox.textContent = text; toastBox.style.opacity = '1'; clearTimeout(toastTimer); toastTimer = setTimeout(() => { toastBox.style.opacity = '0'; onShown?.(); }, ms); },
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
    dispose() { removeEventListener('keydown', onKey); removeEventListener('keyup', onKeyUp); removeEventListener('blur', releaseLeaf); clearTimeout(toastTimer); all.forEach((el) => el.remove()); if (bannerEl) bannerEl.remove(); },
  };
}
