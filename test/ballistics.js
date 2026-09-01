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
const D = JSON.parse(fs.readFileSync(path.join(ROOT, "data/damage.json"), "utf8"));
const zoneById = {};  D.zones.forEach(z => { zoneById[z.id] = z; });
const calById = {};   B.calibres.forEach(c => { calById[c.id] = c; });
const weaponBy = {};  B.weapons.forEach(w => { weaponBy[w.name] = w; });

/* ---------- 1. the measured armoured column ----------
   The damage figures are measurements now, not a derivation, so the thing worth proving
   changed with them. data/damage.json stores the bare column and the scaling table and
   works the armoured figures out; the sheet those came from also *published* an armoured
   block, and that block is deliberately not imported. So the M4's level 2 row is written
   out here by hand, straight off the sheet, and the model has to land on all nine numbers
   without ever having seen them.

   The neck is the number that matters in this row. It is 49.36 armoured and 49.36 bare,
   because a level 2 helmet does not reach the neck. The old model asserted that no helmet
   ever does, and the page said so in words. A level 3 helmet does, which is checked below.

   Only this row is written out. The sheet disagrees with its own scaling table in 25 cells,
   listed in data/damage.json under sheetDisagrees, and pinning a row from inside that set
   would be pinning a known error in place. */
{
  const PUBLISHED = {
    head: 39.49, neck: 49.36, chest: 18.49, abdomen: 15.97, bicep: 15.14,
    forearm: 12.61, extremity: 7.58, groin: 25.22, legs: 15.13,
  };
  const load = D.classes["Assault Rifle"]["5.56 FMJ"];
  const tiers = { helmet: 2, vest: 2 };
  const off = [];
  Object.keys(PUBLISHED).forEach(id => {
    const got = M.shot(load, zoneById[id], tiers, D.scalings, null).damage;
    if (Math.abs(got - PUBLISHED[id]) > 0.005) {
      off.push(id + " " + got.toFixed(2) + " vs " + PUBLISHED[id]);
    }
  });
  check(off.length === 0, "the M4's level 2 row reproduces all nine measured figures",
    off.join(", "));

  /* And the same row at full precision through the scaling table rather than the shot, so
     a coverage bug and a scaling bug cannot cancel each other out above. */
  const stray = [];
  Object.keys(PUBLISHED).forEach(id => {
    const z = zoneById[id];
    const covered = z.slot && z.coveredFrom && tiers[z.slot] >= z.coveredFrom;
    const want = load.zones[id] * (covered ? D.scalings.FMJ[2] : 1);
    if (Math.abs(want - PUBLISHED[id]) > 0.005) {
      stray.push(id + " " + want.toFixed(4) + " vs " + PUBLISHED[id]);
    }
  });
  check(stray.length === 0,
    "and bare times the scaling reaches the same nine, so neither table is covering for the other",
    stray.join(", "));
}

/* ---------- 2. armour covers what it covers, when it covers it ----------
   The single most expensive misreading of this game is thinking a vest helps with a leg
   shot. The second is thinking a helmet is only ever the head. Coverage grows with tier,
   so this checks the tier each zone turns on at rather than a fixed list. */
{
  const load = D.classes["Assault Rifle"]["5.56 FMJ"];
  const bare = { helmet: 0, vest: 0 };
  const strays = [];
  D.zones.forEach(z => {
    const base = M.shot(load, z, bare, D.scalings, null).damage;
    for (let t = 1; t <= 4; t++) {
      const worn = { helmet: 0, vest: 0 };
      worn[z.slot || "helmet"] = t;
      const got = M.shot(load, z, worn, D.scalings, null).damage;
      const shouldDrop = !!z.slot && !!z.coveredFrom && t >= z.coveredFrom;
      if ((got < base - 1e-9) !== shouldDrop) {
        strays.push(z.id + " at tier " + t + (shouldDrop ? " did not drop" : " dropped"));
      }
    }
  });
  check(strays.length === 0,
    "every zone starts taking armour at the tier the measurements say and not before",
    strays.join(", "));

  /* The one the old model got backwards, called out on its own because the page used to
     state the opposite in prose. */
  const neck = zoneById.neck;
  const n2 = M.shot(load, neck, { helmet: 2, vest: 0 }, D.scalings, null).damage;
  const n3 = M.shot(load, neck, { helmet: 3, vest: 0 }, D.scalings, null).damage;
  check(Math.abs(n2 - load.zones.neck) < 1e-9 && n3 < n2,
    "a level 2 helmet is nothing to a neck shot and a level 3 helmet is not",
    n2.toFixed(2) + " then " + n3.toFixed(2));

  const noSlot = D.zones.filter(z => !z.slot).map(z => z.id).sort().join(",");
  check(noSlot === "extremity,forearm,legs",
    "hands, forearms and legs are covered by nothing at any tier", noSlot);
}

