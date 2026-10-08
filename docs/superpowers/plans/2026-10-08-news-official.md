# News PR A: Official Sources, Checked Attribution, R3's Queue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the official-source list, the approve path that checks every given source id against the story's URL, and the queue CLI R3 will write through, so government notices can carry a source without any candidate getting a label others cannot get, and nothing reaches a voter until a person approves it in /admin.

**Architecture:** A new pure list module (`src/lib/official-sources.ts`) matches hosts with the outlet list's own rule (`urlBelongsTo`, widened to take `{ domain }`). The pure attribution planner in `src/lib/news-enqueue.ts` gains a `refused` result and three checks on a given id; the decision route does only the I/O, through one generalised `ensureListedRow`. R3's queue is a pure-rules-plus-injected-client module (`src/lib/election-news.ts`) and a thin CLI (`scripts/election-news.ts queue [--dry-run]`) that inserts pending `manual_news` review items and nothing else. No migration, no table change.

**Tech Stack:** TypeScript under Node 22 type-stripping (plain-Node verify scripts), zod 4, `@supabase/supabase-js`, Next.js 16 App Router (one API route), ESLint 9.

**Spec:** `/Users/jsloth/Projects/Civic Awareness Project(Know Your Vote)/.claude/worktrees/subagent-driven-development-a087c8/docs/superpowers/specs/2026-10-08-news-source-integrity-design.md` (branch `claude/specs-gap-closure`), §3.2.1 to §3.2.3, §5 rollout step 1, §6 (the PR A test lists). The list changes it records come from `2026-10-08-agent-retrofit-design.md` §3.4 (`:576-606`).

**Worktree and branch:** `/Users/jsloth/Projects/kyv-build/newsA`, branch `claude/news-official-sources`, cut from `08384c5` (the migration-ledger commit, which sits on `main` = `1580328`). Work only here.

## Global Constraints

Copied from the spec and the run's rules. Every task's requirements include this section.

