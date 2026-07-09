# Run 4 — Site Metrics (Phase A5) · after Run 1, fully parallel-safe

Independent of Runs 2 and 3 (needs only Run 1's auth + shell — not even migration 0006). The easiest run to schedule anywhere. Tasks TASK-A16…A18.

## Scope
Vercel deployments panel, Sentry errors panel, analytics links-out card, Site page assembly.

## Before you start
- Read: `docs/admin-dashboard/design.md` § 4 (API contracts), § 6 (failure-mode table); `docs/admin-dashboard/prd.md` AFR-040…042.
- Requires merged Run 1.
- **Degraded states are the required test today.** `VERCEL_API_TOKEN` / `SENTRY_AUTH_TOKEN` / DSN may be absent (founder gate A00c): every panel must render `DegradedBanner` naming the exact missing variable — never blank, never fake. Happy-path verify happens when the founder sets tokens; record which path you proved in the PR.
- Secrets are server-only (never `NEXT_PUBLIC_`); external fetches cached ~60 s.
- **Dirty working tree:** commit ONLY files your tasks create/modify.

## Tasks (mark `- [x]` in `docs/admin-dashboard/roadmap.md`; keep Status line accurate)

- **TASK-A16** — `GET /api/admin/site/deployments` (Vercel REST; `VERCEL_API_TOKEN` + `VERCEL_TEAM_ID`/`VERCEL_PROJECT_ID`; 60 s cache) + Deployments panel: latest prod + recent previews with state, age, commit.
  Files: `src/app/api/admin/site/deployments/route.ts`, panel component
  Verify: token absent ⇒ banner names the var; with token ⇒ real deploys listed. Test whichever states are reachable; state which in the PR.

- **TASK-A17** — `GET /api/admin/site/errors` (Sentry Issues API; 60 s cache) + Errors panel: recent issues + counts; blank DSN/token ⇒ "Sentry not receiving events yet".
  Files: `src/app/api/admin/site/errors/route.ts`, panel component
  Verify: degraded state today; happy path once tokens exist.

- **TASK-A18** — Site page assembly + analytics links-out card (Vercel Analytics / Speed Insights / Plausible links with "enable to integrate" note, per AFR-042) + roadmap status sweep.
  Files: `src/app/admin/(sections)/site/page.tsx`
  Verify: page renders all states; `docs/admin-dashboard/roadmap.md` checkboxes and Status line accurate for everything this run completed.

## Definition of done
A16–A18 checked in roadmap.md; lint + `tsc --noEmit` clean; branch `admin/phase-a5`; PR titled "Admin console Phase A5 — site metrics" noting degraded-vs-happy paths proven.
