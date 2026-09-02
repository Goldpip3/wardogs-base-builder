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

// ---------- the loadout calculator's weapon shelf ----------
/* Thirty-four weapons in one grid is a wall you read rather than a shelf you pick from. The
   damage page's shelf was cut into classes first; this is the same cut, from the same list,
   which is why that list lives in tools/site/context.js and neither page keeps its own. */
const kitPage = fs.readFileSync(DOCS + "loadouts/index.html", "utf8");
check(kitPage.includes('data-pcls="w|Assault Rifle"') && kitPage.includes('data-pclass='),
  "the primary weapon shelf is cut into classes");
check(kitPage.includes('id="w-grid" hidden data-split="Assault Rifle"'),
  "and opens on one of them rather than on all thirty-four");
/* The game's third slot. Launchers were on the primary shelf beside the rifles; the vendor
   files them under Specialist with five more tabs, read off the game on 2026-09-02. */
const between = (html, from, to) => {
  const a = html.indexOf(from);
  if (a < 0) return "";
  const b = html.indexOf(to, a + from.length);
  return html.slice(a, b < 0 ? html.length : b);
};
const specShelf = between(kitPage, 'id="spec-grid"', "</div></div>");
const primShelf = between(kitPage, 'id="w-grid"', "</div></div>");
check(kitPage.includes('id="spec-slot"') && specShelf.includes('data-name="RPG-7"') &&
  specShelf.includes('data-name="Defibrillator"') && specShelf.includes('data-name="Halligan Bar"'),
  "the loadout has a Specialist slot holding launchers, kits and tools");
check(["Launcher", "Medical", "Building", "Recon", "Vehicle", "Tactical"].every(t =>
  specShelf.includes('data-pcls="spec|' + t + '"')),
  "cut into the vendor's six Specialist tabs");
check(!primShelf.includes('data-name="RPG-7"') && !primShelf.includes('data-name="MGL-40"'),
  "and no launcher is left on the primary shelf");
/* The pull, with anything read off the running game laid over it per field, the same
   precedence tools/site/context.js applies: a vehicle the database never listed can still be
   filed Ground or Air by somebody looking at its card. */
const statItems = (() => {
  const out = {};
  for (const [n, v] of Object.entries(require(ROOT + "/data/armory-stats.json").items)) out[n] = { ...v };
  for (const [n, v] of Object.entries(require(ROOT + "/data/measured.json").items)) {
    out[n] = out[n] || {};
    for (const [k, x] of Object.entries(v)) if (k !== "on" && k !== "note") out[n][k] = x;
  }
  return out;
})();
const weaponNames = require(ROOT + "/data/armory.json").items
  .filter(i => i.cat === "weapons").map(i => i.name);
const unclassed = weaponNames.filter(n => !(statItems[n] || {}).class);
check(unclassed.length === 0,
  `all ${weaponNames.length} weapons carry the class the vendor files them under`,
  unclassed.join(", "));
/* One order for both shelves. A second copy is how the two pages come to disagree about
   where the shotguns go. */
const ctxSrc = fs.readFileSync(PROJ + "tools/site/context.js", "utf8");
const balSrc = fs.readFileSync(PROJ + "tools/site/pages/ballistics.js", "utf8");
const armSrc = fs.readFileSync(PROJ + "tools/site/pages/armory.js", "utf8");
check(ctxSrc.includes("const CLASS_ORDER") &&
  !balSrc.includes("const CLASS_ORDER") && !armSrc.includes("const CLASS_ORDER"),
  "the class order is written once, in the context both pages read");

// ---------- what goes on what ----------
/* An AK was offered GGX magazines, because fitment was being read off the name and a name is
   not a fitment. The vendor's own fit list is pulled into data/armory-stats.json now. */
