# Source check: pipeline gap vs real-world skew (2026-10-09)

Window: 2026-09-09 to 2026-10-09. Read-only. Nothing was written to the DB or the repo.

## Caveat that affects every row

The 30-day window does not match what we actually ingested. For candidate_news, the earliest R1 review_item was created **2026-10-06 16:40 UTC**, and the earliest `published_at` in the candidate_news payloads is **2026-09-30**. In practice our counts cover about 9 days (09-30 to 10-08), not 30. Any outside story dated 09-09 to 09-29 was never reachable, whatever our feeds or name matching do. That is a pipeline gap in time coverage, and it applies to every candidate, the baselines included.

We register 22 outlets (`source_id like 'outlet:%'`): cbsnews.com/miami, cfpublic.org, clickorlando.com, cltampa.com, diariolasamericas.com, floridabulldog.org, floridadaily.com, floridianpress.com, flvoicenews.com, fox35orlando.com, lefloridien.com, local10.com, nbcmiami.com, orlandoweekly.com, sfltimes.com, thewestsidegazette.com, wfsu.org, wftv.com, wlrn.org, wsvn.com, wtsp.com and wusf.org. Florida Politics, Florida Phoenix, Tampa Bay Times, Miami Herald, Jacksonville Today, AP, Politico, The Hill and Fox News are **not** registered.

## Table

