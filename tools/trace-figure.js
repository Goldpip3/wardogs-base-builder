/* Turn assets/reference/hit-zones.jpg into the hit-zone paths in tools/site/pages/ballistics.js.
 *
 * Run by hand, never in the build, like pull-game-icons.js. It needs ffmpeg on PATH to decode
 * the jpeg and it prints the FIGURE block for you to paste; it does not write the page.
 *
 *   node tools/trace-figure.js
 *
 * Why this exists rather than a hand-drawn figure: five attempts at copying that picture by
 * eye all came out wrong, because the shapes were being described rather than measured. The
 * plates in the reference are separated by black seams on a black ground, so each one is its
 * own connected component and the artwork can simply be read.
 *
 * The steps, and the reason for each:
 *   threshold    the background and the seams sit at 0 to 2, the plates at 86 and up
 *   label        8-connected flood fill, one component per plate
 *   split        head and neck touch and arrive as one component, so they are cut on
 *                brightness at y306: the neck is the bright band under the jaw
 *   open         a 3x3 erode then dilate, which takes off the one pixel bevel highlights
 *                that otherwise put a zigzag in the traced outline
 *   trace        Moore neighbour boundary walk
 *   simplify     Douglas-Peucker at 2.2px, run on two halves of the ring rather than the
 *                whole of it: a closed ring measured against its own start and end has a
 *                zero length baseline and collapses to two points
 *   scale        into the 200 x 446 viewBox, left side only, since the page mirrors it
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "assets/reference/hit-zones.jpg");
const RAW = path.join(require("os").tmpdir(), "wardogs-hit-zones.gray");
const W = 1008, H = 1046, T = 45, NECK_Y = 306;
const CX = 475, TOP = 211, BOT = 994, S = 426 / (BOT - TOP);

execFileSync("ffmpeg", ["-y", "-v", "error", "-i", SRC, "-pix_fmt", "gray", "-f", "rawvideo", RAW]);
const g = fs.readFileSync(RAW);
if (g.length !== W * H) throw new Error("reference is not " + W + "x" + H + "; update the constants");

const lab = new Int32Array(W * H); let next = 1; const comps = []; const stack = new Int32Array(W * H);
for (let i = 0; i < W * H; i++) {
  if (g[i] <= T || lab[i]) continue;
  let sp = 0; stack[sp++] = i; lab[i] = next; const px = [];
  while (sp) {
    const p = stack[--sp]; const x = p % W, y = (p - x) / W; px.push(p);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const q = ny * W + nx;
      if (g[q] > T && !lab[q]) { lab[q] = next; stack[sp++] = q; }
    }
  }
  comps.push(px); next++;
}
const box = px => {
  let a = W, b = 0, c = H, d = 0;
  px.forEach(p => { const x = p % W, y = (p - x) / W; if (x < a) a = x; if (x > b) b = x; if (y < c) c = y; if (y > d) d = y; });
  return { px, minx: a, maxx: b, miny: c, maxy: d, area: px.length };
};
let plates = comps.filter(px => px.length > 300).map(box);
const head = plates.slice().sort((p, q) => p.miny - q.miny)[0];
plates = plates.filter(p => p !== head)
  .concat([box(head.px.filter(p => Math.floor(p / W) < NECK_Y)),
           box(head.px.filter(p => Math.floor(p / W) >= NECK_Y))]);

function open(px) {
  let set = new Set(px); const at = (x, y) => set.has(y * W + x);
  const er = new Set();
  for (const p of set) {
    const x = p % W, y = (p - x) / W; let all = true;
    for (let dy = -1; dy <= 1 && all; dy++) for (let dx = -1; dx <= 1; dx++) if (!at(x + dx, y + dy)) { all = false; break; }
    if (all) er.add(p);
  }
  const di = new Set();
  for (const p of er) {
    const x = p % W, y = (p - x) / W;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < W && ny < H) di.add(ny * W + nx);
    }
  }
  return [...di];
}

const N = [[-1, 0], [-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1]];
function trace(px) {
  const set = new Set(px); const has = (x, y) => set.has(y * W + x);
  let sx = 0, sy = 1e9;
  for (const p of px) { const x = p % W, y = (p - x) / W; if (y < sy || (y === sy && x < sx)) { sy = y; sx = x; } }
  let bx = sx, by = sy, back = 0; const pts = [[bx, by]]; let guard = 0;
  do {
    let found = false;
    for (let k = 1; k <= 8; k++) {
      const idx = (back + k) % 8, nx = bx + N[idx][0], ny = by + N[idx][1];
      if (has(nx, ny)) { back = (idx + 4) % 8; bx = nx; by = ny; pts.push([bx, by]); found = true; break; }
    }
    if (!found || ++guard > 300000) break;
  } while (!(bx === sx && by === sy));
  return pts;
}
function dp(pts, eps) {
  if (pts.length < 3) return pts;
  let mi = 0, md = 0;
  const [ax, ay] = pts[0], [bx, by] = pts[pts.length - 1];
  const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy);
  for (let i = 1; i < pts.length - 1; i++) {
    const d = len < 1e-9 ? Math.hypot(pts[i][0] - ax, pts[i][1] - ay)
      : Math.abs((pts[i][0] - ax) * dy - (pts[i][1] - ay) * dx) / len;
    if (d > md) { md = d; mi = i; }
  }
  if (md <= eps) return [pts[0], pts[pts.length - 1]];
  return dp(pts.slice(0, mi + 1), eps).slice(0, -1).concat(dp(pts.slice(mi), eps));
}
const X = x => +(100 + (x - CX) * S).toFixed(1);
const Y = y => +(10 + (y - TOP) * S).toFixed(1);
function pathOf(px, eps) {
  let pts = trace(open(px));
  if (pts.length > 2) { const a = pts[0], b = pts[pts.length - 1]; if (a[0] === b[0] && a[1] === b[1]) pts.pop(); }
  let m = 0, md = -1;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - pts[0][0], pts[i][1] - pts[0][1]);
    if (d > md) { md = d; m = i; }
  }
  const ring = dp(pts.slice(0, m + 1), eps).slice(0, -1)
    .concat(dp(pts.slice(m).concat([pts[0]]), eps).slice(0, -1));
  return "M" + ring.map((p, i) => (i ? "L" : "") + X(p[0]) + " " + Y(p[1])).join("") + "Z";
}

const at = p => ({ p, cx: (p.minx + p.maxx) / 2, cy: (p.miny + p.maxy) / 2 });
const marked = plates.map(at);
const pick = (side, a, b) => marked
  .filter(m => (side === "C" ? Math.abs(m.cx - CX) <= 20 : m.cx < CX - 20) && m.cy >= a && m.cy <= b)
  .sort((x, y) => x.cy - y.cy).map(m => m.p);

const ZONES = [
  ["head", pick("C", 200, 300)], ["neck", pick("C", 301, 340)],
  ["upper-torso", pick("C", 341, 420)], ["middle-torso", pick("C", 421, 500)],
  ["lower-torso", pick("C", 501, 560)], ["pelvis", pick("C", 561, 620)],
  ["upper-arm", pick("L", 340, 500)], ["lower-arm", pick("L", 501, 570)],
  ["hand", pick("L", 571, 660)], ["upper-leg", pick("L", 661, 760)],
  ["lower-leg", pick("L", 761, 900)], ["foot", pick("L", 901, 1000)],
];
let bad = 0;
for (const [id, ps] of ZONES) if (!ps.length) { console.error("no plate found for " + id); bad++; }
const out = ZONES.map(([id, ps]) =>
  '    ["' + id + '", [' + ps.map(p => '"' + pathOf(p.px, 2.2) + '"').join(",\n      ") + "]],");
console.log(out.join("\n"));
console.error("\n" + (ZONES.length - bad) + " of " + ZONES.length +
  " zones traced. Paste the block above over FIGURE in tools/site/pages/ballistics.js.");
process.exit(bad ? 1 : 0);
