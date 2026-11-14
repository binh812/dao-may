// Liet ke moi file game can de chay khong mang va ghi vao asset-manifest.json (service worker doc file nay).
// Chay sau khi them/xoa file trong src/, vendor/, icons/, assets/models/: node scripts/make-asset-manifest.mjs
// tests/offline.test.mjs se do neu file tren dia khong con khop.
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TOP_LEVEL = ['index.html', 'manifest.webmanifest'];
const FOLDERS = [['src', /\.js$/], ['vendor', /\.js$/], ['icons', /\.(png|svg)$/], ['assets/models', /\.glb$/]];

function walk(dir, pattern) {
  return readdirSync(dir).flatMap((name) => { const p = join(dir, name); return statSync(p).isDirectory() ? walk(p, pattern) : pattern.test(name) ? [p] : []; });
}

/** Danh sach duong dan tuong doi (dau /), da sap xep de ket qua on dinh. */
export function collectAssets(root = ROOT) {
  const files = FOLDERS.flatMap(([folder, pattern]) => walk(join(root, folder), pattern)).map((p) => relative(root, p).replaceAll('\\', '/'));
  return [...TOP_LEVEL, ...files.sort()];
}

export const manifestText = (root = ROOT) => JSON.stringify({ files: collectAssets(root) }, null, 2) + '\n';

/**
 * Ten bo luu cua service worker, gan voi DANH SACH file. Them/xoa file thi ten doi, sw.js doi theo, trinh duyet
 * cai lai service worker va luu san cac file moi; neu khong, may da cai tu truoc se thieu file khi mat mang.
 */
export const cacheName = (root = ROOT) => 'daomay-cache-' + createHash('sha1').update(collectAssets(root).join('\n')).digest('hex').slice(0, 10);
const CACHE_LINE = /^const CACHE = '[^']*';$/m;
export const swCacheName = (root = ROOT) => (readFileSync(join(root, 'sw.js'), 'utf8').match(/^const CACHE = '([^']*)';$/m) ?? [])[1];

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  writeFileSync(join(ROOT, 'asset-manifest.json'), manifestText());
  const sw = readFileSync(join(ROOT, 'sw.js'), 'utf8');
  if (!CACHE_LINE.test(sw)) { console.error("make-asset-manifest: khong tim thay dong const CACHE = '...' trong sw.js"); process.exit(1); }
  writeFileSync(join(ROOT, 'sw.js'), sw.replace(CACHE_LINE, `const CACHE = '${cacheName()}';`));
  console.log(`make-asset-manifest: ${collectAssets().length} file`);
}