| Race | Candidate | Party | Live (window) | Pending (window) | Outside in-window hits (real outlets) | Label | Reason |
|---|---|---|---|---|---|---|---|
| FL-SEN | Ashley Moody | REP | 1 | 2 | ≥6 (WUSF 10-01, NBC Miami 10-07, Fox News 10-04, Jacksonville Today 09-13, Newsweek, Daily Beast, Courthouse News) | **pipeline gap** | Two in-window stories with "Ashley Moody" in the headline came from outlets we register (WUSF, NBC Miami) and appear nowhere in news_item or review_item. Her single live row is a Florida Daily piece about Nixon/DSA. |
| FL-SEN | Angie Nixon | DEM | 7 | 2 | Many (WLRN 09-02*, WUSF/WGCU 09-07*, Jax Today 09-03*, WEAR, NBC Miami 10-07, Newsweek) | baseline; **pipeline gap (time window)** | Her 09-xx coverage from registered outlets (WUSF, WLRN) falls before ingestion began. (*09-02 and 09-03 also predate the window.) |
| FL-SEN | Neil J. Gillespie | NPA | 0 | 0 | 0 dedicated stories; named only in passing (NBC Miami poll 10-07: 2%; Florida Phoenix voter guide) | **real-world skew** | No in-window story is about him. Passing mentions exist. |
| FL-GOV | Byron Donalds | REP | 8 | 11 | Many (NBC Miami DeSantis endorsement ~09-01, CF Public, WLRN, Local10, CBS Miami, …) | baseline; pipeline gap (time window) | Heavy coverage. Our 19 rows all date from 10-02 or later. |
| FL-GOV | David Jolly | DEM | 6 | 6 | Many (Florida Phoenix 09-14 "Republicans for Jolly", NBC Miami poll, CBS Miami, …) | baseline; pipeline gap (time window plus unregistered Florida Phoenix) | Covered regularly. Our rows date from 10-02 or later. |
| FL-GOV | Charles Burkett | NPA | 0 | 0 | 0 (latest found: WLRN/WUWF launch, 05-19/20) | **real-world skew** | Nothing in the window. Coverage stopped after his May launch. |
| FL-GOV | Dean Ocean Abrams | NPA | 0 | 0 | 0 | **real-world skew** | No news coverage at any date. Only voter-guide listings. |
| FL-GOV | Frank J. Russo | NPA | 0 | 0 | 0 real-outlet in window (Sept items are campaign press releases on newswire/Webull; LiveNOW Fox videos are undated or earlier) | **real-world skew** (lean) | Only press releases in the window, which we exclude by design. |
| FL-GOV | Jeffrey P. "Dr. Jeff" Datto | NPA | 0 | 0 | 0 | **real-world skew** | No news hits at all under any name variant. |
| FL-GOV | Moliere "Moe" Dimanche | NPA | 0 | 0 | 0 | **real-world skew** | Only Wikipedia and voter-guide listings. |
| FL-GOV | Scott Eckhard Jewett | LPF | 0 | 0 | 0 real-outlet (Floridian Press 2025-11 launch items; Palm Beach Examiner Substack 10-07, an opinion piece that argues major outlets won't name him) | **real-world skew** | Floridian Press, a registered outlet, covered him in 2025 but nothing in the window. |

Other DB notes:
- Gillespie has **two** candidate rows, FL-DOE-89955 (Senate) and FL-DOE-89224 (Governor). Both have 0 items.
- Text scan: a regex for the minor candidates' names over title and summary in all news_item rows since 09-09 (85 rows) returns 0 hits, so our rows hold no untagged mentions of them. "Moody" appears in 2 rows, 1 of them not tagged to her.
- Moody's pending items: flvoicenews "POLL: Donalds, Moody hold clear leads" (correct), and a CBS Miami AG-race preview (looks mis-tagged; it is about Rodriguez vs Uthmeier).
- The Moody miss is **not** a name-matching problem. The flvoicenews headline that says only "Moody" was tagged to her correctly. The missed stories never entered review_item at all: the WUSF feed produced only one item in the whole period (an unrelated Hillsborough school-board story), and the NBC Miami Senate-poll story (3869181) was skipped although the sibling governor-poll story (3869071) was taken. That points to feed depth or freshness (and possibly the R1 run cadence that started 10-06), not the candidate matcher. Federal/DC outlets (Politico, The Hill, Roll Call) turned up **no** in-window Moody stories in search. Her national coverage is Fox News, Newsweek, Daily Beast and Courthouse News, none of them registered, but the clearest misses are Florida outlets we already register.

## Outlets behind the live/pending rows

- **Moody** live (1): floridadaily.com, "Democrat-Socialists Feel They Can Win in Florida" (10-06; also tagged to Nixon). Pending: flvoicenews.com (10-07), cbsnews.com/miami (10-07, likely mis-tag).
- **Donalds** live (8): cfpublic.org, flvoicenews.com ×3, floridabulldog.org, cbsnews.com/miami, floridianpress.com, local10.com. Pending (11): wlrn.org, nbcmiami.com, diariolasamericas.com, floridianpress.com ×6, flvoicenews.com ×2.
- **Jolly** live (6): cfpublic.org, cltampa.com, flvoicenews.com, local10.com (es), cbsnews.com/miami, floridianpress.com. Pending (6): floridianpress.com ×4, nbcmiami.com, diariolasamericas.com.
- **Nixon** live (7): orlandoweekly.com, sfltimes.com, cltampa.com ×2, floridianpress.com ×2, floridadaily.com. Pending (2): flvoicenews.com, thewestsidegazette.com.

## SQL used (all SELECT)

```sql
-- schema
select table_name, column_name, data_type from information_schema.columns
 where table_schema='public' and table_name in ('news_item','review_item','candidate');

-- candidate ids
select candidate_id, legal_name, party, office_sought from candidate
 where legal_name ~* '(donalds|jolly|burkett|abrams|russo|datto|dimanche|jewett|nixon|moody|gillespie)';

-- review_item shape (candidate referenced via payload->>'candidate_id')
select kind, source, status, count(*), (array_agg(payload::text))[1]
 from review_item where payload->>'item_type'='candidate_news' group by 1,2,3;

-- per-candidate counts
select c.candidate_id, c.legal_name,
 (select count(*) from news_item n where n.candidate_id=c.candidate_id and n.item_type='candidate_news'
    and n.published_at >= '2026-09-09' and n.published_at < '2026-10-10') live_in_window,
 (select count(*) from review_item r where r.status='pending' and r.payload->>'item_type'='candidate_news'
    and r.payload->>'candidate_id'=c.candidate_id
    and (r.payload->>'published_at')::timestamptz >= '2026-09-09') pending_in_window
from candidate c where c.candidate_id in (...12 ids...);

-- outlets for Moody + baselines (live union pending)
select 'live', candidate_id, source_id, published_at::date, title, url from news_item
 where item_type='candidate_news' and candidate_id in ('FL-DOE-89119','FL-DOE-89042','FL-DOE-89243','FL-DOE-90009')
union all
select 'pending', payload->>'candidate_id', payload->>'source_id', (payload->>'published_at')::date,
       payload->>'title', payload->>'url' from review_item
 where status='pending' and payload->>'item_type'='candidate_news'
   and payload->>'candidate_id' in (...same 4...);

-- ingest window
select min(created_at), max(created_at), min((payload->>'published_at')::timestamptz)
 from review_item where payload->>'item_type'='candidate_news';

-- untagged-name scan
select count(*) filter (where title ilike '%moody%' or summary ilike '%moody%'), ...
 from news_item where published_at >= '2026-09-09';

-- did the missed Moody URLs ever arrive?
select ... from news_item / review_item where url ilike '%democrats-slam-ashley-moody%'
 or url ilike '%3869181%' or url ilike '%wusf.org%';   -- 1 unrelated wusf row only

-- registered outlets
select string_agg(source_id, ', ') from source where source_id like 'outlet:%';
```

## Search strings used (WebSearch)

- `"Ashley Moody" Senate October 2026` (extended)
- `Sen. Moody Florida news`
- `"Ashley Moody" "Angie Nixon" poll`
- `Moody Nixon Florida Senate race politico OR thehill OR rollcall`
- `"Moody" Florida Senate debate Nixon floridapolitics OR tampabay OR miamiherald`
- `"Charles Burkett" governor Florida`; `Burkett Surfside governor campaign independent September 2026`
- `"Jeff Datto" OR "Dr. Jeff Datto" governor Florida`
- `"Moe Dimanche" OR "Moliere Dimanche" governor`
- `"Scott Jewett" Libertarian governor Florida`
- `"Dean Abrams" OR "Dean Ocean Abrams" Florida governor`
- `"Frank Russo" Florida governor NPA 2026`; `Frank Russo governor candidate news September October 2026`
- `"Neil Gillespie" Senate Florida 2026`
- `Florida governor independent minor-party candidates ballot Burkett Jewett October 2026` (extended)
- `"Byron Donalds" governor wusf OR wlrn OR local10 OR nbcmiami September 2026`
- `"David Jolly" governor campaign September 2026`
- `"Angie Nixon" Senate campaign September 2026`
- WebFetch: NBC Miami 3869181 (confirmed 2026-10-07, Moody in headline); Palm Beach Examiner Substack (10-07, cites no outlets).

## Example outside URLs (max 3 each)

- **Moody**: https://www.wusf.org/politics-issues/2026-10-01/democrats-slam-ashley-moody-amid-heated-us-senate-race ; https://www.nbcmiami.com/elections/poll-shows-ashley-moody-leading-angie-nixon-in-floridas-u-s-senate-race/3869181/ ; https://jaxtoday.org/2026/09/13/opinion-moody-debate-dodge-does-voters-disservice/
- **Nixon**: https://www.wusf.org/politics-issues/2026-09-07/how-us-senate-candidate-angie-nixon-plans-to-reach-florida-voters ; https://weartv.com/news/local/democrat-angie-nixon-campaigns-in-pensacola-for-floridas-vacant-us-senate-seat ; https://www.newsweek.com/ashley-moody-sounds-alarm-as-second-poll-shows-dead-heat-with-angie-nixon-12465288
- **Gillespie**: https://www.nbcmiami.com/elections/poll-shows-ashley-moody-leading-angie-nixon-in-floridas-u-s-senate-race/3869181/ (passing mention) ; https://floridaphoenix.com/voter-guides/contests/2026-general-u-s-senate/ (guide, not news)
- **Donalds**: https://www.nbcmiami.com/news/local/gov-desantis-endorses-fellow-republican-byron-donalds-for-governor/3853840/
- **Jolly**: https://floridaphoenix.com/2026/09/14/republicans-for-jolly-effort-launches-in-st-petersburg/
- **Burkett** (out of window): https://www.wlrn.org/government-politics/2026-05-19/former-surfside-mayor-charles-burkett-florida-governors-race
- **Russo** (press release, excluded): https://smb.americanpress.com/article/NEW-POLL-SHOWS-FRANK-J-RUSSO-GAINING-MEANINGFUL-TRACTION-IN-FLORIDA-GOVERNORS-RACE/6a300f9945b635ab6be4e38f
- **Jewett** (out of window / opinion): https://floridianpress.com/2025/11/scott-jewett-announces-libertarian-2-0-bid-for-florida-governor/ ; https://palmbeachexaminer.substack.com/p/scott-jewett-is-on-floridas-2026
- **Abrams, Datto, Dimanche**: none found (voter-guide listings only, e.g. https://ivoterguide.com/race/31360/election/1464)

Limits: the search is a web-search proxy for Google News, not an exhaustive news-archive pull. Counts marked "many" are lower bounds, not tallies. I did not confirm the exact date of every Newsweek, Daily Beast and Courthouse News item for Moody.
