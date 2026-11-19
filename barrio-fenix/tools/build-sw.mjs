// Genera sw.js con la lista de archivos a precachear y una versión basada en su contenido.
import { readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';
const root = new URL('..', import.meta.url).pathname;
const include = ['index.html', 'manifest.webmanifest', 'css', 'src', 'vendor', 'assets'];
const files = [];
const walk = (p) => { const st = statSync(p); if (st.isDirectory()) readdirSync(p).forEach((f) => walk(join(p, f))); else files.push(relative(root, p)); };
include.forEach((p) => { try { walk(join(root, p)); } catch {} });
const list = files.filter((f) => !f.endsWith('.md') && !f.includes('THREE-LICENSE')).sort();
const h = createHash('sha1'); list.forEach((f) => h.update(f).update(readFileSync(join(root, f)))); const ver = h.digest('hex').slice(0, 10);
const sw = `// Generado por tools/build-sw.mjs — no editar a mano.
const VERSION = 'bf-${ver}';
const FILES = ${JSON.stringify(['./', ...list], null, 0)};
self.addEventListener('install', (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const range = e.request.headers.get('range');
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(async (hit) => {
    if (hit && range && hit.headers.get('content-type')?.startsWith('audio')) {
      // Safari pide audio por rangos: servir el trozo pedido desde la caché
      const buf = await hit.arrayBuffer(); const m = /bytes=(\\d+)-(\\d*)/.exec(range);
      const start = +m[1], end = m[2] ? +m[2] : buf.byteLength - 1;
      return new Response(buf.slice(start, end + 1), { status: 206, headers: { 'Content-Type': hit.headers.get('content-type'), 'Content-Range': \`bytes \${start}-\${end}/\${buf.byteLength}\`, 'Content-Length': String(end - start + 1), 'Accept-Ranges': 'bytes' } });
    }
    return hit || fetch(e.request).then((res) => { if (res.ok && new URL(e.request.url).origin === location.origin && !range) { const cp = res.clone(); caches.open(VERSION).then((c) => c.put(e.request, cp)); } return res; });
  }));
});
`;
writeFileSync(join(root, 'sw.js'), sw);
console.log('sw.js', ver, list.length, 'archivos');
