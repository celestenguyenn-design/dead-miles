/* Dead Miles (next) 0.29 - things to do on the map while you keep walking (owner: "a more interactive map that i wont
   be stopping to play" -> "Radio calls, dots deliveries, supply drops, and maybe fog of war").
   All four only run while the map is open (a web page gets no location otherwise) and work in Pocket mode.
   - Supply drops: 3 crates a day at real places 120-450 m from you (shops / houses on the map); walk within ~25 m to
     collect (crate loot to the stash). Plus 1 air drop a day after 300 m of walking with the map open: 20 minutes, better
     loot (horde-crate rolls + a capsule token chance).
   - Radio calls: after 200 m walked, up to 2 a day: a survivor names a real place 300-700 m away and a deadline (walking
     time x 1.6 + 4 min). Make it in time: caps, XP, a supply bundle.
   - Dot's deliveries: 1 a day, offered on the map card: pick up at a place 150-450 m away, carry it to one 400-900 m
     further. Caps, XP, sometimes a capsule token.
   - Fog of war: the map is fogged except ~25 m squares you have walked; new squares give XP now and then and a small
     find sometimes; 250 / 1,000 / 3,000 / 10,000 squares cleared -> caps + capsule tokens.
   PRIVACY: mission spots and cleared squares stay on this phone (localStorage dm-next-mapfx), never in the save or
   the cloud - the same rule as the rest of the map. Rewards go into the save as plain items / caps / XP. */
