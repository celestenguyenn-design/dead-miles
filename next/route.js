/* Dead Miles (next) - the daily route map (0.21). A Slay-the-Spire-style branching path, driven by today's steps.
   An extra view of the Houses tab ("List | Route"); the house list is unchanged.
   - A new map every local midnight (SV.day.key, the same day rollDay uses), seeded from the save's seedBase + the date:
     6-8 rows (6: 40%, 7: 40%, 8: 20%), 2-3 stops per row (row 1 and the last row: 2), each stop joined to 1-2 stops in
     the next row (lines never cross, every stop can be reached). Danger rises row by row; the last row is the big one.
   - Every 1,500 EFFECTIVE steps walked today (phone/watch + typed at half: game.js effective(), the same count scouting
     uses) opens the next row. In an open row she picks ONE stop joined to her last pick (row 1: any). Rows are picked
     in order; a row she reached can still be picked later the same day. At midnight the map is replaced (missed rows
     are gone). Yesterday's late steps (addLateSteps) do not touch the route.
   - THE RULE WITH SCOUTING: a pick never adds a house. Every pick (any kind of stop) trades in one of today's scouted
     houses: the newest one she has not touched (status new, no run in progress, not a quest / landmark / route house).
     If there is none (she already went into all of today's houses), the pick is "owed" and the next house her steps
     scout is skipped instead (route.debt, at most 1 owed at a time; an unpaid one carries over to tomorrow's first
     scouted house). So houses + stops = the scouting taper (houses + stops = scouted + owed).
   - Stops: house (danger 1-2 building), danger house ☣ (pharmacy, school, police, mansion), elite (police station or
     mansion with a guaranteed jackpot planted in one container: house.js rolls f.jack like a key-locked room's prize),
     safehouse (+30 HP, +15 hunger, +20 thirst, one day off an infection), Dot (her away timer is cleared and her shop
     opens), supply drop (2-3 things to the stash, no fight; the last row's cache: 3-4 with meds and a shot at a
     blueprint / decor / cosmetic), event (a small text choice with a risk, outcomes seeded from the stop).
   Save: SV.route = { ver, day, R, rows: [[{ k, ty, sd, ev, jx, jy, to }]], picks: [i per row], debt, paid, later, view, log }.
   Old saves have none: today's route starts fresh. */
