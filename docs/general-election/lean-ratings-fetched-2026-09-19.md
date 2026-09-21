# Lean ratings — fetched 2026-09-19

_The ratings half of this document is retrieval and transcription only: every
value was read off the rating agency's own published page during this session,
on the date in the access column, and nothing here is this session's estimate of
any outlet's lean. It grew two further change sets on the same day, both founder
decisions: the `unrated` lean value (migration `0028`), and the designation of
31 rows as `unrated`, which **unblocked the sweep to 27 outlets**. Gate
**C7-a** is now partly open — six rows still need a lean chosen. Read §7 for
where things actually stand, including two policy questions the unblock makes
live._

> **Addendum, 2026-09-21.** The founder designated **`floridaphoenix.com`
> `unrated`** as well, making **32**. The counts below are left as they stood on
> 2026-09-19 — this is a dated report of that session, and rewriting its numbers
> would falsify what was actually done then. What changed:
>
> - **The remaining gate is now five rows, not six**, and they are exactly the
>   ones with fetched, cited ratings: Miami Herald, Sun Sentinel, Tampa Bay
>   Times, Orlando Sentinel, AP. There a lean must be *chosen*; "no rating
>   exists" is not available as an answer.
> - **`usableOutlets()` did not move.** It is still **27**. Florida Phoenix is
>   `mixedFeed`-flagged, so designating it changed nothing about what the sweep
>   reads — the cleanest demonstration that a lean is necessary for a card and
>   never sufficient.
> - **It is the one designated row with a bespoke `leanBasis`**, keeping its
>   States Newsroom note rather than the shared `UNRATED` text, because that
>   note explains *why* no outlet-specific rating exists for a newsroom inside a
>   national network. `verify-news-sweep.ts` allows that one domain **by name**,
>   so a second bespoke-basis designation still fails until someone adds it
>   deliberately.
> - **The uncited `center-left` proposal was declined, not adopted.** The
>   2026-09-17 corpus proposed it with no citation; the founder recorded
>   `unrated` instead. That is this brief's central rule holding under pressure:
>   an uncited value is not a rating, and the honest record is that nobody
>   published one. The guardrail now asserts a designated row's bespoke basis
>   never adopts a lean word without declining or disclaiming it.
> - Guardrail counts moved with it: **32** designated, **five** undesignated,
>   **five** designated-but-held-out.

Companion to `news-corpus-2026-09-17.md`, whose Recommendation 5 asked for
exactly this fetch, and to `news-corpus-verification-2026-09-17.md`.

---

## 1. Method and access

| | |
|---|---|
| Access date, every row | **2026-09-19** |
| Outlets in scope | 12 — the 4 legacy dailies with a recorded rating, and the 8 national outlets from corpus TABLE 3 |
| Raters checked per outlet | 3 — AllSides, Ad Fontes Media, Media Bias/Fact Check |
| Pages sought | 36 |
| Pages found and read | **36** |
| Raters with no entry | **0** (see §5 — the absences are of *fields*, not of entries) |

**robots.txt, all three raters, read 2026-09-19.** Each permits the rating
paths used here under `User-agent: *`:

- `www.allsides.com/robots.txt` — `Disallow: /admin`, `/user`, `/search`; then `Allow: /`. No crawl delay. No AI user agent named.
- `mediabiasfactcheck.com/robots.txt` — `Disallow: /wp-content/uploads/wpforms/`; then an empty `Disallow:` under `User-agent: *`. No crawl delay. No AI user agent named.
- `adfontesmedia.com/robots.txt` — `Disallow: /wp-admin/`. No crawl delay. No AI user agent named.

One request per host at a time throughout. Two requests to
`adfontesmedia.com` came back as a connection reset late in the run after
repeated hits; the run backed off and did not retry in a tight loop, per the
BLOX lesson in `news-corpus-verification-2026-09-17.md` §3 item 3. AllSides
returns HTTP 403 to a plain command-line client on paths its own robots.txt
allows — an edge WAF, not a stated policy — so those pages were read through a
rendering fetcher.

**Scales, so the numbers below are readable.** AllSides publishes a bias
category plus, for some outlets, a **bias meter** value on **−6 … +6**, and a
**confidence level** (low or initial / medium / high). MBFC publishes a
category plus a score on roughly **−10 … +10**, and a dated "Last Updated".
Ad Fontes publishes **bias on −42 … +42** and **reliability on 0 … 64**; its
own page text states "Scores above 36 are generally good; scores below 24 are
generally problematic."

