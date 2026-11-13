/* Dead Miles (next) - shared game data: items, loot tables, weapons, jobs, building types.
   Plain script; everything hangs off window.DM. */
'use strict';
window.DM = window.DM || {};
(() => {
  const D = DM.D = {};

  // ---------------------------------------------------------------- seeded random
  D.mulberry32 = function (a) {
    return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  };
  D.hashStr = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

  // ---------------------------------------------------------------- items
  // use: action label in the pack; hp/sta: what eating/using restores; w: weapon key
  D.ITEMS = {
    beans: { n: 'Canned beans', i: 'beans', use: 'Eat', hp: 8 },
    water: { n: 'Water bottle', i: 'water', use: 'Drink', sta: 50, hp: 2 },
    snack: { n: 'Chips', i: 'snack', use: 'Eat', hp: 5 },
    drink: { n: 'Soda', i: 'drink', use: 'Drink', sta: 35, hp: 2 },
    bandage: { n: 'Bandage', i: 'bandage', use: 'Use', hp: 25 },
    meds: { n: 'Painkillers', i: 'meds', use: 'Take', hp: 40 },
    wrench: { n: 'Rusty wrench', i: 'wrench' },
    scrap: { n: 'Scrap metal', i: 'scrap' },
    knife: { n: 'Kitchen knife', i: 'knife', w: 'knife' },
    bat: { n: 'Baseball bat', i: 'bat', w: 'bat' },
    axe: { n: 'Fire axe', i: 'axe', w: 'axe', rare: 1 },
    bow: { n: 'Hunting bow', i: 'bow', w: 'bow', rare: 1 },
    arrow: { n: 'Arrows', i: 'arrow' },
    crowbar: { n: 'Crowbar', i: 'crowbar', w: 'crowbar' },
    ammo: { n: '9mm rounds', i: 'ammo', rare: 1 },
    key: { n: 'Brass key', i: 'key', rare: 1 },
    cloth: { n: 'Cloth rags', i: 'cloth' },
    battery: { n: 'Batteries', i: 'battery' },
    tape: { n: 'Duct tape', i: 'tape' },
    book: { n: 'Paperback', i: 'book' },
    note: { n: 'Torn note', i: 'note', use: 'Read' },
    lockpick: { n: 'Lockpick', i: 'lockpick' },
    cranberry: { n: 'Cranberry sauce', i: 'cranberry', use: 'Eat', hp: 8 },
    stuffing: { n: 'Stuffing mix', i: 'stuffing', use: 'Eat', hp: 7 },
    pie: { n: 'Pumpkin pie', i: 'pie', use: 'Eat', hp: 12 },
    turkey: { n: 'Whole turkey', i: 'turkey', use: 'Eat', hp: 50, rare: 1 },
    hat: { n: 'Pilgrim hat', i: 'hat', rare: 1, tag: 'event cosmetic' },
    pole: { n: 'Hook pole', i: 'hook' },
    watch: { n: 'Pocket watch', i: 'watch', rare: 1 },
    jewelry: { n: 'Gold ring', i: 'ring', rare: 1 },
    // materials
    wood: { n: 'Wood planks', i: 'wood' },
    nails: { n: 'Nails', i: 'nails' },
    // crafted / traded gear
    spikedbat: { n: 'Spiked bat', i: 'spikedbat', w: 'spikedbat' },
    machete: { n: 'Machete', i: 'machete', w: 'machete' },
    prybar: { n: 'Pry bar', i: 'prybar', w: 'prybar' },
    packplus: { n: 'Reinforced pack', i: 'packplus', use: 'Fit', slots: 2 },
    backpack: { n: 'Hiking backpack', i: 'backpack', use: 'Fit', slots: 4, rare: 1 },
    shoes: { n: 'Quiet shoes', i: 'shoes', use: 'Wear' },
    lockset: { n: 'Lockpick set', i: 'lockset', use: 'Use', rare: 1 },
    parcel: { n: "Dot's lockbox", i: 'parcel', quest: 1, tag: 'quest item' },
    caps: { n: 'Bottle caps', i: 'caps' },
  };
  // blueprints: one item per recipe, e.g. bp_machete
  D.RECIPES = {
    bandage: { out: ['bandage', 2], in: { cloth: 2 }, n: 'Bandages' },
    lockpick: { out: ['lockpick', 2], in: { scrap: 1, tape: 1 }, n: 'Lockpicks' },
    arrow: { out: ['arrow', 6], in: { wood: 1, scrap: 1 }, n: 'Arrows' },
    spikedbat: { out: ['spikedbat', 1], in: { bat: 1, nails: 6, tape: 1 }, n: 'Spiked bat' },
    machete: { out: ['machete', 1], in: { scrap: 4, wood: 1, tape: 1 }, n: 'Machete' },
    packplus: { out: ['packplus', 1], in: { cloth: 4, tape: 2, scrap: 1 }, n: 'Reinforced pack (+2 slots)' },
    shoes: { out: ['shoes', 1], in: { cloth: 3, tape: 1 }, n: 'Quiet shoes (footsteps -30%)' },
    lockset: { out: ['lockset', 1], in: { lockpick: 2, scrap: 2, tape: 1 }, n: 'Lockpick set (easier locks)' },
    prybar: { out: ['prybar', 1], in: { scrap: 5, tape: 1 }, n: 'Pry bar (quiet prying)' },
  };
  D.BASIC = ['bandage', 'lockpick'];
  for (const k in D.RECIPES) if (!D.BASIC.includes(k)) D.ITEMS['bp_' + k] = { n: 'Blueprint: ' + D.RECIPES[k].n.replace(/ \(.*\)/, ''), i: 'blueprint', use: 'Learn', bp: k, rare: 1 };
  // what the trader pays (caps each); she sells for about 4x
  D.VALUE = { beans: 2, water: 2, snack: 1, drink: 1, bandage: 3, meds: 6, wrench: 3, scrap: 1, knife: 6, bat: 12, axe: 30, bow: 35, arrow: .5, crowbar: 15, ammo: .5, key: 4, cloth: 1, battery: 2, tape: 2, book: 1,
    lockpick: 3, cranberry: 3, stuffing: 3, pie: 4, turkey: 20, hat: 0, pole: 2, watch: 25, jewelry: 20, wood: 1, nails: .25, spikedbat: 20, machete: 22, prybar: 14, packplus: 15, backpack: 40, shoes: 10, lockset: 18, note: 0, parcel: 0 };
  D.valueOf = (k, d) => { if (k.startsWith('bp_')) return 25; let v = D.VALUE[k] || 1; if (d != null && D.ITEMS[k] && D.ITEMS[k].w) v = Math.max(1, Math.round(v * (.3 + .7 * d / D.WEAPONS[D.ITEMS[k].w].dur))); return v; };
  // how many fit in one slot (anything not listed does not stack)
  D.STACK = { wood: 10, nails: 20, lockpick: 5, arrow: 20, cranberry: 3, stuffing: 3, pie: 3, water: 3, beans: 3, snack: 3, drink: 3, bandage: 5, meds: 5, ammo: 30, scrap: 10, cloth: 5, tape: 3, battery: 4 };
  D.stackMax = k => D.STACK[k] || 1;

  // melee: dmg, wind/strike/rec seconds, reach in tiles, durability. bow is ranged.
  D.WEAPONS = {
    fists: { n: 'Fists', dmg: 12, wind: .09, strike: .08, rec: .16, reach: 1.2, dur: 0, noise: 1 },
    knife: { n: 'Kitchen knife', dmg: 22, wind: .07, strike: .07, rec: .14, reach: 1.25, dur: 40, noise: 1.2 },
    bat: { n: 'Baseball bat', dmg: 34, wind: .12, strike: .1, rec: .22, reach: 1.55, dur: 60, noise: 4.5 },
    crowbar: { n: 'Crowbar', dmg: 30, wind: .14, strike: .1, rec: .24, reach: 1.5, dur: 90, noise: 4.5 },
    axe: { n: 'Fire axe', dmg: 50, wind: .22, strike: .12, rec: .32, reach: 1.6, dur: 50, noise: 5 },
    spikedbat: { n: 'Spiked bat', dmg: 42, wind: .12, strike: .1, rec: .22, reach: 1.55, dur: 70, noise: 4.5 },
    machete: { n: 'Machete', dmg: 40, wind: .09, strike: .08, rec: .18, reach: 1.45, dur: 60, noise: 3 },
    prybar: { n: 'Pry bar', dmg: 24, wind: .12, strike: .09, rec: .2, reach: 1.4, dur: 110, noise: 3.5 },
    bow: { n: 'Hunting bow', ranged: 1, dmg: 46, wind: .32, strike: .05, rec: .26, dur: 120, noise: .8 },
  };
  D.isWeapon = k => !!(D.ITEMS[k] && D.ITEMS[k].w);

  // merge rolled item keys into stacks; ammo/arrows come in handfuls; weapons carry durability
  D.toStacks = function (keys, rnd = Math.random) {
    const out = [];
    for (const k of keys) {
      const n = k === 'ammo' ? 4 + Math.floor(rnd() * 9) : k === 'arrow' ? 3 + Math.floor(rnd() * 5) : k === 'nails' ? 3 + Math.floor(rnd() * 6) : 1;
      if (D.isWeapon(k)) { const W = D.WEAPONS[D.ITEMS[k].w]; out.push({ k, n: 1, d: Math.round(W.dur * (.45 + rnd() * .5)) }); continue; }
      const e = out.find(e => e.k === k && D.STACK[k]);
      if (e) e.n += n; else out.push({ k, n });
    }
    return out;
  };

  // Thanksgiving event: in the prototype an early preview from Nov 10 (the real game: around Nov 19 - Dec 2); ?event=thanksgiving or #thanksgiving forces it
  D.EVENT = (() => { const d = new Date(), m = d.getMonth(), dd = d.getDate(); return /[?&]event=thanksgiving\b/.test(location.search) || location.hash === '#thanksgiving' || (m === 10 && dd >= 10) || (m === 11 && dd <= 2); })();
  D.LOCKS = { easy: { w: 22, xp: 4, name: 'Easy' }, medium: { w: 14, xp: 6, name: 'Medium' }, hard: { w: 8, xp: 12, name: 'Hard' } };

  // ---------------------------------------------------------------- loot tables: [[min,max], weights, guaranteed]
  D.LOOT = {
    fridge: [[2, 3], { drink: 3, water: 3, beans: 1, snack: 2 }],
    cooler: [[2, 4], { drink: 5, water: 4 }],
    cabinet: [[1, 3], { beans: 3, snack: 2, water: 1 }],
    kdrawers: [[1, 2], { knife: 3, scrap: 1, battery: 2, tape: 1 }],
    pantry: [[2, 4], { beans: 4, snack: 3, water: 2 }],
    trash: [[0, 2], { wood: 1, nails: 1, scrap: 3, snack: 1 }],
    island: [[1, 2], { knife: 1, scrap: 2, tape: 1, battery: 1 }],
    vanity: [[1, 2], { cloth: 2, bandage: 2, meds: 1 }],
    medcab: [[2, 3], { meds: 3, bandage: 3 }],
    shelves: [[2, 3], { wood: 2, nails: 2, cloth: 2, tape: 2, battery: 2, scrap: 2, lockpick: 1 }],
    toolbox: [[2, 3], { nails: 3, wood: 1, wrench: 3, scrap: 3, tape: 2, lockpick: 1 }],
    crate: [[4, 5], { 'bp_*': 1, nails: 2, ammo: 5, meds: 3, bandage: 2, battery: 1, key: 1, axe: 1 }, ['ammo', 'meds']],
    books: [[1, 1], { book: 4, key: 1 }],
    night: [[1, 2], { meds: 2, battery: 2, key: 1, book: 1 }],
    wardrobe: [[1, 3], { cloth: 4, battery: 1 }],
    dresser: [[1, 3], { cloth: 3, battery: 1, ammo: 1, bandage: 1 }],
    desk: [[1, 2], { scrap: 2, battery: 2, key: 1, tape: 1, book: 1, lockpick: 1 }],
    tv: [[1, 2], { battery: 2, scrap: 2 }],
    coat: [[1, 2], { cloth: 3, snack: 1, key: 1 }],
    hall: [[1, 1], { key: 2, battery: 1 }],
    hutch: [[1, 2], { jewelry: 1, cloth: 2, battery: 1 }],
    side: [[1, 1], { battery: 2, key: 1, snack: 1 }],
    corpse: [[0, 1], { scrap: 1, ammo: 1, snack: 1, bandage: 1 }],
    safe: [[3, 4], { 'bp_*': 1, ammo: 5, meds: 1, watch: 1, jewelry: 1 }, ['ammo', 'ammo', 'jewelry']],
    cache: [[3, 4], { watch: 2, jewelry: 3, ammo: 3, meds: 2 }, ['jewelry', 'watch']],
    attic: [[3, 4], { 'bp_*': 1, watch: 2, jewelry: 2, ammo: 3, meds: 2, battery: 1, bow: 1 }, ['watch']],
    wallcache: [[2, 3], { 'bp_*': 1, ammo: 3, meds: 2, jewelry: 2, lockpick: 2 }, ['ammo']],
    // commercial / civic
    store: [[1, 3], { beans: 3, snack: 4, drink: 2, water: 2, battery: 1 }],
    register: [[1, 2], { battery: 2, key: 1, snack: 1, lockpick: 1 }],
    storage: [[2, 3], { wood: 2, nails: 1, beans: 2, water: 2, cloth: 2, scrap: 2, tape: 1 }],
    pharm: [[1, 3], { bandage: 3, meds: 2, water: 1, snack: 1 }],
    pharmstore: [[2, 3], { meds: 3, bandage: 3, cloth: 1 }],
    cage: [[3, 4], { meds: 5, bandage: 3 }, ['meds', 'meds']],
    locker: [[1, 2], { ammo: 2, cloth: 2, bandage: 1, snack: 1, knife: 1 }],
    evidence: [[1, 3], { 'bp_*': 1, ammo: 3, jewelry: 1, watch: 1, key: 1, knife: 1 }],
    armory: [[3, 5], { ammo: 6, bat: 1, crowbar: 1, meds: 1 }, ['ammo', 'ammo']],
    filing: [[0, 2], { key: 2, book: 1, battery: 1, lockpick: 1 }],
    gym: [[1, 3], { wood: 1, bat: 2, arrow: 2, water: 2, cloth: 1 }],
    nurse: [[2, 3], { bandage: 4, meds: 2 }],
    workbench: [[2, 3], { 'bp_*': 1, wood: 3, nails: 4, scrap: 4, tape: 2, wrench: 2, crowbar: 1, battery: 1 }],
    garage: [[1, 3], { nails: 2, wood: 1, scrap: 3, tape: 2, battery: 2, crowbar: 1, axe: 1 }],
    washer: [[0, 2], { cloth: 4, key: 1, jewelry: 1 }],
    wine: [[1, 2], { drink: 3, jewelry: 1 }],
    cellar: [[2, 3], { wood: 2, beans: 3, water: 2, axe: 1, ammo: 1 }],
  };
  if (D.EVENT) {
    Object.assign(D.LOOT.fridge[1], { cranberry: 2, pie: 2 }); Object.assign(D.LOOT.pantry[1], { stuffing: 3, cranberry: 2 }); Object.assign(D.LOOT.cabinet[1], { stuffing: 2, cranberry: 1 });
    Object.assign(D.LOOT.store[1], { cranberry: 2, stuffing: 2 }); Object.assign(D.LOOT.storage[1], { stuffing: 1, pie: 1 });
  }
  D.rollLoot = function (key, rnd = Math.random) {
    const [[a, b], tab, guaranteed] = D.LOOT[key];
    const out = guaranteed ? guaranteed.slice() : [];
    let n = a + Math.floor(rnd() * (b - a + 1)) - out.length;
    if (key === 'corpse' && rnd() > .45) n = 0;
    const ks = Object.keys(tab), tot = ks.reduce((s, k) => s + tab[k], 0);
    for (let i = 0; i < n; i++) { let v = rnd() * tot; for (const k of ks) { v -= tab[k]; if (v <= 0) { out.push(k); break; } } }
    for (let i = 0; i < out.length; i++) if (out[i] === 'bp_*') { const b = Object.keys(D.ITEMS).filter(x => x.startsWith('bp_')); out[i] = b[Math.floor(rnd() * b.length)]; }
    return out;
  };

  // ---------------------------------------------------------------- scavenging skill
  D.XPCUM = L => L <= 1 ? 0 : Math.round(14 * Math.pow(L - 1, 1.75) + (L > 5 ? 30 * (L - 5) * (L - 5) : 0));
  D.PERKS = { 3: ['Quiet hands', 'Searches make 25% less noise'], 6: ['Keen eye', 'Hidden clues glow, rare loot sparkles'], 9: ['Pack rat', '+2 pack slots'] };
  D.scavLvl = xp => { let L = 1; while (L < 10 && xp >= D.XPCUM(L + 1)) L++; return L; };

  // ---------------------------------------------------------------- jobs
  D.JOBS = {
    hunter: { n: 'Hunter', perk: 'Quiet ranged kills with a bow. Arrows can be picked back up. Sneak attacks hit harder.', kit: [['bow', 1], ['arrow', 14], ['knife', 1], ['water', 1]], hands: 'bow',
      stats: ['Bow: aim with your facing, ~46 dmg', 'Sneak hits x1.6 (any weapon)'] },
    scavenger: { n: 'Scavenger', perk: 'Searches 15% faster, +10% extra-loot chance, and secrets open after 65% of a house (not 75%).', kit: [['bat', 1], ['lockpick', 2], ['beans', 2], ['water', 1]], hands: 'bat',
      stats: ['Search speed +15%', 'Secret gate 65%'] },
    thief: { n: 'Thief', perk: 'Lockpicking expert: wider sweet spots, picks break half as often, quieter footsteps.', kit: [['knife', 1], ['lockpick', 5], ['snack', 2], ['water', 1]], hands: 'knife',
      stats: ['Sweet spots x1.6 wider', 'Picks last 2x longer', 'Footsteps -40% noise'] },
    brawler: { n: 'Brawler', perk: 'Hits 30% harder in melee and can take more punishment (130 HP).', kit: [['bat', 1], ['bandage', 2], ['beans', 1], ['water', 1]], hands: 'bat',
      stats: ['Melee damage +30%', 'Max HP 130'] },
    mechanic: { n: 'Mechanic', perk: 'Starts with a crowbar. Prying is half as loud. Weapon repairs cost half (more base work later).', kit: [['crowbar', 1], ['scrap', 4], ['tape', 1], ['water', 1]], hands: 'crowbar',
      stats: ['Prying noise -50%', 'Repairs cost 1 scrap'] },
  };
  D.LOOKS = [ // hood/coat colours [main, shade]
    { n: 'Ember', c: ['#f07b3c', '#c95f2c'] }, { n: 'Teal', c: ['#3fa7a0', '#2c7c77'] }, { n: 'Plum', c: ['#9a62b8', '#744690'] },
    { n: 'Moss', c: ['#7c9a4c', '#5c7836'] }, { n: 'Brick', c: ['#c94a4a', '#9e3434'] }, { n: 'Mustard', c: ['#e0b43c', '#b48a28'] },
  ];

  // ---------------------------------------------------------------- building types (generator recipes live in gen.js)
  D.BTYPES = {
    tutorial: { n: 'Rowhouse', size: 'M', danger: 1, w: 0 },
    rowS: { n: 'Rowhouse', size: 'S', danger: 1, w: 26 },
    rowL: { n: 'Rowhouse', size: 'L', danger: 2, w: 14, big: 1 },
    apt: { n: 'Apartment unit', size: 'S', danger: 1, w: 18 },
    bodega: { n: 'Bodega', size: 'S', danger: 2, w: 12 },
    laundro: { n: 'Laundromat', size: 'S', danger: 1, w: 9 },
    garage: { n: 'Auto shop', size: 'M', danger: 2, w: 8, big: 1 },
    pharmacy: { n: 'Pharmacy', size: 'M', danger: 3, w: 6, big: 1 },
    school: { n: 'School', size: 'L', danger: 3, w: 4, big: 2 },
    police: { n: 'Police station', size: 'L', danger: 4, w: 3, big: 2 },
    mansion: { n: 'Mansion', size: 'XL', danger: 4, w: .8, big: 3 },
  };
  // ---------------------------------------------------------------- trader + quests
  D.TRADER = {
    name: 'Auntie Dot', place: "Dot's Swap Shop · old laundromat on Fulton",
    lines: [
      ['Caps on the counter, sugar. I don\'t run a charity - I run the last honest shop in Bed-Stuy.', 'You look like you walked here. Good. The ones who drive don\'t come back.'],
      ['Well, look who keeps coming back. I might even learn your name.', 'Bring me what I ask and I\'ll open the back shelf for you.'],
      ['You\'re getting a reputation, baby. The good kind. Mostly.', 'Got a cousin who sends me blueprints. Don\'t ask which cousin.'],
      ['Half this block owes you a favor now. I keep a list.', 'For you? Real stock. Don\'t tell the others.'],
      ['If this city has a future, it walks in sneakers like yours.', 'Name your price. Then I\'ll name mine. Then we\'ll laugh.'],
    ],
  };
  D.QUESTS = {
    hunt: { n: 'Hunt', d: t => `Put down ${4 + t * 3} zombies, anywhere.`, need: t => 4 + t * 3 },
    secrets: { n: 'Secrets', d: t => `Find ${t >= 4 ? 3 : t >= 2 ? 2 : 1} hidden compartment${t >= 2 ? 's' : ''}.`, need: t => t >= 4 ? 3 : t >= 2 ? 2 : 1 },
    supply: { n: 'Supply run', d: (t, q) => `Bring Dot ${q.need} ${D.ITEMS[q.item].n.toLowerCase()}.`, need: t => 2 + t },
    clear: { n: 'Clear', d: (t, q) => `Clear every zombie out of ${q.addr}. It is ${q.away.toLocaleString('en-US')} steps away.`, need: () => 1 },
    fetch: { n: 'Fetch', d: (t, q) => `Find Dot's lockbox in ${q.addr}, ${q.away.toLocaleString('en-US')} steps away.`, need: () => 1 },
  };
  D.QUEST_HOUSE = { 1: ['rowS', 'apt'], 2: ['bodega', 'laundro', 'rowL'], 3: ['pharmacy', 'garage'], 4: ['school', 'rowL'], 5: ['police', 'mansion'] };
  D.SHOP = [ // [item, count, price, min trader level, chance]
    ['beans', 3, 9, 1, .9], ['water', 3, 8, 1, .9], ['snack', 3, 5, 1, .6], ['bandage', 3, 12, 1, .8], ['meds', 2, 24, 1, .6], ['lockpick', 3, 14, 1, .8],
    ['arrow', 10, 3, 1, .8], ['cloth', 4, 4, 1, .5], ['tape', 2, 8, 1, .5], ['nails', 12, 1, 1, .5], ['wood', 4, 4, 1, .5], ['crowbar', 1, 60, 1, .6], ['bat', 1, 45, 1, .5], ['knife', 1, 25, 1, .5],
    ['backpack', 1, 150, 2, 1], ['machete', 1, 90, 2, .5], ['ammo', 15, 2, 2, .6], ['prybar', 1, 65, 2, .5], ['axe', 1, 120, 3, .5], ['bow', 1, 130, 3, .4], ['lockset', 1, 80, 3, .5],
    ['bp_*', 1, 110, 2, .45], ['bp_*', 1, 110, 4, .6],
  ];
  D.STREETS = ['Halsey St', 'Bergen St', 'Dean St', 'Putnam Ave', 'Jefferson Ave', 'Macon St', 'Decatur St', 'Hancock St', 'Lafayette Ave', 'Greene Ave', 'Quincy St', 'Gates Ave', 'Madison St', 'Monroe St', 'Kosciuszko St', 'Stuyvesant Ave', 'Tompkins Ave', 'Marcy Ave', 'Nostrand Ave', 'Bedford Ave', 'Franklin Ave', 'Classon Ave', 'Atlantic Ave', 'Fulton St', 'Pacific St', 'Prospect Pl', 'Sterling Pl', 'St Marks Ave', 'Park Pl', 'Sterling St'];
})();
