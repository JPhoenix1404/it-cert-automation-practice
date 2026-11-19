// Generado por tools/build-sw.mjs — no editar a mano.
const VERSION = 'bf-15113aac7e';
const FILES = ["./","assets/characters/prueba.vrm","assets/icons/icon-180.png","assets/icons/icon-192.png","assets/icons/icon-512.png","assets/music/casa.mp3","assets/music/menu.mp3","assets/music/noche.mp3","assets/music/restaurante.mp3","assets/music/super.mp3","assets/music/trabajo.mp3","css/style.css","index.html","manifest.webmanifest","src/audio.js","src/character.js","src/data/characters.js","src/data/characters_extra.js","src/data/items.js","src/data/quests.js","src/game.js","src/gameplay.js","src/input.js","src/main.js","src/map.js","src/minigames/base.js","src/minigames/games.js","src/npc.js","src/player.js","src/quests.js","src/relations.js","src/state.js","src/time.js","src/toon.js","src/ui.js","src/vrm.js","src/world.js","vendor/BufferGeometryUtils.js","vendor/GLTFLoader.js","vendor/THREE-VRM-LICENSE","vendor/three-vrm.module.min.js","vendor/three.module.min.js"];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const range = e.request.headers.get('range');
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(async (hit) => {
    if (hit && range && hit.headers.get('content-type')?.startsWith('audio')) {
      // Safari pide audio por rangos: servir el trozo pedido desde la caché
      const buf = await hit.arrayBuffer(); const m = /bytes=(\d+)-(\d*)/.exec(range);
      const start = +m[1], end = m[2] ? +m[2] : buf.byteLength - 1;
      return new Response(buf.slice(start, end + 1), { status: 206, headers: { 'Content-Type': hit.headers.get('content-type'), 'Content-Range': `bytes ${start}-${end}/${buf.byteLength}`, 'Content-Length': String(end - start + 1), 'Accept-Ranges': 'bytes' } });
    }
    return hit || fetch(e.request).then((res) => { if (res.ok && new URL(e.request.url).origin === location.origin && !range) { const cp = res.clone(); caches.open(VERSION).then((c) => c.put(e.request, cp)); } return res; });
  }));
});
