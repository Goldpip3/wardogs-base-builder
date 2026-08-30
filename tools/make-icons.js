// Generates the buildable icons.
//
//   node tools/make-icons.js
//
// Everything is drawn in a single shared isometric projection with one light
// direction, so the whole set reads as one system rather than 23 unrelated
// drawings. Structures are composed from iso boxes via box(); the projection
// helper is what keeps them consistent, not discipline.
//
// Original artwork - no game assets - which matters because the project is
// public and may take donations.
const fs = require("fs");
const path = require("path");

/* ---------------- isometric projection ---------------- */
// x runs to screen-right-down, y to screen-left-down, z straight up.
const K = 0.866, U = 7.4, OX = 32, OY = 34;
const px = (x, y, z) => [
  OX + (x - y) * K * U,
  OY + (x + y) * U * 0.5 - z * U,
];
const poly = (pts, fill, extra = "") =>
  `<path d="M${pts.map(p => p.map(v => v.toFixed(1)).join(" ")).join("L")}Z" fill="${fill}"${extra}/>`;

/* material: [top, left, right] faces, lit from the upper left */
const M = {
  hesco:  ["#e3ddc0", "#b9b294", "#8d8768"],
  sand:   ["#e8dcb8", "#c4b78e", "#9a8e69"],
  crete:  ["#cfcfc6", "#a6a69c", "#7d7d74"],
  steel:  ["#b3bcc6", "#8b95a1", "#66707c"],
  dark:   ["#4a4f3a", "#3a3e2d", "#2c2f22"],
  olive:  ["#8f9463", "#71764c", "#565a38"],
  rust:   ["#c08356", "#9a6742", "#754d30"],
};
const INK = "#22241a";

// an axis-aligned box: origin corner (x,y,z), size (w,d,h)
function box(x, y, z, w, d, h, mat, o = {}) {
  const c = M[mat] || M.hesco;
  const top = [px(x, y, z + h), px(x + w, y, z + h), px(x + w, y + d, z + h), px(x, y + d, z + h)];
  const left = [px(x, y + d, z), px(x + w, y + d, z), px(x + w, y + d, z + h), px(x, y + d, z + h)];
  const right = [px(x + w, y, z), px(x + w, y + d, z), px(x + w, y + d, z + h), px(x + w, y, z + h)];
  let s = poly(left, o.left || c[1]) + poly(right, o.right || c[2]) + poly(top, o.top || c[0]);
  if (o.mesh) {                       // gabion wire, drawn on the two visible faces
    const n = Math.max(2, Math.round(Math.max(w, d) * 1.6));
    for (let i = 1; i < n; i++) {
      const t = i / n;
      s += `<path d="M${px(x, y + d, z + h * t).join(" ")}L${px(x + w, y + d, z + h * t).join(" ")}" stroke="${INK}" stroke-width=".7" opacity=".33"/>`;
      s += `<path d="M${px(x + w, y, z + h * t).join(" ")}L${px(x + w, y + d, z + h * t).join(" ")}" stroke="${INK}" stroke-width=".7" opacity=".33"/>`;
    }
    for (let i = 1; i < n; i++) {
      const t = i / n;
      s += `<path d="M${px(x + w * t, y + d, z).join(" ")}L${px(x + w * t, y + d, z + h).join(" ")}" stroke="${INK}" stroke-width=".7" opacity=".33"/>`;
      s += `<path d="M${px(x + w, y + d * t, z).join(" ")}L${px(x + w, y + d * t, z + h).join(" ")}" stroke="${INK}" stroke-width=".7" opacity=".33"/>`;
    }
  }
  return s;
}
// a flat pad on the ground, for bases and platforms
const pad = (x, y, w, d, mat, h = 0.16) => box(x, y, 0, w, d, h, mat);
// a strut between two points in 3-space
function strut(a, b, col, wdt = 2.4) {
  const p1 = px(...a), p2 = px(...b);
  return `<path d="M${p1.join(" ")}L${p2.join(" ")}" stroke="${col}" stroke-width="${wdt}" stroke-linecap="round"/>`;
}
const wrap = body =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">\n${body}\n</svg>\n`;

/* ---------------- the set ---------------- */
const ICONS = {};

