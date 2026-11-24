/* Dead Miles (next) - music.
   0.20: area music. Six pre-rendered SEAMLESS LOOPS (next/music/*.mp3, made with our own synth: mockups/music/loops.py)
   play through WebAudio by area, plus the old live-generated "Eerie" track:
     home / menus  Lantern Hollow (Midnight Carol while the Christmas event runs)
     the map       Rust & Hum
     a house run   Brownstone Pulse  -> Horde Night while something is after her, back after a calm spell
     the base      Last Light Radio
     fights        Horde Night (watch shifts, the weekly boss, the deep-run boss floor)
   Settings: "Auto (by area)" or one pinned track (Eerie included), on/off, volume.
   How it plays: each file is [last .3 s][the loop][first .3 s]; an AudioBufferSourceNode loops loopStart=.3 ..
   loopEnd=.3+L, so the loop point is seamless whatever start delay / padding the phone's MP3 decoder adds.
   Files load lazily (only the area's track, then the likely next one), decode at 22.05 kHz where the browser
   allows (half the memory), at most 3 decoded at once. Loading never blocks: the old track keeps playing until the
   new one is ready, then they crossfade (1.5 s into a fight, 3 s back out, 2.5 s otherwise). A file that fails to
   load falls back to the live Eerie track (and is tried again after 90 s).
   In a house run the loop stays adaptive: a low-pass that opens with tension, a small swell, and a live heartbeat
   layered on Brownstone Pulse (on its own beat grid) when zombies are close.
   Eerie (ported from the old game s2.js): a low detuned drone, sparse phrygian music-box bells, a heartbeat inside
   houses, tremolo strings and up to ~1.9x tempo in fights, a stab per bar for bosses.
   Timing: a light setInterval (every 100 ms) does everything here, scheduling ~0.35 s ahead on the AUDIO clock;
   nothing runs inside the game's animation frame, so a slow frame never makes the music stutter.
   Shares the engine's AudioContext (DM.E.SFX.ac), which only starts on a user gesture (iOS needs that).
   Settings live on this device only (localStorage 'dm-next-audio'), never in the synced save. */
