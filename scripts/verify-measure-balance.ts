/* Verifies the read layer's symmetry re-check (TASK-062) — the second of the
   two places the rule lives.

   The database enforces it at write time (0010: a lopsided measure cannot be
   published, and a published one cannot be skewed afterwards); this checks
   the belt-and-braces re-read in src/lib/measures.ts, which is what stops a
   one-sided render if a row ever reaches 'published' by some path the
   trigger did not cover — a restore, a direct service-role write, a future
   migration.

   sidesBalanced is pure, so this needs no database or server. So is
   measureVisibleStatus (src/lib/measure-status.ts), the fail-closed read of
   which publication tier made a measure visible, checked at the bottom.

   Run: node scripts/verify-measure-balance.ts
   (Node >= 23 strips types natively — same as verify-calendar.ts.) */

import { sidesBalanced } from "../src/lib/measure-balance.ts";
import { measureVisibleStatus } from "../src/lib/measure-status.ts";

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

/* Both sides present and within one of each other. */
check("1 vs 1 is balanced", sidesBalanced(1, 1));
check("2 vs 2 is balanced", sidesBalanced(2, 2));
check("3 vs 2 is balanced (differ by one)", sidesBalanced(3, 2));
check("2 vs 3 is balanced (differ by one)", sidesBalanced(2, 3));

/* A missing side is the failure this exists to prevent: an amendment has no
   campaign obliged to supply one, so "whatever we found" skews toward
   whichever side is better organised. */
check("1 vs 0 is NOT balanced", !sidesBalanced(1, 0));
check("0 vs 1 is NOT balanced", !sidesBalanced(0, 1));
check("0 vs 0 is NOT balanced", !sidesBalanced(0, 0));
check("5 vs 0 is NOT balanced", !sidesBalanced(5, 0));

/* Present on both sides but lopsided. */
check("3 vs 1 is NOT balanced", !sidesBalanced(3, 1));
check("1 vs 3 is NOT balanced", !sidesBalanced(1, 3));
check("10 vs 2 is NOT balanced", !sidesBalanced(10, 2));

/* The threshold is exactly one, in both directions. */
check("4 vs 3 is balanced (boundary)", sidesBalanced(4, 3));
check("4 vs 2 is NOT balanced (just past the boundary)", !sidesBalanced(4, 2));

/* The listed tier (0033). measureVisibleStatus reads the
   measure_publication(status) embed, which PostgREST may return as an
   object, a one-element array, or null — and it must fail closed: anything
   but exactly `listed` or `published` means the measure does not render. */
check(
  "object embed, listed",
  measureVisibleStatus({ status: "listed" }) === "listed"
);
check(
  "object embed, published",
  measureVisibleStatus({ status: "published" }) === "published"
);
check(
  "array embed, listed",
  measureVisibleStatus([{ status: "listed" }]) === "listed"
);
check(
  "array embed, published",
  measureVisibleStatus([{ status: "published" }]) === "published"
);
check("null embed is hidden", measureVisibleStatus(null) === null);
check("undefined embed is hidden", measureVisibleStatus(undefined) === null);
check("empty array embed is hidden", measureVisibleStatus([]) === null);
check("draft is hidden", measureVisibleStatus({ status: "draft" }) === null);
check(
  "in_review is hidden",
  measureVisibleStatus({ status: "in_review" }) === null
);
check(
  "an unknown future status is hidden",
  measureVisibleStatus({ status: "archived" }) === null
);
check("case matters", measureVisibleStatus({ status: "Published" }) === null);
check("a missing status field is hidden", measureVisibleStatus({}) === null);

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nMeasure symmetry and visibility checks passed.");