- **Scope (rollout step 1, PR A):** "It ships `official-sources.ts`, `supervisorSite`, the widened `urlBelongsTo`, every given-id check, `ensureListedRow`, `election-news.ts` (library and script) and the runbook step 4 update." Nothing from PR B (daily sweep, depth line, chunked intake read), PR C (tags) or the retrofit's PR B (`context`, scope-from-publisher, candidate-name drop, case-for-or-against drop, date window, lint drop, R3's prompt).
- **No migration in this PR.** `0054_news_agent_rows_to_review` and `0055_official_link_sources` are later PRs. "It touches no table and needs no migration."
- **"Nothing here publishes."** Nothing voter-facing changes until a human approves an item in /admin. The R3 CLI "inserts the rows as `review_item` (`kind 'manual_news'`, `source 'agent:R3'`, `status 'pending'`) and nothing else."
- **"The list is an editorial decision, so it changes only by PR."** Each entry is `{ domain, publisher, countyFips }` (`countyFips` null for statewide).
- **Row builder:** `officialSourceRow(entry)` returns `{ source_id: 'official:<domain>', url: 'https://<domain>', url_norm: <domain>, publisher, type: 'primary_doc', lean_tag: 'N/A' }`, "the same shape `outletSourceRow` builds".
- **Approve-path order:** "`given` (checked), `outlet`, `unsigned` (refused), `page`, `none`. **There is no official fall-through.** An official source is attributed only from a given id."
- **Given-id checks** (each refusal leaves the item pending with the reason in `apply_error`, through the route's existing `failClosed`):
  - "`outlet:<domain>` is refused unless `outletForUrl(url)` is that outlet: 'This story names outlet `<domain>`, but its URL belongs to `<other outlet, or no listed outlet>`.'"
  - "`official:<domain>` is refused unless all three hold: 1. the item is `election_news`; 2. it has no `candidate_id` and no `race_id`; 3. `officialForUrl(url)` is the entry with that `domain`. The reason names the first that fails."
  - `ensureListedRow(row)`: "an upsert on `url_norm` with `ignoreDuplicates`, read back by `url_norm`, and for an official row a refusal unless the row read back is `primary_doc` / `N/A` ('a source row for `<domain>` exists with another type or lean; fix the row or the list')."
  - "Any other given id (a `src_*` page row) is refused unless that `source` row's `url_norm` equals `urlNorm(url)`."
- **R3 queue input:** "a JSON array of at most 25 items, each exactly `{ title, summary, url, published_at, scope }`. `scope` is `{ "county_fips": "<5 digits>" }` or `{ "statewide": true }`. There is no `metro` form."
- **R3 queue refusals** (exit 1, nothing written, first problem named with its index, as `mentionProblem` does): not an array, more than 25 items, an unknown or missing field, a non-string, an unparseable date; a URL that is not http(s), matches an outlet, or matches no official entry; a `county_fips` outside `COVERED_FIPS`, or a county scope on a county entry whose county differs.
- **R3 queue per item:** source (page row if `primary_doc` / `N/A`, else drop; no page row: `official:<domain>`), then skip (URL already in `news_item`, in a `manual_news` item of any status, or earlier in the batch; reads filtered by URL in chunks), then build `{ item_type: 'election_news', title, summary, url, published_at, county_fips | statewide, source_id }` and parse with `ManualNewsPayloadSchema` ("One failure refuses the batch").
- **R3 queue output:** "stdout is one JSON object, `{ rows, skipped, dropped }`, with each skip and drop carrying its index and reason. stderr is one line: `queued N, skipped S, dropped D` (`would queue` under `--dry-run`). Exit 0 for a complete run, including 0 queued; 1 for a refused batch or a failed insert; 2 for a configuration error." Keys come from `.env.local` through `scripts/env-local.ts`, as `scripts/candidate-leads.ts:17,24` does.
- **House rules:** equal treatment of candidates and parties ("'Official document' from the official list can never attach to a candidate story"); the site never writes a case for or against an amendment ("an agency's advocacy page keeps its true type"); every `candidate_news` / `election_news` row needs a `source_id`.
- **Safety:** never apply a migration or write the live database; never run `scripts/election-news.ts queue` with a well-formed batch (only the refusal smoke tests in Task 4, which stop before any read); never open, print or copy `.env.local` or any key; never merge, push to `main` or force-push; never create, run or change a scheduled task.
- **Node:** `NODE="/Users/jsloth/Library/Application Support/Logi/LogiPluginService/PluginHosts/node22/node/bin/node"` for everything, quoted. The default `node` crashes on this Mac. Node prints a `MODULE_TYPELESS_PACKAGE_JSON` warning on stderr for every script; ignore it.
- **Shell preamble:** shell state does not persist between tool calls. Start every command block below with these two lines (blocks that also need `W` or `SCRATCH` define them themselves):

  ```bash
  cd /Users/jsloth/Projects/kyv-build/newsA
  NODE="/Users/jsloth/Library/Application Support/Logi/LogiPluginService/PluginHosts/node22/node/bin/node"
  ```
- **Line numbers** below are the file's numbering before this PR. After an earlier edit in the same file they shift, so find each anchor by the quoted text.
- **Imports:** modules imported by plain-Node scripts use relative imports with the `.ts` extension, never `@/`.
- **Commits:** one-line subject, blank line, body, then the final line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Decisions this PR encodes

Each is the spec's "Recommended (pending founder confirmation)" option or an implementation choice the spec leaves open. The PR body (Task 5) lists them all.

1. **D6, the list:** the 17 entries of spec §3.2.1, including the retrofit's four changes (`miamidade.gov/elections` path-scoped plus `votemiamidade.gov`; `dos.fl.gov/elections` path-scoped plus `constitutionalinitiatives.dos.fl.gov` and `dos.elections.myflorida.com`; `flhouse.gov`; `flcourts.gov` and `uscourts.gov`). Left off: `courtlistener.com`, `congress.gov`, `flgov.com`, and R3's Tier 2 (AP, Ballotpedia, VoteSmart, PolitiFact, FactCheck.org, OpenSecrets). **TO FLIP:** add or remove an entry in `OFFICIAL_SOURCES` and the matching line of `EXPECTED` in `scripts/verify-official-sources.ts`; nothing else changes.
2. **D7, where official attribution applies:** only from a given `official:` id, only on `election_news` with no candidate and no race, only when the URL is on that entry. No official fall-through. **TO FLIP:** in the route's `case "page"`, when no page row is found, call `officialForUrl(row.url)` and, if it returns an entry, `ensureListedRow(officialSourceRow(entry), "outlet")`; and drop the item-type and candidate/race checks in `planGiven`. About ten lines.
3. **D5 (the part PR A can encode):** R3 comes back only as a queue. The CLI writes pending `agent:R3` review items and nothing else. This PR writes no R3 prompt and installs nothing; nothing calls the CLI unattended until the retrofit's PR B passes its watched run.
4. **Publisher strings:** one per body, the string 0014 and 0042 write where they wrote one ("Florida Senate", "Florida Dept. of State, Division of Elections", "Broward County Supervisor of Elections", "Hillsborough County Supervisor of Elections"); the verify script reads both migration files and fails on drift.
5. **The four county Supervisor hosts come from `supervisorSite(countyFips)`** in `supervisors.ts` (www. removed), plus the two older hosts `miamidade.gov/elections` and `ocfelections.gov`.
6. **Most specific entry wins (implementation choice):** when two official entries match one URL, `officialForUrl` returns the one with the longest `domain`, so list order never decides.
7. **Listed ids always go through `ensureListedRow` (implementation choice):** a given `outlet:` or `official:` id whose row can be built from a list is upserted-if-absent and read back by `url_norm`, instead of first looking the id up. The id used is whichever row owns that `url_norm`.
8. **A given `outlet:` id for an outlet whose lean is not signed off (implementation choice):** after the URL check it is looked up by id as today, never written, and refused when no row has that id. (No such row exists; behaviour unchanged.)
9. **R3 queue scope, PR A level:** a county scope that differs from a county entry's county is refused, and so is a statewide scope on a county entry's page (review fix: a Broward Supervisor notice must not reach the statewide feed). A county scope on a statewide body's page is still accepted; the retrofit's PR B sets scope from the publisher (its D2). The approve path re-checks the county for an `official:` id (decision 12).
10. **R3 queue details (implementation choices):** `published_at` must be written YYYY-MM-DD, or that with a time and a `Z` or an offset (a date-time with neither is refused, since it would be read in the machine's zone), on a real calendar day (`2026-02-30` is refused, not rolled over to 2 March), and is stored as an ISO timestamp (`new Date(x).toISOString()`); the date window is the retrofit's PR B; the dedupe compares `urlNorm` without a leading `www.` (scheme, trailing slash and `www.` do not matter, the query does), the news_item / review_item reads ask for the http/https, with/without-`www.` and trailing-slash spellings of each URL (eight, so 25 items still fit one 200-value read), and a page row recorded under the other `www.` spelling still backs or drops the item; a blank summary is stored as `null`; a failed read exits 1 with nothing written (the spec names exit 1 for a failed insert; a failed read is treated the same); the skip check runs after the source check, as the spec orders them, so a page recorded as `opinion` is reported as dropped even if it is also already stored.
11. **Strict-mode fix:** `fakeDb` in `scripts/verify-news-enqueue.ts` takes `readonly` row arrays, the one error a strict standalone type-check of that file reports today.
12. **Approve-path checks beyond §3.2.2 (review fixes):** a given `official:` id for a county entry is refused unless the item's `county_fips` is that county; it is refused when a page row for the story's own URL exists with a type or lean other than `primary_doc` / `N/A`; and the `page` case refuses a read-back row whose id is `official:` unless the item passes every check a given `official:` id must pass (so a candidate story at a body's home page never prints "Official document"). **TO FLIP:** drop the county check in `planGiven`, the `storyPageNorm` read in the route, or the `pageRowProblem` call in the route's `page` case.
13. **No official source on a metro item (review fix; the spec has no rule for it):** the approve path refuses an `official:` id, and an official row found by `url_norm`, on an item with a `metro` scope. R3's queue never writes metro; this closes the operator-edited payload where a metro row's null `county_fips` passed a statewide body's check. **TO FLIP:** delete the `row.metro` line in `officialCheck` (`news-enqueue.ts`).
14. **Path case (review fix):** `officialForUrl` lowercases the URL's path before matching, so `miamidade.gov/Elections/...` is the Miami-Dade entry's (both hosts serve either case, checked 2026-10-08). Outlet matching is unchanged. A path-scoped entry's host also matches its subdomains (`files.dos.fl.gov/elections/x` is the Division's), as every entry's does; the list header says so. **TO FLIP:** drop `lowerPath` in `officialForUrl`.
15. **stderr (spec §3.2.3 says one line):** the run's summary is always the LAST stderr line. Node's own warnings and, from a `.claude/worktrees` checkout with no `.env.local`, `env-local.ts`'s note naming the credentials file it read can come before it; the note stays, because it is what stops a script reading credentials silently. R3's prompt (the retrofit's PR B) should read the last line.
16. **The two specs disagree on D7 until the founder answers it:** the agent-retrofit spec §3.4 asks for an official check after `page` for every `manual_news` item; this PR follows news-source-integrity D7 (no official fall-through), as its scope requires. Decision 2's TO FLIP is the retrofit's version.

## File Map

| File | Change | Responsibility |
| ---- | ------ | -------------- |
| `src/lib/supervisors.ts` | modify (`:43`, add above `supervisorLink`) | `supervisorSite(countyFips)`: the covered county's Supervisor URL or null |
| `src/lib/news-sources.ts` | modify (`:553-561`) | `urlBelongsTo` takes `{ domain: string }`; behaviour unchanged |
| `src/lib/official-sources.ts` | create | the 17-entry list, `officialForUrl`, `officialSourceIdFor`, `officialSourceRow` |
| `scripts/verify-official-sources.ts` | create | pins the list, the no-overlap rule, the Supervisor hosts, the publisher strings, the row shape |
| `src/lib/news-enqueue.ts` | modify (`:19-24`, `:156-203`) | `planSourceAttribution(row, deps)` with checked given ids, `givenPageRowProblem`, `listedRowProblem` |
| `src/app/api/admin/review/[id]/decision/route.ts` | modify (`:7-8`, `:265-363`) | `resolveSource` does the reads; `ensureListedRow` replaces `ensureOutletRow` |
| `scripts/verify-news-enqueue.ts` | modify (`:22-36`, `:252-277`, `:311-312`, `:398`) | given-id checks, the eight moved R3 payloads, swept payloads unchanged, route static checks |
| `src/lib/election-news.ts` | create | R3's queue: `batchProblem`, `planElectionQueue`, `readQueueContext`, `runElectionQueue` |
| `scripts/election-news.ts` | create | the `queue [--dry-run]` CLI: env, stdin, exit codes |
| `scripts/verify-election-news.ts` | create | the queue's contract, against an in-memory client |
| `docs/general-election/news-inlet-runbook.md` | modify (`:239-245`) | step 4 describes the checks and `official:` ids |

`scripts/verify-all.mjs` discovers `verify-*.ts` by name, so the two new verify scripts need no registration.

**Files other PRs also touch** (spec §2.10): the retrofit's PR D may add `supervisorSite` first (Task 1 Step 1 checks); the retrofit's PR B extends `src/lib/election-news.ts`, `scripts/election-news.ts` and `scripts/verify-election-news.ts` after this merges.

## Baseline

- [ ] **Step 0: Record the baseline** (before Task 1)

```bash
cd /Users/jsloth/Projects/kyv-build/newsA
NODE="/Users/jsloth/Library/Application Support/Logi/LogiPluginService/PluginHosts/node22/node/bin/node"
git status --short
"$NODE" scripts/verify-all.mjs 2>&1 | tail -3
```

Expected: a clean tree, and `verify-all: 68 passed (1 offline only), 1 failed, 2 skipped (needs env), 71 total`. The one failure is `verify-news-neutrality.ts` (the live sourceless rows `4c787ba7…` and `8d12a9b1…`); the skips are `verify-admin-ops.mjs` and `verify-refresh-schema.mjs`. Report any other failure before starting.

---

### Task 1: The official-source list

**Files:**
- Modify: `src/lib/supervisors.ts:43` (insert above `export function supervisorLink`)
- Modify: `src/lib/news-sources.ts:553-561` (the `urlBelongsTo` doc comment and signature)
- Create: `src/lib/official-sources.ts`
- Create: `scripts/verify-official-sources.ts`

**Interfaces:**
- Consumes: `SUPERVISOR_SITES` (`src/lib/supervisors.ts:24-29`); `urlBelongsTo` and `hostMatches` behaviour (`src/lib/news-sources.ts:549-582`); `LeanTag`, `SourceType` (`src/lib/news-labels.ts:28-44`); `COVERED_FIPS` (`src/lib/candidate-leads.ts:17`); `urlNorm` (`src/lib/brief-rows.ts:219`); `outletSourceRow` (`src/lib/news-enqueue.ts:135`).
- Produces (later tasks rely on these exact names):
  - `supervisorSite(countyFips: string): string | null`
  - `urlBelongsTo(url: string, outlet: { domain: string }): boolean`
  - `interface OfficialSource { domain: string; publisher: string; countyFips: string | null }`
  - `OFFICIAL_SOURCES: readonly OfficialSource[]` (17 entries)
  - `officialForUrl(url: string, sources?: readonly OfficialSource[]): OfficialSource | null`
  - `OFFICIAL_ID_PREFIX = "official:"`
  - `officialSourceIdFor(domain: string): string`
  - `interface OfficialSourceRow { source_id: string; url: string; url_norm: string; publisher: string; type: SourceType; lean_tag: LeanTag }`
  - `officialSourceRow(entry: OfficialSource): OfficialSourceRow`

- [ ] **Step 1: Check whether `supervisorSite` already exists**

The retrofit's PR D adds the same function "unless the other landed first".

```bash
cd /Users/jsloth/Projects/kyv-build/newsA
grep -n "export function supervisorSite" src/lib/supervisors.ts || echo "absent"
```

Expected: `absent`. If it is present with the signature `supervisorSite(countyFips: string): string | null`, skip Step 4a; if present with another signature, stop and report.

- [ ] **Step 2: Write the failing test**

Create `scripts/verify-official-sources.ts`:

```ts
/* Guardrail for src/lib/official-sources.ts, the official-source list (spec
   docs/superpowers/specs/2026-10-08-news-source-integrity-design.md §3.2.1, D6).

   What it pins:
     1. The list is exactly the 17 entries D6 recommends, and the hosts D6
        leaves off resolve to nothing.
     2. No official entry matches any outlet, and no outlet matches any
        official entry, so no URL can be both a swept story and an official
        notice.
     3. The four county Supervisor hosts are supervisors.ts's, without `www.`.
     4. The six official_link URLs resolve as §3.2.4 needs, and the Miami-Dade
        county release pages that 0014 and 0042 attribute resolve to nothing.
     5. Publisher strings equal 0014's and 0042's for every page of theirs on
        a listed host.
     6. officialSourceRow has outletSourceRow's shape, and its url_norm is
        brief-rows.ts urlNorm of its url.

   Pure and offline. Run: node scripts/verify-official-sources.ts */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { urlNorm } from "../src/lib/brief-rows.ts";
import { COVERED_FIPS } from "../src/lib/candidate-leads.ts";
import { outletSourceRow } from "../src/lib/news-enqueue.ts";
import { OUTLETS, outletForUrl } from "../src/lib/news-sources.ts";
import {
  OFFICIAL_SOURCES,
  officialForUrl,
  officialSourceIdFor,
  officialSourceRow,
} from "../src/lib/official-sources.ts";
import { supervisorSite } from "../src/lib/supervisors.ts";

let failures = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) return;
  failures++;
  console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
}

/* ---- 1. the list D6 recommends ------------------------------------------ */
const EXPECTED: Record<string, [publisher: string, countyFips: string | null]> = {
  "dos.fl.gov/elections": ["Florida Dept. of State, Division of Elections", null],
  "dos.elections.myflorida.com": ["Florida Dept. of State, Division of Elections", null],
  "constitutionalinitiatives.dos.fl.gov": ["Florida Dept. of State, Division of Elections", null],
  "files.floridados.gov": ["Florida Dept. of State", null],
  "registertovoteflorida.gov": ["Florida Dept. of State", null],
  "flsenate.gov": ["Florida Senate", null],
  "myfloridahouse.gov": ["Florida House of Representatives", null],
  "flhouse.gov": ["Florida House of Representatives", null],
  "leg.state.fl.us": ["Florida Legislature", null],
  "flcourts.gov": ["Florida State Courts", null],
  "uscourts.gov": ["U.S. Courts", null],
  "votemiamidade.gov": ["Miami-Dade County Supervisor of Elections", "12086"],
  "miamidade.gov/elections": ["Miami-Dade County Supervisor of Elections", "12086"],
  "browardvotes.gov": ["Broward County Supervisor of Elections", "12011"],
  "votehillsborough.gov": ["Hillsborough County Supervisor of Elections", "12057"],
  "voteorangefl.gov": ["Orange County Supervisor of Elections", "12095"],
  "ocfelections.gov": ["Orange County Supervisor of Elections", "12095"],
};
check("the list has 17 entries", OFFICIAL_SOURCES.length === 17, String(OFFICIAL_SOURCES.length));
check("every domain is listed once",
  new Set(OFFICIAL_SOURCES.map((s) => s.domain)).size === OFFICIAL_SOURCES.length);
for (const s of OFFICIAL_SOURCES) {
  const want = EXPECTED[s.domain];
  check(`${s.domain} is one of D6's entries`, want !== undefined);
  if (!want) continue;
  check(`${s.domain} is published as "${want[0]}"`, s.publisher === want[0], s.publisher);
  check(`${s.domain} is scoped to ${want[1] ?? "statewide"}`, s.countyFips === want[1], String(s.countyFips));
  check(`${s.domain}'s county is a covered county`, s.countyFips === null || COVERED_FIPS.has(s.countyFips));
}
for (const url of [
  "https://www.courtlistener.com/opinion/1/x/",
  "https://www.congress.gov/bill/119th-congress/house-bill/1",
  "https://www.flgov.com/2026/10/01/executive-order/",
  "https://apnews.com/article/x",
  "https://ballotpedia.org/Florida_2026_ballot_measures",
  "https://news.ballotpedia.org/2026/06/03/x/",
  "https://justfacts.votesmart.org/x",
  "https://www.politifact.com/x",
  "https://www.factcheck.org/x",
  "https://www.opensecrets.org/x",
  "https://www.dos.fl.gov/cultural/",
  "https://www.miamidade.gov/global/release.page?Mduid_release=rel1",
]) {
  check(`${url} is not an official source (D6 leaves it off)`, officialForUrl(url) === null,
    JSON.stringify(officialForUrl(url)));
}

/* ---- 2. no URL is both an outlet's and an official body's --------------- */
const probes = (domain: string) => [
  `https://${domain}`,
  `https://${domain}/probe`,
  `https://www.${domain}/probe`,
];
for (const s of OFFICIAL_SOURCES) {
  for (const url of probes(s.domain)) {
    check(`official ${s.domain}: ${url} matches no outlet`, outletForUrl(url, OUTLETS) === null,
      outletForUrl(url, OUTLETS)?.domain);
  }
}
for (const o of OUTLETS) {
  for (const url of probes(o.domain)) {
    check(`outlet ${o.domain}: ${url} matches no official entry`, officialForUrl(url) === null,
      officialForUrl(url)?.domain);
  }
}

/* Every entry's own URL resolves to that entry, so no broader entry shadows
   a narrower one. */
for (const s of OFFICIAL_SOURCES) {
  for (const url of probes(s.domain)) {
    check(`${url} resolves to ${s.domain}`, officialForUrl(url)?.domain === s.domain, officialForUrl(url)?.domain);
  }
}

/* ---- 3. the Supervisor hosts come from supervisors.ts ------------------- */
for (const fips of COVERED_FIPS) {
  const site = supervisorSite(fips);
  check(`supervisorSite(${fips}) is set`, site !== null);
  if (!site) continue;
  const host = new URL(site).hostname.replace(/^www\./, "");
  const entry = OFFICIAL_SOURCES.find((s) => s.domain === host);
  check(`${host} (supervisorSite ${fips}) is an official entry for ${fips}`, entry?.countyFips === fips, JSON.stringify(entry));
}
check("supervisorSite is null for an uncovered county", supervisorSite("12099") === null);

/* ---- 4. the six official_link URLs and the county release pages -------- */
for (const [url, domain] of [
  ["https://www.ocfelections.gov", "ocfelections.gov"],
  ["https://www.browardvotes.gov", "browardvotes.gov"],
  ["https://www.votehillsborough.gov", "votehillsborough.gov"],
  ["https://registertovoteflorida.gov", "registertovoteflorida.gov"],
  ["https://dos.fl.gov/elections/", "dos.fl.gov/elections"],
  ["https://www.miamidade.gov/global/elections/home.page", null],
  ["https://www.miamidade.gov/global/release.page?Mduid_release=rel1780088950968276", null],
  ["https://www.miamidade.gov/global/release.page?Mduid_release=rel1788204670102232", null],
  ["https://constitutionalinitiatives.dos.fl.gov/initdetail.asp?account=83993&seqnum=1", "constitutionalinitiatives.dos.fl.gov"],
  ["https://www.flhouse.gov/Sections/Bills/billsdetail.aspx?BillId=1", "flhouse.gov"],
  ["https://www.miamidade.gov/elections/early-voting.asp", "miamidade.gov/elections"],
  ["https://www.votemiamidade.gov/", "votemiamidade.gov"],
] as const) {
  check(`${url} resolves to ${domain ?? "no entry"}`, (officialForUrl(url)?.domain ?? null) === domain,
    officialForUrl(url)?.domain);
}

/* ---- 5. publisher strings match 0014 and 0042 --------------------------- */
const MIGRATIONS = resolve(import.meta.dirname, "..", "supabase", "migrations");
const tuple = /\('(src_[^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)'\)/g;
let compared = 0;
for (const file of ["0014_news_fairness.sql", "0042_news_source_backfill.sql"]) {
  const sql = readFileSync(resolve(MIGRATIONS, file), "utf8");
  for (const [, id, url, , publisher] of sql.matchAll(tuple)) {
    const entry = officialForUrl(url);
    if (!entry) continue;
    compared++;
    check(`${file} ${id}: publisher "${publisher}" equals the list's "${entry.publisher}"`,
      entry.publisher === publisher);
  }
}
check("0014 and 0042 give five pages on listed hosts to compare", compared === 5, String(compared));

/* ---- 6. the row builder ------------------------------------------------- */
const outletRow = outletSourceRow(OUTLETS.find((o) => o.leanTag !== null)!);
for (const s of OFFICIAL_SOURCES) {
  const row = officialSourceRow(s);
  check(`officialSourceRow(${s.domain}) has outletSourceRow's keys`,
    JSON.stringify(Object.keys(row)) === JSON.stringify(Object.keys(outletRow ?? {})), JSON.stringify(Object.keys(row)));
  check(`officialSourceRow(${s.domain}) is official:<domain>, primary_doc / N/A`,
    row.source_id === officialSourceIdFor(s.domain) && row.source_id === `official:${s.domain}` &&
      row.url === `https://${s.domain}` && row.url_norm === s.domain && row.publisher === s.publisher &&
      row.type === "primary_doc" && row.lean_tag === "N/A", JSON.stringify(row));
  check(`officialSourceRow(${s.domain}).url_norm is urlNorm of its url`, urlNorm(row.url) === row.url_norm,
    String(urlNorm(row.url)));
}

if (failures > 0) {
  console.error(`\nverify-official-sources: ${failures} failure(s)`);
  process.exit(1);
}
console.log(
  `verify-official-sources: OK — ${OFFICIAL_SOURCES.length} official entries, none overlaps the ${OUTLETS.length} outlets, the Supervisor hosts are supervisors.ts's and publishers match 0014 and 0042`,
);
```

- [ ] **Step 3: Run the test to verify it fails**

```bash
cd /Users/jsloth/Projects/kyv-build/newsA
NODE="/Users/jsloth/Library/Application Support/Logi/LogiPluginService/PluginHosts/node22/node/bin/node"
"$NODE" scripts/verify-official-sources.ts; echo "exit=$?"
```

Expected: `Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../src/lib/official-sources.ts'`, `exit=1`.

- [ ] **Step 4a: Add `supervisorSite`**

In `src/lib/supervisors.ts`, insert directly above `export function supervisorLink(countyFips?: string | null): SupervisorLink {` (line 43):

```ts
/* The covered county's Supervisor of Elections home page, or null for any
   other county. src/lib/official-sources.ts builds its four county entries
   from this, so the Supervisor hosts the approve path and R3's queue accept
   come from this one map (agent-retrofit spec §3.4). */
export function supervisorSite(countyFips: string): string | null {
  return SUPERVISOR_SITES[countyFips] ?? null;
}

```

- [ ] **Step 4b: Widen `urlBelongsTo`**

In `src/lib/news-sources.ts`, replace:

```ts
    keeps news-sweep.ts free of value imports so a plain `node` script can run
    it without a build step. */
export function urlBelongsTo(url: string, outlet: Outlet): boolean {
```

with:

```ts
    keeps news-sweep.ts free of value imports so a plain `node` script can run
    it without a build step.

    It takes anything with a `domain`, not only an `Outlet`, so the official
    list (src/lib/official-sources.ts) matches hosts by this same rule and the
    two lists cannot disagree about what a host is. */
export function urlBelongsTo(url: string, outlet: { domain: string }): boolean {
```

The body is unchanged; it reads only `outlet.domain`.

- [ ] **Step 4c: Create `src/lib/official-sources.ts`**

```ts
/* The official-source list: the government bodies whose own pages count as
   primary documents for an election notice. The counterpart of OUTLETS in
   news-sources.ts (spec docs/superpowers/specs/2026-10-08-news-source-integrity-design.md
   §3.2.1, decision D6, with the agent-retrofit spec's four changes, §3.4).

   THE LIST IS AN EDITORIAL DECISION, so it changes only by PR, like OUTLETS.
   Each entry is the body that issues the notice: the Division of Elections, a
   county Supervisor of Elections, the Legislature, a court.

   Left off on purpose (D6, Recommended pending founder confirmation):
   courtlistener.com (the Free Law Project's archive, not the court),
   congress.gov, the Governor's site (it also carries political releases) and
   R3's old Tier 2 (AP, Ballotpedia, VoteSmart, PolitiFact, FactCheck.org,
   OpenSecrets). TO FLIP: add or drop an entry here, by PR.

   WHERE AN OFFICIAL SOURCE APPLIES (D7). Only from a given `official:<domain>`
   id, only on an election_news item that names no candidate and no race, and
   only when the story's URL is on that entry (planSourceAttribution in
   news-enqueue.ts). Never by host alone: an incumbent's release on a .gov
   host would otherwise print "Official document", which a challenger's
   release cannot get.

   Matching is urlBelongsTo from news-sources.ts: the exact host or a
   label-boundary subdomain, plus a path prefix for a path-scoped entry. When
   two entries match one URL the longest `domain` wins, so the more specific
   entry decides.

   Relative imports with the extension: plain-Node scripts import this. */

import type { LeanTag, SourceType } from "./news-labels.ts";
import { urlBelongsTo } from "./news-sources.ts";
import { supervisorSite } from "./supervisors.ts";

export interface OfficialSource {
  /** Registrable host, or host plus path for a path-scoped entry. */
  domain: string;
  /** Goes into `source.publisher` verbatim. */
  publisher: string;
  /** The county the body serves; null for a statewide body. */
  countyFips: string | null;
}

/** A covered county's Supervisor host, from supervisors.ts, without `www.`. */
function supervisorHost(countyFips: string): string {
  const site = supervisorSite(countyFips);
  if (!site) throw new Error(`official-sources: no Supervisor site for county ${countyFips}`);
  return new URL(site).hostname.replace(/^www\./, "");
}

const DIVISION = "Florida Dept. of State, Division of Elections";
const DEPARTMENT = "Florida Dept. of State";
const HOUSE = "Florida House of Representatives";
const MIAMI_DADE_SOE = "Miami-Dade County Supervisor of Elections";
const ORANGE_SOE = "Orange County Supervisor of Elections";

/* Seventeen entries. Publisher strings are the ones migrations 0014 and 0042
   write for the same body ("Florida Senate", the Division's string, the
   Broward and Hillsborough Supervisors). */
export const OFFICIAL_SOURCES: readonly OfficialSource[] = Object.freeze([
  // --- Statewide ---
  /* Path-scoped so the rest of the Department of State is not labelled
     Elections (retrofit change 2). */
  { domain: "dos.fl.gov/elections", publisher: DIVISION, countyFips: null },
  /* The Division's candidate and Supervisor directories (change 2). */
  { domain: "dos.elections.myflorida.com", publisher: DIVISION, countyFips: null },
  /* The Division's amendment database (change 2). */
  { domain: "constitutionalinitiatives.dos.fl.gov", publisher: DIVISION, countyFips: null },
  /* The Department's file server, which serves the amendment booklet. */
  { domain: "files.floridados.gov", publisher: DEPARTMENT, countyFips: null },
  /* The registration portal. */
  { domain: "registertovoteflorida.gov", publisher: DEPARTMENT, countyFips: null },
  { domain: "flsenate.gov", publisher: "Florida Senate", countyFips: null },
  { domain: "myfloridahouse.gov", publisher: HOUSE, countyFips: null },
  /* Both live House source rows are on www.flhouse.gov (change 3). */
  { domain: "flhouse.gov", publisher: HOUSE, countyFips: null },
  { domain: "leg.state.fl.us", publisher: "Florida Legislature", countyFips: null },
  /* Rulings on covered races, on the court's own host (change 4). */
  { domain: "flcourts.gov", publisher: "Florida State Courts", countyFips: null },
  { domain: "uscourts.gov", publisher: "U.S. Courts", countyFips: null },
  // --- Covered counties: each Supervisor's site from supervisors.ts ---
  { domain: supervisorHost("12086"), publisher: MIAMI_DADE_SOE, countyFips: "12086" },
  /* The Division's directory address for Miami-Dade (change 1). Path-scoped
     so the County Commission's pages are not official sources for 12086. */
  { domain: "miamidade.gov/elections", publisher: MIAMI_DADE_SOE, countyFips: "12086" },
  { domain: supervisorHost("12011"), publisher: "Broward County Supervisor of Elections", countyFips: "12011" },
  { domain: supervisorHost("12057"), publisher: "Hillsborough County Supervisor of Elections", countyFips: "12057" },
  { domain: supervisorHost("12095"), publisher: ORANGE_SOE, countyFips: "12095" },
  /* The older Orange host, which now redirects (supervisors.ts header). */
  { domain: "ocfelections.gov", publisher: ORANGE_SOE, countyFips: "12095" },
]);

/** The official entry `url` belongs to, or null. The longest matching
    `domain` wins, so a more specific entry decides over a broader one. */
export function officialForUrl(
  url: string,
  sources: readonly OfficialSource[] = OFFICIAL_SOURCES,
): OfficialSource | null {
  let best: OfficialSource | null = null;
  for (const s of sources) {
    if (urlBelongsTo(url, s) && (best === null || s.domain.length > best.domain.length)) best = s;
  }
  return best;
}

export const OFFICIAL_ID_PREFIX = "official:";

/** `source_id` for an official entry: one source row per listed body, as
    `outlet:<domain>` is one per outlet. */
export function officialSourceIdFor(domain: string): string {
  return `${OFFICIAL_ID_PREFIX}${domain}`;
}

export interface OfficialSourceRow {
  source_id: string;
  url: string;
  url_norm: string;
  publisher: string;
  type: SourceType;
  lean_tag: LeanTag;
}

/** The `source` row for one official entry: the shape outletSourceRow builds
    (news-enqueue.ts), typed `primary_doc` with lean `N/A`, so a card shows the
    publisher and "Official document" and never a lean. One builder for the
    approve path and migration official_link_sources (0055), so the row cannot
    depend on which wrote it first. */
export function officialSourceRow(entry: OfficialSource): OfficialSourceRow {
  return {
    source_id: officialSourceIdFor(entry.domain),
    url: `https://${entry.domain}`,
    url_norm: entry.domain,
    publisher: entry.publisher,
    type: "primary_doc",
    lean_tag: "N/A",
  };
}
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
"$NODE" scripts/verify-official-sources.ts; echo "exit=$?"
"$NODE" scripts/verify-supervisor-link.ts > /dev/null; echo "supervisor-link exit=$?"
"$NODE" scripts/verify-news-sweep.ts > /dev/null; echo "news-sweep exit=$?"
```

Expected: `verify-official-sources: OK — 17 official entries, none overlaps the 37 outlets, the Supervisor hosts are supervisors.ts's and publishers match 0014 and 0042`, `exit=0`, then `supervisor-link exit=0` and `news-sweep exit=0` (the outlets' `urlBelongsTo` behaviour is unchanged).

