/* Turns the transcribed vendor catalogue below into data/armory.json.
 *
 * The raw data is kept as plain lines rather than hand-written JSON on purpose: three
 * hundred odd objects of {"name": ..., "price": ...} is a lot of punctuation to get right
 * by hand, and a missing comma in the middle of it is a silent corruption. Lines are hard
 * to break. The parser below is strict, and the checks at the bottom refuse to write a
 * file that has duplicates, unparseable prices or a category that came out empty.
 *
 * Everything here is a vendor price read off the public database, not derived. An item
 * with no price is one the source does not have confirmed yet, and it stays blank rather
 * than being guessed at. Checked 30 August 2026 against the closed beta build.
 *
 * Line format:  Name | price
 *   $1,600      a price
 *   Free        costs nothing
 *   (blank)     not confirmed yet
 *   $15/10      a price for a pack of ten
 *
 * Prices only. Weight, footprint, stack size and unlock level are the same source read a
 * different way, in bulk rather than typed, and they live in data/armory-stats.json with a
 * note on how that pull is repeated. Two homes for one number is what this codebase keeps
 * getting caught by, so do not add them back to these lines.
 */
const fs = require("fs");
const path = require("path");

const RAW = {
  weapons: `
9K333 Verba|$800
A-91|Free
AK74|$1,600
AMP-9|$900
AMR 50|$8,800
BMR-308|$6,000
Bushmaster M17S|Free
Compound Bow|$800
Deagle|$900
FAL|$6,500
Galil|$2,200
GGX 17|$200
GGX 18|$800
Judge|$250
KH-2002|Free
M1911|$300
M249 SAW|$3,200
M4|$2,800
M500|$1,200
MAAWS|$2,600
MGL-40|$6,000
MK22|$6,400
Mosin Nagant|$4,500
MP43|$400
MP5|$1,500
PKM|$4,500
PP-19 Vityaz|$1,200
RPG-7|$2,000
Scout Rifle TD|$1,100
SKS|$2,400
Super-45|$2,600
SV98|$5,200
SVD|$4,800
T-21|$600
`,
  armour: `
Ghillie Body Suit|$3,000
Ghillie Body Suit (Dead)|$3,500
Ghillie Headwear|$2,500
Ghillie Headwear (Dead)|$2,800
Level 1 Armor|$400
Level 1 Helmet|$200
Level 2 Armor|$1,000
Level 2 Helmet|$500
Level 3 Armor|$2,000
Level 3 Helmet|$1,500
Level 4 Armor|$4,000
Level 4 Helmet|$3,000
`,
  ammunition: `
.308 Win Armor Piercing (AP)|$180/10
.308 Win Flesh Damage (HP)|$70/10
.308 Win Standard (FMJ)|$40/10
.338|
.338 AP|
.338 HP|
.45 ACP Armor Piercing (AP)|$20/10
.45 ACP Flesh Damage (HP)|$15/10
.45 ACP Standard (FMJ)|$10/10
.45 Colt Armor Piercing (AP)|$66/6
.45 Colt Flesh Damage (HP)|$50/6
.45 Colt Standard (FMJ)|$33/6
.50Cal Standard (FMJ)|$250/5
5.45mm Armor Piercing (AP)|$40/10
5.45mm Flesh Damage (HP)|$25/10
5.45mm Standard (FMJ)|$15/10
5.56mm Armor Piercing (AP)|$40/10
5.56mm Flesh Damage (HP)|$25/10
5.56mm Standard (FMJ)|$15/10
50AE Armor Piercing (AP)|$90/5
50AE Flesh Damage (HP)|$35/5
50AE Standard (FMJ)|$20/5
7.62mm Armor Piercing (AP)|$150/10
7.62mm Flesh Damage (HP)|$90/10
7.62mm Standard (FMJ)|$40/10
7.62x54mm Armor Piercing (AP)|$90/5
7.62x54mm Flesh Damage (HP)|$55/5
7.62x54mm Standard (FMJ)|$30/5
7.62x51mm Standard (FMJ)|$300/100
7.62x51mm Armor Piercing (AP)|$250/100
9mm Armor Piercing (AP)|$20/10
9mm Flesh Damage (HP)|$15/10
9mm Standard (FMJ)|$10/10
12g 7mm Buckshot|$60/6
12g Rifled Slug|$200/6
Broadhead Arrow|$75/5
Rambo Explosive Arrow|$150
120mm HEAT-MP Shell|$210
122mm HE Rocket|$450/3
155mm HE Shell|$120/2
155mm Standard (SB)|$600/10
155mm Expensive (SB)|$600/10
20x102mm|$600/10
30mm HE Cannon|$500/200
35x228mm Anti-Air Cannon|$200/75
40mm|$100
72mm|$600/10
81mm|$600/10
84mm|$200
93mm|$200
`,
  attachments: `
.45 ACP Pistol Compensator|$1,030
.50 Cal Heavy Suppressor|$1,420
10x|
12 Gauge Suppressor|$1,040
2.5x Combat Optic|$690
3 Prong Flash Hider|$1,000
3-Chamber Brake|$1,080
3x Tactical Prism Scope|$740
3x-6x LPVO Short Dot|$860
45 Degree Angled Foregrip|$680
4x Combat Prism Scope with Reflex|$880
4X Hybrid|
6-10x Scope MOA|$1,050
6-10x Scope MRAD|$1,200
6x Marksman Scope + Reflex|$1,650
6x Precision Rifle Scope|$680
AFG Angled Foregrip|$820
AK74 30 RND Magazine|$35
AK74 60 RND Magazine|$150
AK74 75 RND Drum Magazine|$200
AK74 Barrel|
AK74 Grip|
AK74 Handguard|
AK74 Receiver|
AK74 Stock|
AMP-9 15 RND Magazine|$30
AMP-9 20 RND Magazine|$70
AMP-9 30 RND Magazine|$100
AMP-9 50 RND Drum Magazine|$180
AMP-9 9x19 Suppressor|$1,130
AMP-9 Tactical Flash Hider|$550
AMR 50 10 RND Magazine|$30
AMR 50 5 RND Magazine|$15
Angled Tactical Foregrip|$650
AR Multi-Caliber Suppressor|$400
AT4 Mag|
AX50 .50 Cal Muzzle Brake|$1,600
Ballista Brake|$380
Basic Muzzle|
Birdcage Flash Hider|$900
BMR-308 Flash Hider|$1,280
BMR-308 Suppressor|$1,200
CGM4 Scope|
Compact T-2 Red Dot|$340
Constrictor Brake|$760
CQ-2x Prism Combat Scope|$640
CQB 74 Brake|$680
CQR Tactical Front Rail Grip|$1,100
Deadeye Flash Hider|$400
Deagle 7 RND Magazine|$50
DTK-1 Brake|$820
Dual Port Brake|$720
Eclipse Flash Hider|$700
FAL 10 RND Magazine|$60
FAL 20 RND Magazine|$150
FAL 30 RND Magazine|$250
FAL Flash Hider|$1,250
Flow-Through .308 Suppressor|$1,120
Four Reticle Reflex|$580
Frontier 2.5x-10x Precision Scope|$1,800
Full Choke|$1,400
Galil 35 RND Magazine|$60
Galil 50 RND Magazine|$110
GGX 17 RND Magazine|$30
GGX 33 RND Magazine|$70
GGX 50 RND Drum Magazine|$110
Ghost LITE Muzzle Brake|$970
Glock 17 Extended Magazine|
GOL Multi-Caliber Suppressor|$1,800
Hexagon 762 Suppressor|$1,210
Hexagon Brake|$350
Holographic Sight|$620
Hybrid Grip Pod|$1,500
Improved Cylinder Choke|$540
Judge Magazine|
Kobra Reflex|$520
M1911 10 RND Magazine|$35
M1911 7 RND Magazine|$20
M249 100 RND Fabric Magazine|$200
M249 200 RND Box|$250
M249 Bipod|$1,050
M500 Sabre Brake|$740
Mini Angled Foregrip|$720
Mini Reflex Sight|$200
MK22 10 RND Magazine|$60
MK22 5 RND Magazine|$30
MMGL Internal Magazine|
MMGL Sight|
Mosin Internal Magazine|
MP5 20 RND Magazine|$70
MP5 30 RND Magazine|$100
MP5 50 RND Drum Magazine|$230
MP5 Flash Hider|$1,150
MP9 Extended Magazine|
OKP 7 Reflex|$840
Orpheus Max Brake|$1,020
PBS-4 Suppressor|$1,300
PGO-7|$850
PKM 100 RND Box|$100
PKM Bipod|$1,350
PP-19 50 RND Vityaz Drum Magazine|$200
PP-19 Vityaz 10 RND Magazine|$25
PP-19 Vityaz 30 RND Magazine|$100
PP-19 Vityaz Flash Hider|$800
PP-19-01 Vityaz 9x19 Suppressor|$1,450
Pro Tilt Bipod|$1,400
QD-5 Suppressor|$1,170
RC-556 Suppressor|$1,550
RK6 Tactical Foregrip|$380
Rubberized Ergonomic Foregrip|$540
RVG Vertical Foregrip|$770
SG Multi-Caliber Suppressor|$1,220
Shift Foregrip|$1,150
SKS Bipod|$800
SKS Extended Mag|
SKS Internal Magazine|
Slicktap Brake|$940
Slotted Flash Hider|$960
Sniper Muzzle|
Spectr 4x|$800
Spitfire 3X|$790
SRVV Brake|$1,470
STANAG 20 RND Magazine|$10
STANAG 30 RND Magazine|$55
STANAG 60 RND Magazine|$180
STRELIX Suppressor|$1,000
Super-45 13 RND Magazine|$30
Super-45 30 RND Magazine|$80
Super-45 40 RND Drum Magazine|$280
Super-45 Flash Hider|$1,050
Suppressor T8L1 Scout|$1,000
SV98 10 RND Magazine|$40
SV98 Bipod|$1,250
SV98 Extended Magazine|
SVD 10 RND Magazine|$40
SVD 5 RND Magazine|$20
SVD 7.62x54R Brake|$650
SVD Bipod|$1,120
TDG Vertical Foregrip|$1,000
TGP-A Suppressor 5.45|$1,190
Three Port Brake|$1,180
TopComp Brake|$770
Tread Brake|$620
Tricon 1.5x Compact Prism Scope|$650
Vektor Frenix-X Micro Reflex Sight|$820
Zenit Handguard|
`,
  equipment: `
Basic Parachute|$100
Binoculars|$75
Fuel Can|$150
Heavy Drill|$1,300
Infrared Range Finder|$1,200
Light Drill|$600
Range Finder|$400
Monocular|
Sport Parachute|$1,000
Wrench|$150
Large Hammer|
Medium Hammer|
`,
  throwables: `
C4 Charge|$250
Gold Frag Grenade|
Improvised Explosive Device|$300
M18 Signal Grenade: Alert|$50
M18 Signal Grenade: Damaged Vehicle|$50
M18 Signal Grenade: Friendly|$50
M18 Signal Grenade: Hostile|$50
M18 Signal Grenade: Landing Zone|$50
M18 Signal Grenade: Supply Request|$50
M18 Smoke Grenade: Black|$100
M18 Smoke Grenade: White|
AT Mine|
Claymore|
M67 Frag Grenade|$200
Remote Detonator|$550
`,
  medical: `
Adrenaline Pen|$250
Bandage|$200
Defibrillator|$1,600
Emergency Resuscitator|Free
Enox|$450
Field Resuscitator|$500
Individual First Aid Kit|$800
Medical Bag|$2,000
`,
  storage: `
Arsenal Backpack + 2 Slings|$5,000
Assault Backpack|$1,200
Field Backpack|$650
Gunner Backpack + Sling|$3,500
Halftrack Backpack|$15,000
Large Tac Vest|$400
Medium Backpack + Sling|$1,400
Medium Tac Vest|$250
Operator Backpack|$800
Pouch|Free
Ruck Backpack|$2,400
Scout Backpack|$350
Small Tac Vest|$100
`,
  supply: `
Ammo Supply Pallet|$400
Build Supply Pallet|$400
Fuel Supply Pallet|$400
Mechanical Supply Pallet|$400
Large Armored Crate|$800
Large Crate|$300
Small Armored Crate|$500
Small Crate|$150
Ammo Supplies|$10/50
Build Supplies|$10/50
Fuel Supplies|$10/50
Mechanical Supplies|$10/50
Battery|$150
High Capacity Battery|$300
`,
  vehicles: `
AH-6M [Miniguns]|$7,000
AH-6R [Rockets]|$12,500
Bobcat|$500
Dune Buggy|$1,500
Flakpanzer Gepard|$10,000
Havoc|$18,000
Humvee|$3,000
Humvee [M249]|$3,750
Humvee [Minigun]|$4,500
Kodiak|$2,500
Kodiak [M249]|$3,750
Kodiak [Pickup]|$3,000
L2A6|$14,000
M113 APC SV|
MH-6|$6,250
SPH-2|$8,000
UH-1Y|$7,400
UH-1Y [Miniguns]|$8,000
Ural|
Ural Defender|$6,000
Ural Defender [M249]|$6,750
`,
  mounted: `
2A42 Autocannon|
B-13 Rocket Pods|
Duel 35mm Oerlikon GDF Cannons|
Flares|$750
L52 Cannon|
L55A1 Cannon|
L81 Mortar|
M134D Minigun|
M249 Machine Gun|
MG3A1 Coaxial Gun|
Stingray|
Talon 9K-SAM|
Vanguard CIWS|
`,
};

