# What changed, and why

`git log` is the full record. This is the short one: decisions a later reader might undo by
accident. Each entry says what changed, why, and what pins it. If this and the code disagree,
the code is right.

Newest first. One entry per decision. Keep entries short.

## 2026-08-31

### The ranking says one thing per column, and the bar points the right way

**The bar was upside down.** Its length was time to kill, so the seven weapons that kill in
one shot drew a 1.5% stub and the slowest drew a full bar: the top of the ranking read as
empty. Length is how fast the kill is now, longest is fastest, and the slowest still keeps a
6% stub so it is a bar rather than nothing.

**One colour scale.** The load had five of its own, on the bar, in the legend and as a chip
on every row, sitting beside a four-colour scale that means magnitude. The bar carries the
time band, the load is a word in its own column, and the load legend is gone. So is the "no
FMJ" marker, which the load filter answers better, and "Buckshot Buckshot", which was the
legend printing each round's short name and its long one.

**The columns are the sort.** Weapon, how fast it kills, load, damage, shots, rate: pressing
one orders by it, which replaces four chips that said "By damage" over a column of
unlabelled numbers. The time sits at the end of its own bar rather than in a column of its
own, and hovering it names the zones that kill in one shot.

### Armory: no disclaimers, and Supply is its own shelf

Owner's call: the panels were full of notes saying what was missing, what was a guess, and
that nothing more was published. All gone. A price with no figure shows a dash. An item with
no stats shows its name and price and stops. The vehicles heading no longer advertises what
is not known about them.

Supply is a category. The four pallets and four crates were under Storage next to the
backpacks, and the six loose supplies were under Ammunition next to the rifle rounds.
Neither is what either word means: a backpack is what you carry, a pallet is what you haul.

Storage keeps backpacks, tac vests and the Pouch, because the loadout reads that category
for both its Backpack and Rig slots.

### The PKM is in, the shelf opens on a class, and the ranking can be read

**Damage is what makes a weapon rankable, not a rate of fire.** The promotion waited for
both, which kept the PKM off a page that could already say what it does per shot and how
many of them it takes. It is a row now with a dash where its seconds go, and `toKill`
returns `null` there rather than 0: zero is the figure for a one-shot kill, the fastest
thing on the page. `bandFor` returns no band for a null, so nothing paints it a colour.

**The weapon shelf opens on a class.** No All, since thirty-four weapons in one grid is a
wall you read rather than a shelf you pick from, and it opens on the class of the weapon in
hand. Order is the owner's: Assault Rifle, SMG, Shotgun, LMG, Marksman Rifle, Sniper, Bows,
then anything the sheet has that this list does not.

**The ranking filters by load.** Asking for hollow point gives the weapons that chamber it,
with their own figures for it, and says how many were left out. It answered with every
weapon in the game falling back to whatever it does chamber, which is a different question.

**The legend is two labelled rows**, bar colour and time to kill, rather than nine chips in
two colour scales with a hairline between them. A one-shot row names the zones it is one
shot at on hover, since which zone depends on the armour and differs per weapon.

**The slow band is orange rather than salmon**, `#f2701a`, picked by measuring against the
gates the palette cleared: 28.1 from its nearest neighbour where the salmon was 28.0, and
6.24 contrast on the panel. Two oranges that looked better came within 21 of the FMJ amber.

### Every gun states its rate of fire

On every ranking row rather than only when the list is sorted by it, and as a fourth readout
in the calculator. It is half of what time to kill is made of, and two weapons with the same
shots to kill were told apart by nothing on the page. All 28 figured weapons carry one, which
`test/site.js` holds them to: a weapon without would draw a dash where every other row has a
number.

The readouts stack down the column now instead of sitting two across. A third at 32% of a
300px column wrapped every label mid-phrase, "shots to / kill" against "rounds per / minute".

### The zone table goes, the ranking takes its place, and the colours say what they mean

The nine-row table of this weapon against this armour sat between the calculator and the
ranking. Its figure is already the three numbers at the top of the calculator, and which
zones the armour reaches is already the figure square, so it was the same thing told a third
time, in the way of the thing people scroll for. Gone, and the ranking moved up under the
calculator.

**The time to kill legend states its seconds**: Fast under 0.25 s, Average 0.25 to 0.6,
Slow 0.6 to 1.2, Very slow over 1.2, read off `ttkBands` so moving a band moves the legend.
It was four words against four squares, which said green beat red and never what green was.
The band's word came off every row with it: the colour is the word, and the row states the
number.

