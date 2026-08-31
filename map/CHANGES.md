# What changed, and why

`git log` is the full record. This is the shorter one: the decisions a later reader is most
likely to undo by accident, each with the reason that does not fit in a diff and the check
that pins it. If this file and the code disagree, the code is right and this is stale.

Newest first. One entry per decision, not per commit.

## 2026-08-31

### The loadout page is the vendor now, and it has the game's own icons

The page was ten bare dropdowns with three inline widths and no picture of anything. It is
now shaped after the equipment vendor you buy a kit from in game, checked against beta
footage rather than imagined: Equipment, Gear and Items tabs, a card per slot carrying the
item's art and a price tag, and the magazine built the way the vendor builds it, mag plus
round times a count equals a loaded mag. Every panel is in the page whatever the script
does; the tabs only choose what is on screen.

**Two things the game shows are deliberately missing.** Weight, because no weight figure is
confirmed here and a bar drawn from a guess is worse than none. And a cash balance, because
no planner knows your wallet; what the kit costs takes that place.

The art is 495 icons off the wardogs.zone wiki, fetched by `tools/pull-game-icons.js` into
`docs/game-icons/`. Mechanism and its four checks: [game-icons](objects/data/game-icons.md).
The damage page can take the same icons next, since armory items now carry the slug and
ballistics already joins on the armory name.

### The damage page shows the gun it is talking about

The weapon art sits under the picker, and every ranking row carries its weapon. All 28
weapons and 30 vendor round names joined first try: the slug rides on the armory item and
this page already joins the armory by exact vendor name for prices.

**`.rname` must not be a flex row.** Making it one to hold the icon turned every wrapped
name into two columns. The icon is inline with a baseline nudge, and the name column went
168px to 210px to pay for it.

### A generated file that its generator no longer makes

`data/armory.json` was committed carrying 323 icon slugs without the `tools/build-armory.js`
change behind them. Nothing noticed: that generator is run by hand and nothing compared the
two, so the next regeneration would have stripped every icon off the loadout page.

`build.ps1` now runs `tools/build-armory.js --check`, which rebuilds into memory and
**refuses** if the committed file disagrees. Refusing rather than overwriting is the point:
overwriting is what hid this, and a silent repair leaves the wrong generator in the tree.
Proved by replaying the real commit, where the old generator did not have the flag, quietly
overwrote the file and exited zero.

The armory card claimed all along that a hand-edit is what "the next build will either
overwrite or refuse". True for ballistics, not for the armory, until now.

### Two black squares on the map, and a shudder on the way in

Both came from the same place: a tile that is not in hand yet draws nothing, and nothing on
this canvas is black.

A tile whose request failed was marked dead for the session and never asked for again. The
failure is almost never a missing file. Every tile is present at every level, checked. It is
the browser cancelling requests when a fast zoom starts a hundred of them at once, and those
tiles then stayed black for as long as the page was open, which is what was on screen. It
retries now, three times, backing off, before giving up for real.

And a square with no tile yet is drawn from the piece of a coarser tile that covers it, up
to three levels up. Changing zoom level used to empty the screen until the new level
arrived, so the terrain blinked out and came back on every step in. Now it goes soft for a
moment and sharpens, which is what every map does and what "seamless" means here.

Two more things that made it feel worse than it was. A wheel sends events faster than the
screen refreshes and every one of them ran a full draw, so a quick zoom ran several draws
inside one frame; they ask for a frame now and the frame draws once. And zoom stepped a flat
1.2 per event no matter how far the wheel turned, so a trackpad's stream of small deltas
arrived as a stack of 20 percent jumps. It scales by the actual delta, with line and page
delta modes converted, so a notch lands where it always did and a glide is continuous.

### The grouping angle comes off the page

Spread is gone from every firing solution, table row and platform card, along with the
dashed circle it drew round the target. It traced to one ungrounded source: wardogshub
publishes 50 MOA for the mortar and 10 for the SPH-2 and never says where from. djzet, where
the firing table comes from, never mentions dispersion; wardogs-artillery.com reports only
distance, azimuth and the MIL value. No game shows a player an MOA figure anyway.

