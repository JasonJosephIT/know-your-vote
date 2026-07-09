# Run 1 — Foundation (Phase A1) · run FIRST, alone

Every other run depends on this one. Do not start runs 2–4 until this is merged.

## Scope
Ops-plane schema (`0006_admin_ops.sql`), admin auth, `/admin` shell. Tasks TASK-A01…A04.

## Before you start
- Read: `docs/admin-dashboard/design.md` § 3 (Data Model — the DDL is verbatim spec) and § 5 (Auth deep dive); `docs/admin-dashboard/prd.md` § 4 (two-plane constitution) and § 5 (security).
- Repo conventions: root `CLAUDE.md`/`AGENTS.md`; mimic `supabase/migrations/0005_refresh_agents.sql` (idempotency + explicit REVOKEs — Supabase default-privileges lesson) and `0002_rls.sql` grammar; verify-script style from `scripts/verify-migrations.mjs`.
- **Live-apply is founder-gated.** Never run DDL against Supabase project `pqracitpmzpiqfnzlngw`. Done = embedded-Postgres regression green + live guardrail script failing closed with a clear "0006 not applied" message.
- **Dirty working tree:** the repo may contain unrelated uncommitted changes (demo-seed scripts, voter-app rendering work). Commit ONLY files your tasks create/modify.

## Founder gates touching this run
- **A00b** (enable Supabase Auth + set `ADMIN_EMAILS`): TASK-A03 is codeable without it, but its end-to-end sign-in verify needs it. If absent, verify everything else and record "sign-in e2e pending A00b" in the PR description — do not fake the check.

## Tasks (mark each `- [x]` in `docs/admin-dashboard/roadmap.md` as you finish; keep its Status line accurate)

- **TASK-A01** — Migration `0006_admin_ops.sql`: `agent_run`, `agent_run_request` (+ partial unique live-request index), `review_item`, `admin_action` — idempotent, RLS enabled, explicit REVOKEs, service-role only (no anon/authenticated policies).
  Files: `supabase/migrations/0006_admin_ops.sql`
  Verify: `node scripts/verify-migrations.mjs` green with the new probes (TASK-A02).

- **TASK-A02** — Extend embedded-Postgres regression + add live guardrail for ops tables.
  Files: `scripts/verify-migrations.mjs`, `scripts/verify-admin-ops.mjs`
  Probes: objects exist; live-request unique index rejects a 2nd pending row per agent; status CHECKs reject unknown values; anon/authenticated denied SELECT **and** INSERT on all four tables.
  Verify: both scripts run; live script fails closed ("0006 not applied") today.

- **TASK-A03** — Supabase Auth magic-link sign-in, session wiring, `requireAdmin()` guard, middleware gate.
  Files: `src/lib/admin/guard.ts`, `src/middleware.ts`, `src/app/admin/login/page.tsx`, `src/app/admin/layout.tsx`
  Rules: allowlist from `ADMIN_EMAILS` (case-folded); guard used by middleware AND every admin RSC/route handler — the in-handler check is the boundary, middleware is UX (known middleware-bypass class); zero changes to anon-facing RLS.
  Verify: unauthenticated `/admin` → login; non-allowlisted email can't complete sign-in; allowlisted session reaches shell; cookie-less `curl` to a handler → 401.

- **TASK-A04** — `/admin` shell: nav (Overview · Queue · Submit · Agents · Site · Log), empty-state pages, `DegradedBanner` component.
  Files: `src/app/admin/page.tsx`, `src/app/admin/(sections)/*/page.tsx`, `src/components/admin/DegradedBanner.tsx`
  Rules: reuse existing UI primitives/design tokens; `DegradedBanner({missing})` is the single honest-degradation idiom all later panels use.
  Verify: all six routes render behind auth with truthful empty states.

## Definition of done
All four tasks checked in roadmap.md; `npm run lint` and `tsc --noEmit` clean; branch `admin/phase-a1`; commit only your files; push; PR titled "Admin console Phase A1 — ops schema, auth, shell" noting any founder-gate-pending verifies.
