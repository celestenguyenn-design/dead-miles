/* Dead Miles: Homestead (v8) - camp, farm, activity, saves, sync, UI shell.
   The run + combat engine is run.js. Content is content.js.
   The old walking game (v7.71) lives on, untouched, in classic/. */
'use strict';
const VERSION = '8.0';
const SAVE_KEY = 'deadmiles.v8';
const OLD_KEY = 'deadmiles.v3';

/* ================= utils ================= */
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => Math.round(Number(n) || 0).toLocaleString('en-US');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const uid = () => Math.random().toString(36).slice(2, 10);
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function mulberry(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function todayStr(d = new Date()) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function dayOffset(n, d = new Date()) { const x = new Date(d); x.setDate(x.getDate() + n); return todayStr(x); }
function weekStart(d = new Date()) { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - (x.getDay() + 6) % 7); return x; }
function weekId(d = new Date()) { return todayStr(weekStart(d)); }
function pick(arr, r = Math.random) { return arr[Math.floor(r() * arr.length)]; }
function wpick(list, r = Math.random) { let t = 0; for (const x of list) t += x.w || 1; let v = r() * t; for (const x of list) { v -= x.w || 1; if (v <= 0) return x; } return list[list.length - 1]; }
function shuffle(a, r = Math.random) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function rint(a, b, r = Math.random) { return a + Math.floor(r() * (b - a + 1)); }
function dur(ms) { if (ms <= 0) return 'ready'; const m = Math.ceil(ms / 60000); if (m < 60) return m + 'm'; const h = Math.floor(m / 60); return h + 'h' + (m % 60 ? ' ' + (m % 60) + 'm' : ''); }
function ago(t) { const m = Math.round((Date.now() - t) / 60000); if (m < 1) return 'just now'; if (m < 60) return m + ' min ago'; const h = Math.round(m / 60); if (h < 48) return h + ' h ago'; return Math.round(h / 24) + ' days ago'; }
function plural(n, w, p) { return fmt(n) + ' ' + (Math.round(n) === 1 ? w : (p || w + 's')); }

/* ================= sound ================= */
const SFX = {
  ctx: null,
  play(k) {
    if (!S || !S.sfx) return;
    try {
      if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      const c = this.ctx, o = c.createOscillator(), g = c.createGain();
      const P = { ui: [520, .05, 'triangle'], hit: [140, .09, 'square'], block: [300, .07, 'sine'], coin: [880, .12, 'triangle'], win: [660, .3, 'triangle'], lose: [110, .5, 'sawtooth'], harvest: [740, .14, 'sine'], level: [990, .35, 'triangle'] }[k] || [440, .05, 'sine'];
      o.type = P[2]; o.frequency.value = P[0]; g.gain.value = .06;
      g.gain.exponentialRampToValueAtTime(.0001, c.currentTime + P[1]);
      if (k === 'win' || k === 'level') o.frequency.exponentialRampToValueAtTime(P[0] * 1.5, c.currentTime + P[1]);
      o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + P[1]);
    } catch (e) { }
  }
};