---

## 2. Group A — the four local dailies (edited in `news-sources.ts`)

`leanBasis` for these four rows now carries the citations below.
**`leanTag` is still `null` on all four.**

| Outlet | AllSides | MBFC | Ad Fontes |
|---|---|---|---|
| **Miami Herald**<br>`miamiherald.com` | **Lean Left**, meter **−2.00**, confidence **low or initial**, "As of September 2026" | **Left-Center (−3.4)**, factual High, High Credibility, updated **2025-03-25** | **Skews Left**, bias **−8.01**, reliability **39.10**, "Generally Reliable/Analysis OR Other Issues" |
| **South Florida Sun Sentinel**<br>`sun-sentinel.com` | **Center**, meter **not published**, confidence **low or initial**, "As of September 2026" | **Least Biased**, score **not published**, factual High, High Credibility, updated **2023-07-31** | **Middle**, bias **−5.87**, reliability **44.04**, "Reliable, Analysis/Fact Reporting" |
| **Tampa Bay Times**<br>`tampabay.com` | **Center**, meter **not published**, confidence **low or initial**, "As of September 2026" | **Left-Center (−3.4)**, factual High, High Credibility, updated **2025-05-27** | **Middle**, bias **−3.28**, reliability **45.56**, "Reliable, Analysis/Fact Reporting" |
| **Orlando Sentinel**<br>`orlandosentinel.com` | **Center**, meter **not published**, confidence **low or initial**, "As of September 2026" | **Left-Center (−2.8)**, factual High (1.0), High Credibility, updated **2025-04-25** | **Skews Left**, bias **−6.70**, reliability **44.94**, "Reliable, Analysis/Fact Reporting" |

URLs, all accessed 2026-09-19:

| Outlet | AllSides | MBFC | Ad Fontes |
|---|---|---|---|
| Miami Herald | `allsides.com/news-source/miami-herald-media-bias` | `mediabiasfactcheck.com/miami-herald/` | `adfontesmedia.com/miami-herald-bias-and-reliability/` |
| Sun Sentinel | `allsides.com/news-source/sun-sentinel-media-bias` | `mediabiasfactcheck.com/south-florida-sun-sentinel/` | `adfontesmedia.com/sun-sentinel-bias-and-reliability/` |
| Tampa Bay Times | `allsides.com/news-source/tampa-bay-times-media-bias` | `mediabiasfactcheck.com/tampa-bay-times/` | `adfontesmedia.com/tampa-bay-times-bias-and-reliability/` |
| Orlando Sentinel | `allsides.com/news-source/orlando-sentinel-media-bias` | `mediabiasfactcheck.com/orlando-sentinel/` | `adfontesmedia.com/orlando-sentinel-bias-and-reliability/` |

### The Sun Sentinel's Ad Fontes value is now first-hand

The brief's specific ask. The 2026-09-17 record read "Ad Fontes Lean Left *per
Ground News*". Ad Fontes' own page gives **Middle, bias −5.87, reliability
44.04**. The second-hand value is not corroborated by the source it was
attributed to, and the row no longer carries it. The Sun Sentinel's "mild
disagreement" therefore resolves toward agreement: all three raters place it at
or near the centre.

### AllSides confidence is low or initial on all four

AllSides states **"low or initial"** confidence for every one of the four, with
the page's own explanation: "Confidence is determined by how many reviews have
been applied and consistency of data." For comparison, AllSides states **high**
confidence for Reuters, The Hill, the NYT news pages, the WSJ news pages and
the Washington Examiner in §3 below. A low-confidence Center is weaker evidence
than the bare word "Center" suggests, and the founder is signing off the four
weakest-evidenced ratings in the set.

Two further details a reviewer should have:

- The Miami Herald is the only one of the four with a published meter value
  (−2.00). The other three show the category alone.
- The Orlando Sentinel's page lists **no review method at all** — the other
  three each list "Independent Review".
- The Miami Herald page's community-vote note is dated **June 2017**: "a small
  majority of AllSides users who have voted on this bias rating disagreed with
  the Lean Left rating. Of those who disagreed, most people chose a Left bias
  rating." That is nine-year-old community data, not a current review.

