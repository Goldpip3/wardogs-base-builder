---
type: object
cluster: data
universe: live
status: verified 2026-08-30
entity: data/artillery-maps.json
---

# Artillery maps

`data/artillery-maps.json`: Bakurani and Ozeti as positions in the game's own X/Y. Playable
bounds, the capture towers, and the three faction spawn zones, per map.

## Why this shape

The artillery page draws a map to click on, and this file is everything it draws. Positions
only, no imagery: other community calculators render captured terrain tiles, and those are
their assets and the game's, so this project draws a vector map from measured coordinates
instead. A position is a fact; a rendered tile is somebody's work.

Everything here is transcribed from wardogs-artillery.com, which calibrated its maps against
in-game coordinates, and the file says so. Their positions are stored in metres; this file
stores game units, metres divided by 100, so the page never converts.

## Shape

- `maps[]`: `id`, `name`, `extentUnits`, `bounds` (the playable rectangle), `towers[]`,
  `spawns[]` as labelled polygons, and an optional `tiles`
- Bakurani's `bounds` and `grid.playableX/Y` in `data/artillery.json` are the same numbers
  by design; `test/artillery.js` keeps every position inside its own bounds

## Terrain imagery

The renderer for it is written, proven and dormant. No map carries a `tiles` block, so
every map draws as vectors; add the block and imagery appears underneath them with no
other change. `test/artillery.js` fails the build on a block that is incomplete or points
at a pyramid that is not in `docs/`, because a tiled map that quietly lost its imagery
looks exactly like a map that never had any.

```
"tiles": { "path": "/maps/tiles/bakurani", "tileSize": 256,
           "minZoom": 0, "maxZoom": 5, "extension": "webp" }
```

Zoom Z is a `2^Z` square of tiles spanning the whole `extentUnits`, row 0 at the north
edge, named `zoom_<z>/<x>_<y>.<extension>` under `docs/`. The renderer picks the zoom whose
tile lands nearest `tileSize` on screen, so it neither blurs nor fetches detail nobody can
see, and it was verified against a synthetic pyramid for orientation and zoom escalation.

**Where the imagery may come from is the open part, and it is not a code question.**
The obvious pyramid to copy is the wrong one: wardogs-artillery.com is MIT for its *code*
only, and `docs/legal.md` there carves the map imagery out explicitly, since it is
BULKHEAD's and not that project's to pass on. Copying it would also be 2.2 GB and a
maintainer's bandwidth. Two routes that do work: capture the map in game and tile it, which
makes the imagery ours; or ask that maintainer directly, which is a Discord message and
costs nothing. Whichever lands, keep the pyramid shallow: `maxZoom` 5 is 8192 px across and
about 30 MB, and `docs/` is committed to git.

## Connected to

- **joins:** [artillery-data](artillery-data.md), which owns the platforms whose reach is
  drawn over these maps

## If you change this

- **Hits:** `/artillery/` only, via `tools/site/artillery-map.js`. `test/artillery.js`
  checks every tower and spawn corner sits inside its map's bounds.
- **Does not hit:** the planner. Plan cells have no confirmed metre scale, which is why the
  rings live here and not there.

## Surfaces

| Surface | Role |
|---|---|
| `tools/site/artillery-map.js` | reads, draws |
| `test/artillery.js` | checks |
| a human with wardogs-artillery.com open | writes |
| a human with the game open, or a maintainer's permission | supplies the imagery |

## See

- Source: `data/artillery-maps.json`
- Renderer: `tools/site/artillery-map.js`
