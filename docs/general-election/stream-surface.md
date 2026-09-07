# Stream S — Voter-facing surfaces

> **One of two parallel work packages.** The other is
> `stream-pipeline.md`. They are split so two sessions can run at the same
> time without stepping on each other; read §0 before touching anything.

**Written:** 2026-09-07 · **Owner:** whichever session picks this up first

---

## 0. The boundary — read this first

The split is not thematic. It follows the one thing this repo has actually
been burned by: **`supabase/migrations/` collided three times in a week**
(`0010`/`0011`, `0012`/`0013`, `0012` again), every time because two planning
docs assigned "the next number" independently. So the ledger has exactly one
owner, and it is not this stream.

| | Stream S (this file) | Stream P (`stream-pipeline.md`) |
|---|---|---|
| **Owns** | `src/**`, `scripts/verify-news-neutrality.ts`, `news-fairness.md`, `candidate-news-PRD.md` | `Civic Awareness (Know Your Vote)/toollayer/**`, `supabase/migrations/**` incl. the ledger, `data-architecture.md`, `data-ingest.md` |
| **Never touches** | anything in Stream P's column | anything in Stream S's column |

**You write no migrations.** If a task here turns out to need one, stop and
say so rather than claiming a number — that is exactly how the last three
collisions happened.

### The one shared file, and the rule for it

`news-fairness.md`'s N-task table has rows belonging to both streams: N1 and
N5 are Stream P's, N4/N6/N7 are yours. **Append only to your own rows.**
Different lines in the same table merge cleanly in git; if it does conflict,
take both sides — neither stream's note invalidates the other's.

---

## 1. What is already true

Do not rebuild these. All merged to `main` on 2026-09-07:

| Asset | Where |
|---|---|
| Ballot-tier read filter — briefs and directory show `ballot` only | `src/lib/briefs.ts`, `src/lib/directory.ts` (A4) |
| Party codes verbatim, no empty chips, `WRI` is not a party | `src/lib/party-label.ts` + `scripts/verify-party-label.ts` (A4) |
| Unopposed race copy | `src/app/(public)/races/[raceId]/page.tsx` (A4) |
| Source labelling — Reporting/Opinion, lean disclosed never scored | `src/lib/news-labels.ts` + `scripts/verify-news-labels.ts` (N2/N3) |
| One story = one card, and it claims no candidate it cannot | `src/lib/news-feed.ts` + `scripts/verify-news-feed.ts` (C9) |
| `named` / `related` tiers rendered apart | `src/components/features/CandidateNews.tsx` (C8) |
| County-filtered feed + switcher | `src/app/(public)/news/page.tsx`, `/api/news` (C9) |

**The house pattern for a neutrality rule:** put the decision in a pure `.ts`
module under `src/lib/`, and drive it from a `scripts/verify-*.ts` guardrail.
Node strips `.ts` but **not** `.tsx`, so a rule living inside a component
cannot be verified offline at all. `news-labels.ts` and `party-label.ts` are
the two worked examples.

**Mutation-check every guardrail you write.** Break the rule on purpose and
confirm the script fails. This has caught real problems twice today: a
LEFT JOIN assertion that was unfalsifiable, and an eight-row lookup map whose
every entry was dead code.

---

## 2. Tasks

Dependency-ordered. Run each Verify before marking it done.

### S1 — Methodology page: the write-in and exclusion policy (A5 + N7)

**Both** outstanding methodology clauses land in one task because they land in
one file, and one file gets one owner.

**A5 half — the omission that needs stating.** The founder decided
(2026-09-07, `data-architecture.md` D1) that qualified write-ins are
**excluded, not listed**: a write-in has no printed ballot line, and the app
shows the ballot. The consequence is real and currently unstated — **a voter
will not learn that a qualified write-in exists in their race**, and there
were 4 of them in the target races on the live DoE file.

An unexplained absence and a stated policy look identical to a voter, and
only one of them is auditable. Say plainly: which filers are shown (`QUA`/`UNO`
with a printed line), which are not (defeated, withdrew, did not qualify,
removed, **and qualified write-ins**), and why.

