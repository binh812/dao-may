// Kiem khoi: mo trang that trong Edge headless, doi canh dung xong, roi kiem:
//  - hop bao loi #err trong, - man "Dang dung canh" da bien mat (vong lap khung hinh da chay).
// Can: Microsoft Edge + mang (three.js nap tu CDN). Chay: node scripts/smoke.mjs [query]
// Thieu Edge: do, tru khi dat GAMES3D_ALLOW_MISSING_EDGE=1 (bo qua kem canh bao).
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, mkdtempSync } from 'node:fs';
import { join, resolve, dirname, extname, normalize } from 'node:path';
import { execFile } from 'node:child_process';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const EDGE = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
if (!EDGE) {
  if (process.env.GAMES3D_ALLOW_MISSING_EDGE === '1') { console.log('smoke: CANH BAO khong co Edge, bo qua theo co GAMES3D_ALLOW_MISSING_EDGE'); process.exit(0); }
  console.error('smoke: khong tim thay Microsoft Edge'); process.exit(1);
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css' };
const server = createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([/\\])+/, '');
  const file = resolve(root, path || 'index.html');
  if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
  let body;
  try { body = await readFile(file); } catch { res.writeHead(404).end(); return; } // vd. /favicon.ico
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(body);
});
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const url = `http://127.0.0.1:${server.address().port}/?spin=0&dyn=0&${process.argv[2] ?? 'q=medium'}`;

const profile = mkdtempSync(join(tmpdir(), 'games3d-smoke-'));
// Phai goi khong dong bo: goi dong bo se khoa vong su kien va may chu tam o tren khong tra loi duoc.
const run = await new Promise((done) => {
  execFile(EDGE, ['--headless=new', '--disable-extensions', `--user-data-dir=${profile}`, '--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist',
    '--window-size=960,540', '--virtual-time-budget=9000', '--dump-dom', url], { encoding: 'utf8', timeout: 100000, maxBuffer: 32 * 1024 * 1024 },
  (error, stdout) => done({ error, stdout }));
});
server.close();

if (!run.stdout) { console.error(`smoke: Edge khong tra ve trang (${run.error?.message ?? 'rong'})`); process.exit(1); }
const dom = run.stdout;
const err = (dom.match(/id="err"[^>]*>([^<]*)</) ?? [])[1]?.trim() ?? '';
const problems = [];
if (err) problems.push(`trang bao loi: ${err}`);
if (!dom.includes('<canvas')) problems.push('khong co canvas');
if (dom.includes('id="loading"')) problems.push('man "Dang dung canh" van con: vong lap khung hinh chua chay');
if (problems.length) { console.error('smoke: DO\n' + problems.join('\n')); process.exit(1); }
console.log(`smoke: dat (${url})`);
