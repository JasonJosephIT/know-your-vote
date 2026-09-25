# Measure resources — verified row by row (2026-09-24)

Session A, step 3. Every candidate URL from spec §10
(`docs/superpowers/specs/2026-09-23-measure-resource-ladder-design.md`) was
opened, plus a search for the primary sources the spec names as gaps. `kind`
and `stance` below are **proposals** under the §1 ladder rules, for the founder
to confirm (F7). No lean or organisation category is assigned (§11).

Rules applied: `official` and `reporting` are always `neutral`; a position
found only in news coverage is `reporting` + `neutral`, never an `argument`
row. Gate (F2): at least one `support` and one `oppose`, larger ≤ 2× smaller.

## Live state checked before this work

- `0034` and `0035` were **already applied** to production (this session's
  brief said otherwise). `measure_argument` is gone; `measure_resource` holds
  the 3 booklet rows (`official` / `neutral`); anon sees 0 of them because all
  three measures are still `listed`.
- `node scripts/verify-measure-resources.ts` and
  `node scripts/verify-measure-balance.ts` pass.

## Summary for the founder

| Amendment | Verified support | Verified oppose | Gate (≤2×) | Honest reading |
| --- | --- | --- | --- | --- |
| AM1 | 2 (TaxWatch analysis; 1 Substack) | 1 (1 Substack) | passes on count | Tier 4 is empty on **both** sides: every named advocate (RPOF, DeSantis, AFL-CIO, Driskell, LWV) was found only in news. Publishing on two Substacks and one guide would be thin. |
| AM2 | 5 | 4 | passes on count | Both NO `argument` rows (FEA toolkit, LWV Vote411 PDF) name an opposition with **no reasons**; the LWV PDF may be a neutral synopsis that lists opponents rather than LWV's own case; the sisusari post reads as undecided. Realistically 5 vs 1–2. |
| AM3 | 5 | 7 | passes | Strongest of the three. Reclassified to `reporting`/`neutral`: Florida Chamber, RPOF, DeSantis, Miami-Dade Sheriff (not found in their own words); Lake Wales page (argues a side, so not `official`) and the Martin County video (uploaded by CBS12). |

## Open points to check before any row is written

- **AM3 DeSantis.** The verifier says he called it "foolish". That word is his
  documented quote on **AM1**, so this may be a mix-up. Re-check before filing
  him on either side of AM3. **Resolved by 0038:** confirmed a mix-up — the
  "foolish" quote is his documented AM1 remark (WUSF/CBS Miami, 2026-09-15/16),
  and no primary DeSantis statement on AM3 itself was found. He is excluded
  from AM3 entirely per the founder's direction (F7 header comment in 0038).
- **Rows only seen as search snippets** (403 or paywall: WFLA, Bradenton Times,
  pcpao.gov, the flsenate/edr PDFs, several floridapolitics.com pieces) are
  not verified loads. Open them in a browser before seeding. **Resolved by
  0038:** none of these snippet-only rows were seeded — 0038's header lists
  every one of them under "EXCLUDED — not opened."
- **Sparker's Soapbox** (AM1) is a both-sides explainer. `commentary` cannot be
  `neutral`, so drop it. **Resolved by 0038:** dropped — AM1 is not seeded at
  all (see the Amendment 1 decision below), so Sparker's Soapbox is not a row
  in any migration.

## Decisions (2026-09-24)

Founder decisions, final:

- F1–F6 (spec §9) confirmed as drafted: drop `measure_argument`; the ≤2×
  symmetry rule; no lean printed on a resource row; the ≤140-char attribution
  `note`; `analysis` may carry a stance; an 8-row column cap.
- F7 (which measures seed first): **Amendment 3 only**, via
  `supabase/migrations/0038_measure_resources_am3.sql` — 14 verified rows (2
  support, 4 oppose, 8 neutral), `FL-AM3-general` moved to `published`.
- **Amendment 1 not published.** Tier 4 (`argument`) is empty on both sides:
  every named advocate or opponent (RPOF, Gov. DeSantis, Florida AFL-CIO,
  Rep. Driskell, League of Women Voters of Florida) was found only through
  news coverage, never their own primary statement, page, or archived
  testimony. What remains after excluding search-snippet-only rows is one
  `analysis` row (Florida TaxWatch, support) and two Substack posts — a
  guide and two personal blogs is a thin basis for a published page, even
  though the raw count passes the ≤2× gate.
- **Amendment 2 not published.** In the two documents we checked (FEA
  toolkit, LWV Vote411 PDF), both identified NO-side organizations (Florida
  Education Association, League of Women Voters of Florida) state their
  opposition with no stated reasons anywhere in their own material — a bare
  "opposed" listing, not a case. Publishing NO would show two named
  opponents who, on the page, appear to object without giving a reason.

<!-- per-amendment detail below -->

## Amendment 1 — Budget Stabilization Fund

Verified 2026-09-24 against §10 of `2026-09-23-measure-resource-ladder-design.md`. Every row below was opened with WebSearch (to locate the exact URL) and WebFetch (to open it), except where noted as blocked.

