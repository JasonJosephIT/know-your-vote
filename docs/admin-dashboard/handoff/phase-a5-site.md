# Handoff — Phase A5: Site Metrics (target)

The Site page: deployment health (Vercel), recent errors (Sentry), analytics honestly deferred. Refs: design.md §4, §6 (failure table); PRD AFR-040…042. Data: `GET /api/admin/site/deployments`, `GET /api/admin/site/errors` (both 60s cache). Layout: `max-w-[1120px]`, panels stacked `gap-6` (or `lg:grid-cols-2` for the two data panels).

> **This is the honest-degradation showcase.** Today `VERCEL_API_TOKEN` and `SENTRY_AUTH_TOKEN`/DSN are unset. Each panel must render its **`DegradedBanner`** naming the exact var — never blank, never fake (§6). Build and verify the degraded path first; the happy path lights up when the founder sets tokens (A00c).

---

## A. Deployments panel (AFR-040)

`GET /api/admin/site/deployments` → Vercel deploys (60s `unstable_cache`/revalidate) **or** `{unavailable:'VERCEL_API_TOKEN missing'}`.

`Card.flex flex-col gap-3`, header `h2.text-overline` "Deployments".

| State | Rendering |
|---|---|
| **Degraded** (no token) | `<DegradedBanner missing="VERCEL_API_TOKEN">` + "Set it in the environment to show production and preview deploys." **This is today's state.** |
| Default | Latest **production** deploy prominent, then recent **previews**. Per row: **state chip** (`READY`→success · `BUILDING`→info · `ERROR`→error · `QUEUED/CANCELED`→muted), env label (prod/preview), relative age, commit sha (mono) + message (truncate). |
| Empty | token set but no deploys → "No deployments in range." |
| Error | Vercel API 4xx/5xx → `role="alert"` "Vercel API error ({status})" + retry; last good cached value shown greyed if available. |

Row: `flex items-center gap-3 border-b border-border py-2`. State chip `rounded-full px-2 py-[2px] text-caption`.

---

## B. Errors panel (AFR-041)

`GET /api/admin/site/errors` → Sentry issues + counts (60s cache) **or** honest-unavailable.

`Card.flex flex-col gap-3`, header `h2.text-overline` "Errors".

| State | Rendering |
|---|---|
| **Degraded** (no token) | `<DegradedBanner missing="SENTRY_AUTH_TOKEN">`. |
| **DSN blank / no events** | Distinct honest copy — `role="status"` "Sentry not receiving events yet." (design.md §6 — this is *configured but idle*, not missing token). Don't conflate with the token-missing banner. **Today's state.** |
| Default | Recent issues newest-first: title (`text-body-sm`, truncate) + **level chip** (`error`/`warning`/`info` → error/warning/info tokens) + event count (`text-caption`) + last-seen relative + link out to Sentry (`safeHttpUrl`, `rel="noreferrer"`). |
| Error | Sentry API failure → `role="alert"` + retry. |

Note the two-way degradation: **token missing** (`DegradedBanner`) vs **token present but DSN silent** (status well) are different messages — the operator must be able to tell "I haven't wired it" from "it's wired but quiet".

---

## C. Analytics links-out card (AFR-042)

No API pull in v1 — link out with an honest "enable to integrate" note. `Card.flex flex-col gap-3`, header `h2.text-overline` "Analytics & Web Vitals":
- Rows for **Vercel Analytics**, **Speed Insights**, **Plausible** — each `flex items-center justify-between`: name + `text-caption text-on-surface-muted` status ("enable to integrate" / "linked") + external link `Button variant="secondary"` "Open ↗" (`safeHttpUrl`, `rel="noreferrer"`).
- Footnote `text-caption text-on-surface-muted`: "v1.1 pulls these via API once the products are enabled."

---

## D. Page assembly (task A18)
`src/app/admin/(console)/site/page.tsx` (replaces the A1 empty state): `requireAdmin()` → Deployments + Errors (`grid gap-6 lg:grid-cols-2`) then Analytics card full-width. Final step: sweep `docs/admin-dashboard/roadmap.md` checkboxes/status.

---

## E. Caching, responsive, a11y
- **Caching** (design.md §5): Vercel/Sentry fetches `unstable_cache` / route `revalidate = 60`. DB reads elsewhere stay live; these two are the only cached panels. Show "as of {age}" caption so the operator knows it's ~60s stale by design.
- Responsive: two data panels `lg:grid-cols-2`, stack < lg; rows wrap gracefully; commit/issue text truncates with title tooltip.
- a11y: state/level chips carry text; external links `rel="noreferrer"` + `aria-label` including "opens in Vercel/Sentry"; `role="status"` for idle/degraded, `role="alert"` for API errors; "as of" uses `<time>`.
- Edge: token set mid-session → next 60s revalidate flips degraded→live automatically (no reload); very long commit messages / issue titles truncate at one line.
