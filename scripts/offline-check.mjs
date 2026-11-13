// Kiem tra "choi khong can mang" that su: mo game mot lan khi co may chu (service worker luu san moi file),
// TAT may chu, roi mo lai dung dia chi do bang cung ho so trinh duyet. Lan hai phai chay duoc hoan toan tu ban da luu.
// Chay: node scripts/offline-check.mjs      Can Microsoft Edge.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, mkdtempSync } from 'node:fs';
import { join, resolve, dirname, extname, normalize } from 'node:path';
import { execFile } from 'node:child_process';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const EDGE = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
if (!EDGE) { console.error('offline-check: khong tim thay Microsoft Edge'); process.exit(1); }

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml' };
let requests = 0;
const server = createServer(async (req, res) => {
  requests++;
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([/\\])+/, '');
  const file = resolve(root, path || 'index.html');
  if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
  let body; try { body = await readFile(file); } catch { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(body);
});
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const url = `http://127.0.0.1:${server.address().port}/index.html?spin=0&dyn=0&q=low&grade=2`;
const profile = mkdtempSync(join(tmpdir(), 'games3d-offline-'));

function open(budgetMs) {
  return new Promise((done) => execFile(EDGE, ['--headless=new', '--disable-extensions', `--user-data-dir=${profile}`, '--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist',
    '--window-size=960,540', `--virtual-time-budget=${budgetMs}`, '--dump-dom', url], { encoding: 'utf8', timeout: 100000, maxBuffer: 32 * 1024 * 1024 }, (error, stdout) => done(stdout ?? '')));
}
function problemsIn(dom) {
  const out = [], err = (dom.match(/id="err"[^>]*>([^<]*)</) ?? [])[1]?.trim() ?? '';
  if (!dom.includes('<canvas')) out.push('khong co canvas (trang khong tai duoc)');
  if (err) out.push(`trang bao loi: ${err}`);
  if (dom.includes('id="loading"')) out.push('vong lap khung hinh chua chay');
  return out;
}

const online = problemsIn(await open(15000));
const servedOnline = requests;
await new Promise((ok) => server.close(ok));
server.closeAllConnections?.();
if (online.length) { console.error('offline-check: DO ngay khi con mang\n' + online.join('\n')); process.exit(1); }

const offline = problemsIn(await open(9000));
if (offline.length) { console.error(`offline-check: DO khi mat mang (lan co mang da phuc vu ${servedOnline} yeu cau)\n` + offline.join('\n')); process.exit(1); }
console.log(`offline-check: dat. Lan co mang: ${servedOnline} yeu cau; sau khi tat may chu game van mo va chay.`);
