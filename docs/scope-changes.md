# Scope changes

A dated record of where the work has diverged from the plan the specs
describe, so the divergence is tracked rather than discovered. Newest first.

Each entry says what changed, why, and — the part that matters most — **which
existing documents now assert something false**. `docs/prd.md`,
`docs/VISION.md`, and `docs/adr/ADR-001` are read as authoritative by both
people and the coding agent; where they are stale, they are actively
misleading.

---

## 2026-09-01 → 09-03 · The general-election window

Opening ask: pivot from the August 18 primary to the November 3 general
election, and ship within two days. Three things then changed underneath
that ask.

### 1. Hosting moved from Vercel to Cloudflare Workers *(unplanned)*

**Why:** the Vercel account is blocked at the account level, so nothing
deploys — no previews, and neither production cron. The reminder cron is the
delivery path for the general-election deadline emails, so this was on the
critical path, not a preference.

**Carried three sub-changes, each of which is itself a scope change:**

- **Next.js 16.2.10 → 16.3.4.** The OpenNext adapter's peer range excludes
  16.0.x–16.3.2 and was narrowed *upward* over time, so the old pin was an
  unsupported combination, not merely an untested one.
- **`src/proxy.ts` deleted.** Next 16's Proxy is Node-runtime-only and
  OpenNext does not support Node middleware on workerd
  ([#969](https://github.com/opennextjs/opennextjs-cloudflare/issues/969), no
  workaround). Authorization is unchanged — `requireAdmin()` was always the
  boundary — but admin session refresh now lives in
  `POST /admin/auth/refresh`.
- **Deployment is no longer one dashboard.** `NEXT_PUBLIC_*` values are
  inlined at build time and cannot come from `wrangler secret put`. See
  `docs/cloudflare-deploy.md`.

**Now false in the docs:**

| Where | Asserts |
|---|---|
| `docs/prd.md` §46, §49 | Architecture diagram: "Vercel (Next.js server)", "Vercel Cron" |
| `docs/prd.md` §87 | Tech table: route handlers "on Vercel; Vercel Cron" |
| `docs/prd.md` §172 | "Host: Vercel (Next.js-native). Preview deploys per PR" |
| `docs/prd.md` §174 | Scheduled jobs run via Vercel Cron |
| `docs/prd.md` §182 | Rate limiting via "Vercel edge middleware" — and there is no middleware at all now |
| `docs/prd.md` §184 | "Secrets live only in Vercel env" |
| `docs/prd.md` §192 | Cost table lists Vercel Hobby/Pro |
| `docs/prd.md` §507 | Scale target expressed as "on Vercel + Supabase" |
| `docs/VISION.md` §69 | Backend "on Vercel, plus scheduled jobs (Vercel Cron)" |
| `docs/product-roadmap.md` TASK-012 | Deploy target and `vercel.json`, a file that no longer exists |
| `docs/product-roadmap.md` TASK-038 | Cron scheduling via `vercel.json` |
| `docs/adr/ADR-001` | Context opens "server-rendered on Vercel… Vercel cron". Its *decision* (remote-shell PWA) is unaffected; only its premises moved |
| `docs/admin-dashboard/design.md` | Several, including `/api/admin/site/deployments`, a real functional dependency on the Vercel API that still needs a decision |

The admin console's Vercel API integration is the only one of these that is
code rather than prose. It has not been touched and will report unavailable.

### 2. Phase 7 added — "ballot first, ZIP optional" *(new direction)*

Not in the opening ask. Came out of a question about dropping saved state,
and turned out to be well-founded: eight of ten November ballot items are
statewide and identical for every Florida voter, so the ZIP wall gates a
shared ballot behind a question that changes almost nothing.

**Amends, rather than implements, the PRD:**

- **FR-001 / TASK-015** define ZIP → ballot as *the* magic moment. Phase 7
  demotes ZIP to an upgrade. The PRD and the product will disagree until one
  of them is changed.
- **`docs/prd.md` §433, §530** still instruct showing a "closed primary"
  note. That note was removed from the app on 2026-09-03 (TASK-059) because
  it is false for the general election.
- The `zip_resolved` analytics event stops being the top of the funnel.

### 3. The two-day window elapsed, and nothing is deployed

Stated on 09-01; it is now 09-03. Written down because the plans are still
scoped to two days and reading them later without this note would be
misleading.

Actual deadlines, which have more room than the window did:

| Date | What |
|---|---|
| 2026-09-28 | T-7 registration reminder fires — needs the cron live **and** TASK-058 done |
| 2026-10-05 | Voter registration deadline |
| 2026-11-03 | Election Day |

**Blocked on account access, not on engineering:** creating the R2 bucket and
D1 database and setting Worker secrets; unblocking Vercel or disconnecting
its Git integration; TASK-058's human verification of the five `general_2026`
dates (the liability gate — nothing date-driven renders or sends until it is
done); TASK-066's content through the Balance Audit.

### Shipped so far

| Commit | What |
|---|---|
| `5806a4c` | Cloudflare Workers migration (built and dry-run verified; not deployed) |
| `198cd75` | TASK-057 election-scoped race reads + TASK-059 closed-primary copy removal |
| `942fc6e` | Phase 6 plan |
| `06f7307` | Phase 7 plan |

---

## How to clear this

Two options, and it is worth picking one deliberately rather than letting the
list grow:

1. **Amend the specs** — rewrite the stale lines in `docs/prd.md`,
   `docs/VISION.md`, and ADR-001's context, and delete the entries above as
   they are fixed. Correct, and the right end state.
2. **Leave them and treat this file as the errata** — cheaper now, but every
   reader has to know this file exists, and the coding agent will not.

Option 1 is right before anyone builds from the PRD again. Until then,
`docs/prd.md` carries a pointer here.
