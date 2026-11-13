// Chep three.js vao vendor/ de game chay khong can mang. Chi chep cac file game thuc su dung
// (ban build + cac addon duoc import va nhung file chung keo theo).
// Chay: node scripts/vendor-three.mjs <thu muc goi three da giai nen, co build/ va examples/jsm/>
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, statSync, existsSync, copyFileSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = process.argv[2] && resolve(process.argv[2]);
if (!source || !existsSync(join(source, 'build', 'three.module.js'))) {
  console.error('vendor-three: can duong dan toi goi three da giai nen (co build/three.module.js)');
  process.exit(1);
}
const version = JSON.parse(readFileSync(join(source, 'package.json'), 'utf8')).version;

function walk(dir) {
  return readdirSync(dir).flatMap((n) => { const p = join(dir, n); return statSync(p).isDirectory() ? walk(p) : p.endsWith('.js') ? [p] : []; });
}

// addon duoc game import truc tiep
const wanted = new Set();
for (const file of walk(join(root, 'src'))) {
  for (const m of readFileSync(file, 'utf8').matchAll(/from 'three\/addons\/([^']+)'/g)) wanted.add(join(source, 'examples', 'jsm', m[1]));
}
// ... va nhung file chung import tuong doi (de quy)
const queue = [...wanted, join(source, 'build', 'three.module.js')], seen = new Set();
while (queue.length) {
  const file = queue.pop();
  if (seen.has(file)) continue;
  if (!existsSync(file)) { console.error(`vendor-three: thieu file ${file}`); process.exit(1); }
  seen.add(file);
  for (const m of readFileSync(file, 'utf8').matchAll(/(?:from|import)\s*'(\.{1,2}\/[^']+)'/g)) queue.push(resolve(dirname(file), m[1]));
}

const out = join(root, 'vendor', 'three');
rmSync(out, { recursive: true, force: true });
for (const file of seen) {
  const target = join(out, relative(source, file));
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(file, target);
}
copyFileSync(join(source, 'LICENSE'), join(out, 'LICENSE'));
writeFileSync(join(out, 'VERSION'), version + '\n');
console.log(`vendor-three: da chep ${seen.size} file cua three ${version} vao vendor/three`);
