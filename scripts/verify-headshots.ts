/* Candidate headshots (founder, 2026-10-11; migration 0056): the
   all-or-none rule, and the wiring that keeps a face from appearing on one
   card in a race and not its neighbour.

   Run: node scripts/verify-headshots.ts */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { allOrNone, type PhotoRow } from "../src/lib/race-photos.ts";

const ROOT = resolve(import.meta.dirname, "..");
const source = (f: string) => readFileSync(`${ROOT}/${f}`, "utf8");

let failures = 0;
function check(name: string, cond: boolean, extra = "") {
  if (cond) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name} ${extra}`);
  }
}

const row = (id: string): PhotoRow => ({
  candidate_id: id,
  storage_path: `${id}.webp`,
  credit: "Campaign website",
  source_page_url: `https://example.org/${id}`,
});
const url = (p: string) => `https://cdn.test/${p}`;

/* ---- 1. All or none ---------------------------------------------------- */

const both = allOrNone(["a", "b"], [row("a"), row("b")], url);
check(
  "every candidate has a photo: all shown",
  both?.size === 2 && both.get("a")?.src === "https://cdn.test/a.webp"
);
check(
  "one candidate missing: none shown",
  allOrNone(["a", "b"], [row("a")], url) === null
);
check("no candidates: none shown", allOrNone([], [], url) === null);
check(
  "a photo of someone outside the race doesn't fill a gap",
  allOrNone(["a", "b"], [row("a"), row("z")], url) === null
);
check(
  "no storage URL (env missing): none shown",
  allOrNone(["a"], [row("a")], () => null) === null
);
check(
  "the credit and source page travel with the photo",
  both?.get("b")?.credit === "Campaign website" &&
    both?.get("b")?.sourcePageUrl === "https://example.org/b"
);

/* ---- 2. Wiring ---------------------------------------------------------- */

const race = source("src/app/(public)/races/[raceId]/page.tsx");
check(
  "the race page computes photos once per race, for both the brief and the listing",
  (race.match(/photos=\{await racePhotosFor\(raceCandidates\)\}/g) ?? [])
    .length === 2
);
const cand = source("src/app/(public)/candidates/[candidateId]/page.tsx");
check(
  "the candidate page uses the whole race's photos, not the candidate's alone",
  /photos: await racePhotosFor\(raceCandidates\)/.test(cand)
);
for (const f of [
  "src/components/features/RaceListing.tsx",
  "src/components/features/CandidateBrief.tsx",
  "src/components/features/RaceCompare.tsx",
]) {
  check(
    `${f} renders CandidatePhoto from the race's photos`,
    /<CandidatePhoto\s+photos=\{photos\}/.test(source(f))
  );
}
const photo = source("src/components/features/CandidatePhoto.tsx");
check(
  "the photo renders nothing without the race's photos",
  /if \(!photo\) return null;/.test(photo)
);
check(
  "one frame for everyone: no colour or party styling on the photo",
  !/party|primary|accent|error|success/.test(
    photo.replace(/\/\*[\s\S]*?\*\//g, "")
  )
);

const migration = source("supabase/migrations/0056_candidate_photo.sql");
check(
  "anon reads only verified photos",
  /verified_by IS NOT NULL/.test(migration)
);
check(
  "anon reads only photos of candidates in listed or published races",
  /rp\.status IN \('listed', 'published'\)/.test(migration)
);
const frozen = source("scripts/freeze-manifest.ts");
check(
  "the new render-path files are on the freeze list",
  [
    "src/lib/headshots.ts",
    "src/lib/race-photos.ts",
    "src/components/features/CandidatePhoto.tsx",
  ].every((f) => frozen.includes(`"${f}"`))
);

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nverify-headshots: all checks passed.");