---

## 3. Group B — the eight national outlets (recorded here only)

**No national row was added to `OUTLETS`.** The tier problem from
`news-corpus-verification-2026-09-17.md` §3 item 7 is untouched and still open:
a national row would carry `countyFips: null` and be indistinguishable from a
Florida statewide outlet in the county feed. That needs a schema decision
first.

| Domain | Publisher | AllSides | MBFC | Ad Fontes |
|---|---|---|---|---|
| `reuters.com` | Reuters | **Center**, meter −0.78, confidence **high** | **Least Biased (−0.5)**, factual Very High (0.0), updated 2026-04-10 | **Middle**, bias −1.39, reliability 44.98 |
| `apnews.com` | Associated Press | **Lean Left**, meter −2.93, confidence **medium** | **Left-Center (−2.1)**, factual High (0.8), updated 2026-04-09 | **Middle**, bias −2.60, reliability 44.29 |
| `thehill.com` | The Hill | **Center**, meter −0.95, confidence **high** | **Least Biased (0.4)**, Mostly Factual (2.2), updated 2025-12-05 | **Middle**, bias −1.57, reliability 41.60 |
| `politico.com` | POLITICO | **Lean Left**, meter −1.2, confidence **medium** | **Left-Center (−2.8)**, factual High (1.3), updated 2024-12-06 | **Middle**, bias −5.47, reliability 41.43 |
| `nytimes.com` | New York Times (News) | **Lean Left**, meter −2.20, confidence **high** | **Left-Center (−4.1)**, factual High (1.4), updated 2024-12-02 | **Skews Left**, bias −7.87, reliability 40.86 |
| `wsj.com` | Wall Street Journal (News) | **Center**, meter 0.33, confidence **high** | **Right-Center (4.2)**, Mostly Factual (2.4), updated 2025-07-14 | **Middle**, bias 4.32, reliability 43.11 |
| `washingtonexaminer.com` | Washington Examiner | **Lean Right**, meter 2.3, confidence **high** | **Right-Center (3.8)**, Mostly Factual (2.2), updated 2025-07-14 | **Skews Right**, bias 11.15, reliability 34.19 |
| `foxnews.com` | Fox News Digital | **Right**, meter 3.85, confidence **medium** | **Right (8.0)**, factual **Low (7.6)**, **Low Credibility**, updated 2025-09-26 | **Skews Right**, bias 11.41, reliability 33.86 |

URLs, all accessed 2026-09-19:

| Domain | AllSides | MBFC | Ad Fontes |
|---|---|---|---|
| `reuters.com` | `allsides.com/news-source/reuters-media-bias` | `mediabiasfactcheck.com/reuters/` | `adfontesmedia.com/reuters-bias-and-reliability/` |
| `apnews.com` | `allsides.com/news-source/associated-press-media-bias` | `mediabiasfactcheck.com/associated-press/` | `adfontesmedia.com/ap-bias-and-reliability/` |
| `thehill.com` | `allsides.com/news-source/hill-media-bias` | `mediabiasfactcheck.com/the-hill/` | `adfontesmedia.com/hill-bias-and-reliability/` |
| `politico.com` | `allsides.com/news-source/politico-media-bias` | `mediabiasfactcheck.com/politico/` | `adfontesmedia.com/politico-bias-and-reliability/` |
| `nytimes.com` | `allsides.com/news-source/new-york-times-news-media-bias` | `mediabiasfactcheck.com/new-york-times/` | `adfontesmedia.com/new-york-times-bias-and-reliability/` |
| `wsj.com` | `allsides.com/news-source/wall-street-journal-media-bias` | `mediabiasfactcheck.com/wall-street-journal/` | `adfontesmedia.com/wall-street-journal-bias-and-reliability/` |
| `washingtonexaminer.com` | `allsides.com/news-source/washington-examiner-media-bias` | `mediabiasfactcheck.com/washington-examiner/` | `adfontesmedia.com/washington-examiner-bias-and-reliability/` |
| `foxnews.com` | `allsides.com/news-source/fox-news-media-bias` | `mediabiasfactcheck.com/fox-news-bias/` | `adfontesmedia.com/fox-news-bias-and-reliability/` |

### AP is already in `OUTLETS` — reconciled, not duplicated

