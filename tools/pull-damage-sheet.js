/* Pulls the measured damage tables out of the owner's "ammo testing" sheet into
 * data/damage.json.
 *
 *   node tools/pull-damage-sheet.js
 *
 * Why this exists, and why it replaces a solver. data/ballistics.json carries damage that
 * tools/solve-ballistics.js *derives*, by intersecting the bounds a published shots-to-kill
 * table implies. That was the honest thing to do while nobody had measured the game. This
 * sheet is somebody measuring the game, so the derivation stops being the best available
 * answer and becomes a worse one.
 *
 * Two things the sheet says that the derived model got wrong, both load-bearing:
 *
 *   Armour coverage grows with tier. Up to tier 2 only the head, chest and abdomen are
 *   reduced. Tier 3 starts reducing the neck. Tier 4 also reduces the bicep and the groin.
 *   The old model had one fixed coverage list per armour slot, and the page said in so many
 *   words that a helmet is worth nothing to a man shot in the neck. Against a tier 3 helmet
 *   that is false.
 *
 *   The same round does different damage from different weapon classes. 9mm from an SMG and
 *   9mm from a pistol are not the same figure. The old model had one damage number per
 *   calibre, so it could not express this at all.
 *
 * What is transcribed and what is worked out. The bare column is the measurement and is
 * transcribed. The scaling table is the model and is transcribed. Armoured damage is NOT
 * transcribed: it is bare x scaling, computed here, because the sheet's own armoured block
 * disagrees with its own scaling table in 25 cells and importing both would ship the
 * contradiction. Those 25 are listed in the report and in data/damage.json under
 * `sheetDisagrees` rather than being quietly corrected or quietly copied.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const FILE = path.join(ROOT, "data/damage.json");
const DOC = "1Fzr0If8dsH6AcXvGy57qAC8h9fOIhlEzxVfsL_m_Hd4";
const UA = "wardogsbuilder.com damage sync";

/* Tab per weapon class, because that is the axis the sheet is cut along. The keys are the
   class names data/ballistics.json already uses, so the two files join without a lookup. */
const TABS = {
  "Assault Rifle": "0",
  "SMG": "1783140232",
  "Shotgun": "350547478",
  "LMG": "1029942058",
  "Marksman": "632583891",
  "Sniper": "1967245876",
  "Bow": "484784312",
  "Pistol": "1792932541",
};
const SCALINGS_GID = "1542536993";

/* The sheet's own column order. Nine zones, which is the taxonomy the game actually uses;
   the site had twelve, splitting the torso three ways and each limb two ways.
 *
 * `slot` is the one thing here the sheet does not say. It has a single "Armour tier"
 * column, and the game sells helmets and vests separately, so somebody has to say which
 * piece is doing the work on each zone. Owner's call, 2026-08-31: the helmet covers the
 * head and, from tier 3, the neck; the vest covers the chest and abdomen and, from tier 4,
 * the bicep and the groin. That is not a guess dressed as a reading. It is what the
 * coverage growth in the sheet already looks like, two pieces each getting bigger with
 * tier, and it keeps the page able to answer "tier 4 helmet, no vest", which is a kit
 * people actually run. The tier each zone starts at is read out of the sheet below rather
 * than typed here, so if a future test changes it the file changes with it. */
const ZONES = [
  { id: "head",      name: "Head",           slot: "helmet" },
  { id: "neck",      name: "Neck",           slot: "helmet" },
  { id: "chest",     name: "Chest",          slot: "vest" },
  { id: "abdomen",   name: "Abdomen",        slot: "vest" },
  { id: "bicep",     name: "Bicep/Shoulder", slot: "vest" },
  { id: "forearm",   name: "Forearm",        slot: "" },
  { id: "extremity", name: "Hands/Feet",     slot: "" },
  { id: "groin",     name: "Groin",          slot: "vest" },
  { id: "legs",      name: "Legs",           slot: "" },
];

const csvUrl = gid => "https://docs.google.com/spreadsheets/d/" + DOC + "/export?format=csv&gid=" + gid;

async function grab(gid) {
  const r = await fetch(csvUrl(gid), { headers: { "user-agent": UA } });
  if (!r.ok) throw new Error("HTTP " + r.status + " on gid " + gid);
  const text = await r.text();
  if (/<html/i.test(text)) throw new Error("gid " + gid + " came back as HTML, so the sheet is not readable without a login");
  return text.split("\n").map(l => l.replace(/\r$/, "").split(","));
}

const num = v => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
};
/* A row label carries its load in its own name. Buckshot and Slugs are their own types
   rather than variants of one shotgun round, and the bow's arrow is its own type too. */
const typeOf = name =>
  /\bHP\b/.test(name) ? "HP" :
  /\bAP\b/.test(name) ? "AP" :
  /Arrow/i.test(name) ? "Arrow" :
  /Buckshot/i.test(name) ? "Buckshot" :
  /Slug/i.test(name) ? "Slug" : "FMJ";

