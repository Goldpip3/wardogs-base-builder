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

/* ---------- the seeded designs ---------- */
const DESIGNS = [
  {
    slug: "starter-fob",
    name: "Starter FOB",
    tagline: "The cheapest thing worth building. A walled box with a gate and a door.",
    body: `If you have never built a FOB, build this one. It is a closed perimeter with
      exactly one vehicle entrance and one infantry door, and nothing else. It costs less
      than a single Drill Rig and it is the difference between a FOB that survives contact
      and a supply crate sitting in the open.<br><br>
      Everything is waist-height Hesco, so it is cheap and fast — but it is also vaultable.
      Once the position is holding, upgrade the wall run to tall Hesco and cap it with
      Bremer walls, which is what the Anti-climb Perimeter design does.`,
    pieces: [
      P("__fob__", 0, 0),
      ...run("hesco-small", -8, -6, 8, -6), ...run("hesco-small", -8, 6, 8, 6),
      ...run("hesco-small", -8, -5, -8, 5, 90), ...run("hesco-small", 8, -5, 8, 5, 90),
      P("gate", -1.5, 6), P("door", -8, 0, 90),
    ],
  },
  {
    slug: "mortar-pit",
    name: "Mortar Pit",
    tagline: "L81 ringed one block out, so your own parapet does not eat the shells.",
    body: `The mistake everyone makes first is walling a mortar in with tall Hesco and then
      watching the rounds detonate on their own wall. The fix is two things: keep the ring
      <strong>waist height</strong>, and keep it <strong>one block clear</strong> of the
      tube.<br><br>
      This is that layout — a 4×4 L81 with a low Hesco ring at radius 3 and a door on the
      south face. The mortar converts Ammo supplies from the FOB into shells, so it only
      works while somebody keeps hauling ammo pallets.`,
    pieces: [P("__fob__", 12, 0), ...pit("l81-mortar", 0, 0)],
  },
  {
    slug: "aa-nest",
    name: "AA Nest",
    tagline: "Low Hesco with sandbags on top — the height the community settled on for the CIWS.",
    body: `The Vanguard CIWS needs clear sky and a gunner who is not immediately shot. Low
      Hesco alone leaves you exposed; tall Hesco blocks the gun. Stacking sandbags on top of
      low Hesco lands in between, and gives you peek-downs on the approach.<br><br>
      Keep the sky above it clear — anything built over an emplacement blocks it, and the
      planner will flag that.`,
    pieces: [
      P("__fob__", 12, 0),
      ...pit("vanguard-ciws", 0, 0),
      ...[-3, -1, 1, 3].flatMap(x => [P("sandbag-wall", x, -3, 0, 1), P("sandbag-wall", x, 3, 0, 1)]),
    ],
  },
  {
    slug: "anti-climb-perimeter",
    name: "Anti-climb Perimeter",
    tagline: "Quad Hesco wall capped with Bremer, so nobody vaults in.",
    body: `A perimeter made of waist-height blocks is a speed bump — infantry vault it. This
      run uses Hesco Wall (Quad) sections at full height with Bremer walls capped on top.<br><br>
      Bremer walls are the finishing layer specifically because <strong>nothing can be built
      on top of one</strong>. Put them down last, and put them on top of the Hesco rather
      than on the ground where they just become an expensive short wall.`,
    pieces: [
      ...run("hesco-wall", -6, 0, 10, 0),
      ...Array.from({ length: 20 }, (_, i) => P("bremer-wall", -7.5 + i, 0, 0, 1)),
    ],
  },
  {
    slug: "forward-operating-base",
    name: "Full Forward Base",
    tagline: "Walled compound with vehicle gate, mortar, AA, SAM and a repair station.",
    body: `What a fully developed position looks like: a closed perimeter, one vehicle gate,
      indirect fire, two layers of air defence and vehicle servicing inside the wire.<br><br>
      This is expensive. Check the supply figure against what your FOB actually holds before
      you commit — at 40 supplies to a pallet, a truck brings two pallets a trip. The usual
      failure is not the design, it is running dry halfway through and leaving a half-built
      wall as cover for the people attacking you.`,
    pieces: [
      P("__fob__", 0, 0),
      ...run("hesco-wall", -18, -12, 14, -12), ...run("hesco-wall", -18, 12, 14, 12),
      ...run("hesco-wall", -18, -9, -18, 9, 90), ...run("hesco-wall", 18, -9, 18, 9, 90),
      P("gate", -2, 12), P("door", -18, 0, 90),
      P("l81-mortar", -12, 6), P("vanguard-ciws", 12, 6),
      P("talon-9k-sam", -12, -6), P("stingray", 12, -6),
      P("repair-station", 6, 0), P("refuel-station", -7, 0),
      ...run("barbed-wire", -18, -16, 12, -16), ...run("hedgehog", -6, -14, 2, -14),
    ],
  },
];

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
      <strong>square build zone</strong> — shown blue on the minimap — that you must build
      inside. It also carries free Small and Medium hammers, wrenches and signal grenades at
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
        <li>Close the perimeter — walls first, with exactly one vehicle gate and one door.
        A half-finished wall is cover for the enemy.</li>
        <li>Only then add emplacements. Mortars, AA and drill rigs are expensive and they
        advertise the position.</li>
      </ol>
      <h2>Do not seal yourself in</h2>
      <p>Gates must be on the ground and swing through, so leave the inside clear. Leave room
      for a truck to get in and unload — a base a supply run cannot reach is a base that
      starves.</p>`,
  },
  {
    slug: "wardogs-build-costs",
    title: "WARDOGS Build Costs and Supply Runs",
    blurb: "What every buildable costs in Build Supplies, and how many pallets and vehicle trips that really means.",
    body: `<p>Every structure costs <strong>Build Supplies</strong>, drawn from the FOB — not
      from your pocket. Supplies cost <strong>$10 each</strong> individually at the vendor, and
      a <strong>Build Supply Pallet is $400</strong> and takes 4×2 inventory slots.</p>
      <h2>Think in trips, not supplies</h2>
      <p>The raw supply number is not the thing that costs you. Supplies move as pallets, and a
      vehicle carries a whole number of them: a <strong>truck takes two pallets a trip</strong>,
      a <strong>helicopter one</strong>. A wall that needs 12 pallets is six truck runs across
      contested ground, and that is the real price.</p>
      <h2>Four kinds of supply</h2>
      <ul>
        <li><strong>Build</strong> — everything you construct.</li>
        <li><strong>Ammo</strong> — reloads the L81 Mortar, Vanguard CIWS and Talon SAM.</li>
        <li><strong>Fuel</strong> — the Refuel Station, and activating the Drill Rig.</li>
        <li><strong>Mechanical</strong> — the Repair Station, and Stingray drones.</li>
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
      <p>Hesco Block (Small) and Sandbag Wall are one block tall — cover to shoot over, and a
      step to climb. Hesco Block (Tall) and Hesco Wall (Quad) are two, which is full-body
      cover. The Bremer Wall is three, and topped with barbed wire.</p>
      <h2>The rule that matters</h2>
      <p><strong>Nothing can be built on top of a Bremer Wall.</strong> That makes it the
      finishing layer, not a foundation. Run tall Hesco for the wall, then cap it with Bremer,
      and the result cannot be climbed without taking damage.</p>
      <h2>Sandbags are the exception worth knowing</h2>
      <p>Sandbags are designed to sit on top of Hesco. Low Hesco with sandbags stacked on it is
      the combination the community settled on for CIWS emplacements — high enough to protect
      the gunner, low enough not to block the gun.</p>
      <p>The planner counts how much of your cover is still waist height, under
      <strong>Anti-climb</strong>, so you can see the weakness before somebody finds it.</p>`,
  },
  {
    slug: "wardogs-hammers",
    title: "WARDOGS Hammers: What Each One Builds",
    blurb: "Small, Medium and Large — what unlocks at each tier and which one to actually carry.",
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
      towers, and it builds everything else faster — but it is 3.18 kg, and weight class
      decides whether you can sprint to the Hot Zone.</p>
      <p>Worth knowing: a placed FOB carries free Small and Medium hammers at its computer. If
      somebody else on your squad is running a Large Hammer, you may not need to carry one at
      all.</p>`,
  },
];