- [ ] **Step 6: Mutation-check the guard**

Break each guard by hand, run the script, see it fail, restore it:
1. Add `{ domain: "wlrn.org", publisher: "X", countyFips: null },` after the `uscourts.gov` entry. Expected FAIL lines include `the list has 17 entries — 18` and `official wlrn.org: https://wlrn.org matches no outlet — wlrn.org`. Remove the line.
2. In `supervisorHost`, change `return new URL(site).hostname.replace(/^www\./, "");` to `return new URL(site).hostname;`. Expected FAIL lines include `www.votemiamidade.gov is one of D6's entries`. Restore it.
3. Change `publisher: "Florida Senate"` to `publisher: "The Florida Senate"`. Expected FAIL: `0014_news_fairness.sql src_gov_flsenate_hb991_2026: publisher "Florida Senate" equals the list's "The Florida Senate"`. Restore it.

Then `"$NODE" scripts/verify-official-sources.ts` prints the OK line again and `git diff --stat` shows only the Step 4 changes.

- [ ] **Step 7: Lint and commit**

```bash
"$NODE" node_modules/eslint/bin/eslint.js src/lib/official-sources.ts src/lib/supervisors.ts src/lib/news-sources.ts scripts/verify-official-sources.ts
"$NODE" node_modules/typescript/bin/tsc --noEmit
git add src/lib/official-sources.ts src/lib/supervisors.ts src/lib/news-sources.ts scripts/verify-official-sources.ts
git commit -F - <<'EOF'
Official sources: the 17-body list, supervisorSite and the shared host rule

src/lib/official-sources.ts lists the government bodies whose own pages
count as primary documents for an election notice (news-source-integrity
spec §3.2.1, D6, with the agent-retrofit spec's four changes). The four
county Supervisor hosts come from supervisors.ts through the new
supervisorSite. Matching reuses urlBelongsTo, widened to take any
{ domain }, so outlets and official sources cannot disagree about a host.
officialSourceRow builds 'official:<domain>' rows, primary_doc / N/A.

scripts/verify-official-sources.ts pins the list, that no URL is both an
outlet's and an official body's, and the publisher strings 0014 and 0042
write.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

Expected: eslint and tsc print nothing; one commit.

---

### Task 2: The approve path checks every given source id

**Files:**
- Modify: `src/lib/news-enqueue.ts:19-24` (header note and imports), `:156-203` (the attribution block)
- Modify: `src/app/api/admin/review/[id]/decision/route.ts:7-8` (imports), `:265-363` (`resolveSource` and its comment)
- Modify: `scripts/verify-news-enqueue.ts:22-36` (imports), `:252-277` (section 8 head), `:311-312` (route regex), `:398` (`fakeDb` type)

**Interfaces:**
- Consumes (Task 1): `OFFICIAL_ID_PREFIX`, `officialSourceRow`, `type OfficialSource`, `type OfficialSourceRow`, `officialForUrl`, `OFFICIAL_SOURCES`.
- Produces:
  - `type ListedSourceRow = OutletSourceRow | OfficialSourceRow`
  - `type SourceAttribution = { kind: "given"; sourceId: string; listedRow: ListedSourceRow | null; pageUrlNorm: string | null } | { kind: "refused"; reason: string } | { kind: "outlet"; sourceId: string; listedRow: OutletSourceRow } | { kind: "unsigned"; domain: string } | { kind: "page"; urlNorm: string } | { kind: "none" }`
  - `interface AttributionRow { url: string; source_id?: string | null; item_type: string; candidate_id?: string | null; race_id?: string | null }`
  - `interface AttributionDeps { outletFor: (url: string) => Outlet | null; officialFor: (url: string) => OfficialSource | null; norm: (url: string) => string | null }`
  - `planSourceAttribution(row: AttributionRow, deps: AttributionDeps): SourceAttribution`
  - `givenPageRowProblem(plan: { sourceId: string; pageUrlNorm: string | null }, rowUrlNorm: string): string | null`
  - `listedRowProblem(listed: ListedSourceRow, readBack: { type: string; lean_tag: string }): string | null`
  - In the route: `ensureListedRow(listed: ListedSourceRow, via: "given" | "outlet")` (local), replacing `ensureOutletRow`.

The planner and the route change together: the old call shape no longer type-checks once the planner changes, so they are one task and one commit.

- [ ] **Step 1: Update the test imports**

In `scripts/verify-news-enqueue.ts`, replace the import block at lines 22-36:

```ts
import {
  dedupeKey,
  domainFromSourceId,
  electionPayloadFor,
  isElectionRelated,
  outletSourceRow,
  planAttachments,
  planSourceAttribution,
  reviewPayloadFor,
  sourceIdFor,
  UNMATCHED_ARTICLE_POLICY,
} from "../src/lib/news-enqueue.ts";
import { urlNorm } from "../src/lib/brief-rows.ts";
import { matchArticle, type RosterCandidate } from "../src/lib/news-match.ts";
import { OUTLETS, outletForUrl } from "../src/lib/news-sources.ts";
```

with:

```ts
import {
  dedupeKey,
  domainFromSourceId,
  electionPayloadFor,
  givenPageRowProblem,
  isElectionRelated,
  listedRowProblem,
  outletSourceRow,
  planAttachments,
  planSourceAttribution,
  reviewPayloadFor,
  sourceIdFor,
  UNMATCHED_ARTICLE_POLICY,
  type AttributionRow,
} from "../src/lib/news-enqueue.ts";
import { urlNorm } from "../src/lib/brief-rows.ts";
import { matchArticle, type RosterCandidate } from "../src/lib/news-match.ts";
import { OUTLETS, outletForUrl, usableOutlets } from "../src/lib/news-sources.ts";
import { OFFICIAL_SOURCES, officialForUrl, officialSourceRow } from "../src/lib/official-sources.ts";
```

- [ ] **Step 2: Replace the head of section 8 with the given-id checks**

In `scripts/verify-news-enqueue.ts`, replace everything from line 252 `const signed = OUTLETS.find((o) => o.leanTag !== null)!;` through line 277 (the end of `check("a blank source id counts as none", ...);`), leaving `const fromOutlet = ...` (line 279) and everything after it in place, with:

```ts
const signed = OUTLETS.find((o) => o.leanTag !== null && !o.domain.includes("/"))!;
const otherSigned = OUTLETS.find((o) => o.leanTag !== null && !o.domain.includes("/") && o.domain !== signed.domain)!;
const unsigned = OUTLETS.find((o) => o.leanTag === null);
/* The canonical normalisation the route passes — source.url_norm is UNIQUE,
   so a stand-in here could pass while the real one split a page in two. The
   row defaults to an election notice that names no candidate and no race. */
const attribute = (url: string, given: string | null = null, over: Partial<AttributionRow> = {}) =>
  planSourceAttribution(
    { url, source_id: given, item_type: "election_news", candidate_id: null, race_id: null, ...over },
    { outletFor, officialFor: (u) => officialForUrl(u), norm: urlNorm },
  );
const reasonOf = (a: ReturnType<typeof attribute>) => (a.kind === "refused" ? a.reason : "");

check("outletSourceRow writes the outlet's own signed-off lean, type and publisher",
  JSON.stringify(outletSourceRow(signed)) === JSON.stringify({
    source_id: sourceIdFor(signed.domain), url: `https://${signed.domain}`, url_norm: signed.domain,
    publisher: signed.publisher, type: signed.type, lean_tag: signed.leanTag,
  }), JSON.stringify(outletSourceRow(signed)));
if (unsigned) {
  check("an outlet with no signed-off lean has no source row", outletSourceRow(unsigned) === null);
}

/* -- a given outlet: id is checked against the URL (§3.2.2) -- */
const givenOutlet = attribute(`https://www.${signed.domain}/2026/10/04/story`, sourceIdFor(signed.domain));
check("a payload that names its own outlet keeps it",
  givenOutlet.kind === "given" && givenOutlet.sourceId === sourceIdFor(signed.domain), JSON.stringify(givenOutlet));
check("a named outlet source carries the row to write if it is missing",
  givenOutlet.kind === "given" && givenOutlet.listedRow?.source_id === sourceIdFor(signed.domain));
const crossed = attribute(`https://www.${otherSigned.domain}/2026/10/04/story`, sourceIdFor(signed.domain));
check("an outlet: id on another outlet's URL is refused, naming both",
  crossed.kind === "refused" && reasonOf(crossed).includes(signed.domain) && reasonOf(crossed).includes(otherSigned.domain),
  JSON.stringify(crossed));
const offOutletList = attribute("https://example.org/anything", sourceIdFor(signed.domain));
check("an outlet: id on a URL off the outlet list is refused",
  offOutletList.kind === "refused" && reasonOf(offOutletList).includes("no listed outlet"), JSON.stringify(offOutletList));
check("an outlet: id that names no listed outlet is refused",
  attribute(`https://www.${signed.domain}/x`, "outlet:not-listed.example").kind === "refused");
if (unsigned) {
  const own = attribute(`https://${unsigned.domain}/2026/10/04/story`, sourceIdFor(unsigned.domain));
  check("an unsigned outlet's own id is looked up by id, never written",
    own.kind === "given" && own.listedRow === null && own.pageUrlNorm === null, JSON.stringify(own));
}

/* Swept payloads are unchanged: the sweep sets outlet:<domain> from the URL's
   own outlet, path-scoped outlets included, so every one passes. */
