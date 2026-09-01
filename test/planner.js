const ROOT = require("path").resolve(__dirname, "..");
// Verify the built app: JS syntax + the stacking / elevation rules, run against
// the real geometry and issue code lifted out of the shipped file.
const fs = require("fs");
const vm = require("vm");

const html = fs.readFileSync(
  ROOT + "/WardogsBaseBuilder.html", "utf8");

const m = html.match(/<script>\s*"use strict";([\s\S]*)<\/script>/);
if (!m) { console.log("FAIL: could not find app script"); process.exit(1); }
const src = m[1];

let pass = 0, fail = 0;
const check = (ok, label) => { console.log((ok ? "PASS  " : "FAIL  ") + label); ok ? pass++ : fail++; };

try { new vm.Script(src); check(true, "app script parses (no syntax errors)"); }
catch (e) { check(false, "syntax error: " + e.message); process.exit(1); }

// ---- catalog ----
const catalog = JSON.parse(src.match(/const CATALOG_DEFAULT = ([\s\S]*?);\nconst ICONS/)[1]);
const byId = {};
for (const b of catalog.buildables) byId[b.id] = b;

const get = id => byId[id];
const sandbag = get("sandbag-wall"), bremer = get("bremer-wall"), hesco = get("hesco-small");
const ciws = get("vanguard-ciws"), mortar = get("l81-mortar"), gate = get("gate"), tower = get("recon-tower");

check(sandbag.tags.includes("overlay"), "sandbag tagged 'overlay'");
check(bremer.tags.includes("top-layer"), "bremer still 'top-layer'");
check(gate.tags.includes("ground-only"), "gate still ground-only");
check(tower.tags.includes("no-stack"), "recon tower still no-stack");
check(ciws.tags.includes("needs-sky"), "CIWS still needs open sky");

// ---- lift the real geometry + rules out of the source ----
const sandbox = { console };
vm.createContext(sandbox);
const lift = name => src.match(new RegExp("function " + name + "\\([\\s\\S]*?\\n\\}", ""))[0];
vm.runInContext(
  [lift("pieceRect"), lift("rectCorners"), lift("rectsOverlap"), lift("canOverlay")].join("\n") +
  "\nvar byId = " + JSON.stringify(byId) + ";", sandbox);

// replicate the shipped issue rules that concern stacking
sandbox.levelName = l => (l === 0 ? "Ground" : "Level " + (l + 1));
vm.runInContext(`
function stackIssues(pieces) {
  const issues = [];
  for (let i = 0; i < pieces.length; i++) for (let j = i+1; j < pieces.length; j++) {
    const a = pieces[i], b = pieces[j];
    if ((a.level||0) !== (b.level||0)) continue;
    const da = byId[a.type], db = byId[b.type];
    if (!da || !db) continue;
    if (canOverlay(da, db) || canOverlay(db, da)) continue;
    if (rectsOverlap(pieceRect(a), pieceRect(b))) issues.push("overlap:" + b.id);
  }
  for (const p of pieces) {
    const lvl = p.level || 0; if (lvl === 0) continue;
    const def = byId[p.type]; if (!def) continue;
    const supported = pieces.some(q => q !== p && (q.level||0) < lvl && rectsOverlap(pieceRect(p), pieceRect(q)));
    if (!supported) issues.push("unsupported:" + p.id);
  }
  for (const p of pieces) {
    const d = byId[p.type]; if (!d) continue;
    if ((d.tags||[]).includes("ground-only") && (p.level||0) > 0) issues.push("ground-only:" + p.id);
    if ((d.tags||[]).includes("no-stack") && (p.level||0) > 0) issues.push("no-stack:" + p.id);
  }
  return issues;
}`, sandbox);

const P = (id, type, x, y, level) => ({ id, type, x, y, level, rot: 0 });

// a 3x3 hesco platform on the ground
const platform = [];
let n = 1;
for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) platform.push(P(n++, "hesco-small", x, y, 0));

const run = pieces => sandbox.stackIssues(pieces);

