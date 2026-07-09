# PRD — Know Your Vote Operator Console (`/admin`)

> Companion to `docs/prd.md` (voter app), `CAP_Refresh_Agents_Plan_v1.html` (R1–R4 freshness layer), and `CAP_Agent_Plan_v1.md` (generation pipeline). Version 1.0 · 2026-07-03 · Owner: Jason.

## § 0 Decisions & Assumptions

Decisions the founder confirmed in conversation are marked **confirmed**; the rest were recommended defaults he has not vetoed — flag before build if any look wrong.

| # | Decision | Choice | Status |
|---|----------|--------|--------|
| D1 | Placement | `/admin` routes inside the existing Next.js app (one repo, one deploy) | assumed (recommended) |
| D2 | Auth | Supabase Auth magic-link, single allowlisted email (`ADMIN_EMAILS`) | assumed (recommended) |
| D3 | "Manual ingest" meaning | **Manual trigger for agent ingest runs** (R1–R4), *plus* a manual-add section, *plus* an approval queue | **confirmed** |
| D4 | Approval queue scope | News stories, unclear statements, unverified facts — from agents *and* from manual submission | **confirmed** |
| D5 | Site metrics v1 | Vercel deployments/build health + Sentry errors; analytics/Speed Insights link out until those products are enabled | assumed (recommended) |
| D6 | Agent-authored news items | Continue to publish directly (allowlist + fail-closed constitution unchanged); only *manual* content and *gated* changes go through the queue | default — see Open Question Q1 |
| D7 | Trigger execution model | Queued requests, executed by a Cowork dispatcher on the operator's machine (ADR-001 holds: agents run locally) | forced by architecture |

## § 1 Problem & Goals

Operating Know Your Vote today means reading a **weekly static HTML digest** (R4), **markdown run reports** on one laptop, and **markdown-borne approval requests** (R2 gated diffs, R1 fact-checker flags, R3 date mismatches) that nothing tracks to resolution. There is no way to trigger an agent run remotely, no live view of pipeline/publication state, and no deploy/error visibility without opening Vercel and Sentry separately.

**Goals**
1. One place to see system health live: agents, freshness, feed, pipeline, deploys, errors.
2. One place to *act*: trigger agent runs, hand-submit content, and decide everything that requires human judgment — with an audit trail.
3. Zero new risk to the voter surface: no new anonymous capability, no client-side secrets, every privileged write server-side and logged.

**Non-goals (v1)**
- Multi-user roles/permissions (single operator).
- Replacing the R4 weekly digest (it remains the archival artifact; the console is the live view).
- Authoring or editing pipeline content (claims/positions/profiles stay pipeline-territory).
- Traffic analytics / Web Vitals dashboards (products not enabled yet; link out).
- Public or voter-facing anything.

## § 2 Users & Context

One user: the founder-operator. Constraints that shape everything:

- The voter app **deliberately has no accounts** — the `authenticated` role has zero policies. Admin auth is a net-new, isolated surface.
- The R1–R4 agents run as **Cowork scheduled tasks on the operator's machine** (ADR-001), not in the cloud. A hosted dashboard can *request* a run; only the local machine can *execute* one.
- House value: **degrade honestly**. Missing keys, unapplied migrations, or closed-laptop states are displayed as exactly that — never faked, never silently hidden.
- Current gates that must keep holding: RLS "published-and-audited-only" for anon; service-role writes narrow and server-only; migration `0005_refresh_agents.sql` may not yet be applied (the console must work before and after).

## § 3 Functional Requirements

