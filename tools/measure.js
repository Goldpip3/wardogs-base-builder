/* Writes one measured figure into data/measured.json.
 *
 *   node tools/measure.js "<item name>" storage <W>x<H>
 *   node tools/measure.js "<item name>" rpm <rounds per minute> --note "how you counted"
 *   node tools/measure.js --list storage        # what is measured so far, and what is not
 *
 * The examples carry no numbers on purpose. A line here that reads like a real measurement
 * gets run, and what it writes outranks every other source on the site: an invented 4x5 in
 * this file is worse than the pulled figure it replaces, because the pulled one is at least
 * marked as pulled. Two of them landed that way once, from a usage example.
 *
 * Why a tool rather than editing the JSON. The file is the one source on the site that
 * outranks every other, so the way into it should refuse the two mistakes that would make
 * it useless: a name that is not in the catalogue, which would sit there overriding
 * nothing, and a value in a shape nothing reads, which would look measured and do nothing.
 * Both are refused here rather than caught later.
 *
 * Nothing here fetches. A figure in this file exists because a person looked at the game.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const FILE = path.join(ROOT, "data", "measured.json");
const ARMORY = path.join(ROOT, "data", "armory.json");

/* Every field this file can carry, what shape it takes, and what reads it. Adding one here
   is not enough on its own: the page that should read it has to be taught as well, which is
   why each says who its reader is. */
const FIELDS = {
  storage: {
    what: "what a bag holds, as WxH",
    parse: v => grid(v),
    read: "the loadout page draws the bag on it and counts slots against it",
  },
  pockets: {
    what: "side pockets beside a bag's main grid, as WxH+WxH, for a pack that is not one rectangle",
    parse: v => String(v).split("+").map(grid),
    read: "the loadout page adds their cells to the pack's room and the card counts them",
  },
  slings: {
    what: "weapon sling slots on a pack, a count; the game adds each to CAP. but they hold a weapon, not items",
    parse: v => whole(v),
    read: "the bag card names them beside the grid; they do not count as item cells",
  },
  quick: {
    what: "extra quick slots a rig unlocks, a count; a rig gives no item storage",
    parse: v => whole(v),
    read: "the rig card says how many quick slots it adds",
  },
  grid: {
    what: "the room an item takes in a bag, as WxH",
    parse: v => grid(v),
    read: "the loadout page draws the tile at that size and counts it",
  },
  kg: {
    what: "weight in kilograms",
    parse: v => positive(v),
    read: "the loadout page adds it into the kit weight",
  },
  stack: {
    what: "how many go in one slot",
    parse: v => whole(v),
    read: "the loadout page fills a slot that many deep before taking another",
  },
  rounds: {
    what: "how many rounds a magazine holds",
    parse: v => whole(v),
    read: "the loadout page counts rounds loaded and what they cost",
  },
  rpm: {
    what: "rounds per minute",
    parse: v => whole(v),
    read: "the damage page turns shots to kill into time to kill, and can bring an unfigured weapon in",
  },
  class: {
    what: "what the vendor files it under: a weapon's damage class from data/damage.json, or the Specialist tab for a specialist item (Launcher, Medical, Building, Recon, Vehicle, Tactical)",
    parse: v => String(v).trim(),
    read: "the damage page joins the measured damage table on it",
  },
  unlock: {
    what: "what opens it: Ladder, Ladder/level or Ladder/level/cash, such as Recon/12/50000, giving only what the screen showed. Cash 0 if it is free once the level is reached; the word starter if it is there from the first match",
    parse: v => unlock(v),
    read: "the armory panel says which ladder, which level and what it costs to unlock, and /todo/ counts what is still unconfirmed",
  },
};

/* The ladder is whatever word the buy screen uses, kept as typed, because which word the
   game uses for the first ladder is itself one of the things being read. Level and cash
   are whole numbers; cash may be 0, since some things open free at their level. */
function unlock(v) {
  if (/^starter$/i.test(String(v).trim())) return { starter: true };
  const m = String(v).trim().match(/^([A-Za-z][A-Za-z ]*?)(?:\s*\/\s*(\d+)(?:\s*\/\s*\$?(\d[\d,]*))?)?$/);
  if (!m) throw new Error("an unlock is Ladder, Ladder/level or Ladder/level/cash, such as Recon/12/50000");
  const out = { role: m[1].trim() };
  if (m[2] !== undefined) {
    out.level = Number(m[2]);
    if (!(out.level > 0)) throw new Error("the level has to be 1 or more");
  }
  if (m[3] !== undefined) out.cash = Number(m[3].replace(/,/g, ""));
  return out;
}

function grid(v) {
  const m = String(v).toLowerCase().match(/^(\d+)\s*[x*]\s*(\d+)$/);
  if (!m) throw new Error("a grid is WxH, such as 4x3");
  const w = Number(m[1]), h = Number(m[2]);
  if (!(w > 0 && h > 0)) throw new Error("a grid has to be at least 1x1");
  if (w > 20 || h > 20) throw new Error("that is bigger than any bag in the game, check it");
  return [w, h];
}
function positive(v) {
  const n = Number(v);
  if (!(n > 0)) throw new Error("that has to be a number above zero");
  return n;
}
function whole(v) {
  const n = Number(v);
  if (!(n > 0) || n !== Math.round(n)) throw new Error("that has to be a whole number above zero");
  return n;
}

