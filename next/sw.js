/* Dead Miles (next) service worker - 0.64. Push notifications only.
   No fetch handler and no caching on purpose: the game updates itself through version.txt, and a caching
   worker would keep friends on old files. Scope is /next/ only, so the old game is not affected. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

// iPhone drops a subscription that receives a push without showing anything, so always show one
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Dead Miles', {
    body: d.body || 'Something is happening at the base.',
    tag: d.tag || 'dm', icon: 'icon-192.png', badge: 'icon-192.png', data: { url: d.url || './' }
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || './', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) if (c.url.startsWith(self.registration.scope) && 'focus' in c) return c.focus();
    return self.clients.openWindow(url);
  }));
});