/* ---------- 2b. more armour is never worse, and the round decides how much ---------- */
{
  const cls = D.classes["Assault Rifle"], bad = [];
  Object.keys(cls).forEach(name => {
    let last = Infinity;
    for (let t = 0; t <= 4; t++) {
      const d = M.shot(cls[name], zoneById.chest, { helmet: 0, vest: t }, D.scalings, null).damage;
      if (d > last + 1e-9) bad.push(name + " tier " + t);
      last = d;
    }
  });
  check(bad.length === 0, "damage never rises as the tier does", bad.join(", "));

  const at = (n, t) => M.shot(cls[n], zoneById.chest, { helmet: 0, vest: t }, D.scalings, null).damage;
  check(at("5.56 AP", 4) > at("5.56 FMJ", 4) && at("5.56 FMJ", 4) > at("5.56 HP", 4),
    "through level 4, armour piercing beats standard beats flesh damage",
    [at("5.56 AP", 4), at("5.56 FMJ", 4), at("5.56 HP", 4)].map(n => n.toFixed(1)).join(" > "));

  /* Bare, the order reverses: hollow point is the one that hurts an unarmoured man most.
     A model that got this backwards would still pass the check above. */
  check(at("5.56 HP", 0) > at("5.56 FMJ", 0) && at("5.56 FMJ", 0) > at("5.56 AP", 0),
    "and with no armour on, flesh damage beats standard beats armour piercing",
    [at("5.56 HP", 0), at("5.56 FMJ", 0), at("5.56 AP", 0)].map(n => n.toFixed(1)).join(" > "));
}

/* ---------- 2c. buckshot is eight things ---------- */
{
  const buck = D.classes.Shotgun["Buckshot (8)"], z = zoneById.chest;
  const bare = { helmet: 0, vest: 0 };
  const all = M.shot(buck, z, bare, D.scalings, { hit: 8 }).damage;
  const half = M.shot(buck, z, bare, D.scalings, { hit: 4 }).damage;
  check(Math.abs(half * 2 - all) < 1e-9, "four of eight pellets do half the damage",
    half.toFixed(1) + " vs " + all.toFixed(1));
  check(buck.pellets === 8 && Math.abs(all - buck.zones.chest * 8) < 1e-9,
    "and the stored figure is one pellet, not the shell",
    buck.zones.chest + " x 8 = " + all.toFixed(2));
}

/* ---------- 2d. shots and time ---------- */
{
  const w = weaponBy["M4"];
  const d = M.shot(D.classes["Assault Rifle"]["5.56 FMJ"], zoneById.chest,
    { helmet: 0, vest: 0 }, D.scalings, null).damage;
  const k = M.toKill(d, w.rpm, B.health);
  check(k.stk === 4, "the M4 needs four shots to an unarmoured chest", String(k.stk));
  check(Math.abs(k.ttk - 3 / (w.rpm / 60)) < 1e-9,
    "and the time is the gap between first and last, not the whole burst", k.ttk.toFixed(3));
  check(M.toKill(500, 45, B.health).ttk === 0, "a one-shot kill takes no time at all");
}

/* ---------- 2e. the sheet's own disagreements are carried, not swallowed ----------
   25 cells in the source disagree with the source's own scaling table. They are recorded
   rather than imported, and this fails if somebody quietly drops the record: a file that
   claims a clean import when the import was not clean is worse than one that admits it. */
{
  check(Array.isArray(D.sheetDisagrees),
    "data/damage.json carries the list of cells the sheet contradicts itself on");
  const shaped = (D.sheetDisagrees || []).every(d =>
    d.class && d.load && d.tier && d.zone && typeof d.sheet === "number" &&
    typeof d.expected === "number");
  check(shaped, "and every one of them says which cell, and both numbers");
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
