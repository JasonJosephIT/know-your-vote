/* Guardrail for decision D-B (founder 2026-09-07) — the "not printed on the
   ballot" state.

   F.S. 101.151(7) keeps an unopposed candidate off the general ballot
   entirely: the contest is not printed, and the candidate takes the office.
   FL-10 is in exactly that shape this cycle, as are state senate districts 4
   and 16 and 28 state house districts (ballots-handoff.md §2, finding F2).

   The founder's decision was to CARRY the DoE's `UNO` code through ingest and
   the read model rather than derive the state from race composition. This
   file is the guard on that decision, and the case that makes it matter is
   the third check below: a race whose other candidates withdrew AFTER
   qualifying leaves one `qualified` survivor on a ballot that is already
   printed. "One ballot-tier candidate and no write-in" cannot tell that race
   apart from FL-10 — the carried code can, and telling a voter their printed
   race does not exist is the worse of the two failures.

   isUnopposedContest is pure, so this needs no database or server.

   Run: node scripts/verify-unopposed.ts
   (Node >= 23 strips types natively — same as verify-measure-balance.ts.) */

import { isUnopposedContest } from "../src/lib/unopposed.ts";
import type { Candidate } from "../src/types/schema.ts";

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

const cand = (
  qualifying_status: Candidate["qualifying_status"]
): Pick<Candidate, "qualifying_status"> => ({ qualifying_status });

const NO_WRITE_IN = false;
const WRITE_IN = true;

/* FL-10: the file's only UNO row, no write-in filed against it. */
check(
  "a lone unopposed candidate with no write-in is not on the ballot",
  isUnopposedContest([cand("unopposed")], NO_WRITE_IN)
);

/* The reason the code is carried and not derived. Same shape as FL-10 — one
   ballot-tier candidate, no write-in — but the ballot is printed, because the
   opponents withdrew after qualifying. A derivation would call this "not on
   the ballot" and hide a race the voter will actually see. */
check(
  "a lone QUALIFIED survivor is still a printed race",
  !isUnopposedContest([cand("qualified")], NO_WRITE_IN)
);

/* A qualified write-in means the contest IS printed — the candidate's name
   plus a blank write-in line — so the candidate was never unopposed. The app
   does not show the write-in (D1), but its existence still decides this. */
check(
  "an unopposed candidate facing a write-in is on the ballot",
  !isUnopposedContest([cand("unopposed")], WRITE_IN)
);

/* Contradictory data — two ballot lines cannot include an unopposed one —
   resolves toward "printed", the claim that is safe to be wrong about. */
check(
  "two ballot candidates are a printed race even if one reads unopposed",
  !isUnopposedContest([cand("unopposed"), cand("qualified")], NO_WRITE_IN)
);
check(
  "an ordinary two-candidate race is a printed race",
  !isUnopposedContest([cand("qualified"), cand("qualified")], NO_WRITE_IN)
);

/* No ballot lines at all is the "still in review" path, not this one. */
check(
  "an empty race is not an unopposed contest",
  !isUnopposedContest([], NO_WRITE_IN)
);

/* Only `unopposed` triggers it. A stale cache entry written before D-B, or a
   row the pipeline has not re-ingested, carries one of the older three
   values; none of them may claim a race is off the ballot. */
for (const status of ["qualified", "withdrawn", "other"] as const) {
  check(
    `a lone '${status}' candidate is a printed race`,
    !isUnopposedContest([cand(status)], NO_WRITE_IN)
  );
}

/* The two page states must stay distinct: "one candidate" is not the same
   question as "not on the ballot". If this ever holds, the stronger copy has
   silently swallowed the weaker one. */
check(
  "'exactly one candidate' and 'not on the ballot' are different predicates",
  [cand("qualified")].length === 1 &&
    !isUnopposedContest([cand("qualified")], NO_WRITE_IN)
);

if (failures > 0) {
  console.error(`\nverify-unopposed: ${failures} failure(s)`);
  process.exit(1);
}
console.log("\nUnopposed-contest checks passed.");
