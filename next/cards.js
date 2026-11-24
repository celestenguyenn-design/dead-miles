/* Dead Miles (next) 0.68 - FIELD CARDS (owner: "some type of collection thing like cards, artifacts of some sort that can
   make this game never ending, a grind and still have the same enticing zombie survival walking game"; picked from
   field cards / relic museum / bounty ladder).
   - 59 cards in 7 sets: The Dead, Survivors, Old Brooklyn, Arsenal, Strays, and two holiday sets (Thanksgiving,
     Christmas) that only drop while their holiday runs. Rarity: common / rare / epic / legendary; 1 in 30 is a FOIL.
   - Where they come from: a card pack every 2,500 steps you walk (3 a day), packs in desks, registers, safes, attics,
     locked rooms, horde crates and deep runs, a pack from every boss, now and then a card straight off a zombie you kill,
     and Dot sells packs. A pack is 3 cards, at least one rare or better.
   - Never finished: duplicates star a card up (★1 -> ★5 at 1 / 3 / 6 / 11 / 19 copies); copies past ★5 turn into card
     dust. Dust crafts a card you are missing or buys a pack. Foils are their own hunt. Each holiday adds its set again.
   - The deck: every card has a perk that grows with its stars. Equip 3 (4 at 20 different cards, 5 at 40) and the perks
     apply everywhere (damage, HP, search speed, walk finds, pet HP, quieter steps...). Full sets pay caps + tokens.
   Save: SV.cards = { own: { id: { n, f } }, deck: [id], packs, dust, mark, day, dayPacks, fresh: [id], pity, done: { set } }. */
