const ROOT = require("path").resolve(__dirname, "..");
// Drive the real drawRect out of the shipped file against a recording canvas and measure
// how far a piece's height actually reaches on screen. Eyeballing a screenshot cannot tell
// you that a three-storey stack reads six pixels taller than the ground. This can.
const fs = require("fs"), vm = require("vm");
const html = fs.readFileSync(
  ROOT + "/WardogsBaseBuilder.html", "utf8");
const src = html.match(/<script>\s*"use strict";([\s\S]*)<\/script>/)[1];

let pass = 0, fail = 0;
const check = (ok, label) => { console.log((ok ? "PASS  " : "FAIL  ") + label); ok ? pass++ : fail++; };

const lift = n => {
  const re = new RegExp("function " + n + "\\([\\s\\S]*?\\n\\}", "");
  const m = src.match(re);
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
const hesco = catalog.buildables.find(b => b.id === "hesco-small");
vm.runInContext("var byId = " + JSON.stringify({ [hesco.id]: hesco }) + ";", sandbox);

const paint = (level, zoom) => {
  rec.pts = []; rec.fills = []; rec.rects = [];
  vm.runInContext(
    "view.zoom = " + zoom + ";" +
    "drawRect(pieceRect({id:1,type:'hesco-small',x:0,y:0,rot:0,level:" + level + "})," +
    " byId['hesco-small'], { level: " + level + ", alpha: 1, seams: 0 });", sandbox);
};

// how far below-right does the drawn piece reach, at a given storey and zoom?
function reach(level, zoom) {
  paint(level, zoom);
  const ys = rec.pts.map(p => p[1]);
  return Math.max.apply(null, ys) - Math.min.apply(null, ys);
}

const z = 24;
const r0 = reach(0, z), r1 = reach(1, z), r3 = reach(3, z);
console.log("  reach at zoom " + z + ": ground " + r0.toFixed(1) + "px, L2 " +
            r1.toFixed(1) + "px, L4 " + r3.toFixed(1) + "px");

// A storey has to be worth appreciably more than a couple of pixels or the plan cannot say
// how tall anything is. That was the reported bug.
check(r1 - r0 > 6, "one storey up reads clearly taller than ground level");
check(r3 - r1 > 12, "three storeys up reads clearly taller again than one");

// ...and it has to survive zooming, which the old flat 2px-per-block offset did not.
const far = reach(3, 10), near = reach(3, 40);
console.log("  L4 reach: " + far.toFixed(1) + "px zoomed out, " + near.toFixed(1) + "px zoomed in");
check(near > far * 1.8, "height scales with the zoom instead of staying a fixed few pixels");

// Every storey must land on its own shade, including the top ones.
const shades = [0, 1, 2, 3, 4, 5].map(l => vm.runInContext(
  "shade(pieceColor(byId['hesco-small']), -62 + 13 * Math.min(" + l + ", 5))", sandbox));
console.log("  storey shades: " + shades.join(" "));
check(new Set(shades).size === 6, "all six storeys draw in a different shade (was: L4/L5/L6 identical)");

// The badge is the only exact statement of height on the plan, so it gets a solid chip.
check(/ctx\.fillRect\(-tw \/ 2 - padX/.test(src), "the storey badge is drawn on a filled chip");
check(/opt\.level > 0 \? "#ff5b47" : "#8b8b80"/.test(src),
  "stacked reads accent, merely-tall reads grey, so the two cannot be confused");

// Bigger extrusions only look right if they occlude in the right order.
check(/\(a\.level \|\| 0\) - \(b\.level \|\| 0\) \|\| \(a\.x \+ a\.y\) - \(b\.x \+ b\.y\)/.test(src),
  "pieces draw far to near, so height falls behind a neighbour and not across it");

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