const fitOf = JSON.parse(kitPage.split("var ATTFIT=")[1].split(";var")[0]);
check(fitOf["GGX 17 RND Magazine"] && fitOf["GGX 17 RND Magazine"].w.indexOf("AK74") < 0,
  "a GGX magazine does not fit an AK74");
check(fitOf["AK74 30 RND Magazine"].w.join() === "AK74",
  "and an AK magazine fits the AK and nothing else");
const fitStats = require(ROOT + "/data/armory-stats.json").items;
const withFits = Object.keys(fitStats).filter(n => fitStats[n].fits || fitStats[n].fitsAny);
check(withFits.length > 120,
  `${withFits.length} attachments carry the fitment the vendor states`);
/* The source marks a few items unfinished. An unfinished attachment fits nothing and was
   being offered on every weapon, because naming no fitment reads the same as a source that
   says nothing at all. */
check(!kitPage.includes('data-name="AT4 Mag"'),
  "an unfinished attachment is off the shelves");

// ---------- vehicles: two fleets, and what each one takes ----------
/* Ground and air were one list you read past each other in, and the only place the split
   existed was a regex over the names that held while every airframe was called AH, MH, UH
   or Havoc. The vendor's own word for it is pulled now, and the rail cuts on it. */
const armPage = fs.readFileSync(DOCS + "armory/index.html", "utf8");
const vehicles = require(ROOT + "/data/armory.json").items.filter(i => i.cat === "vehicles");
const noClass = vehicles.filter(v => !["Ground", "Air"].includes((statItems[v.name] || {}).class));
check(noClass.length === 0,
  `all ${vehicles.length} vehicles are filed ground or air by the source, not by their names`,
  noClass.map(v => v.name).join(", "));
const air = vehicles.filter(v => (statItems[v.name] || {}).class === "Air").length;
check(armPage.includes('data-filter="vehicles" data-sub="Ground"') &&
  armPage.includes('data-filter="vehicles" data-sub="Air"'),
  "the rail hangs Ground and Air under Vehicles");
check(armPage.includes("<span>Air</span><b>" + air + "</b>"),
  `and the air count on it is the ${air} the catalogue actually holds`);
/* A card with no data-sub must not survive a sub filter, or picking Air would show every
   rifle in the game the moment somebody searched as well. */
check(armPage.includes('if(sub&&el.getAttribute("data-sub")!==sub)return false;'),
  "the filter drops anything that is not in the chosen fleet");
check(armPage.includes('sub=f.getAttribute("data-sub")||""'),
  "and clicking Vehicles itself goes back to both");
/* The price is not the gate. A tank is $14,000 on the shelf and half a million to open,
   and only one of those two numbers was on the site. */
const detailJson = armPage.split("var D=")[1].split(";var dlg=")[0];
const details = JSON.parse(detailJson.replace(/\\u003c/g, "<"));
const tank = details.find(d => d.n === "L2A6");
check(!!tank && tank.r.some(r => r[0] === "Unlocks at" && /level 35/.test(r[1]) &&
  /\$500,000/.test(r[1])),
  "the tank's panel carries the level and the cash it takes to unlock");
const bobcat = details.find(d => d.n === "Bobcat");
check(!!bobcat && !bobcat.r.some(r => r[0] === "Unlocks at") &&
  bobcat.o.some(o => /No unlock level or cost is published/.test(o.text)),
  "and one the source is silent about says so rather than reading as free to unlock");
const unlocked = vehicles.filter(v => (statItems[v.name] || {}).unlock);
check(unlocked.length >= 15,
  `${unlocked.length} of the ${vehicles.length} vehicles publish an unlock`);

// ---------- the loadout calculator's bag ----------
/* Two rules the page is built on, both of which read as fine in the markup and wrong on the
   screen if they slip: the Pouch is a backpack rather than a rig, and nothing is carried
   before there is something to carry it in. */