'use strict';
window.DM = window.DM || {};
(() => {
  const CD = DM.Cards = {};
  const D = DM.D, G = () => DM.Game, SV = () => DM.Game && DM.Game.data();
  const toast = (m, s) => DM.E && DM.E.toast && DM.E.toast(m, s || 2.6);
  const sfx = k => { try { DM.E.SFX.play(k); } catch (e) { /* ignore */ } };
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };

  // ---------------------------------------------------------------- tuning
  const RAR = ['c', 'r', 'e', 'l'], RN = { c: 'Common', r: 'Rare', e: 'Epic', l: 'Legendary' }, RCOL = { c: '#9d90bf', r: '#5fa8e8', e: '#b98cf0', l: '#e0b94a' };
  const RW = { c: 60, r: 28, e: 10, l: 2 };              // pull odds
  const STAR_AT = [1, 3, 6, 11, 19];                     // copies for ★1..★5
  const DUST = { c: 5, r: 15, e: 40, l: 100 }, CRAFT = { c: 60, r: 180, e: 480, l: 1200 }, PACK_DUST = 300;
  const FOIL = 1 / 30, WALK_STEP = 10000, WALK_MAX = 1, SET_CAPS = 150, SET_TOK = 2;
  // 0.68.1 (owner: "the card drops should be very low"): one walking pack a day at 10,000 steps, loot packs rare, single
  // cards off zombies very rare, bosses drop a pack 30% of the time
  const KILL_CH = { base: .003, special: .008, raider: .006 }, BOSS_CH = .3;
  // 0.68.1 (owner: "I don't want to be able to gift, make it difficult ... we have to walk to gift it"): no instant gifts.
  // A spare copy (never your last) can be WALKED to one friend: it leaves your binder, and only arrives once you have
  // walked this many steps. One card on the road at a time.
  const GIFT_STEPS = { c: 5000, r: 10000, e: 20000, l: 40000 };
  // perk: [label, base value by rarity c/r/e/l, format]
  const PERK = {
    melee: ['damage', [.03, .05, .08, .12], v => `+${pc(v)} damage`],
    hp: ['max HP', [4, 6, 10, 15], v => `+${Math.round(v)} max HP`],
    sta: ['stamina', [5, 8, 12, 18], v => `+${Math.round(v)} stamina`],
    search: ['search speed', [.03, .05, .07, .10], v => `Search ${pc(v)} faster`],
    find: ['extra finds', [.02, .03, .05, .08], v => `+${pc(v)} chance of an extra find`],
    rare: ['rare loot', [.01, .015, .025, .04], v => `+${pc(v)} chance of rare loot`],
    quiet: ['quiet', [.04, .06, .09, .13], v => `Footsteps ${pc(v)} quieter`],
    thirst: ['hunger & thirst', [.04, .06, .09, .13], v => `Hunger & thirst drain ${pc(v)} slower`],
    walk: ['walk finds', [1, 1, 1, 2], v => `+${Math.floor(v)} walk find${Math.floor(v) === 1 ? '' : 's'} a day`],
    pet: ['pet HP', [6, 10, 15, 22], v => `+${Math.round(v)} HP for your pet on runs`],
    craft: ['crafting XP', [.06, .1, .15, .22], v => `+${pc(v)} Crafting XP`],
    luck: ['card luck', [.1, .15, .25, .4], v => `${pc(Math.min(1, v))} chance of a 4th card in every pack`],
    kind: ['damage to a kind', [.06, .09, .13, .2], (v, k) => `+${pc(v)} damage to ${KINDN[k] || k}s`],
  };
  const KINDN = { walker: 'walker', runner: 'runner', bloater: 'bloater', screamer: 'screamer', armored: 'armored zombie', turkey: 'zombie turkey', krampus: 'Krampus walker' };
  function pc(v) { return Math.round(v * 1000) / 10 + '%'; }

  // ---------------------------------------------------------------- the cards
  // a: art - { z: kind } zombie, { s: look } survivor, { pet: [kind, coat] }, { i: item icon }, { p: painter }, { horde: n }
  const SETS = {
    dead: { n: 'The Dead', g: '🧟', bg: ['#2f5a44', '#13241c'] },
    surv: { n: 'Survivors', g: '🧍', bg: ['#4a3a78', '#1c1636'] },
    bk: { n: 'Old Brooklyn', g: '🗽', bg: ['#a0503a', '#3a1a14'] },
    arms: { n: 'Arsenal', g: '🪓', bg: ['#6a4a3a', '#241612'] },
    strays: { n: 'Strays', g: '🐾', bg: ['#3a6a7a', '#122a32'] },
    thanks: { n: 'Thanksgiving', g: '🦃', bg: ['#c8662a', '#3a1a0c'], ev: 'thanksgiving' },
    xmas: { n: 'Christmas', g: '🎄', bg: ['#2f6a4a', '#3a1018'], ev: 'christmas' },
  };
  const L = (o) => Object.assign({ body: 'f', skin: 0, hair: 0, hairC: 0, hood: false, coat: 0, pants: 0, eyes: 0, eyeC: 0, face: 0, mouth: 0, head: 0 }, o);
  const CARDS = [
    // The Dead
    ['walker', 'dead', 'c', 'Walker', { z: 'walker' }, ['kind', 'walker'], 'Slow, loud, and never alone for long.'],
    ['shambler', 'dead', 'c', 'Shambler', { z: 'walker', flip: 1 }, ['hp'], 'Still wearing its work badge.'],
    ['runner', 'dead', 'c', 'Runner', { z: 'runner' }, ['kind', 'runner'], 'You hear it before you see it. Then you see it.'],
    ['sprinter', 'dead', 'r', 'Sprinter', { z: 'runner', flip: 1 }, ['sta'], 'Ran the marathon in 2019. Still running.'],
    ['bloater', 'dead', 'r', 'Bloater', { z: 'bloater' }, ['kind', 'bloater'], 'Do not pop it indoors.'],
    ['screamer', 'dead', 'r', 'Screamer', { z: 'screamer' }, ['kind', 'screamer'], 'One shriek and the whole block comes.'],
    ['armored', 'dead', 'e', 'Armored', { z: 'armored' }, ['kind', 'armored'], 'The riot gear outlived the riot.'],
    ['captain', 'dead', 'e', 'Riot Captain', { z: 'armored', flip: 1 }, ['hp'], 'Still trying to hold the line.'],
    ['horde', 'dead', 'l', 'The Horde', { horde: 3 }, ['melee'], 'Sunday night. Every week. Without fail.'],
    ['zero', 'dead', 'l', 'Patient Zero', { z: 'bloater', glow: '#93e06c' }, ['rare'], 'It all started at a bodega on Fulton.'],
    // Survivors
    ['dot', 'surv', 'l', 'Auntie Dot', { s: L({ body: 'f', skin: 4, hair: 8, hairC: 7, coat: 13, pants: 6, mouth: 3 }) }, ['luck'], '"Caps on the counter, sugar."'],
    ['courier', 'surv', 'e', 'The Courier', { s: L({ body: 'm', skin: 2, hair: 5, hairC: 0, hood: true, coat: 0, pants: 1 }) }, ['walk'], 'Never late. Never stops.'],
    ['nurse', 'surv', 'r', 'Nurse Ama', { s: L({ body: 'f', skin: 5, hair: 10, hairC: 0, coat: 8, pants: 5 }) }, ['hp'], 'Twelve-hour shifts, now with zombies.'],
    ['coach', 'surv', 'r', 'Coach Reyes', { s: L({ body: 'm', skin: 3, hair: 3, hairC: 1, coat: 4, pants: 1 }) }, ['sta'], '"Again! From the top of the stoop!"'],
    ['sal', 'surv', 'c', 'Bodega Sal', { s: L({ body: 'm', skin: 1, hair: 5, hairC: 7, coat: 12, pants: 2 }) }, ['thirst'], 'Still open. Cash only.'],
    ['lena', 'surv', 'r', 'Locksmith Lena', { s: L({ body: 'f', skin: 0, hair: 6, hairC: 3, coat: 3, pants: 3 }) }, ['search'], 'No door has ever said no to her.'],
    ['ray', 'surv', 'c', 'Rooftop Ray', { s: L({ body: 'm', skin: 4, hair: 7, hairC: 6, hood: true, coat: 10, pants: 1 }) }, ['quiet'], 'Lives on the roofs. Comes down for snacks.'],
    ['jo', 'surv', 'c', 'Scrapper Jo', { s: L({ body: 'f', skin: 2, hair: 3, hairC: 4, coat: 5, pants: 3 }) }, ['craft'], 'Built a car out of three dead cars.'],
    ['fitz', 'surv', 'e', 'Old Man Fitz', { s: L({ body: 'm', skin: 1, hair: 5, hairC: 7, coat: 11, pants: 6, face: 0 }) }, ['find'], 'Knows where every building keeps its secrets.'],
    ['mo', 'surv', 'c', "Lil' Mo", { s: L({ body: 'm', skin: 5, hair: 4, hairC: 0, coat: 6, pants: 0, head: 1 }) }, ['pet'], 'Feeds every stray on the block.'],
    // Old Brooklyn
    ['token', 'bk', 'c', 'Subway token', { p: 'token' }, ['quiet'], 'Good for one ride. Forever.'],
    ['metro', 'bk', 'c', 'MetroCard', { p: 'metro' }, ['sta'], '$2.75 left on it. Priceless now.'],
    ['coney', 'bk', 'r', 'Coney Island ticket', { p: 'coney' }, ['find'], 'Admit one to the Wonder Wheel.'],
    ['slice', 'bk', 'c', 'Dollar slice', { p: 'slice' }, ['thirst'], 'Still a dollar. Some things never change.'],
    ['egg', 'bk', 'c', 'Egg cream', { p: 'egg' }, ['hp'], 'No egg. No cream. Still perfect.'],
    ['bodegacat', 'bk', 'r', 'Bodega cat', { pet: ['cat', 2] }, ['pet'], 'The real owner of every corner store.'],
    ['stoop', 'bk', 'c', 'Stoop chair', { p: 'stoop' }, ['search'], 'Saved a seat for the end of the world.'],
    ['bridge', 'bk', 'e', 'Brooklyn Bridge', { p: 'bridge' }, ['walk'], 'Walk it once and you are a local.'],
    ['hydrant', 'bk', 'r', 'Open hydrant', { p: 'hydrant' }, ['thirst'], 'Summer, 1998. Best day of the year.'],
    ['boombox', 'bk', 'e', 'Boombox', { p: 'boombox' }, ['luck'], 'Batteries not included. Bring your own.'],
    // Arsenal
    ['bat', 'arms', 'c', 'Lucky bat', { i: 'bat' }, ['melee'], 'Hit a home run once. Mostly hits heads now.'],
    ['crowbar', 'arms', 'c', 'Old faithful', { i: 'crowbar' }, ['search'], 'Opens doors, crates and arguments.'],
    ['pan', 'arms', 'r', "Grandma's frying pan", { i: 'pan' }, ['kind', 'walker'], 'Seasoned for forty years. And now this.'],
    ['spiked', 'arms', 'r', 'Spiked bat', { i: 'spikedbat' }, ['melee'], 'Lucky bat, with improvements.'],
    ['axe', 'arms', 'e', 'Fire axe', { i: 'axe' }, ['kind', 'armored'], 'Ladder 132 does not need it back.'],
    ['bow', 'arms', 'r', 'Hunting bow', { i: 'bow' }, ['quiet'], 'The quietest thing in Brooklyn.'],
    ['shotgun', 'arms', 'e', 'Pump shotgun', { i: 'shotgun' }, ['kind', 'runner'], 'Settles every chase.'],
    ['nailgun', 'arms', 'c', 'Nail gun', { i: 'nailgun' }, ['craft'], 'Builds a shelf. Or ends a problem.'],
    ['squeaky', 'arms', 'r', 'Squeaky turkey', { i: 'turkeysq' }, ['luck'], 'Squeak. Squeak. Squeak.'],
    ['sledge', 'arms', 'l', 'Sledgehammer', { i: 'sledge' }, ['melee'], 'There is no wall. There never was.'],
    // Strays
    ['biscuit', 'strays', 'c', 'Biscuit', { pet: ['dog', 0] }, ['pet'], 'Good boy. Very good boy.'],
    ['salem', 'strays', 'c', 'Salem', { pet: ['cat', 4] }, ['quiet'], 'Walks without a sound. Judges loudly.'],
    ['pepper', 'strays', 'r', 'Pepper', { pet: ['dog', 1] }, ['find'], 'Will dig up anything. Anything.'],
    ['mochi', 'strays', 'r', 'Mochi', { pet: ['cat', 1] }, ['luck'], 'Brings you a gift every morning. Usually.'],
    ['moose', 'strays', 'e', 'Moose', { pet: ['dog', 2] }, ['pet'], 'Thinks he is a lapdog. Is not.'],
    ['ziti', 'strays', 'e', 'Ziti', { pet: ['cat', 3] }, ['search'], 'Found the secret room first. Every time.'],
    ['scout', 'strays', 'l', 'Scout', { pet: ['dog', 3] }, ['walk'], 'Knows a shortcut. Always.'],
    // Thanksgiving (only while it runs)
    ['zturkey', 'thanks', 'e', 'Zombie turkey', { p: 'turkey' }, ['kind', 'turkey'], 'Gobble. Gobble. Bite.'],
    ['pie', 'thanks', 'c', 'Pumpkin pie', { i: 'pie' }, ['thirst'], 'Save room. Always save room.'],
    ['pilgrim', 'thanks', 'r', 'Pilgrim', { s: L({ body: 'm', skin: 1, hair: 3, hairC: 1, coat: 10, pants: 1 }), hat: 'pilgrim' }, ['hp'], 'Arrived early. Stayed for leftovers.'],
    ['scarecrow', 'thanks', 'r', 'Scarecrow', { i: 'd_scarecrow' }, ['quiet'], 'Scares crows. Not zombies.'],
    ['cornu', 'thanks', 'c', 'Cornucopia', { i: 'd_cornu' }, ['find'], 'Horn of plenty. Plenty of what?'],
    ['blackfriday', 'thanks', 'l', 'Black Friday horde', { horde: 3, sale: 1 }, ['melee'], 'Doors open at 5 AM. So do the dead.'],
    // Christmas (only while it runs)
    ['krampus', 'xmas', 'l', 'Krampus walker', { z: 'walker', hat: 'santa', big: 1 }, ['kind', 'krampus'], 'He knows if you have been looting.'],
    ['gift', 'xmas', 'c', 'Gift box', { i: 'gift' }, ['luck'], 'Do not shake it. Something inside moves.'],
    ['candy', 'xmas', 'c', 'Candy cane', { i: 'candy' }, ['sta'], 'Peppermint courage.'],
    ['snowman', 'xmas', 'r', 'Snowman', { i: 'd_snowman' }, ['hp'], 'The only one on the block not hungry.'],
    ['xtree', 'xmas', 'e', 'Christmas tree', { i: 'd_xtree' }, ['rare'], 'Lights still work. Somehow.'],
    ['whip', 'xmas', 'r', 'Light-string whip', { i: 'xlights' }, ['melee'], 'Festive. Painful.'],
  ].map(([id, set, r, n, a, perk, fl], i) => ({ id, set, r, n, a, perk, fl, no: i + 1 }));
  const BY = {}; for (const c of CARDS) BY[c.id] = c;
  CD.CARDS = CARDS; CD.SETS = SETS;

  // ---------------------------------------------------------------- state
  function st() {
    const v = SV(); if (!v) return null; const c = v.cards = v.cards || {};
    c.own = c.own || {}; c.deck = (c.deck || []).filter(id => BY[id] && c.own[id]); c.packs = +c.packs || 0; c.dust = +c.dust || 0;
    c.fresh = c.fresh || []; c.done = c.done || {}; c.pity = +c.pity || 0;
    if (c.mark == null) c.mark = v.walked || 0;
    if (c.day !== today()) { c.day = today(); c.dayPacks = 0; }
    return c;
  }
  CD.st = st;
  const evOn = () => { const e = D.EV; return e && e.id ? e.id : null; };
  const avail = c => !SETS[c.set].ev || SETS[c.set].ev === evOn();
  const starOf = n => STAR_AT.filter(x => n >= x).length;
  CD.star = id => { const c = st(), o = c && c.own[id]; return o ? starOf(o.n) : 0; };
  const uniq = () => { const c = st(); return c ? Object.keys(c.own).filter(id => BY[id]).length : 0; };
  CD.slots = () => 3 + (uniq() >= 20 ? 1 : 0) + (uniq() >= 40 ? 1 : 0);
  const perkVal = (card, star) => { const P = PERK[card.perk[0]], b = P[1][RAR.indexOf(card.r)]; return b * (1 + .5 * (Math.max(1, star) - 1)); };
  const perkText = (card, star) => PERK[card.perk[0]][2](perkVal(card, star), card.perk[1]);
  CD.perkText = perkText;
  // total of one perk across the deck ('kind:runner' for a zombie kind)
  function P(key) {
    const c = st(); if (!c) return 0; let t = 0;
    for (const id of c.deck) { const k = BY[id]; if (!k) continue; const pk = k.perk[0] === 'kind' ? 'kind:' + k.perk[1] : k.perk[0]; if (pk === key) t += perkVal(k, CD.star(id)); }
    return t;
  }
  CD.P = P;

  // ---------------------------------------------------------------- getting cards
  function pickRarity(rnd, min) { const ks = RAR.filter(r => RAR.indexOf(r) >= RAR.indexOf(min || 'c')); const tot = ks.reduce((a, r) => a + RW[r], 0); let x = rnd() * tot; for (const r of ks) { x -= RW[r]; if (x <= 0) return r; } return ks[0]; }
  function pickCard(rnd = Math.random, min) {
    const c = st(); let r = pickRarity(rnd, min), pool = [];
    for (let tries = 0; tries < 4 && !pool.length; tries++) { pool = CARDS.filter(k => k.r === r && avail(k)); if (!pool.length) r = RAR[Math.max(0, RAR.indexOf(r) - 1)]; }
    const miss = pool.filter(k => !c.own[k.id]);
    const from = miss.length && rnd() < .4 ? miss : pool;
    return from[Math.floor(rnd() * from.length)];
  }
  // add one card: returns what happened, for the reveal
  function add(id, foil) {
    const c = st(), k = BY[id]; if (!c || !k) return null;
    const o = c.own[id] || (c.own[id] = { n: 0, f: 0, t: Date.now() }), isNew = !o.n, s0 = starOf(o.n);
    let dust = 0;
    if (o.n >= STAR_AT[4]) dust = DUST[k.r] * (foil ? 3 : 1); else o.n++;
    if (foil) o.f = (o.f || 0) + 1;
    if (dust) c.dust += dust;
    const s1 = starOf(o.n);
    if (isNew && !c.fresh.includes(id)) c.fresh.push(id);
    if (isNew && c.deck.length < CD.slots()) c.deck.push(id);   // a fresh deck fills itself
    checkSets();
    return { id, isNew, up: s1 > s0 ? s1 : 0, dust, foil: !!foil };
  }
  CD.add = add;
  function checkSets() {
    const c = st(), v = SV(); if (!c || !v) return;
    for (const s in SETS) {
      if (c.done[s]) continue;
      const all = CARDS.filter(k => k.set === s); if (!all.every(k => c.own[k.id])) continue;
      c.done[s] = Date.now(); v.trader.caps += SET_CAPS; if (DM.Gacha) DM.Gacha.state().tok += SET_TOK;
      if (DM.Journal) DM.Journal.note(`Completed the ${SETS[s].n} card set.`);
      setTimeout(() => toast(`🏆 ${SETS[s].g} ${SETS[s].n} set complete! +${SET_CAPS} caps, +${SET_TOK} capsule tokens`, 3.4), 1200);
    }
  }
  // open one pack: 3 cards (a 4th on card luck), one rare or better; pity: an epic+ at least every 10 packs
  function openPack(rnd = Math.random) {
    const c = st(); if (!c || c.packs < 1) return null; c.packs--;
    const n = 3 + (rnd() < Math.min(1, P('luck')) ? 1 : 0), out = [];
    c.pity++;
    for (let i = 0; i < n; i++) {
      const min = i === n - 1 ? (c.pity >= 10 ? 'e' : 'r') : 'c';
      const k = pickCard(rnd, min); if (RAR.indexOf(k.r) >= 2) c.pity = 0;
      out.push(add(k.id, rnd() < FOIL));
    }
    G().save(); return out;
  }
  CD.openPack = openPack;
  function givePacks(n, why) { const c = st(); if (!c || n < 1) return; c.packs += n; G().save(); if (why) toast(`🃏 ${why}`, 2.6); }
  CD.givePacks = givePacks;

  // ---------------------------------------------------------------- sources
  // items: a sealed pack found while looting files itself into your packs at home
  D.ITEMS.cardpack = { n: 'Card pack', i: 'cardpack', rare: 1, tag: '3 field cards · opens at home' };
  D.VALUE.cardpack = 10; D.STACK.cardpack = 10; D.ITEMS.cardpack.nogift = 1;   // 0.68.1: never an instant gift
  // a card a friend walked over: arrives as an item through the gift inbox and files itself into the binder
  for (const k of CARDS) { D.ITEMS['fcard_' + k.id] = { n: 'Field card: ' + k.n, i: 'cardpack', rare: 1, nogift: 1, tag: 'a field card from a friend · files itself at home' }; D.VALUE['fcard_' + k.id] = 0; }
  const S0 = '#11142f';
  if (typeof ART !== 'undefined' && ART.addIcons) ART.addIcons({
    cardpack: `<g transform="rotate(-8)"><rect x="-19" y="-27" width="38" height="54" rx="4" fill="#3d2d61" stroke="${S0}" stroke-width="2.8"/><path d="M-19,-19 h38 M-19,19 h38" stroke="${S0}" stroke-width="2"/>
      <path d="M-19,-27 l4,-3 4,3 4,-3 4,3 4,-3 4,3 4,-3 4,3 4,-3 3,3" fill="none" stroke="${S0}" stroke-width="2"/><circle cx="0" cy="0" r="11" fill="#f07aa8" stroke="${S0}" stroke-width="2.2"/>
      <path d="M-5,-5 h7 a5,5 0 0 1 0,10 h-7 z" fill="#f6e3bb" stroke="${S0}" stroke-width="1.6"/><path d="M-14,-23 l28,0" stroke="#e0b94a" stroke-width="2.4"/></g>`,
  });
  for (const [t, w] of [['desk', .02], ['books', .02], ['register', .03], ['safe', .1], ['attic', .08], ['lockedroom', .1], ['hordecrate', .15], ['hordecrate_bf', .25], ['giftbox', .1], ['cache', .08], ['deep2', .1], ['deep3', .15]])
    if (D.LOOT[t]) D.LOOT[t][1].cardpack = (D.LOOT[t][1].cardpack || 0) + w;
  if (D.SHOP) D.SHOP.push(['cardpack', 1, 120, 2, .3]);
  // walking: a pack every 2,500 steps (3 a day); loot packs file themselves (called when the home screen draws)
  CD.tick = function () {
    const v = SV(), c = st(); if (!v || !c || !v.survivor || DM.scene) return;
    const w = v.walked || 0; let got = 0;
    if (w < c.mark) c.mark = w;
    while (w - c.mark >= WALK_STEP) { c.mark += WALK_STEP; if (c.dayPacks < WALK_MAX) { c.dayPacks++; got++; } }
    const s = v.survivor; let filed = 0;
    for (const list of [s.pack, s.stash]) for (let j = list.length - 1; j >= 0; j--) if (list[j].k === 'cardpack') { filed += list[j].n; list.splice(j, 1); }
    for (const list of [s.pack, s.stash]) for (let j = list.length - 1; j >= 0; j--) { const e = list[j]; if (!e.k.startsWith('fcard_') || !BY[e.k.slice(6)]) continue;
      for (let i = 0; i < e.n; i++) { const k = BY[e.k.slice(6)], r = add(k.id, false); setTimeout(() => toast(`🎁 A friend walked a card all the way to you: ${k.n}${r && r.isNew ? ' (new!)' : r && r.up ? ` (★${r.up}!)` : ''}`, 3.4), 600); }
      list.splice(j, 1); G().save(); }
    sendTick(v, c);
    if (got || filed) { c.packs += got + filed; G().save(); toast(`🃏 ${got ? `Your walk turned up ${got} card pack${got > 1 ? 's' : ''}` : ''}${got && filed ? ' · ' : ''}${filed ? `${filed} pack${filed > 1 ? 's' : ''} from looting` : ''} - open them in Field cards`, 3); }
  };
  // ---------------------------------------------------------------- walking a card to a friend
  const NET0 = () => window.NET;
  CD.canGift = () => !!(DM.Gifts && DM.Gifts.can());
  CD.giftSteps = id => GIFT_STEPS[BY[id].r];
  CD.startGift = function (id, to, toName) {
    const c = st(), o = c && c.own[id], v = SV(); if (!o || o.n < 2 || c.send || !to) return false;
    o.n--; c.send = { id, to, name: toName || to, need: GIFT_STEPS[BY[id].r], start: v.walked || 0, at: Date.now() };
    if (DM.Journal) DM.Journal.note(`Set out to walk a ${BY[id].n} card to ${toName || to}.`);
    G().save(); return true;
  };
  CD.cancelGift = function () { const c = st(); if (!c || !c.send) return; const o = c.own[c.send.id]; if (o) o.n = Math.min(STAR_AT[4], o.n + 1); c.send = null; G().save(); };
  CD.sendLeft = () => { const c = st(), v = SV(); return c && c.send ? Math.max(0, c.send.need - ((v.walked || 0) - c.send.start)) : 0; };
  let sending = false;
  async function sendTick(v, c) {
    const g = c.send; if (!g || sending || CD.sendLeft() > 0) return;
    if (g.try && Date.now() - g.try < 60e3) return;
    const n = NET0(); if (!n || !n.ok || !n.handle) return;
    sending = true; g.try = Date.now();
    try {
      const r = await n.rpc('next_gift_send', { p_handle: n.handle, p_token: n.token, p_to: g.to, p_items: [{ k: 'fcard_' + g.id, n: 1 }], p_note: 'Walked this card all the way over.' });
      if (r && r.ok) { c.send = null; G().save(); toast(`🚶🎁 You walked ${BY[g.id].n} all the way to ${g.name}. Delivered!`, 3.4); if (DM.Journal) DM.Journal.note(`Walked a ${BY[g.id].n} card to ${g.name}.`); sfx('pick'); }
      else if (r && (r.error === 'nobody' || r.error === 'to')) { CD.cancelGift(); toast(`Couldn't find ${g.name} - the card came back to your binder`, 3); }
    } catch (e) { /* offline: try again later */ }
    sending = false;
  }
  // kills: now and then a card falls out of a pocket; bosses always drop a pack
  if (DM.Game && DM.Game.onKill) {
    const k0 = DM.Game.onKill;
    DM.Game.onKill = function (z) {
      k0.apply(this, arguments);
      try {
        if (!st() || !z) return;
        const boss = z.boss || z.kind === 'wboss' || (DM.Events && DM.Events.isBoss && DM.Events.isBoss(z));
        if (boss) { if (Math.random() < BOSS_CH) givePacks(1, 'The boss dropped a card pack!'); return; }
        const ch = z.raider ? KILL_CH.raider : z.special ? KILL_CH.special : KILL_CH.base;
        if (Math.random() < ch) { const k = pickCard(); const r = add(k.id, Math.random() < FOIL); G().save(); toast(`🃏 A card fell out of its pocket: ${r.foil ? '✨ foil ' : ''}${k.n}${r.isNew ? ' (new!)' : r.up ? ` (★${r.up}!)` : ''}`, 2.8); sfx('pick'); }
      } catch (e) { /* never break a fight */ }
    };
  }

  // ---------------------------------------------------------------- perks (wrap the skill helpers)
  const wrap = (o, k, f) => { if (!o || typeof o[k] !== 'function') return; const f0 = o[k]; o[k] = function () { return f(f0.apply(this, arguments), arguments); }; };
  const SK = DM.Skills;
  wrap(SK, 'meleeMul', v => v * (1 + P('melee')));
  wrap(SK, 'hpBonus', v => v + Math.round(P('hp')));
  wrap(SK, 'staBonus', v => v + Math.round(P('sta')));
  wrap(SK, 'searchMul', v => v * (1 - Math.min(.5, P('search'))));
  wrap(SK, 'extraFind', v => v + P('find'));
  wrap(SK, 'rareBonus', v => v + P('rare'));
  wrap(SK, 'stepNoise', v => v * (1 - Math.min(.6, P('quiet'))));
  wrap(SK, 'drainMul', v => v * (1 - Math.min(.6, P('thirst'))));
  wrap(SK, 'walkFindMax', v => v + Math.floor(P('walk')));
  wrap(DM.Codex, 'dmgVs', (v, a) => v * (1 + P('kind:' + ((a[0] && a[0].kind) || 'walker'))));
  wrap(DM.Crew, 'petMaxHp', v => v + Math.round(P('pet')));
  if (DM.Trades) { const g0 = DM.Trades.gain; DM.Trades.gain = function (k, n) { return g0.call(this, k, k === 'craft' && n ? Math.round(n * (1 + P('craft'))) : n); }; }
  // titles for the Codex
  if (DM.Codex && DM.Codex.ACH) DM.Codex.ACH.push(
    { id: 'fc10', t: 'Card Collector', d: 'Own 10 different field cards.', v: uniq, need: 10, caps: 40 },
    { id: 'fc40', t: 'Card Shark', d: 'Own 40 different field cards.', v: uniq, need: 40, caps: 120 },
    { id: 'fcfoil', t: 'Shiny Hunter', d: 'Pull a foil field card.', v: () => { const c = st(); return c ? Object.values(c.own).filter(o => o.f).length : 0; }, need: 1, caps: 50 },
    { id: 'fcstar', t: 'Five Star', d: 'Raise a field card to ★5.', v: () => { const c = st(); return c ? Object.values(c.own).filter(o => starOf(o.n) >= 5).length : 0; }, need: 1, caps: 80 },
    { id: 'fcset', t: 'Set Complete', d: 'Complete a field card set.', v: () => { const c = st(); return c ? Object.keys(c.done).length : 0; }, need: 1, caps: 60 });

  // ---------------------------------------------------------------- card art (canvas)
  const ZREC = {
    armored: { '#6e5f98': '#2e3d70', '#4a3c70': '#1f2a54' }, runner: { '#6e5f98': '#b0453a', '#4a3c70': '#7e2c28', '#93a86c': '#a7b27c' },
    bloater: { '#93a86c': '#a9c443', '#6c8050': '#7f9a2a', '#4d5c3c': '#55701c', '#6e5f98': '#cbbd8e', '#4a3c70': '#a29267' }, screamer: { '#6e5f98': '#c99a3e', '#4a3c70': '#94702a' },
  };
  const rigP = {};
  function rig(name, build) { if (ART.rigs[name]) return Promise.resolve(); if (!rigP[name]) rigP[name] = build().catch(() => { delete rigP[name]; }); return rigP[name]; }
  const zRig = k => { const n = 'fcz_' + (ZREC[k] ? k : 'walker'); return rig(n, () => ART.buildRig('zombie', 2, ZREC[k] || null, n)).then(() => n); };
  const sRig = (id, look) => { const n = 'fcs_' + id, lk = ART.LOOK.norm(look); return rig(n, () => ART.buildRig('survivor', 2, ART.LOOK.recolor(lk), n, ART.LOOK.patch(lk))).then(() => n); };
  const imgs = {};
  const img = k => { if (imgs[k]) return imgs[k]; const u = ART.iconURL[k]; if (!u) return Promise.resolve(null); return (imgs[k] = new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = u; })); };
  const blk = ART.blk, line = ART.line, dot = ART.dot, rr = ART.rr;
  const ell = (c, x, y, rx, ry, f, sw = 2.2) => { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, 6.28); c.fillStyle = f; c.fill(); if (sw) { c.lineWidth = sw; c.strokeStyle = S0; c.stroke(); } };
  const poly = (c, p, f, sw = 2.2) => { c.beginPath(); c.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) c.lineTo(p[i], p[i + 1]); c.closePath(); c.fillStyle = f; c.fill(); if (sw) { c.lineWidth = sw; c.strokeStyle = S0; c.lineJoin = 'round'; c.stroke(); } };
  // painters draw in a 120 x 90 box
  const PAINT = {
    token(c) { ell(c, 60, 46, 30, 30, '#c9a94a', 3); ell(c, 60, 46, 22, 22, '#e0c46a', 2); c.fillStyle = S0; c.font = '900 13px Inter, system-ui, sans-serif'; c.textAlign = 'center'; c.fillText('NYC', 60, 44); c.font = '800 7px Inter, system-ui, sans-serif'; c.fillText('GOOD FOR ONE FARE', 60, 55);
      c.beginPath(); c.moveTo(56, 26); c.lineTo(64, 26); c.lineTo(60, 32); c.closePath(); c.fillStyle = '#8a6a2a'; c.fill(); ell(c, 50, 34, 6, 3, 'rgba(255,255,255,.35)', 0); },
    metro(c) { c.save(); c.translate(60, 46); c.rotate(-.12); rr(c, -42, -26, 84, 52, 6); c.fillStyle = '#f0c23d'; c.fill(); c.lineWidth = 3; c.strokeStyle = S0; c.stroke(); c.fillStyle = '#3a6ab8'; c.fillRect(-40, -8, 80, 10);
      c.fillStyle = S0; c.font = '900 12px Inter, system-ui, sans-serif'; c.fillText('Metro', -36, -12); c.fillStyle = '#3a6ab8'; c.fillText('Card', 6, -12); c.fillStyle = S0; c.fillRect(-36, 10, 40, 3); c.fillRect(-36, 16, 28, 3); c.restore(); },
    coney(c) { c.save(); c.translate(60, 46); c.rotate(.08); poly(c, [-44, -20, 44, -20, 44, -8, 38, -4, 44, 0, 44, 20, -44, 20, -44, 0, -38, -4, -44, -8], '#e8609a', 2.6); c.setLineDash([3, 3]); line(c, 22, -18, 22, 18, S0, 1.4); c.setLineDash([]);
      c.fillStyle = '#fff6c8'; c.font = '900 10px Inter, system-ui, sans-serif'; c.textAlign = 'center'; c.fillText('CONEY ISLAND', -10, -3); c.font = '800 6.5px Inter, system-ui, sans-serif'; c.fillText('ADMIT ONE', -10, 9);
      c.beginPath(); c.arc(33, 0, 7, 0, 6.28); c.strokeStyle = '#fff6c8'; c.lineWidth = 1.6; c.stroke(); for (let i = 0; i < 6; i++) line(c, 33, 0, 33 + Math.cos(i) * 7, Math.sin(i) * 7, '#fff6c8', 1); c.restore(); },
    slice(c) { poly(c, [20, 24, 100, 24, 60, 84], '#f0c23d', 3); c.beginPath(); c.moveTo(20, 24); c.quadraticCurveTo(60, 12, 100, 24); c.lineTo(98, 30); c.quadraticCurveTo(60, 20, 22, 30); c.closePath(); c.fillStyle = '#c98a3e'; c.fill(); c.lineWidth = 2.4; c.strokeStyle = S0; c.stroke();
      for (const [x, y] of [[48, 40], [70, 42], [58, 58], [62, 34], [40, 33]]) { ell(c, x, y, 5, 5, '#d9483a', 1.6); dot(c, x - 1.5, y - 1.5, 1.2, '#f08a7a'); } c.beginPath(); c.moveTo(66, 66); c.quadraticCurveTo(70, 76, 66, 82); c.strokeStyle = '#f0c23d'; c.lineWidth = 3; c.stroke(); },
    egg(c) { poly(c, [40, 18, 80, 18, 74, 80, 46, 80], 'rgba(220,240,255,.5)', 3); c.fillStyle = '#7a4a2a'; c.fillRect(46, 46, 28, 32); c.fillStyle = '#f6e3bb'; c.fillRect(44, 30, 32, 16); line(c, 70, 8, 62, 40, '#e8609a', 4); line(c, 70, 8, 62, 40, S0, 1); ell(c, 50, 36, 3, 2, '#fff', 0); },
    stoop(c) { const x = 34, y = 18; poly(c, [x, y + 30, x + 52, y + 30, x + 48, y + 38, x + 4, y + 38], '#3fa7a0', 2.4); for (let i = 0; i < 5; i++) line(c, x + 6 + i * 9, y + 2, x + 6 + i * 9, y + 30, '#2c7c77', 3);
      line(c, x + 2, y, x + 50, y, '#c9cdd8', 4); line(c, x + 2, y, x + 2, y + 66, S0, 3); line(c, x + 50, y, x + 50, y + 66, S0, 3); line(c, x + 8, y + 38, x + 12, y + 66, S0, 3); line(c, x + 44, y + 38, x + 40, y + 66, S0, 3); for (let i = 0; i < 3; i++) blk(c, 4 + i * 6, 70 + i * 0, 112 - i * 12, 6, '#8a5a4a', 1, 1.4); },
    bridge(c) { c.fillStyle = 'rgba(255,214,140,.35)'; c.fillRect(0, 64, 120, 26); for (const x of [30, 90]) { blk(c, x - 8, 14, 16, 56, '#b9a27a', 2, 2.4); poly(c, [x - 5, 24, x - 1, 18, x - 1, 34, x - 5, 34], '#3d2d61', 1); poly(c, [x + 5, 24, x + 1, 18, x + 1, 34, x + 5, 34], '#3d2d61', 1); }
      c.strokeStyle = S0; c.lineWidth = 1.6; c.beginPath(); c.moveTo(0, 30); c.quadraticCurveTo(15, 58, 30, 16); c.quadraticCurveTo(60, 60, 90, 16); c.quadraticCurveTo(105, 58, 120, 30); c.stroke();
      for (let i = 0; i < 24; i++) { const x = i * 5; line(c, x, 60, x, 60 - 14 - Math.abs(Math.sin(i * .26)) * 10, 'rgba(17,20,47,.55)', .8); } blk(c, -2, 60, 124, 7, '#7d6a5a', 0, 2.2); },
    hydrant(c) { for (let i = 0; i < 9; i++) { const a = -2.4 + i * .1; line(c, 78, 42, 78 + Math.cos(a) * -60, 42 + Math.sin(a) * -10 + i * 3, 'rgba(126,192,238,.7)', 2.4); }
      blk(c, 44, 30, 28, 46, '#d9483a', 6, 3); ell(c, 58, 30, 16, 6, '#d9483a', 2.6); blk(c, 52, 16, 12, 12, '#d9483a', 3, 2.4); blk(c, 36, 44, 10, 12, '#b53a2e', 2, 2.2); ell(c, 76, 46, 6, 6, '#b53a2e', 2.2); blk(c, 40, 76, 36, 6, '#8a2a24', 2, 2.2); ell(c, 50, 40, 2, 8, 'rgba(255,255,255,.3)', 0); },
    boombox(c) { blk(c, 14, 26, 92, 50, '#2a2838', 6, 3); line(c, 30, 26, 40, 10, S0, 3); line(c, 90, 26, 80, 10, S0, 3); line(c, 40, 10, 80, 10, '#9d90bf', 3);
      for (const x of [36, 84]) { ell(c, x, 52, 16, 16, '#4a4657', 2.4); ell(c, x, 52, 9, 9, '#1a1824', 2); dot(c, x, 52, 3, '#9d90bf'); } blk(c, 52, 34, 16, 10, '#7ee0d8', 1, 1.6); for (let i = 0; i < 4; i++) blk(c, 50 + i * 6, 62, 4, 6, '#f07b3c', 1, 1);
      for (const [x, y] of [[8, 14], [112, 18], [104, 6]]) { c.fillStyle = '#f07aa8'; c.font = '900 14px sans-serif'; c.fillText('♪', x - 4, y + 6); } },
    turkey(c) { const cx = 60, cy = 52; const cols = ['#a8552a', '#e2863a', '#c2402f', '#e8b83a', '#7a4a2a'];
      for (let i = 0; i < 9; i++) { const a = -2.9 + i * .3; c.save(); c.translate(cx + 6, cy - 4); c.rotate(a + 1.57); ell(c, 0, -26, 7, 22, cols[i % cols.length], 2); c.restore(); }
      ell(c, cx + 6, cy + 6, 22, 20, '#6e4a3a', 2.6); for (let i = 0; i < 4; i++) line(c, cx - 6 + i * 8, cy + 2, cx - 2 + i * 8, cy + 14, '#4e2e24', 1.4);
      ell(c, cx - 14, cy - 14, 10, 10, '#8a9a7a', 2.4); poly(c, [cx - 24, cy - 14, cx - 34, cy - 10, cx - 24, cy - 8], '#e0b94a', 1.8); ell(c, cx - 22, cy - 4, 3, 7, '#c2402f', 1.6);
      line(c, cx - 17, cy - 19, cx - 13, cy - 15, S0, 1.8); line(c, cx - 17, cy - 15, cx - 13, cy - 19, S0, 1.8); dot(c, cx - 8, cy - 16, 2.4, '#d9e86a');
      line(c, cx + 2, cy + 24, cx - 2, cy + 34, '#e0b94a', 3); line(c, cx + 12, cy + 24, cx + 14, cy + 34, '#e0b94a', 3); },
  };
  function santaHat(c, x, y, s) { c.save(); c.translate(x, y); c.scale(s, s); poly(c, [-12, 0, 12, 0, 4, -20, 16, -16], '#d9483a', 2); ell(c, 0, 1, 14, 4, '#f4efe6', 2); ell(c, 17, -16, 4, 4, '#f4efe6', 1.6); c.restore(); }
  function pilgrimHat(c, x, y, s) { c.save(); c.translate(x, y); c.scale(s, s); ell(c, 0, 0, 18, 4, '#2a2838', 2); poly(c, [-10, 0, 10, 0, 8, -18, -8, -18], '#2a2838', 2); line(c, -9, -4, 9, -4, '#c9a94a', 3); blk(c, -3, -7, 6, 6, '#e0c46a', 1, 1.4); c.restore(); }
  async function paintArt(cv, card) {
    const x = cv.getContext('2d'), W = cv.width, H = cv.height, sc = W / 120; x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, W, H);
    const Sx = SETS[card.set], g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, Sx.bg[0]); g.addColorStop(1, Sx.bg[1]); x.fillStyle = g; x.fillRect(0, 0, W, H);
    // a soft spotlight and a few specks so the backdrop is not flat
    const rg = x.createRadialGradient(W / 2, H * .45, 4, W / 2, H * .45, W * .6); rg.addColorStop(0, 'rgba(255,240,210,.22)'); rg.addColorStop(1, 'rgba(255,240,210,0)'); x.fillStyle = rg; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 14; i++) { const h = (card.no * 97 + i * 53) % 997; x.fillStyle = 'rgba(255,255,255,.07)'; x.beginPath(); x.arc((h * 7) % W, (h * 13) % H, (h % 3 + 1) * sc, 0, 6.28); x.fill(); }
    x.fillStyle = 'rgba(8,6,22,.35)'; x.beginPath(); x.ellipse(W / 2, H * .9, W * .3, H * .06, 0, 0, 6.28); x.fill();
    const a = card.a;
    // 0.72: SpriteCook pictures for the cards that have one (Dot, the Walker, Lena, every pet colour)
    const IMG = { dot: 'dot', walker: 'zombie', lena: 'lena' }, nm = IMG[card.id] || (a.pet ? a.pet[0] + (a.pet[1] % 4) : null);
    if (nm && ART.img) { let im = ART.img(nm); if (!im) { await new Promise(r => setTimeout(r, 600)); im = ART.img(nm); }
      if (im) { const k = Math.min(W * .9 / im.width, H * .92 / im.height), w = im.width * k, h = im.height * k; x.drawImage(im, (W - w) / 2, H - h - H * .03, w, h); return; } }
    try {
      if (a.z) { const n = await zRig(a.z); const s = (a.big ? 1.08 : 1) * H / 150; if (a.glow) { const gl = x.createRadialGradient(W / 2, H * .55, 2, W / 2, H * .55, W * .45); gl.addColorStop(0, a.glow + 'aa'); gl.addColorStop(1, a.glow + '00'); x.fillStyle = gl; x.fillRect(0, 0, W, H); }
        ART.drawRig(x, n, W / 2, H * 1.25, s, !!a.flip, { parts: { armF: { r: -.6 }, armB: { r: -.45 }, head: { r: .08 } } });
        if (a.hat === 'santa') santaHat(x, W / 2 + (a.flip ? 4 : -4) * sc, H * 1.25 - 245 * s, sc * 2.4); }
      else if (a.horde) { const n = await zRig('walker'), n2 = await zRig('runner'); const s = H / 330;
        for (const [dx, dy, k, f] of [[-34, -8, n, 0], [34, -6, n2, 1], [0, 4, n, 0]]) ART.drawRig(x, k, W / 2 + dx * sc, H * .93 + dy * sc * .3, s * (dy > 0 ? 1.12 : .92), !!f, { parts: { armF: { r: -.6 }, armB: { r: -.45 } } });
        if (a.sale) { x.save(); x.translate(W * .78, H * .2); x.rotate(.2); x.scale(sc, sc); blk(x, -20, -10, 40, 20, '#d9483a', 3, 2.4); x.fillStyle = '#fff6c8'; x.font = '900 11px Inter, system-ui, sans-serif'; x.textAlign = 'center'; x.fillText('SALE', 0, 4); x.restore(); } }
      else if (a.s) { const n = await sRig(card.id, a.s); const s = H / 150; ART.drawRig(x, n, W / 2 - 2 * sc, H * 1.36, s, false, { weapon: 'fists' }); if (a.hat === 'pilgrim') pilgrimHat(x, W / 2 - 2 * sc, H * 1.36 - 205 * s, sc * 2.4); }
      else if (a.pet && DM.Crew && DM.Crew.petPortrait) { const tmp = document.createElement('canvas'); tmp.width = W; tmp.height = Math.round(H * .8); DM.Crew.petPortrait(tmp, { kind: a.pet[0], coat: a.pet[1] % ((DM.Crew.COATS[a.pet[0]] || [1]).length), xp: 300 }, { happy: true }); x.drawImage(tmp, 0, H * .17); }
      else if (a.i) { const im = await img(a.i); if (im) { const z = Math.min(W, H) * .82; x.drawImage(im, (W - z) / 2, (H - z) / 2 + H * .03, z, z); } }
      else if (a.p && PAINT[a.p]) { x.save(); x.scale(sc, H / 90); PAINT[a.p](x); x.restore(); }
    } catch (e) { /* art is decoration; never break the binder */ }
  }
  CD.paint = paintArt;

  // ---------------------------------------------------------------- the binder (home card sheet)
  let view = { set: 'all', sel: null };
  CD.has = k => k === 'cards';
  CD.reset = () => { view = { set: view.set, sel: null }; };
  CD.tile = function () {
    const c = st(); if (!c) return null; const u = uniq();
    return { k: 'cards', c: '#f07aa8', n: 'Field cards', sub: `${u}/${CARDS.length} cards${c.packs ? ` · ${c.packs} pack${c.packs > 1 ? 's' : ''} to open` : c.send ? ' · a card on the road' : ` · a pack at ${WALK_STEP.toLocaleString('en-US')} steps`}`, hot: c.packs ? 'Open' : c.fresh.length ? 'New' : '' };
  };
  const stars = (s, big) => `<span class="fcst${big ? ' big' : ''}">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= s ? 'on' : ''}">★</i>`).join('')}</span>`;
  function cardHTML(k, o, opt = {}) {
    const got = !!(o && o.n), s = got ? starOf(o.n) : 0, foil = got && o.f;
    if (!got) return `<button class="fc miss r-${k.r}" data-fc="${k.id}"><span class="fcno">#${k.no}</span><div class="fcq">?</div><b class="fcn">${opt.reveal ? esc(k.n) : '???'}</b><small>${RN[k.r]}</small></button>`;
    return `<button class="fc r-${k.r}${foil ? ' foil' : ''}${opt.big ? ' big' : ''}${opt.inDeck ? ' indeck' : ''}" data-fc="${k.id}" style="--rc:${RCOL[k.r]}">
      <span class="fcno">#${k.no}</span>${opt.isNew ? '<em class="fcnew">NEW</em>' : ''}<canvas class="fca" data-art="${k.id}" width="${opt.big ? 360 : 180}" height="${opt.big ? 270 : 135}"></canvas>
      <b class="fcn">${esc(k.n)}</b>${stars(s, opt.big)}${opt.big ? `<span class="fcp">${esc(perkText(k, s))}</span>` : ''}</button>`;
  }
  CD.html = function () {
    const c = st(); if (!c) return '';
    if (view.sel) return detailHTML(view.sel);
    const sl = CD.slots(), u = uniq();
    const deck = Array.from({ length: sl }, (_, i) => { const id = c.deck[i], k = BY[id]; return k ? `<div class="fcslot">${cardHTML(k, c.own[id], { inDeck: 1 })}<small>${esc(perkText(k, CD.star(id)))}</small></div>` : '<div class="fcslot empty"><span>+</span><small>Empty slot</small></div>'; }).join('');
    const sets = Object.keys(SETS), list = CARDS.filter(k => view.set === 'all' || k.set === view.set);
    return `<div class="kick">Field cards · ${u}/${CARDS.length}${c.dust ? ` · ✨ ${c.dust} dust` : ''}</div><h3>Your binder</h3>
      ${c.packs ? `<button class="mbtn big fcopen" id="fcOpen">🃏 Open a card pack <i>${c.packs}</i></button>` : `<p class="mp dim">${c.dayPacks >= WALK_MAX ? 'You walked today\'s pack out of the city - the next one comes tomorrow' : `Next pack in ${Math.max(0, WALK_STEP - ((SV().walked || 0) - c.mark)).toLocaleString('en-US')} steps (one a day)`}. Packs are rare: once in a while in a safe, attic, locked room or horde crate, sometimes from a boss, and Dot has one now and then.</p>`}
      ${c.send ? (() => { const g = c.send, left = CD.sendLeft(), pct = Math.round((1 - left / g.need) * 100); return `<div class="fcroad"><b>🚶 Walking ${esc(BY[g.id].n)} to ${esc(g.name)}</b><i class="cbar"><i style="width:${pct}%"></i></i><span>${left ? `${left.toLocaleString('en-US')} steps to go` : 'Arrived - handing it over when you are online'}</span><button class="linkbtn" id="fcCancel">Turn back (the card comes home)</button></div>`; })() : ''}
      <div class="kick sect">Your deck · ${c.deck.length}/${sl} ${sl < 5 ? `<span class="dim">(${u >= 20 ? 'slot 5 at 40 cards' : 'slot 4 at 20 cards'})</span>` : ''}</div>
      <div class="fcdeck">${deck}</div><p class="mp dim fchint">Deck perks work everywhere: in houses, on walks and at the base. Tap a card to equip or swap it. Duplicates raise its ★.</p>
      <div class="catf fcsets"><button class="chip${view.set === 'all' ? ' on' : ''}" data-fs="all">All</button>${sets.map(s => { const all = CARDS.filter(k => k.set === s), n = all.filter(k => c.own[k.id]).length; return `<button class="chip${view.set === s ? ' on' : ''}${c.done[s] ? ' done' : ''}" data-fs="${s}">${SETS[s].g} ${esc(SETS[s].n)} ${n}/${all.length}</button>`; }).join('')}</div>
      ${view.set !== 'all' && SETS[view.set].ev ? `<p class="mp dim">${evOn() === SETS[view.set].ev ? '🎉 On now - these drop until the holiday ends.' : 'Holiday set: drops only while its holiday runs (craft them with dust any time).'}</p>` : ''}
      <div class="fcgrid">${list.map(k => cardHTML(k, c.own[k.id], { isNew: c.fresh.includes(k.id) })).join('')}</div>
      <div class="fcfoot">${c.dust >= PACK_DUST ? `<button class="mbtn sm ghost" id="fcBuy">Trade ${PACK_DUST} dust for a pack</button>` : ''}<p class="mp dim">Copies past ★5 become card dust (✨). Dust crafts a card you are missing, or buys a pack. A full set: ${SET_CAPS} caps + ${SET_TOK} capsule tokens. 1 card in 30 is a foil.</p></div>`;
  };
  function detailHTML(id) {
    const c = st(), k = BY[id], o = c.own[id], got = !!(o && o.n), s = got ? starOf(o.n) : 0, inDeck = c.deck.includes(id);
    const next = s < 5 ? STAR_AT[s] : null;
    const rows = [1, 2, 3, 4, 5].map(i => `<div class="fcrow${i === s ? ' on' : ''}${i > s ? ' dim' : ''}"><b>★${i}</b><span>${esc(perkText(k, i))}</span><em>${STAR_AT[i - 1]} cop${STAR_AT[i - 1] > 1 ? 'ies' : 'y'}</em></div>`).join('');
    const cost = CRAFT[k.r];
    return `<div class="kick">${SETS[k.set].g} ${esc(SETS[k.set].n)} · #${k.no} · <span style="color:${RCOL[k.r]}">${RN[k.r]}</span></div>
      <div class="fcbig">${got ? cardHTML(k, o, { big: 1 }) : cardHTML(k, null, { reveal: 1 })}</div>
      <p class="mp fcflav">“${esc(k.fl)}”</p>
      ${got ? `<p class="mp dim">${o.n} cop${o.n > 1 ? 'ies' : 'y'}${next ? ` · ★${s + 1} at ${next}` : ' · maxed - more copies become dust'}${o.f ? ` · ✨ ${o.f} foil` : ''}</p>` : ''}
      <div class="fcrows">${rows}</div>
      ${got ? (inDeck ? '<button class="mbtn big ghost" id="fcOut">Take out of the deck</button>' : `<button class="mbtn big" id="fcIn">${c.deck.length < CD.slots() ? 'Put in the deck' : 'Swap into the deck'}</button>`)
        : `<button class="mbtn big${c.dust >= cost ? '' : ' ghost'}" id="fcCraft"${c.dust >= cost ? '' : ' disabled'}>Craft with dust · ✨ ${cost}${c.dust < cost ? ` (you have ${c.dust})` : ''}</button>`}
      <div id="fcSwap"></div>
      ${got ? (c.send ? `<p class="mp dim">🚶 You are already walking a card to someone. One at a time.</p>` : o.n < 2 ? `<p class="mp dim">🚶 Get a spare copy to walk one to a friend - your last copy never leaves.</p>`
        : CD.canGift() ? `<button class="mbtn ghost" id="fcGift">🚶 Walk a spare copy to a friend · ${GIFT_STEPS[k.r].toLocaleString('en-US')} steps</button><div id="fcGiftPick"></div>` : '<p class="mp dim">🚶 Sign in (Settings > Account & friends) to walk spare cards to friends.</p>') : ''}
      <button class="mbtn ghost" id="fcBack">Back to the binder</button>`;
  }
  function paintAll(root) { root.querySelectorAll('canvas[data-art]').forEach(cv => paintArt(cv, BY[cv.dataset.art])); }
  CD.bind = function (w, re) {
    const c = st(); if (!c) return;
    paintAll(w);
    const go = () => { re(); };
    w.querySelectorAll('[data-fs]').forEach(b => b.onclick = () => { view.set = b.dataset.fs; sfx('ui'); go(); });
    w.querySelectorAll('[data-fc]').forEach(b => b.onclick = () => { view.sel = b.dataset.fc; c.fresh = c.fresh.filter(x => x !== view.sel); G().save(); sfx('ui'); go(); w.scrollIntoView && w.scrollIntoView({ block: 'start' }); });
    const $ = s => w.querySelector(s);
    if ($('#fcOpen')) $('#fcOpen').onclick = () => { sfx('ui'); packReveal(go); };
    if ($('#fcBuy')) $('#fcBuy').onclick = () => { if (c.dust < PACK_DUST) return; c.dust -= PACK_DUST; c.packs++; G().save(); sfx('pick'); go(); };
    if ($('#fcBack')) $('#fcBack').onclick = () => { view.sel = null; sfx('ui'); go(); };
    if ($('#fcOut')) $('#fcOut').onclick = () => { c.deck = c.deck.filter(x => x !== view.sel); G().save(); sfx('ui'); go(); };
    if ($('#fcIn')) $('#fcIn').onclick = () => {
      if (c.deck.length < CD.slots()) { c.deck.push(view.sel); G().save(); sfx('pick'); toast(`${BY[view.sel].n} is in your deck`, 1.6); go(); return; }
      $('#fcSwap').innerHTML = `<div class="kick sect">Swap it for</div><div class="fcswap">${c.deck.map(id => `<button class="mbtn sm ghost" data-sw="${id}">${esc(BY[id].n)} · ${esc(perkText(BY[id], CD.star(id)))}</button>`).join('')}</div>`;
      w.querySelectorAll('[data-sw]').forEach(b => b.onclick = () => { const i = c.deck.indexOf(b.dataset.sw); if (i >= 0) c.deck[i] = view.sel; G().save(); sfx('pick'); toast(`${BY[view.sel].n} is in your deck`, 1.6); go(); });
    };
    if ($('#fcCancel')) $('#fcCancel').onclick = () => { const g = c.send; CD.cancelGift(); sfx('ui'); toast(`You turned back. ${BY[g.id].n} is in your binder again.`, 2.4); go(); };
    if ($('#fcGift')) $('#fcGift').onclick = () => {
      const n = NET0(), k = BY[view.sel], o = c.own[view.sel], s0 = starOf(o.n), s1 = starOf(o.n - 1);
      const friends = ((n && n.boardRows) || []).filter(r => r.handle !== n.handle).slice(0, 20);
      let to = '', name = '';
      $('#fcGiftPick').innerHTML = `<div class="kick sect">Who gets it?</div><div class="chips" id="fgTo">${friends.map(r => `<button class="chip" data-h="${esc(r.handle)}" data-nm="${esc(r.name || r.handle)}">${esc(r.name || r.handle)}</button>`).join('') || '<span class="mp dim">No friends on the board yet - type a handle.</span>'}</div>
        <input id="fgHandle" placeholder="or type their handle" maxlength="24" autocapitalize="off" autocorrect="off" spellcheck="false" style="display:block;width:100%;box-sizing:border-box;margin:6px 0 8px;height:42px;border-radius:12px;border:2.5px solid #3d2d61;background:#11142f;color:#f6e3bb;padding:0 12px;font:700 15px Inter,system-ui,sans-serif">
        <p class="mp dim">The copy leaves your binder now${s1 < s0 ? ` (this card drops to ★${s1})` : ''} and is delivered after you walk <b>${GIFT_STEPS[k.r].toLocaleString('en-US')} steps</b>. Turn back any time and it comes home.</p>
        <button class="mbtn" id="fgGo">Start walking</button>`;
      w.querySelectorAll('#fgTo [data-h]').forEach(b => b.onclick = () => { to = b.dataset.h; name = b.dataset.nm; w.querySelectorAll('#fgTo .chip').forEach(x => x.classList.toggle('on', x === b)); });
      $('#fgGo').onclick = () => {
        const typed = ($('#fgHandle').value || '').trim().toLowerCase().replace(/^@/, ''), h = typed || to;
        if (!h) return toast('Pick a friend or type a handle', 1.6);
        if (n && h === n.handle) return toast('Pick someone else', 1.6);
        if (!CD.startGift(view.sel, h, typed ? typed : name)) return toast('Could not start - try again', 1.6);
        sfx('pick'); toast(`🚶 You set off with ${k.n} for ${typed || name}. ${GIFT_STEPS[k.r].toLocaleString('en-US')} steps to go.`, 3); view.sel = null; go();
      };
    };
    if ($('#fcCraft')) $('#fcCraft').onclick = () => { const k = BY[view.sel], cost = CRAFT[k.r]; if (c.dust < cost) return; c.dust -= cost; add(k.id, false); G().save(); sfx('pick'); toast(`Crafted ${k.n}!`, 1.8); go(); };
  };

  // ---------------------------------------------------------------- opening a pack: cards face down, tap to flip
  function packReveal(done) {
    const res = openPack(); if (!res) return;
    let ov = document.getElementById('fcPack'); if (ov) ov.remove();
    ov = document.createElement('div'); ov.id = 'fcPack';
    ov.innerHTML = `<div class="fcpk"><div class="kick">Card pack${res.length > 3 ? ' · a 4th card!' : ''}</div><h3>Tap to flip</h3><div class="fcflip">${res.map((r, i) => { const k = BY[r.id], o = st().own[r.id];
      return `<div class="fcf" data-i="${i}" style="--d:${i * .08}s"><div class="fcfin"><div class="fcback"><span>DEAD<br>MILES</span></div><div class="fcfront">${cardHTML(k, Object.assign({}, o, { f: r.foil ? 1 : 0 }))}
        <div class="fctag${r.isNew ? ' new' : ''}">${r.isNew ? 'NEW!' : r.up ? `★${r.up}!` : r.dust ? `+${r.dust} dust` : 'copy'}${r.foil ? ' · ✨ FOIL' : ''}</div></div></div></div>`; }).join('')}</div>
      <button class="mbtn big" id="fcpkDone">Flip all</button></div>`;
    document.body.appendChild(ov); requestAnimationFrame(() => ov.classList.add('on'));
    ov.querySelectorAll('canvas[data-art]').forEach(cv => paintArt(cv, BY[cv.dataset.art]));
    const left = () => ov.querySelectorAll('.fcf:not(.up)').length;
    const flip = el => { if (el.classList.contains('up')) return; el.classList.add('up'); const r = res[+el.dataset.i], k = BY[r.id]; sfx(RAR.indexOf(k.r) >= 2 || r.foil ? 'pick' : 'open');
      if (k.r === 'l' || r.foil) el.classList.add('wow'); $done.textContent = left() ? 'Flip all' : (st().packs ? `Next pack (${st().packs})` : 'Done'); };
    const $done = ov.querySelector('#fcpkDone');
    ov.querySelectorAll('.fcf').forEach(el => el.onclick = () => flip(el));
    $done.onclick = () => { if (left()) { ov.querySelectorAll('.fcf').forEach((el, i) => setTimeout(() => flip(el), i * 180)); return; } ov.remove(); if (st().packs) packReveal(done); else { done(); if (G().renderHome) G().renderHome(); } };   // the home tile's Open badge follows
  }

  // ---------------------------------------------------------------- styles
  const css = document.createElement('style'); css.textContent = `
    .fcopen { position: relative; } .fcopen i { margin-left: 6px; padding: 1px 9px; border-radius: 9px; background: #11142f; color: #f6e3bb; font-style: normal; }
    .fcdeck { display: grid; grid-template-columns: repeat(auto-fill, minmax(92px, 1fr)); gap: 8px; margin: 6px 0 2px; }
    .fcslot { display: flex; flex-direction: column; gap: 4px; } .fcslot small { font-size: 10px; font-weight: 800; line-height: 1.2; color: #ffd27a; text-align: center; }
    .fcslot.empty { align-items: center; justify-content: center; min-height: 150px; border: 2px dashed #3d2d61; border-radius: 12px; } .fcslot.empty span { font-size: 26px; font-weight: 900; color: #3d2d61; } .fcslot.empty small { color: #9d90bf; }
    .fchint { margin-top: 6px; } .fcsets { flex-wrap: wrap; } .fcsets .chip.done { border-color: #e0b94a; color: #e0b94a; }
    .fcgrid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 8px 0 10px; }
    .fc { position: relative; display: flex; flex-direction: column; align-items: stretch; gap: 3px; padding: 5px 5px 6px; border-radius: 12px; border: 3px solid var(--rc, #9d90bf); background: linear-gradient(180deg, #2a1f4a, #11142f); color: #f6e3bb; font: inherit; text-align: center; overflow: hidden; cursor: pointer; box-shadow: 0 3px 0 rgba(0,0,0,.35); }
    .fc.r-l { box-shadow: 0 0 12px rgba(224,185,74,.45), 0 3px 0 rgba(0,0,0,.35); } .fc.r-e { box-shadow: 0 0 8px rgba(185,140,240,.35), 0 3px 0 rgba(0,0,0,.35); }
    .fc.indeck { outline: 2px solid #ffd27a; outline-offset: 1px; }
    .fca { width: 100%; aspect-ratio: 4 / 3; border-radius: 7px; border: 2px solid #11142f; background: #11142f; display: block; }
    .fcn { font-size: 11px; font-weight: 900; line-height: 1.15; min-height: 2.3em; display: flex; align-items: center; justify-content: center; }
    .fc.big .fcn { font-size: 17px; min-height: 0; } .fc.big { padding: 8px; border-width: 4px; }
    .fcp { font-size: 12px; font-weight: 800; color: #ffd27a; }
    .fcno { position: absolute; top: 7px; left: 8px; z-index: 2; font-size: 9px; font-weight: 900; color: rgba(246,227,187,.75); text-shadow: 0 1px 0 #11142f; }
    .fcnew { position: absolute; top: 4px; right: 4px; z-index: 2; padding: 1px 5px; border-radius: 6px; background: #d9483a; color: #fff; font: 900 9px Inter, system-ui, sans-serif; }
    .fcst { display: flex; justify-content: center; gap: 1px; font-size: 11px; line-height: 1; } .fcst i { font-style: normal; color: #3d2d61; } .fcst i.on { color: #ffd27a; text-shadow: 0 0 4px rgba(255,210,122,.6); } .fcst.big { font-size: 18px; }
    .fc.miss { border-style: dashed; border-color: #3d2d61; background: #11142f; color: #5a4a86; } .fc.miss .fcq { aspect-ratio: 4 / 3; display: flex; align-items: center; justify-content: center; font-size: 30px; font-weight: 900; border-radius: 7px; background: #1a1336; }
    .fc.miss small { font-size: 9px; font-weight: 800; }
    .fc.foil::after { content: ''; position: absolute; inset: 0; pointer-events: none; background: linear-gradient(115deg, transparent 25%, rgba(255,255,255,.5) 40%, rgba(255,120,220,.35) 47%, rgba(120,230,255,.35) 54%, rgba(255,240,140,.3) 60%, transparent 75%); background-size: 260% 100%; mix-blend-mode: screen; animation: fcshine 2.6s linear infinite; }
    .fc.foil { border-image: linear-gradient(135deg, #ff8ac0, #ffe066, #7ee0d8, #b98cf0) 1; border-radius: 0; }
    @keyframes fcshine { 0% { background-position: 130% 0; } 100% { background-position: -130% 0; } }
    .fcbig { max-width: 260px; margin: 8px auto 4px; } .fcflav { text-align: center; font-style: italic; }
    .fcrows { display: grid; gap: 4px; margin: 8px 0; } .fcrow { display: grid; grid-template-columns: 34px 1fr auto; gap: 8px; align-items: center; padding: 6px 8px; border-radius: 9px; background: rgba(17,20,47,.6); font-size: 12px; font-weight: 800; }
    .fcrow b { color: #ffd27a; } .fcrow em { font-style: normal; font-size: 10px; color: #9d90bf; } .fcrow.on { outline: 2px solid #ffd27a; } .fcrow.dim span { opacity: .6; }
    .fcswap { display: grid; gap: 6px; margin-bottom: 8px; }
    .fcroad { display: grid; gap: 4px; margin: 8px 0; padding: 10px; border-radius: 12px; background: rgba(17,20,47,.65); border: 2px solid #7fd9c8; } .fcroad b { font-size: 13px; } .fcroad span { font-size: 11px; font-weight: 800; color: #9d90bf; } .fcroad .cbar i { background: #7fd9c8; }
    #fcPack { position: fixed; inset: 0; z-index: 9999; display: flex; align-items: center; justify-content: center; background: rgba(8,6,22,.95); backdrop-filter: blur(4px); opacity: 0; transition: opacity .25s; padding: 16px; }
    #fcPack.on { opacity: 1; } .fcpk { width: 100%; max-width: 440px; text-align: center; } .fcpk h3 { margin: 2px 0 12px; }
    .fcflip { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-bottom: 14px; }
    .fcf { width: 124px; perspective: 700px; cursor: pointer; animation: fcdeal .45s both; animation-delay: var(--d); }
    @keyframes fcdeal { from { transform: translateY(40px) rotate(-6deg); opacity: 0; } to { transform: none; opacity: 1; } }
    .fcfin { position: relative; width: 100%; transition: transform .6s cubic-bezier(.3,1.4,.5,1); transform-style: preserve-3d; }
    .fcf.up .fcfin { transform: rotateY(180deg); }
    .fcback, .fcfront { backface-visibility: hidden; -webkit-backface-visibility: hidden; } .fcfront { transform: rotateY(180deg); }
    .fcback { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; border-radius: 12px; border: 3px solid #f07aa8; background: repeating-linear-gradient(45deg, #3d2d61 0 10px, #2a1f4a 10px 20px); box-shadow: 0 3px 0 rgba(0,0,0,.35); }
    .fcback span { padding: 8px 10px; border-radius: 10px; background: #11142f; border: 2px solid #f07aa8; font: 900 14px/1.05 Inter, system-ui, sans-serif; color: #f6e3bb; letter-spacing: .04em; }
    .fcf.wow .fcfront { animation: fcwow 1s .5s both; } @keyframes fcwow { 0% { filter: brightness(1); } 30% { filter: brightness(1.8) drop-shadow(0 0 14px #ffd27a); } 100% { filter: brightness(1) drop-shadow(0 0 8px #ffd27a); } }
    .fctag { margin-top: 6px; font-size: 12px; font-weight: 900; color: #9d90bf; } .fctag.new { color: #ffd27a; }`;
  document.head.appendChild(css);
})();
