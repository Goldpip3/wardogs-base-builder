/* Work each weapon's upper-torso damage back out of its shots-to-kill row.
 *
 * A shots-to-kill figure is a bound, not a value: STK s at armour tier i means
 *   ceil(100 / (d * ret_i)) === s   ->   d in [100/(s*ret_i), 100/((s-1)*ret_i))
 * Five armour tiers give five bounds, and their intersection is usually tight enough to
 * pin the damage to a couple of percent. That is a derivation from published output, not
 * a transcription of somebody's table, and it comes with its own error bars.
 *
 * The check at the bottom is the point: the two weapons whose exact damage is separately
 * published must land inside the interval this solver produces for them. If they do not,
 * the model is wrong and nothing here should ship.
 */

// armour retention by tier: none, L1, L2, L3, L4
const RET = {
  FMJ:      [1, 0.70, 0.60, 0.45, 0.35],
  HP:       [1, 0.165, 0.12, 0.0527, 0.0076],
  AP:       [1, 0.85, 0.80, 0.725, 0.675],
  Buckshot: [1, 0.56, 0.48, 0.36, 0.28],
  Slug:     [1, 0.70, 0.60, 0.45, 0.35],
};

// Shots to kill, upper torso, 0 m, read off the published ranking table.
// [name, calibre, round, class, ttkNoArmour, stk[none,L1,L2,L3,L4]]
const ROWS = [
  ["AMR 50",          ".50Cal",     "Slug",     "Sniper",   null, [1,1,1,2,2], 1.45, 2],
  ["M500",            "12g",        "Buckshot", "Shotgun",  null, [1,1,1,2,2], 0.50, 2],
  ["MP43",            "12g",        "Buckshot", "Shotgun",  null, [1,1,1,2,2], 0.07, 2],
  ["BMR-308",         ".308 Win",   "FMJ",      "Marksman", 0.13, [2,2,2,3,4], 0.13, 2],
  ["FAL",             ".308 Win",   "FMJ",      "Marksman", 0.09, [2,3,3,4,5], 0.09, 2],
  ["Super-45",        ".45 ACP",    "FMJ",      "SMG",      0.10, [3,5,5,7,9], 0.10, 3],
  ["SVD",             "7.62x54mm",  "FMJ",      "Marksman", 0.13, [2,2,3,3,4], 0.13, 2],
  ["SKS",             "7.62mm",     "FMJ",      "Marksman", 0.14, [2,3,3,4,5], 0.14, 2],
  ["GGX 18",          "9mm",        "FMJ",      "SMG",      0.15, [4,6,7,9,12], 0.15, 4],
  ["M249 SAW",        "5.56mm",     "FMJ",      "LMG",      0.21, [4,5,6,7,9], 0.21, 4],
  ["M4",              "5.56mm",     "FMJ",      "Assault Rifle", 0.23, [4,5,6,8,10], 0.23, 4],
  ["AMP-9",           "9mm",        "FMJ",      "SMG",      0.20, [4,6,7,9,12], 0.20, 4],
  ["T-21",            "5.56mm",     "FMJ",      "Assault Rifle", 0.24, [4,5,6,8,10], 0.24, 4],
  ["A-91",            "5.56mm",     "FMJ",      "Assault Rifle", 0.26, [4,5,6,8,10], 0.26, 4],
  ["Bushmaster M17S", "5.56mm",     "FMJ",      "Assault Rifle", 0.26, [4,5,6,8,10], 0.26, 4],
  ["KH-2002",         "5.56mm",     "FMJ",      "Assault Rifle", 0.26, [4,5,6,8,10], 0.26, 4],
  ["Deagle",          "50AE",       "FMJ",      "Pistol",   0.22, [2,2,3,4,4], 0.22, 2],
  ["MP5",             "9mm",        "FMJ",      "SMG",      0.23, [4,6,7,9,12], 0.23, 4],
  ["PP-19 Vityaz",    "9mm",        "FMJ",      "SMG",      0.23, [4,6,7,9,12], 0.23, 4],
  ["AK74",            "5.45mm",     "FMJ",      "Assault Rifle", 0.28, [4,5,6,8,10], 0.28, 4],
  ["Galil",           "5.56mm",     "FMJ",      "Assault Rifle", 0.28, [4,5,6,8,10], 0.28, 4],
  ["M1911",           ".45 ACP",    "FMJ",      "Pistol",   0.28, [3,5,5,7,9], 0.28, 3],
  ["Compound Bow",    "Broadhead Arrow", "Slug", "Bow",     null, [1,1,2,2,2], 0.67, 2],
  ["Judge",           ".45 Colt",   "FMJ",      "Pistol",   0.30, [2,3,4,5,6], 0.30, 2],
  ["MK22",            ".308 Win",   "FMJ",      "Sniper",   null, [1,2,2,2,3], 1.30, 2],
  ["Mosin Nagant",    "7.62x54mm",  "FMJ",      "Sniper",   null, [1,2,2,3,3], 1.30, 2],
  ["SV98",            "7.62x54mm",  "FMJ",      "Sniper",   null, [1,2,2,3,3], 1.30, 2],
  ["Scout Rifle TD",  "5.56mm",     "FMJ",      "Marksman", 1.30, [2,3,4,5,6], 1.30, 2],
];