The calculator's three columns are one grid row, so all three are as tall as the figure. The
controls and the readouts sat at the top of their panels with a hand's depth of empty under
them; each column centres what it holds now. `test/site.js` pins the table's absence, the
ranking being the first heading under the calculator, and the legend's bounds.

### The artillery page carries its ads beside the map, not inside the reference

Owner's call. The map had width to spare that a firing solution never needed, so a **right
rail** now takes it: a 300px column in `tools/site/artillery-map.js`, and a horizontal unit
directly under the tool, placed from `tools/site/pages/artillery.js`. The **in-article unit
came out** in the same move, so the reference runs from the platform cards to what they mean
for a base with nothing interrupting it. Net effect on that page is three units to four, and
none of them in the middle of a sentence.

**The rail's grid track is `auto` with the width on the rail itself, and that is deliberate.**
An unfilled unit hides the rail, and a hidden item in an auto track takes no width, so the map
gets the space back with no second rule to keep in step. A fixed `300px` track would leave a
strip of nothing beside the map every time Google declined to fill, which on a new account is
most of the time. Below 1280px the rail moves under the map rather than being hidden, because
a unit that is requested and then `display:none`'d is an impression nobody can see.

`.amap-body.has-rail` is two classes and beats a bare `.amap-body` from inside a media query
as easily as outside one, so the collapsed layouts have to name it. That is the one way this
breaks quietly: the rail keeps its own column on a phone and the map is squeezed to nothing.

**`artilleryRight` and `artilleryFoot` ship with empty ids.** The placements exist, nothing is
emitted, and the build is green: the check that every slot reaches a page skips an empty one
on purpose. Create the two units in AdSense, paste the ids into `data/ads.json`, rebuild.

### Measured beats pulled, and one number brings a weapon in

`data/measured.json` is the new top of the pile: a figure somebody read off the running game
outranks the MetaForge pull and the solver alike, per field, so a bag whose size was measured
keeps the pulled weight until that is measured too. Written only through
`node tools/measure.js "<item>" <field> <value>`, which refuses a name that is not in the
catalogue and a value in a shape nothing reads. `tools/check-build.js` prints every
measurement that disagrees with the pull rather than letting the override hide it.

**A measured `rpm` promotes a weapon out of the gap list by itself.** The rule and the
class-and-calibre join both live in `tools/site/weapon-join.js` so `test/weapon-join.js` can
run them on stubs: with the measured file empty a build exercises none of this, and it
shipped broken within the hour on the order the data files load in.

**The PKM was the missing LMG, and the reason was a wrong calibre.** It was listed as a
7.62x51mm small arm, so it was excluded for having no damage; it is a 7.62x54mm light machine
gun, and the measured sheet has LMG rows for that calibre. One measured rate of fire brings it
in. The 7.62x51mm loads said the PKM chambers them: nothing in the item database does.

**Every bag says its size on the shelf card**, measured ones marked. Three bags really are
3x5, which is why they read as "all the same" when the only way to compare was to pick each
one and read the count.

### The armour rows stop repeating their own label

Each armour strip on the damage calculator ended with the piece's name out of
`data/ballistics.json`, which is "Helmet" and "Body armour": the same two words the label
on the row already says, drawn as a sixth item in a strip of five buttons that you cannot
press. The name goes and the label stays, since Weapon and Load above it are labelled the
same way. `test/site.js` holds every chips strip on that page to buttons only, which is the
class rather than these two rows, and it goes red if the name is put back.

### The bag is the game's bag now, pulled from the database the prices came from

Weight, footprint, stack size, bag grids and unlock levels are in `data/armory-stats.json`,
291 items read from MetaForge's `/api/wardogs/database` on 2026-08-31. Same source as the
prices, and every price in the pull matched the catalogue, which is how the join was checked;
`tools/check-build.js` holds every key in it to a catalogue name. No generator: the API
answers a browser and 403s a script, so the file carries `_howToRefresh`.

The bag draws on its own grid, Pouch 3x2 to Arsenal 5x6, a magazine a 1x2 tile and a drum
2x2, and counts "6 of 15 slots". It counts squares where the game packs shapes, so a full
bag can still refuse a long item: the note under the vendor says so.

