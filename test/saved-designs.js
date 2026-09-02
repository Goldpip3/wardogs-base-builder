const ROOT = require("path").resolve(__dirname, "..");
// Exercise the real save / rename / delete code from the built app against a fake
// localStorage, reproducing the bug the user hit and proving it's fixed.
const fs = require("fs");
const vm = require("vm");

const html = fs.readFileSync(
  ROOT + "/WardogsBaseBuilder.html", "utf8");
const src = html.match(/<script>\s*"use strict";([\s\S]*)<\/script>/)[1];

let pass = 0, fail = 0;
const check = (ok, label) => { console.log((ok ? "PASS  " : "FAIL  ") + label); ok ? pass++ : fail++; };

// --- minimal DOM / storage stubs ---
const store = {};
const nameBox = { value: "" };
const els = {
  designName: nameBox,
  sbSaved: { textContent: "", style: {} },
  modalBody: { innerHTML: "", querySelectorAll: () => [] },
  blNow: { textContent: "", style: {} },
  hint: { textContent: "" },
};
const stubEl = () => ({ textContent: "", value: "", style: {}, innerHTML: "",
  classList: { toggle(){}, add(){}, remove(){} }, querySelectorAll: () => [], focus(){}, click(){} });

const sandbox = {
  console,
  localStorage: {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; },
  },
  document: {
    getElementById: id => els[id] || (els[id] = stubEl()),
    querySelectorAll: () => [],
    documentElement: { style: { setProperty(){} } },
  },
  // deliberately NOT providing confirm/alert — the app must not depend on them,
  // because the published page runs in a sandbox where they're blocked
  alert: () => {},
  setTimeout: () => 0,
  clearTimeout: () => {},
  JSON, Math, Object, Array, String, Number, Boolean, Date,
};
vm.createContext(sandbox);

// lift the design-management functions plus their dependencies
const lift = name => {
  const m = src.match(new RegExp("function " + name + "\\([\\s\\S]*?\\n\\}"));
  if (!m) throw new Error("could not lift " + name);
  return m[0];
};
vm.runInContext(`
  var LS_DESIGNS = "wardogs.designs", LS_CURRENT = "wardogs.current";
  // the real catalog, so the build zone here is the one the app ships with
  var catalog = ${fs.readFileSync(ROOT + "/data/buildables.json", "utf8")};
  var ${src.match(/const (LEGACY_FOB_ZONE = \d+);/)[1]};
  var ${src.match(/const (FORMER_FOB_ZONES = \[[\d, ]+\]);/)[1]};
  var design = { name: "", pieces: [], nextId: 1 };
  var currentSavedName = null;
  var byId = {};
  var undoStack = [], redoStack = [], selection = new Set();
  var savedFlashTimer = null;
  function showSaved(){} function afterChange(){} function zoomFit(){}
  function setViewLevel(){} function renderDesigns(){} function renderLevelStrip(){}
  // stand in for the in-app confirm dialog: always take the confirming action,
  // which is the last button openModal is handed
  function openModal(title, body, buttons) {
    const last = buttons && buttons[buttons.length - 1];
    if (last && typeof last[1] === "function") last[1]();
  }
  function closeModal(){}
  ${lift("esc")}
  ${lift("askConfirm")}
  ${lift("readDesigns")}
  ${lift("writeDesigns")}
  ${lift("uniqueName")}
  ${lift("fobZone")}
  ${lift("adopted")}
  ${lift("saveCurrent")}
  ${lift("loadCurrent")}
  ${lift("openDesign")}
  ${lift("newDesign")}
  ${lift("deleteDesign")}
  ${lift("duplicateDesign")}
`, sandbox);

const run = code => vm.runInContext(code, sandbox);
const designs = () => JSON.parse(store["wardogs.designs"] || "{}");
const names = () => Object.keys(designs()).sort();