const kit = fs.readFileSync(DOCS + "loadouts/index.html", "utf8");
const bagShelf = between(kit, 'id="bag-grid"', "</div></div>");
const rigShelf = between(kit, 'id="vest-grid"', "</div></div>");
/* A pack with side pockets counts all of them: the Assault Backpack is a 3x5 body plus two
   1x3 pockets, read off the game on 2026-09-02, 21 slots and not 15. */
check(bagShelf.includes("3x5+1x3+1x3, 21 slots"),
  "the Assault Backpack card counts its side pockets into 21 slots");
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

// ---------- the damage page's ranking ----------
/* The zone table is gone and the ranking took its place under the calculator, and the four
   colours the ranking paints time to kill in say what they mean in seconds. The bounds are
   read out of the data here rather than written down, so moving a band moves the test. */
const bal = require(ROOT + "/data/ballistics.json");
/* The heading, not the words: "Every zone is bare" is the figure's caption when nothing is
   worn, and matching on two of its words called the table present when it was gone. */
check(!ball.includes('id="zt"') && !ball.includes("Every zone, this weapon"),
  "the zone table is gone from the damage page");
const firstH2 = ball.split("<h2")[1].split(">")[1].split("<")[0];
check(firstH2 === "Ranking",
  `the ranking is the first heading under the calculator, and it is "${firstH2}"`);
const bounds = bal.ttkBands.map((b, i) => {
  const from = i ? bal.ttkBands[i - 1].upTo : null;
  return b.upTo === null ? "over " + from + " s"
    : from === null ? "under " + b.upTo + " s" : from + " to " + b.upTo + " s";
});
const noBounds = bounds.filter(t => !ball.includes(t));
check(noBounds.length === 0,
  "the legend says what each time to kill colour is in seconds", noBounds.join(", "));
/* The band's word was printed on every row as well as in the legend, which is the legend
   forty times over. The colour carries it now. */
check(!ball.includes("o.band.name.toLowerCase()"),
  "a ranking row states the number, and leaves the word to the legend");
/* Rate of fire on every row, not only when the list is sorted by it: it is half of what
   time to kill is made of, and two weapons with the same shots to kill are told apart by
   nothing else. The data check is the one that matters, since a weapon with no rate of fire
   would draw a dash where every other row has a number. */
check(ball.includes("n rrpm") && ball.includes('id="rpm"'),
  "the ranking and the calculator both state the rate of fire");
/* A weapon can now be figured for damage without a rate of fire: the PKM is, until
   somebody counts its rounds. What must never happen is the page treating a missing one as
   zero seconds, which is the figure for the fastest kill on it. */
const noRpm = bal.weapons.filter(w => !w.rpm).map(w => w.name);
check(bal.weapons.filter(w => w.rpm).length >= bal.weapons.length - 2,
  `${bal.weapons.length - noRpm.length} of ${bal.weapons.length} figured weapons state a rate of fire`,
  noRpm.join(", "));
const M = require(ROOT + "/tools/site/ballistics-model");
check(M.toKill(30, null, 100).ttk === null,
  "a weapon with no rate of fire has no time to kill, rather than a time of zero");
check(M.toKill(500, null, 100).ttk === 0,
  "a one shot kill still takes no time, rate of fire or not");
check(M.bandFor(bal.ttkBands, 4, null) === null,
  "and it wears no time to kill colour, since the scale is seconds");

/* The picker opens on a class rather than on all thirty-four weapons, in the order the
   owner reads them in, and the ranking can be narrowed to one load. */
check(!ball.includes('data-wcls="" aria-pressed="true"') && !ball.includes('data-wcls=""'),
  "the weapon shelf has no All: it opens on a class");
const order = ["Assault Rifle", "SMG", "Shotgun", "LMG", "Marksman Rifle", "Sniper", "Bows"];
const chipText = ball.split('data-wcls=').slice(1).map(p => p.split(">")[1].split("<")[0]);
check(order.every((c, i) => chipText[i] === c),
  `the classes are in the owner's order, and they are ${chipText.slice(0, 7).join(", ")}`);
