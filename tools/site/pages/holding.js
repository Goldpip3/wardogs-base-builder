/* Pages that exist but are still waiting on the game. Artillery lands here first.
   Body sits at column zero deliberately. Indenting it would add whitespace inside
   these template literals, and that whitespace is page content. */
module.exports = ctx => {
  const { esc, run, page, write } = ctx;

const COMING_SOON = [];
const LANDED = [
  {
    slug: "armory",
    nav: "Armory",
    title: "WARDOGS Armory - weapons, attachments and costs",
    h1: "Armory",
    desc: "Every WARDOGS weapon and attachment with what it costs to buy and run. In progress - the numbers go in as the game comes back up.",
    lede: "Every weapon and attachment, what it costs to buy, and what it costs to keep feeding.",
    plan: [
      "Each weapon with its vendor price, ammo type and what a full magazine costs to replace.",
      "Attachments listed per weapon - optics, muzzles, grips - with the price and what they actually change.",
      "Sorting by cost per magazine, so you can see which guns are cheap to run and which quietly drain cash.",
    ],
  },
  {
    slug: "loadouts",
    nav: "Loadouts",
    title: "WARDOGS Loadout Cost Calculator",
    h1: "Loadout calculator",
    desc: "Price up a full WARDOGS loadout - weapon, attachments, armour, ammo and gear - and see what one death costs you. In progress.",
    lede: "Pick a weapon, hang attachments off it, add armour and ammo, and see what the whole kit costs to field once.",
    plan: [
      "Build a kit from the armory and get a running total as you add to it.",
      "Cost per life: what you are actually writing off when the kit does not come home.",
      "Share a loadout by link, the same way base designs already work.",
    ],
  },
  {
    slug: "vehicles",
    nav: "Vehicles",
    title: "WARDOGS Vehicles - ground and air, costs and running costs",
    h1: "Vehicles",
    desc: "WARDOGS ground and air vehicles with purchase price, fuel and ammunition costs. In progress.",
    lede: "Ground and air, what each one costs to buy, and what it costs every time you take it out.",
    plan: [
      "Split by ground and air, with purchase price and crew requirement.",
      "Running costs: fuel per trip, and what a full ammo load costs on something like a tank.",
      "Repair and rearm costs, so a vehicle you keep alive can be compared against one you keep replacing.",
    ],
  },
];

void LANDED;
for (const c of COMING_SOON) {
  write(c.slug + "/index.html", page({
    title: c.title,
    desc: c.desc,
    canonical: "/" + c.slug + "/",
    body: `<section><div class="wrap">
  <span class="eyebrow">In progress</span>
  <h1>${esc(c.h1)}</h1>
  <p class="lede">${esc(c.lede)}</p>
  <div class="empty" style="margin-top:38px;text-align:left">
    <span class="wip">Waiting on the game</span>
    <h3>Not filled in yet</h3>
    <p style="margin:0 0 18px">WARDOGS is between tests, and every number on this page has to be
    read off the game rather than guessed. The page is here so it is ready the moment the
    servers are, and so nothing gets invented in the meantime.</p>
    <h3 style="margin-top:26px">What goes here</h3>
    <ul style="max-width:60ch">${c.plan.map(function(x){return "<li>" + esc(x) + "</li>"}).join("")}</ul>
  </div>
  <p style="margin-top:34px"><a class="btn" href="/planner/">Open the planner</a></p>
</div></section>`,
  }));
}
};
