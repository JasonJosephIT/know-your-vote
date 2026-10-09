# Roster Display (PR 2: incumbency line behind the flag, running mates, campaign website slot) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the roster facts PR 1 (0049) stores the same way for every candidate: one "Campaign website: <host>" / "Campaign website: none listed" slot on every card of all five surfaces; a "Running mate for Lieutenant Governor: <name>" line on all eight Governor cards or none; and a "<label>: Yes" / "<label>: No" incumbency line on every card of a race or none, built and tested but kept off by `SHOW_INCUMBENT_CHIP = false`.

**Architecture:** Three pure modules hold every rule and are tested under plain node: `src/lib/campaign-website.ts` (`campaignSite`), `src/lib/running-mate.ts` (`normalizeDoeText`, `runningMatesFor`, `runningMateLine`) and `src/lib/incumbency.ts` (the label table, `incumbencyFor`, `incumbencyLine`). Two presentational files render them identically on every card: `CampaignWebsite.tsx` and `RosterLines.tsx` (`IncumbencyLine`, `RunningMateLine`). The race page and the candidate page compute the two race-level values once per race, at render, from the rows the cached loaders return, and pass them to the cards as required props. Three source-scan verify scripts, sharing `scripts/source-checks.ts`, prove each guard by also running it against mutated copies.

**Tech Stack:** Next.js 16 App Router (server components; read AGENTS.md: this is NOT the Next.js you know), React 19, TypeScript, Supabase (read only, through the existing loaders), plain-Node verify scripts under Node 22 type stripping.

