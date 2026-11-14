/* Dead Miles (next) 0.22 - the title screen (owner: "a home screen added to start the game that says Dead Miles.
   Animated, with zombies walking around and lightning flashes").

   Shows on every app launch, before the home screen (and before character creation for a brand-new player).
   game.js decides when (Title.wanted) and holds its boot until the tap (opts.onStart).
   - Skipped: the ?synced=1 return from the iPhone Shortcut (a quick step sync should not stop at a title), the reload
     right after an auto-update (sessionStorage 'dm-title-skip', set by game.js only once she is past the title), ?notitle.
   - The scene: a plum night sky, a moon behind drifting clouds, the Manhattan skyline and the Brooklyn Bridge far off,
     a row of brownstones with stoops and a few lit windows, a street lamp, zombies (the game's own rig) shambling along
     the sidewalk and the street at two depths, her own survivor in front if she has one, rain (or the real weather:
     snow, fog, a storm - weather.js), and lightning: the sky lights up, a jagged bolt, the street lit for a frame or two,
     then thunder (procedural, only once audio is unlocked by a tap - iOS rule).
   - Light on the CPU: the sky and the buildings are drawn once per resize onto two canvases; each frame is ~2 big
     drawImages + 6 rigs + one rain path. ~30 fps, stops when the app is hidden, and the logo is a static SVG.
   - Reduced motion: no flashes or bolts (only a soft glow), nothing walks, rain hangs still, the prompt does not pulse.
   The first tap unlocks audio, sets off one close strike with a thunder crack, and fades into the game. */