| # | URL | Loads | Publisher / author | Date | Format | kind | stance | Evidence |
|---|---|---|---|---|---|---|---|---|
| 1 | https://constitutionalinitiatives.dos.fl.gov/Home/InitDetail?account=10&seqnum=108 | Yes | Florida Dept. of State, Div. of Elections | filed 2025-06-17 | document | official | neutral | DoS initiative-tracking page confirms **seqnum=108** for "Budget Stabilization Fund," HJR 5019, ballot no. 1. |
| 2 | https://www.flsenate.gov/Session/Bill/2025/5019/?Tab=Analyses | Yes | Florida Senate | posted 2025-08-15 | document | official | neutral | Senate bill page lists the staff analysis PDF for HJR 5019 (Budget Committee, post-meeting). |
| 3 | https://www.flhouse.gov/Sections/Bills/billsdetail.aspx?BillId=82516 | Yes | Florida House of Representatives | filed/signed 2025-06-17 | document | official | neutral | House bill-detail page: HJR 5019 text, vote history (House 100-1, Senate 29-4), and staff-analysis links (6/18/2025, 8/15/2025). |
| 4 | https://jamesmadison.org/2026-florida-amendment-guide/ | Yes | James Madison Institute | 2026-09-21 | article | analysis | neutral | Guide describes the mechanics of Amendment 1 with **no support/oppose recommendation stated** on the page — confirms the spec's "no recommendation found." |
| 5 | https://floridataxwatch.org/the-florida-taxpayers-guide-for-the-2026-constitutional-amendments/ | Yes | Florida TaxWatch | 2026-09-17/18 | document | analysis | support | "Florida TaxWatch Recommends a 'Yes' Vote on Amendment 1." |
| 6 | https://www.wusf.org/politics-issues/2026-09-15/desantis-splits-with-gop-amendment-1-reserve-funds | Yes | WUSF / Gray Rohrer, News Service of Florida | 2026-09-15 | article | reporting | neutral | Straight-news account reporting both DeSantis's ("foolish constitutional amendment proposal") and RPOF's positions — reporting, not argument. |
| 7 | https://www.cbsnews.com/miami/news/what-is-florida-amendment-1-gov-ron-desantis/ | Yes | CBS Miami / News Service of Florida | 2026-09-16 | article | reporting | neutral | Explainer of the measure plus DeSantis's opposition quote — straight news. |
| 8 | https://www.wfla.com/news/politics/desantis-breaks-with-gop-over-budget-stabilization-amendment/ | **No — HTTP 403** | WFLA (Nexstar) | 2026-09-15 (per search snippet) | article | reporting | neutral | Blocked by a bot/paywall gate on WebFetch; content not opened, only the search-result snippet was seen. Do not treat as verified. |
| 9 | https://thebradentontimes.com/stories/2026-constitutional-amendment-1-budget-stabilization-fund,212210 | **No — HTTP 403** | The Bradenton Times | undated in snippet | article | reporting | neutral | Same 403 block; content not opened. Search snippet only ("advocates say... critics argue..." — reads as balanced explainer). |
| 10 | https://www.ocalagazette.com/lawmakers-look-to-pump-up-rainy-day-fund/ | Yes | Ocala Gazette / Jim Turner & Jim Saunders, News Service of Florida | 2025-06-06 | article | reporting | neutral | Balanced legislative-process story; quotes House Speaker Perez for and Rich Templin against. |
| 11 | (Creative Loafing Tampa — no AM1-specific URL confirmed) | N/A | Creative Loafing Tampa | — | — | — | — | The only cltampa.com article found (`florida-lawmakers-finally-reach-budget-deal-heres-whats-in-it`, Gray Rohrer/NSF, 2026-05-25) does **not** mention the Budget Stabilization Fund or HJR 5019/Amendment 1 at all. No other AM1-specific Creative Loafing Tampa URL surfaced. Not a verified row. |
| 12 | https://amandainformed.substack.com/p/three-amendments-three-reasons-to | Yes | Amanda Informed (Substack, unaffiliated) | 2026-09-23 | article | commentary | oppose | "Budget decisions belong in the budget... a permanent, one-size-fits-all savings mandate written into the Constitution" is the wrong tool. |
| 13 | https://palmbeachexaminer.substack.com/p/stop-paying-rent-to-the-state-how | Yes | Karl Dickey's Freedom Vanguard (Substack, unaffiliated) | 2026-08-07 | article | commentary | support | Author says he will vote "YES on all three amendments," framing Amendment 1 as limiting "reckless government spending." |
| 14 | https://www.sparkers-soapbox.com/florida-amendment-1-budget-stabilization-fund-2026/ | Yes | Sandy Parker, Sparker's Soapbox (Substack-style blog, unaffiliated) | 2026-08-20, updated 2026-09-21 | article | **conflict — see Gaps** | **neutral** | Page is a balanced explainer citing both sides (Albritton/Power for; Driskell/Templin/DeSantis against) with no stance of its own — see Gaps note below; this is NOT the commentary+oppose row the spec's tier-5 NO cell implied. |

### Gaps

