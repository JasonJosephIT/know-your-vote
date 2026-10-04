# Launch handoff: what remains before Election Day (2026-10-04)

Know Your Vote is live at knowyour.vote. This file lists what is left between now and **Election Day, 2026-11-03**, in priority order. Each item says who acts: **Founder** (a decision or an account only the founder holds) or **Agent** (work a Claude session can do once the decision is made).

The live database was checked directly on 2026-10-04 at about 18:40 UTC. Where a repo document disagrees with it, this file follows the database and says so.

## Key dates

| Date | What | Status |
| ---- | ---- | ------ |
| 2026-10-05 (Mon) | Voter registration deadline | `verified_by` set |
| 2026-10-22 | Vote-by-mail request deadline | `verified_by` set |
| 2026-10-24 to 10-31 | Early voting | `verified_by` set |
| 2026-11-03 | Election Day, and the deadline for mail ballots to be received | `verified_by` set |

All six `general_2026` rows in `election_event` are verified, `ballot_return_deadline` included. Some older docs (`sessions/README.md`) still say that deadline is unverified. They are stale.

## Where things stand

- **Races: 53 in total.**
  - **36 are published with a brief:** FL-GOV, plus the 35 published today (`brief-runs/apply-2026-10-04.md`).
    - Every published profile passed the Balance Audit at `word_count_pct = 150`.
    - The 35 new briefs hold 435 verbatim quotes, all from candidates' own sites.
  - **17 are listed:** the roster shows, with no brief, because no candidate in them has a usable claim (`brief-runs/step4-2026-10-03.md`).
- **Candidates:** 299 rows. 97 of the 106 ballot candidates have a verified official site.
- **Ballot measures:**
  - Amendments 2 and 3 are published.
  - Amendment 1 is `listed`, showing neutral resources only.
- **Demo fixtures:** no `demo-*` race remains in the live database. Roadmap launch step 2 ("remove every demo row") is done, although `product-roadmap.md` still says "not started".
- **Crons** (`vercel.json`): `refresh-news` runs daily at 10:00 UTC and `send-reminders` daily at 14:00 UTC.
- **Email reminders:** **0 subscribers, and `notification_send_log` is empty.** No reminder has ever gone out in production. The send path has never been exercised end to end.
- **News:** the latest `news_item` is dated 2026-09-09, and the candidate-news inlet has never run.

## 1. Before anything else: trust copy (Founder approves, Agent drafts)

The single biggest launch risk is that the methodology page promises things the published briefs do not do.

- **`src/app/(public)/methodology/page.tsx`** says three things the published briefs do not do:
  - The audit checks "the number of verified facts and fact-checks per candidate" against "fixed thresholds" (lines 128-136).
  - Briefs cover what a candidate says, has done and what is true.
  - Its scrutiny table shows facts and fact-checks per candidate (lines 162-195).
- **What actually shipped:**
  - Every one of the 82 published profiles has `verifiable_fact_count = 0` and `fact_checks_performed = 0`. Only stated positions are published.
  - The `word_count` gate runs at 150%, a threshold the founder chose, so in practice it never holds a race back.
- **Do:** rewrite the page to describe what ships:
  - verbatim quotes from candidate sites only;
  - the commitment gates and reviewer passes;
  - the spine fixed by office;
  - silence recorded as "No stated position found";
  - the audit thresholds as they are actually set.

  Either hide the facts and fact-checks columns, or label them as not yet collected.
- **Also decide:**
  - Whether the site needs a terms-of-use or disclaimer page (only `/privacy` exists), with a "not affiliated with any candidate or party; no endorsement" line.
  - **Ads.** The Google Ads tag loads after cookie consent (commits `0a628e8`, `d44a89f`), but `docs/prd.md` still promises analytics through Plausible only and no PII to third parties (lines 186-191, 693). Confirm the choice and update the PRD and `docs/scope-changes.md`, or remove the tag.

## 2. This week

1. **Done: the 35 new race pages render.** A sample of six (FL-SEN, FL-10, FL-8, FL-ORA-MAYOR, FL-HIL-CC1, FL-AGR) was checked live at 19:13 UTC. It is recorded under "Live pages" in `brief-runs/apply-2026-10-04.md`.
2. **Test the reminder pipeline once, end to end** (Founder + Agent).
   - Subscribe a test address.
   - Confirm `CRON_SECRET`, `RESEND_API_KEY` and `EMAIL_FROM` are set in Vercel production.
   - Trigger `/api/cron/send-reminders`, or wait for 14:00 UTC, and check `notification_send_log`.
   - The next real sends are the VBM-request reminder before 10-22, the early-voting reminder before 10-24, and Election Day.
3. **Make the reminder signup visible** (Founder decision). With 0 subscribers, the feature does nothing for voters unless people are pointed to it.
4. **Update the stale docs** (Agent):
   - the status line and the 9-07 tables in `product-roadmap.md`;
   - the `ANTHROPIC_API_KEY`/quiz section in `README.md` (the quiz was removed: `quiz-clipped-2026-09-25.md`);
   - the "unverified deadline" note in `sessions/README.md`.

## 3. Briefs and candidates (by about 10-20, before early voting)

**Founder decisions:**

