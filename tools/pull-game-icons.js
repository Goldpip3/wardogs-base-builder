/* Pulls the game item icons published by the wardogs.zone fan wiki into docs/game-icons/,
 * and keeps the catalog of what exists in data/game-icons.json.
 *
 *   node tools/pull-game-icons.js              fetch any icons the catalog lists but disk lacks
 *   node tools/pull-game-icons.js --refresh    re-scrape the item catalog first, then fetch
 *   node tools/pull-game-icons.js --force      re-download even if the PNG is already on disk
 *
 * Why this exists: the loadout and damage pages want the in-game item art, and the wiki
 * serves every icon at a stable /game/icons/<slug>.png URL with the item names sitting in
 * server-rendered category pages. This tool is the only place that URL knowledge lives.
 *
 * Never part of build.ps1: the build must stay offline-deterministic. Run this by hand,
 * commit what it fetched, then build.
 *
 * Like pull-community.js, the catalog only ever adds or updates; nothing is deleted here.
 * An item vanishing from the wiki should not silently delete an icon pages already use.
 * Removing one is a deliberate act: delete the PNG and drop its catalog entry together.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const FILE = path.join(ROOT, "data/game-icons.json");
const DIR = path.join(ROOT, "docs/game-icons");
const BASE = "https://wardogs.zone";
const UA = "wardogsbuilder.com icon sync";
const CATEGORIES = ["weapons", "ammo", "equipment", "attachments", "vehicles"];
const DELAY_MS = 300;

const sleep = ms => new Promise(r => setTimeout(r, ms));

// The wiki is a Next.js site but the category pages arrive server-rendered: every item
// card is an <a aria-label="Item Name" ... href="/database/slug">. That pair is all the
// catalog needs. Entities and dashes are normalised because check-build refuses em dashes
// anywhere, data files included.
/* The dashes are written as escapes on purpose: a literal en or em dash in this file is
   itself what the no-em-dash check forbids, so spelling them out would fail the build the
   moment this line was added to strip them. */
const cleanName = s => s
  .replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/[\u2013\u2014]/g, "-")
  .replace(/\s+/g, " ").trim();

async function fetchPage(url) {
  const r = await fetch(url, { headers: { "user-agent": UA } });
  if (!r.ok) throw new Error("HTTP " + r.status + " on " + url);
  return r.text();
}

async function refreshCatalog(catalog) {
  const byId = new Map(catalog.items.map(i => [i.slug, i]));
  let added = 0;
  for (const cat of CATEGORIES) {
    const html = await fetchPage(BASE + "/database/" + cat);
    const re = /<a aria-label="([^"]+)"[^>]*href="\/database\/([a-z0-9_.-]+)"/g;
    let m, found = 0;
    while ((m = re.exec(html))) {
      const name = cleanName(m[1]);
      const slug = m[2];
      if (slug === "compare" || name.startsWith("Compare ")) continue;
      found++;
      const was = byId.get(slug);
      if (!was) { byId.set(slug, { slug, name, cat }); added++; }
      else { was.name = name; was.cat = cat; }
    }
    if (!found) throw new Error("scrape found nothing on /database/" + cat +
      ", the wiki markup has probably changed; refusing to write an emptier catalog");
    console.log("  /database/" + cat + ": " + found + " item(s)");
    await sleep(DELAY_MS);
  }
  catalog.items = [...byId.values()].sort((a, b) => a.slug.localeCompare(b.slug));
  catalog.fetchedOn = new Date().toISOString().slice(0, 10);
  console.log("Catalog: " + catalog.items.length + " item(s), " + added + " new.");
}

(async () => {
  const refresh = process.argv.includes("--refresh");
  const force = process.argv.includes("--force");

  let catalog;
  if (fs.existsSync(FILE)) {
    catalog = JSON.parse(fs.readFileSync(FILE, "utf8"));
  } else {
    catalog = {
      _note: "Item catalog of the wardogs.zone fan wiki: which items exist and which have " +
        "an icon fetched into docs/game-icons/. hasIcon false means the wiki confirmed 404. " +
        "Regenerate with tools/pull-game-icons.js.",
      source: BASE + "/database",
      fetchedOn: null,
      items: [],
    };
  }

  if (refresh || !catalog.items.length) {
    console.log("Scraping the item catalog...");
    await refreshCatalog(catalog);
  }

  fs.mkdirSync(DIR, { recursive: true });

  let fetched = 0, present = 0, missing = 0, errored = 0;
  for (const it of catalog.items) {
    const file = path.join(DIR, it.slug + ".png");
    if (!force && fs.existsSync(file)) { present++; if (it.hasIcon !== true) it.hasIcon = true; continue; }
    if (it.hasIcon === false && !force) { missing++; continue; }

    let ok = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const r = await fetch(BASE + "/game/icons/" + it.slug + ".png", { headers: { "user-agent": UA } });
        if (r.status === 404) { it.hasIcon = false; missing++; ok = true; break; }
        if (r.status >= 500) throw new Error("HTTP " + r.status);
        if (!r.ok) throw new Error("HTTP " + r.status);
        const type = r.headers.get("content-type") || "";
        const body = Buffer.from(await r.arrayBuffer());
        if (!type.includes("image/png") || !body.length) throw new Error("not a png (" + type + ")");
        fs.writeFileSync(file, body);
        it.hasIcon = true; fetched++; ok = true;
        break;
      } catch (e) {
        if (attempt === 2) { console.error("  failed: " + it.slug + " (" + e.message + ")"); errored++; }
        else await sleep(1000);
      }
    }
    if (ok) await sleep(DELAY_MS);
  }

  catalog.items.sort((a, b) => a.slug.localeCompare(b.slug));
  fs.writeFileSync(FILE, JSON.stringify(catalog, null, 2) + "\n");

  console.log(catalog.items.length + " item(s) in data/game-icons.json: " +
    fetched + " fetched, " + present + " already on disk, " +
    missing + " with no icon on the wiki, " + errored + " errored. Run build.ps1.");
  if (errored) process.exit(1);
})();
