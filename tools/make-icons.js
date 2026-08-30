// Generates the buildable icons as original flat schematics.
//
//   node tools/make-icons.js
//
// Drawn rather than lifted from the game: it keeps the project clear of anyone else's
// art, and a flat schematic reads better on a top-down plan than a perspective render.
// Each icon is built silhouette-first so it stays recognisable at 20px on the map.
const fs = require("fs");
const path = require("path");

const INK   = "#1d1f11";   // outline
const BONE  = "#ddd8c0";   // primary material
const SHADE = "#a8a389";   // shadowed / secondary
const METAL = "#99a0aa";   // steel
const STEEL = "#6f7681";   // darker steel
const DARK  = "#43482f";   // openings and voids
const WOOD  = "#8a6d3c";

const wrap = body =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" ` +
  `stroke="${INK}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">\n${body}\n</svg>\n`;

const rect = (x, y, w, h, fill, extra = "") =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"${extra}/>`;

// a gabion basket seen face-on: filled cell with a wire mesh over it
function gabion(x, y, w, h, fill = BONE) {
  let s = rect(x, y, w, h, fill);
  const cols = Math.max(2, Math.round(w / 9));
  const rows = Math.max(2, Math.round(h / 9));
  for (let i = 1; i < cols; i++)
    s += `<path d="M${(x + (w / cols) * i).toFixed(1)} ${y}v${h}" stroke-width="1" opacity=".38"/>`;
  for (let j = 1; j < rows; j++)
    s += `<path d="M${x} ${(y + (h / rows) * j).toFixed(1)}h${w}" stroke-width="1" opacity=".38"/>`;
  return s;
}