const CATEGORIES = [
  { id: "weapons",     name: "Weapons",         blurb: "Rifles, snipers, pistols and launchers." },
  { id: "attachments", name: "Attachments",     blurb: "Optics, muzzles, grips and magazines." },
  { id: "ammunition",  name: "Ammunition",      blurb: "Calibres and shells, priced per pack." },
  { id: "armour",      name: "Armour",          blurb: "Helmets, body armour and ghillie." },
  { id: "equipment",   name: "Equipment",       blurb: "Recon, repair and traversal gear." },
  { id: "throwables",  name: "Throwables",      blurb: "Grenades, charges and detonators." },
  { id: "medical",     name: "Medical",         blurb: "Bandages, kits and injectors." },
  { id: "storage",     name: "Storage",         blurb: "Backpacks, vests and pouches." },
  { id: "supply",      name: "Supply",          blurb: "Pallets, crates and loose supplies." },
  { id: "vehicles",    name: "Vehicles",        blurb: "Ground and air transport." },
  { id: "mounted",     name: "Mounted weapons", blurb: "Vehicle guns, cannons and emplacements." },
];

/* Which weapons feed which calibre, so a loadout can price its ammunition. Taken from the
   published ammo chart, the same one the ballistics page is built on. Weapons without an
   entry are launchers and belt-feds whose ammunition the chart does not cover. */
