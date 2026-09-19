/* Guardrail for src/lib/news-enqueue.ts — the sweep→review-queue planner
   (candidate-news-PRD.md §6, founder decision 2026-09-19).

   THE RULE THIS EXISTS FOR: the relation tier must survive intact from the
   matcher to a payload the approval boundary accepts. Until 2026-09-19 the
   boundary dropped it, and a dropped tier is not a missing label — CandidateNews
   renders `relation !== "related"` under "In the news", so a null presented an
   ambiguous surname match as a story that NAMED the candidate. That is the one
   misreading §6's two tiers exist to prevent.

   So the strongest check here is not a shape assertion of my own invention: it
   parses every produced payload with the real `ManualNewsPayloadSchema`. If the
   schema and this planner ever disagree, an operator would find out by approving
   a row and watching it fail, which is the worst possible place.

   Pure and offline: no DB, no network, no browser.

   Run: node scripts/verify-news-enqueue.ts */

import {
  dedupeKey,
  domainFromSourceId,
  planAttachments,
  reviewPayloadFor,
  sourceIdFor,
} from "../src/lib/news-enqueue.ts";
import { matchArticle, type RosterCandidate } from "../src/lib/news-match.ts";
import { OUTLETS, outletForUrl } from "../src/lib/news-sources.ts";
import { ManualNewsPayloadSchema } from "../src/types/admin.ts";
import type { SweptArticle } from "../src/lib/news-sweep.ts";

let failures = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) return;
  failures++;
  console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
}

/* Two candidates sharing a surname, which is what makes `related` reachable. */
const ROSTER: RosterCandidate[] = [
  { candidateId: "cand-1", legalName: "Maria Elena Vasquez", raceId: "race-1" },
  { candidateId: "cand-2", legalName: "Carlos Vasquez", raceId: "race-2" },
  { candidateId: "cand-3", legalName: "John Smith", raceId: "race-1" },
];

const article = (over: Partial<SweptArticle> = {}): SweptArticle => ({
  title: "Placeholder",
  url: "https://www.wlrn.org/story",
  summary: null,
  publishedAt: "2026-09-19T12:00:00.000Z",
  publisher: "WLRN",
  type: "factual_reporting",
  leanTag: "unrated",
  countyFips: "12086",
  retrieval: "rss",
  imageUrl: null,
  ...over,
});

const outletFor = (u: string) => outletForUrl(u, OUTLETS);
const plan = (arts: SweptArticle[]) => planAttachments(arts, ROSTER, matchArticle, outletFor);

/* ---- 1. the tier reaches the payload, both ways ------------------------- */

const named = plan([article({ title: "Maria Elena Vasquez files for re-election" })]);
check("a full-name match produces exactly one attachment",
  named.attachments.length === 1, JSON.stringify(named.attachments));
check("a full-name match is tiered 'named'",
  named.attachments[0]?.relation === "named", named.attachments[0]?.relation);
check("the payload carries relation 'named'",
  reviewPayloadFor(named.attachments[0]).relation === "named");

/* A bare shared surname is ambiguous, so §6 attaches it to EVERY candidate the
   ambiguity admits — never to the most likely one. */
const surname = plan([article({ title: "Vasquez to hold a town hall" })]);
check("an ambiguous surname attaches to both Vasquez candidates",
  surname.attachments.length === 2, JSON.stringify(surname.attachments.map((a) => a.candidateId)));
check("every ambiguous attachment is tiered 'related'",
  surname.attachments.every((a) => a.relation === "related"),
  surname.attachments.map((a) => a.relation).join(","));
check("every ambiguous payload carries relation 'related'",
  surname.attachments.every((a) => reviewPayloadFor(a).relation === "related"));

/* The regression that motivated all of this: a payload must never reach the
   boundary with the tier missing or nulled. */
for (const a of [...named.attachments, ...surname.attachments]) {
  const p = reviewPayloadFor(a);
  check(`payload for ${a.candidateId} has a non-null relation`,
    p.relation === "named" || p.relation === "related", String(p.relation));
}

/* ---- 2. the payloads satisfy the REAL schema ---------------------------- */

for (const a of [...named.attachments, ...surname.attachments]) {
  const parsed = ManualNewsPayloadSchema.safeParse(reviewPayloadFor(a));
  check(`payload for ${a.candidateId} parses with ManualNewsPayloadSchema`,
    parsed.success,
    parsed.success ? "" : JSON.stringify(parsed.error.issues));
}

/* And the schema really would have caught a dropped tier — proving the check
   above has teeth rather than passing for an unrelated reason. */
const stripped = { ...reviewPayloadFor(named.attachments[0]), relation: undefined };
check("the schema REJECTS a candidate payload with no relation",
  !ManualNewsPayloadSchema.safeParse(stripped).success);

/* ---- 3. what gets dropped, and counted --------------------------------- */

const offList = plan([article({ url: "https://not-an-outlet.example.com/x" })]);
check("an off-list host yields no attachment", offList.attachments.length === 0);
check("an off-list host is counted", offList.counts.offList === 1, String(offList.counts.offList));

const nobody = plan([article({ title: "County approves a drainage contract" })]);
check("an article naming nobody yields no attachment", nobody.attachments.length === 0);
check("an article naming nobody is counted as unmatched",
  nobody.counts.unmatched === 1, String(nobody.counts.unmatched));

/* A candidate with no race in the roster cannot be scoped, so it is skipped
   rather than scoped to a guess. */
const noRace = planAttachments(
  [article({ title: "John Smith wins" })],
  [{ candidateId: "cand-9", legalName: "John Smith", raceId: "" }],
  matchArticle,
  outletFor,
);
check("a candidate with no race id produces no attachment",
  noRace.attachments.length === 0, JSON.stringify(noRace.attachments));