'use strict';
window.DM = window.DM || {};
(() => {
  const X = DM.MapFX = {};
  const KEY = 'dm-next-mapfx', CELL_LAT = .000225, CELL_LON = .0003;   // ~25 m squares around New York
  const G = () => DM.Game, SV = () => DM.Game && DM.Game.data();
  const toast = (m, s) => DM.E && DM.E.toast && DM.E.toast(m, s || 2.6);
  const sfx = k => { try { DM.E.SFX.play(k); } catch (e) { /* ignore */ } };
  const buzz = p => { if (navigator.vibrate) try { navigator.vibrate(p); } catch (e) { /* ignore */ } };
  const dist = (a, b) => { const R = 6371000, r = Math.PI / 180, dLa = (b.lat - a.lat) * r, dLo = (b.lon - a.lon) * r; const q = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLo / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(q)); };
  const fmtD = d => d < 1000 ? Math.max(5, Math.round(d / 5) * 5) + ' m' : (d / 1000).toFixed(1) + ' km';
  const mmss = ms => { const s = Math.max(0, Math.round(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  let S = null;
  function st() {
    if (S) return S;
    try { S = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { S = null; }
    S = Object.assign({ day: '', drops: [], dropsMade: 0, air: 0, radios: 0, radio: null, deliv: null, delivDone: 0, cells: {}, nCells: 0, cellMs: [] , fogOn: true }, S || {});
    return S;
  }
  let saveT = 0; const save = () => { clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* full */ } }, 400); };
  function newDay() { const s = st(), t = today(); if (s.day !== t) { s.day = t; s.drops = s.drops.filter(d => d.air && d.until > Date.now()); s.dropsMade = 0; s.air = 0; s.radios = 0; s.delivDone = 0; if (s.radio && s.radio.until < Date.now()) s.radio = null; save(); } }
  // real places to send her to: shops, landmarks and houses the map knows, between lo and hi metres away
  function spots(pos, lo, hi) { const M = DM.Map && DM.Map._M; if (!M) return []; return Object.values(M.places).map(pl => [pl, dist(pl, pos)]).filter(([, d]) => d >= lo && d <= hi); }
  const pick = a => a[Math.floor(Math.random() * a.length)];
  // ---------------------------------------------------------------- rewards (into the save)
  function give(items) {   // 0.43: same items merged ("3 9mm rounds", not "9mm rounds, 9mm rounds, 9mm rounds")
    const m = new Map(); for (const [k, n] of items) m.set(k, (m.get(k) || 0) + n);
    const merged = [...m].map(([k, n]) => ({ k, n })), lost = G().routeApi.toStash(merged.map(e => Object.assign({}, e)));
    return merged.filter(e => DM.D.ITEMS[e.k] && !DM.D.ITEMS[e.k].cos).map(e => `${e.n > 1 ? e.n + ' ' : ''}${DM.D.ITEMS[e.k].n.toLowerCase()}`).join(', ') + (lost && lost.length ? ' (stash full - some left behind)' : '');
  }
  function rollItems(table, rolls) { const r = []; for (let i = 0; i < rolls; i++) for (const k of DM.D.rollLoot(table, Math.random)) r.push([k, 1]); return r; }
  function caps(n) { SV().trader.caps += n; }
  function xp(n) { if (DM.Skills && DM.Skills.addXP) DM.Skills.addXP(n); }
  function token(chance) { if (DM.Gacha && Math.random() < chance) { DM.Gacha.state().tok++; return true; } return false; }
  function reward(kick, title, lines) { G().save(); sfx('pick'); setTimeout(() => sfx('open'), 220); buzz([80, 50, 120]); toast(`${kick}: ${title} - ${lines}`, 4); X.last = `${kick}: ${lines}`; }
  // ---------------------------------------------------------------- per position fix
  X.onPos = function (pos, walked) {
    if (!pos || pos.acc > 60 || !SV() || !SV().survivor) return;
    newDay(); const s = st(), now = Date.now();
    // fog: the ~25 m square she is in and its neighbours
    let fresh = 0;
    const cy = Math.floor(pos.lat / CELL_LAT), cx = Math.floor(pos.lon / CELL_LON);
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const k = (cy + a) + ':' + (cx + b); if (!s.cells[k]) { s.cells[k] = 1; s.nCells++; fresh++; } }
    if (fresh) {
      if (s.nCells % 40 < fresh) xp(3);
      if (Math.random() < .004 * fresh) { const f = pick([['scrap', 2], ['cloth', 2], ['beans', 1], ['water', 1], ['bandage', 1], ['battery', 1], ['tape', 1]]); toast(`New street - you found ${give([f])}`, 2.6); G().save(); }
      for (const [n, c, tk] of [[250, 40, 1], [1000, 100, 2], [3000, 200, 3], [10000, 500, 5]]) if (s.nCells >= n && !s.cellMs.includes(n)) { s.cellMs.push(n); caps(c); if (DM.Gacha) DM.Gacha.state().tok += tk; reward('🌫️ Explorer', `${n.toLocaleString('en-US')} squares cleared`, `${c} caps, ${tk} capsule token${tk > 1 ? 's' : ''}`); }
      save();
    }
    // supply drops: keep up to 2 on the map, 3 a day; the air drop after 300 m
    s.drops = s.drops.filter(d => !d.air || d.until > now);
    if (s.drops.filter(d => !d.air).length < 2 && s.dropsMade < 3) { const sp = spots(pos, 120, 450); if (sp.length) { const [pl] = pick(sp); s.drops.push({ id: 'd' + now, lat: pl.lat, lon: pl.lon, at: pl.name }); s.dropsMade++; save(); toast(`📦 A supply crate landed near ${pl.name} (${fmtD(dist(pl, pos))})`, 3); } }
    if (!s.air && walked >= 300) { const sp = spots(pos, 200, 500); if (sp.length) { const [pl] = pick(sp); s.air = 1; s.drops.push({ id: 'a' + now, air: 1, lat: pl.lat, lon: pl.lon, at: pl.name, until: now + 20 * 60000 }); save(); sfx('alert'); buzz([200, 100, 200]); toast(`✈️ Air drop near ${pl.name} - 20 minutes before raiders get it!`, 4); } }
    for (const d of s.drops.slice()) if (dist(d, pos) <= 25 + Math.min(15, pos.acc / 2)) {
      s.drops = s.drops.filter(x => x !== d); save();
      if (d.air) { caps(30); const tk = token(.5); reward('✈️ Air drop', d.at, give(rollItems('hordecrate', 2)) + ', 30 caps' + (tk ? ', a capsule token' : '')); }
      else reward('📦 Supply crate', d.at, give(rollItems('storage', 1).concat(rollItems('crate', 1)).concat(DM.Weather && DM.Weather.night && DM.Weather.night() ? rollItems('storage', 1).slice(0, 1) : [])));   // 0.39: night crates hold one more
    }
    // radio call
    if (s.radio && s.radio.until < now) { toast(`📻 The radio goes quiet. You did not make it to ${s.radio.at} in time.`, 3.4); s.radio = null; save(); }
    if (!s.radio && s.radios < 2 && walked >= 200 && Math.random() < .05) {
      const sp = spots(pos, 300, 700); if (sp.length) { const [pl, d] = pick(sp); const mins = Math.ceil(d / 80 * 1.6 + 4);
        s.radio = { lat: pl.lat, lon: pl.lon, at: pl.name, until: now + mins * 60000 }; s.radios++; save(); sfx('alert'); buzz([100, 60, 100, 60, 100]);
        toast(`📻 "Anyone out there? Meet me at ${pl.name}. ${mins} minutes, then I'm gone."`, 4.5); }
    }
    if (s.radio && dist(s.radio, pos) <= 30 + Math.min(15, pos.acc / 2)) { const r = s.radio; s.radio = null; save(); caps(35); xp(20); reward('📻 Radio call', r.at, give([pick([['meds', 1], ['ammo', 6], ['bandage', 3], ['battery', 2], ['lockpick', 3]])]) + ', 35 caps, 20 XP'); }
    // Dot's delivery
    const dv = s.deliv;
    if (dv && !dv.got && dist(dv.a, pos) <= 30 + Math.min(15, pos.acc / 2)) { dv.got = 1; save(); sfx('pick'); buzz([60, 40, 60]); toast(`🚚 Picked up Dot's package. Now take it to ${dv.b.at} (${fmtD(dist(dv.b, pos))}).`, 3.6); }
    else if (dv && dv.got && dist(dv.b, pos) <= 30 + Math.min(15, pos.acc / 2)) { s.deliv = null; s.delivDone++; save(); const c = 45 + Math.round(dv.len / 40); caps(c); xp(25); const tk = token(.35); reward("🚚 Dot's delivery", dv.b.at, `${c} caps, 25 XP${tk ? ', a capsule token' : ''}`); }
    if (DM.MapQ) DM.MapQ.onPos(pos, walked);   // 0.31: quests and encounters
    if (DM.MapPOI) DM.MapPOI.onPos(pos);   // 0.43: made-up places
  };
  // 0.31: map quests (mapquest.js) use these
  X.spots = (pos, lo, hi) => spots(pos, lo, hi); X.give = items => give(items); X.rollItems = (t, n) => rollItems(t, n);
  // ---------------------------------------------------------------- Dot's delivery offer (map card button)
  X.canOffer = () => { const s = st(); newDay(); return !s.deliv && s.delivDone < 1; };
  X.offer = function (pos) {
    const s = st(); if (!pos) return toast('Waiting for your location...', 2);
    const A = spots(pos, 150, 450); if (!A.length) return toast('No pick-up spot nearby yet - walk a little and try again', 2.4);
    const [a] = pick(A); const B = spots(a, 400, 900).filter(([pl]) => pl.id !== a.id); if (!B.length) return toast('No drop-off spot found yet - try again further on', 2.4);
    const [b, len] = pick(B);
    s.deliv = { a: { lat: a.lat, lon: a.lon, at: a.name }, b: { lat: b.lat, lon: b.lon, at: b.name }, len: Math.round(len + dist(a, pos)), got: 0 }; save();
    sfx('pick'); toast(`🚚 Dot: "Pick up a package at ${a.name}, take it to ${b.name}. Don't open it, sugar."`, 4.5);
  };
  X.cancelDeliv = () => { st().deliv = null; save(); };
  // ---------------------------------------------------------------- what to show (map card / pocket mode)
  X.lines = function (pos) {
    const s = st(), out = [], now = Date.now(); if (!pos) return out;
    if (s.radio) out.push({ t: `📻 ${s.radio.at}`, s: `${fmtD(dist(s.radio, pos))} · ${mmss(s.radio.until - now)} left`, hot: 1 });
    for (const d of s.drops) out.push({ t: `${d.air ? '✈️ Air drop' : '📦 Crate'} · ${d.at}`, s: fmtD(dist(d, pos)) + (d.air ? ` · ${mmss(d.until - now)} left` : ''), hot: d.air });
    if (s.deliv) { const tgt = s.deliv.got ? s.deliv.b : s.deliv.a; out.push({ t: `🚚 ${s.deliv.got ? 'Deliver to' : 'Pick up at'} ${tgt.at}`, s: fmtD(dist(tgt, pos)) }); }
    if (DM.MapQ) return DM.MapQ.lines(pos).concat(out, DM.MapPOI ? DM.MapPOI.lines(pos) : []);   // 0.31: quests first; 0.43 the nearest made-up place
    return out;
  };
  X.cells = () => st().nCells;
  X.reveal = (pos, m) => { const s = st(), cy = Math.floor(pos.lat / CELL_LAT), cx = Math.floor(pos.lon / CELL_LON), ry = Math.ceil(m / 25), rx = Math.ceil(m / 25); let n = 0; for (let a = -ry; a <= ry; a++) for (let b = -rx; b <= rx; b++) { if (a * a + b * b > ry * ry) continue; const k = (cy + a) + ':' + (cx + b); if (!s.cells[k]) { s.cells[k] = 1; s.nCells++; n++; } } save(); return n; };   // 0.43: the radio tower clears the fog around it
  X.fogOn = () => st().fogOn;
  X.toggleFog = () => { st().fogOn = !st().fogOn; save(); };
  // ---------------------------------------------------------------- drawing (map.js calls these each frame)
  // fog of war: dark squares over every ~25 m square not walked yet, inside the view
  X.drawFog = function (x, SX, SY, wx, wy, W, H) {
    const s = st(); if (!s.fogOn) return;
    const M = DM.Map._M, c = M.cam; if (!M.pos && !M.guess) return;
    // the view's corners in lat/lon (the metre frame is flat: x east, y south)
    const O = DM.Map._O; if (!O || !O.set) return;
    const toLat = y => O.lat - y / O.ky, toLon = xm => O.lon + xm / O.kx;
    const x0 = c.x - W / 2 / c.s, x1 = c.x + W / 2 / c.s, y0 = c.y - H / 2 / c.s, y1 = c.y + H / 2 / c.s;
    const la0 = Math.floor(toLat(y1) / CELL_LAT), la1 = Math.floor(toLat(y0) / CELL_LAT), lo0 = Math.floor(toLon(x0) / CELL_LON), lo1 = Math.floor(toLon(x1) / CELL_LON);
    if ((la1 - la0) * (lo1 - lo0) > 6000) return;   // zoomed far out: skip
    x.fillStyle = 'rgba(14,11,32,.58)';
    for (let a = la0; a <= la1; a++) for (let b = lo0; b <= lo1; b++) {
      if (s.cells[a + ':' + b]) continue;
      const sx0 = SX(wx(b * CELL_LON)), sx1 = SX(wx((b + 1) * CELL_LON)), sy0 = SY(wy((a + 1) * CELL_LAT)), sy1 = SY(wy(a * CELL_LAT));
      x.fillRect(sx0, sy0, sx1 - sx0 + .6, sy1 - sy0 + .6);
    }
  };
  function mark(x, sx, sy, glyph, col, t, label) {
    const bob = Math.sin(t * 3) * 3;
    x.beginPath(); x.arc(sx, sy - 22 + bob, 17, 0, 6.28); x.fillStyle = col; x.fill(); x.lineWidth = 3; x.strokeStyle = '#11142f'; x.stroke();
    x.font = '18px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(glyph, sx, sy - 21 + bob);
    if (label) { x.font = '800 11px Inter, system-ui, sans-serif'; x.lineWidth = 3.5; x.strokeStyle = '#11142f'; x.strokeText(label, sx, sy + 6); x.fillStyle = '#f6e3bb'; x.fillText(label, sx, sy + 6); }
    x.textBaseline = 'alphabetic';
  }
  X.drawMarks = function (x, t, SX, SY, wx, wy) {
    const s = st(), now = Date.now();
    for (const d of s.drops) mark(x, SX(wx(d.lon)), SY(wy(d.lat)), d.air ? '✈️' : '📦', d.air ? '#f0c23d' : '#93a86c', t, d.air ? mmss(d.until - now) : '');
    if (s.radio) mark(x, SX(wx(s.radio.lon)), SY(wy(s.radio.lat)), '📻', '#7ee0d8', t, mmss(s.radio.until - now));
    if (s.deliv) { const g = s.deliv.got ? s.deliv.b : s.deliv.a; mark(x, SX(wx(g.lon)), SY(wy(g.lat)), '🚚', '#f07b3c', t, s.deliv.got ? 'drop off' : 'pick up'); }
    if (DM.MapPOI) DM.MapPOI.drawMarks(x, t, SX, SY, wx, wy);   // 0.43
    if (DM.MapQ) DM.MapQ.drawMarks(x, t, SX, SY, wx, wy);
  };
  X.mark = mark;
})();
