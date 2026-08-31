# How to walk this map

## What this is

A record library of nouns plus a short shelf of verbs, plus a change-impact index. The
subject is the repository around it. **The code is the source of truth.** Every card cites
`path:line`. When a card and the code disagree, the code wins and the card is stale.

Read the catalog ([CLAUDE.md](CLAUDE.md)), then one card. Do not read `objects/` whole. The
catalog exists so that you do not have to.

## Universes

| Universe | Meaning here |
|---|---|
| **live** | In force. Implement and cite against these. |
| **leftover** | Still present, no longer the main path. Touch only if that path is in scope. |
| **ghost** | Named or filed but not wired. Do not implement against these. |

Everything in this map is `live` unless its card says otherwise. Two things are worth
knowing up front:

- `assets/icons-drawn/` is **leftover**. The source SVGs behind the buildable icons. Still
  on disk, referenced by nothing but this line, kept as a fallback. `build.ps1:18` reads
  `assets/icons/`, not this.
- `src/artifact.html` is **leftover**. A stripped variant for publishing as a Claude
  Artifact, regenerated every build at `build.ps1:55`. Nothing reads it.

## Two sets of art, two different rules

Easy to conflate, and the difference is the reason one of them is drawn by hand.

| Set | What it is | Where it may go |
|---|---|---|
| `assets/icons/` | the **buildable** icons, drawn by `tools/make-icons.js` in one isometric projection | inlined into the planner, both builds |
| `docs/game-icons/` | the **item** icons, the game's own art off the wardogs.zone wiki | the site only, never the planner |

`make-icons.js` says of its own set: original artwork, no game assets, which matters
because the project is public and may take donations. That is a statement about the
buildables, not a rule the item icons broke. The item icons are the game's, they are used
on a fan site the way the terrain tiles already are, and check 3e fails the build if the
downloadable planner so much as names one, because that file's promise is that it reaches
no network at all.

## Name collisions

Product language and file names disagree in four places. This is the single most common way
to get lost here.

| You will hear | The file calls it | Note |
|---|---|---|
| "the planner", "the app", "the builder" | `src/app-template.html` | The *source*. Two different built files come out of it. |
| "the site" | `tools/site/` | The **generator**, not the output. The output is `docs/`. |
| "buildables" | `data/buildables.json` | In-game structures you place. Nothing to do with `tools/build-*.js`. |
| "the worker" | `worker/vote-worker.js` | Named for votes, but it also carries auth, comments, feedback and cloud saves. |

Also: **`build` means three unrelated things** in this repo. Build Supplies (an in-game
resource), the build process (`build.ps1`), and `tools/build-armory.js` /
`tools/build-site.js` (generators). Read which one from context.

And **`docs/` is not all generated**, which the entry files say twice because it is the
easiest wrong assumption to act on. `docs/game-icons/` (495 icons) and `docs/maps/tiles/`
(about 10,900 terrain tiles) are committed art. Nothing regenerates them, `build.ps1` never
writes them, and between them they are the overwhelming majority of files under `docs/` by
count. Deleting either expecting the build to put it back loses it.

## Status on a card

`verified` requires a date and citations. `stale` is allowed and is honest. A confident
wrong date is not. Each card carries its own date; most were verified against `main` on
2026-08-30, and the ones touched since say so themselves. Trust the card, not this line.

## What this map deliberately does not hold

- **As-built behaviour.** If you want to know what a function does, open the function.
- **The prose of the site.** That is content.
- **Anything already enforced by a check.** If `tools/check-build.js` fails the build on it,
  the check is the documentation. Cards point at checks; they do not restate them.
