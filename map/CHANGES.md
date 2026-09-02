# What changed, and why

`git log` is the full record. This is the short one: decisions a later reader might undo by
accident. Each entry says what changed, why, and what pins it. If this and the code disagree,
the code is right.

Newest first. One entry per decision. Keep entries short.

## 2026-09-02

### Range falloff is not a thing, and the damage page stops apologising for it

The damage page called itself point blank and named range falloff the biggest hole on the
site, on the reading that damage visibly fell off in the published tables. On the owner's
word on 2026-09-02, it does not: rounds drop with distance, damage does not. So the lede
says a figure holds at whatever range the round lands, the "missing on purpose" list is two
items rather than three, and `data/ballistics.json` carries the fact as `rangeFalloff`
next to what is still unsolved. `docs/ballistics-sources.md`, the README, the map and the
todo list all said the old thing and now say this one.

### The build zone is measured: 39 blocks out from the FOB, and four emplacements resized

The owner read it off the running game: from the middle cell of the 3x3 FOB, 39 single Hesco
blocks fit between it and the edge of the build zone in every direction. So the square is
39 + 1 + 39 = 79 cells across, and `buildRadiusUnits` in `data/buildables.json` says so
with `radiusConfirmed: true`. **The raw count is kept beside the figure** as
`radiusReading`, so the arithmetic can be checked or redone. The first write-up of this
reading took "Hesco walls" to mean the 4-wide Quad and recorded 312; it was single blocks.
Both former defaults, 100 and then 200, were estimates, so a design still recording either
takes the measured figure when opened (`FORMER_FOB_ZONES` in the planner); a zone typed in
the panel is still kept, and the panel's input steps by one now that the figure is odd.
`test/saved-designs.js` pins all of it. It is a count in cells, not metres, so it settles
nothing about range rings.

**Every footprint is confirmed off the same session.** The L81 Mortar and the Stingray are
3x3, the Talon 9K-SAM is 2x2, the Indirect Fire Shelter is 5x5 (it was 3x3), the Drill Rig
is 3x3 and six blocks tall (it was 4x4 and four), and the Vanguard CIWS, Bunker and Recon
Tower are the 4x4 they already were. The five that were still unconfirmed matched what was
recorded. All carry a `sizeNote` saying so, and nothing in the catalog is
`sizeConfirmed: false` any more. The mortar had been marked confirmed at 4x4; an owner's
reading outranks whatever that was.

**And every build cost.** The L81 Mortar is 91 build supplies, not 90; the Builder's Radio
and the Drill Rig matched what was recorded. Each carries a `costNote`, and nothing in the
catalog is `costConfirmed: false` any more, so the todo page has no guessed buildable left
to list. The FOB is $2,500 at the vendor, confirmed the same day.

### Click the ground in 3D to stand there, and Space to get over a wall

The walkthrough started you wherever the plan happened to be centred, which was as often
as not inside a box, and there was no way to point at a spot. In the 3D view a figure the
walker's height now follows the pointer over open ground, and a click drops you there facing
the base. `isoGround` is `isoPt` run backwards for z=0; `test/planner-tools.js` holds it to
round-tripping at every turn of the view. Clicking a piece still selects it; right-click
still clears the selection, which is the job a ground click used to do.

**A one block wall is solid on foot, and Space mantles you over it.** It used to be no
obstacle at all: walk at it and the feet snapped up a block in one frame, which read as the
floor lurching rather than as anybody climbing. `walkVaultTarget` finds what is ahead and in
reach, `walkVaultStep` plays the climb over `WALK_VAULT_T` seconds, feet first then body, and
the plan's `VAULT_HEIGHT` still decides what is reachable. **The floor test had to change
with it**: the push leaves you exactly one radius clear, and at exactly one radius float
noise decided whether the wall was also under your feet, so the snap came back by another
door. `walkFloor` now wants the thing under the middle of the body. The suite holds all of
it, and every new check was seen to fail against the previous build first.

### The page turns the way you went

