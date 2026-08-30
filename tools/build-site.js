// Generates the static site around the planner.
//
//   node tools/build-site.js
//
// One page per thing somebody actually searches for: the buildable costs, each
// design, each guide. Everything is generated from data/buildables.json so the
// numbers can never drift out of sync with the tool itself.
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
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
const GUIDES = [
  {
    slug: "wardogs-fob-guide",
    title: "WARDOGS FOB Guide",
    blurb: "What a Forward Operating Base actually does, what it costs, and the order to build it in.",
    body: `<p>A FOB is a $2,500 vendor item that takes 2×3 in your inventory. Once placed it
      cannot be moved, so the placement decision is the whole game.</p>
      <h2>What it gives you</h2>
      <p>Three things: it is <strong>required</strong> for most buildables, it <strong>stores
      supplies</strong> (Build, Ammo, Fuel and Mechanical), and it projects a
      <strong>square build zone</strong> that you must build inside, shown blue on the
      minimap. It also carries free Small and Medium hammers, wrenches and signal grenades at
      the FOB computer, so teammates who arrive empty-handed can still help.</p>
      <p>What it does <em>not</em> do is act as a spawn point. That is a separate spawn
      vehicle.</p>
      <h2>Four buildables need no FOB at all</h2>
      <p>Sandbag Wall, Barbed Wire, Hedgehog and Recon Tent can be placed anywhere. Everything
      else has to sit inside a FOB's build zone.</p>
      <h2>Build order that works</h2>
      <ol>
        <li>Place the FOB somewhere a truck or helicopter can actually reach, with cover, and
        not on a skyline.</li>
        <li>Close the perimeter. Walls first, with exactly one vehicle gate and one door.
        A half-finished wall is cover for the enemy.</li>
        <li>Only then add emplacements. Mortars, AA and drill rigs are expensive and they
        advertise the position.</li>
      </ol>
      <h2>Do not seal yourself in</h2>
      <p>Gates must be on the ground and swing through, so leave the inside clear. Leave room
      for a truck to get in and unload. a base a supply run cannot reach is a base that
      starves.</p>`,
  },
  {
    slug: "wardogs-build-costs",
    title: "WARDOGS Build Costs and Supply Runs",
    blurb: "What every buildable costs in Build Supplies, and how many pallets and vehicle trips that really means.",
    body: `<p>Every structure costs <strong>Build Supplies</strong>, drawn from the FOB. Not
      from your pocket. Supplies cost <strong>$10 each</strong> individually at the vendor, and
      a <strong>Build Supply Pallet is $400</strong> and takes 4×2 inventory slots.</p>
      <h2>Think in trips, not supplies</h2>
      <p>The raw supply number is not the thing that costs you. Supplies move as pallets, and a
      vehicle carries a whole number of them: a <strong>truck takes two pallets a trip</strong>,
      a <strong>helicopter one</strong>. A wall that needs 12 pallets is six truck runs across
      contested ground, and that is the real price.</p>
      <h2>Four kinds of supply</h2>
      <ul>
        <li><strong>Build</strong>. Everything you construct.</li>
        <li><strong>Ammo</strong>. Reloads the L81 Mortar, Vanguard CIWS and Talon SAM.</li>
        <li><strong>Fuel</strong>. The Refuel Station, and activating the Drill Rig.</li>
        <li><strong>Mechanical</strong>. The Repair Station, and Stingray drones.</li>
      </ul>
      <p>Delivering the wrong pallet is a wasted trip. Ask the builder what the FOB is short of
      before you load.</p>
      <h2>Build faster</h2>
      <p>Hitting the yellow X marks while building speeds construction considerably. Releasing
      and re-pressing between contacts cancels the backswing, which players report as roughly
      tripling build speed.</p>`,
  },
  {
    slug: "wardogs-anti-climb-walls",
    title: "Stopping People Vaulting Your Walls",
    blurb: "Waist-height cover gets vaulted. Here is the layering that does not.",
    body: `<p>Most perimeters fail the same way: they are built out of waist-height blocks,
      and infantry simply vault them.</p>
      <h2>The heights</h2>
      <p>Hesco Block (Small) and Sandbag Wall are one block tall. Cover to shoot over, and a
      step to climb. Hesco Block (Tall) and Hesco Wall (Quad) are two, which is full-body
      cover. The Bremer Wall is three, and topped with barbed wire.</p>
      <h2>The rule that matters</h2>
      <p><strong>Nothing can be built on top of a Bremer Wall.</strong> That makes it the
      finishing layer, not a foundation. Run tall Hesco for the wall, then cap it with Bremer,
      and the result cannot be climbed without taking damage.</p>
      <h2>Sandbags are the exception worth knowing</h2>
      <p>Sandbags are designed to sit on top of Hesco. Low Hesco with sandbags stacked on it is
      the combination the community settled on for CIWS emplacements. High enough to protect
      the gunner, low enough not to block the gun.</p>
      <p>The planner counts how much of your cover is still waist height, under
      <strong>Anti-climb</strong>, so you can see the weakness before somebody finds it.</p>`,
  },
  {
    slug: "wardogs-hammers",
    title: "WARDOGS Hammers: What Each One Builds",
    blurb: "Small, Medium and Large. What unlocks at each tier and which one to actually carry.",
    body: `<p>Hammers come from the Support progression track and are bought at HQ. All three
      need Build Supplies to use.</p>
      <table>
        <thead><tr><th>Hammer</th><th>Weight</th><th>Speed</th><th>Builds</th></tr></thead>
        <tbody>
          <tr><td>Small</td><td>0.32 kg</td><td>Slow</td><td>Small buildables only</td></tr>
          <tr><td>Medium</td><td>1.23 kg</td><td>Moderate</td><td>Small plus basic and large</td></tr>
          <tr><td>Large</td><td>3.18 kg</td><td>Fastest</td><td><strong>Everything</strong></td></tr>
        </tbody>
      </table>
      <h2>Which to carry</h2>
      <p>The Large Hammer is the only one that builds emplacements, drill rigs, bunkers and
      towers, and it builds everything else faster, but it is 3.18 kg, and weight class
      decides whether you can sprint to the Hot Zone.</p>
      <p>Worth knowing: a placed FOB carries free Small and Medium hammers at its computer. If
      somebody else on your squad is running a Large Hammer, you may not need to carry one at
      all.</p>`,
  },
];

/* ---------- shared page shell ---------- */
const CSS = `
/* Design language lifted from bulkhead.com/games/wardogs: #0c0c0c ground, #fff7ea
   cream, #c00b0b red, Inter Black for display, Barlow for everything else, and
   square corners on absolutely everything. */
@font-face{font-family:Inter;src:url(/fonts/inter-900.woff2)format("woff2");font-weight:900;font-display:swap}
@font-face{font-family:Barlow;src:url(/fonts/barlow-400.woff2)format("woff2");font-weight:400;font-display:swap}
@font-face{font-family:Barlow;src:url(/fonts/barlow-600.woff2)format("woff2");font-weight:600;font-display:swap}

:root{
  --bg:#0c0c0c;--panel:#111;--panel2:#161616;--line:#242424;--line2:#333;
  --text:#fff7ea;--dim:rgba(255,247,234,.44);--dim2:rgba(255,247,234,.66);
  --red:#c00b0b;--red-hot:#f30000;--good:#86ad55;--bad:#d4553a;
  --display:Inter,"Arial Black",system-ui,sans-serif;
  --ui:Barlow,"Segoe UI",system-ui,-apple-system,sans-serif;
  --num:"Cascadia Mono",Consolas,ui-monospace,monospace;
}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--text);font-family:var(--ui);font-size:16px;line-height:1.6;
  -webkit-font-smoothing:antialiased}
a{color:var(--text);text-decoration:none}
a:hover{color:var(--red-hot)}
.wrap{max-width:1180px;margin:0 auto;padding:0 28px}

/* --- display type: huge, black weight, tight, always uppercase --- */
h1,h2.display{font-family:var(--display);font-weight:900;text-transform:uppercase;
  letter-spacing:-.03em;line-height:.92;text-wrap:balance}
h1{font-size:clamp(38px,7vw,84px);margin:0 0 18px}
h2{font-family:var(--ui);font-weight:400;text-transform:uppercase;letter-spacing:.08em;
  font-size:clamp(24px,3vw,38px);margin:0 0 16px;text-wrap:balance}
h2.display{font-size:clamp(30px,5vw,56px);letter-spacing:-.025em}
h3{font-family:var(--ui);font-weight:600;text-transform:uppercase;letter-spacing:.1em;
  font-size:14px;margin:0 0 8px}
p,li{color:var(--dim2)}
.lede{font-size:clamp(17px,1.6vw,21px);color:var(--text);max-width:56ch;line-height:1.45}
.eyebrow{font-weight:600;text-transform:uppercase;letter-spacing:.16em;font-size:12px;
  color:var(--red-hot);margin-bottom:14px;display:block}

/* --- header --- */
header.site{border-bottom:1px solid var(--line);background:rgba(12,12,12,.92);
  backdrop-filter:blur(8px);position:sticky;top:0;z-index:20}
header.site .wrap{display:flex;align-items:center;gap:28px;min-height:74px}
.brand{font-family:var(--display);font-weight:900;letter-spacing:-.02em;font-size:22px;
  text-transform:uppercase;line-height:1;display:flex;align-items:baseline;gap:8px}
.brand span{font-family:var(--ui);font-weight:600;font-size:10px;letter-spacing:.18em;
  color:var(--dim);text-transform:uppercase}
.brand:hover{color:var(--text)}
nav.site{display:flex;align-items:center;gap:26px;margin-left:auto}
nav.site a{font-weight:600;text-transform:uppercase;letter-spacing:.12em;font-size:12px;color:var(--dim2)}
nav.site a:hover{color:var(--text)}
nav.site a[aria-current]{color:var(--text)}
/* the CTA is a bordered block, and its label is optically centred inside it */
nav.site a.cta{display:inline-flex;align-items:center;justify-content:center;gap:9px;
  border:1px solid var(--red);color:var(--text);background:transparent;
  padding:0 18px;height:40px;letter-spacing:.14em}
nav.site a.cta:hover{background:var(--red);border-color:var(--red);color:#fff}

/* --- buttons --- */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:11px;height:52px;padding:0 26px;
  border:1px solid var(--text);color:var(--text);background:transparent;font-family:var(--ui);
  font-weight:600;text-transform:uppercase;letter-spacing:.14em;font-size:13px;cursor:pointer}
.btn:hover{background:var(--text);color:var(--bg)}
.btn.primary{border-color:var(--red);background:var(--red);color:#fff}
.btn.primary:hover{background:var(--red-hot);border-color:var(--red-hot);color:#fff}
.btn.sm{height:38px;padding:0 16px;font-size:11px}

/* --- hero --- */
.hero{padding:clamp(56px,9vw,120px) 0 clamp(40px,6vw,72px);border-bottom:1px solid var(--line);
  position:relative;overflow:hidden}
.hero .actions{display:flex;gap:14px;margin-top:32px;flex-wrap:wrap}
.hero-rule{height:1px;background:linear-gradient(90deg,var(--red),transparent);margin-top:40px}

section{padding:clamp(44px,6vw,76px) 0}
section+section{border-top:1px solid var(--line)}
.section-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;
  margin-bottom:30px;flex-wrap:wrap}

/* --- cards --- */
.grid{display:grid;gap:1px;background:var(--line);border:1px solid var(--line);
  grid-template-columns:repeat(auto-fill,minmax(270px,1fr))}
.card{background:var(--panel);padding:24px;display:block;position:relative;transition:background .15s}
.card:hover{background:var(--panel2);color:var(--text)}
.card h3{color:var(--text);font-family:var(--display);font-weight:900;font-size:19px;
  letter-spacing:-.01em;text-transform:uppercase;margin-bottom:8px}
.card p{font-size:14px;color:var(--dim);line-height:1.5}
.card .stats{display:flex;gap:18px;margin-top:18px;font-family:var(--num);font-size:12px;
  color:var(--text);font-variant-numeric:tabular-nums;flex-wrap:wrap}
.card .stats span{color:var(--dim);font-family:var(--ui)}

/* --- tables --- */
table{width:100%;border-collapse:collapse;font-size:14px;margin:20px 0}
th{text-align:left;font-weight:600;font-size:10px;letter-spacing:.16em;text-transform:uppercase;
  color:var(--dim);padding:12px 12px;border-bottom:1px solid var(--line2)}
td{padding:12px;border-bottom:1px solid var(--line);color:var(--dim2)}
td.n{font-family:var(--num);font-variant-numeric:tabular-nums;text-align:right;white-space:nowrap;
  color:var(--text)}
tbody tr:hover td{background:var(--panel)}
.tag{font-size:10px;font-weight:600;padding:3px 8px;background:transparent;color:var(--dim);
  border:1px solid var(--line2);text-transform:uppercase;letter-spacing:.1em}

/* --- stat bar --- */
.statbar{display:grid;gap:1px;background:var(--line);border:1px solid var(--line);
  grid-template-columns:repeat(auto-fit,minmax(140px,1fr));margin:26px 0}
.statbar div{background:var(--panel);padding:20px}
.statbar b{display:block;font-family:var(--display);font-weight:900;font-size:30px;color:var(--text);
  font-variant-numeric:tabular-nums;line-height:1;letter-spacing:-.02em}
.statbar span{font-size:10px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;
  color:var(--dim);margin-top:8px;display:block}

.note{background:var(--panel);border-left:2px solid var(--red);padding:18px 20px;margin:24px 0;
  font-size:14px;color:var(--dim2)}
.note strong{color:var(--text)}

/* --- empty / coming-soon states --- */
.empty{border:1px dashed var(--line2);padding:clamp(32px,5vw,56px);text-align:center}
.empty h3{font-family:var(--display);font-weight:900;font-size:22px;letter-spacing:-.01em;
  color:var(--text);margin-bottom:10px}
.empty p{max-width:52ch;margin:0 auto 22px}
.wip{display:inline-block;font-weight:600;font-size:10px;letter-spacing:.16em;text-transform:uppercase;
  color:var(--red-hot);border:1px solid var(--red);padding:3px 9px;margin-bottom:14px}

/* --- community designs --- */
.vote{display:flex;align-items:center;gap:4px}
.vote button{display:inline-flex;align-items:center;gap:5px;background:transparent;cursor:pointer;
  border:1px solid var(--line2);color:var(--dim2);font-family:var(--ui);font-weight:600;font-size:12px;
  padding:5px 10px;font-variant-numeric:tabular-nums}
.vote button:hover:not(:disabled){border-color:var(--text);color:var(--text)}
.vote button:disabled{opacity:.45;cursor:default}
.vote button[data-cast="1"]{border-color:var(--red);color:var(--red-hot)}
.vote .score{font-family:var(--num);font-size:13px;color:var(--text);min-width:2ch;text-align:center}

/* --- submit form and comment threads --- */
.form{display:grid;gap:14px;max-width:620px;margin-top:26px}
.field label{display:block;font-weight:600;font-size:11px;letter-spacing:.14em;
  text-transform:uppercase;color:var(--dim);margin-bottom:6px}
.field input,.field textarea{width:100%;background:var(--panel);color:var(--text);
  border:1px solid var(--line2);padding:11px 13px;font-family:var(--ui);font-size:15px}
.field input:focus,.field textarea:focus{outline:none;border-color:var(--red)}
.field textarea{resize:vertical;min-height:76px}
.field .hint{font-size:12px;color:var(--dim);margin-top:6px}
.msg{padding:12px 14px;border-left:2px solid var(--red);background:var(--panel);font-size:14px}
.msg.good{border-color:var(--good)}
.thread{margin-top:20px;display:grid;gap:1px;background:var(--line);border:1px solid var(--line)}
.cmt{background:var(--panel);padding:14px 16px}
.cmt .who{font-weight:600;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:var(--text)}
.cmt .when{font-size:11px;color:var(--dim);margin-left:8px;text-transform:none;letter-spacing:0}
.cmt p{margin-top:6px;font-size:14px;color:var(--dim2);white-space:pre-wrap;overflow-wrap:anywhere}
.design-open{background:var(--panel2);padding:22px 24px;border:1px solid var(--line);border-top:0}
details.design summary{cursor:pointer;list-style:none}
details.design summary::-webkit-details-marker{display:none}
/* --- catalogue: chips, search, grid and table --- */
.cat-bar{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:28px 0 6px}
.chips{display:flex;flex-wrap:wrap;gap:1px;background:var(--line);border:1px solid var(--line)}
.chip{background:var(--panel);color:var(--dim2);border:0;cursor:pointer;font-family:var(--ui);
  font-weight:600;font-size:11px;letter-spacing:.1em;text-transform:uppercase;padding:9px 13px}
.chip:hover{background:var(--panel2);color:var(--text)}
.chip[aria-pressed="true"]{background:var(--red);color:#fff}
.chip small{opacity:.65;margin-left:6px;font-size:10px}
.cat-search{flex:1 1 210px;min-width:180px;background:var(--panel);color:var(--text);
  border:1px solid var(--line2);padding:10px 13px;font-family:var(--ui);font-size:14px}
.cat-search:focus{outline:none;border-color:var(--red)}
.view-toggle{display:flex;gap:1px;background:var(--line);border:1px solid var(--line)}
.cat-count{font-size:12px;color:var(--dim);margin:4px 0 16px}
th.sortable{cursor:pointer;user-select:none;white-space:nowrap}
th.sortable:hover{color:var(--text)}
th.sortable::after{content:"";opacity:.35;margin-left:6px}
th.sortable[data-dir="asc"]::after{content:"↑";opacity:1;color:var(--red-hot)}
th.sortable[data-dir="desc"]::after{content:"↓";opacity:1;color:var(--red-hot)}
.cat-grid{display:grid;gap:1px;background:var(--line);border:1px solid var(--line);
  grid-template-columns:repeat(auto-fill,minmax(230px,1fr))}
.cat-card{background:var(--panel);padding:18px;display:flex;gap:14px;align-items:flex-start}
.cat-card img{width:52px;height:52px;object-fit:contain;flex:0 0 auto}
.cat-card h3{font-family:var(--display);font-weight:900;font-size:15px;letter-spacing:-.01em;
  text-transform:uppercase;color:var(--text);margin-bottom:6px}
.cat-card .facts{font-family:var(--num);font-size:12px;color:var(--text);
  font-variant-numeric:tabular-nums}
.cat-card .facts span{color:var(--dim);font-family:var(--ui);margin-right:4px}
.cat-card p{font-size:12.5px;color:var(--dim);margin-top:8px;line-height:1.45}
.cat-empty{padding:34px;text-align:center;color:var(--dim);border:1px dashed var(--line2)}
/* --- account control in the header --- */
.acct{display:none;align-items:center;gap:8px;font-weight:600;font-size:11px;
  letter-spacing:.1em;text-transform:uppercase}
.acct.on{display:inline-flex}
.acct a{color:var(--dim2)}
.acct a:hover{color:var(--text)}
.acct .who{color:var(--text)}
.acct .sep{color:var(--line2)}

.ad-slot{margin:34px 0;padding:10px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line);
  text-align:center;overflow:hidden}
.ad-slot::before{content:"Advertisement";display:block;font-size:9px;font-weight:600;letter-spacing:.18em;
  text-transform:uppercase;color:var(--dim);margin-bottom:8px}

footer.site{border-top:1px solid var(--line);margin-top:0;padding:40px 0;color:var(--dim);font-size:13px}
footer.site .wrap{display:flex;gap:22px;flex-wrap:wrap;align-items:center}
footer.site a{color:var(--dim);font-weight:600;text-transform:uppercase;letter-spacing:.1em;font-size:11px}
footer.site a:hover{color:var(--text)}
footer.site .fine{flex:1 1 100%;color:var(--dim);font-size:12px;line-height:1.5;order:-1;margin-bottom:6px}

ul,ol{padding-left:22px}li{margin:6px 0}
@media(max-width:760px){
  header.site .wrap{flex-wrap:wrap;padding-top:14px;padding-bottom:14px;gap:14px}
  nav.site{margin-left:0;gap:18px;width:100%;flex-wrap:wrap}
  .grid{grid-template-columns:1fr}
}
`;

