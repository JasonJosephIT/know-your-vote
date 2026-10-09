# Why in-window Moody stories never reached the queue (2026-10-09)

Follows `source-check-2026-10-09.md` (PR #151), which found that Sen. Ashley Moody's
single live item is a pipeline gap and not real-world skew. Under the founder's
2026-10-09 rule, our own gaps are fixed in the pipeline. Nothing in this PR adds or
edits a news row.

## What R1 actually ran

`agent_run` and `review_item` (source `agent:R1`), read 2026-10-09:

| Run (UTC) | How | Queued | Earliest `published_at` queued |
| --- | --- | --- | --- |
| 10-06 16:40 and 19:55 | hand run (candidate rows, then election rows) | 47 + 43 | 09-29 |
| 10-08 11:00 | cron | 59 | 10-06 |
| 10-09 11:00 | cron (`depthLine`: wusf.org 14.9h, cbsnews.com/miami 18.2h, wtsp.com 21.1h, thewestsidegazette.com 21.9h) | 29 | 10-08 |

No run on 10-07: the cron ran Mondays and Thursdays until it went daily. The sweep
window is 14 days, but a feed only holds its last N items, so **feed depth, not the
window, decides what a run sees.**

## Root causes

### 1. WUSF's feed holds about half a day (fixed in this PR)

`https://www.wusf.org/news.rss` holds its last **10 items**: 11.7h to 14.9h deep when
measured on 10-09. "Democrats slam Ashley Moody amid heated U.S. Senate race"
(`/politics-issues/2026-10-01/…`) had left the feed days before R1's first run on 10-06.
Even with a daily run, WUSF lost the ~9–12 hours of stories between runs. That is why
WUSF produced only one item in the whole period.

**Fix.** WUSF's robots.txt names a Google News sitemap,
`https://www.wusf.org/news-sitemap-content.xml`. It sits under `User-agent: *` with no
AI-agent rules, holds ~2 days (~160 entries) and carries titles. This PR reads it as a
**backstop** beside the feed:

- `OutletSitemap.daily` may now be a rolling URL with no `{yyyy}{mm}{dd}`. `runSweep`
  dedupes the window's URLs, so a rolling sitemap is fetched once per run.
- An outlet may carry both a `feed` and a `sitemap`. Where both carry a story, `sweep()`
  keeps the feed's entry in either order, because only the feed has a dek and an image.
  A story only the sitemap still lists is kept, title only, like the Tribune rows.
- The include filter keeps WUSF's own sectioned stories (`/<section>/YYYY-MM-DD/<slug>`).
  It drops the unsectioned `/YYYY-MM-DD/…` paths. On 10-09 those were ~130 of ~160
  entries, mostly NPR network stories that would otherwise reach the queue under
  WUSF's name.
- The depth row for an outlet with a rolling backstop counts the backstop's included
  entries. If the sitemap fetch fails, the row falls back to the feed alone, so a
  failure still shows as shallow.

Measured live on 10-09: WUSF goes from **10 articles at 11.7h deep to 32 at ~47h deep**
for one run. The same equal treatment applies to every outlet: any outlet can get a
backstop this way.

### 2. NBC Miami 3869181 was never a feed item (not fixed: founder call)

NBC's feed (`https://www.nbcmiami.com/?rss=y`) is a curated homepage feed of ~50 items.
On 10-08 and 10-09 it carried the hub story **3869071** ("Decision 2026: Donalds leads
Jolly … See full results"). The hub *links* the Senate story 3869181 in its body, but
3869181 never appeared as an item of its own. The matcher reads the title and the dek
(`DEK_MAX` 400) only, so the hub was tagged to Donalds and Jolly. Moody and Nixon
appear further down its body and were not seen. That is the matcher working as
specified, not a name-matching bug.

**Why this is not fixed here.** NBC's robots.txt, read 2026-10-09, has a block for
`anthropic-ai`, `Claude-Web` and `ClaudeBot` that ends in `Disallow: /`. The
`nbcmiami.com` row in `news-sources.ts` records no AI-agent rules (a 09-17 snapshot).
Under the 2026-09-21 AI-crawler policy (`AI_POLICY_HOLD`), an outlet whose robots.txt
names a Claude agent is held. Recording the new robots data would therefore **stop NBC
being read**. Reaching further into NBC (its `sitemap-news.xml`) would deepen reading of
a site that has asked Claude agents not to read it. Either step is the founder's call.
This PR does neither.

### 3. 09-09 to 10-05 was never reachable

R1 first ran on 10-06. With feeds hours to days deep, nothing published before about
09-29 could be seen, for any candidate. This applies equally to everyone, baselines
included.

## The backfill (built 2026-10-09)

`scripts/news-backfill.ts` (runbook §9) reaches back through each outlet's own
archive. Its output goes to the same matcher and the same pending queue as the
cron, via `news-enqueue.ts --candidates-only`. Every usable outlet has an entry in
`news-backfill.ts` `ARCHIVES`.

**Read-only run, 2026-09-09 to 2026-10-09** (GET requests plus a roster read;
nothing written):

| How the outlet was reached | Outlets | Reach |
| --- | --- | --- |
| Paged WordPress feed (titled, with deks) | wsvn, lefloridien, floridabulldog, thewestsidegazette, sfltimes, floridadaily, flvoicenews, floridianpress | back to 09-09/10/11 |
| URL archive sitemap, page heads read when the slug names a roster surname | wlrn, wusf, cfpublic, wfsu, cbsnews.com/miami, diariolasamericas, local10, fox35orlando, cltampa, orlandoweekly | back to 09-09/10/13/14; orlandoweekly to 09-24 |
| No archive; current feed only | americateve (feed reaches 09-09), wtsp (10-08), wftv (10-07) | partial |
| **Skipped**: robots.txt shuts Claude agents out of `/` | nbcmiami, clickorlando, newsserviceflorida | none |

The run produced 2,372 articles. The enqueue dry run against the live roster
gave 457 candidate attachments (449 named, 8 related). **377 are new**; 80
were already queued or published. For the statewide races:

| Candidate | New pending rows | Of them published before 09-30 |
| --- | --- | --- |
| Ashley Moody | 26 | 17 |
| Angie Nixon | 39 | 25 |
| Byron Donalds | 79 | 63 |
| David Jolly | 74 | 65 |

The minor gubernatorial candidates and Gillespie still have **zero**. That
confirms the source check's real-skew call for them. The missed WUSF 10-01
Moody story is among the new rows.

**What the slug pre-filter costs.** This was measured on the titled feeds,
where every matched story is known. Of 339 named matches, 240 have the
candidate's surname in the URL.
- Of stories naming the candidate **in the headline**, 240 of 255 (94%) would
  pass the pre-filter.
- Of stories naming them **only in the summary** (mostly roundups), 84 of 99 would not.

So the URL-archive outlets under-reach summary-only mentions. The rule is the
same for every candidate, so the loss is by outlet, not by candidate.

**Not done: the live enqueue.** It would add 377 pending items to the /admin
queue before the 10-18 content freeze. It needs a go-ahead.

```bash
node scripts/news-backfill.ts --from 2026-09-09 --report backfill-report.json > backfill.json
node scripts/news-enqueue.ts --candidates-only < backfill.json
```

## The two side questions

**(a) CBS Miami AG preview tagged to Moody.** Pending `review_item`
`58851a16-b24e-417c-b716-10721aed7261`, "Previewing the race for Florida's Attorney
General: Jose Javier Rodriguez vs James Uthmeier". Its dek says Uthmeier "was appointed
by DeSantis to replace Ashley Moody last year". A full name in the dek is a `named`
match by rule (PRD §6), so the matcher behaved as specified. The story is not about
her. The operator should **reject** it in /admin. That is the review step doing its
job. No code or DB change.

**(b) Neil J. Gillespie's two rows.** `FL-DOE-89955` (United States Senator,
`qualified`, `ballot_status 'ballot'`, in `FL-SEN-general`, FEC S6FL00863) is the real
candidate. `FL-DOE-89224` ("Neil J Gillespie", Governor) is `withdrawn`,
`ballot_status 'excluded'`, with no profile and no race. It is a withdrawn filing that
DoE kept under its own id. Both are stored correctly and nothing shows the Governor row.
No change, so **no migration and no number claimed.**

## Follow-ups (not in this PR)

- **Other shallow feeds (10-09):** cbsnews.com/miami 18.2h, wtsp.com 21.1h,
  thewestsidegazette.com 21.9h. Possible backstops: CBS's national
  `xml-sitemap/news.xml` filtered to `/miami/`; WTSP's `/feeds/googlenews`, which is
  mostly nation-world syndication and needs a local filter; Westside Gazette has only
  Yoast post sitemaps, with no titles. Each needs its own include filter and a check.
- **NBC Miami robots.txt and the AI-crawler hold.** Founder call, see §2.
- **Archive backfill live enqueue.** Needs a go-ahead, see above.
- **clickorlando.com and newsserviceflorida.com** also shut Claude agents out
  in robots.txt (2026-10-09), and neither is on `AI_POLICY_HOLD`. This is the
  same founder call as NBC.