**N7 half — the news clauses.** In plain language, from `news-fairness.md`
§1–§2: every card shows its publisher and whether it is reporting or opinion;
**lean is disclosed, never scored** — the app labels what a source is and
never rates an article as biased; every ballot candidate gets the same number
of slots; and a shortfall is stated rather than padded.

- **Files:** `src/app/(public)/methodology/page.tsx`
- **Verify:** `npm run build` clean; the page names the four excluded status
  codes and write-ins explicitly; the lean sentence says *disclosed*, not
  *corrected* or *scored*.
- **Not blocked.**

### S2 — Extend the neutrality lint to sourced-ness (N6)

`verify-news-neutrality.ts` today lints wording. Add: every agent-written row
(`candidate_news` / `election_news`) has a `source_id`, and that source's
`type` and `lean_tag` are populated.

This is the read-side half of "no source, no card". The write-side half is
Stream P's migration `0014`; **do not write it**, and do not wait for it —
the lint is useful against fixtures either way.

- **Files:** `scripts/verify-news-neutrality.ts`
- **Verify:** `--self-test` passes; a sourceless fixture fails; a fixture with
  a source but a null `lean_tag` fails.
- **Not blocked.**

### S3 — Equal-slot selection (N4)

`N` slots per `ballot` candidate, filled by **lean spread before recency** —
take the newest item from each distinct `lean_tag` before a second from any
one lean. Same rule for `type`, so one candidate's slots are not all opinion
columns while another's are all reporting. `named` fills before `related`
(§6). Shortfall is stated, never padded.

> **`N` is not yours to choose.** `news-fairness.md` §5 says pick it from real
> data once N5 reports actual per-candidate counts, and N5 is Stream P's and
> has no data yet. **Take `N` as a parameter** and let the caller pass it.
> Choosing a number now would be a guess dressed as a decision.

- **Files:** `src/lib/` (a new pure selector) + `CandidateNews.tsx`
- **Verify:** a fixture with a 14-vs-3 split gives both candidates `N` slots
  or an explicit shortfall note; slots are not single-lean when alternatives
  exist; mutation-check that removing the lean-spread rule fails.
- **Not blocked** (fixture-testable; live data needs C7's gates).

---

## 3. Do not build

- **A migration.** Not one, not ever, in this stream. See §0.
- **A biography field.** `news-fairness.md` §5 leaves it open: no `bio` column
  exists on `candidate` or `profile`, and whether it is hand-written,
  agent-written, or assembled from `prior_offices` + incumbency + FEC is a
  founder decision nobody has made. A candidate page without one is the
  current, honest state.
- **A write-in section.** D1 excluded them. A4's spec still says "render
  write-ins as a labelled list"; that clause is **stale and was deliberately
  dropped** — building it would ship the opposite of the decision.
- **Colour-coded anything.** Party chips are never colour-coded, and neither
  is lean. A red/blue chip implies a verdict the app does not make.

---

## 4. Baseline that must stay green

```
npm run build
npx tsc --noEmit
node scripts/verify-party-label.ts
node scripts/verify-news-labels.ts
node scripts/verify-news-feed.ts
node scripts/verify-news-neutrality.ts --self-test
```

`npx eslint` reports 4 warnings on `main`; all four are pre-existing and none
are in files this stream owns. Leave them.

---

## 5. Paste-ready session prompt

> "Work `docs/general-election/stream-surface.md`. Read §0 first — you own
> `src/**` and the news-fairness doc, and you must not touch
> `supabase/migrations/`, the toollayer, or the data-* docs; another session
> owns those and is running in parallel. Take S1, S2, S3 in order. Every
> neutrality rule goes in a pure `.ts` module under `src/lib/` with a
> `scripts/verify-*.ts` guardrail, and mutation-check the guardrail before
> calling it done. Keep the §4 baseline green. Commit to branch
> `claude/stream-surface`."
