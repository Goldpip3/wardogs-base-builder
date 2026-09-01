# What changed, and why

`git log` is the full record. This is the shorter one: the decisions a later reader is most
likely to undo by accident, each with the reason that does not fit in a diff and the check
that pins it. If this file and the code disagree, the code is right and this is stale.

Newest first. One entry per decision, not per commit.

## 2026-08-31

### The nav is one group, centred

A `.nav-gap` span held Planner and Artillery apart from the other five. At full width that
spacer took every pixel the row did not need, so it opened a hole most of a column wide
between Artillery and Designs, which reads as a broken row rather than as a grouping. It is
gone; the seven sit together at one 14px gap and centre in what the brand leaves.

**Nothing in the nav ranks the tools above the references any more.** The boxes stopped
doing it when every link got one, and this was the last thing carrying it. If they need to
lead again, lead with order or with a different treatment on those two, not by pushing the
other five away.

### The kit has a bag, and nothing is bought without one

The loadout page sold grenades, bandages and spare magazines to somebody carrying nothing,
which is a kit that cannot exist in the game. **The backpack is its own column now**, beside
the slots rather than filed under gear with the helmet, and the items shelf and the magazine
count stay locked until one is chosen. Taking the bag away again empties it, since paid-for
items with nowhere to be is the same lie in the other direction. The weapon, sidearm, armour
and rig are deliberately not gated: they are held or worn, not carried.

**The Pouch was on the rig shelf**, beside the tac vests, so the backpack shelf opened with
nothing free in it and the free option sat two slots away under a name nobody was looking
for. It is the bag you start with and it leads that shelf, cheapest first.

**What is in the bag is drawn as a bag**, in cells with the item's own art, a magazine
reading its round count the way the game's own grid does. It was a list of names down the
side, weapon and helmet included, which is a receipt: the rifle is in your hands and is not
taking up room in anything.

**Weight is the figure this screen is missing**, and it says so rather than adding up what it
does not have: the source the prices came from does not publish one, so no item carries a kg
and the readout reads as not measured. `tools/build-armory.js` takes `|3.4kg` after the
price and the sum works the moment a figure lands, and it refuses to report a total while any
piece of a kit is unweighed, because a light total and an unweighed rifle look identical on a
readout. Measuring them is in `data/todo.json`, with how much each bag holds, which is why
that shelf is ordered by price.

### Designs carry tags, and the list filters on them

A list of base layouts is a list of pictures, and the question somebody arrives with is
narrower than the whole list: which map, and what do I need it to stop. `/designs/` now has
a chip bar over it, in two rows: **Where it works** and **What it is for**. Two chips in one
row means either of them; a chip in each row means both, because the rows are different
questions and the other reading hands somebody a filter that can only return nothing.

**Every submission has to say where it works.** That is the one tag rule, and it is the
only one the worker can enforce, which is why every tag in that group is prefixed `map-`:
the worker holds no copy of the vocabulary and must not. It is deployed on its own, and a
list inside it would make each new tag a deploy somebody forgets, leaving the site offering
a tag the server refuses. So it checks the shape of an id, a cap of eight, and the presence
of one `map-` tag, and stores whatever else it is handed. The site draws only the tags it
knows, so an unrecognised id renders as nothing rather than as text nobody chose.

**The list lives in `data/community.json` and nowhere else.** The site reads it through
`tools/site/context.js`; `build.ps1` inlines the same array into the planner beside the
catalog. `test/tags.js` holds the two built files to it byte for byte, checks every id
against the regex it lifts out of the worker, and fails if a map in `data/artillery-maps.json`
has no tag of its own, which is what makes adding a third map one edit rather than three.

**Both places that submit now ask.** The planner's Designs panel and the **Put it up for
voting** button on your own saved designs, which is all of them: the paste-a-share-code form
had already stopped being rendered, and its dead handler went with this rather than becoming
a third copy of the picker. Tags are asked for at the moment of publishing rather than kept
on the design, because they do not travel in the share code and nothing edits them
afterwards. **Any map** clears the named maps and a named map clears it, in both pickers.

A design submitted before any of this carries no tags, shows none, and simply does not
match a filter. Counts on the chips are what pressing them would leave you with, so every
other row's filter counts and its own does not: a chip that said nine and handed back
nothing would be worse than no count at all.

### The artillery map always draws the spawns

They were a layer toggle beside Terrain, Grid, Zone and Towers. Where the three factions come
in is not a preference about the drawing: a gun position is chosen against it, and the only
thing turning it off ever achieved was hiding it. The button is gone and the spawns are
always on. Four toggles left, all of them about how much detail is under the rings.

