/* Dead Miles (next) - 0.17 DEEP RUNS: a roguelike, extraction-style run through a big building, floor after floor.
   Owner: loved the idea, but can't walk 10k a day - so passes come from CUMULATIVE walking, not one big day.

   PASSES   Every 8,000 steps walked (SV.walked: the same total quests and Dot use - phone/watch steps, typed at half)
            earns a pass, any days. Hold 2 at most; while full, steps do not bank toward the next one.
   THE RUN  Spend a pass, pick a building: an apartment tower (5 floors), a teaching hospital (4) or an army checkpoint (3).
            Each floor is a normal generated house (gen.js, existing types, a seed per floor, GV 4) with a light theme on top:
            room/furniture names, a stairwell landing instead of the street (floors 2+), a stairwell exit in the farthest room.
            Deeper = more zombies, more special infected (forced on, infected.js L.deepInf), better loot (D.LOOT.deep1-3, fewer
            empty containers). One random twist per floor (MODS). The last floor has a boss next to a big supply chest.
   CHOICE   At the stairwell: Go deeper, or Get out with what you have. Not yet = keep looting this floor.
   LOOT     What she finds is the run's, not hers, until she gets out: SV.deep.run.own is what she brought (pack + hands,
            tracked as a running minimum so used-up items are not given back), anything above that is run loot. Going deeper
            bags it (food/drink/meds/tools stay in the pack to use). Cosmetics found wait in run.cos. Gear found in the run
            (packs, blueprints, shoes, lockset) can't be fitted/learned until she is out.
            Get out: all of it goes to the stash (then the pack; anything that still does not fit waits on the home card).
            Downed: all of it is lost; her own gear stays (no half-pack spill). Quiver and keyring are never spilled (as always).
   RESUME   Closing the app never ends a run. On the next start the game drops her straight back in (no home screen in
            between, so nothing can be moved to the stash): the same floor with its saved progress (house.js snapRun via
            opts.onState / opts.resume), her HP as it was (saved as it changes, not the floor-start HP), or the stairwell
            choice if that was open. Zombies come back to their spots, as in any resumed house. Downed and closed before the
            card: she is down when she comes back.
   Save: SV.deep = { passes, mark, seq, stats, run, last, held }. Made on first use (no migration needed). */
