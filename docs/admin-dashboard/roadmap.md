# Roadmap — Operator Console (`/admin`)

> Checkboxes are updated as tasks are completed. The coding agent MUST mark tasks `- [x]` as they are finished.
> Source docs: `docs/admin-dashboard/prd.md` (requirements, AFR-xxx), `docs/admin-dashboard/design.md` (schema, API contracts, deep dives). UI specs: `docs/admin-dashboard/handoff/` (developer handoff per phase — tokens, states, redlines, a11y; A1 as-built, A2–A5 as target). House conventions: `docs/product-roadmap.md` Build Philosophy applies unchanged — plus one addition below.

**Status:** 16/18 tasks complete
**Current Phase:** Phases A1 (foundation — **live-verified**: 0005/0006 applied to prod, both guardrails green), A2 (monitor), A3 (submit/review), A5 (site metrics) complete in code; degraded states proven, authed happy paths pending founder gate A00b (Supabase Auth + ADMIN_EMAILS; A00a done, A00b/A00c set locally — Vercel env + Auth redirect-URLs pending). Phase A4: A13 done; A14–A15 (Cowork dispatcher + agent-prompt dual-writes) remain.
**Runnable bundles:** `docs/admin-dashboard/phases/run-1-foundation.md` (first, alone) → then `run-2-monitor-submit-review.md` (A2+A3 combined), `run-3-agent-control.md`, `run-4-site-metrics.md` in any order or in parallel. This file stays the single checkbox tracker.

## Build Philosophy (additions)

9. **Two planes, one rule.** Content-plane tables keep their existing write constitution; ops-plane tables (`agent_run`, `agent_run_request`, `review_item`, `admin_action`) are server-side/service-role only — no anon or authenticated policies, ever.
10. **Degrade honestly, again.** Every panel and action must name its missing dependency (env var, migration, closed laptop) instead of hiding or faking. This is testable — Verify steps below exercise the degraded states, not just the happy path.

---

## Phase A0: Prerequisites (founder-gated — no code)

> **Goal:** The accounts/keys/products the console integrates with exist. Tasks in later phases are written to *land safely* without these (honest degradation), but the console isn't "done" until they're set.

- [x] **TASK-A00a** *(founder)* — Apply migration `0005_refresh_agents.sql` to Supabase (decide the `candidate_contact` anon-policy question at the same time — see `.superpowers/sdd/progress.md` "OPEN DECISION"), then run `node scripts/verify-refresh-schema.mjs` to green.
  ✓ 2026-07-03: applied 0005 **and** 0006 live to `pqracitpmzpiqfnzlngw` via the Supabase MCP. `candidate_contact` anon-read policy kept as written (table is empty until R2 populates it — revisitable before any data lands). `verify-refresh-schema.mjs` and `verify-admin-ops.mjs` both green against live.
- [ ] **TASK-A00b** *(founder)* — Enable Supabase Auth (email/magic link) on project `pqracitpmzpiqfnzlngw`; set `ADMIN_EMAILS` in `.env.local` + Vercel env.
  ~ Partial: Supabase email auth already enabled (provider on, signups allowed); `ADMIN_EMAILS` set in `.env.local`; login page verified flipping "Not configured"→form. **Pending (dashboard):** add `ADMIN_EMAILS` to Vercel env, and add Auth redirect URLs (`http://localhost:3000/**` + prod `/**`) so the magic link returns to `/admin/auth/callback`.
