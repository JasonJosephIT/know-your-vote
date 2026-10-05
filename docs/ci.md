# CI

**Status: Recommended (pending founder confirmation).** This is the CI item in §7 of the launch handoff (`docs/general-election/launch-handoff-2026-10-04.md`, founder decision 13). The recommendation is yes: run the checks below on every pull request and on every push to `main`, and make them required before a merge. Nothing ships until the founder merges the pull request that adds it.

Until now only Vercel ran on a pull request. Vercel builds a preview, but none of the `scripts/verify-*` checks (48 on 2026-10-04) or the 435 Python unit tests ran anywhere unless someone remembered to run them. Pushes to `main` deploy production, so a change that breaks a check could reach voters.

## What runs

The workflow is `.github/workflows/ci.yml`. It has three jobs.

| Job | When | Step | What a failure means |
| --- | --- | --- | --- |
| `checks` | every pull request, every push to `main`, manual | `npm run lint` | ESLint found an error |
| | | `npx tsc --noEmit` | a type error in `src/` (see "Not covered" for `scripts/`) |
| | | `node scripts/verify-all.mjs` | a `verify-*` script failed (see below) |
| | | `node scripts/verify-all.mjs --python` | a Python unit test failed |
| `build` | same | `npm run build` with placeholder Supabase settings | the app does not compile or prerender |
| `live-db` | manual only, when ticked | `node scripts/verify-all.mjs --live` | a read-only check against production failed |

Details that matter:

- **Every step in `checks` runs, even after an earlier one fails.** One run shows every problem, not just the first.
- **Node 22, from `actions/setup-node@v7`, with the npm cache.** The `.ts` scripts use Node's built-in type stripping, which needs Node 22.18 or later. The runner checks this and says so.
- **Python 3.11.** The tests need only the standard library.
- **Permissions are `contents: read`.** The checkout keeps no credentials (`persist-credentials: false`).
- **Superseded runs are cancelled on pull requests only.** A newer push to the same pull request cancels the older run. Every other run (a push to `main`, a manual or scheduled run) gets a concurrency group of its own, keyed by its run id, so nothing cancels it or queues it behind another, and every commit that deploys gets a result.
  - A shared group for `main` would not promise that, even with `cancel-in-progress` off. GitHub keeps one pending run per group, and a newer run replaces it, so the middle of three quick pushes would get no result.
- **Actions are pinned to major versions:** `checkout@v7`, `setup-node@v7`, `setup-python@v7` and `cache@v6`, the latest majors on 2026-10-04.

### The verify runner

`scripts/verify-all.mjs` finds every `scripts/verify-*.ts` and `scripts/verify-*.mjs` by name, so a new script is picked up with no edit. Each one ends in one of three states:

- **PASS:** it exited 0.
- **FAIL:** any other exit, a crash or a timeout (5 minutes). One failure makes the run fail.
- **SKIPPED (needs env):** the script stopped because a live-database variable is missing.
  - The live scripts share one guard that prints `FAIL  environment: NAME is not set` and exits.
  - The runner treats that as a skip only when it is the **only** `FAIL` line the script printed. A script that failed a real check before it reached the guard is a failure.
  - Skips do not fail the run, because a laptop or a fork cannot reach the database, and that says nothing about the code. They are never silent: each one is listed in a "NOT RUN" block, counted in the summary line and raised as a warning on the pull request.

Two scripts get special handling:

- **`verify-notifications-schema.mjs`** runs its dry-run checks and skips its live probes when the env is missing. It passes, and is listed as **PARTIAL** so it stays visible.
- **`verify-news-neutrality.ts`** also runs with `--self-test`, its offline mode, so its matcher is tested on every pull request even when the live lint is skipped.

The runner never passes `SUPABASE_SERVICE_ROLE_KEY` to a script unless it is given `--allow-write-probes`, and it refuses that flag for production. See "Write probes are opt-in" under "Run it locally".

The five scripts that boot embedded Postgres (PGlite) take about half a gigabyte each. They run one at a time in their own lane while the light scripts run three at a time.

### The Python tests

The tests live under `Civic Awareness (Know Your Vote)/`, in seven folders whose names contain spaces and, in one case, a colon (`Agents/Orchestrator : Synthesis Layer`). None of these folders is a Python package, so a single `python -m unittest discover` from the top finds only the top-level file. `--python` runs discovery once per folder, from inside it, which is also how each test imports the module beside it.