**The check that guarded it was the worst kind.** It proved spread reproduces all four
published figures from the MOA alone, which it does, because the site publishing both did
the same multiplication. A check on arithmetic that reads like a check on a measurement is
worse than no check: it made an ungrounded number look verified for as long as it stood.

What replaces it is an open item saying nobody has measured the scatter and how to settle
it: ten rounds at one dial from one position, at a known range. `test/artillery.js` checks
the absence, in the data and on the built page, allowing the word so the open item can
explain itself while forbidding a figure. Proved against a reintroduced `moa` and a planted
Spread cell. **The dial stays**: three sources publish mil tables and the gun takes a mil
elevation, so it has ground under it in a way the spread never did.

### The firing solution explains itself

Every label in the solution panel opens an explanation on hover, tap or tab. The spread half
of this is superseded: the grouping angle came off the page entirely, above.

**The dial tip is written per arc on purpose.** More mils is less range on the mortar and on
the high arc, and more range on the low arc, so one rule for both misleads half the time.

**It does not say a full circle is 6,400 mils, and it must not.** That is true of the NATO
mil and unchecked here: two sources read different scales off this mortar and nobody has
noted what the sight shows. The tip claims only what the tables are written in. Do not add
the 6,400 back without firing the gun first.

Reload came out of the panel: nothing about it changes with where the gun or target is, so
it was reference material sitting in a readout. It lives on the platform card.

### Design cards are the same size as each other

One design carries a note and the next does not, so left to their contents the cards came out
ragged, which reads as a broken layout rather than as two different designs. The row stretches
now, the card fills its share, and the action row drops to the bottom so the buttons line up
across a row instead of floating wherever the text above them happened to end.

The last of that took finding: the row had `style="margin-top:14px"` written inline on it,
and an inline style beats any stylesheet rule, so the rule meant to drop it to the bottom was
being ignored. Measured after: both cards 436 tall, both action rows at the same pixel.

### The planner says PLANNER, and the build zone is 200

The top left of the planner read WARDOGS BASE BUILDER; it reads WARDOGS PLANNER now, which
is what the page is.

The FOB build zone went from 100 cells square to 200, on the owner’s word rather than off
the game: it is a better estimate and it stays `radiusConfirmed: false`, because nobody has
stood at the edge of one and counted. That flag is what keeps range rings off the plan, and
it has not moved.

Changing it turned up the duplication that always comes with a figure like this: eight
copies of `|| 100` scattered through the planner, one beside every use. They are one
`fobZone()` now, which falls back to the catalog rather than to a number typed next to it.
Two literals stay, both inside the share encoders, and there is a comment saying why: that
100 is the wire format default, the site generator writes the same one, and
`test/share-links.js` requires the two encoders to emit identical bytes. Reading the catalog
there would tie the format to a value a player can edit and the same base would encode
differently on each side.

A design records its own zone, so bases drawn before today keep 100 and can be corrected in
the panel. Nothing rewrites them.

### The vehicle dash is chosen against every wall it can land on

The amber was near enough to hesco gold to disappear on it, worst at the top of the range
where the storey shading has lightened the wall most: 13.7 apart at the sixth storey.

It is picked against every fill it can ever be drawn on now, all six storeys of all six wall
roles, and chosen for the worst of those rather than the average: 28.3 against 13.7, still
63.4 from the foot dash and still inside the warm pair the two ways in share. A search over
the whole space offered better numbers by leaving that family, and they were not taken: the
two ways in reading as siblings is worth more than the extra distance.

### A fault and a way in stop looking the same

Not this session own work: another session was part way through this in the same file, and
it is committed here rather than left to be rebuilt or clobbered.

