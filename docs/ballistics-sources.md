# Where the ballistics numbers come from

Checked 30 August 2026, against the closed beta build, eleven days before Early Access.

The rule for this file is the same as everywhere else on the site: a number is either
transcribed from something published or derived from something published, and it says
which. Nothing is estimated to fill a hole. A hole is left as a hole.

## Transcribed

**The ammo chart.** Twelve calibres with damage, muzzle velocity, projectile mass, bullet
diameter, which round types they load, and which weapons chamber them. Straight off the
published per-calibre table. These are game facts and they are stated as such.

**The armour table.** What each round type keeps through each of the four armour tiers.
Two independent sources agree on it, and the calculator's own controls label the tiers the
same way ("Level 2 armour blocks 40%"), so FMJ keeping 60% at tier 2 is stated three times
over by people who did not copy each other.

## Derived

**Per-weapon damage.** Shots to kill is a bound, not a value. If a weapon kills a
100-health target in `s` shots at armour tier `i`, then

    ceil(100 / (d x ret_i)) = s     ->     d in [ 100/(s x ret_i), 100/((s-1) x ret_i) )

Five armour tiers give five bounds on the same unknown, and their intersection is usually
tight: four percent on an SMG, eleven on a rifle, worse on anything that one-shots. The
shipped figure is the midpoint of that interval and the interval travels with it.

**Fire rates.** Time to kill at point blank is `(shots - 1) / rate`, so the rate falls out
of any row with more than one shot in it. Good to about three percent, which is why they
are rounded to the nearest five and labelled derived rather than published.

## How a shot resolves

The whole model, in order. It lives in `tools/site/ballistics-model.js`, which the page
inlines and `test/ballistics.js` requires, so there is one copy of it rather than two that
can drift apart.

1. **The weapon.** One damage figure, at the upper torso, at point blank. Derived above.
2. **The zone.** A multiplier on that figure. A property of the body, not of the gun.
3. **The armour covering that zone.** A helmet covers the head. A vest covers the three
   torso zones. Nothing covers the neck, the pelvis, the arms or the legs.
4. **The load.** Which of the five round types you fired, and which tier it hit, decides
   what fraction survives. There is no separate penetration statistic in anything anybody
   has published: penetration *is* this retention figure.

Buckshot is eight projectiles carrying an eighth each, so a partial hit is a real thing and
the calculator lets you say how many pellets landed.

Health is 100, so shots to kill is `ceil(100 / damage)` and time to kill is the gap between
the first shot and the last, `(shots - 1) / rate`. A one-shot kill has no gap in it.

## The checks

A derivation that cannot be falsified is not worth publishing. Four things have to hold,
and `build.ps1` refuses to ship if any of them stops holding.

**Two published damage figures must land inside their derived intervals.** Both come from a
*different* table than the one the solver reads:

| | published | derived interval | |
|---|---|---|---|
| M4, upper torso, unarmoured | 30.0 | 28.57 to 31.75 | inside |
| SVD, upper torso, unarmoured | 78.33 | 74.07 to 83.33 | inside |

That is the health value, the five armour retentions and the arithmetic all agreeing with
each other from two directions.

**All 140 published shots-to-kill figures must reproduce** from the shipped damage values
run back through the armour table. It is the difference between "these values are
plausible" and "these values are the only ones the published table could have come from".

**Fire rates must reproduce the published times to kill**, within the rounding they were
derived through. Worst case is currently 3.4 percent, on the AMR 50.

**The whole pipeline must reproduce a hit-zone column it never saw.** MetaForge publishes
the M4's damage at every zone against level 2 armour. Not one of those twelve numbers is
stored in this repo: the page multiplies a solved torso figure by a zone multiplier by an
armour retention and has to land on all twelve. `test/ballistics.js` checks it, and it is
the check that would catch a bad zone multiplier, a mistyped retention or a drifted damage
figure without caring which of the three it was.

The first three run in `tools/solve-ballistics.js`, the fourth in `test/ballistics.js`.
**Never loosen one to make a number fit.**

## Nothing goes missing

