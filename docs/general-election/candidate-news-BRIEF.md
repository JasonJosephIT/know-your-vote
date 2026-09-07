# Agent Brief — the Candidate News session

> Hand this file to the session that builds candidate news. It is the loop
> protocol plus the context that is not obvious from the code. The PRD governs;
> this brief only orients. **Written 2026-09-06; revised the same day after C0.**

## 0. Where the build actually is

| Piece | State |
|---|---|
| `news_item` candidate scoping (`candidate_id`, `candidate_news`, dedupe index) | ✅ applied (`0005`, live `20260704003152`) |
| Ops plane (`agent_run`, `agent_run_request`, `review_item`) | ✅ applied (`0006`, live `20260704003235`) — **0 rows in all four tables** |
| Labelling axes (`source.type`, `source.lean_tag`) | ✅ applied (`0000`) — exist, unused by the app; 87 `source` rows, all demo |
| Neutrality lint (`verify-news-neutrality.ts`) | ✅ built, `--self-test` green |
| Admin console A1 (shell) | ✅ on `main` |
| Admin console A2–A5 (agents API A13, `src/lib/neutrality.ts` A05, approve effects A11) | ✅ on `main` via PR #14 (reconciled 2026-09-06) |
| **R1 agent that writes news** | ✅ **exists** — Cowork task `cap-r1-candidate-news`, 4 runs, **0 rows written because the roster is demo fixtures** |
| Governing spec `CAP_Refresh_Agents_Plan_v1` | ✅ found — `refresh-agents-plan.md` here; HTML original on `main` via PR #14 |
| `TASK-A14` dispatcher / `TASK-A15` prompts v1.1 | ⬜ both unbuilt (confirmed: no `cap-r0-dispatcher`; no prompt writes `agent_run`) |
| Real candidate roster (`ballot_status='ballot'`, 22 candidates) | ⬜ ingest branch A0/A1/B2/B3 — **the actual blocker** |
| `news-fairness.md` | ✅ on `main` via PR #10 — N2/N3 built; N1 (the `news_fairness` migration) not written |

**Zero `candidate_news` rows have ever been written**, and that is *correct
behaviour*: R1 refuses to attach real people's news to fictional profiles.

## 1. The single next task

**C0 is done.** Every remaining C-task is blocked on something outside this
branch: C2/C3/C6 on the real roster (ingest B2/B3), C4 on the C1 write-path
decision, C5 on TASK-A15 plus founder gate Q5. The useful next moves are the
founder gates in §6, in this order: answer Q5 and the C1 recommendation, then
unblock the ingest branch's A0.

> The single most expensive mistake available here is still writing a second,
> divergent R1. The first one is `agents/r1-candidate-news.prompt.txt`.
> Extend it; do not replace it.

## 2. Read order

1. `candidate-news-PRD.md` — the task list you maintain. §7 has the evidence.
2. `refresh-agents-plan.md` §4 (constitution), §4.1 (sources), §4.2 (wording),
   §6 R1 — the contract you are extending.
3. `agents/r1-candidate-news.prompt.txt` — the live prompt, verbatim.
4. `docs/admin-dashboard/design.md` §2 (data flow 1), §5 (dispatcher; prompts
   v1.1; lint as a library), §7 (the "don't queue agent news" decision CN-R7
   asks to reverse).
5. `supabase/migrations/0005_refresh_agents.sql` and `0006_admin_ops.sql`.
6. `news-fairness.md` §1 (labelling), §3 (the `news_fairness` migration), §5 (names this PRD as the producer).

Do not read the S-plane specs (`CAP_Runtime_PRD`, the three agent packages).
That pipeline is **idle**. Useful only as prior art for guard patterns.

## 3. Loop protocol

1. Open the PRD, take the **first unchecked, unblocked task**.
2. Read only that task's references.
3. Implement.
4. Run the task's Verify. It must actually pass — no "should work".
5. Mark `- [x]` with a one-line `~ Done <date>: <what/how verified>`.
6. Commit per task or small group. Never commit secrets.

**Baseline that must stay green:**

```
node scripts/verify-migrations.mjs          # needs arm64 node — PGlite aborts under Rosetta x64
node scripts/verify-refresh-schema.mjs      # live; needs .env.local (service role for checks 2–3)
node scripts/verify-news-neutrality.ts --self-test
```

## 4. House rules

- **You classify; you never editorialise.** Record what a source *is*
  (`factual_reporting` vs `opinion`, plus `lean_tag`). Never rate an article as
  biased, never summarise a candidate's position, never write a claim.
- **Search symmetrically or the fairness clause is a lie.** Same query shape,
  same effort, every `ballot`-tier candidate, every pass. R1 already does this
  (Constitution 5); keep it.
- **No source, no card.** A row without a real `source` row is not written.
  This is *new* relative to the plan (which only requires an allowlisted URL)
  — it is the PRD's CN-R1 and `news-fairness.md` §1, enforced by
  the `news_fairness` migration once N1 is written.
