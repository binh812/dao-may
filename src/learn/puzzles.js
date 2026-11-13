// Do vui tuong tac (thuan: khong DOM, co test). Khac the bai 4 lua chon: be thao tac truc tiep tren hinh (dat qua can,
// rot nuoc, dien day, xep vuon hoa) va thay ket qua ngay. Moi cau do sinh ra deu co loi giai (test kiem bang cach giai lai).
// Giao dien nam o ui/puzzle-card.js; o day chi co du lieu, luat va loi giai.

export const PUZZLE_KINDS = Object.freeze(['balance', 'pour', 'pattern', 'garden', 'sort']);
export const SHAPES = Object.freeze(['🌸', '🍄', '⭐', '🍃', '🐞']);
export const FLOWERS = Object.freeze(['🌷', '🌻', '🌼', '🍀']);
const MIN_GRADE = 1, MAX_GRADE = 3;

const int = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
const pick = (rng, list) => list[Math.floor(rng() * list.length)];
function shuffled(rng, list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}

// ---------------------------------------------------------------- can thang bang
const TRAYS = { 1: [1, 2, 3, 4, 5], 2: [1, 2, 3, 5, 8, 10], 3: [2, 3, 5, 10, 15, 20] };

function makeBalance(grade, rng) {
  const tray = TRAYS[grade];
  let answer, total;
  // tong khong duoc trung mot qua can co san, keo be chi cham mot lan la xong ma khong phai cong
  do {
    answer = shuffled(rng, tray.map((_, i) => i)).slice(0, int(rng, 2, 3)).sort((a, b) => a - b);
    total = answer.reduce((sum, i) => sum + tray[i], 0);
  } while (tray.includes(total));
  // lop 1 mot bao; lop 2, 3 hai bao de be phai cong truoc
  const first = grade === 1 ? total : int(rng, 1, total - 1), left = first === total ? [total] : [first, total - first];
  return { left, tray: [...tray], answer, prompt: 'Đặt quả cân lên đĩa bên phải cho cân thăng bằng.' };
}
/** Tong hai dia can voi trang thai hien tai. */
export function balanceSums(p, state) {
  return { left: p.left.reduce((a, b) => a + b, 0), right: p.tray.reduce((sum, w, i) => sum + (state.on[i] ? w : 0), 0) };
}

// ---------------------------------------------------------------- dong nuoc
export const POUR_MOVES = Object.freeze(['fillA', 'fillB', 'emptyA', 'emptyB', 'AtoB', 'BtoA']);
const POUR_STEPS = { 1: [2, 2], 2: [2, 4], 3: [4, 6] }, MAX_JUG = 9;

/** Trang thai sau mot thao tac voi hai binh (khong doi trang thai cu). */
export function pourMove(p, state, move) {
  const { a, b } = state, toB = Math.min(a, p.capB - b), toA = Math.min(b, p.capA - a);
  switch (move) {
    case 'fillA': return { a: p.capA, b };
    case 'fillB': return { a, b: p.capB };
    case 'emptyA': return { a: 0, b };
    case 'emptyB': return { a, b: 0 };
    case 'AtoB': return { a: a - toB, b: b + toB };
    case 'BtoA': return { a: a + toA, b: b - toA };
    default: throw new RangeError(`Thao tac khong hop le: ${move}`);
  }
}
/** Duong ngan nhat (danh sach thao tac) de mot trong hai binh co dung `target` lit; null neu khong the. */
export function solvePour(capA, capB, target) {
  const p = { capA, capB }, start = '0,0', seen = new Map([[start, null]]), queue = [{ a: 0, b: 0 }];
  for (let head = 0; head < queue.length; head++) {
    const state = queue[head];
    if (state.a === target || state.b === target) {
      const path = [];
      for (let key = `${state.a},${state.b}`; seen.get(key); key = seen.get(key).from) path.unshift(seen.get(key).move);
      return path;
    }
    for (const move of POUR_MOVES) {
      const next = pourMove(p, state, move), key = `${next.a},${next.b}`;
      if (!seen.has(key)) { seen.set(key, { from: `${state.a},${state.b}`, move }); queue.push(next); }
    }
  }
  return null;
}
// moi bo (binh A, binh B, dich) giai duoc, xep theo so buoc ngan nhat; tinh mot lan
const POUR_BANK = [];
for (let capA = 2; capA <= MAX_JUG; capA++) for (let capB = capA + 1; capB <= MAX_JUG; capB++) for (let target = 1; target < capB; target++) {
  if (target === capA) continue;
  const path = solvePour(capA, capB, target);
  if (path) POUR_BANK.push({ capA, capB, target, path });
}
function makePour(grade, rng) {
  const [lo, hi] = POUR_STEPS[grade], pool = POUR_BANK.filter((item) => item.path.length >= lo && item.path.length <= hi);
  const chosen = pick(rng, pool);
  return { ...chosen, path: [...chosen.path], prompt: `Đong đúng ${chosen.target} lít nước vào một trong hai bình.` };
}
const POUR_WORDS = {
  fillA: (p) => `Đổ đầy bình ${p.capA} lít`, fillB: (p) => `Đổ đầy bình ${p.capB} lít`,
  emptyA: (p) => `Đổ hết bình ${p.capA} lít đi`, emptyB: (p) => `Đổ hết bình ${p.capB} lít đi`,
  AtoB: (p) => `Rót bình ${p.capA} lít sang bình ${p.capB} lít`, BtoA: (p) => `Rót bình ${p.capB} lít sang bình ${p.capA} lít`,
};

