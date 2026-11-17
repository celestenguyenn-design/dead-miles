/* Dead Miles (next) 0.47 - things your steps do by themselves (owner: "build the unbuilt stuff" + "walking caches").
   All of it runs off SV.walked (the same step total Dot and quests use), so phone / watch / typed steps all count, and
   nothing needs the map open. Processed whenever the home screen draws (game.js calls DM.WalkFX.tick()).
   - Walk report: every 1,000 steps you pick something up along the way (straight to the stash), at most 12 a day.
     The home screen shows "On your walk" with what you found since you last looked.
   - Keeping your gear: every 1,500 steps the weapon in your hand and the armor you wear get back 4% of their durability.
   - Walking caches (cache2 / cache5 / cache10): locked crates you find. Put up to 2 in your cache bag (tap one in the pack
     or stash -> "Walk it open"); your steps open them. Bigger distance, better haul.
   Save: SV.wfx = { mark, day, finds, left: [[k, n]], fix, bag: [{ k, need, got }] }. */
'use strict';
window.DM = window.DM || {};
(() => {
  const W = DM.WalkFX = {};
  const G = () => DM.Game, SV = () => DM.Game && DM.Game.data(), D = () => DM.D;
  const toast = (m, s) => DM.E && DM.E.toast && DM.E.toast(m, s || 2.6);
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = n => Math.round(n).toLocaleString('en-US');
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  const FIND_STEP = 1000, FIND_MAX = 12, FIX_STEP = 1500, BAG = 2;
  // what turns up on a walk (weights): common junk and supplies; rarely something good
  const FINDS = [[['scrap', 1], 14], [['cloth', 1], 10], [['wood', 1], 8], [['nails', 3], 8], [['beans', 1], 7], [['water', 1], 7], [['snack', 1], 6], [['tape', 1], 6],
    [['battery', 1], 4], [['lockpick', 1], 4], [['bandage', 1], 3], [['drink', 1], 4], [['book', 1], 3], [['cache2', 1], 2], [['bp_*', 1], .7], [['cache5', 1], .5],
    [['col_*', 1], 3], [['charm_*', 1], .3]];   // 0.53: collectibles (mostly roadside postcards) + walking charms
  const LUCKY = { cache2: 1, cache5: 1, 'bp_*': 1, 'col_*': 1, 'charm_*': 1 };   // the Rabbit's foot doubles these
  const on = k => DM.Charm && DM.Charm.on(k);
  const SKW = (k, d) => DM.Skills && DM.Skills[k] ? DM.Skills[k]() : d;   // 0.60: the Walker skill tree (progress.js)
  const findStep = () => Math.round((on('pedo') ? 750 : FIND_STEP) * SKW('walkFindStep', 1)), findMax = () => (on('mapcase') ? 16 : FIND_MAX) + SKW('walkFindMax', 0);
  const wOf = f => f[1] * (LUCKY[f[0][0]] ? (on('rabbit') ? 2 : 1) * SKW('walkLucky', 1) : 1);
  function st() {
    const v = SV(); v.wfx = v.wfx || { mark: v.walked || 0, day: '', finds: 0, left: [], fix: v.walked || 0, bag: [] };
    const w = v.wfx; if (w.day !== today()) { w.day = today(); w.finds = 0; }
    return w;
  }
  function pick() {
    const WT = FINDS.reduce((a, f) => a + wOf(f), 0); let x = Math.random() * WT;
    for (const f of FINDS) { x -= wOf(f); if (x <= 0) { const it = f[0]; return it[0] === 'bp_*' ? [D().pickBP(Math.random), 1] : it[0] === 'col_*' ? (DM.Collect ? [DM.Collect.pickWalk(), 1] : ['scrap', 1]) : it[0] === 'charm_*' ? (DM.Charm ? [DM.Charm.pick(), 1] : ['scrap', 1]) : it; } }
    return FINDS[0][0];
  }
  // ---------------------------------------------------------------- process new steps
  W.tick = function () {
    const v = SV(); if (!v || !v.survivor) return;
    const w = st(), walked = v.walked || 0;
    if (walked < w.mark) w.mark = walked;   // a step correction took steps away
    const delta = walked - w.mark; if (delta <= 0) return;
    // walk report
    const FS = findStep(), FM = findMax();
    let n = Math.floor((walked - w.mark) / FS);
    const got = [];
    while (n > 0 && w.finds < FM) { got.push(pick()); w.finds++; n--; }
    w.mark += Math.floor(delta / FS) * FS;
    // 0.53 canteen: +8 thirst every 1,000 steps
    if (on('canteen')) { w.cant = w.cant == null ? walked - delta : w.cant; const c = Math.floor((walked - w.cant) / 1000); if (c > 0) { w.cant += c * 1000; const f = v.survivor.food; if (f) f.t = Math.min(100, f.t + 8 * c); } } else w.cant = null;
    if (got.length) {
      const stacks = got.map(([k, c]) => ({ k, n: c }));
      const lost = G().routeApi.toStash(stacks.map(e => Object.assign({}, e)));
      for (const [k, c] of got) { const e = w.left.find(x => x[0] === k); if (e) e[1] += c; else w.left.push([k, c]); }
      if (lost && lost.length) toast('Your stash is full - some walk finds were left behind', 2.4);
    }
    // gear upkeep
    const FX = (on('walkman') ? FIX_STEP / 2 : FIX_STEP) / SKW('walkFix', 1), fixes = Math.floor((walked - w.fix) / FX);
    if (fixes > 0) {
      w.fix += fixes * FX;
      const s = v.survivor, h = s.hands;
      if (h && h.d != null) { const mx = D().wMax(h); h.d = Math.min(mx, h.d + Math.ceil(mx * .04 * fixes)); }
      if (s.armor && DM.Armor) { const A = D().ITEMS[s.armor.k] && D().ITEMS[s.armor.k].armor; if (A) s.armor.d = Math.min(A.dur, DM.Armor.dur(s.armor) + Math.ceil(A.dur * .04 * fixes)); }
    }
    // walking caches
    for (const c of w.bag) if (c.got < c.need) { c.got = Math.min(c.need, c.got + Math.round(delta * (on('compass') ? 1.25 : 1) * SKW('walkCache', 1))); if (c.got >= c.need) toast(`📦 Your ${D().ITEMS[c.k].n.toLowerCase()} is open! Collect it on the home screen`, 3); }
    G().save();
  };
  // ---------------------------------------------------------------- the walk report card (home screen)
  W.reportHTML = function () {
    const w = st(); if (!w.left.length) return '';
    return `<div class="wrcard"><div class="wrhead"><span class="kick">🚶 On your walk</span><button class="gdx" id="wrOk">OK</button></div>
      <div class="wrlist">${w.left.map(([k, n]) => `<span>${(typeof ART !== 'undefined' && ART.iconURL[(D().ITEMS[k] || {}).i]) ? `<img alt="" src="${ART.iconURL[D().ITEMS[k].i]}">` : ''}${n > 1 ? n + ' ' : ''}${esc((D().ITEMS[k] || { n: k }).n.toLowerCase())}</span>`).join('')}</div>
      <p class="wrsub">Picked up along the way - it's in your stash. 1 find every ${fmt(findStep())} steps (${w.finds}/${findMax()} today). Walking also keeps your weapon and armor in shape.</p></div>`;
  };
  W.bindReport = function (onDone) { const b = document.getElementById('wrOk'); if (b) b.onclick = () => { st().left = []; G().save(); onDone(); }; };
  // ---------------------------------------------------------------- walking caches
  W.canBag = () => st().bag.length < BAG;
  W.bagIt = function (e, list) {   // from the pack / stash item popup
    const w = st(), it = D().ITEMS[e.k]; if (!it || !it.wcache) return false;
    if (w.bag.length >= BAG) { toast(`Your cache bag holds ${BAG} - open one first`, 2); return false; }
    e.n--; if (!e.n) list.splice(list.indexOf(e), 1);
    w.bag.push({ k: e.k, need: it.wcache, got: 0 }); G().save(); toast(`${it.n} is in your cache bag - walk ${fmt(it.wcache)} steps to open it`, 2.6);
    return true;
  };
  const HAUL = { cache2: { caps: 15, rolls: [['storage', 1], ['crate', 1]] }, cache5: { caps: 35, rolls: [['hordecrate', 1], ['cache', 1]], tok: .3, charm: .25, card: .5 }, cache10: { caps: 80, rolls: [['hordecrate', 2], ['safe', 1]], tok: 1, bp: 1, master: .3, charm: .5, card: 1 } };
  W.open = function (i) {
    const w = st(), c = w.bag[i]; if (!c || c.got < c.need) return;
    w.bag.splice(i, 1);
    const H = HAUL[c.k], keys = []; DM.Journal && DM.Journal.note(`Walked a ${c.k.replace('cache', '')} km cache open.`);
    for (const [t, n] of H.rolls) for (let j = 0; j < n; j++) keys.push(...D().rollLoot(t, Math.random));
    if (H.bp) keys.push(D().pickBP(Math.random));
    if (H.charm && DM.Charm && Math.random() < H.charm) keys.push(DM.Charm.pick());   // 0.53
    if (H.card && DM.Collect && Math.random() < H.card) keys.push(DM.Collect.pickWalk());
    const stacks = D().toStacks(keys, Math.random);
    if (H.master && Math.random() < H.master) { const k = ['machete', 'axe', 'spikedbat', 'pistol', 'shotgun', 'baton', 'bow'][Math.floor(Math.random() * 7)], e = { k, n: 1, q: 5 }; e.d = D().wMax(e); stacks.push(e); }
    const lost = G().routeApi.toStash(stacks.map(e => Object.assign({}, e)));
    SV().trader.caps += H.caps; let tok = 0; if (H.tok && DM.Gacha && Math.random() < H.tok) { DM.Gacha.state().tok += Math.max(1, Math.round(H.tok)); tok = 1; }
    G().save(); try { DM.E.SFX.play('open'); setTimeout(() => DM.E.SFX.play('pick'), 200); } catch (e) { /* ignore */ }
    const what = stacks.map(e => `${e.n > 1 ? e.n + ' ' : ''}${e.q === 5 ? 'Masterwork ' : ''}${(D().ITEMS[e.k] || { n: e.k }).n.toLowerCase()}`).join(', ');
    G().ui.sheetOpen(`<div class="kick">Walking cache opened</div><h3>${esc(D().ITEMS[c.k].n)}</h3><p class="mp">${esc(what)}, ${H.caps} caps${tok ? ', a capsule token' : ''}.</p>${lost && lost.length ? '<p class="mp warn">Stash full - some of it was left behind.</p>' : ''}<button class="mbtn" id="wcOk">Nice</button>`);
    document.getElementById('wcOk').onclick = () => { G().ui.sheetClose(); G().renderHome(); };
  };
  W.tile = function () {
    const w = st(); if (!w.bag.length) return null;
    const ready = w.bag.filter(c => c.got >= c.need).length, c0 = w.bag[0];
    return { k: 'caches', c: '#a8703f', n: 'Walking caches', sub: ready ? `${ready} ready to open!` : `${fmt(c0.need - c0.got)} steps to open`, bar: ready ? null : c0.got / c0.need * 100, hot: ready ? 'Open' : '' };
  };
  W.cachesHTML = function () {
    const w = st();
    return `<div class="kick">Cache bag · ${w.bag.length}/${BAG}</div><h3>Walking caches</h3><p class="mp dim">Locked crates you find in safes, attics, caches and on your walks. Your steps open them - 2 km, 5 km or 10 km. The farther, the better.</p>
      <div class="cplist">${w.bag.map((c, i) => `<div class="cpbuy"><div><b>${esc(D().ITEMS[c.k].n)}</b><span>${c.got >= c.need ? 'Ready!' : `${fmt(c.got)} / ${fmt(c.need)} steps`}</span><div class="cxbar"><i style="width:${Math.min(100, c.got / c.need * 100)}%"></i></div></div>${c.got >= c.need ? `<button class="mbtn sm" data-wc="${i}">Open</button>` : `<button class="mbtn sm ghost" data-wk="${i}"${(+SV().survivor.keys || 0) >= 2 ? '' : ' disabled'}>2 keys: open now</button>`}</div>`).join('') || '<p class="mp dim">Empty. Tap a walking cache in your pack or stash, then "Walk it open".</p>'}</div>`;
  };
  W.bindCaches = function (root) {
    root.querySelectorAll('[data-wc]').forEach(b => b.onclick = () => W.open(+b.dataset.wc));
    // 0.50.2: 2 brass keys pick a walking cache's lock - open it now without the walk
    root.querySelectorAll('[data-wk]').forEach(b => b.onclick = () => { const s = SV().survivor, c = st().bag[+b.dataset.wk]; if (!c || (+s.keys || 0) < 2) return; s.keys -= 2; c.got = c.need; G().save(); W.open(+b.dataset.wk); });
  };
  // ---------------------------------------------------------------- 0.48 daily bounties + escorts
  // Bounties: 3 a day (one about walking at a time of day, two others), seeded by the date. Progress is measured from the
  // day's first look (SV.wfx.bd = { day, w0, e0, r0, k0, p0, done: [], claimed: [], all }). Each pays caps + a little
  // something; all 3 = a capsule token. Escort: one survivor a day asks to be walked somewhere safe - accept, walk N
  // steps before midnight, they reach safety (sometimes they join your crew). Nothing bad happens if you don't.
  const BT = {
    morning: { t: 'Early bird', d: 'Walk 2,000 steps before noon', ok: (b, v, h) => h < 12 && v.walked - b.w0 >= 2000, prog: (b, v) => Math.min(2000, v.walked - b.w0) + '/2,000', r: [['coffee', 2]] },
    evening: { t: 'Night walk', d: 'Walk 1,000 steps after 6 PM', ok: (b, v, h) => b.e0 != null && v.walked - b.e0 >= 1000, prog: (b, v) => b.e0 == null ? 'after 6 PM' : Math.min(1000, v.walked - b.e0) + '/1,000', r: [['battery', 1]] },
    total: { t: 'Long haul', d: 'Walk 6,000 steps today', ok: (b, v) => v.walked - b.w0 >= 6000, prog: (b, v) => fmt(Math.min(6000, v.walked - b.w0)) + '/6,000', r: [['bandage', 1]] },
    loot: { t: 'Scavenger', d: 'Go into 2 houses', ok: (b, v) => (v.stats.runs || 0) - b.r0 >= 2, prog: (b, v) => Math.min(2, (v.stats.runs || 0) - b.r0) + '/2', r: [['lockpick', 2]] },
    kills: { t: 'Thin the herd', d: 'Kill 15 zombies', ok: (b, v) => (v.stats.kills || 0) - b.k0 >= 15, prog: (b, v) => Math.min(15, (v.stats.kills || 0) - b.k0) + '/15', r: [['scrap', 2]] },
    map: { t: 'Explorer', d: 'Visit 2 strange places on the map', ok: b => (DM.MapPOI ? DM.MapPOI._st().n : 0) - b.p0 >= 2, prog: b => Math.min(2, (DM.MapPOI ? DM.MapPOI._st().n : 0) - b.p0) + '/2', r: [['tape', 1]] },
  };
  const ESC = [['Lena', 'her sister\'s place in the next borough'], ['Old Amos', 'the church shelter'], ['Kai and his dog', 'the rooftop farm'], ['Rosa', 'the pier where the boats come'], ['Mr. Okafor', 'his daughter\'s apartment'], ['Two kids', 'the school shelter']];
  function bd() {
    const v = SV(), w = st(); let b = w.bd;
    if (!b || b.day !== today()) {
      const r = D().mulberry32(D().hashStr('bounty' + today()) >>> 0), walk = r() < .5 ? 'morning' : r() < .5 ? 'evening' : 'total', rest = ['loot', 'kills', 'map', 'total'].filter(k => k !== walk);
      const two = []; while (two.length < 2) { const k = rest[Math.floor(r() * rest.length)]; if (!two.includes(k)) two.push(k); }
      const e = ESC[Math.floor(r() * ESC.length)];
      b = w.bd = { day: today(), list: [walk, ...two], w0: v.walked || 0, e0: null, r0: v.stats.runs || 0, k0: v.stats.kills || 0, p0: DM.MapPOI ? DM.MapPOI._st().n : 0, claimed: [], all: 0,
        esc: { who: e[0], to: e[1], need: 3000 + Math.floor(r() * 4) * 500, st: 'offer', s0: 0 } };
    }
    if (b.e0 == null && new Date().getHours() >= 18) b.e0 = v.walked || 0;
    return b;
  }
  W.bounty = () => { const v = SV(), b = bd(), h = new Date().getHours(); return b.list.map(k => ({ k, B: BT[k], done: b.claimed.includes(k) || BT[k].ok(b, v, h), claimed: b.claimed.includes(k) })); };
  W.claimBounty = function (k) {
    const b = bd(), x = W.bounty().find(y => y.k === k); if (!x || !x.done || x.claimed) return;
    b.claimed.push(k); SV().trader.caps += 20; G().routeApi.toStash(x.B.r.map(([kk, n]) => ({ k: kk, n })));
    let msg = `Bounty "${x.B.t}" done: +20 caps`;
    if (b.claimed.length === b.list.length && !b.all) { b.all = 1; if (DM.Gacha) DM.Gacha.state().tok++; msg += ' · all 3 today: +1 capsule token!'; }
    G().save(); try { DM.E.SFX.play('pick'); } catch (e) { /* ignore */ } toast(msg, 2.6);
  };
  W.escort = () => bd().esc;
  W.escortAccept = function () { const e = bd().esc; if (e.st !== 'offer') return; e.st = 'on'; e.s0 = SV().walked || 0; G().save(); toast(`${e.who} walks with you. ${fmt(e.need)} steps to ${e.to} - before midnight.`, 3); };
  W.escortLeft = () => { const e = bd().esc; return e.st === 'on' ? Math.max(0, e.need - ((SV().walked || 0) - e.s0)) : e.need; };
  W.escortDone = function () {
    const e = bd().esc; if (e.st !== 'on' || W.escortLeft() > 0) return;
    e.st = 'done'; DM.Journal && DM.Journal.note(`Walked ${e.who} to ${e.to}.`); SV().trader.caps += 40; if (DM.Skills) DM.Skills.addXP(30);
    const join = Math.random() < .2 && DM.Crew && DM.Crew.free && DM.Crew.free() > 0 && !/kids|dog/.test(e.who);
    if (join) DM.Crew.joinHelped(e.who.replace(/^(Old |Mr\. )/, ''), D().hashStr(e.who + today()));
    G().save(); try { DM.E.SFX.play('pick'); } catch (x) { /* ignore */ }
    toast(`${e.who} made it to ${e.to}. +40 caps, +30 XP${join ? ` - and ${e.who.replace(/^(Old |Mr\. )/, '')} asks to join your crew!` : ''}`, 3.6);
  };
  W.bountyTile = function () {
    if (!SV().tutorialDone) return null;
    const bs = W.bounty(), ready = bs.filter(x => x.done && !x.claimed).length, claimed = bs.filter(x => x.claimed).length, e = W.escort(), escReady = e.st === 'on' && W.escortLeft() <= 0;
    return { k: 'bounty', c: '#e0b94a', n: 'Daily bounties', sub: `${claimed}/3 done${e.st === 'on' ? ` · escort: ${fmt(W.escortLeft())} steps` : e.st === 'offer' ? ' · someone needs an escort' : ''}`, hot: ready || escReady ? 'Claim' : '' };
  };
  W.bountyHTML = function () {
    const bs = W.bounty(), b = bd(), v = SV(), e = b.esc;
    return `<div class="kick">Daily bounties · new ones at midnight</div><h3>${bs.filter(x => x.claimed).length} of 3 done</h3>
      <div class="cplist">${bs.map(x => `<div class="cpbuy"><div><b>${esc(x.B.t)}</b><span>${esc(x.B.d)} · ${x.claimed ? 'claimed' : esc(x.B.prog(b, v))}</span></div><button class="mbtn sm${x.done && !x.claimed ? '' : ' ghost'}" data-bt="${x.k}"${x.done && !x.claimed ? '' : ' disabled'}>${x.claimed ? '✓' : '20 caps'}</button></div>`).join('')}</div>
      <p class="mp dim">Finish all 3 for a capsule token.</p>
      <div class="kick sect" style="margin-top:12px">Escort</div>
      ${e.st === 'offer' ? `<p class="mp"><b>${esc(e.who)}</b> need${/ and |kids/.test(e.who) ? '' : 's'} to get to ${esc(e.to)}. Walk <b>${fmt(e.need)} steps</b> before midnight with them.</p><button class="mbtn" id="escGo">"I'll get you there."</button>`
        : e.st === 'on' ? `<p class="mp"><b>${esc(e.who)}</b> walking with you to ${esc(e.to)}: ${W.escortLeft() > 0 ? `<b>${fmt(W.escortLeft())}</b> steps to go` : '<b>you made it!</b>'}</p>${W.escortLeft() <= 0 ? '<button class="mbtn" id="escDone">See them safe</button>' : ''}`
        : `<p class="mp dim">${esc(e.who)} made it to ${esc(e.to)}. Someone new tomorrow.</p>`}`;
  };
  W.bindBounty = function (root, re) {
    root.querySelectorAll('[data-bt]').forEach(b => b.onclick = () => { W.claimBounty(b.dataset.bt); re(); });
    const g = root.querySelector('#escGo'); if (g) g.onclick = () => { W.escortAccept(); re(); };
    const d = root.querySelector('#escDone'); if (d) d.onclick = () => { W.escortDone(); re(); };
  };
  const css = document.createElement('style'); css.textContent = `
    .wrcard { margin: 10px 0 4px; padding: 10px; border-radius: 16px; background: rgba(17,20,47,.75); border: 2.5px solid #d9a46a; }
    .wrhead { display: flex; justify-content: space-between; align-items: center; } .wrhead .kick { color: #d9a46a; }
    .wrlist { display: flex; flex-wrap: wrap; gap: 6px; margin: 6px 0; } .wrlist span { display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: 10px; background: rgba(61,45,97,.55); font-size: 12.5px; font-weight: 800; color: var(--crm, #f6e3bb); }
    .wrlist img { width: 18px; height: 18px; } .wrsub { margin: 2px 0 0; font-size: 11px; font-weight: 700; color: var(--mute, #9d90bf); line-height: 1.35; }`;
  document.head.appendChild(css);
})();
