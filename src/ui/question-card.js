// The bai tap va man chon lop. Chi la giao dien: bai do learn/questions.js sinh, cham diem o day chi la so sanh dap an.

const CARD_CSS = 'position:fixed;left:50%;bottom:max(18px,env(safe-area-inset-bottom));transform:translateX(-50%);z-index:8;width:min(92vw,460px);box-sizing:border-box;padding:14px 16px 16px;border-radius:22px;background:rgba(255,250,240,.96);box-shadow:0 10px 30px rgba(40,20,60,.35);font-family:system-ui,"Segoe UI",Roboto,sans-serif;color:#3a2a4a;text-align:center;user-select:none;-webkit-user-select:none;';
const CHOICE_CSS = 'min-height:64px;border:0;border-radius:16px;font:700 26px system-ui,sans-serif;color:#3a2a4a;cursor:pointer;';
const CHOICE_COLORS = ['#ffd978', '#a9dcff', '#b9ecaa', '#ffc1d6'];
const REVEAL_MS = 650, REVEAL_WRONG_MS = 2200;

function node(tag, css, text = '') {
  const el = document.createElement(tag);
  el.style.cssText = css; el.textContent = text;
  return el;
}

export function createQuestionCard() {
  let open = null;

  /** Hien mot bai; tra ve Promise<{ choice, correct }> sau khi be chon va da xem ket qua. */
  function ask(question, title) {
    if (open) throw new Error('dang co mot bai chua tra loi');
    const card = node('div', CARD_CSS);
    const heading = node('div', 'font:600 14px system-ui,sans-serif;opacity:.7;margin-bottom:4px;', title);
    const text = node('div', 'font:800 34px system-ui,sans-serif;margin:2px 0 12px;', question.text);
    const grid = node('div', 'display:grid;grid-template-columns:1fr 1fr;gap:10px;');
    const note = node('div', 'font:600 15px/1.35 system-ui,sans-serif;margin-top:10px;min-height:20px;color:#7a4a1a;');
    card.append(heading, text, grid, note);

    return new Promise((resolve) => {
      const buttons = question.choices.map((value, i) => {
        const b = node('button', CHOICE_CSS + `background:${CHOICE_COLORS[i % CHOICE_COLORS.length]};`, String(value));
        b.onclick = () => choose(value);
        grid.append(b);
        return b;
      });
      const onKey = (e) => { const i = ['Digit1', 'Digit2', 'Digit3', 'Digit4'].indexOf(e.code); if (i >= 0 && i < buttons.length) choose(question.choices[i]); };
      let chosen = false;
      function choose(value) {
        if (chosen) return;
        chosen = true;
        const correct = value === question.answer;
        buttons.forEach((b, i) => {
          b.disabled = true;
          if (question.choices[i] === question.answer) b.style.outline = '4px solid #2fa84f';
          else if (question.choices[i] === value) b.style.opacity = '.45';
        });
        note.textContent = correct ? 'Đúng rồi!' : `Chưa đúng. ${question.hint}`;
        setTimeout(() => { removeEventListener('keydown', onKey); card.remove(); open = null; resolve({ choice: value, correct }); }, correct ? REVEAL_MS : REVEAL_WRONG_MS);
      }
      addEventListener('keydown', onKey);
      document.body.append(card);
      open = card;
    });
  }

  /** Hoi lop cua be khi chua co ho so. Khong hoi ten that. */
  function askGrade(grades) {
    const card = node('div', CARD_CSS + 'bottom:auto;top:50%;transform:translate(-50%,-50%);');
    card.append(node('div', 'font:800 24px system-ui,sans-serif;margin:4px 0 6px;', 'Bé đang học lớp mấy?'), node('div', 'font:500 14px system-ui,sans-serif;opacity:.75;margin-bottom:12px;', 'Bài tập sẽ vừa sức với lớp của bé. Bố mẹ đổi lại được sau.'));
    const row = node('div', `display:grid;grid-template-columns:repeat(${grades.length},1fr);gap:10px;`);
    card.append(row);
    return new Promise((resolve) => {
      grades.forEach((g, i) => {
        const b = node('button', CHOICE_CSS + `background:${CHOICE_COLORS[i % CHOICE_COLORS.length]};`, `Lớp ${g}`);
        b.onclick = () => { card.remove(); resolve(g); };
        row.append(b);
      });
      document.body.append(card);
    });
  }

  return { ask, askGrade, isOpen: () => open !== null };
}
