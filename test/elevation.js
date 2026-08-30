/* How the plan says "this thing is tall" and "this thing is off the ground".
 *
 * This suite used to measure how far a piece's drawing reached past its own edges, because
 * height was drawn as an extrusion toward the bottom-right and bigger meant more readable.
 * That was the wrong thing to want. The extrusion drew a riser at every piece's corners
 * regardless of its neighbours, so a long wall came out serrated, and it drew outside the
 * footprint, so the plan misreported which cells were occupied.
 *
 * The invariant is now the opposite one, and it is the one worth pinning: a piece draws
 * inside its own footprint and nowhere else. Height is said by insetting the top face,
 * stepping the fill per storey and printing a badge. Anything off the ground drops a
 * shadow, which is the single exception, and it gets its own pass before any body is drawn
 * so it can never land on a neighbour.
 */
const ROOT = require("path").resolve(__dirname, "..");
const fs = require("fs"), vm = require("vm");
const html = fs.readFileSync(ROOT + "/WardogsBaseBuilder.html", "utf8");
const src = html.match(/<script>\s*"use strict";([\s\S]*)<\/script>/)[1];

let pass = 0, fail = 0;
const check = (ok, label, detail) => {
  console.log((ok ? "PASS  " : "FAIL  ") + label + (ok || !detail ? "" : ": " + detail));
  ok ? pass++ : fail++;
};

const lift = n => {
  const m = src.match(new RegExp("function " + n + "\\([\\s\\S]*?\\n\\}", ""));
  if (!m) throw new Error("could not lift " + n);
  return m[0];
};

// a canvas context that remembers where it was asked to draw
const rec = { pts: [], fills: [], rects: [] };
const ctx = {
  _f: "",
  save() {}, restore() {}, translate() {}, rotate() {}, beginPath() {}, closePath() {},
  fill() {}, stroke() {}, setLineDash() {}, clearRect() {}, drawImage() {},
  moveTo(x, y) { rec.pts.push([x, y]); },
  lineTo(x, y) { rec.pts.push([x, y]); },
  rect(x, y, w, h) { rec.pts.push([x, y], [x + w, y + h]); },
  arcTo(x1, y1, x2, y2) { rec.pts.push([x1, y1], [x2, y2]); },
  fillRect(x, y, w, h) { rec.rects.push({ x, y, w, h, style: this._f }); },
  strokeRect() {}, fillText() {},
  measureText() { return { width: 18 }; },
  set fillStyle(v) { this._f = v; rec.fills.push(v); },
  get fillStyle() { return this._f; },
  strokeStyle: "", lineWidth: 1, font: "", textAlign: "", textBaseline: "", globalAlpha: 1,
};

const sandbox = {
  console, ctx, Math, uiScale: 1,
  canvas: { clientWidth: 900, clientHeight: 600 },
  document: { createElement: () => ({ getContext: () => ({ drawImage() {} }) }) },
  iconImgs: {}, selection: new Set(), hoverId: null, viewLevel: null,
};
vm.createContext(sandbox);
vm.runInContext(
  [lift("pieceRect"), lift("rectCorners"), lift("rectAABB"), lift("shade"),
   lift("pieceColor"), lift("roundRect"), lift("iconAt"), lift("toScreen"),
   lift("drawRect")].join("\n") +
  "\nvar view = { x: 0, y: 0, zoom: 24 };" +
  "\n" + src.match(/const TIER_COLOR = \{[^\n]*\};/)[0] +
  "\n" + src.match(/const ROLE_COLOR = [\s\S]*?\n\};/)[0] +
  "\nvar iconBitmaps = new Map(); var lastDrawn = 0;", sandbox);

const catalog = JSON.parse(src.match(/const CATALOG_DEFAULT = ([\s\S]*?);\nconst ICONS/)[1]);
const defs = {};
for (const id of ["hesco-small", "hesco-tall", "bremer-wall"]) {
  defs[id] = catalog.buildables.find(b => b.id === id);
}
vm.runInContext("var byId = " + JSON.stringify(defs) + ";", sandbox);

const paint = (type, level, zoom, seams) => {
  rec.pts = []; rec.fills = []; rec.rects = [];
  vm.runInContext(
    "view.zoom = " + zoom + ";" +
    "drawRect(pieceRect({id:1,type:'" + type + "',x:0,y:0,rot:0,level:" + level + "})," +
    " byId['" + type + "'], { level: " + level + ", alpha: 1, seams: " + (seams || 0) + " });",
    sandbox);
};

