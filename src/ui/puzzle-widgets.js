// Phan be thao tac cua tung loai do vui. Moi ham dung nhan (puzzle, act) va tra ve { el, render(state, locked), auto }.
// `act(change)` nhan mot ham state -> state moi; widget khong tu giu trang thai va khong cham diem (luat o learn/puzzles.js).
// auto = true: hinh tu cho biet dung sai (can lech, muc nuoc) nen xong la tinh ngay; false: be bam "Kiem tra".
import { balanceSums, pourMove } from '../learn/puzzles.js';

const INK = '#3a2a4a', TAP = 'border:0;cursor:pointer;font-family:system-ui,sans-serif;color:#3a2a4a;touch-action:manipulation;';

export function node(tag, css, text = '') {
  const el = document.createElement(tag);
  el.style.cssText = css; el.textContent = text;
  return el;
}
function button(css, text, onTap) {
  const b = node('button', TAP + css, text);
  b.type = 'button'; b.onclick = onTap;
  return b;
}

// ---------------------------------------------------------------- can thang bang
const BEAM_HALF = 96, MAX_TILT_DEG = 9;

function balance(p, act) {
  const el = node('div', 'display:grid;gap:8px;justify-items:center;');
  const scale = node('div', `position:relative;width:${BEAM_HALF * 2 + 100}px;max-width:100%;height:132px;`);
  const post = node('div', 'position:absolute;left:50%;bottom:0;width:10px;height:74px;margin-left:-5px;border-radius:5px 5px 0 0;background:#b08a5a;');
  const foot = node('div', 'position:absolute;left:50%;bottom:0;width:70px;height:8px;margin-left:-35px;border-radius:4px;background:#8f6c42;');
  const beam = node('div', `position:absolute;left:50%;top:38px;width:${BEAM_HALF * 2}px;height:8px;margin-left:-${BEAM_HALF}px;border-radius:4px;background:#8f6c42;transition:transform .45s cubic-bezier(.3,1.5,.5,1);`);
  const PAN = 'position:absolute;top:44px;width:100px;min-height:46px;padding:4px 3px;box-sizing:border-box;border-radius:6px 6px 22px 22px;background:#f1e3c8;border-bottom:5px solid #b08a5a;display:flex;flex-wrap:nowrap;gap:3px;justify-content:center;align-items:flex-end;transition:transform .45s cubic-bezier(.3,1.5,.5,1);';
  const leftPan = node('div', PAN + 'left:0;'), rightPan = node('div', PAN + 'right:0;flex-wrap:wrap;');   // nhieu qua can thi xep hai hang
  for (const weight of p.left) leftPan.append(node('div', `min-width:32px;height:36px;padding:0 3px;border-radius:9px 9px 6px 6px;background:#e9d6ad;border:2px solid #b89b62;display:grid;place-items:center;font:800 17px system-ui,sans-serif;color:${INK};`, String(weight)));
  scale.append(post, foot, beam, leftPan, rightPan);
  const tray = node('div', 'display:flex;flex-wrap:wrap;gap:8px;justify-content:center;');
  const CHIP = 'width:48px;height:48px;border-radius:50%;font-weight:800;font-size:18px;';
  const chips = p.tray.map((weight, i) => { const b = button(CHIP, String(weight), () => act((s) => ({ on: s.on.map((v, k) => (k === i ? !v : v)) }))); tray.append(b); return b; });
  el.append(scale, tray);
  return {
    el, auto: true,
    render(state, locked) {
      const { left, right } = balanceSums(p, state), diff = right - left;
      const deg = diff === 0 ? 0 : Math.sign(diff) * Math.min(MAX_TILT_DEG, 3 + Math.abs(diff)), drop = Math.sin(deg * Math.PI / 180) * BEAM_HALF;
      beam.style.transform = `rotate(${deg}deg)`; leftPan.style.transform = `translateY(${-drop}px)`; rightPan.style.transform = `translateY(${drop}px)`;
      rightPan.replaceChildren(...p.tray.flatMap((weight, i) => (state.on[i] ? [node('div', `width:28px;height:28px;flex:0 0 auto;border-radius:50%;background:#ffb44d;display:grid;place-items:center;font:800 13px system-ui,sans-serif;color:${INK};`, String(weight))] : [])));
      chips.forEach((chip, i) => { chip.disabled = locked; chip.style.background = state.on[i] ? '#eadfce' : '#ffb44d'; chip.style.opacity = state.on[i] ? '.55' : '1'; });
    },
  };
}

// ---------------------------------------------------------------- dong nuoc
const LITRE_PX = 13, JUG_WIDTH = 70;