check(ball.includes('data-load=""') && bal.rounds.every(r => ball.includes('data-load="' + r.id + '"')),
  "the ranking can be filtered to one load");
check(ball.includes("oneShotZones"),
  "a one shot row says which zones it is one shot at");
/* One row per weapon and load, not per weapon: with no filter the M4 is three rows, one for
   each round it chambers, where before it was one row on whichever round it fell back to. */
check(ball.includes("function rankRows") && ball.includes("w.name+'|'+tp"),
  "the ranking lists every load a weapon chambers, not one of them");
/* The bar draws the sorted column, which is what puts a weapon with no rate of fire back on
   the chart the moment you rank by damage. */
check(ball.includes("var BARBY=") && ball.includes("measureOf"),
  "the bar draws whichever column is sorted");
check(ball.includes("function togglePick") && ball.includes("renderCompare"),
  "two rows can be picked out of the list and compared");
/* "one shot" sat in the time cell beside a shots cell already reading 1. */
check(ball.includes("return 'instant'") && !ball.includes("stk===1?'one shot'"),
  "a one shot kill is stated once, as instant, not twice");
/* A row that wraps is twice the height of its neighbours and stops the eye halfway down a
   list meant to be read straight through. "Bushmaster M17S Assault Rifle" did. */
check(ball.includes("var CLASS_SHORT=") && ball.includes('"Assault Rifle":"AR"'),
  "the rows use short class names, so a long one cannot wrap");
check(ball.includes(".rrow .rname{grid-area:name;white-space:nowrap"),
  "and the name cell cannot wrap whatever is in it");
/* A weapon with damage and no rate of fire painted all nine zones the colour of a thing it
   does not know: a grey mannequin beside a panel confidently reading 36.9 damage and three
   shots. The figure carries shots to kill instead, on the same bands, and says so. */
check(ball.includes("function zoneBand") && ball.includes("byShots"),
  "the figure colours by shots to kill when there is no rate of fire to time");
check(ball.includes("Nobody has counted its rate of fire yet"),
  "and the readout says why its time to kill is a dash");

/* The ranking is every weapon against one zone under one armour, and once the calculator
   has scrolled off nothing on the page said which. */
check(ball.includes('id="rctx"') && ball.includes("function watchCtx") &&
  ball.includes("data-ctxzone"),
  "the target follows you down the page, with the zones to change it");
check(ball.includes('<div class="rctx" id="rctx" hidden>'),
  "and it starts hidden, so it only appears once the calculator has gone");
/* The observer is the tidier tool and the wrong one: the state is a relationship between two
   elements and the viewport, which one comparison says and two observers say between them.
   It also has to be waited for on load. */
check(!ball.includes("IntersectionObserver") || ball.indexOf("function watchCtx") < 0 ||
  ball.slice(ball.indexOf("function watchCtx"), ball.indexOf("function watchCtx") + 400)
    .indexOf("IntersectionObserver") < 0,
  "the strip reads scroll position rather than waiting on an observer");

// ---------- what people type into a search box ----------
/* Nobody searches for a field manual. They search for the wardogs wiki, and this is one, so
   the word is in the title, the description, the page itself and the site's own name for
   itself. Structured data because a search engine with nothing to go on names a site after
   its domain, which here would be "wardogsbuilder". */
const homeHtml = fs.readFileSync(DOCS + "index.html", "utf8");
check(/<title>[^<]*wiki/i.test(homeHtml),
  "the front page's title carries the word people actually type");
check(/name="description" content="[^"]*wiki/i.test(homeHtml),
  "and so does its description");
