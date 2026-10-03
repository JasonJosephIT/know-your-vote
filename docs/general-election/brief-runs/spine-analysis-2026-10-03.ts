import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { buildBriefRows, type CandidateRun } from "../../../src/lib/brief-rows.ts";
import { SUB_ISSUES } from "../../../src/lib/news-issues.ts";

const R = new URL(".", import.meta.url).pathname.replace(/\/$/, "");
const roster = JSON.parse(readFileSync(new URL("./spine-roster-2026-10-03.json", import.meta.url), "utf8")) as Array<{
  race_id: string; office: string; level: string;
  cands: Array<{ id: string; name: string; site: string | null; party: string }>;
}>;
const targets = readFileSync(`${R}/jev-targets-2026-09-29.tsv`, "utf8").trim().split("\n").slice(1)
  .map((l) => l.split("\t")).reduce<Record<string, string>>((m, [, cid, , , out]) => ((m[cid] = out), m), {});
const withheldList = JSON.parse(readFileSync(`${R}/withheld-2026-09-30.json`, "utf8")).withheld as
  Record<string, Array<{ passage_id: string; reason: string }>>;
const label = Object.fromEntries(SUB_ISSUES.map((s) => [s.id, s.label]));

const out: unknown[] = [];
for (const race of roster) {
  if (race.race_id === "FL-GOV-general") continue;
  const cands = race.cands.map((c) => {
    const dir = targets[c.id];
    const runPath = dir ? `${R}/${dir}/run.json` : null;
    const run = runPath && existsSync(runPath) ? JSON.parse(readFileSync(runPath, "utf8")) : null;
    let reason: string | null = null;
    if (!c.site) reason = "no official_site";
    else if (!run) {
      const rep = readFileSync(`${R}/${dir}/ingest-report.md`, "utf8");
      reason = /robots\.txt/.test(rep.split("| Result |")[1] ?? "") ? "robots.txt disallows the crawl (honoured)" : "bot challenge did not clear (not solved, by rule)";
    }
    const withheld = Object.fromEntries((withheldList[c.id] ?? []).map((w) => [w.passage_id, w.reason]));
    const perIssue: Record<string, number> = {};
    for (const p of run?.passages ?? []) {
      if (p.verdict?.states_policy !== true || withheld[p.id]) continue;
      for (const i of p.verdict.issues ?? []) perIssue[i] = (perIssue[i] ?? 0) + 1;
    }
    return { ...c, dir, run, reason, withheld, perIssue };
  });
  const issues = [...new Set(cands.flatMap((c) => Object.keys(c.perIssue)))].map((id) => ({
    id, title: label[id] ?? id,
    covered: cands.filter((c) => (c.perIssue[id] ?? 0) > 0).length,
    passages: cands.reduce((s, c) => s + (c.perIssue[id] ?? 0), 0),
  })).sort((a, b) => b.covered - a.covered || b.passages - a.passages || a.id.localeCompare(b.id, "en", { numeric: true }));
  const spine = issues.slice(0, 4).map((i) => ({ id: i.id, title: i.title, description: null }));

  const runs: CandidateRun[] = cands.map((c) => ({ candidateId: c.id, officialSite: c.site, run: c.run, withheld: c.withheld }));
  const res = buildBriefRows({ raceId: race.race_id, spine, candidates: runs, retrievedAt: "2026-10-03T00:00:00Z" });
  const profiles = res.rows.profiles.map((p) => ({ ...p, race_id: race.race_id }));
  out.push({
    race_id: race.race_id, office: race.office, level: race.level,
    candidates: cands.map((c) => ({ id: c.id, name: c.name, party: c.party, site: c.site, run: c.dir && c.run ? c.dir : null, reason: c.reason, perIssue: c.perIssue })),
    issues, spine, profiles,
    counts: { claims: res.rows.claims.length, positions: res.rows.positions.length, issues: res.rows.issues.length },
    misattributed: res.rejected.filter((r) => r.reason === "not_official_site").length,
  });
}
writeFileSync(new URL("./spine-analysis-2026-10-03.json", import.meta.url), JSON.stringify(out, null, 1));
console.log(`races: ${out.length}`);
