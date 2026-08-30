/* The damage model, and the promise that nothing the vendor sells goes missing.
 *
 * tools/solve-ballistics.js already proves the *derivation*: that the damage figures are
 * the only ones the published shots-to-kill table could have come from. This suite proves
 * the layer above it, which is what the page actually does with those figures:
 *
 *   1. the pipeline reproduces a published hit-zone column it never saw
 *   2. armour applies where it covers and nowhere else
 *   3. the colours are the documented ones, not somebody's eye
 *   4. every load and every weapon in the armory is either on the chart or explicitly
 *      listed as a gap, so nothing can quietly vanish from the site
 *   5. the built page actually names them all
 *
 * Point 4 is the one worth having. The armory is regenerated from a transcription; the
 * ballistics data is not. Without this, adding a weapon to the vendor list leaves it
 * missing from the ranking, which reads to a player as "that gun does not exist".
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const M = require(path.join(ROOT, "tools/site/ballistics-model.js"));
const B = JSON.parse(fs.readFileSync(path.join(ROOT, "data/ballistics.json"), "utf8"));
const A = JSON.parse(fs.readFileSync(path.join(ROOT, "data/armory.json"), "utf8"));

let pass = 0, fail = 0;
const check = (ok, label, detail) => {
  console.log((ok ? "PASS  " : "FAIL  ") + label + (ok || !detail ? "" : "  (" + detail + ")"));
  ok ? pass++ : fail++;
};

const roundById = {}; B.rounds.forEach(r => { roundById[r.id] = r; });
const zoneById = {};  B.zones.forEach(z => { zoneById[z.id] = z; });
const calById = {};   B.calibres.forEach(c => { calById[c.id] = c; });
const weaponBy = {};  B.weapons.forEach(w => { weaponBy[w.name] = w; });

/* ---------- 1. the published hit-zone column ----------
   MetaForge publishes the M4's damage per zone against level 2 armour. Not one of those
   twelve numbers is stored anywhere in this repo: the page multiplies a solved torso
   figure by a zone multiplier and an armour retention and has to land on all of them. If
   the zone table, the retention table and the solved damage disagreed with each other,
   this is where it would show, because three independent things have to be right at once.

   Only the M4 column is checked, and deliberately. The same table's SVD column implies a
   different head-to-torso ratio, which is the unsolved thing documented on the page and in
   docs/ballistics-sources.md. Testing against it would be testing that a known unknown
   stays wrong. */
{
  const PUBLISHED = {
    head: 39, neck: 49, "upper-torso": 18, "middle-torso": 17, "lower-torso": 16,
    pelvis: 25, "upper-arm": 15, "lower-arm": 13, hand: 8,
    "upper-leg": 15, "lower-leg": 13, foot: 8,
  };
  const w = weaponBy["M4"], fmj = roundById.FMJ, tiers = { helmet: 2, vest: 2 };
  const off = [];
  Object.keys(PUBLISHED).forEach(id => {
    const got = M.shot(w, zoneById[id], fmj, tiers).damage;
    if (Math.round(got) !== PUBLISHED[id]) off.push(id + " " + got.toFixed(2) + " vs " + PUBLISHED[id]);
  });
  check(off.length === 0, "M4 reproduces all 12 published level 2 hit-zone figures", off.join(", "));

  /* The check above rounds, because the published figures are whole numbers, and rounding
     is slack: a head multiplier of 2.19 instead of 2.167 still lands on 39 and sails
     through. That was checked, and it did. So the multipliers are also pinned directly
     against the ratios the same published column implies, at full precision. Between the
     two, nothing in the pipeline can move by a percent without something going red. */
  const stray = [];
  Object.keys(PUBLISHED).forEach(id => {
    const z = zoneById[id];
    const keep = M.retention(fmj, z.armour ? 2 : 0);
    const implied = PUBLISHED[id] / keep / w.torso;
    if (Math.abs(implied - z.mult) > 0.001) {
      stray.push(id + " " + z.mult + " vs implied " + implied.toFixed(4));
    }
  });
  check(stray.length === 0,
    "and every zone multiplier equals the ratio that column implies, to three decimals",
    stray.join(", "));
}

/* ---------- 2. armour covers what it covers ----------
   The single most expensive misreading of this game is thinking a vest helps with a leg
   shot. The page is built to make that visible, so the model had better actually behave
   that way. */
{
  const w = weaponBy["M4"], fmj = roundById.FMJ;
  const bare = { helmet: 0, vest: 0 };
  const strays = [];
  B.zones.forEach(z => {
    const base = M.shot(w, z, fmj, bare).damage;
    const helmeted = M.shot(w, z, fmj, { helmet: 4, vest: 0 }).damage;
    const vested = M.shot(w, z, fmj, { helmet: 0, vest: 4 }).damage;
    const wantHelmet = z.armour === "helmet";
    const wantVest = z.armour === "vest";
    if ((helmeted < base) !== wantHelmet) strays.push("helmet on " + z.id);
    if ((vested < base) !== wantVest) strays.push("vest on " + z.id);
  });
  check(strays.length === 0, "a helmet touches only the head, a vest only the three torso zones",
    strays.join(", "));

  const covered = B.zones.filter(z => z.armour).map(z => z.id).sort().join(",");
  const declared = B.armour.reduce((a, s) => a.concat(s.covers), []).sort().join(",");
  check(covered === declared, "the armour block and the zone table agree on coverage",
    covered + " vs " + declared);
}