1. **The 17 listed races.** Is "listed, no brief" acceptable on Election Day for:
   - FL-CFO;
   - Broward CC2, CC4, CC6, CC8, SB6 and SB At-Large 8;
   - Miami-Dade SB2 and SB8;
   - Hillsborough SB4 and SB6;
   - Orange CC4, CC6, Clerk, SB1, SB3 and SB Chair?

   In 6 of them, no candidate has a site at all.
2. **Intermittent bot walls.**
   - Taddeo (FL-CFO) and Shuham (Broward CC6) were readable on 09-25 and walled on 09-29.
   - The "one identical re-run" rule left them silent.
   - Allow one more re-run for sites that read before? Taddeo's would likely give FL-CFO a brief.
   - Never solve a captcha.
3. **Silent candidates.**
   - Bot walls: Abrams (GOV), Piper (DAD-CC5), Beltran (FL-14), Dandiya (FL-22).
   - A robots.txt opt-out: Quiñones Hernández.
   - The 9 ballot candidates with no verified site, Datto among them.

   Is a second source allowed, such as official social posts or questionnaires? If not, they stay "No stated position found".
4. **A refresh before early voting.** Briefs are a snapshot of the 2026-09-29 ingest. Decide whether to re-ingest before 10-24, and the cut-off.
5. **Bio section.** FL-GOV decision D1 promised "a bio section for every candidate" (`brief-runs/FL-GOV/decisions.md`). It is not built: `brief-rows.ts` emits stated positions only. Build it, or drop the promise.
6. **Known quality limits.** Accept them, or fund fixes:
   - the commitment gate's recall of about 0.85;
   - the 8-page crawl cap;
   - A1's wording also catching health insurance;
   - FL-27 and FL-AGR having no spine coverage at all.

**Agent work:**

- **Re-ingest procedure.** Repeat the 09-29 to 10-04 flow:
  - ingest, then Jev;
  - review;
  - the founder's yes;
  - apply, check fingerprints, audit, read back as `anon`, publish.

  Follow `brief-runs/apply-2026-10-04.md`. **MCP `DELETE`s hang**, so rebuilding a published race needs a non-MCP SQL session for its deletes. Alternatively, take the race to `listed` first.
- **Candidate checks:** confirm Dennison (FL-7) with the LPF, and Colucci's site, which is hacked and stored as NULL (`candidate-conflicts-2026-09-25.md`).

## 4. Ballot measures (Founder)

- **Amendment 1:** publish with the thin sided sources (two Substacks), or keep the neutral-only page (`measure-resources-verified-2026-09-24.md`).
- **Judicial retention** (Justice Muñiz statewide, and the DCA judges) is on every ballot and not modelled. Add it, or say on the site that it is out of scope (`ballots-handoff.md`).

## 5. News and stream

- **The candidate-news inlet** (Agent): it is unblocked now that profiles exist. Run sweep, then enqueue, then characterize. First scope the characterizer to news only (`news-ingest-order-results-2026-09-23.md`).
- **Founder calls before `candidate_news` goes live:**
  - N, the number of news slots per candidate (`stream-surface-handoff.md`);
  - how to match surnames that are also common words;
  - whether a policy story that names no candidate gets an inlet.
- **Migration 0014** (news source required) is not applied. The admin approve path must set `source_id` first.
- **`verify-news-ungated.ts` is red on main.** Its rule needs rewriting (`things-to-confirm.md`).
- **Refresh agents R1–R4** run as Cowork tasks on the founder's Mac. Moving R3 to a daily cron in the final weeks, as planned in `refresh-agents-plan.md`, has not happened.

## 6. Cut for Nov 3 unless the founder says otherwise

- **SMS.** Twilio toll-free verification alone takes 1–3 weeks and was never started.
- **Web push.**
- **County district placement.** The boundary GeoJSON exists, but nothing reads it, so county races are listed per county.
- **Statewide ZIP coverage beyond the four counties.**
- **A quiz replacement** (`quiz-clipped-2026-09-25.md`).

## 7. Infra and ops (Founder)

- **CI.** Only Vercel runs on a PR, so none of the `verify-*` scripts or Python tests gate merges. Add a GitHub Action?
- **Production env.** Confirm `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`, the Sentry DSN and `PELIAS_BASE_URL` are set.
- **Admin console.** Enable Supabase Auth and set `ADMIN_EMAILS`, plus the Vercel and Sentry tokens (`admin-dashboard/roadmap.md`).
- **Performance and accessibility.** Run a Lighthouse and screen-reader pass on real content. FL-SEN now has 64 quotes; the earlier checks ran on demo fixtures.

## Founder decisions at a glance

1. Approve the methodology rewrite, and decide on a terms page.
2. Ads versus the PRD's privacy promise.
3. Promote the reminder signup.
4. "Listed" as the Election Day state for 17 races.
5. One more re-run for intermittent bot walls.
6. A second source for silent candidates.
7. Refresh briefs before 10-24, and the cut-off.
8. Build or drop the bio section.
9. Amendment 1: publish or hold.
10. Judicial retention.
11. News: N slots, common-word surnames, the policy inlet, migration 0014.
12. Confirm the cuts in section 6.
13. A CI action.
