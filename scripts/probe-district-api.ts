/* Does a commercial geocoder actually know our local districts?

   Google Civic's representativeInfoByAddress shut down 2026-04-30, so the
   address -> county-commission / school-board question now has no free answer.
   Before paying a vendor for it, this asks them, with the one question that
   separates a real answer from a plausible-looking one.

   THE TEST IS NOT "does it return districts". Every vendor returns something.
   The test is whether what comes back is the CORRECT SUB-COUNTY ELECTORAL
   district, on the map the November 2026 ballot is actually run on. Two traps:

     1. "School district" almost always means the ADMINISTRATIVE district. In
        Florida that is the county -- every Orange voter gets "Orange County
        School District". Our ballot needs School Board *District 3*, an
        electoral subdivision inside it. The Census geocoder has exactly this
        shape of answer, and it is useless to us.
     2. Orange County expanded from six commission districts to EIGHT for 2026,
        and Orange's OWN published open-data layer is still the six-district
        map (see docs/general-election/boundaries/README.md). A vendor that
        refreshed from county open data will be confidently wrong about
        Districts 7 and 8 -- which is why those two are probed first.

   Ground truth comes from the committed boundary layers, so this compares a
   vendor against the same data 0031's races are keyed to, not against a guess.

     node scripts/probe-district-api.ts --dry-run
       Print the exact requests that WOULD be sent, with the probe points and
       what we expect each to answer. No network, no key, no spend.

     node scripts/probe-district-api.ts [--vendor geocodio] [--json out.json]
       Ask, and report what came back against ground truth.

   Fail-closed: a missing key or an unreadable boundary file exits non-zero. A
   silent empty result looks exactly like "the vendor has no local districts",
   and those are opposite facts -- one is a broken probe, the other is the
   answer we are paying to learn. */

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvLocal } from "./env-local.ts";

loadEnvLocal(import.meta.url);

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const flag = (n: string) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const vendor = flag("vendor") ?? "geocodio";
const jsonOut = flag("json");

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const boundaries = path.join(root, "docs", "general-election", "boundaries");

/* The probe set. Districts 7 and 8 lead because they exist only on the 2026
   map: a vendor on the stale layer cannot place them at all. The rest spread
   across counties and both bodies so one county's good data cannot carry the
   verdict. */
const PROBES = [
  { layer: "ora-cc-2026", field: "DIST",     district: 7, expect: "ORA-CC-7", note: "2026-only district — absent from Orange's published layer" },
  { layer: "ora-cc-2026", field: "DIST",     district: 8, expect: "ORA-CC-8", note: "2026-only district — absent from Orange's published layer" },
  { layer: "ora-sb",      field: "DISTRICT", district: 3, expect: "ORA-SB-3", note: "school board ELECTORAL district, not the county-wide administrative one" },
  { layer: "mdc-cc",      field: "ID",       district: 5, expect: "DAD-CC-5", note: "Miami-Dade keys districts on ID, not OBJECTID" },
  { layer: "mdc-sb",      field: "ID",       district: 1, expect: "DAD-SB-1", note: "school board ELECTORAL district" },
  { layer: "bro-sb",      field: "DISTRICT", district: 6, expect: "BRO-SB-6", note: "school board ELECTORAL district" },
  { layer: "hil-cc",      field: "District", district: 1, expect: "HIL-CC-1", note: "single-member district (5-7 are countywide)" },
  { layer: "hil-sb",      field: "District", district: 2, expect: "HIL-SB-2", note: "school board ELECTORAL district" },
];

type Ring = number[][];
const ringsOf = (geom: { type: string; coordinates: unknown }): Ring[] =>
  geom.type === "Polygon"
    ? [(geom.coordinates as Ring[])[0]]
    : (geom.coordinates as Ring[][][]).map((poly) => poly[0]);

/* Ray casting on the outer ring. Holes are ignored deliberately: this only
   needs *a* point that is certainly inside, and the scan below rejects any
   candidate that is not. */