A fault outline was #f04a2e and the foot climb dash #f0503a, 5.5 apart in Lab, which is not
a difference anybody can see on a plan. A fault is the danger colour now, which is what it
always meant, and the two ways in take a warm pair of their own: 34.9 from the fault and
33.5 from each other, both measured rather than eyeballed. The legend under the plan had
already drifted off the canvas colours, drawing the foot count in --danger and the vehicle
count in --accent, so neither number matched the dash beside it. One constant each, canvas
and legend both.

Every figure in the comment was recomputed before shipping it and all of them hold, except a
claim that nothing else on the canvas comes nearer than 21. Chasing that produced a wrong
answer of my own first, which is worth writing down: I compared the vehicle dash to the role
colour and got 13.9, then called it the commonest case. The role colour is not what gets
painted. A piece is filled with shade(base, -62 + 13 per storey), so on the ground it is far
darker than its own swatch and the real gap there is 30.2, not 13.9.

The 13.7 that does matter is the worst case rather than the common one: by the sixth storey
the fill has lightened to within 13.7 of the dash, and a marking you cannot see on the one
wall high enough to need it is no marking. Fixed in the next entry.

### The draw order was sorted by the middle of each piece

Reported as a yellow wall not carrying on through: a notch bitten out of a hesco run where a
bremer stood behind it. Pieces were drawn in order of how far the middle of each was from the
camera, and `docs/3d-view-design.md` said in as many words that this was exact. It is not. A
four cell wall reaches two cells past its own middle, so a single block behind one end had the
larger depth, sorted in front of the whole wall, and painted over it.

Sorting by one number cannot answer this, because the answer is an order rather than a value.
For boxes square on the world axes the rule is exact: A is behind B if A lies wholly on the
far side of B along one axis. `paintOrder` builds that as a graph and walks it, seeded from
the depth order so ties stay stable and nothing flickers as the camera moves. Only pairs that
overlap on screen are asked, found through a coarse screen grid, so the cost tracks what the
base looks like rather than the square of how many pieces are in it: 0.7 ms for 117 pieces,
3.2 ms for 624, against a sixteen millisecond frame.

Measured on the reported arrangement: four pairs drawn over something they stood behind,
now none. On a 624 piece base, 3,066 overlapping pairs and none wrong. `test/elevation.js`
audits the real order against the rule at all four spins, and reverting to the old sort fails
six of its checks.

The doc has been corrected rather than quietly fixed around it: it claimed a box further away
always has a smaller x + y, which is only true of its own middle, and a piece is not its
middle.

### The 3D drew a box around the piece, not the piece

Reported as random shapes near the FOB. A turned piece was drawn from its axis aligned
bounding box: a 4x4 recon tower at forty five degrees has a box 5.66 across, so it came out
half again too wide and square on when the piece is a diamond. The plan and the 3D disagreed
about the footprint, which is the one thing this tool exists to be right about.

A piece is a prism over its own four corners now. Which sides face the camera is worked out
per piece from where each one points rather than from the spin, so a turned piece is handled
the same way a square on one is, and the seam suppression follows: a side only claims a world
direction when it really looks along one, so a turned piece suppresses nothing against a grid
it does not sit on. At exactly forty five degrees one side faces the camera and the two beside
it are edge on, which is why only one is drawn.

**The FOB stood a third of a block tall** while the catalog calls it two, so the piece the
whole base is built around lay flat on the floor in the view whose job is height. It stands
up like everything else, and the fit was given the same number so the two cannot disagree.

**And the plan draws its writing last.** Names, height chips and note marks were drawn as
each piece was drawn, so any piece drawn afterwards painted over them: the label of the thing
you were pointing at could be underneath a tower dropped beside it, which is exactly when you
wanted to read it. They are writing about the plan rather than part of it, so they go on last,
over all of it.

### The camera sits higher

The textbook isometric puts the eye about thirty degrees above the ground, which is a low
angle to plan a footprint from: a perimeter comes out as a thin band and you read the walls
rather than the shape. `ISO_TILT` raises it. The walls keep their height while the ground
opens toward the overhead plan, because height here is a fixed offset up the screen rather
than something the tilt foreshortens. Not a real camera, and that is the point: the plan
answers where things are, this answers how tall, and this angle reads as much of both at
once as it can.

