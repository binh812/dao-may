// Service worker: de game chay khi khong co mang.
// Chien luoc: luc cai dat thi luu san moi file trong asset-manifest.json; khi chay thi hoi mang truoc
// (de ban moi luon duoc dung khi co mang), mang loi hoac cham qua NETWORK_TIMEOUT_MS thi lay ban da luu.
const CACHE = 'daomay-cache-53fcf845f2';
const NETWORK_TIMEOUT_MS = 3000;

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const response = await fetch('asset-manifest.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`khong tai duoc asset-manifest.json (${response.status})`);
    const { files } = await response.json();
    const cache = await caches.open(CACHE);
    await cache.addAll(files.map((f) => new Request(f, { cache: 'no-store' })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) if (name !== CACHE) await caches.delete(name);
    await self.clients.claim();
  })());
});

async function fromNetwork(request) {
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), NETWORK_TIMEOUT_MS);
  try {
    const response = await fetch(request, { signal: controller.signal });
    if (response.ok) { const cache = await caches.open(CACHE); await cache.put(request, response.clone()); }
    return response;
  } finally { clearTimeout(timer); }
}

self.addEventListener('fetch', (event) => {
  const { request } = event, url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  event.respondWith((async () => {
    try { return await fromNetwork(request); }
    catch (networkError) {
      // tham so ?q=...&w=... khong doi noi dung file, nen bo qua khi tim ban da luu
      const cached = await caches.match(request, { ignoreSearch: true }) ?? (request.mode === 'navigate' ? await caches.match('index.html') : undefined);
      if (cached) return cached;
      throw networkError;
    }
  })());
});
