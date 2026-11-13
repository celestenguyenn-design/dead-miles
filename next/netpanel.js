/* Dead Miles (next) - account / steps / friends sheet. Style B.
   NET.openPanel() / NET.closePanel(). Needs net.js loaded first. Standalone:
   injects its own CSS and DOM, touches nothing else on the page. */
(function () {
  'use strict';
  const NET = window.NET; if (!NET) { console.warn('netpanel.js: load net.js first'); return; }
  const C = { ink: '#11142f', plum: '#3d2d61', wall: '#2a1f4a', lil: '#5a4a86', ora: '#f07b3c', crm: '#f6e3bb', ok: '#7fd49a', bad: '#ff8a7a' };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = n => (Math.round(+n || 0)).toLocaleString('en-US');
  const ago = t => { if (!t) return 'never'; const s = Math.max(0, (Date.now() - t) / 1000); if (s < 60) return 'just now'; if (s < 3600) return Math.floor(s / 60) + ' min ago'; if (s < 86400) return Math.floor(s / 3600) + ' h ago'; return Math.floor(s / 86400) + ' d ago'; };
  const clock = t => t ? new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';

  function css() {
    if (document.getElementById('np-css')) return;
    if (!document.querySelector('link[href*="family=Inter"]')) {
      const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap'; document.head.appendChild(l);
    }
    const s = document.createElement('style'); s.id = 'np-css';
    s.textContent = `
#np{position:fixed;inset:0;z-index:9000;background:rgba(8,9,24,.72);font-family:Inter,system-ui,-apple-system,sans-serif;color:${C.crm};-webkit-tap-highlight-color:transparent}
#np .sh{position:absolute;left:0;right:0;bottom:0;margin:0 auto;box-sizing:border-box;width:100%;max-width:560px;max-height:calc(100% - 16px - env(safe-area-inset-top));overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;background:${C.ink};border-radius:22px 22px 0 0;padding:14px 16px calc(24px + env(safe-area-inset-bottom));box-shadow:0 -10px 40px rgba(0,0,0,.5)}
#np .grab{width:44px;height:5px;border-radius:3px;background:${C.lil};margin:0 auto 10px}
#np .top{display:flex;align-items:center;gap:10px;margin:0 -16px 12px;padding:4px 16px 8px;position:sticky;top:-14px;z-index:2;background:${C.ink}}
#np h2{flex:1;margin:0;font-size:22px;font-weight:800;letter-spacing:.2px}
#np h3{margin:0 0 8px;font-size:13px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;color:${C.ora}}
#np .x{width:44px;height:44px;border-radius:14px;border:0;background:${C.plum};color:${C.crm};font-size:22px;font-weight:800}
#np .card{background:${C.plum};border-radius:18px;padding:14px;margin-bottom:12px;box-shadow:inset 0 -3px 0 rgba(0,0,0,.18)}
#np p{margin:4px 0 8px;font-size:15px;line-height:1.45}
#np .mut{color:rgba(246,227,187,.7);font-size:13px}
#np .row{display:flex;gap:8px;align-items:center}
#np .row>*{flex:1}
#np .btn{min-height:50px;border:0;border-radius:14px;background:${C.ora};color:#2a1308;font:800 16px Inter,system-ui,sans-serif;padding:0 14px;box-shadow:inset 0 -4px 0 rgba(0,0,0,.18)}
#np .btn.g{background:${C.wall};color:${C.crm};box-shadow:inset 0 0 0 2px ${C.lil}}
#np .btn.s{min-height:40px;font-size:14px;border-radius:12px;flex:0 0 auto}
#np .btn:disabled{opacity:.5}
#np input{width:100%;box-sizing:border-box;min-height:50px;border-radius:14px;border:2px solid ${C.lil};background:${C.wall};color:${C.crm};font:600 17px Inter,system-ui,sans-serif;padding:0 14px;margin:4px 0 8px;outline:none}
#np input:focus{border-color:${C.ora}}
#np input::placeholder{letter-spacing:normal;font-size:16px;color:rgba(246,227,187,.45)}
#np .pill{flex:0 0 auto!important;display:inline-flex;align-items:center;gap:6px;padding:5px 11px;border-radius:99px;background:${C.wall};font-size:13px;font-weight:700}
#np .dot{width:9px;height:9px;border-radius:50%}
#np .tabs{display:flex;background:${C.wall};border-radius:14px;padding:4px;margin-bottom:10px}
#np .tabs button{flex:1;min-height:42px;border:0;border-radius:11px;background:transparent;color:${C.crm};font:700 15px Inter,system-ui,sans-serif}
#np .tabs button.on{background:${C.ora};color:#2a1308}
#np .big{font-size:40px;font-weight:800;line-height:1.05}
#np .bar{display:flex;height:12px;border-radius:6px;overflow:hidden;background:${C.wall};margin:10px 0 6px}
#np .bar i{display:block;height:100%}
#np .leg{display:flex;gap:14px;font-size:13px}
#np .leg b{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:5px;vertical-align:-1px}
#np .pin{font-size:32px;font-weight:800;letter-spacing:8px;text-align:center;background:${C.wall};border-radius:14px;padding:10px;margin:6px 0}
#np .msg{font-size:14px;font-weight:600;margin:4px 0 6px;min-height:0}
#np .msg.bad{color:${C.bad}} #np .msg.ok{color:${C.ok}}
#np .fr{display:flex;align-items:center;gap:12px;padding:10px 0;border-top:1px solid rgba(246,227,187,.1)}
#np .fr:first-of-type{border-top:0}
#np .av{width:42px;height:42px;border-radius:13px;background:${C.lil};display:flex;align-items:center;justify-content:center;font-weight:800;font-size:18px;flex:0 0 auto}
#np .fr .nm{flex:1;min-width:0}
#np .fr .nm b{display:block;font-size:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#np .fr .st{text-align:right;font-size:13px;flex:0 0 auto}
#np .fr .st span{display:block}
#np .fr .st b{display:block;font-size:17px;color:${C.crm}}
#np details{background:${C.wall};border-radius:14px;padding:0 12px;margin:8px 0}
#np summary{min-height:48px;display:flex;align-items:center;font-weight:700;font-size:15px;cursor:pointer;list-style:none}
#np summary::-webkit-details-marker{display:none}
#np summary:after{content:'+';margin-left:auto;color:${C.ora};font-size:22px}
#np details[open] summary:after{content:'-'}
#np ol{margin:0 0 12px;padding-left:20px;font-size:14px;line-height:1.5}
#np code{font:600 12px ui-monospace,Menlo,monospace;background:${C.ink};padding:2px 5px;border-radius:6px;word-break:break-all}
#np .lnk{background:none;border:0;color:${C.crm};text-decoration:underline;font:600 14px Inter,system-ui,sans-serif;padding:10px 0;opacity:.75}
`;
    document.head.appendChild(s);
  }

  const UI = { tab: 'new', msg: {}, showKey: false, showPin: false, busy: false };
  function msg(id) { const m = UI.msg[id]; return m ? '<div class="msg ' + (m.ok ? 'ok' : 'bad') + '">' + esc(m.t) + '</div>' : ''; }
  function say(id, t, ok) { UI.msg[id] = { t, ok }; render(); }

  function statusPill() {
    const st = NET.ok ? (NET.status === 'offline' ? ['Offline - will sync', '#f0c23c'] : ['Online', C.ok]) : NET.status === 'checking' ? ['Checking...', '#f0c23c'] : NET.status === 'bad-key' ? ['Key out of date', C.bad] : ['Not signed in', C.bad];
    return '<span class="pill"><span class="dot" style="background:' + st[1] + '"></span>' + st[0] + '</span>';
  }

  function accountCard() {
    if (NET.ok) {
      return '<div class="card"><h3>Account</h3>'
        + '<div class="row" style="align-items:center"><div><div style="font-size:20px;font-weight:800">' + esc(NET.name || NET.handle) + '</div><div class="mut">@' + esc(NET.handle) + (NET.idSource === 'old-game' ? ' &middot; same account as the old game' : '') + '</div></div>' + statusPill() + '</div>'
        + (NET.rotated ? '<p class="mut" style="color:#f0c23c">Signing in with your PIN gave this phone a new account key. If you use the Android step app, paste the new key into it (below).</p>' : '')
        + (NET.conflict ? '<p style="color:#f0c23c">Another device saved a different game. Which one do you keep?</p><div class="row"><button class="btn g" data-a="keepLocal">This phone</button><button class="btn" data-a="keepRemote">The other one</button></div>' : '')
        + (NET.err && NET.status !== 'online' ? '<p class="mut">' + esc(NET.err) + '</p>' : '')
        + '</div>';
    }
    const t = UI.tab;
    return '<div class="card"><h3>Account</h3>' + statusPill()
      + (NET.status === 'bad-key' ? '<p>' + esc(NET.err) + '</p>' : '<p>Your account keeps your character safe and lets your phone send steps.</p>')
      + '<div class="tabs"><button data-tab="new" class="' + (t === 'new' ? 'on' : '') + '">New player</button><button data-tab="old" class="' + (t === 'old' ? 'on' : '') + '">I already play</button></div>'
      + (t === 'new'
        ? '<input id="np-h" placeholder="handle (e.g. brooklyn)" autocapitalize="off" autocomplete="off" maxlength="20" value="' + esc(UI.h || '') + '"><input id="np-n" placeholder="your name" maxlength="24" value="' + esc(UI.n || '') + '">' + msg('acct') + '<button class="btn" style="width:100%" data-a="register">Create my account</button>'
        : '<input id="np-h" placeholder="handle" autocapitalize="off" autocomplete="username" maxlength="20" value="' + esc(UI.h || NET.handle || '') + '"><input id="np-s" placeholder="6-digit PIN or account key" autocapitalize="off" autocomplete="current-password">' + msg('acct') + '<button class="btn" style="width:100%" data-a="signin">Sign in</button><p class="mut">Same handle as the old Dead Miles. Your phone\'s step syncing keeps working.</p>')
      + '</div>';
  }

  function pinCard() {
    if (!NET.ok) return '';
    const p = NET.pin;
    return '<div class="card"><h3>Recovery PIN</h3>'
      + (p ? '<div class="pin">' + (UI.showPin ? esc(p) : '&bull;&bull;&bull;&bull;&bull;&bull;') + '</div><div class="row"><button class="btn g s" data-a="showPin">' + (UI.showPin ? 'Hide' : 'Show') + '</button><span class="mut" style="flex:1">@' + esc(NET.handle) + ' + this PIN gets you back in on any phone.</span></div>'
        : NET.hasPin ? '<p>You set a PIN in the old game. Set it again here to see it on this phone.</p>' : '<p style="color:#f0c23c">No PIN yet. Without one, losing this phone means losing your character.</p>')
      + '<input id="np-pin" inputmode="numeric" pattern="[0-9]*" maxlength="6" placeholder="' + (p || NET.hasPin ? 'new 6-digit PIN' : '6 digits') + '" style="text-align:center;letter-spacing:6px;font-size:22px" value="' + esc(UI.pin || '') + '">' + msg('pin')
      + '<div class="row"><button class="btn g" data-a="pickPin">Pick one</button><button class="btn" data-a="setPin">' + (p || NET.hasPin ? 'Change PIN' : 'Save PIN') + '</button></div></div>';
  }

  function stepsCard() {
    if (!NET.ok) return '';
    const s = NET.steps || {}; const d = NET.stepsDay();
    const tot = Math.max(1, d.ap + d.at); const php = Math.round(d.ap / tot * 100), typ = 100 - php;
    const posts = (s.posts || []).slice(0, 4).map(x => clock(x.t) + ' ' + fmt(x.n)).join(' &middot; ');
    return '<div class="card"><h3>Steps today</h3>'
      + '<div class="row" style="align-items:flex-end"><div><div class="big">' + fmt(d.eff) + '</div><div class="mut">yesterday ' + fmt(NET.stepsDay(NET.dayStr(new Date(Date.now() - 864e5))).eff) + '</div></div>'
      + '<button class="btn s" data-a="sync" ' + (UI.busy ? 'disabled' : '') + '>' + (UI.busy ? 'Syncing...' : 'Sync now') + '</button></div>'
      + '<div class="bar"><i style="width:' + (d.ap + d.at ? php : 0) + '%;background:' + C.ora + '"></i><i style="width:' + (d.ap + d.at ? typ : 0) + '%;background:' + C.lil + '"></i></div>'
      + '<div class="leg"><span><b style="background:' + C.ora + '"></b>Phone ' + fmt(d.ap) + '</span><span><b style="background:' + C.lil + '"></b>Typed ' + fmt(d.at) + '</span></div>'
      + '<p class="mut" style="margin-top:10px">Checked ' + ago(NET.lastPull) + '. ' + (NET.lastPost ? 'Your phone last sent steps at ' + clock(NET.lastPost) + '.' : '<span style="color:#f0c23c">Nothing from your phone yet today.</span>') + (posts ? '<br>Received: ' + posts : '') + '</p>'
      + '<details><summary>Phone missed a walk? Type today\'s total</summary><p class="mut">Typed steps count half and at most ' + fmt(NET.cfg.typedCap) + ' above what your phone counted. When your phone catches up, nothing is counted twice.</p><input id="np-typed" inputmode="numeric" pattern="[0-9]*" placeholder="my total today">' + msg('typed') + '<button class="btn g" style="width:100%;margin-bottom:12px" data-a="typed">That\'s my total</button></details>'
      + '</div>';
  }

  function howCard() {
    if (!NET.ok) return '';
    const key = NET.token;
    return '<div class="card"><h3>How to sync steps</h3>'
      + '<details><summary>iPhone</summary><ol>'
      + '<li>Already have the <b>Dead Miles Steps</b> Shortcut from the old game? <b>Nothing to change</b> - it keeps working with this game.</li>'
      + '<li>New phone? In Shortcuts make a personal automation (every hour, Run Immediately): <i>Find Health Samples</i> (Steps, Start Date is today) &rarr; <i>Calculate Statistics</i> (Sum) &rarr; <i>Get Contents of URL</i>, POST, JSON field <code>p</code> = your code followed by the Sum.</li>'
      + '<li>URL: <code>' + esc(NET.SB.url) + '/rest/v1/rpc/post_steps_link?apikey=...</code> <button class="btn g s" data-a="copyUrl">Copy URL</button></li>'
      + '<li>Your code: <code>' + esc(NET.shortcutCode()) + '</code> <button class="btn g s" data-a="copyCode">Copy code</button></li>'
      + '</ol></details>'
      + '<details><summary>Android</summary><ol>'
      + '<li>Already using the <b>Dead Miles Steps</b> app? <b>Nothing to change</b> - it sends your Health Connect steps every hour and this game reads them.</li>'
      + '<li>Setting it up: install the app, allow Health Connect steps, then enter your handle <code>' + esc(NET.handle) + '</code> and account key.</li>'
      + '<li>Account key: <code>' + (UI.showKey ? esc(key) : '&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;') + '</code> <button class="btn g s" data-a="showKey">' + (UI.showKey ? 'Hide' : 'Show') + '</button> <button class="btn g s" data-a="copyKey">Copy</button></li>'
      + '</ol></details>'
      + msg('copy') + '</div>';
  }

  function boardCard() {
    const rows = NET.boardRows || [];
    const list = rows.length ? rows.map(r => {
      const me = r.handle === NET.handle;
      return '<div class="fr"><div class="av" style="' + (me ? 'background:' + C.ora + ';color:#2a1308' : '') + '">' + esc((r.name || r.handle || '?').charAt(0).toUpperCase()) + '</div>'
        + '<div class="nm"><b>' + esc(r.name || r.handle) + (me ? ' (you)' : '') + '</b><span class="mut">Lv ' + (r.level || 1) + (r.job ? ' ' + esc(r.job) : '') + ' &middot; ' + fmt(r.looted) + ' houses &middot; ' + fmt(r.kills) + ' kills</span></div>'
        + '<div class="st"><b>' + fmt(r.steps_today) + '</b><span class="mut">' + fmt(r.steps_week) + ' this week</span>' + (r.typed_share > 0.25 ? '<span class="mut">' + Math.round(r.typed_share * 100) + '% typed</span>' : '') + '</div></div>';
    }).join('') : '<p class="mut">No one has played the new game in the last two weeks yet.</p>';
    return '<div class="card"><div class="row" style="margin-bottom:6px"><h3 style="margin:0">Friends</h3><button class="btn g s" style="flex:0 0 auto" data-a="board">Refresh</button></div>' + list + '</div>';
  }

  function partyCard() {
    if (!NET.ok) return '';
    const p = NET.party;
    return '<div class="card"><h3>Party</h3>'
      + (p && p.code ? '<p>In party <b>' + esc(p.code) + '</b> (' + (p.members || []).length + '/6): ' + (p.members || []).map(m => '@' + esc(m)).join(', ') + '</p><button class="btn g" style="width:100%" data-a="leave">Leave party</button>'
        : '<p class="mut">Up to 6 friends share a horde night. Everyone types the same code.</p><div class="row"><input id="np-party" placeholder="party code" autocapitalize="off" maxlength="20" style="margin:0"><button class="btn s" style="min-height:50px" data-a="join">Join</button></div>')
      + msg('party') + '</div>';
  }

  function render() {
    const root = document.getElementById('np'); if (!root) return;
    const sh = root.querySelector('.sh'); const y = sh ? sh.scrollTop : 0;
    // keep typed input values across re-renders
    const keep = {}; root.querySelectorAll('input[id]').forEach(i => { keep[i.id] = i.value; });
    root.innerHTML = '<div class="sh"><div class="grab"></div><div class="top"><h2>Online</h2><button class="x" data-a="close" aria-label="Close">&times;</button></div>'
      + accountCard() + stepsCard() + pinCard() + partyCard() + boardCard() + howCard()
      + (NET.ok ? '<div style="text-align:center"><button class="lnk" data-a="signout">Sign out of this device</button></div>' : '')
      + '</div>';
    for (const k in keep) { const i = document.getElementById(k); if (i && keep[k]) i.value = keep[k]; }
    root.querySelector('.sh').scrollTop = y;
  }

  const val = id => { const i = document.getElementById(id); return i ? i.value.trim() : ''; };
  async function copy(t, what) {
    try { await navigator.clipboard.writeText(t); say('copy', what + ' copied.', true); }
    catch (e) { say('copy', 'Copy blocked here. Long-press and copy: ' + t, false); }
  }
  async function act(a) {
    UI.msg = {};
    if (a === 'close') return NET.closePanel();
    if (a === 'register') { UI.h = val('np-h'); UI.n = val('np-n'); const r = await NET.register(UI.h, UI.n || UI.h); if (!r.ok) say('acct', r.message || r.error); else { await NET.board(); render(); } return; }
    if (a === 'signin') { UI.h = val('np-h'); const r = await NET.signIn(UI.h, val('np-s')); if (!r.ok) say('acct', r.error); else { await Promise.all([NET.board(), NET.partyGet()]); render(); } return; }
    if (a === 'signout') { if (confirm('Sign out of @' + NET.handle + ' on this device? Your game stays saved on the server.')) NET.signOut(); return render(); }
    if (a === 'showPin') { UI.showPin = !UI.showPin; return render(); }
    if (a === 'pickPin') { const i = document.getElementById('np-pin'); if (i) i.value = NET.makePin(); return; }
    if (a === 'setPin') { const r = await NET.setPin(val('np-pin')); if (r.ok) { UI.showPin = true; const i = document.getElementById('np-pin'); if (i) i.value = ''; } return say('pin', r.ok ? 'PIN saved. Write it down somewhere.' : r.error, r.ok); }
    if (a === 'sync') { UI.busy = true; render(); const r = await NET.pullSteps(); UI.busy = false; return say('copy', r ? 'Synced.' : 'Could not reach the server.', !!r) || render(); }
    if (a === 'typed') { const n = parseInt(val('np-typed').replace(/\D/g, ''), 10); if (!(n > 0)) return say('typed', 'Type a number.'); const g = NET.typeSteps(n, 'total'); return say('typed', g ? '+' + fmt(g) + ' steps.' : 'Already counted that many today.', !!g); }
    if (a === 'board') { await NET.board(); return render(); }
    if (a === 'join') { const r = await NET.partyJoin(val('np-party')); return say('party', r.ok ? 'Joined.' : r.error, r.ok); }
    if (a === 'leave') { await NET.partyLeave(); return render(); }
    if (a === 'showKey') { UI.showKey = !UI.showKey; return render(); }
    if (a === 'copyKey') return copy(NET.token, 'Account key');
    if (a === 'copyCode') { await NET.getStepKey(); return copy(NET.shortcutCode(), 'Code'); }
    if (a === 'copyUrl') return copy(NET.shortcutUrl(), 'URL');
    if (a === 'keepLocal') { await NET.resolve('local'); return render(); }
    if (a === 'keepRemote') { const r = await NET.resolve('remote'); if (r && r.state && NET.onRemoteAdopted) NET.onRemoteAdopted(r.state); return render(); }
  }

  NET.openPanel = function () {
    css();
    let root = document.getElementById('np');
    if (!root) {
      root = document.createElement('div'); root.id = 'np'; document.body.appendChild(root);
      root.addEventListener('click', e => {
        if (e.target === root) return NET.closePanel();
        const tb = e.target.closest('[data-tab]'); if (tb) { UI.tab = tb.getAttribute('data-tab'); UI.msg = {}; return render(); }
        const b = e.target.closest('[data-a]'); if (b) act(b.getAttribute('data-a'));
      });
      UI.listener = () => render(); window.addEventListener('net:change', UI.listener);
    }
    render();
    if (NET.ok) { NET.board(); NET.partyGet(); NET.getStepKey(); if (Date.now() - NET.lastPull > 30000) NET.pullSteps(); }
    else NET.board();
  };
  NET.closePanel = function () {
    const root = document.getElementById('np'); if (root) root.remove();
    if (UI.listener) window.removeEventListener('net:change', UI.listener); UI.listener = null;
  };
})();
