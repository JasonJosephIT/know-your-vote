# Branch Consolidation Report — 2026-11-22

- **Integration branch:** `consolidate/2026-11-22`
- **Base:** `origin/main` at `f1d9d5c4de70c057166841f454dc101cd5682cc6` (`docs: move code graph to central store, refresh docs/map/MAP.md`)
- **Summary:** 5 merged, 7 skipped (6 `SKIP-SUPERSEDED`, 1 `SKIP-UNFINISHED`), 0 branches deleted, `main` untouched.

## Branch Decisions

| branch | decision | reason | conflicts resolved (files) | tests |
|---|---|---|---|---|
| `claude/admin-signin-send-error` | `MERGE` | Checks `{ error }` from `supabase.auth.signInWithOtp` on `/admin/login` and redirects to `?error=send_failed` with operator-facing copy instead of silently reporting `sent=1`; `origin/main` still drops the error (`f202b15`). | None (clean merge `d6701c1`) | Pass |
| `claude/c7-pipeline-completion-98ae33` | `SKIP-SUPERSEDED` | 2026-09-18 C7 news-sources/sitemap/sweep pipeline, lean ratings, and `scripts/news-characterize-eval.ts` (C14) all landed on `main` in newer form (`TAXONOMY_VERSION = "7"`, category questions dropped, `leanTag` populated, `news-sweep.ts` +1,158 lines ahead). Branch docs assert obsolete Sep 18 blockers (0/37 `leanTag`, unapplied `0027`) and its eval scorer targets the dropped 26-question two-level taxonomy. | — | — |
| `claude/election-office-lookup-af7473` | `SKIP-UNFINISHED` | 2026-09-09 draft (`1bde01b`) of a 67-county SOE directory built against deleted `ZipEntry.tsx` and pre-redesign home/`CountyPicker`/`voting-info`, using pre-2026-09-24 DoS contact CSV data. Explicitly deferred in `docs/design/home-readability-2026-10-12/home-readability.md` §9.9 to be revisited after Nov 3 with refreshed DoS data and `LocationEntry`/`supervisors.ts` integration. Its three side-fixes (`fldoe.org` link, Orange SOE URL, `allowImportingTsExtensions`) are already in `main`. | — | — |
| `claude/geocoding-api-district-lookup-f39262` | `SKIP-SUPERSEDED` | Touches only `docs/superpowers/plans/2026-09-09-address-district-lookup.md` and `docs/superpowers/specs/2026-09-09-address-district-lookup-design.md`, both already on `origin/main` in newer updated forms (migrations renumbered `0024`–`0026`, cross-check measurements added), and the feature itself is implemented on `main` (including Google geocoding in `19f1e69`). | — | — |
| `claude/launch-missing-features-62fa00-local-2026-11-22` | `SKIP-SUPERSEDED` | All code features (`/about`, `/terms`, site footer via `SiteFooter` in root layout, `sitemap.ts`, `CandidateBrief.tsx`, `src/lib/contact.ts`) are already on `origin/main` in newer founder-confirmed form (`info@knowyour.vote` replacing `hello@knowyour.vote`, HM7 report-a-mistake footer, phone art). The 2026-10-03 `docs/launch-checklist.md` audit was superseded by `docs/general-election/launch-handoff-2026-10-04.md` (PR #108/#109). | — | — |
| `claude/queue-review-2026-10-31` | `MERGE` | Adds `docs/general-election/queue-review-2026-10-31.json` and `docs/general-election/queue-review-2026-10-31.md` (drafted verdicts for 662 pending review rows: 182 approve, 466 reject, 14 held); absent from `origin/main` (which stops at `2026-10-22`). | None (clean merge `6ebbf23`) | Pass |
| `claude/raw-worktree-snapshot-m7vwv1` | `SKIP-SUPERSEDED` | 2026-08-01 reconciliation branch (admin console phases A2–A5, candidate news/contact, demo seed, brand assets/PWA, CAP 2026 roster/issues/prompts) already merged into `main` via PR #14 (`6ee8640`, `d211bc6`, `6a8c10c`, `1701b31`, `cad36b6`). The 5 files absent on `main` today (`src/lib/location.ts` and 4 old mobile screenshot placeholders) were later removed/replaced on `main`. | — | — |
| `claude/relaxed-darwin-kckcxu` | `SKIP-SUPERSEDED` | Byte-for-byte identical git tree (`e338e0a31ac11b8db8cd1f87e20683a552995868`) to `claude/queue-review-2026-10-31`, created 56 minutes later for a read-only dry run; superseded by merging `claude/queue-review-2026-10-31`. | — | — |
| `routine/amendment-recheck-2026-10-19` | `MERGE` | Adds `docs/general-election/corrections/2026-10-21-amendment-resource-publication.{md,sql}` (explicit founder-authorized freeze exception applied live to production 2026-10-22) plus 2026-10-19 re-check, 2026-10-22 correction, and 2026-10-21 publication verification sections in `docs/general-election/measure-resources-verified-2026-09-24.md`; absent from `origin/main`. | `docs/general-election/measure-resources-verified-2026-09-24.md` (kept both 2026-10-14 `0061` section and 2026-10-19/21 sections in chronological order; merge `534806b`) | Pass |
| `routine/amendment-recheck-2026-10-26` | `MERGE` | Adds 2026-10-26 weekly amendment re-check log (county Democratic party committee findings, checked-nothing-found log, gate picture) to `docs/general-election/measure-resources-verified-2026-09-24.md`; absent from `origin/main`. | `docs/general-election/measure-resources-verified-2026-09-24.md` (kept all prior dated sections and appended 2026-10-26 section verbatim; merge `84dd214`) | Pass |
| `routine/amendment-recheck-2026-11-02` | `MERGE` | Adds 2026-11-02 weekly amendment re-check log (Sun Sentinel and Orlando Sentinel editorial board oppositions to AM1/AM2, checked-nothing-found log, gate picture) to `docs/general-election/measure-resources-verified-2026-09-24.md`; absent from `origin/main`. | `docs/general-election/measure-resources-verified-2026-09-24.md` (kept all prior dated sections and appended 2026-11-02 section verbatim; merge `0b0f638`) | Pass |
| `wip/raw-worktree` | `SKIP-SUPERSEDED` | Single-commit 2026-08-01 WIP snapshot (`ebf27cb`) that was split into `claude/raw-worktree-snapshot-m7vwv1` and merged via PR #14; also contains temporary `reconcile-git.sh` and generated HTML ops digests intentionally excluded/gitignored on `main`. | — | — |

## Test Results: Before vs After

All commands match `.github/workflows/ci.yml` (`checks` and `build` jobs). Live-DB checks that require `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` were skipped identically in both runs.

| Check | Baseline (`origin/main` @ `f1d9d5c`) | Post-Merge (`consolidate/2026-11-22` @ `0b0f638`) | Delta |
|---|---|---|---|
| `npm run lint` (`eslint`) | **PASS** (exit 0; 0 errors, 5 pre-existing warnings) | **PASS** (exit 0; 0 errors, 5 pre-existing warnings) | No regression |
| `npm run typecheck` (`tsc --noEmit`) | **PASS** (exit 0) | **PASS** (exit 0) | No regression |
| `npm run verify:python` (`node scripts/verify-all.mjs --python`) | **PASS** (443 tests in 7 folders, 1 skipped, 0 failed) | **PASS** (443 tests in 7 folders, 1 skipped, 0 failed) | No regression |
| `npm run verify` (`node scripts/verify-all.mjs`) | **PASS** (102 passed [2 offline only], 0 failed, 3 skipped [needs env], 105 total) | **PASS** (102 passed [2 offline only], 0 failed, 3 skipped [needs env], 105 total) | No regression |
| `npm run build` (`next build` w/ CI placeholder env) | **PASS** (exit 0; 38/38 static pages generated) | **PASS** (exit 0; 38/38 static pages generated) | No regression |

## Reviewer Notes

- `docs/general-election/measure-resources-verified-2026-09-24.md` contains chronological entries from `2026-10-14` (`0061`), `2026-10-19` (+ `2026-10-22` correction & `2026-10-21` founder-authorized publication), `2026-10-26`, and `2026-11-02`. Because `routine/amendment-recheck-2026-10-26` and `routine/amendment-recheck-2026-11-02` branched before `routine/amendment-recheck-2026-10-19` merged, their individual gate-picture paragraphs describe deltas relative to the pre-10-21 published counts while preserving each session's exact audit trail verbatim.
- `src/app/admin/login/page.tsx` from `claude/admin-signin-send-error` has a minor spacing typo (`exchange_failed:"That..."`) left verbatim from the merged commit; it passes `eslint`, `tsc --noEmit`, and `next build`.
- `claude/election-office-lookup-af7473` remains preserved on `origin` for the planned post-Nov-3 refresh noted in `docs/design/home-readability-2026-10-12/home-readability.md` §9.9.
