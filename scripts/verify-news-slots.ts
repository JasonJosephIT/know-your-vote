/* Guardrail for news-fairness.md §2 ("Equal slots") and candidate-news-PRD.md
   §6 (the `named` / `related` tiers). Pins the rules a future edit could break
   without the UI visibly complaining:

     1. `named` fills before `related`, whatever the dates say.
     2. Within a tier, lean spread beats recency — the newest item from each
        distinct lean_tag before a second item from any one lean.
     3. Type spread is the next tiebreaker, so one candidate's slots are not
        all opinion columns while another's are all reporting.
     4. An item with no source participates as its own bucket; it is never
        dropped here. ("No source, no card" is the ingest lint's rule, not the
        selector's.)
     5. Shortfall is reported, never padded.
     6. `n` undefined means "order everything, cap nothing".
     7. The selector is deterministic.

   The two "mutation" fixtures (B and C) exist so that replacing the greedy
   pick with plain recency makes this script exit 1 — see the header of
   src/lib/news-slots.ts.

   Pure and offline: no DB, no network, no browser. Same idiom as
   verify-news-labels.ts (Node >= 22 strips types natively).

   Run: node scripts/verify-news-slots.ts */

import { selectNewsSlots, type NewsSlotItem } from "../src/lib/news-slots.ts";
import type { LeanTag, SourceType } from "../src/lib/news-labels.ts";

let failures = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) return;
  failures++;
  console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
}

type Item = NewsSlotItem & { id: string };

const item = (
  id: string,
  published_at: string,
  relation: "named" | "related" | null,
  source: { lean_tag: LeanTag; type: SourceType } | null,
): Item => ({ id, published_at, relation, source });

const src = (lean_tag: LeanTag, type: SourceType) => ({ lean_tag, type });
const ids = (rows: readonly Item[]) => rows.map((r) => r.id).join(",");
const leansOf = (rows: readonly Item[]) =>
  new Set(rows.map((r) => r.source?.lean_tag ?? "(none)"));
const typesOf = (rows: readonly Item[]) =>
  new Set(rows.map((r) => r.source?.type ?? "(none)"));
const countType = (rows: readonly Item[], t: SourceType) =>
  rows.filter((r) => r.source?.type === t).length;

/* ── Fixture A — the 14-vs-3 split of news-fairness.md's verify line ─────────
   Candidate A has 14 stories; the newest five are all left-leaning opinion
   columns, and other leans and types exist further down the list. Candidate B
   has 3. Both are `named`, so tier is not the variable here. */
const A: Item[] = [
  item("a01", "2026-09-14T00:00:00Z", "named", src("left", "opinion")),
  item("a02", "2026-09-13T00:00:00Z", "named", src("left", "opinion")),
  item("a03", "2026-09-12T00:00:00Z", "named", src("left", "opinion")),
  item("a04", "2026-09-11T00:00:00Z", "named", src("left", "opinion")),
  item("a05", "2026-09-10T00:00:00Z", "named", src("left", "opinion")),
  item("a06", "2026-09-09T00:00:00Z", "named", src("right", "factual_reporting")),
  item("a07", "2026-09-08T00:00:00Z", "named", src("center", "factual_reporting")),
  item("a08", "2026-09-07T00:00:00Z", "named", src("center-left", "factual_reporting")),
  item("a09", "2026-09-06T00:00:00Z", "named", src("N/A", "primary_doc")),
  item("a10", "2026-09-05T00:00:00Z", "named", src("left", "opinion")),
  item("a11", "2026-09-04T00:00:00Z", "named", src("left", "opinion")),
  item("a12", "2026-09-03T00:00:00Z", "named", src("left", "opinion")),
  item("a13", "2026-09-02T00:00:00Z", "named", src("left", "factual_reporting")),
  item("a14", "2026-09-01T00:00:00Z", "named", src("left", "opinion")),
];

const B3: Item[] = [
  item("b01", "2026-09-14T00:00:00Z", "named", src("left", "opinion")),
  item("b02", "2026-09-13T00:00:00Z", "named", src("center", "factual_reporting")),
  item("b03", "2026-09-12T00:00:00Z", "named", src("right", "opinion")),
];

