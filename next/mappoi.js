/* Dead Miles (next) 0.43 - made-up places on the real map (owner: "add army checkpoints or some unrealistic things to the
   map ... so there are a lot more things to walk to ... unlimited things to do but not so much it's a job").
   About 1 in 14 real places on the map gets a point of interest next to it this week: an army checkpoint, a crashed
   helicopter, a survivor camp, a quarantine tent, an abandoned ambulance, a zombie nest, a radio tower, a weapons cache
   or a vending machine. Which places, and what they are, come from the place id + the week, so they stay put all week
   (and friends see the same ones), then the map reshuffles on Monday.
   Walk within ~30 m: a short scene with a choice. Small ones can be used once a day, big ones (helicopter, cache,
   tower, nest) once a week. At most 8 a day - after that they wait for tomorrow, so it never turns into a chore.
   Places stay on this phone (localStorage dm-next-mappoi), like the rest of the map. Needs map.js, mapfx.js, mapquest.js. */
'use strict';
window.DM = window.DM || {};
(() => {
  const P = DM.MapPOI = {};
  const KEY = 'dm-next-mappoi', NEAR = 30, DAY_CAP = 8, RATE = 1 / 14;
  const SV = () => DM.Game && DM.Game.data(), Q = () => DM.MapQ && DM.MapQ.ui, FX = () => DM.MapFX;
  const toast = (m, s) => DM.E && DM.E.toast && DM.E.toast(m, s || 2.6);
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  const week = () => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  const dist = (a, b) => { const R = 6371000, r = Math.PI / 180, dLa = (b.lat - a.lat) * r, dLo = (b.lon - a.lon) * r; const q = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLo / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(q)); };
  const fmtD = d => d < 1000 ? Math.max(5, Math.round(d / 5) * 5) + ' m' : (d / 1000).toFixed(1) + ' km';
  let S = null;
  function st() {
    if (!S) { try { S = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { S = null; } S = Object.assign({ day: '', wk: '', n: 0, used: {}, wused: {}, capTold: 0 }, S || {}); }
    if (S.day !== today()) { S.day = today(); S.n = 0; S.used = {}; S.capTold = 0; }
    if (S.wk !== week()) { S.wk = week(); S.wused = {}; }
    return S;
  }
  let saveT = 0; const save = () => { clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* full */ } }, 300); };

  // ---------------------------------------------------------------- the kinds (w = how common; weekly = once a week)
  const has = (k, n) => DM.Game.countItem(k) >= n;
  const KINDS = {
    checkpoint: { w: 18, g: '🪖', col: '#7a8a4a', n: 'Army checkpoint', d: 'Sandbags, a barrier arm and two tired soldiers. "Halt. You bit? No? Then what have you got for us?"', opts: [
      { t: 'Trade 2 painkillers for supplies', cost: ['meds', 2], p: 1, win: 'The sergeant nods and slides a crate across the sandbags.', r: { caps: 40, xp: 15, items: [['bandage', 2], ['shells', 4]] }, rare: [['armor_riot', .15], ['mod_silencer', .08]] },
      { t: 'Ask what they know', p: 1, win: '"Stay off the main roads after dark. And the vending machines are booby-trapped. Mostly."', r: { xp: 20, caps: 10 } }] },
    heli: { w: 7, weekly: 1, g: '🚁', col: '#c95f2c', n: 'Crashed helicopter', d: 'A military helicopter on its side, rotor bent into the street. The cargo bay is still shut.', opts: [
      { t: 'Pry open the cargo bay', p: .7, win: 'Military crates. Jackpot.', lose: 'Something in the cockpit was not dead. You get the crates, and a bite.', hurt: 14, r: { caps: 40, xp: 40, loot: ['hordecrate', 1], items: [['meds', 1]] }, rare: [['shotgun', .15], ['mod_scope', .2], ['shells', .5]] },
      { t: 'Check the cockpit only', p: .9, win: 'A flight bag: medicine, a map, a little cash.', lose: 'Empty. Someone beat you to it.', r: { caps: 20, items: [['meds', 2]], xp: 20 } }] },
    camp: { w: 15, g: '⛺', col: '#d9a65a', n: 'Survivor camp', d: 'A ring of tents around a fire in a parking lot. Someone is cooking something that almost smells good.', opts: [
      { t: 'Rest by the fire', p: 1, win: 'You sit, you eat, you sleep for an hour. You feel human.', heal: 30, r: { xp: 10 } },
      { t: 'Swap stories', p: 1, win: 'Everyone has a story. You trade a few and walk off a little wiser.', r: { xp: 30 } }] },
    tent: { w: 9, g: '⚕️', col: '#9fe0e6', n: 'Quarantine tent', d: 'A white tent with a red cross, flaps zipped. "QUARANTINE - DO NOT ENTER" in marker.', opts: [
      { t: 'Search the cots', p: .65, win: 'Medical supplies, sealed and clean.', lose: 'One of the patients is still here. Sort of. You get out fast.', hurt: 10, r: { items: [['bandage', 3]], loot: ['nurse', 1], xp: 15 }, rare: [['antibio', .3]] },
      { t: 'Leave it zipped', p: 1, win: 'Some doors are better left shut.' }] },
    ambulance: { w: 12, g: '🚑', col: '#e05050', n: 'Abandoned ambulance', d: 'Back doors open, lights long dead. The cabinets inside look untouched.', opts: [
      { t: 'Raid the cabinets', p: .9, win: 'Bandages, painkillers, a little of everything.', lose: 'Picked over, except a single roll of tape.', r: { loot: ['medcab', 1], xp: 12 } },
      { t: 'Take the battery', p: 1, win: 'The ambulance battery still holds a charge.', r: { items: [['battery', 2]] } }] },
    nest: { w: 7, weekly: 1, g: '🧟', col: '#93a86c', n: 'Zombie nest', d: 'A collapsed storefront packed with sleeping dead. Dozens. Something glints in the middle of them.', opts: [
      { t: 'Mark it - clear it out later', p: 1, win: 'You mark it on your list. A dangerous house, with the good stuff inside.', nest: 1, r: { xp: 15 } },
      { t: 'Burn it (2 cloth rags, 1 battery)', cost: ['cloth', 2], cost2: ['battery', 1], p: .75, win: 'Up it goes. Whatever crawls out, you finish. In the ashes: their stash.', lose: 'The fire spreads faster than you planned. You get burned, but they are gone.', hurt: 15, r: { caps: 45, xp: 45, loot: ['cache', 1] } }] },
    tower: { w: 5, weekly: 1, g: '📡', col: '#b98cf0', n: 'Radio tower', d: 'A rusty radio tower with a ladder. From the top you could see the whole neighbourhood.', opts: [
      { t: 'Climb it', p: .85, win: 'From the top you map every street around you. The fog lifts.', lose: 'A rung snaps. You climb down bruised - but you saw a lot.', hurt: 8, tower: 1, r: { xp: 35 } },
      { t: 'Listen to the radio hut', p: 1, win: 'Static, then numbers. Then a song. You stay for the whole thing.', r: { xp: 15 }, token: .3 }] },
    cache: { w: 4, weekly: 1, g: '🎯', col: '#ffd23c', n: 'Weapons cache', d: 'A storm drain with a padlocked army footlocker chained inside. Somebody planned ahead.', opts: [
      { t: 'Break the lock', p: .8, win: 'Inside: a weapon wrapped in oilcloth, good as new.', lose: 'The lock fights you. You get it open, and cut your hand doing it.', hurt: 6, weapon: 1, r: { xp: 30 } },
      { t: 'Pick the lock (1 lockpick)', cost: ['lockpick', 1], p: 1, win: 'Click. A weapon in oilcloth and a box of rounds.', weapon: 1, r: { xp: 30, items: [['ammo', 10]] } }] },
    vending: { w: 13, g: '🥤', col: '#5ab4ff', n: 'Vending machine', d: 'A vending machine nobody has smashed yet. It hums. It actually hums.', opts: [
      { t: 'Kick it', p: .6, win: 'CLUNK. Two cans and a bag of chips drop.', lose: 'It falls on you. Of course it does.', hurt: 6, r: { items: [['drink', 2], ['snack', 1]] } },
      { t: 'Feed it 5 caps', capsCost: 5, p: 1, win: 'It takes your caps and, miraculously, gives you a soda. And another. And another.', r: { items: [['drink', 3]] } }] },
  };
  const KK = Object.keys(KINDS), WTOT = KK.reduce((a, k) => a + KINDS[k].w, 0);
  const kindOf = r => { let x = r * WTOT; for (const k of KK) { x -= KINDS[k].w; if (x <= 0) return k; } return KK[0]; };

  // ---------------------------------------------------------------- where they are (seeded by place + week)
  P.list = function () {
    const M = DM.Map && DM.Map._M; if (!M || !M.places) return [];
    const wk = week(), ck = wk + ':' + Object.keys(M.places).length; if (P._ck === ck) return P._cache;   // drawn every frame: cached
    const out = []; P._ck = ck; P._cache = out;
    for (const pl of Object.values(M.places)) {
      const h = hash(pl.id + '|' + wk); if ((h % 10000) / 10000 >= RATE) continue;
      const k = kindOf(((h >>> 8) % 10000) / 10000), a = ((h >>> 3) % 628) / 100;
      out.push({ id: pl.id + '|' + wk, k, lat: pl.lat + Math.sin(a) * .00016, lon: pl.lon + Math.cos(a) * .0002, at: pl.street || pl.name });
    }
    return out;
  };
  const usedUp = p => { const s = st(); return KINDS[p.k].weekly ? !!s.wused[p.id] : !!s.used[p.id]; };

  // ---------------------------------------------------------------- the scene
  function open(p, pos) {
    const K = KINDS[p.k], U = Q(), s = st(); if (!U) return;
    p.met = 1;
    U.dlg(U.head(`${K.weekly ? 'Once a week' : 'Once a day'} · near ${p.at}`, K.g, K.n) + `<p>${esc(K.d)}</p><div class="mqb">${K.opts.map((o, j) => `<button data-o="${j}"${j ? ' class="g"' : ''}>${esc(o.t)}${o.capsCost ? ` (${o.capsCost} caps)` : ''}</button>`).join('')}<button class="g" id="poiNo">Walk on</button></div>`, el => {
      el.querySelector('#poiNo').onclick = () => U.close();
      el.querySelectorAll('[data-o]').forEach(b => b.onclick = () => {
        const o = K.opts[+b.dataset.o];
        if (o.cost2 && !has(o.cost2[0], o.cost2[1])) return toast(`You need ${o.cost2[1]} ${DM.D.ITEMS[o.cost2[0]].n.toLowerCase()} for that`, 2);
        if (o.capsCost && SV().trader.caps < o.capsCost) return toast('Not enough caps', 1.6);
        const res = U.choose(o, hash(p.id + p.k) + +b.dataset.o);
        if (res.keep) { toast(res.text, 2); return; }
        if (o.cost2) DM.Game.takeItems(o.cost2[0], o.cost2[1]);
        if (o.capsCost) SV().trader.caps -= o.capsCost;
        const extra = [];
        if (o.heal) { const sv = SV().survivor, mx = DM.D.maxHp(sv); sv.hp = Math.min(mx, sv.hp + o.heal); extra.push(`+${o.heal} HP`); }
        if (o.tower && FX().reveal) extra.push(`${FX().reveal(pos, 260)} streets mapped`);
        if (o.token && DM.Gacha && Math.random() < o.token) { DM.Gacha.state().tok++; extra.push('a capsule token'); }
        if (o.weapon) { const k = ['pistol', 'shotgun', 'machete', 'axe', 'baton', 'pipegun', 'xlights', 'spikedbat'][hash(p.id) % 8], e = { k, n: 1, q: 3 + (Math.random() < .25 ? 1 : 0) }; e.d = DM.D.wMax(e); DM.Game.routeApi.toStash([e]); extra.push(`a ${DM.D.QUAL[e.q].n.toLowerCase()} ${DM.D.ITEMS[k].n.toLowerCase()}`); }
        if (o.nest) { const h = DM.Game.routeApi.addHouse(['police', 'mansion', 'school', 'pharmacy'][hash(p.id) % 4], hash(p.id + 'nest') % 1e6, {}); extra.push(`${DM.D.BTYPES[h.type].n} at ${h.address} is on your house list`); DM.Game.save(); }
        if (KINDS[p.k].weekly) s.wused[p.id] = 1; else s.used[p.id] = 1;
        s.n++; save(); DM.Game.save();
        U.resultCard(K.n, K.g, `Near ${p.at}`, res.text, [res.rw, ...extra].filter(Boolean).join(', '), res.bad);
      });
    });
  }

  // ---------------------------------------------------------------- per position fix (mapfx.js calls it)
  P.onPos = function (pos) {
    if (!pos || pos.acc > 60 || !SV() || !SV().survivor || !Q() || DM.MapQ.dialogOpen()) return;
    const s = st(), reach = NEAR + Math.min(15, pos.acc / 2);
    for (const p of P.list()) {
      if (usedUp(p) || dist(p, pos) > reach) continue;
      if (s.n >= DAY_CAP) { if (!s.capTold) { s.capTold = 1; save(); toast(`That's ${DAY_CAP} places today - you're beat. They'll still be here tomorrow.`, 3); } return; }
      if (P._met === p.id) return;   // walked off and back: wait until she leaves its circle
      P._met = p.id; open(p, pos); return;
    }
    P._met = null;
  };
  P.lines = function (pos) {
    if (!pos) return [];
    const s = st(); if (s.n >= DAY_CAP) return [{ t: '🗺️ Done exploring for today', s: 'new places tomorrow' }];
    const near = P.list().filter(p => !usedUp(p)).map(p => [p, dist(p, pos)]).sort((a, b) => a[1] - b[1])[0];
    return near ? [{ t: `${KINDS[near[0].k].g} ${KINDS[near[0].k].n} · ${near[0].at}`, s: fmtD(near[1]) }] : [];
  };
  P.drawMarks = function (x, t, SX, SY, wx, wy) {
    const mark = FX().mark; if (!mark) return;
    for (const p of P.list()) { const K = KINDS[p.k], used = usedUp(p); x.save(); if (used) x.globalAlpha = .35; mark(x, SX(wx(p.lon)), SY(wy(p.lat)), K.g, K.col, used ? 0 : t, ''); x.restore(); }
  };
  P.KINDS = KINDS; P._st = st;
})();
