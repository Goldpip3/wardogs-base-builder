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

Both maps ship it, under `docs/maps/tiles/<id>/`. 1,365 tiles each, zoom 0 to 5, 32 MB for
the pair. That is 8192 px across the 16.384 km terrain, so 2 m per pixel: roads, field
parcels, the river and building footprints all read, which is what somebody needs to place
themselves. Deeper zooms exist upstream and are not worth the bytes; past `maxZoom` the
renderer scales the deepest tile rather than fetching more.

```
"tiles": { "path": "/maps/tiles/bakurani", "tileSize": 256,
           "minZoom": 0, "maxZoom": 5, "extension": "webp",
           "bounds": { "minX": -0.03, "maxX": 163.81,
                       "minY": -0.01, "maxY": 163.83 } }
```

Zoom Z is a `2^Z` square of tiles spanning `bounds`, row 0 at the north edge, named
`zoom_<z>/<x>_<y>.<extension>`. **`bounds` is the calibration box and is not the map
extent**: the capture landed a few metres off the round number, and assuming `0..extent`
puts the whole layer slightly askew. The renderer picks the zoom whose tile lands nearest
`tileSize` on screen, so it neither blurs nor fetches detail nobody can see.

The imagery is the game's own, on the same fan-use footing as the icons this project
already ships, and re-encoded to lossy webp at quality 82, roughly a quarter of the
lossless original with no visible loss at map scale. We host our own copy at our own depth
rather than hotlinking anyone's server.

Calibration was verified rather than assumed: the tile and pixel a tower's coordinate
lands on were computed directly and the imagery cropped there, and Towers 1 and 4 each sit
on a distinct structure. `test/artillery.js` fails the build on a `tiles` block that is
incomplete or points at a pyramid missing from `docs/`, because a tiled map that quietly
lost its imagery looks exactly like a map that never had any.

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