// --- hesco family -------------------------------------------------------
ICONS["hesco-small"] = box(-1.6, -1.6, 0, 3.2, 3.2, 1.9, "hesco", { mesh: 1 });
ICONS["hesco-tall"]  = box(-1.4, -1.4, 0, 2.8, 2.8, 4.0, "hesco", { mesh: 1 });
ICONS["hesco-quad"]  = [0, 1, 2, 3].map(i =>
  box(-3.4 + i * 1.75, -0.9, 0, 1.7, 1.8, 3.0, "hesco", { mesh: 1 })).join("");

// --- sandbags: staggered rounded courses --------------------------------
ICONS["sandbag-wall"] = (() => {
  let s = "";
  for (let row = 0; row < 3; row++)
    for (let i = 0; i < 4; i++) {
      const off = row % 2 ? 0.42 : 0;
      s += box(-3.4 + i * 1.7 + off, -0.75, row * 0.72, 1.55, 1.5, 0.7, "sand");
    }
  return s;
})();

// --- concrete T-wall ----------------------------------------------------
ICONS["bremer-wall"] =
  box(-1.7, -1.1, 0, 3.4, 2.2, 0.45, "crete") +
  box(-1.15, -0.42, 0.45, 2.3, 0.85, 4.4, "crete") +
  [0, 1, 2].map(i =>
    `<ellipse cx="${px(-0.6 + i * 0.6, 0, 5.1)[0].toFixed(1)}" cy="${px(-0.6 + i * 0.6, 0, 5.1)[1].toFixed(1)}" ` +
    `rx="4.6" ry="2.6" fill="none" stroke="${M.steel[1]}" stroke-width="1.5"/>`).join("");

// --- entryways ----------------------------------------------------------
ICONS["door"] =
  box(-2.2, -0.5, 0, 1.5, 1.0, 3.4, "hesco", { mesh: 1 }) +
  box(1.0, -0.5, 0, 1.5, 1.0, 3.4, "hesco", { mesh: 1 }) +
  box(-0.75, -0.42, 0, 1.75, 0.85, 3.1, "steel") +
  box(-0.6, -0.5, 0.25, 1.45, 0.12, 2.6, "dark") +
  `<circle cx="${px(0.75, -0.5, 1.5)[0].toFixed(1)}" cy="${px(0.75, -0.5, 1.5)[1].toFixed(1)}" r="1.5" fill="${M.sand[0]}"/>`;

ICONS["gate"] =
  box(-3.6, -0.55, 0, 1.2, 1.1, 3.6, "crete") +
  box(2.4, -0.55, 0, 1.2, 1.1, 3.6, "crete") +
  box(-2.4, -0.4, 0, 2.4, 0.75, 3.2, "steel") +
  box(0.0, -0.4, 0, 2.4, 0.75, 3.2, "steel", { top: M.steel[0], left: "#7e8894" }) +
  strut([0, -0.4, 0], [0, -0.4, 3.2], INK, 1.6) +
  [-2.0, -1.0, 0.4, 1.4].map(x =>
    strut([x, -0.4, 0.3], [x + 0.7, -0.4, 2.9], "#9aa3ae", 1.1)).join("");

// --- area denial --------------------------------------------------------
ICONS["barbed-wire"] = (() => {
  let s = "";
  for (const x of [-2.6, 2.6]) s += box(x - 0.18, -0.18, 0, 0.36, 0.36, 2.2, "steel");
  for (let i = 0; i < 5; i++) {
    const p = px(-2.8 + i * 1.4, 0, 1.9);
    s += `<ellipse cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" rx="5" ry="3.4" ` +
         `fill="none" stroke="${M.steel[1]}" stroke-width="1.7" transform="rotate(-20 ${p[0].toFixed(1)} ${p[1].toFixed(1)})"/>`;
  }
  for (let i = 0; i < 5; i++) {
    const p = px(-2.8 + i * 1.4, 0, 2.6);
    s += `<path d="M${(p[0] - 2).toFixed(1)} ${(p[1] - 2).toFixed(1)}l4 4M${(p[0] + 2).toFixed(1)} ${(p[1] - 2).toFixed(1)}l-4 4" stroke="${M.steel[2]}" stroke-width="1.1"/>`;
  }
  return s;
})();

