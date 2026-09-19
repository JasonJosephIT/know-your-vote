# Lean ratings — fetched 2026-09-19

_Retrieval and transcription only. Every value below was read off the rating
agency's own published page during this session, on the date in the access
column. Nothing here is this session's estimate of any outlet's lean, and no
`leanTag` was set. Closes the research half of founder gate **C7-a**; it does
not close the gate (§7)._

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

## 7. The sweep is still blocked. This did not unblock it.

Stated plainly, because a reader of §2 could reasonably think otherwise.

`usableOutlets()` requires a non-null `leanTag`. **No `leanTag` was changed by
this session — all 37 rows are still `null`** — so the sweep still selects
**0 outlets**. `node scripts/verify-news-sweep.ts` reports exactly that:
`37 outlets listed, 0 usable`.

Even after the founder signs off the four Group A rows, the arithmetic does not
improve much:

| | |
|---|---|
| Rows with a fetched, cited basis | **5** (4 Group A + AP) |
| Rows the founder could sign off on this evidence | **4** (AP has no retrieval path — no RSS, hub pages 403) |
| Rows still carrying `UNRATED` | **31** of 37 |
| National rows added to `OUTLETS` | **0** — tier decision still open |

A sweep of four large metro dailies is the opposite of what a local-news corpus
is for. Worse, two of the four (Sun Sentinel, Orlando Sentinel) reach the
runner only through the Tribune sitemap path, and their county feeds would be
the only ones populated.

**The actual unblock is a schema value for "no rater covers this outlet."**
`lean_tag` is CHECK-constrained to `left | center-left | center | center-right |
right | N/A`, and `N/A` means "lean does not apply" — a government primary
document — not "nobody has rated this". Conflating them puts a small untruth on
a voter-facing card, against `news-fairness.md` §1, where the lean exists so
"the reader judges the outlet themselves".

This fetch also supplies the evidence that the 31 are **not a backlog**.
AllSides, Ad Fontes and MBFC rate national and large-metro outlets; all 36
pages sought for the 12 outlets in scope exist, and this is exactly the set of
nationals and metro dailies. There is no equivalent page to find for WSVN,
WFTV, Le Floridien, The Westside Gazette or América TeVé, and waiting will not
produce one. Adding `unrated` — the migration, the `LeanTag` type,
`newsLabels()` rendering and `usableOutlets()` — is a separate task and a
founder decision, because it changes what 31 of 37 cards say.

---

## 8. What this session changed

- `src/lib/news-sources.ts` — `leanBasis` rewritten on 5 rows
  (`miamiherald.com`, `sun-sentinel.com`, `tampabay.com`, `orlandosentinel.com`,
  `apnews.com`); the header's "one-word edit per row" claim corrected, since it
  was false for 33 of 37 rows; the CC BY-NC obligation recorded at the code.
  **No `leanTag`, no `feed`, no flag, and no row membership changed.**
- This document.

### Guardrails, run 2026-09-19

| Script | Result |
|---|---|
| `verify-news-sweep.ts` | **OK** — "reproducible, boundary holds, labels come from the list (37 outlets listed, 0 usable)". Its two non-default-`leanBasis` assertions still hold: each cites a rater, and each defers to the founder. |
| `verify-news-labels.ts` | **OK** — lean disclosure + unattributed-item rules hold |
| `verify-news-match.ts` | **OK** |
| `verify-news-slots.ts` | **OK** |
| Banned-terms lint over all 37 `leanBasis` values, using `findAllBannedTermMatches` from `src/lib/neutrality.ts` | **Clean** — 0 hits |

Two pre-existing failures, both reproduced on the unmodified baseline by
stashing this session's diff, and neither related to it:

- `verify-news-ungated.ts` — 2 checks fail, the first being "effect has no
  location dependency". Identical before and after.
- `verify-news-neutrality.ts --self-test` — cannot start
  (`ERR_MODULE_NOT_FOUND` on `@supabase/supabase-js`; project dependencies are
  not installed in this environment). `npx tsc --noEmit` fails for the same
  reason, on files this session did not touch. The banned-terms check in the
  table above exercises the same matcher library that script imports, which is
  the part that applies to `leanBasis` prose.

The brief asked for `scripts/verify-news-issues.ts`; **no such script exists**
in `scripts/`. The news guardrails present are the ones listed above plus
`verify-news-feed.ts`.

---

## 9. Open items handed on

1. **Gate A versus spectrum span** (§3) — a contradiction between spec §7 and
   corpus Recommendation 5. Founder decides which gives way. Blocks the
   national tier.
2. **National-tier `countyFips`** — unchanged from
   `news-corpus-verification-2026-09-17.md` §3 item 7. Schema decision.
3. **`unrated` lean value** (§7) — the real unblock. Migration + type +
   rendering + `usableOutlets()`.
4. **Where the AllSides CC BY-NC line sits in the UI** (§6) — spec §12 item 4,
   now a launch blocker for news cards.
5. **BY-NC non-commercial term** against the product's plans (§6).
6. **`wsj.com` and `foxnews.com` rating scope** (§3) — if those rows are ever
   added, the rating covers a different body of content than the row would.
7. **Florida Phoenix** was out of this brief's scope and was not fetched. Its
   `leanBasis` still records a States Newsroom network note with no
   outlet-specific rating, and it is `mixedFeed`-flagged besides.
8. **Re-check near launch.** Ad Fontes publishes no dates at all; MBFC's Sun
   Sentinel entry was last updated 2023-07-31, and its POLITICO and NYT entries
   in 2024. AllSides states all four Group A confidences as low or initial.
