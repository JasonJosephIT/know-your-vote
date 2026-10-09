# Handoff: review the 2026-10-09 news backfill (360 pending rows)

**From:** backfill review prep session, 2026-10-09 (read-only SQL, ~20:49 UTC)
**Founder direction (2026-10-09):** process the backfill the founder approved
and enqueued at 16:41:42 UTC (`moody-pipeline-gap-2026-10-09.md`, "Live
enqueue"). Standing rule (`AGENTS.md`): **neutrality governs our conduct, not
the world's.** Fix pipeline gaps only. Never pad or trim to even out counts.

**Every approve and every reject is a DB write. The founder makes each one in
/admin (an agent cannot sign in, §3). The session writes nothing to the DB
without the founder's explicit OK in that session.** Re-read all counts with
SELECT-only queries before you start. The 11:00 UTC sweep adds rows daily.

## 1. Goal and scope

Decide each row on its own merits, one at a time. Then re-run the source
check for FL-GOV and FL-SEN on the decided counts.

**The batch (B):** `review_item` where `source='agent:R1'` and
`date_trunc('second', created_at) = '2026-10-09 16:41:42+00'`. That is 360
rows, all `manual_news` / `candidate_news` / `pending`, from
`news-enqueue.ts --candidates-only`, published 09-09 to 10-05 UTC (0 outside).
`review_item` has no candidate, race, relation or outlet (`source_id`) column;
read them from `payload`. Its `source` column is the proposer (`agent:R1`), not
the outlet (`0006_admin_ops.sql:57-71`).

**Not in the 360:**
- NBC Miami, ClickOrlando and News Service of Florida: skipped whole
  (robots.txt shuts Claude agents out of `/`).
- NBC Miami Senate-poll story 3869181: still missing. It was never a feed item
  of its own, and the matcher reads only the title and dek.
- Partial reach: wtsp (to 10-08), wftv (10-07), orlandoweekly (09-24).
  URL-archive outlets miss summary-only mentions (84 of 99 would not pass).
- 88 daily-cron R1 rows and 1 R5 lead (queue total 449). Out of scope, except
  the CBS AG preview `58851a16` in the 10-08 batch (§7).

## 2. Current state

| Race | Rows | Candidates (rows) |
|---|---|---|
| FL-GOV | 145 | Donalds 74, Jolly 71 |
| FL-SEN | 63 | Nixon 37, Moody 26 |
| FL-ATG | 54 | Uthmeier 49, J.J. Rodriguez 5 |
| FL-27 / FL-25 / FL-22 | 23 / 17 / 15 | Salazar 21, E. Rodriguez 2 · Moskowitz 9, Singer 8 · Dandiya 9, Askar 6 |
| FL-7 / FL-9 / FL-14 | 10 / 7 / 5 | Dalton 5, Elijah 5 · Soto 4, Green 3 · Castor 4, Beltran 1 |
| FL-AGR / FL-28 | 5 / 4 | Simpson 5 · Gimenez 3, Ehr 1 |
| FL-26 / FL-8 / FL-20 | 3 each | Diaz-Balart 2, Locklin 1 · Haridopolos 2, Jenkins 1 · Wasserman Schultz 3 |
| FL-10 / FL-12 / FL-15 | 1 each | Frost · Bilirakis · Lee |

All 29 candidates are on the ballot and in the tagged race (0 mismatches). 353
rows are `named`; 7 are `related` (Salazar 5, Gimenez 1, Moody 1).

**By outlet** (rows/URLs; all 16 registered, all `lean_tag='unrated'`):
floridianpress 126/89, flvoicenews 110/79, wlrn 31/22, wusf 21/16, cltampa
18/13, floridadaily 14/10, cbsnews.com/miami 11/8, local10 11/11, then 8
outlets with 1 to 4 rows each. The Floridian and Florida's Voice make up 236
of 360 (65.6%), shown as it is, not corrected. **By week published** (week
starting): 09-07: 36 · 09-14: 104 · 09-21: 113 · 09-28: 100 · 10-05: 7.

**Duplicates.** 263 distinct URLs. 87 are tagged to 2 or 3 candidates (184
rows), and 17 span more than one race (44 rows). 8 syndicated headlines sit at
2 URLs each (23 rows): WLRN/WUSF ×6, WLRN/CFPublic ×1, WFSU/WUSF ×1. Two
WLRN/WUSF "Give 'Em Hell" ad stories differ by one word and make a 9th pair.
Nothing overlaps `news_item`, past decisions or the cron batches.

**Likely mis-tags and passing mentions.** A name-absent test finds 0, because
the matcher needs the name. These were found by reading:

| id | Tagged | Story |
|---|---|---|
| 5d3243a9 | Frost | Jolly accepts $50,000 from Pritzker (Frost was at the rally) |
| 6f1c0a61 | Uthmeier | Simpson ... 4,500 Acres (Cabinet roster mention) |
| c3b85605 | Donalds | Florida Officials Commemorate ... 9/11 |
| 0246db79 | Dalton | Take Back Florida Initiative (1 name of 14) |
| a585ff28 | Donalds | VIDEO: Republicans Counting on Culture Wars |
| 9d9246e6 | Moody | Bernie Sanders ... Support Angie Nixon (Moody named as the opponent) |
| 9473b867 | Moody | Angie Nixon responds after JD Vance says... |
| 4abd25ab | Wasserman Schultz | Last Squeeze 9.10.2026 (roundup) |

Also read closely: 12 rows whose title names a candidate in another race but
not the tagged one (a roster-wide surname test returns 16; the other 4 name the
same-race opponent: 3 J.J. Rodríguez stories tagged Uthmeier and 1 Singer
endorsement tagged Moskowitz), and 69 rows whose title lacks the tagged
candidate's surname but whose summary has it (Uthmeier 17, Donalds 13, Nixon 9,
Jolly 7, Moody 6, the rest 3 or fewer).

