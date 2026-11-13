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
  async function buildRig(key, res) {
    const R = RIGS[key];
    const L = R.src.split('\n');
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
    rigs[key] = out;
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
        ctx.drawImage(p[layer], VB.x, VB.y, VB.w, VB.h);
        ctx.restore();
      }
    };
    pass('o'); pass('c');
    if (pose.flash > 0) pass(pose.flashRed ? 'r' : 'o', pose.flash);
    ctx.restore();
  }

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

  return { P, rigs, buildRig, drawRig, buildIcons, iconURL, rr, blk, line, dot, hash, drawFloorTile, drawWallFace, FURN, geo, candle, VB };
})();