(async () => {
  const scRows = await grab(SCALINGS_GID);
  const scalings = {};
  scRows.slice(1).forEach(r => {
    const type = (r[0] || "").trim(), tier = num(r[1]), pct = parseFloat(r[2]);
    if (!type || !tier || !Number.isFinite(pct)) return;
    (scalings[type] || (scalings[type] = {}))[tier] = +(pct / 100).toFixed(6);
  });
  if (!Object.keys(scalings).length) throw new Error("the scalings tab parsed to nothing");

  const classes = {};
  const disagrees = [];
  const coverage = {};                       // tier -> Set of zone ids armour actually reduces
  let cells = 0;

  for (const [cls, gid] of Object.entries(TABS)) {
    const rows = await grab(gid);
    const bare = {};
    rows.slice(2).forEach(r => {
      const name = (r[0] || "").trim();
      if (!name || num(r[1]) === null) return;   // notes rows carry text in column A
      bare[name] = ZONES.map((_, i) => num(r[i + 1]));
    });
    if (!Object.keys(bare).length) throw new Error(cls + " parsed to no rows");

    /* The armoured block is read only to check it and to learn the coverage, never to be
       written out. Where it agrees it teaches which zones a tier reduces; where it does
       not, it is recorded as a disagreement for somebody to settle in the sheet. */
    rows.slice(2).forEach(r => {
      const name = (r[11] || "").trim(), tier = num(r[12]);
      if (!name || !tier || !bare[name]) return;
      const s = (scalings[typeOf(name)] || {})[tier];
      if (s === undefined) return;
      ZONES.forEach((z, i) => {
        const got = num(r[13 + i]), base = bare[name][i];
        if (got === null || base === null) return;
        cells++;
        const scaled = +(base * s).toFixed(2);
        if (Math.abs(got - base) < 0.02) return;                   // uncovered, unchanged
        if (Math.abs(got - scaled) < 0.02) {                       // covered, scales
          (coverage[tier] || (coverage[tier] = new Set())).add(z.id);
          return;
        }
        disagrees.push({
          class: cls, load: name, tier, zone: z.id,
          sheet: got, expected: scaled, bare: base,
          ratio: +(got / base).toFixed(4), scaling: s,
        });
      });
    });

    classes[cls] = Object.keys(bare).sort().reduce((m, name) => {
      const z = {};
      ZONES.forEach((zz, i) => { if (bare[name][i] !== null) z[zz.id] = bare[name][i]; });
      /* The shotgun tab says it in two note rows: buckshot is eight pellets and every
         figure on that line is one pellet. A load that carries a pellet count is therefore
         a per-pellet figure, and the count travels with it so nothing downstream has to
         know that buckshot in particular is special. */
      const pellets = (name.match(/\((\d+)\)/) || [])[1];
      m[name] = { type: typeOf(name), zones: z };
      if (pellets) m[name].pellets = Number(pellets);
      return m;
    }, {});
  }

  const covers = {};
  Object.keys(coverage).sort().forEach(t => { covers[t] = [...coverage[t]].sort(); });

  /* The tier at which each zone starts being reduced, read out of the sheet. A zone no tier
     reduces gets no slot, whatever the table above says, so a slot cannot be claimed for a
     zone the measurements do not back. */
  const zones = ZONES.map(z => {
    const tiers = Object.keys(covers).map(Number).filter(t => covers[t].indexOf(z.id) >= 0);
    const from = tiers.length ? Math.min.apply(null, tiers) : 0;
    return { id: z.id, name: z.name, slot: from ? z.slot : "", coveredFrom: from };
  });
  const claimed = ZONES.filter(z => z.slot).map(z => z.id);
  const backed = zones.filter(z => z.slot).map(z => z.id);
  const unbacked = claimed.filter(id => backed.indexOf(id) < 0);
  if (unbacked.length) {
    console.log("note: no tier reduces " + unbacked.join(", ") +
      ", so the slot claimed for them in this tool was dropped.");
  }

  const out = {
    _note: "Damage measured in game and recorded in the owner's 'ammo testing' sheet. The " +
      "bare figures and the scaling table are transcribed. Armoured damage is not stored: it " +
      "is bare x scaling on the zones that tier covers, because the sheet's own armoured " +
      "block contradicts its own scaling table in the cells listed under sheetDisagrees. " +
      "Refresh with tools/pull-damage-sheet.js.",
    source: "https://docs.google.com/spreadsheets/d/" + DOC,
    fetchedOn: new Date().toISOString().slice(0, 10),
    zones,
    scalings,
    covers,
    classes,
    sheetDisagrees: disagrees,
  };
  fs.writeFileSync(FILE, JSON.stringify(out, null, 1) + "\n");

  const loads = Object.values(classes).reduce((n, c) => n + Object.keys(c).length, 0);
  console.log(Object.keys(classes).length + " weapon classes, " + loads + " loads, " +
    ZONES.length + " zones. " + cells + " armoured cells checked against the scaling table.");
  Object.keys(covers).forEach(t => console.log("  tier " + t + " reduces: " + covers[t].join(", ")));
  if (disagrees.length) {
    console.log("");
    console.log(disagrees.length + " cell(s) in the sheet disagree with the sheet's own scalings.");
    console.log("These are recorded, not imported. Fix them in the sheet and re-run:");
    const byLoad = {};
    disagrees.forEach(d => {
      const k = d.class + " / " + d.load + " tier " + d.tier;
      (byLoad[k] || (byLoad[k] = [])).push(d.zone);
    });
    Object.keys(byLoad).forEach(k => console.log("  " + k + ": " + byLoad[k].join(", ")));
  }
  console.log("");
  console.log("Written to data/damage.json. Run build.ps1.");
})();