### Damage is measured now, not solved

The owner shot the game and wrote it down, so `tools/solve-ballistics.js` stopped being the
best answer available. `tools/pull-damage-sheet.js` reads that sheet into `data/damage.json`
and the page runs on it. **Two things the derived model had wrong, both stated in prose:**

- **Coverage grows with tier.** A helmet is the head, and from level 3 the neck. A vest is
  the chest and abdomen, and from level 4 the shoulders and groin. The page said outright
  that a helmet is worth nothing to a neck shot. `test/ballistics.js` pins each zone's tier.
- **The class fires the round, not the calibre.** 9mm from an SMG and from a pistol came
  back different. One figure per calibre could not express it.

Zones went twelve to nine, the game's own taxonomy. The artwork is remapped rather than
redrawn: three torso bands become two, hands and feet become one zone of four paths.

**The bare column and the scalings are transcribed. Armoured damage is not**, it is bare
times the scaling, because the sheet's armoured block contradicts its own scaling table in
25 cells: `45acp AP` from a pistol at tiers 3 and 4, computed off a base 1.22 times the bare
row; `50cal FMJ` from a sniper at tiers 1 and 3, using AP scalings; one stray leg cell.
Importing both ships the contradiction and fixing the sheet here hides it, so they are
recorded in `sheetDisagrees` and the suite fails if that record is dropped.

The Scout Rifle TD has no measurement, being a marksman rifle in 5.56 where that tab was
tested in 7.62 and .308. It is named in `tools/check-build.js`, which also fails if the gap
closes and the list goes stale. `data/ballistics.json` still owns rate of fire, velocity,
the vendor joins and the palette; the join to it has no foreign key, so check 3d2 pins the
count. A rename on either side lands nothing and draws every zone as a dash, which still
builds and still looks deliberate.

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

**Clicking an item now opens a panel** with its art at full size and whatever is actually
known about it. The art was always there and always shown at 64 px; the files are 512 px
square, so this is the first place on the site that shows an item properly.

The stats are a join, not new data: `data/ballistics.json` already held them under different
keys and the panel reads across. **72 items of 331 have real stats. The other 259 are told
plainly that nothing is published**, rather than shown a panel of empty rows, which reads
like missing data rather than absent data.

**Its torso damage is now the superseded figure.** That number is the solved one, and the
damage page moved to measurements on 2026-08-31. The panel was not migrated with it, so the
armory and `/ballistics/` can disagree about the same gun. Listed in `OPEN.md`.

Three things a later reader should not undo:

- **The stored armour figure is what armour takes, and the panel prints what gets through.**
  Printing `blocks` straight would say a hollow point is at its best against a level 4 vest,
  which is the exact opposite of true.
- **The two weapon lists spell a calibre differently.** A figured weapon stores the id, so an
  M4 carries `556`; an unfigured one stores the label, `7.62x51mm`. The panel resolves ids
  and passes labels through, or it prints "556" where the rest of the site says "5.56mm".
- **The attachment slot is the one figure here that was never transcribed.** `slotOf` reads
  it off the name because the source publishes no compatibility field, so the panel says so.
  In the same type as a measured muzzle velocity it would be a reading passed off as a record.

The joins have no foreign key between the two files, so a rename on either side would stop
them landing silently, leaving a page that still builds and still looks right with the stats
quietly gone. `tools/check-build.js` asserts all four joins by exact count, plus that every
calibre id resolves and that all 331 items carry an opener in both views.

**On `<dialog>`.** Native, for the backdrop and the focus trap. Its `close` event never fires
in the browser this was built against, checked in isolation, so the focus restore cannot hang
off it and `shut()` does it directly. Escape could not be tested there at all, since that
browser delivers no key events; nothing is claimed about it and it gets a handler anyway.
Closing twice is a no-op.

**The vehicles page is a doorway now, and the tab is gone.** `/vehicles/` is a zero-delay
meta refresh to `/armory/`, canonical pointed there and `noindex` on it, **because GitHub
Pages cannot send a 301 and a deleted page is a permanent 404 for everyone holding the
link.** The build fails if that refresh tag goes missing. Weight was measured, not assumed:
45 KB gzipped, which is what Pages serves.

**Every nav link is boxed now**, which is the owner's call. The two tools were boxed and the
references were plain; the owner reads the box as finished rather than as primary, and these
are finished. The consequence, written down because the code cannot say it: a box on
everything marks nothing, so nothing in the nav ranks the tools above the references. A
`.nav-gap` spacer carried that split until it came out the same day, below.

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