function page({ title, desc, canonical, body, ogImage = "/preview.png", noindex = false }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}${canonical}">${noindex ? '\n<meta name="robots" content="noindex,nofollow">' : ""}
<meta name="theme-color" content="#12140d">
<meta property="og:type" content="website">
<meta property="og:site_name" content="WARDOGS Base Builder">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${SITE}${canonical}">
<meta property="og:image" content="${SITE}${ogImage}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${SITE}${ogImage}">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='6' fill='%2312140d'/><rect x='6' y='14' width='20' height='12' rx='2' fill='%23dcaa26'/><rect x='11' y='8' width='10' height='7' rx='2' fill='%2386ad55'/></svg>">
<style>${CSS}</style>
${adScript}
${AUTH_SCRIPT}
</head>
<body>
<header class="site"><div class="wrap">
  <a href="/" class="brand">WARDOGS <span>Base Builder</span></a>
  <nav class="site">
    <a href="/designs/">Designs</a>
    <a href="/buildables/">Buildables</a>
    <a href="/armory/">Armory</a>
    <a href="/ballistics/">Ballistics</a>
    <a href="/loadouts/">Loadouts</a>
    <a href="/vehicles/">Vehicles</a>
    <a href="/guides/">Guides</a>
    <a href="/feedback/">Feedback</a>
    <a href="/planner/" class="cta">Planner</a>
    <span id="acct" class="acct"></span>
  </nav>
</div></header>
${body}
${adSlot("leaderboard") ? `<div class="wrap">${adSlot("leaderboard")}</div>` : ""}
<footer class="site"><div class="wrap">
  <span class="fine">A free, fan-made planner for WARDOGS, built by a player. Not affiliated with,
  endorsed by, or connected to BULKHEAD Interactive or Team17. WARDOGS and all related marks and
  imagery belong to their respective owners.</span>
  <a href="/planner/">Planner</a><a href="/designs/">Designs</a>
  <a href="/buildables/">Buildables</a><a href="/armory/">Armory</a>
  <a href="/ballistics/">Ballistics</a>
  <a href="/loadouts/">Loadouts</a><a href="/vehicles/">Vehicles</a><a href="/guides/">Guides</a>
  <a href="/feedback/">Feedback</a>
  <a href="/privacy/">Privacy</a>
