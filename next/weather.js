/* Dead Miles (next) 0.22 - real local weather (owner: "I do want weather in the game as well").

   Source: the free Open-Meteo API (no key). One small request every ~45 minutes at most:
     https://api.open-meteo.com/v1/forecast?latitude=..&longitude=..&current=weather_code,temperature_2m,precipitation,wind_speed_10m,is_day

   Privacy:
   - Only a COARSE position is ever sent: rounded to 0.1 degrees (about 10 km).
   - It is used only if she already let the Map tab use her location: map.js leaves a coarse 0.1-degree area on this
     phone ('dm-next-wxloc', 0.22) or, for map users from before 0.22, the ~700 m square it last showed (rounded again
     to 0.1 degrees here). Otherwise the weather area she picked in Settings (New York, Atlanta, ...), default New York.
   - Nothing about the weather or where she is goes into the save (local or cloud). The cache below lives in this
     phone's localStorage only, as do the area setting and the coarse area.

   Game weather: clear, cloudy, fog, rain, storm (heavy rain / thunderstorm), snow, wind; plus "heat" above 30 C.
   Every gameplay multiplier lives in ONE table (FX) so the numbers are easy to see and tune. Effects are modest.
   Where it applies:
   - house runs, the base and watch shifts, boss fights: visuals + gameplay
   - the DAILY CHALLENGE house: visuals only (everyone must get the same fair run)
   - deep runs: floor 1 only (floors 2+ are underground: no weather at all)
   - hunger/thirst drain (food.js) and rain barrels (base.js) follow the weather at home too. */
