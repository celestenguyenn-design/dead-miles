/* The test panel hands out free steps, caps and materials, so it never opens on the
   real site where friends play - only on local test copies and the claude.ai preview. */
var DM_DEV_OK = !/github\.io$/i.test(location.hostname);
var IS_IOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
/* Back from the Shortcuts app (?synced=1): pull the steps it just sent, then tidy the address. */
(function () {
  try {
    const q = new URLSearchParams(location.search); if (!q.has('synced')) return;
    const err = q.has('err'); history.replaceState(null, '', location.pathname + location.hash);
    setTimeout(async () => {
      try { if (window.NET && NET.pullSteps) await NET.pullSteps(); } catch (e) { /* offline */ }
      if (window.DM && DM.E && DM.E.toast) DM.E.toast(err ? 'The Shortcut did not finish - open the step sync guide' : 'Steps synced', 2);
    }, 2500);
  } catch (e) { /* ignore */ }
})();
/* Bump with every release: also next/version.txt and the ?v= on the scripts in next/index.html. Phones that see a
   newer version.txt save and reload once, so friends do not wait out the GitHub Pages cache. */
const NEXT_VERSION = '0.19';
/* Dead Miles (next) - meta game: save, character creation, steps -> scouted houses, home screen, pack/stash.
   Steps arrive through ONE function: DM.addSteps(n, src) with src 'phone' | 'typed' | 'walk'.
   DM.onlineState is reserved for the account panel (net.js, written separately). */
