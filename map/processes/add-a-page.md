---
type: process
status: verified 2026-08-30
consumes: [site-context]
produces: [page-module]
---

# add-a-page

Three edits. Two of them are one line each.

## Input → Movement → Output

Write a module that takes the context and calls `write()`. Name it in the running order. Add
its URL to the sitemap. Out comes a page under `docs/`, indexed, checked and linked.

## Why this shape

The sitemap step feels redundant and is not. It was a hand-kept list sitting next to a
generator that already knew every page it wrote, and it had **already gone stale** on the
ballistics page: the page shipped, worked, and was invisible to search. A check now compares
the sitemap against what actually landed in `docs/`, so forgetting is a build failure rather
than a silent loss six months long.

## Steps

1. `tools/site/pages/<name>.js`, exporting `ctx => { ... }`. Start from an existing one;
   `legal.js` is the simplest. Keep the body at column zero (`page-module` card explains why).
2. Add `"<name>"` to the array in `tools/build-site.js:16`. Order matters only if your page
   reads something an earlier page put on `ctx`.
3. Add the URL to the list in `tools/site/pages/sitemap.js`.
4. `powershell -File build.ps1`.

Add a nav link in `tools/site/shell.js` only if the page is for players rather than for you.
`/account/` and `/moderate/` are `noindex` and deliberately unlinked.

## If you change this

- **Hits:** the sitemap, the footer if you add a link, and an inline-script parse check that
  now covers your page.
- **Does not hit:** the planner or the worker.

## Surfaces

| Surface | Role |
|---|---|
| whoever is adding the feature | writes |

## See

- Objects: [page-module](../objects/site/page-module.md), [site-context](../objects/site/site-context.md)
- Source: `tools/build-site.js`, `tools/site/pages/`
