/* Dead Miles (next) 0.16 - the real-world map, drawn in the game's own "Spooky flat" style.
   (0.9 brought it back from the old game on Leaflet + raster OSM tiles; 0.16 drops both.)

   The map is drawn by hand on a canvas from OpenStreetMap vector data: thick dark-purple streets with ink edges and
   curbs, flat plum building blocks with a 3/4 wall face (lit windows here and there), teal parks with trees, deep blue
   water, her own survivor sprite under a lamp-light circle, real places as the game's house-type icons on round badges,
   and fog around the edges. No CDN, no tiles: one compact Overpass query per ~700 m grid square, cached per square in
   IndexedDB (LRU, MAX_CELLS squares) so a square she has walked before draws instantly, even offline.

   Walk within ~35 m of a marked place with the map open and it becomes a LANDMARK house in the house list: its real
   name, a pin, and a type from its tags. Up to 3 a day, on foot only.

   Privacy: location is asked for only when the map opens and lives only in memory while it is open. Overpass is asked
   for a whole ~700 m grid square, never her exact spot. The phone keeps the squares' map data and which square was
   shown last (so the map can open instantly) - a square, never a point - and none of it goes into the save. The save
   (cloud too) keeps only each landmark house's type, name/street and seed - never a coordinate or an OpenStreetMap id.

   Lessons kept from the old street.js: GPS accuracy filtering, Overpass mirrors with backoff, a light places-only query
   when the big one fails (a slow building lookup must not wipe out the pharmacy), the speed check that needs 3 fast
   readings in a row (a single GPS jump is not a car) and differences against the oldest fix minus both accuracies. */