Every turn was the same turn: a move back along the banner looked exactly like a move
forward along it. It now does what acqbench does, from the same Codrops demo. Rightwards
along the banner, the old page shrinks and fades while the new one slides across it from
the right; leftwards is the mirror; a page with no place in the banner (privacy, buildables,
one design) is a layer, so it scales up into place and scales back out on the way off.

**One attribute, set before the first frame.** `src/shared/page-turn.js` reads where the
reader came from off `navigation.activation`, or the referrer without it, ranks both ends
along the banner and puts `data-nav` on `<html>`. It has to run in the head: the transition
takes its animation on the first render, and an attribute set later restarts it part way.
`tools/site/shell.js` inlines it after the stylesheet and `build.ps1` at a new `SITEHEAD`
placeholder in the planner. The download gets neither.

**The planner's copy has the timings written in.** The transition rules are pseudo-elements
on the root, so a token scoped to `header.site` never reached them and `var(--pt-page)`
resolved to nothing there. `tools/site-header-css.js` now substitutes the values into any
lifted `::view-transition` rule. `test/site.js` fails if the planner ships an unresolved
token, and `tools/check-build.js` holds the script's order to the banner's; both were seen
to fail on the bug before being trusted.

### The bow is a Bow, on the game's word

The first reading off the running game: the Equipment Vendor screen files the Compound Bow
under a BOWS tab, where the fan database had it under Equipment. `data/measured.json` now
says `class: Bow`, which outranks the pull, and the class order in `tools/site/context.js`
is keyed on Bow with Equipment kept as the fallback for an unmeasured pull. Every other
primary in the eight vendor tabs matched the data already, so nothing else moved.

## 2026-09-01

### The bar is on the planner too, and pages turn instead of blinking

The planner was the one page you could not leave from: a wordmark, a link home, one boxed
link to the artillery calculator, and the other five pages did not exist from inside it. It
carries the site's banner now, and **the banner, not a version of it**: the first pass drew
a 28px lookalike in hand-written CSS and was sent straight back, which was the right call.
`tools/site-header-css.js` lifts the header rules out of `tools/site/css.js`, resolves the
custom properties they use, and `build.ps1` injects them, so the boxes, the border, the 74px
and the 1180px column are the landing page's own. Every computed property matches the live
header; the only two that differ are the ones a scrollbar moves.

**The palette has to be scoped to the banner**, because the planner calls the yellow
`--accent` and its `--border` is two shades off the site's `--line`. The typography and the
link colour come along too: without them the boxes were right to the pixel around a wordmark
rendering as a blue underlined link. `tools/check-build.js` fails if what shipped is not what
the extractor prints today.

**It cannot go inside `#topbar`**, which was 69px over at 1280 with one link in it. Hence the
artillery link coming out rather than six more going in, and the tool bar's own wordmark
being just PLANNER now: two WARDOGS stacked read as a mistake.

**It says WARDOGS, not WARDOGS Builder**: "Builder" was a second word in the corner of
every page for one tool out of seven, and the nav under it already says which tool you are
in.

The nav is written twice, in `tools/site/shell.js` and in `build.ps1`, because the planner
is built before the site generator runs. `tools/check-build.js` holds the two lists to each
other. **The download gets none of it**: every href points at the website, and dead links in
a file somebody keeps on a disk are worse than no nav. The placeholders are the seam, and an
unreplaced one fails the build the way the ad placeholders do.

**Pages turn rather than blinking white.** `@view-transition{navigation:auto}` in
`tools/site/css.js` and the same block in the planner template, because it needs the opt in
on both documents. No JavaScript, and a browser without it navigates as before. The header
carries a `view-transition-name` and no animation, so the bar sits still while the page
turns under it. It cannot be watched in the preview pane: a hidden document skips every view
transition.

### Ground and air are two fleets, and an unlock is not a price