const WEAPON_CALIBRE = {
  "AMR 50": ".50Cal", "M500": "12g", "MP43": "12g", "BMR-308": ".308 Win",
  "FAL": ".308 Win", "MK22": ".308 Win", "SVD": "7.62x54mm", "Mosin Nagant": "7.62x54mm",
  "SV98": "7.62x54mm", "SKS": "7.62mm", "Judge": ".45 Colt", "Deagle": "50AE",
  "M1911": ".45 ACP", "Super-45": ".45 ACP", "AK74": "5.45mm",
  "M4": "5.56mm", "M249 SAW": "5.56mm", "T-21": "5.56mm", "A-91": "5.56mm",
  "Bushmaster M17S": "5.56mm", "KH-2002": "5.56mm", "Galil": "5.56mm",
  "Scout Rifle TD": "5.56mm", "MP5": "9mm", "GGX 18": "9mm", "AMP-9": "9mm",
  "PP-19 Vityaz": "9mm", "Compound Bow": "Broadhead Arrow", "PKM": "7.62x51mm",
};

/* Icon slugs join items to the wiki icons fetched into docs/game-icons/ by
 * tools/pull-game-icons.js. Most items share their exact name with the wiki and match
 * automatically; this map covers the rest. A null value is a deliberate honest gap: the
 * wiki has no icon that can be identified as this item without guessing, so the item
 * ships without one and stops appearing in the unmatched report. */
