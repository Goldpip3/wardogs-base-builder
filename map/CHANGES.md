# What changed, and why

`git log` is the full record. This is the shorter one: the decisions a later reader is most
likely to undo by accident, each with the reason that does not fit in a diff and the check
that pins it. If this file and the code disagree, the code is right and this is stale.

Newest first. One entry per decision, not per commit.

## 2026-08-31

### The map stops zooming out when it is all on screen, and stops fetching tiles nobody sees

**Zoom out ends at the fit.** It bottomed out at a hardcoded `cam.k` of 1, far past the point
where the whole terrain is visible, so the map became a small square adrift in black that
could still be dragged around its own margin. `clampCam` holds it at or above the fit and keeps
the view inside the terrain bounds, centring and pinning an axis narrower than the canvas.
Measured: a 500px drag at full zoom out moves the world under a fixed pixel by exactly zero.

**The coarse fallback was buying its blur with requests.** A tile that had not landed sent
the draw up three ancestor levels looking for something to paint, using `getTile`, which
*starts a request* for anything absent. Measured on a first paint of Bakurani: 24 tiles
displayed, 12 ancestors fetched that nothing drew. Under a fast zoom that is the request
storm the retry logic exists to survive, and it was self-inflicted. The lookup is read-only
now, and a fixed base of five tiles is fetched once per terrain. **First paint went 36
requests to 29, and zoom 5 to 6 now costs the four tiles it shows.**

Also `decoding="async"`, so a decode does not block the frame it lands in, and the cache is
bounded at 360 tiles, evicting oldest first and never the base. It used to grow for as long
as the tab was open across 10,922 tiles. The eviction was proved to terminate against an
all-base cache and a zero cap.

Checked against wardogs-artillery.com, which advertises improved tile loading: it sets
`decoding` and its ancestor lookup is already read-only, which is where this came from. Two
things there are deliberately not copied. **It picks a zoom with `Math.round` and no
device-pixel term**, so its tiles upscale on any 2x display. And it draws from every tile
onload, so twenty tiles run twenty full draws; this coalesces into one frame.

### The kit has a bag, and nothing is bought without one

The loadout page sold grenades, bandages and spare magazines to somebody carrying nothing,
which is a kit that cannot exist in the game. **The backpack is its own column now** and the
items shelf and magazine count stay locked until one is chosen. Taking the bag away empties
it, since paid-for items with nowhere to be is the same lie in the other direction. Weapon,
sidearm, armour and rig are deliberately not gated: they are held or worn, not carried.

**The Pouch was on the rig shelf**, so the backpack shelf opened with nothing free in it and
the free option sat two slots away under a name nobody was looking for. It leads that shelf.

**What is in the bag is drawn as a bag**, in cells with the item's art, a magazine reading
its round count the way the game's grid does. It was a list of names, weapon and helmet
included, which is a receipt: the rifle is in your hands, not taking up room in anything.

**Weight is the figure this screen is missing**, and it says so rather than adding up what it
does not have. `tools/build-armory.js` takes `|3.4kg` after the price and the sum works the
moment a figure lands, and **it refuses to report a total while any piece is unweighed,
because a light total and an unweighed rifle look identical on a readout.** Measuring them is
in `data/todo.json`, which is why that shelf is ordered by price.

### An old design takes the current build zone, and the copy stopped commenting on itself

Bases drawn before the FOB zone went from 100 to 200 recorded 100 and kept it, and so did
every shared link, since the wire format writes 100 for a design carrying no zone at all.
That was a deliberate call and it was the wrong one: **100 was the default, not a choice**,
so opening a design now takes the catalog's figure, and a zone somebody typed in the panel is
still left alone. `test/saved-designs.js` pins all three cases. Reverses the "nothing rewrites
them" line in the entry below.

Three sentences on the site ended in a comment on themselves rather than in a fact: a fuel
price "as close as anyone can honestly get until launch", a Havoc being "the sort of thing
worth knowing before you drive it into a Gepard", a level 4 vest taking "as close to nothing
as this game gets". They are gone, along with the buckshot slider being there "so you can be
honest with yourself". **The reference pages state the figure and stop.** A page that says
what is not known is doing its job; a page that admires itself for saying it is not.