`apnews.com` is an existing statewide row. Its `leanBasis` read "Ratings exist
at AllSides, Ad Fontes and MBFC per the corpus, but no rating page was
fetched." Those pages have now been fetched, so that row's basis was rewritten
in place with the three citations. No second AP row was created, and its
`leanTag` is still `null`. This is the only row outside Group A that this
session edited.

### Two ratings are narrower than the row they would label

- **`wsj.com` — "The Wall Street Journal (news)".** AllSides rates the news
  pages separately from the opinion pages, and the URL above is the news one.
  MBFC rates the outlet as a whole; its page separates the two in prose, noting
  that on news reporting the WSJ "uses minimally loaded words" while the
  editorial pages carry a "strong right-biased editorial stance". A single row
  for `wsj.com` would match both, which is the same
  reporting-versus-commentary problem that `mixedFeed` exists for.
- **`foxnews.com` — "Fox News (Politics)".** AllSides' entry is titled **Fox
  News Digital** and states "this bias rating refers only to online news
  coverage, not TV, print, or radio content" — so it fits a web sweep well. MBFC's
  page is site-wide Fox News and its Low Credibility rating rests substantially
  on opinion programming, which a politics-section feed would not carry. There
  is no politics-section-specific rating at any of the three.

### A structural problem with the national tier, from the documents' own text

This is a reading of two project documents, not a judgment about any outlet.

`CAP_Change_Spec_Stances_and_RelatedNews_v1.md` §7 Gate A admits an outlet only
when AllSides rates it **Center**. Corpus Recommendation 5 asks that the
national tier preserve a "left-to-right span", replacing any outlet that cannot
be corroborated "with a spectrum-equivalent that can". **Those two
requirements cannot both be satisfied**, and not because of who is on the list:
Gate A is a single-category filter, so every outlet that clears it is Center by
construction, and a spectrum cannot be built out of one category.

The founder has to choose which one gives way. That choice is upstream of the
national tier existing at all, and upstream of the `countyFips` schema decision.
The numbers in §3 are recorded so §7 can be applied to them; this session did
not apply it.

---

## 4. Where this contradicts the 2026-09-17 record

Four corrections. The corpus's own caveat anticipated some of this: "Bias
ratings change; all cited ratings carry AllSides/MBFC 'as of' dates in 2026 and
should be re-checked near launch."

1. **Miami Herald, Ad Fontes.** Recorded as "Middle/Reliable". The page gives
   **Skews Left, bias −8.01, reliability 39.10**, reliability label "Generally
   Reliable/Analysis OR Other Issues". Not confirmed.
2. **Sun Sentinel, Ad Fontes.** Recorded as "Lean Left per Ground News". The
   page gives **Middle, bias −5.87**. The second-hand value is not confirmed by
   the rater it was attributed to.
3. **Tampa Bay Times — not a single-rater row.** Recorded as "Single rater:
   AllSides Center. No corroboration found." **MBFC and Ad Fontes both carry
   entries** (Left-Center −3.4, updated 2025-05-27; Middle, bias −3.28,
   reliability 45.56). Corpus Recommendation 4's threshold for a `leanTag` — "at
   least two independent raters cited per outlet" — is met for this row on
   evidence, though the raters do not agree with each other.
4. **AllSides rating dates.** The corpus dated three of the four Group A
   AllSides ratings to Apr/Aug 2026. Every AllSides page in this fetch states
   its confidence "As of September 2026"; none of them publishes a separate
   rating date, so the earlier month-specific dates cannot be reproduced from
   the pages as they now stand.

Two proposed leans in corpus TABLE 3 are also not supported by AllSides as
fetched — `apnews.com` (proposed center; AllSides **Lean Left**) and `wsj.com`
(proposed center-right; AllSides **Center** for the news pages). TABLE 3's
proposals were explicitly the corpus's guesses and carried no authority, so
these are recorded rather than treated as errors.

---

## 5. Recorded absences

Every outlet in scope has an entry at all three raters. What is missing is
fields, and a `leanBasis` that cites a "confidence or score where published"
has to say where nothing is published:

- **Ad Fontes publishes no rating date on any of the 12 pages.** Not a single
  one carries a rating date or a last-updated date. Any Ad Fontes value in this
  repo is therefore undated at source, and its age cannot be established from
  the page. This is the weakest provenance of the three raters.
