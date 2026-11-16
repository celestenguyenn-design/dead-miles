/* Dead Miles (next) 0.50 - the survival log (owner: "survival log ... make it animated with sound effects of page turning").
   A journal the game writes for you, one page a day: "Day 23. Walked 7,412 steps. Went into 3 houses ... Took The Mill."
   - Tallies come from snapshots (steps today, kills, houses, downs) taken when the home screen draws; when the date changes,
     yesterday's page is closed. Other parts of the game add lines with DM.Journal.note(text) (camps taken, raids, crew
     joining, deep runs, levels, walking caches, escorts...).
   - The book: a full-screen overlay; flip with the arrows or a swipe - the page turns over in 3D with a paper sound
     (a short filtered noise sweep). "Copy" puts a page on the clipboard to send to friends. Days survived = days since
     the character was made.
   Save: SV.journal = { cur: { key, day, w0, k0, r0, d0, notes }, pages: [{ key, day, steps, kills, runs, downs, notes, wx }] } (last 120). */
'use strict';
window.DM = window.DM || {};
(() => {
  const J = DM.Journal = {};
  const G = () => DM.Game, SV = () => DM.Game && DM.Game.data();
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = n => Math.round(n).toLocaleString('en-US');
  const keyOf = (d = new Date()) => d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  const dayNum = v => Math.max(1, Math.floor((Date.now() - (+v.created || Date.now())) / 864e5) + 1);
  const stepsToday = v => { const d = v.day || {}; return Math.round((d.phone || 0) + (d.walk || 0) + (d.typed || 0)); };
  function st() {
    const v = SV(); v.journal = v.journal || { cur: null, pages: [] }; const j = v.journal;
    const k = keyOf();
    if (!j.cur || j.cur.key !== k) {
      if (j.cur) { j.pages.push(close(j.cur, v)); if (j.pages.length > 120) j.pages.splice(0, j.pages.length - 120); }
      j.cur = { key: k, day: dayNum(v), k0: v.stats.kills || 0, r0: v.stats.runs || 0, d0: v.stats.downs || 0, notes: [], steps: 0 };
    }
    return j;
  }
  function close(c, v) { return { key: c.key, day: c.day, steps: c.steps || 0, kills: Math.max(0, (c.k1 != null ? c.k1 : v.stats.kills) - c.k0), runs: Math.max(0, (c.r1 != null ? c.r1 : v.stats.runs) - c.r0), downs: Math.max(0, (c.d1 != null ? c.d1 : v.stats.downs) - c.d0), notes: c.notes.slice(0, 12), wx: c.wx || '' }; }
  // called when the home screen draws: keep today's numbers fresh
  J.tick = function () {
    const v = SV(); if (!v || !v.survivor) return;
    const j = st(), c = j.cur; c.steps = Math.max(c.steps || 0, stepsToday(v)); c.k1 = v.stats.kills || 0; c.r1 = v.stats.runs || 0; c.d1 = v.stats.downs || 0;
    if (!c.wx && DM.Weather) { try { const w = DM.Weather.now(); if (w && w.type) c.wx = w.type; } catch (e) { /* ignore */ } }
  };
  J.note = function (t) { const v = SV(); if (!v || !v.survivor) return; const j = st(); if (j.cur.notes.length < 12 && !j.cur.notes.includes(t)) { j.cur.notes.push(t); if (G() && G().save) G().save(); } };
  // ---------------------------------------------------------------- writing a page
  const WX = { rain: 'It rained the whole time.', storm: 'Thunder all day. Good cover for noise.', snow: 'Snow. Everything quiet and white.', fog: 'Fog so thick you could lose a hand in it.', wind: 'The wind kept slamming doors.', clear: 'Clear skies. Too bright to hide.', cloudy: 'Grey sky, grey streets.' };
  const MOOD = ['Still here.', 'Another day the dead didn\'t get me.', 'My feet hurt. Good sign, I guess.', 'I keep a list of everyone I lost. I keep walking anyway.', 'Somewhere out there, someone is doing the same thing I am.', 'The quiet is the worst part.', 'Found myself humming today. Weird.', 'Tomorrow, more of the same. That\'s fine.'];
  function text(p, v, live) {
    const r = DM.D.mulberry32(DM.D.hashStr(p.key) >>> 0), out = [];
    if (p.steps) out.push(`Walked ${fmt(p.steps)} steps${p.steps >= 10000 ? ' - a big day' : p.steps < 1500 ? ', barely left home' : ''}.`);
    if (p.runs) out.push(`Went into ${p.runs} house${p.runs > 1 ? 's' : ''}${p.kills ? ` and put down ${p.kills} of them` : ''}.`);
    else if (p.kills) out.push(`Put down ${p.kills} of them.`);
    if (p.downs) out.push(p.downs > 1 ? `Went down ${p.downs} times. Lucky to be writing this.` : 'Went down once. Lucky to be writing this.');
    for (const n of p.notes) out.push(n);
    if (p.wx && WX[p.wx] && r() < .7) out.push(WX[p.wx]);
    if (!live || out.length < 2) out.push(MOOD[Math.floor(r() * MOOD.length)]);
    return out;
  }
  // ---------------------------------------------------------------- the book
  let idx = 0, pages = [];
  function build() { const v = SV(), j = st(); J.tick(); pages = j.pages.concat([Object.assign(close(j.cur, v), { live: 1, day: dayNum(v) })]); }
  function pageHTML(i) {
    const p = pages[i], v = SV(); if (!p) return '';
    const d = new Date(p.key.replace(/-(\d)(?!\d)/g, '-0$1') + 'T12:00:00'), date = isNaN(d) ? p.key : d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
    return `<div class="jdate">${esc(date)}${p.live ? ' · today' : ''}</div><h2 class="jday">Day ${p.day}</h2>
      ${text(p, v, p.live).map(l => `<p>${esc(l)}</p>`).join('')}
      <div class="jsign">- ${esc(v.survivor.name)}</div><div class="jnum">${i + 1} / ${pages.length}</div>`;
  }
  function turnSound(back) {
    const S = DM.E && DM.E.SFX; if (!S || !S.ac) return;
    try { S.noise(.28, 'bandpass', back ? 2600 : 1400, back ? 1200 : 3200, .16, 1.4); S.noise(.12, 'highpass', 3000, 5000, .05, 1, .16); } catch (e) { /* ignore */ }
  }
  function flip(dir) {
    const ni = idx + dir; if (ni < 0 || ni >= pages.length) return;
    const leaf = document.getElementById('jleaf'), under = document.getElementById('jpage');
    if (!leaf || leaf.dataset.busy) return; leaf.dataset.busy = 1;
    turnSound(dir < 0);
    // the leaf shows the page we leave, the page under shows the one we go to; the leaf turns over
    leaf.innerHTML = pageHTML(idx); under.innerHTML = pageHTML(ni);
    leaf.className = 'jleaf on ' + (dir > 0 ? 'fwd' : 'back');
    idx = ni; navBtns();
    setTimeout(() => { leaf.className = 'jleaf'; leaf.innerHTML = ''; delete leaf.dataset.busy; }, 560);
  }
  function navBtns() { const pv = document.getElementById('jPrev'), nx = document.getElementById('jNext'); if (pv) pv.disabled = idx <= 0; if (nx) nx.disabled = idx >= pages.length - 1; }
  J.open = function () {
    build(); idx = pages.length - 1;
    let el = document.getElementById('journal');
    if (!el) { el = document.createElement('div'); el.id = 'journal'; document.body.appendChild(el); }
    const v = SV();
    el.innerHTML = `<div class="jbook"><div class="jtop"><span>📓 ${esc(v.survivor.name)}'s survival log · day ${dayNum(v)}</span><button id="jClose">✕</button></div>
      <div class="jstage"><div class="jpage" id="jpage">${pageHTML(idx)}</div><div class="jleaf" id="jleaf"></div></div>
      <div class="jnav"><button id="jPrev">‹ Back</button><button id="jCopy" class="g">Copy page</button><button id="jNext">Next ›</button></div></div>`;
    el.classList.add('on'); turnSound(false); navBtns();
    el.querySelector('#jClose').onclick = () => { el.classList.remove('on'); turnSound(true); };
    el.querySelector('#jPrev').onclick = () => flip(-1);
    el.querySelector('#jNext').onclick = () => flip(1);
    el.querySelector('#jCopy').onclick = () => { const p = pages[idx], t = `Dead Miles - ${v.survivor.name}, day ${p.day}\n` + text(p, v, p.live).join(' '); try { navigator.clipboard.writeText(t); DM.E.toast('Page copied - paste it to a friend', 1.8); } catch (e) { DM.E.toast('Could not copy', 1.4); } };
    let sx = null; const stg = el.querySelector('.jstage');
    stg.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
    stg.addEventListener('touchend', e => { if (sx == null) return; const dx = e.changedTouches[0].clientX - sx; sx = null; if (Math.abs(dx) > 50) flip(dx < 0 ? 1 : -1); });
  };
  J.tile = function () { const v = SV(); if (!v || !v.tutorialDone) return null; return { k: 'journal', c: '#c9a86a', n: 'Survival log', sub: `Day ${dayNum(v)} · ${st().pages.length + 1} page${st().pages.length ? 's' : ''}`, hot: '' }; };
  const css = document.createElement('style'); css.textContent = `
    #journal { position: fixed; inset: 0; z-index: 9000; display: none; align-items: center; justify-content: center; background: rgba(9,8,26,.82); padding: 14px; }
    #journal.on { display: flex; animation: jfade .25s ease-out; } @keyframes jfade { from { opacity: 0; } to { opacity: 1; } }
    .jbook { width: 100%; max-width: 420px; display: flex; flex-direction: column; gap: 10px; }
    .jtop { display: flex; justify-content: space-between; align-items: center; color: #f6e3bb; font: 800 13px Inter, system-ui, sans-serif; }
    .jtop button { width: 34px; height: 34px; border-radius: 50%; border: 2px solid #5a4a86; background: #1c1538; color: #f6e3bb; font-size: 15px; }
    .jstage { position: relative; height: min(70vh, 560px); perspective: 1400px; }
    .jpage, .jleaf { position: absolute; inset: 0; padding: 26px 24px 40px; border-radius: 6px 16px 16px 6px; overflow-y: auto;
      background: linear-gradient(90deg, #d9c9a3 0, #efe3c4 6%, #f3e9cf 50%, #efe3c4 100%); color: #3a2b1c; box-shadow: inset 6px 0 10px rgba(80,55,20,.25), 0 10px 30px rgba(0,0,0,.5);
      font-family: 'Segoe Print', 'Bradley Hand', 'Comic Sans MS', cursive; }
    .jpage::before { content: ''; position: absolute; inset: 0; background: repeating-linear-gradient(transparent 0 29px, rgba(70,100,160,.18) 29px 30px); pointer-events: none; border-radius: inherit; }
    .jleaf { display: none; transform-origin: left center; backface-visibility: hidden; z-index: 2; background: linear-gradient(90deg, #d9c9a3 0, #efe3c4 6%, #f3e9cf 50%, #efe3c4 100%); }
    .jleaf.on { display: block; } .jleaf.fwd { animation: jturn .55s ease-in forwards; } .jleaf.back { transform-origin: right center; animation: jturnb .55s ease-in forwards; }
    @keyframes jturn { 0% { transform: rotateY(0); opacity: 1; } 75% { opacity: 1; } 100% { transform: rotateY(-105deg); opacity: 0; } }
    @keyframes jturnb { 0% { transform: rotateY(0); opacity: 1; } 75% { opacity: 1; } 100% { transform: rotateY(105deg); opacity: 0; } }
    .jdate { font: 700 12px Inter, system-ui, sans-serif; letter-spacing: .08em; text-transform: uppercase; color: #8a6a3a; }
    .jday { margin: 4px 0 14px; font-size: 30px; line-height: 1; color: #2a1e12; }
    .jpage p, .jleaf p { margin: 0 0 10px; font-size: 17px; line-height: 1.75; }
    .jsign { margin-top: 18px; text-align: right; font-size: 18px; } .jnum { position: absolute; bottom: 12px; right: 18px; font: 700 11px Inter, system-ui, sans-serif; color: #8a6a3a; }
    .jnav { display: flex; gap: 8px; } .jnav button { flex: 1; height: 44px; border-radius: 12px; border: 2.5px solid #11142f; background: #f07b3c; color: #11142f; font: 900 14px Inter, system-ui, sans-serif; box-shadow: 0 3px 0 #11142f; }
    .jnav button.g { background: #1c1538; color: #f6e3bb; border-color: #5a4a86; box-shadow: none; } .jnav button:disabled { opacity: .35; }`;
  document.head.appendChild(css);
})();