### A storey is a count, and the 3D view was reading it as a height

Reported from a real base: a Vanguard CIWS on a hesco wall came out with the wall painted
over the gun. `p.level` is how many things are stacked under a piece, not how far off the
ground it is. On a two block wall the gun sat at z=1 while the wall filled 0 to 2, so the
boxes ran through each other, and **no draw order is right about a pair that runs through
another**, which is why this looked like a sorting bug and was not one. `standHeights` works
the real height out from what a piece stands on, cached against the design beside issues and
seams; nothing under it means the ground. `test/elevation.js` pins that stacked pieces never
share a block of height, five ways the old code fails.

### The 3D view turns fifteen degrees at a time

It turned in quarters, and all four of those angles are square on, so a wall along an axis
was either flat to the camera or edge on and never showed its length and its face at once.
Now a yaw in degrees stepping 15, with **↺ and ↻ buttons beside the 3D toggle** as well as Q
and E. The exact sort survives it: "wholly on the far side along one axis" holds at any angle
once the test asks the camera which end of an axis is the far one, and the audit runs at all
twenty four. **The bar swaps Snap out for the two turn buttons** rather than growing, Snap
being a placing setting in a view that places nothing. Dragging also tracks the pointer now;
the inverse projection had the tilt hardcoded at a half while the view uses 0.68.

### Three weapons were filed under the wrong class

Reported as one weapon with nothing working. The Scout Rifle TD was filed as a marksman
rifle in 5.56 and no marksman tab was tested with 5.56, so the join found nothing. **The
wiki publishes a class per weapon in its structured data; checking all 28 against it found
three wrong**: the Scout Rifle TD is a sniper, the FAL an assault rifle, the GGX 18 a
pistol. Each of those classes was tested with the right calibre, so the correction gave all
three their damage. **All 28 have measured damage now** and the known-gaps list in
`tools/check-build.js` is empty. BMR-308, SVD and SKS look wrong in that comparison and are
not: the wiki writes "Marksman Rifle" where this repo writes "Marksman".

Class is stated twice, in `data/ballistics.json` and in the `ROWS` table of
`tools/solve-ballistics.js`. Both were corrected; fixing one leaves the repo saying two
things about one gun.

**Separately, one bad element reference took the whole page down.** `renderCalc` wrote to
`#flight` and `#cost` after another change removed them from the markup, so it threw before
`renderZones` ran, leaving the hero dashed over a zone table still holding the previous
weapon's numbers. That is worse than a blank page because it reads as an answer. Stages run
through `stage()` now: one failing leaves its own panel stale and logs, the rest redraw.

### The nav is one group, centred

A `.nav-gap` span held Planner and Artillery apart from the other five, and being `flex:1`
it took every pixel the row did not need, opening a hole most of a column wide between
Artillery and Designs. The seven sit together at one 14px gap now, centred in what the brand
leaves. **Nothing in the nav ranks the tools above the references any more:** the boxes
stopped doing that when every link got one, and this was the last thing carrying it. To make
them lead again use order or a different treatment, not a gap.

### Designs carry tags, and the list filters on them

`/designs/` has a chip bar in two rows, **Where it works** and **What it is for**. Two chips
in one row means either; a chip in each row means both, because the rows ask different
questions and the other reading hands somebody a filter that can only return nothing.

**Every submission has to say where it works**, and that is the one rule the worker can
enforce, which is why every tag in that group is prefixed `map-`: **the worker holds no copy
of the vocabulary and must not.** It deploys on its own, so a list inside it would make each
new tag a deploy somebody forgets, leaving the site offering a tag the server refuses. It
checks the shape of an id, a cap of eight, and the presence of one `map-` tag, and stores
whatever else it is handed. The site draws only the tags it knows, so an unrecognised id
renders as nothing rather than as text nobody chose.

