/* The picture of a base on the community list, and the one decoder behind it.
 *
 * A list of names tells you nothing about the thing you are choosing between, so each card
 * shows its base: colour and footprint, no names, no height badges, no grid.
 *
 * Drawing it meant decoding a share code outside the planner. The share format already had
 * two encoders drift apart once, quietly, and its card says the count of places is the
 * point, so a second decoder was not written. src/shared/design-view.js is the only one,
 * inlined into the planner by build.ps1 and into the pages by tools/site/client-scripts.js.
 * The first checks here are about keeping it that way.
 */
const ROOT = require("path").resolve(__dirname, "..");
const fs = require("fs"), vm = require("vm"), path = require("path");

let pass = 0, fail = 0;
const check = (ok, label, detail) => {
  console.log((ok ? "PASS  " : "FAIL  ") + label + (ok || !detail ? "" : ": " + detail));
  ok ? pass++ : fail++;
};

const SHARED = fs.readFileSync(path.join(ROOT, "src/shared/design-view.js"), "utf8");
const planner = fs.readFileSync(path.join(ROOT, "WardogsBaseBuilder.html"), "utf8");
const designs = fs.readFileSync(path.join(ROOT, "docs/designs/index.html"), "utf8");

/* --- one decoder, and both places really carry it --- */
{
  const fingerprint = "function unpackDesign(bytes, known)";
  check(planner.includes(fingerprint), "the planner carries the shared decoder");
  check(designs.includes(fingerprint), "and so does the designs page");
  check(designs.split(fingerprint).length === 2,
    "the page carries it once, not once per script block");

  /* the old private copies must be gone, or there are two again and only one is maintained */
  const appScript = planner.slice(planner.indexOf("<script>"));
  check(!/function unpackDesign\(bytes\)\s*\{/.test(appScript),
    "and the planner's own copy of it is gone, not merely unused");
  check(!/const ROLE_COLOR = \{[\s\S]*?cover:/.test(appScript),
    "the palette is not spelled out a second time in the app either");
}

/* --- the drawing, against a canvas that only records what it was asked to do --- */
const sb = { console, Math, JSON, Array, Object, Number, Infinity, Uint8Array,
             TextDecoder, Response, DecompressionStream, Promise, Error, String,
             atob: s => Buffer.from(s, "base64").toString("binary"),
             devicePixelRatio: 1 };
vm.createContext(sb);
vm.runInContext(SHARED, sb);

function fakeCanvas(w, h) {
  const calls = { fills: [], paths: [], text: 0 };
  let cur = null;
  const ctx = {
    setTransform() {}, clearRect() {},
    beginPath() { cur = []; },
    moveTo(x, y) { cur.push([x, y]); },
    lineTo(x, y) { cur.push([x, y]); },
    closePath() {},
    fill() { calls.paths.push(cur); calls.fills.push(ctx.fillStyle); },
    fillText() { calls.text++; },
    strokeText() { calls.text++; },
    fillStyle: null, globalAlpha: 1,
  };
  return { canvas: { clientWidth: w, clientHeight: h, width: w, height: h,
                     getContext: () => ctx, style: {} }, calls };
}

const DEFS = {
  "hesco-wall": { footprint: { w: 4, d: 1 }, role: "cover" },
  "gate":       { footprint: { w: 4, d: 1 }, role: "entry" },
  "l81-mortar": { footprint: { w: 4, d: 4 }, role: "offense" },
  "__fob__":    { footprint: { w: 3, d: 3 }, isFob: true },
};
const defOf = t => DEFS[t];
const draw = (pieces, w, h) => {
  const f = fakeCanvas(w || 300, h || 150);
  const ok = sb.WardogsDesignView.drawThumb(f.canvas, pieces, defOf, { dpr: 1 });
  return { ok, calls: f.calls, canvas: f.canvas };
};

const BASE = [
  { type: "__fob__",    x: 0,  y: 0,  rot: 0,  level: 0 },
  { type: "hesco-wall", x: -6, y: -5, rot: 0,  level: 0 },
  { type: "hesco-wall", x: 6,  y: -5, rot: 0,  level: 0 },
  { type: "gate",       x: 0,  y: -5, rot: 0,  level: 0 },
  { type: "l81-mortar", x: 4,  y: 4,  rot: 0,  level: 1 },
];

{
  const r = draw(BASE);
  check(r.ok && r.calls.paths.length === BASE.length,
    "every piece of a base is drawn", r.calls.paths.length + " of " + BASE.length);
  check(r.calls.text === 0,
    "and nothing is written on it: no names, no counts, no storey markers");
}

/* --- it has to fit, or a base drawn off the edge of its own card is worse than none --- */
{
  const W = 300, H = 150, r = draw(BASE, W, H);
  const all = r.calls.paths.flat();
  const xs = all.map(p => p[0]), ys = all.map(p => p[1]);
  const inside = Math.min.apply(null, xs) >= -0.001 && Math.max.apply(null, xs) <= W + 0.001 &&
                 Math.min.apply(null, ys) >= -0.001 && Math.max.apply(null, ys) <= H + 0.001;
  check(inside, "the whole base lands inside the canvas",
    "x " + Math.min.apply(null, xs).toFixed(1) + " to " + Math.max.apply(null, xs).toFixed(1) +
    ", y " + Math.min.apply(null, ys).toFixed(1) + " to " + Math.max.apply(null, ys).toFixed(1));

  /* and it fills it: a base drawn tiny in the middle of a wide card was the first attempt */
  const usedW = Math.max.apply(null, xs) - Math.min.apply(null, xs);
  const usedH = Math.max.apply(null, ys) - Math.min.apply(null, ys);
  check(Math.max(usedW / W, usedH / H) > 0.8,
    "and fills it rather than sitting small in the middle",
    (100 * Math.max(usedW / W, usedH / H)).toFixed(0) + "% of the long side");
}

/* --- a wide base and a tall one both fit, without being squashed --- */
for (const [label, pieces] of [
  ["a long thin wall line", [{ type: "hesco-wall", x: -20, y: 0, rot: 0, level: 0 },
                             { type: "hesco-wall", x: 20, y: 0, rot: 0, level: 0 }]],
  ["a tall narrow one",     [{ type: "hesco-wall", x: 0, y: -20, rot: 90, level: 0 },
                             { type: "hesco-wall", x: 0, y: 20, rot: 90, level: 0 }]],
]) {
  const W = 300, H = 150, r = draw(pieces, W, H);
  const all = r.calls.paths.flat();
  const xs = all.map(p => p[0]), ys = all.map(p => p[1]);
  const fits = Math.min.apply(null, xs) >= -0.001 && Math.max.apply(null, xs) <= W + 0.001 &&
               Math.min.apply(null, ys) >= -0.001 && Math.max.apply(null, ys) <= H + 0.001;
  /* the shape must survive: the two ends stay the same distance apart in both axes as they
     were, up to the one scale factor, or the picture is a lie about the base */
  const w0 = Math.abs(pieces[1].x - pieces[0].x), h0 = Math.abs(pieces[1].y - pieces[0].y);
  const dw = Math.max.apply(null, xs) - Math.min.apply(null, xs);
  const dh = Math.max.apply(null, ys) - Math.min.apply(null, ys);
  const square = w0 === 0 || h0 === 0 ? true
    : Math.abs((dw / dh) - (w0 / h0)) < 0.15 * (w0 / h0);
  check(fits && square, label + " fits without being stretched out of shape");
}

/* --- a turned piece is measured by where it reaches, not by its centre --- */
{
  const r = draw([{ type: "hesco-wall", x: 0, y: 0, rot: 45, level: 0 }], 200, 200);
  const pts = r.calls.paths[0];
  check(pts.length === 4, "a piece is drawn as its four corners");
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  check(Math.max.apply(null, xs) - Math.min.apply(null, xs) > 1 &&
        Math.max.apply(null, ys) - Math.min.apply(null, ys) > 1,
    "and a turned one is a diamond, with width in both directions");
}

/* --- colour comes from the role, and the same roles the planner uses --- */
{
  const r = draw(BASE);
  const V = sb.WardogsDesignView;
  check(r.calls.fills.indexOf(V.ROLE_COLOR.entry) > -1, "a gate paints the entry colour");
  check(r.calls.fills.indexOf(V.ROLE_COLOR.fob) > -1, "and the FOB paints its own");
  check(V.pieceColor({ role: "cover" }) === V.ROLE_COLOR.cover &&
        V.pieceColor({ tier: "small" }) === V.TIER_COLOR.small &&
        V.pieceColor({}) === "#888",
    "role first, then tier, then a plain fallback, same as the plan");
}

/* --- nothing to draw is not an error, it is no picture --- */
{
  check(draw([]).ok === false, "an empty design draws nothing and says so");
  check(draw([{ type: "not-a-real-thing", x: 0, y: 0 }]).ok === false,
    "and so does one made only of pieces this build has never heard of");
}

/* --- the page really asks for one --- */
{
  check(/canvas class="thumb"|canvas class=\\"thumb\\"/.test(designs) ||
        designs.includes('canvas class="thumb"') || designs.includes("canvas class='thumb'") ||
        designs.includes('"thumb"'),
    "the designs page builds a canvas for each card");
  check(designs.includes("THUMB_DEFS"),
    "and carries the footprints and roles it needs to paint one");
  check(!/"icon"\s*:/.test(designs.slice(designs.indexOf("THUMB_DEFS"),
                                          designs.indexOf("THUMB_DEFS") + 4000)),
    "without shipping the whole catalog to every reader for it");
}

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
