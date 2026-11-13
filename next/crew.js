/* Dead Miles (next) - phase 5b: the crew (survivors you find hiding in houses, living at your base) and strays (pets).
   Save data: SV.crew = { list, seq, notes, morning } and SV.pets = { list, seq } (C.norm adds every default; nothing is
   ever renamed or dropped). Crew eat 1 food a day from the STASH; 3 hungry days in a row and they leave a note (they
   never take anything). Pets never die: a zombie hit sends them running home, back the next day.
   Runs plug in through C.wrap(opts, kind, extra) which chains house.js hooks (acts, tick, sprites, onAlert, quiet).
   Plain script, global DM.Crew. Offline-safe: nothing here touches the network. */
'use strict';
(() => {
  const D = DM.D, E = DM.E, $ = E.$, SFX = E.SFX, toast = E.toast, T = E.T, P = ART.P;
  const C = DM.Crew = {};
  const G = () => DM.Game, SV = () => DM.Game.data();
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = k => `<img alt="" src="${ART.iconURL[D.ITEMS[k].i]}">`;
  const dayNo = () => { const d = new Date(); return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5); };
  const pick = (a, r = Math.random) => a[Math.floor(r() * a.length)];

  // ---------------------------------------------------------------- data
  const NAMES = ['Jules', 'Dev', 'Marisol', 'Kenji', 'Ada', 'Booker', 'Tam', 'Rosa', 'Isaiah', 'Yuki', 'Cal', 'Nadine', 'Omar', 'Sasha', 'Wren', 'Elias', 'Priya', 'Dom', 'Lena', 'Rook',
    'Hollis', 'Bea', 'Mateo', 'Juniper', 'Ezra', 'Noor', 'Otis', 'Imani', 'Casper', 'Delia', 'Ruben', 'Tove', 'Anika', 'Gus', 'Farah', 'Jonah', 'Mae', 'Silas', 'Kofi', 'Lupe'];
  const PAST = ['used to deliver mail on this route', 'taught third grade on Putnam Ave', 'ran the night shift at the bodega', 'was a line cook on Fulton', 'coached Little League',
    'drove the B44 bus', 'was two weeks from retiring', 'fixed phones on Broadway', 'was a paramedic', 'sold insurance, and will not talk about it', 'kept bees on a roof in Bed-Stuy',
    'played bass in a bar band', 'worked the rail yard', 'was a hospital janitor', 'ran a food truck', 'was a nursing student', 'was a locksmith', 'managed the hardware store'];
  const ROLES = C.ROLES = {
    scavenger: { n: 'Scavenger', col: '#e0b94a', perk: lv => `Crew searches bring back more (+${4 + 2 * lv}% share)`, line: 'I can find things other people walk past.' },
    guard: { n: 'Guard', col: '#ff8a7a', perk: lv => `+${4 + 2 * lv} base defence on horde night`, line: 'I can hold a gate. Give me a bat and a bunk.' },
    medic: { n: 'Medic', col: '#9fe0e6', perk: lv => `Patches you up for ${3 + 2 * lv} HP every morning`, line: 'I can patch you up. You look like you need it.' },
    gardener: { n: 'Gardener', col: '#93a86c', perk: lv => `Waters one thirsty plant a day, free${lv >= 4 ? ' (and keeps it happy)' : ''}`, line: 'I can keep a garden alive. Even now.' },
    tinkerer: { n: 'Tinkerer', col: '#b98cf0', perk: lv => `Base repairs ${10 + 4 * lv}% cheaper`, line: 'I can fix walls with string and spite.' },
  };
  const RKEYS = Object.keys(ROLES);
  const LVX = [0, 8, 20, 40, 70];                          // crew xp to reach level 1..5 (slow: ~1 xp a day + tasks)
  const lvOf = xp => { let l = 1; while (l < 5 && xp >= LVX[l]) l++; return l; };
  C.lv = c => lvOf(c.xp || 0);
  const PLV = [0, 25, 70, 150, 300];                       // pet level from thousands of your steps
  const plvOf = xp => { let l = 1; while (l < 5 && xp >= PLV[l]) l++; return l; };
  C.plv = p => plvOf(p.xp || 0);
  const PET_NAMES = { dog: ['Biscuit', 'Scout', 'Waffles', 'Pepper', 'Moose', 'Bodega', 'Lady', 'Tank', 'Peanut', 'Rocky'], cat: ['Mochi', 'Salem', 'Noodle', 'Miso', 'Pumpkin', 'Bagel', 'Smokey', 'Olive', 'Ziti', 'Boots'] };
  const COATS = C.COATS = {
    dog: [{ n: 'Brown', a: '#a0704f', b: '#7a5040', e: '#5e3a2a', m: '#d9b48a' }, { n: 'Black & white', a: '#3a3848', b: '#26242f', e: '#26242f', m: '#efe6d6', patch: '#efe6d6' },
      { n: 'Golden', a: '#d9a65a', b: '#b07f3c', e: '#a06a30', m: '#f0d29a' }, { n: 'Grey', a: '#8a8aa0', b: '#6a6a80', e: '#5a5a70', m: '#c9c9d6' }],
    cat: [{ n: 'Ginger tabby', a: '#e08a3c', b: '#b8642a', e: '#b8642a', m: '#f6e3bb', stripe: '#b8642a' }, { n: 'Black', a: '#2e2c3c', b: '#1e1c28', e: '#1e1c28', m: '#4a4658' },
      { n: 'Grey tabby', a: '#9a98a8', b: '#76748a', e: '#76748a', m: '#d6d4de', stripe: '#6a687c' }, { n: 'Calico', a: '#efe6d6', b: '#cfc4b0', e: '#e08a3c', m: '#ffffff', patches: ['#e08a3c', '#2e2c3c'] }],
  };
  C.MAX_PETS = 4;
  const FOODS = () => Object.keys(D.ITEMS).filter(k => D.ITEMS[k].use === 'Eat').sort((a, b) => (D.VALUE[a] || 1) - (D.VALUE[b] || 1));

  // ---------------------------------------------------------------- save data
  C.norm = function (v) {
    const c = v.crew = v.crew && typeof v.crew === 'object' ? v.crew : {};
    c.list = Array.isArray(c.list) ? c.list.filter(m => m && m.id) : [];
    for (const m of c.list) { m.look = ART.LOOK.norm(m.look); if (!ROLES[m.role]) m.role = 'scavenger'; m.xp = +m.xp || 0; m.mood = m.mood == null ? 70 : m.mood; m.hungry = m.hungry || 0; m.name = m.name || 'Survivor'; m.past = m.past || PAST[0]; }
    c.seq = c.seq || 0; c.notes = Array.isArray(c.notes) ? c.notes.slice(-6) : []; c.morning = c.morning || null; c.met = c.met || 0;
    const p = v.pets = v.pets && typeof v.pets === 'object' ? v.pets : {};
    p.list = Array.isArray(p.list) ? p.list.filter(x => x && x.id && COATS[x.kind]) : [];
    for (const x of p.list) { x.xp = +x.xp || 0; x.coat = Math.max(0, Math.min(COATS[x.kind].length - 1, x.coat | 0)); x.name = x.name || PET_NAMES[x.kind][0]; x.away = x.away || 0; }
    if (p.list.length && !p.list.some(x => x.active)) p.list[0].active = true;
    p.seq = p.seq || 0;
    return v;
  };
  const crew = () => SV().crew.list, pets = () => SV().pets.list;
  C.bunks = () => 2 + ((SV().base && SV().base.built.bunks) || 0);
  C.free = () => C.bunks() - crew().length;
  const working = m => m.mood >= 25;                        // a miserable crew member does not do their job
  C.activePet = () => pets().find(p => p.active && !(p.away && p.away >= dayNo())) || null;
  const roleLv = r => crew().filter(m => m.role === r && working(m)).map(C.lv);

  // perks used elsewhere
  C.guardDef = () => SV() && SV().crew ? roleLv('guard').reduce((a, l) => a + 4 + 2 * l, 0) : 0;
  C.repairMul = () => { if (!SV() || !SV().crew) return 1; const l = Math.max(0, ...roleLv('tinkerer')); return l ? 1 - (.1 + .04 * l) : 1; };
  C.autoShare = function () { // the crew auto-search loot share: ~35% with no crew (neighbours help), more with a bigger, better crew
    if (!SV() || !SV().crew) return .4;
    const n = crew().filter(working).length, sc = roleLv('scavenger').reduce((a, l) => a + .02 + .01 * l, 0);
    return Math.min(.62, .35 + .04 * n + sc);
  };
  C.lockSkip = () => Math.max(.3, .5 - .04 * Math.max(0, ...roleLv('scavenger')));
  C.onTask = function (role, n = 1) { if (!SV() || !SV().crew) return; for (const m of crew()) if (m.role === role && working(m)) m.xp += n; };
  C.onSteps = function (n) { const p = SV() && SV().pets && C.activePet(); if (p && n > 0) { const l0 = C.plv(p); p.xp += n / 1000; if (C.plv(p) > l0) toast(`${p.name} is now level ${C.plv(p)}!`, 2.2); } };
  C.quiet = () => { const p = C.activePet(); return p && p.kind === 'cat' ? .85 - .03 * C.plv(p) : 1; };

  // ---------------------------------------------------------------- the morning at the base (called once per new day)
  C.morning = function (days) {
    const v = SV(); if (!v || !v.survivor || !v.crew) return;
    const lines = [], n = Math.max(1, Math.min(2, days | 0)), foods = FOODS(), stash = v.survivor.stash, t = dayNo();
    // meals: 1 food each per day, cheapest first, from the stash only. Capped at 2 days so a long break does not wipe the crew out.
    let ate = 0, missed = 0;
    for (let d = 0; d < n; d++) for (const m of crew()) {
      let fed = false;
      for (const k of foods) { const i = stash.findIndex(e => e.k === k); if (i < 0) continue; if (!--stash[i].n) stash.splice(i, 1); fed = true; break; }
      if (fed) { ate++; m.hungry = 0; m.mood = Math.min(100, m.mood + 6); m.xp += 1; }
      else { missed++; m.hungry++; m.mood = Math.max(0, m.mood - 22); }
    }
    if (ate) lines.push(`The crew ate ${ate} food from the stash.`);
    if (missed) lines.push(`<b class="bad">${missed} meal${missed > 1 ? 's' : ''} missed - there was no food in the stash.</b>`);
    for (const m of crew().filter(m => m.hungry >= 3)) {
      v.crew.list = v.crew.list.filter(x => x !== m);
      const note = pick([`Couldn't stay hungry any longer. Took nothing, I promise. Stay safe out there. - ${m.name}`, `Gone looking for a place with food. Thank you for the bunk. - ${m.name}`, `Three days without a meal. I'm sorry. Everything is still in the stash. - ${m.name}`]);
      v.crew.notes.push({ name: m.name, text: note, day: t, seen: false });
      lines.push(`<b class="bad">${esc(m.name)} left a note and walked out.</b>`);
    }
    // medic
    const heal = roleLv('medic').reduce((a, l) => a + 3 + 2 * l, 0), s = v.survivor;
    if (heal && s.hp < D.maxHp(s)) { const h0 = s.hp; s.hp = Math.min(D.maxHp(s), s.hp + heal); lines.push(`Your medic patched you up (+${Math.round(s.hp - h0)} HP).`); C.onTask('medic'); }
    // gardener
    if (roleLv('gardener').length && DM.Base.crewWater) { const w = DM.Base.crewWater(); if (w) { lines.push(`Your gardener watered the ${esc(w)}.`); C.onTask('gardener'); } }
    // pets come home; cats bring things
    for (const p of pets()) if (p.away && p.away < t) { p.away = 0; lines.push(`${esc(p.name)} came home in the night.`); }
    for (const p of pets()) {
      if (p.kind !== 'cat' || p.away) continue;
      const r = D.mulberry32(D.hashStr(v.seedBase + ':cat:' + p.id + ':' + t));
      if (r() < .3 + .05 * C.plv(p)) {
        const k = pick(['snack', 'cloth', 'battery', 'bandage', 'scrap', 'tape', 'seed_herbs', 'seed_tomato', 'nails', 'beans'], r);
        if (G().canGive([[k, 1]])) { G().give(k, 1); lines.push(`${esc(p.name)} dragged in a present: ${D.ITEMS[k].n.toLowerCase()}.`); }
      }
    }
    v.crew.morning = lines.length ? { day: t, lines, seen: false } : null;
  };

  // ---------------------------------------------------------------- recruiting + adopting
  function newMember(seed) {
    const r = D.mulberry32(seed), used = crew().map(m => m.name);
    const names = NAMES.filter(n => !used.includes(n));
    const look = ART.LOOK.random(); look.hood = r() < .5; look.skin = Math.floor(r() * 6); look.hair = Math.floor(r() * 6); look.hairC = Math.floor(r() * 8); look.body = r() < .5 ? 'm' : 'f';
    look.coat = Math.floor(r() * ART.LOOK.coats.length); look.pants = Math.floor(r() * ART.LOOK.pants.length);
    return { name: pick(names.length ? names : NAMES, r), look, role: pick(RKEYS, r), xp: 0, mood: 60, hungry: 0, past: pick(PAST, r) };
  }
  function join(spec) {
    const v = SV(), m = Object.assign({ id: 'c' + (++v.crew.seq), joined: Date.now() }, spec);
    v.crew.list.push(m); v.crew.met++; G().save(); return m;
  }
  function adopt(kind, coat) {
    const v = SV(), have = pets().map(p => p.name), nm = PET_NAMES[kind].filter(n => !have.includes(n));
    const p = { id: 'p' + (++v.pets.seq), kind, coat, name: pick(nm.length ? nm : PET_NAMES[kind]), xp: 0, active: !pets().some(p => p.active), away: 0, joined: Date.now() };
    v.pets.list.push(p); G().save(); return p;
  }
  // what is hiding in a scouted house (deterministic per house): { npc: {fi, spec}, stray: {fi, kind, coat} } - either can be null
  C.forHouse = function (h, L) {
    if (!h || h.type === 'tutorial' || !L || !L.furn) return { npc: null, stray: null };
    const r = D.mulberry32((h.seed ^ 0x6c1e2a5b) >>> 0);
    const big = h.type === 'mansion' || h.type === 'police';
    let npc = null, stray = null;
    if (r() < (big ? .1 : .04) || C.forceNpc) {
      const hid = L.furn.map((f, i) => [f, i]).filter(([f]) => f.secretLoot && f.room !== 'Z');
      const clo = L.furn.map((f, i) => [f, i]).filter(([f]) => ['wardrobe', 'coat', 'shelves', 'pantry', 'locker', 'shopshelf', 'supply'].includes(f.art));
      const pool = hid.length && r() < .5 ? hid : clo.length ? clo : hid;
      if (pool.length) npc = { fi: pick(pool, r)[1], seed: (h.seed ^ 0x2545f491) >>> 0 };
    }
    if (r() < .03 || C.forceStray) {
      const under = L.furn.map((f, i) => [f, i]).filter(([f]) => ['table', 'bed', 'sofa', 'desk', 'coffee', 'cot', 'schooldesk', 'bench'].includes(f.art));
      if (under.length) { const kind = r() < .55 ? 'dog' : 'cat'; stray = { fi: pick(under, r)[1], kind, coat: Math.floor(r() * COATS[kind].length) }; }
    }
    return { npc, stray };
  };

  // ---------------------------------------------------------------- rigs (crew portraits + sprites)
  const rigP = {};
  C.rigName = id => 'crew_' + id;
  C.ensureRig = function (id, look) { const k = C.rigName(id); if (!rigP[k]) rigP[k] = ART.buildRig('survivor', 1.2, ART.LOOK.recolor(look), k, ART.LOOK.patch(look)).catch(() => { delete rigP[k]; }); return rigP[k]; };
  C.ensureRigs = () => Promise.all(crew().map(m => C.ensureRig(m.id, m.look)));
  function portrait(cv, rig, o = {}) {
    if (!cv) return;
    const x = cv.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, cv.width, cv.height);
    x.fillStyle = 'rgba(8,6,22,.4)'; x.beginPath(); x.ellipse(cv.width / 2, cv.height * .92, cv.width * .3, cv.width * .08, 0, 0, 6.3); x.fill();
    ART.drawRig(x, rig, cv.width / 2 - 2, cv.height * .92, (o.sc || .82) * cv.height / 260, !!o.flip, { weapon: 'fists', sy: o.sy || 1 });
  }
  C.portrait = portrait;

  // ---------------------------------------------------------------- pet art (Style B: ink outline, flat fills, a bit roughed up)
  function drawPet(c, pet, x, y, o = {}) {
    const K = COATS[pet.kind][pet.coat] || COATS[pet.kind][0], dog = pet.kind === 'dog', t = o.t || 0, mv = o.move || 0;
    const sw = Math.sin((o.ph || 0) * 2) * mv, INK = P.INK;
    c.save(); c.translate(x, y); c.scale((o.flip ? -1 : 1) * (o.sc || 1), o.sc || 1); c.lineJoin = 'round'; c.lineCap = 'round';
    if (o.alpha != null) c.globalAlpha *= o.alpha;
    if (!o.peek) { c.fillStyle = 'rgba(8,6,22,.38)'; c.beginPath(); c.ellipse(0, 0, dog ? 20 : 16, 5, 0, 0, 6.28); c.fill(); }
    const L = (x0, y0, x1, y1, col, w) => { c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.strokeStyle = INK; c.lineWidth = w + 2.6; c.stroke(); c.strokeStyle = col; c.lineWidth = w; c.stroke(); };
    const ell = (cx, cy, rx, ry, rot, fill, lw = 2.4) => { c.beginPath(); c.ellipse(cx, cy, rx, ry, rot, 0, 6.28); c.fillStyle = fill; c.fill(); if (lw) { c.lineWidth = lw; c.strokeStyle = INK; c.stroke(); } };
    if (o.peek) { // hiding under furniture: only the face pokes out, eyes catching the light
      const k = o.peek; c.globalAlpha *= .55 + .45 * (1 - k);
      const hx = 0, hy = -8;
      if (dog) ell(hx - 9, hy - 2, 4, 7, .5, K.e); else { c.beginPath(); c.moveTo(hx - 8, hy - 5); c.lineTo(hx - 6, hy - 15); c.lineTo(hx - 1, hy - 7); c.closePath(); c.fillStyle = K.a; c.fill(); c.lineWidth = 2; c.strokeStyle = INK; c.stroke(); c.beginPath(); c.moveTo(hx + 8, hy - 5); c.lineTo(hx + 6, hy - 15); c.lineTo(hx + 1, hy - 7); c.closePath(); c.fill(); c.stroke(); }
      ell(hx, hy, dog ? 9 : 8, dog ? 8 : 7, 0, K.a);
      if (dog) ell(hx + 9, hy - 2, 4, 7, -.5, K.e);
      c.globalAlpha = 1 * (o.alpha == null ? 1 : o.alpha);
      for (const ex of [-3.4, 3.4]) { const gl = c.createRadialGradient(hx + ex, hy - 1, 0, hx + ex, hy - 1, 6); gl.addColorStop(0, 'rgba(255,240,170,.55)'); gl.addColorStop(1, 'rgba(255,240,170,0)'); c.fillStyle = gl; c.fillRect(hx + ex - 6, hy - 7, 12, 12); ell(hx + ex, hy - 1, 2.2, o.scared ? 2.6 : 2, 0, '#fff4c8', 1.2); ART.dot(c, hx + ex, hy - 1, dog ? 1.1 : .7, INK); }
      if (dog) ell(hx, hy + 3, 2.2, 1.6, 0, INK, 0);
      c.restore(); return;
    }
    const sit = o.sit && !mv;
    if (dog) {
      // legs
      const legs = [[-12, 1], [-8, -1], [9, 1], [13, -1]];
      for (const [lx, ph] of legs) L(lx, -12, lx + (sit && lx < 0 ? 4 : sw * 5 * ph), sit && lx < 0 ? -4 : 0, ph > 0 ? K.b : K.a, 3.6);
      // tail (wags when idle or happy)
      const wag = Math.sin(t * (o.happy ? 16 : 7)) * (mv ? .25 : .6);
      c.save(); c.translate(-16, -18); c.rotate(-.9 + wag); L(0, 0, 0, -12, K.a, 3.4); c.restore();
      // body
      ell(0, sit ? -14 : -16, 17, sit ? 10 : 9, sit ? -.25 : 0, K.a);
      c.save(); c.beginPath(); c.ellipse(0, sit ? -14 : -16, 17, sit ? 10 : 9, sit ? -.25 : 0, 0, 6.28); c.clip();
      c.fillStyle = K.b; c.fillRect(-18, -12, 36, 6);
      if (K.patch) { ell(-6, -20, 6, 4, .3, K.patch, 0); }
      c.restore();
      // the roughed-up bits: a taped patch on the flank
      c.save(); c.translate(-5, -19); c.rotate(-.3); c.fillStyle = '#efe2c0'; c.fillRect(-3.5, -2.5, 7, 5); c.lineWidth = 1.2; c.strokeStyle = INK; c.strokeRect(-3.5, -2.5, 7, 5); c.beginPath(); c.moveTo(-3.5, 0); c.lineTo(3.5, 0); c.stroke(); c.restore();
      // owned pets wear an orange bandana
      if (!o.stray) { c.beginPath(); c.moveTo(9, -24); c.lineTo(17, -19); c.lineTo(13, -14); c.closePath(); c.fillStyle = P.ORA; c.fill(); c.lineWidth = 1.8; c.strokeStyle = INK; c.stroke(); }
      // head
      const hb = Math.sin(t * 2.4) * .8, hx = 17, hy = -27 + hb;
      ell(hx, hy, 8.5, 8, 0, K.a);
      ell(hx + 7, hy + 3, 5.2, 3.8, 0, K.m, 2);
      ART.dot(c, hx + 11.5, hy + 1.6, 2.1, INK);
      ell(hx + 2, hy - 1.8, 1.7, 2, 0, INK, 0); ART.dot(c, hx + 2.5, hy - 2.5, .6, '#fff');
      // floppy ear with a notch torn out
      c.save(); c.translate(hx - 4, hy - 4); c.rotate(.5 + Math.sin(t * 3) * .08 + mv * sw * .1); ell(0, 5, 3.6, 7, 0, K.e); c.fillStyle = K.a; c.beginPath(); c.moveTo(-3.6, 8); c.lineTo(-1, 9); c.lineTo(-3.4, 10.5); c.closePath(); c.fill(); c.restore();
      if (o.bark) { c.font = '900 13px Inter, sans-serif'; c.fillStyle = P.CRM; c.strokeStyle = INK; c.lineWidth = 3; c.strokeText('!', hx + 8, hy - 12); c.fillText('!', hx + 8, hy - 12); }
    } else {
      const legs = [[-9, 1], [-6, -1], [7, 1], [10, -1]];
      for (const [lx, ph] of legs) L(lx, -9, lx + (sit && lx < 0 ? 3 : sw * 4 * ph), sit && lx < 0 ? -3 : 0, ph > 0 ? K.b : K.a, 2.8);
      // tail: long, curling up
      const sway = Math.sin(t * 2.2) * 4;
      c.beginPath(); c.moveTo(-12, -13); c.quadraticCurveTo(-22, -16, -20 + sway * .4, -28); c.quadraticCurveTo(-18 + sway, -34, -14 + sway, -32);
      c.strokeStyle = INK; c.lineWidth = 6; c.stroke(); c.strokeStyle = K.a; c.lineWidth = 3.4; c.stroke();
      ell(0, sit ? -12 : -13, 13, sit ? 8.5 : 7.5, sit ? -.3 : 0, K.a);
      c.save(); c.beginPath(); c.ellipse(0, sit ? -12 : -13, 13, sit ? 8.5 : 7.5, sit ? -.3 : 0, 0, 6.28); c.clip();
      if (K.stripe) for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(-6 + i * 5, -26, 13, 1.25, 1.55); c.strokeStyle = K.stripe; c.lineWidth = 2; c.stroke(); }
      if (K.patches) { ell(-5, -16, 4.5, 3.2, .3, K.patches[0], 0); ell(4, -11, 3.6, 2.6, 0, K.patches[1], 0); }
      c.restore();
      if (!o.stray) { L(9, -19, 13, -14, P.ORA, 2); }
      const hx = 13, hy = -21 + Math.sin(t * 2) * .6;
      // ears (the left one has a notch)
      for (const [ex, notch] of [[-4, 1], [3, 0]]) { c.beginPath(); c.moveTo(hx + ex - 3, hy - 4); c.lineTo(hx + ex - 1, hy - 13); if (notch) { c.lineTo(hx + ex, hy - 10); c.lineTo(hx + ex + 1, hy - 11); } c.lineTo(hx + ex + 3.5, hy - 5); c.closePath(); c.fillStyle = K.a; c.fill(); c.lineWidth = 2; c.strokeStyle = INK; c.stroke(); }
      ell(hx, hy, 7.6, 6.8, 0, K.a);
      if (K.patches) ell(hx - 3, hy - 3, 3, 2.4, 0, K.patches[1], 0);
      ell(hx + 3.2, hy - .8, 1.8, 2.2, 0, '#c8e07a', 1.1); c.fillStyle = INK; c.fillRect(hx + 2.9, hy - 2.6, .9, 3.6);
      ART.dot(c, hx + 7.2, hy + 1.6, 1.3, '#e08a9a');
      c.strokeStyle = 'rgba(246,227,187,.7)'; c.lineWidth = .8; c.beginPath(); c.moveTo(hx + 6, hy + 2.5); c.lineTo(hx + 13, hy + 1.5); c.moveTo(hx + 6, hy + 3.5); c.lineTo(hx + 12.5, hy + 4.5); c.stroke();
      // a little scar over the eye
      c.strokeStyle = INK; c.lineWidth = 1; c.beginPath(); c.moveTo(hx + 1, hy - 5); c.lineTo(hx + 4.6, hy - 2.4); c.stroke();
    }
    if (o.heart) { const a = Math.min(1, o.heart); c.globalAlpha *= a; c.fillStyle = '#f07aa8'; c.strokeStyle = INK; c.lineWidth = 1.6; const hx = dog ? 16 : 12, hy = (dog ? -44 : -36) - (1 - a) * 8; c.beginPath(); c.moveTo(hx, hy + 5); c.bezierCurveTo(hx - 8, hy - 1, hx - 3, hy - 7, hx, hy - 2.5); c.bezierCurveTo(hx + 3, hy - 7, hx + 8, hy - 1, hx, hy + 5); c.fill(); c.stroke(); }
    c.restore();
  }
  C.drawPet = drawPet;
  C.petPortrait = function (cv, pet, o = {}) {
    if (!cv) return; const x = cv.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, cv.width, cv.height);
    const sc = cv.height / 46; drawPet(x, pet, cv.width / 2 - 2 * sc, cv.height * .88, Object.assign({ sc, t: 1, sit: true }, o));
  };
  const bark = () => { if (!SFX.ac) return; SFX.tone('square', 560, 360, .09, .05); SFX.tone('square', 600, 380, .09, .05, .14); };
  const meow = () => { if (!SFX.ac) return; SFX.tone('triangle', 640, 900, .16, .05); SFX.tone('triangle', 900, 560, .22, .05, .16); };
  const yelp = () => { if (!SFX.ac) return; SFX.tone('triangle', 900, 1300, .12, .06); };

  // ---------------------------------------------------------------- in-run sheets (#msheet, the game pauses underneath)
  let paused = false;
  function panel(html) {
    const el = $('#msheet'); el.innerHTML = `<div class="mcard crewdlg">${html}</div>`; el.classList.add('on'); E.resetJoy();
    if (DM.scene && DM.House.G && !DM.House.G.over) { DM.House.pause(true); paused = true; }
    el.onclick = e => { if (e.target === el) close(); };
  }
  function close() { const el = $('#msheet'); el.classList.remove('on'); el.innerHTML = ''; el.onclick = null; if (paused) { paused = false; if (DM.House.G && !DM.House.G.over) DM.House.pause(false); } }
  C.closePanel = close;

  // ---------------------------------------------------------------- runs: wrap the house.js hooks
  let R = null;
  C.run = () => R;
  C.wrap = function (o, kind, extra = {}) {
    const v = SV();
    R = { kind, extra, init: false, pet: null, npc: null, stray: null, ents: [], barkT: 0, sniffT: 18 + Math.random() * 10, sniffF: null, sniffLeft: 0, whisper: false, hintT: 0 };
    const ap = v && v.pets ? C.activePet() : null;
    if (ap) R.petRec = ap;
    if (kind === 'house' && extra.hide) {
      if (extra.hide.npc) { // a fresh rig for this house's survivor (the 'crew_npc' rig is reused run to run)
        R.npcSpec = extra.hide.npc; R.npcLook = newMember(extra.hide.npc.seed); const k = C.rigName('npc'); delete ART.rigs[k];
        rigP[k] = ART.buildRig('survivor', 1.2, ART.LOOK.recolor(R.npcLook.look), k, ART.LOOK.patch(R.npcLook.look)).catch(() => { });
      }
      if (extra.hide.stray) R.straySpec = extra.hide.stray;
    }
    if (kind === 'base') C.ensureRigs();
    const O = Object.assign({}, o);
    O.acts = (out, g) => { if (o.acts) o.acts(out, g); acts(out, g); };
    O.tick = (dt, g) => { if (o.tick) o.tick(dt, g); tick(dt, g); };
    O.sprites = g => (o.sprites ? o.sprites(g) : []).concat(sprites(g));
    O.onAlert = z => { if (o.onAlert) o.onAlert(z); onAlert(z); };
    O.quiet = () => (o.quiet ? o.quiet() : 1) * C.quiet();
    const ex = o.onExit; O.onExit = res => { R = null; close(); if (ex) ex(res); };
    return O;
  };
  function init(g) {
    if (R.init) return; R.init = true;
    const p = g.p;
    if (R.petRec) R.pet = { rec: R.petRec, x: p.x - 30, y: p.y + 8, vx: 0, vy: 0, hw: 7, hh: 5, ph: 0, flip: false, st: 'follow', heart: 0, barkT: 0 };
    if (R.npcSpec) {
      const f = g.furn[R.npcSpec.fi];
      if (f) {
        const cx = f.x + f.w / 2;
        let y = f.y + f.h + T * .42; if (DM.House.solidAt(Math.floor(cx / T), Math.floor(y / T))) y = f.y - T * .3;
        R.npc = { m: R.npcLook, x: cx + (f.w > T ? T * .3 : 0), y, room: f.room, st: 'hide', t: 0, a: 1, flip: true, hw: 10, hh: 7 };
      }
    }
    if (R.straySpec) {
      const f = g.furn[R.straySpec.fi];
      if (f) R.stray = { pet: { kind: R.straySpec.kind, coat: R.straySpec.coat, name: '' }, x: f.x + f.w / 2, y: f.y + f.h - 2, room: f.room, trust: 0, scaredT: 0, st: 'hide', t: 0, a: 1, flip: false, ph: 0, vx: 0, vy: 0, hw: 7, hh: 5, f };
    }
    if (R.kind === 'base') {
      const Y = R.extra.yard || { x0: 3, x1: 17, y0: 13, y1: 23 };
      const spot = () => ({ x: (Y.x0 + .5 + Math.random() * (Y.x1 - Y.x0)) * T, y: (Y.y0 + .5 + Math.random() * (Y.y1 - Y.y0)) * T });
      for (const m of crew()) { const s = spot(); R.ents.push({ m, x: s.x, y: s.y, vx: 0, vy: 0, hw: 10, hh: 7, ph: 0, flip: Math.random() < .5, wait: Math.random() * 3, tgt: null, spot }); }
      for (const pt of pets()) { if (R.pet && pt === R.pet.rec) continue; if (pt.away && pt.away >= dayNo()) continue; const s = spot(); R.ents.push({ pet: pt, x: s.x, y: s.y, vx: 0, vy: 0, hw: 7, hh: 5, ph: 0, flip: Math.random() < .5, wait: 1 + Math.random() * 4, tgt: null, spot, heart: 0 }); }
    }
  }
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  function walkTo(e, tx, ty, spd, dt) {
    const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 18);
    e.vx = E.lerp(e.vx, dx / d * spd * k, 1 - Math.exp(-10 * dt)); e.vy = E.lerp(e.vy, dy / d * spd * k, 1 - Math.exp(-10 * dt));
    const ox = e.x, oy = e.y; DM.House.move(e, e.vx * dt, e.vy * dt);
    const m = Math.hypot(e.x - ox, e.y - oy); e.ph += m / (T * .3) * Math.PI * .5; if (Math.abs(e.vx) > 6) e.flip = e.vx < 0;
    return m;
  }
  function tick(dt, g) {
    init(g);
    const p = g.p; R.t = (R.t || 0) + dt;
    // the active pet trails behind her (paths around walls through the house's own flow field)
    const pe = R.pet;
    if (pe) {
      pe.barkT = Math.max(0, pe.barkT - dt); pe.heart = Math.max(0, pe.heart - dt);
      if (pe.st === 'flee') { pe.t = (pe.t || 0) + dt; pe.a = Math.max(0, 1 - pe.t / 1.4); walkTo(pe, pe.fx, pe.fy, 5.5 * T, dt); if (pe.t > 1.5) R.pet = null; }
      else {
        const d = dist(pe, p);
        if (d > 10 * T) { pe.x = p.x - p.fx * 30; pe.y = p.y - p.fy * 20; pe.vx = pe.vy = 0; }
        else if (d > 1.4 * T) {
          const see = DM.House.los(pe.x, pe.y - 10, p.x, p.y - 10);
          const st = see ? { x: p.x - p.fx * 26, y: p.y - p.fy * 16 } : DM.House.stepToPlayer(pe);
          walkTo(pe, st.x, st.y, Math.min(5 * T, 1.5 * T + d * 1.8), dt);
        } else { pe.vx *= Math.exp(-8 * dt); pe.vy *= Math.exp(-8 * dt); pe.ph = E.lerp(pe.ph, 0, .1); if (Math.abs(p.x - pe.x) > 8) pe.flip = p.x < pe.x; }
        // a zombie lunging at her catches the pet instead? It yelps and runs home.
        for (const z of g.zs) if (!z.dead && (z.st === 'lunge' || z.bst === 'charge') && dist(z, pe) < .7 * T) { petRunsOff(pe, z); break; }
        if (R.pet && pe.rec.kind === 'dog' && R.kind === 'house') sniff(dt, g, pe);
      }
    }
    if (R.npc) npcTick(dt, g);
    if (R.stray) strayTick(dt, g);
    for (const e of R.ents) baseWander(e, dt, g);
  }
  function petRunsOff(pe, z) {
    const r = pe.rec; r.away = dayNo(); G().save(); yelp();
    pe.st = 'flee'; pe.t = 0; const a = Math.atan2(pe.y - z.y, pe.x - z.x); pe.fx = pe.x + Math.cos(a) * 6 * T; pe.fy = pe.y + Math.sin(a) * 6 * T;
    toast(`${r.name} yelped and bolted. ${r.kind === 'dog' ? 'He' : 'She'}'ll find the way home by tomorrow.`, 2.8);
  }
  function onAlert(z) {
    const pe = R && R.pet; if (!pe || pe.st === 'flee' || pe.rec.kind !== 'dog') return;
    if (R.t - (R.lastBark || -99) < 5) return; R.lastBark = R.t;
    pe.barkT = 1.1; bark();
    if (!R.barked) { R.barked = 1; toast(`${pe.rec.name} barks - something spotted you!`, 1.8); }
  }
  function sniff(dt, g, pe) {
    if (R.sniffF) { // sparkles on the container for a while
      R.sniffLeft -= dt; const f = R.sniffF;
      if (Math.random() < dt * 8) g.parts.push({ x: f.x + 6 + Math.random() * (f.w - 12), y: f.y + f.h - 4, z: 6 + Math.random() * 40, vx: (Math.random() - .5) * 8, vy: 0, vz: 10 + Math.random() * 12, g: 0, life: 1.4, max: 1.4, col: 'rgba(255,226,122,.9)', size: 2 + Math.random() * 1.5, mote: 1 });
      if (R.sniffLeft <= 0 || f.searched) R.sniffF = null;
      return;
    }
    R.sniffT -= dt; if (R.sniffT > 0) return;
    const lv = C.plv(pe.rec); R.sniffT = 40 - 4 * lv + Math.random() * 15;
    if (Math.random() > .55 + .07 * lv) return;
    const good = k => { const it = D.ITEMS[k]; return it && (it.rare || k.startsWith('bp_') || it.cos); };
    const c = g.furn.filter(f => f.lootable && !f.searched && !f.locked && f.pre && f.pre.some(good) && DM.House.fogOf(f.room) < .5 && dist({ x: f.x + f.w / 2, y: f.y + f.h }, g.p) < 7 * T);
    if (!c.length) return;
    const f = c[Math.floor(Math.random() * c.length)]; R.sniffF = f; R.sniffLeft = 9;
    toast(`${pe.rec.name} sniffs hard at the ${(f.name || 'cupboard').toLowerCase()}...`, 2.2); bark();
  }
  // ---- the hidden survivor
  function npcTick(dt, g) {
    const n = R.npc, p = g.p; n.t += dt;
    if (n.st === 'leave') { n.a = Math.max(0, n.a - dt * .8); if (n.a <= 0) R.npc = null; return; }
    const vis = DM.House.fogOf(n.room) < .55, d = dist(n, p);
    if (vis && d < 3.2 * T && !R.whisper) { R.whisper = true; toast('Psst... don\'t swing. I\'m not one of them.', 2.4); }
  }
  function talk() {
    const n = R.npc; if (!n) return;
    const m = n.m, Rl = ROLES[m.role], free = C.free();
    panel(`<div class="kick">Someone was hiding</div><div class="dlg"><canvas id="dlgPort" width="150" height="190"></canvas>
      <div class="dtext"><h3>${esc(m.name)}</h3><div class="drole" style="color:${Rl.col}">${Rl.n}</div>
      <p class="mp">"I ${esc(m.past)}. Been in here ${2 + (D.hashStr(m.name) % 9)} days. ${Rl.line}"</p></div></div>
      <div class="perkline"><b>${Rl.n} perk</b><span>${Rl.perk(1)}. Levels up slowly.</span></div>
      <p class="mp small">Crew live at your base and eat 1 food a day from your stash. Three hungry days and they leave.</p>
      ${free > 0 ? `<button class="mbtn" id="dJoin">"Come to my base. There's a bunk."</button><button class="mbtn ghost" id="dNo">"Not now. Stay hidden."</button>`
        : `<p class="mp warn">Your bunks are full (${C.bunks()}/${C.bunks()}). Build a bunk bed at the base for room.</p><button class="mbtn ghost" id="dNo">"Good luck out there."</button>`}`);
    C.ensureRig('npc', m.look); setTimeout(() => portrait($('#dlgPort'), C.rigName('npc')), 30); setTimeout(() => portrait($('#dlgPort'), C.rigName('npc')), 400);
    if ($('#dJoin')) $('#dJoin').onclick = () => {
      const mem = join({ name: m.name, look: m.look, role: m.role, xp: 0, mood: 65, hungry: 0, past: m.past });
      C.ensureRig(mem.id, mem.look);
      close(); SFX.play('pick'); n.st = 'leave'; toast(`${m.name} is heading to your base`, 2.2);
    };
    $('#dNo').onclick = () => { close(); n.st = 'leave'; toast(`${m.name} slips out the back`, 1.6); };
  }
  // ---- the stray: approach slowly (small joystick push) to win its trust, or offer food
  function strayTick(dt, g) {
    const s = R.stray, p = g.p; s.t += dt;
    if (s.st === 'leave') { s.a = Math.max(0, s.a - dt * .7); if (s.a <= 0) R.stray = null; return; }
    s.scaredT = Math.max(0, s.scaredT - dt);
    const vis = DM.House.fogOf(s.room) < .55; if (!vis) return;
    const d = dist(s, p), spd = Math.hypot(p.vx, p.vy);
    if (d < 3.4 * T) {
      if (p.running || spd > 1.9 * T || p.st === 'swing' || p.st === 'dodge') {
        if (s.trust > 0 || !s.scaredT) { s.trust = Math.max(0, s.trust - dt * 1.2); s.scaredT = 1.4; }
        R.hintT -= dt; if (R.hintT <= 0) { R.hintT = 6; toast(`Too fast - the ${s.pet.kind} shrinks back. Ease the joystick, move slowly.`, 2.4); }
      } else if (!s.scaredT && d < 2.8 * T) {
        const t0 = s.trust; s.trust = Math.min(1, s.trust + dt * (spd > .3 * T ? .32 : .2));
        if (t0 < .6 && s.trust >= .6) { toast(`The ${s.pet.kind} is watching you. Tap to coax it out.`, 2); if (s.pet.kind === 'cat') meow(); }
      }
    }
  }
  function coax(food) {
    const s = R.stray; if (!s) return;
    if (!food && s.trust < .6) { s.scaredT = 1; toast(`It backs further under. Get close slowly${hasFood() ? '' : ' - or bring food'}.`, 2.2); return; }
    if (food) { const i = DM.House.G.pack.findIndex(e => D.ITEMS[e.k].use === 'Eat'); if (i >= 0) { const e = DM.House.G.pack[i], nm = D.ITEMS[e.k].n.toLowerCase(); if (!--e.n) DM.House.G.pack.splice(i, 1); toast(`You set down some ${nm}...`, 1.4); } }
    if (s.pet.kind === 'cat') meow(); else bark();
    s.st = 'out'; s.y += 10;
    if (pets().length >= C.MAX_PETS) { s.st = 'leave'; toast(`You already look after ${C.MAX_PETS} strays. This one licks your hand and trots off.`, 2.8); return; }
    const pt = adopt(s.pet.kind, s.pet.coat); s.st = 'leave';
    namePet(pt, true);
  }
  const hasFood = () => DM.House.G && DM.House.G.pack.some(e => D.ITEMS[e.k] && D.ITEMS[e.k].use === 'Eat');
  function namePet(pt, isNew) {
    const K = COATS[pt.kind][pt.coat];
    panel(`<div class="kick">${isNew ? 'A stray trusts you' : 'Your ' + pt.kind}</div><div class="dlg"><canvas id="petPort" width="160" height="120"></canvas>
      <div class="dtext"><h3>${isNew ? (pt.kind === 'dog' ? 'A scruffy dog' : 'A scrappy cat') : esc(pt.name)}</h3><div class="drole">${K.n} ${pt.kind}</div>
      <p class="mp">${pt.kind === 'dog' ? 'Barks when a zombie spots you, and now and then sniffs out a container with something good.' : 'Makes your footsteps quieter, and some mornings brings you a little present.'}</p></div></div>
      <label class="kick" for="petName">Name</label>
      <input id="petName" class="namein" maxlength="14" value="${esc(pt.name)}" autocomplete="off" autocapitalize="words" spellcheck="false">
      <button class="mbtn" id="petOk">${isNew ? 'Welcome home' : 'Save name'}</button>${isNew ? `<p class="mp small">${pets().length > 1 ? 'It goes to your base. Pick who comes along in the Crew sheet at home.' : 'It follows you on runs and at the base.'}</p>` : ''}`);
    C.petPortrait($('#petPort'), pt, { happy: true, heart: 1 });
    $('#petOk').onclick = () => { const v = String($('#petName').value || '').trim().slice(0, 14); if (v) pt.name = v; G().save(); close(); toast(isNew ? `${pt.name} is part of the crew now` : 'Renamed', 1.8); if (C.onChange) C.onChange(); };
  }
  C.namePet = namePet;
  // ---- base: crew and the other pets wander the yard
  function baseWander(e, dt, g) {
    if (R.kind === 'shift') return;
    e.heart = Math.max(0, (e.heart || 0) - dt);
    if (e.wait > 0) { e.wait -= dt; e.vx *= .8; e.vy *= .8; return; }
    if (!e.tgt) { for (let i = 0; i < 6; i++) { const s = e.spot(); if (!DM.House.solidAt(Math.floor(s.x / T), Math.floor(s.y / T))) { e.tgt = s; break; } } if (!e.tgt) { e.wait = 1; return; } e.stuck = 0; }
    const m = walkTo(e, e.tgt.x, e.tgt.y, e.pet ? 1.3 * T : .95 * T, dt);
    if (m < .05 * T * dt) e.stuck = (e.stuck || 0) + dt;
    if (dist(e, e.tgt) < 8 || e.stuck > 1.2) { e.tgt = null; e.wait = (e.pet ? 2 : 1.5) + Math.random() * (e.pet ? 6 : 4); }
  }
  // ---- interactions
  function acts(out, g) {
    if (!R) return; init(g);
    if (R.extra.edit && R.extra.edit()) return;
    const A = (obj, act, name, done, o = {}) => out.push(Object.assign({ obj, act, name, rect: { x: obj.x - 16, y: obj.y - 12, w: 32, h: 22 }, dur: .25, noise: 0, verb: 'talking', corpse: true, done }, o));
    if (R.npc && R.npc.st === 'hide' && DM.House.fogOf(R.npc.room) < .55) A(R.npc, 'Talk', 'to the survivor', talk, { dur: .4 });
    if (R.stray && R.stray.st === 'hide' && DM.House.fogOf(R.stray.room) < .55) {
      const s = R.stray, food = s.trust < .6 && hasFood();
      A(s, food ? 'Offer food' : 'Coax', `the ${s.pet.kind}`, () => coax(food), { dur: food ? .9 : 1.1, verb: 'coaxing', rect: { x: s.x - 22, y: s.y - 10, w: 44, h: 22 } });
    }
    if (R.kind === 'base') for (const e of R.ents) {
      if (e.m) A(e, 'Talk', e.m.name, () => chat(e.m));
      else A(e, 'Pet', e.pet.name, () => { e.heart = 1.6; e.wait = 2; if (e.pet.kind === 'cat') meow(); else bark(); toast(`${e.pet.name} leans into the scratch`, 1.4); }, { verb: 'petting' });
    }
    if (R.pet && R.pet.st !== 'flee' && R.kind === 'base') { const pe = R.pet; A(pe, 'Pet', pe.rec.name, () => { pe.heart = 1.6; if (pe.rec.kind === 'cat') meow(); else bark(); toast(`${pe.rec.name} leans into the scratch`, 1.4); }, { verb: 'petting' }); }
  }
  function chat(m) {
    const Rl = ROLES[m.role], lv = C.lv(m);
    const line = m.hungry ? 'Is there anything to eat? The stash is empty.' : m.mood >= 75 ? pick(['Good day. Feels almost normal.', 'I found a radio station that still plays music. Sort of.', 'You keep walking, I keep this place standing.'])
      : m.mood >= 45 ? pick(['Quiet out there today.', 'Another day.', 'Bring back some tape if you see any.']) : 'I don\'t know how long I can keep this up.';
    toast(`${m.name} · ${Rl.n} Lv ${lv}: "${line}"`, 3);
  }
  // ---- drawing
  function sprites(g) {
    if (!R) return []; init(g);
    const out = [], t = g.t;
    const pe = R.pet;
    if (pe) out.push({ k: pe.y, draw: c => drawPet(c, pe.rec, pe.x, pe.y, { t, ph: pe.ph, move: Math.min(1, Math.hypot(pe.vx, pe.vy) / (2 * T)), flip: pe.flip, sit: Math.hypot(pe.vx, pe.vy) < 4, bark: pe.barkT > 0, heart: pe.heart, alpha: pe.a, sc: 1.1 }) });
    if (R.npc) { const n = R.npc; out.push({ k: n.y, draw: c => { if (!ART.rigs[C.rigName('npc')]) return; c.save(); c.globalAlpha = n.a; const sh = n.st === 'hide' ? Math.sin(n.t * 30) * .4 : 0; c.fillStyle = 'rgba(8,6,22,.4)'; c.beginPath(); c.ellipse(n.x, n.y + 1, 16, 5.5, 0, 0, 6.28); c.fill(); ART.drawRig(c, C.rigName('npc'), n.x + sh, n.y, E.PSCALE, n.flip, { weapon: 'fists', sy: n.st === 'hide' ? .8 : 1, rot: n.st === 'hide' ? -.06 : 0, parts: { arm: { r: n.st === 'hide' ? -1.1 : 0 } } }); c.restore(); } }); }
    if (R.stray) {
      const s = R.stray;
      out.push({ k: s.st === 'hide' ? s.f.y + s.f.h + 1 : s.y, draw: c => {
        if (s.st === 'hide') {
          drawPet(c, s.pet, s.x, s.y + 6, { peek: s.scaredT ? .9 : Math.max(0, .9 - s.trust), scared: s.scaredT > 0, stray: true, t: g.t, sc: 1.1 });
          if (s.trust > 0) { const w = 30, x = s.x - w / 2, y = s.y - 30; ART.rr(c, x - 1, y - 1, w + 2, 6, 3); c.fillStyle = P.INK; c.fill(); ART.rr(c, x, y, w * s.trust, 4, 2); c.fillStyle = s.trust >= .6 ? '#f07aa8' : P.MUTE; c.fill(); }
        } else drawPet(c, s.pet, s.x, s.y, { t: g.t, alpha: s.a, happy: true, heart: 1, stray: true, sc: 1.1 });
      } });
    }
    for (const e of R.ents) {
      if (R.kind === 'shift') continue;
      if (e.pet) out.push({ k: e.y, draw: c => drawPet(c, e.pet, e.x, e.y, { t: t + e.x, ph: e.ph, move: Math.min(1, Math.hypot(e.vx, e.vy) / (1.3 * T)), flip: e.flip, sit: e.wait > 0, heart: e.heart, sc: 1.1 }) });
      else out.push({ k: e.y, draw: c => {
        const rn = C.rigName(e.m.id); if (!ART.rigs[rn]) return;
        const amp = Math.min(1, Math.hypot(e.vx, e.vy) / (.95 * T)), s = Math.sin(e.ph * 2);
        c.fillStyle = 'rgba(8,6,22,.4)'; c.beginPath(); c.ellipse(e.x, e.y + 1, 16, 5.5, 0, 0, 6.28); c.fill();
        ART.drawRig(c, rn, e.x, e.y - Math.abs(Math.cos(e.ph * 2)) * 2 * amp, E.PSCALE, e.flip, { weapon: 'fists', sy: 1 + (amp < .1 ? Math.sin(t * 2.4 + e.x) * .012 : 0), parts: { legB: { r: s * .45 * amp }, legF: { r: -s * .45 * amp }, arm: { r: -s * .16 * amp } } });
        if (e.m.hungry && Math.sin(t * 3) > 0) { c.font = '900 11px Inter, sans-serif'; c.fillStyle = '#ff8a7a'; c.textAlign = 'center'; c.fillText('hungry', e.x, e.y - 104); c.textAlign = 'left'; }
      } });
    }
    return out;
  }

  // ---------------------------------------------------------------- home: crew card + crew sheet
  C.cardHTML = function () {
    const v = SV(), cl = crew(), pl = pets(), food = foodCount(), nNote = v.crew.notes.filter(n => !n.seen).length;
    const mo = v.crew.morning && !v.crew.morning.seen ? v.crew.morning : null;
    const days = cl.length ? Math.floor(food / cl.length) : null;
    return `<div class="crewcard"><div class="cchead"><span class="kick">Crew &amp; strays</span><span class="ccsub">${cl.length}/${C.bunks()} bunks · ${pl.length}/${C.MAX_PETS} pets</span></div>
      <div class="ccrow" id="ccRow">${cl.map(m => `<canvas class="ccport${m.hungry ? ' hungry' : ''}" data-cp="${m.id}" width="72" height="92"></canvas>`).join('')}${pl.map(p => `<canvas class="ccpet${p.away ? ' away' : ''}" data-pp="${p.id}" width="80" height="60"></canvas>`).join('')}
        ${!cl.length && !pl.length ? '<div class="ccempty">Nobody yet. Survivors hide in closets and secret rooms; strays hide under furniture. Look carefully.</div>' : ''}</div>
      ${cl.length ? `<div class="ccfood${days < 2 ? ' low' : ''}">${icon('beans')} ${food} food in the stash · the crew eats ${cl.length}/day${days != null ? ` · ${days < 1 ? 'not enough for tomorrow!' : `enough for ${days} day${days === 1 ? '' : 's'}`}` : ''}</div>` : ''}
      ${mo ? `<div class="ccmorn"><b>This morning</b>${mo.lines.map(l => `<span>${l}</span>`).join('')}</div>` : ''}
      ${nNote ? `<div class="ccmorn bad"><b>${nNote} note${nNote > 1 ? 's' : ''} on your bunk</b><span>Open the crew sheet to read.</span></div>` : ''}
      <button class="mbtn sm" id="ccOpen">Crew${nNote ? ' · notes' : ''}</button></div>`;
  };
  C.bindCard = function (onChange) {
    C.onChange = onChange;
    const v = SV(); if (v.crew.morning && !v.crew.morning.seen) { v.crew.morning.seen = true; G().save(); }   // shown once
    const btn = $('#ccOpen'); if (btn) btn.onclick = () => { SFX.play('ui'); C.openSheet(); };
    drawCardPorts();
  };
  function drawCardPorts() {
    document.querySelectorAll('[data-cp]').forEach(cv => { const m = crew().find(x => x.id === cv.dataset.cp); if (!m) return; C.ensureRig(m.id, m.look).then(() => portrait(cv, C.rigName(m.id), { sc: .86 })); });
    document.querySelectorAll('[data-pp]').forEach(cv => { const p = pets().find(x => x.id === cv.dataset.pp); if (p) C.petPortrait(cv, p, { alpha: p.away ? .4 : 1 }); });
  }
  function foodCount() { const s = SV().survivor; return s.stash.filter(e => D.ITEMS[e.k] && D.ITEMS[e.k].use === 'Eat').reduce((a, e) => a + e.n, 0); }
  const moodWord = m => m.hungry ? 'Hungry' : m.mood >= 75 ? 'Happy' : m.mood >= 45 ? 'Okay' : m.mood >= 25 ? 'Grumpy' : 'Miserable';
  C.openSheet = function () {
    const v = SV(), cl = crew(), pl = pets(), notes = v.crew.notes.filter(n => !n.seen);
    const el = $('#msheet');
    el.innerHTML = `<div class="mcard wide crewsheet"><div class="kick">Your base</div><h3>Crew</h3>
      ${notes.map(n => `<div class="gnote"><b>A note from ${esc(n.name)}</b><p>${esc(n.text)}</p></div>`).join('')}
      <div class="poolline"><b>${cl.length}/${C.bunks()}</b> bunks <span>${C.bunks() < 4 ? 'build a bunk bed at the base for more' : 'all bunks built'} · each eats 1 food a day from the stash</span></div>
      ${cl.length ? cl.map(m => { const Rl = ROLES[m.role], lv = C.lv(m), nx = LVX[lv] || null; return `<div class="crow">
        <canvas data-cp="${m.id}" width="72" height="92"></canvas>
        <div class="cinfo"><b>${esc(m.name)}</b><div class="crole" style="color:${Rl.col}">${Rl.n} · Lv ${lv}</div>
          <div class="cperk">${Rl.perk(lv)}${working(m) ? '' : ' <em>(too unhappy to work)</em>'}</div>
          <div class="cbars"><span>Mood · ${moodWord(m)}</span><i class="cbar"><i style="width:${m.mood}%;background:${m.mood >= 45 ? '#93a86c' : m.mood >= 25 ? '#e0b94a' : '#ff6b5a'}"></i></i>
          <span>${nx ? `Lv ${lv + 1}: ${Math.floor(m.xp)}/${nx}` : 'Max level'}</span><i class="cbar"><i style="width:${nx ? Math.min(100, (m.xp - LVX[lv - 1]) / (nx - LVX[lv - 1]) * 100) : 100}%"></i></i></div>
          <div class="cpast">${esc(m.name)} ${esc(m.past)}.${m.hungry ? ` <b class="bad">Hungry ${m.hungry} day${m.hungry > 1 ? 's' : ''}${m.hungry >= 2 ? ' - leaves tomorrow without food!' : ''}</b>` : ''}</div>
          <button class="linkbtn" data-dis="${m.id}">Dismiss</button></div></div>`; }).join('')
        : '<div class="empty">No crew yet. About 1 house in 25 has someone hiding in a closet or a secret room - more in mansions and police stations.</div>'}
      <div class="kick sect">Strays · ${pl.length}/${C.MAX_PETS}</div>
      ${pl.length ? pl.map(p => { const lv = C.plv(p), nx = PLV[lv] || null, away = p.away && p.away >= dayNo(); return `<div class="crow pet${p.active ? ' act' : ''}">
        <canvas data-pp="${p.id}" width="96" height="72"></canvas>
        <div class="cinfo"><b>${esc(p.name)}</b> <button class="linkbtn inl" data-ren="${p.id}">rename</button><div class="crole">${COATS[p.kind][p.coat].n} ${p.kind} · Lv ${lv}</div>
          <div class="cperk">${p.kind === 'dog' ? `Barks when a zombie spots you · sniffs out good containers${lv > 1 ? ' (more often)' : ''}` : `Footsteps ${Math.round((.15 + .03 * lv) * 100)}% quieter · ${30 + 5 * lv}% chance of a morning present`}</div>
          <div class="cbars"><span>${nx ? `Lv ${lv + 1}: ${Math.floor(p.xp).toLocaleString('en-US')}k/${nx}k of your steps` : 'Max level'}</span><i class="cbar"><i style="width:${nx ? Math.min(100, (p.xp - PLV[lv - 1]) / (nx - PLV[lv - 1]) * 100) : 100}%"></i></i></div>
          ${away ? '<div class="cpast"><b class="bad">Ran off after a zombie scare - back tomorrow.</b></div>' : ''}
          ${p.active ? '<span class="pactive">Comes along on runs</span>' : `<button class="mbtn sm ghost" data-act="${p.id}">Take along</button>`}</div></div>`; }).join('')
        : '<div class="empty">No strays yet. Dogs and cats hide under beds, tables and sofas (about 1 house in 30). Approach slowly, or offer food.</div>'}
      <button class="mbtn ghost" id="csClose">Close</button></div>`;
    el.classList.add('on'); el.onclick = e => { if (e.target === el) closeSheet(); };
    for (const n of notes) n.seen = true; if (notes.length) G().save();
    drawCardPorts();
    $('#csClose').onclick = closeSheet;
    el.querySelectorAll('[data-dis]').forEach(b => b.onclick = () => {
      if (!b.dataset.sure) { b.dataset.sure = 1; b.textContent = 'Tap again: send them away?'; return; }
      const m = crew().find(x => x.id === b.dataset.dis); v.crew.list = v.crew.list.filter(x => x !== m); G().save(); toast(`${m.name} packs a bag and heads off. "Good luck."`, 2.2); C.openSheet();
    });
    el.querySelectorAll('[data-act]').forEach(b => b.onclick = () => { for (const p of pets()) p.active = p.id === b.dataset.act; G().save(); SFX.play('ui'); C.openSheet(); });
    el.querySelectorAll('[data-ren]').forEach(b => b.onclick = () => { const p = pets().find(x => x.id === b.dataset.ren); renameSheet(p); });
  };
  function renameSheet(p) {
    const el = $('#msheet');
    el.innerHTML = `<div class="mcard"><div class="kick">Rename</div><h3>${esc(p.name)}</h3><canvas id="petPort" width="160" height="120" style="display:block;margin:0 auto 8px"></canvas>
      <input id="petName" class="namein" maxlength="14" value="${esc(p.name)}" autocomplete="off" autocapitalize="words" spellcheck="false"><button class="mbtn" id="petOk">Save name</button><button class="mbtn ghost" id="petBack">Back</button></div>`;
    C.petPortrait($('#petPort'), p, { heart: 1 });
    $('#petOk').onclick = () => { const v = String($('#petName').value || '').trim().slice(0, 14); if (v) p.name = v; G().save(); C.openSheet(); };
    $('#petBack').onclick = () => C.openSheet();
  }
  function closeSheet() { const el = $('#msheet'); el.classList.remove('on'); el.innerHTML = ''; if (C.onChange) C.onChange(); }

  // test hooks (local test copies)
  C.dev = {
    addCrew: role => { const m = newMember(Math.random() * 1e9 >>> 0); if (role) m.role = role; return join(m); },
    addPet: (kind = 'dog', coat = 0) => adopt(kind, coat),
  };
})();
