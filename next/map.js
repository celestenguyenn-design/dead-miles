/* Dead Miles (next) 0.16 - the real-world map, drawn in the game's own "Spooky flat" style.
   (0.9 brought it back from the old game on Leaflet + raster OSM tiles; 0.16 drops both.)

   The map is drawn by hand on a canvas from OpenStreetMap vector data: thick dark-purple streets with ink edges and
   curbs, flat plum building blocks with a 3/4 wall face (lit windows here and there), teal parks with trees, deep blue
   water, her own survivor sprite under a lamp-light circle, real places as the game's house-type icons on round badges,
   and fog around the edges. 0.25: the data comes from OpenFreeMap vector tiles (z14, decoded by mvt.js; Overpass only as
   a fallback), turned into one compact record per ~700 m grid square, cached per square in IndexedDB (LRU, MAX_CELLS squares) so a square she has walked before draws instantly, even offline.

   Walk within ~35 m of a marked place with the map open and it becomes a LANDMARK house in the house list: its real
   name, a pin, and a type from its tags. Up to 3 a day, on foot only.

   Privacy: location is asked for only when the map opens and lives only in memory while it is open. The tile server is
   asked for whole ~1.8 km tiles (Overpass, the fallback, for a ~700 m square), never her exact spot. The phone keeps the squares' map data and which square was
   shown last (so the map can open instantly) - a square, never a point - and none of it goes into the save. The save
   (cloud too) keeps only each landmark house's type, name/street and seed - never a coordinate or an OpenStreetMap id.

   Lessons kept from the old street.js: GPS accuracy filtering, Overpass mirrors with backoff, a light places-only query
   when the big one fails (a slow building lookup must not wipe out the pharmacy), the speed check that needs 3 fast
   readings in a row (a single GPS jump is not a car) and differences against the oldest fix minus both accuracies. */
