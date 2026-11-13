/* Dead Miles (next) - in-game STEP SYNC GUIDE. Style B. window.SYNC.open()
   Needs net.js (window.NET). Standalone: injects its own CSS and DOM.
   The technical details (Shortcut actions, post_steps_link + personal step key,
   the Open URLs ?k=&steps= route, the Android companion app with handle + token)
   are the old game's battle-tested ones (game.js: renderStepSync, rebuildPrompt,
   fixShortcut, stepOpenUrl, syncDoctor, renderOnline #shortcutHelp).
   The raw account token is only ever shown on the Android "Token" step, behind
   a Show tap. Everything iPhone uses the separate step key from get_step_key. */
(function () {
  'use strict';
  const NET = window.NET; if (!NET) { console.warn('syncguide.js: load net.js first'); return; }
  const C = { ink: '#11142f', plum: '#3d2d61', wall: '#2a1f4a', lil: '#5a4a86', ora: '#f07b3c', crm: '#f6e3bb', mute: '#9d90bf', ok: '#7fd49a', warn: '#f0c23c', bad: '#ff8a7a' };
  const SC_NAME = 'Dead Miles Steps';
  const APK = '../DeadMilesSteps.apk';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = n => (Math.round(+n || 0)).toLocaleString('en-US');
  const pad = n => String(n).padStart(2, '0');
  const dayStr = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const clock = t => new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  function ago(t) {
    const m = Math.max(0, Math.round((Date.now() - t) / 60000));
    if (m < 1) return 'just now';
    if (m < 60) return m + (m === 1 ? ' minute ago' : ' minutes ago');
    const h = Math.round(m / 60); if (h < 24) return h + (h === 1 ? ' hour ago' : ' hours ago');
    const d = Math.round(h / 24); return d + (d === 1 ? ' day ago' : ' days ago');
  }
  function when(t) {
    const d = new Date(t), now = new Date(), y = new Date(); y.setDate(now.getDate() - 1);
    const day = dayStr(d) === dayStr(now) ? 'today' : dayStr(d) === dayStr(y) ? 'yesterday' : d.toLocaleDateString([], { weekday: 'long' });
    return day + ' at ' + clock(t);
  }

  /* ---------------- addresses (same formats as the old game) ---------------- */
  const postUrl = () => NET.SB.url + '/rest/v1/rpc/post_steps_link?apikey=' + NET.SB.key;
  // Never fall back to the account token here (unlike NET.shortcutCode): the iPhone
  // only ever gets the step key.
  const code = () => NET.stepKey ? NET.handle + '|' + NET.stepKey + '|' : '';
  const gameDir = () => location.origin + location.pathname.replace(/[^/]*$/, '');
  const openUrl = () => NET.stepKey ? gameDir() + '?k=' + encodeURIComponent(NET.handle + '|' + NET.stepKey) + '&steps=' : '';
  function rebuildPrompt() {
    return 'Rebuild this shortcut from scratch. Keep its run times (the "At" times at the top) exactly as they are. '
      + 'Delete every existing action, then add exactly these actions, in this order:\n\n'
      + '1. Find Health Samples\n   Type: Steps\n   Filter: Start Date is today\n   Unit: count\n'
      + '   Group by: Day\n   Fill Missing: OFF\n   Limit: OFF\n'
      + '2. Calculate Statistics: Sum of the Health Samples from action 1\n'
      + '3. Set Variable: name it Today, set it to the Sum from action 2\n\n'
      + '4. Date: Current Date\n'
      + '5. Adjust Date: Get Start of Day of the Date from action 4\n'
      + '6. Set Variable: name it TodayStart, set it to the Adjusted Date from action 5\n'
      + '7. Adjust Date: Subtract 1 day from TodayStart\n'
      + '8. Set Variable: name it YesterdayStart, set it to the Adjusted Date from action 7\n\n'
      + '9. Find Health Samples\n   Type: Steps\n   Filter: Start Date is after YesterdayStart\n'
      + '   Filter: Start Date is before TodayStart\n   Unit: count\n'
      + '   Group by: Day\n   Fill Missing: OFF\n   Limit: OFF\n'
      + '10. Calculate Statistics: Sum of the Health Samples from action 9\n'
      + '11. Set Variable: name it Yesterday, set it to the Sum from action 10\n\n'
      + '12. Get Contents of URL\n   URL: ' + postUrl() + '\n'
      + '   Method: POST\n   Request Body: JSON\n   Two text fields:\n'
      + '     Key: p\n     Value: ' + code() + ' immediately followed by the variable Today,\n'
      + '            with no space between the | and Today\n'
      + '     Key: y\n     Value: the variable Yesterday, nothing else\n\n'
      + '\n'
      + 'Do not add any other actions. Do not add a Show Result or Show Notification action - it must run silently.\n'
      + 'Name the shortcut exactly: ' + SC_NAME;
  }

  // The owner's ask: "the automated rundown so I can paste it into my iPhone's Shortcuts AI -
  // do that option for all iPhone users." One prompt that builds the Shortcut AND its automations.
  function fullSetupPrompt() {
    return 'Do two things for me.\n\nPART 1 - Make a shortcut named exactly "' + SC_NAME + '". If a shortcut with that name already exists, '
      + 'delete all of its actions first. ' + rebuildPrompt().replace(/^Rebuild this shortcut from scratch\. Keep its run times \(the "At" times at the top\) exactly as they are\. Delete every existing action, then add/, 'Then add')
      + '\n\nPART 2 - Make it run by itself. Create four Personal Automations, each one:\n'
      + '   Trigger: Time of Day, Daily\n   Times: 12:00 PM, 4:00 PM, 8:00 PM and 11:00 PM (one automation for each)\n'
      + '   Action: Run Shortcut "' + SC_NAME + '"\n   Run Immediately: ON\n   Notify When Run: OFF'
      + '\n\nPART 3 - Also run it when my phone is unlocked (iPhone hides Health data while locked, so timed runs can miss). '
      + 'Create three more Personal Automations, each with Action: Run Shortcut "' + SC_NAME + '", Run Immediately ON, Notify When Run OFF:\n'
      + '   1. App - when "Messages" is opened\n   2. App - when "Safari" is opened\n   3. Charger - when iPhone connects to power';
  }
  // For people who already have the shortcut: only add the unlocked-phone triggers.
  function triggersPrompt() {
    return 'Edit my shortcut "' + SC_NAME + '". Do not change, add or remove any of its actions. Keep its existing Time of Day triggers exactly as they are.\n\n'
      + 'Only add these new automation triggers, each set to Run Immediately with Notify turned OFF:\n'
      + '1. App - when "Messages" is opened\n2. App - when "Instagram" is opened\n3. App - when "Safari" is opened\n4. Charger - when iPhone connects to power\n\n'
      + 'Do not add a notification. Do not ask before running.';
  }

  /* ---------------- CSS ---------------- */
  function css() {
    if (document.getElementById('sg-css')) return;
    if (!document.querySelector('link[href*="family=Inter"]')) {
      const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap'; document.head.appendChild(l);
    }
    const s = document.createElement('style'); s.id = 'sg-css';
    s.textContent = `
#sg{position:fixed;inset:0;z-index:8990;background:${C.ink};color:${C.crm};font-family:Inter,system-ui,-apple-system,sans-serif;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;-webkit-tap-highlight-color:transparent;-webkit-text-size-adjust:100%}
#sg *{box-sizing:border-box}
#sg .wrap{overflow-wrap:anywhere;max-width:560px;margin:0 auto;padding:0 16px calc(32px + env(safe-area-inset-bottom))}
#sg .top{position:sticky;top:0;z-index:3;display:flex;align-items:center;gap:10px;background:${C.ink};padding:calc(10px + env(safe-area-inset-top)) 0 10px;margin-bottom:6px;box-shadow:0 8px 12px -8px rgba(0,0,0,.5)}
#sg .top h2{flex:1;margin:0;font-size:21px;font-weight:800;line-height:1.15}
#sg .ib{width:46px;height:46px;flex:0 0 auto;border-radius:14px;border:0;background:${C.plum};color:${C.crm};font:800 24px Inter,system-ui,sans-serif;line-height:1}
#sg .card{background:${C.plum};border-radius:18px;padding:16px;margin:0 0 12px;box-shadow:inset 0 -3px 0 rgba(0,0,0,.18)}
#sg h3{margin:0 0 8px;font-size:13px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;color:${C.ora}}
#sg h4{margin:0 0 6px;font-size:18px;font-weight:800;line-height:1.3}
#sg p{margin:6px 0;font-size:16px;line-height:1.5}
#sg .help{color:${C.mute};font-size:14px;line-height:1.45}
#sg b{color:#fff3d6}
#sg .btn{display:flex;align-items:center;justify-content:center;width:100%;min-height:54px;border:0;border-radius:15px;background:${C.ora};color:#2a1308;font:800 17px Inter,system-ui,sans-serif;padding:0 16px;margin:8px 0 0;text-decoration:none;text-align:center;box-shadow:inset 0 -4px 0 rgba(0,0,0,.18)}
#sg .btn.g{background:${C.wall};color:${C.crm};box-shadow:inset 0 0 0 2px ${C.lil}}
#sg .btn:disabled{opacity:.55}
#sg .row{display:flex;gap:8px}
#sg .row>.btn{flex:1}
#sg .pick{display:flex;align-items:center;gap:14px;width:100%;min-height:76px;border:0;border-radius:18px;background:${C.plum};color:${C.crm};padding:12px 16px;margin:0 0 10px;text-align:left;font:inherit;box-shadow:inset 0 -3px 0 rgba(0,0,0,.18)}
#sg .pick .ic{width:48px;height:48px;border-radius:14px;background:${C.ora};color:#2a1308;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:800;flex:0 0 auto}
#sg .pick b{display:block;font-size:19px}
#sg .pick span.help{display:block;margin-top:2px}
#sg .pick:after{content:'\\203A';margin-left:auto;font-size:30px;color:${C.ora};font-weight:800}
#sg .step{display:flex;gap:12px;align-items:flex-start}
#sg .num{flex:0 0 auto;width:34px;height:34px;border-radius:50%;background:${C.ora};color:#2a1308;font-weight:800;font-size:17px;display:flex;align-items:center;justify-content:center;margin-top:1px}
#sg .step>div:not(.num){flex:1;min-width:0}
#sg .box{background:${C.ink};border:2px solid ${C.lil};border-radius:12px;padding:10px 12px;margin:10px 0 0;font:600 13px/1.45 ui-monospace,Menlo,Consolas,monospace;color:${C.crm};word-break:break-all;-webkit-user-select:all;user-select:all}
#sg .box.big{font-size:16px}
#sg .lbl{font-size:12px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:${C.mute};margin-top:12px}
#sg .ok{color:${C.ok}} #sg .warn{color:${C.warn}} #sg .bad{color:${C.bad}}
#sg .res{border-radius:14px;padding:12px 14px;margin-top:12px;background:${C.wall};border-left:5px solid ${C.lil}}
#sg .res.ok{border-left-color:${C.ok};color:${C.crm}} #sg .res.warn{border-left-color:${C.warn};color:${C.crm}} #sg .res.bad{border-left-color:${C.bad};color:${C.crm}}
#sg .res h4{font-size:17px}
#sg .note{border-radius:14px;padding:12px 14px;margin:0 0 12px;background:${C.wall};border-left:5px solid ${C.warn};font-size:15px;line-height:1.45}
#sg ul.chk{list-style:none;margin:8px 0 0;padding:0}
#sg ul.chk li{position:relative;padding:8px 0 8px 30px;border-top:1px solid rgba(246,227,187,.1);font-size:15px;line-height:1.45}
#sg ul.chk li:first-child{border-top:0}
#sg ul.chk li:before{content:'';position:absolute;left:2px;top:11px;width:16px;height:16px;border-radius:5px;border:2px solid ${C.ora}}
#sg .facts{display:grid;grid-template-columns:auto 1fr;gap:8px 12px;font-size:15px;line-height:1.35}
#sg .facts span{color:${C.mute}}
#sg .facts b{text-align:right}
#sg .ck{display:flex;gap:10px;padding:9px 0;border-top:1px solid rgba(246,227,187,.1)}
#sg .ck:first-child{border-top:0}
#sg .ck i{font-style:normal;font-weight:800;font-size:18px;width:20px;flex:0 0 auto}
#sg details{background:${C.wall};border-radius:14px;padding:0 14px;margin:10px 0 0}
#sg summary{min-height:52px;display:flex;align-items:center;font-weight:700;font-size:16px;cursor:pointer;list-style:none;gap:10px}
#sg summary::-webkit-details-marker{display:none}
#sg summary:after{content:'+';margin-left:auto;color:${C.ora};font-size:24px;font-weight:800}
#sg details[open] summary:after{content:'\\2212'}
#sg details>div{padding:0 0 14px}
#sg textarea{width:100%;min-height:150px;border-radius:12px;border:2px solid ${C.lil};background:${C.ink};color:${C.crm};font:600 12px/1.4 ui-monospace,Menlo,monospace;padding:10px;margin-top:8px}
#sg input{width:100%;min-height:54px;border-radius:14px;border:2px solid ${C.lil};background:${C.wall};color:${C.crm};font:700 20px Inter,system-ui,sans-serif;padding:0 14px;margin:10px 0 0;outline:none;text-align:center}
#sg input:focus{border-color:${C.ora}}
#sg input::placeholder{font-size:16px;font-weight:600;color:rgba(246,227,187,.45)}
#sg .msg{font-size:14px;font-weight:700;margin-top:8px}
#sg .tag{display:inline-block;padding:3px 9px;border-radius:99px;background:${C.wall};font-size:13px;font-weight:700;color:${C.crm}}
#sg .sep{height:1px;background:rgba(246,227,187,.12);margin:12px 0}
`;
    document.head.appendChild(s);
  }

  /* ---------------- state ---------------- */
  const UI = { screen: 'pick', hist: [], showTok: false, msg: {}, test: {}, check: null, rows: null, rowsAt: 0, keyErr: false, typed: null };
  const say = (id, t, kind) => { UI.msg[id] = { t, kind: kind || 'ok' }; render(); };
  const msg = id => { const m = UI.msg[id]; return m ? '<div class="msg ' + m.kind + '">' + esc(m.t) + '</div>' : ''; };

  // Every post from the last 7 days, newest first (get_steps is the same RPC net.js uses).
  // The old game's own "Test my key" 1-step posts are left out the same way net.js does.
  async function loadRows() {
    if (!NET.ok) return null;
    const since = new Date(); since.setHours(0, 0, 0, 0); since.setDate(since.getDate() - 6);
    let rows;
    try { rows = await NET.rpc('get_steps', { p_handle: NET.handle, p_token: NET.token, p_since: since.toISOString() }); }
    catch (e) { return null; }
    let testAt = 0; try { const v3 = JSON.parse(localStorage.getItem('deadmiles.v3') || 'null'); testAt = (v3 && v3.online && v3.online.testAt) || 0; } catch (e) { }
    UI.rows = (Array.isArray(rows) ? rows : [])
      .map(r => ({ n: +r.steps || 0, t: new Date(r.posted_at).getTime() }))
      .filter(r => r.n > 0 && !isNaN(r.t) && !(r.n === 1 && testAt && Math.abs(r.t - testAt) < 180000))
      .sort((a, b) => b.t - a.t);
    UI.rowsAt = Date.now();
    return UI.rows;
  }
  const todayRows = () => (UI.rows || []).filter(r => dayStr(new Date(r.t)) === dayStr(new Date()));

  async function ensureKey() {
    if (!NET.ok || NET.stepKey) return;
    UI.keyErr = false;
    const k = await NET.getStepKey();
    if (!k) UI.keyErr = true;
    render();
  }

  /* ---------------- pieces ---------------- */
  const btn = (a, label, cls, extra) => '<button class="btn ' + (cls || '') + '" data-a="' + a + '"' + (extra || '') + '>' + label + '</button>';
  function step(n, title, body) {
    return '<div class="card"><div class="step"><div class="num">' + n + '</div><div><h4>' + title + '</h4>' + (body || '') + '</div></div></div>';
  }
  // A value the player has to put somewhere: selectable box + Copy button.
  function copyBox(id, value, label, big) {
    return '<div class="box' + (big ? ' big' : '') + '" id="sg-v-' + id + '">' + esc(value) + '</div>'
      + btn('copy:' + id, 'Copy ' + label, 'g') + msg('copy:' + id);
  }
  const VALUES = {};   // id -> value, so the click handler copies the exact text
  function keyBox(id, label, getter) {
    if (UI.keyErr) return '<div class="res bad"><b>Could not get your code from the server.</b><p class="help">Check your signal, then try again.</p>' + btn('retryKey', 'Try again', 'g') + '</div>';
    const v = getter(); if (!v) return '<div class="box">Getting your personal code...</div>';
    VALUES[id] = v; return copyBox(id, v, label);
  }

  function signInGate() {
    if (NET.ok) return '';
    const bad = NET.status === 'bad-key';
    return '<div class="card" style="border:2px solid ' + C.ora + '"><div class="step"><div class="num">!</div><div><h4>First: sign in to the game</h4>'
      + '<p>' + (bad ? esc(NET.err || 'This phone holds an out-of-date key. Sign in again.') : 'Your steps need an account to land in. Sign in (or make an account) first, then come back here.') + '</p>'
      + '<p class="help">Use the same handle on every phone you play on.</p>'
      + btn('signin', 'Open sign in') + '</div></div></div>';
  }

  function whoLine() {
    return NET.ok ? '<p class="help" style="margin:2px 0 12px">Signed in as <b>@' + esc(NET.handle) + '</b>' + (NET.name && NET.name !== NET.handle ? ' (' + esc(NET.name) + ')' : '') + '</p>' : '';
  }

  /* ---------------- Test it ---------------- */
  async function runTest(kind) {
    UI.test[kind] = { busy: true }; render();
    if (!NET.ok) { UI.test[kind] = { state: 'signed-out' }; return render(); }
    const pulled = await NET.pullSteps();
    const rows = pulled ? await loadRows() : null;
    if (!pulled || !rows) { UI.test[kind] = { state: 'offline' }; return render(); }
    const tr = todayRows(); const newest = rows[0];
    const r = { at: Date.now(), newest, today: tr.length, best: tr.length ? Math.max(...tr.map(x => x.n)) : 0 };
    r.same = tr.length > 2 && tr.every(x => x.n === tr[0].n);
    if (!newest) r.state = 'never';
    else if (!tr.length) r.state = 'none-today';
    else if (Date.now() - newest.t < 20 * 60000) r.state = 'fresh';
    else r.state = 'old';
    UI.test[kind] = r; render();
  }
  function testBlock(kind) {
    const T = UI.test[kind];
    const runWord = kind === 'android' ? 'tapped <b>Send now</b> in the app' : 'run the Shortcut';
    let out = '<p>After you have ' + runWord + ' once, tap Test. It asks the server what your phone sent.</p>'
      + btn('test:' + kind, T && T.busy ? 'Checking...' : 'Test it', '', T && T.busy ? ' disabled' : '');
    if (!T || T.busy) return out;
    const fix = '<button class="btn g" data-go="fix">Steps not showing up? Help me fix it</button>';
    if (T.state === 'signed-out') return out + '<div class="res bad"><h4>You are not signed in.</h4><p class="help">Sign in first (top of this page), then test again.</p></div>';
    if (T.state === 'offline') return out + '<div class="res bad"><h4>Could not reach the server.</h4><p class="help">This is your connection, not your phone setup. Check your signal or Wi-Fi and tap Test again.</p></div>';
    const n = T.newest;
    if (T.state === 'fresh') {
      out += '<div class="res ok"><h4 class="ok">Got ' + fmt(n.n) + ' steps from your phone ' + ago(n.t) + '.</h4>'
        + '<p class="help">It works. Today so far: <b>' + fmt(T.best) + '</b> steps, ' + T.today + (T.today === 1 ? ' update' : ' updates') + ' today. They are in your game now.</p>'
        + (kind === 'iphone' ? '<p class="help">Last thing: make it run by itself (the Automation steps below), so you never have to tap it.</p>' : '<p class="help">The app keeps sending every hour on its own. You are done.</p>');
    } else if (T.state === 'old') {
      out += '<div class="res warn"><h4 class="warn">The last steps arrived ' + ago(n.t) + ' (' + fmt(n.n) + ' at ' + clock(n.t) + ').</h4>'
        + '<p class="help">So syncing has worked today, but if you ' + (kind === 'android' ? 'tapped Send now' : 'ran it') + ' just now, that run did not arrive. Wait a minute and test again. If it is still old, see the checklist.</p>';
    } else if (T.state === 'none-today') {
      out += '<div class="res bad"><h4 class="bad">Nothing arrived yet today.</h4>'
        + '<p class="help">The last steps came ' + when(n.t) + ' (' + fmt(n.n) + '). So your setup worked before, and something stopped it today. Here is what to check:</p>' + quickChecks(kind);
    } else {
      out += '<div class="res bad"><h4 class="bad">Nothing arrived yet.</h4>'
        + '<p class="help">The server has no steps from your phone this week. Here is what to check:</p>' + quickChecks(kind);
    }
    if (T.same) out += '<p class="help warn" style="margin-top:8px"><b class="warn">Every update today is the same number (' + fmt(T.best) + ').</b> ' + (kind === 'android' ? 'That is not a real step count. Check Health Connect is getting steps from your step app.' : 'Your Shortcut sends a fixed number, not your steps. The blue bubble at the end of the p field must be the <b>Sum</b> from Calculate Statistics.') + '</p>';
    return out + fix + '</div>';
  }
  function quickChecks(kind) {
    const L = kind === 'android' ? [
      'The app shows <b>@' + esc(NET.handle) + '</b> as the handle, spelled the same.',
      'You pasted the token from this page (tap Show on step 5) with no spaces.',
      'You tapped <b>Allow reading steps</b> and allowed it.',
      'Your step app (Samsung Health, Google Fit, Fitbit...) is sharing steps with Health Connect.',
      'You tapped <b>Save &amp; start hourly sync</b>, then <b>Send now</b>.',
      'Wait a minute, then tap Test again.'
    ] : [
      'You tapped play on the Shortcut (or it ran on its own), and nothing red popped up.',
      'The address starts with <b>' + esc(NET.SB.url.replace('https://', '')) + '</b>, not github.io.',
      'The <b>p</b> field is your code (step 6), then the blue <b>Sum</b> bubble, no space.',
      'You said <b>Allow</b> when it asked for Health and to connect.',
      '<b>Fill Missing</b> is OFF in Find Health Samples.',
      'Wait a minute, then tap Test again.'
    ];
    return '<ul class="chk">' + L.map(x => '<li>' + x + '</li>').join('') + '</ul>';
  }

  /* ---------------- screens ---------------- */
  function scrPick() {
    return '<div class="card"><h4 style="font-size:20px">Your phone counts your steps. This puts them in the game.</h4>'
      + '<p class="help">Set it up once and your steps arrive by themselves. Takes about 5 minutes.</p></div>'
      + (NET.ok ? '' : signInGate())
      + '<h3 style="margin:16px 4px 10px">Which phone do you have?</h3>'
      + '<button class="pick" data-go="iphone"><span class="ic">i</span><span><b>iPhone</b><span class="help">Uses the Shortcuts app</span></span></button>'
      + '<button class="pick" data-go="android"><span class="ic">A</span><span><b>Android</b><span class="help">Uses a small Dead Miles Steps app</span></span></button>'
      + '<button class="pick" data-go="typed"><span class="ic">#</span><span><b>I\'ll type my steps</b><span class="help">If syncing will not work on your phone</span></span></button>'
      + '<h3 style="margin:18px 4px 10px">Already set up?</h3>'
      + '<button class="pick" data-go="fix"><span class="ic">?</span><span><b>Steps not showing up?</b><span class="help">Checklist and live status</span></span></button>';
  }

  function scrIphone() {
    let h = whoLine() + signInGate();
    if (NET.ok && NET.stepKey) h += '<div class="note"><b>Fastest: let your iPhone build it.</b> Copy this, open the <b>Shortcuts</b> app, ask the <b>Shortcuts AI</b> (Apple Intelligence) to make a shortcut, and paste it in. Your personal code is already inside. Then run <b>' + SC_NAME + '</b> once, tap <b>Allow</b>, and check the <b>Automation</b> tab has four "' + SC_NAME + '" automations (if the AI could not make them, add them by hand: step 9 below).'
      + '<textarea readonly id="sg-v-aisetup">' + esc((VALUES.aisetup = fullSetupPrompt())) + '</textarea>' + btn('copy:aisetup', 'Copy setup for Shortcuts AI', 'g') + msg('copy:aisetup')
      + '<p class="help">No Shortcuts AI on your phone? Follow the steps below instead.</p></div>';
    h += '<div class="note"><b>Getting a pop-up every time it runs?</b> Open <b>' + SC_NAME + '</b> in Shortcuts, scroll to the last step <b>Show Contents of URL</b> and tap its <b>&#x24E7;</b> to delete it. The sync keeps working, silently.</div>';
    h += '<div class="note"><b>Steps only update when you run it yourself?</b> iPhone hides Health data while the phone is locked, so a timed run at 4 PM in your pocket sends nothing. Fix: also run it whenever you open an app you use a lot (unlocked, silent). Copy this into the <b>Shortcuts AI</b> while editing <b>' + SC_NAME + '</b> (swap in your favourite apps):'
      + '<textarea readonly id="sg-v-trig">' + esc((VALUES.trig = triggersPrompt())) + '</textarea>' + btn('copy:trig', 'Copy "add unlocked triggers" prompt', 'g') + msg('copy:trig')
      + '<p class="help">By hand: open the shortcut &rarr; <b>+ Add Trigger</b> (or Automation tab &rarr; <b>+</b>) &rarr; <b>App</b> &rarr; pick the app &rarr; <b>Is Opened</b> &rarr; <b>Run Immediately</b>.</p></div>';
    h += '<div class="note"><b>Already had the Dead Miles Steps Shortcut from the old game?</b> Nothing to change. It keeps working here. Skip to <b>Test it</b> (step 8).</div>';
    h += step(1, 'Open the Shortcuts app', '<p>It is already on your iPhone (a blue and pink icon). Can\'t find it? Swipe down on the home screen and search <b>Shortcuts</b>. Deleted it? Get it free from the App Store.</p>');
    h += step(2, 'Make a new Shortcut', '<p>Tap <b>+</b> at the top right. Tap the name at the top and call it <b>' + SC_NAME + '</b>.</p>');
    h += step(3, 'Add "Find Health Samples"', '<p>Tap <b>Search Actions</b>, type <b>Find Health Samples</b> and tap it.</p>'
      + '<p>Set it to read <b>Type is Steps</b>. Tap <b>Add Filter</b> and make it <b>Start Date is Today</b>.</p>'
      + '<p>Tap the little arrow on the action to see more. Make sure <b class="warn">Fill Missing is OFF</b> and <b>Limit</b> is off.</p>'
      + '<p class="help">Fill Missing ON is the number one reason this times out.</p>');
    h += step(4, 'Add "Calculate Statistics"', '<p>Search <b>Calculate Statistics</b> and tap it. Set it to <b>Sum</b> of <b>Health Samples</b>.</p>');
    h += step(5, 'Add "Get Contents of URL"', '<p>Search <b>Get Contents of URL</b> and tap it. Tap the blue <b>URL</b> word, then paste this address:</p>'
      + (NET.ok ? copyBox('url', (VALUES.url = postUrl()), 'the address') : '<p class="help">Sign in first to see it.</p>')
      + '<p class="help">It must start with ' + esc(NET.SB.url.replace('https://', '')) + '. A github.io address will not work here.</p>');
    h += step(6, 'Put in your personal code', '<p>On the same action tap the arrow (<b>Show More</b>).</p>'
      + '<p>Set <b>Method</b> to <b>POST</b>. Set <b>Request Body</b> to <b>JSON</b>.</p>'
      + '<p>Tap <b>Add new field</b> &rarr; <b>Text</b>. For Key type <b>p</b> (small letter).</p>'
      + '<p>Tap its value box and paste your code:</p>'
      + (NET.ok ? keyBox('code', 'my code', code) : '<p class="help">Sign in first to see it.</p>')
      + '<p>Right after the last <b>|</b>, tap the blue <b>Sum</b> bubble above the keyboard. No space before it.</p>'
      + '<p class="help">The code is yours only. It can send steps to your account, nothing else.</p>');
    h += step(7, 'Run it once', '<p>Tap <b>Done</b>, then tap the Shortcut once to run it.</p>'
      + '<p>The first time, iPhone asks to read Health and to connect. Tap <b>Allow</b> (turn on <b>Steps</b>) and <b>Always Allow</b>.</p>'
      + '<p class="help">Nothing opens. That is normal: it sends your steps quietly.</p>');
    h += '<div class="card"><h3>Wear an Oura ring (or another watch)?</h3><p>Let it count your steps too:</p>'
      + '<p><b>1.</b> Oura app &rarr; your profile &rarr; <b>Data sharing</b> &rarr; <b>Apple Health</b> &rarr; turn on and allow <b>Steps</b>.</p>'
      + '<p><b>2.</b> Health app &rarr; <b>Browse</b> &rarr; <b>Activity</b> &rarr; <b>Steps</b> &rarr; <b>Data Sources &amp; Access</b> &rarr; make sure <b>Oura</b> is on, tap <b>Edit</b> and drag Oura to the <b>top</b>.</p>'
      + '<p class="help">Health then counts the ring&rsquo;s steps when your phone is not on you, without counting anything twice. Your Shortcut already reads the Health total, so nothing else changes.</p></div>';
    h += step(8, 'Test it', testBlock('iphone'));
    h += '<h3 style="margin:18px 4px 10px">Make it run by itself</h3>';
    h += step(9, 'Open the Automation tab', '<p>In Shortcuts, tap <b>Automation</b> at the bottom, then <b>+</b> (or <b>New Automation</b>). Pick <b>Time of Day</b>.</p>');
    h += step(10, 'Pick a time', '<p>Choose a time, for example <b>12:00 PM</b>, and <b>Daily</b>.</p>'
      + '<p>Choose <b>Run Immediately</b> (not "after confirmation"). Turn <b>Notify When Run</b> OFF.</p>'
      + '<p>Tap <b>Next</b> and pick <b>' + SC_NAME + '</b>.</p>');
    h += step(11, 'Add a few more times', '<p>Repeat for a few times a day: <b>noon, 4 PM, 8 PM and 11 PM</b> works well.</p>'
      + '<p class="help">Don\'t make one every hour. If something is wrong it then fails every hour.</p>');
    h += '<details><summary>Simpler way: "Open URLs" (opens the game)</summary><div>'
      + '<p>Use this instead of steps 5 and 6 if the POST settings are confusing.</p>'
      + '<p>Add the action <b>Open URLs</b> (not Get Contents of URL) and paste this address. Right after the <b>=</b> at the end, tap the blue <b>Sum</b> bubble.</p>'
      + (NET.ok ? keyBox('open', 'the game address', openUrl) : '<p class="help">Sign in first to see it.</p>')
      + '<p class="help"><b class="warn">It opens the game every time it runs</b>, and it cannot run while your phone is locked, so automations with it fail with "took too long to run". Use it only when you tap it by hand.</p>'
      + '</div></details>';
    return h;
  }

  function scrAndroid() {
    let h = whoLine() + signInGate();
    h += '<div class="note"><b>Already have the Dead Miles Steps app?</b> Get the <b>new version</b> anyway (step 1) - the old one only synced while it was open. Install it over the old one; your handle and token stay.</div>';
    h += step(1, 'Download the app', '<p>Tap the button.</p>'
      + '<a class="btn" href="' + APK + '" download="DeadMilesSteps.apk">Download Dead Miles Steps</a>'
      + '<p>If <b>Chrome</b> says the file might be harmful: tap <b>Download anyway</b>. (Or open Chrome&rsquo;s <b>Downloads</b>, tap the file, choose <b>Keep</b>.)</p>'
      + '<p class="help">A tiny app made for this game. It only reads your step count and sends it here. Android is suspicious of it only because it is not from the Play Store.</p>');
    h += step(2, 'Install it (and get past the blockers)', '<p>Open the download (from the notification, or <b>Files &rarr; Downloads</b>) and tap <b>Install</b>.</p>'
      + '<p><b>"Installs from this source are blocked"</b>: tap <b>Settings</b>, turn on <b>Allow from this source</b>, go back, tap <b>Install</b>.</p>'
      + '<p><b>Samsung phone and it STILL blocks it after you allow it?</b> That is Samsung <b>Auto Blocker</b>. Open <b>Settings &rarr; Security and privacy &rarr; Auto Blocker</b> and turn it <b>off</b>. Install the app, then you can turn Auto Blocker back on - the app keeps working.</p>'
      + '<p><b>"Blocked by Play Protect"</b>: tap <b>More details &rarr; Install anyway</b>. No such button? Open the <b>Play Store</b> &rarr; your profile picture &rarr; <b>Play Protect</b> &rarr; the gear &rarr; turn off <b>Scan apps with Play Protect</b>, install, then turn it back on.</p>');
    h += step(3, 'Check your steps reach Health Connect', '<p>The app reads steps from <b>Health Connect</b>. Your step counter (Samsung Health, Google Fit, Fitbit...) has to share steps into it.</p>'
      + '<p class="help">Samsung Health: <b>Settings &rarr; Health Connect</b> &rarr; allow <b>Steps</b>. Google Fit and others: look for <b>Health Connect</b> in their settings. Older phones: the Dead Miles app sends you to the Play Store to install Health Connect.</p>');
    h += step(4, 'Box 1: your handle', '<p>Open <b>Dead Miles Steps</b>. Paste this in box <b>1. Handle</b>:</p>'
      + (NET.ok ? copyBox('handle', (VALUES.handle = NET.handle), 'my handle', true) : '<p class="help">Sign in first to see it.</p>'));
    let tok = '<p>Paste your token in box <b>2. Token</b>.</p>';
    if (NET.ok) {
      tok += (NET.rotated ? '<p class="warn"><b class="warn">You signed in with your PIN, so you have a NEW token.</b> If the app was set up before, paste this new one in.</p>' : '')
        + (UI.showTok
          ? copyBox('token', (VALUES.token = NET.token), 'my token') + btn('hideTok', 'Hide token', 'g')
          : '<div class="box">&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;</div>' + btn('showTok', 'Show my token', 'g'))
        + '<p class="help">This token is your account password. Only put it in the Dead Miles Steps app. Never send it to anyone.</p>';
    } else tok += '<p class="help">Sign in first to see it.</p>';
    h += step(5, 'Box 2: your token', tok);
    h += step(6, 'Allow reading steps - including in the background', '<p>Tap <b>Allow reading steps</b>. On the Health Connect screen turn on <b>Steps</b> AND <b>Access data in the background</b> (newer phones show it as a second switch).</p>'
      + '<p class="warn"><b class="warn">This is the one that matters.</b> Without background access your phone only lets the app read steps while it is open - that is why steps used to sync only when you opened it.</p>'
      + '<p class="help">Missed it? Settings &rarr; <b>Health Connect</b> (or Security and privacy &rarr; Privacy &rarr; Health Connect) &rarr; App permissions &rarr; <b>Dead Miles Steps</b> &rarr; turn on <b>Access data in the background</b>.</p>');
    h += step(7, 'Don\'t let it fall asleep', '<p>Tap <b>Don&rsquo;t put it to sleep</b> in the app and choose <b>Allow</b>.</p>'
      + '<p class="help">Or: Settings &rarr; Apps &rarr; <b>Dead Miles Steps</b> &rarr; Battery &rarr; <b>Unrestricted</b>. Samsung: also check it is not in <b>Sleeping apps</b> / <b>Deep sleeping apps</b> (Settings &rarr; Battery &rarr; Background usage limits).</p>');
    h += step(8, 'Save and send', '<p>Tap <b>Save &amp; start hourly sync</b>, then <b>Send now</b>.</p>'
      + '<p class="help">From now on it sends your steps about every hour by itself. You never have to open it again. If the app shows a warning in its status line, it tells you exactly which switch is still off.</p>');
    h += '<div class="card"><h3>Wear an Oura ring (or another watch)?</h3><p>Let it count your steps too:</p>'
      + '<p><b>1.</b> Oura app &rarr; your profile &rarr; <b>Data sharing</b> &rarr; <b>Health Connect</b> &rarr; turn on and allow <b>Steps</b>.</p>'
      + '<p><b>2.</b> Settings &rarr; <b>Health Connect</b> &rarr; <b>Data and access</b> &rarr; <b>Steps</b> &rarr; <b>App priority</b> &rarr; move <b>Oura</b> to the top.</p>'
      + '<p class="help">The Dead Miles Steps app reads the Health Connect total, so the ring&rsquo;s steps come through without counting anything twice.</p></div>';
    h += step(9, 'Test it', testBlock('android'));
    return h;
  }

  function scrTyped() {
    const trusted = NET.ok && (NET.cfg.trustedTyped || []).includes(String(NET.handle).toLowerCase());
    const d = NET.ok ? NET.stepsDay() : null;
    let h = whoLine() + signInGate();
    h += '<div class="card"><h3>How typed steps work</h3>'
      + '<p>Open your phone\'s Health app, look at <b>today\'s total</b>, and type that number here. Not just the last walk - the whole day so far.</p>'
      + '<p>You can type again later with a bigger total. Only the new part is added, so nothing counts twice.</p>'
      + (trusted
        ? '<p class="ok"><b class="ok">Your account has an exception:</b> your typed steps count fully, like phone steps.</p>'
        : '<p class="help">Typed steps count <b>half</b> in the game, and at most <b>' + fmt(NET.cfg.typedCap) + '</b> above what your phone sent that day. Phone steps always count fully, so syncing is worth it if you can.</p>')
      + '</div>';
    if (NET.ok) {
      h += '<div class="card"><h3>Type today\'s total</h3>'
        + (d ? '<p class="help">Counted today: <b>' + fmt(d.eff) + '</b> (phone ' + fmt(d.phone) + ', typed ' + fmt(d.typed) + ')</p>' : '')
        + '<input id="sg-typed" inputmode="numeric" pattern="[0-9]*" placeholder="my total today" autocomplete="off">'
        + btn('typed', 'That\'s my total') + msg('typed')
        + '<p class="help" style="margin-top:10px">You can also type it any time in the <b>Online</b> panel, under <b>Steps today</b> &rarr; "Phone missed a walk?".</p></div>';
    }
    return h;
  }

  function scrFix() {
    let h = signInGate();
    // Live facts
    const tr = todayRows(); const newest = UI.rows && UI.rows[0];
    const d = NET.ok ? NET.stepsDay() : null;
    h += '<div class="card"><h3>Right now</h3><div class="facts">'
      + '<span>Signed in</span><b>' + (NET.ok ? '<span class="ok">@' + esc(NET.handle) + '</span>' : '<span class="bad">No</span>') + '</b>';
    if (NET.ok) {
      h += '<span>Last steps received</span><b>' + (UI.rows === null ? 'checking...' : newest ? fmt(newest.n) + '<br><span class="help">' + esc(when(newest.t)) + '<br>' + ago(newest.t) + '</span>' : '<span class="bad">none this week</span>') + '</b>'
        + '<span>Updates today</span><b>' + (UI.rows === null ? '...' : tr.length) + '</b>'
        + '<span>In the game today</span><b>' + fmt(d.eff) + '</b>'
        + '<span>Where from</span><b>' + (d.ap || d.at ? 'phone ' + fmt(d.ap) + ' &middot; typed ' + fmt(d.at) : 'nothing yet') + '</b>';
    }
    h += '</div>' + (NET.ok ? btn('refresh', UI.busy ? 'Checking...' : 'Refresh', 'g', UI.busy ? ' disabled' : '') : '') + '</div>';
    if (NET.ok) {
      h += '<div class="card"><h3>Full check</h3><p class="help">Tests each link from your phone to the game and says which one is broken.</p>'
        + btn('check', UI.check && UI.check.busy ? 'Checking...' : 'Run the check', '', UI.check && UI.check.busy ? ' disabled' : '');
      if (UI.check && !UI.check.busy) {
        h += '<div style="margin-top:12px">' + UI.check.rows.map(r => '<div class="ck"><i class="' + (r.ok ? 'ok' : 'bad') + '">' + (r.ok ? '&#10003;' : '&#10007;') + '</i><div><b>' + esc(r.label) + '</b><div class="help">' + esc(r.detail) + '</div></div></div>').join('') + '</div>'
          + '<div class="res ' + (UI.check.good ? 'ok' : 'warn') + '"><h4>What to do</h4><p class="help" style="color:' + C.crm + '">' + esc(UI.check.verdict) + '</p></div>';
      }
      h += '</div>';
    }
    h += '<div class="card"><h3>Checklist</h3><ul class="chk">'
      + '<li><b>Right account.</b> The game says @' + esc(NET.handle || 'your-handle') + '. Your Shortcut code (or the Android app\'s handle) must start with the same name.</li>'
      + '<li><b>Shortcut points at the right key.</b> The <b>p</b> field must be exactly your code from the iPhone guide, then the blue <b>Sum</b> bubble. Copy it again and paste over the old one. The address must start with ' + esc(NET.SB.url.replace('https://', '')) + ', not github.io.</li>'
      + '<li><b>Health permission.</b> iPhone: Settings &rarr; Health &rarr; Data Access &amp; Devices &rarr; Shortcuts &rarr; turn on Steps. Android: Health Connect &rarr; App permissions &rarr; Dead Miles Steps &rarr; Steps on. An iPhone update can turn this off.</li>'
      + '<li><b>The automation actually ran.</b> Shortcuts &rarr; Automation: is it on, with Run Immediately? A "took too long to run" message means turn <b>Fill Missing</b> OFF in Find Health Samples.</li>'
      + '<li><b>Low Power Mode</b> (yellow battery) can hold automations back. Turn it off, or tap the Shortcut by hand. Android: set the app\'s battery to Unrestricted.</li>'
      + '<li><b>Today\'s steps.</b> Find Health Samples must say <b>Start Date is Today</b>, and your phone\'s date and time must be set automatically.</li>'
      + '<li><b>Wait a few minutes, then Refresh.</b> The game checks every 5 minutes and every time you open it.</li>'
      + '</ul></div>';
    h += '<div class="card"><h3>Still nothing? (iPhone)</h3>'
      + '<p>A Shortcut can look right and still be broken by something you can\'t see. Rebuilding it fixes that.</p>'
      + '<p class="help">Open the Shortcut, ask the <b>Shortcuts AI</b> (Apple Intelligence) to edit it, and paste this in. Your address and code are already in it.</p>'
      + (NET.ok ? (NET.stepKey ? '<textarea readonly id="sg-v-rebuild">' + esc((VALUES.rebuild = rebuildPrompt())) + '</textarea>' + btn('copy:rebuild', 'Copy the rebuild prompt', 'g') + msg('copy:rebuild') : keyBox('x', '', () => '')) : '<p class="help">Sign in first.</p>')
      + '<p class="help" style="margin-top:8px">Run it once, then tap <b>Test it</b> here to see your steps arrive (the Shortcut itself stays silent). No Apple Intelligence? Follow the iPhone guide again from step 2 in a new Shortcut.</p>'
      + '<button class="btn g" data-go="iphone">iPhone guide</button><button class="btn g" data-go="android">Android guide</button><button class="btn g" data-go="typed">Type my steps instead</button></div>';
    return h;
  }

  async function fullCheck() {
    UI.check = { busy: true }; render();
    const rows = []; let verdict = '';
    const row = (ok, label, detail) => rows.push({ ok, label, detail });
    if (!NET.ok) { row(false, 'Signed in', 'No. Steps cannot arrive while signed out.'); verdict = 'Sign in first (button at the top), then run this again.'; }
    else row(true, 'Signed in', 'as @' + NET.handle);
    let reach = false;
    if (NET.ok) {
      // The endpoint the Shortcut posts to. A deliberately invalid key: refused in
      // the same code path, writes nothing (the old game's syncDoctor probe).
      try {
        const t0 = Date.now(); await NET.rpc('post_steps_link', { p: NET.handle + '|latency-probe-not-a-key|0' }); const ms = Date.now() - t0; reach = true;
        if (ms < 1500) row(true, 'The step server', 'answers in ' + ms + ' ms');
        else { row(false, 'The step server', 'took ' + ms + ' ms. A scheduled Shortcut only gets a few seconds.'); verdict = verdict || 'The server is slow right now. Try again later; your setup may be fine.'; }
      } catch (e) { row(false, 'The step server', 'could not be reached'); verdict = verdict || 'This phone cannot reach the server. Check your signal or Wi-Fi, then run this again.'; }
    }
    if (NET.ok && reach) {
      await NET.getStepKey();
      if (NET.stepKey) row(true, 'Your personal code', 'ready (' + NET.handle + '|...)');
      else { row(false, 'Your personal code', 'missing'); verdict = verdict || 'The server did not give a code. Sign out and back in, then try again.'; }
      const pulled = await NET.pullSteps(); const all = pulled ? await loadRows() : null;
      if (!all) { row(false, 'Steps on the server', 'could not read them'); verdict = verdict || 'Could not read your steps. Try again in a minute.'; }
      else {
        const tr = todayRows();
        if (!tr.length) {
          row(false, 'Steps on the server today', all.length ? 'NOTHING today. Last: ' + fmt(all[0].n) + ' ' + when(all[0].t) : 'NOTHING this week');
          verdict = verdict || (all.length
            ? 'Your setup worked before, but nothing came today. Your phone did not run it (automation off, Low Power Mode, Health permission) - run it by hand once and test again.'
            : 'The server has never received steps from your phone this week. The phone side is not set up yet, or sends the wrong code. Follow the iPhone or Android guide and use Test it.');
        } else {
          const best = Math.max(...tr.map(x => x.n));
          row(true, 'Steps on the server today', tr.length + (tr.length === 1 ? ' update' : ' updates') + ', highest ' + fmt(best) + ', newest ' + ago(tr[0].t));
          if (tr.length > 2 && tr.every(x => x.n === tr[0].n)) {
            row(false, 'The number itself', 'every update says ' + fmt(best) + ' - a fixed value, not a step count');
            verdict = verdict || 'Your Shortcut runs, but sends the same number every time. The blue bubble at the end of the p field must be the Sum from Calculate Statistics.';
          }
          const eff = NET.stepsDay().eff;
          if (eff >= best) row(true, 'The game took it', 'counted ' + fmt(eff) + ' today');
          else { row(false, 'The game took it', 'the game has ' + fmt(eff) + ' of ' + fmt(best)); verdict = verdict || 'The server has your steps; the game will take them as soon as it is running. Close this and go back to the game.'; }
        }
      }
    }
    const good = !verdict;
    UI.check = { rows, verdict: verdict || 'Everything looks right. If you just walked, your phone sends the new total on its next run.', good };
    render();
  }

  /* ---------------- render / actions ---------------- */
  const TITLES = { pick: 'Step sync guide', iphone: 'iPhone setup', android: 'Android setup', typed: 'Type my steps', fix: 'Steps not showing up?' };
  function render() {
    const root = document.getElementById('sg'); if (!root) return;
    const keep = {}; root.querySelectorAll('input[id]').forEach(i => { keep[i.id] = i.value; });
    const openD = Array.from(root.querySelectorAll('details')).map(x => x.open);
    const y = root.scrollTop;
    const body = { pick: scrPick, iphone: scrIphone, android: scrAndroid, typed: scrTyped, fix: scrFix }[UI.screen]();
    root.innerHTML = '<div class="wrap"><div class="top">'
      + (UI.screen === 'pick' ? '' : '<button class="ib" data-a="back" aria-label="Back">&#8249;</button>')
      + '<h2>' + TITLES[UI.screen] + '</h2><button class="ib" data-a="close" aria-label="Close">&times;</button></div>'
      + body + '</div>';
    for (const k in keep) { const i = document.getElementById(k); if (i && keep[k]) i.value = keep[k]; }
    root.querySelectorAll('details').forEach((x, i) => { if (openD[i]) x.open = true; });
    root.scrollTop = y;
  }
  function go(s) {
    UI.hist.push(UI.screen); UI.screen = s; UI.msg = {}; UI.showTok = false;
    const root = document.getElementById('sg'); render(); if (root) root.scrollTop = 0;
    if (NET.ok && (s === 'iphone' || s === 'fix')) ensureKey();
    if (NET.ok && s === 'fix') refresh();
  }
  async function refresh() { UI.busy = true; render(); await NET.pullSteps(); await loadRows(); UI.busy = false; render(); }

  function copy(id) {
    const v = VALUES[id]; if (!v) return;
    const fallback = () => {
      // Select the box so a long-press "Copy" is one tap away.
      try {
        const el = document.getElementById('sg-v-' + id);
        if (el && el.select) el.select();
        else if (el) { const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
        if (document.execCommand && document.execCommand('copy')) return say('copy:' + id, 'Copied.');
      } catch (e) { }
      say('copy:' + id, 'Could not copy here. Long-press the box above and tap Copy.', 'warn');
    };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(v).then(() => say('copy:' + id, 'Copied. Now paste it in.'), fallback);
      else fallback();
    } catch (e) { fallback(); }
  }

  function act(a) {
    if (a === 'close') return SYNC.close();
    if (a === 'back') { UI.screen = UI.hist.pop() || 'pick'; UI.msg = {}; render(); document.getElementById('sg').scrollTop = 0; return; }
    if (a === 'signin') { if (NET.openPanel) NET.openPanel(); return; }
    if (a.indexOf('copy:') === 0) return copy(a.slice(5));
    if (a.indexOf('test:') === 0) return runTest(a.slice(5));
    if (a === 'showTok') { UI.showTok = true; return render(); }
    if (a === 'hideTok') { UI.showTok = false; return render(); }
    if (a === 'retryKey') { UI.keyErr = false; render(); return ensureKey(); }
    if (a === 'refresh') return refresh();
    if (a === 'check') return fullCheck();
    if (a === 'typed') {
      const i = document.getElementById('sg-typed'); const n = parseInt(String(i ? i.value : '').replace(/\D/g, ''), 10);
      if (!(n > 0)) return say('typed', 'Type a number first.', 'bad');
      const g = NET.typeSteps(n, 'total'); if (i) i.value = '';
      return say('typed', g ? '+' + fmt(g) + ' steps added.' : 'Already counted that many today. Type a bigger total later.', g ? 'ok' : 'warn');
    }
  }

  let listener = null;
  const SYNC = window.SYNC = {
    open(screen) {
      css();
      let root = document.getElementById('sg');
      if (!root) {
        root = document.createElement('div'); root.id = 'sg'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', 'Step sync guide');
        document.body.appendChild(root);
        root.addEventListener('click', e => {
          const g = e.target.closest('[data-go]'); if (g) return go(g.getAttribute('data-go'));
          const b = e.target.closest('[data-a]'); if (b) act(b.getAttribute('data-a'));
        });
        // Sign-in happens in the account panel on top of this; re-render when it changes.
        let t = 0; listener = () => { clearTimeout(t); t = setTimeout(() => { if (NET.ok && UI.screen !== 'pick' && UI.screen !== 'typed' && !NET.stepKey) ensureKey(); render(); }, 50); };
        window.addEventListener('net:change', listener);
      }
      UI.hist = []; UI.screen = 'pick'; UI.msg = {}; UI.test = {}; UI.check = null; UI.showTok = false;
      render();
      if (screen && TITLES[screen] && screen !== 'pick') go(screen);
      return true;
    },
    close() {
      const root = document.getElementById('sg'); if (root) root.remove();
      if (listener) window.removeEventListener('net:change', listener); listener = null;
    },
    isOpen: () => !!document.getElementById('sg')
  };
})();
