const ROOT = require("path").resolve(__dirname, "..");
// Equivalence test for the rewritten issue checker.
// The grid-indexed computeIssues() that ships must report exactly what the old
// all-pairs version reported, on randomised designs full of edge cases.
const fs = require("fs"), vm = require("vm");
const PROJ = ROOT + "/";
const html = fs.readFileSync(PROJ + "WardogsBaseBuilder.html", "utf8");
const src = html.slice(html.indexOf("<script>"), html.lastIndexOf("</script>"));

function lift(name) {
  const start = src.indexOf("function " + name + "(");
  if (start < 0) throw new Error("missing " + name);
  let depth = 0, started = false;
  for (let j = src.indexOf("{", start); j < src.length; j++) {
    if (src[j] === "{") { depth++; started = true; }
    else if (src[j] === "}") { depth--; if (started && depth === 0) return src.slice(start, j + 1); }
  }
  throw new Error("unterminated " + name);
}
const catStart = src.indexOf("const CATALOG_DEFAULT = ") + "const CATALOG_DEFAULT = ".length;
const catalog = JSON.parse(src.slice(catStart, src.indexOf(";\nconst ICONS")));
const byId = {};
for (const b of catalog.buildables) byId[b.id] = b;
byId["__fob__"] = { id: "__fob__", name: "FOB", footprint: { w: 3, d: 3 }, height: 2,
                    isFob: true, requiresFob: false, tags: ["fob"] };

const sb = { console, byId, Math, Map, Set, JSON, Array, Object, Infinity };
vm.createContext(sb);
vm.runInContext([
  "var design = { pieces: [] };",
  "var GRID_CELL = 8;",
  "function levelName(l){ return l === 0 ? 'Ground' : 'Level ' + (l+1); }",
  "function insideFobZone(){ return true; }",
  "var SEAM_EPS = 0.06;",
  "var HAIRLINE = 0.4;",
  lift("pieceRect"), lift("rectCorners"), lift("rectAABB"), lift("aabbOverlap"),
  lift("rectsOverlap"), lift("canOverlay"), lift("buildIndex"), lift("neighbours"),
  lift("touches"), lift("seamFamily"), lift("wallGap"), lift("hairlineGap"),
  lift("computeIssues"),
].join("\n"), sb);

// faithful transcription of the previous all-pairs implementation, every rule
vm.runInContext([
  "function computeIssuesOld() {",
  "  const issues = [], P = design.pieces;",
  "  const fobs = P.filter(p => p.type === '__fob__');",
  "  const needFob = [];",
  "  for (const p of P) {",
  "    const def = byId[p.type]; if (!def) continue;",
  "    if (def.requiresFob !== false && !def.isFob) {",
  "      if (!fobs.length) needFob.push(p);",
  "      else if (!insideFobZone(p)) issues.push(def.name + ': outside every FOB build zone|' + p.id);",
  "    }",
  "    if (def.tags && def.tags.includes('ground-only') && (p.level||0) > 0)",
  "      issues.push(def.name + ': must be placed on the ground|' + p.id);",
  "    if (def.tags && def.tags.includes('no-stack') && (p.level||0) > 0)",
  "      issues.push(def.name + ': cannot be stacked|' + p.id);",
  "  }",
  "  for (let i = 0; i < P.length; i++) for (let j = i+1; j < P.length; j++) {",
  "    const a = P[i], b = P[j];",
  "    if ((a.level||0) !== (b.level||0)) continue;",
  "    if (a.type === '__fob__' || b.type === '__fob__') continue;",
  "    const da = byId[a.type], db = byId[b.type]; if (!da || !db) continue;",
  "    if (canOverlay(da, db) || canOverlay(db, da)) continue;",
  "    if (rectsOverlap(pieceRect(a), pieceRect(b))) {",
  "      issues.push(da.name + ' vs ' + db.name + ': overlap on level ' + ((a.level||0)+1) + '|' + b.id);",
  "      continue;",
  "    }",
  "    if (seamFamily(da) !== seamFamily(db)) continue;",
  "    const g = hairlineGap(rectAABB(pieceRect(a)), rectAABB(pieceRect(b)));",
  "    if (g) issues.push(da.name + ' vs ' + db.name + ': ' + g.toFixed(2) +",
  "      ' of a cell apart, so the run breaks here. Align to grid closes it|' + a.id);",
  "  }",
  "  for (const p of P) {",
  "    const lvl = p.level || 0; if (lvl === 0) continue;",
  "    const def = byId[p.type]; if (!def) continue;",
  "    const supported = P.some(q => q !== p && (q.level||0) < lvl && rectsOverlap(pieceRect(p), pieceRect(q)));",
  "    if (!supported) issues.push(def.name + ': nothing underneath to stand on at ' + levelName(lvl) + '|' + p.id);",
  "  }",
  "  for (const brem of P) {",
  "    const bd = byId[brem.type];",
  "    if (!bd || !(bd.tags||[]).includes('top-layer')) continue;",
  "    for (const p of P) {",
  "      if (p === brem || (p.level||0) <= (brem.level||0)) continue;",
  "      if (rectsOverlap(pieceRect(p), pieceRect(brem)))",
  "        issues.push(byId[p.type].name + \": can't build on top of a Bremer Wall|\" + p.id);",
  "    }",
  "  }",
  "  for (const sky of P) {",
  "    const sd = byId[sky.type];",
  "    if (!sd || !(sd.tags||[]).includes('needs-sky')) continue;",
  "    for (const p of P) {",
  "      if (p === sky || (p.level||0) <= (sky.level||0)) continue;",
  "      if (rectsOverlap(pieceRect(p), pieceRect(sky)))",
  "        issues.push(sd.name + ': blocked from the sky by ' + byId[p.type].name + '|' + sky.id);",
  "    }",
  "  }",
  "  if (needFob.length) issues.unshift('No FOB placed. ' + needFob.length + ' piece' + (needFob.length===1?'':'s') + ' need one|');",
  "  return issues;",
  "}",
].join("\n"), sb);