If no folder holds a `test_*.py`, or a folder runs zero tests, the step fails rather than passing vacuously.

On 2026-10-04 all 435 tests pass:

- In a clean Python 3.11 with nothing installed, 1 test is skipped, because `tldextract` is absent.
- Where the `mcp` package is installed, a second test is skipped. That test covers the case where `mcp` is absent, so CI runs it.

### The build with placeholders

The `build` job sets `NEXT_PUBLIC_SUPABASE_URL=https://ci-placeholder.invalid` and `NEXT_PUBLIC_SUPABASE_ANON_KEY=ci-placeholder-anon-key`. These are placeholders, never real values. The `.invalid` domain is reserved and never resolves, so no request leaves the runner.

Every read that runs at build time already copes with a database it cannot reach, and renders empty:

- `generateStaticParams` for races and measures;
- the sitemap;
- the methodology counts;
- the deadline banner, which uses the service-role client and catches its absence.

So the build proves the app compiles and prerenders without depending on the database at build time. Vercel still runs its own build on every pull request.

Supabase's client retries a failed read three times (1 s, 2 s, then 4 s), so each build-time read waits about 7 seconds before it gives up. If that ever makes the build slow, delete the two placeholder lines from the `next build` step. The build then takes the "unconfigured" path the code also supports, where creating the client throws and is caught at once.

## Today's state (2026-10-04)

These are the results at the time of writing, on the handoff branch, while other changes were still in progress. The first CI run on the pull request is the authority.

- **`npm run lint` is red on `main`.** The cause is one error in `scripts/probe-district-api.ts:202` (`no-explicit-any`). The fix is one line: an `eslint-disable-next-line` with a reason, because the script exists to discover that response's shape. It has been handed to the launch coordinator. Until it lands, the lint step in `checks` is red.
- **`npx tsc --noEmit` is green.**
- **`verify-all` locally** (49 runs, about 60 seconds):
  - 44 passed outright;
  - 3 skipped for env: `verify-admin-ops.mjs`, `verify-news-neutrality.ts` and `verify-refresh-schema.mjs`;
  - 1 partial: `verify-notifications-schema.mjs`;
  - 1 red: `verify-demo-seed.mjs`. Migration `0042_news_source_backfill.sql` (commit 9082bbe) adds government sources, and the script's teardown check still expects 4 ("expected 4 government sources, saw 7"). The fix belongs with that migration's owner.
- **Now green:**
  - `verify-news-ungated.ts` (TC-4 in `docs/general-election/things-to-confirm.md`, resolved on this branch);
  - `verify-listing.ts`, after the `listing-copy.ts` change was reconciled;
  - `verify-no-stored-location.ts` (see "The stored-location check").
- **The Python tests are green:** 435 tests in 7 folders.
- **The live checks:** run once by hand against production with the public anon key, and re-checked with a read-only query.
  - `verify-news-neutrality.ts` **fails today**. Eight `election_news` rows in production have no `source_id` (migration 0014 is not applied; handoff §5 covers the backfill of all eight). The lint reads only the last 30 days, which holds 2 of them, both dated 2026-09-09.
  - **It turns green on its own from 2026-10-09** unless new news arrives, while all eight rows are still unsourced. A green run after that date does not mean the rows were fixed.
  - `verify-refresh-schema.mjs` passed its read-only check 1, then stopped at the service-role guard.

## Run it locally

From the repository root, with Node 22.18 or later:

```bash
npm ci
npm run lint
npm run typecheck              # tsc --noEmit
npm run verify                 # every scripts/verify-* script
npm run verify -- news         # only the scripts whose name contains "news"
npm run verify -- --jobs 1     # one at a time, on a machine short of memory
npm run verify:python          # the Python tests (python3, or set PYTHON=...)
```

To run the live checks as well, put the two public values in `.env.local`. The scripts load it themselves.

```bash
NEXT_PUBLIC_SUPABASE_URL=https://pqracitpmzpiqfnzlngw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<the anon key: Supabase dashboard, Project Settings, API>
```

Then run `node scripts/verify-all.mjs --live`, which runs only the scripts that read the live database.

### Write probes are opt-in

