/* The operator Log page renders every admin_action row production holds
   (launch fixes, 2026-10-05).

   The page printed subject_id.slice(0, 8) unguarded. Publication flips
   (set_race_publication, 0018/0033; the measure flips in 0038/0040) store
   their subject in subject_ref with subject_id NULL, so the first such row
   threw and the page never loaded. On 2026-10-05 all 170 production rows
   were flips. These are their shapes, from a read-only GROUP BY that day:
   list/publish/unpublish/set_status/note on race_publication, list/publish
   on measure_publication.

   Run: node scripts/verify-admin-log.ts */

import { readFileSync } from "node:fs";
import { actionChipClass, subjectLabel } from "../src/lib/admin/log-row.ts";

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

const PRODUCTION_SHAPES = [
  { action: "list", subject_kind: "race_publication", subject_ref: "FL-GOV-general" },
  { action: "publish", subject_kind: "race_publication", subject_ref: "FL-27-general" },
  { action: "unpublish", subject_kind: "race_publication", subject_ref: "demo-fl-house-28" },
  { action: "set_status", subject_kind: "race_publication", subject_ref: "FL-DAD-SB1-general" },
  { action: "note", subject_kind: "race_publication", subject_ref: "FL-AGR-general" },
  { action: "list", subject_kind: "measure_publication", subject_ref: "FL-AM1-general" },
  { action: "publish", subject_kind: "measure_publication", subject_ref: "FL-AM3-general" },
];

for (const shape of PRODUCTION_SHAPES) {
  const row = { ...shape, subject_id: null };
  let label = "";
  let chip = "";
  let threw = "";
  try {
    label = subjectLabel(row);
    chip = actionChipClass(row.action);
  } catch (err) {
    threw = (err as Error).message;
  }
  check(
    `${shape.action} on ${shape.subject_kind} (subject_ref, subject_id NULL) renders`,
    !threw && label === `${shape.subject_kind}:${shape.subject_ref}` && chip.length > 0,
    threw || `${label} / ${chip}`
  );
}

check(
  "a console row keeps its UUID subject, shortened to 8 characters",
  subjectLabel({
    subject_kind: "review_item",
    subject_id: "3f2b9c1e-0000-4000-8000-000000000000",
    subject_ref: null,
  }) === "review_item:3f2b9c1e"
);
check(
  "a row with neither subject (the CHECK forbids it) still renders",
  subjectLabel({ subject_kind: "x", subject_id: null, subject_ref: null }) === "x:—"
);
check(
  "an unknown verb, or one named like an Object property, gets the neutral chip",
  ["set_status", "note", "constructor", "toString", "__proto__"].every(
    (a) => actionChipClass(a) === "bg-surface-muted text-on-surface-muted"
  )
);
check(
  "the console's own verbs keep their chips",
  actionChipClass("approve") === "bg-primary-muted text-success" &&
    actionChipClass("cancel") === "bg-warning/15 text-warning"
);

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const page = read("src/app/admin/(console)/log/page.tsx");
check(
  "the page renders through subjectLabel and actionChipClass, never subject_id directly",
  /subjectLabel\(row\)/.test(page) && /actionChipClass\(row\.action\)/.test(page) && !/subject_id/.test(page)
);
check(
  "the log query selects subject_ref",
  /\.select\("[^"]*\bsubject_ref\b[^"]*"\)/.test(read("src/lib/admin/log.ts"))
);

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nAdmin log checks passed.");
