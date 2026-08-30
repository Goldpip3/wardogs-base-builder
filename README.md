# WARDOGS Base Builder

A free, fan-made FOB planner and reference for [WARDOGS](https://store.steampowered.com/).
Lay out your base between matches, see what it costs in Build Supplies before you haul a
single pallet, and look up what any gun does to any armour tier.

Live at **[www.wardogsbuilder.com](https://www.wardogsbuilder.com)**. Not affiliated with
BULKHEAD Interactive or Team17.

## What is here

**The planner** is one HTML file that runs entirely in your browser with no network at all.
Drag to lay a wall run, stack storeys, watch the cost climb, and get told when a piece is
outside the build zone, floating, or low enough to vault. There is a 3D view for reading
height, and a share link that carries the whole design in the URL.

**The site** around it is generated: a buildable catalogue, community designs with votes and
comments, ballistics, artillery firing solutions, an item catalogue with vendor prices, a
loadout calculator, and vehicles.

## If you are an agent, or new here

Start at [CLAUDE.md](CLAUDE.md), then [map/](map/CLAUDE.md). The map is an edit map built to
the [ICM](https://github.com/RinDig/icm-architect) system-map form: what the nouns are, how
they move, and what else moves if you touch one. It cites the code rather than restating it,
and [map/effects/CONTEXT.md](map/effects/CONTEXT.md) is the part worth reading before any
change, because it also records what points into this repo from outside, which nothing in
the tree references and which therefore breaks silently.

This README stays the human-facing summary. Where the two overlap, the cards carry the
citations.

## How the repository is laid out

```
data/            every number the site knows, as JSON
  buildables.json    build costs, sizes, tiers, what stacks on what
  ballistics.json    damage, armour, hit zones, fire rates
  armory.json        vendor prices for 331 items
  community.json     submitted designs, and the worker's URL
  ads.json           the AdSense publisher id, kept out of the planner on purpose

src/
  app-template.html  the planner. One file, no framework, no build step beyond inlining

tools/
  build-site.js      the running order and nothing else
  site/
    context.js       everything the pages share: data, helpers, write()
    css.js           the stylesheet
    shell.js         the head, header, nav and footer every page is poured into
    client-scripts.js  the JS that ships inside pages: sign-in, votes, comments
    pages/           one module per page. This is where features live
  check-build.js     structural checks, run on every build, fail the build
  build-armory.js    regenerates data/armory.json from a transcribed catalogue
  solve-ballistics.js  re-derives the damage figures and checks them against source

test/              behavioural suites, run on every build
worker/            the Cloudflare Worker: votes, comments, accounts, cloud saves
map/               the edit map. Nouns, movements, change-impact. Cites code, restates none
docs/              generated output, served by GitHub Pages. Do not hand-edit
.claude/skills/    icm-architect, vendored, MIT. The method the map is built to
```

## Building

```powershell
powershell -File build.ps1
```

That inlines the catalogue, icons and fonts into the planner, generates the site, then runs
every check. It writes:

- `WardogsBaseBuilder.html`, the standalone offline app
- `docs/planner/index.html`, the hosted copy, which can also save to an account
- `docs/`, the rest of the site

The two planner builds differ by one injected string, and `check-build.js` enforces that the
downloadable one really cannot reach the network.

## Adding things

**A new page.** Write `tools/site/pages/yourthing.js` exporting `ctx => { ... }`, add its name
to the list in `tools/build-site.js`, and add its URL in `tools/site/pages/sitemap.js`. The
build fails if you forget the sitemap.

**A number.** Change it in `data/`, never in the markup. Anything duplicated between the two
will drift, and has, three times.

## Testing

```
node test/run.js
node test/run.js planner
```

Eight suites, a little over two hundred checks, about half a second. They lift the real
functions out of the built HTML with `vm` and run them, so they test what shipped rather than
a copy. `build.ps1` runs them too, which is the point.

There are two layers and they catch different things. `tools/check-build.js` asks whether the
built files are intact: do the scripts parse, did the icons inline, is every page in the
sitemap, did an escape get eaten crossing a template literal. `test/` asks whether the logic
is right: geometry, stacking, the issue rules, the share encoding, the worker.

Both exist because of bugs that shipped. When a new class of bug gets out, add a check rather
than only fixing the instance.

## A note on the numbers

WARDOGS reaches Early Access on 10 September 2026. Everything here is read off the closed
beta and needs re-checking then.

Build costs came frame by frame off the in-game radial menu. Vendor prices are transcribed
from the public item database. Damage is neither: shots-to-kill is a bound rather than a
value, so `tools/solve-ballistics.js` intersects the bounds from five armour tiers to pin it,
then checks the result against two figures published elsewhere and reproduces all 140
published shots-to-kill numbers. If that stops passing, the build stops.

Where a number could not be worked out honestly it is left out and said so, on the page.
Range falloff and the torso hit-zone multiplier are the two open ones, written up in
`docs/ballistics-sources.md`.
