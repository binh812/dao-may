// Ban choi O an quan (giao dien). Luat nam o game/oanquan-core.js; o day chi ve ban co, nhan thao tac va dien lai tung buoc.
// Be choi voi ban Nhim. Khong gioi han gio; nghi luc nao cung duoc.
import { OQ, QUAN_CELLS, SIDES, chooseMove, cloneGame, createGame, legalMoves, playMove, winner } from '../game/oanquan-core.js';
import { node } from './puzzle-widgets.js';

const CARD_CSS = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:8;width:min(97vw,600px);max-height:97vh;overflow-y:auto;box-sizing:border-box;padding:10px 12px 12px;border-radius:22px;background:#fffaf0;box-shadow:0 10px 30px rgba(40,20,60,.35);font-family:system-ui,"Segoe UI",Roboto,sans-serif;color:#3a2a4a;text-align:center;user-select:none;-webkit-user-select:none;';
const BTN = 'min-height:46px;padding:0 16px;border:0;border-radius:14px;font:800 16px system-ui,sans-serif;color:#3a2a4a;cursor:pointer;touch-action:manipulation;';
const CELL = 'position:relative;min-height:clamp(46px,15vh,62px);border-radius:12px;background:#f3e2bd;border:0;padding:2px;display:grid;place-items:center;font:800 20px system-ui,sans-serif;color:#3a2a4a;transition:background .15s,transform .15s;';
// Do kheo cua Nhim (xac suat chon nuoc an nhieu nhat). Mo phong 2.000 van: be di ngau nhien thang ~38% o muc 0.2, ~57% o muc 0.
// Be thua thi Nhim de hon, be thang thi Nhim kheo hon mot chut.
const SKILL = { start: 0.2, step: 0.1, min: 0, max: 0.55 };
const SCATTER_READ_MS = 2200;   // du lau de be doc vi sao co them soi
const STEP_MS = 210, RIVAL_WAIT_MS = 650, MAX_DOTS = 10;
const TOP_ROW = [11, 10, 9, 8, 7], RULES = 'Chọn một ô của bé rồi chọn chiều rải: mỗi ô một viên. Hết sỏi mà ô kế tiếp còn sỏi thì bốc rải tiếp. Ô kế tiếp trống thì bé ăn ô sau đó!';

