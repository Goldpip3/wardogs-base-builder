/* The front page.
   Body sits at column zero deliberately. Indenting it would add whitespace inside
   these template literals, and that whitespace is page content.

   The page reads as a manual rather than as a landing page for the planner. That is a
   deliberate demotion: the planner is the best thing here, but it is one chapter, and a
   visitor who wants to know what a round does to Tier 2 armour was bouncing off a page
   that only talked about walls. Every figure below is computed from data/, never typed
   in, so the copy cannot drift away from the tables it describes.

   Register is encyclopedic, per Wikipedia's Signs of AI writing. A first pass wrote this
   page in a chatty voice with a narrator in it, and it read as a person performing rather
   than a reference answering. The rules that pass caught eleven times, kept here because
   they are easy to drift back into:

     no narrator, no anecdote, no "by me". The site is not the subject, the game is.
     no "X, not Y". State the claim, drop the foil.
     no second person guessing at the reader ("worse than you think").
     no self-praise. Saying the figures are honest is not evidence that they are;
       printing the open questions is, so the page does that instead.
     no jokes standing in for information.

   Where the sourcing caveat lives is an owner's call, made 2026-08-31: the hero states what
   the site covers, and how the figures were arrived at sits in the corrections note at the
   foot. It is not softened and not shortened, the open-question counts are still computed
   from the data rather than typed, and it still appears on every page that carries a
   figure. It is simply no longer the first thing a visitor reads, because leading with a
   caveat about measurement reads as a warning about the contents. Do not move it back up. */
