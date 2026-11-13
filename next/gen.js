/* Dead Miles (next) - house generator. Seeded: the same (type, seed) always gives the same house.
   Output is a plain layout object consumed by house.js (see the format notes there). */
'use strict';
(() => {
  const D = DM.D;
  const GEN = DM.Gen = {};

  // ---------------------------------------------------------------- furniture specs
  // F(art, w, h, H, opts): opts.loot (table key), time, noise, place ('n' north wall | 's' side wall | 'c' centre | 'wall' wall-mounted),
  // n [min,max] count, p chance, lock difficulty, solid
  const F = (art, w, h, H, o = {}) => Object.assign({ art, w, h, H, place: 'n', n: [1, 1], p: 1 }, o);
  const L_ = (loot, name, time, noise) => ({ loot, name, time, noise });
  const ROOMS = {
    hall: { n: 'Hallway', st: 'h', f: [F('coat', 1, 1, 64, { ...L_('coat', 'Coat closet', 2.4, 4.5), place: 's', p: .7 }), F('sidetable', 1, 1, 24, { ...L_('hall', 'Hall table', 1.4, 2), place: 's', p: .6 }), F('shoerack', 1, 1, 14, { place: 's', p: .5 })] },
    foyer: { n: 'Foyer', st: 'h', f: [F('coat', 1, 1, 64, L_('coat', 'Coat closet', 2.4, 4.5)), F('sidetable', 1, 1, 24, L_('hall', 'Hall table', 1.4, 2)), F('plant', 1, 1, 20, { n: [1, 2] })] },
    living: { n: 'Living room', st: 'l', f: [F('sofa', 3, 1, 26, { sofa: 1 }), F('sidetable', 1, 1, 24, { ...L_('side', 'Side table', 1.4, 2), p: .8 }), F('coffee', 3, 1, 16, { place: 'c', p: .8 }),
      F('tvstand', 3, 1, 26, { ...L_('tv', 'TV stand', 1.8, 2.5), place: 'c' }), F('armchair', 1, 1, 22, { place: 'c', p: .6 }), F('bookshelf', 2, 1, 62, { ...L_('books', 'Bookshelf', 2, 2.5), p: .6 }), F('plant', 1, 1, 20, { p: .7 })] },
    kitchen: { n: 'Kitchen', st: 'k', f: [F('fridge', 1, 1, 62, L_('fridge', 'Fridge', 2.4, 5.5)), F('counter', 2, 1, 32, L_('cabinet', 'Cabinets', 1.8, 2.5)), F('stove', 1, 1, 32), F('sink', 2, 1, 32),
      F('drawers', 1, 1, 32, { ...L_('kdrawers', 'Kitchen drawers', 1.6, 3.5), p: .8 }), F('pantry', 2, 1, 62, { ...L_('pantry', 'Pantry', 2.6, 4.5), p: .7 }), F('trash', 1, 1, 26, { p: .6 }),
      F('island', 3, 1, 32, { ...L_('island', 'Island drawers', 1.8, 3), place: 'c', p: .5 }), F('table', 3, 2, 24, { place: 'c', p: .6, table: 1, cloth: 1, items: 1 })] },
    dining: { n: 'Dining room', st: 'w', f: [F('table', 3, 2, 24, { place: 'c', table: 1, cloth: 1, items: 1 }), F('hutch', 2, 1, 62, L_('hutch', 'China hutch', 2.2, 4)), F('plant', 1, 1, 20, { p: .5 })] },
    bath: { n: 'Bathroom', st: 'b', f: [F('toilet', 1, 1, 24), F('vanity', 2, 1, 30, L_('vanity', 'Vanity', 1.6, 2.5)), F('medcab', 1, 1, 0, { ...L_('medcab', 'Medicine cabinet', 1.5, 2), place: 'wall', solid: 0, p: .85 }), F('tub', 2, 2, 24, { p: .7 })] },
    bedroom: { n: 'Bedroom', st: 'r', f: [F('bed', 2, 3, 18), F('nightstand', 1, 1, 24, L_('night', 'Nightstand', 1.5, 2)), F('wardrobe', 2, 1, 64, { ...L_('wardrobe', 'Wardrobe', 2.8, 5), lockable: 'easy' }),
      F('dresser', 3, 1, 34, { ...L_('dresser', 'Dresser', 2.4, 3.5), p: .7 }), F('desk', 2, 1, 30, { ...L_('desk', 'Desk', 2, 2.5), p: .35 }), F('safe', 1, 1, 46, { ...L_('safe', 'Gun safe', 2.2, 2), place: 's', p: .15, lockable: 'hard' })] },
    closet: { n: 'Utility closet', st: 'c', f: [F('shelves', 2, 1, 58, L_('shelves', 'Utility shelves', 2.4, 4)), F('toolbox', 1, 1, 20, { ...L_('toolbox', 'Toolbox', 1.8, 3.5), lockable: 'medium' }), F('heater', 1, 1, 54, { p: .4 })] },
    office: { n: 'Office', st: 'w', f: [F('desk', 2, 1, 30, { ...L_('desk', 'Desk', 2, 2.5), desk: 1 }), F('filing', 1, 1, 40, { ...L_('filing', 'Filing cabinet', 1.8, 3), lockable: 'easy' }), F('bookshelf', 2, 1, 62, { ...L_('books', 'Bookshelf', 2, 2.5), p: .6 }), F('plant', 1, 1, 20, { p: .4 })] },
    study: { n: 'Study', st: 'w', f: [F('desk', 2, 1, 30, { ...L_('desk', 'Writing desk', 2, 2.5), desk: 1 }), F('bookshelf', 2, 1, 62, { ...L_('books', 'Bookshelf', 2, 2.5), n: [2, 3] }), F('safe', 1, 1, 46, { ...L_('safe', 'Wall safe', 2.2, 2), place: 's', lockable: 'hard' }), F('armchair', 1, 1, 22, { place: 'c' })] },
    storage: { n: 'Storage', st: 'g', f: [F('shelves', 2, 1, 58, { ...L_('storage', 'Storage shelves', 2.4, 4), n: [2, 3] }), F('boxes', 2, 1, 40, { n: [1, 2], place: 's' }), F('crate', 2, 1, 30, { ...L_('storage', 'Crate', 2.4, 4), place: 'c', p: .5 })] },
    store: { n: 'Store', st: 'm', f: [F('fridge', 1, 1, 62, { ...L_('cooler', 'Drinks cooler', 2, 4.5), n: [2, 3] }), F('register', 3, 1, 34, { ...L_('register', 'Register', 1.6, 2.5), place: 'front' }), F('shopshelf', 3, 1, 34, { ...L_('store', 'Shelf', 1.8, 2.5), place: 'c', n: [2, 4] })] },
    pharmfloor: { n: 'Pharmacy', st: 'm', f: [F('register', 3, 1, 34, { ...L_('register', 'Counter', 1.6, 2.5), place: 'front' }), F('fridge', 1, 1, 62, L_('cooler', 'Drinks cooler', 2, 4.5)), F('shopshelf', 3, 1, 34, { ...L_('pharm', 'Shelf', 1.8, 2.5), place: 'c', n: [2, 4] })] },
    pharmback: { n: 'Back storage', st: 'g', f: [F('cage', 3, 1, 50, { ...L_('cage', 'Drug cage', 2.6, 2.5), lockable: 'medium', mustLock: 1 }), F('shelves', 2, 1, 58, { ...L_('pharmstore', 'Stock shelves', 2.4, 4), n: [1, 2] }), F('boxes', 2, 1, 40, { place: 's' })] },
    lobby: { n: 'Lobby', st: 't', f: [F('bench', 2, 1, 20, { n: [1, 2] }), F('plant', 1, 1, 20, { n: [1, 2] }), F('register', 3, 1, 34, { ...L_('register', 'Front desk', 1.6, 2.5), place: 'c', p: .7 })] },
    bullpen: { n: 'Bullpen', st: 'w', f: [F('desk', 2, 1, 30, { ...L_('desk', 'Desk', 2, 2.5), place: 'c', n: [2, 4], desk: 1 }), F('filing', 1, 1, 40, { ...L_('filing', 'Filing cabinet', 1.8, 3), n: [1, 2], lockable: 'easy' }), F('plant', 1, 1, 20, { p: .5 })] },
    lockers: { n: 'Locker room', st: 'g', f: [F('locker', 3, 1, 62, { ...L_('locker', 'Lockers', 2, 4), n: [1, 2], lockable: 'easy' }), F('bench', 2, 1, 20, { place: 'c' })] },
    evidence: { n: 'Evidence room', st: 'c', f: [F('shelves', 2, 1, 58, { ...L_('evidence', 'Evidence shelves', 2.4, 3), n: [1, 2] }), F('filing', 1, 1, 40, { ...L_('evidence', 'Evidence locker', 2, 3), lockable: 'medium' })] },
    armory: { n: 'Armory', st: 'x', f: [F('safe', 1, 1, 46, { ...L_('armory', 'Gun cabinet', 2.6, 2.5), lockable: 'hard', mustLock: 1 }), F('locker', 2, 1, 62, { ...L_('locker', 'Gear locker', 2, 4), lockable: 'medium' })] },
    breakroom: { n: 'Break room', st: 'k', f: [F('fridge', 1, 1, 62, L_('fridge', 'Fridge', 2.4, 5.5)), F('counter', 2, 1, 32, L_('cabinet', 'Cabinets', 1.8, 2.5)), F('table', 3, 2, 24, { place: 'c', table: 1, items: 1 })] },
    classroom: { n: 'Classroom', st: 't', f: [F('desk', 2, 1, 30, { ...L_('desk', "Teacher's desk", 2, 2.5), desk: 1 }), F('bookshelf', 2, 1, 62, { ...L_('books', 'Bookshelf', 2, 2.5), p: .5 }), F('schooldesk', 1, 1, 20, { place: 'c', n: [3, 6] })] },
    nurse: { n: 'Nurse office', st: 'b', f: [F('medcab', 1, 1, 0, { ...L_('medcab', 'Medicine cabinet', 1.5, 2), place: 'wall', solid: 0 }), F('drawers', 1, 1, 32, L_('nurse', 'Supply drawers', 1.8, 3)), F('cot', 1, 2, 12, { place: 'c' })] },
    gym: { n: 'Gym', st: 'y', f: [F('shelves', 2, 1, 58, L_('gym', 'Equipment shelf', 2.4, 4)), F('locker', 3, 1, 62, { ...L_('locker', 'Gym lockers', 2, 4), lockable: 'easy' }), F('mat', 2, 2, 4, { place: 'c', n: [1, 2], solid: 0 }), F('bench', 2, 1, 20, { place: 'c' })] },
    janitor: { n: 'Janitor closet', st: 'c', f: [F('shelves', 2, 1, 58, L_('shelves', 'Janitor shelves', 2.4, 4)), F('toolbox', 1, 1, 20, { ...L_('toolbox', 'Toolbox', 1.8, 3.5), lockable: 'medium' })] },
    bay: { n: 'Garage bay', st: 'g', f: [F('car', 3, 2, 30, { place: 'c' }), F('workbench', 3, 1, 34, L_('workbench', 'Workbench', 2.4, 4)), F('toolbox', 1, 1, 20, { ...L_('toolbox', 'Tool chest', 1.8, 3.5), lockable: 'medium' }), F('shelves', 2, 1, 58, { ...L_('garage', 'Parts shelves', 2.4, 4), place: 's' })] },
    laundry: { n: 'Laundromat', st: 'q', f: [F('washer', 1, 1, 34, { ...L_('washer', 'Washer', 1.4, 2.5), n: [3, 5] }), F('washer', 1, 1, 34, { place: 'c', n: [2, 4] }), F('fridge', 1, 1, 62, L_('cooler', 'Vending machine', 2, 4.5)), F('register', 3, 1, 34, { ...L_('register', 'Attendant counter', 1.6, 2.5), place: 'front', p: .7 })] },
    backroom: { n: 'Back room', st: 'g', f: [F('shelves', 2, 1, 58, L_('storage', 'Supply shelves', 2.4, 4)), F('boxes', 2, 1, 40, { place: 's' })] },
    cellar: { n: 'Wine cellar', st: 'x', f: [F('winerack', 2, 1, 50, { ...L_('wine', 'Wine rack', 2, 3), n: [2, 3] }), F('crate', 2, 1, 30, L_('cellar', 'Old crate', 2.4, 4))] },
  };

  // ---------------------------------------------------------------- building recipes
  const R = {
    rowS: { w: [11, 13], h: [14, 17], spine: [2, 'side'], top: [5, 6, ['kitchen']], rooms: ['living', 'bedroom', 'bath', 'closet'], fill: ['bedroom', 'closet'], roomH: [3, 5], zombies: [1, 2], locks: [1, 1], secrets: [1, 1], sec: ['shelf', 'rug', 'attic', 'panel'] },
    rowL: { w: [15, 18], h: [18, 21], spine: [3, 'side'], top: [5, 6, ['kitchen', 'dining']], rooms: ['living', 'bedroom', 'bedroom', 'bath', 'closet', 'office'], fill: ['bedroom', 'closet', 'bath'], roomH: [3, 6], zombies: [2, 3], locks: [1, 2], secrets: [1, 2], sec: ['shelf', 'rug', 'attic', 'panel'] },
    apt: { w: [11, 13], h: [10, 12], spine: [2, 'side'], top: [4, 5, ['living', 'kitchen']], rooms: ['bedroom', 'bath', 'closet'], fill: ['closet'], roomH: [3, 5], zombies: [1, 2], locks: [1, 1], secrets: [1, 1], sec: ['rug', 'panel', 'shelf'] },
    bodega: { w: [12, 14], h: [11, 13], front: [6, 7, 'store'], spine: [2, 'side'], rooms: ['storage', 'office', 'bath'], fill: ['storage'], roomH: [3, 5], zombies: [1, 3], locks: [1, 1], secrets: [1, 1], sec: ['panel', 'rug', 'attic'] },
    laundro: { w: [12, 14], h: [11, 13], front: [6, 7, 'laundry'], spine: [2, 'side'], rooms: ['backroom', 'office', 'bath'], fill: ['backroom'], roomH: [3, 5], zombies: [1, 2], locks: [1, 1], secrets: [1, 1], sec: ['panel', 'rug'] },
    garage: { w: [14, 16], h: [12, 14], front: [7, 8, 'bay'], spine: [2, 'side'], rooms: ['office', 'storage', 'bath'], fill: ['storage'], roomH: [3, 5], zombies: [2, 3], locks: [1, 2], secrets: [1, 1], sec: ['panel', 'attic', 'rug'] },
    pharmacy: { w: [15, 17], h: [14, 16], front: [6, 7, 'pharmfloor'], spine: [2, 'side'], rooms: ['pharmback', 'office', 'bath', 'storage'], fill: ['storage'], roomH: [3, 5], zombies: [2, 4], locks: [2, 2], secrets: [1, 1], sec: ['panel', 'rug', 'attic'] },
    school: { w: [20, 23], h: [21, 24], front: [4, 5, 'lobby'], spine: [3, 'center'], top: [6, 7, ['gym']], rooms: ['classroom', 'classroom', 'classroom', 'nurse', 'bath', 'janitor', 'office'], fill: ['classroom'], roomH: [4, 6], zombies: [4, 6], locks: [2, 3], secrets: [1, 2], sec: ['panel', 'attic', 'shelf'] },
    police: { w: [20, 23], h: [20, 23], front: [4, 5, 'lobby'], spine: [3, 'center'], top: [5, 6, ['bullpen']], rooms: ['armory', 'evidence', 'lockers', 'office', 'bath', 'breakroom'], fill: ['office'], roomH: [3, 6], zombies: [5, 7], tough: .6, locks: [2, 3], secrets: [1, 2], sec: ['panel', 'shelf', 'rug'] },
    mansion: { w: [24, 27], h: [24, 27], front: [4, 5, 'foyer'], spine: [3, 'center'], top: [6, 7, ['kitchen', 'dining']], rooms: ['living', 'study', 'bedroom', 'bedroom', 'bath', 'cellar', 'closet', 'bath'], fill: ['bedroom', 'closet', 'office'], roomH: [4, 6], zombies: [4, 6], tough: .25, locks: [2, 3], secrets: [2, 3], sec: ['shelf', 'rug', 'attic', 'panel'] },
  };
  GEN.RECIPES = R;

  const NOTES = {
    supper: '"Grandpa never trusted banks. Said the floor under supper was the safest place in Brooklyn."',
    tv: '"Ma kept the rent money where nobody looks - under the rug, right where we watched the game."',
    desk: '"Told the new guy: the good stuff is under the floor by the desk. Nobody checks the floor."',
    any: '"If anything happens, lift the rug. Third board is loose. Don\'t tell your brother."',
  };
  const CHARS = 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789bcdefghijklmnpqrstuvwxyz';

  // ---------------------------------------------------------------- generator
  GEN.generate = function (type, seed, opts = {}) {
    for (let attempt = 0; attempt < 30; attempt++) {
      const out = tryGen(type, (seed + attempt * 7919) >>> 0, opts);
      if (out) { out.seed = seed; out.attempts = attempt + 1; return out; }
    }
    throw new Error('generator failed for ' + type + ' ' + seed);
  };

  function tryGen(type, seed, opts) {
    const rnd = D.mulberry32(seed);
    const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
    const pick = a => a[Math.floor(rnd() * a.length)];
    const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const rc = R[type], bt = D.BTYPES[type];

    // secrets chosen first: they reserve space around the house
    const nSec = ri(rc.secrets[0], rc.secrets[1]);
    const secTypes = shuffle(rc.sec.slice()).slice(0, nSec);
    const wantAttic = secTypes.includes('attic');

    const w = ri(rc.w[0], rc.w[1]), h = ri(rc.h[0], rc.h[1]);
    const yT = 5, xR = w + 2, yB = yT + h + 1;
    const MW = xR + 2 + (wantAttic ? 7 : 0), MH = yB + 3;
    const g = []; for (let y = 0; y < MH; y++) g.push(new Array(MW).fill(' '));
    for (let y = yT; y <= yB; y++) for (let x = 1; x <= xR; x++) g[y][x] = '#';
    for (let y = yB + 1; y < MH; y++) for (let x = 0; x < MW; x++) g[y][x] = 'o';

    const rooms = [], doors = []; // doors: {x, y, a, b, horiz}
    let ci = 0;
    const addRoom = (t, x0, y0, x1, y1) => { const r = { t, x0, y0, x1, y1, ch: CHARS[ci++], id: rooms.length }; rooms.push(r); return r; };
    const door = (x, y, a, b, horiz) => doors.push({ x, y, a, b, horiz });
    let top = yT + 1, bottom = yB - 1;
    const left = 2, right = xR - 1;

    let front = null;
    if (rc.front) { const hf = ri(rc.front[0], rc.front[1]); front = addRoom(rc.front[2], left, bottom - hf + 1, right, bottom); bottom = bottom - hf - 1; }
    let bandRooms = [];
    if (rc.top) {
      const tb = ri(rc.top[0], rc.top[1]); const kinds = rc.top[2];
      if (kinds.length > 1 && right - left + 1 >= 11) { const sx = left + ri(Math.floor((right - left) * .4), Math.floor((right - left) * .6)); bandRooms.push(addRoom(kinds[0], left, top, sx - 1, top + tb - 1)); bandRooms.push(addRoom(kinds[1], sx + 1, top, right, top + tb - 1)); }
      else bandRooms.push(addRoom(kinds[0], left, top, right, top + tb - 1));
      top = top + tb + 1;
    }
    // hallway spine
    const sw = rc.spine[0], W = right - left + 1;
    let sx;
    if (rc.spine[1] === 'side') sx = rnd() < .5 ? left : right - sw + 1;
    else { const lw = ri(Math.max(3, Math.floor((W - sw) / 2) - 2), Math.min(W - sw - 4, Math.floor((W - sw) / 2) + 2)); sx = left + lw + 1; }
    const spine = addRoom(rc.front ? 'hall' : 'hall', sx, top, sx + sw - 1, bottom);
    spine.spine = true;
    const regions = [];
    if (sx - 2 >= left + 2) regions.push({ x0: left, x1: sx - 2, wallX: sx - 1, side: -1 });
    if (sx + sw + 1 <= right - 2) regions.push({ x0: sx + sw + 1, x1: right, wallX: sx + sw, side: 1 });
    if (!regions.length) return null;
    const side = [];
    for (const rg of regions) {
      let y = top;
      while (y <= bottom) {
        let hh = ri(rc.roomH[0], rc.roomH[1]);
        if (bottom - (y + hh) < rc.roomH[0]) hh = bottom - y + 1;
        const r = addRoom(null, rg.x0, y, rg.x1, y + hh - 1); r.region = rg;
        door(rg.wallX, ri(r.y0, r.y1), spine.id, r.id, false);
        // wide rooms are split in two; the far half opens into the near half
        if (r.x1 - r.x0 + 1 >= 7 && rnd() < (r.x1 - r.x0 + 1 >= 9 ? .6 : .45)) {
          const wx = rg.side > 0 ? r.x0 + ri(3, r.x1 - r.x0 - 3) : r.x0 + ri(3, r.x1 - r.x0 - 3);
          const far = rg.side > 0 ? addRoom(null, wx + 1, r.y0, r.x1, r.y1) : addRoom(null, r.x0, r.y0, wx - 1, r.y1);
          if (rg.side > 0) r.x1 = wx - 1; else r.x0 = wx + 1;
          if (r.x1 - r.x0 < 2 || far.x1 - far.x0 < 2) { rooms.pop(); ci--; if (rg.side > 0) r.x1 = rg.x1; else r.x0 = rg.x0; }
          else { far.region = rg; door(wx, ri(r.y0, r.y1), r.id, far.id, false); side.push(far); }
        }
        side.push(r);
        y += hh + 1;
      }
    }
    // the spine reaches the top band and the front room through doors in their walls
    for (const br of bandRooms) {
      const lo = Math.max(br.x0, sx), hi = Math.min(br.x1, sx + sw - 1);
      if (lo <= hi) door(ri(lo, hi), top - 1, br.id, spine.id, true);
    }
    if (bandRooms.length === 2) { const a = bandRooms[0], b = bandRooms[1]; if (!doors.some(d => d.a === a.id || d.b === a.id) || !doors.some(d => d.a === b.id || d.b === b.id)) door(a.x1 + 1, ri(a.y0, a.y1), a.id, b.id, false); else if (rnd() < .5) door(a.x1 + 1, ri(a.y0, a.y1), a.id, b.id, false); }
    let fdx;
    if (front) { door(ri(sx, sx + sw - 1), bottom + 1, spine.id, front.id, true); fdx = ri(front.x0 + 2, front.x1 - 2); }
    else fdx = ri(sx, sx + sw - 1);

    // assign room types to the side rooms: required list by size, then fillers
    const req = rc.rooms.slice(), sorted = side.slice().sort((a, b) => (b.x1 - b.x0 + 1) * (b.y1 - b.y0 + 1) - (a.x1 - a.x0 + 1) * (a.y1 - a.y0 + 1));
    const big = ['living', 'classroom', 'bedroom', 'study', 'dining', 'bullpen', 'breakroom', 'lockers', 'storage', 'office', 'cellar', 'pharmback', 'backroom'];
    const reqBig = req.filter(t => big.includes(t)), reqSmall = req.filter(t => !big.includes(t));
    for (const r of sorted) {
      const small = (r.x1 - r.x0 + 1) * (r.y1 - r.y0 + 1) < 14;
      r.t = (small ? reqSmall.shift() || reqBig.shift() : reqBig.shift() || reqSmall.shift()) || pick(rc.fill);
    }
    if (reqBig.length + reqSmall.length > (rooms.length > 9 ? 2 : 1)) return null; // too few rooms for this building, try again
    // a room too small for its type becomes a closet
    for (const r of side) if ((r.x1 - r.x0 + 1) < 3 || (r.y1 - r.y0 + 1) < 3) r.t = 'closet';
    if (rc.front) spine.t = 'hall';

    // paint rooms + doors
    for (const r of rooms) for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) g[y][x] = r.ch;
    const doorMap = {};
    for (const d of doors) { g[d.y][d.x] = '+'; doorMap[d.x + ',' + d.y] = (d.horiz ? rooms[d.a] : rooms[d.a]).ch; }
    const roomOfCh = {}; rooms.forEach(r => roomOfCh[r.ch] = r);
    const entry = front || spine;
    g[yB][fdx] = '+'; doorMap[fdx + ',' + yB] = entry.ch;

    // occupancy: 1 solid furniture, 2 non-solid, 3 reserved (keep clear)
    const occ = []; for (let y = 0; y < MH; y++) occ.push(new Uint8Array(MW));
    const isFloor = (x, y) => x >= 0 && y >= 0 && x < MW && y < MH && (roomOfCh[g[y][x]] || g[y][x] === '+' || g[y][x] === 'o');
    for (const d of doors.concat([{ x: fdx, y: yB }])) for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0], [0, -2], [0, 2], [-2, 0], [2, 0]]) { const x = d.x + dx, y = d.y + dy; if (isFloor(x, y)) occ[y][x] = 3; }
    const start = { x: fdx + .5, y: yB + 1.6 };

    function reach() {
      const dist = new Int16Array(MW * MH).fill(-1), q = [[fdx, yB + 1]]; dist[(yB + 1) * MW + fdx] = 0;
      while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= MW || ny >= MH) continue; const i = ny * MW + nx; if (dist[i] >= 0 || !isFloor(nx, ny) || occ[ny][nx] === 1) continue; dist[i] = 1; q.push([nx, ny]); } }
      return dist;
    }
    const furn = [];
    function accessible(f, dist) {
      const [x0, y0, w, h] = f.at;
      if (f.wall) return dist[(y0 + 1) * MW + x0] >= 0;
      for (let x = x0; x < x0 + w; x++) { if (y0 + h < MH && dist[(y0 + h) * MW + x] >= 0) return true; if (y0 - 1 >= 0 && dist[(y0 - 1) * MW + x] >= 0) return true; }
      for (let y = y0; y < y0 + h; y++) { if (dist[y * MW + x0 - 1] >= 0 || dist[y * MW + x0 + w] >= 0) return true; }
      return false;
    }
    function valid() {
      const dist = reach();
      for (const d of doors) if (dist[d.y * MW + d.x] < 0) return false;
      for (const f of furn) if ((f.loot || f.mustReach) && !f.pocket && !accessible(f, dist)) return false;
      return true;
    }
    function tryPlace(r, spec, x, y) {
      const w = spec.w, h = spec.h;
      if (spec.place === 'wall') {
        if (g[y][x] !== '#' || !roomOfCh[g[y + 1] && g[y + 1][x]] || occ[y + 1][x] === 1 || furn.some(f => f.wall && f.at[0] === x && f.at[1] === y)) return null;
        const f = mk(spec, r, x, y); f.wall = 1; f.solid = 0; furn.push(f);
        occ[y + 1][x] = 3; return f;
      }
      for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) { if (xx < r.x0 || xx > r.x1 || yy < r.y0 || yy > r.y1 || occ[yy][xx]) return null; }
      const solid = spec.solid !== 0;
      for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) occ[yy][xx] = solid ? 1 : 2;
      const f = mk(spec, r, x, y); furn.push(f);
      if (solid && !valid()) { furn.pop(); for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) occ[yy][xx] = 0; return null; }
      return f;
    }
    function mk(spec, r, x, y) {
      const f = { art: spec.art, at: [x, y, spec.w, spec.h], H: spec.H, room: r.ch };
      for (const k of ['loot', 'name', 'time', 'noise', 'cloth', 'items', 'seed']) if (spec[k] != null) f[k] = spec[k];
      if (spec.solid === 0) f.solid = 0;
      if (spec.lockable) f.lockable = spec.lockable; if (spec.mustLock) f.mustLock = 1;
      if (spec.sofa) f.sofa = 1; if (spec.table) f.table = 1; if (spec.desk) f.desk = 1;
      if (spec.art === 'bookshelf') f.seed = ri(0, 9);
      return f;
    }
    function candidates(r, spec) {
      const out = [], w = spec.w, h = spec.h;
      if (spec.place === 'wall') { for (let x = r.x0; x <= r.x1; x++) out.push([x, r.y0 - 1]); return shuffle(out); }
      if (spec.place === 'n' || spec.place === 'front') for (let x = r.x0; x <= r.x1 - w + 1; x++) out.push([x, spec.place === 'front' ? r.y1 - h + 1 - 1 : r.y0]);
      if (spec.place === 's' || spec.place === 'n') for (let y = r.y0 + 1; y <= r.y1 - h + 1; y++) { out.push([r.x0, y]); out.push([r.x1 - w + 1, y]); }
      if (spec.place === 'c' || spec.place === 'front') for (let y = r.y0 + 1; y <= r.y1 - h; y++) for (let x = r.x0 + 1; x <= r.x1 - w; x++) out.push([x, y]);
      // north-wall spots first (furniture faces south), then the rest
      const nn = spec.place === 'n' ? shuffle(out.filter(c => c[1] === r.y0)) : [];
      return nn.concat(shuffle(out.filter(c => !(spec.place === 'n' && c[1] === r.y0))));
    }
    function furnish(r) {
      const def = ROOMS[r.t]; if (!def) return;
      for (const spec of def.f) {
        if (rnd() > spec.p) continue;
        const n = ri(spec.n[0], spec.n[1]);
        for (let i = 0; i < n; i++) {
          let placed = null;
          for (const [x, y] of candidates(r, spec)) { placed = tryPlace(r, spec, x, y); if (placed) break; }
          if (placed && spec.art === 'table') { // chairs around the table (non-solid)
            for (const [cx, cy] of [[placed.at[0] - 1, placed.at[1]], [placed.at[0] + 3, placed.at[1]], [placed.at[0] + 1, placed.at[1] - 1]]) tryPlace(r, { art: 'chair', w: 1, h: 1, H: 16, solid: 0 }, cx, cy);
          }
          if (placed && spec.art === 'desk' && rnd() < .7) tryPlace(r, { art: 'chair', w: 1, h: 1, H: 16, solid: 0 }, placed.at[0], placed.at[1] + 1);
        }
      }
    }

    // ---- secrets that need floor plan space are carved before furnishing
    const L = { rooms: {}, doors: doorMap, decor: {}, furn, rugs: [], zombies: [], secrets: [] };
    const secOut = [];
    if (secTypes.includes('shelf')) {
      const cand = shuffle(rooms.filter(r => r.y0 === yT + 1 && r.x1 - r.x0 + 1 >= 4 && !r.spine && r !== front));
      let ok = false;
      for (const r of cand) {
        for (const dx of shuffle(range(r.x0, r.x1 - 2))) {
          if ([dx, dx + 1, dx + 2].some(x => occ[r.y0][x] || occ[r.y0 + 1][x] || g[yT][x] !== '#') || g[yT][dx - 1] !== '#' || g[yT][dx + 1] !== '#') continue;
          const hx = Math.max(2, Math.min(dx - ri(0, 2), xR - 4));
          if (hx + 3 > xR - 1 || dx < hx || dx > hx + 3) continue;
          // hidden room above the house
          for (let y = yT - 4; y <= yT - 1; y++) for (let x = hx - 1; x <= hx + 4; x++) g[y][x] = '#';
          const hr = { t: 'hidden', x0: hx, y0: yT - 3, x1: hx + 3, y1: yT - 1, ch: 'S', id: rooms.length, hidden: 1 }; rooms.push(hr); roomOfCh.S = hr;
          for (let y = hr.y0; y <= hr.y1; y++) for (let x = hr.x0; x <= hr.x1; x++) g[y][x] = 'S';
          g[yT][dx] = '='; doorMap[dx + ',' + yT] = 'S';
          const shelf = { art: 'bookshelf', name: 'Bookshelf', at: [dx, r.y0, 2, 1], H: 62, secret: 1, seed: 2, room: r.ch, mustReach: 1 };
          furn.push(shelf); occ[r.y0][dx] = 1; occ[r.y0][dx + 1] = 1; occ[r.y0][dx + 2] = 3; occ[r.y0 + 1][dx] = 3; occ[r.y0 + 1][dx + 1] = 3;
          furn.push({ art: 'crate', name: 'Hidden crate', at: [hx, hr.y0, 2, 1], H: 30, time: 3, noise: 4, loot: 'crate', rare: 1, secretLoot: 1, room: 'S', pocket: 1 });
          furn.push({ art: 'supply', at: [hx + 2, hr.y0, 2, 1], H: 56, room: 'S', pocket: 1 });
          secOut.push({ type: 'shelf', furn: furn.indexOf(shelf), room: 'S' });
          ok = true; break;
        }
        if (ok) break;
      }
    }
    let atticSpec = null;
    if (wantAttic) {
      const ax0 = xR + 2, ay0 = ri(yT + 1, Math.max(yT + 1, yB - 7));
      for (let y = ay0; y <= ay0 + 5; y++) for (let x = ax0; x <= ax0 + 5; x++) g[y][x] = (y === ay0 || y === ay0 + 5 || x === ax0 || x === ax0 + 5) ? '#' : 'Z';
      const ar = { t: 'attic', x0: ax0 + 1, y0: ay0 + 1, x1: ax0 + 4, y1: ay0 + 4, ch: 'Z', id: rooms.length, isolated: 1 }; rooms.push(ar); roomOfCh.Z = ar;
      furn.push({ art: 'crate', name: 'Old trunk', at: [ax0 + 1, ay0 + 1, 2, 1], H: 30, time: 2.6, noise: 3, loot: 'attic', rare: 1, secretLoot: 1, room: 'Z', pocket: 1 });
      atticSpec = { ar };
    }

    // ---- furnish every room
    for (const r of rooms) if (!r.hidden && !r.isolated) furnish(r);
    // the street: lamp post and a bin right by the stoop (always has something: the first container near the start)
    const binX = fdx + (fdx > 4 ? -3 : 3);
    furn.push({ art: 'trash', name: 'Garbage bin', at: [binX, yB + 1, 1, 1], H: 26, time: 1.4, noise: 3, loot: 'trash', noEmpty: 1, room: 'o' });
    const lampX = Math.max(1, Math.min(MW - 2, fdx + (rnd() < .5 ? -7 : 6)));
    if (Math.abs(lampX - binX) > 1) furn.push({ art: 'lamppost', at: [lampX, yB + 1, 1, 1], H: 112, room: 'o' });

    // ---- remaining secrets
    const conts = () => furn.filter(f => f.loot && !f.secretLoot && f.room !== 'o');
    if (atticSpec) {
      const hallCells = [];
      for (const r of rooms) if (r.spine || r.t === 'hall' || r.t === 'foyer') for (let y = r.y0 + 1; y <= r.y1 - 1; y++) for (let x = r.x0; x <= r.x1; x++) if (!occ[y][x] && !occ[y - 1][x]) hallCells.push([x, y]);
      if (hallCells.length) {
        const [hx, hy] = pick(hallCells); occ[hy][hx] = 3;
        const ar = atticSpec.ar;
        const holders = conts().filter(f => ['toolbox', 'shelves', 'coat', 'wardrobe', 'locker', 'workbench'].includes(f.art) && !f.lockable);
        const holder = holders.length ? pick(holders) : pick(conts());
        if (holder) { (holder.extra = holder.extra || []).push('pole'); holder.noEmpty = 1;
          secOut.push({ type: 'attic', hatch: { x: hx + .5, y: hy + .6 }, hole: { x: ar.x0 + 1.5, y: ar.y1 + .2 }, room: 'Z' }); }
      }
    }
    if (secTypes.includes('rug')) {
      const tables = furn.filter(f => (f.table || f.art === 'coffee' || f.desk) && !f.pocket);
      for (const t of shuffle(tables)) {
        const r = roomOfCh[t.room];
        const rx0 = Math.max(r.x0, t.at[0] - 1), ry0 = Math.max(r.y0, t.at[1] - 1), rx1 = Math.min(r.x1, t.at[0] + t.at[2]), ry1 = Math.min(r.y1, t.at[1] + t.at[3]);
        const cells = [];
        for (let y = ry0; y <= ry1; y++) for (let x = rx0; x <= rx1; x++) if (!occ[y][x] && (y === t.at[1] + t.at[3] || x === t.at[0] + t.at[2])) cells.push([x, y]);
        if (!cells.length) continue;
        const [bx, by] = pick(cells); occ[by][bx] = 3;
        const holders = conts().filter(f => f.room !== t.room && !f.lockable);
        if (!holders.length) continue;
        const holder = pick(holders); (holder.extra = holder.extra || []).push('note'); holder.noEmpty = 1;
        L.note = t.table && ['kitchen', 'dining', 'breakroom'].includes(r.t) ? NOTES.supper : t.art === 'coffee' ? NOTES.tv : t.desk ? NOTES.desk : NOTES.any;
        secOut.push({ type: 'rug', rug: { x: rx0 + .15, y: ry0 + .2, w: rx1 - rx0 + .7, h: ry1 - ry0 + .6 }, board: { x: bx, y: by }, room: t.room });
        break;
      }
    }
    if (secTypes.includes('panel')) {
      const spots = [];
      for (const r of rooms) if (!r.hidden && !r.isolated && r !== front) for (let x = r.x0; x <= r.x1; x++) { const y = r.y0 - 1; if (g[y][x] === '#' && g[y][x - 1] === '#' && g[y][x + 1] === '#' && !occ[r.y0][x] && !furn.some(f => f.wall && f.at[0] === x && f.at[1] === y)) spots.push([x, y, r]); }
      if (spots.length) {
        const [x, y, r] = pick(spots); occ[y + 1][x] = 3;
        const f = { art: 'wallpanel', at: [x, y, 1, 1], H: 0, wall: 1, solid: 0, room: r.ch, panel: 1 }; furn.push(f);
        secOut.push({ type: 'panel', furn: furn.indexOf(f), room: r.ch });
        if (rnd() < .6) { const hs = conts().filter(c => !c.lockable); if (hs.length) { const hh = pick(hs); (hh.extra = hh.extra || []).push('crowbar'); hh.noEmpty = 1; } }
      }
    }
    if (!secOut.length) return null;

    // ---- locks: some containers are locked, harder in dangerous places
    const nLocks = ri(rc.locks[0], rc.locks[1]);
    const lockables = shuffle(furn.filter(f => f.lockable && !(f.extra && f.extra.length)));
    lockables.sort((a, b) => (b.mustLock || 0) - (a.mustLock || 0));
    let locked = 0;
    for (const f of lockables) { if (locked >= nLocks && !f.mustLock) break; f.lock = f.mustLock && type === 'pharmacy' && rnd() < .5 ? 'hard' : f.lockable; locked++; }
    if (locked < nLocks) { // add a safe somewhere sensible
      for (const r of shuffle(rooms.filter(r => ['bedroom', 'office', 'study', 'storage', 'backroom'].includes(r.t)))) {
        let p = null; for (const [x, y] of candidates(r, F('safe', 1, 1, 46, { place: 's' }))) { p = tryPlace(r, F('safe', 1, 1, 46, { ...L_('safe', 'Safe', 2.2, 2), place: 's' }), x, y); if (p) break; }
        if (p) { p.lock = 'hard'; locked++; if (locked >= nLocks) break; }
      }
    }

    // ---- zombies
    const dist = reach();
    const nZ = ri(rc.zombies[0], rc.zombies[1]);
    const zCells = [];
    for (const r of rooms) if (!r.hidden && !r.isolated) for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) if (!occ[y][x] && dist[y * MW + x] >= 0 && Math.hypot(x - fdx, y - yB) > 6) zCells.push([x, y, r]);
    const sofas = furn.filter(f => f.sofa);
    for (let i = 0; i < nZ && zCells.length; i++) {
      const tough = rc.tough && rnd() < rc.tough;
      const zd = { st: 'idle' };
      if (tough) { zd.hp = 150; zd.dmg = 1.3; zd.kind = 'tough'; }
      const sofa = sofas.find(s => !s.used);
      if (i === 0 && sofa && rnd() < .7) {
        const [tx, ty, tw] = sofa.at; sofa.used = 1;
        if (!occ[ty + 1][tx + 1]) { Object.assign(zd, { st: 'sleep', x: tx + 2.4, y: ty + .62, sleep: { furn: furn.indexOf(sofa), draw: { x: tx + tw * .82, y: ty + .12 }, key: ty + 1, wake: { x: tx + 1.5, y: ty + 1.55 } } }); L.zombies.push(zd); continue; }
      }
      const k = Math.floor(rnd() * zCells.length), [x, y] = zCells.splice(k, 1)[0];
      zd.x = x + .5; zd.y = y + .6; L.zombies.push(zd);
    }

    // ---- decor and rugs
    const facade = [];
    for (let x = 2; x <= xR - 1; x++) facade.push(x);
    const pair = (x, y, k) => { if (!L.decor[x + ',' + y] && !L.decor[(x + 1) + ',' + y] && g[y][x] === '#' && g[y][x + 1] === '#') { L.decor[x + ',' + y] = k; L.decor[(x + 1) + ',' + y] = k; } };
    for (let x = 2; x < xR - 1; x += ri(3, 5)) if (Math.abs(x - fdx) > 2 && Math.abs(x + 1 - fdx) > 2) pair(x, yB, 'fwin');
    if (g[yB][fdx - 1] === '#') L.decor[(fdx - 1) + ',' + yB] = 'num';
    if (g[yB][fdx + 1] === '#') L.decor[(fdx + 1) + ',' + yB] = 'lamp';
    for (const r of rooms) {
      if (r.hidden || r.isolated) continue;
      const y = r.y0 - 1, ext = y === yT;
      for (let x = r.x0; x <= r.x1; x++) {
        if (g[y][x] !== '#' || L.decor[x + ',' + y] || furn.some(f => f.wall && f.at[0] === x && f.at[1] === y)) continue;
        const above = furn.find(f => f.at[1] === r.y0 && x >= f.at[0] && x < f.at[0] + f.at[2]);
        if (r.t === 'kitchen' || r.t === 'breakroom') { if (above && ['counter', 'sink', 'drawers', 'stove'].includes(above.art)) L.decor[x + ',' + y] = 'upper'; continue; }
        if (r.t === 'bath' && rnd() < .4 && x < r.x1) { pair(x, y, 'mirror'); continue; }
        if (above && above.H > 50) continue;
        const q = rnd();
        if (ext && q < .35 && x < r.x1) pair(x, y, 'window');
        else if (q < .12) L.decor[x + ',' + y] = pick(['frame', 'frame2', 'clock']);
        else if (q < .18 && x < r.x1 && (r.t === 'living' || r.t === 'study' || r.t === 'foyer' || r.t === 'dining')) pair(x, y, 'painting');
        else if (q < .2 && (r.t === 'closet' || r.t === 'storage' || r.t === 'backroom')) L.decor[x + ',' + y] = pick(['tally', 'scrawl', 'hooks']);
      }
    }
    for (const f of furn) if (f.art === 'coffee') { const r = roomOfCh[f.room]; L.rugs.push([Math.max(r.x0, f.at[0] - .6), Math.max(r.y0, f.at[1] - 1.3), f.at[2] + 1.2, 3, 1]); }
    for (const f of furn) if (f.art === 'bed') { L.rugs.push([f.at[0] + f.at[2] + .3, f.at[1] + 1, 2.6, 1.8, 0]); }
    if (spine.y1 - spine.y0 > 4 && !secOut.some(s => s.type === 'rug' && s.room === spine.ch)) L.rugs.push([spine.x0 + (spine.x1 - spine.x0) / 2 - .5 + .25, spine.y0 + 1, 1.5, spine.y1 - spine.y0 - 1, 2]);
    for (const r of rooms) if (r.t === 'bath') L.rugs.push([r.x0 + .5, r.y1 - .2, 1.6, 1, 3]);

    // ---- final check: every room reachable, every container reachable
    const fd = reach();
    for (const r of rooms) { if (r.hidden || r.isolated) continue; let any = false; for (let y = r.y0; y <= r.y1 && !any; y++) for (let x = r.x0; x <= r.x1; x++) if (fd[y * MW + x] >= 0) { any = true; break; } if (!any) return null; }
    for (const f of furn) if ((f.loot || f.mustReach) && !f.pocket && !accessible(f, fd)) return null;

    // ---- output
    for (const r of rooms) { const def = ROOMS[r.t]; L.rooms[r.ch] = r.hidden ? { name: 'Hidden room', style: 's', hidden: true } : r.isolated ? { name: 'Attic', style: 'a', isolated: true } : { name: def ? def.n : 'Room', style: def ? def.st : 'h', kind: r.t }; }
    L.rooms.o = { name: front ? 'Sidewalk' : 'Stoop', style: 'o' };
    const num = ri(2, 480), street = pick(D.STREETS);
    Object.assign(L, {
      type, name: bt.n, size: bt.size, rows: g.map(row => row.join('')), street: 'o', streetY: yB + 1, frontDoor: fdx + ',' + yB,
      stoop: { x: fdx + .5 }, start, houseNum: num, address: num + ' ' + street, secrets: secOut,
      turkey: D.EVENT && rnd() < .35 ? { x: Math.max(1.5, fdx - 9), y: yB + 1.95 } : null,
      wanderer: rnd() < .55 || type === 'police', wandererT: ri(60, 110), wanderHp: rc.tough ? 150 : 100,
      emptyPct: .2, danger: bt.danger + (nZ > rc.zombies[0] + 1 ? 1 : 0),
      nZombies: L.zombies.length, nLocks: furn.filter(f => f.lock).length,
      lockNames: furn.filter(f => f.lock).map(f => f.name),
    });
    L.danger = Math.min(5, L.danger);
    // furniture: drop generator-only fields
    for (const f of furn) { delete f.lockable; delete f.mustLock; delete f.used; delete f.mustReach; }
    return L;
  }
  function range(a, b) { const o = []; for (let i = a; i <= b; i++) o.push(i); return o; }

  // ---------------------------------------------------------------- the hand-made tutorial house (first run)
  GEN.tutorial = function () {
    const r = (s, n) => s.repeat(n);
    const ATTIC = { 11: '######', 12: '#ZZZZ#', 13: '#ZZZZ#', 14: '#ZZZZ#', 15: '#ZZZZ#', 16: '######' };
    const raw = [
      r(' ', 24), ' ' + r('#', 22) + ' ', ...Array(7).fill(' #' + r('k', 20) + '# '), ' ' + r('#', 19) + 'K## ',
      ' #ssss#bbbbbb#cccc#hhh# ', ' #ssss#bbbbbb#cccc#hhh# ', ' #ssss#bbbbbb#ccccChhh# ', ' #ssss#bbbbbb#cccc#hhh# ', ' ##X#####B#########hhh# ',
      ' #' + r('r', 16) + '#hhh# ', ' #' + r('r', 16) + '#hhh# ', ' #' + r('r', 16) + 'Rhhh# ', ' #' + r('r', 16) + '#hhh# ', ' #' + r('r', 16) + '#hhh# ',
      ' ' + r('#', 18) + 'hhh# ',
      ' #' + r('l', 16) + '#hhh# ', ' #' + r('l', 16) + '#hhh# ', ' #' + r('l', 16) + 'Lhhh# ', ' #' + r('l', 16) + '#hhh# ', ' #' + r('l', 16) + '#hhh# ', ' #' + r('l', 16) + '#hhh# ',
      ' ' + r('#', 19) + 'F## ', r('o', 24), r('o', 24),
    ].map((row, y) => row + (y >= 28 ? r('o', 6) : ATTIC[y] || r(' ', 6)));
    const DOORCH = { K: 'k', C: 'c', R: 'r', L: 'l', B: 'b', F: 'h', X: 's' };
    const doors = {};
    const rows = raw.map((row, y) => row.split('').map((c, x) => { if (DOORCH[c]) { doors[x + ',' + y] = DOORCH[c]; return c === 'X' ? '=' : '+'; } return c === 's' ? 'S' : c; }).join(''));
    doors['3,14'] = 'S';
    const furn = [
      { art: 'fridge', name: 'Fridge', at: [2, 2, 1, 1], H: 62, time: 2.4, noise: 5.5, loot: 'fridge' },
      { art: 'counter', name: 'Cabinets', at: [3, 2, 2, 1], H: 32, time: 1.8, noise: 2.5, loot: 'cabinet' },
      { art: 'stove', at: [5, 2, 1, 1], H: 32 }, { art: 'sink', at: [6, 2, 2, 1], H: 32 },
      { art: 'drawers', name: 'Kitchen drawers', at: [8, 2, 1, 1], H: 32, time: 1.6, noise: 3.5, loot: 'kdrawers' },
      { art: 'pantry', name: 'Pantry', at: [10, 2, 2, 1], H: 62, time: 2.6, noise: 4.5, loot: 'pantry' },
      { art: 'trash', at: [13, 2, 1, 1], H: 26 }, { art: 'hutch', at: [19, 2, 2, 1], H: 62 },
      { art: 'island', name: 'Island drawers', at: [4, 5, 3, 1], H: 32, time: 1.8, noise: 3, loot: 'island' },
      { art: 'table', at: [15, 4, 3, 2], H: 24, solid: 1, cloth: 1, items: 1 },
      { art: 'chair', at: [14, 4, 1, 1], H: 16, solid: 0 }, { art: 'chair', at: [18, 4, 1, 1], H: 16, solid: 0 }, { art: 'chair', at: [16, 3, 1, 1], H: 16, solid: 0 },
      { art: 'toilet', at: [7, 10, 1, 1], H: 24 },
      { art: 'vanity', name: 'Vanity', at: [8, 10, 2, 1], H: 30, time: 1.6, noise: 2.5, loot: 'vanity' },
      { art: 'medcab', name: 'Medicine cabinet', at: [10, 9, 1, 1], H: 0, time: 1.5, noise: 2, loot: 'medcab', wall: 1, solid: 0 },
      { art: 'tub', at: [11, 10, 2, 2], H: 24, solid: 1 },
      { art: 'shelves', name: 'Utility shelves', at: [14, 10, 2, 1], H: 58, time: 2.4, noise: 4, loot: 'shelves', extra: ['crowbar'] },
      { art: 'toolbox', name: 'Toolbox', at: [17, 10, 1, 1], H: 20, time: 1.8, noise: 3.5, loot: 'toolbox', lock: 'medium', extra: ['pole'] },
      { art: 'heater', at: [14, 13, 1, 1], H: 54, solid: 1 },
      { art: 'supply', at: [2, 10, 2, 1], H: 56 },
      { art: 'crate', name: 'Hidden crate', at: [4, 10, 2, 1], H: 30, time: 3, noise: 4, loot: 'crate', rare: 1, secretLoot: 1 },
      { art: 'crate', name: 'Old trunk', at: [25, 12, 2, 1], H: 30, time: 2.6, noise: 3, loot: 'attic', rare: 1, secretLoot: 1 },
      { art: 'cot', at: [5, 11, 1, 2], H: 12, solid: 1 },
      { art: 'bookshelf', name: 'Bookshelf', at: [3, 15, 2, 1], H: 62, secret: 1, seed: 2 },
      { art: 'bed', at: [6, 15, 2, 3], H: 18 },
      { art: 'nightstand', name: 'Nightstand', at: [8, 15, 1, 1], H: 24, time: 1.5, noise: 2, loot: 'night' },
      { art: 'wardrobe', name: 'Bedroom closet', at: [12, 15, 2, 1], H: 64, time: 2.8, noise: 5, loot: 'wardrobe', lock: 'easy' },
      { art: 'safe', name: 'Gun safe', at: [2, 19, 1, 1], H: 46, time: 2.2, noise: 2, loot: 'safe', lock: 'hard' },
      { art: 'dresser', name: 'Dresser', at: [14, 15, 3, 1], H: 34, time: 2.4, noise: 3.5, loot: 'dresser', extra: ['note'] },
      { art: 'desk', name: 'Desk', at: [15, 19, 2, 1], H: 30, time: 2, noise: 2.5, loot: 'desk' },
      { art: 'chair', at: [15, 18, 1, 1], H: 16, solid: 0 },
      { art: 'sofa', at: [4, 21, 3, 1], H: 26 }, { art: 'sidetable', at: [7, 21, 1, 1], H: 24 }, { art: 'coffee', at: [4, 23, 3, 1], H: 16, solid: 1 },
      { art: 'tvstand', name: 'TV stand', at: [4, 26, 3, 1], H: 26, time: 1.8, noise: 2.5, loot: 'tv' },
      { art: 'armchair', at: [9, 22, 1, 1], H: 22, solid: 1 }, { art: 'bookshelf', at: [13, 21, 2, 1], H: 62, seed: 5 }, { art: 'plant', at: [16, 21, 1, 1], H: 20, solid: 1 },
      { art: 'coat', name: 'Coat closet', at: [21, 10, 1, 1], H: 64, time: 2.4, noise: 4.5, loot: 'coat' },
      { art: 'sidetable', name: 'Hall table', at: [21, 19, 1, 1], H: 24, time: 1.4, noise: 2, loot: 'hall' },
      { art: 'shoerack', at: [21, 26, 1, 1], H: 14, solid: 1 },
      { art: 'trash', name: 'Garbage bin', at: [15, 28, 1, 1], H: 26, time: 1.4, noise: 3, loot: 'trash', noEmpty: 1 },
      { art: 'lamppost', at: [12, 28, 1, 1], H: 112, solid: 1 },
    ];
    furn.forEach(f => { if (['Dresser', 'Toolbox', 'Utility shelves'].includes(f.name)) f.noEmpty = 1; });
    const sofaIdx = furn.findIndex(f => f.art === 'sofa'), shelfIdx = furn.findIndex(f => f.secret);
    return {
      id: 'tutorial', type: 'tutorial', name: 'Rowhouse', size: 'M', address: '14 Halsey St', houseNum: 14, danger: 1,
      rows, doors, street: 'o', streetY: 28, frontDoor: '20,27', stoop: { x: 20.5 }, start: { x: 20.5, y: 28.6 },
      rooms: { k: { name: 'Kitchen', style: 'k' }, b: { name: 'Bathroom', style: 'b' }, c: { name: 'Utility closet', style: 'c' }, S: { name: 'Hidden room', style: 's', hidden: true },
        r: { name: 'Bedroom', style: 'r' }, l: { name: 'Living room', style: 'l' }, h: { name: 'Hallway', style: 'h' }, o: { name: 'Stoop', style: 'o' }, Z: { name: 'Attic', style: 'a', isolated: true } },
      furn,
      decor: {
        '3,1': 'upper', '4,1': 'upper', '6,1': 'upper', '7,1': 'upper', '8,1': 'upper', '12,1': 'clock', '15,1': 'window', '16,1': 'window', '17,1': 'window',
        '2,9': 'tally', '3,9': 'scrawl', '5,9': 'tally2', '8,9': 'mirror', '9,9': 'mirror', '15,9': 'hooks', '19,9': 'frame',
        '10,14': 'window', '11,14': 'window', '16,14': 'frame2', '5,20': 'painting', '6,20': 'painting', '10,20': 'window', '11,20': 'window', '16,20': 'clock',
        '4,27': 'fwin', '5,27': 'fwin', '10,27': 'fwin', '11,27': 'fwin', '15,27': 'fwin', '16,27': 'fwin', '19,27': 'num', '21,27': 'lamp',
      },
      rugs: [[9.3, 16, 4.4, 2.6, 0], [3.4, 22.2, 4.2, 3.4, 1], [19.5, 11, 2, 14, 2], [7.5, 12.2, 1.8, 1.2, 3]],
      zombies: [
        { x: 6.4, y: 21.62, st: 'sleep', sleep: { furn: sofaIdx, draw: { x: 6.45, y: 21.12 }, key: 22, wake: { x: 5.5, y: 22.55 } } },
        { x: 8.6, y: 12.7, st: 'idle' },
      ],
      secrets: [
        { type: 'shelf', furn: shelfIdx, room: 'S' },
        { type: 'rug', rug: { x: 14.2, y: 3.2, w: 4.6, h: 3.4 }, board: { x: 17.845, y: 5.436 }, room: 'k' },
        { type: 'attic', hatch: { x: 20.5, y: 15.6 }, hole: { x: 26.5, y: 15.2 }, room: 'Z' },
      ],
      note: NOTES.supper, turkey: { x: 8, y: 28.95 }, wanderer: true, wandererT: 70,
      nZombies: 2, nLocks: 3, lockNames: ['Toolbox', 'Bedroom closet', 'Gun safe'],
    };
  };
})();
