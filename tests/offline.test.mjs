// Bao dam game chay duoc khi khong co mang: khong con dia chi ngoai nao, va danh sach file luu san luon day du.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cacheName, collectAssets, manifestText, swCacheName } from '../scripts/make-asset-manifest.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
const walk = (dir) => readdirSync(dir).flatMap((n) => { const p = join(dir, n); return statSync(p).isDirectory() ? walk(p) : [p]; });

test('asset-manifest.json on disk matches the files that exist', () => {
  assert.equal(read('asset-manifest.json').replaceAll('\r\n', '\n'), manifestText(root), 'chay lai: node scripts/make-asset-manifest.mjs');
});

test('the service worker cache name follows the asset list', () => {
  // neu khong khop: may da cai game tu truoc se khong luu san cac file moi (vd. the gioi moi) va hong khi mat mang
  assert.equal(swCacheName(root), cacheName(root), 'chay lai: node scripts/make-asset-manifest.mjs');
});

test('every listed asset exists and the essentials are listed', () => {
  const files = collectAssets(root);
  for (const f of files) assert.ok(existsSync(join(root, f)), `thieu file: ${f}`);
  for (const must of ['index.html', 'manifest.webmanifest', 'src/main.js', 'vendor/three/build/three.module.js', 'vendor/three/build/three.core.js', 'icons/icon-192.png', 'icons/icon-512.png']) {
    assert.ok(files.includes(must), `danh sach thieu: ${must}`);
  }
});

test('the page loads nothing from another origin', () => {
  const html = read('index.html');
  const importMap = JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]);
  for (const [name, target] of Object.entries(importMap.imports)) assert.ok(target.startsWith('./'), `import map "${name}" tro ra ngoai: ${target}`);
  assert.equal(/(?:src|href)="(?:https?:)?\/\//.test(html), false, 'index.html con tai tai nguyen tu dia chi ngoai');
});

test('game code imports only local modules or names from the import map', () => {
  const importMap = JSON.parse(read('index.html').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
  const prefixes = Object.keys(importMap);
  for (const file of walk(join(root, 'src')).filter((p) => p.endsWith('.js'))) {
    const text = readFileSync(file, 'utf8');
    for (const m of text.matchAll(/^import [^'"]*['"]([^'"]+)['"];?$/gm)) {
      const spec = m[1];
      if (spec.startsWith('./') || spec.startsWith('../')) continue;
      const hit = prefixes.find((p) => (p.endsWith('/') ? spec.startsWith(p) : spec === p));
      assert.ok(hit, `${file}: import "${spec}" khong co trong import map`);
      const resolved = importMap[hit] + (hit.endsWith('/') ? spec.slice(hit.length) : '');
      assert.ok(existsSync(join(root, resolved)), `${file}: "${spec}" tro toi file khong ton tai: ${resolved}`);
    }
    assert.equal(/fetch\(\s*['"`]https?:/.test(text), false, `${file}: goi mang ra ngoai`);
  }
});

test('vendored three.js files import only files that were vendored', () => {
  for (const file of walk(join(root, 'vendor', 'three')).filter((p) => p.endsWith('.js'))) {
    for (const m of readFileSync(file, 'utf8').matchAll(/(?:from|import)\s*'(\.{1,2}\/[^']+)'/g)) {
      assert.ok(existsSync(resolve(dirname(file), m[1])), `${file} can ${m[1]} nhung chua duoc chep`);
    }
  }
});

test('the web manifest and service worker are wired up', () => {
  const manifest = JSON.parse(read('manifest.webmanifest')), html = read('index.html');
  assert.ok(html.includes('rel="manifest"') && html.includes('manifest.webmanifest'));
  assert.ok(html.includes("serviceWorker.register('sw.js')"));
  for (const icon of manifest.icons) assert.ok(existsSync(join(root, icon.src)), `thieu icon ${icon.src}`);
  assert.ok(manifest.start_url.startsWith('./') && manifest.scope === './');
  assert.ok(read('sw.js').includes('asset-manifest.json'));
});