/* ---- 4. the article's own fields survive ------------------------------- */

const withImage = plan([
  article({
    title: "Maria Elena Vasquez files for re-election",
    imageUrl: "https://cdn.example.com/photo.jpg",
    summary: "A dek.",
  }),
]);
const p = reviewPayloadFor(withImage.attachments[0]);
check("payload carries the feed image", p.image_url === "https://cdn.example.com/photo.jpg", String(p.image_url));
check("payload carries the dek", p.summary === "A dek.");
check("payload carries the article url", p.url === "https://www.wlrn.org/story");
check("payload carries the published date", p.published_at === "2026-09-19T12:00:00.000Z");
check("payload is scoped to the candidate's race", p.race_id === "race-1");
check("payload is candidate_news", p.item_type === "candidate_news");
check("payload has no metro (it is candidate-scoped)", p.metro === null);
/* A null feed image must stay null, not become a string — the card's text-only
   variant depends on it. */
check("a missing feed image stays null",
  reviewPayloadFor(named.attachments[0]).image_url === null);

/* ---- 5. source ids round-trip and name a real outlet ------------------- */

check("source_id is derived from the outlet domain",
  p.source_id === sourceIdFor("wlrn.org"), String(p.source_id));
check("source_id round-trips to the domain",
  domainFromSourceId(sourceIdFor("wlrn.org")) === "wlrn.org");
/* The path-scoped outlet is the awkward one. */
check("a path-scoped domain round-trips",
  domainFromSourceId(sourceIdFor("cbsnews.com/miami")) === "cbsnews.com/miami");
for (const a of [...named.attachments, ...surname.attachments]) {
  const domain = domainFromSourceId(a.sourceId);
  check(`source_id for ${a.sourceId} names a listed outlet`,
    OUTLETS.some((o) => o.domain === domain), domain);
}

/* SOURCE ROWS NEED A LEAN, and the planner cannot guarantee one.

   `source.lean_tag` is NOT NULL, so a source row is only insertable for an
   outlet with a signed-off lean. In practice the sweep only reads
   `usableOutlets()`, which already excludes a null lean — but this planner
   attaches by `outletForUrl`, which matches ANY listed outlet, and the runner
   takes arbitrary JSON on stdin. So an attachment CAN be planned for an outlet
   whose source row cannot be written, and the runner's explicit die-guard for
   that case is load-bearing rather than defensive padding.

   Asserted here so nobody deletes that guard as dead code. It is live today:
   these outlets are listed, have a retrieval path, and still have no lean. */
const listedNullLean = OUTLETS.filter(
  (o) => o.leanTag === null && (o.feed !== null || o.sitemap !== undefined),
);
check("at least one listed outlet with a retrieval path still has no lean",
  listedNullLean.length > 0,
  "if this fails the die-guard may be removable — re-check before doing so");
if (listedNullLean.length > 0) {
  const target = listedNullLean[0];
  /* Give the planner an article from that outlet and a roster name it matches,
     and confirm it plans an attachment the runner must then refuse. */
  const host = target.domain.split("/")[0];
  const risky = planAttachments(
    [article({ title: "John Smith wins", url: `https://www.${host}/2026/09/19/story` })],
    ROSTER,
    matchArticle,
    outletFor,
  );
  check(`the planner still attaches an article from ${target.domain} (no lean)`,
    risky.attachments.length > 0,
    "the runner's lean guard is what stops this becoming an uninsertable source row");
  check(`that attachment's source_id points at ${target.domain}`,
    risky.attachments.every((a) => domainFromSourceId(a.sourceId) === target.domain),
    risky.attachments.map((a) => a.sourceId).join(","));
}

/* And every outlet the sweep can actually read does have a lean — the property
   the designation of the 31 locals as `unrated` bought, since before it a swept
   local article had no legal lean value at all. */
const readable = OUTLETS.filter(
  (o) => o.leanTag !== null && (o.feed !== null || o.sitemap !== undefined) && !o.mixedFeed && !o.syndicated,
);
check("the outlets the sweep reads all have insertable source rows",
  readable.length > 0 && readable.every((o) => o.leanTag !== null),
  `${readable.length} readable`);

/* ---- 6. dedupe key matches 0005's unique index shape ------------------- */

check("dedupe key pairs url with candidate",
  dedupeKey("https://x/y", "cand-1") === "https://x/y|cand-1");
/* 0005's index is on (url, COALESCE(candidate_id,'')), so a null candidate must
   key the same way an empty string does. */
check("a null candidate keys like the empty string",
  dedupeKey("https://x/y", null) === dedupeKey("https://x/y", ""));
check("different candidates on one url are different keys",
  dedupeKey("https://x/y", "cand-1") !== dedupeKey("https://x/y", "cand-2"));

/* ---- 7. determinism ---------------------------------------------------- */

const shape = (r: ReturnType<typeof plan>) =>
  r.attachments.map((a) => `${a.candidateId}:${a.relation}`).sort().join(",");
check("planning is deterministic",
  shape(plan([article({ title: "Vasquez to hold a town hall" })]))
    === shape(plan([article({ title: "Vasquez to hold a town hall" })])));

if (failures > 0) {
  console.error(`\nverify-news-enqueue: ${failures} failure(s)`);
  process.exit(1);
}
console.log(
  "verify-news-enqueue: OK — the relation tier reaches the payload for both tiers, every payload parses with the real ManualNewsPayloadSchema, off-list and unmatched articles are dropped and counted",
);
