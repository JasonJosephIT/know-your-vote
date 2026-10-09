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

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  dedupeKey,
  domainFromSourceId,
  electionPayloadFor,
  givenPageRowProblem,
  isElectionRelated,
  listedRowProblem,
  outletSourceRow,
  pageRowProblem,
  storyPageProblem,
  planAttachments,
  planSourceAttribution,
  reviewPayloadFor,
  sourceIdFor,
  UNMATCHED_ARTICLE_POLICY,
  type AttributionRow,
} from "../src/lib/news-enqueue.ts";
import { urlNorm } from "../src/lib/brief-rows.ts";
import { matchArticle, type RosterCandidate } from "../src/lib/news-match.ts";
import { OUTLETS, outletForUrl, usableOutlets } from "../src/lib/news-sources.ts";
import { OFFICIAL_SOURCES, officialForUrl, officialSourceRow } from "../src/lib/official-sources.ts";
import { ManualNewsPayloadSchema } from "../src/types/admin.ts";
import type { SweptArticle } from "../src/lib/news-sweep.ts";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { chunkUrls, DEDUPE_CHUNK, DEDUPE_CHUNK_CHARS, enqueueIntake, readHandled } from "../src/lib/news-intake.ts";

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

/* A shared surname is ambiguous, so §6 attaches it to EVERY candidate the
   ambiguity admits — never to the most likely one. The fixture carries a
   title ("Rep. Vasquez") because both settings of news-match.ts
   SURNAME_ONLY_RULE (a pending founder call) admit that form; which bare
   surnames attach is verify-news-match.ts's job, not this file's. */
const surname = plan([article({ title: "Rep. Vasquez to hold a town hall" })]);
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
   the designation of the locals as `unrated` bought (31 on 2026-09-19, 32 with
   floridaphoenix.com on 2026-09-21), since before it a swept
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
  shape(plan([article({ title: "Rep. Vasquez to hold a town hall" })]))
    === shape(plan([article({ title: "Rep. Vasquez to hold a town hall" })])));

/* ---- 8. source attribution before approve (migration 0014) ------------- */
/* 0014's CHECK makes source_id required on candidate_news / election_news. Its
   header made a precondition of the approve path setting source_id itself, so
   the CHECK is never what refuses an approval. planSourceAttribution is that
   decision; the route below only does the reads. */

const signed = OUTLETS.find((o) => o.leanTag !== null && !o.domain.includes("/"))!;
const otherSigned = OUTLETS.find((o) => o.leanTag !== null && !o.domain.includes("/") && o.domain !== signed.domain)!;
const unsigned = OUTLETS.find((o) => o.leanTag === null);
/* The canonical normalisation the route passes — source.url_norm is UNIQUE,
   so a stand-in here could pass while the real one split a page in two. The
   row defaults to an election notice that names no candidate and no race. */
const attribute = (url: string, given: string | null = null, over: Partial<AttributionRow> = {}) =>
  planSourceAttribution(
    { url, source_id: given, item_type: "election_news", candidate_id: null, race_id: null, ...over },
    { outletFor, officialFor: (u) => officialForUrl(u), norm: urlNorm },
  );
const reasonOf = (a: ReturnType<typeof attribute>) => (a.kind === "refused" ? a.reason : "");

check("outletSourceRow writes the outlet's own signed-off lean, type and publisher",
  JSON.stringify(outletSourceRow(signed)) === JSON.stringify({
    source_id: sourceIdFor(signed.domain), url: `https://${signed.domain}`, url_norm: signed.domain,
    publisher: signed.publisher, type: signed.type, lean_tag: signed.leanTag,
  }), JSON.stringify(outletSourceRow(signed)));
if (unsigned) {
  check("an outlet with no signed-off lean has no source row", outletSourceRow(unsigned) === null);
}

/* -- a given outlet: id is checked against the URL (§3.2.2) -- */
const givenOutlet = attribute(`https://www.${signed.domain}/2026/10/04/story`, sourceIdFor(signed.domain));
check("a payload that names its own outlet keeps it",
  givenOutlet.kind === "given" && givenOutlet.sourceId === sourceIdFor(signed.domain), JSON.stringify(givenOutlet));
check("a named outlet source carries the row to write if it is missing",
  givenOutlet.kind === "given" && givenOutlet.listedRow?.source_id === sourceIdFor(signed.domain));
const crossed = attribute(`https://www.${otherSigned.domain}/2026/10/04/story`, sourceIdFor(signed.domain));
check("an outlet: id on another outlet's URL is refused, naming both",
  crossed.kind === "refused" && reasonOf(crossed).includes(signed.domain) && reasonOf(crossed).includes(otherSigned.domain),
  JSON.stringify(crossed));
const offOutletList = attribute("https://example.org/anything", sourceIdFor(signed.domain));
check("an outlet: id on a URL off the outlet list is refused",
  offOutletList.kind === "refused" && reasonOf(offOutletList).includes("no listed outlet"), JSON.stringify(offOutletList));
check("an outlet: id that names no listed outlet is refused",
  attribute(`https://www.${signed.domain}/x`, "outlet:not-listed.example").kind === "refused");
if (unsigned) {
  const own = attribute(`https://${unsigned.domain}/2026/10/04/story`, sourceIdFor(unsigned.domain));
  check("an unsigned outlet's own id is looked up by id, never written",
    own.kind === "given" && own.listedRow === null && own.pageUrlNorm === null, JSON.stringify(own));
}