/* ---------- the build zone a design was drawn under ----------
 * The FOB's zone went from 100 cells square to 200, both estimates, and then to the measured
 * 79: 39 single Hesco blocks from the FOB's middle cell to the edge, every direction.
 * A design records the figure it was drawn under, so every base made under an estimate went
 * on drawing the wrong zone. The wire format writes the same 100 for a design carrying no
 * zone at all, so shared links landed the same way. Opening one takes the catalog's figure.
 */
{
  const fob = JSON.parse(fs.readFileSync(ROOT + "/data/buildables.json", "utf8")).fob;
  const zoneNow = fob.buildRadiusUnits;
  check(zoneNow === 39 + 1 + 39 && fob.radiusConfirmed === true,
    "the catalog's FOB build zone is 79 cells square, measured: 39 blocks out from the middle cell");
  check(typeof fob.radiusReading === "string" && /39 Hesco blocks/.test(fob.radiusReading),
    "and the raw reading is kept beside the converted figure");

  const openZones = pieces => {
    run(`openDesign({ name:"z", pieces:${JSON.stringify(pieces)}, nextId:9 }, "z")`);
    return vm.runInContext("design.pieces.map(p => p.zone)", sandbox);
  };
  check(openZones([{ id: 1, type: "__fob__", x: 0, y: 0, zone: 100 }])[0] === zoneNow,
    "a design drawn under the old 100 opens with the current zone");
  check(openZones([{ id: 1, type: "__fob__", x: 0, y: 0, zone: 200 }])[0] === zoneNow,
    "and so does one drawn under the 200 estimate, which was a default and not a choice");
  check(openZones([{ id: 1, type: "__fob__", x: 0, y: 0 }])[0] === zoneNow,
    "and so does one that records no zone at all, which is what a shared link decodes to");
  check(openZones([{ id: 1, type: "__fob__", x: 0, y: 0, zone: 140 }])[0] === 140,
    "a zone somebody typed in the panel is left alone");
  check(openZones([{ id: 1, type: "hesco-small", x: 0, y: 0 }])[0] === undefined,
    "and nothing but the FOB is given a zone");
}

// ---------- 1. basic save ----------
nameBox.value = "Alpha Base";
run(`design = { name:"Alpha Base", pieces:[{id:1,type:"hesco-small",x:0,y:0}], nextId:2 }; saveCurrent();`);
check(names().join(",") === "Alpha Base", "saving files the design under its name");
check(!!store["wardogs.current"], "current-design slot is written");

// ---------- 2. RENAME must not duplicate (bug #2) ----------
nameBox.value = "Alpha Base v2";
run(`saveCurrent();`);
check(names().join(",") === "Alpha Base v2", "renaming renames — the old name is gone, no duplicate");

// ---------- 3. New design keeps the old one ----------
run(`newDesign(true);`);
check(names().length === 2 && names().includes("Alpha Base v2"),
  "starting a new design keeps the previous one");
const freshName = run(`design.name`);
check(freshName === "New FOB", "new design gets a clean default name");

// ---------- 4. New design twice doesn't collide ----------
run(`newDesign(true);`);
check(names().filter(n => n.startsWith("New FOB")).length === 2,
  "a second new design gets its own name instead of overwriting");

// ---------- 4b. THE REPORTED BUG: "New" while a design has pieces on it ----------
// This used to call window.confirm(), which the published sandbox blocks (returns false),
// so New silently did nothing. It must now work without confirm() existing at all.
nameBox.value = "Has Pieces";
run(`design = { name:"Has Pieces", pieces:[{id:1,type:"hesco-small",x:0,y:0}], nextId:2 };
     currentSavedName = null; saveCurrent();`);
const beforeNew = names().length;
run(`newDesign(false);`);            // the un-forced path the toolbar button uses
check(run(`design.pieces.length`) === 0, "New clears the canvas even with pieces on it");
check(names().length === beforeNew + 1, "…and keeps the design that was open");
check(names().includes("Has Pieces"), "…filed under its own name");

// ---------- 5. THE REPORTED BUG: deleting the design you have open ----------
run(`openDesign(readDesigns()["Alpha Base v2"], "Alpha Base v2");`);
check(run(`currentSavedName`) === "Alpha Base v2", "opening a design tracks its name");
run(`deleteDesign("Alpha Base v2");`);
check(!names().includes("Alpha Base v2"), "deleting the OPEN design removes it");
// the real bug was that the next autosave brought it straight back:
nameBox.value = run(`design.name`);
run(`saveCurrent();`);
check(!names().includes("Alpha Base v2"),
  "…and it STAYS deleted after the next autosave (the reported bug)");

// ---------- 6. deleting a design you don't have open ----------
nameBox.value = "Bravo";
run(`design = { name:"Bravo", pieces:[], nextId:1 }; currentSavedName = null; saveCurrent();`);
const beforeCount = names().length;
run(`deleteDesign("${names().find(n => n.startsWith("New FOB"))}");`);
check(names().length === beforeCount - 1, "deleting a background design removes exactly one");
check(names().includes("Bravo"), "…and leaves the open one alone");

// ---------- 7. Copy branches without touching the original ----------
run(`duplicateDesign("Bravo", readDesigns()["Bravo"]);`);
check(names().includes("Bravo") && names().includes("Bravo copy"),
  "Copy creates a variant and keeps the original");
run(`duplicateDesign("Bravo", readDesigns()["Bravo"]);`);
check(names().includes("Bravo copy (2)"), "a second Copy doesn't clobber the first");

// ---------- 8. reload picks the design back up ----------
run(`design = null; currentSavedName = null; loadCurrent();`);
check(run(`currentSavedName`) === run(`design.name`),
  "reloading restores the design and its saved-name link");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
