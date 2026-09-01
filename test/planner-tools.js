const ROOT = require("path").resolve(__dirname, "..");
// Exercise the new planning tools: presets, mirror, copy/paste, budget, anti-climb.
const fs = require("fs");
const vm = require("vm");

const html = fs.readFileSync(
  ROOT + "/WardogsBaseBuilder.html", "utf8");
const src = html.match(/<script>\s*"use strict";([\s\S]*)<\/script>/)[1];
const catalog = JSON.parse(src.match(/const CATALOG_DEFAULT = ([\s\S]*?);\nconst ICONS/)[1]);

let pass = 0, fail = 0;
const check = (ok, label) => { console.log((ok ? "PASS  " : "FAIL  ") + label); ok ? pass++ : fail++; };

const byId = {};
for (const b of catalog.buildables) byId[b.id] = b;

const sandbox = { console, byId, Math, JSON, Object, Array, Set, Number, String };
vm.createContext(sandbox);
const lift = n => {
  const m = src.match(new RegExp("function " + n + "\\([\\s\\S]*?\\n\\}"));
  if (!m) throw new Error("could not lift " + n);
  return m[0];
};
// Geometry helpers only. The presets these used to exercise were taken out of the app,
// because ready-made layouts are the community list's job now.
vm.runInContext([
  lift("pieceRect"), lift("rectCorners"), lift("rectsOverlap"), lift("canOverlay"),
].join("\n"), sandbox);

// nothing should be left referring to presets
check(!/PRESETS|stampPreset|presetCost|btnTemplates/.test(src),
  "no preset code left in the app");

// ---------- mirror ----------
vm.runInContext(`
  var design = { pieces: [] }, selection = new Set();
  var undoStack = [], redoStack = [];
  function pushUndo(){} function afterChange(){}
  ${lift("mirrorSelection")}
`, sandbox);
vm.runInContext(`
  design.pieces = [ {id:1,type:"gate",x:0,y:0,rot:0,level:0},
                    {id:2,type:"hesco-wall",x:4,y:0,rot:0,level:0},
                    {id:3,type:"hesco-wall",x:8,y:0,rot:0,level:0} ];
  selection = new Set([1,2,3]);
  mirrorSelection("h");
`, sandbox);
const xsAfter = vm.runInContext("design.pieces.map(p=>p.x).join(',')", sandbox);
check(xsAfter === "8,4,0", `horizontal flip mirrors positions about the centre (got ${xsAfter})`);

vm.runInContext(`
  design.pieces = [ {id:1,type:"hesco-small",x:0,y:0,rot:90,level:0},
                    {id:2,type:"hesco-small",x:0,y:6,rot:90,level:0} ];
  selection = new Set([1,2]);
  mirrorSelection("v");
`, sandbox);
const ysAfter = vm.runInContext("design.pieces.map(p=>p.y).join(',')", sandbox);
check(ysAfter === "6,0", `vertical flip mirrors positions (got ${ysAfter})`);

// ---------- copy / paste ----------
vm.runInContext(`
  var clipboard = null, lastPointer = {x:0,y:0}, savedFlashTimer=null;
  var document = { getElementById: () => null };
  var snap = true;
  ${lift("snapVal")}
  ${lift("snapPoint")}
  function flashStatus(){}
  ${lift("copySelection")}
  ${lift("pasteClipboard")}
  design.pieces = [ {id:1,type:"hesco-small",x:0,y:0,rot:0,level:0},
                    {id:2,type:"hesco-small",x:2,y:0,rot:0,level:0} ];
  design.nextId = 3;
  selection = new Set([1,2]);
  copySelection();
  lastPointer = {x:20,y:10};
  pasteClipboard();
`, sandbox);
const total = vm.runInContext("design.pieces.length", sandbox);
const pasted = vm.runInContext("design.pieces.slice(2).map(p=>p.x+','+p.y).join(' | ')", sandbox);
check(total === 4, `paste added the copied pieces (now ${total})`);
check(pasted === "19,10 | 21,10", `pasted centred on the pointer (got ${pasted})`);
check(vm.runInContext("design.pieces.slice(0,2).map(p=>p.x).join(',')", sandbox) === "0,2",
  "the originals were left where they were");