const ldOpen = '<script type="application/ld+json">';
const ldFrom = homeHtml.indexOf(ldOpen) + ldOpen.length;
const ld = homeHtml.slice(ldFrom, homeHtml.indexOf("</scr" + "ipt>", ldFrom));
let ldOk = false, ldName = "";
try { const j = JSON.parse(ld); ldOk = j["@type"] === "WebSite"; ldName = [].concat(j.alternateName || []).join(" "); }
catch (e) {}
check(ldOk, "the site says what it is in structured data, and that data parses");
check(/wiki/i.test(ldName), "including the name people look for it under");
check(!homeHtml.includes('og:site_name" content="WARDOGS Builder'),
  "and it is called WARDOGS everywhere, Builder included");

/* The answer block. A search engine matches a page to a question, and these are the
   questions in the words people ask them in. Every figure in them is computed from data/,
   because a front page quoting a number the armory disagrees with is worse than one saying
   nothing, and prose like this is exactly what gets typed once and left behind. */
const faqOpen = '"@type":"FAQPage"';
check(homeHtml.includes(faqOpen), "the front page answers the questions people type");
const faqAt = homeHtml.lastIndexOf('<script type="application/ld+json">', homeHtml.indexOf(faqOpen));
const faqRaw = homeHtml.slice(faqAt + '<script type="application/ld+json">'.length,
  homeHtml.indexOf("</scr" + "ipt>", faqAt)).replace(/\u003c/g, "<");
let faq = null;
try { faq = JSON.parse(faqRaw); } catch (e) {}
check(!!faq && faq.mainEntity.length >= 5, "and marks them up so a crawler reads the same ones");
/* Both halves have to say the same thing. The visible answer and the marked up answer
   coming apart is the one way this section can become a lie to a search engine while
   looking right on screen. */
const bothWays = (faq ? faq.mainEntity : []).every(q =>
  homeHtml.includes(q.name) && homeHtml.includes(q.acceptedAnswer.text.slice(0, 40)));
check(bothWays, "with the reader and the crawler given the same answers");
/* Figures, not prose. A number typed into copy drifts away from the table it came from. */
const pallets = catalog.logistics.suppliesPerPallet.toLocaleString();
check(faq && faq.mainEntity.some(q => q.acceptedAnswer.text.includes(pallets)),
  `and the figures computed from data, not typed (${pallets} per pallet)`);

// ---------- the planner still ships intact ----------
check(app.includes("btnShare") && app.includes("buildIndex") && app.length > 100000,
  "planner page is the full app");
check(fs.existsSync(DOCS + "CNAME") &&
  fs.readFileSync(DOCS + "CNAME", "utf8").trim() === "www.wardogsbuilder.com",
  "custom domain claim survives the rebuild");

// ---------- the bar is on every page, the planner included ----------
/* The planner was the one page you could not leave from: a wordmark and one link to the
   artillery calculator, and the other five pages did not exist from inside it. */
const bar = (app.match(/<header class="site">[\s\S]*?<\/nav>/) || [""])[0];
check(!!bar, "the hosted planner carries the site banner");
/* Not a version of the site's banner: the same markup, drawn by the same rules, which is
   what "exactly the same" has to mean if it is going to survive the next change to either.
   A 28px hand-written lookalike shipped first and was sent straight back. */
check(bar.includes('class="brand') && (bar.match(/class="[^"]*cta[^"]*"/g) || []).length === 7,
  "with the site's own brand and its seven bordered boxes");
/* The account control is not optional dressing. The row is centred in what the brand and
   the name leave either side of it, so leaving it out moved every box in the nav and the
   banner visibly shifted between the planner and the rest of the site. */
check(bar.includes('id="acct" class="acct"'),
  "and the account control, without which the whole nav sits in a different place");
check(app.includes('document.getElementById("acct")') && !app.includes("acctChip"),
  "the planner fills it from its own sign-in rather than keeping a second one");
/* One renderer for the name, inlined by both sides. The name is part of the banner's
   geometry, so two of these drifting moves the boxes on one page and not the other. */