With `SUPABASE_SERVICE_ROLE_KEY`, three scripts write, or try to write, synthetic probe rows:

- `verify-admin-ops.mjs` (anon insert probes on the ops tables);
- the second half of `verify-refresh-schema.mjs` (inserts and deletes on `news_item`, anon inserts on `news_item` and `candidate_contact`);
- the live half of `verify-notifications-schema.mjs` (an upsert and a delete on `notification_send_log`).

Each one loads `.env.local` itself, `.env.example` lists the key, and the only Supabase project is production. So **`npm run verify` never hands that key to any script**, even when `.env.local` or your shell sets it. The runner gives every script an empty `SUPABASE_SERVICE_ROLE_KEY`, which `process.loadEnvFile` leaves alone. Those three report SKIPPED or PARTIAL with "withheld" in the reason, and the footer says when a key was found but not passed on. The runner checks that `loadEnvFile` behaves this way on your Node before it relies on it, and refuses to run if it does not. A laptop now sees what CI sees.

To run the write probes against a **development** project, pass the flag:

```bash
node scripts/verify-all.mjs --allow-write-probes      # or: npm run verify -- --allow-write-probes
```

The runner refuses the flag, before any script starts, when the URL the scripts would use names the production project (`pqracitpmzpiqfnzlngw`), whether that URL comes from your shell or from `.env.local`. It matches the project ref, which is production's only address today. Running a script by name (`node scripts/verify-refresh-schema.mjs`) has no such guard, so check `.env.local` first.

## Founder actions

These need the repository owner. An agent cannot do them.

### 1. Make the checks required (branch protection)

Do this after the pull request that adds CI has run once. A status check can only be picked after GitHub has seen it.

1. On GitHub, open **JasonJosephIT/know-your-vote**, then **Settings**, then **Rules**, then **Rulesets**, then **New ruleset**, then **New branch ruleset**.
   - The classic path, **Settings**, then **Branches**, then **Add branch protection rule**, has the same options.
2. Name it `main`, set **Enforcement status** to **Active**, and under **Target branches** add the default branch.
3. Tick **Require a pull request before merging**. Pushes to `main` deploy production, so every change goes through a pull request and its checks.
4. Tick **Require status checks to pass**, then **Add checks**, and add **`checks`** and **`build`**. Leave `live-db` out: it reads production and only runs by hand.
   - Optionally, also require the Vercel check.
5. Recommended (pending founder confirmation): keep yourself on the **Bypass list** (Repository admin), so an urgent fix on Election Day is never blocked by a broken check. Remove the bypass if you want no exceptions.
6. Save.

### 2. Add the live-database secrets (optional)

This enables the `live-db` job.

1. **Settings**, then **Secrets and variables**, then **Actions**, then **New repository secret**.
2. Add `NEXT_PUBLIC_SUPABASE_URL` = `https://pqracitpmzpiqfnzlngw.supabase.co`.
3. Add `NEXT_PUBLIC_SUPABASE_ANON_KEY` = the anon key from the Supabase dashboard (**Project Settings**, then **API**). It is public by design: the site already ships it to every browser. A secret keeps it out of logs.
4. **Do not add `SUPABASE_SERVICE_ROLE_KEY`.** The workflow does not read it, and the checks that need it write probe rows.
5. To run the job: **Actions**, then **CI**, then **Run workflow**. Tick **live** and choose **Run workflow**.

Without the secrets, the job prints a warning and stops. Secrets are never passed to pull requests from forks, and only `live-db` reads them.

## Recommendations, and how to flip each

| Recommendation (pending founder confirmation) | How to flip it |
| --- | --- |
| Add CI at all | Delete `.github/workflows/ci.yml`, or disable the workflow under **Actions**, then **CI**, then **...**, then **Disable workflow**. |
| `checks` and `build` are required on `main` | Edit the ruleset in founder action 1. |
| Live checks run by hand only, with no schedule | Uncomment the two `schedule:` lines in `ci.yml`. The `live-db` job already accepts the schedule event. Until 2026-10-09 it would send a daily failure email; after that it would pass while 8 rows still have no `source_id` (see "Today's state"). Backfill those rows first (handoff §5). |
| The live job gets the anon key only | No flip is recommended. Giving it the service-role key would let three scripts write probe rows to production. Even then, `verify-all` withholds the key unless `--allow-write-probes` is passed, and refuses that flag for production. |
| `verify-all` withholds the service-role key; write probes are opt-in | Pass `--allow-write-probes`, for a development project only. To drop the default, change `CHILD_ENV` in `scripts/verify-all.mjs` to pass `process.env` unchanged. Not recommended while production is the only project. |
| The build uses placeholder Supabase settings | Delete the two `NEXT_PUBLIC_SUPABASE_*` lines under the `next build` step to build with none at all. |
| `kyv.ads-consent` and `kyv.donate-dismissed` are allowed device-storage keys | Remove the entry from `ALLOWED_LOCAL` in `scripts/verify-no-stored-location.ts`. If founder decision 2 removes the Google tag, the `kyv.ads-consent` entry stops matching anything and can be deleted. |

