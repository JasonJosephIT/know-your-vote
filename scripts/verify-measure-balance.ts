/* Verifies the two pure rules behind the measure page (spec
   docs/superpowers/specs/2026-09-23-measure-resource-ladder-design.md):

   1. sidesBalanced — the publication re-check in src/lib/measures.ts. The
      database enforces the same rule at write time (0034); this is the
      belt-and-braces re-read that stops a one-sided render if a row ever
      reaches 'published' by a path the trigger did not cover.
   2. rankResources — the credibility ladder. Tier is a function of `kind`
      and nothing else: a commentary video dated today never outranks an
      official document from 2024.

   Both live in src/lib/measure-ladder.ts, which imports nothing, so this runs
   under Node's native type stripping with no build. measureVisibleStatus
   (src/lib/measure-status.ts) is checked at the bottom as before.

   Run: node scripts/verify-measure-balance.ts */

import {
  RESOURCE_TIER,
  rankResources,
  sidesBalanced,
} from "../src/lib/measure-ladder.ts";
import { measureVisibleStatus } from "../src/lib/measure-status.ts";

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

/* ---- sidesBalanced: both present, larger <= 2x smaller ---------------- */
check("1 vs 1 is balanced", sidesBalanced(1, 1));
check("2 vs 4 is balanced", sidesBalanced(2, 4));
check("4 vs 2 is balanced", sidesBalanced(4, 2));
check("8 vs 4 is balanced", sidesBalanced(8, 4));
check("3 vs 6 is balanced (boundary)", sidesBalanced(3, 6));
check("3 vs 7 is NOT balanced (just past)", !sidesBalanced(3, 7));
check("7 vs 3 is NOT balanced (just past)", !sidesBalanced(7, 3));
check("1 vs 3 is NOT balanced", !sidesBalanced(1, 3));
check("5 vs 2 is NOT balanced", !sidesBalanced(5, 2));

/* A missing side is the failure this exists to prevent: an amendment has no
   campaign obliged to supply one. */
check("1 vs 0 is NOT balanced", !sidesBalanced(1, 0));
check("0 vs 1 is NOT balanced", !sidesBalanced(0, 1));
check("0 vs 0 is NOT balanced", !sidesBalanced(0, 0));
check("5 vs 0 is NOT balanced", !sidesBalanced(5, 0));

/* ---- the ladder --------------------------------------------------------- */
check("official is tier 1", RESOURCE_TIER.official === 1);
check("analysis is tier 2", RESOURCE_TIER.analysis === 2);
check("reporting is tier 3", RESOURCE_TIER.reporting === 3);
check("argument is tier 4", RESOURCE_TIER.argument === 4);
check("commentary is tier 5", RESOURCE_TIER.commentary === 5);

type Row = {
  id: string;
  kind: keyof typeof RESOURCE_TIER;
  published_at: string | null;
  display_order: number;
};
const r = (
  id: string,
  kind: Row["kind"],
  published_at: string | null,
  display_order = 0
): Row => ({ id, kind, published_at, display_order });

const ids = (rows: Row[]) => rankResources(rows).map((x) => x.id).join(",");

check(
  "tier before date: a 2024 official outranks a commentary dated today",
  ids([r("c", "commentary", "2026-09-23"), r("o", "official", "2024-01-01")]) ===
    "o,c"
);
check(
  "within a tier, newest first",
  ids([r("a", "argument", "2026-01-01"), r("b", "argument", "2026-06-01")]) ===
    "b,a"
);
check(
  "within a tier, undated rows come last",
  ids([r("u", "analysis", null), r("d", "analysis", "2025-03-01")]) === "d,u"
);
check(
  "display_order breaks ties only",
  ids([
    r("y", "argument", "2026-02-02", 2),
    r("x", "argument", "2026-02-02", 1),
  ]) === "x,y"
);
check(
  "display_order cannot lift a row above its tier",
  ids([r("c", "commentary", "2026-09-01", 0), r("a", "analysis", null, 99)]) ===
    "a,c"
);
check(
  "full ladder order holds",
  ids([
    r("5", "commentary", "2026-09-01"),
    r("3", "reporting", "2026-09-01"),
    r("1", "official", "2026-09-01"),
    r("4", "argument", "2026-09-01"),
    r("2", "analysis", "2026-09-01"),
  ]) === "1,2,3,4,5"
);
check(
  "rankResources does not mutate its input",
  (() => {
    const input = [r("b", "argument", "2026-01-01"), r("a", "official", null)];
    const before = input.map((x) => x.id).join(",");
    rankResources(input);
    return input.map((x) => x.id).join(",") === before;
  })()
);

/* ---- measureVisibleStatus (0033), unchanged ---------------------------- */
check("object embed, listed", measureVisibleStatus({ status: "listed" }) === "listed");
check("object embed, published", measureVisibleStatus({ status: "published" }) === "published");
check("array embed, listed", measureVisibleStatus([{ status: "listed" }]) === "listed");
check("array embed, published", measureVisibleStatus([{ status: "published" }]) === "published");
check("null embed is hidden", measureVisibleStatus(null) === null);
check("undefined embed is hidden", measureVisibleStatus(undefined) === null);
check("empty array embed is hidden", measureVisibleStatus([]) === null);
check("draft is hidden", measureVisibleStatus({ status: "draft" }) === null);
check("in_review is hidden", measureVisibleStatus({ status: "in_review" }) === null);
check("an unknown future status is hidden", measureVisibleStatus({ status: "archived" }) === null);
check("case matters", measureVisibleStatus({ status: "Published" }) === null);
check("a missing status field is hidden", measureVisibleStatus({}) === null);

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nMeasure ladder, symmetry and visibility checks passed.");