'use strict';
window.DM = window.DM || {};
(() => {
  const T = DM.Title = { up: false };
  const P = { INK: '#11142f', PLUM: '#3d2d61', ORA: '#f07b3c', ORAD: '#c95f2c', CRM: '#f6e3bb', WALL: '#2a1f4a', LIL: '#5a4a86', LILD: '#4a3c70' };
  const reduced = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  const WX = () => DM.Weather;
  let el = null, cv = null, cx = null, W = 0, H = 0, dpr = 1, sky = null, front = null, mid = null, cloudCv = [];
  let slow = 0, raf = 0, last = 0, acc = 0, t = 0, opt = {}, zs = [], clouds = [], flash = 0, nextFlash = 3, bolt = null, boltT = 0, starting = false;
  const st = { frames: 0, strikes: 0, thunder: 0, reduced: false, weather: 'clear' };

  T.wanted = function () {
    try {
      if (window.DM_SYNCED) return false;                       // back from the step-sync Shortcut
      if (/[?&]notitle\b/.test(location.search)) return false;   // tests, links
      if (sessionStorage.getItem('dm-title-skip')) { sessionStorage.removeItem('dm-title-skip'); return false; }   // auto-update reload
    } catch (e) { /* storage blocked: show it */ }
    return true;
  };

  // ---------------------------------------------------------------- the logo: hand-built block letters (no font needed)
  // 90 units tall; evenodd holes. A wobble filter gives the hand-drawn edge, an orange extrusion + drips the accents.
  const LET = {
    D: [64, 'M0 0H34Q64 0 64 45Q64 90 34 90H0Z M22 20H31Q42 20 42 45Q42 70 31 70H22Z'],
    E: [52, 'M0 0H52V20H22V35H46V55H22V70H52V90H0Z'],
    A: [66, 'M0 90L22 0H44L66 90H45L41 74H25L21 90Z M29 56H37L33 33Z'],
    M: [80, 'M0 90V0H22L40 34L58 0H80V90H60V42L45 68H35L20 42V90Z'],
    I: [24, 'M0 0H24V90H0Z'],
    L: [50, 'M0 0H22V70H50V90H0Z'],
    S: [58, 'M55 8Q44 -1 28 0Q2 2 2 27Q2 45 26 51Q36 54 36 61Q36 70 26 70Q13 70 5 61L0 82Q12 92 30 90Q58 88 58 62Q58 42 34 37Q24 34 24 28Q24 20 32 20Q42 20 49 27Z'],
  };
  function wordSVG(word, y, jit) {
    const gap = 8, tot = word.split('').reduce((s, c) => s + LET[c][0], 0) + gap * (word.length - 1);
    let x = (320 - tot) / 2, g = '';
    word.split('').forEach((c, i) => {
      const [w, d] = LET[c], [r, dy] = jit[i];
      g += `<g transform="translate(${x.toFixed(1)} ${y + dy}) rotate(${r} ${w / 2} 45)">
        <path d="${d}" transform="translate(0 9)" fill="${P.ORA}" stroke="${P.INK}" stroke-width="7" stroke-linejoin="round" fill-rule="evenodd"/>
        <path d="${d}" fill="${P.CRM}" stroke="${P.INK}" stroke-width="7" stroke-linejoin="round" fill-rule="evenodd"/></g>`;
      x += w + gap;
    });
    return g;
  }
  function drip(x, y, len, cls) {
    return `<path class="${cls || ''}" d="M${x - 4} ${y}h8v${len}a4 4 0 0 1 -8 0z" fill="${P.ORA}" stroke="${P.INK}" stroke-width="3" stroke-linejoin="round"/><circle cx="${x - 1.4}" cy="${y + len - 2}" r="1.2" fill="#fff6dd" opacity=".7"/>`;
  }
  const LOGO = `<svg class="tlogo" viewBox="0 0 320 250" aria-label="Dead Miles" role="img">
    <defs><filter id="tlwob" x="-5%" y="-5%" width="110%" height="115%"><feTurbulence type="fractalNoise" baseFrequency=".045" numOctaves="2" seed="11" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="4.5"/></filter></defs>
    <g class="tldrips">${drip(52, 104, 22, 'd1')}${drip(186, 104, 13)}${drip(262, 104, 30, 'd2')}${drip(40, 214, 16)}${drip(150, 214, 26, 'd3')}${drip(222, 214, 12)}${drip(287, 213, 20)}</g>
    <g filter="url(#tlwob)">${wordSVG('DEAD', 12, [[-3, 2], [2, -1], [-1, 1], [3, 0]])}${wordSVG('MILES', 122, [[2, 0], [-3, 2], [1, -1], [-2, 1], [3, 0]])}</g>
  </svg>`;

  // ---------------------------------------------------------------- DOM
  T.show = function (o) {
    opt = o || {}; if (el) return;
    T.up = true; starting = false; st.reduced = reduced();
    document.body.classList.add('titleon');
    el = document.createElement('div'); el.id = 'title'; if (st.reduced) el.classList.add('still');
    el.innerHTML = `<canvas id="tcv"></canvas>
      <div class="tltop">${LOGO}<div class="tltag">walk · loot · survive</div></div>
      <div class="tlbot"><button class="tlgo" id="tlGo">${opt.isNew ? 'TAP TO BEGIN' : 'TAP TO START'}</button>
        <div class="tllinks"><button id="tlSet">Settings</button><i>·</i><button id="tlHow">How to play</button></div>
        <div class="tlver">${opt.version || ''}</div></div>`;
    const before = document.getElementById('mres');
    (before ? before.parentNode : document.getElementById('app')).insertBefore(el, before);
    cv = el.querySelector('#tcv'); cx = cv.getContext('2d');
    const stop = e => { e.stopPropagation(); };
    for (const id of ['tlSet', 'tlHow']) { const b = el.querySelector('#' + id); b.addEventListener('pointerdown', stop); b.addEventListener('click', e => { stop(e); try { DM.E.SFX.init(); DM.E.SFX.play('ui'); } catch (x) { /* ignore */ } (id === 'tlSet' ? opt.settings : opt.howto) && (id === 'tlSet' ? opt.settings : opt.howto)(); }); }
    el.addEventListener('pointerdown', go);
    addEventListener('keydown', key);
    addEventListener('resize', resize);
    document.addEventListener('visibilitychange', vis);
    resize(); seed(); rigs();
    nextFlash = 2.2 + Math.random() * 1.5;
    if (st.reduced) { frame(performance.now()); slow = setInterval(() => frame(performance.now()), 1000); } else loop();   // reduced motion: a still picture, redrawn once a second
  };
  function key(e) { if (T.up && !starting && (e.code === 'Enter' || e.code === 'Space') && !document.querySelector('#msheet.on')) { e.preventDefault(); go(e); } }
  function vis() { if (!el) return; if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else if (!raf && !st.reduced) loop(); }
  function go(e) {
    if (starting || !el) return;
    if (document.querySelector('#msheet.on')) return;   // a sheet (settings, the save picker) is on top
    starting = true;
    try { DM.E.SFX.init(); } catch (x) { /* no audio */ }
    T.strike(1);   // one close strike as she starts (the tap unlocked audio, so this one thunders)
    el.classList.add('go');
    setTimeout(() => { T.up = false; try { opt.onStart && opt.onStart(); } catch (x) { console.error(x); } }, 260);   // the game boots under the fading title
    setTimeout(() => el && el.classList.add('out'), 380);
    setTimeout(T.hide, 1100);
  }
  T.hide = function () {
    if (!el) return;
    T.up = false; cancelAnimationFrame(raf); raf = 0; clearInterval(slow);
    removeEventListener('keydown', key); removeEventListener('resize', resize); document.removeEventListener('visibilitychange', vis);
    document.body.classList.remove('titleon');
    if (el) el.remove(); el = cv = cx = null; sky = front = mid = null;
  };
  T.stats = () => Object.assign({}, st, { flash, up: T.up, shown: !!el });

  // ---------------------------------------------------------------- rigs (the game's own zombie + her survivor, built sharp for this size)
  function rigs() {
    if (typeof ART === 'undefined' || !ART.buildRig) return;
    const res = Math.min(2.6, Math.max(1.4, dpr * .8));
    if (!ART.rigs.zombieT) ART.buildRig('zombie', res, null, 'zombieT').catch(() => { });
    const s = opt.survivor;
    if (s && s.look && !ART.rigs.survivorT) { try { ART.buildRig('survivor', res, ART.LOOK.recolor(s.look), 'survivorT', ART.LOOK.patch(s.look)).catch(() => { }); } catch (e) { /* old look */ } }
  }

  // ---------------------------------------------------------------- layout + the pre-drawn layers
  const Y = { street: .745, curb: .785 };
  function resize() {
    if (!el) return;
    const rc = el.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1); W = rc.width; H = rc.height;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    sky = layer(drawSky); front = layer(drawFront); mid = layer(() => { });
    cloudCv = [0, 1, 2, 3].map(i => cloud(i));
    if (st.reduced && el) frame(performance.now());
  }
  function layer(fn) { const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height; const x = c.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); fn(x); return c; }
  const rnd = (s => () => (s = (s * 16807) % 2147483647) / 2147483647);
  function drawSky(c) {
    const g = c.createLinearGradient(0, 0, 0, H * .7);
    g.addColorStop(0, '#0d0a24'); g.addColorStop(.45, '#24193f'); g.addColorStop(.85, '#47336b'); g.addColorStop(1, '#5a3f6e');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    const glow = c.createRadialGradient(W * .3, H * .6, 10, W * .3, H * .6, W * .9);   // the city's orange glow low in the sky
    glow.addColorStop(0, 'rgba(240,123,60,.22)'); glow.addColorStop(1, 'rgba(240,123,60,0)'); c.fillStyle = glow; c.fillRect(0, 0, W, H);
    const r = rnd(7); c.fillStyle = P.CRM;
    for (let i = 0; i < 46; i++) { const x = r() * W, y = r() * H * .45, s = r() < .15 ? 1.6 : .9; c.globalAlpha = .25 + r() * .5; c.fillRect(x, y, s, s); }
    c.globalAlpha = 1;
    // the moon: cream, ink outline, a few craters, a soft halo
    const mx = W * .8, my = H * .385, mr = Math.min(W, H) * .1;
    const halo = c.createRadialGradient(mx, my, mr * .8, mx, my, mr * 3.2); halo.addColorStop(0, 'rgba(246,227,187,.28)'); halo.addColorStop(1, 'rgba(246,227,187,0)');
    c.fillStyle = halo; c.fillRect(mx - mr * 4, my - mr * 4, mr * 8, mr * 8);
    c.beginPath(); c.arc(mx, my, mr, 0, 6.29); c.fillStyle = P.CRM; c.fill(); c.lineWidth = 3; c.strokeStyle = P.INK; c.stroke();
    c.save(); c.beginPath(); c.arc(mx, my, mr, 0, 6.29); c.clip(); c.fillStyle = '#e6cf9f'; c.beginPath(); c.arc(mx + mr * .45, my + mr * .2, mr * .9, 0, 6.29); c.fill(); c.restore();
    c.fillStyle = '#dcc290'; for (const [a, b, s] of [[-.35, -.3, .18], [.1, .35, .13], [.35, -.15, .1], [-.2, .3, .08]]) { c.beginPath(); c.arc(mx + a * mr, my + b * mr, s * mr, 0, 6.29); c.fill(); }
    // far off: the Manhattan skyline and the Brooklyn Bridge, flat dark lilac
    const hz = H * .6; c.fillStyle = '#2b2048';
    const sr = rnd(3); let x = -10;
    while (x < W + 10) { const w = 14 + sr() * 26, h = H * (.05 + sr() * .1) * (x > W * .45 && x < W * .7 ? 1.5 : 1); c.fillRect(x, hz - h, w, h + 4); if (sr() < .25) c.fillRect(x + w / 2 - 1, hz - h - 12, 2, 12); x += w - 2; }
    c.fillStyle = 'rgba(240,190,110,.45)'; const wr = rnd(9); for (let i = 0; i < 40; i++) c.fillRect(wr() * W, hz - wr() * H * .1, 1.5, 1.5);
    const bx = W * .06, bw = W * .5, by = hz - H * .015, th = H * .1;   // the bridge: two gothic towers, cables, the deck
    c.fillStyle = '#251b40'; c.strokeStyle = '#251b40';
    for (const tx of [bx + bw * .22, bx + bw * .78]) {
      c.fillRect(tx - 9, by - th, 18, th + 6); c.fillRect(tx - 11, by - th - 4, 22, 5);
      c.fillStyle = '#3a2b5e'; for (const ax of [tx - 5, tx + 2]) { c.beginPath(); c.moveTo(ax, by - th * .25); c.lineTo(ax, by - th * .72); c.quadraticCurveTo(ax + 1.5, by - th * .82, ax + 3, by - th * .72); c.lineTo(ax + 3, by - th * .25); c.fill(); } c.fillStyle = '#251b40';
    }
    c.fillRect(bx - 20, by, bw + 40, 4); c.lineWidth = 1;
    const t1 = bx + bw * .22, t2 = bx + bw * .78;
    for (const [a, b, sag] of [[bx - 20, t1, .4], [t1, t2, .55], [t2, bx + bw + 20, .4]]) for (let k = 0; k < 2; k++) { c.beginPath(); c.moveTo(a, a < t1 ? by : by - th + k * 3); c.quadraticCurveTo((a + b) / 2, by - th * (1 - sag) + th * .55, b, b > t2 ? by : by - th + k * 3); c.stroke(); }
  }
  function cloud(i) {
    const r = rnd(20 + i * 13), w = 150 + r() * 120, h = 46 + r() * 22, c = document.createElement('canvas');
    c.width = Math.ceil((w + 20) * dpr); c.height = Math.ceil((h + 20) * dpr); const x = c.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 10 * dpr, 10 * dpr);
    const puffs = []; for (let k = 0; k < 6; k++) { const px = w * (.1 + k * .16 + (r() - .5) * .05), rr = h * (.32 + r() * .2); puffs.push([px, h - rr, rr]); }
    puffs.push([w * .5, h * .78, h * .3]);
    const path = () => { x.beginPath(); for (const [a, b, rr] of puffs) { x.moveTo(a + rr, b); x.arc(a, b, rr, 0, 6.29); } x.rect(w * .08, h * .62, w * .84, h * .38); };
    path(); x.lineWidth = 6; x.strokeStyle = P.INK; x.lineJoin = 'round'; x.stroke();
    path(); x.fillStyle = i % 2 ? '#2f2452' : '#372a5c'; x.fill();
    x.fillStyle = 'rgba(246,227,187,.12)'; for (const [a, b, rr] of puffs.slice(0, 3)) { x.beginPath(); x.arc(a - rr * .2, b - rr * .25, rr * .55, 3.3, 5.2); x.lineTo(a - rr * .2, b - rr * .25); x.fill(); }
    return { c, w: w + 20, h: h + 20 };
  }
  function drawFront(c) {
    const ys = H * Y.street, yc = H * Y.curb, r = rnd(42);
    // brownstones: a wall-to-wall row with cornices, tall stoops, a few warm windows (and a boarded one)
    const cols = ['#3b2a5e', '#33264f', '#40305f', '#2f2349'];
    let x = -14, i = 0;
    while (x < W + 14) {
      const w = 92 + r() * 30, top = H * (.47 + r() * .06), col = cols[i % cols.length], stoopL = i % 2 === 0;
      c.fillStyle = col; c.fillRect(x, top, w, ys - top);
      c.lineWidth = 3; c.strokeStyle = P.INK; c.strokeRect(x, top, w, ys - top);
      // cornice + dentils
      c.fillStyle = P.WALL; c.fillRect(x - 4, top - 10, w + 8, 12); c.strokeRect(x - 4, top - 10, w + 8, 12);
      c.fillStyle = P.INK; for (let d = x + 2; d < x + w - 3; d += 8) c.fillRect(d, top + 2, 4, 4);
      // windows: 3 x 3, the door under one column
      const cw = w / 3, rows = 3, wy0 = top + 22, rh = (ys - top - 50) / rows;
      for (let rr = 0; rr < rows; rr++) for (let k = 0; k < 3; k++) {
        if (rr === rows - 1 && k === (stoopL ? 0 : 2)) continue;   // the door is here
        const wx = x + k * cw + cw * .24, wy = wy0 + rr * rh, ww = cw * .52, wh = rh * .66, v = r();
        c.fillStyle = v < .14 ? '#f3c472' : v < .2 ? P.ORA : '#1a1336';
        if (v < .2) { const g = c.createRadialGradient(wx + ww / 2, wy + wh / 2, 2, wx + ww / 2, wy + wh / 2, ww * 1.4); g.addColorStop(0, 'rgba(243,196,114,.35)'); g.addColorStop(1, 'rgba(243,196,114,0)'); const f0 = c.fillStyle; c.fillStyle = g; c.fillRect(wx - ww, wy - wh, ww * 3, wh * 3); c.fillStyle = f0; }
        c.beginPath(); c.moveTo(wx, wy + wh); c.lineTo(wx, wy + ww * .3); c.quadraticCurveTo(wx + ww / 2, wy - ww * .15, wx + ww, wy + ww * .3); c.lineTo(wx + ww, wy + wh); c.closePath(); c.fill();
        c.lineWidth = 2.5; c.stroke();
        if (v < .2) { c.strokeStyle = 'rgba(17,20,47,.7)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(wx + ww / 2, wy + 2); c.lineTo(wx + ww / 2, wy + wh); c.moveTo(wx, wy + wh * .55); c.lineTo(wx + ww, wy + wh * .55); c.stroke(); c.strokeStyle = P.INK; }
        else if (v > .93) { c.fillStyle = '#7a5a3c'; for (const a of [-.25, .2]) { c.save(); c.translate(wx + ww / 2, wy + wh * .55); c.rotate(a); c.fillRect(-ww * .7, -3, ww * 1.4, 6); c.lineWidth = 1.6; c.strokeRect(-ww * .7, -3, ww * 1.4, 6); c.restore(); } }
        c.fillStyle = P.WALL; c.fillRect(wx - 3, wy + wh, ww + 6, 4); c.lineWidth = 1.5; c.strokeRect(wx - 3, wy + wh, ww + 6, 4);
      }
      // door + stoop (steps down to the sidewalk, iron railing)
      const dk = stoopL ? 0 : 2, dx = x + dk * cw + cw * .18, dw = cw * .64, dTop = wy0 + (rows - 1) * rh - 4, dBot = ys - 26;
      c.fillStyle = '#5b3536'; c.beginPath(); c.moveTo(dx, dBot); c.lineTo(dx, dTop + dw * .4); c.quadraticCurveTo(dx + dw / 2, dTop - dw * .1, dx + dw, dTop + dw * .4); c.lineTo(dx + dw, dBot); c.closePath(); c.fill(); c.lineWidth = 2.5; c.stroke();
      c.fillStyle = '#f3c472'; c.fillRect(dx + dw * .7, dBot - (dBot - dTop) * .45, 3, 3);
      const sx = dx - 6, sw = dw + 12;
      for (let s = 0; s < 5; s++) { const sy = dBot + s * 5.4, ext = s * 6 * (stoopL ? 1 : -1); c.fillStyle = s % 2 ? '#4a3a6e' : '#55447a'; c.fillRect(sx + Math.min(0, ext), sy, sw + Math.abs(ext), 5.4); c.lineWidth = 1.6; c.strokeRect(sx + Math.min(0, ext), sy, sw + Math.abs(ext), 5.4); }
      c.strokeStyle = P.INK; c.lineWidth = 2.2; c.beginPath();
      const rx = stoopL ? sx + sw + 24 : sx - 24; c.moveTo(stoopL ? sx + sw : sx, dBot - 10); c.lineTo(rx, ys); c.moveTo(stoopL ? sx + sw : sx, dBot - 10); c.lineTo(stoopL ? sx + sw : sx, dBot + 2); c.stroke();
      x += w; i++;
    }
    // sidewalk, curb, street
    c.fillStyle = '#3a2f5c'; c.fillRect(0, ys, W, yc - ys);
    c.strokeStyle = 'rgba(17,20,47,.5)'; c.lineWidth = 1.5; c.beginPath(); for (let k = 0; k < W; k += 38) { c.moveTo(k, ys); c.lineTo(k - 10, yc); } c.stroke();
    c.fillStyle = '#55447a'; c.fillRect(0, yc - 4, W, 6); c.fillStyle = P.INK; c.fillRect(0, yc + 2, W, 3);
    const g = c.createLinearGradient(0, yc, 0, H); g.addColorStop(0, '#1f1a3c'); g.addColorStop(1, '#141128'); c.fillStyle = g; c.fillRect(0, yc + 5, W, H - yc);
    c.fillStyle = 'rgba(201,168,90,.35)'; for (let k = -10; k < W; k += 64) c.fillRect(k, H * .9, 34, 4);
    c.fillStyle = 'rgba(90,74,134,.25)'; for (let k = 0; k < 9; k++) { c.beginPath(); c.ellipse(r() * W, yc + 18 + r() * (H - yc - 30), 18 + r() * 26, 3 + r() * 3, 0, 0, 6.29); c.fill(); }   // puddles
    // a street lamp (its glow is animated in the frame) and a trash can
    const lx = W * .68;
    c.fillStyle = P.INK; c.fillRect(lx - 2.5, H * .5, 5, yc - H * .5); c.fillRect(lx - 7, yc - 6, 14, 6);
    c.beginPath(); c.moveTo(lx, H * .5); c.quadraticCurveTo(lx + 2, H * .48, lx + 18, H * .485); c.lineWidth = 4; c.strokeStyle = P.INK; c.stroke();
    c.fillStyle = '#f3c472'; c.beginPath(); c.moveTo(lx + 10, H * .49); c.lineTo(lx + 26, H * .49); c.lineTo(lx + 22, H * .5); c.lineTo(lx + 14, H * .5); c.closePath(); c.fill(); c.lineWidth = 2; c.stroke();
    const tx = W * .9; c.fillStyle = '#4a3c70'; c.beginPath(); c.moveTo(tx - 10, yc - 24); c.lineTo(tx + 10, yc - 24); c.lineTo(tx + 8, yc - 2); c.lineTo(tx - 8, yc - 2); c.closePath(); c.fill(); c.lineWidth = 2.4; c.strokeStyle = P.INK; c.stroke();
    c.fillStyle = '#5a4a86'; c.fillRect(tx - 12, yc - 28, 24, 5); c.strokeRect(tx - 12, yc - 28, 24, 5);
  }

  // ---------------------------------------------------------------- the walkers
  function seed() {
    zs = [];
    const mk = (near, i) => {
      const dir = Math.random() < .5 ? 1 : -1;
      return { near, dir, x: Math.random() * W, y: near ? H * (.825 + Math.random() * .05) : H * (Y.street + .012 + Math.random() * .025), sc: near ? .44 + Math.random() * .1 : .3 + Math.random() * .05, spd: (near ? 11 : 7) + Math.random() * 6, ph: Math.random() * 9, id: i };
    };
    for (let i = 0; i < 3; i++) zs.push(mk(false, i));
    for (let i = 0; i < 3; i++) zs.push(mk(true, i + 3));
    zs[3].x = W * .62; zs[3].dir = -1; zs[3].y = H * .87;   // one coming toward her
    clouds = [0, 1, 2, 3].map(i => ({ i, x: (i * .37 % 1) * W * 1.4 - W * .2, y: H * (.27 + (i % 3) * .07), v: 4 + i * 2.2 }));
  }
  function respawn(z) {
    z.dir = Math.random() < .5 ? 1 : -1; z.x = z.dir > 0 ? -50 : W + 50;
    z.y = z.near ? H * (.825 + Math.random() * .05) : H * (Y.street + .012 + Math.random() * .025);
    z.spd = (z.near ? 11 : 7) + Math.random() * 6;
  }
  function drawZ(c, z) {
    const rig = ART.rigs.zombieT ? 'zombieT' : ART.rigs.zombie ? 'zombie' : null;
    const s = Math.sin(z.ph * 2), tt = t + z.id * 10;
    if (!rig) { c.fillStyle = P.INK; c.beginPath(); c.ellipse(z.x, z.y - 40 * z.sc * 2, 14 * z.sc * 2, 40 * z.sc * 2, 0, 0, 6.29); c.fill(); return; }
    c.fillStyle = 'rgba(8,6,22,.42)'; c.beginPath(); c.ellipse(z.x, z.y + 1, 24 * z.sc, 6 * z.sc, 0, 0, 6.29); c.fill();
    ART.drawRig(c, rig, z.x, z.y - Math.abs(Math.cos(z.ph * 2)) * 3 * z.sc, z.sc, z.dir > 0, {
      rot: Math.sin(tt * 1.4 + z.ph) * .07 + z.dir * .05,
      parts: { legB: { r: s * .4 }, legF: { r: -s * .4 }, armF: { r: -.35 + Math.sin(tt * 3.1) * .12 }, armB: { r: -.3 + Math.sin(tt * 3.1 + 1.3) * .12 }, head: { r: Math.sin(tt * 1.7) * .12 } },
    });
  }
  function drawHer(c) {
    const s = opt.survivor; if (!s || !ART.rigs.survivorT) return;
    const x = W * .12, y = H * .875, sc = Math.min(.5, H / 1700);
    const beam = c.createLinearGradient(x, 0, x + W * .7, 0);   // her flashlight, toward the walkers
    beam.addColorStop(0, 'rgba(246,227,187,.22)'); beam.addColorStop(1, 'rgba(246,227,187,0)');
    c.fillStyle = beam; c.beginPath(); c.moveTo(x + 22 * sc * 2, y - 120 * sc); c.lineTo(x + W * .8, y - 260 * sc); c.lineTo(x + W * .8, y + 30 * sc); c.closePath(); c.fill();
    c.fillStyle = 'rgba(8,6,22,.45)'; c.beginPath(); c.ellipse(x, y + 1, 34 * sc, 8 * sc, 0, 0, 6.29); c.fill();
    const D = DM.D, wk = s.hands && D && D.ITEMS[s.hands.k] ? D.ITEMS[s.hands.k].w : 'fists';
    ART.drawRig(c, 'survivorT', x, y, sc, false, { sy: 1 + Math.sin(t * 2.4) * .014, rot: Math.sin(t * .9) * .015, parts: { arm: { r: Math.sin(t * 1.3) * .05 }, bat: { r: Math.sin(t * 1.3) * .05 } }, weapon: wk });
  }

  // ---------------------------------------------------------------- lightning
  T.strike = function (near) {
    near = near == null ? .3 + Math.random() * .5 : near;
    st.strikes++; flash = 1; boltT = .26; bolt = null;
    if (st.reduced) { flash = .5; boltT = 0; }
    setTimeout(() => { if (WX() && WX().thunder(near)) st.thunder++; }, 60 + (1 - near) * 500);
  };

  // ---------------------------------------------------------------- frame
  function loop() { raf = requestAnimationFrame(ts => { if (!el) return; frame(ts); if (!st.reduced) loop(); }); }
  function frame(ts) {
    const dtr = Math.min(.1, (ts - last) / 1000 || .033);
    acc += dtr; last = ts;
    if (acc < .03 && !st.reduced) return;   // ~30 fps is plenty
    const dt = Math.min(.1, acc); acc = 0;
    if (!cx || !sky) return;
    st.frames++;
    const w = WX() ? WX().now() : { type: 'clear' }; st.weather = w.type;
    const move = st.reduced ? 0 : 1;
    t += dt * move;
    // lightning timing: storms more often
    nextFlash -= dt * move;
    if (nextFlash <= 0 && !starting) { T.strike(); nextFlash = (w.type === 'storm' ? 3.5 : 6.5) + Math.random() * (w.type === 'storm' ? 5 : 8); }
    if (flash > 0 && !T.hold) flash = Math.max(0, flash - dt * 1.7);   // T.hold: screenshots of the strike
    if (boltT > 0 && !T.hold) boltT -= dt;
    const c = cx; c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.drawImage(sky, 0, 0, W, H);
    // clouds drift across the moon
    for (const k of clouds) { k.x += k.v * dt * move; const cc = cloudCv[k.i]; if (k.x > W + 20) k.x = -cc.w - 20; c.drawImage(cc.c, k.x, k.y, cc.w, cc.h); }
    // the sky lights up behind the buildings; the bolt hangs there for a moment
    const f = flash > .8 ? 1 : flash > .66 ? .3 : flash;   // a double flicker
    if (f > 0) {
      c.fillStyle = `rgba(200,186,255,${(st.reduced ? .25 : .75) * f})`; c.fillRect(0, 0, W, H * Y.curb);
      if (boltT > 0 && !st.reduced) { if (!bolt) bolt = WX() ? WX().bolt(W * (.1 + Math.random() * .8), H * (.22 + Math.random() * .08), H * (.5 - .22) + 10) : null; if (bolt) WX().drawBolt(c, bolt, 3.2, Math.min(1, boltT / .12)); }
    }
    c.drawImage(front, 0, 0, W, H);
    // the lamp's warm pool (a slow flicker)
    const lx = W * .68 + 18, ly = H * .5, fl = st.reduced ? 1 : .85 + .15 * Math.sin(t * 13) * Math.sin(t * 2.3);
    const lr = H * .27, lg = c.createRadialGradient(lx, ly + 4, 4, lx, ly + 4, lr); lg.addColorStop(0, `rgba(243,196,114,${.24 * fl})`); lg.addColorStop(1, 'rgba(243,196,114,0)');
    c.fillStyle = lg; c.fillRect(lx - lr, ly + 4 - lr, lr * 2, lr * 2);
    // sidewalk walkers, tinted back a little (depth), then the street walkers and her
    const m = mid.getContext('2d'); m.setTransform(1, 0, 0, 1, 0, 0); m.clearRect(0, 0, mid.width, mid.height); m.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (const z of zs) { z.x += z.dir * z.spd * dt * move; z.ph += z.spd * dt * .09 * move; if (z.x < -70 || z.x > W + 70) respawn(z); }
    for (const z of zs.filter(z => !z.near).sort((a, b) => a.y - b.y)) drawZ(m, z);
    m.setTransform(1, 0, 0, 1, 0, 0); m.globalCompositeOperation = 'source-atop'; m.fillStyle = `rgba(42,31,74,${.42 - .3 * f})`; m.fillRect(0, 0, mid.width, mid.height); m.globalCompositeOperation = 'source-over';
    c.drawImage(mid, 0, 0, W, H);
    const fronts = zs.filter(z => z.near).map(z => ({ y: z.y, z }));
    fronts.push({ y: H * .875, her: 1 });
    fronts.sort((a, b) => a.y - b.y);
    for (const o of fronts) if (o.her) drawHer(c); else drawZ(c, o.z);
    weather(c, w, dt * move);
    // the whole street lit for a frame or two
    if (f > 0) { c.fillStyle = `rgba(236,232,255,${(st.reduced ? .06 : .3) * f})`; c.fillRect(0, 0, W, H); }
    el && el.classList.toggle('lit', f > .6 && !st.reduced);
    // vignette
    const v = c.createRadialGradient(W / 2, H * .55, H * .25, W / 2, H * .55, H * .75); v.addColorStop(0, 'rgba(8,6,22,0)'); v.addColorStop(1, 'rgba(8,6,22,.6)');
    c.fillStyle = v; c.fillRect(0, 0, W, H);
  }
  let rt = 0;
  function weather(c, w, dt) {
    rt += dt;
    const type = w.type;
    if (type === 'snow') {
      c.fillStyle = 'rgba(246,240,255,.85)';
      for (let i = 0; i < 70; i++) { const sp = 22 + (i * 37 % 23), x = ((i * 97.3 + Math.sin(rt * .6 + i) * 18) % W + W) % W, y = ((i * 61.7 + rt * sp) % H + H) % H; c.beginPath(); c.arc(x, y, 1.2 + (i % 3) * .8, 0, 6.29); c.fill(); }
      return;
    }
    if (type === 'fog') {
      const g = c.createLinearGradient(0, H * .45, 0, H); g.addColorStop(0, 'rgba(150,140,190,0)'); g.addColorStop(.5, 'rgba(150,140,190,.28)'); g.addColorStop(1, 'rgba(150,140,190,.12)');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      c.fillStyle = 'rgba(200,190,230,.07)'; for (let i = 0; i < 4; i++) { const x = ((rt * (8 + i * 3) + i * W * .4) % (W * 1.6)) - W * .3; c.beginPath(); c.ellipse(x, H * (.62 + i * .08), W * .5, 26, 0, 0, 6.29); c.fill(); }
    }
    // rain: a drizzle on a dry night (it is a horror title), more when it really rains, a downpour in a storm
    const amt = type === 'storm' ? 1 : type === 'rain' ? .75 : type === 'fog' ? .2 : .35;
    const n = Math.round(150 * amt), len = 14 + 12 * amt;
    c.strokeStyle = `rgba(196,204,255,${.28 + .25 * amt})`; c.lineWidth = 1.2; c.beginPath();
    for (let i = 0; i < n; i++) {
      const s = 520 + (i * 53 % 260), x = ((i * 97.13 + i * i * .37 + rt * s * .22) % (W + 40) + W + 40) % (W + 40) - 20, y = ((i * 61.7 + i * i * .91 + rt * s) % (H + 40) + H + 40) % (H + 40) - 20;
      c.moveTo(x, y); c.lineTo(x - len * .22, y - len);
    }
    c.stroke();
    if (amt >= .75) { c.strokeStyle = 'rgba(200,210,255,.4)'; c.lineWidth = 1; for (let i = 0; i < 14; i++) { const ph = (rt * 2.2 + i * .31) % 1, x = (i * 131.7) % W, y = H * Y.curb + 14 + (i * 83.3) % (H * (1 - Y.curb) - 20); c.globalAlpha = 1 - ph; c.beginPath(); c.ellipse(x, y, 2 + ph * 9, 1 + ph * 2.5, 0, 0, 6.29); c.stroke(); } c.globalAlpha = 1; }
  }
})();
