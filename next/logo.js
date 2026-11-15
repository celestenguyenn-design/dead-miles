/* Dead Miles (next) 0.26.6 - the logo (owner: "change the dead miles logo please to a cuter one. With christmas theme").
   Bubbly monoline letters: each letter is a centre-line path stroked thick in ink, then in its colour, then a soft shine,
   so every corner is round. "DEAD" in cream, "MILES" in alternating red / green during the Christmas season, cream + orange
   otherwise. Christmas season (Nov 15 - Jan 6): snow caps on the letters, a Santa hat on the first D, holly on the A,
   a string of fairy lights between the words and a few snowflakes. DM.Logo.full() for the title screen,
   DM.Logo.mini() (one line) for the home header and the character screen. */
'use strict';
window.DM = window.DM || {};
(() => {
  const INK = '#11142f', CRM = '#f6e3bb', RED = '#d9483a', GRN = '#3f8a4a', ORA = '#f07b3c', GOLD = '#f0c23d';
  const G = { // centre lines in a 70-high box: [width, path]
    D: [62, 'M12,6 L12,64 M12,6 Q56,6 56,35 Q56,64 12,64'],
    E: [54, 'M46,6 L12,6 L12,64 L46,64 M12,35 L40,35'],
    A: [62, 'M8,64 L31,6 L54,64 M18,42 L44,42'],
    M: [72, 'M10,64 L10,6 L36,40 L62,6 L62,64'],
    I: [24, 'M12,6 L12,64'],
    L: [52, 'M12,6 L12,64 L46,64'],
    S: [56, 'M47,13 Q40,4 28,5 Q9,7 10,20 Q12,33 30,35 Q50,38 50,51 Q49,65 28,65 Q14,65 7,56'],
  };
  const xmasNow = (d = new Date()) => { const m = d.getMonth() + 1, day = d.getDate(); return (m === 11 && day >= 15) || m === 12 || (m === 1 && day <= 6); };
  function letter(ch, x, y, col, rot, sw) {
    const [w, d] = G[ch];
    return { w, svg: `<g transform="translate(${x} ${y}) rotate(${rot} ${w / 2} 35)">
      <path d="${d}" fill="none" stroke="${INK}" stroke-width="${sw + 11}" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="${d}" fill="none" stroke="${col}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="${d}" fill="none" stroke="rgba(255,255,255,.45)" stroke-width="${Math.max(2, sw * .18)}" stroke-linecap="round" stroke-linejoin="round" transform="translate(-${sw * .14} -${sw * .16})"/></g>` };
  }
  const snowCap = (x, y, w) => `<path d="M${x - 4},${y + 2} q2,-12 ${w * .5},-11 q${w * .5 + 4},-2 ${w * .5 + 6},10 q-3,6 -7,3 q-2,8 -7,3 q-4,7 -8,1 q-4,5 -8,-1 q-5,4 -8,-2 Z" fill="#ffffff" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`;
  const flake = (x, y, r) => `<g transform="translate(${x} ${y})" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" opacity=".9"><path d="M0,-${r} V${r} M-${r * .87},-${r / 2} L${r * .87},${r / 2} M-${r * .87},${r / 2} L${r * .87},-${r / 2}"/></g>`;
  function word(text, x0, y, cols, rots, sw, xmas, gap) {
    let x = x0, out = '', caps = '';
    [...text].forEach((ch, i) => { const L = letter(ch, x, y + (i % 2 ? 3 : 0), cols[i % cols.length], rots[i % rots.length], sw); out += L.svg; if (xmas) caps += snowCap(x + 4, y + (i % 2 ? 3 : 0) - 2, L.w - 8); x += L.w + gap; });
    return { svg: out + caps, w: x - gap - x0 };
  }
  const wordW = (t, gap) => [...t].reduce((a, ch) => a + G[ch][0] + gap, -gap);
  function full(xmas = xmasNow()) {
    const W = 360, sw = 17, gap = 6;
    const dw = wordW('DEAD', gap), mw = wordW('MILES', gap);
    const top = word('DEAD', (W - dw) / 2, 34, [CRM], [-4, 3, -2, 4], sw, xmas, gap);
    const bot = word('MILES', (W - mw) / 2, 146, xmas ? [RED, GRN] : [ORA, CRM], [3, -3, 2, -4, 3], sw, xmas, gap);
    let deco = '', front = '';
    if (xmas) {
      const dx = (W - dw) / 2;
      // Santa hat on the first D
      front += `<g transform="translate(${dx - 14} -2) rotate(-16 30 30)"><path d="M8,40 Q12,8 40,4 Q60,4 66,30 Q50,22 38,26 Q24,30 8,40 Z" fill="${RED}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
        <path d="M2,40 Q34,26 70,32 Q72,42 66,46 Q36,38 6,50 Q0,46 2,40 Z" fill="#ffffff" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><circle cx="68" cy="28" r="8" fill="#ffffff" stroke="${INK}" stroke-width="4"/></g>`;
      // holly on the A
      const ax = dx + G.D[0] + gap + G.E[0] + gap + G.A[0] / 2;
      front += `<g transform="translate(${ax} 56)"><path d="M0,0 q-10,-10 -22,-6 q4,4 0,8 q8,0 10,6 q4,-6 12,-8 Z" fill="${GRN}" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/><path d="M0,0 q10,-10 22,-6 q-4,4 0,8 q-8,0 -10,6 q-4,-6 -12,-8 Z" fill="${GRN}" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>
        <circle cx="-4" cy="2" r="4.2" fill="${RED}" stroke="${INK}" stroke-width="2.2"/><circle cx="4" cy="3" r="4.2" fill="${RED}" stroke="${INK}" stroke-width="2.2"/><circle cx="0" cy="-3" r="4.2" fill="${RED}" stroke="${INK}" stroke-width="2.2"/></g>`;
      // fairy lights between the words
      let wire = 'M18,114', bulbs = '';
      for (let i = 0; i < 8; i++) { const x1 = 18 + (i + 1) * (W - 36) / 8, xm = x1 - (W - 36) / 16; wire += ` Q${xm},${130} ${x1},114`; bulbs += `<g transform="translate(${xm} 121)"><rect x="-2.6" y="-4" width="5.2" height="4" fill="${INK}"/><ellipse cy="5" rx="5" ry="7" fill="${[GOLD, RED, '#7ee0d8', GRN][i % 4]}" stroke="${INK}" stroke-width="2.4"/><ellipse cx="-1.6" cy="2.6" rx="1.4" ry="2.4" fill="#ffffff" opacity=".7"/></g>`; }
      deco = `<path d="${wire}" fill="none" stroke="${INK}" stroke-width="2.4"/>` + bulbs + deco;
      deco += flake(22, 30, 7) + flake(340, 54, 8) + flake(334, 226, 6) + flake(30, 214, 6) + flake(176, 18, 5);
    } else {
      deco += `<path d="M${(W - mw) / 2 + 20},226 v10 a4,4 0 0 0 8,0 v-10" fill="${ORA}" stroke="${INK}" stroke-width="3"/><path d="M${(W + mw) / 2 - 40},226 v16 a4,4 0 0 0 8,0 v-16" fill="${ORA}" stroke="${INK}" stroke-width="3"/>`;
    }
    return `<svg class="tlogo cute" viewBox="0 0 ${W} 250" aria-label="Dead Miles" role="img">${xmas ? deco : ''}${top.svg}${bot.svg}${xmas ? front : deco}</svg>`;
  }
  function mini(xmas = xmasNow()) {
    const sw = 15, gap = 5, W = wordW('DEAD', gap) + 22 + wordW('MILES', gap) + 16;
    const a = word('DEAD', 8, 14, [CRM], [-3, 2, -2, 3], sw, false, gap), b = word('MILES', 8 + a.w + 22, 14, xmas ? [RED, GRN] : [ORA, CRM], [2, -3, 2, -3, 2], sw, false, gap);
    const hat = xmas ? `<g transform="translate(0 -4) rotate(-14 30 30)"><path d="M8,40 Q12,8 40,4 Q60,4 66,30 Q50,22 38,26 Q24,30 8,40 Z" fill="${RED}" stroke="${INK}" stroke-width="5"/><path d="M2,40 Q34,26 70,32 Q72,42 66,46 Q36,38 6,50 Q0,46 2,40 Z" fill="#ffffff" stroke="${INK}" stroke-width="5"/><circle cx="68" cy="28" r="9" fill="#ffffff" stroke="${INK}" stroke-width="5"/></g>` : '';
    return `<svg class="minilogo" viewBox="-6 -8 ${W + 12} 104" aria-label="Dead Miles" role="img">${a.svg}${b.svg}${hat}</svg>`;
  }
  DM.Logo = { full, mini, xmasNow };
})();
