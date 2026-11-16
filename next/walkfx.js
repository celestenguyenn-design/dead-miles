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
    [['battery', 1], 4], [['lockpick', 1], 4], [['bandage', 1], 3], [['drink', 1], 4], [['book', 1], 3], [['cache2', 1], 2], [['bp_*', 1], .7], [['cache5', 1], .5]];
  const WT = FINDS.reduce((a, f) => a + f[1], 0);
  function st() {
    const v = SV(); v.wfx = v.wfx || { mark: v.walked || 0, day: '', finds: 0, left: [], fix: v.walked || 0, bag: [] };
    const w = v.wfx; if (w.day !== today()) { w.day = today(); w.finds = 0; }
    return w;
  }
  function pick() { let x = Math.random() * WT; for (const [it, w] of FINDS) { x -= w; if (x <= 0) return it[0] === 'bp_*' ? [D().pickBP(Math.random), 1] : it; } return FINDS[0][0]; }
  // ---------------------------------------------------------------- process new steps
  W.tick = function () {
    const v = SV(); if (!v || !v.survivor) return;
    const w = st(), walked = v.walked || 0;
    if (walked < w.mark) w.mark = walked;   // a step correction took steps away
    const delta = walked - w.mark; if (delta <= 0) return;
    // walk report
    let n = Math.floor((walked - w.mark) / FIND_STEP);
    const got = [];
    while (n > 0 && w.finds < FIND_MAX) { got.push(pick()); w.finds++; n--; }
    w.mark += Math.floor(delta / FIND_STEP) * FIND_STEP;
    if (got.length) {
      const stacks = got.map(([k, c]) => ({ k, n: c }));
      const lost = G().routeApi.toStash(stacks.map(e => Object.assign({}, e)));
      for (const [k, c] of got) { const e = w.left.find(x => x[0] === k); if (e) e[1] += c; else w.left.push([k, c]); }
      if (lost && lost.length) toast('Your stash is full - some walk finds were left behind', 2.4);
    }
    // gear upkeep
    const fixes = Math.floor((walked - w.fix) / FIX_STEP);
    if (fixes > 0) {
      w.fix += fixes * FIX_STEP;
      const s = v.survivor, h = s.hands;
      if (h && h.d != null) { const mx = D().wMax(h); h.d = Math.min(mx, h.d + Math.ceil(mx * .04 * fixes)); }
      if (s.armor && DM.Armor) { const A = D().ITEMS[s.armor.k] && D().ITEMS[s.armor.k].armor; if (A) s.armor.d = Math.min(A.dur, DM.Armor.dur(s.armor) + Math.ceil(A.dur * .04 * fixes)); }
    }
    // walking caches
    for (const c of w.bag) if (c.got < c.need) { c.got = Math.min(c.need, c.got + delta); if (c.got >= c.need) toast(`📦 Your ${D().ITEMS[c.k].n.toLowerCase()} is open! Collect it on the home screen`, 3); }
    G().save();
  };
  // ---------------------------------------------------------------- the walk report card (home screen)
  W.reportHTML = function () {
    const w = st(); if (!w.left.length) return '';
    return `<div class="wrcard"><div class="wrhead"><span class="kick">🚶 On your walk</span><button class="gdx" id="wrOk">OK</button></div>
      <div class="wrlist">${w.left.map(([k, n]) => `<span>${(typeof ART !== 'undefined' && ART.iconURL[(D().ITEMS[k] || {}).i]) ? `<img alt="" src="${ART.iconURL[D().ITEMS[k].i]}">` : ''}${n > 1 ? n + ' ' : ''}${esc((D().ITEMS[k] || { n: k }).n.toLowerCase())}</span>`).join('')}</div>
      <p class="wrsub">Picked up along the way - it's in your stash. 1 find every ${fmt(FIND_STEP)} steps (${w.finds}/${FIND_MAX} today). Walking also keeps your weapon and armor in shape.</p></div>`;
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
  const HAUL = { cache2: { caps: 15, rolls: [['storage', 1], ['crate', 1]] }, cache5: { caps: 35, rolls: [['hordecrate', 1], ['cache', 1]], tok: .3 }, cache10: { caps: 80, rolls: [['hordecrate', 2], ['safe', 1]], tok: 1, bp: 1, master: .3 } };
  W.open = function (i) {
    const w = st(), c = w.bag[i]; if (!c || c.got < c.need) return;
    w.bag.splice(i, 1);
    const H = HAUL[c.k], keys = [];
    for (const [t, n] of H.rolls) for (let j = 0; j < n; j++) keys.push(...D().rollLoot(t, Math.random));
    if (H.bp) keys.push(D().pickBP(Math.random));
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
      <div class="cplist">${w.bag.map((c, i) => `<div class="cpbuy"><div><b>${esc(D().ITEMS[c.k].n)}</b><span>${c.got >= c.need ? 'Ready!' : `${fmt(c.got)} / ${fmt(c.need)} steps`}</span><div class="cxbar"><i style="width:${Math.min(100, c.got / c.need * 100)}%"></i></div></div><button class="mbtn sm${c.got >= c.need ? '' : ' ghost'}" data-wc="${i}"${c.got >= c.need ? '' : ' disabled'}>Open</button></div>`).join('') || '<p class="mp dim">Empty. Tap a walking cache in your pack or stash, then "Walk it open".</p>'}</div>`;
  };
  W.bindCaches = function (root) { root.querySelectorAll('[data-wc]').forEach(b => b.onclick = () => W.open(+b.dataset.wc)); };
  const css = document.createElement('style'); css.textContent = `
    .wrcard { margin: 10px 0 4px; padding: 10px; border-radius: 16px; background: rgba(17,20,47,.75); border: 2.5px solid #d9a46a; }
    .wrhead { display: flex; justify-content: space-between; align-items: center; } .wrhead .kick { color: #d9a46a; }
    .wrlist { display: flex; flex-wrap: wrap; gap: 6px; margin: 6px 0; } .wrlist span { display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: 10px; background: rgba(61,45,97,.55); font-size: 12.5px; font-weight: 800; color: var(--crm, #f6e3bb); }
    .wrlist img { width: 18px; height: 18px; } .wrsub { margin: 2px 0 0; font-size: 11px; font-weight: 700; color: var(--mute, #9d90bf); line-height: 1.35; }`;
  document.head.appendChild(css);
})();