**Form flags.**
- Roundups: 49 rows / 30 URLs, all Floridian "JUICE" / "Last Squeeze" (Jolly
  13, Donalds 11, Nixon 10, others 4 or fewer). Rejected `[A2/P2]` on 10-06.
- Op-eds: Florida's Voice "Name: thesis" bylines (`011205c4`, `7c1d9e04`,
  `13266670`). The pattern matches 7 rows (6 URLs): those 3, plus 2 quote
  headlines and 2 "Fact Check:" rows. On 10-06, `[AUDIT]` P1 rejected opinion that would show as
  reporting (§4 rule 6).
- 11 rows will fail the approve-time neutrality lint (4 on the title). touts:
  `32181d41` `8590beb0` `9390038d` `0f7fff6d`; momentum: `9b17a2cc` `5d5aa2ca`
  `145fe1c0` `25a053ff`; claims: `79f0d950` `e3d4e2b7`; aims to: `e635ce0c`.
- Text is the outlet's verbatim headline and dek. Summaries average 298 chars
  (max 400), and 227 end in an ellipsis (225 "…", 2 "..."). Past approvals
  were excerpted outside the committed route: of the 47 with a live row, 27
  were cut to 105–355 chars (25 logged in `admin_action.detail.summary_edited`,
  2 not logged), and only 20 kept the payload summary. Also: 7 rows are in
  Spanish (both Le Floridien rows are in English), 1 is a Florida Daily video
  segment (`a585ff28`), 7 summaries are under 80 chars.
- Paid content: Le Floridien `96129427` (Jolly) is a political advertisement.
  Its summary opens "POLITICAL ADVERTISEMENT Content provided and approved by
  the David Jolly for Governor campaign".

**Before counts.** Live = `news_item` candidate_news published 09-09 to 10-09.
No live row for these candidates is from before the week of 09-28.

| Race | Candidate | Live | Pending (backfill + cron) | Past approve / reject |
|---|---|---|---|---|
| FL-GOV | Donalds | 8 | 85 (74 + 11) | 8 / 3 |
| FL-GOV | Jolly | 6 | 77 (71 + 6) | 6 / 3 |
| FL-GOV | Burkett, Abrams, Russo, Datto, Dimanche, Jewett | 0 | 0 | none |
| FL-SEN | Nixon | 7 | 39 (37 + 2) | 7 / 3 |
| FL-SEN | Moody | 1 | 28 (26 + 2) | 1 / 0 |
| FL-SEN | Gillespie (FL-DOE-89955) | 0 | 0 | none |

## 3. How review works

