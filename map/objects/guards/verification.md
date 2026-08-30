---
type: object
cluster: guards
universe: live
status: verified 2026-08-30
entity: tools/check-build.js
---

# Verification

Two layers, catching different things, both run by `build.ps1` and both able to fail it.

## Why this shape

Every check here exists because a bug shipped. That is the rule for adding one, and it is
why the list looks arbitrary until you read the comment above each.

**They ask different questions.** `tools/check-build.js` asks whether the built files are
*intact*: do the scripts parse, did the icons inline, is every page in the sitemap, did an
escape get eaten crossing a template literal, did the offline build stay offline. `test/`
asks whether the logic is *right*: geometry, stacking, the issue rules, the share encoding,
the worker. A structural break passes every behavioural test, because the page is fine and
simply does not run. That happened, which is why both exist.

A check that names files by hand goes blind the moment code moves. The em dash guard listed
four paths, the generator was split across fifteen, and it silently stopped watching most of
the site's prose. **Checks walk a tree; they do not read a list.**

## Shape

- `tools/check-build.js`: 18 structural checks over `docs/` and the built planner
- `test/run.js`: 8 suites, a little over 200 checks, about half a second
- suites lift real functions out of the *built* HTML with `vm`, so they test what shipped
- `tools/solve-ballistics.js` re-derives the damage data and fails on drift

Citations: `build.ps1:83` ballistics, `:86` structure, `:91` behaviour.

## Connected to

- **owns:** whether a build is allowed to finish
- **joins:** everything
- **looks-like-but-is-not:** GitHub Actions. There is no CI. These run locally, on the
  machine that builds, and nothing re-runs them after a push.

## If you change this

- **Hits:** verify a new check *actually fails* on the bug it is for before trusting it.
  Every check added on 2026-08-30 was verified both ways, and one of them was a false
  positive on ordinary property access first time.
- **Does not hit:** anything shipped. No check writes to `docs/`.

## Surfaces

| Surface | Role |
|---|---|
| `build.ps1` | runs all three, throws on any failure |
| a human | reads the failure line |

## See

- Source: `tools/check-build.js`, `test/run.js`