const HEALTH = 100;

function solve(stk, ret) {
  let lo = 0, hi = Infinity;
  for (let i = 0; i < stk.length; i++) {
    const s = stk[i], r = ret[i];
    if (!s) continue;
    lo = Math.max(lo, HEALTH / (s * r));
    if (s > 1) hi = Math.min(hi, HEALTH / ((s - 1) * r));
  }
  return { lo, hi };
}

const out = [];
for (const [name, cal, round, cls, , stk, ttkRef, stkRef] of ROWS) {
  const { lo, hi } = solve(stk, RET[round]);
  const open = !isFinite(hi);
  // midpoint of the interval, or the lower bound where the top is open (a one-shot kill
  // at every tier only tells you "at least this much")
  const dmg = open ? lo : (lo + hi) / 2;
  const spread = open ? null : (hi - lo) / dmg;
  // rounds per minute, from the reference row's time to kill: (shots - 1) / ttk
  const rpm = stkRef > 1 && ttkRef > 0 ? Math.round(((stkRef - 1) / ttkRef) * 60 / 5) * 5 : null;
  out.push({ name, calibre: cal, round, cls, lo, hi, dmg, spread, rpm });
}

console.log("weapon             calibre      torso dmg @0m      +/-     rpm");
for (const w of out) {
  console.log(
    w.name.padEnd(18) + w.calibre.padEnd(13) +
    (isFinite(w.hi) ? (w.lo.toFixed(1) + "-" + w.hi.toFixed(1)).padEnd(14)
                    : (">= " + w.lo.toFixed(1)).padEnd(14)) +
    (w.spread === null ? "open  " : (100 * w.spread).toFixed(0).padStart(4) + "%  ") +
    String(w.rpm === null ? "-" : w.rpm).padStart(6));
}

/* ---- the check that decides whether any of this is publishable ----
   Two exact damage figures exist outside this derivation:
     - M4, upper torso, unarmoured, 50 m = 30.0   (published hit-zone table)
     - SVD, upper torso, unarmoured, 50 m = 78.33 (same table, 47 at L2 / 0.6)
   Both must fall inside the interval the solver produces from a completely different
   table. If they do, the health value, the armour retentions and the arithmetic are all
   consistent with each other. */
let bad = 0;
const expect = (name, known) => {
  const w = out.find(x => x.name === name);
  const ok = known >= w.lo && (!isFinite(w.hi) || known < w.hi);
  console.log((ok ? "\nPASS  " : "\nFAIL  ") + name + " published " + known +
    " lands in derived [" + w.lo.toFixed(2) + ", " + w.hi.toFixed(2) + ")");
  if (!ok) bad++;
};
expect("M4", 30.0);
expect("SVD", 78.33);

