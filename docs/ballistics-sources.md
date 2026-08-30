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

## The two checks

A derivation that cannot be falsified is not worth publishing. Two exact damage figures
exist in a *different* published table from the one the solver reads:

| | published | derived interval | |
|---|---|---|---|
| M4, upper torso, unarmoured | 30.0 | 28.57 to 31.75 | inside |
| SVD, upper torso, unarmoured | 78.33 | 74.07 to 83.33 | inside |

Both land inside. That is the health value, the five armour retentions and the arithmetic
all agreeing with each other from two directions. If either had missed, none of this would
be on the site.

`tools/solve-ballistics.js` runs the derivation and exits non-zero if a check fails.

## What is not solved

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

## Sources

- [MetaForge ballistics](https://metaforge.app/wardogs/ballistics) for the ammo chart, the
  hit zone table and the shots to kill rankings the derivation reads.
- [WARDOGS Handbook](https://wardogshandbook.com/DamageCalculator) for the armour
  retention table, which corroborates the first independently.

Both are fan sites, like this one. None of us are BULKHEAD or Team17, and none of these
numbers are official until the developer publishes them.
