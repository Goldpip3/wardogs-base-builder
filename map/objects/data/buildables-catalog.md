---
type: object
cluster: data
universe: live
status: verified 2026-08-30
entity: data/buildables.json
---

# Buildables catalog

Product word "buildables": the 20 in-game structures you can place. Nothing to do with
`tools/build-site.js` or `tools/build-armory.js`, which are generators.

## Why this shape

One home for every number, because the alternative was tried and failed three times. A cost
or a pallet size written into markup as well as the catalog will drift, and it did, silently,
until a check was added that fails the build when the markup carries a figure the catalog
does not agree with (`tools/check-build.js`, "supply figures come from the catalog").

The catalog is **inlined whole** into the planner at build time, which is why anything put
in it travels inside the file people download. That is the reason the AdSense publisher id
lives in a separate file and not here. See [build-config](build-config.md).

## Shape

- `buildables[]`: id, name, cost in Build Supplies, `footprint {w,d}`, `height`, `tier`,
  `role`, `tags`, `icon`
- `fob`: footprint, height, `startingSupplies` (1750)
- `logistics`: `suppliesPerPallet` (1800), `palletCash` (400)
- `tags` drive the rules: `ground-only`, `no-stack`, `top-layer`, `needs-sky`, `overlay`

Citations: `data/buildables.json`, inlined at `build.ps1:34`, landing at
`src/app-template.html:477`.

## Connected to

- **owns:** every cost, size and stacking rule in the planner and on the site
- **owned-by:** nothing; this is a root fact
- **joins:** [planner-app](../planner/planner-app.md), [site-context](../site/site-context.md)
- **looks-like-but-is-not:** [derived-data](derived-data.md), which is generated and must
  never be hand-edited. This one is hand-edited and must never be generated.

## If you change this

- **Hits:** both planner builds (the figure is inlined, so a stale browser tab keeps the old
  one until the update chip fires); `/buildables/`, which computes from it;
  `tools/check-build.js`, which asserts the pallet and FOB figures appear inline;
  `test/issues.js`, which replays the rules against randomised designs.
- **Does not hit:** `data/armory.json`. Vendor cash prices and Build Supply costs are
  different economies and share no code. Adding a buildable does not add an armory item.

## Surfaces

| Surface | Role |
|---|---|
| `build.ps1` | reads, inlines into both planner builds |
| `tools/site/context.js` | reads, for costs on site pages |
| a human with the game open | writes |

## See

- Source: `data/buildables.json`
