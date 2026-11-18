/* Dead Miles (next) 0.62 - life around the walk (owner, from the "viral" ideas: memorials with a funny story, a pet that
   walks with you, story notifications, commute mode, an instant first reward - "keep Isabel out of it").
   - Memorials: a crew member who dies gets a gravestone card with a (silly) story of how they went, days survived, last
     words. Shown when you get home; the Crew sheet keeps the wall. "Copy" puts it on the clipboard to share.
   - Walking buddy: the active pet walks with you. Every 2,500 steps it brings something (dogs dig up supplies, cats bring
     "gifts"), up to 3 a day, better as it levels. No pet yet? Find a stray in a house (0.66: the free adoption is gone).
   - Supply run (commute mode): tap Start before a walk you take anyway (to the train, the shops). Phone / watch steps
     only - typed steps don't count. End it after 1,000+: one haul per 1,000 steps (max 5), 2 runs a day.
   - Radio: little story messages about what is going on (horde night coming, caches open, crew hungry, the garden, your
     pet). On the home screen as a ticker; as phone notifications if you turn them on (only while the game is open or in
     the background - a closed app can't be woken without a push server).
   - First steps reward: brand-new characters only (made from 0.62 on) - the first 300 synced steps pay a starter crate.
   Save: SV.life = { mem: [], memNew: [], buddy: { day, n, mark }, run: { on, p0, day, n }, radio: { feed: [], sent: {} }, first }. */