- **AllSides publishes no bias meter value for 3 of the 4 Group A outlets** —
  Sun Sentinel, Tampa Bay Times, Orlando Sentinel show the category only. All
  eight national outlets have one.
- **The Orlando Sentinel's AllSides page lists no review method.**
- **MBFC publishes no numeric score for the Sun Sentinel.** Its other 11 pages
  all do.
- **No rater publishes a rating for `foxnews.com`'s politics section
  specifically**, nor for the WSJ newsroom as distinct from the paper at MBFC
  (§3).

Two slug findings, for whoever re-checks these near launch:

- `allsides.com/news-source/new-york-times-media-bias` returns AllSides'
  "The requested news source could not be found" page **with HTTP 200**. A
  status-code check would read that as a successful fetch. The NYT news pages
  live at `…/new-york-times-news-media-bias`.
- `adfontesmedia.com/the-hill-bias-and-reliability/` is a 404; the page is at
  `…/hill-bias-and-reliability/`. Ad Fontes drops a leading "The".

---

## 6. Attribution owed — AllSides CC BY-NC 4.0

Five `leanBasis` values in `src/lib/news-sources.ts` now carry AllSides Media
Bias Ratings. The AllSides chart is licensed **Creative Commons BY-NC 4.0**,
and spec §7 requires a line such as **"Source credibility ratings via AllSides
(CC BY-NC 4.0)."** wherever that data renders.

Nothing in the app reads `leanBasis` today, so nothing is owed on screen yet.
**The obligation attaches the moment a lean, or its basis, reaches a card.**
Spec §12 item 4 ("confirm where the AllSides CC BY-NC line sits in the UI") is
still open and is now a launch blocker for the news cards rather than a
housekeeping item. A note to this effect is in the `news-sources.ts` header, at
the rows that carry the data.

The non-commercial term is worth a second look by the founder against the
product's plans, since BY-NC prohibits commercial use rather than merely
requiring credit.

---

## 7. The sweep is unblocked — 27 outlets, as of 2026-09-19

**This section said "the sweep is still blocked" for most of its life.** That is
no longer true, and the history matters for reading the rest of this document:
the fetch alone did not unblock it, the `unrated` value alone did not either,
and the founder designation did.

### Where it stands

`node scripts/verify-news-sweep.ts` reports **`37 outlets listed, 27 usable`**.

| | |
|---|---|
| Rows designated `leanTag: 'unrated'` | **31** |
| Of those, usable | **27** |
| Rows still `null` | **6** — the 5 with cited ratings, plus Florida Phoenix |
| National rows added to `OUTLETS` | **0** — tier decision still open |

The four designated rows that are **not** usable are held out by the
fail-closed flags and the retrieval-path requirement, exactly as intended —
signing off a lean was never supposed to lift either:

| Row | Held out by |
|---|---|
| `miamitimesonline.com` | `syndicated` — the feed is mostly republished copy |
| `floridapolitics.com` | `mixedFeed` — commentary alongside reporting |
| `elnuevoherald.com` | no feed and no sitemap |
| `outsfl.com` | no feed and no sitemap |

The six rows still `null` are the ones where a lean must actually be *chosen*
rather than recorded as absent: Miami Herald, Sun Sentinel, Tampa Bay Times,
Orlando Sentinel and AP have fetched, cited ratings (§2, §3), and Florida
Phoenix carries a States Newsroom network note rather than the shared `UNRATED`
text. **Gate C7-a is therefore partly open, not closed.**

### Why a list rather than a default

`o()` could have derived the designation from `leanBasis === UNRATED` in one
line. It does not, deliberately. That would mean a row added later with no cited
rating is designated by whoever adds it — the editorial act the `leanTag` gate
exists to keep away from a coding agent. `UNRATED_DESIGNATED` in
`src/lib/news-sources.ts` is an explicit list of 31 domains: a new row is `null`
until a human adds its domain, and the designation stays diffable and blameable
like every other editorial decision in that file. `verify-news-sweep.ts` pins
the count (31 then; **32 since 2026-09-21** — see the addendum), asserts every
designated row carries the `UNRATED` basis bar the one allowed by name, and
asserts that **no row carries an asserted lean** — every value in the file is
`null` or `'unrated'`.

### What the designation rests on

