# Handoff — Phase A1: Foundation (as built)

Sign-in, the authed console shell, section nav, the degradation idiom, and six empty-state pages. **Status: shipped** — this documents what exists in code (branch `admin/phase-a1`). Read [README.md](README.md) first for tokens/layout/a11y.

---

## A. Sign-in screen — `/admin/login`

`src/app/admin/login/page.tsx` · Server Component + inline Server Action (`requestLink`). No browser JS required; state carried in the URL.

### Layout
- Column: `main.mx-auto max-w-[440px] min-h-full flex flex-col justify-center gap-5 px-5 py-10` (vertically centered on the overlay).
- Head block (`gap-1`): eyebrow `text-overline text-on-surface-muted` "Know Your Vote" · title `h1` "Operator sign-in" · sub `text-body-sm text-on-surface-muted`.

### States (mutually exclusive, selected by config + `searchParams`)

| State | Trigger | Rendering |
|---|---|---|
| **Not configured** | `ADMIN_EMAILS` unset (`isAdminAuthConfigured()===false`) | `<DegradedBanner missing="ADMIN_EMAILS">` + guidance. No form. This is today's live state. |
| **Form (default)** | configured, no flag | `<form action={requestLink}>`: `<label text-label>` + `Input[type=email, required, autoComplete=email, inputMode=email]` + `Button[type=submit].w-full` "Email me a sign-in link". |
| **Sent** | `?sent=1` (after submit) | `role="status"` well: `border-primary/40 bg-primary-muted`, bold `text-primary` "Check your email." + neutral muted follow. Replaces the form. |
| **Denied** | `?denied=1` (non-allowlisted / callback rejected) | `role="alert"` banner: `border-border-strong bg-surface-muted`, bold `text-error` "Not authorized." Shown **above** the form/config block. |
| **Error** | `?error=invalid_email\|not_configured\|missing_code\|exchange_failed` | `role="alert"` muted banner with mapped copy (see `errorCopy`). |

### Interaction & security notes
- Allowlist is checked **before** any link is sent; outcome messaging is **neutral** ("if that address is an operator account…") so the allowlist can't be enumerated.
- Submit is a full-page Server Action round-trip → redirect. No client spinner today; button relies on native submit. *If added later*: disable + spinner on `pending`, honor reduced-motion.
- `emailRedirectTo` = `${origin}/admin/auth/callback`, origin derived from `x-forwarded-host`/`host` (fallback `NEXT_PUBLIC_SITE_URL`).

### Edge cases
- Long email → `Input` is full-width, native truncation via scroll. No maxlength (server zod-validates).
- No JS → form still posts (Server Action). ✔
- Reduced motion → no motion present. ✔

---

## B. Authed shell — `src/app/admin/(console)/layout.tsx`

Wraps the overview + five sections. `requireAdmin()` gates it (redirects unauth → `/admin/login`); the `(console)` route group keeps `login`/`auth` **outside** so the guard never loops.

### Header
`header.border-b border-border bg-surface` → inner `mx-auto max-w-[1120px] flex items-center justify-between gap-3 px-3 py-3 md:px-5`:
- Left: wordmark `font-heading text-h3 text-primary` "Operator Console".
- Right (`flex items-center gap-3`): operator email `text-caption text-on-surface-muted truncate max-w-[200px] hidden sm:inline` (title=email) + sign-out `<form action={signOut}>` → `button.text-caption text-on-surface-muted underline underline-offset-2 hover:text-on-surface` "Sign out".

### Main
`main.mx-auto max-w-[1120px] flex-1 px-4 py-6 md:px-5`.

### States / a11y
- Unauth → redirect (never renders). Non-allowlisted → `requireAdmin` redirects `?denied=1`.
- Sign-out = real form/Server Action (`supabase.auth.signOut()` → redirect `/admin/login`); works without JS.
- Email truncates at 200px, hidden `<sm` (mobile).

---

## C. Section nav — `src/components/admin/AdminNav.tsx`

Client Component (`usePathname` for active state). `nav[aria-label="Console sections"].border-b border-border bg-surface` → `div.mx-auto max-w-[1120px] flex gap-1 overflow-x-auto px-3 md:px-5`.

Six tabs (order fixed): **Overview** `/admin` · **Queue** `/admin/queue` · **Submit** `/admin/submit` · **Agents** `/admin/agents` · **Site** `/admin/site` · **Log** `/admin/log`.

| Tab state | Spec |
|---|---|
| Base | `shrink-0 border-b-2 px-3 py-3 text-body-sm transition-colors` |
| Active | `border-primary text-primary-hover` + `aria-current="page"`. Overview is **exact-match** (`pathname==='/admin'`); others match `href` or `href/*`. |
| Inactive | `border-transparent text-on-surface-muted hover:text-on-surface` |

Mobile: row scrolls horizontally (`overflow-x-auto`, `shrink-0` tabs) — no wrap, no hamburger.

---

## D. `DegradedBanner` — `src/components/admin/DegradedBanner.tsx`

The single honest-degradation idiom (see README §3). Every later panel imports this.

- Container: `role="status" rounded-md border border-border-strong bg-surface-muted px-4 py-3 text-body-sm text-on-surface`.
- Line: bold `text-warning` "Not configured" + `text-on-surface-muted` " — this needs " + `<code class="rounded-sm bg-surface px-1 py-[2px] font-mono text-caption">{missing}</code>`.
- Optional `children` → `<p class="mt-2 text-caption text-on-surface-muted">`.

| Prop | Type | Notes |
|---|---|---|
| `missing` | `string` (required) | Literal dependency name shown in the chip |
| `children` | `ReactNode` (optional) | Guidance / remediation copy |

---

## E. Section empty states (five) + Overview shell

Every page calls `requireAdmin()` (per-page boundary) then renders a consistent block: header (`flex flex-col gap-1`: `h2` title + `text-body-sm text-on-surface-muted` description) then content.

| Route | Title | Empty copy (in a `Card`) |
|---|---|---|
| `/admin/queue` | Approval queue | "No items awaiting review. …arrive in Phase A3." |
| `/admin/submit` | Submit | "The structured submission forms arrive in Phase A3." |
| `/admin/agents` | Agents | "Run triggers and the run history arrive in Phase A4." |
| `/admin/site` | Site | "Deployment and error panels arrive in Phase A5. …names its missing token…" |
| `/admin/log` | Activity log | "No actions recorded yet. …arrives in Phase A3." |

**Overview** (`/admin`, `(console)/page.tsx`): header + `<DegradedBanner missing="live monitoring (Phase A2)">` + a `grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3` of six `Card`s, each `flex flex-col gap-2` with `h2.text-overline text-on-surface-muted` title + `text-body-sm text-on-surface-muted` note. Panels: Agent runs · Freshness · Feed health · Pipeline state · Waiting on Jason · Open risks. These become live in A2 → [phase-a2-monitor.md](phase-a2-monitor.md).

---

## F. Verified (Phase A1)
`tsc`, `eslint` (0 err), `next build` (6 admin routes + login + callback dynamic; Proxy recognized), embedded regression 58/58. Preview: unauth→login, "Not configured: ADMIN_EMAILS", callback `?error=missing_code`, `?denied=1`, voter nav intact on `/`, clean mobile+desktop, no console errors. **Behind-auth render + sign-in e2e pending founder gate A00b** (not faked).