/* ---------- 2b. more armour is never worse, and the round decides how much ---------- */
{
  const w = weaponBy["M4"], bad = [];
  B.rounds.forEach(r => {
    let last = Infinity;
    for (let t = 0; t <= 4; t++) {
      const d = M.shot(w, zoneById["upper-torso"], r, { helmet: 0, vest: t }).damage;
      if (d > last + 1e-9) bad.push(r.id + " tier " + t);
      last = d;
    }
  });
  check(bad.length === 0, "damage never rises as the tier does", bad.join(", "));

  const ap = M.shot(w, zoneById["upper-torso"], roundById.AP, { helmet: 0, vest: 4 }).damage;
  const hp = M.shot(w, zoneById["upper-torso"], roundById.HP, { helmet: 0, vest: 4 }).damage;
  const fmj = M.shot(w, zoneById["upper-torso"], roundById.FMJ, { helmet: 0, vest: 4 }).damage;
  check(ap > fmj && fmj > hp,
    "through level 4, armour piercing beats standard beats flesh damage",
    [ap, fmj, hp].map(n => n.toFixed(1)).join(" > "));
}

/* ---------- 2c. buckshot is eight things ---------- */
{
  const w = weaponBy["M500"], buck = roundById.Buckshot, z = zoneById["upper-torso"];
  const all = M.shot(w, z, buck, { helmet: 0, vest: 0 }, { hit: 8, of: 8 }).damage;
  const half = M.shot(w, z, buck, { helmet: 0, vest: 0 }, { hit: 4, of: 8 }).damage;
  check(Math.abs(half * 2 - all) < 1e-9, "four of eight pellets do half the damage",
    half.toFixed(1) + " vs " + all.toFixed(1));
  check(M.toKill(all, w.rpm, B.health).stk === 1 && M.toKill(half, w.rpm, B.health).stk === 1,
    "an unarmoured torso is still one shell either way");
}

/* ---------- 2d. shots and time ---------- */
{
  const w = weaponBy["M4"];
  const k = M.toKill(M.shot(w, zoneById["upper-torso"], roundById.FMJ, { helmet: 0, vest: 0 }).damage,
    w.rpm, B.health);
  check(k.stk === 4, "the M4 needs four shots to an unarmoured upper torso", String(k.stk));
  check(Math.abs(k.ttk - 3 / (785 / 60)) < 1e-9,
    "and the time is the gap between first and last, not the whole burst", k.ttk.toFixed(3));
  check(M.toKill(500, 45, B.health).ttk === 0, "a one-shot kill takes no time at all");
}

/* ---------- 3. the colours are the documented ones ----------
   The palette was chosen by running the data-viz validator over every ordering of five
   slots and keeping one that clears each gate. Eyeballing a replacement later would
   silently undo that, so the hexes are pinned here. Changing one means re-running the
   validator, which is the point. */
{
  const SLOTS = ["#c98500", "#d55181", "#3987e5", "#199e70", "#9085e9"];
  const STATUS = ["#0ca30c", "#fab219", "#ec835a", "#d03b3b"];
  check(B.rounds.map(r => r.tint).join(",") === SLOTS.join(","),
    "the five round tints are the validated palette slots, in the validated order",
    B.rounds.map(r => r.tint).join(","));
  check(B.ttkBands.map(b => b.tint).join(",") === STATUS.join(","),
    "the time-to-kill bands wear the reserved status scale, not a sixth series colour");
  check(B.ttkBands.filter(b => SLOTS.indexOf(b.tint) >= 0).length === 0,
    "and no band colour impersonates a round");
  const thresholds = B.ttkBands.map(b => b.upTo);
  check(thresholds[thresholds.length - 1] === null &&
    thresholds.slice(0, -1).every((v, i) => i === 0 || v > thresholds[i - 1]),
    "the bands rise and the last one catches everything");
  check(M.bandFor(B.ttkBands, 1, 0).id === "fast" &&
    M.bandFor(B.ttkBands, 9, 4).id === "vslow" &&
    M.bandFor(B.ttkBands, 3, 0.4).id === "mid",
    "and a result lands in the band it should");
}

