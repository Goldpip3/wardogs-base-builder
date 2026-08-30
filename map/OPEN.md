# What is open

A catalog, like everything else in this map. It points; the detail lives with the thing it
is about. If this file and a card disagree, the card is right.

Last swept 2026-08-30.

## Start here if you are picking artillery back up

`/artillery/` is now an interactive map calculator: Bakurani and Ozeti over real terrain
imagery from [objects/data/artillery-maps.md](objects/data/artillery-maps.md), gun and
target placed by click or typed coordinate, range rings for the reach, and a solution that
reports both SPH-2 arcs where both reach. The SPH-2 elevation tables were transcribed on 2026-08-30
from wardogs-artillery.com, the one source publishing the complete curve, and are marked
unfired. The URL fragment carries map, weapon and both points, so a solution is a link.

Six open questions remain listed in `data/artillery.json` under `open`, each with what
would close it, and they are rendered on the page so players can see them too. Read
[objects/data/artillery-data.md](objects/data/artillery-data.md) first, then that array.
All six now need somebody with the game open, not more research. The largest is that
**every firing table here is flat ground**, and the terrain is a river valley, so a shot
onto high ground falls short of what the page says. One coefficient per platform would fix
most of it. Second largest: nobody has fired a row of the transcribed SPH-2 tables.

The designed next step, blocked until the plan-cell-to-metre scale is confirmed: place a
plan's footprint on the artillery map, so a design's own mortar gets its reach drawn over
real terrain. That is the join between the planner and this page, and it is one confirmed
number away.

## Ballistics is now a calculator, and it has one hole worth closing

`/ballistics/` is the damage calculator and the ranking on one page: pick a weapon, a load,
a helmet tier, a vest tier and a hit zone on a clickable figure, and every weapon in the
game re-sorts underneath to match. The URL fragment carries the setup, so a comparison is a
link. Read [derived-data](objects/data/derived-data.md), then `docs/ballistics-sources.md`.

**The one thing to close with the game open: what flesh damage does to an unarmoured zone.**
Every armour figure for HP is published and used. Its bare-flesh damage is published
nowhere, so the page uses the standard figure and calls it a floor in three places. The
vendor charges $7.00 a round for .308 HP against $4.00 for standard, so the real number is
higher and nobody knows by how much. One magazine into an unarmoured target, counting hits,
closes it. It is the largest wrong number on the site and it is wrong in a knowable
direction.

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
| the planner | `buildRadiusUnits: 100` is `radiusConfirmed: false`, which is what blocks range rings on the plan | `data/buildables.json` |

## Needs a decision, not a discovery

- **Ko-fi handle.** `support.url` in `data/buildables.json` is unset, so the tip button does
  not render. It needs an account name, which is not something to guess at.
- **AdSense review.** Submitted; outcome pending. `data/ads.json` carries the publisher id
  and nothing ships until it is filled in, so there is nothing to do but wait.

## Known and deliberately not fixed

- **A piece rotated off ninety degrees can sort wrong against a neighbour in the 3D view.**
  A wrong-looking edge, not a crash. Written up in `docs/3d-view-design.md` rather than left
  in anyone's head. Fixing it properly means a BSP tree, which is not worth it.
- **No range rings on the plan.** Blocked on the cell-to-metre scale above. The rings
  themselves live on `/artillery/`, where coordinates are the game's own and a metre is a
  metre; the plan joins them the day the scale is confirmed.
- **No CI.** `build.ps1` runs on the machine you are sitting at, and `docs/` is committed
  output, so a push ships whatever was last built. See [deploy](processes/deploy.md).
