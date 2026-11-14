/* Dead Miles (next) - house runtime: one looting run inside a house layout.
   A layout (from gen.js) is plain data: rows of tile chars, rooms, doors, furniture, decor, zombies, secrets.
   Tile chars: '#' wall, ' ' void, '+' door, '=' secret door (wall until opened), anything else = a room key in L.rooms.
   Entry: DM.House.start(layout, opts) where opts.onExit(result) is called when she leaves or goes down. */
'use strict';
(() => {
  const P = ART.P, E = DM.E, D = DM.D;
  const { T, WH, WT, PSCALE, ZSCALE, $, DEV, SFX, clamp, lerp, angDiff, rectDist, toast, buzz, keys, btn } = E;
  const cv = E.cv, ctx = E.ctx;
  const { ITEMS, stackMax, toStacks, rollLoot, LOCKS, EVENT, WEAPONS } = D;
  const EVS = DM.Events, EVA = D.EV;   // the running seasonal event (events.js) or null
  const F = DM.Food;                   // 0.8: hunger + thirst (food.js)

  // ---------------------------------------------------------------- layout
  let L = null, ROWS = [], MW = 0, MH = 0, opts = {};
  const ch = (x, y) => (x < 0 || y < 0 || x >= MW || y >= MH) ? ' ' : ROWS[y][x];
  const isVoid = (x, y) => ch(x, y) === ' ';
  const isWall = (x, y) => { const c = ch(x, y); return c === '#' || (c === '=' && !G.secretOpen); };
  const isDoor = (x, y) => { const c = ch(x, y); return c === '+' || (c === '=' && G.secretOpen); };
  const roomAt = (x, y) => {
    const c = ch(x, y);
    if (c === '#' || c === ' ') return null;
    if (c === '=') return G.secretOpen ? L.doors[x + ',' + y] || null : null;
    if (c === '+') return L.doors[x + ',' + y] || null;
    return L.rooms[c] ? c : null;
  };
  const RN = r => (L.rooms[r] && L.rooms[r].name) || '';
  const styleOf = r => (L.rooms[r] && L.rooms[r].style) || 'h';
  const streetRoom = () => L.street || 'o';

  // ---------------------------------------------------------------- survivor (persistent, from game.js)
  const S = () => DM.S;                 // the survivor object (pack, hp, xp, job, weapon)
  const job = () => (S() && S().job) || 'scavenger';
  const scavLvl = () => D.scavLvl(S() ? S().xp : 0);
  const XPCUM = D.XPCUM, PERKS = D.PERKS;
  const searchMul = () => 1.5 * (1 - .06 * (scavLvl() - 1)) * (job() === 'scavenger' ? .85 : 1) * F.searchMul();   // slow at first, faster with skill; thirsty = slower
  const extraChance = () => .04 * (scavLvl() - 1) + (job() === 'scavenger' ? .1 : 0);
  const packSlots = () => 12 + (S().packBonus || 0) + (scavLvl() >= 9 ? 2 : 0);
  const gatePct = () => job() === 'scavenger' ? .65 : .75;
  const LOCK_EASE = () => (job() === 'thief' ? 1.6 : 1) * (S().lockset ? 1.25 : 1);   // the Thief job widens sweet spots
  const SNAP_T = () => (job() === 'thief' ? 2.4 : 1.2) * (S().lockset ? 1.5 : 1);    // ... and picks break half as often
  const maxHp = () => D.maxHp(S());
  function gainXP(n, x, y) {
    n += F.xpBonus(n);   // well fed + hydrated: +10%
    const before = scavLvl(); S().xp += n; DM.Game && DM.Game.save();
    G.nums.push({ x: x + 16, y: y - 112, v: '+' + n + ' xp', t: 0, col: P.GRN, small: 1 });
    const after = scavLvl();
    if (after > before) { levelUp(after); if (DM.Game && DM.Game.onLevel) DM.Game.onLevel(after); }
  }
  const weaponKey = () => (S().hands && S().hands.k) ? D.ITEMS[S().hands.k].w : 'fists';
  const weapon = () => WEAPONS[weaponKey()];

  // ---------------------------------------------------------------- state
  let G;
  function startRun(layout, o) {
    L = layout; opts = o || {};
    ROWS = L.rows; MW = ROWS[0].length; MH = ROWS.length;
    const st = L.start;
    if (S() && S().food) S().hp = F.tick(S(), S().hp);   // hunger/thirst catch up before she goes in
    G = {
      t: 0, secretOpen: false, paused: false, over: false, hitstop: 0, shake: 0, redFlash: 0,
      p: {
        x: st.x * T, y: st.y * T, vx: 0, vy: 0, fx: 0, fy: -1, flip: false, hw: 13, hh: 9,
        hp: Math.min(S().hp, maxHp()), sta: F.staMax(), staDelay: 0, st: 'free', stT: 0, inv: 0, ph: 0, stepAcc: 0, kbx: 0, kby: 0,
        swingQ: false, search: null, flash: 0, swingHit: false, downRot: 0,
      },
      zs: [], furn: [], pack: S().pack, drops: [], arrows: [], parts: [], rings: [], nums: [], decals: [], banners: [],
      sec: (L.secrets || []).map(s => Object.assign({ st: 0, found: false }, JSON.parse(JSON.stringify(s)))),
      fog: {}, visited: {}, room: streetRoom(), noiseLvl: 0, cam: { x: st.x * T, y: st.y * T - 120 }, z3: false,
      stats: { searched: 0, kills: 0, start: performance.now() }, entered: false, lastNoise: null, field: null, fieldT: 0, fieldCell: -1,
      secretHint: 0, sheet: null, food: { h: 0, t: 0 }, foodT: 0,
    };
    for (const k in L.rooms) { const R = L.rooms[k]; G.fog[k] = R.hidden || R.isolated ? .99 : .97; G.visited[k] = false; }
    G.fog[streetRoom()] = 0.12; G.visited[streetRoom()] = true;
    if (opts.noFog) for (const k in L.rooms) { G.fog[k] = 0; G.visited[k] = true; }
    let fid = 0;
    for (const d of L.furn) {
      const f = Object.assign({}, d);
      f.fid = fid++;
      f.tx = d.at[0]; f.ty = d.at[1]; f.tw = d.at[2]; f.th = d.at[3];
      f.x = f.tx * T; f.y = f.ty * T; f.w = f.tw * T; f.h = f.th * T;
      if (f.solid == null) f.solid = 1;
      f.lootable = !!d.loot; f.searched = false; f.locked = d.lock || null; f.items = d.items ? 1 : null; f.loot0 = null; f.slide = 0;
      f.room = d.room || roomAt(f.tx, f.wall ? f.ty + 1 : f.ty);
      f._key = null; f._c = null;
      G.furn.push(f);
    }
    // some containers turn out empty - never the fridge, secret stashes, or ones the generator marked
    const elig = G.furn.filter(f => f.lootable && !f.noEmpty && f.art !== 'fridge' && !f.secretLoot && !f.lock && !(f.extra && f.extra.length));
    for (let i = elig.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [elig[i], elig[j]] = [elig[j], elig[i]]; }
    elig.slice(0, Math.round(elig.length * (L.emptyPct == null ? .2 : L.emptyPct))).forEach(f => f.empty = true);
    for (const f of G.furn) if (f.lootable) { f.pre = f.empty ? [] : rollLoot(f.loot); if (f.extra) f.pre.push(...f.extra); } // rolled up front so Keen eye can sense rares
    for (const zd of L.zombies || []) {
      const z = mkZombie(zd.x * T, zd.y * T, zd.st || 'idle', null);
      if (zd.hp) z.hp = z.maxHp = zd.hp; if (zd.dmg) z.dmgMul = zd.dmg; if (zd.kind) z.kind = zd.kind;
      if (zd.sleep) { z.sleep = zd.sleep; const sf = G.furn.find(f => f.fid === zd.sleep.furn); if (sf) sf.bedOf = z; }
      G.zs.push(z);
    }
    // the event mini-boss (zombie turkey, Krampus walker) in about 1 in 3 yards / kitchens
    const bs = EVS && !opts.noBoss ? EVS.bossFor(L) : null;
    if (bs) { const bz = mkZombie(bs.x * T, bs.y * T, 'idle', bs.where === 'yard' ? streetRoom() : null); Object.assign(bz, { kind: bs.kind, hp: bs.hp, maxHp: bs.hp, boss: 1 }, bs.props); G.zs.push(bz); }
    if (opts.resume) restoreRun(opts.resume);
    buildWalls(); buildSolid();
    G.p.flip = false;
    hideCards(); closeSheet(true);
    buildStatic();
    G.cam.x = G.p.x; G.cam.y = G.p.y - 120;
    $('#room').textContent = RN(streetRoom()).toUpperCase();
    $('#joyhint').classList.remove('gone');
    lastHud = '';
    toast(opts.hint || 'Joystick to move  ·  SEARCH near furniture', 3.2);
    hudChips();
  }
  // top-left chip: the running event
  /* RUN PROGRESS SURVIVES CLOSING THE APP. The pack is saved after every search, but the house
     itself was not - so closing the game mid-run gave back a fresh house to loot again. Now what was
     searched, what was left in it, what was unlocked and how far each secret got is saved as you go
     (opts.onState) and put back (opts.resume) if the house is entered again. */
  const FKEEP = ['searched', 'loot0', 'locked', 'keyLock', 'opened', 'slideState', 'slide', 'swing', 'solid', 'pre', 'empty'];
  function snapRun() {
    const f = {}, sec = G.sec.map(x => ({ st: x.st || 0, found: !!x.found, loot0: x.loot0 || null, hintAt: 0 }));
    G.furn.forEach((x, i) => {
      if (i >= (L.furn || []).length) return;   // only the house's own furniture (not drops/bodies)
      const d = L.furn[i], ch = x.searched || (d.lock && !x.locked) || (d.keyLock && !x.keyLock) || x.opened || x.slideState || x.swing;
      if (!ch) return; const o = {}; for (const k of FKEEP) if (x[k] != null) o[k] = x[k]; f[i] = o;
    });
    return { f, sec, so: !!G.secretOpen, fp: runPrint() };
  }
  // 0.9: a fingerprint of the house's furniture, so saved progress is never laid onto a different layout
  const runPrint = () => (L.furn || []).length + ':' + (L.furn || []).map(d => d.art[0] + d.at.join('')).join('').length + ':' + (L.furn || []).reduce((a, d, i) => (a * 31 + d.at[0] * 7 + d.at[1] + i) % 1000003, 7);
  function restoreRun(r) {
    if (r && r.fp && r.fp !== runPrint()) return;   // the layout changed since: start the house fresh
    if (r && !r.fp && Object.keys(r.f || {}).some(i => !G.furn[+i] || (r.f[i].searched && !G.furn[+i].lootable))) return;   // 0.8.x save that does not fit
    try {
      for (const i of Object.keys(r.f || {})) { const x = G.furn[+i]; if (x) Object.assign(x, JSON.parse(JSON.stringify(r.f[i]))); }
      (r.sec || []).forEach((v, i) => { if (G.sec[i]) Object.assign(G.sec[i], v); });
      if (r.so) G.secretOpen = true;
      for (const x of G.furn) if (x.keyDoor && x.swing) x.swing = 1;
    } catch (e) { console.warn('resume', e); }
  }
  let lastSnap = '', snapT = 0;
  function saveRunState(dt) {
    if (!opts.onState || G.over) return; snapT -= dt; if (snapT > 0) return; snapT = 1;
    const s = JSON.stringify(snapRun()); if (s === lastSnap) return; lastSnap = s; opts.onState(JSON.parse(s));
  }
  function hudChips() {
    const ev = $('#evchip');
    if (ev) { ev.style.display = EVA ? '' : 'none'; if (EVA) { ev.innerHTML = EVS.glyph(EVA.id) + '<span>' + EVA.ev.short + '</span>'; ev.style.background = EVA.ev.accent.c; } }
  }
  function mkZombie(x, y, st, room) {
    return {
      x, y, vx: 0, vy: 0, hw: 12, hh: 8, hp: 100, st, stT: 0, room, flip: false, fx: -1, fy: 0, ph: Math.random() * 6,
      kbx: 0, kby: 0, flash: 0, alertT: 0, groanT: 2 + Math.random() * 4, target: null, lastSeen: null, lostT: 0, cd: 0,
      lunge: null, rot: st === 'sleep' ? -Math.PI / 2 : 0, alpha: 1, wanderT: 1, dead: false, loot: null, lootable: false,
      searched: false, id: Math.random(), hurtDir: 1, sightT: 0, path: null,
    };
  }

  // ---------------------------------------------------------------- walls & collision
  let wallCells = [], wallRects = [], faceCache = new Map(), doorLeaves = [];
  function buildWalls() {
    wallCells = []; doorLeaves = []; wallRects = new Array(MW * MH).fill(null).map(() => []);
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
      if (isVoid(x, y)) { wallRects[y * MW + x].push({ x: x * T, y: y * T, w: T, h: T }); continue; }
      const shut = keyShut(x, y);
      const horizDoor = isDoor(x, y) && isWall(x - 1, y) && isWall(x + 1, y);
      if (horizDoor) {
        wallCells.push({ x, y, lintel: true, key: (y + 1) * T, cut: 1 });
        if (ch(x, y) !== '=' && !shut) { // open door leaf, hinged on the west jamb, swung into the room below (front door: into the hall)
          const dir = (x + ',' + y) === L.frontDoor ? -1 : 1, g0 = (y + 1) * T - WT / 2, g1 = g0 + dir * T * .72;
          doorLeaves.push({ x0: x * T + 2, x1: x * T + 8, y0: Math.min(g0, g1), y1: Math.max(g0, g1), key: Math.max(g0, g1), vert: true });
        }
        continue;
      }
      if (isDoor(x, y) && !shut && isWall(x, y - 1) && isWall(x, y + 1)) { // vertical doorway: leaf swung into the hall (east)
        const gy = y * T + 4;
        doorLeaves.push({ x0: (x + 1) * T - 4, x1: (x + 1) * T - 4 + T * .7, y0: gy, y1: gy, key: gy + 1, vert: false });
      }
      if (!isWall(x, y)) continue;
      const cx = x * T + T / 2, gy1 = (y + 1) * T, gy0 = gy1 - WT;
      const W = isWall(x - 1, y) || isDoor(x - 1, y), E = isWall(x + 1, y) || isDoor(x + 1, y), N = isWall(x, y - 1);
      const S = isWall(x, y + 1);
      const rects = [{ x: cx - WT / 2, y: gy0, w: WT, h: WT, k: 'c' }];
      if (W) rects.push({ x: x * T, y: gy0, w: T / 2, h: WT, k: 'w' });
      if (E) rects.push({ x: cx, y: gy0, w: T / 2, h: WT, k: 'e' });
      if (N) rects.push({ x: cx - WT / 2, y: y * T, w: WT, h: T - WT, k: 'n' });
      wallRects[y * MW + x].push(...rects);
      // 0.9: an east-west wall blocks over its whole cell - its face is drawn over all of it, so she used
      // to walk right into the wall picture from the room above it. Only collision changes, not the drawing.
      if (W || E) wallRects[y * MW + x].push({ x: W ? x * T : cx - WT / 2, y: y * T, w: (E ? (x + 1) * T : cx + WT / 2) - (W ? x * T : cx - WT / 2), h: T - WT, k: 'b' });
      const cell = { x, y, rects, key: gy1, cut: 1, W, E, N, S };
      if (!S && !isVoid(x, y + 1)) {
        cell.face = { x0: W ? x * T : cx - WT / 2, x1: E ? (x + 1) * T : cx + WT / 2, room: roomAt(x, y + 1) || 'h', decor: L.decor[x + ',' + y] };
      } else if (S) { // T-junction: the horizontal wall's south face still shows either side of the wall below
        cell.sub = [];
        if (W && roomAt(x - 1, y + 1)) cell.sub.push({ x, y, key: gy1, face: { x0: x * T, x1: cx - WT / 2, room: roomAt(x - 1, y + 1), decor: null } });
        if (E && roomAt(x + 1, y + 1)) cell.sub.push({ x, y, key: gy1, face: { x0: cx + WT / 2, x1: (x + 1) * T, room: roomAt(x + 1, y + 1), decor: null } });
      }
      wallCells.push(cell);
    }
    faceCache.clear(); fogMap = null;
  }
  const keyShut = (x, y) => G.furn.some(f => f.keyDoor && (f.swing || 0) < 1 && f.tx === x && f.ty === y);
  let solidCell = new Uint8Array(MW * MH);
  function buildSolid() {
    solidCell = new Uint8Array(MW * MH);
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if (isWall(x, y) || isVoid(x, y)) solidCell[y * MW + x] = 1;
    for (const f of G.furn) if (f.solid) {
      const sx = Math.round(f.slide || 0);
      for (let yy = f.ty; yy < f.ty + f.th; yy++) for (let xx = f.tx + sx; xx < f.tx + f.tw + sx; xx++) solidCell[yy * MW + xx] = 1;
    }
    G.fieldCell = -1;
  }
  // 0.8: what she bumps into is the drawn base of the piece, a little inset, so she can squeeze past corners
  // 0.9: low, deep pieces (beds, cots, tables, tubs, the car) are drawn starting well below their tile's top
  // edge, and that strip looked like floor but was solid. Now she bumps into the drawn top edge instead.
  // The drawn outline is measured once per piece kind from its own picture (headboards, lamps, table legs, a thin
  // lamp post): top edge, bottom edge, and how wide its base is.
  const outCache = {};
  function drawnBox(f) {
    const k = f.art + ':' + f.tw + 'x' + f.th + ':' + f.H + (f.car ? ':' + f.car.half + f.car.flip : '') + (f.vert ? ':v' : '') + (f.table ? ':t' : '');
    if (outCache[k]) return outCache[k];
    let o = { top: ART.geo(f).ty0 - f.y, bot: f.h, l: 0, r: f.w };
    try {
      const q = Object.assign({}, f, { x: 0, y: 0, searched: false, slide: 0, swing: 0, _c: null }), g = ART.geo(q), by = Math.floor(g.ty0 - 50), bw = Math.ceil(q.w + 8), bh = Math.ceil(q.h + 4 - by);
      const c = document.createElement('canvas'); c.width = bw; c.height = bh; const x = c.getContext('2d'); x.translate(4, -by);
      (ART.FURN[q.art] || ART.FURN.counter)(x, q, g);
      const d = x.getImageData(0, 0, bw, bh).data, A = (xx, yy) => d[(yy * bw + xx) * 4 + 3] > 40;
      let top = null, bot = null;
      for (let yy = 0; yy < bh && top == null; yy++) for (let xx = 8; xx < bw - 8; xx++) if (A(xx, yy)) { top = yy; break; }
      for (let yy = bh - 1; yy >= 0 && bot == null; yy--) for (let xx = 4; xx < bw - 4; xx++) if (A(xx, yy)) { bot = yy; break; }
      if (top != null && bot != null) {
        let l = bw, r = 0;   // base width: the lowest 14 drawn rows
        for (let yy = Math.max(0, bot - 14); yy <= bot; yy++) for (let xx = 0; xx < bw; xx++) if (A(xx, yy)) { if (xx < l) l = xx; if (xx > r) r = xx; }
        o = { top: top + by, bot: bot + by + 1, l: l - 4, r: r - 4 + 1 };
      }
    } catch (e) { /* keep the geometric box */ }
    return (outCache[k] = o);
  }
  function collBox(f) {
    const o = drawnBox(f), t = Math.max(3, Math.min(f.h - 14, o.top + 6)), b = Math.max(t + 8, Math.min(f.h - 5, o.bot - 5));
    const l = Math.max(4, o.l + 3), r = Math.min(f.w - 4, o.r - 3);
    return r - l >= 8 ? { t, b, l, r } : { t, b, l: 4, r: f.w - 4 };
  }
  function collRect(f) { const s = (f.slide || 0) * T, c = f.cBox || (f.cBox = collBox(f)); return { x: f.x + c.l + s, y: f.y + c.t, w: c.r - c.l, h: c.b - c.t }; }
  function furnRect(f) { const s = (f.slide || 0) * T; return { x: f.x + 2 + s, y: f.y, w: f.w - 4, h: f.h - 5 }; }
  function overlapsSolid(e, x, y) {
    const x0 = x - e.hw, x1 = x + e.hw, y0 = y - e.hh, y1 = y + e.hh;
    if (x0 < 0 || y0 < 0 || x1 > MW * T || y1 > MH * T) return { x: -1e4, y: -1e4, w: 1, h: 1, edge: true };
    const cx0 = Math.floor(x0 / T) - 1, cx1 = Math.floor(x1 / T) + 1, cy0 = Math.floor(y0 / T) - 1, cy1 = Math.floor(y1 / T) + 1;
    for (let cy = Math.max(0, cy0); cy <= Math.min(MH - 1, cy1); cy++) for (let cx = Math.max(0, cx0); cx <= Math.min(MW - 1, cx1); cx++) {
      for (const r of wallRects[cy * MW + cx]) if (x0 < r.x + r.w && x1 > r.x && y0 < r.y + r.h && y1 > r.y) return r;
    }
    for (const f of G.furn) {
      if (!f.solid) continue;
      const r = collRect(f);
      if (x0 < r.x + r.w && x1 > r.x && y0 < r.y + r.h && y1 > r.y) return r;
    }
    return null;
  }
  function moveEnt(e, dx, dy) {
    // x then y, sliding along obstacles
    let hit = false;
    if (dx) {
      const nx = e.x + dx; const r = overlapsSolid(e, nx, e.y);
      if (!r) e.x = nx; else { hit = true; if (!r.edge) e.x = dx > 0 ? Math.min(nx, r.x - e.hw - .01) : Math.max(nx, r.x + r.w + e.hw + .01); if (overlapsSolid(e, e.x, e.y)) e.x -= dx > 0 ? Math.max(0, e.x - (nx - dx)) : Math.min(0, e.x - (nx - dx));  if (!r.edge && Math.abs(dy) < Math.abs(dx) * .6) nudge(e, r, 'y', Math.abs(dx)); }
    }
    if (dy) {
      const ny = e.y + dy; const r = overlapsSolid(e, e.x, ny);
      if (!r) e.y = ny; else { hit = true; if (!r.edge) e.y = dy > 0 ? Math.min(ny, r.y - e.hh - .01) : Math.max(ny, r.y + r.h + e.hh + .01); if (overlapsSolid(e, e.x, e.y)) e.y = ny - dy; if (!r.edge && Math.abs(dx) < Math.abs(dy) * .6) nudge(e, r, 'x', Math.abs(dy)); }
    }
    return hit;
  }
  // 0.9: clipping a corner by a few pixels slides her round it (doorways, furniture ends) instead of stopping dead
  function nudge(e, r, ax, spd) {
    const lo = ax === 'x' ? (e.x + e.hw) - r.x : (e.y + e.hh) - r.y, hi = ax === 'x' ? (r.x + r.w) - (e.x - e.hw) : (r.y + r.h) - (e.y - e.hh);
    const d = lo < hi ? -lo : hi; if (Math.abs(d) > 12) return;
    const st = Math.sign(d) * Math.min(Math.abs(d) + .02, Math.max(.6, spd));
    if (ax === 'x') { if (!overlapsSolid(e, e.x + st, e.y)) e.x += st; } else if (!overlapsSolid(e, e.x, e.y + st)) e.y += st;
  }
  function cellOf(e) {
    let cx = Math.floor(e.x / T), cy = Math.floor(e.y / T);
    if (isWall(cx, cy) && !isWall(cx, cy - 1)) cy--;
    return [Math.max(0, Math.min(MW - 1, cx)), Math.max(0, Math.min(MH - 1, cy))];
  }
  function losClear(x0, y0, x1, y1) {
    const d = Math.hypot(x1 - x0, y1 - y0), n = Math.ceil(d / (T / 4));
    for (let i = 1; i < n; i++) {
      const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n;
      const cx = Math.floor(x / T), cy = Math.floor(y / T);
      if (isVoid(cx, cy)) return false;
      if (isWall(cx, cy)) { // only the thin ground band of the wall blocks
        for (const r of wallRects[cy * MW + cx]) if (x >= r.x - 2 && x <= r.x + r.w + 2 && y >= r.y - 2 && y <= r.y + r.h + 2) return false;
      }
    }
    return true;
  }
  function bfs(sx, sy) {
    const dist = new Int16Array(MW * MH).fill(-1), q = new Int16Array(MW * MH * 2);
    let h = 0, t = 0; dist[sy * MW + sx] = 0; q[t++] = sx; q[t++] = sy;
    while (h < t) {
      const x = q[h++], y = q[h++], d = dist[y * MW + x];
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= MW || ny >= MH) continue;
        const i = ny * MW + nx;
        if (dist[i] >= 0 || solidCell[i]) continue;
        if (dx && dy && (solidCell[y * MW + nx] || solidCell[ny * MW + x])) continue;
        dist[i] = d + 1; q[t++] = nx; q[t++] = ny;
      }
    }
    return dist;
  }
  function nextStep(e, dist) {
    const [cx, cy] = cellOf(e);
    let best = dist[cy * MW + cx]; if (best < 0) best = 9999;
    let bx = cx, by = cy;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= MW || ny >= MH) continue;
      const v = dist[ny * MW + nx];
      if (v < 0 || solidCell[ny * MW + nx]) continue;
      if (dx && dy && (solidCell[cy * MW + nx] || solidCell[ny * MW + cx])) continue;
      if (v < best) { best = v; bx = nx; by = ny; }
    }
    return { x: bx * T + T / 2, y: by * T + T / 2 + 6, same: bx === cx && by === cy };
  }
  function banner(text, sub) { G.banners.push({ text, sub, t: 0 }); }
  function emitNoise(x, y, rad, show = true) {
    G.noiseLvl = Math.max(G.noiseLvl, Math.min(1, rad / 6));
    if (show && rad >= 1.8) G.rings.push({ x, y, r: rad * T, t: 0 });
    G.lastNoise = { x, y, t: G.t };
    for (const z of G.zs) {
      if (z.dead || z.st === 'chase' || z.st === 'windup' || z.st === 'lunge' || z.st === 'rise') continue;
      const d = Math.hypot(z.x - x, z.y - y) / T;
      let eff = rad * (losClear(z.x, z.y - 20, x, y - 20) ? 1 : .65);
      if (z.st === 'sleep') eff *= .55;
      if (d <= eff) alertZombie(z, x, y, false);
    }
  }
  function alertZombie(z, x, y, seen) {
    if (z.st === 'sleep') { z.st = 'rise'; z.stT = 0; z.alertT = 1; SFX.play('groan'); z.target = { x, y }; return; }
    if (seen) { if (z.st !== 'chase') { z.alertT = .9; SFX.play('groan'); SFX.play('alert'); if (opts.onAlert) opts.onAlert(z); } z.st = 'chase'; z.stT = 0; z.lostT = 0; return; }
    if (z.st !== 'investigate') { z.alertT = .7; if (Math.random() < .6) SFX.play('groan'); }
    z.st = 'investigate'; z.target = { x, y }; z.path = null; z.stT = 0;
  }

  // ---------------------------------------------------------------- particles
  function puff(x, y, z, n, col, spd = 60, life = .6, size = 3, grav = 0) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283, s = spd * (.3 + Math.random() * .7);
      G.parts.push({ x, y, z, vx: Math.cos(a) * s, vy: Math.sin(a) * s * .5, vz: grav ? 60 + Math.random() * 90 : (Math.random() * 30), g: grav, life, max: life, col, size: size * (.6 + Math.random() * .8) });
    }
  }
  function splat(x, y, dir, big) {
    const n = big ? 14 : 8;
    for (let i = 0; i < n; i++) {
      const a = dir + (Math.random() - .5) * 1.6, s = 60 + Math.random() * 140;
      G.parts.push({ x, y, z: 38 + Math.random() * 14, vx: Math.cos(a) * s, vy: Math.sin(a) * s * .6, vz: 40 + Math.random() * 100, g: 520, life: 1.2, max: 1.2, col: Math.random() < .7 ? P.BLOOD : '#4d5c3c', size: 2.5 + Math.random() * 3, blood: 1 });
    }
    G.decals.push({ x: x + Math.cos(dir) * 14, y: y + Math.sin(dir) * 8, r: big ? 16 : 9, rot: Math.random() * 3, col: P.BLOOD, a: .75 });
    if (G.decals.length > 90) G.decals.shift();
  }
  function dmgNum(x, y, v, col) { G.nums.push({ x, y, v, t: 0, col }); }
  // ---------------------------------------------------------------- interaction
  // secrets stay invisible until most of the house has been searched; no announcement when that happens
  const gateSet = () => G.furn.filter(f => f.lootable && !f.secretLoot && !f.lock && !f.car && !f.keyRoom);   // 0.8: brass-key spots never count
  function gateOpen() { const C = gateSet(); return C.filter(f => f.searched).length >= Math.ceil(C.length * gatePct()); }
  const hasItem = k => G.pack.some(e => e.k === k) || (S().hands && S().hands.k === k);
  const hasPry = () => hasItem('crowbar') || hasItem('prybar');
  const packCount = k => G.pack.reduce((a, e) => a + (e.k === k ? e.n : 0), 0);
  function usePack(k) { const i = G.pack.findIndex(e => e.k === k); if (i < 0) return; if (!--G.pack[i].n) G.pack.splice(i, 1); }
  const px = v => v * T;
  const rugRect = s => ({ x: px(s.rug.x), y: px(s.rug.y), w: px(s.rug.w), h: px(s.rug.h) });
  const boardRect = s => ({ x: px(s.board.x) + 9, y: px(s.board.y) + 16, w: 26, h: 10 });
  function secretActs(out) {
    const p = G.p, gate = gateOpen();
    for (const s of G.sec) {
      if (s.type === 'shelf') {
        const sh = G.furn[s.furn];
        if (gate && !s.found && !sh.slideState && p.fy < -.35 && p.x > sh.x + 4 && p.x < sh.x + sh.w - 4 && p.y - (sh.y + sh.h) < 24 && p.y > sh.y + sh.h - 4)
          out.push({ obj: sh, act: 'Push', name: 'Bookshelf', rect: furnRect(sh), noise: 2, secret: true, sec: s });
      } else if (s.type === 'rug') {
        const R = rugRect(s), B = boardRect(s), onRug = p.x > R.x - 12 && p.x < R.x + R.w + 12 && p.y > R.y - 12 && p.y < R.y + R.h + 12;
        if (gate && s.st === 0 && onRug) out.push({ obj: s, act: 'Move', name: 'rug', rect: { x: p.x - 4, y: p.y - 4, w: 8, h: 8 }, noise: 1.5, dur: 1.3, secret: true, done: () => moveRug(s) });
        // Once the rug is moved the board can be worked from anywhere on the rug: in some houses the
        // loose board sat partly under furniture where she could not stand, so prying never worked.
        const atMe = { x: p.x - 4, y: p.y - 4, w: 8, h: 8 };
        if (s.st === 1 && onRug) out.push({ obj: s, act: 'Pry', name: 'floorboard', rect: atMe, noise: 3.5, dur: 2.5, secret: true, done: () => pryBoard(s) });
        if (s.st === 2 && s.loot0 && s.loot0.length && onRug) out.push({ obj: s, act: 'Open', name: 'Floor cache', rect: atMe, secret: true });
      } else if (s.type === 'attic') {
        const H = { x: px(s.hatch.x), y: px(s.hatch.y) }, O = { x: px(s.hole.x), y: px(s.hole.y) };
        const near = Math.hypot(p.x - H.x, p.y - H.y) < .75 * T, hr = { x: H.x - 10, y: H.y - 6, w: 20, h: 12 };
        if (s.st === 0 && gate && near && hasItem('pole')) out.push({ obj: s, act: 'Pull down', name: 'attic hatch', rect: hr, noise: 3, dur: 1.2, secret: true, done: () => { s.st = 1; SFX.play('scrape'); } });
        if (s.st === 1 && near) out.push({ obj: s, act: 'Climb', name: 'into the attic', rect: hr, noise: 1, dur: .6, secret: true, done: () => climb(s, true) });
        if (G.room === s.room && Math.hypot(p.x - O.x, p.y - O.y) < .8 * T) out.push({ obj: s, act: 'Climb', name: 'down the ladder', rect: { x: O.x - 14, y: O.y - 8, w: 28, h: 16 }, noise: 1, dur: .5, secret: true, done: () => climb(s, false) });
      } else if (s.type === 'panel') {
        const f = G.furn[s.furn], r = { x: f.x + 6, y: f.y + f.h - 10, w: f.w - 12, h: 12 };
        const facing = p.fy < -.35 && Math.abs(p.x - (f.x + f.w / 2)) < f.w / 2 && p.y - (f.y + f.h) < 30 && p.y > f.y + f.h - 4;
        if (gate && !f.opened && facing && hasPry()) out.push({ obj: f, act: 'Pry', name: 'wall panel', rect: r, noise: 4, dur: 2.4, secret: true, done: () => pryPanel(s, f) });
        if (f.opened && f.loot0 && f.loot0.length) out.push({ obj: f, act: 'Open', name: 'Wall cache', rect: r, secret: true });
      }
    }
  }
  // Standing exactly on a secret before the house is searched enough: a quiet nudge, once in a while.
  // It only fires where the note's clue points, so the secret is still earned.
  function secretHint() {
    if (gateOpen()) return;
    const p = G.p, now = performance.now();
    for (const s of G.sec) {
      if (s.found || (s.st || 0) > 0 || (s.hintAt && now - s.hintAt < 25000)) continue;
      let here = false, msg = '';
      if (s.type === 'rug') { const R = rugRect(s); here = p.x > R.x - 6 && p.x < R.x + R.w + 6 && p.y > R.y - 6 && p.y < R.y + R.h + 6; msg = 'The floor creaks here... look around the rest of the house first.'; }
      else if (s.type === 'shelf') { const sh = G.furn[s.furn]; here = sh && !sh.slideState && p.x > sh.x + 4 && p.x < sh.x + sh.w - 4 && p.y - (sh.y + sh.h) < 24 && p.y > sh.y + sh.h - 4; msg = 'This shelf feels wrong... look around the rest of the house first.'; }
      else if (s.type === 'attic') { here = Math.hypot(p.x - px(s.hatch.x), p.y - px(s.hatch.y)) < .75 * T; msg = 'There is a hatch up there... look around the rest of the house first.'; }
      else if (s.type === 'panel') { const f = G.furn[s.furn]; here = f && !f.opened && Math.abs(p.x - (f.x + f.w / 2)) < f.w / 2 && p.y - (f.y + f.h) < 30 && p.y > f.y + f.h - 4; msg = 'This wall sounds hollow... look around the rest of the house first.'; }
      if (here) { s.hintAt = now; toast(msg, 3); return; }
    }
  }
  function searchedCount() { const C = gateSet(); return [C.filter(f => f.searched).length, C.length]; }
  function foundSecret(s) { if (!s.found) { s.found = true; gainXP(8, G.p.x, G.p.y); if (DM.Game && DM.Game.onSecret) DM.Game.onSecret(); } }
  function moveRug(s) { s.st = 1; SFX.play('whoosh'); const R = rugRect(s); puff(R.x + R.w * .8, R.y + R.h * .7, 2, 8, 'rgba(234,210,164,.5)', 50, .7, 3); }
  function pryBoard(s) {
    s.st = 2; SFX.play('hit'); s.name = 'Floor cache'; s.room = s.room || G.room;
    s.loot0 = toStacks(rollLoot('cache'));
    foundSecret(s);
    openLoot(s, { act: 'Open', name: 'Floor cache' });
  }
  function pryPanel(s, f) {
    f.opened = true; f._key = null; SFX.play('break'); emitNoise(f.x + f.w / 2, f.y + f.h, 4.5);
    f.loot0 = toStacks(rollLoot('wallcache')); f.name = 'Wall cache';
    foundSecret(s);
    openLoot(f, { act: 'Open', name: 'Wall cache' });
  }
  function climb(s, up) {
    $('#fade').classList.add('on');
    setTimeout(() => {
      if (up) { DM.tp(s.hole.x, s.hole.y - .45); foundSecret(s); }
      else DM.tp(s.hatch.x, s.hatch.y + .6);
      $('#fade').classList.remove('on');
    }, 260);
  }

  function interactables() {
    const out = [];
    for (const f of G.furn) {
      if (f.keyDoor) { if (f.keyLock) out.push({ obj: f, act: hasKeyNow() ? 'Unlock' : 'KeyLocked', rect: furnRect(f), name: 'door', keyLock: 1 }); continue; }   // 0.8: key-locked room
      if (!f.lootable) continue;
      if (f.keyLock) { out.push({ obj: f, act: hasKeyNow() ? 'Unlock' : 'KeyLocked', rect: furnRect(f), name: 'car', keyLock: 1 }); continue; }   // 0.8: locked car
      if (f.bedOf && (f.bedOf.st === 'sleep' || f.bedOf.st === 'rise')) continue; // someone is sleeping on it
      let act = null;
      if (f.locked) act = 'Locked';
      else if (!f.searched) act = 'Search';
      else if (f.loot0 && f.loot0.length) act = 'Open';
      if (act) out.push({ obj: f, act, lock: f.locked, rect: f.wall ? { x: f.x + 4, y: f.y + 20, w: f.w - 8, h: f.h - 20 } : furnRect(f), name: f.name, noise: f.noise });
    }
    for (const d of G.drops) out.push({ obj: d, act: 'Pick up', rect: { x: d.x - 12, y: d.y - 8, w: 24, h: 14 }, name: ITEMS[d.k].n + (d.n > 1 ? ' x' + d.n : ''), drop: true });
    secretActs(out);
    if (opts.acts) opts.acts(out, G);
    for (const z of G.zs) {
      if (!z.dead || z.rot === 0) continue;
      let act = !z.searched ? 'Search' : (z.loot0 && z.loot0.length ? 'Open' : null);
      if (act) out.push({ obj: z, act, rect: z.kind === 'turkey' ? { x: z.x - 24, y: z.y - 14, w: 48, h: 26 } : { x: z.x + (z.fallDir || 1) * 34 - 38, y: z.y - 14, w: 76, h: 26 }, name: EVS.isBoss(z) ? EVS.bossName(z.kind) : 'Zombie', noise: 1.5, corpse: true });
    }
    return out;
  }
  function findTarget() {
    const p = G.p; let best = null, bd = 1e9;
    const fx = p.x + p.fx * 10, fy = p.y + p.fy * 8;
    for (const it of interactables()) {
      const d = rectDist(p.x, p.y, it.rect);
      if (d > 36) continue;
      // A secret action (Move rug, Pry floorboard, Push bookshelf...) only exists while she is standing
      // in its spot, so it must win over the furniture beside it - a desk with a leftover item kept
      // showing "Open Desk" and hid the rug.
      const score = d + rectDist(fx, fy, it.rect) * .5 - (it.secret ? 1000 : 0);
      if (score < bd) { bd = score; best = it; }
    }
    return best;
  }
  function startSearch(it) {
    const p = G.p, o = it.obj;
    const cx = it.rect.x + it.rect.w / 2, cy = it.rect.y + it.rect.h / 2;
    const dx = cx - p.x, dy = cy - p.y, d = Math.hypot(dx, dy) || 1;
    p.fx = dx / d; p.fy = dy / d; if (Math.abs(dx) > 3) p.flip = dx < 0;
    if (it.act === 'Open') { openLoot(o, it); return; }
    if (it.drop) { pickUp(o); return; }
    if (it.act === 'Locked') { openLockChoice(it); return; }
    if (it.act === 'KeyLocked') { toast(it.name === 'car' ? 'Locked - needs a brass key in your pack' : 'Key-locked door - needs a brass key in your pack', 2); SFX.play('alert'); return; }
    if (it.act === 'Unlock') { useKey(it); return; }
    const dur = it.dur || (it.act === 'Push' ? 1.7 : (it.corpse ? 1.4 : o.time) * searchMul());
    p.st = 'search'; p.stT = 0; p.search = { it, t: 0, dur, nextNoise: .25, nextFx: 0 };
    if (it.act === 'Search' && (o.art === 'fridge' || o.art === 'wardrobe' || o.art === 'coat' || o.art === 'pantry')) SFX.play('open');
  }
  function finishSearch() {
    const p = G.p, s = p.search, it = s.it, o = it.obj;
    p.st = 'free'; p.search = null;
    if (it.done) { it.done(); return; }
    if (it.act === 'Push') {
      o.slideState = 'sliding'; o.slideT = 0; SFX.play('scrape'); emitNoise(o.x + o.w / 2, o.y + o.h, 5.5);
      return;
    }
    o.searched = true; G.stats.searched++;
    const keys = it.corpse ? (EVS.isBoss(o) ? EVS.bossLoot(o.kind, D.cosOwned()) : rollLoot('corpse')) : o.pre.slice();
    if (keys.length && Math.random() < extraChance()) { const more = rollLoot(it.corpse ? 'corpse' : o.loot); if (more.length) keys.push(more[0]); }
    o.loot0 = toStacks(keys);
    // A torn note remembers the house it came from, so reading it somewhere else is not misleading.
    for (const e of o.loot0) if (e.k === 'note') e.d = { addr: L.address, text: L.note || '' };
    if (it.pry && o.loot0.length && Math.random() < .25) { const i = Math.floor(Math.random() * o.loot0.length), sm = o.loot0[i]; sm.n--; if (!sm.n) o.loot0.splice(i, 1); toast('Smashed: ' + ITEMS[sm.k].n.toLowerCase(), 1.8); }
    // xp: bigger containers teach more, the hidden stash a lot
    gainXP(it.corpse ? 2 : 2 + (o.time >= 2.2 ? 1 : 0) + (o.rare ? 6 : 0), G.p.x, G.p.y);
    o._key = null;
    openLoot(o, it);
  }
  // ---- 0.8: brass keys open locked cars and key-locked rooms (nothing else does). The key is used up.
  const hasKeyNow = () => G.pack.some(e => e.k === 'key');
  function useKey(it) {
    const o = it.obj, i = G.pack.findIndex(e => e.k === 'key'); if (i < 0) return;
    const e = G.pack[i]; e.n--; if (!e.n) G.pack.splice(i, 1);
    lastHud = ''; SFX.play('unlock'); DM.Game && DM.Game.save();
    if (o.keyDoor) {
      o.keyLock = null; o.solid = 0; o.swing = .001; o._key = null; buildSolid();
      setTimeout(() => SFX.play('creak'), 260);
      emitNoise(o.x + o.w / 2, o.y + o.h, 2.5);
      toast('Click. The brass key turns - the door swings open', 2.2); gainXP(4, G.p.x, G.p.y);
    } else {
      for (const f of G.furn) if (f.car && f.keyLock) { f.keyLock = null; f._key = null; }
      setTimeout(() => SFX.play('creak'), 220);
      emitNoise(o.x + o.w / 2, o.y + o.h, 3);
      toast('Unlocked the car - glove box and trunk are open to search', 2.2); gainXP(3, G.p.x, G.p.y);
    }
  }
  function cancelSearch() { const p = G.p; if (p.st === 'search') { p.st = 'free'; p.search = null; } }

  // ---------------------------------------------------------------- tap to walk / tap to search
  function tapWorld(cx, cy) {
    if (!G || G.sheet || G.over || G.p.st === 'down') return;
    const rc = $('#touch').getBoundingClientRect();
    const wx = G.cam.x + (cx - rc.left - DEV.W / 2) / DEV.zoom, wy = G.cam.y + (cy - rc.top - DEV.H / 2) / DEV.zoom;
    if (opts.tap && opts.tap(wx, wy)) return;
    let best = null, bk = -1e9;
    for (const it of interactables()) {
      if (it.secret) continue;
      const o = it.obj; let bx;
      if (it.corpse) bx = { x: it.rect.x, y: it.rect.y - 34, w: it.rect.w, h: it.rect.h + 40 };
      else if (it.drop) bx = { x: o.x - 16, y: o.y - 30, w: 32, h: 38 };
      else if (o.wall) bx = { x: o.x + 4, y: o.y + o.h - 60, w: o.w - 8, h: 60 };
      else { const g = ART.geo(o); bx = { x: o.x + (o.slide || 0) * T, y: g.ty0 - 8, w: o.w, h: g.fy1 - g.ty0 + 8 }; }
      if (rm(it) && G.fog[rm(it)] > .6) continue;
      if (wx >= bx.x - 6 && wx <= bx.x + bx.w + 6 && wy >= bx.y - 6 && wy <= bx.y + bx.h + 6) { const k = bx.y + bx.h; if (k > bk) { bk = k; best = { it, bx }; } }
    }
    const p = G.p;
    if (best) {
      const it = best.it;
      if (rectDist(p.x, p.y, it.rect) <= 36 && p.st === 'free') { startSearch(it); return; }
      const goal = goalCellFor(it);
      if (!goal) return;
      const rc = it.rect, gx0 = goal[0] * T, gy0 = goal[1] * T;
      const px = clamp(rc.x + rc.w / 2, gx0 + 14, gx0 + T - 14), py = clamp(rc.y + rc.h / 2, gy0 + 10, gy0 + T - 10);
      p.auto = { it, gx: goal[0], gy: goal[1], px, py, field: bfs(goal[0], goal[1]), t: 0 };
      G.tapMark = { x: best.bx.x + best.bx.w / 2, y: best.bx.y + best.bx.h, t: 0, obj: true };
    } else {
      let tx = Math.floor(wx / T), ty = Math.floor(wy / T);
      if (tx < 0 || ty < 0 || tx >= MW || ty >= MH) return;
      if (solidCell[ty * MW + tx]) { // 0.8: a tap on the open part of a wall/furniture tile walks to the closest open tile beside it
        let bd = 1e9, bc = null;
        for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0], [-1, -1], [1, -1], [-1, 1], [1, 1]]) { const x = tx + dx, y = ty + dy; if (x < 0 || y < 0 || x >= MW || y >= MH || solidCell[y * MW + x]) continue; const d = Math.hypot((x + .5) * T - wx, (y + .5) * T - wy); if (d < bd) { bd = d; bc = [x, y]; } }
        if (!bc || bd > T * 1.2) return; [tx, ty] = bc;
      }
      p.auto = { gx: tx, gy: ty, px: wx, py: wy, field: bfs(tx, ty), t: 0 };
      G.tapMark = { x: wx, y: wy, t: 0 };
    }
  }
  function rm(it) { return it.corpse || it.drop ? null : it.obj.room; }
  function goalCellFor(it) {
    const o = it.obj;
    if (it.corpse) return cellOf({ x: it.rect.x + it.rect.w / 2, y: o.y });
    if (it.drop) return cellOf(o);
    const tx = o.tx + Math.round(o.slide || 0), cx = tx + Math.floor((o.tw - 1) / 2), cy = o.ty + Math.floor((o.th - 1) / 2);
    const cand = [[cx, o.ty + o.th], [cx + (o.tw > 1 ? 1 : 0), o.ty + o.th], [cx, o.ty - 1], [tx - 1, cy], [tx + o.tw, cy]];
    for (const [x, y] of cand) if (x >= 0 && y >= 0 && x < MW && y < MH && !solidCell[y * MW + x]) return [x, y];
    return null;
  }
  function autoInput() {
    const p = G.p, a = p.auto;
    if (a.it) {
      if (rectDist(p.x, p.y, a.it.rect) <= 30) { p.auto = null; startSearch(a.it); return null; }
    }
    const st = nextStep(p, a.field);
    const tgt = st.same ? { x: a.px, y: a.py } : st;
    const dx = tgt.x - p.x, dy = tgt.y - p.y, d = Math.hypot(dx, dy);
    if (st.same && d < 5) { p.auto = null; if (a.it && rectDist(p.x, p.y, a.it.rect) <= 44) startSearch(a.it); return null; }
    if (a.t > 9) { p.auto = null; return null; }
    return { x: dx / (d || 1), y: dy / (d || 1), m: st.same ? Math.min(1, d / 20 + .35) : 1, run: false };
  }

  // ---------------------------------------------------------------- update
  function update(dt) {
    G.t += dt;
    const p = G.p;
    G.redFlash = Math.max(0, G.redFlash - dt * 2.2);
    G.shake = Math.max(0, G.shake - dt * 30);
    if (G.hitstop > 0) { G.hitstop -= dt; return; }
    if (G.paused) return;

    let inp = E.moveInput();
    if (G.p.auto) {
      if (inp.m > 0 || btn.atkPressed || btn.dodge || G.p.st === 'hurt' || G.p.st === 'down' || G.sheet) G.p.auto = null;
      else if (G.p.st === 'free') { G.p.auto.t += dt; const ai = autoInput(); if (ai) inp = ai; }
    }
    if (G.tapMark) { G.tapMark.t += dt; if (G.tapMark.t > .7) G.tapMark = null; }
    updateLock(dt);
    updatePlayer(dt, inp);
    saveRunState(dt);
    for (const z of G.zs) updateZombie(z, dt);
    separate();
    updateWorld(dt);
    if (opts.tick) opts.tick(dt, G);
    btn.atkPressed = false; btn.use = false; btn.dodge = false;
  }

  function updatePlayer(dt, inp) {
    const p = G.p;
    p.stT += dt; p.inv = Math.max(0, p.inv - dt); p.flash = Math.max(0, p.flash - dt * 5);
    if (p.st === 'down') { p.downRot = Math.min(1, p.downRot + dt * 3); if (p.stT > 1.3 && !G.over) { if (opts.onDown) { G.over = true; opts.onDown(); } else showDeath(); } return; }
    let spd = 0, running = false;
    // stamina
    p.staDelay -= dt;
    // Refill whenever she is not ACTUALLY sprinting. Before, holding the joystick far out with no
    // stamina left blocked the refill too, so she was stuck winded until she let go of the stick.
    // 0.8: Hungry = refills 40% slower; Thirsty = max stamina 80
    const smax = F.staMax();
    if (p.staDelay <= 0 && !p.running) p.sta = Math.min(smax, p.sta + (inp.m > .1 ? 13 : 20) * F.regenMul() * dt);
    if (p.sta > smax) p.sta = smax;
    if (p.sta <= 1) p.winded = true; else if (p.sta >= 30) p.winded = false;

    if (LP.on) { p.vx *= .8; p.vy *= .8; inp = { x: 0, y: 0, m: 0, run: false }; }
    if (p.st === 'free' && !LP.on) {
      if (btn.dodge && p.sta >= 25) { startDodge(inp); }
      else if ((btn.atkPressed || btn.atk) && p.sta >= 4) startSwing();
      else if (btn.use) { const it = findTarget(); if (it) startSearch(it); }
    } else if (p.st === 'swing') {
      if (btn.atkPressed) p.swingQ = true;
      if (btn.dodge && p.sta >= 25 && p.stT > .15) startDodge(inp);
    } else if (p.st === 'search') {
      if (inp.m > .25 || btn.atkPressed || btn.dodge) { cancelSearch(); if (inp.m > .25) toast('Search interrupted', 1); }
    }

    if (p.st === 'free' || p.st === 'swing') {
      running = inp.run && inp.m > .5 && p.sta > 1 && !p.winded && p.st === 'free';
      spd = (running ? 4.5 : 2.75) * T * inp.m * (p.st === 'swing' ? .35 : 1);
      if (running) { p.sta = Math.max(0, p.sta - 24 * dt); p.staDelay = .7; }
      if (!G.over) F.runDrain(dt, running, G);   // a run makes you hungry and thirsty a little faster
      const tvx = inp.x * spd, tvy = inp.y * spd;
      const k = 1 - Math.exp(-(inp.m ? 16 : 22) * dt);
      p.vx = lerp(p.vx, tvx, k); p.vy = lerp(p.vy, tvy, k);
      if (inp.m > 0 && p.st === 'free') { p.fx = inp.x; p.fy = inp.y; if (Math.abs(inp.x) > .2) p.flip = inp.x < 0; }
    } else if (p.st === 'search') {
      p.vx *= Math.exp(-20 * dt); p.vy *= Math.exp(-20 * dt);
      const s = p.search; s.t += dt;
      const o = s.it.obj, r = s.it.rect;
      s.nextNoise -= dt; s.nextFx -= dt;
      if (s.nextNoise <= 0) { s.nextNoise = .75; emitNoise(r.x + r.w / 2, r.y + r.h / 2, s.it.act === 'Push' ? 5 : s.it.noise * (scavLvl() >= 3 ? .75 : 1) * (s.it.pry && job() === 'mechanic' ? .5 : 1)); }
      if (s.nextFx <= 0) {
        s.nextFx = .16; SFX.play(s.it.act === 'Push' ? 'whoosh' : 'rummage');
        const fx0 = r.x + r.w / 2 + (Math.random() - .5) * r.w * .6, fy0 = r.y + r.h;
        puff(fx0, fy0 + 2, 10 + Math.random() * 30, 2, [P.CRM, P.MUTE, P.LIL2, P.ORA][Math.random() * 4 | 0], 70, .5, 2.6, 300);
      }
      if (s.t >= s.dur) finishSearch();
    } else if (p.st === 'dodge') {
      const k = Math.max(0, 1 - p.stT / .3);
      p.vx = p.dodx * 9.5 * T * k; p.vy = p.dody * 9.5 * T * k;
      if (p.stT > .32) p.st = 'free';
    } else if (p.st === 'hurt') {
      p.vx *= Math.exp(-8 * dt); p.vy *= Math.exp(-8 * dt);
      if (p.stT > .28) p.st = 'free';
    }
    if (p.st === 'swing') updateSwing(dt);

    // integrate
    const ox = p.x, oy = p.y;
    moveEnt(p, (p.vx + p.kbx) * dt, (p.vy + p.kby) * dt);
    p.kbx *= Math.exp(-10 * dt); p.kby *= Math.exp(-10 * dt);
    const moved = Math.hypot(p.x - ox, p.y - oy);
    p.ph += moved / (T * .42) * Math.PI * .5;
    p.stepAcc += moved;
    const stepLen = running ? T * .72 : T * .58;
    if (p.stepAcc > stepLen) {
      p.stepAcc = 0; SFX.play(running ? 'run' : 'step');
      const qn = (job() === 'thief' ? .6 : job() === 'hunter' ? .8 : 1) * (S().shoes ? .7 : 1) * (opts.quiet ? opts.quiet() : 1); if (running) emitNoise(p.x, p.y, 3 * qn, false); else emitNoise(p.x, p.y, 1.1 * qn, false);
      if (running) puff(p.x, p.y, 2, 2, 'rgba(157,144,191,.6)', 30, .4, 3);
    }
    if (moved < .05 && p.st === 'free') p.ph = lerp(p.ph, Math.round(p.ph / Math.PI) * Math.PI, .2);
    p.running = running && moved > 0.5;

    // rooms + fog
    const [cx, cy] = cellOf(p);
    const room = roomAt(cx, cy) || G.room;
    if (room !== G.room) {
      G.room = room;
      if (!G.visited[room]) {
        G.visited[room] = true;
        const R = L.rooms[room] || {};
        if (room !== streetRoom()) banner(RN(room).toUpperCase(), R.hidden ? 'a secret stash!' : R.isolated ? 'a crawlspace' : 'new room');
        if (R.hidden || R.isolated) SFX.play('alert');
      }
      if (room !== streetRoom()) G.entered = true;
      $('#room').textContent = RN(room).toUpperCase();
    }
    // leave via front door
    if (!opts.noExit && G.entered && p.y > (L.streetY + 1.35) * T && Math.abs(p.x - L.stoop.x * T) < 2.6 * T && !G.over) showSummary(); // step off the stoop to leave
  }

  function startDodge(inp) {
    const p = G.p;
    p.st = 'dodge'; p.stT = 0; p.sta -= 25; p.staDelay = .7; p.inv = .42;
    const dx = inp.m ? inp.x : p.fx, dy = inp.m ? inp.y : p.fy;
    const d = Math.hypot(dx, dy) || 1; p.dodx = dx / d; p.dody = dy / d;
    if (Math.abs(p.dodx) > .2) p.flip = p.dodx < 0;
    SFX.play('whoosh'); puff(p.x, p.y, 3, 6, 'rgba(157,144,191,.7)', 70, .45, 4);
  }
  function startSwing() {
    const p = G.p;
    // soft auto-aim toward the nearest live zombie in reach
    let best = null, bd = 2.3 * T;
    for (const z of G.zs) { if (z.dead) continue; const d = Math.hypot(z.x - p.x, z.y - p.y); if (d < bd) { bd = d; best = z; } }
    if (best && !weapon().ranged) { const dx = best.x - p.x, dy = best.y - p.y, d = Math.hypot(dx, dy) || 1; p.fx = dx / d; p.fy = dy / d; if (Math.abs(dx) > 4) p.flip = dx < 0; }
    const W = weapon(); SW_WIND = W.wind; SW_STRIKE = W.strike; SW_REC = W.rec; p.swRanged = !!W.ranged;
    if (W.ranged && !arrowsLeft()) { toast('No arrows - press R or tap the weapon to swap', 1.6); return; }
    p.st = 'swing'; p.stT = 0; p.swingHit = false; p.swingQ = false; p.sta = Math.max(0, p.sta - (W.ranged ? 3 : 7)); p.staDelay = .5; F.fight(G);
  }
  let SW_WIND = .12, SW_STRIKE = .1, SW_REC = .22;
  function updateSwing() {
    const p = G.p;
    if (!p.swingHit && p.stT >= SW_WIND) {
      p.swingHit = true;
      const W = weapon();
      if (W.ranged) { fireArrow(); }
      else {
        SFX.play('swing');
        const fa = Math.atan2(p.fy, p.fx);
        let any = false;
        for (const z of G.zs) {
          if (z.dead || z.st === 'rise' && z.stT < .3) continue;
          const dx = z.x - p.x, dy = (z.y - p.y) * 1.15, d = Math.hypot(dx, dy);
          if (d > W.reach * T) continue;
          if (d > 18 && Math.abs(angDiff(Math.atan2(dy, dx), fa)) > 1.35) continue;
          hitZombie(z, fa, W.dmg * (job() === 'brawler' ? 1.3 : 1)); any = true;
        }
        if (any) { G.hitstop = .055; G.shake = Math.max(G.shake, 5); wearWeapon(); }
        emitNoise(p.x, p.y, any ? W.noise : 1.5, any);
      }
    }
    if (p.stT >= SW_WIND + SW_STRIKE + SW_REC) {
      p.st = 'free';
      if (p.swingQ || btn.atk) { startSwing(); }
    }
  }
  function hitZombie(z, fa, base = 34, ranged) {
    const sneak = (z.st === 'sleep' || z.st === 'idle' || z.st === 'search') && z.kind !== 'turkey';
    const dmg = Math.round(base * (sneak ? (job() === 'hunter' ? 1.6 : 1.45) : 1) + Math.random() * 4);
    if (ranged && z.st !== 'chase') alertZombie(z, G.p.x, G.p.y, true);
    z.hp -= dmg; z.flash = 1; z.hurtDir = Math.cos(fa) >= 0 ? 1 : -1;
    z.kbx = Math.cos(fa) * 5.5 * T; z.kby = Math.sin(fa) * 5.5 * T * .8;
    if (z.kind === 'krampus') { z.kbx *= .45; z.kby *= .45; }   // heavy: barely budges
    dmgNum(z.x + 20 * (Math.random() < .5 ? -1 : 1), z.y - 104, dmg, sneak ? P.ORA : P.CRM);
    splat(z.x, z.y, fa, z.hp <= 0);
    puff(z.x, z.y, 44, 5, P.CRM, 90, .25, 2.2);
    SFX.play(z.hp <= 0 ? 'kill' : 'hit');
    if (z.hp <= 0) {
      z.dead = true; z.st = 'dead'; z.stT = 0; z.fallDir = z.hurtDir; G.stats.kills++;
      if (DM.Game && DM.Game.onKill) DM.Game.onKill(z);
      return;
    }
    if (z.st === 'sleep') { z.st = 'rise'; z.stT = .25; z.alertT = 1; SFX.play('groan'); }
    else if (z.kind === 'turkey' && (z.st === 'windup' || z.st === 'lunge')) { z.kbx *= .3; z.kby *= .3; } // it does not flinch mid-peck
    else if (z.st !== 'rise') { z.st = 'hurt'; z.stT = z.kind === 'turkey' ? .17 : 0; z.lunge = null; }
  }
  function hurtPlayer(dmg, dx, dy, z) {
    const p = G.p;
    if (p.inv > 0 || p.st === 'down') return;
    cancelSearch(); p.auto = null; if (G.sheet) closeSheet(); if (LP.on) closeLock('You flinched - the pick slipped out');
    dmg = Math.round(dmg * (z && z.dmgMul || 1));
    p.hp = Math.max(0, p.hp - dmg); p.inv = .7; p.flash = .55;
    p.kbx = dx * 6 * T; p.kby = dy * 6 * T * .8;
    p.st = 'hurt'; p.stT = 0;
    G.shake = 12; G.redFlash = 1; G.hitstop = .06;
    SFX.play('hurt');
    dmgNum(p.x, p.y - 90, dmg, '#ff6b5a');
    splat(p.x, p.y, Math.atan2(dy, dx), false);
    if (p.hp <= 0) { p.st = 'down'; p.stT = 0; closeSheet(true); }
  }

  // ---------------------------------------------------------------- zombies
  function playerField() {
    const [cx, cy] = cellOf(G.p); const c = cy * MW + cx;
    if (c !== G.fieldCell || G.t - G.fieldT > .3) { G.field = bfs(cx, cy); G.fieldCell = c; G.fieldT = G.t; }
    return G.field;
  }
  function canSee(z) {
    const p = G.p; if (p.st === 'down') return false;
    const dx = p.x - z.x, dy = p.y - z.y, d = Math.hypot(dx, dy) / T;
    if (d > 7) return false;
    const facing = (dx < 0) === (z.fx < 0);
    if (d > 2.6 && !facing) return false;
    if (d > 4 && !p.running && G.room !== z.roomNow && Math.random() < .5) return false;
    return losClear(z.x, z.y - 30, p.x, p.y - 30);
  }
  function updateZombie(z, dt) {
    if (opts.zupdate && opts.zupdate(z, dt)) return;   // the weekly boss (boss.js) runs its own brain
    z.stT += dt; z.flash = Math.max(0, z.flash - dt * 6); z.alertT = Math.max(0, z.alertT - dt); z.cd = Math.max(0, z.cd - dt);
    const p = G.p;
    const [zx, zy] = cellOf(z); z.roomNow = roomAt(zx, zy);
    let vx = 0, vy = 0, spd = 0;
    const dxp = p.x - z.x, dyp = p.y - z.y, dp = Math.hypot(dxp, dyp);
    z.sightT -= dt;
    const look = () => { if (z.sightT <= 0) { z.sightT = .2; if (canSee(z)) { alertZombie(z, p.x, p.y, true); return true; } } return false; };
    const face = (x) => { if (Math.abs(x) > .15) { z.fx = Math.sign(x); z.flip = x > 0; } };
    switch (z.st) {
      case 'sleep':
        if ((dp < .7 * T || (dp < 1.6 * T && p.running)) && p.st !== 'down') alertZombie(z, p.x, p.y, false);
        break;
      case 'rise': {
        z.rot = lerp(-Math.PI / 2, 0, Math.min(1, z.stT / .9));
        if (z.stT < .05) { z.sx0 = z.x; z.sy0 = z.y; }
        const k = Math.min(1, z.stT / .9);
        const wk = z.sleep ? z.sleep.wake : { x: z.sx0 / T, y: z.sy0 / T + .8 }; z.x = lerp(z.sx0, wk.x * T, k * .25); z.y = lerp(z.sy0, wk.y * T, k);
        if (z.stT >= .9) { z.rot = 0; z.y = wk.y * T; z.st = 'investigate'; z.target = z.target || { x: p.x, y: p.y }; z.stT = 0; if (canSee(z)) alertZombie(z, p.x, p.y, true); }
        break;
      }
      case 'idle': {
        z.wanderT -= dt;
        if (z.wanderT <= 0) { z.wanderT = 2.5 + Math.random() * 3; z.wtx = z.x + (Math.random() - .5) * 2.2 * T; z.wty = z.y + (Math.random() - .5) * 1.4 * T; }
        if (z.wtx != null) { const dx = z.wtx - z.x, dy = z.wty - z.y, d = Math.hypot(dx, dy); if (d > 4) { spd = .45 * T; vx = dx / d; vy = dy / d; face(vx); } }
        if (z.groanT -= dt, z.groanT <= 0) { z.groanT = 6 + Math.random() * 8; if (Math.hypot(dxp, dyp) < 9 * T) SFX.play(z.kind === 'turkey' ? 'gobble' : 'groan'); }
        look();
        break;
      }
      case 'investigate': {
        if (look()) break;
        if (!z.target) { z.st = 'idle'; break; }
        const d = Math.hypot(z.target.x - z.x, z.target.y - z.y);
        if (d < T * .7) {
          if (z.hunter && G.p.st !== 'down') { z.target = { x: G.p.x, y: G.p.y }; z.path = null; z.stT = 0; break; } // it can smell her
          z.stT = 0; z.st = 'search'; z.target = null; break;
        }
        const [tx, ty] = cellOf(z.target);
        if (!z.path || z.pathKey !== ty * MW + tx) { z.path = bfs(tx, ty); z.pathKey = ty * MW + tx; }
        const st = nextStep(z, z.path);
        const tgt = st.same ? z.target : st;
        const dx = tgt.x - z.x, dy = tgt.y - z.y, dd = Math.hypot(dx, dy) || 1;
        spd = (z.hunter ? 1.5 : 1.25) * T; vx = dx / dd; vy = dy / dd; face(vx);
        if (z.stT > 14 && !z.hunter) { z.st = 'idle'; z.target = null; }
        if (z.hunter && z.stT > 6) { z.target = { x: G.p.x, y: G.p.y }; z.path = null; z.stT = 0; }
        break;
      }
      case 'search': // look around after reaching noise
        if (look()) break;
        if (Math.floor(z.stT * 1.2) % 2 === 0) z.flip = true; else z.flip = false;
        if (z.stT > 3) { z.st = 'idle'; z.stT = 0; }
        break;
      case 'chase': {
        if (p.st === 'down') { z.st = 'idle'; break; }
        z.groanT -= dt; if (z.groanT <= 0) { z.groanT = 3 + Math.random() * 4; SFX.play(z.kind === 'turkey' ? 'gobble' : 'groan'); }
        const see = losClear(z.x, z.y - 30, p.x, p.y - 30);
        if (see) { z.lastSeen = { x: p.x, y: p.y }; z.lostT = 0; } else z.lostT += dt;
        if (z.lostT > 5) { z.st = 'investigate'; z.target = z.lastSeen; z.path = null; z.stT = 0; break; }
        if (dp < (z.kind === 'turkey' ? 1 : 1.2) * T && see && z.cd <= 0) { z.st = 'windup'; z.stT = 0; face(dxp); SFX.play(z.kind === 'turkey' ? 'gobble' : 'alert'); break; }
        let tgt;
        if (see && dp < 3.2 * T) tgt = { x: p.x, y: p.y };
        else { const st = nextStep(z, playerField()); tgt = st.same ? { x: p.x, y: p.y } : st; }
        const dx = tgt.x - z.x, dy = tgt.y - z.y, dd = Math.hypot(dx, dy) || 1;
        spd = (1.85 + .25 * Math.sin(G.t * 2 + z.id * 9)) * T;
        if (dp < .75 * T) spd = 0;
        vx = dx / dd; vy = dy / dd; face(dxp);
        if (z.kind === 'turkey') { // fast and erratic: darting zig-zags
          spd = (2.9 + 1.2 * Math.sin(G.t * 7 + z.id * 5)) * T; if (dp < .6 * T) spd = 0;
          const zig = Math.sin(G.t * 9 + z.id * 3) * .9; const nx = vx - vy * zig, ny = vy + vx * zig, nn = Math.hypot(nx, ny) || 1; vx = nx / nn; vy = ny / nn;
        }
        break;
      }
      case 'windup':
        face(dxp);
        if (z.stT < .5) { const d = dp || 1; vx = -dxp / d; vy = -dyp / d; spd = .25 * T; }
        if (z.stT >= (z.kind === 'turkey' ? .48 : .62)) { const d = dp || 1; z.lunge = { x: dxp / d, y: dyp / d, hit: false }; z.st = 'lunge'; z.stT = 0; SFX.play('whoosh'); }
        break;
      case 'lunge': {
        const L = z.lunge; spd = 4.8 * T * Math.max(0, 1 - z.stT / .24); vx = L.x; vy = L.y;
        if (!L.hit && p.inv <= 0 && p.st !== 'down') {
          const d = Math.hypot(p.x - z.x, (p.y - z.y) * 1.2);
          if (d < (z.kind === 'turkey' ? .75 : .85) * T) { L.hit = true; hurtPlayer(z.kind === 'turkey' ? 9 + Math.round(Math.random() * 4) : 16 + Math.round(Math.random() * 6), L.x, L.y, z); }
        }
        if (z.stT >= .26) { z.st = 'recover'; z.stT = 0; }
        break;
      }
      case 'recover':
        if (z.stT > (z.kind === 'turkey' ? .45 : .75)) { z.st = 'chase'; z.stT = 0; z.cd = z.kind === 'turkey' ? .15 : .35; }
        break;
      case 'hurt':
        if (z.stT > .32) { z.st = 'chase'; z.stT = 0; z.cd = .25; z.lostT = 0; }
        break;
      case 'dead':
        z.rot = lerp(z.rot, z.fallDir * Math.PI / 2, Math.min(1, dt * 9));
        if (Math.abs(z.rot) > 1.5) z.rot = z.fallDir * Math.PI / 2;
        break;
    }
    if (z.st === 'sleep' || z.st === 'rise') return;
    if (opts.zslow && !z.dead) spd *= opts.zslow(z);
    const tvx = vx * spd, tvy = vy * spd;
    const k = 1 - Math.exp(-10 * dt);
    z.vx = lerp(z.vx, tvx, k); z.vy = lerp(z.vy, tvy, k);
    const ox = z.x, oy = z.y;
    moveEnt(z, (z.vx + z.kbx) * dt, (z.vy + z.kby) * dt);
    z.kbx *= Math.exp(-9 * dt); z.kby *= Math.exp(-9 * dt);
    z.ph += Math.hypot(z.x - ox, z.y - oy) / (T * .5) * Math.PI * .5;
    if (opts.ztick && !z.dead) opts.ztick(z, dt, Math.hypot(z.x - ox, z.y - oy));
  }
  function separate() {
    const all = G.zs.filter(z => !z.dead && z.st !== 'sleep' && z.st !== 'rise');
    for (let i = 0; i < all.length; i++) {
      const a = all[i];
      for (let j = i + 1; j < all.length; j++) {
        const b = all[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
        if (d < 26 && d > .01) { const push = (26 - d) / 2; moveEnt(a, -dx / d * push, -dy / d * push); moveEnt(b, dx / d * push, dy / d * push); }
      }
      const p = G.p, dx = p.x - a.x, dy = p.y - a.y, d = Math.hypot(dx, dy);
      if (d < 22 && d > .01 && p.st !== 'down') moveEnt(a, -dx / d * (22 - d), -dy / d * (22 - d));
    }
  }

  function updateWorld(dt) {
    // fog
    if (!opts.noFog) for (const k in G.fog) {
      const R = L.rooms[k], cur = L.rooms[G.room] || {};
      const target = k === G.room ? 0 : R.isolated ? .99 : cur.isolated ? 1 : k === streetRoom() ? .12 : G.visited[k] ? .45 : R.hidden ? .99 : .97;
      G.fog[k] = lerp(G.fog[k], target, 1 - Math.exp(-(target < G.fog[k] ? 5 : 2) * dt));
    }
    G.noiseLvl = Math.max(0, G.noiseLvl - dt * .28);
    for (const f of G.furn) if (f.keyDoor && f.swing && f.swing < 1) { f.swing = Math.min(1, f.swing + dt * 2.4); f._key = null; if (f.swing >= 1) { buildWalls(); buildSolid(); } }
    // particles
    for (const q of G.parts) {
      q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= Math.exp(-2.2 * dt); q.vy *= Math.exp(-2.2 * dt);
      if (q.g) { q.vz -= q.g * dt; q.z += q.vz * dt; if (q.z < 0) { q.z = 0; q.vz = 0; q.vx *= .3; q.vy *= .3; if (q.blood && !q.landed) { q.landed = 1; if (Math.random() < .5) G.decals.push({ x: q.x, y: q.y, r: 2 + Math.random() * 3, rot: 0, col: q.col, a: .7 }); } } }
      else q.z += q.vz * dt;
    }
    G.parts = G.parts.filter(q => q.life > 0);
    if (G.decals.length > 120) G.decals.splice(0, G.decals.length - 120);
    for (const r of G.rings) r.t += dt; G.rings = G.rings.filter(r => r.t < .9);
    for (const d of G.drops) d.t += dt;
    for (const n of G.nums) n.t += dt; G.nums = G.nums.filter(n => n.t < .9);
    for (const b of G.banners) b.t += dt; G.banners = G.banners.filter(b => b.t < 2.4);
    // secret shelves
    for (const s of G.sec) {
      if (s.type !== 'shelf') continue;
      const sh = G.furn[s.furn];
      if (sh.slideState === 'sliding') {
        sh.slideT += dt; sh.slide = Math.min(1, sh.slideT / .9); sh._key = null;
        if (Math.random() < .6) puff(sh.x + sh.slide * T + 4, sh.y + sh.h - 2, 4, 1, 'rgba(234,210,164,.6)', 40, .6, 3);
        G.shake = Math.max(G.shake, 1.5);
        if (sh.slide >= 1) { sh.slideState = 'open'; G.secretOpen = true; foundSecret(s); buildWalls(); buildSolid(); }
      }
      if (scavLvl() >= 6 && !G.secretOpen && G.room === sh.room && Math.hypot(G.p.x - sh.x, G.p.y - sh.y) < 5 * T) { // Keen eye only, and subtle
      G.secretHint -= dt;
      if (G.secretHint <= 0) {
        G.secretHint = .45;
        G.parts.push({ x: sh.x + 4 + Math.random() * 6, y: sh.y + .9 * T, z: 4 + Math.random() * 30, vx: 6 + Math.random() * 10, vy: 3 + Math.random() * 6, vz: (Math.random() - .3) * 6, g: 0, life: 1.8, max: 1.8, col: 'rgba(220,226,255,.35)', size: 1.4 + Math.random(), mote: 1 });
      }
      }
    }
    updateArrows(dt);
    // the third zombie wanders in from the street
    if (!G.z3 && L.wanderer !== false && (G.t > (L.wandererT || 70) || (G.stats.searched >= 9 && G.t > 35))) {
      G.z3 = true; const z = mkZombie(1.5 * T, (L.streetY + 1.4) * T, 'investigate', streetRoom()); z.target = { x: L.stoop.x * T, y: (L.streetY - 3) * T }; z.hunter = true; if (L.wanderHp) z.hp = z.maxHp = L.wanderHp; G.zs.push(z);
      toast('Something is shuffling up the stoop...', 3); SFX.play('groan');
    }
    // camera
    const p = G.p;
    const vw = DEV.W / DEV.zoom, vh = DEV.H / DEV.zoom;
    let tx = p.x + p.fx * T * .5, ty = p.y - 34 + p.fy * T * .4;
    tx = clamp(tx, vw / 2 + T * .6, MW * T - vw / 2 - T * .6); if (vw > MW * T) tx = MW * T / 2;
    ty = clamp(ty, vh / 2 - T * 2, MH * T - vh / 2 + T * 5.5);
    const k = 1 - Math.exp(-6 * dt);
    G.cam.x = lerp(G.cam.x, tx, k); G.cam.y = lerp(G.cam.y, ty, k);
    // wall cutaway near the player
    // 0.8: subtle - only the wall segment actually in front of her sprite fades, only to ~65%, and only walls of rooms she has been in
    for (const c of wallCells) {
      if (!c.face && !c.lintel) continue;
      const x0 = c.face ? c.face.x0 : c.x * T, x1 = c.face ? c.face.x1 : (c.x + 1) * T;
      const fr = c.face ? c.face.room : roomAt(c.x, c.y + 1);
      const covers = p.y < c.key - 4 && p.y > c.key - WH - 6 && p.x + 12 > x0 && p.x - 12 < x1;
      const target = covers && (!fr || G.visited[fr] || fr === G.room) ? .65 : 1;
      c.cut = lerp(c.cut, target, 1 - Math.exp(-7 * dt));
    }
  }

  // ---------------------------------------------------------------- static layers
  let floorCv = null;
  function buildStatic() {
    const fs = DEV.fs;
    floorCv = document.createElement('canvas'); floorCv.width = MW * T * fs; floorCv.height = MH * T * fs;
    const c = floorCv.getContext('2d'); c.scale(fs, fs);
    c.fillStyle = '#0b0c20'; c.fillRect(0, 0, MW * T, MH * T);
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
      let rm = roomAt(x, y);
      if (!rm && isWall(x, y)) rm = roomAt(x, y - 1) || roomAt(x - 1, y) || roomAt(x + 1, y) || roomAt(x, y + 1);
      if (ch(x, y) === '=') rm = roomAt(x, y + 1);
      if (isWall(x, y) && isVoid(x, y + 1) && y < L.streetY) rm = null; // pockets: nothing below their south wall
      if (!rm) continue;
      // 0.9: under an outside wall, only the inner half gets floor - no strip of floor outside the house
      const vw = isWall(x, y) && isVoid(x - 1, y), ve = isWall(x, y) && isVoid(x + 1, y);
      if (vw || ve) { c.save(); c.beginPath(); const x0 = vw ? x * T + T / 2 - WT / 2 : x * T, x1 = ve ? x * T + T / 2 + WT / 2 : (x + 1) * T; c.rect(x0, y * T, x1 - x0, T); c.clip(); }
      ART.drawFloorTile(c, styleOf(rm), x, y, T);
      if (vw || ve) c.restore();
    }
    // street + curb
    const sy = L.streetY;
    if (!L.noStreet) {
    c.fillStyle = '#23223c'; c.fillRect(0, (sy + 1.55) * T, MW * T, T); ART.line(c, 0, (sy + 1.55) * T, MW * T, (sy + 1.55) * T, '#4a4870', 3);
    // street lamp pools
    for (const f of G.furn) if (f.art === 'lamppost') { const lx = f.x + f.w / 2, ly = f.y + f.h * .9; const g = c.createRadialGradient(lx, ly, 4, lx, ly, T * 3.2); g.addColorStop(0, 'rgba(246,227,187,.22)'); g.addColorStop(1, 'rgba(246,227,187,0)'); c.fillStyle = g; c.fillRect(lx - 4.5 * T, ly - 3.4 * T, 9 * T, 6 * T); }
    // stoop steps
    for (let i = 0; i < 3; i++) ART.blk(c, (L.stoop.x - 1.5) * T + 6 - i * 4, sy * T + i * 13, 2 * T + 20 + i * 8, 13, ['#5a5878', '#4f4d6c', '#45435f'][i], 2, 2);
    }
    // rugs
    for (const r of L.rugs || []) rug(c, r[0] * T, r[1] * T, r[2] * T, r[3] * T, ...RUGS[r[4] || 0]);
    // ambient occlusion under wall faces
    for (const w of wallCells.concat(...wallCells.map(c => c.sub || []))) if (w.face) {
      const g = c.createLinearGradient(0, w.key, 0, w.key + 16); g.addColorStop(0, 'rgba(10,8,24,.45)'); g.addColorStop(1, 'rgba(10,8,24,0)');
      c.fillStyle = g; c.fillRect(w.face.x0, w.key, w.face.x1 - w.face.x0, 16);
    }
    // vertical wall side shadows
    faceCache.clear();
    for (const f of G.furn) f._key = null;
  }
  const RUGS = [[P.ORAD, P.ORA, '#8a3f20'], ['#3f4c7a', '#5a6aa0', P.CRMD], ['#5c2f3c', '#7a3f4e', P.CRMD], ['#93a86c', '#7a8f58', P.CRM], ['#4a3c70', '#6e5ea0', P.CRM]];
  function rug(c, x, y, w, h, a, b, edge) {
    ART.rr(c, x, y, w, h, 6); c.fillStyle = a; c.fill(); c.lineWidth = 2.4; c.strokeStyle = P.INK; c.stroke();
    ART.rr(c, x + 6, y + 6, w - 12, h - 12, 4); c.strokeStyle = b; c.lineWidth = 3; c.stroke();
    c.fillStyle = b; for (let i = 0; i < 6; i++) { const xx = x + w * (.2 + .6 * ART.hash(i, 1)), yy = y + h * (.2 + .6 * ART.hash(i, 2)); c.save(); c.translate(xx, yy); c.rotate(.785); c.fillRect(-4, -4, 8, 8); c.restore(); }
    c.strokeStyle = edge; c.lineWidth = 1.2; for (let xx = x + 4; xx < x + w - 2; xx += 6) { ART.line(c, xx, y - 3, xx, y, edge, 1.2); ART.line(c, xx, y + h, xx, y + h + 3, edge, 1.2); }
  }
  function faceCanvas(w) {
    let fc = faceCache.get(w); if (fc) return fc;
    const fs = DEV.fs, x0 = w.face.x0, wd = w.face.x1 - x0, top = w.key - WH;
    fc = document.createElement('canvas'); fc.width = Math.ceil(wd * fs); fc.height = Math.ceil(WH * fs);
    const c = fc.getContext('2d'); c.scale(fs, fs); c.translate(-x0, -top);
    ART.drawWallFace(c, styleOf(w.face.room), x0, top, wd, WH, w.x);
    drawDecor(c, w, x0, top, wd);
    c.strokeStyle = P.INK; c.lineWidth = 2; ART.line(c, x0, top + 1, x0 + wd, top + 1, P.INK, 2);
    faceCache.set(w, fc); return fc;
  }
  function drawDecor(c, w, x, y, wd) {
    const d = w.face.decor; if (!d) return;
    const cx = x + wd / 2;
    switch (d) {
      case 'upper': ART.blk(c, x + 1, y + 4, wd - 2, 24, P.LILD, 2, 2.2); ART.blk(c, x + 5, y + 7, wd - 10, 18, null, 2, 1.4); ART.dot(c, cx, y + 22, 2, P.INK); break;
      case 'window': {
        const left = ch(w.x - 1, w.y) === ch(w.x, w.y) && L.decor[(w.x - 1) + ',' + w.y] === 'window', right = L.decor[(w.x + 1) + ',' + w.y] === 'window';
        const x0 = left ? x : x + 8, x1 = right ? x + wd : x + wd - 8;
        c.fillStyle = '#1b2350'; c.fillRect(x0, y + 8, x1 - x0, 34);
        c.fillStyle = 'rgba(246,227,187,.08)'; c.fillRect(x0, y + 8, x1 - x0, 12);
        if (!left) { ART.dot(c, x0 + 14, y + 18, 5, 'rgba(246,227,187,.55)'); }
        c.fillStyle = 'rgba(42,31,74,.9)'; c.fillRect(x0, y + 8, x1 - x0, 5);
        c.strokeStyle = P.INK; c.lineWidth = 2.4; c.beginPath(); c.moveTo(x0, y + 8); c.lineTo(x1, y + 8); c.moveTo(x0, y + 42); c.lineTo(x1, y + 42);
        if (!left) { c.moveTo(x0, y + 8); c.lineTo(x0, y + 42); } if (!right) { c.moveTo(x1, y + 8); c.lineTo(x1, y + 42); } c.stroke();
        ART.line(c, x0, y + 25, x1, y + 25, P.LILD, 2.4); if (!right) ART.line(c, x1 - 1, y + 8, x1 - 1, y + 42, P.LILD, 2);
        ART.blk(c, x0 - (left ? 0 : 3), y + 41, x1 - x0 + (left ? 0 : 3) + (right ? 0 : 3), 5, P.CRMD, 1, 1.6);
        break;
      }
      case 'clock': ART.dot(c, cx, y + 22, 10, P.INK); ART.dot(c, cx, y + 22, 8, P.CRM); ART.line(c, cx, y + 22, cx, y + 16, P.INK, 1.6); ART.line(c, cx, y + 22, cx + 4, y + 24, P.INK, 1.6); break;
      case 'tally': for (let i = 0; i < 4; i++) ART.line(c, x + 10 + i * 4, y + 16, x + 10 + i * 4, y + 30, 'rgba(246,227,187,.5)', 1.4); ART.line(c, x + 7, y + 26, x + 26, y + 19, 'rgba(246,227,187,.5)', 1.4); break;
      case 'tally2': for (let i = 0; i < 3; i++) ART.line(c, x + 12 + i * 4, y + 14, x + 12 + i * 4, y + 28, 'rgba(246,227,187,.45)', 1.4); break;
      case 'scrawl': c.save(); c.font = 'bold 9px system-ui, sans-serif'; c.fillStyle = 'rgba(181,58,46,.75)'; c.textAlign = 'center'; c.translate(cx + 22, y + 26); c.rotate(-.06); c.fillText('STAY QUIET', 0, 0); c.restore(); break;
      case 'mirror': if (L.decor[(w.x - 1) + ',' + w.y] !== 'mirror') { ART.blk(c, x + 10, y + 6, wd * 2 - 20, 30, '#8e98b4', 6, 2.4); c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(x + 18, y + 10, 5, 20); ART.line(c, x + 30, y + 12, x + 46, y + 28, 'rgba(17,20,47,.5)', 1.2); } break;
      case 'hooks': for (let i = 0; i < 3; i++) { ART.dot(c, x + 10 + i * 12, y + 14, 2.4, '#9aa0b4'); } ART.blk(c, x + 20, y + 15, 12, 22, P.ORAD, 3, 1.8); break;
      case 'frame': ART.blk(c, x + 10, y + 10, wd - 20, 24, P.WOOD, 2, 2); ART.blk(c, x + 14, y + 14, wd - 28, 16, P.MUTE, 1, 1.2); break;
      case 'frame2': ART.blk(c, x + 8, y + 8, wd - 16, 28, P.CRMD, 2, 2); ART.dot(c, cx, y + 18, 4, P.ORAD); ART.blk(c, cx - 6, y + 22, 12, 10, P.LIL, 3, 1.2); break;
      case 'painting': if (L.decor[(w.x - 1) + ',' + w.y] !== 'painting') {
        ART.blk(c, x + 12, y + 6, wd * 2 - 24, 32, P.ORA, 2, 2.4); ART.blk(c, x + 16, y + 10, wd * 2 - 32, 24, '#2a2440', 1, 1.4);
        c.fillStyle = P.CRMD; c.beginPath(); c.moveTo(x + 18, y + 32); c.lineTo(x + 34, y + 16); c.lineTo(x + 46, y + 28); c.lineTo(x + 54, y + 20); c.lineTo(x + wd * 2 - 18, y + 32); c.fill();
        ART.dot(c, x + wd * 2 - 26, y + 15, 3, P.CRM);
        c.save(); c.translate(x + wd * 2 - 26, y + 4); c.rotate(.2); ART.blk(c, -1, 0, 2, 8, P.INK, 0, 0); c.restore();
      } break;
      case 'crack': ART.line(c, x + 22, y + 8, x + 18, y + 22, 'rgba(10,8,24,.8)', 1.6); ART.line(c, x + 18, y + 22, x + 24, y + 34, 'rgba(10,8,24,.8)', 1.6); ART.line(c, x + 24, y + 34, x + 20, y + WH - 8, 'rgba(10,8,24,.8)', 1.6); break;
      case 'fwin': {
        const left = L.decor[(w.x - 1) + ',' + w.y] === 'fwin';
        if (!left) {
          ART.blk(c, x + 8, y + 6, wd * 2 - 16, 40, '#1b2350', 3, 2.4);
          c.fillStyle = 'rgba(240,123,60,.18)'; c.fillRect(x + 11, y + 26, wd * 2 - 22, 17);
          ART.line(c, x + wd, y + 6, x + wd, y + 46, P.INK, 2.4); ART.line(c, x + 8, y + 26, x + wd * 2 - 8, y + 26, P.INK, 2);
          ART.blk(c, x + 4, y + 44, wd * 2 - 8, 6, P.LIL, 1, 1.6);
          c.fillStyle = 'rgba(17,20,47,.8)'; c.save(); c.translate(x + 30, y + 14); c.rotate(.6); c.fillRect(-1, 0, 2, 16); c.restore();
        }
        break;
      }
      case 'num': ART.blk(c, x + 10, y + 14, 24, 16, P.CRM, 2, 2); c.fillStyle = P.INK; c.font = '900 11px system-ui, sans-serif'; c.textAlign = 'center'; c.fillText(String(L.houseNum || ''), cx, y + 26); break;
      case 'lamp': ART.blk(c, cx - 6, y + 8, 12, 16, P.ORA, 3, 2); c.fillStyle = 'rgba(240,123,60,.25)'; c.beginPath(); c.arc(cx, y + 16, 18, 0, 6.3); c.fill(); break;
    }
  }
  function furnCanvas(f) {
    const key = (f.searched ? 1 : 0) + ':' + (f.slide || 0).toFixed(2) + (f.keyLock ? ':k' : '') + (f.swing ? ':' + f.swing.toFixed(2) : '');
    if (f._key === key && f._c) return f._c;
    const fs = DEV.fs, g = ART.geo(f);
    const bx = f.x - 16, by = g.ty0 - 40, bw = f.w + 32, bh = f.y + f.h + 8 - by;
    const c0 = f._c && f._c.width === Math.ceil(bw * fs) && f._c.height === Math.ceil(bh * fs) ? f._c : document.createElement('canvas');
    c0.width = Math.ceil(bw * fs); c0.height = Math.ceil(bh * fs);
    const c = c0.getContext('2d'); c.setTransform(fs, 0, 0, fs, 0, 0); c.clearRect(0, 0, bw, bh); c.translate(-bx, -by);
    (ART.FURN[f.art] || ART.FURN.counter)(c, f, g);
    f._c = c0; f._key = key; f._b = { x: bx, y: by, w: bw, h: bh };
    return c0;
  }

  // ---------------------------------------------------------------- render
  function render() {
    const W = cv.width, H = cv.height, dbg = DM.dbgView; // dbgView: whole-house overview for screenshots
    const S = dbg ? Math.min(W / (MW * T), H / ((MH + 1) * T)) : DEV.dpr * DEV.zoom;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0b0c20'; ctx.fillRect(0, 0, W, H);
    const sx = (Math.random() - .5) * G.shake, sy = (Math.random() - .5) * G.shake;
    const camx = dbg ? MW * T / 2 : G.cam.x + sx, camy = dbg ? MH * T / 2 : G.cam.y + sy;
    const ox = Math.round(W / 2 - camx * S), oy = Math.round(H / 2 - camy * S);
    ctx.setTransform(S, 0, 0, S, ox, oy);
    const vx0 = camx - W / S / 2 - T * 2, vx1 = camx + W / S / 2 + T * 2, vy0 = camy - H / S / 2 - T * 2, vy1 = camy + H / S / 2 + T * 3;

    ctx.imageSmoothingEnabled = true;
    if (!L.noStreet) ctx.fillStyle = '#23223c', ctx.fillRect(-T * 4, MH * T - 2, MW * T + T * 8, T * 8);
    if (!L.noStreet) ctx.fillStyle = 'rgba(201,168,90,.35)'; for (let x = -3; x < MW + 4; x += 3) ctx.fillRect(x * T, (MH + 1.6) * T, T * 1.3, 3);
    ctx.drawImage(floorCv, 0, 0, MW * T, MH * T);
    drawSecretsFloor();
    if (opts.drawUnder) opts.drawUnder(ctx, G);
    // decals
    for (const d of G.decals) {
      ctx.globalAlpha = d.a; ctx.fillStyle = d.col; ctx.beginPath(); ctx.ellipse(d.x, d.y, d.r, d.r * .55, d.rot, 0, 6.28); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // player light pool
    const p = G.p;
    const lg = ctx.createRadialGradient(p.x, p.y - 10, 4, p.x, p.y - 10, T * 3.2);
    lg.addColorStop(0, 'rgba(246,227,187,.10)'); lg.addColorStop(1, 'rgba(246,227,187,0)');
    ctx.fillStyle = lg; ctx.fillRect(p.x - T * 3.3, p.y - T * 3.3, T * 6.6, T * 6.6);

    // y-sorted world
    const list = [];
    for (const w of wallCells) { if (w.key < vy0 || w.key - WH - T > vy1 || (w.x + 1) * T < vx0 || w.x * T > vx1) continue; list.push({ k: w.key, w }); }
    for (const d of doorLeaves) list.push({ k: d.key, d });
    for (const d of G.drops) list.push({ k: d.y - 2, dr: d });
    for (const s of G.sec) if (s.type === 'attic' && s.st === 1) list.push({ k: s.hatch.y * T - 14, lad: s });
    for (const f of G.furn) { const k = f.wall ? f.y + f.h + .5 : f.y + f.h; if (k + 10 < vy0 || f.y - 120 > vy1) continue; list.push({ k, f }); }
    for (const z of G.zs) list.push({ k: z.sleep && (z.st === 'sleep' || z.st === 'rise' && z.stT < .5) ? z.sleep.key * T + 1 : z.dead ? z.y - 14 : z.y, z });
    if (opts.sprites) for (const s of opts.sprites(G)) list.push({ k: s.k, sp: s });   // pets, crew, hidden survivors (crew.js)
    list.push({ k: p.y, pl: 1 });
    list.sort((a, b) => a.k - b.k);
    for (const it of list) {
      if (it.w) drawWall(it.w);
      else if (it.d) drawDoor(it.d);
      else if (it.dr) drawDrop(it.dr);
      else if (it.lad) drawLadder(false, it.lad.hatch.x * T + 2, it.lad.hatch.y * T - 14);
      else if (it.f) { const f = it.f, cvs = furnCanvas(f); if (f.lootable && f.searched && !(f.loot0 && f.loot0.length) && !(f.secret && !G.secretOpen)) ctx.globalAlpha = .82; ctx.drawImage(cvs, f._b.x + (f.slide || 0) * T, f._b.y, f._b.w, f._b.h); ctx.globalAlpha = 1; if (f.art === 'crate' && !f.searched) ART.candle(ctx, f.x + f.w - 12, ART.geo(f).ty0 + 12, G.t); }
      else if (it.sp) it.sp.draw(ctx);
      else if (it.z) drawZombie(it.z);
      else drawPlayer();
    }
    // particles
    for (const q of G.parts) {
      const a = Math.min(1, q.life / q.max * 2);
      ctx.globalAlpha = q.mote ? a * (.5 + .5 * Math.sin(G.t * 4 + q.x)) : a; ctx.fillStyle = q.col;
      ctx.fillRect(q.x - q.size / 2, q.y - q.z - q.size / 2, q.size, q.size);
    }
    ctx.globalAlpha = 1;
    drawArrows();
    // candle glow in hidden stashes
    for (const f of G.furn) if (f.art === 'crate' && f.secretLoot && (G.visited[f.room] || G.secretOpen)) { const gx = f.x + f.w - 12, gy = f.y + 10; const cg = ctx.createRadialGradient(gx, gy, 2, gx, gy, T * 2.5); cg.addColorStop(0, 'rgba(255,190,110,.22)'); cg.addColorStop(1, 'rgba(255,190,110,0)'); ctx.fillStyle = cg; ctx.fillRect(gx - 2.5 * T, gy - 2.5 * T, 5 * T, 5 * T); }

    if (!dbg && !opts.noFog) drawFog();
    drawOverlays();
    if (opts.drawOver) opts.drawOver(ctx, G);

    // screen space
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(E.vignette, 0, 0, W, H);
    if (G.redFlash > 0) { ctx.fillStyle = `rgba(181,58,46,${G.redFlash * .32})`; ctx.fillRect(0, 0, W, H); }
    if (p.hp < 35 && p.st !== 'down') { ctx.fillStyle = `rgba(181,58,46,${.08 + .06 * Math.sin(G.t * 5)})`; ctx.fillRect(0, 0, W, H); }
    if (EVA && EVA.ev.accent.snow) drawSnow(W, H);
    drawBanners();
    drawLock();
  }

  // Christmas: a cold blue tint and slow snow, drawn in screen space (light: ~40 flakes)
  function drawSnow(W, H) {
    ctx.fillStyle = 'rgba(150,190,255,.06)'; ctx.fillRect(0, 0, W, H);
    const out = G.room === streetRoom(), n = out ? 46 : 18, sc = DEV.dpr * DEV.zoom;
    ctx.fillStyle = out ? 'rgba(246,240,255,.75)' : 'rgba(246,240,255,.28)';
    for (let i = 0; i < n; i++) {
      const sp = 18 + (i * 37 % 23), x = ((i * 97.3 + Math.sin(G.t * .6 + i) * 18 - G.cam.x * .2) % W + W) % W, y = ((i * 61.7 + G.t * sp * sc - G.cam.y * .2) % H + H) % H;
      ctx.beginPath(); ctx.arc(x, y, (1.2 + (i % 3) * .7) * sc, 0, 6.29); ctx.fill();
    }
  }
  function drawWall(w) {
    const a = w.cut;
    if (a < .99) ctx.globalAlpha = a;
    if (w.lintel) {
      const x = w.x * T, y = w.key;
      ctx.fillStyle = '#1d1636'; ctx.fillRect(x, y - WH - WT, T, WT);
      ctx.fillStyle = '#2a1f4a'; ctx.fillRect(x, y - WH, T, 9);
      ART.line(ctx, x, y - WH + 9, x + T, y - WH + 9, P.INK, 2);
      // jambs
      ctx.fillStyle = '#3d2d61'; ctx.fillRect(x, y - WH, 4, WH); ctx.fillRect(x + T - 4, y - WH, 4, WH);
      ctx.globalAlpha = 1; return;
    }
    // rim first (only on exposed sides, so neighbouring cells never draw seams), then the dark top
    ctx.fillStyle = '#4a3a72';
    for (const r of w.rects) {
      const y = r.y - WH;
      if (r.k === 'n') ctx.fillRect(r.x - 2.5, y, r.w + 5, r.h);
      else if (r.k === 'w' || r.k === 'e') ctx.fillRect(r.x, y - 2.5, r.w, r.h + (w.face ? 2.5 : 5));
      else ctx.fillRect(r.x - (w.W ? 0 : 2.5), y - (w.N ? 0 : 2.5), r.w + (w.W ? 0 : 2.5) + (w.E ? 0 : 2.5), r.h + (w.N ? 0 : 2.5) + (w.S || w.face ? 0 : 2.5));
    }
    ctx.fillStyle = '#1d1636';
    for (const r of w.rects) ctx.fillRect(r.x - .3, r.y - WH - .3, r.w + .6, r.h + .6);
    if (w.face) {
      const fc = faceCanvas(w);
      ctx.drawImage(fc, w.face.x0, w.key - WH, w.face.x1 - w.face.x0, WH);
      // cap rim
      ctx.fillStyle = '#3a2c5c'; ctx.fillRect(w.face.x0, w.key - WH - WT, w.face.x1 - w.face.x0, 3);
    }
    if (w.sub) for (const sb of w.sub) ctx.drawImage(faceCanvas(sb), sb.face.x0, sb.key - WH, sb.face.x1 - sb.face.x0, WH);
    ctx.globalAlpha = 1;
  }

  const iconImg = {};
  function drawDrop(d) {
    const im = iconImg[ITEMS[d.k].i] || (iconImg[ITEMS[d.k].i] = Object.assign(new Image(), { src: ART.iconURL[ITEMS[d.k].i] }));
    const bounce = d.t < .7 ? Math.abs(Math.sin(d.t * 9)) * 16 * (1 - d.t / .7) : 0;
    drawShadow(d.x, d.y + 1, 11 - bounce * .25, .45);
    if (im.complete) ctx.drawImage(im, d.x - 15, d.y - 26 - bounce, 30, 30);
    if (d.n > 1) { ctx.font = '900 10px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.lineJoin = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = P.INK; ctx.strokeText('x' + d.n, d.x + 12, d.y + 2); ctx.fillStyle = P.CRM; ctx.fillText('x' + d.n, d.x + 12, d.y + 2); }
  }
  // secret floor details: rugs over loose boards, the attic hole, Keen eye scuffs
  function drawSecretsFloor() {
    for (const s of G.sec) {
      if (s.type === 'rug') drawRug(s);
      else if (s.type === 'attic' && G.visited[s.room]) { const O = { x: s.hole.x * T, y: s.hole.y * T }; ART.blk(ctx, O.x - 18, O.y - 10, 36, 20, '#0c0816', 2, 2.4); drawLadder(true, O.x, O.y + 2); }
      else if (s.type === 'shelf' && scavLvl() >= 6 && !G.secretOpen) { const sh = G.furn[s.furn]; ctx.strokeStyle = 'rgba(234,210,164,.09)'; ctx.lineWidth = 1.4; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(sh.x + 6, sh.y + .9 * T, T * (1.05 + i * .12), -.02, .7); ctx.stroke(); } }
    }
  }
  function drawRug(r) {
    const R = rugRect(r);
    const w = r.st ? R.w * .58 : R.w;
    ART.rr(ctx, R.x, R.y, w, R.h, 5); ctx.fillStyle = '#5e2a36'; ctx.fill(); ctx.lineWidth = 2.4; ctx.strokeStyle = P.INK; ctx.stroke();
    ART.rr(ctx, R.x + 7, R.y + 7, w - 14, R.h - 14, 3); ctx.strokeStyle = '#8a4050'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = '#c95f2c'; for (let i = 0; i < 5; i++) { const xx = R.x + 20 + i * 36; if (xx > R.x + w - 14) break; ctx.save(); ctx.translate(xx, R.y + R.h / 2); ctx.rotate(.785); ctx.fillRect(-4, -4, 8, 8); ctx.restore(); }
    if (r.st) { // rolled edge
      ART.blk(ctx, R.x + w - 10, R.y - 2, 16, R.h + 4, '#6e3240', 8, 2.4);
      const B = boardRect(r);
      if (r.st === 1) { ART.blk(ctx, B.x, B.y, B.w, B.h, '#5a4560', 1, 1.6); ART.dot(ctx, B.x + 4, B.y + 5, 1.4, P.MUTE); ART.dot(ctx, B.x + B.w - 4, B.y + 5, 1.4, P.MUTE); }
      else {
        ART.blk(ctx, B.x, B.y, B.w, B.h + 2, '#0c0816', 1, 1.6);
        if (r.loot0 && r.loot0.length) ART.blk(ctx, B.x + 6, B.y + 2, 14, 7, '#b9bdcc', 2, 1.2);
        ctx.save(); ctx.translate(B.x + B.w + 8, B.y + 2); ctx.rotate(.5); ART.blk(ctx, -4, -2, B.w, 8, '#5a4560', 1, 1.6); ctx.restore();
      }
    }
  }
  function drawLadder(top, x, y) { // ladder from the ceiling hatch (hall) or poking out of the attic hole
    if (top) { ART.blk(ctx, x - 16, y - 8, 32, 16, '#0c0816', 2, 2); }
    const y0 = top ? y - 46 : y - 86, y1 = top ? y + 6 : y;
    ctx.fillStyle = P.WOOD; ctx.strokeStyle = P.INK; ctx.lineWidth = 2;
    for (const xx of [x - 11, x + 7]) { ctx.fillRect(xx, y0, 4, y1 - y0); ctx.strokeRect(xx, y0, 4, y1 - y0); }
    for (let yy = y0 + 8; yy < y1 - 2; yy += 11) { ctx.fillRect(x - 9, yy, 18, 3); ctx.strokeRect(x - 9, yy, 18, 3); }
  }
  const DOORH = 50;
  function drawDoor(d) {
    if (d.vert) { // leaf seen edge-on running north-south: a tall thin strip
      const x = d.x0, w = d.x1 - d.x0, top = d.y0 - DOORH, h = d.y1 - top;
      ART.blk(ctx, x, top, w, h, ART.P.WOOD, 2, 2);
      ctx.fillStyle = ART.P.WOODD; ctx.fillRect(x + 1.5, d.y1 - DOORH + 2, w - 3, DOORH - 4);
    } else { // leaf running east-west: we see its face
      const x = d.x0, w = d.x1 - d.x0, top = d.y1 - DOORH;
      ART.blk(ctx, x, top - 8, w, 8, '#7a5048', 2, 2);
      ART.blk(ctx, x, top, w, DOORH, ART.P.WOOD, 2, 2.4);
      ART.blk(ctx, x + 5, top + 5, w - 10, DOORH * .38, null, 2, 1.4); ART.blk(ctx, x + 5, top + 9 + DOORH * .38, w - 10, DOORH * .38, null, 2, 1.4);
      ART.dot(ctx, x + w - 6, top + DOORH * .5, 2.4, ART.P.CRMD);
    }
  }
  function drawShadow(x, y, rx, a = .42) { ctx.fillStyle = `rgba(8,6,22,${a})`; ctx.beginPath(); ctx.ellipse(x, y, rx, rx * .36, 0, 0, 6.28); ctx.fill(); }

  function drawPlayer() {
    const p = G.p, dir = p.flip ? -1 : 1;
    const parts = {}; let rot = 0, sy = 1, sx = 1, yo = 0, alpha = 1;
    const walkAmp = Math.min(1, Math.hypot(p.vx, p.vy) / (2.75 * T));
    const s = Math.sin(p.ph * 2);
    parts.legB = { r: s * .5 * walkAmp }; parts.legF = { r: -s * .5 * walkAmp };
    yo = -Math.abs(Math.cos(p.ph * 2)) * 3 * walkAmp;
    const armR = -s * .18 * walkAmp;
    parts.arm = { r: armR }; parts.bat = { r: armR };
    if (walkAmp < .1) sy = 1 + Math.sin(G.t * 2.6) * .012;
    if (p.running) rot = .1 * dir;
    if (p.st === 'swing') {
      const t = p.stT; let a;
      if (t < SW_WIND) a = lerp(0, -2.3, t / SW_WIND);
      else if (t < SW_WIND + SW_STRIKE) a = lerp(-2.3, .9, (t - SW_WIND) / SW_STRIKE);
      else a = lerp(.9, 0, Math.min(1, (t - SW_WIND - SW_STRIKE) / SW_REC));
      parts.arm = { r: a }; parts.bat = { r: a };
      rot = (t < SW_WIND ? -.08 : .12) * dir;
      if (p.swRanged) { const k = t < SW_WIND ? t / SW_WIND : 1; parts.arm = { r: -1.35 * Math.min(1, k * 2) }; parts.bat = { r: -1.35 * Math.min(1, k * 2) }; rot = -.05 * dir; }
    } else if (p.st === 'search') {
      const a = -1 + Math.sin(p.search.t * 15) * .35;
      parts.arm = { r: a }; parts.bat = { r: .25 };
      rot = .1 * dir; yo = Math.sin(p.search.t * 15) * 1.2;
    } else if (p.st === 'dodge') {
      rot = dir * .55 * Math.sin(Math.min(1, p.stT / .3) * Math.PI); sy = .9;
    } else if (p.st === 'hurt') rot = -.22 * dir;
    else if (p.st === 'down') { rot = -p.downRot * 1.45 * dir; }
    if (p.inv > 0 && p.st !== 'dodge' && p.st !== 'down') alpha = .65 + .35 * Math.sin(G.t * 40);
    drawShadow(p.x, p.y + 1, 18);
    const wk = weaponKey();
    p._pose = [p.x, p.y + yo, PSCALE, p.flip, { rot, sx, sy, parts, alpha: 1, weapon: wk }];
    ART.drawRig(ctx, 'survivor', p.x, p.y + yo, PSCALE, p.flip, { rot, sx, sy, parts, flash: p.flash, flashRed: true, alpha, weapon: wk });
  }

  function drawTurkey(z) {
    const dir = z.flip ? 1 : -1, t = G.t + z.id * 10;
    const sp = Math.min(1, Math.hypot(z.vx, z.vy) / (2.5 * T)), s = Math.sin(z.ph * 3);
    let rot = Math.sin(t * 6) * .05, lean = 0, peck = 0;
    if (z.st === 'windup') { lean = -.35 * Math.min(1, z.stT / .3); }
    if (z.st === 'lunge') peck = 1;
    if (z.st === 'hurt') rot = z.hurtDir * .3 * Math.max(0, 1 - z.stT / .32);
    if (z.dead) rot = z.rot;
    drawShadow(z.x, z.y + 1, z.dead ? 26 : 20, .42);
    ctx.save(); ctx.translate(z.x, z.y - Math.abs(Math.cos(z.ph * 3)) * 3 * sp); ctx.rotate(rot); ctx.scale(dir * 1.35, 1.35);
    const INK = P.INK; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    // tail fan with missing feathers and bare quills
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI / 2 - 1.1 + i * .275 - .4, missing = (i === 2 || i === 6);
      ctx.save(); ctx.translate(-10, -28); ctx.rotate(a + Math.sin(t * 3 + i) * .04);
      if (missing) { ART.line(ctx, 0, 0, 28, 0, INK, 3); ART.line(ctx, 0, 0, 28, 0, '#d8c9a8', 1.4); }
      else { ctx.beginPath(); ctx.ellipse(20, 0, 17, 6.5, 0, 0, 6.28); ctx.fillStyle = ['#7a4a30', '#a8602e', '#5e3a2a'][i % 3]; ctx.fill(); ctx.lineWidth = 2.2; ctx.strokeStyle = INK; ctx.stroke(); ART.dot(ctx, 31, 0, 2.6, i % 2 ? '#c9a85a' : '#5a4a86'); }
      ctx.restore();
    }
    // legs
    for (const k of [-1, 1]) { const sw = s * 6 * sp * k; ART.line(ctx, -2 + k * 5, -14, -2 + k * 5 + sw, 0, INK, 5); ART.line(ctx, -2 + k * 5, -14, -2 + k * 5 + sw, 0, '#d9772e', 2.6); ART.line(ctx, -6 + k * 5 + sw, 0, 4 + k * 5 + sw, 0, INK, 3); }
    ctx.rotate(lean);
    // body
    ctx.beginPath(); ctx.ellipse(0, -26, 19, 15, -.1, 0, 6.28); ctx.fillStyle = '#6e4a3a'; ctx.fill(); ctx.lineWidth = 2.6; ctx.strokeStyle = INK; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(-6, -30, 9, 6, -.3, 0, 6.28); ctx.fillStyle = '#8a5e44'; ctx.fill();
    // exposed ribs
    ctx.save(); ctx.beginPath(); ctx.ellipse(5, -22, 9, 7.5, .2, 0, 6.28); ctx.fillStyle = '#c96a6a'; ctx.fill(); ctx.lineWidth = 1.8; ctx.stroke(); ctx.clip();
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(-2, -22, 5 + i * 3.2, -.9, .9); ctx.strokeStyle = '#f6e3bb'; ctx.lineWidth = 1.8; ctx.stroke(); }
    ctx.restore();
    // neck + head (pecks forward on the lunge)
    const hx = 15 + peck * 9, hy = -44 + peck * 10;
    ctx.beginPath(); ctx.moveTo(10, -34); ctx.quadraticCurveTo(15, -40, hx - 2, hy + 4); ctx.lineWidth = 8; ctx.strokeStyle = INK; ctx.stroke(); ctx.lineWidth = 5; ctx.strokeStyle = '#a3a882'; ctx.stroke();
    ART.dot(ctx, hx, hy, 8.5, INK); ART.dot(ctx, hx, hy, 6.8, '#a3a882');
    ART.dot(ctx, hx - 3, hy + 3, 2, '#7e1f2a');
    ctx.beginPath(); ctx.moveTo(hx + 5, hy - 2); ctx.lineTo(hx + 13, hy + 1); ctx.lineTo(hx + 5, hy + 4); ctx.closePath(); ctx.fillStyle = '#e0a020'; ctx.fill(); ctx.lineWidth = 1.8; ctx.strokeStyle = INK; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(hx + 6, hy + 3); ctx.quadraticCurveTo(hx + 9, hy + 13 + Math.sin(t * 5) * 2, hx + 4, hy + 15); ctx.quadraticCurveTo(hx + 1, hy + 9, hx + 4, hy + 4); ctx.fillStyle = '#b53a2e'; ctx.fill(); ctx.lineWidth = 1.6; ctx.stroke();
    if (!z.dead) { // glowing eye
      const gl = ctx.createRadialGradient(hx + 2, hy - 2, 0, hx + 2, hy - 2, 9); gl.addColorStop(0, 'rgba(214,255,120,.85)'); gl.addColorStop(1, 'rgba(214,255,120,0)');
      ctx.fillStyle = gl; ctx.fillRect(hx - 8, hy - 12, 20, 20); ART.dot(ctx, hx + 2, hy - 2, 2.6, '#eaff9a'); ART.dot(ctx, hx + 2.4, hy - 2, 1, INK);
    } else { ART.line(ctx, hx, hy - 4, hx + 4, hy, INK, 1.6); ART.line(ctx, hx + 4, hy - 4, hx, hy, INK, 1.6); }
    if (z.flash > 0) { ctx.globalAlpha = z.flash * .8; ctx.beginPath(); ctx.ellipse(0, -26, 19, 15, -.1, 0, 6.28); ctx.fillStyle = '#ffffff'; ctx.fill(); ART.dot(ctx, hx, hy, 7, '#ffffff'); ctx.globalAlpha = 1; }
    ctx.restore();
  }
  // the Krampus walker's Santa hat, in zombie-rig coordinates (head faces left, pivot at the neck -20,-108)
  function santaHat(c) {
    c.lineJoin = 'round'; c.lineWidth = 4; c.strokeStyle = P.INK;
    c.beginPath(); c.moveTo(-50, -164); c.quadraticCurveTo(-46, -200, -16, -204); c.quadraticCurveTo(10, -204, 16, -186); c.quadraticCurveTo(26, -176, 22, -162); c.quadraticCurveTo(-14, -172, -50, -164); c.closePath();
    c.fillStyle = '#d9483a'; c.fill(); c.stroke();
    c.beginPath(); c.moveTo(16, -186); c.quadraticCurveTo(34, -190, 40, -172); c.lineTo(32, -170); c.quadraticCurveTo(28, -180, 18, -178); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(-54, -168); c.quadraticCurveTo(-16, -182, 26, -168); c.quadraticCurveTo(28, -158, 24, -155); c.quadraticCurveTo(-14, -168, -52, -156); c.quadraticCurveTo(-58, -160, -54, -168); c.closePath();
    c.fillStyle = '#e9e3d6'; c.fill(); c.stroke();
    c.beginPath(); c.arc(38, -168, 8, 0, 6.29); c.fill(); c.stroke();
  }
  function drawZombie(z) {
    if (z.kind === 'turkey') { drawTurkey(z); return; }
    const dir = z.flip ? 1 : -1; // facing direction (+1 = right)
    const parts = {}; let rot = 0, yo = 0, alpha = z.alpha, sy = 1;
    const sp = Math.min(1, Math.hypot(z.vx, z.vy) / (1.85 * T));
    const s = Math.sin(z.ph * 2);
    parts.legB = { r: s * .38 * sp }; parts.legF = { r: -s * .38 * sp };
    const t = G.t + z.id * 10;
    parts.armF = { r: Math.sin(t * 3.1) * .12 }; parts.armB = { r: Math.sin(t * 3.1 + 1.3) * .12 };
    parts.head = { r: Math.sin(t * 1.7) * .1 };
    rot = Math.sin(t * 1.4 + z.ph) * .06; yo = -Math.abs(Math.cos(z.ph * 2)) * 2.5 * sp;
    let x = z.x, y = z.y;
    if (z.st === 'sleep') {
      rot = -Math.PI / 2; parts.head = { r: .2 }; parts.armF = { r: -.5 }; sy = 1 + Math.sin(G.t * 1.6) * .03;
      if (z.sleep) { x = z.sleep.draw.x * T; y = z.sleep.draw.y * T; }
    } else if (z.st === 'rise') {
      rot = z.rot; x = z.x; y = z.y;
    } else if (z.st === 'windup') {
      const k = Math.min(1, z.stT / .4);
      rot = -.28 * dir * k * -1 * -1; rot = -dir * .26 * k;
      parts.armF = { r: .7 * k }; parts.armB = { r: .6 * k }; parts.head = { r: -.15 * k };
      x += (Math.random() - .5) * 1.5 * k;
    } else if (z.st === 'lunge') {
      rot = dir * .32; parts.armF = { r: -.25 }; parts.armB = { r: -.2 };
    } else if (z.st === 'recover') {
      rot = dir * .12 * Math.max(0, 1 - z.stT / .5);
    } else if (z.st === 'hurt') {
      rot = z.hurtDir * .25 * Math.max(0, 1 - z.stT / .32); parts.head = { r: -z.hurtDir * .3 };
    } else if (z.st === 'dead') {
      rot = z.rot; alpha = 1;
    } else if (z.st === 'bash') { // hammering at a wall or gate
      const k = (Math.sin(z.stT * 7) + 1) / 2;
      rot = -dir * .22 * k; parts.armF = { r: .9 * k }; parts.armB = { r: .7 * (1 - k) }; parts.head = { r: -.15 * k };
    }
    // dir: sprite faces left by default, flip when facing right
    if (z.st !== 'sleep') drawShadow(z.x, z.y + 1, (z.dead ? 26 : 17) * (z.scale || 1), z.dead ? .3 : .42);
    if (z.st === 'dead') { // corpse lies along the floor
      y = z.y + 6;
    }
    const zs = z.kind === 'krampus' ? ZSCALE * 1.18 : ZSCALE * (z.scale || 1), over = z.kind === 'krampus' ? santaHat : z.over || null;   // z.scale / z.over: the weekly boss
    z._pose = [x, y + yo, zs, z.flip, { rot, sy, parts, alpha: 1, over }];
    ART.drawRig(ctx, 'zombie', x, y + yo, zs, z.flip, { rot, sy, parts, flash: z.flash, alpha, over });
  }

  // Fog is sampled on a fine grid (4 per tile) that knows what is *drawn* there: wall faces
  // belong to the room they face, wall tops to the darkest-of-neighbours rule.
  const FQ = 4; let FW = 0, FH = 0;
  const fogCv = document.createElement('canvas');
  const fogCtx = fogCv.getContext('2d'); let fogImg = null;
  let fogSrc = [], fogMap = null;
  function buildFogMap() {
    FW = MW * FQ; FH = MH * FQ; fogCv.width = FW; fogCv.height = FH; fogImg = fogCtx.createImageData(FW, FH);
    fogSrc = []; fogMap = new Int16Array(FW * FH);
    const roomSrc = {};
    for (const k in L.rooms) { roomSrc[k] = fogSrc.length; fogSrc.push({ rooms: [k] }); }
    const VOID = fogSrc.length; fogSrc.push({ fixed: 1 });
    const nbRooms = (x, y) => { const out = new Set(); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const r2 = roomAt(x + dx, y + dy); if (r2) out.add(r2); } return [...out]; };
    for (let fy = 0; fy < FH; fy++) for (let fx = 0; fx < FW; fx++) {
      const tx = Math.floor(fx / FQ), ty = Math.floor(fy / FQ);
      let rm = roomAt(tx, ty);
      if (!rm && isWall(tx, ty)) rm = roomAt(tx, ty - 1) || null;
      if (!rm && isVoid(tx, ty) && ty >= L.streetY) rm = streetRoom();
      fogMap[fy * FW + fx] = rm ? roomSrc[rm] : VOID;
    }
    const paint = (x, y, w, h, src) => {
      for (let fy = Math.max(0, Math.floor(y / T * FQ)); fy < Math.min(FH, Math.ceil((y + h) / T * FQ)); fy++)
        for (let fx = Math.max(0, Math.floor(x / T * FQ)); fx < Math.min(FW, Math.ceil((x + w) / T * FQ)); fx++) fogMap[fy * FW + fx] = src;
    };
    for (const w of wallCells) {
      const rooms = nbRooms(w.x, w.y); if (!rooms.length) continue;
      const cap = fogSrc.length; fogSrc.push({ rooms });
      if (w.lintel) { paint(w.x * T, w.key - WH - WT, T, WT + 10, cap); continue; }
      for (const r of w.rects) paint(r.x, r.y - WH, r.w, r.h, cap);
      if (w.sub) for (const sb of w.sub) paint(sb.face.x0, sb.key - WH, sb.face.x1 - sb.face.x0, WH, roomSrc[sb.face.room]);
      if (w.face) { const fsrc = fogSrc.length; fogSrc.push({ rooms: [w.face.room], capRooms: rooms, wall: w }); paint(w.face.x0, w.key - WH, w.face.x1 - w.face.x0, WH, fsrc); }
    }
  }
  function drawFog() {
    if (!fogMap) buildFogMap();
    const al = new Float32Array(fogSrc.length);
    const minOf = rs => { let a = 1; for (const r of rs) a = Math.min(a, G.fog[r]); return a; };
    fogSrc.forEach((s, i) => {
      if (s.fixed) { al[i] = 1; return; }
      let a = minOf(s.rooms);
      if (s.wall && s.wall.cut < .99) a = lerp(minOf(s.capRooms), a, clamp((s.wall.cut - .65) / .35, 0, 1));
      al[i] = a;
    });
    const d = fogImg.data;
    for (let i = 0, n = FW * FH; i < n; i++) { const j = i * 4; d[j] = 9; d[j + 1] = 7; d[j + 2] = 24; d[j + 3] = al[fogMap[i]] * 255; }
    fogCtx.putImageData(fogImg, 0, 0);
    ctx.imageSmoothingEnabled = true;
    // draw the fog on its own layer, then cut out characters standing in lit areas so tall
    // sprites are not darkened where they overlap an unexplored tile behind them
    // cheap path: no character overlaps a darker tile than the one it stands on
    const fogAt = (x, y) => { const fx = clamp(Math.floor(x / T * FQ), 0, FW - 1), fy = clamp(Math.floor(y / T * FQ), 0, FH - 1); return al[fogMap[fy * FW + fx]]; };
    const needCut = e => { if (!e._pose) return false; const f0 = fogAt(e.x, e.y); if (f0 > .9) return false; for (const dy of [30, 55, 80]) for (const dx of [-22, 0, 22]) if (fogAt(e.x + dx, e.y - dy) > f0 + .08) return true; return false; };
    if (!needCut(G.p) && !G.zs.some(z => z.st !== 'sleep' && needCut(z))) {
      ctx.drawImage(fogCv, 0, 0, MW * T, MH * T);
      ctx.fillStyle = 'rgba(9,7,24,1)'; ctx.fillRect(-T * 20, -T * 20, T * 20, (L.streetY + 20) * T); ctx.fillRect(MW * T, -T * 20, T * 20, (L.streetY + 20) * T); ctx.fillRect(-T * 20, -T * 20, (MW + 40) * T, T * 20);
      ctx.fillStyle = 'rgba(9,7,24,.12)'; ctx.fillRect(-T * 20, MH * T, (MW + 40) * T, T * 20); ctx.fillRect(-T * 20, L.streetY * T, T * 20, T * 2); ctx.fillRect(MW * T, L.streetY * T, T * 20, T * 2);
      return;
    }
    const fsc = Math.min(1, 1.5 / DEV.dpr); // fog is soft: render it at reduced resolution
    const fw = Math.ceil(cv.width * fsc), fh = Math.ceil(cv.height * fsc);
    if (fogLayer.width !== fw || fogLayer.height !== fh) { fogLayer.width = fw; fogLayer.height = fh; }
    const fc = fogLayer.getContext('2d');
    fc.setTransform(1, 0, 0, 1, 0, 0); fc.clearRect(0, 0, fw, fh);
    const m = ctx.getTransform(); fc.setTransform(m.a * fsc, 0, 0, m.d * fsc, m.e * fsc, m.f * fsc); fc.imageSmoothingEnabled = true;
    fc.drawImage(fogCv, 0, 0, MW * T, MH * T);
    fc.fillStyle = 'rgba(9,7,24,1)'; fc.fillRect(-T * 20, -T * 20, T * 20, (L.streetY + 20) * T); fc.fillRect(MW * T, -T * 20, T * 20, (L.streetY + 20) * T); fc.fillRect(-T * 20, -T * 20, (MW + 40) * T, T * 20);
    fc.fillStyle = 'rgba(9,7,24,.12)'; fc.fillRect(-T * 20, MH * T, (MW + 40) * T, T * 20); fc.fillRect(-T * 20, L.streetY * T, T * 20, T * 2); fc.fillRect(MW * T, L.streetY * T, T * 20, T * 2);
    fc.globalCompositeOperation = 'destination-out';
    const cut = (e, key) => {
      if (!e._pose) return;
      const [cx, cy] = cellOf(e), rmm = roomAt(cx, cy) || (cy >= L.streetY ? streetRoom() : null);
      const a = 1 - (rmm ? G.fog[rmm] : 1); if (a < .05) return;
      const ps = e._pose; ps[4].alpha = a;
      ART.drawRig(fc, key, ps[0], ps[1], ps[2], ps[3], ps[4]);
    };
    cut(G.p, 'survivor');
    for (const z of G.zs) if (z.st !== 'sleep') cut(z, 'zombie');
    fc.globalCompositeOperation = 'source-over';
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = true; ctx.drawImage(fogLayer, 0, 0, cv.width, cv.height); ctx.restore();
  }
  const fogLayer = document.createElement('canvas');

  function drawOverlays() {
    const p = G.p;
    // noise rings
    for (const r of G.rings) {
      const k = r.t / .9; ctx.globalAlpha = (1 - k) * .5; ctx.strokeStyle = P.ORA; ctx.lineWidth = 2.5 * (1 - k) + .5;
      ctx.beginPath(); ctx.ellipse(r.x, r.y, r.r * k, r.r * k * .62, 0, 0, 6.28); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    if (G.tapMark) {
      const m = G.tapMark, k = m.t / .7;
      ctx.globalAlpha = 1 - k; ctx.strokeStyle = P.CRM; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.ellipse(m.x, m.y, 8 + k * 14, (8 + k * 14) * .5, 0, 0, 6.28); ctx.stroke(); ctx.globalAlpha = 1;
    }
    // swing trail
    if (p.st === 'swing' && !p.swRanged && p.stT > SW_WIND - .02 && p.stT < SW_WIND + SW_STRIKE + .12) {
      const fa = Math.atan2(p.fy, p.fx), k = Math.min(1, (p.stT - SW_WIND + .02) / (SW_STRIKE + .02)), fade = p.stT > SW_WIND + SW_STRIKE ? 1 - (p.stT - SW_WIND - SW_STRIKE) / .12 : 1;
      const cx = p.x, cy = p.y - 30, R = 1.25 * T;
      const a0 = fa - 1.3, a1 = fa - 1.3 + 2.6 * k;
      const dirSign = Math.cos(fa) < 0 ? -1 : 1;
      const A0 = dirSign > 0 ? a0 : fa + 1.3, A1 = dirSign > 0 ? a1 : fa + 1.3 - 2.6 * k;
      ctx.save(); ctx.translate(cx, cy); ctx.scale(1, .72);
      for (let i = 0; i < 3; i++) {
        ctx.globalAlpha = fade * (.55 - i * .15); ctx.strokeStyle = i ? P.ORA : P.CRM; ctx.lineWidth = 9 - i * 3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(0, 0, R - i * 7, Math.min(A0, A1), Math.max(A0, A1)); ctx.stroke();
      }
      ctx.restore(); ctx.globalAlpha = 1;
    }
    // Keen eye: rare loot sparkles
    if (scavLvl() >= 6) for (const f of G.furn) {
      if (!f.lootable || f.searched || !f.pre || !f.pre.some(k => ITEMS[k].rare) || G.fog[f.room] > .6) continue;
      const g = ART.geo(f), sx = f.x + f.w * .78 + (f.slide || 0) * T, sy = (f.wall ? f.y + f.h - 50 : g.ty0 + 8), tw = (Math.sin(G.t * 5 + f.fid) + 1) / 2;
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(G.t * .8); ctx.globalAlpha = .5 + tw * .5; ctx.fillStyle = '#ffe2a8';
      const gl = ctx.createRadialGradient(0, 0, 1, 0, 0, 16); gl.addColorStop(0, 'rgba(255,226,168,.5)'); gl.addColorStop(1, 'rgba(255,226,168,0)'); ctx.fillStyle = gl; ctx.fillRect(-16, -16, 32, 32); ctx.fillStyle = '#fff1cf';
      const r1 = 5 + tw * 6; ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr = i % 2 ? 1.6 : r1; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.fill(); ctx.restore();
    }
    ctx.globalAlpha = 1;
    // loot markers
    const tgt = (p.st === 'free' || p.st === 'swing') ? findTarget() : null;
    G.target = tgt;
    for (const it of interactables()) {
      const o = it.obj, d = rectDist(p.x, p.y, it.rect);
      if (d > 3 * T) continue;
      if (it.secret) continue;
      const rm = it.corpse || it.drop ? null : o.room; if (rm && G.fog[rm] > .6) continue;
      let mx, my;
      if (it.drop) { mx = o.x; my = o.y - 40; }
      else if (it.corpse) { mx = o.x + (o.kind === 'turkey' ? 0 : (o.fallDir || 1) * 34); my = o.y - 34; }
      else { const g = ART.geo(o); mx = o.x + o.w / 2 + (o.slide || 0) * T; my = (o.wall ? o.y + o.h - 62 : g.ty0) - 14; }
      const isT = tgt && tgt.obj === o;
      const bob = isT ? Math.sin(G.t * 6) * 2 : 0;
      const a = isT ? 1 : clamp(1.4 - d / (2.4 * T), .25, .85);
      ctx.globalAlpha = a;
      const rad = isT ? 11 : 8;
      ctx.fillStyle = isT ? P.ORA : (it.act === 'Open' ? P.CRMD : it.act === 'Locked' ? '#6e3240' : P.PLUM);
      ctx.beginPath(); ctx.arc(mx, my + bob, rad, 0, 6.28); ctx.fill(); ctx.lineWidth = 2.4; ctx.strokeStyle = isT ? P.INK : P.CRM; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(mx - 4, my + rad - 1 + bob); ctx.lineTo(mx, my + rad + 5 + bob); ctx.lineTo(mx + 4, my + rad - 1 + bob); ctx.fillStyle = isT ? P.ORA : (it.act === 'Open' ? P.CRMD : P.PLUM); ctx.fill();
      ctx.strokeStyle = isT ? P.INK : P.CRM; ctx.lineWidth = 2;
      if (it.act === 'Search') { ctx.beginPath(); ctx.arc(mx - 1.2, my - 1.2 + bob, rad * .38, 0, 6.28); ctx.stroke(); ART.line(ctx, mx + rad * .2, my + rad * .2 + bob, mx + rad * .5, my + rad * .5 + bob, ctx.strokeStyle, 2.4); }
      else if (it.act === 'Locked') { // padlock
        const c = isT ? P.INK : P.CRM; ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(mx, my - 2 + bob, rad * .3, Math.PI, 0); ctx.stroke();
        ctx.fillStyle = c; ctx.fillRect(mx - rad * .45, my - 2 + bob, rad * .9, rad * .62);
      }
      else if (it.act === 'Push') { ctx.fillStyle = isT ? P.INK : P.CRM; ctx.font = '900 12px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.fillText('?', mx, my + 4 + bob); }
      else { ART.dot(ctx, mx, my + bob, 3, P.INK); }
      ctx.globalAlpha = 1;
    }
    // search progress ring over her head
    if (p.st === 'search') {
      const s = p.search, k = s.t / s.dur, x = p.x, y = p.y - 96;
      ctx.fillStyle = 'rgba(17,20,47,.85)'; ctx.beginPath(); ctx.arc(x, y, 17, 0, 6.28); ctx.fill();
      ctx.lineWidth = 4.5; ctx.strokeStyle = P.LILD; ctx.beginPath(); ctx.arc(x, y, 13, 0, 6.28); ctx.stroke();
      ctx.strokeStyle = P.ORA; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(x, y, 13, -Math.PI / 2, -Math.PI / 2 + k * 6.283); ctx.stroke(); ctx.lineCap = 'butt';
      ctx.fillStyle = P.CRM; ctx.font = '800 9px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.fillText(Math.floor(k * 100) + '%', x, y + 3.5);
      const lbl = s.it.verb ? s.it.verb + ' · ' + s.it.name.toLowerCase() : ({ Push: 'pushing', Pry: 'prying', Move: 'moving', 'Pull down': 'pulling', Climb: 'climbing' }[s.it.act] || 'searching') + ' · ' + s.it.name.toLowerCase();
      ctx.font = '800 10px system-ui,sans-serif'; const tw = ctx.measureText(lbl).width + 14;
      ctx.fillStyle = 'rgba(17,20,47,.85)'; ART.rr(ctx, x - tw / 2, y - 37, tw, 16, 8); ctx.fill();
      ctx.fillStyle = P.CRM; ctx.fillText(lbl, x, y - 25.5);
    }
    // zombie overlays: z's, !, hp bars
    for (const z of G.zs) {
      const rm = z.roomNow || streetRoom(); if ((G.fog[rm] || 0) > .7 && z.st !== 'chase') continue;
      if (z.st === 'sleep') {
        for (let i = 0; i < 3; i++) { const k = ((G.t * .5 + i / 3) % 1); ctx.globalAlpha = Math.sin(k * Math.PI) * .9; ctx.fillStyle = P.CRM; ctx.font = `900 ${9 + i * 3}px system-ui,sans-serif`; const zx = z.sleep ? (z.sleep.draw.x - 1.45) * T : z.x, zy = z.sleep ? (z.sleep.draw.y + .08) * T : z.y - 40; ctx.fillText('z', zx + k * 18 + i * 6, zy - 20 - k * 30); }
        ctx.globalAlpha = 1;
      }
      if (z.alertT > 0 || z.st === 'windup') {
        const x = z.x, y = z.y - (z.kind === 'turkey' ? 84 : z.kind === 'krampus' ? 112 : 92) - (z.st === 'windup' ? 4 : 0);
        const red = z.st === 'windup';
        const sc = red ? 1 + Math.sin(G.t * 30) * .08 : 1;
        ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
        ctx.fillStyle = red ? P.RED : P.ORA; ctx.beginPath(); ctx.arc(0, 0, 11, 0, 6.28); ctx.fill(); ctx.lineWidth = 2.4; ctx.strokeStyle = P.INK; ctx.stroke();
        ctx.fillStyle = P.CRM; ctx.font = '900 15px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.fillText(red ? '!!' : '!', 0, 5.5);
        ctx.restore();
        if (red) { ctx.globalAlpha = .25 + .2 * Math.sin(G.t * 30); ctx.fillStyle = P.RED; ctx.beginPath(); ctx.ellipse(z.x + Math.sign(G.p.x - z.x) * 22, z.y, 34, 14, 0, 0, 6.28); ctx.fill(); ctx.globalAlpha = 1; }
      }
      if (!z.dead && z.hp < (z.maxHp || 100)) {
        const w = z.boss ? 52 : 40, x = z.x - w / 2, y = z.y - (z.kind === 'turkey' ? 76 : z.kind === 'krampus' ? 104 : 84);
        ART.rr(ctx, x - 2, y - 2, w + 4, 9, 4); ctx.fillStyle = P.INK; ctx.fill();
        ART.rr(ctx, x, y, w * Math.max(0, z.hp) / (z.maxHp || 100), 5, 2.5); ctx.fillStyle = P.GRN; ctx.fill();
      }
    }
    // damage numbers
    for (const n of G.nums) {
      const k = n.t / .9; ctx.globalAlpha = 1 - k * k;
      ctx.font = n.small ? '900 12px system-ui,sans-serif' : `900 ${16 + (1 - k) * 4}px system-ui,sans-serif`; ctx.textAlign = 'center';
      ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.strokeStyle = P.INK; ctx.strokeText(n.v, n.x, n.y - k * 26); ctx.fillStyle = n.col; ctx.fillText(n.v, n.x, n.y - k * 26);
    }
    ctx.globalAlpha = 1;
  }
  function drawBanners() {
    for (const b of G.banners) {
      const k = b.t, a = k < .3 ? k / .3 : k > 1.8 ? Math.max(0, 1 - (k - 1.8) / .6) : 1;
      const W = cv.width, dpr = DEV.dpr, y = 236 * dpr;
      ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.lineJoin = 'round';
      ctx.font = `900 ${24 * dpr}px system-ui, sans-serif`;
      ctx.lineWidth = 6 * dpr; ctx.strokeStyle = P.INK; ctx.strokeText(b.text, W / 2, y); ctx.fillStyle = P.CRM; ctx.fillText(b.text, W / 2, y);
      ctx.font = `800 ${12 * dpr}px system-ui, sans-serif`; ctx.fillStyle = P.ORA; ctx.strokeText(b.sub.toUpperCase(), W / 2, y + 20 * dpr); ctx.fillText(b.sub.toUpperCase(), W / 2, y + 20 * dpr);
      ctx.globalAlpha = 1;
    }
  }

  // ---------------------------------------------------------------- HUD (DOM)
  const hpFill = $('#hp i'), stFill = $('#st i'), hpVal = $('#hpv'), packEl = $('#pack b'), noiseBars = [...document.querySelectorAll('#noise span')];
  const useBtn = $('#bUse'), useLbl = $('#useLbl'), mini = $('#mini'), mctx = mini.getContext('2d');
  let lastHud = '', lastQ = null;
  function hud() {
    const p = G.p;
    hpFill.style.width = (p.hp / maxHp() * 100) + '%'; stFill.style.width = p.sta + '%';
    needsHud(p);
    const hudKey = [Math.round(p.hp), G.pack.length, packCount('lockpick'), G.target ? G.target.act + G.target.name : '', Math.round(G.noiseLvl * 5), S().xp, S().hands ? S().hands.k + S().hands.d : '-', arrowsLeft()].join('|');
    if (hudKey !== lastHud) {
      lastHud = hudKey;
      hpVal.textContent = Math.ceil(p.hp);
      packEl.textContent = G.pack.length + '/' + packSlots();
      $('#pack').classList.toggle('full', G.pack.length >= packSlots());
      const L = scavLvl();
      $('#skLv').textContent = L;
      $('#skXp').style.width = (L >= 10 ? 100 : (S().xp - XPCUM(L)) / (XPCUM(L + 1) - XPCUM(L)) * 100) + '%';
      const h = S().hands, wk = weaponKey();
      $('#wpn img').src = ART.iconURL[h ? ITEMS[h.k].i : 'scrap'] || ''; $('#wpn').classList.toggle('fists', !h);
      $('#wpn i').style.width = (h && h.d != null ? Math.max(0, h.d / WEAPONS[wk].dur) * 100 : 0) + '%';
      $('#wpn b').textContent = wk === 'bow' ? arrowsLeft() : '';   // the quiver (plus any spare arrows in the pack)
      const n = Math.round(G.noiseLvl * 5);
      noiseBars.forEach((b, i) => b.classList.toggle('on', i < n));
      $('#noise').classList.toggle('hot', n >= 4);
      { const [a, b] = searchedCount(), el = $('#srch'); if (el) el.textContent = b ? `searched ${a}/${b}` : ''; }
      if (p.st !== 'down') secretHint();
      const t = G.target;
      if (t && p.st !== 'down') {
        useBtn.classList.add('on'); useLbl.classList.add('on');
        const loud = !t.corpse && t.act === 'Search' && t.noise >= 4;
        if (t.act === 'Locked') { const n = packCount('lockpick'), cb = hasPry(); useLbl.innerHTML = `Locked <b>${t.name}</b>` + (n || cb ? `<em class="opt">${[n ? `pick ${n}` : '', cb ? 'pry' : ''].filter(Boolean).join(' / ')}</em>` : ''); }
        else if (t.act === 'KeyLocked') useLbl.innerHTML = `Locked <b>${t.name}</b><em class="opt">needs a brass key</em>`;
        else if (t.act === 'Unlock') useLbl.innerHTML = `Unlock <b>${t.name}</b><em class="opt">uses a brass key</em>`;
        else useLbl.innerHTML = `${t.act} <b>${t.name}</b>${loud ? '<em>loud</em>' : ''}`;
      } else { useBtn.classList.remove('on'); useLbl.classList.remove('on'); }
    }
    const q = DM.Game && DM.Game.questChip ? DM.Game.questChip() : '';
    if (q !== lastQ) { lastQ = q; $('#qchip').innerHTML = q; $('#qchip').classList.toggle('on', !!q); }
    $('#hp').classList.toggle('low', p.hp < maxHp() * .35);
    drawMini();
  }
  // 0.8: hunger + thirst bars under stamina (tap them to eat or drink from the pack)
  const needsEl = $('#needs'); let needsKey = '';
  function needsHud(p) {
    const s = S(); if (!s || !s.food) { needsEl.style.display = 'none'; return; }
    needsEl.style.display = '';
    G.foodT -= 1 / 60;
    if (G.foodT <= 0) { G.foodT = 5; p.hp = F.tick(s, p.hp); if (s.food.h < F.LOW || s.food.t < F.LOW) DM.Game && DM.Game.tip && DM.Game.tip('food'); }
    const f = s.food, k = Math.round(f.h * 2) + '|' + Math.round(f.t * 2) + '|' + F.staMax();
    if (k === needsKey && needsEl.firstChild) return; needsKey = k;
    if (!needsEl.firstChild) needsEl.innerHTML = `<span class="nd h" id="ndH">${F.ICON.h}<span class="nbar"><i></i></span></span><span class="nd t" id="ndT">${F.ICON.t}<span class="nbar"><i></i></span></span>`;
    for (const [id, v] of [['#ndH', f.h], ['#ndT', f.t]]) { const el = $(id); el.className = 'nd ' + (id === '#ndH' ? 'h ' : 't ') + F.lvl(v); el.querySelector('i').style.width = Math.max(0, Math.min(100, v)) + '%'; }
    $('#st').classList.toggle('capped', F.staMax() < 100);
  }
  // quick eat / drink: the food and drinks in the pack, one tap each
  function openFood() {
    if (G.over) return;
    G.sheet = { kind: 'food' };
    const f = S().food, foods = G.pack.map((e, i) => [e, i]).filter(([e]) => F.isFood(e.k));
    $('#shKick').textContent = `Hunger ${Math.round(f.h)} · Thirst ${Math.round(f.t)}`;
    $('#shTitle').textContent = 'Eat & drink';
    const grid = $('#shGrid'); grid.innerHTML = ''; $('#shActs').innerHTML = '';
    if (!foods.length) grid.innerHTML = '<div class="empty">No food or drinks in your pack. Kitchens, pantries, fridges and stores have them.</div>';
    for (const [e, i] of foods) grid.appendChild(itemCard(e, () => { useItem(i, true); }, `<small class="tag">${F.label(e.k)}</small>`));
    $('#shCap').textContent = foods.length ? 'Tap one to eat or drink it' : '';
    $('#shTake').style.display = 'none';
    sheet.classList.add('on');
  }
  needsEl.addEventListener('click', ev => { ev.stopPropagation(); SFX.init(); if (G && !G.over && DM.scene) { SFX.play('ui'); openFood(); } });
  function drawMini() {
    const s = Math.min(144 / MW, 180 / MH), w = 144, h = 180;
    if (mini.width !== w) { mini.width = w; mini.height = h; }
    mctx.setTransform(1, 0, 0, 1, (144 - MW * s) / 2, (180 - MH * s) / 2); mctx.clearRect(-200, -200, 600, 600);
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
      const rm = roomAt(x, y);
      if (rm && G.visited[rm]) { mctx.fillStyle = rm === G.room ? '#7d6aa8' : rm === streetRoom() ? '#2c2b46' : '#4a3c70'; mctx.fillRect(x * s, y * s, s, s); }
      else if (isWall(x, y)) { let v = false; for (let dy = -1; dy <= 1 && !v; dy++) for (let dx = -1; dx <= 1; dx++) { const r2 = roomAt(x + dx, y + dy); if (r2 && G.visited[r2] && r2 !== streetRoom()) { v = true; break; } } if (v) { mctx.fillStyle = '#f6e3bb'; mctx.globalAlpha = .55; mctx.fillRect(x * s, y * s, s, s); mctx.globalAlpha = 1; } }
    }
    for (const f of G.furn) if (f.lootable && !f.searched && G.visited[f.room]) { mctx.fillStyle = '#c95f2c'; mctx.fillRect(f.tx * s + 1, f.ty * s + 1, 2, 2); }
    mctx.fillStyle = '#f07b3c'; mctx.beginPath(); mctx.arc(G.p.x / T * s, G.p.y / T * s, 3.2, 0, 6.3); mctx.fill();
  }

  // ---------------------------------------------------------------- sheets & cards
  const sheet = $('#sheet');
  // ---- pack with stacks: G.pack = [{k, n}], each entry one slot
  const isCos = k => !!(ITEMS[k] && ITEMS[k].cos);   // cosmetics skip the pack: they unlock into the wardrobe
  // 0.7: arrows go to the quiver first (no pack slot, never spilled on death); the pack only takes the overflow
  const quiver = () => (S().quiver = S().quiver || { n: 0 });
  const arrowsLeft = () => quiver().n + packCount('arrow');
  function useArrow() { if (quiver().n > 0) quiver().n--; else usePack('arrow'); }
  function roomFor(k) { // how many of k the pack can still take
    if (isCos(k)) return 99;
    let room = k === 'arrow' ? Math.max(0, D.QUIVER - quiver().n) : 0; const m = stackMax(k);
    for (const e of G.pack) if (e.k === k) room += m - e.n;
    return room + (packSlots() - G.pack.length) * m;
  }
  function addToPack(k, n, d) { // tops up existing stacks first, then new slots; returns how many fit
    if (isCos(k)) { if (DM.Game && DM.Game.unlockCos) DM.Game.unlockCos(k); return n; }
    const m = stackMax(k); let left = n;
    if (k === 'arrow') { const q = quiver(), t = Math.min(left, Math.max(0, D.QUIVER - q.n)); q.n += t; left -= t; }
    for (const e of G.pack) if (e.k === k && e.n < m && left) { const t = Math.min(left, m - e.n); e.n += t; left -= t; }
    while (left && G.pack.length < packSlots()) { const t = Math.min(left, m); const e = { k, n: t }; if (d != null) e.d = d; G.pack.push(e); left -= t; }
    return n - left;
  }
  DM.addToPack = addToPack;
  function itemCard(e, onTap, extra = '', cls = '') {
    const it = ITEMS[e.k], el = document.createElement('button');
    el.className = 'slot' + (it.rare ? ' rare' : '') + cls;
    el.innerHTML = `<img alt="" src="${ART.iconURL[it.i]}"><span>${it.n}</span>${it.tag ? `<small class="tag">${it.tag}</small>` : ''}${e.n > 1 ? `<i class="cnt">x${e.n}</i>` : ''}${e.d != null && it.w ? `<i class="dur"><i style="width:${Math.max(4, e.d / WEAPONS[it.w].dur * 100)}%"></i></i>` : ''}${extra}`;
    el.addEventListener('click', ev => { ev.stopPropagation(); onTap(el); });
    return el;
  }
  function openLoot(o, it) {
    const rm = it.corpse ? 'Zombie' : RN(o.room) || '';
    G.sheet = { kind: 'loot', o, it };
    $('#shKick').textContent = (it.corpse ? 'Corpse' : rm) + ' · searched';
    $('#shTitle').textContent = it.corpse ? (EVS.isBoss(o) ? EVS.bossName(o.kind) : 'Zombie remains') : o.name;
    renderLoot();
    sheet.classList.add('on');
    tip('loot');
  }
  const tip = id => { if (DM.Game && DM.Game.tip) DM.Game.tip(id); };
  function renderLoot(note) {
    const s = G.sheet, o = s.o, grid = $('#shGrid'); grid.innerHTML = '';
    $('#shActs').innerHTML = '';
    const items = o.loot0 || [];
    if (!items.length) grid.innerHTML = `<div class="empty">${s.it.corpse ? 'Nothing useful on it.' : 'Nothing useful.'}</div>`;
    items.forEach((e, i) => { const fits = roomFor(e.k) > 0; grid.appendChild(itemCard(e, () => takeItem(i), fits ? '' : '<em class="nofit">won\'t fit</em>', fits ? '' : ' full')); });
    $('#shCap').textContent = note || `Pack ${G.pack.length}/${packSlots()}`;
    const can = items.some(e => roomFor(e.k) > 0);
    $('#shTake').style.display = can ? '' : 'none';
    $('#shTake').textContent = items.length > 1 ? 'Take all' : 'Take it';
  }
  function takeItem(i) {
    const o = G.sheet.o, e = o.loot0[i];
    const got = addToPack(e.k, e.n, e.d);
    if (!got) { toast(`No room for ${ITEMS[e.k].n.toLowerCase()}`, 1.4); $('#shCap').classList.add('shake'); setTimeout(() => $('#shCap').classList.remove('shake'), 400); return; }
    e.n -= got; if (!e.n) o.loot0.splice(i, 1);
    SFX.play('pick'); lootedWeapon(e.k);
    if (e.k === 'ammo' || e.k === 'key') toast(ITEMS[e.k].n + (got > 1 ? ' x' + got : '') + '!', 1.2);
    renderLoot(e.n ? `Only ${got} fit - ${e.n} left here` : null); o._key = null;
  }
  function takeAll() {
    const o = G.sheet && G.sheet.o; if (!o || G.sheet.kind !== 'loot') return;
    let took = 0;
    for (const e of o.loot0) { const got = addToPack(e.k, e.n, e.d); e.n -= got; took += got; if (got) lootedWeapon(e.k); }
    o.loot0 = o.loot0.filter(e => e.n > 0);
    if (took) SFX.play('pick');
    if (o.loot0.length) { const left = o.loot0.reduce((a, e) => a + e.n, 0); toast(`Pack full - left ${left} item${left > 1 ? 's' : ''} here`, 1.8); renderLoot(); } else closeSheet();
  }
  function lootedWeapon(k) { if (D.isWeapon(k) && DM.Game && DM.Game.onWeaponLoot) DM.Game.onWeaponLoot(k, true); }
  function closeSheet(silent) { sheet.classList.remove('on'); if (G) G.sheet = null; }
  function openPack(sel = -1) {
    if (G.over) return;
    G.sheet = { kind: 'pack' };
    $('#shKick').textContent = 'Your pack · ' + G.pack.length + '/' + packSlots();
    $('#shTitle').textContent = 'Backpack';
    const grid = $('#shGrid'); grid.innerHTML = ''; $('#shActs').innerHTML = '';
    if (!G.pack.length) grid.innerHTML = '<div class="empty">Empty. Go find something.</div>';
    G.pack.forEach((e, i) => grid.appendChild(itemCard(e, () => openPack(i === sel ? -1 : i), '', i === sel ? ' sel' : '')));
    $('#shCap').textContent = sel < 0 ? 'Tap an item to use or drop it' : '';
    $('#shTake').style.display = 'none';
    if (sel >= 0) {
      const e = G.pack[sel], it = ITEMS[e.k], acts = $('#shActs');
      acts.innerHTML = `<span><b>${it.n}</b>${e.n > 1 ? ' x' + e.n : ''}</span>`;
      if (it.w) { const b = document.createElement('button'); b.textContent = 'Equip'; b.onclick = ev => { ev.stopPropagation(); equipFromPack(sel); openPack(); }; acts.appendChild(b); }
      if (it.use) { const b = document.createElement('button'); b.textContent = it.use; b.onclick = ev => { ev.stopPropagation(); useItem(sel); }; acts.appendChild(b); }
      const d = document.createElement('button'); d.className = 'ghost'; d.textContent = 'Drop';
      d.onclick = ev => { ev.stopPropagation(); dropItem(sel); }; acts.appendChild(d);
    }
    sheet.classList.add('on');
  }
  function useItem(i, fromFood) {
    const e = G.pack[i], it = ITEMS[e.k], p = G.p;
    if ((it.slots || it.bp || e.k === 'shoes' || e.k === 'lockset') && DM.Game && DM.Game.applyUse) {
      const msg = DM.Game.applyUse(e.k); if (!msg) return;
      e.n--; if (!e.n) G.pack.splice(i, 1); lastHud = ''; SFX.play('pick'); toast(msg, 1.8); openPack(); return;
    }
    if (e.k === 'note') {
      const nd = e.d && typeof e.d === 'object' ? e.d : { addr: L.address, text: L.note };   // old notes: assume this house
      const here = nd.addr === L.address;
      $('#shActs').innerHTML = `<div class="note">${nd.text || '"...the rest is torn away."'}<br><small>Found at <b>${nd.addr || 'a house'}</b>${here ? ' - this house.' : ' - not this house. The clue is about that place.'}</small></div>`;
      SFX.play('pick'); return; }
    if (it.hp) p.hp = Math.min(maxHp(), p.hp + it.hp);
    const fed = F.isFood(e.k) ? F.eat(S(), e.k) : '';
    if (it.sta) p.sta = Math.min(F.staMax(), p.sta + it.sta);
    e.n--; if (!e.n) G.pack.splice(i, 1);
    SFX.play('pick'); toast(`${it.use === 'Use' ? 'Used' : it.use === 'Take' ? 'Took' : it.use === 'Eat' ? 'Ate' : 'Drank'} ${it.n.toLowerCase()}${fed ? ' · ' + fed : ''}`, 1.6);
    needsKey = ''; DM.Game && DM.Game.save();
    if (fromFood) openFood(); else openPack(e.n ? i : -1);
  }
  function dropItem(i) {
    const e = G.pack.splice(i, 1)[0], p = G.p;
    const a = G.drops.length * 2.1; // nudge so several drops do not sit exactly on top of each other
    G.drops.push({ k: e.k, n: e.n, d: e.d, x: p.x + (p.flip ? -18 : 18) + Math.cos(a) * 6, y: p.y + 6 + Math.sin(a) * 5, t: 0 });
    SFX.play('open'); toast('Dropped - it stays here until you leave', 1.6);
    closeSheet(); // let her see it land
  }
  function pickUp(d) {
    const got = addToPack(d.k, d.n, d.d);
    if (!got) { toast('Your pack is full', 1.3); return; }
    d.n -= got; if (!d.n) G.drops.splice(G.drops.indexOf(d), 1);
    SFX.play('pick'); toast(`Picked up ${ITEMS[d.k].n.toLowerCase()}${got > 1 ? ' x' + got : ''}`, 1.1);
  }
  $('#shTake').addEventListener('click', e => { e.stopPropagation(); takeAll(); });
  $('#shClose').addEventListener('click', e => { e.stopPropagation(); closeSheet(); });

  // ---- locks: choose pick or pry (two buttons in the sheet)
  function openLockChoice(it) {
    tip('lock');
    const o = it.obj, LK = LOCKS[o.locked], n = packCount('lockpick'), cb = hasPry();
    if (!n && !cb) { toast('Locked. You need lockpicks or a crowbar.', 1.8); SFX.play('alert'); return; }
    G.sheet = { kind: 'lock', it };
    $('#shKick').textContent = `${RN(o.room)} · ${LK.name.toLowerCase()} lock`;
    $('#shTitle').textContent = o.name;
    $('#shGrid').innerHTML = `<div class="empty lockinfo">Locked. Picking is silent but takes a steady hand.<br>Prying always works - loud, and things inside can break.</div>`;
    $('#shTake').style.display = 'none'; $('#shCap').textContent = '';
    const acts = $('#shActs'); acts.innerHTML = '';
    const bp = document.createElement('button'); bp.textContent = n ? `Pick (${n} pick${n > 1 ? 's' : ''})` : 'No picks'; bp.disabled = !n;
    bp.onclick = ev => { ev.stopPropagation(); closeSheet(); openLock(o); };
    const bc = document.createElement('button'); bc.className = 'ghost'; bc.textContent = cb ? 'Pry (crowbar)' : 'No crowbar'; bc.disabled = !cb;
    bc.onclick = ev => { ev.stopPropagation(); closeSheet(); startPry(it); };
    acts.append(bp, bc);
    sheet.classList.add('on');
  }
  function startPry(it) {
    const p = G.p, o = it.obj;
    p.st = 'search'; p.stT = 0;
    p.search = { it: { obj: o, act: 'Pry', name: o.name, rect: it.rect, noise: 7.5 * (hasItem('prybar') && !hasItem('crowbar') ? .6 : 1), pry: true, done: () => { o.locked = null; o.pried = true; o._key = null; SFX.play('kill'); G.shake = 8; emitNoise(o.x + o.w / 2, o.y + o.h, 9 * (hasItem('prybar') && !hasItem('crowbar') ? .6 : 1) * (job() === 'mechanic' ? .5 : 1)); finishPry(it); } }, t: 0, dur: 2.6 + (o.time > 2.5 ? 1 : .4), nextNoise: .2, nextFx: 0 };
    SFX.play('scrape');
  }
  function finishPry(it) { // pried open: the normal search happens straight away (with a chance to smash something)
    const p = G.p; p.search = { it: { obj: it.obj, act: 'Search', name: it.obj.name, rect: it.rect, noise: it.obj.noise, pry: true }, t: 0, dur: .01 }; finishSearch();
  }

  // ---- lockpick mini-game (game keeps running behind it)
  const LP = { on: false };
  const lpEl = $('#lockpick'), lpCv = $('#lpCv'), lpc = lpCv.getContext('2d');
  function openLock(o) {
    const LK = LOCKS[o.locked];
    if (o.sweet == null) o.sweet = 15 + Math.random() * 150; // stays the same for this lock, even after a snapped pick
    Object.assign(LP, { on: true, o, L: LK, w: LK.w * LOCK_EASE(), ang: 90, turn: 0, strain: 0, hold: false, click: 0, shake: 0, msg: '', snapT: 0, open: 0 });
    $('#lpTitle').textContent = o.name; $('#lpKick').textContent = LK.name + ' lock' + (LOCK_EASE() > 1 ? ' · thief' : '');
    lpEl.classList.add('on'); G.p.st = 'free';
    const p = G.p, dx = o.x + o.w / 2 - p.x; if (Math.abs(dx) > 3) p.flip = dx < 0;
  }
  function closeLock(msg) { LP.on = false; LP.hold = false; lpEl.classList.remove('on'); if (msg) toast(msg, 1.6); }
    function updateLock(dt) {
    if (!LP.on) return;
    if (LP.open) { LP.open += dt; LP.turn = Math.min(1, LP.turn + dt * 4); if (LP.open > .55) { const o = LP.o; closeLock(); o.locked = null; o._key = null; gainXP(LP.L.xp, G.p.x, G.p.y); startSearch({ obj: o, act: 'Search', name: o.name, rect: furnRect(o), noise: o.noise }); } return; }
    if (keys.has('KeyA') || keys.has('ArrowLeft')) LP.ang = clamp(LP.ang - 70 * dt, 0, 180);
    if (keys.has('KeyD') || keys.has('ArrowRight')) LP.ang = clamp(LP.ang + 70 * dt, 0, 180);
    const hold = LP.hold || keys.has('Space') || keys.has('KeyW') || keys.has('ArrowUp');
    const dist = Math.abs(LP.ang - LP.o.sweet), half = LP.w / 2;
    // how far the cylinder can turn before it binds: full inside the sweet spot, falling off over ~50 degrees
    const maxTurn = dist <= half ? 1 : clamp(1 - (dist - half) / 50, 0, .92);
    LP.close = clamp(1 - dist / 60, 0, 1);
    if (hold) {
      LP.turn = Math.min(maxTurn, LP.turn + dt * 1.5);
      if (LP.turn >= maxTurn - .001 && maxTurn < 1) { // bound: strain the pick
        LP.strain += dt; LP.shake = 1;
        if (Math.random() < dt * 8) buzz(12);
        if (LP.strain >= SNAP_T()) snapPick();
      } else LP.shake = 0;
      LP.click -= dt;
      if (LP.click <= 0 && LP.turn < maxTurn) { LP.click = .2 - .14 * LP.close; if (SFX.ac) SFX.tone('square', 900 + 1300 * LP.close, 700 + 900 * LP.close, .025, .025); if (LP.close > .7) buzz(6); }
      if (LP.turn >= 1) { LP.open = .001; SFX.play('kill'); SFX.tone('triangle', 220, 110, .2, .12); buzz([20, 30, 40]); }
    } else { LP.turn = Math.max(0, LP.turn - dt * 3); LP.shake = 0; LP.strain = Math.max(0, LP.strain - dt * .35); }
    if (LP.snapT > 0) LP.snapT -= dt;
  }
  function snapPick() {
    usePack('lockpick'); LP.strain = 0; LP.turn = 0; LP.snapT = .5; LP.hold = false;
    if (SFX.ac) { SFX.tone('square', 2400, 600, .06, .08); SFX.noise(.08, 'highpass', 3000, 1500, .1, 1); }
    buzz(60);
    const n = packCount('lockpick');
    if (!n) closeLock('Last pick snapped');
    else LP.msg = `Snap! ${n} pick${n > 1 ? 's' : ''} left`;
  }
  function drawLock() {
    if (!LP.on) return;
    const dpr = DEV.dpr, W = lpCv.clientWidth, H = lpCv.clientHeight;
    if (lpCv.width !== Math.round(W * dpr)) { lpCv.width = Math.round(W * dpr); lpCv.height = Math.round(H * dpr); }
    const c = lpc; c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
    const cx = W / 2, cy = H * .6, R = Math.min(W, H) * .36;
    const sh = LP.shake ? (Math.random() - .5) * 3 : 0;
    // housing
    c.fillStyle = '#2a2440'; c.beginPath(); c.arc(cx, cy, R + 18, 0, 6.29); c.fill(); c.lineWidth = 4; c.strokeStyle = P.INK; c.stroke();
    for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28 + .3; ART.dot(c, cx + Math.cos(a) * (R + 9), cy + Math.sin(a) * (R + 9), 3, '#4a4466'); }
    // cylinder turns with tension
    const rot = LP.turn * Math.PI / 2;
    c.save(); c.translate(cx + sh, cy); c.rotate(rot);
    c.fillStyle = '#c9a85a'; c.beginPath(); c.arc(0, 0, R, 0, 6.29); c.fill(); c.lineWidth = 3.5; c.strokeStyle = P.INK; c.stroke();
    c.fillStyle = '#e0c47a'; c.beginPath(); c.arc(0, 0, R * .78, 0, 6.29); c.fill();
    // keyway
    c.fillStyle = P.INK; c.beginPath(); c.moveTo(-6, -R * .55); c.lineTo(6, -R * .55); c.lineTo(4, R * .2); c.lineTo(10, R * .35); c.lineTo(-10, R * .35); c.lineTo(-4, R * .2); c.closePath(); c.fill();
    c.restore();
    // tension wrench at the bottom of the keyway, moving with the cylinder
    c.save(); c.translate(cx + sh, cy); c.rotate(rot); c.strokeStyle = P.INK; c.lineWidth = 9; c.lineCap = 'round';
    c.beginPath(); c.moveTo(0, R * .3); c.lineTo(0, R * .62); c.lineTo(R * .9, R * .62); c.stroke();
    c.strokeStyle = '#9aa0b4'; c.lineWidth = 4.5; c.stroke(); c.restore();
    // the pick, from the keyway out at the chosen angle (0 = left, 180 = right, over the top)
    const a = Math.PI + LP.ang / 180 * Math.PI, jit = LP.shake ? (Math.random() - .5) * .05 : 0, bend = Math.min(1, LP.strain / SNAP_T());
    c.save(); c.translate(cx + sh, cy); c.rotate(a + jit);
    c.lineCap = 'round';
    c.strokeStyle = P.INK; c.lineWidth = 8; c.beginPath(); c.moveTo(4, 0); c.quadraticCurveTo(R * .7, -bend * 12, R * 1.3, -bend * 4); c.stroke();
    c.strokeStyle = LP.snapT > 0 ? '#ff5a48' : bend > .55 ? '#f0b090' : '#d8dceb'; c.lineWidth = 4; c.stroke();
    c.fillStyle = P.LIL; c.strokeStyle = P.INK; c.lineWidth = 3; ART.rr(c, R * 1.2, -9, R * .42, 18, 6); c.fill(); c.stroke();
    c.restore();
    // tension meter
    const mw = W * .62, mx = cx - mw / 2, my = H * .1;
    c.fillStyle = 'rgba(17,20,47,.9)'; ART.rr(c, mx - 3, my - 3, mw + 6, 16, 8); c.fill();
    const tcol = bend > .66 ? '#ff5a48' : bend > .33 ? P.ORA : P.GRN;
    c.fillStyle = tcol; ART.rr(c, mx, my, Math.max(6, mw * bend), 10, 5); c.fill();
    c.textAlign = 'center';
    if (LP.open) { c.fillStyle = P.GRN; c.font = '900 15px system-ui,sans-serif'; c.fillText('CLUNK - IT OPENS', cx, my + 30); }
    else if (LP.msg) { c.fillStyle = '#ff8a7a'; c.font = '900 13px system-ui,sans-serif'; c.fillText(LP.msg.toUpperCase(), cx, my + 30); }
    else { c.fillStyle = P.MUTE; c.font = '900 10px system-ui,sans-serif'; c.fillText('PICK STRAIN', cx, my + 28); }
    $('#lpPicks').textContent = `${packCount('lockpick')} pick${packCount('lockpick') === 1 ? '' : 's'}`;
  }
  // input: drag horizontally anywhere on the lock to aim, hold TURN to apply tension
  let lpDrag = null;
  lpCv.addEventListener('pointerdown', e => { SFX.init(); lpDrag = { x: e.clientX, a: LP.ang, id: e.pointerId }; lpCv.setPointerCapture(e.pointerId); e.preventDefault(); });
  lpCv.addEventListener('pointermove', e => { if (!lpDrag || e.pointerId !== lpDrag.id || LP.hold) return; LP.ang = clamp(lpDrag.a + (e.clientX - lpDrag.x) * .55, 0, 180); });
  const lpUp = e => { if (lpDrag && e.pointerId === lpDrag.id) lpDrag = null; };
  lpCv.addEventListener('pointerup', lpUp); lpCv.addEventListener('pointercancel', lpUp);
  const turnB = $('#lpTurn');
  turnB.addEventListener('pointerdown', e => { SFX.init(); e.preventDefault(); LP.hold = true; turnB.classList.add('down'); LP.msg = ''; });
  const tUp = () => { LP.hold = false; turnB.classList.remove('down'); };
  turnB.addEventListener('pointerup', tUp); turnB.addEventListener('pointercancel', tUp); turnB.addEventListener('pointerleave', tUp);
  $('#lpClose').addEventListener('click', e => { e.stopPropagation(); closeLock(); });

  // ---- level up popup
  let lvlTimer = 0;
  function levelUp(L) {
    const perk = PERKS[L];
    $('#lvlBody').innerHTML = `<div class="kick">Scavenging</div><div class="lv">Level ${L}</div>
      <div class="lvsub">Searches 6% faster · +4% extra-loot chance</div>
      ${perk ? `<div class="perk"><b>Perk unlocked: ${perk[0]}</b>${perk[1]}</div>` : ''}`;
    const el = $('#lvlup'); el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
    clearTimeout(lvlTimer); lvlTimer = setTimeout(() => el.classList.remove('on'), perk ? 3600 : 2600);
    if (SFX.ac) [523, 659, 784, 1046].forEach((f, i) => SFX.tone('triangle', f, f * 1.01, .25, .07, i * .09));
    puff(G.p.x, G.p.y, 30, 18, '#ffe2a8', 140, .9, 3);
  }

  function hideCards() { $('#card').classList.remove('on'); }
  function packSummaryHTML(list) {
    if (!list.length) return '<div class="empty">Nothing.</div>';
    const counts = {}; list.forEach(e => counts[e.k] = (counts[e.k] || 0) + e.n);
    return Object.keys(counts).map(k => `<div class="sum-item${ITEMS[k].rare ? ' rare' : ''}"><img alt="" src="${ART.iconURL[ITEMS[k].i]}"><span>${ITEMS[k].n}</span>${counts[k] > 1 ? `<b>x${counts[k]}</b>` : ''}</div>`).join('');
  }
  const skillLine = () => { const Lv = scavLvl(); return `<div class="skline">Scavenging Lv ${Lv}${Lv < 10 ? ` · ${S().xp - XPCUM(Lv)}/${XPCUM(Lv + 1) - XPCUM(Lv)} xp` : ' · max'}</div>`; };
  function showSummary() {
    G.over = true; G.paused = true; closeSheet(true);
    const rooms = Object.keys(L.rooms).filter(k => k !== streetRoom() && !L.rooms[k].hidden && !L.rooms[k].isolated), seen = rooms.filter(k => G.visited[k]).length;
    const total = G.furn.filter(f => f.lootable && !f.secretLoot).length;
    const secs = Math.round((performance.now() - G.stats.start) / 1000);
    const nf = G.sec.filter(s => s.found).length, nm = G.sec.length;
    $('#cardBody').innerHTML = `
      <div class="kick">${L.address} · you got out</div>
      <h2>Back on the street</h2>
      <div class="stats"><div><b>${seen}/${rooms.length}</b>rooms</div><div><b>${G.furn.filter(f => f.lootable && !f.secretLoot && f.searched).length}/${total}</b>searched</div><div><b>${G.stats.kills}</b>zombies</div><div><b>${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}</b>time</div></div>
      <div class="found${nf ? '' : ' dim'}">Secrets found: ${nf} of ${nm}</div>
      <div class="sum">${packSummaryHTML(G.pack)}</div>
      ${G.drops.length ? `<div class="lost">Left behind: ${G.drops.map(d => ITEMS[d.k].n + (d.n > 1 ? ' x' + d.n : '')).join(', ')}</div>` : ''}
      ${skillLine()}
      <div class="btnrow"><button id="cBack" class="ghost">Go back in</button><button id="cNew">Head home</button></div>`;
    $('#card').classList.add('on');
    $('#cBack').onclick = () => { hideCards(); G.over = false; G.paused = false; G.p.y = (L.streetY + .4) * T; G.p.vy = 0; };
    $('#cNew').onclick = () => finishRun('left');
  }
  function showDeath() {
    G.over = true;
    const lost = G.pack.filter((_, i) => i % 2 === 1); const keep = G.pack.filter((_, i) => i % 2 === 0); G.pack.length = 0; G.pack.push(...keep);
    $('#cardBody').innerHTML = `
      <div class="kick red">down · ${L.address}</div>
      <h2>You barely got out</h2>
      <p>She dragged herself back out onto the stoop. Half the pack spilled on the way.</p>
      <div class="sum">${packSummaryHTML(G.pack)}</div>
      ${lost.length ? `<div class="lost">Lost: ${lost.map(e => ITEMS[e.k].n + (e.n > 1 ? ' x' + e.n : '')).join(', ')}</div>` : ''}
      ${skillLine()}
      <div class="btnrow"><button id="cNew">Head home</button></div>`;
    $('#card').classList.add('on');
    $('#cNew').onclick = () => finishRun('down');
  }

  // ---------------------------------------------------------------- weapons: durability, swapping, bow
  function wearWeapon(n = 1) {
    const h = S().hands; if (!h || h.d == null) return;
    h.d -= n;
    if (h.d <= 0) { toast(`Your ${ITEMS[h.k].n.toLowerCase()} broke!`, 2); SFX.play('break'); S().hands = null; lastHud = ''; }
  }
  function swapWeapon() {
    const ws = G.pack.map((e, i) => [e, i]).filter(([e]) => D.isWeapon(e.k));
    if (!ws.length) { toast(S().hands ? 'No other weapon in your pack' : 'No weapon - fists it is', 1.4); return; }
    const [e, i] = ws[0], cur = S().hands;
    S().hands = { k: e.k, d: e.d == null ? WEAPONS[ITEMS[e.k].w].dur : e.d };
    if (cur) G.pack[i] = { k: cur.k, n: 1, d: cur.d }; else G.pack.splice(i, 1);
    // rotate so repeated taps cycle through every weapon
    if (cur) { const moved = G.pack.splice(i, 1)[0]; G.pack.push(moved); }
    SFX.play('pick'); toast('Equipped ' + ITEMS[e.k].n.toLowerCase(), 1); lastHud = '';
  }
  // the weapon chip: a list of every weapon in the pack, tap one to fight with it
  function openSwap() {
    if (G.over) return;
    const h = S().hands, cur = h ? WEAPONS[ITEMS[h.k].w].dmg : WEAPONS.fists.dmg;
    const ws = G.pack.map((e, i) => [e, i]).filter(([e]) => D.isWeapon(e.k));
    G.sheet = { kind: 'swap' };
    $('#shKick').textContent = 'Swap weapon · holding ' + (h ? ITEMS[h.k].n.toLowerCase() : 'nothing') + ', ' + cur + ' dmg';
    $('#shTitle').textContent = ws.length ? 'Weapons in your pack' : 'No other weapons';
    const grid = $('#shGrid'); grid.innerHTML = ''; $('#shActs').innerHTML = '';
    if (!ws.length) grid.innerHTML = '<div class="empty">Weapons you loot go in your pack. Come back here to swap to one mid-run.</div>';
    ws.forEach(([e, i]) => { const dm = WEAPONS[ITEMS[e.k].w].dmg, df = dm - cur;
      grid.appendChild(itemCard(e, () => { equipFromPack(i); closeSheet(); }, `<em class="wdmg${df > 0 ? ' up' : df < 0 ? ' down' : ''}">${dm} dmg${df ? ` ${df > 0 ? '+' : ''}${df}` : ''}</em>`)); });
    $('#shCap').textContent = ws.length ? 'Tap one to fight with it' : '';
    $('#shTake').style.display = 'none';
    sheet.classList.add('on');
  }
  function equipFromPack(i) {
    const e = G.pack[i]; if (!e || !D.isWeapon(e.k)) return;
    const cur = S().hands;
    S().hands = { k: e.k, d: e.d == null ? WEAPONS[ITEMS[e.k].w].dur : e.d };
    if (cur) G.pack[i] = { k: cur.k, n: 1, d: cur.d }; else G.pack.splice(i, 1);
    if (DM.Game && DM.Game.onEquip) DM.Game.onEquip();
    SFX.play('pick'); toast('Equipped ' + ITEMS[e.k].n.toLowerCase(), 1.1); lastHud = '';
  }
  function fireArrow() {
    const p = G.p;
    if (!arrowsLeft()) { toast('No arrows', 1.1); return false; }
    useArrow();
    let best = null, bd = 8 * T;
    for (const z of G.zs) {
      if (z.dead) continue;
      const dx = z.x - p.x, dy = z.y - p.y, d = Math.hypot(dx, dy);
      if (d < bd && dx * p.fx + dy * p.fy > 0 && losClear(p.x, p.y - 30, z.x, z.y - 30)) { bd = d; best = z; }
    }
    let ax = p.fx, ay = p.fy;
    if (best) { const dx = best.x - p.x, dy = best.y - p.y, d = Math.hypot(dx, dy) || 1; ax = dx / d; ay = dy / d; if (Math.abs(dx) > 4) p.flip = dx < 0; p.fx = ax; p.fy = ay; }
    const sp = 15 * T;
    G.arrows.push({ x: p.x + ax * 16, y: p.y + ay * 10, vx: ax * sp, vy: ay * sp, z: 36, life: 1.1 });
    SFX.play('bow'); emitNoise(p.x, p.y, WEAPONS.bow.noise, false); wearWeapon();
    return true;
  }
  function landArrow(x, y) {
    if (Math.random() > .65) return; // some snap
    const near = G.drops.find(d => d.k === 'arrow' && Math.hypot(d.x - x, d.y - y) < 26);
    if (near) near.n++; else G.drops.push({ k: 'arrow', n: 1, x, y, t: .7 });
  }
  function updateArrows(dt) {
    for (const a of G.arrows) {
      const steps = 3;
      for (let i = 0; i < steps && a.life > 0; i++) {
        a.x += a.vx * dt / steps; a.y += a.vy * dt / steps;
        const hitZ = G.zs.find(z => !z.dead && Math.hypot(z.x - a.x, (z.y - a.y) * 1.3) < 22);
        if (hitZ) { hitZombie(hitZ, Math.atan2(a.vy, a.vx), WEAPONS.bow.dmg, true); a.life = 0; landArrow(hitZ.x + (Math.random() - .5) * 20, hitZ.y + 8); break; }
        if (overlapsSolid({ hw: 2, hh: 2 }, a.x, a.y)) { a.life = 0; SFX.play('thunk'); landArrow(a.x - a.vx * .012, a.y - a.vy * .012); break; }
      }
      a.life -= dt;
      if (a.life <= 0 && !a.done) { a.done = true; }
    }
    G.arrows = G.arrows.filter(a => a.life > 0);
  }
  function drawArrows() {
    for (const a of G.arrows) {
      const ang = Math.atan2(a.vy, a.vx);
      ctx.save(); ctx.translate(a.x, a.y - a.z); ctx.rotate(ang);
      ctx.strokeStyle = P.INK; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(12, 0); ctx.stroke();
      ctx.strokeStyle = '#d9a46a'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = P.ORA; ctx.fillRect(-18, -3, 6, 6);
      ctx.restore();
    }
  }

  function zombieCount() { const zs = G.zs.filter(z => !EVS.isBoss(z)); return { dead: zs.filter(z => z.dead).length, total: zs.length }; }
  // ---------------------------------------------------------------- finishing a run
  function finishRun(kind) {
    S().hp = Math.max(kind === 'down' ? 20 : 1, Math.round(G.p.hp));
    const res = {
      kind, address: L.address, type: L.type, id: L.id,
      kills: G.stats.kills, searched: G.furn.filter(f => f.lootable && f.searched).length,
      secrets: G.sec.filter(s => s.found).length, secretsTotal: G.sec.length, zombies: zombieCount(), left: G.drops.map(d => ({ k: d.k, n: d.n })),
    };
    G.drops = []; G.over = true; LP.on = false; lpEl.classList.remove('on');
    closeSheet(true); hideCards();
    DM.scene = null; document.body.classList.remove('inrun');
    E.resetJoy(); keys.clear();
    if (opts.onExit) opts.onExit(res);
  }

  // ---------------------------------------------------------------- keyboard (only while in a house)
  function onKey(e) {
    if (!G || G.over && !$('#card').classList.contains('on')) return;
    if (LP.on) { if (e.code === 'Escape' || e.code === 'KeyQ') closeLock(); if (e.code === 'Space') e.preventDefault(); return; }
    if (G.sheet) {
      if (G.sheet.kind === 'lock') { if (e.code === 'KeyE' || e.code === 'Digit1') { e.preventDefault(); $('#shActs button').click(); return; } if (e.code === 'Digit2' || e.code === 'KeyR') { $('#shActs button.ghost').click(); return; } }
      if (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); if (G.sheet.kind === 'loot') takeAll(); else closeSheet(); return; }
      if (e.code === 'Escape' || e.code === 'KeyQ' || e.code === 'Tab' || e.code === 'KeyI') { e.preventDefault(); closeSheet(); return; }
      if (E.MOVEKEYS.includes(e.code)) closeSheet();
    }
    if (e.code === 'Space' || e.code === 'KeyJ') { e.preventDefault(); btn.atkPressed = true; }
    if (e.code === 'KeyE' || e.code === 'Enter') { e.preventDefault(); btn.use = true; }
    if (e.code === 'KeyQ' || e.code === 'KeyK') btn.dodge = true;
    if (e.code === 'KeyR') swapWeapon();
    if (e.code === 'KeyI' || e.code === 'Tab') { e.preventDefault(); openPack(); }
  }
  $('#pack').addEventListener('click', () => { SFX.init(); if (G && !G.over) openPack(); });
  $('#wpn').addEventListener('click', e => { e.stopPropagation(); SFX.init(); if (G && !G.over) { if (G.sheet && G.sheet.kind === 'swap') closeSheet(); else openSwap(); } });

  const scene = {
    update, render, hud, key: onKey, tap: (x, y) => tapWorld(x, y),
    blocked: () => !!(G && (G.sheet || G.over)), resized: () => { if (G) buildStatic(); },
  };
  DM.House = {
    start(layout, o) { startRun(layout, o); document.body.classList.add('inrun'); document.body.classList.toggle('event', !!EVA); DM.scene = scene; },
    get G() { return G; }, get L() { return L; }, zombieCount: () => G ? zombieCount() : { dead: 0, total: 0 },
    // used by the base (base.js): live furniture, spawning, damage, leaving
    addFurn(d) {
      const f = Object.assign({}, d);
      f.fid = G.furn.length ? Math.max(...G.furn.map(x => x.fid)) + 1 : 0;
      f.tx = d.at[0]; f.ty = d.at[1]; f.tw = d.at[2]; f.th = d.at[3];
      f.x = f.tx * T; f.y = f.ty * T; f.w = f.tw * T; f.h = f.th * T;
      if (f.solid == null) f.solid = 1;
      f.lootable = !!d.loot; f.searched = false; f.slide = 0; f.room = d.room || roomAt(f.tx, f.wall ? f.ty + 1 : f.ty);
      f._key = null; f._c = null;
      G.furn.push(f); buildSolid(); return f;
    },
    removeFurn(f) { const i = G.furn.indexOf(f); if (i >= 0) G.furn.splice(i, 1); buildSolid(); },
    refresh() { buildSolid(); for (const f of G.furn) f._key = null; },
    spawn(x, y, props) { const z = mkZombie(x, y, 'investigate', null); Object.assign(z, props || {}); G.zs.push(z); return z; },
    hurtZombie(z, dmg, fa = 0, soft) { const kb = [z.kbx, z.kby]; hitZombie(z, fa, dmg, true); if (soft && !z.dead) { z.kbx = kb[0]; z.kby = kb[1]; if (z.st === 'hurt') z.st = 'chase'; } },
    solidAt: (tx, ty) => !!solidCell[ty * MW + tx],
    // phase 5b (crew.js, boss.js): move an entity with collision, path toward the player, line of sight, noise, hurting her
    move: (e, dx, dy) => moveEnt(e, dx, dy),
    stepToPlayer: e => nextStep(e, playerField()),
    los: (x0, y0, x1, y1) => losClear(x0, y0, x1, y1),
    noise: (x, y, r, show) => emitNoise(x, y, r, show),
    hurtPlayer: (dmg, dx, dy, z) => hurtPlayer(dmg, dx, dy, z),
    banner: (t, sub) => banner(t, sub), puff: (...a) => puff(...a),
    roomAt: e => { const [x, y] = cellOf(e); return roomAt(x, y); },
    fogOf: r => (G && r != null && G.fog[r] != null ? G.fog[r] : 0),
    pause: on => { if (G) G.paused = !!on; },
    exit(kind) { if (G && !G.over || kind) finishRun(kind || 'leave'); },
    get opts() { return opts; },
  };
  // debug / test hooks
  Object.assign(DM, {
    gateOpen: () => gateOpen(), LP, EVENT, openPack, dropItem, swapWeapon, openSwap,
    tp(tx, ty) { G.p.x = tx * T; G.p.y = ty * T; G.p.vx = G.p.vy = 0; G.cam.x = G.p.x; G.cam.y = G.p.y - 34; },
    face(x, y) { G.p.fx = x; G.p.fy = y; if (x) G.p.flip = x < 0; },
    target() { const t = findTarget(); return t ? { act: t.act, name: t.name } : null; },
    use() { btn.use = true; }, attack() { btn.atkPressed = true; },
    furn(name) { return G.furn.find(f => f.name === name); },
    // 0.9 walkability tests: collision as the player feels it, and the wall pieces as drawn
    coll: { hit: (x, y, e) => overlapsSolid(e || G.p, x, y), walls: () => wallRects, leaves: () => doorLeaves, rebuild() { buildWalls(); buildSolid(); }, size: () => [MW, MH], ch, collRect },
    T,
  });
  Object.defineProperty(DM, 'G', { get: () => G, configurable: true });
})();