- [ ] **TASK-A00c** *(founder)* — Set `SUPABASE_SERVICE_ROLE_KEY` (already required by the voter app's gated features), `VERCEL_API_TOKEN` (+ `VERCEL_TEAM_ID`/`VERCEL_PROJECT_ID`), and optionally `SENTRY_AUTH_TOKEN` + DSN, in `.env.local` + Vercel env.
  ~ Partial: `SUPABASE_SERVICE_ROLE_KEY` (`sb_secret_…` key) set in `.env.local`. **Pending:** add it to Vercel env; `VERCEL_API_TOKEN`/`SENTRY_AUTH_TOKEN` still unset (only Phase A5 needs them).

## Phase A1: Foundation — ops schema, auth, shell

> **Goal:** `/admin` exists behind real auth; ops-plane tables exist with locked-down RLS; regression harness covers them. Deployable at phase end with an honest "nothing to show yet" overview.
>
> **Reference:** design.md `§ 3 Data Model`, `§ 5 Auth`; PRD `§ 4`, `§ 5`.
>
> **Phase prompt:** "Read docs/admin-dashboard/roadmap.md Phase A1 + the Reference sections. Continue from the first unchecked task; mark each complete; branch `admin/phase-a1`, commit, push, PR."

- [x] **TASK-A01** — Migration `0006_admin_ops.sql`: `agent_run`, `agent_run_request` (+ partial unique live-request index), `review_item`, `admin_action` — idempotent, RLS enabled, explicit REVOKEs, service-role only (no anon/authenticated policies)
  Files: `supabase/migrations/0006_admin_ops.sql`
  Notes: DDL per design.md § 3 verbatim. Follow 0005's idempotency + default-privileges lessons. Verify: `node scripts/verify-migrations.mjs` green with new probes (next task). ✓ `admin_action` is append-only even for `service_role` (REVOKE UPDATE/DELETE). Live apply is founder-gated (A00a-style) — never run against the project.

- [x] **TASK-A02** — Extend the embedded-Postgres regression + add live guardrail script for ops tables
  Files: `scripts/verify-migrations.mjs`, `scripts/verify-admin-ops.mjs`
  Notes: Probes: objects exist; live-request unique index rejects a second pending row per agent; status CHECKs reject unknown values; anon/authenticated get zero access (SELECT and INSERT both denied) on all four tables. Verify: both scripts run; live script fails closed with "0006 not applied" until the founder applies it. ✓ `verify-migrations.mjs` green (58 checks incl. all 0006 invariants 10-13). Live `verify-admin-ops.mjs` is READ-ONLY (never writes ops rows — a pending request would trigger the dispatcher); today it fails closed on `SUPABASE_SERVICE_ROLE_KEY` (A00c) and will report "0006 not applied" once that key is set, until the founder applies the migration.

- [x] **TASK-A03** — Admin auth: Supabase Auth magic-link sign-in page, session wiring, `requireAdmin()` guard, middleware gate
  Files: `src/lib/admin/guard.ts`, `src/proxy.ts` (Next.js 16 renamed `middleware`→`proxy`), `src/app/admin/login/page.tsx`, `src/app/admin/auth/callback/route.ts`, `src/app/admin/layout.tsx`, `src/app/admin/(console)/layout.tsx`
  Notes: Allowlist from `ADMIN_EMAILS` (case-folded). Guard used by proxy AND every admin RSC/route — proxy is UX, the in-handler `checkAdmin()` is the boundary (design.md § 5). No change to any anon-facing RLS. Verify: unauthenticated `/admin` → login; non-allowlisted email cannot complete sign-in; allowlisted session reaches the shell; `curl` direct to a handler without cookies → 401. ✓ Verified: proxy redirect, honest "Not configured (ADMIN_EMAILS)" state, callback fail-closed (`?error=missing_code`), `?denied=1` state. **Sign-in e2e + authed-shell render pending A00b** (Supabase Auth + `ADMIN_EMAILS` unset) — not faked.

- [x] **TASK-A04** — `/admin` shell: nav (Overview · Queue · Submit · Agents · Site · Log), empty-state pages, degraded-state banner component
  Files: `src/app/admin/(console)/page.tsx`, `src/app/admin/(console)/{queue,submit,agents,site,log}/page.tsx`, `src/components/admin/{DegradedBanner,AdminNav}.tsx`, `src/components/nav/SectionNav.tsx` (hide on `/admin`)
  Notes: Reuse existing UI primitives + design tokens; the banner takes `{missing: string}` and is the single honest-degradation idiom every panel uses. Verify: all six routes render behind auth with truthful empty states. ✓ Six routes build as dynamic (ƒ) and are gated per-page by `requireAdmin()`. Authed `(console)` group escapes the sign-in route so the guard never loops. Admin root layout is a full-viewport overlay so the voter chrome/body-padding never bleeds in (verified desktop + mobile). Behind-auth empty-state render pending A00b (same gate as A03).

## Phase A2: Monitor

> **Goal:** The six R4 sections, live. Founder can answer "healthy? what ran? what's waiting?" from a browser.
>
> **Reference:** design.md `§ 2 data flow 4`, `§ 4`, `§ 5 Neutrality lint`; PRD AFR-001…004.
>
> **Phase prompt:** as A1, branch `admin/phase-a2`.

- [x] **TASK-A05** — Extract the neutrality matcher into a shared lib; script imports it
  Files: `src/lib/neutrality.ts`, `scripts/verify-news-neutrality.ts`
  Notes: Move banned-terms list + word-boundary matcher; script keeps CLI shell, `--self-test`, and terminal sanitization. Verify: `node scripts/verify-news-neutrality.ts --self-test` still 15/15; `tsc --noEmit` passes.

- [x] **TASK-A06** — `/api/health` + `/api/admin/overview` endpoints
  Files: `src/app/api/health/route.ts`, `src/app/api/admin/overview/route.ts`
  Notes: Health: Supabase reachability, 0005/0006 applied-or-not (information_schema probes), newest `agent_run` per agent, cron-heartbeat age (newest `pipeline_event` news_item). Overview: six-section snapshot per design.md. Both auth-gated. Verify: responses truthful in the current pre-0005/0006 state (that IS the test).

- [x] **TASK-A07** — Overview page: six live panels consuming `/api/admin/overview` + on-demand neutrality lint of recent agent-written rows
  Files: `src/app/admin/page.tsx`, `src/components/admin/panels/*.tsx`
  Notes: Panel order = R4's sections. Lint runs server-side via `src/lib/neutrality.ts` over last-30-day `candidate_news`/`election_news` rows (0 rows ⇒ explicit "0 agent-written rows" pass). Verify: with today's DB, panels show 6 official_links, no agent runs ("has not run yet"), 0005-pending notice — all honest.

## Phase A3: Submit & Review

> **Goal:** Manual adding + the unified approval queue with applied effects and audit trail.
>
> **Reference:** design.md `§ 3 payload shapes`, `§ 5 Approve-effect transaction`; PRD AFR-020…034, AFR-050.
>
> **Phase prompt:** as A1, branch `admin/phase-a3`.

- [x] **TASK-A08** — Zod schemas + TS types for review payloads and admin API bodies
  Files: `src/types/admin.ts`
  Notes: One zod schema per `review_item.kind` (design.md § 3), inferred TS types, discriminated union. Verify: `tsc --noEmit`; unit-style asserts in a `--self-test` block or colocated test per repo pattern.

- [x] **TASK-A09** — `POST /api/admin/ingest` + Submit forms (news story / unclear statement / unverified fact)
  Files: `src/app/api/admin/ingest/route.ts`, `src/app/admin/(sections)/submit/page.tsx`, form components
  Notes: All submissions → `review_item(pending, source='operator')`; manual_news gets advisory lint results rendered inline (AFR-022). Verify: submit each kind; rows appear pending; lint flags a seeded banned-word title.

- [x] **TASK-A10** — Queue UI: list, filters, detail view with payload/diff rendering
  Files: `src/app/admin/(sections)/queue/page.tsx`, `src/components/admin/ReviewItemCard.tsx`
  Notes: Oldest-first, kind/status filters, gated_diff rendered as old → new with source link (safeHttpUrl). Verify: seeded items of every kind render correctly.

- [x] **TASK-A11** — `POST /api/admin/review/:id/decision` — transactional approve/reject with fixed effects map + audit row
  Files: `src/app/api/admin/review/[id]/decision/route.ts`, `src/lib/admin/effects.ts`
  Notes: Effects map per design.md § 5 (whitelisted gated fields only; manual_news re-lint authoritative; `verified_by='operator'`). 409 on already-decided; failure ⇒ still-pending + `apply_error`. Every decision writes `admin_action`. Verify: approve a manual_news pre-0005 → fails closed with constraint message, item pending with `apply_error`; reject works; double-approve → 409; audit rows exist for all.

- [x] **TASK-A12** — Log view (`admin_action`) + queue badge in admin nav
  Files: `src/app/admin/(sections)/log/page.tsx`, nav badge in `src/app/admin/layout.tsx`
  Notes: Read-only, newest-first, pending-count badge. Verify: actions from A09/A11 testing appear; badge count matches pending rows.

## Phase A4: Agent Control Plane

> **Goal:** Trigger runs from the console; agents report into the registry; the queue receives agent gated findings.
>
> **Reference:** design.md `§ 5 Dispatcher`, `§ 5 Agent prompts v1.1`; PRD AFR-010…012, AFR-034.
>
> **Phase prompt:** as A1, branch `admin/phase-a4`. Note: tasks A14–A15 edit Cowork scheduled-task prompts (outside the repo) — do them from a session with the scheduled-tasks MCP, and keep the repo mirrors in sync.

- [x] **TASK-A13** — Run-request API + Agents page (trigger buttons, request state, honest execution caveat)
  Files: `src/app/api/admin/agents/run-requests/route.ts` (+ `[id]/route.ts` DELETE), `src/app/api/admin/agents/runs/route.ts`, `src/app/admin/(console)/agents/page.tsx`, `src/components/admin/AgentsConsole.tsx`
  Notes: 409 + surface existing on duplicate; show request age and "executes when the Claude app is open on the operator's machine". Verify: request→pending row; duplicate → 409; cancel works; runs list renders (empty until A14/A15). ✓ Repo code complete; inline zod per parallel rule (src/types/admin.ts untouched). Page built under the as-shipped `(console)` route group, not the spec's `(sections)`. `tsc` + `eslint` + `next build` green; auth boundary verified live (unauth API → 401 before any DB touch, `/admin/agents` → `/admin/login`). Authed happy-path (pending → 409 → cancel → live render) NOT exercised against prod by design — a real pending row triggers the live dispatcher — and still needs an Auth session (A00b redirect-URLs pending). **A14/A15 remain: they edit Cowork scheduled-task prompts and must run from the operator session (scheduled-tasks + Supabase MCPs).**

- [ ] **TASK-A14** — `cap-r0-dispatcher` Cowork scheduled task (cron `*/30 * * * *`) + payload mirror
  Files: `.superpowers/sdd/r0-dispatcher-prompt.txt` (mirror; stored task via scheduled-tasks MCP)
  Notes: Contract per design.md § 5: claim oldest pending (status-guarded UPDATE), execute that agent's stored prompt verbatim, mark fulfilled/failed, stale-claim recovery at 6 h, one request per pass, ops-plane writes only, fail closed if 0006 absent. Verify: with a seeded pending request and 0006 applied, a manual "Run now" of the dispatcher claims → executes → fulfills; prompt fidelity diff vs mirror.

- [ ] **TASK-A15** — Agent prompts v1.1: registry dual-write + gated-findings dual-write + R4 amendment
  Files: `.superpowers/sdd/r1..r4-scheduled-prompt.txt` mirrors (stored tasks via scheduled-tasks MCP)
  Notes: All four: INSERT/UPDATE own `agent_run` row (skip-and-note if 0006 absent). R2/R3: also INSERT `review_item` per gated diff/date mismatch. R4: rule 1 becomes "read-only on the content plane; you may write only your own agent_run row" + read registry for section 1. Re-verify stored-prompt fidelity against mirrors after update. Verify: next dry-run/real run of any agent produces an `agent_run` row and (R2/R3, when applicable) queue items.

## Phase A5: Site Metrics

> **Goal:** Deploys and errors visible; analytics honestly deferred.
>
> **Reference:** design.md `§ 4`, `§ 6 failure table`; PRD AFR-040…042.
>
> **Phase prompt:** as A1, branch `admin/phase-a5`.

- [x] **TASK-A16** — `GET /api/admin/site/deployments` (Vercel REST, 60 s cache) + Deployments panel
  Files: `src/app/api/admin/site/deployments/route.ts`, `src/lib/admin/site.ts` (`getDeployments`, `unstable_cache` 60 s), `src/components/admin/panels/DeploymentsPanel.tsx`
  Notes: Latest prod + recent previews: state, age, commit. Token absent ⇒ DegradedBanner("VERCEL_API_TOKEN"). Verify: with token set panel lists real deploys; without, banner names the var (test both). ✓ Degraded path proven today (`VERCEL_API_TOKEN` empty locally ⇒ `getDeployments` returns `unavailable:VERCEL_API_TOKEN` ⇒ panel renders the DegradedBanner). Route 401s on a cookie-less request (verified live). Happy/empty/error states coded (state→token chip map, newest-first split) — live verify pending A00c tokens; authed browser render pending A00b (same gate as A03/A04).

- [x] **TASK-A17** — `GET /api/admin/site/errors` (Sentry Issues API, 60 s cache) + Errors panel
  Files: `src/app/api/admin/site/errors/route.ts`, `src/lib/admin/site.ts` (`getSentryIssues`), `src/components/admin/panels/ErrorsPanel.tsx`
  Notes: Recent issues + counts; blank DSN/token ⇒ honest banner ("Sentry not receiving events yet"). Verify: degraded state today; happy path once founder sets tokens. ✓ Two-way honest degradation per design.md § 6: token MISSING ⇒ DegradedBanner("SENTRY_AUTH_TOKEN") [today's proven state — token empty locally]; token present + zero issues ⇒ `idle` "not receiving events yet". Route 401s cookie-less (verified live). Needs `SENTRY_ORG`/`SENTRY_PROJECT` to query the Issues API (added to `.env.example`); happy path pending A00c.

- [x] **TASK-A18** — Site page assembly + analytics links-out card; final `docs/admin-dashboard/roadmap.md` status sweep
  Files: `src/app/admin/(console)/site/page.tsx` (spec said `(sections)`; the A1 as-built group is `(console)`), `src/components/admin/panels/AnalyticsLinksCard.tsx`
  Notes: Deployments + Errors panels, links to Vercel Analytics/Speed Insights + Plausible with "enable to integrate" note (PRD AFR-042). Verify: page renders all states; roadmap checkboxes/status line accurate. ✓ Page assembles both data panels (`grid gap-6 lg:grid-cols-2`) + full-width Analytics card; Plausible reads "linked" (deep-links the live dashboard) when `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` is set, else "enable to integrate". `tsc --noEmit` + `eslint` + `next build` all clean (both `/api/admin/site/*` routes register as dynamic ƒ). Status swept below.