// (a) — both candidates get N slots or an explicit shortfall.
const a5 = selectNewsSlots(A, 5);
check("14-item candidate fills all 5 slots", a5.slots.length === 5, `got ${a5.slots.length}`);
check("14-item candidate reports no shortfall", a5.shortfall === 0, `got ${a5.shortfall}`);

const b5 = selectNewsSlots(B3, 5);
check("3-item candidate gets 3 slots", b5.slots.length === 3, `got ${b5.slots.length}`);
check("3-item candidate reports shortfall 2", b5.shortfall === 2, `got ${b5.shortfall}`);
check("shortfall is never padded", ids(b5.slots) === "b01,b02,b03", ids(b5.slots));

/* The exact order the rule produces, pinned. Plain recency would give
   a01,a02,a03,a04,a05; dropping the type tiebreaker would give
   a01,a06,a07,a08,a09. */
check(
  "lean spread then type spread then recency",
  ids(a5.slots) === "a01,a06,a09,a07,a08",
  ids(a5.slots),
);

// (b) — newest five are single-lean, so the slots must not be.
check(
  "5 slots span 5 distinct leans, not the newest lean five times",
  leansOf(a5.slots).size === 5,
  [...leansOf(a5.slots)].join("|"),
);
check(
  "no lean is taken twice while another is untaken",
  a5.slots.filter((r) => r.source?.lean_tag === "left").length === 1,
  ids(a5.slots),
);

// (c) — same for type. All-same-lean fixture so only the type rule can act.
const C: Item[] = [
  item("c01", "2026-09-14T00:00:00Z", "named", src("center", "opinion")),
  item("c02", "2026-09-13T00:00:00Z", "named", src("center", "opinion")),
  item("c03", "2026-09-12T00:00:00Z", "named", src("center", "opinion")),
  item("c04", "2026-09-11T00:00:00Z", "named", src("center", "factual_reporting")),
  item("c05", "2026-09-10T00:00:00Z", "named", src("center", "primary_doc")),
];
const c3 = selectNewsSlots(C, 3);
check("type spread beats recency", ids(c3.slots) === "c01,c04,c05", ids(c3.slots));
check("slots are not all opinion when reporting exists", countType(c3.slots, "opinion") === 1,
  `${countType(c3.slots, "opinion")} opinion`);
check("3 slots span 3 distinct types", typesOf(c3.slots).size === 3,
  [...typesOf(c3.slots)].join("|"));

/* Lean spread outranks type spread, not the other way round: the newest item
   is left/opinion, and the next pick must be the other lean even though that
   means a second opinion column. */
const P: Item[] = [
  item("p01", "2026-09-14T00:00:00Z", "named", src("left", "opinion")),
  item("p02", "2026-09-13T00:00:00Z", "named", src("left", "factual_reporting")),
  item("p03", "2026-09-12T00:00:00Z", "named", src("right", "opinion")),
];
check("lean outranks type", ids(selectNewsSlots(P, 2).slots) === "p01,p03",
  ids(selectNewsSlots(P, 2).slots));

// (d) — named fills before related, whatever the dates say.
const D: Item[] = [
  item("d-rel-1", "2026-09-20T00:00:00Z", "related", src("center", "factual_reporting")),
  item("d-rel-2", "2026-09-19T00:00:00Z", "related", src("center", "factual_reporting")),
  item("d-nam-1", "2026-09-10T00:00:00Z", "named", src("center", "factual_reporting")),
  item("d-nam-2", "2026-09-09T00:00:00Z", "named", src("center", "factual_reporting")),
];
check("named fills before newer related", ids(selectNewsSlots(D, 2).slots) === "d-nam-1,d-nam-2",
  ids(selectNewsSlots(D, 2).slots));
check("related fills the slots named left over",
  ids(selectNewsSlots(D, 3).slots) === "d-nam-1,d-nam-2,d-rel-1",
  ids(selectNewsSlots(D, 3).slots));