**The vocabulary lives in `data/community.json` and nowhere else.** The site reads it through
`tools/site/context.js`; `build.ps1` inlines the same array into the planner. `test/tags.js`
holds both built files to it byte for byte, checks every id against the regex it lifts out of
the worker, and fails if a map in `data/artillery-maps.json` has no tag, which is what makes
adding a third map one edit rather than three.

Both places that submit ask at the moment of publishing rather than storing tags on the
design, because they do not travel in the share code and nothing edits them afterwards.
**Any map** clears the named maps and a named map clears it. A design submitted before this
carries no tags and simply does not match a filter. Chip counts are what pressing them would
leave you with, so each row counts the other rows' filters and not its own: a chip saying
nine and handing back nothing is worse than no count.

### The artillery map always draws the spawns

They were a layer toggle beside Terrain, Grid, Zone and Towers. Where the three factions come
in is not a preference about the drawing: a gun position is chosen against it, and the only
thing turning it off achieved was hiding it. Four toggles left, all about detail under the
rings.

### Damage is measured now, not solved

The owner shot the game and wrote it down, so `tools/solve-ballistics.js` stopped being the
best answer available. `tools/pull-damage-sheet.js` reads that sheet into `data/damage.json`
and the page runs on it. **Two things the derived model had wrong, both stated in prose:**

- **Coverage grows with tier.** A helmet is the head, and from level 3 the neck. A vest is
  the chest and abdomen, and from level 4 the shoulders and groin. The page said outright
  that a helmet is worth nothing to a neck shot.
- **The class fires the round, not the calibre.** 9mm from an SMG and from a pistol came
  back different. One figure per calibre could not express it.

Zones went twelve to nine, the game own taxonomy, remapping the artwork rather than redrawing.

**The bare column and the scalings are transcribed. Armoured damage is not**, it is bare
times the scaling, because the sheet armoured block contradicts its own scaling table in 25
cells. Importing both ships the contradiction and fixing the sheet here hides it, so they are
recorded in `sheetDisagrees` and the suite fails if that record is dropped. Listed in OPEN.

`data/ballistics.json` still owns rate of fire, velocity, the vendor joins and the palette.
The join to it has no foreign key, so check 3d2 pins the count: a rename on either side lands
nothing and draws every zone as a dash, which still builds and still looks deliberate.

### Your own designs sit under the community's, on the same page

`/designs/` was other people's work and a paragraph telling you your own was elsewhere. It
carries two lists now: **From the community**, published and being voted on, and **Your
designs** under it, saved from the planner and private to your account. One button on each of
your cards puts it in the list above, asking for the optional line the public card shows.

**One renderer draws both, and the account page uses the same one.** `/account/` held a
second copy that would have drifted the first time either was touched, the trap this repo has
been caught by with a number and with the share format. `test/site.js` compares the two
pages' script blocks rather than looking for a marker in each.

**Both lists read one answer.** Publishing clears the cached `/designs` reply before either
is redrawn: reloading them at once meant the list gained the design while the card under it
still offered to send it.

**The public list arrives twelve at a time**, appended as the bottom comes into view, because
every card decodes a share code and paints a plan. The **Show more** button is the real
control and the scroll only presses it early, so a browser without an IntersectionObserver
keeps the tail of the list.

### The nav is one row of one size, and stops running off the side

The seven boxes were sized by their own labels, 96px to 114px, which reads as seven kinds of
thing rather than one row of buttons. They are all 100px now, set by the longest word.

Fixing that surfaced an older bug: **at 1000px the page scrolled sideways by 220px.** The
header only stacked below 760px, and between there and about 1250px the row did not fit and
simply overflowed. The nav takes its own row under the brand below 1180px, which is where it
measurably stops fitting, and wraps rather than overflowing at any width. A Discord name
longer than about fourteen characters is what still reaches that wrap on a 1440px screen.

### The owner is a Discord id, not a display name

`/todo/` decided you were the owner by lowercasing your Discord display name and comparing
it to a string baked into the page, so anyone who renamed themselves got in. `/me` now
answers `owner: true` for the one id in `OWNER_DISCORD_ID`, and the page asks rather than
deciding. The same flag draws Moderate and To do in the account menu, which is why it was
built: both are unlisted and the URLs were being kept in someone's head.