The only thing that knew a Havoc from a Bobcat was a regex over the names, which held while
every airframe happened to be called AH, MH, UH or Havoc. The vendor files each one as
Ground or Air, pulled into `data/armory-stats.json` with the rest, and the armory rail hangs
Ground, 14, and Air, 6, under Vehicles. The regex survives as the fallback for a vehicle the
source says nothing about. `test/site.js` holds every vehicle to carrying a pulled class.

**The unlock is the bigger number.** The L2A6 is $14,000 at the vendor and career level 35
plus $500,000 to open, and only the $14,000 was on the site. Role, level and cash are pulled
for 198 items and printed as the last row of the panel. The five vehicles nothing is
published for say so, because a missing row on an otherwise full panel reads as "there is no
unlock", and for a tank that is a lie somebody plans around.

### An AK stops being offered GGX magazines

Fitment was read off the name: a leading token that pointed at exactly one weapon owned the
attachment, and everything else was treated as universal. A name is not a fitment. The
vendor states both the slot and the weapons for each attachment, and both are pulled into
`data/armory-stats.json` now: 137 of 146 carry it, and the nine it says nothing about keep
the old guess. The AK74 offers its own three magazines and nothing else.

**Unfinished items are off the shelves.** The AT4 Mag was offered on every weapon in the
game, because naming no fitment reads the same as a source that says nothing. The source
marks it unfinished; the armory still lists it, since a catalogue is the point there.

### Nothing on either calculator moves when you press a chip

Pressing a level 4 vest moved every pixel below the damage calculator by 128px: the hatching
sentence ran from three lines to five, and it sat in the figure's column, which was setting
the height of the whole row. It sits with the other prose in the readout column, which is
shorter than the figure and has room to grow into, and its tallest state is reserved. On the
loadout page a long attachment name wrapped its own slot to two lines and pushed the row
under it down; the slot has two lines of room whether the name uses them or not. Both
measured after: zero movement.

### The loadout's weapon shelf is cut into classes, from the same list as the damage page's

Thirty-four weapons in one grid is a wall you read rather than a shelf you pick from. The
primary shelf carries a row of classes now, opens on the class of the weapon already in the
slot, and falls back to the first in the order on an empty one. The three tac vests and the
other short shelves are untouched: only the ones worth cutting take a `split` flag.

**The order lives in `tools/site/context.js`**, with the labels, since both shelves sort by
it and a second copy is how they come to disagree about where the shotguns go. The damage
page maps the measured sheet's spellings onto it, because the sheet says SMG where the item
database says Submachine Gun.

**Every weapon carries the class the vendor files it under**, pulled into
`data/armory-stats.json`. The Compound Bow is filed under Equipment there and is a primary
weapon here, so the chip reads Bows and the pulled value is untouched underneath.

### The front page leads with what the site is for

The kicker read "Fan-made reference for WARDOGS", which is the disclaimer, and the footer
already carries that in the place that has to. It reads **Everything WARDOGS**. Two words:
every longer version came out in the same shape, a noun phrase and a snappy fragment after a
comma, which the owner reads as machine-written.

The "Where the figures come from" banner is off the front page. Every page that carries a
figure says where that figure came from beside the figure, which is where it gets read, and
the two counts in it are still on the pages they describe.

### A weapon with no rate of fire stops looking broken

The PKM has measured damage and no measured rate of fire, so the figure was painting all
nine zones the colour of a thing it does not know: a grey mannequin beside a panel
confidently reading 36.9 damage and three shots to kill. The zones carry **shots to kill**
instead, on the same four bands, and the caption says which measure it is showing. The
readout's two dashes say why they are dashes.

Searched again for a published rate: MetaForge carries none for any weapon, wardogs.zone
lists none, and the 28 the page does have were derived by `tools/solve-ballistics.js` from a
shots-and-time table that has no PKM row. It has to be counted in game, which
`tools/measure.js "PKM" rpm <n>` takes.

The ranking keeps the neutral bar and the dash for that weapon: its legend says colour is
time to kill, and painting a shots-based colour into a row under that legend would be a lie.
The figure can say it because it has a caption and the ranking does not.