'use strict';
window.DM = window.DM || {};
(() => {
  const L = DM.Life = {};
  const D = DM.D, G = () => DM.Game, SV = () => DM.Game && DM.Game.data();
  const toast = (m, s) => DM.E && DM.E.toast && DM.E.toast(m, s || 2.6);
  const sfx = k => { try { DM.E.SFX.play(k); } catch (e) { /* ignore */ } };
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = n => Math.round(n).toLocaleString('en-US');
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  const pick = a => a[Math.floor(Math.random() * a.length)];
  function st() {
    const v = SV(); if (!v) return null; v.life = v.life || {}; const s = v.life;
    s.mem = s.mem || []; s.memNew = s.memNew || []; s.buddy = s.buddy || { day: '', n: 0, mark: null }; s.run = s.run || { on: 0, p0: 0, day: '', n: 0 };
    s.radio = s.radio || { feed: [], sent: {} }; return s;
  }
  L.st = st;
  const realSteps = v => { const d = v.day || {}; return (d.phone || 0) + (d.walk || 0); };   // phone + watch + map walking, never typed

  // ---------------------------------------------------------------- memorials
  const KILLER = { walker: 'a walker', runner: 'a runner', bloater: 'a bloater', screamer: 'a screamer', brute: 'a brute', crawler: 'a crawler', armored: 'a zombie in riot gear', turkey: 'a zombie turkey', raider: 'a raider' };
  const HOW = [
    (m, k) => `${m.name} died doing what they loved: telling ${k} it was "honestly not that scary".`,
    (m, k) => `${m.name} tried to reason with ${k}. ${k[0].toUpperCase() + k.slice(1)} was not a reasonable person.`,
    (m, k) => `${m.name} went back for snacks. Nobody should die for chips, but ${m.name} was not nobody.`,
    (m, k) => `${m.name} tripped over the exact same rug they warned everyone about. ${k[0].toUpperCase() + k.slice(1)} did the rest.`,
    (m, k) => `${m.name} insisted they "had this one". They did not have this one.`,
    (m, k) => `${m.name} stopped to pet what they thought was a dog. It was ${k}.`,
    (m, k) => `${m.name} was halfway through a very good story when ${k} interrupted. We'll never know how it ended.`,
    (m, k) => `${m.name} yelled "cover me!" at the exact moment everyone else yelled "cover me!"`,
    (m, k) => `${m.name} hid in a closet that was already being used by ${k}.`,
    (m, k) => `${m.name} challenged ${k} to a staring contest. Zombies don't blink.`,
    (m, k) => `${m.name} tried a cool slide under a table. The table won. Then ${k} won.`,
    (m, k) => `${m.name} went out swinging. Mostly at the air, but with real passion.`,
    (m, k) => `${m.name} "just wanted to check one more drawer." ${k[0].toUpperCase() + k.slice(1)} was in the drawer. Somehow.`,
    (m, k) => `${m.name} thought the coast was clear because ${k} was "standing very still".`,
  ];
  const WORDS = ['"Tell my plants I loved them."', '"Was that a zombie or my stomach?"', '"I call dibs on the good bunk."', '"Okay, that one was my fault."', '"Don\'t let them give my snacks to Dot."',
    '"I regret nothing. Except that."', '"Put on my tombstone: they tried."', '"Feed the cat. Not to the zombies."', '"Leave the lights on for me."', '"At least I wasn\'t the first one."',
    '"Bet you ten caps I come back."', '"Honestly? Worth it."'];
  // crew.js calls this when a crew member dies in a house
  L.died = function (m, ctx = {}) {
    const s = st(); if (!s || !m) return;
    const k = KILLER[ctx.kind] || 'a zombie', days = Math.max(1, Math.round((Date.now() - (m.joined || Date.now())) / 864e5));
    const R = DM.Crew && DM.Crew.ROLES && DM.Crew.ROLES[m.role];
    const e = { name: m.name, role: R ? R.n : 'Survivor', past: m.past || '', days, at: Date.now(), where: ctx.where || 'a house', story: pick(HOW)(m, k), words: pick(WORDS), id: 'm' + Date.now() };
    s.mem.unshift(e); s.mem.length = Math.min(s.mem.length, 40); s.memNew.push(e.id);
    L.radio(`🪦 ${m.name} won't be coming home. ${e.words}`, 'mem' + e.id);
    G().save();
  };
  const memText = e => `🪦 In memory of ${e.name} (${e.role})\nWho ${e.past}.\nSurvived ${e.days} day${e.days === 1 ? '' : 's'} with us. Lost at ${e.where}.\n${e.story}\nLast words: ${e.words}\n- Dead Miles`;
  L.memCardHTML = e => `<div class="memcard"><div class="memstone"><div class="memrip">R.I.P.</div><b>${esc(e.name)}</b><span>${esc(e.role)} · ${e.days} day${e.days === 1 ? '' : 's'} with the crew</span></div>
    <p class="mp">Who ${esc(e.past)}. Lost at ${esc(e.where)}.</p><p class="mp memstory">${esc(e.story)}</p><p class="mp dim">Last words: ${esc(e.words)}</p></div>`;
  function showMemorial(e, after) {
    G().ui.sheetOpen(`<div class="kick">A memorial</div>${L.memCardHTML(e)}<div class="btnrow"><button class="mbtn sm ghost" id="memCopy">Copy to share</button><button class="mbtn sm" id="memOk">Rest easy</button></div>`);
    document.getElementById('memCopy').onclick = () => { try { navigator.clipboard.writeText(memText(e)); toast('Copied - paste it anywhere', 1.6); } catch (x) { toast('Could not copy', 1.4); } };
    document.getElementById('memOk').onclick = () => { G().ui.sheetClose(); if (after) setTimeout(after, 300); };
  }
  L.memorialWallHTML = function () {
    const s = st(); if (!s || !s.mem.length) return '';
    return `<div class="kick sect">In memory · ${s.mem.length}</div>${s.mem.slice(0, 12).map(e => `<button class="memrow" data-mem="${e.id}"><b>🪦 ${esc(e.name)}</b><span>${esc(e.story)}</span></button>`).join('')}`;
  };
  L.bindWall = root => root.querySelectorAll('[data-mem]').forEach(b => b.onclick = () => { const e = st().mem.find(x => x.id === b.dataset.mem); if (e) showMemorial(e); });

  // ---------------------------------------------------------------- walking buddy (the active pet)
  const BUDDY_STEP = 2500, BUDDY_MAX = 3;
  const DOG = [['beans', 1], ['water', 1], ['scrap', 1], ['cloth', 1], ['bandage', 1], ['wood', 1], ['snack', 1], ['lockpick', 1]];
  const CAT = [['scrap', 1], ['battery', 1], ['tape', 1], ['nails', 3], ['snack', 1], ['book', 1]];
  function buddyFind(p) {
    const lv = DM.Crew.plv(p), r = Math.random();
    if (r < .04 + .01 * lv && DM.Collect) return [DM.Collect.pickWalk(), 1];
    if (r < .07 + .015 * lv) return ['cache2', 1];
    if (r < .09 + .01 * lv && DM.Charm && p.kind === 'cat') return [DM.Charm.pick(), 1];
    return pick(p.kind === 'cat' ? CAT : DOG);
  }
  const BUDDY_LINES = { dog: ['{n} dug up {i} by a fence post.', '{n} came running back with {i}, tail going like crazy.', '{n} found {i} under a parked car and would not let it go.'],
    cat: ['{n} left {i} on your shoe. You\'re welcome, apparently.', '{n} vanished for ten minutes and came back with {i}.', '{n} knocked {i} off a windowsill. Finders keepers.'] };
  function buddyTick() {
    const v = SV(), s = st(); if (!v || !s || !DM.Crew || !v.pets) return;
    const p = DM.Crew.activePet(), real = realSteps(v), b = s.buddy;
    if (b.day !== today()) { b.day = today(); b.n = 0; b.mark = real; }
    if (b.mark == null || real < b.mark) b.mark = real;
    if (!p) { b.mark = real; return; }
    while (real - b.mark >= BUDDY_STEP && b.n < BUDDY_MAX) {
      b.mark += BUDDY_STEP; b.n++;
      const [k, n] = buddyFind(p); G().routeApi.toStash([{ k, n }]);
      const line = pick(BUDDY_LINES[p.kind] || BUDDY_LINES.dog).replace('{n}', p.name).replace('{i}', `${n > 1 ? n + ' ' : ''}${D.ITEMS[k].n.toLowerCase()}`);
      L.radio(`🐾 ${line} (in your stash)`, 'buddy' + today() + b.n); toast(`🐾 ${line}`, 3);
    }
    if (b.n >= BUDDY_MAX) b.mark = real;
  }
  const buddyTile = () => {
    const v = SV(), s = st(); if (!v || !DM.Crew) return null; const p = DM.Crew.activePet();
    if (!p) return (v.pets && v.pets.list.length) ? null : { k: 'buddy', c: '#f0b25a', n: 'Walking buddy', sub: 'Find a stray hiding in a house to walk with you', hot: '' };   // 0.66: no free adoption
    const left = BUDDY_STEP - (realSteps(v) - (s.buddy.mark || 0));
    return { k: 'buddy', c: '#f0b25a', n: `${p.name} the ${p.kind}`, sub: s.buddy.n >= BUDDY_MAX ? `Found ${BUDDY_MAX} things today - tired, happy` : `Walking with you · next find in ${fmt(Math.max(0, left))} steps`, hot: '' };
  };
  L.buddyHTML = function () {
    const v = SV(), p = DM.Crew.activePet(), s = st();
    if (p) return `<div class="kick">Walking buddy</div><h3>${esc(p.name)}</h3><canvas id="lfPet" width="160" height="120" style="display:block;margin:0 auto"></canvas>
      <p class="mp">${esc(p.name)} walks with you everywhere (phone and watch steps). Every ${fmt(BUDDY_STEP)} steps ${p.kind === 'cat' ? 'you get a "gift"' : 'they dig something up'} - up to ${BUDDY_MAX} a day, and luckier as they level up (level ${DM.Crew.plv(p)}).</p>
      <p class="mp dim">Today: ${s.buddy.n}/${BUDDY_MAX} finds. Switch buddies in the Crew &amp; strays sheet.</p>`;
    // 0.66 (owner: "adopting a dog or buddy should not be free"): no free adoption - pets come from strays in houses
    return `<div class="kick">Walking buddy</div><h3>No buddy yet</h3><p class="mp">Strays hide in some houses - under beds, in closets, behind shelves. Stand next to one (food helps) and it may trust you.</p>
      <p class="mp">A pet then walks with you: every ${fmt(BUDDY_STEP)} steps a dog digs something up and a cat brings you a "gift", up to ${BUDDY_MAX} a day.</p>`;
  };
  L.bindBuddy = function (root, re) {
    const p = DM.Crew.activePet(), cv = root.querySelector('#lfPet'); if (p && cv && DM.Crew.petPortrait) DM.Crew.petPortrait(cv, p, { happy: true, heart: 1 });
  };

  // ---------------------------------------------------------------- supply run (commute mode)
  const RUN_MIN = 1000, RUN_MAX_ROLLS = 5, RUN_DAY = 2;
  // 0.66 (owner: "supply run i think is bugged"): steps since the start, also across midnight (the day's count resets then;
  // r.d0 = the game day it started). A run left open for 2+ days is dropped, and so is a run from before 0.66 (no d0).
  function runGot(v, r) {
    const P = v.prevDay;
    if (!r.d0) return null;   // a run from before 0.66 (no start day): cancelled
    if (r.d0 === v.day.key) return realSteps(v) - r.p0;
    if (P && P.key === r.d0) return Math.max(0, (P.phone || 0) + (P.walk || 0) - r.p0) + realSteps(v);
    return null;
  }
  // pull the latest phone steps first (4 s at most), so the start and the end are both up to date
  const syncNow = () => new Promise(res => { const N = window.NET; if (!N || !N.ok || !N.pullSteps) return res(); const t = setTimeout(res, 4000); N.pullSteps().catch(() => { }).then(() => { clearTimeout(t); res(); }); });
  const runTile = () => { const v = SV(), r = st().run; if (!v) return null; if (r.day !== today()) { r.day = today(); r.n = 0; }
    if (r.on && runGot(v, r) == null) r.on = 0;   // 0.66: started 2+ days ago
    if (r.on) return { k: 'commute', c: '#9fe0e6', n: 'Supply run', sub: `${fmt(Math.max(0, runGot(v, r)))} steps so far - end it when you arrive`, hot: 'On' };
    return { k: 'commute', c: '#9fe0e6', n: 'Supply run', sub: r.n >= RUN_DAY ? 'Done for today' : 'Walking somewhere anyway? Make it a run', hot: '' }; };
  L.runHTML = function () {
    const v = SV(), r = st().run, got = Math.max(0, runGot(v, r) || 0);
    return `<div class="kick">Commute mode</div><h3>Supply run</h3><p class="mp">Walking to the train, the shops, work? Start a supply run before you go and end it when you get there. Every ${fmt(RUN_MIN)} steps on the way = one haul of supplies (max ${RUN_MAX_ROLLS}). Phone / watch steps only - typed steps don't count. ${RUN_DAY} runs a day.</p>
      <p class="mp dim">On iPhone, run your step Shortcut (or open the step app) right before you start and again when you arrive.</p>
      ${r.on ? `<div class="kick sect">On the move</div><p class="mp"><b>${fmt(Math.max(0, got))}</b> steps so far · ${Math.min(RUN_MAX_ROLLS, Math.floor(Math.max(0, got) / RUN_MIN))} haul${Math.floor(got / RUN_MIN) === 1 ? '' : 's'}</p><button class="mbtn big" id="runEnd">I'm here - end the run</button><button class="mbtn big ghost" id="runQuit">Cancel it</button>`
        : r.n >= RUN_DAY ? '<p class="mp dim">You did both runs today. Back tomorrow.</p>' : '<button class="mbtn big" id="runGo">Start a supply run</button>'}
`;
  };
  L.bindRun = function (root, re) {
    const v = SV(), r = st().run;
    const go = root.querySelector('#runGo'); if (go) go.onclick = async () => { go.disabled = true; go.textContent = 'Syncing your steps...'; await syncNow(); r.on = 1; r.d0 = v.day.key; r.p0 = realSteps(v); G().save(); sfx('ui'); L.radio('🎒 Supply run started. Keep your eyes open on the way.', 'runs' + Date.now()); re(); };
    const q = root.querySelector('#runQuit'); if (q) q.onclick = () => { r.on = 0; G().save(); re(); };
    const end = root.querySelector('#runEnd'); if (end) end.onclick = async () => {
      end.disabled = true; end.textContent = 'Syncing your steps...'; await syncNow(); end.disabled = false; end.textContent = "I'm here - end the run";
      const got = Math.max(0, runGot(v, r) || 0), n = Math.min(RUN_MAX_ROLLS, Math.floor(got / RUN_MIN));
      if (n < 1) { toast(`Only ${fmt(got)} steps since you started - a run needs ${fmt(RUN_MIN)}. On iPhone, run your step Shortcut and try again.`, 3.2); re(); return; }
      r.on = 0; r.n++;
      const keys = []; for (let i = 0; i < n; i++) keys.push(...D.rollLoot(pick(['store', 'storage', 'register', 'car']), Math.random));
      const stacks = D.toStacks(keys, Math.random); const lost = G().routeApi.toStash(stacks.map(e => Object.assign({}, e)));
      if (DM.Skills && DM.Skills.addXP) DM.Skills.addXP(10 * n);
      DM.Journal && DM.Journal.note(`Supply run: ${fmt(got)} steps, ${n} haul${n > 1 ? 's' : ''}.`);
      G().save(); sfx('open');
      root.innerHTML = `<div class="kick">Supply run done</div><h3>${fmt(got)} steps</h3><p class="mp">${pick(['Nobody saw you. Nobody ever does.', 'You took the long way past the pharmacy. Worth it.', 'A shop shutter was half up. You helped yourself.', 'Somebody left a bag on a bench. Their loss.'])}</p>
        <p class="mp"><b>Found:</b> ${esc(stacks.map(e => `${e.n > 1 ? e.n + ' ' : ''}${(D.ITEMS[e.k] || { n: e.k }).n.toLowerCase()}`).join(', ') || 'nothing much')}</p>${lost && lost.length ? '<p class="mp warn">Stash full - some was left behind.</p>' : ''}`;
    };
  };

  // ---------------------------------------------------------------- radio (story notifications)
  L.notifyOn = () => { const s = st(); return !!(s && s.radio.push && 'Notification' in window && Notification.permission === 'granted'); };
  L.radio = function (text, key) {
    const s = st(); if (!s) return; const R = s.radio;
    if (key && R.sent[key]) return; if (key) R.sent[key] = Date.now();
    R.feed.unshift({ t: text, at: Date.now() }); R.feed.length = Math.min(R.feed.length, 30);
    for (const k in R.sent) if (Date.now() - R.sent[k] > 10 * 864e5) delete R.sent[k];
    if (L.notifyOn() && document.visibilityState !== 'visible') {
      const body = text.replace(/^\S+\s/, ''), o = { body, icon: 'icon-192.png', badge: 'icon-192.png', tag: key || 'dm' };
      try { if (navigator.serviceWorker && navigator.serviceWorker.controller) navigator.serviceWorker.ready.then(r => r.showNotification('Dead Miles', o)).catch(() => new Notification('Dead Miles', o)); else new Notification('Dead Miles', o); } catch (e) { /* ignore */ }
    }
  };
  // things worth a radio call (checked on the home screen and once a minute while the game is open)
  function radioTick() {
    const v = SV(); if (!v || !v.survivor || !v.tutorialDone) return;
    const d = today();
    try {
      const H = DM.Horde, nx = H && H.next(), left = nx ? nx.at - H.now() : null;
      if (left != null && left < 864e5 && left > 3 * 36e5) L.radio(`📻 "This is Dot. The horde is moving - it hits Sunday 9 PM. Get your watch shift in and check your walls."`, 'horde24' + nx.week);
      if (left != null && left <= 3 * 36e5 && left > 0) L.radio(`📻 "Less than 3 hours. I can hear them from the shop. Defence ${DM.Base && DM.Base.defense ? DM.Base.defense() : '?'} - hope that's enough."`, 'horde3' + nx.week);
    } catch (e) { /* ignore */ }
    try { const w = v.wfx; if (w && w.bag) w.bag.forEach((c, i) => { if (c.got >= c.need) L.radio(`📦 Your ${D.ITEMS[c.k].n.toLowerCase()} clicked open. Something's rattling inside.`, 'cache' + c.k + (c.need) + i + d); }); } catch (e) { /* ignore */ }
    try { const cr = (v.crew && v.crew.list) || []; const hu = cr.filter(m => m.hungry); if (hu.length) L.radio(`🍲 ${hu[0].name}${hu.length > 1 ? ` and ${hu.length - 1} other${hu.length > 2 ? 's' : ''}` : ''} went to bed hungry. Put food in the stash.`, 'hungry' + d); } catch (e) { /* ignore */ }
    try { const gn = DM.Base && DM.Base.gardenNote && DM.Base.gardenNote(); if (gn && /ready/.test(gn)) L.radio(`🌱 The garden: ${gn}.`, 'garden' + d); if (gn && /wilting/.test(gn)) L.radio(`🥀 The garden is wilting. Water it before it dies.`, 'wilt' + d); } catch (e) { /* ignore */ }
    const hr = new Date().getHours(), real = realSteps(v);
    if (hr >= 18 && real < 2000) L.radio(`📻 "Quiet out there today. Too quiet. A short walk would do you good - and the houses won't scout themselves."`, 'quiet' + d);
    if (real >= 10000) L.radio(`📻 "10,000 steps! Half the block heard about it. Dot says she's impressed. She isn't, but she says it."`, 'tenk' + d);
  }
  L.feedHTML = function () {
    const s = st(); if (!s || !s.radio.feed.length) return '';
    const f = s.radio.feed[0], ago = Math.round((Date.now() - f.at) / 60000);
    return `<button class="radiobar" id="lfRadio"><i>📻</i><span>${esc(f.t)}</span><em>${ago < 1 ? 'now' : ago < 60 ? ago + 'm' : Math.round(ago / 60) + 'h'}</em></button>`;
  };
  function pushHTML() {   // 0.64
    if (!('Notification' in window)) { const b = DM.Push && DM.Push.blocker(); return b ? `<p class="mp dim">${esc(b)}</p>` : ''; }
    if (DM.Push && DM.Push.on()) return '<p class="mp dim">Notifications are on, even with the game closed: horde night, food running out, the garden, your partner, a quiet evening.</p><button class="mbtn sm ghost" id="rdOff">Turn notifications off</button>';
    const b = DM.Push && DM.Push.blocker();
    if (L.notifyOn()) return `<p class="mp dim">Notifications are on while the game is open or in the background.${b ? ' ' + esc(b) : ''}</p>${b ? '' : '<button class="mbtn sm" id="rdOn">Also when the game is closed</button>'}<button class="mbtn sm ghost" id="rdOff">Turn notifications off</button>`;
    return `<p class="mp">Get phone notifications: horde night coming, your crew is out of food, the garden is thirsty, your partner walked.</p>${b ? `<p class="mp dim">${esc(b)}</p>` : ''}<button class="mbtn sm" id="rdOn">Turn on notifications</button>`;
  }
  function openRadio() {
    const s = st();
    G().ui.sheetOpen(`<div class="kick">Radio</div><h3>What's going on</h3>
      ${pushHTML()}
      <div class="rdfeed">${s.radio.feed.map(f => `<div class="rdrow"><span>${esc(f.t)}</span><em>${new Date(f.at).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' })}</em></div>`).join('') || '<p class="mp dim">Static. Nothing yet.</p>'}</div>
      <button class="mbtn ghost" id="rdClose">Close</button>`);
    document.getElementById('rdClose').onclick = () => G().ui.sheetClose();
    const on = document.getElementById('rdOn'); if (on) on.onclick = async () => {
      on.disabled = true; on.textContent = 'Turning on...';
      const P = DM.Push, r = P && !P.blocker() ? await P.enable() : null;   // 0.64: real push, even with the game closed
      if (r && r.ok) { s.radio.push = 1; G().save(); toast('Notifications on - even with the game closed', 2.4); openRadio(); return; }
      try { const p = await Notification.requestPermission(); s.radio.push = p === 'granted' ? 1 : 0; G().save(); toast(r && r.why ? r.why : p === 'granted' ? 'Radio notifications on' : 'Notifications are blocked in your phone settings', 3); } catch (e) { toast('This browser cannot show notifications', 2); }
      openRadio();
    };
    const off = document.getElementById('rdOff'); if (off) off.onclick = async () => { s.radio.push = 0; G().save(); if (DM.Push) await DM.Push.disable(); openRadio(); };
  }

  // ---------------------------------------------------------------- first steps reward (new characters only)
  L.markNew = () => { const s = st(); if (s) s.first = 'new'; };   // game.js: when a character is made
  function firstTick() {
    const v = SV(), s = st(); if (!v || !s || s.first !== 'new' || DM.scene) return;
    if ((v.walked || 0) < 300) return;
    if (document.getElementById('msheet').classList.contains('on')) return;
    s.first = 'done'; const items = [['cache2', 1], ['beans', 2], ['water', 2], ['bandage', 2], ['lockpick', 2]];
    G().routeApi.toStash(items.map(([k, n]) => ({ k, n }))); v.trader.caps += 30; G().save(); sfx('open');
    G().ui.sheetOpen(`<div class="kick">Your first steps</div><h3>You're out there now</h3><p class="mp">300 real steps and the city already noticed. Somebody left a crate on a stoop for you:</p>
      <p class="mp"><b>A 2 km walking cache</b> (walk it open), 2 beans, 2 water, 2 bandages, 2 lockpicks and 30 caps - all in your stash.</p>
      <p class="mp dim">Every ~1,000 steps today turns up another house to loot. Keep going.</p><button class="mbtn big" id="frOk">Let's go</button>`);
    document.getElementById('frOk').onclick = () => { G().ui.sheetClose(); G().renderHome(); };
  }

  // ---------------------------------------------------------------- hooks for game.js
  L.tick = function () { buddyTick(); radioTick(); if (DM.Push) DM.Push.sync(); };   // 0.64: keep the push plan current
  L.tiles = () => { const t = []; const b = buddyTile(); if (b) t.push(b); const r = runTile(); if (r) t.push(r); return t; };
  L.has = k => k === 'buddy' || k === 'commute';
  L.html = k => k === 'buddy' ? L.buddyHTML() : L.runHTML();
  L.bind = (k, root, re) => k === 'buddy' ? L.bindBuddy(root, re) : L.bindRun(root, re);
  // after the home screen is drawn: a waiting memorial, the first-steps crate, the radio bar
  L.afterHome = function () {
    const s = st(); if (!s) return;
    const r = document.getElementById('lfRadio'); if (r) r.onclick = () => { sfx('ui'); openRadio(); };
    if (DM.scene || document.getElementById('msheet').classList.contains('on')) return;
    if (s.memNew.length) { const id = s.memNew.shift(), e = s.mem.find(x => x.id === id); G().save(); if (e) { showMemorial(e, () => G().renderHome()); return; } }
    firstTick();
  };
  setInterval(() => { try { if (SV() && SV().survivor) { radioTick(); } } catch (e) { /* ignore */ } }, 60e3);
  const css = document.createElement('style'); css.textContent = `
    .memcard { margin: 6px 0; } .memstone { margin: 4px auto 10px; width: 210px; padding: 18px 10px 14px; border-radius: 90px 90px 12px 12px; background: linear-gradient(#8a8aa0, #6a6a80); border: 3px solid #11142f; text-align: center; box-shadow: 0 6px 0 #11142f; }
    .memrip { font: 900 13px Inter, system-ui, sans-serif; letter-spacing: 3px; color: #2a2838; } .memstone b { display: block; font-size: 22px; font-weight: 900; color: #f6e3bb; text-shadow: 0 2px 0 #11142f; } .memstone span { display: block; font-size: 11px; font-weight: 800; color: #26242f; }
    .memstory { font-style: italic; } .memrow { display: block; width: 100%; text-align: left; margin: 5px 0; padding: 8px 10px; border-radius: 12px; background: rgba(17,20,47,.65); border: 2px solid #3d2d61; color: var(--crm, #f6e3bb); }
    .memrow b { display: block; font-size: 13px; } .memrow span { display: block; font-size: 11px; font-weight: 700; color: var(--mute, #9d90bf); }
    .radiobar { display: flex; align-items: center; gap: 8px; width: 100%; margin: 8px 0 2px; padding: 8px 10px; border-radius: 12px; background: rgba(17,20,47,.7); border: 2px solid #3d2d61; color: var(--crm, #f6e3bb); text-align: left; }
    .radiobar i { font-style: normal; font-size: 18px; } .radiobar span { flex: 1; font-size: 12px; font-weight: 800; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; } .radiobar em { font-style: normal; font-size: 10px; font-weight: 900; color: var(--mute, #9d90bf); }
    .rdfeed { display: grid; gap: 6px; margin: 10px 0; max-height: 50vh; overflow-y: auto; } .rdrow { padding: 8px 10px; border-radius: 12px; background: rgba(17,20,47,.65); border: 2px solid #3d2d61; }
    .rdrow span { display: block; font-size: 13px; font-weight: 800; color: var(--crm, #f6e3bb); } .rdrow em { font-style: normal; font-size: 10px; font-weight: 800; color: var(--mute, #9d90bf); }`;
  document.head.appendChild(css);
})();
