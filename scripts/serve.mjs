// May chu tinh nho de choi thu tren may nay va tren dien thoai cung Wi-Fi. Khong can cai gi, khong can Internet.
// Chay: node scripts/serve.mjs [cong]     Dung: Ctrl+C
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { networkInterfaces } from 'node:os';
import { resolve, dirname, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.argv[2]) || 8123;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml' };

const server = createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([/\\])+/, '');
  const file = resolve(root, path || 'index.html');
  if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
  let body; try { body = await readFile(file); } catch { res.writeHead(404).end('khong tim thay'); return; }
  // no-cache: sua code xong chi can tai lai trang la thay ban moi
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-cache' }).end(body);
});
server.on('error', (error) => { console.error(`serve: khong mo duoc cong ${port}: ${error.message}`); process.exit(1); });
server.listen(port, '0.0.0.0', () => {
  console.log(`Dao May dang chay. Dung bang Ctrl+C.\n  May nay:      http://127.0.0.1:${port}`);
  for (const list of Object.values(networkInterfaces())) for (const n of list ?? []) {
    if (n.family === 'IPv4' && !n.internal) console.log(`  Dien thoai:   http://${n.address}:${port}`);
  }
});