That exposed one more thing. `fit3D` measured the ground across and nothing else, so it
never saw the height it was about to draw, and a base fitted to the width and ran off the
top. It projects the eight corners of the whole volume now and fits what actually lands on
screen, in both directions.

### The 3D view, second pass: seamless runs, real height, and concrete

Three things, all reported off the same screen.

**The lining that was left.** The first pass skipped a vertical face when that face own side
was joined, and missed the case that matters most. A run along x has every piece joined on
its plus and minus x sides, so the face pointing at the camera went, but the long side is
joined to nothing and every piece still drew its whole side quad, uprights included: a
vertical line at every join, down the length of the wall. An upright stands on a direction,
so it goes when that direction is joined, and a vertical face never draws its top edge
because the roof already draws that line. Measured on a fifty one piece base: 612 edges down
to 209, two thirds fewer.

**Height.** A block was drawn one cell tall against a cell being 0.866 wide, so a two block
wall and a five block tower differed by three faint steps, in the one view whose whole job is
to answer how tall. `ISO_Z` stands a block 1.45 times the ground scale. It is not a lie
about the geometry: footprints are read on the plan, and this is where you look at what
stands up.

**Bremer walls are concrete.** A bremer is a poured slab and a hesco is a wire basket full of
dirt, and they were the same gold, so a mixed perimeter read as one material. Its own role
now, in a pale concrete kept apart from the tower grey so the two concretes are still told
apart. One consequence worth knowing rather than tripping over: runs merge by role, so a
hesco meeting a bremer now shows the join between them. That is correct once they are
different materials, but it is a behaviour change and `test/elevation.js` says so out loud.

### A tower is not a wall

Bunker and recon tower were painted the same gold as the hesco walls they stand behind, so a
five block tower read as a tall wall. That is only wrong where height is the thing you are
looking at, which is the 3D view, and that is where it was reported from. They are their own
role now, in concrete rather than gold: deliberately desaturated, because a structure you get
inside should not compete with the wall in front of it.

Four things had to move together or the key would lie: the role on the piece, the colour for
that role, the label, and the list the key is built from. `test/elevation.js` checks all
four, that the new colour is far enough from the wall colour to tell at a glance, that it is
far enough from every other role too, and that no piece is left pointing at a role the key
cannot explain.

### The 3D view draws runs, not boxes

A perimeter is one wall to the person who built it and thirty outlined boxes to the
renderer, and it drew all thirty. The view came out as a field of lines with a base
somewhere inside it, which is what got reported as it not looking clean.

An edge shared with a neighbour that the plan already calls part of the same wall is
interior: it is not the shape of anything. The two vertical faces are skipped outright when
that side is joined, and the roof is stroked edge by edge rather than as one closed quad, so
a run keeps only its own outline. Measured on a twenty six piece perimeter: 372 edges down
to 240, a third fewer lines, and the walls read as slabs.

The seam mask is in world directions and the two visible vertical faces depend on how the
world is spun, so the spin picks which bit to ask about. `test/elevation.js` checks that
pairing at all four spins as arithmetic rather than by eye, because suppressing the wrong
side is the failure that would look almost right.

The climb marking had the same shape of bug: it said a vehicle can get over this wall once
per block, so a crossable perimeter came back as a dashed ladder. It rings the run now.

**A picked piece is filled rather than outlined.** A hesco wall is already gold, so a gold
outline on one answered nothing: measured, the chosen piece was within a few points of its
neighbours. Its top face is now 73 luminance points brighter than the wall it sits in, and
it is outlined in cream, which no buildable uses. A selected or faulted piece also keeps its
whole outline, since there the point is to find one piece rather than to read a shape.

### How many players it takes to hold the base

