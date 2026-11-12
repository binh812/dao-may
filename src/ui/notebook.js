// So hoc cua Ba Coi: ky nang, bai da sai kem loi giai, va khu danh cho bo me (sau cong phu huynh).
import { SKILLS } from '../learn/questions.js';
import { ADAPTIVE, isMastered } from '../learn/adaptive.js';
import { createGate, makeGateQuestion, secondsLeft, tryGate } from '../learn/parent-gate.js';

const FONT = 'system-ui,"Segoe UI",Roboto,sans-serif';
const PANEL = `position:fixed;z-index:9;inset:max(10px,env(safe-area-inset-top)) max(10px,env(safe-area-inset-right)) max(10px,env(safe-area-inset-bottom)) max(10px,env(safe-area-inset-left));margin:auto;max-width:520px;max-height:640px;display:flex;flex-direction:column;border-radius:24px;background:rgba(255,250,240,.98);box-shadow:0 10px 30px rgba(40,20,60,.4);font-family:${FONT};color:#3a2a4a;overflow:hidden;`;
const BTN = `min-height:48px;padding:0 16px;border:0;border-radius:14px;font:700 16px ${FONT};color:#3a2a4a;cursor:pointer;`;

function node(tag, css, text = '') {
  const el = document.createElement(tag);
  el.style.cssText = css; el.textContent = text;
  return el;
}

/**
 * actions: { getProfile() -> profile, changeGrade(grade), resetProgress(), isMuted() -> boolean, setMuted(boolean) }
 */
export function createNotebook(actions) {
  const gate = createGate();
  const opener = node('div', `position:fixed;z-index:3;right:max(12px,env(safe-area-inset-right));top:calc(max(10px,env(safe-area-inset-top)) + 40px);padding:8px 14px;border-radius:999px;background:rgba(255,250,240,.9);color:#3a2a4a;font:700 14px ${FONT};cursor:pointer;user-select:none;-webkit-user-select:none;`, 'Sổ học');
  document.body.append(opener);
  let panel = null;

  function close() { if (panel) { panel.remove(); panel = null; } }

  function frame(title) {
    close();
    panel = node('div', PANEL);
    const head = node('div', 'display:flex;align-items:center;gap:10px;padding:14px 16px 8px;');
    const closeBtn = node('button', BTN + 'background:#ffd978;margin-left:auto;', 'Đóng');
    closeBtn.onclick = close;
    head.append(node('div', `font:800 22px ${FONT};`, title), closeBtn);
    const body = node('div', 'flex:1;overflow:auto;padding:4px 16px 16px;');
    panel.append(head, body); document.body.append(panel);
    return body;
  }

  function showSkills() {
    const body = frame('Sổ học'), profile = actions.getProfile();
    if (!profile) { body.append(node('div', `font:500 15px ${FONT};`, 'Bé chưa chọn lớp.')); return; }
    body.append(node('div', `font:600 14px ${FONT};opacity:.7;margin-bottom:8px;`, `Lớp ${profile.grade}`));
    for (const skill of SKILLS.filter((s) => s.grade <= profile.grade + 1)) {
      const st = profile.skills[skill.id], mastery = st ? st.mastery : 0, done = isMastered(profile, skill.id);
      const row = node('div', 'margin:8px 0;');
      row.append(node('div', `font:600 15px ${FONT};`, `${done ? '✔ ' : ''}${skill.name}${skill.grade > profile.grade ? ' (nâng cao)' : ''}`));
      const bar = node('div', 'height:10px;border-radius:6px;background:#eadfce;margin-top:4px;overflow:hidden;');
      bar.append(node('div', `height:100%;width:${Math.round(mastery * 100)}%;background:${done ? '#4fbf6a' : '#ffb44d'};`));
      row.append(bar); body.append(row);
    }
    const mistakes = profile.mistakes ?? [];
    body.append(node('div', `font:800 18px ${FONT};margin:18px 0 6px;`, 'Bài cần xem lại'));
    if (!mistakes.length) body.append(node('div', `font:500 15px ${FONT};opacity:.75;`, 'Chưa có bài nào. Giỏi lắm!'));
    for (const m of [...mistakes].reverse()) {
      const box = node('div', 'margin:8px 0;padding:10px 12px;border-radius:14px;background:#fff3dc;');
      box.append(node('div', `font:800 18px ${FONT};`, m.text));
      for (const line of m.solution) box.append(node('div', `font:500 15px/1.4 ${FONT};`, line));
      body.append(box);
    }
    const parents = node('button', BTN + 'background:#d9d2e6;margin-top:18px;width:100%;', 'Dành cho bố mẹ');
    parents.onclick = showGate;
    body.append(parents);
  }

  function showGate() {
    const body = frame('Dành cho bố mẹ'), wait = secondsLeft(gate, Date.now());
    if (wait > 0) { body.append(node('div', `font:600 16px ${FONT};`, `Xin chờ ${wait} giây rồi thử lại.`)); return; }
    const q = makeGateQuestion(Math.random);
    body.append(node('div', `font:500 15px ${FONT};margin-bottom:8px;`, 'Để vào khu này, bố mẹ hãy trả lời:'), node('div', `font:800 30px ${FONT};margin-bottom:12px;text-align:center;`, `${q.a} × ${q.b} = ?`));
    const grid = node('div', 'display:grid;grid-template-columns:1fr 1fr;gap:10px;');
    for (const choice of q.choices) {
      const b = node('button', BTN + 'background:#a9dcff;font-size:22px;min-height:58px;', String(choice));
      b.onclick = () => { if (tryGate(gate, q, choice, Date.now()) === 'open') showParents(); else showGate(); };
      grid.append(b);
    }
    body.append(grid);
  }

  function showParents() {
    const body = frame('Dành cho bố mẹ'), profile = actions.getProfile();
    body.append(node('div', `font:700 16px ${FONT};margin:6px 0;`, 'Lớp của bé'));
    const grades = node('div', 'display:flex;gap:10px;');
    for (let g = ADAPTIVE.minGrade; g <= ADAPTIVE.maxGrade; g++) {
      const b = node('button', BTN + `flex:1;background:${profile && profile.grade === g ? '#ffb44d' : '#eadfce'};`, `Lớp ${g}`);
      b.onclick = () => { actions.changeGrade(g); showParents(); };
      grades.append(b);
    }
    const sound = node('button', BTN + 'background:#b9ecaa;width:100%;margin-top:14px;', actions.isMuted() ? 'Âm thanh: đang tắt' : 'Âm thanh: đang bật');
    sound.onclick = () => { actions.setMuted(!actions.isMuted()); showParents(); };
    const reset = node('button', BTN + 'background:#ffc1d6;width:100%;margin-top:14px;', 'Xóa tiến độ và chọn lớp lại');
    let armed = false;
    reset.onclick = () => { if (!armed) { armed = true; reset.textContent = 'Bấm lần nữa để xóa hẳn (không khôi phục được)'; return; } actions.resetProgress(); close(); };
    body.append(grades, node('div', `font:500 13px/1.4 ${FONT};opacity:.75;margin-top:6px;`, 'Đổi lớp không làm mất những kỹ năng bé đã tự thành thạo.'), sound, reset,
      node('div', `font:500 13px/1.4 ${FONT};opacity:.75;margin-top:14px;`, 'Game không có quảng cáo, không mua bán bằng tiền thật, không thu thập dữ liệu. Tiến độ chỉ lưu trên máy này.'));
  }

  opener.addEventListener('pointerdown', (e) => { e.preventDefault(); showSkills(); });
  return { isOpen: () => panel !== null, close, dispose() { close(); opener.remove(); } };
}