**Stacking is per item and it is not five.** Bandage 5, C4 and adrenaline 3, 5.56 eighty,
12 gauge 24, and a frag grenade does not stack at all. The guess of five for anything
throwable was wrong the way that makes a bag look emptier than it is. `test/site.js` pins
the bandage and the grenade against each other.

Weight totals for real, with a plus and a tooltip when part of a kit has no published weight.
Shelves stay in price order, with the unlock level on each card: two bags publish no level,
and sorting on the missing figure put a $15,000 bag third. None of this is measured in game,
which the page says and `data/todo.json` tracks.

### Map: zoom out stops at the fit, tiles stop over-fetching

Zoom bottomed out at `cam.k` 1, far past the whole map fitting, so it shrank into black and
still panned. `clampCam` holds it at the fit and inside bounds. An axis narrower than the
canvas is centred and pinned.

The coarse fallback used `getTile`, which **requests** missing ancestors. First paint of
Bakurani: 24 tiles drawn, 12 ancestors fetched and never drawn. That was the request storm
the retry logic exists to survive. Lookup is read-only now, plus a 5 tile base fetched once
per terrain. First paint 36 requests to 29.

Also `decoding="async"`, and the cache is capped at 360, oldest first, never the base.

Do not copy wardogs-artillery.com's zoom pick: it uses `Math.round` with no device-pixel
term, so it upscales on 2x displays. Ours uses `ceil` times the ratio.

### Loadout: a bag is required before items

Selling grenades to somebody carrying nothing is a kit the game cannot make. Backpack is its
own column. Items shelf and magazine count lock until a bag is chosen. Removing the bag
empties it. Weapon, sidearm, armour and rig are not gated: worn, not carried.

The Pouch moved to the backpack shelf and leads it. It is the free option.

Weight is unmeasured and says so. `tools/build-armory.js` takes `|3.4kg` after the price.
**It refuses a total while any piece is unweighed**, because a light total and an unweighed
rifle look the same on a readout.

### Old designs take the current build zone

Designs from before the zone went 100 to 200 kept 100, as does any share code with no zone.
**100 was the default, not a choice**, so opening one takes the catalog figure. A zone typed
in the panel is left alone. `test/saved-designs.js`.

Also removed prose that commented on itself. Reference pages state the figure and stop.

### 3D: a storey is a count, not a height

`p.level` is how many pieces are stacked under one, not its height. A gun on a two block wall
sat at z=1 inside a wall filling 0 to 2, so they interpenetrated. **No draw order is right
about a pair that runs through another**, which is why it looked like a sort bug.
`standHeights` derives real height from what a piece stands on. `test/elevation.js`.

### 3D: turns 15 degrees, not 90

All four quarter angles are square on, so a wall never showed length and face at once. Yaw
steps 15 with ↺ ↻ buttons and Q/E. The exact sort still holds at any angle once the test asks
the camera which end of an axis is far. Bar swaps Snap for the turn buttons in 3D.

### Three weapons had the wrong class

Scout Rifle TD showed no damage. It was a marksman rifle in 5.56 and no marksman tab was
tested with 5.56. The wiki publishes a class per weapon; checking all 28 found three wrong:
Scout Rifle TD is a sniper, FAL an assault rifle, GGX 18 a pistol. All 28 have damage now.

BMR-308, SVD and SKS are not wrong. The wiki writes "Marksman Rifle", this repo writes
"Marksman".

Class is stated twice, `data/ballistics.json` and `ROWS` in `tools/solve-ballistics.js`. Fix
both or the repo says two things about one gun.

Also `renderCalc` wrote to `#flight` and `#cost` after they were removed, so it threw before
`renderZones`, leaving a dashed hero over the previous weapon's numbers. Stages run through
`stage()` now: one failing does not take the page down.

### Nav is one centred group

A `.nav-gap` span was `flex:1`, so it ate every spare pixel and opened a hole between
Artillery and Designs. Gone. Seven links, 14px gaps, centred.

**Nothing ranks the tools above the references now.** The boxes stopped doing it when every
link got one. To make them lead again use order or a different treatment, not a gap.

### Designs carry tags and filter on them

Two chip rows: where it works, what it is for. Same row means either, across rows means both.

Every submission needs one `map-` tag. **The worker holds no copy of the vocabulary and must
not**: it deploys separately, so a list inside it makes each new tag a forgotten deploy. It
checks id shape, a cap of eight, and one `map-` tag. Unknown ids render as nothing.