'use strict';
window.DM = window.DM || {};
(() => {
  const E = DM.E, SFX = E.SFX, KEY = 'dm-next-audio';
  const M = DM.Music = { T: 0, want: 0, on: false };
  // ---------------------------------------------------------------- the tracks
  // L = loop length in seconds (exact sample counts at 22.05 kHz), v = level (evens out their loudness)
  const PAD = .3, REV = '1';   // REV: bump when the files are re-rendered (cache-busting, independent of the game version)
  const TRACKS = M.TRACKS = {
    lantern: { n: 'Lantern Hollow', f: 'lantern-hollow', L: 1176000 / 22050, v: .85 },
    rust: { n: 'Rust & Hum', f: 'rust-and-hum', L: 52.5, v: .75 },
    brown: { n: 'Brownstone Pulse', f: 'brownstone-pulse', L: 50, v: 1, beat: 60 / 96 },
    radio: { n: 'Last Light Radio', f: 'last-light-radio', L: 45, v: 1.2 },
    horde: { n: 'Horde Night', f: 'horde-night', L: 45, v: 1.1 },
    carol: { n: 'Midnight Carol', f: 'midnight-carol', L: 1008000 / 22050, v: .85 },
    eerie: { n: 'Eerie', live: 1 },
  };
  M.ORDER = ['lantern', 'rust', 'brown', 'radio', 'horde', 'carol', 'eerie'];
  M.dir = 'music/';   // tests point this elsewhere to simulate a failed file

  // ---------------------------------------------------------------- settings
  const DEF = { music: 1, mvol: .7, sfx: .8, track: 'auto' };
  let cfg = Object.assign({}, DEF);
  try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); if (v && typeof v === 'object') cfg = Object.assign(cfg, v); } catch (e) { /* blocked */ }
  if (cfg.track !== 'auto' && !TRACKS[cfg.track]) cfg.track = 'auto';
  const clamp01 = v => Math.max(0, Math.min(1, +v || 0));
  M.cfg = () => Object.assign({}, cfg);
  M.stats = () => ({ beat, next, running, t: SFX.ac ? SFX.ac.currentTime : 0 });   // tests
  M.set = function (k, v) {
    if (k === 'track') cfg.track = TRACKS[v] ? v : 'auto';
    else cfg[k] = k === 'music' ? (v ? 1 : 0) : clamp01(v);
    try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (e) { /* blocked */ }
    applyVolumes();
    if (k === 'music') { if (cfg.music) M.start(); else M.stop(true); }
    if (k === 'track' && running) tick();
  };
  function applyVolumes() {
    SFX.sfxVol = cfg.sfx;
    const a = SFX.ac; if (!a) return;
    if (SFX.master) SFX.master.gain.setTargetAtTime(.5 * cfg.sfx * 1.25, a.currentTime, .05);   // the engine's own default is 0.5 at sfx 0.8
    if (bus) bus.gain.setTargetAtTime(cfg.music && running ? .55 * cfg.mvol : 0, a.currentTime, running ? .4 : .08);
  }

  // ---------------------------------------------------------------- how scary is it right now? (0..1)
  // home 0 · a house run .25 + the noise share · a zombie (or a raider that knows she's there) after you .75 ·
  // a mini-boss after you or a horde watch shift 1
  const FIGHT = { chase: 1, windup: 1, lunge: 1, recover: 1, hurt: 1 };
  const RFIGHT = { fight: 1, aim: 1, strike: 1, windup: 1, recover: 1 };
  M.tension = function () {
    if (!DM.scene) return 0;
    const G = DM.House && DM.House.G; if (!G || G.over) return 0;
    const b = document.body.classList;
    if (b.contains('shift')) return 1;
    let t = b.contains('atbase') ? .1 : .25 + .35 * Math.min(1, G.noiseLvl || 0);
    for (const z of G.zs) {
      if (z.dead) continue;
      if (z.raider) { if (z.aggro && RFIGHT[z.st]) t = Math.max(t, .75); continue; }
      if (!FIGHT[z.st]) continue;
      if (z.boss || z.kind === 'turkey' || z.kind === 'krampus') return 1;
      t = Math.max(t, .75);
    }
    return Math.min(1, t);
  };
  // the closest awake zombie, in tiles (99 if none) - drives the heartbeat layer
  function nearest() {
    const G = DM.House && DM.House.G; if (!G || G.over || !G.p) return 99;
    let best = 99;
    for (const z of G.zs) {
      if (z.dead || z.st === 'sleep' || z.st === 'flee' || z.st === 'leave') continue;
      const d = Math.hypot(z.x - G.p.x, z.y - G.p.y) / E.T; if (d < best) best = d;
    }
    return best;
  }

  // ---------------------------------------------------------------- where is she?
  // the raw area from what is on screen: home | map | house | base | fight
  M.rawArea = function () {
    const mv = document.getElementById('mapv');
    if (mv && mv.classList.contains('on')) return 'map';
    const b = document.body.classList;
    if (!DM.scene) return b.contains('deeprun') ? 'house' : 'home';   // between deep floors: stay with the run
    if (b.contains('shift') || b.contains('bossfight')) return 'fight';
    if (b.contains('atbase')) return 'base';
    const G = DM.House && DM.House.G;
    if (G && b.contains('deeprun') && G.zs.some(z => z.deepBoss && !z.dead)) return 'fight';   // the deep-run boss floor
    return 'house';
  };
  const christmas = () => { const ev = DM.D && DM.D.EV; return !!(ev && ev.id === 'christmas'); };
  const AUTO = { home: () => christmas() ? 'carol' : 'lantern', map: () => 'rust', house: () => 'brown', base: () => 'radio', fight: () => 'horde' };
  const LIKELY = { home: 'house', map: 'home', house: 'fight', base: 'home', fight: 'house', hfight: 'house' };
  const CALM = 7;   // seconds of calm before a house fight's music lets go
  let area = 'home', areaRaw = 'home', areaT = 0, inFight = false, calmT = 0, lastTick = 0, scene = 'home', lastSwitchScene = 'home';
  function updateArea(dt) {
    const r = M.rawArea();
    if (r !== areaRaw) { areaRaw = r; areaT = 0; } else areaT += dt;
    if (areaRaw !== area && (areaT >= .4 || area === 'home')) { area = areaRaw; inFight = false; calmT = 0; }   // short debounce (not leaving home)
    // inside a house run: Horde Night while something is after her, back after a calm spell
    if (area === 'house') {
      if (M.want >= .75) { inFight = true; calmT = 0; }
      else if (inFight && (calmT += dt) >= CALM) inFight = false;
    } else inFight = false;
    return area === 'house' && inFight ? 'fight' : area;
  }
  M.area = () => scene;

  // ---------------------------------------------------------------- loading (lazy, at most 3 decoded)
  const cache = new Map(), loading = new Map(), failed = {};
  const recentFail = id => failed[id] && performance.now() - failed[id] < 90000;
  M.log = [];   // tests: what was fetched / decoded / dropped / played
  let off = null;
  function decode(ab) {
    const viaCtx = (ctx, data) => new Promise((ok, no) => { try { const p = ctx.decodeAudioData(data, ok, no); if (p && p.then) p.then(ok, no); } catch (e) { no(e); } });
    // decode at the files' own 22.05 kHz when the browser lets us (half the memory of the 44.1/48 kHz context)
    if (off === null) { try { const OC = window.OfflineAudioContext || window.webkitOfflineAudioContext; off = OC ? new OC(1, 1, 22050) : false; } catch (e) { off = false; } }
    if (!off) return viaCtx(SFX.ac, ab);
    return viaCtx(off, ab.slice(0)).catch(() => viaCtx(SFX.ac, ab));
  }
  function load(id) {
    const tr = TRACKS[id];
    if (!tr || tr.live || cache.has(id)) return Promise.resolve(cache.get(id));
    if (loading.has(id)) return loading.get(id);
    if (recentFail(id)) return Promise.reject(new Error('failed recently'));
    M.log.push('fetch ' + id);
    const p = fetch(M.dir + tr.f + '.mp3?r=' + REV).then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer(); })
      .then(decode)
      .then(buf => {
        if (!buf || buf.duration < PAD * 2 + tr.L - .05) throw new Error('too short');
        loading.delete(id); delete failed[id];
        cache.set(id, { buf, used: performance.now() }); trim(); M.log.push('ready ' + id + ' ' + buf.sampleRate + 'Hz');
        return buf;
      })
      .catch(e => { loading.delete(id); failed[id] = performance.now(); M.log.push('fail ' + id + ' ' + (e && e.message)); throw e; });
    loading.set(id, p); p.catch(() => { /* the tick falls back */ });
    return p;
  }
  function trim() {   // keep at most 3 decoded buffers; never drop what is playing or wanted
    if (cache.size <= 3) return;
    const keep = new Set([cur, wantId, nextId, ...voices.keys()]);
    const old = [...cache.entries()].filter(([k]) => !keep.has(k)).sort((a, b) => a[1].used - b[1].used);
    while (cache.size > 3 && old.length) { const [k] = old.shift(); cache.delete(k); M.log.push('drop ' + k); }
  }

  // ---------------------------------------------------------------- the mix
  // bus (music volume) <- Eerie (live) + heartbeat + [file voices -> tsum -> low-pass -> a touch of stereo width]
  let bus = null, eg = null, hb = null, tsum = null, lpf = null;
  const voices = new Map();   // id -> { src, g, t0 }
  let cur = null, wantId = null, nextId = null;
  const pos = {};   // where each track was when it faded out (it resumes there)
  function graph() {
    const c = SFX.ac; if (bus || !c) return;
    bus = c.createGain(); bus.gain.value = 0; bus.connect(c.destination);
    eg = c.createGain(); eg.gain.value = 0; eg.connect(bus);
    hb = c.createGain(); hb.connect(bus);
    tsum = c.createGain(); lpf = c.createBiquadFilter(); lpf.type = 'lowpass'; lpf.frequency.value = 16000; lpf.Q.value = .5;
    tsum.connect(lpf);
    try {   // mono files: dry on the left, an 11 ms copy on the right (Haas), so it is not a dot in the middle
      const m = c.createChannelMerger(2), dl = c.createDelay(.05); dl.delayTime.value = .011;
      lpf.connect(m, 0, 0); lpf.connect(dl); dl.connect(m, 0, 1); m.connect(bus);
    } catch (e) { lpf.connect(bus); }
  }
  function startVoice(id, fade) {
    const c = SFX.ac, tr = TRACKS[id], e = cache.get(id); if (!e) return false;
    e.used = performance.now();
    const s = c.createBufferSource(), g = c.createGain(), now = c.currentTime, when = now + .05;
    s.buffer = e.buf; s.loop = true; s.loopStart = PAD; s.loopEnd = PAD + tr.L;
    const p = (pos[id] || 0) % tr.L;
    g.gain.setValueAtTime(0, now); g.gain.setValueAtTime(0, when); g.gain.linearRampToValueAtTime(tr.v, when + fade);
    s.connect(g); g.connect(tsum); s.start(when, PAD + p);
    voices.set(id, { src: s, g, t0: when - p });
    return true;
  }
  function stopVoice(id, fade) {
    const v = voices.get(id); if (!v) return; voices.delete(id);
    const now = SFX.ac.currentTime, L = TRACKS[id].L;
    pos[id] = ((now + fade / 2 - v.t0) % L + L) % L;
    try { v.g.gain.cancelScheduledValues(now); v.g.gain.setValueAtTime(v.g.gain.value, now); v.g.gain.linearRampToValueAtTime(0, now + fade); v.src.stop(now + fade + .1); } catch (e) { /* already stopped */ }
    setTimeout(() => { try { v.src.disconnect(); v.g.disconnect(); } catch (e) { /* ignore */ } }, (fade + .4) * 1000);
  }
  function eerieTo(on, fade) {
    const now = SFX.ac.currentTime;
    eg.gain.cancelScheduledValues(now); eg.gain.setValueAtTime(eg.gain.value, now); eg.gain.linearRampToValueAtTime(on ? 1 : 0, now + fade);
    eerieUntil = on ? Infinity : now + fade + .2;
  }
  function switchTo(id, fade) {
    if (id === cur) return;
    if (id !== 'eerie' && !startVoice(id, fade)) return;
    if (cur === 'eerie') eerieTo(false, fade); else if (cur) stopVoice(cur, fade);
    if (id === 'eerie') { eerieTo(true, fade); if (next < SFX.ac.currentTime) next = SFX.ac.currentTime + .05; }
    cur = id; lastSwitchScene = scene; M.log.push('play ' + id + ' (' + scene + ', ' + fade + ' s)');
  }
  const fadeFor = (from, to) => to === 'fight' ? 1.5 : from === 'fight' ? 3 : 2.5;

  // ---------------------------------------------------------------- the Eerie track (live)
  const TR = { bpm: 60, root: 45 };
  const SCALE = [0, 1, 3, 5, 7, 8, 10];   // phrygian-ish minor: the flat second makes it sound wrong in a good way
  let timer = 0, next = 0, beat = 0, running = false, eerieUntil = 0, hbNext = 0;
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  function note(t, midi, dur, type, vol, cut) {
    const c = SFX.ac, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = mtof(midi);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + Math.min(.02, dur / 4)); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    if (cut) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cut; o.connect(f); f.connect(g); } else o.connect(g);
    g.connect(eg); o.start(t); o.stop(t + dur + .05);
  }
  function thump(t, vol, out) {
    const c = SFX.ac, o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(38, t + .18);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + .25); o.connect(g); g.connect(out || eg); o.start(t); o.stop(t + .3);
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
  // the live heartbeat over the area loops (house runs): the low thump + a little knock a phone speaker can play
  function heartAt(t, vol) {
    thump(t, vol, hb);
    const c = SFX.ac, o = c.createOscillator(), g = c.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(70, t + .08);
    g.gain.setValueAtTime(vol * .35, t); g.gain.exponentialRampToValueAtTime(.0001, t + .1); o.connect(g); g.connect(hb); o.start(t); o.stop(t + .12);
  }
  M.near = 99; M.hbN = 0;
  function heartLayer(c) {
    if (scene !== 'house' || cur === 'eerie' || !cur) { hbNext = 0; M.near = 99; return; }
    const d = M.near = nearest(), k = Math.max(0, Math.min(1, (7 - d) / 5));   // 0 at 7 tiles, full at 2
    if (k <= 0) { hbNext = 0; return; }
    const v = voices.get(cur), now = c.currentTime, vol = .06 + .14 * k;
    if (cur === 'brown' && v) {
      // on Brownstone's own grid: its heartbeat sits on the even beats, this fills the odd ones (the pulse doubles as they close in)
      const b = TRACKS.brown.beat; let n = Math.ceil((Math.max(now + .02, hbNext) - v.t0) / b); if (n % 2 === 0) n++;
      const t = v.t0 + n * b;
      if (t < now + .35) { heartAt(t, vol); heartAt(t + .18, vol * .6); M.hbN++; hbNext = t + b * 1.5; }
    } else {
      if (!hbNext || hbNext < now) hbNext = now + .05;
      if (hbNext < now + .35) { heartAt(hbNext, vol); heartAt(hbNext + .18, vol * .6); M.hbN++; hbNext += 60 / (62 + 58 * k); }
    }
  }

  // ---------------------------------------------------------------- the 100 ms tick
  function tick() {
    const c = SFX.ac; if (!c || !running) return;
    if (c.state !== 'running') return;   // suspended (hidden, or iOS before a tap): nothing to schedule
    graph();
    const ms = performance.now(), dt = lastTick ? Math.min(.5, (ms - lastTick) / 1000) : .1; lastTick = ms;
    // ease toward the target: a quick swell up, a slow settle back down
    const want = M.want = M.tension();
    M.T += (want - M.T) * (want > M.T ? .35 : .025);
    scene = updateArea(dt);
    // which track? (pinned, or by area; a file still loading keeps the old track playing; a failed file -> Eerie)
    const pin = cfg.track !== 'auto' ? cfg.track : null;
    let id = wantId = pin || AUTO[scene]();
    if (id !== 'eerie' && !cache.has(id)) {
      if (recentFail(id) && !loading.has(id)) id = 'eerie';
      else { load(id).catch(() => { /* next tick falls back */ }); id = cur; }
    }
    if (id && id !== cur) switchTo(id, cur ? fadeFor(lastSwitchScene, scene) : 1.2);
    // prefetch the likely next track once this one plays (Auto only; not on data saver)
    nextId = null;
    if (!pin && cur === wantId && !loading.size) {
      const nx = AUTO[LIKELY[scene === 'fight' && area === 'house' ? 'hfight' : scene]]();
      const saver = navigator.connection && navigator.connection.saveData;
      if (nx !== cur && !TRACKS[nx].live && !saver) { nextId = nx; if (!cache.has(nx) && !recentFail(nx)) load(nx).catch(() => { /* fine */ }); }
    }
    // adaptive feel in a house run: the low-pass opens with tension (about 3 kHz calm, 6 kHz with noise, wide open in a fight), a small swell
    const now = c.currentTime;
    lpf.frequency.setTargetAtTime(scene === 'house' ? Math.min(16000, 1500 * Math.pow(2, M.T * 4)) : 16000, now, .35);
    tsum.gain.setTargetAtTime(scene === 'house' ? .8 + .2 * M.T : 1, now, .5);
    heartLayer(c);
    // the Eerie generator only runs while it can be heard
    if (cur === 'eerie' || now < eerieUntil) {
      const spb = 60 / (TR.bpm * (1 + M.T * .9));   // up to ~1.9x in a fight
      if (next < now) next = now + .05;   // fell behind (timer throttled): skip, never burst
      let n = 0;
      while (next < now + .35 && n++ < 8) { step(next, beat % 8, Math.floor(beat / 8), M.T); beat++; next += spb / 2; }
    }
  }
  M.start = function () {
    const c = SFX.ac; if (!c || !cfg.music || document.visibilityState === 'hidden') return;
    graph();
    if (c.state !== 'running' && c.state !== 'closed') { try { c.resume(); } catch (e) { /* needs a gesture */ } }   // 0.72.1: also 'interrupted' (iOS)
    if (!running) { running = true; next = c.currentTime + .15; M.T = M.tension(); lastTick = 0; }
    if (!timer) timer = setInterval(tick, 100);
    M.on = true; applyVolumes();
  };
  // hard = switched off in Settings: let the voices go (hiding the app keeps them; the context is suspended then anyway)
  M.stop = function (hard) {
    running = false; M.on = false;
    if (timer) { clearInterval(timer); timer = 0; }
    applyVolumes();
    if (hard && SFX.ac && bus) { for (const k of [...voices.keys()]) stopVoice(k, .3); if (cur === 'eerie') eerieTo(false, .3); cur = null; }
  };
  // tests / Settings: what is going on
  M.state = () => ({
    on: running, track: cfg.track, area, scene, fight: inFight, want: wantId, cur, next: nextId, T: +M.T.toFixed(2),
    cached: [...cache.keys()], loading: [...loading.keys()], failed: Object.keys(failed), voices: [...voices.keys()],
    lpf: lpf ? Math.round(lpf.frequency.value) : 0, near: +(+M.near).toFixed(1), hb: M.hbN,
  });
  M.nowName = () => cur ? TRACKS[cur].n : '';
  // first user gesture: unlock audio (iOS) and start the music
  const kick = () => { SFX.init(); applyVolumes(); if (cfg.music && (!running || (SFX.ac && SFX.ac.state !== 'running'))) M.start(); };   // 0.72.1: a tap also wakes audio the phone interrupted
  window.addEventListener('pageshow', () => { const c = SFX.ac; if (c && c.state !== 'running' && c.state !== 'closed') { try { c.resume(); } catch (e) { /* ignore */ } } });
  for (const ev of ['pointerdown', 'touchend', 'click', 'keydown']) document.addEventListener(ev, kick, { capture: true, passive: true });
  // pause while the app is hidden; pick up again when it comes back
  document.addEventListener('visibilitychange', () => {
    const c = SFX.ac; if (!c) return;
    if (document.visibilityState === 'hidden') { M.stop(); try { c.suspend(); } catch (e) { /* ignore */ } }
    else { try { c.resume(); } catch (e) { /* ignore */ } if (cfg.music) M.start(); }
  });
})();
