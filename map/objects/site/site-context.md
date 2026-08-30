---
type: object
cluster: site
universe: live
status: verified 2026-08-30
entity: tools/site/context.js
---

# Site context

The shared layer every page module is handed. Data, helpers, `write()`, and the wiring that
has to exist before any page can be written. Built once, passed to each page in turn.

## Why this shape

`tools/build-site.js` used to be 2,181 lines holding every page, the stylesheet, the shell
and all the client-side JavaScript. Adding a page meant scrolling through all of it. It is
now a 37-line running order; this file is what it hands round.

The split was proved safe by diffing the whole of `docs/` against a snapshot before and
after: byte-identical. Worth knowing if you split it further.

**Adding a page should not mean touching this file.** Adding a new *kind* of shared thing,
such as another data source, is what it is for.

## Shape

- data: `catalog`, `byId`, `COMMUNITY`, `BALLISTICS`, `ARMORY`, `DESIGNS`
- helpers: `esc`, `stats`, `encodeDesign`, `decodeShared`, `designCard`, `withStats`, `ranked`
- emit: `write(rel, html)`, `page({...})`, `sweepDesignPages()`
- config: `SITE`, `VOTE_API`, `adsOn`, `adScript`, `adSlot`
- composed from `./css`, `./shell`, `./client-scripts`

Citations: built at `tools/build-site.js:14`, handed to each page at `:27`.

## Connected to

- **owns:** the context object, and therefore what any page is allowed to reach
- **owned-by:** [buildables-catalog](../data/buildables-catalog.md),
  [derived-data](../data/derived-data.md), [build-config](../data/build-config.md)
- **joins:** [page-module](page-module.md)
- **looks-like-but-is-not:** `tools/site/shell.js`, which is only the HTML skeleton, and
  `tools/site/css.js`, which is only the stylesheet. Both are composed *into* this.

## If you change this

- **Hits:** every page, because every page is handed this object. `tools/site/shell.js`
  reads it too, so a rename here can silently blank part of the header.
- **Does not hit:** the planner. It shares the catalog and the design language but no code,
  and it has its own copy of the share encoder. Changing a helper here changes nothing a
  player downloads.

## Surfaces

| Surface | Role |
|---|---|
| `tools/build-site.js` | builds it once |
| `tools/site/pages/*.js` | read it, all ten |

## See

- Source: `tools/site/context.js`
