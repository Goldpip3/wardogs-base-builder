/* The front page.
   Body sits at column zero deliberately. Indenting it would add whitespace inside
   these template literals, and that whitespace is page content.

   The page reads as a manual rather than as a landing page for the planner. That is a
   deliberate demotion: the planner is the best thing here, but it is one chapter, and a
   visitor who wants to know what a round does to Tier 2 armour was bouncing off a page
   that only talked about walls. Every figure below is computed from data/, never typed
   in, so the copy cannot drift away from the tables it describes. */
module.exports = ctx => {
  const { catalog, run, page, write, withStats, designCard, ranked, FORWARD_SHARED,
          ARMORY, BALLISTICS, ARTILLERY } = ctx;

const nBuildables = catalog.buildables.length;
const nPrices     = ARMORY.items.length;
const nWeapons    = BALLISTICS.weapons.length;
const nUnfigured  = (BALLISTICS.unfiguredWeapons || []).length;
const nOpen       = (ARTILLERY.open || []).length;
const perPallet   = catalog.logistics.suppliesPerPallet.toLocaleString();
const palletCash  = catalog.logistics.palletCash;

// --- home ---
write("index.html", page({
  title: "WARDOGS field manual: costs, damage, artillery and a base planner",
  desc: `A fan-made WARDOGS manual. Build Supply costs for all ${nBuildables} buildables, what every round does to each armour tier, artillery firing solutions, ${nPrices} vendor prices, loadouts and vehicles. Plus a planner that lays out your FOB and totals the haul.`,
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
  <span class="eyebrow">Fan-made, and honest about what it does not know</span>
  <h1>The WARDOGS<br>field manual</h1>
  <p class="lede">What a hesco wall costs, what a 7.62 does to Tier 2 armour, and where the
  mortar actually lands. Written down by a player who got tired of losing the same position
  twice for the same reason.</p>
  <p class="lede sub">Every number here was either read off the game or taken from a source
  that gets named on the page it appears on. Where nobody has measured something yet, it
  says so out loud: ${nOpen} open questions on the artillery page, ${nUnfigured} weapons
  still waiting on damage figures. They are printed rather than quietly filled in with
  something that looks about right.</p>
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
      puts down, with cost, footprint, height and tier. Sizes still estimated from beta
      footage end in a question mark, so you can see which ones to trust.</p></a>
    <a href="/ballistics/"><h3>Damage</h3><p>What each round does to each armour tier, broken
      down by where it lands, with shots to kill. ${nWeapons} weapons figured, and the
      ${nUnfigured} that are not yet are named on the page.</p></a>
    <a href="/artillery/"><h3>Artillery</h3><p>Type in the coordinates the game hands you and
      get bearing, range and elevation back. Both SPH-2 arcs where both of them reach, and the
      solution travels as a link.</p></a>
    <a href="/armory/"><h3>Armory</h3><p>${nPrices} weapons, attachments, rounds and armour
      pieces, each with what the vendor wants for it. Worth a look before you spend the
      match fee on a scope you did not need.</p></a>
    <a href="/loadouts/"><h3>Loadouts</h3><p>Price up a full kit and find out what one death
      actually costs you. It is usually worse than you think.</p></a>
    <a href="/vehicles/"><h3>Vehicles</h3><p>Ground and air, what they cost to field, and the
      weapons that bolt onto them.</p></a>
  </div>
</div></section>

<section><div class="wrap">
  <span class="eyebrow">The planner</span>
  <h2 class="display">Lay it out before you haul it</h2>
  <p class="lede">A FOB is easy to start and expensive to redo. The planner lets you build the
  whole thing on a grid first, down to the last block, and tells you what the trip looks like
  before you touch a truck.</p>
  <div class="features">
    <div><h3>Real costs, not guesses</h3><p>Every buildable priced from the in-game radial
      menu. A pallet holds ${perPallet} supplies and costs $${palletCash}, a truck carries two
      of them, and the planner does that arithmetic while you draw.</p></div>
    <div><h3>Drag out a wall</h3><p>Pieces snap edge to edge and the count and cost tick up
      under your cursor, so a perimeter is one drag rather than forty clicks.</p></div>
    <div><h3>Stack it</h3><p>Drop a CIWS onto a hesco platform and it climbs a storey on its
      own. What is underneath stays visible, so you can still read what you are standing on.</p></div>
    <div><h3>Catches what you missed</h3><p>Pieces outside the build zone, walls overlapping,
      a gate hanging off the ground, a gun with no sky above it, anything floating with
      nothing underneath it.</p></div>
    <div><h3>Send it as a link</h3><p>The whole layout rides inside the URL. Paste it in a
      Discord message and it opens ready to look at. No account, no upload, nothing to
      install.</p></div>
    <div><h3>Works with the power off</h3><p>Download the file and it keeps working with no
      connection at all. Handy on a laptop, on a train, or when the site is having a day.</p></div>
  </div>
</div></section>

<section><div class="wrap">
  <div class="section-head">
    <div><span class="eyebrow">Community</span><h2 class="display">Bases worth copying</h2></div>
    ${withStats.length ? `<a class="btn sm" href="/designs/">See all</a>` : ""}
  </div>
  ${withStats.length
    ? `<div class="grid">${ranked.slice(0, 6).map(designCard).join("")}</div>`
    : `<div class="empty">
        <h3>Nobody has posted one yet</h3>
        <p>This part of the manual gets written by players rather than by me. Build something
        in the planner that held, hit Share, and paste the link on the designs page. The whole
        design travels inside the URL, so there is nothing to upload and no account to make.</p>
        <a class="btn primary" href="/designs/">Post the first one</a>
      </div>`}
</div></section>

<section><div class="wrap">
  <div class="note"><strong>Found something wrong?</strong> Good, that is useful. The figures
  here are only as good as the last person who checked them, and a few are still guesses
  wearing a question mark. Say so on the <a href="/feedback/">feedback page</a> and it gets
  fixed for everyone.</div>
</div></section>`,
}));

// --- buildables reference ---
};