The armory is a transcribed vendor catalogue and the ballistics data is derived, so the two
can fall out of step: a weapon added to the shelf would simply be absent from the ranking,
which reads to a player as a weapon that does not exist. So every weapon and every
personal-weapon load in `data/armory.json` has to be either on the chart or listed in
`unfiguredWeapons` / `unfiguredLoads` with a stated reason, and `test/ballistics.js` fails
if one is in neither. That is why the page carries a "sold, but not on the chart" table:
six weapons and seven loads that exist and cannot honestly be given a number.

## What is not solved

**What flesh damage does to flesh.** This is the biggest hole on the page and the one most
likely to mislead. Every armour figure for HP is published, and they are brutal: a level 4
vest takes 99.24 percent of it. But no source gives HP's damage against an *unarmoured*
zone, so the calculator uses the standard figure there.

That is almost certainly too low. The vendor charges $7.00 a round for .308 flesh damage
against $4.00 for standard, and a round that was strictly worse everywhere would not sell.
The page says so in three places, the number is described as a floor rather than a value,
and it stays that way until somebody shoots an unarmoured target with it and counts.

**Range falloff.** Damage drops with distance and slower rounds drop faster, which is
visible in the published tables but never separated out from everything else happening in
them. There is no honest way to fit a curve to it yet, so every figure on the site is point
blank and says so. No range slider, because a range slider that guessed would be worse than
no range slider.

**Torso zone multipliers.** Hit zones ought to be a property of the body, so the ratio
between two zones should be identical whatever is shooting. For head, neck and limbs it is:

    head / neck    M4 1.327   AK74 1.341   MP5 1.333   SVD 1.343

Four weapons, four calibres, agreement to one percent. But the torso does not behave:

    torso / neck   M4 0.612   AK74 0.616   MP5 0.714   SVD 0.760

That is a twenty percent spread and it is far too wide to be rounding on numbers this size.
Something real is going on that the published tables do not explain, and guessing at it
would quietly corrupt every non-torso figure for heavy calibres. So upper torso is exact
per weapon, because the solver gives it directly and needs no multiplier, and the other
zones carry the assault rifle profile with the caveat stated on the page.

Worth revisiting at launch. If the spread survives a real build, it is a mechanic nobody
has written up yet.

## Colour, and why it is not a matter of taste

The page runs two colour systems and they do two different jobs.

**Round type is identity.** Five fixed hues, taken from the data-viz reference palette's
dark column: FMJ yellow `#c98500`, HP magenta `#d55181`, AP blue `#3987e5`, buckshot aqua
`#199e70`, slug violet `#9085e9`. The *order* is the colourblind-safety mechanism, not a
preference. All 120 orderings of those five slots were run through
`scripts/validate_palette.js` against the `#0c0c0c` page ground and only the passing ones
kept; this one clears the lightness band, the chroma floor, 3:1 contrast, a CVD delta-E of
13.2 against a target of 8, and a normal-vision delta-E of 19.3 against a floor of 15.

Colour is never the only thing carrying the meaning. Every mark wearing a round tint also
states its round in text, and the ranking bar's *length* says the same thing its band chip
says, so the chart survives being printed in grey.

**Time to kill is state.** Four reserved status steps, green through red, each beside its
own word: fast, average, slow, very slow. Status colours are deliberately not drawn from
the categorical set, so a band can never be mistaken for a sixth load.

`test/ballistics.js` pins all nine hexes. Changing one means re-running the validator,
which is the point of pinning them.

## Sources

- [MetaForge ballistics](https://metaforge.app/wardogs/ballistics) for the ammo chart, the
  hit zone table and the shots to kill rankings the derivation reads.
- [WARDOGS Handbook](https://wardogshandbook.com/DamageCalculator) for the armour
  retention table, which corroborates the first independently.
- [wardogs.zone](https://wardogs.zone/calculators/damage) for a third statement of the same
  mechanics: level 1 armour at 30 percent reduction, helmet and vest picked separately, and
  "armour counts only on the zones it covers". It is the reason this page's figure is drawn
  with the plates hatched where they actually sit rather than described in a sentence.

All three are fan sites, like this one. None of us are BULKHEAD or Team17, and none of these
numbers are official until the developer publishes them.