const ICON_OVERRIDES = {
  // The wiki names the plain round after its full cartridge, the armory says Standard (FMJ)
  ".308 Win Standard (FMJ)": "308win",
  ".45 ACP Standard (FMJ)": "45acp",
  ".45 Colt Standard (FMJ)": "45colt",
  ".50Cal Standard (FMJ)": "50cal",
  "5.45mm Standard (FMJ)": "545mm",
  "5.56mm Standard (FMJ)": "556mm",
  "50AE Standard (FMJ)": "50ae",
  "7.62mm Standard (FMJ)": "762mm",
  "7.62x51mm Standard (FMJ)": "762x51mm",
  "7.62x54mm Standard (FMJ)": "762x54mm",
  "9mm Standard (FMJ)": "9mm",
  ".308 Win Flesh Damage (HP)": "308win-hollowpoint",
  // Several wiki entries share one display name; these pick the base variant
  "81mm": "120x800mm",
  "155mm HE Shell": "155mm",
  "Level 4 Helmet": "superheavyhelmet",
  "AK74 Grip": "ak74mgrip",
  "AT4 Mag": "at4rocket",
  "STANAG 30 RND Magazine": "stanagmagazine",
  "45 Degree Angled Foregrip": "fgrp_016",
  "Fuel Can": "fuelcan",
  "Improvised Explosive Device": "ied-explosive",
  "Adrenaline Pen": "adrenalinepen",
  "M113 APC SV": "land-tracked-spawnvehicle-lonestar",
  "Stingray": "stationary-stn_05",
  // Mounted guns the wiki only carries under generic names like Machine Gun; matching a
  // specific gun to one of those icons would be a guess
  "2A42 Autocannon": null,
  "B-13 Rocket Pods": null,
  "Duel 35mm Oerlikon GDF Cannons": null,
  "L52 Cannon": null,
  "L55A1 Cannon": null,
  "M134D Minigun": null,
  "M249 Machine Gun": null,
  "MG3A1 Coaxial Gun": null,
};

