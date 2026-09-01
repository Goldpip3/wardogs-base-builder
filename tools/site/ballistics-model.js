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
 * The model changed on 2026-08-31, from derived to measured. It used to start from one
 * damage figure per weapon, solved out of published shots-to-kill tables, and multiply it
 * by a zone. It now reads the zone figure straight out of data/damage.json, which is the
 * owner's own in-game measurements. Two things that rewrite fixed rather than moved:
 *
 *   Coverage grows with tier. A tier 1 helmet is the head. A tier 3 helmet also takes the
 *   neck. A tier 4 vest also takes the bicep and the groin. The old model had one fixed
 *   list per piece and the page said outright that a helmet is worth nothing to a man shot
 *   in the neck, which against tier 3 is false.
 *
 *   The class fires the round, not the calibre. 9mm out of an SMG and 9mm out of a pistol
 *   are different figures. The old model had one number per calibre and could not say it.
 *
 * In order: the zone figure is the measurement; armour keeps a fraction of it, set by the
 * round type and the tier; a shotgun's figure is per pellet and pellets can miss
 * separately. Health is 100, so shots to kill is ceil(100 / damage) and time to kill is
 * the gap between first shot and last, which is (shots - 1) / rate.
 */

/* Which piece is covering this zone at the tiers being worn, or "" if none is. A zone
   carries the piece that would cover it and the tier that piece has to reach; below that
   tier the zone is bare however good the armour is. */
function slotForZone(zone, tiers) {
  if (!zone || !zone.slot || !zone.coveredFrom) return "";
  var tier = (tiers && tiers[zone.slot]) || 0;
  return tier >= zone.coveredFrom ? zone.slot : "";
}

/* The fraction of a hit that survives the armour, read straight off the scaling table.
   Tier 0 is bare and bare stops nothing. A round type the table does not know keeps
   everything rather than silently keeping none. */
function retention(scalings, type, tier) {
  if (!tier) return 1;
  var byType = scalings && scalings[type];
  if (!byType) return 1;
  var s = byType[tier];
  return s === undefined || s === null ? 1 : s;
}

/* The load a class actually fires when asked for one it does not have. A shotgun asked for
   armour piercing gets buckshot, because that is all it has. Returning the substitute
   rather than nothing is what lets one round picker rank every weapon at once, and the
   caller is expected to say which load each row ended up using. */
function loadFor(loads, wantedType) {
  if (!loads) return null;
  var names = Object.keys(loads);
  for (var i = 0; i < names.length; i++) {
    if (loads[names[i]].type === wantedType) return { name: names[i], load: loads[names[i]] };
  }
  return names.length ? { name: names[0], load: loads[names[0]] } : null;
}

/* One shot, all the way through.
 *
 *   load     { type, zones: { head: n, ... }, pellets? }
 *   zone     { id, slot, coveredFrom }
 *   tiers    { helmet: 0..4, vest: 0..4 }
 *   scalings { FMJ: { 1: 0.7, ... }, ... }
 *   pellets  { hit } optional, and only meaningful on a load that has a pellet count
 */
function shot(load, zone, tiers, scalings, pellets) {
  var per = load && load.zones ? load.zones[zone && zone.id] : 0;
  if (!(per > 0)) {
    return { base: 0, perPellet: 0, keep: 1, absorbed: 0, slot: "", tier: 0,
             pelletsHit: 0, pelletsOf: 0, damage: 0 };
  }
  var of = load.pellets || 0;
  var hit = of ? Math.max(0, Math.min(pellets && pellets.hit !== undefined ? pellets.hit : of, of)) : 0;
  var base = of ? per * hit : per;
  var slot = slotForZone(zone, tiers);
  var tier = slot ? (tiers[slot] || 0) : 0;
  var keep = retention(scalings, load.type, tier);
  return {
    base: base,             // before armour, after the pellets that landed
    perPellet: of ? per : 0,
    keep: keep,             // what the armour let through, 0 to 1
    absorbed: base * (1 - keep),
    slot: slot,             // "helmet", "vest" or ""
    tier: tier,             // the tier that actually applied, so 0 on an uncovered zone
    pelletsHit: hit,
    pelletsOf: of,
    damage: base * keep,
  };
}

/* Shots to kill, and the time those shots take. A one-shot kill has no gap in it, so its
   time to kill is zero rather than one reload: the number people want from a sniper is
   "one shot", and dressing that up as a duration reads as slower than a rifle. */
/* A weapon with no measured rate of fire has no time to kill, and null says so. It used to
   fall through to 0, which is the figure for a one-shot kill: the fastest thing on the page.
   That mattered the moment a weapon could be figured for damage without one, which is where
   the PKM sits until somebody counts its rounds. */
function toKill(damage, rpm, health) {
  var hp = health || 100;
  if (!(damage > 0)) return { stk: Infinity, ttk: Infinity };
  var stk = Math.ceil(hp / damage);
  var ttk = stk === 1 ? 0 : (rpm ? (stk - 1) / (rpm / 60) : null);
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
/* No band for a weapon with no time to kill: the colour scale is seconds, and painting one
   on would be a claim. Callers draw a dash instead. */
function bandFor(bands, stk, ttk) {
  if (stk === 1) return bands[0];
  if (ttk === null || ttk === undefined) return null;
  for (var i = 0; i < bands.length; i++) if (ttk <= bands[i].upTo) return bands[i];
  return bands[bands.length - 1];
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { slotForZone: slotForZone, retention: retention, loadFor: loadFor,
    shot: shot, toKill: toKill, flightTime: flightTime, bandFor: bandFor };
}
