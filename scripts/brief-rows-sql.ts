/* Turn policy runs into reviewable SQL — the step between a scored site and a
   brief a voter can read.

   IT PRINTS SQL AND WRITES NOTHING. There is no admin surface for briefs and
   `set_race_publication` (0018) is audited and REVOKEd from PUBLIC precisely
   so a human name is attached to what gets published. A script that wrote
   these rows into the live project on its own would route around that on the
   one table set the whole neutrality claim rests on. So: read a plan, emit a
   transaction, let someone read it.

   Usage:
     node scripts/brief-rows-sql.ts --plan docs/general-election/briefs/<race>.json
     node scripts/brief-rows-sql.ts --plan <plan.json> --out /tmp/race.sql

   The plan:
     {
       "race_id": "FL-GOV-general",
       "retrieved_at": "2026-09-21T00:00:00Z",
       "spine": [{ "id": "<taxonomy sub-issue id>", "title": "...", "description": null }],
       "candidates": [
         { "candidate_id": "...", "official_site": "https://...", "run": "runs/x.json" }
       ]
     }

   `run` paths resolve relative to the plan file, so a plan and its runs move
   together. */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  buildBriefRows,
  type BriefRows,
  type CandidateRun,
  type SpineIssue,
} from "../src/lib/brief-rows.ts";
import { SUB_ISSUES } from "../src/lib/news-issues.ts";
import type { PolicyRun } from "../src/lib/policy-run.ts";