const WIKI = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "game-icons.json"), "utf8"));
const iconNorm = s => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const iconByName = new Map();
const iconNameDupes = new Set();
for (const w of WIKI.items) {
  if (w.hasIcon === false) continue;
  const k = iconNorm(w.name);
  if (iconByName.has(k) && iconByName.get(k) !== w.slug) iconNameDupes.add(k);
  else iconByName.set(k, w.slug);
}
const iconFor = name => {
  if (name in ICON_OVERRIDES) return ICON_OVERRIDES[name];
  const k = iconNorm(name);
  if (iconNameDupes.has(k)) return null;
  return iconByName.get(k) || null;
};

const items = [];
const problems = [];

for (const [cat, block] of Object.entries(RAW)) {
  const lines = block.trim().split("\n").map(l => l.trim()).filter(Boolean);
  for (const line of lines) {
    const bar = line.lastIndexOf("|");
    if (bar < 0) { problems.push("no separator: " + line); continue; }
    const name = line.slice(0, bar).trim();
    const raw = line.slice(bar + 1).trim();

    let price = null, per = 1, free = false;
    if (raw === "Free") { price = 0; free = true; }
    else if (raw) {
      const m = raw.match(/^\$([\d,]+)(?:\/(\d+))?$/);
      if (!m) { problems.push("unparseable price on " + name + ": " + raw); continue; }
      price = Number(m[1].replace(/,/g, ""));
      per = m[2] ? Number(m[2]) : 1;
    }
    const item = { name, cat, price, per };
    if (free) item.free = true;
    if (cat === "weapons" && WEAPON_CALIBRE[name]) item.calibre = WEAPON_CALIBRE[name];
    const slug = iconFor(name);
    if (slug) item.icon = slug;
    items.push(item);
  }
}

