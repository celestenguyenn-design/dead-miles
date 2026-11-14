/* Dead Miles (next) - the daily challenge house (0.18).
   One special house a day, THE SAME FOR EVERYONE: type and seed come only from the New York date, the generator
   version is pinned (GV 4), and house.js seeds every loot roll from the house seed (opts.lootSeed), so every phone
   gets the same layout, the same zombies and the same things in every container. No raids, no event mini-boss,
   no hiding survivor/stray (those would differ per player). Needs no scouting: it sits at the top of the Houses tab.
   One scored attempt a day: the FIRST time she leaves (or goes down) counts. Going back in afterwards is just for
   fun: the house keeps what was searched and who was killed, so it cannot be farmed.
   Score (Y.score): loot value taken x4 (halved if downed) + 60 per secret + 15 per kill (40 per special infected)
   + a time bonus up to 150 (only with 60%+ of the containers searched) - 150 if downed. Never below 0.
   Leaderboard: NET.dailySubmit / NET.dailyBoard (net.js) -> next_daily_submit / next_daily_board (next/daily.sql).
   Offline or signed out the run still counts on the phone; the score is sent once it can be.
   Save: SV.daily = { day, h (the house record, with .run like any house), runs, res, sub, best, pend }. */
'use strict';
window.DM = window.DM || {};
(() => {
  const D = DM.D, E = DM.E, $ = E.$, SFX = E.SFX, toast = E.toast;
  const Y = DM.Daily = {};
  Y.GV = 4;   // pinned: a generator change must never give two players different daily houses
  Y.TYPES = [['rowL', 3], ['bodega', 3], ['pharmacy', 3], ['garage', 2.5], ['apt', 2], ['school', 2], ['laundro', 1.5], ['police', 1.5], ['mansion', 1]];
  Y.now = () => Date.now() + (Y.devOffset || 0);
  const SV = () => DM.Game && DM.Game.data();
  const N = () => window.NET;
  const pad = n => String(n).padStart(2, '0');
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = n => Math.round(n).toLocaleString('en-US');

  // ---------------------------------------------------------------- New York date
  let nyf = null; try { nyf = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }); } catch (e) { nyf = null; }
  function nyParts(ms) {
    if (nyf) try { const o = {}; for (const p of nyf.formatToParts(new Date(ms))) o[p.type] = p.value; return { y: +o.year, m: +o.month, d: +o.day, h: +o.hour % 24, mi: +o.minute, s: +o.second }; } catch (e) { /* below */ }
    const t = new Date(ms - 5 * 36e5); return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(), h: t.getUTCHours(), mi: t.getUTCMinutes(), s: t.getUTCSeconds() };
  }
  Y.day = (ms = Y.now()) => { const p = nyParts(ms); return p.y + '-' + pad(p.m) + '-' + pad(p.d); };
  Y.msLeft = (ms = Y.now()) => { const p = nyParts(ms); return Math.max(60e3, (86400 - (p.h * 3600 + p.mi * 60 + p.s)) * 1000); };
  Y.leftText = () => { const m = Math.floor(Y.msLeft() / 60e3); return m >= 60 ? Math.floor(m / 60) + ' h left' : m + ' min left'; };

  // ---------------------------------------------------------------- today's house (date only -> type + seed)
  Y.spec = function (day = Y.day()) {
    const rnd = D.mulberry32(D.hashStr('dm-daily-type:' + day));
    let v = rnd() * Y.TYPES.reduce((a, t) => a + t[1], 0), type = Y.TYPES[0][0];
    for (const [k, w] of Y.TYPES) { v -= w; if (v <= 0) { type = k; break; } }
    return { type, seed: D.hashStr('dm-daily-seed:' + day), gv: Y.GV, day };
  };
  function state() {
    const v = SV(); if (!v) return null;
    const today = Y.day();
    let d = v.daily;
    if (!d || typeof d !== 'object' || d.day !== today) {
      const pend = d && d.res && d.sub !== 1 && d.sub !== 2 ? { day: d.day, score: d.res.total, detail: d.res.detail } : (d && d.pend) || null;   // a score from yesterday not sent yet
      const sp = Y.spec(today), L = DM.Game.layoutOf({ type: sp.type, seed: sp.seed, gv: sp.gv });
      const ip = DM.Inf ? DM.Inf.plan(L) : { kinds: [], extra: 0 };
      d = v.daily = { day: today, runs: 0, res: null, sub: 0, best: null, pend,
        h: { id: 'daily', daily: 1, type: sp.type, seed: sp.seed, gv: sp.gv, day: today, status: 'new', address: L.address, danger: L.danger, nLocks: L.nLocks, nZombies: (L.zombies || []).length + ip.extra, nInf: ip.kinds.filter(Boolean).length } };
    }
    return d;
  }
  Y.state = state;
  Y.house = () => { const d = state(); return d && d.h; };

  // ---------------------------------------------------------------- score
  Y.P = { loot: 4, secret: 60, kill: 15, special: 40, timeMax: 150, timePar: 540, timeNeed: .6, down: 150 };
  Y.score = function (res) {
    const P = Y.P, dl = res.daily || {}, down = res.kind === 'down';
    const lootPts = Math.round(dl.v * P.loot * (down ? .5 : 1));
    const norm = Math.max(0, (dl.k || 0) - (dl.sp || 0)), sp = dl.sp || 0;
    const pct = dl.total ? dl.searched / dl.total : 0;
    const timePts = pct >= P.timeNeed ? Math.max(0, Math.min(P.timeMax, Math.round((P.timePar - (dl.t || 0)) / 2))) : 0;
    const parts = [
      ['Loot taken', lootPts, `${dl.n || 0} item${dl.n === 1 ? '' : 's'} · worth ${fmt(dl.v || 0)} caps${down ? ' · halved (spilled)' : ''}`],
      ['Secrets', res.secrets * P.secret, `${res.secrets} of ${res.secretsTotal} found`],
      ['Zombies', norm * P.kill + sp * P.special, `${norm} zombie${norm === 1 ? '' : 's'}${sp ? ` + ${sp} special infected` : ''}`],
      ['Time bonus', timePts, `${Math.floor((dl.t || 0) / 60)}:${pad((dl.t || 0) % 60)} inside · ${pct >= P.timeNeed ? Math.round(pct * 100) + '% searched' : `needs ${Math.round(P.timeNeed * 100)}% searched (you did ${Math.round(pct * 100)}%)`}`],
    ];
    if (down) parts.push(['Downed', -P.down, 'you went down in there']);
    const total = Math.max(0, parts.reduce((a, p) => a + p[1], 0));
    const detail = { type: res.type, loot: lootPts, value: Math.round(dl.v || 0), items: dl.n || 0, secrets: res.secrets, secretsTotal: res.secretsTotal, kills: dl.k || 0, special: sp, secs: dl.t || 0, searched: dl.searched || 0, total: dl.total || 0, time: timePts, down: down ? 1 : 0 };
    return { total, parts, detail, at: Date.now() };
  };

  // ---------------------------------------------------------------- server: submit once, board
  let sending = false, lastTry = 0;
  const online = () => !!(N() && N().ok && N().dailySubmit);
  async function submit(force) {
    const d = state(); if (!d) return;
    const job = d.res && d.sub !== 1 && d.sub !== 2 ? { day: d.day, score: d.res.total, detail: d.res.detail, cur: 1 } : d.pend ? Object.assign({ cur: 0 }, d.pend) : null;
    if (!job || sending || !online()) { if (d.res && d.sub === 0) d.sub = -1; return; }
    if (!force && Date.now() - lastTry < 60e3) return;
    sending = true; lastTry = Date.now();
    let r; try { r = await N().dailySubmit(job.day, job.score, job.detail); } catch (e) { r = { ok: false, error: 'offline' }; }
    sending = false;
    if (job.cur) { d.sub = r.ok ? 1 : r.error === 'offline' || r.error === 'signed-out' ? -1 : 2; if (r.ok) d.best = r.best; if (!r.ok) d.err = r.error; }
    else if (r.ok || (r.error !== 'offline' && r.error !== 'signed-out')) d.pend = null;
    DM.Game.save();
    if (r.ok) fetchBoard(true);
    paint();
  }
  Y.submit = submit;
  let board = { day: '', rows: [], ok: false, at: 0, loading: false };
  async function fetchBoard(force) {
    const day = Y.day();
    if (!N() || !N().dailyBoard) return;
    if (board.loading || (!force && board.day === day && Date.now() - board.at < 60e3)) return;
    board.loading = true;
    let r; try { r = await N().dailyBoard(day); } catch (e) { r = { ok: false, rows: [] }; }
    board = { day, rows: Array.isArray(r.rows) ? r.rows : [], ok: !!r.ok, cached: !!r.cached, at: Date.now(), loading: false };
    paint();
  }
  Y.board = () => board;
  const me = () => (N() && N().handle ? String(N().handle).toLowerCase() : '');
  function boardHTML(n) {
    const d = state(), rows = board.day === Y.day() ? board.rows : [];
    const mine = d && d.res ? d.res.total : null;
    if (!rows.length) {
      if (!online() || (board.at && !board.ok)) return `<div class="dlyoff">Scores need sign-in / offline${mine != null ? ` · yours: <b>${fmt(mine)}</b> (kept on this phone${d.sub === 1 ? '' : ', sent when you are online'})` : ''}</div>`;
      return `<div class="dlyoff">${board.loading || !board.at ? 'Loading today\'s scores…' : 'Nobody has a score yet today. Be the first.'}</div>`;
    }
    const meH = me(), top = rows.slice(0, n), myI = rows.findIndex(r => String(r.handle).toLowerCase() === meH);
    const row = (r, i) => `<li${String(r.handle).toLowerCase() === meH ? ' class="me"' : ''}><i>${i + 1}</i><span>${esc(r.name || r.handle)}</span><b>${fmt(r.score)}</b></li>`;
    return `<ol class="dlyrows">${top.map(row).join('')}${myI >= n ? '<li class="gap">…</li>' + row(rows[myI], myI) : ''}</ol>${!board.ok ? '<div class="dlyoff">Offline - last scores seen</div>' : ''}`;
  }
  function paint() {   // refresh any board on screen (house card, summary)
    document.querySelectorAll('.dlyboard').forEach(el => { el.innerHTML = boardHTML(+el.dataset.n || 3); });
    document.querySelectorAll('.dlyme').forEach(m => { m.innerHTML = meLine(); });
  }
  function meLine() {
    const d = state(); if (!d) return '';
    if (!d.res) return d.h.run ? 'Scored run in progress - go back in to finish it' : 'One scored run today · your first exit counts';
    const rank = board.day === d.day ? board.rows.findIndex(r => String(r.handle).toLowerCase() === me()) : -1;
    return `Your score: <b>${fmt(d.res.total)}</b>${rank >= 0 ? ` · #${rank + 1} of ${board.rows.length}` : ''}${d.sub === 1 ? '' : d.sub === 2 ? ' · not accepted by the server' : online() ? ' · sending…' : ' · Scores need sign-in / offline (kept on this phone)'}`;
  }

  // ---------------------------------------------------------------- the Houses tab card
  Y.cardHTML = function () {
    const d = state(); if (!d) return '';
    const h = d.h, T = D.BTYPES[h.type], U = DM.Game.ui;
    const tags = [h.nLocks ? `${h.nLocks} lock${h.nLocks > 1 ? 's' : ''}` : 'no locks', `${h.nZombies} zombie${h.nZombies === 1 ? '' : 's'}`];
    if (h.nInf) tags.push(`<b class="inftag">☣ ${h.nInf} special infected</b>`);
    const btn = d.res ? 'Again' : d.h.run ? 'Continue' : 'Go in';
    return `<div class="hcard daily" id="dlyCard">
      ${U.typeIcon(h.type)}
      <div class="hinfo"><div class="hname dlyname">Daily challenge · ${T.n} · <span class="dlyleft">${Y.leftText()}</span></div>
        <div class="haddr">${esc(h.address)} · same house for everyone</div>
        <div class="hmeta"><span class="danger">${U.skulls(h.danger)}</span><span>${tags.join(' · ')}</span></div>
        <div class="dlyme">${meLine()}</div>
        <div class="dlyboard" data-n="3">${boardHTML(3)}</div></div>
      <div class="hbtns"><button class="mbtn" id="dlyGo">${btn}</button><button class="mbtn ghost" id="dlyTop">Scores</button></div></div>`;
  };
  Y.bind = function (root) {
    const g = (root || document).querySelector('#dlyGo'); if (!g) return;
    g.onclick = () => { SFX.play('ui'); const d = state(); if (d.res) toast('Just for fun - only your first run counts today', 2.2); DM.Game.loot(d.h); };
    const t = (root || document).querySelector('#dlyTop'); if (t) t.onclick = () => { SFX.play('ui'); boardSheet(); };
    fetchBoard(); submit();
  };
  function boardSheet() {
    const d = state();
    DM.Game.ui.sheetOpen(`<div class="kick">Daily challenge · ${esc(d.day)}</div><h3>Today's scores</h3>
      <p class="dlyhow">${esc(D.BTYPES[d.h.type].n)} · ${esc(d.h.address)}. Everyone gets the same house and the same loot. Only your first run counts.<br>
      Score: loot value x${Y.P.loot} · ${Y.P.secret} a secret · ${Y.P.kill} a zombie (${Y.P.special} a special) · up to ${Y.P.timeMax} for speed (with ${Math.round(Y.P.timeNeed * 100)}%+ searched) · -${Y.P.down} if downed.</p>
      <div class="dlyme">${meLine()}</div><div class="dlyboard" data-n="50">${boardHTML(50)}</div>
      <div class="btnrow"><button class="mbtn sm" id="dlyClose">Close</button></div>`);
    $('#dlyClose').onclick = () => DM.Game.ui.sheetClose();
    fetchBoard(true);
  }

  // ---------------------------------------------------------------- after a run (game.js loot() hands it over)
  Y.onExit = function (h, res) {
    const d = state(); if (!d) return;
    d.runs = (d.runs || 0) + 1;
    if (h.day !== d.day) { toast('That was yesterday\'s daily house - it no longer counts', 2.4); return; }
    if (d.res) { toast(`Just for fun · your scored run was ${fmt(d.res.total)}`, 2.4); return; }
    d.res = Y.score(res); d.sub = 0;
    DM.Game.save(); DM.Game.renderHome();
    summary();
    submit(true);
  };
  function summary() {
    const d = state(), r = d.res;
    DM.Game.ui.sheetOpen(`<div class="kick">Daily challenge · ${esc(D.BTYPES[d.h.type].n)} · ${esc(d.day)}</div><h3 class="dlytot">${fmt(r.total)} <small>points</small></h3>
      <table class="dlyparts">${r.parts.map(([n, v, note]) => `<tr${v < 0 ? ' class="neg"' : ''}><td>${n}<small>${esc(note)}</small></td><td>${v < 0 ? '' : '+'}${fmt(v)}</td></tr>`).join('')}
        <tr class="sum"><td>Total</td><td>${fmt(r.total)}</td></tr></table>
      <div class="dlyme">${meLine()}</div>
      <div class="dlyboard" data-n="10">${boardHTML(10)}</div>
      <p class="dlyhow">Only this first run counts. You can go back in for fun - the house stays as you left it. A new house at midnight New York time.</p>
      <div class="btnrow"><button class="mbtn sm" id="dlyClose">OK</button></div>`);
    $('#dlyClose').onclick = () => DM.Game.ui.sheetClose();
  }
  Y.summary = summary;
  // the "N h left" on the card ticks while the Houses tab is open
  setInterval(() => { const el = document.querySelector('#dlyCard .dlyleft'); if (el) el.textContent = Y.leftText(); }, 60e3);
})();
