const ROOT = require("path").resolve(__dirname, "..");
// A shared link must reconstruct the design exactly, and must refuse junk safely.
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
}
const catStart = src.indexOf("const CATALOG_DEFAULT = ") + "const CATALOG_DEFAULT = ".length;
const catalog = JSON.parse(src.slice(catStart, src.indexOf(";\nconst ICONS")));
const byId = {};
for (const b of catalog.buildables) byId[b.id] = b;
byId["__fob__"] = { id: "__fob__", name: "FOB", isFob: true };

const sb = { console, byId, JSON, Math, Array, Object, String, Uint8Array,
             TextEncoder, TextDecoder,
             btoa: s => Buffer.from(s, "binary").toString("base64"),
             atob: s => Buffer.from(s, "base64").toString("binary") };
vm.createContext(sb);
vm.runInContext([lift("b64urlEncode"), lift("b64urlDecode"),
                 lift("encodeDesign"), lift("decodeDesign")].join("\n"), sb);

let pass = 0, fail = 0;
const check = (ok, label) => { console.log((ok ? "PASS  " : "FAIL  ") + label); ok ? pass++ : fail++; };

const roundTrip = d => sb.decodeDesign(sb.encodeDesign(d));

// --- exact round trip, including rotation, levels and the FOB build zone ---
const original = { name: "Hilltop Hold", nextId: 6, pieces: [
  { id: 1, type: "__fob__",      x: 0,    y: 0,    rot: 0,   level: 0, zone: 100 },
  { id: 2, type: "hesco-wall",   x: -6.5, y: -4,   rot: 90,  level: 0 },
  { id: 3, type: "vanguard-ciws",x: 3,    y: 2.5,  rot: 270, level: 1 },
  { id: 4, type: "gate",         x: 0,    y: 7,    rot: 0,   level: 0 },
  { id: 5, type: "bremer-wall",  x: -2.5, y: -7.5, rot: 180, level: 2 },
]};
const back = roundTrip(original);
check(back.pieces.length === 5, "every piece survives the round trip");
check(back.name === "Hilltop Hold", "the design keeps its name");
const same = original.pieces.every((o, i) => {
  const r = back.pieces[i];
  return r.type === o.type && r.x === o.x && r.y === o.y &&
         (r.rot || 0) === (o.rot || 0) && (r.level || 0) === (o.level || 0);
});
check(same, "type, position, rotation and storey all come back identical");
check(back.pieces[0].zone === 100, "the FOB keeps its build zone");

// --- half-cell positions must survive (placement snaps to 0.5) ---
const halves = roundTrip({ name: "h", pieces: [
  { id: 1, type: "hesco-small", x: -12.5, y: 8.5, rot: 45, level: 0 }] });
check(halves.pieces[0].x === -12.5 && halves.pieces[0].y === 8.5, "half-cell coordinates survive");
check(halves.pieces[0].rot === 45, "free rotation angles survive");

// --- unicode in names must not corrupt the payload ---
const uni = roundTrip({ name: "Ridge \u2014 \u00fcmlaut \u4e2d\u6587", pieces: original.pieces });
check(uni.name === "Ridge \u2014 \u00fcmlaut \u4e2d\u6587", "non-ASCII names survive intact");

// --- link size stays sane ---
const big = { name: "Big", pieces: [] };
for (let i = 0; i < 500; i++)
  big.pieces.push({ id: i + 1, type: "hesco-small", x: (i % 40) - 20, y: Math.floor(i / 40), rot: 0, level: 0 });
const code = sb.encodeDesign(big);
check(code.length < 12000, `500 pieces encodes to ${code.length} characters`);
check(roundTrip(big).pieces.length === 500, "a 500-piece base round trips");

// --- junk input must throw rather than corrupt the app ---
for (const bad of ["", "!!!!", "eyJ2Ijo5OTl9", "bm90anNvbg"]) {
  let threw = false;
  try { sb.decodeDesign(bad); } catch (e) { threw = true; }
  check(threw, `rejects junk input ${JSON.stringify(bad.slice(0, 12))}`);
}
// unknown buildable ids are dropped, not crashed on
const withGhostType = sb.b64urlEncode(JSON.stringify(
  { v: 1, n: "x", t: ["hesco-small", "not-a-real-thing"], p: [[0, 0, 0, 0, 0], [1, 2, 2, 0, 0]] }));
check(sb.decodeDesign(withGhostType).pieces.length === 1, "unknown buildables are dropped, not crashed on");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
