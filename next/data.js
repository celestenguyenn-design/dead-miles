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
  // use: action label in the pack; hp/sta: what eating/using restores; hu/th: hunger/thirst it fills (0.8, food.js); w: weapon key
  D.ITEMS = {
    beans: { n: 'Canned beans', i: 'beans', use: 'Eat', hp: 5, hu: 30 },
    water: { n: 'Water bottle', i: 'water', use: 'Drink', sta: 50, th: 40 },
    snack: { n: 'Chips', i: 'snack', use: 'Eat', hp: 3, hu: 10 },
    drink: { n: 'Soda', i: 'drink', use: 'Drink', sta: 35, th: 25, hu: 5 },
    coffee: { n: 'Canned coffee', i: 'coffee', use: 'Drink', sta: 60, th: 15 },
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
    key: { n: 'Brass key', i: 'key', rare: 1, tag: 'car & door key' },
    cloth: { n: 'Cloth rags', i: 'cloth' },
    battery: { n: 'Batteries', i: 'battery' },
    tape: { n: 'Duct tape', i: 'tape' },
    book: { n: 'Paperback', i: 'book' },
    note: { n: 'Torn note', i: 'note', use: 'Read' },
    lockpick: { n: 'Lockpick', i: 'lockpick' },
    cranberry: { n: 'Cranberry sauce', i: 'cranberry', use: 'Eat', hp: 5, hu: 15, th: 15 },
    stuffing: { n: 'Stuffing mix', i: 'stuffing', use: 'Eat', hp: 4, hu: 25 },
    pie: { n: 'Pumpkin pie', i: 'pie', use: 'Eat', hp: 8, hu: 50 },
    turkey: { n: 'Whole turkey', i: 'turkey', use: 'Eat', hp: 30, hu: 90, rare: 1 },
    hat: { n: 'Pilgrim hat', i: 'hat', rare: 1, tag: 'event cosmetic' },
    // Christmas (phase 5a): gift boxes are opened at home (Pack & stash > Open)
    gift: { n: 'Gift box', i: 'gift', gift: 1, rare: 1, tag: 'open it at home' },
    candy: { n: 'Candy cane', i: 'candy', use: 'Eat', hp: 2, sta: 25, hu: 6 },
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
    // farming (phase 4): seeds are planted in garden beds at the base; grown food is the reliable food supply
    seed_tomato: { n: 'Tomato seeds', i: 'seed_tomato', seed: 'tomato', tag: 'plant at the base' },
    seed_potato: { n: 'Seed potatoes', i: 'seed_potato', seed: 'potato', tag: 'plant at the base' },
    seed_carrot: { n: 'Carrot seeds', i: 'seed_carrot', seed: 'carrot', tag: 'plant at the base' },
    seed_corn: { n: 'Corn seeds', i: 'seed_corn', seed: 'corn', tag: 'plant at the base' },
    seed_herbs: { n: 'Herb seeds', i: 'seed_herbs', seed: 'herbs', tag: 'plant at the base' },
    tomato: { n: 'Tomatoes', i: 'tomato', use: 'Eat', hp: 4, sta: 10, hu: 14, th: 8 },
    potato: { n: 'Potatoes', i: 'potato', use: 'Eat', hp: 6, hu: 25 },
    carrot: { n: 'Carrots', i: 'carrot', use: 'Eat', hp: 4, sta: 10, hu: 14, th: 4 },
    corn: { n: 'Corn', i: 'corn', use: 'Eat', hp: 5, hu: 20 },
    herbs: { n: 'Fresh herbs', i: 'herbs', use: 'Eat', hp: 10, hu: 8 },
  };
  // crops: watered days to grow, harvest yield
  D.CROPS = {
    tomato: { n: 'Tomato', days: 4, yield: [2, 4], col: '#d9483a' },
    potato: { n: 'Potato', days: 3, yield: [2, 4], col: '#c9a06a' },
    carrot: { n: 'Carrot', days: 3, yield: [2, 3], col: '#f07b3c' },
    corn: { n: 'Corn', days: 5, yield: [2, 3], col: '#e0b94a' },
    herbs: { n: 'Herbs', days: 3, yield: [2, 3], col: '#7c9a4c' },
  };
  // decor: furniture, posters, rugs, lights, plants found while looting, placed at the base.
  // art: ART.FURN key; w,h footprint in tiles; H height; rot 'flip' (mirror) or 'swap' (turns the footprint); wall: hangs on a wall
  D.DECOR = {
    d_armchair: { n: 'Armchair', art: 'armchair', w: 1, h: 1, H: 22, rot: 'flip', v: 6 },
    d_sofa: { n: 'Old sofa', art: 'sofa', w: 3, h: 1, H: 26, rot: 'flip', v: 8 },
    d_bookshelf: { n: 'Bookshelf', art: 'bookshelf', w: 2, h: 1, H: 62, rot: 'flip', v: 6 },
    d_table: { n: 'Coffee table', art: 'coffee', w: 2, h: 1, H: 16, rot: 'swap', v: 4 },
    d_bench: { n: 'Park bench', art: 'bench', w: 2, h: 1, H: 20, rot: 'swap', v: 4 },
    d_plant: { n: 'Potted plant', art: 'plant', w: 1, h: 1, H: 20, rot: 'flip', v: 3 },
    d_cactus: { n: 'Cactus', art: 'dcactus', w: 1, h: 1, H: 30, rot: 'flip', v: 3 },
    d_flowers: { n: 'Flower box', art: 'dflowers', w: 2, h: 1, H: 16, rot: 'swap', v: 4 },
    d_lamp: { n: 'Floor lamp', art: 'dlamp', w: 1, h: 1, H: 70, rot: 'flip', glow: 1, v: 6 },
    d_lantern: { n: 'Camp lantern', art: 'dlantern', w: 1, h: 1, H: 18, rot: 'flip', glow: 1, solid: 0, v: 5 },
    d_lights: { n: 'String lights', art: 'dlights', w: 3, h: 1, H: 0, rot: 'flip', wall: 1, glow: 1, v: 6 },
    d_rug: { n: 'Woven rug', art: 'drug', w: 3, h: 2, H: 0, rot: 'swap', solid: 0, floor: 1, col: 0, v: 5 },
    d_rug2: { n: 'Round rug', art: 'drug2', w: 2, h: 2, H: 0, rot: 'swap', solid: 0, floor: 1, v: 5 },
    d_poster: { n: 'Band poster', art: 'dposter', w: 1, h: 1, H: 0, rot: 'flip', wall: 1, v: 3 },
    d_poster2: { n: 'Movie poster', art: 'dposter2', w: 1, h: 1, H: 0, rot: 'flip', wall: 1, v: 3 },
    d_map: { n: 'Map of Brooklyn', art: 'dmap', w: 2, h: 1, H: 0, rot: 'flip', wall: 1, v: 5 },
    d_gnome: { n: 'Garden gnome', art: 'dgnome', w: 1, h: 1, H: 26, rot: 'flip', v: 7 },
    d_flamingo: { n: 'Lawn flamingo', art: 'dflamingo', w: 1, h: 1, H: 40, rot: 'flip', solid: 0, v: 5 },
  };
  for (const k in D.DECOR) D.ITEMS[k] = { n: D.DECOR[k].n, i: k, decor: 1, tag: 'decor' };
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
  // ---------------------------------------------------------------- 0.15: item categories (shown on pack / stash / loot cards)
  // owner: "inventory items should tell us 'materials' like for crafting or should be 'sold' - there's a lot of random shit like paperbacks"
  D.CATS = {
    food: { n: 'Food', c: '#a9c46a' }, drink: { n: 'Drink', c: '#7ec0ee' }, med: { n: 'Medical', c: '#ff8a7a' }, weapon: { n: 'Weapon', c: '#f07b3c' },
    ammo: { n: 'Ammo', c: '#e0b94a' }, tool: { n: 'Tool', c: '#9fe0e6' }, gear: { n: 'Gear', c: '#b98cf0' }, mat: { n: 'Material', c: '#d9a46a' },
    sell: { n: 'Sell', c: '#ffd27a' }, key: { n: 'Key', c: '#e0b94a' }, seed: { n: 'Seed', c: '#93c45a' }, decor: { n: 'Decor', c: '#f07aa8' },
    event: { n: 'Event', c: '#e8609a' }, bp: { n: 'Blueprint', c: '#9fe0e6' }, quest: { n: 'Quest', c: '#ffd27a' }, note: { n: 'Note', c: '#cfc4ec' }, cos: { n: 'Cosmetic', c: '#f07aa8' },
  };
  D.CAT_ORDER = ['weapon', 'ammo', 'med', 'food', 'drink', 'tool', 'gear', 'key', 'bp', 'mat', 'seed', 'decor', 'event', 'quest', 'note', 'sell', 'cos'];
  D.cat = function (k) {
    const it = D.ITEMS[k]; if (!it) return 'sell';
    if (it.cos) return 'cos'; if (it.decor) return 'decor'; if (it.seed) return 'seed'; if (it.quest) return 'quest'; if (k === 'key') return 'key';
    if (it.bp) return 'bp'; if (it.w) return 'weapon'; if (k === 'ammo' || k === 'arrow') return 'ammo'; if (it.gift || k === 'hat') return 'event';
    if (it.use === 'Drink') return 'drink'; if (it.use === 'Eat') return 'food'; if (it.hp) return 'med'; if (k === 'note') return 'note';
    if (it.slots || k === 'shoes' || k === 'lockset') return 'gear'; if (k === 'lockpick' || k === 'pole') return 'tool';
    return D.uses(k).length ? 'mat' : 'sell';
  };
  // what a material goes into: workbench recipes, then base building (base.js PIECES, if loaded)
  D.uses = function (k) {
    const out = [];
    for (const r in D.RECIPES) if (D.RECIPES[r].in[k]) out.push(D.RECIPES[r].n.replace(/ \(.*\)/, '').toLowerCase());
    const PC = DM.Base && DM.Base.PIECES;
    if (PC) for (const p in PC) if (PC[p].tiers.some(t => t.m[k])) out.push(PC[p].n.toLowerCase());
    return out;
  };
  // the one-line label: "Material · arrows, spiked bat", "Sell to Dot · 25 caps"
  D.catLine = function (k, d) {
    const c = D.cat(k), C = D.CATS[c];
    if (c === 'mat') { const u = D.uses(k); return C.n + ' · ' + u.slice(0, 3).join(', ') + (u.length > 3 ? ' +' + (u.length - 3) : ''); }
    if (c === 'sell') return 'Sell to Dot · ' + Math.max(1, Math.floor(D.valueOf(k, d))) + ' caps';
    if (k === 'ammo') return 'Ammo · no gun for it yet, Dot buys it';
    if (k === 'arrow') return 'Ammo · for the bow (fill the quiver)';
    if (c === 'tool') return C.n + (k === 'lockpick' ? ' · picks locks, and a material' : ' · opens attic hatches');
    return C.n;
  };
  for (const k in D.RECIPES) if (!D.BASIC.includes(k)) D.ITEMS['bp_' + k] = { n: 'Blueprint: ' + D.RECIPES[k].n.replace(/ \(.*\)/, ''), i: 'blueprint', use: 'Learn', bp: k, rare: 1 };
  // ---------------------------------------------------------------- cosmetics (phase 5): earned, never in the pack
  // Looting one unlocks it straight into the Wardrobe (game.js unlockCos). src says where it comes from (the hint on a locked one):
  // loot = any house, corpse = zombies, police / mansion = those buildings, horde = horde-night crates, quest = Dot's quest rewards,
  // trader = Dot's shop from trader level lv, event = Thanksgiving. Art: ART.LOOK.COS. Item key: 'cos_' + key.
  D.COS_SLOTS = [['hat', 'Hat'], ['face', 'Face'], ['neck', 'Neck'], ['back', 'Back'], ['outfit', 'Outfit']];
  D.RARITY = { c: { n: 'Common', w: 60, caps: 3, price: 30 }, r: { n: 'Rare', w: 28, caps: 6, price: 55 }, e: { n: 'Epic', w: 10, caps: 12, price: 95 }, l: { n: 'Legendary', w: 3, caps: 25, price: 160 } };
  D.COS = {
    beanie: { n: 'Knit beanie', slot: 'hat', r: 'c', src: 'loot' }, cap: { n: 'Baseball cap', slot: 'hat', r: 'c', src: 'loot' }, bucket: { n: 'Bucket hat', slot: 'hat', r: 'c', src: 'loot' },
    hardhat: { n: 'Hard hat', slot: 'hat', r: 'r', src: 'loot' }, beret: { n: 'Beret', slot: 'hat', r: 'r', src: 'mansion' },
    frog: { n: 'Frog hat', slot: 'hat', r: 'e', src: 'trader', lv: 2 }, bunny: { n: 'Bunny-ear beanie', slot: 'hat', r: 'e', src: 'trader', lv: 3 },
    pilgrim: { n: 'Pilgrim hat', slot: 'hat', r: 'l', src: 'event', ev: 'thanksgiving' },
    feathers: { n: 'Turkey-feather headband', slot: 'hat', r: 'r', src: 'event', ev: 'thanksgiving' }, pietin: { n: 'Pie-tin helmet', slot: 'hat', r: 'e', src: 'event', ev: 'thanksgiving' },
    santa: { n: 'Santa hat', slot: 'hat', r: 'r', src: 'event', ev: 'christmas' },
    round: { n: 'Round glasses', slot: 'face', r: 'c', src: 'loot' }, bandana: { n: 'Bandana', slot: 'face', r: 'c', src: 'corpse' },
    aviators: { n: 'Aviators', slot: 'face', r: 'r', src: 'police' }, hearts: { n: 'Heart shades', slot: 'face', r: 'r', src: 'quest' },
    gasmask: { n: 'Gas mask', slot: 'face', r: 'e', src: 'police' },
    scarf: { n: 'Knit scarf', slot: 'neck', r: 'c', src: 'loot' }, tags: { n: 'Dog tags', slot: 'neck', r: 'r', src: 'corpse' },
    pearls: { n: 'Pearl necklace', slot: 'neck', r: 'e', src: 'mansion' }, harvest: { n: 'Harvest scarf', slot: 'neck', r: 'e', src: 'event', ev: 'thanksgiving' },
    patched: { n: 'Patched pack', slot: 'back', r: 'c', src: 'loot' }, camo: { n: 'Camo pack', slot: 'back', r: 'r', src: 'horde' },
    teddy: { n: 'Teddy charm', slot: 'back', r: 'e', src: 'quest' }, lights: { n: 'Fairy-light pack', slot: 'back', r: 'l', src: 'trader', lv: 5 },
    candycane: { n: 'Candy-cane bat', slot: 'back', r: 'e', src: 'event', ev: 'christmas' },
    denim: { n: 'Denim jacket', slot: 'outfit', r: 'c', src: 'loot' }, raincoat: { n: 'Raincoat', slot: 'outfit', r: 'c', src: 'loot' },
    varsity: { n: 'Varsity jacket', slot: 'outfit', r: 'r', src: 'loot' }, puffer: { n: 'Puffer jacket', slot: 'outfit', r: 'e', src: 'trader', lv: 4 },
    leather: { n: 'Biker jacket', slot: 'outfit', r: 'l', src: 'police' },
    // weekly group boss (boss.js): a chance when the boss your party fought goes down
    wardencap: { n: "Warden's cap", slot: 'hat', r: 'e', src: 'boss' }, ashcrown: { n: 'Ash crown', slot: 'hat', r: 'l', src: 'boss' },
    stetho: { n: 'Stethoscope', slot: 'neck', r: 'e', src: 'boss' }, apron: { n: "Butcher's apron", slot: 'outfit', r: 'e', src: 'boss' },
  };
  D.cosHint = k => { const c = D.COS[k]; return { loot: 'Found in houses', corpse: 'Found on zombies', police: 'Police stations', mansion: 'Mansions', horde: 'Horde-night crates', quest: "Dot's quest rewards", trader: 'Trader level ' + c.lv, event: D.EVHINT[k] || 'Seasonal event', boss: D.BOSSHINT[k] || 'Weekly boss' }[c.src]; };
  D.BOSSHINT = { apron: 'Weekly boss: the Butcher of Bed-Stuy', ashcrown: 'Weekly boss: Mother Ash', wardencap: 'Weekly boss: the Bridge Warden', stetho: 'Weekly boss: the Night Nurse' };
  // where each event cosmetic comes from (the wardrobe also tags them "Thanksgiving 2026" etc.)
  D.EVHINT = { pilgrim: 'Thanksgiving: the zombie turkey', feathers: 'Thanksgiving: zombie turkeys', pietin: "Thanksgiving: Dot's dinner job", harvest: "Thanksgiving: Dot's jobs",
    santa: 'Christmas: the Krampus walker', candycane: "Christmas: Dot's gift job" };
  for (const k in D.COS) D.ITEMS['cos_' + k] = { n: D.COS[k].n, i: 'cos_' + k, cos: k, rare: D.COS[k].r !== 'c' ? 1 : 0, tag: D.RARITY[D.COS[k].r].n.toLowerCase() + ' cosmetic' };
  D.ITEMS.hat.cos = 'pilgrim';   // the old pack item (0.4) is the same pilgrim hat: picking one up unlocks it
  D.cosOwned = () => ({});       // game.js points this at the save's wardrobe, so rolls prefer cosmetics you do not have yet
  // pick a cosmetic from the pools ('loot' is always in): rarer = rarer, unowned first
  D.pickCos = function (pools, rnd = Math.random) {
    const own = D.cosOwned() || {}, ks = Object.keys(D.COS).filter(k => D.COS[k].src === 'loot' || pools.includes(D.COS[k].src));
    const rs = Object.keys(D.RARITY).filter(r => ks.some(k => D.COS[k].r === r)), boost = pools.length ? 1.8 : 1;   // special places lean rarer
    let v = rnd() * rs.reduce((a, r) => a + D.RARITY[r].w * (r === 'c' ? 1 : boost), 0), r = rs[0];
    for (const x of rs) { v -= D.RARITY[x].w * (x === 'c' ? 1 : boost); if (v <= 0) { r = x; break; } }
    let pick = ks.filter(k => D.COS[k].r === r);
    const fresh = pick.filter(k => !own[k]); if (fresh.length) pick = fresh;
    // a pool's own items come up more often than the general house loot
    const w = pick.map(k => D.COS[k].src === 'loot' ? 1 : 2.5), tot = w.reduce((a, b) => a + b, 0);
    let u = rnd() * tot; for (let i = 0; i < pick.length; i++) { u -= w[i]; if (u <= 0) return 'cos_' + pick[i]; }
    return 'cos_' + pick[pick.length - 1];
  };
  D.COS_POOL = { 'cos_*': [], 'cosZ_*': ['corpse'], 'cosP_*': ['police'], 'cosM_*': ['mansion'], 'cosH_*': ['horde'] };
  // what the trader pays (caps each); she sells for about 4x
  D.VALUE = { beans: 2, water: 2, snack: 1, drink: 1, bandage: 3, meds: 6, wrench: 3, scrap: 1, knife: 6, bat: 12, axe: 30, bow: 35, arrow: .5, crowbar: 15, ammo: .5, key: 4, cloth: 1, battery: 2, tape: 2, book: 1,
    lockpick: 3, gift: 8, candy: 1, cranberry: 3, stuffing: 3, pie: 4, turkey: 20, hat: 0, pole: 2, watch: 25, jewelry: 20, wood: 1, nails: .25, spikedbat: 20, machete: 22, prybar: 14, packplus: 15, backpack: 40, shoes: 10, lockset: 18, note: 0, parcel: 0 };
  Object.assign(D.VALUE, { seed_tomato: 2, seed_potato: 2, seed_carrot: 2, seed_corn: 3, seed_herbs: 2, tomato: 2, potato: 2, carrot: 2, corn: 2, herbs: 3, coffee: 2 });
  for (const k in D.DECOR) D.VALUE[k] = D.DECOR[k].v;
  D.valueOf = (k, d) => { if (k.startsWith('bp_')) return 25; let v = D.VALUE[k] || 1; if (d != null && D.ITEMS[k] && D.ITEMS[k].w) v = Math.max(1, Math.round(v * (.3 + .7 * d / D.WEAPONS[D.ITEMS[k].w].dur))); return v; };
  // how many fit in one slot (anything not listed does not stack)
  D.STACK = { gift: 3, candy: 5, seed_tomato: 10, seed_potato: 10, seed_carrot: 10, seed_corn: 10, seed_herbs: 10, tomato: 3, potato: 3, carrot: 3, corn: 3, herbs: 3, wood: 10, nails: 20, lockpick: 5, arrow: 20, cranberry: 3, stuffing: 3, pie: 3, water: 3, beans: 3, snack: 3, drink: 3, coffee: 3, bandage: 5, meds: 5, ammo: 30, scrap: 10, cloth: 5, tape: 3, battery: 4 };
  D.stackMax = k => D.STACK[k] || 1;
  D.QUIVER = 60;   // 0.7: arrows live in a quiver (survivor.quiver.n), not in a pack slot

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
      const n = k === 'ammo' ? 4 + Math.floor(rnd() * 9) : k === 'arrow' ? 3 + Math.floor(rnd() * 5) : k === 'nails' ? 3 + Math.floor(rnd() * 6) : D.ITEMS[k] && D.ITEMS[k].seed ? 2 + Math.floor(rnd() * 3) : 1;
      if (D.isWeapon(k)) { const W = D.WEAPONS[D.ITEMS[k].w]; out.push({ k, n: 1, d: Math.round(W.dur * (.45 + rnd() * .5)) }); continue; }
      const e = out.find(e => e.k === k && D.STACK[k]);
      if (e) e.n += n; else out.push({ k, n });
    }
    return out;
  };

  // Seasonal events (events.js): D.EV is the running event ({ id, ev, y, start, end }) or null.
  // D.EVENT stays true while Thanksgiving runs (0.4-0.5 code reads it). ?event=<id|none> or #thanksgiving forces one.
  D.EV = (DM.Events && DM.Events.active) || null;
  D.EVENT = !!(D.EV && D.EV.id === 'thanksgiving');
  D.LOCKS = { easy: { w: 22, xp: 4, name: 'Easy' }, medium: { w: 14, xp: 6, name: 'Medium' }, hard: { w: 8, xp: 12, name: 'Hard' } };

  // ---------------------------------------------------------------- loot tables: [[min,max], weights, guaranteed]
  D.LOOT = {
    fridge: [[0, 2], { drink: 3, water: 3, beans: 1, snack: 2, coffee: .5, battery: 1.5, tape: 1 }],   // 0.13.1: fewer finds, most fridges are picked over
    cooler: [[1, 2], { drink: 5, water: 4, scrap: 2 }],
    cabinet: [[0, 2], { beans: 3, snack: 2, water: 1, coffee: .6, battery: 1.5, tape: 1.5, cloth: 1.5, scrap: 1.5 }],
    kdrawers: [[1, 2], { knife: 3, scrap: 1, battery: 2, tape: 1 }],
    pantry: [[1, 2], { beans: 4, snack: 3, water: 2, cloth: 1, wood: 1 }],
    trash: [[0, 2], { wood: 1, nails: 1, scrap: 3, snack: .4 }],
    island: [[1, 2], { knife: 1, scrap: 2, tape: 1, battery: 1 }],
    vanity: [[1, 2], { cloth: 2, bandage: 2, meds: 1 }],
    medcab: [[2, 3], { meds: 3, bandage: 3 }],
    shelves: [[2, 3], { wood: 2, nails: 2, cloth: 2, tape: 2, battery: 2, scrap: 2, lockpick: 1 }],
    toolbox: [[2, 3], { nails: 3, wood: 1, wrench: 3, scrap: 3, tape: 2, lockpick: 1 }],
    crate: [[4, 5], { 'bp_*': 1, nails: 2, ammo: 5, meds: 3, bandage: 2, battery: 1, key: 1, axe: 1 }, ['ammo', 'meds']],
    books: [[1, 1], { book: 4, key: .5 }],
    night: [[1, 2], { meds: 2, battery: 2, key: .5, book: 1 }],
    wardrobe: [[1, 3], { cloth: 4, battery: 1 }],
    dresser: [[1, 3], { cloth: 3, battery: 1, ammo: 1, bandage: 1 }],
    desk: [[1, 2], { scrap: 2, battery: 2, key: .5, tape: 1, book: 1, lockpick: 1 }],
    tv: [[1, 2], { battery: 2, scrap: 2 }],
    coat: [[1, 2], { cloth: 3, snack: .4, key: .5, battery: .6 }],
    hall: [[1, 1], { key: 1, battery: 1, snack: .25 }],
    hutch: [[1, 2], { jewelry: 1, cloth: 2, battery: 1 }],
    side: [[1, 1], { battery: 2, key: .5, snack: .4, tape: .6 }],
    corpse: [[0, 1], { scrap: 1, ammo: 1, snack: .4, bandage: 1 }],
    safe: [[3, 4], { 'bp_*': 1, ammo: 5, meds: 1, watch: 1, jewelry: 1 }, ['ammo', 'ammo', 'jewelry']],
    cache: [[3, 4], { watch: 2, jewelry: 3, ammo: 3, meds: 2 }, ['jewelry', 'watch']],
    attic: [[3, 4], { 'bp_*': 1, watch: 2, jewelry: 2, ammo: 3, meds: 2, battery: 1, bow: 1 }, ['watch']],
    wallcache: [[2, 3], { 'bp_*': 1, ammo: 3, meds: 2, jewelry: 2, lockpick: 2 }, ['ammo']],
    // commercial / civic
    store: [[1, 2], { beans: 3, snack: 4, drink: 2, water: 2, coffee: 1, battery: 1.5, tape: 1 }],
    register: [[1, 2], { battery: 2, key: .5, snack: .4, lockpick: 1 }],
    storage: [[2, 3], { wood: 2, nails: 1, beans: 1, water: 1, cloth: 2, scrap: 2, tape: 1 }],
    pharm: [[1, 3], { bandage: 3, meds: 2, water: 1, snack: 1 }],
    pharmstore: [[2, 3], { meds: 3, bandage: 3, cloth: 1 }],
    cage: [[3, 4], { meds: 5, bandage: 3 }, ['meds', 'meds']],
    locker: [[1, 2], { ammo: 2, cloth: 2, bandage: 1, snack: .4, knife: 1 }],
    evidence: [[1, 3], { 'bp_*': 1, ammo: 3, jewelry: 1, watch: 1, key: 1, knife: 1 }],
    armory: [[3, 5], { ammo: 6, bat: 1, crowbar: 1, meds: 1 }, ['ammo', 'ammo']],
    filing: [[0, 2], { key: 1, book: 1, battery: 1, lockpick: 1 }],
    gym: [[1, 3], { wood: 1, bat: 2, arrow: 2, water: 1, cloth: 1 }],
    nurse: [[2, 3], { bandage: 4, meds: 2 }],
    workbench: [[2, 3], { 'bp_*': 1, wood: 3, nails: 4, scrap: 4, tape: 2, wrench: 2, crowbar: 1, battery: 1 }],
    garage: [[1, 3], { nails: 2, wood: 1, scrap: 3, tape: 2, battery: 2, crowbar: 1, axe: 1 }],
    washer: [[0, 2], { cloth: 4, key: .5, jewelry: 1 }],
    wine: [[1, 2], { drink: 3, jewelry: 1 }],
    cellar: [[2, 3], { wood: 2, beans: 1.5, water: 1, axe: 1, ammo: 1 }],
    // 0.8: brass-key spots (gen.js keyExtras): a parked car's glove box / trunk, and the containers in a key-locked room
    car: [[2, 3], { ammo: 2, meds: 1.5, bandage: 2, battery: 2, snack: 1.5, drink: 1.2, water: 1, coffee: 1, tape: 1, book: .7, d_map: .35, crowbar: .3, prybar: .25, knife: .3, bat: .2, machete: .12, 'cos_*': .15 }],
    lockedroom: [[2, 3], { meds: 2, ammo: 2, watch: 1.2, jewelry: 1.5, 'bp_*': .8, bandage: 1, lockpick: 1, battery: .6, 'decor_*': .4, 'cos_*': .3, backpack: .08 }],
  };
  // phase 4: decor and seeds turn up now and then (decor more often in mansions and apartments - see game.js loot())
  for (const [t, w] of [['dresser', .3], ['wardrobe', .25], ['hutch', .5], ['side', .3], ['books', .4], ['storage', .35], ['desk', .2], ['tv', .25], ['cellar', .4], ['washer', .3]]) D.LOOT[t][1]['decor_*'] = w;
  for (const [t, w] of [['pantry', .5], ['cabinet', .3], ['storage', .6], ['garage', .4], ['shelves', .4], ['store', .4], ['cellar', .6], ['trash', .3], ['workbench', .3]]) D.LOOT[t][1]['seed_*'] = w;
  D.LOOT.hordecrate = [[3, 4], { 'decor_*': 1, 'seed_*': 1.2, ammo: 2, meds: 2, bandage: 2, scrap: 2, nails: 2, wood: 2, tape: 1, battery: 1, 'bp_*': .5, 'cosH_*': .35 }];
  // phase 5: cosmetics are rare finds - clothes-ish furniture, zombies a little more often, police lockers better (mansions: see game.js loot())
  for (const [t, w] of [['wardrobe', .1], ['dresser', .08], ['coat', .09], ['hutch', .06], ['washer', .07], ['night', .04], ['gym', .05]]) D.LOOT[t][1]['cos_*'] = w;
  D.LOOT.corpse[1]['cosZ_*'] = 1;   // ~4.5% per body vs ~2.5-3.7% per wardrobe or dresser
  for (const [t, w] of [['locker', .22], ['evidence', .25], ['armory', .15]]) D.LOOT[t][1]['cosP_*'] = w;
  // event loot: the running event adds its foods / gifts to the tables
  if (D.EV && D.EV.ev.loot) for (const t in D.EV.ev.loot) if (D.LOOT[t]) Object.assign(D.LOOT[t][1], D.EV.ev.loot[t]);
  // a Christmas gift box (opened at home)
  D.LOOT.giftbox = [[2, 3], { candy: 3, snack: 2, meds: 1.2, battery: 1, ammo: 1, lockpick: 1, 'decor_*': .8, d_lights: .6, 'bp_*': .35, 'cos_*': .25 }];
  // the Black Friday horde crate: more, better, and a taste of the holiday
  D.LOOT.hordecrate_bf = [[5, 6], { 'decor_*': 1, 'seed_*': 1, ammo: 2, meds: 2.5, bandage: 2, scrap: 1.5, nails: 1.5, wood: 1.5, tape: 1, battery: 1, 'bp_*': 1.2, 'cosH_*': .7, turkey: .5, pie: 1.5, cranberry: 1, lockset: .3, backpack: .15 }, ['meds']];
  // 0.10: the one guaranteed prize in a key-locked room / car trunk (gen.js jackpots). Each entry: [weight, items].
  D.JACK = {
    gun: [[3, ['ammo', 'ammo', 'ammo', 'ammo', 'ammo', 'ammo', 'ammo', 'ammo']], [2, ['machete']], [2, ['spikedbat']], [1, ['axe']], [2, ['cosP_*']], [1, ['lockset']]],
    meds: [[3, ['meds', 'meds', 'meds', 'bandage', 'bandage']], [2, ['bp_*']], [1, ['backpack']], [1, ['packplus']]],
    safe: [[3, ['jewelry', 'jewelry', 'watch']], [2, ['cosM_*']], [2, ['decor_*']], [2, ['bp_*']], [1, ['backpack']]],
    stash: [[2, ['bp_*']], [2, ['cos_*']], [2, ['decor_*']], [1, ['backpack']], [2, ['packplus']], [1, ['machete']], [1, ['lockset']], [1, ['watch', 'jewelry']]],
    trunk: [[2, ['machete']], [1, ['axe']], [2, ['crowbar']], [2, ['prybar']], [1, ['spikedbat']], [2, ['ammo', 'ammo', 'ammo', 'ammo', 'ammo', 'ammo']], [1, ['lockset']], [2, ['cos_*']]]
  };
  D.rollJack = function (theme, rnd = Math.random) {
    const opts = D.JACK[theme]; if (!opts) return [];
    let v = rnd() * opts.reduce((a, o) => a + o[0], 0), items = opts[0][1];
    for (const o of opts) { v -= o[0]; if (v <= 0) { items = o[1]; break; } }
    return items.map(k => k === 'bp_*' ? (b => b[Math.floor(rnd() * b.length)])(Object.keys(D.ITEMS).filter(x => x.startsWith('bp_')))
      : k === 'decor_*' ? (b => b[Math.floor(rnd() * b.length)])(Object.keys(D.DECOR))
      : D.COS_POOL[k] ? D.pickCos(D.COS_POOL[k], rnd) : k);
  };
  D.rollLoot = function (key, rnd = Math.random) {
    const [[a, b], tab, guaranteed] = D.LOOT[key];
    const out = guaranteed ? guaranteed.slice() : [];
    let n = a + Math.floor(rnd() * (b - a + 1)) - out.length;
    if (key === 'corpse' && rnd() > .45) n = 0;
    const ks = Object.keys(tab), tot = ks.reduce((s, k) => s + tab[k], 0);
    for (let i = 0; i < n; i++) { let v = rnd() * tot; for (const k of ks) { v -= tab[k]; if (v <= 0) { out.push(k); break; } } }
    for (let i = 0; i < out.length; i++) if (out[i] === 'bp_*') { const b = Object.keys(D.ITEMS).filter(x => x.startsWith('bp_')); out[i] = b[Math.floor(rnd() * b.length)]; }
      else if (out[i] === 'decor_*') { const b = Object.keys(D.DECOR); out[i] = b[Math.floor(rnd() * b.length)]; }
      else if (out[i] === 'seed_*') { const b = Object.keys(D.ITEMS).filter(x => D.ITEMS[x].seed); out[i] = b[Math.floor(rnd() * b.length)]; }
      else if (D.COS_POOL[out[i]]) out[i] = D.pickCos(D.COS_POOL[out[i]], rnd);
    return out;
  };

  D.maxHp = s => (s && s.job === 'brawler' ? 130 : 100) + (DM.Skills && s ? DM.Skills.hpBonus(s) : 0);   // 0.13: Combat ranks add HP

  // ---------------------------------------------------------------- scavenging skill
  D.XPCUM = L => L <= 1 ? 0 : Math.round(14 * Math.pow(L - 1, 1.75) + (L > 5 ? 30 * (L - 5) * (L - 5) : 0));
  D.PERKS = { 3: ['Quiet hands', 'Searches make 25% less noise'], 6: ['Keen eye', 'Hidden clues glow, rare loot sparkles'], 9: ['Pack rat', '+2 pack slots'] };
  D.scavLvl = xp => { let L = 1; while (L < 10 && xp >= D.XPCUM(L + 1)) L++; return L; };   // the passive search bonus stops at 10
  // 0.13: the survivor level keeps going on the same curve (1 skill point per level, skills.js)
  D.survLvl = xp => { let L = 1; while (L < 99 && xp >= D.XPCUM(L + 1)) L++; return L; };

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
    ['beans', 3, 9, 1, .9], ['water', 3, 8, 1, .9], ['snack', 3, 5, 1, .6], ['coffee', 2, 7, 1, .5], ['bandage', 3, 12, 1, .8], ['meds', 2, 24, 1, .6], ['lockpick', 3, 14, 1, .8],
    ['arrow', 10, 3, 1, .8], ['cloth', 4, 4, 1, .5], ['tape', 2, 8, 1, .5], ['nails', 12, 1, 1, .5], ['wood', 4, 4, 1, .5], ['crowbar', 1, 60, 1, .6], ['bat', 1, 45, 1, .5], ['knife', 1, 25, 1, .5],
    ['backpack', 1, 150, 2, 1], ['machete', 1, 90, 2, .5], ['ammo', 15, 2, 2, .6], ['prybar', 1, 65, 2, .5], ['axe', 1, 120, 3, .5], ['bow', 1, 130, 3, .4], ['lockset', 1, 80, 3, .5],
    ['key', 1, 30, 2, .35], ['bp_*', 1, 110, 2, .45], ['bp_*', 1, 110, 4, .6],
  ];
  D.STREETS = ['Halsey St', 'Bergen St', 'Dean St', 'Putnam Ave', 'Jefferson Ave', 'Macon St', 'Decatur St', 'Hancock St', 'Lafayette Ave', 'Greene Ave', 'Quincy St', 'Gates Ave', 'Madison St', 'Monroe St', 'Kosciuszko St', 'Stuyvesant Ave', 'Tompkins Ave', 'Marcy Ave', 'Nostrand Ave', 'Bedford Ave', 'Franklin Ave', 'Classon Ave', 'Atlantic Ave', 'Fulton St', 'Pacific St', 'Prospect Pl', 'Sterling Pl', 'St Marks Ave', 'Park Pl', 'Sterling St'];
})();