const today = () => new Date().toISOString().slice(0, 10);

function load() {
  return JSON.parse(fs.readFileSync(FILE, "utf8"));
}
function save(doc) {
  const sorted = {};
  Object.keys(doc.items).sort().forEach(k => { sorted[k] = doc.items[k]; });
  doc.items = sorted;
  fs.writeFileSync(FILE, JSON.stringify(doc, null, 2) + "\n");
}

const args = process.argv.slice(2);
const flags = {};
const rest = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--force") flags.force = true;
  else if (args[i] === "--on" || args[i] === "--note") flags[args[i].slice(2)] = args[++i];
  else if (args[i] === "--list") flags.list = args[i + 1] && !args[i + 1].startsWith("--")
    ? args[++i] : "all";
  else rest.push(args[i]);
}

const catalogue = JSON.parse(fs.readFileSync(ARMORY, "utf8"));
const names = new Set(catalogue.items.map(i => i.name));
const doc = load();

/* ---- what is measured and what is still guessed ---- */
if (flags.list) {
  const field = flags.list;
  const have = Object.entries(doc.items)
    .filter(([, v]) => field === "all" || field in v);
  console.log(have.length + " measured" + (field === "all" ? "" : " " + field) + ":");
  have.forEach(([n, v]) => {
    const shown = Object.keys(v).filter(k => k !== "on" && k !== "note")
      .map(k => k + " " + (Array.isArray(v[k]) ? v[k].join("x")
        : v[k] && v[k].starter ? "starter"
        : v[k] && typeof v[k] === "object" ? Object.values(v[k]).join("/") : v[k])).join(", ");
    console.log("  " + n + ": " + shown + "  (" + v.on + ")");
  });
  if (field === "storage" || field === "all") {
    const bags = catalogue.items.filter(i =>
      i.cat === "storage" && /backpack|pouch|tac vest/i.test(i.name));
    const missing = bags.filter(b => !(doc.items[b.name] || {}).storage);
    console.log("\n" + missing.length + " bags and rigs with no measured size:");
    missing.forEach(b => console.log("  " + b.name));
  }
  process.exit(0);
}

if (rest.length !== 3) {
  console.log("usage: node tools/measure.js \"<item name>\" <field> <value> [--on YYYY-MM-DD] [--note \"...\"]");
  console.log("       the value is what you read in game. Nothing here has a default.");
  console.log("\nfields:");
  Object.entries(FIELDS).forEach(([k, f]) => console.log("  " + k.padEnd(8) + f.what));
  console.log("\n  node tools/measure.js --list storage   shows what is still unmeasured");
  process.exit(rest.length ? 1 : 0);
}

const [name, field, raw] = rest;

if (!names.has(name)) {
  /* Match on any word of what was typed rather than on its first six letters, because the
     way a name gets typed wrong is a misspelling in it, and "Feild Backpack" shares no
     opening with "Field Backpack" but shares the word that matters. */
  const words = name.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const near = [...names].filter(n => words.some(w => n.toLowerCase().includes(w)));
  console.error("\"" + name + "\" is not an item in data/armory.json.");
  if (near.length) console.error("did you mean: " + near.slice(0, 5).join(", "));
  process.exit(1);
}
if (!FIELDS[field]) {
  console.error("\"" + field + "\" is not a field this file carries. Known: " +
    Object.keys(FIELDS).join(", "));
  process.exit(1);
}

/* The figures from the old usage examples, refused by name. They were written into this
   file once by somebody running the example line, and an invented measurement is the one
   thing this file must not hold. Anybody who really measures one of these can pass --force. */
const FROM_THE_EXAMPLES = [
  { name: "Assault Backpack", field: "storage", raw: "4x5" },
  { name: "PKM", field: "rpm", raw: "650" },
  { name: "Field Backpack", field: "storage", raw: "4x3" },
];
if (!flags.force && FROM_THE_EXAMPLES.some(e =>
  e.name === name && e.field === field && e.raw === String(raw))) {
  console.error("that is the number from a usage example, not a measurement.");
  console.error("if you really counted " + raw + ", run it again with --force.");
  process.exit(1);
}

let value;
try { value = FIELDS[field].parse(raw); }
catch (e) { console.error(field + ": " + e.message); process.exit(1); }

const entry = doc.items[name] || {};
const had = entry[field];
entry[field] = value;
entry.on = flags.on || today();
if (flags.note) entry.note = flags.note;
doc.items[name] = entry;
save(doc);

const show = v => Array.isArray(v) ? v.join("x")
  : v && v.starter ? "starter"
  : v && typeof v === "object" ? Object.values(v).join("/") : String(v);
console.log(name + ": " + field + " " + show(value) +
  (had !== undefined ? " (was " + show(had) + ")" : "") + ", measured " + entry.on);
console.log("  " + FIELDS[field].read);
console.log("\nrun the build to see it: powershell -File build.ps1");