// ---------------------------------------------------------------- quy luat
const UNITS = [[0, 1], [0, 1, 1], [0, 0, 1], [0, 1, 2]], PATTERN_BLANKS = 2;

function makePattern(grade, rng) {
  if (grade === 1) {
    const unit = pick(rng, UNITS), symbols = shuffled(rng, SHAPES), length = Math.max(unit.length * 2, 5) + PATTERN_BLANKS;
    const cells = Array.from({ length }, (_, i) => symbols[unit[i % unit.length]]);
    const used = [...new Set(cells)], palette = shuffled(rng, [...used, symbols[used.length]]);
    return { cells, blanks: [length - 2, length - 1], palette, numeric: false, rule: `Dãy lặp lại nhóm ${unit.map((u) => symbols[u]).join('')}.`,
      hint: 'Tìm nhóm hình lặp đi lặp lại từ đầu dãy.', prompt: 'Điền hai hình còn thiếu cho đúng quy luật.' };
  }
  const length = 6, doubling = grade === 3 && rng() < 0.3;
  let cells, rule, hint;
  if (doubling) {
    const start = int(rng, 1, 3);
    cells = Array.from({ length }, (_, i) => start * 2 ** i); rule = 'Mỗi số gấp đôi số đứng trước.'; hint = 'So mỗi số với số đứng trước: gấp lên mấy lần?';
  } else {
    const step = int(rng, 2, grade === 2 ? 5 : 9), down = rng() < 0.35, start = down ? step * (length - 1) + int(rng, 1, 9) : int(rng, 1, grade === 2 ? 10 : 30);
    cells = Array.from({ length }, (_, i) => start + (down ? -step : step) * i);
    rule = `Mỗi số ${down ? 'kém' : 'hơn'} số đứng trước ${step} đơn vị.`; hint = 'Xem mỗi số hơn hay kém số đứng trước bao nhiêu.';
  }
  // ba so dau luon hien de be tim ra quy luat; hai o trong nam o nua sau
  const blanks = shuffled(rng, [3, 4, 5]).slice(0, PATTERN_BLANKS).sort((a, b) => a - b), answers = blanks.map((i) => cells[i]);
  const options = new Set(answers), step = Math.abs(cells[1] - cells[0]);
  for (const candidate of shuffled(rng, answers.flatMap((v) => [v + 1, v - 1, v + step, v - step, v + 2, v + 10]))) { if (options.size >= 5) break; if (candidate > 0) options.add(candidate); }
  return { cells, blanks, palette: shuffled(rng, [...options]), numeric: true, rule, hint, prompt: 'Điền hai số còn thiếu cho đúng quy luật.' };
}

// ---------------------------------------------------------------- vuon hoa (o vuong Latin)
const GARDEN = { 1: { n: 3, blanks: 3 }, 2: { n: 4, blanks: 5 }, 3: { n: 4, blanks: 8 } };