const acctBar = fs.readFileSync(PROJ + "src/shared/acct-bar.js", "utf8").trim();
check(app.includes(acctBar) && home.includes(acctBar),
  "the planner and the site draw the account name with the same file, not two copies");
/* And it paints the last known name while the page is still parsing. Waiting for the fetch
   meant the row of boxes moved after the first frame, on every navigation, which is what
   the page turn was flickering at. */
check(acctBar.includes("wardogsAcct.fromCache()") &&
  app.indexOf("wardogsAcct") > app.indexOf("</header>"),
  "from a cache, under the header, before anything is fetched");
/* The page turn is written once as well, and lifted into the planner with the banner: a
   cross document transition only happens if both ends opt in, and two copies of the timings
   is how the two ends come to disagree about how long it lasts. */
const tplSrc = fs.readFileSync(PROJ + "src/app-template.html", "utf8");
check(!tplSrc.includes("@view-transition") && !/@keyframes\s+wd-/.test(tplSrc),
  "and the planner keeps no second copy of the page turn");
check(app.includes(require(PROJ + "tools/site-header-css.js").trim()),
  "and the site's own rules for them, lifted rather than copied");
["/artillery/", "/designs/", "/armory/", "/ballistics/", "/loadouts/", "/feedback/"]
  .forEach(href => check(bar.includes('href="' + href + '"'),
    "and it reaches " + href));
/* Every link out of the planner offers to save first. A nav that walks somebody off an
   unsaved design is worse than no nav, and the guard is opt in by class, so a link added
   without it fails quietly and only for people with work on the canvas. */
/* The whole opening tag, not up to the href: the brand carries its href first and its
   classes after, so a match that stopped at the href reported it as unguarded. */
const barLinks = (bar.match(/<a [^>]*>/g) || []).filter(a => a.includes("href="));
check(barLinks.length > 0 && barLinks.every(a => a.includes("leaveLink")),
  `all ${barLinks.length} links out of the planner go through the unsaved-work guard`);
check(bar.includes('aria-current="page">Planner</a>'),
  "and the page you are on is named rather than linked to itself");
/* The download must not carry it: nothing in it fetches, but every href points at the
   website and none of them work from a file on a disk. */
const offlineApp = fs.readFileSync(PROJ + "WardogsBaseBuilder.html", "utf8");
check(!offlineApp.includes('<header class="site">') && !offlineApp.includes("__SITENAV__"),
  "the downloadable copy carries none of it");

// ---------- moving between pages ----------
/* A full document load blinks white and redraws, which is what makes a set of static pages
   feel like a set of files. The browser's own cross document transition needs the opt in on
   both documents, so the planner carries it as well as the site. */
const cssSrc = fs.readFileSync(PROJ + "tools/site/css.js", "utf8");
check(cssSrc.includes("@view-transition{navigation:auto}") &&
  fs.readFileSync(DOCS + "index.html", "utf8").includes("@view-transition{navigation:auto}"),
  "the site opts into the page turn");
