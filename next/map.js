/* Dead Miles (next) 0.9 - the real-world map (DESIGN.md: "real-world GPS map" comes back from the old game).
   Opens full screen from the Map tab on the home screen. Leaflet + OpenStreetMap tiles (the same CDN the old game used),
   real nearby buildings from the Overpass API. Walk within ~35 m of one with the map open and it becomes a LANDMARK
   house in the house list: its real name, a pin, and a type from its tags. Up to 3 a day, on foot only.

   Privacy: location is asked for only when the map opens and lives only in memory while it is open. Overpass is asked
   for a whole ~700 m grid square, never her exact spot, and the answer is cached on the phone. The save (cloud too)
   keeps only each landmark house's type, name/street and seed - never a coordinate or an OpenStreetMap id.

   Lessons kept from the old street.js: GPS accuracy filtering, two Overpass mirrors with backoff, separate shop and
   building queries (a slow building lookup must not wipe out the pharmacy), the speed check that needs 3 fast readings
   in a row (a single GPS jump is not a car) and differences against the oldest fix minus both accuracies. */
'use strict';
(() => {
  const $ = s => document.querySelector(s);
  const toast = (m, d) => DM.E.toast(m, d);
  const LF_JS = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
  const LF_CSS = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
  const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  const ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
  const MIRRORS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
  const CLAIM_M = 35, MAX_ACC = 60, VEHICLE_MS = 9, SETTLE_MS = 45000, FAST_HITS = 3;
  const CELL = 0.006, CACHE_V = 1, CACHE_DAYS = 7, HOUSES_SHOWN = 45;

  const M = { on: false, map: null, me: null, ring: null, watch: null, pos: null, spd: [], fastRun: 0, lastFast: 0, lastSpd: 0,
    places: {}, markers: {}, cells: {}, far: {}, busy: false, fails: 0, retryT: null, wake: null, lf: null, msg: '', gpsMsg: '' };

  // ------------------------------------------------------------- what a real place becomes
  const ICON = {
    pharmacy: '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z" fill="#f6e3bb"/>',
    police: '<path d="M12 2l8 3v6c0 5-3.4 9-8 11-4.6-2-8-6-8-11V5z" fill="#8ea2e0"/><path d="M12 7l1.4 3 3.2.3-2.4 2.1.7 3.1-2.9-1.7-2.9 1.7.7-3.1-2.4-2.1 3.2-.3z" fill="#11142f"/>',
    garage: '<path d="M5 20V8l7-5 7 5v12h-3v-7H8v7z" fill="#c9a85a"/><rect x="9" y="15" width="6" height="2" fill="#11142f"/>',
    bodega: '<path d="M4 9l2-5h12l2 5v11H4z" fill="#f07b3c"/><rect x="9" y="13" width="6" height="7" fill="#11142f"/>',
    laundro: '<rect x="5" y="3" width="14" height="18" rx="2" fill="#3fa7a0"/><circle cx="12" cy="13" r="4.2" fill="#11142f"/><circle cx="12" cy="13" r="2.2" fill="#9ad0cb"/>',
    school: '<path d="M2 9l10-5 10 5-10 5z" fill="#f6e3bb"/><path d="M6 11v5c3 2.4 9 2.4 12 0v-5l-6 3z" fill="#c9b07a"/>',
    rowS: '<path d="M4 11l8-7 8 7v9H4z" fill="#9d90bf"/><rect x="10" y="14" width="4" height="6" fill="#11142f"/>',
    rowL: '<path d="M4 11l8-7 8 7v9H4z" fill="#9d90bf"/><rect x="10" y="14" width="4" height="6" fill="#11142f"/>',
    apt: '<rect x="5" y="3" width="14" height="18" fill="#7a6aa8"/><path d="M8 6h2v2H8zm6 0h2v2h-2zM8 10h2v2H8zm6 0h2v2h-2zM8 14h2v2H8zm6 0h2v2h-2z" fill="#11142f"/>',
  };
  const svg = t => `<svg viewBox="0 0 24 24" width="100%" height="100%">${ICON[t] || ICON.rowS}</svg>`;
  const SHOP = { chemist: 'pharmacy', convenience: 'bodega', supermarket: 'bodega', deli: 'bodega', grocery: 'bodega', alcohol: 'bodega', kiosk: 'bodega',
    greengrocer: 'bodega', laundry: 'laundro', dry_cleaning: 'laundro', car_repair: 'garage', tyres: 'garage' };
  const AMEN = { pharmacy: 'pharmacy', police: 'police', fuel: 'garage', school: 'school', college: 'school', kindergarten: 'school', laundry: 'laundro' };
  const HOUSE = ['house', 'detached', 'semidetached_house', 'terrace', 'bungalow'], FLATS = ['apartments', 'residential'];
  function typeOf(tg, id) {
    if (AMEN[tg.amenity]) return AMEN[tg.amenity];
    if (SHOP[tg.shop]) return SHOP[tg.shop];
    if (HOUSE.includes(tg.building)) return (+tg['building:levels'] >= 3 || DM.D.hashStr(id) % 3 === 0) ? 'rowL' : 'rowS';
    if (FLATS.includes(tg.building)) return 'apt';
    return null;
  }
  function placeOf(el) {
    const lat = el.lat != null ? el.lat : el.center && el.center.lat, lon = el.lon != null ? el.lon : el.center && el.center.lon;
    if (lat == null) return null;
    const tg = el.tags || {}, id = el.type + '/' + el.id, type = typeOf(tg, id);
    if (!type) return null;
    const street = tg['addr:housenumber'] && tg['addr:street'] ? tg['addr:housenumber'] + ' ' + tg['addr:street'] : (tg['addr:street'] || '');
    const name = tg.name || tg.brand || street || DM.D.BTYPES[type].n;
    return { id, lat, lon, type, name: String(name).slice(0, 40), street: String(street).slice(0, 40), house: !tg.amenity && !tg.shop };
  }

  // ------------------------------------------------------------- geometry + the on-foot check (from street.js)
  function dist(a, b) { const R = 6371000, r = Math.PI / 180, dLa = (b.lat - a.lat) * r, dLo = (b.lon - a.lon) * r; const x = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLo / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); }
  function speedNow() {
    const h = M.spd; if (h.length < 2) return 0;
    const a = h[0], b = h[h.length - 1], dt = (b.t - a.t) / 1000; if (dt < 1) return M.lastSpd || 0;
    const d = dist(a, b), slop = (a.acc || 0) + (b.acc || 0);
    return d <= slop ? 0 : (d - slop) / dt;
  }
  function noteSpeed(pos, gps, t) {
    M.spd.push({ lat: pos.lat, lon: pos.lon, acc: pos.acc, t }); if (M.spd.length > 6) M.spd.shift();
    const v = typeof gps === 'number' && gps >= 0 ? gps : speedNow();
    M.lastSpd = v; M.fastRun = v >= VEHICLE_MS ? M.fastRun + 1 : 0;
    if (M.fastRun >= FAST_HITS) M.lastFast = t;
  }
  const driveLock = () => { if (!M.lastFast) return 0; const l = SETTLE_MS - (Date.now() - M.lastFast); return l > 0 ? Math.ceil(l / 1000) : 0; };

  // ------------------------------------------------------------- screen
  function build() {
    if ($('#mapv')) return;
    const st = document.createElement('style');
    st.textContent = `
    #mapv { position: fixed; inset: 0; z-index: 60; display: none; flex-direction: column; background: #11142f; color: var(--crm); font-family: Inter, system-ui, sans-serif; }
    #mapv.on { display: flex; }
    .mvtop { display: flex; align-items: center; gap: 10px; padding: calc(10px + env(safe-area-inset-top)) 12px 10px; background: #1c1538; border-bottom: 3px solid var(--ink); z-index: 2; }
    .mvtop button { height: 40px; padding: 0 14px; border-radius: 12px; font: 900 15px Inter, system-ui, sans-serif; background: var(--plum); color: var(--crm); border: 2.5px solid var(--ink); box-shadow: 0 3px 0 var(--ink); }
    .mvt { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .mvt b { font-size: 17px; font-weight: 900; letter-spacing: .12em; }
    .mvt span { font-size: 12px; font-weight: 700; color: var(--mute); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .mvleft { flex: none; padding: 5px 9px; border-radius: 10px; background: var(--ora); color: var(--ink); font-size: 12px; font-weight: 900; border: 2px solid var(--ink); }
    .mvleft.none { background: var(--lild); color: var(--crm); }
    #mvMap { position: relative; flex: 1; background: #1a1630; }
    #mvMap .leaflet-tile-pane { filter: invert(1) hue-rotate(215deg) saturate(.55) brightness(.78) contrast(.92); }
    #mvMap::after { content: ''; position: absolute; inset: 0; pointer-events: none; z-index: 401; background: radial-gradient(ellipse at center, rgba(61,45,97,0) 45%, rgba(17,20,47,.55) 100%); }
    #mvMap .leaflet-container { background: #1a1630; }
    .leaflet-control-attribution { background: rgba(17,20,47,.75) !important; color: var(--mute) !important; font-size: 10px; }
    .leaflet-control-attribution a { color: var(--crm) !important; }
    .mvpin { width: 30px; height: 30px; border-radius: 50% 50% 50% 4px; transform: rotate(-45deg); background: #2a1f4a; border: 2.5px solid var(--ink); box-shadow: 0 2px 0 var(--ink); display: grid; place-items: center; }
    .mvpin > i { width: 19px; height: 19px; transform: rotate(45deg); display: block; }
    .mvpin.house { width: 22px; height: 22px; background: #3d2d61; } .mvpin.house > i { width: 14px; height: 14px; }
    .mvpin.got { background: var(--grn); opacity: .75; } .mvpin.close { background: var(--ora); animation: mvbob 1s ease-in-out infinite alternate; }
    @keyframes mvbob { to { margin-top: -4px; } }
    .mvme { width: 18px; height: 18px; border-radius: 50%; background: var(--ora); border: 3px solid var(--crm); box-shadow: 0 0 0 3px var(--ink), 0 0 16px rgba(240,123,60,.8); }
    .mvmsg { position: absolute; left: 14px; right: 14px; top: 50%; transform: translateY(-50%); z-index: 1000; display: none; padding: 18px; border-radius: 20px; background: #1c1538; border: 3px solid var(--ink); box-shadow: 0 6px 0 var(--plum); text-align: center; font-size: 15px; line-height: 1.4; font-weight: 700; }
    .mvmsg.on { display: block; } .mvmsg b { display: block; font-size: 18px; font-weight: 900; margin-bottom: 6px; color: var(--crm); }
    .mvmsg button { margin-top: 12px; height: 44px; padding: 0 18px; border-radius: 13px; font: 900 15px Inter, system-ui, sans-serif; background: var(--ora); color: var(--ink); border: 3px solid var(--ink); box-shadow: 0 3px 0 var(--ink); }
    .mvcard { padding: 10px 12px calc(12px + env(safe-area-inset-bottom)); background: #1c1538; border-top: 3px solid var(--ink); z-index: 2; max-height: 34%; overflow: auto; }
    .mvcard .hint { font-size: 12.5px; font-weight: 700; color: var(--mute); line-height: 1.35; margin-bottom: 6px; }
    .mvrow { display: flex; align-items: center; gap: 9px; padding: 6px 4px; border-top: 1.5px solid rgba(157,144,191,.18); font-size: 14px; font-weight: 800; }
    .mvrow i { width: 24px; height: 24px; flex: none; } .mvrow span { flex: 1; min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
    .mvrow em { font-style: normal; font-size: 12px; color: var(--mute); } .mvrow.got em { color: var(--grn); }
    #mtabs button.maptab { flex: .7; }
    .hname em.lmk { display: inline-flex; align-items: center; gap: 3px; } .hname em.lmk svg { color: var(--ink); }`;
    document.head.appendChild(st);
    const el = document.createElement('div'); el.id = 'mapv';
    el.innerHTML = `<div class="mvtop"><button id="mvBack">&lsaquo; Back</button><div class="mvt"><b>MAP</b><span id="mvStat">Finding you...</span></div><span id="mvLeft" class="mvleft"></span></div>
      <div id="mvMap"><div id="mvMsg" class="mvmsg"></div></div><div class="mvcard" id="mvCard"></div>`;
    document.body.appendChild(el);
    $('#mvBack').onclick = close;
  }
  const stat = t => { const e = $('#mvStat'); if (e) e.textContent = t; };
  function message(title, body, btn, fn, kind) {
    const e = $('#mvMsg'); if (!e) return;
    if (!title) { e.classList.remove('on'); M.msgKind = ''; return; }
    M.msgKind = kind || '';
    e.innerHTML = `<b>${title}</b>${body}${btn ? `<br><button id="mvMsgBtn">${btn}</button>` : ''}`; e.classList.add('on');
    if (btn) $('#mvMsgBtn').onclick = fn;
  }
  function leftChip() {
    const n = DM.Game.landmarkLeft(), e = $('#mvLeft'); if (!e) return;
    e.textContent = n ? `${n} landmark${n === 1 ? '' : 's'} left today` : 'No landmarks left today'; e.classList.toggle('none', !n);
  }

  // ------------------------------------------------------------- open / close
  function open() {
    build(); M.on = true; $('#mapv').classList.add('on'); message(); leftChip();
    // Ask for the location straight from the tap (iOS only shows its prompt from a tap), before Leaflet loads.
    if (!navigator.geolocation) { M.gpsMsg = 'none'; message('No location on this phone', 'This browser cannot share your location, so the map has nothing to show. The rest of the game works the same.', 'Back', close); }
    else if (M.watch == null) {
      M.gpsMsg = ''; stat('Finding you...');
      M.watch = navigator.geolocation.watchPosition(onPos, onGpsErr, { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 });
    }
    if (navigator.wakeLock) navigator.wakeLock.request('screen').then(w => { M.wake = w; }).catch(() => { /* fine */ });
    loadLeaflet().then(ok => {
      if (!M.on) return;
      if (!ok) { message('The map could not load', 'It needs an internet connection the first time. Nothing else in the game needs it - your houses, base and steps are all fine.', 'Try again', () => { M.lf = null; message(); open(); }, 'lib'); return; }
      initMap();
      if (M.pos) onPos(null);
    });
    renderCard();
  }
  function close() {
    M.on = false; const v = $('#mapv'); if (v) v.classList.remove('on');
    if (M.watch != null) { try { navigator.geolocation.clearWatch(M.watch); } catch (e) { /* ignore */ } M.watch = null; }
    if (M.wake) { try { M.wake.release(); } catch (e) { /* ignore */ } M.wake = null; }
    clearTimeout(M.retryT); M.retryT = null;
    M.pos = null; M.spd = []; M.far = {};   // her position is forgotten as soon as the map closes
    if (M.me) { M.me.remove(); M.me = null; } if (M.ring) { M.ring.remove(); M.ring = null; }
    if (DM.Game && DM.Game.renderHome && !DM.scene) DM.Game.renderHome();
  }
  function loadLeaflet() {
    if (window.L && window.L.map) return Promise.resolve(true);
    if (M.lf) return M.lf;
    M.lf = new Promise(res => {
      if (!document.querySelector('link[data-lf]')) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = LF_CSS; l.dataset.lf = 1; document.head.appendChild(l); }
      const s = document.createElement('script'); s.src = LF_JS; s.async = true;
      const t = setTimeout(() => res(false), 15000);
      s.onload = () => { clearTimeout(t); res(!!(window.L && window.L.map)); };
      s.onerror = () => { clearTimeout(t); s.remove(); res(false); };
      document.head.appendChild(s);
    });
    return M.lf;
  }
  function initMap() {
    if (M.map) { setTimeout(() => M.map.invalidateSize(), 60); return; }
    M.map = L.map('mvMap', { zoomControl: false, attributionControl: true }).setView([40.69, -73.95], 17);
    let bad = 0;
    L.tileLayer(TILES, { maxZoom: 19, maxNativeZoom: 19, attribution: ATTR }).on('tileerror', () => { if (++bad === 6) toast('Map pictures are not loading - your connection may be weak', 2.4); }).addTo(M.map);
    setTimeout(() => M.map.invalidateSize(), 60);
  }

  // ------------------------------------------------------------- GPS
  function onGpsErr(e) {
    if (!M.on) return;
    if (e.code === 1) {
      M.gpsMsg = 'denied'; renderCard();
      const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      message('Location is off for this game', ios ? 'To use the map: Settings &rsaquo; Privacy &amp; Security &rsaquo; Location Services &rsaquo; Safari Websites &rsaquo; While Using the App, then reopen the map. If it still asks nothing, tap <b style="display:inline;font-size:inherit">aA</b> in Safari &rsaquo; Website Settings &rsaquo; Location &rsaquo; Allow.<br><br>Everything else in the game works without it.'
        : 'Allow location for this site in your browser\'s site settings, then reopen the map. Everything else in the game works without it.', 'Back', close);
      stat('Location is off');
      if (M.watch != null) { try { navigator.geolocation.clearWatch(M.watch); } catch (x) { /* ignore */ } M.watch = null; }
    } else { M.gpsMsg = 'wait'; stat(M.pos ? 'GPS signal is weak...' : 'Waiting for GPS - step outside or near a window'); }
  }
  function onPos(p) {
    if (!M.on) return;
    if (p) {
      const pos = { lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy || 50 };
      noteSpeed(pos, p.coords.speed, p.timestamp || Date.now()); const first = !M.pos; M.pos = pos; M.gpsMsg = '';
      if (M.map && first) M.map.setView([pos.lat, pos.lon], 17);
      if (first && M.msgKind === 'gps') message();
    }
    if (!M.pos) return;
    const pos = M.pos;
    if (M.map) {
      if (!M.me) {
        M.me = L.marker([pos.lat, pos.lon], { icon: L.divIcon({ className: '', html: '<div class="mvme"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }), zIndexOffset: 1000, interactive: false }).addTo(M.map);
        M.ring = L.circle([pos.lat, pos.lon], { radius: CLAIM_M, color: '#f07b3c', weight: 1.5, fillOpacity: .07, interactive: false }).addTo(M.map);
        M.map.setView([pos.lat, pos.lon], 17);
      } else { M.me.setLatLng([pos.lat, pos.lon]); M.ring.setLatLng([pos.lat, pos.lon]); }
    }
    fetchAround(pos);
    claim();
    drawMarkers();
    renderCard();
  }

  // ------------------------------------------------------------- Overpass
  const cellOf = pos => [Math.floor(pos.lat / CELL), Math.floor(pos.lon / CELL)];
  function fetchAround(pos) {
    const [cy, cx] = cellOf(pos);
    // her cell, plus the neighbour she is closest to (so the next block is ready before she gets there)
    const fy = pos.lat / CELL - cy, fx = pos.lon / CELL - cx, want = [[cy, cx]];
    if (fy < .25) want.push([cy - 1, cx]); else if (fy > .75) want.push([cy + 1, cx]);
    if (fx < .25) want.push([cy, cx - 1]); else if (fx > .75) want.push([cy, cx + 1]);
    for (const c of want) loadCell(c[0], c[1]);
  }
  function loadCell(cy, cx) {
    const k = cy + ':' + cx; if (M.cells[k] === 'ok' || M.cells[k] === 'busy') return;
    try {
      const c = JSON.parse(localStorage.getItem('dm9.osm.' + k) || 'null');
      if (c && c.v === CACHE_V && Date.now() - c.t < CACHE_DAYS * 864e5) { for (const pl of c.p) M.places[pl.id] = pl; M.cells[k] = 'ok'; return; }
    } catch (e) { /* ignore */ }
    if (M.busy) return;
    const s = cy * CELL - .0012, w = cx * CELL - .0012, n = (cy + 1) * CELL + .0012, e = (cx + 1) * CELL + .0012, bb = `(${s.toFixed(4)},${w.toFixed(4)},${n.toFixed(4)},${e.toFixed(4)})`;
    const biz = `[out:json][timeout:25];(nwr[amenity~"^(pharmacy|police|fuel|school|college|kindergarten|laundry)$"]${bb};nwr[shop~"^(chemist|convenience|supermarket|deli|grocery|alcohol|kiosk|greengrocer|laundry|dry_cleaning|car_repair|tyres)$"]${bb};);out center 300;`;
    const bld = `[out:json][timeout:25];(way[building~"^(house|detached|semidetached_house|terrace|bungalow|apartments|residential)$"]${bb};);out center 600;`;
    M.busy = true; M.cells[k] = 'busy'; stat(Object.keys(M.places).length ? 'Loading the next block...' : 'Looking up the buildings around you...');
    Promise.all([ask(biz), ask(bld)]).then(([a, b]) => {
      M.busy = false;
      if (!a.ok && !b.ok) {
        M.cells[k] = 'fail'; M.fails++;
        const wait = Math.min(180, 20 * 2 ** Math.min(3, M.fails - 1));
        stat('Map servers busy'); renderCard();
        if (!Object.keys(M.places).length) message('The map servers are busy', `Could not get the buildings around you (${a.err || b.err}). Trying again in ${wait} s.`, 'Try now', () => { message(); retry(); }, 'net');
        else stat(`Map servers busy - retrying in ${wait} s`);
        clearTimeout(M.retryT); M.retryT = setTimeout(retry, wait * 1000);
        return;
      }
      M.fails = 0; const list = [];
      for (const el of a.els.concat(b.els)) { const pl = placeOf(el); if (pl && !M.places[pl.id]) { M.places[pl.id] = pl; list.push(pl); } }
      // the cache stays on this phone (the place list is public map data; it never goes into the save)
      try { localStorage.setItem('dm9.osm.' + k, JSON.stringify({ v: CACHE_V, t: Date.now(), p: list })); } catch (e) { /* storage full: fine */ }
      M.cells[k] = 'ok'; if (M.msgKind === 'net') message();
      if (M.on && M.pos) { claim(); drawMarkers(); renderCard(); }
    });
  }
  function retry() { M.retryT = null; for (const k in M.cells) if (M.cells[k] === 'fail') delete M.cells[k]; if (M.on && M.pos) fetchAround(M.pos); }
  async function ask(q) {
    let err = 'no answer';
    for (const url of MIRRORS) {
      try {
        const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null, t = ctl && setTimeout(() => ctl.abort(), 30000);
        const r = await fetch(url, { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, signal: ctl ? ctl.signal : undefined });
        if (t) clearTimeout(t);
        if (!r.ok) { err = 'server said ' + r.status; continue; }
        const j = await r.json(); return { ok: true, els: (j && j.elements) || [] };
      } catch (e) { err = e && e.name === 'AbortError' ? 'timed out' : 'offline?'; }
    }
    return { ok: false, els: [], err };
  }

  // ------------------------------------------------------------- landmarks
  const keyOf = pl => pl._k || (pl._k = DM.Game.landmarkKey(pl.id));
  function visible() {
    if (!M.pos) return [];
    const all = Object.values(M.places).map(pl => Object.assign(pl, { d: dist(pl, M.pos) })).filter(pl => pl.d < 700);
    const biz = all.filter(pl => !pl.house), houses = all.filter(pl => pl.house).sort((a, b) => a.d - b.d).slice(0, HOUSES_SHOWN);
    return biz.concat(houses);
  }
  function claim() {
    if (!M.pos || !DM.Game.addLandmark) return;
    const lock = driveLock();
    if (lock) { stat(`Moving too fast - on foot again in ${lock} s`); return; }
    if (M.pos.acc > MAX_ACC) { stat(`GPS is fuzzy (about ${Math.round(M.pos.acc)} m) - landmarks need a clearer fix`); return; }
    const reach = CLAIM_M + Math.min(15, M.pos.acc / 2), vis = visible();
    // She has to WALK to a place: one only counts once she has been well away from it while the map was open,
    // so opening the map at home does not hand her the three houses next door.
    for (const pl of vis) if (pl.d > reach + 15) M.far[pl.id] = 1;
    const near = vis.filter(pl => pl.d <= reach && M.far[pl.id] && !DM.Game.landmarkHave(keyOf(pl))).sort((a, b) => (a.house - b.house) || a.d - b.d);
    if (!near.length) { stat(placesLine()); return; }
    if (!DM.Game.landmarkLeft()) { stat('3 landmarks today - more tomorrow'); return; }
    const pl = near[0], r = DM.Game.addLandmark({ key: keyOf(pl), type: pl.type, name: pl.name, street: pl.street });
    if (r === 'ok') {
      DM.E.SFX && DM.E.SFX.play && DM.E.SFX.play('pick');
      toast(`Landmark found: ${pl.name} - added to your houses`, 3);
      if (navigator.vibrate) try { navigator.vibrate(60); } catch (e) { /* ignore */ }
      leftChip();
    }
  }
  function placesLine() {
    const n = visible().length;
    return n ? `${n} places nearby` + (M.lastSpd > 0 ? '' : '') : (M.busy ? 'Looking up the buildings around you...' : 'No marked places close by - try another street');
  }
  function drawMarkers() {
    if (!M.map || !window.L) return;
    const vis = visible(), keep = new Set();
    for (const pl of vis) {
      keep.add(pl.id);
      const got = DM.Game.landmarkHave(keyOf(pl)), close = !got && pl.d <= CLAIM_M * 2.2;
      const cls = 'mvpin' + (pl.house ? ' house' : '') + (got ? ' got' : close ? ' close' : '');
      const mk = M.markers[pl.id];
      if (mk && mk._cls === cls) continue;
      if (mk) mk.remove();
      const sz = pl.house ? 22 : 30;
      const m = L.marker([pl.lat, pl.lon], { icon: L.divIcon({ className: '', html: `<div class="${cls}"><i>${svg(pl.type)}</i></div>`, iconSize: [sz, sz], iconAnchor: [sz / 2, sz] }), zIndexOffset: pl.house ? 0 : 200 });
      m.bindPopup(`<b>${esc(pl.name)}</b><br>${DM.D.BTYPES[pl.type].n}${got ? ' · in your houses' : ''}`); m._cls = cls; m.addTo(M.map); M.markers[pl.id] = m;
    }
    for (const id in M.markers) if (!keep.has(id)) { M.markers[id].remove(); delete M.markers[id]; }
  }
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function renderCard() {
    const el = $('#mvCard'); if (!el) return;
    leftChip();
    const vis = visible().filter(pl => !pl.house || pl.d < 120).sort((a, b) => a.d - b.d).slice(0, 4);
    el.innerHTML = `<div class="hint">Walk within ${CLAIM_M} m of a marked place and it joins your houses as a landmark - up to 3 a day, on foot. Your location stays on this phone.</div>` +
      (vis.length ? vis.map(pl => { const got = DM.Game.landmarkHave(keyOf(pl)); return `<div class="mvrow${got ? ' got' : ''}"><i>${svg(pl.type)}</i><span>${esc(pl.name)}</span><em>${got ? 'landmark' : pl.d <= CLAIM_M + 10 && !M.far[pl.id] ? 'walk up to it from afar' : Math.round(pl.d) + ' m'}</em></div>`; }).join('')
        : `<div class="mvrow"><span>${M.gpsMsg === 'denied' ? 'Location is off' : M.gpsMsg === 'none' ? 'No location on this phone' : M.pos ? (M.busy ? 'Looking for places...' : M.fails ? 'Map servers busy - trying again soon' : 'Nothing marked right here yet') : 'Waiting for your location...'}</span></div>`);
  }

  DM.Map = { open, close, get on() { return M.on; }, _M: M, _typeOf: typeOf };
  if (DM.ready && DM.Game && DM.Game.renderHome) DM.Game.renderHome();   // show the Map tab if the home screen drew first
})();