ICONS["hedgehog"] = (() => {
  const L = 2.5, beams = [
    [[-L, -L, 0], [L, L, 2.6]], [[L, -L, 0], [-L, L, 2.6]], [[0, 0, 0], [0, 0, 3.4]],
    [[-L, L, 0], [L, -L, 2.6]],
  ];
  let s = "";
  for (const [a, b] of beams) s += strut(a, b, M.steel[2], 5.2);
  for (const [a, b] of beams) s += strut(a, b, M.steel[0], 2.4);
  const c = px(0, 0, 1.3);
  s += `<circle cx="${c[0].toFixed(1)}" cy="${c[1].toFixed(1)}" r="3.4" fill="${M.steel[1]}"/>`;
  return s;
})();

// --- shelters and positions --------------------------------------------
ICONS["bunker"] =
  box(-2.8, -2.8, 0, 5.6, 5.6, 2.4, "crete") +
  box(-2.3, -2.3, 2.4, 4.6, 4.6, 0.7, "crete", { top: "#dcdcd2" }) +
  poly([px(-2.8, 1.4, 0.9), px(-2.8, -1.4, 0.9), px(-2.8, -1.4, 1.7), px(-2.8, 1.4, 1.7)], M.dark[2]) +
  poly([px(-1.4, 2.8, 0.9), px(1.4, 2.8, 0.9), px(1.4, 2.8, 1.7), px(-1.4, 2.8, 1.7)], M.dark[1]);

// four corner blocks with a doorway gap on each face, under a slab roof
ICONS["ifs"] =
  [[-2.7, -2.7], [1.0, -2.7], [-2.7, 1.0], [1.0, 1.0]]
    .map(([x, y]) => box(x, y, 0, 1.7, 1.7, 2.5, "hesco", { mesh: 1 })).join("") +
  box(-2.9, -2.9, 2.5, 5.6, 5.6, 0.55, "hesco", { top: "#eae4c8" });

ICONS["recon-tower"] =
  [[-2.1, -2.1], [1.5, -2.1], [-2.1, 1.5], [1.5, 1.5]]
    .map(([x, y]) => box(x, y, 0, 0.6, 0.6, 3.4, "steel")).join("") +
  box(-2.6, -2.6, 3.4, 5.2, 5.2, 0.35, "steel", { top: "#c2cad3" }) +
  box(-2.1, -2.1, 3.75, 4.2, 4.2, 1.9, "hesco", { mesh: 1 }) +
  box(-2.4, -2.4, 5.65, 4.8, 4.8, 0.4, "crete", { top: "#dcdcd2" }) +
  [0, 1, 2, 3, 4].map(i => strut([2.3, 1.6, 0.4 + i * 0.7], [2.3, 2.4, 0.4 + i * 0.7], M.rust[1], 1.5)).join("") +
  strut([2.3, 1.6, 0], [2.3, 1.6, 3.6], M.rust[2], 1.5) +
  strut([2.3, 2.4, 0], [2.3, 2.4, 3.6], M.rust[2], 1.5);

// low netted hide: a stepped frame under a draped camo net, built from the same
// box primitive as everything else so it sits correctly in the projection
ICONS["recon-tent"] = (() => {
  let s = box(-2.6, -2.0, 0, 5.2, 4.0, 0.9, "olive");
  s += box(-2.1, -1.6, 0.9, 4.2, 3.2, 0.8, "olive", { top: "#9aa06b" });
  s += box(-1.3, -0.9, 1.7, 2.6, 1.8, 0.6, "olive", { top: "#a7ad75" });
  s += poly([px(0.4, 2.0, 0), px(2.2, 2.0, 0), px(2.2, 2.0, 0.9), px(0.4, 2.0, 0.9)], M.dark[2]);
  for (const [x, y, z] of [[-1.7, 0.4, 1.0], [0.3, -0.5, 1.8], [1.6, 0.8, 1.0], [-0.7, -1.3, 1.8], [1.1, -0.2, 1.8]]) {
    const q = px(x, y, z);
    s += `<ellipse cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" rx="2.5" ry="1.4" fill="${M.dark[1]}" opacity=".42"/>`;
  }
  return s;
})();