## 2026-08-31

### The walkthrough starts where you were looking

It used to drop everyone at a fixed point six cells south of the whole base, facing it,
with no way to ask for anywhere else. Owner's words: it puts your character outside the
perimeter, and there was no way to pick a spot.

**The plan is the control, so no button had to be found for it.** `view.x, view.y` is the
world point under the middle of the plan, so panning is already how you choose. A
selection beats it, because selecting a piece and asking to walk is as explicit as it
gets. Empty plan keeps a fixed spot, since there is no view worth honouring.

Then pushed clear of whatever the spot was inside, so picking the middle of a bunker
leaves you beside it, and stood on whatever is underfoot, so a spot on a wall starts you
on the wall. Walking in off the treeline is still there: pan outside the wire first.

The status bar says which of the two it used, because the plan is not on screen to check.

### The target follows you down the ranking, and no row wraps

The ranking is every weapon against **one zone under one set of armour**, and once the
calculator had scrolled off, nothing on the page said which. A strip appears when the
calculator goes and the ranking is what you are reading: 22px of figure with the zone lit,
the setup in words, and the zones as chips so you can change target where you are. Pressing
the words goes back up. It is fixed rather than sticky, so nothing moves when it arrives, and
under 1180px it covers the nav instead of stacking under it: two bars on a phone is most of
the first screen.

**It reads scroll position rather than an IntersectionObserver.** The state wanted is a
relationship between two elements and the viewport, which one comparison of two rectangles
says directly and two observers say between them with a pair of flags. It also runs on load,
where an observer has to be waited for.

**"Bushmaster M17S Assault Rifle" wrapped**, so that row was twice the height of its
neighbours and the eye stopped there. Assault Rifle reads AR and Marksman reads DMR in the
rows, the spoken names stay on the chips where there is room, and the name cell cannot wrap
whatever is in it. Every row is 36px.

### The Recon Tower is climbable, and still not a way over your own wall

Owner's call, and the tags say both halves of it: `climbable` because the tower's own
description is "raised firing positions accessible by ladder", and `climb-inside` because
what you reach is a deck inside it.

**The walkthrough has no interiors.** Every piece is a solid box. Laddering the tower would
put the walker on its roof instead, and standing on the roof of a 4x4 five block tower means
walking off the far side: that is climbing over, which is the one thing climbing a recon
tower is not. So it stays solid here. The deck height is not in the data and is not guessed.

**`walkClimbable` is a function on purpose.** The first cut inlined the rule and the test
restated it, so the test passed while the rule was wrong. Same shape as the Bremer cap bug
the day before. The suite lifts the real function now.

### You can vault, climb and fall, and the Bremer cap finally does something

**The walker has a height now.** Feet, gravity, step up, fall off. Eye rides on the feet.

**How high you can get on foot is VAULT_HEIGHT, the plan's own constant.** Not a new
number. The panel grades every wall run against it and the walkthrough is where you go to
check that grade, so a second number would let the panel call a run vaultable while the
view bounced you off it, and both would look right.

**Bremer cap was broken, and had been all along.** `computeClimb` walked `cover` only, and
a Bremer's role is `barrier`, so the cap was never in the list. The panel told you to cap
a wall with one and then graded the capped wall vaultable on foot. Found by walking at one
and being stopped by a wall the plan called a way in.

The old check asserted the *source* contained `capped ? "secure"`. It did. It passed the
whole time. Replaced with one that builds a capped run and reads the verdict.

**Climbable is a ladder, not a hole.** First cut gave climbable pieces unlimited step, which
stops them being solid at all: you cross a Loudspeaker's two cells in well under a second,
rise a fraction of its five blocks, and come out the far side having climbed nothing. It
stays solid and you go up it while you press into it.

**anti-climb and climbable are read off the catalog tags**, which are the game's own words:
"final anti-climb layer", "Climbable loudspeaker tower".

### Doors and gates open, and you can walk through them

