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

Both maps ship it, under `docs/maps/tiles/<id>/`. 5,461 tiles each, zoom 0 to 6, 107 MB for
the pair. That is 16,384 px across the 16.384 km terrain, so **one metre per pixel**: roads,
field parcels, the river and individual building footprints all read, which is what somebody
needs to place a gun on a specific building. Zoom 7 exists upstream at half a metre and is
not worth another 100 MB a map; past `maxZoom` the renderer scales the deepest tile rather
than fetching more.

```
"tiles": { "path": "/maps/tiles/bakurani", "tileSize": 256,
           "minZoom": 0, "maxZoom": 6, "extension": "webp",
           "bounds": { "minX": -0.03, "maxX": 163.81,
                       "minY": -0.01, "maxY": 163.83 } }
```

Zoom Z is a `2^Z` square of tiles spanning `bounds`, row 0 at the north edge, named
`zoom_<z>/<x>_<y>.<extension>`. **`bounds` is the calibration box and is not the map
extent**: the capture landed a few metres off the round number, and assuming `0..extent`
puts the whole layer slightly askew.

**The level is chosen in device pixels, not CSS pixels.** It shipped once in CSS pixels and
every 2x display drew the map at half resolution, which is most laptops; the level also
rounds up rather than to nearest, since rounding down hands back fewer pixels than are being
drawn. Both together are the difference between crisp and soft, and neither is visible on a
1x monitor, which is why it survived a review.

The imagery is the game's own, on the same fan-use footing as the icons this project
already ships, and re-encoded to lossy webp at quality 82, roughly a quarter of the
lossless original with no visible loss at map scale. We host our own copy at our own depth
rather than hotlinking anyone's server.

Calibration was verified rather than assumed: the tile and pixel a tower's coordinate
lands on were computed directly and the imagery cropped there, and Towers 1 and 4 each sit
on a distinct structure. `test/artillery.js` fails the build on a `tiles` block that is
incomplete or points at a pyramid missing from `docs/`, because a tiled map that quietly
lost its imagery looks exactly like a map that never had any.

## The control zone

The ring the match is fought inside, and the reason the page opens framed on it rather than
on the whole terrain. Each map carries a `controlZone` with a centre and `radiusMetres`, and
the towers are the objectives inside it.

Neither figure was read out of the game. Both were measured off metaforge.app, which draws
the real zones, by pixel against tower coordinates whose game X/Y are already known here.
Three Bakurani zones measured 500, 515 and 512 m and Ozeti about 550, so **500 m** is the
figure and `confirmed` is `false` until somebody reads it in game.

Two things worth knowing before touching it:

- **It is not the map centre.** It sits on the tower cluster: Bakurani (79.9, 71.8), Ozeti
  (100.1, 63.5). Centring it on the playable middle puts it a few hundred metres off.
- **Press material says the control zone is 2x2 km.** That does not match anything drawn on
  either map, so it is not used. Several sites repeat the figure; all of them trace back to
  the same Steam copy.

There is more than one zone per map (Bakurani has Default, Farmland and Lumberyard; Ozeti
adds Church and River). Only the one holding the towers is drawn, which is what a player
means by the control zone. Ozeti ships four towers because four is all any source has;
a fifth is expected and will drop straight in.

`test/artillery.js` pins the relationship rather than the numbers: every tower has to sit
inside its own map's zone. A zone that drifts off its towers still draws a convincing circle
in the wrong place, which is exactly the failure that would otherwise ship unnoticed.

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
