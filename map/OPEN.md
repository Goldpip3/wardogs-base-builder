# What is open

A catalog, like everything else in this map. It points; the detail lives with the thing it
is about. If this file and a card disagree, the card is right.

Last swept 2026-08-30, end of the session that shipped short share links, the account
control in the planner toolbar and one-button submission.

## The community loop works. It has never been finished by hand.

Submitting from the planner, saving online and signing in all work end to end, verified
against the live worker. Three real submissions are sitting in KV right now with
`status: pending`, one of them a genuine base:

```
design:new-fob-qv11    pending    AVGVSTVS    391 char v2 code
design:new-fob-bbrz    pending
design:new-fob-2-7he8  pending
```

**Nobody has ever approved one.** The next step is a person at [/moderate/](https://www.wardogsbuilder.com/moderate/)
with the `ADMIN_TOKEN`, approving or deleting those three. Approval is enough on its own:
`/designs/` fetches the list from the worker at runtime, so no rebuild and no push. Until
that happens the voting half of this site has never actually run with real data, and two of
those three are probably test submissions to delete rather than keep.

**One decision is waiting on the owner.** Their own submissions queue up behind their own
approval, which is right for strangers and pointless for the one person who runs the site.
Making a submission from the owner's Discord id publish immediately was offered and not yet
answered.

A warning that cost an evening, now on the worker card too: `wrangler kv` reads a **local
emulated store** unless you pass `--remote`. Without it the namespace looks empty. Those
three pending designs were reported as "nothing ever reached storage" on the strength of a
listing that was reading nothing at all.

## Start here if you are picking artillery back up

`/artillery/` is a full-screen tool, laid out like the planner: bar, panel, canvas, status
bar, filling the viewport on arrival with the reference material below it. Bakurani and
Ozeti over real terrain imagery from
[objects/data/artillery-maps.md](objects/data/artillery-maps.md), opening framed on the
control zone because that is the only ground the match is fought over. Gun and target go
down by click or typed coordinate, the rings are the gun's reach, the towers carry the
game's own antenna glyph, and the panel says whether the zone is in range from where the
gun stands. The solution reports both SPH-2 arcs where both reach. The SPH-2 elevation tables were transcribed on 2026-08-30
from wardogs-artillery.com, the one source publishing the complete curve, and are marked
unfired. The URL fragment carries map, weapon and both points, so a solution is a link.

Six open questions remain listed in `data/artillery.json` under `open`, each with what
would close it, and they are rendered on the page so players can see them too. Read
[objects/data/artillery-data.md](objects/data/artillery-data.md) first, then that array.
All six now need somebody with the game open, not more research. The largest is that
**every firing table here is flat ground**, and the terrain is a river valley, so a shot
onto high ground falls short of what the page says. One coefficient per platform would fix
most of it. Second largest: nobody has fired a row of the transcribed SPH-2 tables.

The designed next step, blocked until the plan-cell-to-metre scale is confirmed: place a
plan's footprint on the artillery map, so a design's own mortar gets its reach drawn over
real terrain. That is the join between the planner and this page, and it is one confirmed
number away.

## Ballistics is now a calculator, and it has one hole worth closing

`/ballistics/` is the damage calculator and the ranking on one page: pick a weapon, a load,
a helmet tier, a vest tier and a hit zone on a clickable figure, and every weapon in the
game re-sorts underneath to match. The URL fragment carries the setup, so a comparison is a
link. Read [derived-data](objects/data/derived-data.md), then `docs/ballistics-sources.md`.

**The one thing to close with the game open: what flesh damage does to an unarmoured zone.**
Every armour figure for HP is published and used. Its bare-flesh damage is published
nowhere, so the page uses the standard figure and calls it a floor in three places. The
vendor charges $7.00 a round for .308 HP against $4.00 for standard, so the real number is
higher and nobody knows by how much. One magazine into an unarmoured target, counting hits,
closes it. It is the largest wrong number on the site and it is wrong in a knowable
direction.

Six weapons and seven loads are on the vendor shelf with no damage figure and are listed on
the page as gaps rather than dropped. `test/ballistics.js` fails if a new one appears in
the armory and is neither ranked nor excused.

## Waiting on Early Access, 10 September 2026

Everything below is a number read off a closed beta. It all wants re-checking that week, and
the tools exist so that it is a data job rather than a rebuild.

| Area | What changes | Where |
|---|---|---|
| ballistics | three holes, all listed on the page: what flesh damage does to bare flesh, range falloff, and the torso zone multiplier | `docs/ballistics-sources.md`, [derived-data](objects/data/derived-data.md) |
| armory | 38 of 331 items have no confirmed price | `tools/build-armory.js` |
| artillery | the contested mortar range settles with one shot | `data/artillery.json` |
| buildables | costs and sizes marked `costConfirmed: false` / `sizeConfirmed: false` | `data/buildables.json` |
| the planner | `buildRadiusUnits: 100` is `radiusConfirmed: false`, which is what blocks range rings on the plan | `data/buildables.json` |
| ongoing supplies | how much Ammo, Fuel or Mechanical a single reload draws is not published anywhere, so the planner counts the emplacements that will keep drawing and states no figure. One reload of a mortar, watched, closes it | `data/buildables.json` `mechanics.supplies`, and the Ongoing Supplies panel |

## Needs a decision, not a discovery

- **Ko-fi handle.** `support.url` in `data/buildables.json` is unset, so the tip button does
  not render. It needs an account name, which is not something to guess at.
- **The planner ad needs a slot id before it ships.** Everything else for it is built and
  checked: `data/ads.json` has a `planner` slot, `build.ps1` injects it into the hosted
  planner only, and the downloadable file is asserted clean three ways. The slot is empty,
  so nothing is emitted. Create a display unit in AdSense, put its id there, rebuild.
- **Whether three ad units is the right number.** AdSense went live 2026-08-30: a responsive
  leaderboard above the footer sitewide, a fluid in-article unit on Damage, Armory and
  Buildables only, and one at the foot of the planner's right panel. Most pages carry one.
  That was chosen to keep the site usable rather than to maximise revenue, and it is worth
  revisiting once there is a month of real earnings to weigh it against.

  Two things were deliberately not done, and are worth not re-deciding by accident. Nothing
  goes against the bottom edge of the map: it is a click-and-drag surface, and an ad on its
  edge is both worse to use and the placement Google treats as inviting accidental clicks,
  which on a young account is an account risk rather than a design opinion. And the
  downloadable planner carries nothing, which is not a preference but the whole promise of
  the file.

  Adding a slot is not one step. A content-page slot needs an id in `data/ads.json` *and* an
  entry in `AD_FORMATS` in `tools/site/context.js`; the planner's is injected by `build.ps1`
  instead and ignores that table. A slot with an id and no placement fails the build rather
  than failing silently.

## Known and deliberately not fixed

- **A piece rotated off ninety degrees can sort wrong against a neighbour in the 3D view.**
  A wrong-looking edge, not a crash. Written up in `docs/3d-view-design.md` rather than left
  in anyone's head. Fixing it properly means a BSP tree, which is not worth it.
- **No range rings on the plan.** Blocked on the cell-to-metre scale above. The rings
  themselves live on `/artillery/`, where coordinates are the game's own and a metre is a
  metre; the plan joins them the day the scale is confirmed.
- **No CI.** `build.ps1` runs on the machine you are sitting at, and `docs/` is committed
  output, so a push ships whatever was last built. See [deploy](processes/deploy.md).
