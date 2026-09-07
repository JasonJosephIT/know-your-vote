/* Guardrail for candidate-news-PRD.md §7 (task C9) — feed dedupe.

   §6 gives one article one news_item row per candidate it matched, which is
   right on a candidate page and wrong in a feed. Two properties must hold,
   and both fail silently if broken — the feed would still render, just
   dishonestly:

     1. A story matched to three candidates is ONE card.
     2. That card does not claim one of the three. Picking a candidate to link
        would be exactly the editorial discretion §6 takes away from the
        matcher, reintroduced one card later.

   Pure and offline. Run: node scripts/verify-news-feed.ts */

import { dedupeByUrl, type FeedRow } from "../src/lib/news-feed.ts";

let failures = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) return;
  failures++;
  console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
}

const row = (id: string, url: string | null, candidateId: string | null, publishedAt = "2026-09-06T00:00:00Z"): FeedRow =>
  ({ id, url, candidateId, publishedAt });

/* One story, three candidates — the §6 shape. */
const three = dedupeByUrl([
  row("1", "https://x.test/a", "cand-1"),
  row("2", "https://x.test/a", "cand-2"),
  row("3", "https://x.test/a", "cand-3"),
]);
check("three rows collapse to one card", three.length === 1, `got ${three.length}`);
check("the merged card claims no candidate", three[0]?.candidateId === null, String(three[0]?.candidateId));

/* One story, one candidate — the link must survive. Dropping it always would
   be the opposite failure: a card that could name its candidate and doesn't. */
const one = dedupeByUrl([row("1", "https://x.test/b", "cand-1")]);
check("a single-candidate card keeps its link", one[0]?.candidateId === "cand-1");

/* The same URL under one candidate and once unattached (§6 writes the
   candidate_id NULL row only when nothing matched, but the read path must not
   depend on that). */
const mixed = dedupeByUrl([
  row("1", "https://x.test/c", "cand-1"),
  row("2", "https://x.test/c", null),
]);
check("candidate + unattached collapse", mixed.length === 1, `got ${mixed.length}`);
check("null vs a candidate is a conflict, so no claim", mixed[0]?.candidateId === null);

/* Order is the caller's sort, and the first survivor keeps its position. */
const ordered = dedupeByUrl([
  row("1", "https://x.test/new", null, "2026-09-06T00:00:00Z"),
  row("2", "https://x.test/old", null, "2026-09-01T00:00:00Z"),
  row("3", "https://x.test/new", null, "2026-09-06T00:00:00Z"),
]);
check("order preserved", ordered.map((r) => r.id).join(",") === "1,2", ordered.map((r) => r.id).join(","));

/* Rows with no URL are events, not stories: two of them are two things. */
const noUrl = dedupeByUrl([row("1", null, null), row("2", null, null)]);
check("null urls never merge", noUrl.length === 2, `got ${noUrl.length}`);

/* Distinct stories stay distinct. */
const distinct = dedupeByUrl([row("1", "https://x.test/a", null), row("2", "https://x.test/b", null)]);
check("different urls stay separate", distinct.length === 2);

/* Empty in, empty out — no crash on the quiet case the feed shows most. */
check("empty input", dedupeByUrl([]).length === 0);

/* Extra fields survive the merge: the route spreads the DB row through this. */
const withExtras = dedupeByUrl([
  { ...row("1", "https://x.test/d", "cand-1"), title: "Kept" },
  { ...row("2", "https://x.test/d", "cand-2"), title: "Dropped" },
]);
check("non-FeedRow fields survive", withExtras[0]?.title === "Kept", String(withExtras[0]?.title));

if (failures > 0) {
  console.error(`\nverify-news-feed: ${failures} failure(s)`);
  process.exit(1);
}
console.log("verify-news-feed: OK — one story is one card, and it claims no candidate it cannot");