**It authorises nothing.** A Discord id is public, so it decides what a page offers to show
and never what `/admin` does, which still wants `ADMIN_TOKEN`. `test/worker.mjs` pins both,
and its name-impostor check fails against the old comparison, which is how it was proven
worth having. `/todo/` stays unlisted rather than private and still says so on itself;
`tools/check-build.js` holds the built page to the flag, because nothing else reads that
page and a regression would look identical to the owner.

### The armory holds the vehicles, and every item opens

**Clicking an item opens a panel** with its art at full size and whatever is known about it.
The art was always shown at 64 px and the files are 512 px square, so this is the first place
on the site that shows an item properly. The stats are a join, not new data:
`data/ballistics.json` already held them under other keys. **72 items of 331 have real stats.
The other 259 are told plainly that nothing is published**, rather than shown a panel of
empty rows, which reads like missing data rather than absent data.

**Its torso damage is the superseded figure.** That is the solved number, and the damage page
moved to measurements on 2026-08-31 without the panel following, so the two can disagree
about the same gun. Listed in `OPEN.md`.

Three things a later reader should not undo:

- **The stored armour figure is what armour takes; the panel prints what gets through.**
  Printing `blocks` straight would say a hollow point is at its best against a level 4 vest.
- **The two weapon lists spell a calibre differently.** A figured weapon stores the id, so an
  M4 carries `556`; an unfigured one stores the label, `7.62x51mm`. The panel resolves ids and
  passes labels through, or it prints "556" where the rest of the site says "5.56mm".
- **The attachment slot is the one figure never transcribed.** `slotOf` reads it off the name
  because the source publishes no compatibility field, so the panel says so. In the same type
  as a measured muzzle velocity it would be a reading passed off as a record.

The joins have no foreign key, so a rename on either side lands nothing silently and leaves a
page that still builds and still looks right. `tools/check-build.js` asserts all four by exact
count, that every calibre id resolves, and that all 331 items carry an opener in both views.

**On `<dialog>`.** Native, for the backdrop and the focus trap. Its `close` event never fires
in the browser this was built against, checked in isolation, so the focus restore cannot hang
off it and `shut()` does it directly. Escape could not be tested there at all, since that
browser delivers no key events; nothing is claimed about it and it gets a handler anyway.

**The vehicles page is a doorway now, and the tab is gone.** `/vehicles/` is a zero-delay meta
refresh to `/armory/`, canonical pointed there and `noindex` on it, **because GitHub Pages
cannot send a 301 and a deleted page is a permanent 404 for everyone holding the link.** The
build fails if that refresh tag goes missing. Weight was measured, not assumed: 45 KB gzipped.

### The buildables page uses the armory's rail, and serves its icons as files

Two problems, both already solved elsewhere.

**The layout was the pattern the armory had abandoned**, and the cause looks like a styling
bug and is not: `.cat-bar` and `.cat-count` were in the markup and **never given any CSS at
all**, so those controls were plain block siblings and stacked into three stripes. It uses
the armory's `.cat-layout` rail now. The only new CSS is `.cat-main{min-width:0}` and
`.cat-tablebox{overflow-x:auto}`, which a five column table needs and a three column one did
not: **a grid column is `min-width:auto` by default**, so the description column pushed the
rail off the page instead of scrolling.

**The icons were 585 KB of base64 the default view never painted.** They were inlined so a
row and its picture would arrive together, making this the second heaviest page on the site
at 660 KB; but the default view is the table, which has no icons. They are files under
`/build-icons/` now, lazily loaded. The page is **87 KB**.

`assets/icons/` feeds two consumers and the difference is the point: `build.ps1` inlines it
into the planner as data URIs because that file opens with no network, and copies it to
`docs/build-icons/` for the site, which has one. **Do not consolidate those.** Four checks
hold it, including that the buildables page carries no `src="data:image` at all, which exists
because re-inlining is the tempting thing to do next time somebody wants a row and its
picture together, and it is how the weight came back.