check(run(platform).length === 0, "a 3x3 hesco platform on its own is clean");

// THE CASE THE USER ASKED FOR: CIWS on top of that platform
const ciwsOnTop = [...platform, P(100, "vanguard-ciws", 0, 0, 1)];
check(run(ciwsOnTop).length === 0, "CIWS on a hesco platform -> no complaints");

const mortarOnTop = [...platform, P(101, "l81-mortar", 0, 0, 1)];
check(run(mortarOnTop).length === 0, "mortar on a hesco platform -> no complaints");

const samOnTop = [...platform, P(102, "talon-9k-sam", 0, 0, 1)];
check(run(samOnTop).length === 0, "SAM on a hesco platform -> no complaints");

// two storeys of platform then a weapon on top
const twoStorey = [...platform, ...platform.map((p, i) => ({ ...p, id: 200 + i, level: 1 })),
                   P(300, "vanguard-ciws", 0, 0, 2)];
check(run(twoStorey).length === 0, "CIWS on a two-storey platform -> no complaints");

// floating weapon with nothing under it
const floating = [P(400, "vanguard-ciws", 20, 20, 1)];
check(run(floating).some(i => i.startsWith("unsupported:400")), "CIWS floating in mid-air -> flagged");

// weapon raised over a platform it does NOT sit above
const offset = [...platform, P(401, "vanguard-ciws", 20, 20, 1)];
check(run(offset).some(i => i.startsWith("unsupported:401")), "CIWS raised beside the platform -> flagged");

// sandbags on the platform (overlay rule) - still fine at the same level
const sandbagsOnWall = [P(500, "hesco-small", 0, 0, 0), P(501, "sandbag-wall", 0, 0, 0)];
check(run(sandbagsOnWall).length === 0, "sandbags over a hesco at the same level -> allowed");

const sandbagOnBremer = [P(502, "bremer-wall", 0, 0, 0), P(503, "sandbag-wall", 0, 0, 0)];
check(run(sandbagOnBremer).some(i => i.startsWith("overlap:")), "sandbags over a bremer wall -> still flagged");

// game rules that must survive
check(run([...platform, P(600, "gate", 0, 0, 1)]).some(i => i.startsWith("ground-only:600")),
  "gate raised off the ground -> flagged");
check(run([...platform, P(601, "recon-tower", 0, 0, 1)]).some(i => i.startsWith("no-stack:601")),
  "recon tower stacked -> flagged");
check(run([P(602, "hesco-small", 0, 0, 0), P(603, "hesco-small", 0, 0, 0)]).some(i => i.startsWith("overlap:")),
  "two hescos in the same spot -> still flagged");

// ---- automatic stacking (replaces the old build-level mode) ----
vm.runInContext(`
  var viewLevel = null;
  var design = { pieces: [] };
  var MAX_LEVEL = 5;
  ${lift("autoLevelAt")}
  ${lift("whatsUnder")}
`, sandbox);
const setPieces = ps => vm.runInContext(`design.pieces = ${JSON.stringify(ps)};`, sandbox);
const levelAt = (x, y, id) => vm.runInContext(`autoLevelAt(${x}, ${y}, byId[${JSON.stringify(id)}], 0)`, sandbox);

setPieces([]);
check(levelAt(0, 0, "vanguard-ciws") === 0, "on empty ground a piece lands on Ground");

// a 4x4 hesco platform, then drop a gun on it
const plat = [];
let pid = 1;
for (let x = -1.5; x <= 1.5; x++) for (let y = -1.5; y <= 1.5; y++)
  plat.push({ id: pid++, type: "hesco-tall", x, y, rot: 0, level: 0 });
setPieces(plat);
check(levelAt(0, 0, "vanguard-ciws") === 1, "dropped on a platform, the CIWS stacks to Level 2 by itself");
check(levelAt(40, 40, "vanguard-ciws") === 0, "dropped on open ground beside it, it stays on Ground");
check(vm.runInContext(`whatsUnder(0,0,byId["vanguard-ciws"],0).name`, sandbox) === "Hesco Block (Large)",
  "it can name what it's about to sit on");