/** So cach dien day luoi (dung som khi dat `limit`). grid: mang n*n, null la o trong. */
export function countGardenSolutions(n, grid, limit = 2) {
  const cells = [...grid];
  const fits = (index, value) => {
    const row = Math.floor(index / n), col = index % n;
    for (let k = 0; k < n; k++) if (cells[row * n + k] === value || cells[k * n + col] === value) return false;
    return true;
  };
  function fill(from) {
    let index = from; while (index < cells.length && cells[index] !== null) index++;
    if (index === cells.length) return 1;
    let found = 0;
    for (let value = 0; value < n && found < limit; value++) if (fits(index, value)) { cells[index] = value; found += fill(index + 1); cells[index] = null; }
    return found;
  }
  return fill(0);
}
function makeGarden(grade, rng) {
  const { n, blanks } = GARDEN[grade], rows = shuffled(rng, [...Array(n).keys()]), cols = shuffled(rng, [...Array(n).keys()]), names = shuffled(rng, [...Array(n).keys()]);
  const solution = Array.from({ length: n * n }, (_, i) => names[(rows[Math.floor(i / n)] + cols[i % n]) % n]);
  const given = [...solution];
  let removed = 0;
  for (const index of shuffled(rng, [...given.keys()])) {
    if (removed >= blanks) break;
    const kept = given[index]; given[index] = null;
    if (countGardenSolutions(n, given) === 1) removed++; else given[index] = kept;   // chi bo o khi vuon van co dung mot cach xep
  }
  return { n, given, solution, flowers: FLOWERS.slice(0, n), prompt: `Trồng hoa vào ô trống: mỗi hàng, mỗi cột có đủ ${n} loài, không loài nào lặp lại.` };
}
function gardenSolved(p, state) {
  const { n } = p, grid = state.grid;
  if (grid.some((value, i) => value === null || (p.given[i] !== null && value !== p.given[i]))) return false;
  for (let line = 0; line < n; line++) {
    const row = new Set(), col = new Set();
    for (let k = 0; k < n; k++) { row.add(grid[line * n + k]); col.add(grid[k * n + line]); }
    if (row.size !== n || col.size !== n) return false;
  }
  return true;
}

// ---------------------------------------------------------------- Tam Cam nhat thoc (phan loai so vao hai thung)
const SORT_GRAINS = 8, SORT_MIN_EACH = 2;
const SORT_RULES = {
  1: [
    { baskets: ['Bé hơn 10', 'Từ 10 trở lên'], lo: 1, hi: 20, first: (v) => v < 10, hint: 'Số có một chữ số thì bé hơn 10.' },
    { baskets: ['Bé hơn 5', 'Từ 5 trở lên'], lo: 1, hi: 10, first: (v) => v < 5, hint: 'Đếm 1, 2, 3, 4: đó là các số bé hơn 5.' },
  ],
  2: [
    { baskets: ['Số chẵn', 'Số lẻ'], lo: 1, hi: 50, first: (v) => v % 2 === 0, hint: 'Số chẵn có chữ số cuối là 0, 2, 4, 6 hoặc 8.' },
    { baskets: ['Bé hơn 50', 'Từ 50 trở lên'], lo: 10, hi: 99, first: (v) => v < 50, hint: 'Nhìn chữ số hàng chục: 1, 2, 3, 4 chục thì bé hơn 50.' },
  ],
  3: [
    { baskets: ['Trong bảng nhân 3', 'Không trong bảng nhân 3'], lo: 1, hi: 30, first: (v) => v % 3 === 0, hint: 'Đọc bảng nhân 3: ba, sáu, chín, mười hai... Số nào có trong đó?' },
    { baskets: ['Chia hết cho 5', 'Không chia hết cho 5'], lo: 1, hi: 60, first: (v) => v % 5 === 0, hint: 'Số chia hết cho 5 có chữ số cuối là 0 hoặc 5.' },
    { baskets: ['Số chẵn', 'Số lẻ'], lo: 100, hi: 999, first: (v) => v % 2 === 0, hint: 'Chỉ cần nhìn chữ số cuối: 0, 2, 4, 6, 8 là số chẵn.' },
  ],
};
function makeSort(grade, rng) {
  const rule = pick(rng, SORT_RULES[grade]), all = Array.from({ length: rule.hi - rule.lo + 1 }, (_, i) => rule.lo + i);
  const inFirst = shuffled(rng, all.filter(rule.first)), inSecond = shuffled(rng, all.filter((v) => !rule.first(v)));
  const fromFirst = Math.min(inFirst.length, SORT_GRAINS - SORT_MIN_EACH, int(rng, SORT_MIN_EACH, SORT_GRAINS - SORT_MIN_EACH));
  const grains = shuffled(rng, [...inFirst.slice(0, fromFirst), ...inSecond.slice(0, SORT_GRAINS - fromFirst)]);
  return { grains, baskets: [...rule.baskets], belongs: grains.map((v) => (rule.first(v) ? 0 : 1)), hint: rule.hint,
    story: 'Dì ghẻ trộn thóc lẫn gạo, bắt Tấm nhặt xong mới được đi hội. Bé giúp Tấm một tay nhé!',
    prompt: 'Chọn thúng, rồi chạm từng hạt để bỏ vào đúng thúng.' };
}

