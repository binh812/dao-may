// Kiem tinh: moi module trong src/ dung cu phap, moi import tuong doi tro toi file co that,
// moi ten duoc import deu duoc file dich export, va khong file nao vuot gioi han dong.
// Chay: node scripts/check-modules.mjs   (khong can cai gi them)
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const MAX_LINES = 400;
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'src');

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.js') ? [p] : [];
  });
}

const files = walk(srcDir);
const errors = [];
const exportsOf = new Map();

for (const file of files) {
  const text = readFileSync(file, 'utf8');
  const names = new Set();
  for (const m of text.matchAll(/^export \{([^}]*)\};?$/gm)) m[1].split(',').map((s) => s.trim()).filter(Boolean).forEach((n) => names.add(n.split(/\s+as\s+/).pop()));
  for (const m of text.matchAll(/^export (?:const|let|function|class) (\w+)/gm)) names.add(m[1]);
  exportsOf.set(file, names);
}

for (const file of files) {
  const rel = relative(root, file).replaceAll('\\', '/');
  const text = readFileSync(file, 'utf8');
  const lines = text.split('\n').length;
  if (lines > MAX_LINES) errors.push(`${rel}: ${lines} dong, vuot gioi han ${MAX_LINES}`);

  const check = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (check.status !== 0) errors.push(`${rel}: loi cu phap\n${check.stderr.trim()}`);

  for (const m of text.matchAll(/^import (?:\{([^}]*)\} from )?'(\.[^']+)';?$/gm)) {
    const target = resolve(dirname(file), m[2]);
    if (!existsSync(target)) { errors.push(`${rel}: import '${m[2]}' khong ton tai`); continue; }
    if (!m[1]) continue;
    const exported = exportsOf.get(target) ?? new Set();
    for (const name of m[1].split(',').map((s) => s.trim().split(/\s+as\s+/)[0]).filter(Boolean)) {
      if (!exported.has(name)) errors.push(`${rel}: '${name}' khong duoc export boi ${m[2]}`);
    }
  }
}

if (errors.length) {
  console.error(`check-modules: ${errors.length} loi\n` + errors.join('\n'));
  process.exit(1);
}
console.log(`check-modules: ${files.length} module dat`);
