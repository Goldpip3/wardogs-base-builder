/* Everything the pages share: the data files, the helpers, and the bits of wiring that
   have to exist before any page can be written.

   Adding a page should not mean touching this file. Adding a new *kind* of shared thing,
   like another data source, is what this is for. */
module.exports = function buildContext() {
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const DOCS = path.join(ROOT, "docs");
const SITE = "https://www.wardogsbuilder.com";
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, "data/buildables.json"), "utf8"));


const byId = {};
for (const b of catalog.buildables) byId[b.id] = b;
byId["__fob__"] = { id: "__fob__", name: "FOB", footprint: catalog.fob.footprint,
                    height: catalog.fob.height, cost: 0, isFob: true, role: "fob",
                    tier: "small", tags: ["fob"] };

const esc = s => String(s).replace(/[&<>"']/g, c =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* ---------- ads ----------
   This file places the two slots on the content pages. The planner's own slot is not here:
   the planner is built by build.ps1, not by this generator, and only its hosted copy gets
   an ad. The file people download gets none and must get none, because it has to keep
   working with no network at all, and three checks in tools/check-build.js enforce that.
   With no publisher id configured nothing at all is emitted anywhere: no script tag, no
   slot, no reserved space. Fill in data/ads.json -> publisherId to switch it on. */
const ADS = JSON.parse(fs.readFileSync(path.join(ROOT, "data/ads.json"), "utf8"));
/* Ownership proofs for the search engines. Both are empty until the owner claims the site,
   and an empty one emits no tag: see data/search.json for how to fill them. */
const SEARCH = JSON.parse(fs.readFileSync(path.join(ROOT, "data/search.json"), "utf8"));
const VERIFY = [
  ["google-site-verification", (SEARCH.googleSiteVerification || "").trim()],
  ["msvalidate.01", (SEARCH.bingSiteVerification || "").trim()],
].filter(v => v[1])
 .map(v => '<meta name="' + v[0] + '" content="' + esc(v[1]) + '">')
 .join("\n");
const adsOn = !!(ADS.publisherId || "").trim();
const adScript = adsOn
  ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${esc(ADS.publisherId)}" crossorigin="anonymous"></script>`
  : "";
/* Not every slot is the same AdSense unit type, and each wants its own markup. The
   leaderboard and the artillery one are responsive display units; the in-article one is
   AdSense's fluid "in-article" format, which sizes itself to the text it sits in and reads
   as part of the page rather than as a banner. Getting the format attributes wrong is
   silent: the unit simply never fills. A name with no entry here is silent too, which is
   why a slot with an id and no placement fails the build. */
const AD_FORMATS = {
  leaderboard: { minHeight: 90, style: "display:block",
    attrs: `data-ad-format="auto" data-full-width-responsive="true"` },
  inArticle:   { minHeight: 280, style: "display:block;text-align:center",
    attrs: `data-ad-layout="in-article" data-ad-format="fluid"` },
  /* The artillery map's control column is 290px less its padding, so this is the same
     narrow-column case as the planner's panel: a responsive display unit, not the fluid
     in-article one, which wants the width of a paragraph to look right.

     150 rather than the panel unit's 250, and that number is measured rather than chosen.
     On a 900px screen the column has 210px between the end of the zone note and its own
     bottom edge, and the label, padding, margin and border around the unit eat 51 of them.
     Anything taller hangs past the bottom of the column on arrival, which is the one moment
     the unit is above the fold at all: once a solution is computed the solution block
     roughly triples, the zone note grows with it, and the ad is pushed out of view for the
     rest of the session. So it is sized to be wholly visible on load or not worth having. */
  artillery:   { minHeight: 150, style: "display:block",
    attrs: `data-ad-format="auto" data-full-width-responsive="true"` },
  /* The right rail, added because the map had width to spare that the firing solution did
     not need. The column is 300px so the widest unit AdSense sells for a rail can fit, and
     it is as tall as the tool, so a 300x600 can fill it where a 300x250 is the floor.
     Reserved at the floor rather than the ceiling: reserving 600 leaves a tall empty hole
     under every fill that comes back smaller, and this one is beside the map, where a hole
     is the most visible thing on the page. */
  artilleryRight: { minHeight: 250, style: "display:block",
    attrs: `data-ad-format="auto" data-full-width-responsive="true"` },
  /* Directly under the tool and above the reference, so it is the first thing anyone meets
     on the way off the map. Same shape and same reserved height as the leaderboard, because
     it is the same job in a different place. */
  artilleryFoot: { minHeight: 90, style: "display:block",
    attrs: `data-ad-format="auto" data-full-width-responsive="true"` },
};
function adSlot(which) {
  const slot = (ADS.slots || {})[which] || "";
  const fmt = AD_FORMATS[which];
  if (!adsOn || !slot || !fmt) return "";
  // reserve the height up front so an arriving ad can't shove the article down the page
  return `<div class="ad-slot" style="min-height:${fmt.minHeight}px">
  <ins class="adsbygoogle" style="${fmt.style}" data-ad-client="${esc(ADS.publisherId)}"
       data-ad-slot="${esc(slot)}" ${fmt.attrs}></ins>
  <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
</div>`;
}

/* ---------- share codes ----------
   The same wire format as the planner, implemented twice because they cannot share a
   module: one ships inside a standalone HTML file, the other runs at build time. v2 packs
   the body as column-major delta varints and deflates it, which takes a real 607 piece base
   down to roughly a fifteenth of its length, small enough to paste into a chat message.

   Deflate output is not canonical, so this and the planner will not always produce the
   same bytes for the same design, and that is fine and expected. What has to hold is that
   either side decodes the other's, which is what test/share-links.js now checks instead of
   string equality. v1 codes still decode here and always will. */
const zlib = require("zlib");
const toB64url = b => b.toString("base64")
  .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64url = s => Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");

function putVarint(out, n) {
  while (n >= 0x80) { out.push((n & 0x7f) | 0x80); n = Math.floor(n / 128); }
  out.push(n & 0x7f);
}
const zig = n => (n < 0 ? -n * 2 - 1 : n * 2);
const unzig = v => (v & 1 ? -(v + 1) / 2 : v / 2);

function packDesign(d) {
  const types = [];
  const idx = t => { let i = types.indexOf(t); if (i < 0) { i = types.length; types.push(t); } return i; };
  const rows = d.pieces.map(p => [idx(p.type), Math.round(p.x * 2), Math.round(p.y * 2),
                                  ((Math.round((p.rot || 0) / 90) % 4) + 4) % 4, p.level || 0, p.zone]);
  // crew rides in the head, same key and same omission rule as the planner
  const headObj = { n: d.name || "Shared design", t: types };
  if (d.crew) headObj.c = d.crew;
  const head = Buffer.from(JSON.stringify(headObj), "utf8");
  const body = [];
  putVarint(body, rows.length);
  for (const r of rows) putVarint(body, r[0]);
  let prev = 0; for (const r of rows) { putVarint(body, zig(r[1] - prev)); prev = r[1]; }
  prev = 0;     for (const r of rows) { putVarint(body, zig(r[2] - prev)); prev = r[2]; }
  for (const r of rows) putVarint(body, r[3]);
  for (const r of rows) putVarint(body, r[4]);
  for (const r of rows) if (types[r[0]] === "__fob__") putVarint(body, r[5] || 100);
  const len = Buffer.alloc(2); len.writeUInt16LE(head.length, 0);
  return Buffer.concat([len, head, Buffer.from(body)]);
}
function unpackDesign(buf) {
  const headLen = buf.readUInt16LE(0);
  const head = JSON.parse(buf.subarray(2, 2 + headLen).toString("utf8"));
  const body = buf.subarray(2 + headLen);
  let i = 0;
  const next = () => { let v = 0, shift = 1, b;
    do { b = body[i++]; v += (b & 0x7f) * shift; shift *= 128; } while (b & 0x80); return v; };
  const n = next();
  const ti = [], xs = [], ys = [], rots = [], lvls = [];
  for (let k = 0; k < n; k++) ti.push(next());
  let prev = 0; for (let k = 0; k < n; k++) { prev += unzig(next()); xs.push(prev); }
  prev = 0;     for (let k = 0; k < n; k++) { prev += unzig(next()); ys.push(prev); }
  for (let k = 0; k < n; k++) rots.push(next());
  for (let k = 0; k < n; k++) lvls.push(next());
  const out = [];
  for (let k = 0; k < n; k++) {
    const type = head.t[ti[k]];
    const p = { type, x: xs[k] / 2, y: ys[k] / 2, rot: rots[k] * 90, level: lvls[k] };
    if (type === "__fob__") p.zone = next();
    out.push(p);
  }
  return out;
}

function encodeDesign(d) {
  return "~" + toB64url(zlib.deflateRawSync(packDesign(d), { level: 9 }));
}
function encodeDesignV1(d) {
  const types = [];
  const idx = t => { let i = types.indexOf(t); if (i < 0) { i = types.length; types.push(t); } return i; };
  const pieces = d.pieces.map(p => {
    const a = [idx(p.type), Math.round(p.x * 2), Math.round(p.y * 2), p.rot || 0, p.level || 0];
    if (p.type === "__fob__") a.push(p.zone || 100);
    return a;
  });
  /* `|| "Shared design"` matches the planner, which is the thing that has to read these
     back. Without it an unnamed design encoded here and an unnamed design encoded there
     produce different codes for the same base, which is the whole failure mode this
     duplicated encoder invites. test/share-links.js compares the two directly. */
  const o = { v: 1, n: d.name || "Shared design", t: types, p: pieces };
  if (d.crew) o.c = d.crew;
  const json = JSON.stringify(o);
  return Buffer.from(json, "utf8").toString("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/* ---------- design helpers ---------- */
const P = (type, x, y, rot = 0, level = 0) => ({ type, x, y, rot, level });
function run(type, x0, y0, x1, y1, rot = 0) {
  const def = byId[type];
  const rad = (rot * Math.PI) / 180, c = Math.abs(Math.cos(rad)), s = Math.abs(Math.sin(rad));
  const extX = def.footprint.w * c + def.footprint.d * s;
  const extY = def.footprint.w * s + def.footprint.d * c;
  const horiz = Math.abs(x1 - x0) >= Math.abs(y1 - y0);
  const step = Math.max(0.5, horiz ? extX : extY);
  const dist = horiz ? Math.abs(x1 - x0) : Math.abs(y1 - y0);
  const n = Math.floor(dist / step + 1e-6) + 1;
  const sign = (horiz ? x1 - x0 : y1 - y0) < 0 ? -1 : 1;
  const out = [];
  for (let i = 0; i < n; i++)
    out.push(horiz ? P(type, x0 + i * step * sign, y0, rot) : P(type, x0, y0 + i * step * sign, rot));
  return out;
}
function ring(radius) {
  const out = [];
  for (let x = -radius; x <= radius; x++)
    for (let y = -radius; y <= radius; y++)
      if (Math.max(Math.abs(x), Math.abs(y)) === radius) out.push([x, y]);
  return out;
}
function pit(weapon, cx, cy, radius = 3) {
  const out = [P(weapon, cx, cy)];
  for (const [x, y] of ring(radius))
    out.push(P(x === 0 && y === radius ? "door" : "hesco-small", cx + x, cy + y));
  return out;
}

/* ---------- community designs ----------
   Nothing here is authored by the site. Players submit a share link, it gets added to
   data/community.json, and the build turns it into a page. Votes are not stored in the
   repo - they come from the vote worker at runtime (see worker/vote-worker.js), so the
   ranking cannot be quietly edited by whoever owns the repo. */
const COMMUNITY = JSON.parse(fs.readFileSync(path.join(ROOT, "data/community.json"), "utf8"));
const BALLISTICS = JSON.parse(fs.readFileSync(path.join(ROOT, "data/ballistics.json"), "utf8"));
const ARMORY = JSON.parse(fs.readFileSync(path.join(ROOT, "data/armory.json"), "utf8"));
/* Weight, how much room a thing takes, how many go in a slot and what unlocks it. A second
   file rather than more columns in armory.json, because the two come from the same database
   but not from the same reading of it: prices are regenerated by tools/build-armory.js from
   lines somebody types, and this is a bulk pull that no script can repeat, since the API
   answers a browser and refuses a scripted fetch. Joined by exact name, and the join is
   checked in tools/check-build.js rather than assumed. */
const ARMORY_STATS = JSON.parse(
  fs.readFileSync(path.join(ROOT, "data/armory-stats.json"), "utf8"));
/* What somebody has read off the running game, which outranks the pull above and the
   solver's figures in ballistics.json alike. Merged here rather than in each page, so the
   order of precedence is stated once and no page can end up preferring the other way
   round. Per field rather than per item: a bag whose size was measured keeps the weight
   the pull gave it until somebody measures that too. */
const MEASURED = JSON.parse(fs.readFileSync(path.join(ROOT, "data/measured.json"), "utf8"));
/* ---------- what a weapon is, and the order the classes are read in ----------
   The owner's order, which is how the game groups them rather than the alphabet: what you
   reach for first down to what you reach for last. It lives here because two pages sort by
   it, the damage ranking and the loadout shelf, and a second copy is how they would come to
   disagree about where the shotguns go.

   The keys are the classes as the item database files them, with one correction read off
   the game: the database files the bow under Equipment, and the vendor screen has a BOWS tab
   for it, so data/measured.json says Bow and that is the key here. Equipment stays mapped
   so a fresh pull with no measurement still lands on the same shelf. CLASS_LABEL is what a
   chip says, CLASS_SHORT what a crowded row says. */
const CLASS_ORDER = ["Assault Rifle", "Submachine Gun", "Shotgun", "Light Machine Gun",
  "Marksman Rifle", "Sniper Rifle", "Bow", "Equipment", "Pistol", "Launcher"];
const CLASS_LABEL = {
  "Submachine Gun": "SMG", "Light Machine Gun": "LMG", "Sniper Rifle": "Sniper",
  Bow: "Bows", Equipment: "Bows",
};
const CLASS_SHORT = {
  "Assault Rifle": "AR", "Submachine Gun": "SMG", "Light Machine Gun": "LMG",
  "Marksman Rifle": "DMR", "Sniper Rifle": "Sniper", Equipment: "Bow",
};
const classLabel = c => CLASS_LABEL[c] || c;
const classShort = c => CLASS_SHORT[c] || c;
/* Anything the list does not name follows it rather than being dropped, so a class that
   arrives in the game turns up at the end of the shelf instead of vanishing off it. */
const classRank = c => {
  const at = CLASS_ORDER.indexOf(c);
  return at < 0 ? CLASS_ORDER.length : at;
};

const ITEM_STATS = {};
for (const [name, pulled] of Object.entries(ARMORY_STATS.items)) ITEM_STATS[name] = { ...pulled };
for (const [name, seen] of Object.entries(MEASURED.items)) {
  const into = ITEM_STATS[name] || (ITEM_STATS[name] = {});
  const from = into.measured = {};
  for (const [k, v] of Object.entries(seen)) {
    if (k === "on" || k === "note") continue;
    /* An unlock is three facts, ladder, level and cash, and the buy screen shows the
       ladder before it shows what the level costs, so a reading may carry one or two of
       them. The pulled figures fill in what was not read, except for a starter, where the
       pull's level and cost are the thing being contradicted. */
    if (k === "unlock" && v && !v.starter && into.unlock && typeof into.unlock === "object") {
      into.unlock = { ...into.unlock, ...v };
    } else into[k] = v;
    from[k] = seen.on;
  }
}
/* The ladders as the game's Unlock screen names them, read 2026-09-02: Assault, Medic,
   Recon, Support, Driver, Pilot, and the overall Wardog Level. The item database says
   Infantry for the first and Career for the last, so the pulled words are translated here
   at display and left untouched in data/armory-stats.json. */
const LADDER_LABEL = { Infantry: "Assault", Career: "Wardog" };
const ladderLabel = r => LADDER_LABEL[r] || r;
const DAMAGE = JSON.parse(fs.readFileSync(path.join(ROOT, "data/damage.json"), "utf8"));
const ARTILLERY = JSON.parse(fs.readFileSync(path.join(ROOT, "data/artillery.json"), "utf8"));
const ARTILLERY_MAPS = JSON.parse(fs.readFileSync(path.join(ROOT, "data/artillery-maps.json"), "utf8"));

/* A weapon joins the damage tables on its class and its calibre, and a measured rate of
   fire brings an unfigured one in. Both rules live in ./weapon-join so a test can run them
   against stub data: the promotion only fires when somebody has measured something, so with
   an empty data/measured.json nothing here is exercised by a build at all. */
const { loadsFor: loadsWith, promote } = require("./weapon-join");
const loadsFor = w => loadsWith(DAMAGE, w);
const promotedWeapons = promote(BALLISTICS, DAMAGE, MEASURED);


/* ---------- a weapon joins the damage tables on its class and its calibre ----------
   The measured sheet is a table per weapon class, and a weapon fires one calibre, so its
   loads are the rows in its class whose name starts with that calibre. Shotguns and the bow
   have one set of rows and no calibre prefix to match on, so they take all of them.

   This lives here rather than on the damage page because the promotion below needs the same
   rule, and a second copy of it is how a weapon ends up figured on one page and not the
   other. */


const DESIGNS = (COMMUNITY.designs || []).filter(d => d.slug && d.code);

/* ---------- design tags ----------
   One list, from data/community.json, used by the filter bar, the card pills and the
   picker somebody submits through. The worker never sees it and validates shape only, so
   a tag added there is live at the next build with no deploy: see tagsProblem() in
   worker/vote-worker.js for the one rule that does live on the server.

   Flattened here as well as grouped, because almost everything downstream wants "what does
   this id say" and only the pickers want the groups. */
const TAG_GROUPS = ((COMMUNITY.designTags || {}).groups || []);
const TAG_BY_ID = {};
for (const g of TAG_GROUPS) for (const t of g.tags || []) TAG_BY_ID[t.id] = { ...t, group: g.id };

/* Unknown ids draw nothing rather than drawing themselves. A tag the site does not offer
   got into storage some other way, and rendering it would put text nobody chose from a
   list onto a card, which is the one thing the vocabulary exists to prevent. */
function tagPills(tags) {
  const known = (tags || []).map(id => TAG_BY_ID[id]).filter(Boolean);
  if (!known.length) return "";
  return '<div class="tagrow">' + known.map(t =>
    '<span class="tag" data-tag="' + esc(t.id) + '">' + esc(t.label) + "</span>").join("") +
    "</div>";
}

/* ---------- stats, computed the same way the planner does ---------- */
function stats(d) {
  let supplies = 0, fobs = 0, tier = 0, vault = 0, cover = 0;
  const counts = {}, needs = new Set();
  const TIER = { small: 1, medium: 2, large: 3 };
  for (const p of d.pieces) {
    const def = byId[p.type]; if (!def) continue;
    if (def.isFob) { fobs++; continue; }
    supplies += def.cost || 0;
    tier = Math.max(tier, TIER[def.tier] || 1);
    counts[def.id] = (counts[def.id] || 0) + 1;
    for (const t of def.tags || []) {
      if (t === "uses-ammo") needs.add("Ammo");
      if (t === "uses-fuel") needs.add("Fuel");
      if (t === "uses-mechanical") needs.add("Mechanical");
    }
    if (def.role === "cover") { cover++; if ((def.height || 1) <= 1) vault++; }
  }
  /* Pallets are what has to be driven in, and the FOB is not empty when it lands: it comes
     with its own build supplies, so only the cost beyond that gets hauled. The planner says
     the same thing about the same design, and the two must not drift apart. */
  const per = catalog.logistics.suppliesPerPallet;
  const pallets = Math.ceil(Math.max(0, supplies - catalog.fob.startingSupplies) / per);
  return {
    supplies, pallets, fobs,
    cash: supplies * 10,
    palletCash: pallets * catalog.logistics.palletCash,
    hammer: ["Small", "Medium", "Large"][Math.max(0, tier - 1)] + " Hammer",
    pieces: d.pieces.length,
    truck: Math.ceil(pallets / 2), heli: pallets,
    resupply: [...needs],
    vault, cover,
    counts: Object.entries(counts).sort((a, b) => b[1] * byId[b[0]].cost - a[1] * byId[a[0]].cost),
  };
}

/* ---------- shared page shell ---------- */

const written = new Set();
const write = (rel, html) => {
  const full = path.join(DOCS, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, html);
  written.add(rel.replace(/\\/g, "/"));
};

/* A design that gets pulled from community.json has to stop being a page. Without this
   the old file just sits there, still reachable, still indexed, quietly contradicting
   the list that no longer mentions it. Only design pages are swept - everything else
   under docs/ is either generated every run or does not belong to this script. */
function sweepDesignPages() {
  const dir = path.join(DOCS, "designs");
  if (!fs.existsSync(dir)) return;
  for (const slug of fs.readdirSync(dir)) {
    const sub = path.join(dir, slug);
    if (!fs.statSync(sub).isDirectory()) continue;
    if (written.has(`designs/${slug}/index.html`)) continue;
    fs.rmSync(sub, { recursive: true, force: true });
    console.log("  removed stale design page: " + slug);
  }
}

/* ---------- pages ---------- */
/* A submitted design arrives as a share code, so decode it back into pieces before
   costing it. A code that does not decode is dropped with a warning rather than
   producing a page that lies about what it contains. */
function decodeShared(code) {
  if (code.charAt(0) === "~") return unpackDesign(zlib.inflateRawSync(fromB64url(code.slice(1))));
  const raw = Buffer.from(code.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
  const d = JSON.parse(raw);
  return d.p.map(a => ({
    type: d.t[a[0]], x: a[1] / 2, y: a[2] / 2, rot: a[3] || 0, level: a[4] || 0,
    ...(a.length > 5 ? { zone: a[5] } : {}),
  }));
}
const withStats = DESIGNS.map(d => {
  try {
    const pieces = decodeShared(d.code);
    if (!pieces.length || pieces.some(p => !byId[p.type])) throw new Error("unknown piece");
    return { ...d, s: stats({ pieces }) };
  } catch (e) {
    console.log("  skipped " + d.slug + ": share code will not decode (" + e.message + ")");
    return null;
  }
}).filter(Boolean);

function designCard(d) {
  return `<div class="card">
    <a href="/designs/${d.slug}/"><h3>${esc(d.name)}</h3>
    <p>${esc(d.tagline)}</p></a>
    ${tagPills(d.tags)}
    <div class="stats">
      <span>supplies</span>${d.s.supplies.toLocaleString()}
      <span>pallets</span>${d.s.pallets}
      <span>pieces</span>${d.s.pieces}
    </div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-top:16px;gap:12px">
      ${voteWidget(d.slug)}
      <span style="font-size:12px;color:var(--dim)">by ${esc(d.author || "anonymous")}</span>
    </div></div>`;
}

/* The buttons render disabled and say so until a vote service is configured. Showing
   a live-looking score that nothing is counting would be worse than showing none. */

const VOTE_API = (COMMUNITY.voteApi || "").replace(/\/$/, "");

  const CSS = require("./css");
  const ctx = {
    fs, path, ROOT, DOCS, SITE, catalog, byId, esc, VERIFY,
    ADS, adsOn, adScript, adSlot,
    encodeDesign, P, run, ring, pit,
    COMMUNITY, BALLISTICS, ARMORY, ARMORY_STATS, MEASURED, ITEM_STATS, loadsFor,
    CLASS_ORDER, classLabel, classShort, classRank, ladderLabel, DAMAGE, ARTILLERY, ARTILLERY_MAPS, DESIGNS, stats,
    CSS, write, written, sweepDesignPages,
    decodeShared, withStats, designCard, VOTE_API,
    TAG_GROUPS, TAG_BY_ID, tagPills,
  };

  Object.assign(ctx, require("./client-scripts")(ctx));
  ctx.page = require("./shell")(ctx);

  /* Ranked once, used by both the home page and the designs index, so the ordering
     cannot drift between the two. */
  ctx.ranked = withStats.slice().sort((a, b) =>
  String(b.submitted || "").localeCompare(String(a.submitted || "")));

  return ctx;
};