check(/@view-transition\s*\{\s*navigation:\s*auto/.test(app),
  "and so does the planner, or leaving it would not turn");
check(cssSrc.includes("header.site{view-transition-name:wd-head}") &&
  app.includes("header.site{view-transition-name:wd-head}"),
  "the banner has its own name on both, so it sits still while the page turns");
check(/prefers-reduced-motion:\s*reduce\)\s*\{\s*\n?\s*::view-transition-old\(root\)/.test(cssSrc),
  "somebody who asked for less motion gets no turn at all");

/* Which way the page turns says which way you went. The stylesheet keys the four motions off
   one attribute on <html>, and a shared script in the head sets it from where the reader
   came from. Both halves are held here: the rules exist, the script is in the head on the
   site and the planner, the planner's copy of the rules has its timings written in rather
   than reaching for a token the planner does not declare, and the direction logic itself
   runs below against a fake window. */
const turnSrc = fs.readFileSync(PROJ + "src/shared/page-turn.js", "utf8");
check(cssSrc.includes(":root[data-nav=fwd]::view-transition-new(root){animation:wd-move-from-right") &&
  cssSrc.includes(":root[data-nav=back]::view-transition-new(root){animation:wd-move-from-left") &&
  cssSrc.includes(":root[data-nav=out]::view-transition-old(root){animation:wd-scale-down-up"),
  "the site turns one way going right along the banner, the other going left, and a third for a layer");
check(cssSrc.includes("::view-transition-image-pair(root){background:var(--bg)}"),
  "and the two pictures move over the page's own ground rather than over the live document");
[["home", home], ["planner", app]].forEach(([name, html]) =>
  check(html.indexOf(turnSrc.trim()) > 0 && html.indexOf(turnSrc.trim()) < html.indexOf("</head>"),
    "the " + name + " carries the direction script, in the head, before the first frame"));
check(app.includes("::view-transition-old(root){animation:wd-scale-down .7s ease both") &&
  !app.includes("var(--pt-page)"),
  "the planner's copy has the timings written in, since its :root never declares them");
{
  /* The script, run against a fake window so the direction function can be asked directly. */
  const w = {};
  const doc = { referrer: "", documentElement: { setAttribute() {} } };
  new Function("window", "document", "location", turnSrc)(w, doc, { pathname: "/" });
  const dir = w.wardogsTurn.direction;
  check(dir("/planner/", "/artillery/") === "fwd" && dir("/", "/feedback/") === "fwd",
    "rightwards along the banner is fwd");
  check(dir("/artillery/", "/planner/") === "back" && dir("/feedback/", "/") === "back",
    "leftwards along it is back");
  check(dir("/designs/", "/designs/abc/") === "in" && dir("/designs/abc/", "/designs/") === "out",
    "deeper into a page is in, back up out of it is out");
  check(dir("/designs/abc/", "/planner/") === "back" && dir("/designs/abc/", "/armory/") === "fwd",
    "and one design still sits where Designs sits, so leaving it sideways is sideways");
  check(dir("/planner/", "/privacy/") === "in" && dir("/privacy/", "/planner/") === "out" &&
    dir("/", "/buildables/") === "in" && dir("/buildables/", "/") === "out",
    "a page with no place in the banner is a layer: in onto it, out off it");
  check(dir("/designs/", "/designs/") === "same",
    "the same page with a different query is not a journey");
  check(w.wardogsTurn.rank("/privacy/") === null && w.wardogsTurn.rank("/index.html") === 0,
    "the front page matches only itself rather than every path as a prefix");
  /* The attribute lands where the stylesheet looks, from the Navigation API when there is
     one and from the referrer when there is not, and not at all under reduced motion. */
  const landed = (win, ref, loc) => {
    let got = null;
    new Function("window", "document", "location", turnSrc)(win,
      { referrer: ref, documentElement: { setAttribute: (k, v) => { got = k + "=" + v; } } }, loc);
    return got;
  };
  const here = { pathname: "/planner/", origin: "https://www.wardogsbuilder.com" };
  const noMotion = { matchMedia: () => ({ matches: false }) };
  check(landed({ ...noMotion, navigation: { activation: { from: { url: "https://www.wardogsbuilder.com/planner/" } } } },
    "", { pathname: "/armory/", origin: "https://www.wardogsbuilder.com" }) === "data-nav=fwd",
    "the attribute is set from navigation.activation");
  check(landed(noMotion, "https://www.wardogsbuilder.com/armory/", here) === "data-nav=back",
    "and from the referrer where there is no Navigation API");
  check(landed(noMotion, "https://elsewhere.example/armory/", here) === null &&
    landed(noMotion, "", here) === null,
    "and not at all from another site or a typed address");
  check(landed({ matchMedia: () => ({ matches: true }) }, "https://www.wardogsbuilder.com/armory/", here) === null,
    "nor for somebody who asked for less motion");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
