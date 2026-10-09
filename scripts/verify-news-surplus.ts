/* Guardrail for news-fairness.md §2, "Surplus is shown, behind an expander"
   (founder decision C, 2026-10-09). Pins:

     1. The expander's count is the REAL count of the candidate's named
        stories — never capped at N, never rounded, never paged — and its list
        holds every one of them, most recent first.
     2. N or fewer named stories: no expander (the shortfall line speaks).
     3. `related` (race-pool) stories neither count toward nor appear in a
        candidate's expander.
     4. No cap passed (N unset): nothing is hidden, so no expander.
     5. A race whose skew has not passed the source check gets no expander,
        and a race absent from the registry counts as not checked.

   Mutation-checked: capping `total` at any fixed number, or counting
   `related` items, makes this script exit 1.

   Pure and offline. Run: node scripts/verify-news-surplus.ts */

import { newsSurplus, type NewsSlotItem } from "../src/lib/news-slots.ts";
import {
  NEWS_SKEW_CHECKS,
  skewPassedSourceCheck,
  type SkewCheck,
} from "../src/lib/news-skew-check.ts";

let failures = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) return;
  failures++;
  console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
}

type Item = NewsSlotItem & { id: string };
const day = (d: number) => new Date(Date.UTC(2026, 9, 9) - d * 86_400_000).toISOString();
function named(count: number, prefix = "n"): Item[] {
  /* Deliberately shuffled dates so "most recent first" is the function's
     work, not the fixture's. */
  return Array.from({ length: count }, (_, i) => ({
    id: `${prefix}${i}`,
    published_at: day((i * 7) % count),
    relation: "named",
    source: { type: "factual_reporting", lean_tag: "unrated" },
  }));
}
const related = (count: number): Item[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `r${i}`,
    published_at: day(0),
    relation: "related",
    source: { type: "factual_reporting", lean_tag: "unrated" },
  }));

const N = 3;

// 1. Real count, never capped — at several sizes, including well past any
//    plausible display cap.
for (const size of [4, 14, 57, 250]) {
  const s = newsSurplus(named(size), N, true);
  check(`real count at ${size}`, s?.total === size, String(s?.total));
  check(`every story listed at ${size}`, s?.all.length === size, String(s?.all.length));
  check(`no story duplicated at ${size}`, new Set(s?.all.map((i) => i.id)).size === size);
  const times = (s?.all ?? []).map((i) => Date.parse(i.published_at));
  check(`most recent first at ${size}`, times.every((t, k) => k === 0 || times[k - 1] >= t));
}

// 2. N or fewer: no expander.
check("exactly N: no expander", newsSurplus(named(N), N, true) === null);
check("fewer than N: no expander", newsSurplus(named(1), N, true) === null);
check("none: no expander", newsSurplus([], N, true) === null);

// 3. Related stories neither count nor appear.
check("related alone never opens an expander", newsSurplus([...named(2), ...related(9)], N, true) === null);
const mixed = newsSurplus([...related(5), ...named(6)], N, true);
check("related excluded from count", mixed?.total === 6, String(mixed?.total));
check("related excluded from list", (mixed?.all ?? []).every((i) => i.relation !== "related"));
check("null relation counts as named", newsSurplus(
  named(5).map((i) => ({ ...i, relation: null })), N, true)?.total === 5);

// 4. No cap, nothing hidden.
check("N unset: no expander", newsSurplus(named(14), undefined, true) === null);

// 5. Source-check gate.
check("skew not passed: no expander", newsSurplus(named(14), N, false) === null);
const fixtureChecks: Record<string, SkewCheck> = {
  "R-real": { label: "real_world_skew", checkedOn: "2026-10-09", report: "x" },
  "R-gap": { label: "pipeline_gap", checkedOn: "2026-10-09", report: "x" },
  "R-unclear": { label: "unclear", checkedOn: "2026-10-09", report: "x" },
};
check("real_world_skew passes", skewPassedSourceCheck("R-real", fixtureChecks));
check("pipeline_gap does not pass", !skewPassedSourceCheck("R-gap", fixtureChecks));
check("unclear does not pass", !skewPassedSourceCheck("R-unclear", fixtureChecks));
check("unchecked race does not pass", !skewPassedSourceCheck("R-none", fixtureChecks));
check("prototype keys do not pass", !skewPassedSourceCheck("toString", fixtureChecks));
// The live registry: every entry names a report, so a flip is always traceable.
for (const [raceId, c] of Object.entries(NEWS_SKEW_CHECKS)) {
  check(`registry ${raceId} cites a source-check report`,
    /^docs\/general-election\/source-check-\d{4}-\d{2}-\d{2}\.md$/.test(c.report), c.report);
  check(`registry ${raceId} has an ISO date`, /^\d{4}-\d{2}-\d{2}$/.test(c.checkedOn), c.checkedOn);
}

if (failures > 0) {
  console.error(`\nverify-news-surplus: ${failures} failure(s)`);
  process.exit(1);
}
console.log("verify-news-surplus: OK — real count never capped, named only, gated on the source check");