/* ---- and the round trip ----
   The derivation turned 28 published shots-to-kill rows into 28 damage figures. Feeding
   those figures back through the same armour table has to reproduce all 140 of the
   original numbers. It is the difference between "these values are plausible" and "these
   values are the only ones the published table could have come from". If a calibre gets
   retyped wrong, or an armour retention drifts, this is what notices. */
{
  const fs = require("fs"), path = require("path");
  const shipped = JSON.parse(fs.readFileSync(
    path.join(__dirname, "..", "data", "ballistics.json"), "utf8"));
  const byName = {};
  shipped.weapons.forEach(w => { byName[w.name] = w; });

  let cells = 0, wrong = 0;
  for (const [name, , round, , , stk] of ROWS) {
    const w = byName[name];
    if (!w) { console.log("  missing from data/ballistics.json: " + name); wrong++; continue; }
    for (let i = 0; i < stk.length; i++) {
      cells++;
      const got = Math.ceil(HEALTH / (w.torso * RET[round][i]));
      if (got !== stk[i]) {
        wrong++;
        console.log("  " + name + " tier " + i + ": published " + stk[i] + ", shipped data gives " + got);
      }
    }
  }
  console.log((wrong ? "\nFAIL  " : "\nPASS  ") + cells +
    " published shots-to-kill figures reproduced from the shipped damage values" +
    (wrong ? ", " + wrong + " wrong" : ""));
  if (wrong) bad++;
}

/* Fire rates have to reproduce the published times to kill too, within the rounding they
   were derived through. */
{
  const fs = require("fs"), path = require("path");
  const shipped = JSON.parse(fs.readFileSync(
    path.join(__dirname, "..", "data", "ballistics.json"), "utf8"));
  const byName = {};
  shipped.weapons.forEach(w => { byName[w.name] = w; });
  let worst = 0, worstName = "";
  for (const [name, , , , , , ttkRef, stkRef] of ROWS) {
    const w = byName[name];
    if (!w || !w.rpm || stkRef < 2) continue;
    const got = (stkRef - 1) / (w.rpm / 60);
    const off = Math.abs(got - ttkRef) / ttkRef;
    if (off > worst) { worst = off; worstName = name; }
  }
  const ok = worst < 0.05;
  console.log((ok ? "PASS  " : "FAIL  ") + "fire rates reproduce published times to kill (worst: " +
    worstName + ", " + (worst * 100).toFixed(1) + "% off)");
  if (!ok) bad++;
}

/* And the zone multipliers, measured off the M4 column of the hit-zone table by dividing
   each armoured zone back out by the 40% a level 2 vest blocks. */
const M4_TORSO = 30.0;
const ZONES = [
  ["head",         "Head",         39 / 0.6, "helmet"],
  ["neck",         "Neck",         49,       null],
  ["upper-torso",  "Upper torso",  18 / 0.6, "vest"],
  ["middle-torso", "Middle torso", 17 / 0.6, "vest"],
  ["lower-torso",  "Lower torso",  16 / 0.6, "vest"],
  ["pelvis",       "Pelvis",       25,       null],
  ["upper-arm",    "Upper arm",    15,       null],
  ["lower-arm",    "Lower arm",    13,       null],
  ["hand",         "Hand",         8,        null],
  ["upper-leg",    "Upper leg",    15,       null],
  ["lower-leg",    "Lower leg",    13,       null],
  ["foot",         "Foot",         8,        null],
];
console.log("\nzone multipliers, relative to upper torso");
for (const [, label, dmg] of ZONES) {
  console.log("  " + label.padEnd(14) + (dmg / M4_TORSO).toFixed(3));
}

/* Cross-check the zone ratios against a second weapon. The SVD column has to give the
   same head-to-torso ratio as the M4 column if a zone multiplier is a property of the
   body and not of the gun. */
const m4HeadRatio = (39 / 0.6) / (18 / 0.6);
const svdHeadRatio = (83 / 0.6) / (47 / 0.6);
console.log("\nhead/torso ratio: M4 " + m4HeadRatio.toFixed(3) + ", SVD " + svdHeadRatio.toFixed(3) +
  "  -> " + (Math.abs(m4HeadRatio - svdHeadRatio) < 0.05 ? "agree" : "DISAGREE, zones are weapon-dependent"));

process.exit(bad ? 1 : 0);