**They swing, and that is the catalog talking.** The Door "needs back-wall clearance to
swing", the Gate "swings through". Four wide gate is two leaves apart, one wide door is
one leaf. Nothing here was picked by eye.

**A leaf is a panel, not the footprint.** Footprint depth is the wall the entry sits in.
Swinging all of it puts the leaf back across the corner of its own doorway: unnoticeable
on the gate, since two cells stay clear up the middle, and fatal on the door, where 0.5
cells are left for a 0.64 cell walker. The door opened and you still bounced off it.

**They open on approach, not on a key.** The Door's description says "Auto-closes", so a
key would be inventing a control the game does not have. Two distances, 3.2 m to open and
4.4 m to shut, so a door you are standing in does not chatter.

**Open state is not saved.** It lives in `walk.doors`. A door left ajar is not something
anyone meant to keep, and the share format is already spread over four places.

**Pinned by walking a body through, not sampling a point.** A point test is exactly what
missed this: the middle of the doorway is clear either way, and clearance is what is not.
`test/planner-tools.js`, proven red on a full-depth leaf, a leaf that never swings, and a
leaf deleted instead of moved.

### You can stand in the base and walk round it

**Third state on the 3D button, not a fourth button.** The toolbar is capped at ten and
the isometric view already fills it. Plan, then 3D, then Walk, and the label always names
where the next press goes. Key 3 cycles the same way.

**Hand written WebGL, no library.** three.js is about 150 KB gzipped. The planner ships as
one downloadable file with no network, so that weight is paid by every download forever.
One cube, one shader, flat shading off the face normal.

**A person is sized from the metre figure the app already prints, not guessed.** The status
bar says a cell is about 1.2 m. First cut set eye height to 1.65 *blocks* off a wall
description, making the walker 1.98 m and its sprint 10.8 m/s, faster than the world
record. Nothing in the view shows this: everything scales together, so a base full of
giants looks normal. Now one `CELL_M` and every walk dimension divided by it.
Pinned by `test/planner-tools.js`, proven red on all three.

**Ground grid and fog.** Without a grid, walking on open ground looks like standing still.
Fog to the clear colour so the ground ends at a horizon and not a visible edge.

**Collision is a circle against a rotated rect.** A box round an angled wall would stop you
a foot short of everything, and angled runs are what this view exists to look at. Being
inside a solid pushes you out the nearest face rather than trapping you.

**Stage one only. Doors and gates are solid**, and the hint says so. Opening them is next.

### The ranking lists every load, draws what you sorted by, and compares two rows

**One row per weapon and load.** With no filter on, the M4 is three rows, one for each round
it chambers. Asking to see everything and being shown each weapon on whichever round it
happened to fall back to was the page answering a question nobody asked. 81 rows where there
were 29; picking a load narrows it to that one.

**The bar draws the column you sorted by**, inverted for time and shots where lower is
better. That is what puts the PKM back on the chart: it has no rate of fire, so it draws no
bar under time, and a full one the moment you rank by damage.

**Two rows can be compared.** Clicking picks a row, up to three, and the picks sit above the
list as one small table with damage, shots, rate, time and the zones each is one shot at,
with a button to set one up in the calculator. Comparing two weapons was reading a row,
scrolling, and remembering it.

**"One shot" was in two neighbouring cells**, the time and the shots. Time reads instant.

**The chips are buttons.** They were cells in a grey band that spanned the column, so eight
of them over a 1180px page drew four hundred pixels of empty grey and read as a broken table.
Each carries its own edge now, and the row is as wide as what is in it.

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

Owner's call. The map had width to spare that a firing solution never needed, so a 300px
right rail takes it, with a horizontal unit under the tool and the in-article unit gone from
the middle of the reference.

**The rail's grid track is `auto` with the width on the rail itself, and that is
deliberate.** An unfilled unit hides the rail, and a hidden item in an auto track takes no
width, so the map gets the space back with no second rule to keep in step. A fixed 300px
track would leave a strip of nothing beside the map every time Google declined to fill.
Below 1280px the rail moves under the map rather than being hidden, because a unit that is
requested and then `display:none`'d is an impression nobody can see.