</div></footer>
</body>
</html>`;
}

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

/* ---------- sign-in, on every page ----------
   The token comes back from Discord in the URL fragment and lives in localStorage after
   that. A fragment never reaches a server, so it stays out of access logs. This runs on
   every page so the header can say who you are wherever you are, and so the token is
   picked up no matter which page Discord returned you to.

   The character class is spelled out rather than using \\w, because this file is a
   template literal and an escape written here does not survive into the page. That
   mistake shipped once and broke sign-in. */
const AUTH_SCRIPT = !VOTE_API ? "" : `<script>
(function(){
var API=${JSON.stringify(VOTE_API)};
var KEY="wardogs.token";
function esc(s){return String(s).replace(/[&<>"']/g,function(c){
  return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
try{
  var m=(location.hash||"").match(/[#&]token=([A-Za-z0-9_.-]+)/);
  if(m){ localStorage.setItem(KEY,m[1]);
         history.replaceState(null,"",location.pathname+location.search); }
}catch(e){}
window.wardogsAuth={
  key:KEY,
  token:function(){ try{ return localStorage.getItem(KEY); }catch(e){ return null; } },
  headers:function(){ var h={"Content-Type":"application/json"}, t=this.token();
                      if(t) h["Authorization"]="Bearer "+t; return h; },
  signInUrl:function(back){ return API+"/auth/start?return="+
    encodeURIComponent(back||(location.origin+location.pathname)); },
  signOut:function(){ try{ localStorage.removeItem(KEY); }catch(e){} location.reload(); },
  me:null,
  ready:null
};
var A=window.wardogsAuth;
A.ready=fetch(API+"/me",{headers:A.headers()})
  .then(function(r){return r.json();})
  .then(function(j){
    A.me=j;
    // a token the worker will not accept is not worth keeping
    if(j.loginEnabled && A.token() && !j.user){ try{localStorage.removeItem(KEY);}catch(e){} }
    var el=document.getElementById("acct");
    if(el && j.loginEnabled){
      el.className="acct on";
      el.innerHTML = j.user
        ? '<a href="/account/" class="who">'+esc(j.user.name)+'</a>'+
          '<span class="sep">/</span><a href="#" data-signout>Sign out</a>'
        : '<a href="'+A.signInUrl()+'">Sign in</a>';
    }
    return j;
  })
  .catch(function(){ A.me={loginEnabled:false,needs:{},user:null}; return A.me; });
document.addEventListener("click",function(e){
  if(e.target.closest("[data-signout]")){ e.preventDefault(); A.signOut(); }
});
})();
</script>`;
function voteWidget(slug) {
  const off = VOTE_API ? "" : " disabled title=\"Voting opens once the vote service is live\"";
  return `<div class="vote" data-design="${esc(slug)}">
    <button type="button" data-dir="1"${off} aria-label="Vote up">&#9650;</button>
    <span class="score" data-role="score">${VOTE_API ? "&middot;" : "&ndash;"}</span>
    <button type="button" data-dir="-1"${off} aria-label="Vote down">&#9660;</button>
  </div>`;
}

// Scores are fetched rather than baked, so a page cached for a week still shows the
// current ranking. Failure is silent and leaves the neutral dash in place.

/* Everything community-shaped runs against the worker. With no API configured the page
   keeps its static empty state and none of this is emitted, so the site never shows
   controls that cannot do anything. */
const COMMUNITY_SCRIPT = !VOTE_API ? "" : `<script>
(function(){
var API=${JSON.stringify(VOTE_API)};
var esc=function(s){return String(s).replace(/[&<>"']/g,function(c){
  return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});};
var ago=function(ms){
  var s=Math.max(1,(Date.now()-ms)/1000);
  var u=[[86400*365,"y"],[86400*30,"mo"],[86400,"d"],[3600,"h"],[60,"m"]];
  for(var i=0;i<u.length;i++) if(s>=u[i][0]) return Math.floor(s/u[i][0])+u[i][1]+" ago";
  return "just now";
};
/* Sign-in state. The worker hands the token back in the URL fragment after Discord, and
   it lives in localStorage from then on. A fragment never reaches a server, so the token
   is not sitting in anybody's access log. */
var TOKEN=null, ME=null;
try{
  var m=(location.hash||"").match(/[#&]token=([A-Za-z0-9_.-]+)/);
  if(m){ TOKEN=m[1]; localStorage.setItem("wardogs.token",TOKEN);
         history.replaceState(null,"",location.pathname+location.search); }
  else TOKEN=localStorage.getItem("wardogs.token");
}catch(e){}

var authHeaders=function(){
  var h={"Content-Type":"application/json"};
  if(TOKEN) h["Authorization"]="Bearer "+TOKEN;
  return h;
};
var post=function(path,body){
  return fetch(API+path,{method:"POST",headers:authHeaders(),
    body:JSON.stringify(body)}).then(function(r){
      return r.json().then(function(j){ if(!r.ok){ var e=new Error(j.error||"That did not work."); e.needsLogin=j.needsLogin; throw e; } return j; });
    });
};
var signInUrl=function(){
  return API+"/auth/start?return="+encodeURIComponent(location.origin+location.pathname);
};
var signOut=function(){
  TOKEN=null; ME=null;
  try{ localStorage.removeItem("wardogs.token"); }catch(e){}
  location.reload();
};
/* Draws the sign-in strip above a form, or nothing at all if that form does not need an
   account. Returns whether the form should be usable. */
function authStrip(el,which){
  if(!ME||!ME.loginEnabled||!ME.needs[which]){
    if(ME&&ME.user) el.innerHTML='<div class="msg good">Signed in as <b>'+esc(ME.user.name)+
      '</b>. <a href="#" data-signout>Sign out</a></div>';
    return true;
  }
  if(ME.user){
    el.innerHTML='<div class="msg good">Signed in as <b>'+esc(ME.user.name)+
      '</b>. <a href="#" data-signout>Sign out</a></div>';
    return true;
  }
  el.innerHTML='<div class="msg"><b>Sign in with Discord to post.</b> It keeps bots out, '+
    'and it is how you get credited. Nothing is read except your username.<br>'+
    '<a class="btn sm" style="margin-top:12px" href="'+signInUrl()+'">Sign in with Discord</a></div>';
  return false;
}
document.addEventListener("click",function(e){
  var a=e.target.closest("[data-signout]");
  if(a){ e.preventDefault(); signOut(); }
});
var meReady=fetch(API+"/me",{headers:authHeaders()})
  .then(function(r){return r.json();})
  .then(function(j){ ME=j; if(j.loginEnabled&&TOKEN&&!j.user){ try{localStorage.removeItem("wardogs.token");}catch(e){} TOKEN=null; } return j; })
  .catch(function(){ ME={loginEnabled:false,needs:{},user:null}; });

/* ---- submit ---- */
var form=document.getElementById("submitForm");
if(form){
  var strip=document.createElement("div");
  form.parentNode.insertBefore(strip,form);
  meReady.then(function(){
    var allowed=authStrip(strip,"submit");
    form.querySelectorAll("input,textarea,button").forEach(function(el){ el.disabled=!allowed; });
    // a signed-in submission is credited to the account, so stop asking for a name
    if(allowed&&ME&&ME.user){
      var f=document.getElementById("sAuthor");
      if(f&&f.closest(".field")) f.closest(".field").style.display="none";
    }
  });
}
if(form) form.addEventListener("submit",function(e){
  e.preventDefault();
  var out=document.getElementById("submitMsg");
  // people paste the whole link; the design is the bit after #d=
  var raw=(document.getElementById("sCode").value||"").trim();
  var m=raw.match(/[#&]d=([A-Za-z0-9_-]+)/);
  var code=m?m[1]:raw;
  out.className="msg"; out.textContent="Sending...";
  post("/submit",{name:document.getElementById("sName").value,
                  author:document.getElementById("sAuthor").value,
                  note:document.getElementById("sNote").value,
                  code:code})
    .then(function(){
      form.reset();
      out.className="msg good";
      out.textContent="Thanks. It goes up once it has been looked over, usually the same day.";
    })
    .catch(function(err){ out.className="msg"; out.textContent=err.message; });
});

/* ---- the list ---- */
var list=document.getElementById("designList");
if(list){
  fetch(API+"/designs").then(function(r){return r.json();}).then(function(j){
    var ds=j.designs||[];
    if(!ds.length) return;                       // keep whatever static state is there
    list.innerHTML=ds.map(function(d){
      var score=(d.votes.up||0)-(d.votes.down||0);
      return '<details class="design"><summary>'+
        '<div class="card"><h3>'+esc(d.name)+'</h3>'+
        (d.note?'<p>'+esc(d.note)+'</p>':'')+
        '<div class="stats"><span>by</span>'+esc(d.author)+
        '<span>score</span><b data-role="score">'+score+'</b>'+
        '<span>'+ago(d.submitted)+'</span></div>'+
        '<div class="vote" data-design="'+esc(d.slug)+'" style="margin-top:14px">'+
        '<button type="button" data-dir="1" aria-label="Vote up">&#9650;</button>'+
        '<span class="score" data-role="n">'+score+'</span>'+
        '<button type="button" data-dir="-1" aria-label="Vote down">&#9660;</button>'+
        '<a class="btn sm" style="margin-left:14px" href="/planner/#d='+esc(d.code)+'">Open in planner</a>'+
        '</div></div></summary>'+
        '<div class="design-open" data-thread="'+esc(d.slug)+'">'+
        '<h3>Comments</h3><div class="thread" data-role="list"></div>'+
        '<form class="form" data-role="form" style="margin-top:16px">'+
        '<div class="field"><label>Your name</label><input maxlength="32" data-role="who" placeholder="anonymous"></div>'+
        '<div class="field"><label>Comment</label><textarea maxlength="1500" data-role="text" required></textarea></div>'+
        '<button class="btn sm" type="submit">Post comment</button>'+
        '<div class="msg" data-role="msg" style="display:none"></div></form></div></details>';
    }).join("");
    wireVotes(list);
    wireThreads(list);
  }).catch(function(){});
}

function wireVotes(root){
  root.querySelectorAll(".vote[data-design]").forEach(function(e){
    e.addEventListener("click",function(ev){
      var b=ev.target.closest("button[data-dir]"); if(!b) return;
      ev.preventDefault();
      var mine=b.dataset.cast==="1";
      post("/vote",{id:e.dataset.design,dir:mine?0:+b.dataset.dir}).then(function(t){
        var n=(t.up||0)-(t.down||0);
        e.querySelector('[data-role=n]').textContent=n;
        var card=e.closest(".card"); if(card){
          var s=card.querySelector('[data-role=score]'); if(s) s.textContent=n; }
        e.querySelectorAll("button").forEach(function(x){x.dataset.cast="";});
        if(t.you) b.dataset.cast="1";
      }).catch(function(){});
    });
  });
}

function wireThreads(root){
  root.querySelectorAll("details.design").forEach(function(det){
    var box=det.querySelector("[data-thread]"); if(!box) return;
    var slug=box.dataset.thread, loaded=false;
    var listEl=box.querySelector("[data-role=list]");
    var render=function(cs){
      listEl.innerHTML=cs.length
        ? cs.map(function(c){
            return '<div class="cmt"><span class="who">'+esc(c.author)+
              '<span class="when">'+ago(c.at)+'</span></span><p>'+esc(c.text)+'</p></div>';
          }).join("")
        : '<div class="cmt"><p>No comments yet.</p></div>';
    };
    det.addEventListener("toggle",function(){
      if(!det.open||loaded) return;
      loaded=true;
      fetch(API+"/comments?design="+encodeURIComponent(slug))
        .then(function(r){return r.json();}).then(function(j){render(j.comments||[]);})
        .catch(function(){});
    });
    // same sign-in strip above every comment box
    var cform=box.querySelector("[data-role=form]");
    var cstrip=document.createElement("div");
    cform.parentNode.insertBefore(cstrip,cform);
    meReady.then(function(){
      var allowed=authStrip(cstrip,"comment");
      cform.querySelectorAll("input,textarea,button").forEach(function(el){ el.disabled=!allowed; });
      if(allowed&&ME&&ME.user){
        var who=box.querySelector("[data-role=who]");
        if(who&&who.closest(".field")) who.closest(".field").style.display="none";
      }
    });
    cform.addEventListener("submit",function(e){
      e.preventDefault();
      var msg=box.querySelector("[data-role=msg]");
      var txt=box.querySelector("[data-role=text]");
      msg.style.display=""; msg.className="msg"; msg.textContent="Posting...";
      post("/comment",{design:slug,author:box.querySelector("[data-role=who]").value,text:txt.value})
        .then(function(){
          txt.value="";
          msg.className="msg good"; msg.textContent="Posted.";
          return fetch(API+"/comments?design="+encodeURIComponent(slug))
            .then(function(r){return r.json();}).then(function(j){render(j.comments||[]);});
        })
        .catch(function(err){ msg.className="msg"; msg.textContent=err.message; });
    });
  });
}
})();
</script>`;


// Designs shared before the planner moved to /planner/ carry their code in the root
// URL's hash. Forward those rather than dropping somebody on a marketing page.
const FORWARD_SHARED = `<script>
(function(){var m=(location.hash||"").match(/[#&]d=([A-Za-z0-9\\-_]+)/);
if(m)location.replace("/planner/#d="+m[1]);})();
</script>`;

/* Order is by submission date until a vote service exists; after that the client
   re-sorts on the fetched scores. Baking a stale ranking into a cached page would be
   worse than starting from newest. */
const ranked = withStats.slice().sort((a, b) =>
  String(b.submitted || "").localeCompare(String(a.submitted || "")));

// --- home ---
write("index.html", page({
  title: "WARDOGS Base Builder: plan your FOB before the match",
  desc: "Free WARDOGS base planner and buildable cost database. Lay out walls, gates and gun pits, see the Build Supply cost and supply runs, and browse designs built by other players.",
  canonical: "/",
  body: `${FORWARD_SHARED}
<section class="hero"><div class="wrap">
  <h1>Count the pallets<br>before you haul them</h1>
  <p class="lede">Lay the whole FOB out first, down to the last hesco block. You get the
  Build Supply total, what that is in pallets, and how many truck runs it takes to get
  there. ${catalog.logistics.suppliesPerPallet.toLocaleString()} supplies to a pallet, two
  pallets to a truck.</p>
  <div class="actions">
    <a class="btn primary" href="/planner/">Open the planner</a>
    <a class="btn" href="/designs/">Community designs</a>
  </div>
  <div class="hero-rule"></div>
</div></section>

<section><div class="wrap">
  <div class="section-head">
    <div><span class="eyebrow">Community</span><h2 class="display">Designs from players</h2></div>
    ${withStats.length ? `<a class="btn sm" href="/designs/">See all</a>` : ""}
  </div>
  ${withStats.length
    ? `<div class="grid">${ranked.slice(0, 6).map(designCard).join("")}</div>`
    : `<div class="empty">
        <h3>Nobody has submitted one yet</h3>
        <p>This list is built by players, not by me. Make something in the planner, hit
        Share, and paste the link on the designs page. The whole design travels inside the
        URL, so there is nothing to upload.</p>
        <a class="btn primary" href="/designs/">Submit the first design</a>
      </div>`}
</div></section>

<section><div class="wrap">
  <span class="eyebrow">The tool</span>
  <h2 class="display">What the planner does</h2>
  <div class="grid" style="margin-top:14px">
    <div class="card"><h3>Every buildable, real costs</h3><p>All ${catalog.buildables.length}
      structures from the Large Hammer, with Build Supply costs read from the in-game radial menu.</p></div>
    <div class="card"><h3>Drag to lay a wall</h3><p>Pieces sit edge to edge with a live count
      and cost as you drag, so a perimeter takes seconds.</p></div>
    <div class="card"><h3>Build upwards</h3><p>Drop a CIWS onto a Hesco platform and it stacks
      automatically. Lower storeys stay visible underneath.</p></div>
    <div class="card"><h3>Know the supply run</h3><p>Total supplies, pallets, and how many truck
      or helicopter trips that actually is.</p></div>
    <div class="card"><h3>Catches mistakes</h3><p>Anything outside the build zone, overlaps,
      gates off the ground, weapons with no sky, pieces floating with nothing under them.</p></div>
    <div class="card"><h3>Share a design as a link</h3><p>The whole layout travels in the URL.
      Post it and it opens ready to inspect. no account, nothing to install.</p></div>
  </div>
</div></section>

<section><div class="wrap">
  <span class="eyebrow">Reference</span>
  <h2 class="display">Guides</h2>
  <div class="grid" style="margin-top:14px">
    ${GUIDES.map(g => `<a class="card" href="/guides/${g.slug}/"><h3>${esc(g.title)}</h3>
      <p>${esc(g.blurb)}</p></a>`).join("")}
  </div>
</div></section>`,
}));

// --- buildables reference ---
const TIER_ORDER = { small: 1, medium: 2, large: 3 };
const rows = catalog.buildables.slice().sort((a, b) =>
  (TIER_ORDER[a.tier] - TIER_ORDER[b.tier]) || a.name.localeCompare(b.name));
const ROLE_LABEL = {
  cover: "Walls & cover", entry: "Entryways", offense: "Offensive", antiair: "Anti-air",
  denial: "Area denial", support: "Support", objective: "Objective",
};

/* Icons are inlined so a row and its picture arrive together; there are twenty of them
   and they are a couple of KB each. */
const iconData = {};
for (const b of catalog.buildables) {
  const f = path.join(ROOT, "assets/icons", b.icon || "");
  if (b.icon && fs.existsSync(f)) {
    const mime = b.icon.endsWith(".webp") ? "image/webp" : "image/svg+xml";
    iconData[b.id] = "data:" + mime + ";base64," + fs.readFileSync(f).toString("base64");
  }
}

const roleCounts = {};
for (const b of catalog.buildables) roleCounts[b.role] = (roleCounts[b.role] || 0) + 1;

write("buildables/index.html", page({
  title: `WARDOGS Buildables: All ${catalog.buildables.length} Structures and Build Supply Costs`,
  desc: `Every WARDOGS buildable with its Build Supply cost, size, height and hammer tier. Filter by what it is for, search by name, sort by cost. Hesco, Bremer walls, gates, bunkers, mortars, AA and the Stingray.`,
  canonical: "/buildables/",
  body: `<section><div class="wrap">
  <span class="eyebrow">Reference</span>
  <h1>Buildables</h1>
  <p class="lede">Every structure you can build, what it costs in Build Supplies, and which
  hammer you need. Sizes are in Hesco blocks, and one block is about 1.2 m.</p>

  <div class="cat-bar">
    <div class="chips" role="group" aria-label="Filter by purpose">
      <button class="chip" data-role="" aria-pressed="true">All <small>${catalog.buildables.length}</small></button>
      ${Object.keys(ROLE_LABEL).filter(r => roleCounts[r]).map(r =>
        `<button class="chip" data-role="${r}" aria-pressed="false">${ROLE_LABEL[r]} <small>${roleCounts[r]}</small></button>`).join("")}
    </div>
    <input class="cat-search" id="catSearch" type="search" placeholder="Search name or description...">
    <div class="view-toggle">
      <button class="chip" data-view="table" aria-pressed="true">Table</button>
      <button class="chip" data-view="grid" aria-pressed="false">Grid</button>
    </div>
  </div>
  <div class="cat-count" id="catCount"></div>

  <div id="catTable">
  <table>
    <thead><tr>
      <th class="sortable" data-sort="name" data-dir="asc">Buildable</th>
      <th class="sortable" data-sort="tier">Hammer</th>
      <th class="n sortable" data-sort="cost">Supplies</th>
      <th class="n sortable" data-sort="size">W&times;D&times;H</th>
      <th>What it is for</th>
    </tr></thead>
    <tbody>${rows.map(b => `<tr data-role="${b.role}" data-name="${esc(b.name.toLowerCase())}"
        data-desc="${esc((b.desc || "").toLowerCase())}"
        data-cost="${b.cost}" data-tier="${TIER_ORDER[b.tier] || 0}"
        data-size="${b.footprint.w * b.footprint.d * b.height}">
      <td><strong>${esc(b.name)}</strong></td>
      <td><span class="tag">${b.tier}</span></td>
      <td class="n">${b.cost}</td>
      <td class="n">${b.footprint.w}&times;${b.footprint.d}&times;${b.height}</td>
      <td>${b.requiresFob === false ? "<strong>No FOB needed.</strong> " : ""}${esc((b.desc || "").split(".")[0])}.</td>
    </tr>`).join("")}</tbody>
  </table>
  </div>

  <div id="catGrid" class="cat-grid" style="display:none">
    ${rows.map(b => `<div class="cat-card" data-role="${b.role}" data-name="${esc(b.name.toLowerCase())}"
        data-desc="${esc((b.desc || "").toLowerCase())}"
        data-cost="${b.cost}" data-tier="${TIER_ORDER[b.tier] || 0}"
        data-size="${b.footprint.w * b.footprint.d * b.height}">
      ${iconData[b.id] ? `<img src="${iconData[b.id]}" alt="">` : ""}
      <div>
        <h3>${esc(b.name)}</h3>
        <div class="facts"><span>cost</span>${b.cost} <span>size</span>${b.footprint.w}&times;${b.footprint.d}&times;${b.height}
          <span>hammer</span>${b.tier}</div>
        <p>${b.requiresFob === false ? "<strong>No FOB needed.</strong> " : ""}${esc((b.desc || "").split(".")[0])}.</p>
      </div>
    </div>`).join("")}
  </div>
  <div class="cat-empty" id="catEmpty" style="display:none">Nothing matches that.</div>

  <div class="note"><strong>Where these numbers come from.</strong>
  BULKHEAD has not published a build table, so every cost and size here was read frame by
  frame from the in-game radial menu and checked in play testing. You can correct any of
  them yourself inside the planner and the change sticks for every piece of that type. If
  you spot one that is off, <a href="/feedback/">say so</a> and it gets fixed for everyone.</div>

  <h2>How supplies actually move</h2>
  <p>Structures draw <strong>Build Supplies</strong> from the FOB, not from your pocket. A
  Build Supply Pallet holds ${catalog.logistics.suppliesPerPallet.toLocaleString()} and costs
  ${catalog.logistics.palletCash ? "$" + catalog.logistics.palletCash : "about $400"}. A truck carries
  ${catalog.logistics.vehicles[0].pallets} pallets a trip, a helicopter
  ${catalog.logistics.vehicles[1].pallets}. A fresh FOB lands with
  ${catalog.fob.startingSupplies.toLocaleString()} already inside. The planner turns any design
  into pallets and trips for you.</p>
  <p><a class="btn" href="/planner/">Open the planner</a></p>
</div></section>
<script>
(function(){
  var role="", q="", sortKey="name", sortDir=1;
  var table=document.getElementById("catTable"), grid=document.getElementById("catGrid");
  var empty=document.getElementById("catEmpty"), count=document.getElementById("catCount");
  var rows=[].slice.call(table.querySelectorAll("tbody tr"));
  var cards=[].slice.call(grid.querySelectorAll(".cat-card"));

  function matches(el){
    if(role && el.dataset.role!==role) return false;
    if(!q) return true;
    return el.dataset.name.indexOf(q)>=0 || el.dataset.desc.indexOf(q)>=0;
  }
  function keyOf(el){
    return sortKey==="name" ? el.dataset.name : +el.dataset[sortKey];
  }
  function apply(){
    var shown=0;
    [rows,cards].forEach(function(set){
      set.forEach(function(el){
        var ok=matches(el);
        el.style.display=ok?"":"none";
      });
    });
    shown=rows.filter(matches).length;
    // sort both views the same way so switching does not reshuffle
    [[rows,table.querySelector("tbody")],[cards,grid]].forEach(function(pair){
      pair[0].slice().sort(function(a,b){
        var x=keyOf(a), y=keyOf(b);
        return (x<y?-1:x>y?1:0)*sortDir;
      }).forEach(function(el){ pair[1].appendChild(el); });
    });
    empty.style.display=shown?"none":"";
    count.textContent=shown===rows.length
      ? shown+" buildables"
      : shown+" of "+rows.length+" buildables";
  }

  document.querySelectorAll(".chip[data-role]").forEach(function(c){
    c.addEventListener("click",function(){
      document.querySelectorAll(".chip[data-role]").forEach(function(o){o.setAttribute("aria-pressed","false")});
      c.setAttribute("aria-pressed","true");
      role=c.dataset.role; apply();
    });
  });
  document.querySelectorAll(".chip[data-view]").forEach(function(c){
    c.addEventListener("click",function(){
      document.querySelectorAll(".chip[data-view]").forEach(function(o){o.setAttribute("aria-pressed","false")});
      c.setAttribute("aria-pressed","true");
      var g=c.dataset.view==="grid";
      grid.style.display=g?"":"none";
      table.style.display=g?"none":"";
    });
  });
  document.getElementById("catSearch").addEventListener("input",function(e){
    q=e.target.value.trim().toLowerCase(); apply();
  });
  table.querySelectorAll("th.sortable").forEach(function(th){
    th.addEventListener("click",function(){
      if(sortKey===th.dataset.sort){ sortDir=-sortDir; }
      else { sortKey=th.dataset.sort; sortDir=1; }
      table.querySelectorAll("th.sortable").forEach(function(o){o.removeAttribute("data-dir")});
      th.setAttribute("data-dir",sortDir>0?"asc":"desc");
      apply();
    });
  });
  apply();
})();
</script>`,
}));


// --- designs index + detail pages ---
write("designs/index.html", page({
  title: "WARDOGS Base Designs, built and rated by players",
  desc: "Player-built WARDOGS FOB designs, ranked by vote. Every one opens straight in the planner, fully editable, with its real Build Supply cost and supply runs worked out.",
  canonical: "/designs/",
  body: `<section><div class="wrap">
  <span class="eyebrow">Community</span>
  <h1>Base designs</h1>
  <p class="lede">Builds submitted by players, ranked by whoever found them useful.
  Every one opens in the planner, fully editable.</p>

  <div id="designList" style="margin-top:34px">
    ${withStats.length
      ? `<div class="grid">${ranked.map(designCard).join("")}</div>`
      : `<div class="empty">
          <h3>Nothing here yet</h3>
          <p>This list is built by players. Make something in the planner, hit Share,
          and paste the link below. The whole design travels inside the URL, so there is
          nothing to upload.</p>
        </div>`}
  </div>

  ${VOTE_API ? `
  <h2 class="display" style="margin-top:60px">Submit a build</h2>
  <p class="lede" style="font-size:17px">Paste the link from <strong>Share</strong> in the
  planner. The whole design travels inside it, so there is no file to upload.</p>
  <form class="form" id="submitForm">
    <div class="field">
      <label for="sCode">Share link</label>
      <input id="sCode" required placeholder="https://www.wardogsbuilder.com/planner/#d=...">
      <div class="hint">Open your design, hit Share, copy the link, paste it here.</div>
    </div>
    <div class="field">
      <label for="sName">Name it</label>
      <input id="sName" required maxlength="60" placeholder="Anti-climb perimeter">
    </div>
    <div class="field">
      <label for="sAuthor">Your name</label>
      <input id="sAuthor" maxlength="32" placeholder="anonymous">
    </div>
    <div class="field">
      <label for="sNote">What is it for</label>
      <textarea id="sNote" maxlength="300" placeholder="One or two lines on what it is good at."></textarea>
    </div>
    <div><button class="btn primary" type="submit">Submit</button></div>
    <div class="msg" id="submitMsg" style="display:none"></div>
  </form>
  <p style="font-size:13px;color:var(--dim);margin-top:20px">
  Submissions are read before they go up, which usually takes a few hours. Nothing is
  published automatically.</p>` : `
  <div class="note" style="margin-top:40px"><strong>Submissions are briefly closed.</strong>
  The service that stores designs is not answering, so the form is hidden rather than
  taking builds it would drop. Try again shortly.</div>`}
</div></section>${COMMUNITY_SCRIPT}`,
}));


for (const d of withStats) {
  const s = d.s;
  write(`designs/${d.slug}/index.html`, page({
    title: `${d.name}. WARDOGS base design`,
    desc: `${d.tagline} ${s.supplies} build supplies, ${s.pallets} pallets, ${s.hammer}.`,
    canonical: `/designs/${d.slug}/`,
    body: `<section><div class="wrap">
  <p style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--dim)">
    <a href="/designs/">Designs</a> / ${esc(d.name)}</p>
  <h1>${esc(d.name)}</h1>
  <p class="lede">${esc(d.tagline)}</p>
  <p style="margin:18px 0"><a class="btn" href="/planner/#d=${d.code}">Open in the planner</a></p>
  <div class="statbar">
    <div><b>${s.supplies.toLocaleString()}</b><span>build supplies</span></div>
    <div><b>${s.pallets}</b><span>pallets</span></div>
    <div><b>${s.truck}</b><span>truck trips</span></div>
    <div><b>${s.heli}</b><span>heli trips</span></div>
    <div><b>${s.pieces}</b><span>pieces</span></div>
  </div>
  <table>
    <tbody>
      <tr><td>Hammer needed</td><td class="n">${s.hammer}</td></tr>
      <tr><td>Vendor cash for supplies</td><td class="n">$${s.cash.toLocaleString()}</td></tr>
      <tr><td>Cost if bought as pallets</td><td class="n">$${s.palletCash.toLocaleString()}</td></tr>
      ${s.fobs ? `<tr><td>FOB item</td><td class="n">${s.fobs} × $${catalog.fob.vendorPrice.toLocaleString()}</td></tr>` : ""}
      ${s.resupply.length ? `<tr><td>Ongoing resupply</td><td class="n">${s.resupply.join(", ")}</td></tr>` : ""}
      ${s.cover ? `<tr><td>Cover above vaulting height</td><td class="n">${s.cover - s.vault} of ${s.cover}</td></tr>` : ""}
    </tbody>
  </table>
  <h2>Why it is built this way</h2>
  <p>${d.body}</p>
  <h2>What it is made of</h2>
  <table>
    <thead><tr><th>Buildable</th><th class="n">Qty</th><th class="n">Supplies</th></tr></thead>
    <tbody>${s.counts.map(([id, n]) => `<tr><td>${esc(byId[id].name)}</td>
      <td class="n">${n}</td><td class="n">${(n * byId[id].cost).toLocaleString()}</td></tr>`).join("")}
    </tbody>
  </table>
  <p><a class="btn" href="/planner/#d=${d.code}">Open in the planner</a></p>
</div></section>`,
  }));
}

// --- guides ---
write("guides/index.html", page({
  title: "WARDOGS Building Guides",
  desc: "Guides to building in WARDOGS: FOB placement and build order, build costs and supply runs, anti-climb walls, and which hammer to carry.",
  canonical: "/guides/",
  body: `<section><div class="wrap">
  <h1>WARDOGS building guides</h1>
  <p class="lede">What actually works, from closed beta footage and play testing.</p>
  <div class="grid" style="margin-top:20px">${GUIDES.map(g =>
    `<a class="card" href="/guides/${g.slug}/"><h3>${esc(g.title)}</h3><p>${esc(g.blurb)}</p></a>`).join("")}</div>
</div></section>`,
}));

for (const g of GUIDES) {
  write(`guides/${g.slug}/index.html`, page({
    title: g.title,
    desc: g.blurb,
    canonical: `/guides/${g.slug}/`,
    body: `<section><div class="wrap" style="max-width:760px">
  <p style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--dim)">
    <a href="/guides/">Guides</a></p>
  <h1>${esc(g.title)}</h1>
  <p class="lede">${esc(g.blurb)}</p>
  ${g.body}
  <p style="margin-top:28px"><a class="btn" href="/planner/">Open the planner</a></p>
</div></section>`,
  }));
}

// --- sitemap + robots ---

/* ---------- ballistics ----------
   The one page on this site with numbers nobody at BULKHEAD has published. Every figure is
   either transcribed from a public table or solved back out of one, the derivation is in
   docs/ballistics-sources.md, and tools/solve-ballistics.js fails the build if the two
   cross-checks stop passing. What could not be derived honestly is listed as unsolved
   rather than filled in, because a calculator that quietly guesses is worse than a gap. */
{
  const B = BALLISTICS;
  const roundNames = B.rounds.map(function (r) { return r.id; });
  const classes = [];
  B.weapons.forEach(function (w) { if (classes.indexOf(w.class) < 0) classes.push(w.class); });
  classes.sort();

  const calById = {};
  B.calibres.forEach(function (c) { calById[c.id] = c; });

  const ammoRows = B.calibres.map(function (c) {
    return "<tr><td><b>" + esc(c.name) + "</b></td>" +
      "<td class=n>" + (c.pellets ? c.perPellet + " &times; " + c.pellets : c.damage) + "</td>" +
      "<td class=n>" + (c.velocity[0] === c.velocity[1]
        ? c.velocity[0] + " m/s" : c.velocity[0] + "&ndash;" + c.velocity[1] + " m/s") + "</td>" +
      "<td class=n>" + c.mass.toFixed(1) + " g</td>" +
      "<td class=n>" + c.bullet.toFixed(1) + " mm</td>" +
      "<td>" + c.rounds.join(", ") + "</td>" +
      "<td class=fine>" + esc(B.weapons.filter(function (w) { return w.calibre === c.id; })
        .map(function (w) { return w.name; }).join(", ")) + "</td></tr>";
  }).join("");

  const armourRows = B.rounds.map(function (r) {
    return "<tr><td><b>" + esc(r.name) + "</b> <span class=fine>" + esc(r.long) + "</span></td>" +
      r.blocks.map(function (b) {
        return "<td class=n>" + b + "%<br><span class=fine>keeps " +
          (Math.round((100 - b) * 100) / 100) + "%</span></td>";
      }).join("") + "</tr>";
  }).join("");

  write("ballistics/index.html", page({
    title: "WARDOGS Ballistics: damage, shots to kill and armour",
    desc: "What every WARDOGS round does to every armour tier, per hit zone, with shots to kill and time to kill. Derived from published tables, with the working shown.",
    canonical: "/ballistics/",
    body: '<section><div class="wrap">' +
      '<span class="eyebrow">Pre-launch, checked ' + esc(B.checkedOn) + '</span>' +
      '<h1>Ballistics</h1>' +
      '<p class="lede">What each round does to each armour tier, where you hit, and how many' +
      ' of them it takes. Point blank, because range falloff is the one thing nobody has' +
      ' published enough of to work out honestly.</p>' +

      '<div class="chips" style="margin-top:26px">' +
        roundNames.map(function (r, i) {
          return '<button class="chip" data-round="' + r + '" aria-pressed="' +
            (i === 0 ? "true" : "false") + '">' + r + '</button>';
        }).join("") +
      '</div>' +
      '<div class="chips" style="margin-top:8px">' +
        [0, 1, 2, 3, 4].map(function (a) {
          return '<button class="chip" data-armour="' + a + '" aria-pressed="' +
            (a === 0 ? "true" : "false") + '">' +
            (a === 0 ? "No armour" : "Level " + a) + '</button>';
        }).join("") +
      '</div>' +
      '<div class="chips" style="margin-top:8px">' +
        '<button class="chip" data-cls="" aria-pressed="true">All</button>' +
        classes.map(function (c) {
          return '<button class="chip" data-cls="' + esc(c) + '" aria-pressed="false">' +
            esc(c) + '</button>';
        }).join("") +
      '</div>' +
      '<p style="margin:16px 0 0"><label class="fine">Hit zone &nbsp;' +
        '<select id="zone">' + B.zones.map(function (z, i) {
          return '<option value="' + z.id + '"' + (z.id === "upper-torso" ? " selected" : "") +
            '>' + esc(z.name) + (z.armour ? " (" + z.armour + ")" : "") + '</option>';
        }).join("") + '</select></label></p>' +

      '<table id="ball"><thead><tr>' +
        '<th class="sortable" data-sort="ttk" data-dir="asc">Weapon</th>' +
        '<th>Calibre</th><th class="n">Damage</th><th class="n">Shots</th>' +
        '<th class="n">Time to kill</th><th class="n">Rounds/min</th>' +
      '</tr></thead><tbody></tbody></table>' +
      '<p class="fine" id="ballnote"></p>' +

      '<h2 style="margin-top:52px">Ammo chart</h2>' +
      '<p>Per calibre, so every weapon chambering the same round starts from the same number.</p>' +
      '<table><thead><tr><th>Calibre</th><th class="n">Damage</th><th class="n">Velocity</th>' +
      '<th class="n">Mass</th><th class="n">Bullet</th><th>Loads</th><th>Chambered by</th></tr></thead>' +
      '<tbody>' + ammoRows + '</tbody></table>' +

      '<h2 style="margin-top:52px">What armour stops</h2>' +
      '<p>How much of a hit each armour tier takes off, by round type. This is the table the' +
      ' rest of the page is built on, and it is the one part three separate sources agree on.</p>' +
      '<table><thead><tr><th>Round</th><th class="n">Level 1</th><th class="n">Level 2</th>' +
      '<th class="n">Level 3</th><th class="n">Level 4</th></tr></thead>' +
      '<tbody>' + armourRows + '</tbody></table>' +

      '<div class="empty" style="margin-top:52px;text-align:left">' +
        '<span class="wip">Not solved yet</span>' +
        '<h3>Two things on this page are missing on purpose</h3>' +
        '<ul style="max-width:64ch">' + B.unsolved.map(function (u) {
          return "<li>" + esc(u) + "</li>";
        }).join("") + '</ul>' +
        '<p class="fine" style="margin:14px 0 0">Health is 100. Per-weapon damage is solved' +
        ' back out of published shots-to-kill figures rather than copied, which means it' +
        ' arrives with error bars: hover a damage figure to see the interval it came from.' +
        ' The full working, and the two checks it has to pass, are written up in' +
        ' docs/ballistics-sources.md in the repository.</p>' +
      '</div>' +

      '<p style="margin-top:34px"><a class="btn" href="/planner/">Open the planner</a></p>' +
      '</div></section>' +

      '<script>(function(){' +
      'var B=' + JSON.stringify({
        health: B.health, rounds: B.rounds, calibres: B.calibres,
        zones: B.zones, weapons: B.weapons,
      }) + ';' +
      'var calById={},zoneById={},roundById={};' +
      'B.calibres.forEach(function(c){calById[c.id]=c});' +
      'B.zones.forEach(function(z){zoneById[z.id]=z});' +
      'B.rounds.forEach(function(r){roundById[r.id]=r});' +
      'var round="FMJ",armour=0,cls="",zone="upper-torso";' +
      'function pick(w){' +
      ' var cal=calById[w.calibre];' +
      ' if(cal.rounds.indexOf(round)>=0)return round;' +
      ' return cal.rounds[0];}' +
      /* A round only reduces where the armour actually covers. Hit an unarmoured neck and
         the tier does not matter, which is the whole reason the zone picker is here. */
      'function calc(w){' +
      ' var z=zoneById[zone],r=roundById[pick(w)];' +
      ' var base=w.torso*z.mult;' +
      ' var keep=(armour>0&&z.armour)?(100-r.blocks[armour-1])/100:1;' +
      ' var dmg=base*keep;' +
      ' var stk=dmg>0?Math.ceil(B.health/dmg):Infinity;' +
      ' var ttk=(stk>1&&w.rpm)?(stk-1)/(w.rpm/60):0;' +
      ' return {dmg:dmg,stk:stk,ttk:ttk,round:r.id,keep:keep};}' +
      'function fmt(n){return n>=100?Math.round(n):Math.round(n*10)/10;}' +
      'function render(){' +
      ' var rows=B.weapons.filter(function(w){return !cls||w.class===cls;})' +
      '   .map(function(w){var c=calc(w);return {w:w,c:c};})' +
      '   .sort(function(a,b){return (a.c.ttk-b.c.ttk)||(a.c.stk-b.c.stk);});' +
      ' var tb=document.querySelector("#ball tbody");tb.innerHTML="";' +
      ' rows.forEach(function(row){' +
      '  var w=row.w,c=row.c,tr=document.createElement("tr");' +
      '  tr.innerHTML="<td><b>"+w.name+"</b> <span class=fine>"+w.class+"</span></td>"' +
      '   +"<td>"+calById[w.calibre].name+" <span class=fine>"+c.round+"</span></td>"' +
      /* Single quotes on the attribute so nothing here needs escaping. This line has
         already shipped broken once by way of a double quote that survived one layer of
         nesting and not the next. */
      '   +"<td class=n title=\'solved from shots to kill: "+w.range[0].toFixed(1)+" to "' +
      '     +w.range[1].toFixed(1)+" at the torso\'>"+fmt(c.dmg)+"</td>"' +
      '   +"<td class=n>"+c.stk+"</td>"' +
      '   +"<td class=n>"+(c.stk===1?"one shot":c.ttk.toFixed(2)+"s")+"</td>"' +
      '   +"<td class=n>"+(w.rpm||"&mdash;")+"</td>";' +
      '  tb.appendChild(tr);});' +
      ' var z=zoneById[zone];' +
      ' document.getElementById("ballnote").textContent=' +
      '  z.armour?(armour?"Level "+armour+" "+z.armour+" is taking a share of every hit here.":' +
      '   "This zone is covered by the "+z.armour+", so armour will matter once you set a tier.")' +
      '  :"Nothing covers this zone, so the armour tier changes nothing.";}' +
      'function group(attr,set){' +
      ' Array.prototype.forEach.call(document.querySelectorAll("[data-"+attr+"]"),function(b){' +
      '  b.addEventListener("click",function(){' +
      '   Array.prototype.forEach.call(document.querySelectorAll("[data-"+attr+"]"),function(o){' +
      '    o.setAttribute("aria-pressed",o===b?"true":"false");});' +
      '   set(b.getAttribute("data-"+attr));render();});});}' +
      'group("round",function(v){round=v;});' +
      'group("armour",function(v){armour=+v;});' +
      'group("cls",function(v){cls=v;});' +
      'document.getElementById("zone").addEventListener("change",function(e){' +
      ' zone=e.target.value;render();});' +
      'render();' +
      '}());<\/script>',
  }));
}

/* ---------- sections waiting on the game ----------
   Armory, Loadouts and Vehicles are all real plans, but every number in them has to be
   read off the game and the game is between tests. They ship as structure now so the
   pages exist, are linked, and are indexed - and so filling them in later is a data job
   rather than a build job. */
const COMING_SOON = [];
const LANDED = [
  {
    slug: "armory",
    nav: "Armory",
    title: "WARDOGS Armory - weapons, attachments and costs",
    h1: "Armory",
    desc: "Every WARDOGS weapon and attachment with what it costs to buy and run. In progress - the numbers go in as the game comes back up.",
    lede: "Every weapon and attachment, what it costs to buy, and what it costs to keep feeding.",
    plan: [
      "Each weapon with its vendor price, ammo type and what a full magazine costs to replace.",
      "Attachments listed per weapon - optics, muzzles, grips - with the price and what they actually change.",
      "Sorting by cost per magazine, so you can see which guns are cheap to run and which quietly drain cash.",
    ],
  },
  {
    slug: "loadouts",
    nav: "Loadouts",
    title: "WARDOGS Loadout Cost Calculator",
    h1: "Loadout calculator",
    desc: "Price up a full WARDOGS loadout - weapon, attachments, armour, ammo and gear - and see what one death costs you. In progress.",
    lede: "Pick a weapon, hang attachments off it, add armour and ammo, and see what the whole kit costs to field once.",
    plan: [
      "Build a kit from the armory and get a running total as you add to it.",
      "Cost per life: what you are actually writing off when the kit does not come home.",
      "Share a loadout by link, the same way base designs already work.",
    ],
  },
  {
    slug: "vehicles",
    nav: "Vehicles",
    title: "WARDOGS Vehicles - ground and air, costs and running costs",
    h1: "Vehicles",
    desc: "WARDOGS ground and air vehicles with purchase price, fuel and ammunition costs. In progress.",
    lede: "Ground and air, what each one costs to buy, and what it costs every time you take it out.",
    plan: [
      "Split by ground and air, with purchase price and crew requirement.",
      "Running costs: fuel per trip, and what a full ammo load costs on something like a tank.",
      "Repair and rearm costs, so a vehicle you keep alive can be compared against one you keep replacing.",
    ],
  },
];

void LANDED;
for (const c of COMING_SOON) {
  write(c.slug + "/index.html", page({
    title: c.title,
    desc: c.desc,
    canonical: "/" + c.slug + "/",
    body: `<section><div class="wrap">
  <span class="eyebrow">In progress</span>
  <h1>${esc(c.h1)}</h1>
  <p class="lede">${esc(c.lede)}</p>
  <div class="empty" style="margin-top:38px;text-align:left">
    <span class="wip">Waiting on the game</span>
    <h3>Not filled in yet</h3>
    <p style="margin:0 0 18px">WARDOGS is between tests, and every number on this page has to be
    read off the game rather than guessed. The page is here so it is ready the moment the
    servers are, and so nothing gets invented in the meantime.</p>
    <h3 style="margin-top:26px">What goes here</h3>
    <ul style="max-width:60ch">${c.plan.map(function(x){return "<li>" + esc(x) + "</li>"}).join("")}</ul>
  </div>
  <p style="margin-top:34px"><a class="btn" href="/planner/">Open the planner</a></p>
</div></section>`,
  }));
}


/* ---------- armory, loadouts and vehicles ----------
   One transcribed vendor catalogue behind all three. The armory browses it, the loadout
   calculator adds it up, and the vehicles page is the slice of it you can drive. Prices are
   read off the public database rather than derived, and an item the source has not
   confirmed shows as blank instead of a guess. */
{
  const A = ARMORY;
  const money = function (n) { return "$" + n.toLocaleString("en-US"); };
  const priceCell = function (it) {
    if (it.price === null) return '<span class="fine">not confirmed</span>';
    if (it.price === 0) return "Free";
    return money(it.price) + (it.per > 1 ? ' <span class="fine">/ ' + it.per + '</span>' : "");
  };

  /* Attachments only become usable in a loadout once you know what slot they fill, and the
     source does not say. The names do: a thing called a suppressor goes on the muzzle. */
  const slotOf = function (name) {
    const n = name.toLowerCase();
    if (n.indexOf("magazine") >= 0 || n.indexOf("mag") >= 0 || n.indexOf("drum") >= 0 ||
        n.indexOf(" box") >= 0) return "magazine";
    if (n.indexOf("suppressor") >= 0 || n.indexOf("brake") >= 0 || n.indexOf("flash hider") >= 0 ||
        n.indexOf("compensator") >= 0 || n.indexOf("choke") >= 0 || n.indexOf("muzzle") >= 0) return "muzzle";
    if (n.indexOf("grip") >= 0 || n.indexOf("bipod") >= 0 || n.indexOf("handguard") >= 0) return "grip";
    if (n.indexOf("scope") >= 0 || n.indexOf("sight") >= 0 || n.indexOf("reflex") >= 0 ||
        n.indexOf("optic") >= 0 || n.indexOf("prism") >= 0 || n.indexOf("red dot") >= 0 ||
        n.indexOf("hybrid") >= 0 || n.indexOf("lpvo") >= 0 || n.indexOf("pgo") >= 0 ||
        n.indexOf("kobra") >= 0 || n.indexOf("spectr") >= 0 || n.indexOf("spitfire") >= 0 ||
        n.indexOf("holographic") >= 0 || n.indexOf("10x") === 0 || n.indexOf("4x") === 0) return "optic";
    return "other";
  };

  const withSlots = A.items.map(function (it) {
    return it.cat === "attachments" ? Object.assign({}, it, { slot: slotOf(it.name) }) : it;
  });

  /* ---------- armory: browse the lot ---------- */
  const rows = withSlots.map(function (it) {
    return '<tr data-cat="' + it.cat + '" data-name="' + esc(it.name.toLowerCase()) +
      '" data-price="' + (it.price === null ? -1 : it.price) + '">' +
      "<td><b>" + esc(it.name) + "</b></td>" +
      "<td>" + esc((A.categories.find(function (c) { return c.id === it.cat; }) || {}).name || it.cat) +
        (it.slot && it.slot !== "other" ? ' <span class="fine">' + it.slot + "</span>" : "") + "</td>" +
      '<td class="n">' + priceCell(it) + "</td></tr>";
  }).join("");

  write("armory/index.html", page({
    title: "WARDOGS Armory: every item and what it costs",
    desc: "Every WARDOGS weapon, attachment, round, armour piece and vehicle with its vendor price. Search and sort the whole catalogue.",
    canonical: "/armory/",
    body: '<section><div class="wrap">' +
      '<span class="eyebrow">Vendor prices, checked ' + esc(A.checkedOn) + '</span>' +
      "<h1>Armory</h1>" +
      '<p class="lede">Every item you can buy, and what the vendor wants for it. ' +
      A.items.filter(function (i) { return i.price !== null; }).length +
      " of " + A.items.length + " have a confirmed price; the rest are blank rather than guessed.</p>" +
      '<div class="chips" style="margin-top:26px">' +
        '<button class="chip" data-cat="" aria-pressed="true">All<small>' + A.items.length + "</small></button>" +
        A.categories.map(function (c) {
          return '<button class="chip" data-cat="' + c.id + '" aria-pressed="false">' + esc(c.name) +
            "<small>" + A.items.filter(function (i) { return i.cat === c.id; }).length + "</small></button>";
        }).join("") +
      "</div>" +
      '<p style="margin:16px 0 0"><input id="q" type="search" placeholder="Search the catalogue" ' +
      'style="width:100%;max-width:420px;padding:10px 12px;background:var(--panel);color:var(--text);' +
      'border:1px solid var(--line);font-family:var(--ui)"></p>' +
      '<p class="fine" id="count" style="margin:10px 0 0"></p>' +
      '<table id="cat"><thead><tr><th class="sortable" data-sort="name" data-dir="asc">Item</th>' +
      '<th>Category</th><th class="n sortable" data-sort="price">Price</th></tr></thead>' +
      "<tbody>" + rows + "</tbody></table>" +
      '<p style="margin-top:34px"><a class="btn" href="/loadouts/">Price up a loadout</a></p>' +
      "</div></section>" +
      '<script>(function(){' +
      'var tb=document.querySelector("#cat tbody");' +
      'var all=Array.prototype.slice.call(tb.querySelectorAll("tr"));' +
      'var cat="",q="",sort="name",dir=1;' +
      'function apply(){' +
      ' var shown=0;' +
      ' all.forEach(function(tr){' +
      '  var okc=!cat||tr.getAttribute("data-cat")===cat;' +
      '  var okq=!q||tr.getAttribute("data-name").indexOf(q)>=0;' +
      '  tr.style.display=(okc&&okq)?"":"none";if(okc&&okq)shown++;});' +
      /* Category and search are an AND, so a search that looks like it should hit can come
         back empty because a category is still on. Say which, rather than leaving a bare
         zero on screen. */
      ' var msg=shown+" of "+all.length+" items";' +
      ' if(!shown&&cat&&q)msg+=". Nothing in that category matches that search.";' +
      ' document.getElementById("count").textContent=msg;}' +
      'function resort(){' +
      ' var rows=all.slice().sort(function(a,b){' +
      '  if(sort==="price"){' +
      '   var pa=+a.getAttribute("data-price"),pb=+b.getAttribute("data-price");' +
      /* an unconfirmed price sorts to the bottom whichever way the column is pointing,
         because "we do not know" is not a small number */
      '   if(pa<0&&pb<0)return 0;if(pa<0)return 1;if(pb<0)return -1;' +
      '   return (pa-pb)*dir;}' +
      '  return a.getAttribute("data-name").localeCompare(b.getAttribute("data-name"))*dir;});' +
      ' rows.forEach(function(r){tb.appendChild(r);});}' +
      'Array.prototype.forEach.call(document.querySelectorAll("[data-cat]"),function(b){' +
      ' if(b.tagName!=="BUTTON")return;' +
      ' b.addEventListener("click",function(){' +
      '  Array.prototype.forEach.call(document.querySelectorAll("button[data-cat]"),function(o){' +
      '   o.setAttribute("aria-pressed",o===b?"true":"false");});' +
      '  cat=b.getAttribute("data-cat");apply();});});' +
      'document.getElementById("q").addEventListener("input",function(e){' +
      ' q=e.target.value.toLowerCase().trim();apply();});' +
      'Array.prototype.forEach.call(document.querySelectorAll("th.sortable"),function(th){' +
      ' th.addEventListener("click",function(){' +
      '  var s=th.getAttribute("data-sort");' +
      '  dir=(s===sort)?-dir:1;sort=s;' +
      '  Array.prototype.forEach.call(document.querySelectorAll("th.sortable"),function(o){' +
      '   o.removeAttribute("data-dir");});' +
      '  th.setAttribute("data-dir",dir>0?"asc":"desc");' +
      '  resort();});});' +
      'apply();' +
      '}());<\/script>',
  }));

  /* ---------- loadouts: what one death costs ---------- */
  const opts = function (list, blank) {
    return '<option value="">' + blank + "</option>" + list.map(function (it) {
      return '<option value="' + esc(it.name) + '" data-price="' + (it.price === null ? 0 : it.price) +
        '"' + (it.price === null ? " data-unknown=1" : "") + ">" + esc(it.name) +
        (it.price === null ? " (price unknown)" : it.price === 0 ? " (free)" : " " + money(it.price)) +
        "</option>";
    }).join("");
  };
  const byCat = function (id) { return withSlots.filter(function (i) { return i.cat === id; }); };
  const attSlot = function (s) {
    return byCat("attachments").filter(function (i) { return i.slot === s; });
  };
  const nameHas = function (list, s) {
    return list.filter(function (i) { return i.name.toLowerCase().indexOf(s) >= 0; });
  };

  const slot = function (id, label, list, blank) {
    return '<p style="margin:0 0 14px"><label class="fine" style="display:block;margin-bottom:4px">' +
      esc(label) + "</label>" +
      '<select id="' + id + '" style="width:100%;max-width:460px">' + opts(list, blank) + "</select></p>";
  };

  write("loadouts/index.html", page({
    title: "WARDOGS Loadout Cost Calculator",
    desc: "Price up a full WARDOGS kit: weapon, attachments, armour, ammunition and gear, and see what one death actually costs you.",
    canonical: "/loadouts/",
    body: '<section><div class="wrap">' +
      '<span class="eyebrow">Vendor prices, checked ' + esc(A.checkedOn) + '</span>' +
      "<h1>Loadout calculator</h1>" +
      '<p class="lede">Build a kit and watch the number climb. Everything here is what you are' +
      " writing off the moment the kit does not come home.</p>" +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:0 34px;margin-top:30px">' +
      "<div>" +
      slot("w", "Weapon", byCat("weapons"), "No weapon") +
      slot("mag", "Magazine", attSlot("magazine"), "None") +
      slot("opt", "Optic", attSlot("optic"), "None") +
      slot("muz", "Muzzle", attSlot("muzzle"), "None") +
      slot("grip", "Grip or bipod", attSlot("grip"), "None") +
      "</div><div>" +
      slot("hel", "Helmet", nameHas(byCat("armour"), "helmet").concat(nameHas(byCat("armour"), "headwear")), "Bare head") +
      slot("arm", "Body armour", byCat("armour").filter(function (i) {
        const n = i.name.toLowerCase();
        return n.indexOf("helmet") < 0 && n.indexOf("headwear") < 0;
      }), "No armour") +
      slot("bag", "Backpack", nameHas(byCat("storage"), "backpack"), "None") +
      slot("vest", "Rig", nameHas(byCat("storage"), "tac vest").concat(nameHas(byCat("storage"), "pouch")), "None") +
      '<p style="margin:0 0 14px"><label class="fine" style="display:block;margin-bottom:4px">Ammunition</label>' +
      '<select id="ammo" style="width:100%;max-width:340px"></select> ' +
      '<label class="fine">&times; <input id="mags" type="number" min="0" max="20" value="3" ' +
      'style="width:64px;padding:6px;background:var(--panel);color:var(--text);border:1px solid var(--line)"> ' +
      "magazines</label></p>" +
      "</div></div>" +

      '<h2 style="margin-top:34px">Extras</h2>' +
      '<div class="chips" style="margin-top:10px">' +
        byCat("throwables").concat(byCat("medical")).concat(byCat("equipment"))
          .filter(function (i) { return i.price !== null; })
          .map(function (i) {
            return '<button class="chip" data-extra="' + esc(i.name) + '" data-price="' + i.price +
              '" aria-pressed="false">' + esc(i.name) + "<small>" + money(i.price) + "</small></button>";
          }).join("") +
      "</div>" +

      '<div class="empty" style="margin-top:40px;text-align:left">' +
        '<h3 style="margin:0">Cost per life</h3>' +
        '<p id="total" style="font-family:var(--display);font-size:44px;line-height:1;margin:10px 0 6px;' +
        'color:var(--red-hot)">$0</p>' +
        '<p class="fine" id="breakdown" style="margin:0"></p>' +
        '<p class="fine" id="warn" style="margin:10px 0 0"></p>' +
      "</div>" +
      '<p style="margin-top:34px"><a class="btn" href="/armory/">Browse the armory</a> ' +
      '<a class="btn" href="/ballistics/">Check what it kills</a></p>' +
      "</div></section>" +

      '<script>(function(){' +
      'var AMMO=' + JSON.stringify(byCat("ammunition").map(function (i) {
        return { name: i.name, price: i.price, per: i.per };
      })) + ';' +
      'var CAL=' + JSON.stringify(byCat("weapons").reduce(function (m, w) {
        if (w.calibre) m[w.name] = w.calibre; return m;
      }, {})) + ';' +
      'var MAGSIZE=' + JSON.stringify((function () {
        /* A magazine's name states how many rounds it holds, which is the only way to turn
           "three magazines" into a number of rounds to pay for. */
        const out = {};
        attSlot("magazine").forEach(function (m) {
          const n = m.name.match(/(\d+)\s*RND/i);
          if (n) out[m.name] = Number(n[1]);
        });
        return out;
      }())) + ';' +
      'var sel=["w","mag","opt","muz","grip","hel","arm","bag","vest"];' +
      'var extras={};' +
      'function el(id){return document.getElementById(id);}' +
      'function priceOf(id){' +
      ' var s=el(id),o=s.options[s.selectedIndex];' +
      ' if(!o||!o.value)return {p:0,unknown:false};' +
      ' return {p:+o.getAttribute("data-price")||0,unknown:!!o.getAttribute("data-unknown")};}' +
      'function fillAmmo(){' +
      ' var w=el("w").value,cal=CAL[w],s=el("ammo"),keep=s.value;' +
      ' var list=AMMO.filter(function(a){' +
      '  return a.price!==null&&(!cal||a.name.indexOf(cal)===0);});' +
      ' if(!list.length)list=AMMO.filter(function(a){return a.price!==null;});' +
      /* Built with DOM calls rather than an innerHTML string. Option markup needs a quote
         inside a quote inside a quote by the time it has crossed this file's template
         literal, and that is exactly the nesting that has shipped broken twice. */
      ' s.textContent="";' +
      ' var none=document.createElement("option");' +
      ' none.value="";none.textContent="None";s.appendChild(none);' +
      ' list.forEach(function(a){' +
      '  var o=document.createElement("option");' +
      '  o.value=a.name;' +
      '  o.setAttribute("data-price",a.price);' +
      '  o.setAttribute("data-per",a.per);' +
      '  o.textContent=a.name+" $"+a.price+" / "+a.per;' +
      '  s.appendChild(o);});' +
      ' if(keep)s.value=keep;}' +
      'function ammoCost(){' +
      ' var s=el("ammo"),o=s.options[s.selectedIndex];' +
      ' if(!o||!o.value)return {cost:0,rounds:0};' +
      ' var per=+o.getAttribute("data-per")||1,price=+o.getAttribute("data-price")||0;' +
      ' var size=MAGSIZE[el("mag").value]||30;' +
      ' var rounds=size*(+el("mags").value||0);' +
      /* You buy rounds in packs, so a part pack still costs a whole one. */
      ' return {cost:Math.ceil(rounds/per)*price,rounds:rounds};}' +
      'function render(){' +
      ' var total=0,unknown=0,parts=[];' +
      ' sel.forEach(function(id){var r=priceOf(id);total+=r.p;if(r.unknown)unknown++;});' +
      ' var a=ammoCost();total+=a.cost;' +
      ' Object.keys(extras).forEach(function(k){total+=extras[k];});' +
      ' el("total").textContent="$"+total.toLocaleString("en-US");' +
      ' if(a.rounds)parts.push(a.rounds+" rounds for $"+a.cost.toLocaleString("en-US"));' +
      ' var ne=Object.keys(extras).length;' +
      ' if(ne)parts.push(ne+" extra"+(ne>1?"s":""));' +
      ' el("breakdown").textContent=parts.join(" \u00b7 ");' +
      ' el("warn").textContent=unknown?' +
      '  unknown+" item"+(unknown>1?"s have":" has")+" no confirmed price yet and counts as zero."' +
      '  :"";}' +
      'sel.forEach(function(id){el(id).addEventListener("change",function(){' +
      ' if(id==="w")fillAmmo();render();});});' +
      'el("ammo").addEventListener("change",render);' +
      'el("mags").addEventListener("input",render);' +
      'Array.prototype.forEach.call(document.querySelectorAll("[data-extra]"),function(b){' +
      ' b.addEventListener("click",function(){' +
      '  var k=b.getAttribute("data-extra");' +
      '  if(extras[k]!==undefined){delete extras[k];b.setAttribute("aria-pressed","false");}' +
      '  else{extras[k]=+b.getAttribute("data-price");b.setAttribute("aria-pressed","true");}' +
      '  render();});});' +
      'fillAmmo();render();' +
      '}());<\/script>',
  }));

  /* ---------- vehicles ---------- */
  const isAir = function (n) {
    return /AH-6|MH-6|UH-1|Havoc/.test(n);
  };
  const vehRows = function (list) {
    return list.map(function (v) {
      return "<tr><td><b>" + esc(v.name) + "</b></td><td class=n>" + priceCell(v) + "</td></tr>";
    }).join("");
  };
  const veh = byCat("vehicles");
  const air = veh.filter(function (v) { return isAir(v.name); });
  const ground = veh.filter(function (v) { return !isAir(v.name); });

  write("vehicles/index.html", page({
    title: "WARDOGS Vehicles: ground, air and what they cost",
    desc: "Every WARDOGS ground and air vehicle with its vendor price, plus the mounted weapons that go on them.",
    canonical: "/vehicles/",
    body: '<section><div class="wrap">' +
      '<span class="eyebrow">Vendor prices, checked ' + esc(A.checkedOn) + '</span>' +
      "<h1>Vehicles</h1>" +
      '<p class="lede">What each one costs to put on the field. A Havoc is thirty-six Bobcats,' +
      " which is the sort of thing worth knowing before you drive it into a Gepard.</p>" +
      '<h2 style="margin-top:36px">Ground</h2>' +
      '<table><thead><tr><th>Vehicle</th><th class="n">Price</th></tr></thead><tbody>' +
      vehRows(ground) + "</tbody></table>" +
      '<h2 style="margin-top:44px">Air</h2>' +
      '<table><thead><tr><th>Aircraft</th><th class="n">Price</th></tr></thead><tbody>' +
      vehRows(air) + "</tbody></table>" +
      '<h2 style="margin-top:44px">Mounted weapons</h2>' +
      "<p>What sits on top of them, and on your emplacements. Most of these have no vendor" +
      " price of their own because they arrive attached to something.</p>" +
      '<table><thead><tr><th>Weapon</th><th class="n">Price</th></tr></thead><tbody>' +
      vehRows(byCat("mounted")) + "</tbody></table>" +
      '<p class="fine" style="margin-top:26px">Fuel and repair costs are not in the public' +
      " database yet. A fuel can is " + money(150) + " and a fuel supply pallet is " + money(400) +
      ", which is as close as anyone can honestly get until launch.</p>" +
      '<p style="margin-top:34px"><a class="btn" href="/planner/">Open the planner</a></p>' +
      "</div></section>",
  }));
}

/* ---------- moderation ----------
   Not linked from anywhere, not in the sitemap, and noindex. It holds no secret itself:
   the admin token is typed in and kept in this browser only, and the worker is what
   actually checks it. Losing this page to a stranger gives them nothing. */
if (VOTE_API) write("moderate/index.html", page({
  title: "Moderate",
  desc: "Review submitted designs.",
  canonical: "/moderate/",
  noindex: true,
  body: `<section><div class="wrap" style="max-width:860px">
  <h1>Moderate</h1>
  <p class="lede">Submitted designs wait here until you approve them.</p>
  <div class="field" style="max-width:420px;margin:26px 0">
    <label for="tok">Admin token</label>
    <input id="tok" type="password" placeholder="the ADMIN_TOKEN secret">
    <div class="hint">Kept in this browser only. Never sent anywhere but your own worker.</div>
  </div>
  <div style="display:flex;gap:12px;flex-wrap:wrap">
    <button class="btn" id="load">Design queue</button>
    <button class="btn" id="loadFb">Feedback</button>
    <button class="btn sm" id="dumpFb">Download all as JSON</button>
  </div>
  <div id="out" style="margin-top:30px"></div>
</div></section>
<script>
(function(){
var API=${JSON.stringify(VOTE_API)};
var tokEl=document.getElementById("tok"), out=document.getElementById("out");
try{ tokEl.value=localStorage.getItem("wardogs.admin")||""; }catch(e){}
var esc=function(s){return String(s).replace(/[&<>"']/g,function(c){
  return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});};

function call(path,opts){
  opts=opts||{};
  opts.headers=Object.assign({"Content-Type":"application/json",
    "X-Admin-Token":tokEl.value},opts.headers||{});
  return fetch(API+path,opts).then(function(r){
    return r.json().then(function(j){ if(!r.ok) throw new Error(j.error||("HTTP "+r.status)); return j; });
  });
}
function render(ds){
  if(!ds.length){ out.innerHTML='<div class="empty"><h3>Queue is empty</h3><p>Nothing waiting.</p></div>'; return; }
  out.innerHTML=ds.map(function(d){
    return '<div class="card" style="border:1px solid var(--line);margin-bottom:1px">'+
      '<h3>'+esc(d.name)+'</h3>'+
      '<p>'+esc(d.note||"(no description)")+'</p>'+
      '<div class="stats"><span>by</span>'+esc(d.author)+'<span>slug</span>'+esc(d.slug)+'</div>'+
      '<div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap">'+
      '<a class="btn sm" target="_blank" rel="noopener" href="/planner/#d='+esc(d.code)+'">Open it first</a>'+
      '<button class="btn sm" data-act="approve" data-slug="'+esc(d.slug)+'">Approve</button>'+
      '<button class="btn sm" data-act="reject" data-slug="'+esc(d.slug)+'">Reject</button>'+
      '<button class="btn sm" data-act="delete" data-slug="'+esc(d.slug)+'">Delete</button>'+
      '</div></div>';
  }).join("");
}
function load(){
  out.textContent="Loading...";
  try{ localStorage.setItem("wardogs.admin",tokEl.value); }catch(e){}
  call("/admin/pending").then(function(j){ render(j.designs||[]); })
    .catch(function(e){ out.innerHTML='<div class="msg">'+esc(e.message)+'</div>'; });
}
document.getElementById("load").addEventListener("click",load);

/* Feedback is read here and nowhere else. The JSON dump is the way out: everything
   people have sent, in one file, to do whatever you want with later. */
function renderFeedback(items){
  if(!items.length){
    out.innerHTML='<div class="empty"><h3>Nothing yet</h3><p>Nobody has sent anything in.</p></div>';
    return;
  }
  out.innerHTML=items.map(function(f){
    return '<div class="card" style="border:1px solid var(--line);margin-bottom:1px">'+
      '<div class="stats" style="margin:0 0 10px"><span>'+esc(f.kind)+'</span>'+
      new Date(f.at).toLocaleString()+
      (f.contact?'<span>reply to</span>'+esc(f.contact):"")+'</div>'+
      '<p style="white-space:pre-wrap;overflow-wrap:anywhere;color:var(--text)">'+esc(f.text)+'</p>'+
      '<div style="margin-top:14px"><button class="btn sm" data-fbkey="'+esc(f.key)+'">Delete</button></div></div>';
  }).join("");
}
function loadFeedback(){
  out.textContent="Loading...";
  try{ localStorage.setItem("wardogs.admin",tokEl.value); }catch(e){}
  return call("/admin/feedback").then(function(j){ renderFeedback(j.feedback||[]); })
    .catch(function(e){ out.innerHTML='<div class="msg">'+esc(e.message)+'</div>'; });
}
document.getElementById("loadFb").addEventListener("click",loadFeedback);
document.getElementById("dumpFb").addEventListener("click",function(){
  call("/admin/feedback").then(function(j){
    var blob=new Blob([JSON.stringify(j.feedback||[],null,2)],{type:"application/json"});
    var a=document.createElement("a");
    a.href=URL.createObjectURL(blob);
    a.download="wardogs-feedback.json";
    a.click();
    URL.revokeObjectURL(a.href);
  }).catch(function(e){ alert(e.message); });
});
out.addEventListener("click",function(ev){
  var fb=ev.target.closest("button[data-fbkey]");
  if(fb){
    if(!confirm("Delete this feedback?")) return;
    fb.disabled=true;
    call("/admin/feedback/delete",{method:"POST",body:JSON.stringify({key:fb.dataset.fbkey})})
      .then(loadFeedback).catch(function(e){ fb.disabled=false; alert(e.message); });
    return;
  }
  var b=ev.target.closest("button[data-act]"); if(!b) return;
  if(b.dataset.act==="delete" && !confirm("Delete this permanently?")) return;
  b.disabled=true;
  call("/admin/design",{method:"POST",
    body:JSON.stringify({slug:b.dataset.slug,action:b.dataset.act})})
    .then(load).catch(function(e){ b.disabled=false; alert(e.message); });
});
if(tokEl.value) load();
})();
</script>`,
}));


/* ---------- feedback ----------
   A suggestion box, not a forum. Nothing sent here is published, which is what keeps it
   free of moderation: there is no audience to spam. Without a service configured the page
   still exists and says where to go instead, rather than showing a form that silently
   drops what people write. */
write("feedback/index.html", page({
  title: "Feedback",
  desc: "Tell me what to add, what is broken, or which number is wrong. Goes straight to the person who builds this.",
  canonical: "/feedback/",
  body: `<section><div class="wrap" style="max-width:720px">
  <span class="eyebrow">Say something</span>
  <h1>Feedback</h1>
  <p class="lede">This is one person's side project, so there is nobody to escalate to.
  Whatever you write here I read.</p>

  ${VOTE_API ? `
  <form class="form" id="fbForm">
    <div class="field">
      <label for="fbKind">What is it</label>
      <select id="fbKind" style="width:100%;background:var(--panel);color:var(--text);
        border:1px solid var(--line2);padding:11px 13px;font-family:var(--ui);font-size:15px">
        <option value="idea">Something to add</option>
        <option value="bug">Something is broken</option>
        <option value="data">A number is wrong</option>
        <option value="other">Something else</option>
      </select>
    </div>
    <div class="field">
      <label for="fbText">Go on</label>
      <textarea id="fbText" required maxlength="4000" style="min-height:150px"
        placeholder="Be as blunt as you like. If it is a wrong number, say which buildable and what it should be."></textarea>
    </div>
    <div class="field">
      <label for="fbContact">Reply to (optional)</label>
      <input id="fbContact" maxlength="120" placeholder="Discord, Reddit, email, or leave it blank">
      <div class="hint">Only so I can come back to you. Nothing is sent to it automatically,
      and it is never shown on the site.</div>
    </div>
    <div><button class="btn primary" type="submit">Send</button></div>
    <div class="msg" id="fbMsg" style="display:none"></div>
  </form>
  <p style="font-size:13px;color:var(--dim);margin-top:24px">
  Nothing you write here appears on the site. It goes into a private list I read and work
  from. See the <a href="/privacy/">privacy page</a> for what that stores.</p>` : `
  <div class="note" style="margin-top:30px"><strong>The form is briefly down.</strong>
  Nothing you send right now would reach me, so rather than swallow it quietly the form is
  hidden. Try again shortly.</div>`}

  <h2 style="margin-top:56px">Most useful things to tell me</h2>
  <ul style="max-width:60ch">
    <li><strong>A cost or size that is wrong.</strong> Everything in the planner was read off
    the radial menu frame by frame, so some of it will be off. Say which piece and what the
    real number is and it gets fixed for everyone.</li>
    <li><strong>Something the game does that the planner does not know about.</strong>
    Stacking rules, what can sit on what, anything that will not build in game but the
    planner allows.</li>
    <li><strong>Anything that is annoying to use.</strong> Especially if it is annoying every
    single time. Those are the ones worth fixing.</li>
  </ul>
</div></section>
${VOTE_API ? `<script>
(function(){
var API=${JSON.stringify(VOTE_API)};
var f=document.getElementById("fbForm"), out=document.getElementById("fbMsg");
f.addEventListener("submit",function(e){
  e.preventDefault();
  out.style.display=""; out.className="msg"; out.textContent="Sending...";
  fetch(API+"/feedback",{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({kind:document.getElementById("fbKind").value,
      text:document.getElementById("fbText").value,
      contact:document.getElementById("fbContact").value,
      page:document.referrer||""})})
    .then(function(r){return r.json().then(function(j){ if(!r.ok) throw new Error(j.error||"That did not send."); return j; });})
    .then(function(){ f.reset(); out.className="msg good"; out.textContent="Got it. Thanks."; })
    .catch(function(err){ out.className="msg"; out.textContent=err.message; });
});
})();
</script>` : ""}`,
}));


/* ---------- account ----------
   What a signed-in player has saved, in one place. Designs live against the account
   rather than in a browser, so this is where they are visible from any machine. Not in
   the sitemap: there is nothing here for anyone who is not signed in. */
if (VOTE_API) write("account/index.html", page({
  title: "Your account",
  desc: "Your saved WARDOGS base designs.",
  canonical: "/account/",
  noindex: true,
  body: `<section><div class="wrap" style="max-width:860px">
  <span class="eyebrow">Account</span>
  <h1>Your designs</h1>
  <p class="lede">Everything you have saved from the planner. These live against your
  Discord account, so they follow you to another browser or machine.</p>
  <div id="acctBody" style="margin-top:34px">Checking...</div>
</div></section>
<script>
(function(){
var API=${JSON.stringify(VOTE_API)};
var A=window.wardogsAuth, box=document.getElementById("acctBody");
function esc(s){return String(s).replace(/[&<>"']/g,function(c){
  return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
A.ready.then(function(me){
  if(!me.loginEnabled){ box.innerHTML='<div class="empty"><h3>Accounts are not live</h3></div>'; return; }
  if(!me.user){
    box.innerHTML='<div class="empty"><h3>Not signed in</h3>'+
      '<p>Sign in and anything you save from the planner shows up here.</p>'+
      '<a class="btn primary" href="'+A.signInUrl(location.origin+"/account/")+'">Sign in with Discord</a></div>';
    return;
  }
  load();
});
function load(){
  fetch(API+"/mine",{headers:A.headers()})
    .then(function(r){return r.json();})
    .then(function(j){
      var ds=j.designs||[];
      if(!ds.length){
        box.innerHTML='<div class="empty"><h3>Nothing saved yet</h3>'+
          '<p>Open a design in the planner, press <strong>Designs</strong>, then '+
          '<strong>Save this design online</strong>.</p>'+
          '<a class="btn primary" href="/planner/">Open the planner</a></div>';
        return;
      }
      box.innerHTML='<div class="grid">'+ds.map(function(d){
        return '<div class="card"><h3>'+esc(d.name)+'</h3>'+
          '<div class="stats"><span>saved</span>'+new Date(d.at).toLocaleDateString()+'</div>'+
          '<div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap">'+
          '<a class="btn sm" href="/planner/#d='+esc(d.code)+'">Open</a>'+
          '<button class="btn sm" data-copy="'+esc(d.code)+'">Copy link</button>'+
          '<button class="btn sm" data-del="'+esc(d.name)+'">Delete</button></div></div>';
      }).join("")+'</div>'+
      '<p style="margin-top:24px;font-size:13px;color:var(--dim)">'+ds.length+' of '+
      (j.limit||40)+' slots used.</p>';
    })
    .catch(function(){ box.innerHTML='<div class="msg">Could not reach the save service.</div>'; });
}
box.addEventListener("click",function(e){
  var c=e.target.closest("[data-copy]");
  if(c){
    var url=location.origin+"/planner/#d="+c.dataset.copy;
    navigator.clipboard.writeText(url).then(function(){
      var was=c.textContent; c.textContent="Copied"; setTimeout(function(){c.textContent=was;},1400);
    }).catch(function(){ prompt("Copy this link",url); });
    return;
  }
  var d=e.target.closest("[data-del]");
  if(d){
    if(!confirm('Delete "'+d.dataset.del+'" from your account? The copy in your browser is not touched.')) return;
    d.disabled=true;
    fetch(API+"/mine/delete",{method:"POST",headers:A.headers(),
      body:JSON.stringify({name:d.dataset.del})}).then(load).catch(function(){d.disabled=false;});
  }
});
})();
</script>`,
}));

const urls = ["/", "/planner/", "/designs/", "/buildables/", "/armory/", "/ballistics/", "/loadouts/", "/vehicles/", "/guides/", "/feedback/", "/privacy/"]
  .concat(withStats.map(d => `/designs/${d.slug}/`))
  .concat(GUIDES.map(g => `/guides/${g.slug}/`));
write("sitemap.xml",
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map(u => `  <url><loc>${SITE}${u}</loc></url>`).join("\n") + `\n</urlset>\n`);
write("robots.txt", `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);

/* ads.txt tells ad exchanges which publisher is allowed to sell this domain's inventory.
   Without it a lot of buyers will not bid, and AdSense flags the site. It is only written
   once there is a publisher id to claim - an ads.txt naming nobody is worse than none. */
if (adsOn) {
  const pub = ADS.publisherId.replace(/^ca-/, "");
  write("ads.txt", `google.com, ${pub}, DIRECT, f08c47fec0942fa0\n`);
} else {
  // Turning ads off has to actually remove the claim. A leftover ads.txt keeps telling
  // every exchange that a publisher may sell this domain long after that stopped being
  // true, and nothing on the page would show it.
  const stale = path.join(DOCS, "ads.txt");
  if (fs.existsSync(stale)) { fs.rmSync(stale); console.log("  removed stale ads.txt"); }
}

/* A privacy policy is not optional once third-party ads are on the page - AdSense
   requires one, and it is one of the commonest reasons a site is turned down. It is
   written to be true of this site specifically rather than pasted from a generator:
   the planner genuinely stores nothing server-side, and that is worth saying plainly. */
write("privacy/index.html", page({
  title: "Privacy - WARDOGS Base Builder",
  desc: "What this site stores, what it does not, and what the advertising and vote services see.",
  canonical: "/privacy/",
  body: `<section><div class="wrap" style="max-width:760px">
  <span class="eyebrow">Legal</span>
  <h1>Privacy</h1>
  <p class="lede">The short version: your designs never leave your browser, there are no
  accounts, and I cannot see what you build.</p>

  <h2 style="margin-top:44px">What the planner stores</h2>
  <p>By default, everything stays in your browser. Designs save themselves to local storage
  on your own machine as you work. No account, nothing uploaded, and no copy anywhere I can
  reach. Clearing your browser data deletes them and nobody, me included, can get them back.</p>
  ${VOTE_API ? `<p><strong>Unless you choose to save one online.</strong> If you sign in and
  press <em>Save this design online</em>, that design is stored against your Discord account
  so it survives a cleared browser and follows you to another machine. Only designs you
  explicitly save are kept: nothing is uploaded in the background, and autosave stays local.
  You can delete any of them from the same panel, which removes them for good. I can see
  them, in the sense that I run the storage, and I do not look at them or do anything with
  them.</p>` : ""}
  <p>When you use <strong>Share</strong>, the whole design is encoded into the link itself.
  The link is not uploaded or registered anywhere; whoever you send it to decodes it in
  their own browser. If you never send it, it never leaves your machine.</p>

  <h2>What the site collects</h2>
  <p>Nothing directly. There is no analytics script, no tracking pixel, no newsletter, and
  no contact form. I do not know who visits or what they build.</p>
  <p>The site is hosted on GitHub Pages, which keeps its own server logs including IP
  addresses, as any web host does. That is covered by
  <a href="https://docs.github.com/site-policy/privacy-policies/github-privacy-statement">GitHub's privacy statement</a>.</p>

  <h2>Advertising</h2>
  ${adsOn ? `<p>This site shows ads from Google AdSense on its article and reference pages.
  Google and its partners use cookies and similar technologies to serve and measure those
  ads, and may personalise them based on your prior visits to this and other sites. That
  processing is Google's, not mine - I never see it and cannot access it.</p>
  <p>You can control or turn off personalised advertising at
  <a href="https://myadcenter.google.com/">Google My Ad Center</a>, and read how Google uses
  data from sites that use its services at
  <a href="https://policies.google.com/technologies/partner-sites">policies.google.com/technologies/partner-sites</a>.
  If you are in the EEA, the UK or Switzerland, you will be asked for consent before any
  personalised ads are served, and you can change that choice at any time.</p>
  <p><strong>The planner itself carries no ads and loads nothing from Google.</strong> It is
  a single self-contained page and works with no network connection at all.</p>`
  : `<p>The site currently shows no ads and loads no advertising code. If that changes,
  this page will say so before it happens, and will name exactly what the ad provider
  collects.</p>`}

  <h2>Designs and feedback you send in</h2>
  ${VOTE_API ? `<p>If you submit a design, what gets stored is the design itself, the name you
  gave it, and the name you asked to be credited under. If you post a comment, the same.
  Both are public once approved, which is the point of them.</p>
  <p>The feedback form is the opposite: nothing sent through it is ever published. It stores
  what you wrote, which of the four categories you picked, and the contact you gave if you
  gave one. The contact is only so I can come back to you about it. It is not added to any
  list, nothing is sent to it automatically, and it is not passed to anyone.</p>`
  : `<p>Submissions and feedback are not open yet. When they are, this section will say
  exactly what each one stores.</p>`}

  <h2>Voting on community designs</h2>
  ${VOTE_API ? `<p>Voting needs to stop one person voting a hundred times, and there are no
  accounts here to do it with. So when you vote, the service stores a one-way hash of your
  IP address combined with the design id. Your address itself is not stored, is not
  recoverable from the hash, and is not linked to anything else you do on the site. It is
  kept for a year so the buttons can show you what you already picked.</p>`
  : `<p>Voting is not live yet. When it is, it will work without accounts and this section
  will describe exactly what it stores.</p>`}

  <h2>Cookies</h2>
  <p>The site sets no cookies of its own.${adsOn ? ` Google's advertising cookies are described
  above, and if you are shown the consent banner your answer is stored on your device so you
  are not asked again on every page. You can reopen that choice and change it at any time
  from the privacy link the banner leaves behind.` : ""}
  Local storage is used for your saved designs and interface preferences, which is not the
  same thing as a cookie: it is never transmitted anywhere, only read by the page itself.</p>

  <h2>Children</h2>
  <p>This site is not directed at children under 13 and does not knowingly collect anything
  from them.</p>

  <h2>Changes and contact</h2>
  <p>If this policy changes in a way that affects what is collected, the change will be
  visible in this site's
  <a href="https://github.com/Goldpip3/wardogs-base-builder/commits/main">public commit history</a>,
  which is the whole record of how the site was built. Questions or corrections go through
  the <a href="/feedback/">feedback form</a>.</p>
</div></section>`,
}));

sweepDesignPages();

console.log(`site: ${urls.length} pages`);
for (const d of withStats)
  console.log(`  ${d.slug.padEnd(24)} ${String(d.s.supplies).padStart(5)} supplies, ${String(d.s.pieces).padStart(3)} pieces, code ${d.code.length} chars`);