**It also came out of the top nav**, the owner's call: nine links was too many, and build
costs are the one reference you meet inside the planner anyway. **The page is not gone and
must not be.** `/buildables/` is an indexed URL, GitHub Pages cannot serve a redirect so a
deletion is permanent, and it is now reached from exactly two places, the home page grid and
the footer. `test/site.js:74` holds the home page to linking it. Removing those links is
removing the page, whatever the sitemap still says.

### The worker refuses to run on a secret anybody could read

The session signing key and the identity salt both ended in `|| "wardogs"`, a string written
in `worker/vote-worker.js`, which is public. **A deploy missing its secrets came up looking
perfectly healthy and signed every session with a key anyone could look up**, so minting a
token for any account, the owner's included, was a matter of reading the repo. Nothing about
it would have looked wrong from outside, which is the part worth remembering.

Missing secrets answer 503 on every route now and `VOTE_SALT` is required.
`tools/check-build.js` fails the build if `env.SECRET || "literal"` reappears anywhere in
the worker, because writing a default is the tempting thing to do the next time a deploy
will not come up.

Three more from the same read, all the same shape, a check that looks like it asks the right
question and does not:

- **The post-login return address was prefix-matched.**
  `back.startsWith("https://www.wardogsbuilder.com")` is true of
  `https://www.wardogsbuilder.com.example.net/`, and the new session token is appended to
  whatever comes out of that test. Origins are parsed and compared now, and the OAuth
  `state` is signed, so a callback this worker did not start is not followed.
- **`GET /comments` published Discord ids.** `GET /designs` strips `by`; the comment list was
  written later and never got the same treatment. Both go out through a projection that names
  what leaves, so the next field added to a stored record is private by default.
- **Request bodies were unbounded** before `JSON.parse`. Capped, and measured on what arrived
  rather than on `Content-Length`, which a client can simply not send.

Also: the admin token is compared byte for byte rather than with `===`, and a corrupt KV
record costs that record rather than throwing out of the handler and killing the route.

### Not everything worth hardening is in the code

The site is static files on GitHub Pages, which cannot set a response header at all. So there
is no CSP, no HSTS, no hotlink rule and no rate limit on the site itself, and no amount of
editing the generator will produce one. `tools/site/shell.js` sets `referrer`, which a meta
tag does carry, and deliberately sets nothing else: the headers that do nothing from a meta
tag are left out rather than added for the look of it.

Asset protection was asked about and is mostly not a real category here. The 132 MB under
`docs/game-icons/` and `docs/maps/tiles/` is the game's own art, held so the project does not
hotlink anyone; every address is enumerable from data that ships in the page.
`docs/robots.txt` now asks the training crawlers to stay out, and
`tools/site/pages/sitemap.js` writes down that this is a request to parties who mostly honour
it and not a control.

This entry first said the one measure that actually held was the original artwork in
`assets/icons/`, base64 inlined into the planner and never served as a file. That was true
when it was written and stopped being true the same day, in a change made alongside it for
unrelated reasons: the buildables page now loads those icons as files from `/build-icons/`
rather than carrying 600 KB of base64 its default view never painted. The planner still
inlines them, so the offline promise is untouched. Corrected here rather than left standing,
because a security note that has quietly gone stale is worse than none: the next reader would
have taken "never served as a file" as a fact about the site and it is now a fact about the
planner only.

Raising the ceiling needs Cloudflare proxying the domain rather than only holding its DNS.
That is dashboard work, not a commit, so it is written up as a follow-up in
[security](processes/security.md) and has not been done.

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

### Nothing is chosen from a dropdown any more

The three catalogue pages all worked the same way: a `select`, or a table row, standing in
for a thing that has a picture. A dropdown hides every option until you open it and then
shows them as a list of words, which is the wrong control for a shelf where recognising the
item is the whole task. All three now let you click the thing.

**Loadouts.** Clicking a slot opens that slot's shelf underneath it; clicking a card equips
it and closes the shelf. One shelf at a time, Escape closes and returns focus to the slot,
and the round shelf shows only what the chosen weapon chambers. Magazine count is a pair of
buttons, not a number spinner.