Vocabulary lives in `data/community.json` only. `test/tags.js` holds both built files to it
byte for byte and fails if a map in `data/artillery-maps.json` has no tag.

Tags are asked at publish, not stored on the design: they do not travel in the share code.

### Artillery map always draws spawns

It was a toggle. A gun position is chosen against spawns, so hiding them helped nobody. Four
toggles left.

### Damage is measured, not solved

Owner measured it in game. `tools/pull-damage-sheet.js` reads the sheet into
`data/damage.json`. Two things the old derived model got wrong:

- **Coverage grows with tier.** Helmet is head, plus neck from L3. Vest is chest and abdomen,
  plus shoulders and groin from L4. The page used to say a helmet never helps a neck shot.
- **The class fires the round, not the calibre.** 9mm from an SMG and a pistol differ.

Zones went 12 to 9. Artwork remapped, not redrawn.

Bare figures and scalings are transcribed. **Armoured damage is computed, not imported**,
because the sheet's armoured block contradicts its own scaling table in 25 cells. Those are
recorded in `sheetDisagrees` and listed in OPEN.

The join to `data/ballistics.json` has no foreign key. Check 3d2 pins the count: a rename
lands nothing and draws every zone as a dash, which still builds and looks deliberate.

### Your designs sit under the community's

`/designs/` carries both lists. One renderer draws both and `/account/` uses it too; a second
copy would drift. `test/site.js` compares the script blocks.

Publishing clears the cached `/designs` reply before redraw, or the list gains the design
while the card under it still offers to send it.

Public list loads twelve at a time. **Show more** is the real control; scroll only presses it
early, so a browser with no IntersectionObserver keeps the tail.

### Nav is one row of one size

Boxes were sized by their labels, 96 to 114px. All 100px now.

That surfaced an older bug: **at 1000px the page scrolled sideways by 220px.** The header
only stacked below 760px. Nav takes its own row below 1180px and wraps rather than overflows.

### Owner is a Discord id, not a name

`/todo/` compared a lowercased display name to a baked-in string, so a rename got you in.
`/me` answers `owner:true` for `OWNER_DISCORD_ID` and the page asks.

**It authorises nothing.** A Discord id is public, so it decides what a page offers to show,
never what `/admin` does, which still wants `ADMIN_TOKEN`. `test/worker.mjs` pins both.

### Armory holds vehicles, and every item opens

Clicking an item opens a panel with full-size art and known stats. Stats are a join from
`data/ballistics.json`. 72 of 331 have real stats; the other 259 say plainly that nothing is
published rather than showing empty rows.

**Its torso damage is the superseded solved figure.** The damage page moved to measurements
and the panel did not. Listed in OPEN.

Three not to undo:

- **Stored armour is what armour takes; the panel prints what gets through.** Printing
  `blocks` straight says a hollow point is best against a L4 vest.
- **The two weapon lists spell calibres differently.** Figured stores an id (`556`),
  unfigured a label (`7.62x51mm`). The panel resolves ids and passes labels through.
- **The attachment slot was never transcribed.** `slotOf` reads it off the name; the panel
  says so, or it is a reading passed off as a record.

`tools/check-build.js` asserts all four joins by count.

`<dialog>` is native for backdrop and focus trap. Its `close` event never fires in the
browser this was built against, so `shut()` restores focus directly.

**`/vehicles/` is a meta refresh to `/armory/`, not a deletion**, because GitHub Pages cannot
send a 301 and a deleted page is a permanent 404 for anyone holding the link.

### Buildables uses the armory rail and serves icons as files

`.cat-bar` and `.cat-count` were in the markup with **no CSS at all**, so the controls stacked
into three stripes. Uses the armory `.cat-layout` rail now. New CSS is only
`.cat-main{min-width:0}` and `.cat-tablebox{overflow-x:auto}`: **a grid column is
`min-width:auto` by default**, so a five column table pushed the rail off the page.

Icons were 585 KB of base64 the default table view never painted. Now files under
`/build-icons/`, lazily loaded. Page went 660 KB to 87 KB.

`assets/icons/` feeds two consumers. `build.ps1` inlines it into the planner, which must open
with no network, and copies it to `docs/build-icons/` for the site. **Do not consolidate.**
Four checks hold it, including that the page carries no `src="data:image` at all.