for (const o of usableOutlets()) {
  const url = `https://www.${o.domain}/2026/10/04/ballots-mailed`;
  const election = plan([article({ title: "County ballots mailed this week", url })]).elections[0];
  const a = election ? attribute(url, election.sourceId) : null;
  check(`a swept election story from ${o.domain} resolves to its own outlet`,
    a?.kind === "given" && a.listedRow?.source_id === sourceIdFor(o.domain), JSON.stringify(a));
  const attachment = plan([article({ title: "Maria Elena Vasquez files", url })]).attachments[0];
  const p = attachment ? reviewPayloadFor(attachment) : null;
  const c = p ? attribute(p.url, p.source_id, { item_type: p.item_type, candidate_id: p.candidate_id, race_id: p.race_id }) : null;
  check(`a swept candidate story from ${o.domain} resolves to its own outlet`,
    c?.kind === "given" && c.listedRow?.source_id === sourceIdFor(o.domain), JSON.stringify(c));
}

/* -- a given page-row id must be this story's page -- */
const givenOther = attribute("https://www.wlrn.org/x", "src_gov_broward_early_voting_2026");
check("a named page source is looked up by id, never written",
  givenOther.kind === "given" && givenOther.listedRow === null && givenOther.pageUrlNorm === "www.wlrn.org/x",
  JSON.stringify(givenOther));
const misattributed = givenOther.kind === "given"
  ? givenPageRowProblem(givenOther, "browardvotes.gov/voting-methods/early-voting-dates-hours-and-sites")
  : null;
check("a src_* id whose row has a different url_norm is refused, naming both pages",
  misattributed !== null && misattributed.includes("www.wlrn.org/x") && misattributed.includes("browardvotes.gov/voting-methods"),
  String(misattributed));
check("a blank source id counts as none",
  attribute(`https://${signed.domain}/2026/10/04/story`, "   ").kind === "outlet");

/* The eight R3 rows that news_agent_rows_to_review (0054) moves into review:
   Q2's live URLs (read-only SELECT, 2026-10-08) with the src_* ids 0014 and
   0042 give them. Each must resolve `given` and pass the page check against
   the url_norm the migration writes for it. */
