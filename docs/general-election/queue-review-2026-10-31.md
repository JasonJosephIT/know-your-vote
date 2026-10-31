# Queue review 2026-10-31: drafted verdicts for the pending news queue (662 rows)

Decisions file: `queue-review-2026-10-31.json` (648 decisions).

**Drafted, not applied.** Nothing here has been written to the database. The
verdicts publish to voters only when the founder runs the apply script (§5).
Method, rules and safety are the 10-09 and 10-15 ones
(`handoff-backfill-review-2026-10-09.md` §3–4, `queue-review-2026-10-15.md` §2);
this file only records what is new.

## 1. Queue re-read (SELECT only, 2026-10-31)

- `review_item`: 662 pending `manual_news` rows (655 queued since the 10-22
  review, 7 older), plus 1 `candidate_lead` (`f3c0233c`), left pending.
- `news_item`: 581 rows, newest published 2026-10-22. The feed has had no
  new stories for 9 days.
- No pending URL is already in `news_item`.
- The drafted ids were checked against the database: md5 of the sorted ids
  `908559d77a03bacbd007543529b8b706` matches SQL.

## 2. Rules applied

The 10-09 and 10-15 rules, unchanged: the subject test (full name in the title
or dek), one card per candidate per event (earliest passing copy kept), Scope
(other-county stories rejected), off-roster races rejected, polls kept out of
the home column, opinion and Floridian roundups rejected (P1, A2/P2), and the
neutrality lint. New precedents this week:

- **FL-13** is not on our roster; stories about it are rejected (as 10-15 did
  for other off-roster races).
- **Spanish copies** of a Local 10 story already queued in English are DUPs.
- **Broward stories shown to Miami-Dade** are rejected as Scope.
- **Foreign stories** (for example Brazil's Bolsonaro) are rejected as not
  about Florida's ballot.
- **Statewide events** (the Daytona rally, the 4 million early-vote mark):
  the statewide copy is kept and county copies are DUPs.
- A group keeper that fails the subject test is rejected and the next passing
  copy is kept (`5ba6663a` rejected, `a03cb71d` kept).
- 32 same-event groups were collapsed to one card per candidate.

## 3. Left pending: founder questions (14 rows)

| Row | Label | Question |
|---|---|---|
| `28193c6a` | Singer · 2026-10-07 · Resurfaced Image Shows Scott Singer Meeting With Senior Qata | Founder question from 10-15 still open (P1 or reporting). |
| `6e59d99c` | Jolly · 2026-10-28 · Resurfaced Video Of David Jolly's Support for Cuban Consulat | Same question as the 10-15 Singer image row: the dek says resurfaced footage 'leaves voters questioning' Jolly. Reporting, or opinion shown as reporting (P1)? |
| `03c2a5f4` | election news · 2026-10-12 · Annette Taddeo Accuses Blaise Ingoglia of Corruption in CFO | Founder question from 10-15 still open (re-queue under Taddeo). |
| `d4e04424` | election news · 2026-10-23 · Green’s funding lags in CD9 race, even with $1.8M loan to hi | Pipeline gap: an FL-9 candidate story (Green, Soto) filed as election news. Re-queue under the FL-9 candidates, then reject this copy? |
| `03b54d66` | election news · 2026-10-15 · Bilirakis vs. Overman: Meet the candidates running for Congr | Held 10-22: an FL-12 candidate story filed as election news (re-queue under the candidates?). |
| `737c058b` | election news · 2026-10-20 · Castor vs. Beltran: Meet the candidates running for Congress | Held 10-22: an FL-14 candidate story filed as election news (re-queue under the candidates?). |
| `e7d4ffc7` | election news · 2026-10-29 · Ingoglia vs. Taddeo: Meet the candidates running for Florida | Pipeline gap: a CFO race story (Ingoglia, Taddeo) filed as election news; same question as 10-15 (re-queue under the candidates?). |
| `806b5f8a` | election news · 2026-10-30 · What Florida's governor and attorney general candidates say | Pipeline gap: a story on the governor and attorney general candidates filed as election news. Re-queue under the four candidates? |
| `e6242d3b` | election news · 2026-10-10 · House candidate who reported rape on campaign trail on why s | Founder question from 10-15 still open (district and roster). |
| `2ff3d4f9` | election news · 2026-10-13 · Annette Taddeo’s CFO campaign starts to get state dollars | Founder question from 10-15 still open (re-queue under Taddeo). |
| `bf9db277` | election news · 2026-10-14 · Candidates for redrawn 22nd District talk high prices | Founder question from 10-15 still open (re-queue under the FL-22 candidates). |
| `cadfda8c` | election news · 2026-10-22 · Florida attorney general candidate has strong words for curr | Pipeline gap: an attorney general race story (Rodriguez on Uthmeier and Hope Florida) filed as election news. Re-queue under the candidates? |
| `2c366c90` | election news · 2026-10-30 · For voters from immigrant families and new citizens, voting | Can't tell from the title and summary whether this is about Florida voters. Approve as voting in Florida, or reject as national? |
| `b62278cd` | election news · 2026-10-30 · Ingoglia vs. Taddeo: What Florida's CFO candidates say about | Pipeline gap: a CFO race story (Ingoglia, Taddeo) filed as election news; same question as 10-15 (re-queue under the candidates?). |

These are not in the decisions file and stay pending after the apply.

## 4. Counts and checks

| Verdict | Rows |
|---|---|
| Approve | 182 |
| Reject | 466 |
| Held (§3) | 14 |
| **Total** | **662** |

- **Sources:** every approved row comes from an outlet listed in
  `src/lib/news-sources.ts` (18 outlets among the approvals, 19 across the queue).
- **Lint:** every pending row that trips the neutrality lint is a reject; no
  approval contains a banned term.
- **Balance (approvals per race):** Senate Moody 11, Nixon 11; Governor
  Donalds 27, Jolly 18, Jewett 1; Attorney General Uthmeier 10, Rodriguez 5;
  Agriculture Atkins 2, Simpson 2; FL-25 Moskowitz 4, Singer 4; FL-26
  Diaz-Balart 2; FL-27 Salazar 2; FL-28 Gimenez 1, Ehr 1; FL-22 Askar 1,
  Dandiya 1; FL-14 Castor 1, Beltran 1; FL-9 Green 2; FL-10 Frost 1; FL-8
  Jenkins 1; Orange mayor Messina 1, Russell 1. Election news: statewide 5,
  Miami-Dade 28, Hillsborough 23, Broward 1, Orange 14.
  The gaps follow how much each candidate was covered this week; no verdict
  was changed to even them out.

## 5. Apply (founder's step)

Applying publishes 182 stories to voters. With `NEXT_PUBLIC_SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY` in `.env.local`:

```
node scripts/apply-queue-review-2026-10-15.ts --decisions docs/general-election/queue-review-2026-10-31.json
```

That is a dry run. If it reports no failures, run it again with `--apply`.
The script is fail-closed and stops on the first failure. Rows queued after
2026-10-31 are untouched and go to next week's review.