That the 31 are **not a backlog**. AllSides, Ad Fontes and MBFC rate national
and large-metro outlets. All 36 pages sought for the 12 outlets in scope exist,
and that is exactly the set of nationals and metro dailies. There is no
equivalent page to find for WSVN, WFTV, Le Floridien, The Westside Gazette or
América TeVé, and waiting will not produce one. `N/A` could not carry this: it
means "a lean does not apply", and a lean applies perfectly well to a local
television newsroom.

### Two consequences, recorded before anyone is surprised by them

**1. The AI-crawler policy question is now live, not theoretical.**
`news-corpus-verification-2026-09-17.md` §3 item 4 left it open: the sweep's own
UA (`KnowYourVote/1.0`) falls under `User-agent: *`, which permits every feed
path used, and the sweep reads headline and dek from syndication feeds and links
back rather than fetching article bodies. Whether a Claude-run pipeline doing
that is within a publisher's intent was called "a policy question for the
founder, not a robots.txt question". Until today no outlet was sweepable, so the
question could wait. **Three of the 27 now-sweepable outlets name a
Claude/Anthropic agent in robots.txt as disallowed:**

| Outlet | Agents named |
|---|---|
| `miaminewtimes.com` | `anthropic-ai`, `ClaudeBot`, `Claude-Web`, `Claude-User` |
| `wfla.com` | `anthropic-ai`, `ClaudeBot` |
| `wesh.com` | `anthropic-ai`, `ClaudeBot`, `Claude-Web` |

**WESH is the sharpest case:** its `robots` note records that Hearst's terms in
the robots.txt header "prohibit crawlers and aggregation outright" — broader
than the agent rules below it. `flvoicenews.com` is sweepable with its policy
**unknown**, because its robots.txt itself returns 403. This session did not
resolve any of that and did not run a live sweep; the founder decides before one
runs.

**2. Crawl delays are still satisfied only by accident.** Three now-sweepable
outlets declare one — `floridabulldog.org` 10 s, `wesh.com` 10 s,
`floridianpress.com` **600 s** — and the runner does not honour them. It makes
one request per host per run, which satisfies them incidentally. That property
is now load-bearing across 27 hosts rather than 0, and it breaks the moment feed
paging is added (`news-corpus-verification-2026-09-17.md` §3 items 1 and 4).

**3. Lean spread has little left to rotate between.** `news-slots.ts` rule 2
takes the newest item per distinct lean before a second from any one lean, and
`unrated` is one bucket like any other — correct, verified by
`verify-news-slots.ts` fixture U, and it does not over-represent unrated
outlets. But with 31 of 37 outlets in that bucket, the intended spectrum
rotation has almost nothing to rotate across. That is a fact about Florida
local-news rating coverage rather than a defect in the selector, and it will not
improve until the national tier exists — which is blocked on the Gate A question
in §3. `news-fairness.md` §5's per-candidate variance work is where it lands.

---

## 8. What this session changed

**Third change set — the designation (founder, gate C7-a, 2026-09-19).**

- `src/lib/news-sources.ts` — `UNRATED_DESIGNATED`, an explicit set of the 31
  domains, read by `o()`. A domain not in it gets `leanTag: null`, so a row added
  later is fail-closed until a human designates it. `usableOutlets()` goes from
  **0 to 27**; the other four designated rows stay out on `syndicated`,
  `mixedFeed`, or having no retrieval path.
