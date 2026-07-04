# ADR-001: Mobile/desktop mirror apps as thin shells over the deployed site, with a shell-parity harness

**Status:** Proposed
**Date:** 2026-07-03
**Deciders:** Joseph (founder)

## Context

Know Your Vote is a Next.js 16 App Router site, server-rendered on Vercel (redirects in
`next.config.ts`, API routes, Vercel cron, Supabase SSR, Sentry). There is one codebase and
one deploy pipeline, and it must stay that way.

The goal: a "mirror app" — open an app icon on a phone and see exactly what the deployed
website shows, updated the moment the site deploys, with **no second codebase to maintain**.
Where the app behaves differently from the website (and it will, slightly), those differences
should be **visible and tracked**, not silently ignored.

Two constraints discovered during design:

1. **Electron is desktop-only.** It runs on macOS/Windows/Linux, never iOS/Android. The
   phone-equivalent of "Electron shell around the site" is a PWA (installed web app) or a
   Capacitor WebView shell. Electron remains available as an optional *desktop* sibling using
   the identical pattern.
2. **The site cannot be statically exported.** SSR pages, API routes, `redirects()`, Supabase
   SSR, and Vercel cron all require the server. Any architecture that bundles the UI into an
   app binary (Capacitor bundled mode, Expo, React Native) forfeits "one codebase, always in
   sync" and is rejected up front.

Forces: solo founder (near-zero ops budget for a second artifact), civic-info product whose end
users are heavily mobile, unknown-yet whether app-store distribution is ever needed, existing
Sentry + Supabase infrastructure that can double as the parity-reporting plane.

## Decision

Adopt the **remote-shell pattern**: every "app" is a thin shell whose content is always the
live production URL. The Next.js repo stays the single source of truth; a deploy updates the
website and every shell simultaneously, because shells render the deployed site, not a copy.

Phased:

- **Now — Phase 1 (PWA + parity harness):** make the site installable (web manifest, icons,
  standalone display) and build the shell-parity harness described below. "Add to Home
  Screen" on the phone gives the mirror-app experience with zero new artifacts.
