---
type: object
cluster: data
universe: live
status: verified 2026-08-31
entity: data/game-icons.json
---

# Game icons

`data/game-icons.json` (565 wiki items) and the PNGs under `docs/game-icons/`. The catalog
records what the wardogs.zone fan wiki serves at `/game/icons/<slug>.png`; the files are
those icons, fetched once and committed. Both come from `tools/pull-game-icons.js`, manual
like `pull-community.js` and never part of the build, which stays offline.

## Why this shape

`docs/game-icons/` is committed directly, the same single-copy pattern as the map tiles,
because `docs/` is itself committed and an `assets/` staging copy would store every PNG
twice. Nothing sweeps it; only `docs/designs/` is ever deleted by the generator.

Items join by slug: `tools/build-armory.js` matches wiki names to armory names and takes
hand-kept `ICON_OVERRIDES` for the rest. An override to `null` is an honest gap, the wiki
having no icon nameable as that item without guessing (most mounted guns).

## Shape

- `items[]`: `slug`, `name`, `cat` (weapons, ammo, equipment, attachments, vehicles) and
  `hasIcon`. 565 items, 495 with a file, 70 the wiki serves no icon for
- `docs/game-icons/<slug>.png`, 25 MB for the set
- In `data/armory.json`, a matched item carries `icon` naming the slug. 323 of 331 do

## Refresh

`pull-game-icons.js --refresh`, then `build-armory.js`, then `build.ps1`. The catalog only
adds or updates; removing an icon is done by hand, entry and file together.

## Connected to

- **feeds:** [derived-data](derived-data.md), which owns `data/armory.json` and the
  `ICON_OVERRIDES` map that joins items to slugs

## If you change this

- **Hits:** `/loadouts/`, an icon per slot. Check 3e in `tools/check-build.js` fails on a
  slug with no file, a page reference with no file, a file outside the catalog, or a
  catalog entry claiming a file that is absent.
- **Does not hit:** the planner, which must never name one. That is in 3e too: a planner
  fetching an image is a planner that is no longer offline.

## Surfaces

| Surface | Role |
|---|---|
| `tools/pull-game-icons.js` | fetches, catalogs |
| `tools/build-armory.js` | joins items to slugs |
| `tools/site/pages/armory.js` | renders |

## See

- Catalog `data/game-icons.json`, files `docs/game-icons/`
- Source: the wardogs.zone wiki, `/game/icons/<slug>.png`