/* ---------- shared page shell ---------- */
const CSS = `
:root{--bg:#12140d;--panel:#1a1d13;--panel2:#232719;--border:#353c23;--soft:#2a3019;
--text:#dedbc6;--dim:#8d8d74;--accent:#dcaa26;--ink:#17180f;--good:#86ad55;--bad:#d4553a;
--ui:"Segoe UI Variable Text","Segoe UI",system-ui,-apple-system,sans-serif;
--num:"Cascadia Mono",Consolas,ui-monospace,monospace}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--text);font-family:var(--ui);line-height:1.65;
-webkit-font-smoothing:antialiased}
a{color:var(--accent);text-decoration:none}a:hover{text-decoration:underline}
.wrap{max-width:1060px;margin:0 auto;padding:0 22px}
header.site{border-bottom:1px solid var(--soft);background:var(--panel);position:sticky;top:0;z-index:10}
header.site .wrap{display:flex;align-items:center;gap:22px;height:60px;flex-wrap:wrap}
.brand{font-weight:700;letter-spacing:.16em;color:var(--accent);font-size:15px;white-space:nowrap}
.brand span{display:block;font-size:9px;letter-spacing:.18em;color:var(--dim);margin-top:-4px;text-transform:uppercase}
nav.site{display:flex;gap:18px;margin-left:auto;flex-wrap:wrap}
nav.site a{color:var(--text);font-size:13.5px}
nav.site a.cta{background:var(--accent);color:var(--ink);padding:7px 14px;border-radius:6px;font-weight:600}
nav.site a.cta:hover{text-decoration:none;filter:brightness(1.08)}
h1{font-size:34px;line-height:1.2;letter-spacing:-.01em;margin:0 0 10px;text-wrap:balance}
h2{font-size:21px;margin:32px 0 10px;color:var(--text);text-wrap:balance}
h3{font-size:15px;margin:22px 0 8px}
p,li{color:#cfcdb8}
.lede{font-size:17px;color:var(--dim);max-width:62ch}
section{padding:40px 0}
.hero{padding:66px 0 40px;border-bottom:1px solid var(--soft)}
.hero .lede{margin-bottom:24px}
.btn{display:inline-block;background:var(--accent);color:var(--ink);padding:11px 20px;
border-radius:7px;font-weight:600;font-size:15px}
.btn:hover{text-decoration:none;filter:brightness(1.08)}
.btn.ghost{background:transparent;color:var(--text);border:1px solid var(--border)}
.grid{display:grid;gap:14px;grid-template-columns:repeat(auto-fill,minmax(250px,1fr))}
.card{background:var(--panel);border:1px solid var(--soft);border-radius:9px;padding:16px;display:block}
.card:hover{border-color:var(--border);text-decoration:none}
.card h3{margin:0 0 5px;color:var(--text);font-size:16px}
.card p{font-size:13px;color:var(--dim);margin:0}
.card .stats{display:flex;gap:14px;margin-top:12px;font-family:var(--num);font-size:12px;
color:var(--accent);font-variant-numeric:tabular-nums;flex-wrap:wrap}
.card .stats span{color:var(--dim)}
table{width:100%;border-collapse:collapse;font-size:13.5px;margin:14px 0}
th{text-align:left;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--dim);
padding:8px 10px;border-bottom:1px solid var(--border);font-weight:600}
td{padding:8px 10px;border-bottom:1px solid var(--soft);color:#cfcdb8}
td.n{font-family:var(--num);font-variant-numeric:tabular-nums;text-align:right;white-space:nowrap}
tr:hover td{background:var(--panel)}
.tag{font-size:10px;padding:2px 6px;border-radius:4px;background:var(--panel2);color:var(--dim);
border:1px solid var(--soft)}
.est{color:var(--bad)}
.statbar{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));margin:22px 0}
.statbar div{background:var(--panel);border:1px solid var(--soft);border-radius:9px;padding:14px}
.statbar b{display:block;font-family:var(--num);font-size:22px;color:var(--accent);
font-variant-numeric:tabular-nums;line-height:1.15}
.statbar span{font-size:10px;letter-spacing:.13em;text-transform:uppercase;color:var(--dim)}
.note{background:var(--panel);border-left:3px solid var(--accent);padding:14px 16px;
border-radius:0 8px 8px 0;margin:20px 0;font-size:14px}
footer.site{border-top:1px solid var(--soft);margin-top:40px;padding:26px 0;color:var(--dim);font-size:13px}
footer.site .wrap{display:flex;gap:18px;flex-wrap:wrap;align-items:center}
footer.site a{color:var(--dim)}
ul,ol{padding-left:20px}li{margin:5px 0}
@media(max-width:640px){h1{font-size:26px}.hero{padding:40px 0 30px}header.site .wrap{height:auto;padding-top:12px;padding-bottom:12px}}
`;

