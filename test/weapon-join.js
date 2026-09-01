const ROOT = require("path").resolve(__dirname, "..");
/* The rule that brings a weapon into the damage tables, and the one that promotes an
   unfigured one on a measured rate of fire. Tested against stubs rather than against the
   real data, because the promotion does nothing at all until somebody has measured
   something: with data/measured.json empty, a build proves none of this. It shipped broken
   once inside an hour of being written, on the order the data files load in, and a build
   went green over it.
*/
const { loadsFor, promote } = require(ROOT + "/tools/site/weapon-join");

let pass = 0, fail = 0;
const check = (ok, label) => { console.log((ok ? "PASS  " : "FAIL  ") + label); ok ? pass++ : fail++; };

const DAMAGE = {
  classes: {
    LMG: { "7.62x54 AP": { zones: { chest: 60 } }, "7.62x54 FMJ": { zones: { chest: 63.5 } },
           "5.56 FMJ": { zones: { chest: 30 } } },
    Shotgun: { "Buckshot": { zones: { chest: 40 } } },
  },
};
const stubBallistics = () => ({
  calibres: [{ id: "762x54", name: "7.62x54mm" }, { id: "556", name: "5.56mm" },
             { id: "93mm", name: "93mm" }],
  weapons: [{ name: "M249 SAW", class: "LMG", calibre: "556", rpm: 855 }],
  unfiguredWeapons: [
    { name: "PKM", calibre: "7.62x54mm", kind: "Light machine gun", class: "LMG", why: "..." },
    { name: "RPG-7", calibre: "93mm", kind: "Launcher", why: "Explosive." },
    { name: "Nameless", calibre: null, kind: "Small arm", why: "No calibre stated." },
  ],
});

// ---------- the join ----------
check(Object.keys(loadsFor(DAMAGE, { class: "LMG", calibre: "762x54" })).length === 2,
  "a weapon takes the rows in its class that its calibre names");
check(loadsFor(DAMAGE, { class: "LMG", calibre: "50cal" }) === null,
  "a calibre with no rows in its class is no join at all, not an empty one");
check(Object.keys(loadsFor(DAMAGE, { class: "Shotgun", calibre: "12g" })).length === 1,
  "a class whose rows carry no calibre prefix gives all of them");
check(loadsFor(DAMAGE, { class: "Nonesuch", calibre: "556" }) === null,
  "a class the sheet has never heard of is no join");

// ---------- the promotion ----------
{
  const B = stubBallistics();
  const got = promote(B, DAMAGE, { items: {} });
  check(got.length === 0 && B.unfiguredWeapons.length === 3 && B.weapons.length === 1,
    "nothing is promoted while nothing has been measured");
}
{
  const B = stubBallistics();
  const got = promote(B, DAMAGE, { items: { PKM: { rpm: 650, on: "2026-09-02" } } });
  check(got.length === 1 && got[0].name === "PKM" && got[0].calibre === "762x54" &&
    got[0].rpm === 650 && got[0].class === "LMG",
    "a measured rate of fire promotes the PKM, with its calibre resolved to an id");
  check(B.weapons.length === 2 && !B.unfiguredWeapons.some(u => u.name === "PKM"),
    "a promoted weapon leaves the gap list as it joins the figured one");
  check(got[0].measured === "2026-09-02",
    "the promoted row carries the day it was measured");
}
{
  const B = stubBallistics();
  /* The launcher is the case the rule must not let through: it has a calibre and could be
     given a rate of fire, and it still does not belong in a hit-zone table. It stays out
     because no class in the sheet covers it. */
  const got = promote(B, DAMAGE, { items: { "RPG-7": { rpm: 4, class: "Launcher", on: "2026-09-02" } } });
  check(got.length === 0 && B.unfiguredWeapons.some(u => u.name === "RPG-7"),
    "a measured rate of fire alone does not promote a weapon the sheet has no rows for");
}
{
  const B = stubBallistics();
  const got = promote(B, DAMAGE, { items: { Nameless: { rpm: 600, class: "LMG", on: "2026-09-02" } } });
  check(got.length === 0,
    "a weapon with no calibre stated stays out, since nothing says which rows are its");
}
{
  const B = stubBallistics();
  const got = promote(B, DAMAGE, { items: { PKM: { kg: 7.5, on: "2026-09-02" } } });
  check(got.length === 0,
    "measuring something else about a weapon does not promote it");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
