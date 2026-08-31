/* The site stylesheet. Lifted out of the generator because it is two hundred lines
   that almost never change while the pages around them do. */
module.exports = `
/* The ground and the cream are lifted from bulkhead.com/games/wardogs, along with
   square corners on absolutely everything. Two things here are ours.
   The accent: their #c00b0b measures 3.07 on this ground, under AA, so it never
   worked as the colour that carries a number. Yellow does that job at 12.43 and
   matches the game's own sunset key art. Red is left with one job, which is to
   mean a fault: a failed message, and an out of range shot. Nothing decorative.
   The type: bulkhead.com sets headings in Inter over Barlow, but the game's own
   wordmark is squared, flat-apexed and wide, and Inter is none of those. Chakra Petch
   is the closest open face to the logo's character, and it now sets everything, not
   just the headings: one family at 400, 600 and 700 rather than two families reading
   as two sites. It is not the logo, which is drawn lettering, so the ceiling here is
   close rather than same. */
@font-face{font-family:"Chakra Petch";src:url(/fonts/chakrapetch-600.woff2)format("woff2");font-weight:600;font-display:swap}
@font-face{font-family:"Chakra Petch";src:url(/fonts/chakrapetch-700.woff2)format("woff2");font-weight:700;font-display:swap}
@font-face{font-family:"Chakra Petch";src:url(/fonts/chakrapetch-400.woff2)format("woff2");font-weight:400;font-display:swap}

:root{
  --bg:#0c0c0c;--panel:#111;--panel2:#161616;--line:#242424;--line2:#333;
  --text:#fff7ea;--dim:rgba(255,247,234,.44);--dim2:rgba(255,247,234,.66);
  --white:#fff;
  /* One hue, held near 45deg so no step reads green or orange against its neighbour.
     Contrast on --bg, measured: 16.2, 13.6, 12.4, 8.7, 5.1, 1.2. */
  --y-100:#ffe9a3;--y-300:#ffd23f;--yellow:#ffc61a;--y-600:#d9a521;--y-700:#a87a14;--y-950:#2a2210;
  --red:#c00b0b;--red-hot:#f30000;--good:#86ad55;
  --display:"Chakra Petch","Arial Narrow",system-ui,sans-serif;
  --ui:"Chakra Petch","Segoe UI",system-ui,-apple-system,sans-serif;
  --num:"Cascadia Mono",Consolas,ui-monospace,monospace;
}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--text);font-family:var(--ui);font-size:16px;line-height:1.6;
  -webkit-font-smoothing:antialiased}
a{color:var(--text);text-decoration:none}
a:hover{color:var(--yellow)}
.wrap{max-width:1180px;margin:0 auto;padding:0 28px}

/* --- display type: huge, squared, always uppercase ---
   Chakra Petch tops out at 700, and its squared bowls already sit tight, so the negative
   tracking that Inter Black needed would close the counters up here. Zero, not minus. */
h1,h2.display{font-family:var(--display);font-weight:700;text-transform:uppercase;
  letter-spacing:0;line-height:.95;text-wrap:balance}
h1{font-size:clamp(38px,7vw,84px);margin:0 0 18px}
h2{font-family:var(--display);font-weight:600;text-transform:uppercase;letter-spacing:.02em;
  font-size:clamp(24px,3vw,38px);margin:0 0 16px;text-wrap:balance}
h2.display{font-size:clamp(30px,5vw,56px);letter-spacing:0}
h3{font-family:var(--display);font-weight:600;text-transform:uppercase;letter-spacing:.04em;
  font-size:14px;margin:0 0 8px}
p,li{color:var(--dim2)}
.lede{font-size:clamp(17px,1.6vw,21px);color:var(--text);max-width:56ch;line-height:1.45}
.lede.sub{font-size:clamp(15px,1.2vw,17px);color:var(--dim2);margin-top:16px;max-width:60ch}
.eyebrow{font-weight:600;text-transform:uppercase;letter-spacing:.16em;font-size:12px;
  color:var(--yellow);margin-bottom:14px;display:block}

/* --- header --- */
header.site{border-bottom:1px solid var(--line);background:rgba(12,12,12,.92);
  backdrop-filter:blur(8px);position:sticky;top:0;z-index:20}
header.site .wrap{display:flex;align-items:center;gap:28px;min-height:74px}
.brand{font-family:var(--display);font-weight:700;letter-spacing:.01em;font-size:22px;
  text-transform:uppercase;line-height:1;display:flex;align-items:baseline;gap:8px}
.brand span{font-family:var(--ui);font-weight:600;font-size:10px;letter-spacing:.18em;
  color:var(--dim);text-transform:uppercase}
.brand:hover{color:var(--text)}
/* the two tools sit hard left next to the brand, everything else is pushed right by the gap */
nav.site{display:flex;align-items:center;gap:26px;flex:1}
.nav-gap{flex:1}
nav.site a{font-weight:600;text-transform:uppercase;letter-spacing:.12em;font-size:12px;color:var(--dim2)}
nav.site a:hover{color:var(--text)}
nav.site a[aria-current]{color:var(--text)}
/* the CTA is a bordered block, and its label is optically centred inside it */
nav.site a.cta{display:inline-flex;align-items:center;justify-content:center;gap:9px;
  border:1px solid var(--yellow);color:var(--text);background:transparent;
  padding:0 18px;height:40px;letter-spacing:.14em}
nav.site a.cta:hover{background:var(--yellow);border-color:var(--yellow);color:var(--bg)}

/* --- buttons --- */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:11px;height:52px;padding:0 26px;
  border:1px solid var(--text);color:var(--text);background:transparent;font-family:var(--ui);
  font-weight:600;text-transform:uppercase;letter-spacing:.14em;font-size:13px;cursor:pointer}
.btn:hover{background:var(--text);color:var(--bg)}
.btn.primary{border-color:var(--yellow);background:var(--yellow);color:var(--bg)}
.btn.primary:hover{background:var(--y-300);border-color:var(--y-300);color:var(--bg)}
.btn.sm{height:38px;padding:0 16px;font-size:11px}

/* --- hero --- */
.hero{padding:clamp(56px,9vw,120px) 0 clamp(40px,6vw,72px);border-bottom:1px solid var(--line);
  position:relative;overflow:hidden}
.hero .actions{display:flex;gap:14px;margin-top:32px;flex-wrap:wrap}
.hero-rule{height:1px;background:linear-gradient(90deg,var(--yellow),transparent);margin-top:40px}

/* --- the hero loop ---
   Gameplay behind the headline. The poster is a background on the section rather than only
   the video's own poster attribute, so the still is what shows wherever the video does not
   play: reduced motion, a narrow screen, a browser that refuses to autoplay. The scrim is
   two gradients, heaviest on the left where the text sits and along the top edge, which is
   where the recording carries its money counter. Text keeps its contrast against the scrim,
   not against whatever frame happens to be under it. --- */
.hero.has-video{background:var(--bg) url(/video/wardogs-hero-poster.jpg) center/cover no-repeat}
.hero .hero-video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;
  z-index:0;pointer-events:none;border:0;
  /* Knocked back in the pixels rather than only under the scrim. Full-saturation gameplay
     next to the cream and the yellow makes both look like a different site. */
  filter:saturate(.62) contrast(1.06) brightness(.68)}
.hero .hero-scrim{position:absolute;inset:0;z-index:1;pointer-events:none;background:
  linear-gradient(90deg,rgba(12,12,12,.96) 0%,rgba(12,12,12,.84) 42%,rgba(12,12,12,.34) 72%,rgba(12,12,12,.58) 100%),
  linear-gradient(180deg,rgba(12,12,12,.72) 0%,rgba(12,12,12,0) 26%,rgba(12,12,12,0) 58%,var(--bg) 100%)}
.hero.has-video .wrap{position:relative;z-index:2}
/* No motion, and no 2.5 MB on a phone: the poster carries the page on its own. */
@media(prefers-reduced-motion:reduce){.hero .hero-video{display:none}}
@media(max-width:760px){.hero .hero-video{display:none}}

section{padding:clamp(44px,6vw,76px) 0}
section+section{border-top:1px solid var(--line)}
.section-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;
  margin-bottom:30px;flex-wrap:wrap}

/* --- cards --- */
.grid{display:grid;gap:1px;background:var(--line);border:1px solid var(--line);
  grid-template-columns:repeat(auto-fill,minmax(270px,1fr))}
.card{background:var(--panel);padding:24px;display:block;position:relative;transition:background .15s}
.card:hover{background:var(--panel2);color:var(--text)}
.card h3{color:var(--text);font-family:var(--display);font-weight:700;font-size:19px;
  letter-spacing:0;text-transform:uppercase;margin-bottom:8px}
.card p{font-size:14px;color:var(--dim);line-height:1.5}
.card .stats{display:flex;gap:18px;margin-top:18px;font-family:var(--num);font-size:12px;
  color:var(--text);font-variant-numeric:tabular-nums;flex-wrap:wrap}
.card .stats span{color:var(--dim);font-family:var(--ui)}
/* Who it takes to hold the base, sat with the other facts about the design rather than
   given a row of its own: it is one short phrase and it belongs next to the score. */
.card .stats .crew{display:inline-flex;gap:6px;align-items:baseline}
.card .stats .crew span{color:var(--dim);font-family:var(--ui)}
.card .stats .crew b{color:var(--text);font-weight:600;font-family:var(--num);
  font-variant-numeric:tabular-nums}

/* --- the base itself, at the top of its own card ---
   A community list of names tells you nothing about the thing you are choosing between, and
   a base is a shape. Colour and footprint only: no names, no height badges, no grid. At this
   size none of those can be read, and each one turns something you take in at a glance into
   something you have to study. The canvas sits on a darker ground than the card so a plan
   reads as a plan rather than as a graphic bleeding off the panel. --- */
/* 190 rather than 150: most bases are nearer square than the card is, so a shorter
   strip letterboxed them into a band with black either side. */
.card .thumb{display:block;height:190px;margin:-24px -24px 18px;
  width:calc(100% + 48px);background:var(--bg);border-bottom:1px solid var(--line)}

/* --- the community list is not a table ---
   The shared grid draws its hairlines by showing its own background through a 1px gap, which
   is right for a dense table of buildables where every cell is filled. A list of designs is
   rarely a full rectangle, and with one design in it that trick drew a large grey panel
   beside the card: an empty cell reading as a missing thing rather than as space. Here the
   cards carry their own edges and the gaps are just the page. --- */
/* Rows rather than a fixed set of columns, so what is there is centred instead of being
   left hanging against the left edge with the rest of the row empty. A grid always draws its
   full width of tracks, which with one design meant one card and three columns of nothing.
   A max width keeps that single card from growing into a poster. */
#designList .grid{display:flex;flex-wrap:wrap;justify-content:center;align-items:stretch;
  gap:16px;background:none;border:0}
#designList .grid > *{flex:1 1 280px;max-width:380px;min-width:0;border:1px solid var(--line)}
/* Cards in a row are the same height whatever is written on them. One design carries a note
   and a crew and the next carries neither, so left to their contents they came out ragged,
   which reads as a broken layout rather than as two different designs. Stretch the row, let
   the card fill its share, and drop the buttons to the bottom so they line up across the row
   instead of floating wherever the text above them happened to end. */
#designList .grid > *,
#designList .grid > * > summary{display:flex;flex-direction:column;flex:1;min-width:0}
#designList .card{border:0;flex:1;display:flex;flex-direction:column}
#designList .card .vote{margin-top:auto}

/* --- feature list: prose in columns rather than panels. A row that does not fill
   reads as a list ending, where an unfilled panel grid reads as a hole. --- */
.features{display:grid;grid-template-columns:1fr;column-gap:44px;margin-top:20px}
.features > *{display:block;border-top:1px solid var(--line2);padding:20px 0 22px}
.features h3{font-family:var(--display);font-weight:700;font-size:18px;letter-spacing:0;
  text-transform:uppercase;margin-bottom:9px}
.features p{font-size:14px;color:var(--dim);line-height:1.55;max-width:40ch}
.features a:hover{color:var(--yellow)}
@media(min-width:640px){.features{grid-template-columns:1fr 1fr}}
@media(min-width:1000px){.features{grid-template-columns:repeat(3,1fr)}}

/* --- tables --- */
table{width:100%;border-collapse:collapse;font-size:14px;margin:20px 0}
th{text-align:left;font-weight:600;font-size:10px;letter-spacing:.16em;text-transform:uppercase;
  color:var(--dim);padding:12px 12px;border-bottom:1px solid var(--line2)}
td{padding:12px;border-bottom:1px solid var(--line);color:var(--dim2)}
td.n{font-family:var(--num);font-variant-numeric:tabular-nums;text-align:right;white-space:nowrap;
  color:var(--text)}
tbody tr:hover td{background:var(--panel)}
.tag{font-size:10px;font-weight:600;padding:3px 8px;background:transparent;color:var(--dim);
  border:1px solid var(--line2);text-transform:uppercase;letter-spacing:.1em}

/* --- stat bar --- */
.statbar{display:grid;gap:1px;background:var(--line);border:1px solid var(--line);
  grid-template-columns:repeat(auto-fit,minmax(140px,1fr));margin:26px 0}
.statbar div{background:var(--panel);padding:20px}
.statbar b{display:block;font-family:var(--display);font-weight:700;font-size:30px;color:var(--text);
  font-variant-numeric:tabular-nums;line-height:1;letter-spacing:0}
.statbar span{font-size:10px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;
  color:var(--dim);margin-top:8px;display:block}

.note{background:var(--panel);border-left:2px solid var(--yellow);padding:18px 20px;margin:24px 0;
  font-size:14px;color:var(--dim2)}
.note strong{color:var(--text)}

/* --- empty / coming-soon states --- */
.empty{border:1px dashed var(--line2);padding:clamp(32px,5vw,56px);text-align:center}
.empty h3{font-family:var(--display);font-weight:700;font-size:22px;letter-spacing:0;
  color:var(--text);margin-bottom:10px}
.empty p{max-width:52ch;margin:0 auto 22px}
.wip{display:inline-block;font-weight:600;font-size:10px;letter-spacing:.16em;text-transform:uppercase;
  color:var(--yellow);border:1px solid var(--y-700);padding:3px 9px;margin-bottom:14px}

/* --- community designs --- */
.vote{display:flex;align-items:center;gap:4px}
/* In a card this row carries the arrows, the link into the planner and one more button, and
   a 270px column is not wide enough for all of it in a line. It used to be a single nowrap
   row with hard margins, so the last button hung outside the card it belonged to. Let it
   wrap, and let the gap do the spacing instead of per-button margins. */
.card .vote{flex-wrap:wrap;gap:8px;margin-top:16px}
.card .vote > *{margin-left:0 !important}
.card .vote .score{margin-right:4px}
/* The arrows keep the first line to themselves and the two actions split the next, so a
   narrow card reads as two deliberate rows rather than as buttons that ran out of room. */
.card .vote .btn.sm{flex:1 1 42%;padding:0 10px}
.vote button{display:inline-flex;align-items:center;gap:5px;background:transparent;cursor:pointer;
  border:1px solid var(--line2);color:var(--dim2);font-family:var(--ui);font-weight:600;font-size:12px;
  padding:5px 10px;font-variant-numeric:tabular-nums}
.vote button:hover:not(:disabled){border-color:var(--text);color:var(--text)}
.vote button:disabled{opacity:.45;cursor:default}
.vote button[data-cast="1"]{border-color:var(--yellow);color:var(--yellow)}
.vote .score{font-family:var(--num);font-size:13px;color:var(--text);min-width:2ch;text-align:center}

/* --- submit form and comment threads --- */
.form{display:grid;gap:14px;max-width:620px;margin-top:26px}
.field label{display:block;font-weight:600;font-size:11px;letter-spacing:.14em;
  text-transform:uppercase;color:var(--dim);margin-bottom:6px}
.field input,.field textarea{width:100%;background:var(--panel);color:var(--text);
  border:1px solid var(--line2);padding:11px 13px;font-family:var(--ui);font-size:15px}
.field input:focus,.field textarea:focus{outline:none;border-color:var(--yellow)}
.field textarea{resize:vertical;min-height:76px}
.field .hint{font-size:12px;color:var(--dim);margin-top:6px}
.msg{padding:12px 14px;border-left:2px solid var(--red);background:var(--panel);font-size:14px}
.msg.good{border-color:var(--good)}
.thread{margin-top:20px;display:grid;gap:1px;background:var(--line);border:1px solid var(--line)}
.cmt{background:var(--panel);padding:14px 16px}
.cmt .who{font-weight:600;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:var(--text)}
.cmt .when{font-size:11px;color:var(--dim);margin-left:8px;text-transform:none;letter-spacing:0}
.cmt p{margin-top:6px;font-size:14px;color:var(--dim2);white-space:pre-wrap;overflow-wrap:anywhere}
.design-open{background:var(--panel2);padding:22px 24px;border:1px solid var(--line);border-top:0}
details.design summary{cursor:pointer;list-style:none}
details.design summary::-webkit-details-marker{display:none}
/* --- catalogue: chips, search, grid and table --- */
.chips{display:flex;flex-wrap:wrap;gap:1px;background:var(--line);border:1px solid var(--line)}
/* A filter bar spans its column because it sits next to a search box that wants the rest of
   the width. Three sort tabs have nothing to sit next to, so a full width band left a grey
   stripe across the page with three words at one end of it. These are the width of what is
   in them. */
.chips.sorts{display:inline-flex;flex-wrap:nowrap;width:auto}
.chip{background:var(--panel);color:var(--dim2);border:0;cursor:pointer;font-family:var(--ui);
  font-weight:600;font-size:11px;letter-spacing:.1em;text-transform:uppercase;padding:9px 13px}
.chip:hover{background:var(--panel2);color:var(--text)}
.chip[aria-pressed="true"]{background:var(--yellow);color:var(--bg)}
.chip small{opacity:.65;margin-left:6px;font-size:10px}
.cat-search{flex:1 1 210px;min-width:180px;background:var(--panel);color:var(--text);
  border:1px solid var(--line2);padding:10px 13px;font-family:var(--ui);font-size:14px}
.cat-search:focus{outline:none;border-color:var(--yellow)}

/* --- the armory rail ---
   Ten categories used to be ten filled chips over two rows, with the chosen one a solid
   yellow block: the loudest mark on the page was the filter you had already set. A rail
   reads down in one pass, the counts line up so they compare, and the selection is an edge
   and a colour rather than a slab. Below 900px it lays back down as a scrolling row,
   because a 200px rail on a phone is most of the phone. --- */
.cat-layout{display:grid;grid-template-columns:1fr;gap:22px;margin:28px 0 0}
@media(min-width:900px){.cat-layout{grid-template-columns:196px 1fr}}
.cat-rail{border:1px solid var(--line);background:var(--panel);padding:5px 0;align-self:start;
  display:flex;flex-direction:column}
.rail-item{display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;
  background:transparent;border:0;border-left:2px solid transparent;cursor:pointer;
  font-family:var(--ui);font-weight:600;font-size:11px;letter-spacing:.08em;
  text-transform:uppercase;color:var(--dim2);padding:9px 13px;text-align:left}
.rail-item b{font-family:var(--num);font-weight:400;font-size:11px;color:var(--dim)}
.rail-item:hover{background:var(--panel2);color:var(--text)}
.rail-item[aria-pressed="true"]{background:var(--panel2);color:var(--yellow);
  border-left-color:var(--yellow)}
.rail-item[aria-pressed="true"] b{color:var(--yellow)}
.cat-top{display:flex;gap:10px;align-items:stretch;flex-wrap:wrap}
.cat-meta{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin:12px 0 16px}
.cat-meta #count{margin:0}
.cat-sorts{display:flex;align-items:center;gap:14px;margin-left:auto;font-weight:600;
  font-size:10px;letter-spacing:.16em;text-transform:uppercase}
.cat-sorts>span{color:var(--dim)}
.cat-sorts button{background:transparent;border:0;cursor:pointer;padding:0 0 3px;
  font-family:var(--ui);font-weight:600;font-size:10px;letter-spacing:.16em;
  text-transform:uppercase;color:var(--dim2);border-bottom:2px solid transparent}
.cat-sorts button:hover{color:var(--text)}
.cat-sorts button[aria-pressed="true"]{color:var(--yellow);border-bottom-color:var(--yellow)}
.cat-sorts button[data-dir="asc"]::after{content:" ↑"}
.cat-sorts button[data-dir="desc"]::after{content:" ↓"}
@media(max-width:899px){
  .cat-rail{flex-direction:row;overflow-x:auto;padding:0}
  .rail-item{width:auto;white-space:nowrap;border-left:0;border-bottom:2px solid transparent}
  .rail-item[aria-pressed="true"]{border-left:0;border-bottom-color:var(--yellow)}
}
.view-toggle{display:flex;gap:1px;background:var(--line);border:1px solid var(--line)}
th.sortable{cursor:pointer;user-select:none;white-space:nowrap}
th.sortable:hover{color:var(--text)}
th.sortable::after{content:"";opacity:.35;margin-left:6px}
th.sortable[data-dir="asc"]::after{content:"↑";opacity:1;color:var(--yellow)}
th.sortable[data-dir="desc"]::after{content:"↓";opacity:1;color:var(--yellow)}
.cat-grid{display:grid;gap:1px;background:var(--line);border:1px solid var(--line);
  grid-template-columns:repeat(auto-fill,minmax(230px,1fr));margin-top:18px}
.cat-grid[hidden]{display:none}
/* A grid column is min-width:auto by default, so the widest cell sets the floor and the
   buildables table, which carries a sentence of description, pushed the rail off the page
   rather than scrolling. The column is allowed to be narrower than its contents and the
   table scrolls inside it. */
.cat-main{min-width:0}
.cat-tablebox{overflow-x:auto}
.cat-card{background:var(--panel);padding:18px;display:flex;gap:14px;align-items:flex-start}
.cat-card[hidden]{display:none}
.cat-card:hover{background:var(--panel2)}
.cat-card img{width:52px;height:52px;object-fit:contain;flex:0 0 auto}
.cat-card h3{font-family:var(--display);font-weight:700;font-size:15px;letter-spacing:0;
  text-transform:uppercase;color:var(--text);margin-bottom:6px}
.cat-card .facts{font-family:var(--num);font-size:12px;color:var(--text);
  font-variant-numeric:tabular-nums}
.cat-card .facts span{color:var(--dim);font-family:var(--ui);margin-right:4px}
.cat-card p{font-size:12.5px;color:var(--dim);margin-top:8px;line-height:1.45}
/* --- armory: the catalogue as cards ---
   A row per item was fine when an item was a name and a number. Every item has its art
   now, so the default view shows it, and the table stays for comparing a column of prices.
   Both are the same elements reordered, so hidden has to be spelled out for the card. */
.acards{display:grid;gap:1px;background:var(--line);border:1px solid var(--line);
  grid-template-columns:repeat(auto-fill,minmax(250px,1fr));margin-top:18px}
.acard{background:var(--panel);padding:14px;display:flex;gap:13px;align-items:center}
.acard[hidden]{display:none}
.acard:hover{background:var(--panel2)}
.acard-art{flex:0 0 auto;width:64px;height:64px;background:var(--bg);border:1px solid var(--line);
  display:flex;align-items:center;justify-content:center}
.acard-art img{max-width:56px;max-height:56px;object-fit:contain}
.acard-body{flex:1;min-width:0}
.acard-body b{display:block;font-weight:600;color:var(--text);font-size:13.5px;line-height:1.3}
.acard-cat{display:block;font-size:10px;font-weight:600;letter-spacing:.12em;
  text-transform:uppercase;color:var(--dim);margin-top:5px}
.acard-price{flex:0 0 auto;font-family:var(--num);font-size:13px;color:var(--text);
  font-variant-numeric:tabular-nums;text-align:right}
.cat-empty{padding:34px;text-align:center;color:var(--dim);border:1px dashed var(--line2)}
/* --- the item detail dialog ---
   A native <dialog>, so Escape, the focus trap and the backdrop are the browser's. The
   catalogue's own art is 512px square where the card shows it at 64, so the panel is the
   first place on the site that shows an item properly rather than as a thumbnail. --- */
/* margin:auto is what centres a modal dialog, and the reset at the top of this file sets
   margin:0 on everything, dialog included. Without it back the panel sits in the top left
   corner of the viewport, which is exactly where it went. */
.idlg{background:var(--panel);color:var(--text);border:1px solid var(--line2);padding:0;
  margin:auto;width:min(560px,calc(100vw - 32px));max-height:calc(100vh - 64px);
  /* Only ever scrolls down. overflow:auto on both axes drew a horizontal track under a
     panel that measured no horizontal overflow at all, and there is nothing here that
     should ever scroll sideways: every child is block level inside a fixed width. */
  overflow-x:hidden;overflow-y:auto;overscroll-behavior:contain}
.idlg::backdrop{background:rgba(0,0,0,.72)}
.idlg-x{position:absolute;top:12px;right:12px;background:transparent;border:1px solid var(--line2);
  color:var(--dim2);cursor:pointer;font-family:var(--ui);font-weight:600;font-size:10px;
  letter-spacing:.14em;text-transform:uppercase;padding:6px 10px}
.idlg-x:hover{border-color:var(--text);color:var(--text)}
.idlg-head{display:flex;gap:18px;align-items:flex-start;padding:24px 24px 18px;
  border-bottom:1px solid var(--line)}
.idlg-art{flex:0 0 auto;width:132px;height:132px;background:var(--bg);border:1px solid var(--line);
  display:flex;align-items:center;justify-content:center}
.idlg-art img{max-width:120px;max-height:120px;object-fit:contain}
.idlg-art img[hidden]{display:none}
.idlg-cat{display:block;font-weight:600;font-size:10px;letter-spacing:.16em;
  text-transform:uppercase;color:var(--dim)}
.idlg h2{font-family:var(--display);font-weight:700;font-size:22px;letter-spacing:0;
  text-transform:uppercase;margin:7px 0 0;line-height:1.15}
.idlg-price{font-family:var(--num);font-size:15px;color:var(--yellow);margin-top:9px;
  font-variant-numeric:tabular-nums}
/* Two columns so a label and its figure sit on one line and the figures stack into a
   column you can read down. A definition list rather than a table because this is one
   item's properties, not a comparison. */
.idlg-stats{display:grid;grid-template-columns:auto 1fr;gap:1px;background:var(--line);
  border-bottom:1px solid var(--line);margin:0}
.idlg-stats[hidden]{display:none}
.idlg-stats dt{background:var(--panel);padding:10px 14px 10px 24px;font-weight:600;font-size:10px;
  letter-spacing:.14em;text-transform:uppercase;color:var(--dim);white-space:nowrap}
.idlg-stats dd{background:var(--panel);padding:10px 24px 10px 14px;margin:0;font-family:var(--num);
  font-size:13.5px;color:var(--text);font-variant-numeric:tabular-nums;text-align:right}
.idlg-notes{padding:18px 24px 24px}
.idlg-notes p{font-size:13px;line-height:1.5;color:var(--dim);margin:0 0 11px}
.idlg-notes p:last-child{margin-bottom:0}
/* An absent figure is not a missing one, and the difference is the whole editorial line of
   this site. A gap gets the yellow edge so it reads as something the page is telling you
   rather than as a caption nobody wrote. */
.idlg-gap{border-left:2px solid var(--yellow);padding-left:12px}
.idlg-more a{color:var(--text);text-decoration:underline;text-underline-offset:3px}
.idlg-more a:hover{color:var(--yellow)}
.acard[role="button"],tr[data-item]{cursor:pointer}
.acard[role="button"]:focus-visible,tr[data-item]:focus-visible{outline:2px solid var(--yellow);
  outline-offset:-2px}
@media(max-width:560px){
  /* Stacked, the art is the full width of the panel and the close button was sitting on
     top of its frame. The extra top padding is the button's own row. */
  .idlg-head{flex-direction:column;gap:14px;padding-top:56px}
  .idlg-art{width:100%;height:150px}
  .idlg-art img{max-width:140px;max-height:140px}
}
/* --- account control in the header --- */
.acct{display:none;align-items:center;gap:8px;font-weight:600;font-size:11px;white-space:nowrap;
  letter-spacing:.1em;text-transform:uppercase}
.acct.on{display:inline-flex}
.acct a{color:var(--dim2)}
.acct a:hover{color:var(--text)}
/* Your name is the control; what you can do with the account opens under it, anchored to
   the name rather than to the bar so it stays put when the header wraps. */
.acct{position:relative}
.acct .who{color:var(--text);background:none;border:0;padding:4px 0;cursor:pointer;
  font:inherit;letter-spacing:inherit;text-transform:inherit;display:inline-flex;
  align-items:center;gap:6px}
.acct .who:hover{color:var(--accent)}
.acct .caret{font-size:9px;color:var(--dim2)}
.acct-menu{position:absolute;top:calc(100% + 6px);right:0;z-index:60;display:flex;
  flex-direction:column;min-width:150px;background:var(--panel);
  border:1px solid var(--line2);box-shadow:0 8px 22px rgba(0,0,0,.5)}
.acct-menu[hidden]{display:none}
.acct-menu a{padding:9px 13px;white-space:nowrap;color:var(--dim2)}
.acct-menu a:hover{background:var(--panel2);color:var(--text)}

.ad-slot{margin:34px 0;padding:10px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line);
  text-align:center;overflow:hidden}
.ad-slot::before{content:"Advertisement";display:block;font-size:9px;font-weight:600;letter-spacing:.18em;
  text-transform:uppercase;color:var(--dim);margin-bottom:8px}
/* The inline min-height reserves the space so an arriving ad cannot shove the page down.
   When AdSense has nothing to serve it marks the ins unfilled and gives it no height, and
   without this the reservation stays behind as an empty bordered box captioned
   "Advertisement" - worst on a new account, where most requests go unfilled. Collapse it.
   Until AdSense answers there is no data-ad-status at all, so the space is still held. */
.ad-slot:has(ins[data-ad-status="unfilled"]){display:none}

footer.site{border-top:1px solid var(--line);margin-top:0;padding:40px 0;color:var(--dim);font-size:13px}
footer.site .wrap{display:flex;gap:22px;flex-wrap:wrap;align-items:center}
footer.site a{color:var(--dim);font-weight:600;text-transform:uppercase;letter-spacing:.1em;font-size:11px}
footer.site a:hover{color:var(--text)}
footer.site .fine{flex:1 1 100%;color:var(--dim);font-size:12px;line-height:1.5;order:-1;margin-bottom:6px}

/* --- ballistics: the calculator, the body and the ranking ---
   Two colour systems live here and they do different jobs. A round tint says which load
   something is (identity, five fixed hues, always beside the round's name in text). A band
   tint says how fast a kill is (state, the reserved status scale, always beside its own
   label and the number). Neither is ever the only thing carrying the meaning: the ranking
   bar's length says the same thing its band chip does, so the chart survives being read in
   greyscale or by somebody who cannot separate the aqua from the magenta. --- */
.calc{display:grid;gap:1px;background:var(--line);border:1px solid var(--line);
  grid-template-columns:1fr;margin:30px 0 0}
.calc>div{background:var(--panel);padding:22px}
/* The weapon shelf covers the calculator instead of displacing it, so opening and closing
   it changes no height anywhere on the page and nothing under it moves. It takes the
   calculator's own footprint and scrolls inside that when the list is longer. */
.calc-wrap{position:relative}
.calc-wrap>.vpicker{position:absolute;inset:0;z-index:5;margin:30px 0 0;overflow:auto;
  background:var(--panel);border:1px solid var(--line)}
@media(min-width:900px){.calc{grid-template-columns:250px 1fr 300px}}
.calc-body{display:flex;flex-direction:column;align-items:center}
.calc-body .fine{margin-top:12px;text-align:center}
svg.body{width:100%;max-width:210px;height:auto}
/* The unselected plate colour, and the figure's resting state. Warm rather than neutral
   grey so it sits with the cream rather than beside it. The selected zone overrides this
   inline with its time to kill band. */
svg.body .bz{fill:#b8b3a7;stroke:var(--bg);stroke-width:2;cursor:pointer;transition:opacity .12s}
svg.body .bz:hover{opacity:.72}
svg.body .bz:focus{outline:none;stroke:var(--text);stroke-width:2}
/* Selection is an outline, not a fill, because every zone keeps its own time to kill and
   the whole point of the figure is comparing them. White at 3px reads against all four
   band colours; a fill swap would have to take one of them away. */
svg.body .bz[data-on="1"]{stroke:var(--white);stroke-width:3;paint-order:stroke}
.ctl{margin:0 0 16px;display:flex;flex-wrap:wrap;align-items:center;gap:8px}
.ctl[hidden]{display:none}
.ctl>label{flex:0 0 100%;font-weight:600;font-size:10px;letter-spacing:.16em;
  text-transform:uppercase;color:var(--dim)}
.ctl select{flex:1 1 200px;background:var(--panel2);color:var(--text);border:1px solid var(--line2);
  padding:9px 11px;font-family:var(--ui);font-size:14px}
.ctl input[type=range]{flex:1 1 150px;accent-color:var(--yellow);background:transparent}
.ctl .n{font-family:var(--num);font-size:13px;color:var(--text)}
.chip-note{align-self:center;padding:0 0 0 11px;background:var(--panel)}
.calc-out .hero{border-bottom:1px solid var(--line);padding:0 0 12px;margin:0 0 12px}
.calc-out .hero:nth-child(2),.calc-out .hero:nth-child(3){display:inline-block;width:48%;
  vertical-align:top;border-bottom:0}
.calc-out .hero b{display:block;font-family:var(--display);font-weight:700;font-size:40px;
  line-height:1;letter-spacing:0;color:var(--text);font-variant-numeric:tabular-nums}
.calc-out .hero:nth-child(2) b,.calc-out .hero:nth-child(3) b{font-size:26px}
.calc-out .hero span{display:block;font-size:10px;font-weight:600;letter-spacing:.16em;
  text-transform:uppercase;color:var(--dim);margin-top:7px}
.calc-out .fine{margin:10px 0 0}
/* a round's tint, always carrying its name so colour is never load-bearing alone */
.rd{display:inline-flex;align-items:center;gap:6px;font-weight:600;color:var(--text)}
.rd::before{content:"";width:10px;height:10px;background:var(--rd);flex:0 0 auto}
.load{display:inline-flex;align-items:center;gap:5px;white-space:nowrap;margin:0 14px 3px 0}
.chip.rd-chip{display:inline-flex;align-items:center;gap:7px}
.chip.rd-chip::before{content:"";width:9px;height:9px;background:var(--rd);flex:0 0 auto}
.chip.rd-chip[aria-pressed="true"]::before{background:#fff}
.band{display:inline-flex;align-items:center;gap:6px;font-family:var(--num);font-size:12px;
  color:var(--text);border-left:3px solid var(--bd);padding-left:7px}
tr[data-on="1"] td{background:var(--panel2);color:var(--text)}
.lgs{display:flex;flex-wrap:wrap;gap:8px 20px;align-items:center;margin-top:18px;
  padding:12px 14px;border:1px solid var(--line);background:var(--panel)}
.lg{display:inline-flex;align-items:center;gap:7px;font-size:12px;font-weight:600;
  color:var(--text)}
.lg i{width:11px;height:11px;flex:0 0 auto}
.lg i.sq{width:11px;height:11px;transform:rotate(45deg);scale:.82}
.lg-sep{flex:0 0 1px;height:18px;background:var(--line2)}
.rank{display:flex;flex-direction:column;gap:2px;margin:20px 0}
/* Narrow: name and verdict on one line, the bar under it full width, the rest below.
   Wide: one row, six columns. The bar keeps its own column in both, because bar length is
   the measure and a chart whose bars do not share a baseline is not a chart. */
.rrow{display:grid;align-items:center;gap:6px 10px;padding:9px 10px;background:var(--panel);
  cursor:pointer;font-size:13px;
  grid-template-columns:1fr auto auto;
  grid-template-areas:"name name ttk" "track track track" "load dmg stk"}
.rrow:hover{background:var(--panel2)}
.rrow .rname{grid-area:name}
.rrow .rtrack{grid-area:track}
.rrow .rload{grid-area:load}
.rrow .rdmg{grid-area:dmg}
.rrow .rstk{grid-area:stk}
.rrow .rttk{grid-area:ttk}
@media(min-width:760px){
  .rrow{grid-template-columns:210px minmax(80px,1fr) 132px 56px 72px 128px;
    grid-template-areas:"name track load dmg stk ttk";padding:7px 10px}
}
/* the equipped weapon as a control: its name, and the way to change it */
.wpn-open{display:flex;width:100%;align-items:baseline;justify-content:space-between;gap:10px;
  background:var(--panel2);color:var(--text);border:1px solid var(--line2);cursor:pointer;
  padding:10px 12px;font-family:var(--ui);text-align:left}
.wpn-open b{font-family:var(--display);font-weight:700;font-size:17px;letter-spacing:.02em;
  text-transform:uppercase}
.wpn-open span{font-size:10px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;
  color:var(--dim)}
.wpn-open:hover{border-color:var(--yellow)}
.wpn-open:hover span{color:var(--text)}
.wpn-open[aria-expanded="true"]{border-color:var(--yellow);background:var(--yellow);color:var(--bg)}
.wpn-open[aria-expanded="true"] span{color:var(--bg)}
/* the selected weapon, pictured beside its own numbers */
.wpn-art{margin:14px 0 16px;min-height:60px;display:flex;align-items:center}
.wpn-art img{max-width:100%;max-height:60px;object-fit:contain;object-position:left center}
/* Inline, not a flex row: the name and its class label have to keep wrapping as ordinary
   text, and making the container a flex box turned a wrapped name into two columns. */
.rname{font-weight:600;color:var(--text)}
.ricon{width:34px;height:20px;object-fit:contain;opacity:.9;vertical-align:-5px;
  margin-right:7px}
.rtrack{background:var(--panel2);height:13px;display:block;min-width:40px}
.rbar{display:block;height:13px;border-radius:0 3px 3px 0}
.rload{font-size:11px;font-weight:600;color:var(--dim2);display:inline-flex;align-items:center;gap:6px}
.rload::before{content:"";width:9px;height:9px;background:var(--rd);flex:0 0 auto}
.rload em{font-style:normal}
.rrow .n{font-family:var(--num);font-variant-numeric:tabular-nums;color:var(--text);text-align:right}
.rrow .rdmg{cursor:help}

/* --- loadouts: the equipment vendor ---
   Shaped after the vendor the game puts in front of you when you buy a kit: a titled bar
   with its tabs, a slot per thing you carry, the magazine built from a mag and a round,
   and the bag listed back to you. Two things the game shows are deliberately absent.
   Weight, because no weight figure is confirmed here and a bar drawn from a guess is worse
   than no bar. And a cash balance, because this is a planner and nobody's wallet is known;
   the one number that is real, what the kit costs, takes that place instead. */
.vend{border:1px solid var(--line);background:var(--panel);margin:30px 0 0}
.vend-top{display:flex;align-items:center;gap:18px;flex-wrap:wrap;padding:0 14px;
  background:var(--bg);border-bottom:1px solid var(--line);min-height:52px}
.vend-mark{width:11px;height:11px;background:var(--yellow);flex:0 0 auto;
  clip-path:polygon(50% 0,100% 28%,100% 72%,50% 100%,0 72%,0 28%)}
.vend-title{font-family:var(--display);font-weight:700;text-transform:uppercase;
  letter-spacing:.06em;font-size:14px;color:var(--text)}
.vend-tabs{display:flex;align-items:stretch;gap:2px;margin-left:6px}
.vend-tab{background:transparent;border:0;border-bottom:2px solid transparent;color:var(--dim);
  font-family:var(--ui);font-weight:600;text-transform:uppercase;letter-spacing:.14em;
  font-size:11px;padding:16px 14px;cursor:pointer}
.vend-tab:hover{color:var(--text)}
.vend-tab[aria-selected="true"]{color:var(--text);border-bottom-color:var(--yellow)}
.vend-cash{margin-left:auto;display:flex;align-items:baseline;gap:12px;padding:8px 0}
.vend-cash i{font-style:normal;font-size:10px;font-weight:600;letter-spacing:.16em;
  text-transform:uppercase;color:var(--dim)}
.vend-cash b{font-family:var(--display);font-weight:700;font-size:28px;line-height:1;
  color:var(--yellow);font-variant-numeric:tabular-nums}
.vend-body{display:grid;grid-template-columns:1fr;gap:1px;background:var(--line)}
@media(min-width:900px){.vend-body{grid-template-columns:26px 1fr 268px}}
/* the vendor's own spine, vertical down the left edge, decoration only */
.vend-rail{display:none;background:var(--bg);color:var(--dim);font-size:10px;font-weight:600;
  letter-spacing:.28em;text-transform:uppercase;writing-mode:vertical-rl;
  padding:14px 0;text-align:center}
@media(min-width:900px){.vend-rail{display:block}}
.vend-main{background:var(--panel);padding:20px}
.vend-pack{background:var(--panel);padding:20px}
.vend-head{display:flex;align-items:baseline;justify-content:space-between;gap:10px;
  font-size:10px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;
  color:var(--dim);margin:0 0 14px;padding-bottom:8px;border-bottom:1px solid var(--line)}
.vend-head span{color:var(--dim2);letter-spacing:.1em}
.vend-foot{display:flex;align-items:center;justify-content:space-between;gap:16px;
  flex-wrap:wrap;padding:12px 20px;background:var(--bg);border-top:1px solid var(--line);
  min-height:44px}
.vend-foot .fine{margin:0}

/* a slot: art box, price tag, and the picker as its name bar */
.vslots{display:grid;gap:10px;grid-template-columns:repeat(auto-fill,minmax(150px,1fr))}
.vslot{position:relative;border:1px solid var(--line2);background:var(--bg);
  display:flex;flex-direction:column}
.vslot[data-on="1"]{border-color:var(--yellow)}
/* A slot that hangs off the weapon reads as waiting rather than as broken: dashed, dimmed,
   and it says what it is waiting for. Not display:none, because a slot that vanishes takes
   the shape of the kit with it and you cannot see what you have still to fill. */
/* The items shelf: three named groups instead of one wall of 29, and a count on each card
   rather than a pressed state, because four frags and one frag are not the same life. */
/* --- the owner's list --- */
.tds{list-style:none;padding:0;margin:14px 0 0;display:grid;gap:1px;background:var(--line);
  border:1px solid var(--line)}
.td{background:var(--panel);padding:16px 18px}
.td b{display:inline;font-weight:600;font-size:15px;color:var(--text)}
.td-n{margin-left:10px;font-family:var(--num);font-size:11px;color:var(--yellow);
  border:1px solid var(--y-700);padding:2px 7px;white-space:nowrap}
.td p{margin:7px 0 9px;font-size:13.5px;line-height:1.5;color:var(--dim2);max-width:70ch}
.td-w{font-family:var(--num);font-size:11px;color:var(--dim)}

.vitem-group{display:flex;align-items:baseline;gap:9px;margin:22px 0 10px;font-weight:600;
  font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--yellow)}
.vitem-group:first-of-type{margin-top:6px}
.vitem-group span{color:var(--dim);letter-spacing:.1em}
.vcard-item{display:flex;flex-direction:column;position:relative}
.vcard-item[data-qty="0"] .vitem-n{color:var(--dim)}
.vcard-item:not([data-qty="0"]){border-color:var(--yellow)}
.vitem-step{display:flex;align-items:center;justify-content:center;gap:2px;
  border-top:1px solid var(--line);margin-top:auto}
.vitem-step .vstep-b{flex:1;background:transparent;border:0;color:var(--dim2);cursor:pointer;
  font-family:var(--ui);font-size:15px;line-height:1;padding:7px 0}
.vitem-step .vstep-b:hover{background:var(--panel2);color:var(--text)}
.vitem-n{min-width:2ch;text-align:center;font-family:var(--num);font-size:13px;color:var(--yellow)}
.vslot[data-locked="1"]{border-style:dashed;border-color:var(--line2);opacity:.55}
.vslot[data-locked="1"] .vslot-btn{cursor:not-allowed}
.vslot[data-locked="1"] .vslot-art{opacity:.3}
.vslot-role{position:absolute;top:6px;left:8px;font-size:9px;font-weight:600;
  letter-spacing:.14em;text-transform:uppercase;color:var(--dim);pointer-events:none}
.vslot-tag{position:absolute;top:5px;right:5px;background:var(--good);color:var(--bg);
  font-family:var(--num);font-size:11px;font-weight:600;padding:2px 6px;z-index:1}
.vslot-art{height:96px;display:flex;align-items:center;justify-content:center;padding:22px 8px 6px}
.vslot-art img{max-width:100%;max-height:72px;object-fit:contain}
/* On a phone the slots are full width, so a 96px art box on four of them is most of a
   screen of nothing. The box still reads as a box at 64. */
@media(max-width:599px){.vslot-art{height:64px;padding:20px 8px 4px}
  .vslot-art img{max-height:44px}}
/* the name bar is the button that opens the shelf, so the whole card is the control */
.vslot-btn{display:block;width:100%;text-align:left;background:var(--panel2);color:var(--text);
  border:0;border-top:1px solid var(--line2);padding:9px 10px;cursor:pointer;
  font-family:var(--ui);font-size:12.5px}
.vslot-btn::after{content:"";float:right;width:0;height:0;margin:6px 2px 0 0;
  border:4px solid transparent;border-top-color:var(--dim)}
.vslot-btn:hover{background:var(--line);color:var(--text)}
.vslot-btn[aria-expanded="true"]{background:var(--yellow);color:var(--bg)}
.vslot-btn[aria-expanded="true"]::after{border-top-color:var(--bg)}

/* the shelf: the items for one slot, open under the row they belong to */
.vpicker{border:1px solid var(--yellow);background:var(--bg);margin:14px 0 0;padding:14px}
.vpicker-head{display:flex;align-items:center;justify-content:space-between;gap:10px;
  font-size:10px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;
  color:var(--yellow);margin:0 0 12px}
.vpicker-x{background:transparent;border:1px solid var(--line2);color:var(--dim2);
  cursor:pointer;font-family:var(--ui);font-weight:600;font-size:10px;letter-spacing:.12em;
  text-transform:uppercase;padding:5px 10px}
.vpicker-x:hover{border-color:var(--text);color:var(--text)}
.vcard-none .vcard-art{min-height:52px}
.vend-hint{font-size:10px;letter-spacing:.1em;color:var(--dim)}

/* how many magazines, as buttons rather than a spinner nobody can hit on a phone */
.vstep{display:flex;align-items:stretch;border:1px solid var(--line2);background:var(--bg)}
.vstep input{flex:1;min-width:0;background:transparent;color:var(--text);border:0;
  padding:9px 4px;font-family:var(--num);font-size:16px;text-align:center;
  -moz-appearance:textfield;appearance:textfield}
.vstep input::-webkit-outer-spin-button,.vstep input::-webkit-inner-spin-button{
  -webkit-appearance:none;margin:0}
.vstep-b{flex:0 0 auto;width:38px;background:var(--panel2);color:var(--text);border:0;
  cursor:pointer;font-family:var(--ui);font-size:16px;line-height:1}
.vstep-b:hover{background:var(--yellow);color:var(--bg)}

/* mag plus round equals a loaded magazine, the way the vendor spells it out */
.veq{display:grid;gap:10px;align-items:end;margin-top:22px;
  grid-template-columns:1fr;justify-items:stretch}
@media(min-width:760px){.veq{grid-template-columns:1fr auto 1fr auto auto auto 1fr}}
.veq-op{font-family:var(--display);font-weight:700;font-size:20px;color:var(--dim);
  padding-bottom:22px;text-align:center}
@media(max-width:759px){.veq-op{display:none}}
.veq-note{display:block;font-size:9px;font-weight:600;letter-spacing:.14em;
  text-transform:uppercase;color:var(--dim);margin-bottom:6px}
.vqty{display:block}
.vqty input{width:100%;background:var(--bg);color:var(--text);border:1px solid var(--line2);
  padding:9px 10px;font-family:var(--num);font-size:16px}
.vqty span{display:block;font-size:10px;letter-spacing:.1em;text-transform:uppercase;
  color:var(--dim);margin-top:5px}
.vready{border:1px solid var(--line2);background:var(--bg);color:var(--dim);
  font-family:var(--num);font-size:13px;padding:11px 12px;min-height:44px;
  display:flex;align-items:center}
.vready[data-on="1"]{border-color:var(--good);color:var(--text)}

/* the item cards on the Items tab, pressed rather than ticked */
.vgrid{display:grid;gap:8px;grid-template-columns:repeat(auto-fill,minmax(132px,1fr))}
/* On a phone the shelf is the whole screen, and a shelf you scroll thirty-five times is a
   dropdown with extra steps. Two up, with the art small enough that two fit. */
@media(max-width:599px){
  .vgrid{grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:6px}
  .vcard{padding:22px 5px 0}
  .vcard-art{height:40px}
  .vcard-art img{max-width:40px;max-height:40px}
  .vcard-name{font-size:10px;padding:6px 4px}
  .vcard-tag{font-size:9px;padding:1px 4px}
}
.vcard{position:relative;border:1px solid var(--line2);background:var(--bg);cursor:pointer;
  display:flex;flex-direction:column;align-items:center;gap:8px;padding:26px 8px 0;
  font-family:var(--ui);color:var(--dim2);text-align:center}
/* display:flex beats the hidden attribute's UA display:none, so a filtered-out round stayed
   on the shelf while the script believed it had put it away. Any element this file gives an
   explicit display to has to say what hidden means for it. */
.vcard[hidden]{display:none}
.vcard:hover{border-color:var(--line2);color:var(--text)}
.vcard[aria-pressed="true"]{border-color:var(--yellow)}
.vcard-tag{position:absolute;top:5px;right:5px;background:var(--good);color:var(--bg);
  font-family:var(--num);font-size:10px;font-weight:600;padding:2px 5px}
.vcard-art{height:52px;display:flex;align-items:center;justify-content:center}
.vcard-art img{max-width:52px;max-height:52px;object-fit:contain}
.vcard-name{display:block;width:100%;font-size:11px;font-weight:600;padding:7px 6px;
  background:var(--panel2);border-top:1px solid var(--line2);margin-top:auto}
.vcard[aria-pressed="true"] .vcard-name{background:var(--yellow);color:var(--bg)}

/* the bag, listed back to you */
.vpack{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:1px}
.vpack li{display:flex;align-items:center;gap:9px;background:var(--bg);padding:7px 9px;
  font-size:12px;color:var(--dim2)}
.vpack img{width:26px;height:26px;object-fit:contain;flex:0 0 auto}
.vpack span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.vpack b{font-family:var(--num);font-size:11px;color:var(--text);font-weight:400}
.chip img{width:18px;height:18px;object-fit:contain;vertical-align:-4px;margin-right:6px}

ul,ol{padding-left:22px}li{margin:6px 0}
@media(max-width:760px){
  header.site .wrap{flex-wrap:wrap;padding-top:14px;padding-bottom:14px;gap:14px}
  /* flex:none matters: flex-basis:0 from the desktop rule beats width:100% inside a flex
     row, which left the nav as a tall column beside the brand instead of a wrapped block
     under it. */
  nav.site{flex:none;margin-left:0;gap:18px;width:100%;flex-wrap:wrap}
  .nav-gap{display:none}
  .grid{grid-template-columns:1fr}
}
/* --- the nav on a phone, once every link became a box ---
   Two boxes among six plain links wrapped to about 120px. Seven boxes at desktop size did
   not: 40px tall with 18px of gap between them, they came out four rows and 279px, which is
   34% of a 812px phone screen standing between the top of the page and the start of it.
   Measured, because "it looks tall" is not a reason to change a size.

   The boxes stay. They are the whole point of the change and dropping them here would mean
   the nav says one thing on a desktop and another on a phone. They are sized for a phone
   instead: the row height comes off, the letter spacing that was padding out seven words
   comes in, and the gap closes to something that still reads as separate buttons. --- */
@media(max-width:760px){
  nav.site{gap:8px}
  nav.site a.cta{height:30px;padding:0 10px;font-size:11px;letter-spacing:.08em;gap:6px}
  nav.site a{font-size:11px;letter-spacing:.08em}
}

/* --- the artillery map, laid out like the planner: bar, panel, canvas, status --- */
/* The tool takes the whole window. It sits outside .wrap so nothing centres it into a
   1180px column, and the only height it gives up is the site header above it. */
.amap-app{display:flex;flex-direction:column;height:calc(100vh - 78px);min-height:520px;
  border-top:1px solid var(--line);border-bottom:1px solid var(--line);
  background:var(--panel);margin:0}
.amap-bar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:8px 10px;
  border-bottom:1px solid var(--line);background:var(--panel2)}
.amap-sep{width:1px;height:22px;background:var(--line2)}
.amap-layers{display:flex;gap:1px;background:var(--line);border:1px solid var(--line)}
.amap-btn,.amap-lay{background:var(--panel);color:var(--dim2);border:1px solid var(--line2);
  cursor:pointer;font-family:var(--ui);font-size:11px;text-transform:uppercase;
  letter-spacing:.08em;padding:7px 12px}
.amap-lay{border:0;padding:7px 10px}
.amap-btn:hover,.amap-lay:hover{color:var(--text);background:var(--line)}
.amap-btn[aria-pressed="true"]{background:var(--yellow);border-color:var(--yellow);color:var(--bg)}
.amap-lay[aria-pressed="true"]{background:var(--line2);color:var(--text)}
.amap-body{flex:1;display:grid;grid-template-columns:290px 1fr;min-height:0}
.amap-side{border-right:1px solid var(--line);padding:14px;display:flex;
  flex-direction:column;gap:12px;overflow-y:auto;overflow-x:hidden;background:var(--panel)}
.amap-pick{display:flex;gap:8px}
.amap-pick .amap-btn{flex:1}
.amap-row{display:flex;gap:8px}
.amap-side label{flex:1;font-size:11px;color:var(--dim2);text-transform:uppercase;
  letter-spacing:.06em}
.amap-side input{width:100%;padding:8px;background:var(--panel2);
  color:var(--text);border:1px solid var(--line2);font-family:var(--num)}
/* Off with the engine's own spinner: three browsers draw three different widgets and none
   of them belong to this page. .amap-spin replaces it, calling the same stepUp/stepDown. */
.amap-side input[type=number]{appearance:textfield;-moz-appearance:textfield}
.amap-side input[type=number]::-webkit-outer-spin-button,
.amap-side input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
.amap-num{position:relative;display:block;margin-top:4px}
.amap-num input{padding-right:28px}
.amap-spin{position:absolute;top:1px;right:1px;bottom:1px;width:22px;display:flex;
  flex-direction:column;border-left:1px solid var(--line2)}
.amap-spin button{flex:1;padding:0;background:none;border:0;cursor:pointer;position:relative}
.amap-spin button+button{border-top:1px solid var(--line2)}
/* a chevron rather than a glyph: two borders on a small square, turned. It stays sharp at
   any zoom and takes its colour from the state, which a character cannot do */
.amap-spin button::before{content:"";position:absolute;left:50%;top:50%;width:5px;height:5px;
  border-left:1.5px solid var(--dim2);border-top:1.5px solid var(--dim2)}
.amap-up::before{transform:translate(-50%,-25%) rotate(45deg)}
.amap-down::before{transform:translate(-50%,-75%) rotate(-135deg)}
.amap-spin button:hover{background:var(--line2)}
.amap-spin button:hover::before{border-color:var(--text)}
.amap-spin button:active{background:var(--yellow)}
.amap-spin button:active::before{border-color:var(--bg)}
.amap-spin button:focus-visible{outline:1px solid var(--yellow);outline-offset:-1px}
.amap-sol,.amap-note{border:1px solid var(--line);background:var(--panel2);padding:14px}
/* The sidebar ad takes the slack at the foot of the column. The shared .ad-slot rule carries
   34px of vertical margin, which is right between paragraphs of an article and far too much
   in a 290px control column, so it is trimmed here rather than loosened everywhere. */
.amap-ad{margin:auto 0 0}
.amap-ad .ad-slot{margin:14px 0 0}
/* the panel is narrow and the dial note is a sentence, so the table has to wrap inside it
   rather than push a scrollbar under the whole sidebar */
/* Hover, tap or tab a label in the solution and it explains its own number. The column is
   290px and clips horizontally, so the panel is narrower than that and hangs off the left
   edge of the label rather than being centred on it. :focus-within carries the tap on a
   phone, where there is no hover to have. */
.amap-why{position:relative;cursor:help;border-bottom:1px dotted var(--line2)}
.amap-why:hover,.amap-why:focus{color:var(--text);outline:none}
.amap-tip{display:none;position:absolute;left:0;top:calc(100% + 7px);z-index:30;width:236px;
  padding:10px 11px;background:var(--panel);border:1px solid var(--line2);color:var(--dim);
  font-family:var(--ui);font-size:11px;line-height:1.55;text-transform:none;
  letter-spacing:0;font-weight:400;box-shadow:0 10px 26px rgba(0,0,0,.55)}
.amap-why:hover .amap-tip,.amap-why:focus .amap-tip,.amap-why:focus-within .amap-tip{
  display:block}
.amap-sol table{width:100%;table-layout:fixed}
.amap-sol td{white-space:normal;word-break:break-word;padding:6px 0;vertical-align:top}
.amap-sol td:first-child{width:38%;color:var(--dim)}
.amap-sol .fine{display:block;margin-top:2px}
.amap-stage{position:relative;min-width:0;background:#0a0a0a}
.amap-stage canvas{display:block;cursor:crosshair;touch-action:none}
.amap-status{display:flex;gap:22px;flex-wrap:wrap;padding:7px 12px;
  border-top:1px solid var(--line);background:var(--panel2);font-family:var(--num);
  font-size:11px;color:var(--dim)}
.amap-status .good{color:var(--good)}
.amap-status .bad{color:var(--red-hot)}
@media(max-width:900px){
  .amap-app{height:auto}
  .amap-body{grid-template-columns:1fr}
  .amap-side{border-right:0;border-bottom:1px solid var(--line)}
  .amap-stage{height:60vh;min-height:380px}
}
`;