check("every named item precedes every related item",
  ids(selectNewsSlots(D).slots) === "d-nam-1,d-nam-2,d-rel-1,d-rel-2",
  ids(selectNewsSlots(D).slots));

/* A NULL relation is pre-matcher R1 output: candidate-scoped already, so it
   sorts with `named` rather than being demoted to a tier it never had. */
const N: Item[] = [
  item("n-rel", "2026-09-20T00:00:00Z", "related", src("center", "factual_reporting")),
  item("n-null", "2026-09-01T00:00:00Z", null, src("center", "factual_reporting")),
];
check("null relation counts as named", ids(selectNewsSlots(N, 1).slots) === "n-null",
  ids(selectNewsSlots(N, 1).slots));

/* Lean counts carry ACROSS the tier boundary (news-slots.ts header, lines
   24-26): the `named` pick already spent the "left" bucket, so the related
   tier must prefer the untaken "right" lean even though the "left" related
   item is newer and plain recency would pick it. Same `type` on every item
   so only the carried lean count can be doing the work. If leanTaken/typeTaken
   were built fresh per tier instead of once outside the loop, this would fail. */
const Q: Item[] = [
  item("q-nam-left", "2026-09-01T00:00:00Z", "named", src("left", "factual_reporting")),
  item("q-rel-left", "2026-09-20T00:00:00Z", "related", src("left", "factual_reporting")),
  item("q-rel-right", "2026-09-10T00:00:00Z", "related", src("right", "factual_reporting")),
];
check(
  "carried lean count makes the related tier prefer the untaken lean over a newer same-lean item",
  ids(selectNewsSlots(Q, 2).slots) === "q-nam-left,q-rel-right",
  ids(selectNewsSlots(Q, 2).slots),
);

// (e) — a sourceless item is its own bucket and is never dropped here.
const E: Item[] = [
  item("e-src-1", "2026-09-10T00:00:00Z", "named", src("left", "factual_reporting")),
  item("e-src-2", "2026-09-09T00:00:00Z", "named", src("left", "factual_reporting")),
  item("e-none", "2026-09-05T00:00:00Z", "named", null),
];
const e2 = selectNewsSlots(E, 2);
check("sourceless item is its own lean bucket", ids(e2.slots) === "e-src-1,e-none", ids(e2.slots));
check("sourceless item is not dropped", selectNewsSlots(E).slots.length === 3,
  String(selectNewsSlots(E).slots.length));

// (f) — n undefined orders everything and caps nothing.
const aAll = selectNewsSlots(A, undefined);
check("undefined n returns every item", aAll.slots.length === A.length,
  `${aAll.slots.length} of ${A.length}`);
check("undefined n reports no shortfall", aAll.shortfall === 0, String(aAll.shortfall));
check("undefined n keeps the same rule order",
  ids(aAll.slots.slice(0, 5)) === ids(a5.slots),
  `${ids(aAll.slots.slice(0, 5))} vs ${ids(a5.slots)}`);
check("undefined n drops nothing",
  new Set(aAll.slots.map((r) => r.id)).size === A.length,
  String(new Set(aAll.slots.map((r) => r.id)).size));

// Empty input is the quiet case the page shows most.
check("empty input, uncapped", selectNewsSlots([]).slots.length === 0);
check("empty input, capped, states the whole shortfall", selectNewsSlots([], 5).shortfall === 5,
  String(selectNewsSlots([], 5).shortfall));

// (g) — determinism: same input twice, identical output.
check("deterministic across calls", ids(selectNewsSlots(A, 5).slots) === ids(a5.slots));
check("deterministic on a copy of the input", ids(selectNewsSlots([...A], 5).slots) === ids(a5.slots));
check("input array is not mutated", ids(A) ===
  "a01,a02,a03,a04,a05,a06,a07,a08,a09,a10,a11,a12,a13,a14", ids(A));

if (failures > 0) {
  console.error(`\nverify-news-slots: ${failures} failure(s)`);
  process.exit(1);
}
console.log(
  "verify-news-slots: OK — named before related, lean spread before type spread before recency, shortfall stated",
);
