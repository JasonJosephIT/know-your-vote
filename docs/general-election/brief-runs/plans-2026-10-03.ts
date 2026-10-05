/* Write <RACE>/plan.json for every general-election race that has at least
   one claim, on the founder's 2026-10-03 decisions (spine-proposal-2026-10-03.md):

   1. The spine is fixed by office, before any site is read (OFFICE_SPINE).
   2. word_count_pct = 150 for every race (applied at audit time, not here).
   3. A race with no claim at all stays at the listed tier: no plan is written.

   Reads spine-roster-2026-10-03.json (the roster), jev-targets-2026-09-29.tsv
   (where each candidate's run lives) and spine-analysis-2026-10-03.json (which
   races have a claim). Each plan then goes through scripts/brief-rows-sql.ts
   unchanged, exactly as FL-GOV's did.

     node docs/general-election/brief-runs/plans-2026-10-03.ts */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { SUB_ISSUES } from "../../../src/lib/news-issues.ts";

const R = new URL(".", import.meta.url).pathname.replace(/\/$/, "");
const label = Object.fromEntries(SUB_ISSUES.map((s) => [s.id, s.label]));

/* Decision 1. Same questions for every race of the same office. */
function officeSpine(raceId: string): string[] {
  const k = raceId.replace(/-general$/, "");
  const part = k.split("-");
  if (k === "FL-SEN" || /^\d+$/.test(part[1])) return ["B1", "B2", "B3", "B4"];
  if (k === "FL-CFO") return ["A1", "A3", "B1", "A4"];
  if (k === "FL-AGR") return ["A5", "KYV5", "KYV3", "A4"];
  if (k === "FL-ATG") return ["B7", "KYV1", "B3", "A1"];
  const seat = part[2];
  if (seat.startsWith("SB")) return ["A6", "KYV9", "KYV10"];
  if (seat === "CLERK") return [];
  return ["A2", "KYV3", "KYV4", "B7"]; // county commission and mayor
}

const roster = JSON.parse(readFileSync(`${R}/spine-roster-2026-10-03.json`, "utf8")) as Array<{
  race_id: string;
  cands: Array<{ id: string; name: string; site: string | null }>;
}>;
const analysis = JSON.parse(readFileSync(`${R}/spine-analysis-2026-10-03.json`, "utf8")) as Array<{
  race_id: string;
  counts: { claims: number };
}>;
const claims = Object.fromEntries(analysis.map((a) => [a.race_id, a.counts.claims]));
const outDir = Object.fromEntries(
  readFileSync(`${R}/jev-targets-2026-09-29.tsv`, "utf8").trim().split("\n").slice(1)
    .map((l) => l.split("\t")).map(([, cid, , , out]) => [cid, out]),
);

const written: string[] = [];
const listed: string[] = [];
for (const race of roster) {
  if (race.race_id === "FL-GOV-general") continue;
  if (!claims[race.race_id]) {
    listed.push(race.race_id);
    continue;
  }
  const folder = race.race_id.replace(/-general$/, "");
  let retrieved = "";
  const candidates = race.cands.map((c) => {
    const dir = outDir[c.id];
    const runRel = dir ? `${dir.split("/").slice(1).join("/")}/run.json` : null;
    const hasRun = runRel !== null && existsSync(`${R}/${folder}/${runRel}`);
    let reason: string | null = null;
    if (!c.site) {
      reason = "no official_site (spine-roster-2026-10-03.json); founder decision D3: record silence";
    } else if (!hasRun) {
      const report = readFileSync(`${R}/${dir}/ingest-report.md`, "utf8");
      const result = report.split("| Result |")[1]?.split("\n")[0] ?? "";
      const why = /robots\.txt/.test(result)
        ? "robots.txt disallows the crawl (honoured)"
        : "bot challenge did not clear (never solved, by rule)";
      reason = `site unreadable: ${why} on the 2026-09-29 Jev-link ingest and on its one identical re-run (${dir}/ingest-report.md, attempt-1-failed/); founder decision D3/D4: record silence`;
    } else {
      const meta = readFileSync(`${R}/${dir}/meta.tsv`, "utf8");
      const end = meta.match(/^end\t(\S+)/m)?.[1] ?? "";
      if (end > retrieved) retrieved = end;
    }
    return { candidate_id: c.id, official_site: c.site, run: hasRun ? runRel : null, no_run_reason: reason };
  });
  const plan = {
    race_id: race.race_id,
    retrieved_at: retrieved,
    withheld_from: "../withheld-2026-09-30.json",
    spine: officeSpine(race.race_id).map((id) => ({ id, title: label[id], description: null })),
    candidates,
  };
  writeFileSync(`${R}/${folder}/plan.json`, JSON.stringify(plan, null, 2) + "\n");
  written.push(race.race_id);
}
console.log(`plans written: ${written.length}`);
console.log(`listed tier, no plan (no claim): ${listed.length}: ${listed.join(", ")}`);
