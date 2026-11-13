/* Dead Miles (next) - music (phase 5a): the generated "Eerie" track that speeds up with danger.
   Ported from the old game (s2.js MUSIC_TRACKS.eerie / musicEerieStep / musicTension): a low detuned drone,
   sparse phrygian music-box bells, a heartbeat that starts inside houses, tremolo strings and up to ~1.9x
   tempo in fights, a stab per bar for bosses. Tension eases back slowly. Everything is generated live with
   WebAudio, so the music is ours outright.
   Timing: a light setInterval (every 100 ms) schedules notes ~0.35 s ahead on the AUDIO clock, so nothing
   here runs inside the game's animation frame and a slow frame never makes the music stutter.
   Shares the engine's AudioContext (DM.E.SFX.ac), which only starts on a user gesture (iOS needs that).
   Settings live on this device only (localStorage 'dm-next-audio'), never in the synced save. */
'use strict';
window.DM = window.DM || {};
(() => {
  const E = DM.E, SFX = E.SFX, KEY = 'dm-next-audio';
  const M = DM.Music = { T: 0, want: 0, on: false };
  // ---------------------------------------------------------------- settings
  const DEF = { music: 1, mvol: .7, sfx: .8 };
  let cfg = Object.assign({}, DEF);
  try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); if (v && typeof v === 'object') cfg = Object.assign(cfg, v); } catch (e) { /* blocked */ }
  const clamp01 = v => Math.max(0, Math.min(1, +v || 0));
  M.cfg = () => Object.assign({}, cfg);
  M.stats = () => ({ beat, next, running, t: SFX.ac ? SFX.ac.currentTime : 0 });   // tests
  M.set = function (k, v) {
    cfg[k] = k === 'music' ? (v ? 1 : 0) : clamp01(v);
    try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (e) { /* blocked */ }
    applyVolumes();
    if (k === 'music') { if (cfg.music) M.start(); else M.stop(); }
  };
  function applyVolumes() {
    const a = SFX.ac; if (!a) return;
    if (SFX.master) SFX.master.gain.setTargetAtTime(.5 * cfg.sfx * 1.25, a.currentTime, .05);   // the engine's own default is 0.5 at sfx 0.8
    if (bus) bus.gain.setTargetAtTime(cfg.music && running ? .55 * cfg.mvol : 0, a.currentTime, running ? .4 : .08);
  }

  // ---------------------------------------------------------------- how scary is it right now? (0..1)
  // home 0 · a house run .25 + the noise share · a zombie chasing/attacking you .75 · a mini-boss after you or a horde watch shift 1
  const FIGHT = { chase: 1, windup: 1, lunge: 1, recover: 1, hurt: 1 };
  M.tension = function () {
    if (!DM.scene) return 0;
    const G = DM.House && DM.House.G; if (!G || G.over) return 0;
    const b = document.body.classList;
    if (b.contains('shift')) return 1;
    let t = b.contains('atbase') ? .1 : .25 + .35 * Math.min(1, G.noiseLvl || 0);
    for (const z of G.zs) {
      if (z.dead || !FIGHT[z.st]) continue;
      if (z.boss || z.kind === 'turkey' || z.kind === 'krampus') return 1;
      t = Math.max(t, .75);
    }
    return Math.min(1, t);
  };

  // ---------------------------------------------------------------- the Eerie track
  const TR = { bpm: 60, root: 45 };
  const SCALE = [0, 1, 3, 5, 7, 8, 10];   // phrygian-ish minor: the flat second makes it sound wrong in a good way
  let bus = null, timer = 0, next = 0, beat = 0, running = false;
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  function note(t, midi, dur, type, vol, cut) {
    const c = SFX.ac, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = mtof(midi);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + Math.min(.02, dur / 4)); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    if (cut) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cut; o.connect(f); f.connect(g); } else o.connect(g);
    g.connect(bus); o.start(t); o.stop(t + dur + .05);
  }
  function thump(t, vol) {
    const c = SFX.ac, o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(38, t + .18);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + .25); o.connect(g); g.connect(bus); o.start(t); o.stop(t + .3);
  }
  function step(t, st, bar, T) {
    const r = TR.root, spb = 60 / TR.bpm;
    // drone: two detuned low saws under a dark filter, a new root every 2 bars (drifts down a half step)
    if (st === 0 && bar % 2 === 0) { const d = [0, 0, -1, 1][(bar / 2) % 4]; note(t, r - 12 + d, 8 * spb * 2, 'sawtooth', .035, 320 + T * 500); note(t, r - 12 + d + 7.1, 8 * spb * 2, 'sawtooth', .02, 300 + T * 400); }
    // music-box bells, sparse when calm
    if (Math.random() < .12 + T * .25) { const deg = SCALE[Math.floor(Math.random() * SCALE.length)]; note(t, r + 24 + deg, 2.5 - T * 1.5, 'sine', .045 - T * .015); }
    // heartbeat once anything is going on (inside a house)
    if (T >= .2 && (st === 0 || st === 1 || (T >= .7 && (st === 4 || st === 5)))) thump(t, .12 + T * .15);
    // fight: tremolo strings on a minor-second cluster, climbing each bar
    if (T >= .7) { const up = bar % 4; note(t, r + 12 + up, .12, 'sawtooth', .02, 1800); note(t, r + 13 + up, .12, 'sawtooth', .016, 1800); }
    // boss / horde: a stab every bar
    if (T >= .98 && st === 0) note(t, r + 6, .6, 'square', .03, 900);
  }
  function tick() {
    const c = SFX.ac; if (!c || !running) return;
    if (c.state !== 'running') return;   // suspended (hidden, or iOS before a tap): nothing to schedule
    // ease toward the target: a quick swell up, a slow settle back down
    const want = M.want = M.tension();
    M.T += (want - M.T) * (want > M.T ? .35 : .025);
    const spb = 60 / (TR.bpm * (1 + M.T * .9));   // up to ~1.9x in a fight
    if (next < c.currentTime) next = c.currentTime + .05;   // fell behind (timer throttled): skip, never burst
    let n = 0;
    while (next < c.currentTime + .35 && n++ < 8) {
      step(next, beat % 8, Math.floor(beat / 8), M.T);
      beat++; next += spb / 2;
    }
  }
  M.start = function () {
    const c = SFX.ac; if (!c || !cfg.music || document.visibilityState === 'hidden') return;
    if (!bus) { bus = c.createGain(); bus.gain.value = 0; bus.connect(c.destination); }
    if (c.state === 'suspended') { try { c.resume(); } catch (e) { /* needs a gesture */ } }
    if (!running) { running = true; next = c.currentTime + .15; M.T = M.tension(); }
    if (!timer) timer = setInterval(tick, 100);
    M.on = true; applyVolumes();
  };
  M.stop = function () {
    running = false; M.on = false;
    if (timer) { clearInterval(timer); timer = 0; }
    applyVolumes();
  };
  // first user gesture: unlock audio (iOS) and start the music
  const kick = () => { SFX.init(); applyVolumes(); if (cfg.music && !running) M.start(); };
  for (const ev of ['pointerdown', 'touchend', 'click', 'keydown']) document.addEventListener(ev, kick, { capture: true, passive: true });
  // pause while the app is hidden; pick up again when it comes back
  document.addEventListener('visibilitychange', () => {
    const c = SFX.ac; if (!c) return;
    if (document.visibilityState === 'hidden') { M.stop(); try { c.suspend(); } catch (e) { /* ignore */ } }
    else { try { c.resume(); } catch (e) { /* ignore */ } if (cfg.music) M.start(); }
  });
})();
