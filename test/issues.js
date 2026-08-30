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
  lift("pieceRect"), lift("rectCorners"), lift("rectAABB"), lift("aabbOverlap"),
  lift("rectsOverlap"), lift("canOverlay"), lift("buildIndex"), lift("neighbours"),
  lift("touches"), lift("computeIssues"),
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
  "    if (rectsOverlap(pieceRect(a), pieceRect(b)))",
  "      issues.push(da.name + ' vs ' + db.name + ': overlap on level ' + ((a.level||0)+1) + '|' + b.id);",
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