/* ================= state ================= */
let S = null;
function fresh() {
  return {
    v: 8, created: Date.now(), name: '', onboarded: false, av: ART.randomAv(), sfx: true,
    lvl: 1, xp: 0,
    scrap: 15, wood: 5,
    seeds: { radish: 3, potato: 2, carrot: 2 }, crops: {}, meals: {},
    plots: [], build: { plots: 0, walls: 0, bunk: 0, workshop: 0, greenhouse: 0, tower: 0, kennel: 0 },
    surv: [], waiting: [], pets: [], petActive: '',
    keepsakes: [], keepsake: '',
    beaten: {}, heat: {}, region: 'outskirts',
    torches: 1, torchDay: '', torchGrit: { date: '', n: 0 },
    act: { date: todayStr(), counted: 0, manual: 0, work: [] },
    hist: {},                     // date -> {steps, grit}
    streak: { days: 0, last: '', rests: 1 },
    idle: { last: Date.now(), scrap: 0, wood: 0 },
    morning: { date: '', evt: null, done: false, recap: null },
    daily: { date: '', list: [], prog: {} },
    horde: { week: '', res: null, first: weekId() },
    run: null,
    stats: { runs: 0, wins: 0, kills: 0, bosses: 0, harvests: 0, meals: 0, cards: 0, grit: 0, best: 0 },
    online: { handle: '', token: '', stepKey: '', ok: false, err: '', lastPull: 0, lastPush: 0 },
    log: [], seenNews: '',
  };
}
function ensure() {
  const f = fresh();
  for (const k in f) if (S[k] === undefined) S[k] = f[k];
  for (const k in f.build) if (S.build[k] === undefined) S.build[k] = 0;
  for (const k in f.stats) if (S.stats[k] === undefined) S.stats[k] = 0;
  while (S.plots.length < plotCount()) S.plots.push(null);
}
function save() { try { S.savedAt = Date.now(); localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { } pushSoon(); }
function load() { try { const r = localStorage.getItem(SAVE_KEY); if (r) { const o = JSON.parse(r); if (o && o.v === 8) return o; } } catch (e) { } return null; }
function log(m) { S.log.unshift({ t: Date.now(), m }); S.log = S.log.slice(0, 60); }
function toast(m, c) { const box = $('#toasts'); if (!box) return; while (box.children.length >= 3) box.firstChild.remove(); const t = document.createElement('div'); t.className = 'toast' + (c ? ' ' + c : ''); t.textContent = m; box.appendChild(t); setTimeout(() => t.remove(), 2800); }

/* Carry over what matters from the old game: you, your pets, your account. */
function importOld() {
  let o = null; try { o = JSON.parse(localStorage.getItem(OLD_KEY) || 'null'); } catch (e) { }
  if (!o || !o.onboarded) return null;
  try { localStorage.setItem('deadmiles.v3.before8', JSON.stringify(o)); } catch (e) { }
  const n = fresh();
  n.name = o.name || ''; if (o.av) n.av = o.av;
  n.pets = (o.pets || []).map(p => ({ id: p.id || uid(), kind: p.kind, coat: p.coat, name: p.name || pick(PET_NAMES[p.kind] || ['Buddy']) })).filter(p => PETS[p.kind]);
  if (!n.pets.length && o.pet) n.pets.push({ id: uid(), kind: o.pet, coat: o.petCoat, name: o.petName || pick(PET_NAMES[o.pet]) });
  n.petActive = (n.pets.find(p => p.id === o.petActive) || n.pets[0] || {}).id || '';
  if (o.online && o.online.handle) n.online = { handle: o.online.handle, token: o.online.token, stepKey: o.online.stepKey || '', ok: !!o.online.ok, err: '', lastPull: 0, lastPush: 0 };
  // a thank-you for the miles already walked
  const miles = (o.steps && o.steps.total) || 0;
  n.scrap += Math.min(300, Math.floor(miles / 5000));
  n.wood += Math.min(60, Math.floor(miles / 25000));
  n.imported = { at: Date.now(), steps: miles, lvl: o.lvl || 1 };
  return n;
}

/* ================= activity ================= */
function stepsToday() { const a = S.act; return (a.counted || 0) + (a.manual || 0); }
function workGrit(w) { return Math.round(w.min * (GRIT_PER_MIN[w.i] || 1)); }
function gritToday() { const a = S.act; return Math.floor(stepsToday() / GRIT_PER_STEPS) + a.work.reduce((s, w) => s + workGrit(w), 0); }
function vigorIdx(g = gritToday()) { let i = 0; VIGOR.forEach((v, k) => { if (g >= v.at) i = k; }); return i; }
function vigor() { return VIGOR[vigorIdx()]; }
function gritWeek() { const ws = weekId(); let t = 0; for (const [d, h] of Object.entries(S.hist)) if (d >= ws && d !== todayStr()) t += h.grit || 0; return t + gritToday(); }
let LAST_GRIT = null;
/* Every time today's activity changes: give XP for new grit, bonus torches, streak. */
function activityChanged(quiet) {
  const g = gritToday();
  const prev = (S.hist[todayStr()] && S.hist[todayStr()].grit) || 0;
  S.hist[todayStr()] = { steps: stepsToday(), grit: g, work: S.act.work.reduce((s, w) => s + w.min, 0) };
  if (g > prev) { addXp((g - prev) * 3); S.stats.grit += g - prev; }
  // bonus torches
  if (S.torchGrit.date !== todayStr()) S.torchGrit = { date: todayStr(), n: 0 };
  let earned = TORCH_GRIT.filter(t => g >= t).length;
  while (S.torchGrit.n < earned) { S.torchGrit.n++; S.torches++; if (!quiet) toast('🔥 +1 torch - you earned another run tonight', 'a'); log('Earned a torch from moving.'); }
  // streak
  if (g >= VIGOR[1].at && S.streak.last !== todayStr()) {
    const y = dayOffset(-1);
    S.streak.days = (S.streak.last === y) ? S.streak.days + 1 : 1;
    S.streak.last = todayStr();
    if (S.streak.days % 7 === 0) { S.streak.rests = Math.min(2, S.streak.rests + 1); if (!quiet) toast('A week strong. +1 rest day banked', 'a'); }
    if (!quiet) toast('🌱 Streak ' + S.streak.days, 'z');
  }
  const vi = vigorIdx(g);
  if (LAST_GRIT !== null && vi > vigorIdx(LAST_GRIT) && !quiet) { toast(VIGOR[vi].e + ' ' + VIGOR[vi].n + '! ' + VIGOR[vi].d, 'l'); SFX.play('level'); }
  LAST_GRIT = g;
  bountyProg('grit', 0);
}
function setCounted(n, src) {
  rollDay(); n = Math.floor(n); if (!(n >= 0)) return false;
  if (n <= (S.act.counted || 0)) return false;
  S.act.counted = n; S.act.src = src || 'phone';
  activityChanged(); save(); render(); return true;
}
function addManualSteps(n) { rollDay(); n = Math.floor(n); if (!(n > 0) || n > 60000) { toast('That does not look like a step count'); return; } S.act.manual += n; log('Added ' + fmt(n) + ' steps by hand.'); activityChanged(); save(); render(); }
function addWorkout(type, min) {
  rollDay(); min = Math.floor(min); const W = WORKOUTS.find(w => w.id === type); if (!W) return;
  if (!(min > 0) || min > 300) { toast('Minutes between 1 and 300'); return; }
  const w = { id: type, i: W.i, min, at: Date.now() };
  S.act.work.push(w); log(W.e + ' ' + W.n + ', ' + min + ' min: +' + workGrit(w) + ' grit.');
  toast(W.e + ' +' + workGrit(w) + ' grit', 'z'); activityChanged(); save(); closeSheet(); render();
}
function removeWorkout(i) { const w = S.act.work[i]; if (!w) return; S.act.work.splice(i, 1); const h = S.hist[todayStr()]; if (h) h.grit = gritToday(); save(); render(); }
function backfillDay(date, steps) {
  const h = S.hist[date] || { steps: 0, grit: 0, work: 0 };
  if (steps <= (h.steps || 0)) return;
  const before = h.grit || 0; h.steps = steps;
  h.grit = Math.floor(steps / GRIT_PER_STEPS) + Math.round((h.workGrit || 0));
  S.hist[date] = h; if (h.grit > before) { addXp((h.grit - before) * 3); S.stats.grit += h.grit - before; }
  // the phone sent yesterday late: it still counts for the streak
  if (date === dayOffset(-1) && h.grit >= VIGOR[1].at && (!S.streak.last || S.streak.last < date)) {
    S.streak.days = (S.streak.last === dayOffset(-2)) ? S.streak.days + 1 : 1; S.streak.last = date;
  }
}

/* ================= levels ================= */
function xpNeed(l = S.lvl) { return 60 + l * 40; }
function addXp(n) {
  S.xp += Math.round(n);
  while (S.xp >= xpNeed()) { S.xp -= xpNeed(); S.lvl++; log('Level ' + S.lvl + '. Max HP ' + baseMaxHp() + '.'); toast('⬆ Level ' + S.lvl + ' - max HP ' + baseMaxHp(), 'l'); SFX.play('level'); }
}
function baseMaxHp() { return 40 + (S.lvl - 1) * 5; }
function title() { return TITLES[Math.min(TITLES.length - 1, Math.floor((S.lvl - 1) / 4))]; }

/* ================= days, mornings, torches ================= */
function rollDay() {
  const t = todayStr();
  if (S.act.date !== t) {
    // close out the old day
    const old = S.act.date;
    if (old) S.hist[old] = Object.assign(S.hist[old] || {}, { steps: (S.act.counted || 0) + (S.act.manual || 0), grit: (S.hist[old] && S.hist[old].grit) || 0 });
    S.act = { date: t, counted: 0, manual: 0, work: [] };
    LAST_GRIT = 0;
    // forgiving streak: a missed day spends a banked rest day
    if (S.streak.days && S.streak.last && S.streak.last < dayOffset(-1)) {
      const missed = Math.round((new Date(t) - new Date(S.streak.last)) / 864e5) - 1;
      if (missed <= S.streak.rests) { S.streak.rests -= missed; S.streak.last = dayOffset(-1); log('Rest day used. Your streak is safe.'); }
      else S.streak.days = 0;
    }
    // trim history to 90 days
    const keys = Object.keys(S.hist).sort(); while (keys.length > 90) delete S.hist[keys.shift()];
  }
  if (S.torchDay !== t) {
    S.torchDay = t;
    if (S.torches < TORCH_FREE_CAP) S.torches++;
  }
  if (S.daily.date !== t) newBounties();
  if (S.morning.date !== t) newMorning();
  checkHorde();
}
function nightFor(date) { const r = mulberry(hash('night' + date)); return wpick(NIGHTS.map(n => ({ ...n, w: n.id === 'clear' ? 2 : 1 })), r); }
function tonight() { return nightFor(todayStr()); }

/* ================= farm ================= */
function plotCount() { return 4 + 2 * (S.build.plots || 0); }
function growMs(crop, plantedDate) {
  let m = CROPS[crop].h * 3600e3;
  let speed = 1 + 0.15 * (S.build.greenhouse || 0);
  if (nightFor(plantedDate || todayStr()).grow) speed += nightFor(plantedDate || todayStr()).grow;
  return m / speed;
}
function plotReady(p) { return p && Date.now() >= p.at + p.ms; }
function plant(i, crop) {
  if (!CROPS[crop] || !(S.seeds[crop] > 0) || S.plots[i]) return;
  S.seeds[crop]--; S.plots[i] = { c: crop, at: Date.now(), ms: growMs(crop) };
  bountyProg('plant', 1); SFX.play('ui'); save(); closeSheet(); render();
}
function plantAll(crop) {
  let n = 0;
  for (let i = 0; i < S.plots.length; i++) if (!S.plots[i] && S.seeds[crop] > 0) { S.seeds[crop]--; S.plots[i] = { c: crop, at: Date.now(), ms: growMs(crop) }; n++; }
  if (n) { bountyProg('plant', n); toast('Planted ' + plural(n, CROPS[crop].n.toLowerCase())); }
  save(); closeSheet(); render();
}
function hasJob(j) { return S.surv.some(s => s.job === j); }
function harvest(i, quiet) {
  const p = S.plots[i]; if (!plotReady(p)) return 0;
  const C = CROPS[p.c];
  let y = C.y * vigor().mult * (hasJob('farm') ? 1.15 : 1) + (hasCampCharm('trowel') ? 1 : 0);
  y = Math.max(1, Math.round(y + (Math.random() - 0.5) * 0.8));
  S.crops[p.c] = (S.crops[p.c] || 0) + y;
  if (Math.random() < C.s) S.seeds[p.c] = (S.seeds[p.c] || 0) + 1;
  S.plots[i] = null;
  if (hasJob('farm') && S.seeds[p.c] > 0) { S.seeds[p.c]--; S.plots[i] = { c: p.c, at: Date.now(), ms: growMs(p.c) }; }
  S.stats.harvests += y; bountyProg('harvest', y);
  if (!quiet) { toast(C.e + ' +' + y + ' ' + C.n.toLowerCase(), 'z'); SFX.play('harvest'); save(); render(); }
  return y;
}
function harvestAll() {
  let n = 0; for (let i = 0; i < S.plots.length; i++) if (plotReady(S.plots[i])) n += harvest(i, true);
  if (n) { toast('Harvested ' + n + ' crops' + (vigorIdx() ? ' (' + vigor().e + ' bonus)' : ''), 'z'); SFX.play('harvest'); }
  save(); render();
}
function canCook(m) { const M = MEALS[m]; return Object.entries(M.need).every(([c, n]) => (S.crops[c] || 0) >= n); }
function cook(m) {
  if (!canCook(m)) return; const M = MEALS[m];
  for (const [c, n] of Object.entries(M.need)) S.crops[c] -= n;
  const n = hasJob('cook') ? 2 : 1; S.meals[m] = (S.meals[m] || 0) + n;
  S.stats.meals += n; bountyProg('cook', 1);
  toast(M.e + ' ' + M.n + (n > 1 ? ' x2' : ''), 'z'); SFX.play('coin'); save(); render();
}
function sellCrop(c, n) { n = Math.min(n, S.crops[c] || 0); if (!n) return; S.crops[c] -= n; const g = n * CROPS[c].sell; S.scrap += g; toast('+' + g + ' scrap', 'a'); SFX.play('coin'); save(); render(); }

/* ================= camp ================= */
function buildCost(id) { const B = BUILDINGS[id]; return B.lv[S.build[id] || 0] || null; }
function costOk(c) { return c && (S.scrap >= (c.scrap || 0)) && (S.wood >= (c.wood || 0)); }
function costText(c) { return [c.wood ? c.wood + ' 🪵' : '', c.scrap ? c.scrap + ' ⚙️' : ''].filter(Boolean).join(' · '); }
function upgrade(id) {
  const c = buildCost(id); if (!costOk(c)) { toast('Not enough materials'); return; }
  S.scrap -= c.scrap || 0; S.wood -= c.wood || 0; S.build[id] = (S.build[id] || 0) + 1;
  if (id === 'plots') while (S.plots.length < plotCount()) S.plots.push(null);
  if (id === 'bunk') admitWaiting();
  log(BUILDINGS[id].n + ' level ' + S.build[id] + '.'); toast(BUILDINGS[id].e + ' ' + BUILDINGS[id].n + ' ' + (S.build[id] > 1 ? 'upgraded' : 'built'), 'l');
  bountyProg('build', 1); SFX.play('win'); save(); render();
}
function survCap() { return 2 + 2 * (S.build.bunk || 0); }
function newSurvivor(r = Math.random) {
  const used = new Set(S.surv.map(s => s.name).concat(S.waiting.map(s => s.name)));
  const names = SURV_NAMES.filter(n => !used.has(n));
  const av = ART.randomAv(); av.top = pick(['hoodie', 'flannel', 'raincoat', 'varsity', 'sweater', 'overalls'].filter(t => ART.TOPS[t]).concat(['hoodie']), r);
  return { id: uid(), name: pick(names.length ? names : SURV_NAMES, r), past: pick(SURV_PAST, r), likes: pick(SURV_LIKES, r), job: 'idle', hearts: 0, hx: 0, gift: '', av, joined: Date.now() };
}
function addSurvivor(s) {
  if (S.surv.length < survCap()) { S.surv.push(s); log(s.name + ' moved into camp.'); return true; }
  S.waiting.push(s); log(s.name + ' is camping in the barn until there is a bunk.'); return false;
}
function admitWaiting() { while (S.waiting.length && S.surv.length < survCap()) { const s = S.waiting.shift(); S.surv.push(s); toast(s.name + ' moved into a bunk', 'z'); } }
function setJob(id, job) { const s = S.surv.find(x => x.id === id); if (!s || !JOBS[job]) return; collectIdle(true); s.job = job; save(); closeSheet(); render(); }
function heartNeed(h) { return 2 + h * 2; }
function giveGift(id, crop) {
  const s = S.surv.find(x => x.id === id); if (!s || !(S.crops[crop] > 0)) return;
  if (s.gift === todayStr()) { toast(s.name + ' already got a gift today'); return; }
  S.crops[crop]--; s.gift = todayStr();
  const loved = s.likes === crop; let gain = loved ? 3 : 1; if (s.job === 'idle') gain++;
  heartXp(s, gain);
  toast(loved ? s.name + ' loves ' + CROPS[crop].n.toLowerCase() + '! 💛' : s.name + ' says thanks', 'z');
  bountyProg('gift', 1); save(); closeSheet(); render();
}
function heartXp(s, n) {
  if (s.hearts >= 5) return; s.hx += n;
  while (s.hearts < 5 && s.hx >= heartNeed(s.hearts)) {
    s.hx -= heartNeed(s.hearts); s.hearts++;
    log('💛 ' + storyLine(s, s.hearts - 1));
    if (s.hearts === 5) { const g = HEART_GIFT[s.job] || 'locket'; s.gave = g; toast(s.name + ' gave you ' + CHARMS[g].n + '!', 'l'); log(s.name + ' gave you ' + CHARMS[g].n + '. ' + CHARMS[g].d); SFX.play('level'); }
    else toast('💛 ' + s.name + ' - heart ' + s.hearts, 'l');
  }
}
function storyLine(s, i) { return SURV_STORY[i].replace('{n}', s.name).replace('{p}', s.past); }
function hasCampCharm(id) { return S.surv.some(s => s.hearts >= 5 && s.gave === id); }
function campCharms() { return S.surv.filter(s => s.hearts >= 5 && s.gave).map(s => s.gave); }

/* Idle work: scavengers and woodcutters bring things back every hour,
   up to a day's worth. Collect it whenever. Moving today boosts it. */
const IDLE_CAP_H = 24;
function idleRate() {
  let scrap = 0, wood = 0;
  for (const s of S.surv) { const b = 1 + 0.1 * s.hearts; if (s.job === 'scav') scrap += 2.5 * b; if (s.job === 'wood') wood += 1.6 * b; }
  const pet = activePet(); if (pet && pet.kind === 'dog') scrap += 0.4 * (1 + (S.build.kennel || 0));
  return { scrap, wood };
}
function tickIdle() {
  const now = Date.now(); const i = S.idle; const h = Math.min(IDLE_CAP_H, (now - (i.last || now)) / 3600e3);
  const r = idleRate(); const cap = { scrap: r.scrap * IDLE_CAP_H, wood: r.wood * IDLE_CAP_H };
  i.scrap = Math.min(cap.scrap, i.scrap + r.scrap * h); i.wood = Math.min(cap.wood, i.wood + r.wood * h); i.last = now;
}
function collectIdle(quiet) {
  tickIdle(); const m = vigor().mult * (hasCampCharm('magpie') ? 1.25 : 1);
  const sc = Math.floor(S.idle.scrap * m), wd = Math.floor(S.idle.wood * vigor().mult);
  if (!sc && !wd) { if (!quiet) toast('Nothing to collect yet'); return; }
  S.scrap += sc; S.wood += wd; S.idle.scrap -= sc / m; S.idle.wood -= wd / vigor().mult;
  if (S.idle.scrap < 0) S.idle.scrap = 0; if (S.idle.wood < 0) S.idle.wood = 0;
  if (!quiet) { toast('+' + sc + ' ⚙️  +' + wd + ' 🪵', 'a'); SFX.play('coin'); }
  save(); if (!quiet) render();
}

/* ================= pets ================= */
function activePet() { return S.pets.find(p => p.id === S.petActive) || null; }
function setPet(id) { if (!S.pets.find(p => p.id === id)) return; S.petActive = id; save(); closeSheet(); render(); }
function petJoin(kind) {
  const coat = ART.randomCoat ? ART.randomCoat(kind) : undefined;
  const p = { id: uid(), kind, coat, name: pick(PET_NAMES[kind]) };
  S.pets.push(p); if (!S.petActive) S.petActive = p.id; log('A ' + PETS[kind].n.toLowerCase() + ' joined you. You named it ' + p.name + '.');
  return p;
}
function askText(title, val, max, done) { window._askDone = done; openSheet(`<h2>${esc(title)}</h2><input id="askIn" maxlength="${max}" value="${esc(val)}" style="width:100%"><button class="btn r wide" onclick="const v=($('#askIn').value||'').trim();if(v){window._askDone(v.slice(0,${max}));}closeSheet()">Save</button>`); setTimeout(() => { const i = $('#askIn'); if (i) { i.focus(); i.select(); } }, 50); }
function renamePet(id) { const p = S.pets.find(x => x.id === id); if (!p) return; askText('Name your ' + PETS[p.kind].n.toLowerCase(), p.name, 14, n => { p.name = n; save(); render(); }); }
function petSVG(p, size) { try { return ART.petSVG(p.kind, size, p.coat); } catch (e) { return '<span style="font-size:' + (size / 2) + 'px">' + PETS[p.kind].e + '</span>'; } }

/* ================= mornings ================= */
function newMorning() {
  const r = mulberry(hash('morn' + todayStr() + S.created));
  const recap = { idle: null, pet: null };
  // pet gifts
  const pet = activePet();
  if (pet && pet.kind === 'cat' && r() < 0.7 + 0.15 * (S.build.kennel || 0)) {
    const g = r() < 0.5 ? { scrap: rint(3, 8, r) } : { seed: pick(regionSeeds(), r) };
    if (g.scrap) S.scrap += g.scrap; else S.seeds[g.seed] = (S.seeds[g.seed] || 0) + 1;
    recap.pet = pet.name + ' left ' + (g.scrap ? g.scrap + ' scrap' : 'a ' + CROPS[g.seed].n.toLowerCase() + ' seed') + ' on the porch.';
  }
  const first = !S.morning.date;
  let evt = first ? null : wpick(MORNINGS, r);
  if (evt && evt.id === 'stray' && S.pets.length >= 6) evt = MORNINGS[0];
  if (evt && evt.id === 'knock' && S.surv.length + S.waiting.length >= survCap() + 2) evt = MORNINGS[4];
  S.morning = { date: todayStr(), evt: evt ? morningDetail(evt, r) : null, done: false, recap, seen: false };
}
function regionSeeds() { const out = new Set(); for (const R of REGIONS) if (regionOpen(R.id)) R.seeds.forEach(s => out.add(s)); return [...out]; }
function morningDetail(evt, r) {
  const e = { id: evt.id, n: evt.n, e: evt.e };
  if (evt.id === 'trader') {
    const seed = pick(regionSeeds().filter(s => CROPS[s].r !== 'common').concat(['beans', 'corn']), r);
    e.offers = [
      { t: '3 ' + CROPS[seed].n.toLowerCase() + ' seeds', cost: { scrap: 12 + CROPS[seed].sell * 2 }, get: { seeds: { [seed]: 3 } } },
      { t: '15 wood', cost: { scrap: 18 }, get: { wood: 15 } },
      { t: 'A torch', cost: { scrap: 35 }, get: { torch: 1 } },
    ];
  }
  if (evt.id === 'storm') e.wood = rint(5, 10, r);
  if (evt.id === 'seeds') e.seeds = [pick(regionSeeds(), r), pick(regionSeeds(), r)];
  if (evt.id === 'radio') { e.line = pick(RADIO, r); e.scrap = rint(2, 5, r); }
  if (evt.id === 'stray') e.kind = r() < 0.5 ? 'dog' : 'cat';
  if (evt.id === 'knock') e.surv = newSurvivor(r);
  if (evt.id === 'shambler') e.scrap = rint(5, 9, r);
  if (evt.id === 'gift') { const s = S.surv.length ? pick(S.surv, r) : null; e.from = s ? s.name : 'Someone'; e.give = r() < 0.5 ? { scrap: rint(6, 12, r) } : { seed: pick(regionSeeds(), r) }; }
  if (evt.id === 'deer') e.wood = 2;
  return e;
}
function morningAct(choice) {
  const m = S.morning, e = m.evt; if (!e || m.done && e.id !== 'trader') return;
  if (e.id === 'trader') {
    const o = e.offers[choice]; if (!o || o.bought) return; if (!costOk(o.cost)) { toast('Not enough scrap'); return; }
    S.scrap -= o.cost.scrap || 0; o.bought = true;
    if (o.get.seeds) for (const [k, v] of Object.entries(o.get.seeds)) S.seeds[k] = (S.seeds[k] || 0) + v;
    if (o.get.wood) S.wood += o.get.wood; if (o.get.torch) S.torches += o.get.torch;
    toast('Bought ' + o.t, 'a'); SFX.play('coin'); save(); render(); return;
  }
  m.done = true;
  if (e.id === 'storm') { S.wood += e.wood; toast('+' + e.wood + ' 🪵 from fallen branches', 'a'); }
  if (e.id === 'seeds') { for (const s of e.seeds) S.seeds[s] = (S.seeds[s] || 0) + 1; toast('+2 seeds', 'a'); }
  if (e.id === 'radio') { S.scrap += e.scrap; }
  if (e.id === 'stray') { if (choice === 0) { const p = petJoin(e.kind); toast(p.name + ' the ' + PETS[e.kind].n.toLowerCase() + ' moved in!', 'l'); } else { S.scrap += 6; toast('A neighbor took them in. +6 scrap', 'a'); } }
  if (e.id === 'knock') { if (choice === 0) { addSurvivor(e.surv); toast(e.surv.name + ' joined the camp', 'l'); } else { S.scrap += 4; toast('They left you 4 scrap for the water', 'a'); } }
  if (e.id === 'shambler') { S.scrap += e.scrap; toast('+' + e.scrap + ' scrap from its pockets', 'a'); }
  if (e.id === 'gift') { if (e.give.scrap) S.scrap += e.give.scrap; else S.seeds[e.give.seed] = (S.seeds[e.give.seed] || 0) + 1; }
  if (e.id === 'deer') { if (choice === 0) { S.surv.forEach(s => heartXp(s, 1)); toast('The camp watched them graze. Everyone feels better. 💛', 'z'); } else { S.wood += e.wood; toast('They bolted and knocked down a branch. +2 🪵'); } }
  SFX.play('ui'); save(); render();
}

/* ================= bounties ================= */
function newBounties() {
  const r = mulberry(hash('bounty' + todayStr() + S.created));
  const pool = BOUNTIES.slice(); shuffle(pool, r);
  const list = []; const hasGrit = pool.find(b => b.id === 'grit');
  for (const b of pool) { if (list.length >= 3) break; if (b.id === 'gift' && !S.surv.length) continue; if (b.id === 'grit') continue; list.push({ id: b.id, n: pick(b.n, r), r: b.r, done: false }); }
  // one activity bounty most days - optional, never the only way to earn anything
  if (r() < 0.7) list[2] = { id: 'grit', n: pick(hasGrit.n, r), r: hasGrit.r, done: false };
  S.daily = { date: todayStr(), list, prog: {} };
}
function bountyProg(id, n) { if (!S.daily || S.daily.date !== todayStr()) return; if (id === 'grit') { S.daily.prog.grit = gritToday(); return; } if (id === 'floor') { S.daily.prog.floor = Math.max(S.daily.prog.floor || 0, n); return; } S.daily.prog[id] = (S.daily.prog[id] || 0) + n; }
function bountyText(b) { return BOUNTIES.find(x => x.id === b.id).d.replace('{n}', b.n); }
function bountyHave(b) { return Math.min(b.n, S.daily.prog[b.id] || 0); }
function rewardText(r) { return Object.entries(r).map(([k, v]) => k === 'scrap' ? v + ' ⚙️' : k === 'wood' ? v + ' 🪵' : k === 'torch' ? v + ' 🔥 torch' : k === 'seedRare' ? 'rare seeds' : k).join(' '); }
function claimBounty(i) {
  const b = S.daily.list[i]; if (!b || b.done || bountyHave(b) < b.n) return; b.done = true;
  const r = b.r; if (r.scrap) S.scrap += r.scrap; if (r.wood) S.wood += r.wood; if (r.torch) S.torches += r.torch;
  if (r.seedRare) { const s = pick(regionSeeds().filter(x => CROPS[x].r !== 'common').concat(['corn'])); S.seeds[s] = (S.seeds[s] || 0) + 2; }
  addXp(25); toast('Bounty done: ' + rewardText(r), 'a'); SFX.play('coin');
  if (S.daily.list.every(x => x.done)) { S.scrap += 15; S.torches++; toast('All three! +15 ⚙️ and a torch', 'l'); }
  save(); render();
}

/* ================= the Sunday horde ================= */
function hordeAt(d = new Date()) { const w = weekStart(d); w.setDate(w.getDate() + 6); w.setHours(20, 0, 0, 0); return w.getTime(); }
function weeksPlayed() { return Math.max(0, Math.round((weekStart() - new Date(S.horde.first)) / (7 * 864e5))); }
function hordeStrength() { const prog = Object.keys(S.beaten).length; return Math.round(18 + weeksPlayed() * 8 + prog * 10); }
function defense() {
  let d = (S.build.walls || 0) * 12 + (S.build.tower || 0) * 6 + S.lvl * 2;
  for (const s of S.surv) if (s.job === 'guard') d += 8 + 2 * s.hearts;
  if (hasCampCharm('badge')) d += 15;
  const p = activePet(); if (p && p.kind === 'dog') d += 4;
  return d;
}
function checkHorde() {
  const now = Date.now();
  // The horde for the week that just ended, if we have not resolved it yet.
  const thisWeek = weekId(); const at = hordeAt();
  let wk = null;
  if (now >= at && S.horde.week !== thisWeek && S.created < at) wk = thisWeek;
  else { const lastWk = weekId(new Date(weekStart().getTime() - 864e5)); if (S.horde.week < lastWk && S.horde.first <= lastWk && S.onboarded) wk = lastWk; }
  if (!wk) return;
  const str = hordeStrength(), def = defense();
  const ratio = def / str; let res;
  if (ratio >= 1) { const sc = 30 + str, wd = 15 + Math.round(str / 3); S.scrap += sc; S.wood += wd; S.torches++; const seed = pick(['pumpkin', 'garlic', 'berry', 'corn']); S.seeds[seed] = (S.seeds[seed] || 0) + 2; res = { k: 'win', str, def, t: 'The walls held. They broke on the fence and went home hungry.', got: '+' + sc + ' ⚙️ +' + wd + ' 🪵 +2 ' + CROPS[seed].n.toLowerCase() + ' seeds +1 🔥' }; S.surv.forEach(s => heartXp(s, 1)); }
  else if (ratio >= 0.6) { const sc = Math.round((15 + str) / 2); S.scrap += sc; res = { k: 'hold', str, def, t: 'A long night. They got over the fence in places, but you pushed them out by dawn.', got: '+' + sc + ' ⚙️' }; }
  else { const lose = Math.min(30, Math.floor(S.scrap * 0.2)); S.scrap -= lose; let lost = 0; for (let i = 0; i < S.plots.length; i++) if (S.plots[i] && Math.random() < 0.4) { S.plots[i] = null; lost++; } res = { k: 'lose', str, def, t: 'They overran the yard. Everyone hid in the farmhouse until it was over. Nobody was hurt.', got: '-' + lose + ' ⚙️' + (lost ? ', ' + lost + ' crops trampled' : '') }; }
  S.horde.week = wk; S.horde.res = Object.assign(res, { week: wk, seen: false });
  log('Horde night: ' + res.t);
}

/* ================= regions ================= */
function regionOpen(id) { const i = REGIONS.findIndex(r => r.id === id); return i === 0 || !!S.beaten[REGIONS[i - 1].id]; }
function heatMax(id) { return S.beaten[id] ? Math.min(10, (S.heat[id] || 0) + 1) : 0; }

/* ================= online: step sync + cloud save ================= */
const SB = { url: 'https://edejxfcsjqwedbgulygi.supabase.co', key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkZWp4ZmNzanF3ZWRiZ3VseWdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0NTExMzEsImV4cCI6MjEwNTAyNzEzMX0.Z0T954DSwTVlRM37i_fJLVtu_x2IrdOoJMx6ImInVKI' };
async function rpc(fn, args) {
  const r = await fetch(SB.url + '/rest/v1/rpc/' + fn, { method: 'POST', headers: { apikey: SB.key, Authorization: 'Bearer ' + SB.key, 'Content-Type': 'application/json' }, body: JSON.stringify(args || {}) });
  const t = await r.text(); if (!r.ok) throw new Error(fn + ' failed (' + r.status + '): ' + t.slice(0, 160)); return t ? JSON.parse(t) : null;
}
const O = () => S.online;
function slug(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 20); }
async function goOnline(handle, token) {
  const o = O(); handle = slug(handle || S.name); if (!handle) { toast('Pick a handle first'); return; }
  if (token && token.trim()) o.token = token.trim(); if (!o.token) o.token = uid() + uid() + uid();
  try {
    const ok = await rpc('register_player', { p_handle: handle, p_token: o.token, p_name: S.name || handle });
    if (!ok) { o.ok = false; o.err = 'The handle "' + handle + '" is taken. If it is yours, paste your account key from the other device.'; toast(o.err, 'd'); save(); render(); return; }
    o.handle = handle; o.ok = true; o.err = ''; toast('Online as @' + handle, 'z');
    if (token && token.trim()) await offerCloudRestore();
    save(); render(); await pushPlayer(); await pullSteps(); await fetchStepKey();
  } catch (e) { o.ok = false; o.err = e.message; save(); render(); }
}
async function offerCloudRestore() {
  const o = O(); let b = null;
  try { b = await rpc('get_my_state', { p_handle: o.handle, p_token: o.token }); } catch (e) { }
  const st = b && (b.state || b); const s8 = st && st.private && st.private.save8;
  if (s8 && s8.v === 8 && (s8.savedAt || 0) > (S.savedAt || 0) + 60000) {
    openSheet(`<h2>Found a newer save</h2><p>Level ${s8.lvl}, ${fmt(s8.scrap)} scrap, ${s8.surv.length} survivors. Saved ${ago(s8.savedAt || 0)}.</p>
      <div class="row"><button class="btn r" onclick="restoreCloud()">Use the cloud save</button><button class="btn ghost" onclick="closeSheet()">Keep this one</button></div>`);
    window._cloud8 = s8;
  }
}
function restoreCloud() { const s8 = window._cloud8; if (!s8) return; try { localStorage.setItem('deadmiles.v8.backup', JSON.stringify(S)); } catch (e) { } const keep = S.online; S = s8; S.online = keep; S.run = s8.run || null; ensure(); save(); closeSheet(); render(); toast('Save restored', 'z'); }
function publicState() {
  const c = JSON.parse(JSON.stringify(S)); delete c.online; delete c.log;
  const pet = activePet();
  return {
    private: { save8: c },
    public: {
      v: 8, name: S.name, av: S.av, lvl: S.lvl, title: title(), region: (REGIONS.find(r => r.id === bestRegion()) || REGIONS[0]).n,
      steps_today: stepsToday(), grit_today: gritToday(), grit_week: gritWeek(), vigor: vigorIdx(),
      // push-send.js reads these: goal (in steps) + streak for the evening nudge,
      // horde_next + defense for the Sunday warning.
      goal: VIGOR[1].at * GRIT_PER_STEPS, streak: S.streak.last === todayStr() ? 0 : S.streak.days,
      horde_next: hordeAt(), horde_str: hordeStrength(), defense: defense(), raid_hour: -1,
      survivors: S.surv.length, wins: S.stats.wins, bosses: S.stats.bosses,
      pet: pet ? pet.kind : null, petCoat: pet ? pet.coat : null, petName: pet ? pet.name : '',
    }
  };
}
function bestRegion() { let b = 'outskirts'; for (const R of REGIONS) if (regionOpen(R.id)) b = R.id; return b; }
let pushT = 0;
function pushSoon() { clearTimeout(pushT); pushT = setTimeout(() => pushPlayer(), 8000); }
async function pushPlayer() {
  const o = O(); if (!o || !o.ok || !S.onboarded) return;
  try {
    const ok = await rpc('save_player', { p_handle: o.handle, p_token: o.token, p_name: S.name, p_tier: 0, p_week: weekId(), p_score: gritWeek(), p_state: publicState() });
    if (ok === false) { o.ok = false; o.err = 'Signed out: this device\'s account key is out of date.'; }
    else { o.err = ''; o.lastPush = Date.now(); }
  } catch (e) { o.err = e.message; }
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { }
}
async function pullSteps() {
  const o = O(); if (!o.ok) return;
  const since = new Date(); since.setHours(0, 0, 0, 0); since.setDate(since.getDate() - 1);
  try {
    const rows = await rpc('get_steps', { p_handle: o.handle, p_token: o.token, p_since: since.toISOString() }); o.lastPull = Date.now();
    const t0 = todayStr(), yd = dayOffset(-1);
    const day = r => todayStr(new Date(r.posted_at));
    const today = (rows || []).filter(r => day(r) === t0), yest = (rows || []).filter(r => day(r) === yd);
    if (yest.length) backfillDay(yd, Math.max(...yest.map(r => r.steps)));
    if (today.length) { o.lastPost = new Date(today[0].posted_at).getTime(); setCounted(Math.max(...today.map(r => r.steps)), 'phone'); }
    o.err = '';
  } catch (e) { o.err = e.message; }
  save(); render();
}
async function fetchStepKey() { const o = O(); if (!o.ok) return; try { const k = await rpc('get_step_key', { p_handle: o.handle, p_token: o.token }); if (k) { o.stepKey = k; save(); } } catch (e) { } }
function stepCode() { const o = O(); return o.handle + '|' + (o.stepKey || o.token) + '|'; }
let friends = [];
async function loadFriends() {
  const o = O(); if (!o.ok) return;
  try { const fr = await rpc('get_board', { p_week: weekId() }); friends = Array.isArray(fr) ? fr : []; } catch (e) { o.err = e.message; }
  if (TAB === 'me') render();
}
/* An iPhone Shortcut can open the game with ?k=handle|key|&steps=N. Post it. */
function urlParam(n) { try { const q = new URLSearchParams(location.search); const h = new URLSearchParams(location.hash.replace(/^#/, '')); return q.get(n) !== null ? q.get(n) : h.get(n); } catch (e) { return null; } }
async function stepsBeacon() {
  const k = urlParam('k'); const v = parseInt(String(urlParam('steps') || '').replace(/[^0-9]/g, ''), 10);
  if (!k || !(v >= 0) || v >= 1000000) return;
  try { history.replaceState(null, '', location.pathname); } catch (e) { }
  const mine = (O().handle || '').toLowerCase() === String(k).split('|')[0].toLowerCase();
  if (mine) setCounted(v, 'shortcut');
  try { await rpc('post_steps_link', { p: k + '|' + v }); toast(fmt(v) + ' steps sent', 'z'); } catch (e) { toast('Could not send steps: ' + e.message, 'd'); }
}
function shortcutSpec() {
  return 'Build an iOS Shortcut named "Dead Miles Steps" with exactly these actions:\n\n'
    + '1. Find Health Samples\n   Type: Steps\n   Filter: Start Date is today\n   Group by: Day\n'
    + '2. Calculate Statistics: Sum of the Health Samples\n'
    + '3. Set Variable: name it Today, set it to the Sum\n'
    + '4. Get Contents of URL\n   URL: ' + SB.url + '/rest/v1/rpc/post_steps_link?apikey=' + SB.key + '\n'
    + '   Method: POST\n   Request Body: JSON\n   One text field:\n     Key: p\n     Value: ' + stepCode() + ' immediately followed by the variable Today, no space\n'
    + '5. Show Result: the Contents of URL\n\n'
    + 'Then add a Personal Automation that runs it every few hours.';
}

/* ================= UI shell ================= */
let TAB = 'today';
function go(t) { TAB = t; SFX.play('ui'); render(); window.scrollTo(0, 0); }
function openSheet(html, wide) { const s = $('#sheet'); s.innerHTML = '<div class="sheetin' + (wide ? ' wide' : '') + '"><button class="x" onclick="closeSheet()" aria-label="Close">✕</button>' + html + '</div>'; s.hidden = false; }
function closeSheet() { const s = $('#sheet'); s.hidden = true; s.innerHTML = ''; }
function bar(v, max, cls) { const p = clamp(max ? v / max * 100 : 0, 0, 100); return `<div class="bar ${cls || ''}"><i style="width:${p}%"></i></div>`; }
function render() {
  if (!S) return;
  if (!S.onboarded) { renderOnboard(); return; }
  tickIdle();
  renderTop();
  document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.t === TAB));
  const m = $('#main');
  if (S.run && TAB === 'run') { m.innerHTML = renderRun(); return; }
  m.innerHTML = ({ today: renderToday, farm: renderFarm, camp: renderCamp, run: renderRunPick, me: renderMe })[TAB]();
}
function renderTop() {
  const g = gritToday(), vi = vigorIdx(g), nx = VIGOR[vi + 1];
  $('#top').innerHTML = `<div class="who" onclick="go('me')">${ART.avatarSVG(S.av, 38)}<div><b>${esc(S.name)}</b><small>Lv ${S.lvl} · ${esc(title())}</small></div></div>
    <div class="res"><span title="scrap">⚙️ ${fmt(S.scrap)}</span><span title="wood">🪵 ${fmt(S.wood)}</span><span title="torches - one run each">🔥 ${S.torches}</span></div>
    <button class="vig v${vi}" onclick="openActivity()" title="Today's grit"><span>${VIGOR[vi].e} ${g}</span><small>${nx ? (nx.at - g) + ' to ' + nx.n : 'max'}</small></button>`;
  const n = $('#tabRunDot'); if (n) n.hidden = !S.run;
}

/* ---------- onboarding ---------- */
let OB = { step: 0 };
function renderOnboard() {
  $('#top').innerHTML = ''; document.querySelector('.tabs').hidden = true;
  const m = $('#main');
  if (OB.step === 0) {
    m.innerHTML = `<div class="ob"><div class="obhero">🌾🧟🏡</div><h1>Dead Miles<small>Homestead</small></h1>
      <p>The world ended. Your farm didn't.</p>
      <div class="card"><p><b>Move in real life.</b> Steps and workouts give you <b>grit</b>. Grit makes your harvests bigger, earns extra runs and levels you up.</p>
      <p><b>Everything else is free.</b> The farm, the camp and travel never cost steps. A rest day is still a full game.</p>
      <p><b>About 15 minutes a day:</b> check the farm, cook, then take one short run through the dead county and see what you bring home.</p></div>
      ${S.imported ? `<div class="card amber"><b>Welcome back.</b> Your look${S.pets.length ? ', your ' + plural(S.pets.length, 'pet') : ''} and your step sync came over from the old game. ${fmt(S.imported.steps)} lifetime steps became a head start: ${S.scrap} scrap and ${S.wood} wood.</div>` : ''}
      <label class="lab">What do people call you?</label><input id="obName" maxlength="16" value="${esc(S.name)}" placeholder="Name">
      <button class="btn r wide" onclick="obNext()">Start the farm</button>
      <p class="help" style="text-align:center;margin-top:14px"><a href="classic/">Looking for the old walking game? It is still here.</a></p></div>`;
  }
}
function obNext() {
  const n = ($('#obName').value || '').trim().slice(0, 16); if (!n) { toast('Pick a name'); return; }
  S.name = n; S.onboarded = true; S.morning.date = ''; S.horde.first = weekId();
  if (!S.plots.length) while (S.plots.length < plotCount()) S.plots.push(null);
  // a first crop already in the ground, so there is something to harvest today
  S.plots[0] = { c: 'radish', at: Date.now() - 3 * 3600e3, ms: 3 * 3600e3 };
  S.plots[1] = { c: 'radish', at: Date.now() - 2 * 3600e3, ms: 3 * 3600e3 };
  rollDay(); S.morning.seen = true;
  if (!S.surv.length) { const s = newSurvivor(); s.name = 'Hattie'; s.past = 'grew prize tomatoes for the county fair'; s.likes = 'tomato'; s.job = 'farm'; S.surv.push(s); }
  document.querySelector('.tabs').hidden = false; log('You found the farmhouse. Hattie was already here.');
  save(); TAB = 'today'; render(); if (O().ok) { pullSteps(); pushPlayer(); }
  setTimeout(() => openSheet(`<h2>The farmhouse</h2><p>An old woman with a hoe opens the door before you knock.</p><p><i>"I'm Hattie. Radishes are nearly up. If you're staying, you're working."</i></p><p class="help">Harvest on the <b>Farm</b> tab, then take a <b>Run</b> tonight. Log a walk or a workout any time by tapping the grit badge at the top.</p><button class="btn r wide" onclick="closeSheet()">Got it</button>`), 300);
}

/* ---------- Today ---------- */
function renderToday() {
  const g = gritToday(), vi = vigorIdx(g), V = VIGOR[vi], nx = VIGOR[vi + 1];
  const night = tonight(); const ready = S.plots.filter(plotReady).length;
  tickIdle(); const id = S.idle;
  let h = '';
  // morning
  const mo = S.morning;
  if (mo && (mo.evt || (mo.recap && mo.recap.pet)) && !(mo.done && mo.seen)) h += renderMorning();
  const hr = S.horde.res; if (hr && !hr.seen) h += `<div class="card ${hr.k === 'win' ? 'green' : hr.k === 'hold' ? 'amber' : 'blood'}"><h2>🧟 Horde night <span class="sub">${hr.k === 'win' ? 'held' : hr.k === 'hold' ? 'barely' : 'overrun'}</span></h2><p>${hr.t}</p><p class="help">Horde ${hr.str} vs your defense ${hr.def}. ${hr.got}</p><button class="btn sm" onclick="S.horde.res.seen=true;save();render()">OK</button></div>`;
  // vigor
  h += `<div class="card vigcard v${vi}"><div class="vtop"><div class="vbig">${V.e}</div><div style="flex:1"><h2>${V.n} <span class="sub">${g} grit today</span></h2>
    ${nx ? bar(g - V.at, nx.at - V.at, 'grit') + `<p class="help">${nx.at - g} more grit for <b>${nx.n}</b>: ${nx.d}. That's about ${fmt((nx.at - g) * GRIT_PER_STEPS)} steps or ${Math.ceil((nx.at - g) / 2)} min of exercise.</p>` : '<p class="help">Maxed out. Legendary.</p>'}
    <p class="help">${V.d}</p></div></div>
    <div class="row"><button class="btn r" onclick="openActivity()">+ Log a workout</button><button class="btn ghost" onclick="openSteps()">Steps: ${fmt(stepsToday())}</button>${O().ok ? `<button class="btn ghost sm" onclick="pullSteps();toast('Checking')">↻</button>` : ''}</div>
    <p class="help">🌱 Streak ${S.streak.days}${S.streak.rests ? ' · ' + plural(S.streak.rests, 'rest day') + ' banked' : ''}. A day counts at ${VIGOR[1].at} grit.</p></div>`;
  // tonight
  const tor = S.torches;
  h += `<div class="card night"><h2>${night.e} Tonight: ${night.n}</h2><p>${night.d}</p>
    ${S.run ? `<button class="btn r wide" onclick="go('run')">Continue your run (floor ${S.run.floor + 1})</button>` : tor ? `<button class="btn r wide" onclick="go('run')">Head out 🔥 (${plural(tor, 'torch', 'torches')})</button>` : `<p class="help">No torches left. You get a free one every morning, and more for moving: ${TORCH_GRIT.filter(t => t > g).map(t => t + ' grit').join(', ') || 'all earned today'}.</p>`}</div>`;
  // farm + camp at a glance
  const idleS = Math.floor(id.scrap * vigor().mult), idleW = Math.floor(id.wood * vigor().mult);
  h += `<div class="grid2">
    <button class="tile" onclick="go('farm')"><b>🌱 Farm</b><span>${ready ? ready + ' ready to harvest' : nextCropText()}</span></button>
    <button class="tile" onclick="${idleS || idleW ? 'collectIdle()' : "go('camp')"}"><b>🏡 Camp</b><span>${idleS || idleW ? 'Collect ' + idleS + ' ⚙️ ' + idleW + ' 🪵' : S.surv.length ? plural(S.surv.length, 'survivor') + ' at work' : 'Build and recruit'}</span></button></div>`;
  // bounties
  h += `<div class="card"><h2>Today's jobs <span class="sub">${S.daily.list.filter(b => b.done).length}/3</span></h2>` + S.daily.list.map((b, i) => {
    const have = bountyHave(b), ok = have >= b.n;
    return `<div class="bounty ${b.done ? 'done' : ''}"><div><b>${esc(bountyText(b))}</b><small>${rewardText(b.r)}</small>${bar(have, b.n)}</div>${b.done ? '✓' : ok ? `<button class="btn sm r" onclick="claimBounty(${i})">Claim</button>` : `<span class="sub">${have}/${b.n}</span>`}</div>`;
  }).join('') + `<p class="help">Finish all three for a bonus torch.</p></div>`;
  // horde
  const ms = hordeAt() - Date.now(); const str = hordeStrength(), def = defense();
  h += `<div class="card"><h2>🧟 Sunday horde <span class="sub">in ${ms > 0 ? dur(ms) : 'tonight'}</span></h2>${bar(def, str, def >= str ? 'ok' : 'warn')}<p class="help">Your defense <b>${def}</b> vs about <b>${str}</b> coming. Build walls, a watchtower, and put survivors on guard duty. If they get in, nobody gets hurt, but you lose some scrap and crops.</p></div>`;
  return h;
}
function nextCropText() { const g = S.plots.filter(Boolean); if (!g.length) return 'Beds are empty - plant something'; const t = Math.min(...g.map(p => p.at + p.ms - Date.now())); return 'Next harvest in ' + dur(t); }
function renderMorning() {
  const mo = S.morning, e = mo.evt; let h = `<div class="card morning"><h2>☀️ Good morning</h2>`;
  if (mo.recap && mo.recap.pet) h += `<p>🐾 ${esc(mo.recap.pet)}</p>`;
  if (e) {
    h += `<h3>${e.e} ${esc(e.n)}</h3>`;
    const b = (t, i, cls) => `<button class="btn ${cls || ''}" onclick="morningAct(${i})">${t}</button>`;
    if (e.id === 'trader') h += `<p>"Fair prices. Fairer than you'll find anywhere else, anyway."</p><div class="stack">` + e.offers.map((o, i) => `<div class="offer"><span>${o.t}</span>${o.bought ? '<span class="sub">bought</span>' : `<button class="btn sm ${costOk(o.cost) ? 'r' : ''}" onclick="morningAct(${i})">${costText(o.cost)}</button>`}</div>`).join('') + `</div>`;
    else if (mo.done) h += `<p class="help">Done.</p>`;
    else if (e.id === 'storm') h += `<p>Branches all over the yard. Good firewood, at least.</p>` + b('Gather it (+' + e.wood + ' 🪵)', 0, 'r');
    else if (e.id === 'seeds') h += `<p>Someone left a packet in the mailbox. No note. Just "${CROPS[e.seeds[0]].n}" and "${CROPS[e.seeds[1]].n}" in pencil.</p>` + b('Take them', 0, 'r');
    else if (e.id === 'radio') h += `<p class="radio">${esc(e.line)}</p>` + b('Keep listening', 0, 'r');
    else if (e.id === 'stray') h += `<div class="big">${petSVG({ kind: e.kind }, 70)}</div><p>A ${PETS[e.kind].n.toLowerCase()} is curled up on the porch. It looks at you like it has been waiting.</p><div class="row">` + b('Keep it', 0, 'r') + b('Find it a home', 1, 'ghost') + `</div>`;
    else if (e.id === 'knock') { const s = e.surv; const full = S.surv.length >= survCap(); h += `<div class="big">${ART.avatarSVG(s.av, 64)}</div><p><b>${esc(s.name)}</b> ${esc(s.past)}. They're asking to stay.${full ? ' <span class="help">(No bunk free. They can sleep in the barn until you build one.)</span>' : ''}</p><div class="row">` + b('Let them in', 0, 'r') + b('Give them water and say goodbye', 1, 'ghost') + `</div>`; }
    else if (e.id === 'shambler') h += `<p>One of them, tangled in the fence wire. ${hasJob('guard') ? 'Your guard is already walking over.' : 'You grab the shovel.'}</p>` + b('Deal with it', 0, 'r');
    else if (e.id === 'gift') h += `<p>${esc(e.from)} left something on your bed: ${e.give.scrap ? e.give.scrap + ' scrap' : 'a ' + CROPS[e.give.seed].n.toLowerCase() + ' seed'}.</p>` + b('Say thank you', 0, 'r');
    else if (e.id === 'deer') h += `<p>Three deer in the garden, nibbling the edges. They have not seen you yet.</p><div class="row">` + b('Let them graze', 0, 'r') + b('Shoo them', 1, 'ghost') + `</div>`;
  }
  if (!e || mo.done || e.id === 'trader') h += `<button class="btn sm ghost" onclick="S.morning.seen=true;save();render()">Close</button>`;
  return h + `</div>`;
}

/* ---------- activity sheets ---------- */
function openActivity() {
  const g = gritToday();
  openSheet(`<h2>Log a workout</h2><p class="help">Anything counts. ${GRIT_PER_MIN.light} grit a minute for light, ${GRIT_PER_MIN.moderate} for moderate, ${GRIT_PER_MIN.hard} for hard. Steps add 1 grit per ${GRIT_PER_STEPS}.</p>
    <div class="wgrid">${WORKOUTS.map(w => `<button class="wbtn" data-w="${w.id}" onclick="pickWork('${w.id}')">${w.e}<span>${w.n}</span></button>`).join('')}</div>
    <label class="lab">Minutes</label><div class="row"><input id="wMin" type="number" inputmode="numeric" min="1" max="300" value="15" style="flex:1">${[10, 15, 30, 45].map(n => `<button class="btn sm ghost" onclick="$('#wMin').value=${n}">${n}</button>`).join('')}</div>
    <button class="btn r wide" id="wGo" onclick="addWorkout(window._work||'walk',+$('#wMin').value)">Log it</button>
    ${S.act.work.length ? `<h3>Today</h3>` + S.act.work.map((w, i) => { const W = WORKOUTS.find(x => x.id === w.id) || WORKOUTS[0]; return `<div class="offer"><span>${W.e} ${W.n} · ${w.min} min · +${workGrit(w)}</span><button class="btn sm ghost" onclick="removeWorkout(${i});openActivity()">remove</button></div>`; }).join('') : ''}
    <p class="help">Today: ${fmt(stepsToday())} steps + ${S.act.work.reduce((s, w) => s + w.min, 0)} min = <b>${g} grit</b>.</p>`);
  pickWork(window._work || 'walk');
}
function pickWork(id) { window._work = id; document.querySelectorAll('.wbtn').forEach(b => b.classList.toggle('on', b.dataset.w === id)); }
function openSteps() {
  const o = O();
  openSheet(`<h2>Steps today: ${fmt(stepsToday())}</h2>
    <p class="help">${o.ok ? (o.lastPost ? 'Your phone last sent steps ' + ago(o.lastPost) + '.' : 'Nothing from your phone yet today.') + ' Phone steps come in on their own once sync is set up (on the Me tab).' : 'Set up step sync on the Me tab and your phone sends steps by itself.'}</p>
    <label class="lab">Add steps a counter missed (treadmill, phone on the desk)</label>
    <div class="row"><input id="stepIn" type="number" inputmode="numeric" placeholder="steps" style="flex:1"><button class="btn r" onclick="addManualSteps(+$('#stepIn').value);closeSheet()">Add</button></div>
    <label class="lab">Or type the total your phone shows</label>
    <div class="row"><input id="stepTot" type="number" inputmode="numeric" placeholder="total today" style="flex:1"><button class="btn" onclick="if(!setCounted(+$('#stepTot').value,'typed'))toast('That is not more than you already have');closeSheet()">Set total</button></div>
    ${o.ok ? `<button class="btn ghost wide" onclick="pullSteps();closeSheet();toast('Checking the server')">Check for phone steps now</button>` : `<button class="btn ghost wide" onclick="closeSheet();go('me')">Set up step sync</button>`}`);
}

/* ---------- Farm ---------- */
function renderFarm() {
  const ready = S.plots.filter(plotReady).length;
  let h = `<div class="card"><h2>🌱 Garden <span class="sub">${S.plots.length} beds</span></h2>
    <div class="plots">` + S.plots.map((p, i) => {
    if (!p) return `<button class="plot empty" onclick="openPlant(${i})"><span class="pe">＋</span><small>plant</small></button>`;
    const C = CROPS[p.c], left = p.at + p.ms - Date.now(), pct = clamp(1 - left / p.ms, 0, 1);
    const stage = pct >= 1 ? C.e : pct > 0.6 ? '🌿' : pct > 0.25 ? '🌱' : '🟫';
    return `<button class="plot ${pct >= 1 ? 'ready' : ''}" onclick="${pct >= 1 ? `harvest(${i})` : `toast('${C.n}: ${dur(left)} left')`}"><span class="pe">${stage}</span><small>${pct >= 1 ? 'harvest!' : dur(left)}</small><i style="width:${pct * 100}%"></i></button>`;
  }).join('') + `</div>
    <div class="row">${ready ? `<button class="btn r" onclick="harvestAll()">Harvest all (${ready})</button>` : ''}${S.plots.some(p => !p) ? `<button class="btn ghost" onclick="openPlant(-1)">Plant empty beds</button>` : ''}</div>
    <p class="help">${vigorIdx() ? vigor().e + ' You moved today: harvests give ' + Math.round((vigor().mult - 1) * 100) + '% more.' : 'Harvests are bigger on days you move (up to +80%).'} ${hasJob('farm') ? 'Your farmhand replants for you.' : ''} ${S.build.greenhouse ? 'Greenhouse: ' + (S.build.greenhouse * 15) + '% faster.' : ''}${tonight().grow ? ' 🌧️ Rain today: plant now for 30% faster crops.' : ''}</p></div>`;
  // seeds
  const seeds = CROP_ORDER.filter(c => S.seeds[c] > 0);
  h += `<div class="card"><h2>Seeds</h2>${seeds.length ? `<div class="chips">` + seeds.map(c => `<span class="chip r-${CROPS[c].r}">${CROPS[c].e} ${CROPS[c].n} ×${S.seeds[c]}</span>`).join('') + `</div>` : '<p class="help">No seeds. Find them on runs, from the trader, or when harvests drop one.</p>'}</div>`;
  // kitchen
  h += `<div class="card"><h2>🍳 Kitchen <span class="sub">eat one meal before a run</span></h2>
    <div class="chips">${CROP_ORDER.filter(c => S.crops[c] > 0).map(c => `<span class="chip">${CROPS[c].e} ${S.crops[c]}</span>`).join('') || '<span class="help">No crops in the pantry yet.</span>'}</div>
    ${(() => {
      const row = m => { const M = MEALS[m], ok = canCook(m); return `<div class="meal ${ok ? 'ok' : ''}"><div class="mealE">${M.e}</div><div style="flex:1"><b>${M.n}</b>${S.meals[m] ? ` <span class="chip a">×${S.meals[m]}</span>` : ''}<small>${M.d}</small><small class="need">${Object.entries(M.need).map(([c, n]) => `<span class="${(S.crops[c] || 0) >= n ? 'have' : ''}">${CROPS[c].e}${n}</span>`).join(' ')}</small></div>${ok ? `<button class="btn sm r" onclick="cook('${m}')">Cook</button>` : ''}</div>`; };
      const can = MEAL_ORDER.filter(m => canCook(m) || S.meals[m] > 0), rest = MEAL_ORDER.filter(m => !can.includes(m));
      return `<div class="stack" style="margin-top:10px">${can.map(row).join('') || '<p class="help">Nothing you can cook yet. Recipes below.</p>'}</div>` + (rest.length ? `<details style="margin-top:8px"><summary class="help">All recipes (${rest.length} more)</summary><div class="stack">${rest.map(row).join('')}</div></details>` : '');
    })()}${hasJob('cook') ? '<p class="help">Your cook makes two portions of everything.</p>' : ''}</div>`;
  // market
  const sellable = CROP_ORDER.filter(c => S.crops[c] > 0);
  if (sellable.length) h += `<div class="card"><h2>🧺 Sell crate</h2><p class="help">Traders pass through often. Spare crops become scrap.</p><div class="stack">` + sellable.map(c => `<div class="offer"><span>${CROPS[c].e} ${CROPS[c].n} ×${S.crops[c]} <small class="sub">${CROPS[c].sell} ⚙️ each</small></span><span><button class="btn sm ghost" onclick="sellCrop('${c}',1)">Sell 1</button> <button class="btn sm ghost" onclick="sellCrop('${c}',${S.crops[c]})">All</button></span></div>`).join('') + `</div></div>`;
  return h;
}
function openPlant(i) {
  const seeds = CROP_ORDER.filter(c => S.seeds[c] > 0);
  if (!seeds.length) { toast('No seeds. Runs and traders have them.'); return; }
  openSheet(`<h2>${i < 0 ? 'Plant every empty bed' : 'Plant'}</h2><div class="stack">` + seeds.map(c => { const C = CROPS[c]; return `<button class="pickrow" onclick="${i < 0 ? `plantAll('${c}')` : `plant(${i},'${c}')`}"><span class="pe">${C.e}</span><span style="flex:1"><b>${C.n}</b> ×${S.seeds[c]}<small>${dur(growMs(c))} · ${C.y} crops · sells for ${C.sell}</small></span><span class="chip r-${C.r}">${C.r}</span></button>`; }).join('') + `</div>`);
}

/* ---------- Camp ---------- */
function renderCamp() {
  tickIdle(); const r = idleRate(); const id = S.idle; const m = vigor().mult;
  let h = `<div class="card"><h2>📦 Camp stores</h2><p>${r.scrap || r.wood ? `Your people bring back <b>${(r.scrap * m).toFixed(1)} ⚙️</b> and <b>${(r.wood * m).toFixed(1)} 🪵</b> an hour${vigorIdx() ? ' (' + vigor().e + ' boosted)' : ''}. It piles up for up to a day.` : 'Put survivors on scavenger or woodcutter duty and they bring things back while you are away.'}</p>
    ${r.scrap || r.wood ? bar(id.scrap + id.wood, (r.scrap + r.wood) * IDLE_CAP_H || 1) + `<div class="row"><button class="btn ${Math.floor(id.scrap * m) + Math.floor(id.wood * m) ? 'r' : 'ghost'}" onclick="collectIdle()">Collect ${Math.floor(id.scrap * m)} ⚙️ ${Math.floor(id.wood * m)} 🪵</button></div>` : ''}</div>`;
  // survivors
  h += `<div class="card"><h2>👥 Survivors <span class="sub">${S.surv.length}/${survCap()} bunks</span></h2><div class="stack">` + S.surv.map(s => {
    const J = JOBS[s.job];
    return `<button class="surv" onclick="openSurv('${s.id}')">${ART.avatarSVG(s.av, 48)}<div style="flex:1"><b>${esc(s.name)}</b> <span class="hearts">${'♥'.repeat(s.hearts)}<i>${'♥'.repeat(5 - s.hearts)}</i></span><small>${J.e} ${J.n}${s.gift === todayStr() ? ' · gifted today' : ''}</small></div><span class="sub">›</span></button>`;
  }).join('') + `</div>${S.waiting.length ? `<p class="help">${S.waiting.map(s => esc(s.name)).join(', ')} ${S.waiting.length > 1 ? 'are' : 'is'} sleeping in the barn. Build the Bunkhouse to give them a bed.</p>` : ''}${!S.surv.length ? '<p class="help">You find survivors on runs, and sometimes they knock on the gate.</p>' : ''}</div>`;
  // pets
  if (S.pets.length) h += `<div class="card"><h2>🐾 Pets</h2><div class="pets">` + S.pets.map(p => `<button class="pet ${p.id === S.petActive ? 'on' : ''}" onclick="${p.id === S.petActive ? `renamePet('${p.id}')` : `setPet('${p.id}')`}">${petSVG(p, 56)}<small>${esc(p.name)}</small></button>`).join('') + `</div><p class="help">${(() => { const p = activePet(); return p ? `<b>${esc(p.name)}</b> comes on runs. ${PETS[p.kind].d}` : ''; })()} Tap another to bring them instead.</p></div>`;
  // buildings
  h += `<div class="card"><h2>🔨 Build</h2><div class="stack">` + BUILD_ORDER.map(id => {
    const B = BUILDINGS[id], lv = S.build[id] || 0, c = buildCost(id);
    return `<div class="bld"><div class="be">${B.e}</div><div style="flex:1"><b>${B.n}</b> ${lv ? `<span class="chip">Lv ${lv}</span>` : ''}${lv ? `<small>${B.d(lv)}</small>${c ? `<small class="sub">Next: ${B.d(lv + 1)}</small>` : ''}` : `<small>${B.d(1)}</small>`}</div>${c ? `<button class="btn sm ${costOk(c) ? 'r' : 'ghost'}" onclick="upgrade('${id}')">${costText(c)}</button>` : '<span class="sub">max</span>'}</div>`;
  }).join('') + `</div><p class="help">Building is instant. Wood comes from woodcutters, storms and runs.</p></div>`;
  return h;
}
function openSurv(id) {
  const s = S.surv.find(x => x.id === id); if (!s) return;
  const gifts = CROP_ORDER.filter(c => S.crops[c] > 0);
  openSheet(`<div class="survhead">${ART.avatarSVG(s.av, 80)}<div><h2>${esc(s.name)}</h2><p class="help">${esc(s.past)}. Loves ${CROPS[s.likes].e} ${CROPS[s.likes].n.toLowerCase()}.</p><span class="hearts big">${'♥'.repeat(s.hearts)}<i>${'♥'.repeat(5 - s.hearts)}</i></span>${s.hearts < 5 ? bar(s.hx, heartNeed(s.hearts), 'heart') : ''}</div></div>
    ${s.hearts ? `<div class="story">` + Array.from({ length: s.hearts }, (_, i) => `<p>${esc(storyLine(s, i))}</p>`).join('') + `</div>` : '<p class="help">Gifts and time together earn hearts. Each heart tells you more about them. At five, they give you something.</p>'}
    ${s.hearts >= 5 && s.gave ? `<div class="card amber">${CHARMS[s.gave].e} <b>${CHARMS[s.gave].n}</b>: ${CHARMS[s.gave].d}</div>` : ''}
    <h3>Job</h3><div class="stack">` + JOB_ORDER.map(j => `<button class="pickrow ${s.job === j ? 'on' : ''}" onclick="setJob('${s.id}','${j}')"><span class="pe">${JOBS[j].e}</span><span style="flex:1"><b>${JOBS[j].n}</b><small>${JOBS[j].d}</small></span></button>`).join('') + `</div>
    <h3>Give a gift ${s.gift === todayStr() ? '<span class="sub">(tomorrow)</span>' : ''}</h3>${gifts.length && s.gift !== todayStr() ? `<div class="chips">` + gifts.map(c => `<button class="chip btnchip ${c === s.likes ? 'a' : ''}" onclick="giveGift('${s.id}','${c}')">${CROPS[c].e} ${CROPS[c].n}</button>`).join('') + `</div>` : '<p class="help">' + (s.gift === todayStr() ? 'One gift a day.' : 'Harvest some crops to give.') + '</p>'}`);
}

/* ---------- Me ---------- */
function renderMe() {
  const o = O(); let h = '';
  h += `<div class="card"><div class="mehead">${ART.avatarSVG(S.av, 84)}<div style="flex:1"><h2>${esc(S.name)}</h2><p class="help">Level ${S.lvl} ${esc(title())} · ${baseMaxHp()} max HP</p>${bar(S.xp, xpNeed())}<p class="help">${S.xp}/${xpNeed()} XP. Grit gives the most XP; runs give some too.</p></div></div></div>`;
  // history
  const days = []; for (let i = 13; i >= 0; i--) { const d = dayOffset(-i); const hh = d === todayStr() ? { grit: gritToday() } : (S.hist[d] || { grit: 0 }); days.push({ d, g: hh.grit || 0 }); }
  const mx = Math.max(VIGOR[3].at, ...days.map(x => x.g));
  h += `<div class="card"><h2>Last two weeks <span class="sub">${fmt(gritWeek())} grit this week</span></h2><div class="hist">` + days.map(x => `<div class="hb" title="${x.d}: ${x.g}"><i class="v${vigorIdx(x.g)}" style="height:${Math.max(3, x.g / mx * 100)}%"></i><small>${'MTWTFSS'[(new Date(x.d + 'T12:00').getDay() + 6) % 7]}</small></div>`).join('') + `</div>
    <p class="help">Lines: ${VIGOR.slice(1).map(v => v.e + ' ' + v.at).join(' · ')}</p></div>`;
  // stats
  const st = S.stats;
  h += `<div class="card"><h2>Record</h2><div class="stats">${[['Runs', st.runs], ['Survived', st.wins], ['Bosses', st.bosses], ['Kills', st.kills], ['Harvested', st.harvests], ['Meals', st.meals], ['Lifetime grit', st.grit], ['Best floor', st.best]].map(([k, v]) => `<div><b>${fmt(v)}</b><small>${k}</small></div>`).join('')}</div></div>`;
  // keepsakes
  h += `<div class="card"><h2>Keepsakes <span class="sub">${S.keepsakes.length}/${Object.values(CHARMS).filter(c => c.r !== 'gift').length}</span></h2><p class="help">Every charm you find on a run joins this collection. Bring one along at the start of each run.</p><div class="chips">` + (S.keepsakes.map(k => `<span class="chip" title="${esc(CHARMS[k].d)}">${CHARMS[k].e} ${CHARMS[k].n}</span>`).join('') || '<span class="help">None yet.</span>') + `</div>${campCharms().length ? `<p class="help">Gifts from friends at camp (always on): ${campCharms().map(k => CHARMS[k].e + ' ' + CHARMS[k].n).join(', ')}</p>` : ''}</div>`;
  // friends
  if (o.ok) {
    const fr = friends.filter(f => f.pub && f.pub.v === 8 || (f.state && f.state.public && f.state.public.v === 8));
    h += `<div class="card"><h2>Friends this week <button class="btn sm ghost" onclick="loadFriends()">↻</button></h2>${fr.length ? `<div class="stack">` + fr.map(f => ({ f, p: f.pub || (f.state && f.state.public) || {} })).sort((a, b) => (b.p.grit_week || 0) - (a.p.grit_week || 0)).map(({ f, p }) => { return `<div class="friend">${p.av ? ART.avatarSVG(p.av, 40) : ''}<div style="flex:1"><b>${esc(p.name || f.handle)}</b>${f.handle === o.handle ? ' (you)' : ''}<small>Lv ${p.lvl || 1} · ${esc(p.region || '')} · ${p.survivors || 0} survivors</small></div><div class="fg"><b>${fmt(p.grit_week || 0)}</b><small>grit</small></div></div>`; }).join('') + `</div>` : '<p class="help">Nobody else on the new game yet. Send friends the link - they will show up here.</p>'}</div>`;
  }
  // sync
  h += `<div class="card"><h2>📱 Step sync <span class="sub">${o.ok ? '@' + esc(o.handle) : 'off'}</span></h2>`;
  if (!o.ok) h += `<p class="help">Pick a handle. Then your phone can send steps on its own, your save is backed up, and friends can see you.</p>${o.err ? `<p class="err">${esc(o.err)}</p>` : ''}
    <div class="row"><input id="hIn" placeholder="handle" value="${esc(o.handle || slug(S.name))}" style="flex:1"><button class="btn r" onclick="goOnline($('#hIn').value,$('#kIn').value)">Go online</button></div>
    <details><summary class="help">I already have an account (from another phone or the old game)</summary><input id="kIn" placeholder="account key" style="width:100%;margin-top:6px"></details>`;
  else h += `<p class="help">${o.lastPost ? 'Phone last sent steps ' + ago(o.lastPost) + '.' : 'No steps from your phone today yet.'} ${o.lastPush ? 'Saved to the cloud ' + ago(o.lastPush) + '.' : ''}</p>${o.err ? `<p class="err">${esc(o.err)}</p>` : ''}
    <details><summary><b>Android</b>: Health Connect app</summary><p class="help">Install <a href="./DeadMilesSteps.apk">DeadMilesSteps.apk</a>, paste handle <code>${esc(o.handle)}</code> and token <code class="wrap">${esc(o.token)}</code>, tap Allow reading steps, then Save. It sends your steps every hour.</p></details>
    <details><summary><b>iPhone</b>: Shortcut</summary><p class="help">Paste this into the Shortcuts app's AI, or build it by hand:</p><pre class="spec">${esc(shortcutSpec())}</pre><button class="btn sm ghost" onclick="navigator.clipboard.writeText(shortcutSpec()).then(()=>toast('Copied','z'))">Copy</button></details>
    <details><summary>Account key (keep it private)</summary><p class="help">To use this save on another device, go online there with handle <code>${esc(o.handle)}</code> and this key:</p><code class="wrap">${esc(o.token)}</code></details>
    <div class="row"><button class="btn ghost sm" onclick="pullSteps();pushPlayer();toast('Syncing')">Sync now</button></div>`;
  h += `</div>`;
  // settings
  h += `<div class="card"><h2>Settings</h2><div class="row"><button class="btn ghost sm" onclick="S.sfx=!S.sfx;save();render()">Sound: ${S.sfx ? 'on' : 'off'}</button><button class="btn ghost sm" onclick="editName()">Rename</button><button class="btn ghost sm" onclick="openNews()">What's new</button></div>
    <p class="help"><a href="classic/">The old walking game (v7.71)</a> is still there, with your old save. v${VERSION}</p>
    <details><summary class="help">Journal</summary><div class="journal">${S.log.slice(0, 30).map(l => `<p><small>${ago(l.t)}</small> ${esc(l.m)}</p>`).join('')}</div></details></div>`;
  return h;
}
function editName() { askText('Your name', S.name, 16, n => { S.name = n; save(); render(); }); }
function openNews() { openSheet(`<h2>What's new</h2>` + NEWS.map(n => `<h3>v${n.v}</h3><ul>${n.items.map(i => `<li>${i}</li>`).join('')}</ul>`).join('')); S.seenNews = VERSION; save(); }
const NEWS = [
  { v: '8.0', items: ['Dead Miles is now <b>Homestead</b>: a farm and camp by day, a short roguelite run by night.', 'Steps and workouts give <b>grit</b>. Grit boosts harvests and camp work, earns extra runs, and levels you up. It never locks the farm, the camp or travel.', 'Log any workout - yoga, lifting, a bike ride - not only steps.', 'Survivors with jobs, hearts and stories. Pets came over from the old game.', 'A Sunday horde to prepare for all week, five regions, ten night conditions, daily jobs.', 'The old walking game is kept at <a href="classic/">classic/</a>.'] },
];

/* ================= boot ================= */
function boot() {
  S = load();
  if (!S) { S = importOld() || fresh(); }
  ensure();
  if (S.onboarded) { rollDay(); activityChanged(true); }
  LAST_GRIT = gritToday();
  document.querySelectorAll('.tabs button').forEach(b => b.onclick = () => go(b.dataset.t));
  render();
  if (S.onboarded && S.seenNews !== VERSION && S.imported) setTimeout(openNews, 600);
  stepsBeacon();
  if (O().ok) { pullSteps(); loadFriends(); fetchStepKey(); }
  setInterval(() => { if (!S.onboarded) return; const d = S.act.date; rollDay(); if (S.act.date !== d) render(); else if (!S.run || TAB !== 'run') { if (!$('#sheet').hidden) return; if (TAB === 'farm' || TAB === 'today' || TAB === 'camp') render(); } }, 30000);
  setInterval(() => { if (O().ok && document.visibilityState === 'visible') pullSteps(); }, 5 * 60000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && S.onboarded) { rollDay(); render(); if (O().ok) pullSteps(); } });
}
window.addEventListener('load', boot);
