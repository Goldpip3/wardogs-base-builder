/* How many players a base takes to hold.
 *
 * The one figure on the plan that cannot be measured. Everything else in this project is
 * read off the game or worked out from it; this is the person who built the base saying who
 * it is for, so it is asked for rather than derived, and a submission has to answer it
 * because the community list shows it against every design.
 *
 * It rides inside the share code rather than beside it in the submission record. That means
 * one copy of the answer, and it survives a base being passed on as a link, saved, exported
 * and opened somewhere else. The head of both format versions is JSON, so the key is simply
 * absent from every code written before this and the alphabet does not change, which is what
 * would have made it a worker deploy.
 */
const ROOT = require("path").resolve(__dirname, "..");
const fs = require("fs"), vm = require("vm"), path = require("path");

let pass = 0, fail = 0;
const check = (ok, label, detail) => {
  console.log((ok ? "PASS  " : "FAIL  ") + label + (ok || !detail ? "" : ": " + detail));
  ok ? pass++ : fail++;
};

const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, "data/buildables.json"), "utf8"));
const html = fs.readFileSync(path.join(ROOT, "WardogsBaseBuilder.html"), "utf8");
const src = html.slice(html.indexOf("<script>"), html.lastIndexOf("</script>"));
const designs = fs.readFileSync(path.join(ROOT, "docs/designs/index.html"), "utf8");

/* --- the buckets live in data, like every other figure --- */
{
  const opts = (catalog.crewSizes || {}).options || [];
  check(opts.length === 3, "there are three buckets", opts.length + " found");
  check(opts.map(o => o.label).join(" / ") === "1 to 2 / 3 to 5 / 6 to 10",
    "and they are the ones asked for",
    opts.map(o => o.label).join(" / "));
  check(opts.every(o => o.id && o.label), "each has an id to travel under and a label to read");
  check(new Set(opts.map(o => o.id)).size === opts.length, "and the ids are distinct");

  /* the ids are the thing in the wire format, so they must not be spelled out anywhere a
     rename could miss */
  const bodyOnly = html.slice(0, html.indexOf("<script>"));
  check(!/1 to 2|3 to 5|6 to 10/.test(bodyOnly),
    "no bucket is written into the markup, so the labels have one home");
}

/* --- the code carries it, both versions, through the one decoder --- */
const sb = { console, Math, JSON, Array, Object, Number, Infinity, Uint8Array, Error, String,
             TextEncoder, TextDecoder, Response, DecompressionStream, CompressionStream,
             Promise, byId: {},
             btoa: s => Buffer.from(s, "binary").toString("base64"),
             atob: s => Buffer.from(s, "base64").toString("binary") };
for (const b of catalog.buildables) sb.byId[b.id] = b;
sb.byId["__fob__"] = { id: "__fob__", name: "FOB", isFob: true, footprint: { w: 3, d: 3 } };
vm.createContext(sb);

function lift(name) {
  const start = src.indexOf("function " + name + "(");
  if (start < 0) throw new Error("missing " + name);
  let depth = 0, started = false;
  for (let j = src.indexOf("{", start); j < src.length; j++) {
    if (src[j] === "{") { depth++; started = true; }
    else if (src[j] === "}") { depth--; if (started && depth === 0) return src.slice(start, j + 1); }
  }
}
vm.runInContext([lift("b64urlEncode"), lift("encodeDesign"), lift("putVarint"),
                 lift("packDesign"), lift("bytesToB64url"),
                 "async " + lift("squeeze"), "async " + lift("encodeDesignShort")].join("\n") +
  "\nconst zig = n => (n < 0 ? -n * 2 - 1 : n * 2);", sb);
vm.runInContext(fs.readFileSync(path.join(ROOT, "src/shared/design-view.js"), "utf8"), sb);
vm.runInContext("var known = t => !!byId[t];" +
  "var decodeAny = c => WardogsDesignView.decode(c, known);", sb);

const BASE = { name: "Crew Test", pieces: [
  { type: "__fob__", x: 0, y: 0, rot: 0, level: 0, zone: 100 },
  { type: "hesco-wall", x: -6, y: -4, rot: 90, level: 0 },
] };

(async () => {
  for (const id of (catalog.crewSizes.options || []).map(o => o.id)) {
    const d = Object.assign({}, BASE, { crew: id });
    const v2 = await sb.decodeAny(await sb.encodeDesignShort(d));
    const v1 = await sb.decodeAny(sb.encodeDesign(d));
    check(v2.crew === id && v1.crew === id,
      "a base for " + id + " comes back as " + id + " in both formats",
      "v2 " + v2.crew + ", v1 " + v1.crew);
  }

  /* not answering is a real state, and must not turn into a guess */
  {
    const back = await sb.decodeAny(await sb.encodeDesignShort(BASE));
    check(back.crew === null, "a design with nobody assigned comes back with nobody assigned",
      String(back.crew));
  }

  /* every link shared before this still opens, and says nothing about crew */
  {
    const old = sb.b64urlEncode(JSON.stringify({ v: 1, n: "Old link", t: ["hesco-wall"],
                                                 p: [[0, 0, 0, 0, 0]] }));
    const back = await sb.decodeAny(old);
    check(back.pieces.length === 1 && back.crew === null,
      "a link from before this feature still opens, with no crew on it");
  }

  /* the field is not a place to put anything you like */
  {
    const forged = sb.b64urlEncode(JSON.stringify({ v: 1, n: "x", t: ["hesco-wall"],
      p: [[0, 0, 0, 0, 0]], c: "<img onerror=alert(1)>" }));
    const back = await sb.decodeAny(forged);
    check(back.crew === null,
      "a value that is not one of the buckets is dropped, not carried onto a page");
  }

  /* costing: this must not be what makes a base too big to share */
  {
    const withCrew = (await sb.encodeDesignShort(Object.assign({}, BASE, { crew: "m" }))).length;
    const without = (await sb.encodeDesignShort(BASE)).length;
    check(withCrew - without < 16, "it costs a handful of characters in a link",
      withCrew - without + " more");
  }

  /* --- the planner asks for it, and will not submit without an answer --- */
  check(/id="crewStrip"/.test(html), "the planner has somewhere to answer it");
  check(/renderCrewStrip\(\)/.test(src) && /catalog\.crewSizes/.test(src),
    "and builds that from the catalog rather than from hardcoded buttons");
  check(/if \(!design\.crew\) \{[\s\S]{0,400}?return;/.test(src),
    "submitting without an answer is refused before anything is sent");
  {
    const submit = src.slice(src.indexOf('getElementById("cloudShare")'));
    const guard = submit.indexOf("!design.crew");
    const send = submit.indexOf('cloudCall("/submit"');
    check(guard > -1 && guard < send,
      "and the refusal comes before the call, not after it");
  }

  /* --- the community list shows it --- */
  check(/CREW_LABELS/.test(designs), "the designs page carries the labels");
  check(/data-crew-for/.test(designs), "and a slot on each card to put it in");
  check(designs.includes('"s":"1 to 2"') || /1 to 2/.test(designs),
    "with the same words the planner uses");

  console.log("\n" + pass + " passed, " + fail + " failed");
  process.exit(fail ? 1 : 0);
})();