/* ---------- 4. nothing the vendor sells goes missing ----------
   Both directions. A load on the shelf has to be either priced against a calibre or
   named as a gap; a weapon on the shelf has to be either in the ranking or named as a
   gap. Anything else and the site quietly implies it does not exist. */
{
  const ammo = A.items.filter(i => i.cat === "ammunition");
  const byName = {}; ammo.forEach(i => { byName[i.name] = i; });

  const unresolved = [];
  B.calibres.forEach(c => {
    Object.keys(c.vendor || {}).forEach(rid => {
      if (!byName[c.vendor[rid]]) unresolved.push(c.id + "/" + rid + " -> " + c.vendor[rid]);
      if (c.rounds.indexOf(rid) < 0) unresolved.push(c.id + " prices a " + rid + " it cannot chamber");
    });
    if (!c.vendor) unresolved.push(c.id + " names no vendor loads at all");
  });
  check(unresolved.length === 0, "every calibre's vendor load resolves to a real armory item",
    unresolved.join(", "));

  /* Crew-served and artillery ammunition is measured in millimetres and is not fired at a
     hit zone, so it is out of scope for a page about shooting people. Supplies and
     batteries are not ammunition at all whatever shelf they sit on. */
  const notPersonal = n =>
    /^\d+(x\d+)?mm/.test(n) || /Shell|Rocket|Cannon|Supplies|Battery|\(SB\)/.test(n);
  const priced = new Set();
  B.calibres.forEach(c => Object.keys(c.vendor || {}).forEach(r => priced.add(c.vendor[r])));
  const excused = new Set(B.unfiguredLoads.map(l => l.name));
  const orphanLoads = ammo.map(i => i.name)
    .filter(n => !notPersonal(n) && !priced.has(n) && !excused.has(n));
  check(orphanLoads.length === 0,
    "every personal-weapon load is either on the chart or listed as a gap", orphanLoads.join(", "));

  const excusedWeapons = new Set(B.unfiguredWeapons.map(w => w.name));
  const orphanWeapons = A.items.filter(i => i.cat === "weapons").map(i => i.name)
    .filter(n => !weaponBy[n] && !excusedWeapons.has(n));
  check(orphanWeapons.length === 0,
    "every weapon in the armory is either ranked or listed as a gap", orphanWeapons.join(", "));

  const ghosts = B.unfiguredWeapons.map(w => w.name).filter(n => weaponBy[n]);
  check(ghosts.length === 0, "and nothing is claimed to be both", ghosts.join(", "));

  const noReason = B.unfiguredWeapons.concat(B.unfiguredLoads).filter(x => !x.why || x.why.length < 12);
  check(noReason.length === 0, "every gap says why it is a gap",
    noReason.map(x => x.name).join(", "));
}

/* ---------- 4b. the calibre a weapon claims exists ---------- */
{
  const bad = B.weapons.filter(w => !calById[w.calibre]).map(w => w.name);
  check(bad.length === 0, "every weapon chambers a calibre that exists", bad.join(", "));
  const orphanCal = B.calibres
    .filter(c => !B.weapons.some(w => w.calibre === c.id)).map(c => c.name);
  check(orphanCal.length === 0, "and every calibre is chambered by something", orphanCal.join(", "));
  const badRound = [];
  B.calibres.forEach(c => c.rounds.forEach(r => { if (!roundById[r]) badRound.push(c.id + "/" + r); }));
  check(badRound.length === 0, "every load a calibre takes is a real round type", badRound.join(", "));
}

/* ---------- 5. the built page names them all ----------
   Everything above tests the data. This tests that the page actually put it on screen,
   which is a separate failure: the ranking is drawn by script from a blob, so a mistake in
   the blob leaves a page that is structurally perfect and half empty. */
{
  const page = path.join(ROOT, "docs/ballistics/index.html");
  if (!fs.existsSync(page)) {
    check(false, "docs/ballistics/index.html exists (run tools/build-site.js first)");
  } else {
    const html = fs.readFileSync(page, "utf8");
    const missing = []
      .concat(B.weapons.map(w => w.name))
      .concat(B.calibres.map(c => c.name))
      .concat(B.unfiguredWeapons.map(w => w.name))
      .concat(B.unfiguredLoads.map(l => l.name))
      .filter(n => html.indexOf(n) < 0);
    check(missing.length === 0,
      "the built page names all " + (B.weapons.length + B.calibres.length +
        B.unfiguredWeapons.length + B.unfiguredLoads.length) + " weapons, calibres and gaps",
      missing.join(", "));

    check(B.rounds.every(r => html.indexOf(r.tint) >= 0),
      "and ships every round tint into the markup");
    check(html.indexOf("function shot(") >= 0 && html.indexOf("function toKill(") >= 0,
      "and carries the shared model rather than a second copy of the arithmetic");
    check(B.unsolved.every(u => html.indexOf(u.slice(0, 40)) >= 0),
      "and still says out loud what it does not know");
  }
}

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