// stacking a second storey keeps climbing
setPieces(plat.concat(plat.map((p, i) => ({ ...p, id: 100 + i, level: 1 }))));
check(levelAt(0, 0, "vanguard-ciws") === 2, "on a two-storey platform it goes to Level 3");

// focusing a storey overrides the automatic choice
vm.runInContext(`viewLevel = 3;`, sandbox);
check(levelAt(40, 40, "hesco-small") === 3, "with a storey focused, pieces are placed on that storey");
vm.runInContext(`viewLevel = null;`, sandbox);

// ---- UI wiring ----
// one storey is worked out once for the whole run, and every piece in it uses that
check(/const lvl = def\.isFob \? 0 : runLevel;/.test(src) && /type: placing, x: pt\.cx, y: pt\.cy, rot, level: lvl/.test(src),
  "a whole drag-run is placed on one storey");
// a run laid back over an existing one tops up the gaps instead of doubling the wall
check(/function occupied\(/.test(src) && /!occupied\(pt\.cx, pt\.cy, placing, lvl, rot\)/.test(src),
  "laying a run over one that is already there skips what exists");
check(/const runLevel = autoLevelAt\(d\.x0, d\.y0/.test(src), "the run's storey comes from where the drag started");
check(html.includes('id="levelStrip"'), "toolbar has the storey strip");
check(!/\bbuildLevel\b/.test(src), "the old build-level mode is fully gone");
check(/pageup/.test(src) && /pagedown/.test(src), "Page Up / Page Down still move between storeys");
check(html.includes('id="emptyState"'), "there's an empty state for a blank canvas");
const drawRect = src.match(/function drawRect\([\s\S]*?\n\}/)[0];
check(drawRect.indexOf("ctx.rotate(") < drawRect.indexOf("ctx.restore();") &&
      drawRect.indexOf("ctx.restore();") < drawRect.indexOf("ctx.drawImage("),
  "icon still drawn upright, outside the rotation");
/* The shadow moved out of drawRect into its own pass, because a shadow drawn per piece
   lands on whatever was drawn before it. This assertion used to look in drawRect and would
   still have passed on an unrelated `opt.level > 0` in the badge code, so it is pointed at
   the pass that actually does the work. */
check(/drops a shadow[\s\S]*?for \(const p of visible\) drawPiece\(/.test(src),
  "elevated pieces cast a shadow, in a pass that finishes before any body is drawn");

// ---- how somebody gets over a wall ----
// These two numbers encode a rule read off play rather than anything published, so they
// are exactly the sort of thing that gets corrected later. Pin them so a change is
// deliberate rather than accidental.
check(/const VAULT_HEIGHT = 1;/.test(src), "one block is vaultable on foot");
check(/const VEHICLE_CLIMB = 2;/.test(src), "two blocks can be crossed off a vehicle roof");
check(/capped \? "secure"/.test(src) && /"top-layer"/.test(src),
  "a Bremer cap counts as secure whatever is under it");
check(/if \(standingOn\) continue;/.test(src),
  "a stack is judged once, by the piece at the bottom of it");
check(/function computeClimb\(/.test(src) && /climbCache = null/.test(src),
  "the climb check is cached and cleared alongside the others");
check(/opt\.climb === "foot" \|\| opt\.climb === "vehicle"/.test(src) && /setLineDash/.test(src),
  "soft spots are dashed on the plan, not only counted in the panel");

/* ---- and the count is of ways in, not of blocks ----
   Two bugs the panel shipped with, both of which made the number useless on a real base:
   every block of a run was its own "section", and walls sealed inside a closed perimeter
   were counted as ways in alongside the perimeter itself. Run against the real code. */
vm.runInContext(
  // the geometry helpers come along because the reachability grid is built out of them
  [lift("rectAABB"), lift("aabbOverlap"), lift("buildIndex"), lift("neighbours"),
   lift("reachableFromOutside"), lift("climbRuns"), lift("computeClimb")].join("\n") +
  "\nvar GRID_CELL = " + src.match(/const GRID_CELL = (\d+);/)[1] + ";" +
  "\nvar HAIRLINE = " + src.match(/const HAIRLINE = ([\d.]+);/)[1] + ";" +
  "\nvar SEAM_EPS = " + src.match(/const SEAM_EPS = ([\d.]+);/)[1] + ";" +
  "\nvar VAULT_HEIGHT = 1; var VEHICLE_CLIMB = 2;" +
  "\nvar CLIMB_GRID = 0.5; var CLIMB_CELL_BUDGET = 4e6;" +
  "\nvar design = { pieces: [] };", sandbox);

const climbOf = pieces => {
  sandbox.design.pieces = pieces;
  return vm.runInContext("computeClimb()", sandbox);
};
{
  // a closed box of quads, with one wall standing on its own in the middle of the yard
  const P = [];
  let id = 1;
  const add = (type, x, y, rot = 0) => P.push({ id: id++, type, x, y, rot, level: 0 });
  for (let i = 0; i < 4; i++) {
    add("hesco-wall", -6 + i * 4, -8);            // north
    add("hesco-wall", -6 + i * 4, 8);             // south
    add("hesco-wall", -8, -6 + i * 4, 90);        // west
    add("hesco-wall", 8, -6 + i * 4, 90);         // east
  }
  const insideFrom = id;
  add("hesco-wall", 0, 0);                        // a wall in the courtyard
  const { verdict, runs } = climbOf(P);

  check(verdict.get(insideFrom) === "inside",
    "a wall sealed inside a closed perimeter is not a way in");
  check(runs.vehicle.length === 1,
    "a closed perimeter of 16 quads is one section, not sixteen",
    "got " + runs.vehicle.length);
  check(runs.vehicle[0] && runs.vehicle[0].length === 16,
    "and that one section holds every block of the run");
}
/* Capping a run with a Bremer has to actually change the verdict.
 *
 * There is a check further up asserting the source contains `capped ? "secure"` and the
 * string "top-layer". It passed for as long as the feature has existed, and the feature did
 * not work: computeClimb walked `cover` alone, and a Bremer's role is "barrier", so the cap
 * was never in the list to be seen. The panel told you to cap a wall with one and then went
 * on grading the capped wall vaultable on foot.
 *
 * A regex over the source cannot catch that, because the source really does say what it
 * says. Only running it can, so this runs it.
 */
{
  const run = capped => {
    const P = []; let id = 1;
    for (let i = -2; i <= 2; i++)
      P.push({ id: id++, type: "hesco-small", x: i, y: 0, rot: 0, level: 0 });
    if (capped) for (let i = -2; i <= 2; i++)
      P.push({ id: id++, type: "bremer-wall", x: i, y: 0, rot: 0, level: 1 });
    return climbOf(P);
  };
  const bare = run(false), cap = run(true);
  check(bare.runs.foot.length === 1,
    "a bare one block run is a way in on foot",
    "got " + bare.runs.foot.length);
  check(cap.runs.foot.length === 0,
    "and capping it with a Bremer stops it being one",
    "got " + cap.runs.foot.length);
  check(cap.runs.secure.length === 1,
    "and grades it secure, which is exactly what the panel tells you to do",
    "got " + cap.runs.secure.length);
}
{
  // knock a hole in it and the courtyard wall becomes reachable again
  const P = [];
  let id = 1;
  const add = (type, x, y, rot = 0) => P.push({ id: id++, type, x, y, rot, level: 0 });
  for (let i = 0; i < 4; i++) {
    if (i !== 1) add("hesco-wall", -6 + i * 4, -8);
    add("hesco-wall", -6 + i * 4, 8);
    add("hesco-wall", -8, -6 + i * 4, 90);
    add("hesco-wall", 8, -6 + i * 4, 90);
  }
  const courtyard = id;
  add("hesco-wall", 0, 0);
  check(climbOf(P).verdict.get(courtyard) === "vehicle",
    "leave a gap in the perimeter and what is behind it is a way in again");
}
{
  // barbed wire laid in front of a wall must not hide the wall from the check
  const P = [{ id: 1, type: "hesco-wall", x: 0, y: 0, rot: 0, level: 0 },
             { id: 2, type: "barbed-wire", x: -1, y: -1, rot: 0, level: 0 },
             { id: 3, type: "barbed-wire", x: 1, y: -1, rot: 0, level: 0 }];
  check(climbOf(P).verdict.get(1) === "vehicle",
    "ankle-height wire in front of a wall does not make the wall unreachable");
}

// ---- walls read as one wall ----
/* A player laying a perimeter drops quads and then wedges single blocks in to close the
   gaps. Those are one wall to them, and drawing a border down every join said otherwise.
   Bodies merge across the wall family; the name and the height badge still key off kin,
   the same buildable, so an odd block in the middle of a run does not go quiet. */
vm.runInContext(
  [lift("rectAABB"), lift("buildIndex"), lift("neighbours"),
   lift("seamFamily"), lift("computeSeams")].join("\n") +
  "\nvar GRID_CELL = " + src.match(/const GRID_CELL = (\d+);/)[1] + ";" +
  "\nvar HAIRLINE = " + src.match(/const HAIRLINE = ([\d.]+);/)[1] + ";" +
  "\nvar SEAM_EPS = " + src.match(/const SEAM_EPS = ([\d.]+);/)[1] + ";" +
  "\nvar design = { pieces: [] };", sandbox);

const seamsOf = pieces => {
  sandbox.design.pieces = pieces;
  return vm.runInContext("computeSeams()", sandbox);
};
{
  // a quad, a single block wedged against its end, and a bunker beyond that
  const quad = { id: "q", type: "hesco-wall", x: -2, y: 0, rot: 0 };
  const block = { id: "b", type: "hesco-small", x: 0.5, y: 0, rot: 0 };
  const bunker = { id: "k", type: "bunker", x: 3, y: 0, rot: 0 };
  const seams = seamsOf([quad, block, bunker]);
  const q = seams.get("q"), b = seams.get("b"), k = seams.get("k");
  check(!!q && (q.mask & 1) !== 0, "a quad joins the block wedged against it");
  check(!!b && (b.mask & 2) !== 0, "and the block joins the quad, so the run has no border down it");
  check(!!b && b.kin === 0, "a wedged block is nobody's kin, so it still states its own height");
  check(!k || (k.mask & 2) === 0, "a bunker touching a wall is not part of it");
}
{
  // the old rule has to survive: same buildable, same run
  const a = { id: "a", type: "hesco-small", x: 0.5, y: 0, rot: 0 };
  const b = { id: "b", type: "hesco-small", x: 1.5, y: 0, rot: 0 };
  const seams = seamsOf([a, b]);
  check((seams.get("a").mask & 1) !== 0 && (seams.get("a").kin & 1) !== 0,
    "two of the same block are still both merged and kin");
}
{
  // a level up is a different storey, not a longer wall
  const a = { id: "a", type: "hesco-small", x: 0.5, y: 0, rot: 0, level: 0 };
  const b = { id: "b", type: "hesco-small", x: 1.5, y: 0, rot: 0, level: 1 };
  check(seamsOf([a, b]).size === 0, "pieces on different storeys never merge");
}

// ---- the 3D view ----
// Depth order is the whole thing: get it wrong and far pieces draw over near ones, which
// is the bug this view exists to fix.
check(src.includes("(a.depth - b.depth) || (a.lvl - b.lvl)"),
  "boxes are sorted far to near, then by storey");
check(src.includes("if (view3d) return draw3DNow();"), "the renderer branches on the view");
check(src.includes("if (maxX < -8 || minX > W + 8"), "off-screen boxes are rejected before drawing");
check(src.includes("function pick3D") && src.includes("for (let i = boxes.length - 1; i >= 0; i--)"),
  "picking walks nearest first");
check(src.includes("3D is for looking, not building"), "3D does not try to place pieces");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);