| Topic | Fact | Ref |
|---|---|---|
| Where | `/admin/queue`. No `/admin/review` page exists, though the runbook says `/admin/review`. Filters: status, kind and source only. It loads everything, oldest first, with no paging (Supabase caps a read at its Max rows, 1000 by default, with no error). In SQL only `created_at` separates backfill rows from cron rows: both are `agent:R1` `manual_news`. | `queue/page.tsx:73-77`, `review.ts:33-46`, `QueueFilters.tsx:13-24`, `news-inlet-runbook.md:29, 235`, `news-intake.ts:283-285, 538-542` |
| Card | Shows the raw `candidate_id`, race, item type, title, summary, `published_at` and URL, plus `created_at` as a relative age only ("5h ago"). Relation, source_id and the review_item id are hidden. Check them in SQL, and find a card by its title or URL, not by the ids in this doc. | `ReviewItemCard.tsx:128-163, 346-357` |
| Decisions | `approve` or `reject`, body `{action, note}` (note trimmed, up to 2000 chars). No edit and no defer; to defer, leave it pending. | `types/admin.ts:250-253`, `DecisionControls.tsx:36-45` |
| Approve | Synchronous. It re-validates the payload, runs the neutrality lint on title + summary (nothing linted these rows at enqueue), resolves the source and checks it against the URL, and may insert the outlet's `source` row if it is missing. Then it inserts `news_item` from the payload fields (zod-trimmed; `source_id` is the resolved one), sets `approved` with `decided_at` and `applied_at`, and writes an `admin_action` row with the signed-in email as actor. | `route.ts:112-224, 297-396`, `effects.ts:85-114`, `news-enqueue.ts:246-294` |
| Fail-closed | HTTP 200, the item stays pending with `apply_error`, and `decision_note` is overwritten with the new note (or null). An `approve` audit row with `applied: false` is still written. It can be retried. 23505 means a `news_item` row already exists for that (url, candidate). That can also be this item's own row: if the final status update fails after the insert, the route returns 500 and the item stays pending. | `route.ts:194-210, 242-256, 405-431` |
| Reject | Sets status, `decided_at` and note, and writes the audit row. It is sticky: the dedupe reads every `manual_news` item in any status, so re-runs never queue that exact (url, candidate) again. A mis-tag cannot be re-tagged: no route edits a payload, and a candidate story from `/admin/submit` gets a 400 from `/api/admin/ingest`, because the form sends no `relation` and the schema requires one. | `route.ts:97-110`, `news-intake.ts:280-322`, `SubmitForm.tsx:94-108`, `types/admin.ts:80-85`, `ingest/route.ts:27-33` |
| Bulk | None. One `POST /api/admin/review/:id/decision` per item; 409 if already decided. | `route.ts:90-95` |
| Auth | Magic link to an `ADMIN_EMAILS` address. The page and the API both check the Supabase session against the allowlist (401/403 otherwise). An agent cannot sign in. On 10-08 Production had no `ADMIN_EMAILS` and no user had ever signed in (checklist A2). | `guard.ts:17-23, 75-101`, `api.ts:17-25`, `login/page.tsx:24-52`, `founder-checklist-2026-10-08.md:48-52` |
| Display | Candidate page: only rows published in the last 30 days, `named` under "In the news" and `related` under "Also about this race". The page and the data cache are each 3600 s, so a new approval can take an hour or more to show. No issue chips while `issues` is NULL, i.e. until `news-characterize.ts` writes them. Approved rows carry a `race_id`, so they also reach `/news` for a ZIP in that race: the newest 50 rows, with no 30-day window and no slot cap. | `briefs.ts:348-380`, `neutrality.ts:57`, `candidates/[candidateId]/page.tsx:13`, `CandidateNews.tsx:27-35, 76-78`, `news-enqueue.ts:410-413, 443`, `news-scope.ts:35`, `api/news/route.ts:97-120` |

- Never bypass the route with service-role SQL: it skips the lint, the source
  check (0014's CHECK is not live, `supabase/migrations/README.md:25`) and the
  audit. Never use the bulk-reject SQL at `news-inlet-runbook.md:308`: it
  rejects **every** pending `agent:R1` `manual_news` row, cron rows included,
  and writes no audit row.
- The 10-06 decisions did **not** go through the route. A Claude Code session
  wrote them to the DB (49 approve, 42 reject in `admin_action`, actor
  `founder via Claude Code (2026-10-06)`, 10-06 22:16 to 10-08 00:02 UTC;
  `founder-checklist-2026-10-08.md:50`). That is the bypass ruled out above,
  not a precedent. Confirm checklist A2 (founder signed in to /admin) first.
- Count approvals from `review_item.status`, not `admin_action`: a fail-closed
  attempt also writes an `approve` audit row (`route.ts:254`).
- Open: operator time. The repo records no /admin pace, and the 10-06 batch
  was written in SQL, so it is no guide to clicking 360 cards.

## 4. Per-item rules

These rules shape the session's drafted verdict for each row. The founder makes
every approve and reject in /admin. Run every check on every row. Tag each note
as on 10-06 (`[DUP]`, `[A2/P2]`, `[AUDIT]`) and give the reason in one sentence.

1. **Subject.** `named` only means the full name is in the title or dek
   (`candidate-news-PRD.md:261`). Reject a passing mention, a list, a roster
   line, or a story about someone else (the CBS AG preview is the worked
   example). Judge per candidate: one URL can fit Jolly and not Frost.
2. **`related`.** Never pick the likely candidate (`candidate-news-PRD.md:264-268`).
   These rows show under "Also about this race" and are left out of R4's
   coverage flag and the expander's count (`CandidateNews.tsx:131-153`,
   `ops-digest.ts:628-640`, `news-slots.ts:185-208`).