**Armory.** A card grid with the art is the default view and the table is behind a toggle,
because a picture is how you recognise an item and a column is how you compare forty
prices. Both views are one filter and one sort over the same elements, so switching never
reshuffles. An unconfirmed price sorts to the bottom in **both** directions: a blank is not
the cheapest thing on the shelf.

**Damage.** The weapon control is the weapon, with a shelf of every gun behind it, filtered
by class. `setWeapon` is now the only way `S.w` changes; four places used to set it and then
separately poke the select's value, which is two facts about one thing.

**The trap, twice.** `.vcard` and `.acard` are `display:flex`, and an explicit display beats
the `hidden` attribute's UA `display:none`. Filtered-out cards stayed on the shelf while the
script believed it had put them away, and the probe agreed with the script rather than the
screen. Anything given a display here has to say what hidden means for it, the way
`.ctl[hidden]` already had to. Found by looking at the page, not by asking it.

### The damage page shows the gun it is talking about

The weapon art sits under the picker, and every ranking row carries its weapon. All 28
weapons and 30 vendor round names joined first try: the slug rides on the armory item and
this page already joins the armory by exact vendor name for prices.

**`.rname` must not be a flex row.** Making it one to hold the icon turned every wrapped
name into two columns. The icon is inline with a baseline nudge, and the name column went
168px to 210px to pay for it.

### A generated file that its generator no longer makes

`data/armory.json` was committed carrying 323 icon slugs without the `tools/build-armory.js`
change behind them. That generator is run by hand and nothing compared the two, so the next
regeneration would have stripped every icon off the loadout page. `build.ps1` runs
`tools/build-armory.js --check` now, which rebuilds into memory and **refuses** if the
committed file disagrees. Refusing rather than overwriting is the point: overwriting is what
hid this, and a silent repair leaves the wrong generator in the tree. Proved by replaying the
real commit, where the old generator overwrote the file and exited zero.

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

Two more things that made it feel worse than it was. Every wheel event ran a full draw, so a
quick zoom ran several inside one frame; they ask for a frame now. And zoom stepped a flat
1.2 per event however far the wheel turned, so a trackpad's small deltas arrived as a stack
of 20 percent jumps. It scales by the actual delta, line and page modes converted.

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

The top left read WARDOGS BASE BUILDER and reads WARDOGS PLANNER now.

The FOB build zone went from 100 cells square to 200, on the owner's word rather than off the
game, and stays `radiusConfirmed: false` because nobody has stood at the edge of one and
counted. That flag is what keeps range rings off the plan.

Changing it turned up eight copies of `|| 100` through the planner, one beside every use.
They are one `fobZone()` now, falling back to the catalog. **Two literals stay, both in the
share encoders, and the comment says why:** 100 is the wire format default, the site
generator writes the same one, and `test/share-links.js` requires both encoders to emit
identical bytes. Reading the catalog there would tie the format to a value a player can edit.

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

### The 3D view, condensed: six entries about one rewrite

Six passes over the isometric view, kept as one because they are one decision each and the
narration has been paid for. All six are pinned in `test/elevation.js`, and `git log` has the
reasoning in full.

**Draw order is a graph, not a sort.** Ordering by how far each piece's middle sits from the
camera drew short pieces over long ones, reported as a wall not carrying on through. Pairs
that actually overlap are ordered against each other and the rest left alone: 0.7 ms for 117
pieces, 3.2 ms for 624. Reverting the sort fails six checks. A turned piece is still compared
by the box around it, which is in `docs/3d-view-design.md` rather than in anyone's head.

**A piece is a prism over its own four corners**, not its bounding box. A 4x4 tower at forty
five degrees has a box 5.66 across, so it drew half again too wide and square on when the
piece is a diamond. Which sides face the camera is worked out per piece, so seam suppression
follows the piece rather than the grid.

**Runs, not boxes.** A side joined to a neighbour the plan already calls the same wall is
interior and goes, uprights included: 612 edges down to 209 on a fifty one piece base. The
seam mask is in world directions and the visible faces depend on the spin, checked as
arithmetic at every angle, because suppressing the wrong side looks almost right.