**Spec:** `/Users/jsloth/Projects/Civic Awareness Project(Know Your Vote)/.claude/worktrees/subagent-driven-development-a087c8/docs/superpowers/specs/2026-10-08-roster-completeness-design.md` (branch `claude/specs-gap-closure`; it is not on this branch, so read it there, read-only). This PR is rollout step 6: §3.5 (the line, behind the flag), §3.6 (the running-mate line, `normalizeDoeText`, R5's names), §3.7 (the website slot), §3.9 (cache keys), §3.11 (the TO FLIP comment), and the PR 2 parts of §6.

**Worktree:** `/Users/jsloth/Projects/kyv-build/roster2`, branch `claude/roster-display`, cut from `claude/roster-completeness` at `c79a824` (PR 1, #139, open). It already exists, with `node_modules` copied from roster1 and the `.env.local` symlink (never open it). Every command below runs from the worktree root, with:

```bash
cd /Users/jsloth/Projects/kyv-build/roster2
NODE="/Users/jsloth/Library/Application Support/Logi/LogiPluginService/PluginHosts/node22/node/bin/node"
NODEDIR="$(dirname "$NODE")"
```

**Scope.** In: the `Candidate` type's five fields; the label table, `incumbencyFor`, `incumbencyLine` and the line on the three cards, behind `SHOW_INCUMBENT_CHIP = false` (never flip it here); `runningMatesFor`, `normalizeDoeText` (moved from `scripts/roster-reads-lib.ts`) and the running-mate line on the same three cards; `CampaignWebsite` on the five surfaces; the four cache keys; R5's stored running-mate names in `scripts/candidate-leads.ts check`; the verify scripts. Out: the flip (`SHOW_INCUMBENT_CHIP = true`) and the `/methodology` paragraph (the flip PR, rollout step 9); the contact display (§3.8, after Nov 3); any migration or database write; `race.incumbent_id` / `race.is_open_seat` (never read in `src/`, D4); incumbency or running mates on `/candidates` or `/saved` (§7); R5's prompt.

**Merge preconditions (not build dependencies).** PR #139 (`claude/roster-completeness`) merges first, since this branch is stacked on it. This PR merges only after 0049 is applied live (rollout step 5), because `candidate-leads.ts check` reads `candidate.running_mate` and fails closed without it. Cut-off: merged by Fri 10-16 18:00 EDT, because it changes frozen files (`RaceListing.tsx`, `listing.ts`, `briefs.ts`); missed, it waits until after Nov 3.

## Global Constraints

Copied from the spec and the run's rules. Every task's requirements include these.

- Never apply a migration and never write the live database. The Supabase MCP `execute_sql` is for SELECT only. Never run the app's write scripts (`candidate-leads.ts queue`, `news-enqueue.ts`, any brief apply), and do not run `candidate-leads.ts check` either: it reads production with the service key.
- Never create, run, update or delete a scheduled task; never stop or message other sessions; never touch `/Users/jsloth/Projects/kyv-agent-worktree` or `/Users/jsloth/Projects/kyv-agent-runs`. R5's prompt (`agents/r5-candidate-leads.prompt.md`) is not changed here.
- Never merge, never push to `main`, never force-push, never change GitHub settings. Never print, read or copy `.env.local` or any key.
- Web: read-only GETs only; never submit a form or log in.
- `SHOW_INCUMBENT_CHIP` stays `false`. "The constant keeps its name, `SHOW_INCUMBENT_CHIP`, so the gate, the founder's decision log and the verify script keep pointing at one thing" (§3.5).
- The incumbency line: "One line on every card in a race, in the same place under the party chip, as plain caption text with no colour and no chip: **"<label>: Yes"** or **"<label>: No"**. The label is the same on every card in the race; only the value differs, as the name does." Surfaces: `CandidateBrief`, `ListedCandidateCard` and the roster cards in `RaceCompare` (§3.5).
- The label table, keyed on `race_id` (§3.5): `FL-<n>-general` → "Member of the U.S. House now"; `FL-SEN-general` → "Member of the U.S. Senate now"; `FL-GOV`, `FL-ATG`, `FL-CFO`, `FL-AGR`, `FL-ORA-MAYOR`, `FL-ORA-CLERK` → "Holds this office now"; `FL-BRO-CC*`, `FL-DAD-CC*`, `FL-HIL-CC*`, `FL-ORA-CC*` → "Member of the Broward / Miami-Dade / Hillsborough / Orange County Commission now"; `FL-BRO-SB*`, `FL-DAD-SB*`, `FL-HIL-SB*`, `FL-ORA-SB*` (including At Large 8 and Chair) → "Member of the Broward / Miami-Dade / Hillsborough / Orange County School Board now". "A `race_id` the table does not match gets no label, and its race shows no line."
- All or none: "`incumbencyFor(race, raceCandidates)` replaces `showIncumbentChip(candidate)`. It returns `{ label, byCandidate }` only when `SHOW_INCUMBENT_CHIP` is true, the race has a label, and every ballot candidate in the race has `incumbency_verified_at`; otherwise `null`, and no card in that race shows the line."
- "Computed at render, outside the data cache (3.9): the race page and the candidate page call `incumbencyFor` on the rows the cached loaders return (`getRaceBrief`, `getRaceListing`, and `runningFor()`) and pass the result to the cards." The same for `runningMatesFor`.
- "`race.incumbent_id` and `is_open_seat` stay unread in `src/`" (D4). Nothing else in `src/` reads `is_incumbent`, `incumbent_id`, `is_open_seat` or the incumbency columns (§6).
- The `/methodology` paragraph ships "in the flip PR only, so it never ships if the flag never flips" (§3.5). Not here.
- The running-mate line (§3.6): "On every Governor card (the same three surfaces), one line under the name, in the same place on each: **"Running mate for Lieutenant Governor: <name>"**, the name exactly as stored." "`runningMatesFor(raceCandidates)` returns names only when every ballot candidate in the race has `running_mate`; otherwise `null`. There is no constant: the gate is the data." "No link, no party, no photo, no separate page for a running mate."
- D6: "decode HTML entities, turn each non-breaking space into a space, collapse every run of whitespace (spaces, tabs, carriage returns, line feeds) to one space, and trim. Nothing else changes: case, accents and punctuation stay as printed. The rule is a pure function, `normalizeDoeText` in `running-mate.ts`."
- R5 (§3.6): "`scripts/candidate-leads.ts check` adds the stored running-mate names (ballot rows where `running_mate` is not NULL) to the names it compares against, so a running mate already stored is dropped as `on_roster` rather than queued. R5's 82-name roster is otherwise unchanged. The news matcher's roster (`loadRoster`) is unchanged."
- The website slot (§3.7): "One slot on every candidate card, on all five surfaces: `CandidateBrief`, `ListedCandidateCard`, the `RaceCompare` roster card, `CandidateBrowser` and `SavedCandidates`. A new shared component, `src/components/features/CampaignWebsite.tsx`, renders **"Campaign website: "** followed by either a link whose text is the site's host without `www.` (for example `cynthiaforbrowardschools.com`), or **"none listed"**, in the same muted caption. The label is identical on every card; only the value differs. The screen-reader-only candidate name stays on the link, and the URL still goes through `safeHttpUrl`; a value that fails it renders "none listed"." "The string "Official site" appears nowhere under `src/components` or `src/app`" (§6).
- Cache keys (§3.9): "`race-brief` and `race-listing` go from `v2` to `v3`, and `candidate-detail` and `candidate-listing` gain `v2`."
- §7: "Incumbency and running mates in the candidate directory (`CandidateBrowser`) and saved-candidates views. They show neither today and gain neither; they do get the website slot."
- Contact (§3.8): no change. `CandidateContact` and `SHOW_CANDIDATE_CONTACT` are untouched.
- House rules: identical space, labels and order for every candidate (a label shown for some candidates but not others is a violation); ballot order stays `src/lib/ballot-order.ts` (the cards keep the loaders' order); nothing from an agent is voter-facing until a human approves it; no rule reads party.
- Tooling: `"$NODE"` as above (the default `node` crashes on this Mac). Scripts import with relative paths and the `.ts` extension, and so do `src/lib` modules that scripts import. `scripts/` is excluded from the project `tsconfig.json`, so scripts are type-checked with the strict standalone `tsc` command in each task. UI changes are checked with `PATH="$NODEDIR:$PATH" "$NODE" node_modules/next/dist/bin/next build`.
- Commit messages: one-line subject, blank line, body, final line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Unattended run, nobody answers a permission prompt: never delete or discard (no `rm -rf`, `rm -r`, `git checkout --`, `git restore`, `git clean`, `git reset --hard`, `git stash`). Scratch space is a new `D=$(mktemp -d /private/tmp/kyv-XXXXXX)`, left in place. If a command fails or is refused, take another read-only route; never retry it in a loop. Work only in this worktree and branch.

## Decisions this PR encodes

"Spec" marks the spec's Recommended option (pending founder confirmation); "plan" marks a choice this plan makes. All of them go in the PR body (Task 6).

1. D2 (spec): the "<label>: Yes / No" line on every card, all or none per race, replacing the "Incumbent" chip, on the three surfaces that rendered the chip. Built and tested, and off: `SHOW_INCUMBENT_CHIP = false`, so voters see no incumbency line and no chip on deploy. TO FLIP (show nothing this cycle) is the state this PR ships in; turning the line on is the flip PR's one constant plus one verify expectation (spec §3.11).
2. D1 (spec): the label table above. Membership counts for the House, the Senate, each county commission and each school board; "Holds this office now" only for an office one person holds. TO FLIP ("this seat only"): in `src/lib/incumbency.ts` change every label string in `LABELS` to "Holds this seat now" and keep the patterns (so an unknown race id still gets none); set every value in `scripts/fixtures/roster/race-labels-2026-10-08.json` to the same; make `labelFor` in `scripts/roster-worksheet.ts` return it for the same ids (`verify-incumbent-chip.ts` fails if the two differ); and regenerate 0049's data with `node scripts/roster-worksheet.ts --write-migration --d1 seat` (PR 1). The cards, the props and the pages do not change.
3. D3 (spec): the flag stays false; `scripts/verify-incumbent-chip.ts` pins `false`, so only a PR that also changes that expectation can flip it. The gate (§3.11) is written into `incumbency.ts`'s TO FLIP comment.
4. D4 (spec): `race.incumbent_id` and `race.is_open_seat` stay unread in `src/`; the verify script fails if anything reads them.
5. D5 (spec): the running-mate line on all eight Governor cards, or none, gated by the data. It reaches voters on the deploy after 0049 is live. TO FLIP (store only): make `runningMatesFor` return `null`; the columns stay.
6. D6 (spec): `normalizeDoeText` moves verbatim to `src/lib/running-mate.ts`; `scripts/roster-reads-lib.ts` re-exports it, so there is still one copy. The card prints the stored name unchanged.
7. D7 (spec): the "Campaign website:" slot on every card of all five surfaces, replacing "Official site". TO FLIP (all or none per race): the race page decides once per race whether every candidate has a stored site and passes that to the cards; `CampaignWebsite` then prints nothing on every card of a race that fails it.
8. §3.9 (spec): `race-brief` v3, `race-listing` v3, `candidate-detail` v2, `candidate-listing` v2.
9. §3.6 R5 (spec): `check` compares against the roster plus the stored running mates. The read fails closed before 0049 is applied, which is why this PR merges only after the live apply.
10. Plan: one presentational file, `src/components/features/RosterLines.tsx` (`IncumbencyLine`, `RunningMateLine`), over two pure text helpers (`incumbencyLine`, `runningMateLine`), so the markup is the same for every candidate by construction and the text is tested under plain node. Yes and No come from one template string.
11. Plan: the running-mate line sits directly under the name heading ("one line under the name") and the incumbency line directly under the party-chip row ("under the party chip"), in the same place on all three cards.
12. Plan: the race-level values are required props on `CandidateBrief`, `ListedCandidateCard`, `RaceListing`, `RaceCompare` and `CandidateListing`, so `tsc` refuses any call site that forgets them; only the race page and the candidate page call `incumbencyFor` / `runningMatesFor` (checked).
13. Plan: `campaignSite` lives in a new pure module, `src/lib/campaign-website.ts`, so a script can test it. One component for all five surfaces means the directory's link changes from the primary colour to the muted caption link the other four use, and gains the 24 px minimum height.
14. Plan: the worksheet's own copy of the labels (`labelFor` in `scripts/roster-worksheet.ts`, PR 1) stays, and `verify-incumbent-chip.ts` fails if it ever differs from `incumbencyLabel` on any of the 53 race ids.
15. Plan: the 53-id label fixture, `scripts/fixtures/roster/race-labels-2026-10-08.json`, was taken from a read-only `SELECT race_id ... FROM race` on 2026-10-08 (53 rows, all `general`), with each expected label typed by hand rather than computed by the code under test; the verify script also checks it holds the same race ids as PR 1's roster fixture.
16. Plan: mutation checks import an edited copy of the module from a temp folder (`scripts/source-checks.ts` `importVariant`); the app code has no parameter that could bypass the flag. The flag-true behaviour is tested the same way, on a copy with only the constant changed.
17. Plan: R5's column read stays in `scripts/candidate-leads.ts` (a script, outside the `src/` scan), and the pure `namesToCheck` lives in `src/lib/candidate-leads.ts`, so `running-mate.ts` remains the only file in `src/` that reads `running_mate`.
18. Plan: the "Official site" check reads raw text, comments included, so the comments that named the old link are rewritten too.
19. Plan: `scripts/verify-office-title.ts` and `scripts/verify-ballot-order.ts` pinned the old candidate-page lines and cache keys; both are updated to the new forms, keeping what they protect (`office` from `runningFor` in both states; the ballot-order bump).

## Spec gaps (for the PR description, for the founder to decide)

1. Rollout step 6 says approving PR 2 "confirms D2, D5, D7 and D8's display", but neither that step's contents list nor this PR's scope includes the contact display, and §3.8 / step 12 place it after Nov 3. This PR leaves `CandidateContact` and `SHOW_CANDIDATE_CONTACT` untouched. Founder: confirm D8's display is its own after-Nov-3 PR.
2. §3.10 asks the freeze-copy PR to add five files to the frozen-file manifest. This PR puts the same display in two more: `src/components/features/RosterLines.tsx` and `src/lib/campaign-website.ts`. They should join the list.
3. PR #137 (freeze guard, open) adds a required `raceId` prop to `ListedCandidateCard` and passes it from `RaceListing` and `CandidateListing`; this PR adds `incumbency` and `runningMates` to the same prop lists. Whichever merges second rebases (adjacent lines, mechanical).
4. Step 6's live check includes `/saved`. That list renders in the browser from device storage, so the check needs a browser with a saved candidate; it cannot be a plain GET.
5. §6 lists the verify scripts PR 2 changes; two more had to change because they pinned exact text this PR edits: `verify-office-title.ts` (the candidate page's `runningFor` destructuring) and `verify-ballot-order.ts` (the v2 cache keys).

## Cross-PR notes (for the PR description; checked with `gh pr diff` on 2026-10-08)

Open PRs that touch this PR's files, or that the new guards will read once both are on `main`:

1. **#140 (Agents PR D, R2 logistics)** adds `src/lib/logistics-check.ts`, whose report string `"running mates: not compared; candidate.running_mate does not exist yet (roster-completeness 0049)"` names the column outside a comment. `verify-running-mate.ts` (Task 2) fails on that file once both PRs are on `main`, because "nothing else in `src/` reads `running_mate`" (§6) is checked on code with comments stripped. It is a report line, not a read: whichever PR merges second rewords it so it does not name the column (for example "the running-mate column does not exist yet (0049)"); do not widen the scan. The same file re-implements D6 for its comparison; once this PR is on `main` it can import `normalizeDoeText` from `src/lib/running-mate.ts` (its own PR's call).
2. **#131 (0046, Uthmeier)** edits one comment in `src/lib/incumbency.ts`, which Task 3 rewrites whole. On a rebase after #131, keep this PR's file: 0049 records Uthmeier's source and date like every other row, and the new comment no longer counts incumbents.
3. **#137 (freeze guard)** adds a required `raceId` prop to `ListedCandidateCard` in `RaceListing.tsx` and `CandidateListing.tsx`; this PR adds `incumbency` and `runningMates` to the same prop lists (adjacent lines; whichever merges second rebases).
4. **#143 (Agents PR C, R4)** edits `scripts/verify-ballot-order.ts` near line 606 (the `orderCandidates` callers); Task 4 edits lines 660-669. Different hunks; no conflict expected.

## Ground truth at planning time (2026-10-08)

- Read-only `SELECT` on production: 53 races, all `election = 'general'` (36 published, 17 listed), the same 53 ids as `scripts/fixtures/roster/ballot-roster-2026-10-08.json`. None of the five 0049 columns exists live yet (`information_schema.columns` → 0 rows), so until 0049 is applied every page shows no running-mate line.
- The code below has been run. On 2026-10-08 every Create, Find/Replace, delete and append in Tasks 1-5 was applied mechanically, task by task, to a scratch copy of this branch (`git archive HEAD` into a `mktemp -d /private/tmp/kyv-XXXXXX` folder; nothing in this worktree was touched): every Find block matched exactly once; each task's verify script printed the `ok` counts given in its last step, and the other scripts each step lists exited 0; the project `tsc`, the strict script `tsc` over all twelve touched or importing scripts, and `eslint` over the 26 changed `.ts`/`.tsx` files printed nothing. `verify-all` in that copy (no `.env.local`, so all three live scripts skip) went from `69 passed (1 offline only), 0 failed, 3 skipped (needs env), 72 total` before Task 1 to `71 passed (1 offline only), 0 failed, 3 skipped (needs env), 74 total` after Task 5; in this worktree, where `.env.local` is linked, the same run reads `69 passed (1 offline only), 1 failed, 2 skipped (needs env), 72 total` before and `71 passed (1 offline only), 1 failed, 2 skipped (needs env), 74 total` after (the failure is the known live-data `verify-news-neutrality.ts`). `next build` (anon reads of production) was clean, and the prerendered race pages gave exactly the counts in Task 6 Step 2.
- A read-only `SELECT race_id, election FROM race` on 2026-10-08 returned 53 rows, all `general`, exactly the 53 keys of the label fixture in Task 3 Step 2.
- Where the old behaviour lives: the chip at `CandidateBrief.tsx:65`, `RaceListing.tsx:68`, `RaceCompare.tsx:107`; "Official site" at `CandidateBrief.tsx:72-82`, `RaceListing.tsx:75-85`, `RaceCompare.tsx:121-131`, `CandidateBrowser.tsx:222-236`, `SavedCandidates.tsx:87-97`; cache keys at `briefs.ts:260` and `:311`, `listing.ts:151` and `:214`; `verify-ballot-order.ts:660-669` pins the v2 keys; `verify-office-title.ts:105-111` pins the candidate page's lines.
- `normalizeDoeText` is at `scripts/roster-reads-lib.ts:26-38` (PR 1), imported by `roster-reads-lib.ts` itself, `roster-worksheet.ts:25` and `verify-roster-worksheet.ts:22`.

## File map

| File | Change | Responsibility |
|---|---|---|
| `scripts/source-checks.ts` | create (Task 1) | Shared by the three source-scan verify scripts: `ROOT`, `read`, `stripComments`, `sourceFiles`, `edit`, `importVariant`, `checker` |
| `src/lib/campaign-website.ts` | create (Task 1) | Pure `campaignSite(url)`: `{ href, host }` or null |
| `src/components/features/CampaignWebsite.tsx` | create (Task 1) | The slot: "Campaign website: " + host link, or "none listed" |
| `scripts/verify-campaign-website.ts` | create (Task 1) | Helper, component, five surfaces, "Official site" scan, mutations |
| `src/components/features/CandidateBrief.tsx` | modify (Tasks 1-3) | Slot; running-mate line; incumbency line replaces the chip |
| `src/components/features/RaceListing.tsx` | modify (Tasks 1-3) | Same, on `ListedCandidateCard`; `RaceListing` passes the race values |
| `src/components/features/RaceCompare.tsx` | modify (Tasks 1-3) | Same, on the roster cards |
| `src/components/features/CandidateBrowser.tsx` | modify (Task 1) | Slot only |
| `src/components/features/SavedCandidates.tsx` | modify (Task 1) | Slot only |
| `src/types/schema.ts` | modify (Tasks 2-3) | `Candidate` gains the five 0049 fields |
| `src/lib/running-mate.ts` | create (Task 2) | `normalizeDoeText`, `runningMatesFor`, `runningMateLine`, `RunningMates` |
| `scripts/roster-reads-lib.ts` | modify (Task 2) | Re-exports `normalizeDoeText` instead of defining it |
| `src/components/features/RosterLines.tsx` | create (Task 2), extend (Task 3) | `RunningMateLine`, then `IncumbencyLine` |
| `src/components/features/CandidateListing.tsx` | modify (Tasks 2-3) | Passes the race values to its `ListedCandidateCard` |
| `src/app/(public)/races/[raceId]/page.tsx` | modify (Tasks 2-3) | Computes the race values for `RaceCompare` and `RaceListing` |
| `src/app/(public)/candidates/[candidateId]/page.tsx` | modify (Tasks 2-3) | `runningFor()` also returns the race values |
| `scripts/verify-running-mate.ts` | create (Task 2) | D6, all-or-none, component, cards, callers, readers, mutations |
| `scripts/verify-office-title.ts` | modify (Task 2) | Accepts the wider `runningFor` destructuring |
| `src/lib/incumbency.ts` | rewrite (Task 3) | Flag, TO FLIP gate, label table, `incumbencyFor`, `incumbencyLine` |
| `scripts/fixtures/roster/race-labels-2026-10-08.json` | create (Task 3) | 53 race ids → expected label, typed by hand |
| `scripts/verify-incumbent-chip.ts` | rewrite (Task 3) | Flag pin, labels, behaviour with the flag on and off, component, cards, callers, readers, mutations |
| `src/lib/briefs.ts`, `src/lib/listing.ts` | modify (Task 4) | Cache keys |
| `scripts/verify-ballot-order.ts` | modify (Task 4) | Pins the new keys |
| `src/lib/candidate-leads.ts` | modify (Task 5) | Pure `namesToCheck` |
| `scripts/candidate-leads.ts` | modify (Task 5) | `check` reads the stored running mates |
| `scripts/verify-candidate-leads.ts` | modify (Task 5) | The running-mate cases |

The edits below are find-and-replace: each "Find" block occurs exactly once in the file at that point of the plan. Apply them in order.

---

### Task 1: The campaign-website slot on all five surfaces (D7)

**Files:**
- Create: `scripts/source-checks.ts`, `src/lib/campaign-website.ts`, `src/components/features/CampaignWebsite.tsx`, `scripts/verify-campaign-website.ts`
- Modify: `src/components/features/CandidateBrief.tsx` (imports, comment lines 26-32, lines 72-82), `src/components/features/RaceListing.tsx` (imports, comment lines 30-32, line 49, lines 75-85), `src/components/features/RaceCompare.tsx` (imports, comment lines 21-22, lines 121-131), `src/components/features/CandidateBrowser.tsx` (imports, lines 203-236), `src/components/features/SavedCandidates.tsx` (imports, comment lines 61-62, lines 87-97)

**Interfaces:**
- Produces: `campaignSite(url: string | null | undefined): CampaignSite | null` with `interface CampaignSite { href: string; host: string }` (`src/lib/campaign-website.ts`); `CampaignWebsite({ url, name }: { url: string | null | undefined; name: string })`; from `scripts/source-checks.ts`: `ROOT: string`, `read(file: string): string`, `stripComments(src: string): string`, `sourceFiles(...dirs: string[]): string[]`, `edit(text: string, from: string | RegExp, to: string): string`, `importVariant<T>(file: string, edits: ReadonlyArray<readonly [string | RegExp, string]>): Promise<T>`, `checker(label: string): { check(name: string, ok: boolean, detail?: string): void; mutation(name: string, run: () => string[] | Promise<string[]>): Promise<void>; done(): void }`.
- Consumes: `safeHttpUrl(url: string | null | undefined): string | null` from `src/lib/format.ts:15`.

- [ ] **Step 1: Record the baseline**

Run:
```bash
"$NODE" scripts/verify-all.mjs 2>&1 | tail -1
git status --short
```
Expected: `verify-all: 69 passed (1 offline only), 1 failed, 2 skipped (needs env), 72 total` (the failure is `verify-news-neutrality.ts`, live data) and a clean tree.

- [ ] **Step 2: Write the shared check helpers**

Create `scripts/source-checks.ts`:

```ts
/* Shared by the source-scan verify scripts (verify-incumbent-chip.ts,
   verify-running-mate.ts, verify-campaign-website.ts): read and scan src/,
   strip comments, and build mutated copies so each guard is shown to catch
   the change it exists for (spec
   docs/superpowers/specs/2026-10-08-roster-completeness-design.md §6,
   "mutation-checked"). Its name does not start with verify-, so verify-all
   does not run it on its own. */

import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const ROOT = resolve(import.meta.dirname, "..");

/** A repo file's text, by its path from the repo root. */
export const read = (file: string): string => readFileSync(join(ROOT, file), "utf8");

/* Block comments (JSX ones included, since {/* … *\/} is a block comment
   inside braces), then line comments that start a line or follow
   whitespace, so the "//" inside a URL string survives. */
export const stripComments = (src: string): string =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/[^\n]*/g, "$1");

/** Every .ts, .tsx, .js, .jsx and .mjs file under the given folders, as
    paths from the repo root. */
export function sourceFiles(...dirs: string[]): string[] {
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) return walk(path);
      return /\.(ts|tsx|js|jsx|mjs)$/.test(name) ? [relative(ROOT, path)] : [];
    });
  return dirs.flatMap((dir) => walk(join(ROOT, dir)));
}

/** `text` with `from` replaced by `to`. Throws unless `from` occurs exactly
    once, so a mutant can never quietly be the original. */
export function edit(text: string, from: string | RegExp, to: string): string {
  const pattern =
    typeof from === "string"
      ? new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")
      : new RegExp(from.source, from.flags.includes("g") ? from.flags : `${from.flags}g`);
  const count = (text.match(pattern) ?? []).length;
  if (count !== 1) throw new Error(`edit: ${String(from)} occurs ${count} times, want 1`);
  return text.replace(pattern, () => to);
}

let scratch: string | null = null;
let made = 0;

/** Import a copy of a src/ module with `edits` applied. Its relative imports
    are pointed back at the real files, so only this one module differs. The
    copies live in a temp folder that is removed when the process exits. */
export async function importVariant<T>(
  file: string,
  edits: ReadonlyArray<readonly [string | RegExp, string]>,
): Promise<T> {
  let text = read(file);
  for (const [from, to] of edits) text = edit(text, from, to);
  const dir = dirname(join(ROOT, file));
  text = text.replace(
    /(from\s+["'])(\.{1,2}\/[^"']+)(["'])/g,
    (_all, open: string, spec: string, close: string) => `${open}${pathToFileURL(resolve(dir, spec)).href}${close}`,
  );
  if (!scratch) {
    const folder = mkdtempSync(join(tmpdir(), "kyv-variant-"));
    scratch = folder;
    process.on("exit", () => rmSync(folder, { recursive: true, force: true }));
  }
  const out = join(scratch, `${made++}-${file.replace(/[^\w.-]+/g, "_")}`);
  writeFileSync(out, text);
  return (await import(pathToFileURL(out).href)) as T;
}

/** check() prints one line per check; mutation() builds a mutant and passes
    only when the checks it runs report a problem; done() exits 1 on any
    failure. */
export function checker(label: string) {
  let failures = 0;
  const check = (name: string, ok: boolean, detail = "") => {
    if (ok) console.log(`  ok  ${name}`);
    else {
      failures++;
      console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
    }
  };
  const mutation = async (name: string, run: () => string[] | Promise<string[]>) => {
    try {
      const problems = await run();
      check(`mutation caught: ${name}`, problems.length > 0, "the checks did not notice this change");
    } catch (err) {
      check(`mutation caught: ${name}`, false, `could not build the mutant: ${String(err)}`);
    }
  };
  const done = () => {
    if (failures) {
      console.error(`\n${failures} ${label} check(s) failed`);
      process.exit(1);
    }
    console.log(`\nAll ${label} checks passed.`);
  };
  return { check, mutation, done };
}
```

- [ ] **Step 3: Write the failing test**

Create `scripts/verify-campaign-website.ts`:

```ts
/* The campaign-website slot (spec
   docs/superpowers/specs/2026-10-08-roster-completeness-design.md §3.7 and
   §6; D7, Recommended pending founder confirmation).

   Every candidate card, on all five surfaces, carries one slot that reads
   "Campaign website: <host>" or "Campaign website: none listed". Before it,
   an "Official site" link appeared only where a site was stored, which is a
   label some candidates got and others did not. This checks:

   1. The helper, campaignSite: the host drops "www."; a value safeHttpUrl
      refuses gives null, which the slot prints as "none listed".
   2. The component prints the label once, then the host link (with the
      candidate's name hidden after it) or "none listed".
   3. Each of the five surfaces renders <CampaignWebsite> exactly once, never
      behind a condition, from the row's official_site, and prints no site
      link of its own.
   4. "Official site" appears nowhere under src/components or src/app,
      comments included.
   5. Each guard above catches the change it exists for (mutations).

   Run: node scripts/verify-campaign-website.ts */

import { campaignSite } from "../src/lib/campaign-website.ts";
import { checker, edit, importVariant, read, sourceFiles, stripComments } from "./source-checks.ts";

const { check, mutation, done } = checker("campaign-website");

/* 1. The helper. */
type SiteModule = typeof import("../src/lib/campaign-website.ts");

function helperProblems(site: SiteModule["campaignSite"]): string[] {
  const problems: string[] = [];
  const cases: Array<[string | null, string | null]> = [
    ["https://www.cynthiaforbrowardschools.com/about", "cynthiaforbrowardschools.com"],
    ["http://WWW.Example.org", "example.org"],
    ["https://wwwexample.com/", "wwwexample.com"],
    ["https://shop.www.example.com/", "shop.www.example.com"],
    ["https://example.com", "example.com"],
    [null, null],
    ["", null],
    ["javascript:alert(1)", null],
    ["data:text/html,hi", null],
    ["mailto:team@example.com", null],
    ["ftp://example.com/", null],
    ["not a url", null],
  ];
  for (const [url, want] of cases) {
    let got: string | null;
    try {
      got = site(url)?.host ?? null;
    } catch (err) {
      problems.push(`campaignSite(${JSON.stringify(url)}) throws: ${String(err)}`);
      continue;
    }
    if (got !== want) {
      problems.push(`campaignSite(${JSON.stringify(url)}) host is ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
    }
  }
  if (site("https://www.example.com/a?b=1")?.href !== "https://www.example.com/a?b=1") {
    problems.push("the link's href must be the stored URL, unchanged");
  }
  return problems;
}

const helper = helperProblems(campaignSite);
check('campaignSite: the host without "www.", null for anything safeHttpUrl refuses', helper.length === 0, helper.join("; "));

/* 2. The component. */
const COMPONENT = "src/components/features/CampaignWebsite.tsx";

function componentProblems(code: string): string[] {
  const c = stripComments(code);
  const problems: string[] = [];
  if ((c.match(/\{"Campaign website: "\}/g) ?? []).length !== 1) {
    problems.push('the label {"Campaign website: "} must appear exactly once');
  }
  if ((c.match(/"none listed"/g) ?? []).length !== 1) problems.push('"none listed" must appear exactly once');
  if (!/const site = campaignSite\(url\);/.test(c)) problems.push("the link must come from campaignSite(url)");
  if (!/\{site \? \(/.test(c) || !/\) : \(\s*"none listed"\s*\)\}/.test(c)) {
    problems.push('the slot must print the link when there is a site and "none listed" otherwise');
  }
  if (!/<span className="sr-only">: \{name\}<\/span>/.test(c)) {
    problems.push("the link must keep the candidate's name as a visually hidden suffix");
  }
  if (/official_site/.test(c)) problems.push("the component takes the URL as a prop and reads no row");
  return problems;
}

const component = componentProblems(read(COMPONENT));
check(`${COMPONENT} prints "Campaign website: " then the host link or "none listed"`, component.length === 0, component.join("; "));

/* 3. The five surfaces. `row` is the name each card gives the candidate. */
const SURFACES = [
  { file: "src/components/features/CandidateBrief.tsx", row: "candidate" },
  { file: "src/components/features/RaceListing.tsx", row: "candidate" },
  { file: "src/components/features/RaceCompare.tsx", row: "candidate" },
  { file: "src/components/features/CandidateBrowser.tsx", row: "c" },
  { file: "src/components/features/SavedCandidates.tsx", row: "c" },
] as const;

/** The slot exactly as every card writes it, on one line. */
const slot = (row: string) => `<CampaignWebsite url={${row}.official_site} name={${row}.legal_name} />`;

function surfaceProblems(code: string, row: string): string[] {
  const c = stripComments(code);
  const problems: string[] = [];
  const exact = c.split(slot(row)).length - 1;
  const all = (c.match(/<CampaignWebsite\b/g) ?? []).length;
  if (exact !== 1 || all !== 1) {
    problems.push(`renders ${slot(row)} ${exact} time(s), <CampaignWebsite> ${all} time(s) in all; want exactly once`);
  }
  if (/(&&|\?|:)\s*\(?\s*<CampaignWebsite\b/.test(c)) problems.push("<CampaignWebsite> sits behind a condition; every card gets the slot");
  if (!/import\s*\{\s*CampaignWebsite\s*\}\s*from\s*["']@\/components\/features\/CampaignWebsite["']/.test(c)) {
    problems.push("must import CampaignWebsite from @/components/features/CampaignWebsite");
  }
  const rest = c.split(slot(row)).join("").replace(/official_site:\s*string\s*\|\s*null;/g, "");
  if (/official_site/.test(rest)) problems.push("reads official_site outside the slot (a second site link?)");
  return problems;
}

for (const { file, row } of SURFACES) {
  const problems = surfaceProblems(read(file), row);
  check(`${file} renders the slot once, unconditionally, from ${row}.official_site`, problems.length === 0, problems.join("; "));
}

/* 4. The old label is gone, comments included. */
const OLD_LABEL = /Official\s+site/;
function oldLabelOffenders(files: ReadonlyMap<string, string>): string[] {
  return [...files].filter(([, text]) => OLD_LABEL.test(text)).map(([file]) => file);
}
const ui = new Map(sourceFiles("src/components", "src/app").map((f) => [f, read(f)] as const));
const offenders = oldLabelOffenders(ui);
check(`"Official site" appears nowhere under src/components or src/app (${ui.size} files)`, offenders.length === 0, offenders.join(", "));

/* 5. Mutations. */
await mutation('the host keeps "www."', async () => {
  const m = await importVariant<SiteModule>("src/lib/campaign-website.ts", [['.replace(/^www\\./i, "")', ""]]);
  return helperProblems(m.campaignSite);
});
await mutation("a javascript: URL becomes a link (safeHttpUrl skipped)", async () => {
  const m = await importVariant<SiteModule>("src/lib/campaign-website.ts", [
    ["const href = safeHttpUrl(url);", "const href = url ? url : null;"],
  ]);
  return helperProblems(m.campaignSite);
});
await mutation('the component prints nothing instead of "none listed"', () =>
  componentProblems(edit(read(COMPONENT), /\) : \(\s*"none listed"\s*\)\}/, ") : null}")),
);
await mutation("the link loses the candidate's hidden name", () =>
  componentProblems(edit(read(COMPONENT), '<span className="sr-only">: {name}</span>', "")),
);
const brief = SURFACES[0];
await mutation("a card shows the slot only where a site is stored", () =>
  surfaceProblems(
    edit(read(brief.file), slot(brief.row), `{${brief.row}.official_site && ${slot(brief.row)}}`),
    brief.row,
  ),
);
await mutation("a card drops the slot", () => surfaceProblems(edit(read(brief.file), slot(brief.row), ""), brief.row));
await mutation("a card renders the slot twice", () =>
  surfaceProblems(edit(read(brief.file), slot(brief.row), `${slot(brief.row)}${slot(brief.row)}`), brief.row),
);
const saved = SURFACES[4];
await mutation("a card adds its own site link beside the slot", () =>
  surfaceProblems(
    edit(read(saved.file), slot(saved.row), `${slot(saved.row)}<a href={c.official_site ?? undefined}>site</a>`),
    saved.row,
  ),
);
await mutation('"Official site" comes back on one surface', () => {
  const copy = new Map(ui);
  copy.set(saved.file, `${read(saved.file)}\n// Official site\n`);
  return oldLabelOffenders(copy);
});

done();
```

- [ ] **Step 4: Run it to see it fail**

Run: `"$NODE" scripts/verify-campaign-website.ts`
Expected: a crash, `ERR_MODULE_NOT_FOUND` for `src/lib/campaign-website.ts`.

- [ ] **Step 5: Write the helper and the component**

Create `src/lib/campaign-website.ts`:

```ts
/* The campaign-website slot on every candidate card (spec
   docs/superpowers/specs/2026-10-08-roster-completeness-design.md §3.7, D7,
   Recommended pending founder confirmation). Pure, with a relative import
   and its extension, so scripts/verify-campaign-website.ts runs it under
   plain node.

   CampaignWebsite (src/components/features/CampaignWebsite.tsx) prints
   "Campaign website: " and then either this link, whose text is the host,
   or "none listed". Null here means "none listed": no stored site, or a
   stored value that is not a plain http(s) URL (safeHttpUrl). */

import { safeHttpUrl } from "./format.ts";

export interface CampaignSite {
  /** The stored URL, unchanged. */
  href: string;
  /** Its host without a leading "www.": cynthiaforbrowardschools.com. */
  host: string;
}

export function campaignSite(url: string | null | undefined): CampaignSite | null {
  const href = safeHttpUrl(url);
  if (!href) return null;
  const host = new URL(href).hostname.replace(/^www\./i, "");
  return host ? { href, host } : null;
}
```

Create `src/components/features/CampaignWebsite.tsx`:

```tsx
import { campaignSite } from "@/lib/campaign-website";

/* One website slot on every candidate card, on all five surfaces
   (CandidateBrief, ListedCandidateCard, the RaceCompare roster card,
   CandidateBrowser and SavedCandidates): "Campaign website: <host>" or
   "Campaign website: none listed" (spec 2026-10-08-roster-completeness
   §3.7, D7, Recommended pending founder confirmation). The label is the same
   on every card; only the value differs, as the name does. It replaces a
   link that appeared only where a site was stored, so in FL-GOV seven cards
   carried it and one did not.

   "Campaign website" is true of every stored value: the collection stored
   campaign sites only (docs/general-election/candidate-sites-2026-09-24.md).
   "None listed" describes our list, not the candidate.

   TO FLIP (D7): a link only in races where every candidate has a stored
   site. The race page would decide that once per race and pass it in, and
   this component would print nothing on every card of a race that fails it.

   Accessibility (a11y-perf-2026-10-04.md): the link keeps the candidate's
   name as a visually hidden suffix after its visible text (fix 6) and a
   24 px minimum height (fix 9; min-h-[24px] because this theme's spacing-6
   is 32 px). The label is one string that ends in its space, so the space is
   never a whitespace-only text node of its own (CandidateBrowser explains
   why those go missing from accessible text). */
export function CampaignWebsite({
  url,
  name,
}: {
  url: string | null | undefined;
  name: string;
}) {
  const site = campaignSite(url);
  return (
    <span>
      {"Campaign website: "}
      {site ? (
        <a
          href={site.href}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-[24px] items-center underline underline-offset-2 hover:text-on-surface"
        >
          {site.host}
          <span className="sr-only">: {name}</span>
        </a>
      ) : (
        "none listed"
      )}
    </span>
  );
}
```

- [ ] **Step 6: Run it to see the surfaces fail**

Run: `"$NODE" scripts/verify-campaign-website.ts`
Expected: the helper and component checks print `ok`; five `FAIL ... renders the slot once` lines, `FAIL "Official site" appears nowhere ...`, and four `FAIL mutation caught: ... could not build the mutant` lines (the cards do not have the slot yet); exit 1.

- [ ] **Step 7: Put the slot on `CandidateBrief`**

In `src/components/features/CandidateBrief.tsx`:

Find:
```tsx
import { SaveToggle } from "@/components/ui/SaveToggle";
import { IssueSection } from "@/components/features/IssueSection";
```
Replace with:
```tsx
import { SaveToggle } from "@/components/ui/SaveToggle";
import { CampaignWebsite } from "@/components/features/CampaignWebsite";
import { IssueSection } from "@/components/features/IssueSection";
```

Find:
```tsx
   - "Keep in mind", "Official site" and "Flag this brief as biased" repeat
     once per candidate, so each carries the candidate's name as a visually
     hidden suffix after its visible label (fix 6; WCAG 2.4.4 and 2.4.6, with
     the label still first for 2.5.3 Label in Name).
   - The official-site and social links are 18 px of caption text in a row
     with a 4 px gap, so each gets a 24 px minimum height (fix 9; WCAG 2.5.8
     Target Size). min-h-[24px], not min-h-6: this theme's spacing-6 is 32 px. */
```
Replace with:
```tsx
   - "Keep in mind", the campaign-website link and "Flag this brief as
     biased" repeat once per candidate, so each carries the candidate's name
     as a visually hidden suffix after its visible label (fix 6; WCAG 2.4.4
     and 2.4.6, with the label still first for 2.5.3 Label in Name).
   - The campaign-website and social links are 18 px of caption text in a
     row with a 4 px gap, so each gets a 24 px minimum height (fix 9; WCAG
     2.5.8 Target Size). min-h-[24px], not min-h-6: this theme's spacing-6 is
     32 px. The website slot is CampaignWebsite, the same on every card. */
```

Find:
```tsx
          {candidate.official_site && (
            <a
              href={candidate.official_site}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-[24px] items-center underline underline-offset-2 hover:text-on-surface"
            >
              Official site
              <span className="sr-only">: {candidate.legal_name}</span>
            </a>
          )}
```
Replace with (one line; the verify script matches it exactly):
```tsx
          <CampaignWebsite url={candidate.official_site} name={candidate.legal_name} />
```

- [ ] **Step 8: Put the slot on `ListedCandidateCard`**

In `src/components/features/RaceListing.tsx`:

Find:
```tsx
import { SaveToggle } from "@/components/ui/SaveToggle";
import { safeHttpUrl } from "@/lib/format";
```
Replace with:
```tsx
import { SaveToggle } from "@/components/ui/SaveToggle";
import { CampaignWebsite } from "@/components/features/CampaignWebsite";
import { safeHttpUrl } from "@/lib/format";
```
(`safeHttpUrl` stays: the social links still use it.)

Find:
```tsx
   a11y-perf-2026-10-04.md: the candidate's name as a visually hidden suffix
   on "Keep in mind" and "Official site" (fix 6; WCAG 2.4.4, 2.4.6, label
   first for 2.5.3), and a 24 px minimum height on the site and social links
```
Replace with:
```tsx
   a11y-perf-2026-10-04.md: the candidate's name as a visually hidden suffix
   on "Keep in mind" and the campaign-website link (fix 6; WCAG 2.4.4,
   2.4.6, label first for 2.5.3), and a 24 px minimum height on the site
   and social links
```

Find:
```tsx
  const Heading = headingLevel;
  const officialSite = safeHttpUrl(candidate.official_site);
```
Replace with:
```tsx
  const Heading = headingLevel;
```

Find:
```tsx
          {officialSite && (
            <a
              href={officialSite}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-[24px] items-center underline underline-offset-2 hover:text-on-surface"
            >
              Official site
              <span className="sr-only">: {candidate.legal_name}</span>
            </a>
          )}
```
Replace with:
```tsx
          <CampaignWebsite url={candidate.official_site} name={candidate.legal_name} />
```

- [ ] **Step 9: Put the slot on the `RaceCompare` roster card**

In `src/components/features/RaceCompare.tsx`:

Find:
```tsx
import { SaveToggle } from "@/components/ui/SaveToggle";
import { PolicyAreaChip, policyAreaHref } from "@/components/ui/PolicyAreaChip";
```
Replace with:
```tsx
import { SaveToggle } from "@/components/ui/SaveToggle";
import { CampaignWebsite } from "@/components/features/CampaignWebsite";
import { PolicyAreaChip, policyAreaHref } from "@/components/ui/PolicyAreaChip";
```

Find:
```tsx
   1. Who's running: one short card per candidate (name, party, Keep in mind,
      official site, full profile). Socials live on the profile page.