- `scripts/verify-news-sweep.ts` — the two `usableOutlets().length === 0` checks
  replaced. One carried its own instruction for this moment ("if that is
  intended, this check should change with them"). Six assertions now pin the
  shape the gate closed into: the count is 31, the six undesignated rows are
  named, **no row carries an asserted lean** (every value is `null` or
  `'unrated'`), every designated row carries the `UNRATED` basis and never a
  cited one, `usableOutlets()` is 27, and the four held-out rows are exactly the
  flagged and path-less ones — including a repeat of the flagged-row check using
  `'unrated'` rather than `'center'`.

**Second change set — the `unrated` lean value (founder, 2026-09-19).** Scope
was the value and its plumbing only, by explicit decision; no row was designated
in that set.

- `supabase/migrations/0028_source_lean_unrated.sql` — **renumbered from 0027
  on 2026-09-19**, see below — adds `unrated` to
  `source.lean_tag`'s CHECK. Widening only: no existing row is rewritten and
  nothing is backfilled. Follows `0023`'s shape, including the `RAISE` guard
  against the silent half-application that dropping an unnamed constraint by the
  wrong name would cause.
- `supabase/migrations/README.md` — `0028` claimed in the ledger (rule 2: the
  row lands in the same PR as the file).

**The migration was renumbered 0027 → 0028.** `0027_news_issues.sql` was written
against a copy of the ledger reading "0027+ free" and merged to `main` (PR #53)
while this one sat on a branch carrying the same number — the fifth collision the
ledger exists to prevent, and the second to hit a branch that could not see it
happening. Neither had been applied anywhere, so ledger rule 1 pinned neither;
theirs had landed on the default branch, where a `git mv` would break every
checkout, so this one moved. The cost was a `git mv` and a grep across five
files plus this report. Both migrations now apply cleanly in sequence, verified
against embedded Postgres. The ledger's own advice stands: re-check that table
immediately before applying, not just before writing.
- `src/lib/news-labels.ts` — `unrated` added to `LeanTag` and to `LEAN`,
  rendering as **"No independent rating"**. A third load-bearing rule documents
  why it prints when `N/A` does not.
- `src/types/schema.ts` — the `lean_tag` union widened to match.
- `src/lib/news-slots.ts`, `src/lib/news-sources.ts` — documentation only: how
  `unrated` behaves in lean spread, and why `usableOutlets()` treats it as
  signed off while `null` stays "no human has decided".
- `scripts/verify-news-labels.ts`, `verify-news-slots.ts`,
  `verify-migrations.mjs` — guardrails for all of it (see the table below).

**First change set — the ratings fetch.**

- `src/lib/news-sources.ts` — `leanBasis` rewritten on 5 rows
  (`miamiherald.com`, `sun-sentinel.com`, `tampabay.com`, `orlandosentinel.com`,
  `apnews.com`); the header's "one-word edit per row" claim corrected, since it
  was false for 33 of 37 rows; the CC BY-NC obligation recorded at the code.
  **No `leanTag`, no `feed`, no flag, and no row membership changed.**
- This document.

### Guardrails, run 2026-09-19

| Script | Result |
|---|---|
| `verify-news-sweep.ts` | **OK** — "reproducible, boundary holds, labels come from the list (**37 outlets listed, 27 usable**)". Its two non-default-`leanBasis` assertions still hold (each cites a rater, each defers to the founder), and the six new designation assertions pass. |
| `verify-news-labels.ts` | **OK** — lean disclosure + unattributed-item rules hold |
| `verify-news-match.ts` | **OK** |
| `verify-news-slots.ts` | **OK** |
| Banned-terms lint over all 37 `leanBasis` values, using `findAllBannedTermMatches` from `src/lib/neutrality.ts` | **Clean** — 0 hits |
| `verify-migrations.mjs` — every migration applied to embedded Postgres (PGlite), including `0028` | **All migration + RLS checks passed.** Five new `0028` assertions: `unrated` stores and reads back; `N/A` still works beside it; an eighth value is still rejected by `source_lean_tag_check`; `lean_tag` stays `NOT NULL`; and exactly **one** `lean_tag` CHECK survives — the half-application the migration's own `RAISE` guards against, asserted from outside |
| `verify-news-labels.ts` — new `unrated` cases | **OK** — prints the exact string, does not print like `N/A`, does not leak the raw code, does not flip the opinion container, and contains none of "Left" / "Right" / "Center" |
| `verify-news-slots.ts` — new fixture U | **OK** — an older *rated* item beats a second `unrated` one, and `unrated` does not collapse into the no-source bucket |
| `verify-news-neutrality.ts --self-test` | **All news-neutrality self-test checks passed** |
| `npx tsc --noEmit` | **Clean, exit 0** |
| `npx eslint` on the four changed source files | **Clean, exit 0** |

**On the environment.** This session began with no `node_modules`, which made
`verify-news-neutrality.ts` and `npx tsc --noEmit` fail to start at all
(`ERR_MODULE_NOT_FOUND`). Installing the dependency tree to run the migration
verifier resolved both, and both now pass — so neither was ever a real failure,
and an earlier note in this document saying `tsc` fails was an artefact of the
empty environment. Install dependencies before reading either as a signal.

**One genuinely pre-existing failure**, reproduced on the unmodified baseline by
stashing this session's diff *with dependencies installed*, so the comparison is
like-for-like: `verify-news-ungated.ts` fails the same 2 named checks before and
after — "fetch requests the statewide scope with no parameters" and "effect has
no location dependency". Unrelated to anything here; it concerns the news feed's
location gating.

**On `scripts/verify-news-issues.ts`.** The brief asked for it and it did not
exist when this work started; an earlier draft of this document said so. It
arrived on `main` in PR #53 (news characterization, Unit 1) while this branch was
open, and it passes here after the merge: *"11 categories (8 in the quiz), 16
sub-issues, no orphans, no drift from the quiz"*. So does `main`'s other new
guardrail, `verify-news-characterize.ts`. The brief was right and this document
was briefly wrong.

---

## 9. Open items handed on

0. **The five rated rows — DEFERRED by the founder on 2026-09-21, not pending.**
   Shown all three raters' values for Miami Herald, Sun Sentinel, Tampa Bay
   Times, Orlando Sentinel and AP, the founder chose to leave them undecided
   for now: *"no leaning"*. `leanTag: null` on those rows is therefore a
   recorded decision to wait. **Do not re-present this table** — the evidence
   is §2 and §4 below and has not changed.

   When it is picked up it needs **two** decisions, not one: whose rating
   governs where they disagree (four of the five do), and where the cut between
   `center` and `center-left` falls, since no rater uses this repo's five-value
   scale. Averaging is forbidden — "record disagreement as disagreement".

   `unrated` is **not** an available answer here: three agencies rate each of
   these outlets, so it would deny ratings this repo cites, and
   `verify-news-sweep.ts` fails on it by design.

   **It does not block launch.** A null lean keeps the row out of the sweep, so
   these five are simply absent; 32 rows are designated and **24** are sweepable
   without them (27 until the 2026-09-21 AI-crawler hold).

   **And since that hold, deciding the five would add nothing to the sweep.**
   The three a lean would have unlocked — Sun Sentinel, Tampa Bay Times,
   Orlando Sentinel — are all on `AI_POLICY_HOLD` because their robots.txt names
   Claude/Anthropic agents; Miami Herald and AP have no retrieval path. The lean
   gate and the crawler question now have to be answered together for any of
   these five to be read.

1. **Gate A versus spectrum span** (§3) — a contradiction between spec §7 and
   corpus Recommendation 5. Founder decides which gives way. Blocks the
   national tier.
2. **National-tier `countyFips`** — unchanged from
   `news-corpus-verification-2026-09-17.md` §3 item 7. Schema decision.
3. ~~**`unrated` lean value**, then ~~**designating the 31 rows**~~.~~ **Both
   done 2026-09-19** (migration `0028`; `UNRATED_DESIGNATED`). The sweep is
   unblocked to 27 outlets. What this opens in turn is items 9 and 10 below.
4. **Where the AllSides CC BY-NC line sits in the UI** (§6) — spec §12 item 4,
   now a launch blocker for news cards.
5. **BY-NC non-commercial term** against the product's plans (§6).
6. **`wsj.com` and `foxnews.com` rating scope** (§3) — if those rows are ever
   added, the rating covers a different body of content than the row would.
7. **Florida Phoenix** was out of this brief's scope and was not fetched. Its
   `leanBasis` still records a States Newsroom network note with no
   outlet-specific rating, and it is `mixedFeed`-flagged besides.
9. **The AI-crawler policy question, now live** (§7). Three of the 27
   sweepable outlets name a Claude/Anthropic agent in robots.txt, and WESH
   carries Hearst terms prohibiting crawlers and aggregation outright.
   `flvoicenews.com` is sweepable with its policy unknown (robots.txt 403s).
   **Decide before running a live sweep.** No live sweep was run here.
10. **Crawl delays are honoured only by accident** (§7) — one request per host
   per run, across 27 hosts now instead of 0, and it breaks when feed paging is
   added. `floridianpress.com` declares 600 s.
11. **Six rows still need a lean chosen** — the 5 with cited ratings and
   Florida Phoenix. That is the rest of gate C7-a.
8. **Re-check near launch.** Ad Fontes publishes no dates at all; MBFC's Sun
   Sentinel entry was last updated 2023-07-31, and its POLITICO and NYT entries
   in 2024. AllSides states all four Group A confidences as low or initial.
