/* Service worker só do Raio-X (escopo /ferramentas/raio-x-do-extrato): a ferramenta abre sem internet
 * depois da primeira visita. Rede primeiro, cache como reserva: com internet, nunca serve versão velha.
 * Não guarda nada que a pessoa envia: só os arquivos da própria página (HTML, JS, CSS, fontes). */
const CACHE = 'raio-x-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n.startsWith('raio-x-') && n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

// A página informa o que carregou (os arquivos têm nomes com hash): guardamos para a próxima abertura offline.
self.addEventListener('message', (event) => {
  if (event.data?.type !== 'guardar' || !Array.isArray(event.data.urls)) return;
  const mesmaOrigem = event.data.urls.filter((u) => typeof u === 'string' && new URL(u, self.location.origin).origin === self.location.origin);
  event.waitUntil(caches.open(CACHE).then((c) => Promise.all(mesmaOrigem.map((u) => c.add(u).catch(() => undefined)))));
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copia = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copia));
        }
        return res;
      })
      .catch(() => caches.match(req).then((guardado) => guardado ?? Response.error())),
  );
});
