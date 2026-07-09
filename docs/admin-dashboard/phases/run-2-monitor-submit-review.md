# Run 2 — Monitor + Submit & Review (Phases A2 + A3, combined) · after Run 1

Combined because Phase A3 depends on Phase A2's TASK-A05 (shared neutrality library). Work the tasks in the order listed. Parallel-safe with Runs 3 and 4, with one rule: **this run owns `src/types/admin.ts`** (Run 3 was instructed to keep out of it).

## Scope
Live six-section monitor, health endpoint, neutrality lib extraction; manual submissions; unified approval queue with transactional effects + audit log. Tasks TASK-A05…A12.

## Before you start
- Read: `docs/admin-dashboard/design.md` § 2 (data flows 2 & 4), § 3 (payload shapes), § 4 (API contracts), § 5 (neutrality lib; approve-effect transaction); `docs/admin-dashboard/prd.md` AFR-001…004, AFR-020…034, AFR-050.
- Requires merged Run 1 (auth guard, shell, migration file + verify harness).
- **Live DDL remains founder-gated**; 0005/0006 may be unapplied — several Verify steps below *deliberately test the fail-closed paths*. That is the spec, not a blocker.
- **Dirty working tree:** commit ONLY files your tasks create/modify.

## Founder gates touching this run
- None block. If 0005 is unapplied, TASK-A11's manual_news approval verifies the fail-closed path (expected). If 0006 is unapplied to live, queue/submit e2e runs against embedded Postgres or waits — record honestly in the PR.

## Tasks (mark `- [x]` in `docs/admin-dashboard/roadmap.md`; keep Status line accurate)

**Phase A2 first:**

- **TASK-A05** — Extract the neutrality matcher into `src/lib/neutrality.ts`; `scripts/verify-news-neutrality.ts` imports it (keeps CLI shell, `--self-test`, terminal sanitization).
  Verify: `node scripts/verify-news-neutrality.ts --self-test` still passes all assertions; `tsc --noEmit` clean.

- **TASK-A06** — `/api/health` + `/api/admin/overview` endpoints.
  Files: `src/app/api/health/route.ts`, `src/app/api/admin/overview/route.ts`
  Health: Supabase reachability, 0005/0006 applied-or-not (information_schema probes), newest `agent_run` per agent, cron-heartbeat age (newest `pipeline_event` news_item). Both auth-gated (401 unauth — no ops detail leaks anon).
  Verify: responses are truthful in the CURRENT pre-apply state — that is the test.

- **TASK-A07** — Overview page: six live panels (R4's section order) + on-demand neutrality lint over last-30-day `candidate_news`/`election_news` rows (0 rows ⇒ explicit "0 agent-written rows" pass).
  Files: `src/app/admin/page.tsx`, `src/components/admin/panels/*.tsx`
  Verify: with today's DB — 6 official_links, "has not run yet" agents, 0005-pending notice — all stated honestly.

**Then Phase A3:**

- **TASK-A08** — Zod schemas + TS types for review payloads and admin API bodies (discriminated union per `review_item.kind`, design.md § 3).
  Files: `src/types/admin.ts`
  Verify: `tsc --noEmit`; self-test asserts per repo pattern.

- **TASK-A09** — `POST /api/admin/ingest` + Submit forms (news story / unclear statement / unverified fact). All submissions → `review_item(pending, source='operator')`; manual_news gets advisory inline lint (AFR-022).
  Files: `src/app/api/admin/ingest/route.ts`, `src/app/admin/(sections)/submit/page.tsx`, form components
  Verify: submit each kind → pending rows; a seeded banned-word title gets flagged inline.

- **TASK-A10** — Queue UI: list, kind/status filters, detail view; gated_diff rendered old → new with source link (`safeHttpUrl`); oldest-first.
  Files: `src/app/admin/(sections)/queue/page.tsx`, `src/components/admin/ReviewItemCard.tsx`
  Verify: seeded items of every kind render correctly.

- **TASK-A11** — `POST /api/admin/review/:id/decision` — transactional approve/reject with FIXED effects map (`src/lib/admin/effects.ts`; whitelisted gated fields only: `race.key_dates`, `race.office`, `race.district`, `candidate.qualifying_status`; manual_news re-lint authoritative, `verified_by='operator'`). 409 on already-decided; failure ⇒ still-pending + `apply_error`. Every decision writes `admin_action`.
  Files: `src/app/api/admin/review/[id]/decision/route.ts`, `src/lib/admin/effects.ts`
  Verify: approve manual_news pre-0005 → fails closed with the constraint message, item pending with `apply_error`; reject works; double-approve → 409; audit rows exist for all.

- **TASK-A12** — Log view (`admin_action`, newest-first) + pending-count badge in admin nav.
  Files: `src/app/admin/(sections)/log/page.tsx`, badge in `src/app/admin/layout.tsx`
  Verify: actions from A09/A11 testing appear; badge matches pending count.

## Definition of done
A05–A12 checked in roadmap.md; lint + `tsc --noEmit` clean; the two verify scripts from Run 1 still green; branch `admin/phase-a2-a3`; one PR titled "Admin console Phases A2+A3 — monitor, submit, review queue".