// --- emplacements -------------------------------------------------------
ICONS["l81-mortar"] = (() => {
  let s = "";
  for (let i = 0; i < 12; i++) {                        // sandbag ring
    const a = (i / 12) * Math.PI * 2;
    s += box(Math.cos(a) * 2.5 - 0.5, Math.sin(a) * 2.5 - 0.5, 0, 1.0, 1.0, 0.72, "sand");
  }
  s += pad(-1.6, -1.6, 3.2, 3.2, "dark", 0.1);
  s += strut([0.9, 0.9, 0.1], [-0.7, -0.7, 3.4], M.steel[2], 5.4);   // tube
  s += strut([0.9, 0.9, 0.1], [-0.7, -0.7, 3.4], M.steel[0], 2.6);
  s += strut([0.2, 0.2, 1.5], [1.2, -0.9, 0.1], M.steel[1], 1.8);    // bipod
  s += strut([0.2, 0.2, 1.5], [-0.9, 1.2, 0.1], M.steel[1], 1.8);
  s += box(0.4, 0.4, 0.1, 1.4, 1.4, 0.22, "steel");
  return s;
})();

ICONS["vanguard-ciws"] = (() => {
  const dome = px(-0.5, -0.5, 2.5);
  return pad(-2.6, -2.6, 5.2, 5.2, "crete", 0.5) +
    box(-1.3, -1.3, 0.5, 2.6, 2.6, 1.2, "steel") +
    `<ellipse cx="${dome[0].toFixed(1)}" cy="${(dome[1] - 1).toFixed(1)}" rx="8" ry="8.6" fill="${M.hesco[0]}"/>` +
    `<ellipse cx="${(dome[0] - 2.4).toFixed(1)}" cy="${(dome[1] - 2.6).toFixed(1)}" rx="3.4" ry="3.8" fill="#f2eeda" opacity=".55"/>` +
    strut([0.3, 0.3, 2.5], [3.2, 3.2, 1.5], M.steel[2], 4.4) +
    strut([0.3, 0.3, 2.5], [3.2, 3.2, 1.5], M.steel[0], 2.0);
})();

// two finned missiles on a turntable, canted up along +x
ICONS["talon-9k-sam"] = (() => {
  const missile = (dy, mat) => {
    const tail = [-1.5, dy, 1.1], nose = [2.1, dy, 3.9];
    return strut(tail, nose, M[mat][2], 6.2) +
      strut(tail, nose, M[mat][0], 3.4) +
      // nose cone
      strut([1.9, dy, 3.75], [2.7, dy, 4.4], M.steel[0], 2.4) +
      // tail fins, one up one down
      strut(tail, [-2.2, dy, 1.9], M.steel[1], 2.2) +
      strut(tail, [-2.0, dy, 0.4], M.steel[1], 2.2);
  };
  return pad(-2.9, -2.9, 5.8, 5.8, "crete", 0.45) +
    box(-1.2, -1.2, 0.45, 2.4, 2.4, 0.95, "steel") +
    strut([-1.0, 0, 1.4], [1.2, 0, 3.1], M.steel[2], 2.0) +
    missile(-0.85, "olive") + missile(0.85, "hesco");
})();

ICONS["stingray"] = (() => {
  const c = px(0, 0, 3.6);
  let s = pad(-2.6, -2.6, 5.2, 5.2, "crete", 0.45) +
          box(-1.5, -1.5, 0.45, 3.0, 3.0, 0.9, "steel");
  s += box(-0.9, -0.55, 3.2, 1.8, 1.1, 0.55, "dark");        // drone body
  for (const [ax, ay] of [[-1.9, -1.9], [1.9, -1.9], [-1.9, 1.9], [1.9, 1.9]]) {
    s += strut([0, 0, 3.5], [ax, ay, 3.5], M.steel[2], 1.9);
    const p = px(ax, ay, 3.6);
    s += `<ellipse cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" rx="5" ry="2.7" fill="${M.steel[0]}" opacity=".5"/>`;
    s += `<ellipse cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" rx="5" ry="2.7" fill="none" stroke="${M.steel[2]}" stroke-width="1.1"/>`;
  }
  return s;
})();