The one figure on a plan nobody can measure. Everything else here is read off the game or
worked out from it; this is the person who built the base saying who it is for. Three
buckets, 1 to 2, 3 to 5, 6 to 10, in `data/buildables.json` under `crewSizes` like every
other figure, so the planner and the community list read one list rather than each spelling
it out. The planner asks in the panel, under **Who holds it**, and refuses to submit a design
without an answer, because the list shows it against every entry and a blank there is worse
than the question.

**It rides inside the share code rather than beside it in the submission record.** One copy
of the answer, and it survives a base being passed on as a link, saved, exported and opened
somewhere else. The head of both format versions is JSON, so the key is simply absent from
every code written before this and old readers ignore a new one; the alphabet does not
change, which is the part that would have made it a worker deploy. A value that is not one
of the three is dropped rather than kept, so a hand-edited code cannot put text on a page
that has no label for it. Both encoders changed together, as that card demands, and
`test/crew.js` checks the round trip in both formats, that an old link still opens with no
crew on it, and that the refusal to submit comes before the call rather than after it.

### Two bugs it surfaced on the way

**A chosen chip in a strip was invisible.** `.seg button` sets a transparent background and
is written after the shared `button.active` rule at the same specificity, so it won: the
filled state kept the filled state's near-black ink and lost the fill behind it. The storey
strip had been drawing "All" as an empty box for as long as it has existed, and nobody read
it as a bug because a blank chip looks like a gap. Restated at a specificity that wins.

**Reopening a saved base showed the base with a build cost of zero.** `loadCurrent` is
reached from a promise, so it lands after startup has already worked every figure out from
the empty design nobody was looking at: the plan drew, and the cost, the storey strip and the
crew beside it all described nothing. It recomputes now, without saving, since nothing
changed by being reopened. Same shape as the "Plan your FOB" bug: something read off the
design, refreshed only on the path where the design is edited.

### The designs page stops spending space on nothing

Three things, all the same mistake: a layout built for a full rectangle used for a list that
usually is not one.

`.chips.sorts` is the width of its contents now, rather than spanning the column the way the
filter bar does beside a search box. The card grid drew hairlines as background through a
1px gap, which is right for a dense table and wrong here: with one design in it the empty
track read as a missing thing. It is centred rows carrying their own edges. And the submit
form asked for a link, a name and an author the planner's Submit button already knows, so it
is one instruction and a way to the planner. **The line promising submissions are read
before they go up came off with it: that stopped being true when the queue was removed, and
a page promising a review nobody performs is worse than one promising nothing.** Thumbnails
went 150px to 190px, since most bases are nearer square than a card is.

### The community list shows the base, and one decoder now serves both sides

A list of names told you nothing about the thing you were choosing between, and a base is a
shape. Every card carries an overhead picture of its own layout: colour and footprint only,
no names, no height badges, no storey shading, no grid. At card size none of those can be
read, and each one turns something you take in at a glance into something you have to study.

Drawing it meant decoding a share code outside the planner. The card for that format says
the count of places it lives in is the point, and its two encoders had already drifted apart
once without anybody noticing, so a second decoder was not written.
`src/shared/design-view.js` is the only one, with the only palette beside it. `build.ps1`
inlines it into the planner and `tools/site/client-scripts.js` inlines it into the pages;
neither keeps a copy, and the planner's private decoder and colour tables are deleted rather
than left unused. The page gets a slim table of footprints and roles rather than the whole
catalog, because a picture needs nothing else.

Pictures are painted when a card is about to be seen rather than all at once, and a code
that will not decode leaves no picture instead of a broken frame.

Two things showed up next to it. The dynamic list wrote its cards straight into the
container while the built-in list wrapped them in a grid, so the moment the worker answered,
a tidy grid became a column of full width rows. And inside a 270px card the action row was a
single unwrapped line with hard margins, so its last button hung outside the card it
belonged to.

`test/thumbnails.js` covers the drawing and the sharing: every piece drawn, nothing written
on it, the base inside the canvas and filling it, a long base and a tall one both fitting
without being stretched, and the decoder present in both builds with the planner's old copy
gone.