`.amap-body.has-rail` is two classes and beats a bare `.amap-body` from inside a media query
as easily as outside one, so the collapsed layouts have to name it. That is the one way this
breaks quietly. **`artilleryRight` and `artilleryFoot` ship with empty ids**: the placements
exist, nothing is emitted, and the check that every slot reaches a page skips an empty one on
purpose.

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

### Nothing is chosen from a dropdown, and the loadout page is the vendor

Ten dropdowns with no pictures became the in-game equipment vendor, checked against beta
footage: Equipment, Gear and Items tabs, a card per slot with art and price, and the
magazine built mag plus round times count. A dropdown hides every option and shows words,
which is wrong for a shelf where recognising the item is the task, so all three catalogue
pages click the thing. Armory keeps a card grid with the table behind a toggle, over one
filter and one sort, and **an unconfirmed price sorts to the bottom in both directions**:
a blank is not the cheapest thing. On the damage page `setWeapon` is the only way `S.w`
changes.

**Weight and a cash balance are deliberately missing.** No weight is confirmed, and no
planner knows your wallet. 495 icons come from the wardogs.zone wiki via
`tools/pull-game-icons.js`; see [game-icons](objects/data/game-icons.md).

**The trap, twice.** `.vcard` and `.acard` are `display:flex`, which beats the `hidden`
attribute UA `display:none`. Filtered-out cards stayed visible while the script believed
otherwise. Anything given a display must say what hidden means for it.

### 3D view, six passes condensed

All pinned in `test/elevation.js`. `git log` has the reasoning.

**Draw order is a graph, not a sort**: ordering by distance to each middle drew short pieces
over long, so only overlapping pairs are ordered. **A piece is a prism over its four
corners**, not its bounding box, since a 4x4 at 45 degrees has a box 5.66 across. **Runs,
not boxes**: sides joined to a same-wall neighbour are interior, 612 edges down to 209 on 51
pieces, and the seam mask is in world directions and checked as arithmetic at every angle,
because suppressing the wrong side looks almost right. **Height is the job**, a block stands
1.45 times ground scale against a 0.866 cell. **Colour is by material and the key cannot
lie**, so role, colour, label and key list move together. **Writing is drawn last**, or a
piece dropped nearby paints over its label.

### Older entries, condensed

Each one carries the file that pins it, and `git show` still has the full story.

- **Every armory item opens a panel**, joined from `data/ballistics.json` and asserted by
  count in `tools/check-build.js`. Three not to undo: stored armour is what armour takes
  and the panel prints what gets through; the two weapon lists spell calibres differently
  (an id against a label), so the panel resolves ids; `/vehicles/` is a meta refresh to
  `/armory/`, not a deletion, because Pages cannot send a 301. The `<dialog>` close event
  never fires in the browser this was built against, so `shut()` restores focus itself.
- **Your designs sit under the community's on `/designs/`**, drawn by the one renderer
  `/account/` also uses; `test/site.js` compares the script blocks. Publishing clears the
  cached reply before redraw. The public list loads twelve at a time behind a real Show
  more button, which scroll only presses early.
- **Nav boxes are all 100px**, and the header takes its own row below 1180px and wraps,
  which fixed a 220px sideways scroll at 1000px.
- **Map zoom stops at the fit, and the coarse tile fallback is read-only.** `clampCam` holds
  the artillery map at the fit; the fallback used to request every missing ancestor, which
  was the request storm the retry logic exists to survive. Cache capped at 360, never the
  base. Do not copy wardogs-artillery.com's zoom pick, it upscales on 2x displays.
- **A bag is required before items on the loadout page.** Items and magazine count lock until
  a bag is chosen; worn kit is not gated. `tools/build-armory.js` refuses a weight total
  while any piece is unweighed, because a light total and an unweighed rifle read the same.