'use strict';
(() => {
  const D = DM.D, E = DM.E, $ = E.$, SFX = E.SFX, toast = E.toast;
  const KEY = 'dm-next-save', VER = 1, VERSION = 'next ' + NEXT_VERSION;
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
    v.base = DM.Base.norm(v.base, v);       // phase 4: the base (pool, pieces, garden, decor)
    v.horde = DM.Base.normHorde(v.horde);   // phase 4: horde night (shifts, reports waiting to send, results)
    if (v.survivor) { const s = v.survivor; s.look = ART.LOOK.norm(s.look); if (!s.known) s.known = D.BASIC.concat(s.job === 'hunter' ? ['arrow'] : []); s.packBonus = s.packBonus || 0; }
    v.trader.event = v.trader.event || null;   // phase 5a: Dot's seasonal job chain { key, step, kills, base }
    v.tips = v.tips || {};                  // phase 5: first-time tips already shown
    if (v.survivor) migrateCos(v.survivor);
    if (v.survivor) migrateQuiver(v.survivor);
    if (v.survivor) migrateKeys(v.survivor);
    if (v.survivor) migrateQuality(v.survivor, v);   // 0.19: weapon quality + days played for the gamestage
    if (v.survivor && !v.run0111) { dropNotes(v.survivor); v.run0111 = 1; }   // notes carried home before 0.11.1
    if (v.survivor) DM.Food.norm(v.survivor);   // 0.8: hunger + thirst (older saves start at 80/80, draining from now)
    if (v.survivor) DM.Skills.norm(v.survivor); // 0.13: skill points; old Lv 3/6/9 perks stay as free ranks
    DM.Crew.norm(v);                        // phase 5b: crew + strays (SV.crew, SV.pets)
    DM.Boss.norm(v);                        // phase 5b: the weekly boss (SV.boss)
    // 0.9: houses not started yet move to the v2 generator (walkways, open container fronts, rugs on open floor).
    // A house with a run in progress, quest houses and the tutorial keep their layout, so saved progress lines up.
    for (const h of v.houses || []) if (h.type !== 'tutorial' && !h.quest && !h.run && h.status === 'new' && (h.gv || 1) < GV) {
      try { h.gv = GV; const L = layoutOf(h); Object.assign(h, { address: L.address, danger: L.danger, nLocks: L.nLocks, nZombies: L.nZombies }); } catch (e) { delete h.gv; }
    }
    return v;
  }
  // phase 5: cosmetics live in the wardrobe, not the pack. The 0.4 'Pilgrim hat' pack item (and any stray cosmetic item) moves in.
  function migrateCos(s) {
    const w = s.wardrobe = s.wardrobe || {}; w.own = w.own || {}; w.seen = w.seen || {};
    for (const list of [s.pack || [], s.stash || []]) for (let i = list.length - 1; i >= 0; i--) {
      const it = D.ITEMS[list[i].k], k = it && it.cos; if (!k) continue;
      list.splice(i, 1);
      if (!w.own[k]) { w.own[k] = Date.now(); cosQueue.push({ k, moved: true }); }
    }
    for (const sl in s.look.cos) if (!w.own[s.look.cos[sl]]) delete s.look.cos[sl];   // only what you own can be worn
  }
  // 0.7: the quiver. Arrows in the pack move into it (up to D.QUIVER); they no longer take a pack slot or spill on death.
  function migrateQuiver(s) {
    const q = s.quiver = s.quiver && typeof s.quiver === 'object' ? s.quiver : { n: 0 }; q.n = Math.max(0, Math.min(D.QUIVER, +q.n || 0));
    for (let i = s.pack.length - 1; i >= 0 && q.n < D.QUIVER; i--) if (s.pack[i].k === 'arrow') { const t = Math.min(s.pack[i].n, D.QUIVER - q.n); q.n += t; s.pack[i].n -= t; if (!s.pack[i].n) s.pack.splice(i, 1); }
  }
  // 0.10: the keyring. Brass keys in the pack or stash move onto it; it has no limit, no slot, and is never spilled.
  function migrateKeys(s) {
    s.keys = Math.max(0, +s.keys || 0);
    for (const list of [s.pack || [], s.stash || []]) for (let i = list.length - 1; i >= 0; i--) if (list[i].k === 'key') { s.keys += list[i].n; list.splice(i, 1); }
  }
  // 0.19: weapons from before quality tiers become Worn (quality 2: +8% damage on what they did before, never less).
  // Their max durability grows 15%, so durability left grows with it and the bar shows the same %.
  // The gamestage's "days played" starts at the days since the save was made (capped where it stops counting anyway).
  function migrateQuality(s, v) {
    const fix = e => { if (!e || !D.isWeapon(e.k) || e.q != null) return; e.q = 2; if (e.d != null) e.d = Math.max(1, Math.round(e.d * D.qDurMul(2))); };
    fix(s.hands); for (const list of [s.pack || [], s.stash || []]) list.forEach(fix);
    if (s.gsDays == null) s.gsDays = Math.min(60, Math.max(0, Math.floor((Date.now() - (+v.created || Date.now())) / 864e5)));
  }
  function dropNotes(s) { if (!s) return; for (const k of ['pack', 'stash']) if (Array.isArray(s[k])) s[k] = s[k].filter(e => e.k !== 'note'); }
  function toQuiver(n) { const q = SV.survivor.quiver = SV.survivor.quiver || { n: 0 }, t = Math.max(0, Math.min(n, D.QUIVER - q.n)); q.n += t; return t; }
  const cosQueue = [];   // unlock popups waiting to be shown
  D.cosOwned = () => (SV && SV.survivor && SV.survivor.wardrobe ? SV.survivor.wardrobe.own : {});
  Game.save = function () {
    if (!SV) return;
    SV.savedAt = Date.now();
    if (window.NET) { try { NET.save(SV); } catch (e) { console.warn('NET.save failed', e); } }
    else { try { localStorage.setItem(KEY, JSON.stringify(SV)); } catch (e) { /* storage blocked */ } }
    updateSync();
  };
  Game.data = () => SV;
  Object.defineProperty(Game, 'survivor', { get: () => SV && SV.survivor });

  // ---------------------------------------------------------------- survivor
  const maxHp = s => D.maxHp(s);
  function createSurvivor(name, look, job) {
    const J = D.JOBS[job];
    let xp = 0; try { const v = JSON.parse(localStorage.getItem('dm-next-skills') || '{}'); if (v.scav) xp = +v.scav.xp || 0; } catch (e) { /* none */ }
    const s = { name: name || 'Survivor', look, job, hp: 0, xp, gsDays: 0, pack: [], stash: [], hands: null, quiver: { n: 0 }, packBonus: 0, known: D.BASIC.concat(job === 'hunter' ? ['arrow'] : []), wardrobe: { own: {}, seen: {} } };
    DM.Skills.norm(s); s.hp = maxHp(s); DM.Food.norm(s, true);
    for (const [k, n] of J.kit) {
      if (k === J.hands) { s.hands = { k, d: D.wMax({ k, q: 2 }), q: 2 }; continue; }   // 0.19: the starting kit is Worn
      if (k === 'arrow') { s.quiver = { n: Math.min(D.QUIVER, n) }; continue; }
      addTo(s.pack, 12, k, n, D.isWeapon(k) ? D.wMax({ k, q: 2 }) : undefined, D.isWeapon(k) ? 2 : undefined);
    }
    return s;
  }
  function addTo(list, slots, k, n, d, q) {   // 0.19: q = weapon quality
    const m = D.stackMax(k); let left = n;
    for (const e of list) if (e.k === k && e.n < m && left) { const t = Math.min(left, m - e.n); e.n += t; left -= t; }
    while (left && list.length < slots) { const t = Math.min(left, m); const e = { k, n: t }; if (d != null) e.d = d; if (q != null) e.q = q; list.push(e); left -= t; }
    return n - left;
  }
  const packSlots = () => 12 + (SV.survivor.packBonus || 0) + DM.Skills.packBonus(SV.survivor);   // 0.13: Pack rat is a Scavenging rank

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
    DM.Base.addPool(SV, src === 'typed' ? n * .5 : n);   // build steps: the same steps, they do not take away houses
    DM.Crew.onSteps(src === 'typed' ? n * .5 : n);       // the active pet levels up slowly from your steps
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
    p[src] += n; SV.walked = (SV.walked || 0) + (src === 'typed' ? n * .5 : n); DM.Base.addPool(SV, src === 'typed' ? n * .5 : n); DM.Crew.onSteps(src === 'typed' ? n * .5 : n);
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
  // A one-time correction from NET (steps that were counted twice): take them back from that day.
  function onNetFix(day, back, id) {
    if (!SV || !SV.survivor) return;
    SV.fixes = SV.fixes || {}; if (SV.fixes[id]) return; SV.fixes[id] = 1;
    const d = SV.day.key === day ? SV.day : SV.prevDay && SV.prevDay.key === day ? SV.prevDay : null;
    SV.walked = Math.max(0, (SV.walked || 0) - back);
    if (SV.base) SV.base.pool = Math.max(0, (SV.base.pool || 0) - back);
    if (d) {
      d.phone = Math.max(0, d.phone - back);
      const want = housesFor(worth(effective(d)));
      while (d.scouted > want) {
        let i = -1; for (let j = SV.houses.length - 1; j >= 0; j--) { const h = SV.houses[j]; if (h.day === day && h.status === 'new' && !h.quest && !h.run) { i = j; break; } }
        if (i < 0) break; SV.houses.splice(i, 1); d.scouted--;
      }
    }
    Game.save(); if (!DM.scene) renderHome();
    toast('Step count corrected for ' + day, 2.2);
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
    const L = layoutOf({ type, seed, gv: GV });
    SV.houses.push({ id: 'h' + seq, type, seed, gv: GV, day: day || SV.day.key, status: 'new', address: L.address, danger: L.danger, nLocks: L.nLocks, nZombies: L.nZombies });
  }
  const cache = new Map();
  const GV = 4;   // 0.10: rarer key spots with prizes. 0.9: generator version for newly scouted houses (older houses keep the layout they were scouted with)
  Game.GV = GV;
  function layoutOf(h) {
    const k = h.type + ':' + h.seed + ':' + (h.gv || 1);
    if (!cache.has(k)) cache.set(k, h.type === 'tutorial' ? DM.Gen.tutorial() : DM.Gen.generate(h.type, h.seed, { gv: h.gv || 1 }));
    const L = cache.get(k);
    if (h.landmark && h.address) { L.address = h.address; const m = /\b(\d{1,4})\b/.exec(h.address); if (m) L.houseNum = +m[1]; }   // 0.9: a real place keeps its real name (and number)
    return L;
  }
  // ---- 0.9: landmark houses from the real-world map (map.js). Only the type, name/street and a seed are kept -
  // never a coordinate or an OpenStreetMap id (the dedupe key is a salted hash).
  const LM_DAY = 3;
  function lmState() { const m = SV.map = SV.map || { day: '', n: 0, ids: [] }; if (m.day !== SV.day.key) { m.day = SV.day.key; m.n = 0; } m.ids = m.ids || []; return m; }
  Game.landmarkKey = raw => String(D.hashStr(SV.seedBase + ':lm:' + raw));
  Game.landmarkLeft = () => { rollDay(); return Math.max(0, LM_DAY - lmState().n); };
  Game.landmarkHave = key => lmState().ids.includes(key);
  Game.addLandmark = pl => {   // pl: { key, type, name, street }
    rollDay(); const m = lmState();
    if (m.ids.includes(pl.key)) return 'dup';
    if (m.n >= LM_DAY) return 'cap';
    if (!D.BTYPES[pl.type] || !D.BTYPES[pl.type].w) return 'bad';
    const seq = SV.houseSeq++, seed = D.hashStr(SV.seedBase + ':lmh:' + pl.key);
    const name = String(pl.name || D.BTYPES[pl.type].n).slice(0, 40), street = String(pl.street || '').slice(0, 40);
    const h = { id: 'lm' + seq, type: pl.type, seed, gv: GV, day: SV.day.key, status: 'new', landmark: 1, address: name + (street && street !== name ? ' · ' + street : '') };
    const L = layoutOf(h); Object.assign(h, { danger: L.danger, nLocks: L.nLocks, nZombies: L.nZombies });
    SV.houses.push(h); m.n++; m.ids.push(pl.key); if (m.ids.length > 300) m.ids.splice(0, m.ids.length - 300);
    Game.save(); if (!DM.scene) renderHome();
    return 'ok';
  };
  Game.layoutOf = layoutOf;
  function rollDay(force) {
    const t = today();
    if (SV.day.key === t && !force) return;
    const days = Math.max(1, dayNum(t) - dayNum(SV.day.key));
    const s = SV.survivor;
    if (s && s.food) s.hp = DM.Food.tick(s, s.hp);   // catch hunger/thirst up to now first
    if (s && !DM.Food.hungry(s)) s.hp = Math.min(maxHp(s), s.hp + 25 * days); // rest heals a little each day (not on an empty stomach)
    SV.prevDay = days === 1 ? SV.day : null;
    if (s) s.gsDays = (+s.gsDays || 0) + 1;   // 0.19: days played (one per day the game is opened, not per day away) for the gamestage
    SV.day = { key: t, phone: 0, typed: 0, walk: 0, scouted: 0 };
    // unlooted houses last 3 days; finished ones are cleared from the list; quest houses stay while the quest is open
    SV.houses = SV.houses.filter(h => h.quest ? questById(h.quest) && h.status !== 'looted' : h.status === 'new' && dayNum(t) - dayNum(h.day) < 3);
    if (s) DM.Crew.morning(days);   // phase 5b: the crew eats, the medic heals, the gardener waters, pets come home
    DM.Boss.roll();
  }
  function devNewDay() { // pretend a day passed: shift every date back one day, then roll over
    SV.day.key = keyOf(dayNum(SV.day.key) - 1);
    for (const h of SV.houses) if (!h.quest) h.day = keyOf(dayNum(h.day) - 1);
    rollDay(true); Game.save(); renderHome(); toast('A new day', 1.4);
  }

  // ---------------------------------------------------------------- crew auto-search: instant, ~35-60% of the loot (more with a bigger crew), never secrets
  function autoSearch(h) {
    const L = layoutOf(h), rnd = D.mulberry32(h.seed ^ 0x5bd1e995);
    const got = [], share = DM.Crew.autoShare(), skip = DM.Crew.lockSkip(), n = SV.crew.list.length;
    for (const f of L.furn) {
      if (!f.loot || f.secretLoot || f.keyLock || f.keyRoom) continue;   // 0.8: the crew has no brass key
      if (f.lock && rnd() < skip) continue; // the crew skips some of the locked stuff (scavengers fewer)
      for (const k of D.rollLoot(f.loot, rnd)) if (rnd() < share) got.push(k);
    }
    DM.Crew.onTask('scavenger', 2);
    const stacks = D.toStacks(got, rnd, { base: D.qBaseFor(h.danger || 1), bonus: D.gsFx(gamestage().gs).qBonus }), lost = [];   // 0.19: quality by danger + gamestage
    for (const e of stacks) { if (D.ITEMS[e.k].cos) { Game.unlockCos(e.k); continue; } if (e.k === 'arrow') { e.n -= toQuiver(e.n); if (!e.n) continue; } const n = addTo(SV.survivor.stash, STASH_SLOTS, e.k, e.n, e.d, e.q); if (n < e.n) lost.push({ k: e.k, n: e.n - n }); else Game.onWeaponLoot(e.k, false, e.q); }
    h.status = 'auto'; SV.stats.auto++;
    DM.Skills.addXP(3);
    Game.save();
    showResult(L.name + ' · ' + L.address, stacks, lost, `Everything went to your stash. ${n ? `Your crew of ${n} brought back about ${Math.round(share * 100)}% of what was there` : `With no crew yet, a couple of neighbours helped: about ${Math.round(share * 100)}% of what was there`} - and never the hidden compartments.`);
    renderHome();
  }

  // ---------------------------------------------------------------- runs
  function loot(h) {
    if (SV.survivor.hp < 15) { toast('Too hurt to go in. Eat or patch up first.', 2.2); return; }
    const L = Object.assign({}, layoutOf(h), { id: h.id });
    const q = h.quest && questById(h.quest);
    if (q && q.type === 'fetch' && !q.done) { // plant Dot's lockbox in one container of this house
      L.furn = L.furn.map(f => Object.assign({}, f));
      const cs = L.furn.filter(f => f.loot && !f.secretLoot && !f.lock && !f.keyRoom && f.room !== 'o');
      const f = cs[D.hashStr(q.id) % cs.length]; f.extra = (f.extra || []).concat('parcel'); f.noEmpty = 1;
    }
    if ((h.type === 'mansion' || h.type === 'apt') && !q) { // decor turns up more often in mansions and apartments
      const rnd = D.mulberry32(h.seed ^ 0x2c1b3c6d), cs = L.furn.filter(f => f.loot && !f.secretLoot && f.room !== 'o');
      if (cs.length && rnd() < (h.type === 'mansion' ? .75 : .45)) {
        L.furn = L.furn.map(f => Object.assign({}, f));
        const ks = Object.keys(D.DECOR), f = L.furn.filter(f => f.loot && !f.secretLoot && f.room !== 'o')[Math.floor(rnd() * cs.length)];
        f.extra = (f.extra || []).concat(ks[Math.floor(rnd() * ks.length)]); f.noEmpty = 1;
      }
    }
    if ((h.type === 'mansion' || h.type === 'police') && !q) { // cosmetics: mansions and police stations are the best places to look
      const rnd = D.mulberry32(h.seed ^ 0x51ed270b), cs = L.furn.filter(f => f.loot && !f.secretLoot && f.room !== 'o');
      if (cs.length && rnd() < (h.type === 'mansion' ? .25 : .15)) {
        const f = cs[Math.floor(rnd() * cs.length)], i = L.furn.indexOf(f);
        L.furn = L.furn.slice(); L.furn[i] = Object.assign({}, f, { extra: (f.extra || []).concat(D.pickCos([h.type], rnd)), noEmpty: 1 });
      }
    }
    // 0.19: the gamestage is snapshotted on the house when the run starts and reused on resume, so a resumed run meets the
    // same zombies. A run started before 0.19 has none: it resumes at gamestage 0 (exactly the zombies it had). Tutorial: none.
    if (h.type === 'tutorial') h.gs = 0;
    else if (h.run && h.gs == null) h.gs = 0;
    else if (!h.run || h.gs == null) h.gs = gamestage().gs;
    L.gs = h.gs;
    SV.stats.runs++; Game.save();
    hideMenu();
    const hide = h.daily ? {} : DM.Crew.forHouse(h, L);   // phase 5b: a survivor hiding in a closet, a stray under the furniture (rare). 0.18: never in the daily house
    // 0.18 DAILY CHALLENGE (daily.js): seeded loot rolls, no raid, no event mini-boss, the score tally (house.js G.dly)
    const daily = h.daily ? { lootSeed: h.seed, daily: { scored: !!(SV.daily && SV.daily.res) }, noRaid: true, noBoss: true } : {};
    DM.House.start(L, DM.Crew.wrap(Object.assign(daily, {
      hint: h.daily ? (h.run ? `Daily challenge · back at ${L.address}` : `Daily challenge · ${L.name} · ${L.address}`) : h.type === 'tutorial' ? (SV.tutorialRun ? 'Back at 14 Halsey St - picking up where you left off' : 'Joystick to move  ·  SEARCH near furniture') : (h.run ? `Back at ${L.address} - picking up where you left off` : `${L.name} · ${L.address}`),
      resume: (h.type === 'tutorial' ? SV.tutorialRun : h.run) || null,
      raid: h.type !== 'tutorial' && !h.daily,   // 0.15: a rare raid can happen (raiders.js decides, seeded from the house)   // the tutorial card is rebuilt each render, so its progress lives on SV
      onState: st => { if (h.type === 'tutorial') SV.tutorialRun = st; else h.run = st; Game.save(); },
      onExit: res => {
        if (h.daily) {   // 0.18: the daily house keeps its run state (re-entry is for fun); the first exit is scored
          dropNotes(SV.survivor);
          SV.stats.kills += res.kills; SV.stats.secrets += res.secrets; if (res.kind === 'down') SV.stats.downs++;
          Game.save(); publish(); showMenu(); tab('houses'); renderHome();
          DM.Daily.onExit(h, res); return;
        }
        delete h.run; delete SV.tutorialRun; delete h.gs;   // 0.19: the next run takes a fresh gamestage
        dropNotes(SV.survivor);   // 0.11.1: a torn note only makes sense inside its house - it is gone once she leaves
        h.status = q && !q.done ? 'new' : 'looted'; if (h.type === 'tutorial') SV.tutorialDone = true;
        SV.stats.kills += res.kills; SV.stats.secrets += res.secrets; if (res.kind === 'down') SV.stats.downs++;
        if (q && q.type === 'clear' && res.zombies.total && res.zombies.dead >= res.zombies.total) questDone(q);
        checkFetch(); if (q && q.done) h.status = 'looted';
        Game.save(); publish(); showMenu(); tab('houses'); renderHome();
        toast(res.kind === 'down' ? 'You made it home. Barely.' : `Home safe from ${res.address}`, 2.4);
      },
    }), 'house', { hide }));
  }
  Game.loot = loot;   // 0.18: daily.js starts the daily house through the normal run
  // after a boss fight (boss.js)
  Game.hideMenu = () => hideMenu();
  Game.afterRun = function (res) {
    SV.stats.kills += Math.max(0, res.kills - (res.boss ? 1 : 0)); if (res.kind === 'down') SV.stats.downs++;
    Game.save(); publish(); showMenu(); renderHome();
  };

  // ---------------------------------------------------------------- trader: Auntie Dot, quests, shop, crafting
  const traderLevel = () => Math.min(5, 1 + Math.floor((SV.trader.completed || 0) / 20));
  const questById = id => SV.trader.active.find(q => q.id === id) || null;
  const countItem = k => SV.survivor.pack.concat(SV.survivor.stash).filter(e => e.k === k).reduce((a, e) => a + e.n, 0) + (k === 'arrow' && SV.survivor.quiver ? SV.survivor.quiver.n : 0) + (k === 'key' ? +SV.survivor.keys || 0 : 0);
  function takeItems(k, n) { // stash first, then pack; returns removed entries (weapons keep durability)
    const out = [];
    for (const list of [SV.survivor.stash, SV.survivor.pack]) for (let i = list.length - 1; i >= 0 && n > 0; i--) if (list[i].k === k) { const t = Math.min(n, list[i].n); list[i].n -= t; n -= t; out.push({ k, n: t, d: list[i].d, q: list[i].q }); if (!list[i].n) list.splice(i, 1); }
    if (k === 'arrow' && n > 0 && SV.survivor.quiver) { const t = Math.min(n, SV.survivor.quiver.n); SV.survivor.quiver.n -= t; if (t) out.push({ k, n: t }); }
    if (k === 'key' && n > 0 && SV.survivor.keys > 0) { const t = Math.min(n, SV.survivor.keys); SV.survivor.keys -= t; out.push({ k, n: t }); }
    return out;
  }
  function give(k, n, d, q) { // into the pack if it fits, the rest to the stash; returns what did not fit anywhere (0.19: q = weapon quality)
    if (D.ITEMS[k] && D.ITEMS[k].cos) { Game.unlockCos(k); return 0; }
    if (k === 'arrow') { n -= toQuiver(n); if (!n) return 0; }   // arrows: the quiver first
    if (k === 'key') { SV.survivor.keys = (+SV.survivor.keys || 0) + n; return 0; }   // keys: the keyring
    if (D.isWeapon(k)) { if (q == null) q = 2; if (d == null) d = D.wMax({ k, q }); }   // 0.19: a weapon without a quality is Worn
    let got = addTo(SV.survivor.pack, packSlots(), k, n, d, q); if (got < n) got += addTo(SV.survivor.stash, STASH_SLOTS, k, n - got, d, q);
    return n - got;
  }
  function canGive(items, remove = []) { // dry run of give() on copies: does everything fit in pack + stash?
    const pk = SV.survivor.pack.map(e => Object.assign({}, e)), st = SV.survivor.stash.map(e => Object.assign({}, e));
    for (let [k, n] of remove) for (const list of [st, pk]) for (let i = list.length - 1; i >= 0 && n > 0; i--) if (list[i].k === k) { const t = Math.min(n, list[i].n); list[i].n -= t; n -= t; if (!list[i].n) list.splice(i, 1); }
    let qroom = Math.max(0, D.QUIVER - ((SV.survivor.quiver || {}).n || 0));
    for (let [k, n] of items) { if (k === 'key') continue; if (k === 'arrow') { const t = Math.min(n, qroom); qroom -= t; n -= t; if (!n) continue; } let got = addTo(pk, packSlots(), k, n, D.isWeapon(k) ? 1 : undefined); if (got < n) got += addTo(st, STASH_SLOTS, k, n - got, D.isWeapon(k) ? 1 : undefined); if (got < n) return false; }
    return true;
  }
  Game.canGive = canGive;
  Object.assign(Game, { countItem: k => countItem(k), takeItems: (k, n) => takeItems(k, n), give: (k, n, d, q) => give(k, n, d, q) });
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
      const sq = D.isWeapon(k) ? (L >= 3 && rnd() < .4 ? 3 : 2) : null;   // 0.19: Dot's weapons are Worn, sometimes Solid from trader level 3
      T.stock.push({ k, n, price: Math.max(1, Math.round(price * (1 - .04 * (L - 1)) * (sq === 3 ? 1.3 : 1))), left: k0 === 'backpack' || k.startsWith('bp_') || D.isWeapon(k) ? 1 : 2, ...(sq ? { q: sq } : {}) });
    }
    // cosmetics on the back shelf: Dot's own line unlocks with trader level, plus now and then something she found
    const own = SV.survivor ? SV.survivor.wardrobe.own : {}, mine = Object.keys(D.COS).filter(c => D.COS[c].src === 'trader' && D.COS[c].lv <= L && !own[c]);
    if (mine.length) { const c = mine[Math.floor(rnd() * mine.length)]; T.stock.push({ k: 'cos_' + c, n: 1, price: D.RARITY[D.COS[c].r].price, left: 1 }); }
    if (L >= 2 && rnd() < .35) { const c = cosOf(D.pickCos([], rnd)); if (!own[c] && !T.stock.some(e => e.k === 'cos_' + c)) T.stock.push({ k: 'cos_' + c, n: 1, price: D.RARITY[D.COS[c].r].price, left: 1 }); }
    T.day = day;
  }
  function makeQuest(type, tier, rnd) {
    const T = SV.trader, Q = D.QUESTS[type];
    const q = { id: 'q' + (T.seq = (T.seq || 0) + 1), type, tier, have: 0, need: Q.need(tier), done: false };
    if (type === 'supply') { const pool = ['water', 'beans', 'bandage', 'cloth', 'scrap', 'battery', 'tape', 'wood']; q.item = pool[Math.floor(rnd() * pool.length)]; if (q.item === 'scrap' || q.item === 'wood') q.need *= 2; }
    if (type === 'clear' || type === 'fetch') {
      const types = D.QUEST_HOUSE[tier]; q.htype = types[Math.floor(rnd() * types.length)];
      q.seed = D.hashStr(SV.seedBase + ':' + q.id); q.away = Math.round((800 + tier * 900 + rnd() * 600) / 100) * 100;
      q.gv = GV; q.addr = layoutOf({ type: q.htype, seed: q.seed, gv: GV }).address;
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
      SV.houses.push({ id: 'q-' + q.id, quest: q.id, type: q.htype, seed: q.seed, gv: q.gv || 1, day: SV.day.key, status: 'far', address: q.addr, danger: D.BTYPES[q.htype].danger, ...(() => { const L = layoutOf({ type: q.htype, seed: q.seed, gv: q.gv || 1 }); return { nLocks: L.nLocks, nZombies: L.nZombies }; })() });
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
  Game.onKill = z => { if (!SV || !SV.trader || z.kind === 'wboss') return; if (EVS.isBoss(z)) { evKill(z.kind); return; } bump('hunt'); };
  Game.onSecret = () => { if (SV && SV.trader) bump('secrets'); };
  function checkFetch() { for (const q of SV.trader.active) if (q.type === 'fetch' && !q.done && countItem('parcel')) questDone(q); }
  const supplyReady = q => q.type === 'supply' && countItem(q.item) >= q.need;
  Game.questChip = function () { // small HUD chip during runs
    if (!SV || !SV.trader) return '';
    const eq = evQuest(), est = eq && evState();
    const evc = eq ? (evReady(eq, est) ? `<b>${esc(eq.n)}</b> done` : eq.kills ? `<b>${esc(eq.n)}</b> ${Math.max(0, est.kills - est.base)}/${eq.kills}` : `<b>${esc(eq.n)}</b> ${eq.give.map(([k, n]) => `${({ cranberry: 'cranberry', stuffing: 'stuffing', gift: 'gifts', pie: 'pies' })[k] || D.ITEMS[k].n.split(' ').pop().toLowerCase()} ${Math.min(n, countItem(k))}/${n}`).join(' ')}`) : '';
    if (!SV.trader.active.length) return evc;
    const hid = DM.House.L && DM.House.L.id;
    return (evc ? evc + '<i></i>' : '') + SV.trader.active.map(q => {
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
    // now and then Dot throws in a cosmetic option (her quest line; the harvest scarf during Thanksgiving)
    const own = SV.survivor.wardrobe.own, rc = D.mulberry32(D.hashStr(q.id + ':cos'));
    const pool = Object.keys(D.COS).filter(c => !own[c] && (D.COS[c].src === 'quest' || (D.EVENT && c === 'harvest')));
    if (pool.length && (t >= 2 || D.EVENT) && rc() < .3 + .1 * t + (D.EVENT ? .2 : 0)) opts.push({ n: 'Cosmetic', cos: pool[Math.floor(rc() * pool.length)], items: [] });
    return opts;
  }
  function turnIn(q, opt) {
    const T = SV.trader;
    if (q.type === 'supply') takeItems(q.item, q.need);
    if (q.type === 'fetch') takeItems('parcel', 1);
    for (const [k, n] of opt.items) give(k, n);   // 0.19: give() makes weapons Worn at full durability
    if (opt.cos) Game.unlockCos('cos_' + opt.cos);
    T.caps += q.reward.caps; DM.Skills.addXP(q.reward.xp);
    T.active = T.active.filter(x => x !== q);
    SV.houses = SV.houses.filter(h => h.quest !== q.id);
    const lv0 = traderLevel(); T.completed++;
    if (traderLevel() > lv0) { refreshTrader(true); toast(`Trader level ${traderLevel()}! Better stock, tier ${traderLevel()} jobs`, 3); }
    else toast(`+${q.reward.caps} caps · ${opt.n}`, 2);
    Game.save(); publish();
  }

  // ---- Dot's seasonal job chain (events.js): one job at a time, on top of the normal two; resets each event/year
  const EVS = DM.Events, EVA = D.EV;
  function evState() {
    if (!EVA || !EVA.ev.quests || !SV || !SV.trader) return null;
    const key = EVA.id + '-' + EVA.y, T = SV.trader;
    if (!T.event || T.event.key !== key) T.event = { key, step: 0, kills: 0, base: 0 };
    return T.event;
  }
  function evQuest() { const st = evState(); return (st && EVA.ev.quests[st.step]) || null; }
  const evReady = (q, st) => q.kills ? st.kills - st.base >= q.kills : q.give.every(([k, n]) => countItem(k) >= n);
  function evKill(kind) {
    const st = evState(); if (!st || !EVA.ev.boss || EVA.ev.boss.kind !== kind) return;
    st.kills++; const q = evQuest(); if (q && q.kills && st.kills - st.base === q.kills) { toast(`${q.n} done - go see Dot`, 2.6); SFX.play('pick'); }
    Game.save();
  }
  function evTurnIn() {
    const st = evState(), q = evQuest(); if (!q || !evReady(q, st)) return;
    const items = q.items || [], take = q.give || [];
    if (!canGive(items, take)) { toast('Make room in your pack or stash first', 1.8); return; }
    for (const [k, n] of take) takeItems(k, n);
    for (const [k, n] of items) give(k, n);   // 0.19: weapons Worn, full durability
    const T = SV.trader, lv0 = traderLevel();
    T.caps += q.caps; T.completed++; st.step++; st.base = st.kills;
    SFX.play('pick');
    if (traderLevel() > lv0) { refreshTrader(true); toast(`Trader level ${traderLevel()}! Better stock, tier ${traderLevel()} jobs`, 3); }
    else toast(`+${q.caps} caps · ${q.n} done`, 2.2);
    if (q.cos) Game.unlockCos('cos_' + q.cos);
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

  // ---------------------------------------------------------------- cosmetics: unlocks, the "wear it now?" popup
  const RCOL = { c: '#9d90bf', r: '#3fa7a0', e: '#b98cf0', l: '#e0b94a' };
  const cosOf = k => { const it = D.ITEMS[k]; return it && it.cos ? it.cos : D.COS[k] ? k : null; };
  // k: an item key ('cos_beanie', or the old 'hat') or a cosmetic key. Returns true if it was new.
  Game.unlockCos = function (k) {
    const c = cosOf(k); if (!c || !SV || !SV.survivor) return false;
    const w = SV.survivor.wardrobe, C = D.COS[c];
    if (w.own[c]) {   // a duplicate: Dot buys the spare
      const caps = D.RARITY[C.r].caps; SV.trader.caps += caps; Game.save();
      toast(`Spare ${C.n.toLowerCase()} - Dot pays ${caps} caps for it`, 2.2); return false;
    }
    w.own[c] = Date.now(); Game.save(); publish();
    cosQueue.push({ k: c }); showCosPop();
    return true;
  };
  Game.hasCos = c => !!(SV && SV.survivor && SV.survivor.wardrobe.own[c]);
  let cosPopOn = false, pausedByPop = false;
  function cosPopEl() { let el = document.getElementById('cospop'); if (!el) { el = document.createElement('div'); el.id = 'cospop'; $('#app').appendChild(el); } return el; }
  function showCosPop() {
    if (cosPopOn || !cosQueue.length || !SV || !SV.survivor) return;
    const { k, moved } = cosQueue.shift(), C = D.COS[k], R = D.RARITY[C.r], s = SV.survivor;
    cosPopOn = true;
    const G = DM.House && DM.House.G; if (DM.scene && G && !G.over && !G.paused) { G.paused = true; pausedByPop = true; }
    const el = cosPopEl();
    el.innerHTML = `<div class="cpcard r-${C.r}" style="--rc:${RCOL[C.r]}"><div class="cpburst"></div>
      <div class="kick">${moved ? 'Moved to your wardrobe' : 'New cosmetic unlocked!'}</div>
      <img class="cpimg" alt="" src="${ART.iconURL['cos_' + k]}"><div class="cpname">${esc(C.n)}</div>
      <div class="cprar">${R.n} · ${D.COS_SLOTS.find(x => x[0] === C.slot)[1].toLowerCase()}</div>
      <p class="mp">${moved ? 'Cosmetics don\'t take pack space any more - they live in the Wardrobe.' : 'Cosmetics go straight to your Wardrobe. They never take a pack slot.'} Wear it now?</p>
      <div class="btnrow"><button class="mbtn ghost" id="cpLater">Later</button><button class="mbtn" id="cpWear">Wear</button></div></div>`;
    el.classList.add('on');
    if (SFX.ac) [659, 784, 988, 1318].forEach((f, i) => SFX.tone('triangle', f, f * 1.01, .22, .06, i * .08));
    const close = () => {
      el.classList.remove('on'); cosPopOn = false;
      if (pausedByPop) { const G2 = DM.House && DM.House.G; if (G2 && !G2.over) G2.paused = false; pausedByPop = false; }
      if (cosQueue.length) setTimeout(showCosPop, 250); else tip('cosmetic');
      if (!DM.scene) renderHomeIfShown();
    };
    $('#cpLater').onclick = () => { SFX.play('ui'); close(); };
    $('#cpWear').onclick = async () => {
      SFX.play('pick'); s.look.cos[C.slot] = k; s.wardrobe.seen[k] = 1;
      if (cre && creEdit) cre.look.cos[C.slot] = k;
      Game.save(); publish(); await E.buildSurvivor(creEdit ? cre.look : s.look); close();
      toast(`Wearing the ${C.n.toLowerCase()}`, 1.4);
    };
  }
  const renderHomeIfShown = () => { if (!$('#menu').classList.contains('off') && $('#menu').className === '') renderHome(); };
  const newCos = () => { const w = SV.survivor.wardrobe; return Object.keys(w.own).filter(k => !w.seen[k] && D.COS[k]).length; };

  // ---------------------------------------------------------------- weapons: "better weapon found"
  // 0.19: wDmg takes a key (Worn, as before 0.19) or an entry { k, q }; damage includes quality
  const wDmg = k => k && typeof k === 'object' ? D.wDmg(k) : k && D.ITEMS[k] && D.ITEMS[k].w ? D.wDmg({ k }) : D.WEAPONS.fists.dmg;
  const handsDmg = () => SV.survivor.hands ? D.wDmg(SV.survivor.hands) : D.WEAPONS.fists.dmg;
  const usable = k => D.ITEMS[k].w !== 'bow' || SV.survivor.job === 'hunter' || countItem('arrow') > 0 || (DM.G && DM.G.pack && DM.G.pack.some(e => e.k === 'arrow'));
  // s.better: the key of the best unequipped weapon found (s.betterQ its quality, 0.19)
  const betterE = s => s.better ? { k: s.better, q: s.betterQ || 2 } : null;
  Game.onWeaponLoot = function (k, inRun, q) {
    if (!SV || !SV.survivor || !D.isWeapon(k)) return;
    const s = SV.survivor, e = { k, q: q || 2 };
    if (wDmg(e) > handsDmg() && usable(k) && (!s.better || wDmg(e) > wDmg(betterE(s)))) {
      s.better = k; s.betterQ = e.q;
      toast(`Better weapon found: ${D.QUAL[e.q].n.toLowerCase()} ${D.ITEMS[k].n.toLowerCase()} - ${inRun ? 'tap Swap, or ' : ''}equip it in Gear`, 3);
    }
    tip('weapon');
  };
  Game.onEquip = () => { const s = SV && SV.survivor; if (s && s.better && handsDmg() >= wDmg(betterE(s))) s.better = null; };
  const betterBadge = () => { const s = SV.survivor; return !!(s.better && wDmg(betterE(s)) > handsDmg() && (countItem(s.better) > 0)); };
  // 0.19: quality label for a weapon entry (stars + tier name, in the tier's colour)
  const qTag = e => { const q = D.qOf(e); return `<small class="qtag q${q}" style="--qc:${D.QUAL[q].c}">${D.qStars(q)} ${D.QUAL[q].n}</small>`; };
  Game.qTag = qTag;
  // 0.19: crafted weapon quality - survivor level and the Combat / Scavenging trees push it up; mostly Worn-Solid, never Rusty
  function craftQuality(rnd = Math.random) {
    const s = SV.survivor, SK = DM.Skills, b = 2 + Math.min(.5, (SK.level(s) - 1) * .02) + .06 * (SK.rank('combat', s) + SK.rank('scav', s)) / 2;
    return Math.max(2, D.rollQuality(Math.min(3.2, b), 0, rnd));
  }
  Game.craftQuality = craftQuality;
  // ---------------------------------------------------------------- 0.19: gamestage (data.js D.gamestage / D.gsFx)
  function bestQ() { const s = SV && SV.survivor; if (!s) return 2; let b = s.hands ? D.qOf(s.hands) : 1; for (const e of (s.pack || []).concat(s.stash || [])) if (D.isWeapon(e.k)) b = Math.max(b, D.qOf(e)); return b; }
  function gamestage() {
    const s = SV && SV.survivor; if (!s) return { gs: 1, lvl: 1, days: 0, bq: 2, fx: D.gsFx(1), line: '' };
    const lvl = DM.Skills.level(s), days = +s.gsDays || 0, bq = bestQ(), gs = D.gamestage(lvl, days, bq), fx = D.gsFx(gs);
    const line = fx.t <= 0 ? 'how tough the world is for you, from your level, days played and best weapon. Low for now: zombies as they always were.'
      : `zombies +${Math.round((fx.hp - 1) * 100)}% health and bite, more special infected, slightly better weapon finds. From level ${lvl}, ${days} day${days === 1 ? '' : 's'} played and your best weapon (max ${D.GS_MAX}).`;
    return { gs, lvl, days, bq, fx, line };
  }
  Game.gamestage = gamestage;

  // ---------------------------------------------------------------- first-time tips (each once; stored in the save)
  const TIPS = {
    home: ['Your steps scout houses', 'Every ~1,000 steps today turns up another house. Tap Loot to go in and search it yourself, or send your Crew.'],
    loot: ['Looting', 'Tap an item to take it, or Take all. The pack has limited slots - stash extras at home. Some loot only shows up in hidden spots.'],
    weapon: ['You found a weapon', 'Equip it in the Gear tab at home (Backpack or Stash), or tap the Swap button (bottom right) during a run to fight with it right away.'],
    cosmetic: ['Cosmetics are earned', 'They unlock straight into your Wardrobe (home screen, next to Edit look). Tap any you own to wear it - hats, glasses, scarves, packs and jackets.'],
    base: ['Your base', 'Build steps come from walking (half of every step). Tap BUILD for walls, traps and garden beds, DECORATE to place furniture you found. The stash chest is here too.'],
    food: ['Hungry or thirsty', 'Your Hunger and Thirst bars drain slowly, even with the app closed. Below 30 you tire faster and search slower. Tap the bars to eat or drink - beans, water, soda, garden food, or a rain barrel at the base.'],
    infect: DM.Infect ? DM.Infect.NOTE : ['Infected', ''],   // 0.18 (infection.js)
    lock: ['Locked', 'Lockpicks are silent but can snap - aim, then hold TURN and let go if it binds. A crowbar always works, but it is loud and may smash something.'],
  };
  let tipQ = [], tipOn = false;
  function tip(id) {
    if (!SV || !SV.tips || SV.tips.off || SV.tips[id] || !TIPS[id] || tipQ.includes(id)) return;
    tipQ.push(id); showTip();
  }
  Game.tip = tip;
  function showTip() {
    if (tipOn || !tipQ.length || cosPopOn) return;
    const id = tipQ.shift(); if (SV.tips[id]) return showTip();
    SV.tips[id] = 1; Game.save(); tipOn = true;
    const G = DM.scene && DM.House && DM.House.G; let paused = false;   // in a run the world waits while you read
    if (G && !G.over && !G.paused) { G.paused = paused = true; }
    let el = document.getElementById('tipbox'); if (!el) { el = document.createElement('div'); el.id = 'tipbox'; $('#app').appendChild(el); }
    el.className = DM.scene ? 'inrun' : '';
    el.innerHTML = `<div class="tiphead"><span class="tipbulb">TIP</span><b>${esc(TIPS[id][0])}</b></div><p>${esc(TIPS[id][1])}</p>
      <div class="tipbtns"><button class="tipoff" id="tipOff">Hide all tips</button><button class="mbtn sm" id="tipOk">Got it</button></div>`;
    void el.offsetWidth; el.classList.add('on');
    const done = () => { el.classList.remove('on'); tipOn = false; if (paused && G && !G.over && !cosPopOn) G.paused = false; setTimeout(showTip, 300); };
    $('#tipOk').onclick = e => { e.stopPropagation(); SFX.play('ui'); done(); };
    $('#tipOff').onclick = e => { e.stopPropagation(); SV.tips.off = 1; tipQ = []; Game.save(); done(); toast('Tips off - "How to play" is in Settings', 2); };
  }

  // ---- workbench
  function canCraft(r) { return Object.keys(r.in).every(k => countItem(k) >= r.in[k]); }
  function craft(key) {
    const r = D.RECIPES[key];
    if (!canCraft(r)) { toast('Missing materials', 1.4); return; }
    let usedQ = 0; for (const k in r.in) for (const x of takeItems(k, r.in[k])) if (D.isWeapon(x.k)) usedQ = Math.max(usedQ, D.qOf(x));
    const [k, n] = r.out, q = D.isWeapon(k) ? Math.max(usedQ, craftQuality()) : undefined;   // 0.19: crafted quality (never below the weapon it was made from)
    const lost = give(k, n, undefined, q);
    DM.Skills.addXP(2); Game.save(); SFX.play('open');
    toast(lost ? `Crafted ${D.ITEMS[k].n} - no room for ${lost}` : `Crafted ${q ? D.QUAL[q].n.toLowerCase() + ' ' : ''}${D.ITEMS[k].n}${n > 1 ? ' x' + n : ''}`, 1.8);
    if (!benchHost) benchSel = null;
    reHost();
  }
  let benchHost = null, stashHost = null;   // set while the base shows the workbench / stash chest
  Game.benchPanel = el => { benchHost = el; stashHost = null; benchSel = null; renderBench(); };
  Game.stashPanel = el => { stashHost = el; benchHost = null; sel = null; renderStash(); };
  const reHost = () => { if (benchHost && document.body.contains(benchHost)) renderBench(); else if (stashHost && document.body.contains(stashHost)) renderStash(); else { benchHost = stashHost = null; renderHome(); } };
  // where a material turns up: the loot tables that carry it most, Dot's shelf, or the bench itself
  const PLACE = { fridge: 'fridges', cooler: 'coolers', cabinet: 'kitchen cabinets', kdrawers: 'kitchen drawers', pantry: 'pantries', trash: 'garbage bins', island: 'kitchen islands', vanity: 'bathroom vanities',
    medcab: 'medicine cabinets', shelves: 'utility shelves', toolbox: 'toolboxes', crate: 'hidden stashes', books: 'bookshelves', night: 'nightstands', wardrobe: 'closets', dresser: 'dressers', desk: 'desks',
    tv: 'TV stands', coat: 'coat closets', hall: 'hall tables', hutch: 'hutches', side: 'side tables', corpse: 'zombies', safe: 'gun safes', cache: 'hidden caches', attic: 'attics', wallcache: 'wall caches',
    store: 'store shelves', register: 'registers', storage: 'storage rooms', pharm: 'pharmacy shelves', pharmstore: 'pharmacies', cage: 'pharmacy cages', locker: 'police lockers', evidence: 'evidence rooms',
    armory: 'armories', filing: 'filing cabinets', gym: 'gym lockers', nurse: "nurse's offices", workbench: 'garage workbenches', garage: 'garages', washer: 'washers', wine: 'wine racks', cellar: 'cellars', car: 'locked cars', lockedroom: 'key-locked rooms' };
  function whereFrom(k) {
    const sc = [];
    for (const t in D.LOOT) { if (!PLACE[t]) continue; const tab = D.LOOT[t][1], w = tab[k] || 0; if (!w) continue; const tot = Object.values(tab).reduce((a, b) => a + b, 0); sc.push([PLACE[t], w / tot + (D.LOOT[t][2] && D.LOOT[t][2].includes(k) ? .5 : 0)]); }
    const out = sc.sort((a, b) => b[1] - a[1]).map(x => x[0]).filter((x, i, a) => a.indexOf(x) === i).slice(0, 3);
    if (D.SHOP.some(r => r[0] === k)) out.push("Dot's shop");
    if (Object.values(D.RECIPES).some(r => r.out[0] === k)) out.push('craft it here');
    if (D.ITEMS[k] && D.ITEMS[k].seed !== undefined) out.push('garden harvests');
    return out.length ? out.join(', ') : 'rare: keep looking';
  }
  function whatItDoes(k) {
    const it = D.ITEMS[k]; if (!it) return '';
    if (it.w) { const W = D.WEAPONS[it.w], e2 = { k, q: 2 }, dm = D.wDmg(e2), du = D.wMax(e2); return (W.ranged ? `Ranged weapon · ${dm} damage · lasts ${du} shots · needs arrows` : `Melee weapon · ${dm} damage · reach ${W.reach} · lasts ${du} hits · ${W.noise >= 4 ? 'loud' : W.noise >= 3 ? 'a bit loud' : 'quiet'}`) + ' (Worn; each quality tier +8% damage, +15% durability)'; }   // 0.19
    if (it.slots) return `Fit it to your pack: +${it.slots} pack slots for good`;
    if (it.hp || it.sta || it.hu || it.th) return [DM.Food.label(k), it.hp ? `heals ${it.hp} HP` : '', it.sta ? `+${it.sta} stamina` : ''].filter(Boolean).join(' · ').replace(/^./, c => c.toUpperCase());
    return { lockpick: 'Opens locks silently with the lockpick mini-game. Snaps if you force it.', arrow: 'Ammo for the hunting bow. You can pick most of them back up.', shoes: 'Wear them: your footsteps make 30% less noise.',
      lockset: 'Keep it in your kit: locks feel easier (wider sweet spot, picks last longer).', key: 'Brass key - opens a locked car or a key-locked room. Used up. Lives on your keyring: no pack slot, never lost.', prybar: 'A quiet way to pry things open; also a weapon.' }[k] || '';
  }
  let benchSel = null;
  function benchRows(keys, known) {
    return keys.map(k => {
      const r = D.RECIPES[k], ok = known && canCraft(r), out = r.out[0];
      return `<div class="recipe tap${ok ? '' : ' no'}${known ? '' : ' locked'}" data-rec="${k}"><div class="rout">${icon(out)}${r.out[1] > 1 ? `<em>x${r.out[1]}</em>` : ''}</div>
        <div class="rinfo"><b>${r.n}</b>${known ? '' : '<div class="bpneed">Blueprint needed - Dot trades them</div>'}<div class="rin">${Object.keys(r.in).map(m => { const have = countItem(m); return `<span class="${have >= r.in[m] ? 'ok' : 'miss'}">${icon(m)}<i>${D.ITEMS[m].n}</i> ${have}/${r.in[m]}</span>`; }).join('')}</div></div>
        ${known ? `<button class="mbtn sm${ok ? '' : ' ghost'}" data-craft="${k}"${ok ? '' : ' disabled'}>Craft</button>` : '<span class="rlock">?</span>'}</div>`;
    }).join('');
  }
  function renderBench() {
    if (benchHost && !document.body.contains(benchHost)) benchHost = null;
    const s = SV.survivor, el = benchHost || $('#mpane');
    if (benchHost && benchSel) { el.innerHTML = benchDetailHTML(benchSel); bindDetail(el); return; }
    const unknown = Object.keys(D.RECIPES).filter(k => !s.known.includes(k));
    el.innerHTML = `<div class="kick sect">Workbench · ${s.known.length} recipe${s.known.length === 1 ? '' : 's'} known</div><div class="benchhint">Tap a recipe to see what it does and where to find each material.</div>` + benchRows(s.known, true)
      + (unknown.length ? `<div class="kick sect">Not learned yet · ${unknown.length}</div>` + benchRows(unknown, false) : '')
      + `<div class="empty">${unknown.length ? 'Blueprints: Dot trades them, and some turn up in hidden stashes and safes.' : 'You know every blueprint so far.'}<br>Materials come from the stash and the pack.</div>`;
    el.querySelectorAll('[data-craft]').forEach(b => b.onclick = e => { e.stopPropagation(); craft(b.dataset.craft); });
    el.querySelectorAll('[data-rec]').forEach(b => b.onclick = () => { SFX.play('ui'); openRecipe(b.dataset.rec); });
  }
  function benchDetailHTML(k) {
    const r = D.RECIPES[k], known = SV.survivor.known.includes(k), out = r.out[0], it = D.ITEMS[out], miss = Object.keys(r.in).filter(m => countItem(m) < r.in[m]);
    return `<div class="recdet"><div class="kick">Workbench${known ? '' : ' · not learned'}</div>
      <div class="rdhead"><div class="rdicon">${icon(out)}${r.out[1] > 1 ? `<em>x${r.out[1]}</em>` : ''}</div><div><h3>${esc(r.n.replace(/ \(.*\)/, ''))}</h3><p class="mp">${esc(whatItDoes(out) || it.n)}</p></div></div>
      <div class="kick sect">Materials</div>
      ${Object.keys(r.in).map(m => { const have = countItem(m), ok = have >= r.in[m]; return `<div class="rdmat ${ok ? 'ok' : 'miss'}">${icon(m)}<div><b>${D.ITEMS[m].n}</b><span>${esc(whereFrom(m))}</span></div><em>${have}/${r.in[m]}</em></div>`; }).join('')}
      ${known ? (miss.length ? `<button class="mbtn big" disabled>Missing: ${miss.map(m => D.ITEMS[m].n.toLowerCase()).join(', ')}</button>` : `<button class="mbtn big" id="rdCraft">Craft ${esc(it.n)}${r.out[1] > 1 ? ' x' + r.out[1] : ''}</button>`)
        : '<button class="mbtn big" disabled>Blueprint needed - Dot trades them</button>'}
      <button class="mbtn big ghost" id="rdBack">${benchHost ? 'Back to the bench' : 'Close'}</button></div>`;
  }
  function bindDetail(el) {
    const k = benchSel;
    if ($('#rdCraft')) $('#rdCraft').onclick = () => { craft(k); if (!benchHost) openRecipe(k); };
    $('#rdBack').onclick = () => { SFX.play('ui'); benchSel = null; if (benchHost) renderBench(); else sheetClose(); };
  }
  function openRecipe(k) {
    benchSel = k;
    if (benchHost) { renderBench(); return; }
    sheetOpen(benchDetailHTML(k)); bindDetail($('#msheet'));
    const sh = $('#msheet'); sh.onclick = e => { if (e.target === sh) { benchSel = null; sheetClose(); } };
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
  // 0.15 (owner: "the trader shouldn't be infinite"): after each visit Dot heads off and is back once you have walked
  // DOT_AWAY more steps (SV.walked: phone/watch steps, typed ones at half, the same total quests use). A visit starts when
  // her shop opens (so closing the app inside it still counts) or when junk is sold to her from the stash.
  const DOT_AWAY = 3000;
  const fmtN = n => Math.round(n).toLocaleString('en-US');
  function dotLeft() { const T = SV && SV.trader; if (!T || T.away == null) return 0; const left = T.away + DOT_AWAY - (SV.walked || 0); if (left <= 0) { T.away = null; return 0; } return Math.ceil(left); }
  function dotVisit() { SV.trader.away = SV.walked || 0; }
  Game.dotLeft = dotLeft;
  function openTrader() {
    const left = dotLeft();
    if (left) { toast(`Dot's on the road - back in ${fmtN(left)} steps`, 2); SFX.play('alert'); return; }
    refreshTrader(); dotVisit(); Game.save(); tTab = 'quests'; tSel = null; renderTrader();
  }
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
    $('#tBack').onclick = () => { $('#menu').className = ''; renderHome(); toast(`Dot packs up her cart. Back in about ${fmtN(DOT_AWAY)} steps`, 2.4); };
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
    el.innerHTML = evQuestHTML() + `<div class="kick sect">Your jobs · ${T.active.length}/2</div>${T.active.length ? T.active.map(q => card(q, true)).join('') : '<div class="empty">No jobs yet. Take one from the board.</div>'}
      <div class="kick sect">Today's board · new jobs at midnight</div>${T.offers.length ? T.offers.map(q => card(q, false)).join('') : '<div class="empty">Board is empty until tomorrow.</div>'}`;
    el.querySelectorAll('[data-take]').forEach(b => b.onclick = () => { acceptQuest(+b.dataset.take); renderTrader(); });
    if ($('#evTurn')) $('#evTurn').onclick = () => { evTurnIn(); renderTrader(); };
    el.querySelectorAll('[data-drop]').forEach(b => b.onclick = () => { if (!b.dataset.sure) { b.dataset.sure = 1; b.textContent = 'Sure?'; return; } T.active = T.active.filter(q => q.id !== b.dataset.drop); SV.houses = SV.houses.filter(h => h.quest !== b.dataset.drop); Game.save(); renderTrader(); });
    el.querySelectorAll('[data-turn]').forEach(b => b.onclick = () => {
      const q = T.active.find(x => x.id === b.dataset.turn), opts = rewardOptions(q);
      sheetOpen(`<div class="kick">${D.QUESTS[q.type].n} · tier ${q.tier}</div><h3>Pick your reward</h3><p class="mp">Plus ${q.reward.caps} caps and ${q.reward.xp} xp.</p>
        ${opts.map((o, i) => `<button class="pick${o.cos ? ' cospick' : ''}" data-opt="${i}"><b>${o.n}</b><span class="picons">${o.cos ? `${icon('cos_' + o.cos)}${D.COS[o.cos].n} · ${D.RARITY[D.COS[o.cos].r].n.toLowerCase()}, for your wardrobe` : o.items.map(([k, n]) => `${icon(k)}${D.ITEMS[k].n}${n > 1 ? ' x' + n : ''}`).join(' ')}</span></button>`).join('')}`);
      $('#msheet').querySelectorAll('[data-opt]').forEach(o => o.onclick = () => {
        const opt = opts[+o.dataset.opt];
        // supply/fetch items leave first, so check room as if they were gone
        if (!canGive(opt.items, q.type === 'supply' ? [[q.item, q.need]] : q.type === 'fetch' ? [['parcel', 1]] : [])) { toast('Make room in your pack or stash first', 1.8); return; }
        sheetClose(); turnIn(q, opt); renderTrader();
      });
    });
  }
  function evQuestHTML() {
    const st = evState(); if (!st) return '';
    const Q = EVA.ev.quests, q = Q[st.step], acc = EVA.ev.accent;
    const head = `<div class="kick sect evsect" style="--evc:${acc.c}">${EVS.glyph(EVA.id)}${esc(EVA.ev.name)} job${q ? ` · ${st.step + 1} of ${Q.length}` : ''}<span>${EVS.daysLeft()} day${EVS.daysLeft() === 1 ? '' : 's'} left</span></div>`;
    if (!q) return head + `<div class="qcard evq done" style="--evc:${acc.c}"><div class="qtext">"That's the whole list, sugar. The block eats well because of you."</div><div class="qrew">All ${Q.length} ${esc(EVA.ev.name)} jobs done.</div></div>`;
    const ready = evReady(q, st);
    const prog = q.kills ? `${Math.min(q.kills, st.kills - st.base)}/${q.kills}` : q.give.map(([k, n]) => `<span class="${countItem(k) >= n ? 'ok' : 'miss'}">${icon(k)}${Math.min(n, countItem(k))}/${n}</span>`).join('');
    const rew = [`${icon('caps')} ${q.caps} caps`].concat((q.items || []).map(([k, n]) => `${icon(k)}${D.ITEMS[k].n}${n > 1 ? ' x' + n : ''}`)).concat(q.cos ? [`<img alt="" src="${ART.iconURL['cos_' + q.cos]}">${esc(D.COS[q.cos].n)} <em class="rtag" style="--rc:${RCOL[D.COS[q.cos].r]}">${EVS.label(EVA.id, EVA.y)}</em>`] : []);
    return head + `<div class="qcard evq${ready ? ' ready' : ''}" style="--evc:${acc.c}"><div class="qhead"><b>${esc(q.n)}</b><em>Event</em><span class="qprog">${q.kills ? prog : ready ? 'ready' : ''}</span></div>
      <div class="qtext">${esc(q.d)}</div>${q.kills ? '' : `<div class="rin evneed">${prog}</div>`}<div class="qrew evrew">${rew.join(' · ')}</div>
      ${ready ? '<button class="mbtn sm" id="evTurn">Turn in</button>' : `<div class="qnote">${q.kills ? `Find ${EVS.bossName(EVA.ev.boss.kind).toLowerCase()}s in the house list.` : 'Bring the items in your pack or stash.'}</div>`}</div>`;
  }
  function tShop() {
    const T = SV.trader, el = $('#tpane');
    const cosRow = e => { const c = D.ITEMS[e.k].cos, C = D.COS[c]; return `<span><em class="rtag" style="--rc:${RCOL[C.r]}">${D.RARITY[C.r].n}</em> cosmetic · ${Game.hasCos(c) ? 'you have it' : 'for your wardrobe'}</span>`; };
    const row = (e, i) => { const cos = D.ITEMS[e.k].cos, left = e.left && !(cos && Game.hasCos(cos)); return `<div class="shoprow${left ? '' : ' gone'}${cos ? ' cosrow' : ''}">${icon(e.k)}<div><b>${D.ITEMS[e.k].n}${e.n > 1 ? ' x' + e.n : ''}${D.isWeapon(e.k) ? qTag(e) : ''}</b>${cos ? cosRow(e) : `<span>${e.left ? e.left + ' left' : 'sold out'}</span>`}</div>
      <button class="mbtn sm${T.caps >= e.price && left ? '' : ' ghost'}" data-buy="${i}"${left ? '' : ' disabled'}>${icon('caps')}${e.price}</button></div>`; };
    const cosI = T.stock.map((e, i) => i).filter(i => D.ITEMS[T.stock[i].k].cos), goodI = T.stock.map((e, i) => i).filter(i => !D.ITEMS[T.stock[i].k].cos);
    el.innerHTML = (cosI.length ? `<div class="kick sect">Back shelf · cosmetics</div>` + cosI.map(i => row(T.stock[i], i)).join('') : '') +
      `<div class="kick sect">Today's stock · level ${traderLevel()}</div>` + (goodI.length ? goodI.map(i => row(T.stock[i], i)).join('') : '<div class="empty">Shelves are bare today.</div>') + '<div class="empty">Bought goods go in your pack, or the stash if it is full. Cosmetics go to your wardrobe.</div>';
    el.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => {
      const e = T.stock[+b.dataset.buy];
      if (T.caps < e.price) { toast('Not enough caps, sugar', 1.4); return; }
      if (D.ITEMS[e.k].cos) { T.caps -= e.price; e.left = 0; SFX.play('pick'); Game.unlockCos(e.k); Game.save(); renderTrader(); return; }
      if (!canGive([[e.k, e.n]])) { toast('No room in pack or stash for all of it', 1.6); return; }
      give(e.k, e.n, undefined, D.isWeapon(e.k) ? D.qOf(e) : undefined);   // 0.19: full durability at the shelf's quality
      T.caps -= e.price; e.left--; if (e.k === 'backpack') T.boughtPack = true;
      SFX.play('pick'); Game.save(); renderTrader();
    });
  }
  function tSell() {
    const s = SV.survivor, el = $('#tpane');
    const rows = [];
    for (const [from, list] of [['pack', s.pack], ['stash', s.stash]]) list.forEach((e, i) => { const v = D.valueOf(e.k, e.d, e.q); if (D.VALUE[e.k] === 0 || D.ITEMS[e.k].quest) return; rows.push({ from, i, e, v }); });
    el.innerHTML = `<div class="kick sect">Sell to Dot · she pays low</div>` + (rows.length ? rows.map((r, j) => `<div class="shoprow">${icon(r.e.k)}<div><b>${D.ITEMS[r.e.k].n}${r.e.n > 1 ? ' x' + r.e.n : ''}</b><span>${r.from} · ${icon('caps')}${Math.max(1, Math.floor(r.v))} each</span></div>
      <button class="mbtn sm" data-sell="${j}">Sell ${r.e.n > 1 ? 'all' : ''} ${icon('caps')}${Math.max(1, Math.floor(r.v * r.e.n))}</button></div>`).join('') : '<div class="empty">Nothing to sell.</div>');
    el.querySelectorAll('[data-sell]').forEach(b => b.onclick = () => {
      const r = rows[+b.dataset.sell], list = s[r.from], idx = list.indexOf(r.e); if (idx < 0) return;
      list.splice(idx, 1); SV.trader.caps += Math.max(1, Math.floor(r.v * r.e.n));
      SFX.play('pick'); Game.save(); renderTrader();
    });
  }

  // ---------------------------------------------------------------- UI helpers
  const PIN = '<svg class="pin" viewBox="0 0 12 16" width="9" height="12"><path d="M6 15.5C2.5 10.6 1 8.2 1 6a5 5 0 0 1 10 0c0 2.2-1.5 4.6-5 9.5z" fill="currentColor"/><circle cx="6" cy="6" r="1.9" fill="#f07b3c"/></svg>';
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
  Game.ui = { typeIcon, esc, skulls: n => SKULL.repeat(n) + `<span class="dim">${SKULL.repeat(Math.max(0, 5 - n))}</span>`, sheetOpen: h => sheetOpen(h), sheetClose: () => sheetClose() };   // 0.18: for daily.js

  function showResult(title, stacks, lost, note, kick) {
    const el = $('#mres');
    el.innerHTML = `<div class="mcard"><div class="kick">${kick || 'Crew search'}</div><h3>${esc(title)}</h3><p class="mp">${esc(note)}</p>
      <div class="sum">${stacks.length ? stacks.map(e => `<div class="sum-item${D.ITEMS[e.k].rare ? ' rare' : ''}">${icon(e.k)}<span>${D.ITEMS[e.k].n}</span>${D.isWeapon(e.k) ? qTag(e) : ''}${e.n > 1 ? `<b>x${e.n}</b>` : ''}</div>`).join('') : '<div class="empty">They came back empty-handed.</div>'}</div>
      ${lost.length ? `<div class="lost">No room in the stash for: ${lost.map(e => D.ITEMS[e.k].n + (e.n > 1 ? ' x' + e.n : '')).join(', ')}</div>` : ''}
      <button class="mbtn" id="mresOk">OK</button></div>`;
    el.classList.add('on');
    $('#mresOk').onclick = () => el.classList.remove('on');
  }

  // ---------------------------------------------------------------- screens
  function hideMenu() { $('#menu').classList.add('off'); }
  function showMenu() { $('#menu').classList.remove('off'); }
  let curTab = 'houses';
  function tab(t) { curTab = t; if (t === 'stash' && SV.survivor.better) { SV.survivor.better = null; Game.save(); } document.querySelectorAll('#mtabs button').forEach(b => b.classList.toggle('on', b.dataset.t === t)); renderHome(); }

  // ---- character creation / edit look
  let cre = { name: '', look: ART.LOOK.norm(null), job: 'scavenger' }, creEdit = false, idleRAF = 0;
  const LK = ART.LOOK;
  function lookRows(lk) {
    const sw = (key, list, colOf, labelOf) => `<div class="swatches">${list.map((v, i) => `<button class="sw${lk[key] === i ? ' on' : ''}" data-k="${key}" data-v="${i}" style="background:${colOf(v)}" aria-label="${labelOf(v, i)}"></button>`).join('')}</div>`;
    return `
      <div class="lrow"><div class="kick">Body</div><div class="chips">${[['f', 'Female'], ['m', 'Male']].map(([v, n]) => `<button class="chip${lk.body === v ? ' on' : ''}" data-k="body" data-v="${v}">${n}</button>`).join('')}</div></div>
      <div class="lrow"><div class="kick">Skin</div>${sw('skin', LK.skins, v => v[0], (v, i) => 'Skin ' + (i + 1))}</div>
      <div class="lrow"><div class="kick">Hair</div><div class="chips">${LK.styles.map((n, i) => `<button class="chip${lk.hair === i ? ' on' : ''}" data-k="hair" data-v="${i}">${n}</button>`).join('')}</div></div>
      <div class="lrow"><div class="kick">Hair colour</div>${sw('hairC', LK.hairs, v => v, (v, i) => LK.hairNames[i])}</div>
      <div class="lrow"><div class="kick">Hood${lk.cos && lk.cos.hat ? ' <span class="lnote">· your hat keeps it down</span>' : ''}</div><div class="chips"><button class="chip${lk.hood ? ' on' : ''}" data-k="hood" data-v="1">Up</button><button class="chip${!lk.hood ? ' on' : ''}" data-k="hood" data-v="0">Down</button></div></div>
      <div class="lrow"><div class="kick">Jacket</div>${sw('coat', LK.coats, v => v[0], v => v[2])}</div>
      <div class="lrow"><div class="kick">Pants</div>${sw('pants', LK.pants, v => v[0], v => v[1])}</div>`;
  }
  function bindLook(lk, rerender) {
    document.querySelectorAll('.cform [data-k]').forEach(b => b.onclick = async () => {
      const k = b.dataset.k, v = b.dataset.v;
      lk[k] = k === 'body' ? v : k === 'hood' ? v === '1' : +v;
      SFX.play('ui'); await E.buildSurvivor(lk); rerender();
    });
  }
  function startIdle(canvas, getWeapon) { // gentle idle: breathing + a slow sway
    cancelAnimationFrame(idleRAF);
    const loop = t => {
      if (!document.body.contains(canvas)) return;
      const x = canvas.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, canvas.width, canvas.height);
      x.fillStyle = 'rgba(8,6,22,.4)'; x.beginPath(); x.ellipse(canvas.width / 2, canvas.height * .9, canvas.width * .28, canvas.width * .07, 0, 0, 6.3); x.fill();
      const k = t / 1000, wk = getWeapon(); const w = wk && D.ITEMS[wk] ? D.ITEMS[wk].w : 'fists';
      ART.drawRig(x, 'survivor', canvas.width / 2 - 4, canvas.height * .9, canvas.height / 282 * .98, false,
        { sy: 1 + Math.sin(k * 2.4) * .014, rot: Math.sin(k * .9) * .015, parts: { arm: { r: Math.sin(k * 1.3) * .05 }, bat: { r: Math.sin(k * 1.3) * .05 }, legB: { r: Math.sin(k * .7) * .02 } }, weapon: w });
      idleRAF = requestAnimationFrame(loop);
    };
    idleRAF = requestAnimationFrame(loop);
  }
  function renderCreate() {
    $('#menu').className = 'create';
    const lk = cre.look, ward = creEdit && creTab === 'wardrobe', nn = creEdit ? newCos() : 0;
    $('#mbody').innerHTML = `
      <div class="mhead"><div class="logo">DEAD MILES</div><div class="kick">${ward ? 'your wardrobe' : creEdit ? 'edit your look' : 'a new survivor'}</div></div>
      ${creEdit ? `<div id="ltabs"><button data-lt="look" class="${ward ? '' : 'on'}">Look</button><button data-lt="wardrobe" class="${ward ? 'on' : ''}">Wardrobe${nn ? `<i class="nbadge">${nn}</i>` : ''}</button></div>` : ''}
      <div class="ccard">
        <div class="cprev"><canvas id="cPort" width="260" height="320"></canvas>${ward ? '' : '<button class="mbtn sm ghost" id="cRand">Randomise</button>'}</div>
        <div class="cform">${creEdit ? '' : `<label class="kick" for="cName">Name</label>
          <input id="cName" maxlength="16" placeholder="Your name" value="${esc(cre.name)}" autocomplete="off">`}
          ${ward ? wardrobeHTML(lk) : lookRows(lk)}
        </div>
      </div>
      ${ward ? '<button class="mbtn big" id="cSave">Done</button>' : creEdit ? '<button class="mbtn big" id="cSave">Save look</button><button class="mbtn big ghost" id="cCancel">Cancel</button>' : `<div class="kick sect">Job</div>
      <div class="jobs">${Object.keys(D.JOBS).map(k => { const J = D.JOBS[k]; return `<button class="job${k === cre.job ? ' on' : ''}" data-j="${k}">
        <b>${J.n}</b><span>${J.perk}</span><div class="kit">${J.kit.map(([it, n]) => `<i>${icon(it)}${n > 1 ? `<em>${n}</em>` : ''}</i>`).join('')}</div></button>`; }).join('')}</div>
      <button class="mbtn big" id="cGo">Start walking</button>`}`;
    if ($('#cName')) $('#cName').oninput = e => cre.name = e.target.value;
    if (ward) bindWardrobe(lk); else bindLook(lk, renderCreate);
    document.querySelectorAll('#ltabs button').forEach(b => b.onclick = () => { commitSeen(); creTab = b.dataset.lt; SFX.play('ui'); renderCreate(); $('#menu').scrollTo(0, 0); });
    if ($('#cRand')) $('#cRand').onclick = async () => { cre.look = Object.assign(LK.random(), { cos: cre.look.cos }); SFX.play('ui'); await E.buildSurvivor(cre.look); renderCreate(); };
    document.querySelectorAll('.job').forEach(b => b.onclick = () => { cre.job = b.dataset.j; SFX.play('ui'); renderCreate(); });
    if (creEdit) {
      $('#cSave').onclick = async () => { commitSeen(); SV.survivor.look = LK.norm(cre.look); Game.save(); publish(); creEdit = false; await E.buildSurvivor(SV.survivor.look); renderHome(); toast('Looking good', 1.2); };
      if ($('#cCancel')) $('#cCancel').onclick = async () => { commitSeen(); creEdit = false; await E.buildSurvivor(SV.survivor.look); renderHome(); };
    } else $('#cGo').onclick = async () => {
      SV.survivor = createSurvivor(cre.name.trim(), LK.norm(cre.look), cre.job);
      DM.S = SV.survivor; Game.save(); publish();
      await E.buildSurvivor(cre.look);
      renderHome();
    };
    startIdle($('#cPort'), () => creEdit ? (SV.survivor.hands && SV.survivor.hands.k) : D.JOBS[cre.job].hands);
  }
  function editLook(t) { creEdit = true; creTab = t || 'look'; cre.look = LK.norm(SV.survivor.look); renderCreate(); $('#menu').scrollTo(0, 0); }

  // ---- wardrobe: one grid per slot, locked ones as silhouettes with a hint; taps wear/unwear right away
  let creTab = 'look', wardSlot = 'hat';
  const wardPending = new Set();
  const RORD = { c: 0, r: 1, e: 2, l: 3 };
  function commitSeen() { if (!wardPending.size || !SV || !SV.survivor) return; for (const k of wardPending) SV.survivor.wardrobe.seen[k] = 1; wardPending.clear(); Game.save(); }
  function wardrobeHTML(lk) {
    const w = SV.survivor.wardrobe, all = Object.keys(D.COS), owned = all.filter(k => w.own[k]);
    const keys = all.filter(k => D.COS[k].slot === wardSlot).sort((a, b) => (w.own[b] ? 1 : 0) - (w.own[a] ? 1 : 0) || RORD[D.COS[a].r] - RORD[D.COS[b].r]);
    for (const k of keys) if (w.own[k] && !w.seen[k]) wardPending.add(k);
    const cur = lk.cos[wardSlot];
    return `<div class="wtop"><span class="kick">Collected</span><b>${owned.length}<i>/${all.length}</i></b><div class="mbar xp"><i style="width:${owned.length / all.length * 100}%"></i></div></div>
      <div class="chips wslots">${D.COS_SLOTS.map(([sl, n]) => { const ks = all.filter(k => D.COS[k].slot === sl), have = ks.filter(k => w.own[k]).length, nw = ks.some(k => w.own[k] && !w.seen[k]);
        return `<button class="chip${sl === wardSlot ? ' on' : ''}" data-ws="${sl}">${n} <small>${have}/${ks.length}</small>${nw ? '<i class="ndot"></i>' : ''}</button>`; }).join('')}</div>
      <div class="wgrid">
        <button class="wtile wnone${cur ? '' : ' on'}" data-wc=""><span class="wx">×</span><span>Nothing</span>${cur ? '' : '<em>worn</em>'}</button>
        ${keys.map(k => { const C = D.COS[k], own = w.own[k], on = cur === k;
          return `<button class="wtile${own ? '' : ' locked'}${on ? ' on' : ''}" data-wc="${k}" style="--rc:${RCOL[C.r]}"><img alt="" src="${ART.iconURL[(own ? 'cos_' : 'cosS_') + k]}"><span>${esc(C.n)}</span>
            ${own ? `<i class="rname">${D.RARITY[C.r].n}</i>` : `<small>${esc(D.cosHint(k))}</small>`}${C.ev ? `<i class="evtag" style="--evc:${EVS.get(C.ev).accent.c}">${esc(EVS.cosTag(k, w.own[k]))}</i>` : ''}${on ? '<em>worn</em>' : own && !w.seen[k] ? '<em class="new">new</em>' : ''}</button>`; }).join('')}
      </div>
      <p class="mp whint">Cosmetics are earned - found on bodies and in houses (rarer in mansions and police stations), from Dot's shop and jobs, horde nights and events. They never take pack space.</p>`;
  }
  function bindWardrobe(lk) {
    document.querySelectorAll('[data-ws]').forEach(b => b.onclick = () => { commitSeen(); wardSlot = b.dataset.ws; SFX.play('ui'); renderCreate(); });
    document.querySelectorAll('[data-wc]').forEach(b => b.onclick = async () => {
      const k = b.dataset.wc, s = SV.survivor;
      if (k && !s.wardrobe.own[k]) { SFX.play('ui'); toast(`${D.COS[k].n}: ${D.cosHint(k).toLowerCase()}`, 2); return; }
      if (k) s.wardrobe.seen[k] = 1;
      if (!k || lk.cos[wardSlot] === k) delete lk.cos[wardSlot]; else lk.cos[wardSlot] = k;
      s.look.cos = Object.assign({}, lk.cos); Game.save(); publish();
      SFX.play(k ? 'pick' : 'ui'); await E.buildSurvivor(lk); renderCreate();
    });
  }
  function drawPortrait(c, weapon, sc = .7) {
    const dpr = c.width / c.clientWidth || 2, x = c.getContext('2d');
    x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, c.width, c.height);
    x.fillStyle = 'rgba(8,6,22,.4)'; x.beginPath(); x.ellipse(c.width / 2, c.height * .9, c.width * .28, c.width * .08, 0, 0, 6.3); x.fill();
    const wk = weapon && D.ITEMS[weapon] ? D.ITEMS[weapon].w : weapon;
    ART.drawRig(x, 'survivor', c.width / 2 - 4, c.height * .9, sc * c.height / 260, false, { weapon: wk || 'fists' });
  }

  // ---- seasonal event banner (events.js) + its info sheet
  function eventBanner() {
    const a = EVA, up = !a && EVS.upcoming();
    if (!a && !up) return '';
    const e = (a || up).ev, acc = e.accent, n = a ? EVS.daysLeft() : up.days;
    const when = a ? (a.forced ? 'forced for testing' : n <= 1 ? 'last day!' : `${n} days left`) : n <= 1 ? 'starts tomorrow' : `starts in ${n} days`;
    const bits = a ? [e.boss && `${e.boss.name}s on the loose`, e.quests && "Dot's event jobs", hordeLine(a)].filter(Boolean) : ['Limited cosmetics', e.boss && e.boss.name];
    return `<button class="evban${a ? '' : ' soon'}" id="evBan" style="--evc:${acc.c};--evc2:${acc.c2};--evbg:${acc.bg}"><span class="evg">${EVS.glyph((a || up).id)}</span>
      <span class="evt"><b>${esc(e.name)} event</b><em>${when}</em><small>${bits.filter(Boolean).map(esc).join(' · ')}</small></span><span class="evgo">›</span></button>`;
  }
  function hordeLine(a) { const n = HD.next(), sp = n && HD.special(n.week); return sp && sp.name && sp.ev === a.id ? sp.name + ' Sunday' : ''; }
  function openEvent() {
    const a = EVA, up = !a && EVS.upcoming(); const id = (a || up).id, e = (a || up).ev, w = SV.survivor.wardrobe.own;
    const st = a && evState(), cos = e.cos.filter(c => D.COS[c]);
    const fmt = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); };
    const n = HD.next(), sp = n && HD.special(n.week);
    sheetOpen(`<div class="kick" style="color:${e.accent.c}">${a ? 'Event on now' : 'Coming soon'} · ${fmt((a || up).start)} - ${fmt((a || up).end)}</div><h3>${esc(e.name)} ${(a || up).y}</h3>
      <p class="mp">${esc(e.blurb)}</p>
      ${e.boss ? `<div class="evrow"><b>Mini-boss</b><span>${esc(e.boss.name)} · in about 1 in 3 houses (the house list shows where). Tough, and it carries something good.</span></div>` : ''}
      ${e.quests ? `<div class="evrow"><b>Dot's jobs</b><span>${e.quests.length} event jobs, one at a time${st ? ` · ${Math.min(st.step, e.quests.length)}/${e.quests.length} done` : ''}. Visit her shop.</span></div>` : ''}
      ${e.horde ? `<div class="evrow"><b>Horde night</b><span>${esc(e.horde((a || up).y).name)}: the Sunday horde is ${Math.round((e.horde((a || up).y).size - 1) * 100)}% bigger, with better crates${sp && sp.ev === id ? ' - this Sunday!' : '.'}</span></div>` : ''}
      <div class="kick sect">Limited cosmetics · ${cos.filter(c => w[c]).length}/${cos.length}</div>
      <div class="evcos">${cos.map(c => `<span class="${w[c] ? 'own' : ''}"><img alt="" src="${ART.iconURL[(w[c] ? 'cos_' : 'cosS_') + c]}"><i>${esc(D.COS[c].n)}</i></span>`).join('')}</div>
      <div class="btnrow"><button class="mbtn sm ghost" id="evClose">Close</button>${a && SV.tutorialDone ? '<button class="mbtn sm" id="evDot">See Dot</button>' : ''}</div>`);
    $('#evClose').onclick = sheetClose;
    if ($('#evDot')) $('#evDot').onclick = () => { sheetClose(); openTrader(); };
  }

  // ---- home
  function renderHome() {
    if (!SV || !SV.survivor || DM.scene) return;
    rollDay();
    foodTick();
    const s = SV.survivor, d = SV.day, J = D.JOBS[s.job], xl = DM.Skills.xpLine(s), pts = DM.Skills.points(s);
    const eff = effective(d), nxt = nextHouseAt(d), w = worth(eff);
    $('#menu').className = '';
    const hands = s.hands ? `${icon(s.hands.k)}<span style="color:${D.qOf(s.hands) > 2 ? D.QUAL[D.qOf(s.hands)].c : 'inherit'}">${D.ITEMS[s.hands.k].n}<i class="dur"><i style="width:${Math.max(3, Math.min(100, s.hands.d / D.wMax(s.hands) * 100))}%"></i></i></span>` : '<span>Fists</span>';   // 0.19: tier colour
    $('#mbody').innerHTML = `
      <div class="mtop"><div class="logo">DEAD MILES</div><button id="mver" class="ver">${VERSION}</button><button id="mnet" class="gear" aria-label="Account and friends"><svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.4" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M2.8 19.5c.6-3.6 3.2-5.6 6.2-5.6s5.6 2 6.2 5.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="17" cy="9" r="2.6" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M16.5 13.6c2.6.1 4.4 1.8 4.9 4.6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button><button id="mset" class="gear" aria-label="Settings"><svg viewBox="0 0 24 24"><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zm8.4 4.6.1-1.1-.1-1.1 2-1.6-2-3.4-2.4 1a8 8 0 0 0-1.9-1.1L15.8 3h-4l-.4 2.6a8 8 0 0 0-1.9 1.1l-2.4-1-2 3.4 2 1.6-.1 1.1.1 1.1-2 1.6 2 3.4 2.4-1c.6.5 1.2.8 1.9 1.1l.4 2.6h4l.4-2.6a8 8 0 0 0 1.9-1.1l2.4 1 2-3.4z" fill="none" stroke="currentColor" stroke-width="1.7"/></svg></button></div>
      ${eventBanner()}
      <div class="scard">
        <div class="portwrap"><canvas id="mPort" width="150" height="190"></canvas><div class="lookbtns"><button class="editlook" id="mLook">Edit look</button><button class="editlook ward" id="mWard">Wardrobe${newCos() ? `<i class="nbadge">${newCos()}</i>` : ''}</button></div></div>
        <div class="sinfo">
          <div class="sname">${esc(s.name)}</div>
          <div class="sjob">${J.n} · <span>${J.stats.join(' · ')}</span></div>
          <div class="mbar hp"><i style="width:${s.hp / maxHp(s) * 100}%"></i><span>HP ${Math.ceil(s.hp)}/${maxHp(s)}</span></div>
          ${DM.Food.barsHTML(s)}${needStat(s)}
          <button class="sline skbtn${pts ? ' pts' : ''}" id="mSkills"><span>Level ${xl.L}${pts ? ` · <b>${pts} skill point${pts > 1 ? 's' : ''}</b>` : ''}</span><em>Skills ›</em><div class="mbar xp"><i style="width:${xl.pct}%"></i></div></button>
          <div class="shands">${hands}</div>
        </div>
      </div>
      <div class="stepcard">
        <div class="steps"><b>${Math.round(d.phone + d.walk + d.typed).toLocaleString('en-US')}</b><span>steps today</span></div>
        <div class="stepinfo">${d.typed ? `${d.typed.toLocaleString('en-US')} typed (half value) · ` : ''}${Math.round(w).toLocaleString('en-US')} worth<br>
          <b>${d.scouted}</b> house${d.scouted === 1 ? '' : 's'} scouted${nxt ? ` · next at ${nxt.toLocaleString('en-US')}` : ' · that\'s the max today'}</div>
        <div class="steprow"><input id="mSteps" inputmode="numeric" placeholder="My total today" maxlength="8"><button id="mLog" class="mbtn sm">Log</button></div>
        <div id="msync" class="msync"></div>
        ${IS_IOS && window.NET && NET.ok ? '<button class="mbtn sm" id="mSyncNow" style="width:100%;margin:8px 0 2px">Sync my steps now</button>' : ''}
        ${window.SYNC ? (window.NET && NET.ok && !d.phone && new Date().getHours() >= 14 ? '<button class="synclink nudge" id="mSyncG" data-m="fix">No phone steps yet today? Fix step sync</button>' : '<button class="synclink" id="mSyncG">How to sync steps</button>') : ''}
      </div>
      ${SV.tutorialDone || SV.stats.runs ? baseCards() + (DM.Deep ? DM.Deep.cardHTML() : '') + DM.Boss.cardHTML() + DM.Crew.cardHTML() : ''}
      <div id="mtabs"><button data-t="houses">Houses</button><button data-t="stash">Gear${betterBadge() && curTab !== 'stash' ? '<i class="tbadge">!</i>' : ''}</button><button data-t="bench">Workbench</button>${DM.Map ? '<button data-t="map" class="maptab">Map</button>' : ''}</div>
      <div id="mpane"></div>`;
    document.querySelectorAll('#mtabs button').forEach(b => { b.classList.toggle('on', b.dataset.t === curTab); b.onclick = () => { SFX.play('ui'); if (b.dataset.t === 'map') { DM.Map.open(); return; } tab(b.dataset.t); }; });
    $('#mLog').onclick = () => {
      const v = parseInt(String($('#mSteps').value).replace(/[^0-9]/g, ''), 10); /* "8,500" or "8 500" is 8500, not 8 */ if (!(v > 0)) { toast('Type your step total for today', 1.6); return; }
      // typed steps go through the step ledger so a phone catching up later never counts the same steps twice
      if (window.NET) { const before = SV.day.typed; const g = NET.typeSteps(v, 'total'); if (!g && SV.day.typed === before) toast(NET.onSteps ? 'Already counted that many today' : 'Saved - it will count in a moment', 2); else if (g < v - (NET.stepsDay().ap || 0)) toast('Typed steps above your phone count are capped at 4,000 a day', 2.4); return; }
      const used = DM.addSteps(v, 'typed'); if (used < v) toast(`Typed steps are capped at 4,000 a day (${used.toLocaleString('en-US')} counted)`, 2.6);
    };
    $('#mnet').onclick = openAccount;
    bindBaseCards();
    DM.Boss.bind($('#mbody')); DM.Crew.bindCard(() => renderHome());
    if (DM.Deep) DM.Deep.bind($('#mbody'));   // 0.17 deep runs (deep.js)
    if ($('#evBan')) $('#evBan').onclick = () => { SFX.play('ui'); openEvent(); };
    // iPhone: run the player's own "Dead Miles Steps" Shortcut and come straight back here
    // (x-callback-url), so a manual sync is one tap instead of a trip to the Shortcuts app.
    if ($('#mSyncNow')) $('#mSyncNow').onclick = () => {
      SFX.play('ui'); Game.save();
      const back = location.origin + location.pathname + '?synced=1';
      location.href = 'shortcuts://x-callback-url/run-shortcut?name=' + encodeURIComponent('Dead Miles Steps') + '&x-success=' + encodeURIComponent(back) + '&x-error=' + encodeURIComponent(back + '&err=1');
    };
    if ($('#mSyncG')) $('#mSyncG').onclick = () => { SFX.play('ui'); try { SYNC.open($('#mSyncG').dataset.m || undefined); } catch (e) { toast('Sync guide failed to open', 1.6); } };
    $('#mLook').onclick = () => { SFX.play('ui'); editLook(); };
    $('#mSkills').onclick = () => { SFX.play('ui'); DM.Skills.open(() => renderHome()); };
    $('#mNeeds').onclick = () => { SFX.play('ui'); openFood(); };
    $('#mWard').onclick = () => { SFX.play('ui'); editLook('wardrobe'); };
    let vt = 0, vtT = 0; $('#mver').onclick = () => { const n = performance.now(); if (n - vtT > 1200) vt = 0; vtT = n; if (++vt >= 5) { vt = 0; if (DM_DEV_OK) openDev(); } };
    $('#mset').onclick = openSettings;
    drawPortrait($('#mPort'), s.hands && s.hands.k, .78);
    if (curTab === 'houses') renderHouses(); else if (curTab === 'bench') renderBench(); else renderStash();
    updateSync();
    if (cosQueue.length) setTimeout(showCosPop, 400); else { tip('home'); if (s.food.h < DM.Food.LOW || s.food.t < DM.Food.LOW) tip('food'); if (DM.Infect && DM.Infect.is(s)) tip('infect'); }
    const ic = document.querySelector('.nstat .inf'); if (ic) ic.onclick = () => { SFX.play('ui'); toast(DM.Infect.effects(s)[0], 5); };   // 0.18
  }
  // ---- 0.8: hunger + thirst (food.js). Real time drains them, so catch up whenever the home screen shows.
  const FD = DM.Food;
  function foodTick() { const s = SV && SV.survivor; if (!s || !s.food) return; const h0 = s.hp; s.hp = FD.tick(s, s.hp);
    if (DM.Infect) { const m = DM.Infect.tick(s); if (m) { toast(m, 2.8); Game.save(); } }   // 0.18: infection clears after 5 days; HP never above the lower max
    if (s.hp !== h0) Game.save(); }
  const needStat = s => { const st = FD.status(s).concat(DM.Infect ? DM.Infect.status(s) : []); return st.length ? `<div class="nstat">${st.map(([c, t]) => `<span class="${c}">${t}</span>`).join('')}</div>` : ''; };
  // the bars on the home card follow the clock while the app stays open
  setInterval(() => {
    if (!SV || !SV.survivor || DM.scene || !$('#mNeeds')) return;
    foodTick(); const f = SV.survivor.food;
    $('#mNeeds').outerHTML = FD.barsHTML(SV.survivor); $('#mNeeds').onclick = () => { SFX.play('ui'); openFood(); };
    const hp = $('.scard .mbar.hp'); if (hp) { hp.querySelector('i').style.width = SV.survivor.hp / maxHp(SV.survivor) * 100 + '%'; hp.querySelector('span').textContent = `HP ${Math.ceil(SV.survivor.hp)}/${maxHp(SV.survivor)}`; }
    if (f.h < FD.LOW || f.t < FD.LOW) tip('food');
  }, 60e3);
  // eat & drink from home: everything in the pack and the stash, with what it does to the bars
  function openFood() {
    const s = SV.survivor; foodTick();
    const rows = [];
    for (const from of ['pack', 'stash']) s[from].forEach((e, i) => { if (FD.isFood(e.k)) rows.push({ e, i, from }); });
    rows.sort((a, b) => (D.ITEMS[b.e.k].hu || 0) + (D.ITEMS[b.e.k].th || 0) - (D.ITEMS[a.e.k].hu || 0) - (D.ITEMS[a.e.k].th || 0));
    const b = SV.base, w = b && b.built && b.built.barrel ? DM.Base.barrelCharges() : 0;
    sheetOpen(`<div class="kick">Food &amp; water</div><h3>Eat &amp; drink</h3>
      <div class="fdbars">${FD.barsHTML(s).replace('id="mNeeds"', '')}</div>
      <ul class="fdfx">${FD.effects(s).map(t => `<li>${esc(t)}</li>`).join('')}</ul>
      <div class="fdlist">${rows.length ? rows.map((r, j) => { const it = D.ITEMS[r.e.k]; return `<div class="fdrow">${icon(r.e.k)}<div>${esc(it.n)}${r.e.n > 1 ? ' x' + r.e.n : ''}<em>${FD.label(r.e.k)}${it.hp ? ` · +${it.hp} HP` : ''}${it.sta ? ` · +${it.sta} stamina` : ''} · ${r.from}</em></div><button class="mbtn sm" data-fd="${j}">${it.use}</button></div>`; }).join('')
        : '<div class="empty">No food or drinks in your pack or stash. Kitchens, pantries, fridges and stores have them; Dot sells beans and water; the garden grows food.</div>'}</div>
      ${w ? `<p class="mp" style="margin:4px 0 0">Your rain barrels hold ${w} charge${w === 1 ? '' : 's'} of water: drink from one at the base (+50 thirst).</p>` : ''}
      <div class="btnrow"><button class="mbtn sm ghost" id="fdClose">Close</button></div>`);
    $('#msheet').querySelectorAll('[data-fd]').forEach(btn => btn.onclick = () => {
      const r = rows[+btn.dataset.fd], e = r.e, it = D.ITEMS[e.k];
      SFX.play('pick'); const msg = eatEntry(s, r.from, r.i);
      toast(`${FD.verb(e.k)} ${it.n.toLowerCase()} · ${msg}`, 1.8); openFood(); renderHome();
    });
    $('#fdClose').onclick = () => { sheetClose(); renderHome(); };
  }
  Game.openFood = openFood;
  function eatEntry(s, from, i) { // one bite from the pack or stash: hunger/thirst, plus the smaller HP heal
    const e = s[from][i], it = D.ITEMS[e.k];
    const fed = FD.eat(s, e.k);
    const hp = it.hp ? DM.Skills.heal(it.hp, s) : 0;   // 0.13: Field medic heals more
    if (hp) s.hp = Math.min(maxHp(s), s.hp + hp);
    e.n--; if (!e.n) s[from].splice(i, 1);
    Game.save();
    return [fed, hp ? `+${hp} HP` : ''].filter(Boolean).join(' · ');
  }
  function renderHouses() {
    const list = [];
    if (!SV.tutorialDone) list.push({ id: 'tutorial', type: 'tutorial', seed: 0, status: 'new', day: SV.day.key, address: '14 Halsey St', danger: 1, nLocks: 3, nZombies: 2 });
    list.push(...SV.houses);
    const el = $('#mpane');
    refreshTrader();
    const T = SV.trader, ready = T.active.filter(q => q.done || supplyReady(q)).length, away = dotLeft();
    const traderCard = SV.tutorialDone ? `<div class="hcard trader${away ? ' away' : ''}"><div class="bicon dotmini">${DOT_SVG}</div>
      <div class="hinfo"><div class="hname">${D.TRADER.name} <em>trader</em></div><div class="haddr">${away ? 'On the road · her cart is somewhere out there' : D.TRADER.place}</div>
      <div class="hmeta"><span>Level ${traderLevel()} · ${T.active.length}/2 jobs${ready ? ` · <b class="hot">${ready} ready to turn in</b>` : ''}</span></div>
      ${away ? `<div class="hdays">Dot's back in ${fmtN(away)} steps</div><div class="mbar dotbar"><i style="width:${Math.max(3, (1 - away / DOT_AWAY) * 100)}%"></i></div>`
        : `<div class="hdays">Safe zone · ${icon('caps')} ${T.caps} caps</div>`}</div>
      <div class="hbtns"><button class="mbtn${away ? ' ghost' : ''}" id="hTrader">${away ? 'Away' : 'Visit'}</button></div></div>` : '';
    const dailyCard = SV.tutorialDone && DM.Daily ? DM.Daily.cardHTML() : '';   // 0.18: the daily challenge house (daily.js)
    if (!list.length) { el.innerHTML = traderCard + dailyCard + `<div class="empty big">No houses scouted yet.<br>Walk - every ~1,000 steps turns up another door.</div>`; if ($('#hTrader')) $('#hTrader').onclick = openTrader; if (dailyCard) DM.Daily.bind(el); return; }
    const bossCard = SV.tutorialDone ? DM.Boss.cardHTML(true) : '';
    const gstage = gamestage().gs;   // 0.19: the house list's special-infected tag uses your gamestage
    el.innerHTML = traderCard + dailyCard + bossCard + list.map(h => {
      const T = D.BTYPES[h.type], left = 3 - (dayNum(SV.day.key) - dayNum(h.day)), done = h.status !== 'new' && h.status !== 'far';
      const q = h.quest && questById(h.quest), far = h.status === 'far';
      const tags = [h.nLocks ? `${h.nLocks} lock${h.nLocks > 1 ? 's' : ''}` : 'no locks', `${h.nZombies} zombie${h.nZombies === 1 ? '' : 's'}`];
      const bs = !done && !far ? EVS.bossFor(layoutOf(h)) : null;   // event mini-boss: scouts spot it from the street
      if (bs) tags.push(`<b class="evtag">${esc(bs.name.toLowerCase())} · ${bs.where}</b>`);
      if (!done && !far && h.type !== 'tutorial') { const HL = layoutOf(h); if (HL.car) tags.push('<b class="keytag">🔑 locked car</b>'); if (HL.keyRoom) tags.push('<b class="keytag">🔑 locked room</b>');   // 0.8: brass-key spots
        const ip = DM.Inf.plan(HL, h.gs != null ? h.gs : gstage), ni = ip.kinds.filter(Boolean).length, nz = (HL.zombies || []).length + ip.extra;   // 0.13: special infected (danger 3+)
        tags[1] = `${nz} zombie${nz === 1 ? '' : 's'}`; if (ni) tags.push(`<b class="inftag">☣ ${ni} special infected</b>`); }
      return `<div class="hcard${done ? ' done' : ''}${h.type === 'tutorial' ? ' tut' : ''}${q ? ' quest' : ''}">
        ${typeIcon(h.type)}
        <div class="hinfo"><div class="hname">${T.n} <em>${T.size}</em>${h.landmark ? ` <em class="first lmk">${PIN}landmark</em>` : ''}${h.type === 'tutorial' ? ' <em class="first">first house</em>' : ''}${q ? ` <em class="first">quest: ${D.QUESTS[q.type].n.toLowerCase()}</em>` : ''}</div>
          <div class="haddr">${esc(h.address)}</div>
          <div class="hmeta"><span class="danger">${SKULL.repeat(h.danger)}<span class="dim">${SKULL.repeat(5 - h.danger)}</span></span><span>${tags.join(' · ')}</span></div>
          <div class="hdays">${q ? (far ? `${Math.max(0, Math.ceil(q.away - ((SV.walked || 0) - q.base))).toLocaleString('en-US')} steps away` : q.done ? 'Job done - see Dot' : 'Reached · no rush') : done ? (h.status === 'auto' ? 'Crew searched' : 'Looted') : h.type === 'tutorial' ? 'Start here' : left <= 1 ? 'Gone tomorrow' : left + ' days left'}</div></div>
        ${done || far ? '' : q ? `<div class="hbtns"><button class="mbtn" data-loot="${h.id}">Go</button></div>` : `<div class="hbtns"><button class="mbtn" data-loot="${h.id}">Loot</button>${h.type === 'tutorial' ? '' : `<button class="mbtn ghost" data-auto="${h.id}">Crew</button>`}</div>`}
      </div>`;
    }).join('');
    const find = id => id === 'tutorial' ? { id: 'tutorial', type: 'tutorial', seed: 0, status: 'new' } : SV.houses.find(h => h.id === id);
    if ($('#hTrader')) $('#hTrader').onclick = () => { SFX.play('ui'); openTrader(); };
    DM.Boss.bind(el); if (dailyCard) DM.Daily.bind(el);
    el.querySelectorAll('[data-loot]').forEach(b => b.onclick = () => { SFX.play('ui'); loot(find(b.dataset.loot)); });
    el.querySelectorAll('[data-auto]').forEach(b => b.onclick = () => { SFX.play('ui'); autoSearch(find(b.dataset.auto)); });
  }

  // ---- base + horde night cards (phase 4)
  const HD = DM.Horde, BS = DM.Base;
  function baseCards() {
    const b = SV.base, gn = BS.gardenNote(), n = HD.next(), open = HD.windowOpen(), party = window.NET && NET.party, code = party && party.code;
    const wk = n && SV.horde.weeks[n.week], mine = wk ? wk.n : 0, sp = n ? HD.special(n.week) : { size: 1 };
    const pk = code && party.data && party.data.horde && n && party.data.horde[n.week], pkills = pk ? Object.values(pk.shifts || {}).reduce((a, x) => a + (x.k || 0), 0) : 0;
    const res = Object.keys(SV.horde.resolved).sort().map(k => [k, SV.horde.resolved[k]]).filter(([, r]) => r && !r.skip && !r.seen).pop();
    return `<div class="basecard"><div class="bci"><b>Your base</b><span>Defence <em>${BS.defense()}</em> · <em>${Math.round(b.pool).toLocaleString('en-US')}</em> build steps</span>${gn ? `<span class="gnote">Garden: ${gn}</span>` : ''}</div><button class="mbtn" id="hBase">Go to base</button></div>
      <div class="hordecard${open ? ' open' : ''}${sp.name ? ' special' : ''}"><div class="hhead"><span class="kick">${sp.name ? esc(sp.name) : 'Horde night'}</span><span class="hwhen">Sun 9 PM New York</span></div>
        ${sp.name ? `<div class="hspecial">${Math.round((sp.size - 1) * 100)}% bigger horde · better crates for everyone who holds</div>` : ''}
        ${n && new Date(n.at).getHours() !== 21 ? `<div class="hlocal">${esc(BS.when(n.at))} your time</div>` : ''}
        <div class="hcount" id="hCount">${n ? (open ? 'Watch shift open · hits in ' : 'in ') + BS.until(n.at) : ''}</div>
        <div class="hparty">${code ? `Party <b>${esc(code)}</b> · ${(party.members || []).length}/6${pk ? ` · ${pkills} kills so far` : ''}` : 'Solo horde · join a party to share one'}${mine ? ` · you: ${mine}/${HD.MAX_SHIFTS} shift${mine > 1 ? 's' : ''}` : ''}</div>
        <div class="hbtnrow">${open && mine < HD.MAX_SHIFTS ? '<button class="mbtn sm" id="hShift">Start watch shift</button>' : open ? '<span class="hdone">Shifts done this week</span>' : '<span class="hdone">Shifts open 24 h before</span>'}<button class="mbtn sm ghost" id="hParty">${code ? 'Party' : 'Join party'}</button></div>
        ${res ? resultHTML(res[0], res[1]) : ''}</div>`;
  }
  function resultHTML(week, r) {
    const title = (r.special ? r.special + ' · ' : '') + (r.hold ? (r.shifted ? 'Your base held!' : 'Your base held') : 'The horde got in');
    return `<div class="hres ${r.hold ? 'held' : 'fail'}"><b>${title}</b><span>Horde of ${r.S}${r.solo ? ' (solo)' : ''} · ${r.K} killed on shifts · ${r.A} reached your walls · your defence ${r.defense}</span>
      ${r.crate && r.crate.length ? `<div class="picons">Crate: ${r.crate.map(e => `${icon(e.k)}${D.ITEMS[e.k].n}${e.n > 1 ? ' x' + e.n : ''}`).join(' ')}</div>` : r.hold && !r.shifted ? '<span>No crate: you skipped the watch shift.</span>' : ''}
      ${r.dmg ? `<span class="bad">${esc(r.dmg)} was wrecked. Repair it at the base.</span>` : ''}${r.lost && r.lost.length ? `<span class="bad">No room for: ${r.lost.map(e => D.ITEMS[e.k].n).join(', ')}</span>` : ''}<button class="mbtn sm" data-seen="${week}">OK</button></div>`;
  }
  function bindBaseCards() {
    const b = $('#hBase'); if (!b) return;
    b.onclick = () => { SFX.play('ui'); goBase(); };
    if ($('#hShift')) $('#hShift').onclick = () => { SFX.play('ui'); startShift(); };
    $('#hParty').onclick = () => { SFX.play('ui'); partySheet(); };
    document.querySelectorAll('[data-seen]').forEach(x => x.onclick = () => { SV.horde.resolved[x.dataset.seen].seen = true; Game.save(); renderHome(); });
  }
  function goBase(o = {}) {
    if (SV.survivor.hp < 15 && o.shift) { toast('Too hurt for a shift. Eat or patch up first.', 2.2); return; }
    hideMenu();
    BS.start(Object.assign({}, o, { onExit: (res, was) => {
      SV.stats.kills += res.kills; if (res.kind === 'down') SV.stats.downs++;
      Game.save(); publish(); showMenu(); renderHome();
      if (!(was && was.shift)) toast(res.kind === 'down' ? 'You came to on the shack floor.' : 'Back to the road', 1.4);
    } }));
    setTimeout(() => tip('base'), 900);
  }
  function startShift() {
    const n = HD.windowOpen(); if (!n) { toast('The watch shift opens 24 h before horde night', 2); return; }
    if ((SV.horde.weeks[n.week] || {}).n >= HD.MAX_SHIFTS) { toast('You did all your shifts this week', 1.8); return; }
    goBase({ shift: true, week: n.week });
  }
  function partySheet() {
    const N = window.NET, p = N && N.party;
    if (!N || !N.ok) { sheetOpen(`<div class="kick">Horde night</div><h3>Party</h3><p class="mp">Up to 6 friends share one horde. Sign in first (Account & friends), then everyone types the same party code.</p><button class="mbtn" id="pAcc">Account &amp; friends</button><button class="mbtn ghost" id="pClose">Close</button>`); $('#pAcc').onclick = () => { sheetClose(); openAccount(); }; $('#pClose').onclick = sheetClose; return; }
    sheetOpen(`<div class="kick">Horde night</div><h3>Party</h3>${p && p.code ? `<p class="mp">You are in <b>${esc(p.code)}</b> (${(p.members || []).length}/6): ${(p.members || []).map(m => '@' + esc(m)).join(', ')}.</p><p class="mp">Everyone's watch-shift kills thin the same horde. Each base is checked against what is left.</p><button class="mbtn ghost" id="pLeave">Leave party</button>`
      : `<p class="mp">Up to 6 friends share one horde, with one deadline: Sunday 9 PM New York time. Everyone types the same code.</p><input id="pCode" placeholder="party code, e.g. brooklyn" maxlength="20" autocapitalize="off" autocorrect="off" spellcheck="false" style="display:block;width:100%;box-sizing:border-box;height:50px;margin:10px 0 8px;padding:0 14px;border-radius:14px;border:2.5px solid #5a4a86;background:#11142f;color:#f6e3bb;font:800 16px Inter,system-ui,sans-serif;-webkit-user-select:text;user-select:text"><button class="mbtn" id="pJoin">Join party</button><div class="mp" id="pMsg"></div>`}
      <button class="mbtn ghost" id="pClose">Close</button>`);
    $('#pClose').onclick = sheetClose;
    if ($('#pJoin')) $('#pJoin').onclick = async () => { const r = await N.partyJoin($('#pCode').value); if (r.ok) { sheetClose(); renderHome(); toast('Joined the party', 1.6); } else $('#pMsg').textContent = r.error || 'Could not join'; };
    if ($('#pLeave')) $('#pLeave').onclick = async b => { const el = $('#pLeave'); if (!el.dataset.sure) { el.dataset.sure = 1; el.textContent = 'Tap again to leave'; return; } await N.partyLeave(); sheetClose(); renderHome(); };
  }
  // After the deadline: resolve last week's horde once, on this phone, from the party record (or solo).
  let resolving = false;
  async function resolveHorde() {
    if (resolving || !SV || !SV.survivor || DM.scene) return;
    const st = SV.horde, pv = HD.prev(); if (!pv || st.resolved[pv.week]) return;
    if (!st.since || pv.week < st.since) { st.resolved[pv.week] = { skip: 1 }; Game.save(); return; }
    resolving = true;
    try {
      await HD.flush(st);
      const N = window.NET, signed = N && N.handle && N.token;
      let party = null;
      if (signed) {
        party = N.ok ? await HD.partyNow() : null;
        if (!N.ok && HD.now() - pv.at < 72 * 36e5) return;   // signed in but offline: wait (up to 3 days) for the party record
        if (!N.ok) party = N.party || null;
      }
      const me = signed ? String(N.handle).toLowerCase() : 'me', local = st.weeks[pv.week];
      const shifts = Object.assign({}, (party && party.data && party.data.horde && party.data.horde[pv.week] && party.data.horde[pv.week].shifts) || {});
      if (local && (!shifts[me] || (shifts[me].k || 0) < local.k)) shifts[me] = { k: local.k, d: local.d, n: local.n };
      const code = party && party.code || '', members = party ? (party.members || []).slice() : [me];
      if (party && !members.includes(me)) members.push(me);
      const r = HD.compute({ code, week: pv.week, members, shifts, me, defense: BS.defense() });
      const rnd = D.mulberry32(D.hashStr((code || 'solo') + ':' + pv.week + ':' + me + ':' + SV.seedBase));
      r.crate = []; r.lost = [];
      const sp = HD.special(pv.week); if (sp.name) r.special = sp.name;   // e.g. the Black Friday horde: a better crate
      if (r.hold && r.shifted) { const stacks = D.toStacks(D.rollLoot(sp.crate && D.LOOT[sp.crate] ? sp.crate : 'hordecrate', rnd), rnd, { base: 2.2, bonus: 0 }); for (const e of stacks) { const left = give(e.k, e.n, e.d, e.q); if (left < e.n) r.crate.push({ k: e.k, n: e.n - left }); if (left) r.lost.push({ k: e.k, n: left }); } SV.trader.caps += 10 + (sp.caps || 0); }
      if (!r.hold) r.dmg = BS.hordeDamage(rnd);
      r.at = Date.now(); r.code = code; delete r.members;
      st.resolved[pv.week] = r; DM.Crew.onTask('guard', 3); Game.save(); renderHome();
      toast(r.hold ? 'Horde night is over - your base held' : 'Horde night is over - the horde got in', 2.6);
    } catch (e) { console.warn('horde', e); } finally { resolving = false; }
  }
  Game.resolveHorde = resolveHorde;

  // ---- pack & stash (0.15: split into Equipped / Backpack / Stash sub-tabs; every item shows its category)
  let sel = null; // {from:'pack'|'stash'|'hands'|'quiver', i}
  let gTab = 'gear';   // which sub-tab of the Gear tab is showing
  const subOf = from => from === 'pack' ? 'pack' : from === 'stash' ? 'stash' : 'gear';
  const catTag = k => { const c = D.cat(k); return `<small class="ctag" style="--cc:${D.CATS[c].c}">${D.CATS[c].n}</small>`; };
  Game.catTag = catTag;
  const junkOf = s => s.stash.map((e, i) => ({ e, i })).filter(r => D.cat(r.e.k) === 'sell' && D.VALUE[r.e.k] !== 0);
  function sortList(list) { const o = k => D.CAT_ORDER.indexOf(D.cat(k)); list.sort((a, b) => o(a.k) - o(b.k) || D.ITEMS[a.k].n.localeCompare(D.ITEMS[b.k].n)); }
  function renderStash() {
    if (stashHost && !document.body.contains(stashHost)) stashHost = null;
    const s = SV.survivor, el = stashHost || $('#mpane');
    if (stashHost && gTab === 'gear') gTab = 'stash';   // the stash chest at the base: just the pack and the chest
    const hd = handsDmg();
    const slot = (e, from, i) => {
      const it = D.ITEMS[e.k], on = sel && sel.from === from && sel.i === i, up = it.w && from !== 'hands' ? wDmg(e) - hd : 0, q = it.w ? D.qOf(e) : 0;   // 0.19: quality
      return `<button class="slot${it.rare ? ' rare' : ''}${q ? ' wq q' + q : ''}${on ? ' sel' : ''}" data-from="${from}" data-i="${i}"${q ? ` style="--qc:${D.QUAL[q].c}"` : ''}>${icon(e.k)}<span>${it.n}</span>${q ? qTag(e) : catTag(e.k)}${e.n > 1 ? `<i class="cnt">x${e.n}</i>` : ''}${up > 0 ? `<em class="up">+${up} dmg</em>` : ''}${e.d != null && it.w ? `<i class="dur"><i style="width:${Math.max(4, Math.min(100, e.d / D.wMax(e) * 100))}%"></i></i>` : ''}</button>`;
    };
    const empty = n => Array.from({ length: Math.max(0, n) }, () => '<div class="slot ph"></div>').join('');
    const A = from => sel && sel.from === from ? '<div id="sacts"></div>' : '';
    const better = betterBadge() && s.better, bIn = list => better && list.some(e => e.k === s.better) ? '<i class="sbadge">!</i>' : '';
    const seg = `<div class="seg" id="gtabs">${stashHost ? '' : `<button data-g="gear">Equipped</button>`}<button data-g="pack">Backpack <i>${s.pack.length}/${packSlots()}</i>${bIn(s.pack)}</button><button data-g="stash">Stash <i>${s.stash.length}/${STASH_SLOTS}</i>${bIn(s.stash)}</button></div>`;
    let body = '';
    if (gTab === 'gear') {
      const h = s.hands, hw = h && D.ITEMS[h.k], worn = Object.values(s.look.cos || {}).filter(c => D.COS[c]);
      const gear = [s.shoes && 'Quiet shoes', s.lockset && 'Lockpick set'].filter(Boolean), xl = DM.Skills.xpLine(s), pts = DM.Skills.points(s), f = s.food || { h: 0, t: 0 };
      body = `<div class="eqrow">
        <button class="eqslot${h ? ' wq q' + D.qOf(h) : ''}${sel && sel.from === 'hands' ? ' sel' : ''}" ${h ? `data-from="hands" data-i="0" style="--qc:${D.QUAL[D.qOf(h)].c}"` : 'id="eqFists"'}><i class="eqk">Weapon · hand</i>${h ? icon(h.k) : '<span class="eqnone">✊</span>'}<b>${h ? esc(hw.n) : 'Fists'}</b>${h ? qTag(h) : ''}<span>${hd} dmg${h && h.d != null ? ` · ${Math.round(Math.min(1, h.d / D.wMax(h)) * 100)}%` : ''}</span>${h && h.d != null ? `<i class="dur"><i style="width:${Math.max(4, Math.min(100, h.d / D.wMax(h) * 100))}%"></i></i>` : ''}</button>
        <button class="eqslot quiv${sel && sel.from === 'quiver' ? ' sel' : ''}" data-from="quiver" data-i="0"><i class="eqk">Quiver</i>${(s.quiver || {}).n ? icon('arrow') : `<img class="dim" alt="" src="${ART.iconURL.arrow}">`}<b>${(s.quiver || {}).n || 0} arrow${(s.quiver || {}).n === 1 ? '' : 's'}</b><span>max ${D.QUIVER} · no pack slot</span></button>
        <div class="eqslot"><i class="eqk">Backpack</i>${s.packBonus ? icon(s.packBonus >= 4 ? 'backpack' : 'packplus') : `<img class="dim" alt="" src="${ART.iconURL.backpack}">`}<b>${packSlots()} slots</b><span>${s.packBonus ? `+${s.packBonus} from upgrades` : 'No upgrade yet'}</span></div>
        <button class="eqslot cos" id="eqWard"><i class="eqk">Cosmetics</i><span class="eqcos">${worn.length ? worn.slice(0, 4).map(c => `<img alt="" src="${ART.iconURL['cos_' + c]}">`).join('') : '<img alt="" src="' + ART.iconURL.cosS_beanie + '">'}</span><b>Wardrobe →</b><span>${worn.length ? worn.length + ' worn' : 'Nothing worn'}${newCos() ? ` · <em class="newtxt">${newCos()} new</em>` : ''}</span></button>
      </div>${A('hands')}${A('quiver')}
      <div class="kick sect">Always with you</div>
      <div class="gline"><span class="gi">🔑</span><div><b>Keyring · ${+s.keys || 0} brass key${(+s.keys || 0) === 1 ? '' : 's'}</b><span>Opens locked cars and key-locked rooms · no pack slot</span></div></div>
      ${gear.length ? `<div class="gline"><span class="gi">👟</span><div><b>${gear.join(' · ')}</b><span>${[s.shoes && 'footsteps -30%', s.lockset && 'wider sweet spots, picks snap less'].filter(Boolean).join(' · ')}</span></div></div>` : ''}
      <div class="kick sect">You</div>
      <button class="gline tap${pts ? ' hot' : ''}" id="gSkills"><span class="gi">★</span><div><b>Level ${xl.L} · skills</b><span>${pts ? `${pts} skill point${pts > 1 ? 's' : ''} to spend` : 'Five skill trees · 1 point a level'}</span></div><em>›</em></button>
      ${(g => `<div class="gline gsline"><span class="gi">☣</span><div><b>Gamestage ${g.gs}</b><span>${esc(g.fx.t > 0 ? `Zombies +${Math.round((g.fx.hp - 1) * 100)}% tougher, specials more common, better weapon finds` : 'Low: zombies as tough as ever. Grows with level, days played and your best weapon')}</span></div></div>`)(gamestage())}
      <button class="gline tap" id="gFood"><span class="gi">🍗</span><div><b>Eat &amp; drink</b><span>Hunger ${Math.round(f.h)} · Thirst ${Math.round(f.t)}</span></div><em>›</em></button>`;
    } else if (gTab === 'pack') {
      body = `<div class="ghead"><span class="kick">Backpack · ${s.pack.length}/${packSlots()} slots</span>${s.pack.length > 1 ? '<button class="mini" id="sSortP">Sort</button>' : ''}</div>
      <div class="grid g4">${s.pack.map((e, i) => slot(e, 'pack', i)).join('')}${empty(packSlots() - s.pack.length)}</div>${A('pack')}
      ${!s.pack.length ? '<div class="ghint">Empty. Whatever you loot goes here; anything that does not fit is left on the floor.</div>' : !sel ? `<div class="ptools"><button class="mbtn sm" id="sAll">Stash all</button></div><div class="ghint">Tap an item to eat, equip, use or move it.</div>` : ''}`;
    } else {
      const junk = junkOf(s), jv = junk.reduce((a, r) => a + Math.max(1, Math.floor(D.valueOf(r.e.k, r.e.d) * r.e.n)), 0), away = dotLeft();
      body = `<div class="ghead"><span class="kick">${stashHost ? 'Stash chest' : 'Stash chest · at your base'} · ${s.stash.length}/${STASH_SLOTS}</span>${s.stash.length > 1 ? '<button class="mini" id="sSortS">Sort</button>' : ''}</div>
      <div class="grid g5">${s.stash.map((e, i) => slot(e, 'stash', i)).join('')}${empty(Math.min(s.stash.length ? (5 - s.stash.length % 5) % 5 + 5 : 10, STASH_SLOTS - s.stash.length))}</div>${A('stash')}
      ${!s.stash.length ? '<div class="ghint">Nothing stored yet. Move things here from the Backpack tab so a bad run cannot cost you them.</div>' : ''}
      ${junk.length && !sel ? `<div class="ptools"><button class="mbtn sm${away ? ' ghost' : ''}" id="sJunk"${away ? ' disabled' : ''}>${away ? `Dot is away · sell junk in ${fmtN(away)} steps` : `Sell junk to Dot · ${icon('caps')}${jv}`}</button></div>` : ''}`;
    }
    el.innerHTML = seg + body;
    el.querySelectorAll('#gtabs button').forEach(b => { b.classList.toggle('on', b.dataset.g === gTab); b.onclick = () => { if (gTab === b.dataset.g) return; gTab = b.dataset.g; sel = null; SFX.play('ui'); renderStash(); }; });
    if (el.querySelector('#eqWard')) el.querySelector('#eqWard').onclick = () => { SFX.play('ui'); sel = null; stashHost = null; if (DM.scene) { toast('The wardrobe is on the home screen', 1.6); return; } editLook('wardrobe'); };
    if (el.querySelector('#eqFists')) el.querySelector('#eqFists').onclick = () => toast(s.pack.concat(s.stash).some(e => D.isWeapon(e.k)) ? 'Open Backpack or Stash, tap a weapon, then Equip' : 'No weapon yet - they turn up in kitchens, garages and lockers', 2);
    if (el.querySelector('#gSkills')) el.querySelector('#gSkills').onclick = () => { SFX.play('ui'); DM.Skills.open(() => renderHome()); };
    if (el.querySelector('#gFood')) el.querySelector('#gFood').onclick = () => { SFX.play('ui'); openFood(); };
    el.querySelectorAll('[data-from]').forEach(b => b.onclick = () => { const f = b.dataset.from, i = +b.dataset.i; sel = sel && sel.from === f && sel.i === i ? null : { from: f, i }; SFX.play('ui'); renderStash(); });
    for (const [id, list] of [['#sSortP', s.pack], ['#sSortS', s.stash]]) if (el.querySelector(id)) el.querySelector(id).onclick = () => { sortList(list); sel = null; SFX.play('ui'); Game.save(); renderStash(); toast('Sorted by kind', 1); };
    if (el.querySelector('#sAll')) el.querySelector('#sAll').onclick = () => {
      for (let i = s.pack.length - 1; i >= 0; i--) { const e = s.pack[i]; const n = addTo(s.stash, STASH_SLOTS, e.k, e.n, e.d); e.n -= n; if (!e.n) s.pack.splice(i, 1); }
      SFX.play('ui'); Game.save(); renderStash(); toast(s.pack.length ? 'Stash is full - some things stayed in your pack' : 'Everything is in the stash', 1.8);
    };
    if (el.querySelector('#sJunk')) el.querySelector('#sJunk').onclick = () => { SFX.play('ui'); sellJunk(); };
    if (sel) stashActions();
  }
  // 0.15: sell every "Sell" item in the stash to Dot in one go (she has to be in - it counts as a visit)
  function sellJunk() {
    const s = SV.survivor, junk = junkOf(s);
    if (!junk.length) return;
    if (dotLeft()) { toast(`Dot is on the road - back in ${fmtN(dotLeft())} steps`, 2); return; }
    const val = r => Math.max(1, Math.floor(D.valueOf(r.e.k, r.e.d) * r.e.n)), tot = junk.reduce((a, r) => a + val(r), 0);
    sheetOpen(`<div class="kick">Auntie Dot · sell junk</div><h3>Sell ${junk.length} thing${junk.length === 1 ? '' : 's'} for ${tot} caps?</h3>
      <div class="jlist">${junk.map(r => `<div class="jrow">${icon(r.e.k)}<span>${esc(D.ITEMS[r.e.k].n)}${r.e.n > 1 ? ' x' + r.e.n : ''}</span><b>${icon('caps')}${val(r)}</b></div>`).join('')}</div>
      <p class="mp dim">Only things marked <b>Sell</b> (no crafting or base use). Dot counts this as a visit: she heads off for about ${fmtN(DOT_AWAY)} steps after.</p>
      <div class="btnrow"><button class="mbtn sm ghost" id="jNo">Keep them</button><button class="mbtn sm" id="jYes">Sell · ${tot} caps</button></div>`);
    $('#jNo').onclick = sheetClose;
    $('#jYes').onclick = () => {
      for (const r of junk.slice().sort((a, b) => b.i - a.i)) s.stash.splice(r.i, 1);
      SV.trader.caps += tot; dotVisit(); SFX.play('pick'); Game.save(); sheetClose(); renderStash(); toast(`Dot paid ${tot} caps`, 1.8);
    };
  }
  // the quiver: fill it from the stash/pack, or put its arrows away in the stash
  function quiverActions(s, acts) {
    const q = s.quiver = s.quiver || { n: 0 }, spare = s.pack.concat(s.stash).filter(e => e.k === 'arrow').reduce((a, e) => a + e.n, 0);
    const done = msg => { sel = null; Game.save(); reHost(); if (msg) toast(msg, 1.6); };
    acts.innerHTML = `<div class="sact"><span><b>Quiver</b> ${q.n}/${D.QUIVER} <em>arrows here never use a pack slot and never spill when you go down</em></span></div>`;
    const row = acts.firstChild, add = (t, fn, ghost) => { const b = document.createElement('button'); b.className = 'mbtn sm' + (ghost ? ' ghost' : ''); b.textContent = t; b.onclick = () => { SFX.play('pick'); fn(); }; row.appendChild(b); };
    if (spare && q.n < D.QUIVER) add(`Fill from stash/pack (${Math.min(spare, D.QUIVER - q.n)})`, () => { const want = Math.min(spare, D.QUIVER - q.n); let need = want; for (const list of [s.pack, s.stash]) for (let i = list.length - 1; i >= 0 && need; i--) if (list[i].k === 'arrow') { const t = Math.min(need, list[i].n); list[i].n -= t; need -= t; if (!list[i].n) list.splice(i, 1); } q.n += want; done(`Quiver: ${q.n} arrows`); });
    if (q.n) add('Put in stash', () => { const n = addTo(s.stash, STASH_SLOTS, 'arrow', q.n); if (!n) return toast('Stash is full', 1.4); q.n -= n; done(`${n} arrows to the stash`); }, !!spare);
    if (!q.n && !spare) add('No arrows yet', () => toast('Arrows: Dot\'s shop, gym lockers, or craft them with the arrow blueprint', 2.2), true);
  }
  function stashActions() {
    const s = SV.survivor, acts = (stashHost || $('#mpane')).querySelector('#sacts');
    if (sel.from === 'quiver') { quiverActions(s, acts); return; }
    const e = sel.from === 'hands' ? { k: s.hands.k, n: 1, d: s.hands.d, q: D.qOf(s.hands) } : s[sel.from][sel.i];
    if (!e) { sel = null; return; }
    const it = D.ITEMS[e.k], btns = [];
    const done = msg => { sel = null; Game.save(); reHost(); if (msg) toast(msg, 1.4); };
    if (it.w && sel.from !== 'hands') btns.push(['Equip' + (wDmg(e) > handsDmg() ? ` · +${wDmg(e) - handsDmg()} dmg` : ''), () => { const cur = s.hands; s.hands = { k: e.k, d: e.d, q: D.qOf(e) }; s[sel.from].splice(sel.i, 1); if (cur) addTo(s.pack, packSlots(), cur.k, 1, cur.d, D.qOf(cur)) || addTo(s.stash, STASH_SLOTS, cur.k, 1, cur.d, D.qOf(cur)); Game.onEquip(); done('Equipped ' + it.n.toLowerCase() + ' - it is in your hand now'); }, 'big']);
    if (sel.from === 'pack') btns.push(['To stash', () => { const n = addTo(s.stash, STASH_SLOTS, e.k, e.n, e.d, e.q); if (!n) return toast('Stash is full', 1.4); e.n -= n; if (!e.n) s.pack.splice(sel.i, 1); done(); }]);
    if (sel.from === 'stash') btns.push(['To pack', () => { const n = addTo(s.pack, packSlots(), e.k, e.n, e.d, e.q); if (!n) return toast('Pack is full', 1.4); e.n -= n; if (!e.n) s.stash.splice(sel.i, 1); done(); }]);
    if (sel.from === 'hands') btns.push(['Unequip', () => { if (!addTo(s.pack, packSlots(), e.k, 1, e.d, e.q) && !addTo(s.stash, STASH_SLOTS, e.k, 1, e.d, e.q)) return toast('No room', 1.4); s.hands = null; done(); }]);
    if (it.w) {
      const cost = s.job === 'mechanic' ? 1 : 2, max = D.wMax(e);   // 0.19: max durability by quality
      if (e.d < max) btns.push([`Repair (${cost} scrap)`, () => {
        const have = s.pack.concat(s.stash).filter(x => x.k === 'scrap').reduce((a, x) => a + x.n, 0);
        if (have < cost) return toast(`Needs ${cost} scrap metal`, 1.6);
        let need = cost; for (const list of [s.stash, s.pack]) for (let j = list.length - 1; j >= 0 && need; j--) if (list[j].k === 'scrap') { const t = Math.min(need, list[j].n); list[j].n -= t; need -= t; if (!list[j].n) list.splice(j, 1); }
        const nd = Math.min(max, e.d + Math.round(max * .4));
        if (sel.from === 'hands') s.hands.d = nd; else e.d = nd;
        done('Repaired');
      }]);
    }
    if (it.use && it.use !== 'Read' && (it.hp || it.sta || FD.isFood(e.k)) && !it.slots) btns.push([it.use, () => { if (FD.isFood(e.k)) { const m = eatEntry(s, sel.from, sel.i); done(`${FD.verb(e.k)} ${it.n.toLowerCase()} · ${m}`); return; } s.hp = Math.min(maxHp(s), s.hp + (it.hp || 0)); e.n--; if (!e.n) s[sel.from].splice(sel.i, 1); done(`${it.n}: +${it.hp || 0} HP`); }]);
    if (it.cure && DM.Infect) btns.push([it.use, () => { if (!DM.Infect.is(s)) return toast('You are not infected - keep them for a bite', 1.8); const m = DM.Infect.cure(s); e.n--; if (!e.n) s[sel.from].splice(sel.i, 1); done(m); renderHome(); }, 'big']);   // 0.18: antibiotics
    if (it.slots || it.bp || e.k === 'shoes' || e.k === 'lockset') btns.push([it.use, () => { const msg = Game.applyUse(e.k); if (!msg) return; e.n--; if (!e.n) s[sel.from].splice(sel.i, 1); done(msg); }]);
    if (e.k === 'note') btns.push(['Read', () => { const nd = e.d && typeof e.d === 'object' ? e.d : null; toast(nd && nd.text ? nd.text + '  (found at ' + nd.addr + ')' : 'The note is too faded to make sense of here.', nd ? 5 : 2); }]);
    if (it.gift) btns.push(['Open', () => {
      e.n--; if (!e.n) s[sel.from].splice(sel.i, 1);
      const stacks = D.toStacks(D.rollLoot('giftbox')), lost = [];
      for (const x of stacks) { const left = give(x.k, x.n, x.d, x.q); if (left) lost.push({ k: x.k, n: left }); }
      done(); showResult('Gift box', stacks, lost, 'Somebody wrapped this before it all went bad. It went into your pack (the stash if the pack is full).', 'Opened');
    }, 'big']);
    acts.innerHTML = `<div class="sact"><span><b>${it.n}</b>${e.n > 1 ? ' x' + e.n : ''}${it.tag ? ` <em>${it.tag}</em>` : ''}${it.w ? ` <i class="wst">${D.QUAL[D.qOf(e)].n} · ${wDmg(e)} dmg · ${Math.round(Math.min(1, (e.d != null ? e.d : D.wMax(e)) / D.wMax(e)) * 100)}% of ${D.wMax(e)}${sel.from === 'hands' ? ' · in your hand' : ''}</i>` : ''}<small class="cline" style="--cc:${D.CATS[D.cat(e.k)].c}">${esc(D.catLine(e.k, e.d))}</small></span></div>`;
    const row = acts.firstChild;
    btns.forEach(([t, fn, big], i) => { const b = document.createElement('button'); b.className = big ? 'mbtn eqbig' : 'mbtn sm' + (i ? ' ghost' : ''); b.textContent = t; b.onclick = () => { SFX.play('pick'); fn(); }; row.appendChild(b); });
  }

  // ---- settings: export / import / reset
  function sheetOpen(html) { const el = $('#msheet'); el.innerHTML = `<div class="mcard">${html}</div>`; el.classList.add('on'); el.onclick = e => { if (e.target === el) el.classList.remove('on'); }; }
  const sheetClose = () => $('#msheet').classList.remove('on');
  function openSettings() {
    const MC = DM.Music ? DM.Music.cfg() : null;
    sheetOpen(`<div class="kick">Settings</div><button class="mbtn" id="mHow">How to play</button>
      ${MC ? `<h3 class="sndh">Sound</h3><div class="btnrow tipsrow"><span>Music <small>· eerie, speeds up with danger</small></span><button class="mbtn sm${MC.music ? '' : ' ghost'}" id="mMus">${MC.music ? 'On' : 'Off'}</button></div>
      <label class="volrow"><span>Music volume</span><input type="range" id="mMvol" min="0" max="100" value="${Math.round(MC.mvol * 100)}"${MC.music ? '' : ' disabled'}></label>
      <label class="volrow"><span>Sound effects</span><input type="range" id="mSfx" min="0" max="100" value="${Math.round(MC.sfx * 100)}"></label>` : ''}
      <div class="btnrow tipsrow"><span>First-time tips</span><button class="mbtn sm ghost" id="mTips">${SV.tips.off ? 'Turn on' : 'Turn off'}</button></div><h3>Save</h3>
      <p class="mp">Your survivor, stash and today's houses are saved on this phone. Copy the text below to keep a backup, or paste one to restore.</p>
      <textarea id="mExp" readonly>${esc(JSON.stringify(SV))}</textarea>
      <div class="btnrow"><button class="mbtn sm" id="mCopy">Copy</button></div>
      <textarea id="mImp" placeholder="Paste a backup here"></textarea>
      <div class="btnrow"><button class="mbtn sm" id="mLoad">Load backup</button><button class="mbtn sm ghost" id="mClose">Close</button></div>
      <div class="btnrow"><button class="mbtn sm" id="mAcc">Account &amp; friends</button></div>
      <div class="mp dim">${esc(syncText())}</div>`);
    $('#mAcc').onclick = () => { sheetClose(); openAccount(); };
    if ($('#mMus')) {
      $('#mMus').onclick = () => { DM.Music.set('music', !DM.Music.cfg().music); SFX.play('ui'); openSettings(); };
      $('#mMvol').oninput = e => DM.Music.set('mvol', e.target.value / 100);
      $('#mSfx').oninput = e => DM.Music.set('sfx', e.target.value / 100);
      $('#mSfx').onchange = () => SFX.play('pick');
    }
    $('#mHow').onclick = () => { SFX.play('ui'); openHowTo(); };
    $('#mTips').onclick = () => { if (SV.tips.off) { SV.tips = {}; toast('Tips back on - you will see each one again', 1.8); } else { SV.tips.off = 1; toast('Tips off', 1.2); } Game.save(); openSettings(); };
    $('#mCopy').onclick = () => { const t = $('#mExp'); t.select(); try { navigator.clipboard.writeText(t.value); } catch (e) { document.execCommand('copy'); } toast('Copied', 1); };
    $('#mLoad').onclick = () => {
      try { const v = JSON.parse($('#mImp').value); if (!v || v.v !== VER || !('houses' in v)) throw new Error('not a Dead Miles save'); SV = migrate(v); DM.S = SV.survivor; Game.save(); sheetClose(); boot2(); toast('Backup loaded', 1.6); }
      catch (e) { toast('That does not look like a save: ' + e.message, 2.4); }
    };
    $('#mClose').onclick = sheetClose;
  }
  const HOWTO = [
    ['Steps & houses', 'All your daily steps count. About every 1,000 steps scouts another house (up to 10 a day; the more you walk, the better the odds of big places like police stations and mansions). Houses wait 3 days. Loot one yourself, or send your Crew - they bring back less and never find secrets.'],
    ['Looting', 'Walk with the joystick (drag anywhere). Stand by furniture and tap the magnifier to search. Searching makes noise. Your pack has 12 slots; things stack. Leave by the front door - anything you dropped stays behind. Your level makes searches a little faster and luckier (up to level 10).'],
    ['Levels & skills', 'Everything you do earns XP: searching, kills (special infected more), secrets, locks and keys, Dot\'s jobs, horde watch shifts and boss fights. Every level gives 1 skill point - early levels come every few houses, later ones slower. Tap Skills on the home card to spend them in five trees, 5 ranks each: Scavenging (faster searches, extra finds, Keen eye, Pack rat), Stealth (quieter steps and searches, zombies spot you later), Combat (melee and bow damage, longer dodge, more HP), Survival (slower hunger and thirst, better healing, more stamina) and Lockwork (wider sweet spots, picks last longer, quieter crowbar). Each rank needs the one before it; later ranks cost 2-3 points. Your job gives rank 1 of its tree free (Scavenger: Scavenging, Hunter: Stealth, Brawler: Combat, Mechanic: Survival, Thief: Lockwork). Survivors from before 0.13 kept Quiet hands, Keen eye and Pack rat for free and got every point their level earned. Once a week you can reset your skills for 150 caps.'],
    ['Weapon quality', 'Every weapon (bows and crowbars too) has a quality: Rusty, Worn, Solid, Fine or Masterwork, shown as stars and a coloured name and border on its card. Each tier above Rusty adds about 8% damage and 15% durability, so a Masterwork hits about a third harder and lasts 60% longer than a Rusty one - nice, never game-breaking. Most house finds are Rusty or Worn; danger 3+ buildings, hidden stashes, key-locked rooms and car trunks, special infected and raiders carry better ones. Crafted weapons come out Worn or Solid (better with your level and the Combat and Scavenging trees). Dot sells Worn, sometimes Solid. Masterwork is very rare: the weekly boss and the deepest places. Weapons from before 0.19 are Worn.'],
    ['Gamestage', 'Your gamestage (Gear tab and the Skills screen) is how tough the world is for you: your level, plus a point for every 3 days played (up to 20), plus 3 for each quality tier your best weapon is above Worn. Up to gamestage 10 nothing changes. Above that, zombies get a little more health and bite (up to +25% at gamestage 60, the cap), special infected turn up more often (and from about 25, now and then in danger 2 places too), and weapons you find lean a bit better, with a slightly better shot at rare finds. It is yours alone: a friend who mostly walks meets the zombies they are ready for. The gamestage is fixed when you go into a house, so coming back to a run meets the same zombies.'],
    ['Special infected', 'Danger 3+ places (pharmacies, schools, police stations, mansions; look for the ☣ tag on the house list) have a couple more zombies and some special infected. Armored (riot gear, police stations): slow and hits hard; melee barely dents it until the armour cracks, arrows do full damage. Runner: fast and fragile, sprints the moment it sees you - you can only outrun it at a sprint. Bloater (green and swollen, pharmacies): bursts into a toxic cloud when it dies - shoot it, or dodge straight out. Screamer (gaping mouth, schools and mansions): if it sees you it stops and shrieks, and when it finishes every zombie in the house comes for you - kill it fast or stay out of sight. They carry better loot (ammo and police cosmetics, meds, lockpicks) and give much more XP.'],
    ['Daily challenge', 'Every day one special house sits at the top of the Houses list: the same house for everyone (same layout, same zombies, same loot in every container), no scouting needed. A new one at midnight New York time. Only your first run counts: the score is loot value taken x4, 60 per secret, 15 per zombie (40 per special infected), up to 150 for speed if you searched at least 60% of the containers, and -150 if you go down (and the loot score is halved). Today\'s scores from everyone show on the card and after your run (sign in to post yours; offline your score waits on the phone). You can go back in for fun - the house stays as you left it.'],
    ['Infection', 'About 1 in 10 zombie hits that land infects you (a bit more from special infected; Field medic halves it). Raiders and bosses do not. While infected your max HP is 5 lower, then 5 more each day, never more than 25 - it never kills you - and you get hungry a little faster. Antibiotics cure it at once: rare in pharmacies, nurse offices and medicine cabinets, and Dot sells them from trader level 2. Left alone it clears after about 5 days.'],
    ['Raiders', 'Rarely (about 1 run in 25-30, more in danger 3+ places) other survivors raid the house you are in: 2 or 3 masked raiders come up the stoop after you have been inside a while. They go for containers you have not searched and empty them, fight you on sight (one may have a pistol: a red line aims at you, then locks - dodge out of it) and fight zombies too, and run for the door when badly hurt. Kill them for part of what they stole plus ammo, meds and sometimes a weapon or a cosmetic. Any that get away are gone with their loot. They never take keys, notes, the hook pole or Dot\'s parcels.'],
    ['Pack, stash & item kinds', 'The Gear tab has three parts: Equipped (weapon, quiver, keyring, pack size, wardrobe, skills, eat & drink), Backpack (what you carry into houses) and Stash (the chest at your base). Every item shows its kind: Food, Drink, Medical, Weapon, Ammo, Tool, Gear, Material (used at the workbench or for base building - tap it to see what for), Sell (junk worth caps and nothing else, like paperbacks and watches), Key, Seed, Decor, Blueprint. Sort tidies a list by kind. Sell junk in the Stash tab sells every Sell item to Dot in one go when she is around.'],
    ['Locks & secrets', 'Locked doors, safes and cages hold the best loot. Lockpicks are silent but snap; a crowbar always works but is loud. Brass keys open the two locks nothing else can: a locked car outside a few houses (one key opens the glove box and the trunk, and the trunk always holds something good) and a key-locked room (rare; it always holds a prize that fits the building - a gun cabinet at the police station, the back room at a pharmacy, a safe room in a mansion). Look for the 🔑 tag on the house list. Keys live on your keyring (no pack slot, never lost) and are used up. Some locked rooms hide their key somewhere else in the same house. After you search most of a house, hidden spots can open: a loose floorboard under a rug, a sliding bookshelf, an attic hatch (needs a hook pole), a cracked wall panel. Torn notes give hints about the house you find them in; they fall apart once you leave.'],
    ['Weapons & equipping', 'The weapon in your hand is what you fight with. At home: Gear > Backpack or Stash > tap a weapon > Equip. In a house: tap the Swap button (bottom right) to pick any weapon in your pack. Weapons wear out - repair them with scrap. Zombies hear noise; you can run (push the stick far) and dodge.'],
    ['Cosmetics & wardrobe', 'Cosmetics are earned: rare finds in houses and on zombies, better in mansions and police stations, plus Dot\'s shop and jobs, horde-night crates and events. They unlock straight into your Wardrobe and never use pack space. Wardrobe (home screen) > tap one to wear it. Spares are sold to Dot automatically.'],
    ['Food & water', 'Two bars under your HP: Hunger (drumstick) and Thirst (droplet). They drain with real time, even while the app is closed - about one and a half meals and two or three drinks a day - and a little faster during runs (sprinting and fighting most). Tap the bars, or a food in Gear > Backpack / Stash (or Gear > Equipped > Eat & drink), to eat or drink: beans and pie fill Hunger, water and soda fill Thirst, cranberry sauce and tomatoes a bit of both, coffee gives stamina. Garden crops are food, and a rain barrel at the base gives a drink (+50 thirst). Below 30: Hungry means slower stamina and no overnight healing; Thirsty means slower searches and max stamina 80. At 0 you lose 1 HP an hour, but never below 10 from hunger alone. Above 80 on both: +10% scavenging XP. Your crew eats from the stash separately.'],
    ['Real-world map', 'Tap Map on the home screen: it is your real neighbourhood (OpenStreetMap), drawn like the game. Real places near you - a pharmacy, a corner store, the police station, a laundromat, a school, a gas station, some houses and apartment blocks - show up as round badges. Walk past one with the map open: when you get within about 35 m it glows, and you scout it as a bonus landmark house in your list, with its real name. Up to 3 a day, on foot only (it ignores you while you are moving faster than about 30 km/h), and you have to walk up to a place - one right where you opened the map does not count until you have walked away and back. The card at the bottom shows how many you found today and points to the nearest place. Tap ? on the map for a reminder. Your phone asks for your location only while the map is open; your position is never saved or sent to the game server. Streets you have seen before show up instantly, even offline. No location or no signal? The rest of the game works the same.'],
    ['Base & farming', 'Your base is built with steps (the same steps also scout houses). Build walls, a gate, traps and garden beds; decorate with furniture you find. Plant seeds, water them with steps each day, and harvest real food. The stash chest lives here.'],
    ['Horde night', 'Every Sunday 9 PM New York time a horde hits. In the 24 hours before, do a watch shift (a 2-3 minute defence) - every kill thins the horde for your whole party. Strong bases hold and pay out a crate; weak ones lose something you repair with steps. Skip the shift and you get nothing.'],
    ['Seasonal events', 'Holidays switch on by themselves: Thanksgiving (the week around it) and Christmas (Dec 18 - Jan 2). Events bring holiday loot, a mini-boss in about 1 in 3 houses, a chain of event jobs from Dot, and once-a-year cosmetics. Thanksgiving also has the Black Friday horde: a bigger Sunday horde with better crates.'],
    ['Workbench & crafting', 'Workbench (home tab, or at the base) lists every recipe you know with each material, what you have and what you need. Tap a recipe to see what it does, every material in full with where to find it, and a big Craft button. Materials come from the stash and the pack. New recipes come from blueprints: Dot trades them, and some turn up in hidden stashes and safes.'],
    ['Crew', 'About 1 house in 25 has a survivor hiding in a closet or a secret room (more in mansions and police stations). Talk to them: with a free bunk they move into your base (2 bunks, build up to 4). Each has a role - Scavenger (crew searches bring back more), Guard (horde-night defence), Medic (heals you each morning), Gardener (waters a plant a day), Tinkerer (cheaper repairs) - and levels up slowly. Each eats 1 food a day from your STASH; three hungry days and they leave a note (they never take anything). The more crew you have, the more a Crew search brings back.'],
    ['Strays', 'Dogs and cats hide under beds, tables and sofas (about 1 house in 30). Move slowly near them (a small push on the joystick) until they trust you, then tap to coax them out - or offer food from your pack. One pet comes along on runs and at the base; up to 4 live with you. Dogs bark when a zombie spots you and sometimes sniff out a container with something good; cats make you quieter and bring little presents some mornings. Pets level from your steps. They never die: a zombie scare sends them running home, back the next day.'],
    ['Weekly boss', 'Every week (Monday to Sunday, New York time) a named boss holes up in a special house on everyone\'s list. Walk 5,000 steps that week to reach it, then fight it up to 2 times a day (90 seconds each). Red markers on the floor show where the next attack lands: a charge line, a slam ring, walkers being called. Its health is shared by your whole party for the whole week; when it falls, everyone who hit it gets a good item, caps and a chance at a boss cosmetic. Going down in a boss fight costs you nothing but the fight.'],
    ['Trader', 'Auntie Dot (top of the Houses list) is a safe zone. Take up to 2 jobs from her board, turn them in for caps and a reward you choose. Every 20 jobs raises her trader level: harder jobs, better stock, more cosmetics. Sell her spare loot (or use Sell junk in the Stash tab). She does not stay put: after each visit she moves on and is back once you have walked about 3,000 more steps (her card counts down). Jobs you took keep counting while she is away; you turn them in on your next visit.'],
  ];
  function openHowTo() {
    sheetOpen(`<div class="kick">Dead Miles</div><h3>How to play</h3>
      ${HOWTO.map(([t, d], i) => `<details class="howto"${i ? '' : ' open'}><summary>${t}</summary><p>${esc(d)}</p></details>`).join('')}
      <details class="howto"><summary>Step sync</summary><p>Your phone can send steps by itself: an iPhone Shortcut or the Android companion app. Sign in first (Account &amp; friends), then follow the guide.</p>${window.SYNC ? '<button class="mbtn sm" id="hSync">Open the step sync guide</button>' : ''}</details>
      <div class="btnrow"><button class="mbtn sm ghost" id="hBack">Back</button><button class="mbtn sm" id="hClose">Close</button></div>`);
    if ($('#hSync')) $('#hSync').onclick = () => { sheetClose(); try { SYNC.open(); } catch (e) { toast('Sync guide failed to open', 1.6); } };
    $('#hBack').onclick = openSettings; $('#hClose').onclick = sheetClose;
  }
  // The test panel hands out free steps, caps and materials, so it never opens on the
  // real site where friends play - only on local test copies and the claude.ai preview.
  function openDev() {
    if (!DM_DEV_OK) return;
    sheetOpen(`<div class="kick">Developer</div><h3>Test panel</h3>
      <div class="devgrid"><button class="mbtn sm" data-d="s1">+1,000 steps</button><button class="mbtn sm" data-d="s5">+5,000 steps</button>
      <button class="mbtn sm" data-d="day">New day</button><button class="mbtn sm" data-d="heal">Full heal</button>
      <button class="mbtn sm" data-d="q20">+20 quests done</button><button class="mbtn sm" data-d="gift">+gift boxes &amp; food</button>
      <button class="mbtn sm" data-d="caps">+100 caps</button><button class="mbtn sm" data-d="mats">+materials</button>
      <button class="mbtn sm" data-d="pool">+10,000 build steps</button><button class="mbtn sm" data-d="seeds">+seeds &amp; decor</button>
      <button class="mbtn sm" data-d="gday">Garden: +1 day</button><button class="mbtn sm" data-d="hwin">Horde: ${DM.Horde.devOffset ? 'real clock' : 'shift window'}</button>
      <button class="mbtn sm" data-d="hres">Horde: resolve now</button><button class="mbtn sm" data-d="cos">+cosmetic</button><button class="mbtn sm" data-d="wpn">+machete (stash)</button><button class="mbtn sm" data-d="crew">+crew member</button><button class="mbtn sm" data-d="pet">+stray</button>
      <button class="mbtn sm" data-d="hide">Next house: survivor + stray</button><button class="mbtn sm" data-d="boss">Boss: steps + fights</button><button class="mbtn sm" data-d="bhurt">Boss: -4,000 HP</button>
      <button class="mbtn sm" data-d="f10">Hunger+thirst 10</button><button class="mbtn sm" data-d="f100">Hunger+thirst 100</button><button class="mbtn sm" data-d="f12">+12 hours (drain)</button><button class="mbtn sm ghost" data-d="reset">Reset save</button></div>
      <div class="kick sect">Event (reloads) · now: ${EVA ? esc(EVA.ev.name) + (EVA.forced ? ' (forced)' : '') : 'none'}</div>
      <div class="chips devev">${['auto', ...EVS.ORDER, 'none'].map(v => `<button class="chip${EVS.dev.choice() === v ? ' on' : ''}" data-ev="${v}">${v === 'auto' ? 'Auto (calendar)' : v === 'none' ? 'None' : esc(EVS.get(v).name)}</button>`).join('')}</div>
      <div class="btnrow"><button class="mbtn sm ghost" id="mClose">Close</button></div>`);
    $('#msheet').querySelectorAll('[data-ev]').forEach(b => b.onclick = () => {
      EVS.dev.set(b.dataset.ev); Game.save();
      const q = new URLSearchParams(location.search); q.delete('event'); const qs = q.toString();
      location.replace(location.pathname + (qs ? '?' + qs : ''));
    });
    $('#msheet').querySelectorAll('[data-d]').forEach(b => b.onclick = () => {
      const k = b.dataset.d;
      if (k === 's1') DM.addSteps(1000, 'phone'); if (k === 's5') DM.addSteps(5000, 'phone');
      if (k === 'day') devNewDay();
      if (k === 'heal') { SV.survivor.hp = maxHp(SV.survivor); Game.save(); renderHome(); }
      if (k === 'q20') { SV.trader.completed += 20; refreshTrader(true); Game.save(); renderHome(); toast('Trader level ' + traderLevel(), 1.6); }
      if (k === 'caps') { SV.trader.caps += 100; Game.save(); renderHome(); }
      if (k === 'mats') { for (const [m, n] of [['scrap', 10], ['cloth', 6], ['tape', 3], ['wood', 4], ['nails', 12]]) addTo(SV.survivor.stash, STASH_SLOTS, m, n); Game.save(); renderHome(); }
      if (k === 'pool') { SV.base.pool += 10000; Game.save(); renderHome(); }
      if (k === 'seeds') { for (const m of ['seed_tomato', 'seed_carrot', 'seed_corn', 'd_sofa', 'd_lamp', 'd_poster', 'd_rug', 'd_gnome', 'd_lights', 'd_plant']) addTo(SV.survivor.stash, STASH_SLOTS, m, D.ITEMS[m].seed ? 3 : 1); Game.save(); renderHome(); }
      if (k === 'gday') { DM.Base.devDay(); Game.save(); renderHome(); toast('Garden: a day passed', 1.2); }
      if (k === 'hwin') { const H = DM.Horde; if (H.devOffset) H.devOffset = 0; else { const n = H.next(Date.now()); H.devOffset = n.at - Date.now() - 3 * 36e5; } renderHome(); }
      if (k === 'hres') { const H = DM.Horde, n = H.next(); H.devOffset = (H.devOffset || 0) + (n.at - H.now()) + 60e3; renderHome(); resolveHorde(); }
      if (k === 'cos') { const left = Object.keys(D.COS).filter(c => !SV.survivor.wardrobe.own[c]); if (left.length) { sheetClose(); Game.unlockCos(left[Math.floor(Math.random() * left.length)]); return; } toast('You have them all', 1.2); }
      if (k === 'wpn') { addTo(SV.survivor.stash, STASH_SLOTS, 'machete', 1, 50); Game.onWeaponLoot('machete'); Game.save(); sheetClose(); renderHome(); return; }
      if (k === 'crew') { const m = DM.Crew.dev.addCrew(); Game.save(); toast(`${m.name} joined (${DM.Crew.ROLES[m.role].n})`, 1.6); }
      if (k === 'pet') { const pt = DM.Crew.dev.addPet(Math.random() < .5 ? 'dog' : 'cat', Math.floor(Math.random() * 4)); Game.save(); toast(`${pt.name} the ${pt.kind} joined`, 1.6); }
      if (k === 'hide') { DM.Crew.forceNpc = DM.Crew.forceStray = !DM.Crew.forceNpc; toast(DM.Crew.forceNpc ? 'Every house: a survivor + a stray' : 'Back to normal odds', 1.6); }
      if (k === 'boss') { DM.Boss.dev.steps(); DM.Boss.dev.fights(); renderHome(); }
      if (k === 'bhurt') { DM.Boss.dev.hurt(4000); renderHome(); }
      if (k === 'f10' || k === 'f100') { foodTick(); const f = SV.survivor.food; f.h = f.t = k === 'f10' ? 10 : 100; Game.save(); renderHome(); toast('Hunger + thirst ' + f.h, 1.2); }
      if (k === 'f12') { SV.survivor.food.at -= 12 * 36e5; foodTick(); Game.save(); renderHome(); const f = SV.survivor.food; toast(`12 hours later: hunger ${Math.round(f.h)}, thirst ${Math.round(f.t)}`, 1.8); }
      if (k === 'gift') { for (const [m, n] of [['gift', 3], ['turkey', 1], ['pie', 3], ['cranberry', 3], ['stuffing', 3]]) addTo(SV.survivor.stash, STASH_SLOTS, m, n); Game.save(); renderHome(); }
      if (k === 'reset') { if (b.dataset.sure) { try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ } SV = migrate(fresh()); DM.S = null; sheetClose(); boot2(); return; } b.dataset.sure = 1; b.textContent = 'Tap again to wipe'; return; }
      openDev();
    });
    $('#mClose').onclick = sheetClose;
  }

  // ---------------------------------------------------------------- boot
  function boot2() {
    rollDay();
    if (!SV.survivor) { cre = { name: '', look: ART.LOOK.random(), job: 'scavenger' }; creEdit = false; E.buildSurvivor(cre.look).then(renderCreate); return; }
    DM.S = SV.survivor;
    // 0.17: a deep run still going (the app was closed mid-run) drops her straight back in - no home screen in between (deep.js RESUME)
    E.buildSurvivor(SV.survivor.look).then(() => { if (DM.Deep && !DM.scene && DM.Deep.boot()) return; renderHome(); });
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
      const line = st => st && st.survivor ? `${esc(st.survivor.name)} · ${D.JOBS[st.survivor.job].n} · Lv ${D.survLvl(st.survivor.xp)} · ${(st.stats || {}).runs || 0} runs${st.savedAt ? ' · saved ' + ago(st.savedAt) : ''}` : 'no survivor yet';
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
    N.onFix = onNetFix;
    N.onSteps = onNetSteps;   // set only after the save is settled: steps wait in the ledger until then
    try { if (N.ok) await withTimeout(N.partyGet(), 6000); } catch (e) { /* offline */ }
    resolveHorde().then(() => DM.Horde.flush(SV.horde)).then(() => { Game.save(); renderHome(); }).catch(() => { });
    DM.Boss.sync().then(() => { if (!DM.scene) renderHome(); }).catch(() => { });
    publish();
    updateSync();
  }
  function publish() {
    if (!window.NET || !SV.survivor) return;
    const s = SV.survivor;
    try { NET.publish({ name: s.name, level: D.survLvl(s.xp), job: s.job, scav: Math.round(s.xp), looted: SV.stats.runs, kills: SV.stats.kills, extra: { look: s.look, trader: traderLevel(), quests: SV.trader.completed, secrets: SV.stats.secrets, cosmetics: Object.keys(s.wardrobe.own).length } }); } catch (e) { /* offline */ }
  }
  Game.onLevel = () => publish();
  // a newer release on the site: save, then reload once (no loop: one try per version per tab session)
  async function checkVersion() {
    try {
      const r = await fetch('version.txt?t=' + Date.now(), { cache: 'no-store' }); if (!r.ok) return;
      const v = (await r.text()).trim();
      if (!/^[0-9][0-9.]*$/.test(v) || v === NEXT_VERSION || DM.scene) return;
      if (sessionStorage.getItem('dm-next-reloaded') === v) return;
      sessionStorage.setItem('dm-next-reloaded', v);
      Game.save(); try { window.NET && await NET.flush(); } catch (e) { /* offline */ }
      location.reload();
    } catch (e) { /* offline or blocked */ }
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && SV) { checkVersion(); resolveHorde(); } });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && SV) { Game.save(); try { window.NET && NET.flush(); } catch (e) { /* ignore */ } } });
  let bossTick = 0;
  Game.boot = async function () {
    SV = load(); DM.S = SV.survivor;
    await E.start();
    if (EVA) { const b = document.body, A = EVA.ev.accent; b.classList.add('event', 'ev-' + EVA.id); b.style.setProperty('--evc', A.c); b.style.setProperty('--evc2', A.c2); b.style.setProperty('--evbg', A.bg); }
    boot2();
    $('#loading').remove();
    netStart();
    setInterval(() => { if (SV.day.key !== today()) { rollDay(); Game.save(); renderHome(); } resolveHorde(); if (++bossTick % 3 === 0) DM.Boss.sync().then(() => { if (!DM.scene && !$('#msheet').classList.contains('on')) renderHome(); }).catch(() => { }); const c = document.getElementById('hCount'), n = DM.Horde.next(); if (c && n) c.textContent = (DM.Horde.windowOpen() ? 'Watch shift open · hits in ' : 'in ') + DM.Base.until(n.at); }, 60000);
    checkVersion();
    DM.ready = true;
  };
  Game.boot().catch(e => { console.error(e); const l = $('#loading'); if (l) l.textContent = 'Failed to load: ' + e.message; });
})();
