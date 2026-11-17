/* Dead Miles (next) - push notifications that arrive with the app CLOSED (0.64). DM.Push
   - Turn on from the Radio sheet (life.js). Registers next/sw.js, subscribes with the same VAPID key as the
     old game, and saves the subscription with next_push_save (next/push.sql).
   - The "plan": nudges the game can time in advance (horde 24 h / 3 h, food for tonight, garden, been away
     two days). It is re-sent whenever it changes, from the home screen and when the app goes to the background.
   - push-send.js (GitHub Actions, every 15 min) sends plan items whose time has come, plus two live ones:
     a quiet evening (real phone steps under 2,000 at 6-9 PM) and a long-distance partner nudge.
   - iPhone: only works when the game is added to the Home Screen (iOS 16.4+). */
(function () {
  'use strict';
  const DM = window.DM = window.DM || {};
  const P = DM.Push = {};
  const VAPID = 'BDjXfxZW0UP34n25eFRp736S9ED4EInA8J-HP_0_VMz30hR06YzTEr2fyHLpmuabuU3ubSvUinRCIvM20Pmb4yw';
  const SV = () => DM.Game && DM.Game.data();
  const KEY = 'dm-next-push';   // { on, plan (last sent JSON), at }
  const mem = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
  const keep = o => { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { /* ignore */ } };
  const IS_IOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;

  P.supported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  // why it cannot work here, or '' if it can
  P.blocker = function () {
    if (IS_IOS && !standalone()) return 'On iPhone, notifications only work from the Home Screen app: tap Share, then "Add to Home Screen", and open Dead Miles from there.';
    if (!P.supported()) return 'This browser cannot get notifications while the game is closed.';
    if (Notification.permission === 'denied') return 'Notifications are blocked for this site in your phone settings.';
    return '';
  };
  P.on = () => !!mem().on && P.supported() && Notification.permission === 'granted';

  const sig = plan => JSON.stringify(plan.map(x => [x.tag, x.at, x.body]));   // same tags as life.js radio, so the phone replaces rather than doubles
  const b64ToU8 = s => { const p = '='.repeat((4 - s.length % 4) % 4), b = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(b, c => c.charCodeAt(0)); };
  let regP = null;
  function reg() {
    if (!regP) regP = navigator.serviceWorker.register('sw.js', { scope: './' }).then(() => navigator.serviceWorker.ready);
    return regP;
  }
  async function subscription(make) {
    const r = await reg();
    let s = await r.pushManager.getSubscription();
    if (!s && make) s = await r.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToU8(VAPID) });
    return s;
  }
  async function save(sub, plan) {
    const N = window.NET; if (!N || !N.handle || !N.token) throw new Error('signed-out');
    const j = sub.toJSON();
    const r = await N.rpc('next_push_save', { p_handle: N.handle, p_token: N.token, p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth, p_tz: -new Date().getTimezoneOffset(), p_plan: plan });
    if (!r || !r.ok) throw new Error((r && r.error) || 'save');
  }

  // -> { ok } or { ok:false, why }
  P.enable = async function () {
    const b = P.blocker(); if (b) return { ok: false, why: b };
    if (!window.NET || !NET.handle) return { ok: false, why: 'Sign in (Online) first - notifications go to your account.' };
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') return { ok: false, why: 'Notifications are blocked in your phone settings.' };
      const sub = await subscription(true), plan = P.plan();
      await save(sub, plan);
      keep({ on: 1, plan: sig(plan), at: Date.now() });
      return { ok: true };
    } catch (e) {
      return { ok: false, why: /signed-out/.test(e.message) ? 'Sign in (Online) first.' : 'Could not reach the server - try again in a minute.' };
    }
  };
  P.disable = async function () {
    keep({ on: 0 });
    try {
      const s = await subscription(false); if (!s) return;
      if (window.NET && NET.handle) await NET.rpc('next_push_drop', { p_handle: NET.handle, p_token: NET.token, p_endpoint: s.endpoint }).catch(() => { });
      await s.unsubscribe();
    } catch (e) { /* ignore */ }
  };

  // ---------------------------------------------------------------- the plan (times in ms, the sender's clock)
  const localAt = (dayAdd, h) => { const d = new Date(); d.setDate(d.getDate() + dayAdd); d.setHours(h, 0, 0, 0); return d.getTime(); };
  const ymd = t => { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  P.plan = function () {
    const v = SV(), now = Date.now(), out = [];
    if (!v || !v.survivor || !v.tutorialDone) return out;
    const add = (tag, at, title, body) => { if (at > now) out.push({ tag, at, title, body }); };
    // horde night (fixed: Sunday 9 PM New York)
    try {
      const H = DM.Horde, nx = H && H.next();
      if (nx) {
        let def = null; try { def = v.base && DM.Base && DM.Base.defense ? Math.round(DM.Base.defense()) : null; } catch (e) { /* no base yet */ }
        add('horde24' + nx.week, nx.at - 864e5, 'The horde is moving', 'Dot: "It hits Sunday 9 PM. Get your watch shift in and check your walls."');
        add('horde3' + nx.week, nx.at - 3 * 36e5, 'Less than 3 hours', `Dot: "I can hear them from the shop.${def != null ? ` Defence ${def} - hope that's enough.` : ''}"`);
      }
    } catch (e) { /* ignore */ }
    // food: the crew eats one each in the morning, from the stash
    try {
      const crew = (v.crew && v.crew.list) || [], stash = v.survivor.stash || [];
      const food = stash.filter(e => DM.D.ITEMS[e.k] && DM.D.ITEMS[e.k].use === 'Eat').reduce((a, e) => a + (e.n || 1), 0);
      if (crew.length && food < crew.length) add('food-' + ymd(now), localAt(0, 19), 'Not enough food for tonight',
        `${food ? `${food} meal${food > 1 ? 's' : ''}` : 'No food'} in the stash for ${crew.length} mouth${crew.length > 1 ? 's' : ''}. Find some on a walk before morning.`);
    } catch (e) { /* ignore */ }
    // garden: plants need water every day, three dry days and they die
    try {
      const b = v.base, B = DM.Base;
      if (b && b.built && b.built.beds && B && B.plantState) {
        let live = 0, dry = 0;
        b.beds.forEach((p, i) => { if (i >= b.built.beds || !p) return; const s = B.plantState(p); if (!s || s.dead || s.ready) return; live++; if (!s.today) dry++; });
        if (dry) add('garden-' + ymd(now), localAt(0, 17), 'The garden is thirsty', `${dry} plant${dry > 1 ? 's' : ''} not watered today. Three dry days and they die.`);
        if (live) add('garden-' + ymd(localAt(1, 12)), localAt(1, 12), 'Water the garden', `${live} plant${live > 1 ? 's' : ''} need water today.`);
      }
    } catch (e) { /* ignore */ }
    // been away: two days after the app was last open, at 6 PM
    add('away-' + ymd(localAt(2, 18)), localAt(2, 18), 'Dot hasn\'t seen you', 'Two days quiet. The houses on your street are filling back up with the dead. A short walk would sort it.');
    return out.sort((a, b) => a.at - b.at).slice(0, 8);
  };

  // re-send the plan when it changed (cheap: one RPC, only while notifications are on)
  let busy = false;
  P.sync = async function (force) {
    if (busy || !P.on()) return;
    const m = mem(), plan = P.plan(), js = sig(plan);
    if (!force && js === m.plan && Date.now() - (m.at || 0) < 6 * 36e5) return;
    busy = true;
    try { const s = await subscription(false); if (!s) { keep({ on: 0 }); return; } await save(s, plan); keep({ on: 1, plan: js, at: Date.now() }); }
    catch (e) { /* offline: next time */ } finally { busy = false; }
  };
  // a phone that was already subscribed re-registers the worker on boot, so a new sw.js is picked up
  if (P.supported() && mem().on) reg().catch(() => { });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') P.sync(); });
  setInterval(() => P.sync(), 5 * 60e3);
})();
