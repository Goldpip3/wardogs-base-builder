/* The written guides. Prose, not machinery, which is why it is not in context.js.
   Adding a guide means adding an entry here and nothing else: the index page, the page
   per guide, the cards on the home page and the sitemap all read from this list. */
module.exports = [
  {
    slug: "wardogs-fob-guide",
    title: "WARDOGS FOB Guide",
    blurb: "What a Forward Operating Base actually does, what it costs, and the order to build it in.",
    body: `<p>A FOB is a $2,500 vendor item that takes 2×3 in your inventory. Once placed it
      cannot be moved, so the placement decision is the whole game.</p>
      <h2>What it gives you</h2>
      <p>Three things: it is <strong>required</strong> for most buildables, it <strong>stores
      supplies</strong> (Build, Ammo, Fuel and Mechanical), and it projects a
      <strong>square build zone</strong> that you must build inside, shown blue on the
      minimap. It also carries free Small and Medium hammers, wrenches and signal grenades at
      the FOB computer, so teammates who arrive empty-handed can still help.</p>
      <p>What it does <em>not</em> do is act as a spawn point. That is a separate spawn
      vehicle.</p>
      <h2>Four buildables need no FOB at all</h2>
      <p>Sandbag Wall, Barbed Wire, Hedgehog and Recon Tent can be placed anywhere. Everything
      else has to sit inside a FOB's build zone.</p>
      <h2>Build order that works</h2>
      <ol>
        <li>Place the FOB somewhere a truck or helicopter can actually reach, with cover, and
        not on a skyline.</li>
        <li>Close the perimeter. Walls first, with exactly one vehicle gate and one door.
        A half-finished wall is cover for the enemy.</li>
        <li>Only then add emplacements. Mortars, AA and drill rigs are expensive and they
        advertise the position.</li>
      </ol>
      <h2>Do not seal yourself in</h2>
      <p>Gates must be on the ground and swing through, so leave the inside clear. Leave room
      for a truck to get in and unload. a base a supply run cannot reach is a base that
      starves.</p>`,
  },
  {
    slug: "wardogs-build-costs",
    title: "WARDOGS Build Costs and Supply Runs",
    blurb: "What every buildable costs in Build Supplies, and how many pallets and vehicle trips that really means.",
    body: `<p>Every structure costs <strong>Build Supplies</strong>, drawn from the FOB. Not
      from your pocket. Supplies cost <strong>$10 each</strong> individually at the vendor, and
      a <strong>Build Supply Pallet is $400</strong> and takes 4×2 inventory slots.</p>
      <h2>Think in trips, not supplies</h2>
      <p>The raw supply number is not the thing that costs you. Supplies move as pallets, and a
      vehicle carries a whole number of them: a <strong>truck takes two pallets a trip</strong>,
      a <strong>helicopter one</strong>. A wall that needs 12 pallets is six truck runs across
      contested ground, and that is the real price.</p>
      <h2>Four kinds of supply</h2>
      <ul>
        <li><strong>Build</strong>. Everything you construct.</li>
        <li><strong>Ammo</strong>. Reloads the L81 Mortar, Vanguard CIWS and Talon SAM.</li>
        <li><strong>Fuel</strong>. The Refuel Station, and activating the Drill Rig.</li>
        <li><strong>Mechanical</strong>. The Repair Station, and Stingray drones.</li>
      </ul>
      <p>Delivering the wrong pallet is a wasted trip. Ask the builder what the FOB is short of
      before you load.</p>
      <h2>Build faster</h2>
      <p>Hitting the yellow X marks while building speeds construction considerably. Releasing
      and re-pressing between contacts cancels the backswing, which players report as roughly
      tripling build speed.</p>`,
  },
  {
    slug: "wardogs-anti-climb-walls",
    title: "Stopping People Vaulting Your Walls",
    blurb: "Waist-height cover gets vaulted. Here is the layering that does not.",
    body: `<p>Most perimeters fail the same way: they are built out of waist-height blocks,
      and infantry simply vault them.</p>
      <h2>The heights</h2>
      <p>Hesco Block (Small) and Sandbag Wall are one block tall. Cover to shoot over, and a
      step to climb. Hesco Block (Tall) and Hesco Wall (Quad) are two, which is full-body
      cover. The Bremer Wall is three, and topped with barbed wire.</p>
      <h2>The rule that matters</h2>
      <p><strong>Nothing can be built on top of a Bremer Wall.</strong> That makes it the
      finishing layer, not a foundation. Run tall Hesco for the wall, then cap it with Bremer,
      and the result cannot be climbed without taking damage.</p>
      <h2>Sandbags are the exception worth knowing</h2>
      <p>Sandbags are designed to sit on top of Hesco. Low Hesco with sandbags stacked on it is
      the combination the community settled on for CIWS emplacements. High enough to protect
      the gunner, low enough not to block the gun.</p>
      <p>The planner counts how much of your cover is still waist height, under
      <strong>Anti-climb</strong>, so you can see the weakness before somebody finds it.</p>`,
  },
  {
    slug: "wardogs-hammers",
    title: "WARDOGS Hammers: What Each One Builds",
    blurb: "Small, Medium and Large. What unlocks at each tier and which one to actually carry.",
    body: `<p>Hammers come from the Support progression track and are bought at HQ. All three
      need Build Supplies to use.</p>
      <table>
        <thead><tr><th>Hammer</th><th>Weight</th><th>Speed</th><th>Builds</th></tr></thead>
        <tbody>
          <tr><td>Small</td><td>0.32 kg</td><td>Slow</td><td>Small buildables only</td></tr>
          <tr><td>Medium</td><td>1.23 kg</td><td>Moderate</td><td>Small plus basic and large</td></tr>
          <tr><td>Large</td><td>3.18 kg</td><td>Fastest</td><td><strong>Everything</strong></td></tr>
        </tbody>
      </table>
      <h2>Which to carry</h2>
      <p>The Large Hammer is the only one that builds emplacements, drill rigs, bunkers and
      towers, and it builds everything else faster, but it is 3.18 kg, and weight class
      decides whether you can sprint to the Hot Zone.</p>
      <p>Worth knowing: a placed FOB carries free Small and Medium hammers at its computer. If
      somebody else on your squad is running a Large Hammer, you may not need to carry one at
      all.</p>`,
  },
];
