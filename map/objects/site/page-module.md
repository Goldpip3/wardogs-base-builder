---
type: object
cluster: site
universe: live
status: verified 2026-08-30
entity: tools/site/pages
---

# Page module

One file per page, ten of them. Each exports `ctx => { ... }` and writes its own output.
This is where a feature lives.

## Why this shape

So that adding a page is adding a file. The running order in `tools/build-site.js` is the
only shared thing you touch, and it is a list of names.

Module bodies sit at **column zero**, which looks wrong and is deliberate. Indenting them
to match the surrounding function would add whitespace inside the template literals, and
that whitespace is page content. The first attempt at the split did exactly this and the
output stopped being byte-identical.

Client-side JavaScript written in these modules crosses two or three layers of quoting on
the way out, and an escape has been eaten on that route twice. Change the quoting so no
escape is needed rather than counting layers: a single-quoted HTML attribute inside a
double-quoted JS string, or build DOM nodes instead of `innerHTML`.

## Shape

- `module.exports = ctx => { const { esc, write, page } = ctx; ... write("slug/index.html", page({...})) }`
- ten modules: home, buildables, designs, guides, ballistics, holding, armory, community,
  sitemap, legal
- `holding.js` is where a page waits while its data does not exist yet

Citations: dispatched at `tools/build-site.js:28`; URL list at `tools/site/pages/sitemap.js`.

## Connected to

- **owns:** every file under `docs/` except the planner
- **owned-by:** [site-context](site-context.md)
- **joins:** [derived-data](../data/derived-data.md), [verification](../guards/verification.md)
- **looks-like-but-is-not:** `docs/<slug>/index.html`, which is the output. Never edit it.

## If you change this

- **Hits:** to add a page you must also add its URL in `tools/site/pages/sitemap.js`, or it
  ships and is never indexed. `tools/check-build.js` fails the build if you forget, which is
  the only reason that is a nuisance rather than a silent loss. Adding a page also adds an
  inline-script parse check over it.
- **Does not hit:** the planner, the worker, or any data file. A page is a reader.

## Surfaces

| Surface | Role |
|---|---|
| `tools/build-site.js` | calls each, in order |
| `test/site.js` | reads the output |

## See

- Source: `tools/site/pages/`, running order at `tools/build-site.js`
- How to add one: [../../processes/add-a-page.md](../../processes/add-a-page.md)