const MIGRATION_URL_NORM = new Map<string, string>();
for (const file of ["0014_news_fairness.sql", "0042_news_source_backfill.sql"]) {
  const sql = readFileSync(resolve(import.meta.dirname, "..", "supabase", "migrations", file), "utf8");
  for (const [, id, , norm] of sql.matchAll(/\('(src_[^']+)',\s*'([^']+)',\s*'([^']+)'/g)) MIGRATION_URL_NORM.set(id, norm);
}
const EIGHT: [url: string, sourceId: string][] = [
  ["https://www.miamidade.gov/global/release.page?Mduid_release=rel1780088950968276", "src_gov_miamidade_early_voting_2026"],
  ["https://www.miamidade.gov/global/release.page?Mduid_release=rel1788204670102232", "src_gov_miamidade_general_voting_2026"],
  ["https://www.votehillsborough.gov/291/2026-General-Election", "src_gov_hillsborough_general_2026"],
  ["https://www.flsenate.gov/Session/Bill/2026/991", "src_gov_flsenate_hb991_2026"],
  ["https://dos.fl.gov/elections/for-voters/election-dates/", "src_gov_dos_election_dates_2026"],
  ["https://browardvotes.gov/voting-methods/early-voting-dates-hours-and-sites", "src_gov_broward_early_voting_2026"],
  ["https://www.votehillsborough.gov/281/2026-Primary-Election", "src_gov_hillsborough_early_voting_2026"],
  ["https://news.ballotpedia.org/2026/06/03/florida-voters-to-decide-expanded-homestead-tax-exemption-amendment-in-november/", "src_ballotpedia_news_amendments_2026"],
];
check("0014 and 0042 write a url_norm for each of the eight ids",
  EIGHT.every(([, id]) => MIGRATION_URL_NORM.has(id)), JSON.stringify([...MIGRATION_URL_NORM.keys()]));
for (const [url, id] of EIGHT) {
  const a = attribute(url, id);
  const rowNorm = MIGRATION_URL_NORM.get(id) ?? "";
  check(`moved R3 row ${id} resolves given, and its page check passes`,
    a.kind === "given" && a.sourceId === id && a.listedRow === null && givenPageRowProblem(a, rowNorm) === null,
    JSON.stringify({ a, rowNorm }));
}

/* -- a given official: id (D7) -- */
const broward = OFFICIAL_SOURCES.find((s) => s.domain === "browardvotes.gov")!;
const okOfficial = attribute("https://www.browardvotes.gov/voting-methods/early-voting", "official:browardvotes.gov");
check("an official: id on its own host, on an election notice with no candidate or race, is accepted",
  okOfficial.kind === "given" && JSON.stringify(okOfficial.listedRow) === JSON.stringify(officialSourceRow(broward)),
  JSON.stringify(okOfficial));
for (const [label, url, over, wants] of [
  ["on candidate_news", "https://www.browardvotes.gov/x", { item_type: "candidate_news" }, "candidate_news"],
  ["on election_news with a race_id", "https://www.browardvotes.gov/x", { race_id: "race-1" }, "candidate or a race"],
  ["on election_news with a candidate_id", "https://www.browardvotes.gov/x", { candidate_id: "cand-1" }, "candidate or a race"],
  ["on an outlet's URL", `https://www.${signed.domain}/x`, {}, "no listed official source"],
  ["on another official host's URL", "https://www.votehillsborough.gov/x", {}, "votehillsborough.gov"],
] as const) {
  const a = attribute(url, "official:browardvotes.gov", over);
  check(`an official: id is refused ${label}`, a.kind === "refused" && reasonOf(a).includes(wants), JSON.stringify(a));
}
check("an official: id that names no listed body is refused",
  attribute("https://www.browardvotes.gov/x", "official:example.gov").kind === "refused");

/* There is no official fall-through: a government URL with no given id is a
   page lookup, whatever the item, never an official row. */
for (const s of OFFICIAL_SOURCES) {
  for (const over of [{}, { item_type: "candidate_news", candidate_id: "cand-1", race_id: "race-1" }]) {
    const a = attribute(`https://${s.domain}/notice`, null, over);
    check(`a URL on ${s.domain} with no source id resolves to its page row (${JSON.stringify(over)})`,
      a.kind === "page", JSON.stringify(a));
  }
}

/* The read-back check on a listed row. */
const officialRow = officialSourceRow(broward);
check("an official row read back as primary_doc / N/A passes",
  listedRowProblem(officialRow, { type: "primary_doc", lean_tag: "N/A" }) === null);
check("an official row read back with another type or lean is refused",
  listedRowProblem(officialRow, { type: "opinion", lean_tag: "N/A" })?.includes("browardvotes.gov") === true &&
    listedRowProblem(officialRow, { type: "primary_doc", lean_tag: "unrated" }) !== null);
check("an outlet row is not held to the official shape",
  listedRowProblem(outletSourceRow(signed)!, { type: "factual_reporting", lean_tag: "unrated" }) === null);
```

The eight URLs are exactly the live `news_item.url` values of spec Q2 (read with a read-only `SELECT` on 2026-10-08). `signed` resolves to `wlrn.org` and `otherSigned` to `local10.com` today.

- [ ] **Step 3: Replace the route's call-shape check with the new route checks**

In `scripts/verify-news-enqueue.ts`, replace (lines 311-312 before Step 1; find it by its text):

```ts
check("the route uses planSourceAttribution with the canonical urlNorm",
  /planSourceAttribution\(\s*row\.url,\s*row\.source_id,[\s\S]*?urlNorm,\s*OUTLETS\s*\)/.test(route));
```

with:

```ts
check("the route uses planSourceAttribution with the outlet list, the official list and the canonical urlNorm",
  /planSourceAttribution\(row, \{\s*outletFor: \(u\) => outletForUrl\(u, OUTLETS\),\s*officialFor: \(u\) => officialForUrl\(u\),\s*norm: urlNorm,\s*\}\)/.test(route));
check("a refused attribution fails closed with its reason",
  /case "refused":\s*return \{ ok: false, reason: plan\.reason \};/.test(route));
check("a given listed id writes its row through ensureListedRow",
  /if \(plan\.listedRow\) return ensureListedRow\(plan\.listedRow, "given"\);/.test(route) &&
    /case "outlet":\s*return ensureListedRow\(plan\.listedRow, "outlet"\);/.test(route));
check("ensureListedRow refuses an official row read back with another type or lean",
  /const problem = listedRowProblem\(listed, found\.row\);\s*if \(problem\) return \{ ok: false, reason: problem \};/.test(route));
check("a given page-row id is checked against the story's url_norm",
  /const problem = givenPageRowProblem\(plan, found\.row\.url_norm\);\s*if \(problem\) return \{ ok: false, reason: problem \};/.test(route));
check("the outlet-only writer is gone", !route.includes("ensureOutletRow"));
```

- [ ] **Step 4: Fix the one strict-mode error already in the file**

In `scripts/verify-news-enqueue.ts` (line 398 before Step 1; find it by its text), replace:

```ts
function fakeDb(tables: Record<string, Record<string, unknown>[]>) {
```

with:

```ts
function fakeDb(tables: Record<string, readonly Record<string, unknown>[]>) {
```

(The `as const` fixtures passed to it are readonly arrays; a strict standalone type-check reports TS2345 there today.)

- [ ] **Step 5: Run the test to verify it fails**

```bash
"$NODE" scripts/verify-news-enqueue.ts; echo "exit=$?"
```

Expected: `SyntaxError: The requested module '../src/lib/news-enqueue.ts' does not provide an export named '...'`, naming one of the new exports (`givenPageRowProblem` or `listedRowProblem`), `exit=1`.

- [ ] **Step 6: Update the planner's header note and imports**

In `src/lib/news-enqueue.ts`, replace (lines 19-24):

```ts
   Type-only imports of the outlet list, same as news-outlets.ts: the guardrail
   runs under bare `node`, so the caller passes what it needs. */

import type { NewsRelation, RosterCandidate, Match } from "./news-match";
import type { SweptArticle } from "./news-sweep";
import type { Outlet } from "./news-sources";
```

with:

```ts
   Type-only imports of the outlet list, same as news-outlets.ts: the guardrail
   runs under bare `node`, so the caller passes what it needs. The one value
   import is the official list's id prefix and row builder, a pure module
   imported with its extension so plain Node can load it. */

import type { NewsRelation, RosterCandidate, Match } from "./news-match";
import type { SweptArticle } from "./news-sweep";
import type { Outlet } from "./news-sources";
import {
  OFFICIAL_ID_PREFIX,
  officialSourceRow,
  type OfficialSource,
  type OfficialSourceRow,
} from "./official-sources.ts";
```

- [ ] **Step 7: Replace the attribution block**

In `src/lib/news-enqueue.ts`, replace everything from the line `    Resolution order, each step deterministic:` (inside the doc comment beginning `/** How the approve path finds the`; line 156 before Step 6, 164 after it) through the closing `}` of `planSourceAttribution` (the line after `  return urlNorm ? { kind: "page", urlNorm } : { kind: "none" };`; line 203 before Step 6), keeping the comment's first paragraph above it, with:

```ts
    Resolution order, each step deterministic (news-source-integrity spec
    §3.2.2, decision D7):
      1. `given`: the payload already names a source, and the id is CHECKED
         against the story's URL first, so a payload cannot attribute one
         publisher's story to another:
           - `outlet:<domain>` only when the URL belongs to that outlet. A
             swept article always carries its own outlet's id, so it passes;
           - `official:<domain>` only on an election_news item with no
             candidate and no race, and only when the URL is on that entry of
             the official list. Only R3's queue writes these ids;
           - any other id (a `src_*` page row) only when that row's url_norm
             is this URL's. The route reads the row; givenPageRowProblem
             decides.
         A failed check is `refused`, with the reason.
      2. `outlet`: the URL is on a listed outlet with a signed-off lean. Same
         attribution a swept article gets: one source per outlet.
      3. `page`: anything else is looked up as a source row for this exact page,
         by `url_norm`. That is how migration 0014 attributed the government
         notices, and it is the operator's remedy for a page off the outlet
         list: add the page's source row, then approve again.
    An outlet on the list whose lean is not signed off stops at `unsigned`.
    It is never resolved to a page row, because that would put a lean on the
    card that nobody signed off for that outlet.

    THERE IS NO OFFICIAL FALL-THROUGH (D7). A government URL with no given id
    resolves to `page`, never to an official row: by host alone, an
    incumbent's release on a .gov host would print "Official document", which
    a challenger's cannot get, and an agency's advocacy page on an amendment
    would print as an official document. TO FLIP: check `officialFor` after
    `page` for every item.

    `outletFor`, `officialFor` and `norm` are injected for the same reason
    `planAttachments` takes its matcher: this stays pure and offline-testable.
    The route passes `outletForUrl`, `officialForUrl` and brief-rows.ts
    `urlNorm`, the canonical normalisation (`source.url_norm` is UNIQUE; two
    spellings would split one page in two). */
export type ListedSourceRow = OutletSourceRow | OfficialSourceRow;

export type SourceAttribution =
  | {
      kind: "given";
      sourceId: string;
      /** The row to write if missing, built from a list in code: an outlet's
          (null when its lean is not signed off) or an official body's. */
      listedRow: ListedSourceRow | null;
      /** For a page-row id: this URL's url_norm, which the row must have. */
      pageUrlNorm: string | null;
    }
  | { kind: "refused"; reason: string }
  | { kind: "outlet"; sourceId: string; listedRow: OutletSourceRow }
  | { kind: "unsigned"; domain: string }
  | { kind: "page"; urlNorm: string }
  | { kind: "none" };

/** The fields of a news row the attribution reads. NewsInsertRow has them. */
export interface AttributionRow {
  url: string;
  source_id?: string | null;
  item_type: string;
  candidate_id?: string | null;
  race_id?: string | null;
}

export interface AttributionDeps {
  outletFor: (url: string) => Outlet | null;
  officialFor: (url: string) => OfficialSource | null;
  norm: (url: string) => string | null;
}

export function planSourceAttribution(row: AttributionRow, deps: AttributionDeps): SourceAttribution {
  const given = row.source_id?.trim();
  if (given) return planGiven(row, given, deps);
  const outlet = deps.outletFor(row.url);
  if (outlet) {
    const listed = outletSourceRow(outlet);
    return listed
      ? { kind: "outlet", sourceId: listed.source_id, listedRow: listed }
      : { kind: "unsigned", domain: outlet.domain };
  }
  const urlNorm = deps.norm(row.url);
  return urlNorm ? { kind: "page", urlNorm } : { kind: "none" };
}

function planGiven(row: AttributionRow, given: string, deps: AttributionDeps): SourceAttribution {
  if (given.startsWith("outlet:")) {
    const domain = domainFromSourceId(given);
    const outlet = deps.outletFor(row.url);
    if (!outlet || outlet.domain !== domain) {
      return {
        kind: "refused",
        reason: `This story names outlet ${domain}, but its URL belongs to ${outlet ? outlet.domain : "no listed outlet"}. Fix the story's source or reject it.`,
      };
    }
    return { kind: "given", sourceId: given, listedRow: outletSourceRow(outlet), pageUrlNorm: null };
  }
  if (given.startsWith(OFFICIAL_ID_PREFIX)) {
    const domain = given.slice(OFFICIAL_ID_PREFIX.length);
    const refuse = (why: string): SourceAttribution => ({
      kind: "refused",
      reason: `This story names official source ${domain}, but ${why}. An official source backs only an election notice that names no candidate and no race, on that body's own site.`,
    });
    if (row.item_type !== "election_news") return refuse(`it is ${row.item_type}, not election_news`);
    if (row.candidate_id || row.race_id) return refuse("it names a candidate or a race");
    const entry = deps.officialFor(row.url);
    if (!entry || entry.domain !== domain) {
      return refuse(`its URL belongs to ${entry ? entry.domain : "no listed official source"}`);
    }
    return { kind: "given", sourceId: given, listedRow: officialSourceRow(entry), pageUrlNorm: null };
  }
  const pageUrlNorm = deps.norm(row.url);
  if (!pageUrlNorm) {
    return {
      kind: "refused",
      reason: `This story names source "${given}", and its URL could not be normalised to check that the source is this page's.`,
    };
  }
  return { kind: "given", sourceId: given, listedRow: null, pageUrlNorm };
}

/** A given page-row id must be this story's own page: the row the route read
    back must have the story URL's url_norm. Null when it does, or when the id
    is not a page row's (`pageUrlNorm` null). */
export function givenPageRowProblem(
  plan: { sourceId: string; pageUrlNorm: string | null },
  rowUrlNorm: string,
): string | null {
  if (plan.pageUrlNorm === null || rowUrlNorm === plan.pageUrlNorm) return null;
  return `This story names source "${plan.sourceId}", which is the page ${rowUrlNorm}, but the story's URL is ${plan.pageUrlNorm}. A page's source row backs only that page. Fix the story's source or reject it.`;
}

/** An official row read back by url_norm must be `primary_doc` / `N/A`. A row
    already there under that url_norm with another type or lean is refused
    rather than printed as "Official document". Outlet rows are not checked
    here: their url_norm row is the outlet's own. */
export function listedRowProblem(
  listed: ListedSourceRow,
  readBack: { type: string; lean_tag: string },
): string | null {
  if (!listed.source_id.startsWith(OFFICIAL_ID_PREFIX)) return null;
  if (readBack.type === "primary_doc" && readBack.lean_tag === "N/A") return null;
  return `A source row for ${listed.url_norm} exists with another type or lean (${readBack.type} / ${readBack.lean_tag}); fix the row or the list.`;
}
```

`OutletSourceRow` (line 155) and `outletSourceRow` stay as they are; `news-intake.ts` still uses them.

- [ ] **Step 8: Update the route's imports**

In `src/app/api/admin/review/[id]/decision/route.ts`, replace (lines 7-8):

```ts
import { planSourceAttribution, type OutletSourceRow } from "@/lib/news-enqueue";
import { OUTLETS, outletForUrl } from "@/lib/news-sources";
```

with:

```ts
import {
  givenPageRowProblem,
  listedRowProblem,
  planSourceAttribution,
  type ListedSourceRow,
} from "@/lib/news-enqueue";
import { OUTLETS, outletForUrl } from "@/lib/news-sources";
import { officialForUrl } from "@/lib/official-sources";
```

- [ ] **Step 9: Replace `resolveSource`**

In the same file, replace everything from the comment `/* Find the source a news row is attributed to, writing an outlet's source row` (line 265 before Step 8) through the closing `}` of `async function resolveSource` (the line before the blank line and `/* The manual_news insert fails closed with the exact reason, naming the right`) with:

```ts
/* Find the source a news row is attributed to, writing a listed body's source
   row if it has none yet. The order, the checks on a given id and their
   reasons live in planSourceAttribution (src/lib/news-enqueue.ts, pure, pinned
   by scripts/verify-news-enqueue.ts); this function only does the I/O.

   The one write here is to `source`, and only a row built from a list in code
   (outletSourceRow, or officialSourceRow for a checked `official:` id). The
   payload picks nothing but which listed body, and its URL must be on that
   body's host, so the effects-map boundary holds: a review_item still cannot
   name a table or a field to write.

   Insert-if-absent, then read back by url_norm. The id used is whichever row
   owns that url_norm, never the id we hoped to write, so a pre-existing row
   under another id cannot leave news_item pointing at nothing. */
type SourceResolution =
  | { ok: true; sourceId: string; via: "given" | "outlet" | "page" }
  | { ok: false; reason: string };

type SourceRowRead = { source_id: string; url_norm: string; type: string; lean_tag: string };

const NO_SOURCE_RULE =
  "Migration 0014 requires a source on every candidate_news and election_news row (\"no source, no card\").";

async function resolveSource(
  service: SupabaseClient,
  row: NewsInsertRow
): Promise<SourceResolution> {
  const plan = planSourceAttribution(row, {
    outletFor: (u) => outletForUrl(u, OUTLETS),
    officialFor: (u) => officialForUrl(u),
    norm: urlNorm,
  });

  const sourceRowWhere = async (column: "source_id" | "url_norm", value: string) => {
    const { data, error } = await service
      .from("source")
      .select("source_id, url_norm, type, lean_tag")
      .eq(column, value)
      .maybeSingle();
    return { row: (data as SourceRowRead | null) ?? null, error };
  };

  const ensureListedRow = async (
    listed: ListedSourceRow,
    via: "given" | "outlet"
  ): Promise<SourceResolution> => {
    const { error } = await service
      .from("source")
      .upsert(listed, { onConflict: "url_norm", ignoreDuplicates: true });
    if (error) {
      return { ok: false, reason: `Could not write the source row for ${listed.url_norm}: ${error.message}` };
    }
    const found = await sourceRowWhere("url_norm", listed.url_norm);
    if (found.error || !found.row) {
      return {
        ok: false,
        reason: `The source row for ${listed.url_norm} could not be read back${found.error ? `: ${found.error.message}` : ""}.`,
      };
    }
    const problem = listedRowProblem(listed, found.row);
    if (problem) return { ok: false, reason: problem };
    return { ok: true, sourceId: found.row.source_id, via };
  };

  switch (plan.kind) {
    case "refused":
      return { ok: false, reason: plan.reason };
    case "given": {
      if (plan.listedRow) return ensureListedRow(plan.listedRow, "given");
      const found = await sourceRowWhere("source_id", plan.sourceId);
      if (found.error) {
        return { ok: false, reason: `Could not check source ${plan.sourceId}: ${found.error.message}` };
      }
      if (!found.row) {
        return {
          ok: false,
          reason: `This story names source "${plan.sourceId}", and no source row has that id. Add the source row, or reject the story. ${NO_SOURCE_RULE}`,
        };
      }
      const problem = givenPageRowProblem(plan, found.row.url_norm);
      if (problem) return { ok: false, reason: problem };
      return { ok: true, sourceId: found.row.source_id, via: "given" };
    }
    case "outlet":
      return ensureListedRow(plan.listedRow, "outlet");
    case "unsigned":
      return {
        ok: false,
        reason: `${plan.domain} is on the outlet list, but its lean has not been signed off in src/lib/news-sources.ts, so it has no source row yet. Sign the lean off first. ${NO_SOURCE_RULE}`,
      };
    case "page": {
      const found = await sourceRowWhere("url_norm", plan.urlNorm);
      if (found.error) {
        return { ok: false, reason: `Could not look up a source for ${plan.urlNorm}: ${found.error.message}` };
      }
      if (found.row) return { ok: true, sourceId: found.row.source_id, via: "page" };
      return {
        ok: false,
        reason: `No source found for this story. Its site is not on the outlet list, and no source row has url_norm "${plan.urlNorm}". Add a source row for this page (publisher, type, lean), then approve again. ${NO_SOURCE_RULE}`,
      };
    }
    case "none":
      return {
        ok: false,
        reason: `This story's URL could not be normalised, so no source can be found for it. ${NO_SOURCE_RULE}`,
      };
  }
}
```

Nothing else in the route changes: `failClosed` already records `apply_error` and keeps the item pending; the insert still writes `source_id: source.sourceId`; the audit still records `source: { source_id, via }`.

- [ ] **Step 10: Run the tests to verify they pass**

```bash
"$NODE" scripts/verify-news-enqueue.ts; echo "exit=$?"
"$NODE" scripts/verify-official-sources.ts > /dev/null; echo "official exit=$?"
"$NODE" scripts/verify-admin-effects.ts > /dev/null; echo "effects exit=$?"
"$NODE" node_modules/typescript/bin/tsc --noEmit; echo "tsc exit=$?"
```

Expected: `verify-news-enqueue: OK — the relation tier reaches the payload for both tiers, ...`, `exit=0`; `official exit=0`; `effects exit=0`; tsc prints nothing, `tsc exit=0`.

- [ ] **Step 11: Mutation-check the guards**

Break each, run `"$NODE" scripts/verify-news-enqueue.ts 2>&1 | grep FAIL | head -3`, see the named FAIL, restore:
1. In `planGiven`, change `if (!outlet || outlet.domain !== domain) {` to `if (!outlet) {`. Expected: `FAIL an outlet: id on another outlet's URL is refused, naming both`.
2. Change `if (row.item_type !== "election_news") return refuse(` to `if (false) return refuse(`. Expected: `FAIL an official: id is refused on candidate_news`.
3. In `givenPageRowProblem`, change `if (plan.pageUrlNorm === null || rowUrlNorm === plan.pageUrlNorm) return null;` to `return null;`. Expected: `FAIL a src_* id whose row has a different url_norm is refused, naming both pages`.
4. In the route, delete the line `      if (problem) return { ok: false, reason: problem };` that follows `givenPageRowProblem(...)`. Expected: `FAIL a given page-row id is checked against the story's url_norm`.

After restoring, the script prints its OK line and has 0 FAIL lines.

- [ ] **Step 12: Lint and commit**

```bash
"$NODE" node_modules/eslint/bin/eslint.js src/lib/news-enqueue.ts "src/app/api/admin/review/[id]/decision/route.ts" scripts/verify-news-enqueue.ts
git add src/lib/news-enqueue.ts "src/app/api/admin/review/[id]/decision/route.ts" scripts/verify-news-enqueue.ts
git commit -F - <<'EOF'
Approve path: check every given source id against the story's URL

planSourceAttribution now takes the row and refuses a given id that does
not fit it (news-source-integrity spec §3.2.2, D7): outlet:<domain> only on
that outlet's URL; official:<domain> only on an election_news item with no
candidate and no race, on that body's own site; a src_* page row only for
its own url_norm. There is no official fall-through, so a government URL
with no given id still needs its own page row, and "Official document" can
never attach to a candidate story.

The route's ensureOutletRow becomes ensureListedRow: upsert-if-absent on
url_norm, read back, and refuse an official row read back with another
type or lean. Refusals keep the item pending with the reason, as before.

verify-news-enqueue covers each refusal, every swept outlet's payload, the
eight R3 rows 0054 will move into review, and fakeDb takes readonly rows
so the file passes a strict standalone type-check.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

Expected: eslint prints nothing; one commit.

---

### Task 3: R3's queue rules (pure)

**Files:**
- Create: `src/lib/election-news.ts` (the pure part)
- Create: `scripts/verify-election-news.ts` (sections 1 to 5)

**Interfaces:**
- Consumes: `officialForUrl`, `officialSourceIdFor` (Task 1); `OUTLETS`, `outletForUrl` (`src/lib/news-sources.ts`); `COVERED_FIPS` (`src/lib/candidate-leads.ts:17`); `urlNorm` (`src/lib/brief-rows.ts:219`); `ManualNewsPayloadSchema`, `type ManualNewsPayload` (`src/types/admin.ts:37`, `:225`).
- Produces:
  - `MAX_ELECTION_BATCH = 25`
  - `type ElectionScope = { county_fips: string } | { statewide: true }`
  - `interface ElectionNewsItem { title: string; summary: string; url: string; published_at: string; scope: ElectionScope }`
  - `batchProblem(raw: unknown): string | null`
  - `interface PageRow { source_id: string; url_norm: string; type: string; lean_tag: string }`
  - `interface QueueContext { pageRows: ReadonlyMap<string, PageRow>; storedUrls: ReadonlySet<string>; queuedUrls: ReadonlySet<string> }`
  - `interface ElectionQueueRow { kind: "manual_news"; source: "agent:R3"; status: "pending"; payload: ManualNewsPayload }`
  - `interface QueueNotice { index: number; url: string; reason: string }`
  - `type ElectionQueuePlan = { ok: true; rows: ElectionQueueRow[]; skipped: QueueNotice[]; dropped: QueueNotice[] } | { ok: false; error: string }`
  - `planElectionQueue(items: readonly ElectionNewsItem[], ctx: QueueContext): ElectionQueuePlan`
  - Skip reasons, exactly: `"already in news_item"`, `"already in a manual_news review item"`, `"repeats an earlier item in this batch"`.

- [ ] **Step 1: Write the failing test**

Create `scripts/verify-election-news.ts`:

```ts
/* Guardrail for R3's queue (src/lib/election-news.ts, scripts/election-news.ts;
   spec docs/superpowers/specs/2026-10-08-news-source-integrity-design.md §3.2.3).

   What it pins:
     1. Every malformed batch is refused whole, naming the item's index.
     2. A URL off the official list, or on an outlet, refuses the batch.
     3. A page row recorded primary_doc / N/A backs its page; one recorded as
        anything else drops the item; any other item carries official:<domain>.
     4. A URL already stored, already queued in any status, or repeated in the
        batch is skipped.
     5. Every queued row parses with ManualNewsPayloadSchema, carries a
        source_id, and is a pending manual_news item from agent:R3.
     6. --dry-run inserts nothing; the reads are filtered by the batch's URLs;
        a read or insert error writes nothing and exits 1.
     7. The CLI writes nothing but review_item rows.

   Pure and offline: an in-memory stand-in for the Supabase client, no
   network. Run: node scripts/verify-election-news.ts */

import {
  MAX_ELECTION_BATCH,
  batchProblem,
  planElectionQueue,
  type ElectionNewsItem,
  type PageRow,
  type QueueContext,
} from "../src/lib/election-news.ts";
import { ManualNewsPayloadSchema } from "../src/types/admin.ts";

let failures = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) return;
  failures++;
  console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
}

const item = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  title: "Early voting sites and hours for the general election",
  summary: "The Supervisor of Elections lists 33 early voting sites, open Oct. 19 to Nov. 1.",
  url: "https://www.browardvotes.gov/voting-methods/early-voting",
  published_at: "2026-10-05",
  scope: { county_fips: "12011" },
  ...over,
});

/* ---- 1 and 2. refused batches ------------------------------------------- */
const withoutSummary = item();
delete withoutSummary.summary;
for (const [label, raw, want] of [
  ["not an array", { items: [] }, "the batch is not an array of items"],
  [`${MAX_ELECTION_BATCH + 1} items`, Array.from({ length: MAX_ELECTION_BATCH + 1 }, () => item()), "over the 25-item cap"],
  ["an item that is not an object", [item(), "x"], "item 1 is not an object"],
  ["an unknown field", [item({ metro: "miami" })], "item 0: unknown field metro"],
  ["a missing field", [withoutSummary], "item 0: missing field summary"],
  ["a non-string", [item({ title: 7 })], "item 0: title must be a string"],
  ["a null summary", [item({ summary: null })], "item 0: summary must be a string"],
  ["an unparseable date", [item({ published_at: "next Tuesday" })], "item 0: published_at"],
  ["a URL that is not http(s)", [item({ url: "ftp://www.browardvotes.gov/x" })], "item 0: url must be an http(s) URL"],
  ["a URL on an outlet", [item({ url: "https://www.wlrn.org/2026/10/05/early-voting" })], "item 0: https://www.wlrn.org/2026/10/05/early-voting is on the outlet list"],
  ["a URL off the official list", [item({ url: "https://www.courtlistener.com/opinion/1/x/" })], "is not on the official-source list"],
  ["a metro scope", [item({ scope: { metro: "fort_lauderdale" } })], "there is no metro scope"],
  ["a scope with two forms", [item({ scope: { county_fips: "12011", statewide: true } })], "scope must be"],
  ["statewide: false", [item({ scope: { statewide: false } })], "scope.statewide must be true"],
  ["a county outside the four", [item({ scope: { county_fips: "12099" } })], "12099 is not a covered county"],
  ["a county scope on another county's entry", [item({ scope: { county_fips: "12057" } })], "differs from the publisher's county 12011"],
  ["a bad item after a good one", [item(), item({ url: "https://www.wlrn.org/x" })], "item 1:"],
] as const) {
  const got = batchProblem(raw);
  check(`${label} refuses the batch, naming the problem`, got !== null && got.includes(want), String(got));
}
check("a well-formed batch has no problem", batchProblem([item(), item({ url: "https://dos.fl.gov/elections/x", scope: { statewide: true } })]) === null,
  String(batchProblem([item()])));
check("a county scope on a statewide body is accepted (PR B tightens it)",
  batchProblem([item({ url: "https://dos.fl.gov/elections/x", scope: { county_fips: "12086" } })]) === null);
check("an empty batch has no problem", batchProblem([]) === null);

/* ---- 3, 4 and 5. the plan ----------------------------------------------- */
const EMPTY: QueueContext = { pageRows: new Map(), storedUrls: new Set(), queuedUrls: new Set() };
const ctx = (over: Partial<QueueContext> = {}): QueueContext => ({ ...EMPTY, ...over });
const pageRow = (url_norm: string, type: string, lean_tag: string, source_id = `src_${type}`): PageRow =>
  ({ source_id, url_norm, type, lean_tag });
const plan = (items: Record<string, unknown>[], c: QueueContext = EMPTY) =>
  planElectionQueue(items as unknown as ElectionNewsItem[], c);

{
  const p = plan([item()]);
  check("an item with no page row carries official:<domain>",
    p.ok && p.rows.length === 1 && p.rows[0].payload.source_id === "official:browardvotes.gov", JSON.stringify(p));
  const doc = plan([item()], ctx({
    pageRows: new Map([["www.browardvotes.gov/voting-methods/early-voting",
      pageRow("www.browardvotes.gov/voting-methods/early-voting", "primary_doc", "N/A", "src_gov_broward_ev")]]),
  }));
  check("a primary_doc / N/A page row backs its own page",
    doc.ok && doc.rows[0]?.payload.source_id === "src_gov_broward_ev", JSON.stringify(doc));
  const advocacy = plan([item()], ctx({
    pageRows: new Map([["www.browardvotes.gov/voting-methods/early-voting",
      pageRow("www.browardvotes.gov/voting-methods/early-voting", "opinion", "N/A")]]),
  }));
  check("a page row recorded as opinion drops the item, with the reason",
    advocacy.ok && advocacy.rows.length === 0 && advocacy.dropped.length === 1 &&
      advocacy.dropped[0].index === 0 && advocacy.dropped[0].reason.includes("opinion / N/A"), JSON.stringify(advocacy));
}

{
  const url = (item().url as string);
  for (const [label, c] of [
    ["already in news_item", ctx({ storedUrls: new Set([url]) })],
    ["already in a manual_news review item", ctx({ queuedUrls: new Set([url]) })],
  ] as const) {
    const p = plan([item()], c);
    check(`a URL ${label} is skipped, not refused`,
      p.ok && p.rows.length === 0 && p.skipped.length === 1 && p.skipped[0].reason === label, JSON.stringify(p));
  }
  const twice = plan([item(), item({ title: "Same page, second time" })]);
  check("a URL earlier in the batch is skipped",
    twice.ok && twice.rows.length === 1 && twice.skipped.length === 1 && twice.skipped[0].index === 1, JSON.stringify(twice));
}

{
  const p = plan([
    item(),
    item({ url: "https://dos.fl.gov/elections/for-voters/election-dates/", scope: { statewide: true }, summary: "  " }),
    item({ url: "https://www.votemiamidade.gov/news/ev", scope: { county_fips: "12086" } }),
  ]);
  check("three good items give three rows", p.ok && p.rows.length === 3, JSON.stringify(p));
  if (p.ok) {
    for (const [n, r] of p.rows.entries()) {
      check(`row ${n} parses with ManualNewsPayloadSchema`, ManualNewsPayloadSchema.safeParse(r.payload).success);
      check(`row ${n} is a pending manual_news item from agent:R3`,
        r.kind === "manual_news" && r.source === "agent:R3" && r.status === "pending");
      check(`row ${n} carries a source_id`, typeof r.payload.source_id === "string" && r.payload.source_id.length > 0);
      check(`row ${n} is election_news with no candidate, race or metro`,
        r.payload.item_type === "election_news" && !r.payload.candidate_id && !r.payload.race_id && !r.payload.metro,
        JSON.stringify(r.payload));
    }
    check("a county item carries county_fips, not statewide",
      p.rows[0].payload.county_fips === "12011" && !p.rows[0].payload.statewide);
    check("a statewide item carries statewide, not a county",
      p.rows[1].payload.statewide === true && !p.rows[1].payload.county_fips);
    check("a blank summary is stored as null", p.rows[1].payload.summary === null, String(p.rows[1].payload.summary));
    check("published_at is stored as an ISO timestamp",
      p.rows[0].payload.published_at === "2026-10-05T00:00:00.000Z", p.rows[0].payload.published_at);
    check("the path-scoped Division entry gives official:dos.fl.gov/elections",
      p.rows[1].payload.source_id === "official:dos.fl.gov/elections", String(p.rows[1].payload.source_id));
  }
  const blank = plan([item({ title: "   " })]);
  check("an item the schema refuses refuses the batch", !blank.ok && blank.error.startsWith("item 0:"), JSON.stringify(blank));
}

if (failures > 0) {
  console.error(`\nverify-election-news: ${failures} failure(s)`);
  process.exit(1);
}
console.log(
  "verify-election-news: OK — malformed batches are refused whole, every queued row is a pending agent:R3 manual_news item with a checked source, skips and drops are reported, and --dry-run writes nothing",
);
```

(The header lists all seven points; sections 6 and 7 arrive in Task 4.)

- [ ] **Step 2: Run the test to verify it fails**

```bash
"$NODE" scripts/verify-election-news.ts; echo "exit=$?"
```

Expected: `Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../src/lib/election-news.ts'`, `exit=1`.

- [ ] **Step 3: Create `src/lib/election-news.ts` with the pure rules**

```ts
/* R3's queue: election notices from official sources become PENDING review
   items, and nothing else (spec
   docs/superpowers/specs/2026-10-08-news-source-integrity-design.md §3.2.3,
   decisions D5, D6, D7).

   R3, a scheduled Claude agent, reads the government bodies' own pages
   (src/lib/official-sources.ts) and hands scripts/election-news.ts what it
   found. Everything after that reading is decided here: what a well-formed
   batch is, which source each item carries, what is already stored or queued,
   and what the payload is. The I/O is three filtered reads and one insert
   through an injected client, so scripts/verify-election-news.ts proves the
   whole contract offline.

   Nothing here publishes. A queued item reaches a voter only once a person
   approves it in /admin, and the approve path checks its source against its
   URL again (planSourceAttribution in news-enqueue.ts).

   Not here (the agent-retrofit spec's PR B extends this file): the `context`
   step, scope from the publisher, the candidate-name drop, the
   case-for-or-against drop, the date window and the lint drop.

   Relative imports with the extension: plain-Node scripts import this. */

import { urlNorm } from "./brief-rows.ts";
import { COVERED_FIPS } from "./candidate-leads.ts";
import { OUTLETS, outletForUrl } from "./news-sources.ts";
import { officialForUrl, officialSourceIdFor } from "./official-sources.ts";
import { ManualNewsPayloadSchema, type ManualNewsPayload } from "../types/admin.ts";

/** The most items one `queue` batch may carry. A weekly read of four
    Supervisors and the statewide bodies finds a handful; far past that is a
    runaway or an injected list. */
export const MAX_ELECTION_BATCH = 25;

const FIELDS = ["title", "summary", "url", "published_at", "scope"] as const;
const TEXT_FIELDS = ["title", "summary", "url", "published_at"] as const;

/** County or statewide. There is no metro form: the five legacy metro rows
    stay as they are, and new items name a county. */
export type ElectionScope = { county_fips: string } | { statewide: true };

/** One item as R3 hands it over. */
export interface ElectionNewsItem {
  title: string;
  summary: string;
  url: string;
  published_at: string;
  scope: ElectionScope;
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

const SCOPE_FORMS = 'scope must be { "county_fips": "<5 digits>" } or { "statewide": true }';

function scopeProblem(scope: unknown, entryCounty: string | null): string | null {
  if (!isRecord(scope)) return SCOPE_FORMS;
  const keys = Object.keys(scope);
  if (keys.length === 1 && keys[0] === "statewide") {
    return scope.statewide === true ? null : "scope.statewide must be true";
  }
  if (keys.length === 1 && keys[0] === "county_fips") {
    const fips = scope.county_fips;
    if (typeof fips !== "string" || !/^\d{5}$/.test(fips)) return "scope.county_fips must be 5 digits";
    if (!COVERED_FIPS.has(fips)) return `scope.county_fips ${fips} is not a covered county`;
    if (entryCounty !== null && entryCounty !== fips) {
      return `scope.county_fips ${fips} differs from the publisher's county ${entryCounty}`;
    }
    return null;
  }
  return `${SCOPE_FORMS}; there is no metro scope`;
}