/* Swept payloads are unchanged: the sweep sets outlet:<domain> from the URL's
   own outlet, path-scoped outlets included, so every one passes. */
for (const o of usableOutlets()) {
  const url = `https://www.${o.domain}/2026/10/04/ballots-mailed`;
  const election = plan([article({ title: "County ballots mailed this week", url })]).elections[0];
  const a = election ? attribute(url, election.sourceId) : null;
  check(`a swept election story from ${o.domain} resolves to its own outlet`,
    a?.kind === "given" && a.listedRow?.source_id === sourceIdFor(o.domain), JSON.stringify(a));
  const attachment = plan([article({ title: "Maria Elena Vasquez files", url })]).attachments[0];
  const p = attachment ? reviewPayloadFor(attachment) : null;
  const c = p ? attribute(p.url, p.source_id, { item_type: p.item_type, candidate_id: p.candidate_id, race_id: p.race_id }) : null;
  check(`a swept candidate story from ${o.domain} resolves to its own outlet`,
    c?.kind === "given" && c.listedRow?.source_id === sourceIdFor(o.domain), JSON.stringify(c));
}

/* -- a given page-row id must be this story's page -- */
const givenOther = attribute("https://www.wlrn.org/x", "src_gov_broward_early_voting_2026");
check("a named page source is looked up by id, never written",
  givenOther.kind === "given" && givenOther.listedRow === null && givenOther.pageUrlNorm === "www.wlrn.org/x",
  JSON.stringify(givenOther));
const misattributed = givenOther.kind === "given"
  ? givenPageRowProblem(givenOther, "browardvotes.gov/voting-methods/early-voting-dates-hours-and-sites")
  : null;
check("a src_* id whose row has a different url_norm is refused, naming both pages",
  misattributed !== null && misattributed.includes("www.wlrn.org/x") && misattributed.includes("browardvotes.gov/voting-methods"),
  String(misattributed));
check("a blank source id counts as none",
  attribute(`https://${signed.domain}/2026/10/04/story`, "   ").kind === "outlet");

/* The eight R3 rows that news_agent_rows_to_review (0054) moves into review:
   Q2's live URLs (read-only SELECT, 2026-10-08) with the src_* ids 0014 and
   0042 give them. Each must resolve `given` and pass the page check against
   the url_norm the migration writes for it. */
