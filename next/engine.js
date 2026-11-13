/* Dead Miles (next) - engine: canvas + DPR, frame loop, input (joystick, keys, buttons), audio, helpers.
   Scenes (the house runtime) plug in through DM.scene = { update(dt), render(), hud(), key(e), tap(x,y), resized() }. */
'use strict';
window.DM = window.DM || {};
(() => {
  const E = DM.E = {};
  E.T = 44; E.WH = 60; E.WT = 16; E.PSCALE = 0.37; E.ZSCALE = 0.40;
  const $ = E.$ = s => document.querySelector(s);
  const DEV = E.DEV = { dpr: 1, zoom: 1, W: 0, H: 0, fs: 1 };
  E.cv = $('#cv'); E.ctx = E.cv.getContext('2d');

  // ---------------------------------------------------------------- helpers
  E.clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  E.lerp = (a, b, t) => a + (b - a) * t;
  E.angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
  E.rectDist = (px, py, r) => { const dx = Math.max(r.x - px, 0, px - (r.x + r.w)), dy = Math.max(r.y - py, 0, py - (r.y + r.h)); return Math.hypot(dx, dy); };
  let toastT = 0;
  E.toast = (msg, dur = 2.2) => { const el = $('#toast'); el.textContent = msg; el.classList.add('on'); toastT = dur; };
  E.buzz = ms => { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* not supported */ } };

  // ---------------------------------------------------------------- audio
  const SFX = E.SFX = {
    ac: null, master: null, nb: null,
    init() {
      if (this.ac) { if (this.ac.state === 'suspended') this.ac.resume(); return; }
      try {
        const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
        this.ac = new AC(); this.master = this.ac.createGain(); this.master.gain.value = .5; this.master.connect(this.ac.destination);
        const n = this.ac.sampleRate; this.nb = this.ac.createBuffer(1, n, n); const d = this.nb.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      } catch (e) { this.ac = null; }
    },
    noise(dur, type, f0, f1, g, q = 1, when = 0) {
      const a = this.ac; if (!a) return; const t = a.currentTime + when;
      const s = a.createBufferSource(); s.buffer = this.nb; s.playbackRate.value = .8 + Math.random() * .4;
      const fl = a.createBiquadFilter(); fl.type = type; fl.Q.value = q; fl.frequency.setValueAtTime(f0, t); fl.frequency.exponentialRampToValueAtTime(f1, t + dur);
      const gn = a.createGain(); gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(g, t + Math.min(.02, dur / 4)); gn.gain.exponentialRampToValueAtTime(.0005, t + dur);
      s.connect(fl); fl.connect(gn); gn.connect(this.master); s.start(t, Math.random() * .5); s.stop(t + dur + .05);
    },
    tone(type, f0, f1, dur, g, when = 0) {
      const a = this.ac; if (!a) return; const t = a.currentTime + when;
      const o = a.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      const gn = a.createGain(); gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(g, t + .015); gn.gain.exponentialRampToValueAtTime(.0005, t + dur);
      o.connect(gn); gn.connect(this.master); o.start(t); o.stop(t + dur + .05);
    },
    play(k) {
      if (!this.ac) return;
      switch (k) {
        case 'step': this.noise(.06, 'lowpass', 700, 300, .07, 1); break;
        case 'run': this.noise(.07, 'lowpass', 1000, 350, .1, 1); break;
        case 'rummage': this.noise(.09, 'bandpass', 1800 + Math.random() * 1500, 900, .05, 2); break;
        case 'swing': this.noise(.2, 'bandpass', 500, 2600, .12, 1.5); break;
        case 'bow': this.tone('triangle', 180, 90, .12, .08); this.noise(.12, 'highpass', 1500, 4000, .06, .8); break;
        case 'thunk': this.noise(.08, 'lowpass', 900, 200, .12, 1); break;
        case 'hit': this.tone('sine', 140, 45, .16, .35); this.noise(.12, 'lowpass', 1600, 300, .18, 1); break;
        case 'kill': this.tone('sine', 90, 30, .4, .3); this.noise(.3, 'lowpass', 800, 120, .15, 1); break;
        case 'hurt': this.tone('square', 320, 110, .22, .05); this.noise(.15, 'lowpass', 1200, 200, .2, 1); break;
        case 'pick': this.tone('sine', 620, 980, .09, .06); break;
        case 'break': this.noise(.3, 'bandpass', 2400, 600, .2, 2); this.tone('square', 600, 120, .2, .05); break;
        case 'open': this.noise(.25, 'lowpass', 500, 150, .12, 2); this.tone('sine', 90, 60, .2, .08); break;
        case 'scrape': for (let i = 0; i < 6; i++) this.noise(.22, 'bandpass', 260 + Math.random() * 120, 180, .14, 4, i * .17); break;
        case 'whoosh': this.noise(.25, 'highpass', 400, 2000, .07, .7); break;
        case 'groan': {
          const a = this.ac, t = a.currentTime, o = a.createOscillator(), l = a.createOscillator(), lg = a.createGain(), f = a.createBiquadFilter(), g = a.createGain();
          o.type = 'sawtooth'; const base = 70 + Math.random() * 30; o.frequency.setValueAtTime(base, t); o.frequency.linearRampToValueAtTime(base * .75, t + .9);
          l.frequency.value = 6; lg.gain.value = 6; l.connect(lg); lg.connect(o.frequency);
          f.type = 'lowpass'; f.frequency.value = 420; f.Q.value = 6;
          g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.09, t + .15); g.gain.exponentialRampToValueAtTime(.0005, t + 1);
          o.connect(f); f.connect(g); g.connect(this.master); o.start(t); l.start(t); o.stop(t + 1.05); l.stop(t + 1.05); break;
        }
        case 'alert': this.tone('triangle', 520, 300, .18, .06); break;
        case 'gobble': for (let i = 0; i < 5; i++) this.tone('sawtooth', 420 - i * 30 + Math.random() * 60, 260, .07, .035, i * .065); break;
        case 'ui': this.tone('sine', 520, 700, .06, .05); break;
        case 'creak': this.tone('sawtooth', 190, 120, .5, .022); this.tone('triangle', 260, 330, .3, .02, .18); this.noise(.4, 'bandpass', 700, 400, .05, 6); break;
        case 'unlock': this.noise(.05, 'highpass', 3000, 2500, .14, 1); this.noise(.05, 'highpass', 2600, 2200, .12, 1, .13); this.tone('sine', 880, 1320, .1, .07, .2); this.tone('sine', 1320, 1760, .16, .06, .3); break;
      }
    },
  };

  // ---------------------------------------------------------------- input
  const keys = E.keys = new Set();
  const joy = E.joy = { id: null, ox: 0, oy: 0, x: 0, y: 0, active: false };
  const btn = E.btn = { atk: false, atkPressed: false, use: false, dodge: false };
  E.MOVEKEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
  addEventListener('keydown', e => {
    SFX.init();
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if (e.repeat && !E.MOVEKEYS.includes(e.code) && e.code !== 'ShiftLeft') return;
    keys.add(e.code);
    if (DM.scene && DM.scene.key) DM.scene.key(e);
  });
  addEventListener('keyup', e => keys.delete(e.code));
  addEventListener('blur', () => keys.clear());

  const touch = $('#touch'), joyEl = $('#joy'), knob = $('#joy .knob');
  const JR = 52;
  const taps = new Map();
  touch.addEventListener('pointerdown', e => {
    SFX.init();
    if (!DM.scene || (DM.scene.blocked && DM.scene.blocked())) return;
    taps.set(e.pointerId, { x: e.clientX, y: e.clientY, t: performance.now() });
    const rc = touch.getBoundingClientRect();
    if (e.clientX - rc.left > rc.width * .55 || joy.id !== null) { e.preventDefault(); return; }
    joy.id = e.pointerId; joy.ox = e.clientX; joy.oy = e.clientY; joy.x = 0; joy.y = 0; joy.active = true;
    touch.setPointerCapture(e.pointerId);
    joyEl.style.left = (e.clientX - rc.left) + 'px'; joyEl.style.top = (e.clientY - rc.top) + 'px';
    joyEl.classList.add('on'); knob.style.transform = 'translate(-50%,-50%)';
    $('#joyhint').classList.add('gone');
    e.preventDefault();
  });
  touch.addEventListener('pointermove', e => {
    if (e.pointerId !== joy.id) return;
    let dx = e.clientX - joy.ox, dy = e.clientY - joy.oy; const d = Math.hypot(dx, dy);
    if (d > JR * 1.35) { // floating base follows the finger
      const k = (d - JR * 1.35) / d; joy.ox += dx * k; joy.oy += dy * k; dx = e.clientX - joy.ox; dy = e.clientY - joy.oy;
      const rc = touch.getBoundingClientRect(); joyEl.style.left = (joy.ox - rc.left) + 'px'; joyEl.style.top = (joy.oy - rc.top) + 'px';
    }
    const dd = Math.hypot(dx, dy), m = Math.min(1, dd / JR);
    joy.x = dd ? dx / dd * m : 0; joy.y = dd ? dy / dd * m : 0;
    knob.style.transform = `translate(calc(-50% + ${joy.x * JR}px), calc(-50% + ${joy.y * JR}px))`;
    joyEl.classList.toggle('run', m > .86);
  });
  touch.addEventListener('pointerup', e => {
    const tp = taps.get(e.pointerId); taps.delete(e.pointerId);
    if (tp && performance.now() - tp.t < 300 && Math.hypot(e.clientX - tp.x, e.clientY - tp.y) < 14 && DM.scene && DM.scene.tap) DM.scene.tap(e.clientX, e.clientY);
  });
  touch.addEventListener('pointercancel', e => taps.delete(e.pointerId));
  const endJoy = e => { if (e.pointerId !== joy.id) return; E.resetJoy(); };
  E.resetJoy = () => { joy.id = null; joy.active = false; joy.x = joy.y = 0; joyEl.classList.remove('on', 'run'); };
  touch.addEventListener('pointerup', endJoy); touch.addEventListener('pointercancel', endJoy);

  E.bindBtn = function (el, down, up) {
    el.addEventListener('pointerdown', e => { SFX.init(); e.preventDefault(); e.stopPropagation(); el.classList.add('down'); down && down(); });
    const u = () => { el.classList.remove('down'); up && up(); };
    el.addEventListener('pointerup', u); el.addEventListener('pointercancel', u); el.addEventListener('pointerleave', u);
  };
  E.bindBtn($('#bAtk'), () => { btn.atk = true; btn.atkPressed = true; }, () => { btn.atk = false; });
  E.bindBtn($('#bUse'), () => { btn.use = true; });
  E.bindBtn($('#bDodge'), () => { btn.dodge = true; });
  document.addEventListener('contextmenu', e => e.preventDefault());
  $('#app').addEventListener('scroll', e => { e.target.scrollTop = 0; e.target.scrollLeft = 0; });

  E.moveInput = function () {
    let x = 0, y = 0;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
    if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
    if (x || y) { const d = Math.hypot(x, y); return { x: x / d, y: y / d, m: 1, run: keys.has('ShiftLeft') || keys.has('ShiftRight') }; }
    if (joy.active) { const m = Math.hypot(joy.x, joy.y); if (m < .14) return { x: 0, y: 0, m: 0, run: false }; return { x: joy.x / m, y: joy.y / m, m: Math.min(1, (m - .14) / .7), run: m > .86 }; }
    return { x: 0, y: 0, m: 0, run: false };
  };

  // ---------------------------------------------------------------- loop + resize
  E.resize = function () {
    const app = $('#app'), rc = app.getBoundingClientRect();
    DEV.dpr = Math.min(3, window.devicePixelRatio || 1);
    DEV.W = rc.width; DEV.H = rc.height;
    DEV.zoom = E.clamp(Math.min(rc.width / 396, rc.height / 760), .8, 2.2);
    E.cv.width = Math.round(rc.width * DEV.dpr); E.cv.height = Math.round(rc.height * DEV.dpr);
    E.cv.style.width = rc.width + 'px'; E.cv.style.height = rc.height + 'px';
    const fs = Math.min(2, DEV.dpr * DEV.zoom);
    const changed = Math.abs(fs - DEV.fs) > .01; DEV.fs = fs;
    if (changed && DM.scene && DM.scene.resized) DM.scene.resized();
  };
  let last = 0, fpsAcc = 0, fpsN = 0;
  DM.fps = 0; DM.ms = 0;
  function frame(ts) {
    const dt = Math.min(.05, (ts - last) / 1000 || .016); last = ts;
    fpsAcc += dt; fpsN++; if (fpsAcc > 1) { DM.fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; }
    if (toastT > 0) { toastT -= dt; if (toastT <= 0) $('#toast').classList.remove('on'); }
    const t0 = performance.now();
    if (DM.scene) { DM.scene.update(dt); DM.scene.render(); if (DM.scene.hud) DM.scene.hud(); }
    DM.ms = DM.ms * .95 + (performance.now() - t0) * .05;
    requestAnimationFrame(frame);
  }
  E.vignette = null;
  E.start = async function () {
    E.resize();
    ART.buildIcons();
    E.rigRes = Math.min(2.4, Math.max(1, DEV.dpr * DEV.zoom * E.ZSCALE * 1.35));
    await ART.buildRig('zombie', E.rigRes);
    const v = E.vignette = document.createElement('canvas'); v.width = 256; v.height = 256;
    const c = v.getContext('2d'), g = c.createRadialGradient(128, 128, 60, 128, 128, 182);
    g.addColorStop(0, 'rgba(8,6,22,0)'); g.addColorStop(1, 'rgba(8,6,22,.75)'); c.fillStyle = g; c.fillRect(0, 0, 256, 256);
    addEventListener('resize', E.resize);
    requestAnimationFrame(t => { last = t; frame(t); });
  };
  // survivor sprite in her chosen hood colour
  E.buildSurvivor = async function (look, as) {
    await ART.buildRig('survivor', E.rigRes || 1.4, ART.LOOK.recolor(look), as, ART.LOOK.patch(look));
  };
})();