### Sign out moved under your name

It was a second link in the header, level with the name and with everything else up there,
which put the one destructive account action in the busiest row on the page. Your name is a
control now, and Your designs and Sign out open under it.

### "Plan your FOB" stops sitting on top of your base

The invitation to start a base was hidden only inside `afterChange`, which a design arriving
at boot never went through. Opening a share link, or coming back after a hard refresh, drew
the base with the invitation still over it. Reported twice. `drawNow` decides it now, so it
cannot disagree with what was just drawn, and `test/planner-tools.js` pins that the draw is
the only thing that sets it.

### Your own work is yours to take back

Everything published on arrival and nothing could ever be unpublished except by the person
holding the admin token. That is the wrong shape: it makes a favour out of a decision that
belongs to whoever posted the thing. `POST /withdraw` lets the account that submitted a
design remove it. Ownership is not a guess, since `/submit` has always recorded the Discord
id in `by`; a submission from before that has no `by` and stays with the admin.

On the page, a card that is yours offers "Take it down" where a stranger sees "Report".
Reporting your own design was never a thing anyone wanted to do.

Two things came out with it.

`/designs` was returning each stored record as it was, which put `by`, the Discord id of
whoever submitted it, into a public list anybody could read. Nothing needed it. The only
question the page asks is whether a design belongs to the reader, so the worker answers that
with a `mine` flag worked out from the caller's own token and deletes `by` before replying.
The page now sends its token when it fetches the list, which it did not do before, so the
flag can be worked out at all.

And deleting a design deleted its record and its vote tally but left its comments behind
under a slug nothing could reach any more. `removeDesign` takes all three, and both the
owner's withdrawal and the admin's delete go through it so they cannot drift apart.

Pinned in `test/worker.mjs`: a stranger gets 403, signed out gets 401, the owner gets 200,
the public list carries no account id, and no comment key survives the delete.

### The update chip can hand back the build it was replacing

A fix was reported as still broken after it had deployed, and it had: the copy in the
browser was old. GitHub Pages serves the planner with `max-age=600`, so for ten minutes a
browser can answer `location.reload()` from its own cache. The "Update available" chip did
exactly that and handed back the same build. It refetches with cache "reload" first now, and
the check runs on focus and every five minutes rather than once at startup. This is why
CLAUDE.md says to compare the live `build.txt` against the local one before believing a bug
report on a fresh deploy.

### Ctrl+V pastes

Reported as a hotkey clash: V toggled the 3D view and Ctrl+V is paste. It was worse than a
clash. The plain letters were matched before the Ctrl combinations in the same if-else chain,
and holding Ctrl did not stop them, so Ctrl+V hit the plain "v" branch and toggled the 3D
view without ever pasting. Ctrl+R turned the selection on its way to reloading the page, and
Ctrl+B toggled snap.

Modified keys are handled first now, in their own block that returns. Order alone would not
have been enough: without the return a plain branch further down still catches any modified
key the block above does not list. The 3D view moved from V to 3, which nothing else wants.

Pinned in `test/planner-tools.js`: the modifier block comes first, it returns, each Ctrl
key reaches the function it should, and nothing in the markup still tells anyone to press V.

### Fewer buttons up top

Fifteen controls on the planner's top bar, four of them the same job. Share, Export and PNG
became one Share menu; Import moved into Designs; the catalog editor moved into Help. Nine
buttons show now, nothing was removed. `test/planner-tools.js` counts what shows on the bar
rather than checking names, because buttons creep back one at a time and each looks
reasonable alone.

### Turning a selection turns the group, and nothing is stranded pending

`rotateSelection` spun every piece where it stood, which is right for one piece and useless
for several: a copied corner came back facing a different way, so there was no way to build
the matching half of a base. It turns the selection about its own centre now. The centre is
the average of the pieces, which a turn maps to itself, so four quarter turns land exactly
back; it is put on the grid first so a quarter turn goes grid to grid. Pinned in
`test/planner-tools.js`.