```
Replace with:
```tsx
   1. Who's running: one short card per candidate (name, party, Keep in mind,
      campaign website, full profile). Socials live on the profile page.
```

Find:
```tsx
                {candidate.official_site && (
                  <a
                    href={candidate.official_site}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-[24px] items-center underline underline-offset-2 hover:text-on-surface"
                  >
                    Official site
                    <span className="sr-only">: {candidate.legal_name}</span>
                  </a>
                )}
```
Replace with:
```tsx
                <CampaignWebsite url={candidate.official_site} name={candidate.legal_name} />
```

- [ ] **Step 10: Put the slot on `CandidateBrowser`**

In `src/components/features/CandidateBrowser.tsx`:

Find:
```tsx
import { SaveToggle } from "@/components/ui/SaveToggle";
import { browseCandidates, type DecidedSeat } from "@/lib/directory";
import { safeHttpUrl } from "@/lib/format";
```
Replace with (`safeHttpUrl` had no other use in this file):
```tsx
import { SaveToggle } from "@/components/ui/SaveToggle";
import { CampaignWebsite } from "@/components/features/CampaignWebsite";
import { browseCandidates, type DecidedSeat } from "@/lib/directory";
```

Find:
```tsx
                    {/* "Read their brief" / "About this candidate", "Official
                        site" and "Keep in mind" repeat on every card, so each
                        carries the candidate's name as a visually hidden
                        suffix after its visible label (a11y-perf-2026-10-04.md
                        fix 6; WCAG 2.4.4, 2.4.6, label first for 2.5.3).
                        Fix 9's 24 px minimum height is not applied here: the
                        audit found no target-size failure on /candidates,
                        where these two links sit side by side, not in a
                        wrapping row of short social handles. */}
```
Replace with:
```tsx
                    {/* "Read their brief" / "About this candidate", the
                        campaign-website link and "Keep in mind" repeat on
                        every card, so each carries the candidate's name as a
                        visually hidden suffix after its visible label
                        (a11y-perf-2026-10-04.md fix 6; WCAG 2.4.4, 2.4.6,
                        label first for 2.5.3). Fix 9's 24 px minimum height
                        is not added to the brief link: the audit found no
                        target-size failure on /candidates. The website link
                        has it anyway, because CampaignWebsite is the same
                        slot on every card. */}
```

Find:
```tsx
                      {/* The campaign's own site — always selected, never
                          shown until now. Routed through safeHttpUrl like
                          every other stored URL, so a bad row renders no link
                          rather than a javascript: one. */}
                      {safeHttpUrl(c.official_site) && (
                        <a
                          href={safeHttpUrl(c.official_site) ?? undefined}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary underline underline-offset-2"
                        >
                          Official site
                          <span className="sr-only">: {c.legal_name}</span>
                        </a>
                      )}
```
Replace with:
```tsx
                      {/* The same slot as every other card
                          (CampaignWebsite): the host as a link, or "none
                          listed". The URL goes through safeHttpUrl there, so
                          a bad row reads "none listed" rather than linking. */}
                      <CampaignWebsite url={c.official_site} name={c.legal_name} />
```

- [ ] **Step 11: Put the slot on `SavedCandidates`**

In `src/components/features/SavedCandidates.tsx` (a client component; `CampaignWebsite` has no hooks and no server-only imports, so it renders there too):

Find:
```tsx
import { SaveToggle } from "@/components/ui/SaveToggle";
import { onSavedChange, readSaved } from "@/lib/saved";
```
Replace with:
```tsx
import { SaveToggle } from "@/components/ui/SaveToggle";
import { CampaignWebsite } from "@/components/features/CampaignWebsite";
import { onSavedChange, readSaved } from "@/lib/saved";
```

Find:
```tsx
  /* Every card repeats "Keep in mind" and "Official site", so both carry the
     candidate's name as a visually hidden suffix after the visible label
```
Replace with:
```tsx
  /* Every card repeats "Keep in mind" and the campaign-website link, so both
     carry the candidate's name as a visually hidden suffix after the visible
     label
```

Find:
```tsx
              {c.official_site && (
                <a
                  href={c.official_site}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-[24px] items-center underline underline-offset-2 hover:text-on-surface"
                >
                  Official site
                  <span className="sr-only">: {c.legal_name}</span>
                </a>
              )}
```
Replace with:
```tsx
              <CampaignWebsite url={c.official_site} name={c.legal_name} />
```

- [ ] **Step 12: Run the tests to see them pass**

Run:
```bash
"$NODE" scripts/verify-campaign-website.ts 2>&1 | tail -3
"$NODE" scripts/verify-incumbent-chip.ts 2>&1 | tail -1
"$NODE" node_modules/typescript/bin/tsc --noEmit
"$NODE" node_modules/typescript/bin/tsc --noEmit --strict --erasableSyntaxOnly --target es2022 --module esnext --moduleResolution bundler --allowImportingTsExtensions --skipLibCheck --types node scripts/source-checks.ts scripts/verify-campaign-website.ts
"$NODE" node_modules/eslint/bin/eslint.js scripts/source-checks.ts scripts/verify-campaign-website.ts src/lib/campaign-website.ts src/components/features/CampaignWebsite.tsx src/components/features/CandidateBrief.tsx src/components/features/RaceListing.tsx src/components/features/RaceCompare.tsx src/components/features/CandidateBrowser.tsx src/components/features/SavedCandidates.tsx
```
Expected: `All campaign-website checks passed.` (17 `ok` lines, 9 of them mutations); `All incumbent-chip checks passed.` (the old script, still unchanged); both `tsc` runs and `eslint` print nothing. Node may print a `MODULE_TYPELESS_PACKAGE_JSON` warning on stderr; every script here does, and it is not a failure.

- [ ] **Step 13: Commit**

```bash
git add scripts/source-checks.ts scripts/verify-campaign-website.ts src/lib/campaign-website.ts src/components/features/CampaignWebsite.tsx src/components/features/CandidateBrief.tsx src/components/features/RaceListing.tsx src/components/features/RaceCompare.tsx src/components/features/CandidateBrowser.tsx src/components/features/SavedCandidates.tsx
git commit -F - <<'EOF'
Campaign website slot on every card of all five surfaces (D7)

"Campaign website: <host>" or "Campaign website: none listed" replaces the
"Official site" link, which appeared only where a site was stored (spec
2026-10-08-roster-completeness §3.7, D7, recommended pending founder
confirmation). One component, CampaignWebsite, on CandidateBrief,
ListedCandidateCard, the RaceCompare roster card, CandidateBrowser and
SavedCandidates; the URL goes through safeHttpUrl, and a value it refuses
reads "none listed". verify-campaign-website.ts checks the helper, the
component, each surface and the old label's absence, and proves each check
with a mutation (scripts/source-checks.ts).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 2: The running-mate line on every Governor card, or none (D5, D6)

**Files:**
- Create: `src/lib/running-mate.ts`, `src/components/features/RosterLines.tsx`, `scripts/verify-running-mate.ts`
- Modify: `scripts/roster-reads-lib.ts:11-38`, `src/types/schema.ts:87-89` (end of `Candidate`), `src/components/features/CandidateBrief.tsx`, `src/components/features/RaceListing.tsx`, `src/components/features/RaceCompare.tsx`, `src/components/features/CandidateListing.tsx`, `src/app/(public)/races/[raceId]/page.tsx`, `src/app/(public)/candidates/[candidateId]/page.tsx`, `scripts/verify-office-title.ts:105-111`

**Interfaces:**
- Consumes: `decodeEntities(text: string): string` from `src/lib/candidate-site.ts:163`; Task 1's `scripts/source-checks.ts`.
- Produces: `normalizeDoeText(raw: string): string`; `type RunningMates = Readonly<Record<string, string>>`; `interface RunningMateRow { candidate_id: string; running_mate?: string | null }`; `runningMatesFor(candidates: readonly RunningMateRow[]): RunningMates | null`; `runningMateLine(runningMates: RunningMates | null, candidateId: string): string | null` (all in `src/lib/running-mate.ts`); `RunningMateLine({ runningMates, candidateId })` in `RosterLines.tsx`; a required `runningMates: RunningMates | null` prop on `CandidateBrief`, `ListedCandidateCard`, `RaceListing`, `RaceCompare` and `CandidateListing`; `runningFor()` on the candidate page returns `runningMates` too; `Candidate` gains `running_mate`, `running_mate_source`, `running_mate_verified_at` (all `string | null`).

- [ ] **Step 1: Write the failing test**

Create `scripts/verify-running-mate.ts`:

```ts
/* The running-mate line (spec
   docs/superpowers/specs/2026-10-08-roster-completeness-design.md §3.6 and
   §6; D5 and D6, Recommended pending founder confirmation).

   Florida's governor and lieutenant governor run as one ticket, and every
   Governor card shows "Running mate for Lieutenant Governor: <name>", or
   none does. This checks:

   1. D6, normalizeDoeText: the raw "Running Mate" fields of canDetail 89042
      and 90630 read "Bryan Avila" and "Ruben A. Coto"; nothing but entities
      and whitespace changes; an unknown entity throws. The read tool's copy
      (scripts/roster-reads-lib.ts) is this same function.
   2. All or none, runningMatesFor: eight named gives eight lines; one
      missing, blank or absent (a row cached before 0049) gives none; a race
      whose rows hold no running mate (every race but Governor) gives none.
   3. RunningMateLine prints runningMateLine's text in one fixed element.
   4. The three cards (CandidateBrief, ListedCandidateCard in RaceListing,
      the RaceCompare roster card) each render <RunningMateLine> once, never
      behind a condition, from the race-level value; only the two pages call
      runningMatesFor.
   5. Nothing else in src/ reads running_mate or its source columns, or
      prints the line's words. The candidate-lead kind "running_mate" (R5)
      is a different thing: in the three files that define and show that
      kind, quoted strings are skipped, and a property read is still caught.
   6. Each guard above catches the change it exists for (mutations).

   Run: node scripts/verify-running-mate.ts */

import {
  normalizeDoeText,
  runningMateLine,
  runningMatesFor,
  type RunningMateRow,
} from "../src/lib/running-mate.ts";
import { normalizeDoeText as readToolCopy } from "./roster-reads-lib.ts";
import { checker, edit, importVariant, read, sourceFiles, stripComments } from "./source-checks.ts";

const { check, mutation, done } = checker("running-mate");
type Module = typeof import("../src/lib/running-mate.ts");

/* 1. D6. The raw strings are the fields as served (CR LF) and as headless
   Chromium serializes them (LF), spec §2.6 and the worksheet. */
const RAW_89042 = " Bryan&nbsp;\r\n\t\t    Avila                     ";
const RAW_90630 = " Ruben&nbsp;\r\n\t\t    A.&nbsp;\r\n\t\t    Coto                     ";
const RAW_90630_DOM = " Ruben&nbsp;\n\t\t    A.&nbsp;\n\t\t    Coto                     ";

function d6Problems(normalize: Module["normalizeDoeText"]): string[] {
  const problems: string[] = [];
  const want = (raw: string, expected: string) => {
    let got: string;
    try {
      got = normalize(raw);
    } catch (err) {
      problems.push(`normalizeDoeText(${JSON.stringify(raw)}) throws: ${String(err)}`);
      return;
    }
    if (got !== expected) problems.push(`normalizeDoeText(${JSON.stringify(raw)}) is ${JSON.stringify(got)}, want ${JSON.stringify(expected)}`);
  };
  want(RAW_89042, "Bryan Avila");
  want(RAW_90630, "Ruben A. Coto");
  want(RAW_90630_DOM, "Ruben A. Coto");
  want(" José&nbsp;\n  O'Brien-Núñez, Jr. ", "José O'Brien-Núñez, Jr.");
  want(" Joe  Van Vactor", "Joe Van Vactor");
  try {
    normalize("Pe&ntilde;a");
    problems.push("normalizeDoeText must throw on an entity it cannot decode (&ntilde;)");
  } catch {
    /* expected */
  }
  return problems;
}

const d6 = d6Problems(normalizeDoeText);
check('D6: canDetail 89042 reads "Bryan Avila" and 90630 "Ruben A. Coto"; nothing else changes', d6.length === 0, d6.join("; "));
check("the read tool's normalizeDoeText is this one (one copy)", readToolCopy === normalizeDoeText);

/* 2. All or none. The eight tickets as the worksheet stores them. */
const TICKETS: RunningMateRow[] = [
  { candidate_id: "FL-DOE-89042", running_mate: "Bryan Avila" },
  { candidate_id: "FL-DOE-89243", running_mate: "Gwen Graham" },
  { candidate_id: "FL-DOE-84076", running_mate: "Nicole Skelly" },
  { candidate_id: "FL-DOE-90630", running_mate: "Ruben A. Coto" },
  { candidate_id: "FL-DOE-89571", running_mate: "Rachel Rodriguez" },
  { candidate_id: "FL-DOE-88529", running_mate: "Benjiman Rojas" },
  { candidate_id: "FL-DOE-90433", running_mate: "Joe Van Vactor" },
  { candidate_id: "FL-DOE-89630", running_mate: "Juan Santana" },
];