**Height is the whole job of this view**, so a block stands 1.45 times the ground scale
against a cell 0.866 wide, the FOB stands its catalog two blocks, and the camera sits above
the textbook thirty degrees. `fit3D` projects all eight corners of the volume, having
previously measured the ground and let bases run off the top.

**Colour is by material, and the key cannot lie.** Towers and bunkers left the hescos' gold
for concrete and bremers took a paler concrete of their own. Four things move together or the
key is wrong: the role on the piece, its colour, its label, and the list the key is built
from. Runs merge by role with it, so a hesco meeting a bremer shows the join.

**The plan draws its writing last.** Labels, height chips and note marks were drawn per
piece, so a tower dropped beside the thing you were pointing at painted over its label.

### How many players it takes to hold the base

The one figure on a plan nobody can measure: the person who built the base saying who it is
for. Three buckets in `data/buildables.json` under `crewSizes`, so the planner and the
community list read one list. The planner asks under **Who holds it** and refuses to submit
without an answer, the list showing it against every entry.

**It rides inside the share code rather than beside it in the submission record**, so one
copy of the answer survives a base being passed on as a link, saved, exported and reopened.
The head of both formats is JSON, so the key is absent from older codes and old readers
ignore a new one, and the alphabet does not change, which is what would have made it a worker
deploy. A value that is not one of the three is dropped, so a hand-edited code cannot put
text on a page with no label for it. Both encoders changed together, as that card demands.
`test/crew.js`.

### Two bugs it surfaced on the way

**A chosen chip in a strip was invisible.** `.seg button` sets a transparent background after
the shared `button.active` rule at the same specificity, so the filled state lost the fill
behind it. Restated at a specificity that wins.

**Reopening a saved base showed a build cost of zero.** `loadCurrent` is reached from a
promise, so it lands after startup has worked every figure out from the empty design. It
recomputes now, without saving. Same shape as the "Plan your FOB" bug: something read off the
design, refreshed only on the path where the design is edited.

### The designs page stops spending space on nothing

The same mistake three times: a layout built for a full rectangle used for a list that
usually is not one. `.chips.sorts` is the width of its contents. The card grid drew hairlines
as background through a 1px gap, right for a dense table and wrong where one design leaves an
empty track; it is centred rows carrying their own edges. The submit form went too, since it
asked for what the planner's Submit button already knows, **and the line promising
submissions are read before they go up came off with it: that stopped being true when the
queue was removed.**

### The community list shows the base, and one decoder now serves both sides

A list of names told you nothing about the thing you were choosing between, and a base is a
shape. Every card carries an overhead picture of its own layout: colour and footprint only,
because at card size names, badges and grids turn a glance into a study.

Drawing it meant decoding a share code outside the planner, and **the two encoders of that
format had already drifted apart once without anybody noticing**, so a second decoder was not
written. `src/shared/design-view.js` is the only one, with the only palette beside it.
`build.ps1` inlines it into the planner and `tools/site/client-scripts.js` into the pages;
the planner's private decoder and colour tables are deleted rather than left unused.

Pictures are painted when a card is about to be seen, and a code that will not decode leaves
no picture rather than a broken frame.

Two things showed up beside it: the dynamic list wrote cards straight into the container
while the built-in list wrapped them in a grid, so a tidy grid became a column of full width
rows the moment the worker answered; and inside a 270px card the action row was one unwrapped
line with hard margins, so its last button hung outside the card.

`test/thumbnails.js` covers both: every piece drawn, nothing written on it, the base inside
the canvas and filling it, a long base and a tall one both fitting unstretched, and the
decoder present in both builds with the planner's old copy gone.

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

GitHub Pages serves the planner with `max-age=600`, so for ten minutes a browser can answer
`location.reload()` from its own cache, which is what the "Update available" chip did: it
handed back the same build. It refetches with cache "reload" now, on focus and every five
minutes rather than once at startup. Hence the CLAUDE.md rule about comparing the live
`build.txt` against the local one before believing a bug report on a fresh deploy.

### Ctrl+V pastes

