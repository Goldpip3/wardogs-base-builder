# WARDOGS Base Builder

A free, offline FOB planner for [WARDOGS](https://store.steampowered.com/). Lay out your base
between matches — walls, gates, gun pits, drill rigs — and see what it costs in Build Supplies
before you haul a single pallet.

**No account, no install, no server.** It's one HTML file that runs entirely in your browser,
and your designs are saved on your own machine.

## What it does

- **Every buildable from the Large Hammer**, with the real in-game Build Supply costs
  read off the radial menu.
- **Drag to lay a wall run** — pieces sit edge to edge with a live count and cost as you drag.
- **Build upwards** — put a CIWS or mortar on a hesco platform; lower storeys stay visible
  underneath so you can line things up.
- **Costs as you go** — total supplies, vendor cash, which hammer you need, and how many
  supply runs it'll take. Enter your current stock and it tells you whether the design fits.
- **Catches mistakes** — anything outside the FOB build zone, overlaps, gates off the ground,
  weapons with no sky above them, or pieces floating with nothing underneath.
- **Anti-climb check** — counts how much of your cover is only waist height and therefore
  vaultable.
- **Presets** — mortar pit, AA nest, SAM site, anti-climb wall, vehicle gate, raised gun platform.
- **Share layouts** — export a design as JSON and someone else pastes it straight in.

## A note on the numbers

WARDOGS is in closed beta and BULKHEAD hasn't published build costs or structure sizes.
Costs here were read frame-by-frame from the in-game radial menu; sizes came from play
testing and community reports.

Anything still uncertain is marked **red with a `?`** in the palette. If you know better,
select a placed piece and edit its **Footprint & height** — the correction sticks for every
piece of that type. Corrections welcome.

## Running it

Download `index.html` and open it. That's the whole thing.

## Building from source

`src/app-template.html` + `data/buildables.json` + `assets/icons/` are combined into the
single file by:

```powershell
powershell -File build.ps1
```

Which produces:
- `WardogsBaseBuilder.html` — the standalone app
- `dist/index.html` — the same file, ready to drop on any static host
- `src/artifact.html` — a variant for publishing as a Claude Artifact

Edit `data/buildables.json` to change costs, sizes or which hammer tier builds what.
