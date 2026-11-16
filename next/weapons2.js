/* Dead Miles (next) 0.54 - new weapons + class weapon upgrades (owner: "I like the new weapons, there should be weapon
   upgrades for classes. Like hunter - bow to crossbow").
   Each class has a signature line of three. Tier 2 also turns up in loot for anyone; tier 3 only comes from upgrading
   your own class's tier 2. Upgrading keeps the quality (Rusty..Masterwork) and fully repairs it.
     Hunter     bow       -> Crossbow      -> Heavy crossbow (bolts go through a zombie)
     Brawler    bat       -> Sledgehammer  -> Demolition sledge (wide, knocks them flying)
     Thief      knife     -> Combat knife  -> Katana (fast, long reach, quiet)
     Scavenger  bat       -> Golf club     -> Lucky 7-iron (critical hits: "FORE!")
     Mechanic   crowbar   -> Pipe wrench   -> Chainsaw (shreds, but LOUD)
   Upgrade: tap the weapon in Gear (hand, pack or stash) -> "Class upgrade". Tier 2 needs level 4, tier 3 level 10. */
'use strict';
window.DM = window.DM || {};
(() => {
  const X = DM.W2 = {};
  const D = DM.D, S = '#11142f';
  // weapon stats (see D.WEAPONS in data.js; crit = chance of double damage, pierce = zombies a bolt goes through, range x)
  Object.assign(D.WEAPONS, {
    golfclub: { n: 'Golf club', dmg: 30, wind: .1, strike: .08, rec: .2, reach: 1.6, dur: 70, noise: 3.5, crit: .18, critTxt: 'FORE!' },
    iron7: { n: 'Lucky 7-iron', dmg: 40, wind: .09, strike: .08, rec: .18, reach: 1.65, dur: 110, noise: 3.5, crit: .32, critTxt: 'FORE!' },
    sledge: { n: 'Sledgehammer', dmg: 62, wind: .28, strike: .12, rec: .4, reach: 1.6, dur: 120, noise: 5.5, kb: 1.5, stun: .3, bonk: 1 },
    demosledge: { n: 'Demolition sledge', dmg: 80, wind: .26, strike: .13, rec: .38, reach: 1.7, dur: 170, noise: 6, kb: 1.9, stun: .45, arc: 2.0, bonk: 1 },
    combatknife: { n: 'Combat knife', dmg: 30, wind: .06, strike: .06, rec: .12, reach: 1.3, dur: 80, noise: 1 },
    katana: { n: 'Katana', dmg: 54, wind: .08, strike: .08, rec: .16, reach: 1.75, dur: 100, noise: 1.4, arc: 1.7 },
    crossbow: { n: 'Crossbow', ranged: 1, dmg: 70, wind: .42, strike: .05, rec: .48, dur: 140, noise: .6, spd: 19, range: 1.25 },
    heavyxbow: { n: 'Heavy crossbow', ranged: 1, dmg: 88, wind: .46, strike: .05, rec: .5, dur: 180, noise: .6, spd: 21, range: 1.4, pierce: 1 },
    pipewrench: { n: 'Pipe wrench', dmg: 38, wind: .14, strike: .1, rec: .24, reach: 1.45, dur: 160, noise: 4, stun: .3, bonk: 1 },
    chainsaw: { n: 'Chainsaw', dmg: 44, wind: .05, strike: .1, rec: .08, reach: 1.55, dur: 220, noise: 9, arc: 1.6, saw: 1 },
  });
  const NEW = {
    golfclub: ['Golf club', 'FORE! 18% chance of a double hit', 18],
    iron7: ['Lucky 7-iron', 'scavenger only · 32% chance of a double hit', 60],
    sledge: ['Sledgehammer', 'huge hits, slow, knocks them back', 30],
    demosledge: ['Demolition sledge', 'brawler only · wide swing, sends them flying', 80],
    combatknife: ['Combat knife', 'fast and quiet', 20],
    katana: ['Katana', 'thief only · fast, long reach, quiet', 70],
    crossbow: ['Crossbow', 'shoots arrows · hits much harder than a bow, slower to reload', 70],
    heavyxbow: ['Heavy crossbow', 'hunter only · bolts go through a zombie', 120],
    pipewrench: ['Pipe wrench', 'tough, BONK - dazes them', 18],
    chainsaw: ['Chainsaw', 'mechanic only · shreds everything, VERY loud', 110],
  };
  for (const k in NEW) { D.ITEMS[k] = { n: NEW[k][0], i: k, w: k, tag: NEW[k][1] }; D.VALUE[k] = NEW[k][2]; }
  for (const k of ['katana', 'crossbow', 'heavyxbow', 'chainsaw', 'demosledge', 'iron7']) D.ITEMS[k].rare = 1;

  // where they turn up (tier 2 only; tier 3 comes from class upgrades)
  for (const [t, k, w] of [['garage', 'golfclub', .4], ['storage', 'golfclub', .25], ['coat', 'golfclub', .12], ['garage', 'sledge', .25], ['workbench', 'sledge', .25], ['storage', 'sledge', .12],
    ['locker', 'combatknife', .35], ['armory', 'combatknife', .35], ['evidence', 'combatknife', .25], ['toolbox', 'pipewrench', .35], ['garage', 'pipewrench', .25], ['workbench', 'pipewrench', .25],
    ['gym', 'crossbow', .12], ['armory', 'crossbow', .18], ['attic', 'crossbow', .08], ['cellar', 'crossbow', .12], ['lockedroom', 'katana', .05], ['safe', 'katana', .04]])
    if (D.LOOT[t]) D.LOOT[t][1][k] = w;
  if (D.SHOP) D.SHOP.push(['golfclub', 1, 55, 1, .3], ['pipewrench', 1, 60, 1, .3], ['sledge', 1, 95, 2, .3], ['combatknife', 1, 70, 2, .3], ['crossbow', 1, 230, 3, .3]);
  if (D.JACK && D.JACK.gun) D.JACK.gun.push([1, ['crossbow', 'arrow']], [1, ['combatknife']]);

  // ---------------------------------------------------------------- class lines
  X.LINES = { hunter: ['bow', 'crossbow', 'heavyxbow'], brawler: ['bat', 'sledge', 'demosledge'], thief: ['knife', 'combatknife', 'katana'], scavenger: ['bat', 'golfclub', 'iron7'], mechanic: ['crowbar', 'pipewrench', 'chainsaw'] };
  X.COST = [null, { lvl: 4, caps: 60, m: [['scrap', 6], ['tape', 2]] }, { lvl: 10, caps: 150, m: [['scrap', 12], ['tape', 4], ['battery', 3]] }];
  X.next = (job, k) => { const L = X.LINES[job]; if (!L) return null; const i = L.indexOf(k); return i >= 0 && i < 2 ? { to: L[i + 1], tier: i + 1, C: X.COST[i + 1] } : null; };
  X.lineOf = k => { for (const j in X.LINES) if (X.LINES[j].indexOf(k) > 0) return j; return null; };

  // ---------------------------------------------------------------- held art (rig space: hand ~ (23,-79), along +y)
  const WA = typeof ART !== 'undefined' && ART.WEAPON_ART, INK = S;
  if (WA) Object.assign(WA, {
    golfclub(c) { c.save(); c.translate(23, -79); c.rotate(-.5); c.lineCap = 'round'; c.strokeStyle = INK; c.lineWidth = 7; c.beginPath(); c.moveTo(0, -12); c.lineTo(0, 64); c.stroke(); c.strokeStyle = '#c9cede'; c.lineWidth = 3.5; c.stroke();
      c.fillStyle = '#2a2440'; c.fillRect(-4, -12, 8, 18); c.fillStyle = '#c9cede'; c.strokeStyle = INK; c.lineWidth = 2.8; c.beginPath(); c.moveTo(-2, 60); c.lineTo(14, 64); c.lineTo(14, 72); c.lineTo(-3, 70); c.closePath(); c.fill(); c.stroke(); c.restore(); },
    iron7(c) { c.save(); c.translate(23, -79); c.rotate(-.5); c.lineCap = 'round'; c.strokeStyle = INK; c.lineWidth = 7; c.beginPath(); c.moveTo(0, -12); c.lineTo(0, 64); c.stroke(); c.strokeStyle = '#e0b94a'; c.lineWidth = 3.5; c.stroke();
      c.fillStyle = '#3fa7a0'; c.fillRect(-4, -12, 8, 18); c.fillStyle = '#ffd23c'; c.strokeStyle = INK; c.lineWidth = 2.8; c.beginPath(); c.moveTo(-2, 60); c.lineTo(15, 63); c.lineTo(15, 73); c.lineTo(-3, 71); c.closePath(); c.fill(); c.stroke(); c.restore(); },
    sledge(c) { c.save(); c.translate(23, -79); c.rotate(-.5); c.lineJoin = 'round'; c.fillStyle = '#b07a45'; c.strokeStyle = INK; c.lineWidth = 3.2; c.beginPath(); c.rect(-4, -12, 8, 72); c.fill(); c.stroke();
      c.fillStyle = '#5c5a6e'; c.beginPath(); c.rect(-16, 56, 32, 18); c.fill(); c.stroke(); c.fillStyle = '#7d8398'; c.fillRect(-14, 58, 28, 5); c.restore(); },
    demosledge(c) { c.save(); c.translate(23, -79); c.rotate(-.5); c.lineJoin = 'round'; c.fillStyle = '#d9483a'; c.strokeStyle = INK; c.lineWidth = 3.2; c.beginPath(); c.rect(-5, -14, 10, 78); c.fill(); c.stroke();
      c.fillStyle = '#3a3848'; c.beginPath(); c.rect(-20, 58, 40, 22); c.fill(); c.stroke(); c.fillStyle = '#ffd23c'; for (let i = 0; i < 4; i++) c.fillRect(-18 + i * 10, 60, 5, 18); c.restore(); },
    combatknife(c) { c.save(); c.translate(23, -79); c.rotate(-.5); c.lineJoin = 'round'; c.fillStyle = '#2a2838'; c.strokeStyle = INK; c.lineWidth = 3.2; c.beginPath(); c.rect(-4, -4, 8, 22); c.fill(); c.stroke();
      c.fillStyle = '#5c5a6e'; c.fillRect(-8, 16, 16, 4); c.fillStyle = '#c9cede'; c.beginPath(); c.moveTo(-5, 20); c.lineTo(5, 20); c.lineTo(4, 50); c.lineTo(-1, 58); c.lineTo(-5, 48); c.closePath(); c.fill(); c.stroke(); c.restore(); },
    katana(c) { c.save(); c.translate(23, -79); c.rotate(-.5); c.lineJoin = 'round'; c.fillStyle = '#2a2440'; c.strokeStyle = INK; c.lineWidth = 3.2; c.beginPath(); c.rect(-3.5, -16, 7, 28); c.fill(); c.stroke();
      c.fillStyle = '#e0b94a'; c.beginPath(); c.ellipse(0, 13, 9, 3.5, 0, 0, 6.3); c.fill(); c.stroke(); c.fillStyle = '#e8ecf6'; c.beginPath(); c.moveTo(-3.5, 16); c.lineTo(3.5, 16); c.quadraticCurveTo(6, 60, -2, 96); c.quadraticCurveTo(-5, 60, -3.5, 16); c.closePath(); c.fill(); c.stroke(); c.restore(); },
    crossbow(c) { c.save(); c.translate(23, -79); c.rotate(-.5); c.lineJoin = 'round'; c.lineCap = 'round'; c.fillStyle = '#8a5a34'; c.strokeStyle = INK; c.lineWidth = 3.2; c.beginPath(); c.rect(-4, -10, 8, 58); c.fill(); c.stroke();
      c.strokeStyle = INK; c.lineWidth = 7; c.beginPath(); c.moveTo(-24, 40); c.quadraticCurveTo(0, 50, 24, 40); c.stroke(); c.strokeStyle = '#3a3848'; c.lineWidth = 3.5; c.stroke();
      c.strokeStyle = '#f6e3bb'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(-24, 40); c.lineTo(0, 30); c.lineTo(24, 40); c.stroke(); c.restore(); },
    heavyxbow(c) { c.save(); c.translate(23, -79); c.rotate(-.5); c.lineJoin = 'round'; c.lineCap = 'round'; c.fillStyle = '#3a3848'; c.strokeStyle = INK; c.lineWidth = 3.2; c.beginPath(); c.rect(-5, -12, 10, 64); c.fill(); c.stroke();
      c.strokeStyle = INK; c.lineWidth = 8; c.beginPath(); c.moveTo(-28, 42); c.quadraticCurveTo(0, 54, 28, 42); c.stroke(); c.strokeStyle = '#5c7836'; c.lineWidth = 4.5; c.stroke();
      c.strokeStyle = '#f6e3bb'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-28, 42); c.lineTo(0, 30); c.lineTo(28, 42); c.stroke(); c.fillStyle = '#d9483a'; c.fillRect(-3, 0, 6, 8); c.restore(); },
    pipewrench(c) { c.save(); c.translate(23, -79); c.rotate(-.5); c.lineJoin = 'round'; c.fillStyle = '#d9483a'; c.strokeStyle = INK; c.lineWidth = 3.2; c.beginPath(); c.rect(-4.5, -8, 9, 56); c.fill(); c.stroke();
      c.fillStyle = '#9aa0b4'; c.beginPath(); c.moveTo(-6, 46); c.lineTo(10, 46); c.lineTo(10, 54); c.lineTo(2, 54); c.lineTo(2, 64); c.lineTo(12, 64); c.lineTo(12, 72); c.lineTo(-6, 72); c.closePath(); c.fill(); c.stroke(); c.restore(); },
    chainsaw(c) { c.save(); c.translate(23, -79); c.rotate(-.5); c.lineJoin = 'round'; c.fillStyle = '#f07b3c'; c.strokeStyle = INK; c.lineWidth = 3.2; c.beginPath(); c.rect(-10, -14, 20, 26); c.fill(); c.stroke();
      c.fillStyle = '#c9cede'; c.beginPath(); c.moveTo(-6, 12); c.lineTo(6, 12); c.lineTo(6, 66); c.quadraticCurveTo(0, 74, -6, 66); c.closePath(); c.fill(); c.stroke();
      c.strokeStyle = '#3a3848'; c.lineWidth = 2; c.setLineDash([3, 3]); c.beginPath(); c.moveTo(-6, 14); c.lineTo(-6, 66); c.moveTo(6, 14); c.lineTo(6, 66); c.stroke(); c.setLineDash([]); c.restore(); },
  });

  // ---------------------------------------------------------------- icons (-36..36)
  const ic = (body, rot = -40) => `<g transform="rotate(${rot})">${body}</g>`;
  const ICONS = {
    golfclub: ic(`<rect x="-3" y="-30" width="6" height="52" fill="#c9cede" stroke="${S}" stroke-width="2.4"/><rect x="-4" y="-32" width="8" height="14" rx="2" fill="#2a2440" stroke="${S}" stroke-width="2.2"/><path d="M-3,20 L14,24 L14,32 L-4,30 Z" fill="#c9cede" stroke="${S}" stroke-width="2.4" stroke-linejoin="round"/>`),
    iron7: ic(`<rect x="-3" y="-30" width="6" height="52" fill="#e0b94a" stroke="${S}" stroke-width="2.4"/><rect x="-4" y="-32" width="8" height="14" rx="2" fill="#3fa7a0" stroke="${S}" stroke-width="2.2"/><path d="M-3,20 L15,23 L15,33 L-4,31 Z" fill="#ffd23c" stroke="${S}" stroke-width="2.4" stroke-linejoin="round"/><text x="6" y="31" font-size="8" font-weight="900" text-anchor="middle" fill="${S}">7</text>`),
    sledge: ic(`<rect x="-3.5" y="-32" width="7" height="50" fill="#b07a45" stroke="${S}" stroke-width="2.4"/><rect x="-16" y="14" width="32" height="17" rx="2" fill="#5c5a6e" stroke="${S}" stroke-width="2.6"/><rect x="-14" y="16" width="28" height="4" fill="#7d8398"/>`, -35),
    demosledge: ic(`<rect x="-4" y="-32" width="8" height="48" fill="#d9483a" stroke="${S}" stroke-width="2.4"/><rect x="-19" y="12" width="38" height="20" rx="2" fill="#3a3848" stroke="${S}" stroke-width="2.6"/><path d="M-15,14 v16 M-6,14 v16 M3,14 v16 M12,14 v16" stroke="#ffd23c" stroke-width="4"/>`, -35),
    combatknife: ic(`<rect x="-4" y="-28" width="8" height="20" rx="2" fill="#2a2838" stroke="${S}" stroke-width="2.4"/><rect x="-9" y="-9" width="18" height="4" fill="#5c5a6e" stroke="${S}" stroke-width="1.8"/><path d="M-5,-5 L5,-5 L4,20 L-1,30 L-5,18 Z" fill="#c9cede" stroke="${S}" stroke-width="2.4" stroke-linejoin="round"/>`),
    katana: ic(`<rect x="-3" y="-34" width="6" height="18" fill="#2a2440" stroke="${S}" stroke-width="2.2"/><ellipse cx="0" cy="-15" rx="8" ry="3" fill="#e0b94a" stroke="${S}" stroke-width="2"/><path d="M-3,-12 L3,-12 Q5,12 -1,34 Q-5,12 -3,-12 Z" fill="#e8ecf6" stroke="${S}" stroke-width="2.2"/>`, -45),
    crossbow: `<g transform="rotate(-30)"><rect x="-4" y="-28" width="8" height="54" rx="2" fill="#8a5a34" stroke="${S}" stroke-width="2.4"/><path d="M-26,8 Q0,18 26,8" stroke="${S}" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M-26,8 Q0,18 26,8" stroke="#3a3848" stroke-width="3.5" fill="none" stroke-linecap="round"/><path d="M-26,8 L0,-4 L26,8" stroke="#f6e3bb" stroke-width="1.4" fill="none"/><path d="M0,-4 V-30" stroke="#d9a46a" stroke-width="2.4"/></g>`,
    heavyxbow: `<g transform="rotate(-30)"><rect x="-5" y="-28" width="10" height="56" rx="2" fill="#3a3848" stroke="${S}" stroke-width="2.4"/><path d="M-29,8 Q0,20 29,8" stroke="${S}" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M-29,8 Q0,20 29,8" stroke="#5c7836" stroke-width="4.5" fill="none" stroke-linecap="round"/><path d="M-29,8 L0,-5 L29,8" stroke="#f6e3bb" stroke-width="1.6" fill="none"/><rect x="-3" y="-18" width="6" height="7" fill="#d9483a"/></g>`,
    pipewrench: ic(`<rect x="-4" y="-32" width="8" height="46" rx="2" fill="#d9483a" stroke="${S}" stroke-width="2.4"/><path d="M-6,12 L10,12 L10,18 L2,18 L2,26 L12,26 L12,32 L-6,32 Z" fill="#9aa0b4" stroke="${S}" stroke-width="2.4" stroke-linejoin="round"/>`),
    chainsaw: ic(`<rect x="-11" y="-32" width="22" height="24" rx="4" fill="#f07b3c" stroke="${S}" stroke-width="2.6"/><path d="M-6,-8 L6,-8 L6,26 Q0,34 -6,26 Z" fill="#c9cede" stroke="${S}" stroke-width="2.4"/><path d="M-6,-6 V26 M6,-6 V26" stroke="#3a3848" stroke-width="2" stroke-dasharray="3 3"/><rect x="-7" y="-28" width="14" height="5" rx="2" fill="#2a2440"/>`),
  };
  if (typeof ART !== 'undefined' && ART.addIcons) ART.addIcons(ICONS);
})();