/** R3's items are untrusted input. The first problem, naming the item's index
    (0-based, as candidate-leads.ts `mentionProblem` does), or null when the
    whole batch is well formed. The caller refuses the whole batch on a
    problem, so a run never leaves a partial queue. */
export function batchProblem(raw: unknown): string | null {
  if (!Array.isArray(raw)) return "the batch is not an array of items";
  if (raw.length > MAX_ELECTION_BATCH) {
    return `batch of ${raw.length} items is over the ${MAX_ELECTION_BATCH}-item cap`;
  }
  for (const [i, item] of raw.entries()) {
    if (!isRecord(item)) return `item ${i} is not an object`;
    const unknown = Object.keys(item).filter((k) => !(FIELDS as readonly string[]).includes(k));
    if (unknown.length > 0) return `item ${i}: unknown field ${unknown.join(", ")}`;
    for (const f of FIELDS) if (!(f in item)) return `item ${i}: missing field ${f}`;
    for (const f of TEXT_FIELDS) if (typeof item[f] !== "string") return `item ${i}: ${f} must be a string`;
    const url = item.url as string;
    const published = item.published_at as string;
    if (Number.isNaN(Date.parse(published))) return `item ${i}: published_at "${published}" is not a date`;
    if (!isHttpUrl(url)) return `item ${i}: url must be an http(s) URL`;
    const outlet = outletForUrl(url, OUTLETS);
    if (outlet) return `item ${i}: ${url} is on the outlet list (${outlet.domain}); R3 queues official sources only`;
    const official = officialForUrl(url);
    if (!official) return `item ${i}: ${url} is not on the official-source list (src/lib/official-sources.ts)`;
    const scope = scopeProblem(item.scope, official.countyFips);
    if (scope) return `item ${i}: ${scope}`;
  }
  return null;
}

/** A `source` row already recorded for one of the batch's pages. */
export interface PageRow {
  source_id: string;
  url_norm: string;
  type: string;
  lean_tag: string;
}

/** What the database already holds for this batch's URLs. */
export interface QueueContext {
  /** `source` rows keyed by url_norm. */
  pageRows: ReadonlyMap<string, PageRow>;
  /** URLs in news_item, under any candidate or none. */
  storedUrls: ReadonlySet<string>;
  /** URLs in a manual_news review item of any status. */
  queuedUrls: ReadonlySet<string>;
}

export interface ElectionQueueRow {
  kind: "manual_news";
  source: "agent:R3";
  status: "pending";
  payload: ManualNewsPayload;
}

/** A skipped or dropped item: its index in the batch and why. */
export interface QueueNotice {
  index: number;
  url: string;
  reason: string;
}

export type ElectionQueuePlan =
  | { ok: true; rows: ElectionQueueRow[]; skipped: QueueNotice[]; dropped: QueueNotice[] }
  | { ok: false; error: string };

/** The rows `election-news.ts queue` would insert, from a batch that passed
    batchProblem. Per item, in order:
      1. Source. A page row already recorded for this URL backs it when it is
         `primary_doc` / `N/A`; one recorded as anything else is DROPPED (an
         agency's advocacy page keeps its true type, D7). With no page row,
         the item carries `official:<domain>`.
      2. Skip (not an error): a URL already in news_item, in a manual_news
         item of any status, or earlier in this batch.
      3. Build the payload and parse it with the console's own schema. One
         failure refuses the batch. */
