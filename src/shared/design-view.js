/* One decoder, one palette, one overhead drawing, shared by the planner and the site.
 *
 * The share format already had two encoders that drifted apart once, and the card for it
 * says the count of places is the point. Wanting a picture of a base on the community list
 * meant a decoder outside the planner, and writing a second one would have been a third
 * implementation of a format with a history of quiet disagreement. So this file is the one
 * decoder: build.ps1 inlines it into the planner and tools/site/context.js inlines it into
 * the pages. Neither has a copy of its own.
 *
 * Nothing here touches globals. The catalog arrives as a lookup so the planner can pass its
 * live one, edits and all, and a page can pass the slim table the generator baked in.
 */
(function (root) {
  "use strict";

  /* ---------- the wire format, decode half ---------- */

  function b64urlToBytes(s) {
    var bin = atob(String(s).replace(/-/g, "+").replace(/_/g, "/"));
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  function b64urlDecode(s) {
    return new TextDecoder().decode(b64urlToBytes(s));
  }
  function varintReader(bytes) {
    var i = 0;
    return function () {
      var v = 0, shift = 1, b;
      do { b = bytes[i++]; v += (b & 0x7f) * shift; shift *= 128; } while (b & 0x80);
      return v;
    };
  }
  function unzig(v) { return v & 1 ? -(v + 1) / 2 : v / 2; }

  async function inflate(bytes) {
    var s = new DecompressionStream("deflate-raw");
    var w = s.writable.getWriter();
    w.write(bytes); w.close();
    return new Uint8Array(await new Response(s.readable).arrayBuffer());
  }

  /* v1: positional arrays as JSON. Every link shared before the short codes is one of
     these, so it reads forever. */
  function decodeV1(code, known) {
    var o = JSON.parse(b64urlDecode(code));
    if (!o || o.v !== 1 || !Array.isArray(o.p) || !Array.isArray(o.t))
      throw new Error("not a design link");
    var id = 1;
    var pieces = o.p.map(function (a) {
      var p = { id: id++, type: o.t[a[0]], x: a[1] / 2, y: a[2] / 2,
                rot: a[3] || 0, level: a[4] || 0 };
      if (a.length > 5) p.zone = a[5];
      return p;
    }).filter(function (p) { return p.type && known(p.type); });
    return { name: String(o.n || "Shared design").slice(0, 80), pieces: pieces, nextId: id };
  }

  /* v2: a JSON head, then column-major varints with the coordinates delta coded, deflated.
     Roughly a fifteenth of v1, which is what got a base under Discord's message limit. */
  function unpackDesign(bytes, known) {
    var headLen = bytes[0] | (bytes[1] << 8);
    var head = JSON.parse(new TextDecoder().decode(bytes.subarray(2, 2 + headLen)));
    if (!head || !Array.isArray(head.t)) throw new Error("not a design link");
    var next = varintReader(bytes.subarray(2 + headLen));
    var n = next();
    var ti = [], xs = [], ys = [], rots = [], lvls = [], i, prev;
    for (i = 0; i < n; i++) ti.push(next());
    prev = 0; for (i = 0; i < n; i++) { prev += unzig(next()); xs.push(prev); }
    prev = 0; for (i = 0; i < n; i++) { prev += unzig(next()); ys.push(prev); }
    for (i = 0; i < n; i++) rots.push(next());
    for (i = 0; i < n; i++) lvls.push(next());
    var id = 1, pieces = [];
    for (i = 0; i < n; i++) {
      var type = head.t[ti[i]];
      var p = { id: id++, type: type, x: xs[i] / 2, y: ys[i] / 2,
                rot: rots[i] * 90, level: lvls[i] };
      if (type === "__fob__") p.zone = next();
      pieces.push(p);
    }
    return { name: String(head.n || "Shared design").slice(0, 80),
             pieces: pieces.filter(function (p) { return p.type && known(p.type); }),
             nextId: id };
  }

  /* A leading tilde marks v2. It is outside the base64url alphabet on purpose, so telling
     the two apart never needs a guess. */
  async function decode(code, known) {
    known = known || function () { return true; };
    if (String(code).charAt(0) !== "~") return decodeV1(code, known);
    return unpackDesign(await inflate(b64urlToBytes(String(code).slice(1))), known);
  }

  /* ---------- what a piece looks like ---------- */

  var TIER_COLOR = { small: "#5d8a4a", medium: "#b08d2a", large: "#b05c3a" };
  var ROLE_COLOR = {
    cover:       "#c2a132",  // hesco, sandbag, bremer, bunker, shelters
    entry:       "#5fa855",  // doors and gates
    offense:     "#9c5ec4",  // indirect fire at ground targets
    antiair:     "#3f9fb5",
    antivehicle: "#e07b39",  // warm counterpart to the anti-air teal, its real sibling
    denial:      "#a55536",  // wire and vehicle obstacles
    support:     "#6f8593",  // logistics, comms, concealment
    objective:   "#c04f92",
    fob:         "#4d8fc4"
  };
  function pieceColor(def) {
    if (!def) return "#888";
    if (def.isFob) return ROLE_COLOR.fob;
    return ROLE_COLOR[def.role] || TIER_COLOR[def.tier] || "#888";
  }

  /* ---------- the overhead picture ----------
     Colour and footprint, nothing else: no names, no height badges, no storey markers, no
     grid. At the size a list shows it none of those can be read anyway, and every one of
     them turns a shape you take in at a glance into something you have to study. The point
     is to recognise the base, not to audit it. */
  function drawThumb(canvas, pieces, defOf, opts) {
    opts = opts || {};
    var pad = opts.pad === undefined ? 6 : opts.pad;
    var ctx = canvas.getContext("2d");
    var dpr = opts.dpr || (root.devicePixelRatio || 1);
    var W = canvas.clientWidth || canvas.width || 320;
    var H = canvas.clientHeight || canvas.height || 180;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    var drawn = pieces.filter(function (p) { return defOf(p.type); });
    if (!drawn.length) return false;

    /* Corners rather than centres, so a long wall on the edge is inside the picture and a
       turned piece is measured by where it actually reaches. */
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    var boxes = drawn.map(function (p) {
      var def = defOf(p.type);
      var a = ((p.rot || 0) * Math.PI) / 180;
      var c = Math.cos(a), s = Math.sin(a);
      var hw = (def.footprint ? def.footprint.w : 1) / 2;
      var hd = (def.footprint ? def.footprint.d : 1) / 2;
      var pts = [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]].map(function (q) {
        return [p.x + q[0] * c - q[1] * s, p.y + q[0] * s + q[1] * c];
      });
      pts.forEach(function (q) {
        if (q[0] < minX) minX = q[0];
        if (q[0] > maxX) maxX = q[0];
        if (q[1] < minY) minY = q[1];
        if (q[1] > maxY) maxY = q[1];
      });
      return { pts: pts, color: pieceColor(def), level: p.level || 0 };
    });

    var spanX = Math.max(1e-6, maxX - minX), spanY = Math.max(1e-6, maxY - minY);
    var z = Math.min((W - pad * 2) / spanX, (H - pad * 2) / spanY);
    var offX = (W - spanX * z) / 2 - minX * z;
    var offY = (H - spanY * z) / 2 - minY * z;

    /* Ground first, then each storey above it, so a stack covers what it sits on and the
       shape reads the way it was built. Flat colour throughout: shading an upper storey
       would be an elevation cue, and this picture deliberately carries none. */
    boxes.sort(function (a, b) { return a.level - b.level; });
    boxes.forEach(function (b) {
      ctx.beginPath();
      b.pts.forEach(function (q, i) {
        var x = q[0] * z + offX, y = q[1] * z + offY;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      });
      ctx.closePath();
      ctx.fillStyle = b.color;
      ctx.fill();
    });
    return true;
  }

  root.WardogsDesignView = {
    decode: decode,
    /* v1 on its own, and synchronous, because it is: only v2 has to inflate. Exposed so a
       test can check the old format without every assertion becoming a promise. */
    decodeV1: decodeV1,
    pieceColor: pieceColor,
    drawThumb: drawThumb,
    ROLE_COLOR: ROLE_COLOR,
    TIER_COLOR: TIER_COLOR
  };
})(typeof window !== "undefined" ? window : globalThis);
