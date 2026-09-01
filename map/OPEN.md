# What is open

A catalog, like everything else in this map. It points; the detail lives with the thing it
is about. If this file and a card disagree, the card is right.

Last swept 2026-08-31, end of the session that fixed diagonal runs, group rotation, the
toolbar and Ctrl+V.

## The community loop is open, and now has something in it

Nothing queues. A submission publishes the moment it is made; three reports hide it, and
[/moderate/](https://www.wardogsbuilder.com/moderate/) is a complaints desk rather than a
queue. Ranking is score over age, tuned in `test/ranking.js` against the two complaints that
pull against each other.

**The listing deploy has run and `/designs/` reads real data.** The stranded `pending`
submissions are out: the page lists what is not hidden rather than what was once approved,
which cannot strand anything again. Checked 2026-08-31 against the live worker, which
answered with one published design. Some of the older ones are probably test submissions to
delete now they are visible.

`/designs/` also carries **your own saved designs under the community's**, with the button
that sends one up; [publish-a-design](processes/publish-a-design.md) is the whole loop.

**Tags need one worker deploy, and until it runs every new submission loses them.** The
site and the planner both ask for tags now and send them; the deployed worker was written
before they existed, builds its record field by field, and drops the field it does not know.
Nothing errors and nothing says so: a design published today comes back untagged and matches
no filter. The vocabulary, the pickers, the filter bar and the pills are all in the repo and
green, so this is the one command between them and being true.

    wrangler deploy --config "<repo>/worker/wrangler.toml"

A warning that cost an evening, now on the worker card too: `wrangler kv` reads a **local
emulated store** unless you pass `--remote`. Without it the namespace looks empty. Those
three designs were reported as "nothing ever reached storage" on the strength of a listing
that was reading nothing at all.

## Start here if you are picking artillery back up

**Measured 2026-08-31, and the first thing to fix: on a phone the map is 819 px down the
page.** At 390 px wide the tool renders nav, eleven buttons and four empty coordinate boxes
before any map appears, so the whole first screen is chrome and the thing the page exists
for is below the fold. Nothing overflows sideways and desktop is fine at 1440; this is
ordering, not breakage. The map wants to come first on a narrow screen with the coordinates
under it. Nobody has decided that yet, so it is a question, not a task.

`/artillery/` is a full-screen tool, laid out like the planner: bar, panel, canvas, status
bar, filling the viewport on arrival with the reference material below it. Bakurani and
Ozeti over real terrain imagery from
[objects/data/artillery-maps.md](objects/data/artillery-maps.md), opening framed on the
control zone because that is the only ground the match is fought over. Gun and target go
down by click or typed coordinate, the rings are the gun's reach, the towers carry the
game's own antenna glyph, and the panel says whether the zone is in range from where the
gun stands. The solution reports both SPH-2 arcs where both reach. The SPH-2 elevation tables were transcribed on 2026-08-30
from wardogs-artillery.com, the one source publishing the complete curve, and are marked
unfired. The URL fragment carries map, weapon and both points, so a solution is a link.

Seven open questions remain listed in `data/artillery.json` under `open`, each with what
would close it, and they are rendered on the page so players can see them too. Read
[objects/data/artillery-data.md](objects/data/artillery-data.md) first, then that array.
All seven now need somebody with the game open, not more research. The newest is there
because a figure came off the page rather than onto it: the grouping angle in MOA, which
one calculator published, no source could account for, and the game has no such unit for.
Ten rounds at one dial from one position, measured, replaces it with something real. The largest is that
**every firing table here is flat ground**, and the terrain is a river valley, so a shot
onto high ground falls short of what the page says. One coefficient per platform would fix
most of it. Second largest: nobody has fired a row of the transcribed SPH-2 tables.

Two more things on that page are measured rather than read, and both are one glance in game
from being settled. **The control zone radius is 500 m because three Bakurani zones and one
Ozeti zone measured 500 to 550 m off another site's rendering**, so it ships `confirmed:
false`; the 2x2 km figure the press material repeats matches nothing drawn on either map.
And **Ozeti draws four towers because four is all any source has**, against five on
Bakurani; a fifth is expected and drops straight into `data/artillery-maps.json`.
The tool itself is carded at [objects/site/artillery-map.md](objects/site/artillery-map.md),
which is worth reading before touching its client script.

The designed next step, blocked until the plan-cell-to-metre scale is confirmed: place a
plan's footprint on the artillery map, so a design's own mortar gets its reach drawn over
real terrain. That is the join between the planner and this page, and it is one confirmed
number away.

## Ballistics runs on measurements now, and three things are open

`/ballistics/` is the damage calculator and the ranking on one page: pick a weapon, a load,
a helmet tier, a vest tier and a hit zone on a clickable figure, and every weapon re-sorts
underneath to match. The URL fragment carries the setup, so a comparison is a link. It reads
`data/damage.json`, pulled from the owner's sheet by `tools/pull-damage-sheet.js`. Read
[game-icons](objects/data/game-icons.md)'s sibling card and `map/CHANGES.md` for why it
stopped being derived.

**The flesh damage hole is closed.** It used to be the largest wrong number on the site: HP
against a bare zone was published nowhere, so the page used the standard figure and called
it a floor. It is measured now. Nothing else on the page is a stand-in.

Three things are genuinely open:

- **25 cells in the sheet contradict the sheet's own scaling table**, listed in
  `data/damage.json` under `sheetDisagrees` and printed by the pull tool. They are `45acp
  AP` from a pistol at tiers 3 and 4, whose armoured rows were worked out from a base 1.22
  times what the bare row now says; `50cal FMJ` from a sniper at tiers 1 and 3, which used
  the AP scalings; and one stray `45acp FMJ` leg cell. Armoured damage is computed rather
  than imported, so the site is not wrong, but the sheet is inconsistent with itself and
  only the owner can say which side is right. Fix them there and re-run the tool.
- **The Scout Rifle TD has no damage.** It is a marksman rifle in 5.56 and that tab was
  tested in 7.62 and .308 only. One pass with it closes the last gap in the 28.
- **The armory's item panel still shows the old solved torso figure.** `/ballistics/` moved
  to measurements and the panel did not, so the two can disagree about the same gun. It
  reads `torso` off `data/ballistics.json`; the measured figure lives per class and per zone
  in `data/damage.json` and there is no single "torso damage" to swap in, which is why this
  was left rather than guessed at.

`tools/solve-ballistics.js` still runs and still has to reproduce its published source, but
nothing on the page reads what it solves any more except rate of fire, velocity and mass.
Retiring it is a decision, not a chore: it is the only thing still checking those tables.

Six weapons and seven loads are on the vendor shelf with no damage figure and are listed on
the page as gaps rather than dropped. `test/ballistics.js` fails if a new one appears in
the armory and is neither ranked nor excused.

## Waiting on Early Access, 10 September 2026

Everything below is a number read off a closed beta. It all wants re-checking that week, and
the tools exist so that it is a data job rather than a rebuild.

| Area | What changes | Where |
|---|---|---|
| ballistics | three holes, all listed on the page: what flesh damage does to bare flesh, range falloff, and the torso zone multiplier | `docs/ballistics-sources.md`, [derived-data](objects/data/derived-data.md) |
| armory | 38 of 331 items have no confirmed price | `tools/build-armory.js` |
| artillery | the contested mortar range settles with one shot | `data/artillery.json` |
| buildables | costs and sizes marked `costConfirmed: false` / `sizeConfirmed: false` | `data/buildables.json` |
| the planner | `buildRadiusUnits` is 200 as of 2026-08-31 and still `radiusConfirmed: false`. It was raised from 100 as a better estimate, not a reading: nobody has stood at the edge of a zone and counted. It is what blocks range rings on the plan | `data/buildables.json` |
| ongoing supplies | how much Ammo, Fuel or Mechanical a single reload draws is not published anywhere, so the planner counts the emplacements that will keep drawing and states no figure. One reload of a mortar, watched, closes it | `data/buildables.json` `mechanics.supplies`, and the Ongoing Supplies panel |

## Needs a decision, not a discovery

- **Ko-fi handle.** `support.url` in `data/buildables.json` is unset, so the tip button does
  not render. It needs an account name, which is not something to guess at.
- **The planner ad needs a slot id before it ships.** Everything else for it is built and
  checked: `data/ads.json` has a `planner` slot, `build.ps1` injects it into the hosted
  planner only, and the downloadable file is asserted clean three ways. The slot is empty,
  so nothing is emitted. Create a display unit in AdSense, put its id there, rebuild.
- **Whether three ad units is the right number.** AdSense went live 2026-08-30: a responsive
  leaderboard above the footer sitewide, a fluid in-article unit on Damage, Armory and
  Buildables only, and one at the foot of the planner's right panel. Most pages carry one.
  That was chosen to keep the site usable rather than to maximise revenue, and it is worth
  revisiting once there is a month of real earnings to weigh it against.

  Two things were deliberately not done, and are worth not re-deciding by accident. Nothing
  goes against the bottom edge of the map: it is a click-and-drag surface, and an ad on its
  edge is both worse to use and the placement Google treats as inviting accidental clicks,
  which on a young account is an account risk rather than a design opinion. And the
  downloadable planner carries nothing, which is not a preference but the whole promise of
  the file.

  Adding a slot is not one step. A content-page slot needs an id in `data/ads.json` *and* an
  entry in `AD_FORMATS` in `tools/site/context.js`; the planner's is injected by `build.ps1`
  instead and ignores that table. A slot with an id and no placement fails the build rather
  than failing silently.

## Known and deliberately not fixed

- **A piece rotated off ninety degrees can still sort wrong against a close neighbour in the
  3D view.** Much smaller than it was: the draw order is worked out as a graph now rather
  than sorted by how far the middle of each piece is from the camera, which was drawing short
  pieces over long ones and was reported as a wall not carrying on through. What is left is
  that a turned piece is compared by the box around it, the same approximation this view
  makes everywhere. A wrong-looking edge, not a crash, and written up in
  `docs/3d-view-design.md` rather than left in anyone's head.
- **No range rings on the plan.** Blocked on the cell-to-metre scale above. The rings
  themselves live on `/artillery/`, where coordinates are the game's own and a metre is a
  metre; the plan joins them the day the scale is confirmed.
- **No CI.** `build.ps1` runs on the machine you are sitting at, and `docs/` is committed
  output, so a push ships whatever was last built. See [deploy](processes/deploy.md).
