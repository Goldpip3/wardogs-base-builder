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

const sb = { console, byId, JSON, Math, Array, Object, String, Uint8Array, Error,
             TextEncoder, TextDecoder, Response, DecompressionStream, Promise,
             btoa: s => Buffer.from(s, "binary").toString("base64"),
             atob: s => Buffer.from(s, "base64").toString("binary") };
vm.createContext(sb);
vm.runInContext([lift("b64urlEncode"), lift("encodeDesign")].join("\n"), sb);
/* the one decoder, from the file that holds it */
vm.runInContext(fs.readFileSync(PROJ + "src/shared/design-view.js", "utf8"), sb);
/* Every check below is written against a synchronous decode, which is what v1 is. The
   shared entry point is async because only v2 has to inflate, so the v1 half is called
   directly rather than turning forty assertions into promises. */
vm.runInContext(
  "var decodeDesign = function(c){" +
  "  return WardogsDesignView.decodeV1(c, function(t){ return !!byId[t]; });" +
  "};", sb);

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

/* --- the wire format has two implementations, and they have to agree ---
   The planner encodes in the browser, the generator in Node, because a community design
   page has to carry a code the planner reads back and the two cannot share a module: one
   ships inside a standalone HTML file and the other runs at build time.

   This used to require identical strings, and that was right for v1. It is wrong for v2:
   the body is deflated, deflate output is not canonical, and two conforming compressors may
   emit different bytes for the same input. Requiring equal strings would have failed on a
   difference that does not matter. What matters is that either side reads the other's, in
   both directions, which is what the round trip below actually proves.

   v1 still has to decode. Every link anyone has already posted is a v1 link. */
