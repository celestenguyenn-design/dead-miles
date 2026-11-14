/* Dead Miles (next) - 0.13 survivor level + skill points + five skill trees.
   XP (searching, kills, secrets, locks, quests, horde shifts, boss fights) raises the SURVIVOR LEVEL (D.survLvl, uncapped);
   every level after the first is one skill point. Points buy ranks in five trees. Rank N needs rank N-1.
   The job's own tree starts with rank 1 free. Saves from before 0.13 keep the old level perks for free
   (Quiet hands at Lv 3, Keen eye at Lv 6, Pack rat at Lv 9) and get every point their level earned.
   State lives on the survivor: s.skills = { got: { 'scav.2': ts }, free: { 'scav.2': 'legacy' | 'job' }, reset: weekKey }.
   Everything else reads the effect helpers below (house.js, food.js, data.js, game.js). */
'use strict';
window.DM = window.DM || {};
(() => {
  const D = DM.D;
  const SK = DM.Skills = {};

  // ---------------------------------------------------------------- the trees
  // c = cost in points. legacy = the old Scavenging level that used to give this perk for free.
  SK.TREES = [
    { id: 'scav', n: 'Scavenging', col: '#e0b94a', job: 'scavenger', blurb: 'Faster, luckier searches and a bigger pack.', ranks: [
      { n: 'Quick hands', d: 'Searches 10% faster.', c: 1 },
      { n: 'Keen eye', d: 'Hidden clues glow faintly and rare loot sparkles.', c: 1, legacy: 6 },
      { n: 'Lucky find', d: '+8% chance of an extra find in every search.', c: 2 },
      { n: 'Pack rat', d: '+2 pack slots.', c: 2, legacy: 9 },
      { n: 'Treasure nose', d: 'Searches another 10% faster and +7% extra-find chance.', c: 3 },
    ] },
    { id: 'stealth', n: 'Stealth', col: '#9fe0e6', job: 'hunter', blurb: 'Make less noise and get spotted later.', ranks: [
      { n: 'Soft steps', d: 'Footsteps 20% quieter.', c: 1 },
      { n: 'Quiet hands', d: 'Searches make 25% less noise.', c: 1, legacy: 3 },
      { n: 'Low profile', d: 'Zombies spot you from 15% less far.', c: 2 },
      { n: 'Hush', d: 'Every noise you make (swings, running, prying) is 15% smaller.', c: 2 },
      { n: 'Ghost', d: 'Zombies spot you from another 15% less far, and sleepers barely stir.', c: 3 },
    ] },
    { id: 'combat', n: 'Combat', col: '#ff8a7a', job: 'brawler', blurb: 'Hit harder, dodge better, take more.', ranks: [
      { n: 'Heavy hands', d: '+12% melee damage.', c: 1 },
      { n: 'Steady aim', d: '+15% bow damage.', c: 1 },
      { n: 'Quick feet', d: 'Dodges go 25% further and cost 20% less stamina.', c: 2 },
      { n: 'Tough', d: '+15 max HP.', c: 2 },
      { n: 'Veteran', d: '+10% melee and bow damage and +10 max HP.', c: 3 },
    ] },
    { id: 'surv', n: 'Survival', col: '#93a86c', job: 'mechanic', blurb: 'Hunger, thirst, healing and stamina.', ranks: [
      { n: 'Light eater', d: 'Hunger and thirst drain 15% slower.', c: 1 },
      { n: 'Field medic', d: 'Food, bandages and meds heal 40% more HP.', c: 1 },
      { n: 'Second wind', d: '+15 max stamina, and it refills 20% faster.', c: 2 },
      { n: 'Iron stomach', d: 'Hunger and thirst drain another 15% slower.', c: 2 },
      { n: 'Marathoner', d: 'Sprinting costs 25% less stamina; it refills another 20% faster.', c: 3 },
    ] },
    { id: 'lock', n: 'Lockwork', col: '#b98cf0', job: 'thief', blurb: 'Picks, sweet spots and a quieter crowbar.', ranks: [
      { n: 'Steady pick', d: 'Lockpick sweet spots 20% wider.', c: 1 },
      { n: 'Soft touch', d: 'Picks break 35% less often.', c: 1 },
      { n: 'Quiet pry', d: 'Prying with a crowbar is 35% quieter.', c: 2 },
      { n: 'Locksmith', d: 'Sweet spots another 20% wider.', c: 2 },
      { n: 'Master', d: 'Picks break 35% less again, and prying never smashes loot.', c: 3 },
    ] },
  ];
  SK.tree = id => SK.TREES.find(t => t.id === id);
  SK.RESET_CAPS = 150;   // one reset a week, paid in trader caps

  // ---------------------------------------------------------------- state
  const S = () => DM.S;
  const key = (t, r) => t + '.' + r;
  SK.norm = function (s) {
    if (!s) return;
    const fresh = !s.skills || typeof s.skills !== 'object';
    const k = fresh ? (s.skills = {}) : s.skills;
    k.got = k.got && typeof k.got === 'object' ? k.got : {};
    k.free = k.free && typeof k.free === 'object' ? k.free : {};
    for (const id in k.got) { const [t, r] = id.split('.'); const T = SK.tree(t); if (!T || !T.ranks[+r - 1]) { delete k.got[id]; delete k.free[id]; } }
    // migration (0.13): the old level perks stay, free; the points the level earned are all there to spend
    if (fresh) {
      const L = D.scavLvl(+s.xp || 0);
      for (const T of SK.TREES) T.ranks.forEach((R, i) => { if (R.legacy && L >= R.legacy) { k.got[key(T.id, i + 1)] = Date.now(); k.free[key(T.id, i + 1)] = 'legacy'; } });
    }
    // the job's own tree: rank 1 is free
    const J = SK.TREES.find(T => T.job === s.job);
    if (J && !k.got[key(J.id, 1)]) { k.got[key(J.id, 1)] = Date.now(); k.free[key(J.id, 1)] = 'job'; }
    return k;
  };
  const sk = (s = S()) => (s && (s.skills || SK.norm(s))) || { got: {}, free: {} };
  SK.has = (t, r, s = S()) => !!(s && sk(s).got[key(t, r)]);
  SK.rank = (t, s = S()) => { let n = 0; const T = SK.tree(t); for (let r = 1; r <= T.ranks.length; r++) if (SK.has(t, r, s)) n++; return n; };
  SK.level = (s = S()) => D.survLvl(s ? +s.xp || 0 : 0);
  SK.earned = (s = S()) => SK.level(s) - 1;
  SK.spent = (s = S()) => { const k = sk(s); let n = 0; for (const id in k.got) if (!k.free[id]) { const [t, r] = id.split('.'); n += SK.tree(t).ranks[+r - 1].c; } return n; };
  SK.points = (s = S()) => Math.max(0, SK.earned(s) - SK.spent(s));
  // why a rank can't be learned yet (or '' if it can)
  SK.block = function (t, r, s = S()) {
    const R = SK.tree(t).ranks[r - 1];
    if (SK.has(t, r, s)) return 'learned';
    if (r > 1 && !SK.has(t, r - 1, s)) return `needs ${SK.tree(t).ranks[r - 2].n} first`;
    if (SK.points(s) < R.c) return `needs ${R.c} point${R.c > 1 ? 's' : ''}`;
    return '';
  };
  SK.learn = function (t, r, s = S()) {
    if (SK.block(t, r, s)) return false;
    sk(s).got[key(t, r)] = Date.now();
    if (DM.Game && DM.Game.save) DM.Game.save();
    return true;
  };
  // one reset a week for caps: every rank you paid for comes back as points (free ranks stay)
  const weekKey = () => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  SK.canReset = (s = S()) => sk(s).reset !== weekKey() && SK.spent(s) > 0;
  SK.reset = function (s = S()) {
    const k = sk(s); if (!SK.canReset(s)) return false;
    for (const id in k.got) if (!k.free[id]) delete k.got[id];
    k.reset = weekKey(); return true;
  };

  // ---------------------------------------------------------------- XP and levels
  // n XP for the survivor. Returns how many levels it gained. opts.quiet: no toast (the house run shows its own popup).
  SK.addXP = function (n, opts = {}, s = S()) {
    if (!s || !(n > 0)) return 0;
    const L0 = SK.level(s); s.xp = (+s.xp || 0) + n; const up = SK.level(s) - L0;
    if (up > 0 && !opts.quiet) {
      if (DM.E && DM.E.toast) DM.E.toast(`Level ${SK.level(s)}! +${up} skill point${up > 1 ? 's' : ''} - tap Skills on the home card`, 2.8);
      const E = DM.E; if (E && E.SFX && E.SFX.ac) [523, 659, 784].forEach((f, i) => E.SFX.tone('triangle', f, f * 1.01, .22, .06, i * .08));
    }
    if (up > 0 && DM.Game && DM.Game.onLevel) DM.Game.onLevel(SK.level(s));
    return up;
  };
  SK.xpLine = (s = S()) => { const L = SK.level(s), a = D.XPCUM(L), b = D.XPCUM(L + 1), x = +s.xp || 0; return { L, cur: Math.floor(x - a), need: b - a, pct: Math.max(0, Math.min(100, (x - a) / (b - a) * 100)) }; };

  // ---------------------------------------------------------------- effects (multipliers; 1 = no change)
  const h = (t, r, s) => SK.has(t, r, s);
  // Scavenging
  SK.searchMul = (s = S()) => (h('scav', 1, s) ? .9 : 1) * (h('scav', 5, s) ? .9 : 1);
  SK.extraFind = (s = S()) => (h('scav', 3, s) ? .08 : 0) + (h('scav', 5, s) ? .07 : 0);
  SK.keen = (s = S()) => h('scav', 2, s);
  SK.packBonus = (s = S()) => (h('scav', 4, s) ? 2 : 0);
  // Stealth
  SK.stepNoise = (s = S()) => (h('stealth', 1, s) ? .8 : 1) * SK.allNoise(s);
  SK.searchNoise = (s = S()) => (h('stealth', 2, s) ? .75 : 1) * SK.allNoise(s);
  SK.allNoise = (s = S()) => (h('stealth', 4, s) ? .85 : 1);
  SK.sightMul = (s = S()) => (h('stealth', 3, s) ? .85 : 1) * (h('stealth', 5, s) ? .85 : 1);
  SK.sleeperMul = (s = S()) => (h('stealth', 5, s) ? .7 : 1);
  // Combat
  SK.meleeMul = (s = S()) => (h('combat', 1, s) ? 1.12 : 1) * (h('combat', 5, s) ? 1.1 : 1);
  SK.bowMul = (s = S()) => (h('combat', 2, s) ? 1.15 : 1) * (h('combat', 5, s) ? 1.1 : 1);
  SK.dodgeDist = (s = S()) => (h('combat', 3, s) ? 1.25 : 1);
  SK.dodgeCost = (s = S()) => (h('combat', 3, s) ? .8 : 1);
  SK.hpBonus = (s = S()) => (h('combat', 4, s) ? 15 : 0) + (h('combat', 5, s) ? 10 : 0);
  // Survival
  SK.drainMul = (s = S()) => (h('surv', 1, s) ? .85 : 1) * (h('surv', 4, s) ? .85 : 1);
  SK.healMul = (s = S()) => (h('surv', 2, s) ? 1.4 : 1);
  SK.heal = (hp, s = S()) => Math.round(hp * SK.healMul(s));
  SK.staBonus = (s = S()) => (h('surv', 3, s) ? 15 : 0);
  SK.regenMul = (s = S()) => (h('surv', 3, s) ? 1.2 : 1) * (h('surv', 5, s) ? 1.2 : 1);
  SK.sprintMul = (s = S()) => (h('surv', 5, s) ? .75 : 1);
  // Lockwork
  SK.lockWide = (s = S()) => (h('lock', 1, s) ? 1.2 : 1) * (h('lock', 4, s) ? 1.2 : 1);
  SK.snapMul = (s = S()) => (h('lock', 2, s) ? 1 / .65 : 1) * (h('lock', 5, s) ? 1 / .65 : 1);   // longer strain before a pick snaps
  SK.pryNoise = (s = S()) => (h('lock', 3, s) ? .65 : 1) * SK.allNoise(s);
  SK.noSmash = (s = S()) => h('lock', 5, s);

  // ---------------------------------------------------------------- the Skills screen (home)
  const esc = v => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const GL = { // tree glyphs, flat, ink outline
    scav: '<circle cx="10" cy="10" r="6" fill="#f6e3bb" stroke="#11142f" stroke-width="2.2"/><circle cx="10" cy="10" r="3" fill="#e0b94a"/><path d="M14.5 14.5 20 20" stroke="#11142f" stroke-width="4" stroke-linecap="round"/><path d="M14.5 14.5 20 20" stroke="#e0b94a" stroke-width="1.8" stroke-linecap="round"/>',
    stealth: '<path d="M2 12c3-5 7-7 10-7s7 2 10 7c-3 5-7 7-10 7s-7-2-10-7z" fill="#f6e3bb" stroke="#11142f" stroke-width="2"/><circle cx="12" cy="12" r="3.6" fill="#9fe0e6" stroke="#11142f" stroke-width="1.6"/><path d="M4 21 20 3" stroke="#11142f" stroke-width="3.6" stroke-linecap="round"/><path d="M4 21 20 3" stroke="#9fe0e6" stroke-width="1.6" stroke-linecap="round"/>',
    combat: '<path d="M5 3 15 13M3 5l10 10" stroke="#11142f" stroke-width="5" stroke-linecap="round"/><path d="M4 4l10 10" stroke="#f6e3bb" stroke-width="2.6" stroke-linecap="round"/><path d="M12.5 17.5l5-5M15 20l5-5" stroke="#11142f" stroke-width="3.2" stroke-linecap="round"/><path d="M14 16l2 2" stroke="#ff8a7a" stroke-width="4" stroke-linecap="round"/>',
    surv: '<path d="M12 21C5 16 2.5 12.5 2.5 9a4.6 4.6 0 0 1 9.5-2 4.6 4.6 0 0 1 9.5 2c0 3.5-2.5 7-9.5 12z" fill="#93a86c" stroke="#11142f" stroke-width="2" stroke-linejoin="round"/><path d="M12 9v7M8.5 12.5h7" stroke="#f6e3bb" stroke-width="2.6" stroke-linecap="round"/>',
    lock: '<path d="M7 10V7.2a5 5 0 0 1 10 0V10" fill="none" stroke="#11142f" stroke-width="4.2"/><path d="M7 10V7.2a5 5 0 0 1 10 0V10" fill="none" stroke="#f6e3bb" stroke-width="1.8"/><rect x="3" y="9.5" width="18" height="13" rx="3" fill="#b98cf0" stroke="#11142f" stroke-width="2"/><circle cx="12" cy="14.6" r="2" fill="#11142f"/><path d="M12 15.5v3.4" stroke="#11142f" stroke-width="2" stroke-linecap="round"/>',
  };
  SK.glyph = (t, size = 22) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" class="skg">${GL[t]}</svg>`;
  let cur = null, pend = null;
  SK.open = function (onClose) {
    const s = S(); if (!s) return; SK.norm(s);
    if (!cur) { const J = SK.TREES.find(T => T.job === s.job); cur = J ? J.id : 'scav'; }
    pend = null; SK._close = onClose || null; render();
  };
  function close() { const el = document.getElementById('msheet'); el.classList.remove('on'); const f = SK._close; SK._close = null; if (f) f(); }
  function render() {
    const s = S(), el = document.getElementById('msheet'), xl = SK.xpLine(s), pts = SK.points(s), T = SK.tree(cur), J = D.JOBS[s.job];
    const rows = T.ranks.map((R, i) => {
      const r = i + 1, got = SK.has(T.id, r, s), fr = sk(s).free[key(T.id, r)], why = SK.block(T.id, r, s), can = !why;
      const tag = got ? (fr === 'job' ? `<em class="sktag free">free · ${esc(J.n.toLowerCase())}</em>` : fr === 'legacy' ? '<em class="sktag free">kept from before</em>' : '<em class="sktag got">learned</em>')
        : `<em class="sktag${can ? ' can' : ''}">${R.c} pt${R.c > 1 ? 's' : ''}</em>`;
      const conf = pend === r ? `<div class="skconf"><span>Learn <b>${esc(R.n)}</b> for ${R.c} point${R.c > 1 ? 's' : ''}? You can't take it back (except with the weekly reset).</span><div class="btnrow"><button class="mbtn sm ghost" data-skno>Cancel</button><button class="mbtn sm" data-skyes="${r}">Learn</button></div></div>` : '';
      return `<button class="skrow${got ? ' got' : can ? ' can' : ' lock'}${pend === r ? ' sel' : ''}" data-r="${r}" style="--tc:${T.col}"><i class="sknum">${r}</i><span class="sktxt"><b>${esc(R.n)}</b><span>${esc(R.d)}</span>${!got && why && why !== 'learned' ? `<small>${esc(why)}</small>` : ''}</span>${tag}</button>${conf}`;
    }).join('');
    el.innerHTML = `<div class="mcard skcard"><div class="kick">Survivor level ${xl.L}</div><h3>Skills</h3>
      <div class="skhead"><div class="skpts${pts ? ' on' : ''}"><b>${pts}</b><span>point${pts === 1 ? '' : 's'}</span></div>
        <div class="skxp"><span>${xl.cur.toLocaleString('en-US')} / ${xl.need.toLocaleString('en-US')} xp to Lv ${xl.L + 1}</span><div class="mbar xp"><i style="width:${xl.pct}%"></i></div></div></div>
      <div class="sktabs">${SK.TREES.map(t => `<button class="sktab${t.id === cur ? ' on' : ''}" data-t="${t.id}" style="--tc:${t.col}">${SK.glyph(t.id, 20)}<b>${esc(t.n)}</b><i>${SK.rank(t.id, s)}/${t.ranks.length}</i></button>`).join('')}</div>
      <div class="skblurb" style="--tc:${T.col}">${SK.glyph(T.id, 26)}<span><b>${esc(T.n)}</b>${esc(T.blurb)}${T.job === s.job ? ` <em>${esc(J.n)}s get rank 1 free.</em>` : ''}</span></div>
      <div class="skranks">${rows}</div>
      <p class="mp dim">Every level is 1 skill point. XP comes from searching, kills (special infected more), secrets, locks, Dot's jobs, horde shifts and boss fights. Each rank needs the one before it.</p>
      <div class="btnrow">${SK.canReset(s) ? `<button class="mbtn sm ghost" id="skReset">Reset · ${SK.RESET_CAPS} caps</button>` : ''}<button class="mbtn sm" id="skClose">Done</button></div></div>`;
    el.classList.add('on');
    el.onclick = e => { if (e.target === el) close(); };
    const sfx = () => { const E = DM.E; if (E && E.SFX) E.SFX.play('ui'); };
    el.querySelectorAll('.sktab').forEach(b => b.onclick = () => { cur = b.dataset.t; pend = null; sfx(); render(); });
    el.querySelectorAll('.skrow').forEach(b => b.onclick = () => {
      const r = +b.dataset.r, why = SK.block(cur, r, s);
      if (why === 'learned') return;
      if (why) { if (DM.E) DM.E.toast(why[0].toUpperCase() + why.slice(1), 1.6); return; }
      pend = pend === r ? null : r; sfx(); render();
    });
    const no = el.querySelector('[data-skno]'); if (no) no.onclick = e => { e.stopPropagation(); pend = null; render(); };
    const yes = el.querySelector('[data-skyes]'); if (yes) yes.onclick = e => {
      e.stopPropagation(); const r = +yes.dataset.skyes, R = SK.tree(cur).ranks[r - 1];
      if (SK.learn(cur, r, s)) { pend = null; const E = DM.E; if (E) { E.toast(`Learned ${R.n}`, 1.6); if (E.SFX) E.SFX.play('pick'); } }
      render();
    };
    const rs = document.getElementById('skReset'); if (rs) rs.onclick = () => {
      const G = DM.Game && DM.Game.data && DM.Game.data(), tr = G && G.trader;
      if (!tr || (tr.caps || 0) < SK.RESET_CAPS) { DM.E.toast(`A reset costs ${SK.RESET_CAPS} trader caps`, 1.8); return; }
      if (!rs.dataset.sure) { rs.dataset.sure = 1; rs.textContent = 'Tap again to reset'; return; }
      tr.caps -= SK.RESET_CAPS; SK.reset(s); DM.Game.save(); DM.E.toast('Skills reset - your points are back (once a week)', 2.2); render();
    };
    document.getElementById('skClose').onclick = close;
  }
})();
