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
   Ads run on the content pages only. The planner is the thing people actually came for
   and it has to keep working with no network, so it never gets ad code. The
   "no external resource loads" check in tools/check-build.js enforces that.
   With no publisher id configured nothing at all is emitted: no script tag, no slot,
   no reserved space. Fill in data/buildables.json -> ads.publisherId to switch it on. */
const ADS = JSON.parse(fs.readFileSync(path.join(ROOT, "data/ads.json"), "utf8"));
const adsOn = !!(ADS.publisherId || "").trim();
const adScript = adsOn
  ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${esc(ADS.publisherId)}" crossorigin="anonymous"></script>`
  : "";
function adSlot(which) {
  const slot = (ADS.slots || {})[which] || "";
  if (!adsOn || !slot) return "";
  // reserve the height up front so an arriving ad can't shove the article down the page
  const h = which === "leaderboard" ? 90 : 280;
  return `<div class="ad-slot" style="min-height:${h}px">
  <ins class="adsbygoogle" style="display:block" data-ad-client="${esc(ADS.publisherId)}"
       data-ad-slot="${esc(slot)}" data-ad-format="auto" data-full-width-responsive="true"></ins>
  <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
</div>`;
}

/* ---------- share codes: identical encoding to the planner ---------- */
function encodeDesign(d) {
  const types = [];
  const idx = t => { let i = types.indexOf(t); if (i < 0) { i = types.length; types.push(t); } return i; };
  const pieces = d.pieces.map(p => {
    const a = [idx(p.type), Math.round(p.x * 2), Math.round(p.y * 2), p.rot || 0, p.level || 0];
    if (p.type === "__fob__") a.push(p.zone || 100);
    return a;
  });
  const json = JSON.stringify({ v: 1, n: d.name, t: types, p: pieces });
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
const DESIGNS = (COMMUNITY.designs || []).filter(d => d.slug && d.code);

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
  const per = catalog.logistics.suppliesPerPallet;
  const pallets = Math.ceil(supplies / per);
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

/* ---------- guides ---------- */

const GUIDES = require("./guides-content");

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
    fs, path, ROOT, DOCS, SITE, catalog, byId, esc,
    ADS, adsOn, adScript, adSlot,
    encodeDesign, P, run, ring, pit,
    COMMUNITY, BALLISTICS, ARMORY, DESIGNS, stats, GUIDES,
    CSS, write, written, sweepDesignPages,
    decodeShared, withStats, designCard, VOTE_API,
  };

  Object.assign(ctx, require("./client-scripts")(ctx));
  ctx.page = require("./shell")(ctx);

  /* Ranked once, used by both the home page and the designs index, so the ordering
     cannot drift between the two. */
  ctx.ranked = withStats.slice().sort((a, b) =>
  String(b.submitted || "").localeCompare(String(a.submitted || "")));

  return ctx;
};