module.exports = ctx => {
  const { catalog, run, page, write, withStats, designCard, ranked, FORWARD_SHARED,
          ARMORY, BALLISTICS, COMMUNITY_SCRIPT } = ctx;

const nBuildables = catalog.buildables.length;
const nPrices     = ARMORY.items.length;
const nWeapons    = BALLISTICS.weapons.length;
const nUnfigured  = (BALLISTICS.unfiguredWeapons || []).length;
const perPallet   = catalog.logistics.suppliesPerPallet.toLocaleString();
const palletCash  = catalog.logistics.palletCash;

// --- home ---
write("index.html", page({
  title: "WARDOGS field manual: costs, damage, artillery and a base planner",
  desc: `Build Supply costs for all ${nBuildables} WARDOGS buildables, damage by armour tier and hit zone, artillery firing solutions, ${nPrices} vendor prices, loadouts and vehicles. Includes a planner that lays out a FOB and totals the supply run.`,
  canonical: "/",
  body: `${FORWARD_SHARED}
<section class="hero has-video">
  <video class="hero-video" autoplay muted loop playsinline preload="metadata"
    poster="/video/wardogs-hero-poster.jpg" aria-hidden="true" tabindex="-1">
    <source src="/video/wardogs-hero.webm" type="video/webm">
    <source src="/video/wardogs-hero.mp4" type="video/mp4">
  </video>
  <div class="hero-scrim"></div>
  <div class="wrap">
  ${/* "Fan-made reference" is what the footer already says, in the place that has to say it:
        it is the disclaimer, and a disclaimer is a poor thing to lead with.

        Two words, because every longer version came out in the same shape, a noun phrase
        and a snappy fragment after a comma, which reads as written by a machine. */""}
  <span class="eyebrow">Everything WARDOGS</span>
  ${/* No hard break. It was splitting a four word heading into two fixed lines, and with
        "worked out" gone the line it was breaking no longer exists. Left to wrap, the
        heading breaks where the column actually ends instead of where it used to. */""}
  <h1>Every WARDOGS system</h1>
  <p class="lede">Build costs, damage by armour tier and hit zone, artillery firing solutions,
  ${nPrices} vendor prices, loadouts, vehicles and both maps, with a planner that lays out a
  whole FOB and totals the supply run.</p>
  <p class="lede sub">One catalogue underneath all of it, so the armory, the damage calculator
  and the planner cannot quote different numbers for the same round.</p>
  <div class="actions">
    <a class="btn primary" href="/planner/">Open the planner</a>
    <a class="btn" href="/artillery/">Artillery</a>
  </div>
  <div class="hero-rule"></div>
</div></section>

<section><div class="wrap">
  <span class="eyebrow">The manual</span>
  <h2 class="display">What is written down so far</h2>
  <div class="features">
    <a href="/buildables/"><h3>Buildables</h3><p>All ${nBuildables} structures the Large Hammer
      places, with Build Supply cost, footprint, height and hammer tier. Sizes estimated from
      beta footage are marked with a question mark.</p></a>
    <a href="/ballistics/"><h3>Damage</h3><p>Damage per round against each armour tier, by hit
      zone, with shots to kill. ${nWeapons} weapons are figured. The ${nUnfigured} that are not
      are listed by name.</p></a>
    <a href="/artillery/"><h3>Artillery</h3><p>Bearing, range and elevation from the map
      coordinates the game gives. Both SPH-2 arcs are given where both reach, and a solution
      can be shared as a link.</p></a>
    ${/* The vehicles card pointed at a page that listed two categories of this same
          catalogue, so it is one card now rather than two. Vehicles are named here because
          somebody looking for them needs to be told where they went, and this grid is where
          they used to look. */""}
    <a href="/armory/"><h3>Armory</h3><p>All ${nPrices} items with their vendor price, vehicles
      and mounted weapons included. Open any of them for its art, and for the stats where
      any are published.</p></a>
    <a href="/loadouts/"><h3>Loadouts</h3><p>The cost of a full kit, and what one death takes
      off it.</p></a>
  </div>
</div></section>

<section><div class="wrap">
  <span class="eyebrow">The planner</span>
  <h2 class="display">What the planner does</h2>
  <p class="lede">A FOB costs supplies to place and trips to haul. The planner lays a whole
  layout out on a grid and totals both.</p>
  <div class="features">
    <div><h3>Costs from the game</h3><p>Every buildable carries the Build Supply cost shown in
      the in-game radial menu. A pallet holds ${perPallet} supplies and costs $${palletCash};
      a truck carries two.</p></div>
    <div><h3>Wall runs</h3><p>Pieces snap edge to edge, and the count and cost update as a run
      is dragged out.</p></div>
    <div><h3>Stacking</h3><p>A CIWS dropped onto a hesco platform moves up a storey. Lower
      storeys stay visible underneath it.</p></div>
    <div><h3>Checks</h3><p>Flags pieces outside the build zone, overlapping walls, gates off
      the ground, weapons without clear sky, and pieces with no support beneath them.</p></div>
    <div><h3>Sharing</h3><p>The layout is encoded in the URL, so a link opens the design
      directly. No account and no upload.</p></div>
    <div><h3>Offline copy</h3><p>The downloadable file runs with no network connection.</p></div>
  </div>
</div></section>

<section><div class="wrap">
  <div class="section-head">
    <div><span class="eyebrow">Community</span><h2 class="display">Designs from players</h2></div>
    <a class="btn sm" href="/designs/" data-when-designs hidden>See all</a>
  </div>
  <!-- Live, not baked. data/community.json carries no designs and never will, because a
       submission goes to the worker rather than into the repo, so a built-in list here
       could only ever say nobody has posted. Same id and same renderer as the designs
       page, capped at six and without the sort tabs, so the two cannot drift apart. -->
  <div id="designList" data-limit="6" data-notabs>
  ${withStats.length
    ? `<div class="grid design-grid">${ranked.slice(0, 6).map(designCard).join("")}</div>`
    : `<div class="empty">
        <h3>No designs posted yet</h3>
        <p>Designs are submitted from the planner: open one, sign in, and press Submit for
        voting. The layout travels in the URL, so there is nothing to upload and no account
        to create.</p>
        <a class="btn primary" href="/designs/">Go to designs</a>
      </div>`}
  </div>
</div></section>

${COMMUNITY_SCRIPT}`,
}));

// --- buildables reference ---
};
