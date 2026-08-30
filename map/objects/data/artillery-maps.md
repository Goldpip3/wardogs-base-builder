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
  `spawns[]` as labelled polygons
- Bakurani's `bounds` and `grid.playableX/Y` in `data/artillery.json` are the same numbers
  by design; `test/artillery.js` keeps every position inside its own bounds

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

## See

- Source: `data/artillery-maps.json`
- Renderer: `tools/site/artillery-map.js`