function gateProblems(m: Pick<Module, "runningMatesFor" | "runningMateLine">): string[] {
  const problems: string[] = [];
  const lines = (rows: RunningMateRow[]) => {
    const mates = m.runningMatesFor(rows);
    return rows.map((r) => m.runningMateLine(mates, r.candidate_id));
  };
  const all = lines(TICKETS);
  if (all.some((l) => l === null) || all[0] !== "Running mate for Lieutenant Governor: Bryan Avila" || all[3] !== "Running mate for Lieutenant Governor: Ruben A. Coto") {
    problems.push(`eight named must give eight lines, the name exactly as stored: ${JSON.stringify(all)}`);
  }
  const withGap = (gap: Partial<RunningMateRow>) => TICKETS.map((t, i) => (i === 7 ? { candidate_id: t.candidate_id, ...gap } : t));
  for (const [what, rows] of [
    ["one null", withGap({ running_mate: null })],
    ["one blank", withGap({ running_mate: "   " })],
    ["one absent (a row cached before 0049)", withGap({})],
  ] as const) {
    if (lines([...rows]).some((l) => l !== null)) problems.push(`${what} of eight must hide every line`);
  }
  const house: RunningMateRow[] = [
    { candidate_id: "FL-DOE-1", running_mate: null },
    { candidate_id: "FL-DOE-2", running_mate: null },
  ];
  if (lines(house).some((l) => l !== null)) problems.push("a race with no running mates (every race but Governor) shows no line");
  if (m.runningMatesFor([]) !== null) problems.push("an empty race shows no line");
  const mates = m.runningMatesFor(TICKETS);
  if (m.runningMateLine(mates, "FL-DOE-00000") !== null || m.runningMateLine(mates, "toString") !== null) {
    problems.push("a candidate the race did not compute gets no line");
  }
  if (m.runningMateLine(null, "FL-DOE-89042") !== null) problems.push("no race value, no line");
  return problems;
}

const gate = gateProblems({ runningMatesFor, runningMateLine });
check("runningMatesFor: all eight named gives eight lines; any one missing gives none", gate.length === 0, gate.join("; "));

/* 3. The line component. */
const LINES = "src/components/features/RosterLines.tsx";
function lineComponentProblems(code: string): string[] {
  const c = stripComments(code);
  const start = c.indexOf("export function RunningMateLine");
  const next = c.indexOf("export function", start + 1);
  const body = start < 0 ? "" : c.slice(start, next < 0 ? undefined : next);
  const problems: string[] = [];
  if (!/const text = runningMateLine\(runningMates, candidateId\);\s*return text \? <p className="text-caption text-on-surface-muted">\{text\}<\/p> : null;/.test(body)) {
    problems.push("RunningMateLine must print runningMateLine(runningMates, candidateId) in one fixed <p>");
  }
  if ((body.match(/<p\b/g) ?? []).length !== 1) problems.push("RunningMateLine has exactly one element");
  return problems;
}
const lineComponent = lineComponentProblems(read(LINES));
check(`${LINES} prints the line in one fixed element`, lineComponent.length === 0, lineComponent.join("; "));