'use strict';
(() => {
  const $ = s => document.querySelector(s);
  const hasArt = () => typeof ART !== 'undefined' && ART.rigs;
  const MIRRORS = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];   // 0.19.2: four, raced (hedged)
  const CLAIM_M = 35, MAX_ACC = 60, VEHICLE_MS = 9, SETTLE_MS = 45000, FAST_HITS = 3;
  const CELL = 0.006, PAD = 0.0004, CACHE_V = 4, CACHE_DAYS = 14, MAX_CELLS = 30, HOUSES_SHOWN = 45, HOUSE_BADGES = 24;
  const ASK_MS = 20000, HEDGE_MS = 3500, INTRO_KEY = 'dm-next-mapintro';
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
  const WALK_OK = 80;
  // 0.30.2 (owner: "when I walk to a place that's not at my home it doesn't collect ... we have to walk like 100 m ...
  // pinpoint where someone's base is and don't let them [claim] around that area at home"): she marks her home spot
  // once (kept on this phone only, never synced). Places within HOME_R of it still need the walk (WALK_OK metres with the
  // map open, or having been away from them); everywhere else a place counts the moment she reaches it. With no home
  // set yet the walk rule applies everywhere, as before. Home can be moved once a week.
  // 0.30.3 (owner: "how can we prevent people from cheating? ... I go to my boyfriend's every Friday, so my base kind of
  // changes on the weekend"): up to 2 home spots (adding one only ever protects more ground, so it is always allowed;
  // moving one is once a week), AND learned spots: any ~110 m square she opens the map in on 3+ different days is treated
  // as a home zone too, whatever she set. So marking a fake home far away does not free up the real one for long.
  const HOME_KEY = 'dm-map-home', SPOT_KEY = 'dm-map-spots', HOME_R = 250, HOME_MOVE_MS = 7 * 864e5, LEARN_DAYS = 3;
  const lsGet = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } };
  const okLL = h => h && isFinite(h.lat) && isFinite(h.lon);
  const homes = () => { const v = lsGet(HOME_KEY, null); return (Array.isArray(v) ? v : v ? [v] : []).filter(okLL).slice(0, 2); };
  const home = () => homes()[0] || null;
  const learned = () => { const sp = lsGet(SPOT_KEY, {}); return Object.keys(sp).filter(k => (sp[k] || []).length >= LEARN_DAYS).map(k => { const [lat, lon] = k.split(',').map(Number); return { lat, lon, learned: 1 }; }); };
  const zones = () => homes().concat(learned());
  const nearHome = pl => !homes().length || zones().some(h => dist(h, pl) < HOME_R);
  function learnSpot(pos) {   // once per map visit: note today in this ~110 m square (keeps the 40 most recent squares)
    const k = pos.lat.toFixed(3) + ',' + pos.lon.toFixed(3), day = new Date().toDateString(), sp = lsGet(SPOT_KEY, {});
    const d = sp[k] || []; if (!d.includes(day)) d.push(day); delete sp[k]; sp[k] = d.slice(-LEARN_DAYS);
    const ks = Object.keys(sp); for (const x of ks.slice(0, Math.max(0, ks.length - 40))) delete sp[x];
    lsSet(SPOT_KEY, sp);
  }
  const walkedTo = pl => !nearHome(pl) || !!M.far[pl.id] || (M.walkedM || 0) >= WALK_OK;
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
  // 0.19.2: one big query per square timed out on dense Brooklyn blocks ("the map servers are busy"). Now three small ones:
  // places first (landmarks work at once), then streets + parks, then building footprints in four quarters.
  const ROADQ = qFull('X').split('\n')[1], AREAQ = qFull('X').split('\n')[3];
  const qPlaces = bb => `[out:json][timeout:20][bbox:${bb}];(${POIQ}way[building~${HOUSEQ}];);out tags center 800;`;
  const qStreets = bb => `[out:json][timeout:20][bbox:${bb}];\n${ROADQ}\n${AREAQ}`;
  const qBuild = bb => `[out:json][timeout:20][bbox:${bb}];way[building];out skel geom qt;`;
  const quarters = bb => { const [s, w, n, e] = bb.split(',').map(Number), my = (s + n) / 2, mx = (w + e) / 2;
    return [[s, w, my, mx], [s, mx, my, e], [my, w, n, mx], [my, mx, n, e]].map(q => q.map(v => v.toFixed(5)).join(',')); };
  // 0.19.2: hedged: ask the first mirror, and if it has not answered in 3.5 s (or fails) ask the next too; the first good
  // answer wins and the others are cancelled. Gives up after 20 s per question. The mirror that answered goes first next time.
  let fastest = 0;
  function ask(q) {
    return new Promise(done => {
      const order = MIRRORS.map((_, i) => (i + fastest) % MIRRORS.length), ctls = [];
      let finished = false, pending = 0, next = 0, err = 'no answer', hedgeT = null;
      const finish = res => { if (finished) return; finished = true; clearTimeout(hedgeT); clearTimeout(allT); for (const c of ctls) try { c.abort(); } catch (e) { /* ignore */ } done(res); };
      const allT = setTimeout(() => finish({ ok: false, els: [], err: 'timed out' }), ASK_MS);
      const launch = () => {
        if (finished || next >= order.length) return;
        const mi = order[next++], ctl = typeof AbortController !== 'undefined' ? new AbortController() : null; if (ctl) ctls.push(ctl);
        pending++; clearTimeout(hedgeT); hedgeT = setTimeout(launch, HEDGE_MS);
        fetch(MIRRORS[mi], { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, signal: ctl ? ctl.signal : undefined })
          .then(r => { if (!r.ok) throw new Error('server said ' + r.status); return r.json(); })
          .then(j => { if (j && j.remark && /timed out|runtime error/i.test(j.remark) && !(j.elements || []).length) throw new Error('timed out'); fastest = mi; finish({ ok: true, els: (j && j.elements) || [] }); })
          .catch(e => { if (finished) return; err = e && e.name === 'AbortError' ? 'timed out' : (e && e.message) || 'offline?'; pending--; if (next < order.length) launch(); else if (!pending) finish({ ok: false, els: [], err }); });
      };
      launch();
    });
  }
  // ------------------------------------------------------------- 0.25: OpenFreeMap vector tiles (the main source now)
  // Public Overpass is too slow and busy for a game (the owner's phone: "The map servers are busy - timed out"; measured:
  // 13-40 s queues, 504s). OpenFreeMap serves OpenMapTiles-schema vector tiles from a CDN: free, no key, ~0.3 s a tile.
  // A ~700 m square needs 1-4 z14 tiles (~1.8 km each in Brooklyn). Each tile is decoded once (mvt.js), turned into the
  // same Overpass-style elements encode() already reads, and the square keeps what falls in its box. Ids are made from
  // the geometry (stable across squares, so a road or building on a square's edge is drawn once). Overpass stays as a
  // fallback when the tiles cannot be had.
  const OFM = 'https://tiles.openfreemap.org/planet', TZ = 14, TILE_MS = 12000, OFM_KEY = 'dm-next-ofm';
  let ofmURL = null;
  async function tileTemplate() {
    if (ofmURL) return ofmURL;
    try { const c = JSON.parse(localStorage.getItem(OFM_KEY) || 'null'); if (c && c.u && Date.now() - c.t < 3 * 864e5) return (ofmURL = c.u); } catch (e) { /* ignore */ }
    const r = await fetchT(OFM, TILE_MS); if (!r.ok) throw new Error('server said ' + r.status);
    const j = await r.json(), u = j && j.tiles && j.tiles[0]; if (!u) throw new Error('no tiles');
    try { localStorage.setItem(OFM_KEY, JSON.stringify({ u, t: Date.now() })); } catch (e) { /* ignore */ }
    return (ofmURL = u);
  }
  function fetchT(url, ms) {
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null, t = setTimeout(() => ctl && ctl.abort(), ms);
    return fetch(url, { signal: ctl ? ctl.signal : undefined }).finally(() => clearTimeout(t));
  }
  const tileX = (lon, n) => Math.floor((lon + 180) / 360 * n);
  const tileY = (lat, n) => Math.floor((1 - Math.asinh(Math.tan(lat * Math.PI / 180)) / Math.PI) / 2 * n);
  function tilesFor(cy, cx) {
    const n = 2 ** TZ, s = cy * CELL - PAD, nn = (cy + 1) * CELL + PAD, w = cx * CELL - PAD, e = (cx + 1) * CELL + PAD, out = [];
    for (let x = tileX(w, n); x <= tileX(e, n); x++) for (let y = tileY(nn, n); y <= tileY(s, n); y++) out.push([x, y]);
    return out;
  }
  const TILES = new Map();   // 'x/y' -> Promise<elements> (this session only; the squares are what is cached)
  function getTile(x, y) {
    const k = x + '/' + y;
    if (!TILES.has(k)) {
      const p = tileTemplate().then(u => fetchT(u.replace('{z}', TZ).replace('{x}', x).replace('{y}', y), TILE_MS))
        .then(r => { if (!r.ok) throw new Error('server said ' + r.status); return r.arrayBuffer(); })
        .then(b => tileEls(DM.MVT.decode(b, TLAYERS), x, y));
      p.catch(() => TILES.delete(k));
      TILES.set(k, p);
      if (TILES.size > 12) TILES.delete(TILES.keys().next().value);
    }
    return TILES.get(k);
  }
  const TLAYERS = ['transportation', 'transportation_name', 'building', 'housenumber', 'poi', 'water', 'park', 'landcover', 'landuse'];
  const OMT_ROAD = { motorway: 'motorway', trunk: 'trunk', primary: 'primary', secondary: 'secondary', tertiary: 'tertiary', minor: 'residential', service: 'service', track: 'track' };
  const OMT_LINK = { motorway: 'motorway_link', trunk: 'trunk_link', primary: 'primary_link', secondary: 'secondary_link', tertiary: 'tertiary_link' };
  function omtHighway(tg) {
    if (tg.class === 'path') return tg.subclass === 'pedestrian' ? 'pedestrian' : tg.subclass === 'steps' ? 'steps' : /^(footway|path|cycleway)$/.test(tg.subclass || '') ? 'footway' : null;
    return (tg.ramp ? OMT_LINK[tg.class] : null) || OMT_ROAD[tg.class] || null;
  }
  function omtArea(L, tg) {
    if (L === 'water') return tg.class === 'swimming_pool' ? null : { natural: 'water' };
    if (L === 'park') return /^(park|nature_reserve)$/.test(tg.class || '') ? { leisure: 'park' } : null;
    if (L === 'landcover') return tg.class === 'wood' ? { natural: 'wood' } : tg.class === 'grass' ? { leisure: tg.subclass || 'park' } : null;
    if (L === 'landuse') return /^(cemetery|pitch|playground|park|garden|grass|village_green|recreation_ground)$/.test(tg.class || '') ? { landuse: 'grass' } : null;
    return null;
  }
  const ringArea = P => { let A = 0; for (let i = 0; i + 3 < P.length; i += 2) A += P[i] * P[i + 3] - P[i + 2] * P[i + 1]; return A / 2; };
  const hid = (...v) => { let h = 2166136261; for (const x of v) { h = Math.imul(h ^ (x | 0), 16777619); h ^= h >>> 13; } return (h >>> 1) || 1; };
  // clip a polyline to the tile square [0, E] (no buffer): tiles overlap a little and a road must not be drawn twice
  function clipLine(P, E) {
    const out = []; let cur = null;
    for (let i = 0; i + 3 < P.length; i += 2) {
      let x0 = P[i], y0 = P[i + 1], x1 = P[i + 2], y1 = P[i + 3], t0 = 0, t1 = 1; const dx = x1 - x0, dy = y1 - y0; let ok = true;
      for (const [p, q] of [[-dx, x0], [dx, E - x0], [-dy, y0], [dy, E - y0]]) {
        if (p === 0) { if (q < 0) { ok = false; break; } continue; }
        const r = q / p; if (p < 0) { if (r > t1) { ok = false; break; } if (r > t0) t0 = r; } else { if (r < t0) { ok = false; break; } if (r < t1) t1 = r; }
      }
      if (!ok) { cur = null; continue; }
      const ax = x0 + dx * t0, ay = y0 + dy * t0, bx = x0 + dx * t1, by = y0 + dy * t1;
      if (!cur || cur[cur.length - 2] !== ax || cur[cur.length - 1] !== ay) { cur = [ax, ay]; out.push(cur); }
      cur.push(bx, by);
      if (t1 < 1) cur = null;
    }
    return out.filter(l => l.length >= 4);
  }
  // tile units -> lat/lon, and the whole tile -> Overpass-style elements
  function tileEls(T, tx, ty) {
    const n = 2 ** TZ, els = [];
    const ll = (E, x, y) => ({ lat: Math.atan(Math.sinh(Math.PI * (1 - 2 * (ty + y / E) / n))) * 180 / Math.PI, lon: (tx + x / E) / n * 360 - 180 });
    const geo = (E, P) => { const g = []; for (let i = 0; i < P.length; i += 2) g.push(ll(E, P[i], P[i + 1])); return g; };
    const L = k => T[k] || { extent: 4096, features: [] };
    // streets; sidewalks are footways that hug a street in the tile data (the curbs already draw them), so they are dropped
    const tr = L('transportation'), E = tr.extent, mpu = 2446 * Math.cos((tileYLat(ty + .5, n)) * Math.PI / 180) / E;   // metres per tile unit
    const car = [], paths = [];
    tr.features.forEach((f, fi) => {
      if (f.type !== 2 || f.tags.brunnel === 'tunnel') return;
      const hw = omtHighway(f.tags); if (!hw) return;
      f.geom.forEach((P, pi) => { for (const Q of clipLine(P, E)) (hw === 'footway' || hw === 'steps' ? paths : car).push({ hw, Q, id: hid(tx, ty, fi, pi, Q[0], Q[1]) }); });
    });
    const grid = new Map(), G = Math.max(16, Math.round(14 / mpu)), gk = (x, y) => Math.floor(x / G) + ',' + Math.floor(y / G);
    for (const r of car) if (r.hw !== 'service' && r.hw !== 'track' && r.hw !== 'pedestrian') for (let i = 0; i + 3 < r.Q.length; i += 2) {
      const len = Math.hypot(r.Q[i + 2] - r.Q[i], r.Q[i + 3] - r.Q[i + 1]), st = Math.max(1, Math.ceil(len / (G / 2)));
      for (let s = 0; s <= st; s++) { const x = r.Q[i] + (r.Q[i + 2] - r.Q[i]) * s / st, y = r.Q[i + 1] + (r.Q[i + 3] - r.Q[i + 1]) * s / st; grid.set(gk(x, y), 1); }
    }
    const nearCar = (x, y) => { const gx = Math.floor(x / G), gy = Math.floor(y / G); for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) if (grid.has((gx + a) + ',' + (gy + b))) return true; return false; };
    const keepPath = Q => { let near = 0, tot = 0; for (let i = 0; i < Q.length; i += 2) { tot++; if (nearCar(Q[i], Q[i + 1])) near++; } return near / tot < .7; };
    for (const r of car.concat(paths.filter(p => keepPath(p.Q)))) els.push({ type: 'way', id: r.id, tags: { highway: r.hw }, geometry: geo(E, r.Q) });
    // street names: label-only lines (drawn by ingest as names, not as a second road)
    const tn = L('transportation_name'), named = [];
    tn.features.forEach((f, fi) => {
      if (f.type !== 2 || !f.tags.name) return; const hw = omtHighway(f.tags); if (!hw || hw === 'footway' || hw === 'steps') return;
      f.geom.forEach((P, pi) => { for (const Q of clipLine(P, tn.extent)) { named.push({ n: f.tags.name, Q, s: E / tn.extent }); els.push({ type: 'way', id: hid(tx, ty, 77, fi, pi, Q[0]), tags: { highway: hw, name: f.tags.name, dm_label: 1 }, geometry: geo(tn.extent, Q) }); } });
    });
    // parks, woods, water: outer rings with the holes that follow them
    for (const k of ['water', 'park', 'landcover', 'landuse']) {
      const ly = L(k);
      ly.features.forEach(f => {
        if (f.type !== 3) return; const tags = omtArea(k, f.tags); if (!tags) return;
        let rel = null;
        for (const P of f.geom) {
          if (P.length < 8) continue;
          if (ringArea(P) > 0 || !rel) { rel = { type: 'relation', id: 0, tags, members: [] }; els.push(rel); rel.members.push({ type: 'way', role: 'outer', geometry: geo(ly.extent, P) }); }
          else rel.members.push({ type: 'way', role: 'inner', geometry: geo(ly.extent, P) });
        }
      });
    }
    // buildings: one footprint per outer ring, kept by the tile its middle is in (so none is cut at the tile edge)
    const bl = L('building'), BE = bl.extent, bs = [], bgrid = new Map(), BG = 256;
    bl.features.forEach(f => {
      if (f.type !== 3) return;
      for (const P of f.geom) {
        if (P.length < 8 || ringArea(P) <= 0) continue;
        let sx = 0, sy = 0, x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; const m = P.length / 2 - 1;
        for (let i = 0; i < m * 2; i += 2) { sx += P[i]; sy += P[i + 1]; x0 = Math.min(x0, P[i]); x1 = Math.max(x1, P[i]); y0 = Math.min(y0, P[i + 1]); y1 = Math.max(y1, P[i + 1]); }
        sx /= m; sy /= m; if (sx < 0 || sy < 0 || sx >= BE || sy >= BE) continue;
        const id = hid(Math.round((tx * BE + sx) / 2), Math.round((ty * BE + sy) / 2)), b = { P, id, h: +f.tags.render_height || 0, area: ringArea(P) * (mpu * E / BE) ** 2, box: [x0, y0, x1, y1] };
        bs.push(b); els.push({ type: 'way', id, geometry: geo(BE, P) });
        for (let gx = Math.floor(x0 / BG); gx <= Math.floor(x1 / BG); gx++) for (let gy = Math.floor(y0 / BG); gy <= Math.floor(y1 / BG); gy++) { const gk2 = gx + ',' + gy; if (!bgrid.has(gk2)) bgrid.set(gk2, []); bgrid.get(gk2).push(b); }
      }
    });
    const bAt = (x, y) => { for (const b of bgrid.get(Math.floor(x / BG) + ',' + Math.floor(y / BG)) || []) { const [x0, y0, x1, y1] = b.box; if (x >= x0 - 2 && x <= x1 + 2 && y >= y0 - 2 && y <= y1 + 2 && (pip(x, y, b.P) || nearEdge(x, y, b.P, 3))) return b; } return null; };
    // shops and landmarks
    const po = L('poi');
    for (const f of po.features) {
      if (f.type !== 1 || !f.geom[0]) continue; const [x, y] = f.geom[0]; if (x < 0 || y < 0 || x >= po.extent || y >= po.extent) continue;
      const sc = f.tags.subclass || f.tags.class, tags = { amenity: sc, shop: sc }; if (f.tags.name) tags.name = f.tags.name;
      if (!typeOf(tags, '')) continue;
      els.push(Object.assign({ type: 'node', id: f.id || hid(tx, ty, x, y) }, ll(po.extent, x, y), { tags }));
    }
    // houses: an address point inside a building footprint; tall or big = apartments; the street is the nearest named one
    const hn = L('housenumber'), HE = hn.extent, used = new Set();
    for (const f of hn.features) {
      if (f.type !== 1 || !f.geom[0] || !f.tags.housenumber) continue; const [x, y] = f.geom[0]; if (x < 0 || y < 0 || x >= HE || y >= HE) continue;
      const b = bAt(x * BE / HE, y * BE / HE); if (!b || used.has(b.id)) continue; used.add(b.id);
      let best = 30 / mpu, street = '';   // within 30 m
      for (const r of named) { const d = segDist(x * E / HE, y * E / HE, r.Q, r.s); if (d < best) { best = d; street = r.n; } }
      const lv = b.h ? Math.max(1, Math.round(b.h / 3)) : 0, flats = lv >= 6 || b.area > 900;
      const tags = { building: flats ? 'apartments' : 'house', 'addr:housenumber': String(f.tags.housenumber).slice(0, 10) };
      if (lv >= 4) tags['building:levels'] = String(lv);   // brownstones (~3) get the usual mix of short and tall rows if (street) tags['addr:street'] = street;
      els.push(Object.assign({ type: 'way', id: b.id, center: ll(HE, x, y), tags }));
    }
    // 0.28.5 (owner: "Houses aren't refreshing as i walk on the map" - outside Brooklyn most buildings carry no house
    // number in the tiles, so almost none became houses): unnumbered buildings become houses too, named by the nearest
    // street ("House on Oakville Street"); about 1 in 3 of them (by id), so the map stays readable
    for (const b of bs) {
      if (used.has(b.id) || b.area < 35 || b.area > 2500 || b.id % 3) continue;
      let sx = 0, sy = 0; const m = b.P.length / 2 - 1; for (let i = 0; i < m * 2; i += 2) { sx += b.P[i]; sy += b.P[i + 1]; } sx /= m; sy /= m;
      let best = 40 / mpu, street = '';
      for (const r of named) { const d = segDist(sx * E / BE, sy * E / BE, r.Q, r.s); if (d < best) { best = d; street = r.n; } }
      if (!street) continue;   // off any named street: a shed, a garage, a park building
      const lv = b.h ? Math.max(1, Math.round(b.h / 3)) : 0, flats = lv >= 6 || b.area > 900;
      const tags = { building: flats ? 'apartments' : 'house', 'addr:street': street, name: (flats ? 'Apartments on ' : 'House on ') + street };
      if (lv >= 4) tags['building:levels'] = String(lv);
      els.push({ type: 'way', id: b.id, center: ll(BE, sx, sy), tags });
    }
    return els;
  }
  function tileYLat(y, n) { return Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n))) * 180 / Math.PI; }
  function nearEdge(x, y, P, d) { for (let i = 0; i + 3 < P.length; i += 2) if (segD(x, y, P[i], P[i + 1], P[i + 2], P[i + 3]) <= d) return true; return false; }
  function segD(x, y, ax, ay, bx, by) { const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy, t = l ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l)) : 0; return Math.hypot(x - ax - dx * t, y - ay - dy * t); }
  function segDist(x, y, Q, s) { let m = Infinity; for (let i = 0; i + 3 < Q.length; i += 2) m = Math.min(m, segD(x, y, Q[i] * s, Q[i + 1] * s, Q[i + 2] * s, Q[i + 3] * s)); return m; }
  // the square's share of its tiles: ways with a point in the box, places in the box
  async function fromTiles(cy, cx) {
    const s = cy * CELL - PAD, n = (cy + 1) * CELL + PAD, w = cx * CELL - PAD, e = (cx + 1) * CELL + PAD;
    const inB = p => p.lat >= s && p.lat <= n && p.lon >= w && p.lon <= e;
    const all = await Promise.all(tilesFor(cy, cx).map(([x, y]) => getTile(x, y)));
    const out = [];
    for (const els of all) for (const el of els) {
      if (el.type === 'node' ? inB(el) : el.center ? inB(el.center) : el.geometry ? el.geometry.some(inB) : el.members.some(m => m.geometry.some(inB))) out.push(el);
    }
    return out;
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
        if (tg && tg.highway) { const cls = roadCls(tg); if (cls < 0) continue; const a = q(el.geometry); if (a.length >= 4) r.push([el.id, cls, tg.name ? String(tg.name).slice(0, 40) : '', a, tg.dm_label ? 1 : 0]); continue; }
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
    for (const [id, cls, name, a, lo] of rec.r) {
      if (!own('r' + id)) continue;
      const P = pts(a), path = L.roads[cls];
      if (lo) { if (cls <= 2) L.labels.push({ n: name, P, cls }); continue; }   // 0.25: a tile street name (the road is drawn from its own line)
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
    // 0.25: OpenFreeMap tiles first (one go, ~0.3 s a tile); Overpass only when they fail
    try {
      const tEls = await fromTiles(cy, cx);
      M.busy = false; M.fails = 0; M.offline = false; M.src = 'tiles';
      const rec = encode(cy, cx, tEls, true);
      idb('cells', 'readwrite', st => st.put(rec)).then(() => touchCell(k));
      ingest(rec); M.cells[k] = 'ok'; M.partial = Object.values(M.cells).includes('part');
      if (M.msgKind === 'net') message();
      afterData(); pump(); return;
    } catch (e) { M.tileErr = (e && e.name === 'AbortError') ? 'timed out' : (e && e.message) || 'offline?'; }
    // 0.19.2: staged - places, then streets, then buildings by quarter; each stage shows up as soon as it arrives
    const els = []; let full = true, firstErr = '';
    const stage = async q => { const a = await ask(q); if (a.ok) { for (const e of a.els) els.push(e); return true; } firstErr = firstErr || a.err; full = false; return false; };
    const pl = await stage(qPlaces(bb));
    if (pl) ingest(encode(cy, cx, els, false));
    const st = await stage(qStreets(bb));
    if (st) { ingest(encode(cy, cx, els, false)); afterData(); }
    if (st) for (const qb of quarters(bb)) { if (await stage(qBuild(qb))) ingest(encode(cy, cx, els, false)); }
    M.busy = false;
    if (!pl && !st) { M.cells[k] = 'fail'; M.fails++; netTrouble(firstErr); pump(); return; }
    M.fails = 0; M.offline = false;
    const rec = encode(cy, cx, els, full);
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
    const rank = t => DM.Game.landmarkRank ? DM.Game.landmarkRank(t) : 1;
    let near = vis.filter(pl => pl.d <= reach && walkedTo(pl) && !DM.Game.landmarkHave(keyOf(pl))).sort((a, b) => rank(b.type) - rank(a.type) || a.d - b.d);   // 0.28.7: the best place first
    if (!DM.Game.landmarkLeft()) {   // 0.28.7: all 3 found - a better place still replaces the weakest one
      near = DM.Game.landmarkUpgrade ? near.filter(pl => DM.Game.landmarkUpgrade(pl.type)) : [];
      if (!near.length) { M.status = 'All 3 found today - a better place you reach will replace your weakest'; return; }
    }
    if (!near.length || M.jump) return;
    const pl = near[0], r = DM.Game.addLandmark({ key: keyOf(pl), type: pl.type, name: pl.name, street: pl.street });
    if (r === 'upgrade') pl.replaced = DM.Game.lastReplaced || 'your weakest';
    if ((r === 'ok' || r === 'upgrade') && M.pocket) { const el = $('#pkLast'); if (el) el.textContent = `${r === 'upgrade' ? 'Upgraded! ' : 'Got '}${pl.name}${pl.replaced ? ' (replaced ' + String(pl.replaced).split(' · ')[0] + ')' : ''}`; const pk = $('#mvPocket'); pk.classList.remove('flash'); void pk.offsetWidth; pk.classList.add('flash'); try { DM.E.SFX.play('pick'); setTimeout(() => DM.E.SFX.play('open'), 220); } catch (e) { /* ignore */ } }
    if (r === 'ok' || r === 'upgrade') {
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
    .mvintro .mvicard { max-height: 100%; overflow-y: auto; }
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
    .mvfx { position: absolute; left: 10px; right: 10px; bottom: calc(118px + var(--sb, 0px)); z-index: 6; display: grid; gap: 4px; pointer-events: none; }
    .mvfx .fxl { display: flex; justify-content: space-between; gap: 8px; padding: 6px 10px; border-radius: 10px; background: rgba(17,20,47,.88); border: 2px solid #3d2d61; font-size: 12px; color: #f6e3bb; }
    .mvfx .fxl.hot { border-color: #f0c23d; } .mvfx .fxl.tap { pointer-events: auto; cursor: pointer; } .mvfx .fxl.tap:active { background: rgba(61,45,97,.95); } .mvfx .fxl span { color: #9d90bf; font-weight: 800; white-space: nowrap; }
    .mvfx .fxb { display: flex; gap: 6px; pointer-events: auto; } .mvfx .fxb button { flex: 1; padding: 6px 8px; border-radius: 10px; background: rgba(17,20,47,.88); border: 2px solid #5a4a86; color: #f6e3bb; font: 800 11px Inter, system-ui, sans-serif; }
    .mvpocket .pkline.fx { color: #b0a060; font-size: 14px; }
    .mvpocket { position: absolute; inset: 0; z-index: 30; display: none; place-items: center; background: #020208; color: #6a6090; touch-action: none; -webkit-user-select: none; user-select: none; }
    .mvpocket.on { display: grid; } .mvpocket .pk { text-align: center; padding: 24px; max-width: 360px; }
    .mvpocket .pkk { font-size: 12px; letter-spacing: .12em; text-transform: uppercase; font-weight: 900; color: #7a4a2a; }
    .mvpocket .pkbig { font-size: 72px; font-weight: 900; color: #8a6040; line-height: 1; margin-top: 10px; } .mvpocket .pksub { font-size: 13px; margin-bottom: 18px; }
    .mvpocket .pkline { font-size: 16px; font-weight: 800; color: #7a70a0; margin: 6px 0; } .mvpocket .pkline.dim { font-size: 13px; opacity: .8; } .mvpocket .pkline.last { color: #8aa070; min-height: 20px; }
    .mvpocket .pkhelp { font-size: 12px; line-height: 1.4; opacity: .7; margin: 18px 0; }
    .mvpocket .pkexit { position: relative; overflow: hidden; width: 200px; height: 52px; border-radius: 26px; border: 2px solid #3a3058; background: #0c0a18; color: #7a70a0; font: 900 15px Inter, system-ui, sans-serif; touch-action: none; }
    .mvpocket .pkexit i { position: absolute; left: 0; top: 0; bottom: 0; width: 0; background: #2a2048; }
    .mvpocket .pkexit.hold i { width: 100%; transition: width 1.1s linear; } .mvpocket .pkexit span { position: relative; }
    .mvpocket.flash { animation: pkflash 1.2s ease-out; } @keyframes pkflash { 0% { background: #2a3a1a; } 100% { background: #020208; } }
    .mvtop .mvpk { font-size: 20px; margin-right: 6px; }
    .hname em.lmk { display: inline-flex; align-items: center; gap: 3px; } .hname em.lmk svg { color: var(--ink); }`;
    document.head.appendChild(st);
    const el = document.createElement('div'); el.id = 'mapv';
    el.innerHTML = `<div class="mvtop"><button id="mvBack">&lsaquo; Back</button><div class="mvt"><b>MAP</b><span id="mvTopSub">Your real streets</span></div><button id="mvPocketB" class="mvq mvpk" aria-label="Pocket mode">🚶</button><button id="mvHomeB" class="mvq" aria-label="My home spot">🏠</button><button id="mvHelp" class="mvq" aria-label="What is the map?">?</button></div>
      <div id="mvMap"><canvas id="mvCv"></canvas><div id="mvPill" class="mvpill"><i></i><span></span></div><div id="mvBanner" class="mvbanner"></div><div id="mvTip" class="mvtip"></div>
        <div class="mvzoom"><button id="mvZin" aria-label="Zoom in">+</button><button id="mvZout" aria-label="Zoom out">&minus;</button></div>
        <button id="mvMe" class="mvme" aria-label="Back to me"><svg width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="7" fill="none" stroke="#f6e3bb" stroke-width="2.6"/><circle cx="12" cy="12" r="3" fill="#f07b3c"/><path d="M12 1v4M12 19v4M1 12h4M19 12h4" stroke="#f6e3bb" stroke-width="2.6" stroke-linecap="round"/></svg></button>
        <div class="mvattr">OpenFreeMap &copy; OpenMapTiles · &copy; OpenStreetMap contributors</div><div id="mvMsg" class="mvmsg"></div></div>
      <div class="mvcard" id="mvCard"><div class="mvprog"><span class="mvpips" id="mvPips"></span><span id="mvLeft"></span></div>
        <div class="mvnext"><span class="arr" id="mvArr"><svg width="18" height="18" viewBox="0 0 18 18"><path d="M9 1.5l6 13-6-3.4-6 3.4z" fill="#11142f"/></svg></span><img class="ico" id="mvIco" alt=""><div><span id="mvStat">Finding you...</span><span id="mvSub2"></span></div><em id="mvDist"></em></div></div>
      <div id="mvFx" class="mvfx"></div>
      <div id="mvIntro" class="mvintro"></div>
      <div id="mvPocket" class="mvpocket"><div class="pk"><div class="pkk">Pocket mode · scouting</div><div class="pkbig" id="pkFound">0 / 3</div><div class="pksub">landmarks today</div>
        <div class="pkline" id="pkNext"></div><div class="pkline fx" id="pkFx"></div><div class="pkline dim" id="pkWalk"></div><div class="pkline last" id="pkLast"></div>
        <p class="pkhelp">Keep walking - places are claimed as you pass, and better ones replace your weakest. Screen stays on (dimmed); pocket touches do nothing.</p>
        <button id="pkExit" class="pkexit"><i></i><span>Hold to exit</span></button></div></div>`;
    document.body.appendChild(el);
    $('#mvBack').onclick = close;
    // 0.28.8 (owner: "the map autoclaim should work even if we don't have it open. Or change it to be something we can
    // actually use while walking"): a web page gets no location while closed or locked, so: Pocket mode - a nearly
    // black, touch-locked screen that stays awake and keeps claiming; the map stops drawing to save battery.
    $('#mvPocketB').onclick = () => pocket(true);
    { const b = $('#pkExit'); let t = 0; const down = e => { e.preventDefault(); b.classList.add('hold'); t = setTimeout(() => { b.classList.remove('hold'); pocket(false); }, 1100); };
      const up = () => { clearTimeout(t); b.classList.remove('hold'); }; b.addEventListener('pointerdown', down); b.addEventListener('pointerup', up); b.addEventListener('pointerleave', up); b.addEventListener('pointercancel', up); }
    $('#mvPocket').addEventListener('pointerdown', e => { if (!e.target.closest('#pkExit')) e.preventDefault(); });
    $('#mvHomeB').onclick = () => { DM.E.SFX && DM.E.SFX.play && DM.E.SFX.play('ui'); homeAsk(true); };
    $('#mvHelp').onclick = () => { DM.E.SFX && DM.E.SFX.play && DM.E.SFX.play('ui'); intro(true); };
    $('#mvMe').onclick = () => { M.follow = true; $('#mvMe').classList.remove('on'); };
    $('#mvZin').onclick = () => zoomBy(1.4); $('#mvZout').onclick = () => zoomBy(1 / 1.4);
    const cv = $('#mvCv');
    cv.addEventListener('pointerdown', pdown); cv.addEventListener('pointermove', pmove); cv.addEventListener('pointerup', pup); cv.addEventListener('pointercancel', pup);
    cv.addEventListener('wheel', e => { e.preventDefault(); zoomAt(e.offsetX, e.offsetY, e.deltaY < 0 ? 1.15 : 1 / 1.15); }, { passive: false });
    addEventListener('resize', () => { if (M.on) size(); });
    // 0.28.8: the phone drops the screen-awake lock whenever the page is hidden - ask again when it comes back
    document.addEventListener('visibilitychange', () => { if (M.on && document.visibilityState === 'visible' && navigator.wakeLock) navigator.wakeLock.request('screen').then(w => { M.wake = w; }).catch(() => { }); });
    addEventListener('online', () => { if (M.on && (M.offline || M.fails)) { M.offline = false; retry(); } });
  }
  function message(title, body, btn, fn, kind) {
    const e = $('#mvMsg'); if (!e) return;
    if (!title) { e.classList.remove('on'); M.msgKind = ''; return; }
    M.msgKind = kind || '';
    e.innerHTML = `<b>${title}</b>${body}${btn ? `<br><button id="mvMsgBtn">${btn}</button>` : ''}`; e.classList.add('on');
    if (btn) $('#mvMsgBtn').onclick = fn;
  }
  function homeAsk(byTap) {
    const hs = homes(), ok = t => !t || Date.now() - t >= HOME_MOVE_MS, close = () => message();
    if (!M.pos) { if (byTap) message('Home spots', 'Waiting for your location first.', 'OK', close, 'home'); return; }
    if (M.pos.acc > 60) { if (byTap) message('Home spots', `GPS is fuzzy right now (about ${Math.round(M.pos.acc)} m). Try again by a window.`, 'OK', close, 'home'); return; }
    const save = (list, msg) => { lsSet(HOME_KEY, list); message(); M.status = msg; M.dirty = true; renderCard(); claim(); };
    const here = { lat: +M.pos.lat.toFixed(4), lon: +M.pos.lon.toFixed(4), t: Date.now() };
    const rule = `Within ${HOME_R} m of a home spot you need a ${WALK_OK} m walk with the map open before places count. Everywhere else a place counts the moment you reach it.`;
    if (!hs.length) {
      message('Are you at home?', `Set your home spot here (it stays on this phone). ${rule} Spots where you open the map on ${LEARN_DAYS}+ different days count as home too.<br><button id="mvHomeNo" style="background:transparent;box-shadow:none;border:2px solid currentColor;color:inherit;opacity:.8">Not now</button>`,
        'Yes, I\'m home - set it here', () => save([here], 'Home spot set - away from home, places count as soon as you reach them'), 'home');
      const no = $('#mvHomeNo'); if (no) no.onclick = () => { M.homeNo = 1; message(); };
      return;
    }
    const inZone = zones().find(h => dist(h, M.pos) < HOME_R), nearest = Math.min(...hs.map(h => dist(h, M.pos)));
    const where = inZone ? (inZone.learned ? 'You are in a spot you open the map in a lot, so it counts as home.' : 'You are in a home zone.') : `You are ${fmtD(nearest)} from your nearest home spot.`;
    const extra = [];
    if (!inZone && hs.length < 2) extra.push(['mvHomeAdd', 'Add here as 2nd home', () => save(hs.concat([here]), '2nd home spot set')]);
    if (!inZone && hs.length === 2) { const old = hs.reduce((a, b) => ((a.t || 0) < (b.t || 0) ? a : b)); if (ok(old.t)) extra.push(['mvHomeMove', 'Move my oldest home spot here', () => save(hs.filter(h => h !== old).concat([here]), 'Home spot moved')]); }
    const wait = hs.length === 2 && !inZone && !extra.length ? ` You can move a home spot again in ${Math.ceil((HOME_MOVE_MS - (Date.now() - Math.min(...hs.map(h => h.t || 0)))) / 864e5)} days.` : '';
    message('Your home spots', `${where} ${hs.length} of 2 home spots set. ${rule}${wait}${extra.map(([id, t]) => `<br><button id="${id}">${t}</button>`).join('')}`, 'OK', close, 'home');
    for (const [id, , fn] of extra) { const b = $('#' + id); if (b) b.onclick = fn; }
  }
  // 0.30.4 (owner: "explain the routes and map better for new players"): a 3-page guide - places, home spots, map jobs.
  // Shown once (new key, so players who saw the old 1-page intro see this once too); the ? button reopens it.
  function intro(force) {
    let seen = 0, seenCamps = 0; try { seen = localStorage.getItem(INTRO_KEY + '2'); seenCamps = localStorage.getItem(INTRO_KEY + '-camps'); } catch (e) { /* ignore */ }
    if (seen && seenCamps && !force) return;
    const campsOnly = !!seen && !seenCamps && !force;   // 0.72.8: players who already saw the intro get just the new camps page
    const e = $('#mvIntro'), li = (ic, t) => `<li><i${ic.o ? ' class="o"' : ''}>${ic.h}</i><span>${t}</span></li>`, img = k => ({ h: `<img alt="" src="${iconURL(k)}">` }), em = c => ({ h: c });
    const pages = [
      ['Your real streets', 'This is your real neighbourhood', 'Walk to real places with the map open and they become bonus houses to loot.', [
        li(img('pharmacy'), `<b>Real places show up as badges:</b> pharmacies, corner stores, schools, the police station. Small house icons are homes on your street.`),
        li(Object.assign(img('bodega'), { o: 1 }), `<b>Get within about ${CLAIM_M} m</b> and it glows, then joins your Houses tab with its real name. Go loot it whenever you like.`),
        li(em('3'), `<b>3 a day, on foot.</b> Cars and buses don't count. Once you have 3, a better place you reach replaces your weakest one.`),
        li(em('🔒'), `<b>Your location stays on this phone,</b> only while the map is open. It is never saved or sent.`)]],
      ['Home spots', 'No scouting from the couch', 'The map asks once if you are at home. That keeps it fair.', [
        li(em('🏠'), `<b>Near home (${HOME_R} m):</b> you need to walk about ${WALK_OK} m with the map open before places count.`),
        li(em('🚶'), `<b>Away from home:</b> a place counts the moment you walk up to it.`),
        li(em('2'), `<b>Two home spots,</b> for example your place and a partner's. Tap 🏠 at the top to add or check them.`),
        li(em('⭕'), `<b>The game also learns:</b> a spot you open the map in on ${LEARN_DAYS} different days counts as home too (faint ring).`)]],
      ['While you walk', 'Jobs on the map', 'Keep the map open on a walk and things happen. Everything goes to your stash.', [
        li(em('📦'), `<b>Supply crates:</b> 3 a day at real places nearby. Walk to one to grab it. After 300 m walked an <b>air drop</b> lands, but only for 20 minutes.`),
        li(em('📻'), `<b>Radio calls:</b> a survivor names a place and a time limit. Get there in time for caps, XP and supplies.`),
        li(em('🚚'), `<b>Dot's deliveries:</b> pick up a package at one place, carry it to another.`),
        li(em('🪖'), `<b>Strange places:</b> army checkpoints, crashed helicopters, survivor camps, zombie nests and more sit next to real buildings. They move every Monday. Up to 8 a day, so it never turns into a chore.`),
        li(em('🌫️'), `<b>Fog:</b> the map is foggy where you have never walked. Clearing it gives XP and small finds.`),
        li(em('🚶'), `<b>Pocket mode</b> (walking button, top right): a dark, battery-saving screen so you can walk with the phone in your pocket. Keep the screen on.`)]],
      // 0.72.8 (owner: "my friend ... didn't know the campsites existed in the maps"; "I don't even know where to use my tribute points")
      ['Camps', 'Raid a camp, take it for everyone', 'There are 12 enemy camps, and every player has them hidden in their own neighbourhood. Take one and it is yours - for everyone.', [
        li(em('🏴'), `<b>Red flags are enemy camps.</b> Green ones are yours. Blue ones belong to other players.`),
        li(em('🚶'), `<b>Walk there with the map open.</b> Within about 40 m it asks if you want to raid. Party mates who come along fight beside you.`),
        li(em('⚔️'), `<b>Kill every raider inside</b> and the camp is yours. Other players can take it back the same way - walk out and fortify yours once a day.`),
        li(em('🪙'), `<b>Each camp you hold pays tribute marks every day.</b> Collect them and spend them in the <b>War chest</b>: home screen → <b>Camps</b> → War chest (extra backpack and stash slots, plated armor, Masterwork weapons).`)]],
    ];
    let pg = campsOnly ? pages.length - 1 : 0;
    const draw = () => {
      const [k, h, p, items] = pages[pg], last = pg === pages.length - 1;
      e.innerHTML = `<div class="mvicard"><div class="kick">${campsOnly ? 'New · ' + k : `${k} · ${pg + 1}/${pages.length}`}</div><h3>${h}</h3><p>${p}</p><ul>${items.join('')}</ul>
        <div style="display:flex;gap:10px;margin-top:12px">${pg && !campsOnly ? '<button class="mbtn ghost" id="mvIntroBack" style="flex:1">Back</button>' : ''}<button class="mbtn" id="mvIntroGo" style="flex:2">${last ? 'Let\'s walk' : 'Next'}</button></div></div>`;
      $('#mvIntroGo').onclick = () => { DM.E.SFX && DM.E.SFX.play && DM.E.SFX.play('ui'); if (!last) { pg++; draw(); return; } try { localStorage.setItem(INTRO_KEY + '2', '1'); localStorage.setItem(INTRO_KEY, '1'); localStorage.setItem(INTRO_KEY + '-camps', '1'); } catch (x) { /* ignore */ } e.classList.remove('on'); if (M.pos && !home() && !M.homeNo && !M.msgKind) { M.homeAsked = 1; homeAsk(false); } };
      if ($('#mvIntroBack')) $('#mvIntroBack').onclick = () => { pg--; draw(); };
    };
    draw(); e.classList.add('on');
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
    e.innerHTML = `<span class="bdg"><img alt="" src="${iconURL(pl.type)}"></span><div><span class="kick">${pl.replaced ? 'Upgraded! Replaced ' + esc(String(pl.replaced).split(' · ')[0]) : 'Added to your houses'}</span><b>${place}</b><span>${DM.D.BTYPES[pl.type].n} &middot; loot it from the Houses tab</span></div>`;
    e.classList.add('on'); clearTimeout(M.bannerT); M.bannerT = setTimeout(nextBanner, M.bq.length ? 3200 : 5000);
  }
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtD = d => d < 1000 ? Math.max(5, Math.round(d / 5) * 5) + ' m' : (d / 1000).toFixed(1) + ' km';
  // 0.29: the map's jobs (mapfx.js) under the card: what is out there, how far, how long; Dot's delivery; fog on/off
  function focusOn(lat, lon, label) {
    if (!O.set) return;
    M.follow = false; $('#mvMe').classList.add('on');
    M.cam.x = wx(lon); M.cam.y = wy(lat); M.ping = { lat, lon, t: performance.now() }; M.dirty = true;
    DM.E.SFX && DM.E.SFX.play && DM.E.SFX.play('ui');
    if (label) message('', ''), DM.E.toast && DM.E.toast(`${label} - tap the target button to come back to you`, 2.6);
  }
  function renderFx() {
    const el = $('#mvFx'); if (!el || !DM.MapFX) return;
    const ls = DM.MapFX.lines(M.pos), off = DM.MapFX.canOffer();
    const key = JSON.stringify([ls, off, DM.MapFX.fogOn(), DM.MapFX.cells(), DM.MapQ && DM.MapQ.active(), DM.MapFX.stamps && DM.MapFX.stamps()]); if (key === M.fxKey) return; M.fxKey = key;
    el.innerHTML = ls.map((l, i) => `<div class="fxl${l.hot ? ' hot' : ''}${l.lat != null ? ' tap' : ''}" data-fx="${i}"><b>${esc(l.t)}</b><span>${esc(l.s)}${l.lat != null ? ' ›' : ''}</span></div>`).join('')
      + `<div class="fxb">${DM.MapQ && DM.MapQ.active() ? '<button id="fxQuit">✕ Drop quest</button>' : ''}${off ? '<button id="fxDeliv">🚚 Dot\'s delivery</button>' : ''}<button id="fxFog">🌫️ Fog ${DM.MapFX.fogOn() ? 'on' : 'off'} · ${DM.MapFX.cells().toLocaleString('en-US')} cleared · 📮 ${DM.MapFX.stamps ? DM.MapFX.stamps() : 0}</button></div>`;
    // 0.46.3 (owner: "if I click one of the quests ... it should show me where on the map"): tap a line -> the map flies there
    el.querySelectorAll('[data-fx]').forEach(row => row.onclick = () => { const l = ls[+row.dataset.fx]; if (l && l.lat != null) focusOn(l.lat, l.lon, l.t); });
    const d = $('#fxDeliv'); if (d) d.onclick = () => { DM.MapFX.offer(M.pos); M.fxKey = ''; renderFx(); };
    { const q = $('#fxQuit'); if (q) { let sure = 0; q.onclick = () => { if (!sure) { sure = 1; q.textContent = 'Tap again to drop it'; return; } DM.MapQ.drop(); M.fxKey = ''; renderFx(); }; } }
    $('#fxFog').onclick = () => { DM.MapFX.toggleFog(); M.fxKey = ''; M.dirty = true; renderFx(); };
  }
  function renderCard() {
    renderFx();
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
        line = t.name; sub = `${DM.D.BTYPES[t.type].n} - ` + (t.d <= reach && !walkedTo(t) ? `right here - walk ${Math.max(5, Math.ceil(WALK_OK - (M.walkedM || 0)))} m more (anywhere) to scout it` : t.d <= reach * 2.2 ? 'almost there - keep walking' : 'nearest place to scout');
      }
    }
    $('#mvStat').textContent = line; $('#mvSub2').textContent = sub; $('#mvDist').textContent = dd;
    arr.classList.toggle('on', ang != null); if (ang != null) arr.querySelector('svg').style.transform = `rotate(${Math.round(ang)}deg)`;
    ico.classList.toggle('on', !!show && ang == null); if (show) ico.src = iconURL(show.type);
    { const v = visible(), nb = v.filter(p => !p.house).length, nh = v.filter(p => p.house).length; $('#mvTopSub').textContent = M.pos ? `${nb} place${nb === 1 ? '' : 's'} · ${nh} house${nh === 1 ? '' : 's'} nearby` : 'Your real streets'; }
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
    clearInterval(M.cardT); M.cardT = setInterval(() => { if (M.on) { if (M.pos) claim(); renderCard(); pocketCard(); } }, 1000);
  }
  function pocket(on) {
    M.pocket = on; const el = $('#mvPocket'); if (!el) return;
    el.classList.toggle('on', on);
    if (on) { try { if (DM.E.SFX && DM.E.SFX.init) DM.E.SFX.init(); } catch (e) { /* ignore */ } pocketCard(); }
    else { M.dirty = true; renderCard(); }
  }
  function pocketCard() {
    if (!M.pocket) return;
    const left = DM.Game.landmarkLeft(), found = 3 - left, t = M.pos ? target() : null;
    $('#pkFound').textContent = `${found} / 3`;
    $('#pkNext').textContent = M.status ? M.status : !M.pos ? 'Finding you...' : t ? `Next: ${t.name} · ${fmtD(t.d)}` : 'Nothing to scout nearby - keep walking';
    { const ls = DM.MapFX && M.pos ? DM.MapFX.lines(M.pos) : []; $('#pkFx').textContent = ls.length ? ls.slice(0, 2).map(l => `${l.t} · ${l.s}`).join('  |  ') : ''; }
    $('#pkWalk').textContent = M.pos && !nearHome(M.pos) ? 'Away from home - places count as soon as you reach them' : (M.walkedM || 0) < WALK_OK ? `Walk ${Math.ceil(WALK_OK - (M.walkedM || 0))} m more to start scouting` : `${Math.round(M.walkedM)} m walked with the map open`;
  }
  function close() {
    pocket(false);
    M.on = false; const v = $('#mapv'); if (v) v.classList.remove('on');
    if (M.watch != null) { try { navigator.geolocation.clearWatch(M.watch); } catch (e) { /* ignore */ } M.watch = null; }
    if (M.wake) { try { M.wake.release(); } catch (e) { /* ignore */ } M.wake = null; }
    clearTimeout(M.retryT); M.retryT = null; clearInterval(M.cardT); cancelAnimationFrame(M.raf);
    M.pos = null; M.guess = null; M.spd = []; M.far = {}; M.walkedM = 0; M.lastMe = null; M.zs = []; M.learnt = 0; M.homeAsked = 0;   // her position is forgotten as soon as the map closes
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
    const first = !M.pos;
    // 0.28.6 (owner: "Nothing happens" at a bodega after walking away and back): count the distance she really walks
    // with the map open (good fixes only, ignoring GPS wobble); after WALK_OK metres every place counts as walked-to
    if (M.pos && pos.acc <= 40) { const d = dist(M.pos, pos); if (d > Math.max(6, pos.acc * .5) && d < 120) M.walkedM = (M.walkedM || 0) + d; }
    M.pos = pos; M.gpsMsg = ''; M.guess = null;
    if (first && DM.Weather) DM.Weather.noteArea(pos.lat, pos.lon);   // 0.22: weather.js keeps only the 0.1-degree area (~10 km), on this phone
    setOrigin(pos.lat, pos.lon);
    if (first && M.msgKind === 'gps') message();
    if (pos.acc <= 60 && !M.learnt) { M.learnt = 1; learnSpot(pos); }   // 0.30.3: learned home zones
    if (!home() && !M.homeNo && !M.homeAsked && pos.acc <= 60 && !M.msgKind && !$('#mvIntro').classList.contains('on')) { M.homeAsked = 1; homeAsk(false); }   // 0.30.2: once per map visit until set
    fetchAround(pos, true);
    claim(); renderCard();
    if (DM.MapFX) { DM.MapFX.onPos(pos, M.walkedM || 0); pocketCard(); }   // 0.29: drops, radio calls, deliveries, fog
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
    if (M.pocket) return;   // 0.28.8: nothing to draw under the pocket screen
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
    if (DM.MapFX) DM.MapFX.drawFog(x, SX, SY, wx, wy, M.W, M.H);   // 0.29: fog of war (unwalked squares)
    if (O.set && homes().length) for (const h of zones()) {   // 0.30.2: home zones - a dashed ring (learned ones fainter) and a little house
      const hx = SX(wx(h.lon)), hy = SY(wy(h.lat)), hr = HOME_R * c.s;
      if (hx < -hr || hy < -hr || hx > M.W + hr || hy > M.H + hr) continue;
      x.save(); x.setLineDash([10, 8]); x.lineWidth = 3; x.strokeStyle = h.learned ? 'rgba(240,123,60,.35)' : 'rgba(240,123,60,.7)'; x.fillStyle = 'rgba(240,123,60,.06)';
      x.beginPath(); x.arc(hx, hy, hr, 0, 6.3); x.fill(); x.stroke(); x.setLineDash([]);
      if (!h.learned) { x.font = '22px system-ui'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('🏠', hx, hy); }
      x.restore();
    }
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
    if (DM.MapFX) DM.MapFX.drawMarks(x, t, SX, SY, wx, wy);
    if (M.ping) { const age = (performance.now() - M.ping.t) / 1000; if (age > 5) M.ping = null; else { const px = SX(wx(M.ping.lon)), py = SY(wy(M.ping.lat)) - 20; for (let k = 0; k < 2; k++) { const a = ((age * 1.4 + k * .5) % 1); x.beginPath(); x.arc(px, py, 18 + a * 46, 0, 6.3); x.strokeStyle = `rgba(240,123,60,${(1 - a) * .9})`; x.lineWidth = 4; x.stroke(); } } }   // 0.46.3: where you tapped   // 0.29: crates, air drops, radio calls, Dot's delivery
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
    const left = DM.Game.landmarkLeft(), can = p && !driveLock() && p.acc <= MAX_ACC;   // 0.28.7: with 0 left, only upgrades glow
    for (const pl of list) {
      const sx = SX(wx(pl.lon)), sy = SY(wy(pl.lat));
      if (sx < -40 || sx > M.W + 40 || sy < -40 || sy > M.H + 40) continue;
      const have = DM.Game.landmarkHave(keyOf(pl)), d = p ? dist(pl, p) : 1e9;
      const hot = !have && can && d <= reach && walkedTo(pl) && (left > 0 || !!(DM.Game.landmarkUpgrade && DM.Game.landmarkUpgrade(pl.type))), near = !have && !hot && d <= reach * 2.2 && (!pl.house || pl === tgt);
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

  // 0.22: for weather.js - the ~0.1-degree area of the square the map last showed (map users from before 0.22), or null
  const lastArea = () => getMeta('last').then(k => { const m = /^(-?\d+):(-?\d+)$/.exec(String(k || '')); return m ? { lat: Math.round((+m[1] + .5) * CELL * 10) / 10, lon: Math.round((+m[2] + .5) * CELL * 10) / 10 } : null; });
  DM.Map = { open, close, lastArea, home,   // 0.72.7: home is the spot she saved herself (camps line on the home screen)
    get on() { return M.on; }, _M: M, _typeOf: typeOf, _O: O, _tiles: { fromTiles, encode, cellOf },
    get timing() { return { firstDraw: M.tFirst, data: M.tData, render: M.renderMs }; } };
  if (DM.ready && DM.Game && DM.Game.renderHome) DM.Game.renderHome();   // show the Map tab if the home screen drew first
})();
