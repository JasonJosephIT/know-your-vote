# Stream P — Pipeline & schema

> **One of two parallel work packages.** The other is `stream-surface.md`.
> They are split so two sessions can run at the same time without stepping on
> each other; read §0 before touching anything.

**Written:** 2026-09-07 · **Owner:** whichever session picks this up first

---

## 0. The boundary — read this first

The split is not thematic. It follows the one thing this repo has actually
been burned by: **`supabase/migrations/` collided three times in a week**
(`0010`/`0011`, `0012`/`0013`, `0012` again), every time because two planning
docs assigned "the next number" independently. **You are the ledger's single
owner.** That is the whole reason this boundary is where it is.

| | Stream P (this file) | Stream S (`stream-surface.md`) |
|---|---|---|
| **Owns** | `Civic Awareness (Know Your Vote)/toollayer/**`, `supabase/migrations/**` incl. `README.md`, `data-architecture.md`, `data-ingest.md` | `src/**`, `scripts/verify-news-neutrality.ts`, `news-fairness.md`, `candidate-news-PRD.md` |
| **Never touches** | anything in Stream S's column | anything in Stream P's column |

`scripts/verify-migrations.mjs` is **yours** (it is the migration harness).
Every other `scripts/verify-*.ts` belongs to Stream S.

### The one shared file, and the rule for it

`news-fairness.md`'s N-task table has rows belonging to both streams: N1 and
N5 are yours, N4/N6/N7 are Stream S's. **Append only to your own rows.**
Different lines in the same table merge cleanly in git; if it does conflict,
take both sides.

### Claiming a migration number

1. Open `supabase/migrations/README.md`.
2. Take the next free number, add its row **with the file name and a one-line
   why**, and land that row in the same commit as the file.
3. Only then write the `.sql`.

`0024` is next. `0013`–`0018`, `0020` and `0021` are applied live on `main`; `0019` is reserved for TASK-060; `0022`/`0023` are this branch's, written and not yet applied. Re-read `supabase/migrations/README.md` before claiming a number — this line has been wrong once already.

---

## 1. What is already true

Do not rebuild these. All merged to `main` on 2026-09-07:

| Asset | Where |
|---|---|
| `candidate.ballot_status` + party CHECK dropped | `0013` (applied live) |
| `news_item.county_fips` | `0016` (applied live) |
| `news_item.relation` (`named`/`related`) | `0017` (applied live) |
| DoE parser tiers each row, status before party; only `ballot` enters `candidate_ids`; unknown status raises | `intake.py` (B2) |
| T10 audits the `ballot` tier only; records `audited_candidates`, `excluded_candidates`, `unopposed` | `synthesis.py` (A3) |
| `read_profiles` LEFT JOINs `candidate` for the tier | `store.py` (A3) |

**House rules that are not negotiable** (`toollayer/AGENT_BRIEF.md` §3–§4):

- **Never edit a core.** `balance_audit_core.py` carries 148 test vectors; a
  core change needs a spec amendment first. Wire cores through
  `cap_toollayer.cores`, never by copying or hand-built paths.
- **Degrade honestly.** Missing env var, unreachable API, unbuilt dependency →
  a structured `not_configured` / `not_implemented` / `upstream_failed`
  naming the missing thing. Never a silent success, never a stub that
  pretends.
- **Fail closed.** An unknown value refuses; it does not pick a default. B2's
  unknown-`StatusCode` raise is the worked example: `ELE` arrives after
  certification and means the race is decided, so bucketing it silently would
  publish a settled race as a live one.

**Mutation-check everything.** Break the rule on purpose and confirm the suite
fails. Today this caught a `FakeDb` that never recorded SELECTs, which made a
LEFT JOIN assertion unfalsifiable — INNER JOIN passed the entire suite.

---

## 2. Tasks

Dependency-ordered. Run each Verify before marking it done.

### P1 — Migration `0014`: agent news must carry a source (N1)

`news_item.source_id` is nullable, so an agent-written article can exist with
no source row, therefore no `type` and no `lean_tag` — an unlabelled card.
That is the one hole in "no source, no card", which is the news-plane
restatement of the pipeline's "no Source → no Claim" constitution.

Constrain **agent rows only**: `candidate_news` and `election_news` require a
`source_id`; `official_link` and `pipeline_event` legitimately have none.

> **`0014` is reserved but unwritten**, and it is numbered *below* `0015`–`0017`
> which are already applied. So it applies **first** on a fresh database and
> **last** on the live one. Check that nothing in `0015`–`0017` conflicts before
> you write it — `0013` needed exactly that check and its header records the
> answer. Write it idempotently (`IF NOT EXISTS`, a `DO $$` guard on the
> constraint) for the same reason.