**The page must not be deleted.** `/buildables/` is indexed, Pages cannot redirect, and it is
reached from the home grid and the footer only. `test/site.js:74`.

### Worker refuses to run on a public secret

Session key and identity salt ended in `|| "wardogs"`, written in a public file. **A deploy
missing its secrets looked healthy and signed every session with a key anyone could read.**
Missing secrets answer 503 now and `VOTE_SALT` is required. `tools/check-build.js` fails if
`env.SECRET || "literal"` reappears.

Three more of the same shape, a check that looks right and is not:

- **Return address was prefix-matched.** `startsWith("https://www.wardogsbuilder.com")` is
  true of `...com.example.net`. Origins are parsed now and OAuth `state` is signed.
- **`GET /comments` published Discord ids.** Both routes go out through a projection that
  names what leaves, so new fields are private by default.
- **Bodies were unbounded** before `JSON.parse`. Capped on what arrived, not `Content-Length`.

Admin token is compared byte for byte. A corrupt KV record costs that record, not the route.

### Not everything worth hardening is in the code

Static files on GitHub Pages cannot set response headers. So no CSP, no HSTS, no hotlink rule,
no rate limit, and no amount of editing the generator makes one. `shell.js` sets `referrer`,
which a meta tag does carry, and nothing else.

The 132 MB under `docs/game-icons/` and `docs/maps/tiles/` is the game's art, held so the
project does not hotlink. Every address is enumerable from data in the page. `robots.txt`
asks training crawlers out; that is a request, not a control.

Raising the ceiling needs Cloudflare proxying the domain, not just holding DNS. Dashboard
work, written up in [security](processes/security.md), not done.

### Loadout page is the vendor, with the game's icons

Was ten dropdowns with no pictures. Now shaped after the in-game equipment vendor, checked
against beta footage: Equipment, Gear, Items tabs, a card per slot with art and price, and
the magazine built mag plus round times count. Every panel is in the page whatever the script
does.

**Weight and a cash balance are deliberately missing.** No weight is confirmed, and no
planner knows your wallet.

495 icons from the wardogs.zone wiki via `tools/pull-game-icons.js`. See
[game-icons](objects/data/game-icons.md).

### Nothing is chosen from a dropdown

A dropdown hides every option and shows words, which is wrong for a shelf where recognising
the item is the task. All three catalogue pages click the thing now.

Loadouts: a slot opens its shelf, a card equips and closes it. One shelf at a time, Escape
closes, the round shelf shows only what the weapon chambers.

Armory: card grid by default, table behind a toggle. One filter and one sort over the same
elements, so switching never reshuffles. **An unconfirmed price sorts to the bottom in both
directions**: a blank is not the cheapest thing.

Damage: the weapon control is the weapon. `setWeapon` is the only way `S.w` changes.

**The trap, twice.** `.vcard` and `.acard` are `display:flex`, which beats the `hidden`
attribute's UA `display:none`. Filtered-out cards stayed visible while the script believed
otherwise. Anything given a display must say what hidden means for it, like `.ctl[hidden]`.

### Damage page shows the gun

Weapon art under the picker, weapon icon on every ranking row. All 28 weapons and 30 vendor
round names joined first try off the armory slug.

**`.rname` must not be a flex row.** That turned wrapped names into two columns. Icon is
inline with a baseline nudge; the name column went 168px to 210px.

### A generated file its generator no longer makes

`data/armory.json` was committed with 323 icon slugs without the `build-armory.js` change
behind them. That generator runs by hand and nothing compared the two, so the next run would
have stripped every icon. `build.ps1` runs `build-armory.js --check`, which **refuses** on a
mismatch. Refusing not overwriting is the point: overwriting is what hid it.

### Map: black squares and a shudder

A failed tile was marked dead for the session. The failure is almost never a missing file, it
is the browser cancelling requests during a fast zoom. Retries three times, backing off.

A square with no tile draws from a coarser one, so changing zoom goes soft instead of black.

Every wheel event ran a full draw; they ask for a frame now. Zoom stepped a flat 1.2 per
event, so a trackpad arrived as stacked 20 percent jumps. It scales by actual delta.

### Grouping angle comes off the page

Spread is gone, and the dashed circle with it. It traced to one ungrounded source. No game
shows a player an MOA figure.

**The check that guarded it was the worst kind.** It proved spread reproduces four published
figures from the MOA alone, which it does, because the site publishing both did the same
multiplication. A check on arithmetic that reads like a check on a measurement is worse than
no check.

