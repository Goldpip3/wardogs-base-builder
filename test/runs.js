/* Laying a run: do the pieces actually touch?
 *
 * A run used to lock to horizontal or vertical and space the pieces by their axis-aligned
 * bounding box. For a piece turned forty five degrees that box is its corner-to-corner
 * width, so a diagonal drag produced a line of diamonds meeting at their points with gaps
 * between them. Reported, correctly, as the blocks not clicking together.
 *
 * The measure here is the gap between neighbours along the run: the distance between two
 * centres, minus how much of each piece lies along that direction. Zero means flush.
 */
const ROOT = require("path").resolve(__dirname, "..");
const fs = require("fs"), vm = require("vm"), path = require("path");

let pass = 0, fail = 0;
const check = (ok, label, detail) => {
  console.log((ok ? "PASS  " : "FAIL  ") + label + (ok || !detail ? "" : ": " + detail));
  ok ? pass++ : fail++;
};

const html = fs.readFileSync(path.join(ROOT, "WardogsBaseBuilder.html"), "utf8");
const src = html.slice(html.indexOf("<script>"), html.lastIndexOf("</script>"));
function lift(name) {
  const start = src.indexOf("function " + name + "(");
  if (start < 0) throw new Error("missing " + name);
  let depth = 0, started = false;
  for (let j = src.indexOf("{", start); j < src.length; j++) {
    if (src[j] === "{") { depth++; started = true; }
    else if (src[j] === "}") { depth--; if (started && depth === 0) return src.slice(start, j + 1); }
  }
}
const catStart = src.indexOf("const CATALOG_DEFAULT = ") + "const CATALOG_DEFAULT = ".length;
const catalog = JSON.parse(src.slice(catStart, src.indexOf(";\nconst ICONS")));
const byId = {};
for (const b of catalog.buildables) byId[b.id] = b;

const sb = { console, Math, byId, STAMP_MAX: 300, placing: null, ghost: { rot: 0 } };
vm.createContext(sb);
vm.runInContext(lift("stampPositions"), sb);

const run = (type, rotDeg, dirDeg, length) => {
  sb.placing = type;
  sb.ghost = { rot: rotDeg };
  const r = (dirDeg * Math.PI) / 180;
  return vm.runInContext("stampPositions(" + JSON.stringify({
    x0: 0, y0: 0,
    x1: Math.cos(r) * length, y1: Math.sin(r) * length,
  }) + ")", sb);
};

/* How much of a w by d piece, turned by rot, lies along a direction: w|cos t| + d|sin t|
   with t the angle between them. Two neighbours are flush when the distance between their
   centres equals that. */
const extentAlong = (def, rotDeg, dirDeg) => {
  const t = ((dirDeg - rotDeg) * Math.PI) / 180;
  return def.footprint.w * Math.abs(Math.cos(t)) + def.footprint.d * Math.abs(Math.sin(t));
};
const worstGap = (type, rotDeg, dirDeg, length) => {
  const pts = run(type, rotDeg, dirDeg, length);
  const def = byId[type];
  const want = extentAlong(def, rotDeg, dirDeg);
  let worst = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i].cx - pts[i - 1].cx, pts[i].cy - pts[i - 1].cy);
    worst = Math.max(worst, Math.abs(d - want));
  }
  return { worst, count: pts.length };
};

/* --- square-on runs, which always worked and must keep working --- */
for (const [label, rot, dir] of [
  ["a straight wall left to right", 0, 0],
  ["a straight wall top to bottom", 0, 90],
  ["a turned wall laid along its own length", 90, 90],
]) {
  const g = worstGap("hesco-wall", rot, dir, 12);
  check(g.worst < 1e-9 && g.count > 3, label + " sits flush",
    g.count + " pieces, worst gap " + g.worst.toFixed(4));
}

/* --- the diagonal case that was reported --- */
{
  const g = worstGap("hesco-small", 45, 45, 10);
  console.log("  1x1 turned 45, dragged 45: " + g.count + " pieces, worst gap " + g.worst.toFixed(4));
  check(g.worst < 1e-9 && g.count > 3,
    "a turned block dragged along its own diagonal sits flush, not corner to corner");
}
{
  const g = worstGap("hesco-wall", 45, 45, 16);
  check(g.worst < 1e-9 && g.count > 3,
    "and so does a 4x1 wall turned to match the drag",
    g.count + " pieces, worst gap " + g.worst.toFixed(4));
}

