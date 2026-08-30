/* The damage model, in one place.
 *
 * This file is loaded twice on purpose: `require`d by test/ballistics.js, and read off
 * disk and inlined verbatim into the ballistics page. That is deliberate. The site has
 * been bitten three times by a number living in two places, and a *formula* living in two
 * places is the same bug with more room to hide: the page would say one thing, the suite
 * would prove another, and both would be internally consistent. So there is one copy, and
 * the suite tests the code the browser actually runs.
 *
 * It is written as plain ES5 function declarations with no imports, because it has to
 * parse as a bare <script> body as well as a CommonJS module.
 *
 * The model itself, in order:
 *
 *   1. base        the weapon's own upper-torso damage at point blank. Derived, not
 *                  transcribed. See tools/solve-ballistics.js.
 *   2. zone        where the round lands. A multiplier on the base, a property of the
 *                  body rather than of the gun.
 *   3. penetration what the armour covering that zone lets through, which is a property
 *                  of the round type and the tier and nothing else. There is no separate
 *                  penetration stat in this game that anybody has published: "penetration"
 *                  IS this retention figure.
 *   4. pellets     a shotgun load is several projectiles and they can miss separately.
 *
 * Health is 100, so shots to kill is ceil(100 / damage) and time to kill is the gap
 * between the first shot and the last, which is (shots - 1) / rate.
 */

/* Which armour slot covers a zone, or "" for the ones nothing covers. Coverage is the
   whole reason the two tiers are picked separately: a level 4 vest is worth nothing to a
   man shot in the neck. */
function slotForZone(zone) {
  return zone && zone.armour ? zone.armour : "";
}

/* The fraction of a hit that survives the armour. blocks[] is what the tier stops, as a
   percentage, per round type. Tier 0 is bare, and bare stops nothing. */
function retention(round, tier) {
  if (!tier) return 1;
  var blocked = round.blocks[tier - 1];
  return blocked === null || blocked === undefined ? 1 : (100 - blocked) / 100;
}

/* The round a weapon actually fires when you ask for one it cannot chamber. A shotgun
   asked for armour piercing loads buckshot, because that is all it has. Returning the
   substitute rather than nothing is what lets one round picker rank every weapon at once,
   and the caller is expected to say which round each row ended up using. */
function roundFor(calibre, wantedId, roundsById) {
  if (calibre && calibre.rounds.indexOf(wantedId) >= 0) return roundsById[wantedId];
  return roundsById[calibre && calibre.rounds[0]] || null;
}

/* One shot, all the way through.
 *
 *   weapon   { torso, rpm, calibre }
 *   zone     { mult, armour }
 *   round    { blocks }
 *   tiers    { helmet: 0..4, vest: 0..4 }
 *   pellets  { hit, of }  optional, shotgun loads only
 */
function shot(weapon, zone, round, tiers, pellets) {
  var slot = slotForZone(zone);
  var tier = slot ? (tiers[slot] || 0) : 0;
  var keep = retention(round, tier);
  var base = weapon.torso * zone.mult;
  var fraction = pellets && pellets.of > 1 ? Math.max(0, Math.min(pellets.hit, pellets.of)) / pellets.of : 1;
  var dealt = base * keep * fraction;
  return {
    base: base,             // before armour, after the zone
    keep: keep,             // what the armour let through, 0 to 1
    absorbed: base * fraction * (1 - keep),
    slot: slot,             // "helmet", "vest" or ""
    tier: tier,             // the tier that actually applied, so 0 on an uncovered zone
    pelletFraction: fraction,
    damage: dealt,
  };
}

/* Shots to kill, and the time those shots take. A one-shot kill has no gap in it, so its
   time to kill is zero rather than one reload: the number people want from a sniper is
   "one shot", and dressing that up as a duration reads as slower than a rifle. */
function toKill(damage, rpm, health) {
  var hp = health || 100;
  if (!(damage > 0)) return { stk: Infinity, ttk: Infinity };
  var stk = Math.ceil(hp / damage);
  var ttk = stk > 1 && rpm ? (stk - 1) / (rpm / 60) : 0;
  return { stk: stk, ttk: ttk };
}

/* Flight time from muzzle velocity. This is a floor and it is labelled as one on the
   page: a bullet slows down, so a real round arrives later than this says. It is here
   because muzzle velocity is published and the drag is not, and a floor derived from a
   published number is worth more than a curve fitted to nothing. Nothing else on the page
   depends on it, and in particular no damage figure does. */
function flightTime(calibre, metres) {
  if (!calibre || !calibre.velocity || !metres) return 0;
  return metres / calibre.velocity[calibre.velocity.length - 1];
}

/* Which of the time-to-kill bands a result falls in. Bands are a state scale, not a
   series palette, which is why they get the reserved status colours and always travel
   with their label. */
function bandFor(bands, stk, ttk) {
  if (stk === 1) return bands[0];
  for (var i = 0; i < bands.length; i++) if (ttk <= bands[i].upTo) return bands[i];
  return bands[bands.length - 1];
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { slotForZone: slotForZone, retention: retention, roundFor: roundFor,
    shot: shot, toKill: toKill, flightTime: flightTime, bandFor: bandFor };
}
