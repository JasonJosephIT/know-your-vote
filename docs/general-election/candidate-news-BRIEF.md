# Agent Brief — the Candidate News session

> Hand this file to the session that builds candidate news. It is the loop
> protocol plus the context that is not obvious from the code. The PRD governs;
> this brief only orients. **Written 2026-09-06.**

## 0. Where the build actually is

| Piece | State |
|---|---|
| `news_item` candidate scoping (`candidate_id`, `candidate_news`, dedupe index) | ✅ applied (`0005`) |
| Ops plane (`agent_run`, `agent_run_request`, `review_item`) | ✅ applied (`0006`) |
| Labelling axes (`source.type`, `source.lean_tag`) | ✅ applied (`0000`) — **already exist, unused by the app** |
| Neutrality lint (`verify-news-neutrality.ts`) | ✅ built, with `--self-test` |
| Agents console page (TASK-A13) | ✅ merged |
| **R1 agent that writes news** | ⬜ **does not exist** |
| `TASK-A14` dispatcher / `TASK-A15` prompts v1.1 | ⬜ both unchecked |

**Zero `candidate_news` rows have ever been written.** The whole pivot
(`news-fairness.md`) reads from an empty table.

## 1. The single next task

**C0 — find the real R-agent spec before writing anything.**

`CAP_Refresh_Agents_Plan` is cited by `0005`, `verify-news-neutrality.ts` and
`verify-refresh-schema.mjs`, and **is not in this repository**. The R1–R4
prompts are Cowork scheduled tasks stored outside the repo, mirrored at
`.superpowers/sdd/` — **a directory this repo does not contain.**

The PRD's §3 table of R-agent roles is **inferred from schema defaults and
console docs**. It is a starting hypothesis, not a contract. Confirm it, then
build.

> The single most expensive mistake available here is writing a second,
> divergent R1 because the first one's spec was somewhere else.

## 2. Read order

1. `candidate-news-PRD.md` — the task list you maintain.
2. `news-fairness.md` — what the rows you write must satisfy (§1 labelling,
   §2 equal slots). You are the producer; that document is the consumer.
3. `docs/admin-dashboard/design.md` §3 and the "one asymmetry" note — why
   triggers are queue writes, never RPCs.
4. `supabase/migrations/0005_refresh_agents.sql` and `0006_admin_ops.sql` —
   the tables you write, and their fail-closed idiom.

Do not read the S-plane specs (`CAP_Runtime_PRD`, the three agent packages).
That pipeline is **idle** — briefs were retired on 2026-09-06. It is useful
only as prior art for guard patterns.

## 3. Loop protocol

1. Open the PRD, take the **first unchecked task**. Dependency-ordered — C0
   really does gate the rest.
2. Read only that task's references.
3. Implement.
4. Run the task's Verify. It must actually pass — no "should work".
5. Mark `- [x]` with a one-line `~ Done <date>: <what/how verified>`.
6. Commit per task or small group. Never commit secrets.

**Baseline that must stay green** (nothing here touches the S-plane, but the
repo's checks are cheap):

```
node scripts/verify-migrations.mjs
node scripts/verify-refresh-schema.mjs
node scripts/verify-news-neutrality.ts --self-test
```

## 4. House rules

- **You classify; you never editorialise.** Record what a source *is*
  (`factual_reporting` vs `opinion`, plus `lean_tag`). Never rate an article as
  biased, never summarise a candidate's position, never write a claim. Claims
  belonged to the retired S-plane and its guard cores.
- **Search symmetrically or the fairness clause is a lie.** Same query shape,
  same effort, every `ballot`-tier candidate in the race, every pass — including
  the ones that keep returning nothing. Skipping a quiet candidate manufactures
  exactly the imbalance `news-fairness.md` §2 measures.
- **No source, no card.** A row without a real `source` row is not written. This
  is the news-plane restatement of the pipeline's "no Source → no Claim".
- **Let the database dedupe.** `uq_news_item_url_candidate` already exists.
  Insert and let the constraint decide; do not pre-query and branch.
- **Fail closed, report honestly.** Missing table, missing key, dead backend →
  `status='failed'` with a reason. `ok_empty` is the honest status for "ran
  fine, found nothing" — never dress a failure as an empty pass.
- **Ops writes never fail a run** (design.md idiom). If `0006` is missing, skip
  the registry write and note it.
- **Gated by default.** Route written news through `review_item` until the
  founder says otherwise.

## 5. Environment facts

- **This repo's remote sessions have no outbound network.** Verified
  2026-09-06: the egress proxy answers `403` to CONNECT for every external host
  — including `example.com`. Anything touching a live endpoint runs on the
  operator's machine. See `local-session.md`.
- **`.superpowers/sdd/` is not here.** Neither is `CAP_Refresh_Agents_Plan`.
- **Editing an R-agent prompt requires the scheduled-tasks MCP**, not a repo
  coding agent (`docs/admin-dashboard/phases/run-3-agent-control.md` is explicit:
  a coding agent should do the repo task, then *stop* and report A14/A15 back).
- **`0004_official_links.sql` is already applied live.** Editing an applied
  seed file changes nothing in the database — ship an `UPDATE`. The same trap
  applies to any seed you touch.
- Migrations `0005` and `0006` are applied; `0012`/`0013` are planned, not written.

## 6. Founder gates — park, don't block

| Gate | Blocks | Status |
|---|---|---|
| Locate `CAP_Refresh_Agents_Plan` + R1 prompt | C0, and therefore everything | ⬜ |
| Search backend + budget (Q1) | C2 | ⬜ |
| Where R1 runs — Cowork task vs Vercel cron (C1) | C3 | ⬜ |
| `N`, slots per candidate | `news-fairness.md` N4 — **pick after C6 measures** | ⬜ |
| Biography source (hand / agent / assembled) | the other half of the candidate page | ⬜ |

## 7. Definition of done

Every `ballot`-tier candidate in one real target race has a current set of
sourced, lean-labelled, neutrally-worded `news_item` rows; two consecutive runs
are idempotent; the run appears on the agents console; written items land in the
approval queue; `verify-news-neutrality.ts` passes against live rows; and
per-candidate counts are recorded so `news-fairness.md`'s `N` can be chosen from
data instead of guessed.

---

### Paste-ready session prompt

> "We're building candidate news for Know Your Vote. Read
> `docs/general-election/candidate-news-BRIEF.md` and follow its loop protocol:
> take the first unchecked task in `candidate-news-PRD.md`, read only that
> task's references, implement, run its Verify until it actually passes, mark it
> `[x]` with a `~ Done` note, and continue.
>
> Start at **C0**: `CAP_Refresh_Agents_Plan` and the R1–R4 stored prompts are
> **not in this repo** — find them before writing any agent, because the PRD's
> table of R-agent roles is inferred from schema defaults, not read from a spec.
>
> Context: candidate briefs were retired 2026-09-06; a candidate page is a short
> bio plus news cards. `news-fairness.md` specifies how those cards are labelled
> and allotted, and nothing writes them yet — `news_item` has had a
> `candidate_id` column since `0005` and zero rows have ever been written. You
> are the producer for that consumer.
>
> Remote sessions here have no outbound network (the proxy 403s every external
> host), so anything live runs on the operator's machine. Stop at founder gates
> and record them."