export function planElectionQueue(items: readonly ElectionNewsItem[], ctx: QueueContext): ElectionQueuePlan {
  const rows: ElectionQueueRow[] = [];
  const skipped: QueueNotice[] = [];
  const dropped: QueueNotice[] = [];
  const inBatch = new Set<string>();

  for (const [index, item] of items.entries()) {
    const official = officialForUrl(item.url);
    if (!official) return { ok: false, error: `item ${index}: ${item.url} is not on the official-source list` };

    const norm = urlNorm(item.url);
    const page = norm === null ? undefined : ctx.pageRows.get(norm);
    if (page && (page.type !== "primary_doc" || page.lean_tag !== "N/A")) {
      dropped.push({
        index,
        url: item.url,
        reason: `this page is recorded as ${page.type} / ${page.lean_tag}, not an official notice`,
      });
      continue;
    }
    const sourceId = page ? page.source_id : officialSourceIdFor(official.domain);

    const skip = ctx.storedUrls.has(item.url)
      ? "already in news_item"
      : ctx.queuedUrls.has(item.url)
        ? "already in a manual_news review item"
        : inBatch.has(item.url)
          ? "repeats an earlier item in this batch"
          : null;
    inBatch.add(item.url);
    if (skip) {
      skipped.push({ index, url: item.url, reason: skip });
      continue;
    }

    const parsed = ManualNewsPayloadSchema.safeParse({
      item_type: "election_news",
      title: item.title,
      summary: item.summary.trim() === "" ? null : item.summary,
      url: item.url,
      published_at: new Date(item.published_at).toISOString(),
      ...("statewide" in item.scope ? { statewide: true } : { county_fips: item.scope.county_fips }),
      source_id: sourceId,
    });
    if (!parsed.success) {
      return {
        ok: false,
        error: `item ${index}: ${parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`,
      };
    }
    rows.push({ kind: "manual_news", source: "agent:R3", status: "pending", payload: parsed.data });
  }
  return { ok: true, rows, skipped, dropped };
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
"$NODE" scripts/verify-election-news.ts; echo "exit=$?"
```

Expected: `verify-election-news: OK — malformed batches are refused whole, ...`, `exit=0`.

- [ ] **Step 5: Mutation-check the guards**

Break each, run `"$NODE" scripts/verify-election-news.ts 2>&1 | grep FAIL | head -2`, see the named FAIL, restore:
1. In `batchProblem`, change `if (outlet) return` to `if (false && outlet) return`. Expected: `FAIL a URL on an outlet refuses the batch, naming the problem`.
2. In `planElectionQueue`, change `if (page && (page.type !== "primary_doc" || page.lean_tag !== "N/A")) {` to `if (page && false) {`. Expected: `FAIL a page row recorded as opinion drops the item, with the reason`.
3. In `scopeProblem`, delete the `if (entryCounty !== null && entryCounty !== fips) { ... }` block. Expected: `FAIL a county scope on another county's entry refuses the batch, naming the problem`.

After restoring, 0 FAIL lines.

- [ ] **Step 6: Lint and commit**

```bash
"$NODE" node_modules/eslint/bin/eslint.js src/lib/election-news.ts scripts/verify-election-news.ts
"$NODE" node_modules/typescript/bin/tsc --noEmit
git add src/lib/election-news.ts scripts/verify-election-news.ts
git commit -F - <<'EOF'
R3's queue: the batch and per-item rules

src/lib/election-news.ts decides what R3 may queue (news-source-integrity
spec §3.2.3): at most 25 items of exactly { title, summary, url,
published_at, scope }, scope a covered county or statewide and never a
metro, every URL on the official list and none on an outlet. One bad item
refuses the batch, naming its index.

Per item: a page row recorded primary_doc / N/A backs its page, a page
recorded as anything else is dropped (an agency's advocacy page keeps its
true type), and any other item carries official:<domain>. A URL already
stored, already queued in any status, or repeated in the batch is
skipped. Every row is a pending manual_news item from agent:R3 that
parses with ManualNewsPayloadSchema.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 4: R3's queue reads, write and CLI

**Files:**
- Modify: `src/lib/election-news.ts` (one import line; append the I/O at the end)
- Create: `scripts/election-news.ts`
- Modify: `scripts/verify-election-news.ts` (imports; sections 6 and 7 before the final summary)

**Interfaces:**
- Consumes (Task 3): `batchProblem`, `planElectionQueue`, `ElectionNewsItem`, `QueueContext`, `PageRow`, `ElectionQueueRow`, `QueueNotice`; `loadEnvLocal(scriptUrl: string): string | null` (`scripts/env-local.ts:21`).
- Produces:
  - `readQueueContext(db: SupabaseClient, items: readonly ElectionNewsItem[]): Promise<QueueContext>` (throws on a read error)
  - `interface QueueOutcome { exitCode: 0 | 1; output: { rows: ElectionQueueRow[]; skipped: QueueNotice[]; dropped: QueueNotice[] } | null; line: string }`
  - `runElectionQueue(db: SupabaseClient, raw: unknown, opts: { dryRun: boolean }): Promise<QueueOutcome>`
  - stderr lines, exactly: `would queue N, skipped S, dropped D`, `queued N, skipped S, dropped D`, and `election-news: batch refused, nothing written: <problem>` for a refusal.
  - CLI: `node scripts/election-news.ts queue [--dry-run] < items.json`, exit 0 / 1 / 2.

- [ ] **Step 1: Extend the test imports**

In `scripts/verify-election-news.ts`, replace:

```ts
import {
  MAX_ELECTION_BATCH,
  batchProblem,
  planElectionQueue,
  type ElectionNewsItem,
  type PageRow,
  type QueueContext,
} from "../src/lib/election-news.ts";
```

with:

```ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  MAX_ELECTION_BATCH,
  batchProblem,
  planElectionQueue,
  runElectionQueue,
  type ElectionNewsItem,
  type PageRow,
  type QueueContext,
} from "../src/lib/election-news.ts";
```

- [ ] **Step 2: Add sections 6 and 7**

In `scripts/verify-election-news.ts`, insert directly above the line `if (failures > 0) {`:

```ts
/* ---- 6. the run, against an in-memory client ---------------------------- */
type Row = Record<string, unknown>;
interface Read { table: string; columns: string; filters: [op: string, col: string, value: unknown][] }
function get(row: Row, col: string): unknown {
  const [head, key] = col.split("->>");
  const v = row[head];
  return key === undefined ? v : (v as Row | null)?.[key];
}
function fakeDb(tables: Record<string, Row[]>, fail: { read?: string; insert?: boolean } = {}) {
  const reads: Read[] = [];
  const inserted: Row[] = [];
  const from = (table: string) => {
    const read: Read = { table, columns: "", filters: [] };
    const q = {
      select: (columns: string) => { read.columns = columns; reads.push(read); return q; },
      eq: (col: string, v: unknown) => { read.filters.push(["eq", col, v]); return q; },
      in: (col: string, vs: unknown[]) => { read.filters.push(["in", col, vs]); return q; },
      insert: async (rows: Row[]) => {
        if (fail.insert) return { error: { message: "insert refused" } };
        inserted.push(...rows);
        return { error: null };
      },
      then: (done: (v: { data: Row[] | null; error: { message: string } | null }) => unknown) => {
        if (fail.read === table) return done({ data: null, error: { message: `${table} unavailable` } });
        const keep = (r: Row) => read.filters.every(([op, col, v]) =>
          op === "eq" ? get(r, col) === v : (v as unknown[]).includes(get(r, col)));
        return done({ data: (tables[table] ?? []).filter(keep), error: null });
      },
    };
    return q;
  };
  return { db: { from } as unknown as SupabaseClient, reads, inserted };
}

const good = [item(), item({ url: "https://dos.fl.gov/elections/for-voters/election-dates/", scope: { statewide: true } })];
{
  const f = fakeDb({});
  const r = await runElectionQueue(f.db, good, { dryRun: true });
  check("--dry-run inserts nothing", f.inserted.length === 0, JSON.stringify(f.inserted));
  check("--dry-run still reports what it would queue",
    r.exitCode === 0 && r.output?.rows.length === 2 && r.line === "would queue 2, skipped 0, dropped 0", JSON.stringify(r));
}
{
  const f = fakeDb({});
  const r = await runElectionQueue(f.db, good, { dryRun: false });
  check("a real run inserts exactly the planned rows into review_item",
    r.exitCode === 0 && f.inserted.length === 2 && r.line === "queued 2, skipped 0, dropped 0", JSON.stringify(r));
  const reviewRead = f.reads.find((x) => x.table === "review_item");
  check("the review_item read is filtered to manual_news and the batch's URLs",
    reviewRead !== undefined &&
      reviewRead.filters.some(([op, col, v]) => op === "eq" && col === "kind" && v === "manual_news") &&
      reviewRead.filters.some(([op, col]) => op === "in" && col === "payload->>url"),
    JSON.stringify(reviewRead));
  const newsRead = f.reads.find((x) => x.table === "news_item");
  check("the news_item read is filtered by URL", newsRead?.filters.some(([op, col]) => op === "in" && col === "url") === true,
    JSON.stringify(newsRead));
  const sourceRead = f.reads.find((x) => x.table === "source");
  check("the source read is filtered by url_norm",
    sourceRead?.filters.some(([op, col]) => op === "in" && col === "url_norm") === true, JSON.stringify(sourceRead));
  check("every read is filtered, in chunks of at most 200",
    f.reads.every((x) => x.filters.some(([op, , v]) => op === "in" && (v as unknown[]).length <= 200)), JSON.stringify(f.reads));
}
{
  const f = fakeDb({
    news_item: [{ url: good[0].url }],
    review_item: [{ kind: "manual_news", status: "rejected", payload: { url: good[1].url } }],
  });
  const r = await runElectionQueue(f.db, good, { dryRun: false });
  check("a run where everything is already handled exits 0 and queues nothing",
    r.exitCode === 0 && f.inserted.length === 0 && r.line === "queued 0, skipped 2, dropped 0", JSON.stringify(r));
}
{
  const f = fakeDb({ review_item: [{ kind: "candidate_lead", status: "pending", payload: { url: good[0].url } }] });
  const r = await runElectionQueue(f.db, good, { dryRun: false });
  check("only manual_news items count as already queued", r.exitCode === 0 && f.inserted.length === 2, JSON.stringify(r));
}
for (const table of ["source", "news_item", "review_item"]) {
  const f = fakeDb({}, { read: table });
  const r = await runElectionQueue(f.db, good, { dryRun: false });
  check(`a ${table} read error exits 1 and writes nothing`,
    r.exitCode === 1 && r.output === null && f.inserted.length === 0 && r.line.includes(`${table} unavailable`), JSON.stringify(r));
}
{
  const f = fakeDb({}, { insert: true });
  const r = await runElectionQueue(f.db, good, { dryRun: false });
  check("an insert error exits 1", r.exitCode === 1 && r.output === null && r.line.includes("insert refused"), JSON.stringify(r));
}
{
  const f = fakeDb({});
  const r = await runElectionQueue(f.db, [item({ scope: { metro: "miami" } })], { dryRun: false });
  check("a refused batch exits 1 before any read",
    r.exitCode === 1 && f.reads.length === 0 && f.inserted.length === 0 && r.line.startsWith("election-news: batch refused"),
    JSON.stringify(r));
}

/* ---- 7. the CLI writes nothing but review_item -------------------------- */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "");
const lib = strip(readFileSync(resolve(import.meta.dirname, "..", "src/lib/election-news.ts"), "utf8"));
const cli = strip(readFileSync(resolve(import.meta.dirname, "election-news.ts"), "utf8"));
check("the library's one write is an insert into review_item",
  (lib.match(/\.insert\(/g) ?? []).length === 1 && /from\("review_item"\)\.insert\(plan\.rows\)/.test(lib));
check("the library never updates, upserts or deletes",
  !/\.(update|upsert|delete)\(/.test(lib));
check("the CLI writes nothing itself and goes through runElectionQueue",
  !/\.(insert|update|upsert|delete)\(/.test(cli) && /runElectionQueue\(/.test(cli));
check("the CLI refuses an unknown argument instead of writing", /fail\(2, `queue: unknown argument/.test(cli));

```

- [ ] **Step 3: Run the test to verify it fails**

```bash
"$NODE" scripts/verify-election-news.ts; echo "exit=$?"
```

Expected: `SyntaxError: The requested module '../src/lib/election-news.ts' does not provide an export named 'runElectionQueue'`, `exit=1`.

- [ ] **Step 4: Add the I/O to `src/lib/election-news.ts`**

Add this import as the first import line (above `import { urlNorm } from "./brief-rows.ts";`):

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
```

Append at the end of the file:

```ts

const CHUNK = 200;

function chunks<T>(list: readonly T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += CHUNK) out.push(list.slice(i, i + CHUNK));
  return out;
}

/** The three reads, each filtered to this batch's URLs in chunks of 200, so a
    response is bounded by the batch and never by the size of the table
    (news-source-integrity §3.7). Throws on a read error: a partial read would
    queue a story an operator already decided. */
export async function readQueueContext(
  db: SupabaseClient,
  items: readonly ElectionNewsItem[],
): Promise<QueueContext> {
  const urls = [...new Set(items.map((i) => i.url))];
  const norms = [...new Set(urls.map(urlNorm).filter((n): n is string => n !== null))];

  const pageRows = new Map<string, PageRow>();
  for (const chunk of chunks(norms)) {
    const { data, error } = await db
      .from("source")
      .select("source_id, url_norm, type, lean_tag")
      .in("url_norm", chunk);
    if (error) throw new Error(`could not read source rows: ${error.message}`);
    for (const r of (data ?? []) as PageRow[]) pageRows.set(r.url_norm, r);
  }

  const storedUrls = new Set<string>();
  for (const chunk of chunks(urls)) {
    const { data, error } = await db.from("news_item").select("url").in("url", chunk);
    if (error) throw new Error(`could not read news_item: ${error.message}`);
    for (const r of (data ?? []) as { url: string }[]) storedUrls.add(r.url);
  }

  const queuedUrls = new Set<string>();
  for (const chunk of chunks(urls)) {
    const { data, error } = await db
      .from("review_item")
      .select("payload")
      .eq("kind", "manual_news")
      .in("payload->>url", chunk);
    if (error) throw new Error(`could not read review_item: ${error.message}`);
    for (const r of (data ?? []) as { payload: { url?: string } | null }[]) {
      if (r.payload?.url) queuedUrls.add(r.payload.url);
    }
  }
  return { pageRows, storedUrls, queuedUrls };
}

export interface QueueOutcome {
  /** 0 for a complete run, 0 queued included; 1 when nothing was written. */
  exitCode: 0 | 1;
  /** The stdout object, or null when the batch was refused or a read or the
      insert failed. */
  output: { rows: ElectionQueueRow[]; skipped: QueueNotice[]; dropped: QueueNotice[] } | null;
  /** The one stderr line. */
  line: string;
}

/** The whole `queue` run against an injected client. With `dryRun` it still
    reads (to report skips) and writes nothing; otherwise the only write is one
    insert of pending manual_news review items, source 'agent:R3'. */
export async function runElectionQueue(
  db: SupabaseClient,
  raw: unknown,
  opts: { dryRun: boolean },
): Promise<QueueOutcome> {
  const refused = (why: string): QueueOutcome => ({
    exitCode: 1,
    output: null,
    line: `election-news: batch refused, nothing written: ${why}`,
  });
  const problem = batchProblem(raw);
  if (problem) return refused(problem);
  const items = raw as ElectionNewsItem[];

  let ctx: QueueContext;
  try {
    ctx = await readQueueContext(db, items);
  } catch (err) {
    return { exitCode: 1, output: null, line: `election-news: ${(err as Error).message}; nothing written` };
  }
  const plan = planElectionQueue(items, ctx);
  if (!plan.ok) return refused(plan.error);

  const output = { rows: plan.rows, skipped: plan.skipped, dropped: plan.dropped };
  const counts = `${plan.rows.length}, skipped ${plan.skipped.length}, dropped ${plan.dropped.length}`;
  if (opts.dryRun) return { exitCode: 0, output, line: `would queue ${counts}` };
  if (plan.rows.length > 0) {
    const { error } = await db.from("review_item").insert(plan.rows);
    if (error) return { exitCode: 1, output: null, line: `election-news: could not queue: ${error.message}; nothing written` };
  }
  return { exitCode: 0, output, line: `queued ${counts}` };
}
```

PostgREST accepts the JSON path `payload->>url` as a filter column, and supabase-js quotes `in` values that contain commas or parentheses.

- [ ] **Step 5: Create the CLI `scripts/election-news.ts`**

```ts
/* R3's queue: election notices from official sources become pending review
   items (spec docs/superpowers/specs/2026-10-08-news-source-integrity-design.md
   §3.2.3). The rules live in src/lib/election-news.ts.

     queue [--dry-run]   items on stdin, a JSON array of at most 25
                         { title, summary, url, published_at, scope }, where
                         scope is { "county_fips": "<5 digits>" } or
                         { "statewide": true }. Inserts one pending manual_news
                         review item (source 'agent:R3') per new item.
                         --dry-run writes nothing.

   stdout: one JSON object, { rows, skipped, dropped }. stderr: one line,
   "queued N, skipped S, dropped D" ("would queue ..." under --dry-run).
   Exit 0: a complete run, 0 queued included. 1: the batch was refused, or a
   read or the insert failed; nothing was written. 2: a configuration error.

   Nothing here publishes: every item waits for a person in /admin. */

import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "./env-local.ts";
import { runElectionQueue } from "../src/lib/election-news.ts";

loadEnvLocal(import.meta.url);

const USAGE = "usage: election-news.ts queue [--dry-run] < items.json";

function fail(code: 1 | 2, message: string): never {
  console.error(`election-news: ${message}`);
  process.exit(code);
}

const [command, ...args] = process.argv.slice(2);
if (command !== "queue") fail(2, USAGE);
/* A typo such as --dryrun must stop the run, never fall through to writing. */
const unknown = args.filter((a) => a !== "--dry-run");
if (unknown.length > 0) fail(2, `queue: unknown argument(s) ${unknown.join(" ")}; ${USAGE}`);
const dryRun = args.includes("--dry-run");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey) fail(2, "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");

const text = await new Promise<string>((resolve, reject) => {
  let buf = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (c) => (buf += c));
  process.stdin.on("end", () => resolve(buf));
  process.stdin.on("error", reject);
});
if (!text.trim()) fail(1, "batch refused, nothing written: nothing on stdin");
let raw: unknown;
try {
  raw = JSON.parse(text);
} catch (err) {
  fail(1, `batch refused, nothing written: stdin is not valid JSON: ${String(err)}`);
}

const outcome = await runElectionQueue(createClient(supabaseUrl, serviceKey), raw, { dryRun });
if (outcome.output) console.log(JSON.stringify(outcome.output, null, 1));
console.error(outcome.line);
/* No process.exit after a large stdout write: it can cut a piped stream
   short. Set the code and let the process end on its own. */
process.exitCode = outcome.exitCode;
```

- [ ] **Step 6: Run the test to verify it passes**

```bash
"$NODE" scripts/verify-election-news.ts; echo "exit=$?"
```

Expected: `verify-election-news: OK — malformed batches are refused whole, every queued row is a pending agent:R3 manual_news item with a checked source, skips and drops are reported, and --dry-run writes nothing`, `exit=0`.

- [ ] **Step 7: Smoke-test the CLI's exit codes (no database contact)**

Each of these stops before any query. Never pipe a well-formed batch into the CLI: that would read, and without `--dry-run` write, the live database.

```bash
"$NODE" scripts/election-news.ts bogus; echo "exit=$?"
"$NODE" scripts/election-news.ts queue --dryrun; echo "exit=$?"
echo '{}' | "$NODE" scripts/election-news.ts queue --dry-run; echo "exit=$?"
```

Expected, in order (ignore Node's `MODULE_TYPELESS_PACKAGE_JSON` warning lines):
- `election-news: usage: election-news.ts queue [--dry-run] < items.json`, `exit=2`
- `election-news: queue: unknown argument(s) --dryrun; usage: election-news.ts queue [--dry-run] < items.json`, `exit=2`
- `election-news: batch refused, nothing written: the batch is not an array of items`, `exit=1` (refused by `batchProblem` before any read).

- [ ] **Step 8: Strict standalone type-check of the scripts**

`scripts/` is excluded from the project tsconfig. Check the four scripts this PR adds or edits with a throwaway config outside the repo that extends the project config (so `strict` and the `@/` paths reached through `src/types/app.ts` apply):

```bash
W=/Users/jsloth/Projects/kyv-build/newsA
SCRATCH="$(mktemp -d)"
cat > "$SCRATCH/tsconfig.scripts.json" <<EOF
{
  "extends": "$W/tsconfig.json",
  "compilerOptions": {
    "incremental": false,
    "target": "es2022",
    "lib": ["es2023", "dom"],
    "types": ["node"],
    "typeRoots": ["$W/node_modules/@types"],
    "plugins": []
  },
  "include": [],
  "files": [
    "$W/scripts/election-news.ts",
    "$W/scripts/verify-election-news.ts",
    "$W/scripts/verify-official-sources.ts",
    "$W/scripts/verify-news-enqueue.ts"
  ]
}
EOF
"$NODE" "$W/node_modules/typescript/bin/tsc" -p "$SCRATCH/tsconfig.scripts.json"; echo "exit=$?"
```

Expected: no output, `exit=0`.

- [ ] **Step 9: Mutation-check the guards**

Break each, run `"$NODE" scripts/verify-election-news.ts 2>&1 | grep FAIL | head -2`, see the named FAIL, restore:
1. In `runElectionQueue`, change the condition of the dry-run early return (the line starting `if (opts.dryRun) return`) to `opts.dryRun && false`. Expected: `FAIL --dry-run inserts nothing`.
2. Delete the line `      .eq("kind", "manual_news")` from `readQueueContext`. Expected: `FAIL the review_item read is filtered to manual_news and the batch's URLs`.
3. In `readQueueContext`, delete the line that throws "could not read news_item". Expected: `FAIL a news_item read error exits 1 and writes nothing`.

After restoring, 0 FAIL lines.

- [ ] **Step 10: Lint and commit**

```bash
"$NODE" node_modules/eslint/bin/eslint.js src/lib/election-news.ts scripts/election-news.ts scripts/verify-election-news.ts
"$NODE" node_modules/typescript/bin/tsc --noEmit
git add src/lib/election-news.ts scripts/election-news.ts scripts/verify-election-news.ts
git commit -F - <<'EOF'
R3's queue: the CLI, its filtered reads and its one write

scripts/election-news.ts queue [--dry-run] reads keys through
scripts/env-local.ts, takes R3's items on stdin and runs
runElectionQueue: three reads filtered to the batch's URLs in chunks of
200 (source by url_norm, news_item by url, manual_news review items by
payload->>url), then one insert of pending agent:R3 manual_news review
items, and nothing else. --dry-run writes nothing.

stdout is { rows, skipped, dropped }; stderr is one line, "queued N,
skipped S, dropped D". Exit 0 for a complete run, 1 for a refused batch or
a failed read or insert (nothing written), 2 for a configuration error.

Nothing calls it unattended yet: R3 stays paused until the agent
retrofit's PR B prompt passes its watched run (D5).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 5: Runbook step 4, full verification, PR

**Files:**
- Modify: `docs/general-election/news-inlet-runbook.md:239-245`

- [ ] **Step 1: Update runbook step 4**

In `docs/general-election/news-inlet-runbook.md`, replace (lines 239-245):

```markdown
   - resolves the source: the payload's own `outlet:<domain>` first, then the
     URL's listed outlet, then an existing source row for that exact page;
   - inserts.

   Anything it refuses stays pending with the reason in `apply_error`. An
   operator hand-add from a page off the outlet list needs a `source` row for
   that page first. That is the same pattern 0014 and 0042 use.
```

with:

```markdown
   - resolves the source: the payload's own source id first, checked against
     the story's URL (below), then the URL's listed outlet, then an existing
     source row for that exact page. There is no official fall-through: a
     government URL with no source id resolves only to its own page row
     (news-source-integrity spec §3.2.2, D7);
   - inserts.

   **A source id in the payload is checked against the story's URL** before
   it is used, so a payload cannot attribute one publisher's story to another:
   - `outlet:<domain>` only when the URL belongs to that outlet. Every swept
     story carries its own outlet's id, so the sweep's items pass.
   - `official:<domain>` only on an `election_news` item that names no
     candidate and no race, and only when the URL is on that entry of
     `src/lib/official-sources.ts` (17 bodies: the Division of Elections, the
     four covered Supervisors, the Legislature, the courts). The route writes
     that body's source row from the list (`primary_doc` / `N/A`, publisher as
     listed) if it is missing, and refuses if a row for that host already
     exists with another type or lean. R3's queue,
     `scripts/election-news.ts queue`, is what writes these ids.
   - any other id (a `src_*` page row) only when that row's `url_norm` is
     this story's (`urlNorm` of its URL).

   A failed check names the mismatch. Anything it refuses stays pending with
   the reason in `apply_error`. An operator hand-add from a page off the
   outlet list, a government page included, needs a `source` row for that
   page first, with the page's true type (an agency's advocacy page is
   `opinion`, as 0040 typed FDACS's statement). That is the same pattern 0014,
   0040 and 0042 use.
```

The "Five outlets are refused outright" paragraph after it stays as it is.

- [ ] **Step 2: Run the full verify suite**

```bash
cd /Users/jsloth/Projects/kyv-build/newsA
"$NODE" scripts/verify-all.mjs 2>&1 | tail -3
```

Expected: `verify-all: 70 passed (1 offline only), 1 failed, 2 skipped (needs env), 73 total`: two more passes than the baseline (`verify-official-sources.ts`, `verify-election-news.ts`), the one known failure `verify-news-neutrality.ts` (live sourceless rows `4c787ba7…` and `8d12a9b1…`, which 0042 fixes), and the two env-gated skips. Report any other failure.

- [ ] **Step 3: Type-check, strict script check, lint**

```bash
cd /Users/jsloth/Projects/kyv-build/newsA
NODE="/Users/jsloth/Library/Application Support/Logi/LogiPluginService/PluginHosts/node22/node/bin/node"
W=/Users/jsloth/Projects/kyv-build/newsA
"$NODE" node_modules/typescript/bin/tsc --noEmit; echo "tsc exit=$?"
SCRATCH="$(mktemp -d)"
cat > "$SCRATCH/tsconfig.scripts.json" <<EOF
{
  "extends": "$W/tsconfig.json",
  "compilerOptions": {
    "incremental": false,
    "target": "es2022",
    "lib": ["es2023", "dom"],
    "types": ["node"],
    "typeRoots": ["$W/node_modules/@types"],
    "plugins": []
  },
  "include": [],
  "files": [
    "$W/scripts/election-news.ts",
    "$W/scripts/verify-election-news.ts",
    "$W/scripts/verify-official-sources.ts",
    "$W/scripts/verify-news-enqueue.ts"
  ]
}
EOF
"$NODE" "$W/node_modules/typescript/bin/tsc" -p "$SCRATCH/tsconfig.scripts.json"; echo "strict scripts exit=$?"
"$NODE" node_modules/eslint/bin/eslint.js src/lib/official-sources.ts src/lib/election-news.ts src/lib/news-enqueue.ts src/lib/news-sources.ts src/lib/supervisors.ts "src/app/api/admin/review/[id]/decision/route.ts" scripts/election-news.ts scripts/verify-election-news.ts scripts/verify-official-sources.ts scripts/verify-news-enqueue.ts; echo "eslint exit=$?"
```

Expected: `tsc exit=0`, `strict scripts exit=0`, `eslint exit=0`, no other output.

- [ ] **Step 4: Production build (the route imports a new module chain)**

```bash
NDIR="$(dirname "$NODE")"
PATH="$NDIR:$PATH" "$NODE" node_modules/next/dist/bin/next build 2>&1 | tail -15
git status --short
```

Expected: the build ends with the route table and the `○ (Static)` / `● (SSG)` / `ƒ (Dynamic)` legend, no error. `git status --short` shows only `docs/general-election/news-inlet-runbook.md` modified (the build writes nothing tracked; if it re-adds the `AGENTS.md` block noted in the project instructions, leave that file out of the commit).

- [ ] **Step 5: Commit the runbook**

```bash
git add docs/general-election/news-inlet-runbook.md
git commit -F - <<'EOF'
Runbook step 4: the approve path checks given source ids

news-inlet-runbook.md step 4 now says how the approve path checks a
payload's source id against the story's URL (outlet:, official:, src_*),
that there is no official fall-through, and that R3's queue is what
writes official: ids. A government page hand-added by an operator still
needs its own page row with its true type.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
git log --oneline 08384c5..HEAD
```

Expected: six commits on top of `08384c5`: this plan, Tasks 1 to 4, and this one.

- [ ] **Step 6: Push the branch and open the PR (never merge)**

Only when the controller asks for the PR. Push the feature branch to its own name; never to `main`, never with `--force`.

```bash
git push -u origin claude/news-official-sources
gh pr create --base main --head claude/news-official-sources --title "News PR A: official sources, checked attribution, R3's queue" --body-file - <<'EOF'
## What this does

News-source-integrity spec, rollout step 1 (PR A, §3.2.1 to §3.2.3). No migration, no table change, and nothing voter-facing changes until a person approves an item in /admin.

- `src/lib/official-sources.ts`: 17 government bodies whose own pages count as primary documents for an election notice; `officialForUrl`, `officialSourceRow` (`official:<domain>`, `primary_doc` / `N/A`). The four Supervisor hosts come from the new `supervisorSite` in `supervisors.ts`. Matching reuses `urlBelongsTo`, widened to `{ domain }`.
- Approve path: every given source id is checked against the story's URL. `outlet:<domain>` only on that outlet's URL; `official:<domain>` only on `election_news` with no candidate and no race, on that body's site; a `src_*` page row only for its own `url_norm`. `ensureListedRow` replaces `ensureOutletRow` and refuses an official row read back with another type or lean. No official fall-through.
- `scripts/election-news.ts queue [--dry-run]` (rules in `src/lib/election-news.ts`): R3's queue. Inserts pending `manual_news` review items with `source 'agent:R3'` and nothing else; county or statewide scope, never metro.
- `news-inlet-runbook.md` step 4 updated.

## Decisions this PR encodes (each pending founder confirmation)

1. **D6:** the 17-entry list (with the agent-retrofit spec's four changes). Left off: CourtListener, congress.gov, flgov.com, AP, Ballotpedia, VoteSmart, PolitiFact, FactCheck.org, OpenSecrets. TO FLIP: edit `OFFICIAL_SOURCES` and `EXPECTED` in `verify-official-sources.ts`.
2. **D7:** official attribution only from a given `official:` id, on `election_news` with no candidate or race, on that body's own host; no official fall-through, so an incumbent's `.gov` release can never print "Official document". TO FLIP: in the route's `page` case, fall back to `officialForUrl` and `ensureListedRow(officialSourceRow(entry))`, and drop the item-type and candidate/race checks in `planGiven`.
3. **D5 (PR A's part):** R3 returns only as a queue. This PR writes no R3 prompt and installs nothing; R3 stays paused until the retrofit's PR B passes its watched run.
4. Publisher strings: 0014's and 0042's for the same body; the verify script reads both migrations.
5. The four Supervisor hosts come from `supervisorSite`, plus `miamidade.gov/elections` and `ocfelections.gov`.
6. When two official entries match a URL, the longest `domain` wins.
7. A given `outlet:` / `official:` id always goes through `ensureListedRow` (upsert-if-absent, read back by `url_norm`).
8. A given `outlet:` id for an outlet with no signed-off lean is looked up by id as before, never written.
9. R3 scope at PR A level: a county scope that differs from a county body's county, or a statewide scope on a county body's page, is refused; a county scope on a statewide body's page is accepted until the retrofit's PR B sets scope from the publisher.
10. R3 queue: `published_at` written YYYY-MM-DD (a time needs `Z` or an offset; the day must exist) and stored as ISO, the dedupe compares `urlNorm` without `www.`, a blank summary as null, a failed read exits 1 with nothing written, the source check runs before the skip check.
11. `fakeDb` in `verify-news-enqueue.ts` takes readonly rows (strict standalone type-check).
12. Approve path, beyond §3.2.2: an `official:` id for a county body needs the item scoped to that county; it is refused when the story's own page row has another type or lean; the `page` case refuses an `official:` row unless the item passes the given-id checks. TO FLIP: remove the check in `planGiven`, the route's page-row read, or the `pageRowProblem` call.
13. No official source on a metro item (the spec has no rule for it): an `official:` id, or an official row found by `url_norm`, is refused on a `metro`-scoped item. R3 never writes metro; this closes an operator-edited payload. TO FLIP: delete the `row.metro` line in `officialCheck`.
14. Official paths match in any letter case (`miamidade.gov/Elections/...`); a path-scoped entry's host matches its subdomains, as every entry's does. TO FLIP: drop `lowerPath` in `officialForUrl`.
15. stderr: the run's summary is always the last line (spec §3.2.3 says one line); Node's warnings and env-local's credentials-file note can precede it. R3's prompt should read the last line.
16. **The specs disagree on D7 until the founder answers it:** the agent-retrofit spec §3.4 asks for an official check after `page` for every `manual_news` item; this PR follows news-source-integrity D7 (no fall-through). Decision 2's TO FLIP is the retrofit's version.

## Verification

- `verify-all`: 70 passed, 1 known failure (`verify-news-neutrality`, the live sourceless rows 0042 fixes), 2 env-gated skips.
- `tsc --noEmit`, a strict standalone type-check of the four touched scripts, eslint, `next build`: clean.
- Every new guard mutation-checked (break it, see the named FAIL, restore).
- The CLI was run only on inputs it refuses before any query.

## Follow-ups (not here)

`0054_news_agent_rows_to_review`, `0055_official_link_sources` (uses `officialSourceRow`), news PR B (daily sweep, chunked intake read), the retrofit's PR B (R3's prompt, `context`, content rules).

This branch is cut from the migration-ledger commit `08384c5`; until that PR merges, its diff shows here too.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
```

Expected: the push creates `origin/claude/news-official-sources`; `gh` prints the PR URL. Do not merge.
