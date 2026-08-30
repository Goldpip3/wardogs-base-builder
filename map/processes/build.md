---
type: process
status: verified 2026-08-30
consumes: [buildables-catalog, derived-data, build-config, planner-app, site-context, page-module]
produces: [planner-app, page-module]
---

# build

One command turns the sources into everything that ships, and refuses to finish if any of it
is wrong.

## Input → Movement → Output

Reads `src/app-template.html`, `data/*.json` and `assets/`. Inlines the catalog, icons and
fonts, emits two planner builds and the whole site, then runs three layers of checks.
Produces `WardogsBaseBuilder.html`, `docs/`, and a non-zero exit if anything failed.

```bash
powershell -File build.ps1
```

## Why this shape

Because a build that reports success while a step threw is worse than no build. It happened:
`build-site.js` failed, `build.ps1` carried on, and the checks then passed against
yesterday's pages. Every stage now guards its own exit code.

Reads are pinned to UTF-8 explicitly. Windows PowerShell 5.1 reads UTF-8 sources as the ANSI
codepage and turned every arrow and dash in the app to mojibake. Do not go back to
`Get-Content -Raw`.

## Steps

1. Read template and catalog as UTF-8 (`build.ps1:9`).
2. Base64 every icon and font, inline all three markers (`build.ps1:34`).
3. Write the offline build with an empty API (`build.ps1:52`).
4. Write the hosted build with the worker origin and a build stamp (`build.ps1:60`).
5. Generate the site; throw if it failed (`build.ps1:75`).
6. Re-derive ballistics and check it against its sources (`build.ps1:83`).
7. Structural checks over the output (`build.ps1:86`).
8. All eight behavioural suites (`build.ps1:91`).

## If you change this

- **Hits:** everything. This is the only path to a shipped file.
- **Does not hit:** the worker, which has its own deploy, and the live site, which needs a
  push. A green build is not a release.

## Surfaces

| Surface | Role |
|---|---|
| a human at a terminal | runs it |

## See

- Objects: [planner-app](../objects/planner/planner-app.md),
  [verification](../objects/guards/verification.md)
- Source: `build.ps1`