`test/artillery.js` now checks the absence, in data and on the page. **The dial stays**:
three sources publish mil tables and the gun takes a mil elevation.

### Firing solution explains itself

Every label opens an explanation on hover, tap or tab. The spread half is superseded.

**The dial tip is written per arc.** More mils is less range on the mortar and high arc, more
on the low arc. One rule for both misleads half the time.

**Do not say a full circle is 6,400 mils.** True of the NATO mil, unchecked here: two sources
read different scales and nobody has noted what the sight shows. Fire the gun first.

### Design cards are the same size

Cards sized by their contents came out ragged. Rows stretch, the action row drops to the
bottom. The last of it was an inline `style="margin-top:14px"` beating the stylesheet.

### Planner says PLANNER, build zone is 200

Zone went 100 to 200 on the owner's word, and stays `radiusConfirmed:false` because nobody
has counted. That flag keeps range rings off the plan.

Eight copies of `|| 100` became one `fobZone()`. **Two literals stay in the share encoders:**
100 is the wire format default and `test/share-links.js` needs both encoders to emit identical
bytes. Reading the catalog there ties the format to a value a player can edit.

### Vehicle dash picked against every wall it lands on

The amber vanished on hesco gold at the top of the storey shading: 13.7 apart at the sixth
storey. Now chosen against all six storeys of all six wall roles, for the worst case: 28.3.
A wider search offered better numbers by leaving the warm family; not taken, because the two
ways in reading as siblings is worth more.

### A fault and a way in stop looking the same

Fault outline and foot climb dash were 5.5 apart in Lab, which nobody can see. Fault is the
danger colour; the two ways in take a warm pair, 34.9 from the fault and 33.5 apart. The
legend had drifted off the canvas colours; one constant each now.

Worth writing down: a first pass compared the dash to the role colour and got 13.9. **The
role colour is not what gets painted.** A piece is filled with `shade(base, -62 + 13 per
storey)`, so the real ground gap is 30.2.

### 3D view, six passes condensed

All pinned in `test/elevation.js`. `git log` has the reasoning.

**Draw order is a graph, not a sort.** Ordering by distance to each middle drew short pieces
over long. Only overlapping pairs are ordered: 0.7 ms for 117 pieces, 3.2 ms for 624.
Reverting fails six checks.

**A piece is a prism over its four corners**, not its bounding box. A 4x4 at 45 degrees has a
box 5.66 across.

**Runs, not boxes.** Sides joined to a same-wall neighbour are interior: 612 edges to 209 on
51 pieces. The seam mask is in world directions and checked as arithmetic at every angle,
because suppressing the wrong side looks almost right.

**Height is the job**: a block stands 1.45 times ground scale against a 0.866 cell.

**Colour is by material and the key cannot lie.** Role, colour, label and key list move
together.

**Writing is drawn last**, or a piece dropped nearby paints over its label.

### Crew size: who the base is for

Three buckets in `data/buildables.json` under `crewSizes`, read by planner and list. The
planner refuses to submit without one.

**It rides inside the share code**, so one answer survives link, save, export and reopen. The
head of both formats is JSON, so old codes lack the key and old readers ignore a new one, and
the alphabet is unchanged, which would have made it a worker deploy. Unknown values dropped.
`test/crew.js`.

### Two bugs found alongside

**A chosen chip was invisible.** `.seg button` set a transparent background after
`button.active` at equal specificity. Restated at a winning specificity.

**A reopened base showed zero build cost.** `loadCurrent` is reached from a promise, so it
lands after startup computed everything from an empty design. It recomputes now.

### Designs page stops spending space on nothing

A layout for a full rectangle used for a list that usually is not one. `.chips.sorts` is the
width of its contents; the grid is centred rows carrying their own edges. The submit form
went, **and the line promising submissions are read before they go up went with it: that
stopped being true when the queue was removed.**

### Community list shows the base, one decoder both sides

Every card carries an overhead picture of its layout, colour and footprint only.

**The two encoders of the share format had already drifted apart once unnoticed**, so no
second decoder was written. `src/shared/design-view.js` is the only one. `build.ps1` inlines
it into the planner, `client-scripts.js` into the pages. The planner's private copy is
deleted, not left unused.

Pictures paint when a card is about to be seen. A code that will not decode leaves no picture.
`test/thumbnails.js`.