## The stored-location check

`scripts/verify-no-stored-location.ts` was red on `main`. `SitePrompts.tsx` reads and writes device storage through two small wrappers, `read(key)` and `write(key, value)`. The check could see only the parameter name `key`, and it had no entry for `kyv.ads-consent`.

The fix follows each wrapper to its call sites and resolves what they pass. It does not wave through keys it cannot resolve:

- A wrapper can be a function or an arrow assigned to a `const`, with a block body or an expression body (`const put = (key, v) => localStorage.setItem(key, v)`).
- A key it cannot follow still fails, with the reason. That includes:
  - an expression or template;
  - a `let`;
  - an anonymous callback's parameter;
  - a wrapper that reassigns its own key parameter;
  - an exported wrapper;
  - a wrapper passed around as a value;
  - a name the file also binds in a way the const lookup cannot see: a parameter, a loop variable, a destructured name or a default import;
  - bracket access;
  - `localStorage` named in a string.
- A name that is a `const` in one place and imported in another resolves to both values, and each must be allowed.
- `sessionStorage` is now covered as well as `localStorage`.
- IndexedDB, Web SQL and Cache Storage are ruled out.
- The comment stripper no longer cuts strings like `"https://..."` in half.

Two keys were added to the allowlist, each with its reason written next to it. Neither holds location:

- `kyv.ads-consent` holds `"granted"` or `"denied"`, the answer to the cookie question.
- `kyv.donate-dismissed` holds `"1"` once the donation prompt is closed.

The check now also asserts that `/privacy` names every key the code stores, since that page promises "the whole list".

To keep its teeth, it runs nineteen fixtures that put a ZIP or a location back on the device and must catch each one. It also runs two positive controls that must resolve cleanly: one shaped like `SitePrompts.tsx`, which must give exactly its two keys, and a named arrow wrapper, which must give exactly `kyv.saved`. On 2026-10-04 it was also run against a scratch copy of `src/` with real regressions, and each one failed the check:

- a `kyv.zip` write through `SitePrompts`' own `write()`;
- a literal `kyv.location` in `saved.ts`;
- a `sessionStorage` ZIP behind a constant;
- an exported storage helper;
- `kyv.donate-dismissed` renamed on `/privacy`.

An adversarial review on 2026-10-04 found a gap in the first version. An expression-bodied arrow wrapper, `const put = (key, v) => localStorage.setItem(key, v)`, sitting beside an unrelated `const key = "kyv.donate-dismissed"`, let `put("kyv.zip", zip)` pass. Six shapes of that gap passed the first version and fail this one, each in a scratch copy of `src/`:

- that wrapper at module level;
- the same inside a component, with `sessionStorage`;
- an inner arrow shadowing an outer wrapper's parameter;
- a wrapper that reassigns its key parameter;
- a brace-less `for (const key of ...)`;
- a destructured key.

All six are now fixtures, along with an imported ZIP key hidden behind a same-named local `const`.

## Not covered

- **`scripts/` is not type-checked.** `tsconfig.json` excludes it. A trial run with a scripts-only config found two errors:
  - `scripts/probe-district-api.ts:76`;
  - `scripts/verify-policy-noul.ts:80`.

  Adding scripts would need its own `tsconfig` and those two fixes. That is left as a follow-up.
- **`npm ci` was not run locally** while writing this, because other sessions were using the same checkout's `node_modules`. The first CI run is its test.
- **`next build` was not run while writing this.** The analysis above is from reading the code paths. The launch coordinator runs the build for this branch, and CI runs it on every pull request after that.