// -- checks: refuse to write something obviously wrong --
const seen = new Map();
for (const it of items) {
  const key = it.cat + "/" + it.name;
  if (seen.has(key)) problems.push("duplicate: " + key);
  seen.set(key, true);
}
for (const c of CATEGORIES) {
  if (!items.some(i => i.cat === c.id)) problems.push("empty category: " + c.id);
}
const calibres = new Set(items.filter(i => i.cat === "ammunition").map(i => i.name.split(" ")[0]));
for (const [w, cal] of Object.entries(WEAPON_CALIBRE)) {
  if (!items.some(i => i.cat === "weapons" && i.name === w)) problems.push("calibre for unknown weapon: " + w);
}
const wikiSlugs = new Set(WIKI.items.map(w => w.slug));
for (const [name, slug] of Object.entries(ICON_OVERRIDES)) {
  if (!items.some(i => i.name === name)) problems.push("icon override for unknown item: " + name);
  if (slug !== null && !wikiSlugs.has(slug)) problems.push("icon override to unknown slug: " + name + " -> " + slug);
  if (slug !== null && WIKI.items.some(w => w.slug === slug && w.hasIcon === false))
    problems.push("icon override to a slug the wiki has no icon for: " + name + " -> " + slug);
}

if (problems.length) {
  console.error("armory data is not clean:");
  problems.forEach(p => console.error("  " + p));
  process.exit(1);
}

const priced = items.filter(i => i.price !== null).length;
const out = {
  _note: "Vendor prices transcribed from the public item database, not derived. A null price is an item the source has not confirmed; it stays blank rather than being guessed at. An icon names a file under docs/game-icons/, fetched by tools/pull-game-icons.js. Regenerate with tools/build-armory.js.",
  checkedOn: "2026-08-30",
  gameVersion: "closed beta, pre Early Access",
  categories: CATEGORIES,
  items,
};
/* --check regenerates into memory and refuses if the committed file disagrees, rather than
   overwriting it. The build runs it that way so a generated file can never drift from the
   generator that is supposed to produce it. It has drifted once: a commit took the new
   data/armory.json without the tools/build-armory.js change that made it, so the next
   regeneration would have quietly stripped every icon off the loadout page. Overwriting
   here would have hidden exactly that. Refusing names it. */
const FILE = path.join(__dirname, "..", "data", "armory.json");
const text = JSON.stringify(out, null, 1) + "\n";

if (process.argv.includes("--check")) {
  const onDisk = fs.existsSync(FILE) ? fs.readFileSync(FILE, "utf8") : "";
  if (onDisk !== text) {
    console.error("data/armory.json does not match what tools/build-armory.js produces.");
    console.error("Either it was hand-edited, or the generator changed and the file was");
    console.error("not regenerated. Run: node tools/build-armory.js");
    const was = (() => { try { return JSON.parse(onDisk).items || []; } catch (_) { return []; } })();
    const icons = n => n.filter(i => i.icon).length;
    if (was.length) {
      console.error("  on disk: " + was.length + " items, " + icons(was) + " with icons");
      console.error("  fresh:   " + items.length + " items, " + icons(items) + " with icons");
    }
    process.exit(1);
  }
  console.log("data/armory.json reproduces from its generator");
  process.exit(0);
}

fs.writeFileSync(FILE, text);

const noIcon = items.filter(i => !i.icon && ICON_OVERRIDES[i.name] !== null);
console.log(items.length + " items across " + CATEGORIES.length + " categories, " +
  priced + " priced, " + (items.length - priced) + " awaiting confirmation, " +
  items.filter(i => i.icon).length + " with icons");
for (const c of CATEGORIES) {
  console.log("  " + c.name.padEnd(16) + String(items.filter(i => i.cat === c.id).length).padStart(4));
}
if (noIcon.length) {
  console.log("no icon matched (add to ICON_OVERRIDES, or set null for an honest gap):");
  noIcon.forEach(i => console.log("  " + i.cat + " | " + i.name));
}