function pour(p, act) {
  const el = node('div', 'display:flex;gap:10px;justify-content:center;align-items:flex-end;');
  const move = (name) => () => act((s) => pourMove(p, s, name));
  const SMALL = 'min-height:44px;padding:0 8px;border-radius:12px;background:#a9dcff;font-weight:700;font-size:13px;';
  function jug(cap, fillMove, emptyMove) {
    const box = node('div', 'display:grid;gap:5px;justify-items:center;');
    const glass = node('div', `position:relative;width:${JUG_WIDTH}px;height:${cap * LITRE_PX + 8}px;border:3px solid #7fa7c4;border-top:0;border-radius:4px 4px 16px 16px;overflow:hidden;background:rgba(255,255,255,.7);`);
    const water = node('div', 'position:absolute;left:0;right:0;bottom:0;height:0;background:linear-gradient(#7fd0ff,#3d9be0);transition:height .4s ease;');
    const amount = node('div', `position:absolute;left:0;right:0;bottom:4px;text-align:center;font:800 20px system-ui,sans-serif;color:${INK};`);
    glass.append(water, amount);
    const buttons = [button(SMALL, 'Đổ đầy', move(fillMove)), button(SMALL + 'background:#eadfce;', 'Đổ đi', move(emptyMove))];
    box.append(node('div', `font:700 13px system-ui,sans-serif;color:${INK};`, `Bình ${cap} lít`), glass, ...buttons);
    return { box, buttons, show(value) { water.style.height = `${(value / cap) * 100}%`; amount.textContent = String(value); } };
  }
  const a = jug(p.capA, 'fillA', 'emptyA'), b = jug(p.capB, 'fillB', 'emptyB');
  const ARROW = 'width:56px;min-height:44px;border-radius:14px;background:#ffd978;font-weight:800;font-size:20px;';
  const toB = button(ARROW, '→', move('AtoB')), toA = button(ARROW, '←', move('BtoA'));
  toB.setAttribute('aria-label', 'Rót sang bình bên phải'); toA.setAttribute('aria-label', 'Rót sang bình bên trái');
  const middle = node('div', 'display:grid;gap:8px;align-self:center;justify-items:center;');
  middle.append(node('div', `font:700 12px system-ui,sans-serif;color:${INK};opacity:.7;`, 'Rót'), toB, toA);
  el.append(a.box, middle, b.box);
  return {
    el, auto: true,
    render(state, locked) { a.show(state.a); b.show(state.b); for (const control of [...a.buttons, ...b.buttons, toB, toA]) control.disabled = locked; },
  };
}

// ---------------------------------------------------------------- quy luat
function pattern(p, act) {
  const el = node('div', 'display:grid;gap:12px;justify-items:center;');
  const row = node('div', 'display:flex;gap:4px;justify-content:center;flex-wrap:nowrap;max-width:100%;');
  const size = p.numeric ? 'width:min(48px,13vw);font-size:19px;' : 'width:min(38px,10vw);font-size:22px;';
  let selected = 0;
  const cells = p.cells.map((value, i) => {
    const slot = p.blanks.indexOf(i);
    const cell = slot < 0 ? node('div', `${size}height:44px;border-radius:10px;background:#f1e3c8;display:grid;place-items:center;font-weight:800;color:${INK};`, String(value))
      : button(`${size}height:44px;border-radius:10px;background:#fff;font-weight:800;padding:0;`, '', () => { selected = slot; act((s) => s); });
    row.append(cell);
    return cell;
  });
  const palette = node('div', 'display:flex;gap:8px;justify-content:center;flex-wrap:wrap;');
  const options = p.palette.map((value) => {
    const b = button(`min-width:52px;height:50px;padding:0 6px;border-radius:14px;background:#ffd978;font-weight:800;font-size:${p.numeric ? 19 : 24}px;`, String(value), () => act((s) => {
      const fill = s.fill.map((v, k) => (k === selected ? value : v)), next = fill.findIndex((v) => v === null);
      if (next >= 0) selected = next;
      return { fill };
    }));
    palette.append(b);
    return b;
  });
  el.append(row, palette);
  return {
    el, auto: false, ready: (state) => state.fill.every((v) => v !== null),
    render(state, locked) {
      p.blanks.forEach((cellIndex, slot) => {
        const cell = cells[cellIndex], value = state.fill[slot];
        cell.textContent = value === null ? '?' : String(value); cell.disabled = locked;
        cell.style.outline = slot === selected && !locked ? '3px solid #ff9a3d' : '2px dashed #b89b62';
      });
      options.forEach((option) => { option.disabled = locked; });
    },
  };
}

// ---------------------------------------------------------------- vuon hoa
function garden(p, act) {
  const el = node('div', `display:grid;grid-template-columns:repeat(${p.n},44px);gap:5px;width:max-content;margin:0 auto;padding:7px;border-radius:14px;background:#cfe8b4;`);
  const cells = p.given.map((given, i) => {
    if (given !== null) { const fixed = node('div', 'width:44px;height:44px;border-radius:10px;background:#e7d8b6;display:grid;place-items:center;font-size:25px;', p.flowers[given]); el.append(fixed); return fixed; }
    // cham de doi loai hoa: trong -> loai 1 -> ... -> loai n -> trong
    const b = button('width:44px;height:44px;border-radius:10px;background:#fffdf6;font-size:25px;padding:0;outline:2px dashed #8fb26a;', '', () => act((s) => ({ grid: s.grid.map((v, k) => (k !== i ? v : v === null ? 0 : v + 1 >= p.n ? null : v + 1)) })));
    el.append(b);
    return b;
  });
  return {
    el, auto: false, ready: (state) => state.grid.every((v) => v !== null),
    render(state, locked) {
      cells.forEach((cell, i) => { if (p.given[i] !== null) return; cell.textContent = state.grid[i] === null ? '' : p.flowers[state.grid[i]]; cell.disabled = locked; });
    },
  };
}

const WIDGETS = { balance, pour, pattern, garden };

export function createWidget(puzzle, act) {
  const make = WIDGETS[puzzle.kind];
  if (!make) throw new RangeError(`Chua co giao dien cho cau do: ${puzzle.kind}`);
  return make(puzzle, act);
}