- **Let the database dedupe.** `uq_news_item_url_candidate` exists. The plan
  also pre-queries; either is fine, the index decides.
- **Fail closed, report honestly.** `status='failed'` with a reason;
  `ok_empty` for "ran fine, found nothing" — exactly what the last three R1
  runs were.
- **Ops writes never fail a run.** If `0006` is missing, skip and note it.
- **Gated by default** — *pending founder decision Q5*; design.md §7 currently
  says the opposite.
- **Do not edit a live scheduled task without the founder's explicit go.**
  Draft into `agents/`, then stop and report, per
  `docs/admin-dashboard/phases/run-3-agent-control.md`.

## 5. Environment facts

- **Remote sessions have no outbound network** (proxy 403s every host).
  Anything live runs on the operator's Mac.
- **This Claude desktop session has the `scheduled-tasks` and Supabase MCPs.**
  It can read every stored prompt and run read-only SQL. A plain repo agent has
  neither.
- **The R-prompt mirrors are at `.superpowers/sdd/`** on the operator's Mac
  (gitignored by `.superpowers/sdd/.gitignore`). Snapshots for repo agents live
  in `agents/` here.
- **The plan HTML and the admin console A2–A5 reached `main` via PR #14
  on 2026-09-06.** The July run reports did not: that PR gitignores
  `Agents/RunReports/`, so they live only on `wip/raw-worktree` and the
  operator's disk. Un-ignore them if they should be the tracked audit trail.
- **Migrations `0009`–`0011` are on `main` but not applied live.** Planned
  next: `general_election` (ingest A1) and `news_fairness` (N1), each at whatever number is free when it is written.
- `node` on this Mac is x64 under Rosetta; `verify-migrations.mjs` (PGlite)
  crashes. Use `/usr/bin/python3` for stdlib HTTPS scripts (ingest memory).
- **`0004_official_links.sql` is applied.** Editing a seed changes nothing —
  ship an `UPDATE`.

## 6. Founder gates — park, don't block

| Gate | Blocks | Status |
|---|---|---|
| ~~Locate `CAP_Refresh_Agents_Plan` + R1 prompt~~ | — | ✅ C0 |
| ~~**Q0** — where is `news-fairness.md`~~ | — | ✅ on `main` (PR #10) |
| **Q5** — queue agent news through `review_item` (reverses design.md §7) | C5 | ⬜ |
| **C1 rec.** — move R1's write path to `scripts/r1-ingest.mjs`, search stays in Cowork | C3, C4 shape | ⬜ (recommended yes) |
| Ingest **A0** — three-tier `ballot_status` sign-off (on the ingest branch) | A1 → B2 → every R1 run | ⬜ |
| Ingest **B2/B3** — real roster + official sites | C2, C3, C6 | ⬜ |
| **Q6** — check R1's 08-01 / 08-15 / 09-01 runs in the Claude app | trust in cadence | ⬜ |
| **Q7** — retirement is recorded in `news-fairness.md`; add the one-line `docs/scope-changes.md` entry | errata index completeness | ⬜ (minor) |
| `N`, slots per candidate | N4 — **pick after C6 measures** | ⬜ |
| Biography source (hand / agent / assembled) | the other half of the candidate page | ⬜ |
| ~~Run `reconcile-git.sh`~~ | — | ✅ PR #14, 2026-09-06 |
| Track the July run reports (un-ignore `Agents/RunReports/`)? | audit-trail visibility | ⬜ |

## 7. Definition of done

Every `ballot`-tier candidate in one real target race has a current set of
sourced, lean-labelled, neutrally-worded `news_item` rows; two consecutive runs
are idempotent; the run appears on the agents console; written items land in
the approval queue (if Q5 says so); `verify-news-neutrality.ts` passes against
live rows; and per-candidate counts are recorded so `news-fairness.md`'s `N`
can be chosen from data instead of guessed.

---

### Paste-ready session prompt

> "We're building candidate news for Know Your Vote. Read
> `docs/general-election/candidate-news-BRIEF.md` and follow its loop protocol:
> take the first unchecked, unblocked task in `candidate-news-PRD.md`, read only
> that task's references, implement, run its Verify until it actually passes,
> mark it `[x]` with a `~ Done` note, and continue.
>
> C0 is done: R1 exists as Cowork task `cap-r1-candidate-news` and its contract
> is snapshotted at `docs/general-election/agents/r1-candidate-news.prompt.txt`.
> Extend that agent; never write a second one. It has written zero rows because
> the live roster is demo fixtures — that blocker is the ingest branch's, not
> yours.
>
> Remote sessions have no outbound network, so anything live runs on the
> operator's machine. Do not edit a live scheduled task without an explicit go.
> Stop at founder gates (brief §6) and record them."
