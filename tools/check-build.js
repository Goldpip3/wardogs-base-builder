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
const catalog = JSON.parse(fs.readFileSync(path.join(proj, "data/buildables.json"), "utf8"));

let fail = 0;
const check = (ok, label, detail) => {
  console.log((ok ? "  ok   " : "  FAIL ") + label + (ok || !detail ? "" : ": " + detail));
  if (!ok) fail++;
};

// -- 0. the app's script actually parses --
// A bulk find-and-replace across the template once ate the tail of a template literal
// and every check below still passed, because the page was structurally fine and simply
// did not run. Parse it.
{
  const s = app.indexOf("<script>", app.indexOf("</style>"));
  const e = app.lastIndexOf("</script>");
  let err = null;
  try { new (require("vm").Script)(app.slice(s + "<script>".length, e)); }
  catch (ex) { err = ex.message; }
  check(!err, "planner script parses", err);
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

// -- 3. every catalog icon was actually inlined --
const missingIcons = catalog.buildables
  .map(b => b.icon)
  .filter(icon => icon && !app.includes('"' + icon + '":"data:'));
check(missingIcons.length === 0,
  `all ${catalog.buildables.length} buildable icons inlined`, missingIcons.join(", "));

// -- 3b. the planner ships no advertising identity at all --
// The catalog is inlined wholesale, so anything left in it travels inside the offline
// file people download. Ad config lives in data/ads.json for exactly this reason.
{
  const ads = JSON.parse(fs.readFileSync(path.join(proj, "data/ads.json"), "utf8"));
  const leaked = (ads.publisherId || "").trim();
  check(!leaked || !app.includes(leaked), "planner carries no publisher id");
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

// -- 4. nothing reaches the network: offline is the whole promise --
const remote = [...app.matchAll(/(?:src|href)="(https?:\/\/[^"]+)"/g)]
  .map(m => m[1])
  .filter(u => !/schema\.org|og:|^https?:\/\/www\.wardogsbuilder\.com/.test(u));
check(remote.length === 0, "no external resource loads", remote.slice(0, 3).join(", "));

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
     so the prose has to interpolate rather than spell it out. */
  const written = [...new Set(app.match(/\b\d,\d{3}\b/g) || [])];
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

console.log(fail ? `\n${fail} structural check(s) failed` : "\nbuild looks structurally sound");
process.exit(fail ? 1 : 0);
