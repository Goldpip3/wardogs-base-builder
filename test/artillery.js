/* The firing solution, checked against the table it is built from.
 *
 * The one guard that matters here: asking for a range that IS a row in the firing table has
 * to give back that row's elevation. The calculator this table came from rounds the answer
 * to the nearest fifty mils, and the table's own elevations are 290, 340, 390 and so on, so
 * it answers 500 for a 500 m shot whose measured elevation is 490. That moves the answer off
 * a point somebody measured and onto one nobody has fired.
 */
const ROOT = require("path").resolve(__dirname, "..");
const fs = require("fs"), path = require("path");

let pass = 0, fail = 0;
const check = (ok, label, detail) => {
  console.log((ok ? "PASS  " : "FAIL  ") + label + (ok || !detail ? "" : ": " + detail));
  ok ? pass++ : fail++;
};

const A = JSON.parse(fs.readFileSync(path.join(ROOT, "data/artillery.json"), "utf8"));
const mortar = A.platforms.find(p => p.id === "l81-mortar");
const sph = A.platforms.find(p => p.id === "sph-2");

/* the same interpolation the page ships */
function dial(d, t) {
  if (!t || !t.length || d > t[0].dist) return null;
  for (let i = 0; i < t.length - 1; i++) {
    const a = t[i], b = t[i + 1];
    if (d <= a.dist && d >= b.dist) {
      const r = a.dist - b.dist;
      return a.mils + (r > 0 ? (a.dist - d) / r : 0) * (b.mils - a.mils);
    }
  }
  return null;
}
const spread = (d, moa) => d * (moa / 60) * Math.PI / 180;

/* --- the table has to be usable as a table --- */
{
  const t = mortar.table;
  let mono = true;
  for (let i = 1; i < t.length; i++) {
    if (!(t[i].mils > t[i - 1].mils && t[i].dist < t[i - 1].dist)) mono = false;
  }
  check(mono, "the firing table is monotonic: more elevation is always less range");
  check(t[0].dist === mortar.maxRange && t[t.length - 1].dist === mortar.minRange,
    "the stated envelope is the table's own ends, not another source's",
    t[t.length - 1].dist + " to " + t[0].dist + " vs " + mortar.minRange + " to " + mortar.maxRange);
}

/* --- every measured row round trips exactly --- */
{
  const off = mortar.table
    .map(r => ({ r, got: Math.round(dial(r.dist, mortar.table)) }))
    .filter(x => x.got !== x.r.mils);
  check(off.length === 0, `all ${mortar.table.length} measured ranges give back their own elevation`,
    off.map(x => x.r.dist + "m wanted " + x.r.mils + " got " + x.got).join(", "));
}

/* --- and the page does not round that answer away --- */
{
  const src = fs.readFileSync(path.join(ROOT, "tools/site/pages/artillery.js"), "utf8");
  check(!/Math\.round\(m ?\/ ?cur\.step\)/.test(src),
    "the page does not snap the elevation to a round number the gun has no detent for");
  check(/onTable\?'a measured point'/.test(src),
    "and it says whether the answer is measured or interpolated");
}

/* --- interpolation stays inside the bracketing rows --- */
{
  let bad = 0;
  for (let d = mortar.minRange; d <= mortar.maxRange; d += 7) {
    const m = dial(d, mortar.table);
    if (m === null || m < mortar.table[0].mils || m > mortar.table[mortar.table.length - 1].mils) bad++;
  }
  check(bad === 0, "every range in the envelope returns an elevation inside the table's own bounds");
  check(dial(mortar.maxRange + 1, mortar.table) === null, "past maximum range there is no solution");
}

/* --- spread is the published relationship, not a guess ---
   Four spreads are published against these two guns. All four have to fall out of
   range times the grouping angle, or the angle is not what the sources say it is. */
{
  const cases = [
    [mortar, 132, 1.9], [mortar, 684, 9.9],
    [sph, 1000, 2.9], [sph, 2629, 7.6],
  ];
  const off = cases.filter(([p, d, want]) => Math.abs(spread(d, p.moa) - want) > 0.1);
  check(off.length === 0, "spread reproduces all four published figures from the MOA alone",
    off.map(([p, d, w]) => p.id + "@" + d + " wanted " + w + " got " + spread(d, p.moa).toFixed(2)).join(", "));
}

/* --- nothing was invented for the gun that has no table --- */
{
  check(sph.table === null, "the SPH-2 ships no elevation table, because none is published");
  check(sph.minRange && sph.maxRange && sph.minElevationMil && sph.maxElevationMil,
    "but its envelope is stated, since that much is known");
  check(A.dispute && /3\.1 km|3100/.test(A.dispute.detail),
    "the contested mortar range is stated on the page rather than quietly resolved");
}

/* --- an open question that does not say how to close it is just a complaint ---
   This list is the handoff between sessions and it is rendered on the page, so it has to
   stay actionable rather than becoming a shrug. */
{
  const bad = (A.open || []).filter(o => !o.what || !o.why || !o.close || o.close.length < 25);
  check((A.open || []).length > 0 && bad.length === 0,
    `all ${(A.open || []).length} open questions say what would close them`,
    bad.map(o => o.what).join(", "));
  const page = fs.readFileSync(path.join(ROOT, "docs/artillery/index.html"), "utf8");
  check(A.open.every(o => page.includes(o.what.replace(/'/g, "&#39;"))),
    "and every one of them is on the page, not just in the repo");
}

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
