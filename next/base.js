/* Dead Miles (next) - the personal base: a yard + a small shack you walk around in (it runs on the house runtime,
   DM.House, with the hooks noted there), build pieces bought with build steps + materials, a garden, decor you place,
   and the watch shift for party horde night.
   Save data lives in SV.base and SV.horde (see norm()); everything is added with defaults, nothing is renamed. */
'use strict';
(() => {
  const D = DM.D, E = DM.E, P = ART.P, $ = E.$, SFX = E.SFX, toast = E.toast, T = E.T;
  const B = DM.Base = {};
  const H = DM.Horde;
  const POOL_MAX = 60000, WATER = 300;
  const G = () => DM.Game, SV = () => DM.Game.data();
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = k => `<img alt="" src="${ART.iconURL[D.ITEMS[k].i]}">`;
  const fmt = n => Math.round(n).toLocaleString('en-US');
  const dayNo = () => { const d = new Date(); return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5); };

  // ---------------------------------------------------------------- pieces
  // steps + materials per tier; def = defence it adds at that tier
  const PIECES = B.PIECES = {
    walls: { n: 'Walls', d: 'A ring around the yard. Zombies have to break through.', tiers: [
      { n: 'Wood fence', s: 3000, m: { wood: 8, nails: 16 }, def: 20, hp: 180 },
      { n: 'Scrap wall', s: 6000, m: { scrap: 10, nails: 16, wood: 4 }, def: 40, hp: 330 },
      { n: 'Reinforced wall', s: 12000, m: { scrap: 18, tape: 4, nails: 20 }, def: 65, hp: 500 }] },
    gate: { n: 'Gate', d: 'Closes the gap in the south wall.', need: ['walls', 1], tiers: [
      { n: 'Wood gate', s: 1500, m: { wood: 4, nails: 8 }, def: 6, hp: 240 },
      { n: 'Scrap gate', s: 3000, m: { scrap: 6, nails: 8 }, def: 12, hp: 400 },
      { n: 'Steel gate', s: 6000, m: { scrap: 10, tape: 3 }, def: 20, hp: 600 }] },
    tower: { n: 'Watchtower', d: 'See them coming: on a watch shift, arrows point at zombies off screen.', tiers: [
      { n: 'Watchtower', s: 5000, m: { wood: 10, nails: 16, tape: 2 }, def: 10 }] },
    spikes: { n: 'Spike traps', d: 'Sharpened stakes outside the walls. Zombies that walk in get hurt.', tiers: [
      { n: 'Spikes: south side', s: 1500, m: { wood: 3, nails: 10 }, def: 5 },
      { n: 'Spikes: north side', s: 2500, m: { wood: 4, nails: 14 }, def: 5 },
      { n: 'Spikes: east + west', s: 4000, m: { scrap: 4, nails: 16 }, def: 5 }] },
    wire: { n: 'Barbed wire', d: 'Slows zombies down and scratches them up.', tiers: [
      { n: 'Wire: south side', s: 2000, m: { scrap: 3, nails: 6 }, def: 5 },
      { n: 'Wire: north side', s: 3000, m: { scrap: 4, tape: 1 }, def: 5 },
      { n: 'Wire: east + west', s: 4500, m: { scrap: 6, tape: 2 }, def: 5 }] },
    barrel: { n: 'Rain barrel', d: 'Collects a charge of water every day (up to 3). One charge waters one plant.', unit: 1, tiers: [
      { n: 'Rain barrel', s: 1200, m: { scrap: 3, tape: 1 }, def: 0 }, { n: 'Second barrel', s: 1200, m: { scrap: 3, tape: 1, wood: 2 }, def: 0 }] },
    beds: { n: 'Garden bed', d: 'Plant seeds you find while looting. Water them every day.', unit: 1, tiers: [
      { n: 'Garden bed 1', s: 800, m: { wood: 3, nails: 4 }, def: 0 }, { n: 'Garden bed 2', s: 800, m: { wood: 3, nails: 4 }, def: 0 },
      { n: 'Garden bed 3', s: 1000, m: { wood: 3, nails: 6 }, def: 0 }, { n: 'Garden bed 4', s: 1000, m: { wood: 3, nails: 6 }, def: 0 }] },
    bunks: { n: 'Bunk bed', d: 'Room in the shack for one more crew member (you start with 2 bunks).', unit: 1, tiers: [
      { n: 'Third bunk', s: 2500, m: { wood: 6, nails: 10, cloth: 3 }, def: 0 }, { n: 'Fourth bunk', s: 4000, m: { wood: 8, nails: 14, cloth: 4 }, def: 0 }] },
    gen: { n: 'Generator', d: 'Floodlight over the yard (+defence). More perks later.', tiers: [
      { n: 'Generator', s: 8000, m: { scrap: 12, battery: 6, tape: 3 }, def: 5 }] },
  };
  const ORDER = ['walls', 'gate', 'spikes', 'wire', 'tower', 'beds', 'barrel', 'bunks', 'gen'];
  const mech = () => G().survivor && G().survivor.job === 'mechanic';
  function costOf(key, tier, repair) { // tier: 1-based tier being built
    const t = PIECES[key].tiers[tier - 1], k = (mech() ? .75 : 1) * (repair ? .3 * (DM.Crew ? DM.Crew.repairMul() : 1) : 1), m = {};   // a Tinkerer in the crew makes repairs cheaper
    for (const i in t.m) m[i] = Math.max(1, Math.ceil(t.m[i] * k));
    return { s: Math.ceil(t.s * k / 50) * 50, m };
  }

  // ---------------------------------------------------------------- save data
  B.norm = function (b, st) {
    b = b && typeof b === 'object' ? b : {};
    if (typeof b.pool !== 'number' || !isFinite(b.pool)) { // first time: today's steps so far start the pool
      const d = st && st.day; b.pool = d ? Math.min(POOL_MAX, Math.round((d.phone || 0) + (d.walk || 0) + (d.typed || 0) * .5)) : 0;
    }
    b.v = b.v || 1;
    b.built = Object.assign({ walls: 0, gate: 0, tower: 0, spikes: 0, wire: 0, barrel: 0, beds: 0, gen: 0, bunks: 0 }, b.built || {});
    b.broken = b.broken && typeof b.broken === 'object' ? b.broken : {};
    b.beds = Array.isArray(b.beds) ? b.beds : [];
    while (b.beds.length < 4) b.beds.push(null);
    b.water = b.water && typeof b.water === 'object' ? b.water : { n: 0, d: dayNo() };
    b.decor = Array.isArray(b.decor) ? b.decor.filter(o => o && D.DECOR[o.k]) : [];
    b.box = b.box && typeof b.box === 'object' ? b.box : {};
    b.seq = b.seq || 0; b.gateOpen = !!b.gateOpen;
    return b;
  };
  B.normHorde = function (h) {
    h = h && typeof h === 'object' ? h : {};
    h.weeks = h.weeks && typeof h.weeks === 'object' ? h.weeks : {};
    h.pending = Array.isArray(h.pending) ? h.pending : [];
    h.resolved = h.resolved && typeof h.resolved === 'object' ? h.resolved : {};
    if (!h.since) { const n = H.next(); h.since = n ? n.week : ''; } // only horde nights from now on are resolved for this survivor
    const ks = Object.keys(h.resolved).sort(); while (ks.length > 8) delete h.resolved[ks.shift()];
    const ws = Object.keys(h.weeks).sort(); while (ws.length > 8) delete h.weeks[ws.shift()];
    return h;
  };
  B.addPool = function (st, n) { if (!st || !st.base || !(n > 0)) return; st.base.pool = Math.min(POOL_MAX, st.base.pool + n); };
  const base = () => SV().base;

  B.defense = function (b = base()) {
    let d = 0;
    if (b.built.walls) { const ids = wallIds(), ok = ids.filter(i => !b.broken[i]).length; d += PIECES.walls.tiers[b.built.walls - 1].def * ok / ids.length; }
    for (const k of ['gate', 'tower', 'gen']) if (b.built[k] && !b.broken[k]) d += PIECES[k].tiers[b.built[k] - 1].def;
    for (const k of ['spikes', 'wire']) if (b.built[k] && !b.broken[k]) d += 5 * b.built[k];
    if (DM.Crew && b === base()) d += DM.Crew.guardDef();   // Guards in the crew stand watch on horde night
    return Math.round(d);
  };

  // ---------------------------------------------------------------- water + garden
  function barrels() { // refill: one charge per barrel per day, 3 per barrel max
    const b = base(), w = b.water, n = b.built.barrel, cap = 3 * n, t = dayNo();
    if (!n) { w.d = t; return w; }
    if (b.broken.barrel) { w.d = t; w.n = Math.min(w.n, cap); return w; }
    if (t > w.d) { w.n = Math.min(cap, w.n + (t - w.d) * n); w.d = t; }
    return w;
  }
  B.plantState = function (p, t = dayNo()) {
    if (!p) return null;
    const C = D.CROPS[p.k], need = C.days, w = new Set(p.w || []);
    let grown = 0, streak = 0, dead = !!p.dead;
    for (let d = p.d0; d < t && !dead; d++) {
      if (grown >= need) break;
      if (w.has(d)) { grown++; streak = 0; } else if (++streak >= 3) dead = true;
    }
    if (!dead && grown < need && w.has(t)) grown++;
    const ready = !dead && grown >= need, today = w.has(t);
    const wilt = !dead && !ready && streak >= 2 && !today;
    return { k: p.k, n: C.n, need, grown, ready, dead, wilt, today, stage: dead ? -1 : ready ? 3 : grown >= need * .6 ? 2 : grown >= 1 ? 1 : 0, dry: streak };
  };
  B.gardenNote = function () { // short line for the home screen
    const b = base(); if (!b || !b.built.beds) return '';
    let thirsty = 0, ready = 0, wilt = 0;
    b.beds.forEach((p, i) => { if (i >= b.built.beds || !p) return; const s = B.plantState(p); if (s.dead) return; if (s.ready) ready++; else if (!s.today) { thirsty++; if (s.wilt) wilt++; } });
    return [ready ? `${ready} ready to harvest` : '', thirsty ? `${thirsty} need${thirsty === 1 ? 's' : ''} water${wilt ? ` (${wilt} wilting!)` : ''}` : ''].filter(Boolean).join(' · ');
  };
  function water(i) {
    const b = base(), p = b.beds[i], s = B.plantState(p); if (!s || s.dead || s.ready) return;
    if (s.today) { toast('Already watered today', 1.4); return; }
    const w = barrels();
    if (w.n > 0) { w.n--; toast(`Watered the ${s.n.toLowerCase()} from the rain barrel (${w.n} left)`, 1.8); }
    else if (b.pool >= WATER) { b.pool -= WATER; toast(`Watered the ${s.n.toLowerCase()}: ${WATER} build steps`, 1.8); }
    else { toast(`Watering takes ${WATER} build steps (or a rain barrel charge)`, 2.2); return; }
    p.w = (p.w || []).filter(d => d > dayNo() - 12).concat(dayNo());
    SFX.play('pick'); splash(i); G().save(); syncPieces();
  }
  // the crew's Gardener waters one thirsty plant a day for free. Returns the crop's name, or ''.
  B.crewWater = function () {
    const b = base(); if (!b || !b.built.beds) return '';
    for (let i = 0; i < b.built.beds; i++) { const p = b.beds[i], s = B.plantState(p); if (!s || s.dead || s.ready || s.today) continue; p.w = (p.w || []).filter(d => d > dayNo() - 12).concat(dayNo()); return s.n.toLowerCase(); }
    return '';
  };
  function harvest(i) {
    const b = base(), p = b.beds[i], s = B.plantState(p); if (!s || !s.ready) return;
    const rnd = D.mulberry32(D.hashStr(SV().seedBase + ':crop:' + i + ':' + p.d0)), C = D.CROPS[p.k];
    const n = C.yield[0] + Math.floor(rnd() * (C.yield[1] - C.yield[0] + 1)), seed = rnd() < .5;
    const items = [[p.k, n]].concat(seed ? [['seed_' + p.k, 1]] : []);
    if (!G().canGive(items)) { toast('No room in your pack or stash for the harvest', 2); return; }
    for (const [k, c] of items) G().give(k, c);
    b.beds[i] = null; SFX.play('pick'); G().save(); syncPieces();
    toast(`Harvested ${n} ${D.ITEMS[p.k].n.toLowerCase()}${seed ? ' + seeds' : ''}`, 2);
  }
  function plantPicker(i) {
    const seeds = Object.keys(D.ITEMS).filter(k => D.ITEMS[k].seed && G().countItem(k) > 0);
    panel(`<div class="kick">Garden bed ${i + 1}</div><h3>Plant something</h3>
      <p class="mp">Each plant needs watering once a day (${WATER} build steps or a rain barrel charge). Unwatered for 2 days it wilts; 3 days and it dies.</p>
      ${seeds.length ? seeds.map(k => { const c = D.CROPS[D.ITEMS[k].seed]; return `<button class="pick" data-seed="${k}"><b>${icon(k)} ${c.n}</b><span>${c.days} watered days · you have ${G().countItem(k)} seed${G().countItem(k) > 1 ? 's' : ''}</span></button>`; }).join('')
        : '<div class="empty">No seeds yet. Pantries, storage shelves and garages sometimes have a packet.</div>'}
      <button class="mbtn ghost" data-close>Close</button>`);
    $('#msheet').querySelectorAll('[data-seed]').forEach(bt => bt.onclick = () => {
      const k = bt.dataset.seed; G().takeItems(k, 1);
      base().beds[i] = { k: D.ITEMS[k].seed, d0: dayNo(), w: [] };
      panelClose(); G().save(); syncPieces(); SFX.play('pick');
      toast(`Planted ${D.CROPS[D.ITEMS[k].seed].n.toLowerCase()}. Water it today!`, 2);
    });
  }

  // ---------------------------------------------------------------- the map
  const MW = 21, MH = 28;
  const FX0 = 2, FX1 = 18, FY0 = 4, FY1 = 24;                 // fence ring (inclusive)
  const SX0 = 5, SX1 = 13, SY0 = 5, SY1 = 11, DOOR = [9, 11];  // the shack
  const GATE = [9, 10, 11];                                     // gap in the south fence
  const SPOTS = { chest: [6, 6, 1, 1], bench: [10, 6, 3, 1], barrel0: [3, 6, 1, 1], barrel1: [16, 6, 1, 1],
    beds0: [4, 15, 2, 1], beds1: [4, 18, 2, 1], beds2: [14, 15, 2, 1], beds3: [14, 18, 2, 1], tower: [15, 21, 2, 2], gen: [3, 22, 1, 1] };
  function wallIds() { // in order around the ring, so neighbours in the list are neighbours on the ground
    const o = [];
    for (let x = FX0; x <= FX1; x++) o.push('w' + x + ',' + FY0);
    for (let y = FY0 + 1; y < FY1; y++) o.push('w' + FX1 + ',' + y);
    for (let x = FX1; x >= FX0; x--) if (!GATE.includes(x)) o.push('w' + x + ',' + FY1);
    for (let y = FY1 - 1; y > FY0; y--) o.push('w' + FX0 + ',' + y);
    return o;
  }
  function trapTiles(kind, tier) {
    const o = [], r = kind === 'spikes' ? 1 : 2; // spikes hug the wall, wire one row further out
    if (tier >= 1) for (let x = 5; x <= 15; x++) o.push([x, FY1 + r]);
    if (tier >= 2) for (let x = 4; x <= 16; x += 1) o.push([x, FY0 - r]);
    if (tier >= 3) for (let y = 7; y <= 21; y++) { o.push([FX0 - r, y]); o.push([FX1 + r, y]); }
    return o;
  }
  const inShack = (x, y) => x > SX0 && x < SX1 && y > SY0 && y < SY1;
  const inYard = (x, y) => x > FX0 && x < FX1 && y > FY0 && y < FY1 && !(x >= SX0 && x <= SX1 && y >= SY0 && y <= SY1);
  // where decor can go: wall rows (posters, lights) and the floor of the yard and shack
  const WALLROW = new Set(); for (let x = SX0 + 1; x < SX1; x++) { WALLROW.add(x + ',' + SY0); if (x !== DOOR[0]) WALLROW.add(x + ',' + SY1); }
  const RESERVED = new Set();
  for (const k in SPOTS) { const [x, y, w, h] = SPOTS[k]; for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) RESERVED.add((x + i) + ',' + (y + j)); }
  for (const t of [[9, 10], [9, 12], [9, 13], [9, 23], [10, 23], [11, 23], [10, 22], [7, 6], [9, 6]]) RESERVED.add(t.join(','));
  function layout() {
    const rows = [];
    for (let y = 0; y < MH; y++) {
      let r = '';
      for (let x = 0; x < MW; x++) {
        if (x >= SX0 && x <= SX1 && y >= SY0 && y <= SY1) r += (x === DOOR[0] && y === DOOR[1]) ? '+' : (x === SX0 || x === SX1 || y === SY0 || y === SY1) ? '#' : 'i';
        else r += (x >= FX0 && x <= FX1 && y >= FY0 && y <= FY1) ? 'Y' : 'X';
      }
      rows.push(r);
    }
    return {
      id: 'base', type: 'base', name: 'Your base', address: 'your base', rows, doors: { [DOOR.join(',')]: 'i' },
      rooms: { Y: { name: 'Yard', style: 'Y' }, X: { name: 'Outside the walls', style: 'X' }, i: { name: 'Shack', style: 'w' } },
      street: 'Y', streetY: MH + 6, noStreet: true, stoop: { x: 10 }, frontDoor: DOOR.join(','), start: { x: 9.5, y: 13.5 },
      decor: { '7,11': 'window', '11,11': 'window', '12,11': 'window', '8,5': 'window', '10,5': 'clock' },
      rugs: [], zombies: [], secrets: [], furn: [], wanderer: false, emptyPct: 0,
    };
  }

  // ---------------------------------------------------------------- art (Style B: ink outlines, flat fills)
  const F = ART.FURN, blk = ART.blk, line = ART.line, dot = ART.dot, rr = ART.rr;
  const MAT = [null, { a: '#a0704f', b: '#7a5040', c: '#c08a60' }, { a: '#7d8398', b: '#5f6580', c: '#9aa0b4' }, { a: '#5c5478', b: '#463f62', c: '#7d6aa8' }];
  function rubble(c, x, y, w) { for (let i = 0; i < 4; i++) blk(c, x + 4 + (i * 9) % (w - 10), y - 8 - (i % 2) * 5, 10 + (i % 3) * 3, 8, i % 2 ? '#5a5070' : '#6a4a3a', 2, 1.8); }
  F.bfence = (c, f) => {
    const m = MAT[f.tier] || MAT[1], H = f.H;
    if (f.broken) { rubble(c, f.x, f.y + f.h, f.w); return; }
    if (f.ori === 'v') { // seen edge-on: a column running north-south
      const cx = f.x + f.w / 2, yb = f.y + f.h, top = f.y - 2 - H;
      blk(c, cx - 7, top, 14, yb - H - top + 3, m.c, 2, 2.2);
      blk(c, cx - 7, yb - H, 14, H, m.a, 2, 2.2);
      if (f.tier === 1) for (let yy = yb - H + 8; yy < yb - 4; yy += 12) line(c, cx - 5, yy, cx + 5, yy, m.b, 2);
      if (f.tier === 3) for (let yy = top + 4; yy < yb - H; yy += 7) dot(c, cx, yy, 2.4, '#9aa0b4');
      if (f.hp != null && f.hp < f.maxHp * .5) line(c, cx - 4, yb - H + 6, cx + 3, yb - 8, P.INK, 1.6);
      return;
    }
    const x0 = f.x, x1 = f.x + f.w, yb = f.y + f.h, w = f.w;
    if (f.tier === 1) {
      blk(c, x0, yb - H + 10, w, 6, m.b, 1, 2); blk(c, x0, yb - 14, w, 6, m.b, 1, 2);
      for (let i = 0; i < 3; i++) { const px = x0 + 2 + i * (w - 4) / 3, pw = (w - 4) / 3 - 3; c.beginPath(); c.moveTo(px, yb); c.lineTo(px, yb - H + 6); c.lineTo(px + pw / 2, yb - H); c.lineTo(px + pw, yb - H + 6); c.lineTo(px + pw, yb); c.closePath(); c.fillStyle = (i + f.tx) % 2 ? m.a : m.c; c.fill(); c.lineWidth = 2; c.strokeStyle = P.INK; c.stroke(); }
    } else if (f.tier === 2) {
      blk(c, x0, yb - H, w, H, m.a, 1, 2.2);
      for (let xx = x0 + 5; xx < x1 - 2; xx += 6) line(c, xx, yb - H + 3, xx, yb - 3, m.b, 1.6);
      if (ART.hash(f.tx, f.ty) < .5) { c.fillStyle = 'rgba(160,96,58,.7)'; c.beginPath(); c.ellipse(x0 + w * .6, yb - H * .4, 7, 5, .4, 0, 6.28); c.fill(); }
      dot(c, x0 + 6, yb - H + 5, 1.8, P.INK); dot(c, x1 - 6, yb - H + 5, 1.8, P.INK);
    } else {
      blk(c, x0, yb - H, w, H, m.a, 1, 2.4);
      for (let r = 0, yy = yb - H + 12; yy < yb - 2; yy += 10, r++) { line(c, x0 + 1, yy, x1 - 1, yy, m.b, 1.6); for (let xx = x0 + (r % 2) * 11 + 6; xx < x1; xx += 22) line(c, xx, yy, xx, yy + 10, m.b, 1.6); }
      blk(c, x0 - 1, yb - H - 2, w + 2, 7, m.c, 1, 2);
      for (let xx = x0 + 4; xx < x1; xx += 9) { c.beginPath(); c.arc(xx, yb - H - 5, 4, Math.PI, 0); c.strokeStyle = '#9aa0b4'; c.lineWidth = 1.6; c.stroke(); }
    }
    if (f.hp != null && f.hp < f.maxHp * .5) { line(c, x0 + 10, yb - H + 4, x0 + 18, yb - H * .5, P.INK, 1.8); line(c, x0 + 18, yb - H * .5, x0 + 12, yb - 4, P.INK, 1.8); }
  };
  F.bgate = (c, f) => {
    const m = MAT[f.tier] || MAT[1], H = f.H, x0 = f.x, w = f.w, yb = f.y + f.h;
    if (f.broken) { rubble(c, x0, yb, w); return; }
    for (const px of [x0 - 2, x0 + w - 8]) blk(c, px, yb - H - 8, 10, H + 8, m.b, 2, 2.2);
    if (f.open) { // swung inward: two leaves seen edge-on
      for (const [px, s] of [[x0 + 8, 1], [x0 + w - 8, -1]]) { c.beginPath(); c.moveTo(px, yb - H); c.lineTo(px + s * 10, yb - H - 22); c.lineTo(px + s * 10, yb - 24); c.lineTo(px, yb); c.closePath(); c.fillStyle = m.a; c.fill(); c.lineWidth = 2; c.strokeStyle = P.INK; c.stroke(); }
      return;
    }
    blk(c, x0 + 8, yb - H, w - 16, H, m.a, 2, 2.4);
    if (f.tier === 1) for (let xx = x0 + 16; xx < x0 + w - 10; xx += 10) line(c, xx, yb - H + 3, xx, yb - 3, m.b, 2);
    else for (let xx = x0 + 14; xx < x0 + w - 10; xx += 6) line(c, xx, yb - H + 3, xx, yb - 3, m.b, 1.4);
    line(c, x0 + 10, yb - H + 4, x0 + w - 10, yb - 4, m.b, 3); line(c, x0 + w / 2, yb - H, x0 + w / 2, yb, P.INK, 2);
    blk(c, x0 + w / 2 - 6, yb - H / 2 - 4, 12, 8, '#9aa0b4', 1, 1.6);
  };
  F.btower = (c, f, g) => {
    const x0 = f.x + 6, x1 = f.x + f.w - 6, yb = f.y + f.h - 6, top = yb - f.H;
    for (const xx of [x0, x1 - 8]) blk(c, xx, top + 20, 8, f.H - 20, '#7a5040', 1, 2);
    line(c, x0 + 6, yb - 10, x1 - 6, top + 30, '#7a5040', 3); line(c, x1 - 6, yb - 10, x0 + 6, top + 30, '#7a5040', 3);
    blk(c, x0 - 6, top + 8, x1 - x0 + 12, 16, '#a0704f', 2, 2.4);
    for (let xx = x0; xx < x1; xx += 10) line(c, xx, top + 8, xx, top - 10, P.INK, 2.4);
    blk(c, x0 - 6, top - 12, x1 - x0 + 12, 5, '#c08a60', 1, 2);
    c.beginPath(); c.moveTo(x0 - 10, top - 24); c.lineTo((x0 + x1) / 2, top - 48); c.lineTo(x1 + 10, top - 24); c.closePath(); c.fillStyle = P.ORAD; c.fill(); c.lineWidth = 2.4; c.strokeStyle = P.INK; c.stroke();
    line(c, x0 - 4, top - 24, x0 - 4, top - 12, P.INK, 2); line(c, x1 + 4, top - 24, x1 + 4, top - 12, P.INK, 2);
    for (let yy = top + 28; yy < yb; yy += 10) line(c, (x0 + x1) / 2 - 7, yy, (x0 + x1) / 2 + 7, yy, '#c08a60', 2.4);
    if (f.broken) { line(c, x0, top + 30, x1, top + 60, P.INK, 3); c.fillStyle = 'rgba(17,20,47,.35)'; c.fillRect(x0 - 6, top + 8, x1 - x0 + 12, 16); }
  };
  F.bspikes = (c, f) => {
    const yb = f.y + f.h - 8;
    for (let i = 0; i < 3; i++) { const xx = f.x + 8 + i * 13; c.beginPath(); c.moveTo(xx - 4, yb); c.lineTo(xx + 3, yb - 22 - (i % 2) * 5); c.lineTo(xx + 5, yb); c.closePath(); c.fillStyle = i % 2 ? '#c08a60' : '#a0704f'; c.fill(); c.lineWidth = 1.8; c.strokeStyle = P.INK; c.stroke(); }
    line(c, f.x + 4, yb, f.x + f.w - 4, yb, '#7a5040', 3);
  };
  F.bwire = (c, f) => {
    const yb = f.y + f.h - 12;
    c.strokeStyle = P.INK; c.lineWidth = 3.4; c.beginPath(); for (let i = 0; i <= 4; i++) c.arc(f.x + 6 + i * 8, yb - 8, 7, Math.PI * .1, Math.PI * 1.9); c.stroke();
    c.strokeStyle = '#9aa0b4'; c.lineWidth = 1.6; c.beginPath(); for (let i = 0; i <= 4; i++) c.arc(f.x + 6 + i * 8, yb - 8, 7, Math.PI * .1, Math.PI * 1.9); c.stroke();
    for (const xx of [f.x + 4, f.x + f.w - 4]) line(c, xx, yb + 4, xx, yb - 18, P.INK, 3);
  };
  F.bbarrel = (c, f, g) => {
    const cx = f.x + f.w / 2, yb = f.y + f.h - 4, H = f.H;
    blk(c, cx - 15, yb - H, 30, H, '#3f6aa8', 6, 2.6);
    line(c, cx - 15, yb - H * .35, cx + 15, yb - H * .35, '#2c4f86', 2.4); line(c, cx - 15, yb - H * .7, cx + 15, yb - H * .7, '#2c4f86', 2.4);
    c.beginPath(); c.ellipse(cx, yb - H, 15, 6, 0, 0, 6.28); c.fillStyle = f.broken ? '#140f26' : (f.water > 0 ? '#5aa8c8' : '#2a2448'); c.fill(); c.lineWidth = 2.4; c.strokeStyle = P.INK; c.stroke();
    if (f.water > 0 && !f.broken) { c.fillStyle = 'rgba(255,255,255,.4)'; c.fillRect(cx - 6, yb - H - 2, 6, 2); }
    if (f.broken) line(c, cx - 8, yb - H + 6, cx + 2, yb - 8, P.INK, 2);
    line(c, cx + 10, yb - H - 4, cx + 22, yb - H - 26, '#7d8398', 4);
  };
  function plantArt(c, x, y, s, t) { // a plant growing in soil at (x,y): stage 0-3, crop colour, wilting / dead
    if (!s) return;
    const C = D.CROPS[s.k], green = s.dead ? '#6a5a48' : s.wilt ? '#8a8a4a' : '#7c9a4c', dark = s.dead ? '#4a3a30' : '#5c7836';
    const sway = Math.sin(t * 1.4 + x) * .04 + (s.wilt ? .5 : 0);
    if (s.stage <= 0) { dot(c, x, y - 2, 3, dark); line(c, x, y - 2, x + 3, y - 7, green, 2); return; }
    const h = [0, 14, 24, 30][Math.max(1, s.stage)], lean = s.dead ? .9 : sway;
    c.save(); c.translate(x, y); c.rotate(lean * .6);
    line(c, 0, 0, 0, -h, P.INK, 4.4); line(c, 0, 0, 0, -h, dark, 2.4);
    for (let i = 0; i < Math.min(4, s.stage + 1); i++) { const yy = -h * (.3 + i * .2), sd = i % 2 ? 1 : -1; c.beginPath(); c.ellipse(sd * 7, yy, 7, 3.4, sd * -.5, 0, 6.28); c.fillStyle = i % 2 ? green : dark; c.fill(); c.lineWidth = 1.6; c.strokeStyle = P.INK; c.stroke(); }
    if (s.stage >= 3 && !s.dead) {
      if (s.k === 'corn') { blk(c, 3, -h + 2, 7, 14, C.col, 3, 1.6); }
      else if (s.k === 'carrot' || s.k === 'potato') { c.beginPath(); c.ellipse(0, 1, 7, 4, 0, 0, 6.28); c.fillStyle = C.col; c.fill(); c.lineWidth = 1.6; c.strokeStyle = P.INK; c.stroke(); }
      else if (s.k === 'herbs') { for (let i = 0; i < 3; i++) dot(c, -6 + i * 6, -h + 2, 4, '#93a86c'); }
      else for (const [dx, dy] of [[-6, -h * .5], [6, -h * .7], [-2, -h * .85]]) { dot(c, dx, dy, 4.4, P.INK); dot(c, dx, dy, 3.4, C.col); }
    } else if (s.stage === 2 && !s.dead) dot(c, 2, -h + 1, 3, s.k === 'tomato' ? '#93a86c' : C.col);
    c.restore();
  }
  F.bbed = (c, f, g) => {
    const x0 = f.x + 2, w = f.w - 4, yb = f.y + f.h - 4;
    blk(c, x0, yb - 16, w, 16, '#7a5040', 2, 2.4);
    blk(c, x0 + 4, yb - 22, w - 8, 10, f.wet ? '#3a2a24' : '#5a4034', 3, 2);
    if (f.broken) { line(c, x0 + 6, yb - 20, x0 + w - 8, yb - 14, '#a0704f', 3); return; }
    if (f.plant) { const s = f.plant; for (let i = 0; i < 3; i++) plantArt(c, x0 + 14 + i * (w - 28) / 2, yb - 16, s, i * 1.3); }
  };
  F.bgen = (c, f, g) => {
    const x0 = f.x + 3, w = f.w - 6, yb = f.y + f.h - 4;
    blk(c, x0, yb - 26, w, 26, '#c95f2c', 3, 2.4); blk(c, x0 + 5, yb - 21, w - 10, 10, '#3d2d61', 2, 1.6);
    for (let i = 0; i < 3; i++) line(c, x0 + 8 + i * 6, yb - 19, x0 + 8 + i * 6, yb - 13, '#9aa0b4', 1.6);
    dot(c, x0 + w - 8, yb - 6, 3, f.broken ? '#5a4a86' : '#93e06c'); line(c, x0 + 6, yb - 26, x0 + 6, yb - 34, P.INK, 3);
  };
  F.bchest = (c, f, g) => {
    const x0 = f.x + 3, w = f.w - 6, yb = f.y + f.h - 4;
    blk(c, x0, yb - 22, w, 22, '#8a5a4a', 3, 2.4);
    rr(c, x0, yb - 34, w, 14, 7); c.fillStyle = '#a0704f'; c.fill(); c.lineWidth = 2.4; c.strokeStyle = P.INK; c.stroke();
    line(c, x0, yb - 21, x0 + w, yb - 21, P.INK, 2); blk(c, x0 + w / 2 - 4, yb - 24, 8, 8, '#e0b94a', 1, 1.6);
    for (const xx of [x0 + 6, x0 + w - 6]) line(c, xx, yb - 33, xx, yb - 2, '#5a3a2a', 2.4);
  };
  // decor (custom art)
  F.dcactus = (c, f, g) => { const cx = g.x + g.w / 2; blk(c, cx - 9, g.fy1 - 16, 18, 14, P.ORAD, 3, 2.2); blk(c, cx - 5, g.fy1 - 40, 10, 26, '#5c7836', 5, 2.2); blk(c, cx - 14, g.fy1 - 34, 8, 12, '#5c7836', 4, 2); blk(c, cx + 6, g.fy1 - 38, 8, 14, '#5c7836', 4, 2); dot(c, cx, g.fy1 - 41, 2.6, '#f07bb0'); };
  F.dflowers = (c, f, g) => { blk(c, g.x + 4, g.fy1 - 14, g.w - 8, 12, '#7a5040', 2, 2.2); for (let i = 0; i < 6; i++) { const xx = g.x + 12 + i * (g.w - 24) / 5, yy = g.fy1 - 20 - (i % 2) * 5; line(c, xx, g.fy1 - 12, xx, yy, '#5c7836', 2); dot(c, xx, yy, 4.4, P.INK); dot(c, xx, yy, 3.4, ['#f07b3c', '#f6e3bb', '#c96a9a'][i % 3]); } };
  F.dlamp = (c, f, g) => { const cx = g.x + g.w / 2, top = g.fy1 - f.H; blk(c, cx - 8, g.fy1 - 6, 16, 5, P.INK, 2, 0); c.fillStyle = P.INK; c.fillRect(cx - 2, top + 16, 4, f.H - 18); c.beginPath(); c.moveTo(cx - 13, top + 18); c.lineTo(cx + 13, top + 18); c.lineTo(cx + 8, top); c.lineTo(cx - 8, top); c.closePath(); c.fillStyle = '#f6e3bb'; c.fill(); c.lineWidth = 2.2; c.strokeStyle = P.INK; c.stroke(); };
  F.dlantern = (c, f, g) => { const cx = g.x + g.w / 2, yb = g.fy1 - 6; blk(c, cx - 7, yb - 18, 14, 18, '#ffd27a', 3, 2.2); line(c, cx - 7, yb - 9, cx + 7, yb - 9, P.INK, 1.4); blk(c, cx - 9, yb - 22, 18, 5, '#3d2d61', 2, 1.8); c.beginPath(); c.arc(cx, yb - 24, 5, Math.PI, 0); c.strokeStyle = P.INK; c.lineWidth = 2; c.stroke(); };
  const WALLY = f => f.y + f.h - 54; // top of the area to draw on a wall face (like the medicine cabinet)
  F.dposter = (c, f) => { const x = f.x + 8, y = WALLY(f) - 4, w = f.w - 16; blk(c, x, y, w, 36, '#3d2d61', 1, 2); c.fillStyle = P.ORA; c.beginPath(); c.arc(x + w / 2, y + 15, 8, 0, 6.28); c.fill(); line(c, x + 4, y + 28, x + w - 4, y + 28, '#f6e3bb', 2.4); line(c, x + 6, y + 32, x + w - 8, y + 32, '#9d90bf', 1.6); };
  F.dposter2 = (c, f) => { const x = f.x + 8, y = WALLY(f) - 4, w = f.w - 16; blk(c, x, y, w, 36, '#11142f', 1, 2); c.fillStyle = '#93a86c'; c.beginPath(); c.moveTo(x + 4, y + 26); c.lineTo(x + w / 2, y + 8); c.lineTo(x + w - 4, y + 26); c.fill(); dot(c, x + w / 2 - 3, y + 16, 1.6, '#b53a2e'); dot(c, x + w / 2 + 3, y + 16, 1.6, '#b53a2e'); line(c, x + 4, y + 31, x + w - 4, y + 31, P.ORA, 2.4); };
  F.dmap = (c, f) => { const x = f.x + 8, y = WALLY(f) - 2, w = f.w - 16; blk(c, x, y, w, 32, '#e8dcb8', 1, 2); c.strokeStyle = '#9d90bf'; c.lineWidth = 1.4; for (let i = 1; i < 5; i++) line(c, x + i * w / 5, y + 2, x + i * w / 5 - 4, y + 30, '#c9b48a', 1.2); c.beginPath(); c.moveTo(x + 6, y + 22); c.bezierCurveTo(x + 20, y + 4, x + 40, y + 30, x + w - 6, y + 10); c.strokeStyle = '#3f6aa8'; c.lineWidth = 3; c.stroke(); dot(c, x + w * .62, y + 18, 3.4, P.RED); };
  F.dlights = (c, f) => { const y = WALLY(f) + 2; c.beginPath(); c.moveTo(f.x + 4, y); for (let i = 1; i <= 6; i++) c.quadraticCurveTo(f.x + (i - .5) * f.w / 6, y + 9, f.x + i * f.w / 6 - (i === 6 ? 4 : 0), y); c.strokeStyle = P.INK; c.lineWidth = 1.6; c.stroke(); for (let i = 0; i < 12; i++) { const xx = f.x + 6 + i * (f.w - 12) / 11; dot(c, xx, y + 6 + Math.sin(i * 1.3) * 2, 3, ['#ffd27a', '#f07b3c', '#f6e3bb', '#93a86c'][i % 4]); } };
  F.dgnome = (c, f, g) => { const cx = g.x + g.w / 2, yb = g.fy1 - 4; blk(c, cx - 8, yb - 14, 16, 14, '#3f6aa8', 4, 2.2); dot(c, cx, yb - 18, 6, '#f4c49a'); c.beginPath(); c.moveTo(cx - 8, yb - 20); c.lineTo(cx, yb - 36); c.lineTo(cx + 8, yb - 20); c.closePath(); c.fillStyle = P.RED; c.fill(); c.lineWidth = 2; c.strokeStyle = P.INK; c.stroke(); c.beginPath(); c.moveTo(cx - 6, yb - 16); c.quadraticCurveTo(cx, yb - 4, cx + 6, yb - 16); c.fillStyle = '#f6e3bb'; c.fill(); c.lineWidth = 1.6; c.stroke(); };
  F.dflamingo = (c, f, g) => { const cx = g.x + g.w / 2, yb = g.fy1 - 4; line(c, cx, yb, cx, yb - 18, P.INK, 2); c.beginPath(); c.ellipse(cx - 2, yb - 22, 10, 6, -.2, 0, 6.28); c.fillStyle = '#f08ab0'; c.fill(); c.lineWidth = 2; c.strokeStyle = P.INK; c.stroke(); c.beginPath(); c.moveTo(cx + 6, yb - 24); c.quadraticCurveTo(cx + 12, yb - 40, cx + 4, yb - 38); c.strokeStyle = P.INK; c.lineWidth = 4.4; c.stroke(); c.strokeStyle = '#f08ab0'; c.lineWidth = 2.6; c.stroke(); dot(c, cx + 3, yb - 38, 2.4, '#11142f'); };
  function rugArt(c, k, x, y, w, h) {
    if (k === 'd_rug2') { c.beginPath(); c.ellipse(x + w / 2, y + h / 2, w / 2 - 4, h / 2 - 6, 0, 0, 6.28); c.fillStyle = '#4a6a5a'; c.fill(); c.lineWidth = 2.4; c.strokeStyle = P.INK; c.stroke(); for (let i = 1; i < 3; i++) { c.beginPath(); c.ellipse(x + w / 2, y + h / 2, (w / 2 - 4) * (1 - i * .3), (h / 2 - 6) * (1 - i * .3), 0, 0, 6.28); c.strokeStyle = i % 2 ? '#93a86c' : '#f6e3bb'; c.lineWidth = 3; c.stroke(); } return; }
    rr(c, x + 4, y + 6, w - 8, h - 12, 6); c.fillStyle = '#7a3a4a'; c.fill(); c.lineWidth = 2.4; c.strokeStyle = P.INK; c.stroke();
    rr(c, x + 11, y + 13, w - 22, h - 26, 4); c.strokeStyle = '#e0b94a'; c.lineWidth = 3; c.stroke();
    c.fillStyle = P.ORA; for (let i = 0; i < 3; i++) { c.save(); c.translate(x + w * (.3 + i * .2), y + h / 2); c.rotate(.785); c.fillRect(-5, -5, 10, 10); c.restore(); }
  }
  F.bdecor = (c, f, g) => { // placed decor: the furniture art, mirrored when turned
    const d = D.DECOR[f.dk]; if (!d) return;
    if (f.r && d.rot === 'flip') { c.save(); c.translate(2 * f.x + f.w, 0); c.scale(-1, 1); (F[d.art] || F.counter)(c, f, g); c.restore(); }
    else (F[d.art] || F.counter)(c, f, g);
  };
  // icons: seeds + crops as SVG, decor drawn from its furniture art
  (function icons() {
    const S = '#11142f';
    const veg = {
      tomato: `<circle cx="0" cy="4" r="14" fill="#d9483a" stroke="${S}" stroke-width="2.6"/><path d="M-8,-8 L0,-4 L8,-8 L4,-2 L0,-12 L-4,-2 Z" fill="#7c9a4c" stroke="${S}" stroke-width="1.8" stroke-linejoin="round"/><circle cx="-5" cy="0" r="3" fill="#f6e3bb" opacity=".5"/>`,
      potato: `<ellipse cx="0" cy="2" rx="17" ry="12" fill="#c9a06a" stroke="${S}" stroke-width="2.6" transform="rotate(-12)"/><circle cx="-6" cy="0" r="1.8" fill="#8a6a40"/><circle cx="5" cy="5" r="1.8" fill="#8a6a40"/><circle cx="7" cy="-4" r="1.4" fill="#8a6a40"/>`,
      carrot: `<path d="M-5,-10 L5,-10 L1,22 Z" fill="#f07b3c" stroke="${S}" stroke-width="2.6" stroke-linejoin="round"/><path d="M-1,-10 L-8,-22 M1,-10 L1,-24 M3,-10 L9,-21" stroke="#7c9a4c" stroke-width="4" stroke-linecap="round"/><path d="M-3,0 h4 M-2,8 h3" stroke="#c95f2c" stroke-width="1.6"/>`,
      corn: `<ellipse cx="0" cy="0" rx="9" ry="19" fill="#e0b94a" stroke="${S}" stroke-width="2.6"/><path d="M-4,-12 v24 M2,-14 v28 M-8,-4 h16 M-8,4 h16" stroke="#b48a28" stroke-width="1.4"/><path d="M-9,4 Q-18,10 -10,22 Q-4,16 -2,8 Z M9,4 Q18,10 10,22 Q4,16 2,8 Z" fill="#7c9a4c" stroke="${S}" stroke-width="2"/>`,
      herbs: `<path d="M0,20 L0,-6 M0,10 L-10,-10 M0,10 L10,-10" stroke="#5c7836" stroke-width="3"/>${[[-10, -12], [10, -12], [0, -10], [-6, 0], [6, 0]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="5" ry="8" fill="#93a86c" stroke="${S}" stroke-width="1.8"/>`).join('')}<rect x="-6" y="12" width="12" height="5" rx="2" fill="#f07b3c" stroke="${S}" stroke-width="1.6"/>`,
    };
    const o = {};
    for (const k in veg) {
      o[k] = `<g transform="scale(1.35)">${veg[k]}</g>`;
      o['seed_' + k] = `<g transform="rotate(-6)"><rect x="-19" y="-25" width="38" height="50" rx="3" fill="#f6e3bb" stroke="${S}" stroke-width="2.6"/><rect x="-19" y="-25" width="38" height="11" fill="${D.CROPS[k].col}" stroke="${S}" stroke-width="2.2"/><g transform="translate(0 8) scale(.7)">${veg[k]}</g></g>`;
    }
    ART.addIcons(o);
    // decor icons from their art, drawn on a canvas
    const ic = {};
    for (const k in D.DECOR) {
      try {
        const d = D.DECOR[k], w = Math.min(3, d.w) * T, h = (d.floor ? d.h : 1) * T;
        const big = document.createElement('canvas'); big.width = big.height = 260; const bc = big.getContext('2d'); bc.translate(130 - w / 2, 150 - h);
        const f = { x: 0, y: 0, w, h, H: d.H, tx: 0, ty: 0, dk: k, art: 'bdecor', r: 0 }, g = ART.geo(f);
        if (d.floor) rugArt(bc, k, 0, 0, w, h); else F.bdecor(bc, f, g);
        const px = bc.getImageData(0, 0, 260, 260).data; let x0 = 260, y0 = 260, x1 = 0, y1 = 0;   // crop to what was drawn
        for (let y = 0; y < 260; y++) for (let x = 0; x < 260; x++) if (px[(y * 260 + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
        if (x1 <= x0) continue;
        const cv = document.createElement('canvas'); cv.width = cv.height = 96; const c = cv.getContext('2d');
        const span = Math.max(x1 - x0, y1 - y0) + 4, sc = Math.min(2.2, 84 / span);
        c.translate(48, 48); c.scale(sc, sc); c.drawImage(big, -(x0 + x1) / 2, -(y0 + y1) / 2);
        ic[k] = cv.toDataURL();
      } catch (e) { /* the icon falls back to nothing */ }
    }
    ART.addIcons(ic);
  })();

  // ---------------------------------------------------------------- live scene state
  let S = null; // { shift, edit, sel, pend, furn: [] }
  const House = () => DM.House;
  function pieceFurn() { // the build pieces as furniture definitions (layout format)
    const b = base(), out = [], br = b.broken, wt = b.built.walls;
    const P2 = (id, art, at, H, o = {}) => out.push(Object.assign({ art, at, H, piece: id, solid: 1 }, o));
    P2('chest', 'bchest', SPOTS.chest, 34, { name: 'Stash chest' });
    P2('bench', 'workbench', SPOTS.bench, 34, { name: 'Workbench' });
    if (wt) for (const id of wallIds()) {
      const [x, y] = id.slice(1).split(',').map(Number), v = (x === FX0 || x === FX1) && y !== FY0 && y !== FY1;
      P2(id, 'bfence', [x, y, 1, 1], [0, 30, 40, 50][wt], { tier: wt, ori: v ? 'v' : 'h', broken: !!br[id], solid: br[id] ? 0 : 1, fence: 1, d: 6 });
    }
    if (b.built.gate) P2('gate', 'bgate', [GATE[0], FY1, GATE.length, 1], [0, 32, 42, 52][b.built.gate], { tier: b.built.gate, broken: !!br.gate, open: b.gateOpen && !S.shift, solid: br.gate || (b.gateOpen && !S.shift) ? 0 : 1, fence: 1, d: 6, name: 'Gate' });
    for (const k of ['spikes', 'wire']) if (b.built[k] && !br[k]) for (const [x, y] of trapTiles(k, b.built[k])) P2(k, k === 'spikes' ? 'bspikes' : 'bwire', [x, y, 1, 1], 24, { solid: 0, trap: k });
    if (b.built.tower) P2('tower', 'btower', SPOTS.tower, 96, { broken: !!br.tower, name: 'Watchtower', d: 20 });
    if (b.built.gen) P2('gen', 'bgen', SPOTS.gen, 30, { broken: !!br.gen, name: 'Generator' });
    const w = barrels();
    for (let i = 0; i < b.built.barrel; i++) P2('barrel', 'bbarrel', SPOTS['barrel' + i], 36, { broken: !!br.barrel, water: Math.max(0, w.n - i * 3), name: 'Rain barrel' });
    for (let i = 0; i < b.built.beds; i++) { const s = B.plantState(b.beds[i]); P2('bed' + i, 'bbed', SPOTS['beds' + i], 18, { bed: i, plant: s, wet: s && s.today, name: 'Garden bed ' + (i + 1) }); }
    return out;
  }
  function decorFurn(o) {
    const d = D.DECOR[o.k], [w, h] = dims(o);
    return { art: 'bdecor', dk: o.k, r: o.r || 0, at: [o.x, o.y, w, h], H: d.H, solid: d.wall || d.solid === 0 ? 0 : 1, wall: d.wall ? 1 : 0, decorId: o.id, d: d.H > 40 ? 18 : undefined };
  }
  const dims = o => { const d = D.DECOR[o.k]; return d.rot === 'swap' && o.r % 2 ? [d.h, d.w] : [d.w, d.h]; };
  function thin(f) { // walls: a thin collision band where the wall is drawn
    if (!f.fence) return;
    if (f.ori === 'v') { f.x += 14; f.w = 16; } else { f.y += 14; f.h = 22; }
    f._key = null;
  }
  function syncPieces() { // rebuild the piece furniture after a change
    if (!S || !House().G) return;
    const g = House().G;
    for (const f of g.furn.filter(f => f.piece)) g.furn.splice(g.furn.indexOf(f), 1);
    for (const d of pieceFurn()) { const f = House().addFurn(d); thin(f); if (S.shift && f.fence) { f.maxHp = f.hp = (f.piece === 'gate' ? PIECES.gate : PIECES.walls).tiers[f.tier - 1].hp; } }
    House().refresh(); hudSync();
  }
  function syncDecor() {
    if (!S || !House().G) return;
    const g = House().G;
    for (const f of g.furn.filter(f => f.decorId)) g.furn.splice(g.furn.indexOf(f), 1);
    for (const o of base().decor) if (!D.DECOR[o.k].floor) House().addFurn(decorFurn(o));
    House().refresh();
  }

  // ---------------------------------------------------------------- interactions (house.js acts hook)
  function acts(out, g) {
    if (S.edit) return;
    const b = base();
    for (const f of g.furn) {
      if (!f.piece || f.trap) continue;
      const rect = f.fence ? { x: f.x, y: f.y - 6, w: f.w, h: f.h + 12 } : { x: f.x + 2, y: f.y, w: f.w - 4, h: f.h - 5 };
      const A = (act, name, done, o = {}) => out.push(Object.assign({ obj: f, act, name, rect, dur: .35, noise: 0, verb: 'using', done }, o));
      if (S.shift) continue; // on a watch shift it is all fighting
      if (f.broken) { if (f.fence && f.piece !== 'gate' && f.piece !== 'chest') { if (!out.some(o => o.repairWall)) A('Repair', 'wall section', () => repairSheet(f.piece), { repairWall: 1 }); continue; } A('Repair', (f.name || 'piece').toLowerCase(), () => repairSheet(f.piece)); continue; }
      if (f.piece === 'chest') A('Stash', 'chest', openStash, { verb: 'opening' });
      else if (f.piece === 'bench') A('Craft', 'at the workbench', openBench, { verb: 'setting up' });
      else if (f.piece === 'gate') A(b.gateOpen ? 'Close' : 'Unlatch', 'gate', () => { b.gateOpen = !b.gateOpen; SFX.play('open'); G().save(); syncPieces(); });
      else if (f.piece === 'barrel') A('Check', 'rain barrel', () => { const w = barrels(); toast(`Rain barrels: ${w.n} charge${w.n === 1 ? '' : 's'} of water (fills ${b.built.barrel}/day, max ${3 * b.built.barrel})`, 2.4); });
      else if (f.piece === 'tower') A('Look out', 'from the tower', () => { const n = H.next(); toast(n ? `Quiet out there. Horde night in ${until(n.at)}.` : 'Quiet out there.', 2.2); });
      else if (f.piece === 'gen') A('Check', 'generator', () => toast('Humming. The floodlight keeps the yard lit. More perks later.', 2.2));
      else if (f.bed != null) {
        const s = B.plantState(b.beds[f.bed]), i = f.bed;
        if (!s) A('Plant', 'garden bed', () => plantPicker(i), { verb: 'digging' });
        else if (s.dead) A('Clear', 'dead ' + s.n.toLowerCase(), () => { b.beds[i] = null; G().save(); syncPieces(); toast('Cleared. The bed is ready for new seeds.', 1.6); }, { dur: .8, verb: 'clearing' });
        else if (s.ready) A('Harvest', s.n.toLowerCase(), () => harvest(i), { dur: .9, verb: 'harvesting' });
        else if (!s.today) A('Water', s.n.toLowerCase() + (barrels().n ? ' (barrel)' : ` (${WATER} steps)`), () => water(i), { dur: .7, verb: 'watering' });
        else A('Check', s.n.toLowerCase(), () => toast(`${s.n}: ${s.grown}/${s.need} watered days. Come back tomorrow.`, 2), { dur: .2 });
      }
    }
  }
  function splash(i) { const g = House().G, [x, y, w] = SPOTS['beds' + i]; if (!g) return; for (let k = 0; k < 10; k++) g.parts.push({ x: (x + Math.random() * w) * T, y: (y + .7) * T, z: 20, vx: (Math.random() - .5) * 40, vy: 0, vz: 30 + Math.random() * 50, g: 300, life: .6, max: .6, col: '#7ec8e8', size: 3 }); }

  // ---------------------------------------------------------------- panels (in-run sheets)
  function panel(html, wide) { const el = $('#msheet'); el.innerHTML = `<div class="mcard${wide ? ' wide' : ''}">${html}</div>`; el.classList.add('on'); el.onclick = e => { if (e.target === el || e.target.hasAttribute('data-close')) panelClose(); }; E.resetJoy(); }
  function panelClose() { $('#msheet').classList.remove('on'); $('#msheet').innerHTML = ''; hudSync(); }
  B.panelClose = panelClose;
  function openStash() { panel(`<div class="kick">Your base</div><h3>Stash chest</h3><div id="bstash"></div><button class="mbtn ghost" data-close>Close</button>`, 1); G().stashPanel($('#bstash')); }
  function openBench() { panel(`<div class="kick">Your base</div><h3>Workbench</h3><div id="bbench"></div><button class="mbtn ghost" data-close>Close</button>`, 1); G().benchPanel($('#bbench')); }
  const matsHTML = m => Object.keys(m).map(k => { const have = G().countItem(k); return `<span class="${have >= m[k] ? 'ok' : 'miss'}">${icon(k)}${have}/${m[k]}</span>`; }).join('');
  function canPay(c) { return base().pool >= c.s && Object.keys(c.m).every(k => G().countItem(k) >= c.m[k]); }
  function pay(c) { base().pool -= c.s; for (const k in c.m) G().takeItems(k, c.m[k]); }
  function openBuild() {
    if (S && S.shift) return;
    const b = base(), rows = [];
    for (const k of ORDER) {
      const Pc = PIECES[k], cur = b.built[k], max = Pc.tiers.length;
      if (cur >= max) { rows.push(`<div class="recipe built"><div class="rinfo"><b>${Pc.tiers[max - 1].n}</b><div class="bdesc">${Pc.d}</div></div><em class="bdone">${max > 1 ? (Pc.unit ? `${max}/${max}` : 'max tier') : 'built'}</em></div>`); continue; }
      const t = Pc.tiers[cur], c = costOf(k, cur + 1), need = Pc.need && b.built[Pc.need[0]] < Pc.need[1];
      const ok = !need && canPay(c);
      rows.push(`<div class="recipe${ok ? '' : ' no'}"><div class="rinfo"><b>${t.n}${cur && !Pc.unit ? ` <em class="tier">tier ${cur + 1}</em>` : ''}${Pc.unit && cur ? ` <em class="tier">${cur}/${max}</em>` : ''}</b><div class="bdesc">${Pc.d}${t.def ? ` <b>${cur && !Pc.unit ? '' : '+'}${t.def} defence</b>` : ''}</div>
        <div class="rin"><span class="${b.pool >= c.s ? 'ok' : 'miss'}"><i class="stp">STEPS</i>${fmt(c.s)}</span>${matsHTML(c.m)}</div>${need ? '<div class="bdesc miss">Needs walls first</div>' : ''}</div>
        <button class="mbtn sm${ok ? '' : ' ghost'}" data-build="${k}"${ok ? '' : ' disabled'}>${cur && !Pc.unit ? 'Upgrade' : 'Build'}</button></div>`);
    }
    const broken = Object.keys(b.broken).filter(k => b.broken[k]);
    panel(`<div class="kick">Your base · defence ${B.defense()}</div><h3>Build</h3>
      <div class="poolline"><b>${fmt(b.pool)}</b> build steps <span>fills from every step you walk (houses are not affected)${mech() ? ' · Mechanic: 25% off' : ''}</span></div>
      ${broken.length ? `<button class="mbtn sm" id="bRep" style="width:100%;margin:6px 0">Repairs needed (${broken.length})</button>` : ''}
      ${rows.join('')}<button class="mbtn ghost" data-close>Close</button>`, 1);
    $('#msheet').querySelectorAll('[data-build]').forEach(bt => bt.onclick = () => {
      const k = bt.dataset.build, cur = b.built[k], c = costOf(k, cur + 1);
      if (!canPay(c)) { toast('Not enough build steps or materials', 1.6); return; }
      pay(c); b.built[k] = cur + 1;
      if (k === 'barrel' && cur === 0) b.water = { n: 1, d: dayNo() };
      if (k === 'walls') for (const id of wallIds()) delete b.broken[id];
      if (b.broken[k]) delete b.broken[k];
      G().save(); SFX.play('open'); syncPieces(); openBuild();
      toast(`Built: ${PIECES[k].tiers[cur].n}`, 1.8);
    });
    if ($('#bRep')) $('#bRep').onclick = () => repairSheet();
  }
  function repairSheet(only) {
    const b = base(), list = Object.keys(b.broken).filter(k => b.broken[k] && (!only || k === only || (only[0] === 'w' && k[0] === 'w')));
    const groups = {}; for (const id of list) { const k = id[0] === 'w' && id !== 'wire' ? 'walls' : id.startsWith('bed') ? 'beds' : id; (groups[k] = groups[k] || []).push(id); }
    const rows = Object.keys(groups).map(k => {
      const tier = Math.max(1, b.built[k] || 1), one = costOf(k, Math.min(tier, PIECES[k].tiers.length), true), n = k === 'walls' ? groups[k].length : 1;
      const c = { s: one.s * (k === 'walls' ? Math.min(3, n) / 3 : 1), m: one.m }; c.s = Math.ceil(c.s / 50) * 50;
      return { k, c, ids: groups[k], html: `<div class="recipe"><div class="rinfo"><b>${k === 'walls' ? `Wall sections (${n})` : PIECES[k].n}</b><div class="rin"><span class="${b.pool >= c.s ? 'ok' : 'miss'}"><i class="stp">STEPS</i>${fmt(c.s)}</span>${matsHTML(c.m)}</div></div><button class="mbtn sm${canPay(c) ? '' : ' ghost'}" data-rep="${k}">Repair</button></div>` };
    });
    panel(`<div class="kick">Your base</div><h3>Repairs</h3>${rows.length ? rows.map(r => r.html).join('') : '<div class="empty">Nothing is broken.</div>'}<button class="mbtn ghost" data-close>Close</button>`, 1);
    $('#msheet').querySelectorAll('[data-rep]').forEach(bt => bt.onclick = () => {
      const r = rows.find(x => x.k === bt.dataset.rep); if (!canPay(r.c)) { toast('Not enough build steps or materials', 1.6); return; }
      pay(r.c); for (const id of r.ids) delete b.broken[id]; if (DM.Crew) DM.Crew.onTask('tinkerer'); G().save(); SFX.play('open'); syncPieces(); repairSheet(); toast('Repaired', 1.4);
    });
  }

  // ---------------------------------------------------------------- decorate (edit mode)
  const occ = (layer, ignore) => { const s = new Set(); for (const o of base().decor) { if (o.id === ignore) continue; const d = D.DECOR[o.k], L = d.wall ? 'wall' : d.floor ? 'rug' : 'floor'; if (L !== layer) continue; const [w, h] = dims(o); for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) s.add((o.x + i) + ',' + (o.y + j)); } return s; };
  function fits(k, x, y, r, ignore) {
    const d = D.DECOR[k], [w, h] = dims({ k, r }), layer = d.wall ? 'wall' : d.floor ? 'rug' : 'floor', taken = occ(layer, ignore);
    for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) {
      const tx = x + i, ty = y + j, key = tx + ',' + ty;
      if (d.wall) { if (!WALLROW.has(key)) return 'Posters and lights go on the shack walls'; }
      else { if (!(inYard(tx, ty) || inShack(tx, ty))) return 'That spot is outside the yard'; if (RESERVED.has(key)) return 'Keep that spot clear (a build spot or a path)'; }
      if (taken.has(key)) return 'Something is already there';
    }
    if (!d.wall && !d.floor && d.solid !== 0) { const p = House().G.p, px = Math.floor(p.x / T), py = Math.floor(p.y / T); if (px >= x && px < x + w && py >= y && py < y + h) return "You're standing there"; }
    return null;
  }
  function decorAt(wx, wy) { // topmost placed decor under a tap
    let best = null, bk = -1e9;
    for (const o of base().decor) {
      const d = D.DECOR[o.k], [w, h] = dims(o), x = o.x * T, y = o.y * T;
      const top = d.wall ? y + T - 60 : d.floor ? y : y + h * T - d.H - 30, bot = d.wall ? y + T : y + h * T;
      if (wx >= x - 4 && wx <= x + w * T + 4 && wy >= top - 4 && wy <= bot + 4) { const k = d.floor ? bot - 1e4 : bot; if (k > bk) { bk = k; best = o; } }
    }
    return best;
  }
  function tapEdit(wx, wy) {
    if (!S.edit) return false;
    let tx = Math.floor(wx / T), ty = Math.floor(wy / T);
    if (S.pend) {
      const d = D.DECOR[S.pend], [w, h] = dims({ k: S.pend, r: 0 });
      if (d.wall && !WALLROW.has(tx + ',' + ty) && WALLROW.has(tx + ',' + (ty + 1))) ty++;
      const x = tx - Math.floor((w - 1) / 2), y = d.wall ? ty : ty - Math.floor((h - 1) / 2);
      const why = fits(S.pend, x, y, 0); if (why) { toast(why, 1.6); return true; }
      if (!takeDecor(S.pend)) { toast('You do not have that any more', 1.4); S.pend = null; editBar(); return true; }
      const o = { id: 'd' + (++base().seq), k: S.pend, x, y, r: 0 }; base().decor.push(o); S.sel = o.id; S.pend = null;
      G().save(); syncDecor(); SFX.play('pick'); editBar(); toast('Placed. Tap it to move, turn or store it.', 1.8); return true;
    }
    const o = decorAt(wx, wy);
    if (o) { S.sel = S.sel === o.id ? null : o.id; SFX.play('ui'); editBar(); return true; }
    const sel = base().decor.find(x => x.id === S.sel);
    if (sel) {
      const d = D.DECOR[sel.k], [w, h] = dims(sel);
      if (d.wall && !WALLROW.has(tx + ',' + ty) && WALLROW.has(tx + ',' + (ty + 1))) ty++;
      const x = tx - Math.floor((w - 1) / 2), y = d.wall ? ty : ty - Math.floor((h - 1) / 2);
      const why = fits(sel.k, x, y, sel.r, sel.id); if (why) { toast(why, 1.6); return true; }
      sel.x = x; sel.y = y; G().save(); syncDecor(); SFX.play('pick'); return true;
    }
    return true;
  }
  function decorCounts() { // what can be placed: the decor box, then stash, then pack
    const c = {}; for (const k in base().box) if (base().box[k] > 0) c[k] = (c[k] || 0) + base().box[k];
    for (const e of G().survivor.stash.concat(G().survivor.pack)) if (D.DECOR[e.k]) c[e.k] = (c[e.k] || 0) + e.n;
    return c;
  }
  function takeDecor(k) { const b = base(); if (b.box[k] > 0) { b.box[k]--; if (!b.box[k]) delete b.box[k]; return true; } return G().takeItems(k, 1).length > 0; }
  function openDecorBox() {
    const c = decorCounts(), ks = Object.keys(c);
    panel(`<div class="kick">Decorate</div><h3>Decor box</h3><p class="mp">Furniture, posters, rugs, lights and plants you find while looting. Pick one, then tap where it goes.</p>
      <div class="grid g4">${ks.length ? ks.map(k => `<button class="slot" data-dk="${k}">${icon(k)}<span>${D.ITEMS[k].n}</span>${c[k] > 1 ? `<i class="cnt">x${c[k]}</i>` : ''}</button>`).join('') : '<div class="empty">Nothing yet. Decor turns up in dressers, hutches, bookshelves and storage - more often in mansions and apartments.</div>'}</div>
      <button class="mbtn ghost" data-close style="margin-top:10px">Close</button>`, 1);
    $('#msheet').querySelectorAll('[data-dk]').forEach(bt => bt.onclick = () => { S.pend = bt.dataset.dk; S.sel = null; panelClose(); editBar(); });
  }
  function editBar() {
    const el = $('#editbar'), sel = S.sel && base().decor.find(o => o.id === S.sel);
    el.innerHTML = `<div class="ehint">${S.pend ? `Tap where the <b>${D.ITEMS[S.pend].n.toLowerCase()}</b> goes` : sel ? `<b>${D.ITEMS[sel.k].n}</b> · tap a spot to move it` : 'Tap decor to pick it up · walk with the joystick'}</div>
      <div class="erow">${S.pend ? '<button class="mbtn sm ghost" id="eCancel">Cancel</button>' : `<button class="mbtn sm" id="eBox">Decor box</button>${sel ? '<button class="mbtn sm ghost" id="eRot">Turn</button><button class="mbtn sm ghost" id="eStore">Store</button>' : ''}`}<button class="mbtn sm" id="eDone">Done</button></div>`;
    const on = (id, fn) => { const b = $('#' + id); if (b) b.onclick = e => { e.stopPropagation(); SFX.play('ui'); fn(); }; };
    on('eBox', openDecorBox); on('eCancel', () => { S.pend = null; editBar(); }); on('eDone', () => setEdit(false));
    on('eRot', () => { const d = D.DECOR[sel.k], r = (sel.r + 1) % 2; if (d.rot === 'swap') { const why = fits(sel.k, sel.x, sel.y, r, sel.id); if (why) { toast("No room to turn it here", 1.4); return; } } sel.r = r; G().save(); syncDecor(); });
    on('eStore', () => { const b = base(); b.decor = b.decor.filter(o => o !== sel); b.box[sel.k] = (b.box[sel.k] || 0) + 1; S.sel = null; G().save(); syncDecor(); editBar(); toast('Stored in the decor box', 1.2); });
  }
  function setEdit(on) { S.edit = on; S.sel = null; S.pend = null; document.body.classList.toggle('editing', on); if (on) editBar(); else $('#editbar').innerHTML = ''; hudSync(); }

  // ---------------------------------------------------------------- drawing hooks
  function drawUnder(c, g) {
    for (const o of base().decor) { const d = D.DECOR[o.k]; if (!d.floor) continue; const [w, h] = dims(o); rugArt(c, o.k, o.x * T, o.y * T, w * T, h * T); }
  }
  function glow(c, x, y, r, a) { const gl = c.createRadialGradient(x, y, 2, x, y, r); gl.addColorStop(0, `rgba(255,210,122,${a})`); gl.addColorStop(1, 'rgba(255,210,122,0)'); c.fillStyle = gl; c.fillRect(x - r, y - r, 2 * r, 2 * r); }
  function drawOver(c, g) {
    const b = base(), t = g.t;
    const lit = b.built.gen && !b.broken.gen ? 1.4 : 1;
    for (const o of b.decor) { const d = D.DECOR[o.k]; if (!d.glow) continue; const [w] = dims(o); const fl = 1 + Math.sin(t * 6 + o.x) * .04; glow(c, (o.x + w / 2) * T, d.wall ? o.y * T + T - 40 : o.y * T + T - d.H, (d.wall ? 70 : 95) * fl, .2 * lit); }
    if (b.built.gen && !b.broken.gen) glow(c, 9.5 * T, 13 * T, 6 * T, .12);
    // edit mode: build spots are off limits, the selection and (while placing) a soft grid
    if (S.edit) {
      c.lineWidth = 1.5;
      for (let y = FY0; y <= FY1; y++) for (let x = FX0; x <= FX1; x++) { const key = x + ',' + y; if ((inYard(x, y) || inShack(x, y)) && !RESERVED.has(key)) { c.strokeStyle = 'rgba(246,227,187,.10)'; c.strokeRect(x * T + 2, y * T + 2, T - 4, T - 4); } }
      if (S.pend && D.DECOR[S.pend].wall) for (const key of WALLROW) { const [x, y] = key.split(',').map(Number); c.strokeStyle = 'rgba(240,123,60,.6)'; c.setLineDash([5, 4]); c.strokeRect(x * T + 4, y * T + T - 58, T - 8, 44); c.setLineDash([]); }
      const sel = S.sel && b.decor.find(o => o.id === S.sel);
      if (sel) {
        const d = D.DECOR[sel.k], [w, h] = dims(sel), x = sel.x * T, y = sel.y * T;
        c.strokeStyle = P.ORA; c.lineWidth = 3; c.setLineDash([7, 5]); c.lineDashOffset = -t * 20;
        if (d.wall) c.strokeRect(x + 3, y + T - 60, w * T - 6, 50); else c.strokeRect(x + 2, y + 2, w * T - 4, h * T - 4);
        c.setLineDash([]);
      }
    }
    // watch shift: the tower points at zombies off screen; walls show damage
    if (S.shift) {
      for (const f of g.furn) if (f.fence && f.hp != null && f.hp < f.maxHp && !f.broken) { const x = f.x + f.w / 2 - 14, y = f.y - 26; ART.rr(c, x - 1, y - 1, 30, 7, 3); c.fillStyle = P.INK; c.fill(); ART.rr(c, x, y, 28 * Math.max(0, f.hp) / f.maxHp, 5, 2.5); c.fillStyle = f.hp < f.maxHp * .35 ? '#ff6b5a' : P.CRM; c.fill(); }
      if (b.built.tower && !b.broken.tower) {
        const vw = E.DEV.W / E.DEV.zoom, vh = E.DEV.H / E.DEV.zoom, cx = g.cam.x, cy = g.cam.y;
        for (const z of g.zs) {
          if (z.dead) continue;
          const dx = z.x - cx, dy = z.y - 40 - cy; if (Math.abs(dx) < vw / 2 - 10 && Math.abs(dy) < vh / 2 - 10) continue;
          const k = Math.min((vw / 2 - 30) / Math.abs(dx || 1), (vh / 2 - 120) / Math.abs(dy || 1)), ax = cx + dx * k, ay = cy + dy * k, a = Math.atan2(dy, dx);
          c.save(); c.translate(ax, ay); c.rotate(a); c.beginPath(); c.moveTo(14, 0); c.lineTo(-8, -10); c.lineTo(-3, 0); c.lineTo(-8, 10); c.closePath(); c.fillStyle = P.ORA; c.fill(); c.lineWidth = 2.4; c.strokeStyle = P.INK; c.stroke(); c.restore();
        }
      }
    }
  }

  // ---------------------------------------------------------------- watch shift (zombies vs walls)
  function stuckCheck(z, dt, moved) {
    const g = House().G;
    if (z.st === 'bash') {
      const f = z.bashF, p = g.p;
      if (!f || !f.solid || f.broken) { z.st = 'chase'; z.stT = 0; z.bashF = null; return; }
      if (Math.hypot(p.x - z.x, p.y - z.y) < 1.1 * T && p.st !== 'down' && Math.abs(p.y - z.y) < 30) { z.st = 'chase'; z.stT = 0; return; }
      z.hitT = (z.hitT || 0) - dt;
      if (z.hitT <= 0) {
        z.hitT = 1.2; f.hp -= 7 * (z.dmgMul || 1); f._key = null; SFX.play('thunk');
        for (let i = 0; i < 4; i++) g.parts.push({ x: f.x + f.w / 2 + (Math.random() - .5) * 20, y: f.y + f.h, z: 18 + Math.random() * 20, vx: (Math.random() - .5) * 80, vy: (Math.random() - .5) * 30, vz: 40 + Math.random() * 60, g: 400, life: .6, max: .6, col: f.tier === 1 ? '#a0704f' : '#9aa0b4', size: 3 });
        g.shake = Math.max(g.shake, 1.5);
        if (f.hp <= 0) { f.broken = true; f.solid = 0; f._key = null; House().refresh(); SFX.play('break'); toast(f.piece === 'gate' ? 'They broke the gate!' : 'A wall section gave way!', 1.8); z.st = 'chase'; z.stT = 0; }
      }
      return;
    }
    if (z.st !== 'chase' && z.st !== 'investigate') { z.stuck = 0; return; }
    if (moved < .2 * T * dt) z.stuck = (z.stuck || 0) + dt; else z.stuck = Math.max(0, (z.stuck || 0) - dt * 2);
    if (z.stuck < .5) return;
    let best = null, bd = .95 * T;
    for (const f of g.furn) { if (!f.fence || !f.solid) continue; const d = E.rectDist(z.x, z.y, { x: f.x, y: f.y, w: f.w, h: f.h }); if (d < bd) { bd = d; best = f; } }
    if (best) { z.st = 'bash'; z.stT = 0; z.bashF = best; z.hitT = .5; z.stuck = 0; z.flip = best.x + best.w / 2 > z.x; z.fx = z.flip ? 1 : -1; }
  }
  function ztick(z, dt, moved) {
    if (!S.shift) return;
    stuckCheck(z, dt, moved);
    // traps
    const tx = Math.floor(z.x / T), ty = Math.floor(z.y / T);
    z.trapT = Math.max(0, (z.trapT || 0) - dt);
    const tr = S.traps[tx + ',' + ty];
    if (tr && z.trapT <= 0) { z.trapT = tr === 'spikes' ? .55 : .8; House().hurtZombie(z, tr === 'spikes' ? 9 : 4, Math.atan2(z.vy, z.vx), true); }
  }
  const zslow = z => S.shift && S.traps[Math.floor(z.x / T) + ',' + Math.floor(z.y / T)] === 'wire' ? .4 : 1;
  function spawnWave(n) {
    const g = House().G, side = Math.floor(Math.random() * 4);
    for (let i = 0; i < n; i++) {
      let x, y;
      if (side === 0) { x = 2 + Math.random() * (MW - 4); y = .6; } else if (side === 1) { x = 2 + Math.random() * (MW - 4); y = MH - .5; }
      else if (side === 2) { x = .6; y = 3 + Math.random() * (MH - 6); } else { x = MW - .6; y = 3 + Math.random() * (MH - 6); }
      const tough = Math.random() < .2 + .02 * H.weekIndex(S.week);
      const z = House().spawn(x * T, y * T, { target: { x: 10 * T, y: 17 * T }, hunter: true, hp: tough ? 150 : 100, maxHp: tough ? 150 : 100 });
      if (tough) z.dmgMul = 1.2;
    }
    S.spawned += n; SFX.play('groan');
    toast(['Movement to the north...', 'Groaning from the south wall!', 'Shapes coming from the west...', 'They are at the east side!'][side], 1.6);
  }
  function tick(dt, g) {
    if (!S.shift) { if ((S.hudT -= dt) <= 0) { S.hudT = 1; hudSync(); } return; }
    const sh = S.sh; if (sh.over) return;
    sh.t += dt;
    const alive = g.zs.filter(z => !z.dead).length;
    if (sh.t > 3 && S.spawned < sh.total && sh.t >= sh.next && alive < 7) { spawnWave(Math.min(sh.total - S.spawned, 2 + Math.floor(Math.random() * 3))); sh.next = sh.t + 8 + Math.random() * 6; }
    if (sh.t >= H.SHIFT_MS / 1000 || (S.spawned >= sh.total && !alive && sh.t > 20) || g.p.st === 'down') endShift(g.p.st === 'down');
    const left = Math.max(0, H.SHIFT_MS / 1000 - sh.t), kills = g.stats.kills;
    const k = Math.ceil(left) + '|' + kills;
    if (k !== S.hk) { S.hk = k; $('#shiftbar').innerHTML = `<b>${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}</b><span>WATCH SHIFT</span><em>${kills} kill${kills === 1 ? '' : 's'}</em>`; }
  }
  function endShift(down) {
    const g = House().G, sh = S.sh; if (sh.over) return; sh.over = true;
    const kills = g.stats.kills, def = B.defense();
    B.recordShift(S.week, kills, def);
    g.paused = !down;
    const st = SV().horde.weeks[S.week], n = H.next();
    const card = () => {
      $('#cardBody').innerHTML = `<div class="kick">${down ? 'down · watch shift' : 'watch shift over'}</div><h2>${kills} zombie${kills === 1 ? '' : 's'} thinned</h2>
        <p>${down ? 'You went down, but every kill still counts against the horde.' : 'Good shift. Every kill thins the whole horde before it reaches the bases.'}</p>
        <div class="stats"><div><b>${kills}</b>kills</div><div><b>${st.k}</b>this week</div><div><b>${def}</b>defence</div><div><b>${st.n}/${H.MAX_SHIFTS}</b>shifts</div></div>
        <p class="mp">${H.partyCode() ? `Reported to party <b>${esc(H.partyCode())}</b>${window.NET && NET.ok ? '' : ' when you are back online'}.` : 'Solo horde: no party yet.'} The horde hits at ${n ? when(n.at) : 'the deadline'}.</p>
        <div class="btnrow"><button id="cNew">Head inside</button></div>`;
      $('#card').classList.add('on');
      $('#cNew').onclick = () => { $('#card').classList.remove('on'); House().exit(down ? 'down' : 'leave'); };
    };
    setTimeout(card, down ? 300 : 600);
  }
  B.recordShift = function (week, kills, def) {
    const h = SV().horde, w = h.weeks[week] = h.weeks[week] || { k: 0, n: 0, d: 0 };
    w.k += kills; w.n++; w.d = def;
    const code = H.partyCode();
    if (code) { h.pending.push({ code, week, k: kills, d: def }); H.flush(h).then(() => G().save()); }
    G().save();
  };

  // ---------------------------------------------------------------- HUD + start/stop
  function hudSync() {
    if (!S) return;
    const b = base();
    $('#bpool').innerHTML = `<i>BUILD STEPS</i><b>${fmt(b.pool)}</b>`;
    $('#bdef').innerHTML = `<i>DEFENCE</i><b>${B.defense()}</b>`;
  }
  B.start = function (o = {}) {
    if (DM.scene) return;
    const shift = !!o.shift, w = H.next();
    S = { shift, edit: false, sel: null, pend: null, hudT: 0, spawned: 0, week: o.week || (w && w.week), traps: {}, sh: { t: 0, total: Math.round((14 + 2 * Math.min(6, H.weekIndex((w && w.week) || H.FIRST_WEEK))) * H.special(o.week || (w && w.week)).size), next: 3.5, over: false } };
    const b = base(); barrels();
    for (const k of ['spikes', 'wire']) if (b.built[k] && !b.broken[k]) for (const [x, y] of trapTiles(k, b.built[k])) S.traps[x + ',' + y] = k;
    const L = layout();
    L.furn = pieceFurn().concat(b.decor.filter(o => !D.DECOR[o.k].floor).map(decorFurn));
    if (shift) L.start = { x: 10, y: 17.5 };
    document.body.classList.add('atbase'); document.body.classList.toggle('shift', shift);
    const O = {
      hint: shift ? 'Hold the yard! Zombies come from every side.' : 'Your base · tap BUILD to add walls, beds and more',
      noFog: true, noExit: true, acts, tick, ztick, zslow, tap: tapEdit, drawUnder, drawOver,
      onDown: () => { if (shift) endShift(true); else House().exit('down'); },
      onExit: res => {
        document.body.classList.remove('atbase', 'shift', 'editing'); $('#editbar').innerHTML = ''; $('#shiftbar').innerHTML = '';
        const was = S; S = null; panelClose();
        if (o.onExit) o.onExit(res, was);
      },
    };
    House().start(L, DM.Crew ? DM.Crew.wrap(O, shift ? 'shift' : 'base', { yard: { x0: FX0 + 1, x1: FX1 - 1, y0: SY1 + 2, y1: FY1 - 1 }, edit: () => S && S.edit }) : O);
    const g = House().G;
    for (const f of g.furn) { thin(f); if (shift && f.fence) f.maxHp = f.hp = (f.piece === 'gate' ? PIECES.gate : PIECES.walls).tiers[f.tier - 1].hp; }
    House().refresh();
    if (shift) { g.cam.y = g.p.y - 60; g.banners.push({ text: 'WATCH SHIFT', sub: 'they are coming', t: 0 }); }
    hudSync();
  };
  B.active = () => !!S;
  B.isShift = () => !!(S && S.shift);
  B.defenseNow = () => B.defense();
  B.openBuild = openBuild;
  B.until = until; B.when = when;
  function until(at) { const s = Math.max(0, (at - H.now()) / 1000), d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60); return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`; }
  function when(at) { try { return new Date(at).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' }); } catch (e) { return 'Sunday night'; } }

  // HUD buttons (DOM in index.html)
  const bind = (id, fn) => { const el = $('#' + id); if (el) el.addEventListener('click', e => { e.stopPropagation(); SFX.init(); SFX.play('ui'); fn(); }); };
  bind('bHome', () => { if (S && !S.shift) House().exit('leave'); else if (S && S.shift && confirmQuit()) endShift(false); });
  bind('bBuild', () => { if (S && !S.shift) { setEdit(false); openBuild(); } });
  bind('bEdit', () => { if (S && !S.shift) setEdit(!S.edit); });
  let quitT = 0;
  function confirmQuit() { const n = performance.now(); if (n - quitT < 2500) return true; quitT = n; toast('Tap again to end the shift early', 1.8); return false; }

  // ---------------------------------------------------------------- horde night resolution (after the deadline)
  B.hordeDamage = function (rnd) { // one random built piece breaks
    const b = base(), c = [];
    if (b.built.walls) { const ok = wallIds().filter(i => !b.broken[i]); if (ok.length) { const s = Math.floor(rnd() * ok.length); c.push({ ids: [ok[s], ok[(s + 1) % ok.length], ok[(s + 2) % ok.length]], n: 'A wall section' }); } }
    for (const k of ['gate', 'tower', 'gen', 'spikes', 'wire', 'barrel']) if (b.built[k] && !b.broken[k]) c.push({ ids: [k], n: 'The ' + PIECES[k].n.toLowerCase() });
    const beds = b.beds.map((p, i) => p && i < b.built.beds && !B.plantState(p).dead ? i : -1).filter(i => i >= 0);
    if (beds.length) c.push({ garden: beds, n: 'The garden' });
    if (!c.length) return null;
    const pick = c[Math.floor(rnd() * c.length)];
    if (pick.garden) for (const i of pick.garden) b.beds[i] = null;
    else for (const id of pick.ids) b.broken[id] = true;
    if (pick.ids && pick.ids[0] === 'barrel') b.water.n = 0;
    return pick.n;
  };
  B.devDay = function () { // test panel: pretend a day passed for the garden and barrels
    const b = base(); for (const p of b.beds) if (p) { p.d0--; p.w = (p.w || []).map(d => d - 1); } b.water.d--;
  };
})();