const MIGRATION_URL_NORM = new Map<string, string>();
for (const file of ["0014_news_fairness.sql", "0042_news_source_backfill.sql"]) {
  const sql = readFileSync(resolve(import.meta.dirname, "..", "supabase", "migrations", file), "utf8");
  for (const [, id, , norm] of sql.matchAll(/\('(src_[^']+)',\s*'([^']+)',\s*'([^']+)'/g)) MIGRATION_URL_NORM.set(id, norm);
}
const EIGHT: [url: string, sourceId: string][] = [
  ["https://www.miamidade.gov/global/release.page?Mduid_release=rel1780088950968276", "src_gov_miamidade_early_voting_2026"],
  ["https://www.miamidade.gov/global/release.page?Mduid_release=rel1788204670102232", "src_gov_miamidade_general_voting_2026"],
  ["https://www.votehillsborough.gov/291/2026-General-Election", "src_gov_hillsborough_general_2026"],
  ["https://www.flsenate.gov/Session/Bill/2026/991", "src_gov_flsenate_hb991_2026"],
  ["https://dos.fl.gov/elections/for-voters/election-dates/", "src_gov_dos_election_dates_2026"],
  ["https://browardvotes.gov/voting-methods/early-voting-dates-hours-and-sites", "src_gov_broward_early_voting_2026"],
  ["https://www.votehillsborough.gov/281/2026-Primary-Election", "src_gov_hillsborough_early_voting_2026"],
  ["https://news.ballotpedia.org/2026/06/03/florida-voters-to-decide-expanded-homestead-tax-exemption-amendment-in-november/", "src_ballotpedia_news_amendments_2026"],
];
check("0014 and 0042 write a url_norm for each of the eight ids",
  EIGHT.every(([, id]) => MIGRATION_URL_NORM.has(id)), JSON.stringify([...MIGRATION_URL_NORM.keys()]));
for (const [url, id] of EIGHT) {
  const a = attribute(url, id);
  const rowNorm = MIGRATION_URL_NORM.get(id) ?? "";
  check(`moved R3 row ${id} resolves given, and its page check passes`,
    a.kind === "given" && a.sourceId === id && a.listedRow === null && givenPageRowProblem(a, rowNorm) === null,
    JSON.stringify({ a, rowNorm }));
}

/* -- a given official: id (D7) -- */
const broward = OFFICIAL_SOURCES.find((s) => s.domain === "browardvotes.gov")!;
const okOfficial = attribute("https://www.browardvotes.gov/voting-methods/early-voting", "official:browardvotes.gov",
  { county_fips: "12011" });
check("an official: id on its own host, on an election notice with no candidate or race, in its county, is accepted",
  okOfficial.kind === "given" && JSON.stringify(okOfficial.listedRow) === JSON.stringify(officialSourceRow(broward)),
  JSON.stringify(okOfficial));
check("an accepted official: id carries the story's own url_norm for the page-row check",
  okOfficial.kind === "given" && okOfficial.storyPageNorm === "www.browardvotes.gov/voting-methods/early-voting",
  JSON.stringify(okOfficial));
/* A county body's id is re-checked against the item's county at approval,
   not only at queue time: an operator may have edited the scope. */
for (const [label, over, wants] of [
  ["scoped to another county", { county_fips: "12057" }, "county 12057"],
  ["with no county", { county_fips: null }, "no county"],
] as const) {
  const a = attribute("https://www.browardvotes.gov/x", "official:browardvotes.gov", over);
  check(`a county body's official: id is refused ${label}`,
    a.kind === "refused" && reasonOf(a).includes(wants) && reasonOf(a).includes("12011"), JSON.stringify(a));
}
for (const county of [null, "12086"]) {
  const a = attribute("https://dos.fl.gov/elections/x", "official:dos.fl.gov/elections", { county_fips: county });
  check(`a statewide body's official: id is accepted with county ${county} (PR B sets scope from the publisher)`,
    a.kind === "given", JSON.stringify(a));
}
/* The story's own page may already have a row with its true type: an
   agency's advocacy page keeps it (D7), as R3's queue does at queue time. */
check("no page row for the story's own page is no problem", storyPageProblem(null, "x.gov/a") === null);
check("a primary_doc / N/A page row for the story's own page is no problem",
  storyPageProblem({ source_id: "src_a", type: "primary_doc", lean_tag: "N/A" }, "x.gov/a") === null);
const advocacyPage = storyPageProblem({ source_id: "src_fdacs", type: "opinion", lean_tag: "N/A" }, "x.gov/a");
check("a page row recorded as opinion for the story's own page refuses the official id, naming it",
  advocacyPage !== null && advocacyPage.includes("x.gov/a") && advocacyPage.includes("opinion / N/A") &&
    advocacyPage.includes("src_fdacs"), String(advocacyPage));
check("a page row recorded primary_doc with a lean for the story's own page refuses the official id",
  storyPageProblem({ source_id: "src_a", type: "primary_doc", lean_tag: "unrated" }, "x.gov/a") !== null);
for (const [label, url, over, wants] of [
  ["on candidate_news", "https://www.browardvotes.gov/x", { item_type: "candidate_news" }, "candidate_news"],
  ["on election_news with a race_id", "https://www.browardvotes.gov/x", { race_id: "race-1" }, "candidate or a race"],
  ["on election_news with a candidate_id", "https://www.browardvotes.gov/x", { candidate_id: "cand-1" }, "candidate or a race"],
  ["on an outlet's URL", `https://www.${signed.domain}/x`, {}, "no listed official source"],
  ["on another official host's URL", "https://www.votehillsborough.gov/x", {}, "votehillsborough.gov"],
] as const) {
  const a = attribute(url, "official:browardvotes.gov", over);
  check(`an official: id is refused ${label}`, a.kind === "refused" && reasonOf(a).includes(wants), JSON.stringify(a));
}
check("an official: id that names no listed body is refused",
  attribute("https://www.browardvotes.gov/x", "official:example.gov").kind === "refused");
/* There is no metro form of an official item (R3's queue never writes one).
   An operator-edited metro scope would otherwise pass a statewide body's
   check, since a metro row has no county_fips. */
for (const [label, url, given, over] of [
  ["a statewide body's id on a metro item", "https://dos.fl.gov/elections/x", "official:dos.fl.gov/elections", { metro: "miami", county_fips: null }],
  ["a county body's id on a metro item in its county", "https://www.browardvotes.gov/x", "official:browardvotes.gov", { metro: "fort_lauderdale", county_fips: "12011" }],
] as const) {
  const a = attribute(url, given, over);
  check(`an official: id is refused for ${label}`, a.kind === "refused" && reasonOf(a).includes("metro"), JSON.stringify(a));
}

/* The home-page hole in D7: an official row's url_norm is its entry's bare
   domain, so a story whose URL is exactly a body's home page finds that row
   by url_norm in the `page` step. The row backs it only when the item would
   pass every check a given official: id must pass. */
const deps = { outletFor, officialFor: (u: string) => officialForUrl(u), norm: urlNorm };
const homeRow = (over: Partial<AttributionRow>): AttributionRow =>
  ({ url: "https://browardvotes.gov/", source_id: null, item_type: "election_news", candidate_id: null, race_id: null,
    county_fips: "12011", ...over });
const homeLookup = attribute("https://browardvotes.gov/", null, { item_type: "candidate_news", candidate_id: "c", race_id: "r" });
check("a story at a body's home page is a page lookup on the official row's url_norm (the case pageRowProblem closes)",
  homeLookup.kind === "page" && homeLookup.urlNorm === officialSourceRow(broward).url_norm, JSON.stringify(homeLookup));
for (const [label, over, wants] of [
  ["candidate_news", { item_type: "candidate_news", candidate_id: "c", race_id: "r" }, "candidate_news"],
  ["election_news with a race", { race_id: "r" }, "candidate or a race"],
  ["election_news in another county", { county_fips: "12057" }, "county 12057"],
  ["a metro election notice", { metro: "fort_lauderdale" }, "metro"],
] as const) {
  const p = pageRowProblem(homeRow(over), "official:browardvotes.gov", deps);
  check(`an official row found by url_norm is refused for ${label}`,
    p !== null && p.includes("official:browardvotes.gov") && p.includes(wants), String(p));
}
check("an official row found by url_norm backs a county election notice with no candidate or race",
  pageRowProblem(homeRow({}), "official:browardvotes.gov", deps) === null);
check("a statewide official row found by url_norm backs an unscoped election notice",
  pageRowProblem(homeRow({ url: "https://dos.fl.gov/elections/", county_fips: null }), "official:dos.fl.gov/elections", deps) === null);
check("a page row that is not an official row is never refused here",
  pageRowProblem(homeRow({ item_type: "candidate_news", candidate_id: "c", race_id: "r" }), "src_gov_broward", deps) === null);

/* There is no official fall-through: a government URL with no given id is a
   page lookup, whatever the item, never an official row. */
for (const s of OFFICIAL_SOURCES) {
  for (const over of [{}, { item_type: "candidate_news", candidate_id: "cand-1", race_id: "race-1" }]) {
    const a = attribute(`https://${s.domain}/notice`, null, over);
    check(`a URL on ${s.domain} with no source id resolves to its page row (${JSON.stringify(over)})`,
      a.kind === "page", JSON.stringify(a));
  }
}

/* The read-back check on a listed row. */
const officialRow = officialSourceRow(broward);
check("an official row read back as primary_doc / N/A passes",
  listedRowProblem(officialRow, { type: "primary_doc", lean_tag: "N/A" }) === null);
check("an official row read back with another type or lean is refused",
  listedRowProblem(officialRow, { type: "opinion", lean_tag: "N/A" })?.includes("browardvotes.gov") === true &&
    listedRowProblem(officialRow, { type: "primary_doc", lean_tag: "unrated" }) !== null);
check("an outlet row is not held to the official shape",
  listedRowProblem(outletSourceRow(signed)!, { type: "factual_reporting", lean_tag: "unrated" }) === null);

const fromOutlet = attribute(`https://www.${signed.domain}/2026/10/04/story`);
check("a URL on a signed-off outlet is attributed to that outlet",
  fromOutlet.kind === "outlet" && fromOutlet.sourceId === sourceIdFor(signed.domain), JSON.stringify(fromOutlet));
check("the outlet attribution is the same id a swept article carries",
  fromOutlet.kind === "outlet"
    && fromOutlet.sourceId === reviewPayloadFor(plan([article({
      title: "Maria Elena Vasquez files", url: `https://www.${signed.domain}/s`,
    })]).attachments[0]).source_id);
if (unsigned) {
  const u = attribute(`https://${unsigned.domain}/2026/10/04/story`);
  check("a URL on an outlet whose lean is not signed off stops, and is not resolved to a page row",
    u.kind === "unsigned" && u.domain === unsigned.domain, JSON.stringify(u));
}
const gov = attribute("https://www.votehillsborough.gov/291/2026-General-Election/");
check("a page off the outlet list is looked up by its url_norm",
  gov.kind === "page" && gov.urlNorm === "www.votehillsborough.gov/291/2026-General-Election", JSON.stringify(gov));
check("an unparseable URL resolves to none", attribute("not a url").kind === "none");

/* The route: source resolved BEFORE the insert, and the insert uses it. A
   static read, because the route needs a database to run; this pins the order
   that makes 0014 safe to apply. */
const route = readFileSync(
  resolve(import.meta.dirname, "../src/app/api/admin/review/[id]/decision/route.ts"), "utf8",
).replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
const resolveAt = route.indexOf("await resolveSource(service, plan.row)");
const insertAt = route.indexOf('.from("news_item")');
check("the approve path resolves a source before inserting news",
  resolveAt !== -1 && insertAt !== -1 && resolveAt < insertAt, `resolve@${resolveAt} insert@${insertAt}`);
check("the news insert writes the resolved source_id",
  /\.insert\(\{\s*\.\.\.plan\.row,\s*source_id:\s*source\.sourceId\s*\}\)/.test(route));
check("an unresolved source fails closed before any insert",
  /if \(!source\.ok\)\s*\{\s*return failClosed\(/.test(route));
check("the route uses planSourceAttribution with the outlet list, the official list and the canonical urlNorm",
  /const deps: AttributionDeps = \{\s*outletFor: \(u\) => outletForUrl\(u, OUTLETS\),\s*officialFor: \(u\) => officialForUrl\(u\),\s*norm: urlNorm,\s*\};\s*const plan = planSourceAttribution\(row, deps\);/.test(route));
check("a refused attribution fails closed with its reason",
  /case "refused":\s*return \{ ok: false, reason: plan\.reason \};/.test(route));
check("a given official id checks the story's own page row before writing its row",
  /if \(plan\.storyPageNorm\) \{\s*const page = await sourceRowWhere\("url_norm", plan\.storyPageNorm\);[\s\S]*?const problem = storyPageProblem\(page\.row, plan\.storyPageNorm\);\s*if \(problem\) return \{ ok: false, reason: problem \};\s*\}\s*return ensureListedRow\(plan\.listedRow, "given"\);/.test(route));
check("the page step refuses an official row the item could not be given",
  /if \(found\.row\) \{\s*const problem = pageRowProblem\(row, found\.row\.source_id, deps\);\s*if \(problem\) return \{ ok: false, reason: problem \};\s*return \{ ok: true, sourceId: found\.row\.source_id, via: "page" \};/.test(route));
check("a given listed id writes its row through ensureListedRow",
  /return ensureListedRow\(plan\.listedRow, "given"\);/.test(route) &&
    /case "outlet":\s*return ensureListedRow\(plan\.listedRow, "outlet"\);/.test(route));
check("ensureListedRow refuses an official row read back with another type or lean",
  /const problem = listedRowProblem\(listed, found\.row\);\s*if \(problem\) return \{ ok: false, reason: problem \};/.test(route));
check("a given page-row id is checked against the story's url_norm",
  /const problem = givenPageRowProblem\(plan, found\.row\.url_norm\);\s*if \(problem\) return \{ ok: false, reason: problem \};/.test(route));
check("the outlet-only writer is gone", !route.includes("ensureOutletRow"));
check("describeNewsInsertError names 0014's constraint instead of blaming 0005",
  route.includes("news_item_agent_source_check") && route.includes("news_item_item_type_check"));

/* ---- 9. the unmatched-article policy (founder 2026-10-06) ------------- */
/* "election_keywords": a story naming no candidate is queued as election_news
   when it is about the election; anything else unmatched is dropped. The
   model-gated "policy_inlet" is still not built, and the runner refuses it
   before reading anything: a switch that silently did nothing would read as
   "no policy news this week". */
check("UNMATCHED_ARTICLE_POLICY is the founder's election_keywords",
  UNMATCHED_ARTICLE_POLICY === "election_keywords", String(UNMATCHED_ARTICLE_POLICY));
const runner = readFileSync(resolve(import.meta.dirname, "news-enqueue.ts"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "");
const guardAt = runner.search(/if \(\(UNMATCHED_ARTICLE_POLICY as string\) === "policy_inlet"\)\s*\{[\s\S]*?process\.exit\(2\)/);
const stdinAt = runner.indexOf("process.stdin");
check("the runner refuses the unbuilt policy_inlet before reading anything",
  guardAt !== -1 && stdinAt !== -1 && guardAt < stdinAt, `guard@${guardAt} stdin@${stdinAt}`);

/* The keyword gate: about the election in so many words, and nothing broader. */
for (const [title, want] of [
  ["Voter registration deadline arrives ahead of Florida homestead exemption vote", true],
  ["What to know about 3 Florida amendments on the ballot before the election", true],
  ["Miami-Dade supervisor of elections denies ICE presence at polls", true],
  ["North Miami voters face mayoral election in November", true],
  ["Pink fire truck tours the city for breast cancer campaign", false],
  ["Arkansas campaign ad sparks backlash", false],
  ["City Council voted to extend the bus route", false],
  ["Hurricane season winds down with no landfall", false],
] as const) {
  check(`isElectionRelated: ${title}`, isElectionRelated({ title, summary: null }) === want);
}
check("isElectionRelated reads the summary too",
  isElectionRelated({ title: "What changes next week", summary: "Early vote sites open Monday." }));

/* Unmatched election stories land on the plan, others don't. */
{
  const p = plan([
    article({ title: "County ballots mailed this week", url: "https://www.wlrn.org/ballots" }),
    article({ title: "New bakery opens downtown", url: "https://www.wlrn.org/bakery" }),
  ]);
  check("an unmatched election story is planned as an election item, other unmatched are not",
    p.elections.length === 1 && p.elections[0].article.url.endsWith("/ballots") && p.counts.unmatched === 2,
    JSON.stringify({ elections: p.elections.length, unmatched: p.counts.unmatched }));
}

/* The election payload: county-scoped from a county outlet, statewide
   otherwise, never a guessed race/candidate/metro, and it parses with the
   real schema (so it can be approved). */
{
  const county = electionPayloadFor(article({ title: "Ballots go out", countyFips: "12086" }), "outlet:wlrn.org");
  const state = electionPayloadFor(article({ title: "Ballots go out", countyFips: null }), "outlet:floridaphoenix.com");
  check("county election payload carries county_fips, not statewide",
    county.county_fips === "12086" && county.statewide === null && county.race_id === null && county.candidate_id === null && county.metro === null && county.relation === null);
  check("statewide election payload is explicitly statewide with no county",
    state.county_fips === null && state.statewide === true);
  check("both election payloads parse with the real ManualNewsPayloadSchema",
    ManualNewsPayloadSchema.safeParse(county).success && ManualNewsPayloadSchema.safeParse(state).success,
    JSON.stringify([ManualNewsPayloadSchema.safeParse(county).error?.issues, ManualNewsPayloadSchema.safeParse(state).error?.issues]));
  check("the schema refuses a story with no scope at all",
    !ManualNewsPayloadSchema.safeParse({ ...state, statewide: null }).success);
  check("the schema refuses statewide plus a narrower scope",
    !ManualNewsPayloadSchema.safeParse({ ...state, county_fips: "12086" }).success);
}

/* The daily cron (news-source-integrity §3.5, D9: recommended, pending the
   founder; it was Mondays and Thursdays from 2026-10-06). TO FLIP: restore
   "0 11 * * 1,4" in vercel.json and here, and set CADENCE_HOURS to 96 in
   src/lib/news-sweep.ts (the Thursday-to-Monday gap), or the depth line keeps
   calling a feed deep that loses stories between runs. verify-news-sweep
   fails until the two agree. */
{
  const vercel = JSON.parse(readFileSync(resolve(import.meta.dirname, "..", "vercel.json"), "utf8"));
  const cron = (vercel.crons ?? []).find((c: { path: string }) => c.path === "/api/cron/news-sweep");
  check("vercel.json runs /api/cron/news-sweep daily at 11:00 UTC", cron?.schedule === "0 11 * * *", JSON.stringify(cron));
  const routeSrc = readFileSync(resolve(import.meta.dirname, "..", "src/app/api/cron/news-sweep/route.ts"), "utf8");
  const routeCode = routeSrc.replace(/\/\*[\s\S]*?\*\//g, "");
  check("the window stays 14 days, so overlap and dedupe are unchanged", /const WINDOW_DAYS = 14;/.test(routeCode));
  const logAt = routeCode.indexOf("console.log(sweep.depthLine)");
  const queueAt = routeCode.indexOf("enqueueIntake(service, sweep.articles)");
  check("the cron logs the depth line once the sweep returns, before queueing can fail",
    logAt !== -1 && queueAt !== -1 && logAt < queueAt, `log@${logAt} queue@${queueAt}`);
  check("both the 200 and the queue-failure 502 carry shallowFeeds",
    (routeCode.match(/shallowFeeds: sweep\.shallowFeeds/g) ?? []).length === 2);
  check("the cron is CRON_SECRET-gated and runs the shared intake",
    /secretEquals\(request\.headers\.get\("authorization"\), `Bearer \$\{secret\}`\)/.test(routeSrc) &&
      /runSweep\(/.test(routeSrc) && /enqueueIntake\(service, sweep\.articles\)/.test(routeSrc));
  const intake = readFileSync(resolve(import.meta.dirname, "..", "src/lib/news-intake.ts"), "utf8");
  check("the intake only ever writes pending review items",
    /status: "pending"/.test(intake) && !/from\("news_item"\)\s*\.insert/.test(intake));
  /* news-source-integrity §3.7: the review_item read is filtered by the
     sweep's URLs, never the whole table, and it has no status filter (any
     status counts; the behaviour is tested below). */
  const intakeCode = intake.replace(/\/\*[\s\S]*?\*\//g, "");
  /* Only readHandled is checked for a status filter: loadBallotRoster (R2)
     rightly filters race_publication by status. */
  const dedupeCode = intakeCode.slice(intakeCode.indexOf("export async function readHandled"),
    intakeCode.indexOf("\nexport ", intakeCode.indexOf("export async function readHandled") + 1));
  check("the dedupe reads review_item by URL, any status",
    dedupeCode.length > 0 && /\.eq\("kind", "manual_news"\)\s*\.in\("payload->>url", chunk\)/.test(dedupeCode) &&
      !/\.in\("status"/.test(dedupeCode),
    "expected .eq(\"kind\", \"manual_news\").in(\"payload->>url\", chunk) and no status filter");
}

/* The queue's dedupe, run for real against an in-memory stand-in for the
   Supabase calls enqueueIntake makes. An election story whose URL an operator
   already handled under a candidate is not queued a second time (2026-10-06:
   matching reads only the capped dek, so a story first matched on a name deep
   in a whole-article description would otherwise come back as county news). */
type Row = Record<string, unknown>;
interface FakeRead { table: string; eq: [string, unknown][]; in: [string, readonly unknown[]][] }
/* Like PostgREST: `payload->>url` reads a JSON field as text, and a response
   holds at most `maxRows` rows (Supabase's "Max rows", 1000 by default), the
   rest dropped without an error. `failOn` makes every read of a table fail. */
function fakeDb(
  tables: Record<string, readonly Row[]>,
  { maxRows = 1000, failOn = {} }: { maxRows?: number; failOn?: Record<string, string> } = {},
) {
  const inserted: Row[] = [];
  const reads: FakeRead[] = [];
  const field = (r: Row, col: string): unknown => {
    const [column, key] = col.split("->>");
    return key === undefined ? r[column] : (r[column] as Row | null | undefined)?.[key];
  };
  const from = (table: string) => {
    const read: FakeRead = { table, eq: [], in: [] };
    const q = {
      select: () => { reads.push(read); return q; },
      eq: (col: string, v: unknown) => { read.eq.push([col, v]); return q; },
      in: (col: string, vs: readonly unknown[]) => { read.in.push([col, vs]); return q; },
      upsert: async () => ({ error: null }),
      insert: async (rows: Row[]) => { inserted.push(...rows); return { error: null }; },
      then: (resolve: (v: { data: Row[] | null; error: { message: string } | null }) => unknown) => {
        if (failOn[table]) return resolve({ data: null, error: { message: failOn[table] } });
        const rows = (tables[table] ?? []).filter((r) =>
          read.eq.every(([c, v]) => field(r, c) === v) && read.in.every(([c, vs]) => vs.includes(field(r, c))));
        return resolve({ data: rows.slice(0, maxRows), error: null });
      },
    };
    return q;
  };
  return { db: { from } as unknown as SupabaseClient, inserted, reads };
}
{
  const profile = ROSTER.map((r) => ({
    candidate_id: r.candidateId, race_id: r.raceId, candidate: { legal_name: r.legalName, ballot_status: "ballot" },
  }));
  const story = article({ title: "County ballots mailed this week", url: "https://www.wlrn.org/ballots-mailed" });
  const handledFor = ROSTER[0].candidateId;

  const fresh = fakeDb({ profile });
  const r1 = await enqueueIntake(fresh.db, [story]);
  check("an unmatched election story with a new URL is queued, pending",
    r1.queued === 1 && fresh.inserted.length === 1 && fresh.inserted[0].status === "pending",
    JSON.stringify({ queued: r1.queued, skipped: r1.skipped }));

  /* The URL-level skip is for election stories only: a story already queued
     for one candidate still reaches a second candidate it names. */
  const both = article({
    title: `${ROSTER[0].legalName} and ${ROSTER[1].legalName} debate`,
    url: "https://www.wlrn.org/debate",
  });
  const queuedFirst = fakeDb({ profile, review_item: [{ kind: "manual_news", status: "pending", payload: { url: both.url, candidate_id: ROSTER[0].candidateId } }] });
  const rb = await enqueueIntake(queuedFirst.db, [both]);
  check("a story queued for one candidate is still queued for a second candidate it names",
    rb.queued === 1 && (queuedFirst.inserted[0]?.payload as { candidate_id?: string })?.candidate_id === ROSTER[1].candidateId,
    JSON.stringify({ queued: rb.queued, skipped: rb.skipped, inserted: queuedFirst.inserted.map((r) => (r.payload as { candidate_id?: string }).candidate_id) }));

  /* A candidate story already published in news_item under that candidate is
     skipped: the news_item read feeds the (url, candidate) keys, not only the
     URL set the election check uses. */
  const solo = article({ title: `${ROSTER[0].legalName} tours the county`, url: "https://www.wlrn.org/tour" });
  const publishedFor = fakeDb({ profile, news_item: [{ url: solo.url, candidate_id: ROSTER[0].candidateId }] });
  const rp = await enqueueIntake(publishedFor.db, [solo]);
  check("a candidate story already published under that candidate is not queued again",
    rp.queued === 0 && rp.skipped === 1 && publishedFor.inserted.length === 0,
    JSON.stringify({ queued: rp.queued, skipped: rp.skipped }));

  for (const [label, tables] of [
    ["rejected under a candidate", { review_item: [{ kind: "manual_news", status: "rejected", payload: { url: story.url, candidate_id: handledFor } }] }],
    ["published under a candidate", { news_item: [{ url: story.url, candidate_id: handledFor }] }],
  ] as const) {
    const f = fakeDb({ profile, ...tables });
    const r = await enqueueIntake(f.db, [story]);
    check(`an election story whose URL was already ${label} is not queued again`,
      r.queued === 0 && r.skipped === 1 && f.inserted.length === 0,
      JSON.stringify({ queued: r.queued, skipped: r.skipped }));
  }
}

/* ---- the dedupe reads, chunked by URL (news-source-integrity §3.7) ------ */
{
  const profile = ROSTER.map((r) => ({
    candidate_id: r.candidateId, race_id: r.raceId, candidate: { legal_name: r.legalName, ballot_status: "ballot" },
  }));
  const story = article({ title: "County ballots mailed this week", url: "https://www.wlrn.org/ballots-mailed" });

  /* Any status counts: approved and pending are skipped like rejected. */
  for (const status of ["approved", "pending"] as const) {
    const f = fakeDb({ profile, review_item: [{ kind: "manual_news", status, payload: { url: story.url, candidate_id: null } }] });
    const r = await enqueueIntake(f.db, [story]);
    check(`an election story already ${status} is not queued again`,
      r.queued === 0 && r.skipped === 1 && f.inserted.length === 0, JSON.stringify({ queued: r.queued, skipped: r.skipped }));
  }

  /* Past the response cap: 1,500 decided items, the match last. The old
     unfiltered read got the first 1,000 and queued the story a second time. */
  const decided: Row[] = Array.from({ length: 1500 }, (_, i) => ({
    kind: "manual_news",
    status: i % 2 === 0 ? "approved" : "rejected",
    payload: { url: `https://www.wlrn.org/older-${i}`, candidate_id: null },
  }));
  decided[1499] = { kind: "manual_news", status: "rejected", payload: { url: story.url, candidate_id: null } };
  const big = fakeDb({ profile, review_item: decided });
  const rBig = await enqueueIntake(big.db, [story]);
  check("with 1,500 decided items and the match last, the story is still skipped",
    rBig.queued === 0 && rBig.skipped === 1 && big.inserted.length === 0,
    JSON.stringify({ queued: rBig.queued, skipped: rBig.skipped }));

  /* 450 election stories: every read is filtered by URL, chunked, and the
     chunks cover exactly the stories' URLs. */
  const many = Array.from({ length: 450 }, (_, i) =>
    article({ title: `County ballots mailed this week, part ${i}`, url: `https://www.wlrn.org/2026/10/08/ballots-mailed-${i}` }));
  const wide = fakeDb({ profile });
  const rWide = await enqueueIntake(wide.db, many);
  const reviewReads = wide.reads.filter((r) => r.table === "review_item");
  const newsReads = wide.reads.filter((r) => r.table === "news_item");
  const urlsOf = (reads: FakeRead[], col: string) =>
    reads.flatMap((r) => r.in.filter(([c]) => c === col).flatMap(([, vs]) => vs as string[]));
  const wanted = many.map((a) => a.url).sort().join("\n");
  check("all 450 new election stories are queued", rWide.queued === 450, String(rWide.queued));
  check("every review_item read is manual_news filtered by payload->>url, with no status filter",
    reviewReads.length > 1 && reviewReads.every((r) =>
      r.eq.length === 1 && r.eq[0][0] === "kind" && r.eq[0][1] === "manual_news" &&
      r.in.length === 1 && r.in[0][0] === "payload->>url"),
    JSON.stringify(reviewReads.map((r) => ({ eq: r.eq, in: r.in.map(([c, vs]) => [c, vs.length]) }))));
  check("every read carries at most DEDUPE_CHUNK URLs",
    [...reviewReads, ...newsReads].every((r) => r.in.every(([, vs]) => vs.length <= DEDUPE_CHUNK)));
  check("the review_item chunks cover exactly the stories' URLs",
    urlsOf(reviewReads, "payload->>url").sort().join("\n") === wanted);
  check("the news_item reads use the same chunks",
    newsReads.length === reviewReads.length && urlsOf(newsReads, "url").sort().join("\n") === wanted);

  /* A read error throws, and nothing is queued. */
  for (const table of ["news_item", "review_item"]) {
    const f = fakeDb({ profile }, { failOn: { [table]: "simulated outage" } });
    let message = "";
    try {
      await enqueueIntake(f.db, [story]);
    } catch (err) {
      message = (err as Error).message;
    }
    check(`a failed ${table} read throws instead of queueing`,
      message.includes(table) && message.includes("simulated outage") && f.inserted.length === 0,
      JSON.stringify({ message, inserted: f.inserted.length }));
    /* The message names the failing chunk: its size and its longest URL, so
       a request too long for the gateway (a 414 from one oversized URL in a
       chunk of its own) is quick to find in the cron's 502. */
    check(`a failed ${table} read names the chunk's size and longest URL`,
      message.includes("1 URL") && message.includes(story.url) && message.includes(`${story.url.length} chars`),
      message);
  }
}

/* chunkUrls on its own: the count bound, the size bound, order, and a URL too
   long for any chunk still gets one. */
{
  const short = Array.from({ length: 450 }, (_, i) => `https://a.b/${i}`);
  const byCount = chunkUrls(short, { maxChars: Infinity });
  check("chunkUrls: 450 URLs with no size bound make chunks of 200, 200, 50",
    byCount.map((c) => c.length).join(",") === "200,200,50", byCount.map((c) => c.length).join(","));
  check("chunkUrls keeps every URL in order", byCount.flat().join(",") === short.join(","));
  const longUrls = Array.from({ length: 400 }, (_, i) => `https://www.example-news-outlet.com/news/politics/elections/2026/10/08/a-long-headline-slug-that-goes-on-for-a-while-to-reach-one-seventy-${i}`);
  const bySize = chunkUrls(longUrls);
  /* What each URL adds to the query string: form-encoded, plus a comma and
     two quotes (the same allowance chunkUrls makes). */
  const encoded = (c: string[]) =>
    c.reduce((n, u) => n + new URLSearchParams([["", u]]).toString().length - 1 + 9, 0);
  check("chunkUrls: long URLs make chunks of at most DEDUPE_CHUNK_CHARS encoded characters",
    bySize.length > 2 && bySize.every((c) => c.length < DEDUPE_CHUNK && encoded(c) <= DEDUPE_CHUNK_CHARS) &&
      bySize.flat().join(",") === longUrls.join(","),
    bySize.map((c) => `${c.length}:${encoded(c)}`).join(","));
  const huge = `https://www.wlrn.org/${"x".repeat(7_000)}`;
  const alone = chunkUrls(["https://www.wlrn.org/a", huge, "https://www.wlrn.org/b"], { maxChars: 6_000 });
  check("chunkUrls: a URL longer than the size bound gets a chunk of its own",
    alone.length === 3 && alone[1].length === 1 && alone[1][0] === huge, alone.map((c) => c.length).join(","));
  const first = chunkUrls([huge, "https://www.wlrn.org/a"], { maxChars: 6_000 });
  check("chunkUrls: an oversized first URL makes no empty chunk ahead of it",
    first.length === 2 && first[0].length === 1 && first[0][0] === huge, first.map((c) => c.length).join(","));
  check("chunkUrls: nothing in, nothing out", chunkUrls([]).length === 0);
}

/* The size bound against the real client: supabase-js builds each read's
   GET URL, captured here before it would leave the machine. Every request
   stays under 8 KB, including URLs that postgrest-js must quote. */
{
  const requested: string[] = [];
  const client = createClient("https://example.supabase.co", "offline-test-key", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (async (input: string | URL | Request) => {
        requested.push(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
        return new Response("[]", { status: 200, headers: { "content-type": "application/json" } });
      }) as typeof fetch,
    },
  });
  const urls = Array.from({ length: 400 }, (_, i) =>
    `https://www.example-news-outlet.com/news/politics/elections/2026/10/08/headline-with-commas,and(parens)-${i}-${"y".repeat(90)}`);
  const handled = await readHandled(client, urls);
  const longest = Math.max(...requested.map((u) => u.length));
  check("readHandled through supabase-js sends two reads per chunk", requested.length === chunkUrls(urls).length * 2,
    `${requested.length} requests for ${chunkUrls(urls).length} chunks`);
  check("every dedupe request URL stays under 8 KB", longest <= 8192, `longest ${longest} characters`);
  check("the review_item request filters payload->>url",
    requested.some((u) => u.includes("/rest/v1/review_item?") && u.includes("payload-%3E%3Eurl=in.")));
  check("an empty answer is nothing handled", handled.keys.size === 0 && handled.urls.size === 0);
}

if (failures > 0) {
  console.error(`\nverify-news-enqueue: ${failures} failure(s)`);
  process.exit(1);
}
console.log(
  "verify-news-enqueue: OK — the relation tier reaches the payload for both tiers, every payload parses with the real ManualNewsPayloadSchema, off-list articles are dropped, unmatched election stories are queued as election_news and the rest dropped",
);
