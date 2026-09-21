# Handoff — Broward County

**Written** 2026-09-21 · **Live project** `pqracitpmzpiqfnzlngw` · Verified
against the live database and the enacted congressional plan on that date.

Broward came up because a commercial geocoder disagreed with us about it. That
disagreement is now resolved, and chasing it surfaced two more things about
Broward worth writing down — one closed, one open and product-shaped.

---

## 1. The congressional disagreement: we were right, verified

`scripts/probe-district-api.ts` found Geocodio answering **FL-25** for a Broward
point where `block_district` says **FL-22**. Three of four probes agreed, so it
would have been easy to assume our data was the odd one out.

It is not. Checked against the enacted plan itself —
`flsenate.gov/PublishedContent/Session/Congressional/EOGPCRP2026.txt`, the file
`build-block-seed.mjs` is built from:

```
120110702051015,22
```

District **22**. We match; Geocodio does not.

Stronger than a spot check: re-running `node scripts/build-block-seed.mjs` over
a freshly downloaded copy of the enacted plan reproduces the committed
`0026_block_seed_2026.sql` **byte for byte** — 982 ranges, 89,816 blocks, 16
districts. The live table matches at 982 ranges, of which **315 are Broward**,
spanning FL-20, 22, 24, 25 and 26.

That last list is the point. Under the 2024 map Broward touched FL-20/23/24/25;
under the enacted 2026 plan it touches FL-20/22/**24**/25/**26**. Geocodio is
serving the old map, which is why Broward is where it breaks and Orange and
Miami-Dade still agree.

**Nothing to fix. This is a verification, and the answer is that our Broward
congressional data is correct.** Re-verify the same way if it is ever doubted:
regenerate and diff, do not spot-check.

## 2. Broward really does have only one county race in November

Broward has 9 county-level offices on its candidate list and **one** printed
November contest — School Board District 6. For Florida's second-largest county
that looks like missing data. It is not:

| Office | Status |
|---|---|
| County Commission, Dist. 2 | Unopposed |
| County Commission, Dist. 4 | Unopposed |
| County Commission, Dist. 8 | Unopposed |
| County Commission, Dist. 6 | **Elected** in the August primary |
| School Board, Dist. 1 | **Elected** in the primary |
| School Board, Dist. 4 | **Elected** in the primary |
| School Board, Dist. 7 | **Elected** in the primary |
| School Board, At Large 8 | **Elected** in the primary |
| **School Board, Dist. 6** | **Qualified ×2 — the one November contest** |

Two Florida rules produce this. School board races are nonpartisan, so a
candidate taking over 50% in August is elected outright and never appears in
November — that accounts for four seats. Three commission seats drew no
opponent, and F.S. 101.151(7) keeps unopposed candidates off the ballot, the
same rule that keeps FL-10 unprinted.

So `0031`'s single Broward race is correct and complete. **Closed.**

## 3. The open one: eight Broward officials nobody can look up

Those eight seats were decided — they are not hypothetical. A Broward voter in
County Commission District 2 has a commissioner, elected unopposed, taking
office. We hold nothing about them: the roster only ever loaded *printed*
contests, so those candidates are not in `candidate` at all, and the site can
only answer "no race here".

That is worse for Broward than anywhere else. Orange has 12 printed contests,
Hillsborough 29; Broward has 1. A Broward voter checking their local ballot
sees almost nothing, and the reason — *your races were already decided* — is
exactly the kind of thing this product exists to tell someone.

The schema is already built for this. `0023` added `qualifying_status =
'unopposed'` and its comment is explicit: *"an unopposed candidate is still a
ballot-tier filing — briefed, audited, shown"*, and *"an unopposed candidate is
the one who will hold the office"*. `unopposed` is a **qualifying** status, not
a ballot status. The ballots README already applies this to FL-10: the page
should say "elected without opposition", not render an empty comparison.

**Nobody has decided whether that applies to county seats.** It is a founder
call, and it is cheap either way — the data is one VoterFocus read away, the
status codes are already parsed, and the schema already has the vocabulary.

Same question exists for Miami-Dade, where **73** contests were unopposed or
decided. Broward is just where the gap is most visible.

## 4. What Broward's SOE publishes that we are not using

Broward's Supervisor of Elections runs the richest elections GIS of the four
counties — `2026_SOE_GENERAL_USE_MAP___POST_CNG_WFL1`, updated 2026-08-04.
`bro-sb.geojson` came from layer 254 of it. Also there and unused:

| Layer | Why it matters |
|---|---|
| `PRECINCTS - 2026`, `PRECINCTS WITH SPLITS - 2026` | precinct geography; the Census geocoder returns Voting Districts, so precinct → district is a possible lookup path |
| `COUNTY COMMISSION` | the districts behind §3's unopposed seats |
| `CITIES WITH DISTRICTS - 2026` | municipal district geography — see §5 |
| `WATER CONTROL - 2026`, `COMMUNITY DEVELOPMENT - 2025` | the Tier B special districts |
| `Election Day Voting Locations`, `2026 - EARLY VOTING` | polling places, which we do not hold at all |

None of this needs a key. Query pattern is in
`docs/general-election/boundaries/README.md`.

## 5. Municipal — the largest missing piece, and Broward publishes the geography

Broward has 31 municipalities. Municipal contests and local ballot questions
are the one part of the ballot we hold nothing for, and they come only from
county sample ballots. Broward's timing:

- domestic vote-by-mail mails **2026-09-24 → 10-01**
- sample ballots normally post in that window
- checked 2026-09-21: not yet published

Broward is the best county to *start* municipal work in, because
`CITIES WITH DISTRICTS - 2026` already gives the geography — which is the hard
half everywhere else.

## 6. Settled, so nobody re-investigates

- **66% of Broward's land has no school board district.** 93 blocks, 2,069 km²,
  the western Everglades conservation area. They hold **3 people in 1 housing
  unit** — 0.0002% of the county. The layer covers everyone who actually lives
  there. Not a data gap.
- **Broward's school board has 7 single-member districts plus 2 at-large.**
  `bro-sb.geojson` carries 1–7; At Large 8 (and 9) have no boundary by design,
  the same pattern as Hillsborough's countywide seats.

## 7. Re-run it

```bash
# the congressional audit — regenerate and diff, never spot-check
curl -o /tmp/EOGPCRP2026.txt \
  https://www.flsenate.gov/PublishedContent/Session/Congressional/EOGPCRP2026.txt
node scripts/build-block-seed.mjs /tmp/EOGPCRP2026.txt
git diff --stat supabase/migrations/0026_block_seed_2026.sql   # expect: no change

# Broward's county-level contests and their statuses
curl "https://www.voterfocus.com/CampaignFinance/candidate_pr.php?c=broward"
```

```sql
SELECT count(*) FILTER (WHERE county_fips='12011') AS broward_ranges,
       string_agg(DISTINCT congressional_district, ',' ORDER BY congressional_district)
         FILTER (WHERE county_fips='12011') AS broward_districts
  FROM block_district;   -- expect 315 and FL-20,FL-22,FL-24,FL-25,FL-26
```

## 8. Open questions

1. **Do we show unopposed and primary-decided county officials?** §3. The
   schema already says yes for candidates; nobody has applied it to county
   seats. Affects Broward most and Miami-Dade nearly as much.
2. **Is precinct a better lookup key than census block for local races?**
   Broward publishes 2026 precincts and the Census geocoder returns Voting
   Districts. It would be a second geography alongside blocks, which cuts
   against `build-block-seed.mjs`'s same-source rule — but it may be cheaper.
3. **Does municipal start in Broward?** The geography is already published
   there and nowhere else.
