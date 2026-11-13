// Liet ke moi file game can de chay khong mang va ghi vao asset-manifest.json (service worker doc file nay).
// Chay sau khi them/xoa file trong src/, vendor/, icons/: node scripts/make-asset-manifest.mjs
// tests/offline.test.mjs se do neu file tren dia khong con khop.
import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TOP_LEVEL = ['index.html', 'manifest.webmanifest'];
const FOLDERS = [['src', /\.js$/], ['vendor', /\.js$/], ['icons', /\.(png|svg)$/]];

function walk(dir, pattern) {
  return readdirSync(dir).flatMap((name) => { const p = join(dir, name); return statSync(p).isDirectory() ? walk(p, pattern) : pattern.test(name) ? [p] : []; });
}

/** Danh sach duong dan tuong doi (dau /), da sap xep de ket qua on dinh. */
export function collectAssets(root = ROOT) {
  const files = FOLDERS.flatMap(([folder, pattern]) => walk(join(root, folder), pattern)).map((p) => relative(root, p).replaceAll('\\', '/'));
  return [...TOP_LEVEL, ...files.sort()];
}

export const manifestText = (root = ROOT) => JSON.stringify({ files: collectAssets(root) }, null, 2) + '\n';

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  writeFileSync(join(ROOT, 'asset-manifest.json'), manifestText());
  console.log(`make-asset-manifest: ${collectAssets().length} file`);
}
