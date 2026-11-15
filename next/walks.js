/* Dead Miles (next) 0.28 - the Walks tab (owner: "more walking things" -> "build ... the streaks + expeditions + milestones").
   All three run on the same step totals as the rest of the game (today: effective steps, typed at half; lifetime:
   SV.walked), so a synced phone and typed steps play by the same rules.
   - Daily streak: reach DAILY_GOAL steps today and claim. Claiming on consecutive days grows the streak; one missed
     day a week is covered by a free streak freeze. Rewards grow with the streak; day 3 / 7 / 14 / 30 (and every 7th
     after) add a bonus (supplies, capsule tokens, a title at 30).
   - Expeditions: pick a Brooklyn destination; the steps you walk from then on carry you there. At 25 / 50 / 75 % a story
     beat with a small find; at 100 % a crate (horde-crate loot), caps and capsule tokens. One at a time, repeatable.
   - Milestones: lifetime steps 25k ... 2.5M, each with a reward and a title (pick one to show under your name).
   Save: SV.walks = { streak, best, last, freezeWk, exp: { id, start, beats }, expDone: { id: n }, ms: [claimed], title }. */
'use strict';
window.DM = window.DM || {};
(() => {
  const W = DM.Walks = {};
  const D = DM.D, E = DM.E, $ = E.$, SFX = E.SFX, toast = E.toast;
  const G = () => DM.Game, SV = () => DM.Game && DM.Game.data();
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = n => Math.round(n).toLocaleString('en-US');
  const DAILY_GOAL = 5000;
  const DEST = [
    { id: 'park', n: 'Prospect Park', steps: 8000, glyph: '🌳', beats: ['The Grand Army Plaza arch is covered in handprints. Someone counted the days on it.', 'A boathouse, doors chained from the inside. You leave it alone.', 'The Long Meadow is quiet. Too quiet. A kite is still stuck in a tree.'], end: 'A ranger station, untouched. The lockers are still full.' },
    { id: 'navy', n: 'Brooklyn Navy Yard', steps: 12000, glyph: '⚓', beats: ['Flushing Avenue, every car door open like someone was looking for keys.', 'A dry dock full of black water. Something bumps the gate.', 'A crane cab, high up. A flashlight blinks at you twice.'], end: 'A machine shop with a working generator and a lot of spare parts.' },
    { id: 'bridge', n: 'Brooklyn Bridge', steps: 15000, glyph: '🌉', beats: ['DUMBO. The Manhattan Bridge rumbles above you - wind, you hope.', 'The bridge walkway is barricaded with shopping carts. You climb through.', 'Halfway across. Manhattan is dark except for one window. It flickers.'], end: 'A National Guard checkpoint, abandoned. The supply tent was never emptied.' },
    { id: 'greenwood', n: 'Green-Wood Cemetery', steps: 18000, glyph: '🪦', beats: ['The parrots still live in the gate towers. They scream at you.', 'Battle Hill. You can see the whole borough burning in small, quiet places.', 'A mausoleum door hangs open. Someone made it a home.'], end: 'The caretaker\'s shed. Gloves, tools, and a note: "for whoever needs it."' },
    { id: 'coney', n: 'Coney Island', steps: 25000, glyph: '🎡', beats: ['Ocean Parkway. Bikes everywhere, like everyone rode here at once.', 'The Wonder Wheel creaks in the wind. A car at the top is still swinging.', 'The boardwalk. Gulls, salt and the smell of old fried dough.'], end: 'A shuttered arcade with a stocked back room. Someone was hoarding.' },
    { id: 'rockaway', n: 'Rockaway Beach', steps: 40000, glyph: '🌊', beats: ['Flatbush Avenue all the way down. Your feet hate you.', 'The Marine Parkway Bridge. The water below is very, very calm.', 'Fort Tilden. Concrete bunkers, and fresh footprints.'], end: 'A surf shack turned survivor cache. They left a note: "keep walking."' },
  ];
  W.DEST = DEST;
  const MS = [[25000, 'Stroller', 50, 1], [50000, 'Wanderer', 80, 1], [100000, 'Trailblazer', 120, 2], [250000, 'Road Warrior', 200, 3], [500000, 'Marathoner', 300, 4, 'halo'], [1000000, 'Million Miler', 500, 5, 'batwings'], [2500000, 'Legend of Brooklyn', 1000, 8]];
  const STREAK_BONUS = { 3: { items: [['beans', 2], ['water', 2]] }, 7: { tok: 1, caps: 40 }, 14: { tok: 2, caps: 80 }, 30: { tok: 3, caps: 150, title: 'Iron Legs' } };
  function st() {
    const v = SV(); if (!v || !v.survivor) return null;
    v.walks = v.walks || { streak: 0, best: 0, last: '', freezeWk: '', exp: null, expDone: {}, ms: [], title: '' };
    return v.walks;
  }
  W.state = st;
  const dayNum = k => G().routeApi.dayNum(k);
  const today = () => SV().day.key;
  const todaySteps = () => G().routeApi.effective();
  const weekOf = k => Math.floor((dayNum(k) + 3) / 7);   // Monday-based week number
  const tok = n => { if (n && DM.Gacha) DM.Gacha.state().tok += n; };
  const give = items => { if (items && items.length) G().routeApi.toStash(items.map(([k, n]) => ({ k, n }))); };
  // ---------------------------------------------------------------- daily streak
  function streakInfo() {
    const w = st(), t = today(), gap = w.last ? dayNum(t) - dayNum(w.last) : 99;
    const freezeOk = w.freezeWk !== String(weekOf(t));
    const alive = gap <= 1 || (gap === 2 && freezeOk);
    return { w, done: w.last === t, alive, gap, freezeOk, cur: alive ? w.streak : 0 };
  }
  W.claimable = () => { const w = st(); if (!w) return 0; const S = streakInfo(); let n = (!S.done && todaySteps() >= DAILY_GOAL) ? 1 : 0;
    n += MS.filter(m => (SV().walked || 0) >= m[0] && !w.ms.includes(m[0])).length; if (w.exp && expProg().beatReady) n++; return n; };
  function claimStreak() {
    const S = streakInfo(), w = S.w; if (S.done || todaySteps() < DAILY_GOAL) return;
    const usedFreeze = S.gap === 2 && S.alive;
    w.streak = S.alive ? w.streak + 1 : 1; w.last = today(); w.best = Math.max(w.best || 0, w.streak);
    if (usedFreeze) w.freezeWk = String(weekOf(today()));
    const n = w.streak, caps = 10 + 2 * Math.min(n, 15), got = [`${caps} caps`];
    SV().trader.caps += caps;
    const B = STREAK_BONUS[n] || (n > 30 && n % 7 === 0 ? { tok: 1, caps: 40 } : null);
    if (B) { if (B.caps) { SV().trader.caps += B.caps; got.push(`+${B.caps} bonus caps`); } if (B.tok) { tok(B.tok); got.push(`${B.tok} capsule token${B.tok > 1 ? 's' : ''}`); } if (B.items) { give(B.items); got.push(B.items.map(([k, c]) => `${c} ${D.ITEMS[k].n.toLowerCase()}`).join(', ')); } if (B.title) got.push(`the title "${B.title}"`); }
    G().save(); SFX.play('pick');
    toast(`🔥 Day ${n} streak${usedFreeze ? ' (freeze used)' : ''}! ${got.join(' · ')}`, 3);
  }
  // ---------------------------------------------------------------- expeditions
  function expProg() {
    const w = st(), x = w.exp; if (!x) return null;
    const d = DEST.find(q => q.id === x.id), walked = Math.max(0, (SV().walked || 0) - x.start), pct = Math.min(1, walked / d.steps);
    const reached = [.25, .5, .75].filter(t => pct >= t).length;
    return { d, x, walked, pct, reached, beatReady: reached > (x.beats || 0) || (pct >= 1) };
  }
  function startExp(id) { const w = st(); w.exp = { id, start: SV().walked || 0, beats: 0 }; G().save(); SFX.play('pick'); render(); }
  function expClaim() {
    const P = expProg(); if (!P) return; const w = st(), x = P.x, d = P.d;
    if (P.reached > (x.beats || 0)) {
      const i = x.beats || 0; x.beats = i + 1;
      const find = [['bandage', 2], ['beans', 2], ['scrap', 3], ['ammo', 10], ['water', 2], ['tape', 2], ['meds', 1], ['battery', 2]][(D.hashStr(d.id + i) >>> 0) % 8];
      give([find]); G().save(); SFX.play('pick');
      G().ui.sheetOpen(`<div class="kick">${d.glyph} ${esc(d.n)} · ${(i + 1) * 25}%</div><h3>On the way</h3><p class="mp">${esc(d.beats[i])}</p><div class="perkline"><b>You found</b><span>${find[1]} ${esc(D.ITEMS[find[0]].n.toLowerCase())} (to your stash)</span></div><button class="mbtn" id="wkOk">Keep walking</button>`);
      $('#wkOk').onclick = () => { G().ui.sheetClose(); render(); }; return;
    }
    if (P.pct >= 1) {
      const caps = Math.round(d.steps / 100), tk = d.steps >= 25000 ? 3 : d.steps >= 15000 ? 2 : 1;
      SV().trader.caps += caps; tok(tk);
      const rnd = D.mulberry32((D.hashStr(d.id) ^ (SV().walked || 0)) >>> 0), rolls = d.steps >= 25000 ? 3 : 2, items = [];
      for (let r = 0; r < rolls; r++) for (const k of D.rollLoot('hordecrate', rnd)) items.push({ k, n: 1 });
      const lost = G().routeApi.toStash(items);
      w.expDone[d.id] = (w.expDone[d.id] || 0) + 1; w.exp = null; G().save(); SFX.play('pick');
      const names = items.filter(e => D.ITEMS[e.k] && !D.ITEMS[e.k].cos).map(e => D.ITEMS[e.k].n.toLowerCase());
      G().ui.sheetOpen(`<div class="kick">${d.glyph} You made it</div><h3>${esc(d.n)}</h3><p class="mp">${esc(d.end)}</p>
        <div class="perkline"><b>Expedition crate</b><span>${caps} caps · ${tk} capsule token${tk > 1 ? 's' : ''}${names.length ? ' · ' + esc(names.join(', ')) : ''}</span></div>${lost && lost.length ? '<p class="mp warn">Your stash was full - some of it was left behind.</p>' : ''}
        <button class="mbtn" id="wkOk">Pick the next trip</button>`);
      $('#wkOk').onclick = () => { G().ui.sheetClose(); render(); };
    }
  }
  // ---------------------------------------------------------------- milestones
  function claimMs(t) {
    const w = st(), m = MS.find(q => q[0] === t); if (!m || w.ms.includes(t) || (SV().walked || 0) < t) return;
    w.ms.push(t); SV().trader.caps += m[2]; tok(m[3]); if (m[4]) G().unlockCos('cos_' + m[4]); if (!w.title) w.title = m[1];
    G().save(); SFX.play('pick'); toast(`🏅 ${m[1]}! +${m[2]} caps, ${m[3]} capsule token${m[3] > 1 ? 's' : ''}${m[4] ? ' and a legendary cosmetic' : ''}`, 3); render();
  }
  W.titles = () => { const w = st(); return w ? MS.filter(m => w.ms.includes(m[0])).map(m => m[1]).concat(w.best >= 30 ? ['Iron Legs'] : []).concat(DM.Codex ? DM.Codex.titles() : []) : []; };   // 0.35: + Codex feat titles
  W.title = () => { const w = st(); return w && w.title && W.titles().includes(w.title) ? w.title : ''; };
  // ---------------------------------------------------------------- the tab
  let host = null;
  W.renderPane = el => { host = el; render(); G().tip('walks'); };
  function render() {
    if (!host || !document.body.contains(host)) return;
    const w = st(); if (!w) return;
    const S = streakInfo(), ts = todaySteps(), pct = Math.min(1, ts / DAILY_GOAL), can = !S.done && ts >= DAILY_GOAL, walked = SV().walked || 0;
    const P = expProg();
    const next = MS.find(m => walked < m[0]);
    host.innerHTML = `<div class="wk">
      <div class="mcard wkcard"><div class="kick">🔥 Daily streak</div>
        <div class="wkrow"><div class="wkbig">${S.cur}<small>day${S.cur === 1 ? '' : 's'}</small></div><div class="wkinfo"><b>${S.done ? 'Done for today!' : can ? 'Goal reached - claim it!' : `${fmt(Math.max(0, DAILY_GOAL - ts))} steps to today's goal`}</b>
          <span>Goal ${fmt(DAILY_GOAL)} steps a day · best ${w.best || 0} · ${S.freezeOk ? '❄️ 1 freeze this week' : 'freeze used this week'}</span>
          <div class="mbar"><i style="width:${Math.round(pct * 100)}%"></i></div></div></div>
        ${can ? `<button class="mbtn" id="wkStreak">Claim day ${S.alive ? w.streak + 1 : 1}</button>` : ''}
        <p class="mp dim">Bigger rewards every day you keep it going; bonuses on day 3, 7, 14 and 30. Miss a day and the week's freeze saves it - miss two and it starts over.</p></div>
      <div class="mcard wkcard"><div class="kick">🧭 Expedition</div>
        ${P ? `<h3>${P.d.glyph} ${esc(P.d.n)}</h3><div class="wkinfo"><b>${fmt(P.walked)} / ${fmt(P.d.steps)} steps</b><span>${P.pct >= 1 ? 'You made it!' : `${fmt(P.d.steps - P.walked)} to go · stops at 25%, 50%, 75%`}</span>
          <div class="mbar wkexp"><i style="width:${Math.round(P.pct * 100)}%"></i>${[25, 50, 75].map(t => `<em style="left:${t}%"></em>`).join('')}</div></div>
          ${P.beatReady ? `<button class="mbtn" id="wkExp">${P.reached > (P.x.beats || 0) ? 'See what you found' : 'Open the crate'}</button>` : ''}
          <button class="lnk" id="wkCancel">Turn back (progress is lost)</button>`
        : `<p class="mp">Pick a destination. The steps you walk from now on carry you there - a find at every stop, and a crate at the end.</p>
          <div class="wkdest">${DEST.map(d => `<button class="wkd" data-exp="${d.id}"><span>${d.glyph}</span><b>${esc(d.n)}</b><i>${fmt(d.steps)} steps${w.expDone[d.id] ? ` · done ${w.expDone[d.id]}×` : ''}</i></button>`).join('')}</div>`}</div>
      <div class="mcard wkcard"><div class="kick">🏅 Milestones · ${fmt(walked)} lifetime steps</div>
        ${next ? `<div class="wkinfo"><span>Next: <b>${esc(next[1])}</b> at ${fmt(next[0])}</span><div class="mbar"><i style="width:${Math.round(walked / next[0] * 100)}%"></i></div></div>` : '<p class="mp">Every milestone reached. Legend.</p>'}
        <div class="wkms">${MS.map(m => { const got = w.ms.includes(m[0]), ready = !got && walked >= m[0]; return `<div class="wkm${got ? ' got' : ready ? ' ready' : ''}"><b>${m[0] >= 1e6 ? m[0] / 1e6 + 'M' : m[0] / 1000 + 'k'}</b><span>${esc(m[1])}</span><i>${m[2]} caps · ${m[3]} token${m[3] > 1 ? 's' : ''}${m[4] ? ' · cosmetic' : ''}</i>${ready ? `<button class="mbtn sm" data-ms="${m[0]}">Claim</button>` : got ? '<em>✓</em>' : ''}</div>`; }).join('')}</div>
        ${W.titles().length ? `<div class="kick sect" style="margin-top:10px">Your title</div><div class="chips">${['', ...W.titles()].map(t => `<button class="chip${(w.title || '') === t ? ' on' : ''}" data-title="${esc(t)}">${t ? esc(t) : 'None'}</button>`).join('')}</div>` : ''}</div>
    </div>`;
    const on = (id, fn) => { const b = host.querySelector('#' + id); if (b) b.onclick = () => { SFX.play('ui'); fn(); }; };
    on('wkStreak', () => { claimStreak(); render(); });
    on('wkExp', expClaim);
    const c = host.querySelector('#wkCancel'); if (c) c.onclick = () => { if (!c.dataset.sure) { c.dataset.sure = 1; c.textContent = 'Tap again to turn back'; return; } st().exp = null; G().save(); render(); };
    host.querySelectorAll('[data-exp]').forEach(b => b.onclick = () => startExp(b.dataset.exp));
    host.querySelectorAll('[data-ms]').forEach(b => b.onclick = () => claimMs(+b.dataset.ms));
    host.querySelectorAll('[data-title]').forEach(b => b.onclick = () => { st().title = b.dataset.title; G().save(); SFX.play('ui'); render(); });
  }
})();