// shared with the crossing block below, which needs the same two encoders
let encGen, decGen, samePieces;
{
  const vm2 = require("vm");
  const ctxSrc = fs.readFileSync(ROOT + "/tools/site/context.js", "utf8");
  const grab = name => ctxSrc.match(new RegExp("function " + name + "\\([\\s\\S]*?\\n\\}"))[0];
  const generator = { Buffer, JSON, Math, console, require };
  vm2.createContext(generator);
  vm2.runInContext(
    ctxSrc.match(/const toB64url = [\s\S]*?;\n/)[0] +
    ctxSrc.match(/const fromB64url = [^\n]*\n/)[0] +
    "const zlib = require('zlib');\n" +
    "const zig = n => (n < 0 ? -n * 2 - 1 : n * 2);\n" +
    "const unzig = v => (v & 1 ? -(v + 1) / 2 : v / 2);\n" +
    [grab("putVarint"), grab("packDesign"), grab("unpackDesign"),
     grab("encodeDesign"), grab("decodeShared")].join("\n"), generator);
  encGen = d => vm2.runInContext("encodeDesign(" + JSON.stringify(d) + ")", generator);
  decGen = c => vm2.runInContext("decodeShared(" + JSON.stringify(c) + ")", generator);

  const cases = [
    { label: "a normal base", d: { name: "Test FOB", pieces: [
      { type: "__fob__", x: 0, y: 0, rot: 0, level: 0, zone: 100 },
      { type: "hesco-tall", x: 1.5, y: -2, rot: 90, level: 1 },
      { type: "l81-mortar", x: -3, y: 4, rot: 0, level: 2 } ] } },
    { label: "a name with non-ASCII in it", d: { name: "Unicode \u2192 name",
      pieces: [{ type: "sandbag-wall", x: -0.5, y: 0.5, rot: 270, level: 0 }] } },
    { label: "a half-cell offset and a high storey", d: { name: "Half", pieces: [
      { type: "hesco-small", x: -0.5, y: 2.5, rot: 180, level: 3 }] } },
    { label: "negative coordinates far from origin", d: { name: "Far", pieces: [
      { type: "hesco-small", x: -60.5, y: -44, rot: 0, level: 0 },
      { type: "hesco-small", x: 61, y: 45.5, rot: 270, level: 0 }] } },
  ];

  samePieces = (a, b) => a.length === b.length && a.every((p, i) =>
    p.type === b[i].type && p.x === b[i].x && p.y === b[i].y &&
    (p.rot || 0) === (b[i].rot || 0) && (p.level || 0) === (b[i].level || 0) &&
    (p.zone || 0) === (b[i].zone || 0));

  for (const { label, d } of cases) {
    const fromPlanner = sb.encodeDesign(d);          // v1, the sync path both still speak
    check(samePieces(sb.decodeDesign(fromPlanner).pieces, decGen(fromPlanner)),
      `the generator reads the planner's v1 code for ${label}`);
    const fromGen = encGen(d);
    check(fromGen.charAt(0) === "~", `the generator now emits a v2 code for ${label}`);
    check(samePieces(decGen(fromGen), d.pieces),
      `and the generator reads its own v2 code back for ${label}`);
  }

  /* The size claim, checked rather than asserted in a comment. A realistic 607 piece base
     is what prompted this: it was 13,637 characters and could not be sent as a Discord
     message, which caps at 2000. */
  const big = { name: "Real base", pieces: [] };
  let sd = 7;
  const rr = () => (sd = (sd * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  let bx = -40, by = -40;
  for (let i = 0; i < 607; i++) {
    big.pieces.push({ type: ["hesco-wall", "bremer-wall", "hesco-small", "sandbag-wall"][Math.floor(rr() * 4)],
      x: bx, y: by, rot: Math.floor(rr() * 4) * 90, level: rr() < 0.15 ? 1 : 0 });
    bx += 1; if (bx > 40) { bx = -40; by += 1; }
  }
  const v1len = sb.encodeDesign(big).length;
  const v2len = encGen(big).length;
  console.log(`  607 pieces: v1 ${v1len} characters, v2 ${v2len}`);
  check(v2len < 2000, "a 607 piece base fits inside a Discord message as v2", v2len + " characters");
  check(v2len < v1len / 4, "which is at least a four fold saving on v1");
  check(samePieces(decGen(encGen(big)), big.pieces), "and a base that size still round trips exactly");
}

/* --- the crossing, both directions ---
   Everything above tests one side against itself. This runs the planner's own v2 encoder,
   lifted out of the built file and given the CompressionStream it expects, and makes the
   generator read its output. Then the reverse. If the two ever disagree about a varint or
   a column order, a shared link opens as somebody else's base, and that is the failure
   worth spending a test on. */
async function crossing() {
  const psb = { console, byId, JSON, Math, Array, Object, String, Uint8Array, Response,
                TextEncoder, TextDecoder, CompressionStream, DecompressionStream,
                btoa: x => Buffer.from(x, "binary").toString("base64"),
                atob: x => Buffer.from(x, "base64").toString("binary") };
  vm.createContext(psb);
  /* Only the encoding half is lifted out of the app now. Decoding is one implementation in
     src/shared/design-view.js, loaded here as the file it is, so this crossing checks what
     it always meant to check: that what the planner writes, the shared reader reads. */
  vm.runInContext([lift("b64urlEncode"), lift("encodeDesign"),
                   lift("putVarint"), lift("packDesign"),
                   lift("bytesToB64url"),
                   /* lift() anchors on "function name(", which sits inside
                      "async function name(", so the async keyword is left behind and every
                      await in the body becomes a syntax error. Put it back. */
                   "async " + lift("squeeze"),
                   "async " + lift("encodeDesignShort")].join("\n") +
    "\nconst zig = n => (n < 0 ? -n * 2 - 1 : n * 2);", psb);
  vm.runInContext(fs.readFileSync(PROJ + "src/shared/design-view.js", "utf8"), psb);
  vm.runInContext(
    // var, not const: only var reaches the sandbox object the test calls through
    "var known = t => !!byId[t];" +
    "var decodeDesignAny = c => WardogsDesignView.decode(c, known);" +
    "var decodeDesign = c => WardogsDesignView.decodeV1(c, known);", psb);

  const d = { name: "Crossing", pieces: [
    { type: "__fob__", x: 0, y: 0, rot: 0, level: 0, zone: 120 },
    { type: "hesco-wall", x: -6.5, y: -4, rot: 90, level: 0 },
    { type: "vanguard-ciws", x: 3, y: 2.5, rot: 270, level: 1 },
    { type: "bremer-wall", x: -2.5, y: -7.5, rot: 180, level: 2 }] };

  const fromPlanner = await psb.encodeDesignShort(d);
  check(fromPlanner.charAt(0) === "~", "the planner emits a v2 code");
  check(samePieces(decGen(fromPlanner), d.pieces),
    "and the generator reads the planner's v2 code");

  const fromGen = encGen(d);
  const back = await psb.decodeDesignAny(fromGen);
  check(samePieces(back.pieces, d.pieces), "the planner reads the generator's v2 code");
  check(back.name === "Crossing", "and the name survives the crossing");

  // the promise that matters most: nothing already posted breaks
  const oldLink = sb.encodeDesign(d);
  const oldBack = await psb.decodeDesignAny(oldLink);
  check(samePieces(oldBack.pieces, d.pieces),
    "a v1 link posted before any of this still opens in the planner");

  const big = { name: "Big crossing", pieces: [] };
  for (let i = 0; i < 607; i++) big.pieces.push({ type: "hesco-small",
    x: (i % 40) - 20 + (i % 2 ? 0.5 : 0), y: Math.floor(i / 40), rot: (i % 4) * 90, level: i % 3 });
  const bigCode = await psb.encodeDesignShort(big);
  console.log(`  planner v2, 607 pieces: ${bigCode.length} characters`);
  check(bigCode.length < 2000, "the planner's own 607 piece link fits a Discord message",
    bigCode.length + " characters");
  check(samePieces(decGen(bigCode), big.pieces), "and the generator reads it back exactly");
}

crossing().then(() => {
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
});