'use strict';
(() => {
  const $ = s => document.querySelector(s);
  const hasArt = () => typeof ART !== 'undefined' && ART.rigs;
  const MIRRORS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
  const CLAIM_M = 35, MAX_ACC = 60, VEHICLE_MS = 9, SETTLE_MS = 45000, FAST_HITS = 3;
  const CELL = 0.006, PAD = 0.0004, CACHE_V = 2, CACHE_DAYS = 14, MAX_CELLS = 30, HOUSES_SHOWN = 45, HOUSE_BADGES = 24;
  const ASK_MS = 22000, INTRO_KEY = 'dm-next-mapintro';
  const ZMIN = 0.7, ZMAX = 5, ZDEF = 2.1;   // css px per metre
  const C = {
    INK: '#11142f', PLUM: '#3d2d61', ORA: '#f07b3c', CRM: '#f6e3bb', WALL: '#2a1f4a', LIL: '#5a4a86', LILD: '#4a3c70', MUTE: '#9d90bf', GRN: '#93a86c',
    GROUND: '#211a3d', ROAD: '#18142e', CURB: '#3b3058', PARK: '#1d4a45', TREE: '#2a6957', TREEHI: '#3f8a70', WATER: '#1a2a66', RIPPLE: '#33509f', WOOD: '#173f3a',
    ROOF: ['#3d2d61', '#47366f', '#362857'], WALLS: ['#2a1f4a', '#4a2c40', '#33284f'], WIN: '#130f28', LIT: '#f2a65a', BOX: '#4a3c70',
  };

  const M = { on: false, watch: null, pos: null, guess: null, spd: [], fastRun: 0, lastFast: 0, lastSpd: 0,
    places: {}, cells: {}, far: {}, busy: false, queue: [], fails: 0, retryT: null, wake: null, msg: '', gpsMsg: '', status: '', offline: false, partial: false,
    layers: [], seen: new Set(), cam: { x: 0, y: 0, s: ZDEF }, follow: true, raf: 0, t0: 0, tFirst: 0, tData: 0, dirty: true,
    W: 0, H: 0, dpr: 1, st: null, ptrs: new Map(), zs: [], flip: false, walkT: 0, lastMe: null, sel: null, selT: 0, burst: null };

  // ------------------------------------------------------------- what a real place becomes
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

  // the house-list type icons, rasterised once for the canvas badges
  const IMG = {};
  // (a copy of the house-list type icons in game.js - keep the two in step if those change)
  const B = {
    row: '<rect x="18" y="8" width="28" height="48" fill="#8a4a3a"/><path d="M14 8h36v5H14z" fill="#5e2a2a"/><g fill="#f6e3bb"><rect x="22" y="17" width="7" height="9"/><rect x="35" y="17" width="7" height="9"/><rect x="22" y="31" width="7" height="9"/><rect x="35" y="31" width="7" height="9"/></g><rect x="28" y="44" width="8" height="12" fill="#11142f"/><path d="M24 56h16v3H24z" fill="#9d90bf"/>',
    apt: '<rect x="10" y="12" width="44" height="44" fill="#5a4a86"/><g fill="#f6e3bb">' + [0, 1, 2].map(r => [0, 1, 2].map(c => `<rect x="${15 + c * 13}" y="${17 + r * 12}" width="8" height="7"/>`).join('')).join('') + '</g><rect x="28" y="49" width="8" height="7" fill="#11142f"/>',
    shop: (aw, extra) => `<rect x="8" y="16" width="48" height="40" fill="#4a4060"/><path d="M6 16h52v8H6z" fill="${aw[0]}"/><g fill="${aw[1]}">${[0, 1, 2, 3, 4, 5].map(i => `<rect x="${6 + i * 9}" y="16" width="4.5" height="8"/>`).join('')}</g><rect x="13" y="30" width="20" height="16" fill="#f6e3bb"/><rect x="38" y="30" width="12" height="26" fill="#11142f"/>${extra || ''}`,
    garage: '<rect x="8" y="14" width="48" height="42" fill="#4a4660"/><path d="M6 14h52l-4-6H10z" fill="#7d8398"/><g fill="#9aa0b4">' + [0, 1, 2, 3, 4].map(i => `<rect x="14" y="${26 + i * 6}" width="36" height="4"/>`).join('') + '</g>',
    school: '<rect x="6" y="22" width="52" height="34" fill="#8a4a3a"/><path d="M22 22l10-12 10 12z" fill="#5e2a2a"/><circle cx="32" cy="19" r="4" fill="#f6e3bb"/><g fill="#f6e3bb"><rect x="11" y="30" width="8" height="8"/><rect x="45" y="30" width="8" height="8"/><rect x="11" y="43" width="8" height="8"/><rect x="45" y="43" width="8" height="8"/></g><rect x="27" y="40" width="10" height="16" fill="#11142f"/><path d="M32 4v9" stroke="#11142f" stroke-width="2"/><path d="M32 4h8v4h-8z" fill="#f07b3c"/>',
    police: '<rect x="8" y="18" width="48" height="38" fill="#3a4470"/><path d="M8 18h48v6H8z" fill="#262a52"/><path d="M32 28l3 6 6 1-4.5 4 1 6-5.5-3-5.5 3 1-6-4.5-4 6-1z" fill="#e0b94a" stroke="#11142f" stroke-width="1.2"/><rect x="28" y="46" width="8" height="10" fill="#11142f"/>',
    mansion: '<rect x="6" y="26" width="52" height="30" fill="#c9b48a"/><path d="M4 26L32 8l28 18z" fill="#7a5048"/><g fill="#f6e3bb">' + [0, 1, 2, 3].map(i => `<rect x="${12 + i * 12}" y="28" width="3.5" height="28"/>`).join('') + '</g><rect x="28" y="40" width="8" height="16" fill="#11142f"/>',
  };
  const TYPEICON = { tutorial: B.row, rowS: B.row, rowL: B.row, apt: B.apt, bodega: B.shop(['#f07b3c', '#f6e3bb']), laundro: B.shop(['#3fa7a0', '#f6e3bb'], '<circle cx="23" cy="38" r="5" fill="#5a6a8e" stroke="#11142f" stroke-width="1.5"/>'),
    pharmacy: B.shop(['#93a86c', '#f6e3bb'], '<path d="M20 34h6v-4h4v4h6v4h-6v4h-4v-4h-6z" fill="#b53a2e"/>'), garage: B.garage, school: B.school, police: B.police, mansion: B.mansion };
  function iconSVG(t) { const inner = TYPEICON[t] || B.row; return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="96" height="96">${inner}</svg>`; }
  const iconURL = t => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(iconSVG(t));
  function img(t) { if (!IMG[t]) { const im = new Image(); im.src = iconURL(t); IMG[t] = im; } return IMG[t]; }

  // ------------------------------------------------------------- geometry + the on-foot check (from street.js)
  function dist(a, b) { const R = 6371000, r = Math.PI / 180, dLa = (b.lat - a.lat) * r, dLo = (b.lon - a.lon) * r; const x = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLo / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); }
  function bearing(a, b) { const r = Math.PI / 180, y = Math.sin((b.lon - a.lon) * r) * Math.cos(b.lat * r), x = Math.cos(a.lat * r) * Math.sin(b.lat * r) - Math.sin(a.lat * r) * Math.cos(b.lat * r) * Math.cos((b.lon - a.lon) * r); return (Math.atan2(y, x) / r + 360) % 360; }
  function speedNow() {
    const h = M.spd; if (h.length < 2) return 0;
    const a = h[0], b = h[h.length - 1], dt = (b.t - a.t) / 1000; if (dt < 1) return M.lastSpd || 0;
    const d = dist(a, b), slop = (a.acc || 0) + (b.acc || 0);
    return d <= slop ? 0 : (d - slop) / dt;
  }
  function noteSpeed(pos, gps, t) {
    const pr = M.spd[M.spd.length - 1];
    // 0.16: this one reading alone looks like a car (a jump since the last one): it may not claim anything
    M.jump = !!pr && t - pr.t > 0 && (dist(pr, pos) - pr.acc - pos.acc) / ((t - pr.t) / 1000) >= VEHICLE_MS;
    M.spd.push({ lat: pos.lat, lon: pos.lon, acc: pos.acc, t }); if (M.spd.length > 6) M.spd.shift();
    const v = typeof gps === 'number' && gps >= 0 ? gps : speedNow();
    M.lastSpd = v; M.fastRun = v >= VEHICLE_MS ? M.fastRun + 1 : 0;
    if (M.fastRun >= FAST_HITS) M.lastFast = t;
  }
  const driveLock = () => { if (!M.lastFast) return 0; const l = SETTLE_MS - (Date.now() - M.lastFast); return l > 0 ? Math.ceil(l / 1000) : 0; };

  // ------------------------------------------------------------- local metre frame (x east, y south), fixed per session
  const O = { lat: 0, lon: 0, kx: 1, ky: 111320, set: false };
  function setOrigin(lat, lon) { if (O.set) return; O.lat = lat; O.lon = lon; O.kx = 111320 * Math.cos(lat * Math.PI / 180); O.set = true; }
  const wx = lon => (lon - O.lon) * O.kx, wy = lat => (O.lat - lat) * O.ky;
  const me = () => M.pos || M.guess;

  // ------------------------------------------------------------- IndexedDB square cache (falls back to memory only)
  let dbP = null;
  function db() {
    if (dbP) return dbP;
    dbP = new Promise(res => {
      const t = setTimeout(() => res(null), 1500);
      try {
        const r = indexedDB.open('dm-next-map', 1);
        r.onupgradeneeded = () => { const d = r.result; if (!d.objectStoreNames.contains('cells')) d.createObjectStore('cells', { keyPath: 'k' }); if (!d.objectStoreNames.contains('meta')) d.createObjectStore('meta'); };
        r.onsuccess = () => { clearTimeout(t); res(r.result); }; r.onerror = () => { clearTimeout(t); res(null); };
      } catch (e) { clearTimeout(t); res(null); }
    });
    return dbP;
  }
  function idb(store, mode, fn) {
    return db().then(d => d && new Promise(res => {
      try { const tx = d.transaction(store, mode), rq = fn(tx.objectStore(store)); tx.oncomplete = () => res(rq ? rq.result : null); tx.onerror = tx.onabort = () => res(null); } catch (e) { res(null); }
    }));
  }
  const getCell = k => idb('cells', 'readonly', s => s.get(k));
  const getMeta = k => idb('meta', 'readonly', s => s.get(k));
  const setMeta = (k, v) => idb('meta', 'readwrite', s => s.put(v, k));
  async function touchCell(k) {   // LRU book-keeping: drop the least recently used squares past MAX_CELLS
    const lru = (await getMeta('lru')) || {}; lru[k] = Date.now();
    const ks = Object.keys(lru).sort((a, b) => lru[a] - lru[b]), drop = ks.slice(0, Math.max(0, ks.length - MAX_CELLS));
    for (const d of drop) delete lru[d];
    await setMeta('lru', lru);
    if (drop.length) await idb('cells', 'readwrite', s => { for (const d of drop) s.delete(d); return null; });
  }

  // ------------------------------------------------------------- Overpass: one compact query per square
  const cellOf = p => [Math.floor(p.lat / CELL), Math.floor(p.lon / CELL)];
  const bboxOf = (cy, cx) => [cy * CELL - PAD, cx * CELL - PAD, (cy + 1) * CELL + PAD, (cx + 1) * CELL + PAD].map(v => v.toFixed(5)).join(',');
  const POIQ = 'nwr[amenity~"^(pharmacy|police|fuel|school|college|kindergarten|laundry)$"];nwr[shop~"^(chemist|convenience|supermarket|deli|grocery|alcohol|kiosk|greengrocer|laundry|dry_cleaning|car_repair|tyres)$"];';
  const HOUSEQ = '"^(house|detached|semidetached_house|terrace|bungalow|apartments|residential)$"';
  const qFull = bb => `[out:json][timeout:25][bbox:${bb}];
way[highway~"^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street|service|pedestrian|footway|path|cycleway|steps|track|motorway_link|trunk_link|primary_link|secondary_link|tertiary_link)$"][area!=yes][tunnel!=yes];out tags geom qt;
way[building]->.b;.b out skel geom qt;
(way[leisure~"^(park|playground|garden|pitch|dog_park|nature_reserve)$"];way[landuse~"^(grass|recreation_ground|cemetery|forest|meadow|village_green)$"];way[natural~"^(water|wood|scrub)$"];way[waterway=riverbank];rel[leisure=park];rel[natural~"^(water|wood)$"];rel[landuse~"^(cemetery|forest|grass|recreation_ground)$"];);out tags geom qt;
(${POIQ}way.b[building~${HOUSEQ}];);out tags center qt;`;
  const qLite = bb => `[out:json][timeout:25][bbox:${bb}];(${POIQ}way[building~${HOUSEQ}];);out tags center 600;`;
  async function ask(q) {
    let err = 'no answer';
    for (const url of MIRRORS) {
      try {
        const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null, t = ctl && setTimeout(() => ctl.abort(), ASK_MS);
        const r = await fetch(url, { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, signal: ctl ? ctl.signal : undefined });
        if (!r.ok) { if (t) clearTimeout(t); err = 'server said ' + r.status; continue; }
        const j = await r.json(); if (t) clearTimeout(t);
        return { ok: true, els: (j && j.elements) || [] };
      } catch (e) { err = e && e.name === 'AbortError' ? 'timed out' : 'offline?'; }
    }
    return { ok: false, els: [], err };
  }
  const RC = { motorway: 0, trunk: 0, primary: 0, motorway_link: 1, trunk_link: 1, primary_link: 1, secondary: 1, secondary_link: 1, tertiary: 1, tertiary_link: 1,
    residential: 2, unclassified: 2, living_street: 2, service: 3, pedestrian: 4, footway: 5, path: 5, cycleway: 5, steps: 5, track: 5 };
  function roadCls(tg) {
    if (tg.area === 'yes' || tg.tunnel === 'yes') return -1;
    if (tg.footway === 'sidewalk' || tg.footway === 'crossing' || tg.footway === 'traffic_island') return -1;   // the curbs already draw sidewalks
    return RC[tg.highway] != null ? RC[tg.highway] : -1;
  }
  function areaCls(tg) {
    if (tg.natural === 'water' || tg.waterway === 'riverbank') return 0;
    if (tg.natural === 'wood' || tg.natural === 'scrub' || tg.landuse === 'forest') return 2;
    if (tg.leisure || /^(grass|recreation_ground|cemetery|meadow|village_green)$/.test(tg.landuse || '')) return 1;
    return -1;
  }
  function joinRings(parts) {
    const segs = parts.map(g => g.filter(p => p && p.lat != null)).filter(g => g.length > 1), rings = [];
    const same = (a, b) => a.lat === b.lat && a.lon === b.lon;
    while (segs.length) {
      let ring = segs.shift().slice(), guard = 0;
      while (!same(ring[0], ring[ring.length - 1]) && guard++ < 400) {
        const end = ring[ring.length - 1], i = segs.findIndex(s => same(s[0], end) || same(s[s.length - 1], end));
        if (i < 0) break;
        let s = segs.splice(i, 1)[0]; if (!same(s[0], end)) s = s.slice().reverse();
        ring = ring.concat(s.slice(1));
      }
      rings.push(ring);
    }
    return rings;
  }
  // Overpass answer -> compact record: coordinates as integer micro-degrees from the square's corner
  function encode(cy, cx, els, full) {
    const la0 = cy * CELL, lo0 = cx * CELL, r = [], b = [], g = [], p = [], seen = {};
    const q = geo => { const a = []; for (const pt of geo) if (pt && pt.lat != null) a.push(Math.round((pt.lat - la0) * 1e6), Math.round((pt.lon - lo0) * 1e6)); return a; };
    for (const el of els) {
      const tg = el.tags;
      if (el.type === 'relation' && el.members) {
        const cls = areaCls(tg || {}); if (cls < 0) continue;
        const out = [], inn = []; for (const m of el.members) if (m.type === 'way' && m.geometry) (m.role === 'inner' ? inn : out).push(m.geometry);
        const o = joinRings(out).map(q).filter(a => a.length >= 6), i = joinRings(inn).map(q).filter(a => a.length >= 6);
        if (o.length) g.push([cls, o, i]);
        continue;
      }
      if (el.type === 'way' && el.geometry) {
        if (tg && tg.highway) { const cls = roadCls(tg); if (cls < 0) continue; const a = q(el.geometry); if (a.length >= 4) r.push([el.id, cls, tg.name ? String(tg.name).slice(0, 40) : '', a]); continue; }
        if (tg && !tg.building) { const cls = areaCls(tg); if (cls >= 0) { const a = q(el.geometry); if (a.length >= 6) g.push([cls, [a], []]); } continue; }
        const a = q(el.geometry); if (a.length >= 6) b.push([el.id, a]);
        continue;
      }
      const pl = placeOf(el); if (pl && !seen[pl.id]) { seen[pl.id] = 1; p.push(pl); }
    }
    return { k: cy + ':' + cx, v: CACHE_V, t: Date.now(), full, r, b, g, p };
  }

  // ------------------------------------------------------------- record -> drawable layer (Path2D in metres)
  const ROADW = [[18, 5], [14, 4], [10, 3.5], [5, 0], [6, 0], [1.6, 0]];   // [asphalt, each sidewalk] metres per road class
  function hash(a, b) { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function pip(x, y, P) { let c = false; for (let i = 0, j = P.length - 2; i < P.length; j = i, i += 2) { const yi = P[i + 1], yj = P[j + 1]; if ((yi > y) !== (yj > y) && x < (P[j] - P[i]) * (y - yi) / (yj - yi) + P[i]) c = !c; } return c; }
  function polyPath(path, P, positive) {
    let n = P.length; if (n >= 4 && P[0] === P[n - 2] && P[1] === P[n - 1]) n -= 2;
    let A = 0; for (let i = 0; i < n; i += 2) { const j = (i + 2) % n; A += P[i] * P[j + 1] - P[j] * P[i + 1]; }
    const rev = positive && A < 0;
    for (let k = 0; k < n; k += 2) { const i = rev ? n - 2 - k : k; if (k === 0) path.moveTo(P[i], P[i + 1]); else path.lineTo(P[i], P[i + 1]); }
    path.closePath(); return A;
  }
  function ingest(rec) {
    const k = rec.k, [cy, cx] = k.split(':').map(Number), la0 = cy * CELL, lo0 = cx * CELL;
    setOrigin(la0 + CELL / 2, lo0 + CELL / 2);
    const old = M.layers.findIndex(l => l.k === k);
    if (old >= 0) { for (const id of M.layers[old].ids) M.seen.delete(id); M.layers.splice(old, 1); }
    const pts = a => { const o = new Array(a.length); for (let i = 0; i < a.length; i += 2) { o[i] = wx(lo0 + a[i + 1] / 1e6); o[i + 1] = wy(la0 + a[i] / 1e6); } return o; };
    const x0 = wx(lo0), x1 = wx(lo0 + CELL), y0 = wy(la0 + CELL), y1 = wy(la0);
    const L = { k, ids: [], box: [x0 - 80, y0 - 80, x1 + 80, y1 + 80], roads: ROADW.map(() => new Path2D()), dash: new Path2D(), labels: [],
      water: new Path2D(), park: new Path2D(), wood: new Path2D(), trees: [], ripples: new Path2D(), walls: [0, 1, 2].map(() => new Path2D()), wallAll: new Path2D(), wins: new Path2D(), lit: new Path2D(),
      roofs: C.ROOF.map(() => new Path2D()), roofAll: new Path2D(), boxes: new Path2D(), nB: 0, nR: 0 };
    const own = id => { if (M.seen.has(id)) return false; M.seen.add(id); L.ids.push(id); return true; };
    for (const [id, cls, name, a] of rec.r) {
      if (!own('r' + id)) continue;
      const P = pts(a), path = L.roads[cls];
      path.moveTo(P[0], P[1]); for (let i = 2; i < P.length; i += 2) path.lineTo(P[i], P[i + 1]);
      if (cls <= 1) { L.dash.moveTo(P[0], P[1]); for (let i = 2; i < P.length; i += 2) L.dash.lineTo(P[i], P[i + 1]); }
      if (name && cls <= 2) L.labels.push({ n: name, P, cls });
      L.nR++;
    }
    for (const [cls, outs, inns] of rec.g) {
      const path = cls === 0 ? L.water : cls === 1 ? L.park : L.wood, rings = outs.map(pts), holes = (inns || []).map(pts);
      for (const P of rings) polyPath(path, P); for (const P of holes) polyPath(path, P);
      // trees / ripples, sampled on a grid clipped to this square so a huge park costs no more than the square
      for (const P of rings) {
        let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
        for (let i = 0; i < P.length; i += 2) { bx0 = Math.min(bx0, P[i]); bx1 = Math.max(bx1, P[i]); by0 = Math.min(by0, P[i + 1]); by1 = Math.max(by1, P[i + 1]); }
        bx0 = Math.max(bx0, x0); by0 = Math.max(by0, y0); bx1 = Math.min(bx1, x1); by1 = Math.min(by1, y1);
        const step = cls === 0 ? 22 : cls === 2 ? 6 : 10; let n = 0;
        for (let y = Math.ceil(by0 / step) * step; y < by1 && n < 700; y += step) for (let x = Math.ceil(bx0 / step) * step; x < bx1 && n < 700; x += step) {
          const h = hash(Math.round(x), Math.round(y)), jx = x + (h - .5) * step * .8, jy = y + (hash(Math.round(y), Math.round(x)) - .5) * step * .8;
          if (cls === 1 && h < .35) continue;
          if (!pip(jx, jy, P) || holes.some(H => pip(jx, jy, H))) continue;
          n++;
          if (cls === 0) { L.ripples.moveTo(jx - 3, jy); L.ripples.lineTo(jx + 3, jy); } else L.trees.push(jx, jy, 2.1 + h * 1.6);
        }
      }
    }
    // buildings: roof on top, the south-facing wall faces hang below it (the game's 3/4 walls), windows on the faces
    for (const [id, a] of rec.b) {
      if (!own('b' + id)) continue;
      const P = pts(a); let n = P.length; if (P[0] === P[n - 2] && P[1] === P[n - 1]) n -= 2; if (n < 6) continue;
      const hb = hash(id % 100003, 7), Hh = 2.6 + hb * 1.6;
      const A = polyPath(L.roofs[id % 3], P, true); polyPath(L.roofAll, P, true);
      for (let i = 0; i < n; i += 2) {
        const j = (i + 2) % n, ax = P[i], ay = P[i + 1], bx = P[j], by = P[j + 1], dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
        const ny = (A > 0 ? -dx : dx) / len;   // outward normal's y: > 0 = the face looks south, toward the viewer
        if (ny < .2) continue;
        for (const W of [L.walls[Math.floor(hb * 7) % 3], L.wallAll]) {   // brick or painted faces, same winding for every quad
          if (dx >= 0) { W.moveTo(ax, ay); W.lineTo(bx, by); W.lineTo(bx, by + Hh); W.lineTo(ax, ay + Hh); }
          else { W.moveTo(bx, by); W.lineTo(ax, ay); W.lineTo(ax, ay + Hh); W.lineTo(bx, by + Hh); }
          W.closePath();
        }
        if (len >= 3 && ny > .6) {
          const cnt = Math.floor(len / 3.3);
          for (let w = 0; w < cnt; w++) {
            const t = (w + .5) / cnt, cx2 = ax + dx * t, cy2 = ay + dy * t + Hh * .28, lit = hash(id % 100003, i * 31 + w) < .15;
            (lit ? L.lit : L.wins).rect(cx2 - .55, cy2, 1.1, Hh * .42);
          }
        }
      }
      if (Math.abs(A) / 2 > 260) {   // a roof box on the bigger blocks
        let sx = 0, sy = 0; for (let i = 0; i < n; i += 2) { sx += P[i]; sy += P[i + 1]; } sx /= n / 2; sy /= n / 2;
        if (pip(sx, sy, P)) L.boxes.rect(sx - 1.3 + (hb - .5) * 3, sy - 1, 2.6, 2);
      }
      L.nB++;
    }
    M.layers.push(L);
    for (const pl of rec.p) if (!M.places[pl.id]) M.places[pl.id] = pl;
    if (!M.tData && (L.nB || L.nR)) M.tData = performance.now() - M.t0;
    M.dirty = true;
    return L;
  }

  // ------------------------------------------------------------- loading squares: memory -> IndexedDB -> Overpass
  function wantAround(p) {
    const [cy, cx] = cellOf(p), fy = p.lat / CELL - cy, fx = p.lon / CELL - cx, want = [[cy, cx]];
    if (fy < .25) want.push([cy - 1, cx]); else if (fy > .75) want.push([cy + 1, cx]);
    if (fx < .25) want.push([cy, cx - 1]); else if (fx > .75) want.push([cy, cx + 1]);
    return want.map(c => c[0] + ':' + c[1]);
  }
  function fetchAround(p, near) {
    for (const k of wantAround(p)) loadCell(k, near);
    const k = cellOf(p).join(':'); if (near && k !== M.lastSaved) { M.lastSaved = k; setMeta('last', k); }   // which square she last looked at (a square, never a point)
  }
  function loadCell(k, front) {
    const st = M.cells[k];
    if (st === 'queued') { if (front) M.queue = [k].concat(M.queue.filter(x => x !== k)); return; }
    if (st) return;   // ok / busy / idb; fail + part wait for the retry timer
    M.cells[k] = 'idb';
    getCell(k).then(rec => {
      if (M.cells[k] !== 'idb') return;
      if (rec && rec.v === CACHE_V) {
        ingest(rec); touchCell(k);
        if (rec.full && Date.now() - rec.t < CACHE_DAYS * 864e5) { M.cells[k] = 'ok'; afterData(); return; }
        afterData();
      }
      M.cells[k] = 'queued'; if (front) M.queue.unshift(k); else M.queue.push(k); pump();
    });
  }
  async function pump() {
    if (M.busy || !M.queue.length) return;
    const k = M.queue.shift(); if (M.cells[k] !== 'queued') { pump(); return; }
    const [cy, cx] = k.split(':').map(Number), bb = bboxOf(cy, cx);
    if (typeof navigator.onLine === 'boolean' && !navigator.onLine) { M.offline = true; M.cells[k] = 'fail'; netTrouble('offline'); return; }
    M.busy = true; M.cells[k] = 'busy'; scoutPill();
    let a = await ask(qFull(bb)), full = true;
    if (!a.ok) { const b = await ask(qLite(bb)); if (b.ok) { a = b; full = false; } else a.err = a.err || b.err; }
    M.busy = false;
    if (!a.ok) { M.cells[k] = 'fail'; M.fails++; netTrouble(a.err); pump(); return; }
    M.fails = 0; M.offline = false;
    const rec = encode(cy, cx, a.els, full);
    // the cache stays on this phone (public map data); it never goes into the save
    idb('cells', 'readwrite', s => s.put(rec)).then(() => touchCell(k));
    ingest(rec); M.cells[k] = full ? 'ok' : 'part';
    if (!full) { M.partial = true; scheduleRetry(60); } else M.partial = Object.values(M.cells).includes('part');
    if (M.msgKind === 'net') message();
    afterData(); pump();
  }
  const loading = () => M.busy || Object.values(M.cells).some(v => v === 'idb' || v === 'queued' || v === 'busy');
  function afterData() { scoutPill(); if (M.on && M.pos) claim(); renderCard(); }
  function scheduleRetry(sec) { clearTimeout(M.retryT); M.retryT = setTimeout(retry, sec * 1000); }
  function netTrouble(err) {
    const wait = Math.min(180, 20 * 2 ** Math.min(3, Math.max(0, M.fails - 1)));
    scheduleRetry(wait); scoutPill(); renderCard();
    if (M.layers.length || Object.keys(M.places).length) return;   // the pill says it; the saved map still shows
    if (err === 'offline') message('You\'re offline', 'The map needs the internet the first time you visit an area. Streets you have seen before show up without it. Your houses, base and steps are all fine.', 'Try again', () => { message(); retry(); }, 'net');
    else message('The map servers are busy', `Could not get your streets (${err}). Trying again in ${wait} s. Your houses, base and steps are all fine.`, 'Try now', () => { message(); retry(); }, 'net');
  }
  function retry() {
    M.retryT = null;
    for (const k in M.cells) if (M.cells[k] === 'fail' || M.cells[k] === 'part') delete M.cells[k];
    const p = me(); if (M.on && p) fetchAround(p, true);
  }

  // ------------------------------------------------------------- landmarks (rules unchanged since 0.9)
  const keyOf = pl => pl._k || (pl._k = DM.Game.landmarkKey(pl.id));
  function visible() {
    if (!M.pos) return [];
    const all = Object.values(M.places).map(pl => Object.assign(pl, { d: dist(pl, M.pos) })).filter(pl => pl.d < 700);
    const biz = all.filter(pl => !pl.house), houses = all.filter(pl => pl.house).sort((a, b) => a.d - b.d).slice(0, HOUSES_SHOWN);
    return biz.concat(houses);
  }
  const reachNow = () => CLAIM_M + Math.min(15, (M.pos ? M.pos.acc : 0) / 2);
  function claim() {
    M.status = '';
    if (!M.pos || !DM.Game.addLandmark) return;
    const lock = driveLock();
    if (lock) { M.status = `Moving too fast - on foot again in ${lock} s`; return; }
    if (M.pos.acc > MAX_ACC) { M.status = `GPS is fuzzy (about ${Math.round(M.pos.acc)} m) - step into the open`; return; }
    const reach = reachNow(), vis = visible();
    // She has to WALK to a place: one only counts once she has been well away from it while the map was open,
    // so opening the map at home does not hand her the three houses next door.
    for (const pl of vis) if (pl.d > reach + 15) M.far[pl.id] = 1;
    const near = vis.filter(pl => pl.d <= reach && M.far[pl.id] && !DM.Game.landmarkHave(keyOf(pl))).sort((a, b) => (a.house - b.house) || a.d - b.d);
    if (!DM.Game.landmarkLeft()) { M.status = 'All 3 landmarks found today - more tomorrow'; return; }
    if (!near.length || M.jump) return;
    const pl = near[0], r = DM.Game.addLandmark({ key: keyOf(pl), type: pl.type, name: pl.name, street: pl.street });
    if (r === 'ok') {
      DM.E.SFX && DM.E.SFX.play && DM.E.SFX.play('pick');
      if (navigator.vibrate) try { navigator.vibrate([60, 40, 90]); } catch (e) { /* ignore */ }
      showBanner(pl); M.burst = { id: pl.id, t: performance.now() };
    }
  }
  function target() {   // the nearest place she could still scout (shops/landmarks first; a house when one is right here)
    const vis = visible().filter(pl => !DM.Game.landmarkHave(keyOf(pl)));
    const biz = vis.filter(pl => !pl.house).sort((a, b) => a.d - b.d), hs = vis.filter(pl => pl.house).sort((a, b) => a.d - b.d);
    if (hs[0] && hs[0].d < 70 && (!biz[0] || hs[0].d < biz[0].d)) return hs[0];
    return biz[0] && biz[0].d < 900 ? biz[0] : hs[0] || null;
  }

  // ------------------------------------------------------------- screen
  function build() {
    if ($('#mapv')) return;
    const st = document.createElement('style');
    st.textContent = `
    #mapv { position: fixed; inset: 0; z-index: 60; display: none; flex-direction: column; background: ${C.INK}; color: var(--crm); font-family: Inter, system-ui, sans-serif; }
    #mapv.on { display: flex; }
    .mvtop { display: flex; align-items: center; gap: 10px; padding: calc(10px + env(safe-area-inset-top)) 12px 10px; background: #1c1538; border-bottom: 3px solid var(--ink); z-index: 3; }
    .mvtop button { height: 40px; padding: 0 14px; border-radius: 12px; font: 900 15px Inter, system-ui, sans-serif; background: var(--plum); color: var(--crm); border: 2.5px solid var(--ink); box-shadow: 0 3px 0 var(--ink); }
    .mvtop .mvq { width: 40px; padding: 0; font-size: 19px; background: var(--wall); }
    .mvt { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .mvt b { font-size: 17px; font-weight: 900; letter-spacing: .12em; }
    .mvt span { font-size: 12px; font-weight: 700; color: var(--mute); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    #mvMap { position: relative; flex: 1; overflow: hidden; background: ${C.GROUND}; }
    #mvCv { position: absolute; inset: 0; width: 100%; height: 100%; touch-action: none; display: block; }
    .mvpill { position: absolute; left: 50%; top: 12px; transform: translateX(-50%); z-index: 4; display: none; align-items: center; gap: 7px; white-space: nowrap; padding: 7px 13px; border-radius: 99px;
      background: rgba(28,21,56,.94); border: 2.5px solid var(--ink); box-shadow: 0 3px 0 var(--ink); font-size: 12.5px; font-weight: 900; letter-spacing: .02em; color: var(--crm); pointer-events: none; }
    .mvpill.on { display: flex; } .mvpill.warn { color: #ffc49a; }
    .mvpill i { width: 9px; height: 9px; border-radius: 50%; background: var(--ora); box-shadow: 0 0 0 2px var(--ink); animation: mvblink .7s ease-in-out infinite alternate; }
    .mvpill.warn i { background: var(--mute); animation: none; }
    @keyframes mvblink { from { opacity: .35; transform: scale(.8); } to { opacity: 1; transform: scale(1.1); } }
    .mvbanner { position: absolute; left: 12px; right: 12px; top: 12px; z-index: 6; display: flex; align-items: center; gap: 12px; padding: 11px 13px; border-radius: 18px;
      background: #1c1538; border: 3px solid var(--ink); box-shadow: 0 5px 0 var(--ink), 0 0 0 2px var(--ora) inset; transform: translateY(-140%); transition: transform .35s cubic-bezier(.3,1.5,.5,1); pointer-events: none; }
    .mvbanner.on { transform: none; }
    .mvbanner .bdg { width: 52px; height: 52px; flex: none; border-radius: 50%; background: var(--ora); border: 3px solid var(--ink); box-shadow: 0 3px 0 var(--ink); display: grid; place-items: center; }
    .mvbanner .bdg img { width: 36px; height: 36px; }
    .mvbanner div { min-width: 0; } .mvbanner .kick { color: var(--grn); }
    .mvbanner b { display: block; font-size: 16px; font-weight: 900; line-height: 1.2; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .mvbanner div > span:last-child { display: block; font-size: 12px; font-weight: 700; color: var(--mute); }
    .mvtip { position: absolute; z-index: 5; display: none; transform: translate(-50%, calc(-100% - 26px)); max-width: 230px; padding: 8px 11px; border-radius: 13px; background: #1c1538;
      border: 2.5px solid var(--ink); box-shadow: 0 3px 0 var(--ink); font-size: 13px; font-weight: 800; line-height: 1.3; text-align: center; pointer-events: none; white-space: nowrap; }
    .mvtip.on { display: block; } .mvtip span { display: block; font-size: 11.5px; font-weight: 700; color: var(--mute); }
    .mvme { position: absolute; right: 12px; bottom: 24px; z-index: 4; width: 46px; height: 46px; border-radius: 50%; background: var(--plum); border: 3px solid var(--ink); box-shadow: 0 3px 0 var(--ink);
      display: none; place-items: center; }
    .mvme.on { display: grid; }
    .mvzoom { position: absolute; right: 12px; bottom: 82px; z-index: 4; display: flex; flex-direction: column; gap: 7px; }
    .mvzoom button { width: 40px; height: 40px; border-radius: 12px; background: rgba(42,31,74,.92); border: 2.5px solid var(--ink); box-shadow: 0 3px 0 var(--ink); font: 900 21px Inter, system-ui, sans-serif; color: var(--crm); }
    .mvattr { position: absolute; left: 6px; bottom: 4px; z-index: 4; font-size: 9.5px; font-weight: 700; color: rgba(157,144,191,.8); pointer-events: none; }
    .mvmsg { position: absolute; left: 14px; right: 14px; top: 50%; transform: translateY(-50%); z-index: 7; display: none; padding: 18px; border-radius: 20px; background: #1c1538; border: 3px solid var(--ink); box-shadow: 0 6px 0 var(--plum); text-align: center; font-size: 15px; line-height: 1.4; font-weight: 700; }
    .mvmsg.on { display: block; } .mvmsg b { display: block; font-size: 18px; font-weight: 900; margin-bottom: 6px; color: var(--crm); }
    .mvmsg button { margin-top: 12px; height: 44px; padding: 0 18px; border-radius: 13px; font: 900 15px Inter, system-ui, sans-serif; background: var(--ora); color: var(--ink); border: 3px solid var(--ink); box-shadow: 0 3px 0 var(--ink); }
    .mvintro { position: absolute; inset: 0; z-index: 9; display: none; align-items: flex-end; background: rgba(9,8,26,.55); }
    .mvintro.on { display: flex; }
    .mvicard { width: 100%; padding: 18px 18px calc(18px + env(safe-area-inset-bottom)); background: #1c1538; border-top: 3px solid var(--ink); border-radius: 22px 22px 0 0; box-shadow: 0 -4px 0 var(--plum); }
    .mvicard h3 { margin: 4px 0 8px; font-size: 22px; font-weight: 900; line-height: 1.15; }
    .mvicard p { margin: 0 0 10px; font-size: 14.5px; font-weight: 700; line-height: 1.4; color: var(--crm); }
    .mvicard ul { list-style: none; margin: 0; padding: 0; }
    .mvicard li { display: flex; align-items: center; gap: 12px; padding: 8px 0; border-top: 1.5px solid rgba(157,144,191,.16); font-size: 13.5px; font-weight: 700; line-height: 1.35; color: var(--mute); }
    .mvicard li b { color: var(--crm); }
    .mvicard li > i { width: 40px; height: 40px; flex: none; border-radius: 50%; background: var(--wall); border: 2.5px solid var(--ink); box-shadow: 0 2px 0 var(--ink); display: grid; place-items: center; font-style: normal; font-weight: 900; color: var(--crm); }
    .mvicard li > i img { width: 27px; height: 27px; } .mvicard li > i.o { background: var(--ora); box-shadow: 0 0 0 3px rgba(240,123,60,.35), 0 2px 0 var(--ink); }
    .mvicard .mbtn { width: 100%; margin-top: 12px; }
    .mvcard { padding: 10px 14px calc(12px + env(safe-area-inset-bottom)); background: #1c1538; border-top: 3px solid var(--ink); z-index: 3; }
    .mvprog { display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 900; }
    .mvpips { display: flex; gap: 5px; } .mvpips i { width: 15px; height: 15px; border-radius: 50%; background: var(--wall); border: 2.5px solid var(--ink); box-shadow: 0 0 0 1.5px var(--lild); }
    .mvpips i.on { background: var(--ora); box-shadow: 0 0 0 1.5px var(--ora), 0 0 8px rgba(240,123,60,.6); }
    .mvnext { display: flex; align-items: center; gap: 10px; margin-top: 9px; padding: 9px 11px; border-radius: 14px; background: var(--wall); border: 2.5px solid var(--ink); box-shadow: 0 3px 0 var(--ink); min-height: 54px; }
    .mvnext .arr { width: 32px; height: 32px; flex: none; border-radius: 50%; background: var(--ora); border: 2.5px solid var(--ink); display: none; place-items: center; }
    .mvnext .arr.on { display: grid; } .mvnext .arr svg { transition: transform .4s; }
    .mvnext .ico { width: 30px; height: 30px; flex: none; display: none; } .mvnext .ico.on { display: block; }
    .mvnext div { flex: 1; min-width: 0; } .mvnext #mvStat { display: block; font-size: 14.5px; font-weight: 900; line-height: 1.25; }
    .mvnext #mvSub2 { display: block; font-size: 11.5px; font-weight: 700; line-height: 1.3; color: var(--mute); }
    .mvnext em { flex: none; font-style: normal; font-size: 15px; font-weight: 900; color: var(--ora); }
    #mtabs button.maptab { flex: .7; }
    .hname em.lmk { display: inline-flex; align-items: center; gap: 3px; } .hname em.lmk svg { color: var(--ink); }`;
    document.head.appendChild(st);
    const el = document.createElement('div'); el.id = 'mapv';
    el.innerHTML = `<div class="mvtop"><button id="mvBack">&lsaquo; Back</button><div class="mvt"><b>MAP</b><span id="mvTopSub">Your real streets</span></div><button id="mvHelp" class="mvq" aria-label="What is the map?">?</button></div>
      <div id="mvMap"><canvas id="mvCv"></canvas><div id="mvPill" class="mvpill"><i></i><span></span></div><div id="mvBanner" class="mvbanner"></div><div id="mvTip" class="mvtip"></div>
        <div class="mvzoom"><button id="mvZin" aria-label="Zoom in">+</button><button id="mvZout" aria-label="Zoom out">&minus;</button></div>
        <button id="mvMe" class="mvme" aria-label="Back to me"><svg width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="7" fill="none" stroke="#f6e3bb" stroke-width="2.6"/><circle cx="12" cy="12" r="3" fill="#f07b3c"/><path d="M12 1v4M12 19v4M1 12h4M19 12h4" stroke="#f6e3bb" stroke-width="2.6" stroke-linecap="round"/></svg></button>
        <div class="mvattr">&copy; OpenStreetMap contributors</div><div id="mvMsg" class="mvmsg"></div></div>
      <div class="mvcard" id="mvCard"><div class="mvprog"><span class="mvpips" id="mvPips"></span><span id="mvLeft"></span></div>
        <div class="mvnext"><span class="arr" id="mvArr"><svg width="18" height="18" viewBox="0 0 18 18"><path d="M9 1.5l6 13-6-3.4-6 3.4z" fill="#11142f"/></svg></span><img class="ico" id="mvIco" alt=""><div><span id="mvStat">Finding you...</span><span id="mvSub2"></span></div><em id="mvDist"></em></div></div>
      <div id="mvIntro" class="mvintro"></div>`;
    document.body.appendChild(el);
    $('#mvBack').onclick = close;
    $('#mvHelp').onclick = () => { DM.E.SFX && DM.E.SFX.play && DM.E.SFX.play('ui'); intro(true); };
    $('#mvMe').onclick = () => { M.follow = true; $('#mvMe').classList.remove('on'); };
    $('#mvZin').onclick = () => zoomBy(1.4); $('#mvZout').onclick = () => zoomBy(1 / 1.4);
    const cv = $('#mvCv');
    cv.addEventListener('pointerdown', pdown); cv.addEventListener('pointermove', pmove); cv.addEventListener('pointerup', pup); cv.addEventListener('pointercancel', pup);
    cv.addEventListener('wheel', e => { e.preventDefault(); zoomAt(e.offsetX, e.offsetY, e.deltaY < 0 ? 1.15 : 1 / 1.15); }, { passive: false });
    addEventListener('resize', () => { if (M.on) size(); });
    addEventListener('online', () => { if (M.on && (M.offline || M.fails)) { M.offline = false; retry(); } });
  }
  function message(title, body, btn, fn, kind) {
    const e = $('#mvMsg'); if (!e) return;
    if (!title) { e.classList.remove('on'); M.msgKind = ''; return; }
    M.msgKind = kind || '';
    e.innerHTML = `<b>${title}</b>${body}${btn ? `<br><button id="mvMsgBtn">${btn}</button>` : ''}`; e.classList.add('on');
    if (btn) $('#mvMsgBtn').onclick = fn;
  }
  function intro(force) {
    let seen = 0; try { seen = localStorage.getItem(INTRO_KEY); } catch (e) { /* ignore */ }
    if (seen && !force) return;
    const e = $('#mvIntro');
    e.innerHTML = `<div class="mvicard"><div class="kick">Your real streets</div><h3>This is your real neighbourhood</h3>
      <p>Walk past real places with the map open, and you'll scout them as bonus houses to loot.</p>
      <ul><li><i><img alt="" src="${iconURL('pharmacy')}"></i><span><b>A pharmacy, a corner store, the police station</b> - real places near you show up as badges.</span></li>
      <li><i class="o"><img alt="" src="${iconURL('bodega')}"></i><span><b>Get within about ${CLAIM_M} m</b> and it glows - it joins your houses with its real name. Loot it later from the Houses tab.</span></li>
      <li><i>3</i><span><b>Up to 3 a day, on foot.</b> Cars and buses don't count, and you have to walk up to a place - it won't count from your couch.</span></li>
      <li><i><svg width="20" height="20" viewBox="0 0 20 20"><rect x="4" y="9" width="12" height="9" rx="2" fill="#f6e3bb"/><path d="M6.5 9V6.5a3.5 3.5 0 0 1 7 0V9" fill="none" stroke="#f6e3bb" stroke-width="2.4"/></svg></i><span><b>Your location stays on this phone</b>, only while the map is open. It is never saved.</span></li></ul>
      <button class="mbtn" id="mvIntroGo">Let's walk</button></div>`;
    e.classList.add('on');
    $('#mvIntroGo').onclick = () => { try { localStorage.setItem(INTRO_KEY, '1'); } catch (x) { /* ignore */ } e.classList.remove('on'); DM.E.SFX && DM.E.SFX.play && DM.E.SFX.play('ui'); };
  }
  function scoutPill() {
    const e = $('#mvPill'); if (!e) return;
    let t = '', warn = false;
    if (M.busy) t = M.layers.some(l => l.nB || l.nR) ? 'Scouting the next block...' : 'Scouting the area...';
    else if (M.offline && (M.layers.length || Object.keys(M.places).length)) { t = 'Offline - showing your saved map'; warn = true; }
    else if (M.fails && (M.layers.length || Object.keys(M.places).length)) { t = 'Map servers busy - retrying soon'; warn = true; }
    else if (M.partial) { t = 'Streets did not load - places still work'; warn = true; }
    e.querySelector('span').textContent = t; e.classList.toggle('on', !!t); e.classList.toggle('warn', warn);
  }
  function showBanner(pl) {   // one at a time: two claims a second apart each get their moment
    M.bq = M.bq || []; M.bq.push(pl); if (!M.bOn) nextBanner();
  }
  function nextBanner() {
    const e = $('#mvBanner'), pl = M.bq && M.bq.shift(); if (!e) return;
    if (!pl) { M.bOn = false; e.classList.remove('on'); return; }
    M.bOn = true;
    const place = pl.street && pl.street !== pl.name ? `${esc(pl.name)} &middot; ${esc(pl.street)}` : esc(pl.name);
    e.innerHTML = `<span class="bdg"><img alt="" src="${iconURL(pl.type)}"></span><div><span class="kick">Added to your houses</span><b>${place}</b><span>${DM.D.BTYPES[pl.type].n} &middot; loot it from the Houses tab</span></div>`;
    e.classList.add('on'); clearTimeout(M.bannerT); M.bannerT = setTimeout(nextBanner, M.bq.length ? 3200 : 5000);
  }
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtD = d => d < 1000 ? Math.max(5, Math.round(d / 5) * 5) + ' m' : (d / 1000).toFixed(1) + ' km';
  function renderCard() {
    if (!$('#mvCard')) return;
    const left = DM.Game.landmarkLeft(), got = 3 - left;
    $('#mvPips').innerHTML = [0, 1, 2].map(i => `<i class="${i < got ? 'on' : ''}"></i>`).join('');
    $('#mvLeft').textContent = `${got} of 3 landmarks found today`;
    const arr = $('#mvArr'), ico = $('#mvIco');
    let line = '', sub = '', dd = '', show = null, ang = null;
    if (M.gpsMsg === 'denied') { line = 'Location is off'; sub = 'The rest of the game works without it'; }
    else if (M.gpsMsg === 'none') line = 'No location on this phone';
    else if (!M.pos) { line = M.guess ? 'Getting a clear fix...' : 'Finding you...'; sub = M.gpsMsg === 'wait' ? 'Waiting for GPS - step outside or near a window' : 'Your location stays on this phone'; }
    else if (M.status) { line = M.status; sub = !left ? 'Your new houses are in the Houses tab' : ''; }
    else {
      const t = target();
      const ld = loading();
      if (!t && !ld && M.offline) { line = 'You\'re offline'; sub = 'Streets you have seen before still show'; }
      else if (!t && !ld && M.fails) { line = 'Can\'t reach the map servers'; sub = 'Trying again by itself'; }
      else if (!t) { line = ld ? 'Scouting the area...' : 'No marked places close by'; sub = ld ? 'Looking up the real places around you' : 'Try another street'; }
      else {
        const reach = reachNow(); show = t; dd = fmtD(t.d); ang = bearing(M.pos, t);
        line = t.name; sub = `${DM.D.BTYPES[t.type].n} - ` + (t.d <= reach && !M.far[t.id] ? 'right here - walk away and back to scout it' : t.d <= reach * 2.2 ? 'almost there - keep walking' : 'nearest place to scout');
      }
    }
    $('#mvStat').textContent = line; $('#mvSub2').textContent = sub; $('#mvDist').textContent = dd;
    arr.classList.toggle('on', ang != null); if (ang != null) arr.querySelector('svg').style.transform = `rotate(${Math.round(ang)}deg)`;
    ico.classList.toggle('on', !!show && ang == null); if (show) ico.src = iconURL(show.type);
    $('#mvTopSub').textContent = M.pos ? `${visible().filter(p => !p.house).length} places nearby · your real streets` : 'Your real streets';
  }

  // ------------------------------------------------------------- open / close
  function open() {
    M.t0 = performance.now(); M.tFirst = 0; M.tData = 0;
    build(); M.on = true; $('#mapv').classList.add('on'); message();
    try { for (const k of Object.keys(localStorage)) if (k.startsWith('dm9.osm.')) localStorage.removeItem(k); } catch (e) { /* ignore: 0.9's cache */ }
    size(); M.follow = true; M.camSet = 0; $('#mvMe').classList.remove('on');
    // Ask for the location straight from the tap (iOS only shows its prompt from a tap).
    if (!navigator.geolocation) { M.gpsMsg = 'none'; message('No location on this phone', 'This browser cannot share your location, so the map has nothing to show. The rest of the game works the same.', 'Back', close); }
    else if (M.watch == null) {
      M.gpsMsg = '';
      // a quick rough fix first (one the phone already has), for the camera and the first square only -
      // landmarks wait for the precise watch below
      try { navigator.geolocation.getCurrentPosition(onQuick, () => { /* the watch reports errors */ }, { enableHighAccuracy: false, maximumAge: 10 * 60000, timeout: 8000 }); } catch (e) { /* ignore */ }
      M.watch = navigator.geolocation.watchPosition(onPos, onGpsErr, { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 });
    }
    if (navigator.wakeLock) navigator.wakeLock.request('screen').then(w => { M.wake = w; }).catch(() => { /* fine */ });
    // the last square she looked at draws straight away (from this phone), before any GPS answer
    getMeta('last').then(k => { if (k && M.on && !me()) { M.lastK = String(k); loadCell(M.lastK, true); } });
    for (const t of ['pharmacy', 'bodega', 'police', 'school', 'laundro', 'garage', 'rowS', 'rowL', 'apt']) img(t);
    intro(false); renderCard(); scoutPill();
    cancelAnimationFrame(M.raf); M.lastT = 0; M.raf = requestAnimationFrame(frame);
    clearInterval(M.cardT); M.cardT = setInterval(() => { if (M.on) { if (M.pos) claim(); renderCard(); } }, 1000);
  }
  function close() {
    M.on = false; const v = $('#mapv'); if (v) v.classList.remove('on');
    if (M.watch != null) { try { navigator.geolocation.clearWatch(M.watch); } catch (e) { /* ignore */ } M.watch = null; }
    if (M.wake) { try { M.wake.release(); } catch (e) { /* ignore */ } M.wake = null; }
    clearTimeout(M.retryT); M.retryT = null; clearInterval(M.cardT); cancelAnimationFrame(M.raf);
    M.pos = null; M.guess = null; M.spd = []; M.far = {}; M.lastMe = null; M.zs = [];   // her position is forgotten as soon as the map closes
    for (const k in M.cells) if (M.cells[k] === 'queued' || M.cells[k] === 'fail' || M.cells[k] === 'part') delete M.cells[k];
    M.queue = [];
    if (DM.Game && DM.Game.renderHome && !DM.scene) DM.Game.renderHome();
  }

  // ------------------------------------------------------------- GPS
  function onGpsErr(e) {
    if (!M.on) return;
    if (e.code === 1) {
      M.gpsMsg = 'denied'; renderCard();
      const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      message('Location is off for this game', ios ? 'To use the map: Settings &rsaquo; Privacy &amp; Security &rsaquo; Location Services &rsaquo; Safari Websites &rsaquo; While Using the App, then reopen the map. If it still asks nothing, tap <b style="display:inline;font-size:inherit">aA</b> in Safari &rsaquo; Website Settings &rsaquo; Location &rsaquo; Allow.<br><br>Everything else in the game works without it.'
        : 'Allow location for this site in your browser\'s site settings, then reopen the map. Everything else in the game works without it.', 'Back', close, 'gps');
      if (M.watch != null) { try { navigator.geolocation.clearWatch(M.watch); } catch (x) { /* ignore */ } M.watch = null; }
    } else { M.gpsMsg = 'wait'; renderCard(); }
  }
  function onQuick(p) {
    if (!M.on || M.pos) return;
    M.guess = { lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy || 500 };
    setOrigin(M.guess.lat, M.guess.lon); fetchAround(M.guess, true); renderCard();
  }
  function onPos(p) {
    if (!M.on) return;
    const pos = { lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy || 50 };
    noteSpeed(pos, p.coords.speed, p.timestamp || Date.now());
    const first = !M.pos; M.pos = pos; M.gpsMsg = ''; M.guess = null;
    setOrigin(pos.lat, pos.lon);
    if (first && M.msgKind === 'gps') message();
    fetchAround(pos, true);
    claim(); renderCard();
  }

  // ------------------------------------------------------------- camera + touch
  function size() {
    const box = $('#mvMap').getBoundingClientRect(), cv = $('#mvCv');
    M.dpr = Math.min(2, window.devicePixelRatio || 1); M.W = Math.max(1, box.width); M.H = Math.max(1, box.height);
    cv.width = Math.round(M.W * M.dpr); cv.height = Math.round(M.H * M.dpr); M.dirty = true;
  }
  function zoomAt(sx, sy, f) {
    const c = M.cam, ns = Math.max(ZMIN, Math.min(ZMAX, c.s * f)); if (ns === c.s) return;
    const wxp = c.x + (sx - M.W / 2) / c.s, wyp = c.y + (sy - M.H / 2) / c.s;
    c.s = ns; if (!M.follow) { c.x = wxp - (sx - M.W / 2) / ns; c.y = wyp - (sy - M.H / 2) / ns; }
  }
  function zoomBy(f) { zoomAt(M.W / 2, M.H / 2, f); }
  function pdown(e) { try { $('#mvCv').setPointerCapture(e.pointerId); } catch (x) { /* ignore */ } M.ptrs.set(e.pointerId, { x: e.offsetX, y: e.offsetY, x0: e.offsetX, y0: e.offsetY }); if (M.ptrs.size === 1) M.moved = false; M.pinch = null; }
  function pmove(e) {
    const p = M.ptrs.get(e.pointerId); if (!p) return;
    const dx = e.offsetX - p.x, dy = e.offsetY - p.y; p.x = e.offsetX; p.y = e.offsetY;
    if (M.ptrs.size >= 2) {
      const [a, b] = [...M.ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      if (M.pinch) { zoomAt(mx, my, d / M.pinch.d); if (!M.follow) { M.cam.x -= (mx - M.pinch.mx) / M.cam.s; M.cam.y -= (my - M.pinch.my) / M.cam.s; } }
      M.pinch = { d, mx, my }; M.moved = true; return;
    }
    if (!M.moved && Math.hypot(p.x - p.x0, p.y - p.y0) < 7) return;
    M.moved = true; M.follow = false; $('#mvMe').classList.add('on');
    M.cam.x -= dx / M.cam.s; M.cam.y -= dy / M.cam.s;
  }
  function pup(e) {
    const p = M.ptrs.get(e.pointerId); M.ptrs.delete(e.pointerId);
    if (M.ptrs.size < 2) M.pinch = null;
    if (!M.ptrs.size) M.dirty = M.dirty || Math.abs(M.st ? M.st.s / M.cam.s - 1 : 0) > .02;
    if (p && !M.moved && e.type === 'pointerup') tap(p.x, p.y);
  }
  function tap(x, y) {
    let best = null, bd = Infinity;
    for (const b of M.drawn || []) { const d = Math.hypot(b.x - x, b.y - y); if (d < b.r + 12 && d < bd) { best = b; bd = d; } }
    M.sel = best ? best.pl : null; M.selT = performance.now();
  }

  // ------------------------------------------------------------- drawing
  function frame(t) {
    if (!M.on) return;
    M.raf = requestAnimationFrame(frame);
    if (t - M.lastT < 30) return;   // ~30 fps is plenty, and kinder to the battery
    const dt = M.lastT ? Math.min(.1, (t - M.lastT) / 1000) : 0; M.lastT = t;
    const p = me(), c = M.cam;
    if (p && O.set) {
      const tx = wx(p.lon), ty = wy(p.lat);
      if (M.lastMe) { const mdx = tx - M.lastMe.x, mdy = ty - M.lastMe.y; if (Math.hypot(mdx, mdy) > .3) { if (Math.abs(mdx) > .2) M.flip = mdx < 0; M.walkT = 1.2; } M.lastMe.x += mdx * Math.min(1, dt * 5); M.lastMe.y += mdy * Math.min(1, dt * 5); }
      else { M.lastMe = { x: tx, y: ty }; if (M.follow) { c.x = tx; c.y = ty; } }
      if (M.follow) { c.x += (M.lastMe.x - c.x) * Math.min(1, dt * 4); c.y += (M.lastMe.y - c.y) * Math.min(1, dt * 4); }
    } else if (!p && O.set && M.lastK && !M.camSet) {   // no fix yet: look at the middle of the last square
      const [cy, cx] = M.lastK.split(':').map(Number); c.x = wx((cx + .5) * CELL); c.y = wy((cy + .5) * CELL); M.camSet = 1;
    }
    M.walkT = Math.max(0, M.walkT - dt);
    // load whatever square the camera has been dragged to (she may want to look ahead)
    if (!M.follow && O.set && (!M.camLoadT || t - M.camLoadT > 1200)) { M.camLoadT = t; loadCell(cellOf({ lat: O.lat - c.y / O.ky, lon: O.lon + c.x / O.kx }).join(':'), false); }
    staticLayer();
    draw(t / 1000, dt);
    if (!M.tFirst && M.layers.some(l => l.nB || l.nR)) M.tFirst = performance.now() - M.t0;
  }
  // The streets/buildings layer is drawn into an off-screen canvas a bit bigger than the screen and only redrawn
  // when the view leaves it or the zoom changes; every frame just blits it and draws the moving bits on top.
  function staticLayer() {
    const c = M.cam, mg = .4;
    let S = M.st;
    if (S && !M.dirty) {
      if (M.ptrs.size >= 2) return;   // mid-pinch: keep scaling the old picture, redraw on release
      const hw = S.w / 2 / S.s, hh = S.h / 2 / S.s, vw = M.W / 2 / c.s, vh = M.H / 2 / c.s;
      if (Math.abs(S.s / c.s - 1) < .02 && c.x - vw >= S.cx - hw && c.x + vw <= S.cx + hw && c.y - vh >= S.cy - hh && c.y + vh <= S.cy + hh) return;
    }
    if (!S) S = M.st = { cv: document.createElement('canvas') };
    S.w = M.W * (1 + 2 * mg); S.h = M.H * (1 + 2 * mg); S.s = c.s; S.cx = c.x; S.cy = c.y;
    const W = Math.round(S.w * M.dpr), H = Math.round(S.h * M.dpr);
    if (S.cv.width !== W || S.cv.height !== H) { S.cv.width = W; S.cv.height = H; }
    M.dirty = false;
    const t0 = performance.now(); renderWorld(S.cv.getContext('2d'), S); M.renderMs = performance.now() - t0;
  }
  function renderWorld(x, S) {
    const s = S.s, d = M.dpr;
    x.setTransform(1, 0, 0, 1, 0, 0); x.fillStyle = C.GROUND; x.fillRect(0, 0, S.cv.width, S.cv.height);
    const gx0 = S.cx - S.w / 2 / s, gy0 = S.cy - S.h / 2 / s, vx1 = gx0 + S.w / s, vy1 = gy0 + S.h / s;
    x.setTransform(d * s, 0, 0, d * s, d * (S.w / 2 - S.cx * s), d * (S.h / 2 - S.cy * s));
    // faint grit on the ground so empty lots are not flat paint
    if (s > 1.2) { x.fillStyle = 'rgba(90,74,134,.16)'; const step = 9; for (let gy = Math.floor(gy0 / step) * step; gy < vy1; gy += step) for (let gx = Math.floor(gx0 / step) * step; gx < vx1; gx += step) { const h = hash(gx, gy); if (h < .3) x.fillRect(gx + h * 20, gy + hash(gy, gx) * 9, 1, 1); } }
    const Ls = M.layers.filter(L => L.box[0] < vx1 && L.box[2] > gx0 && L.box[1] < vy1 && L.box[3] > gy0);
    const px = v => v / s;   // a width in screen px, in metres
    x.lineJoin = 'round'; x.lineCap = 'round';
    // water + parks
    for (const L of Ls) { x.fillStyle = C.WATER; x.fill(L.water, 'evenodd'); x.fillStyle = C.PARK; x.fill(L.park, 'evenodd'); x.fillStyle = C.WOOD; x.fill(L.wood, 'evenodd'); }
    x.strokeStyle = C.RIPPLE; x.lineWidth = px(2); for (const L of Ls) x.stroke(L.ripples);
    x.strokeStyle = C.INK; x.lineWidth = px(3); for (const L of Ls) { x.stroke(L.water); x.stroke(L.park); x.stroke(L.wood); }
    // roads: one ink pass, one curb pass, one asphalt pass over every class, so crossings merge into one street
    for (const pass of [0, 1, 2]) for (let cls = 5; cls >= 0; cls--) {
      if (cls === 5 && pass !== 2) continue;
      const [aw, sw] = ROADW[cls];
      if (pass === 1 && !sw) continue;
      const wm = pass === 0 ? aw + 2 * sw + px(5) : pass === 1 ? aw + 2 * sw : aw;
      x.lineWidth = Math.max(wm, px(cls === 5 ? 1.5 : pass === 0 ? 7 : 4));
      if (cls === 5) { x.strokeStyle = 'rgba(246,227,187,.28)'; x.setLineDash([px(4), px(5)]); }
      else x.strokeStyle = pass === 0 ? C.INK : pass === 1 ? C.CURB : cls === 4 ? '#2c2448' : C.ROAD;
      for (const L of Ls) x.stroke(L.roads[cls]);
      x.setLineDash([]);
    }
    x.strokeStyle = 'rgba(240,160,80,.42)'; x.lineWidth = Math.max(.5, px(1.6)); x.setLineDash([3.5, 4.5]); x.lineCap = 'butt';
    for (const L of Ls) x.stroke(L.dash);
    x.setLineDash([]); x.lineCap = 'round';
    // park trees: a blob with an ink rim, a drop shadow and a light cap
    for (const L of Ls) {
      const T = L.trees; if (!T.length) continue;
      if (!L.treeP) {
        const pa = new Path2D(), hi = new Path2D();
        for (let i = 0; i < T.length; i += 3) { const r = T[i + 2]; pa.moveTo(T[i] + r, T[i + 1]); pa.arc(T[i], T[i + 1], r, 0, 6.2832); const hx = T[i] - r * .2, hy = T[i + 1] - r * .3; hi.moveTo(hx + r * .42, hy); hi.arc(hx, hy, r * .42, 0, 6.2832); }
        L.treeP = pa; L.treeH = hi;
      }
      x.fillStyle = 'rgba(9,8,26,.45)'; x.save(); x.translate(0, px(3)); x.fill(L.treeP); x.restore();
      x.fillStyle = C.TREE; x.fill(L.treeP); x.strokeStyle = C.INK; x.lineWidth = px(2); x.stroke(L.treeP); x.fillStyle = C.TREEHI; x.fill(L.treeH);
    }
    // buildings: wall faces, windows, then the roofs over them
    x.lineWidth = px(s >= 1.4 ? 2.2 : 1.6); x.strokeStyle = C.INK;
    for (const L of Ls) L.walls.forEach((w, i) => { x.fillStyle = C.WALLS[i]; x.fill(w); });
    for (const L of Ls) x.stroke(L.wallAll);
    if (s >= 1.3) { for (const L of Ls) { x.fillStyle = C.WIN; x.fill(L.wins); x.fillStyle = C.LIT; x.fill(L.lit); } }
    for (const L of Ls) L.roofs.forEach((r, i) => { x.fillStyle = C.ROOF[i]; x.fill(r); });
    // a light bevel just inside each roof's top edge, like the lit top of the game's furniture
    x.strokeStyle = 'rgba(157,144,191,.32)'; x.lineWidth = px(2.2);
    for (const L of Ls) { x.save(); x.clip(L.roofAll); x.translate(0, px(2.2)); x.stroke(L.roofAll); x.restore(); }
    x.strokeStyle = C.INK; x.lineWidth = px(s >= 1.4 ? 2.2 : 1.6);
    for (const L of Ls) x.stroke(L.roofAll);
    if (s >= 1.3) for (const L of Ls) { x.fillStyle = C.BOX; x.fill(L.boxes); x.lineWidth = px(1.5); x.stroke(L.boxes); }
    // street names along the longest stretch of each street
    if (s >= 1.1) {
      x.setTransform(d, 0, 0, d, 0, 0);
      x.font = `900 ${s >= 2.5 ? 12 : 10.5}px Inter, system-ui, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
      const put = [], X = v => (v - S.cx) * s + S.w / 2, Y = v => (v - S.cy) * s + S.h / 2;
      for (const L of Ls) for (const lb of L.labels) {
        let best = 0, bi = -1; const P = lb.P;
        for (let i = 0; i + 3 < P.length; i += 2) { const l = Math.hypot(P[i + 2] - P[i], P[i + 3] - P[i + 1]); if (l > best) { best = l; bi = i; } }
        if (bi < 0) continue;
        const name = lb.n.toUpperCase(), tw = x.measureText(name).width + 14 + name.length * 1.2;
        if (best * s < tw) continue;
        const ax = X(P[bi]), ay = Y(P[bi + 1]), bx = X(P[bi + 2]), by = Y(P[bi + 3]), sl = Math.hypot(bx - ax, by - ay), m0 = (tw / 2 + 6) / sl;
        let u = ((S.w / 2 - ax) * (bx - ax) + (S.h / 2 - ay) * (by - ay)) / (sl * sl); u = Math.max(m0, Math.min(1 - m0, u));
        const mx = ax + (bx - ax) * u, my = ay + (by - ay) * u;
        if (mx < -50 || my < -50 || mx > S.w + 50 || my > S.h + 50) continue;
        if (put.some(q => Math.hypot(q.x - mx, q.y - my) < (q.n === name ? 280 : 46))) continue;
        put.push({ n: name, x: mx, y: my });
        let a = Math.atan2(P[bi + 3] - P[bi + 1], P[bi + 2] - P[bi]); if (a > Math.PI / 2) a -= Math.PI; if (a < -Math.PI / 2) a += Math.PI;
        x.save(); x.translate(mx, my); x.rotate(a);
        if ('letterSpacing' in x) x.letterSpacing = '1.2px';
        x.lineWidth = 4; x.lineJoin = 'round'; x.strokeStyle = C.INK; x.strokeText(name, 0, 0); x.fillStyle = 'rgba(176,164,212,.95)'; x.fillText(name, 0, 0);
        x.restore();
      }
      if ('letterSpacing' in x) x.letterSpacing = '0px';
    }
  }

  // a dark silhouette of the game's zombie, for mood only (they shuffle along the streets at the edge of her light)
  let zSprite = null;
  function zombieSprite() {
    if (zSprite || !hasArt() || !ART.rigs.zombie) return zSprite;
    const cv = document.createElement('canvas'), k = 2; cv.width = 70 * k; cv.height = 100 * k;
    const x = cv.getContext('2d'); x.scale(k, k);
    ART.drawRig(x, 'zombie', 35, 96, .33, false, { parts: { armF: { r: -.5 }, armB: { r: -.35 } } });
    x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(10,9,28,.84)'; x.fillRect(0, 0, 70, 100);
    return (zSprite = cv);
  }
  function zombies(x, t, dt) {
    const p = M.lastMe; if (!p || !M.layers.length) return;
    if (M.zs.length < 4 && Math.random() < dt * 1.5) {   // appear on a random street point 70-230 m out
      const Ls = M.layers.filter(L => L.labels.length), L = Ls[Math.floor(Math.random() * Ls.length)];
      const lb = L && L.labels[Math.floor(Math.random() * L.labels.length)];
      if (lb) { const i = Math.floor(Math.random() * (lb.P.length / 2)) * 2, zx = lb.P[i], zy = lb.P[i + 1], d = Math.hypot(zx - p.x, zy - p.y); if (d > 70 && d < 230) M.zs.push({ x: zx, y: zy, a: Math.random() * 6.28, f: 0, ph: Math.random() * 6 }); }
    }
    const spr = zombieSprite(); if (!spr) return;
    const c = M.cam, sc = Math.max(.55, Math.min(1.1, c.s / 2.4)) * .62;
    for (let i = M.zs.length - 1; i >= 0; i--) {
      const z = M.zs[i], d = Math.hypot(z.x - p.x, z.y - p.y);
      z.a += (Math.random() - .5) * dt; z.x += Math.cos(z.a) * .7 * dt; z.y += Math.sin(z.a) * .7 * dt; z.ph += dt * 3;
      z.f = d < 55 || d > 260 ? z.f - dt * .8 : Math.min(1, z.f + dt * .5);   // they keep out of her lamp light
      if (z.f < 0 && (d < 55 || d > 260)) { M.zs.splice(i, 1); continue; }
      const sx = (z.x - c.x) * c.s + M.W / 2, sy = (z.y - c.y) * c.s + M.H / 2;
      if (sx < -40 || sx > M.W + 40 || sy < -60 || sy > M.H + 40) continue;
      x.save(); x.globalAlpha = Math.max(0, z.f) * .9; x.translate(sx, sy); x.rotate(Math.sin(z.ph) * .08); if (Math.cos(z.a) > 0) x.scale(-1, 1);
      x.fillStyle = 'rgba(9,8,26,.5)'; x.beginPath(); x.ellipse(0, 0, 14 * sc, 5 * sc, 0, 0, 6.2832); x.fill();
      x.drawImage(spr, -35 * sc, -96 * sc, 70 * sc, 100 * sc);
      x.fillStyle = '#c8e07a'; x.fillRect(-7 * sc, -63 * sc, 2.4 * sc, 2 * sc); x.fillRect(-1 * sc, -63 * sc, 2.4 * sc, 2 * sc);
      x.restore();
    }
  }
  function draw(t, dt) {
    const cv = $('#mvCv'), x = cv.getContext('2d'), c = M.cam, S = M.st, d = M.dpr;
    x.setTransform(d, 0, 0, d, 0, 0);
    x.fillStyle = C.GROUND; x.fillRect(0, 0, M.W, M.H);
    if (S) { const k = c.s / S.s; x.drawImage(S.cv, M.W / 2 + (S.cx - c.x) * c.s - S.w / 2 * k, M.H / 2 + (S.cy - c.y) * c.s - S.h / 2 * k, S.w * k, S.h * k); }
    const SX = v => (v - c.x) * c.s + M.W / 2, SY = v => (v - c.y) * c.s + M.H / 2;
    zombies(x, t, dt);
    const P = M.lastMe, px = P ? SX(P.x) : M.W / 2, py = P ? SY(P.y) : M.H / 2;
    // fog: her lamp makes a pool of light; the rest of the night closes in
    const R = Math.max(M.W, M.H) * .72, fg = x.createRadialGradient(px, py - 10, 60, px, py - 10, R);
    fg.addColorStop(0, 'rgba(9,8,26,0)'); fg.addColorStop(.55, 'rgba(9,8,26,.3)'); fg.addColorStop(1, 'rgba(9,8,26,.68)');
    x.fillStyle = fg; x.fillRect(0, 0, M.W, M.H);
    for (let i = 0; i < 3; i++) {   // drifting mist
      const mx = ((t * (6 + i * 3) + i * 230) % (M.W + 400)) - 200, my = M.H * (.2 + i * .3) + Math.sin(t * .2 + i) * 30, mg = x.createRadialGradient(mx, my, 0, mx, my, 170);
      mg.addColorStop(0, 'rgba(157,144,191,.07)'); mg.addColorStop(1, 'rgba(157,144,191,0)'); x.fillStyle = mg; x.fillRect(mx - 170, my - 170, 340, 340);
    }
    if (P) {
      const lg = x.createRadialGradient(px, py - 8, 4, px, py - 8, 120);
      lg.addColorStop(0, 'rgba(255,196,120,.30)'); lg.addColorStop(.5, 'rgba(240,123,60,.12)'); lg.addColorStop(1, 'rgba(240,123,60,0)');
      x.fillStyle = lg; x.beginPath(); x.arc(px, py - 8, 120, 0, 6.2832); x.fill();
      if (M.pos) {   // her scouting reach
        x.beginPath(); x.arc(px, py, reachNow() * c.s, 0, 6.2832); x.fillStyle = 'rgba(240,123,60,.06)'; x.fill();
        x.setLineDash([7, 6]); x.lineDashOffset = -t * 8; x.lineWidth = 2; x.strokeStyle = 'rgba(240,123,60,.55)'; x.stroke(); x.setLineDash([]);
      } else if (M.guess) { x.beginPath(); x.arc(px, py, Math.min(M.guess.acc * c.s, 400), 0, 6.2832); x.fillStyle = 'rgba(157,144,191,.08)'; x.fill(); }
    }
    drawPlaces(x, t, SX, SY);
    // her: the game's own survivor sprite, walking when she moves
    if (P) {
      x.fillStyle = 'rgba(9,8,26,.55)'; x.beginPath(); x.ellipse(px, py + 1, 13, 4.5, 0, 0, 6.2832); x.fill();
      const walk = Math.min(1, M.walkT), sw = Math.sin(t * 9);
      const parts = { legB: { r: sw * .5 * walk }, legF: { r: -sw * .5 * walk }, arm: { r: -sw * .18 * walk }, bat: { r: -sw * .18 * walk } };
      if (hasArt() && ART.rigs.survivor) ART.drawRig(x, 'survivor', px, py - Math.abs(Math.cos(t * 9)) * 2 * walk, .2, M.flip, { parts, sy: walk < .1 ? 1 + Math.sin(t * 2.6) * .012 : 1, alpha: M.pos ? 1 : .6 });
      else { x.fillStyle = C.ORA; x.strokeStyle = C.INK; x.lineWidth = 3; x.beginPath(); x.arc(px, py - 10, 9, 0, 6.2832); x.fill(); x.stroke(); }
    }
    // the bubble over a tapped badge
    const tip = $('#mvTip');
    if (M.sel && performance.now() - M.selT < 5000) {
      const pl = M.sel, have = DM.Game.landmarkHave(keyOf(pl)), dd = M.pos ? dist(pl, M.pos) : null;
      const html = `${esc(pl.name)}<span>${DM.D.BTYPES[pl.type].n}${have ? ' &middot; in your houses' : dd != null ? ' &middot; ' + fmtD(dd) + ' away' : ''}</span>`;
      if (tip._h !== html) { tip.innerHTML = html; tip._h = html; }
      const hw = tip.offsetWidth / 2 + 6; tip.style.left = Math.max(hw, Math.min(M.W - hw, SX(wx(pl.lon)))) + 'px'; tip.style.top = SY(wy(pl.lat)) + 'px'; tip.classList.add('on');
    } else tip.classList.remove('on');
  }
  function drawPlaces(x, t, SX, SY) {
    if (!O.set) return;
    const p = M.pos, reach = reachNow(), drawn = [], all = Object.values(M.places);
    let hs = [];
    if (p) hs = all.filter(pl => pl.house).map(pl => [pl, dist(pl, p)]).filter(a => a[1] < 180).sort((a, b) => a[1] - b[1]).slice(0, HOUSE_BADGES).map(a => a[0]);
    const list = all.filter(pl => !pl.house).concat(hs), tgt = p ? target() : null, placed = [];
    const can = p && DM.Game.landmarkLeft() > 0 && !driveLock() && p.acc <= MAX_ACC;
    for (const pl of list) {
      const sx = SX(wx(pl.lon)), sy = SY(wy(pl.lat));
      if (sx < -40 || sx > M.W + 40 || sy < -40 || sy > M.H + 40) continue;
      const have = DM.Game.landmarkHave(keyOf(pl)), d = p ? dist(pl, p) : 1e9;
      const hot = !have && can && d <= reach && M.far[pl.id], near = !have && !hot && d <= reach * 2.2 && (!pl.house || pl === tgt);
      const r = pl.house ? 11 : 17;
      if (pl.house && !hot && pl !== tgt && placed.some(q => Math.hypot(q[0] - sx, q[1] - sy) < q[2] + r + 4)) continue;
      placed.push([sx, sy, r]); drawn.push({ x: sx, y: sy, r, pl });
      if (hot || near) {   // a pulse while she approaches, a glowing ring when it is hers to take
        const k = (t * (hot ? 1.4 : .9)) % 1;
        x.beginPath(); x.arc(sx, sy, r + 4 + k * (hot ? 26 : 18), 0, 6.2832); x.lineWidth = 3; x.strokeStyle = `rgba(240,123,60,${(1 - k) * .8})`; x.stroke();
      }
      if (hot) { x.save(); x.shadowColor = C.ORA; x.shadowBlur = 22; x.beginPath(); x.arc(sx, sy, r + 5, 0, 6.2832); x.lineWidth = 4; x.strokeStyle = '#ffb27a'; x.stroke(); x.restore(); }
      x.fillStyle = C.INK; x.beginPath(); x.arc(sx, sy + 3, r + 1.5, 0, 6.2832); x.fill();   // chunky drop
      x.beginPath(); x.arc(sx, sy, r, 0, 6.2832); x.fillStyle = hot ? C.ORA : have ? '#34452f' : pl.house ? C.LILD : C.WALL; x.fill();
      x.lineWidth = pl.house ? 2.5 : 3; x.strokeStyle = C.INK; x.stroke();
      if (!pl.house) { x.beginPath(); x.arc(sx, sy, r - 3.5, 0, 6.2832); x.lineWidth = 1.5; x.strokeStyle = hot ? 'rgba(17,20,47,.4)' : 'rgba(157,144,191,.35)'; x.stroke(); }
      const im = IMG[pl.type] || img(pl.type);
      if (im.complete && im.naturalWidth) { x.globalAlpha = have ? .6 : 1; x.drawImage(im, sx - r * .72, sy - r * .76, r * 1.44, r * 1.44); x.globalAlpha = 1; }
      if (have) {   // green check: already in her houses
        const cx = sx + r * .72, cy = sy - r * .72;
        x.beginPath(); x.arc(cx, cy, 7, 0, 6.2832); x.fillStyle = C.GRN; x.fill(); x.lineWidth = 2.2; x.strokeStyle = C.INK; x.stroke();
        x.beginPath(); x.moveTo(cx - 3.2, cy); x.lineTo(cx - .8, cy + 2.4); x.lineTo(cx + 3.4, cy - 2.6); x.stroke();
      }
      if (M.burst && M.burst.id === pl.id) {
        const k = (performance.now() - M.burst.t) / 900;
        if (k > 1) M.burst = null;
        else for (let i = 0; i < 10; i++) { const a = i / 10 * 6.2832, rr = r + 6 + k * 40; x.fillStyle = i % 2 ? C.CRM : C.ORA; x.globalAlpha = 1 - k; x.beginPath(); x.arc(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr, 3.2, 0, 6.2832); x.fill(); x.globalAlpha = 1; }
      }
      if (!pl.house && M.cam.s >= 1.2 && sx > 0 && sx < M.W) {
        x.font = '900 11px Inter, system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'top';
        const nm = pl.name.length > 22 ? pl.name.slice(0, 21) + '…' : pl.name;
        const hw = x.measureText(nm).width / 2 + 4, lx = Math.max(hw, Math.min(M.W - hw, sx));
        x.lineWidth = 3.5; x.strokeStyle = C.INK; x.lineJoin = 'round'; x.strokeText(nm, lx, sy + r + 6); x.fillStyle = hot ? '#ffd0a8' : C.CRM; x.fillText(nm, lx, sy + r + 6);
      }
    }
    M.drawn = drawn;
  }

  DM.Map = { open, close, get on() { return M.on; }, _M: M, _typeOf: typeOf, _O: O,
    get timing() { return { firstDraw: M.tFirst, data: M.tData, render: M.renderMs }; } };
  if (DM.ready && DM.Game && DM.Game.renderHome) DM.Game.renderHome();   // show the Map tab if the home screen drew first
})();