'use strict';
window.DM = window.DM || {};
(() => {
  const D = DM.D, E = DM.E, $ = E.$, SFX = E.SFX, toast = E.toast;
  const R = DM.Route = {};
  R.STEP = 1500;   // effective steps per row
  R.VER = 1;
  const G = () => DM.Game, SV = () => DM.Game && DM.Game.data(), API = () => DM.Game.routeApi;
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = n => Math.round(n).toLocaleString('en-US');
  const icon = k => `<img alt="" src="${ART.iconURL[D.ITEMS[k].i]}">`;

  // ---------------------------------------------------------------- loot tables for the drops (modest: a stop stands in for a house)
  D.LOOT.routedrop = [[2, 3], { beans: 2, water: 2, snack: 1, bandage: 2, meds: 1, ammo: 1.5, battery: 1, tape: 1, scrap: 1.5, nails: 1, lockpick: .7 }];
  D.LOOT.routecache = [[3, 4], { meds: 2, bandage: 2, ammo: 2, lockpick: 1, water: 1, beans: 1, 'bp_*': .7, 'decor_*': .6, 'cos_*': .25, antibio: .3, key: .3 }, ['meds']];

  // ---------------------------------------------------------------- stop kinds
  const KIND = {
    start: { n: 'Start', d: 'Where today begins.' },
    house: { n: 'House', d: 'A house to loot. It goes on your house list like a scouted one.' },
    danger: { n: 'Danger house', d: 'A dangerous building (danger 3+): more zombies, special infected, better loot. It goes on your house list.' },
    elite: { n: 'Elite', d: 'A hard building with a guaranteed jackpot hidden in one container - only if you go in yourself (the crew never finds it). It goes on your house list.' },
    safe: { n: 'Safehouse', d: 'A locked-up flat with a cot and a camp stove. Rest: +30 HP, +15 hunger, +20 thirst, and one day off an infection.' },
    dot: { n: 'Dot', d: 'Dot\'s cart is parked on this corner. She is open for you right now, even if she was on the road.' },
    supply: { n: 'Supply drop', d: 'A dropped crate. 2-3 useful things straight to your stash. No fight.' },
    cache: { n: 'Big cache', d: 'A survivor cache at the end of the line: 3-4 things including meds, and a chance at a blueprint, decor or a cosmetic. Straight to your stash.' },
    event: { n: 'Event', d: 'Something on the way. A small choice, a small risk.' },
  };
  const ELITE_JACK = { police: 'gun', mansion: 'safe', pharmacy: 'meds', school: 'stash' };

  // ---------------------------------------------------------------- events (outcomes come from a stream seeded by the stop)
  const hasFood = () => cheapFood() != null;
  function cheapFood() {
    const s = DM.S; let best = null, bv = 1e9;
    for (const e of s.stash.concat(s.pack)) { const it = D.ITEMS[e.k]; if (!DM.Food.isFood(e.k)) continue; const v = (it.hu || 0) + (it.th || 0) + (D.VALUE[e.k] || 1); if (v < bv) { bv = v; best = e.k; } }
    return best;
  }
  const hasTool = () => { const s = DM.S; return ['crowbar', 'prybar'].some(k => G().countItem(k) || (s.hands && s.hands.k === k)); };
  function hurt(n, rnd, bite) {
    const s = DM.S; s.hp = Math.max(10, s.hp - n);
    let t = `-${n} HP`;
    if (bite && DM.Infect && DM.Infect.bite({}, s, rnd)) { t += ' · the bite broke the skin: infected'; DM.Infect.firstNote(s); }
    return t;
  }
  const roll = (table, rnd, n) => { const out = []; for (let i = 0; i < n; i++) { const r = D.rollLoot(table, rnd); if (r.length) out.push(r[0]); } return out; };
  R.EVENTS = {
    beggar: { t: 'A survivor asks for food', d: 'A thin woman waves from behind a chain-link fence. "Anything. Please. I can pay you back."', o: [
      { l: 'Give 1 food', need: () => hasFood() ? '' : 'No food in your pack or stash', go: rnd => { const k = cheapFood(); G().takeItems(k, 1); state().later.push({ caps: 15 + Math.floor(rnd() * 11), xp: 6, t: 'The woman from the fence caught up with you and pressed some caps into your hand.' }); return { t: `You hand over the ${D.ITEMS[k].n.toLowerCase()}. "I won't forget this." (She will find you at your next stop.)` }; } },
      { l: 'Walk on', go: () => ({ t: 'You keep walking. You do not look back.' }) }] },
    car: { t: 'A car with its door open', d: 'Keys still in the ignition. Something is slumped over the wheel. It has not moved.', o: [
      { l: 'Search it', go: rnd => { if (rnd() < .6) return { t: 'Just a body. You go through the glove box and the back seat.', items: roll('car', rnd, 2) }; const h = hurt(12, rnd, true); return { t: `It moves. It gets a bite in before you put it down (${h}). You grab what you can.`, items: roll('car', rnd, 1) }; } },
      { l: 'Leave it', go: () => ({ t: 'Not worth it. You cross the street.' }) }] },
    shots: { t: 'Gunshots two blocks over', d: 'Three shots, a scream, then nothing.', o: [
      { l: 'Go and look', go: rnd => { if (rnd() < .55) return { t: 'Whoever it was is long gone. They dropped things running.', items: ['ammo', 'ammo'].concat(rnd() < .5 ? ['bandage'] : []), xp: 5 }; return { t: `A raider is still there. One wild shot grazes you before you get away (${hurt(15, rnd)}).` }; } },
      { l: 'Go around', go: () => ({ t: 'You take the long way round. Nothing happens.' }) }] },
    cage: { t: 'A chained clinic door', d: 'A small clinic, the door chained shut. Shelves of boxes through the glass.', o: [
      { l: 'Pick the lock (1 lockpick)', need: () => G().countItem('lockpick') ? '' : 'No lockpick', go: rnd => { G().takeItems('lockpick', 1); return { t: 'The padlock gives. Quiet as anything.', items: ['meds', 'bandage'].concat(rnd() < .2 ? ['antibio'] : []), xp: 6 }; } },
      { l: 'Pry it (crowbar)', need: () => hasTool() ? '' : 'No crowbar or pry bar', go: rnd => { const loud = rnd() < .5; return { t: loud ? `The chain snaps with a bang. One of them heard (${hurt(10, rnd, true)}), but you get in.` : 'The chain snaps. Nothing comes. You get in.', items: ['meds', 'bandage'], xp: 4 }; } },
      { l: 'Leave it', go: () => ({ t: 'Some other day.' }) }] },
    barrel: { t: 'A full rain barrel', d: 'Clear water in a rain barrel behind a fence. A dead leaf or two.', o: [
      { l: 'Drink', go: rnd => { const f = DM.S.food; f.t = Math.min(100, f.t + 30); if (rnd() < .25) return { t: `Cold and clean... mostly. Stomach cramps on the way (${hurt(8, rnd)}). +30 thirst.` }; return { t: 'Cold and clean. +30 thirst.' }; } },
      { l: 'Leave it', go: () => ({ t: 'You have seen what lives in standing water.' }) }] },
    dog: { t: 'A dog is following you', d: 'Skinny, limping, keeping its distance. It has followed you for a block.', o: [
      { l: 'Share some food (1 food)', need: () => hasFood() ? '' : 'No food in your pack or stash', go: rnd => { const k = cheapFood(); G().takeItems(k, 1); return { t: 'It eats, wags once, and trots ahead - straight to a backpack someone dropped under a bench.', items: roll('car', rnd, 2), xp: 8 }; } },
      { l: 'Shoo it away', go: () => ({ t: 'It flinches and slinks off. You feel a bit rotten about it.' }) }] },
  };
  const EVKEYS = Object.keys(R.EVENTS);

  // ---------------------------------------------------------------- map generation (seeded from seedBase + date)
  function pickW(list, rnd) { let v = rnd() * list.reduce((a, x) => a + x[1], 0); for (const x of list) { v -= x[1]; if (v <= 0) return x[0]; } return list[list.length - 1][0]; }
  function houseType(r, rnd) {   // danger 1-2 buildings, bigger ones a bit likelier further along (like scouting's step bonus)
    const T = D.BTYPES; return pickW(Object.keys(T).filter(k => T[k].w > 0 && T[k].danger <= 2).map(k => [k, T[k].w * (1 + (T[k].big || 0) * r * R.STEP / 9000)]), rnd);
  }
  const dangerType = (t, rnd) => pickW([['pharmacy', 6], ['school', 4], ['police', 2 + 2 * t], ['mansion', .6 + .8 * t]], rnd);
  const eliteType = rnd => pickW([['police', 2], ['mansion', 1]], rnd);
  function link(a, b, rnd) {   // a: stops in row r, b: row r+1. Monotone, never crossing, every b reachable, 1-2 lines out
    const n = a.length, m = b.length;
    if (n === 1) { a[0].to = b.map((_, j) => j); return; }
    const map = i => Math.round(i * (m - 1) / (n - 1));
    a.forEach((x, i) => { x.to = [map(i)]; });
    const crosses = (i, c) => a.some((x, i2) => i2 !== i && x.to.some(j2 => (i2 < i && j2 > c) || (i2 > i && j2 < c)));
    a.forEach((x, i) => {
      if (rnd() >= .5) return;
      const cand = [x.to[0] - 1, x.to[0] + 1].filter(c => c >= 0 && c < m);
      const c = cand[Math.floor(rnd() * cand.length)];
      if (c != null && !crosses(i, c)) x.to.push(c);
    });
    for (let j = 0; j < m; j++) if (!a.some(x => x.to.includes(j))) { const i = Math.round(j * (n - 1) / (m - 1)); a[i].to.push(j); }
    a.forEach(x => x.to.sort((p, q) => p - q));
  }
  R.gen = function (day, seedBase, dev) {   // dev: game.js devNewDay's counter (a pretend new day on the same date)
    const rnd = D.mulberry32(D.hashStr(seedBase + ':route:' + day + (dev ? ':' + dev : '')));
    const u = rnd(), NR = u < .4 ? 6 : u < .8 ? 7 : 8;
    const rows = [];
    let dot = false, elite = false, safes = 0; const evUsed = [];
    for (let r = 1; r <= NR; r++) {
      const last = r === NR, t = (r - 1) / (NR - 1);
      const n = last || r === 1 ? 2 : rnd() < .55 ? 3 : 2;
      let kinds = [];
      if (last) kinds = ['elite', 'cache'];
      else {
        for (let i = 0; i < n; i++) {
          const w = [['house', 40 - 15 * t], ['danger', r >= 3 ? 10 + 22 * t : 0], ['safe', r >= 2 && !safes ? 8 : 0], ['dot', !dot && r >= 2 ? 7 : 0],
            ['supply', 12], ['event', r >= 2 ? 15 : 8], ['elite', !elite && r >= Math.ceil(NR / 2) && r < NR - 1 ? 5 : 0]]
            .map(([k, v]) => [k, k !== 'house' && kinds.includes(k) ? 0 : v]).filter(x => x[1] > 0);
          const k = pickW(w, rnd); kinds.push(k); if (k === 'dot') dot = true; if (k === 'elite') elite = true; if (k === 'safe') safes++;
        }
        if (r === NR - 1 && !kinds.includes('safe')) { const j = Math.floor(rnd() * n); if (kinds[j] === 'dot') dot = false; if (kinds[j] === 'elite') elite = false; kinds[j] = 'safe'; }   // a rest before the big one
        if (r < NR - 1 && !kinds.some(k => k === 'house' || k === 'danger' || k === 'elite')) { const j = kinds.findIndex(k => k !== 'dot'); kinds[j < 0 ? 0 : j] = r >= 3 && rnd() < .4 ? 'danger' : 'house'; }
        for (let i = kinds.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [kinds[i], kinds[j]] = [kinds[j], kinds[i]]; }
      }
      rows.push(kinds.map((k, i) => {
        const nd = { k, jx: Math.round((rnd() * 2 - 1) * 100) / 100, jy: Math.round((rnd() * 2 - 1) * 100) / 100, to: [] };
        if (k === 'house') nd.ty = houseType(r, rnd); else if (k === 'danger') nd.ty = dangerType(t, rnd); else if (k === 'elite') nd.ty = eliteType(rnd);
        if (nd.ty || k === 'event' || k === 'supply' || k === 'cache') nd.sd = D.hashStr(seedBase + ':rt:' + day + (dev ? ':' + dev : '') + ':' + r + ':' + i);
        if (k === 'event') { const left = EVKEYS.filter(e => !evUsed.includes(e)); nd.ev = (left.length ? left : EVKEYS)[Math.floor(rnd() * (left.length || EVKEYS.length))]; evUsed.push(nd.ev); }
        return nd;
      }));
    }
    const start = { k: 'start', jx: 0, jy: 0, to: [] };
    link([start], rows[0], rnd);
    for (let r = 0; r < NR - 1; r++) link(rows[r], rows[r + 1], rnd);
    return { R: NR, start, rows };
  };

  // ---------------------------------------------------------------- state
  function state() {
    const v = SV(); if (!v || !v.day) return null;
    let s = v.route;
    if (!s || typeof s !== 'object' || s.day !== v.day.key || s.ver !== R.VER || !Array.isArray(s.rows)) {
      const prev = s && typeof s === 'object' ? s : {};
      const m = R.gen(v.day.key, v.seedBase, v.routeDev);
      s = v.route = { ver: R.VER, day: v.day.key, R: m.R, start: m.start, rows: m.rows, picks: [], debt: Math.min(1, +prev.debt || 0), paid: 0,
        later: Array.isArray(prev.later) ? prev.later.slice(-5) : [], view: prev.view === 'route' ? 'route' : 'list', log: [] };
    }
    return s;
  }
  R.state = state;
  const eff = () => API().effective();
  R.unlocked = () => { const s = state(); return Math.min(s.R, Math.floor(eff() / R.STEP)); };
  const node = (r, i) => { const s = state(); return r === 0 ? s.start : s.rows[r - 1] && s.rows[r - 1][i]; };
  const curNode = () => { const s = state(), n = s.picks.length; return n ? s.rows[n - 1][s.picks[n - 1]] : s.start; };
  R.canPick = (r, i) => { const s = state(); return r === s.picks.length + 1 && r <= R.unlocked() && !!node(r, i) && curNode().to.includes(i); };
  R.readyCount = () => { const s = state(); return s ? Math.max(0, R.unlocked() - s.picks.length) : 0; };
  R.nextIn = () => { const s = state(), u = R.unlocked(); return u >= s.R ? 0 : Math.ceil((u + 1) * R.STEP - eff()); };
  R.view = () => { const s = state(); return s ? s.view : 'list'; };

  // ---- trading in a scouted house (the rule that keeps houses per day the same)
  function tradeable() {
    const v = SV(); let i = -1;
    for (let j = v.houses.length - 1; j >= 0; j--) { const h = v.houses[j]; if (h.day === v.day.key && h.status === 'new' && !h.run && !h.quest && !h.landmark && !h.route && !h.daily && /^h\d+$/.test(h.id)) { i = j; break; } }
    return i;
  }
  R.tradePreview = () => { const v = SV(), i = tradeable(); return i >= 0 ? { h: v.houses[i] } : state().debt < 1 ? { debt: 1 } : null; };
  function trade() {
    const v = SV(), s = state(), i = tradeable();
    if (i >= 0) return { gone: v.houses.splice(i, 1)[0] };
    if (s.debt >= 1) return null;
    s.debt++; return { debt: 1 };
  }
  R.payDebt = function () {   // game.js scout(): the next scouted house was already taken by a route stop
    const v = SV(), s = v && v.route;
    if (!s || s.day !== v.day.key || !(s.debt > 0)) return false;
    s.debt--; s.paid = (s.paid || 0) + 1; return true;
  };

  // ---------------------------------------------------------------- picking
  let rerender = () => { };
  R.pick = function (r, i) {
    const s = state();
    if (!R.canPick(r, i)) return 'no';
    const nd = node(r, i);
    if (!R.tradePreview()) { toast('You already went into all of today\'s houses and owe the route one. Walk on: the next house you scout pays it.', 3.4); return 'owed'; }
    if (nd.k === 'event') { openEvent(r, i); return 'event'; }
    return commit(r, i, null);
  };
  function commit(r, i, opt) {
    const s = state(), nd = node(r, i), v = SV(), sv = DM.S;
    const tr = trade(); if (!tr) return 'owed';
    s.picks.push(i);
    const later = s.later.splice(0);   // rewards promised at an earlier stop
    let res = null;
    const swap = tr.gone ? ` It took the place of ${D.BTYPES[tr.gone.type].n} · ${tr.gone.address}.` : ' It takes the place of the next house your steps scout.';
    if (nd.ty) {
      const h = API().addHouse(nd.ty, nd.sd, { route: nd.k });
      toast(`Added to your houses: ${D.BTYPES[nd.ty].n} · ${h.address}`, 2.6);
      res = { kick: KIND[nd.k].n, title: `${D.BTYPES[nd.ty].n} · ${h.address}`, t: `It is on your house list now${nd.k === 'elite' ? ' (★ jackpot inside - go in yourself to find it)' : ''}.${swap}` };
    } else if (nd.k === 'safe') {
      if (sv.food) sv.hp = DM.Food.tick(sv, sv.hp);
      const hp0 = sv.hp; sv.hp = Math.min(API().maxHp(sv), sv.hp + 30);
      const f = sv.food; if (f) { f.h = Math.min(100, f.h + 15); f.t = Math.min(100, f.t + 20); }
      let inf = '';
      if (DM.Infect && DM.Infect.is(sv)) { const left = DM.Infect.rest(sv, 1); inf = left > 0 ? ` The rest helps you fight the infection: about ${Math.max(1, Math.ceil(left))} day${Math.ceil(left) > 1 ? 's' : ''} left.` : ' The rest finishes it: you fought off the infection.'; }
      const dh = Math.round(sv.hp - hp0);
      res = { kick: 'Safehouse', title: 'A quiet night', t: `You bar the door, eat something warm and sleep. ${dh > 0 ? `+${dh} HP` : 'HP already full'}, +15 hunger, +20 thirst.${inf}${swap}` };
    } else if (nd.k === 'dot') {
      v.trader.away = null;
      res = { kick: 'Dot', title: 'Dot\'s cart', t: `"Fancy meeting you here." Dot is open for you now.${swap}`, dot: 1 };
    } else if (nd.k === 'supply' || nd.k === 'cache') {
      const rnd = D.mulberry32(nd.sd ^ 0x2545f491);
      const keys = D.rollLoot(nd.k === 'cache' ? 'routecache' : 'routedrop', rnd);
      const stacks = D.toStacks(keys, rnd, { base: nd.k === 'cache' ? 2.0 : 1.5, bonus: D.gsFx(G().gamestage().gs).qBonus });
      const lost = API().toStash(stacks);
      res = { kick: KIND[nd.k].n, title: nd.k === 'cache' ? 'The end of the line' : 'A dropped crate', t: `Everything went to your stash.${swap}`, stacks, lost };
    } else if (nd.k === 'event') {
      const E0 = R.EVENTS[nd.ev], o = E0.o[opt] || E0.o[E0.o.length - 1];
      const out = o.go(D.mulberry32(nd.sd ^ 0x68e31da4)) || { t: '' };
      const stacks = out.items && out.items.length ? D.toStacks(out.items, D.mulberry32(nd.sd ^ 0x1b873593)) : [];
      const lost = stacks.length ? API().toStash(stacks) : [];
      if (out.xp) DM.Skills.addXP(out.xp);
      res = { kick: 'Event', title: E0.t, t: out.t + (stacks.length ? ' It went to your stash.' : '') + swap, stacks, lost };
    }
    for (const l of later) { if (l.caps) v.trader.caps += l.caps; if (l.xp) DM.Skills.addXP(l.xp); res.t += ` ${l.t} +${l.caps} caps.`; }
    s.log.push({ r, k: nd.k, ty: nd.ty || null, gone: tr.gone ? tr.gone.id : null, debt: tr.debt ? 1 : 0 });
    SFX.play('ui');
    G().save();
    showRes(res);
    return nd.k;
  }
  function showRes(res) {
    const st = res.stacks || [];
    G().ui.sheetOpen(`<div class="kick">${esc(res.kick)}</div><h3>${esc(res.title)}</h3><p class="mp">${esc(res.t)}</p>
      ${st.length ? `<div class="sum">${st.map(e => `<div class="sum-item${D.ITEMS[e.k].rare ? ' rare' : ''}">${icon(e.k)}<span>${D.ITEMS[e.k].n}</span>${D.isWeapon(e.k) ? G().qTag(e) : ''}${e.n > 1 ? `<b>x${e.n}</b>` : ''}</div>`).join('')}</div>` : ''}
      ${res.lost && res.lost.length ? `<div class="lost">No room in the stash for: ${res.lost.map(e => D.ITEMS[e.k].n + (e.n > 1 ? ' x' + e.n : '')).join(', ')}</div>` : ''}
      <div class="btnrow">${res.dot ? '<button class="mbtn" id="rtDot">Visit Dot</button>' : ''}<button class="mbtn${res.dot ? ' ghost' : ''}" id="rtOk">${res.dot ? 'Later' : 'OK'}</button></div>`);
    $('#rtOk').onclick = () => { G().ui.sheetClose(); rerender(); };
    if ($('#rtDot')) $('#rtDot').onclick = () => { G().ui.sheetClose(); rerender(); API().openTrader(); };
    rerender();
  }
  function openEvent(r, i) {
    const nd = node(r, i), ev = R.EVENTS[nd.ev];
    G().ui.sheetOpen(`<div class="kick">Event · row ${r}</div><h3>${esc(ev.t)}</h3><p class="mp">${esc(ev.d)}</p>
      <div class="rtopts">${ev.o.map((o, j) => { const why = o.need ? o.need() : ''; return `<button class="mbtn${j === ev.o.length - 1 ? ' ghost' : ''}" data-eo="${j}"${why ? ' disabled' : ''}>${esc(o.l)}${why ? `<em>${esc(why)}</em>` : ''}</button>`; }).join('')}</div>
      <button class="mbtn sm ghost" id="rtEvBack" style="margin-top:8px">Not yet</button>`);
    document.querySelectorAll('#msheet [data-eo]').forEach(b => b.onclick = () => { if (b.disabled) return; G().ui.sheetClose(); commit(r, i, +b.dataset.eo); });
    $('#rtEvBack').onclick = () => G().ui.sheetClose();
  }
  R.chooseEvent = (r, i, opt) => commit(r, i, opt);   // tests

  // ---------------------------------------------------------------- elite: plant the jackpot when the run starts (game.js loot)
  R.prepRun = function (h, L) {
    if (h.route !== 'elite') return L.furn;
    const rnd = D.mulberry32(h.seed ^ 0x3c6ef372);
    const cs = L.furn.filter(f => f.loot && !f.secretLoot && !f.lock && !f.keyLock && !f.keyRoom && !f.jack && !f.car && f.room !== 'o');
    if (!cs.length) return L.furn;
    const f = cs[Math.floor(rnd() * cs.length)], i = L.furn.indexOf(f), furn = L.furn.slice();
    furn[i] = Object.assign({}, f, { jack: ELITE_JACK[h.type] || 'stash', noEmpty: 1 });
    return furn;
  };
  R.tagHTML = h => `<b class="rtetag">${h.route === 'elite' ? '★ elite · jackpot inside' : 'route'}</b>`;

  // ---------------------------------------------------------------- UI
  const ink = '#11142f';
  const GLYPH = {
    start: `<path d="M8 54 32 12l24 42z" fill="#5a4a86" stroke="${ink}" stroke-width="3.5" stroke-linejoin="round"/><path d="M32 12v42" stroke="${ink}" stroke-width="2.5"/><path d="M25 54l7-16 7 16z" fill="${ink}"/><path d="M32 12l-6-6M32 12l6-6" stroke="${ink}" stroke-width="2.5" stroke-linecap="round"/>`,
    safe: `<path d="M8 32 32 11l24 21" fill="none" stroke="#f07b3c" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/><rect x="14" y="30" width="36" height="25" fill="#5a4a86" stroke="${ink}" stroke-width="3"/><path d="M29 33h6v6h6v6h-6v6h-6v-6h-6v-6h6z" fill="#93a86c" stroke="${ink}" stroke-width="2"/>`,
    dot: `<path d="M9 25c4-12 42-12 46 0z" fill="#93a86c" stroke="${ink}" stroke-width="3"/><g fill="#f6e3bb">${[0, 1, 2, 3].map(i => `<path d="M${13 + i * 10} 25l5-8 5 8z"/>`).join('')}</g><rect x="11" y="25" width="42" height="18" rx="2" fill="#8a5a3a" stroke="${ink}" stroke-width="3"/><path d="M53 31h7" stroke="${ink}" stroke-width="3" stroke-linecap="round"/><circle cx="21" cy="47" r="7" fill="#f6e3bb" stroke="${ink}" stroke-width="3"/><circle cx="43" cy="47" r="7" fill="#f6e3bb" stroke="${ink}" stroke-width="3"/>`,
    supply: `<path d="M10 24C10 6 54 6 54 24z" fill="#f6e3bb" stroke="${ink}" stroke-width="3"/><path d="M24 24c0-6 16-6 16 0" fill="none" stroke="#f07b3c" stroke-width="3"/><path d="M12 24l13 13M52 24 39 37M32 24v13" stroke="${ink}" stroke-width="1.8"/><rect x="21" y="36" width="22" height="19" fill="#a8743f" stroke="${ink}" stroke-width="3"/><path d="M21 36l22 19M43 36 21 55" stroke="#5e3a1e" stroke-width="2.5"/>`,
    cache: `<rect x="8" y="24" width="48" height="30" fill="#a8743f" stroke="${ink}" stroke-width="3"/><rect x="8" y="24" width="48" height="10" fill="#e0b94a" stroke="${ink}" stroke-width="3"/><rect x="28" y="29" width="8" height="11" rx="1" fill="#f6e3bb" stroke="${ink}" stroke-width="2"/><path d="M16 14l2 5 5 2-5 2-2 5-2-5-5-2 5-2zM48 8l1.5 3.5L53 13l-3.5 1.5L48 18l-1.5-3.5L43 13l3.5-1.5z" fill="#f6e3bb"/>`,
    event: `<circle cx="32" cy="32" r="22" fill="#f6e3bb" stroke="${ink}" stroke-width="3.5"/><path d="M24 26c0-6 4-9 8.5-9s8.5 3 8.5 8c0 6-8 6-8 13" fill="none" stroke="#3d2d61" stroke-width="5.5" stroke-linecap="round"/><circle cx="33" cy="46" r="3.6" fill="#3d2d61"/>`,
  };
  const BG = { start: '#2a1f4a', house: '#2a1f4a', danger: '#3b1d2c', elite: '#3d2d61', safe: '#1f2a2a', dot: '#1f2a2a', supply: '#2a2342', cache: '#3a2a1a', event: '#2a1f4a' };
  const label = nd => nd.ty ? D.BTYPES[nd.ty].n.replace('Apartment unit', 'Apartment').replace('Police station', 'Police') : KIND[nd.k].n;

  R.segHTML = function () {
    const s = state(); if (!s) return '';
    const n = R.readyCount();
    return `<div class="seg rtseg"><button data-rv="list"${s.view !== 'route' ? ' class="on"' : ''}>List</button><button data-rv="route"${s.view === 'route' ? ' class="on"' : ''}>Route${n ? '<i class="sbadge">!</i>' : ''}</button></div>`;
  };

  function geom() {
    const s = state(), W = 340, RH = 92, TOP = 74, n = s.R;
    const yr = r => TOP + (n - r) * RH, H = yr(0) + 56;
    const pos = (r, i) => {
      if (r === 0) return [190, yr(0)];
      const row = s.rows[r - 1], nd = row[i], m = row.length;
      return [Math.round(52 + 276 * (i + .5) / m + nd.jx * (m === 3 ? 10 : 16)), Math.round(yr(r) + nd.jy * 9)];
    };
    return { W, H, RH, yr, pos };
  }
  R.html = function () {
    const s = state(), g = geom(), u = R.unlocked(), e = eff(), done = s.picks.length, next = done + 1, cur = curNode();
    const ready = R.readyCount(), nin = R.nextIn();
    // header
    const frac = u >= s.R ? 1 : (e - u * R.STEP) / R.STEP;
    const owed = ready && !R.tradePreview();
    const status = owed ? `<b class="hot">Walk on</b> - your next scouted house pays the stop you owe, then you can pick` : ready ? `<b class="hot">${ready > 1 ? ready + ' stops ready' : 'Pick your next stop'}</b> - the glowing one${cur.to.length > 1 ? 's' : ''} below`
      : done >= s.R ? '<b>Route done for today.</b> New map at midnight.'
      : u >= s.R ? '<b>You reached the end.</b>' : `Next stop in <b>${fmt(nin)}</b> steps`;
    const head = `<div class="rthead"><div class="rtrow"><span class="kick">Today's route</span><span class="rtcount">${done}/${s.R} stops</span></div>
      <div class="rtstat">${status}</div>
      ${u < s.R ? `<div class="mbar rtbar"><i style="width:${Math.max(3, frac * 100)}%"></i></div><div class="rtsub">${ready ? `Next row in ${fmt(nin)} steps · ` : ''}a new row every ${fmt(R.STEP)} steps you walk today</div>` : ''}
      <div class="rtsub">Each stop takes the place of one of today's scouted houses.${s.debt && !owed ? ' <b class="hot">One stop is owed: your next scouted house pays it.</b>' : ''}${s.later.length ? ' Someone you helped is looking for you.' : ''}</div></div>`;
    // map
    let edges = '', nodes = '', ticks = '';
    const pathOn = r => r === 0 ? 0 : s.picks[r - 1];
    for (let r = 0; r < s.R; r++) {
      const row = r === 0 ? [s.start] : s.rows[r - 1];
      row.forEach((nd, i) => {
        const [x1, y1] = g.pos(r, i);
        for (const j of nd.to) {
          const [x2, y2] = g.pos(r + 1, j);
          const taken = r < done && pathOn(r) === i && s.picks[r] === j;
          const open = r === done && (r === 0 || pathOn(r) === i);
          const passed = r < done && !taken;
          const cls = taken ? 'taken' : open ? (r + 1 <= u ? 'open' : 'soon') : passed ? 'gone' : '';
          const ya = y1 - (r === 0 ? 27 : 27), yb = y2 + 34;   // from the top of the lower stop to just under the upper stop's name
          edges += `<path class="rte ${cls}" d="M${x1} ${ya}C${x1} ${(ya + yb) / 2} ${x2} ${(ya + yb) / 2} ${x2} ${yb}"/>`;
        }
      });
    }
    const nodeSVG = (r, i, nd) => {
      const [x, y] = g.pos(r, i);
      let st = '';
      if (r === 0) st = 'picked';
      else if (r <= done) st = s.picks[r - 1] === i ? 'picked' : 'gone';
      else if (r === next && cur.to.includes(i)) st = r <= u && !owed ? 'reach' : 'soon';
      else if (r === next) st = 'gone';
      else st = 'locked';
      const inner = nd.ty ? G().ui.typeInner(nd.ty) : GLYPH[nd.k];
      const rr = nd.k === 'elite' || nd.k === 'cache' ? 29 : 25;
      return `<g class="rn ${st} k-${nd.k}" data-rn="${r}:${i}" transform="translate(${x} ${y})">
        <ellipse cx="0" cy="${rr - 2}" rx="${rr - 4}" ry="6" fill="rgba(8,6,22,.5)"/>
        ${st === 'reach' ? `<circle class="pulse" r="${rr + 5}"/>` : ''}
        <circle r="${rr}" fill="${BG[nd.k]}" stroke="${nd.k === 'elite' || nd.k === 'cache' ? '#e0b94a' : ink}" stroke-width="${nd.k === 'elite' || nd.k === 'cache' ? 3.5 : 3}"/>
        <circle r="${rr - 3.5}" fill="none" stroke="rgba(246,227,187,.12)" stroke-width="1.5"/>
        <svg x="${-rr * .7}" y="${-rr * .72}" width="${rr * 1.4}" height="${rr * 1.4}" viewBox="0 0 64 64">${inner}</svg>
        ${nd.k === 'danger' ? `<g transform="translate(${rr - 6} ${-rr + 6})"><circle r="9" fill="#b53a2e" stroke="${ink}" stroke-width="2.5"/><text y="4" text-anchor="middle" class="rtbadge">☣</text></g>` : ''}
        ${nd.k === 'elite' ? `<g transform="translate(0 ${-rr - 2})"><path d="M-11 4l-2-10 7 5 6-8 6 8 7-5-2 10z" fill="#e0b94a" stroke="${ink}" stroke-width="2.2" stroke-linejoin="round"/></g>` : ''}
        ${st === 'picked' && r ? `<g transform="translate(${rr - 5} ${rr - 8})"><circle r="8.5" fill="#93a86c" stroke="${ink}" stroke-width="2.5"/><path d="M-4 0l3 3 5-6" fill="none" stroke="${ink}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></g>` : ''}
        <text y="${rr + 15}" text-anchor="middle" class="rtlbl">${esc(label(nd))}</text></g>`;
    };
    for (let r = 0; r <= s.R; r++) (r === 0 ? [s.start] : s.rows[r - 1]).forEach((nd, i) => { nodes += nodeSVG(r, i, nd); });
    // progress line (left): fills up with today's effective steps, one tick per row
    const pr = Math.min(s.R, e / R.STEP), yp = g.yr(0) - pr * g.RH;
    for (let r = 1; r <= s.R; r++) ticks += `<g class="rttick${r <= u ? ' on' : ''}"><circle cx="18" cy="${g.yr(r)}" r="5"/><text x="29" y="${g.yr(r) + 3}">${r * R.STEP >= 10000 ? (r * R.STEP / 1000) + 'k' : (r * R.STEP / 1000).toFixed(1) + 'k'}</text></g>`;
    const [mx, my] = g.pos(done, done ? s.picks[done - 1] : 0);
    const me = `<g class="rtme" transform="translate(${mx + 20} ${my - 26})"><g class="bob"><path d="M0 14C-7 5-10 1-10-4a10 10 0 0 1 20 0c0 5-3 9-10 18z" fill="#f07b3c" stroke="${ink}" stroke-width="2.5"/><circle cy="-4" r="5" fill="#f6e3bb" stroke="${ink}" stroke-width="2"/></g><text y="-17" text-anchor="middle" class="rtyou">YOU</text></g>`;
    const svg = `<svg class="rtsvg" viewBox="0 0 ${g.W} ${g.H}" width="100%" style="aspect-ratio:${g.W}/${g.H}">
      <defs><pattern id="rtgrit" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="3" cy="4" r=".9" fill="rgba(246,227,187,.05)"/><circle cx="10" cy="11" r=".7" fill="rgba(246,227,187,.04)"/></pattern></defs>
      <rect width="${g.W}" height="${g.H}" fill="url(#rtgrit)"/>
      <path d="M18 ${g.yr(0)}V${g.yr(s.R)}" stroke="#2a1f4a" stroke-width="8" stroke-linecap="round"/>
      <path d="M18 ${g.yr(0)}V${Math.round(yp)}" stroke="#f07b3c" stroke-width="5" stroke-linecap="round"/>
      ${ticks}<circle cx="18" cy="${Math.round(yp)}" r="6.5" fill="#f6e3bb" stroke="${ink}" stroke-width="2.5"/>
      <text x="${g.W / 2 + 10}" y="20" text-anchor="middle" class="rtend">THE END OF THE LINE</text>
      ${edges}${nodes}${me}</svg>`;
    return head + `<div class="rtmap" id="rtMap">${svg}</div>`;
  };

  function openNode(r, i) {
    const s = state(), nd = node(r, i), u = R.unlocked(), done = s.picks.length, K = KIND[nd.k];
    let body = '';
    if (nd.ty) {
      const L = G().layoutOf({ type: nd.ty, seed: nd.sd, gv: G().GV }), T = D.BTYPES[nd.ty];
      const ip = DM.Inf ? DM.Inf.plan(L, G().gamestage().gs) : { kinds: [], extra: 0 }, ni = ip.kinds.filter(Boolean).length, nz = (L.zombies || []).length + ip.extra;
      const tags = [L.nLocks ? `${L.nLocks} lock${L.nLocks > 1 ? 's' : ''}` : 'no locks', `${nz} zombie${nz === 1 ? '' : 's'}`];
      if (L.car) tags.push('<b class="keytag">🔑 locked car</b>'); if (L.keyRoom) tags.push('<b class="keytag">🔑 locked room</b>'); if (ni) tags.push(`<b class="inftag">☣ ${ni} special infected</b>`);
      if (nd.k === 'elite') tags.push('<b class="rtetag">★ jackpot inside</b>');
      body = `<div class="hcard rtdet">${G().ui.typeIcon(nd.ty)}<div class="hinfo"><div class="hname">${T.n} <em>${T.size}</em></div><div class="haddr">${esc(L.address)}</div>
        <div class="hmeta"><span class="danger">${G().ui.skulls(L.danger)}</span><span>${tags.join(' · ')}</span></div></div></div>`;
    }
    let foot = '';
    if (r === 0) foot = '<p class="mp">Where today starts. Walk to open the first row.</p>';
    else if (r <= done) foot = `<p class="mp">${s.picks[r - 1] === i ? 'You went this way.' : 'You went another way.'}</p>`;
    else if (R.canPick(r, i)) {
      const tp = R.tradePreview();
      foot = `<p class="mp rtswap">${tp && tp.h ? `Takes the place of <b>${esc(D.BTYPES[tp.h.type].n)} · ${esc(tp.h.address)}</b> (your newest scouted house you have not touched).` : tp ? 'You already went into all of today\'s houses, so this takes the place of the next house your steps scout.' : 'You owe the route a house already. Walk on: the next house you scout pays it, then you can pick.'}</p>
        ${tp ? `<button class="mbtn big" id="rtGo">Go this way</button>` : ''}`;
    } else if (r > done + 1) foot = `<p class="mp">Row ${r}. Pick row ${done + 1} first${r * R.STEP > eff() ? ` · opens at ${fmt(r * R.STEP)} steps` : ''}.</p>`;
    else if (!curNode().to.includes(i)) foot = '<p class="mp">Not joined to your last stop. Pick one of the glowing ones.</p>';
    else foot = `<p class="mp">Opens at ${fmt(r * R.STEP)} steps today · <b>${fmt(r * R.STEP - eff())}</b> to go.</p>`;
    const ev = nd.k === 'event' ? '<p class="mp"><i>What happens there is a surprise until you get there.</i></p>' : '';
    G().ui.sheetOpen(`<div class="kick">${r ? `Row ${r} of ${s.R}` : 'Today\'s route'} · ${esc(K.n)}</div><h3>${esc(nd.ty ? (nd.k === 'house' ? D.BTYPES[nd.ty].n : K.n + ': ' + D.BTYPES[nd.ty].n) : K.n)}</h3>
      <p class="mp">${esc(K.d)}</p>${ev}${body}${foot}<button class="mbtn sm ghost" id="rtClose" style="margin-top:8px">Close</button>`);
    $('#rtClose').onclick = () => G().ui.sheetClose();
    if ($('#rtGo')) $('#rtGo').onclick = () => { G().ui.sheetClose(); R.pick(r, i); };
  }

  let lastView = '';
  R.bind = function (el, rr) {
    rerender = rr || rerender;
    const s = state();
    el.querySelectorAll('[data-rv]').forEach(b => b.onclick = () => { SFX.play('ui'); s.view = b.dataset.rv; G().save(); rerender(); });
    el.querySelectorAll('[data-rn]').forEach(g => g.onclick = () => { SFX.play('ui'); const [r, i] = g.dataset.rn.split(':').map(Number); openNode(r, i); });
    const m = el.querySelector('#rtMap');
    if (m) {   // scroll the map so her next row is in view (only when the view opens, not on every refresh)
      const key = s.day + ':' + s.picks.length + ':' + R.unlocked();
      if (lastView !== key) {
        lastView = key;
        requestAnimationFrame(() => { const g = geom(), sc = m.clientWidth / g.W, y = g.yr(Math.min(s.R, s.picks.length + 1)) * sc; m.scrollTop = Math.max(0, y - m.clientHeight * .4); });
      }
    }
  };

  // ---------------------------------------------------------------- styles (Spooky flat; palette from index.html :root)
  const css = document.createElement('style');
  css.textContent = `
  .rtseg { margin: 0 0 10px; }
  .rthead { padding: 10px 12px; margin-bottom: 8px; border-radius: 18px; background: #1c1538; border: 3px solid var(--ink); box-shadow: 0 4px 0 var(--plum); }
  .rthead .rtrow { display: flex; align-items: baseline; justify-content: space-between; }
  .rthead .rtcount { font-size: 12px; font-weight: 900; color: var(--mute); }
  .rthead .rtstat { font-size: 15px; font-weight: 800; margin: 4px 0 6px; } .rthead .hot { color: var(--ora); }
  .rthead .rtbar { height: 10px; margin: 0 0 6px; } .rthead .rtbar i { background: var(--ora); }
  .rthead .rtsub { font-size: 11.5px; font-weight: 700; color: var(--mute); line-height: 1.35; margin-top: 3px; }
  .rtmap { max-height: 62vh; overflow-y: auto; border-radius: 18px; background: linear-gradient(#150f2c, #1c1538 40%, #150f2c); border: 3px solid var(--ink); box-shadow: inset 0 0 0 1.5px rgba(246,227,187,.08); margin-bottom: 10px; -webkit-overflow-scrolling: touch; }
  .rtsvg { display: block; }
  .rte { fill: none; stroke: #4a3c70; stroke-width: 3; stroke-dasharray: 2 7; stroke-linecap: round; }
  .rte.gone { opacity: .35; }
  .rte.taken { stroke: #f07b3c; stroke-width: 5; stroke-dasharray: none; }
  .rte.open { stroke: #f6e3bb; stroke-width: 3.5; stroke-dasharray: 7 6; animation: rtdash 1s linear infinite; }
  .rte.soon { stroke: #9d90bf; stroke-width: 3; stroke-dasharray: 5 6; }
  @keyframes rtdash { to { stroke-dashoffset: -13; } }
  .rn { cursor: pointer; }
  .rn.locked { opacity: .55; } .rn.gone { opacity: .28; } .rn.soon { opacity: .85; }
  .rn .pulse { fill: none; stroke: #f07b3c; stroke-width: 4; transform-box: fill-box; transform-origin: center; animation: rtpulse 1.05s ease-in-out infinite alternate; }
  @keyframes rtpulse { from { opacity: .95; transform: scale(.92); } to { opacity: .25; transform: scale(1.12); } }
  .rtlbl { font: 900 10px Inter, system-ui, sans-serif; fill: #f6e3bb; stroke: #11142f; stroke-width: 3px; paint-order: stroke; letter-spacing: .02em; }
  .rn.reach .rtlbl { fill: #f07b3c; }
  .rtbadge { font: 900 11px system-ui, sans-serif; fill: #f6e3bb; }
  .rttick circle { fill: #2a1f4a; stroke: #11142f; stroke-width: 2; } .rttick.on circle { fill: #f07b3c; }
  .rttick text { font: 900 8.5px Inter, system-ui, sans-serif; fill: #9d90bf; stroke: #11142f; stroke-width: 2.5px; paint-order: stroke; } .rttick.on text { fill: #f6e3bb; }
  .rtend { font: 900 10px Inter, system-ui, sans-serif; letter-spacing: .22em; fill: #e0b94a; opacity: .8; }
  .rtyou { font: 900 8px Inter, system-ui, sans-serif; letter-spacing: .12em; fill: #f6e3bb; stroke: #11142f; stroke-width: 2.5px; paint-order: stroke; }
  .rtme .bob { animation: rtbob 1.4s ease-in-out infinite alternate; }
  @keyframes rtbob { from { transform: translateY(0); } to { transform: translateY(-3px); } }
  .rtetag { color: #e0b94a; }
  .hcard.rtdet { margin: 8px 0; box-shadow: 0 4px 0 var(--ora); }
  .rtswap { font-size: 12.5px; } .rtswap b { color: var(--crm); }
  .rtopts { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; } .rtopts .mbtn { width: 100%; margin: 0; height: auto; min-height: 46px; padding: 8px 14px; }
  .rtopts .mbtn em { display: block; font-style: normal; font-size: 11px; font-weight: 800; opacity: .85; }
  @media (prefers-reduced-motion: reduce) { .rn .pulse, .rte.open, .rtme .bob { animation: none; } }`;
  document.head.appendChild(css);
})();
