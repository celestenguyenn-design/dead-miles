/* Dead Miles (next) - seasonal events calendar (phase 5a).
   Each event: id, name, a local-date window (computed per year), loot additions, a mini-boss that turns up in
   about 1 in 3 generated houses, a trader event quest chain from Auntie Dot, limited cosmetics (tagged
   "<Name> <year>" in the wardrobe), a UI accent, and optionally a special horde night.
   The active event is decided ONCE at load (the loot tables are patched at load), so a page left open past
   midnight on the last day keeps the event until the next reload - the 60 s check in game.js reloads the
   home screen anyway. Loaded before data.js. Plain script, global DM.Events. Works offline. */
'use strict';
window.DM = window.DM || {};
(() => {
  const pad = n => String(n).padStart(2, '0');
  const key = (y, m, d) => { const t = new Date(y, m - 1, d); return t.getFullYear() + '-' + pad(t.getMonth() + 1) + '-' + pad(t.getDate()); };
  const dayNum = k => { const [y, m, d] = k.split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / 864e5); };
  const todayKey = (dt = new Date()) => dt.getFullYear() + '-' + pad(dt.getMonth() + 1) + '-' + pad(dt.getDate());
  // US Thanksgiving: the 4th Thursday of November
  const thanksDay = y => { const w = new Date(y, 10, 1).getDay(); return 1 + (4 - w + 7) % 7 + 21; };

  const CAL = {
    thanksgiving: {
      id: 'thanksgiving', name: 'Thanksgiving', short: 'Thanksgiving',
      // Thanksgiving week: the Friday before to the Tuesday after (2026: Nov 20 - Dec 1, Thanksgiving is Thu Nov 26)
      window: y => { const t = thanksDay(y); return { start: key(y, 11, t - 6), end: key(y, 11, t + 5) }; },
      accent: { c: '#f07b3c', c2: '#c95f2c', ink: '#11142f', bg: '#3a1f1a', glyph: 'leaf' },
      blurb: 'Zombie turkeys are loose in about 1 in 3 yards and kitchens. Holiday food turns up in fridges and pantries.',
      loot: { fridge: { cranberry: 2, pie: 2 }, pantry: { stuffing: 3, cranberry: 2 }, cabinet: { stuffing: 2, cranberry: 1 }, store: { cranberry: 2, stuffing: 2 }, storage: { stuffing: 1, pie: 1 } },
      boss: { kind: 'turkey', name: 'Zombie turkey', chance: 1 / 3, hp: 170, props: { hw: 10, hh: 7 }, tutorial: true },
      cos: ['pilgrim', 'feathers', 'pietin', 'harvest'],
      // Dot's event job chain (one at a time, on top of the normal 2 jobs)
      quests: [
        { id: 'dinner', n: "The block's dinner", d: "Bring Dot a whole turkey and 3 pumpkin pies for the block's dinner.", give: [['turkey', 1], ['pie', 3]], caps: 40, cos: 'pietin' },
        { id: 'fixings', n: 'The fixings', d: 'Nobody eats turkey dry, sugar. Bring 3 cranberry sauce and 3 stuffing mix.', give: [['cranberry', 3], ['stuffing', 3]], caps: 30, cos: 'harvest' },
        { id: 'gobble', n: 'Gobble patrol', d: 'Those birds keep the kids up all night. Put down 2 zombie turkeys.', kills: 2, caps: 60, items: [['pie', 2], ['meds', 1]] },
      ],
      // the party horde on the Sunday after Thanksgiving is the Black Friday horde: bigger, better crates
      horde: y => ({ week: key(y, 11, thanksDay(y) + 3), name: 'Black Friday horde', size: 1.35, crate: 'hordecrate_bf', caps: 25 }),
    },
    christmas: {
      id: 'christmas', name: 'Christmas', short: 'Christmas',
      window: y => ({ start: key(y, 12, 18), end: key(y + 1, 1, 2) }),
      accent: { c: '#d9483a', c2: '#9e2f2a', ink: '#11142f', bg: '#16302a', glyph: 'flake', snow: 1 },
      blurb: 'Snow on the block. The Krampus walker (a big one in a Santa hat) haunts about 1 in 3 houses. Gift boxes turn up in closets - open them at home.',
      loot: { hutch: { gift: .8 }, side: { gift: .6 }, coat: { gift: .5 }, dresser: { gift: .4 }, wardrobe: { gift: .5 }, cellar: { gift: .5 }, store: { candy: 3 }, cabinet: { candy: 1.5 }, pantry: { candy: 2 } },
      boss: { kind: 'krampus', name: 'Krampus walker', chance: 1 / 3, hp: 320, props: { hw: 13, hh: 9, dmgMul: 1.4 } },
      cos: ['santa', 'candycane'],
      quests: [
        { id: 'wrap', n: 'Wrap it up', d: 'The kids on Macon St get something this year. Bring Dot 3 gift boxes - unopened, baby.', give: [['gift', 3]], caps: 40, cos: 'candycane' },
        { id: 'krampus', n: 'Naughty list', d: 'Something big in a Santa hat is walking the block. Put down 2 Krampus walkers.', kills: 2, caps: 80, items: [['candy', 3], ['meds', 2]] },
      ],
    },
  };
  const ORDER = ['thanksgiving', 'christmas'];

  // the window that contains date dt (checks this year's and last year's, for windows that cross New Year)
  function windowAt(ev, dt) {
    const k = todayKey(dt), y = dt.getFullYear();
    for (const yy of [y, y - 1]) { const w = ev.window(yy); if (k >= w.start && k <= w.end) return Object.assign({ y: yy }, w); }
    return null;
  }
  function nextWindow(ev, dt) { // the next window starting after today
    const k = todayKey(dt), y = dt.getFullYear();
    for (const yy of [y, y + 1]) { const w = ev.window(yy); if (w.start > k) return Object.assign({ y: yy }, w); }
    return null;
  }

  // forcing an event for tests: ?event=<id|none>, #thanksgiving (0.4-0.5 links), or the dev panel (local test copies only)
  const DEV_OK = !/github\.io$/i.test(location.hostname);
  function forcedId() {
    try {
      const m = /[?&]event=([a-z]+)/.exec(location.search); if (m) return m[1];
      if (location.hash === '#thanksgiving') return 'thanksgiving';
      if (DEV_OK) { const v = localStorage.getItem('dm-next-event'); if (v && v !== 'auto') return v; }
    } catch (e) { /* storage blocked */ }
    return null;
  }

  const EV = DM.Events = { CAL, ORDER, todayKey, dayNum };
  EV.get = id => CAL[id] || null;
  // { id, ev, y, start, end, forced } for the event running at dt, or null
  EV.at = function (dt = new Date(), allowForce = true) {
    const f = allowForce ? forcedId() : null;
    if (f === 'none') return null;
    if (f && CAL[f]) { const ev = CAL[f], w = windowAt(ev, dt) || nextWindow(ev, dt) || ev.window(dt.getFullYear()); return { id: f, ev, y: w.y || dt.getFullYear(), start: w.start, end: w.end, forced: !windowAt(ev, dt) }; }
    for (const id of ORDER) { const w = windowAt(CAL[id], dt); if (w) return { id, ev: CAL[id], y: w.y, start: w.start, end: w.end, forced: false }; }
    return null;
  };
  EV.active = EV.at();
  EV.dev = { ok: DEV_OK, choice: () => { try { return localStorage.getItem('dm-next-event') || 'auto'; } catch (e) { return 'auto'; } }, set: v => { try { localStorage.setItem('dm-next-event', v); } catch (e) { /* ignore */ } } };
  // days left including today (1 on the last day)
  EV.daysLeft = (a = EV.active, dt = new Date()) => a ? dayNum(a.end) - dayNum(todayKey(dt)) + 1 : 0;
  // the next event that starts within `within` days (for a teaser banner), or null
  EV.upcoming = function (dt = new Date(), within = 14) {
    if (EV.active) return null;
    let best = null;
    for (const id of ORDER) { const w = nextWindow(CAL[id], dt); if (!w) continue; const n = dayNum(w.start) - dayNum(todayKey(dt)); if (n <= within && (!best || n < best.days)) best = { id, ev: CAL[id], y: w.y, start: w.start, end: w.end, days: n }; }
    return best;
  };
  // event label used on cosmetics: "Thanksgiving 2026"
  EV.label = (id, y) => CAL[id] ? CAL[id].name + ' ' + y : '';
  EV.cosEvent = c => { for (const id of ORDER) if (CAL[id].cos.includes(c)) return id; return null; };
  // which year a cosmetic belongs to: the year it was earned, else this/next run of its event
  EV.cosTag = function (c, ownedAt) {
    const id = EV.cosEvent(c); if (!id) return '';
    if (ownedAt) { const d = new Date(ownedAt), w = windowAt(CAL[id], d); return EV.label(id, w ? w.y : d.getFullYear()); }
    const a = EV.active && EV.active.id === id ? EV.active : null, w = a || windowAt(CAL[id], new Date()) || nextWindow(CAL[id], new Date());
    return EV.label(id, w ? w.y : new Date().getFullYear());
  };
  // a special horde night for this horde week ('YYYY-MM-DD', the Sunday), or null
  EV.hordeFor = function (week) {
    if (!week) return null;
    const a = EV.active;
    if (a && a.forced && DEV_OK && a.ev.horde) return Object.assign({ ev: a.id }, a.ev.horde(a.y), { week });   // local tests only (the party must agree on the size)
    const y = +week.slice(0, 4);
    for (const id of ORDER) { const ev = CAL[id]; if (!ev.horde) continue; for (const yy of [y, y - 1]) { const h = ev.horde(yy); if (h.week === week) return Object.assign({ ev: id }, h); } }
    return null;
  };
  // the mini-boss for a layout: { kind, name, hp, props, x, y, room } or null.
  // Generated houses carry L.boss = { roll, roll2, yard, kitchen } (gen.js); the tutorial house has a fixed yard spot.
  EV.bossFor = function (L) {
    const a = EV.active; if (!a || !a.ev.boss || !L) return null;
    const B = a.ev.boss;
    let spot = null;
    if (L.type === 'tutorial' || L.id === 'tutorial') { if (B.tutorial && L.turkey) spot = Object.assign({ where: 'yard' }, L.turkey); }
    else if (L.boss && L.boss.roll < B.chance) spot = L.boss.kitchen && L.boss.roll2 < .5 ? Object.assign({ where: 'kitchen' }, L.boss.kitchen) : Object.assign({ where: 'yard' }, L.boss.yard);
    return spot ? Object.assign({ kind: B.kind, name: B.name, hp: B.hp, props: B.props || {} }, spot) : null;
  };
  // small badge glyphs (inline SVG) for chips and banners
  const GLYPH = {
    leaf: '<svg viewBox="0 0 20 20" width="14" height="14"><path d="M10 1 L12 6 L17 4 L15 9 L19 11 L14 13 L15 18 L10 15 L5 18 L6 13 L1 11 L5 9 L3 4 L8 6 Z" fill="#f6e3bb" stroke="#11142f" stroke-width="1.4" stroke-linejoin="round"/><path d="M10 15 L10 20" stroke="#11142f" stroke-width="1.6"/></svg>',
    flake: '<svg viewBox="0 0 20 20" width="14" height="14"><g stroke="#11142f" stroke-width="3.4" stroke-linecap="round"><path d="M10 2v16M3 6l14 8M3 14l14-8"/></g><g stroke="#f6e3bb" stroke-width="1.8" stroke-linecap="round"><path d="M10 2v16M3 6l14 8M3 14l14-8"/></g></svg>',
  };
  EV.glyph = id => CAL[id] ? GLYPH[CAL[id].accent.glyph] || '' : '';
  EV.bossName = kind => { for (const id of ORDER) { const b = CAL[id].boss; if (b && b.kind === kind) return b.name; } return 'Zombie'; };
  EV.isBoss = z => !!(z && (z.kind === 'turkey' || z.kind === 'krampus'));
  // what a mini-boss carries. own = the wardrobe's owned map
  EV.bossLoot = function (kind, own, rnd = Math.random) {
    own = own || {};
    if (kind === 'turkey') return ['turkey', !own.pilgrim ? 'cos_pilgrim' : !own.feathers && rnd() < .5 ? 'cos_feathers' : 'pie'];
    if (kind === 'krampus') return ['gift', 'gift', !own.santa ? 'cos_santa' : rnd() < .5 ? 'gift' : 'candy'];
    return [];
  };
})();