### Sign out moved under your name

It was a second header link level with everything else, putting the one destructive account
action in the busiest row. Your name is a control; Your designs and Sign out open under it.

### "Plan your FOB" stops sitting on your base

The invitation was hidden only in `afterChange`, which a design arriving at boot never enters,
so a share link drew the base with the invitation over it. Reported twice. `drawNow` decides
it now. `test/planner-tools.js`.

### Your own work is yours to take back

Everything published on arrival and only the admin could unpublish. `POST /withdraw` lets the
submitting account remove its own design. Ownership comes from `by`, recorded since `/submit`
existed; a submission without `by` stays with the admin.

`/designs` was returning stored records as-is, putting `by` in a public list. The worker
answers a `mine` flag from the caller's token and deletes `by`.

Deleting left comments behind under an unreachable slug. `removeDesign` takes record, votes
and comments, and both paths go through it. `test/worker.mjs`.

### The update chip can hand back the old build

Pages serves the planner with `max-age=600`, so `location.reload()` can answer from cache and
return the same build. It refetches with cache "reload", on focus and every five minutes.
Hence the rule about comparing live `build.txt` to local before believing a bug report.

### Ctrl+V pastes

Plain letters were matched before Ctrl combinations in one if-else chain, so Ctrl+V toggled
3D. Modified keys are handled first, in a block **that returns**: without the return a plain
branch further down still catches them. 3D moved to 3. `test/planner-tools.js`.

### Fewer buttons up top

Fifteen controls, four doing one job. Share, Export and PNG became one menu; Import moved into
Designs; the catalog editor into Help. Nine show. `test/planner-tools.js` counts what shows
rather than names, because buttons creep back one at a time.

### Turning a selection turns the group

`rotateSelection` spun every piece where it stood. It turns about the selection's centre, put
on the grid first so four quarter turns land back exactly. `test/planner-tools.js`.

In the worker, `/designs` lists what is not hidden rather than what was approved, which had
stranded three submissions. Needed a wrangler deploy; `git push` does not ship the worker.

### A run steps along the piece, not down the drag

Three causes. `snapPoint` snaps in the piece's own frame, because a 1x1 at 45 degrees steps
0.707; at square angles that is the world grid, so square-on placement is unchanged.
`snapPlace` measures from the nearest same kind and angle, so leaving the line costs three
quarters of a block. And a run spaced pieces by extent along the drag, so a turned piece met
the next at a corner; it now walks the two moves a piece can make and still touch. `wallGap`
measured upright boxes, so a flush turned wall reported a break.

`test/runs.js`, with three checks that assert the old behaviour fails.

### A way in is a run, and only where somebody can stand (`e9868d9`)

`climbRuns` groups touching pieces of one verdict. `reachableFromOutside` floods from beyond
the bounds; wire and hedgehogs do not stop it, or one line of wire hides a perimeter. Past the
cell budget everything is called reachable: **over-reporting is the safe way to be wrong about
a way in.** `test/planner.js`.

### A gap you cannot see is named, not merged away (`e9868d9`)

`hairlineGap` states the distance rather than closing it: **widening the merge tolerance would
make the plan lie about a hole in a wall.** `HAIRLINE` widens the spatial index too.
`test/issues.js`.

### The panel leads with pallets (`592ad7c`)

`pallets = ceil((supplies - startingSupplies) / suppliesPerPallet)`, computed identically in
`tools/site/context.js`. `tools/check-build.js` fails on any supply number the catalog does
not state, after help text said 1,900 against a catalog saying 1,800 for months.

### One wall draws as one wall (`615fab9`, then `41488cb`)

`seamFamily` merges anything tagged `wall` with another wall of its role. **`41488cb` is the
half that matters: seam bits are worked out in world space and drawn inside `ctx.rotate()`,
so a rotated wall suppressed the wrong edges. Read that commit before touching either.**

### The front page says what the site is for (`c5e57bf`)

**Guides were removed in full, generator and prose and sitemap, so `/guides/` and the four
guide URLs return 404. Deliberate, not an oversight.**

## Where the rest lives

- what a change will break: [effects/CONTEXT.md](effects/CONTEXT.md)
- what is unfinished: [OPEN.md](OPEN.md)
- why a check exists: [objects/guards/verification.md](objects/guards/verification.md)
- the planner itself: [objects/planner/planner-app.md](objects/planner/planner-app.md)