// a derrick: four legs tapering to a crown platform, with X bracing on each bay
ICONS["drill-rig"] = (() => {
  const legs = [[-1.8, -1.8], [1.8, -1.8], [-1.8, 1.8], [1.8, 1.8]];
  const TOP = 5.9, taper = h => 1 - (h / TOP) * 0.62;
  let s = pad(-2.9, -2.9, 5.8, 5.8, "crete", 0.4);
  s += box(-1.3, -1.3, 0.4, 2.6, 2.6, 0.8, "dark");            // wellhead
  const bays = [0.5, 2.3, 4.1, TOP];
  for (let i = 0; i < bays.length - 1; i++) {                  // X bracing, front two faces
    const z0 = bays[i], z1 = bays[i + 1], k0 = taper(z0), k1 = taper(z1);
    for (const sgn of [-1, 1]) {
      s += strut([-1.8 * k0, sgn * 1.8 * k0, z0], [1.8 * k1, sgn * 1.8 * k1, z1], M.steel[1], 1.2);
      s += strut([1.8 * k0, sgn * 1.8 * k0, z0], [-1.8 * k1, sgn * 1.8 * k1, z1], M.steel[1], 1.2);
      s += strut([sgn * 1.8 * k0, -1.8 * k0, z0], [sgn * 1.8 * k1, 1.8 * k1, z1], M.steel[1], 1.0);
    }
    for (const [x, y] of legs) s += strut([x * k0, y * k0, z0], [x * k1, y * k1, z1], M.steel[2], 2.4);
  }
  const kt = taper(TOP);
  s += box(-1.8 * kt, -1.8 * kt, TOP, 3.6 * kt, 3.6 * kt, 0.45, "rust");
  s += strut([0, 0, 0.9], [0, 0, TOP], M.steel[0], 1.6);       // drill string
  return s;
})();

// --- logistics and utility ---------------------------------------------
ICONS["refuel-station"] =
  pad(-2.8, -1.8, 5.6, 3.6, "crete", 0.4) +
  box(-2.1, -1.0, 0.4, 2.2, 1.9, 3.4, "rust") +
  poly([px(-2.1, -1.0, 2.4), px(0.1, -1.0, 2.4), px(0.1, -1.0, 3.4), px(-2.1, -1.0, 3.4)], M.dark[2]) +
  strut([0.1, -0.2, 3.2], [1.9, -0.2, 3.2], M.steel[1], 2.0) +
  strut([1.9, -0.2, 3.2], [1.9, -0.2, 1.1], M.steel[1], 2.0) +
  box(1.55, -0.55, 0.6, 0.7, 0.7, 0.6, "steel");

ICONS["repair-station"] = (() => {
  const c = px(-0.6, -0.6, 2.4);
  let s = pad(-2.8, -2.4, 5.6, 4.8, "crete", 0.4) +
          box(-2.2, -1.4, 0.4, 2.0, 2.6, 1.5, "steel");
  for (let i = 0; i < 8; i++) {                       // gear
    const a = (i * Math.PI) / 4;
    s += `<rect x="${(c[0] + Math.cos(a) * 8.4 - 2.2).toFixed(1)}" y="${(c[1] + Math.sin(a) * 8.4 - 2.2).toFixed(1)}" ` +
         `width="4.4" height="4.4" rx="1" fill="${M.steel[1]}" transform="rotate(${i * 45} ${(c[0] + Math.cos(a) * 8.4).toFixed(1)} ${(c[1] + Math.sin(a) * 8.4).toFixed(1)})"/>`;
  }
  s += `<circle cx="${c[0].toFixed(1)}" cy="${c[1].toFixed(1)}" r="8.4" fill="${M.steel[0]}"/>`;
  s += `<circle cx="${c[0].toFixed(1)}" cy="${c[1].toFixed(1)}" r="3.2" fill="${M.dark[1]}"/>`;
  return s;
})();

