/* Fast structural checks on the built planner, run after build.ps1.
 *
 * These exist because of two bugs that shipped silently:
 *   1. Markup was deleted but the JS that reached for it stayed. getElementById
 *      returned null, the boot threw, and the whole app came up blank, with no design
 *      loaded, no zoom-to-fit, the empty-state stuck over a 62-piece base.
 *   2. build.ps1 read UTF-8 sources under Windows PowerShell 5.1, which assumes the
 *      ANSI codepage, and every arrow, dash and × in the app turned to mojibake.
 *
 * Neither showed up in the behavioural suites, because both broke the page rather
 * than the logic. Cheap to check, so check on every build.
 */
const fs = require("fs");
const path = require("path");

const proj = path.resolve(__dirname, "..");
const SITE = "https://www.wardogsbuilder.com";   // matches build-site.js
const app = fs.readFileSync(path.join(proj, "docs/planner/index.html"), "utf8");
// The other half of the pair. Several checks below are about this file specifically, and
// leaving them pointed at the hosted copy is what made them stop meaning anything.
const download = fs.readFileSync(path.join(proj, "WardogsBaseBuilder.html"), "utf8");
const catalog = JSON.parse(fs.readFileSync(path.join(proj, "data/buildables.json"), "utf8"));

let fail = 0;
const check = (ok, label, detail) => {
  console.log((ok ? "  ok   " : "  FAIL ") + label + (ok || !detail ? "" : ": " + detail));
  if (!ok) fail++;
};

/* -- 0. the app's script actually parses --
   A bulk find-and-replace across the template once ate the tail of a template literal and
   every check below still passed, because the page was structurally fine and simply did not
   run. Parse it.

   This used to take the first <script> after the styles and the last </script> and parse
   everything between as one blob, which quietly assumed the planner had exactly one inline
   script. The moment the hosted build gained a second one it was slicing markup into the
   parser and reporting the app as broken. Parse each inline script on its own, the way the
   site-page check below already does. */
{
  const bad = [];
  for (const m of app.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)) {
    try { new (require("vm").Script)(m[1]); }
    catch (ex) { bad.push(ex.message); }
  }
  check(bad.length === 0, "planner scripts parse", bad[0]);
}

/* -- 0b. and so does every script on every generated page --
   The planner has been parse-checked since the day a bulk edit ate a template literal and
   shipped a structurally perfect dead page. The surrounding site had no such check, so a
   quote that survived one layer of nesting and not the next got all the way to a browser:
   the page rendered, the table under it stayed empty, and nothing here complained. Same
   check, every page. */
{
  const pages = [];
  (function walk(d) {
    for (const f of fs.readdirSync(d)) {
      const p = path.join(d, f);
      if (fs.statSync(p).isDirectory()) walk(p);
      else if (f.endsWith(".html")) pages.push(p);
    }
  })(path.join(proj, "docs"));

  const broken = [];
  for (const p of pages) {
    const s = fs.readFileSync(p, "utf8");
    for (const m of s.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)) {
      const body = m[1].trim();
      if (!body || /^\s*\{[\s\S]*\}\s*$/.test(body)) continue;   // JSON-LD, not code
      try { new (require("vm").Script)(body); }
      catch (ex) { broken.push(path.relative(proj, p) + ": " + ex.message); }
    }
  }
  check(broken.length === 0, `inline scripts parse on all ${pages.length} pages`,
    [...new Set(broken)].slice(0, 3).join(" | "));

  /* -- 0c. every page meant to be found is in the sitemap --
     The sitemap is a hand-kept list sitting next to a generator that already knows every
     page it wrote, so adding a page and forgetting the list is a one-line mistake nobody
     would notice. A page carrying noindex is opted out on purpose and does not count. */
  const sitemap = fs.readFileSync(path.join(proj, "docs", "sitemap.xml"), "utf8");
  const unlisted = [];
  for (const p of pages) {
    const s = fs.readFileSync(p, "utf8");
    if (/name="robots" content="noindex/.test(s)) continue;
    const rel = path.relative(path.join(proj, "docs"), p).replace(/\\/g, "/");
    if (rel !== "index.html" && !rel.endsWith("/index.html")) continue;
    const url = "/" + rel.replace(/index\.html$/, "");
    if (!sitemap.includes("<loc>" + SITE + url + "</loc>")) unlisted.push(url);
  }
  check(unlisted.length === 0, "every indexable page is in the sitemap", unlisted.join(", "));
}