/* --- a square-on piece dragged diagonally steps by its own diagonal --- */
{
  const pts = run("hesco-small", 0, 45, 10);
  const d = Math.hypot(pts[1].cx - pts[0].cx, pts[1].cy - pts[0].cy);
  check(Math.abs(d - Math.SQRT2) < 1e-9,
    "an unturned block dragged diagonally steps corner to corner, which is correct for it",
    "step " + d.toFixed(4));
}

/* --- all eight directions are reachable, not just two --- */
{
  const dirs = [0, 45, 90, 135, 180, 225, 270, 315];
  const ends = dirs.map(a => {
    const p = run("hesco-small", 0, a, 6);
    const last = p[p.length - 1];
    return Math.round(Math.atan2(last.cy, last.cx) * 180 / Math.PI + 360) % 360;
  });
  const distinct = new Set(ends).size;
  check(distinct === 8, "a drag can run in eight directions, not the old two",
    "got " + distinct + " distinct: " + ends.join(", "));
}

/* --- and a drag that goes nowhere still places one piece --- */
{
  sb.placing = "hesco-small"; sb.ghost = { rot: 0 };
  const one = vm.runInContext("stampPositions({x0:2,y0:3,x1:2,y1:3})", sb);
  check(one.length === 1 && one[0].cx === 2 && one[0].cy === 3,
    "a click with no drag is still exactly one piece where you clicked");
}

/* --- and the snap that quantises where a click lands ---
 *
 * The run spacing above was right and diagonal walls still came out ragged, because every
 * click was rounded to the world half-cell grid before the run ever saw it. A 1x1 turned
 * forty five degrees needs 0.707 steps to meet its neighbour and 0.707 is not on that grid,
 * so each block sat about an eighth of a cell out. That is the gap that was reported.
 */
const sbSnap = { console, Math, snap: true };
vm.createContext(sbSnap);
vm.runInContext(lift("snapVal") + "\n" + lift("snapPoint"), sbSnap);
const snapAt = (x, y, rot) =>
  vm.runInContext("snapPoint(" + x + "," + y + "," + rot + ")", sbSnap);

/* square-on placement must be untouched: the rotated lattice is the world lattice there */
{
  let worst = 0;
  for (const rot of [0, 90, 180, 270])
    for (const v of [0, 0.2, 0.49, 0.51, 1.3, -2.7, 7.9]) {
      const s = snapAt(v, v + 0.3, rot);
      worst = Math.max(worst,
        Math.abs(s.x - Math.round(v * 2) / 2),
        Math.abs(s.y - Math.round((v + 0.3) * 2) / 2));
    }
  check(worst < 1e-9, "a square-on piece snaps exactly where it always did", "off by " + worst);
}

/* a turned piece lands on a lattice its own neighbours share */
{
  const step = Math.SQRT1_2;                       // 1x1 at 45 degrees, centre to centre
  const jitter = [0, 0.14, -0.13, 0.09, -0.16, 0.11, -0.07, 0.15];
  let worstNew = 0, worstOld = 0;
  for (let i = 0; i < jitter.length; i++) {
    const wx = i * step + jitter[i], wy = i * step - jitter[i];
    const s = snapAt(wx, wy, 45);
    worstNew = Math.max(worstNew, Math.hypot(s.x - i * step, s.y - i * step));
    worstOld = Math.max(worstOld,
      Math.hypot(Math.round(wx * 2) / 2 - i * step, Math.round(wy * 2) / 2 - i * step));
  }
  check(worstNew < 1e-9,
    "a hand-placed 45 degree block lands exactly on the line its neighbours are on",
    "off by " + worstNew.toFixed(4));
  check(worstOld > 0.1,
    "and this check would have caught the bug: the world grid put it " +
    worstOld.toFixed(2) + " of a cell out");
}

/* the whole reported wall: eight clicks down a diagonal, no gap anywhere */
{
  const step = Math.SQRT1_2, pts = [];
  for (let i = 0; i < 8; i++)
    pts.push(snapAt(i * step + (i % 3 - 1) * 0.12, i * step + (i % 2 ? 0.1 : -0.1), 45));
  let worst = 0;
  for (let i = 1; i < pts.length; i++)
    worst = Math.max(worst,
      Math.abs(Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y) - 1));
  check(worst < 1e-9, "eight blocks clicked down a diagonal make one wall with no gaps",
    "worst gap " + worst.toFixed(4));
}

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
