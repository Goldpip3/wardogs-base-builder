---
type: object
cluster: planner
universe: live
status: verified 2026-08-30
entity: src/app-template.html
---

# Planner app

The tool itself: one HTML file, no framework, no dependency. Called "the planner", "the
app" or "the builder" in conversation; `src/app-template.html` on disk. **It is a template,
not the thing that ships.** Two different files are built from it.

## Why this shape

The offline promise is the product. A file you can download and open with no network is only
worth something if it really has no network, so the API endpoint is *injected at build time*
rather than compiled in, and the downloadable copy gets an empty string.

| Built file | API | Can save online | Ads |
|---|---|---|---|
| `WardogsBaseBuilder.html` | `""` | no | never |
| `docs/planner/index.html` | the worker origin | yes | never |

Same source. One injected string apart. That is exactly the sort of difference that breaks
quietly, so three checks in `tools/check-build.js` hold it: the offline copy has no API
configured, it therefore cannot reach the network, and the hosted copy does have one.

## Shape

- `/*__CATALOG__*/` at `src/app-template.html:477`: the whole buildables catalog, inlined
- `/*__API__*/` at `:490` and `/*__BUILD__*/` at `:491`: injected per build
- `/*__ICONS__*/`, `/*__FONTS__*/`: base64 art and woff2, inlined so nothing is fetched
- `drawNow` at `:1007` branches to the 3D view; `drawRect` at `:1157` draws one piece
- `computeClimb` at `:1619` classifies what can be vaulted or driven over, over a reachable
  set from `reachableFromOutside` at `:1525`: the ground is rasterised at half a cell and the
  outside flooded in, so a wall sealed behind the perimeter is not a way in. `climbRuns`
  groups what is left, because one wall is one weak point however many blocks long
- `computeSeams` at `:1670` decides which touching pieces draw as one wall, and which stay
  distinct. `seamFamily` is the rule: anything tagged `wall` merges with any other wall of
  its role, so a quad and a wedged block are one body. The same-type mask it also returns
  is what the name and the height badge key off, so an odd piece mid-run still speaks

Citations: substitution at `build.ps1:34`, outputs at `build.ps1:52` and `:60`.

## Connected to

- **owns:** everything a player interacts with
- **owned-by:** [buildables-catalog](../data/buildables-catalog.md), inlined into it
- **joins:** [share-code](share-code.md), [build-config](../data/build-config.md)
- **looks-like-but-is-not:** `docs/planner/index.html` and `src/artifact.html`. Both are
  **output**. Editing either is work you lose on the next build.

## If you change this

- **Hits:** both built planners; `test/planner.js`, `test/planner-tools.js`,
  `test/elevation.js`, `test/issues.js` and `test/share-links.js`, all of which lift real
  functions out of the *built* file, so they only see a change after a rebuild.
- **Does not hit:** the site pages. They share the design language and the catalog but no
  code. Changing the planner never changes `/buildables/`.

## Surfaces

| Surface | Role |
|---|---|
| players | read, in a browser |
| `build.ps1` | reads the template, writes two builds |
| `test/*.js` | read the built file |

## See

- Source: `src/app-template.html`
- Why the plan is flat and the 3D view exists: `docs/3d-view-design.md`