// -- 1. every element the script reaches for actually exists in the markup --
const ids = new Set([...app.matchAll(/\bid="([A-Za-z0-9_-]+)"/g)].map(m => m[1]));
const looked = [...new Set([...app.matchAll(/getElementById\("([A-Za-z0-9_-]+)"\)/g)].map(m => m[1]))];
const orphans = looked.filter(id => !ids.has(id));
check(orphans.length === 0, `all ${looked.length} getElementById targets exist`, orphans.join(", "));

// -- 2. text survived the build as UTF-8 --
const mojibake = app.match(/Ã.|â€.|â‡.|Â./g);
check(!mojibake, "no mojibake from a codepage mismatch",
  mojibake && [...new Set(mojibake)].slice(0, 6).join(" "));

/* -- 3. every catalog icon was actually inlined --
   This used to walk `catalog.buildables` alone, and the FOB is not in that array: it sits
   beside it as `catalog.fob`. So the one icon a player sees before they have placed anything
   was the only icon nothing checked, and a wrong FOB icon shipped twice and had to be
   reported twice by the user before anyone noticed. Walk every icon the catalog names,
   wherever in the file it lives, and check the file exists as well as that it was inlined:
   a name pointing at nothing inlines nothing and would otherwise fail silently. */
{
  const named = [];
  (function collect(node, where) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) return node.forEach((n, i) => collect(n, where + "[" + i + "]"));
    for (const [k, v] of Object.entries(node)) {
      if (k === "icon" && typeof v === "string" && v) named.push({ icon: v, where });
      else collect(v, where + "." + k);
    }
  })(catalog, "catalog");

  const iconDir = path.join(proj, "assets", "icons");
  const onDisk = new Set(fs.existsSync(iconDir) ? fs.readdirSync(iconDir) : []);
  const bad = named.filter(n => !onDisk.has(n.icon) || !app.includes('"' + n.icon + '":"data:'));
  check(bad.length === 0, `all ${named.length} catalog icons exist and are inlined`,
    bad.map(n => n.icon + " (" + n.where + ")").join(", "));

  /* The check above was necessary and not sufficient. It proved the catalog's icon names
     were real, while the planner hardcoded `icon:"fob.svg"` in fobDef() and never read
     catalog.fob.icon at all. So the catalog could name a file, the file could exist, the
     file could be inlined, every check could pass, and the plan could still show a blank
     square, because the planner was asking for a different name. That is what "the FOB is
     still using the old image" was, twice.

     Any icon filename written literally in the planner has to be one the catalog names.
     A literal that nothing in data/ agrees with is a second home for a value, which in
     this project always ends the same way. */
  const known = new Set(named.map(n => n.icon));
  // Comments talk about filenames, including the comment explaining this very check.
  // Strip them, or the note about the bug reads as the bug.
  const plannerCode = fs.readFileSync(path.join(proj, "src/app-template.html"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^[ \t]*\/\/[^\n]*$/gm, " ");
  const literals = [...new Set(
    [...plannerCode.matchAll(/["']([A-Za-z0-9_-]+\.(?:webp|svg|png))["']/g)].map(m => m[1]))];
  const orphanLiterals = literals.filter(f => !known.has(f));
  check(orphanLiterals.length === 0,
    "the planner names no icon the catalog does not",
    orphanLiterals.join(", ") + " (hardcoded in src/app-template.html)");
}

/* -- 3b. the planner people download ships no advertising identity at all --
   This used to read the hosted planner, which was the same thing back when the two builds
   differed only by an API string. They no longer do: the hosted copy carries one ad at the
   foot of the right panel and the downloadable one carries none, so the assertion has to
   name the file it is actually about. A publisher id inside a file people keep on a disk is
   an advertising identity travelling with them, and the catalog is inlined wholesale, which
   is why the ad config sits in data/ads.json and never in buildables.json. */
{
  const ads = JSON.parse(fs.readFileSync(path.join(proj, "data/ads.json"), "utf8"));
  const leaked = (ads.publisherId || "").trim();
  check(!leaked || !download.includes(leaked),
    "the downloadable planner carries no publisher id");
  check(!/adsbygoogle|__AD_HEAD__|__AD_PANEL__/.test(download),
    "the downloadable planner carries no ad markup",
    "an unreplaced placeholder counts: it means the offline build stopped stripping them");
}

/* -- 3b-ii. a slot that is configured actually reaches a page --
   adSlot() returns an empty string for anything it does not recognise, so a slot named in
   ads.json that the generator has no format for, or that no page ever calls, costs nothing
   and says nothing: the build is green and the unit simply never fills. AdSense reports
   that as zero impressions weeks later. Every id with a value in ads.json has to show up
   in the built site. */
{
  const ads = JSON.parse(fs.readFileSync(path.join(proj, "data/ads.json"), "utf8"));
  if ((ads.publisherId || "").trim()) {
    let html = "";
    (function walk(d) {
      for (const f of fs.readdirSync(d)) {
        const q = path.join(d, f);
        if (fs.statSync(q).isDirectory()) walk(q);
        else if (f.endsWith(".html")) html += fs.readFileSync(q, "utf8");
      }
    })(path.join(proj, "docs"));

    for (const [name, id] of Object.entries(ads.slots || {})) {
      if (!String(id).trim()) continue;
      check(html.includes(`data-ad-slot="${id}"`),
        `the ${name} ad slot is placed on a page`, `id ${id} appears nowhere in docs/`);
    }
  }
}

// -- 3c. the downloadable copy really is offline --
// The hosted planner can save against a Discord account; the file people download must
// not be able to reach anything. Same source, and the difference is one injected string,
// so it is exactly the kind of thing that breaks quietly.
{
  const offline = fs.readFileSync(path.join(proj, "WardogsBaseBuilder.html"), "utf8");
  check(offline.includes('const CLOUD_API = "";'),
    "the downloadable planner has no API configured");
  check(!/fetch\(\s*CLOUD_API\s*\+/.test(offline) || offline.includes('const CLOUD_API = "";'),
    "and so cannot reach the network");
  const community = JSON.parse(fs.readFileSync(path.join(proj, "data/community.json"), "utf8"));
  if ((community.voteApi || "").trim()) {
    check(app.includes('const CLOUD_API = "' + community.voteApi + '";'),
      "the hosted planner does have it, so saving online works");
  }
}

// -- 3d. regex escapes survived the template literals they were written in --
// A `\w` written inside a JS template literal is just `w` by the time it reaches the
// page, so /[\w.-]+/ shipped as /[w.-]+/ and silently matched almost nothing. It broke
// sign-in for a day and looked like a Discord problem. Any class that mentions a bare
// shorthand letter without its backslash is almost certainly this bug.
{
  const pages = [];
  (function walk(d) {
    for (const f of fs.readdirSync(d)) {
      const p = path.join(d, f);
      if (fs.statSync(p).isDirectory()) walk(p);
      else if (f.endsWith(".html")) pages.push(p);
    }
  })(path.join(proj, "docs"));

  // A class like [w.-] or [d-] is a mangled [\w.-] or [\d-]. A real class wanting a
  // literal w would not put it alone beside punctuation.
  const mangled = /\[\^?[wdsWDS][.\-][^\]]{0,10}\]|\[\^?[^\]]{0,10}[.\-][wdsWDS]\]/;
  const bad = [];
  for (const p of pages) {
    const s = fs.readFileSync(p, "utf8");
    for (const m of s.matchAll(/(.?)(\[\^?[^\]\n]{1,24}\])/g)) {
      const before = m[1], cls = m[2];
      // `[...set]` is spread syntax, not a character class
      if (cls.includes("...") || cls.includes("\\")) continue;
      // `obj[w.calibre]` is a property lookup. A character class never follows an
      // identifier, a closing bracket or a closing paren, so anything that does is
      // ordinary code and not a chewed-up escape.
      if (/[A-Za-z0-9_$\])]/.test(before)) continue;
      if (mangled.test(cls)) bad.push(path.relative(proj, p) + "  " + cls);
    }
  }
  check(bad.length === 0, "no regex escapes were eaten by a template literal",
    [...new Set(bad)].slice(0, 3).join(" | "));
}

/* -- 3e. game icons: every reference resolves and every file is accounted for --
   The wiki icons under docs/game-icons/ are joined to items by slug in three places:
   data/armory.json (via build-armory.js), the pages that render them, and the catalog in
   data/game-icons.json that records what the wiki actually served. A slug drifting in any
   one of them ships a broken image, so all three are held against the files on disk. */
{
  const iconDir = path.join(proj, "docs/game-icons");
  const onDisk = new Set(fs.existsSync(iconDir)
    ? fs.readdirSync(iconDir).filter(f => f.endsWith(".png")) : []);
  const gameIcons = JSON.parse(fs.readFileSync(path.join(proj, "data/game-icons.json"), "utf8"));
  const armory = JSON.parse(fs.readFileSync(path.join(proj, "data/armory.json"), "utf8"));

  const badItem = armory.items.filter(i => i.icon && !onDisk.has(i.icon + ".png"))
    .map(i => i.name + " -> " + i.icon);
  check(badItem.length === 0, "every armory icon slug has its file in docs/game-icons",
    badItem.slice(0, 3).join(" | "));

  const pages = [];
  (function walk(d) {
    for (const f of fs.readdirSync(d)) {
      const p = path.join(d, f);
      if (fs.statSync(p).isDirectory()) walk(p);
      else if (f.endsWith(".html")) pages.push(p);
    }
  })(path.join(proj, "docs"));
  const badRef = [];
  for (const p of pages) {
    const s = fs.readFileSync(p, "utf8");
    for (const m of s.matchAll(/\/game-icons\/([A-Za-z0-9_.-]+\.png)/g)) {
      if (!onDisk.has(m[1])) badRef.push(path.relative(proj, p) + "  " + m[1]);
    }
  }
  check(badRef.length === 0, "every /game-icons/ reference in the site points at a real file",
    [...new Set(badRef)].slice(0, 3).join(" | "));

  const cataloged = new Set(gameIcons.items.map(i => i.slug + ".png"));
  const strays = [...onDisk].filter(f => !cataloged.has(f));
  check(strays.length === 0, "no icon file sits outside data/game-icons.json",
    strays.slice(0, 3).join(", "));
  const lying = gameIcons.items.filter(i => i.hasIcon === true && !onDisk.has(i.slug + ".png"))
    .map(i => i.slug);
  check(lying.length === 0, "every icon the catalog says was fetched is on disk",
    lying.slice(0, 3).join(", "));

  /* The icons are the site's business only. The downloadable planner naming one would be
     a network fetch, and the offline promise is the whole point of that file. */
  check(!download.includes("/game-icons/"), "the downloadable planner never references game icons");

  /* -- buildable icons: the same join, one folder over --
     assets/icons/ feeds two consumers that must not be confused. build.ps1 inlines it into
     the planner as data URIs, because that file opens with no network; it also copies it to
     docs/build-icons/ for the site, which has one. The buildables page used to inline it
     too and shipped 585 KB of art its default view never painted. Now that it names files,
     a renamed icon in data/buildables.json is a broken picture instead of a missing key,
     so every reference is held against the folder. */
  const buildIconDir = path.join(proj, "docs/build-icons");
  const buildIcons = new Set(fs.existsSync(buildIconDir)
    ? fs.readdirSync(buildIconDir).filter(f => f.endsWith(".webp")) : []);
  const cat = JSON.parse(fs.readFileSync(path.join(proj, "data/buildables.json"), "utf8"));

  const badBuild = cat.buildables.filter(b => b.icon && !buildIcons.has(b.icon))
    .map(b => b.name + " -> " + b.icon);
  check(badBuild.length === 0, "every buildable icon has its file in docs/build-icons",
    badBuild.slice(0, 3).join(" | "));

  const badBuildRef = [];
  for (const p of pages) {
    const s = fs.readFileSync(p, "utf8");
    for (const m of s.matchAll(/\/build-icons\/([A-Za-z0-9_.-]+\.webp)/g)) {
      if (!buildIcons.has(m[1])) badBuildRef.push(path.relative(proj, p) + "  " + m[1]);
    }
  }
  check(badBuildRef.length === 0, "every /build-icons/ reference in the site points at a real file",
    [...new Set(badBuildRef)].slice(0, 3).join(" | "));

  check(!download.includes("/build-icons/"),
    "the downloadable planner never references buildable icons by URL");

  /* The point of the change was weight. The page inlined every icon and hid them behind a
     view you had to ask for; if base64 creeps back in, this says so while it is still one
     commit rather than after the page is heavy again. */
  const buildablesPage = fs.readFileSync(path.join(proj, "docs/buildables/index.html"), "utf8");
  check(!/src="data:image/.test(buildablesPage),
    "the buildables page serves its icons as files, not base64");
}

/* -- 3f. the armory detail panel: the joins that feed it --
   The panel is the only place a stat is shown next to the item it belongs to, and it gets
   there by joining data/ballistics.json to data/armory.json on the item name. Two files, two
   editors, no foreign key between them: rename a weapon on either side and the join silently
   stops landing, the panel quietly loses its stats, and the page still builds and still looks
   right. That is the whole failure mode, so the join is asserted rather than trusted.

   These are exact counts on purpose. "Most of them match" is the state this is meant to
   catch. */
{
  const armory = JSON.parse(fs.readFileSync(path.join(proj, "data/armory.json"), "utf8"));
  const ball = JSON.parse(fs.readFileSync(path.join(proj, "data/ballistics.json"), "utf8"));
  const names = new Set(armory.items.map(i => i.name));

  const orphan = (label, list) => {
    const missing = list.filter(n => !names.has(n));
    check(missing.length === 0, "every " + label + " joins an armory item by name",
      missing.slice(0, 3).join(" | "));
  };
  orphan("figured weapon", ball.weapons.map(w => w.name));
  orphan("unfigurable weapon", (ball.unfiguredWeapons || []).map(w => w.name));
  orphan("armour piece", ball.armour.flatMap(a => a.vendor || []));
  orphan("priced round", ball.calibres.flatMap(c => Object.values(c.vendor || {})));

  /* A figured weapon stores a calibre id and the panel prints the calibre's name, so an id
     with no entry would print raw: "556" where the site says "5.56mm". */
  const calIds = new Set(ball.calibres.map(c => c.id));
  const strayCal = ball.weapons.map(w => w.calibre).filter(c => c && !calIds.has(c));
  check(strayCal.length === 0, "every weapon calibre id resolves to a calibre",
    [...new Set(strayCal)].join(", "));

  const armoryPage = fs.readFileSync(path.join(proj, "docs/armory/index.html"), "utf8");
  check(/<dialog id="detail"/.test(armoryPage), "the armory ships the item detail dialog");
  /* Every card and row has to carry the index the dialog opens by. One that does not is a
     dead item: it looks clickable and does nothing. */
  const openers = (armoryPage.match(/data-item="\d+"/g) || []).length;
  check(openers === armory.items.length * 2,
    "every item opens a detail panel from both the grid and the table",
    openers + " openers for " + armory.items.length + " items, expected " +
      armory.items.length * 2);

  /* The vehicles page became a doorway. GitHub Pages cannot send a 301, so the meta refresh
     is the redirect, and losing it turns the URL into a page that says "moved" and does not
     move. It is also the reason the stub must stay out of the index: two URLs claiming the
     same content is the thing canonical and noindex are here to prevent. */
  const stub = fs.readFileSync(path.join(proj, "docs/vehicles/index.html"), "utf8");
  check(/http-equiv="refresh" content="0; url=\/armory\/"/.test(stub),
    "the vehicles URL still redirects to the armory");
  check(/rel="canonical" href="[^"]*\/armory\/"/.test(stub),
    "the vehicles stub points its canonical at the armory");
  check(/content="noindex/.test(stub), "the vehicles stub is not indexable");
  const sitemapXml = fs.readFileSync(path.join(proj, "docs/sitemap.xml"), "utf8");
  check(!sitemapXml.includes("/vehicles/</loc>"),
    "the vehicles stub is not advertised in the sitemap");
}

/* -- 4. nothing reaches the network: offline is the whole promise --
   Read the downloadable file, not the hosted one. The two were interchangeable for this
   purpose until the hosted copy started loading an ad script. Had this stayed pointed at
   the hosted planner it would have had to be loosened to allow that, and a check loosened
   to pass is a check that has stopped guarding the only file the promise is about. */
const externals = src => [...src.matchAll(/(?:src|href)="(https?:\/\/[^"]+)"/g)]
  .map(m => m[1])
  .filter(u => !/schema\.org|og:|^https?:\/\/www\.wardogsbuilder\.com/.test(u));

const remote = externals(download);
check(remote.length === 0, "the downloadable planner loads nothing external",
  remote.slice(0, 3).join(", "));

/* The hosted planner may reach exactly one outside origin, the AdSense loader. Anything
   else arriving here is a dependency nobody decided to take on. */
{
  const stray = externals(app).filter(u => !/^https:\/\/pagead2\.googlesyndication\.com\//.test(u));
  check(stray.length === 0, "the hosted planner loads nothing beyond the ad script",
    stray.slice(0, 3).join(", "));
}

// -- 5. the estimate question marks the user asked us to drop are gone --
check(!/[>\s]\?<\/span>/.test(app), "no leftover '?' estimate badges");

// -- 6. figures the user has corrected must not be hardcoded in the markup --
// Pallet size and FOB starting stock have each been corrected several times; twice the
// catalog was updated and a duplicate in the HTML was not, and the app shipped the old
// number anyway. They are only allowed to come from the catalog now.
{
  const stale = [];
  if (/id="palletSize"[^>]*value=/.test(app)) stale.push("palletSize has a hardcoded value");
  check(stale.length === 0, "supply figures come from the catalog, not the markup", stale.join("; "));

  const pallet = catalog.logistics && catalog.logistics.suppliesPerPallet;
  const stock = catalog.fob && catalog.fob.startingSupplies;
  check(app.includes('"suppliesPerPallet": ' + pallet), "catalog pallet size (" + pallet + ") is inlined");
  check(app.includes('"startingSupplies": ' + stock), "catalog FOB stock (" + stock + ") is inlined");

  /* Guarding the two inputs was not enough. The pallet size was also written into the help
     text as prose, the catalog moved to 1,800 and the prose stayed on 1,900, and the app
     told players the wrong number for months while every check above it passed. Any figure
     written out with a thousands comma is one of these two claims or a drifted copy of one,
     so the prose has to interpolate rather than spell it out.

     Comments are stripped first, because "prose" means what a player is shown and a comment
     is not that. The check used to read the whole file, so documenting the share codec as
     "13,607 characters becomes about 1,430" failed the build over a compressed byte count
     that has nothing to do with supplies. A check that fires on correct code is one people
     learn to work around, which costs more than the bug it was guarding.

     String literals are deliberately kept: the help text is built in JS, so a drifted figure
     can genuinely live in one, and that is the case this exists for. */
  const prose = app
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  const written = [...new Set(prose.match(/\b\d,\d{3}\b/g) || [])];
  const fromCatalog = new Set([pallet.toLocaleString("en-US"), stock.toLocaleString("en-US")]);
  const drifted = written.filter(n => !fromCatalog.has(n));
  check(drifted.length === 0,
    "no supply figure is spelled out in the app's prose", drifted.join(", "));
}

// -- 6b. no em dashes, anywhere --
// A house style rule, not a bug: the owner does not want them in the writing. They creep
// back in one sentence at a time, so the build refuses them rather than relying on memory.
{
  /* This used to name four files. Then the site generator was split across fifteen and the
     check quietly stopped watching most of the prose on the site, because the list did not
     know. Walk the source trees instead, so a new file is covered the moment it exists. */
  const hits = [];
  // .claude/skills/ holds a vendored third-party skill. Its prose is not ours to restyle.
  const roots = ["src", "tools", "data", "worker", "docs", "map"];
  const scan = d => {
    if (!fs.existsSync(d)) return;
    for (const f of fs.readdirSync(d)) {
      const p = path.join(d, f);
      if (fs.statSync(p).isDirectory()) {
        // docs/ is mostly generated output; only its hand-written notes are sources
        if (path.relative(proj, p).startsWith("docs")) continue;
        scan(p);
      } else if (/\.(html|js|mjs|json|md)$/.test(f)) {
        const rel = path.relative(proj, p).replace(/\\/g, "/");
        if (rel.startsWith("docs/") && !rel.endsWith(".md")) continue;
        const n = (fs.readFileSync(p, "utf8").match(/\u2014/g) || []).length;
        if (n) hits.push(`${rel} (${n})`);
      }
    }
  };
  roots.forEach(r => scan(path.join(proj, r)));
  for (const f of ["README.md", "CLAUDE.md"]) {
    const n = (fs.readFileSync(path.join(proj, f), "utf8").match(/\u2014/g) || []).length;
    if (n) hits.push(`${f} (${n})`);
  }
  check(hits.length === 0, "no em dashes in the sources", hits.join(", "));
}

/* -- 6c. the edit map points at things that exist --
   A map whose links are broken is worse than no map: it costs a read to find that out, and
   it teaches the next reader not to trust it. Two failures matter. A relative link to a
   file that is not there, and an entry-file twin that has been hand-edited so the three
   catalogs disagree about where things live. */
{
  const mapDir = path.join(proj, "map");
  const pages = [];
  (function walk(d) {
    for (const f of fs.readdirSync(d)) {
      const p = path.join(d, f);
      if (fs.statSync(p).isDirectory()) walk(p);
      else if (f.endsWith(".md")) pages.push(p);
    }
  })(mapDir);

  const broken = [];
  for (const p of pages) {
    const s = fs.readFileSync(p, "utf8");
    for (const m of s.matchAll(/\]\(([^)#:]+\.md[^)#]*)\)/g)) {
      const target = path.resolve(path.dirname(p), m[1]);
      if (!fs.existsSync(target)) {
        broken.push(path.relative(proj, p).replace(/\\/g, "/") + " -> " + m[1]);
      }
    }
  }
  check(broken.length === 0, `all links in the ${pages.length} map files resolve`,
    broken.slice(0, 3).join(" | "));

  const { SOURCE, TWINS, banner } = require("./sync-map-twins.js");
  const want = banner + fs.readFileSync(SOURCE, "utf8");
  const stale = TWINS.filter(t => {
    const p = path.join(mapDir, t);
    return !fs.existsSync(p) || fs.readFileSync(p, "utf8") !== want;
  });
  check(stale.length === 0, "map entry-file twins match their source", stale.join(", "));
}

// -- 7. nothing removed from the catalog is still named in the prose --
{
  const gone = ["Refuel Station", "Repair Station"]
    .filter(n => !catalog.buildables.some(b => b.name === n) && app.includes(n));
  check(gone.length === 0, "removed buildables are not still mentioned", gone.join(", "));
}

/* -- 8. the worker never falls back to a secret that is written down in this repository --
   The session signing key and the identity salt both used to end in `|| "wardogs"`, so a
   deploy that was missing its secrets came up anyway and signed sessions with a key printed in
   a public file. Anybody who read it could have minted a token for any account, the owner's
   included, and nothing about that deploy would have looked wrong from outside. Missing
   secrets refuse to serve now, and this is the check that it stays that way, because a default
   is exactly what is tempting to write the next time a deploy will not come up. */
{
  const src = fs.readFileSync(path.join(proj, "worker/vote-worker.js"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, " ")      // block comments are prose, not code
    .replace(/(^|[^:])\/\/[^\n]*/gm, "$1"); // and so are line comments, minus the // in a URL
  const SECRETS = "SESSION_SECRET|VOTE_SALT|ADMIN_TOKEN|DISCORD_CLIENT_ID|DISCORD_CLIENT_SECRET";
  /* `|| ""` is a no-secret default and is how the code says "there isn't one". Any other
     string literal is a secret sitting in the open. */
  const defaults = [...src.matchAll(
    new RegExp(`env\\.(?:${SECRETS})\\s*(?:\\|\\||\\?\\?)\\s*(["'\`])(?!\\1)`, "g"))]
    .map(m => m[0].replace(/\s+/g, " "));
  check(defaults.length === 0,
    "the worker has no hardcoded fallback for any of its secrets", defaults.join(" | "));
}

console.log(fail ? `\n${fail} structural check(s) failed` : "\nbuild looks structurally sound");
process.exit(fail ? 1 : 0);
