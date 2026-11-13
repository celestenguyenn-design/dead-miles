/* Dead Miles (next) - meta game: save, character creation, steps -> scouted houses, home screen, pack/stash.
   Steps arrive through ONE function: DM.addSteps(n, src) with src 'phone' | 'typed' | 'walk'.
   DM.onlineState is reserved for the account panel (net.js, written separately). */
'use strict';
(() => {
  const D = DM.D, E = DM.E, $ = E.$, SFX = E.SFX, toast = E.toast;
  const KEY = 'dm-next-save', VER = 1, VERSION = 'next 0.3';
  const STASH_SLOTS = 40;
  DM.onlineState = { signedIn: false, name: null, lastSync: null, status: 'offline' };
  const Game = DM.Game = {};
  let SV = null;

  // ---------------------------------------------------------------- dates
  const pad = n => String(n).padStart(2, '0');
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  const dayNum = k => { const [y, m, d] = k.split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / 864e5); };
  const keyOf = n => { const d = new Date(n * 864e5); return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()); };

  // ---------------------------------------------------------------- save
  function fresh() {
    return { v: VER, created: Date.now(), walked: 0, trader: null, seedBase: (Math.random() * 1e9) >>> 0, survivor: null, day: { key: today(), phone: 0, typed: 0, walk: 0, scouted: 0 },
      houses: [], houseSeq: 0, tutorialDone: false, stats: { runs: 0, kills: 0, secrets: 0, auto: 0, downs: 0 } };
  }
  function load() {
    try {
      if (window.NET) { const st = NET.localState(); if (st && st.v === VER) return migrate(st); }
      const raw = localStorage.getItem(KEY);   // phase-1 saves stored the state directly under the same key
      if (raw) { const v = JSON.parse(raw); if (v && v.v === VER && v.houses) return migrate(v); }
    } catch (e) { /* blocked or corrupt: start fresh */ }
    return migrate(fresh());
  }
  function migrate(v) {
    v.trader = v.trader || { caps: 0, completed: 0, day: '', offers: [], active: [], stock: [], seq: 0 };
    v.walked = v.walked || 0;
    if (v.survivor) { const s = v.survivor; if (!s.known) s.known = D.BASIC.concat(s.job === 'hunter' ? ['arrow'] : []); s.packBonus = s.packBonus || 0; }
    return v;
  }
  Game.save = function () {
    if (!SV) return;
    SV.savedAt = Date.now();
    if (window.NET) { try { NET.save(SV); } catch (e) { console.warn('NET.save failed', e); } }
    else { try { localStorage.setItem(KEY, JSON.stringify(SV)); } catch (e) { /* storage blocked */ } }
    updateSync();
  };
  Game.data = () => SV;

  // ---------------------------------------------------------------- survivor
  const maxHp = s => s.job === 'brawler' ? 130 : 100;
  function createSurvivor(name, look, job) {
    const J = D.JOBS[job];
    let xp = 0; try { const v = JSON.parse(localStorage.getItem('dm-next-skills') || '{}'); if (v.scav) xp = +v.scav.xp || 0; } catch (e) { /* none */ }
    const s = { name: name || 'Survivor', look, job, hp: 0, xp, pack: [], stash: [], hands: null, packBonus: 0, known: D.BASIC.concat(job === 'hunter' ? ['arrow'] : []) };
    s.hp = maxHp(s);
    for (const [k, n] of J.kit) {
      if (k === J.hands) { s.hands = { k, d: D.WEAPONS[D.ITEMS[k].w].dur }; continue; }
      addTo(s.pack, 12, k, n, D.isWeapon(k) ? D.WEAPONS[D.ITEMS[k].w].dur : undefined);
    }
    return s;
  }
  function addTo(list, slots, k, n, d) {
    const m = D.stackMax(k); let left = n;
    for (const e of list) if (e.k === k && e.n < m && left) { const t = Math.min(left, m - e.n); e.n += t; left -= t; }
    while (left && list.length < slots) { const t = Math.min(left, m); const e = { k, n: t }; if (d != null) e.d = d; list.push(e); left -= t; }
    return n - left;
  }
  const packSlots = () => 12 + (SV.survivor.packBonus || 0) + (D.scavLvl(SV.survivor.xp) >= 9 ? 2 : 0);

  // ---------------------------------------------------------------- steps -> houses
  const effective = d => d.phone + d.walk + d.typed * .5;
  const worth = e => Math.min(e, 7000) + .5 * Math.max(0, Math.min(e - 7000, 8000)) + .15 * Math.max(0, e - 15000);
  const housesFor = w => w < 600 ? 0 : Math.min(10, Math.round(.75 * w / 1000 + .75));
  function nextHouseAt(d) { // effective steps needed for the next scouted house
    const n = housesFor(worth(effective(d)));
    if (n >= 10) return null;
    let lo = effective(d), hi = 60000;
    for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (housesFor(worth(mid)) > n) hi = mid; else lo = mid; }
    return Math.ceil(hi);
  }
  DM.addSteps = function (n, src = 'phone') {
    if (!SV) return 0;
    rollDay();
    n = Math.max(0, Math.round(+n || 0));
    if (!['phone', 'typed', 'walk'].includes(src)) src = 'phone';
    if (src === 'typed') n = Math.min(n, Math.max(0, 4000 - SV.day.typed));
    SV.day[src] += n;
    SV.walked = (SV.walked || 0) + (src === 'typed' ? n * .5 : n);
    revealQuestHouses();
    const before = SV.day.scouted;
    scout();
    Game.save();
    if (SV.day.scouted > before) toast(`Scouted ${SV.day.scouted - before} new house${SV.day.scouted - before > 1 ? 's' : ''}`, 2);
    renderHome();
    return n;
  };
  // Late steps for yesterday (NET: the Shortcut's 'y' post, or the phone's last post before midnight)
  // are credited to YESTERDAY's taper: they can still scout houses, dated yesterday (so they expire a day sooner).
  // Anything older than yesterday is simply added to today.
  function addLateSteps(n, src, day) {
    const p = SV.prevDay;
    if (!p || p.key !== day) return DM.addSteps(n, src);
    n = Math.max(0, Math.round(+n || 0));
    if (src === 'typed') n = Math.min(n, Math.max(0, 4000 - p.typed));
    p[src] += n; SV.walked = (SV.walked || 0) + (src === 'typed' ? n * .5 : n);
    const target = housesFor(worth(effective(p))); let added = 0;
    while (p.scouted < target) { p.scouted++; added++; addHouse(worth(effective(p)) * p.scouted / Math.max(1, target), p.key); }
    revealQuestHouses(); Game.save();
    if (added) toast(`Yesterday's late steps scouted ${added} more house${added > 1 ? 's' : ''}`, 2.2);
    renderHome();
    return n;
  }
  function onNetSteps(delta, src, info) {
    if (!SV || !SV.survivor) return false;           // not ready (character not made yet): NET offers them again later
    const s = src === 'typed' ? 'typed' : 'phone';    // 'phone' and 'shortcut' both count as phone steps
    if (info && info.late && info.day) addLateSteps(delta, s, info.day); else DM.addSteps(delta, s);
    return true;
  }
  function scout() {
    const w = worth(effective(SV.day)), target = housesFor(w);
    while (SV.day.scouted < target) { SV.day.scouted++; addHouse(worth(effective(SV.day)) * SV.day.scouted / Math.max(1, target)); }
  }
  function pickType(w, rnd) {
    const T = D.BTYPES, keys = Object.keys(T).filter(k => T[k].w > 0);
    // more steps today = slightly better odds of bigger, rarer buildings
    const wt = keys.map(k => T[k].w * (1 + (T[k].big || 0) * w / 9000));
    let v = rnd() * wt.reduce((a, b) => a + b, 0);
    for (let i = 0; i < keys.length; i++) { v -= wt[i]; if (v <= 0) return keys[i]; }
    return keys[0];
  }
  function addHouse(w, day) {
    const seq = SV.houseSeq++;
    const seed = D.hashStr(SV.seedBase + ':' + seq);
    const type = pickType(w, D.mulberry32(seed ^ 0x9e3779b9));
    const L = layoutOf({ type, seed });
    SV.houses.push({ id: 'h' + seq, type, seed, day: day || SV.day.key, status: 'new', address: L.address, danger: L.danger, nLocks: L.nLocks, nZombies: L.nZombies });
  }
  const cache = new Map();
  function layoutOf(h) {
    const k = h.type + ':' + h.seed;
    if (!cache.has(k)) cache.set(k, h.type === 'tutorial' ? DM.Gen.tutorial() : DM.Gen.generate(h.type, h.seed));
    return cache.get(k);
  }
  Game.layoutOf = layoutOf;
  function rollDay(force) {
    const t = today();
    if (SV.day.key === t && !force) return;
    const days = Math.max(1, dayNum(t) - dayNum(SV.day.key));
    const s = SV.survivor;
    if (s) s.hp = Math.min(maxHp(s), s.hp + 25 * days); // rest heals a little each day
    SV.prevDay = days === 1 ? SV.day : null;
    SV.day = { key: t, phone: 0, typed: 0, walk: 0, scouted: 0 };
    // unlooted houses last 3 days; finished ones are cleared from the list; quest houses stay while the quest is open
    SV.houses = SV.houses.filter(h => h.quest ? questById(h.quest) && h.status !== 'looted' : h.status === 'new' && dayNum(t) - dayNum(h.day) < 3);
  }
  function devNewDay() { // pretend a day passed: shift every date back one day, then roll over
    SV.day.key = keyOf(dayNum(SV.day.key) - 1);
    for (const h of SV.houses) if (!h.quest) h.day = keyOf(dayNum(h.day) - 1);
    rollDay(true); Game.save(); renderHome(); toast('A new day', 1.4);
  }

  // ---------------------------------------------------------------- crew auto-search: instant, ~40% of the loot, never secrets
  function autoSearch(h) {
    const L = layoutOf(h), rnd = D.mulberry32(h.seed ^ 0x5bd1e995);
    const got = [];
    for (const f of L.furn) {
      if (!f.loot || f.secretLoot) continue;
      if (f.lock && rnd() < .5) continue; // the crew skips half the locked stuff
      for (const k of D.rollLoot(f.loot, rnd)) if (rnd() < .4) got.push(k);
    }
    const stacks = D.toStacks(got, rnd), lost = [];
    for (const e of stacks) { const n = addTo(SV.survivor.stash, STASH_SLOTS, e.k, e.n, e.d); if (n < e.n) lost.push({ k: e.k, n: e.n - n }); }
    h.status = 'auto'; SV.stats.auto++;
    SV.survivor.xp += 3;
    Game.save();
    showResult(L.name + ' · ' + L.address, stacks, lost, 'Everything went to your stash. The crew grabs less than you would and never finds hidden compartments.');
    renderHome();
  }

  // ---------------------------------------------------------------- runs
  function loot(h) {
    if (SV.survivor.hp < 15) { toast('Too hurt to go in. Eat or patch up first.', 2.2); return; }
    const L = Object.assign({}, layoutOf(h), { id: h.id });
    const q = h.quest && questById(h.quest);
    if (q && q.type === 'fetch' && !q.done) { // plant Dot's lockbox in one container of this house
      L.furn = L.furn.map(f => Object.assign({}, f));
      const cs = L.furn.filter(f => f.loot && !f.secretLoot && !f.lock && f.room !== 'o');
      const f = cs[D.hashStr(q.id) % cs.length]; f.extra = (f.extra || []).concat('parcel'); f.noEmpty = 1;
    }
    SV.stats.runs++; Game.save();
    hideMenu();
    DM.House.start(L, {
      hint: h.type === 'tutorial' ? 'Joystick to move  ·  SEARCH near furniture' : `${L.name} · ${L.address}`,
      onExit: res => {
        h.status = q && !q.done ? 'new' : 'looted'; if (h.type === 'tutorial') SV.tutorialDone = true;
        SV.stats.kills += res.kills; SV.stats.secrets += res.secrets; if (res.kind === 'down') SV.stats.downs++;
        if (q && q.type === 'clear' && res.zombies.total && res.zombies.dead >= res.zombies.total) questDone(q);
        checkFetch(); if (q && q.done) h.status = 'looted';
        Game.save(); publish(); showMenu(); tab('houses'); renderHome();
        toast(res.kind === 'down' ? 'You made it home. Barely.' : `Home safe from ${res.address}`, 2.4);
      },
    });
  }

  // ---------------------------------------------------------------- trader: Auntie Dot, quests, shop, crafting
  const traderLevel = () => Math.min(5, 1 + Math.floor((SV.trader.completed || 0) / 20));
  const questById = id => SV.trader.active.find(q => q.id === id) || null;
  const countItem = k => SV.survivor.pack.concat(SV.survivor.stash).filter(e => e.k === k).reduce((a, e) => a + e.n, 0);
  function takeItems(k, n) { // stash first, then pack; returns removed entries (weapons keep durability)
    const out = [];
    for (const list of [SV.survivor.stash, SV.survivor.pack]) for (let i = list.length - 1; i >= 0 && n > 0; i--) if (list[i].k === k) { const t = Math.min(n, list[i].n); list[i].n -= t; n -= t; out.push({ k, n: t, d: list[i].d }); if (!list[i].n) list.splice(i, 1); }
    return out;
  }
  function give(k, n, d) { // into the pack if it fits, the rest to the stash; returns what did not fit anywhere
    let got = addTo(SV.survivor.pack, packSlots(), k, n, d); if (got < n) got += addTo(SV.survivor.stash, STASH_SLOTS, k, n - got, d);
    return n - got;
  }
  function refreshTrader(force) {
    const T = SV.trader, day = SV.day.key;
    if (T.day === day && !force) return;
    const rnd = D.mulberry32(D.hashStr(SV.seedBase + ':dot:' + day + ':' + traderLevel()));
    if (T.day !== day) { // new quest offers at local midnight
      T.offers = [];
      const types = Object.keys(D.QUESTS).sort(() => rnd() - .5);
      for (let i = 0; i < 3; i++) T.offers.push(makeQuest(types[i], Math.max(1, Math.min(traderLevel(), traderLevel() - (rnd() < .45 ? 1 : 0))), rnd));
    }
    // stock rotates daily and grows with trader level
    const L = traderLevel(), unknown = Object.keys(D.ITEMS).filter(k => k.startsWith('bp_') && !SV.survivor.known.includes(D.ITEMS[k].bp));
    T.stock = [];
    for (const [k0, n, price, lv, ch] of D.SHOP) {
      if (lv > L || rnd() > ch) continue;
      if (k0 === 'backpack' && T.boughtPack) continue;
      let k = k0;
      if (k0 === 'bp_*') { if (!unknown.length) continue; k = unknown.splice(Math.floor(rnd() * unknown.length), 1)[0]; }
      T.stock.push({ k, n, price: Math.max(1, Math.round(price * (1 - .04 * (L - 1)))), left: k0 === 'backpack' || k.startsWith('bp_') || D.isWeapon(k) ? 1 : 2 });
    }
    T.day = day;
  }
  function makeQuest(type, tier, rnd) {
    const T = SV.trader, Q = D.QUESTS[type];
    const q = { id: 'q' + (T.seq = (T.seq || 0) + 1), type, tier, have: 0, need: Q.need(tier), done: false };
    if (type === 'supply') { const pool = ['water', 'beans', 'bandage', 'cloth', 'scrap', 'battery', 'tape', 'wood']; q.item = pool[Math.floor(rnd() * pool.length)]; if (q.item === 'scrap' || q.item === 'wood') q.need *= 2; }
    if (type === 'clear' || type === 'fetch') {
      const types = D.QUEST_HOUSE[tier]; q.htype = types[Math.floor(rnd() * types.length)];
      q.seed = D.hashStr(SV.seedBase + ':' + q.id); q.away = Math.round((800 + tier * 900 + rnd() * 600) / 100) * 100;
      q.addr = layoutOf({ type: q.htype, seed: q.seed }).address;
    }
    q.reward = { caps: 10 + tier * 12, xp: tier * 8 };
    return q;
  }
  Game.forceOffers = types => { const rnd = D.mulberry32(7); SV.trader.offers = types.map(t => makeQuest(t, 1, rnd)); SV.trader.day = SV.day.key; Game.save(); }; // test hook
  const questText = q => D.QUESTS[q.type].d(q.tier, q);
  function acceptQuest(i) {
    const T = SV.trader;
    if (T.active.length >= 2) { toast('Two jobs at a time, sugar.', 1.8); return; }
    const q = T.offers.splice(i, 1)[0];
    T.active.push(q);
    if (q.type === 'clear' || q.type === 'fetch') {
      q.base = SV.walked || 0;
      SV.houses.push({ id: 'q-' + q.id, quest: q.id, type: q.htype, seed: q.seed, day: SV.day.key, status: 'far', address: q.addr, danger: D.BTYPES[q.htype].danger, ...(() => { const L = layoutOf({ type: q.htype, seed: q.seed }); return { nLocks: L.nLocks, nZombies: L.nZombies }; })() });
      revealQuestHouses();
    }
    Game.save(); SFX.play('pick'); toast('Quest taken: ' + D.QUESTS[q.type].n, 1.6);
  }
  function revealQuestHouses() {
    if (!SV || !SV.trader) return;
    for (const h of SV.houses) if (h.quest && h.status === 'far') { const q = questById(h.quest); if (q && (SV.walked || 0) - q.base >= q.away) { h.status = 'new'; toast(`Quest house reached: ${h.address}`, 2.4); } }
  }
  function questDone(q) {
    if (q.done) return; q.done = true; q.have = q.need;
    toast(`Quest done: ${D.QUESTS[q.type].n} - go see Dot`, 2.6); SFX.play('pick');
  }
  function bump(type, n = 1) {
    for (const q of SV.trader.active) if (q.type === type && !q.done) { q.have = Math.min(q.need, q.have + n); if (q.have >= q.need) questDone(q); }
  }
  Game.onKill = z => { if (SV && SV.trader && z.kind !== 'turkey') bump('hunt'); };
  Game.onSecret = () => { if (SV && SV.trader) bump('secrets'); };
  function checkFetch() { for (const q of SV.trader.active) if (q.type === 'fetch' && !q.done && countItem('parcel')) questDone(q); }
  const supplyReady = q => q.type === 'supply' && countItem(q.item) >= q.need;
  Game.questChip = function () { // small HUD chip during runs
    if (!SV || !SV.trader || !SV.trader.active.length) return '';
    const hid = DM.House.L && DM.House.L.id;
    return SV.trader.active.map(q => {
      const n = D.QUESTS[q.type].n;
      if (q.done) return `<b>${n}</b> done`;
      if (q.type === 'clear') { if (hid === 'q-' + q.id) { const c = DM.House.zombieCount(); return `<b>Clear</b> ${c.dead}/${c.total}`; } return `<b>Clear</b> ${esc(q.addr)}`; }
      if (q.type === 'fetch') return hid === 'q-' + q.id ? (DM.G && DM.G.pack.some(e => e.k === 'parcel') ? '<b>Fetch</b> got it' : '<b>Fetch</b> find the lockbox') : `<b>Fetch</b> ${esc(q.addr)}`;
      if (q.type === 'supply') return `<b>Supply</b> ${D.ITEMS[q.item].n.toLowerCase()} ${Math.min(q.need, countItem(q.item))}/${q.need}`;
      return `<b>${n}</b> ${q.have}/${q.need}`;
    }).join('<i></i>');
  };
  function rewardOptions(q) {
    const t = q.tier, opts = [];
    const unknown = Object.keys(D.ITEMS).filter(k => k.startsWith('bp_') && !SV.survivor.known.includes(D.ITEMS[k].bp));
    const rnd = D.mulberry32(D.hashStr(q.id + ':rw'));
    if (unknown.length) { const k = unknown[Math.floor(rnd() * unknown.length)]; opts.push({ n: 'Blueprint', items: [[k, 1]] }); }
    opts.push({ n: 'Food bundle', items: [['beans', t + 1], ['water', t], ...(D.EVENT ? [['pie', 1]] : [])] });
    opts.push({ n: 'Meds bundle', items: [['bandage', t + 1], ['meds', Math.ceil(t / 2)]] });
    opts.push(SV.survivor.job === 'hunter' ? { n: 'Arrows bundle', items: [['arrow', 6 * t], ['lockpick', 1]] } : { n: 'Ammo bundle', items: [['ammo', 10 * t], ['lockpick', 1]] });
    return opts;
  }
  function turnIn(q, opt) {
    const T = SV.trader;
    if (q.type === 'supply') takeItems(q.item, q.need);
    if (q.type === 'fetch') takeItems('parcel', 1);
    for (const [k, n] of opt.items) { const d = D.isWeapon(k) ? D.WEAPONS[D.ITEMS[k].w].dur : undefined; give(k, n, d); }
    T.caps += q.reward.caps; SV.survivor.xp += q.reward.xp;
    T.active = T.active.filter(x => x !== q);
    SV.houses = SV.houses.filter(h => h.quest !== q.id);
    const lv0 = traderLevel(); T.completed++;
    if (traderLevel() > lv0) { refreshTrader(true); toast(`Trader level ${traderLevel()}! Better stock, tier ${traderLevel()} jobs`, 3); }
    else toast(`+${q.reward.caps} caps · ${opt.n}`, 2);
    Game.save(); publish();
  }

  // ---- item use outside a run (also called by house.js for Fit / Learn / Wear)
  Game.applyUse = function (k) {
    const s = SV.survivor, it = D.ITEMS[k];
    if (it.slots) { if ((s.packBonus || 0) + it.slots > 8) { toast('Your pack can\'t take more upgrades', 1.8); return null; } s.packBonus = (s.packBonus || 0) + it.slots; Game.save(); return `${it.n} fitted: pack is now ${packSlots()} slots`; }
    if (it.bp) { if (s.known.includes(it.bp)) { toast('You already know that one', 1.6); return null; } s.known.push(it.bp); Game.save(); return 'Learned: ' + D.RECIPES[it.bp].n; }
    if (k === 'shoes') { if (s.shoes) { toast('Already wearing them', 1.4); return null; } s.shoes = true; Game.save(); return 'Quiet shoes on: footsteps 30% quieter'; }
    if (k === 'lockset') { if (s.lockset) { toast('You already carry a set', 1.4); return null; } s.lockset = true; Game.save(); return 'Lockpick set: locks feel easier'; }
    return null;
  };

  // ---- workbench
  function canCraft(r) { return Object.keys(r.in).every(k => countItem(k) >= r.in[k]); }
  function craft(key) {
    const r = D.RECIPES[key];
    if (!canCraft(r)) { toast('Missing materials', 1.4); return; }
    for (const k in r.in) takeItems(k, r.in[k]);
    const [k, n] = r.out, d = D.isWeapon(k) ? D.WEAPONS[D.ITEMS[k].w].dur : undefined;
    const lost = give(k, n, d);
    SV.survivor.xp += 2; Game.save(); SFX.play('open');
    toast(lost ? `Crafted ${D.ITEMS[k].n} - no room for ${lost}` : `Crafted ${D.ITEMS[k].n}${n > 1 ? ' x' + n : ''}`, 1.8);
    renderHome();
  }
  function renderBench() {
    const s = SV.survivor, el = $('#mpane');
    const unknown = Object.keys(D.RECIPES).filter(k => !s.known.includes(k)).length;
    el.innerHTML = `<div class="kick sect">Workbench · ${s.known.length} recipe${s.known.length === 1 ? '' : 's'} known</div>` + s.known.map(k => {
      const r = D.RECIPES[k], ok = canCraft(r), out = r.out[0];
      return `<div class="recipe${ok ? '' : ' no'}"><div class="rout">${icon(out)}${r.out[1] > 1 ? `<em>x${r.out[1]}</em>` : ''}</div>
        <div class="rinfo"><b>${r.n}</b><div class="rin">${Object.keys(r.in).map(m => { const have = countItem(m); return `<span class="${have >= r.in[m] ? 'ok' : 'miss'}">${icon(m)}${have}/${r.in[m]}</span>`; }).join('')}</div></div>
        <button class="mbtn sm${ok ? '' : ' ghost'}" data-craft="${k}"${ok ? '' : ' disabled'}>Craft</button></div>`;
    }).join('') + `<div class="empty">${unknown ? `${unknown} more blueprint${unknown > 1 ? 's' : ''} out there - Dot trades them, and some turn up in hidden stashes.` : 'You know every blueprint so far.'}<br>Materials come from the stash and the pack.</div>`;
    el.querySelectorAll('[data-craft]').forEach(b => b.onclick = () => craft(b.dataset.craft));
  }

  // ---- trader screen
  const DOT_SVG = `<svg viewBox="0 0 120 140" class="dotsvg"><ellipse cx="60" cy="134" rx="40" ry="6" fill="rgba(8,6,22,.45)"/>
    <path d="M22 134 Q20 98 38 88 L82 88 Q100 98 98 134 Z" fill="#5a4a86" stroke="#11142f" stroke-width="4" stroke-linejoin="round"/>
    <path d="M46 88 L60 112 L74 88" fill="#f6e3bb" stroke="#11142f" stroke-width="3" stroke-linejoin="round"/>
    <path d="M30 104 L40 100 M86 104 L80 112" stroke="#3d2d61" stroke-width="3" stroke-linecap="round"/><rect x="74" y="112" width="12" height="9" rx="2" fill="#93a86c" stroke="#11142f" stroke-width="2.4"/>
    <circle cx="60" cy="58" r="27" fill="#8a5a3c" stroke="#11142f" stroke-width="4"/>
    <path d="M32 52 Q30 22 60 20 Q92 20 90 52 Q84 40 60 40 Q38 40 32 52 Z" fill="#f07b3c" stroke="#11142f" stroke-width="4" stroke-linejoin="round"/>
    <path d="M86 34 Q100 32 98 46 Q92 40 86 42 Z" fill="#c95f2c" stroke="#11142f" stroke-width="3" stroke-linejoin="round"/>
    <circle cx="48" cy="60" r="8" fill="#f6e3bb" fill-opacity=".25" stroke="#11142f" stroke-width="3"/><circle cx="72" cy="60" r="8" fill="#f6e3bb" fill-opacity=".25" stroke="#11142f" stroke-width="3"/><path d="M56 60 h8" stroke="#11142f" stroke-width="3"/>
    <circle cx="49" cy="61" r="2.6" fill="#11142f"/><circle cx="73" cy="61" r="2.6" fill="#11142f"/>
    <path d="M52 74 Q60 79 68 73" stroke="#11142f" stroke-width="3" fill="none" stroke-linecap="round"/>
    <rect x="70" y="44" width="12" height="5" rx="2" fill="#f4b98a" stroke="#11142f" stroke-width="1.6" transform="rotate(20 76 46)"/>
    <circle cx="40" cy="70" r="3" fill="#c96a6a" opacity=".5"/><circle cx="80" cy="70" r="3" fill="#c96a6a" opacity=".5"/></svg>`;
  let tTab = 'quests', tSel = null;
  function openTrader() { refreshTrader(); tTab = 'quests'; tSel = null; renderTrader(); }
  function renderTrader() {
    const T = SV.trader, L = traderLevel(), lines = D.TRADER.lines[L - 1];
    const line = lines[(D.hashStr(SV.day.key) + T.completed) % lines.length];
    $('#menu').className = 'trader';
    $('#mbody').innerHTML = `
      <div class="mtop"><button class="mbtn sm ghost" id="tBack">Home</button><div class="logo small">DOT'S SWAP SHOP</div><div class="caps">${icon('caps')}<b>${T.caps}</b></div></div>
      <div class="tcard">${DOT_SVG}<div class="tinfo"><div class="tname">${D.TRADER.name}</div><div class="tplace">${D.TRADER.place}</div>
        <div class="tsay">"${esc(line)}"</div>
        <div class="tlvl">Trader level ${L}${L < 5 ? ` · ${T.completed % 20}/20 quests to level ${L + 1}` : ' · max'}</div><div class="mbar xp"><i style="width:${L < 5 ? (T.completed % 20) / 20 * 100 : 100}%"></i></div></div></div>
      <div id="mtabs"><button data-t="quests">Quests</button><button data-t="shop">Shop</button><button data-t="sell">Sell</button></div>
      <div id="tpane"></div>`;
    $('#tBack').onclick = () => { $('#menu').className = ''; renderHome(); };
    document.querySelectorAll('#mtabs button').forEach(b => { b.classList.toggle('on', b.dataset.t === tTab); b.onclick = () => { tTab = b.dataset.t; tSel = null; SFX.play('ui'); renderTrader(); }; });
    ({ quests: tQuests, shop: tShop, sell: tSell })[tTab]();
  }
  function tQuests() {
    const T = SV.trader, el = $('#tpane');
    const card = (q, act) => {
      const ready = q.done || supplyReady(q), Q = D.QUESTS[q.type];
      const prog = act ? (q.type === 'supply' ? `${Math.min(q.need, countItem(q.item))}/${q.need}` : q.type === 'clear' || q.type === 'fetch' ? (ready ? 'done' : (SV.walked || 0) - q.base >= q.away ? 'house reached' : `${Math.max(0, Math.ceil(q.away - ((SV.walked || 0) - q.base))).toLocaleString('en-US')} steps to go`) : `${q.have}/${q.need}`) : '';
      return `<div class="qcard${ready && act ? ' ready' : ''}"><div class="qhead"><b>${Q.n}</b><em>Tier ${q.tier}</em>${act ? `<span class="qprog">${prog}</span>` : ''}</div>
        <div class="qtext">${esc(questText(q))}</div><div class="qrew">${icon('caps')} ${q.reward.caps} caps · ${q.reward.xp} xp · pick a reward</div>
        ${act ? (ready ? `<button class="mbtn sm" data-turn="${q.id}">Turn in</button>` : `<button class="mbtn sm ghost" data-drop="${q.id}">Abandon</button>`) : `<button class="mbtn sm" data-take="${T.offers.indexOf(q)}">Take job</button>`}</div>`;
    };
    el.innerHTML = `<div class="kick sect">Your jobs · ${T.active.length}/2</div>${T.active.length ? T.active.map(q => card(q, true)).join('') : '<div class="empty">No jobs yet. Take one from the board.</div>'}
      <div class="kick sect">Today's board · new jobs at midnight</div>${T.offers.length ? T.offers.map(q => card(q, false)).join('') : '<div class="empty">Board is empty until tomorrow.</div>'}`;
    el.querySelectorAll('[data-take]').forEach(b => b.onclick = () => { acceptQuest(+b.dataset.take); renderTrader(); });
    el.querySelectorAll('[data-drop]').forEach(b => b.onclick = () => { if (!b.dataset.sure) { b.dataset.sure = 1; b.textContent = 'Sure?'; return; } T.active = T.active.filter(q => q.id !== b.dataset.drop); SV.houses = SV.houses.filter(h => h.quest !== b.dataset.drop); Game.save(); renderTrader(); });
    el.querySelectorAll('[data-turn]').forEach(b => b.onclick = () => {
      const q = T.active.find(x => x.id === b.dataset.turn), opts = rewardOptions(q);
      sheetOpen(`<div class="kick">${D.QUESTS[q.type].n} · tier ${q.tier}</div><h3>Pick your reward</h3><p class="mp">Plus ${q.reward.caps} caps and ${q.reward.xp} xp.</p>
        ${opts.map((o, i) => `<button class="pick" data-opt="${i}"><b>${o.n}</b><span class="picons">${o.items.map(([k, n]) => `${icon(k)}${D.ITEMS[k].n}${n > 1 ? ' x' + n : ''}`).join(' ')}</span></button>`).join('')}`);
      $('#msheet').querySelectorAll('[data-opt]').forEach(o => o.onclick = () => { sheetClose(); turnIn(q, opts[+o.dataset.opt]); renderTrader(); });
    });
  }
  function tShop() {
    const T = SV.trader, el = $('#tpane');
    el.innerHTML = `<div class="kick sect">Today's stock · level ${traderLevel()}</div>` + (T.stock.length ? T.stock.map((e, i) => `<div class="shoprow${e.left ? '' : ' gone'}">${icon(e.k)}<div><b>${D.ITEMS[e.k].n}${e.n > 1 ? ' x' + e.n : ''}</b><span>${e.left ? e.left + ' left' : 'sold out'}</span></div>
      <button class="mbtn sm${T.caps >= e.price && e.left ? '' : ' ghost'}" data-buy="${i}"${e.left ? '' : ' disabled'}>${icon('caps')}${e.price}</button></div>`).join('') : '<div class="empty">Shelves are bare today.</div>') + '<div class="empty">Bought goods go in your pack, or the stash if it is full.</div>';
    el.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => {
      const e = T.stock[+b.dataset.buy];
      if (T.caps < e.price) { toast('Not enough caps, sugar', 1.4); return; }
      const d = D.isWeapon(e.k) ? D.WEAPONS[D.ITEMS[e.k].w].dur : undefined;
      if (give(e.k, e.n, d) === e.n) { toast('No room in pack or stash', 1.6); return; }
      T.caps -= e.price; e.left--; if (e.k === 'backpack') T.boughtPack = true;
      SFX.play('pick'); Game.save(); renderTrader();
    });
  }
  function tSell() {
    const s = SV.survivor, el = $('#tpane');
    const rows = [];
    for (const [from, list] of [['pack', s.pack], ['stash', s.stash]]) list.forEach((e, i) => { const v = D.valueOf(e.k, e.d); if (D.VALUE[e.k] === 0 || D.ITEMS[e.k].quest) return; rows.push({ from, i, e, v }); });
    el.innerHTML = `<div class="kick sect">Sell to Dot · she pays low</div>` + (rows.length ? rows.map((r, j) => `<div class="shoprow">${icon(r.e.k)}<div><b>${D.ITEMS[r.e.k].n}${r.e.n > 1 ? ' x' + r.e.n : ''}</b><span>${r.from} · ${icon('caps')}${Math.max(1, Math.floor(r.v))} each</span></div>
      <button class="mbtn sm" data-sell="${j}">Sell ${r.e.n > 1 ? 'all' : ''} ${icon('caps')}${Math.max(1, Math.floor(r.v * r.e.n))}</button></div>`).join('') : '<div class="empty">Nothing to sell.</div>');
    el.querySelectorAll('[data-sell]').forEach(b => b.onclick = () => {
      const r = rows[+b.dataset.sell], list = s[r.from], idx = list.indexOf(r.e); if (idx < 0) return;
      list.splice(idx, 1); SV.trader.caps += Math.max(1, Math.floor(r.v * r.e.n));
      SFX.play('pick'); Game.save(); renderTrader();
    });
  }

  // ---------------------------------------------------------------- UI helpers
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = k => `<img alt="" src="${ART.iconURL[D.ITEMS[k].i]}">`;
  const SKULL = '<svg viewBox="0 0 20 20" class="skull"><path d="M10 2C5.6 2 3 5 3 8.6c0 2.2 1 3.6 2.4 4.4V16h2v-1.6h1.3V16h2.6v-1.6h1.3V16h2v-3c1.4-.8 2.4-2.2 2.4-4.4C17 5 14.4 2 10 2z" fill="currentColor"/><circle cx="7.2" cy="9" r="1.9" fill="#1c1538"/><circle cx="12.8" cy="9" r="1.9" fill="#1c1538"/></svg>';
  const B = {
    row: '<rect x="18" y="8" width="28" height="48" fill="#8a4a3a"/><path d="M14 8h36v5H14z" fill="#5e2a2a"/><g fill="#f6e3bb"><rect x="22" y="17" width="7" height="9"/><rect x="35" y="17" width="7" height="9"/><rect x="22" y="31" width="7" height="9"/><rect x="35" y="31" width="7" height="9"/></g><rect x="28" y="44" width="8" height="12" fill="#11142f"/><path d="M24 56h16v3H24z" fill="#9d90bf"/>',
    apt: '<rect x="10" y="12" width="44" height="44" fill="#5a4a86"/><g fill="#f6e3bb">' + [0, 1, 2].map(r => [0, 1, 2].map(c => `<rect x="${15 + c * 13}" y="${17 + r * 12}" width="8" height="7"/>`).join('')).join('') + '</g><rect x="28" y="49" width="8" height="7" fill="#11142f"/>',
    shop: (aw, extra) => `<rect x="8" y="16" width="48" height="40" fill="#4a4060"/><path d="M6 16h52v8H6z" fill="${aw[0]}"/><g fill="${aw[1]}">${[0, 1, 2, 3, 4, 5].map(i => `<rect x="${6 + i * 9}" y="16" width="4.5" height="8"/>`).join('')}</g><rect x="13" y="30" width="20" height="16" fill="#f6e3bb"/><rect x="38" y="30" width="12" height="26" fill="#11142f"/>${extra || ''}`,
    garage: '<rect x="8" y="14" width="48" height="42" fill="#4a4660"/><path d="M6 14h52l-4-6H10z" fill="#7d8398"/><g fill="#9aa0b4">' + [0, 1, 2, 3, 4].map(i => `<rect x="14" y="${26 + i * 6}" width="36" height="4"/>`).join('') + '</g>',
    school: '<rect x="6" y="22" width="52" height="34" fill="#8a4a3a"/><path d="M22 22l10-12 10 12z" fill="#5e2a2a"/><circle cx="32" cy="19" r="4" fill="#f6e3bb"/><g fill="#f6e3bb"><rect x="11" y="30" width="8" height="8"/><rect x="45" y="30" width="8" height="8"/><rect x="11" y="43" width="8" height="8"/><rect x="45" y="43" width="8" height="8"/></g><rect x="27" y="40" width="10" height="16" fill="#11142f"/><path d="M32 4v9" stroke="#11142f" stroke-width="2"/><path d="M32 4h8v4h-8z" fill="#f07b3c"/>',
    police: '<rect x="8" y="18" width="48" height="38" fill="#3a4470"/><path d="M8 18h48v6H8z" fill="#262a52"/><path d="M32 28l3 6 6 1-4.5 4 1 6-5.5-3-5.5 3 1-6-4.5-4 6-1z" fill="#e0b94a" stroke="#11142f" stroke-width="1.2"/><rect x="28" y="46" width="8" height="10" fill="#11142f"/>',
    mansion: '<rect x="6" y="26" width="52" height="30" fill="#c9b48a"/><path d="M4 26L32 8l28 18z" fill="#7a5048"/><g fill="#f6e3bb">' + [0, 1, 2, 3].map(i => `<rect x="${12 + i * 12}" y="28" width="3.5" height="28"/>`).join('') + '</g><rect x="28" y="40" width="8" height="16" fill="#11142f"/>',
  };
  const TYPEICON = { tutorial: B.row, rowS: B.row, rowL: B.row, apt: B.apt, bodega: B.shop(['#f07b3c', '#f6e3bb']), laundro: B.shop(['#3fa7a0', '#f6e3bb'], '<circle cx="23" cy="38" r="5" fill="#5a6a8e" stroke="#11142f" stroke-width="1.5"/>'),
    pharmacy: B.shop(['#93a86c', '#f6e3bb'], '<path d="M20 34h6v-4h4v4h6v4h-6v4h-4v-4h-6z" fill="#b53a2e"/>'), garage: B.garage, school: B.school, police: B.police, mansion: B.mansion };
  const typeIcon = t => `<svg viewBox="0 0 64 64" class="bicon">${TYPEICON[t] || B.row}</svg>`;

  function showResult(title, stacks, lost, note) {
    const el = $('#mres');
    el.innerHTML = `<div class="mcard"><div class="kick">Crew search</div><h3>${esc(title)}</h3><p class="mp">${esc(note)}</p>
      <div class="sum">${stacks.length ? stacks.map(e => `<div class="sum-item${D.ITEMS[e.k].rare ? ' rare' : ''}">${icon(e.k)}<span>${D.ITEMS[e.k].n}</span>${e.n > 1 ? `<b>x${e.n}</b>` : ''}</div>`).join('') : '<div class="empty">They came back empty-handed.</div>'}</div>
      ${lost.length ? `<div class="lost">No room in the stash for: ${lost.map(e => D.ITEMS[e.k].n + (e.n > 1 ? ' x' + e.n : '')).join(', ')}</div>` : ''}
      <button class="mbtn" id="mresOk">OK</button></div>`;
    el.classList.add('on');
    $('#mresOk').onclick = () => el.classList.remove('on');
  }

  // ---------------------------------------------------------------- screens
  function hideMenu() { $('#menu').classList.add('off'); }
  function showMenu() { $('#menu').classList.remove('off'); }
  let curTab = 'houses';
  function tab(t) { curTab = t; document.querySelectorAll('#mtabs button').forEach(b => b.classList.toggle('on', b.dataset.t === t)); renderHome(); }

  // ---- character creation
  let cre = { name: '', look: 0, job: 'scavenger' };
  function renderCreate() {
    $('#menu').className = 'create';
    $('#mbody').innerHTML = `
      <div class="mhead"><div class="logo">DEAD MILES</div><div class="kick">a new survivor</div></div>
      <div class="ccard">
        <div class="cprev"><canvas id="cPort" width="200" height="240"></canvas></div>
        <div class="cform">
          <label class="kick" for="cName">Name</label>
          <input id="cName" maxlength="16" placeholder="Your name" value="${esc(cre.name)}" autocomplete="off">
          <div class="kick">Hood</div>
          <div class="swatches">${D.LOOKS.map((l, i) => `<button class="sw${i === cre.look ? ' on' : ''}" data-i="${i}" style="background:${l.c[0]}" aria-label="${l.n}"></button>`).join('')}</div>
        </div>
      </div>
      <div class="kick sect">Job</div>
      <div class="jobs">${Object.keys(D.JOBS).map(k => { const J = D.JOBS[k]; return `<button class="job${k === cre.job ? ' on' : ''}" data-j="${k}">
        <b>${J.n}</b><span>${J.perk}</span><div class="kit">${J.kit.map(([it, n]) => `<i>${icon(it)}${n > 1 ? `<em>${n}</em>` : ''}</i>`).join('')}</div></button>`; }).join('')}</div>
      <button class="mbtn big" id="cGo">Start walking</button>`;
    $('#cName').oninput = e => cre.name = e.target.value;
    document.querySelectorAll('.sw').forEach(b => b.onclick = async () => { cre.look = +b.dataset.i; await E.buildSurvivor(cre.look); renderCreate(); });
    document.querySelectorAll('.job').forEach(b => b.onclick = () => { cre.job = b.dataset.j; SFX.play('ui'); renderCreate(); });
    $('#cGo').onclick = async () => {
      SV.survivor = createSurvivor(cre.name.trim(), cre.look, cre.job);
      DM.S = SV.survivor; Game.save(); publish();
      await E.buildSurvivor(cre.look);
      renderHome();
    };
    drawPortrait($('#cPort'), cre.job ? D.JOBS[cre.job].hands : 'bat', 1.0);
  }
  function drawPortrait(c, weapon, sc = .7) {
    const dpr = c.width / c.clientWidth || 2, x = c.getContext('2d');
    x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, c.width, c.height);
    x.fillStyle = 'rgba(8,6,22,.4)'; x.beginPath(); x.ellipse(c.width / 2, c.height * .9, c.width * .28, c.width * .08, 0, 0, 6.3); x.fill();
    const wk = weapon && D.ITEMS[weapon] ? D.ITEMS[weapon].w : weapon;
    ART.drawRig(x, 'survivor', c.width / 2 - 4, c.height * .9, sc * c.height / 260, false, { weapon: wk || 'fists' });
  }

  // ---- home
  function renderHome() {
    if (!SV || !SV.survivor || DM.scene) return;
    rollDay();
    const s = SV.survivor, d = SV.day, J = D.JOBS[s.job], Lv = D.scavLvl(s.xp);
    const eff = effective(d), nxt = nextHouseAt(d), w = worth(eff);
    $('#menu').className = '';
    const hands = s.hands ? `${icon(s.hands.k)}<span>${D.ITEMS[s.hands.k].n}<i class="dur"><i style="width:${Math.max(3, s.hands.d / D.WEAPONS[D.ITEMS[s.hands.k].w].dur * 100)}%"></i></i></span>` : '<span>Fists</span>';
    $('#mbody').innerHTML = `
      <div class="mtop"><div class="logo">DEAD MILES</div><button id="mver" class="ver">${VERSION}</button><button id="mnet" class="gear" aria-label="Account and friends"><svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.4" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M2.8 19.5c.6-3.6 3.2-5.6 6.2-5.6s5.6 2 6.2 5.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="17" cy="9" r="2.6" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M16.5 13.6c2.6.1 4.4 1.8 4.9 4.6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button><button id="mset" class="gear" aria-label="Settings"><svg viewBox="0 0 24 24"><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zm8.4 4.6.1-1.1-.1-1.1 2-1.6-2-3.4-2.4 1a8 8 0 0 0-1.9-1.1L15.8 3h-4l-.4 2.6a8 8 0 0 0-1.9 1.1l-2.4-1-2 3.4 2 1.6-.1 1.1.1 1.1-2 1.6 2 3.4 2.4-1c.6.5 1.2.8 1.9 1.1l.4 2.6h4l.4-2.6a8 8 0 0 0 1.9-1.1l2.4 1 2-3.4z" fill="none" stroke="currentColor" stroke-width="1.7"/></svg></button></div>
      <div class="scard">
        <canvas id="mPort" width="150" height="190"></canvas>
        <div class="sinfo">
          <div class="sname">${esc(s.name)}</div>
          <div class="sjob">${J.n} · <span>${J.stats.join(' · ')}</span></div>
          <div class="mbar hp"><i style="width:${s.hp / maxHp(s) * 100}%"></i><span>HP ${Math.ceil(s.hp)}/${maxHp(s)}</span></div>
          <div class="sline">Scavenging Lv ${Lv}<div class="mbar xp"><i style="width:${Lv >= 10 ? 100 : (s.xp - D.XPCUM(Lv)) / (D.XPCUM(Lv + 1) - D.XPCUM(Lv)) * 100}%"></i></div></div>
          <div class="shands">${hands}</div>
        </div>
      </div>
      <div class="stepcard">
        <div class="steps"><b>${Math.round(d.phone + d.walk + d.typed).toLocaleString('en-US')}</b><span>steps today</span></div>
        <div class="stepinfo">${d.typed ? `${d.typed.toLocaleString('en-US')} typed (half value) · ` : ''}${Math.round(w).toLocaleString('en-US')} worth<br>
          <b>${d.scouted}</b> house${d.scouted === 1 ? '' : 's'} scouted${nxt ? ` · next at ${nxt.toLocaleString('en-US')}` : ' · that\'s the max today'}</div>
        <div class="steprow"><input id="mSteps" inputmode="numeric" placeholder="My total today" maxlength="6"><button id="mLog" class="mbtn sm">Log</button></div>
        <div id="msync" class="msync"></div>
      </div>
      <div id="mtabs"><button data-t="houses">Houses</button><button data-t="stash">Pack &amp; stash</button><button data-t="bench">Workbench</button></div>
      <div id="mpane"></div>`;
    document.querySelectorAll('#mtabs button').forEach(b => { b.classList.toggle('on', b.dataset.t === curTab); b.onclick = () => { SFX.play('ui'); tab(b.dataset.t); }; });
    $('#mLog').onclick = () => {
      const v = parseInt($('#mSteps').value, 10); if (!(v > 0)) { toast('Type your step total for today', 1.6); return; }
      // typed steps go through the step ledger so a phone catching up later never counts the same steps twice
      if (window.NET) { const before = SV.day.typed; const g = NET.typeSteps(v, 'total'); if (!g && SV.day.typed === before) toast(NET.onSteps ? 'Already counted that many today' : 'Saved - it will count in a moment', 2); else if (g < v - (NET.stepsDay().ap || 0)) toast('Typed steps above your phone count are capped at 4,000 a day', 2.4); return; }
      const used = DM.addSteps(v, 'typed'); if (used < v) toast(`Typed steps are capped at 4,000 a day (${used.toLocaleString('en-US')} counted)`, 2.6);
    };
    $('#mnet').onclick = openAccount;
    let vt = 0, vtT = 0; $('#mver').onclick = () => { const n = performance.now(); if (n - vtT > 1200) vt = 0; vtT = n; if (++vt >= 5) { vt = 0; openDev(); } };
    $('#mset').onclick = openSettings;
    drawPortrait($('#mPort'), s.hands && s.hands.k, .78);
    if (curTab === 'houses') renderHouses(); else if (curTab === 'bench') renderBench(); else renderStash();
    updateSync();
  }
  function renderHouses() {
    const list = [];
    if (!SV.tutorialDone) list.push({ id: 'tutorial', type: 'tutorial', seed: 0, status: 'new', day: SV.day.key, address: '14 Halsey St', danger: 1, nLocks: 3, nZombies: 2 });
    list.push(...SV.houses);
    const el = $('#mpane');
    refreshTrader();
    const T = SV.trader, ready = T.active.filter(q => q.done || supplyReady(q)).length;
    const traderCard = SV.tutorialDone ? `<div class="hcard trader"><div class="bicon dotmini">${DOT_SVG}</div>
      <div class="hinfo"><div class="hname">${D.TRADER.name} <em>trader</em></div><div class="haddr">${D.TRADER.place}</div>
      <div class="hmeta"><span>Level ${traderLevel()} · ${T.active.length}/2 jobs${ready ? ` · <b class="hot">${ready} ready to turn in</b>` : ''}</span></div>
      <div class="hdays">Safe zone · ${icon('caps')} ${T.caps} caps</div></div><div class="hbtns"><button class="mbtn" id="hTrader">Visit</button></div></div>` : '';
    if (!list.length) { el.innerHTML = traderCard + `<div class="empty big">No houses scouted yet.<br>Walk - every ~1,000 steps turns up another door.</div>`; if ($('#hTrader')) $('#hTrader').onclick = openTrader; return; }
    el.innerHTML = traderCard + list.map(h => {
      const T = D.BTYPES[h.type], left = 3 - (dayNum(SV.day.key) - dayNum(h.day)), done = h.status !== 'new' && h.status !== 'far';
      const q = h.quest && questById(h.quest), far = h.status === 'far';
      const tags = [h.nLocks ? `${h.nLocks} lock${h.nLocks > 1 ? 's' : ''}` : 'no locks', `${h.nZombies} zombie${h.nZombies === 1 ? '' : 's'}`];
      return `<div class="hcard${done ? ' done' : ''}${h.type === 'tutorial' ? ' tut' : ''}${q ? ' quest' : ''}">
        ${typeIcon(h.type)}
        <div class="hinfo"><div class="hname">${T.n} <em>${T.size}</em>${h.type === 'tutorial' ? ' <em class="first">first house</em>' : ''}${q ? ` <em class="first">quest: ${D.QUESTS[q.type].n.toLowerCase()}</em>` : ''}</div>
          <div class="haddr">${esc(h.address)}</div>
          <div class="hmeta"><span class="danger">${SKULL.repeat(h.danger)}<span class="dim">${SKULL.repeat(5 - h.danger)}</span></span><span>${tags.join(' · ')}</span></div>
          <div class="hdays">${q ? (far ? `${Math.max(0, Math.ceil(q.away - ((SV.walked || 0) - q.base))).toLocaleString('en-US')} steps away` : q.done ? 'Job done - see Dot' : 'Reached · no rush') : done ? (h.status === 'auto' ? 'Crew searched' : 'Looted') : h.type === 'tutorial' ? 'Start here' : left <= 1 ? 'Gone tomorrow' : left + ' days left'}</div></div>
        ${done || far ? '' : q ? `<div class="hbtns"><button class="mbtn" data-loot="${h.id}">Go</button></div>` : `<div class="hbtns"><button class="mbtn" data-loot="${h.id}">Loot</button>${h.type === 'tutorial' ? '' : `<button class="mbtn ghost" data-auto="${h.id}">Crew</button>`}</div>`}
      </div>`;
    }).join('');
    const find = id => id === 'tutorial' ? { id: 'tutorial', type: 'tutorial', seed: 0, status: 'new' } : SV.houses.find(h => h.id === id);
    if ($('#hTrader')) $('#hTrader').onclick = () => { SFX.play('ui'); openTrader(); };
    el.querySelectorAll('[data-loot]').forEach(b => b.onclick = () => { SFX.play('ui'); loot(find(b.dataset.loot)); });
    el.querySelectorAll('[data-auto]').forEach(b => b.onclick = () => { SFX.play('ui'); autoSearch(find(b.dataset.auto)); });
  }

  // ---- pack & stash
  let sel = null; // {from:'pack'|'stash'|'hands', i}
  function renderStash() {
    const s = SV.survivor, el = $('#mpane');
    const slot = (e, from, i) => {
      const it = D.ITEMS[e.k], on = sel && sel.from === from && sel.i === i;
      return `<button class="slot${it.rare ? ' rare' : ''}${on ? ' sel' : ''}" data-from="${from}" data-i="${i}">${icon(e.k)}<span>${it.n}</span>${e.n > 1 ? `<i class="cnt">x${e.n}</i>` : ''}${e.d != null && it.w ? `<i class="dur"><i style="width:${Math.max(4, e.d / D.WEAPONS[it.w].dur * 100)}%"></i></i>` : ''}</button>`;
    };
    const empty = n => Array.from({ length: n }, () => '<div class="slot ph"></div>').join('');
    el.innerHTML = `
      <div class="kick sect">In hand</div>
      <div class="grid g4">${s.hands ? slot({ k: s.hands.k, n: 1, d: s.hands.d }, 'hands', 0) : '<div class="slot ph"><span>Fists</span></div>'}</div>
      <div class="kick sect">Backpack · ${s.pack.length}/${packSlots()}</div>
      <div class="grid g4">${s.pack.map((e, i) => slot(e, 'pack', i)).join('')}${empty(packSlots() - s.pack.length)}</div>
      <div id="sacts"></div>
      <div class="kick sect">Home stash · ${s.stash.length}/${STASH_SLOTS}</div>
      <div class="grid g5">${s.stash.map((e, i) => slot(e, 'stash', i)).join('')}${empty(Math.min(10, STASH_SLOTS - s.stash.length))}</div>`;
    el.querySelectorAll('.slot[data-from]').forEach(b => b.onclick = () => { const f = b.dataset.from, i = +b.dataset.i; sel = sel && sel.from === f && sel.i === i ? null : { from: f, i }; SFX.play('ui'); renderStash(); });
    if (sel) stashActions();
  }
  function stashActions() {
    const s = SV.survivor, acts = $('#sacts');
    const e = sel.from === 'hands' ? { k: s.hands.k, n: 1, d: s.hands.d } : s[sel.from][sel.i];
    if (!e) { sel = null; return; }
    const it = D.ITEMS[e.k], btns = [];
    const done = msg => { sel = null; Game.save(); renderHome(); if (msg) toast(msg, 1.4); };
    if (sel.from === 'pack') btns.push(['To stash', () => { const n = addTo(s.stash, STASH_SLOTS, e.k, e.n, e.d); if (!n) return toast('Stash is full', 1.4); e.n -= n; if (!e.n) s.pack.splice(sel.i, 1); done(); }]);
    if (sel.from === 'stash') btns.push(['To pack', () => { const n = addTo(s.pack, packSlots(), e.k, e.n, e.d); if (!n) return toast('Pack is full', 1.4); e.n -= n; if (!e.n) s.stash.splice(sel.i, 1); done(); }]);
    if (sel.from === 'hands') btns.push(['Unequip', () => { if (!addTo(s.pack, packSlots(), e.k, 1, e.d) && !addTo(s.stash, STASH_SLOTS, e.k, 1, e.d)) return toast('No room', 1.4); s.hands = null; done(); }]);
    if (it.w && sel.from !== 'hands') btns.push(['Equip', () => { const cur = s.hands; s.hands = { k: e.k, d: e.d }; s[sel.from].splice(sel.i, 1); if (cur) addTo(s.pack, packSlots(), cur.k, 1, cur.d) || addTo(s.stash, STASH_SLOTS, cur.k, 1, cur.d); done('Equipped ' + it.n.toLowerCase()); }]);
    if (it.w) {
      const cost = s.job === 'mechanic' ? 1 : 2, max = D.WEAPONS[it.w].dur;
      if (e.d < max) btns.push([`Repair (${cost} scrap)`, () => {
        const have = s.pack.concat(s.stash).filter(x => x.k === 'scrap').reduce((a, x) => a + x.n, 0);
        if (have < cost) return toast(`Needs ${cost} scrap metal`, 1.6);
        let need = cost; for (const list of [s.stash, s.pack]) for (let j = list.length - 1; j >= 0 && need; j--) if (list[j].k === 'scrap') { const t = Math.min(need, list[j].n); list[j].n -= t; need -= t; if (!list[j].n) list.splice(j, 1); }
        const nd = Math.min(max, e.d + Math.round(max * .4));
        if (sel.from === 'hands') s.hands.d = nd; else e.d = nd;
        done('Repaired');
      }]);
    }
    if (it.use && it.use !== 'Read' && (it.hp || it.sta) && !it.slots) btns.push([it.use, () => { s.hp = Math.min(maxHp(s), s.hp + (it.hp || 0)); e.n--; if (!e.n) s[sel.from].splice(sel.i, 1); done(`${it.n}: +${it.hp || 0} HP`); }]);
    if (it.slots || it.bp || e.k === 'shoes' || e.k === 'lockset') btns.push([it.use, () => { const msg = Game.applyUse(e.k); if (!msg) return; e.n--; if (!e.n) s[sel.from].splice(sel.i, 1); done(msg); }]);
    if (e.k === 'note') btns.push(['Read', () => toast('The note is too faded to make sense of here.', 2)]);
    acts.innerHTML = `<div class="sact"><span><b>${it.n}</b>${e.n > 1 ? ' x' + e.n : ''}${it.tag ? ` <em>${it.tag}</em>` : ''}</span></div>`;
    const row = acts.firstChild;
    btns.forEach(([t, fn], i) => { const b = document.createElement('button'); b.className = 'mbtn sm' + (i ? ' ghost' : ''); b.textContent = t; b.onclick = () => { SFX.play('pick'); fn(); }; row.appendChild(b); });
  }

  // ---- settings: export / import / reset
  function sheetOpen(html) { const el = $('#msheet'); el.innerHTML = `<div class="mcard">${html}</div>`; el.classList.add('on'); el.onclick = e => { if (e.target === el) el.classList.remove('on'); }; }
  const sheetClose = () => $('#msheet').classList.remove('on');
  function openSettings() {
    sheetOpen(`<div class="kick">Settings</div><h3>Save</h3>
      <p class="mp">Your survivor, stash and today's houses are saved on this phone. Copy the text below to keep a backup, or paste one to restore.</p>
      <textarea id="mExp" readonly>${esc(JSON.stringify(SV))}</textarea>
      <div class="btnrow"><button class="mbtn sm" id="mCopy">Copy</button></div>
      <textarea id="mImp" placeholder="Paste a backup here"></textarea>
      <div class="btnrow"><button class="mbtn sm" id="mLoad">Load backup</button><button class="mbtn sm ghost" id="mClose">Close</button></div>
      <div class="btnrow"><button class="mbtn sm" id="mAcc">Account &amp; friends</button></div>
      <div class="mp dim">${esc(syncText())}</div>`);
    $('#mAcc').onclick = () => { sheetClose(); openAccount(); };
    $('#mCopy').onclick = () => { const t = $('#mExp'); t.select(); try { navigator.clipboard.writeText(t.value); } catch (e) { document.execCommand('copy'); } toast('Copied', 1); };
    $('#mLoad').onclick = () => {
      try { const v = JSON.parse($('#mImp').value); if (!v || v.v !== VER || !('houses' in v)) throw new Error('not a Dead Miles save'); SV = v; DM.S = SV.survivor; Game.save(); sheetClose(); boot2(); toast('Backup loaded', 1.6); }
      catch (e) { toast('That does not look like a save: ' + e.message, 2.4); }
    };
    $('#mClose').onclick = sheetClose;
  }
  function openDev() {
    sheetOpen(`<div class="kick">Developer</div><h3>Test panel</h3>
      <div class="devgrid"><button class="mbtn sm" data-d="s1">+1,000 steps</button><button class="mbtn sm" data-d="s5">+5,000 steps</button>
      <button class="mbtn sm" data-d="day">New day</button><button class="mbtn sm" data-d="heal">Full heal</button>
      <button class="mbtn sm" data-d="ev">Thanksgiving: ${D.EVENT ? 'on' : 'off'}</button><button class="mbtn sm" data-d="q20">+20 quests done</button>
      <button class="mbtn sm" data-d="caps">+100 caps</button><button class="mbtn sm" data-d="mats">+materials</button><button class="mbtn sm ghost" data-d="reset">Reset save</button></div>
      <div class="btnrow"><button class="mbtn sm ghost" id="mClose">Close</button></div>`);
    $('#msheet').querySelectorAll('[data-d]').forEach(b => b.onclick = () => {
      const k = b.dataset.d;
      if (k === 's1') DM.addSteps(1000, 'phone'); if (k === 's5') DM.addSteps(5000, 'phone');
      if (k === 'day') devNewDay();
      if (k === 'heal') { SV.survivor.hp = maxHp(SV.survivor); Game.save(); renderHome(); }
      if (k === 'q20') { SV.trader.completed += 20; refreshTrader(true); Game.save(); renderHome(); toast('Trader level ' + traderLevel(), 1.6); }
      if (k === 'caps') { SV.trader.caps += 100; Game.save(); renderHome(); }
      if (k === 'mats') { for (const [m, n] of [['scrap', 10], ['cloth', 6], ['tape', 3], ['wood', 4], ['nails', 12]]) addTo(SV.survivor.stash, STASH_SLOTS, m, n); Game.save(); renderHome(); }
      if (k === 'ev') { location.search = D.EVENT ? '' : '?event=thanksgiving'; }
      if (k === 'reset') { if (b.dataset.sure) { try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ } SV = fresh(); DM.S = null; sheetClose(); boot2(); return; } b.dataset.sure = 1; b.textContent = 'Tap again to wipe'; return; }
      openDev();
    });
    $('#mClose').onclick = sheetClose;
  }

  // ---------------------------------------------------------------- boot
  function boot2() {
    rollDay();
    if (!SV.survivor) { cre = { name: '', look: 0, job: 'scavenger' }; E.buildSurvivor(0).then(renderCreate); return; }
    DM.S = SV.survivor;
    E.buildSurvivor(SV.survivor.look).then(renderHome);
  }
  Game.renderHome = renderHome;

  // ---------------------------------------------------------------- online layer (net.js). Everything here must fail quietly offline.
  const ago = t => { if (!t) return ''; const sec = Math.max(0, (Date.now() - t) / 1000); return sec < 60 ? 'just now' : sec < 3600 ? Math.floor(sec / 60) + ' min ago' : sec < 86400 ? Math.floor(sec / 3600) + ' h ago' : Math.floor(sec / 86400) + ' d ago'; };
  function syncText() {
    const N = window.NET;
    if (!N) return 'Saved on this phone';
    if (N.conflict) return 'Two saves disagree - open Account to pick one';
    switch (N.status) {
      case 'online': { let dirty = false; try { const r = JSON.parse(localStorage.getItem(KEY) || '{}'); dirty = !!r.dirty; } catch (e) { /* ignore */ }
        return dirty ? 'Syncing...' : 'Synced ' + (ago(N.lastSave || N.lastPull) || 'just now') + (N.handle ? ' · @' + N.handle : ''); }
      case 'checking': return 'Connecting...';
      case 'bad-key': return 'Account key out of date - saved on this phone';
      case 'signed-out': return 'Not signed in - saved on this phone';
      default: return 'Offline - saved on this phone';
    }
  }
  function updateSync() { const el = document.getElementById('msync'); if (el) { el.textContent = syncText(); el.className = 'msync ' + ((window.NET && NET.status) || 'local'); } }
  window.addEventListener('net:change', updateSync);
  setInterval(updateSync, 30000);
  function openAccount() { if (window.NET && NET.openPanel) { try { NET.openPanel(); } catch (e) { toast('Account panel failed to open', 1.6); } } else toast('Online features are not loaded', 1.6); }
  const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
  const sig = st => st && st.survivor ? [st.survivor.name, st.survivor.job, (st.stats || {}).runs, Math.round(st.survivor.xp), (st.trader || {}).completed || 0, (st.survivor.stash || []).length].join('|') : '';
  function adoptState(st) {
    SV = migrate(st); DM.S = SV.survivor; rollDay();
    if (!DM.scene) boot2();
    toast('Loaded the cloud save', 1.6);
  }
  function chooseSave(local, remote) {
    return new Promise(res => {
      const line = st => st && st.survivor ? `${esc(st.survivor.name)} · ${D.JOBS[st.survivor.job].n} · Lv ${D.scavLvl(st.survivor.xp)} · ${(st.stats || {}).runs || 0} runs${st.savedAt ? ' · saved ' + ago(st.savedAt) : ''}` : 'no survivor yet';
      sheetOpen(`<div class="kick">Two saves</div><h3>Which one is yours?</h3>
        <p class="mp">This phone and the cloud have different progress. Pick one - the other is replaced.</p>
        <button class="pick" id="pLocal"><b>This phone</b><span>${line(local)}</span></button>
        <button class="pick" id="pCloud"><b>Cloud</b><span>${line(remote)}</span></button>`);
      $('#msheet').onclick = null;
      $('#pLocal').onclick = () => { sheetClose(); res('local'); };
      $('#pCloud').onclick = () => { sheetClose(); res('remote'); };
    });
  }
  async function netStart() {
    const N = window.NET; if (!N) return;
    N.onRemoteAdopted = st => { if (st && st.v === VER) adoptState(st); };
    N.onConflict = ({ local, remote }) => sig(local.state) === sig(remote.state) ? ((remote.at || 0) > (local.at || 0) ? 'remote' : 'local') : chooseSave(local.state, remote.state).then(pick => { if (pick === 'remote' && remote.state) setTimeout(() => adoptState(remote.state), 0); return pick; });
    try { await withTimeout(N.init(), 6000); } catch (e) { /* offline or blocked: the game keeps going on this phone */ }
    try {
      if (N.ok) {
        const cloud = await withTimeout(N.load(), 6000);
        const cs = cloud && cloud.ok && cloud.state && cloud.state.v === VER ? cloud.state : null;
        if (cs) {
          if (!SV.survivor && cs.survivor) adoptState(cs);
          else if (cs.survivor && sig(cs) !== sig(SV)) { if (await chooseSave(SV, cs) === 'remote') adoptState(cs); else Game.save(); }
          else if ((cs.savedAt || 0) > (SV.savedAt || 0)) adoptState(cs);
        }
      }
    } catch (e) { /* offline */ }
    N.onSteps = onNetSteps;   // set only after the save is settled: steps wait in the ledger until then
    publish();
    updateSync();
  }
  function publish() {
    if (!window.NET || !SV.survivor) return;
    const s = SV.survivor;
    try { NET.publish({ name: s.name, level: D.scavLvl(s.xp), job: s.job, scav: Math.round(s.xp), looted: SV.stats.runs, kills: SV.stats.kills, extra: { look: s.look, trader: traderLevel(), quests: SV.trader.completed, secrets: SV.stats.secrets } }); } catch (e) { /* offline */ }
  }
  Game.onLevel = () => publish();
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && SV) { Game.save(); try { window.NET && NET.flush(); } catch (e) { /* ignore */ } } });
  Game.boot = async function () {
    SV = load(); DM.S = SV.survivor;
    await E.start();
    if (D.EVENT) document.body.classList.add('event');
    boot2();
    $('#loading').remove();
    netStart();
    setInterval(() => { if (SV.day.key !== today()) { rollDay(); Game.save(); renderHome(); } }, 60000);
    DM.ready = true;
  };
  Game.boot().catch(e => { console.error(e); const l = $('#loading'); if (l) l.textContent = 'Failed to load: ' + e.message; });
})();
