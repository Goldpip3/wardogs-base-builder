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
  const src = fs.readFileSync(path.join(ROOT, "tools/site/artillery-map.js"), "utf8");
  check(!/Math\.round\(m ?\/ ?cur\.step\)/.test(src),
    "the page does not snap the elevation to a round number the gun has no detent for");
  check(src.includes('"a measured point"'),
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

/* --- the grouping angle stays out ---
   It was carried for a while and converted to metres on every solution, every table row and
   both platform cards. One source published it, that source never said where it came from,
   the other two never mention dispersion, and the game deals in no such unit. The old check
   here proved the published spreads fall out of the MOA, which they do because the site
   that published both did the same multiplication: arithmetic, not observation, wearing the
   look of a verified number.

   So this checks the absence, on the built page as well as in the data, because the number
   was plausible and useful and that is exactly what gets a figure quietly put back. What
   replaces it is an open item saying nobody has measured the scatter, and how to. */
{
  const withMoa = A.platforms.filter(p => p.moa !== undefined);
  check(withMoa.length === 0, "no platform carries a grouping angle",
    withMoa.map(p => p.id).join(", "));

  const page = fs.readFileSync(path.join(ROOT, "docs/artillery/index.html"), "utf8");
  // The word is allowed: the open list has to be able to say what was taken out and why.
  // A figure is not. "50 MOA" or a Spread cell is the thing coming back.
  check(!/\d\s*MOA/.test(page), "the built page quotes no grouping angle");
  check(!/>\s*Spread\s*</i.test(page), "and offers no spread row, cell or column");

  const scatter = (A.open || []).find(o => /scatter|dispersion/i.test(o.what + " " + o.why));
  check(!!scatter && /measure the group|measure/i.test(scatter.close || ""),
    "the open list says the scatter is unmeasured and how to measure it");
}

/* --- the SPH-2 tables hold together as a pair of arcs ---
   Transcribed from one source and not yet fired against, which the data says out loud.
   What can be checked without the game is internal consistency: the two arcs meet at the
   turnover, the envelope is the tables' own reach, and the crossover the sources agree
   on is where the low arc actually starts. */
{
  const lo = sph.tableLow, hi = sph.tableHigh;
  check(Array.isArray(lo) && Array.isArray(hi) && lo.length > 40 && hi.length > 60,
    "the SPH-2 ships both arcs as tables");
  check(/wardogs-artillery/.test(sph.tableSource || "") && /unfired|not yet/.test(sph.tableSource || ""),
    "and says where they came from and that nobody here has fired them");

  let loMono = true;
  for (let i = 1; i < lo.length; i++)
    if (!(lo[i].mils > lo[i - 1].mils && lo[i].dist >= lo[i - 1].dist)) loMono = false;
  check(loMono, "the low arc is monotonic: more elevation is never less range");
  let hiMono = true;
  for (let i = 1; i < hi.length; i++)
    if (!(hi[i].mils > hi[i - 1].mils && hi[i].dist <= hi[i - 1].dist)) hiMono = false;
  check(hiMono, "the high arc is monotonic: more elevation is never more range");

  check(lo[0].dist === sph.lowArcFrom,
    "the low arc starts at the crossover the sources agree on",
    lo[0].dist + " vs " + sph.lowArcFrom);
  check(lo[lo.length - 1].dist === sph.maxRange && hi[0].dist === sph.maxRange,
    "both arcs peak at the stated maximum range, which is where the curve turns over");
  check(hi[hi.length - 1].dist === sph.minRange,
    "the stated minimum range is the high arc's own last row, not another source's");
  check(lo[0].mils === sph.minElevationMil && hi[hi.length - 1].mils === sph.maxElevationMil,
    "the elevation envelope is the tables' own ends");
  check(hi[0].mils - lo[lo.length - 1].mils === 10,
    "the arcs are one 10 mil step apart at the turnover, one curve split in two");
}

/* --- every measured SPH-2 row round trips, on its own arc ---
   The flat top repeats a distance across neighbouring rows, so the answer for one of
   those distances is any of its measured elevations, not a specific one. */
{
  const upDial = (d, t) => {
    if (!t || !t.length || d < t[0].dist || d > t[t.length - 1].dist) return null;
    for (let i = 0; i < t.length - 1; i++) {
      const a = t[i], b = t[i + 1];
      if (d >= a.dist && d <= b.dist) {
        const r = b.dist - a.dist;
        return a.mils + (r > 0 ? (d - a.dist) / r : 0) * (b.mils - a.mils);
      }
    }
    return null;
  };
  const milsFor = (t, d) => t.filter(r => r.dist === d).map(r => r.mils);
  const offLo = sph.tableLow
    .map(r => ({ r, got: Math.round(upDial(r.dist, sph.tableLow)) }))
    .filter(x => !milsFor(sph.tableLow, x.r.dist).includes(x.got));
  check(offLo.length === 0,
    `all ${sph.tableLow.length} low arc ranges give back a measured elevation for that range`,
    offLo.map(x => x.r.dist + "m wanted " + x.r.mils + " got " + x.got).join(", "));
  const offHi = sph.tableHigh
    .map(r => ({ r, got: Math.round(dial(r.dist, sph.tableHigh)) }))
    .filter(x => !milsFor(sph.tableHigh, x.r.dist).includes(x.got));
  check(offHi.length === 0,
    `all ${sph.tableHigh.length} high arc ranges give back a measured elevation for that range`,
    offHi.map(x => x.r.dist + "m wanted " + x.r.mils + " got " + x.got).join(", "));
  check(dial(sph.minRange - 1, sph.tableHigh) === null &&
    upDial(sph.maxRange + 1, sph.tableLow) === null,
    "outside the envelope neither arc offers a solution");
  check(A.dispute && /3\.1 km|3100/.test(A.dispute.detail),
    "the contested mortar range is stated on the page rather than quietly resolved");
}

/* --- the map data is inside its own fences ---
   A tower or a spawn drawn outside the playable bounds would mean a transcription slip,
   the exact class of error hand-copied coordinates invite. */
{
  const M = JSON.parse(fs.readFileSync(path.join(ROOT, "data/artillery-maps.json"), "utf8"));
  check(M.maps.length === 2 && M.maps.every(m => m.id && m.name && m.bounds && m.extentUnits),
    "both terrains are present with bounds and an extent");
  const outside = [];
  for (const m of M.maps) {
    const b = m.bounds;
    const inB = p => p.x >= b.minX && p.x <= b.maxX && p.y >= b.minY && p.y <= b.maxY;
    if (!(b.minX >= 0 && b.maxX <= m.extentUnits && b.minY >= 0 && b.maxY <= m.extentUnits))
      outside.push(m.id + " bounds exceed extent");
    for (const t of m.towers) if (!inB(t)) outside.push(m.id + " " + t.label);
    for (const z of m.spawns) for (const p of z.points)
      if (!inB(p)) outside.push(m.id + " " + z.label + " corner");
  }
  check(outside.length === 0, "every tower and spawn corner sits inside its map's bounds",
    outside.join(", "));

  /* Every map is the same game coordinate space. artillery.json calls the terrain 163.84
     units square and both terrains are calibrated into that one box. Ozeti shipped at
     327.68 once, inferred from an unrelated w/h field on another site's map file, which
     puts the grid and any terrain imagery at half scale: the kind of wrong that still
     draws, so nothing complains and every reading is quietly out. */
  const wrongExtent = M.maps.filter(m => m.extentUnits !== A.grid.extent);
  check(wrongExtent.length === 0,
    `every map uses the game's own ${A.grid.extent} unit coordinate space`,
    wrongExtent.map(m => m.id + " says " + m.extentUnits).join(", "));

  /* The control zone is the ring the match is fought inside, and the towers are the
     objectives inside it. That relationship is the whole point of drawing either, so it is
     the thing to pin: a zone that has drifted off its towers still draws a perfectly
     convincing circle in the wrong place. Both figures were measured off another site's
     rendering rather than read out of the game, which is why they are worth a check. */
  const zoneBad = [];
  for (const m of M.maps) {
    const z = m.controlZone;
    if (!z || !z.centre || !z.radiusMetres) { zoneBad.push(m.id + " has no control zone"); continue; }
    const b = m.bounds;
    if (z.centre.x < b.minX || z.centre.x > b.maxX || z.centre.y < b.minY || z.centre.y > b.maxY)
      zoneBad.push(m.id + " zone centre is outside the playable bounds");
    const rUnits = z.radiusMetres / A.grid.unitMetres;
    for (const t of m.towers) {
      const d = Math.hypot(t.x - z.centre.x, t.y - z.centre.y);
      if (d > rUnits)
        zoneBad.push(m.id + " " + t.label + " is " + Math.round((d - rUnits) * A.grid.unitMetres) + " m outside");
    }
  }
  check(zoneBad.length === 0,
    "every tower on both maps sits inside its own control zone", zoneBad.join(", "));

  /* A radius nobody has read in game must not quietly become a fact. */
  const unlabelled = M.maps.filter(m => m.controlZone && m.controlZone.confirmed !== false);
  check(unlabelled.length === 0,
    "the control zone radius is still marked unconfirmed, because it was measured not read",
    unlabelled.map(m => m.id).join(", "));
  check(/wardogs-artillery/.test(M.source || "") || /wardogs-artillery/.test(M._note || ""),
    "the map file names where its positions came from");

  /* Terrain imagery is optional and no map carries it yet. The renderer is proven and
     dormant, so the failure this guards is the drop-in going wrong quietly: a tiles block
     missing a field draws nothing at all, and a vector map that lost its imagery looks
     exactly like a vector map that never had any. */
  const withTiles = M.maps.filter(m => m.tiles);
  const badTiles = [];
  for (const m of withTiles) {
    const t = m.tiles;
    for (const k of ["path", "tileSize", "minZoom", "maxZoom", "extension"])
      if (t[k] === undefined || t[k] === null || t[k] === "") badTiles.push(m.id + " has no " + k);
    if (typeof t.path === "string" && !t.path.startsWith("/"))
      badTiles.push(m.id + " tile path is not site absolute");
    if (typeof t.extension === "string" && t.extension.startsWith("."))
      badTiles.push(m.id + " tile extension carries its own dot");
    if (Number(t.maxZoom) < Number(t.minZoom)) badTiles.push(m.id + " zoom range is inverted");
    const dir = path.join(ROOT, "docs", String(t.path || "").replace(/^\//, ""));
    if (!fs.existsSync(dir)) badTiles.push(m.id + " tile path is not in docs/: " + t.path);
  }
  check(badTiles.length === 0,
    withTiles.length
      ? `all ${withTiles.length} tiled map(s) declare a complete, present pyramid`
      : "no map claims terrain imagery yet, and the renderer stays dormant",
    badTiles.join(", "));
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
