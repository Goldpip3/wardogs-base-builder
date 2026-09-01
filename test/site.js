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
  // the FOB's own stock covers the first slice of any design, so only the rest is hauled
  const per = catalog.logistics.suppliesPerPallet;
  const pallets = Math.ceil(Math.max(0, supplies - catalog.fob.startingSupplies) / per);
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

// ---------- the two lists of designs ----------
/* The designs page carries the published list and your own saved designs under it, in that
   order, and the account page carries the second one on its own. The renderer for it is one
   script shared by both pages: this repo has been bitten by a number and by a share format
   living in two places, and a list of designs is the same trap. Comparing the blocks rather
   than looking for a marker in each is what would actually catch a copy being made. */
const designsPage = fs.readFileSync(DOCS + "designs/index.html", "utf8");
const accountPage = fs.readFileSync(DOCS + "account/index.html", "utf8");
const community = designsPage.indexOf('id="designList"');
const yours = designsPage.indexOf('id="mineList"');
check(community > 0 && yours > community,
  "designs page lists the community first and your own designs under it");
check(accountPage.includes('id="mineList"'), "the account page carries your saved designs");

const rendererOf = html => html.split("<script>").map(s => s.split("</script>")[0])
  .find(s => s.includes("mineList") && s.includes("function renderMine"));
const rd = rendererOf(designsPage), ra = rendererOf(accountPage);
check(!!rd && rd === ra, "both pages draw your designs with the same script, not two copies");
check(!!rd && rd.includes("/submit") && rd.includes("data-publish"),
  "a saved design can be sent up to the community list from the page itself");
check(!!rd && rd.includes("data-role=more") && /PAGE=[0-9]+/.test(rd),
  "the community list arrives a page at a time rather than all at once");
/* The seam between two things built separately: the worker refuses a submission that names
   no map, and this card is one of the two places a submission is made. It sent name, code
   and note only, which the worker answered with a 400 nobody could act on, so the picker
   and the tags in the body are pinned here rather than left to be found in a browser. */
check(!!rd && rd.includes("data-pick") && rd.includes("tags:tags"),
  "the card that sends a design up asks for tags and sends them");

// ---------- the loadout calculator's bag ----------
/* Two rules the page is built on, both of which read as fine in the markup and wrong on the
   screen if they slip: the Pouch is a backpack rather than a rig, and nothing is carried
   before there is something to carry it in. */
const kit = fs.readFileSync(DOCS + "loadouts/index.html", "utf8");
const between = (html, from, to) => {
  const a = html.indexOf(from);
  if (a < 0) return "";
  const b = html.indexOf(to, a + from.length);
  return html.slice(a, b < 0 ? html.length : b);
};
const bagShelf = between(kit, 'id="bag-grid"', "</div></div>");
const rigShelf = between(kit, 'id="vest-grid"', "</div></div>");
check(bagShelf.includes('data-name="Pouch"'),
  "the Pouch is on the backpack shelf, where the free option belongs");
check(!rigShelf.includes('data-name="Pouch"') && rigShelf.includes("Tac Vest"),
  "the rig shelf is tac vests only");
const gearPanel = between(kit, 'data-panel="gear"', 'data-panel="items"');
check(!gearPanel.includes('id="bag-slot"'),
  "the backpack is not filed under gear with the helmet and the armour");
const storage = between(kit, '<div class="vend-pack">', "<div class=\"vend-shelf\"");
check(storage.includes('id="bag-slot"') && storage.includes('id="cells"'),
  "storage is its own column, with the bag slot and the grid that fills as you build");
check(kit.includes("function gateBag") && kit.includes("Pick a backpack before you buy"),
  "the items shelf locks until a backpack is chosen");
/* Stacking is per item and comes from the pull, not from a rule of thumb: a bandage is
   five to a slot, a grenade is one, and 5.56 is eighty. The page had "five for anything
   throwable" for a few hours, which was wrong about grenades in the direction that makes a
   bag look emptier than it is. */
const stats = require(ROOT + "/data/armory-stats.json").items;
check(stats["Bandage"] && stats["Bandage"].stack === 5 &&
  !(stats["M67 Frag Grenade"] || {}).stack,
  "the pulled stacks are per item: a bandage stacks, a frag grenade does not");
check(kit.includes("var STACK=") && kit.includes("STACK[k]||1"),
  "the bag stacks by what the source says, one to a slot when it says nothing");
check(kit.includes("var BAGGRID=") && kit.includes('" of "+room+" slots"'),
  "the bag is drawn on its own grid and counts what is in it");
/* Every figure on this screen that is not a price is a transcription rather than a
   measurement, and the page has to say so: it is the difference between a number somebody
   checked in game and a number read off a fan database on one particular day. */
const pulled = require(ROOT + "/data/armory-stats.json");
check(kit.includes("transcribed from the same item") && kit.includes(pulled.readOn),
  "the page says where the weights and capacities came from and when");

// ---------- the damage calculator's control rows ----------
/* A row is a label and the things you can press. The armour rows ended with the armour's
   name out of the data, which is the same two words the label says, so the strip finished
   with a sixth item you cannot press repeating the line above it. Checking that a chips
   strip holds nothing but buttons catches the whole class rather than those two rows. */
const ball = fs.readFileSync(DOCS + "ballistics/index.html", "utf8");
const strips = ball.split('<span class="chips"').slice(1)
  .map(part => part.slice(part.indexOf(">") + 1).split("</span>")[0]);
const notButtons = strips.filter(inner =>
  inner.replace(/<button[^]*?<\/button>/g, "").trim().length > 0);
check(strips.length > 0 && notButtons.length === 0,
  `all ${strips.length} chip strips in the calculator hold only buttons`,
  notButtons.join(" | ").slice(0, 120));

// ---------- the planner still ships intact ----------
check(app.includes("btnShare") && app.includes("buildIndex") && app.length > 100000,
  "planner page is the full app");
check(fs.existsSync(DOCS + "CNAME") &&
  fs.readFileSync(DOCS + "CNAME", "utf8").trim() === "www.wardogsbuilder.com",
  "custom domain claim survives the rebuild");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
