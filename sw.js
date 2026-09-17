/* Dead Miles service worker: cache the app shell so the game opens offline. Network first, cache fallback. */
const CACHE='deadmiles-v44';
const SHELL=['./','./index.html','./style.css','./art.js','./game.js','./street.js','./icon.png','./icon-192.png','./icon-512.png','./icon-maskable-512.png','./manifest.json'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(u.origin!==location.origin||e.request.method!=='GET')return;
  e.respondWith(fetch(e.request,{cache:'no-store'}).then(r=>{const cp=r.clone();caches.open(CACHE).then(c=>c.put(e.request,cp));return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});

/* ---- push notifications ---- */
self.addEventListener('push',e=>{
  let d={};try{d=e.data?e.data.json():{};}catch(err){d={body:e.data&&e.data.text()||''};}
  const title=d.title||'Dead Miles';
  e.waitUntil(self.registration.showNotification(title,{
    body:d.body||'',
    icon:'./icon.png',
    badge:'./icon.png',
    tag:d.tag||'deadmiles',
    renotify:true,
    data:{url:d.url||'./'}
  }));
});
self.addEventListener('notificationclick',e=>{
  e.notification.close();
  const url=(e.notification.data&&e.notification.data.url)||'./';
  e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
    for(const c of list){if('focus' in c)return c.focus();}
    if(self.clients.openWindow)return self.clients.openWindow(url);
  }));
});
