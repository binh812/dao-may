// The do vui tuong tac: khung chung (de bai, goi y, xem cach giai, de sau) quanh phan thao tac o puzzle-widgets.js.
// Khong gioi han gio, khong tru diem. Ket qua tra ve chi noi be giai theo cach nao, de noi goi quyet dinh phan thuong.
import { hintText, initialState, isSolved, solutionState, solutionSteps } from '../learn/puzzles.js';
import { createWidget, node } from './puzzle-widgets.js';

const CARD_CSS = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:8;width:min(96vw,470px);max-height:96vh;overflow-y:auto;box-sizing:border-box;padding:12px 14px 14px;border-radius:22px;background:#fffaf0;box-shadow:0 10px 30px rgba(40,20,60,.35);font-family:system-ui,"Segoe UI",Roboto,sans-serif;color:#3a2a4a;text-align:center;user-select:none;-webkit-user-select:none;';
const BTN = 'min-height:48px;padding:0 16px;border:0;border-radius:14px;font:800 16px system-ui,sans-serif;color:#3a2a4a;cursor:pointer;touch-action:manipulation;';
const HINT_READ_MS = 900;   // bam hai lan lien vao "Goi y" khong duoc nhay thang sang loi giai
const ARM_MS = 350, SOLVED_MS = 1100, WIDE_MIN_RATIO = 1.3, SHORT_SCREEN = 520;

export function createPuzzleCard() {
  let open = null;

  /**
   * Hien mot cau do. Tra ve Promise<{ quality }>: 'first' (tu giai, khong can goi y, khong kiem tra sai lan nao),
   * 'later' (giai duoc sau khi xem goi y hoac thu lai), 'shown' (xem cach giai), hoac null neu be bam "De sau".
   */
  function ask(puzzle, title) {
    if (open) throw new Error('dang co mot cau do chua xong');
    let state = initialState(puzzle), locked = false, helped = false, hintedAt = null, finished = false;
    const openedAt = performance.now();
    const card = node('div', CARD_CSS);
    // man hinh ngang va thap (dien thoai cam ngang): hinh ben trai, de bai va nut ben phai, de khong phai cuon
    const wide = innerWidth / innerHeight > WIDE_MIN_RATIO && innerHeight < SHORT_SCREEN;
    if (wide) card.style.width = 'min(96vw,680px)';
    const head = node('div', 'display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px;');
    const later = node('button', BTN + 'min-height:44px;padding:0 14px;font-size:14px;font-weight:700;background:#eadfce;', 'Để sau');
    head.append(node('div', 'font:700 14px system-ui,sans-serif;opacity:.75;text-align:left;', `${title} · ${puzzle.title}`), later);
    const prompt = node('div', 'font:800 18px/1.3 system-ui,sans-serif;margin:2px 0 10px;', puzzle.prompt);
    const note = node('div', 'font:600 14px/1.35 system-ui,sans-serif;min-height:19px;margin:8px 0;color:#7a4a1a;white-space:pre-line;');
    const foot = node('div', 'display:flex;gap:8px;justify-content:center;flex-wrap:wrap;');
    const help = node('button', BTN + 'background:#eadfce;', 'Gợi ý'), check = node('button', BTN + 'background:#b9ecaa;', 'Kiểm tra');
    let onAct = () => {};   // gan sau, khi da co render va solved
    const widget = createWidget(puzzle, (change) => onAct(change));
    foot.append(help); if (!widget.auto) foot.append(check);
    if (wide) {
      const body = node('div', 'display:flex;gap:14px;align-items:center;'), side = node('div', 'flex:1;min-width:0;');
      widget.el.style.flex = '0 0 auto'; side.append(prompt, note, foot); body.append(widget.el, side); card.append(head, body);
    } else card.append(head, prompt, widget.el, note, foot);

    return new Promise((resolve) => {
      const render = () => { widget.render(state, locked); if (!widget.auto) { check.disabled = locked || !widget.ready(state); check.style.opacity = check.disabled ? '.5' : '1'; } };
      function close(quality) {
        if (finished) return;
        finished = true; removeEventListener('keydown', onKey); card.remove(); open = null; resolve({ quality });
      }
      function solved() {
        locked = true; render();
        note.textContent = 'Giỏi quá! Bé giải được rồi!'; note.style.color = '#1f7a3a';
        help.disabled = later.disabled = true;
        setTimeout(() => close(helped ? 'later' : 'first'), SOLVED_MS);
      }
      onAct = (change) => {
        if (locked || finished || performance.now() - openedAt < ARM_MS) return;
        state = change(state); render();
        if (widget.auto && isSolved(puzzle, state)) solved();
      };
      check.onclick = () => {
        if (locked || !widget.ready(state)) return;
        if (isSolved(puzzle, state)) { solved(); return; }
        helped = true; note.textContent = 'Chưa khớp. Bé xem lại rồi thử tiếp nhé, không vội đâu!';
      };
      help.onclick = () => {
        if (locked) return;
        if (hintedAt === null) { hintedAt = performance.now(); helped = true; note.textContent = hintText(puzzle); help.textContent = 'Xem cách giải'; return; }
        if (performance.now() - hintedAt < HINT_READ_MS) return;
        // xem cach giai: hien loi giai tren hinh va bang loi; van duoc phan thuong nho
        locked = true; state = solutionState(puzzle); render();
        note.textContent = solutionSteps(puzzle).map((line, i, all) => (all.length > 1 ? `${i + 1}. ${line}` : line)).join('\n');
        const ok = node('button', BTN + 'background:#ffb44d;', 'Đã hiểu');
        ok.onclick = () => close('shown');
        foot.replaceChildren(ok); later.disabled = true; later.style.visibility = 'hidden';
      };
      later.onclick = () => { if (!locked) close(null); };
      const onKey = (e) => { if (e.code === 'Escape' && !locked) close(null); };
      addEventListener('keydown', onKey);
      document.body.append(card); open = card;
      render();
    });
  }

  return { ask, isOpen: () => open !== null };
}