export function createOanQuan({ onSound = () => {} } = {}) {
  let open = null, skill = SKILL.start;

  /** Mo mot van. Tra ve Promise<{ result }>: 'win' | 'draw' | 'lose' khi choi het van, null neu be nghi giua chung. */
  function play() {
    if (open) throw new Error('dang co mot van o an quan');
    const game = createGame();
    let shown = cloneGame(game), picked = null, busy = false, closed = false, timer = 0;
    const card = node('div', CARD_CSS);
    const head = node('div', 'display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;');
    const quit = node('button', BTN + 'min-height:44px;padding:0 14px;font-size:14px;font-weight:700;background:#eadfce;', 'Nghỉ chơi');
    head.append(node('div', 'font:800 17px system-ui,sans-serif;text-align:left;', 'Ô ăn quan · chơi với bạn Nhím'), quit);
    const scoreRow = node('div', 'display:flex;justify-content:space-between;gap:8px;font:800 15px system-ui,sans-serif;margin-bottom:6px;');
    const rivalScore = node('div', 'padding:4px 10px;border-radius:999px;background:#e3d7f5;'), myScore = node('div', 'padding:4px 10px;border-radius:999px;background:#ffd978;');
    scoreRow.append(myScore, rivalScore);
    const boardEl = node('div', 'display:grid;grid-template-columns:minmax(46px,.8fr) repeat(5,1fr) minmax(46px,.8fr);grid-template-rows:auto auto;gap:5px;padding:7px;border-radius:40px;background:#c9a56b;');
    const cells = Array.from({ length: OQ.cells }, (_, i) => {
      const mine = SIDES.player.includes(i), quanCell = QUAN_CELLS.includes(i);
      const el = node(mine ? 'button' : 'div', CELL + (quanCell ? `grid-row:1 / span 2;grid-column:${i === 0 ? 1 : 7};border-radius:${i === 0 ? '34px 12px 12px 34px' : '12px 34px 34px 12px'};background:#ead3a0;` : mine ? 'cursor:pointer;touch-action:manipulation;' : 'background:#e9dcc6;'));
      if (!quanCell) { el.style.gridRow = mine ? '2' : '1'; el.style.gridColumn = String(mine ? i + 1 : TOP_ROW.indexOf(i) + 2); }
      if (mine) { el.type = 'button'; el.onclick = () => pick(i); }
      boardEl.append(el);
      return el;
    });
    const note = node('div', 'font:600 14px/1.35 system-ui,sans-serif;min-height:19px;margin:6px 2px;color:#7a4a1a;', RULES);
    const foot = node('div', 'display:flex;gap:10px;justify-content:center;flex-wrap:wrap;min-height:46px;');
    const left = node('button', BTN + 'background:#a9dcff;', '← Rải sang trái'), right = node('button', BTN + 'background:#a9dcff;', 'Rải sang phải →');
    card.append(head, scoreRow, boardEl, note, foot);

    function draw(active = null) {
      myScore.textContent = `Bé: ${shown.score.player}`; rivalScore.textContent = `Nhím: ${shown.score.rival}`;
      cells.forEach((el, i) => {
        const count = shown.dan[i], dots = '●'.repeat(Math.min(count, MAX_DOTS));
        el.replaceChildren(...(shown.quan[i] ? [node('div', 'width:26px;height:26px;border-radius:50%;background:#b0552f;box-shadow:inset -3px -3px 0 rgba(0,0,0,.18);')] : []),
          node('div', '', String(count)), node('div', 'font-size:8px;line-height:9px;letter-spacing:1px;color:#8a6a3a;max-width:52px;word-break:break-all;', dots));
        el.style.outline = i === active ? '4px solid #ff9a3d' : i === picked ? '4px solid #2fa84f' : 'none';
        el.style.transform = i === active ? 'scale(1.06)' : '';
        el.setAttribute('aria-label', `${QUAN_CELLS.includes(i) ? 'Ô quan' : SIDES.player.includes(i) ? `Ô của bé số ${i}` : 'Ô của Nhím'}: ${count} viên sỏi${shown.quan[i] ? ' và một quan' : ''}`);
        if (SIDES.player.includes(i)) { el.disabled = busy || game.turn !== 'player' || game.dan[i] === 0; el.style.opacity = el.disabled && !busy ? '.6' : '1'; }
      });
      foot.replaceChildren(...(picked !== null && !busy ? [left, right] : []));
    }
    function pick(cell) {
      if (busy || game.over || game.turn !== 'player' || game.dan[cell] === 0) return;
      picked = cell; note.textContent = 'Bé muốn rải sang bên nào?'; draw();
    }
    /** Dien lai tung buoc cua mot nuoc di tren ban co dang hien, roi goi `then`. */
    function animate(steps, then) {
      let index = 0;
      const tick = () => {
        if (closed) return;
        if (index >= steps.length) { shown = cloneGame(game); draw(); then(); return; }
        const step = steps[index++];
        if (step.type === 'take') { shown.dan[step.cell] = 0; onSound('take'); }
        else if (step.type === 'sow') { shown.dan[step.cell] += 1; onSound('sow'); }
        else if (step.type === 'capture') { shown.dan[step.cell] = 0; shown.quan[step.cell] = false; shown.score[step.side] += step.gain; onSound('capture'); note.textContent = step.side === 'player' ? `Bé ăn được ${step.gain} điểm!` : `Nhím ăn ${step.gain} điểm.`; }
        else if (step.type === 'scatter') { note.textContent = step.side === 'player' ? `Hàng của bé hết sỏi: rải lại mỗi ô một viên (bé góp ${step.paid} viên${step.paid < OQ.scatter ? ', còn lại lấy ở hũ sỏi chung' : ''}).` : 'Hàng của Nhím hết sỏi: Nhím rải lại mỗi ô một viên.'; shown = cloneGame(game); onSound('sow'); }
        draw(step.cell ?? null);
        timer = setTimeout(tick, step.type === 'scatter' ? SCATTER_READ_MS : step.type === 'capture' ? STEP_MS * 3 : STEP_MS);
      };
      tick();
    }

    return new Promise((resolve) => {
      function close(result) {
        if (closed) return;
        closed = true; clearTimeout(timer); card.remove(); open = null; resolve({ result });
      }
      function finish() {
        const who = winner(game), result = who === 'player' ? 'win' : who === 'draw' ? 'draw' : 'lose';
        if (result !== 'draw') skill = Math.min(SKILL.max, Math.max(SKILL.min, skill + (result === 'win' ? SKILL.step : -SKILL.step)));
        note.textContent = `${result === 'win' ? 'Bé thắng rồi! Giỏi quá!' : result === 'draw' ? 'Hòa nhau! Ván hay quá!' : 'Ván này Nhím nhiều hơn một chút. Ván sau bé thử lại nhé!'} Bé ${game.score.player} điểm, Nhím ${game.score.rival} điểm.`;
        onSound(result === 'lose' ? 'end' : 'win');
        const done = node('button', BTN + 'background:#ffb44d;', 'Xong');
        done.onclick = () => close(result);
        foot.replaceChildren(done); quit.style.visibility = 'hidden';
      }
      function rivalTurn() {
        if (game.over) { finish(); return; }
        if (game.turn !== 'rival') { busy = false; note.textContent = 'Tới lượt bé! Chọn một ô ở hàng dưới.'; draw(); return; }
        const move = chooseMove(game, 'rival', Math.random, skill);
        if (!move) { busy = false; draw(); return; }
        timer = setTimeout(() => animate(playMove(game, 'rival', move.cell, move.dir), () => { if (game.over) finish(); else { busy = false; note.textContent = 'Tới lượt bé! Chọn một ô ở hàng dưới.'; draw(); } }), RIVAL_WAIT_MS);
      }
      function go(dir) {
        if (busy || picked === null || !legalMoves(game, 'player').some((m) => m.cell === picked)) return;
        const cell = picked; picked = null; busy = true; note.textContent = '';
        animate(playMove(game, 'player', cell, dir), rivalTurn);
      }
      left.onclick = () => go(-1); right.onclick = () => go(1);
      quit.onclick = () => close(null);
      document.body.append(card); open = card;
      draw();
    });
  }

  return { play, isOpen: () => open !== null };
}