Plain letters were matched before the Ctrl combinations in one if-else chain and holding Ctrl
did not stop them, so Ctrl+V toggled the 3D view without pasting, Ctrl+R turned the selection
and Ctrl+B toggled snap. Modified keys are handled first now, in their own block **that
returns**: without the return a plain branch further down still catches any modified key the
block above does not list. The 3D view moved to 3. Pinned in `test/planner-tools.js`.

### Fewer buttons up top

Fifteen controls on the planner's top bar, four of them the same job. Share, Export and PNG
became one Share menu; Import moved into Designs; the catalog editor moved into Help. Nine
buttons show now, nothing was removed. `test/planner-tools.js` counts what shows on the bar
rather than checking names, because buttons creep back one at a time and each looks
reasonable alone.

### Turning a selection turns the group, and nothing is stranded pending

`rotateSelection` spun every piece where it stood, so a copied corner came back facing a
different way. It turns the selection about its own centre: the average of the pieces, which
a turn maps to itself, put on the grid first so four quarter turns land exactly back.
`test/planner-tools.js`.

In the worker, `/designs` lists what is not hidden rather than what was once approved, which
had stranded three real submissions. Needed a wrangler deploy; `git push` does not ship the
worker.

### A run steps along the piece, not down the drag

A diagonal wall came out ragged for three reasons, and fixing the first two was not enough.
`snapPoint` snaps in the piece's own frame, because a 1x1 turned forty five degrees steps
0.707 to meet its neighbour, and at the square angles that is the world grid, so square-on
placement is unchanged. `snapPlace` measures from the nearest piece of the same kind and
angle, so leaving the line costs three quarters of a block. And a run spaced its pieces by
their extent along the drag, so a turned piece met the next at one corner: it walks the two
moves a piece can make and still touch, takes whichever stays nearest the drag line, and
stops when the best move would leave that line by more than its own longest leg. `wallGap`
was measuring upright boxes too, so a flush turned wall reported a break that was not there.

Pinned in `test/runs.js`, with three checks that assert the old behaviour fails: the first
two fixes each looked right and were not.

### A way in is a run, and only where somebody can stand (`e9868d9`)

`climbRuns` groups touching pieces of one verdict so a run counts once; `reachableFromOutside`
floods from beyond the bounds, and wire and hedgehogs do not stop the flood or one line of
wire would hide a perimeter. Past the cell budget everything is called reachable:
**over-reporting is the safe way to be wrong about a way in**. `test/planner.js`.

### A gap you cannot see is named, not merged away (`e9868d9`)

`hairlineGap` states the distance rather than closing it: **widening the merge tolerance
would make the plan lie about a hole in a wall**. `HAIRLINE` widens the spatial index too,
or a rule about pieces that do not touch would be asked of an index that only pairs ones
that do. `test/issues.js`.

### The panel leads with pallets, and stopped asking (`592ad7c`)

`pallets = ceil((supplies - startingSupplies) / suppliesPerPallet)`, computed identically in
`tools/site/context.js`, since the planner and the page about one base must not disagree.
Prose interpolates its figures and `tools/check-build.js` fails on any supply number the
catalog does not state, after help text said 1,900 against a catalog saying 1,800 for months.

### One wall draws as one wall (`615fab9`, completed by `41488cb`)

`seamFamily` merges anything tagged `wall` with another wall of its role. **`41488cb` is the
half that matters: seam bits are worked out in world space and drawn inside `ctx.rotate()`,
so a rotated wall suppressed the wrong edges. Read that commit before touching either.**

### The front page says what the site is for (`c5e57bf`)

**Guides were removed in full, generator and prose and sitemap entries, so `/guides/` and the
four guide URLs return 404. That was a deliberate call, not an oversight.**

## Where the rest lives

- what a change will break: [effects/CONTEXT.md](effects/CONTEXT.md)
- what is unfinished: [OPEN.md](OPEN.md)
- why a check exists: [objects/guards/verification.md](objects/guards/verification.md)
- the planner itself: [objects/planner/planner-app.md](objects/planner/planner-app.md)