// the piece body, in pixels, at this zoom
const bodySize = (type, zoom) =>
  (catalog.buildables.find(b => b.id === type).footprint.w) * zoom;

/* ---- the invariant: a piece draws inside itself ---- */
{
  const z = 24, half = bodySize("hesco-small", z) / 2;
  let worst = 0;
  for (const lvl of [0, 1, 3, 5]) {
    paint("hesco-small", lvl, z);
    for (const [x, y] of rec.pts) worst = Math.max(worst, Math.abs(x) - half, Math.abs(y) - half);
    for (const r of rec.rects) {
      // The name and the storey badge are annotations sitting above and below the piece,
      // not part of it, and they are already limited to the ends of a run. Everything the
      // piece itself draws is what has to stay inside.
      if (String(r.style).startsWith("#")) continue;
      worst = Math.max(worst, Math.abs(r.x) - half, Math.abs(r.y) - half,
                       Math.abs(r.x + r.w) - half, Math.abs(r.y + r.h) - half);
    }
  }
  // a stroke sits on the edge, so half a line width over is the whole allowance
  check(worst <= 2, "nothing is drawn outside the footprint, at any storey",
    "worst overhang " + worst.toFixed(1) + "px");
}

/* ---- the top face is inset in proportion to how tall the piece is ---- */
const capOf = () => rec.rects.filter(r => !String(r.style).startsWith("#")).pop();
{
  const z = 40;
  paint("hesco-small", 0, z);  const flat = capOf();     // 1 block
  paint("hesco-tall", 0, z);   const mid = capOf();      // 2 blocks
  paint("bremer-wall", 0, z);  const tall = capOf();     // 3 blocks
  const inset = c => (bodySize("hesco-small", z) - c.w) / 2;
  console.log("  cap inset at zoom " + z + ": 1 block " + inset(flat).toFixed(1) +
              "px, 2 block " + inset(mid).toFixed(1) + "px, 3 block " + inset(tall).toFixed(1) + "px");
  /* Every step apart, not just the extremes. Five block heights have to fit inside a
     third of a one-cell piece, so this is the constraint that sets the coefficient, and a
     regression here means two wall heights started looking the same. */
  check(inset(mid) > inset(flat) + 1.5 && inset(tall) > inset(mid) + 1.5,
    "a taller piece shows a deeper inset, so height reads without leaving the footprint");
  check(inset(tall) < bodySize("hesco-small", z) * 0.4,
    "and the inset never eats the piece");
}

/* ---- a run reads as one ridge, not a row of lids ---- */
{
  // seam bits: 1 = +x, 2 = -x. A piece mid-run is joined on both.
  paint("bremer-wall", 0, 40, 3);
  const mid = capOf();
  paint("bremer-wall", 0, 40, 0);
  const lone = capOf();
  check(mid.w > lone.w + 2,
    "a piece joined along a run does not inset the joined edges, so the ridge is unbroken");
}

/* ---- storeys stay distinguishable by fill ---- */
const shades = [0, 1, 2, 3, 4, 5].map(l => vm.runInContext(
  "shade(pieceColor(byId['hesco-small']), -62 + 13 * Math.min(" + l + ", 5))", sandbox));
check(new Set(shades).size === 6, "all six storeys draw in a different shade");

/* ---- and the badge still states the number outright ---- */
check(/ctx\.fillRect\(-tw \/ 2 - padX/.test(src), "the storey badge is drawn on a filled chip");
check(/opt\.level > 0 \? "#ff5b47" : "#8b8b80"/.test(src),
  "stacked reads accent, merely-tall reads grey, so the two cannot be confused");

/* ---- the shadow is the one thing allowed outside, and it cannot land on a body ---- */
{
  const draw = src.match(/function drawNow\(\)[\s\S]*?\n\}/)[0];
  const shadowAt = draw.indexOf("drops a shadow");
  const bodiesAt = draw.indexOf("for (const p of visible) drawPiece(");
  check(shadowAt > 0 && bodiesAt > shadowAt,
    "shadows are their own pass, finished before the first body is drawn");
  check(/0\.13 \* view\.zoom \* lvl/.test(draw),
    "the shadow reaches further the higher the piece is, and scales with the zoom");
}

/* ---- the art does not swamp a large piece ---- */
check(/Math\.min\(Math\.min\(w, h\) \* 0\.75, 66 \* uiScale\)/.test(src),
  "icon size is capped, so a 3x3 emplacement is not a photograph on a coloured square");

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