The session signing key and the identity salt both ended in `|| "wardogs"`. That string is
written in `worker/vote-worker.js`, which is a public file in a public repository, so a deploy
that was missing its secrets came up looking perfectly healthy and signed every session with a
key anyone could look up. Minting a token for any account, the owner's included, was a matter
of reading the repo. Nothing about that deploy would have looked wrong from outside, which is
the part worth remembering: this was not a bug anyone would have noticed.

Missing secrets now answer 503 on every route. `VOTE_SALT` is required, not optional.
`tools/check-build.js` fails the build if `env.SECRET || "literal"` reappears anywhere in the
worker, because writing a default is exactly the tempting thing to do the next time a deploy
will not come up.

Three more, found in the same read and all with the same shape, a check that looks like it
asks the right question and does not:

- **The post-login return address was prefix-matched.**
  `back.startsWith("https://www.wardogsbuilder.com")` is true of
  `https://www.wardogsbuilder.com.example.net/`, which is somebody else's domain, and the new
  session token is appended to whatever comes out of that test. Asking to be sent home got you
  sent next door holding a token. Origins are parsed and compared now, and the OAuth `state`
  is signed, so a callback this worker did not start is not followed.
- **`GET /comments` published Discord ids.** `GET /designs` strips `by` and says why in a
  comment; the comment list was written later and never got the same treatment, so the field
  one route was careful about was public one route over. Both go out through a projection that
  names what leaves, so the next field added to a stored record is private by default.
- **Request bodies were unbounded** before `JSON.parse`. Capped, and measured on what arrived
  rather than on `Content-Length`, which a client can simply not send.

Also: the admin token is compared byte for byte instead of with `===`, and a corrupt KV record
now costs that record rather than throwing out of the handler and killing the route.

Every one of these was watched failing against the unfixed code before being trusted; the
script that puts each bug back is not committed, but `test/worker.mjs` carries the assertions.
Posture, and the four things GitHub Pages makes impossible, in
[security](processes/security.md).

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

### The 3D view, condensed: six entries about one rewrite

Six passes over the isometric view, kept as one because they are one decision each and the
narration has been paid for. All six are pinned in `test/elevation.js`, and `git log` has the
reasoning in full.

**Draw order is a graph, not a sort.** Ordering by how far each piece's middle sits from the
camera drew short pieces over long ones, reported as a wall not carrying on through. Pairs
that actually overlap are ordered against each other and the rest are left alone: 0.7 ms for
117 pieces, 3.2 ms for 624, against a sixteen millisecond frame. Reverting the sort fails six
checks. What is left is that a turned piece is still compared by the box around it, which is
in `docs/3d-view-design.md` rather than in anyone's head.

**A piece is a prism over its own four corners**, not its bounding box. A 4x4 tower at forty
five degrees has a box 5.66 across, so it drew half again too wide and square on when the
piece is a diamond, and the plan and the 3D disagreed about the one thing this tool exists to
be right about. Which sides face the camera is worked out per piece, so seam suppression
follows the piece rather than the grid.

**Runs, not boxes.** A perimeter is one wall to the builder and was thirty outlined boxes to
the renderer. A side joined to a neighbour the plan already calls the same wall is interior
and goes, uprights included: 612 edges down to 209 on a fifty one piece base. The seam mask
is in world directions and the visible faces depend on the spin, which is checked as
arithmetic at all four spins, because suppressing the wrong side looks almost right.

**Height is the whole job of this view**, so a block stands 1.45 times the ground scale
rather than one cell against a cell 0.866 wide, the FOB stands its catalog two blocks rather
than a third of one, and the camera sits above the textbook thirty degrees. `fit3D` projects
all eight corners of the volume, having previously measured the ground and let bases run off
the top.

**Colour is by material, and the key cannot lie.** Towers and bunkers left the hescos' gold
for concrete, bremers took a paler concrete of their own, and a picked piece is filled rather
than outlined. Four things move together or the key is wrong: the role on the piece, its
colour, its label, and the list the key is built from. One behaviour change came with it, and
the suite says so out loud: runs merge by role, so a hesco meeting a bremer now shows the
join.

**The plan draws its writing last.** Labels, height chips and note marks were drawn per
piece, so a tower dropped beside the thing you were pointing at painted over its label.

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

**A chosen chip in a strip was invisible.** `.seg button` sets a transparent background after
the shared `button.active` rule at the same specificity, so the filled state kept its
near-black ink and lost the fill behind it. The storey strip had drawn "All" as an empty box
for as long as it existed, and nobody read it as a bug because a blank chip looks like a gap.
Restated at a specificity that wins.