- **Three weapons had the wrong class**: Scout Rifle TD is a sniper, FAL an assault rifle,
  GGX 18 a pistol. Class is stated in `data/ballistics.json` and `ROWS` in
  `tools/solve-ballistics.js`; fix both. Calculator stages run through `stage()` so one
  failing does not take the page down.
- **Designs carry tags and filter on them.** Vocabulary lives in `data/community.json`
  only; the worker holds no copy and checks only id shape, a cap of eight and one `map-`
  tag. Tags are asked at publish and do not travel in the share code. `test/tags.js` holds
  both built files to the vocabulary.
- **Owner is a Discord id, not a name.** `/me` answers `owner:true` for `OWNER_DISCORD_ID`;
  it decides what a page shows, never what `/admin` does, which still wants `ADMIN_TOKEN`.
- **Not everything worth hardening is in the code.** Pages cannot set response headers, so no
  CSP, HSTS or rate limit exists; the 132 MB of game art is held to avoid hotlinking and is
  enumerable. Raising the ceiling means Cloudflare proxying the domain, see
  [security](processes/security.md).
- **Grouping angle comes off the page.** Spread traced to one ungrounded source, and the
  check guarding it only proved that site's own multiplication. `test/artillery.js` checks
  the absence; the mil dial stays because three sources publish mil tables.
- **Community cards carry a picture of the base, from one decoder.** The two share-format
  encoders had drifted once, so `src/shared/design-view.js` is the only decoder, inlined into
  the planner by `build.ps1` and into the pages by `client-scripts.js`. `test/thumbnails.js`.
- **Your own work is yours to take back.** `POST /withdraw` lets the submitting account
  remove its design; `by` is never returned publicly, and `removeDesign` takes record, votes
  and comments together. `test/worker.mjs`.
- **The update chip refetches with cache "reload"**, on focus and every five minutes,
  because Pages serves `max-age=600` and a plain reload can hand back the old build.
- **Crew size rides inside the share code.** Three buckets under `crewSizes`; the planner
  refuses to submit without one. Old codes lack the key, old readers ignore it, and the
  alphabet is unchanged, so no worker deploy. `test/crew.js`.
- **Firing solution explains itself.** Every label opens an explanation. The dial tip is
  written per arc, since more mils is less range on the high arc and more on the low. Do not
  say a full circle is 6,400 mils: nobody has checked what the sight shows.
- **Build zone is 200**, on the owner's word, still `radiusConfirmed:false`. Eight `|| 100`
  became one `fobZone()`; two literals stay in the share encoders because 100 is the wire
  default and `test/share-links.js` needs both encoders byte-identical.
- **Damage page shows the gun.** Weapon art under the picker and an icon on every ranking
  row, joined off the armory slug. `.rname` must not be a flex row: that split wrapped names.
- **A generated file its generator no longer makes.** `build.ps1` runs `build-armory.js
  --check` and refuses on a mismatch, since overwriting is what hid the last one.
- **Map: black squares and a shudder.** A failed tile retries three times with backoff
  instead of dying for the session, a missing tile draws from a coarser one, wheel events
  ask for a frame, and zoom scales by the actual delta rather than a flat step.
- **Old designs take the current build zone.** 100 was the default, not a choice, so a
  design or share code with no zone opens on the catalog figure. `test/saved-designs.js`.
- **3D: a storey is a count, not a height.** `p.level` is pieces stacked under one;
  `standHeights` derives real height from what a piece stands on. `test/elevation.js`.
- **3D turns 15 degrees, not 90**, with buttons and Q/E, so a wall shows length and face
  at once. The exact sort holds at any angle.
- **Nav is one centred group.** A `flex:1` gap span opened a hole between two links.
  Nothing ranks the tools above the references now; use order, not a gap, to change that.
- **Artillery map always draws spawns.** A gun position is chosen against them.
- **Design cards are the same size.** Cards sized by their contents came out ragged. Rows
  stretch and the action row drops to the bottom; the last of it was an inline
  `style="margin-top:14px"` beating the stylesheet.