- **(a) Florida Channel archive of Rich Templin's House Budget Committee testimony** — NOT located. Search only surfaced his testimony second-hand through News Service of Florida coverage (Ocala Gazette row #10, and the Sparker's Soapbox summary) and a Facebook post from Florida AFL-CIO's own page. No `thefloridachannel.org` clip URL for this specific hearing was found. Templin's opposition remains `reporting`-sourced only.
- **(b) Gov. DeSantis's own video/transcript** — NOT located. flgov.com's September 2026 press-release list (fetched directly) has no entry on Amendment 1; his opposition (posted to X on 2026-09-14 per news accounts) was reported only through coverage (WUSF, CBS Miami, ClickOrlando, News4Jax, Townhall). No primary flgov.com, official YouTube, or Florida Channel URL found.
- **(c) RPOF's own page/statement for YES** — NOT located. `florida.gop/fl_amendments_positions/` (fetched directly) is a stale 2024-cycle page that does not mention Amendment 1 at all. Evan Power's quote ("Government should not spend it all and then come back for more...") is known only via press coverage (WUSF, floridianpress.com, tampafp.com, einpresswire.com syndication). No rpof.org/florida.gop 2026 press release URL for this endorsement was found.
- **(d) DoS seqnum + joint resolution + staff analysis** — FOUND and verified: DoS seqnum **108** (row #1), HJR 5019 text/votes on flhouse.gov (row #3), and the staff analysis listing on flsenate.gov (row #2).
- **(e) LWV Florida or Driskell primary statement** — NOT located as usable content. `lwvfl.org/voter-guide-2026/` links two PDFs ("Vote411 Voter Guide – Florida Proposed Amendments," English and Spanish) but their content could not be confirmed to mention Amendment 1 specifically (WebFetch returned only the link labels, not PDF text). Driskell's opposition ("You don't get to talk about saving money for a rainy day when it's still raining...") is known only through news coverage (WFLA/Yahoo/SNN, all reporting the same floor-debate quote); no driskell.house.gov / campaign-site primary statement was found.

### Gate count

- Confirmed non-neutral rows: **support = 2** (row #5 TaxWatch analysis, row #13 palmbeachexaminer commentary), **oppose = 1** (row #12 amandainformed commentary).
- 2 ≤ 2× 1 → **within the ≤2× symmetry rule on raw count**, but this is misleading: neither side has a single verified tier-4 `argument` row from a primary source (RPOF's and DeSantis's own statements are gap (b)/(c); AFL-CIO/Driskell/LWV are gap (a)/(e)). The spec's own "Gate risk" note for AM1 — that NO has no primary-source argument row — is confirmed still open after this research pass, and it now applies to YES as well: both sides currently clear the ladder only at tier 2 (one side) and tier 5 (both sides), with tier 4 empty on both.

### Verifier notes

**DONE_WITH_CONCERNS**

Gate count line: support = 2, oppose = 1 (excluding neutral); 2 ≤ 2×1 holds numerically, but tier-4 `argument` is empty on both sides — every named tier-4 advocate/opponent (RPOF, DeSantis, Florida AFL-CIO/Templin, Driskell, LWV Florida) was found only through `reporting` coverage, never their own primary page/video/testimony archive, despite direct fetches of flgov.com's press list and florida.gop's amendment-positions page (neither mentions Amendment 1). WFLA and Bradenton Times URLs are blocked (HTTP 403) and were not actually opened — only search snippets were seen, so they are not verified loads. No Creative Loafing Tampa URL specific to Amendment 1 could be confirmed. Sparker's Soapbox is filed under the spec's tier-5 NO cell but its actual content is a neutral, both-sides explainer, not oppose commentary — that source can't satisfy the CHECK constraint (`commentary` requires non-neutral stance) as written and needs a founder call on whether to drop it or reclassify it.

## Amendment 2 — Agricultural tangible personal property

| # | URL | Loads | Publisher / author | Date | Format | kind | stance | Evidence |
|---|-----|-------|---------------------|------|--------|------|--------|----------|
| 1 | https://constitutionalinitiatives.dos.fl.gov/Home/InitDetail?account=10&seqnum=109 | Yes | Florida Dept. of State, Division of Elections | Made ballot 06/18/2025; election year 2026 | document | official | neutral | Confirms seqnum=109, "Ballot Number 2," sponsor HJR 1215, effective tax years from 2027. |
| 2 | https://www.flsenate.gov/Session/Bill/2025/318/Analyses/2025s00318.ft.PDF | Yes | The Florida Senate, Committee on Finance and Tax (nonpartisan staff) | 2025-04-16 | document | official | neutral | "Staff estimate that the joint resolution will reduce local ad valorem revenue by approximately $31 million." |
| 3 | https://jamesmadison.org/2026-florida-amendment-guide/ | Yes | James Madison Institute | 2026-09-21 | article | analysis | neutral | Describes the amendment factually; page gives no support/oppose recommendation for AM2. |
| 4 | https://floridataxwatch.org/the-florida-taxpayers-guide-for-the-2026-constitutional-amendments/ | Yes | Florida TaxWatch | 2026-09-17 | document/article | analysis | support | "Amendment 2 is another way of chipping away at this onerous tax" — recommends YES. |
| 5 | https://mynews13.com/fl/orlando/news/2026/04/09/floridians-to-vote-on-amendment-on-tangible-property-tax-for-agricultural-businesses | Yes | Spectrum News / MyNews13, Jason Delgado | 2026-04-09 | article | reporting | neutral | Straight-news piece quoting both Rep. Alvarez (support) and Rep. Eskamani (oppose) without editorializing. |
| 6 | https://www.aginfo.net/report/62493/Southeast-Regional-Ag-News/Florida-Voters-to-Decide-on-Agricultural-Tax-Break-in-2026 | Yes | Ag Information Network of the West, Haylie Shipp | 2025-05-07 | article | reporting | neutral | Straight-news coverage of the legislative vote; gives both sides, slightly more space to supporters. |
| 7 | https://news.bloombergtax.com/daily-tax-report-international/florida-legislature-proposes-property-tax-exemption-constitutional-amendment | Partial (paywalled after opening paragraph) | Bloomberg Tax, "Bloomberg Tax Automation" | 2025-07-09 | article | reporting | neutral | Headline + lede visible only: factual description of the legislature's action, no advocacy language seen. |
| 8 | https://thebradentontimes.com/stories/2026-constitutional-amendment-2-agricultural-tangible-personal-property-tax-exemption,212219 | No — HTTP 403 (bot wall) | The Bradenton Times | unknown | article (assumed) | reporting (assumed, unconfirmed) | — | Could not open; tried WebFetch, blocked. Content not verified. |
| 9 | https://www.wfla.com/news/florida/new-amendment-aims-to-cut-costs-for-florida-farms/ | No — HTTP 403 (bot wall) | WFLA (Nexstar) | unknown | article (assumed) | reporting (assumed, unconfirmed) | — | Could not open; tried WebFetch twice (WFLA URL and the WKRG mirror at wkrg.com), both blocked 403. Content not verified from this fetch, though the headline/summary is corroborated second-hand via search snippets only — not treated as a verified read. |
| 10 | https://floridafarmbureau.org/news/vote-yes-on-amendment-2/ | Yes | Florida Farm Bureau Federation | 2026-09-11 | article | argument | support | "Vote YES on Amendment 2 to protect local food production, preserve family farms..." |
| 11 | https://www.fdacs.gov/News-Events/Press-Releases/2024-Press-Releases/Constitutional-Amendment-Proposed-to-Support-Florida-Agriculture-by-Eliminating-Multiple-Taxation-of-Agricultural-Production | Yes | Florida Dept. of Agriculture & Consumer Services — Commissioner Wilton Simpson's own statement | 2024-01-08 | document/article | argument | support | "Food security is a national security issue, and this proposed constitutional amendment represents a pivotal step..." |
| 12 | https://www.tampabay.com/viewpoints/2026/09/23/florida-amendment-farm-equipment-tangible-tax/ | Partial (subscriber paywall past headline) | Tampa Bay Times "Viewpoints" (opinion), bylined Danny Alvarez and Pat Durden | 2026-09-23 (nearby date; exact publish date not confirmed past paywall) | article | argument | support | Headline: "Vote yes on Amendment 2 for Florida's farmers, food security and landscape" — labeled opinion column. |
| 13 | https://feaweb.org/action-center/voter-toolkit/ | Yes | Florida Education Association (own site) | undated on page | article | argument | oppose | Lists Amendment 2 under "OPPOSED BY FEA" — a position statement, no reasoning given. |
| 14 | https://www.lwvfl.org/wp-content/uploads/2026-State-Amendments-Synopses-English-from-Vote411-1.pdf | Yes | League of Women Voters of Florida (Vote411 synopsis, own PDF) | 2026 (undated within doc) | document | argument | oppose | "Opponents Florida Education Association, LWV of Florida" — names itself as opponent, no reasoning given. |
| 15 | https://palmbeachexaminer.substack.com/p/stop-paying-rent-to-the-state-how | Yes | Karl Dickey, Substack ("Freedom Vanguard") | 2026-08-07 | article | commentary | support | "Taxing the means of production increases the cost of food and harms agricultural independence." |
| 16 | https://sisusari.substack.com/p/florida-amendment-2-who-exactly-gets | Yes | Sari Lindroos-Valimaki, Substack | 2026-09-24 | article | commentary | oppose (see caveat) | "Do I have enough information to put this exemption into the Florida Constitution now? That's the question I'm still asking." — reads as an undecided/skeptical piece, not a clean oppose case; flagged below. |
| 17 | https://amandainformed.substack.com/p/three-amendments-three-reasons-to | Yes | Amanda Informed, Substack | 2026-09-23 | article | commentary | oppose | "This amendment was never designed around struggling small farmers... it doesn't phase out for large operations, and it doesn't expire." |

Not opened / not usable as rows:
- Republican Party of Florida (RPOF) "own page" — searched repeatedly (rpof.org / florida.gop); found no dedicated RPOF statement on Amendment 2. One news piece (floridianpress.com, 2026-09-09, Alexa Ryan) quotes individual GOP lawmakers (Sen. Collins, Rep. Alvarez, Commissioner Simpson) in support but does not state an RPOF party position — this is "via news" at best, not a primary RPOF statement, and no argument row is proposed for RPOF.
- flhouse.gov staff analysis for HJR 1215 — the guessed direct-download URL 404'd; the correct analysis PDF/path was not located in this session (would need a fresh search of flhouse.gov's bill page rather than a guessed filename).

### Gaps

- **FEA / LWV reasoning (the most important ask):** Found. Both organizations' *own* primary material was located and opened — feaweb.org's voter toolkit (row 13) and LWV Florida's own Vote411 PDF (row 14). Both confirm their opposition to Amendment 2. **Neither gives a reason** — each is a bare "opposed" listing (FEA: a header tag with no rationale; LWV: a synopsis document that names itself as an opponent inside an otherwise neutral ballot summary, no argument text). A local county league page (lwvmanatee.org, checked for context, not used as a row) likewise only lists positions, no reasoning. This matches the spec's own stated risk in §10: "no reasoning page found for either" — confirmed still true as of today's search.
- **Senate/House fiscal analysis PDF (~$31M/yr):** Found and opened — row 2, the Senate Finance & Tax bill analysis dated 2025-04-16, confirms the $31M figure directly (not just via Ballotpedia as the spec worried). The joint resolution itself is CS/SJR 318 / CS/HJR 1215 (not yet independently opened as bill text in this pass, only the analysis). A House-side staff analysis PDF was not located (guessed URL 404'd).
- **DoS initiative page seqnum=109:** Found and opened — row 1.
- **Wilton Simpson's own statement (fdacs.gov):** Found and opened — row 11.
- **RPOF's own page for YES:** Not found. Remains a gap; only individual-lawmaker quotes in news coverage exist.
- **Other primary NO statements (counties, school boards, Florida Policy Institute):** Not searched beyond FEA/LWV in this pass — out of the spec's explicit AM2 list, so not pursued further; flagging as unexplored rather than confirmed absent.
- Two reporting URLs (Bradenton Times, WFLA/WKRG) could not be opened at all (403 bot walls) and are excluded from the gate count as unverified.
- Bloomberg Tax and the Tampa Bay Times op-ed are paywalled past the headline/lede; classification (reporting-neutral and argument-support respectively) rests on the visible headline and opening text only, not the full body.

### Gate count

Excluding neutral rows: **5 support** (TaxWatch, Farm Bureau, Wilton Simpson/FDACS, Tampa Bay Times op-ed, palmbeachexaminer) vs **4 oppose** (FEA, LWV Vote411, sisusari, amandainformed). Larger (5) ≤ 2× smaller (4 → cap 8): **passes** the §4 rule numerically — but see concerns below before treating this as a real gate pass.

## Amendment 3 — Homestead exemption

| # | URL | Loads | Publisher / author | Date | Format | kind | stance | Evidence |
|---|-----|-------|--------------------|------|--------|------|--------|----------|
| 1 | https://constitutionalinitiatives.dos.fl.gov/Home/InitDetail?account=10&seqnum=110 | Loads (browser) | Florida Dept. of State, Div. of Elections | undated (live database) | document | official | neutral | "increases the homestead exemption... to $150,000 in 2027 and $250,000 in 2028" |
| 2 | https://flsenate.gov/Session/Bill/2026F/1F/Analyses/h0001z.SAC.PDF | Loads (PDF, 535KB; WebFetch couldn't decode text but file downloads) | Florida House staff analysis, HJR 1F | 2026-06-16 | document | official | neutral | staff analysis of the joint resolution provisions |
| 3 | https://edr.state.fl.us/content/conferences/revenueimpact/archives/2026F/_pdf/impact0710.pdf | Loads (PDF, 1.2MB; downloads fine, text not decodable via fetch) | Revenue Estimating Conference / EDR | 2026 (session) | document | official | neutral | REC recurring impact ≈ −$11.86B (per secondary reporting of same document) |
| 4 | https://www.pcpao.gov/amendment3 | **Blocked** — HTTP 403 via WebFetch (likely bot wall); WebSearch snippet confirms content | Pinellas County Property Appraiser | 2026 (live page) | document | official | neutral | "does not support or oppose any constitutional amendment... provided solely to explain" |
| 5 | http://ocfl.net/OpenGovernment/PropertyTaxAmendment3.aspx | Loads | Orange County Government, FL | 2026 (© footer) | document | official | neutral | "intent is to provide factual information so residents can make informed decisions" |
| 6 | https://lakewalesfl.gov/938/Property-Tax-Impact-2026 | Loads | City of Lake Wales, FL (official site) | undated | document | **flag — see Gaps** | **flag — see Gaps** | page argues AM3 impacts are "immediate and severe," calls ballot language "misleading" |
| 7 | https://jamesmadison.org/2026-florida-amendment-guide/ | Loads (via search; not directly fetched) | James Madison Institute | 2026 | document | analysis | neutral (guide format; poll separately below) | covers all three 2026 amendments |
| 8 | https://floridapolitics.com/archives/811800-jmi-property-tax-poll/ | Loads (via search; not directly fetched, other FP links returned HTTP 402) | Florida Politics, reporting JMI poll | 2026 (Sept, pre-820604 follow-up) | article | reporting | neutral | "support falls below the 60% threshold... once voters learn" tradeoffs |
| 9 | https://jaxtoday.org/2026/09/21/florida-taxwatch-urges-no-vote-on-amendment-3/ (guide: https://floridataxwatch.org/the-florida-taxpayers-guide-for-the-2026-constitutional-amendments/) | Loads (via search) | Florida TaxWatch guide; covered by Jacksonville Today | 2026-09-18 (guide), 2026-09-21 (coverage) | document | analysis | oppose | "Florida TaxWatch urges 'No' vote on Amendment 3" |
| 10 | https://www.floridapolicy.org/posts/voter-guide-what-floridians-should-know-about-amendment-3 and https://www.floridapolicy.org/posts/florida-property-tax-amendment-ballot-language-summary | Loads (via search) | Florida Policy Institute | 2026 | document/article | analysis | oppose (implicit; frames "cost shift" and service-cut risk without recommending a vote, but doesn't recommend "yes" either — see Gaps) | "reduce local revenue by nearly $12 billion on a recurring basis" |
| 11 | https://www.clickorlando.com/election-2026/2026/09/23/floridas-amendment-3-could-change-property-taxes-heres-what-voters-need-to-know/ | Loads (via search) | ClickOrlando (WKMG) | 2026-09-23 | article | reporting | neutral | explainer of provisions and debate |
| 12 | https://www.cbsnews.com/miami/news/florida-property-tax-cut-amendment-local-government-revenue-losses-2026-ballot-measure/ | Loads (via search) | CBS Miami | 2026 | article | reporting | neutral | "could cost local governments nearly $12 billion a year by 2031" |
| 13 | https://www.wlrn.org/government-politics/2026-09-21/florida-realtors-pour-millions-of-dollars-into-amendment-3-push-as-opponents-warn-of-budget-cuts | Loads (via search) | WLRN | 2026-09-21 | article | reporting | neutral | "Realtors pour millions... opponents warn of budget cuts" |
| 14 | https://floridaphoenix.com/2026/09/15/florida-gop-endorses-amendment-3-american-planners-association-opposes/ | Loads (via search) | Florida Phoenix | 2026-09-15 | article | reporting | neutral | reports GOP endorsement + APA opposition |
| 15 | https://www.wflx.com/2026/09/18/gov-desantis-sheriffs-clash-over-amendment-3-poll-shows-support-below-passage-threshold/ | Loads (via search) | WFLX | 2026-09-18 | article | reporting | neutral | reports St. Pete Polls: ~45% support, 30% oppose |
| 16 | https://www.tampabaybeacons.com/2026/09/15/tax-town-hall-turns-contentious-in-largo/ | Loads (via search) | Tampa Bay Beacons | 2026-09-15 | article | reporting | neutral | reports contentious town hall on AM3 |
| 17 | https://www.wctv.tv/2026/07/20/impact-amendment-3-floridas-revenue-estimating-conference-releases-new-projections/ | Loads (via search) | WCTV | 2026-07-20 | article | reporting | neutral | reports REC's $4.95B (FY27-28) → $11.86B (FY31-32) projections |
| 18 | https://www.youtube.com/watch?v=Kc6QYIVx0XI ("What happens if the property tax amendment passes?", Battleground Florida) | Loads (browser verified) | **WFLA News Channel 8** (Nexstar, Tampa) — **not WUSF; see Gaps** | ~2 weeks before 2026-09-24 (≈2026-09-10) | video, 52:52 | reporting | neutral | segment on how AM3 affects local governments |
| 19 | https://voteyeson3.com/ | Loads (browser verified) | Vote Yes on 3 (Florida Realtors' committee) | undated | document | argument | support | "Vote YES on Amendment 3... meaningful property tax relief" |
| 20 | https://www.floridarealtors.org/news-media/news-articles/2026/09/florida-realtors-launches-vote-yes-3-campaign | Loads (browser verified) | Florida Realtors | 2026-09-09 | article | argument | support | "Florida Realtors supports Amendment 3 because it offers... meaningful property tax relief" |
| 21 | https://www.flchamber.com/amendment3 | Loads (browser verified) | Florida Chamber of Commerce | 2026 | document | **analysis/neutral — reclassify; see Gaps** | **neutral, not support — see Gaps** | page is an educational hub; CEO Mark Wilson is quoted as skeptical AM3 reaches 60%, no formal endorsement found |
| 22 | RPOF endorsement (no working primary URL found — see Gaps) | **Blocked/not found** — florida.gop/fl_amendments_positions and /constitutional_amendments_1_3/ and /amendment-3/ all resolved to stale pages about earlier (2020/2024) amendment cycles | Republican Party of Florida (claimed); actually sourced only via Florida Phoenix/WLRN/The Floridian reporting | 2026-09-15/16 (per reporting) | — | **reporting, not argument — see Gaps** | neutral per rule (no primary RPOF statement located) |
| 23 | Gov. DeSantis opposition (reported by ClickOrlando: "'Foolish:' Gov. DeSantis blasts...") https://www.clickorlando.com/news/florida/2026/09/15/foolish-gov-desantis-blasts-florida-republicans-over-new-amendment-proposal/ | Loads (via search) | ClickOrlando reporting DeSantis's own social-media remarks | 2026-09-15 | article | **reporting, not argument per rule** | **neutral** | DeSantis reportedly calls the amendment "foolish" — note: DeSantis's actual stance is OPPOSE per this coverage, contradicting the spec table's placement of him under YES |
| 24 | https://www.flsenate.gov/PublishedContent/Offices/President/6_2_26_Senate_Passes_Historic_Property_Tax_Cut_for_Florida_Homeowners.pdf | Loads (PDF, 264KB; downloads, text not decodable via fetch) | Senate President Ben Albritton's office | 2026-06-02 | document | argument | support | (per search) "What better way to celebrate... than a massive property tax cut through a $250,000 homestead exemption" |
| 25 | Miami-Dade Sheriff (Rosie Cordero-Stutz) — no direct primary URL opened; reported via https://floridapolitics.com/archives/821424-... (paywalled 402) and https://floridianpress.com/2026/09/miami-dade-county-sheriff-rosie-cordero-stutz-quells-safety-concerns-on-amendment-3/ | Florida Politics = 402 Payment Required; Floridian Press loads via search only | Sheriff posted her own statement to X/Twitter per reporting; I did not open the tweet itself | 2026-09-2x | social post (per reporting) | **reporting, not argument per rule — primary tweet not independently verified** | neutral | "Tax relief and public safety are not competing priorities" (quoted by press) |
| 26 | https://www.wftv.com/news/local/florida-sheriffs-association-launches-ad-campaign-against-amendment-3/66LZUYYIPFBOROT66T2GCA62DI/ | Loads (via WebFetch) | WFTV (reporting on the ad) | 2026-09-15 | article | reporting | neutral | describes ad; does not embed/link the ad itself |
| 27 | **Gap fill:** https://www.youtube.com/shorts/i1HMUpBJ780 "Amendment 3 Rips Out Public Safety Funding" | Loads (browser verified) | **Florida Sheriffs Association** (own YouTube channel) | 9 days before 2026-09-24 (≈2026-09-15) | video, 16 sec (short) | argument | oppose | "Amendment 3 slashes funding for deputies, firefighters, and 911 operators" |
| 28 | **Gap fill — "Math" ad:** found via YouTube search, title "Vote No On Amendment 3 'Math'" | Loads (browser verified via search results page; not opened directly) | **Vote No On 3** (own YouTube channel) | 3 days before 2026-09-24 (≈2026-09-21); matches https://floridapolitics.com/archives/820954-vote-no-on-3-launches-math-ad-calling-amendment-3-a-public-safety-nightmare/ (blocked 402 directly, confirmed via search) | video, 0:31 (also a 15s cutdown) | argument | oppose | "Amendment 3 means DEEP CUTS to sheriffs, firefighters..." / "the math says Amendment 3 is a public safety nightmare" |
| 29 | https://www.flcities.com/propertytaxes/ | Loads (browser verified) | Florida League of Cities | page timestamp 2026-09-18 | document | argument | oppose | "Amendment 3 is not a tax cut, it's a tax shift" |
| 30 | https://1000fof.org/propertytax/ | Loads (browser verified) | 1000 Friends of Florida | ~2026-07 (per reporting of when position formalized) | document | argument | oppose | "1000 Friends of Florida opposes Amendment 3 because the modest savings... would be outweighed by the lasting harm" |
| 31 | APA Florida opposition (no single stable URL found; reported via https://floridaphoenix.com/2026/09/15/florida-gop-endorses-amendment-3-american-planners-association-opposes/ ; primary campaign page https://whatsatstakefl.org/) | whatsatstakefl.org loads per search (not directly fetched) | APA Florida (quotes attributed to president Allara Mills-Gutcher) | 2026-09-15 (reporting) | document/article | argument | oppose | "APA Florida cannot support the amendment in its current form" |
| 32 | https://www.clickorlando.com/election-2026/2026/09/16/public-safety-leaders-urge-floridians-to-vote-no-on-amendment-3/ (Lake Mary presser: Florida Professional Firefighters + FOP + sheriffs) | Loads (via WebFetch) | WKMG News 6 & ClickOrlando (per the page's own JSON-LD `publisher` credit — corrected from a guessed "Central Florida Public Media collaborative"; M-7, final-review fix round) | 2026-09-16 | article | **reporting of a presser, not itself an argument page — see Gaps** | neutral (as a news article) | quotes Firefighters president Wayne Bernoska and Sheriff Grady Judd at the Lake Mary press conference |
| 33 | https://palmbeachexaminer.substack.com/p/vote-yes-on-florida-amendment-3-for | Loads (via search) | Palm Beach Examiner (Substack, unaffiliated) | 2026 | article | commentary | support | "Vote Yes on Florida Amendment 3 for Property Tax Relief" |
| 34 | https://bellaverderealty.com/news/local-news/florida-amendment-3-2026-pros-cons-solivita/ | Loads (via search) | Bella Verde Realty (realtor blog) | 2026 | article | commentary | pros/cons framing — net leans support (listed to weigh both, but publisher is a realty business with financial interest in the exemption) | outlines pros (tax relief) and cons (fee/service risk) |
| 35 | https://politicalcortadito.com/2026/09/03/amendment-3-daniella-levine-cava-no-campaign/ | Loads (via WebFetch, confirmed) | Political Cortadito (Ladra / Elaine de Valle), unaffiliated blog | 2026-09-03 | article | commentary | oppose | "It just decides who gets the bill" |
| 36 | https://amandainformed.substack.com/p/three-amendments-three-reasons-to | Loads (via search) | Amanda Informed (Substack, unaffiliated) | 2026 | article | commentary | oppose | "Three Amendments, Three Reasons to Vote No" |
| 37 | https://www.youtube.com/watch?v=37lN8L0PCT0 "Will Amendment 3 lower your property taxes? Jenny Fields explains" | Loads (browser verified) | **CBS 12 News – WPEC** (not the Property Appraiser's own channel — see Gaps) | ~1 month before 2026-09-24 (≈2026-08-11 per search) | video, 1:29 | reporting (**not official — see Gaps**) | neutral | Fields: "Lower your taxable value. That's it" |
| 38 | https://www.youtube.com/watch?v=EX3t4tN9a6I "New tool helps Florida voters research Amendment 3 property taxes" | Loads (browser verified) | WPTV News (covering Florida TaxWatch's tool) | ~1 month before 2026-09-24 (≈2026-08-21) | video, 2:36 | reporting | neutral | "Florida Tax Watch launched a tool to help voters research Amendment 3" |
| 39 | https://www.youtube.com/watch?v=r6M34w74GuI "Amendment 3 backers say bigger property tax break could help Florida homeowners stay put" | Loads (browser verified) | CBS 12 News – WPEC | 7 days before 2026-09-24 (≈2026-09-17) | video, 3:36 | reporting | neutral | "Supporters... say the proposed changes... could help homeowners stay in their homes" |
| 40 | Sheriffs' TV ad, video row (same underlying campaign as row 26/27) | See row 27 — best available primary is the FSA short, 16 sec | Florida Sheriffs Association | 2026-09-15 | video | argument | oppose | see row 27 |

### Title (verbatim), fix round 1 (2026-09-24)

0038 originally filed 9 of its 14 rows' titles as reconstructions from the
URL slug rather than the page's own headline/`<title>`. Each was re-opened
(WebFetch, or `curl` for the ones that would decode) and the title column
below is the page's own title/headline, verbatim, with only a trailing
` | Site Name` suffix stripped:

| Row (# above) | Source | 0038's original title | Verbatim title (verified) |
|---|---|---|---|
| 1 | DoS InitDetail (seqnum 110) | "Initiative Detail: Increased Homestead Exemption (seqnum 110)" | INCREASED HOMESTEAD EXEMPTION; LOWER CAP ON INCREASES IN NON-HOMESTEAD PROPERTY ASSESSMENTS (the page's own bolded initiative title; `<title>` tag itself is just "Constitutional Initiatives" — a generic SPA shell, not usable) |
| 5 | ocfl.net/.../PropertyTaxAmendment3.aspx | "Property Tax Amendment 3" | Property Tax Amendment 3 (confirmed via `<title>` tag — unchanged) |
| 20 | floridarealtors.org launch article | "Florida Realtors Launches ''Vote Yes 3'' Campaign" | Florida Realtors launches Vote Yes on 3 campaign (confirmed via `<title>`/og:title — corrects case and "Vote Yes 3" → "Vote Yes on 3") |
| 26 | wftv.com sheriffs ad report | "Florida Sheriffs Association launches ad campaign against Amendment 3" | Florida Sheriff's Association launches ad campaign against Amendment 3 (confirmed via og:title — the page's own `<title>` tag is a generic section title, "Amendment Three: How property tax changes affect funding - WFTV", not this article's headline; og:title is the article-specific one) |
| 27 | FSA YouTube short | "Amendment 3 Rips Out Public Safety Funding" | Amendment 3 Rips Out Public Safety Funding (confirmed via YouTube oEmbed — unchanged) |
| 29 | flcities.com/propertytaxes | "Property Taxes" | Property Taxes (confirmed via `<title>` tag — unchanged) |
| 30 | 1000fof.org/propertytax | "Property Tax" | Florida's Proposed Property Tax Reform (confirmed via `<title>` tag; 0038's title was not this page's own — it read like a topic label, not the headline) |
| 32 | ClickOrlando Lake Mary presser | "Public safety leaders urge Floridians to vote no on Amendment 3" | Public safety leaders urge Floridians to vote no on Amendment 3 (confirmed via `<title>`/og:title — unchanged) |
| 35 | Political Cortadito | "Amendment 3: Daniella Levine Cava's 'no' campaign" | Amendment 3 looks like a winner — until Florida voters learn what it does (confirmed via a text-rendering fetch that got past the page's bot check; 0038's title used the URL slug's topic, not the actual headline, which is the deck/subhead "Mayor Daniella Levine Cava starts 'No on 3' campaign," not the page `<title>`) |

All 9 rows were reachable this round (none dropped); 0038 updated in place.
Support/oppose/neutral counts are unchanged (2/4/8) since no row's stance,
kind, or inclusion changed — only 5 of the 9 titles above actually differ
from what 0038 originally filed (rows 1, 20, 26, 30, 35); the other 4 (rows
5, 27, 29, 32) already matched verbatim by coincidence and are listed here
only as confirmation that they were checked, not left un-verified.

### Title (verbatim), fix round 2 (2026-09-24)

Round 1 missed row 19 (voteyeson3.com) — its title was never re-verified
against the live page, only carried over from the spec table as "Vote Yes
on 3."

| Row (# above) | Source | Prior title | Verbatim title (verified) |
|---|---|---|---|
| 19 | voteyeson3.com | "Vote Yes on 3" | Vote YES on 3 (confirmed via `<title>` tag and og:title, both "Vote YES on 3" — corrects case: "Yes" → "YES") |

voteyeson3.com opened cleanly (curl `<title>` and og:title agree); not
dropped. Support/oppose/neutral unchanged (2/4/8) — this is a case-only
correction, stance/kind/inclusion untouched.

### Published dates for the 4 YouTube rows (final-review fix round, 2026-09-24)

I-1: the neutral block sorts by `published_at` desc (nulls last), so the 4
YouTube rows (rows 18, 37, 38, 39) sat last with NULL dates. Each video's
own upload date, pulled from its page metadata
(`curl -sL URL | grep -o '"uploadDate":"[^"]*"'`, which agreed with
`"publishDate"` in every case):

| Row (# above) | Video | `uploadDate` (page metadata, full timestamp) | `published_at` filed |
|---|---|---|---|
| 18 | youtube.com/watch?v=Kc6QYIVx0XI ("What happens if the property tax amendment passes?", WFLA) | 2026-09-09T12:01:38-07:00 | 2026-09-09 |
| 37 | youtube.com/watch?v=37lN8L0PCT0 (Jenny Fields, CBS12) | 2026-08-10T18:32:10-07:00 | 2026-08-10 |
| 38 | youtube.com/watch?v=EX3t4tN9a6I (TaxWatch tool, WPTV) | 2026-08-21T14:13:08-07:00 | 2026-08-21 |
| 39 | youtube.com/watch?v=r6M34w74GuI ("backers say", CBS12) | 2026-09-17T05:18:40-07:00 | 2026-09-17 |

All 4 verified; none left NULL. Row inclusion and stance unchanged.

### Gaps

- **pcpao.gov** returned HTTP 403 to WebFetch (likely bot-blocking); content confirmed only via search-engine cache/snippet, not opened directly.
- **flsenate.gov / edr.state.fl.us PDFs** (rows 2, 3, 24) download fine (confirmed file sizes) but WebFetch could not decode the PDF text; content facts above come from secondary reporting of the same documents, not my own read of the PDF text.
- **floridapolitics.com** returned HTTP 402 Payment Required on direct fetch for at least 3 URLs (JMI poll, Math-ad launch, Miami-Dade Sheriff) — a metered paywall. Content for those rows is from search-result snippets only, not a direct open.
- **Lake Wales city page** (row 6) is a government website but its content argues a position ("immediate and severe," calls ballot language "misleading") rather than staying neutral — this conflicts with the ladder's rule that `official` must always be `neutral`. Flagging for the founder: either this page isn't truly "official" tier (it reads as municipal advocacy, which is itself notable), or it needs to be dropped/reclassified.
- **Florida Chamber of Commerce** (row 21): the spec table lists it under YES/argument. My read of flchamber.com/amendment3 found no formal "vote yes" endorsement — it's framed as an educational hub with the CEO quoted expressing skepticism the amendment reaches 60%. I could not confirm a support stance; recommend reclassifying as neutral/informational (analysis or a non-argument reporting-style page) pending confirmation of an actual Chamber board vote/endorsement.
- **RPOF endorsement** (row 22): I could not find a live, current RPOF primary page about the 2026 property-tax Amendment 3 — florida.gop's own `/amendment-3/`, `/fl_amendments_positions/`, and `/constitutional_amendments_1_3/` pages all resolved to stale content from earlier ballot cycles (2020 primary-election Amendment 3, 2024 marijuana Amendment 3/4). The endorsement is real per multiple news outlets (Florida Phoenix, WLRN, The Floridian) quoting RPOF Chairman Evan Power, but per the rules that makes it `reporting`/`neutral`, not an `argument` row, unless a primary RPOF page is found elsewhere.
- **Gov. DeSantis** (row 23): the spec table places him under YES/argument, but the one primary signal I could find (via ClickOrlando reporting his own remarks) has him calling the amendment "foolish" — i.e., he appears to oppose it, not support it. This is reporting either way per the rules (no primary DeSantis statement page opened), but the stance direction in the spec table looks backwards and should be rechecked by the founder.
- **Miami-Dade Sheriff** (row 25): reporting says she posted her position to her own social-media account, which would be a primary source if opened directly — I did not locate/open the tweet itself, so I'm leaving this as `reporting`/`neutral` per the rule rather than promoting it to `argument`.
- **Florida Professional Firefighters + FOP "Lake Mary presser"** (row 32): I found solid reporting of the press conference (ClickOrlando/CFPM) with direct quotes, but no organizational primary-source page (a Firefighters or FOP press release) distinct from the news coverage. Treated as reporting.
- **Florida Sheriffs Association's full broadcast "train wreck" TV ad** (the specific ad referenced by wftv.com and other outlets) — I could not locate that exact longer ad as a standalone, individually loadable video with a clear duration. What I found and verified instead is the Association's own 16-second YouTube short ("Amendment 3 Rips Out Public Safety Funding"), which is a primary source but likely a cutdown, not the full TV spot. This is the best fill I have for the "find the ad video" gap the spec calls out.
- **"Vote No on 3 'Math' ad"** — filled: Vote No On 3's own YouTube upload, 0:31 (also a 15-second cutdown exists), confirmed via YouTube search results (not opened frame-by-frame, but title/channel/runtime read from the results list).
- **WUSF "Battleground Florida" video** (row 18) — the video I found matching this description ("What happens if the property tax amendment passes?") is published under **WFLA News Channel 8** (Nexstar/Tampa), not WUSF. I could not find a WUSF-branded version of this segment; flagging the mismatch rather than guessing WUSF content.
- **Martin County Property Appraiser Jenny Fields video** (row 37) — the spec table calls this `official`, but the video is uploaded by CBS12 News – WPEC's own channel (a TV station interviewing Fields), not the Property Appraiser's own channel. Reclassified above as `reporting`, not `official`.
- Several rows (7, 8, 10, 11–17, 22, 33, 34, 36) were confirmed only through WebSearch result snippets, not a direct WebFetch/browser open of the final page — noted per-row above as "via search."

### Gate count

Counting only clearly-verified `argument`/`commentary` rows with a definite stance (excluding neutral/reporting/official/analysis-neutral rows, and excluding the reclassified RPOF/DeSantis/Miami-Dade-Sheriff/Chamber rows since those are now `reporting`/neutral, not argument):

- **Support (oppose excluded):** Vote Yes on 3 (19), Florida Realtors release (20), Senate President Albritton release (24), palmbeachexaminer.substack.com (33), bellaverderealty.com (34) = **5**
- **Oppose:** FSA short-ad (27), Vote No on 3 "Math" ad (28), Florida League of Cities (29), 1000 Friends of Florida (30), APA Florida (31), Political Cortadito (35), amandainformed.substack.com (36) = **7**

Larger (7) ≤ 2× smaller (5 × 2 = 10): **yes, gate holds** — 7 ≤ 10.

However, this reclassifies three of the spec's assumed YES/argument rows (Florida Chamber, RPOF, Gov. DeSantis, Miami-Dade Sheriff) down to neutral/reporting per the ladder's own rule that a position found only via news coverage isn't an argument row. If the founder instead finds and adds primary pages for RPOF, Albritton is already counted, DeSantis, or the Miami-Dade Sheriff's tweet, the YES count would rise and the ratio would tighten further in AM3's favor — it does not break the gate either way.

### Verifier notes

DONE_WITH_CONCERNS

Gate count line: Support = 5, Oppose = 7 (verified argument/commentary rows only); 7 ≤ 2×5=10, so the 2× rule holds and AM3 can still clear the gate.

Concerns: several tier-4 rows the spec pre-assigned to YES/argument (Florida Chamber of Commerce, RPOF endorsement, Gov. DeSantis, Miami-Dade Sheriff) turned out, on primary-source verification, to be either not a formal endorsement (Chamber), sourced only through news coverage rather than a primary page (RPOF, Miami-Dade Sheriff), or actually opposed rather than supportive (DeSantis) — all reclassified to reporting/neutral per the ladder's own rule and excluded from the gate count above. Two of the spec's "official" tier video/document rows (Lake Wales city page, Martin County appraiser YouTube video) don't fit their assigned kind either: Lake Wales argues a position (breaking official-must-be-neutral), and the Fields video is TV-station content, not the appraiser's own channel. Several sources — pcpao.gov, all flsenate.gov/edr.state.fl.us PDFs, and multiple floridapolitics.com articles — could not be opened directly (403/402/undecodable PDF) and are reported here via search snippets only. The Sheriffs Association's full broadcast TV ad and a stable RPOF primary page could not be located at all; a 16-second FSA YouTube short and search-result metadata for the "Math" ad were the best substitutes found for the two explicit gap-fill requests.