// ---------- rotation snapping (the 225-degree bug) ----------
vm.runInContext(`
  var snap = true;
  ${lift("rotatedValue")}
  ${lift("alignSelection")}
`, sandbox);
const rot = (cur, deg, snapOn) => {
  vm.runInContext(`snap = ${snapOn};`, sandbox);
  return vm.runInContext(`rotatedValue(${cur}, ${deg})`, sandbox);
};
check(rot(0, 90, true) === 90, "square piece + R with snap on turns a quarter");
check(rot(270, 90, true) === 0, "…and wraps cleanly past 360");
check(rot(225, 90, true) % 90 === 0, "crooked 225° + R with snap on comes back square");
check(rot(225, 90, true) === 270, "…to the nearest right angle (270°)");
check(rot(200, 90, true) === 180, "…nearest works downward too (200° → 180°)");
check(rot(15, 90, true) === 0, "a 15° nudge squares back to 0°");
check(rot(0, 15, false) === 15, "with snap off, free rotation still steps 15°");
check(rot(225, 15, false) === 240, "…and keeps its odd angle when snap is off");
// align repairs both position and rotation
vm.runInContext(`
  design.pieces = [{id:1,type:"hesco-wall",x:3.27,y:-1.11,rot:225,level:0}];
  selection = new Set([1]);
  function flashStatus(){}
  alignSelection();
`, sandbox);
const aligned = vm.runInContext(`JSON.stringify([design.pieces[0].x,design.pieces[0].y,design.pieces[0].rot])`, sandbox);
check(aligned === "[3.5,-1,270]", `Align to grid squares position and rotation (got ${aligned})`);

// ---------- turning a selection ----------
/* Turning used to spin every piece where it stood, which is right for one piece and useless
   for several: a corner copied and turned came back as the same corner with its blocks
   facing a different way. Building the far side of a symmetrical base needs the group to
   turn about its own centre.
*/
vm.runInContext(`
  var placing = null, ghost = { rot: 0 };
  snap = true;                       // the real rotatedValue is already lifted above
  function updateHint(){} function draw(){}
  ${lift("rotateSelection")}
`, sandbox);

const layout = () => vm.runInContext(
  "design.pieces.map(p=>[+p.x.toFixed(3),+p.y.toFixed(3),p.rot].join(':')).join(' ')", sandbox);
const setUp = pieces => vm.runInContext(
  `design.pieces = ${pieces}; selection = new Set(design.pieces.map(p=>p.id));`, sandbox);

// an L of wall, the sort of corner somebody copies to build the other side
const CORNER = `[ {id:1,type:"hesco-wall",x:0,y:0,rot:0,level:0},
                  {id:2,type:"hesco-wall",x:4,y:0,rot:0,level:0},
                  {id:3,type:"hesco-wall",x:6,y:2,rot:90,level:0} ]`;

setUp(CORNER);
const before = layout();
vm.runInContext("rotateSelection(90)", sandbox);
const turned = layout();
check(turned !== before, "turning a selection moves the pieces, it does not just spin them");

// four quarter turns must land exactly back, or repeated use drifts the base apart
vm.runInContext("rotateSelection(90); rotateSelection(90); rotateSelection(90)", sandbox);
check(layout() === before, "four quarter turns land a selection exactly back where it began");

// the shape has to survive the turn: every distance between pieces is unchanged
setUp(CORNER);
const spread = () => vm.runInContext(`
  (function(){ const P = design.pieces, out = [];
    for (let i = 0; i < P.length; i++) for (let j = i+1; j < P.length; j++)
      out.push(Math.hypot(P[i].x-P[j].x, P[i].y-P[j].y).toFixed(4));
    return out.join(","); })()`, sandbox);
const spreadBefore = spread();
vm.runInContext("rotateSelection(90)", sandbox);
check(spread() === spreadBefore, "and the shape is carried round intact, not stretched");

// the pieces themselves turn too, or the walls end up facing the wrong way
const rots = vm.runInContext("design.pieces.map(p=>p.rot).join(',')", sandbox);
check(rots === "90,90,180", `each piece turns with the group (got ${rots})`);

// pieces stay on the grid, so the turned copy still clicks onto everything else
const offGrid = vm.runInContext(
  "design.pieces.filter(p=>Math.abs(p.x*2-Math.round(p.x*2))>1e-9||Math.abs(p.y*2-Math.round(p.y*2))>1e-9).length",
  sandbox);
check(offGrid === 0, "a turned selection lands back on the grid, not between cells");

// one piece is its own centre, so single-piece turning is exactly what it always was
vm.runInContext(`
  design.pieces = [ {id:1,type:"hesco-wall",x:3,y:7,rot:0,level:0} ];
  selection = new Set([1]);
  rotateSelection(90);`, sandbox);
check(layout() === "3:7:90", "turning one piece still turns it on the spot");

// and with a buildable in hand, the key turns what you are about to place, not the design
vm.runInContext(`
  placing = "hesco-wall"; ghost.rot = 0;
  design.pieces = [ {id:1,type:"hesco-wall",x:3,y:7,rot:0,level:0} ];
  selection = new Set([1]);
  rotateSelection(90);
  placing = null;`, sandbox);
check(layout() === "3:7:0" && vm.runInContext("ghost.rot", sandbox) === 90,
  "with a piece in hand the key turns the piece in hand, leaving the design alone");