'use strict';
window.DM = window.DM || {};
(() => {
  const W = DM.Weather = {};
  const CACHE = 'dm-next-weather', CFG = 'dm-next-wx', AREA = 'dm-next-wxloc';
  const TTL = 45 * 60e3, STALE = 24 * 36e5;   // refetch after 45 min; offline, the last known weather is good for a day, then "clear"
  const API = 'https://api.open-meteo.com/v1/forecast';

  // ---------------------------------------------------------------- the one table of effects
  // hear: how far zombies (and raiders) hear sounds · sight: how far zombies and raiders spot her · move: her speed
  // hunger / thirst: real-time drain of the bars (food.js) · barrel: extra rain-barrel charges that day (base.js)
  W.FX = {
    clear:  { n: 'Clear',        hear: 1,   sight: 1,   move: 1,   hunger: 1,   thirst: 1,   barrel: 0 },
    cloudy: { n: 'Cloudy',       hear: 1,   sight: 1,   move: 1,   hunger: 1,   thirst: 1,   barrel: 0 },
    wind:   { n: 'Windy',        hear: .9,  sight: 1,   move: 1,   hunger: 1,   thirst: 1,   barrel: 0 },
    fog:    { n: 'Fog',          hear: 1,   sight: .75, move: 1,   hunger: 1,   thirst: 1,   barrel: 0 },
    rain:   { n: 'Rain',         hear: .8,  sight: 1,   move: 1,   hunger: 1,   thirst: 1,   barrel: 1 },
    storm:  { n: 'Storm',        hear: .8,  sight: 1,   move: 1,   hunger: 1,   thirst: 1,   barrel: 1 },
    snow:   { n: 'Snow',         hear: 1,   sight: 1,   move: .92, hunger: 1.1, thirst: .85, barrel: 0 },
  };
  W.HEAT = { c: 30, thirst: 1.25 };   // above 30 C (86 F): thirst drains 25% faster
  W.LIGHTNING = { min: 9, max: 26, reveal: .55 };   // storms with thunder: a flash every 9-26 s lifts the fog of war for ~0.5 s
  const ICON = { clear: '☀️', night: '🌙', cloudy: '☁️', wind: '🌬️', fog: '🌫️', rain: '🌧️', storm: '⛈️', snow: '❄️' };
  const SHORT = { clear: '', cloudy: '', wind: 'zombies hear a bit less', fog: 'zombies see less far', rain: 'zombies hear less', storm: 'zombies hear less · lightning', snow: 'you move a bit slower' };
  W.REGIONS = {
    nyc: { n: 'New York', lat: 40.7, lon: -74 }, atl: { n: 'Atlanta', lat: 33.7, lon: -84.4 }, sav: { n: 'Savannah', lat: 32.1, lon: -81.1 },
    aug: { n: 'Augusta', lat: 33.5, lon: -82 }, phl: { n: 'Philadelphia', lat: 40, lon: -75.2 }, bos: { n: 'Boston', lat: 42.4, lon: -71.1 },
    chi: { n: 'Chicago', lat: 41.9, lon: -87.6 }, mia: { n: 'Miami', lat: 25.8, lon: -80.2 }, la: { n: 'Los Angeles', lat: 34.1, lon: -118.2 },
    lon: { n: 'London', lat: 51.5, lon: -.1 },
  };

  // ---------------------------------------------------------------- WMO weather code -> game weather
  W.typeOf = function (code, windKmh) {
    const c = +code;
    let t = 'clear';
    if (c === 0 || c === 1) t = 'clear';
    else if (c === 2 || c === 3) t = 'cloudy';
    else if (c === 45 || c === 48) t = 'fog';
    else if ((c >= 51 && c <= 67) || c === 80 || c === 81) t = 'rain';   // drizzle, rain, freezing rain, showers
    else if (c === 82 || (c >= 95 && c <= 99)) t = 'storm';               // violent showers, thunderstorms
    else if ((c >= 71 && c <= 77) || c === 85 || c === 86) t = 'snow';
    if (c === 65) t = 'storm';                                            // heavy rain counts as a storm (no lightning)
    if ((t === 'clear' || t === 'cloudy') && +windKmh >= 38) t = 'wind';
    return t;
  };

  // ---------------------------------------------------------------- settings + state (this phone only)
  let cfg = { region: 'auto' };
  try { const v = JSON.parse(localStorage.getItem(CFG) || 'null'); if (v && typeof v === 'object') cfg = Object.assign(cfg, v); } catch (e) { /* blocked */ }
  if (cfg.region !== 'auto' && !W.REGIONS[cfg.region]) cfg.region = 'auto';
  const saveCfg = () => { try { localStorage.setItem(CFG, JSON.stringify(cfg)); } catch (e) { /* blocked */ } };
  let cur = null, forced = null, busy = null;
  const subs = [];
  W.onChange = fn => subs.push(fn);
  const changed = () => { for (const f of subs) { try { f(W.now()); } catch (e) { console.warn(e); } } };
  try { const v = JSON.parse(localStorage.getItem(CACHE) || 'null'); if (v && v.w && v.at) cur = v; } catch (e) { /* none */ }
  W.reduced = (() => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } })();

  const r1 = v => Math.round(v * 10) / 10;
  // the coarse area map.js left on this phone (0.1 degrees). Never a precise point; never in the save.
  function mapArea() {
    try { const v = JSON.parse(localStorage.getItem(AREA) || 'null'); if (v && isFinite(v.lat) && isFinite(v.lon)) return Promise.resolve({ lat: r1(v.lat), lon: r1(v.lon) }); } catch (e) { /* none */ }
    if (DM.Map && DM.Map.lastArea) return DM.Map.lastArea().then(a => a && isFinite(a.lat) ? { lat: r1(a.lat), lon: r1(a.lon) } : null).catch(() => null);
    return Promise.resolve(null);
  }
  W.noteArea = function (lat, lon) {   // map.js calls this with a GPS fix; only the 0.1-degree area is kept
    if (!isFinite(lat) || !isFinite(lon)) return;
    const a = { lat: r1(lat), lon: r1(lon) };
    let old = null; try { old = JSON.parse(localStorage.getItem(AREA) || 'null'); } catch (e) { /* none */ }
    if (old && old.lat === a.lat && old.lon === a.lon) return;
    try { localStorage.setItem(AREA, JSON.stringify(a)); } catch (e) { /* blocked */ }
    if (cfg.region === 'auto') W.refresh(true);
  };
  async function where() {
    if (cfg.region !== 'auto') { const R = W.REGIONS[cfg.region]; return { lat: R.lat, lon: R.lon, src: 'region', name: R.n }; }
    const a = await mapArea();
    if (a) return { lat: a.lat, lon: a.lon, src: 'map', name: 'your area' };
    const R = W.REGIONS.nyc; return { lat: R.lat, lon: R.lon, src: 'default', name: R.n };
  }

  // ---------------------------------------------------------------- fetch + cache
  W.refresh = function (force) {
    if (busy) return busy;
    busy = (async () => {
      const at = await where(), key = at.lat.toFixed(1) + ',' + at.lon.toFixed(1);
      if (!force && cur && cur.key === key && Date.now() - cur.at < TTL) return W.now();
      try {
        const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null, t = ctl && setTimeout(() => ctl.abort(), 8000);
        const url = `${API}?latitude=${at.lat.toFixed(1)}&longitude=${at.lon.toFixed(1)}&current=weather_code,temperature_2m,precipitation,wind_speed_10m,is_day`;
        const r = await fetch(url, { signal: ctl ? ctl.signal : undefined, cache: 'no-store' }); if (t) clearTimeout(t);
        if (!r.ok) throw new Error('weather ' + r.status);
        const j = await r.json(), c = j && j.current; if (!c || c.weather_code == null) throw new Error('no weather');
        const w = { code: +c.weather_code, temp: +c.temperature_2m, wind: +c.wind_speed_10m || 0, precip: +c.precipitation || 0, isDay: c.is_day == null ? null : !!+c.is_day };
        w.type = W.typeOf(w.code, w.wind);
        cur = { at: Date.now(), key, src: at.src, name: at.name, w };
        try { localStorage.setItem(CACHE, JSON.stringify(cur)); } catch (e) { /* blocked */ }
      } catch (e) { /* offline or blocked: keep the last known weather (W.now() falls back to clear after a day) */ }
      changed();
      return W.now();
    })().finally(() => { busy = null; });
    return busy;
  };
  // what the weather is right now: { type, code, temp, wind, isDay, thunder, heat, src, name, offline }
  W.now = function () {
    if (forced) return forced;
    const fresh = cur && Date.now() - cur.at < STALE;
    if (!fresh) return { type: 'clear', code: 0, temp: null, wind: 0, isDay: null, thunder: false, heat: false, src: 'none', name: '', offline: true };
    const w = cur.w;
    return { type: w.type, code: w.code, temp: w.temp, wind: w.wind, isDay: w.isDay, thunder: w.code >= 95, heat: isFinite(w.temp) && w.temp > W.HEAT.c, src: cur.src, name: cur.name, offline: Date.now() - cur.at > TTL * 2 };
  };
  // tests + the test panel: pretend it is this weather (null = real weather again)
  W.force = function (type, temp) {
    if (!type) forced = null;
    else { const code = { clear: 0, cloudy: 3, fog: 45, rain: 63, storm: 95, snow: 73, wind: 2 }[type] || 0; forced = { type, code, temp: temp != null ? temp : type === 'snow' ? -2 : 12, wind: type === 'wind' ? 45 : 8, isDay: false, thunder: type === 'storm', heat: temp != null && temp > W.HEAT.c, src: 'test', name: 'test', offline: false }; }
    changed(); return W.now();
  };
  W.cfg = () => Object.assign({}, cfg);
  W.setRegion = function (k) { cfg.region = k === 'auto' || W.REGIONS[k] ? k : 'auto'; saveCfg(); return W.refresh(true); };

  // ---------------------------------------------------------------- effects
  const fxOf = w => W.FX[w.type] || W.FX.clear;
  // hunger/thirst multipliers for food.js (real-time drain, home and away)
  W.drain = function () { const w = W.now(), f = fxOf(w); return { h: f.hunger, t: f.thirst * (w.heat ? W.HEAT.thirst : 1) }; };
  // extra rain-barrel charges today (base.js)
  W.barrelBonus = () => fxOf(W.now()).barrel;
  W.lines = function (w = W.now()) {   // plain-English effects, for the chip sheet
    const f = fxOf(w), out = [];
    if (f.hear < 1) out.push(`Zombies and raiders hear ${Math.round((1 - f.hear) * 100)}% less: the ${w.type === 'wind' ? 'wind' : 'rain'} covers your noise.`);
    if (f.sight < 1) out.push(`Zombies and raiders spot you from ${Math.round((1 - f.sight) * 100)}% less far, and your own view is foggier.`);
    if (f.move < 1) out.push(`You move ${Math.round((1 - f.move) * 100)}% slower in the snow.`);
    if (f.thirst < 1) out.push(`Thirst drains ${Math.round((1 - f.thirst) * 100)}% slower; hunger ${Math.round((f.hunger - 1) * 100)}% faster (cold).`);
    if (w.heat) out.push(`It is hot (over ${W.HEAT.c}°C / ${Math.round(W.HEAT.c * 9 / 5 + 32)}°F): thirst drains ${Math.round((W.HEAT.thirst - 1) * 100)}% faster.`);
    if (f.barrel) out.push(`Rain barrels at your base collect +${f.barrel} extra charge today.`);
    if (w.type === 'storm' && w.thunder) out.push('Lightning: every so often a flash lights up the whole house for a moment.');
    if (!out.length) out.push('No effects right now.');
    return out;
  };

  // ---------------------------------------------------------------- display
  const fahr = (() => { try { return /^en-(US|LR|MM)|^en$/i.test(navigator.language || 'en-US'); } catch (e) { return true; } })();
  W.tempStr = t => (t == null || !isFinite(t) ? '' : fahr ? Math.round(t * 9 / 5 + 32) + '°F' : Math.round(t) + '°C');
  W.icon = w => (w.type === 'clear' && w.isDay === false ? ICON.night : ICON[w.type] || ICON.clear);
  W.label = w => (w.type === 'storm' && !w.thunder ? 'Heavy rain' : w.type === 'storm' ? 'Thunderstorm' : fxOf(w).n);
  W.chipHTML = function () {
    const w = W.now(), why = w.heat ? 'thirst drains faster' : SHORT[w.type];
    const t = W.tempStr(w.temp);
    return `<button class="wxchip wx-${w.type}" id="wxChip"><span class="wxi">${W.icon(w)}</span><b>${W.label(w)}</b>${t ? `<i>${t}</i>` : ''}${why ? `<em>${why}</em>` : ''}<span class="wxgo">›</span></button>`;
  };
  W.settingsHTML = function () {
    const o = [['auto', 'Auto (Map area, else New York)']].concat(Object.keys(W.REGIONS).map(k => [k, W.REGIONS[k].n]));
    return `<label class="volrow wxrow"><span>Weather area</span><select id="mWx">${o.map(([k, n]) => `<option value="${k}"${cfg.region === k ? ' selected' : ''}>${n}</option>`).join('')}</select></label>`;
  };
  W.bindSettings = function (root) {
    const s = (root || document).querySelector('#mWx'); if (!s) return;
    s.onchange = () => { W.setRegion(s.value); try { DM.E.SFX.play('ui'); } catch (e) { /* ignore */ } };
  };
  // the chip on the home card + its info sheet (sheetOpen/sheetClose come from game.js)
  W.bind = function (root, sheetOpen, sheetClose) {
    const el = root && root.querySelector('#wxChip'); if (!el) return;
    el.onclick = () => {
      try { DM.E.SFX.play('ui'); } catch (e) { /* ignore */ }
      const w = W.now(), src = w.src === 'map' ? 'your area (from the Map, rounded to about 10 km)' : w.src === 'test' ? 'test weather' : w.src === 'none' ? 'no weather yet (offline?)' : w.name;
      sheetOpen(`<div class="kick">Weather · ${src}</div><h3>${W.icon(w)} ${W.label(w)}${w.temp != null ? ' · ' + W.tempStr(w.temp) : ''}</h3>
        <ul class="fdfx wxfx">${W.lines(w).map(l => `<li>${l}</li>`).join('')}</ul>
        <p class="mp dim">Real weather where you are, checked about every 45 minutes. It changes house runs, your base and watch shifts. The daily challenge house only <i>looks</i> rainy (same fair run for everyone), and deep runs feel it on floor 1 only.${w.offline && w.src !== 'none' ? ' Offline: showing the last weather we saw.' : ''}</p>
        ${W.settingsHTML()}
        <div class="btnrow"><button class="mbtn sm ghost" id="wxClose">Close</button></div>`);
      W.bindSettings(document.querySelector('#msheet'));
      const c = document.querySelector('#wxClose'); if (c) c.onclick = sheetClose;
    };
  };
  // the home chip updates itself when new weather arrives
  W.onChange(() => { const el = document.getElementById('wxChip'); if (!el) return; const tmp = document.createElement('div'); tmp.innerHTML = W.chipHTML(); const n = tmp.firstChild; n.onclick = el.onclick; el.replaceWith(n); });

  // ---------------------------------------------------------------- thunder (procedural, the engine's AudioContext)
  W.thunder = function (near = .5) {
    const SFX = DM.E && DM.E.SFX, a = SFX && SFX.ac; if (!a || !SFX.nb || a.state !== 'running') return false;
    const t0 = a.currentTime + .05 + (1 - near) * 1.1;   // far strikes rumble later
    const burst = (dur, f0, f1, g, when, type = 'lowpass', q = .7) => {
      const s = a.createBufferSource(); s.buffer = SFX.nb; s.loop = true; s.playbackRate.value = .5 + Math.random() * .3;
      const fl = a.createBiquadFilter(); fl.type = type; fl.Q.value = q; fl.frequency.setValueAtTime(f0, when); fl.frequency.exponentialRampToValueAtTime(f1, when + dur);
      const gn = a.createGain(); gn.gain.setValueAtTime(0, when); gn.gain.linearRampToValueAtTime(g, when + .04); gn.gain.exponentialRampToValueAtTime(.0005, when + dur);
      s.connect(fl); fl.connect(gn); gn.connect(SFX.master); s.start(when, Math.random() * .5); s.stop(when + dur + .05);
    };
    if (near > .6) burst(.35, 4200, 900, .22 * near, t0, 'bandpass', .6);   // the crack
    burst(2.8 + near, 260, 45, .32 + .2 * near, t0 + .05);                  // the long rumble
    burst(1.6, 160, 40, .2, t0 + .5 + Math.random() * .6);                  // a second roll
    return true;
  };
  W.thunders = 0;

  // ---------------------------------------------------------------- lightning bolt (shared by the title and runs)
  W.bolt = function (x0, y0, len, rnd = Math.random) {   // a jagged path with a fork or two; returns [[pts...], ...]
    const main = [[x0, y0]]; let x = x0, y = y0; const step = len / 9;
    while (y < y0 + len) { x += (rnd() - .5) * step * 1.3; y += step * (.7 + rnd() * .6); main.push([x, y]); }
    const out = [main];
    for (let k = 0; k < 2; k++) {
      const i = 2 + Math.floor(rnd() * (main.length - 4)); let [fx, fy] = main[i]; const f = [[fx, fy]], dir = rnd() < .5 ? -1 : 1;
      for (let j = 0; j < 3 + rnd() * 3; j++) { fx += dir * step * (.3 + rnd() * .6); fy += step * (.5 + rnd() * .5); f.push([fx, fy]); }
      out.push(f);
    }
    return out;
  };
  W.drawBolt = function (c, paths, w, a) {
    c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
    for (const [i, p] of paths.entries()) {
      const lw = (i ? .55 : 1) * w;
      c.beginPath(); p.forEach(([x, y], j) => j ? c.lineTo(x, y) : c.moveTo(x, y));
      c.globalAlpha = a * .35; c.strokeStyle = '#c9b8ff'; c.lineWidth = lw * 4; c.stroke();
      c.globalAlpha = a; c.strokeStyle = '#11142f'; c.lineWidth = lw * 1.9; c.stroke();
      c.strokeStyle = '#fff8e8'; c.lineWidth = lw; c.stroke();
    }
    c.restore();
  };

  // ---------------------------------------------------------------- house runs (house.js asks once per run)
  // Returns the run's weather: multipliers (all 1 where weather is visual only) plus update/draw/reveal.
  W.forRun = function (L, opts) {
    opts = opts || {};
    if (L && L.deep && L.deep.f > 1) return null;   // deep floors 2+: underground, no weather
    const w = W.now(); if (w.type === 'clear' || w.type === 'cloudy') { if (!w.heat) return null; }
    const play = !opts.daily, f = fxOf(w);
    const R = {
      type: w.type, w, play, base: !!(L && L.base) || !!opts.noFog,   // the base yard (and watch shifts) is outdoors
      hear: play ? f.hear : 1, sight: play ? f.sight : 1, move: play ? f.move : 1,
      flash: 0, nextT: W.LIGHTNING.min * .6 + Math.random() * 6, strikes: 0, t: 0,
    };
    // lightning: a quick double flicker; the fog of war lifts for a moment (not in the daily house: visual only there)
    R.reveal = () => (play && R.flash > 0 ? Math.min(1, R.flash / W.LIGHTNING.reveal) : 0);
    R.strike = function () {
      R.strikes++; R.flash = 1;   // top-down, so no bolt in the house: the light through the windows is the flash
      W.thunder(.4 + Math.random() * .6); W.thunders++;
    };
    R.update = function (dt) {
      R.t += dt;
      if (w.type !== 'storm' || !w.thunder) return;
      R.nextT -= dt; if (R.nextT <= 0) { R.nextT = W.LIGHTNING.min + Math.random() * (W.LIGHTNING.max - W.LIGHTNING.min); R.strike(); }
      if (R.flash > 0) R.flash = Math.max(0, R.flash - dt * (1 / .6));
    };
    // screen-space drawing after the fog: rain / snow / mist, the lightning flash. out = she is on the street (or at the base)
    R.draw = function (c, Wd, Hd, G, out, sc) {
      const t = R.t, k = out ? 1 : .32;
      if (w.type === 'fog') {   // her view is foggier: a lilac haze closing in around her (light in the daily house)
        const px = Wd / 2, py = Hd / 2 - 10 * sc, r0 = 70 * sc, r1 = Math.max(Wd, Hd) * .62;
        const g = c.createRadialGradient(px, py, r0, px, py, r1); const a = play ? .62 : .26;
        g.addColorStop(0, 'rgba(120,108,160,0)'); g.addColorStop(.55, `rgba(110,98,150,${a * .55})`); g.addColorStop(1, `rgba(96,86,136,${a})`);
        c.fillStyle = g; c.fillRect(0, 0, Wd, Hd);
        if (!W.reduced) { c.fillStyle = 'rgba(200,190,230,.05)'; for (let i = 0; i < 4; i++) { const y = ((i * .27 + t * .012 * (i + 1)) % 1.2 - .1) * Hd; c.fillRect(0, y, Wd, 40 * sc); } }
      }
      if (w.type === 'rain' || w.type === 'storm') {
        const n = Math.round((w.type === 'storm' ? 110 : 70) * k), len = (w.type === 'storm' ? 22 : 16) * sc;
        c.fillStyle = `rgba(30,34,80,${.1 * k})`; c.fillRect(0, 0, Wd, Hd);
        c.strokeStyle = `rgba(190,200,255,${.42 * k + .08})`; c.lineWidth = 1.3 * sc; c.beginPath();
        const cx = G ? G.cam.x * .4 * sc : 0, cy = G ? G.cam.y * .4 * sc : 0, sp = W.reduced ? 0 : 1;
        for (let i = 0; i < n; i++) {
          const s = 700 + (i * 53 % 300), x = (((i * 97.13 + i * i * .37) * sc - cx + t * s * .25 * sc * sp) % Wd + Wd) % Wd, y = (((i * 61.7 + i * i * .91) * sc - cy + t * s * sc * sp) % Hd + Hd) % Hd;
          c.moveTo(x, y); c.lineTo(x - len * .25, y - len);
        }
        c.stroke();
        if (out && !W.reduced) { c.fillStyle = 'rgba(200,210,255,.35)'; for (let i = 0; i < 10; i++) { const ph = (t * 2.3 + i * .37) % 1, x = ((i * 131.7 * sc - cx) % Wd + Wd) % Wd, y = ((i * 83.3 * sc - cy + 300 * sc) % Hd + Hd) % Hd; c.globalAlpha = 1 - ph; c.beginPath(); c.ellipse(x, y, (2 + ph * 8) * sc, (1 + ph * 3) * sc, 0, 0, 6.29); c.fill(); } c.globalAlpha = 1; }
      }
      if (w.type === 'snow') {
        c.fillStyle = 'rgba(150,190,255,.06)'; c.fillRect(0, 0, Wd, Hd);
        const n = Math.round(56 * k + 8); c.fillStyle = out ? 'rgba(246,240,255,.8)' : 'rgba(246,240,255,.35)';
        const cx = G ? G.cam.x * .2 * sc : 0, cy = G ? G.cam.y * .2 * sc : 0;
        for (let i = 0; i < n; i++) { const sp = (18 + (i * 37 % 23)) * (W.reduced ? 0 : 1), x = ((i * 97.3 + Math.sin(t * .6 + i) * 18) * sc - cx) % Wd, y = ((i * 61.7 + t * sp) * sc - cy) % Hd; c.beginPath(); c.arc((x + Wd) % Wd, (y + Hd) % Hd, (1.3 + (i % 3) * .8) * sc, 0, 6.29); c.fill(); }
      }
      if (w.type === 'wind' && !W.reduced) {
        c.strokeStyle = 'rgba(246,227,187,.14)'; c.lineWidth = 1.6 * sc; c.beginPath();
        for (let i = 0; i < 9; i++) { const y = ((i * 97 * sc) % Hd), x = ((t * (300 + i * 40) * sc + i * 211 * sc) % (Wd + 200 * sc)) - 100 * sc; c.moveTo(x, y); c.quadraticCurveTo(x + 30 * sc, y - 6 * sc, x + 70 * sc, y); }
        c.stroke();
      }
      if (w.heat) { c.fillStyle = 'rgba(240,123,60,.06)'; c.fillRect(0, 0, Wd, Hd); }
      if (R.flash > 0) {   // a double flicker: on, a dip, on again, fading
        const f = R.flash, flick = f > .82 ? 1 : f > .7 ? .25 : f;
        c.fillStyle = `rgba(236,232,255,${(W.reduced ? .18 : .5) * flick})`; c.fillRect(0, 0, Wd, Hd);
      }
    };
    return R;
  };

  // ---------------------------------------------------------------- start
  W.init = function () {
    // after every script has loaded (map.js comes after game.js), so the Map's area can be found
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => W.refresh(), { once: true }); else setTimeout(() => W.refresh(), 0);
    setInterval(() => { if (document.visibilityState === 'visible') W.refresh(); }, 10 * 60e3);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') W.refresh(); });
  };
})();