In the worker, `/designs` listed what had once been approved, stranding three real
submissions in the old queue state with no page left to release them. It lists what is not
hidden instead. Needed a wrangler deploy; `git push` does not ship the worker.

### A run steps along the piece, not down the drag

A diagonal wall came out ragged for three separate reasons, and fixing the first two was not
enough.

`snapVal` rounded every placement to the world half-cell grid, and a 1x1 turned forty five
degrees has to step 0.707 to meet its neighbour. `snapPoint` snaps in the piece's own frame;
at 0, 90, 180 and 270 that is the world grid, so square-on placement is unchanged. That left
the sideways axis on half cells, which is invisible on a diagonal until the wall is built, so
`snapPlace` measures from the nearest piece of the same kind and angle and makes leaving the
line something you have to mean: three quarters of a block, not the half that plain rounding
asks for.

And a run spaced its pieces by their extent along the drag, which gets the distance right and
the wall wrong: unless the piece sat square-on to the drag, blocks met at one corner. It
walks the two moves a piece can make and still touch instead, taking whichever stays nearest
the drag line, and stops when the best move would put it further off that line than its own
longest leg. `wallGap` was also measuring upright boxes, so a flush turned wall reported a
break that was not there.

Pinned in `test/runs.js`, including three checks that assert the old behaviour fails: the
first two fixes each looked right and were not.

### A way in is a run, and only where somebody can stand (`e9868d9`)

`climbRuns` groups touching pieces of the same verdict so a run counts once, and
`reachableFromOutside` floods the ground at half a cell from beyond the design's bounds.
Wire and hedgehogs deliberately do not stop the flood: treating them as solid would hide a
whole perimeter behind one line of wire. A design past the cell budget calls everything
reachable, because **over-reporting is the safe way to be wrong about a way in**. Pinned in
`test/planner.js`.

### A gap you cannot see is named, not merged away (`e9868d9`)

`hairlineGap` states the distance rather than closing it: **widening the merge tolerance
would make the plan lie about a hole in a wall**. `HAIRLINE` also widens the spatial index,
because a rule about pieces that do not touch cannot be answered by an index that only
pairs pieces that do. Anything past it is a firing slit or a doorway and is left alone.
Pinned in `test/issues.js`.

### The panel leads with pallets, and stopped asking (`592ad7c`)

The supplies-in-FOB question is gone; `pallets = ceil((supplies - startingSupplies) /
suppliesPerPallet)` is the headline. `tools/site/context.js` computes it identically for
community design pages, because the planner and the page describing the same base must not
disagree. The help text said 1,900 and the catalog said 1,800 for months, so prose
interpolates both and `tools/check-build.js` fails on any supply figure the catalog does
not state. Reload cost is unpublished and stays an open question, not a guess.

### One wall draws as one wall (`615fab9`, completed by `41488cb`)

`seamFamily` merges anything tagged `wall` with any other wall of its role; gates, bunkers
and towers carry cover without being walls and stay separate. Labels and height badges key
off the buildable, not the family. **`41488cb` is the half that matters: seam bits are
worked out in world space and drawn inside `ctx.rotate()`, so a rotated wall suppressed the
wrong edges. Read that commit before touching either.** The icon cap also moved from a flat
66px to about two cells, since a pixel cap shrinks the art the further you zoom in.

### The front page says what the site is for (`c5e57bf`)

Hero states what the site is rather than sloganeering about pallets. **Guides were removed
in full, generator and prose and sitemap entries, so `/guides/` and the four guide URLs
return 404. That was a deliberate call, not an oversight.**

## Where the rest lives

- what a change will break: [effects/CONTEXT.md](effects/CONTEXT.md)
- what is unfinished: [OPEN.md](OPEN.md)
- why a check exists: [objects/guards/verification.md](objects/guards/verification.md)
- the planner itself: [objects/planner/planner-app.md](objects/planner/planner-app.md)
