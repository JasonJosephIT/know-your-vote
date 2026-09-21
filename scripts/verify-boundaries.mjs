/* Guardrail for docs/general-election/boundaries/ — the county commission and
   school board layers the 17 Tier A local races need.

   These are fetched files, so the failure mode is not a crash. It is a refresh
   that quietly swaps in a different layer and reassigns voters. Three such
   swaps are live hazards, and each has a check below:

     1. Orange's PUBLISHED commission layer is the 2020s six-district map.
        Orange expanded to eight for 2026 and two of our races are Districts 7
        and 8. Search and ArcGIS Hub both surface the six-district one first,
        so a well-meaning refresh lands on the wrong map and nothing about the
        file looks wrong.
     2. Miami-Dade's district number is ID, not OBJECTID -- OBJECTID 4 is
        District 5. Both run 1..13, so a range check passes while every
        assignment is wrong. The layers carry the incumbent's name, which is
        what actually pins it: ID 5 names Vicki L. Lopez, who is on our ballot
        for that seat.
     3. Hillsborough elects 4 commissioners by district and 3 countywide (and
        its school board 5 by district, 2 countywide), so those layers stop at
        District 4 and 5. That is correct, not truncation -- but it is
        indistinguishable from a partial download without saying so here.

   Offline, no network. Run: node scripts/verify-boundaries.mjs */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dir = path.join(root, "docs", "general-election", "boundaries");

let failures = 0;
const check = (label, cond, detail = "") => {
  if (cond) return;
  failures++;
  console.error(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`);
};

/* districtField is asserted, not guessed: picking the wrong one is hazard 2. */
const LAYERS = {
  "ora-cc-2026": { field: "DIST",     districts: [1,2,3,4,5,6,7,8],        bbox: [-81.8,-80.7, 28.2, 28.9] },
  "ora-sb":      { field: "DISTRICT", districts: [1,2,3,4,5,6,7],          bbox: [-81.8,-80.7, 28.2, 28.9] },
  "mdc-cc":      { field: "ID",       districts: [1,2,3,4,5,6,7,8,9,10,11,12,13], bbox: [-81.0,-80.0, 25.0, 26.1] },
  "mdc-sb":      { field: "ID",       districts: [1,2,3,4,5,6,7,8,9],      bbox: [-81.0,-80.0, 25.0, 26.1] },
  "bro-sb":      { field: "DISTRICT", districts: [1,2,3,4,5,6,7],          bbox: [-80.6,-79.9, 25.8, 26.5] },
  "hil-cc":      { field: "District", districts: [1,2,3,4],                bbox: [-83.1,-81.9, 27.4, 28.3] },
  "hil-sb":      { field: "District", districts: [1,2,3,4,5],              bbox: [-83.1,-81.9, 27.4, 28.3] },
};

/* Every Tier A race, and where it must resolve. null district = countywide. */
const RACES = [
  ["Orange Clerk of the Courts", null, "COUNTYWIDE"],
  ["Orange County Mayor", null, "COUNTYWIDE"],
  ["Orange Commission", 2, "ora-cc-2026"], ["Orange Commission", 4, "ora-cc-2026"],
  ["Orange Commission", 6, "ora-cc-2026"], ["Orange Commission", 7, "ora-cc-2026"],
  ["Orange Commission", 8, "ora-cc-2026"], ["Orange School Board", 3, "ora-sb"],
  ["Miami-Dade Commission", 5, "mdc-cc"],  ["Miami-Dade School Board", 1, "mdc-sb"],
  ["Broward School Board", 6, "bro-sb"],
  ["Hillsborough Commission", 1, "hil-cc"], ["Hillsborough Commission", 3, "hil-cc"],
  ["Hillsborough Commission", 5, "COUNTYWIDE"], ["Hillsborough Commission", 7, "COUNTYWIDE"],
  ["Hillsborough School Board", 2, "hil-sb"], ["Hillsborough School Board", 6, "COUNTYWIDE"],
];

const loaded = {};
for (const [name, spec] of Object.entries(LAYERS)) {
  let gj;
  try {
    gj = JSON.parse(readFileSync(path.join(dir, `${name}.geojson`), "utf8"));
  } catch (err) {
    failures++;
    console.error(`  FAIL ${name} unreadable — ${err.message}`);
    continue;
  }
  const feats = gj.features ?? [];
  check(`${name} has features`, feats.length > 0);
  if (!feats.length) continue;

  check(`${name} exposes its district field '${spec.field}'`,
    feats.every((f) => f.properties?.[spec.field] !== undefined && f.properties[spec.field] !== null));

  const got = feats
    .map((f) => Number(String(f.properties?.[spec.field]).replace(/\D/g, "")))
    .sort((a, b) => a - b);
  check(`${name} districts are exactly ${spec.districts.join(",")}`,
    JSON.stringify(got) === JSON.stringify(spec.districts), `got ${got.join(",")}`);

  /* Geometry must sit in the right county: several of these services carry no
     description, and "School_Board_Districts" is not a unique name nationally. */
  const [w, e, s, n] = spec.bbox;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  const walk = (c) => {
    if (typeof c[0] === "number") {
      minX = Math.min(minX, c[0]); maxX = Math.max(maxX, c[0]);
      minY = Math.min(minY, c[1]); maxY = Math.max(maxY, c[1]);
    } else for (const x of c) walk(x);
  };
  for (const f of feats) walk(f.geometry.coordinates);
  check(`${name} lies inside its county's bounds`,
    minX >= w && maxX <= e && minY >= s && maxY <= n,
    `lon ${minX.toFixed(2)}..${maxX.toFixed(2)} lat ${minY.toFixed(2)}..${maxY.toFixed(2)}`);

  loaded[name] = { feats, spec, districts: got };
}

