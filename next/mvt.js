/* Dead Miles - next: a minimal Mapbox Vector Tile (MVT 2.x) decoder, enough for the real-world map (map.js).
   DM.MVT.decode(ArrayBuffer) -> { layerName: { extent, features: [{ id, type (1 point, 2 line, 3 polygon), tags, geom }] } }
   geom: an array of rings/lines, each a flat [x0, y0, x1, y1, ...] in tile units (0..extent). Written for this game. */
(function () {
  'use strict';
  function Reader(buf) { this.b = buf; this.p = 0; }
  Reader.prototype.varint = function () {   // as a plain number (feature ids go past 32 bits)
    const b = this.b; let r = 0, m = 1, c;
    do { c = b[this.p++]; r += (c & 0x7f) * m; m *= 128; } while (c & 0x80);
    return r;
  };
  Reader.prototype.skip = function (wt) {
    if (wt === 0) this.varint(); else if (wt === 2) { const n = this.varint(); this.p += n; } else if (wt === 1) this.p += 8; else if (wt === 5) this.p += 4; else throw new Error('mvt wire ' + wt);
  };
  const zz = n => (n >>> 1) ^ -(n & 1);
  const td = typeof TextDecoder !== 'undefined' ? new TextDecoder() : null;
  function str(b, a, z) { if (td) return td.decode(b.subarray(a, z)); let s = ''; for (let i = a; i < z; i++) s += String.fromCharCode(b[i]); return decodeURIComponent(escape(s)); }
  function value(r, end) {
    let v = null; const b = r.b;
    while (r.p < end) {
      const t = r.varint(), f = t >> 3, wt = t & 7;
      if (f === 1) { const n = r.varint(); v = str(b, r.p, r.p + n); r.p += n; }
      else if (f === 2) { v = new DataView(b.buffer, b.byteOffset + r.p, 4).getFloat32(0, true); r.p += 4; }
      else if (f === 3) { v = new DataView(b.buffer, b.byteOffset + r.p, 8).getFloat64(0, true); r.p += 8; }
      else if (f === 4 || f === 5) v = r.varint();
      else if (f === 6) v = zz(r.varint());
      else if (f === 7) v = !!r.varint();
      else r.skip(wt);
    }
    return v;
  }
  function packed(r) { const n = r.varint(), end = r.p + n, out = []; while (r.p < end) out.push(r.varint()); return out; }
  function geometry(cmds) {
    const out = []; let x = 0, y = 0, cur = null;
    for (let i = 0; i < cmds.length;) {
      const ci = cmds[i++], id = ci & 7, cnt = ci >> 3;
      if (id === 1 || id === 2) {
        for (let k = 0; k < cnt; k++) {
          x += zz(cmds[i++]); y += zz(cmds[i++]);
          if (id === 1) { cur = [x, y]; out.push(cur); } else if (cur) cur.push(x, y);
        }
      } else if (id === 7) { if (cur && cur.length >= 2) cur.push(cur[0], cur[1]); }
      else break;
    }
    return out;
  }
  function layer(r, end) {
    const L = { name: '', extent: 4096, keys: [], vals: [], raw: [] };
    while (r.p < end) {
      const t = r.varint(), f = t >> 3, wt = t & 7;
      if (f === 1) { const n = r.varint(); L.name = str(r.b, r.p, r.p + n); r.p += n; }
      else if (f === 2) { const n = r.varint(); L.raw.push([r.p, r.p + n]); r.p += n; }
      else if (f === 3) { const n = r.varint(); L.keys.push(str(r.b, r.p, r.p + n)); r.p += n; }
      else if (f === 4) { const n = r.varint(); L.vals.push(value(r, r.p + n)); }
      else if (f === 5) L.extent = r.varint();
      else r.skip(wt);
    }
    const features = [];
    for (const [a, z] of L.raw) {
      r.p = a; const F = { id: 0, type: 0, tags: {}, geom: null }; let tg = [], gm = [];
      while (r.p < z) {
        const t = r.varint(), f = t >> 3, wt = t & 7;
        if (f === 1) F.id = r.varint(); else if (f === 2) tg = packed(r); else if (f === 3) F.type = r.varint(); else if (f === 4) gm = packed(r); else r.skip(wt);
      }
      for (let i = 0; i + 1 < tg.length; i += 2) F.tags[L.keys[tg[i]]] = L.vals[tg[i + 1]];
      F.geom = geometry(gm); features.push(F);
    }
    return { name: L.name, extent: L.extent, features };
  }
  function decode(buf, want) {
    const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf), r = new Reader(b), out = {};
    while (r.p < b.length) {
      const t = r.varint(), f = t >> 3, wt = t & 7;
      if (f === 3 && wt === 2) {
        const n = r.varint(), end = r.p + n;
        // peek the name first so unwanted layers are skipped without decoding them
        const save = r.p; let name = '';
        while (r.p < end) { const t2 = r.varint(), f2 = t2 >> 3, w2 = t2 & 7; if (f2 === 1) { const m = r.varint(); name = str(b, r.p, r.p + m); break; } r.skip(w2); }
        r.p = save;
        if (!want || want.includes(name)) { const L = layer(r, end); out[L.name] = L; }
        r.p = end;
      } else r.skip(wt);
    }
    return out;
  }
  const root = typeof window !== 'undefined' ? window : globalThis;
  root.DM = root.DM || {}; root.DM.MVT = { decode };
  if (typeof module !== 'undefined') module.exports = { decode };
})();