**Reopening a saved base showed a build cost of zero.** `loadCurrent` is reached from a
promise, so it lands after startup has worked every figure out from the empty design nobody
was looking at. It recomputes now, without saving, since nothing changed by being reopened.
Same shape as the "Plan your FOB" bug: something read off the design, refreshed only on the
path where the design is edited.

### The designs page stops spending space on nothing

The same mistake three times: a layout built for a full rectangle used for a list that
usually is not one. `.chips.sorts` is the width of its contents rather than spanning the
column the way the filter bar does beside a search box. The card grid drew hairlines as
background through a 1px gap, right for a dense table and wrong here, where one design left
an empty track reading as a missing thing; it is centred rows carrying their own edges. The
submit form went too, since it asked for a link, a name and an author the planner's Submit
button already knows, **and the line promising submissions are read before they go up came
off with it: that stopped being true when the queue was removed.** Thumbnails went 150px to
190px, since most bases are nearer square than a card is.

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
different way. It turns the selection about its own centre now: the average of the pieces,
which a turn maps to itself, put on the grid first so a quarter turn goes grid to grid, and
four of them land exactly back. Pinned in `test/planner-tools.js`.

In the worker, `/designs` listed what had once been approved, stranding three real
submissions in the old queue state. It lists what is not hidden instead. Needed a wrangler
deploy; `git push` does not ship the worker.

### A run steps along the piece, not down the drag

A diagonal wall came out ragged for three reasons, and fixing the first two was not enough.
`snapPoint` snaps in the piece's own frame, because a 1x1 turned forty five degrees steps
0.707 to meet its neighbour; at 0, 90, 180 and 270 that is the world grid, so square-on
placement is unchanged. `snapPlace` then measures from the nearest piece of the same kind
and angle, so leaving the line takes three quarters of a block rather than the half plain
rounding asks for. And a run spaced its pieces by their extent along the drag, so unless the
piece sat square-on the blocks met at one corner: it walks the two moves a piece can make
and still touch, takes whichever stays nearest the drag line, and stops when the best move
would put it further off that line than its own longest leg. `wallGap` was measuring upright
boxes too, so a flush turned wall reported a break that was not there.

Pinned in `test/runs.js`, including three checks that assert the old behaviour fails: the
first two fixes each looked right and were not.

### A way in is a run, and only where somebody can stand (`e9868d9`)

`climbRuns` groups touching pieces of one verdict so a run counts once;
`reachableFromOutside` floods from beyond the bounds. Wire and hedgehogs do not stop the
flood, or one line of wire would hide a perimeter. Past the cell budget everything is called
reachable: **over-reporting is the safe way to be wrong about a way in**. `test/planner.js`.

### A gap you cannot see is named, not merged away (`e9868d9`)

`hairlineGap` states the distance rather than closing it: **widening the merge tolerance
would make the plan lie about a hole in a wall**. `HAIRLINE` widens the spatial index too,
since a rule about pieces that do not touch cannot come from an index that only pairs ones
that do. Anything past it is a firing slit. `test/issues.js`.

### The panel leads with pallets, and stopped asking (`592ad7c`)

`pallets = ceil((supplies - startingSupplies) / suppliesPerPallet)` is the headline, and
`tools/site/context.js` computes it identically for design pages, since the planner and the
page about the same base must not disagree. Help text said 1,900 while the catalog said
1,800 for months, so prose interpolates and `tools/check-build.js` fails on any supply
figure the catalog does not state. Reload cost stays unpublished, not guessed.

### One wall draws as one wall (`615fab9`, completed by `41488cb`)

`seamFamily` merges anything tagged `wall` with another wall of its role; gates, bunkers and
towers carry cover without being walls and stay separate. Labels key off the buildable, not
the family. **`41488cb` is the half that matters: seam bits are worked out in world space
and drawn inside `ctx.rotate()`, so a rotated wall suppressed the wrong edges. Read that
commit before touching either.** The icon cap moved to about two cells, since a pixel cap
shrinks the art the further you zoom in.

### The front page says what the site is for (`c5e57bf`)

Hero states what the site is rather than sloganeering about pallets. **Guides were removed
in full, generator and prose and sitemap entries, so `/guides/` and the four guide URLs
return 404. That was a deliberate call, not an oversight.**

## Where the rest lives

- what a change will break: [effects/CONTEXT.md](effects/CONTEXT.md)
- what is unfinished: [OPEN.md](OPEN.md)
- why a check exists: [objects/guards/verification.md](objects/guards/verification.md)
- the planner itself: [objects/planner/planner-app.md](objects/planner/planner-app.md)