'use strict';
(() => {
  const D = DM.D, E = DM.E, $ = E.$, SFX = E.SFX, toast = E.toast, T = E.T, P = ART.P;
  const DP = DM.Deep = {};
  const GM = () => DM.Game, SV = () => DM.Game.data(), H = () => DM.House, SK = () => DM.Skills;
  const S = () => SV().survivor;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = n => Math.round(n).toLocaleString('en-US');
  const icon = k => `<img alt="" src="${ART.iconURL[D.ITEMS[k].i]}">`;
  DP.STEPS = 8000; DP.MAX = 2; DP.STASH = 40;

  // ---------------------------------------------------------------- buildings
  // types: gen.js building type per floor. mix: special infected lean. boss: a special with boosted HP on the last floor.
  DP.B = {
    tower: {
      n: 'The Fulton Arms', kind: 'Apartment tower', col: '#7ec0ee', types: ['apt', 'rowS', 'apt', 'rowL', 'rowL'],
      floorN: ['Lobby & mailroom', 'Low floors', 'Middle floors', 'High floors', 'Penthouse'], lean: 'runners and screamers',
      mix: { runner: 40, screamer: 25, bloater: 20, armored: 15 }, boss: { kind: 'screamer', name: 'The Super', hp: 380, dmg: 1.4 },
      blurb: 'Twelve storeys of sealed apartments. Small floors, lots of doors, and something on the top floor that screams.',
      rooms: { porch: 'Balcony', courtyard: 'Roof garden' }, furn: {},
    },
    hospital: {
      n: 'Kings Mercy Hospital', kind: 'Teaching hospital', col: '#93c45a', types: ['pharmacy', 'school', 'pharmacy', 'school'],
      floorN: ['Outpatient pharmacy', 'Teaching wing', 'Pharmacy stores', 'Isolation ward'], lean: 'bloaters',
      mix: { bloater: 45, runner: 25, screamer: 20, armored: 10 }, boss: { kind: 'bloater', name: 'Patient Zero', hp: 520, dmg: 1.4 },
      blurb: 'The meds were never evacuated. Neither were the patients. Kill bloaters from range.',
      rooms: { classroom: 'Lecture room', gym: 'Physical therapy', nurse: "Nurses' station", lobby: 'Admissions', janitor: 'Supply closet', office: "Doctor's office", bath: 'Restroom', storage: 'Supply room', breakroom: 'Staff lounge', pharmfloor: 'Hospital pharmacy', pharmback: 'Drug storage' },
      furn: { "Teacher's desk": "Lecturer's desk", 'Gym lockers': 'Staff lockers', 'Equipment shelf': 'Therapy shelf', 'Drinks cooler': 'Vending machine', 'Front desk': 'Admissions desk', 'Janitor shelves': 'Supply shelves' },
    },
    checkpoint: {
      n: 'Checkpoint Bravo', kind: 'Army checkpoint', col: '#e0b94a', types: ['garage', 'police', 'police'],
      floorN: ['Motor pool', 'Command post', 'Armory level'], lean: 'armored',
      mix: { armored: 55, runner: 25, screamer: 10, bloater: 10 }, boss: { kind: 'armored', name: 'The Sergeant', hp: 420, armor: 240, dmg: 1.5 },
      blurb: 'The last line on Flatbush Ave fell in a night. Short, mean, full of riot armour - and the armory.',
      rooms: { lobby: 'Checkpoint gate', bullpen: 'Command post', lockers: 'Barracks', evidence: 'Confiscated goods', breakroom: 'Mess hall', office: "Officer's office", bay: 'Motor pool', bath: 'Latrine', storage: 'Supply depot' },
      furn: { 'Evidence shelves': 'Seized goods', 'Evidence locker': 'Seized-goods locker', 'Front desk': 'Gate desk', Lockers: 'Footlockers' },
    },
  };
  DP.ORDER = ['tower', 'hospital', 'checkpoint'];
  // ---------------------------------------------------------------- floor twists
  DP.MODS = {
    dark: { n: "Power's out", d: 'The lights are dead. You only see what your flashlight reaches.' },
    nest: { n: 'Nest', d: 'Twice the zombies on this floor.' },
    gas: { n: 'Gas leak', d: 'Every sound carries much further (noise x1.75).' },
    looted: { n: 'Looted', d: 'Picked over: most containers are empty - but something good was missed.' },
    quiet: { n: 'Quiet', d: 'Everything on this floor is asleep. Keep it that way.' },
  };
  const GAS = 1.75;
  // ---------------------------------------------------------------- loot: bonus rolls on deeper floors, the boss chest
  D.LOOT.deep1 = [[1, 1], { bandage: 3, meds: 2, ammo: 2, lockpick: 2, battery: 1, tape: 1, coffee: 1, water: 1, 'bp_*': .35, 'decor_*': .35, 'cos_*': .12 }];
  D.LOOT.deep2 = [[1, 1], { meds: 2, ammo: 1.5, lockpick: 1.5, bandage: 1, 'bp_*': 1, 'cos_*': .5, 'decor_*': .7, packplus: .25, machete: .3, prybar: .3, watch: .6, jewelry: .6 }];
  D.LOOT.deep3 = [[1, 1], { 'bp_*': 1.5, 'cos_*': 1, 'decor_*': .7, backpack: .35, packplus: .5, lockset: .4, machete: .5, axe: .4, watch: .8, jewelry: .8, meds: 1 }];
  D.LOOT.deepchest = [[5, 6], { 'bp_*': 2, 'cos_*': 1.5, backpack: .7, packplus: .8, lockset: .6, axe: .6, machete: .6, watch: 1, jewelry: 1, meds: 1.5, ammo: 1 }, ['bp_*', 'cos_*']];

  // ---------------------------------------------------------------- save
  function st() {
    const v = SV(); if (!v) return null;
    if (!v.deep) v.deep = { passes: 1, mark: v.walked || 0, seq: 0, stats: { runs: 0, out: 0, downs: 0, deepest: 0 }, run: null, last: null, held: [] };   // the first pass is on the house
    const d = v.deep; d.stats = d.stats || { runs: 0, out: 0, downs: 0, deepest: 0 }; d.held = d.held || [];
    return d;
  }
  const run = () => { const d = st(); return d && d.run; };
  // passes: lazily credited from SV.walked whenever anything looks (same result as crediting on every step post)
  function credit() {
    const d = st(), w = SV().walked || 0;
    if (d.mark > w) d.mark = w;   // a step correction took steps back
    while (d.passes < DP.MAX && w - d.mark >= DP.STEPS) { d.passes++; d.mark += DP.STEPS; }
    if (d.passes >= DP.MAX) d.mark = w;   // full: nothing banks toward the next one
    return d;
  }
  DP.passes = () => credit().passes;
  DP.toNext = () => { const d = credit(); return d.passes >= DP.MAX ? null : DP.STEPS - ((SV().walked || 0) - d.mark); };
  DP.active = () => !!run();

  // ---------------------------------------------------------------- what she brought vs what the run gave her
  const counts = s => { const c = {}; for (const e of s.pack) c[e.k] = (c[e.k] || 0) + e.n; if (s.hands) c[s.hands.k] = (c[s.hands.k] || 0) + 1; return c; };
  function trackOwn(r) { // running minimum: something she brought and used up is not "hers" again when she finds another
    const c = counts(S()); let ch = false;
    for (const k in r.own) { const n = Math.min(r.own[k], c[k] || 0); if (n !== r.own[k]) { ch = true; if (n) r.own[k] = n; else delete r.own[k]; } }
    return ch;
  }
  function found(r) { const c = counts(S()), out = {}; for (const k in c) { const f = c[k] - (r.own[k] || 0); if (f > 0) out[k] = f; } return out; }
  function takePack(k, n, out) { // newest stacks first
    const pk = S().pack;
    for (let i = pk.length - 1; i >= 0 && n > 0; i--) { const e = pk[i]; if (e.k !== k) continue; const t = Math.min(n, e.n); e.n -= t; n -= t; out.push({ k, n: t, d: e.d }); if (!e.n) pk.splice(i, 1); }
    return n;
  }
  const KEEP = { food: 1, drink: 1, med: 1, tool: 1 };   // stays in the pack when she goes deeper (usable on the next floor)
  function merge(list, items) { for (const e of items) { const m = !D.isWeapon(e.k) && list.find(x => x.k === e.k); if (m) m.n += e.n; else list.push({ k: e.k, n: e.n, d: e.d }); } return list; }
  const runLoot = r => merge(merge([], r.haul), (() => { const f = found(r), out = []; for (const k in f) out.push({ k, n: f[k] }); return out; })()).concat(r.cos.map(k => ({ k, n: 1 })));
  function addTo(list, slots, k, n, d) { // same as game.js addTo
    const m = D.stackMax(k); let left = n;
    for (const e of list) if (e.k === k && e.n < m && left) { const t = Math.min(left, m - e.n); e.n += t; left -= t; }
    while (left && list.length < slots) { const t = Math.min(left, m); const e = { k, n: t }; if (d != null) e.d = d; list.push(e); left -= t; }
    return n - left;
  }
  const packSlots = () => 12 + (S().packBonus || 0) + SK().packBonus(S());
  function bank(items) { // stash first, then the pack; anything else waits on the home card (SV.deep.held)
    const s = S(), d = st(), left = [];
    for (const e of items) {
      let got = addTo(s.stash, DP.STASH, e.k, e.n, e.d); if (got < e.n) got += addTo(s.pack, packSlots(), e.k, e.n - got, e.d);
      if (got < e.n) left.push({ k: e.k, n: e.n - got, d: e.d });
    }
    d.held = merge(d.held, left);
    return left;
  }
  DP.claim = () => { const d = st(), h = d.held; d.held = []; const left = bank(h); GM().save(); return left; };

  // ---------------------------------------------------------------- floors
  const N = r => DP.B[r.b].types.length;
  const modOf = (r, f) => r.mods[f - 1];
  function rollMods(seed, n) {
    const rnd = D.mulberry32(seed ^ 0x6d0d5), out = [];
    for (let f = 1; f <= n; f++) {
      let pool = f === n ? ['dark', 'gas', 'looted'] : Object.keys(DP.MODS);   // the boss floor: no nest, nobody asleep
      pool = pool.filter(m => m !== out[f - 2]);
      out.push(pool[Math.floor(rnd() * pool.length)]);
    }
    return out;
  }
  // the floor's layout: generated (gen.js, untouched) then themed. Deterministic from (run seed, floor), so a resume matches.
  function floorLayout(r, f) {
    const B = DP.B[r.b], n = N(r), type = B.types[f - 1], seed = D.hashStr(r.seed + ':floor:' + f), mod = modOf(r, f), last = f === n;
    const L = JSON.parse(JSON.stringify(DM.Gen.generate(type, seed, { gv: GM().GV || 4 })));
    const dep = n > 1 ? (f - 1) / (n - 1) : 1, rnd = D.mulberry32(seed ^ 0xd33b);
    L.id = 'deep-' + r.id + '-' + f; L.seed = seed; L.deep = { f, n, b: r.b, mod };
    L.address = B.n + ' · ' + B.floorN[f - 1]; L.danger = Math.min(5, 2 + f);
    for (const k in L.rooms) { const R = L.rooms[k]; if (R.kind && B.rooms[R.kind]) R.name = B.rooms[R.kind]; }
    for (const fd of L.furn) if (B.furn[fd.name]) fd.name = B.furn[fd.name];
    const street = L.street || 'o';
    if (f > 1) { // floors 2+: the street is the stairwell landing outside the floor's front door
      Object.assign(L.rooms[street], { name: 'Stairwell landing', style: 'g' }); L.noStreet = true; L.wanderer = false;
      // street pieces become landing clutter IN PLACE (furniture indices are referenced by secrets and sleepers)
      L.furn = L.furn.map(fd => fd.room !== street && fd.at[1] < L.streetY ? fd
        : fd.art === 'pcar' ? { art: 'crate', name: 'Abandoned crate', at: fd.at, H: 30, time: 2.4, noise: 4, loot: 'storage', room: street, jack: fd.jack }
        : fd.art === 'lamppost' ? { art: 'heater', at: fd.at, H: 54, room: street } : fd);
      delete L.car;
    }
    // loot: fewer empty containers and bonus rolls from better tables the deeper she goes
    const tier = dep < .34 ? 'deep1' : dep < .67 ? 'deep2' : 'deep3', pb = .1 + .3 * dep;
    L.emptyPct = mod === 'looted' ? .6 : Math.max(.05, .2 - .15 * dep);
    const cont = L.furn.filter(fd => fd.loot && !fd.secretLoot && fd.room !== street && !fd.keyLock);
    for (const fd of cont) if (rnd() < pb) { fd.extra = (fd.extra || []).concat(D.rollLoot(tier, rnd)); fd.noEmpty = 1; }
    if (mod === 'looted' && cont.length) { const fd = cont[Math.floor(rnd() * cont.length)]; fd.extra = (fd.extra || []).concat(D.rollJack('stash', rnd)); fd.noEmpty = 1; }
    // zombies: more of them, more specials (infected.js reads L.deepInf), a twist or two
    const n0 = L.zombies.length, big = type === 'school' || type === 'police';
    let extra = Math.round(f * (big ? .75 : 1));
    if (mod === 'nest') extra = n0 + 2 * extra;   // twice the floor's total
    L.deepInf = { p: Math.min(.7, .2 + .45 * dep), extra, mix: B.mix, min: last ? 2 : f > 1 ? 1 : 0 };
    if (mod === 'quiet') for (const zd of L.zombies) if (!zd.sleep) zd.st = 'sleep';
    // the stairwell exit in the farthest room; on the last floor a supply chest + the boss there too
    let g = reach(L);
    if (last) {
      const c = farthest(L, g, (x, y) => g.pass(x, y + 1));
      if (c) {
        L.furn.push({ art: 'crate', name: 'Supply chest', at: [c.x, c.y, 1, 1], H: 30, time: 3.2, noise: 3, loot: 'deepchest', extra: D.rollJack('stash', rnd), rare: 1, noEmpty: 1, deepChest: 1, room: c.r });
        L.deep.chest = { x: c.x, y: c.y, r: c.r };
        g = reach(L);
        let bs = null, bd = 1e9;
        for (const q of g.cells) { const md = Math.abs(q.x - c.x) + Math.abs(q.y - c.y); if (md >= 2 && md < bd && L.rows[q.y][q.x] === c.r) { bd = md; bs = q; } }
        if (bs) { L.deep.bossAt = L.zombies.length; L.zombies.push({ x: bs.x + .5, y: bs.y + .6, st: 'idle', kind: B.boss.kind, hp: B.boss.hp, dmg: B.boss.dmg }); }
      }
    }
    const ch = L.deep.chest, s = farthest(L, g, (x, y) => !ch || Math.abs(x - ch.x) + Math.abs(y - ch.y) >= 3) || farthest(L, g, () => true);
    const sp = s ? { x: s.x, y: s.y, r: s.r } : { x: Math.floor(L.start.x), y: L.streetY, r: street };
    L.deep.stair = sp;
    return L;
  }
  // walkable tiles from the start, from the layout alone (walls, voids, unopened secret doors and solid furniture block)
  function reach(L) {
    const R = L.rows, W = R[0].length, Hh = R.length, occ = new Uint8Array(W * Hh);
    for (const fd of L.furn) { if (fd.solid === 0 || fd.wall) continue; const [x0, y0, w, h] = fd.at; for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (x >= 0 && y >= 0 && x < W && y < Hh) occ[y * W + x] = 1; }
    const pass = (x, y) => x >= 0 && y >= 0 && x < W && y < Hh && !'# ='.includes(R[y][x]) && !occ[y * W + x];
    const dist = new Int32Array(W * Hh).fill(-1), q = [], sx = Math.floor(L.start.x), sy = Math.floor(L.start.y);
    if (pass(sx, sy)) { dist[sy * W + sx] = 0; q.push([sx, sy]); }
    for (let i = 0; i < q.length; i++) { const [x, y] = q[i]; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (pass(nx, ny) && dist[ny * W + nx] < 0) { dist[ny * W + nx] = dist[y * W + x] + 1; q.push([nx, ny]); } } }
    const cells = [], street = L.street || 'o';
    for (const [x, y] of q) {
      const c = R[y][x], Rm = L.rooms[c];
      if (c === '+' || c === street || !Rm || Rm.hidden || Rm.isolated || y >= L.streetY) continue;
      let nb = 0, door = false; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { if (pass(x + dx, y + dy)) nb++; if ((R[y + dy] || '')[x + dx] === '+') door = true; }
      if (nb >= 2 && !door) cells.push({ x, y, r: c, d: dist[y * W + x] });
    }
    return { pass, cells };
  }
  function farthest(L, g, ok) { let b = null; for (const c of g.cells) if (ok(c.x, c.y) && (!b || c.d > b.d || (c.d === b.d && (c.y < b.y || (c.y === b.y && c.x < b.x))))) b = c; return b; }
  DP.floorLayout = (b, seed, f) => floorLayout({ b, seed, id: 'x', mods: rollMods(seed, DP.B[b].types.length) }, f);   // dev / tests

  // ---------------------------------------------------------------- starting, resuming
  let L = null, cardOn = false, ownT = 0, hpT = 0, lastChip = '', bossZ = null, pendingNext = false, chest = null, init = false, flick = 0;
  DP.start = function (b) {
    if (DM.scene || run()) return false;
    const d = credit(); if (d.passes < 1 || !DP.B[b]) return false;
    const s = S(); if (s.hp < 15) { toast('Too hurt to go in. Eat or patch up first.', 2.2); return false; }
    d.passes--;   // (when full, the mark already sits at today's total: the next pass starts counting now)
    const seed = D.hashStr(SV().seedBase + ':deep:' + (d.seq = (d.seq || 0) + 1));
    d.run = { id: d.seq, b, seed, f: 1, mods: rollMods(seed, DP.B[b].types.length), phase: 'floor', own: counts(s), hands0: s.hands ? s.hands.k : null,
      haul: [], cos: [], snap: null, hp: s.hp, downed: 0, bossDead: 0, clr: {}, kills: 0, searched: 0, secrets: 0, xp0: +s.xp || 0, t0: Date.now() };
    d.stats.runs++; SV().stats.runs++;
    GM().save();
    intro();
    return true;
  };
  function intro() { // the event card before floor 1
    const r = run(), B = DP.B[r.b], m = DP.MODS[modOf(r, 1)];
    GM().hideMenu();
    $('#cardBody').innerHTML = `<div class="deepintro" style="--dc:${B.col}"><div class="kick">Deep run · ${esc(B.kind)}</div><h2>${esc(B.n)}</h2>
      <p>${esc(B.blurb)}</p>
      <div class="dfloors">${B.floorN.map((x, i) => `<span${i === B.floorN.length - 1 ? ' class="boss"' : ''}><b>${i + 1}</b>${esc(x)}</span>`).join('')}</div>
      <div class="drules"><div><b>Floor 1</b> ${esc(m.n)} - ${esc(m.d)}</div><div><b>Stairwell</b> Find it in the far end of each floor: go deeper or get out.</div><div><b>Loot</b> Only yours if you get out. Go down and it's all gone - your own gear stays.</div><div><b>Floor ${B.floorN.length}</b> ${esc(B.boss.name)} guards a supply chest.</div></div>
      <div class="btnrow"><button id="dGo">Go in</button></div></div>`;
    $('#card').classList.add('on');
    $('#dGo').onclick = () => { SFX.init(); SFX.play('ui'); $('#card').classList.remove('on'); startFloor(); };
  }
  function startFloor(resume) {
    const r = run(); if (!r) return;
    const B = DP.B[r.b], n = N(r), mod = modOf(r, r.f);
    L = floorLayout(r, r.f);
    hookGame();
    cardOn = false; ownT = 0; hpT = 0; lastChip = ''; bossZ = null; chest = null; init = false;
    const s = S(); if (r.hp != null) s.hp = Math.max(1, Math.min(r.hp, D.maxHp(s)));
    GM().hideMenu(); document.body.classList.add('deeprun');
    const O = {
      hint: resume ? `Still inside ${B.n} - floor ${r.f} of ${n}` : `${B.n} · ${B.floorN[r.f - 1]}`,
      resume: r.snap || null, noRaid: true, noBoss: true, noExit: true, noiseMul: mod === 'gas' ? GAS : 0,
      onState: x => { const rr = run(); if (rr) { rr.snap = x; GM().save(); } },
      acts, tick, drawUnder, drawOver, onDown, onExit,
    };
    H().start(L, DM.Crew ? DM.Crew.wrap(O, 'house') : O);
    const g = H().G;
    chest = g.furn.find(f => f.deepChest) || null;
    if (L.deep.bossAt != null) {
      const z = g.zs[L.deep.bossAt];
      if (r.bossDead) { g.zs.splice(L.deep.bossAt, 1); }
      else if (z) {
        Object.assign(z, { special: 1, boss: 1, deepBoss: 1, kind: B.boss.kind, hp: B.boss.hp, maxHp: B.boss.hp, dmgMul: B.boss.dmg, scale: 1.3, name: B.boss.name });
        if (B.boss.armor) z.armor = z.armor0 = B.boss.armor;
        if (B.boss.kind === 'bloater') z.hw = 18;
        z.groanT = 1; bossZ = z;
      }
    }
    if (chest && !r.bossDead) chest.lootable = false;   // opens once the boss is down
    g.banners.push({ text: `FLOOR ${r.f} OF ${n}`, sub: (r.f === n ? 'boss floor · ' : '') + DP.MODS[mod].n, t: 0 });
    if (r.phase === 'choice') setTimeout(() => showChoice(r.choiceMode || 'stairs'), 400);
  }
  // the first app start after a close with a run going: straight back in (see RESUME at the top)
  DP.boot = function () {
    const r = run(); if (!r) return false;
    if (r.downed) { applyDown(); GM().save(); setTimeout(() => toast('You went down in there - everything you found is gone', 3), 600); return false; }
    startFloor(true);
    return true;
  };

  // ---------------------------------------------------------------- the run's hooks into house.js
  function hookGame() { // cosmetics and fit/learn while a deep floor is running (wrapped once, pass-through otherwise)
    const g = GM(); if (g.__deep) return; g.__deep = 1;
    const cos = g.unlockCos, use = g.applyUse;
    DP._unlock = cos;
    g.unlockCos = function (k) {
      const r = run(); if (!r || !DM.scene || !DM.House.G || DM.House.G.over) return cos.apply(this, arguments);
      const it = D.ITEMS[k], key = it && it.cos ? k : D.COS[k] ? 'cos_' + k : k;
      r.cos.push(key); GM().save(); toast(`${D.ITEMS[key] ? D.ITEMS[key].n : 'A cosmetic'} - yours if you get out`, 2.2); SFX.play('pick');
      return true;
    };
    g.applyUse = function (k) {
      const r = run(); if (r && DM.scene && (found(r)[k] || 0) > 0) { toast("Found in here - it's yours once you get out", 2); return null; }
      return use.apply(this, arguments);
    };
  }
  let stO = null;   // the stairwell as house.js sees an interactable (pixel box + tile footprint, like furniture: tap-to-walk works)
  const stObj = s => stO && stO.s === s ? stO : (stO = { s, x: s.x * T, y: s.y * T, w: T, h: T, H: 4, tx: s.x, ty: s.y, tw: 1, th: 1, room: s.r });
  function acts(out, g) {
    const r = run(); if (!r || !L || cardOn) return;
    const s = L.deep.stair, p = g.p, last = r.f === N(r);
    if (Math.hypot(p.x - (s.x + .5) * T, p.y - (s.y + .6) * T) < 1.15 * T)
      out.push({ obj: stObj(s), act: 'Take', name: last ? 'the fire exit' : 'the stairs', rect: { x: s.x * T + 8, y: s.y * T + 8, w: T - 16, h: T - 16 }, dur: .45, noise: .5, verb: 'heading for', done: () => showChoice('stairs') });
  }
  function tick(dt, g) {
    const r = run(); if (!r || !L || g.over) return;
    if (!init) { init = true; if (modOf(r, r.f) === 'quiet') for (const z of g.zs) if (!z.dead && !z.boss && z.st === 'idle') { z.st = 'sleep'; z.rot = -Math.PI / 2; } }
    if (g.p.st === 'down' && !r.downed) { r.downed = 1; r.hp = 0; GM().save(); }   // closing the app now still counts as down
    if ((ownT -= dt) <= 0) { ownT = .5; if (trackOwn(r)) GM().save(); }
    if ((hpT -= dt) <= 0) { hpT = 1; const hp = Math.round(g.p.hp); if (hp !== Math.round(r.hp)) { r.hp = hp; GM().save(); } }
    if (bossZ && bossZ.dead && !r.bossDead) {
      r.bossDead = 1; if (chest) { chest.lootable = true; chest._key = null; }
      const xp = 40; SK().addXP(xp); g.nums.push({ x: bossZ.x, y: bossZ.y - 130, v: '+' + xp + ' xp', t: 0, col: P.GRN, small: 1 });
      g.banners.push({ text: DP.B[r.b].boss.name.toUpperCase() + ' IS DOWN', sub: 'the supply chest is yours', t: 0 }); SFX.play('kill'); GM().save();
    }
    // floor 1: stepping off the stoop = leaving the building
    if (r.f === 1 && !cardOn && g.entered && g.p.y > (L.streetY + 1.35) * T && Math.abs(g.p.x - L.stoop.x * T) < 2.6 * T) showChoice('door');
    chip(r, g);
  }
  function chip(r, g) {
    const B = DP.B[r.b], n = N(r), m = DP.MODS[modOf(r, r.f)];
    const bz = bossZ && !bossZ.dead && L.deep.chest && g.visited[L.deep.chest.r] ? bossZ : null;   // the boss bar once its room has been seen
    const k = r.f + '|' + (bz ? Math.ceil(bz.hp) : '') + '|' + r.bossDead;
    if (k === lastChip) return; lastChip = k;
    $('#deepchip').innerHTML = `<b>FLOOR ${r.f}/${n}</b><span>${esc(m.n)}</span>${bz ? `<i class="bbar sm"><i style="width:${Math.max(0, bz.hp / bz.maxHp * 100)}%"></i></i><em>${esc(B.boss.name)}</em>` : ''}`;
    $('#deepchip').style.setProperty('--dc', B.col);
  }
  // the stairwell (a hole with steps going down) and its green EXIT glow; drawn on the floor, so fog hides it until found
  function drawUnder(c, g) {
    if (!L || !L.deep) return;
    const s = L.deep.stair, x = s.x * T, y = s.y * T, t = g.t;
    const gl = c.createRadialGradient(x + T / 2, y + T / 2, 4, x + T / 2, y + T / 2, T * 1.9);
    gl.addColorStop(0, `rgba(120,230,140,${.22 + .08 * Math.sin(t * 3)})`); gl.addColorStop(1, 'rgba(120,230,140,0)');
    c.fillStyle = gl; c.fillRect(x - T * 1.5, y - T * 1.5, T * 4, T * 4);
    ART.rr(c, x + 3, y + 3, T - 6, T - 6, 6); c.fillStyle = '#07060f'; c.fill();
    for (let i = 0; i < 5; i++) { const k = i / 5; c.fillStyle = `rgb(${Math.round(74 - 50 * k)},${Math.round(70 - 48 * k)},${Math.round(98 - 64 * k)})`; c.fillRect(x + 7 + i * 1.5, y + 7 + i * 6.4, T - 14 - i * 3, 4.4); }
    ART.rr(c, x + 3, y + 3, T - 6, T - 6, 6); c.lineWidth = 3; c.strokeStyle = P.INK; c.stroke();
    // little EXIT sign on the back edge
    ART.rr(c, x + T / 2 - 13, y - 6, 26, 11, 3); c.fillStyle = '#163a22'; c.fill(); c.lineWidth = 2; c.stroke();
    c.fillStyle = `rgba(150,255,170,${.75 + .25 * Math.sin(t * 3)})`; c.font = '900 8px system-ui,sans-serif'; c.textAlign = 'center'; c.fillText('EXIT', x + T / 2, y + 2.4);
  }
  function drawOver(c, g) {
    const r = run(); if (!r || !L) return;
    const mod = modOf(r, r.f), p = g.p;
    if (mod === 'dark') { // flashlight: a pool around her, everything else near black (a flicker now and then)
      flick = Math.max(0, flick - 1 / 60); if (Math.random() < .004) flick = .25;
      const r0 = 1.9 * T * (flick > 0 ? .8 : 1), r1 = 4.3 * T, cx = p.x + p.fx * T * .6, cy = p.y - 26 + p.fy * T * .5;
      const gr = c.createRadialGradient(cx, cy, r0, cx, cy, r1); gr.addColorStop(0, 'rgba(5,4,14,0)'); gr.addColorStop(1, 'rgba(5,4,14,.93)');
      c.fillStyle = gr; c.fillRect(p.x - 40 * T, p.y - 40 * T, 80 * T, 80 * T);
    } else if (mod === 'gas') { c.fillStyle = `rgba(140,190,70,${.06 + .02 * Math.sin(g.t * .8)})`; c.fillRect(p.x - 40 * T, p.y - 40 * T, 80 * T, 80 * T); }
  }

  // ---------------------------------------------------------------- the stairwell choice
  function showChoice(mode) {
    const r = run(); if (!r || cardOn) return;
    const g = H().G; if (!g || g.over) return;
    cardOn = true; H().pause(true);
    r.phase = 'choice'; r.choiceMode = mode;
    const B = DP.B[r.b], n = N(r), last = r.f === n, nx = !last && mode === 'stairs' ? DP.MODS[modOf(r, r.f + 1)] : null;
    let xp = 0;
    if (mode === 'stairs' && !r.clr[r.f]) { r.clr[r.f] = 1; xp = 8 * r.f; SK().addXP(xp); }   // reaching each stairwell teaches (more deeper)
    GM().save();
    const loot = runLoot(r), s = S(), f = s.food || { h: 0, t: 0 };
    $('#cardBody').innerHTML = `<div class="deepchoice" style="--dc:${B.col}">
      <div class="kick">${esc(B.n)} · floor ${r.f} of ${n}${xp ? ` · <b>+${xp} xp</b>` : ''}</div>
      <h2>${mode === 'door' ? 'Leave the building?' : last ? 'The fire exit' : 'The stairwell'}</h2>
      ${nx ? `<div class="dnext"><b>Floor ${r.f + 1}${r.f + 1 === n ? ' (boss)' : ''}</b> · ${esc(B.floorN[r.f])} · <em>${esc(nx.n)}</em><span>${esc(nx.d)} More zombies, more specials, better loot.</span></div>` : ''}
      <div class="dstat">HP <b>${Math.ceil(g.p.hp)}</b>/${D.maxHp(s)} · hunger <b>${Math.round(f.h)}</b> · thirst <b>${Math.round(f.t)}</b></div>
      <div class="kick sect">Run loot · ${loot.reduce((a, e) => a + e.n, 0)} thing${loot.length === 1 && loot[0].n === 1 ? '' : 's'}</div>
      <div class="sum">${loot.length ? loot.map(e => `<div class="sum-item${D.ITEMS[e.k].rare ? ' rare' : ''}">${icon(e.k)}<span>${esc(D.ITEMS[e.k].n)}</span>${e.n > 1 ? `<b>x${e.n}</b>` : ''}</div>`).join('') : '<div class="empty">Nothing yet.</div>'}</div>
      ${nx ? '<p class="dwarn">Go down in there and you lose all of it. Your own gear stays.</p>' : ''}
      <div class="btnrow">${nx ? '<button id="dOut" class="ghost">Get out</button><button id="dDeep">Go deeper</button>' : '<button id="dOut">Get out</button>'}</div>
      <button class="dnot" id="dNot">${mode === 'door' ? 'Go back in' : 'Not yet - keep looting this floor'}</button></div>`;
    $('#card').classList.add('on');
    const close = () => { $('#card').classList.remove('on'); cardOn = false; const rr = run(); if (rr) { rr.phase = 'floor'; GM().save(); } H().pause(false); };
    $('#dNot').onclick = () => { SFX.play('ui'); close(); if (mode === 'door') { g.p.y = (L.streetY + .3) * T; g.p.vy = 0; } };
    $('#dOut').onclick = () => { SFX.play('ui'); extract(); };
    if (nx) $('#dDeep').onclick = () => { SFX.play('ui'); deeper(); };
  }
  function floorDone(r, g) { r.kills += g.stats.kills; r.searched += g.furn.filter(f => f.lootable && f.searched).length; r.secrets += g.sec.filter(x => x.found).length; }
  function deeper() {
    const r = run(), g = H().G; if (!r || !g) return;
    floorDone(r, g); trackOwn(r);
    const f = found(r), bag = [];
    for (const k in f) if (!KEEP[D.cat(k)]) takePack(k, f[k], bag);   // the rest is carried for the way out
    merge(r.haul, bag);
    r.f++; r.phase = 'floor'; r.snap = null; r.hp = Math.round(g.p.hp); r.choiceMode = null;
    GM().save();
    if (bag.length) toast(`Bagged ${bag.reduce((a, e) => a + e.n, 0)} thing${bag.length > 1 || bag[0].n > 1 ? 's' : ''} for the way out`, 2);
    $('#card').classList.remove('on'); cardOn = false;
    pendingNext = true; H().exit('leave');
  }
  function endRun(kind) { // clear the run and keep a line for the home card
    const d = st(), r = d.run;
    d.last = { b: r.b, kind, f: r.f, n: N(r), at: Date.now(), items: 0 };
    if (kind === 'out') { d.stats.out++; d.stats.deepest = Math.max(d.stats.deepest || 0, r.f); } else d.stats.downs++;
    d.run = null;
    return d.last;
  }
  function extract() {
    const r = run(), g = H().G; if (!r || !g) return;
    floorDone(r, g); trackOwn(r);
    const f = found(r), moved = [];
    for (const k in f) takePack(k, f[k], moved);   // a found weapon in her hands stays there - it's hers now
    const items = merge(merge([], r.haul), moved), cos = r.cos.slice();
    const n = N(r), cleared = r.f - (r.clr[r.f] ? 0 : 1), xp = 6 * Math.max(0, cleared) + (r.f === n && r.bossDead ? 20 : 0);
    if (xp) SK().addXP(xp);
    const left = bank(items), last = endRun('out'); last.items = items.reduce((a, e) => a + e.n, 0) + cos.length;
    const s = S(), gained = Math.round((+s.xp || 0) - r.xp0), secs = Math.round((Date.now() - r.t0) / 1000), B = DP.B[r.b];
    pendingCos = cos;
    GM().save();
    $('#cardBody').innerHTML = `<div class="deepend" style="--dc:${B.col}"><div class="kick">Deep run · you got out</div><h2>Out of ${esc(B.n)}</h2>
      <div class="stats"><div><b>${r.f}/${n}</b>floors</div><div><b>${r.kills}</b>zombies</div><div><b>${r.searched}</b>searched</div><div><b>+${gained}</b>xp</div></div>
      ${r.bossDead ? `<div class="found">${esc(B.boss.name)} is down.</div>` : ''}
      <div class="kick sect">Into your stash</div>
      <div class="sum">${items.length || cos.length ? items.concat(cos.map(k => ({ k, n: 1 }))).map(e => `<div class="sum-item${D.ITEMS[e.k].rare ? ' rare' : ''}">${icon(e.k)}<span>${esc(D.ITEMS[e.k].n)}</span>${e.n > 1 ? `<b>x${e.n}</b>` : ''}</div>`).join('') : '<div class="empty">Nothing this time.</div>'}</div>
      ${left.length ? `<div class="lost">No room for ${left.reduce((a, e) => a + e.n, 0)} - it waits on the Deep run card at home.</div>` : ''}
      <div class="dtime">${Math.floor(secs / 60)} min inside</div>
      <div class="btnrow"><button id="dHome">Head home</button></div></div>`;
    $('#card').classList.add('on'); cardOn = true;
    $('#dHome').onclick = () => { $('#card').classList.remove('on'); cardOn = false; H().exit('leave'); };
  }
  let pendingCos = [];
  function applyDown() { // everything the run gave her goes; her own gear stays. Returns what was lost.
    const r = run(); if (!r) return [];
    const s = S(), f = found(r), lost = merge([], r.haul);
    for (const k in f) { const left = takePack(k, f[k], lost); if (left > 0 && s.hands && s.hands.k === k) { lost.push({ k, n: 1, d: s.hands.d }); s.hands = null; } }
    if (!s.hands && r.hands0) { const i = s.pack.findIndex(e => e.k === r.hands0); if (i >= 0) { const e = s.pack.splice(i, 1)[0]; s.hands = { k: e.k, d: e.d == null ? D.WEAPONS[D.ITEMS[e.k].w].dur : e.d }; } }
    for (const k of r.cos) lost.push({ k, n: 1 });
    s.hp = 20;   // as a normal down (house.js finishRun)
    const last = endRun('down'); last.items = lost.reduce((a, e) => a + e.n, 0);
    return merge([], lost);
  }
  function onDown() {
    const r = run(), g = H().G; if (!r) { H().exit('down'); return; }
    floorDone(r, g);
    const B = DP.B[r.b], f = r.f, n = N(r), lost = applyDown();
    GM().save();
    $('#cardBody').innerHTML = `<div class="deepend down" style="--dc:${B.col}"><div class="kick red">Downed · ${esc(B.n)} · floor ${f} of ${n}</div><h2>Dragged out</h2>
      <p>Your crew hauled you down the stairwell and out. Everything you found in there is gone. Your own gear made it.</p>
      <div class="sum">${lost.length ? lost.map(e => `<div class="sum-item lostit">${icon(e.k)}<span>${esc(D.ITEMS[e.k].n)}</span>${e.n > 1 ? `<b>x${e.n}</b>` : ''}</div>`).join('') : '<div class="empty">You had not found anything yet.</div>'}</div>
      <div class="btnrow"><button id="dHome">Head home</button></div></div>`;
    $('#card').classList.add('on'); cardOn = true;
    $('#dHome').onclick = () => { $('#card').classList.remove('on'); cardOn = false; H().exit('down'); };
  }
  function onExit(res) {
    document.body.classList.remove('deeprun'); $('#deepchip').innerHTML = '';
    if (pendingNext && run()) { pendingNext = false; SV().stats.kills += res.kills; GM().save(); setTimeout(() => startFloor(), 60); return; }
    pendingNext = false; L = null; cardOn = false;
    const cos = pendingCos; pendingCos = [];
    GM().afterRun(res);
    for (const k of cos) (DP._unlock || GM().unlockCos)(k);
  }

  // ---------------------------------------------------------------- home card + sheets
  DP.cardHTML = function () {
    const d = credit(), nx = DP.toNext(), held = d.held.reduce((a, e) => a + e.n, 0);
    const pct = nx == null ? 100 : (1 - nx / DP.STEPS) * 100, last = d.last, LB = last && DP.B[last.b];
    const line = `${nx == null ? 'Passes full - spend one to keep earning' : `Next pass in ${fmt(nx)} steps`} · ${d.passes ? `<b>${d.passes} pass${d.passes > 1 ? 'es' : ''} ready</b>` : 'no pass yet'}`;
    return `<div class="deepcard${d.passes ? ' ready' : ''}"><div class="hhead"><span class="kick">Deep run</span><span class="hwhen">${d.passes}/${DP.MAX} passes · 1 per ${fmt(DP.STEPS)} steps</span></div>
      <div class="dpips">${[0, 1].map(i => `<i class="${i < d.passes ? 'on' : ''}"></i>`).join('')}<div class="bbar sm dpbar"><i style="width:${pct}%"></i></div></div>
      <div class="dline">${line}</div>
      ${last && LB ? `<div class="dlast">Last: ${last.kind === 'out' ? `got out of ${esc(LB.n)} at floor ${last.f}/${last.n} with ${last.items} thing${last.items === 1 ? '' : 's'}` : `went down on floor ${last.f}/${last.n} of ${esc(LB.n)}`}</div>` : ''}
      ${held ? `<div class="dheld">${held} thing${held > 1 ? 's' : ''} from your last run waiting - make room in your stash<button class="mbtn sm" data-deep="claim">Claim</button></div>` : ''}
      <div class="hbtnrow">${d.run ? `<button class="mbtn sm" data-deep="resume">Back in · floor ${d.run.f}</button>` : d.passes ? '<button class="mbtn sm" data-deep="go">Go deep</button>' : '<span class="hdone">Walk any days - steps add up</span>'}<button class="mbtn sm ghost" data-deep="info">How it works</button></div></div>`;
  };
  DP.bind = function (root) {
    (root || document).querySelectorAll('[data-deep]').forEach(b => b.onclick = () => {
      SFX.play('ui'); const a = b.dataset.deep;
      if (a === 'resume') { if (!DP.boot()) GM().renderHome(); }   // safety net: normally boot() already put her back in
      else if (a === 'go') pickSheet(); else if (a === 'info') infoSheet();
      else if (a === 'claim') { const left = DP.claim(); toast(left.length ? `Still no room for ${left.reduce((x, e) => x + e.n, 0)}` : 'Moved to your stash', 1.8); GM().renderHome(); }
    });
  };
  const sheet = html => { const el = $('#msheet'); el.innerHTML = `<div class="mcard deepsheet">${html}</div>`; el.classList.add('on'); el.onclick = e => { if (e.target === el) closeSheet(); }; };
  const closeSheet = () => { const el = $('#msheet'); el.classList.remove('on'); el.innerHTML = ''; };
  function pickSheet() {
    const d = credit();
    sheet(`<div class="kick">Deep run · ${d.passes} pass${d.passes === 1 ? '' : 'es'}</div><h3>Pick a building</h3>
      <p class="mp">Floor after floor, each worse than the last - and better stocked. What you find only counts if you get out.</p>
      ${DP.ORDER.map(k => { const B = DP.B[k]; return `<button class="pick dpick" data-b="${k}" style="--dc:${B.col}"><b>${esc(B.n)}</b><span>${esc(B.kind)} · ${B.types.length} floors · mostly ${esc(B.lean)} · boss: ${esc(B.boss.name)}</span></button>`; }).join('')}
      <button class="mbtn ghost" id="dpClose">Not now</button>`);
    $('#dpClose').onclick = closeSheet;
    document.querySelectorAll('.dpick').forEach(b => b.onclick = () => { SFX.play('ui'); confirmSheet(b.dataset.b); });
  }
  function confirmSheet(k) {
    const B = DP.B[k], s = S(), f = s.food || { h: 100, t: 100 }, warn = s.hp < 50 || f.h < 30 || f.t < 30;
    sheet(`<div class="kick" style="color:${B.col}">${esc(B.kind)} · ${B.types.length} floors</div><h3>${esc(B.n)}</h3><p class="mp">${esc(B.blurb)}</p>
      <div class="evrow"><b>Floors</b><span>${B.floorN.map(esc).join(' → ')}</span></div>
      <div class="evrow"><b>Twists</b><span>Every floor has one: power's out, a nest, a gas leak, looted, or quiet.</span></div>
      <div class="evrow"><b>Carry</b><span>HP, hunger, thirst, your pack, quiver and keyring go with you floor to floor. No healing in between.</span></div>
      <div class="evrow"><b>Risk</b><span>Go down and everything you found in there is lost. Your own gear stays.</span></div>
      ${warn ? `<p class="dwarn">You're going in with HP ${Math.ceil(s.hp)}, hunger ${Math.round(f.h)}, thirst ${Math.round(f.t)}. Eat and patch up first?</p>` : ''}
      <div class="btnrow"><button class="mbtn ghost" id="dpBack">Back</button><button class="mbtn" id="dpGo">Spend a pass</button></div>`);
    $('#dpBack').onclick = () => { SFX.play('ui'); pickSheet(); };
    $('#dpGo').onclick = () => { SFX.init(); SFX.play('ui'); closeSheet(); DP.start(k); };
  }
  function infoSheet() {
    const d = credit();
    sheet(`<div class="kick">Deep run</div><h3>How it works</h3>
      <div class="evrow"><b>Passes</b><span>Every ${fmt(DP.STEPS)} steps you walk earns a pass - any days, it all adds up. Hold ${DP.MAX} at most.</span></div>
      <div class="evrow"><b>The run</b><span>Pick a building. Each floor is bigger trouble: more zombies, more special infected, better loot (blueprints, cosmetics, pack upgrades).</span></div>
      <div class="evrow"><b>Stairwell</b><span>At the far end of each floor. Go deeper, or get out with what you have.</span></div>
      <div class="evrow"><b>Loot</b><span>Held for the run. Get out: it all goes to your stash. Go down: it's all gone (your own gear stays).</span></div>
      <div class="evrow"><b>Last floor</b><span>A boss guards a big supply chest.</span></div>
      <div class="evrow"><b>Closing</b><span>Close the app mid-run and you pick up on the same floor next time.</span></div>
      <div class="evrow"><b>So far</b><span>${d.stats.runs} run${d.stats.runs === 1 ? '' : 's'} · got out ${d.stats.out} · down ${d.stats.downs}${d.stats.deepest ? ` · deepest floor ${d.stats.deepest}` : ''}</span></div>
      <button class="mbtn ghost" id="dpClose">Close</button>`);
    $('#dpClose').onclick = closeSheet;
  }

  // ---------------------------------------------------------------- dev / tests
  DP.dev = {
    passes(n) { const d = st(); d.passes = Math.max(0, Math.min(DP.MAX, n)); d.mark = SV().walked || 0; GM().save(); },
    stair() { const g = H().G, s = L.deep.stair; g.p.x = (s.x + .5) * T; g.p.y = (s.y + .6) * T; g.p.vx = g.p.vy = 0; },
    choice: m => showChoice(m || 'stairs'), deeper, extract, layout: () => L, boss: () => bossZ, chest: () => chest, run,
  };
})();