**Check the live data first.** A CHECK that existing rows violate cannot be
added. There are 10 live `news_item` rows; if any `candidate_news` /
`election_news` row has a NULL `source_id`, the migration must fix or exclude
it, and *that* decision is worth surfacing rather than deciding quietly.

- **Files:** `supabase/migrations/0014_news_fairness.sql` + the ledger row
- **Verify:** `node scripts/verify-migrations.mjs` green; a `candidate_news`
  row with `source_id NULL` is rejected; an `official_link` row with NULL
  still inserts. Mutation-check: dropping the constraint fails the suite.
- **Not blocked.**

### P2 — Per-race coverage variance (N5)

Compute `(max-min)/max` over items-available-per-candidate and **record it**.
It reports; it never gates. Halting a race because the press covered it
unevenly would hide a real ballot over something nobody can remediate.

Two rules that decide this task:

1. **Do not reimplement the variance.** Call `balance_audit_core` through
   `cores`. It is a pure function over per-candidate counts and does not care
   whether it is counting claims or articles.
2. **Count `named` rows only.** `namedCountsByCandidate()` in
   `src/lib/news-match.ts` is the denominator rule (read it; do not edit it —
   it is Stream S's file). `related` rows attach to every candidate the
   ambiguity admits, so they are equal across a race by construction and would
   drag the variance toward zero. On the guardrail's fixture, including them
   moves it from **1.00 to 0.75** — the tier that exists to fill a voter's
   page flattering the number we publish about our own fairness.

- **Files:** `toollayer/cap_toollayer/synthesis.py` or a script
- **Verify:** variance computed for an uneven race; nothing is blocked from
  publishing; a candidate with zero coverage is counted at zero rather than
  dropped, since that is the widest gap in the report.
- **Not blocked** (fixture-testable). Live numbers need C7's gates and a real
  roster.

### P3 — FEC incumbency (B4) — **network-gated**

Fill `is_incumbent` / `incumbent_id` / `is_open_seat` from the existing T2
FEC candidates endpoint.

> **This session almost certainly cannot run it.** Remote sessions here are
> egress-blocked — every host 403s at the proxy, verified repeatedly today.
> `FEC_API_KEY` also lives in a local `.env.local`. Write the code and its
> fixture tests, then hand the live run to `local-session.md` rather than
> reporting an unrun path as done.

- **Files:** `toollayer/cap_toollayer/intake.py`, `store.py`
- **Verify:** a known FL-28 incumbent resolves; a genuinely open seat sets
  `is_open_seat`; a missing key degrades to `not_configured`.
- **Blocked on network** for the live half only.

---

## 3. Do not build

- **A second ballot-measure model.** Another session shipped one
  (`0010`/`0011`, `measure-balance.ts`, `/measures/[measureId]`), and it
  answered the question `data-architecture.md` D3 called too hard — "what is a
  balanced summary of an amendment?" — with a symmetry rule rather than a
  summary. D3 is superseded; read the ⚠️ box before touching that area.
- **A `news_corpus` staging table.** `candidate-news-PRD.md` §5 decided the
  sweep holds results in memory: one run sweeps, matches and inserts. A
  staging table is the change to make *if* those ever run on different
  schedules, not before.
- **Anything that widens `race.level`.** It still reads
  `CHECK (level IN ('federal','state'))`. Coverage already expanded once
  (D-A, founder 2026-09-07: five statewide/at-large races — Gov/AG/CFO/AgComm
  + U.S. Senate — + sixteen U.S. House districts, twenty-one races, not
  eight) and all twenty-one are still federal or state, so it remains not
  binding. Widen it if and only if that stops being true.

---

## 4. Baseline that must stay green

```
python3 "Civic Awareness (Know Your Vote)/toollayer/test_toollayer_skeleton.py"   # 114
cd "Civic Awareness (Know Your Vote)/toollayer" && python3 -m cap_toollayer.server --selfcheck
node scripts/verify-migrations.mjs
```

---

## 5. Paste-ready session prompt

> "Work `docs/general-election/stream-pipeline.md`. Read §0 first — you are
> the single owner of `supabase/migrations/` and the numbering ledger, plus
> the toollayer and the data-* docs. Do not touch `src/**` or
> `news-fairness.md`; another session owns those and is running in parallel.
> Take P1, P2, P3 in order. Claim a migration number in the ledger *before*
> writing the file. Never edit a guard core, degrade honestly, fail closed,
> and mutation-check every test you add. Keep the §4 baseline green. Commit to
> branch `claude/stream-pipeline`."