function page({ title, desc, canonical, body, ogImage = "/preview.png" }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}${canonical}">
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
</head>
<body>
<header class="site"><div class="wrap">
  <a href="/" class="brand">WARDOGS<span>Base Builder</span></a>
  <nav class="site">
    <a href="/designs/">Designs</a>
    <a href="/buildables/">Buildables</a>
    <a href="/guides/">Guides</a>
    <a href="/planner/" class="cta">Open Planner</a>
  </nav>
</div></header>
${body}
<footer class="site"><div class="wrap">
  <span>Free fan-made planner for WARDOGS. Not affiliated with BULKHEAD or Team17.</span>
  <a href="/planner/">Planner</a><a href="/designs/">Designs</a>
  <a href="/buildables/">Buildables</a><a href="/guides/">Guides</a>
  <a href="https://github.com/Goldpip3/wardogs-base-builder">Source</a>
</div></footer>
</body>
</html>`;
}

const write = (rel, html) => {
  const full = path.join(DOCS, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, html);
};

/* ---------- pages ---------- */
const withStats = DESIGNS.map(d => ({ ...d, s: stats(d), code: encodeDesign(d) }));

function designCard(d) {
  return `<a class="card" href="/designs/${d.slug}/">
    <h3>${esc(d.name)}</h3>
    <p>${esc(d.tagline)}</p>
    <div class="stats">
      <span>supplies</span>${d.s.supplies.toLocaleString()}
      <span>pallets</span>${d.s.pallets}
      <span>pieces</span>${d.s.pieces}
    </div></a>`;
}

// Designs shared before the planner moved to /planner/ carry their code in the root
// URL's hash. Forward those rather than dropping somebody on a marketing page.
const FORWARD_SHARED = `<script>
(function(){var m=(location.hash||"").match(/[#&]d=([A-Za-z0-9\\-_]+)/);
if(m)location.replace("/planner/#d="+m[1]);})();
</script>`;

// --- home ---
write("index.html", page({
  title: "WARDOGS Base Builder — plan your FOB before the match",
  desc: "Free WARDOGS base planner and buildable cost database. Lay out walls, gates and gun pits, see the Build Supply cost and supply runs, and browse ready-made FOB designs.",
  canonical: "/",
  body: `${FORWARD_SHARED}
<section class="hero"><div class="wrap">
  <h1>Plan your WARDOGS FOB before you spend a single supply</h1>
  <p class="lede">A free browser planner for WARDOGS forward operating bases. Lay out walls,
  gates, gun pits and drill rigs on a grid, and see exactly what the whole thing costs in
  Build Supplies, pallets and vehicle trips — before you haul anything.</p>
  <p><a class="btn" href="/planner/">Open the planner</a>
     <a class="btn ghost" href="/designs/">Browse designs</a></p>
</div></section>

<section><div class="wrap">
  <h2>Ready-made designs</h2>
  <p class="lede">Open any of these in the planner and edit it into your own.</p>
  <div class="grid" style="margin-top:18px">${withStats.map(designCard).join("")}</div>
</div></section>

<section><div class="wrap">
  <h2>What the planner does</h2>
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
      Post it and it opens ready to inspect — no account, nothing to install.</p></div>
  </div>
</div></section>

<section><div class="wrap">
  <h2>Guides</h2>
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
write("buildables/index.html", page({
  title: `WARDOGS Buildables: All ${catalog.buildables.length} Structures and Build Supply Costs`,
  desc: `Every WARDOGS buildable with its Build Supply cost, size, height and hammer tier — Hesco, Bremer walls, gates, bunkers, mortars, AA and the Stingray.`,
  canonical: "/buildables/",
  body: `<section><div class="wrap">
  <h1>WARDOGS buildables and costs</h1>
  <p class="lede">Every structure you can build, what it costs in Build Supplies, and which
  hammer you need. Sizes are in Hesco blocks — one block is about 1.2 m.</p>
  <div class="statbar">
    <div><b>${catalog.buildables.length}</b><span>buildables</span></div>
    <div><b>$10</b><span>per supply</span></div>
    <div><b>$${catalog.logistics.palletCash}</b><span>per pallet</span></div>
    <div><b>$${catalog.fob.vendorPrice.toLocaleString()}</b><span>FOB item</span></div>
  </div>
  <table>
    <thead><tr><th>Buildable</th><th>Hammer</th><th class="n">Supplies</th>
      <th class="n">Cash</th><th class="n">W×D×H</th><th>Notes</th></tr></thead>
    <tbody>${rows.map(b => `<tr>
      <td><strong>${esc(b.name)}</strong></td>
      <td><span class="tag">${b.tier}</span></td>
      <td class="n">${b.cost}${b.costConfirmed === false ? '<span class="est">?</span>' : ""}</td>
      <td class="n">$${(b.cost * 10).toLocaleString()}</td>
      <td class="n">${b.footprint.w}×${b.footprint.d}×${b.height}${b.sizeConfirmed === false ? '<span class="est">?</span>' : ""}</td>
      <td>${b.requiresFob === false ? "No FOB needed. " : ""}${esc((b.desc || "").split(".")[0])}.</td>
    </tr>`).join("")}</tbody>
  </table>
  <div class="note"><strong>Values marked <span class="est">?</span> are not confirmed.</strong>
  WARDOGS is in closed beta and BULKHEAD has not published build costs or structure sizes.
  These were read frame by frame from the in-game radial menu and from play testing. You can
  correct any of them yourself inside the planner, and the change sticks for every piece of
  that type. If you know a real value, tell me and I will update it for everyone.</div>
  <h2>How supplies actually move</h2>
  <p>Structures draw <strong>Build Supplies</strong> from the FOB, not from your pocket.
  Supplies are $10 each, and a Build Supply Pallet is $${catalog.logistics.palletCash}. A truck
  carries ${catalog.logistics.vehicles[0].pallets} pallets a trip, a helicopter
  ${catalog.logistics.vehicles[1].pallets}. The planner turns any design into pallets and trips
  for you.</p>
  <p><a class="btn" href="/planner/">Open the planner</a></p>
</div></section>`,
}));

// --- designs index + detail pages ---
write("designs/index.html", page({
  title: "WARDOGS Base Designs — ready-made FOB layouts",
  desc: "Ready-made WARDOGS FOB designs with measured Build Supply costs, pallet counts and supply runs. Open any of them in the planner and edit.",
  canonical: "/designs/",
  body: `<section><div class="wrap">
  <h1>WARDOGS base designs</h1>
  <p class="lede">Each one opens straight in the planner, fully editable. Costs are measured
  from the real buildable data, not estimated.</p>
  <div class="grid" style="margin-top:20px">${withStats.map(designCard).join("")}</div>
  <div class="note">Built something good? Hit <strong>Share</strong> in the planner and send
  me the link — the whole design travels inside the URL, and good ones get added here with
  credit.</div>
</div></section>`,
}));

for (const d of withStats) {
  const s = d.s;
  write(`designs/${d.slug}/index.html`, page({
    title: `${d.name} — WARDOGS base design`,
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
const urls = ["/", "/planner/", "/designs/", "/buildables/", "/guides/"]
  .concat(withStats.map(d => `/designs/${d.slug}/`))
  .concat(GUIDES.map(g => `/guides/${g.slug}/`));
write("sitemap.xml",
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map(u => `  <url><loc>${SITE}${u}</loc></url>`).join("\n") + `\n</urlset>\n`);
write("robots.txt", `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);

console.log(`site: ${urls.length} pages`);
for (const d of withStats)
  console.log(`  ${d.slug.padEnd(24)} ${String(d.s.supplies).padStart(5)} supplies, ${String(d.s.pieces).padStart(3)} pieces, code ${d.code.length} chars`);
