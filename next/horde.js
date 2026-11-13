/* Dead Miles (next) - party horde night: timing, the NET wrapper for next_party_shift, and the resolution maths.
   Horde night is every Sunday 21:00 America/New_York for everyone. A "watch shift" can be done in the 24 h before.
   Every shift's kills (and the base's defence at that moment) are reported to the party with next_party_shift.
   After the deadline each member resolves it on their own phone from the party record. The maths below is
   deterministic per (party, week), so every member computes the same horde and the same remainder.
   Plain script, global DM.Horde. Must work offline: nothing here throws when the network is blocked. */
'use strict';
window.DM = window.DM || {};
(() => {
  const H = DM.Horde = {};
  const DAY = 864e5, TZ = 'America/New_York';
  const pad = n => String(n).padStart(2, '0');
  H.SHIFT_MS = 150e3;        // a watch shift lasts 2.5 minutes
  H.WINDOW_MS = DAY;         // ... and can be done in the 24 h before the deadline
  H.MAX_SHIFTS = 3;          // per player per week (the server accepts up to 6)
  H.FIRST_WEEK = '2026-11-15';

  // ---------------------------------------------------------------- New York wall clock
  let fmt = null;
  try { fmt = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short' }); } catch (e) { fmt = null; }
  const WD = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  function ny(ms) {
    if (fmt) {
      try {
        const o = {}; for (const p of fmt.formatToParts(new Date(ms))) o[p.type] = p.value;
        return { y: +o.year, m: +o.month, d: +o.day, h: +o.hour % 24, mi: +o.minute, dow: WD[o.weekday] };
      } catch (e) { /* fall through */ }
    }
    const d = new Date(ms - 5 * 36e5); // no Intl time zones: plain EST
    return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), h: d.getUTCHours(), mi: d.getUTCMinutes(), dow: d.getUTCDay() };
  }
  function nyToUtc(y, m, d, h, mi) { // the UTC time at which New York shows y-m-d h:mi
    const want = Date.UTC(y, m - 1, d, h, mi);
    let t = want + 5 * 36e5;
    for (let i = 0; i < 3; i++) { const p = ny(t); const diff = Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi) - want; if (!diff) break; t -= diff; }
    return t;
  }
  const dstr = (y, m, d) => y + '-' + pad(m) + '-' + pad(d);
  // the next deadline strictly after `now`: { at (ms), week ('YYYY-MM-DD', the Sunday in New York) }
  H.next = function (now = H.now()) {
    const p = ny(now);
    for (let add = 0; add <= 14; add += 7) {
      const base = new Date(Date.UTC(p.y, p.m - 1, p.d + ((7 - p.dow) % 7) + add));
      const y = base.getUTCFullYear(), m = base.getUTCMonth() + 1, d = base.getUTCDate();
      const at = nyToUtc(y, m, d, 21, 0);
      if (at > now) return { at, week: dstr(y, m, d) };
    }
    return null;
  };
  H.prev = (now = H.now()) => H.next(now - 7 * DAY - 1); // the latest deadline at or before now
  H.now = () => Date.now() + (H.devOffset || 0);
  H.windowOpen = (now = H.now()) => { const n = H.next(now); return n && n.at - now <= H.WINDOW_MS ? n : null; };
  H.weekIndex = w => Math.max(0, Math.round((Date.UTC(...w.split('-').map((v, i) => i === 1 ? v - 1 : +v)) - Date.UTC(2026, 10, 15)) / (7 * DAY)));

  // ---------------------------------------------------------------- the horde maths (deterministic per party + week)
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  H.rand = (...k) => (hash(k.join('|')) % 100000) / 100000;
  // size grows gently with party size and slowly week by week; a party of two must not be crushed
  H.size = (n, week, solo) => Math.round((solo ? 34 : 50 + 22 * (Math.max(1, n) - 1)) * (1 + Math.min(.5, .02 * H.weekIndex(week))));
  H.KILL = 2; // each kill thins the horde by this much
  /* ctx: { code (party or ''), week, members: [handles], shifts: {handle: {k,d,n}}, me (handle or 'me'), defense (my base now) }
     returns { S, K, R, A, hold, shifted, n, perBase, members } */
  H.compute = function (ctx) {
    const solo = !ctx.code, members = solo ? [ctx.me] : ctx.members.slice(), n = Math.max(1, members.length);
    const S = H.size(n, ctx.week, solo);
    let K = 0; for (const h of members) K += Math.max(0, (ctx.shifts[h] && ctx.shifts[h].k) || 0);
    const R = Math.max(0, S - H.KILL * K);
    const A = Math.round(R / n * (.85 + .3 * H.rand(ctx.code || 'solo', ctx.week, ctx.me)));
    const mine = ctx.shifts[ctx.me];
    return { S, K, R, A, n, solo, members, hold: ctx.defense >= A, shifted: !!(mine && mine.n > 0), defense: ctx.defense };
  };

  // ---------------------------------------------------------------- talking to the party (NET); everything fails quietly
  const online = () => !!(window.NET && NET.ok && NET.handle && NET.token);
  H.partyCode = () => (window.NET && NET.party && NET.party.code) || '';
  async function call(code, week, kills, defense) {
    const r = await NET.rpc('next_party_shift', { p_handle: NET.handle, p_token: NET.token, p_code: code, p_week: week, p_kills: kills | 0, p_defense: defense | 0 });
    return r;
  }
  // H.shift(code, week, kills, defense) -> the party's horde state for that week, or {ok:false, error}
  H.shift = async function (code, week, kills, defense) {
    if (!online()) return { ok: false, error: 'offline' };
    try {
      const r = await call(code, week, kills, defense);
      if (r && r.ok && window.NET.party && NET.party.code === r.code) { NET.party.data = NET.party.data || {}; NET.party.data.horde = NET.party.data.horde || {}; NET.party.data.horde[week] = r.horde; NET.party.members = r.members; }
      return r || { ok: false, error: 'empty' };
    } catch (e) { return { ok: false, error: 'network' }; }
  };
  // queue in the save (st = SV.horde) so a shift done offline still reaches the party later
  H.flush = async function (st) {
    if (!st || !st.pending || !st.pending.length || !online()) return;
    for (const p of st.pending.slice()) {
      const r = await H.shift(p.code, p.week, p.k, p.d);
      if (r.ok || (r.error && !['offline', 'network', 'empty'].includes(r.error))) st.pending.splice(st.pending.indexOf(p), 1); // sent, or refused for good (left the party, too old)
      else break;
    }
  };
  H.partyNow = async function () { // fresh party record, or the cached one offline
    if (!window.NET) return null;
    try { return await NET.partyGet(); } catch (e) { return NET.party || null; }
  };
})();