3. **In window.** All 360 were published 09-09 to 10-05. Stale display is a
   founder question (§5).
4. **Registered outlet.** An `outlet:` `source_id` must match the URL's
   outlet; the route checks this (`news-enqueue.ts:261-270`). Lean is
   disclosed, never scored, and never a reason to reject.
5. **Neutral wording.** No horse-race words, motive words or comparatives
   between candidates (`refresh-agents-plan.md:178`). A banned term
   (`neutrality.ts:23-50`) in the title or summary fails closed on approve
   (`route.ts:128-141`). Comparatives are not in the lint; judge them by hand.
6. **Form.** Reject roundups `[A2/P2]`, opinion that would show as reporting
   `[AUDIT]`, and syndicated copies `[DUP]` (keep one). The card's label
   comes from the outlet's source row: reporting is unmarked, and only a
   source of type `opinion` gets the opinion treatment (`news-labels.ts:116-134`).
   Give the same form verdict to every copy of a URL.
7. **When unsure,** leave the row pending and write the question down.

> **Neutrality rule.** Never approve or reject to even out counts. Judge each
> item on its own merits. A gap in reject rates between candidates is not an
> error in itself. If one stands out, re-read a sample of every candidate's
> decisions in that race, approvals and rejects alike, against these rules,
> and fix only a rule misapplied. Never tune toward a target.
> (`AGENTS.md:13-21`, `news-fairness.md:138-149, 202-203`)

## 5. Order of work, and who decides

1. Re-read the queue (SELECT only) and confirm the founder can sign in.
2. Get the founder's answers to the table below, N wiring first.

In steps 3 to 7 the session drafts a verdict and note for each row. The
founder makes each decision in /admin.

3. `58851a16`: draft the reject.
4. Form pass: the 49 roundups, the 9 syndicated pairs, then the op-eds.
5. Subject pass: the mis-tag table, the 12 other-race rows, the 69
   summary-only rows.
6. The 11 lint rows, per the founder's call.
7. Race by race: FL-SEN, FL-GOV, FL-ATG, then House races and FL-AGR. Within
   each race go oldest-published first, because those rows age out first.

| Question | Who |
|---|---|
| Each approve or reject, in the founder's signed-in /admin session | Founder, every time |
| Read-only SQL and a drafted verdict plus note for each row | Session |
| Wire `NEWS_SLOTS_PER_CANDIDATE` (3) before mass approval? It is a hard gate (`news-fairness.md:286-287`). Both `<CandidateNews>` call sites pass no `slots` today, so every approved Donalds row from the last 30 days would show on his page, uncapped. Wiring N does not cap `/news`, which shows the newest 50 race-scoped rows. | Founder; session can prep the PR (`candidates/[candidateId]/page.tsx:104, 150`, `news-slots.ts:80-91`) |
| Rows already or nearly past the 30-day window: approve for the record, reject as stale, or leave? | Founder |
| How to cut verbatim deks to a short excerpt: edit the payload first, update afterwards, or add route support? The first two are DB writes outside the route. | Founder |
| Reject all 49 roundups without reading each one? Which copy of a syndicated pair to keep? | Founder |
| The 11 lint rows: restate the headline (the WSVN precedent `f9819278`, restated via Claude Code outside /admin and logged in its `admin_action.detail.title_edited`) or reject? | Founder |
| Op-eds: reject under P1, or add an "Opinion" label? The label comes from the source row's type, and these rows resolve to their outlet's row. A label needs a page-level `source` row of type `opinion` plus a payload edit to point at it: two DB writes (`news-inlet-runbook.md:266-271`). | Founder |
| Polls: the R1 brief bans them (`refresh-agents-plan.md:236`), and the candidate page's section says "no polls" (`CandidateNews.tsx:85-88`), but source-check 10-09 called a poll tag correct | Founder |
| A scripted loop over the route in the founder's browser, or clicks by hand? D10 (approve during the freeze)? D4 (flvoicenews, 110 rows, unheld)? | Founder |

## 6. After review