- **Later — Phase 2 (store shells, only if distribution demands it):** Android via Trusted Web
  Activity (Bubblewrap) for Play Store; iOS via a Capacitor shell pointed at the production
  URL (needs added native value to clear Apple's minimum-functionality bar). Desktop via
  Electron or Tauri `loadURL(PROD_URL)` only if a dedicated desktop window (e.g. for the admin
  console) proves useful.

### Shell-parity harness (the "see the differences" mechanism)

1. **Shell identity + build beacon.** A small client module detects which shell it is running
   in (`browser`, `pwa-standalone` via `display-mode: standalone`, `capacitor`, `electron` via
   an injected global) and reads the build SHA exposed at build time
   (`NEXT_PUBLIC_BUILD_SHA` from Vercel's `VERCEL_GIT_COMMIT_SHA`). It sets both as **Sentry
   tags**, so every existing error/session report is segmented by shell and build for free.
2. **Capability snapshot.** Once per session the module feature-detects the properties that
   actually drift between shells (service worker, push permission model, storage persistence,
   cookie access, safe-area insets, viewport, UA) and POSTs one row to `/api/shell-report`
   (Supabase table `shell_report`: shell, build_sha, capabilities jsonb, created_at).
   Staleness is now measurable: a shell reporting an old `build_sha` has a caching problem —
   the exact "update didn't propagate" failure this beacon exists to catch.
3. **`/shell-check` page** (sibling of the existing `/style-check`): renders the live
   capability matrix in-page. Open it on the phone inside the installed app and *see* the
   differences directly.
4. **CI drift report.** A Playwright job runs key routes under a device matrix — desktop
   Chromium, iPhone WebKit emulation, Android Chromium emulation (and the Electron shell if
   Phase 2 builds one) — and diffs screenshots + console errors against baseline. Output is a
   per-route drift artifact on each deploy, so rendering differences are reviewed, not
   discovered by users.

### Expected difference classes (catalogued, not ignored)

| # | Difference | Where it bites | Mitigation |
|---|------------|----------------|------------|
| 1 | No browser chrome in standalone mode (no URL bar/back button) | Installed PWA, all shells | In-app nav must be complete; external links open system browser |
| 2 | Safe-area insets (notch, home indicator) | iOS installed/wrapped | `viewport-fit=cover` + `env(safe-area-inset-*)` utilities |
| 3 | Engine split: WebKit on iOS shells vs Chromium elsewhere | Tailwind 4 modern CSS on older iOS | Visual-diff CI catches; degrade gracefully |
| 4 | Cookie/storage partitioning and eviction | Supabase auth in standalone/WebView | Beacon reports cookie/storage state; matters mainly for admin login |
| 5 | OAuth-style redirect flows can bounce out of standalone context | Any future login-on-mobile | Test in `/shell-check`; prefer same-origin auth flows |
| 6 | Web push: iOS requires installed PWA (16.4+); Capacitor would use native push | Notifications, if ever added | Capability snapshot records push availability per shell |
| 7 | Stale content pinned by SW/WebView cache | All shells | Build-SHA beacon flags shells behind production |
| 8 | Deep links / universal links | Store shells only | Phase 2 concern; config lives in shell, not site |

## Options Considered

### Option A: PWA — manifest + icons + standalone display (chosen for Phase 1)

| Dimension | Assessment |
|-----------|------------|
| Complexity | Low — a manifest file, icons, small meta additions to the one repo |
| Cost | ~0 ongoing; no new deploy artifact |
| Sync fidelity | Perfect by definition — it *is* the website |
| Team familiarity | High — stays entirely inside Next.js |

**Pros:** One codebase literally; installs from Safari/Chrome today; every deploy instantly
live; prerequisite for the Play Store TWA path anyway.
**Cons:** No app-store presence; iOS imposes limits (push only when installed, storage
eviction); "install" is a Share-menu gesture, not a store download.

### Option B: Thin remote-URL native shells (Capacitor mobile, Electron/Tauri desktop) — Phase 2

| Dimension | Assessment |
|-----------|------------|
| Complexity | Medium — small shell projects (config + icons), signing, store accounts |
| Cost | Apple $99/yr, Play $25 once; shell rebuilds only when shell config changes |
| Sync fidelity | Content perfect (remote URL); shell binary itself rarely changes |
| Team familiarity | Low — new toolchains, but tiny surface area |

**Pros:** Store distribution and real app icons; native APIs become available if ever needed;
content updates still require zero releases.
**Cons:** Apple guideline 4.2 rejects bare website wrappers — an iOS shell must add native
value; requires connectivity (no offline bundle); another repo/dir to sign and ship.

### Option C: Bundled hybrid with OTA updates (Capacitor bundled assets + Capgo/Appflow)

| Dimension | Assessment |
|-----------|------------|
| Complexity | High — static export, OTA pipeline, version skew management |
| Cost | OTA service fees + ongoing drift management |
| Sync fidelity | Weak — app assets are a copy that chases the site |
| Team familiarity | Low |

**Pros:** Offline capable; fully native store posture.
**Cons:** Requires `output: 'export'`, which this site cannot do (SSR, API routes, redirects,
cron); creates the permanent two-artifact drift problem this ADR exists to avoid. **Rejected.**

### Option D: React Native / Expo companion app

**Rejected without table:** a second codebase by definition — violates the prime constraint.

## Trade-off Analysis

The decisive question is **"who needs to install this, and from where?"** For the current need
— founder previews on a phone, early users pinning the site — Option A is strictly dominant:
perfect sync is structural, not engineered. Option B only earns its complexity when app-store
distribution becomes a real acquisition channel; it layers cleanly on top of A (TWA literally
requires the PWA), so choosing A now forecloses nothing. Option C trades away the single
non-negotiable (one always-in-sync codebase) to gain offline support nobody has asked for.

Electron specifically: the site in a desktop browser already *is* the desktop experience. The
one future scenario where an Electron/Tauri shell earns its keep is a dedicated always-open
window for the `/admin` operator console — park it as a note, not a commitment.

The parity harness is the real insurance: it converts "there might be slight differences" from
an anxiety into a dashboard, regardless of which shells exist.

## Consequences

- **Easier:** shipping — one deploy updates web + all shells atomically; mobile QA — open the
  installed app, it is the latest deploy; diagnosing shell-specific bugs — Sentry is tagged by
  shell + build SHA.
- **Harder:** anything offline-first (explicitly out of scope); iOS store distribution later
  will require designing genuine native value, not just a wrapper.
- **Revisit when:** app-store distribution becomes an acquisition priority (activate Phase 2);
  push notifications enter the roadmap (shell choice affects push architecture); or the admin
  console wants a desktop window (evaluate Tauri vs Electron then).

## Action Items

1. [ ] Add web manifest + icon set + `display: standalone` + `viewport-fit=cover` (confirm the
       Next 16 manifest/metadata convention against `node_modules/next/dist/docs/` before
       writing code, per AGENTS.md).
2. [ ] Expose `NEXT_PUBLIC_BUILD_SHA` from `VERCEL_GIT_COMMIT_SHA`; render in footer meta +
       beacon payload.
3. [ ] Build shell-identity module: detect shell, set Sentry tags `shell.kind` and `build.sha`.
4. [ ] Add `/api/shell-report` route + `shell_report` Supabase table (next migration number in
       sequence) + once-per-session capability beacon.
5. [ ] Add `/shell-check` page rendering the live capability matrix.
6. [ ] Add Playwright device-matrix drift job (desktop / iPhone WebKit / Android Chromium)
       producing a per-route screenshot + console diff artifact per deploy.
7. [ ] Phase 2 (deferred, gated on distribution need): Bubblewrap TWA for Play Store; Capacitor
       iOS shell with added native value; optional Tauri/Electron admin window.
