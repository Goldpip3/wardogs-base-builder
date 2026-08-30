// Generates the buildable icons as original flat schematics.
// Two reasons they're drawn rather than lifted from the game: it keeps the project
// free of anyone else's art, and a flat schematic reads far better on a top-down plan
// than a 3/4 perspective render does.
//
//   node tools/make-icons.js
//
// Palette is deliberately neutral so every icon stays legible both on the dark palette
// list and on top of the role colours out on the map.
const fs = require("fs");
const path = require("path");

const INK = "#1d1f11";      // outline
const BONE = "#ddd8c0";     // primary material
const SHADE = "#a8a389";    // secondary / shadowed material
const METAL = "#8f97a0";    // steel
const DARK = "#4a4f38";     // openings, voids

const wrap = body =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" ` +
  `stroke="${INK}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">\n${body}\n</svg>\n`;

// a hesco cell: gabion mesh square
const hescoCell = (x, y, w, h, fill = BONE) => {
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`;
  const step = w / 2;
  for (let i = 1; i < 2; i++)
    s += `<path d="M${x + i * step} ${y}V${y + h}" stroke-width="1" opacity=".45"/>`;
  const vstep = h / 2;
  for (let j = 1; j < 2; j++)
    s += `<path d="M${x} ${y + j * vstep}H${x + w}" stroke-width="1" opacity=".45"/>`;
  return s;
};

const ICONS = {
  // ---- hesco family: gabion baskets, seen face on ----
  "hesco-small": hescoCell(14, 24, 36, 24),
  "hesco-tall":  hescoCell(18, 10, 28, 44),
  "hesco-quad": [0, 1, 2, 3].map(i => hescoCell(4 + i * 14, 16, 13, 32, i % 2 ? SHADE : BONE)).join(""),

  // ---- sandbags: stacked, staggered courses ----
  "sandbag-wall": (() => {
    let s = "";
    const rows = [[6, 42], [11, 32], [16, 22]];
    for (const [x0, y] of rows)
      for (let i = 0; i < 3; i++)
        s += `<rect x="${x0 + i * 17}" y="${y}" width="16" height="11" rx="5.5" fill="${BONE}"/>`;
    return s;
  })(),

  // ---- bremer / T-wall: concrete slab on a foot, wire on top ----
  "bremer-wall":
    `<path d="M22 18h20v34H22z" fill="${SHADE}"/>` +
    `<path d="M14 52h36v6H14z" fill="${BONE}"/>` +
    `<path d="M22 18v34M42 18v34" stroke-width="1" opacity=".4"/>` +
    `<circle cx="27" cy="12" r="5" stroke="${METAL}" fill="none"/>` +
    `<circle cx="37" cy="12" r="5" stroke="${METAL}" fill="none"/>`,

  // ---- entryways ----
  "door":
    `<path d="M18 8h28v48H18z" fill="${SHADE}"/>` +
    `<path d="M24 14h16v42H24z" fill="${DARK}"/>` +
    `<circle cx="36" cy="35" r="2.5" fill="${BONE}" stroke="none"/>`,
  "gate":
    `<path d="M6 16h24v32H6zM34 16h24v32H34z" fill="${METAL}"/>` +
    `<path d="M6 16h24v32H6zM34 16h24v32H34z"/>` +
    `<path d="M30 12v40M34 12v40" stroke-width="2"/>` +
    `<path d="M4 52h56v6H4z" fill="${BONE}"/>` +
    `<path d="M12 24l12 16M52 24L40 40" stroke-width="1.5" opacity=".5"/>`,

  // ---- area denial ----
  "barbed-wire":
    `<path d="M6 46h52" stroke-width="3"/>` +
    [0, 1, 2, 3].map(i => `<circle cx="${13 + i * 13}" cy="30" r="9" stroke="${METAL}" fill="none"/>`).join("") +
    `<path d="M10 46V34M32 46V30M54 46V34" stroke-width="2"/>`,
  "hedgehog":
    `<path d="M12 12l40 40M52 12L12 52M32 6v52" stroke-width="5" stroke="${METAL}"/>` +
    `<path d="M12 12l40 40M52 12L12 52M32 6v52" stroke-width="1.5"/>`,

  // ---- shelters & positions ----
  "bunker":
    `<path d="M8 20h48v32H8z" fill="${BONE}"/>` +
    `<path d="M8 20l8-8h32l8 8" fill="${SHADE}"/>` +
    `<path d="M16 32h32v9H16z" fill="${DARK}"/>` +
    `<path d="M8 52h48" stroke-width="2"/>`,
  "ifs": // plan view: four doorways in a square shell
    `<path d="M8 8h48v48H8z" fill="${BONE}"/>` +
    `<path d="M20 20h24v24H20z" fill="${DARK}"/>` +
    `<path d="M26 8v12M38 8v12M26 44v12M38 44v12M8 26h12M8 38h12M44 26h12M44 38h12" stroke-width="2"/>`,
  "recon-tower":
    `<path d="M10 50h44v8H10z" fill="${SHADE}"/>` +
    `<path d="M16 22h32v28H16z" fill="${BONE}"/>` +
    `<path d="M10 10h44v12H10z" fill="${SHADE}"/>` +
    `<path d="M22 30h20v10H22z" fill="${DARK}"/>` +
    `<path d="M50 22v28M54 22v28" stroke-width="1.5"/>` +
    [0, 1, 2, 3].map(i => `<path d="M50 ${28 + i * 7}h4" stroke-width="1.5"/>`).join(""),
  "recon-tent":
    `<path d="M6 50L32 14l26 36z" fill="${SHADE}"/>` +
    `<path d="M6 50h52" stroke-width="2"/>` +
    `<path d="M18 44l8-11M32 44V24M46 44l-8-11" stroke-width="1.2" opacity=".55"/>`,

  // ---- emplacements ----
  "l81-mortar": // sandbag ring seen from above, tube on its baseplate
    `<circle cx="32" cy="34" r="24" fill="${SHADE}"/>` +
    `<circle cx="32" cy="34" r="15" fill="${DARK}"/>` +
    `<path d="M32 44L44 12" stroke-width="6" stroke="${METAL}"/>` +
    `<path d="M32 44L44 12" stroke-width="1.5"/>` +
    `<path d="M24 46h16" stroke-width="3"/>`,
  "vanguard-ciws": // radome over a gun mount
    `<path d="M10 44h44v12H10z" fill="${SHADE}"/>` +
    `<ellipse cx="30" cy="26" rx="14" ry="16" fill="${BONE}"/>` +
    `<path d="M42 34l14-8" stroke-width="6" stroke="${METAL}"/>` +
    `<path d="M42 34l14-8" stroke-width="1.5"/>` +
    `<path d="M22 44v-6M38 44v-6" stroke-width="1.5" opacity=".5"/>`,
  "talon-9k-sam": // launcher rails on a turntable
    `<path d="M12 46h40v10H12z" fill="${SHADE}"/>` +
    `<circle cx="32" cy="46" r="7" fill="${METAL}"/>` +
    `<path d="M20 40L46 12" stroke-width="7" stroke="${BONE}"/>` +
    `<path d="M20 40L46 12" stroke-width="1.5"/>` +
    `<path d="M26 46L52 18" stroke-width="7" stroke="${SHADE}"/>` +
    `<path d="M26 46L52 18" stroke-width="1.5"/>`,
  "drill-rig": // derrick over a wellhead
    `<path d="M10 54h44v6H10z" fill="${SHADE}"/>` +
    `<path d="M20 54L32 8l12 46z" fill="${BONE}"/>` +
    `<path d="M23 42h18M26 30h12M28 20h8" stroke-width="1.8"/>` +
    `<path d="M32 8v46" stroke-width="1.5" opacity=".5"/>`,

  // ---- logistics & utility ----
  "refuel-station":
    `<path d="M14 12h26v44H14z" fill="${BONE}"/>` +
    `<path d="M20 20h14v12H20z" fill="${DARK}"/>` +
    `<path d="M40 24h8v20a4 4 0 01-8 0" stroke="${METAL}" stroke-width="3" fill="none"/>` +
    `<path d="M10 56h34" stroke-width="2"/>`,
  "repair-station":
    `<circle cx="32" cy="32" r="17" fill="${SHADE}"/>` +
    `<circle cx="32" cy="32" r="7" fill="${DARK}"/>` +
    [0, 1, 2, 3, 4, 5].map(i => {
      const a = (i * Math.PI) / 3, c = Math.cos(a), s = Math.sin(a);
      return `<path d="M${32 + c * 17} ${32 + s * 17}L${32 + c * 24} ${32 + s * 24}" stroke-width="6" stroke="${SHADE}"/>` +
             `<path d="M${32 + c * 17} ${32 + s * 17}L${32 + c * 24} ${32 + s * 24}" stroke-width="1.5"/>`;
    }).join(""),
  "builders-radio":
    `<path d="M10 26h44v28H10z" fill="${BONE}"/>` +
    `<circle cx="24" cy="40" r="8" fill="${DARK}"/>` +
    `<path d="M38 34h12M38 40h12M38 46h12" stroke-width="2"/>` +
    `<path d="M46 26L54 8" stroke-width="2" stroke="${METAL}"/>`,
  "loudspeaker":
    `<path d="M26 50h12v8H26z" fill="${SHADE}"/>` +
    `<path d="M32 50V22" stroke-width="3"/>` +
    `<path d="M18 12l16 6v14l-16 6z" fill="${BONE}"/>` +
    `<path d="M40 14c5 4 5 14 0 18" stroke="${METAL}" stroke-width="2" fill="none"/>` +
    `<path d="M46 9c8 7 8 25 0 32" stroke="${METAL}" stroke-width="2" fill="none"/>`,

  // ---- the FOB itself ----
  "fob":
    `<path d="M8 24h48v32H8z" fill="${BONE}"/>` +
    `<path d="M8 24l24-14 24 14" fill="${SHADE}"/>` +
    `<path d="M20 36h10v20H20z" fill="${DARK}"/>` +
    `<path d="M38 36h10v10H38z" fill="${DARK}"/>` +
    `<path d="M32 10V2" stroke-width="2" stroke="${METAL}"/>`,
};

const outDir = path.join(__dirname, "..", "assets", "icons");
fs.mkdirSync(outDir, { recursive: true });
let n = 0;
for (const [name, body] of Object.entries(ICONS)) {
  fs.writeFileSync(path.join(outDir, name + ".svg"), wrap(body));
  n++;
}
console.log(`wrote ${n} icons to assets/icons/`);
