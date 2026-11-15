/* Dead Miles (next) 0.26.2 - the guided tour (owner: "pls add instructions to the game" / "a tutorial").
   A spotlight walks over the home screen, one part at a time: a dimmed screen with a hole over the part, a card with
   what it is and what to do, Back / Next / Skip. Parts that are not on screen (e.g. Deck the base outside a holiday)
   are skipped. It opens with SETUP (sign in, step sync, typing as the fallback) before anything else. Starts by itself
   once: right after a new character is made (before the tutorial house and any tip), or after this update for everyone
   else when the home screen is idle (no sheet, tip, menu or run open). Replay: Settings > Game tour, or How to play.
   Save: SV.tourDone = 1 once it is finished or skipped. */
'use strict';
window.DM = window.DM || {};
(() => {
  const $ = s => document.querySelector(s);
  const TO = DM.Tour = {};
  const SV = () => DM.Game && DM.Game.data && DM.Game.data();
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const loot = () => [...document.querySelectorAll('#hlist .hcard, .hcard')].find(c => [...c.querySelectorAll('button')].some(b => b.textContent.trim() === 'Loot'));
  // 0.26.2 (owner: "make sure the tutorial tells them how to set up FIRST before anything else, especially the steps"):
  // the tour opens with step setup - sign in, then step sync (with buttons that open them), then typing as the fallback.
  const signedIn = () => !!(window.NET && NET.handle);
  const STEPS = [
    { t: 'Set up first: your steps', d: 'Dead Miles runs on your REAL steps, so set them up before anything else. It takes a couple of minutes: 1) sign in, 2) turn on step sync so every step you walk comes in by itself. Synced steps count in full - typed ones only count at half.' },
    { s: '#mnet', t: 'Step 1 of 2 · Sign in', d: () => signedIn() ? `You're signed in as @${NET.handle} - step 1 done.` : 'Tap Sign in now to make your account. Step sync needs it, it backs up your save, and it lets you see your friends.',
      act: () => signedIn() ? null : ['Sign in now', () => { const b = $('#mnet'); if (b) b.click(); }] },
    { s: '#mSyncG', t: 'Step 2 of 2 · Turn on step sync', d: 'Open the setup guide and follow it for your phone: iPhone uses a Shortcut (from Apple Health), Android uses the Dead Miles companion app. Once it is on, your steps arrive by themselves at full value - you never type them again.',
      act: () => window.SYNC ? ['Open the setup guide', () => SYNC.open()] : null },
    { s: '#mLog', t: 'No sync yet? Type your steps', d: 'Until sync is on (or if it cannot work on your phone), type today\'s step TOTAL from your phone or watch here and tap Log. Typed steps count at half, up to 4,000 a day. Every ~1,000 steps scouts another house to loot.' },
    { s: '#mNeeds', t: 'Hunger and thirst', d: 'These drain slowly, even with the app closed. Tap them to eat or drink. Below 30 you tire faster and search slower.' },
    { s: '#mSkills', t: 'Level and skills', d: 'Everything you do earns XP. Each level gives a skill point to spend in the skill trees here.' },
    { s: '#mWard', t: 'Wardrobe', d: 'Cosmetics you earn go straight here: hats, glasses, scarves, packs and jackets. Edit look changes your face and hair.' },
    { s: '#hPill', t: 'Horde night', d: 'Every Sunday a horde attacks your base. The countdown is here. Build walls and traps, and take watch shifts to defend it.' },
    { s: '#hBase', t: 'Your base', d: 'Walk around your base: build defences and garden beds with build steps (half of every step), and Decorate with furniture you find. Your stash chest is there too.' },
    { s: '#evBan', t: 'Holiday events', d: 'Holidays bring their own loot, a mini-boss, jobs from Dot, holiday capsules and decor. Tap the banner to see what is on.' },
    { s: '[data-tile="boss"]', t: 'Weekly boss', d: 'A named boss each week, the same for everyone. Walk 5,000 steps that week to reach it, then fight it.' },
    { s: '[data-tile="deep"]', t: 'Deep runs', d: 'Go down floor after floor for better loot. Every floor gets harder - leave before it goes wrong.' },
    { s: '[data-tile="crew"]', t: 'Crew and strays', d: 'Survivors and pets you rescue live at your base. Crew can loot houses for you, and they need feeding.' },
    { s: '#mtabs [data-t="houses"]', t: 'Houses', d: 'Your list of scouted houses, Dot, the daily challenge and the capsule machine. Unlooted houses last 3 days.' },
    { s: '.rtseg', t: 'Daily route', d: 'Route shows today\'s branching map: every 1,500 steps opens the next row, and you pick one stop - a house, a safehouse, Dot, a supply drop or an event.' },
    { s: '.hcard.trader', t: 'Auntie Dot, the trader', d: 'Take jobs, buy supplies and sell junk for caps. After a visit she heads off for 3,000 steps (up to 3 visits a day).' },
    { s: '#dlyCard', t: 'Daily challenge', d: 'One house a day, the same for everyone. Your first try is scored on the leaderboard.' },
    { s: '#dkCard', t: 'Deck the base', d: 'During a holiday, place its decor at your base for prizes: capsule tokens, caps and a legendary hat.' },
    { s: '#gaCard', t: 'Capsule machine', d: 'Spend a token on a random cosmetic. You get a token every 4,000 steps (up to 3 a day), or buy one with caps.' },
    { f: loot, t: 'Loot a house', d: 'Loot to go in yourself: search furniture, pick locks, avoid or fight zombies, and leave with what you found. Crew sends a crew member instead.' },
    { s: '#mtabs [data-t="stash"]', t: 'Gear', d: 'Your backpack and stash: eat, equip weapons, move things to the stash so a bad run cannot cost them, sell or discard junk.' },
    { s: '#mtabs [data-t="bench"]', t: 'Workbench', d: 'Craft bandages, lockpicks, arrows, weapons and gear from materials. Blueprints unlock new recipes.' },
    { s: '#mtabs [data-t="map"]', t: 'Real-world map', d: 'Your real streets. Walk within ~35 m of a marked place with the map open to claim it as a landmark house (3 a day, on foot).' },
    { s: '#mset', t: 'Settings and help', d: 'Sound, music, your save, How to play (every rule in detail) and this tour again. That\'s it - go walk!' },
  ];
  let on = false, pending = false, i = 0, list = [], el = null;
  const SETUP = 4;   // the first 4 steps are the setup
  function visible(n) { if (!n) return false; const r = n.getBoundingClientRect(); return r.width > 0 && r.height > 0 && n.offsetParent !== null; }
  const txt = v => typeof v === 'function' ? v() : v;
  function target(st) { return st.f ? st.f() : st.s ? $(st.s) : null; }
  function build() {
    if (el) return;
    const css = document.createElement('style');
    css.textContent = `#tour { position: fixed; inset: 0; z-index: 60; pointer-events: auto; }
      #tour .tourspot { position: fixed; border-radius: 14px; border: 3px solid #f07b3c; box-shadow: 0 0 0 9999px rgba(8,6,22,.74); transition: all .28s ease; pointer-events: none; }
      #tour .tourspot.none { left: 50% !important; top: 40% !important; width: 0 !important; height: 0 !important; border-width: 0; }
      #tour .tourcard { position: fixed; left: 12px; right: 12px; max-width: 440px; margin: 0 auto; padding: 14px 16px; border-radius: 18px; background: #1c1538; border: 3px solid #11142f; box-shadow: 0 5px 0 #f07b3c; color: #f6e3bb; transition: top .28s ease, bottom .28s ease; }
      #tour .tourcard .tourk { font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: #f07b3c; font-weight: 800; }
      #tour .tourcard h4 { margin: 2px 0 6px; font-size: 19px; } #tour .tourcard p { margin: 0 0 12px; font-size: 14px; line-height: 1.4; color: #e6dcc8; } #tour .touract { width: 100%; margin: 0 0 10px; }
      #tour .tourbtns { display: flex; gap: 8px; align-items: center; } #tour .tourbtns .tourskip { margin-right: auto; background: none; border: 0; color: #9d90bf; text-decoration: underline; font: inherit; font-size: 13px; padding: 6px 0; }
      #tour .tourdots { display: flex; gap: 4px; margin: 0 0 10px; flex-wrap: wrap; } #tour .tourdots i { width: 6px; height: 6px; border-radius: 3px; background: #3d2d61; } #tour .tourdots i.on { background: #f07b3c; width: 14px; }
      @media (prefers-reduced-motion: reduce) { #tour .tourspot, #tour .tourcard { transition: none; } }`;
    document.head.appendChild(css);
    el = document.createElement('div'); el.id = 'tour';
    el.innerHTML = '<div class="tourspot none"></div><div class="tourcard"></div>';
    el.addEventListener('click', e => e.stopPropagation());
    document.body.appendChild(el);
    addEventListener('resize', () => { if (on) place(); });
  }
  function place() {
    const st = list[i], n = target(st), spot = el.querySelector('.tourspot'), card = el.querySelector('.tourcard');
    if (n && visible(n)) {
      const r = n.getBoundingClientRect(), pad = 6;
      Object.assign(spot.style, { left: r.left - pad + 'px', top: r.top - pad + 'px', width: r.width + pad * 2 + 'px', height: r.height + pad * 2 + 'px' });
      spot.classList.remove('none');
      const below = r.top + r.height / 2 < innerHeight / 2;
      card.style.top = below ? Math.min(innerHeight - 220, r.bottom + 16) + 'px' : 'auto';
      card.style.bottom = below ? 'auto' : Math.min(innerHeight - 220, innerHeight - r.top + 16) + 'px';
    } else { spot.classList.add('none'); card.style.top = 'auto'; card.style.bottom = '24%'; }
  }
  function show() {
    const st = list[i], n = target(st);
    if (n && n.scrollIntoView) try { n.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); } catch (e) { n.scrollIntoView(); }
    const card = el.querySelector('.tourcard'), last = i === list.length - 1;
    const act = st.act ? st.act() : null;
    card.innerHTML = `<div class="tourk">${i < SETUP ? 'Setup' : 'Tour'} · ${i + 1} of ${list.length}</div><h4>${esc(st.t)}</h4><p>${esc(txt(st.d))}</p>${act ? `<button class="mbtn touract" id="tAct">${esc(act[0])}</button>` : ''}
      <div class="tourdots">${list.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div>
      <div class="tourbtns"><button class="tourskip" id="tSkip">${last ? '' : 'Skip tour'}</button>${i ? '<button class="mbtn sm ghost" id="tBack">Back</button>' : ''}<button class="mbtn sm" id="tNext">${last ? 'Done' : i ? 'Next' : 'Show me'}</button></div>`;
    const sfx = () => { try { DM.E.SFX.play('ui'); } catch (e) { /* ignore */ } };
    if (act) $('#tAct').onclick = () => { sfx(); pause(act[1]); };
    $('#tNext').onclick = () => { sfx(); if (last) end(); else { i++; show(); } };
    if ($('#tBack')) $('#tBack').onclick = () => { sfx(); i--; show(); };
    if (last) $('#tSkip').style.visibility = 'hidden'; else $('#tSkip').onclick = () => { sfx(); end(); };
    place(); setTimeout(place, 350); setTimeout(place, 700);   // after the smooth scroll
  }
  // a setup button: hide the tour, open the panel / guide, and come back to the same step once it is closed
  let waitT = null;
  function pause(fn) {
    el.style.display = 'none'; try { fn(); } catch (e) { /* ignore */ }
    clearInterval(waitT);
    waitT = setInterval(() => {
      const open = $('#np') || $('#sg') || ($('#msheet') && $('#msheet').classList.contains('on'));
      if (open || !on) return;
      clearInterval(waitT); el.style.display = ''; show();
    }, 500);
  }
  function end() {
    on = false; pending = false; clearInterval(waitT); if (el) el.style.display = 'none';
    const v = SV(); if (v) { v.tourDone = 1; DM.Game.save(); }
    if (DM.Game.tipNext) setTimeout(DM.Game.tipNext, 600);   // tips held back during the tour
    if (DM.E && DM.E.toast) DM.E.toast('Replay the tour any time: Settings > Game tour', 2.4);
  }
  TO.start = function () {
    const v = SV(); if (!v || !v.survivor || DM.scene) return false;
    if ($('#msheet')) $('#msheet').classList.remove('on');
    const tab = $('#mtabs [data-t="houses"]'); if (tab && !tab.classList.contains('on')) tab.click();
    build(); el.style.display = ''; on = true; pending = false; i = 0;
    list = STEPS.filter((st, k) => k < SETUP || !st.s && !st.f || visible(target(st)));   // setup steps always show
    show(); return true;
  };
  TO.active = () => on || pending;
  // right after a new character is made: before the tutorial house and before any tip
  TO.queue = () => { pending = true; setTimeout(() => { if (!TO.start()) pending = false; }, 700); };
  // once by itself: after the tutorial house, when nothing else is on screen
  setInterval(() => {
    const v = SV();
    if (on || pending || !v || !v.survivor || v.tourDone || DM.scene || document.hidden) return;
    if (($('#msheet') && $('#msheet').classList.contains('on')) || ($('#tipbox') && $('#tipbox').classList.contains('on')) || !visible($('#mtabs')) || ($('#menu') && $('#menu').className)) return;
    TO.start();
  }, 2500);
})();