### Monitor (live ops view)
- **AFR-001** `/admin` overview renders the six R4 sections as live panels: Agent runs · Freshness · Feed health · Pipeline state · Waiting on Jason · Open risks. Numbers come from queries, never estimates (R4's rules apply).
- **AFR-002** Agent runs panel reads the `agent_run` registry (per-run status, items written, report path, summary) with "has not run yet" honesty for missing agents.
- **AFR-003** Feed health includes an on-demand neutrality-lint verdict using the same banned-terms matcher as `scripts/verify-news-neutrality.ts` (shared library, not a copy).
- **AFR-004** A `/api/health` endpoint reports: Supabase reachability, newest `agent_run` per agent, daily-cron heartbeat age, migration 0005/0006 applied-or-not. The overview surfaces it; anything stale/missing is stated plainly.

### Trigger (manual agent ingest)
- **AFR-010** Operator can request a run of any of R1–R4 with an optional note; request lands in `agent_run_request` (status `pending`).
- **AFR-011** A Cowork **dispatcher** scheduled task polls pending requests and executes the requested agent's existing prompt, then marks the request `fulfilled` (or `failed` with reason). The UI always shows request age and the caveat: *executes when the Claude desktop app is open on the operator's machine*.
- **AFR-012** Duplicate protection: at most one pending/claimed request per agent; further clicks surface the existing one.

### Submit (manual adding)
- **AFR-020** Operator can hand-submit: a news story (candidate- or election-scoped, source URL mandatory), a statement needing clarification, or an unverified fact — via structured forms.
- **AFR-021** Manual submissions never publish directly. Every submission becomes a `review_item` (status `pending`) — the operator approves their own submissions as a deliberate second step (self-review beats zero review at 11 pm).
- **AFR-022** News submissions run the neutrality lint at submit time; violations are shown inline (operator may still queue with violations visible, but approval re-checks — see AFR-032).

### Review (approval queue)
- **AFR-030** One unified queue of `review_item`s with kind ∈ {`manual_news`, `gated_diff`, `fact_flag`, `unclear_statement`, `unverified_fact`, `date_mismatch`}, filterable by kind/status/source, oldest-first default.
- **AFR-031** Each item shows its full payload (proposed row, or old → new diff with source URL, or the flagged text + why), provenance (`agent:R2`, `operator`, …), and created date.
- **AFR-032** **Approve** applies the effect server-side in one transaction: `manual_news` → INSERT into `news_item` (re-linted; `verified_by='operator'`); `gated_diff`/`date_mismatch` → UPDATE the gated field (`race.key_dates`, `qualifying_status`, office/district); `fact_flag`/`unclear_statement`/`unverified_fact` → recorded disposition (route to Fact-Checker backlog; no content write). **Reject** records the decision. Both write an `admin_action` audit row.
- **AFR-033** If migration 0005 is not applied, approving a `manual_news` item fails closed with the exact reason ("candidate_news not a legal item_type yet") and the item stays pending.
- **AFR-034** Agents dual-write their gated findings as `review_item` rows (prompt v1.1 change) so the queue supersedes markdown-grepping; run reports remain as narrative artifacts.

### Site metrics
- **AFR-040** Deployments panel: latest production + preview deployments, build state, age — via Vercel REST API (`VERCEL_API_TOKEN`), cached ~60 s.
- **AFR-041** Errors panel: recent Sentry issues + counts (`SENTRY_AUTH_TOKEN`); DSN is blank today, so the panel states "Sentry not receiving events yet" until it is set.
- **AFR-042** Analytics & Web Vitals: links out to Vercel/Plausible dashboards with an "enable to integrate" note (v1.1: pull via API once enabled).

### Cross-cutting
- **AFR-050** Every privileged action (trigger, submit, decide) is recorded append-only in `admin_action` (who, what, payload hash, when) and visible in a Log view.
- **AFR-051** Every panel degrades honestly per missing dependency (token, key, migration, closed laptop) with the specific missing thing named.

## § 4 The Write-Boundary Amendment (constitution v1.1)

The PRD boundary today is "the pipeline writes; the web app reads," with narrow exceptions. The console requires a principled extension, not an erosion. We split the schema into two planes:

- **Content plane** (existing tables: race, candidate, claim, position, profile, source, news_item, …): rules unchanged. Agents write only what their constitutions allow; the app reads. Two amendments only: (1) the **operator** may INSERT `news_item` via the approve step, marked `verified_by='operator'` and neutrality-linted; (2) the **operator** may UPDATE the *gated logistics fields* agents are forbidden to touch — that is the whole point of the gate — always via approve + audit row.
- **Ops plane** (new tables: `agent_run`, `agent_run_request`, `review_item`, `admin_action`): coordination data *about* the system. Agents may write rows **about themselves** here (R4's "read-only" rule is amended to "read-only on the content plane"); the operator console reads/writes it server-side; anon has no access of any kind.

## § 5 Security & Privacy

- **Auth:** Supabase Auth magic-link; sign-in permitted only for emails in `ADMIN_EMAILS`. Sessions via `@supabase/ssr` cookies.
- **Defense in depth:** middleware gates `/admin/*`, **and** every `/api/admin/*` handler re-verifies the session + allowlist server-side (middleware-only protection is a known bypass class in Next.js — never rely on it alone).
- **No new anon surface:** ops tables have RLS enabled with *no* anon/authenticated policies; all access is server-side service-role after the allowlist check. Nothing about `/admin` changes voter-facing RLS.
- **Secrets:** `VERCEL_API_TOKEN`, `SENTRY_AUTH_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY` server-only; never `NEXT_PUBLIC_`.
- **Audit:** `admin_action` is append-only (no UPDATE/DELETE grants, not even service-role convenience helpers in app code).
- **PII:** none collected; Sentry scrubbing rules already in place apply to admin routes too.

## § 6 Success Criteria

1. Operator can answer "is the system healthy, what ran, what's waiting on me?" in under 30 seconds from any device — without opening markdown files, Vercel, or Sentry.
2. Every gated change since console launch has a queue item + audit row (zero out-of-band edits).
3. A requested agent run executes within one dispatcher interval whenever the Claude app is open, and the UI truthfully shows when it isn't.
4. Voter-facing behavior and RLS posture provably unchanged (existing verify scripts still green, no new anon-readable tables beyond plan-approved ones).

## § 7 Open Questions

| # | Question | Default until answered |
|---|----------|------------------------|
| Q1 | Should *agent-written* news items also route through the approval queue (review-before-publish mode)? | No — allowlist + fail-closed constitution has held; add a per-agent "require approval" flag later if trust demands it |
| Q2 | Email notification when the queue gains items (Resend)? | Deferred until `RESEND_API_KEY` is set; console badge only |
| Q3 | Graduate R1/R3 to Vercel cron (ADR-001 revisit) so triggers execute serverside? | Not in v1; `agent_run_request` is designed runtime-agnostic so graduation is a consumer swap, not a schema change |
| Q4 | `candidate_contact` anon-visibility decision (pre-publication exposure) | Owned by the migration-0005 apply step, not this PRD — but the console's Freshness panel should display whichever policy was chosen |