1. **Recount** batch status, and live `named` rows per candidate for FL-GOV
   and FL-SEN, SELECT only: `news_item` with `item_type = 'candidate_news'`
   and `relation = 'named'`, published in the last 30 days, grouped by
   `candidate_id`. That is what R4's flag counts (`ops-digest.ts:628-640`).
2. **Source check** (`news-fairness.md:186-209`): label each candidate pipeline
   gap, real-world skew or unclear. Gaps from skipped or partial outlets are
   pipeline gaps. Write `docs/general-election/source-check-YYYY-MM-DD.md`
   (`verify-news-surplus.ts:95-97` accepts no other name, so a second check
   dated 10-09 would have to extend the existing file). The 10-09 report
   predates the backfill, and its counts cover only ~9 days of ingest
   (09-30 to 10-08).
3. **Flag PR.** If a label changes, edit `NEWS_SKEW_CHECKS`
   (`news-skew-check.ts:43-54`, keyed by race id: today `FL-SEN-general` is
   `pipeline_gap` and `FL-GOV-general` is `unclear`) and cite the report. The
   expander shows only when the label is `real_world_skew`, `slots` is passed
   **and** the candidate has more `named` stories than N (`news-slots.ts:201-215`,
   `CandidateNews.tsx:79`). Until then a capped candidate shows N cards and
   no expander.
4. **R4.** `news-fairness.md:207-209` says the labels, queries and hit counts
   go in the R1 run report. R4 will not pick them up: it reads only the R2,
   R3 and R5 reports (`agents/r4-ops-digest.prompt.md:98-105`). Its digest
   flags a race when one candidate has at least 3 live `named` stories in 30
   days and at least 3× another's, and prints the counts
   (`ops-digest.ts:52-56, 633-652, 908-913`). It writes no "source check
   owed" line and never picks a label.
5. **Checks** (`news-inlet-runbook.md:286-302`): run `news-characterize.ts`
   (dry run first; TypeSafe key; founder OK). Then the P5 counts, one
   candidate page, and `verify-news-neutrality.ts` live.

## 7. Known defects and deadlines

| Defect | Route |
|---|---|
| CBS Miami AG preview `58851a16-b24e-417c-b716-10721aed7261`, tagged `named` to Moody. It is in the 10-08 batch, so a filter on B misses it. | The founder rejects it in /admin (moody doc (a)). Find the card by its title or URL: the card shows no id. |
| Gillespie has two rows. FL-DOE-89955 (SEN, on the ballot) is the real one. FL-DOE-89224 is a withdrawn GOV filing. | No change and no migration. Count 89955 only. |
| NBC Miami 3869181 missing. The matcher works as specified; NBC's robots.txt blocks Claude. | Founder call. Never hand-add to even out counts (`news-fairness.md:203`). |
| NBC Miami, ClickOrlando and NSF skipped by robots.txt. Neither of the last two is on `AI_POLICY_HOLD`. | Founder call |
| Shallow feeds: cbsnews.com/miami 18.2h, wtsp 21.1h, westsidegazette 21.9h | Follow-up backstops |
| The card hides relation, source_id, the candidate's name and the review_item id, and `/admin/submit` sends no `relation` | Follow-up PR |

**Deadlines.**
- **Display window:** 14 rows are already past 30 days (as of 10-09 20:56 UTC).
  55 will be by 10-15, 113 by 10-18, 241 by 10-26 and 351 by 11-03 (each at
  00:00 UTC that day).
- **Freeze, Sun 10-18 04:00 UTC to Wed 11-04 05:00 UTC** (0050 applied live
  10-09). It does not block approvals: `news_item`, `review_item` and
  `admin_action` have no freeze trigger, and a `source` INSERT always passes
  (`0050_content_freeze.sql:22-40`). D10 (keep approving in the freeze) is
  still unconfirmed. The candidate page that needs `slots` is frozen
  (`freeze-manifest.ts:41`), so **wire N before 10-18**.
- Early voting opens Mon 10-19. Election Day is Tue 11-03.

## 8. Done when

- [ ] Queue re-read (SELECT only), founder sign-in confirmed
- [ ] Founder answers recorded for the §5 table
- [ ] `58851a16` rejected by the founder in /admin
- [ ] All 360 decided by the founder in /admin, or left pending with a written reason
- [ ] Every note tagged with a reason. No decision made to balance counts.
- [ ] Same form verdict on every copy of each multi-candidate URL
- [ ] No row left with `apply_error` and no decision
- [ ] Recount done and new source-check report written
- [ ] `NEWS_SKEW_CHECKS` PR opened if a label changed. N wired, or deferred by the founder, before 10-18.
- [ ] R1 run report updated with the labels (R4 does not read it, §6.4). Characterize and verify steps run.
