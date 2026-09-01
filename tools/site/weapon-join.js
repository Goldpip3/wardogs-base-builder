/* Which damage rows a weapon gets, and when a measured figure brings one in.
 *
 * Both rules are here rather than in tools/site/context.js so that test/weapon-join.js can
 * run them against stub data. The promotion only does anything when somebody has measured a
 * rate of fire, so while data/measured.json is empty a build exercises none of it: without a
 * test it would be a mechanism nobody finds out is broken until the day it is needed, which
 * is the day it is least welcome. It shipped broken once already, on the load order.
 */

/* The measured sheet is a table per weapon class, and a weapon fires one calibre, so its
   loads are the rows in its class whose name starts with that calibre. Shotguns and the bow
   have one set of rows and no calibre prefix to match on, so they take all of them. */
const CAL_LABEL = {
  "556": "5.56", "545": "5.45", "308": "308 Win", "762": "7.62x39", "762x54": "7.62x54",
  "9mm": "9mm", "45acp": "45acp", "45colt": "45colt", "50ae": "50AE", "50cal": "50cal",
};

function loadsFor(DAMAGE, w) {
  const inClass = DAMAGE.classes[w.class];
  if (!inClass) return null;
  const label = CAL_LABEL[w.calibre];
  const names = Object.keys(inClass).filter(n => !label || n.indexOf(label) === 0);
  if (!names.length) return null;
  const out = {};
  names.forEach(n => { out[n] = inClass[n]; });
  return out;
}

/* A weapon sits in unfiguredWeapons when the page cannot put a number on it. For most of
   them that is permanent: a launcher does blast damage and does not belong in a hit-zone
   table at all. For the PKM it was one missing figure.

   So: an unfigured weapon that states its class, whose calibre has rows in that class, and
   whose rate of fire somebody has measured, becomes a full row. Measuring one number with
   tools/measure.js is the whole job. Mutates the two lists on BALLISTICS, because every page
   reads them from there and a promoted weapon that is figured on one page and a gap on
   another would be worse than either. */
function promote(BALLISTICS, DAMAGE, MEASURED) {
  const idOf = label => (BALLISTICS.calibres.find(c => c.name === label) || {}).id || null;
  const promoted = [];
  BALLISTICS.unfiguredWeapons = BALLISTICS.unfiguredWeapons.filter(u => {
    const seen = (MEASURED.items || {})[u.name] || {};
    const rpm = seen.rpm;
    const cls = seen.class || u.class;
    if (!rpm || !cls) return true;
    const calibre = idOf(u.calibre);
    const w = { name: u.name, calibre: calibre, class: cls, rpm: rpm, measured: seen.on };
    if (!calibre || !loadsFor(DAMAGE, w)) return true;
    promoted.push(w);
    return false;
  });
  BALLISTICS.weapons = BALLISTICS.weapons.concat(promoted);
  BALLISTICS.promotedWeapons = promoted;
  return promoted;
}

module.exports = { CAL_LABEL, loadsFor, promote };
