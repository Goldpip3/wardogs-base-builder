# What is open

A catalog, like everything else in this map. It points; the detail lives with the thing it
is about. If this file and a card disagree, the card is right.

Last swept 2026-08-30.

## Start here if you are picking artillery back up

`/artillery/` shipped with a working firing solution for the L81 Mortar and a deliberate gap
where the SPH-2's elevation table would be. Six open questions are listed in
`data/artillery.json` under `open`, each with what would close it, and they are rendered on
the page so players can see them too. Read [objects/data/artillery-data.md](objects/data/artillery-data.md)
first, then that array.

Five of the six need somebody with the game open, not more research. The largest is not the
missing table: it is that **every firing table here is flat ground**, and the terrain is a
river valley, so a shot onto high ground falls short of what the page says. One coefficient
per platform would fix most of it.

The one that needs no game at all: the SPH-2 low arc and high arc cross at 1181 m, and the
page currently reports a single solution per range. Once a table exists it should report
both arcs where both reach.

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

## Needs a decision, not a discovery

- **Ko-fi handle.** `support.url` in `data/buildables.json` is unset, so the tip button does
  not render. It needs an account name, which is not something to guess at.
- **AdSense review.** Submitted; outcome pending. `data/ads.json` carries the publisher id
  and nothing ships until it is filled in, so there is nothing to do but wait.

## Known and deliberately not fixed

- **A piece rotated off ninety degrees can sort wrong against a neighbour in the 3D view.**
  A wrong-looking edge, not a crash. Written up in `docs/3d-view-design.md` rather than left
  in anyone's head. Fixing it properly means a BSP tree, which is not worth it.
- **No range rings on the plan.** Blocked on the cell-to-metre scale above. The useful part
  of that feature, that the mortar cannot reach inside its own build zone, is stated in
  words on `/artillery/` instead.
- **No CI.** `build.ps1` runs on the machine you are sitting at, and `docs/` is committed
  output, so a push ships whatever was last built. See [deploy](processes/deploy.md).
