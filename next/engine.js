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
      // 0.72.1: iOS leaves the context 'interrupted' (not 'suspended') after a call, CarPlay / Bluetooth or another app took the audio - resume from any not-running state
      if (this.ac) { if (this.ac.state !== 'running' && this.ac.state !== 'closed') { try { this.ac.resume(); } catch (e) { /* needs a gesture */ } } return; }
      try {
        const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
        this.ac = new AC(); this.master = this.ac.createGain(); this.master.gain.value = .5; this.master.connect(this.ac.destination);
        const n = this.ac.sampleRate; this.nb = this.ac.createBuffer(1, n, n); const d = this.nb.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      } catch (e) { this.ac = null; }
      this.loadZ();
    },
    // 0.24.2 (owner: "that does not sound like zombies" -> picked prototype #5, the snarl): plain zombies now use a small
    // bank of pre-rendered growls in that style (mockups/groans/bank.py), one mono sprite next/sfx/zombie.mp3 (~127 KB):
    // 4 snarls (a zombie that spots you) + 6 longer groans. [kind, start s, length s]. The synth voices stay as the fallback
    // until the file is in, and for the runner's pant, the bloater's gurgle, the screamer's wail and the turkey.
    ZB: null, zLoading: false, zTries: 0,
    ZCLIPS: [['snarl', .25, 1.05], ['snarl', 1.55, .95], ['snarl', 2.75, 1.15], ['snarl', 4.15, .85], ['groan', 5.25, 1.55], ['groan', 7.05, 1.75], ['groan', 9.05, 1.35], ['groan', 10.65, 1.65], ['groan', 12.55, 1.25], ['groan', 14.05, 1.45]],
    loadZ() {
      if (this.ZB || this.zLoading || !this.ac || this.zTries >= 3 || typeof fetch !== 'function') return;
      this.zLoading = true; this.zTries++;
      const v = typeof NEXT_VERSION !== 'undefined' ? NEXT_VERSION : '1';
      fetch('sfx/zombie.mp3?v=' + v).then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
        .then(b => new Promise((res, rej) => { const p = this.ac.decodeAudioData(b, res, rej); if (p && p.then) p.then(res, rej); }))
        .then(buf => { this.ZB = buf; }).catch(() => { /* synth voices carry on */ }).then(() => { this.zLoading = false; });
    },
    zclip(t, out, kind, v, r) {
      const L = this.ZCLIPS.filter(c => c[0] === kind), c = L[v % L.length], a = this.ac;
      const s = a.createBufferSource(), g = a.createGain(); s.buffer = this.ZB; s.playbackRate.value = r; g.gain.value = kind === 'snarl' ? 1.25 : 1.05;
      s.connect(g); g.connect(out); const off = Math.max(0, c[1] - .02), d = c[2] + .04; s.start(t, off, d);
      return t + d / r;
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
    // ---- 0.20 zombie voices, positional. o = { kind, v (variant 0-3), snarl, gain 0..1 (distance), pan -1..1, rate (pitch),
    // muffle (a wall in between), force (skip the limits), when (seconds from now) }. A formant-ish voice: a sawtooth throat
    // (+ breath noise, + a square for grit) with a pitch glide and a wobble, through three vowel band-passes gliding from one
    // vowel to another. Four groans (moan, groan, gargle, sigh) and a snarl for when one starts chasing; the runner pants,
    // the bloater gurgles, the screamer wails, the turkey gobbles. At most 2 at once and one start per .45 s (a snarl skips
    // the spacing, not the cap). gLog keeps the last 60 (tests). Through master, so the sound-effects volume applies.
    gAct: [], gLast: -9, gLog: [],
    VOW: { u: [330, 750, 2300], o: [450, 850, 2400], a: [720, 1150, 2500], uh: [550, 1050, 2400], ee: [300, 2200, 2900], ae: [650, 1700, 2400] },
    vox(t, out, s) {
      const a = this.ac, d = s.dur, end = t + d, nodes = [];
      const env = a.createGain(); env.connect(out);
      env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(s.peak, t + s.atk);
      env.gain.linearRampToValueAtTime(s.peak * .7, t + Math.max(s.atk + .01, d * .55)); env.gain.exponentialRampToValueAtTime(.0008, end);
      const src = a.createGain();
      const curve = p => s.f.forEach(([x, f], i) => i ? p.linearRampToValueAtTime(f, t + x * d) : p.setValueAtTime(f, t));
      const o = a.createOscillator(); o.type = 'sawtooth'; curve(o.frequency); const og = a.createGain(); og.gain.value = s.saw == null ? 1 : s.saw; o.connect(og); og.connect(src); nodes.push(o);
      const f0 = s.f[0][1];
      const l1 = a.createOscillator(), g1 = a.createGain(); l1.frequency.value = s.vib || 5.5; g1.gain.value = f0 * .035; l1.connect(g1); g1.connect(o.frequency); nodes.push(l1);
      const l2 = a.createOscillator(), g2 = a.createGain(); l2.type = 'triangle'; l2.frequency.value = 1.4 + Math.random() * 1.2; g2.gain.value = f0 * .06; l2.connect(g2); g2.connect(o.frequency); nodes.push(l2);
      if (s.grit) { const q = a.createOscillator(), qg = a.createGain(); q.type = 'square'; curve(q.frequency); q.detune.value = 18; qg.gain.value = s.grit * .5; q.connect(qg); qg.connect(src); nodes.push(q); }
      if (s.breath) { const n = a.createBufferSource(), ng = a.createGain(); n.buffer = this.nb; n.loop = true; n.playbackRate.value = .7 + Math.random() * .3; ng.gain.value = s.breath; n.connect(ng); ng.connect(src); nodes.push(n); }
      let into = src;
      if (s.trem) { const tg = a.createGain(), tl = a.createOscillator(), tlg = a.createGain(); tg.gain.value = 1 - s.trem[1] / 2; tl.frequency.value = s.trem[0]; tlg.gain.value = s.trem[1] / 2; tl.connect(tlg); tlg.connect(tg.gain); src.connect(tg); into = tg; nodes.push(tl); }
      const fs = s.fs || 1, A = s.A, B = s.B || s.A;
      [[7, 1], [9, .55], [11, .22]].forEach(([q, g], i) => {
        const bp = a.createBiquadFilter(), bg = a.createGain(); bp.type = 'bandpass'; bp.Q.value = q;
        bp.frequency.setValueAtTime(A[i] * fs, t); bp.frequency.linearRampToValueAtTime(B[i] * fs, end); bg.gain.value = g * 2.2;
        into.connect(bp); bp.connect(bg); bg.connect(env);
      });
      const body = a.createBiquadFilter(), bdg = a.createGain(); body.type = 'lowpass'; body.frequency.value = 260; bdg.gain.value = .22; into.connect(body); body.connect(bdg); bdg.connect(env);
      for (const n of nodes) { n.start(t); n.stop(end + .05); }
      return end;
    },
    groan(o = {}) {
      const a = this.ac; if (!a || !this.master) return false;
      if ((this.sfxVol != null ? this.sfxVol : this.master.gain.value) < .01) return false;   // sound effects turned all the way down (music.js sets sfxVol)
      const now = a.currentTime, t = now + (o.when || 0);
      this.gAct = this.gAct.filter(e => e > now);
      if (!o.force) { if (this.gAct.length >= 2) return false; if (!o.snarl && now - this.gLast < .45) return false; }
      const gain = o.gain == null ? 1 : Math.max(0, Math.min(1, o.gain)), pan = Math.max(-1, Math.min(1, o.pan || 0)), k = o.kind || '';
      this.loadZ();
      let r = o.rate || (.88 + Math.random() * .24);
      if (k === 'armored') r *= .82; else if (k === 'krampus') r *= .62; else if (o.boss) r *= .75;
      const v = o.v != null ? o.v % 4 : Math.floor(Math.random() * 4), V = this.VOW, fs = Math.sqrt(r);
      const lvl = a.createGain(); lvl.gain.value = gain; lvl.connect(this.master);
      let out = lvl;
      if (a.createStereoPanner) { const p = a.createStereoPanner(); p.pan.value = pan; p.connect(out); out = p; }
      if (o.muffle) { const m = a.createBiquadFilter(); m.type = 'lowpass'; m.frequency.value = 650; m.connect(out); out = m; }
      let end = t;
      if (k === 'turkey') {   // the gobble, placed like the rest
        for (let i = 0; i < 5; i++) {
          const tt = t + i * .065, os = a.createOscillator(), g = a.createGain(); os.type = 'sawtooth';
          os.frequency.setValueAtTime(420 - i * 30 + Math.random() * 60, tt); os.frequency.exponentialRampToValueAtTime(260, tt + .07);
          g.gain.setValueAtTime(0, tt); g.gain.linearRampToValueAtTime(.06, tt + .015); g.gain.exponentialRampToValueAtTime(.0005, tt + .07);
          os.connect(g); g.connect(out); os.start(tt); os.stop(tt + .1);
        }
        end = t + .45;
      } else if (k === 'runner' && !o.snarl) {   // a raspy pant: four quick breaths, in and out
        for (let i = 0; i < 4; i++) end = this.vox(t + i * .27, out, { dur: .2, f: [[0, 175 * r], [1, 150 * r]], A: i % 2 ? V.ae : V.a, B: V.uh, fs, breath: 1.3, saw: .35, peak: .55, atk: .04, vib: 9 });
      } else if (o.snarl && this.ZB && k !== 'runner' && k !== 'bloater' && k !== 'screamer') {
        end = this.zclip(t, out, 'snarl', Math.floor(Math.random() * 4), Math.min(1.12, Math.max(.6, r)));
      } else if (o.snarl) {
        const S = k === 'runner' ? { dur: .55, f: [[0, 210 * r], [.3, 270 * r], [1, 150 * r]], trem: [28, .5] }
          : k === 'bloater' ? { dur: .9, f: [[0, 95 * r], [.3, 120 * r], [1, 70 * r]], trem: [13, .8] }
            : k === 'screamer' ? { dur: .7, f: [[0, 260 * r], [.3, 330 * r], [1, 200 * r]], trem: [22, .4] }
              : { dur: .75, f: [[0, 150 * r], [.3, 200 * r], [1, 115 * r]], trem: [24, .5] };
        end = this.vox(t, out, Object.assign({ A: V.a, B: V.uh, fs, breath: .6, grit: .8, peak: 1.25, atk: .03 }, S));
      } else if (k === 'bloater') {   // a wet gurgle
        end = this.vox(t, out, { dur: 1.4, f: [[0, 64 * r], [.5, 72 * r], [1, 52 * r]], A: V.uh, B: V.o, fs, breath: .5, grit: .7, trem: [11 + Math.random() * 3, .85], peak: .9, atk: .12 });
      } else if (k === 'screamer') {   // a thin wail (its shriek is separate)
        end = this.vox(t, out, { dur: 1.2, f: [[0, 230 * r], [.4, 262 * r], [1, 170 * r]], A: V.ee, B: V.ae, fs, breath: .35, peak: .6, atk: .15, vib: 6.5 });
      } else if (this.ZB) {
        end = this.zclip(t, out, 'groan', (o.v != null ? o.v : 0) + Math.floor(Math.random() * 6), Math.min(1.1, Math.max(.6, .5 + r * .5)) * (k === 'armored' || o.boss ? .9 : 1));
      } else {
        const G = [
          { dur: 1.5, f: [[0, 90 * r], [.5, 78 * r], [1, 62 * r]], A: V.o, B: V.u, breath: .25, atk: .25 },                 // moan
          { dur: 1.0, f: [[0, 105 * r], [.3, 122 * r], [1, 76 * r]], A: V.a, B: V.o, breath: .3, atk: .12 },                // groan
          { dur: 1.2, f: [[0, 82 * r], [.6, 74 * r], [1, 64 * r]], A: V.uh, B: V.o, breath: .4, trem: [9, .6], atk: .15 },  // gargle
          { dur: 1.1, f: [[0, 72 * r], [1, 55 * r]], A: V.a, B: V.uh, breath: 1.1, saw: .5, atk: .2 },                      // sigh
        ][v];
        end = this.vox(t, out, Object.assign({ fs, peak: 1, grit: k === 'armored' ? .4 : 0 }, G));
      }
      if (!o.keep) setTimeout(() => { try { lvl.disconnect(); } catch (e) { /* ignore */ } }, (end - now + .3) * 1000);
      this.gAct.push(end); this.gLast = now;
      this.gLog.push({ k: k || 'zombie', v, snarl: !!o.snarl, gain: +gain.toFixed(3), pan: +pan.toFixed(2), rate: +r.toFixed(2), muffle: !!o.muffle, t: +now.toFixed(2), dur: +(end - t).toFixed(2) });
      if (this.gLog.length > 60) this.gLog.shift();
      return true;
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
        case 'groan': this.groan({ force: 1, gain: .8 }); break;   // 0.20: not positional (a boss, the horde arriving); zombies in a run call groan() with a place
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