function inRing(x: number, y: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/* A representative interior point. The centroid of an L-shaped or coastal
   district can fall outside it, so the centroid is only a first guess and a
   grid scan is the fallback. Returning null is better than returning a point
   in the wrong district. */
function interiorPoint(rings: Ring[]): { lat: number; lon: number } | null {
  const ring = rings.reduce((a, b) => (b.length > a.length ? b : a));
  let sx = 0, sy = 0;
  for (const [x, y] of ring) { sx += x; sy += y; }
  const cx = sx / ring.length, cy = sy / ring.length;
  if (rings.some((r) => inRing(cx, cy, r))) return { lat: cy, lon: cx };

  const xs = ring.map((p) => p[0]), ys = ring.map((p) => p[1]);
  const [x0, x1] = [Math.min(...xs), Math.max(...xs)];
  const [y0, y1] = [Math.min(...ys), Math.max(...ys)];
  const N = 40;
  for (let i = 1; i < N; i++) {
    for (let j = 1; j < N; j++) {
      const x = x0 + ((x1 - x0) * i) / N;
      const y = y0 + ((y1 - y0) * j) / N;
      if (rings.some((r) => inRing(x, y, r))) return { lat: y, lon: x };
    }
  }
  return null;
}

const points = PROBES.map((p) => {
  let gj;
  try {
    gj = JSON.parse(readFileSync(path.join(boundaries, `${p.layer}.geojson`), "utf8"));
  } catch (err) {
    console.error(`Cannot read boundary layer ${p.layer}: ${(err as Error).message}`);
    process.exit(1);
  }
  const feat = gj.features.find(
    (f: { properties: Record<string, unknown> }) =>
      Number(String(f.properties[p.field]).replace(/\D/g, "")) === p.district
  );
  if (!feat) {
    console.error(`${p.layer} has no district ${p.district} on field ${p.field} — the layer changed; re-read boundaries/README.md`);
    process.exit(1);
  }
  const pt = interiorPoint(ringsOf(feat.geometry));
  if (!pt) {
    console.error(`Could not find an interior point for ${p.expect}`);
    process.exit(1);
  }
  return { ...p, ...pt };
});

/* Ask for everything plausibly district-shaped. `school` is requested
   precisely so the report can show it answering with the administrative
   district, which is trap 1. */
const FIELDS = "cd,stateleg,school,census";
const urlFor = (lat: number, lon: number, key: string) =>
  `https://api.geocod.io/v1.9/reverse?q=${lat.toFixed(6)},${lon.toFixed(6)}` +
  `&fields=${FIELDS}&api_key=${key}`;

if (vendor !== "geocodio") {
  console.error(`Unknown vendor '${vendor}'. Only 'geocodio' is wired up; add another the same way.`);
  process.exit(2);
}

if (dryRun) {
  console.log(`DRY RUN — ${points.length} probes, vendor=${vendor}, fields=${FIELDS}\n`);
  for (const p of points) {
    console.log(`  ${p.expect}`);
    console.log(`    point    ${p.lat.toFixed(6)}, ${p.lon.toFixed(6)}  (interior of ${p.layer} district ${p.district})`);
    console.log(`    expect   the vendor to name ${p.expect}`);
    console.log(`    why      ${p.note}`);
    console.log(`    GET      ${urlFor(p.lat, p.lon, "$GEOCODIO_API_KEY")}`);
    console.log();
  }
  console.log("No request was sent and nothing was billed. Re-run without --dry-run to ask.");
  process.exit(0);
}

const key = process.env.GEOCODIO_API_KEY;
if (!key) {
  console.error(
    "GEOCODIO_API_KEY is not set. Add it to .env.local, or run with --dry-run\n" +
    "to see the exact requests this would send without a key."
  );
  process.exit(1);
}

/* What a hit would have to look like: a field naming a sub-county electoral
   district. Anything that merely names the county or the school system is the
   administrative answer and does not count. */
function looksSubCounty(value: unknown, countyWords: string[]): boolean {
  const s = JSON.stringify(value ?? "").toLowerCase();
  if (!s) return false;
  const namesCounty = countyWords.some((w) => s.includes(w));
  const hasSeatNumber = /district\s*0*\d{1,2}\b/.test(s);
  return hasSeatNumber && !(namesCounty && !hasSeatNumber);
}

const results: unknown[] = [];
let anySubCounty = 0;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

for (const p of points) {
  let payload: Record<string, unknown> | null = null;
  let error: string | null = null;
  try {
    const res = await fetch(urlFor(p.lat, p.lon, key), { signal: AbortSignal.timeout(20_000) });
    if (!res.ok) error = `HTTP ${res.status}`;
    else payload = await res.json();
  } catch (err) {
    error = `${(err as Error).name}: ${(err as Error).message}`;
  }

  const fields = (payload as any)?.results?.[0]?.fields ?? {};
  const school = fields.school_districts ?? null;
  const cong = fields.congressional_districts?.[0]?.name ?? null;

  const sub = looksSubCounty(school, ["county school", "orange county", "miami-dade county", "broward county", "hillsborough county"]);
  if (sub) anySubCounty++;

  console.log(`${p.expect}  (${p.lat.toFixed(4)}, ${p.lon.toFixed(4)})`);
  if (error) console.log(`   ERROR              ${error}`);
  console.log(`   ground truth       ${p.expect} — ${p.note}`);
  console.log(`   congressional      ${cong ?? "—"}`);
  console.log(`   school districts   ${school ? JSON.stringify(school) : "—"}`);
  console.log(`   sub-county seat?   ${sub ? "YES" : "no — administrative or absent"}`);
  console.log();

  results.push({ expect: p.expect, lat: p.lat, lon: p.lon, error, congressional: cong, school, subCounty: sub });
  await sleep(250);
}

console.log("─".repeat(72));
if (anySubCounty === 0) {
  console.log(
    `VERDICT: ${vendor} returned no sub-county electoral district for any of ` +
    `${points.length} probes.\n` +
    "It cannot answer county commission or school board seats. Either the\n" +
    "crosswalk (parked, rebuildable from docs/general-election/boundaries/) or\n" +
    "a vendor that explicitly sells county-level districts is required."
  );
} else {
  console.log(
    `VERDICT: ${anySubCounty} of ${points.length} probes returned something ` +
    "sub-county.\nInspect those rows by hand before trusting them — check the " +
    "Orange 7 and 8\nresults first, since a vendor on the stale six-district " +
    "map cannot place them."
  );
}

if (jsonOut) {
  writeFileSync(jsonOut, JSON.stringify({ vendor, fields: FIELDS, results }, null, 2));
  console.log(`\nwrote ${jsonOut}`);
}
process.exit(0);