ICONS["builders-radio"] = (() => {
  const spk = px(-0.9, -1.0, 1.35);
  return pad(-2.6, -1.6, 5.2, 3.2, "crete", 0.35) +
    box(-2.2, -1.0, 0.35, 4.0, 1.9, 2.0, "olive") +
    `<ellipse cx="${spk[0].toFixed(1)}" cy="${spk[1].toFixed(1)}" rx="4.4" ry="4.9" fill="${M.dark[1]}"/>` +
    `<ellipse cx="${spk[0].toFixed(1)}" cy="${spk[1].toFixed(1)}" rx="1.7" ry="1.9" fill="${M.steel[1]}"/>` +
    [0.5, 1.1, 1.7].map(z =>
      strut([0.6, -1.0, z], [1.6, -1.0, z], M.sand[1], 1.3)).join("") +
    strut([1.4, 0, 2.35], [2.4, 0, 4.6], M.steel[1], 1.7);
})();

// mast with a flared horn: throat at the mast, elliptical mouth facing +x,
// and the sound arcs on the same side so it cannot read backwards
ICONS["loudspeaker"] = (() => {
  const throat = px(0.4, 0, 3.6), mouth = px(3.1, 0, 3.6);
  const rx = 3.0, ry = 7.6;
  let s = pad(-1.6, -1.6, 3.2, 3.2, "crete", 0.35) +
          box(-0.45, -0.45, 0.35, 0.9, 0.9, 3.5, "steel");
  // cone body from a small throat out to the mouth ellipse
  s += `<path d="M${throat[0].toFixed(1)} ${(throat[1] - 1.6).toFixed(1)}` +
       `L${mouth[0].toFixed(1)} ${(mouth[1] - ry).toFixed(1)}` +
       `L${mouth[0].toFixed(1)} ${(mouth[1] + ry).toFixed(1)}` +
       `L${throat[0].toFixed(1)} ${(throat[1] + 1.6).toFixed(1)}Z" fill="${M.hesco[1]}"/>`;
  s += `<ellipse cx="${mouth[0].toFixed(1)}" cy="${mouth[1].toFixed(1)}" rx="${rx}" ry="${ry}" fill="${M.hesco[0]}"/>`;
  s += `<ellipse cx="${(mouth[0] + 0.6).toFixed(1)}" cy="${mouth[1].toFixed(1)}" rx="${rx * 0.5}" ry="${ry * 0.55}" fill="${M.dark[1]}" opacity=".55"/>`;
  for (const k of [1, 1.55]) {
    const x = mouth[0] + 3.2 + k * 3.2;
    s += `<path d="M${x.toFixed(1)} ${(mouth[1] - 5 * k).toFixed(1)}q${(3.4 * k).toFixed(1)} ${(5 * k).toFixed(1)} 0 ${(10 * k).toFixed(1)}" ` +
         `fill="none" stroke="${M.steel[1]}" stroke-width="1.8" stroke-linecap="round"/>`;
  }
  return s;
})();

// --- the FOB ------------------------------------------------------------
ICONS["fob"] =
  pad(-3.2, -3.2, 6.4, 6.4, "crete", 0.35) +
  box(-2.6, -2.6, 0.35, 5.2, 5.2, 2.3, "olive") +
  box(-1.5, -1.5, 2.65, 3.0, 3.0, 1.3, "olive", { top: "#a2a771" }) +
  poly([px(-0.8, 2.6, 0.35), px(0.8, 2.6, 0.35), px(0.8, 2.6, 1.9), px(-0.8, 2.6, 1.9)], M.dark[1]) +
  poly([px(-2.6, -0.9, 1.2), px(-2.6, 0.9, 1.2), px(-2.6, 0.9, 2.0), px(-2.6, -0.9, 2.0)], M.dark[2]) +
  strut([1.2, 1.2, 3.95], [1.2, 1.2, 6.3], M.steel[1], 1.8) +
  strut([0.5, 0.5, 5.9], [1.9, 1.9, 5.9], M.steel[1], 1.5);

/* ---------------- write ---------------- */
const outDir = path.join(__dirname, "..", "assets", "icons");
fs.mkdirSync(outDir, { recursive: true });
for (const f of fs.readdirSync(outDir)) fs.unlinkSync(path.join(outDir, f));
let n = 0;
for (const [name, body] of Object.entries(ICONS)) {
  fs.writeFileSync(path.join(outDir, name + ".svg"), wrap(body));
  n++;
}
console.log(`wrote ${n} isometric icons to assets/icons/`);
