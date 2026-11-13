/* Dead Miles - one-house prototype. Plain JS, canvas, no build step. */
'use strict';
(() => {
  const P = ART.P;
  const T = 44, WH = 60, WT = 16;           // tile, wall height, wall thickness
  const PSCALE = 0.37, ZSCALE = 0.40;       // sprite scale (css px per svg unit)

  // ---------------------------------------------------------------- map
  const r = (s, n) => s.repeat(n);
  // attic crawlspace: a separate pocket off to the side of the house, reached only by ladder
  const ATTIC = { 11: '######', 12: '#aaaa#', 13: '#aaaa#', 14: '#aaaa#', 15: '#aaaa#', 16: '######' };
  const ROWS = [
    r(' ', 24),
    ' ' + r('#', 22) + ' ',
    ...Array(7).fill(' #' + r('k', 20) + '# '),
    ' ' + r('#', 19) + 'K## ',
    ' #ssss#bbbbbb#cccc#hhh# ',
    ' #ssss#bbbbbb#cccc#hhh# ',
    ' #ssss#bbbbbb#ccccChhh# ',
    ' #ssss#bbbbbb#cccc#hhh# ',
    ' ##X#####B#########hhh# ',
    ' #' + r('r', 16) + '#hhh# ',
    ' #' + r('r', 16) + '#hhh# ',
    ' #' + r('r', 16) + 'Rhhh# ',
    ' #' + r('r', 16) + '#hhh# ',
    ' #' + r('r', 16) + '#hhh# ',
    ' ' + r('#', 18) + 'hhh# ',
    ' #' + r('l', 16) + '#hhh# ',
    ' #' + r('l', 16) + '#hhh# ',
    ' #' + r('l', 16) + 'Lhhh# ',
    ' #' + r('l', 16) + '#hhh# ',
    ' #' + r('l', 16) + '#hhh# ',
    ' #' + r('l', 16) + '#hhh# ',
    ' ' + r('#', 19) + 'F## ',
    r('o', 24),
    r('o', 24),
  ].map((row, y) => row + (y >= 28 ? r('o', 6) : ATTIC[y] || r(' ', 6)));
  const MW = 30, MH = ROWS.length;
  ROWS.forEach((row, i) => { if (row.length !== MW) console.error('map row', i, 'has length', row.length); });
  const ROOMCH = { k: 'k', b: 'b', c: 'c', s: 's', r: 'r', l: 'l', h: 'h', o: 'o', a: 'a', K: 'k', C: 'c', R: 'r', L: 'l', B: 'b', F: 'h', X: 's' };
  const ROOMNAME = { k: 'Kitchen', b: 'Bathroom', c: 'Utility closet', s: 'Hidden room', r: 'Bedroom', l: 'Living room', h: 'Hallway', o: 'Stoop', a: 'Attic' };
  const ch = (x, y) => (x < 0 || y < 0 || x >= MW || y >= MH) ? ' ' : ROWS[y][x];
  const isVoid = (x, y) => ch(x, y) === ' ';
  const isWall = (x, y) => { const c = ch(x, y); return c === '#' || (c === 'X' && !G.secretOpen); };
  const isDoor = (x, y) => { const c = ch(x, y); return 'KCRLBF'.includes(c) || (c === 'X' && G.secretOpen); };
  const roomAt = (x, y) => { const c = ch(x, y); if (c === '#' || c === ' ' || (c === 'X' && !G.secretOpen)) return null; return ROOMCH[c] || null; };

  // ---------------------------------------------------------------- items + loot
  const ITEMS = {
    beans: { n: 'Canned beans', i: 'beans', use: 'Eat', hp: 8 },
    water: { n: 'Water bottle', i: 'water', use: 'Drink', sta: 50 },
    snack: { n: 'Chips', i: 'snack', use: 'Eat', hp: 5 },
    drink: { n: 'Soda', i: 'drink', use: 'Drink', sta: 35 },
    bandage: { n: 'Bandage', i: 'bandage', use: 'Use', hp: 25 },
    meds: { n: 'Painkillers', i: 'meds', use: 'Take', hp: 40 },
    wrench: { n: 'Rusty wrench', i: 'wrench' },
    scrap: { n: 'Scrap metal', i: 'scrap' },
    knife: { n: 'Kitchen knife', i: 'gear' },
    ammo: { n: '9mm rounds', i: 'ammo', rare: 1 },
    key: { n: 'Brass key', i: 'key', rare: 1 },
    cloth: { n: 'Cloth rags', i: 'cloth' },
    battery: { n: 'Batteries', i: 'battery' },
    tape: { n: 'Duct tape', i: 'tape' },
    book: { n: 'Paperback', i: 'book' },
    note: { n: 'Torn note', i: 'note', use: 'Read' },
    pole: { n: 'Hook pole', i: 'hook' },
    watch: { n: 'Pocket watch', i: 'watch', rare: 1 },
    jewelry: { n: 'Gold ring', i: 'ring', rare: 1 },
  };
  // how many fit in one pack slot (anything not listed does not stack)
  const STACK = { water: 3, beans: 3, snack: 3, drink: 3, bandage: 5, meds: 5, ammo: 30, scrap: 10, cloth: 5, tape: 3, battery: 4 };
  const stackMax = k => STACK[k] || 1;
  // merge rolled item keys into container stacks; ammo comes in loose handfuls of 4-12
  function toStacks(keys) {
    const out = [];
    for (const k of keys) {
      const n = k === 'ammo' ? 4 + Math.floor(Math.random() * 9) : 1;
      const e = out.find(e => e.k === k && STACK[k]);
      if (e) e.n += n; else out.push({ k, n });
    }
    return out;
  }
  const LOOT = {
    fridge: [[2, 3], { drink: 3, water: 3, beans: 1, snack: 2 }],
    cabinet: [[1, 3], { beans: 3, snack: 2, water: 1 }],
    kdrawers: [[1, 2], { knife: 3, scrap: 1, battery: 2, tape: 1 }],
    pantry: [[2, 4], { beans: 4, snack: 3, water: 2 }],
    trash: [[0, 2], { scrap: 3, snack: 1 }],
    island: [[1, 2], { knife: 1, scrap: 2, tape: 1, battery: 1 }],
    vanity: [[1, 2], { cloth: 2, bandage: 2, meds: 1 }],
    medcab: [[2, 3], { meds: 3, bandage: 3 }],
    shelves: [[2, 3], { cloth: 2, tape: 2, battery: 2, scrap: 2 }],
    toolbox: [[2, 3], { wrench: 3, scrap: 3, tape: 2 }],
    crate: [[4, 5], { ammo: 5, meds: 3, bandage: 2, battery: 1, key: 1 }, ['ammo', 'meds']],
    books: [[1, 1], { book: 4, key: 1 }],
    night: [[1, 2], { meds: 2, battery: 2, key: 1, book: 1 }],
    wardrobe: [[1, 3], { cloth: 4, battery: 1 }],
    dresser: [[1, 3], { cloth: 3, battery: 1, ammo: 1, bandage: 1 }],
    desk: [[1, 2], { scrap: 2, battery: 2, key: 1, tape: 1, book: 1 }],
    tv: [[1, 2], { battery: 2, scrap: 2 }],
    coat: [[1, 2], { cloth: 3, snack: 1, key: 1 }],
    hall: [[1, 1], { key: 2, battery: 1 }],
    corpse: [[0, 1], { scrap: 1, ammo: 1, snack: 1, bandage: 1 }],
    cache: [[3, 4], { watch: 2, jewelry: 3, ammo: 3, meds: 2 }, ['jewelry', 'watch']],
    attic: [[3, 4], { watch: 2, jewelry: 2, ammo: 3, meds: 2, battery: 1 }, ['watch']],
  };
  function rollLoot(key) {
    const [[a, b], tab, guaranteed] = LOOT[key];
    const out = guaranteed ? guaranteed.slice() : [];
    let n = a + Math.floor(Math.random() * (b - a + 1)) - out.length;
    if (key === 'corpse' && Math.random() > .45) n = 0;
    const ks = Object.keys(tab), tot = ks.reduce((s, k) => s + tab[k], 0);
    for (let i = 0; i < n; i++) { let v = Math.random() * tot; for (const k of ks) { v -= tab[k]; if (v <= 0) { out.push(k); break; } } }
    return out;
  }

  // ---------------------------------------------------------------- scavenging skill (persists between runs)
  const SKEY = 'dm-next-skills';
  const XPCUM = L => L <= 1 ? 0 : Math.round(14 * Math.pow(L - 1, 1.75) + (L > 5 ? 30 * (L - 5) * (L - 5) : 0)); // xp needed to reach level L
  const PERKS = { 3: ['Quiet hands', 'Searches make 25% less noise'], 6: ['Keen eye', 'Hidden clues glow, rare loot sparkles'], 9: ['Pack rat', '+2 pack slots'] };
  const SK = { xp: 0 };
  try { const v = JSON.parse(localStorage.getItem(SKEY) || '{}'); if (v.scav && v.scav.xp >= 0) SK.xp = +v.scav.xp; } catch (e) { /* storage blocked */ }
  function saveSkills() { try { localStorage.setItem(SKEY, JSON.stringify({ scav: { xp: SK.xp } })); } catch (e) { /* ignore */ } }
  function scavLvl() { let L = 1; while (L < 10 && SK.xp >= XPCUM(L + 1)) L++; return L; }
  const NOTE_TEXT = '"Grandpa never trusted banks. Said the floor under supper was the safest place in Brooklyn."';
  const searchMul = () => 1.5 * (1 - .06 * (scavLvl() - 1));   // slow at first, faster with skill
  const extraChance = () => .04 * (scavLvl() - 1);
  const packSlots = () => scavLvl() >= 9 ? 14 : 12;
  function gainXP(n, x, y) {
    const before = scavLvl(); SK.xp += n; saveSkills();
    G.nums.push({ x: x + 16, y: y - 112, v: '+' + n + ' xp', t: 0, col: P.GRN, small: 1 });
    const after = scavLvl();
    if (after > before) levelUp(after);
  }

  // ---------------------------------------------------------------- furniture
  // at: [tx,ty,tw,th]; H: visual height; time: search secs; noise: radius in tiles
  const FDEF = [
    // kitchen
    { art: 'fridge', name: 'Fridge', at: [2, 2, 1, 1], H: 62, time: 2.4, noise: 5.5, loot: 'fridge' },
    { art: 'counter', name: 'Cabinets', at: [3, 2, 2, 1], H: 32, time: 1.8, noise: 2.5, loot: 'cabinet' },
    { art: 'stove', at: [5, 2, 1, 1], H: 32 },
    { art: 'sink', at: [6, 2, 2, 1], H: 32 },
    { art: 'drawers', name: 'Kitchen drawers', at: [8, 2, 1, 1], H: 32, time: 1.6, noise: 3.5, loot: 'kdrawers' },
    { art: 'pantry', name: 'Pantry', at: [10, 2, 2, 1], H: 62, time: 2.6, noise: 4.5, loot: 'pantry' },
    { art: 'trash', at: [13, 2, 1, 1], H: 26 },
    { art: 'hutch', at: [19, 2, 2, 1], H: 62 },
    { art: 'island', name: 'Island drawers', at: [4, 5, 3, 1], H: 32, time: 1.8, noise: 3, loot: 'island' },
    { art: 'table', at: [15, 4, 3, 2], H: 24, solid: 1, cloth: 1, items: 1 },
    { art: 'chair', at: [14, 4, 1, 1], H: 16, solid: 0 },
    { art: 'chair', at: [18, 4, 1, 1], H: 16, solid: 0 },
    { art: 'chair', at: [16, 3, 1, 1], H: 16, solid: 0 },
    // bathroom
    { art: 'toilet', at: [7, 10, 1, 1], H: 24 },
    { art: 'vanity', name: 'Vanity', at: [8, 10, 2, 1], H: 30, time: 1.6, noise: 2.5, loot: 'vanity' },
    { art: 'medcab', name: 'Medicine cabinet', at: [10, 9, 1, 1], H: 0, time: 1.5, noise: 2, loot: 'medcab', wall: 1, solid: 0 },
    { art: 'tub', at: [11, 10, 2, 2], H: 24, solid: 1 },
    // utility closet
    { art: 'shelves', name: 'Utility shelves', at: [14, 10, 2, 1], H: 58, time: 2.4, noise: 4, loot: 'shelves' },
    { art: 'toolbox', name: 'Toolbox', at: [17, 10, 1, 1], H: 20, time: 1.8, noise: 3.5, loot: 'toolbox' },
    { art: 'heater', at: [14, 13, 1, 1], H: 54, solid: 1 },
    // hidden room
    { art: 'supply', at: [2, 10, 2, 1], H: 56 },
    { art: 'crate', name: 'Hidden crate', at: [4, 10, 2, 1], H: 30, time: 3, noise: 4, loot: 'crate', rare: 1, secretLoot: 1 },
    // attic crawlspace
    { art: 'crate', name: 'Old trunk', at: [25, 12, 2, 1], H: 30, time: 2.6, noise: 3, loot: 'attic', rare: 1, secretLoot: 1 },
    { art: 'cot', at: [5, 11, 1, 2], H: 12, solid: 1 },
    // bedroom
    { id: 'secretShelf', art: 'bookshelf', name: 'Bookshelf', at: [3, 15, 2, 1], H: 62, secret: 1, seed: 2 },
    { art: 'bed', at: [6, 15, 2, 3], H: 18 },
    { art: 'nightstand', name: 'Nightstand', at: [8, 15, 1, 1], H: 24, time: 1.5, noise: 2, loot: 'night' },
    { art: 'wardrobe', name: 'Wardrobe', at: [12, 15, 2, 1], H: 64, time: 2.8, noise: 5, loot: 'wardrobe' },
    { art: 'dresser', name: 'Dresser', at: [14, 15, 3, 1], H: 34, time: 2.4, noise: 3.5, loot: 'dresser' },
    { art: 'desk', name: 'Desk', at: [15, 19, 2, 1], H: 30, time: 2, noise: 2.5, loot: 'desk' },
    { art: 'chair', at: [15, 18, 1, 1], H: 16, solid: 0 },
    // living room
    { id: 'sofa', art: 'sofa', at: [4, 21, 3, 1], H: 26 },
    { art: 'sidetable', at: [7, 21, 1, 1], H: 24 },
    { art: 'coffee', at: [4, 23, 3, 1], H: 16, solid: 1 },
    { art: 'tvstand', name: 'TV stand', at: [4, 26, 3, 1], H: 26, time: 1.8, noise: 2.5, loot: 'tv' },
    { art: 'armchair', at: [9, 22, 1, 1], H: 22, solid: 1 },
    { art: 'bookshelf', at: [13, 21, 2, 1], H: 62, seed: 5 },
    { art: 'plant', at: [16, 21, 1, 1], H: 20, solid: 1 },
    // hallway
    { art: 'coat', name: 'Coat closet', at: [21, 10, 1, 1], H: 64, time: 2.4, noise: 4.5, loot: 'coat' },
    { art: 'sidetable', name: 'Hall table', at: [21, 19, 1, 1], H: 24, time: 1.4, noise: 2, loot: 'hall' },
    { art: 'shoerack', at: [21, 26, 1, 1], H: 14, solid: 1 },
    // street
    { art: 'trash', name: 'Garbage bin', at: [15, 28, 1, 1], H: 26, time: 1.4, noise: 3, loot: 'trash' },
    { art: 'lamppost', at: [12, 28, 1, 1], H: 112, solid: 1 },
  ];

  // wall decorations on wall faces, keyed "x,y" of the wall cell
  const DECOR = {
    '3,1': 'upper', '4,1': 'upper', '6,1': 'upper', '7,1': 'upper', '8,1': 'upper', '12,1': 'clock',
    '15,1': 'window', '16,1': 'window', '17,1': 'window',
    '2,9': 'tally', '3,9': 'scrawl', '5,9': 'tally2',
    '8,9': 'mirror', '9,9': 'mirror', '15,9': 'hooks', '19,9': 'frame',
    '3,14': 'crack', '10,14': 'window', '11,14': 'window', '16,14': 'frame2',
    '5,20': 'painting', '6,20': 'painting', '10,20': 'window', '11,20': 'window', '16,20': 'clock',
    '4,27': 'fwin', '5,27': 'fwin', '10,27': 'fwin', '11,27': 'fwin', '15,27': 'fwin', '16,27': 'fwin', '19,27': 'num', '21,27': 'lamp',
  };

  // ---------------------------------------------------------------- state
  let G;
  const DEV = { dpr: 1, zoom: 1, W: 0, H: 0, fs: 1 };
  const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
  const $ = s => document.querySelector(s);

  function newGame() {
    G = {
      t: 0, secretOpen: false, paused: false, over: false, hitstop: 0, shake: 0, redFlash: 0,
      p: {
        x: 20.5 * T, y: 28.6 * T, vx: 0, vy: 0, fx: 0, fy: -1, flip: false, hw: 13, hh: 9,
        hp: 100, sta: 100, staDelay: 0, st: 'free', stT: 0, inv: 0, ph: 0, stepAcc: 0, kbx: 0, kby: 0,
        swingQ: false, search: null, flash: 0, swingHit: false, downRot: 0,
      },
      zs: [], furn: [], pack: [], drops: [], rug: { st: 0 }, cache: { name: 'Floor cache', room: 'k', loot0: null }, attic: { st: 0 }, secrets: { shelf: false, cache: false, attic: false }, parts: [], rings: [], nums: [], decals: [], banners: [],
      fog: {}, visited: {}, room: 'o', noiseLvl: 0, cam: { x: 20.5 * T, y: 26 * T }, z3: false,
      stats: { searched: 0, kills: 0, start: performance.now() }, entered: false, lastNoise: null, field: null, fieldT: 0, fieldCell: -1,
      secretHint: 0, sheet: null,
    };
    for (const k in ROOMNAME) { G.fog[k] = k === 's' || k === 'a' ? .99 : .97; G.visited[k] = false; }
    G.fog.o = 0.12; G.visited.o = true;
    let fid = 0;
    for (const d of FDEF) {
      const f = Object.assign({}, d);
      f.fid = fid++;
      f.tx = d.at[0]; f.ty = d.at[1]; f.tw = d.at[2]; f.th = d.at[3];
      f.x = f.tx * T; f.y = f.ty * T; f.w = f.tw * T; f.h = f.th * T;
      if (f.solid == null) f.solid = 1;
      f.lootable = !!d.loot; f.searched = false; f.items = d.items ? 1 : null; f.loot0 = null; f.slide = 0;
      f.room = roomAt(f.tx, f.wall ? f.ty + 1 : f.ty);
      f._key = null; f._c = null;
      G.furn.push(f);
    }
    // ~20% of containers turn out empty - never the fridge, the hidden stash, or the bin by the stoop
    const elig = G.furn.filter(f => f.lootable && f.art !== 'fridge' && f.art !== 'crate' && f.name !== 'Garbage bin' && f.name !== 'Dresser' && f.name !== 'Toolbox');
    for (let i = elig.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [elig[i], elig[j]] = [elig[j], elig[i]]; }
    elig.slice(0, Math.round(elig.length * .2)).forEach(f => f.empty = true);
    for (const f of G.furn) if (f.lootable) f.pre = f.empty ? [] : rollLoot(f.loot); // rolled up front so Keen eye can sense rares
    G.furn.find(f => f.name === 'Dresser').pre.push('note');   // the clue for the floor cache
    G.furn.find(f => f.name === 'Toolbox').pre.push('pole');   // opens the attic hatch
    G.zs.push(mkZombie(6.4 * T, 21.62 * T, 'sleep', 'l'));
    G.zs.push(mkZombie(8.6 * T, 12.7 * T, 'idle', 'b'));
    buildWalls(); buildSolid();
    G.p.flip = false;
    hideCards(); closeSheet(true);
    toast('Joystick to move  ·  SEARCH near furniture', 3.2);
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
      const horizDoor = isDoor(x, y) && isWall(x - 1, y) && isWall(x + 1, y);
      if (horizDoor) {
        wallCells.push({ x, y, lintel: true, key: (y + 1) * T, cut: 1 });
        if (ch(x, y) !== 'X') { // open door leaf, hinged on the west jamb, swung into the room below (front door: into the hall)
          const dir = ch(x, y) === 'F' ? -1 : 1, g0 = (y + 1) * T - WT / 2, g1 = g0 + dir * T * .72;
          doorLeaves.push({ x0: x * T + 2, x1: x * T + 8, y0: Math.min(g0, g1), y1: Math.max(g0, g1), key: Math.max(g0, g1), vert: true });
        }
        continue;
      }
      if (isDoor(x, y) && isWall(x, y - 1) && isWall(x, y + 1)) { // vertical doorway: leaf swung into the hall (east)
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
      const cell = { x, y, rects, key: gy1, cut: 1, W, E, N, S };
      if (!S && !isVoid(x, y + 1)) {
        cell.face = { x0: W ? x * T : cx - WT / 2, x1: E ? (x + 1) * T : cx + WT / 2, room: roomAt(x, y + 1) || 'h', decor: DECOR[x + ',' + y] };
      } else if (S) { // T-junction: the horizontal wall's south face still shows either side of the wall below
        cell.sub = [];
        if (W && roomAt(x - 1, y + 1)) cell.sub.push({ x, y, key: gy1, face: { x0: x * T, x1: cx - WT / 2, room: roomAt(x - 1, y + 1), decor: null } });
        if (E && roomAt(x + 1, y + 1)) cell.sub.push({ x, y, key: gy1, face: { x0: cx + WT / 2, x1: (x + 1) * T, room: roomAt(x + 1, y + 1), decor: null } });
      }
      wallCells.push(cell);
    }
    faceCache.clear(); fogMap = null;
  }
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
      const r = furnRect(f);
      if (x0 < r.x + r.w && x1 > r.x && y0 < r.y + r.h && y1 > r.y) return r;
    }
    return null;
  }
  function moveEnt(e, dx, dy) {
    // x then y, sliding along obstacles
    let hit = false;
    if (dx) {
      const nx = e.x + dx; const r = overlapsSolid(e, nx, e.y);
      if (!r) e.x = nx; else { hit = true; if (!r.edge) e.x = dx > 0 ? Math.min(nx, r.x - e.hw - .01) : Math.max(nx, r.x + r.w + e.hw + .01); if (overlapsSolid(e, e.x, e.y)) e.x -= dx > 0 ? Math.max(0, e.x - (nx - dx)) : Math.min(0, e.x - (nx - dx)); }
    }
    if (dy) {
      const ny = e.y + dy; const r = overlapsSolid(e, e.x, ny);
      if (!r) e.y = ny; else { hit = true; if (!r.edge) e.y = dy > 0 ? Math.min(ny, r.y - e.hh - .01) : Math.max(ny, r.y + r.h + e.hh + .01); if (overlapsSolid(e, e.x, e.y)) e.y = ny - dy; }
    }
    return hit;
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

  // ---------------------------------------------------------------- audio
  const SFX = {
    ac: null, master: null, nb: null,
    init() {
      if (this.ac) { if (this.ac.state === 'suspended') this.ac.resume(); return; }
      try {
        const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
        this.ac = new AC(); this.master = this.ac.createGain(); this.master.gain.value = .5; this.master.connect(this.ac.destination);
        const n = this.ac.sampleRate; this.nb = this.ac.createBuffer(1, n, n); const d = this.nb.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      } catch (e) { this.ac = null; }
    },
    noise(dur, type, f0, f1, g, q = 1, when = 0) {
      const a = this.ac; if (!a) return; const t = a.currentTime + when;
      const s = a.createBufferSource(); s.buffer = this.nb; s.playbackRate.value = .8 + Math.random() * .4;
      const fl = a.createBiquadFilter(); fl.type = type; fl.Q.value = q; fl.frequency.setValueAtTime(f0, t); fl.frequency.exponentialRampToValueAtTime(f1, t + dur);
      const gn = a.createGain(); gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(g, t + Math.min(.02, dur / 4)); gn.gain.exponentialRampToValueAtTime(.0005, t + dur);
      s.connect(fl); fl.connect(gn); gn.connect(this.master); s.start(t, Math.random() * .5); s.stop(t + dur + .05);
    },
    tone(type, f0, f1, dur, g, when = 0) {
      const a = this.ac; if (!a) return; const t = a.currentTime + when;
      const o = a.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      const gn = a.createGain(); gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(g, t + .015); gn.gain.exponentialRampToValueAtTime(.0005, t + dur);
      o.connect(gn); gn.connect(this.master); o.start(t); o.stop(t + dur + .05);
    },
    play(k) {
      if (!this.ac) return;
      switch (k) {
        case 'step': this.noise(.06, 'lowpass', 700, 300, .07, 1); break;
        case 'run': this.noise(.07, 'lowpass', 1000, 350, .1, 1); break;
        case 'rummage': this.noise(.09, 'bandpass', 1800 + Math.random() * 1500, 900, .05, 2); break;
        case 'swing': this.noise(.2, 'bandpass', 500, 2600, .12, 1.5); break;
        case 'hit': this.tone('sine', 140, 45, .16, .35); this.noise(.12, 'lowpass', 1600, 300, .18, 1); break;
        case 'kill': this.tone('sine', 90, 30, .4, .3); this.noise(.3, 'lowpass', 800, 120, .15, 1); break;
        case 'hurt': this.tone('square', 320, 110, .22, .05); this.noise(.15, 'lowpass', 1200, 200, .2, 1); break;
        case 'pick': this.tone('sine', 620, 980, .09, .06); break;
        case 'open': this.noise(.25, 'lowpass', 500, 150, .12, 2); this.tone('sine', 90, 60, .2, .08); break;
        case 'scrape': for (let i = 0; i < 6; i++) this.noise(.22, 'bandpass', 260 + Math.random() * 120, 180, .14, 4, i * .17); break;
        case 'whoosh': this.noise(.25, 'highpass', 400, 2000, .07, .7); break;
        case 'groan': {
          const a = this.ac, t = a.currentTime, o = a.createOscillator(), l = a.createOscillator(), lg = a.createGain(), f = a.createBiquadFilter(), g = a.createGain();
          o.type = 'sawtooth'; const base = 70 + Math.random() * 30; o.frequency.setValueAtTime(base, t); o.frequency.linearRampToValueAtTime(base * .75, t + .9);
          l.frequency.value = 6; lg.gain.value = 6; l.connect(lg); lg.connect(o.frequency);
          f.type = 'lowpass'; f.frequency.value = 420; f.Q.value = 6;
          g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.09, t + .15); g.gain.exponentialRampToValueAtTime(.0005, t + 1);
          o.connect(f); f.connect(g); g.connect(this.master); o.start(t); l.start(t); o.stop(t + 1.05); l.stop(t + 1.05); break;
        }
        case 'alert': this.tone('triangle', 520, 300, .18, .06); break;
      }
    },
  };

  // ---------------------------------------------------------------- input
  const keys = new Set();
  const joy = { id: null, ox: 0, oy: 0, x: 0, y: 0, active: false };
  const btn = { atk: false, atkPressed: false, use: false, dodge: false };
  const MOVEKEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
  addEventListener('keydown', e => {
    SFX.init();
    if (e.repeat && !MOVEKEYS.includes(e.code) && e.code !== 'ShiftLeft') return;
    keys.add(e.code);
    if (G.sheet) {
      if (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); if (G.sheet.kind === 'loot') takeAll(); else closeSheet(); return; }
      if (e.code === 'Escape' || e.code === 'KeyQ' || e.code === 'Tab' || e.code === 'KeyI') { e.preventDefault(); closeSheet(); return; }
      if (MOVEKEYS.includes(e.code)) closeSheet();
    }
    if (e.code === 'Space' || e.code === 'KeyJ') { e.preventDefault(); btn.atkPressed = true; }
    if (e.code === 'KeyE' || e.code === 'Enter') { e.preventDefault(); btn.use = true; }
    if (e.code === 'KeyQ' || e.code === 'KeyK') btn.dodge = true;
    if (e.code === 'KeyI' || e.code === 'Tab') { e.preventDefault(); openPack(); }
  });
  addEventListener('keyup', e => keys.delete(e.code));
  addEventListener('blur', () => keys.clear());

  const touch = $('#touch'), joyEl = $('#joy'), knob = $('#joy .knob');
  const JR = 52;
  const taps = new Map();
  touch.addEventListener('pointerdown', e => {
    SFX.init();
    if (G.sheet) return;
    taps.set(e.pointerId, { x: e.clientX, y: e.clientY, t: performance.now() });
    const rc = touch.getBoundingClientRect();
    if (e.clientX - rc.left > rc.width * .55 || joy.id !== null) { e.preventDefault(); return; }
    joy.id = e.pointerId; joy.ox = e.clientX; joy.oy = e.clientY; joy.x = 0; joy.y = 0; joy.active = true;
    touch.setPointerCapture(e.pointerId);
    joyEl.style.left = (e.clientX - rc.left) + 'px'; joyEl.style.top = (e.clientY - rc.top) + 'px';
    joyEl.classList.add('on'); knob.style.transform = 'translate(-50%,-50%)';
    $('#joyhint').classList.add('gone');
    e.preventDefault();
  });
  touch.addEventListener('pointermove', e => {
    if (e.pointerId !== joy.id) return;
    let dx = e.clientX - joy.ox, dy = e.clientY - joy.oy; const d = Math.hypot(dx, dy);
    if (d > JR * 1.35) { // floating base follows the finger
      const k = (d - JR * 1.35) / d; joy.ox += dx * k; joy.oy += dy * k; dx = e.clientX - joy.ox; dy = e.clientY - joy.oy;
      const rc = touch.getBoundingClientRect(); joyEl.style.left = (joy.ox - rc.left) + 'px'; joyEl.style.top = (joy.oy - rc.top) + 'px';
    }
    const dd = Math.hypot(dx, dy), m = Math.min(1, dd / JR);
    joy.x = dd ? dx / dd * m : 0; joy.y = dd ? dy / dd * m : 0;
    const kx = joy.x * JR, ky = joy.y * JR;
    knob.style.transform = `translate(calc(-50% + ${kx}px), calc(-50% + ${ky}px))`;
    joyEl.classList.toggle('run', m > .86);
  });
  touch.addEventListener('pointerup', e => {
    const tp = taps.get(e.pointerId); taps.delete(e.pointerId);
    if (tp && performance.now() - tp.t < 300 && Math.hypot(e.clientX - tp.x, e.clientY - tp.y) < 14) tapWorld(e.clientX, e.clientY);
  });
  touch.addEventListener('pointercancel', e => taps.delete(e.pointerId));
  const endJoy = e => { if (e.pointerId !== joy.id) return; joy.id = null; joy.active = false; joy.x = joy.y = 0; joyEl.classList.remove('on', 'run'); };
  touch.addEventListener('pointerup', endJoy); touch.addEventListener('pointercancel', endJoy);

  function bindBtn(el, down, up) {
    el.addEventListener('pointerdown', e => { SFX.init(); e.preventDefault(); e.stopPropagation(); el.classList.add('down'); down && down(); });
    const u = e => { el.classList.remove('down'); up && up(); };
    el.addEventListener('pointerup', u); el.addEventListener('pointercancel', u); el.addEventListener('pointerleave', u);
  }
  bindBtn($('#bAtk'), () => { btn.atk = true; btn.atkPressed = true; }, () => { btn.atk = false; });
  bindBtn($('#bUse'), () => { btn.use = true; });
  bindBtn($('#bDodge'), () => { btn.dodge = true; });
  $('#pack').addEventListener('click', () => { SFX.init(); openPack(); });
  document.addEventListener('contextmenu', e => e.preventDefault());
  $('#app').addEventListener('scroll', e => { e.target.scrollTop = 0; e.target.scrollLeft = 0; });

  function moveInput() {
    let x = 0, y = 0;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
    if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
    if (x || y) { const d = Math.hypot(x, y); return { x: x / d, y: y / d, m: 1, run: keys.has('ShiftLeft') || keys.has('ShiftRight') }; }
    if (joy.active) { const m = Math.hypot(joy.x, joy.y); if (m < .14) return { x: 0, y: 0, m: 0, run: false }; return { x: joy.x / m, y: joy.y / m, m: Math.min(1, (m - .14) / .7), run: m > .86 }; }
    return { x: 0, y: 0, m: 0, run: false };
  }

  // ---------------------------------------------------------------- helpers
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, t) => a + (b - a) * t;
  const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
  function rectDist(px, py, r) { const dx = Math.max(r.x - px, 0, px - (r.x + r.w)), dy = Math.max(r.y - py, 0, py - (r.y + r.h)); return Math.hypot(dx, dy); }
  let toastT = 0;
  function toast(msg, dur = 2.2) { const el = $('#toast'); el.textContent = msg; el.classList.add('on'); toastT = dur; }
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
    if (seen) { if (z.st !== 'chase') { z.alertT = .9; SFX.play('groan'); SFX.play('alert'); } z.st = 'chase'; z.stT = 0; z.lostT = 0; return; }
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
  function gateOpen() { const L = G.furn.filter(f => f.lootable && !f.secretLoot); return L.filter(f => f.searched).length >= Math.ceil(L.length * .75); }
  const hasItem = k => G.pack.some(e => e.k === k);
  const RUG = { x: 14.2 * T, y: 3.2 * T, w: 4.6 * T, h: 3.4 * T }, BOARD = { x: 18.05 * T, y: 5.8 * T, w: 26, h: 10 };
  const HATCH = { x: 20.5 * T, y: 15.4 * T }, HOLE = { x: 26.5 * T, y: 15.2 * T };
  function secretActs(out) {
    const p = G.p, gate = gateOpen();
    const sh = G.furn.find(f => f.id === 'secretShelf');
    if (gate && !G.secretOpen && !sh.slideState && p.fy < -.35 && p.x > sh.x + 4 && p.x < sh.x + sh.w - 4 && p.y - (sh.y + sh.h) < 24)
      out.push({ obj: sh, act: 'Push', name: 'Bookshelf', rect: furnRect(sh), noise: 2, secret: true });
    const r = G.rug, onRug = p.x > RUG.x - 12 && p.x < RUG.x + RUG.w + 12 && p.y > RUG.y - 12 && p.y < RUG.y + RUG.h + 12;
    if (gate && r.st === 0 && onRug) out.push({ obj: r, act: 'Move', name: 'rug', rect: { x: p.x - 4, y: p.y - 4, w: 8, h: 8 }, noise: 1.5, dur: 1.3, secret: true, done: moveRug });
    if (r.st === 1) out.push({ obj: r, act: 'Pry', name: 'floorboard', rect: BOARD, noise: 3.5, dur: 2.5, secret: true, done: pryBoard });
    if (r.st === 2 && G.cache.loot0 && G.cache.loot0.length) out.push({ obj: G.cache, act: 'Open', name: 'Floor cache', rect: BOARD, secret: true });
    const a = G.attic, nearHatch = Math.hypot(p.x - HATCH.x, p.y - HATCH.y) < .75 * T;
    if (a.st === 0 && gate && nearHatch && hasItem('pole')) out.push({ obj: a, act: 'Pull down', name: 'attic hatch', rect: { x: HATCH.x - 10, y: HATCH.y - 6, w: 20, h: 12 }, noise: 3, dur: 1.2, secret: true, done: () => { a.st = 1; SFX.play('scrape'); } });
    if (a.st === 1 && nearHatch) out.push({ obj: a, act: 'Climb', name: 'into the attic', rect: { x: HATCH.x - 10, y: HATCH.y - 6, w: 20, h: 12 }, noise: 1, dur: .6, secret: true, done: () => climb(true) });
    if (G.room === 'a' && Math.hypot(p.x - HOLE.x, p.y - HOLE.y) < .8 * T) out.push({ obj: a, act: 'Climb', name: 'down the ladder', rect: { x: HOLE.x - 14, y: HOLE.y - 8, w: 28, h: 16 }, noise: 1, dur: .5, secret: true, done: () => climb(false) });
  }
  function moveRug() { G.rug.st = 1; SFX.play('whoosh'); puff(RUG.x + RUG.w * .8, RUG.y + RUG.h * .7, 2, 8, 'rgba(234,210,164,.5)', 50, .7, 3); }
  function pryBoard() {
    G.rug.st = 2; G.secrets.cache = true; SFX.play('hit');
    G.cache.loot0 = toStacks(rollLoot('cache'));
    gainXP(8, G.p.x, G.p.y);
    openLoot(G.cache, { act: 'Open', name: 'Floor cache' });
  }
  function climb(up) {
    $('#fade').classList.add('on');
    setTimeout(() => {
      if (up) { DM.tp(HOLE.x / T, HOLE.y / T - .45); if (!G.secrets.attic) { G.secrets.attic = true; gainXP(8, G.p.x, G.p.y); } }
      else DM.tp(HATCH.x / T, HATCH.y / T + .6);
      $('#fade').classList.remove('on');
    }, 260);
  }
  function interactables() {
    const out = [];
    for (const f of G.furn) {
      if (!f.lootable) continue;
      if (f.id === 'sofa' && G.zs.some(z => z.st === 'sleep' || z.st === 'rise')) continue; // someone is sleeping on it
      let act = null;
      if (!f.searched) act = 'Search';
      else if (f.loot0 && f.loot0.length) act = 'Open';
      if (act) out.push({ obj: f, act, rect: f.wall ? { x: f.x + 4, y: f.y + 20, w: f.w - 8, h: f.h - 20 } : furnRect(f), name: f.name, noise: f.noise });
    }
    for (const d of G.drops) out.push({ obj: d, act: 'Pick up', rect: { x: d.x - 12, y: d.y - 8, w: 24, h: 14 }, name: ITEMS[d.k].n + (d.n > 1 ? ' x' + d.n : ''), drop: true });
    secretActs(out);
    for (const z of G.zs) {
      if (!z.dead || z.rot === 0) continue;
      let act = !z.searched ? 'Search' : (z.loot0 && z.loot0.length ? 'Open' : null);
      if (act) out.push({ obj: z, act, rect: { x: z.x + (z.fallDir || 1) * 34 - 38, y: z.y - 14, w: 76, h: 26 }, name: 'Zombie', noise: 1.5, corpse: true });
    }
    return out;
  }
  function findTarget() {
    const p = G.p; let best = null, bd = 1e9;
    const fx = p.x + p.fx * 10, fy = p.y + p.fy * 8;
    for (const it of interactables()) {
      const d = rectDist(p.x, p.y, it.rect);
      if (d > 36) continue;
      const score = d + rectDist(fx, fy, it.rect) * .5;
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
    const keys = it.corpse ? rollLoot('corpse') : o.pre.slice();
    if (keys.length && Math.random() < extraChance()) { const more = rollLoot(it.corpse ? 'corpse' : o.loot); if (more.length) keys.push(more[0]); }
    o.loot0 = toStacks(keys);
    // xp: bigger containers teach more, the hidden stash a lot
    gainXP(it.corpse ? 2 : 2 + (o.time >= 2.2 ? 1 : 0) + (o.rare ? 6 : 0), G.p.x, G.p.y);
    o._key = null;
    openLoot(o, it);
  }
  function cancelSearch() { const p = G.p; if (p.st === 'search') { p.st = 'free'; p.search = null; } }

  // ---------------------------------------------------------------- tap to walk / tap to search
  function tapWorld(cx, cy) {
    if (!G || G.sheet || G.over || G.p.st === 'down') return;
    const rc = touch.getBoundingClientRect();
    const wx = G.cam.x + (cx - rc.left - DEV.W / 2) / DEV.zoom, wy = G.cam.y + (cy - rc.top - DEV.H / 2) / DEV.zoom;
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
      const tx = Math.floor(wx / T), ty = Math.floor(wy / T);
      if (tx < 0 || ty < 0 || tx >= MW || ty >= MH || solidCell[ty * MW + tx]) return;
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
    if (toastT > 0) { toastT -= dt; if (toastT <= 0) $('#toast').classList.remove('on'); }
    G.redFlash = Math.max(0, G.redFlash - dt * 2.2);
    G.shake = Math.max(0, G.shake - dt * 30);
    if (G.hitstop > 0) { G.hitstop -= dt; return; }
    if (G.paused) return;

    let inp = moveInput();
    if (G.p.auto) {
      if (inp.m > 0 || btn.atkPressed || btn.dodge || G.p.st === 'hurt' || G.p.st === 'down' || G.sheet) G.p.auto = null;
      else if (G.p.st === 'free') { G.p.auto.t += dt; const ai = autoInput(); if (ai) inp = ai; }
    }
    if (G.tapMark) { G.tapMark.t += dt; if (G.tapMark.t > .7) G.tapMark = null; }
    updatePlayer(dt, inp);
    for (const z of G.zs) updateZombie(z, dt);
    separate();
    updateWorld(dt);
    btn.atkPressed = false; btn.use = false; btn.dodge = false;
  }

  function updatePlayer(dt, inp) {
    const p = G.p;
    p.stT += dt; p.inv = Math.max(0, p.inv - dt); p.flash = Math.max(0, p.flash - dt * 5);
    if (p.st === 'down') { p.downRot = Math.min(1, p.downRot + dt * 3); if (p.stT > 1.3 && !G.over) showDeath(); return; }
    let spd = 0, running = false;
    // stamina
    p.staDelay -= dt;
    if (p.staDelay <= 0 && !(inp.run && inp.m > 0)) p.sta = Math.min(100, p.sta + 20 * dt);

    if (p.st === 'free') {
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
      running = inp.run && inp.m > .5 && p.sta > 1 && p.st === 'free';
      spd = (running ? 4.5 : 2.75) * T * inp.m * (p.st === 'swing' ? .35 : 1);
      if (running) { p.sta = Math.max(0, p.sta - 24 * dt); p.staDelay = .7; }
      const tvx = inp.x * spd, tvy = inp.y * spd;
      const k = 1 - Math.exp(-(inp.m ? 16 : 22) * dt);
      p.vx = lerp(p.vx, tvx, k); p.vy = lerp(p.vy, tvy, k);
      if (inp.m > 0 && p.st === 'free') { p.fx = inp.x; p.fy = inp.y; if (Math.abs(inp.x) > .2) p.flip = inp.x < 0; }
    } else if (p.st === 'search') {
      p.vx *= Math.exp(-20 * dt); p.vy *= Math.exp(-20 * dt);
      const s = p.search; s.t += dt;
      const o = s.it.obj, r = s.it.rect;
      s.nextNoise -= dt; s.nextFx -= dt;
      if (s.nextNoise <= 0) { s.nextNoise = .75; emitNoise(r.x + r.w / 2, r.y + r.h / 2, s.it.act === 'Push' ? 5 : s.it.noise * (scavLvl() >= 3 ? .75 : 1)); }
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
      if (running) emitNoise(p.x, p.y, 3, false); else emitNoise(p.x, p.y, 1.1, false);
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
        if (room !== 'o') banner(ROOMNAME[room].toUpperCase(), room === 's' ? 'a secret stash!' : 'new room');
        if (room === 's') SFX.play('alert');
      }
      if (room !== 'o') G.entered = true;
      $('#room').textContent = ROOMNAME[room].toUpperCase();
    }
    // leave via front door
    if (G.entered && p.y > 29.35 * T && !G.over) showSummary();
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
    if (best) { const dx = best.x - p.x, dy = best.y - p.y, d = Math.hypot(dx, dy) || 1; p.fx = dx / d; p.fy = dy / d; if (Math.abs(dx) > 4) p.flip = dx < 0; }
    p.st = 'swing'; p.stT = 0; p.swingHit = false; p.swingQ = false; p.sta = Math.max(0, p.sta - 7); p.staDelay = .5;
  }
  const SW_WIND = .12, SW_STRIKE = .1, SW_REC = .22;
  function updateSwing() {
    const p = G.p;
    if (!p.swingHit && p.stT >= SW_WIND) {
      p.swingHit = true; SFX.play('swing');
      const fa = Math.atan2(p.fy, p.fx);
      let any = false;
      for (const z of G.zs) {
        if (z.dead || z.st === 'rise' && z.stT < .3) continue;
        const dx = z.x - p.x, dy = (z.y - p.y) * 1.15, d = Math.hypot(dx, dy);
        if (d > 1.55 * T) continue;
        if (d > 18 && Math.abs(angDiff(Math.atan2(dy, dx), fa)) > 1.35) continue;
        hitZombie(z, fa); any = true;
      }
      if (any) { G.hitstop = .055; G.shake = Math.max(G.shake, 5); }
      emitNoise(p.x, p.y, any ? 4.5 : 1.5, any);
    }
    if (p.stT >= SW_WIND + SW_STRIKE + SW_REC) {
      p.st = 'free';
      if (p.swingQ || btn.atk) { startSwing(); }
    }
  }
  function hitZombie(z, fa) {
    const sneak = z.st === 'sleep' || z.st === 'idle';
    const dmg = Math.round((sneak ? 50 : 34) + Math.random() * 4);
    z.hp -= dmg; z.flash = 1; z.hurtDir = Math.cos(fa) >= 0 ? 1 : -1;
    z.kbx = Math.cos(fa) * 5.5 * T; z.kby = Math.sin(fa) * 5.5 * T * .8;
    dmgNum(z.x + 20 * (Math.random() < .5 ? -1 : 1), z.y - 104, dmg, sneak ? P.ORA : P.CRM);
    splat(z.x, z.y, fa, z.hp <= 0);
    puff(z.x, z.y, 44, 5, P.CRM, 90, .25, 2.2);
    SFX.play(z.hp <= 0 ? 'kill' : 'hit');
    if (z.hp <= 0) {
      z.dead = true; z.st = 'dead'; z.stT = 0; z.fallDir = z.hurtDir; G.stats.kills++;
      return;
    }
    if (z.st === 'sleep') { z.st = 'rise'; z.stT = .25; z.alertT = 1; SFX.play('groan'); }
    else if (z.st !== 'rise') { z.st = 'hurt'; z.stT = 0; z.lunge = null; }
  }
  function hurtPlayer(dmg, dx, dy, z) {
    const p = G.p;
    if (p.inv > 0 || p.st === 'down') return;
    cancelSearch(); p.auto = null; if (G.sheet) closeSheet();
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
        z.x = lerp(z.sx0 || z.x, 5.5 * T, k * .25 + 0); z.y = lerp(z.sy0 || z.y, 22.55 * T, k);
        if (z.stT >= .9) { z.rot = 0; z.x = clamp(z.x, 4.5 * T, 6.5 * T); z.y = 22.55 * T; z.st = 'investigate'; z.target = z.target || { x: p.x, y: p.y }; z.stT = 0; if (canSee(z)) alertZombie(z, p.x, p.y, true); }
        break;
      }
      case 'idle': {
        z.wanderT -= dt;
        if (z.wanderT <= 0) { z.wanderT = 2.5 + Math.random() * 3; z.wtx = z.x + (Math.random() - .5) * 2.2 * T; z.wty = z.y + (Math.random() - .5) * 1.4 * T; }
        if (z.wtx != null) { const dx = z.wtx - z.x, dy = z.wty - z.y, d = Math.hypot(dx, dy); if (d > 4) { spd = .45 * T; vx = dx / d; vy = dy / d; face(vx); } }
        if (z.groanT -= dt, z.groanT <= 0) { z.groanT = 6 + Math.random() * 8; if (Math.hypot(dxp, dyp) < 9 * T) SFX.play('groan'); }
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
        z.groanT -= dt; if (z.groanT <= 0) { z.groanT = 3 + Math.random() * 4; SFX.play('groan'); }
        const see = losClear(z.x, z.y - 30, p.x, p.y - 30);
        if (see) { z.lastSeen = { x: p.x, y: p.y }; z.lostT = 0; } else z.lostT += dt;
        if (z.lostT > 5) { z.st = 'investigate'; z.target = z.lastSeen; z.path = null; z.stT = 0; break; }
        if (dp < 1.2 * T && see && z.cd <= 0) { z.st = 'windup'; z.stT = 0; face(dxp); SFX.play('alert'); break; }
        let tgt;
        if (see && dp < 3.2 * T) tgt = { x: p.x, y: p.y };
        else { const st = nextStep(z, playerField()); tgt = st.same ? { x: p.x, y: p.y } : st; }
        const dx = tgt.x - z.x, dy = tgt.y - z.y, dd = Math.hypot(dx, dy) || 1;
        spd = (1.85 + .25 * Math.sin(G.t * 2 + z.id * 9)) * T;
        if (dp < .75 * T) spd = 0;
        vx = dx / dd; vy = dy / dd; face(dxp);
        break;
      }
      case 'windup':
        face(dxp);
        if (z.stT < .5) { const d = dp || 1; vx = -dxp / d; vy = -dyp / d; spd = .25 * T; }
        if (z.stT >= .62) { const d = dp || 1; z.lunge = { x: dxp / d, y: dyp / d, hit: false }; z.st = 'lunge'; z.stT = 0; SFX.play('whoosh'); }
        break;
      case 'lunge': {
        const L = z.lunge; spd = 4.8 * T * Math.max(0, 1 - z.stT / .24); vx = L.x; vy = L.y;
        if (!L.hit && p.inv <= 0 && p.st !== 'down') {
          const d = Math.hypot(p.x - z.x, (p.y - z.y) * 1.2);
          if (d < .85 * T) { L.hit = true; hurtPlayer(16 + Math.round(Math.random() * 6), L.x, L.y, z); }
        }
        if (z.stT >= .26) { z.st = 'recover'; z.stT = 0; }
        break;
      }
      case 'recover':
        if (z.stT > .75) { z.st = 'chase'; z.stT = 0; z.cd = .35; }
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
    const tvx = vx * spd, tvy = vy * spd;
    const k = 1 - Math.exp(-10 * dt);
    z.vx = lerp(z.vx, tvx, k); z.vy = lerp(z.vy, tvy, k);
    const ox = z.x, oy = z.y;
    moveEnt(z, (z.vx + z.kbx) * dt, (z.vy + z.kby) * dt);
    z.kbx *= Math.exp(-9 * dt); z.kby *= Math.exp(-9 * dt);
    z.ph += Math.hypot(z.x - ox, z.y - oy) / (T * .5) * Math.PI * .5;
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
    for (const k in G.fog) {
      const target = k === G.room ? 0 : k === 'a' ? .99 : G.room === 'a' ? .97 : k === 'o' ? .12 : G.visited[k] ? .45 : k === 's' ? .99 : .97;
      G.fog[k] = lerp(G.fog[k], target, 1 - Math.exp(-(target < G.fog[k] ? 5 : 2) * dt));
    }
    G.noiseLvl = Math.max(0, G.noiseLvl - dt * .28);
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
    // secret shelf
    const sh = G.furn.find(f => f.id === 'secretShelf');
    if (sh.slideState === 'sliding') {
      sh.slideT += dt; sh.slide = Math.min(1, sh.slideT / .9); sh._key = null;
      if (Math.random() < .6) puff(sh.x + sh.slide * T + 4, sh.y + sh.h - 2, 4, 1, 'rgba(234,210,164,.6)', 40, .6, 3);
      G.shake = Math.max(G.shake, 1.5);
      if (sh.slide >= 1) { sh.slideState = 'open'; G.secretOpen = true; G.secrets.shelf = true; buildWalls(); buildSolid(); gainXP(8, G.p.x, G.p.y); }
    }
    if (scavLvl() >= 6 && !G.secretOpen && G.room === 'r' && Math.hypot(G.p.x - 3.5 * T, G.p.y - 15 * T) < 5 * T) { // Keen eye only, and subtle
      G.secretHint -= dt;
      if (G.secretHint <= 0) {
        G.secretHint = .45;
        G.parts.push({ x: 3 * T + 4 + Math.random() * 6, y: 15.9 * T, z: 4 + Math.random() * 30, vx: 6 + Math.random() * 10, vy: 3 + Math.random() * 6, vz: (Math.random() - .3) * 6, g: 0, life: 1.8, max: 1.8, col: 'rgba(220,226,255,.35)', size: 1.4 + Math.random(), mote: 1 });
      }
    }
    // the third zombie wanders in from the street
    if (!G.z3 && (G.t > 70 || (G.stats.searched >= 9 && G.t > 35))) {
      G.z3 = true; const z = mkZombie(1.5 * T, 29.4 * T, 'investigate', 'o'); z.target = { x: 20.5 * T, y: 25 * T }; z.hunter = true; G.zs.push(z);
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
    for (const c of wallCells) {
      if (!c.face && !c.lintel) continue;
      const cx = c.x * T + T / 2, behind = p.y < c.key && p.y > c.key - WH - 48 && Math.abs(p.x - cx) < T * 1.25;
      let zb = false;
      if (!behind) for (const z of G.zs) if (!z.dead && z.y < c.key && z.y > c.key - WH - 30 && Math.abs(z.x - cx) < T && Math.hypot(z.x - p.x, z.y - p.y) < 5 * T) { zb = true; break; }
      const target = behind ? .28 : zb ? .5 : 1;
      c.cut = lerp(c.cut, target, 1 - Math.exp(-10 * dt));
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
      if (ch(x, y) === 'X') rm = 'r';
      if (rm) ART.drawFloorTile(c, rm, x, y, T);
    }
    // street + curb
    c.fillStyle = '#23223c'; c.fillRect(0, 29.55 * T, MW * T, T); ART.line(c, 0, 29.55 * T, MW * T, 29.55 * T, '#4a4870', 3);
    // street lamp pool
    { const g = c.createRadialGradient(12.5 * T, 28.9 * T, 4, 12.5 * T, 28.9 * T, T * 3.2); g.addColorStop(0, 'rgba(246,227,187,.22)'); g.addColorStop(1, 'rgba(246,227,187,0)'); c.fillStyle = g; c.fillRect(8 * T, 25.5 * T, 9 * T, 6 * T); }
    // stoop steps
    for (let i = 0; i < 3; i++) ART.blk(c, 19 * T + 6 - i * 4, 28 * T + i * 13, 2 * T + 20 + i * 8 - 12 + 12, 13, ['#5a5878', '#4f4d6c', '#45435f'][i], 2, 2);
    // rugs
    rug(c, 9.3 * T, 16 * T, 4.4 * T, 2.6 * T, P.ORAD, P.ORA, '#8a3f20');
    rug(c, 3.4 * T, 22.2 * T, 4.2 * T, 3.4 * T, '#3f4c7a', '#5a6aa0', P.CRMD);
    rug(c, 19.5 * T, 11 * T, 2 * T, 14 * T, '#5c2f3c', '#7a3f4e', P.CRMD);
    rug(c, 7.5 * T, 12.2 * T, 1.8 * T, 1.2 * T, '#93a86c', '#7a8f58', P.CRM);
    // ambient occlusion under wall faces
    for (const w of wallCells.concat(...wallCells.map(c => c.sub || []))) if (w.face) {
      const g = c.createLinearGradient(0, w.key, 0, w.key + 16); g.addColorStop(0, 'rgba(10,8,24,.45)'); g.addColorStop(1, 'rgba(10,8,24,0)');
      c.fillStyle = g; c.fillRect(w.face.x0, w.key, w.face.x1 - w.face.x0, 16);
    }
    // vertical wall side shadows
    faceCache.clear();
    for (const f of G.furn) f._key = null;
  }
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
    ART.drawWallFace(c, w.face.room, x0, top, wd, WH, w.x);
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
        const left = ch(w.x - 1, w.y) === ch(w.x, w.y) && DECOR[(w.x - 1) + ',' + w.y] === 'window', right = DECOR[(w.x + 1) + ',' + w.y] === 'window';
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
      case 'mirror': if (DECOR[(w.x - 1) + ',' + w.y] !== 'mirror') { ART.blk(c, x + 10, y + 6, wd * 2 - 20, 30, '#8e98b4', 6, 2.4); c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(x + 18, y + 10, 5, 20); ART.line(c, x + 30, y + 12, x + 46, y + 28, 'rgba(17,20,47,.5)', 1.2); } break;
      case 'hooks': for (let i = 0; i < 3; i++) { ART.dot(c, x + 10 + i * 12, y + 14, 2.4, '#9aa0b4'); } ART.blk(c, x + 20, y + 15, 12, 22, P.ORAD, 3, 1.8); break;
      case 'frame': ART.blk(c, x + 10, y + 10, wd - 20, 24, P.WOOD, 2, 2); ART.blk(c, x + 14, y + 14, wd - 28, 16, P.MUTE, 1, 1.2); break;
      case 'frame2': ART.blk(c, x + 8, y + 8, wd - 16, 28, P.CRMD, 2, 2); ART.dot(c, cx, y + 18, 4, P.ORAD); ART.blk(c, cx - 6, y + 22, 12, 10, P.LIL, 3, 1.2); break;
      case 'painting': if (DECOR[(w.x - 1) + ',' + w.y] !== 'painting') {
        ART.blk(c, x + 12, y + 6, wd * 2 - 24, 32, P.ORA, 2, 2.4); ART.blk(c, x + 16, y + 10, wd * 2 - 32, 24, '#2a2440', 1, 1.4);
        c.fillStyle = P.CRMD; c.beginPath(); c.moveTo(x + 18, y + 32); c.lineTo(x + 34, y + 16); c.lineTo(x + 46, y + 28); c.lineTo(x + 54, y + 20); c.lineTo(x + wd * 2 - 18, y + 32); c.fill();
        ART.dot(c, x + wd * 2 - 26, y + 15, 3, P.CRM);
        c.save(); c.translate(x + wd * 2 - 26, y + 4); c.rotate(.2); ART.blk(c, -1, 0, 2, 8, P.INK, 0, 0); c.restore();
      } break;
      case 'crack': ART.line(c, x + 22, y + 8, x + 18, y + 22, 'rgba(10,8,24,.8)', 1.6); ART.line(c, x + 18, y + 22, x + 24, y + 34, 'rgba(10,8,24,.8)', 1.6); ART.line(c, x + 24, y + 34, x + 20, y + WH - 8, 'rgba(10,8,24,.8)', 1.6); break;
      case 'fwin': {
        const left = DECOR[(w.x - 1) + ',' + w.y] === 'fwin';
        if (!left) {
          ART.blk(c, x + 8, y + 6, wd * 2 - 16, 40, '#1b2350', 3, 2.4);
          c.fillStyle = 'rgba(240,123,60,.18)'; c.fillRect(x + 11, y + 26, wd * 2 - 22, 17);
          ART.line(c, x + wd, y + 6, x + wd, y + 46, P.INK, 2.4); ART.line(c, x + 8, y + 26, x + wd * 2 - 8, y + 26, P.INK, 2);
          ART.blk(c, x + 4, y + 44, wd * 2 - 8, 6, P.LIL, 1, 1.6);
          c.fillStyle = 'rgba(17,20,47,.8)'; c.save(); c.translate(x + 30, y + 14); c.rotate(.6); c.fillRect(-1, 0, 2, 16); c.restore();
        }
        break;
      }
      case 'num': ART.blk(c, x + 10, y + 14, 24, 16, P.CRM, 2, 2); c.fillStyle = P.INK; c.font = '900 11px system-ui, sans-serif'; c.textAlign = 'center'; c.fillText('14', cx, y + 26); break;
      case 'lamp': ART.blk(c, cx - 6, y + 8, 12, 16, P.ORA, 3, 2); c.fillStyle = 'rgba(240,123,60,.25)'; c.beginPath(); c.arc(cx, y + 16, 18, 0, 6.3); c.fill(); break;
    }
  }
  function furnCanvas(f) {
    const key = (f.searched ? 1 : 0) + ':' + (f.slide || 0).toFixed(2);
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
  let vignette = null;
  function buildVignette() {
    vignette = document.createElement('canvas'); vignette.width = 256; vignette.height = 256;
    const c = vignette.getContext('2d'), g = c.createRadialGradient(128, 128, 60, 128, 128, 182);
    g.addColorStop(0, 'rgba(8,6,22,0)'); g.addColorStop(1, 'rgba(8,6,22,.75)'); c.fillStyle = g; c.fillRect(0, 0, 256, 256);
  }

  function render() {
    const S = DEV.dpr * DEV.zoom, W = cv.width, H = cv.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0b0c20'; ctx.fillRect(0, 0, W, H);
    const sx = (Math.random() - .5) * G.shake, sy = (Math.random() - .5) * G.shake;
    const camx = G.cam.x + sx, camy = G.cam.y + sy;
    const ox = Math.round(W / 2 - camx * S), oy = Math.round(H / 2 - camy * S);
    ctx.setTransform(S, 0, 0, S, ox, oy);
    const vx0 = camx - W / S / 2 - T * 2, vx1 = camx + W / S / 2 + T * 2, vy0 = camy - H / S / 2 - T * 2, vy1 = camy + H / S / 2 + T * 3;

    ctx.imageSmoothingEnabled = true;
    ctx.fillStyle = '#23223c'; ctx.fillRect(-T * 4, MH * T - 2, MW * T + T * 8, T * 8);
    ctx.fillStyle = 'rgba(201,168,90,.35)'; for (let x = -3; x < MW + 4; x += 3) ctx.fillRect(x * T, (MH + 1.6) * T, T * 1.3, 3);
    ctx.drawImage(floorCv, 0, 0, MW * T, MH * T);
    drawRug();
    if (G.visited.a) { ART.blk(ctx, HOLE.x - 18, HOLE.y - 10, 36, 20, '#0c0816', 2, 2.4); drawLadder(true, HOLE.x, HOLE.y + 2); }
    if (scavLvl() >= 6 && !G.secretOpen) { ctx.strokeStyle = 'rgba(234,210,164,.09)'; ctx.lineWidth = 1.4; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(3 * T + 6, 15.9 * T, T * (1.05 + i * .12), -.02, .7); ctx.stroke(); } }
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
    if (G.attic.st === 1) list.push({ k: HATCH.y + 6, lad: 1 });
    for (const f of G.furn) { const k = f.wall ? f.y + f.h + .5 : f.y + f.h; if (k + 10 < vy0 || f.y - 120 > vy1) continue; list.push({ k, f }); }
    for (const z of G.zs) list.push({ k: z.st === 'sleep' || z.st === 'rise' && z.stT < .5 ? 22 * T + 1 : z.dead ? z.y - 14 : z.y, z });
    list.push({ k: p.y, pl: 1 });
    list.sort((a, b) => a.k - b.k);
    for (const it of list) {
      if (it.w) drawWall(it.w);
      else if (it.d) drawDoor(it.d);
      else if (it.dr) drawDrop(it.dr);
      else if (it.lad) drawLadder(false, HATCH.x, HATCH.y + 6);
      else if (it.f) { const f = it.f, cvs = furnCanvas(f); if (f.lootable && f.searched && !(f.loot0 && f.loot0.length) && !(f.secret && !G.secretOpen)) ctx.globalAlpha = .82; ctx.drawImage(cvs, f._b.x + (f.slide || 0) * T, f._b.y, f._b.w, f._b.h); ctx.globalAlpha = 1; if (f.art === 'crate' && !f.searched) ART.candle(ctx, f.x + f.w - 12, ART.geo(f).ty0 + 12, G.t); }
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
    // candle glow in the hidden room
    if (G.visited.s || G.secretOpen) { const cg = ctx.createRadialGradient(5.3 * T, 10.6 * T, 2, 5.3 * T, 10.6 * T, T * 2.5); cg.addColorStop(0, 'rgba(255,190,110,.22)'); cg.addColorStop(1, 'rgba(255,190,110,0)'); ctx.fillStyle = cg; ctx.fillRect(2 * T, 8 * T, 6 * T, 5 * T); }

    drawFog();
    drawOverlays();

    // screen space
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(vignette, 0, 0, W, H);
    if (G.redFlash > 0) { ctx.fillStyle = `rgba(181,58,46,${G.redFlash * .32})`; ctx.fillRect(0, 0, W, H); }
    if (p.hp < 35 && p.st !== 'down') { ctx.fillStyle = `rgba(181,58,46,${.08 + .06 * Math.sin(G.t * 5)})`; ctx.fillRect(0, 0, W, H); }
    drawBanners();
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
  // rug under the dining table, the loose board, and the hole once pried
  function drawRug() {
    const r = G.rug, R = RUG;
    const w = r.st ? R.w * .58 : R.w;
    ART.rr(ctx, R.x, R.y, w, R.h, 5); ctx.fillStyle = '#5e2a36'; ctx.fill(); ctx.lineWidth = 2.4; ctx.strokeStyle = P.INK; ctx.stroke();
    ART.rr(ctx, R.x + 7, R.y + 7, w - 14, R.h - 14, 3); ctx.strokeStyle = '#8a4050'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = '#c95f2c'; for (let i = 0; i < 5; i++) { const xx = R.x + 20 + i * 36; if (xx > R.x + w - 14) break; ctx.save(); ctx.translate(xx, R.y + R.h / 2); ctx.rotate(.785); ctx.fillRect(-4, -4, 8, 8); ctx.restore(); }
    if (r.st) { // rolled edge
      ART.blk(ctx, R.x + w - 10, R.y - 2, 16, R.h + 4, '#6e3240', 8, 2.4);
      const B = BOARD;
      if (r.st === 1) { ART.blk(ctx, B.x, B.y, B.w, B.h, '#5a4560', 1, 1.6); ART.dot(ctx, B.x + 4, B.y + 5, 1.4, P.MUTE); ART.dot(ctx, B.x + B.w - 4, B.y + 5, 1.4, P.MUTE); }
      else {
        ART.blk(ctx, B.x, B.y, B.w, B.h + 2, '#0c0816', 1, 1.6);
        if (G.cache.loot0 && G.cache.loot0.length) ART.blk(ctx, B.x + 6, B.y + 2, 14, 7, '#b9bdcc', 2, 1.2);
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
    p._pose = [p.x, p.y + yo, PSCALE, p.flip, { rot, sx, sy, parts, alpha: 1 }];
    ART.drawRig(ctx, 'survivor', p.x, p.y + yo, PSCALE, p.flip, { rot, sx, sy, parts, flash: p.flash, flashRed: true, alpha });
  }

  function drawZombie(z) {
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
      x = 6.45 * T; y = 21.12 * T;
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
    }
    // dir: sprite faces left by default, flip when facing right
    if (z.st !== 'sleep') drawShadow(z.x, z.y + 1, z.dead ? 26 : 17, z.dead ? .3 : .42);
    if (z.st === 'dead') { // corpse lies along the floor
      y = z.y + 6;
    }
    z._pose = [x, y + yo, ZSCALE, z.flip, { rot, sy, parts, alpha: 1 }];
    ART.drawRig(ctx, 'zombie', x, y + yo, ZSCALE, z.flip, { rot, sy, parts, flash: z.flash, alpha });
  }

  // Fog is sampled on a fine grid (4 per tile) that knows what is *drawn* there: wall faces
  // belong to the room they face, wall tops to the darkest-of-neighbours rule.
  const FQ = 4, FW = MW * FQ, FH = MH * FQ;
  const fogCv = document.createElement('canvas'); fogCv.width = FW; fogCv.height = FH;
  const fogCtx = fogCv.getContext('2d'); const fogImg = fogCtx.createImageData(FW, FH);
  let fogSrc = [], fogMap = null;
  function buildFogMap() {
    fogSrc = []; fogMap = new Int16Array(FW * FH);
    const roomSrc = {};
    for (const k in ROOMNAME) { roomSrc[k] = fogSrc.length; fogSrc.push({ rooms: [k] }); }
    const VOID = fogSrc.length; fogSrc.push({ fixed: 1 });
    const nbRooms = (x, y) => { const out = new Set(); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const r2 = roomAt(x + dx, y + dy); if (r2) out.add(r2); } return [...out]; };
    for (let fy = 0; fy < FH; fy++) for (let fx = 0; fx < FW; fx++) {
      const tx = Math.floor(fx / FQ), ty = Math.floor(fy / FQ);
      let rm = roomAt(tx, ty);
      if (!rm && isWall(tx, ty)) rm = roomAt(tx, ty - 1) || null;
      if (!rm && isVoid(tx, ty) && ty >= 28) rm = 'o';
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
      if (s.wall && s.wall.cut < .99) a = lerp(minOf(s.capRooms), a, (s.wall.cut - .28) / .72);
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
      ctx.fillStyle = 'rgba(9,7,24,1)'; ctx.fillRect(-T * 20, -T * 20, T * 20, T * 48); ctx.fillRect(MW * T, -T * 20, T * 20, T * 48); ctx.fillRect(-T * 20, -T * 20, T * 70, T * 20);
      ctx.fillStyle = 'rgba(9,7,24,.12)'; ctx.fillRect(-T * 20, MH * T, T * 70, T * 20); ctx.fillRect(-T * 20, 28 * T, T * 20, T * 2); ctx.fillRect(MW * T, 28 * T, T * 20, T * 2);
      return;
    }
    const fsc = Math.min(1, 1.5 / DEV.dpr); // fog is soft: render it at reduced resolution
    const fw = Math.ceil(cv.width * fsc), fh = Math.ceil(cv.height * fsc);
    if (fogLayer.width !== fw || fogLayer.height !== fh) { fogLayer.width = fw; fogLayer.height = fh; }
    const fc = fogLayer.getContext('2d');
    fc.setTransform(1, 0, 0, 1, 0, 0); fc.clearRect(0, 0, fw, fh);
    const m = ctx.getTransform(); fc.setTransform(m.a * fsc, 0, 0, m.d * fsc, m.e * fsc, m.f * fsc); fc.imageSmoothingEnabled = true;
    fc.drawImage(fogCv, 0, 0, MW * T, MH * T);
    fc.fillStyle = 'rgba(9,7,24,1)'; fc.fillRect(-T * 20, -T * 20, T * 20, T * 48); fc.fillRect(MW * T, -T * 20, T * 20, T * 48); fc.fillRect(-T * 20, -T * 20, T * 70, T * 20);
    fc.fillStyle = 'rgba(9,7,24,.12)'; fc.fillRect(-T * 20, MH * T, T * 70, T * 20); fc.fillRect(-T * 20, 28 * T, T * 20, T * 2); fc.fillRect(MW * T, 28 * T, T * 20, T * 2);
    fc.globalCompositeOperation = 'destination-out';
    const cut = (e, key) => {
      if (!e._pose) return;
      const [cx, cy] = cellOf(e), rmm = roomAt(cx, cy) || (cy >= 28 ? 'o' : null);
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
    if (p.st === 'swing' && p.stT > SW_WIND - .02 && p.stT < SW_WIND + SW_STRIKE + .12) {
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
      else if (it.corpse) { mx = o.x + (o.fallDir || 1) * 34; my = o.y - 34; }
      else { const g = ART.geo(o); mx = o.x + o.w / 2 + (o.slide || 0) * T; my = (o.wall ? o.y + o.h - 62 : g.ty0) - 14; }
      const isT = tgt && tgt.obj === o;
      const bob = isT ? Math.sin(G.t * 6) * 2 : 0;
      const a = isT ? 1 : clamp(1.4 - d / (2.4 * T), .25, .85);
      ctx.globalAlpha = a;
      const rad = isT ? 11 : 8;
      ctx.fillStyle = isT ? P.ORA : (it.act === 'Open' ? P.CRMD : P.PLUM);
      ctx.beginPath(); ctx.arc(mx, my + bob, rad, 0, 6.28); ctx.fill(); ctx.lineWidth = 2.4; ctx.strokeStyle = isT ? P.INK : P.CRM; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(mx - 4, my + rad - 1 + bob); ctx.lineTo(mx, my + rad + 5 + bob); ctx.lineTo(mx + 4, my + rad - 1 + bob); ctx.fillStyle = isT ? P.ORA : (it.act === 'Open' ? P.CRMD : P.PLUM); ctx.fill();
      ctx.strokeStyle = isT ? P.INK : P.CRM; ctx.lineWidth = 2;
      if (it.act === 'Search') { ctx.beginPath(); ctx.arc(mx - 1.2, my - 1.2 + bob, rad * .38, 0, 6.28); ctx.stroke(); ART.line(ctx, mx + rad * .2, my + rad * .2 + bob, mx + rad * .5, my + rad * .5 + bob, ctx.strokeStyle, 2.4); }
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
      const lbl = (s.it.act === 'Push' ? 'pushing' : 'searching') + ' · ' + s.it.name.toLowerCase();
      ctx.font = '800 10px system-ui,sans-serif'; const tw = ctx.measureText(lbl).width + 14;
      ctx.fillStyle = 'rgba(17,20,47,.85)'; ART.rr(ctx, x - tw / 2, y - 37, tw, 16, 8); ctx.fill();
      ctx.fillStyle = P.CRM; ctx.fillText(lbl, x, y - 25.5);
    }
    // zombie overlays: z's, !, hp bars
    for (const z of G.zs) {
      const rm = z.roomNow || 'o'; if ((G.fog[rm] || 0) > .7 && z.st !== 'chase') continue;
      if (z.st === 'sleep') {
        for (let i = 0; i < 3; i++) { const k = ((G.t * .5 + i / 3) % 1); ctx.globalAlpha = Math.sin(k * Math.PI) * .9; ctx.fillStyle = P.CRM; ctx.font = `900 ${9 + i * 3}px system-ui,sans-serif`; ctx.fillText('z', 5.0 * T + k * 18 + i * 6, 21.2 * T - 20 - k * 30); }
        ctx.globalAlpha = 1;
      }
      if (z.alertT > 0 || z.st === 'windup') {
        const x = z.x, y = z.y - 92 - (z.st === 'windup' ? 4 : 0);
        const red = z.st === 'windup';
        const sc = red ? 1 + Math.sin(G.t * 30) * .08 : 1;
        ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
        ctx.fillStyle = red ? P.RED : P.ORA; ctx.beginPath(); ctx.arc(0, 0, 11, 0, 6.28); ctx.fill(); ctx.lineWidth = 2.4; ctx.strokeStyle = P.INK; ctx.stroke();
        ctx.fillStyle = P.CRM; ctx.font = '900 15px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.fillText(red ? '!!' : '!', 0, 5.5);
        ctx.restore();
        if (red) { ctx.globalAlpha = .25 + .2 * Math.sin(G.t * 30); ctx.fillStyle = P.RED; ctx.beginPath(); ctx.ellipse(z.x + Math.sign(G.p.x - z.x) * 22, z.y, 34, 14, 0, 0, 6.28); ctx.fill(); ctx.globalAlpha = 1; }
      }
      if (!z.dead && z.hp < 100) {
        const w = 40, x = z.x - w / 2, y = z.y - 84;
        ART.rr(ctx, x - 2, y - 2, w + 4, 9, 4); ctx.fillStyle = P.INK; ctx.fill();
        ART.rr(ctx, x, y, w * Math.max(0, z.hp) / 100, 5, 2.5); ctx.fillStyle = P.GRN; ctx.fill();
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
  let lastHud = '';
  function hud() {
    const p = G.p;
    hpFill.style.width = p.hp + '%'; stFill.style.width = p.sta + '%';
    const hudKey = [Math.round(p.hp), G.pack.length, G.target ? G.target.act + G.target.name : '', Math.round(G.noiseLvl * 5), SK.xp].join('|');
    if (hudKey !== lastHud) {
      lastHud = hudKey;
      hpVal.textContent = Math.ceil(p.hp);
      packEl.textContent = G.pack.length + '/' + packSlots();
      $('#pack').classList.toggle('full', G.pack.length >= packSlots());
      const L = scavLvl();
      $('#skLv').textContent = L;
      $('#skXp').style.width = (L >= 10 ? 100 : (SK.xp - XPCUM(L)) / (XPCUM(L + 1) - XPCUM(L)) * 100) + '%';
      const n = Math.round(G.noiseLvl * 5);
      noiseBars.forEach((b, i) => b.classList.toggle('on', i < n));
      $('#noise').classList.toggle('hot', n >= 4);
      const t = G.target;
      if (t && p.st !== 'down') {
        useBtn.classList.add('on'); useLbl.classList.add('on');
        const loud = !t.corpse && t.act === 'Search' && t.noise >= 4;
        useLbl.innerHTML = `${t.act} <b>${t.name}</b>${loud ? '<em>loud</em>' : ''}`;
      } else { useBtn.classList.remove('on'); useLbl.classList.remove('on'); }
    }
    $('#hp').classList.toggle('low', p.hp < 35);
    drawMini();
  }
  function drawMini() {
    const s = 3, w = MW * s, h = MH * s;
    if (mini.width !== w * 2) { mini.width = w * 2; mini.height = h * 2; }
    mctx.setTransform(2, 0, 0, 2, 0, 0); mctx.clearRect(0, 0, w, h);
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
      const rm = roomAt(x, y);
      if (rm && G.visited[rm]) { mctx.fillStyle = rm === G.room ? '#7d6aa8' : rm === 'o' ? '#2c2b46' : '#4a3c70'; mctx.fillRect(x * s, y * s, s, s); }
      else if (isWall(x, y)) { let v = false; for (let dy = -1; dy <= 1 && !v; dy++) for (let dx = -1; dx <= 1; dx++) { const r2 = roomAt(x + dx, y + dy); if (r2 && G.visited[r2] && r2 !== 'o') { v = true; break; } } if (v) { mctx.fillStyle = '#f6e3bb'; mctx.globalAlpha = .55; mctx.fillRect(x * s, y * s, s, s); mctx.globalAlpha = 1; } }
    }
    for (const f of G.furn) if (f.lootable && !f.searched && G.visited[f.room]) { mctx.fillStyle = '#c95f2c'; mctx.fillRect(f.tx * s + 1, f.ty * s + 1, 1.5, 1.5); }
    mctx.fillStyle = '#f07b3c'; mctx.beginPath(); mctx.arc(G.p.x / T * s, G.p.y / T * s, 2.2, 0, 6.3); mctx.fill();
  }

  // ---------------------------------------------------------------- sheets & cards
  const sheet = $('#sheet');
  // ---- pack with stacks: G.pack = [{k, n}], each entry one slot
  function roomFor(k) { // how many of k the pack can still take
    let room = 0; const m = stackMax(k);
    for (const e of G.pack) if (e.k === k) room += m - e.n;
    return room + (packSlots() - G.pack.length) * m;
  }
  function addToPack(k, n) { // tops up existing stacks first, then new slots; returns how many fit
    const m = stackMax(k); let left = n;
    for (const e of G.pack) if (e.k === k && e.n < m && left) { const t = Math.min(left, m - e.n); e.n += t; left -= t; }
    while (left && G.pack.length < packSlots()) { const t = Math.min(left, m); G.pack.push({ k, n: t }); left -= t; }
    return n - left;
  }
  function itemCard(e, onTap, extra = '', cls = '') {
    const it = ITEMS[e.k], el = document.createElement('button');
    el.className = 'slot' + (it.rare ? ' rare' : '') + cls;
    el.innerHTML = `<img alt="" src="${ART.iconURL[it.i]}"><span>${it.n}</span>${e.n > 1 ? `<i class="cnt">x${e.n}</i>` : ''}${extra}`;
    el.addEventListener('click', ev => { ev.stopPropagation(); onTap(el); });
    return el;
  }
  function openLoot(o, it) {
    const rm = it.corpse ? 'Zombie' : ROOMNAME[o.room] || '';
    G.sheet = { kind: 'loot', o, it };
    $('#shKick').textContent = (it.corpse ? 'Corpse' : rm) + ' · searched';
    $('#shTitle').textContent = it.corpse ? 'Zombie remains' : o.name;
    renderLoot();
    sheet.classList.add('on');
  }
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
    const got = addToPack(e.k, e.n);
    if (!got) { toast(`No room for ${ITEMS[e.k].n.toLowerCase()}`, 1.4); $('#shCap').classList.add('shake'); setTimeout(() => $('#shCap').classList.remove('shake'), 400); return; }
    e.n -= got; if (!e.n) o.loot0.splice(i, 1);
    SFX.play('pick');
    if (e.k === 'ammo' || e.k === 'key') toast(ITEMS[e.k].n + (got > 1 ? ' x' + got : '') + '!', 1.2);
    renderLoot(e.n ? `Only ${got} fit - ${e.n} left here` : null); o._key = null;
  }
  function takeAll() {
    const o = G.sheet && G.sheet.o; if (!o || G.sheet.kind !== 'loot') return;
    let took = 0;
    for (const e of o.loot0) { const got = addToPack(e.k, e.n); e.n -= got; took += got; }
    o.loot0 = o.loot0.filter(e => e.n > 0);
    if (took) SFX.play('pick');
    if (o.loot0.length) { const left = o.loot0.reduce((a, e) => a + e.n, 0); toast(`Pack full - left ${left} item${left > 1 ? 's' : ''} here`, 1.8); renderLoot(); } else closeSheet();
  }
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
      if (it.use) { const b = document.createElement('button'); b.textContent = it.use; b.onclick = ev => { ev.stopPropagation(); useItem(sel); }; acts.appendChild(b); }
      const d = document.createElement('button'); d.className = 'ghost'; d.textContent = 'Drop';
      d.onclick = ev => { ev.stopPropagation(); dropItem(sel); }; acts.appendChild(d);
    }
    sheet.classList.add('on');
  }
  function useItem(i) {
    const e = G.pack[i], it = ITEMS[e.k], p = G.p;
    if (e.k === 'note') { $('#shActs').innerHTML = `<div class="note">${NOTE_TEXT}</div>`; SFX.play('pick'); return; }
    if (it.hp) p.hp = Math.min(100, p.hp + it.hp);
    if (it.sta) p.sta = Math.min(100, p.sta + it.sta);
    e.n--; if (!e.n) G.pack.splice(i, 1);
    SFX.play('pick'); toast(`${it.use === 'Use' ? 'Used' : it.use === 'Take' ? 'Took' : it.use === 'Eat' ? 'Ate' : 'Drank'} ${it.n.toLowerCase()}`, 1.3);
    openPack(e.n ? i : -1);
  }
  function dropItem(i) {
    const e = G.pack.splice(i, 1)[0], p = G.p;
    const a = G.drops.length * 2.1; // nudge so several drops do not sit exactly on top of each other
    G.drops.push({ k: e.k, n: e.n, x: p.x + (p.flip ? -18 : 18) + Math.cos(a) * 6, y: p.y + 6 + Math.sin(a) * 5, t: 0 });
    SFX.play('open'); toast('Dropped - it stays here until you leave', 1.6);
    closeSheet(); // let her see it land
  }
  function pickUp(d) {
    const got = addToPack(d.k, d.n);
    if (!got) { toast('Your pack is full', 1.3); return; }
    d.n -= got; if (!d.n) G.drops.splice(G.drops.indexOf(d), 1);
    SFX.play('pick'); toast(`Picked up ${ITEMS[d.k].n.toLowerCase()}${got > 1 ? ' x' + got : ''}`, 1.1);
  }
  $('#shTake').addEventListener('click', e => { e.stopPropagation(); takeAll(); });
  $('#shClose').addEventListener('click', e => { e.stopPropagation(); closeSheet(); });

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
  const skillLine = () => { const L = scavLvl(); return `<div class="skline">Scavenging Lv ${L}${L < 10 ? ` · ${SK.xp - XPCUM(L)}/${XPCUM(L + 1) - XPCUM(L)} xp` : ' · max'} <button class="reset" id="cReset">reset skills</button></div>`; };
  function bindReset() { $('#cReset').onclick = () => { SK.xp = 0; saveSkills(); lastHud = ''; $('#cReset').closest('.skline').outerHTML = skillLine(); bindReset(); toast('Skills reset', 1.2); }; }
  function showSummary() {
    G.over = true; G.paused = true; closeSheet(true);
    const rooms = Object.keys(ROOMNAME).filter(k => k !== 'o'), seen = rooms.filter(k => G.visited[k]).length;
    const total = G.furn.filter(f => f.lootable && !f.secretLoot).length;
    const secs = Math.round((performance.now() - G.stats.start) / 1000);
    $('#cardBody').innerHTML = `
      <div class="kick">14 Halsey St · you got out</div>
      <h2>Back on the street</h2>
      <div class="stats"><div><b>${seen}/${rooms.length}</b>rooms</div><div><b>${G.furn.filter(f => f.lootable && !f.secretLoot && f.searched).length}/${total}</b>searched</div><div><b>${G.stats.kills}</b>zombies</div><div><b>${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}</b>time</div></div>
      ${(() => { const n = Object.values(G.secrets).filter(Boolean).length, m = Object.keys(G.secrets).length; return `<div class="found${n ? '' : ' dim'}">Secrets found: ${n} of ${m}</div>`; })()}
      <div class="sum">${packSummaryHTML(G.pack)}</div>
      ${G.drops.length ? `<div class="lost">Left behind: ${G.drops.map(d => ITEMS[d.k].n + (d.n > 1 ? ' x' + d.n : '')).join(', ')}</div>` : ''}
      ${skillLine()}
      <div class="btnrow"><button id="cBack" class="ghost">Go back in</button><button id="cNew">New run</button></div>`;
    G.drops = []; // whatever she left on the floor is gone once she leaves
    $('#card').classList.add('on'); bindReset();
    $('#cBack').onclick = () => { hideCards(); G.over = false; G.paused = false; G.p.y = 28.4 * T; G.p.vy = 0; };
    $('#cNew').onclick = () => newGame();
  }
  function showDeath() {
    G.over = true;
    const lost = G.pack.filter((_, i) => i % 2 === 1); G.pack = G.pack.filter((_, i) => i % 2 === 0);
    $('#cardBody').innerHTML = `
      <div class="kick red">down · 14 Halsey St</div>
      <h2>You barely got out</h2>
      <p>She dragged herself back out onto the stoop. Half the pack spilled on the way.</p>
      <div class="sum">${packSummaryHTML(G.pack)}</div>
      ${lost.length ? `<div class="lost">Lost: ${lost.map(e => ITEMS[e.k].n + (e.n > 1 ? ' x' + e.n : '')).join(', ')}</div>` : ''}
      ${skillLine()}
      <div class="btnrow"><button id="cNew">Restart</button></div>`;
    $('#card').classList.add('on'); bindReset();
    $('#cNew').onclick = () => newGame();
  }

  // ---------------------------------------------------------------- loop + resize
  function resize() {
    const app = $('#app'), rc = app.getBoundingClientRect();
    DEV.dpr = Math.min(3, window.devicePixelRatio || 1);
    DEV.W = rc.width; DEV.H = rc.height;
    DEV.zoom = clamp(Math.min(rc.width / 396, rc.height / 760), .8, 2.2);
    cv.width = Math.round(rc.width * DEV.dpr); cv.height = Math.round(rc.height * DEV.dpr);
    cv.style.width = rc.width + 'px'; cv.style.height = rc.height + 'px';
    const fs = Math.min(2, DEV.dpr * DEV.zoom);
    if (Math.abs(fs - DEV.fs) > .01 || !floorCv) { DEV.fs = fs; if (G) buildStatic(); }
  }
  let last = 0, fpsAcc = 0, fpsN = 0;
  function frame(ts) {
    const dt = Math.min(.05, (ts - last) / 1000 || .016); last = ts;
    fpsAcc += dt; fpsN++; if (fpsAcc > 1) { DM.fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; }
    const t0 = performance.now();
    update(dt); render(); hud();
    DM.ms = DM.ms * .95 + (performance.now() - t0) * .05;
    requestAnimationFrame(frame);
  }

  // debug / test hooks
  const DM = window.DM = {
    get G() { return G; }, gateOpen, fps: 0, ms: 0, SK, scavLvl, XPCUM, openPack, dropItem,
    tp(tx, ty) { G.p.x = tx * T; G.p.y = ty * T; G.p.vx = G.p.vy = 0; G.cam.x = G.p.x; G.cam.y = G.p.y - 34; },
    face(x, y) { G.p.fx = x; G.p.fy = y; if (x) G.p.flip = x < 0; },
    target() { const t = findTarget(); return t ? { act: t.act, name: t.name } : null; },
    use() { btn.use = true; }, attack() { btn.atkPressed = true; },
    furn(name) { return G.furn.find(f => f.name === name); },
    T,
  };

  async function boot() {
    resize();
    ART.buildIcons();
    const res = Math.min(2.4, Math.max(1, DEV.dpr * DEV.zoom * ZSCALE * 1.35));
    await Promise.all([ART.buildRig('survivor', res), ART.buildRig('zombie', res)]);
    buildVignette();
    newGame();
    DEV.fs = Math.min(2, DEV.dpr * DEV.zoom); buildStatic();
    G.cam.x = G.p.x; G.cam.y = G.p.y - 120;
    addEventListener('resize', resize);
    $('#loading').remove();
    DM.ready = true;
    requestAnimationFrame(t => { last = t; frame(t); });
  }
  boot().catch(e => { console.error(e); $('#loading').textContent = 'Failed to load: ' + e.message; });
})();