const ICONS = {
  /* ---------------- cover: the hesco family ---------------- */
  "hesco-small":
    gabion(10, 26, 44, 24) +
    `<path d="M10 26l7-7h44l-7 7" fill="${SHADE}"/>`,          // top face, gives it depth

  "hesco-tall":
    gabion(16, 14, 32, 38) +
    `<path d="M16 14l6-6h32l-6 6" fill="${SHADE}"/>`,

  "hesco-quad":
    [0, 1, 2, 3].map(i => gabion(4 + i * 14.5, 20, 13.5, 30, i % 2 ? SHADE : BONE)).join("") +
    `<path d="M4 20l5-5h58l-5 5" fill="${SHADE}"/>`,

  /* sandbags: three staggered courses of rounded bags */
  "sandbag-wall": (() => {
    let s = "";
    for (const [x0, y] of [[4, 40], [10, 29], [16, 18]])
      for (let i = 0; i < 3; i++)
        s += `<rect x="${x0 + i * 16}" y="${y}" width="15" height="12" rx="6" fill="${i % 2 ? SHADE : BONE}"/>`;
    return s;
  })(),

  /* T-wall: tapered concrete slab on a wide foot, wire coil on top */
  "bremer-wall":
    `<path d="M25 16h14v36H25z" fill="${SHADE}"/>` +
    `<path d="M14 52h36v8H14z" fill="${BONE}"/>` +
    `<path d="M29 16v36M35 16v36" stroke-width="1" opacity=".35"/>` +
    [23, 32, 41].map(cx => `<circle cx="${cx}" cy="10" r="6" fill="none" stroke="${METAL}" stroke-width="2"/>`).join("") +
    `<path d="M17 10h30" stroke="${METAL}" stroke-width="1.5" opacity=".7"/>`,

  /* ---------------- entryways ---------------- */
  "door":
    rect(14, 8, 36, 48, SHADE) +
    rect(20, 14, 24, 42, BONE) +
    `<path d="M24 20h16v16H24z" fill="${DARK}"/>` +
    `<circle cx="39" cy="45" r="2.6" fill="${INK}" stroke="none"/>`,

  /* two armoured leaves meeting in the middle, hazard stripe along the base */
  "gate":
    rect(5, 14, 25, 34, METAL) + rect(34, 14, 25, 34, METAL) +
    `<path d="M9 20l17 22M55 20L38 42" stroke-width="1.5" opacity=".45"/>` +
    `<path d="M30 10v42M34 10v42" stroke-width="2.5" stroke="${STEEL}"/>` +
    rect(4, 48, 56, 8, BONE) +
    [8, 18, 28, 38, 48].map(x => `<path d="M${x} 56l6-8" stroke-width="3" opacity=".35"/>`).join(""),

  /* ---------------- area denial ---------------- */
  /* concertina: overlapping coils on posts, with barbs */
  "barbed-wire": (() => {
    let s = `<path d="M6 50h52" stroke-width="3"/>` +
            `<path d="M12 50V38M32 50V34M52 50V38" stroke-width="2.5"/>`;
    for (const cx of [14, 27, 40, 53])
      s += `<circle cx="${cx}" cy="26" r="10" fill="none" stroke="${METAL}" stroke-width="2.5"/>`;
    for (const [x, y] of [[14, 16], [27, 16], [40, 16], [53, 16], [20, 32], [33, 32], [46, 32]])
      s += `<path d="M${x - 3} ${y - 3}l6 6M${x + 3} ${y - 3}l-6 6" stroke-width="1.6" stroke="${METAL}"/>`;
    return s;
  })(),

  /* czech hedgehog: three girders bolted through a centre plate, with flanged ends */
  "hedgehog": (() => {
    const beams = [[9, 17, 55, 47], [55, 17, 9, 47], [32, 7, 32, 57]];
    let s = beams.map(([x1, y1, x2, y2]) =>
      `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${STEEL}" stroke-width="9" stroke-linecap="butt"/>`).join("");
    s += beams.map(([x1, y1, x2, y2]) =>
      `<path d="M${x1} ${y1}L${x2} ${y2}" stroke-width="1.8" stroke-linecap="butt"/>`).join("");
    // flanged ends, so it reads as angle iron rather than a star
    for (const [x, y, a] of [[9, 17, 33], [55, 47, 33], [55, 17, -33], [9, 47, -33], [32, 7, 90], [32, 57, 90]])
      s += `<g transform="translate(${x} ${y}) rotate(${a})">` +
           `<rect x="-2.5" y="-8" width="5" height="16" fill="${METAL}"/></g>`;
    s += `<rect x="25" y="25" width="14" height="14" rx="2" fill="${METAL}"/>`;
    return s;
  })(),

  /* ---------------- shelters & positions ---------------- */
  /* bunker: sloped roof over thick walls with a firing slit */
  "bunker":
    `<path d="M6 24l10-10h32l10 10z" fill="${SHADE}"/>` +
    rect(6, 24, 52, 30, BONE) +
    rect(15, 32, 34, 10, DARK) +
    `<path d="M6 54h52" stroke-width="2.5"/>` +
    `<path d="M15 32h34" stroke-width="1.5" opacity=".4"/>`,

  /* indirect fire shelter, plan view: square shell, four doorways, dark interior */
  "ifs":
    rect(7, 7, 50, 50, BONE) +
    rect(19, 19, 26, 26, DARK) +
    `<path d="M26 7v12M38 7v12M26 45v12M38 45v12M7 26h12M7 38h12M45 26h12M45 38h12" stroke-width="2.5"/>` +
    `<path d="M19 19h26v26H19z" stroke-width="2"/>`,

  /* two-storey tower: legs, platform, roof, ladder */
  "recon-tower":
    `<path d="M14 58V30M50 58V30" stroke-width="3" stroke="${STEEL}"/>` +
    `<path d="M14 44h36M14 52h36" stroke-width="1.6" opacity=".5"/>` +
    rect(10, 22, 44, 18, BONE) +
    rect(22, 27, 20, 9, DARK) +
    `<path d="M6 22l26-12 26 12z" fill="${SHADE}"/>` +
    `<path d="M52 40v18M58 40v18" stroke-width="1.8" stroke="${WOOD}"/>` +
    [44, 49, 54].map(y => `<path d="M52 ${y}h6" stroke-width="1.8" stroke="${WOOD}"/>`).join(""),

  /* camo net pitched over a frame, with a dark entrance and a ragged hem */
  "recon-tent":
    `<path d="M6 50L32 16l26 34z" fill="${SHADE}"/>` +
    `<path d="M32 16v34" stroke-width="1.5" opacity=".4"/>` +
    `<path d="M24 50v-13l8-9 8 9v13z" fill="${DARK}"/>` +
    [[16, 44], [22, 36], [30, 27], [40, 32], [47, 41], [12, 47], [52, 47]]
      .map(([x, y]) => `<path d="M${x - 3} ${y}l3-3 3 3-3 3z" fill="${DARK}" stroke="none" opacity=".55"/>`).join("") +
    `<path d="M4 50h56" stroke-width="3"/>` +
    `<path d="M6 50l4-4M18 50l4-4M46 50l4-4M54 50l4-4" stroke-width="1.5" opacity=".5"/>`,

  /* ---------------- emplacements ---------------- */
  /* mortar: fat tube on a bipod and baseplate, inside a sandbag ring */
  "l81-mortar":
    `<ellipse cx="32" cy="46" rx="27" ry="13" fill="${SHADE}"/>` +
    `<ellipse cx="32" cy="46" rx="17" ry="7" fill="${DARK}"/>` +
    `<path d="M26 50L42 12" stroke="${STEEL}" stroke-width="11" stroke-linecap="butt"/>` +
    `<path d="M26 50L42 12" stroke-width="1.8" stroke-linecap="butt"/>` +
    `<path d="M40 10h6l-2 6" fill="${METAL}"/>` +           // muzzle
    `<path d="M34 28L20 44M34 28l12 14" stroke="${METAL}" stroke-width="3"/>` +   // bipod legs
    `<path d="M34 28L20 44M34 28l12 14" stroke-width="1.3"/>` +
    `<rect x="18" y="46" width="22" height="6" rx="2" fill="${METAL}"/>`,       // baseplate

  /* CIWS: radome over a barrel assembly */
  "vanguard-ciws":
    rect(10, 46, 44, 12, SHADE) +
    `<ellipse cx="27" cy="30" rx="15" ry="17" fill="${BONE}"/>` +
    `<path d="M27 13v34" stroke-width="1.2" opacity=".3"/>` +
    `<path d="M40 30l16-9" stroke="${STEEL}" stroke-width="9"/>` +
    `<path d="M40 30l16-9" stroke-width="1.8"/>` +
    `<circle cx="56" cy="21" r="3.5" fill="${METAL}"/>`,

  /* SAM: two finned missiles angled off a turntable launcher */
  "talon-9k-sam": (() => {
    const missile = (x1, y1, x2, y2, fill) =>
      `<g transform="rotate(-42 ${x1} ${y1})">` +
      `<rect x="${x1}" y="${y1 - 5}" width="34" height="10" rx="5" fill="${fill}"/>` +
      `<path d="M${x1 + 34} ${y1 - 5}l8 5-8 5z" fill="${METAL}"/>` +        // nose cone
      `<path d="M${x1} ${y1 - 5}l-6-6v22l6-6z" fill="${METAL}"/>` +         // tail fins
      `<rect x="${x1}" y="${y1 - 5}" width="34" height="10" rx="5" fill="none"/>` +
      `</g>`;
    return rect(10, 46, 44, 12, SHADE) +
      `<path d="M18 52h28" stroke-width="1.5" opacity=".45"/>` +
      `<rect x="24" y="38" width="16" height="10" rx="2" fill="${STEEL}"/>` +
      missile(20, 34, 0, 0, BONE) + missile(28, 44, 0, 0, SHADE);
  })(),

  /* Stingray: FPV drone above its launch box */
  "stingray":
    rect(8, 46, 48, 12, SHADE) +
    `<path d="M16 52h32" stroke-width="1.6" opacity=".45"/>` +
    `<path d="M30 34h4v12h-4z" fill="${STEEL}"/>` +
    rect(20, 24, 24, 11, BONE) +
    `<path d="M12 20h10v4H12zM42 20h10v4H42z" fill="${STEEL}"/>` +
    `<path d="M20 26l-6-4M44 26l6-4" stroke-width="2.5" stroke="${STEEL}"/>` +
    `<ellipse cx="13" cy="15" rx="9" ry="3.5" fill="none" stroke="${METAL}" stroke-width="2.5"/>` +
    `<ellipse cx="51" cy="15" rx="9" ry="3.5" fill="none" stroke="${METAL}" stroke-width="2.5"/>`,

  /* drill derrick over a wellhead */
  "drill-rig":
    rect(8, 52, 48, 8, SHADE) +
    `<path d="M18 52L32 8l14 44z" fill="${BONE}"/>` +
    `<path d="M22 40h20M25 30h14M28 20h8" stroke-width="2"/>` +
    `<path d="M32 8v44" stroke-width="1.4" opacity=".4"/>` +
    rect(27, 44, 10, 8, DARK),

  /* ---------------- logistics & utility ---------------- */
  /* fuel pump with hose and nozzle */
  "refuel-station":
    rect(12, 10, 26, 46, BONE) +
    rect(18, 17, 14, 12, DARK) +
    `<path d="M18 36h14M18 42h14" stroke-width="2" opacity=".55"/>` +
    `<path d="M38 22h8a4 4 0 014 4v20a5 5 0 01-10 0V34" stroke="${STEEL}" stroke-width="3" fill="none"/>` +
    `<path d="M8 56h34" stroke-width="3"/>`,

  /* a gear behind, a spanner in front — kept apart so both stay readable */
  "repair-station": (() => {
    let s = "";
    const cx = 24, cy = 26, r = 13;
    for (let i = 0; i < 8; i++) {                       // gear teeth
      const a = (i * Math.PI) / 4;
      s += `<rect x="${(cx + Math.cos(a) * r - 4).toFixed(1)}" y="${(cy + Math.sin(a) * r - 4).toFixed(1)}" ` +
           `width="8" height="8" rx="1.5" fill="${SHADE}" transform="rotate(${(i * 45).toFixed(0)} ${(cx + Math.cos(a) * r).toFixed(1)} ${(cy + Math.sin(a) * r).toFixed(1)})"/>`;
    }
    s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${SHADE}"/>`;
    s += `<circle cx="${cx}" cy="${cy}" r="5" fill="${DARK}"/>`;
    // open-ended spanner across the lower right
    s += `<g transform="rotate(-40 40 42)">` +
         `<rect x="24" y="37" width="34" height="9" rx="4.5" fill="${METAL}"/>` +
         `<path d="M24 37h6v9h-6z" fill="${METAL}"/>` +
         `<path d="M20 34h10v5h-6v5h6v5H20z" fill="${METAL}"/>` +
         `<path d="M20 34h10v5h-6v5h6v5H20z"/>` +
         `<rect x="24" y="37" width="34" height="9" rx="4.5" fill="none"/></g>`;
    return s;
  })(),

  /* field radio: speaker, dial, carry handle, antenna */
  "builders-radio":
    rect(8, 26, 48, 28, BONE) +
    `<circle cx="22" cy="40" r="9" fill="${DARK}"/>` +
    `<circle cx="22" cy="40" r="3.5" fill="${SHADE}" stroke="none"/>` +
    `<path d="M36 34h14M36 40h14M36 46h14" stroke-width="2" opacity=".6"/>` +
    `<path d="M18 26a14 8 0 0128 0" stroke="${STEEL}" stroke-width="2.5" fill="none"/>` +
    `<path d="M48 26L56 8" stroke="${METAL}" stroke-width="2.5"/>` +
    `<circle cx="56" cy="7" r="2.5" fill="${METAL}"/>`,

  /* PA horn on a mast - mouth and sound both to the RIGHT */
  "loudspeaker":
    `<path d="M18 58V22" stroke-width="4" stroke="${STEEL}"/>` +
    `<path d="M10 58h16" stroke-width="3"/>` +
    `<path d="M22 26l18-8v28l-18-8z" fill="${BONE}"/>` +
    `<path d="M22 26h-4v12h4" fill="${SHADE}"/>` +
    `<path d="M46 20c5 6 5 18 0 24" stroke="${METAL}" stroke-width="2.5" fill="none"/>` +
    `<path d="M53 14c8 9 8 27 0 36" stroke="${METAL}" stroke-width="2.5" fill="none"/>`,

  /* ---------------- the FOB ---------------- */
  "fob":
    rect(6, 32, 52, 26, BONE) +
    `<path d="M6 32l8-8h44l-8 8" fill="${SHADE}"/>` +
    rect(16, 20, 32, 12, SHADE) +
    rect(27, 42, 12, 16, DARK) +
    `<path d="M10 38h10v8H10zM44 38h10v8H44z" fill="${DARK}"/>` +
    `<path d="M32 20V6" stroke-width="2.5" stroke="${METAL}"/>` +
    `<path d="M26 9h12M28 5h8" stroke-width="2" stroke="${METAL}"/>`,
};

const outDir = path.join(__dirname, "..", "assets", "icons");
fs.mkdirSync(outDir, { recursive: true });
for (const f of fs.readdirSync(outDir)) fs.unlinkSync(path.join(outDir, f));
let n = 0;
for (const [name, body] of Object.entries(ICONS)) {
  fs.writeFileSync(path.join(outDir, name + ".svg"), wrap(body));
  n++;
}
console.log(`wrote ${n} icons to assets/icons/`);
