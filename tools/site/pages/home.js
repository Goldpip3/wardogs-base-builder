/* The front page.
   Body sits at column zero deliberately. Indenting it would add whitespace inside
   these template literals, and that whitespace is page content. */
module.exports = ctx => {
  const { catalog, run, page, write, withStats, designCard, ranked, FORWARD_SHARED } = ctx;


// --- home ---
write("index.html", page({
  title: "WARDOGS Builder: plan your FOB before the match",
  desc: "Free WARDOGS base planner and reference. Lay out walls, gates and gun pits and see the Build Supply cost, then look up artillery firing solutions, round penetration and damage, vendor prices, loadouts and vehicles.",
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
  <h1>Plan the FOB,<br>then look up the numbers</h1>
  <p class="lede">A fan-made planner and reference for WARDOGS. The base builder is the part
  being worked on now: lay the whole FOB out first, down to the last hesco block, and you get
  the Build Supply total, what that is in pallets, and how many truck runs it takes.
  ${catalog.logistics.suppliesPerPallet.toLocaleString()} supplies to a pallet, two pallets to
  a truck.</p>
  <p class="lede sub">The rest of the game gets the same treatment as it goes up: artillery
  firing solutions, what each round does to each armour tier, vendor prices, loadouts and
  vehicles. Everything along the top of the page is being filled in, numbers first.</p>
  <div class="actions">
    <a class="btn primary" href="/planner/">Open the planner</a>
    <a class="btn" href="/designs/">Community designs</a>
  </div>
  <div class="hero-rule"></div>
</div></section>

<section><div class="wrap">
  <div class="section-head">
    <div><span class="eyebrow">Community</span><h2 class="display">Designs from players</h2></div>
    ${withStats.length ? `<a class="btn sm" href="/designs/">See all</a>` : ""}
  </div>
  ${withStats.length
    ? `<div class="grid">${ranked.slice(0, 6).map(designCard).join("")}</div>`
    : `<div class="empty">
        <h3>Nobody has submitted one yet</h3>
        <p>This list is built by players, not by me. Make something in the planner, hit
        Share, and paste the link on the designs page. The whole design travels inside the
        URL, so there is nothing to upload.</p>
        <a class="btn primary" href="/designs/">Submit the first design</a>
      </div>`}
</div></section>

<section><div class="wrap">
  <span class="eyebrow">The tool</span>
  <h2 class="display">What the planner does</h2>
  <div class="features">
    <div><h3>Every buildable, real costs</h3><p>All ${catalog.buildables.length} structures from
      the Large Hammer, with Build Supply costs read from the in-game radial menu.</p></div>
    <div><h3>Drag to lay a wall</h3><p>Pieces sit edge to edge with a live count
      and cost as you drag, so a perimeter takes seconds.</p></div>
    <div><h3>Build upwards</h3><p>Drop a CIWS onto a Hesco platform and it stacks
      automatically. Lower storeys stay visible underneath.</p></div>
    <div><h3>Know the supply run</h3><p>Total supplies, pallets, and how many truck
      or helicopter trips that actually is.</p></div>
    <div><h3>Catches mistakes</h3><p>Anything outside the build zone, overlaps,
      gates off the ground, weapons with no sky, pieces floating with nothing under them.</p></div>
    <div><h3>Share a design as a link</h3><p>The whole layout travels in the URL. Post it and it
      opens ready to inspect, no account and nothing to install.</p></div>
  </div>
</div></section>

<section><div class="wrap">
  <span class="eyebrow">Reference</span>
  <h2 class="display">The rest of the numbers</h2>
  <div class="features">
    <a href="/buildables/"><h3>Buildables</h3><p>Every structure with its Build Supply cost,
      size, height and hammer tier.</p></a>
    <a href="/ballistics/"><h3>Ballistics</h3><p>What each round does to each armour tier, per
      hit zone, with shots to kill.</p></a>
    <a href="/artillery/"><h3>Artillery</h3><p>Type in the coordinates the game gives you and
      get bearing, range and elevation.</p></a>
    <a href="/armory/"><h3>Armory</h3><p>Every weapon, attachment, round and armour piece with
      what the vendor wants for it.</p></a>
    <a href="/loadouts/"><h3>Loadouts</h3><p>Price up a full kit and see what one death actually
      costs you.</p></a>
    <a href="/vehicles/"><h3>Vehicles</h3><p>Ground and air, what they cost to field, and the
      weapons that mount on them.</p></a>
  </div>
</div></section>`,
}));

// --- buildables reference ---
};
