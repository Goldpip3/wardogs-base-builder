# What is open

A catalog, like everything else in this map. It points; the detail lives with the thing it
is about. If this file and a card disagree, the card is right.

Last swept 2026-08-30.

## Start here if you are picking artillery back up

`/artillery/` is now an interactive map calculator: Bakurani and Ozeti drawn as vector maps
from [objects/data/artillery-maps.md](objects/data/artillery-maps.md), gun and target
placed by click or typed coordinate, range rings for the reach, and a solution that reports
both SPH-2 arcs where both reach. The SPH-2 elevation tables were transcribed on 2026-08-30
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

## Waiting on Early Access, 10 September 2026

Everything below is a number read off a closed beta. It all wants re-checking that week, and
the tools exist so that it is a data job rather than a rebuild.

| Area | What changes | Where |
|---|---|---|
| ballistics | range falloff and the torso zone multiplier are unsolved and documented as such | `docs/ballistics-sources.md`, [derived-data](objects/data/derived-data.md) |
| armory | 38 of 331 items have no confirmed price | `tools/build-armory.js` |
| artillery | the contested mortar range settles with one shot | `data/artillery.json` |
| buildables | costs and sizes marked `costConfirmed: false` / `sizeConfirmed: false` | `data/buildables.json` |
| the planner | `buildRadiusUnits: 100` is `radiusConfirmed: false`, which is what blocks range rings on the plan | `data/buildables.json` |

## The artillery map has no terrain under it, and that is a sourcing decision

The map draws bounds, towers and spawn zones, which is not enough to locate yourself. The
tile renderer that fixes it **is written, proven and dormant**: add a `tiles` block to a map
in `data/artillery-maps.json` and imagery appears under the vectors with no other change.
See [objects/data/artillery-maps.md](objects/data/artillery-maps.md) for the shape.

What is missing is imagery this project may publish, and the nearest pyramid is the wrong
one. wardogs-artillery.com is MIT for its code only; its own `docs/legal.md` carves out
"WARDOGS game assets, map imagery, icons, textures" as not covered and not theirs to pass
on. It is also 2.2 GB. Two routes work: capture the map in game and tile it, or ask that
maintainer, who is reachable on Discord and already partners with wardogshub. Keep any
pyramid to `maxZoom` 5, about 30 MB, because `docs/` is committed to git.

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
