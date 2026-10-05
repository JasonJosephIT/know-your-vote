# What the Florida press covered — corpus analysis

> **These numbers are a TAXONOMY v2 measurement, preserved as history.** Main
> is now v4: `B6` was split, `KYV1`–`KYV5` were added, and the orphaned
> category aliases were folded back in (PR #64). Every count below was produced
> before those changes, so it describes the press accurately and the current
> classifier only loosely. `compare-policy-runs.ts` would refuse to compare it
> to a v4 run, and so should a reader.
>
> What survives the version change is the shape, not the counts: roughly
> two-thirds of a local-news sweep carries no policy issue at all, and crime
> outweighs every other issue several times over. Re-run
> `scripts/news-corpus-analysis.ts` against v4 for numbers to quote.


**834 articles** from **29 outlets**, published 2026-08-26 → 2026-09-19. Engine `jev-1.13.0`, taxonomy v3, threshold 0.85.

**531 of 834 (63.7%) carried no tracked issue at all** — obituaries, sport, weather, traffic, entertainment. That is the real noise floor of a local-news sweep.

## Read these zeros carefully

**A2 housing 0 and A5 water 0 are different facts.**

- **A5 was a bug, now fixed.** The corpus contains "Nine Florida springs will
  get new cleanup plans… nitrogen pollution that contributes to harmful algae
  blooms". It scored 0 under taxonomy v2 because dropping the parent questions
  on 2026-09-18 silently removed 25+ alias terms that lived only on categories.
  Folded back in as v3; A5 went 0 → 2.
- **A2 is probably correct.** The two candidate articles are about homelessness
  *services*, not housing **affordability**, which is A2's label. Adding
  "homelessness" as an alias did not change it, and the label is right to
  resist. CAP's 15 has no concept for housing insecurity — a taxonomy gap to
  note, not a tagging failure.
- **A6 fell 14 → 11 when aliases were added**, which is the opposite of the
  assumption behind widening them. Past roughly a dozen terms the extra
  vocabulary appears to blur the question rather than sharpen it.

**Do not tune aliases against this corpus.** It is unlabelled, so it can show a
count moved but never that the new count is righter. Only the gold set can
adjudicate that, and at 116 rows with several issues at n=0 it is too thin for
a ±3 swing. Label more rows first.

## Coverage by category

| Category | Articles | Share |
|---|---|---|
| Public Safety & Crime | 155 | 18.6% ████████████████████████████████████████ |
| Immigration | 49 | 5.9% █████████████ |
| Elections & Voting *(not in quiz)* | 40 | 4.8% ██████████ |
| Economy & Affordability | 19 | 2.3% █████ |
| Insurance & Property Costs | 13 | 1.6% ███ |
| Healthcare | 12 | 1.4% ███ |
| Education | 11 | 1.3% ███ |
| Environment & Water | 10 | 1.2% ███ |
| Abortion Policy *(not in quiz)* | 3 | 0.4% █ |
| Retirement & Benefits *(not in quiz)* | 1 | 0.1%  |
| Housing | 0 | 0.0%  |

## Coverage by issue

| Issue | Articles | Share |
|---|---|---|
| B7 Crime and public safety | 155 | 18.6% |
| B3 Immigration and border enforcement | 49 | 5.9% |
| KYV1 Threats to democratic institutions | 25 | 3.0% |
| A7 Elections administration and voting access | 22 | 2.6% |
| B1 Economy, inflation, and jobs | 15 | 1.8% |
| B2 Healthcare access and costs | 12 | 1.4% |
| A6 Public education and school choice | 11 | 1.3% |
| A3 Property taxes | 10 | 1.2% |
| B8 Climate and environment (national) | 8 | 1.0% |
| B6 Election integrity | 7 | 0.8% |
| A4 Cost of living in Florida | 6 | 0.7% |
| A1 Property insurance costs | 3 | 0.4% |
| B5 Abortion policy | 3 | 0.4% |
| A5 Water quality and Everglades restoration | 2 | 0.2% |
| B4 Social Security and Medicare | 1 | 0.1% |
| A2 Housing affordability | 0 | 0.0% |

## Outlets by how much tracked-issue news they carried

| Outlet | Articles | With an issue | Rate |
|---|---|---|---|
| Le Floridien | 10 | 7 | 70% |
| WFSU Public Media | 10 | 7 | 70% |
| NBC6 South Florida | 52 | 35 | 67% |
| WUSF | 10 | 6 | 60% |
| Florida Phoenix | 100 | 54 | 54% |
| FOX 35 Orlando | 25 | 13 | 52% |
| WLRN | 10 | 5 | 50% |
| América TeVé | 20 | 10 | 50% |
| Florida Daily | 12 | 6 | 50% |
| WFTV Channel 9 | 15 | 7 | 47% |
| CBS News Miami | 30 | 12 | 40% |
| Florida's Voice | 15 | 6 | 40% |
| The Floridian | 18 | 7 | 39% |
| WSVN 7News | 50 | 19 | 38% |
| Tampa Bay Times | 100 | 38 | 38% |
| WFLA News Channel 8 | 50 | 18 | 36% |
| Central Florida Public Media | 12 | 4 | 33% |
| WESH 2 News | 20 | 6 | 30% |
| Diario Las Américas | 20 | 5 | 25% |
| Florida Bulldog | 5 | 1 | 20% |
| South Florida Times | 10 | 2 | 20% |
| 10 Tampa Bay | 40 | 8 | 20% |
| WPLG Local 10 | 100 | 17 | 17% |
| WKMG News 6 | 20 | 3 | 15% |
| Creative Loafing Tampa Bay | 25 | 3 | 12% |
| Miami New Times | 10 | 1 | 10% |
| The Westside Gazette | 10 | 1 | 10% |
| Florida Politics | 10 | 1 | 10% |
| Orlando Weekly | 25 | 1 | 4% |

_1925128 input tokens · $0.0809 · 0 errors._
_Analysis only: nothing was written to news_item. Storing rows still requires gate C7-a and migration 0027._