/* ---- a gap you cannot see ----
   Two walls a tenth of a cell apart look joined at any zoom worth building at, and are
   not. The plan draws two runs, which is honest, and reads as a bug because nothing says
   why. The distance gets named instead. Checked here rather than in the equivalence loop
   because randomised designs rarely land a pair inside a tenth of a cell of each other. */
let hairPass = 0, hairFail = 0;
const hcheck = (ok, label, detail) => {
  console.log((ok ? "PASS  " : "FAIL  ") + label + (ok || !detail ? "" : ": " + detail));
  ok ? hairPass++ : hairFail++;
};
{
  const gapsIn = pieces => {
    sb.design.pieces = pieces;
    return sb.computeIssues().filter(i => /of a cell apart/.test(i.text));
  };
  const at = (id, x) => ({ id, type: "hesco-tall", x, y: 0, rot: 0, level: 0 });
  const hair = gapsIn([at(1, 0), at(2, 1.12)]);
  hcheck(hair.length === 1 && /0.12 of a cell apart/.test(hair[0].text),
    "a wall a tenth of a cell short of the next one is called out, with the distance",
    hair.map(i => i.text).join(" | ") || "nothing reported");
  hcheck(gapsIn([at(1, 0), at(2, 1)]).length === 0, "walls that actually meet are not complained about");
  hcheck(gapsIn([at(1, 0), at(2, 2.5)]).length === 0, "and a gap somebody meant is left alone");
  // 6.9..7.9 and 8.02..9.02: either side of the GRID_CELL 8 line, and a hair apart
  const across = gapsIn([{ id: 1, type: "hesco-tall", x: 7.4, y: 0, rot: 0, level: 0 },
                         { id: 2, type: "hesco-tall", x: 8.52, y: 0, rot: 0, level: 0 }]);
  hcheck(across.length === 1, "including a pair that straddles a spatial index boundary",
    across.length + " reported");
  /* Squaring up the two blocks either side of the gap only moves it along one place, so
     the complaint carries every piece of the run it broke and clicking it selects them all. */
  const whole = gapsIn([at(1, 0), at(2, 1), at(3, 2), at(4, 3.12), at(5, 4.12)]);
  hcheck(whole.length === 1 && whole[0].ids && whole[0].ids.length === 5,
    "and it carries the whole run, so one Align to grid closes every gap in it",
    whole[0] && whole[0].ids ? whole[0].ids.join(",") : "no ids");
  const mixed = gapsIn([at(1, 0), { id: 2, type: "barbed-wire", x: 1.62, y: 0, rot: 0, level: 0 }]);
  hcheck(mixed.length === 0, "and wire near a wall is not a broken wall");
}
if (hairFail) { console.log(hairFail + " gap check(s) failed"); process.exit(1); }
// normalise both outputs to a comparable multiset
const norm = arr => arr.map(i =>
  (typeof i === "string" ? i
    : i.text.replace(" \u21c4 ", " vs ") + "|" + (i.pieceId == null ? "" : i.pieceId))
).sort();

// deterministic RNG so a failure is reproducible
let seed = 12345;
const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;

const TYPES = ["hesco-small", "hesco-tall", "hesco-wall", "bremer-wall", "sandbag-wall",
               "gate", "door", "recon-tower", "vanguard-ciws", "l81-mortar", "bunker",
               "talon-9k-sam", "barbed-wire", "ifs"];

let pass = 0, fail = 0;
for (let trial = 1; trial <= 40; trial++) {
  const n = 8 + Math.floor(rnd() * 45);
  const P = [];
  if (rnd() > 0.3) P.push({ id: 1, type: "__fob__", x: 0, y: 0, rot: 0, level: 0, zone: 100 });
  for (let k = 0; k < n; k++) {
    P.push({
      id: 100 + k,
      type: TYPES[Math.floor(rnd() * TYPES.length)],
      x: Math.round((rnd() * 24 - 12) * 2) / 2,      // tight spread, so overlaps are common
      y: Math.round((rnd() * 24 - 12) * 2) / 2,
      rot: [0, 90, 180, 270, 45][Math.floor(rnd() * 5)],
      level: Math.floor(rnd() * 3),
    });
  }
  sb.design.pieces = P;
  const a = norm(sb.computeIssues());
  const b = norm(sb.computeIssuesOld());
  const same = a.length === b.length && a.every((v, i) => v === b[i]);
  if (same) { pass++; }
  else {
    fail++;
    console.log(`FAIL  trial ${trial} (${P.length} pieces): new ${a.length} issues, old ${b.length}`);
    const onlyNew = a.filter(x => !b.includes(x)).slice(0, 3);
    const onlyOld = b.filter(x => !a.includes(x)).slice(0, 3);
    if (onlyNew.length) console.log("        only new: " + onlyNew.join(" ; "));
    if (onlyOld.length) console.log("        only old: " + onlyOld.join(" ; "));
  }
}
console.log(`\n${pass}/${pass + fail} randomised designs report identical issues`);
process.exit(fail ? 1 : 0);
