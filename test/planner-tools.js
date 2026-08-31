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

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
