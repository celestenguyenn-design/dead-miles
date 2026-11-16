/* Dead Miles (next) 0.32 - the advent calendar (owner loved the idea list: "advent calendar (December)").
   December 1-24 (local date): 24 doors. Today's door opens once you have walked 3,000 steps today (the same effective
   steps scouting uses). Missed a day? After today's door, every further 3,000 steps today opens one missed door (up to
   2 a day). Prizes are seeded by the year and the door, so everyone gets the same calendar: small supplies most days,
   bigger ones on 6, 12, 18, and a big Christmas Eve door (a holiday cosmetic, caps and capsule tokens). Open 20+ doors
   and door 24 also holds a Masterwork light-string whip.
   Save: SV.advent = { y, open: [door numbers], extra: { day, n } }. Home tile "Advent" while it runs. */
'use strict';
window.DM = window.DM || {};
(() => {
  const A = DM.Advent = {};
  const STEP = 3000, DOORS = 24, CATCH = 2;
  const G = () => DM.Game, SV = () => DM.Game && DM.Game.data(), D = () => DM.D;
  const toast = (m, s) => DM.E && DM.E.toast && DM.E.toast(m, s || 2.4);
  const sfx = k => { try { DM.E.SFX.play(k); } catch (e) { /* ignore */ } };
  const fmt = n => Math.round(n).toLocaleString('en-US');
  let testDate = null;   // tests: DM.Advent._date(new Date(2026, 11, 5))
  const now = () => testDate || new Date();
  A._date = d => { testDate = d; };
  A.on = () => { const d = now(); return d.getMonth() === 11 && d.getDate() <= DOORS; };
  A.day = () => now().getDate();
  const dayKey = () => { const d = now(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  function st() {
    const sv = SV(), y = now().getFullYear();
    if (!sv.advent || sv.advent.y !== y) sv.advent = { y, open: [], extra: { day: '', n: 0 } };
    return sv.advent;
  }
  const steps = () => G().routeApi.effective();
  // how many doors can open right now: today's (after STEP) + catch-ups (each further STEP, up to CATCH a day)
  function canOpen(n) {
    const s = st(), today = A.day(), e = steps();
    if (s.open.includes(n) || n > today) return { ok: false, why: n > today ? 'Not yet' : 'Opened' };
    if (n === today) return e >= STEP ? { ok: true } : { ok: false, why: `${fmt(STEP - e)} steps to go` };
    // a missed door
    if (!s.open.includes(today)) return { ok: false, why: 'Open today\'s door first' };
    const ex = s.extra.day === dayKey() ? s.extra.n : 0;
    if (ex >= CATCH) return { ok: false, why: 'Catch-ups done for today' };
    const need = STEP * (2 + ex);
    return e >= need ? { ok: true, catchup: 1 } : { ok: false, why: `${fmt(need - e)} more steps to catch up` };
  }
  A.ready = () => A.on() && (canOpen(A.day()).ok || (st().open.includes(A.day()) && Array.from({ length: A.day() - 1 }, (_, i) => i + 1).some(n => canOpen(n).ok)));
  // ---------------------------------------------------------------- prizes (seeded: the same calendar for everyone)
  function prize(n) {
    const r = D().mulberry32((now().getFullYear() * 100 + n) >>> 0), pick = a => a[Math.floor(r() * a.length)];
    if (n === 24) return { caps: 150, tokens: 2, cos: 1, items: [['candy', 5], ['gift', 2]] };
    if (n === 18) return { caps: 60, items: [['bp_*', 1], ['meds', 2]] };
    if (n === 12) return { caps: 40, items: [['xlights', 1], ['battery', 2]] };
    if (n === 6) return { caps: 30, tokens: 1, items: [['candy', 4]] };
    const small = [[['candy', 3]], [['gift', 1]], [['meds', 1], ['bandage', 2]], [['ammo', 6]], [['shells', 6]], [['battery', 2], ['tape', 1]], [['beans', 2], ['water', 2]], [['lockpick', 3]], [['d_lights', 1]], [['coffee', 2], ['snack', 2]]];
    const p = { caps: 10 + Math.floor(r() * 4) * 5, items: pick(small) };
    if (r() < .2) p.tokens = 1;
    return p;
  }
  function give(n) {
    const p = prize(n), sv = SV(), parts = [], items = p.items.map(([k, c]) => [k === 'bp_*' ? D().pickBP(Math.random) : k, c]);
    if (n === 24 && st().open.length >= 20) { items.push(['xlights', 1]); parts.push('a Masterwork light-string whip'); }
    if (items.length) {
      const stacks = items.map(([k, c]) => ({ k, n: c })); if (n === 24 && st().open.length >= 20) { const w = stacks[stacks.length - 1]; w.q = 5; w.d = D().wMax({ k: 'xlights', q: 5 }); }
      const lost = G().routeApi.toStash(stacks);
      for (const [k, c] of items) if (D().ITEMS[k] && !(n === 24 && k === 'xlights' && st().open.length >= 20)) parts.push(`${c > 1 ? c + ' ' : ''}${D().ITEMS[k].n.toLowerCase()}`);
      if (lost && lost.length) parts.push('(stash full - some left behind)');
    }
    if (p.caps) { sv.trader.caps += p.caps; parts.push(p.caps + ' caps'); }
    if (p.tokens && DM.Gacha) { DM.Gacha.state().tok += p.tokens; parts.push(`${p.tokens} capsule token${p.tokens > 1 ? 's' : ''}`); }
    if (p.cos) {
      const ev = DM.Events && DM.Events.CAL && DM.Events.CAL.christmas, own = sv.survivor.wardrobe.own, pool = (ev ? ev.cos : []).filter(c => D().COS[c] && !own[c]);
      if (pool.length) { G().unlockCos('cos_' + pool[0]); parts.push('a Christmas cosmetic'); } else { sv.trader.caps += 80; parts.push('80 more caps (you own every Christmas cosmetic)'); }
    }
    return parts.join(', ');
  }
  function open(n) {
    const c = canOpen(n); if (!c.ok) { toast(c.why, 1.8); return; }
    const s = st(); s.open.push(n);
    if (c.catchup) { if (s.extra.day !== dayKey()) s.extra = { day: dayKey(), n: 0 }; s.extra.n++; }
    const got = give(n); G().save(); sfx('pick'); setTimeout(() => sfx('open'), 200);
    if (navigator.vibrate) try { navigator.vibrate([60, 40, 120]); } catch (e) { /* ignore */ }
    A.render(); toast(`🎄 Door ${n}: ${got}`, 4);
  }
  // ---------------------------------------------------------------- the sheet
  A.tile = () => {
    if (!A.on()) return null;
    const s = st(), t = A.day(), e = steps(), opened = s.open.includes(t);
    return { k: 'advent', c: '#d9483a', n: 'Advent calendar', sub: opened ? `${s.open.length}/24 doors open` : e >= STEP ? `Door ${t} is ready!` : `Door ${t} in ${fmt(STEP - e)} steps`, bar: opened ? null : Math.min(100, e / STEP * 100), hot: A.ready() ? 'Open' : '' };
  };
  A.html = function () {
    const s = st(), t = A.day(), e = steps();
    const doors = Array.from({ length: DOORS }, (_, i) => {
      const n = i + 1, o = s.open.includes(n), c = canOpen(n), cls = o ? 'open' : c.ok ? 'ready' : n > t ? 'shut' : n === t ? 'today' : 'missed';
      return `<button class="adv ${cls}" data-adv="${n}"${n === 24 ? ' style="grid-column: span 2"' : ''}><b>${n}</b><span>${o ? '✓' : c.ok ? 'Open!' : n > t ? '' : n === t ? '🔒' : 'missed'}</span></button>`;
    }).join('');
    return `<div class="kick">Advent calendar · December 1-24</div><h3>${s.open.length} of 24 doors open</h3>
      <p class="mp dim">Walk <b>${fmt(STEP)} steps</b> today to open today's door (${fmt(Math.min(e, STEP))}/${fmt(STEP)}). Missed a day? After today's door, every extra ${fmt(STEP)} steps opens a missed one (up to ${CATCH} a day). Door 24 is the big one${s.open.length >= 20 ? '' : ' - open 20+ doors for a bonus'}.</p>
      <div class="advgrid">${doors}</div>`;
  };
  A.render = function () {
    const el = document.querySelector('#msheet .advwrap'); if (!el) return;
    el.innerHTML = A.html(); A.bind(el);
  };
  A.bind = function (el) { el.querySelectorAll('[data-adv]').forEach(b => b.onclick = () => { const n = +b.dataset.adv; if (st().open.includes(n)) { toast(`Door ${n} is open already`, 1.4); return; } sfx('ui'); open(n); }); };
  A.css = `.advgrid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 7px; margin: 10px 0 12px; }
    .adv { aspect-ratio: 1; border-radius: 12px; border: 2.5px solid #11142f; background: #2a3f36; color: #f6e3bb; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; font-family: inherit; box-shadow: 0 3px 0 #11142f; }
    .adv b { font-size: 17px; font-weight: 900; } .adv span { font-size: 10px; font-weight: 800; color: #b9d8c8; min-height: 12px; }
    .adv[style] { aspect-ratio: auto; } .adv.shut { opacity: .45; } .adv.missed { background: #2a2440; } .adv.missed span { color: #9d90bf; }
    .adv.open { background: #1c2a24; box-shadow: none; } .adv.open b { color: #7fd49a; }
    .adv.ready { background: #d9483a; animation: advpulse .9s ease-in-out infinite alternate; } .adv.ready span { color: #fff3c4; }
    .adv.today { border-color: #d9483a; }
    @keyframes advpulse { from { transform: scale(1); } to { transform: scale(1.06); } }`;
  A._st = st; A._prize = prize;
  { const c = document.createElement('style'); c.textContent = A.css; document.head.appendChild(c); }
})();
