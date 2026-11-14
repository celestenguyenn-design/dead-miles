/* Dead Miles (next) - online layer. window.NET
   Accounts are the SAME players rows the old game uses (handle + token), so a
   friend's iPhone Shortcut / Android companion keep posting to step_posts and
   this reads them through the existing get_steps RPC. Everything new on the
   server is a next_* table/function. See next/NET.md for the contract. */
(function () {
  'use strict';
  const SB = {
    url: 'https://edejxfcsjqwedbgulygi.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkZWp4ZmNzanF3ZWRiZ3VseWdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0NTExMzEsImV4cCI6MjEwNTAyNzEzMX0.Z0T954DSwTVlRM37i_fJLVtu_x2IrdOoJMx6ImInVKI'
  };
  const K = { id: 'dm-next-id', steps: 'dm-next-steps', save: 'dm-next-save', pub: 'dm-next-pub', board: 'dm-next-board', party: 'dm-next-party' };
  const MAX_STATE = 256 * 1024;

  const NET = window.NET = {
    SB, ok: false, handle: '', name: '', token: '', status: 'signed-out', err: '',
    hasPin: false, pin: '', stepKey: '', idSource: '',
    lastPull: 0, lastPost: 0, steps: { today: 0, yesterday: 0, src: 'none', posts: [] },
    conflict: null, party: null, boardRows: [],
    cfg: { timeout: 12000, saveDelay: 4000, publishDelay: 15000, pollMs: 5 * 60000, typedCap: 4000,
      // Players whose phone cannot sync and who type their steps instead. The owner's call:
      // their typed totals count exactly like phone steps. Handles, lower case.
      trustedTyped: ['isa'],
      // One-time step corrections the owner asked for. Posts for day d sent before
      // 'before' (ms) are ignored, and the day is lowered to 'to' once.
      // celeste 2026-11-13: Oura + iPhone were both counted until the Shortcut got its Source filter.
      fixes: [{ id: 'c1113', h: 'celeste', d: '2026-11-13', before: Date.parse('2026-11-14T01:11:00Z'), to: 3064 },
        // a second, older shortcut kept posting phone + ring until 23:51 New York
        { id: 'c1113b', h: 'celeste', d: '2026-11-13', before: Date.parse('2026-11-14T04:51:00Z'), to: 4032 }] },
    onConflict: null,   // ({local, remote}) => 'local' | 'remote' | Promise of either
    onChange: null      // () => void, any status change (panel uses it)
  };

  // NET.onSteps = (delta, src, info) => any. Return false to refuse (re-offered later).
  // Setting it hands over anything that arrived before the game was ready.
  let onStepsFn = null;
  Object.defineProperty(NET, 'onSteps', {
    get: () => onStepsFn,
    set: fn => { onStepsFn = typeof fn === 'function' ? fn : null; if (onStepsFn) setTimeout(() => NET.applyPending(), 0); }
  });

  /* ---------------- small helpers ---------------- */
  const pad = n => String(n).padStart(2, '0');
  const dayStr = (d = new Date()) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const ydStr = () => { const d = new Date(); d.setDate(d.getDate() - 1); return dayStr(d); };
  const slug = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 20);
  const lsGet = k => { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : null; } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
  const rnd = n => { const a = new Uint8Array(n); (window.crypto || window.msCrypto).getRandomValues(a); return Array.from(a, b => b.toString(16).padStart(2, '0')).join(''); };
  NET.dayStr = dayStr; NET.slug = slug;
  function changed() { try { if (NET.onChange) NET.onChange(); } catch (e) { } try { window.dispatchEvent(new CustomEvent('net:change')); } catch (e) { } }
  function setErr(e) { NET.err = e ? String(e.message || e) : ''; }

  async function rpc(fn, args, ms) {
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const t = setTimeout(() => { try { ctl && ctl.abort(); } catch (e) { } }, ms || NET.cfg.timeout);
    try {
      const r = await fetch(SB.url + '/rest/v1/rpc/' + fn, {
        method: 'POST', signal: ctl ? ctl.signal : undefined,
        headers: { apikey: SB.key, Authorization: 'Bearer ' + SB.key, 'Content-Type': 'application/json' },
        body: JSON.stringify(args || {})
      });
      const txt = await r.text();
      if (!r.ok) throw new Error(fn + ' failed (' + r.status + '): ' + txt.slice(0, 160));
      return txt ? JSON.parse(txt) : null;
    } catch (e) {
      if (e && e.name === 'AbortError') throw new Error(fn + ': the server took too long');
      throw e;
    } finally { clearTimeout(t); }
  }
  NET.rpc = rpc;
  const auth = () => ({ p_handle: NET.handle, p_token: NET.token });

  /* ---------------- identity ---------------- */
  function writeId() {
    lsSet(K.id, { h: NET.handle, t: NET.token, name: NET.name, pin: NET.pin || '', src: NET.idSource || '', since: ledger().since || dayStr() });
  }
  // The OLD game's identity on this device. READ ONLY: never written to, and the
  // IndexedDB / Cache lookups are done in a way that cannot create them.
  function oldSave() { return lsGet('deadmiles.v3'); }
  async function oldIdentity() {
    const v3 = oldSave();
    const fromSave = v3 && v3.online && v3.online.handle && v3.online.token ? { h: v3.online.handle, t: v3.online.token } : null;
    let a = lsGet('deadmiles.id');
    if (!(a && a.h && a.t)) { try { const m = document.cookie.match(/(?:^|; )dm_id=([^;]*)/); if (m) a = JSON.parse(decodeURIComponent(m[1])); } catch (e) { } }
    if (!(a && a.h && a.t) && window.indexedDB) {
      a = await new Promise(res => {
        try {
          const r = indexedDB.open('deadmiles');
          r.onupgradeneeded = () => { try { r.transaction.abort(); } catch (e) { } };   // did not exist: do not create it
          r.onerror = () => res(null);
          r.onsuccess = () => {
            const db = r.result;
            try {
              if (!db.objectStoreNames.contains('kv')) { db.close(); return res(null); }
              const q = db.transaction('kv', 'readonly').objectStore('kv').get('id');
              q.onsuccess = () => { db.close(); try { res(q.result ? JSON.parse(q.result) : null); } catch (e) { res(null); } };
              q.onerror = () => { db.close(); res(null); };
            } catch (e) { try { db.close(); } catch (e2) { } res(null); }
          };
        } catch (e) { res(null); }
      });
    }
    if (!(a && a.h && a.t) && window.caches) {
      try { if (await caches.has('deadmiles-id')) { const c = await caches.open('deadmiles-id'); const m = await c.match('/id'); if (m) a = JSON.parse(await m.text()); } } catch (e) { }
    }
    // The save's own online block is the most recently used token, prefer it when it is the same handle.
    if (fromSave && (!a || !a.h || slug(a.h) === slug(fromSave.h))) a = fromSave;
    if (!(a && a.h && a.t)) return null;
    return { h: slug(a.h), t: String(a.t), pin: (v3 && v3.recovery) || '', name: (v3 && v3.name) || '' };
  }

  async function verify(h, t) {
    const r = await rpc('next_whoami', { p_handle: h, p_token: t });
    return r && r.ok ? r : null;
  }
  function adopt(h, t, info, src) {
    const L = ledger();
    if (L.owner && L.owner !== slug(h)) {
      // A different account on this device: park the other account's local save
      // (never delete it) and start a clean step ledger.
      const sv = localSave(); if (sv) lsSet(K.save + '-' + L.owner, sv);
      LEDGER = { days: {} };
      try { localStorage.removeItem(K.save); localStorage.removeItem(K.pub); localStorage.removeItem(K.party); } catch (e) { }
    }
    ledger().owner = slug(h); saveLedger();
    NET.handle = slug(h); NET.token = t; NET.ok = true; NET.status = 'online'; NET.err = '';
    if (info) { NET.name = info.name || NET.name || h; NET.hasPin = !!info.has_pin; }
    NET.idSource = src || NET.idSource;
    if (!ledger().since) { ledger().since = dayStr(); saveLedger(); }
    writeId(); changed();
  }

  NET.init = async function (opts) {
    opts = opts || {};
    if (NET._inited) return NET.ok;
    NET._inited = true;
    const id = lsGet(K.id);
    let cand = id && id.h && id.t ? { h: id.h, t: id.t, pin: id.pin || '', name: id.name || '', src: id.src || 'next' } : null;
    if (!cand) { const o = await oldIdentity(); if (o) cand = Object.assign(o, { src: 'old-game' }); }
    if (cand) {
      NET.handle = cand.h; NET.token = cand.t; NET.pin = cand.pin || ''; NET.name = cand.name || cand.h; NET.idSource = cand.src;
      NET.status = 'checking'; changed();
      try {
        const info = await verify(cand.h, cand.t);
        if (info) adopt(cand.h, cand.t, info, cand.src);
        else { NET.ok = false; NET.status = 'bad-key'; NET.err = 'This device holds an out-of-date key for @' + cand.h + '. Sign in again.'; changed(); }
      } catch (e) {
        // Offline: trust the stored identity, it gets checked on the next call.
        NET.ok = true; NET.status = 'offline'; setErr(e); changed();
      }
    } else { NET.status = 'signed-out'; changed(); }
    await handleUrlSteps();
    if (NET.ok && opts.pull !== false) await NET.pullSteps();
    if (NET.ok) { flushSave(); flushPublish(); }
    startTimers();
    return NET.ok;
  };

  NET.register = async function (handle, name) {
    const h = slug(handle);
    if (!h || h.length < 2) return { ok: false, error: 'Pick a handle: 2-20 letters or numbers.' };
    const t = rnd(16);
    let ok;
    try { ok = await rpc('register_player', { p_handle: h, p_token: t, p_name: String(name || h).slice(0, 24) }); }
    catch (e) { setErr(e); changed(); return { ok: false, error: 'Could not reach the server. ' + NET.err }; }
    if (!ok) return { ok: false, error: 'taken', message: '@' + h + ' is already taken. If it is yours, use "I already play".' };
    NET.pin = ''; NET.name = name || h;
    adopt(h, t, { name: name || h, has_pin: false }, 'next');
    NET.pullSteps();
    return { ok: true, handle: h };
  };

  // secret = the account key, or the 6-digit recovery PIN (that issues a NEW key for this device).
  NET.signIn = async function (handle, secret) {
    const h = slug(handle); const s = String(secret || '').trim();
    if (!h) return { ok: false, error: 'Type your handle.' };
    if (!s) return { ok: false, error: 'Type your account key or 6-digit PIN.' };
    try {
      if (/^\d{6}$/.test(s)) {
        const fresh = rnd(16);
        const r = await rpc('recover_login', { p_handle: h, p_code: s, p_new_token: fresh });
        if (!r || !r.ok) {
          const e = r && r.error;
          return { ok: false, error: e === 'locked' ? 'Too many wrong tries. Wait 15 minutes.' : e === 'none' ? 'That handle has no PIN set. Use the account key.' : 'Wrong PIN' + (r && typeof r.left === 'number' ? ' - ' + r.left + ' tries left.' : '.') };
        }
        NET.pin = s;
        adopt(h, fresh, await verify(h, fresh), 'pin');
        NET.rotated = true;   // other devices / the Android app still hold the OLD key
      } else {
        const info = await verify(h, s);
        if (!info) return { ok: false, error: 'That handle and key do not match.' };
        const old = await oldIdentity(); NET.pin = (old && old.h === h && old.pin) || NET.pin;
        adopt(h, s, info, 'key');
      }
    } catch (e) { setErr(e); changed(); return { ok: false, error: 'Could not reach the server. ' + NET.err }; }
    NET.pullSteps();
    return { ok: true, handle: h };
  };

  NET.signOut = function () {
    try { localStorage.removeItem(K.id); } catch (e) { }
    NET.ok = false; NET.handle = ''; NET.token = ''; NET.pin = ''; NET.stepKey = ''; NET.status = 'signed-out'; NET.idSource = '';
    changed();
  };

  NET.makePin = function () {
    const weak = ['123456', '654321', '012345', '543210', '123123', '121212', '111222', '696969', '101010', '202020'];
    for (; ;) { let p = ''; const a = new Uint8Array(6); crypto.getRandomValues(a); for (const b of a) p += b % 10; if (!/^(\d)\1{5}$/.test(p) && !weak.includes(p)) return p; }
  };
  NET.setPin = async function (pin) {
    if (!NET.ok) return { ok: false, error: 'Sign in first.' };
    const c = String(pin || '').replace(/\D/g, '');
    if (c.length !== 6) return { ok: false, error: 'Six digits, numbers only.' };
    let r; try { r = await rpc('set_recovery', { p_handle: NET.handle, p_token: NET.token, p_code: c }); }
    catch (e) { return { ok: false, error: 'Could not reach the server.' }; }
    const msg = { taken: 'Someone already uses that PIN. Pick another.', format: 'Six digits, numbers only.', weak: 'Too easy to guess.', busy: 'Too many changes. Wait an hour.', bad: 'This device key is out of date. Sign in again.' };
    if (r !== 'ok') return { ok: false, error: msg[r] || ('Server said: ' + r) };
    NET.pin = c; NET.hasPin = true; writeId(); changed();
    return { ok: true };
  };

  NET.getStepKey = async function () {
    if (!NET.ok) return '';
    if (NET.stepKey) return NET.stepKey;
    try { const k = await rpc('get_step_key', auth()); if (k) { NET.stepKey = k; changed(); } } catch (e) { }
    return NET.stepKey;
  };
  NET.shortcutCode = () => NET.handle + '|' + (NET.stepKey || NET.token) + '|';
  NET.shortcutUrl = () => SB.url + '/rest/v1/rpc/post_steps_link?apikey=' + SB.key;

  /* ---------------- steps ledger ----------------
     Per local day: phone = highest running total any phone post reported,
     typed = the typed "my total today" claim, ap/at = steps already handed to
     the game as phone/typed. The game is only ever given (target - applied),
     so a reading seen twice, or a phone catching up with a typed total, can
     never add steps a second time (the old game's repairTypedSteps bug). */
  let LEDGER = null;
  function ledger() {
    if (!LEDGER) { LEDGER = lsGet(K.steps) || {}; if (!LEDGER.days) LEDGER.days = {}; }
    return LEDGER;
  }
  function saveLedger() {
    const L = ledger(); const keys = Object.keys(L.days).sort();
    while (keys.length > 14) delete L.days[keys.shift()];
    lsSet(K.steps, L);
  }
  function dayRec(d) { const L = ledger(); return L.days[d] || (L.days[d] = { phone: 0, typed: 0, ap: 0, at: 0 }); }
  // Merge a ledger from the cloud save: every field only ever goes up.
  function mergeLedger(other) {
    if (!other || !other.days) return;
    const L = ledger();
    if (other.since && (!L.since || other.since < L.since)) L.since = other.since;
    for (const d in other.days) {
      const a = dayRec(d), b = other.days[d] || {}, fx = fixFor(d);
      for (const f of ['phone', 'typed', 'ap', 'at']) { let v = +b[f] || 0; if (fx && (f === 'phone' || f === 'ap') && L.fixed && L.fixed[fx.id]) v = Math.min(v, fx.to); a[f] = Math.max(a[f] || 0, v); }
    }
    saveLedger();
  }
  function fixFor(d) { const h = String(NET.handle || '').toLowerCase(); return (NET.cfg.fixes || []).filter(f => f.h === h && f.d === d).sort((a, b) => b.before - a.before)[0] || null; }   // the latest correction for that day wins
  // Apply each correction once per device: lower the ledger and tell the game how many steps to take back.
  function applyFixes() {
    const L = ledger(); L.fixed = L.fixed || {};
    for (const fx of NET.cfg.fixes || []) {
      if (L.fixed[fx.id] || fx.h !== String(NET.handle || '').toLowerCase() || !L.days[fx.d]) continue;
      if (typeof NET.onFix !== 'function') return;
      const r = L.days[fx.d]; const back = Math.max(0, (r.ap || 0) - fx.to);
      r.phone = Math.min(r.phone || 0, fx.to); r.ap = Math.min(r.ap || 0, fx.to);
      try { if (back > 0) NET.onFix(fx.d, back, fx.id); } catch (e) { console.warn('NET.onFix threw', e); }
      L.fixed[fx.id] = 1;
    }
    saveLedger();
  }
  function target(r) {
    const eff = Math.max(r.phone, Math.min(r.typed, r.phone + NET.cfg.typedCap));
    return { eff, phoneBacked: Math.min(r.phone, eff) };
  }
  // Hand any not-yet-applied steps for day d to the game.
  function applyDay(d, srcName) {
    const r = dayRec(d); const { eff, phoneBacked } = target(r);
    const applied = r.ap + r.at; const delta = eff - applied;
    if (delta <= 0 || typeof NET.onSteps !== 'function') return 0;
    const ph = Math.max(0, Math.min(phoneBacked - r.ap, delta)); const ty = delta - ph;
    const info = { day: d, late: d !== dayStr(), today: eff };
    let given = 0;
    try {
      if (ph > 0 && NET.onSteps(ph, srcName || 'phone', info) !== false) { r.ap += ph; given += ph; }
      if (ty > 0 && NET.onSteps(ty, 'typed', info) !== false) { r.at += ty; given += ty; }
    } catch (e) { console.warn('NET.onSteps threw', e); }
    saveLedger();
    return given;
  }
  NET.applyPending = function () { const t = dayStr(), y = ydStr(); let g = 0; if (canBackfill(y)) g += applyDay(y); g += applyDay(t); if (g) changed(); return g; };
  function canBackfill(d) { const L = ledger(); return !!L.since && L.since <= d; }

  function phoneReading(v, d, src) {
    v = Math.max(0, Math.round(+v || 0)); if (!(v > 0) || v > 300000) return 0;
    const r = dayRec(d || dayStr()); if (v > r.phone) r.phone = v; saveLedger();
    // Until the cloud ledger has been folded in (first pull), only record it.
    return ledger().cloudFor === NET.handle ? applyDay(d || dayStr(), src) : 0;
  }

  // A post is the old game's own "Test my key" 1-step post (see isTestPost in game.js).
  function isTestPost(row, testAt) {
    if (row.steps !== 1 || !testAt) return false;
    const ms = new Date(row.posted_at).getTime();
    return !isNaN(ms) && Math.abs(ms - testAt) < 180000;
  }

  NET.pullSteps = async function () {
    if (!NET.ok) return null;
    const since = new Date(); since.setHours(0, 0, 0, 0); since.setDate(since.getDate() - 1);
    let rows;
    try { rows = await rpc('get_steps', { p_handle: NET.handle, p_token: NET.token, p_since: since.toISOString() }); }
    catch (e) { setErr(e); NET.status = 'offline'; changed(); return null; }
    if (!Array.isArray(rows)) rows = [];
    // First pull for this account on this device: fold in the ledger stored in
    // the cloud save first, or a second phone would hand over steps the save
    // already has.
    const L0 = ledger();
    if (L0.cloudFor !== NET.handle) {
      try {
        const c = await rpc('next_load', auth());
        if (c && c.ok) { if (c.state) mergeLedger(c.state.net); L0.cloudFor = NET.handle; saveLedger(); }
        else return null;
      } catch (e) { setErr(e); NET.status = 'offline'; changed(); return null; }
    }
    NET.status = 'online'; NET.err = ''; NET.lastPull = Date.now();
    const old = oldSave(); const testAt = old && old.online && old.online.testAt;
    const t0 = dayStr(), y0 = ydStr();
    // get_steps returns posted_at in UTC; bucket by THIS device's local date.
    applyFixes();
    const real = rows.filter(r => r && typeof r.steps === 'number' && r.steps > 0 && !isTestPost(r, testAt))
      .map(r => ({ n: r.steps, at: new Date(r.posted_at).getTime() })).filter(r => !isNaN(r.at))
      .filter(r => { const fx = fixFor(dayStr(new Date(r.at))); return !fx || r.at >= fx.before; });
    const bucket = d => real.filter(r => dayStr(new Date(r.at)) === d);
    const today = bucket(t0), yest = bucket(y0);
    // Every post is a running total for its day, so the day is the HIGHEST post, never the sum.
    const tMax = today.length ? Math.max(...today.map(r => r.n)) : 0;
    const yMax = yest.length ? Math.max(...yest.map(r => r.n)) : 0;
    NET.lastPost = today.length ? Math.max(...today.map(r => r.at)) : 0;
    if (tMax) dayRec(t0).phone = Math.max(dayRec(t0).phone, tMax);
    if (yMax) dayRec(y0).phone = Math.max(dayRec(y0).phone, yMax);
    saveLedger();
    if (canBackfill(y0)) applyDay(y0, 'phone');
    applyDay(t0, 'phone');
    const r = dayRec(t0);
    NET.steps = {
      today: target(r).eff, yesterday: target(dayRec(y0)).eff, phone: r.phone, typed: r.at,
      src: r.phone && r.at ? 'phone+typed' : r.phone ? 'phone' : r.at ? 'typed' : 'none',
      lastPost: NET.lastPost, posts: today.slice(0, 24).map(x => ({ t: x.at, n: x.n }))
    };
    changed();
    return { today: NET.steps.today, yesterday: NET.steps.yesterday, src: NET.steps.src, phone: r.phone, typed: r.at, lastPost: NET.lastPost };
  };

  // Typed steps. mode 'total' (default): "my total today is N" - the phone
  // catching up later only adds what is above N. mode 'add': N more than what
  // is counted right now (turned into a total at the moment of typing).
  NET.typeSteps = function (n, mode) {
    n = Math.max(0, Math.round(+n || 0)); if (!n || n > 300000) return 0;
    const d = dayStr(); const r = dayRec(d);
    const totalNow = target(r).eff;
    const claim = mode === 'add' ? totalNow + n : n;
    if (NET.handle && NET.cfg.trustedTyped.includes(String(NET.handle).toLowerCase())) {
      if (claim > r.phone) r.phone = claim;
      saveLedger();
      const g = applyDay(d, 'phone'); NET.steps.today = target(r).eff; NET.steps.phone = r.phone; changed();
      return g;
    }
    if (claim > r.typed) r.typed = claim;
    saveLedger();
    const g = applyDay(d); NET.steps.today = target(r).eff; NET.steps.typed = r.at; changed();
    return g;
  };
  NET.stepsDay = d => Object.assign({}, dayRec(d || dayStr()), target(dayRec(d || dayStr())));
  NET.typedShare = function (days) {
    const L = ledger(); const keys = Object.keys(L.days).sort().slice(-(days || 7));
    let a = 0, t = 0; for (const k of keys) { a += (L.days[k].ap || 0) + (L.days[k].at || 0); t += L.days[k].at || 0; }
    return a ? Math.round(t / a * 100) / 100 : 0;
  };
  NET.weekSteps = function () {
    const now = new Date(); const L = ledger(); let s = 0;
    for (let i = 0; i < 7; i++) { const d = new Date(now); d.setDate(now.getDate() - i); const r = L.days[dayStr(d)]; if (r) s += (r.ap || 0) + (r.at || 0); }
    return s;
  };

  /* ?steps=N from the iPhone Shortcut "Open URLs" route (optionally with
     &k=handle|key). Same parsing as the old game: one number or a list of samples. */
  function parseStepsParam(s) {
    if (s === null || s === undefined) return NaN; s = String(s).trim(); if (!s) return NaN;
    const parts = s.split(/[\n\r;|]+|,\s+/).map(x => x.trim()).filter(Boolean);
    const num = x => { const d = x.replace(/[^0-9]/g, ''); return d ? parseInt(d, 10) : NaN; };
    if (parts.length > 1) { let sum = 0, seen = 0; for (const x of parts) { const v = num(x); if (!isNaN(v)) { sum += v; seen++; } } return seen ? sum : NaN; }
    return num(parts[0]);
  }
  NET.parseStepsParam = parseStepsParam;
  function urlParam(n) {
    try { const q = new URLSearchParams(location.search); const h = new URLSearchParams(location.hash.replace(/^#/, '')); return q.get(n) !== null ? q.get(n) : h.get(n); } catch (e) { return null; }
  }
  async function handleUrlSteps() {
    const raw = urlParam('steps'); if (raw === null) return;
    const v = parseStepsParam(raw); const k = urlParam('k');
    try { const u = new URL(location.href); u.searchParams.delete('steps'); u.searchParams.delete('k'); u.hash = u.hash.replace(/(^#|&)(steps|k)=[^&]*/g, ''); history.replaceState(null, '', u.pathname + u.search + (u.hash.length > 1 ? u.hash : '')); } catch (e) { }
    if (!(v >= 0 && v < 300000)) return;
    NET.urlSteps = { v, at: Date.now(), posted: false };
    const keyHandle = k ? slug(String(k).split('|')[0]) : '';
    try {
      if (k) { const r = await rpc('post_steps_link', { p: k + '|' + v }); NET.urlSteps.posted = typeof r === 'string' && r.indexOf('ok') === 0; NET.urlSteps.reply = r; }
      else if (NET.ok) { NET.urlSteps.posted = (await rpc('post_steps', { p_handle: NET.handle, p_token: NET.token, p_steps: String(v) })) === true; }
    } catch (e) { setErr(e); }
    if (NET.ok && (!keyHandle || keyHandle === NET.handle)) phoneReading(v, dayStr(), 'shortcut');
    changed();
  }

  /* ---------------- saves (versioned, offline-first) ----------------
     Local copy: dm-next-save = { state, base, at, dirty }. base is the last
     server version this device saw; a push sends base+1 and the server refuses
     it if someone else already wrote base+1 or later. */
  let saveTimer = 0, saving = false;
  function localSave() { return lsGet(K.save); }
  NET.localState = function () { const s = localSave(); return s ? s.state : null; };
  NET.save = function (state, opts) {
    if (!state || typeof state !== 'object') return false;
    const prev = localSave() || { base: 0 };
    const rec = { state, base: prev.base || 0, at: Date.now(), dirty: true };
    if (!lsSet(K.save, rec)) console.warn('NET.save: local storage full or blocked');
    clearTimeout(saveTimer);
    if (opts && opts.now) return flushSave();
    saveTimer = setTimeout(flushSave, NET.cfg.saveDelay);
    return true;
  };
  function wrap(rec) { const L = ledger(); return { game: rec.state, net: { since: L.since, days: L.days }, at: rec.at }; }
  async function flushSave() {
    clearTimeout(saveTimer);
    const rec = localSave(); if (!rec || !rec.dirty || !NET.ok || saving) return { ok: !rec || !rec.dirty };
    if (NET.conflict) return { ok: false, error: 'conflict' };
    const body = wrap(rec);
    if (JSON.stringify(body).length > MAX_STATE) { NET.err = 'Save is over 256 KB, not uploaded.'; changed(); return { ok: false, error: 'too_big' }; }
    saving = true;
    try {
      const r = await rpc('next_save', { p_handle: NET.handle, p_token: NET.token, p_state: body, p_version: (rec.base || 0) + 1 });
      if (r && r.ok) {
        const cur = localSave() || rec;
        cur.base = r.version; if (cur.at === rec.at) cur.dirty = false; lsSet(K.save, cur);
        NET.lastSave = Date.now(); NET.status = 'online'; NET.err = ''; changed();
        if (cur.dirty) saveTimer = setTimeout(flushSave, 500);
        return { ok: true, version: r.version };
      }
      if (r && r.error === 'stale') return await resolveConflict(rec, r.version);
      if (r && r.error === 'auth') { NET.ok = false; NET.status = 'bad-key'; NET.err = 'Signed out: this device key is out of date.'; changed(); }
      return { ok: false, error: r && r.error };
    } catch (e) { setErr(e); NET.status = 'offline'; changed(); return { ok: false, error: 'offline' }; }
    finally { saving = false; }
  }
  NET.flush = flushSave;
  async function resolveConflict(rec, serverVersion) {
    let remote = null;
    try { const r = await rpc('next_load', auth()); if (r && r.ok && r.state) remote = { state: r.state.game, version: r.version, updated_at: r.updated_at, at: r.state.at || 0, net: r.state.net }; } catch (e) { }
    if (!remote) return { ok: false, error: 'stale' };
    mergeLedger(remote.net);
    const local = { state: rec.state, at: rec.at, base: rec.base };
    let pick;
    if (typeof NET.onConflict === 'function') { try { pick = await NET.onConflict({ local, remote }); } catch (e) { pick = null; } }
    else pick = (rec.at || 0) >= (remote.at || 0) ? 'local' : null;   // no handler: newest edit wins, otherwise hold
    if (pick === 'local') {
      const cur = localSave() || rec; cur.base = remote.version; lsSet(K.save, cur); NET.conflict = null;
      return await flushSave();
    }
    if (pick === 'remote') {
      lsSet(K.save, { state: remote.state, base: remote.version, at: remote.at || Date.now(), dirty: false });
      NET.conflict = null; changed();
      return { ok: true, adopted: 'remote', state: remote.state, version: remote.version };
    }
    NET.conflict = { local, remote, serverVersion }; changed();
    return { ok: false, error: 'conflict', remote };
  }
  NET.resolve = async function (pick) {   // panel / game calls this when NET.conflict is set
    const c = NET.conflict; if (!c) return null; NET.conflict = null;
    if (pick === 'remote') { lsSet(K.save, { state: c.remote.state, base: c.remote.version, at: c.remote.at || Date.now(), dirty: false }); changed(); return { adopted: 'remote', state: c.remote.state }; }
    const cur = localSave(); if (cur) { cur.base = c.remote.version; cur.dirty = true; lsSet(K.save, cur); }
    return flushSave();
  };

  // Cloud copy. Merges the step ledger (never lowers it). Returns
  // { ok, state, version, updated_at, at, local } - the game decides what to use.
  NET.load = async function () {
    const loc = localSave();
    if (!NET.ok) return { ok: false, error: 'signed-out', local: loc && loc.state };
    try {
      const r = await rpc('next_load', auth());
      if (!r || !r.ok) { if (r && r.error === 'auth') { NET.ok = false; NET.status = 'bad-key'; changed(); } return { ok: false, error: r && r.error, local: loc && loc.state }; }
      if (!r.state) return { ok: true, state: null, version: 0, local: loc && loc.state };
      mergeLedger(r.state.net);
      const cur = localSave();
      if (!cur) lsSet(K.save, { state: r.state.game, base: r.version, at: r.state.at || 0, dirty: false });
      else if (!cur.dirty || (cur.base || 0) >= r.version) { if (!cur.dirty) { cur.state = r.state.game; cur.at = r.state.at || cur.at; } cur.base = Math.max(cur.base || 0, r.version); lsSet(K.save, cur); }
      return { ok: true, state: r.state.game, version: r.version, updated_at: r.updated_at, at: r.state.at || 0, local: cur && cur.dirty ? cur.state : null };
    } catch (e) { setErr(e); NET.status = 'offline'; changed(); return { ok: false, error: 'offline', local: loc && loc.state }; }
  };

  /* ---------------- friends board ---------------- */
  let pubTimer = 0;
  NET.publish = function (pub, opts) {
    pub = Object.assign({}, pub || {});
    if (pub.steps_today === undefined) pub.steps_today = target(dayRec(dayStr())).eff;
    if (pub.steps_week === undefined) pub.steps_week = NET.weekSteps();
    if (pub.typed_share === undefined) pub.typed_share = NET.typedShare(7);
    if (JSON.stringify(pub).length > 4000) { if (pub.extra) delete pub.extra; }
    lsSet(K.pub, { pub, dirty: true });
    clearTimeout(pubTimer);
    if (opts && opts.now) return flushPublish();
    pubTimer = setTimeout(flushPublish, NET.cfg.publishDelay);
    return true;
  };
  async function flushPublish() {
    clearTimeout(pubTimer);
    const p = lsGet(K.pub); if (!p || !p.dirty || !NET.ok) return { ok: true };
    try {
      const r = await rpc('next_publish', { p_handle: NET.handle, p_token: NET.token, p_pub: p.pub });
      if (r && r.ok) { const cur = lsGet(K.pub); if (cur && JSON.stringify(cur.pub) === JSON.stringify(p.pub)) { cur.dirty = false; lsSet(K.pub, cur); } NET.lastPublish = Date.now(); }
      return r || { ok: false };
    } catch (e) { setErr(e); return { ok: false, error: 'offline' }; }
  }
  NET.flushPublish = flushPublish;
  NET.board = async function () {
    try {
      const rows = await rpc('next_get_board', {});
      NET.boardRows = Array.isArray(rows) ? rows : []; lsSet(K.board, { at: Date.now(), rows: NET.boardRows }); changed();
      return NET.boardRows;
    } catch (e) { setErr(e); const c = lsGet(K.board); NET.boardRows = (c && c.rows) || []; return NET.boardRows; }
  };

  /* ---------------- parties (party horde night) ---------------- */
  NET.partyJoin = async function (code) {
    if (!NET.ok) return { ok: false, error: 'Sign in first.' };
    const c = slug(code); if (c.length < 2) return { ok: false, error: 'Party codes are 2-20 letters or numbers.' };
    try {
      const r = await rpc('next_party_join', { p_handle: NET.handle, p_token: NET.token, p_code: c });
      if (r && r.ok) { NET.party = r; lsSet(K.party, r); changed(); return r; }
      return { ok: false, error: r && r.error === 'full' ? 'That party is full (6 max).' : (r && r.error) || 'failed' };
    } catch (e) { setErr(e); return { ok: false, error: 'Could not reach the server.' }; }
  };
  NET.partyLeave = async function (code) {
    if (!NET.ok) return { ok: false };
    const c = slug(code || (NET.party && NET.party.code)); if (!c) return { ok: true };
    try { const r = await rpc('next_party_leave', { p_handle: NET.handle, p_token: NET.token, p_code: c }); NET.party = null; try { localStorage.removeItem(K.party); } catch (e) { } changed(); return r; }
    catch (e) { setErr(e); return { ok: false, error: 'Could not reach the server.' }; }
  };
  // No code: the party I am in (or null).
  NET.partyGet = async function (code) {
    if (!NET.ok) return null;
    try {
      const r = await rpc('next_party_get', { p_handle: NET.handle, p_token: NET.token, p_code: code ? slug(code) : '' });
      const p = r && r.ok ? r.party : null;
      if (!code) { NET.party = p; if (p) lsSet(K.party, p); else try { localStorage.removeItem(K.party); } catch (e) { } changed(); }
      return p;
    } catch (e) { setErr(e); return code ? null : (NET.party = lsGet(K.party)); }
  };

  /* ---------------- timers / connectivity ---------------- */
  let pollT = 0;
  function startTimers() {
    if (NET._timers) return; NET._timers = true;
    pollT = setInterval(() => { if (document.visibilityState === 'visible' && NET.ok) { NET.pullSteps(); flushSave(); flushPublish(); } }, NET.cfg.pollMs);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && NET.ok && Date.now() - NET.lastPull > 60000) NET.pullSteps();
      if (document.visibilityState === 'hidden') { flushSave(); flushPublish(); }
    });
    window.addEventListener('online', () => { if (NET.ok) { flushSave(); flushPublish(); NET.pullSteps(); } });
  }
  NET.stop = function () { clearInterval(pollT); NET._timers = false; };
  NET._ledger = ledger; NET._mergeLedger = mergeLedger;   // for tests
})();