interface Plan {
  race_id: string;
  retrieved_at?: string;
  spine: SpineIssue[];
  candidates: Array<{ candidate_id: string; official_site: string; run: string }>;
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const planPath = arg("plan");
if (!planPath) {
  console.error("usage: node scripts/brief-rows-sql.ts --plan <plan.json> [--out <file.sql>]");
  process.exit(2);
}

const planDir = dirname(resolve(planPath));
const plan = JSON.parse(readFileSync(planPath, "utf8")) as Plan;

const candidates: CandidateRun[] = plan.candidates.map((c) => ({
  candidateId: c.candidate_id,
  officialSite: c.official_site,
  run: JSON.parse(readFileSync(resolve(planDir, c.run), "utf8")) as PolicyRun,
}));

/* A spine id outside the shared taxonomy is legal but worth saying out loud:
   it is a question only this race asks, so no other race's brief will ever
   line up with it. */
for (const s of plan.spine) {
  if (!SUB_ISSUES.some((sub) => sub.id === s.id)) {
    console.error(`  note: spine id ${s.id} is not a taxonomy sub-issue — this race asks it alone`);
  }
}

const result = buildBriefRows({
  raceId: plan.race_id,
  spine: plan.spine,
  candidates,
  retrievedAt: plan.retrieved_at ?? new Date().toISOString(),
});

/* The one rejection that is an error rather than a finding: it means a run
   file was paired with a candidate whose site it did not come from, and the
   output would publish someone else's words under their name. */
const misattributed = result.rejected.filter((r) => r.reason === "not_official_site");
if (misattributed.length > 0) {
  console.error(
    `\nREFUSED: ${misattributed.length} passage(s) are not from the candidate's official_site.\n` +
      "A run has been paired with the wrong candidate, or official_site is wrong:\n" +
      [...new Set(misattributed.map((r) => r.candidate_id))].map((c) => `  - ${c}`).join("\n"),
  );
  process.exit(1);
}

/* ---- rendering --------------------------------------------------------- */

const q = (value: string) => `'${value.replace(/'/g, "''")}'`;
const qn = (value: string | null) => (value === null ? "NULL" : q(value));
const arr = (values: string[]) =>
  values.length === 0
    ? "ARRAY[]::text[]"
    : `ARRAY[${values.map(q).join(",")}]::text[]`;

function render(rows: BriefRows): string {
  const out: string[] = [];
  const counts = result.rejected.reduce<Record<string, number>>((acc, r) => {
    acc[r.reason] = (acc[r.reason] ?? 0) + 1;
    return acc;
  }, {});

  out.push(`-- Brief rows for ${plan.race_id}, built by scripts/brief-rows-sql.ts.`);
  out.push(`-- Generated from ${plan.candidates.length} policy run(s). Review before applying.`);
  out.push(`--`);
  out.push(
    `-- ${rows.sources.length} source, ${rows.issues.length} issue, ${rows.claims.length} claim, ` +
      `${rows.positions.length} position, ${rows.profiles.length} profile rows.`,
  );
  out.push(`-- Passages that produced no row: ${JSON.stringify(counts)}`);
  out.push(`--`);
  out.push(`-- Every claim is stated_position / single_source with a NULL verdict: a Noul`);
  out.push(`-- scores relevance and cannot adjudicate. Nothing here is a checked fact.`);
  out.push(`--`);
  out.push(`-- This drops and rewrites the race's brief rows, INCLUDING the balance`);
  out.push(`-- verdict in profile.audit. That is deliberate: the content changed, so the`);
  out.push(`-- old verdict no longer describes it. Re-run the Balance Audit (T10) before`);
  out.push(`-- publishing — briefs.ts refuses a race whose profiles lack`);
  out.push(`-- balance_check_passed = true, so the race stays dark until it is re-audited.`);
  out.push("");
  out.push("BEGIN;");
  out.push("");

  out.push(`-- Clear this race's prior brief rows (claim_source cascades from claim).`);
  out.push(`DELETE FROM claim    WHERE race_id = ${q(plan.race_id)};`);
  out.push(`DELETE FROM position WHERE race_id = ${q(plan.race_id)};`);
  out.push(`DELETE FROM issue    WHERE race_id = ${q(plan.race_id)};`);
  out.push("");

  if (rows.sources.length > 0) {
    out.push(`-- Sources. ON CONFLICT (url_norm): the Python tool layer dedupes on the same`);
    out.push(`-- normalization, so a page it already recorded keeps its existing source_id.`);
    out.push(
      "INSERT INTO source (source_id, url, url_norm, publisher, type, lean_tag, retrieved_at) VALUES",
    );
    out.push(
      rows.sources
        .map(
          (s) =>
            `  (${q(s.source_id)}, ${q(s.url)}, ${q(s.url_norm)}, ${q(s.publisher)}, ` +
            `${q(s.type)}, ${q(s.lean_tag)}, ${q(s.retrieved_at)})`,
        )
        .join(",\n"),
    );
    out.push("ON CONFLICT (url_norm) DO NOTHING;");
    out.push("");
  }

  if (rows.issues.length > 0) {
    out.push("INSERT INTO issue (issue_id, race_id, tier, candidate_id, title, description, source_id, display_order) VALUES");
    out.push(
      rows.issues
        .map(
          (i) =>
            `  (${q(i.issue_id)}, ${q(i.race_id)}, ${q(i.tier)}, ${qn(i.candidate_id)}, ` +
            `${q(i.title)}, ${qn(i.description)}, ${qn(i.source_id)}, ${i.display_order})`,
        )
        .join(",\n"),
    );
    out.push(";");
    out.push("");
  }

  if (rows.claims.length > 0) {
    out.push("INSERT INTO claim (claim_id, candidate_id, race_id, issue_id, text, bucket, attributed, derived_from, verdict, verification) VALUES");
    out.push(
      rows.claims
        .map(
          (c) =>
            `  (${q(c.claim_id)}, ${q(c.candidate_id)}, ${q(c.race_id)}, ${q(c.issue_id)}, ` +
            `${q(c.text)}, ${q(c.bucket)}, ${c.attributed}, NULL, NULL, ${q(c.verification)})`,
        )
        .join(",\n"),
    );
    out.push(";");
    out.push("");

    out.push(`-- Resolved by url_norm, not by the source_id above, so a claim binds to the`);
    out.push(`-- row that actually won the ON CONFLICT. No source, no claim_source, and`);
    out.push(`-- briefs.ts inner-joins claim_source — so such a claim would never render.`);
    const normOf = new Map(rows.sources.map((s) => [s.source_id, s.url_norm]));
    out.push("INSERT INTO claim_source (claim_id, source_id)");
    out.push(
      rows.claimSources
        .map(
          (cs) =>
            `  SELECT ${q(cs.claim_id)}, source_id FROM source WHERE url_norm = ${q(normOf.get(cs.source_id)!)}`,
        )
        .join("\nUNION ALL\n"),
    );
    out.push(";");
    out.push("");
  }

  if (rows.positions.length > 0) {
    out.push("INSERT INTO position (position_id, candidate_id, race_id, issue_id, stance_summary, claim_ids, attributed, coverage) VALUES");
    out.push(
      rows.positions
        .map(
          (p) =>
            `  (${q(p.position_id)}, ${q(p.candidate_id)}, ${q(p.race_id)}, ${q(p.issue_id)}, ` +
            `${q(p.stance_summary)}, ${arr(p.claim_ids)}, ${p.attributed}, ${q(p.coverage)})`,
        )
        .join(",\n"),
    );
    out.push(";");
    out.push("");
  }

  if (rows.profiles.length > 0) {
    out.push(`-- profile.facts / .positions / .opinions are claim-id lists (CAP_Schema_v1 §7)`);
    out.push(`-- and balance_audit_core derives verifiable_fact_count and`);
    out.push(`-- stated_position_count from their LENGTHS. They are not decoration.`);
    out.push(`-- audit is REPLACED, not merged: the new content has not been audited.`);
    out.push("INSERT INTO profile (candidate_id, race_id, facts, positions, opinions, audit) VALUES");
    out.push(
      rows.profiles
        .map(
          (p) =>
            `  (${q(p.candidate_id)}, ${q(p.race_id)}, ${arr(p.facts)}, ${arr(p.positions)}, ` +
            `${arr(p.opinions)}, ${q(JSON.stringify(p.audit))}::jsonb)`,
        )
        .join(",\n"),
    );
    out.push("ON CONFLICT (candidate_id, race_id) DO UPDATE SET");
    out.push("  facts = EXCLUDED.facts, positions = EXCLUDED.positions,");
    out.push("  opinions = EXCLUDED.opinions, audit = EXCLUDED.audit;");
    out.push("");
  }

  out.push(`-- Sanity: every ballot candidate in the race must have a profile, or the race`);
  out.push(`-- cannot publish. Fails the transaction rather than leaving a half-built race.`);
  out.push("DO $$");
  out.push("DECLARE missing text;");
  out.push("BEGIN");
  out.push("  SELECT string_agg(c.candidate_id, ', ') INTO missing");
  out.push(`  FROM race r, unnest(r.candidate_ids) cid`);
  out.push("  JOIN candidate c ON c.candidate_id = cid");
  out.push(`  WHERE r.race_id = ${q(plan.race_id)} AND c.ballot_status = 'ballot'`);
  out.push("    AND NOT EXISTS (SELECT 1 FROM profile p");
  out.push(`                     WHERE p.candidate_id = c.candidate_id AND p.race_id = ${q(plan.race_id)});`);
  out.push("  IF missing IS NOT NULL THEN");
  out.push("    RAISE EXCEPTION 'ballot candidates with no profile: %', missing;");
  out.push("  END IF;");
  out.push("END $$;");
  out.push("");
  out.push("COMMIT;");
  out.push("");
  out.push(`-- Next: run the Balance Audit (T10) for ${plan.race_id}, then`);
  out.push(`-- set_race_publication once a human has read the brief.`);
  return out.join("\n") + "\n";
}

const sql = render(result.rows);
const outPath = arg("out");
if (outPath) {
  writeFileSync(outPath, sql);
  console.error(`wrote ${outPath}`);
} else {
  process.stdout.write(sql);
}

for (const [reason, n] of Object.entries(
  result.rejected.reduce<Record<string, number>>((acc, r) => {
    acc[r.reason] = (acc[r.reason] ?? 0) + 1;
    return acc;
  }, {}),
)) {
  console.error(`  ${n} passage(s) produced no row: ${reason}`);
}