- **Two colours that meant different things looked the same.** The vehicle dash vanished on
  hesco gold and the climb dash sat 5.5 from the fault outline in Lab. Both are now chosen
  against all six storeys of all six wall roles, worst case 28.3 and 33.5. **A role colour is
  not what gets painted:** a piece is filled with `shade(base, -62 + 13 per storey)`, and
  comparing against the role colour gives a number that is not the one on screen.
- **The designs page stopped spending space on nothing**, and **the line promising
  submissions are read before they go up went with it: that stopped being true when the queue
  was removed.**
- **Sign out moved under your name**, out of the busiest row: the one destructive account
  action was a header link level with everything else.
- **"Plan your FOB" stopped sitting on your base.** The invitation was hidden only in
  `afterChange`, which a design arriving at boot never enters, so a share link drew the base
  with the invitation over it. `drawNow` decides it. `test/planner-tools.js`.
- **Two bugs found alongside a redesign.** A chosen chip was invisible: `.seg button` set a
  transparent background after `button.active` at equal specificity. And a reopened base
  showed zero build cost, because `loadCurrent` is reached from a promise and lands after
  startup has computed everything from an empty design.
- **Ctrl+V pastes.** Plain letters were matched before Ctrl combinations in one if-else
  chain, so Ctrl+V toggled 3D. Modified keys are handled first, in a block **that returns**.
  3D moved to 3. `test/planner-tools.js`.
- **Fewer buttons up top.** Fifteen controls, four doing one job, became nine. Share, Export
  and PNG are one menu; Import is in Designs; the catalog editor is in Help.
  `test/planner-tools.js` counts what shows rather than names, because buttons creep back one
  at a time.
- **Turning a selection turns the group.** `rotateSelection` spun every piece where it stood.
  It turns about the selection's centre, put on the grid first so four quarter turns land back
  exactly. `test/planner-tools.js`. In the worker, `/designs` lists what is not hidden rather
  than what was approved, which had stranded three submissions; that needed a wrangler deploy.
- **A run steps along the piece, not down the drag.** Three causes: `snapPoint` snaps in the
  piece's own frame, `snapPlace` measures from the nearest same kind and angle, and a run walks
  the two moves a piece can make and still touch rather than spacing by extent along the drag.
  `wallGap` measured upright boxes, so a flush turned wall reported a break. `test/runs.js`.
- **A way in is a run, and only where somebody can stand** (`e9868d9`). `climbRuns` groups
  touching pieces of one verdict; `reachableFromOutside` floods from beyond the bounds, and
  wire does not stop it. Past the cell budget everything is called reachable: **over-reporting
  is the safe way to be wrong about a way in.** `test/planner.js`.
- **A gap you cannot see is named, not merged away** (`e9868d9`). `hairlineGap` states the
  distance rather than closing it: **widening the merge tolerance would make the plan lie about
  a hole in a wall.** `test/issues.js`.
- **The panel leads with pallets** (`592ad7c`). `pallets = ceil((supplies - startingSupplies)
  / suppliesPerPallet)`, computed identically in `tools/site/context.js`, after help text said
  1,900 against a catalog saying 1,800 for months.
- **One wall draws as one wall** (`615fab9`, then `41488cb`). **`41488cb` is the half that
  matters: seam bits are worked out in world space and drawn inside `ctx.rotate()`, so a
  rotated wall suppressed the wrong edges. Read that commit before touching either.**
- **The front page says what the site is for** (`c5e57bf`). **Guides were removed in full,
  generator and prose and sitemap, so `/guides/` and the four guide URLs return 404.
  Deliberate, not an oversight.**

## Where the rest lives

- what a change will break: [effects/CONTEXT.md](effects/CONTEXT.md)
- what is unfinished: [OPEN.md](OPEN.md)
- why a check exists: [objects/guards/verification.md](objects/guards/verification.md)
- the planner itself: [objects/planner/planner-app.md](objects/planner/planner-app.md)