// ---------- the toolbar stays lean ----------
/* Four buttons up top all did the one job of getting a design out, and a fifth was a power
   tool almost nobody opens. Less is more was the instruction. Buttons creep back one at a
   time and each one looks reasonable on its own, so the count is checked, not just the
   names.
*/
const topbar = html.match(/<div id="topbar">([\s\S]*?)\n<\/div>/);
check(!!topbar, "the top bar is still findable in the markup");
// what is actually on the bar, so tucking things into the menu counts as tucking them away
const onBar = topbar[1].replace(/<div id="shareMenu"[\s\S]*?<\/div>/, "");
const topButtons = (onBar.match(/<button [^>]*>/g) || []);
/* What the bar shows at once is the thing worth capping, and a control that only exists in
   one view is not on the bar in the other. The 3D pair ships hidden and the view swaps them
   in for the Snap button, which places nothing in 3D, so neither view shows more than ten. */
const atRest = topButtons.filter(b => !/display:\s*none/.test(b)).length;
const in3d = atRest + topButtons.filter(b => /id="btnSpin/.test(b)).length - 1;
check(atRest <= 10, `the top bar shows ten buttons or fewer (shows ${atRest})`);
check(in3d <= 10, `and no more than that in the 3D view either (shows ${in3d})`);
check(/getElementById\("btnSnap"\)\.style\.display = on \? "none" : ""/.test(html),
  "which holds because 3D swaps Snap out for the two it turns the view with");

// the three ways out live under Share, not beside it
const menu = html.match(/<div id="shareMenu"[\s\S]*?<\/div>/);
check(!!menu, "Share opens a menu rather than sitting next to its own alternatives");
for (const id of ["btnShareLink", "btnPng", "btnExport"])
  check(menu[0].includes(id), `${id} is inside the Share menu`);

// and the two that moved are reachable from where they moved to, not orphaned
check(/openModal\("Saved Designs"[\s\S]{0,200}openImport/.test(src),
  "Import is offered from Saved Designs");
check(/openCatalog\]/.test(src) || /\["⚙ Catalog editor", openCatalog\]/.test(src),
  "the catalog editor is offered from Help");
check(/function openImport\(/.test(src) && /function openCatalog\(/.test(src),
  "both are real functions, so nothing depends on a button that no longer exists");
check(!/getElementById\("btnCatalog"\)/.test(src) && !/id="btnCatalog"/.test(html),
  "and no code is left reaching for the Catalog button that was removed");

// ---------- the keys everyone already knows ----------
/* The plain letters were matched before the Ctrl combinations, and holding Ctrl did not stop
   them. So Ctrl+V hit the plain "v" branch and toggled the 3D view instead of pasting,
   Ctrl+R turned the selection on its way to reloading the page, and Ctrl+B toggled snap.
   Reported as a hotkey clash, and it was worse than that: the shortcut everybody has in
   their fingers did the wrong thing.
*/
const keys = src.slice(src.indexOf(`window.addEventListener("keydown"`));
const at = needle => keys.indexOf(needle);

check(at("e.ctrlKey || e.metaKey") > -1 && at("e.ctrlKey || e.metaKey") < at(`k === "b"`),
  "Ctrl combinations are matched before the plain letters, not after them");

/* Order alone is not enough: without the return, a plain branch further down still catches
   a modified key that the block above did not list. */
const modBlock = keys.slice(at("e.ctrlKey || e.metaKey"), at(`if (k === "[")`));
check(/\breturn;/.test(modBlock),
  "and a modified key stops there, so an unlisted Ctrl combination stays the browser's");
for (const [combo, fn] of [["z", "undo"], ["y", "redo"], ["d", "duplicateSelection"],
                           ["c", "copySelection"], ["v", "pasteClipboard"]])
  check(new RegExp(`k === "${combo}"[\\s\\S]{0,80}${fn}\\(`).test(modBlock),
    `Ctrl+${combo.toUpperCase()} does the Word thing (${fn})`);

// and the 3D view is off the letter that made Ctrl+V ambiguous to read
check(!/k === "v"\)\s*(set3D|cycleView)/.test(keys), "the 3D view is no longer on V");
check(/k === "3"\)\s*(set3D|cycleView)/.test(keys), "it is on 3, which nothing else wants");
check(!/<kbd>V<\/kbd>/.test(html) && !/3D view \(V\)/.test(html),
  "and nothing still tells the user to press V");
check(/<kbd>3<\/kbd>/.test(html), "the shortcut list says 3");

// ---------- "Plan your FOB" answers the canvas, not the last edit ----------
/* It used to be hidden only inside afterChange, which a design arriving at boot never went
   through. So opening a share link, or coming back to a saved base after a hard refresh,
   drew the base with the invitation to start one sitting on top of it. Reported twice.
*/
vm.runInContext(`
  var view3d = false;
  var emptyEl = { style: { display: "" } };
  document = { getElementById: function(id){ return id === "emptyState" ? emptyEl : null; } };
  ${lift("syncEmptyState")}
`, sandbox);
const emptyState = () => vm.runInContext("syncEmptyState(); emptyEl.style.display", sandbox);
const withPieces = n => vm.runInContext(
  `design.pieces = Array.from({length:${n}}, function(_,i){ return {id:i+1,type:"hesco-wall",x:i,y:0,rot:0,level:0}; });`,
  sandbox);

withPieces(0);
check(emptyState() === "", "an empty canvas offers the invitation to start");
withPieces(19);
check(emptyState() === "none", "a canvas with a base on it does not");

/* the reported case: a design that arrives without anything being edited */
vm.runInContext(`emptyEl.style.display = "";`, sandbox);   // as the markup ships it
withPieces(19);
check(emptyState() === "none",
  "a design loaded at boot hides it, without waiting for an edit");

withPieces(0);
vm.runInContext("view3d = true;", sandbox);
check(emptyState() === "none", "and it never sits over the 3D view");
vm.runInContext("view3d = false;", sandbox);

/* and the thing that made it possible: drawing owns it, so it cannot lag behind the canvas */
check(/function drawNow\(\)\s*\{\s*syncEmptyState\(\);/.test(src),
  "the draw decides it, so it always agrees with what was just drawn");
check(!/emptyState"\)\.style\.display/.test(src.replace(lift("syncEmptyState"), "")),
  "and nothing else sets it behind the draw's back");

// ---------- what the design arrives before ----------
/* Two bugs that only showed up once a third thing was read off the design.
 *
 * A chosen chip in a .seg strip was near-black ink on a transparent ground. `.seg button`
 * sets a transparent background and is written after the shared `button.active` rule at the
 * same specificity, so it won, and the filled state kept the filled state's ink without the
 * fill. The storey strip had been drawing "All" as an empty box for as long as it has
 * existed and nobody read it as a bug, because a blank chip looks like a gap.
 */
{
  // the stylesheet, not the script: this test file reads only the script into src
  const css = html.slice(0, html.indexOf("</style>") + 8);
  check(css.indexOf(".seg button.active") > css.indexOf(".seg button {"),
    "the filled state for a strip chip is restated after the rule that was beating it");
  check(/\.seg button\.active\s*\{[^}]*background:/.test(css),
    "and it sets its own background, so a chosen chip is filled rather than blank");
}

/* Coming back to a saved base drew the base and left every figure beside it at zero. The
   restore is reached from a promise, so it lands after startup has already worked
   everything out from the empty design nobody was looking at.
*/
{
  const fn = lift("loadCurrent");
  check(/afterChange\(/.test(fn),
    "restoring the last design recomputes what is read off it, rather than leaving the " +
    "panel showing an empty base next to a full one");
  check(/afterChange\(false\)/.test(fn),
    "and does it without saving, because nothing changed by being reopened");
}

/* The walkthrough sizes a person, and that size has to come from the cell figure the app
   already prints rather than from a second guess. The first cut set eye height to 1.65
   blocks, reasoning off a wall description. At the printed 1.2 m a cell that makes the
   walker 1.98 m tall and its sprint 10.8 m/s, which is faster than the world record.

   Neither is visible from inside the view. Everything is scaled together, so a base full
   of giants looks perfectly ordinary until a real figure stands next to it, and the bar
   along the bottom of the same screen had been printing 1.2 m the whole time.

   So: one metres-per-cell constant, every walk dimension worked out from it, and the
   constant agreeing with what the status bar prints.
*/
{
  const m = html.match(/const CELL_M = ([\d.]+);/);
  check(!!m, "the walkthrough has one metres-per-cell constant");
  const bar = html.match(/1 cell = 1 Hesco block \u2248 ([\d.]+) m/);
  check(!!bar, "and the status bar still prints a metre figure to check it against");
  if (m && bar) check(m[1] === bar[1], "and the two agree: " + m[1] + " against " + bar[1]);

  for (const name of ["WALK_EYE", "WALK_R", "WALK_WALK", "WALK_RUN"]) {
    const d = html.match(new RegExp("const " + name + " = ([^;]+);"));
    check(!!d && /\/ CELL_M/.test(d[1]),
      name + " is worked out from CELL_M rather than written in cells");
  }

  const eye = html.match(/const WALK_EYE = ([\d.]+) \/ CELL_M;/);
  check(!!eye && +eye[1] > 1.4 && +eye[1] < 1.85,
    "and eye height is a person's, in metres");
  const run = html.match(/const WALK_RUN = ([\d.]+) \/ CELL_M;/);
  check(!!run && +run[1] < 8,
    "and the sprint is not faster than a human being");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
