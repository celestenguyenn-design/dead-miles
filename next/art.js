/* Dead Miles - house prototype art helpers.
   Rasterises the Style B survivor/zombie (from ../s2art.js) into separately
   animatable parts, builds item icons, and draws tiles/furniture in flat 3/4. */
'use strict';
const ART = (() => {
  const S = S2ART, C = S.C;
  const P = {
    INK: '#11142f', PLUM: '#3d2d61', ORA: '#f07b3c', ORAD: '#c95f2c', CRM: '#f6e3bb', CRMD: '#ead2a4',
    WALL: '#2a1f4a', LIL: '#5a4a86', LILD: '#4a3c70', MUTE: '#9d90bf', GRN: '#93a86c', SHAD: '#1a1336',
    NAVY: '#262a52', RED: '#b53a2e', BLOOD: '#7e1f2a', LIL2: '#7d6aa8', WOOD: '#8a5a4a', WOODD: '#6a4038',
  };
  // The wob filter region is relative to each element's bbox by default; give it a fixed
  // user-space region so separately rendered parts keep identical wobble and are not clipped.
  const DEFS = S.defs.replace(/<filter id="wob"[^>]*>/, '<filter id="wob" filterUnits="userSpaceOnUse" x="-140" y="-290" width="320" height="340">');
  const VB = { x: -82, y: -228, w: 172, h: 236 };

  // ---------- character rigs ----------
  // Line ranges refer to the colour half of the generated SVG; the cream outline half has the
  // same lines in the same order, `mid` lines earlier.
  const RIGS = {
    survivor: {
      src: S.survivor, oshift: 'translate(3.6 -1)',
      parts: [
        { name: 'legB', lines: [70, 75], pivot: [-8, -54] },
        { name: 'legF', lines: [71, 72, 73, 74, 76], pivot: [6, -54] },
        { name: 'body', lines: 'rest', pivot: [0, 0] },
        { name: 'bat', lines: [111, 112, 113, 114, 115, 116], pivot: [10, -104] },
        { name: 'arm', lines: [117, 118, 119, 120, 121], pivot: [10, -104] },
      ],
      skip: [77, 78],
    },
    zombie: {
      src: S.zombie, oshift: 'translate(3 -1)',
      parts: [
        { name: 'armB', lines: rng(65, 71), pivot: [6, -110] },
        { name: 'legB', lines: [72, 73, 74, 77], pivot: [2, -60] },
        { name: 'legF', lines: [75, 76, 78], pivot: [-4, -60] },
        { name: 'body', lines: 'rest', pivot: [0, 0] },
        { name: 'head', lines: rng(109, 141), pivot: [-20, -108] },
        { name: 'armF', lines: rng(89, 99), pivot: [-14, -112] },
      ],
      skip: [],
    },
  };
  function rng(a, b) { const r = []; for (let i = a; i <= b; i++) r.push(i); return r; }

  function svgURL(body, vb, w, h) {
    const s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${w}" height="${h}"><defs>${DEFS}</defs>${body}</svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
  }
  function loadImg(url) {
    return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = url; });
  }
  function toCanvas(im, w, h) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    c.getContext('2d').drawImage(im, 0, 0, w, h); return c;
  }

  const rigs = {};
  async function buildRig(key, res, recolor, as, patch) {
    const R = RIGS[key];
    const L = R.src.split('\n');
    if (patch) patch(L);
    const mid = L.findIndex(l => l.includes('</g></g><g><g class='));
    const colourLines = rng(mid + 1, L.length - 1).filter(i => !/^\s*<\/g><\/g><\/g>\s*$/.test(L[i]));
    const used = new Set(R.skip);
    R.parts.forEach(p => { if (p.lines !== 'rest') p.lines.forEach(i => used.add(i)); });
    const W = Math.ceil(VB.w * res), H = Math.ceil(VB.h * res);
    const vb = `${VB.x} ${VB.y} ${VB.w} ${VB.h}`;
    const out = { res, W, H, parts: [] };
    await Promise.all(R.parts.map(async (p, idx) => {
      const lines = p.lines === 'rest' ? colourLines.filter(i => !used.has(i) && i !== L.length - 1) : p.lines;
      let colour = lines.map(i => L[i]).join('\n');
      colour = colour.replace(/<\/g><\/g><\/g>\s*$/, '');
      if (recolor) for (const a in recolor) colour = colour.split(a).join(recolor[a]);
      // cream sticker copy: same shapes, every non-none fill/stroke turned cream
      let outline = colour.replace(/(fill|stroke)="(?!none)[^"]*"/g, '$1="#f6e3bb"');
      // the last colour line may carry the closing tags of the whole group
      colour = colour.replace(/<\/g><\/g><\/g>\s*$/, '');
      const [io, ic] = await Promise.all([
        loadImg(svgURL(`<g filter="url(#wob)"><g transform="${R.oshift}">${outline}</g></g>`, vb, W, H)),
        loadImg(svgURL(`<g filter="url(#wob)">${colour}</g>`, vb, W, H)),
      ]);
      const o = toCanvas(io, W, H), red = toCanvas(io, W, H), rc = red.getContext('2d');
      rc.globalCompositeOperation = 'source-in'; rc.fillStyle = '#ff5a48'; rc.fillRect(0, 0, W, H);
      out.parts[idx] = { name: p.name, pivot: p.pivot, o, c: toCanvas(ic, W, H), r: red };
    }));
    out.byName = {}; out.parts.forEach(p => out.byName[p.name] = p);
    rigs[as || key] = out;
    return out;
  }

  /* pose: { rot (radians, whole body about feet), sx, sy, parts:{name:{r,dx,dy}} , flash(0..1), alpha }
     x,y = feet in current transform space; scale = css px per svg unit; flip: true = mirror */
  function drawRig(ctx, key, x, y, scale, flip, pose) {
    const rig = rigs[key]; if (!rig) return;
    const s = scale / rig.res;
    ctx.save();
    ctx.translate(x, y);
    if (pose.rot) ctx.rotate(pose.rot);
    ctx.scale((flip ? -1 : 1) * scale * (pose.sx || 1), scale * (pose.sy || 1));
    if (pose.alpha != null) ctx.globalAlpha *= pose.alpha;
    const pp = pose.parts || {};
    const pass = (layer, alphaMul) => {
      for (const p of rig.parts) {
        const t = pp[p.name];
        ctx.save();
        if (t) {
          if (t.dx || t.dy) ctx.translate(t.dx || 0, t.dy || 0);
          if (t.r) { ctx.translate(p.pivot[0], p.pivot[1]); ctx.rotate(t.r); ctx.translate(-p.pivot[0], -p.pivot[1]); }
        }
        if (alphaMul != null) ctx.globalAlpha *= alphaMul;
        if (p.name === 'bat' && pose.weapon && pose.weapon !== 'bat') { if (layer === 'c' && WEAPON_ART[pose.weapon]) WEAPON_ART[pose.weapon](ctx); ctx.restore(); continue; }
        ctx.drawImage(p[layer], VB.x, VB.y, VB.w, VB.h);
        ctx.restore();
      }
    };
    pass('o'); pass('c');
    if (pose.flash > 0) pass(pose.flashRed ? 'r' : 'o', pose.flash);
    ctx.restore();
  }

  // other weapons drawn in rig space along the bat's line (hand ~ (23,-79), tip toward (55,-20))
  const WEAPON_ART = {
    fists: null,
    knife(c) { c.save(); c.translate(23, -79); c.rotate(-.5); c.lineJoin = 'round';
      c.fillStyle = '#3d2d61'; c.strokeStyle = P.INK; c.lineWidth = 3.2; c.beginPath(); c.rect(-4, -2, 8, 22); c.fill(); c.stroke();
      c.fillStyle = '#d8dceb'; c.beginPath(); c.moveTo(-5, 20); c.lineTo(5, 20); c.lineTo(3, 50); c.lineTo(-4, 44); c.closePath(); c.fill(); c.stroke(); c.restore(); },
    crowbar(c) { c.save(); c.translate(23, -79); c.rotate(-.5); c.lineCap = 'round'; c.lineJoin = 'round';
      c.strokeStyle = P.INK; c.lineWidth = 11; c.beginPath(); c.moveTo(0, -14); c.lineTo(0, 62); c.quadraticCurveTo(0, 72, 10, 70); c.stroke();
      c.strokeStyle = '#b53a2e'; c.lineWidth = 6; c.stroke(); c.restore(); },
    axe(c) { c.save(); c.translate(23, -79); c.rotate(-.5); c.lineJoin = 'round';
      c.fillStyle = '#b07a45'; c.strokeStyle = P.INK; c.lineWidth = 3.2; c.beginPath(); c.rect(-4, -10, 8, 74); c.fill(); c.stroke();
      c.fillStyle = '#b9bdcc'; c.beginPath(); c.moveTo(-3, 48); c.lineTo(-30, 40); c.quadraticCurveTo(-36, 56, -30, 72); c.lineTo(-3, 64); c.closePath(); c.fill(); c.stroke(); c.restore(); },
    spikedbat(c) { c.save(); c.translate(23, -79); c.rotate(-.5); c.lineJoin = 'round';
      c.fillStyle = '#e2b77e'; c.strokeStyle = P.INK; c.lineWidth = 3.2; c.beginPath(); c.moveTo(-4, -8); c.lineTo(4, -8); c.lineTo(7, 66); c.quadraticCurveTo(0, 72, -7, 66); c.closePath(); c.fill(); c.stroke();
      c.strokeStyle = '#b9bdcc'; c.lineWidth = 2.4; for (let i = 0; i < 5; i++) { const y = 30 + i * 8, sx = i % 2 ? 1 : -1; c.beginPath(); c.moveTo(sx * 5, y); c.lineTo(sx * 13, y - 3); c.stroke(); } c.restore(); },
    machete(c) { c.save(); c.translate(23, -79); c.rotate(-.5); c.lineJoin = 'round';
      c.fillStyle = '#3d2d61'; c.strokeStyle = P.INK; c.lineWidth = 3.2; c.beginPath(); c.rect(-4, -4, 8, 20); c.fill(); c.stroke();
      c.fillStyle = '#c9cede'; c.beginPath(); c.moveTo(-4, 16); c.lineTo(5, 16); c.quadraticCurveTo(10, 50, 2, 74); c.lineTo(-6, 66); c.closePath(); c.fill(); c.stroke(); c.restore(); },
    prybar(c) { c.save(); c.translate(23, -79); c.rotate(-.5); c.lineCap = 'round'; c.lineJoin = 'round';
      c.strokeStyle = P.INK; c.lineWidth = 9; c.beginPath(); c.moveTo(0, -10); c.lineTo(0, 56); c.lineTo(8, 62); c.stroke();
      c.strokeStyle = '#9aa0b4'; c.lineWidth = 4.5; c.stroke(); c.restore(); },
    bow(c) { c.save(); c.translate(26, -82); c.lineCap = 'round';
      c.strokeStyle = P.INK; c.lineWidth = 9; c.beginPath(); c.moveTo(-6, -46); c.quadraticCurveTo(22, 0, -6, 46); c.stroke();
      c.strokeStyle = '#b07a45'; c.lineWidth = 5; c.stroke();
      c.strokeStyle = '#f6e3bb'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-6, -46); c.lineTo(-6, 46); c.stroke(); c.restore(); },
  };

  // ---------- survivor appearance: body, skin, hair (style + colour), hood up/down, coat, pants ----------
  // Works by patching individual lines of the baked survivor SVG (colour half; mid line 61),
  // so the parts rig (legs / body / arm+bat) keeps working for every look.
  const LOOK = {
    skins: [['#f8dfc2', '#f08a6a'], ['#efc9a0', '#ea8a6a'], ['#d9a477', '#d97a5a'], ['#b97d52', '#c06650'], ['#8a5a3c', '#a8504a'], ['#5e3b27', '#8a4040']],
    hairs: ['#221d2e', '#5a3a28', '#e8c46a', '#c9602c', '#f07aa8', '#b39ae0', '#3fa7a0', '#ecebf2'],
    hairNames: ['Black', 'Brown', 'Blonde', 'Ginger', 'Pink', 'Lilac', 'Teal', 'White'],
    styles: ['Bob', 'Long', 'Twin buns', 'Crop', 'Curls', 'Buzz'],
    coats: [['#f07b3c', '#c95f2c', 'Ember'], ['#3fa7a0', '#2c7c77', 'Teal'], ['#9a62b8', '#744690', 'Plum'], ['#7c9a4c', '#5c7836', 'Moss'], ['#c94a4a', '#9e3434', 'Brick'], ['#e0b43c', '#b48a28', 'Mustard'],
      ['#e8609a', '#b8457a', 'Pink'], ['#f4a6c4', '#d9809f', 'Blush'], ['#6aa8e0', '#4a84b8', 'Sky'], ['#3a4a8a', '#2a3668', 'Navy'], ['#3a3848', '#26242f', 'Black']],
    pants: [['#2f3a72', 'Denim'], ['#2a2838', 'Black'], ['#a08a5a', 'Khaki'], ['#5c6a3a', 'Olive'], ['#8a3a3a', 'Red'], ['#b9bdcc', 'Grey']],
  };
  LOOK.def = { body: 'f', skin: 0, hair: 0, hairC: 0, hood: true, coat: 0, pants: 0 };
  LOOK.norm = l => typeof l === 'number' ? Object.assign({}, LOOK.def, { coat: l }) : Object.assign({}, LOOK.def, l || {});
  LOOK.random = () => { const r = a => Math.floor(Math.random() * a); return { body: r(2) ? 'm' : 'f', skin: r(6), hair: r(6), hairC: r(8), hood: Math.random() < .6, coat: r(LOOK.coats.length), pants: r(LOOK.pants.length) }; };
  const SP = (d, fill, sw = 4.4) => `<path d="${d}" fill="${fill}" stroke="${P.INK}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round" />`;
  const SD = (d, fill, extra = '') => `<path d="${d}" fill="${fill}" ${extra}/>`;
  const SL = (d, col, w) => `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" />`;
  const HAIR_BACK = { // hood down: drawn behind the face (head coords; face ellipse 8,-142 r20/21, facing right)
    0: 'M-20,-144 Q-21,-171 6,-171 Q26,-169 29,-152 L20,-152 Q6,-150 -6,-140 L-4,-122 Q-14,-117 -20,-124 Z',
    1: 'M-20,-144 Q-21,-171 6,-171 Q26,-169 29,-152 L20,-152 Q6,-150 -6,-140 L-2,-112 Q-6,-102 -16,-102 Q-24,-110 -22,-124 Z',
    2: 'M-18,-143 Q-19,-168 6,-169 Q25,-168 28,-153 L20,-152 Q6,-150 -6,-140 L-6,-128 Q-16,-126 -18,-143 Z',
    3: 'M-17,-143 Q-17,-167 6,-168 Q24,-167 28,-154 L20,-153 Q6,-152 -6,-140 L-8,-132 Q-17,-132 -17,-143 Z',
    4: 'M-24,-140 Q-28,-148 -22,-156 Q-26,-166 -16,-170 Q-12,-180 0,-176 Q8,-182 16,-176 Q26,-178 28,-168 Q34,-160 28,-152 L20,-152 Q6,-150 -6,-140 L-6,-126 Q-12,-118 -20,-124 Q-28,-130 -24,-140 Z',
    5: 'M-15,-143 Q-15,-164 6,-165 Q22,-164 27,-155 L18,-154 Q6,-152 -6,-140 L-8,-134 Q-15,-134 -15,-143 Z',
  };
  const FRINGE = { // drawn over the forehead
    0: 'M-12,-148 Q-8,-171 14,-167 Q29,-163 30,-147 Q26,-152 22,-148 Q20,-156 13,-150 Q9,-158 2,-149 Q-4,-156 -12,-148 Z',
    1: 'M-12,-148 Q-8,-171 14,-167 Q29,-163 30,-147 Q26,-150 22,-147 Q18,-157 10,-151 Q4,-157 -2,-150 Q-6,-154 -12,-148 Z',
    2: 'M-12,-148 Q-8,-171 14,-167 Q29,-163 30,-147 Q24,-154 18,-152 Q12,-158 4,-152 Q-4,-156 -12,-148 Z',
    3: 'M-12,-150 Q-8,-170 12,-168 Q28,-166 30,-152 Q22,-160 10,-158 Q2,-158 -12,-150 Z',
    4: 'M-13,-148 Q-14,-158 -6,-160 Q-4,-170 6,-168 Q12,-174 20,-168 Q30,-168 30,-156 Q34,-150 30,-146 Q26,-152 22,-150 Q20,-156 13,-152 Q8,-158 2,-152 Q-4,-156 -8,-150 Q-11,-146 -13,-148 Z',
    5: 'M-12,-152 Q-6,-166 10,-166 Q26,-166 29,-154 Q18,-160 8,-160 Q-2,-160 -12,-152 Z',
  };
  LOOK.patch = function (lk) {
    lk = LOOK.norm(lk);
    const hc = LOOK.hairs[lk.hairC] || LOOK.hairs[0], sk = LOOK.skins[lk.skin] || LOOK.skins[0], m = lk.body === 'm', st = lk.hair;
    return L => {
      // head group lines (colour half): 91 hood, 92 hood shade, 93 hood stitches, 94 face, 95 fringe, 96 strands, 101 brows, 102 lower lid lines, 103 blush
      if (lk.hood) {
        let extra = '';
        if (st === 1) extra = SP('M-6,-130 Q-12,-118 -8,-104 L-2,-106 Q-4,-118 0,-128 Z', hc, 3.2);          // long: a lock out of the hood
        if (st === 4) extra = SP('M-10,-128 Q-16,-122 -12,-114 Q-6,-112 -4,-120 Z', hc, 3.2);
        L[95] = SP(FRINGE[st], hc) + extra;
        L[96] = st === 5 || st === 3 ? '' : SL(st === 4 ? 'M-11,-150 Q-16,-144 -12,-138 M29,-150 Q33,-144 30,-138' : 'M-11,-150 Q-17,-144 -14,-136 M29,-150 Q34,-143 30,-136 M10,-163 Q15,-156 11,-149', hc, 2.2);
      } else {
        let back = SP(HAIR_BACK[st], hc);
        if (st === 2) back = SP('M-12,-168 a8,8 0 1 0 0.1,0 Z', hc) + SP('M8,-174 a8,8 0 1 0 0.1,0 Z', hc) + back;
        const shade = st === 5 ? '' : SD(st === 1 ? 'M-20,-130 Q-24,-112 -16,-104 L-8,-104 Q-14,-118 -12,-132 Z' : 'M-18,-140 Q-20,-150 -12,-158 Q-14,-146 -12,-136 Z', 'rgba(17,20,47,.22)');
        const hoodDown = SP('M-22,-124 Q-28,-110 -16,-106 Q2,-103 18,-108 Q22,-114 16,-118 Q-2,-112 -22,-124 Z', '#f07b3c');   // bunched hood at the neck
        const ear = `<ellipse cx="-9" cy="-138" rx="5" ry="6.4" fill="${sk[0]}" stroke="${P.INK}" stroke-width="3.2"/>`;
        L[91] = back + shade + hoodDown + ear;
        L[92] = ''; L[93] = '';
        L[95] = SP(FRINGE[st], hc);
        L[96] = st === 4 ? SL('M-4,-176 q4,-4 8,0 M14,-176 q4,-4 8,0 M-20,-160 q-2,-5 2,-8', 'rgba(17,20,47,.35)', 1.6) : st === 1 || st === 0 ? SL('M-11,-150 Q-17,-144 -14,-136 M10,-163 Q15,-156 11,-149', 'rgba(17,20,47,.3)', 1.6) : '';
      }
      if (m) {
        L[94] = SP('M-12,-146 Q-12,-163 8,-163 Q28,-163 28,-147 Q28,-130 20,-124 Q10,-119 -1,-123 Q-12,-128 -12,-146 Z', sk[0]);     // squarer jaw
        L[101] = SL('M-.4,-150.6 Q5,-151.6 10,-150.4', P.INK, 2.6) + SL('M15.4,-150.4 Q20.4,-151.8 25.4,-150.8', P.INK, 2.6);       // heavier brows
        L[102] = '';
        L[103] = `<ellipse cx="25.5" cy="-130" rx="3" ry="1.8" fill="${sk[1]}" opacity=".25"/>`;
        // broader shoulders
        L[79] = L[79].replace('M-18,-120 Q-27,-90 -30,-50', 'M-22,-121 Q-29,-90 -31,-50').replace('Q21,-90 15,-120 Q-2,-127 -18,-120 Z', 'Q23,-90 19,-121 Q-2,-129 -22,-121 Z');
        L[80] = L[80].replace('M-18,-120 Q-27,-90 -30,-50', 'M-22,-121 Q-29,-90 -31,-50').replace('Q-14,-122 -18,-120 Z', 'Q-14,-123 -22,-121 Z');
      } else {
        L[101] = L[101] + SL('M8.8,-143.6 l2.8,-2.4 M24.2,-143.6 l2.6,-2.4', P.INK, 1.8);   // lashes
        L[103] = `<ellipse cx="25.5" cy="-130" rx="3.4" ry="2.2" fill="${sk[1]}" opacity=".5"/>`;
      }
    };
  };
  LOOK.recolor = function (lk) {
    lk = LOOK.norm(lk);
    const c = LOOK.coats[lk.coat] || LOOK.coats[0], sk = LOOK.skins[lk.skin] || LOOK.skins[0], pa = LOOK.pants[lk.pants] || LOOK.pants[0];
    const map = {};
    if (c[0] !== '#f07b3c') { map['#f07b3c'] = c[0]; map['#c95f2c'] = c[1]; }
    if (sk[0] !== '#f8dfc2') map['#f8dfc2'] = sk[0];
    if (pa[0] !== '#2f3a72') map['#2f3a72'] = pa[0];
    return Object.keys(map).length ? map : null;
  };

  // ---------- icons ----------
  const EXTRA_ICONS = {
    cloth: `<g transform="rotate(-8)"><path d="M-24,4 Q-24,-2 -18,-2 L18,-2 Q24,-2 24,4 L24,16 Q24,20 18,20 L-18,20 Q-24,20 -24,16 Z" fill="#5a4a86" stroke="#11142f" stroke-width="2.6" stroke-linejoin="round"/>
      <path d="M-22,-10 Q-22,-16 -16,-16 L16,-16 Q22,-16 22,-10 L22,0 Q22,4 16,4 L-16,4 Q-22,4 -22,0 Z" fill="#f07b3c" stroke="#11142f" stroke-width="2.6" stroke-linejoin="round"/>
      <path d="M-16,-6 L16,-6" stroke="#c95f2c" stroke-width="2" stroke-dasharray="3 3"/><path d="M-18,11 L18,11" stroke="#f6e3bb" stroke-width="1.6" stroke-dasharray="3 3" opacity=".7"/></g>`,
    battery: `<g transform="rotate(-20)"><rect x="-10" y="-22" width="20" height="40" rx="4" fill="#93a86c" stroke="#11142f" stroke-width="2.6"/>
      <rect x="-5" y="-27" width="10" height="6" rx="1.5" fill="#b9bdcc" stroke="#11142f" stroke-width="2.2"/>
      <rect x="-10" y="4" width="20" height="14" fill="#11142f" opacity=".85"/><path d="M-4,-8 L4,-8 M0,-12 L0,-4" stroke="#11142f" stroke-width="2.6" stroke-linecap="round"/></g>`,
    tape: `<circle r="20" fill="#b9bdcc" stroke="#11142f" stroke-width="2.6"/><circle r="9" fill="#3d2d61" stroke="#11142f" stroke-width="2.6"/>
      <path d="M-14,-6 A15,15 0 0 1 4,-15" stroke="#ffffff" stroke-width="2" fill="none" opacity=".6" stroke-linecap="round"/><path d="M18,8 L28,22 L20,24 Z" fill="#b9bdcc" stroke="#11142f" stroke-width="2.2" stroke-linejoin="round"/>`,
    book: `<g transform="rotate(-10)"><rect x="-17" y="-22" width="34" height="44" rx="3" fill="#c95f2c" stroke="#11142f" stroke-width="2.6"/>
      <rect x="-17" y="-22" width="7" height="44" fill="#9a4522" stroke="#11142f" stroke-width="2"/><rect x="-4" y="-12" width="16" height="9" fill="#f6e3bb" stroke="#11142f" stroke-width="1.6"/>
      <path d="M17,-18 L20,-16 L20,24 L-12,24 L-14,22" fill="#f6e3bb" stroke="#11142f" stroke-width="2" stroke-linejoin="round"/></g>`,
  };
  Object.assign(EXTRA_ICONS, {
    note: `<g transform="rotate(-8)"><path d="M-18,-24 L14,-24 L18,-14 L12,-6 L18,4 L14,24 L-18,24 Z" fill="#f6e3bb" stroke="#11142f" stroke-width="2.6" stroke-linejoin="round"/>
      <path d="M-12,-14 L8,-14 M-12,-6 L4,-6 M-12,2 L8,2 M-12,10 L2,10" stroke="#5a4a86" stroke-width="2" stroke-linecap="round"/></g>`,
    hook: `<g transform="rotate(35)"><rect x="-3" y="-30" width="6" height="56" rx="2" fill="#b07a45" stroke="#11142f" stroke-width="2.6"/>
      <path d="M0,-28 L0,-34 Q0,-40 6,-40 Q12,-40 12,-34" fill="none" stroke="#11142f" stroke-width="6" stroke-linecap="round"/><path d="M0,-28 L0,-34 Q0,-40 6,-40 Q12,-40 12,-34" fill="none" stroke="#b9bdcc" stroke-width="3" stroke-linecap="round"/></g>`,
    watch: `<path d="M0,-28 L0,-18" stroke="#c9a85a" stroke-width="3"/><circle cx="0" cy="-30" r="4" fill="none" stroke="#11142f" stroke-width="2.4"/>
      <circle r="18" fill="#e0b94a" stroke="#11142f" stroke-width="2.6"/><circle r="13" fill="#f6e3bb" stroke="#11142f" stroke-width="1.8"/>
      <path d="M0,0 L0,-9 M0,0 L6,3" stroke="#11142f" stroke-width="2.2" stroke-linecap="round"/>`,
    ring: `<ellipse cx="0" cy="6" rx="18" ry="14" fill="none" stroke="#11142f" stroke-width="9"/><ellipse cx="0" cy="6" rx="18" ry="14" fill="none" stroke="#e0b94a" stroke-width="5"/>
      <path d="M-8,-10 L0,-20 L8,-10 L0,-4 Z" fill="#9fe0e6" stroke="#11142f" stroke-width="2.4" stroke-linejoin="round"/>`,
  });
  Object.assign(EXTRA_ICONS, {
    bat: `<g transform="rotate(40)"><path d="M-4,-30 Q0,-34 4,-30 L5,14 Q5,17 2,18 L-2,18 Q-5,17 -5,14 Z" fill="#e2b77e" stroke="#11142f" stroke-width="2.6" stroke-linejoin="round"/><rect x="-3.5" y="18" width="7" height="12" rx="2" fill="#3d2d61" stroke="#11142f" stroke-width="2.4"/></g>`,
    axe: `<g transform="rotate(35)"><rect x="-3.5" y="-30" width="7" height="60" rx="2" fill="#b07a45" stroke="#11142f" stroke-width="2.6"/><path d="M-2,-28 L-24,-34 Q-30,-20 -24,-6 L-2,-12 Z" fill="#b9bdcc" stroke="#11142f" stroke-width="2.6" stroke-linejoin="round"/></g>`,
    knife: `<g transform="rotate(40)"><rect x="-4" y="6" width="8" height="22" rx="2" fill="#3d2d61" stroke="#11142f" stroke-width="2.6"/><path d="M-5,6 L5,6 L3,-30 L-4,-22 Z" fill="#d8dceb" stroke="#11142f" stroke-width="2.6" stroke-linejoin="round"/></g>`,
    bow: `<g transform="rotate(20)"><path d="M-6,-30 Q22,0 -6,30" fill="none" stroke="#11142f" stroke-width="8" stroke-linecap="round"/><path d="M-6,-30 Q22,0 -6,30" fill="none" stroke="#b07a45" stroke-width="4.5" stroke-linecap="round"/><path d="M-6,-30 L-6,30" stroke="#f6e3bb" stroke-width="1.6"/></g>`,
    arrow: `<g transform="rotate(-40)"><path d="M-26,0 L22,0" stroke="#11142f" stroke-width="6" stroke-linecap="round"/><path d="M-26,0 L22,0" stroke="#b07a45" stroke-width="3" stroke-linecap="round"/><path d="M22,-6 L32,0 L22,6 Z" fill="#b9bdcc" stroke="#11142f" stroke-width="2"/><path d="M-26,0 L-32,-7 M-26,0 L-32,7 M-20,0 L-26,-7 M-20,0 L-26,7" stroke="#f07b3c" stroke-width="3" stroke-linecap="round"/></g>`,
    wood: `<g transform="rotate(-20)"><rect x="-28" y="-8" width="56" height="16" rx="2" fill="#b07a45" stroke="#11142f" stroke-width="2.6"/><path d="M-20,-2 Q-8,-5 4,-2 M-14,4 Q2,1 16,4" stroke="#7a5030" stroke-width="2" fill="none"/><circle cx="20" cy="0" r="3" fill="#7a5030"/></g>`,
    nails: `<g stroke="#11142f" stroke-width="2.4" stroke-linejoin="round">${[-14, -2, 10].map((x, i) => `<g transform="translate(${x} ${i % 2 ? 4 : -2}) rotate(${-15 + i * 12})"><rect x="-2.5" y="-18" width="5" height="34" fill="#b9bdcc"/><rect x="-7" y="-22" width="14" height="5" rx="1" fill="#9aa0b4"/></g>`).join('')}</g>`,
    spikedbat: `<g transform="rotate(40)"><path d="M-4,-30 Q0,-34 4,-30 L5,14 Q5,17 2,18 L-2,18 Q-5,17 -5,14 Z" fill="#e2b77e" stroke="#11142f" stroke-width="2.6" stroke-linejoin="round"/><rect x="-3.5" y="18" width="7" height="12" rx="2" fill="#3d2d61" stroke="#11142f" stroke-width="2.4"/><path d="M-4,-24 L-11,-27 M4,-17 L11,-20 M-5,-10 L-12,-13 M5,-3 L12,-6" stroke="#b9bdcc" stroke-width="2.6" stroke-linecap="round"/></g>`,
    machete: `<g transform="rotate(40)"><rect x="-4" y="8" width="8" height="20" rx="2" fill="#3d2d61" stroke="#11142f" stroke-width="2.6"/><path d="M-5,8 L5,8 Q9,-14 2,-32 L-6,-26 Z" fill="#c9cede" stroke="#11142f" stroke-width="2.6" stroke-linejoin="round"/></g>`,
    prybar: `<g transform="rotate(-40)"><path d="M-28,0 L22,0 L28,-8" fill="none" stroke="#11142f" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/><path d="M-28,0 L22,0 L28,-8" fill="none" stroke="#9aa0b4" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/></g>`,
    blueprint: `<g transform="rotate(-6)"><rect x="-22" y="-26" width="44" height="52" rx="3" fill="#3f6aa8" stroke="#11142f" stroke-width="2.6"/><path d="M-14,-14 h28 M-14,-4 h20 M-14,6 h24" stroke="#cfe0ff" stroke-width="2" stroke-linecap="round"/><path d="M4,10 l8,8 m0,-8 l-8,8" stroke="#f6e3bb" stroke-width="2.4" stroke-linecap="round"/><rect x="-22" y="-26" width="44" height="7" fill="#2c4f86"/></g>`,
    packplus: `<path d="M-18,-6 a18,18 0 0 1 36,0 v26 a4,4 0 0 1 -4,4 h-28 a4,4 0 0 1 -4,-4 z" fill="#5a6a3a" stroke="#11142f" stroke-width="2.6"/><path d="M-8,-20 v-6 h16 v6" fill="none" stroke="#11142f" stroke-width="2.6"/><rect x="-11" y="4" width="22" height="12" rx="2" fill="#7c9a4c" stroke="#11142f" stroke-width="2"/><path d="M14,-22 h12 M20,-28 v12" stroke="#f07b3c" stroke-width="4" stroke-linecap="round"/>`,
    backpack: `<path d="M-18,-6 a18,18 0 0 1 36,0 v26 a4,4 0 0 1 -4,4 h-28 a4,4 0 0 1 -4,-4 z" fill="#c95f2c" stroke="#11142f" stroke-width="2.6"/><path d="M-8,-20 v-6 h16 v6" fill="none" stroke="#11142f" stroke-width="2.6"/><rect x="-11" y="4" width="22" height="12" rx="2" fill="#f07b3c" stroke="#11142f" stroke-width="2"/><path d="M14,-22 h12 M20,-28 v12" stroke="#93a86c" stroke-width="4" stroke-linecap="round"/>`,
    shoes: `<g stroke="#11142f" stroke-width="2.6" stroke-linejoin="round"><path d="M-28,10 v-14 q8,-4 12,0 l10,6 q8,2 8,8 v4 h-30 z" fill="#5a4a86"/><path d="M0,14 v-14 q8,-4 12,0 l10,6 q8,2 8,8 v4 h-30 z" fill="#6e5ea0"/></g><path d="M-28,14 h30 M0,18 h30" stroke="#f6e3bb" stroke-width="2.4"/>`,
    lockset: `<rect x="-26" y="-14" width="52" height="30" rx="5" fill="#7a5048" stroke="#11142f" stroke-width="2.6"/><path d="M-18,-4 h36 M-18,4 h30 M-18,10 h24" stroke="#d8dceb" stroke-width="2.6" stroke-linecap="round"/><path d="M-26,-10 h52" stroke="#5e3a30" stroke-width="3"/>`,
    parcel: `<g transform="rotate(-8)"><rect x="-22" y="-16" width="44" height="32" rx="3" fill="#b98a5a" stroke="#11142f" stroke-width="2.6"/><path d="M0,-16 v32 M-22,0 h44" stroke="#c94a4a" stroke-width="4"/><circle cx="0" cy="0" r="5" fill="#e0b94a" stroke="#11142f" stroke-width="2"/></g>`,
    caps: `<g stroke="#11142f" stroke-width="2.4">${[[-10, 6], [10, 4], [0, -10]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="12" fill="${['#c94a4a', '#e0b94a', '#3fa7a0'][i]}"/><circle cx="${x}" cy="${y}" r="6" fill="none" stroke="#f6e3bb" stroke-width="1.6"/>`).join('')}</g>`,
    lockpick: `<g transform="rotate(-30)"><rect x="-26" y="-3" width="40" height="6" rx="2" fill="#b9bdcc" stroke="#11142f" stroke-width="2.4"/><path d="M14,-3 L22,-3 L26,-9 L28,-7 L24,3 L14,3" fill="#b9bdcc" stroke="#11142f" stroke-width="2.4" stroke-linejoin="round"/><rect x="-30" y="-6" width="14" height="12" rx="3" fill="#5a4a86" stroke="#11142f" stroke-width="2.4"/></g>
      <g transform="translate(-4 14) rotate(-10)"><path d="M-20,0 L14,0 L14,8" fill="none" stroke="#11142f" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><path d="M-20,0 L14,0 L14,8" fill="none" stroke="#9aa0b4" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></g>`,
    crowbar: `<g transform="rotate(-40)"><path d="M-28,4 L18,4 Q28,4 28,-6 L28,-12" fill="none" stroke="#11142f" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/><path d="M-28,4 L18,4 Q28,4 28,-6 L28,-12" fill="none" stroke="#b53a2e" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M-28,4 L-34,-2" stroke="#11142f" stroke-width="7" stroke-linecap="round"/><path d="M-28,4 L-34,-2" stroke="#9aa0b4" stroke-width="3" stroke-linecap="round"/></g>`,
    cranberry: `<rect x="-15" y="-20" width="30" height="40" rx="4" fill="#b9bdcc" stroke="#11142f" stroke-width="2.6"/><rect x="-15" y="-10" width="30" height="20" fill="#9e2b3a" stroke="#11142f" stroke-width="2"/><circle cx="-4" cy="0" r="3.4" fill="#e04a5a"/><circle cx="4" cy="2" r="3" fill="#e04a5a"/><circle cx="1" cy="-4" r="2.6" fill="#e04a5a"/>`,
    stuffing: `<g transform="rotate(6)"><path d="M-18,-22 L18,-22 L20,24 L-20,24 Z" fill="#e8a24a" stroke="#11142f" stroke-width="2.6" stroke-linejoin="round"/><rect x="-14" y="-10" width="28" height="16" rx="3" fill="#f6e3bb" stroke="#11142f" stroke-width="1.8"/><circle cx="-6" cy="-2" r="2.4" fill="#93a86c"/><circle cx="2" cy="-1" r="2.4" fill="#c95f2c"/><circle cx="8" cy="-3" r="2" fill="#93a86c"/></g>`,
    pie: `<path d="M-26,4 Q0,-26 26,4 L22,12 L-22,12 Z" fill="#e0a050" stroke="#11142f" stroke-width="2.6" stroke-linejoin="round"/><path d="M-20,2 Q0,-18 20,2 Z" fill="#d9772e"/><path d="M-12,-6 Q-6,-10 0,-8 M4,-8 Q10,-8 12,-4" stroke="#f6e3bb" stroke-width="2.2" stroke-linecap="round" fill="none"/><path d="M-22,12 L22,12 L20,18 L-20,18 Z" fill="#b9bdcc" stroke="#11142f" stroke-width="2.2" stroke-linejoin="round"/>`,
    turkey: `<ellipse cx="0" cy="14" rx="28" ry="8" fill="#e8e2d4" stroke="#11142f" stroke-width="2.4"/><path d="M-22,8 Q-24,-16 0,-18 Q24,-16 22,8 Z" fill="#c9782e" stroke="#11142f" stroke-width="2.6" stroke-linejoin="round"/><path d="M-12,-10 Q-4,-14 4,-12" stroke="#f0b06a" stroke-width="3" stroke-linecap="round" fill="none"/><path d="M18,-6 L28,-14 M-18,-6 L-28,-14" stroke="#11142f" stroke-width="5" stroke-linecap="round"/><circle cx="28" cy="-15" r="4" fill="#f6e3bb" stroke="#11142f" stroke-width="2"/><circle cx="-28" cy="-15" r="4" fill="#f6e3bb" stroke="#11142f" stroke-width="2"/>`,
    hat: `<ellipse cx="0" cy="14" rx="30" ry="9" fill="#2a2440" stroke="#11142f" stroke-width="2.6"/><path d="M-16,12 L-12,-22 L12,-22 L16,12 Z" fill="#2a2440" stroke="#11142f" stroke-width="2.6" stroke-linejoin="round"/><rect x="-15" y="2" width="30" height="8" fill="#5a4a86" stroke="#11142f" stroke-width="1.8"/><rect x="-6" y="0" width="12" height="12" rx="1" fill="none" stroke="#e0b94a" stroke-width="3"/>`,
  });
  const iconURL = {};
  function buildIcons() {
    const all = Object.assign({}, S.icons, EXTRA_ICONS);
    for (const k in all) iconURL[k] = svgURL(all[k], '-36 -36 72 72', 96, 96);
  }

  // ---------- drawing helpers ----------
  function rr(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }
  function blk(ctx, x, y, w, h, fill, r = 3, lw = 2.4) {
    rr(ctx, x, y, w, h, r);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (lw) { ctx.lineWidth = lw; ctx.strokeStyle = P.INK; ctx.stroke(); }
  }
  function line(ctx, x1, y1, x2, y2, col, lw) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.stroke(); }
  function dot(ctx, x, y, r, col) { ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fillStyle = col; ctx.fill(); }

  // deterministic hash for tile variation
  function hash(x, y, s = 0) { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }

  // ---------- floors ----------
  const FLOOR = {
    k: { a: '#39406a', b: '#2f3559', kind: 'check' },
    b: { a: '#4a5f7e', b: '#3f5270', kind: 'smalltile' },
    c: { a: '#3a2f52', b: '#30274a', kind: 'boards' },
    s: { a: '#33304a', b: '#2a2840', kind: 'concrete' },
    r: { a: '#4f3a66', b: '#463360', kind: 'carpet' },
    l: { a: '#4d3a5e', b: '#43335a', kind: 'planks' },
    h: { a: '#453453', b: '#3c2e4b', kind: 'planks' },
    o: { a: '#353452', b: '#2c2b46', kind: 'sidewalk' },
    a: { a: '#3a2c3c', b: '#2c2030', kind: 'boards' },
    m: { a: '#4a5272', b: '#40486a', kind: 'smalltile' },
    g: { a: '#3c3a4e', b: '#323044', kind: 'concrete' },
    w: { a: '#4e3a50', b: '#443248', kind: 'planks' },
    y: { a: '#6a5040', b: '#5c4436', kind: 'planks' },
    x: { a: '#342a36', b: '#2a222c', kind: 'concrete' },
    t: { a: '#4a4466', b: '#3e3a5a', kind: 'check' },
    q: { a: '#3e5068', b: '#34465e', kind: 'check' },
    Y: { a: '#2f3f3c', b: '#283633', kind: 'grass' },   // base yard
    X: { a: '#2a2638', b: '#232031', kind: 'dirt' },    // outside the base walls
  };
  function drawFloorTile(ctx, room, tx, ty, T) {
    const f = FLOOR[room]; if (!f) return;
    const x = tx * T, y = ty * T;
    ctx.fillStyle = f.a; ctx.fillRect(x, y, T, T);
    const v = hash(tx, ty);
    if (f.kind === 'check') {
      const h = T / 2;
      ctx.fillStyle = f.b;
      ctx.fillRect(x, y, h, h); ctx.fillRect(x + h, y + h, h, h);
      ctx.fillStyle = 'rgba(255,255,255,.035)'; ctx.fillRect(x + 2, y + 2, h - 4, 3);
      if (v < .12) { line(ctx, x + 6, y + 30, x + 16, y + 36, 'rgba(17,20,47,.45)', 1.2); }
    } else if (f.kind === 'smalltile') {
      ctx.strokeStyle = f.b; ctx.lineWidth = 1.6;
      for (let i = 0; i <= 4; i++) { line(ctx, x + i * T / 4, y, x + i * T / 4, y + T, f.b, 1.6); line(ctx, x, y + i * T / 4, x + T, y + i * T / 4, f.b, 1.6); }
      if (v < .2) { ctx.fillStyle = 'rgba(17,20,47,.18)'; ctx.fillRect(x + (v * 40 | 0) % 33, y + 11, 11, 11); }
    } else if (f.kind === 'planks' || f.kind === 'boards') {
      const n = 4, ph = T / n;
      for (let i = 0; i < n; i++) {
        line(ctx, x, y + i * ph, x + T, y + i * ph, f.b, 1.3);
        if (hash(tx, ty, i + 7) < .3) { const off = 6 + hash(tx, ty, i) * (T - 12); line(ctx, x + off, y + i * ph, x + off, y + (i + 1) * ph, f.b, 1.2); }
        if (hash(tx, ty, i) < .25) { ctx.fillStyle = 'rgba(255,255,255,.03)'; ctx.fillRect(x, y + i * ph + 2, T, 3); }
      }
      if (v < .06) { dot(ctx, x + 30, y + 20, 1.6, 'rgba(17,20,47,.5)'); }
    } else if (f.kind === 'carpet') {
      ctx.fillStyle = f.b;
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if ((i + j + tx + ty) % 2 === 0) ctx.fillRect(x + i * 11 + 4, y + j * 11 + 4, 2, 2);
    } else if (f.kind === 'concrete') {
      if (v < .35) line(ctx, x + v * 40, y + 4, x + v * 20 + 14, y + 30, 'rgba(17,20,47,.5)', 1.3);
      ctx.fillStyle = 'rgba(255,255,255,.025)'; ctx.fillRect(x + 6, y + 8, 12, 6);
    } else if (f.kind === 'grass') {
      for (let i = 0; i < 5; i++) { const gx = x + 4 + hash(tx, ty, i) * (T - 8), gy = y + 6 + hash(tx, ty, i + 9) * (T - 10); line(ctx, gx, gy, gx - 2, gy - 6, i % 2 ? '#3d5246' : '#45604f', 1.6); line(ctx, gx + 2, gy, gx + 4, gy - 5, '#3d5246', 1.4); }
      if (v < .15) { dot(ctx, x + 10 + v * 120, y + 30, 2, 'rgba(246,227,187,.35)'); }
      if (v > .8) { ctx.fillStyle = f.b; ctx.beginPath(); ctx.ellipse(x + 22, y + 24, 14, 8, v * 3, 0, 6.28); ctx.fill(); }
    } else if (f.kind === 'dirt') {
      ctx.fillStyle = f.b; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(x + 8 + hash(tx, ty, i) * 28, y + 8 + hash(tx, ty, i + 3) * 28, 6, 3, 0, 0, 6.28); ctx.fill(); }
      if (v < .18) line(ctx, x + 6, y + 30, x + 30, y + 26, 'rgba(17,20,47,.5)', 1.3);
      if (v > .88) { dot(ctx, x + 30, y + 14, 3, '#3a3448'); dot(ctx, x + 33, y + 16, 2, '#4a4458'); }
    } else if (f.kind === 'sidewalk') {
      line(ctx, x, y, x + T, y, f.b, 2); line(ctx, x, y, x, y + T, f.b, 2);
      if (v < .2) line(ctx, x + 8, y + 10, x + 26, y + 22, 'rgba(17,20,47,.5)', 1.3);
    }
  }

  // ---------- wall faces ----------
  const WALLFACE = {
    k: { a: '#5c6a8e', b: '#4c5880', trim: '#3a4470', kind: 'tile' },
    b: { a: '#7d8fae', b: '#6a7c9c', trim: '#4a5a7a', kind: 'tile' },
    c: { a: '#4a3c70', b: '#3f3363', trim: '#2a1f4a', kind: 'plain' },
    s: { a: '#3a3550', b: '#2f2b44', trim: '#221f36', kind: 'brick' },
    r: { a: '#6a4d86', b: '#5e4279', trim: '#3d2d61', kind: 'stripe' },
    l: { a: '#5a4a86', b: '#4d3f78', trim: '#3d2d61', kind: 'wainscot' },
    h: { a: '#523f6e', b: '#463562', trim: '#2a1f4a', kind: 'wainscot' },
    o: { a: '#3d2d61', b: '#33264f', trim: '#1a1336', kind: 'brickout' },
    a: { a: '#4a3640', b: '#3a2a34', trim: '#22161e', kind: 'brick' },
    m: { a: '#6a7a9a', b: '#5c6c8c', trim: '#3a4470', kind: 'tile' },
    g: { a: '#4a4660', b: '#3e3a54', trim: '#262236', kind: 'brick' },
    w: { a: '#5e4a6e', b: '#523f62', trim: '#3d2d61', kind: 'wainscot' },
    y: { a: '#5a5478', b: '#4e486c', trim: '#2a2448', kind: 'brick' },
    x: { a: '#40323c', b: '#342830', trim: '#1e161c', kind: 'brick' },
    t: { a: '#6a6488', b: '#5c567c', trim: '#3d2d61', kind: 'wainscot' },
    q: { a: '#5c7290', b: '#4e6482', trim: '#34466a', kind: 'tile' },
  };
  function drawWallFace(ctx, room, x, y, w, h, tx) {
    const f = WALLFACE[room] || WALLFACE.h;
    ctx.fillStyle = f.a; ctx.fillRect(x, y, w, h);
    if (f.kind === 'tile') {
      const s = 11;
      for (let yy = y + h * .42; yy < y + h - 6; yy += s) line(ctx, x, yy, x + w, yy, f.b, 1.4);
      for (let xx = x + (tx % 2) * 5; xx < x + w; xx += s) line(ctx, xx, y + h * .42, xx, y + h - 6, f.b, 1.4);
      ctx.fillStyle = f.b; ctx.fillRect(x, y + h * .42 - 3, w, 3);
    } else if (f.kind === 'stripe') {
      ctx.fillStyle = f.b; for (let xx = x + ((tx * 44) % 14); xx < x + w; xx += 14) ctx.fillRect(xx, y, 5, h);
    } else if (f.kind === 'wainscot') {
      ctx.fillStyle = f.b; ctx.fillRect(x, y + h * .55, w, h * .45);
      line(ctx, x, y + h * .55, x + w, y + h * .55, f.trim, 3);
      for (let xx = x + 11; xx < x + w; xx += 22) line(ctx, xx, y + h * .6, xx, y + h - 6, f.trim, 1.2);
    } else if (f.kind === 'brick' || f.kind === 'brickout') {
      for (let r = 0, yy = y + 4; yy < y + h - 4; yy += 9, r++) {
        line(ctx, x, yy, x + w, yy, f.b, 1.4);
        for (let xx = x + (r % 2) * 10 + 4; xx < x + w; xx += 20) line(ctx, xx, yy, xx, yy + 9, f.b, 1.4);
      }
    }
    // baseboard + top shade
    ctx.fillStyle = f.trim; ctx.fillRect(x, y + h - 6, w, 6);
    ctx.fillStyle = 'rgba(17,20,47,.28)'; ctx.fillRect(x, y, w, 5);
  }

  // ---------- furniture ----------
  // f: {type, x,y,w,h (px footprint), H, searched, open(0..1)}
  // geometry: front face [fy0..fy1], top face [ty0..fy0]
  function geo(f) {
    const d = Math.min(f.h * 0.62, f.d || 999);
    const fy1 = f.y + f.h, fy0 = fy1 - f.H, ty0 = fy0 - d;
    return { x: f.x, w: f.w, fy0, fy1, ty0, d, H: f.H };
  }
  function box(ctx, g, top, front, r = 4) {
    // whole silhouette with outline, then faces
    rr(ctx, g.x, g.ty0, g.w, g.fy1 - g.ty0, r); ctx.fillStyle = front; ctx.fill();
    ctx.fillStyle = top; rr(ctx, g.x, g.ty0, g.w, g.d + 2, r); ctx.fill();
    line(ctx, g.x + 1, g.fy0, g.x + g.w - 1, g.fy0, P.INK, 2);
    rr(ctx, g.x, g.ty0, g.w, g.fy1 - g.ty0, r); ctx.lineWidth = 2.6; ctx.strokeStyle = P.INK; ctx.stroke();
  }
  function shade(ctx, x, y, w, h, a = .22) { ctx.fillStyle = `rgba(17,20,47,${a})`; ctx.fillRect(x, y, w, h); }
  function knob(ctx, x, y) { dot(ctx, x, y, 2.4, P.INK); dot(ctx, x - .6, y - .6, 1, P.MUTE); }
  function cabinetDoors(ctx, x, y, w, h, n, open, col) {
    const dw = w / n;
    for (let i = 0; i < n; i++) {
      const dx = x + i * dw;
      if (open) {
        blk(ctx, dx + 3, y + 3, dw - 6, h - 6, '#140f26', 2, 2);
        line(ctx, dx + 5, y + h * .5, dx + dw - 5, y + h * .5, '#2a1f4a', 2);
        // swung door, seen edge-on
        const hx = i % 2 === 0 ? dx + 2 : dx + dw - 2;
        const s = i % 2 === 0 ? -1 : 1;
        ctx.beginPath(); ctx.moveTo(hx, y + 2); ctx.lineTo(hx + s * 7, y + 6); ctx.lineTo(hx + s * 7, y + h + 2); ctx.lineTo(hx, y + h - 2); ctx.closePath();
        ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = P.INK; ctx.stroke();
      } else {
        blk(ctx, dx + 3, y + 3, dw - 6, h - 6, null, 2, 1.8);
        knob(ctx, i % 2 === 0 ? dx + dw - 8 : dx + 8, y + h * .45);
      }
    }
  }
  function drawers(ctx, x, y, w, h, n, openIdx) {
    const dh = h / n;
    for (let i = 0; i < n; i++) {
      const dy = y + i * dh;
      if (i === openIdx) {
        blk(ctx, x + 2, dy + 2, w - 4, dh - 3, '#140f26', 2, 1.8);
        blk(ctx, x + 1, dy + 5, w - 2, dh, P.LIL2, 2, 2);
        line(ctx, x + w / 2 - 5, dy + 5 + dh / 2, x + w / 2 + 5, dy + 5 + dh / 2, P.INK, 2.4);
      } else {
        blk(ctx, x + 3, dy + 2, w - 6, dh - 3, null, 2, 1.6);
        line(ctx, x + w / 2 - 5, dy + dh / 2, x + w / 2 + 5, dy + dh / 2, P.INK, 2.4);
      }
    }
  }

  const FURN = {
    fridge(ctx, f, g, t) {
      box(ctx, g, '#8676b0', P.LIL, 5);
      shade(ctx, g.x + 2, g.fy0 + 1, 7, g.H - 3, .25);
      const split = g.fy0 + g.H * .34;
      line(ctx, g.x, split, g.x + g.w, split, P.INK, 2.4);
      if (f.searched) {
        blk(ctx, g.x + 4, split + 3, g.w - 8, g.fy1 - split - 7, '#bfe0e6', 2, 2);
        ctx.fillStyle = 'rgba(17,20,47,.35)'; ctx.fillRect(g.x + 6, split + 14, g.w - 12, 2.4); ctx.fillRect(g.x + 6, split + 26, g.w - 12, 2.4);
        dot(ctx, g.x + 14, split + 10, 3, P.ORA);
        ctx.beginPath(); ctx.moveTo(g.x + g.w - 2, split + 2); ctx.lineTo(g.x + g.w + 10, split + 8); ctx.lineTo(g.x + g.w + 10, g.fy1 + 3); ctx.lineTo(g.x + g.w - 2, g.fy1 - 2); ctx.closePath();
        ctx.fillStyle = '#6e5e9c'; ctx.fill(); ctx.lineWidth = 2.2; ctx.strokeStyle = P.INK; ctx.stroke();
      } else {
        line(ctx, g.x + g.w - 8, split + 6, g.x + g.w - 8, split + 22, P.INK, 3);
        line(ctx, g.x + g.w - 8, g.fy0 + 5, g.x + g.w - 8, split - 5, P.INK, 3);
        ctx.fillStyle = P.CRM; ctx.fillRect(g.x + 10, split + 10, 10, 12);
        ctx.strokeStyle = P.INK; ctx.lineWidth = 1.2; ctx.strokeRect(g.x + 10, split + 10, 10, 12);
        dot(ctx, g.x + 13, g.fy0 + 10, 3.2, P.ORA);
      }
    },
    counter(ctx, f, g) {
      box(ctx, g, P.CRMD, P.LILD, 3);
      line(ctx, g.x, g.fy0 + 7, g.x + g.w, g.fy0 + 7, P.INK, 1.6);
      cabinetDoors(ctx, g.x + 2, g.fy0 + 8, g.w - 4, g.H - 10, Math.max(1, Math.round(g.w / 30)), f.searched, P.LIL);
      // clutter on top
      if (f.clutter !== false) { blk(ctx, g.x + 8, g.ty0 + 6, 10, 9, P.ORA, 2, 1.6); blk(ctx, g.x + g.w - 22, g.ty0 + 4, 14, 8, P.MUTE, 3, 1.6); }
    },
    island(ctx, f, g) {
      box(ctx, g, P.CRMD, P.LIL, 3);
      drawers(ctx, g.x + 4, g.fy0 + 4, g.w - 8, g.H - 6, 2, f.searched ? 0 : -1);
      blk(ctx, g.x + g.w * .55, g.ty0 + 5, 18, 12, '#b9bdcc', 4, 1.8);
      dot(ctx, g.x + 16, g.ty0 + 11, 4, P.GRN); dot(ctx, g.x + 24, g.ty0 + 9, 3.5, P.ORA);
    },
    stove(ctx, f, g) {
      box(ctx, g, '#c9c3d6', '#b9bdcc', 3);
      for (const [ox, oy] of [[.3, .32], [.7, .32], [.3, .72], [.7, .72]]) {
        ctx.beginPath(); ctx.ellipse(g.x + g.w * ox, g.ty0 + g.d * oy, 6, 4, 0, 0, 6.28); ctx.fillStyle = P.INK; ctx.fill();
        ctx.beginPath(); ctx.ellipse(g.x + g.w * ox, g.ty0 + g.d * oy, 3, 2, 0, 0, 6.28); ctx.fillStyle = '#3a3550'; ctx.fill();
      }
      for (let i = 0; i < 4; i++) dot(ctx, g.x + 8 + i * 9, g.fy0 + 5, 2, P.INK);
      if (f.searched) {
        blk(ctx, g.x + 4, g.fy0 + 10, g.w - 8, g.H - 14, '#140f26', 2, 2);
        blk(ctx, g.x + 2, g.fy1 - 6, g.w - 4, 9, '#9a9db0', 2, 2);
      } else {
        blk(ctx, g.x + 5, g.fy0 + 10, g.w - 10, g.H - 15, '#2a2440', 3, 2);
        line(ctx, g.x + 9, g.fy0 + 13, g.x + g.w - 9, g.fy0 + 13, '#9a9db0', 2.6);
        ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(g.x + 9, g.fy0 + 17, 8, 3);
      }
    },
    sink(ctx, f, g) {
      box(ctx, g, P.CRMD, P.LILD, 3);
      blk(ctx, g.x + g.w * .25, g.ty0 + 5, g.w * .5, g.d - 9, '#8e98b4', 5, 2);
      blk(ctx, g.x + g.w * .25 + 4, g.ty0 + 8, g.w * .5 - 8, g.d - 15, '#6a7494', 4, 0);
      line(ctx, g.x + g.w / 2, g.ty0 + 1, g.x + g.w / 2, g.ty0 + 8, P.INK, 3);
      line(ctx, g.x + 2, g.fy0 + 7, g.x + g.w - 2, g.fy0 + 7, P.INK, 1.6);
      cabinetDoors(ctx, g.x + 2, g.fy0 + 8, g.w - 4, g.H - 10, 2, f.searched, P.LIL);
    },
    drawers(ctx, f, g) {
      box(ctx, g, P.CRMD, P.LILD, 3);
      drawers(ctx, g.x + 3, g.fy0 + 3, g.w - 6, g.H - 5, 3, f.searched ? 0 : -1);
      blk(ctx, g.x + 10, g.ty0 + 5, 20, 7, P.WOOD, 2, 1.6);
    },
    pantry(ctx, f, g) {
      box(ctx, g, '#6a5a96', P.LIL, 4);
      shade(ctx, g.x + 2, g.fy0 + 1, 7, g.H - 3, .22);
      if (f.searched) {
        blk(ctx, g.x + 4, g.fy0 + 4, g.w - 8, g.H - 8, '#140f26', 2, 2);
        for (let i = 1; i < 4; i++) line(ctx, g.x + 6, g.fy0 + i * g.H / 4, g.x + g.w - 6, g.fy0 + i * g.H / 4, P.WOODD, 3);
        blk(ctx, g.x + 10, g.fy0 + g.H / 4 - 10, 8, 9, P.ORA, 1, 1.4);
        ctx.beginPath(); ctx.moveTo(g.x + 2, g.fy0 + 2); ctx.lineTo(g.x - 9, g.fy0 + 8); ctx.lineTo(g.x - 9, g.fy1 + 2); ctx.lineTo(g.x + 2, g.fy1 - 2); ctx.closePath();
        ctx.fillStyle = P.LIL; ctx.fill(); ctx.lineWidth = 2.2; ctx.strokeStyle = P.INK; ctx.stroke();
      } else {
        line(ctx, g.x + g.w / 2, g.fy0 + 3, g.x + g.w / 2, g.fy1 - 3, P.INK, 2);
        blk(ctx, g.x + 6, g.fy0 + 6, g.w / 2 - 10, g.H * .4, null, 2, 1.4); blk(ctx, g.x + g.w / 2 + 4, g.fy0 + 6, g.w / 2 - 10, g.H * .4, null, 2, 1.4);
        knob(ctx, g.x + g.w / 2 - 5, g.fy0 + g.H * .55); knob(ctx, g.x + g.w / 2 + 5, g.fy0 + g.H * .55);
      }
    },
    hutch(ctx, f, g) {
      box(ctx, g, '#7a5048', P.WOOD, 4);
      // glass top half with plates
      blk(ctx, g.x + 5, g.fy0 + 5, g.w - 10, g.H * .45, '#2a2440', 2, 2);
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(g.x + 14 + i * ((g.w - 28) / 3), g.fy0 + 5 + g.H * .25, 6, 7, 0, 0, 6.28); ctx.fillStyle = i % 2 ? P.CRM : '#c9c3d6'; ctx.fill(); ctx.lineWidth = 1.4; ctx.strokeStyle = P.INK; ctx.stroke(); }
      line(ctx, g.x + 5, g.fy0 + 5 + g.H * .45 - 2, g.x + g.w - 5, g.fy0 + 5 + g.H * .45 - 2, P.WOODD, 3);
      drawers(ctx, g.x + 4, g.fy0 + g.H * .52, g.w - 8, g.H * .45, 2, f.searched ? 1 : -1);
    },
    trash(ctx, f, g) {
      const x = g.x + 8, w = g.w - 16;
      blk(ctx, x, g.ty0 + 4, w, g.fy1 - g.ty0 - 4, '#6e7690', 4, 2.4);
      blk(ctx, x - 2, g.ty0 + 1, w + 4, 9, f.searched ? '#2a2440' : '#868ea8', 3, 2.2);
      for (let i = 1; i < 3; i++) line(ctx, x + i * w / 3, g.ty0 + 14, x + i * w / 3, g.fy1 - 4, '#4e5670', 1.6);
      if (f.searched) { dot(ctx, x + w + 6, g.fy1 - 3, 3, P.CRM); dot(ctx, x - 5, g.fy1 - 1, 2.4, P.MUTE); }
    },
    table(ctx, f, g) {
      // legs then top
      const lx = [g.x + 6, g.x + g.w - 10];
      for (const xx of lx) { blk(ctx, xx, g.fy0, 5, g.H, P.WOODD, 1, 1.8); }
      rr(ctx, g.x, g.ty0, g.w, g.d + 7, 4); ctx.fillStyle = P.WOOD; ctx.fill();
      ctx.fillStyle = '#9d6a56'; rr(ctx, g.x, g.ty0, g.w, g.d, 4); ctx.fill();
      rr(ctx, g.x, g.ty0, g.w, g.d + 7, 4); ctx.lineWidth = 2.6; ctx.strokeStyle = P.INK; ctx.stroke();
      line(ctx, g.x + 1, g.ty0 + g.d, g.x + g.w - 1, g.ty0 + g.d, P.INK, 1.8);
      if (f.cloth) {
        rr(ctx, g.x + g.w * .2, g.ty0 + 4, g.w * .6, g.d - 6, 3); ctx.fillStyle = P.CRM; ctx.fill(); ctx.lineWidth = 1.4; ctx.stroke();
        ctx.fillStyle = P.ORA; for (let i = 0; i < 4; i++) ctx.fillRect(g.x + g.w * .2 + 6 + i * 16, g.ty0 + 7, 7, g.d - 12);
      }
      if (f.items) { blk(ctx, g.x + 14, g.ty0 + 10, 12, 10, '#c9c3d6', 5, 1.6); blk(ctx, g.x + g.w - 34, g.ty0 + 14, 9, 13, P.ORA, 2, 1.6); }
    },
    chair(ctx, f, g, t) {
      const x = g.x + 7, w = g.w - 14;
      blk(ctx, x, g.fy0 - 18, w, 20, P.WOOD, 3, 2); // back
      blk(ctx, x + 2, g.fy0, 4, g.H, P.WOODD, 1, 1.4); blk(ctx, x + w - 6, g.fy0, 4, g.H, P.WOODD, 1, 1.4);
      blk(ctx, x - 1, g.fy0 - 3, w + 2, 8, '#9d6a56', 2, 2);
    },
    bed(ctx, f, g) {
      // frame
      rr(ctx, g.x, g.ty0, g.w, g.fy1 - g.ty0, 5); ctx.fillStyle = P.WOOD; ctx.fill();
      // headboard
      blk(ctx, g.x - 2, g.ty0 - 22, g.w + 4, 30, P.WOODD, 6, 2.6);
      line(ctx, g.x + 8, g.ty0 - 14, g.x + g.w - 8, g.ty0 - 14, P.WOOD, 3);
      // mattress top
      blk(ctx, g.x + 3, g.ty0 + 2, g.w - 6, g.d - 2, P.CRM, 5, 2);
      // pillow
      blk(ctx, g.x + 10, g.ty0 + 6, g.w - 20, 18, '#ffffff', 7, 2);
      // blanket
      ctx.save(); rr(ctx, g.x + 3, g.ty0 + 30, g.w - 6, g.d - 30, 5); ctx.clip();
      ctx.fillStyle = f.searched ? '#8a4a2e' : P.ORAD; ctx.fillRect(g.x, g.ty0 + 30, g.w, g.d);
      ctx.fillStyle = P.ORA; for (let yy = g.ty0 + 38; yy < g.fy0; yy += 16) ctx.fillRect(g.x, yy, g.w, 6);
      if (f.searched) { ctx.fillStyle = P.CRM; ctx.beginPath(); ctx.moveTo(g.x + 3, g.ty0 + 30); ctx.lineTo(g.x + g.w * .7, g.ty0 + 30); ctx.lineTo(g.x + 3, g.ty0 + 70); ctx.fill(); }
      ctx.restore();
      rr(ctx, g.x + 3, g.ty0 + 30, g.w - 6, g.d - 30, 5); ctx.lineWidth = 2; ctx.strokeStyle = P.INK; ctx.stroke();
      // side / front
      ctx.fillStyle = P.WOODD; ctx.fillRect(g.x + 2, g.fy0, g.w - 4, g.H - 2);
      rr(ctx, g.x, g.ty0, g.w, g.fy1 - g.ty0, 5); ctx.lineWidth = 2.6; ctx.strokeStyle = P.INK; ctx.stroke();
      line(ctx, g.x + 1, g.fy0, g.x + g.w - 1, g.fy0, P.INK, 2);
    },
    nightstand(ctx, f, g) {
      box(ctx, g, '#9d6a56', P.WOOD, 3);
      drawers(ctx, g.x + 4, g.fy0 + 3, g.w - 8, g.H - 5, 2, f.searched ? 0 : -1);
      // lamp
      const lx = g.x + g.w / 2;
      line(ctx, lx, g.ty0 + 8, lx, g.ty0 - 8, P.INK, 2.4);
      ctx.beginPath(); ctx.moveTo(lx - 10, g.ty0 - 6); ctx.lineTo(lx + 10, g.ty0 - 6); ctx.lineTo(lx + 6, g.ty0 - 20); ctx.lineTo(lx - 6, g.ty0 - 20); ctx.closePath();
      ctx.fillStyle = P.CRM; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = P.INK; ctx.stroke();
    },
    wardrobe(ctx, f, g) {
      box(ctx, g, '#7a5048', P.WOOD, 4);
      shade(ctx, g.x + 2, g.fy0 + 1, 7, g.H - 3, .22);
      blk(ctx, g.x - 2, g.ty0 - 4, g.w + 4, 8, P.WOODD, 2, 2.2);
      if (f.searched) {
        blk(ctx, g.x + 4, g.fy0 + 4, g.w - 8, g.H - 8, '#140f26', 2, 2);
        line(ctx, g.x + 6, g.fy0 + 10, g.x + g.w - 6, g.fy0 + 10, '#6e7690', 2);
        for (let i = 0; i < 3; i++) blk(ctx, g.x + 10 + i * 12, g.fy0 + 11, 9, 26, [P.ORAD, P.LIL2, P.GRN][i], 2, 1.4);
        for (const s of [-1, 1]) {
          const hx = s < 0 ? g.x + 2 : g.x + g.w - 2;
          ctx.beginPath(); ctx.moveTo(hx, g.fy0 + 2); ctx.lineTo(hx + s * 11, g.fy0 + 8); ctx.lineTo(hx + s * 11, g.fy1 + 3); ctx.lineTo(hx, g.fy1 - 2); ctx.closePath();
          ctx.fillStyle = P.WOOD; ctx.fill(); ctx.lineWidth = 2.2; ctx.strokeStyle = P.INK; ctx.stroke();
        }
      } else {
        line(ctx, g.x + g.w / 2, g.fy0 + 3, g.x + g.w / 2, g.fy1 - 3, P.INK, 2);
        for (const xx of [g.x + 6, g.x + g.w / 2 + 4]) { blk(ctx, xx, g.fy0 + 8, g.w / 2 - 10, g.H * .38, null, 2, 1.4); blk(ctx, xx, g.fy0 + 12 + g.H * .38, g.w / 2 - 10, g.H * .38, null, 2, 1.4); }
        knob(ctx, g.x + g.w / 2 - 5, g.fy0 + g.H * .5); knob(ctx, g.x + g.w / 2 + 5, g.fy0 + g.H * .5);
      }
    },
    coat(ctx, f, g) { FURN.wardrobe(ctx, f, g); if (!f.searched) { blk(ctx, g.x + 8, g.ty0 - 13, 12, 10, P.ORA, 3, 1.8); } },
    dresser(ctx, f, g) {
      box(ctx, g, '#9d6a56', P.WOOD, 3);
      const half = (g.w - 8) / 2;
      drawers(ctx, g.x + 4, g.fy0 + 3, half, g.H - 5, 3, f.searched ? 1 : -1);
      drawers(ctx, g.x + 4 + half, g.fy0 + 3, half, g.H - 5, 3, f.searched ? 0 : -1);
      // mirror + stuff
      blk(ctx, g.x + g.w * .3, g.ty0 - 26, g.w * .4, 30, '#8e98b4', 8, 2.4);
      ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(g.x + g.w * .34, g.ty0 - 20, 4, 14);
      dot(ctx, g.x + 12, g.ty0 + 8, 4, P.ORA); blk(ctx, g.x + g.w - 22, g.ty0 + 3, 10, 9, P.CRM, 2, 1.4);
    },
    desk(ctx, f, g) {
      box(ctx, g, '#9d6a56', P.WOOD, 3);
      drawers(ctx, g.x + g.w - 30, g.fy0 + 3, 26, g.H - 5, 2, f.searched ? 0 : -1);
      shade(ctx, g.x + 4, g.fy0 + 4, g.w - 38, g.H - 6, .45);
      blk(ctx, g.x + 8, g.ty0 + 3, 22, 15, P.CRM, 1, 1.4);
      line(ctx, g.x + 12, g.ty0 + 8, g.x + 25, g.ty0 + 8, P.MUTE, 1.2); line(ctx, g.x + 12, g.ty0 + 12, g.x + 22, g.ty0 + 12, P.MUTE, 1.2);
      blk(ctx, g.x + g.w - 26, g.ty0 + 2, 9, 12, '#c9c3d6', 2, 1.6);
    },
    bookshelf(ctx, f, g) {
      box(ctx, g, '#7a5048', P.WOOD, 3);
      const n = 4, sh = (g.H - 8) / n;
      blk(ctx, g.x + 4, g.fy0 + 4, g.w - 8, g.H - 8, '#2a1a26', 2, 1.8);
      const cols = [P.ORA, P.LIL2, P.CRM, P.GRN, P.ORAD, P.MUTE, '#b9bdcc'];
      for (let r = 0; r < n; r++) {
        const yb = g.fy0 + 4 + (r + 1) * sh;
        let xx = g.x + 6, i = r * 3 + (f.seed || 0);
        while (xx < g.x + g.w - 9) {
          const bw = 4 + (hash(i, r, 3) * 4 | 0), bh = sh - 3 - (hash(i, r, 5) * 5 | 0);
          if (!(f.searched && hash(i, r, 9) < .45)) { ctx.fillStyle = cols[i % cols.length]; ctx.fillRect(xx, yb - bh, bw, bh); ctx.strokeStyle = P.INK; ctx.lineWidth = 1; ctx.strokeRect(xx, yb - bh, bw, bh); }
          xx += bw + 1; i++;
        }
        line(ctx, g.x + 4, yb, g.x + g.w - 4, yb, P.WOODD, 2.4);
      }
    },
    tvstand(ctx, f, g) {
      box(ctx, g, '#9d6a56', P.WOOD, 3);
      cabinetDoors(ctx, g.x + 4, g.fy0 + 3, g.w - 8, g.H - 5, 2, f.searched, P.WOOD);
      // tv (seen from behind)
      blk(ctx, g.x + 12, g.ty0 - 30, g.w - 24, 34, '#2a2440', 3, 2.4);
      blk(ctx, g.x + g.w / 2 - 14, g.ty0 - 22, 28, 18, '#3a3354', 3, 1.6);
      line(ctx, g.x + g.w / 2 + 14, g.ty0 - 10, g.x + g.w / 2 + 30, g.ty0 + 12, P.INK, 2);
    },
    sofa(ctx, f, g) {
      // back rest along the wall (north), seat facing south
      const x = g.x, w = g.w;
      blk(ctx, x + 2, g.ty0 - 22, w - 4, 30, P.ORAD, 8, 2.6); // back
      rr(ctx, x, g.ty0 + 4, w, g.fy1 - g.ty0 - 4, 6); ctx.fillStyle = '#a64d26'; ctx.fill(); ctx.lineWidth = 2.6; ctx.strokeStyle = P.INK; ctx.stroke();
      const cw = (w - 20) / 3;
      for (let i = 0; i < 3; i++) blk(ctx, x + 10 + i * cw, g.ty0 + 6, cw - 1, g.d - 4, f.searched && i === 1 ? '#8a4a2e' : P.ORA, 4, 2);
      blk(ctx, x - 3, g.ty0 - 2, 14, g.fy1 - g.ty0 + 2, P.ORAD, 6, 2.4);
      blk(ctx, x + w - 11, g.ty0 - 2, 14, g.fy1 - g.ty0 + 2, P.ORAD, 6, 2.4);
      if (f.searched) { blk(ctx, x + w * .5 - 8, g.fy1 - 4, 16, 9, P.ORA, 3, 1.8); }
    },
    sidetable(ctx, f, g) { FURN.nightstand(ctx, f, g); },
    coffee(ctx, f, g) {
      FURN.table(ctx, f, g);
      blk(ctx, g.x + 12, g.ty0 + 4, 16, 10, P.CRM, 1, 1.4); dot(ctx, g.x + g.w - 18, g.ty0 + 10, 5, '#c9c3d6');
    },
    armchair(ctx, f, g) {
      blk(ctx, g.x + 3, g.ty0 - 16, g.w - 6, 24, P.LIL2, 8, 2.6);
      blk(ctx, g.x + 1, g.ty0 + 4, g.w - 2, g.fy1 - g.ty0 - 4, P.LIL, 6, 2.6);
      blk(ctx, g.x + 8, g.ty0 + 6, g.w - 16, g.d - 2, '#8676b0', 4, 2);
    },
    plant(ctx, f, g) {
      const cx = g.x + g.w / 2;
      blk(ctx, cx - 10, g.fy1 - 22, 20, 20, P.ORAD, 3, 2.4);
      for (let i = 0; i < 6; i++) { const a = -2.6 + i * .45; ctx.beginPath(); ctx.ellipse(cx + Math.cos(a) * 13, g.fy1 - 26 + Math.sin(a) * 18, 5, 12, a + 1.57, 0, 6.28); ctx.fillStyle = i % 2 ? P.GRN : '#6c8050'; ctx.fill(); ctx.lineWidth = 1.8; ctx.strokeStyle = P.INK; ctx.stroke(); }
    },
    toilet(ctx, f, g) {
      const cx = g.x + g.w / 2;
      blk(ctx, cx - 13, g.ty0 - 14, 26, 24, '#e8e2d4', 4, 2.4); // tank
      ctx.beginPath(); ctx.ellipse(cx, g.fy0 + 2, 15, 13, 0, 0, 6.28); ctx.fillStyle = '#e8e2d4'; ctx.fill(); ctx.lineWidth = 2.4; ctx.strokeStyle = P.INK; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(cx, g.fy0 + 1, 9, 7, 0, 0, 6.28); ctx.fillStyle = '#8e98b4'; ctx.fill(); ctx.lineWidth = 1.6; ctx.stroke();
      blk(ctx, cx - 9, g.fy0 + 12, 18, g.H - 12, '#d4cfc0', 3, 2.2);
    },
    vanity(ctx, f, g) { FURN.sink(ctx, f, g); },
    tub(ctx, f, g) {
      box(ctx, g, '#e8e2d4', '#d4cfc0', 10);
      blk(ctx, g.x + 6, g.ty0 + 6, g.w - 12, g.d - 10, '#5a6a8e', 12, 2);
      ctx.fillStyle = 'rgba(126,31,42,.5)'; ctx.beginPath(); ctx.ellipse(g.x + g.w * .55, g.ty0 + g.d * .6, 14, 8, .3, 0, 6.28); ctx.fill();
      line(ctx, g.x + g.w / 2, g.ty0 + 2, g.x + g.w / 2, g.ty0 + 10, P.INK, 3);
    },
    medcab(ctx, f, g) {
      // wall-mounted: drawn on the wall face above footprint
      const x = g.x + 6, w = g.w - 12, y = f.y + f.h - 54, h = 30;
      blk(ctx, x, y, w, h, '#c9c3d6', 3, 2.4);
      if (f.searched) {
        blk(ctx, x + 3, y + 3, w - 6, h - 6, '#140f26', 2, 1.6);
        line(ctx, x + 4, y + h / 2, x + w - 4, y + h / 2, '#6e7690', 2);
        ctx.beginPath(); ctx.moveTo(x + w, y + 1); ctx.lineTo(x + w + 9, y + 5); ctx.lineTo(x + w + 9, y + h + 3); ctx.lineTo(x + w, y + h - 1); ctx.closePath();
        ctx.fillStyle = '#8e98b4'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = P.INK; ctx.stroke();
      } else {
        blk(ctx, x + 3, y + 3, w - 6, h - 6, '#8e98b4', 2, 1.6);
        ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(x + 6, y + 6, 3, h - 12);
        ctx.fillStyle = P.RED; ctx.fillRect(x + w / 2 - 1.5, y - 7, 3, 7); ctx.fillRect(x + w / 2 - 4.5, y - 5, 9, 3);
      }
    },
    shelves(ctx, f, g) {
      // metal utility shelving
      const x = g.x + 2, w = g.w - 4;
      for (const xx of [x, x + w - 5]) blk(ctx, xx, g.ty0, 5, g.fy1 - g.ty0, '#868ea8', 1, 1.8);
      for (let i = 0; i < 4; i++) {
        const yy = g.fy0 + i * (g.H / 3.3);
        if (!f.searched || i % 2) {
          blk(ctx, x + 8 + (i * 7) % 12, yy - 13, 18, 13, i % 2 ? P.CRMD : '#b98a5a', 2, 1.6);
          if (i < 3) blk(ctx, x + w - 26, yy - 10, 12, 10, i % 2 ? P.ORA : P.GRN, 2, 1.6);
        }
        blk(ctx, x, yy, w, 4, '#9aa0b4', 1, 1.6);
      }
    },
    toolbox(ctx, f, g) {
      const x = g.x + 6, w = g.w - 12;
      blk(ctx, x, g.fy1 - 22, w, 20, P.RED, 3, 2.4);
      if (f.searched) { blk(ctx, x - 3, g.fy1 - 30, w + 2, 8, '#8a2a20', 2, 2); line(ctx, x + 8, g.fy1 - 24, x + 18, g.fy1 - 29, '#9aa0b4', 2.4); }
      else { line(ctx, x + w / 2 - 7, g.fy1 - 26, x + w / 2 + 7, g.fy1 - 26, P.INK, 3); line(ctx, x, g.fy1 - 16, x + w, g.fy1 - 16, P.INK, 1.6); }
      dot(ctx, x + w / 2, g.fy1 - 12, 2.2, '#9aa0b4');
    },
    heater(ctx, f, g) {
      const x = g.x + 7, w = g.w - 14;
      blk(ctx, x, g.ty0 - 4, w, g.fy1 - g.ty0 + 2, '#9aa0b4', 12, 2.6);
      ctx.beginPath(); ctx.ellipse(x + w / 2, g.ty0 + 4, w / 2 - 2, 6, 0, 0, 6.28); ctx.fillStyle = '#b9bdcc'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = P.INK; ctx.stroke();
      blk(ctx, x + 6, g.fy0 + 18, w - 12, 10, P.CRM, 2, 1.4); line(ctx, x + w / 2, g.ty0 - 10, x + w / 2, g.ty0 - 2, P.INK, 4);
    },
    crate(ctx, f, g) {
      box(ctx, g, '#a07850', '#86603e', 2);
      for (let i = 1; i < 3; i++) line(ctx, g.x + 2, g.fy0 + i * g.H / 3, g.x + g.w - 2, g.fy0 + i * g.H / 3, '#5e3f28', 1.6);
      line(ctx, g.x + 4, g.fy0 + 3, g.x + g.w - 4, g.fy1 - 3, '#5e3f28', 3);
      if (f.searched) {
        blk(ctx, g.x + 3, g.ty0 + 3, g.w - 6, g.d - 4, '#140f26', 1, 1.6);
        ctx.save(); ctx.translate(g.x + g.w + 4, g.ty0 + 6); ctx.rotate(.5); blk(ctx, -6, -4, 12, g.d + 8, '#a07850', 1, 2); ctx.restore();
      } else {
        for (let i = 1; i < 3; i++) line(ctx, g.x + 2 + i * g.w / 3, g.ty0 + 2, g.x + 2 + i * g.w / 3, g.fy0 - 2, '#7a5838', 1.4);
        blk(ctx, g.x + g.w / 2 - 9, g.fy0 + g.H / 2 - 5, 18, 10, P.CRM, 1, 1.4);
        ctx.fillStyle = P.RED; ctx.font = 'bold 8px system-ui'; ctx.textAlign = 'center'; ctx.fillText('KEEP', g.x + g.w / 2, g.fy0 + g.H / 2 + 3);
      }
    },
    supply(ctx, f, g) {
      FURN.shelves(ctx, f, g);
    },
    cot(ctx, f, g) {
      blk(ctx, g.x + 4, g.ty0 + 4, g.w - 8, g.fy1 - g.ty0 - 6, '#5e6b48', 4, 2.4);
      blk(ctx, g.x + 8, g.ty0 + 8, g.w - 16, 14, P.CRMD, 5, 1.8);
      ctx.fillStyle = 'rgba(17,20,47,.25)'; ctx.fillRect(g.x + 8, g.ty0 + 30, g.w - 16, 4);
    },
    lamppost(ctx, f, g) {
      const cx = g.x + g.w / 2, base = g.fy1 - 6, top = g.fy1 - f.H;
      blk(ctx, cx - 7, base - 8, 14, 10, P.INK, 2, 0);
      ctx.fillStyle = P.INK; ctx.fillRect(cx - 2.5, top + 10, 5, base - top - 10);
      ctx.beginPath(); ctx.moveTo(cx - 12, top + 12); ctx.lineTo(cx + 12, top + 12); ctx.lineTo(cx + 7, top); ctx.lineTo(cx - 7, top); ctx.closePath(); ctx.fillStyle = P.INK; ctx.fill();
      blk(ctx, cx - 7, top + 12, 14, 9, '#ffe2a8', 2, 2);
      const gl = ctx.createRadialGradient(cx, top + 18, 2, cx, top + 18, 40); gl.addColorStop(0, 'rgba(255,226,168,.35)'); gl.addColorStop(1, 'rgba(255,226,168,0)');
      ctx.fillStyle = gl; ctx.fillRect(cx - 40, top - 22, 80, 80);
    },
    safe(ctx, f, g) {
      box(ctx, g, '#4a5070', '#3a4060', 4);
      shade(ctx, g.x + 2, g.fy0 + 1, 6, g.H - 3, .25);
      if (f.searched) {
        blk(ctx, g.x + 5, g.fy0 + 5, g.w - 10, g.H - 9, '#140f26', 2, 2);
        line(ctx, g.x + 7, g.fy0 + g.H * .5, g.x + g.w - 7, g.fy0 + g.H * .5, '#6e7690', 2);
        ctx.beginPath(); ctx.moveTo(g.x + g.w - 2, g.fy0 + 2); ctx.lineTo(g.x + g.w + 10, g.fy0 + 8); ctx.lineTo(g.x + g.w + 10, g.fy1 + 3); ctx.lineTo(g.x + g.w - 2, g.fy1 - 2); ctx.closePath();
        ctx.fillStyle = '#4a5070'; ctx.fill(); ctx.lineWidth = 2.2; ctx.strokeStyle = P.INK; ctx.stroke();
      } else {
        blk(ctx, g.x + 5, g.fy0 + 5, g.w - 10, g.H - 9, null, 2, 1.8);
        const cx = g.x + g.w * .45, cy = g.fy0 + g.H * .45;
        dot(ctx, cx, cy, 8, P.INK); dot(ctx, cx, cy, 6, '#b9bdcc'); line(ctx, cx, cy, cx + 4, cy - 3, P.INK, 1.8);
        line(ctx, g.x + g.w - 11, cy - 7, g.x + g.w - 11, cy + 9, '#b9bdcc', 3.4);
      }
      if (f.pried) { line(ctx, g.x + 6, g.fy0 + 8, g.x + 14, g.fy0 + 20, P.INK, 1.6); line(ctx, g.x + g.w - 8, g.fy1 - 10, g.x + g.w - 16, g.fy1 - 4, P.INK, 1.6); }
    },
    shopshelf(ctx, f, g) { // free-standing store gondola, goods on top shelves
      box(ctx, g, '#9aa0b4', '#7d8398', 3);
      const cols = [P.ORA, P.GRN, P.CRM, P.LIL2, '#e04a5a', P.ORAD];
      for (let r = 0; r < 2; r++) { const yy = g.fy0 + 4 + r * (g.H / 2 - 2); line(ctx, g.x + 3, yy + g.H / 2 - 5, g.x + g.w - 3, yy + g.H / 2 - 5, P.INK, 2);
        for (let xx = g.x + 6, i = r + (f.seed || 0); xx < g.x + g.w - 10; xx += 11, i++) if (!(f.searched && hash(i, r, 4) < .55)) blk(ctx, xx, yy + 2, 8, g.H / 2 - 9, cols[i % cols.length], 1, 1.4); }
      for (let xx = g.x + 6, i = 0; xx < g.x + g.w - 10; xx += 12, i++) if (!(f.searched && i % 2)) blk(ctx, xx, g.ty0 + 4, 9, g.d - 8, cols[(i + 2) % cols.length], 2, 1.4);
    },
    register(ctx, f, g) {
      box(ctx, g, P.CRMD, '#7a5048', 3);
      blk(ctx, g.x + g.w - 30, g.ty0 - 12, 24, 20, '#4a5070', 3, 2.2); blk(ctx, g.x + g.w - 27, g.ty0 - 9, 18, 7, '#93a86c', 1, 1.2);
      if (f.searched) blk(ctx, g.x + g.w - 32, g.fy0 + 4, 26, 10, '#140f26', 1, 1.6); else blk(ctx, g.x + g.w - 32, g.fy0 + 4, 26, 10, '#5a6080', 1, 1.6);
      blk(ctx, g.x + 8, g.ty0 + 5, 14, 9, P.ORA, 2, 1.4);
    },
    cage(ctx, f, g) { // chain-link storage cage
      box(ctx, g, '#4a4466', '#3a3454', 2);
      ctx.save(); rr(ctx, g.x + 3, g.fy0 + 3, g.w - 6, g.H - 6, 2); ctx.clip();
      ctx.fillStyle = f.searched ? '#140f26' : '#2a2440'; ctx.fillRect(g.x, g.fy0, g.w, g.H);
      if (!f.searched) for (let i = 0; i < 4; i++) blk(ctx, g.x + 8 + i * (g.w - 16) / 4, g.fy0 + g.H * .45, (g.w - 16) / 4 - 4, g.H * .4, [P.CRM, '#e04a5a', P.CRM, P.GRN][i], 1, 1.2);
      ctx.strokeStyle = 'rgba(185,189,204,.7)'; ctx.lineWidth = 1.2;
      for (let k = -g.H; k < g.w + g.H; k += 7) { line(ctx, g.x + k, g.fy0, g.x + k + g.H, g.fy1, ctx.strokeStyle, 1.1); line(ctx, g.x + k + g.H, g.fy0, g.x + k, g.fy1, ctx.strokeStyle, 1.1); }
      ctx.restore(); blk(ctx, g.x + 3, g.fy0 + 3, g.w - 6, g.H - 6, null, 2, 2.4);
      if (!f.searched) { blk(ctx, g.x + g.w / 2 - 5, g.fy0 + g.H * .4, 10, 9, '#c9a85a', 2, 1.6); }
    },
    locker(ctx, f, g) {
      const n = Math.max(1, Math.round(g.w / 22)), lw = g.w / n;
      box(ctx, g, '#6e7690', '#5c6480', 2);
      for (let i = 0; i < n; i++) { const x = g.x + i * lw;
        if (f.searched && i === 0) { blk(ctx, x + 3, g.fy0 + 3, lw - 6, g.H - 6, '#140f26', 1, 1.6); }
        else { blk(ctx, x + 3, g.fy0 + 3, lw - 6, g.H - 6, null, 1, 1.6); for (let k = 0; k < 3; k++) line(ctx, x + 7, g.fy0 + 8 + k * 4, x + lw - 7, g.fy0 + 8 + k * 4, P.INK, 1.2); dot(ctx, x + lw - 7, g.fy0 + g.H * .5, 2, P.INK); } }
    },
    filing(ctx, f, g) { box(ctx, g, '#7d8398', '#6e7690', 2); drawers(ctx, g.x + 3, g.fy0 + 3, g.w - 6, g.H - 5, 3, f.searched ? 1 : -1); },
    schooldesk(ctx, f, g) {
      blk(ctx, g.x + 8, g.fy0 - 2, 4, g.H, P.INK, 0, 0); blk(ctx, g.x + g.w - 12, g.fy0 - 2, 4, g.H, P.INK, 0, 0);
      blk(ctx, g.x + 4, g.ty0 + 4, g.w - 8, g.d - 2, '#c9a87a', 2, 2.2); blk(ctx, g.x + 10, g.ty0 + 8, 12, 8, P.CRM, 1, 1.2);
    },
    workbench(ctx, f, g) {
      box(ctx, g, '#9d6a56', P.WOODD, 2);
      blk(ctx, g.x + 6, g.ty0 + 4, 18, 8, '#b9bdcc', 2, 1.4); dot(ctx, g.x + g.w - 16, g.ty0 + 9, 4, P.ORA);
      for (let i = 0; i < 4; i++) line(ctx, g.x + 10 + i * 12, g.ty0 - 16, g.x + 10 + i * 12, g.ty0 - 4, '#9aa0b4', 2.4);
      drawers(ctx, g.x + 4, g.fy0 + 3, g.w * .4, g.H - 5, 2, f.searched ? 0 : -1);
    },
    car(ctx, f, g) { // a wrecked hatchback in the bay
      rr(ctx, g.x + 4, g.ty0 + 6, g.w - 8, g.fy1 - g.ty0 - 8, 16); ctx.fillStyle = '#7a3a3a'; ctx.fill(); ctx.lineWidth = 2.6; ctx.strokeStyle = P.INK; ctx.stroke();
      blk(ctx, g.x + g.w * .22, g.ty0 + 14, g.w * .56, g.d * .55, '#2a3050', 10, 2.2);
      ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(g.x + g.w * .28, g.ty0 + 18, 10, g.d * .4);
      for (const xx of [g.x + 10, g.x + g.w - 26]) { blk(ctx, xx, g.fy1 - 18, 16, 16, P.INK, 6, 0); dot(ctx, xx + 8, g.fy1 - 10, 3, '#9aa0b4'); }
      blk(ctx, g.x + 8, g.fy0 + 2, g.w - 16, 10, '#5e2a2a', 3, 2);
    },
    washer(ctx, f, g) {
      box(ctx, g, '#e8e2d4', '#d4cfc0', 4);
      ctx.beginPath(); ctx.arc(g.x + g.w / 2, g.fy0 + g.H * .55, Math.min(g.w, g.H) * .32, 0, 6.28); ctx.fillStyle = f.searched ? '#140f26' : '#5a6a8e'; ctx.fill(); ctx.lineWidth = 2.6; ctx.strokeStyle = P.INK; ctx.stroke();
      if (!f.searched) { ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(g.x + g.w / 2 - 6, g.fy0 + g.H * .4, 4, 8); }
      dot(ctx, g.x + 8, g.fy0 + 5, 2.4, P.INK); dot(ctx, g.x + 16, g.fy0 + 5, 2.4, P.ORA);
    },
    winerack(ctx, f, g) {
      box(ctx, g, '#5e3a2a', '#4a2c20', 2);
      for (let r = 0; r < 3; r++) for (let i = 0; i < Math.floor((g.w - 8) / 10); i++) { if (f.searched && (i + r) % 2) continue; const cx = g.x + 9 + i * 10, cy = g.fy0 + 8 + r * ((g.H - 12) / 3); dot(ctx, cx, cy, 4, P.INK); dot(ctx, cx, cy, 2.6, ['#7e1f2a', '#3a5a3a', '#7e1f2a'][r]); }
    },
    mat(ctx, f, g) { rr(ctx, g.x + 2, g.y + 4, g.w - 4, g.h - 8, 4); ctx.fillStyle = '#3f5a8a'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = P.INK; ctx.stroke(); line(ctx, g.x + g.w / 2, g.y + 6, g.x + g.w / 2, g.y + g.h - 6, '#5a76a8', 2); },
    bench(ctx, f, g) { blk(ctx, g.x + 4, g.fy0 - 2, g.w - 8, 8, P.WOOD, 2, 2); blk(ctx, g.x + 8, g.fy0 + 6, 4, g.H - 6, P.INK, 0, 0); blk(ctx, g.x + g.w - 12, g.fy0 + 6, 4, g.H - 6, P.INK, 0, 0); },
    boxes(ctx, f, g) { blk(ctx, g.x + 4, g.fy1 - 26, g.w * .55, 24, '#b98a5a', 2, 2.2); blk(ctx, g.x + g.w * .45, g.fy1 - 20, g.w * .5, 18, '#a07850', 2, 2.2); blk(ctx, g.x + 10, g.fy1 - 42, g.w * .4, 17, '#c9a06a', 2, 2.2); },
    wallpanel(ctx, f, g) { // loose wall panel: invisible until pried (or a hairline crack with Keen eye)
      const x = g.x + 8, w = g.w - 16, y = f.y + f.h - 50, h = 34;
      if (f.opened) { blk(ctx, x, y, w, h, '#0c0816', 2, 2.2); line(ctx, x + 2, y + h, x + w - 4, y + h + 10, P.WOOD, 4); if (f.loot0 && f.loot0.length) blk(ctx, x + 6, y + h - 12, 14, 9, '#b9bdcc', 1, 1.2); }
      else if (f.keen) { ctx.strokeStyle = 'rgba(10,8,24,.55)'; ctx.lineWidth = 1.2; ctx.strokeRect(x + .5, y + .5, w - 1, h - 1); }
    },
    shoerack(ctx, f, g) {
      box(ctx, g, P.WOOD, P.WOODD, 2);
      dot(ctx, g.x + 12, g.ty0 + 7, 5, P.INK); dot(ctx, g.x + 26, g.ty0 + 8, 5, P.ORAD);
    },
  };

  // tiny candle with flicker
  function candle(ctx, x, y, t) {
    blk(ctx, x - 3, y - 10, 6, 10, P.CRM, 1, 1.4);
    const fl = 1 + Math.sin(t * 17) * .15 + Math.sin(t * 7.3) * .1;
    ctx.beginPath(); ctx.ellipse(x, y - 14, 2.6 * fl, 5 * fl, 0, 0, 6.28); ctx.fillStyle = '#ffd27a'; ctx.fill();
  }

  // later screens (base.js) register their own icons: raw SVG bodies in the same -36..36 box, or ready URLs
  function addIcons(o) { for (const k in o) { if (/^data:/.test(o[k])) iconURL[k] = o[k]; else { EXTRA_ICONS[k] = o[k]; iconURL[k] = svgURL(o[k], '-36 -36 72 72', 96, 96); } } }
  return { addIcons, P, LOOK, rigs, buildRig, drawRig, buildIcons, iconURL, rr, blk, line, dot, hash, drawFloorTile, drawWallFace, FURN, geo, candle, VB };
})();
