const ROOT = require("path").resolve(__dirname, "..");
// The site's share codes must decode in the planner, and the stats it advertises
// must match what the planner itself computes. A design page that lies about its
// cost is worse than no design page.
const fs = require("fs"), vm = require("vm"), path = require("path");
const PROJ = ROOT + "/";
const DOCS = PROJ + "docs/";

let pass = 0, fail = 0;
const check = (ok, label) => { console.log((ok ? "PASS  " : "FAIL  ") + label); ok ? pass++ : fail++; };

const app = fs.readFileSync(DOCS + "planner/index.html", "utf8");
const src = app.slice(app.indexOf("<script>"), app.lastIndexOf("</script>"));
function lift(name) {
  const start = src.indexOf("function " + name + "(");
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
byId["__fob__"] = { id: "__fob__", name: "FOB", isFob: true, cost: 0 };

const sb = { console, byId, JSON, Math, Array, Object, String, Uint8Array, TextEncoder, TextDecoder,
  btoa: s => Buffer.from(s, "binary").toString("base64"),
  atob: s => Buffer.from(s, "base64").toString("binary") };
vm.createContext(sb);
vm.runInContext([lift("b64urlDecode"), lift("decodeDesign")].join("\n"), sb);

// ---------- every design page ----------
const designDirs = fs.readdirSync(DOCS + "designs").filter(d =>
  fs.statSync(DOCS + "designs/" + d).isDirectory());
check(true, `${designDirs.length} community design page(s) generated`);

for (const slug of designDirs) {
  const html = fs.readFileSync(`${DOCS}designs/${slug}/index.html`, "utf8");
  const m = html.match(/\/planner\/#d=([A-Za-z0-9\-_]+)/);
  if (!m) { check(false, `${slug}: has an "Open in planner" link`); continue; }

  let d;
  try { d = sb.decodeDesign(m[1]); }
  catch (e) { check(false, `${slug}: share code decodes (${e.message})`); continue; }
  check(d.pieces.length > 0, `${slug}: share code decodes to ${d.pieces.length} pieces`);

  // every piece must be a buildable the planner knows
  const unknown = d.pieces.filter(p => !byId[p.type]);
  check(unknown.length === 0, `${slug}: every piece is a real buildable`);

  // the advertised supply figure must match a fresh calculation
  const supplies = d.pieces.reduce((t, p) => {
    const def = byId[p.type]; return t + (def && !def.isFob ? (def.cost || 0) : 0);
  }, 0);
  const advertised = +(html.match(/<b>([\d,]+)<\/b><span>build supplies/) || [])[1]
    ?.replace(/,/g, "");
  check(advertised === supplies,
    `${slug}: page says ${advertised} supplies, design really costs ${supplies}`);

  // pallets and trips must be internally consistent
  const per = catalog.logistics.suppliesPerPallet;
  const pallets = Math.ceil(supplies / per);
  const advPallets = +(html.match(/<b>(\d+)<\/b><span>pallets/) || [])[1];
  const advTruck = +(html.match(/<b>(\d+)<\/b><span>truck trips/) || [])[1];
  check(advPallets === pallets && advTruck === Math.ceil(pallets / 2),
    `${slug}: ${pallets} pallets = ${Math.ceil(pallets / 2)} truck trips, stated correctly`);
}

// ---------- structural pages ----------
for (const [file, must] of [
  ["index.html", ["Open the planner", "/designs/", "/buildables/"]],
  ["buildables/index.html", ["Stingray", "Bremer Wall", "Build Supplies"]],
  ["designs/index.html", ["Base designs", "Community"]],
]) {
  const html = fs.readFileSync(DOCS + file, "utf8");
  check(must.every(s => html.includes(s)), `${file} contains its key content`);
  check(/<title>[^<]{10,}<\/title>/.test(html) && /name="description" content="[^"]{40,}"/.test(html),
    `${file} has a real title and description`);
  check(html.includes('rel="canonical"'), `${file} declares a canonical URL`);
}

// every buildable appears in the reference table
const ref = fs.readFileSync(DOCS + "buildables/index.html", "utf8");
const escName = n => n.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
const missing = catalog.buildables.filter(b => !ref.includes(">" + escName(b.name) + "<"));
check(missing.length === 0,
  `all ${catalog.buildables.length} buildables listed in the reference${missing.length ? " — missing " + missing.map(b => b.name) : ""}`);

// ---------- sitemap ----------
const sm = fs.readFileSync(DOCS + "sitemap.xml", "utf8");
const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
/* Counting against a literal meant this went red the moment a page was added, which is a
   test telling you off for doing the thing right. What actually matters is that the
   sitemap and the indexable pages on disk are the same set, in both directions. */
const indexable = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = d + f;
    if (fs.statSync(p).isDirectory()) walk(p + "/");
    else if (f === "index.html" && !/name="robots" content="noindex/.test(fs.readFileSync(p, "utf8"))) {
      indexable.push("/" + p.slice(DOCS.length).replace(/index\.html$/, ""));
    }
  }
})(DOCS);
const listed = new Set(locs.map(u => u.replace("https://www.wardogsbuilder.com", "")));
const unlisted = indexable.filter(u => !listed.has(u));
check(unlisted.length === 0,
  `sitemap lists every one of the ${indexable.length} indexable pages`, unlisted.join(", "));
const allExist = locs.every(u => {
  const rel = u.replace("https://www.wardogsbuilder.com", "").replace(/^\//, "");
  return fs.existsSync(DOCS + (rel === "" ? "index.html" : rel + "index.html"));
});
check(allExist, "every sitemap URL points at a page that exists");
check(fs.readFileSync(DOCS + "robots.txt", "utf8").includes("sitemap.xml"), "robots.txt points at the sitemap");

// ---------- old shared links keep working ----------
const home = fs.readFileSync(DOCS + "index.html", "utf8");
check(home.includes('location.replace("/planner/#d="'),
  "root page forwards designs shared before the planner moved");

// ---------- the planner still ships intact ----------
check(app.includes("btnShare") && app.includes("buildIndex") && app.length > 100000,
  "planner page is the full app");
check(fs.existsSync(DOCS + "CNAME") &&
  fs.readFileSync(DOCS + "CNAME", "utf8").trim() === "www.wardogsbuilder.com",
  "custom domain claim survives the rebuild");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