/* 4. The three cards, and who computes the race value. */
const CARDS = [
  "src/components/features/CandidateBrief.tsx",
  "src/components/features/RaceListing.tsx",
  "src/components/features/RaceCompare.tsx",
];
const USE = "<RunningMateLine runningMates={runningMates} candidateId={candidate.candidate_id} />";
function cardProblems(code: string): string[] {
  const c = stripComments(code);
  const problems: string[] = [];
  const exact = c.split(USE).length - 1;
  const all = (c.match(/<RunningMateLine\b/g) ?? []).length;
  if (exact !== 1 || all !== 1) problems.push(`renders ${USE} ${exact} time(s), <RunningMateLine> ${all} in all; want exactly once`);
  if (/(&&|\?|:)\s*\(?\s*<RunningMateLine\b/.test(c)) problems.push("<RunningMateLine> sits behind a condition");
  if (!/import\s*\{[^}]*\bRunningMateLine\b[^}]*\}\s*from\s*["']@\/components\/features\/RosterLines["']/.test(c)) {
    problems.push("must import RunningMateLine from @/components/features/RosterLines");
  }
  if (/\brunningMatesFor\s*\(/.test(c)) problems.push("a card must take the race value as a prop, not compute it");
  return problems;
}
for (const file of CARDS) {
  const problems = cardProblems(read(file));
  check(`${file} renders the line once, from the race value`, problems.length === 0, problems.join("; "));
}

const PAGES = new Set([
  "src/app/(public)/races/[raceId]/page.tsx",
  "src/app/(public)/candidates/[candidateId]/page.tsx",
]);
const SRC = new Map(sourceFiles("src").map((f) => [f, read(f)] as const));
function callerProblems(files: ReadonlyMap<string, string>): string[] {
  const problems: string[] = [];
  for (const [file, text] of files) {
    if (file === "src/lib/running-mate.ts") continue;
    const calls = /\brunningMatesFor\s*\(/.test(stripComments(text));
    if (calls && !PAGES.has(file)) problems.push(`${file} calls runningMatesFor`);
    if (!calls && PAGES.has(file)) problems.push(`${file} must compute the race's running mates`);
  }
  return problems;
}
const callers = callerProblems(SRC);
check("only the race page and the candidate page call runningMatesFor", callers.length === 0, callers.join("; "));

/* 5. No other reader. */
const ALLOWED = new Set(["src/lib/running-mate.ts", "src/types/schema.ts"]);
const LEAD_KIND_FILES = new Set([
  "src/lib/candidate-leads.ts",
  "src/types/admin.ts",
  "src/components/admin/ReviewItemCard.tsx",
]);
const COLUMN = /\brunning_mate(?:_source|_verified_at)?\b/;
const WORDS = /Running mate for Lieutenant Governor/i;
function readerProblems(files: ReadonlyMap<string, string>): string[] {
  const problems: string[] = [];
  for (const [file, text] of files) {
    if (ALLOWED.has(file)) continue;
    let code = stripComments(text);
    if (LEAD_KIND_FILES.has(file)) code = code.replace(/"[^"\n]*"/g, '""');
    const column = code.match(COLUMN);
    if (column) problems.push(`${file} reads ${column[0]}`);
    if (WORDS.test(code)) problems.push(`${file} prints the running-mate line itself`);
  }
  return problems;
}
const readers = readerProblems(SRC);
check(`no other file in src/ reads running_mate or prints the line (${SRC.size} files)`, readers.length === 0, readers.join("; "));

/* 6. Mutations. */
await mutation("one ticket without a running mate still shows the other seven", async () => {
  const m = await importVariant<Module>("src/lib/running-mate.ts", [["if (!name || !name.trim()) return null;", "if (!name || !name.trim()) continue;"]]);
  return gateProblems(m);
});
await mutation("D6 decodes no entities", async () => {
  const m = await importVariant<Module>("src/lib/running-mate.ts", [["decodeEntities(raw)", "raw"]]);
  return d6Problems(m.normalizeDoeText);
});
await mutation("D6 stops collapsing whitespace", async () => {
  const m = await importVariant<Module>("src/lib/running-mate.ts", [['return decoded.replace(/\\s+/g, " ").trim();', "return decoded.trim();"]]);
  return d6Problems(m.normalizeDoeText);
});
await mutation("the line component reads the map itself", () =>
  lineComponentProblems(edit(read(LINES), "const text = runningMateLine(runningMates, candidateId);", "const text = runningMates?.[candidateId];")),
);
await mutation("a card shows the line only for some candidates", () =>
  cardProblems(edit(read(CARDS[2]), USE, `{candidate.official_site && ${USE}}`)),
);
await mutation("a card drops the line", () => cardProblems(edit(read(CARDS[0]), USE, "")));
await mutation("a card computes its own race value", () =>
  cardProblems(edit(read(CARDS[1]), USE, `${USE}{String(runningMatesFor([]))}`)),
);
await mutation("a lead-kind file reads the column", () => {
  const copy = new Map(SRC);
  const file = "src/components/admin/ReviewItemCard.tsx";
  copy.set(file, `${read(file)}\nexport const y = (c: { running_mate: string }) => c.running_mate;\n`);
  return readerProblems(copy);
});
await mutation("a loader reads running_mate", () => {
  const copy = new Map(SRC);
  copy.set("src/lib/briefs.ts", `${read("src/lib/briefs.ts")}\nexport const x = (c: { running_mate: string }) => c.running_mate;\n`);
  return readerProblems(copy);
});
await mutation("a page stops computing the race value", () => {
  const copy = new Map(SRC);
  const page = "src/app/(public)/races/[raceId]/page.tsx";
  copy.set(page, read(page).split("runningMatesFor(").join("noRunningMates("));
  return callerProblems(copy);
});

done();
```

- [ ] **Step 2: Run it to see it fail**

Run: `"$NODE" scripts/verify-running-mate.ts`
Expected: a crash, `ERR_MODULE_NOT_FOUND` for `src/lib/running-mate.ts`.

- [ ] **Step 3: Write `running-mate.ts`, moving `normalizeDoeText` into it**

Create `src/lib/running-mate.ts`:

```ts
/* The running-mate line on every Governor card (spec
   docs/superpowers/specs/2026-10-08-roster-completeness-design.md §3.6; D5
   and D6, Recommended pending founder confirmation). The only place in src/
   that reads candidate.running_mate and its source columns (0049).

   Florida elects the governor and lieutenant governor as one ticket. The
   Division of Elections' candidate export has no running-mate field; its
   per-candidate canDetail page does (§2.6), and 0049 stores each ticket's
   name from that page with the page's URL and the read date.

   All or none: runningMatesFor returns names only when every ballot
   candidate in the race has running_mate; otherwise null, and no card in the
   race shows the line. There is no constant: the gate is the data, and 0049
   fills all eight tickets in one statement after a reviewed read. Clearing
   one row's three columns (the takedown in §3.10) hides all eight. Only a
   Governor row can hold a running mate (a CHECK in 0049), so no other race
   shows the line. No link, party, photo or page for a running mate: every
   ticket gets exactly the name, as stored.

   TO FLIP (D5: store only, show nothing until after Nov 3): make
   runningMatesFor return null. The columns stay.

   Relative imports with the extension: plain-Node scripts import this
   (scripts/roster-reads-lib.ts, scripts/verify-running-mate.ts). */

import { decodeEntities } from "./candidate-site.ts";

/** D6: decode HTML entities, turn non-breaking spaces into spaces, collapse
    every run of whitespace (spaces, tabs, CR, LF) to one space, trim.
    Nothing else changes: case, accents and punctuation stay as printed.
    Fail-closed: an entity the decoder does not know (say `&ntilde;`) throws,
    so a half-decoded name can never be stored. */
export function normalizeDoeText(raw: string): string {
  const decoded = decodeEntities(raw).replace(/\xa0/g, " ");
  const leftover = decoded.match(/&(?:#\d+|#x[0-9a-f]+|[a-z][a-z0-9]*);/i);
  if (leftover) {
    throw new Error(`normalizeDoeText: undecoded entity ${leftover[0]} in ${JSON.stringify(raw)}`);
  }
  return decoded.replace(/\s+/g, " ").trim();
}

/** By candidate_id, the running mate each Governor card prints. */
export type RunningMates = Readonly<Record<string, string>>;

/** The fields runningMatesFor reads. running_mate is optional because a row
    read before 0049 was applied has no such field, and missing means "not
    set". */
export interface RunningMateRow {
  candidate_id: string;
  running_mate?: string | null;
}

/** Every candidate's running mate, only when each one in the race has one;
    null when the race is empty or any candidate has none. */
export function runningMatesFor(candidates: readonly RunningMateRow[]): RunningMates | null {
  if (candidates.length === 0) return null;
  const names: Record<string, string> = {};
  for (const c of candidates) {
    const name = c.running_mate;
    if (!name || !name.trim()) return null;
    names[c.candidate_id] = name;
  }
  return names;
}

/** One card's line, "Running mate for Lieutenant Governor: <name>", or null
    when its race shows none. */
export function runningMateLine(runningMates: RunningMates | null, candidateId: string): string | null {
  if (!runningMates || !Object.hasOwn(runningMates, candidateId)) return null;
  return `Running mate for Lieutenant Governor: ${runningMates[candidateId]}`;
}
```

In `scripts/roster-reads-lib.ts`:

Find:
```ts
   normalizeDoeText is the spec's D6 rule. The spec places it in
   src/lib/running-mate.ts; that file belongs to the display PR (PR 2,
   claude/roster-display), which moves this function there and points
   roster-reads.ts at it. Until then this is the one copy. */

import { decodeEntities } from "../src/lib/candidate-site.ts";
```
Replace with:
```ts
   normalizeDoeText, the spec's D6 rule, lives in src/lib/running-mate.ts
   (the display PR moved it there). It is re-exported here so the read tool,
   the worksheet checker and their tests keep one import, and there is still
   one copy. */

import { decodeEntities } from "../src/lib/candidate-site.ts";
import { normalizeDoeText } from "../src/lib/running-mate.ts";

export { normalizeDoeText };
```

Find (and delete, leaving nothing in its place):
```ts
/** D6: decode HTML entities, turn non-breaking spaces into spaces, collapse
    every run of whitespace (spaces, tabs, CR, LF) to one space, trim.
    Nothing else changes: case, accents and punctuation stay as printed.
    Fail-closed: an entity the decoder does not know (say `&ntilde;`) throws,
    so a half-decoded name can never be stored. */
export function normalizeDoeText(raw: string): string {
  const decoded = decodeEntities(raw).replace(/\xa0/g, " ");
  const leftover = decoded.match(/&(?:#\d+|#x[0-9a-f]+|[a-z][a-z0-9]*);/i);
  if (leftover) {
    throw new Error(`normalizeDoeText: undecoded entity ${leftover[0]} in ${JSON.stringify(raw)}`);
  }
  return decoded.replace(/\s+/g, " ").trim();
}

```
(`decodeEntities` stays imported: `parseHouseFlorida`, `parseSenateFlorida` and `pageText` in the same file use it.)

In `src/types/schema.ts`:

Find:
```ts
  official_site: string | null;
  fec_id: string | null;
}
```
Replace with:
```ts
  official_site: string | null;
  fec_id: string | null;
  /* 0049_roster_completeness (spec 2026-10-08-roster-completeness §3.2):
     the Governor ticket's running mate as the Division of Elections prints
     it (D6), the canDetail URL it was read from and the read date. All three
     null on every other row. Read only through src/lib/running-mate.ts. */
  running_mate: string | null;
  running_mate_source: string | null;
  running_mate_verified_at: string | null;
}
```

- [ ] **Step 4: Write the line component**

Create `src/components/features/RosterLines.tsx`:

```tsx
import { runningMateLine, type RunningMates } from "@/lib/running-mate";

/* The roster lines a card can carry besides its name and party (spec
   2026-10-08-roster-completeness §3.5 and §3.6). Each takes the value the
   page computed once for the whole race, so every card in a race shows the
   line or none does, and the markup is the same for every candidate: only
   the text differs, as the name does. Plain caption text, no colour and no
   chip. */

/** "Running mate for Lieutenant Governor: <name>", under the name, on every
    Governor card or none (running-mate.ts). */
export function RunningMateLine({
  runningMates,
  candidateId,
}: {
  runningMates: RunningMates | null;
  candidateId: string;
}) {
  const text = runningMateLine(runningMates, candidateId);
  return text ? <p className="text-caption text-on-surface-muted">{text}</p> : null;
}
```

- [ ] **Step 5: Run it to see the cards fail**

Run: `"$NODE" scripts/verify-running-mate.ts`
Expected: D6, "one copy", `runningMatesFor`, the component and the reader scan print `ok`; three `FAIL ... renders the line once, from the race value` lines, `FAIL only the race page and the candidate page call runningMatesFor`, and the three mutations that edit a card report `could not build the mutant`; exit 1.

- [ ] **Step 6: Put the line on `CandidateBrief`**

In `src/components/features/CandidateBrief.tsx`:

Find:
```tsx
import { IssueSection } from "@/components/features/IssueSection";
```
Replace with:
```tsx
import { IssueSection } from "@/components/features/IssueSection";
import { RunningMateLine } from "@/components/features/RosterLines";
```

Find:
```tsx
import { showIncumbentChip } from "@/lib/incumbency";
```
Replace with:
```tsx
import { showIncumbentChip } from "@/lib/incumbency";
import type { RunningMates } from "@/lib/running-mate";
```

Find:
```tsx
  data,
  headingLevel = "h2",
  linkToDetail = true,
}: {
  data: CandidateBriefData;
  headingLevel?: "h2" | "h3";
  linkToDetail?: boolean;
}) {
```
Replace with:
```tsx
  data,
  headingLevel = "h2",
  linkToDetail = true,
  runningMates,
}: {
  data: CandidateBriefData;
  headingLevel?: "h2" | "h3";
  linkToDetail?: boolean;
  /** The race's running mates, computed once per race by the page
      (runningMatesFor): every Governor card shows its line, or none does. */
  runningMates: RunningMates | null;
}) {
```

Find:
```tsx
        </Heading>
        <div className="flex flex-wrap items-center gap-2">
```
Replace with:
```tsx
        </Heading>
        <RunningMateLine runningMates={runningMates} candidateId={candidate.candidate_id} />
        <div className="flex flex-wrap items-center gap-2">
```

- [ ] **Step 7: Put the line on `ListedCandidateCard` and pass it through `RaceListing`**

In `src/components/features/RaceListing.tsx`:

Find:
```tsx
import { CampaignWebsite } from "@/components/features/CampaignWebsite";
```
Replace with:
```tsx
import { CampaignWebsite } from "@/components/features/CampaignWebsite";
import { RunningMateLine } from "@/components/features/RosterLines";
```

Find:
```tsx
import { listingCardLine } from "@/lib/listing-copy";
```
Replace with:
```tsx
import { listingCardLine } from "@/lib/listing-copy";
import type { RunningMates } from "@/lib/running-mate";
```

Find:
```tsx
  data,
  status,
  headingLevel = "h2",
  linkToDetail = true,
}: {
  data: ListedCandidate;
  status: RaceListingData["status"];
  headingLevel?: "h1" | "h2" | "h3";
  linkToDetail?: boolean;
}) {
```
Replace with:
```tsx
  data,
  status,
  headingLevel = "h2",
  linkToDetail = true,
  runningMates,
}: {
  data: ListedCandidate;
  status: RaceListingData["status"];
  headingLevel?: "h1" | "h2" | "h3";
  linkToDetail?: boolean;
  /** The race's running mates (runningMatesFor), computed once per race. */
  runningMates: RunningMates | null;
}) {
```

Find:
```tsx
        </Heading>
        <div className="flex flex-wrap items-center gap-2">
```
Replace with:
```tsx
        </Heading>
        <RunningMateLine runningMates={runningMates} candidateId={candidate.candidate_id} />
        <div className="flex flex-wrap items-center gap-2">
```

Find:
```tsx
export function RaceListing({ listing }: { listing: RaceListingData }) {
```
Replace with:
```tsx
export function RaceListing({
  listing,
  runningMates,
}: {
  listing: RaceListingData;
  runningMates: RunningMates | null;
}) {
```

Find:
```tsx
          data={c}
          status={listing.status}
        />
```
Replace with:
```tsx
          data={c}
          status={listing.status}
          runningMates={runningMates}
        />
```

- [ ] **Step 8: Pass it through `CandidateListing`**

In `src/components/features/CandidateListing.tsx`:

Find:
```tsx
import type { CandidateListing as CandidateListingData } from "@/lib/listing";
```
Replace with:
```tsx
import type { CandidateListing as CandidateListingData } from "@/lib/listing";
import type { RunningMates } from "@/lib/running-mate";
```

Find:
```tsx
export function CandidateListing({
  listing,
}: {
  listing: CandidateListingData;
}) {
```
Replace with:
```tsx
export function CandidateListing({
  listing,
  runningMates,
}: {
  listing: CandidateListingData;
  /** The race's running mates, from the same rows the race page uses. */
  runningMates: RunningMates | null;
}) {
```

Find:
```tsx
        status={listing.status}
        headingLevel="h1"
```
Replace with:
```tsx
        status={listing.status}
        runningMates={runningMates}
        headingLevel="h1"
```

- [ ] **Step 9: Put the line on the `RaceCompare` roster card**

In `src/components/features/RaceCompare.tsx`:

Find:
```tsx
import { NoStatedPositionNote } from "@/components/features/ClaimList";
```
Replace with:
```tsx
import { NoStatedPositionNote } from "@/components/features/ClaimList";
import { RunningMateLine } from "@/components/features/RosterLines";
```

Find:
```tsx
import { partyLegend } from "@/lib/party-label";
```
Replace with:
```tsx
import { partyLegend } from "@/lib/party-label";
import type { RunningMates } from "@/lib/running-mate";
```

Find:
```tsx
export function RaceCompare({ brief }: { brief: RaceBrief }) {
```
Replace with:
```tsx
export function RaceCompare({
  brief,
  runningMates,
}: {
  brief: RaceBrief;
  /** The race's running mates (runningMatesFor), computed once per race by
      the page: every Governor card shows its line, or none does. */
  runningMates: RunningMates | null;
}) {
```

Find:
```tsx
              </h3>
              <div className="flex flex-wrap items-center gap-2">
```
Replace with:
```tsx
              </h3>
              <RunningMateLine runningMates={runningMates} candidateId={candidate.candidate_id} />
              <div className="flex flex-wrap items-center gap-2">
```

- [ ] **Step 10: Compute the race value on the race page**

In `src/app/(public)/races/[raceId]/page.tsx`:

Find:
```tsx
import { ACTIVE_ELECTION_KIND } from "@/lib/election";
```
Replace with:
```tsx
import { ACTIVE_ELECTION_KIND } from "@/lib/election";
import { runningMatesFor } from "@/lib/running-mate";
```

Find:
```tsx
  return (
    <main className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col gap-5 px-5 py-8">
      {/* The heading names the district for a House race (officeTitle);
```
Replace with:
```tsx
  /* The race-level card lines (roster-completeness spec §3.5, §3.6) are
     computed here, at render, on the rows the cached loader returned, so a
     code change to them takes effect on its deploy (§3.9). */
  const raceCandidates = brief.candidates.map((c) => c.candidate);

  return (
    <main className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col gap-5 px-5 py-8">
      {/* The heading names the district for a House race (officeTitle);
```

Find:
```tsx
      <RaceCompare brief={brief} />
```
Replace with:
```tsx
      <RaceCompare brief={brief} runningMates={runningMatesFor(raceCandidates)} />
```

Find:
```tsx
    level: listing.race.level,
  });
```
Replace with:
```tsx
    level: listing.race.level,
  });
  const raceCandidates = listing.candidates.map((c) => c.candidate);
```

Find:
```tsx
      <RaceListing listing={listing} />
```
Replace with:
```tsx
      <RaceListing listing={listing} runningMates={runningMatesFor(raceCandidates)} />
```

- [ ] **Step 11: Compute it on the candidate page**

In `src/app/(public)/candidates/[candidateId]/page.tsx`:

Find:
```tsx
import { officeTitle } from "@/lib/office-title";
```
Replace with:
```tsx
import { officeTitle } from "@/lib/office-title";
import { runningMatesFor, type RunningMates } from "@/lib/running-mate";
```

Find:
```tsx
   the page never says such a candidate is "running for" a seat that is not
   on the November ballot. */
async function runningFor(
  raceId: string,
  office: string
): Promise<{ office: string; settled: string | null }> {
```
Replace with:
```tsx
   the page never says such a candidate is "running for" a seat that is not
   on the November ballot.

   The race-level card lines (roster-completeness spec §3.5, §3.6) come from
   every candidate in the race, from the same cached reads the race page
   uses, so a candidate's own page shows a line exactly when their race page
   does. Computed at render, outside the data cache (§3.9). */
async function runningFor(
  raceId: string,
  office: string
): Promise<{
  office: string;
  settled: string | null;
  runningMates: RunningMates | null;
}> {
```

Find:
```tsx
        : null;
  return { office: race ? officeTitle(race) : office, settled };
}
```
Replace with:
```tsx
        : null;
  const raceCandidates = brief
    ? brief.candidates.map((c) => c.candidate)
    : (listing?.candidates ?? []).map((c) => c.candidate);
  return {
    office: race ? officeTitle(race) : office,
    settled,
    runningMates: runningMatesFor(raceCandidates),
  };
}
```

Find:
```tsx
      const { office } = await runningFor(listing.raceId, listing.office);
      return (
        <main className="mx-auto flex w-full max-w-[680px] flex-1 flex-col gap-4 px-5 py-8">
          <CandidateListing listing={{ ...listing, office }} />
```
Replace with:
```tsx
      const { office, runningMates } = await runningFor(listing.raceId, listing.office);
      return (
        <main className="mx-auto flex w-full max-w-[680px] flex-1 flex-col gap-4 px-5 py-8">
          <CandidateListing
            listing={{ ...listing, office }}
            runningMates={runningMates}
          />
```

Find:
```tsx
  const { office, settled } = await runningFor(detail.raceId, detail.office);
```
Replace with:
```tsx
  const { office, settled, runningMates } = await runningFor(detail.raceId, detail.office);
```

Find:
```tsx
        headingLevel="h2"
        linkToDetail={false}
      />
```
Replace with:
```tsx
        headingLevel="h2"
        linkToDetail={false}
        runningMates={runningMates}
      />
```

- [ ] **Step 12: Let `verify-office-title.ts` accept the wider destructuring**

It pinned the candidate page's exact lines (`scripts/verify-office-title.ts:105-111`). What it protects stays: `office` comes from `runningFor` in both states, and nothing prints `detail.office`.

In `scripts/verify-office-title.ts`:

Find:
```ts
  /const \{ office, settled \} = await runningFor\(detail\.raceId, detail\.office\);/.test(candidatePage) &&
    /const \{ office \} = await runningFor\(listing\.raceId, listing\.office\);/.test(candidatePage) &&
    /<CandidateListing listing=\{\{ \.\.\.listing, office \}\} \/>/.test(candidatePage) &&
```
Replace with:
```ts
  /* The destructuring may also take the race-level card lines runningFor
     returns (roster-completeness spec §3.5, §3.6); `office` is still the one
     "Running for" prints. */
  /const \{ office, settled(?:, \w+)* \} = await runningFor\(detail\.raceId, detail\.office\);/.test(candidatePage) &&
    /const \{ office(?:, \w+)* \} = await runningFor\(listing\.raceId, listing\.office\);/.test(candidatePage) &&
    /<CandidateListing\s+listing=\{\{ \.\.\.listing, office \}\}/.test(candidatePage) &&
```

- [ ] **Step 13: Run the tests to see them pass**

Run:
```bash
"$NODE" scripts/verify-running-mate.ts 2>&1 | tail -3
for s in verify-roster-worksheet verify-office-title verify-incumbent-chip verify-campaign-website; do "$NODE" scripts/$s.ts >/dev/null 2>&1; echo "$s exit $?"; done
"$NODE" node_modules/typescript/bin/tsc --noEmit
"$NODE" node_modules/typescript/bin/tsc --noEmit --strict --erasableSyntaxOnly --target es2022 --module esnext --moduleResolution bundler --allowImportingTsExtensions --skipLibCheck --types node scripts/source-checks.ts scripts/verify-running-mate.ts scripts/verify-office-title.ts scripts/roster-reads-lib.ts scripts/roster-reads.ts scripts/roster-worksheet.ts scripts/verify-roster-worksheet.ts
"$NODE" node_modules/eslint/bin/eslint.js scripts/verify-running-mate.ts scripts/verify-office-title.ts scripts/roster-reads-lib.ts src/lib/running-mate.ts src/components/features/RosterLines.tsx src/components/features/CandidateBrief.tsx src/components/features/RaceListing.tsx src/components/features/RaceCompare.tsx src/components/features/CandidateListing.tsx "src/app/(public)/races/[raceId]/page.tsx" "src/app/(public)/candidates/[candidateId]/page.tsx" src/types/schema.ts
```
Expected: `All running-mate checks passed.` (19 `ok` lines, 10 of them mutations); each of the four scripts `exit 0` (`verify-roster-worksheet.ts` now runs on the moved `normalizeDoeText`; `verify-incumbent-chip.ts` is still the old script and the chip is still there); `tsc` and `eslint` print nothing.

- [ ] **Step 14: Commit**

```bash
git add src/lib/running-mate.ts src/components/features/RosterLines.tsx scripts/verify-running-mate.ts scripts/roster-reads-lib.ts src/types/schema.ts src/components/features/CandidateBrief.tsx src/components/features/RaceListing.tsx src/components/features/RaceCompare.tsx src/components/features/CandidateListing.tsx "src/app/(public)/races/[raceId]/page.tsx" "src/app/(public)/candidates/[candidateId]/page.tsx" scripts/verify-office-title.ts
git commit -F - <<'EOF'
Running-mate line on every Governor card, or none (D5, D6)

"Running mate for Lieutenant Governor: <name>" under the name on the three
cards, from the name 0049 stores (spec 2026-10-08-roster-completeness §3.6,
recommended pending founder confirmation). runningMatesFor returns names
only when every candidate in the race has one; the race page and the
candidate page compute it once per race, at render, and pass it to the
cards. normalizeDoeText (D6) moves to src/lib/running-mate.ts and
roster-reads-lib re-exports it. The Candidate type gains the three running-
mate fields. verify-running-mate.ts checks D6, the all-or-none rule, the
component, the cards and that nothing else reads the column, with
mutations; verify-office-title accepts runningFor's wider return.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 3: The incumbency line, all or none per race, behind `SHOW_INCUMBENT_CHIP = false` (D1-D4)

**Files:**
- Create: `scripts/fixtures/roster/race-labels-2026-10-08.json`
- Rewrite: `src/lib/incumbency.ts`, `scripts/verify-incumbent-chip.ts`
- Modify: `src/types/schema.ts`, `src/components/features/RosterLines.tsx`, `src/components/features/CandidateBrief.tsx`, `src/components/features/RaceListing.tsx`, `src/components/features/RaceCompare.tsx`, `src/components/features/CandidateListing.tsx`, `src/app/(public)/races/[raceId]/page.tsx`, `src/app/(public)/candidates/[candidateId]/page.tsx`

**Interfaces:**
- Consumes: Task 1's `scripts/source-checks.ts`; Task 2's `RosterLines.tsx`, the `runningMates` props and `runningFor()`; `labelFor(raceId: string): string | null` from `scripts/roster-worksheet.ts:64` (PR 1); the fixture `scripts/fixtures/roster/ballot-roster-2026-10-08.json` (PR 1).
- Produces: `SHOW_INCUMBENT_CHIP: boolean` (still `false`); `incumbencyLabel(raceId: string): string | null`; `interface Incumbency { label: string; byCandidate: Readonly<Record<string, boolean>> }`; `interface IncumbencyRow { candidate_id: string; is_incumbent: boolean; incumbency_verified_at?: string | null }`; `incumbencyFor(race: { race_id: string }, candidates: readonly IncumbencyRow[]): Incumbency | null`; `incumbencyLine(incumbency: Incumbency | null, candidateId: string): string | null`; `IncumbencyLine({ incumbency, candidateId })`; a required `incumbency: Incumbency | null` prop on the same five components; `runningFor()` returns `incumbency`; `Candidate` gains `incumbency_source`, `incumbency_verified_at`. `showIncumbentChip` is removed.

- [ ] **Step 1: Confirm the race ids, read-only (optional when the Supabase MCP is not available)**

With the Supabase MCP `execute_sql` (project `pqracitpmzpiqfnzlngw`), SELECT only:
```sql
SELECT race_id, election FROM race ORDER BY race_id;
```
Expected: 53 rows, all `general`, exactly the keys of the fixture below. If a race was added or removed since 2026-10-08, stop and report it: the fixture and the worksheet both need the new race, and PR 1 owns the worksheet.

- [ ] **Step 2: Write the label fixture**

Create `scripts/fixtures/roster/race-labels-2026-10-08.json` (each label typed from the spec's §3.5 table, not computed):

```json
{
  "FL-7-general": "Member of the U.S. House now",
  "FL-8-general": "Member of the U.S. House now",
  "FL-9-general": "Member of the U.S. House now",
  "FL-10-general": "Member of the U.S. House now",
  "FL-11-general": "Member of the U.S. House now",
  "FL-12-general": "Member of the U.S. House now",
  "FL-14-general": "Member of the U.S. House now",
  "FL-15-general": "Member of the U.S. House now",
  "FL-16-general": "Member of the U.S. House now",
  "FL-20-general": "Member of the U.S. House now",
  "FL-22-general": "Member of the U.S. House now",
  "FL-24-general": "Member of the U.S. House now",
  "FL-25-general": "Member of the U.S. House now",
  "FL-26-general": "Member of the U.S. House now",
  "FL-27-general": "Member of the U.S. House now",
  "FL-28-general": "Member of the U.S. House now",
  "FL-SEN-general": "Member of the U.S. Senate now",
  "FL-GOV-general": "Holds this office now",
  "FL-ATG-general": "Holds this office now",
  "FL-CFO-general": "Holds this office now",
  "FL-AGR-general": "Holds this office now",
  "FL-ORA-MAYOR-general": "Holds this office now",
  "FL-ORA-CLERK-general": "Holds this office now",
  "FL-BRO-CC2-general": "Member of the Broward County Commission now",
  "FL-BRO-CC4-general": "Member of the Broward County Commission now",
  "FL-BRO-CC6-general": "Member of the Broward County Commission now",
  "FL-BRO-CC8-general": "Member of the Broward County Commission now",
  "FL-BRO-SB1-general": "Member of the Broward County School Board now",
  "FL-BRO-SB4-general": "Member of the Broward County School Board now",
  "FL-BRO-SB6-general": "Member of the Broward County School Board now",
  "FL-BRO-SB7-general": "Member of the Broward County School Board now",
  "FL-BRO-SBAL8-general": "Member of the Broward County School Board now",
  "FL-DAD-CC2-general": "Member of the Miami-Dade County Commission now",
  "FL-DAD-CC5-general": "Member of the Miami-Dade County Commission now",
  "FL-DAD-SB1-general": "Member of the Miami-Dade County School Board now",
  "FL-DAD-SB2-general": "Member of the Miami-Dade County School Board now",
  "FL-DAD-SB8-general": "Member of the Miami-Dade County School Board now",
  "FL-HIL-CC1-general": "Member of the Hillsborough County Commission now",
  "FL-HIL-CC3-general": "Member of the Hillsborough County Commission now",
  "FL-HIL-CC5-general": "Member of the Hillsborough County Commission now",
  "FL-HIL-CC7-general": "Member of the Hillsborough County Commission now",
  "FL-HIL-SB2-general": "Member of the Hillsborough County School Board now",
  "FL-HIL-SB4-general": "Member of the Hillsborough County School Board now",
  "FL-HIL-SB6-general": "Member of the Hillsborough County School Board now",
  "FL-ORA-CC2-general": "Member of the Orange County Commission now",
  "FL-ORA-CC4-general": "Member of the Orange County Commission now",
  "FL-ORA-CC6-general": "Member of the Orange County Commission now",
  "FL-ORA-CC7-general": "Member of the Orange County Commission now",
  "FL-ORA-CC8-general": "Member of the Orange County Commission now",
  "FL-ORA-SB1-general": "Member of the Orange County School Board now",
  "FL-ORA-SB2-general": "Member of the Orange County School Board now",
  "FL-ORA-SB3-general": "Member of the Orange County School Board now",
  "FL-ORA-SBCHAIR-general": "Member of the Orange County School Board now"
}
```

- [ ] **Step 3: Write the failing test**

Replace the whole of `scripts/verify-incumbent-chip.ts` with:

```ts
/* The incumbency line (spec
   docs/superpowers/specs/2026-10-08-roster-completeness-design.md §3.5,
   §3.11 and §6; D1 to D3, Recommended pending founder confirmation).

   Every card in a race shows "<label>: Yes" or "<label>: No", or none does,
   and nothing shows while SHOW_INCUMBENT_CHIP is false. It replaced an
   "Incumbent" chip that only an incumbent got. What would quietly undo it is
   a second reader: a new card, an Open seat label, a sort or a meta
   description that reads the column straight from the row, or a line shown
   only when true. So this checks:

   0. SHOW_INCUMBENT_CHIP is false. The flip PR (spec §3.11) changes this one
      expectation together with the constant.
   1. The label table maps each of the 53 production race ids (fixture, from
      SELECT race_id FROM race on 2026-10-08) to its label, an unknown id to
      none, and agrees with the worksheet's copy (scripts/roster-worksheet.ts).
   2. incumbencyFor: with the flag false, null for every race; with it true
      (a copy of the module with only the constant changed), null when any
      candidate lacks incumbency_verified_at, when the race has no label or no
      candidates, and the full map otherwise. Yes and No come from one
      template.
   3. IncumbencyLine prints incumbencyLine's text in one fixed element.
   4. The three cards (CandidateBrief, ListedCandidateCard in RaceListing,
      the RaceCompare roster card) each render <IncumbencyLine> once, never
      behind a condition, from the race-level value; only the two pages call
      incumbencyFor.
   5. Nothing else in src/ reads is_incumbent, incumbent_id, is_open_seat or
      the incumbency columns, or prints the word "incumbent", outside
      incumbency.ts and the row types. Comments are stripped first, so a
      comment explaining the gate is not read as a use of the column.
   6. Each guard above catches the change it exists for (mutations).

   Run: node scripts/verify-incumbent-chip.ts */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  SHOW_INCUMBENT_CHIP,
  incumbencyFor,
  incumbencyLabel,
  incumbencyLine,
  type IncumbencyRow,
} from "../src/lib/incumbency.ts";
import { labelFor } from "./roster-worksheet.ts";
import { ROOT, checker, edit, importVariant, read, sourceFiles, stripComments } from "./source-checks.ts";

const { check, mutation, done } = checker("incumbent-chip");
type Module = typeof import("../src/lib/incumbency.ts");
const MODULE = "src/lib/incumbency.ts";
const FLAG = /export const SHOW_INCUMBENT_CHIP: boolean = (?:true|false);/;
const flagOn = (edits: ReadonlyArray<readonly [string | RegExp, string]> = []) =>
  importVariant<Module>(MODULE, [[FLAG, "export const SHOW_INCUMBENT_CHIP: boolean = true;"], ...edits]);

/* 0. The flag. */
const EXPECTED_FLAG = false;
console.log(`SHOW_INCUMBENT_CHIP is ${SHOW_INCUMBENT_CHIP}`);
check(
  `SHOW_INCUMBENT_CHIP is ${EXPECTED_FLAG} (spec §3.11: only the flip PR changes it, with this line)`,
  SHOW_INCUMBENT_CHIP === EXPECTED_FLAG,
);

/* 1. The label table. */
const LABELS = JSON.parse(
  readFileSync(join(ROOT, "scripts/fixtures/roster/race-labels-2026-10-08.json"), "utf8"),
) as Record<string, string>;
const ROSTER = JSON.parse(
  readFileSync(join(ROOT, "scripts/fixtures/roster/ballot-roster-2026-10-08.json"), "utf8"),
) as Array<{ race_id: string }>;
const UNKNOWN = ["FL-PBC-CC1-general", "FL-LTG-general", "FL-GOV-primary", "FL-ORA-SHERIFF-general", "FL-SEN", ""];

function labelProblems(label: Module["incumbencyLabel"]): string[] {
  const problems: string[] = [];
  for (const [raceId, want] of Object.entries(LABELS)) {
    if (label(raceId) !== want) problems.push(`${raceId} is ${JSON.stringify(label(raceId))}, want "${want}"`);
  }
  for (const raceId of UNKNOWN) {
    if (label(raceId) !== null) problems.push(`${JSON.stringify(raceId)} must have no label`);
  }
  return problems;
}

const fixtureIds = Object.keys(LABELS).sort();
const rosterIds = [...new Set(ROSTER.map((r) => r.race_id))].sort();
check(
  "the label fixture holds the same 53 race ids as the ballot roster fixture",
  fixtureIds.length === 53 && JSON.stringify(fixtureIds) === JSON.stringify(rosterIds),
  `${fixtureIds.length} vs ${rosterIds.length}`,
);
const labels = labelProblems(incumbencyLabel);
check("each of the 53 race ids gets its label, an unknown id none (§3.5)", labels.length === 0, labels.join("; "));
const drift = fixtureIds.filter((id) => labelFor(id) !== incumbencyLabel(id));
check("the worksheet's label column uses the same labels (scripts/roster-worksheet.ts)", drift.length === 0, drift.join(", "));

/* 2. incumbencyFor and incumbencyLine. */
const AT = "2026-10-09T00:00:00+00:00";
const FL20 = { race_id: "FL-20-general" };
const ROWS: IncumbencyRow[] = [
  { candidate_id: "FL-DOE-1", is_incumbent: true, incumbency_verified_at: AT },
  { candidate_id: "FL-DOE-2", is_incumbent: false, incumbency_verified_at: AT },
  { candidate_id: "FL-DOE-3", is_incumbent: false, incumbency_verified_at: AT },
];
const linesFor = (m: Pick<Module, "incumbencyFor" | "incumbencyLine">, race: { race_id: string }, rows: IncumbencyRow[]) => {
  const inc = m.incumbencyFor(race, rows);
  return rows.map((r) => m.incumbencyLine(inc, r.candidate_id));
};

function flagOffProblems(m: Pick<Module, "incumbencyFor" | "incumbencyLine">): string[] {
  return linesFor(m, FL20, ROWS).some((l) => l !== null) || m.incumbencyFor(FL20, ROWS) !== null
    ? ["with the flag false, a fully sourced race must still show no line"]
    : [];
}

function flagOnProblems(m: Pick<Module, "incumbencyFor" | "incumbencyLine">): string[] {
  const problems: string[] = [];
  const full = linesFor(m, FL20, ROWS);
  const want = [
    "Member of the U.S. House now: Yes",
    "Member of the U.S. House now: No",
    "Member of the U.S. House now: No",
  ];
  if (JSON.stringify(full) !== JSON.stringify(want)) {
    problems.push(`a fully sourced race must give every card its line: ${JSON.stringify(full)}`);
  }
  const gap = (g: Partial<IncumbencyRow>) => ROWS.map((r, i) => (i === 2 ? { candidate_id: r.candidate_id, is_incumbent: r.is_incumbent, ...g } : r));
  for (const [what, rows] of [
    ["one candidate with a null source date", gap({ incumbency_verified_at: null })],
    ["one candidate with no source field (a row cached before 0049)", gap({})],
    ["one candidate with an empty source date", gap({ incumbency_verified_at: "" })],
  ] as const) {
    if (linesFor(m, FL20, [...rows]).some((l) => l !== null)) problems.push(`${what} must hide the line on every card`);
  }
  if (linesFor(m, { race_id: "FL-PBC-CC1-general" }, ROWS).some((l) => l !== null)) {
    problems.push("a race with no label shows no line");
  }
  if (m.incumbencyFor(FL20, []) !== null) problems.push("a race with no candidates shows no line");
  const inc = m.incumbencyFor(FL20, ROWS);
  if (m.incumbencyLine(inc, "FL-DOE-9") !== null || m.incumbencyLine(inc, "toString") !== null) {
    problems.push("a candidate the race did not compute gets no line");
  }
  if (m.incumbencyLine(null, "FL-DOE-1") !== null) problems.push("no race value, no line");
  const gov = linesFor(m, { race_id: "FL-GOV-general" }, ROWS.map((r) => ({ ...r, is_incumbent: false })));
  if (gov.some((l) => l !== "Holds this office now: No")) problems.push(`an open office reads No on every card: ${JSON.stringify(gov)}`);
  return problems;
}

const real = SHOW_INCUMBENT_CHIP
  ? flagOnProblems({ incumbencyFor, incumbencyLine })
  : flagOffProblems({ incumbencyFor, incumbencyLine });
check(`incumbencyFor with the flag as shipped (${SHOW_INCUMBENT_CHIP})`, real.length === 0, real.join("; "));
const on = flagOnProblems(await flagOn());
check("with the flag true: all or none per race, one label, Yes and No from one template", on.length === 0, on.join("; "));

const helper = stripComments(read(MODULE));
check(
  "incumbencyFor returns null first thing while the flag is false, and is_incumbent is read once",
  /export function incumbencyFor\([^)]*\)[^{]*\{\s*if \(!SHOW_INCUMBENT_CHIP\) return null;/.test(helper) &&
    (helper.match(/\.is_incumbent\b/g) ?? []).length === 1,
);

/* 3. The line component. */
const LINES = "src/components/features/RosterLines.tsx";
function lineComponentProblems(code: string): string[] {
  const c = stripComments(code);
  const start = c.indexOf("export function IncumbencyLine");
  const next = c.indexOf("export function", start + 1);
  const body = start < 0 ? "" : c.slice(start, next < 0 ? undefined : next);
  const problems: string[] = [];
  if (!/const text = incumbencyLine\(incumbency, candidateId\);\s*return text \? <p className="text-caption text-on-surface-muted">\{text\}<\/p> : null;/.test(body)) {
    problems.push("IncumbencyLine must print incumbencyLine(incumbency, candidateId) in one fixed <p>");
  }
  if ((body.match(/<p\b/g) ?? []).length !== 1) problems.push("IncumbencyLine has exactly one element");
  if (/\b(Yes|No|byCandidate)\b/.test(body)) problems.push("IncumbencyLine must not look at the value: Yes and No get the same markup");
  return problems;
}
const lineComponent = lineComponentProblems(read(LINES));
check(`${LINES} prints the line in one fixed element, the same for Yes and No`, lineComponent.length === 0, lineComponent.join("; "));

/* 4. The three cards, and who computes the race value. */
const CARDS = [
  "src/components/features/CandidateBrief.tsx",
  "src/components/features/RaceListing.tsx",
  "src/components/features/RaceCompare.tsx",
];
const USE = "<IncumbencyLine incumbency={incumbency} candidateId={candidate.candidate_id} />";
function cardProblems(code: string): string[] {
  const c = stripComments(code);
  const problems: string[] = [];
  const exact = c.split(USE).length - 1;
  const all = (c.match(/<IncumbencyLine\b/g) ?? []).length;
  if (exact !== 1 || all !== 1) problems.push(`renders ${USE} ${exact} time(s), <IncumbencyLine> ${all} in all; want exactly once`);
  if (/(&&|\?|:)\s*\(?\s*<IncumbencyLine\b/.test(c)) problems.push("<IncumbencyLine> sits behind a condition");
  if (!/import\s*\{[^}]*\bIncumbencyLine\b[^}]*\}\s*from\s*["']@\/components\/features\/RosterLines["']/.test(c)) {
    problems.push("must import IncumbencyLine from @/components/features/RosterLines");
  }
  if (/\bincumbencyFor\s*\(/.test(c)) problems.push("a card must take the race value as a prop, not compute it");
  return problems;
}
for (const file of CARDS) {
  const problems = cardProblems(read(file));
  check(`${file} renders the line once, from the race value`, problems.length === 0, problems.join("; "));
}

const PAGES = new Set([
  "src/app/(public)/races/[raceId]/page.tsx",
  "src/app/(public)/candidates/[candidateId]/page.tsx",
]);
const SRC = new Map(sourceFiles("src").map((f) => [f, read(f)] as const));
function callerProblems(files: ReadonlyMap<string, string>): string[] {
  const problems: string[] = [];
  for (const [file, text] of files) {
    if (file === MODULE) continue;
    const calls = /\bincumbencyFor\s*\(/.test(stripComments(text));
    if (calls && !PAGES.has(file)) problems.push(`${file} calls incumbencyFor`);
    if (!calls && PAGES.has(file)) problems.push(`${file} must compute the race's incumbency line`);
  }
  return problems;
}
const callers = callerProblems(SRC);
check("only the race page and the candidate page call incumbencyFor", callers.length === 0, callers.join("; "));

/* 5. No other reader. */
const ALLOWED = new Set([MODULE, "src/types/schema.ts"]);
const COLUMN = /\b(is_incumbent|incumbent_id|is_open_seat|incumbency_source|incumbency_verified_at)\b/;
const WORD = /\bincumbent\b/i;
function readerProblems(files: ReadonlyMap<string, string>): string[] {
  const problems: string[] = [];
  for (const [file, text] of files) {
    if (ALLOWED.has(file)) continue;
    const code = stripComments(text);
    const column = code.match(COLUMN);
    if (column) problems.push(`${file} reads ${column[1]}`);
    const word = code.match(WORD);
    if (word) problems.push(`${file} prints "${word[0]}"`);
  }
  return problems;
}
const readers = readerProblems(SRC);
check(`no other file in src/ reads incumbency or prints it (${SRC.size - ALLOWED.size} files)`, readers.length === 0, readers.join("; "));

/* 6. Mutations. */
await mutation("the all-or-none test deleted (an unsourced candidate reads No)", async () =>
  flagOnProblems(await flagOn([["  if (!candidates.every((c) => Boolean(c.incumbency_verified_at))) return null;\n", ""]])),
);
await mutation("the line rendered only when true", async () =>
  flagOnProblems(
    await flagOn([
      [
        "if (!incumbency || !Object.hasOwn(incumbency.byCandidate, candidateId)) return null;",
        "if (!incumbency || !incumbency.byCandidate[candidateId]) return null;",
      ],
    ]),
  ),
);
await mutation("the flag no longer gates the line", async () =>
  flagOffProblems(await importVariant<Module>(MODULE, [[FLAG, "export const SHOW_INCUMBENT_CHIP: boolean = false;"], ["  if (!SHOW_INCUMBENT_CHIP) return null;\n", ""]])),
);
await mutation('a House race labelled "Holds this seat now"', async () => {
  const m = await importVariant<Module>(MODULE, [['[/^FL-\\d+-general$/, "Member of the U.S. House now"]', '[/^FL-\\d+-general$/, "Holds this seat now"]']]);
  return labelProblems(m.incumbencyLabel);
});
await mutation("the line component styles Yes differently", () =>
  lineComponentProblems(
    edit(
      read(LINES),
      'const text = incumbencyLine(incumbency, candidateId);\n  return text ? <p className="text-caption text-on-surface-muted">{text}</p> : null;',
      'const text = incumbencyLine(incumbency, candidateId);\n  return text ? <p className={text.endsWith("Yes") ? "font-bold" : "text-caption"}>{text}</p> : null;',
    ),
  ),
);
await mutation("a card shows the line only for the incumbent", () =>
  cardProblems(edit(read(CARDS[2]), USE, `{candidate.is_incumbent && ${USE}}`)),
);
await mutation("a card drops the line", () => cardProblems(edit(read(CARDS[1]), USE, "")));
await mutation("the old chip comes back", () => {
  const copy = new Map(SRC);
  copy.set(CARDS[0], edit(read(CARDS[0]), USE, `${USE}<Chip>Incumbent</Chip>`));
  return readerProblems(copy);
});
await mutation("a loader reads is_open_seat", () => {
  const copy = new Map(SRC);
  copy.set("src/lib/listing.ts", `${read("src/lib/listing.ts")}\nexport const open = (r: { is_open_seat: boolean }) => r.is_open_seat;\n`);
  return readerProblems(copy);
});
await mutation("a page stops computing the race value", () => {
  const copy = new Map(SRC);
  const page = "src/app/(public)/candidates/[candidateId]/page.tsx";
  copy.set(page, read(page).split("incumbencyFor(").join("noIncumbency("));
  return callerProblems(copy);
});

done();
```

- [ ] **Step 4: Run it to see it fail**

Run: `"$NODE" scripts/verify-incumbent-chip.ts`
Expected: a crash, `SyntaxError: The requested module '../src/lib/incumbency.ts' does not provide an export named ...`, naming one of the new functions.

- [ ] **Step 5: Rewrite `incumbency.ts`**

Replace the whole of `src/lib/incumbency.ts` with:

```ts
/* The incumbency line on candidate cards (spec
   docs/superpowers/specs/2026-10-08-roster-completeness-design.md §3.1,
   §3.5 and §3.11; D1 to D3, each Recommended pending founder confirmation).
   The only place in src/ that reads candidate.is_incumbent or the
   incumbency columns 0049 adds.

   What a voter sees once SHOW_INCUMBENT_CHIP is true: one line under the
   party chip on every card in a race, "<label>: Yes" or "<label>: No", as
   plain caption text (IncumbencyLine, src/components/features/RosterLines.tsx).
   The label is the same on every card in the race; only the value differs,
   as the name does. It replaces the "Incumbent" chip, which only an
   incumbent got: a label some candidates get and others do not is what the
   house rule forbids, so a chip shown only when true is not offered (D2).

   Each label states a fact that is true of the person beside it (D1). A
   member of a body counts whatever seat they hold, so on FL-20, where
   Wasserman Schultz holds District 25 under the map she was elected on, the
   line says she is a member of the U.S. House, never that she holds
   District 20. "Holds this office now" is used only for an office one
   person holds.

   All or none per race: incumbencyFor returns the line only when every
   ballot candidate in the race has incumbency_verified_at (0049). A
   candidate added later without a source hides the line for the whole race
   instead of reading "No", because before 0049 false only meant "unknown"
   (0031:41-43, 0038).

   Computed at render, on the rows the cached loaders return (the race page
   and the candidate page call incumbencyFor), so a change here, the flip
   included, takes effect on the deploy that ships it (§3.9).
   race.incumbent_id and race.is_open_seat stay unread in src/: the line
   carries the fact a voter needs (D4).

   ------------------------------------------------------------------------
   TO FLIP (set SHOW_INCUMBENT_CHIP to true) only when every one of these
   holds, with the query output pasted into the flip PR (spec §3.11):
   1. 0049_roster_completeness is applied live and its DO block passed.
   2. Every ballot candidate carries a source. Must return 0:
        SELECT count(*) FROM candidate c
         WHERE c.ballot_status = 'ballot'
           AND EXISTS (SELECT 1 FROM race r WHERE c.candidate_id = ANY (r.candidate_ids))
           AND c.incumbency_verified_at IS NULL;
   3. Every race agrees with its candidates. Must return no rows:
        SELECT r.race_id
          FROM race r
          CROSS JOIN LATERAL (
            SELECT count(*) FILTER (WHERE c.is_incumbent)                         AS n_inc,
                   max(c.candidate_id) FILTER (WHERE c.is_incumbent)              AS one_inc,
                   coalesce(bool_or(c.is_incumbent AND c.candidate_id = r.incumbent_id), false) AS named_ok
              FROM candidate c
             WHERE c.candidate_id = ANY (r.candidate_ids) AND c.ballot_status = 'ballot') s
         WHERE r.is_open_seat <> (r.incumbent_id IS NULL)
            OR (r.incumbent_id IS NOT NULL AND NOT s.named_ok)
            OR (s.n_inc = 1 AND r.incumbent_id IS DISTINCT FROM s.one_inc);
   4. node scripts/verify-incumbent-chip.ts passes, including the label
      check over the 53 production race ids.
   5. The display is merged and deployed with the flag still false, and its
      live check is done.
   6. The founder says yes by Thu 10-15 (D3), and the flip PR is merged and
      deployed by Fri 10-16 18:00 EDT. If any of these misses, the flag stays
      false through Nov 3.
   The flip PR sets the constant, changes the one expectation in
   scripts/verify-incumbent-chip.ts that pins it, and adds the methodology
   paragraph (§3.5). A wrong value anywhere is handled the other way round
   (§3.10): one line setting it back to false hides the line on every race
   at once and writes nothing; under D3 it then stays off through Nov 3.
   ------------------------------------------------------------------------ */
export const SHOW_INCUMBENT_CHIP: boolean = false;

/* The label table (§3.5), keyed on race_id, first match wins. A race_id no
   row matches gets no label, and its race shows no line. */
const LABELS: ReadonlyArray<readonly [RegExp, string]> = [
  [/^FL-\d+-general$/, "Member of the U.S. House now"],
  [/^FL-SEN-general$/, "Member of the U.S. Senate now"],
  [/^FL-(GOV|ATG|CFO|AGR|ORA-MAYOR|ORA-CLERK)-general$/, "Holds this office now"],
  [/^FL-BRO-CC[A-Z0-9]*-general$/, "Member of the Broward County Commission now"],
  [/^FL-DAD-CC[A-Z0-9]*-general$/, "Member of the Miami-Dade County Commission now"],
  [/^FL-HIL-CC[A-Z0-9]*-general$/, "Member of the Hillsborough County Commission now"],
  [/^FL-ORA-CC[A-Z0-9]*-general$/, "Member of the Orange County Commission now"],
  [/^FL-BRO-SB[A-Z0-9]*-general$/, "Member of the Broward County School Board now"],
  [/^FL-DAD-SB[A-Z0-9]*-general$/, "Member of the Miami-Dade County School Board now"],
  [/^FL-HIL-SB[A-Z0-9]*-general$/, "Member of the Hillsborough County School Board now"],
  [/^FL-ORA-SB[A-Z0-9]*-general$/, "Member of the Orange County School Board now"],
];

export function incumbencyLabel(raceId: string): string | null {
  for (const [pattern, label] of LABELS) if (pattern.test(raceId)) return label;
  return null;
}

/** One race's line: the label every card in it shows, and each ballot
    candidate's value, true for Yes and false for No. */
export interface Incumbency {
  label: string;
  byCandidate: Readonly<Record<string, boolean>>;
}

/** The fields incumbencyFor reads. incumbency_verified_at is optional
    because a row read before 0049 was applied has no such field, and
    missing means "not set". */
export interface IncumbencyRow {
  candidate_id: string;
  is_incumbent: boolean;
  incumbency_verified_at?: string | null;
}

/** The race's line, or null when no card in it shows one: the flag is off,
    the race has no label or no candidates, or any candidate lacks a source. */
export function incumbencyFor(
  race: { race_id: string },
  candidates: readonly IncumbencyRow[]
): Incumbency | null {
  if (!SHOW_INCUMBENT_CHIP) return null;
  const label = incumbencyLabel(race.race_id);
  if (!label || candidates.length === 0) return null;
  if (!candidates.every((c) => Boolean(c.incumbency_verified_at))) return null;
  const byCandidate: Record<string, boolean> = {};
  for (const c of candidates) byCandidate[c.candidate_id] = c.is_incumbent === true;
  return { label, byCandidate };
}

/** One card's text, "<label>: Yes" or "<label>: No" from one template, or
    null when its race shows no line. */
export function incumbencyLine(
  incumbency: Incumbency | null,
  candidateId: string
): string | null {
  if (!incumbency || !Object.hasOwn(incumbency.byCandidate, candidateId)) return null;
  return `${incumbency.label}: ${incumbency.byCandidate[candidateId] ? "Yes" : "No"}`;
}
```

In `src/types/schema.ts`:

Find:
```ts
  fec_id: string | null;
  /* 0049_roster_completeness (spec 2026-10-08-roster-completeness §3.2):
     the Governor ticket's running mate
```
Replace with:
```ts
  fec_id: string | null;
  /* 0049_roster_completeness (spec 2026-10-08-roster-completeness §3.2):
     the URL that decides is_incumbent and the date it was first read. Both
     null means "unknown", which is all a false meant before 0049. Read only
     through src/lib/incumbency.ts. */
  incumbency_source: string | null;
  incumbency_verified_at: string | null;
  /* 0049_roster_completeness (spec 2026-10-08-roster-completeness §3.2):
     the Governor ticket's running mate
```

- [ ] **Step 6: Add `IncumbencyLine`**

In `src/components/features/RosterLines.tsx`:

Find:
```tsx
import { runningMateLine, type RunningMates } from "@/lib/running-mate";
```
Replace with:
```tsx
import { incumbencyLine, type Incumbency } from "@/lib/incumbency";
import { runningMateLine, type RunningMates } from "@/lib/running-mate";
```

Append at the end of the file:
```tsx

/** "<label>: Yes" or "<label>: No", under the party chip, on every card in a
    race or none (incumbency.ts). One template for both values, so a Yes and
    a No differ only in that word. */
export function IncumbencyLine({
  incumbency,
  candidateId,
}: {
  incumbency: Incumbency | null;
  candidateId: string;
}) {
  const text = incumbencyLine(incumbency, candidateId);
  return text ? <p className="text-caption text-on-surface-muted">{text}</p> : null;
}
```

- [ ] **Step 7: Replace the chip on `CandidateBrief`**

In `src/components/features/CandidateBrief.tsx`:

Find (and delete):
```tsx
import { Chip } from "@/components/ui/Chip";
```

Find:
```tsx
import { RunningMateLine } from "@/components/features/RosterLines";
```
Replace with:
```tsx
import { IncumbencyLine, RunningMateLine } from "@/components/features/RosterLines";
```

Find:
```tsx
import { showIncumbentChip } from "@/lib/incumbency";
```
Replace with:
```tsx
import type { Incumbency } from "@/lib/incumbency";
```

Find:
```tsx
   That is why the Incumbent chip goes through showIncumbentChip and is off
   for everyone for now: is_incumbent is filled for one ballot candidate in
   106, so the chip marked one incumbent and left the rest looking like
   challengers (src/lib/incumbency.ts, recommended pending founder
   confirmation, says what must be true before it comes back).
```
Replace with:
```tsx
   That is why the header has no chip that only some candidates get. The
   incumbency line and the running-mate line (RosterLines) take one value
   computed for the whole race, so every card in the race shows the line or
   none does (src/lib/incumbency.ts and src/lib/running-mate.ts, recommended
   pending founder confirmation).
```

Find:
```tsx
  runningMates,
}: {
  data: CandidateBriefData;
  headingLevel?: "h2" | "h3";
  linkToDetail?: boolean;
```
Replace with:
```tsx
  incumbency,
  runningMates,
}: {
  data: CandidateBriefData;
  headingLevel?: "h2" | "h3";
  linkToDetail?: boolean;
  /** The race's incumbency line (incumbencyFor), computed once per race by
      the page: every card shows it, or none does. */
  incumbency: Incumbency | null;
```

Find:
```tsx
          <PartyChip party={candidate.party} />
          {showIncumbentChip(candidate) && <Chip>Incumbent</Chip>}
          <SaveToggle
            candidateId={candidate.candidate_id}
            name={candidate.legal_name}
          />
        </div>
```
Replace with:
```tsx
          <PartyChip party={candidate.party} />
          <SaveToggle
            candidateId={candidate.candidate_id}
            name={candidate.legal_name}
          />
        </div>
        <IncumbencyLine incumbency={incumbency} candidateId={candidate.candidate_id} />
```

- [ ] **Step 8: Replace the chip on `ListedCandidateCard`**

In `src/components/features/RaceListing.tsx`:

Find (and delete):
```tsx
import { Chip } from "@/components/ui/Chip";
```

Find:
```tsx
import { RunningMateLine } from "@/components/features/RosterLines";
```
Replace with:
```tsx
import { IncumbencyLine, RunningMateLine } from "@/components/features/RosterLines";
```

Find:
```tsx
import { showIncumbentChip } from "@/lib/incumbency";
```
Replace with:
```tsx
import type { Incumbency } from "@/lib/incumbency";
```

Find:
```tsx
   That includes the Incumbent chip's gate, showIncumbentChip, which is off
   for every candidate until incumbency is filled for all of them
   (src/lib/incumbency.ts), and the accessibility fixes from
```
Replace with:
```tsx
   That includes the two race-level lines (RosterLines: incumbency and
   running mate), which every card in a race shows or none does
   (src/lib/incumbency.ts, src/lib/running-mate.ts), and the accessibility
   fixes from
```

Find:
```tsx
  runningMates,
}: {
  data: ListedCandidate;
  status: RaceListingData["status"];
  headingLevel?: "h1" | "h2" | "h3";
  linkToDetail?: boolean;
```
Replace with:
```tsx
  incumbency,
  runningMates,
}: {
  data: ListedCandidate;
  status: RaceListingData["status"];
  headingLevel?: "h1" | "h2" | "h3";
  linkToDetail?: boolean;
  /** The race's incumbency line (incumbencyFor), computed once per race. */
  incumbency: Incumbency | null;
```

Find:
```tsx
          <PartyChip party={candidate.party} />
          {showIncumbentChip(candidate) && <Chip>Incumbent</Chip>}
          <SaveToggle
            candidateId={candidate.candidate_id}
            name={candidate.legal_name}
          />
        </div>
```
Replace with:
```tsx
          <PartyChip party={candidate.party} />
          <SaveToggle
            candidateId={candidate.candidate_id}
            name={candidate.legal_name}
          />
        </div>
        <IncumbencyLine incumbency={incumbency} candidateId={candidate.candidate_id} />
```

Find:
```tsx
export function RaceListing({
  listing,
  runningMates,
}: {
  listing: RaceListingData;
  runningMates: RunningMates | null;
}) {
```
Replace with:
```tsx
export function RaceListing({
  listing,
  incumbency,
  runningMates,
}: {
  listing: RaceListingData;
  incumbency: Incumbency | null;
  runningMates: RunningMates | null;
}) {
```

Find:
```tsx
          status={listing.status}
          runningMates={runningMates}
        />
```
Replace with:
```tsx
          status={listing.status}
          incumbency={incumbency}
          runningMates={runningMates}
        />
```

- [ ] **Step 9: Pass it through `CandidateListing`**

In `src/components/features/CandidateListing.tsx`:

Find:
```tsx
import type { RunningMates } from "@/lib/running-mate";
```
Replace with:
```tsx
import type { Incumbency } from "@/lib/incumbency";
import type { RunningMates } from "@/lib/running-mate";
```

Find:
```tsx
  listing,
  runningMates,
}: {
  listing: CandidateListingData;
```
Replace with:
```tsx
  listing,
  incumbency,
  runningMates,
}: {
  listing: CandidateListingData;
  /** The race's incumbency line, from the same rows the race page uses. */
  incumbency: Incumbency | null;
```

Find:
```tsx
        status={listing.status}
        runningMates={runningMates}
```
Replace with:
```tsx
        status={listing.status}
        incumbency={incumbency}
        runningMates={runningMates}
```

- [ ] **Step 10: Replace the chip on the `RaceCompare` roster card**

In `src/components/features/RaceCompare.tsx`:

Find (and delete):
```tsx
import { Chip } from "@/components/ui/Chip";
```

Find:
```tsx
import { RunningMateLine } from "@/components/features/RosterLines";
```
Replace with:
```tsx
import { IncumbencyLine, RunningMateLine } from "@/components/features/RosterLines";
```

Find:
```tsx
import { showIncumbentChip } from "@/lib/incumbency";
```
Replace with:
```tsx
import type { Incumbency } from "@/lib/incumbency";
```

Find:
```tsx
   render brief.candidates.map(c => <CandidateBrief data={c} />) in the old
   grid (git history of this file, before 2026-10-05). */
```
Replace with:
```tsx
   render brief.candidates.map(c => <CandidateBrief data={c}
   incumbency={incumbency} runningMates={runningMates} />) in the old grid
   (git history of this file, before 2026-10-05). */
```

Find:
```tsx
export function RaceCompare({
  brief,
  runningMates,
}: {
  brief: RaceBrief;
```
Replace with:
```tsx
export function RaceCompare({
  brief,
  incumbency,
  runningMates,
}: {
  brief: RaceBrief;
  /** The race's incumbency line (incumbencyFor), computed once per race by
      the page: every roster card shows it, or none does. */
  incumbency: Incumbency | null;
```

Find:
```tsx
                <PartyChip party={candidate.party} />
                {showIncumbentChip(candidate) && <Chip>Incumbent</Chip>}
                <SaveToggle
                  candidateId={candidate.candidate_id}
                  name={candidate.legal_name}
                />
              </div>
```
Replace with:
```tsx
                <PartyChip party={candidate.party} />
                <SaveToggle
                  candidateId={candidate.candidate_id}
                  name={candidate.legal_name}
                />
              </div>
              <IncumbencyLine incumbency={incumbency} candidateId={candidate.candidate_id} />
```

- [ ] **Step 11: Compute the race value on both pages**

In `src/app/(public)/races/[raceId]/page.tsx`:

Find:
```tsx
import { runningMatesFor } from "@/lib/running-mate";
```
Replace with:
```tsx
import { incumbencyFor } from "@/lib/incumbency";
import { runningMatesFor } from "@/lib/running-mate";
```

Find:
```tsx
      <RaceCompare brief={brief} runningMates={runningMatesFor(raceCandidates)} />
```
Replace with:
```tsx
      <RaceCompare
        brief={brief}
        incumbency={incumbencyFor(brief.race, raceCandidates)}
        runningMates={runningMatesFor(raceCandidates)}
      />
```

Find:
```tsx
      <RaceListing listing={listing} runningMates={runningMatesFor(raceCandidates)} />
```
Replace with:
```tsx
      <RaceListing
        listing={listing}
        incumbency={incumbencyFor(listing.race, raceCandidates)}
        runningMates={runningMatesFor(raceCandidates)}
      />
```

In `src/app/(public)/candidates/[candidateId]/page.tsx`:

Find:
```tsx
import { officeTitle } from "@/lib/office-title";
```
Replace with:
```tsx
import { incumbencyFor, type Incumbency } from "@/lib/incumbency";
import { officeTitle } from "@/lib/office-title";
```

Find:
```tsx
  settled: string | null;
  runningMates: RunningMates | null;
}> {
```
Replace with:
```tsx
  settled: string | null;
  incumbency: Incumbency | null;
  runningMates: RunningMates | null;
}> {
```

Find:
```tsx
    settled,
    runningMates: runningMatesFor(raceCandidates),
```
Replace with:
```tsx
    settled,
    incumbency: race ? incumbencyFor(race, raceCandidates) : null,
    runningMates: runningMatesFor(raceCandidates),
```

Find:
```tsx
      const { office, runningMates } = await runningFor(listing.raceId, listing.office);
```
Replace with:
```tsx
      const { office, incumbency, runningMates } = await runningFor(listing.raceId, listing.office);
```

Find:
```tsx
            listing={{ ...listing, office }}
            runningMates={runningMates}
```
Replace with:
```tsx
            listing={{ ...listing, office }}
            incumbency={incumbency}
            runningMates={runningMates}
```

Find:
```tsx
  const { office, settled, runningMates } = await runningFor(detail.raceId, detail.office);
```
Replace with:
```tsx
  const { office, settled, incumbency, runningMates } = await runningFor(detail.raceId, detail.office);
```

Find:
```tsx
        linkToDetail={false}
        runningMates={runningMates}
```
Replace with:
```tsx
        linkToDetail={false}
        incumbency={incumbency}
        runningMates={runningMates}
```

- [ ] **Step 12: Run the tests to see them pass**

Run:
```bash
"$NODE" scripts/verify-incumbent-chip.ts 2>&1 | tail -3
for s in verify-running-mate verify-campaign-website verify-office-title verify-roster-worksheet; do "$NODE" scripts/$s.ts >/dev/null 2>&1; echo "$s exit $?"; done
grep -rn "showIncumbentChip\|<Chip>Incumbent" src || echo "no chip left"
"$NODE" node_modules/typescript/bin/tsc --noEmit
"$NODE" node_modules/typescript/bin/tsc --noEmit --strict --erasableSyntaxOnly --target es2022 --module esnext --moduleResolution bundler --allowImportingTsExtensions --skipLibCheck --types node scripts/source-checks.ts scripts/verify-incumbent-chip.ts
"$NODE" node_modules/eslint/bin/eslint.js scripts/verify-incumbent-chip.ts src/lib/incumbency.ts src/components/features/RosterLines.tsx src/components/features/CandidateBrief.tsx src/components/features/RaceListing.tsx src/components/features/RaceCompare.tsx src/components/features/CandidateListing.tsx "src/app/(public)/races/[raceId]/page.tsx" "src/app/(public)/candidates/[candidateId]/page.tsx" src/types/schema.ts
```
Expected: `SHOW_INCUMBENT_CHIP is false`, then `All incumbent-chip checks passed.` (23 `ok` lines, 10 of them mutations); the four scripts `exit 0`; `no chip left`; `tsc` and `eslint` print nothing.

- [ ] **Step 13: Commit**

```bash
git add scripts/fixtures/roster/race-labels-2026-10-08.json scripts/verify-incumbent-chip.ts src/lib/incumbency.ts src/types/schema.ts src/components/features/RosterLines.tsx src/components/features/CandidateBrief.tsx src/components/features/RaceListing.tsx src/components/features/RaceCompare.tsx src/components/features/CandidateListing.tsx "src/app/(public)/races/[raceId]/page.tsx" "src/app/(public)/candidates/[candidateId]/page.tsx"
git commit -F - <<'EOF'
Incumbency line, all or none per race, behind SHOW_INCUMBENT_CHIP = false

"<label>: Yes" or "<label>: No" under the party chip replaces the Incumbent
chip on the three cards (spec 2026-10-08-roster-completeness §3.5, D1-D3,
recommended pending founder confirmation). The label comes from a fixed
table keyed on race_id and is true of everyone beside it: a member of a
body counts whatever seat they hold. incumbencyFor shows the line only when
the flag is on, the race has a label and every candidate has a source, and
the pages compute it once per race at render. The flag stays false, so no
voter sees it; the TO FLIP comment is spec §3.11's gate.
verify-incumbent-chip.ts pins the flag, maps the 53 production race ids to
their labels, tests the flag-on behaviour on a copy of the module, checks
the cards and that nothing else reads the incumbency columns, with
mutations.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 4: Move the cache keys (§3.9)

**Files:**
- Modify: `src/lib/briefs.ts:251-262` and `:307-313`, `src/lib/listing.ts:13-18`, `:144-153` and `:211-216`, `scripts/verify-ballot-order.ts:660-669`

**Interfaces:**
- Produces: cache keys `["race-brief", "v3", raceId]`, `["race-listing", "v3", raceId]`, `["candidate-detail", "v2", candidateId]`, `["candidate-listing", "v2", candidateId]`. Tags and `revalidate` unchanged.

- [ ] **Step 1: Write the failing test**

In `scripts/verify-ballot-order.ts`:

Find:
```ts
/* Caches that hold candidate order were re-keyed, so production stops
   serving an older deploy's order the moment this one ships. */
check(
  "getRaceBrief cache key is v2",
  src("src/lib/briefs.ts").includes('["race-brief", "v2", raceId]')
);
check(
  "getRaceListing cache key is v2",
  src("src/lib/listing.ts").includes('["race-listing", "v2", raceId]')
);
```
Replace with:
```ts
/* Caches that hold candidate order were re-keyed, so production stops
   serving an older deploy's order the moment this one ships. v2 was the
   ballot-order bump. v3 for the race loaders, and v2 for the two candidate
   loaders, is roster-completeness spec §3.9: an entry cached before 0049 was
   applied lacks its five columns, so a page built by the new deploy would
   show no running-mate line for up to an hour. */
check(
  "getRaceBrief cache key is v3",
  src("src/lib/briefs.ts").includes('["race-brief", "v3", raceId]')
);
check(
  "getRaceListing cache key is v3",
  src("src/lib/listing.ts").includes('["race-listing", "v3", raceId]')
);
check(
  "getCandidateDetail cache key is v2",
  src("src/lib/briefs.ts").includes('["candidate-detail", "v2", candidateId]')
);
check(
  "getCandidateListing cache key is v2",
  src("src/lib/listing.ts").includes('["candidate-listing", "v2", candidateId]')
);
```

- [ ] **Step 2: Run it to see it fail**

Run: `"$NODE" scripts/verify-ballot-order.ts 2>&1 | grep -E "FAIL|failed"`
Expected:
```
FAIL  getRaceBrief cache key is v3
FAIL  getRaceListing cache key is v3
FAIL  getCandidateDetail cache key is v2
FAIL  getCandidateListing cache key is v2
4 check(s) failed.
```

- [ ] **Step 3: Move the keys**

In `src/lib/briefs.ts`:

Find:
```ts
   hour after this one ships. */
export function getRaceBrief(raceId: string) {
  return unstable_cache(
    () => fetchRaceBrief(raceId),
    ["race-brief", "v2", raceId],
```
Replace with:
```ts
   hour after this one ships.

   v3: candidate rows carry 0049's five columns (incumbency and running
   mate, roster-completeness spec §3.9). An entry cached before 0049 was
   applied lacks them, and the running-mate line would stay hidden for up
   to an hour after this deploy. Missing fields read as "not set", so the
   worst case was a line hidden, never a wrong one. */
export function getRaceBrief(raceId: string) {
  return unstable_cache(
    () => fetchRaceBrief(raceId),
    ["race-brief", "v3", raceId],
```

Find:
```ts
export function getCandidateDetail(candidateId: string) {
  return unstable_cache(
    () => fetchCandidateDetail(candidateId),
    ["candidate-detail", candidateId],
```
Replace with:
```ts
/* v2 for the same reason as getRaceBrief's v3 (0049's columns, spec §3.9). */
export function getCandidateDetail(candidateId: string) {
  return unstable_cache(
    () => fetchCandidateDetail(candidateId),
    ["candidate-detail", "v2", candidateId],
```

In `src/lib/listing.ts`:

Find:
```ts
   What a listing is: who is on the ballot for a race — legal name, party,
   incumbency (read, but not shown while src/lib/incumbency.ts keeps the
   chip off), official site, verified socials, and the DoE's qualifying
   status.
```
Replace with:
```ts
   What a listing is: who is on the ballot for a race — legal name, party,
   incumbency and running mate (shown only through src/lib/incumbency.ts and
   src/lib/running-mate.ts), campaign website, verified socials, and the
   DoE's qualifying status.
```

Find:
```ts
   ballot order (ballot-order.ts), and an older deploy's entry is not. */
export function getRaceListing(raceId: string) {
  return unstable_cache(
    () => fetchRaceListing(raceId),
    ["race-listing", "v2", raceId],
```
Replace with:
```ts
   ballot order (ballot-order.ts), and an older deploy's entry is not. v3
   with getRaceBrief's v3: candidate rows carry 0049's five columns
   (roster-completeness spec §3.9). */
export function getRaceListing(raceId: string) {
  return unstable_cache(
    () => fetchRaceListing(raceId),
    ["race-listing", "v3", raceId],
```

Find:
```ts
export function getCandidateListing(candidateId: string) {
  return unstable_cache(
    () => fetchCandidateListing(candidateId),
    ["candidate-listing", candidateId],
```
Replace with:
```ts
/* v2 with getRaceListing's v3 (0049's columns, spec §3.9). */
export function getCandidateListing(candidateId: string) {
  return unstable_cache(
    () => fetchCandidateListing(candidateId),
    ["candidate-listing", "v2", candidateId],
```

- [ ] **Step 4: Run the tests to see them pass**

Run:
```bash
"$NODE" scripts/verify-ballot-order.ts >/dev/null 2>&1; echo "verify-ballot-order exit $?"
grep -rn '"race-brief"\|"race-listing"\|"candidate-detail"\|"candidate-listing"' src
"$NODE" node_modules/typescript/bin/tsc --noEmit
"$NODE" node_modules/eslint/bin/eslint.js src/lib/briefs.ts src/lib/listing.ts scripts/verify-ballot-order.ts
```
Expected: `verify-ballot-order exit 0`; the grep shows exactly the four new keys (`briefs.ts` v3 and v2, `listing.ts` v3 and v2); `tsc` and `eslint` print nothing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/briefs.ts src/lib/listing.ts scripts/verify-ballot-order.ts
git commit -F - <<'EOF'
Cache keys: race-brief and race-listing v3, candidate loaders v2

An entry cached before 0049 was applied lacks the five new candidate
columns, so a page built by this deploy could reuse it and show no running-
mate line for up to an hour (spec 2026-10-08-roster-completeness §3.9).
New keys make the deploy read the filled rows at once. verify-ballot-order
pins the four keys.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 5: R5 drops a running mate who is already stored (§3.6)

**Files:**
- Modify: `src/lib/candidate-leads.ts:167` (new function before `buildLeads`), `scripts/candidate-leads.ts:1-13` (usage comment), `:22` (import), `:103` (new function before the `prep` branch), `:148-153` (`check`), `scripts/verify-candidate-leads.ts:9-24` (import) and the new block before `/* ---- the queue batch` (line 298)

**Interfaces:**
- Produces: `namesToCheck(rosterNames: readonly string[], storedRunningMates: readonly (string | null | undefined)[]): string[]` in `src/lib/candidate-leads.ts`; `storedRunningMates(db: SupabaseClient): Promise<string[]>` inside `scripts/candidate-leads.ts`.
- Consumes: `buildLeads(mentions, stories, rosterNames, existingKeys)` (`src/lib/candidate-leads.ts:171`), unchanged; the column `candidate.running_mate` (0049).

- [ ] **Step 1: Write the failing test**

In `scripts/verify-candidate-leads.ts`:

Find:
```ts
  mentionsRunningMate,
  normalizeName,
  planQueue,
```
Replace with:
```ts
  mentionsRunningMate,
  namesToCheck,
  normalizeName,
  planQueue,
```

Find:
```ts
/* ---- the queue batch ---------------------------------------------------- */
```
Replace with:
```ts
/* ---- stored running mates (roster-completeness spec §3.6) ----------------
   `check` compares mentions against R5's roster plus the running mates 0049
   stores, so a running mate we already list is dropped, not queued again. */

check("namesToCheck adds the stored running mates and skips blanks",
  JSON.stringify(namesToCheck(["Byron Donalds"], ["Bryan Avila", null, "", "   ", undefined]))
    === JSON.stringify(["Byron Donalds", "Bryan Avila"]),
  JSON.stringify(namesToCheck(["Byron Donalds"], ["Bryan Avila", null, "", "   ", undefined])));
const withMates = buildLeads(mentions, stories, namesToCheck(roster, ["Bryan Avila"]), new Set());
check("a running mate already stored is dropped as on_roster, with or without the accent",
  !withMates.leads.some((l) => l.kind === "running_mate")
    && JSON.stringify(withMates.dropped.filter((d) => d.reason === "on_roster").map((d) => d.name))
      === JSON.stringify(["Bryan Avila", "Bryan Ávila", "Byron Donalds"]),
  JSON.stringify(withMates.dropped));
check("with no stored running mates, the results are what they were",
  JSON.stringify(buildLeads(mentions, stories, namesToCheck(roster, []), new Set())) === JSON.stringify(built));
const replaced = buildLeads(mentions, stories, namesToCheck(roster, ["Someone Else"]), new Set());
check("a running mate who is not the one stored (a replacement) still becomes a lead",
  replaced.leads.filter((l) => l.kind === "running_mate").length === 1,
  JSON.stringify(replaced.leads.map((l) => l.dedupe_key)));

/* ---- the queue batch ---------------------------------------------------- */
```

- [ ] **Step 2: Run it to see it fail**

Run: `"$NODE" scripts/verify-candidate-leads.ts`
Expected: a crash, `SyntaxError: The requested module '../src/lib/candidate-leads.ts' does not provide an export named 'namesToCheck'`.

- [ ] **Step 3: Add `namesToCheck` and use it in `check`**

In `src/lib/candidate-leads.ts`:

Find:
```ts
/** Mentions in, leads out.
```
Replace with:
```ts
/** The names `check` compares mentions against: R5's roster (the
    published-race candidates, loadRoster) plus every running mate already
    stored on a Governor ballot row (0049; roster-completeness spec §3.6). A
    running mate we already list is then dropped as on_roster instead of
    queued; a different name (a replacement ticket) still becomes a lead.
    Blank values are skipped. */
export function namesToCheck(
  rosterNames: readonly string[],
  storedRunningMates: readonly (string | null | undefined)[],
): string[] {
  return [
    ...rosterNames,
    ...storedRunningMates.filter((n): n is string => typeof n === "string" && n.trim() !== ""),
  ];
}

/** Mentions in, leads out.
```

In `scripts/candidate-leads.ts`:

Find:
```ts
     check --stories FILE        mentions (the agent's reading) on stdin;
                                 print { leads, dropped }. Writes nothing.
```
Replace with:
```ts
     check --stories FILE        mentions (the agent's reading) on stdin;
                                 print { leads, dropped }. Compares against
                                 the roster and the stored running mates.
                                 Writes nothing.
```

Find:
```ts
import { buildLeads, keepForReading, mentionProblem, planQueue, type Mention, type StoryRef } from "../src/lib/candidate-leads.ts";
```
Replace with:
```ts
import { buildLeads, keepForReading, mentionProblem, namesToCheck, planQueue, type Mention, type StoryRef } from "../src/lib/candidate-leads.ts";
```

Find:
```ts
if (command === "prep") {
```
Replace with:
```ts
/** Running mates already stored on Governor ballot rows (0049). Read here,
    in the script, because src/lib/running-mate.ts is the only app file that
    reads the column (scripts/verify-running-mate.ts). Fails closed: before
    0049 is applied the column does not exist and `check` stops, which is why
    this change merges only after the migration is live (roster-completeness
    spec §3.6). */
async function storedRunningMates(db: SupabaseClient): Promise<string[]> {
  const { data, error } = await db
    .from("candidate")
    .select("running_mate")
    .eq("ballot_status", "ballot")
    .not("running_mate", "is", null);
  if (error) die(`could not read stored running mates: ${error.message}`);
  return ((data ?? []) as { running_mate: string | null }[]).flatMap((r) => (r.running_mate ? [r.running_mate] : []));
}

if (command === "prep") {
```

Find:
```ts
  const result = buildLeads(
    mentions,
    stories,
    roster.map((r) => r.legalName),
    await existingLeadKeys(db),
  );
```
Replace with:
```ts
  const result = buildLeads(
    mentions,
    stories,
    namesToCheck(roster.map((r) => r.legalName), await storedRunningMates(db)),
    await existingLeadKeys(db),
  );
```

- [ ] **Step 4: Run the tests to see them pass (offline only)**

Run:
```bash
"$NODE" scripts/verify-candidate-leads.ts 2>&1 | tail -1
"$NODE" scripts/verify-running-mate.ts >/dev/null 2>&1; echo "verify-running-mate exit $?"
"$NODE" node_modules/typescript/bin/tsc --noEmit
"$NODE" node_modules/typescript/bin/tsc --noEmit --strict --erasableSyntaxOnly --target es2022 --module esnext --moduleResolution bundler --allowImportingTsExtensions --skipLibCheck --types node scripts/candidate-leads.ts scripts/verify-candidate-leads.ts
"$NODE" node_modules/eslint/bin/eslint.js src/lib/candidate-leads.ts scripts/candidate-leads.ts scripts/verify-candidate-leads.ts
```
Expected: `verify-candidate-leads: OK — counties, names, kinds, merge, roster, dedupe and the queue batch hold`; `verify-running-mate exit 0` (the new helper takes names, not the column, so `running-mate.ts` is still the only reader in `src/`); `tsc` and `eslint` print nothing. Do not run `candidate-leads.ts check` or `queue`: both read production, and `queue` writes it.

- [ ] **Step 5: Commit**

```bash
git add src/lib/candidate-leads.ts scripts/candidate-leads.ts scripts/verify-candidate-leads.ts
git commit -F - <<'EOF'
R5 check: a running mate already stored is on the roster

candidate-leads.ts check now compares mentions against R5's roster plus the
running mates 0049 stores on Governor ballot rows, so a stored running mate
is dropped as on_roster instead of queued; a different name (a replacement)
still becomes a lead (spec 2026-10-08-roster-completeness §3.6). The news
matcher's roster is unchanged. The read fails closed before 0049 is
applied, so this merges only after the live apply.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 6: Full verification, the built pages, and the pull request

**Files:** none changed, unless a check fails.

- [ ] **Step 1: Run every check**

Run:
```bash
"$NODE" scripts/verify-all.mjs 2>&1 | tail -1
"$NODE" node_modules/typescript/bin/tsc --noEmit
"$NODE" node_modules/typescript/bin/tsc --noEmit --strict --erasableSyntaxOnly --target es2022 --module esnext --moduleResolution bundler --allowImportingTsExtensions --skipLibCheck --types node scripts/source-checks.ts scripts/verify-campaign-website.ts scripts/verify-running-mate.ts scripts/verify-incumbent-chip.ts scripts/verify-office-title.ts scripts/verify-ballot-order.ts scripts/candidate-leads.ts scripts/verify-candidate-leads.ts scripts/roster-reads-lib.ts scripts/roster-reads.ts scripts/roster-worksheet.ts scripts/verify-roster-worksheet.ts
git diff -z --name-only claude/roster-completeness...HEAD -- '*.ts' '*.tsx' | xargs -0 "$NODE" node_modules/eslint/bin/eslint.js
PATH="$NODEDIR:$PATH" "$NODE" node_modules/next/dist/bin/next build 2>&1 | tail -5
```
Expected: `verify-all: 71 passed (1 offline only), 1 failed, 2 skipped (needs env), 74 total` (two more scripts than the baseline, `verify-campaign-website.ts` and `verify-running-mate.ts`; the one failure is the known live-data `verify-news-neutrality.ts`; report any other failure); both `tsc` runs and `eslint` print nothing; `next build` ends with the route table and no error. `next build` prerenders every race page with read-only anon reads of production.

- [ ] **Step 2: Check the built pages**

The build prerenders the race pages from production. 0049 is not live yet, so no running-mate line can show, and the flag is off, so no incumbency line shows.

Run:
```bash
cd .next/server/app/races
for r in FL-GOV-general FL-20-general FL-26-general FL-BRO-CC2-general FL-DAD-SB8-general; do
  printf '%s slots=%s none=%s mate=%s inc=%s old=%s\n' "$r" \
    "$(grep -o '<span>Campaign website: ' $r.html | wc -l | tr -d ' ')" \
    "$(grep -o 'Campaign website: <!-- -->none listed' $r.html | wc -l | tr -d ' ')" \
    "$(grep -o 'Running mate for Lieutenant Governor' $r.html | wc -l | tr -d ' ')" \
    "$(grep -oE 'now: Yes|now: No|>Incumbent<' $r.html | wc -l | tr -d ' ')" \
    "$(grep -o 'Official site' $r.html | wc -l | tr -d ' ')"
done
cd -
```
Expected (counted in the HTML; the RSC payload in the same file is not matched by `<span>`):
```
FL-GOV-general slots=8 none=1 mate=0 inc=0 old=0
FL-20-general slots=3 none=0 mate=0 inc=0 old=0
FL-26-general slots=3 none=1 mate=0 inc=0 old=0
FL-BRO-CC2-general slots=1 none=1 mate=0 inc=0 old=0
FL-DAD-SB8-general slots=1 none=1 mate=0 inc=0 old=0
```
(FL-GOV: Datto; FL-26: Hosey; Broward CC 2: Bogen; Miami-Dade SB 8: Colucci, withheld. If a site was added live since 2026-10-08, a `none` count can be lower; every other number must match.)

- [ ] **Step 3: Confirm the scope**

Run:
```bash
git diff --name-only claude/roster-completeness...HEAD
grep -n "export const SHOW_INCUMBENT_CHIP" src/lib/incumbency.ts
git status --short
```
Expected: the names list holds exactly `scripts/candidate-leads.ts`, `scripts/fixtures/roster/race-labels-2026-10-08.json`, `scripts/roster-reads-lib.ts`, `scripts/source-checks.ts`, `scripts/verify-ballot-order.ts`, `scripts/verify-campaign-website.ts`, `scripts/verify-candidate-leads.ts`, `scripts/verify-incumbent-chip.ts`, `scripts/verify-office-title.ts`, `scripts/verify-running-mate.ts`, `src/app/(public)/candidates/[candidateId]/page.tsx`, `src/app/(public)/races/[raceId]/page.tsx`, `src/components/features/CampaignWebsite.tsx`, `src/components/features/CandidateBrief.tsx`, `src/components/features/CandidateBrowser.tsx`, `src/components/features/CandidateListing.tsx`, `src/components/features/RaceCompare.tsx`, `src/components/features/RaceListing.tsx`, `src/components/features/RosterLines.tsx`, `src/components/features/SavedCandidates.tsx`, `src/lib/briefs.ts`, `src/lib/campaign-website.ts`, `src/lib/candidate-leads.ts`, `src/lib/incumbency.ts`, `src/lib/listing.ts`, `src/lib/running-mate.ts`, `src/types/schema.ts`, plus this plan (`docs/superpowers/plans/2026-10-08-roster-display.md`); no file under `supabase/`; `export const SHOW_INCUMBENT_CHIP: boolean = false;`; a clean tree.

- [ ] **Step 4: Push the branch and open the pull request (never merge)**

```bash
git push -u origin claude/roster-display
```
Write the body to `"$(git rev-parse --git-dir)/roster-display-pr-body.md"` (inside the git directory, so it is never committed) from this text, with the verify-all summary line pasted in:

```markdown
## What

Rollout step 6 (PR 2) of `docs/superpowers/specs/2026-10-08-roster-completeness-design.md`. Stacked on #139 (`claude/roster-completeness`).

- **Campaign website slot (D7), live on deploy.** Every card on all five surfaces (the brief card, the listed card, the race page's roster card, `/candidates` and `/saved`) reads "Campaign website: <host>" or "Campaign website: none listed". It replaces "Official site", which appeared only where a site was stored (in FL-GOV, seven cards had it and Datto's did not). One component, `CampaignWebsite`; the URL goes through `safeHttpUrl`.
- **Running-mate line (D5, D6), live once 0049 is applied.** "Running mate for Lieutenant Governor: <name>" under the name on every Governor card, or on none: `runningMatesFor` returns names only when all eight tickets have one. `normalizeDoeText` moves to `src/lib/running-mate.ts`.
- **Incumbency line (D1-D4), built and OFF.** "<label>: Yes / No" under the party chip on every card of a race, or none, from a fixed label table ("Member of the U.S. House now", "Holds this office now", ...). It replaces the Incumbent chip. `SHOW_INCUMBENT_CHIP` stays `false`, so voters see neither the line nor the chip; the flip is a later PR through the gate in spec §3.11, now written into `incumbency.ts`'s TO FLIP comment.
- **Cache keys (§3.9):** `race-brief` and `race-listing` v3, `candidate-detail` and `candidate-listing` v2, so the deploy reads 0049's columns at once.
- **R5 (§3.6):** `candidate-leads.ts check` adds the stored running mates to the names it compares against, so a running mate we already list is dropped as `on_roster`.
- **Checks:** `verify-campaign-website.ts` and `verify-running-mate.ts` (new), `verify-incumbent-chip.ts` (rewritten), each guard proven by mutations; `verify-candidate-leads.ts`, `verify-ballot-order.ts`, `verify-office-title.ts` updated.

No migration, no database write.

## Decisions this PR encodes

(Copy the nineteen numbered items of "Decisions this PR encodes" from `docs/superpowers/plans/2026-10-08-roster-display.md` here, unchanged.)

## Spec gaps for you to decide

(Copy the five numbered items of "Spec gaps" from the same plan here, unchanged.)

## Other open PRs this one meets

(Copy the four numbered items of "Cross-PR notes" from the same plan here, unchanged.)

## For the founder

1. Merge order: #139 first (this PR is stacked on it; retarget this PR to `main` if GitHub does not do it when #139's branch is deleted). Then this PR, **only after 0049 is applied live** (spec §5 step 5): `candidate-leads.ts check` reads `candidate.running_mate` and stops without it. Cut-off: merged by **Fri 10-16 18:00 EDT** (it changes the frozen `RaceListing.tsx`, `listing.ts` and `briefs.ts`); missed, it waits until after Nov 3.
2. Approving this PR confirms D2, D5 and D7 (and the display half of D1), because it ships the running-mate line and the website slot to voters on deploy.
3. After deploy, the live check (spec §5 step 6): FL-GOV shows eight running-mate lines and eight website slots, Datto's reading "Campaign website: none listed"; one listed county race (for example Broward Commission 2: one slot, "none listed"); `/candidates` shows a slot on every card; `/saved`, in a browser with a saved candidate, shows the slot; one candidate page shows the same lines as its race page. No card anywhere shows "Incumbent", "Member of the ... now" or "Holds this office now".
4. The freeze-copy PR's manifest (spec §3.10) should list `src/lib/incumbency.ts`, `src/lib/running-mate.ts`, `src/lib/campaign-website.ts`, `src/components/features/CandidateBrief.tsx`, `RaceCompare.tsx`, `CampaignWebsite.tsx` and `RosterLines.tsx`.

## Checks

- `node scripts/verify-all.mjs`: (paste its summary line). The one failure is the known live-data `verify-news-neutrality.ts`.
- `tsc --noEmit` (the project, and strict standalone on the touched scripts), `eslint`, `next build`: clean. The prerendered FL-GOV page has 8 website slots, 1 "none listed", no incumbency text and no "Official site".

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

Then:
```bash
gh pr create --base claude/roster-completeness --head claude/roster-display \
  --title "Roster display: campaign website slot, running-mate line, incumbency line (off)" \
  --body-file "$(git rev-parse --git-dir)/roster-display-pr-body.md"
```
Expected: the PR URL. Do not merge it.

---

## Self-review

- Spec coverage. §3.5: the label table, `incumbencyFor` (flag, label, every candidate sourced), the line on the three surfaces under the party chip, computed at render, `incumbent_id` / `is_open_seat` unread, the constant's name kept, the methodology paragraph left to the flip PR → Task 3. §3.6: the line on the three surfaces under the name, all or none by data, the name as stored, no link or party, `normalizeDoeText` in `running-mate.ts` tested on the 89042 and 90630 strings, R5's `check` names with `loadRoster` unchanged → Tasks 2 and 5. §3.7: `CampaignWebsite` on five surfaces, host without `www.`, "none listed", same caption, the hidden name on the link, `safeHttpUrl` → Task 1. §3.9: the four keys → Task 4. §3.11: the TO FLIP comment rewritten to the six gate items with both queries → Task 3 Step 5. §6: `verify-incumbent-chip.ts` (flag false gives null; flag true gives null on a missing source or label and the full map otherwise; 53 ids from a fixture and an unknown id; `CARDS` gains `RaceCompare.tsx`; identical markup for Yes and No; no other reader of the five columns; mutations for deleting the all-or-none test and rendering only when true) → Task 3; `verify-running-mate.ts` (the two raw strings, eight gives eight, one missing gives none, non-Governor gives none, the three surfaces once, no other reader, mutations) → Task 2; `verify-campaign-website.ts` (host drops `www.`, `safeHttpUrl` failure gives "none listed", five surfaces once, no "Official site" under `src/components` or `src/app`, mutations) → Task 1; `verify-candidate-leads.ts` (a stored running mate dropped `on_roster`, no stored running mates leaves the fixtures unchanged) → Task 5; `npm run verify` green apart from the known failure → Task 6. §7 (no incumbency or running mates on `/candidates` or `/saved`; no contact) → Scope.
- Out of this PR, by design: the flip and the methodology paragraph (rollout step 9), the contact display (§3.8, step 12), the live check after deploy (founder, step 6), the `canDetail` re-reads (steps 10-11).
- Placeholders: none; every code step carries the code, every command its expected output.
- Verified, not just written: Tasks 1-5 applied mechanically to a scratch copy, every Find matched once, every check and the build gave the numbers stated (Ground truth). The 53 race ids and the absence of the five columns live were re-read with SELECTs on 2026-10-08.
- Collisions with open PRs (#140's report string, #131's comment, #137's prop, #143's hunk) are listed under Cross-PR notes and copied into the PR body; none needs a change here.
- Names used across tasks: `campaignSite`, `CampaignWebsite`, `normalizeDoeText`, `runningMatesFor`, `runningMateLine`, `RunningMates`, `RunningMateRow`, `RunningMateLine`, `incumbencyLabel`, `incumbencyFor`, `incumbencyLine`, `Incumbency`, `IncumbencyRow`, `IncumbencyLine`, `namesToCheck`, `storedRunningMates`, and the props `incumbency` / `runningMates`, the same in every task.