// ---------------------------------------------------------------- giao dien chung cho moi loai
const MAKERS = { balance: makeBalance, pour: makePour, pattern: makePattern, garden: makeGarden, sort: makeSort };
const TITLES = { balance: 'Cân thăng bằng', pour: 'Đong nước', pattern: 'Tìm quy luật', garden: 'Vườn hoa', sort: 'Tấm Cám nhặt thóc' };

/** Sinh mot cau do. grade ngoai 1..3 duoc keo ve gioi han gan nhat. */
export function makePuzzle(kind, grade, rng = Math.random) {
  if (!MAKERS[kind]) throw new RangeError(`Loai cau do khong co: ${kind}`);
  const level = Math.min(MAX_GRADE, Math.max(MIN_GRADE, Math.floor(Number(grade)) || MIN_GRADE));
  return { kind, grade: level, title: TITLES[kind], ...MAKERS[kind](level, rng) };
}

/** Chon loai cau do ke tiep, khong lap lai loai vua choi. */
export function pickKind(last, rng = Math.random) {
  return pick(rng, PUZZLE_KINDS.filter((kind) => kind !== last));
}

export function initialState(p) {
  switch (p.kind) {
    case 'balance': return { on: p.tray.map(() => false) };
    case 'pour': return { a: 0, b: 0 };
    case 'pattern': return { fill: p.blanks.map(() => null) };
    case 'garden': return { grid: [...p.given] };
    case 'sort': return { side: p.grains.map(() => null) };
    default: throw new RangeError(`Loai cau do khong co: ${p.kind}`);
  }
}

export function isSolved(p, state) {
  switch (p.kind) {
    case 'balance': { const sums = balanceSums(p, state); return sums.left === sums.right; }
    case 'pour': return state.a === p.target || state.b === p.target;
    case 'pattern': return p.blanks.every((cell, i) => state.fill[i] === p.cells[cell]);
    case 'garden': return gardenSolved(p, state);
    case 'sort': return p.belongs.every((basket, i) => state.side[i] === basket);
    default: throw new RangeError(`Loai cau do khong co: ${p.kind}`);
  }
}

/** Mot trang thai da giai xong (de hien khi be xin xem cach giai). */
export function solutionState(p) {
  switch (p.kind) {
    case 'balance': return { on: p.tray.map((_, i) => p.answer.includes(i)) };
    case 'pour': return p.path.reduce((state, move) => pourMove(p, state, move), { a: 0, b: 0 });
    case 'pattern': return { fill: p.blanks.map((cell) => p.cells[cell]) };
    case 'garden': return { grid: [...p.solution] };
    case 'sort': return { side: [...p.belongs] };
    default: throw new RangeError(`Loai cau do khong co: ${p.kind}`);
  }
}

/** Goi y: chi cach nghi, khong noi dap an. */
export function hintText(p) {
  switch (p.kind) {
    case 'balance': return p.left.length > 1 ? 'Cộng hai bao bên trái trước, rồi chọn các quả cân cộng lại bằng đúng số đó.' : 'Chọn các quả cân cộng lại bằng đúng số ghi trên bao bên trái.';
    case 'pour': return `Đổ đầy một bình rồi rót sang bình kia: phần còn lại trong bình là bao nhiêu lít?`;
    case 'pattern': return p.hint;
    case 'garden': return 'Tìm hàng hoặc cột chỉ còn thiếu một ô: ô đó phải là loài hoa chưa có trong hàng, cột ấy.';
    case 'sort': return p.hint;
    default: throw new RangeError(`Loai cau do khong co: ${p.kind}`);
  }
}

/** Cach giai, tung buoc mot, bang loi. */
export function solutionSteps(p) {
  switch (p.kind) {
    case 'balance': { const total = p.left.reduce((a, b) => a + b, 0), weights = p.answer.map((i) => p.tray[i]);
      return [...(p.left.length > 1 ? [`Bên trái: ${p.left.join(' + ')} = ${total}.`] : [`Bên trái nặng ${total}.`]), `Đặt các quả ${weights.join(', ')}: ${weights.join(' + ')} = ${total}.`]; }
    case 'pour': return p.path.map((move) => `${POUR_WORDS[move](p)}.`);
    case 'pattern': return [p.rule, `Hai ô còn thiếu là ${p.blanks.map((cell) => p.cells[cell]).join(' và ')}.`];
    case 'garden': return ['Mỗi hàng và mỗi cột đều có đủ các loài hoa, mỗi loài một lần.'];
    case 'sort': return p.baskets.map((name, basket) => `${name}: ${p.grains.filter((_, i) => p.belongs[i] === basket).sort((a, b) => a - b).join(', ')}.`);
    default: throw new RangeError(`Loai cau do khong co: ${p.kind}`);
  }
}