/* Hazard 1, stated as the thing that actually goes wrong. */
check("Orange commission layer is the 2026 EIGHT-district map, not the published six",
  loaded["ora-cc-2026"]?.districts.length === 8,
  `${loaded["ora-cc-2026"]?.districts.length} districts — the published open-data layer has 6 and omits our Districts 7 and 8`);

/* Hazard 2: OBJECTID must NOT be mistaken for the district number. If a future
   refresh returns a layer where they coincide, this check stops silently
   passing for the wrong reason. */
for (const name of ["mdc-cc", "mdc-sb"]) {
  const l = loaded[name];
  if (!l) continue;
  const byObjectId = l.feats.map((f) => Number(f.properties.OBJECTID));
  const byField = l.feats.map((f) => Number(String(f.properties[l.spec.field]).replace(/\D/g, "")));
  check(`${name} ID and OBJECTID still differ (so ID is genuinely the district)`,
    JSON.stringify(byObjectId) !== JSON.stringify(byField),
    "they now match — re-confirm against the incumbent name before trusting either");
}
/* The name cross-check that originally settled it. */
const mdc5 = loaded["mdc-cc"]?.feats.find((f) => String(f.properties.ID) === "5");
check("Miami-Dade commission district 5 still names the incumbent on our ballot",
  /lopez/i.test(mdc5?.properties?.COMMNAME ?? ""),
  `names '${mdc5?.properties?.COMMNAME ?? "?"}' — our ballot has Vicki L. Lopez for that seat`);

/* Every race resolves, or is countywide on purpose (hazard 3). */
let countywide = 0;
for (const [label, district, target] of RACES) {
  if (target === "COUNTYWIDE") { countywide++; continue; }
  check(`${label} D${district} resolves in ${target}`,
    loaded[target]?.districts.includes(district) ?? false);
}
check("exactly five Tier A races are countywide", countywide === 5, String(countywide));

if (failures > 0) {
  console.error(`\nverify-boundaries: ${failures} failure(s)`);
  process.exit(1);
}
console.log(
  `verify-boundaries: OK — 7 layers, all 17 Tier A races resolve ` +
  `(12 by district boundary, 5 countywide), Orange is the 2026 eight-district map.`
);
