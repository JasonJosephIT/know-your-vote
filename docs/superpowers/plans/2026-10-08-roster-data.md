# Roster Data (PR 1: worksheet and 0049) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Read, from official sources and twice, whether each of the 106 ballot candidates serves today in the office or on the body their race elects to, each Governor ticket's running mate, and whether the nine candidates with no campaign site have one now; then ship those facts, each with its source and date, as the unapplied migration `supabase/migrations/0049_roster_completeness.sql`.

**Architecture:** Three small script modules. `scripts/roster-reads-lib.ts` holds pure parsers and the D6 text rule. `scripts/roster-reads.ts` is a read-only CLI that reads every page listed in `scripts/roster-sources.ts` once per "round" into the gitignored `.roster-reads/`. `scripts/roster-worksheet.ts` parses and checks the hand-written worksheet `docs/general-election/roster-completeness-2026-10.md` and generates the migration's data blocks from it. The worksheet is what the founder reviews; the migration's VALUES are generated between marker comments, and `scripts/verify-roster-worksheet.ts` fails if they drift. The migration adds five columns, writes the data, then adds five CHECKs and the `candidate_sourced_fact_guard` trigger; `scripts/verify-migrations.mjs` tests it offline, including a rehearsal of its live-only assertions on a replica of the 2026-10-08 ballot.

**Tech Stack:** TypeScript under Node 22 type-stripping (plain-Node scripts, relative `.ts` imports), PGlite for the migration harness, Google Chrome headless (`--dump-dom`) for HTML pages, the House Clerk and Senate XML lists, the FEC API (cross-check only).

**Spec:** `/Users/jsloth/Projects/Civic Awareness Project(Know Your Vote)/.claude/worktrees/subagent-driven-development-a087c8/docs/superpowers/specs/2026-10-08-roster-completeness-design.md` (branch `claude/specs-gap-closure`; it is not on this branch, so read it there, read-only). This PR builds §3.1, §3.2, §3.3, §3.4, the reads and the D6 rule of §3.6, the re-checks of §3.7, the `verify-migrations.mjs` part of §6, and rollout steps 3-4.

**Worktree:** `/Users/jsloth/Projects/kyv-build/roster1`, branch `claude/roster-completeness`, cut from `claude/migration-ledger-2026-10-09` at `08384c5` (that commit claims 0049 in `supabase/migrations/README.md`). Every command below runs from the worktree root, with:

```bash
cd /Users/jsloth/Projects/kyv-build/roster1
NODE="/Users/jsloth/Library/Application Support/Logi/LogiPluginService/PluginHosts/node22/node/bin/node"
```

**Scope.** In: the read tooling, the worksheet, `0049_roster_completeness.sql`, its `verify-migrations.mjs` cases, the ledger row's state. Out (PR 2, `claude/roster-display`, or later): any UI; `src/lib/incumbency.ts` (its flag, comments and label table); `src/lib/running-mate.ts`; `src/types/schema.ts`; cache keys; `CampaignWebsite`; `scripts/candidate-leads.ts`; `scripts/verify-incumbent-chip.ts`; the methodology paragraph; contact. Never here: applying 0049, any write to the live database, running B4, any scheduled task. Nothing under `src/` changes in this PR.

**Merge order (not a build dependency).** PR #131 (`0046_uthmeier_incumbent.sql`, applied live 2026-10-07) and the ledger PR (`claude/migration-ledger-2026-10-09`) should merge before this one. 0049 does not need 0046's file: it writes Uthmeier's `is_incumbent`, source and date itself, and derives `race.incumbent_id` in SQL.

## Global Constraints

Copied from the spec and the run's rules. Every task's requirements include these.

- Never apply a migration and never write the live database. The Supabase MCP `execute_sql` is for SELECT only. The founder applies 0049 with `apply_migration` after the PR merges and a separate yes (D10). Cut-off: applied by Thu 10-15 12:00 EDT; later, it waits until after Nov 3.
- Never run the app's write scripts (`candidate-leads.ts queue`, `news-enqueue.ts`, any brief apply). Never create, run, update or delete a scheduled task. Never touch `/Users/jsloth/Projects/kyv-agent-worktree` or `/Users/jsloth/Projects/kyv-agent-runs`.
- Never merge, never push to `main`, never force-push, never change GitHub settings. Never print, read or copy `.env.local` or any key: scripts load it through `scripts/env-local.ts`. The FEC key is `FEC_API_KEY`; `DEMO_KEY` is not used.
- Web: read-only GETs. Never submit a form or log in. Never change a user agent, or anything else about how a request identifies itself, to get past a refusal or a challenge.
- The file is exactly `supabase/migrations/0049_roster_completeness.sql` (ledger row 0049). It must sort before `0050_content_freeze.sql`.
- Additive columns on `candidate`, no new table: `incumbency_source text`, `incumbency_verified_at timestamptz`, `running_mate text`, `running_mate_source text`, `running_mate_verified_at timestamptz`. No constraint on `race`.
- Constraints, added after the data, each `DROP CONSTRAINT IF EXISTS` then `ADD`: `candidate_incumbency_sourced` `(incumbency_source IS NULL) = (incumbency_verified_at IS NULL)`; `candidate_incumbent_needs_source` `NOT is_incumbent OR incumbency_verified_at IS NOT NULL`; `candidate_running_mate_sourced` (all three running-mate columns NULL or all set); `candidate_running_mate_governor` `running_mate IS NULL OR office_sought = 'Governor'`; `candidate_running_mate_clean` `running_mate IS NULL OR running_mate = btrim(regexp_replace(running_mate, '\s+', ' ', 'g'))`.
- The guard, added last: function and trigger `candidate_sourced_fact_guard`, `BEFORE UPDATE OF is_incumbent, running_mate ON candidate FOR EACH ROW`, body exactly as spec §3.2. `EXECUTE` on the function revoked by name from `PUBLIC`, `anon`, `authenticated`, `cap_tool_wrapper` and `cap_readonly`.
- Data: `UPDATE candidate ... FROM (VALUES (candidate_id, legal_name, is_incumbent, source, verified_at, fec_id), ...)` for all 106, joined on `candidate_id` AND `legal_name`; `fec_id` only for federal rows, with `COALESCE`. Rendon and Uthmeier are written like everyone else. `race.incumbent_id` derived in SQL (the one ballot candidate with `is_incumbent`, else NULL); a literal only for a race with two or more, from the worksheet. `is_open_seat = (incumbent_id IS NULL)` on all 53. Running mates for the eight GOV ballot candidates. `official_site` and `site_last_verified_at` only for a re-check find in a listed race. Idempotent: every statement re-runs.
- Assertions, in a `DO $$` block like 0038's: the 49 county ballot candidates all carry a source (holds offline too); DoE roster absent → `RAISE NOTICE` and stop; live: all 106 carry a source; the number with `is_incumbent` equals the worksheet's total as a literal; every `incumbent_id` names a ballot candidate of that race who has `is_incumbent`; a race with exactly one names that one; `is_open_seat = (incumbent_id IS NULL)` on all 53; `FL-GOV-general` is open; `FL-ATG-general` is `FL-DOE-89041`; `FL-HIL-SB4-general` is `FL-VF-HIL-2672`; all eight GOV ballot candidates have a running mate; the sited count equals 97 plus the listed-race finds.
- Reads: fetched and read, never a search result; the page must name the person as a current member of the body or the current holder of the office. Each source page is read twice, in two separate rounds at least an hour apart, and both reads must agree. Each Yes also needs a second, different official page naming the person as a current member or holder. A disagreement goes into the worksheet as a question for the founder, never into the migration. `incumbency_source` is the URL that decides the row; `incumbency_verified_at` is the first read's date.
- Every HTML page is read in headless Chromium; the House and Senate XML by plain fetch. Ballotpedia is a lead and a cross-check, never the source of record. The county SoE (VoterFocus) list confirms ballot placement, never incumbency (0031:41-43). The FEC decides nothing: on a 429 the read stops and resumes after an hour; a read that cannot be made leaves `fec_id` NULL and the worksheet says "not read". No rule reads party.
- Evidence: the page's own words, at most 15, in quotes.
- D6: the stored running-mate name is the DoE page's text after one rule: decode HTML entities, turn each non-breaking space into a space, collapse every run of whitespace to one space, trim. Case, accents and punctuation stay as printed.
- D11: a re-check find in a listed race (Bogen, Fisher, McKinzie, Bendross-Mindingall, Colucci, Gallo) is written in 0049; a find in a published race (Jassenoff FL-25, Hosey FL-26, Datto FL-GOV) is recorded in the worksheet and held until after Nov 3. Colucci stays NULL unless her site is clean.
- House rules: every candidate treated identically; worksheet rows follow `race.candidate_ids` order (ballot order, 0044); nothing from an agent is voter-facing until a human approves it; no agent writes these columns.
- Tooling: `$NODE` as above (the default `node` crashes on this Mac). Scripts import with relative paths and the `.ts` extension. `scripts/` is excluded from the project `tsconfig.json`, so new scripts are type-checked with the strict standalone `tsc` command given in each task.
- Commit messages: one-line subject, blank line, body, final line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Decisions this PR encodes

"Spec" marks the spec's Recommended option (pending founder confirmation); "plan" marks a choice this plan makes. All of them go in the PR body (Task 8).

1. D1 (spec): `is_incumbent` = serves today in the office, or as a sitting member of the body, the race elects to; Wasserman Schultz (FL-20) and Moskowitz (FL-25) count as House members. The worksheet records both D1 columns (`incumbent`, `holds_this_seat`). TO FLIP: `node scripts/roster-worksheet.ts --write-migration --d1 seat` regenerates the data from `holds_this_seat`, with no new read.
2. D4 (spec): `is_open_seat = (incumbent_id IS NULL)` on all 53 general races; nothing displays it.
3. D5, storage half (spec): three running-mate columns on `candidate`, CHECKed to Governor rows. The display is PR 2.
4. D6 (spec): the canDetail "Running Mate" text, entities decoded, whitespace collapsed, nothing else changed. Plan: an entity the decoder does not know makes the read fail instead of storing a half-decoded name.
5. D9 (spec): B4 is not run. The trigger makes its UPDATE (`Civic Awareness (Know Your Vote)/toollayer/cap_toollayer/store.py:245-247`) fail on any value it would change on a sourced row; `fec_id` is stored only where an FEC row was matched by hand.
6. D10 (spec): the worksheet and the migration are reviewed together in this PR; the founder gives a separate yes before the live apply; no agent writes these columns.
7. D11 (spec): listed-race site finds are written by 0049, and its UPDATE also refuses any row that is not in a listed race; published-race finds wait in the worksheet.
8. D13 (spec): number 0049 from the ledger, before 0050; the harness fails if a `*_content_freeze.sql` ever sorts first.
9. Spec §3.1: in a race with two or more incumbents, `incumbent_id` is the candidate whose `holds_this_seat` is Yes, else NULL. Computed by the generator, never typed.
10. Plan: `incumbency_verified_at` and `running_mate_verified_at` hold the first read's date at 00:00 UTC, the convention `site_last_verified_at` already uses (0036, 0038).
11. Plan: `normalizeDoeText` lives in `scripts/roster-reads-lib.ts` for this PR, because the spec's home for it, `src/lib/running-mate.ts`, is PR 2's file. PR 2 moves it there and points `scripts/roster-reads.ts` at it.
12. Plan, a deviation from spec §2.6 and §3.3 ("answer a plain fetch"): the DoE canDetail pages are read in headless Chromium. On 2026-10-08 a plain fetch got Cloudflare's "Just a moment..." page (HTTP 403); headless Chrome got the page.
13. Plan: a page that refuses headless Chromium (myfloridalegal.com answered 403 on 2026-10-08) is read in the visible browser pane, or another official page is used. The user agent is never altered.
14. Plan: raw reads stay in the gitignored `.roster-reads/`, because the DoE pages carry each campaign's address, phone and treasurer; only the worksheet is committed.
15. Plan: every `source_url` and `second_page` must be on `OFFICIAL_HOSTS` (`scripts/roster-worksheet.ts`); the checker refuses Ballotpedia, the FEC, news and campaign sites as sources.
16. Plan, beyond spec §6: the migration's VALUES are generated from the worksheet and checked for drift, and the DO block's live-only assertions are rehearsed offline on a replica of the 2026-10-08 ballot.

## Ground truth at planning time (2026-10-08)

These are leads for the reads, not facts for the worksheet: every worksheet value comes from Tasks 4-6.

- Live roster (SELECT, 2026-10-08): 106 ballot candidates in 53 races (county 32/49, federal 17/43, state 4/14), 9 without `official_site`. MD5 of the sorted `race_id|candidate_id|legal_name|status|has_site` lines: `5cd9b7dd8396e65da89136c1fadf058b`, equal to the fixture in Task 2. `is_incumbent` is true only for Rendon (`FL-VF-HIL-2672`) and Uthmeier (`FL-DOE-89041`); `incumbent_id` is set only on `FL-HIL-SB4-general` and `FL-ATG-general`.
- `MemberData.xml` (publish-date October 1, 2026), Florida: FL07 Cory Mills, FL08 Mike Haridopolos, FL09 Darren Soto, FL10 Maxwell Frost, FL11 Daniel Webster, FL12 Gus M. Bilirakis, FL14 Kathy Castor, FL15 Laurel M. Lee, FL16 Vern Buchanan, FL19 Byron Donalds, FL20 vacant ("Vacancy due to the resignation of Sheila Cherfilus-McCormick, April 21, 2026."), FL22 Lois Frankel, FL23 Jared Moskowitz, FL24 Frederica S. Wilson, FL25 Debbie Wasserman Schultz, FL26 Mario Diaz-Balart, FL27 Maria Elvira Salazar, FL28 Carlos A. Gimenez. Senate XML: Ashley Moody (Class III, website `https://www.moody.senate.gov`) and Rick Scott.
- canDetail 90630 through headless Chrome: candidate "Charles Burkett", office "Governor", raw `" Ruben&nbsp;\n\t\t    A.&nbsp;\n\t\t    Coto                     "` (the serialized DOM uses LF where the served page has CR LF), stored "Ruben A. Coto".
- FEC `office=H&district=08` with the project key: a complete page (`pagination.count` equal to the rows) including `H4FL08168` HARIDOPOLOS, MIKE, "I".
- Headless Chrome reads: `https://www.flgov.com/eog/` is titled "Governor Ron DeSantis | Executive Office of the Governor"; `https://www.myfloridacfo.com/` shows "Meet Your Chief Financial Officer Blaise Ingoglia"; `https://www.fdacs.gov/` shows "Commissioner Wilton Simpson"; `https://www.myfloridalegal.com/` answers "403 Forbidden"; the Miami-Dade commission page lists "Oliver G. Gilbert, III District 1" (a FL-24 candidate: a county commissioner is not a House member), "Marleine Bastien District 2" and "Vicki L. Lopez District 5"; `hcfl.gov` lists Harry Cohen District 1, Gwen Myers District 3 and Joshua Wostal District 7; `orangecountyfl.net` lists Jerry L. Demings as Orange County Mayor, Mike Crabb District 2 and Michael "Mike" Scott District 6; `ocps.net/school-board` lists Teresa Jacobs as Chair and Angie Gallo as District 1; `browardschools.com/school-board` names Maura McCarthy Bulman (District 1), Adam Cervera (District 6) and Dr. Allen Zeman (Countywide at Large, Seat 8) only in photo captions; `broward.org`'s commissioner list renders no names, while `https://www.broward.org/district6` is titled "District 6 - Commissioner Beam Furr"; `dadeschools.net/schoolboard/` showed no member names; the `hillsboroughschools.org` read did not finish within 90 s; `myorangeclerk.com` reports "the departure of Clerk Tiffany Moore Russell".

## File map

| File | Change | Responsibility |
|---|---|---|
| `scripts/roster-reads-lib.ts` | create | Pure: `normalizeDoeText` (D6), `parseRunningMate`, `parseHouseFlorida`, `parseSenateFlorida`, `parseFecCandidates`, `pageText`, `snippet`, `surname`, `namesOnPage`, `worksheetTime`, `canDetailUrl` |
| `scripts/verify-roster-worksheet.ts` | create (Task 1), extend (Tasks 2, 7) | Offline tests of the helpers and the worksheet module; the real worksheet passes; the migration's blocks match it |
| `scripts/fixtures/roster/ballot-roster-2026-10-08.json` | create | The 106 ballot candidates as of 2026-10-08 |
| `scripts/roster-worksheet.ts` | create | Worksheet parse and check, the §3.5 label copy, `OFFICIAL_HOSTS`, read-time fill, SQL block generator; CLI `--skeleton`, `--fill-times`, `--check`, `--write-migration` |
| `scripts/roster-sources.ts` | create (Task 3), extend (Task 4) | Every page read, by key |
| `scripts/roster-reads.ts` | create | Read-only CLI: `--round`, `--compare`, `--find`, into `.roster-reads/` |
| `.gitignore` | modify | `.roster-reads/` |
| `docs/general-election/roster-completeness-2026-10.md` | create | The worksheet |
| `supabase/migrations/0049_roster_completeness.sql` | create | Columns, generated data, constraints, trigger, assertions |
| `scripts/verify-migrations.mjs` | modify: header list after line 90; a new block above the final `if (failures > 0) {` (line 1751) | The 0049 cases |
| `supabase/migrations/README.md` | modify: row 0049 (line 65) | State: written, not applied |

---

### Task 1: The read helpers and the D6 rule

**Files:**
- Create: `scripts/roster-reads-lib.ts`
- Create (test): `scripts/verify-roster-worksheet.ts`

**Interfaces:**
- Consumes: `decodeEntities(text: string): string` from `src/lib/candidate-site.ts:163` (decodes `&nbsp;`, `&amp;`, `&lt;`, `&gt;`, `&quot;`, `&#39;`, curly quotes, dashes, `&hellip;`; leaves any other entity as it is).
- Produces (all exported from `scripts/roster-reads-lib.ts`):
  - `canDetailUrl(account: string): string`
  - `worksheetTime(iso: string): string` (`"2026-10-09T14:05:33.120Z"` → `"2026-10-09T14:05Z"`)
  - `normalizeDoeText(raw: string): string` (throws on an undecoded entity)
  - `interface RunningMateRead { election: string | null; office: string | null; candidate: string | null; raw: string; stored: string }` and `parseRunningMate(html: string): RunningMateRead | null`
  - `interface HouseSeat { district: number; name: string | null; vacancy: string | null }` and `parseHouseFlorida(xml: string): HouseSeat[]`
  - `interface Senator { name: string; lastName: string; website: string | null; senateClass: string | null }` and `parseSenateFlorida(xml: string): Senator[]`
  - `interface FecRow { candidate_id: string; name: string; incumbent_challenge: string | null; election_districts: string[] }` and `parseFecCandidates(body: unknown): { ok: true; rows: FecRow[] } | { ok: false; reason: string }`
  - `pageText(html: string): string`, `foldWord(word: string): string`, `snippet(text: string, needle: string, maxWords = 15): string | null`, `surname(legalName: string): string`, `namesOnPage(text: string, legalNames: readonly string[]): string[]`

- [ ] **Step 1: Check the starting point**

Run:
```bash
git status --short && git branch --show-current && git log --oneline -1
"$NODE" scripts/verify-all.mjs 2>&1 | tail -4
```
Expected: no changes; `claude/roster-completeness`; the newest commit is this plan's (its parent `08384c5`). `verify-all` ends `68 passed (1 offline only), 1 failed, 2 skipped (needs env), 71 total` (as on 2026-10-08) with one failure, `verify-news-neutrality.ts` (two sourceless `election_news` rows, a known live-data failure), and two skips (`verify-admin-ops.mjs`, `verify-refresh-schema.mjs`, needing `SUPABASE_SERVICE_ROLE_KEY`). Any other failure: stop and report it before changing anything.

- [ ] **Step 2: Write the failing test**

Create `scripts/verify-roster-worksheet.ts`:

```ts
/* Guardrail for the roster-completeness worksheet and the SQL written from it
   (docs/superpowers/specs/2026-10-08-roster-completeness-design.md §3.3-3.4,
   §3.6 D6). Offline: no network, no database.

   1. The read helpers (scripts/roster-reads-lib.ts): D6's normalizeDoeText on
      the two raw DoE strings the spec quotes (§2.6), the canDetail parser on
      the page as served and as headless Chromium serializes it, the House and
      Senate XML, the FEC count rule, page text, the 15-word evidence snippet.
   2. The worksheet rules and the SQL generator (scripts/roster-worksheet.ts)
      on a small made-up worksheet: names and facts below are fixtures, not
      research. Each rule is mutation-checked: a broken row must be caught.
   3. The real worksheet passes every rule, and the generated blocks of
      supabase/migrations/0049_roster_completeness.sql are exactly what the
      worksheet produces, so the SQL cannot drift from what was reviewed.

   Run: node scripts/verify-roster-worksheet.ts */

import {
  namesOnPage,
  normalizeDoeText,
  pageText,
  parseFecCandidates,
  parseHouseFlorida,
  parseRunningMate,
  parseSenateFlorida,
  snippet,
  surname,
} from "./roster-reads-lib.ts";

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}
const throws = (fn: () => unknown) => {
  try {
    fn();
    return false;
  } catch {
    return true;
  }
};

/* ---- 1. read helpers ------------------------------------------------------ */

/* §2.6, as served: CR LF, two tabs, four spaces. */
const RAW_89042 = " Bryan&nbsp;\r\n\t\t    Avila                     ";
const RAW_90630 = " Ruben&nbsp;\r\n\t\t    A.&nbsp;\r\n\t\t    Coto                     ";

check('D6: canDetail 89042 reads "Bryan Avila"', normalizeDoeText(RAW_89042) === "Bryan Avila");
check('D6: canDetail 90630 reads "Ruben A. Coto"', normalizeDoeText(RAW_90630) === "Ruben A. Coto");
check(
  "D6 keeps case, accents and punctuation",
  normalizeDoeText(" José&nbsp;\n  O'Brien-Núñez, Jr. ") === "José O'Brien-Núñez, Jr.",
);
check("D6 fails closed on an entity it cannot decode", throws(() => normalizeDoeText("Pe&ntilde;a")));

const PAGE_89042 = [
  '<td valign="top" align="center" colspan="4">',
  "  <font size=+1 ><b>2026 General Election</b></font><b> <br />",
  "  Governor                                          </b>",
  "  <br />",
  '  <font size=+1 color="#CCOOOO"><b>Byron Donalds</b></font>',
  "  <br />",
  "  <b>",
  "    Republican",
  "  </b>",
  "  <br>",
  `  Running Mate:${RAW_89042}</td>`,
].join("\r\n");
const DOM_90630 = [
  '<font size="+1"><b>2026 General Election</b></font><b> <br>',
  "                      Governor                                          </b>",
  '<font size="+1" color="#CCOOOO"><b>Charles Burkett</b></font>',
  "<br>",
  `Running Mate:${RAW_90630.replace(/\r\n/g, "\n")}</td>`,
].join("\n");

const rm1 = parseRunningMate(PAGE_89042);
check(
  "canDetail as served: election, office, candidate, raw and stored",
  rm1?.election === "2026 General Election" &&
    rm1.office === "Governor" &&
    rm1.candidate === "Byron Donalds" &&
    rm1.raw === RAW_89042 &&
    rm1.stored === "Bryan Avila",
  JSON.stringify(rm1),
);
const rm2 = parseRunningMate(DOM_90630);
check(
  "canDetail as headless Chromium serializes it",
  rm2?.office === "Governor" && rm2.candidate === "Charles Burkett" && rm2.stored === "Ruben A. Coto",
  JSON.stringify(rm2),
);
check("a page with no Running Mate field reads as null", parseRunningMate("<td>Status: Active</td>") === null);
check(
  "markup inside the field is refused, not stripped",
  throws(() => parseRunningMate("Running Mate: <b>Someone</b></td>")),
);

const HOUSE_XML = `<MemberData><members>
<member><statedistrict>AK00</statedistrict><member-info><official-name>Nicholas J. Begich III</official-name></member-info></member>
<member><statedistrict>FL25</statedistrict><member-info><official-name>Debbie Wasserman Schultz</official-name><district>25th</district></member-info></member>
<member><statedistrict>FL20</statedistrict><member-info><official-name/><district>20th</district><footnote-ref>0</footnote-ref><footnote>Vacancy due to the resignation of Sheila Cherfilus-McCormick, April 21, 2026.</footnote></member-info></member>
</members></MemberData>`;
const seats = parseHouseFlorida(HOUSE_XML);
check(
  "House XML: Florida seats only, in district order, a vacancy keeps the Clerk's footnote",
  seats.length === 2 &&
    seats[0].district === 20 &&
    seats[0].name === null &&
    seats[0].vacancy === "Vacancy due to the resignation of Sheila Cherfilus-McCormick, April 21, 2026." &&
    seats[1].district === 25 &&
    seats[1].name === "Debbie Wasserman Schultz" &&
    seats[1].vacancy === null,
  JSON.stringify(seats),
);

const SENATE_XML = `<contact_information>
<member><member_full>Moody (R-FL)</member_full><last_name>Moody</last_name>
  <first_name>Ashley</first_name><state>FL</state><website>https://www.moody.senate.gov</website><class>Class III</class></member>
<member><last_name>Alsobrooks</last_name> <first_name>Angela D.</first_name> <state>MD</state></member>
</contact_information>`;
const senators = parseSenateFlorida(SENATE_XML);
check(
  "Senate XML: Florida's senators with site and class",
  senators.length === 1 &&
    senators[0].name === "Ashley Moody" &&
    senators[0].website === "https://www.moody.senate.gov" &&
    senators[0].senateClass === "Class III",
  JSON.stringify(senators),
);

const fecRow = { candidate_id: "H0FL00000", name: "EXAMPLE, ONE", incumbent_challenge: "I", election_districts: ["25", "20"] };
check(
  "FEC: a page whose pagination.count differs from its rows is refused",
  parseFecCandidates({ pagination: { count: 2 }, results: [fecRow] }).ok === false,
);
const fecOk = parseFecCandidates({ pagination: { count: 1 }, results: [fecRow] });
check(
  "FEC: a complete page gives id, incumbent_challenge and election_districts",
  fecOk.ok && fecOk.rows[0].candidate_id === "H0FL00000" && fecOk.rows[0].election_districts.join(",") === "25,20",
);
check("FEC: something that is not a candidates page is refused", parseFecCandidates({ results: [] }).ok === false);

check(
  "page text drops scripts and tags and decodes entities",
  pageText("<p>Hello&nbsp;<b>World</b></p><script>var x = 1;</script>") === "Hello World",
);
const long = "one two three four five six seven eight nine ten Gwen Myers District 3 eleven twelve thirteen fourteen fifteen sixteen seventeen";
const snip = snippet(long, "gwen myers") ?? "";
check(
  "evidence snippet: at most 15 words, containing the name",
  snip.split(" ").length === 15 && snip.includes("Gwen Myers"),
  snip,
);
check("evidence snippet: null when the name is not on the page", snippet(long, "Jackie Toledo") === null);
check(
  "surname skips nicknames and suffixes",
  surname('Phil "Felipe" Ehr') === "Ehr" &&
    surname("Victor M. Torres Jr.") === "Torres" &&
    surname("Oliver G. Gilbert III") === "Gilbert" &&
    surname('Patricia "Patti" Rendon') === "Rendon",
);
check(
  "names on a page: surname match, case- and accent-insensitive, hyphens kept",
  namesOnPage("Harry Cohen District 1, GWEN MYERS District 3, Mario Díaz-Balart", [
    "Harry Cohen",
    "Jackie Toledo",
    "Gwen Myers",
    "Mario Diaz-Balart",
  ]).join("|") === "Harry Cohen|Gwen Myers|Mario Diaz-Balart",
);

if (failures) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nroster worksheet: all checks passed");
```

- [ ] **Step 3: Run it and watch it fail**

Run: `"$NODE" scripts/verify-roster-worksheet.ts`
Expected: exits non-zero with `ERR_MODULE_NOT_FOUND` for `scripts/roster-reads-lib.ts`.

- [ ] **Step 4: Write the helpers**

Create `scripts/roster-reads-lib.ts`:

```ts
/* Pure helpers for the roster-completeness reads
   (docs/superpowers/specs/2026-10-08-roster-completeness-design.md §3.3, §3.6).

   No network and no file access here: scripts/roster-reads.ts does the
   fetching and scripts/verify-roster-worksheet.ts tests every function below
   offline. This file lives in scripts/, not src/lib/, on purpose:
   scripts/verify-incumbent-chip.ts fails if anything in src/ other than
   incumbency.ts and the row types mentions the incumbency columns, and none of
   this is app code.

   normalizeDoeText is the spec's D6 rule. The spec places it in
   src/lib/running-mate.ts; that file belongs to the display PR (PR 2,
   claude/roster-display), which moves this function there and points
   roster-reads.ts at it. Until then this is the one copy. */

import { decodeEntities } from "../src/lib/candidate-site.ts";

/** The Division of Elections page for one candidate: <n> is the number in
    our FL-DOE-<n> id (spec §2.6). */
export const canDetailUrl = (account: string) =>
  `https://dos.elections.myflorida.com/candidates/canDetail.asp?account=${account}`;

/** The worksheet's time format, minutes in UTC: 2026-10-09T14:05Z. */
export const worksheetTime = (iso: string) => `${iso.slice(0, 16)}Z`;

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

export interface RunningMateRead {
  /** "2026 General Election", or null if the heading is missing. */
  election: string | null;
  /** The office line under the heading, e.g. "Governor". */
  office: string | null;
  /** The candidate's name as the page prints it. */
  candidate: string | null;
  /** The page's text after "Running Mate:" up to the cell's end, untouched. */
  raw: string;
  /** normalizeDoeText(raw). */
  stored: string;
}

/** Reads the Division of Elections canDetail page (raw HTML, or the DOM that
    headless Chromium serializes; both are handled). Null when the page has
    no "Running Mate:" field. Throws when the field holds markup, because the
    D6 rule is defined on text only. */
export function parseRunningMate(html: string): RunningMateRead | null {
  const m = /Running Mate:([\s\S]*?)<\/td>/i.exec(html);
  if (!m) return null;
  const raw = m[1];
  if (/<[a-z/!]/i.test(raw)) {
    throw new Error(`parseRunningMate: markup inside the Running Mate field: ${JSON.stringify(raw)}`);
  }
  const heading =
    /<b>\s*(\d{4} General Election)\s*<\/b>\s*<\/font>\s*<b>\s*<br\s*\/?>\s*([^<]+?)\s*<\/b>/i.exec(html);
  const candidate = /<font\b[^>]*color="?#CCOOOO"?[^>]*>\s*<b>([^<]+)<\/b>/i.exec(html);
  return {
    election: heading ? normalizeDoeText(heading[1]) : null,
    office: heading ? normalizeDoeText(heading[2]) : null,
    candidate: candidate ? normalizeDoeText(candidate[1]) : null,
    raw,
    stored: normalizeDoeText(raw),
  };
}

export interface HouseSeat {
  district: number;
  /** <official-name>, or null when the seat is vacant. */
  name: string | null;
  /** The Clerk's footnote for a vacant seat, else null. */
  vacancy: string | null;
}

/** Florida's seats in https://clerk.house.gov/xml/lists/MemberData.xml, in
    district order. */
export function parseHouseFlorida(xml: string): HouseSeat[] {
  const seats: HouseSeat[] = [];
  for (const m of xml.matchAll(/<member>([\s\S]*?)<\/member>/g)) {
    const block = m[1];
    const sd = /<statedistrict>FL(\d{2})<\/statedistrict>/.exec(block);
    if (!sd) continue;
    const name = /<official-name>([^<]+)<\/official-name>/.exec(block)?.[1] ?? null;
    const footnote = /<footnote>([^<]+)<\/footnote>/.exec(block)?.[1] ?? null;
    seats.push({
      district: Number(sd[1]),
      name: name ? decodeEntities(name).trim() : null,
      vacancy: name ? null : footnote ? decodeEntities(footnote).trim() : "vacant",
    });
  }
  return seats.sort((a, b) => a.district - b.district);
}

export interface Senator {
  name: string;
  lastName: string;
  website: string | null;
  senateClass: string | null;
}

/** Florida's senators in senate.gov's senators_cfm.xml. */
export function parseSenateFlorida(xml: string): Senator[] {
  const out: Senator[] = [];
  for (const m of xml.matchAll(/<member>([\s\S]*?)<\/member>/g)) {
    const block = m[1];
    if (!/<state>\s*FL\s*<\/state>/.test(block)) continue;
    const field = (tag: string) =>
      new RegExp(`<${tag}>\\s*([^<]*?)\\s*</${tag}>`).exec(block)?.[1] ?? null;
    const first = field("first_name") ?? "";
    const last = field("last_name") ?? "";
    out.push({
      name: `${decodeEntities(first)} ${decodeEntities(last)}`.trim(),
      lastName: decodeEntities(last),
      website: field("website"),
      senateClass: field("class"),
    });
  }
  return out;
}

export interface FecRow {
  candidate_id: string;
  name: string;
  incumbent_challenge: string | null;
  election_districts: string[];
}

/** One FEC /v1/candidates/ page. Refused unless pagination.count equals the
    rows returned (B4's rule): a truncated field can hide the one row that
    matters. */
export function parseFecCandidates(
  body: unknown,
): { ok: true; rows: FecRow[] } | { ok: false; reason: string } {
  const b = body as {
    pagination?: { count?: unknown };
    results?: Array<Record<string, unknown>>;
  };
  if (!b || !Array.isArray(b.results) || typeof b.pagination?.count !== "number") {
    return { ok: false, reason: "not an FEC candidates page (no results/pagination.count)" };
  }
  if (b.pagination.count !== b.results.length) {
    return {
      ok: false,
      reason: `pagination.count ${b.pagination.count} != ${b.results.length} rows returned`,
    };
  }
  return {
    ok: true,
    rows: b.results.map((r) => ({
      candidate_id: String(r.candidate_id ?? ""),
      name: String(r.name ?? ""),
      incumbent_challenge: r.incumbent_challenge == null ? null : String(r.incumbent_challenge),
      election_districts: Array.isArray(r.election_districts)
        ? r.election_districts.map(String)
        : [],
    })),
  };
}

/** What a reader sees: scripts, styles, comments and tags removed, entities
    decoded, whitespace collapsed. */
export function pageText(html: string): string {
  return decodeEntities(
    html
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<(script|style|noscript|template)\b[\s\S]*?<\/\1>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\xa0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Case- and accent-insensitive word key: "Peña," -> "pena". */
export function foldWord(word: string): string {
  return word
    .replace(/[‘’]/g, "'")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}'-]/gu, "");
}

/** At most `maxWords` consecutive words of `text` that contain `needle`
    (matched word by word, case- and accent-insensitive), or null. The
    worksheet's evidence column is built from this: the page's own words, at
    most 15. */
export function snippet(text: string, needle: string, maxWords = 15): string | null {
  const words = text.split(/\s+/).filter(Boolean);
  const target = needle.split(/\s+/).map(foldWord).filter(Boolean);
  if (target.length === 0 || target.length > maxWords) return null;
  for (let i = 0; i + target.length <= words.length; i++) {
    if (target.every((t, k) => foldWord(words[i + k]) === t)) {
      const room = maxWords - target.length;
      const start = Math.max(0, i - Math.floor(room / 2));
      return words.slice(start, start + maxWords).join(" ");
    }
  }
  return null;
}

/** The surname used to look a candidate up on a page: the last word of the
    legal name that is not a generational suffix. `Phil "Felipe" Ehr` -> Ehr,
    `Victor M. Torres Jr.` -> Torres, `Oliver G. Gilbert III` -> Gilbert. */
export function surname(legalName: string): string {
  const words = legalName.replace(/"[^"]*"/g, " ").split(/\s+/).filter(Boolean);
  const suffix = /^(jr\.?|sr\.?|ii|iii|iv)$/i;
  while (words.length > 1 && suffix.test(words[words.length - 1])) words.pop();
  return words[words.length - 1] ?? legalName;
}

/** Which of `legalNames` have their surname on the page. Used to compare two
    reads of a member list: the set must not change between them. */
export function namesOnPage(text: string, legalNames: readonly string[]): string[] {
  const words = new Set(text.split(/\s+/).map(foldWord));
  return legalNames.filter((n) => {
    const last = surname(n);
    return words.has(foldWord(last)) || last.split("-").every((w) => words.has(foldWord(w)));
  });
}
```

- [ ] **Step 5: Run the test and watch it pass**

Run: `"$NODE" scripts/verify-roster-worksheet.ts`
Expected: 18 `ok` lines, the last line `roster worksheet: all checks passed`, exit 0.

- [ ] **Step 6: Type-check and lint**

Run:
```bash
"$NODE" node_modules/typescript/bin/tsc --noEmit --strict --erasableSyntaxOnly --target es2022 --module esnext --moduleResolution bundler --allowImportingTsExtensions --skipLibCheck --types node scripts/verify-roster-worksheet.ts
"$NODE" node_modules/eslint/bin/eslint.js scripts/roster-reads-lib.ts scripts/verify-roster-worksheet.ts
```
Expected: both print nothing and exit 0.

- [ ] **Step 7: Commit**

```bash
git add scripts/roster-reads-lib.ts scripts/verify-roster-worksheet.ts
git commit -F - <<'EOF'
Roster reads: the D6 running-mate rule and the source parsers, tested offline

normalizeDoeText turns the DoE canDetail field into the stored name (entities
decoded, whitespace collapsed, nothing else changed) and fails on an entity it
cannot decode. Parsers for the canDetail page, the House Clerk and Senate XML
lists and an FEC candidates page (refused unless pagination.count equals the
rows), plus page text and the 15-word evidence snippet. Spec
2026-10-08-roster-completeness-design.md §3.3, §3.6.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 2: The roster fixture, the worksheet rules and the SQL generator

**Files:**
- Create: `scripts/fixtures/roster/ballot-roster-2026-10-08.json`
- Create: `scripts/roster-worksheet.ts`
- Modify (test): `scripts/verify-roster-worksheet.ts` (import block; new section 2 above `if (failures) {`)

**Interfaces:**
- Consumes: `canDetailUrl`, `normalizeDoeText`, `worksheetTime` from Task 1.
- Produces (exported from `scripts/roster-worksheet.ts`):
  - constants `ROOT`, `WORKSHEET_PATH = "docs/general-election/roster-completeness-2026-10.md"`, `MIGRATION_PATH = "supabase/migrations/0049_roster_completeness.sql"`, `ROSTER_FIXTURE`, `SITED_BEFORE = 97`, `DASH = "—"`, `OFFICE_LABEL = "Holds this office now"`, `OFFICIAL_HOSTS`, `COLUMNS`
  - `interface RosterRow { candidate_id; legal_name; race_id; level: "federal" | "state" | "county"; race_status: "published" | "listed"; has_site: boolean }`, `type D1Rule = "membership" | "seat"`, `type Row = Record<string, string>`, `type TableName`, `type BlockName = "candidates" | "race_overrides" | "tickets" | "sites" | "totals"`, `interface IndexEntry { key; url; readAt; ok }`
  - `loadRoster(root?): RosterRow[]`, `labelFor(raceId): string | null`, `officialHost(url): boolean`, `evidenceOk(cell): boolean`
  - `parseTable(md, name): Row[]`, `parseWorksheet(md): Worksheet`, `expectedIncumbents(ws, roster, rule)`, `checkWorksheet(md, roster): string[]`
  - `fillTimes(md, times: ReadonlyMap<string, readonly [string, string]>): string`, `timesFromRounds(a, b): Map<string, readonly [string, string]>`
  - `generatedBlocks(md, roster, rule): Record<BlockName, string[]>`, `applyBlocks(sql, blocks): string`, `ruleOf(sql): D1Rule`, `skeleton(roster): string`
  - CLI: `--skeleton`, `--fill-times <a> <b>`, `--check`, `--write-migration [--d1 membership|seat]`

- [ ] **Step 1: Write the roster fixture**

Create `scripts/fixtures/roster/ballot-roster-2026-10-08.json`. These are the 106 rows of the live SELECT on 2026-10-08 (every `ballot_status = 'ballot'` candidate in some `race.candidate_ids`, in `candidate_ids` order, with the race's `race_publication.status` and whether `official_site` is set):

```json
[
  {"candidate_id":"FL-DOE-90560","legal_name":"Wilton Simpson","race_id":"FL-AGR-general","level":"state","race_status":"published","has_site":true},
  {"candidate_id":"FL-DOE-92013","legal_name":"Joey Mendoza Atkins","race_id":"FL-AGR-general","level":"state","race_status":"published","has_site":true},
  {"candidate_id":"FL-DOE-89041","legal_name":"James Uthmeier","race_id":"FL-ATG-general","level":"state","race_status":"published","has_site":true},
  {"candidate_id":"FL-DOE-89231","legal_name":"Jose Javier Rodriguez","race_id":"FL-ATG-general","level":"state","race_status":"published","has_site":true},
  {"candidate_id":"FL-DOE-89394","legal_name":"Blaise Ingoglia","race_id":"FL-CFO-general","level":"state","race_status":"listed","has_site":true},
  {"candidate_id":"FL-DOE-91310","legal_name":"Annette Taddeo","race_id":"FL-CFO-general","level":"state","race_status":"listed","has_site":true},
  {"candidate_id":"FL-DOE-89042","legal_name":"Byron Donalds","race_id":"FL-GOV-general","level":"state","race_status":"published","has_site":true},
  {"candidate_id":"FL-DOE-89243","legal_name":"David Jolly","race_id":"FL-GOV-general","level":"state","race_status":"published","has_site":true},
  {"candidate_id":"FL-DOE-84076","legal_name":"Scott Eckhard Jewett","race_id":"FL-GOV-general","level":"state","race_status":"published","has_site":true},
  {"candidate_id":"FL-DOE-90630","legal_name":"Charles Burkett","race_id":"FL-GOV-general","level":"state","race_status":"published","has_site":true},
  {"candidate_id":"FL-DOE-89571","legal_name":"Frank J. Russo","race_id":"FL-GOV-general","level":"state","race_status":"published","has_site":true},
  {"candidate_id":"FL-DOE-88529","legal_name":"Moliere \"Moe\" Dimanche","race_id":"FL-GOV-general","level":"state","race_status":"published","has_site":true},
  {"candidate_id":"FL-DOE-90433","legal_name":"Dean Ocean Abrams","race_id":"FL-GOV-general","level":"state","race_status":"published","has_site":true},
  {"candidate_id":"FL-DOE-89630","legal_name":"Jeffrey Peter \"Dr. Jeff\" Datto","race_id":"FL-GOV-general","level":"state","race_status":"published","has_site":false},
  {"candidate_id":"FL-DOE-89909","legal_name":"Maxwell Alejandro Frost","race_id":"FL-10-general","level":"federal","race_status":"published","has_site":true},
  {"candidate_id":"FL-DOE-91717","legal_name":"Joe Strada","race_id":"FL-11-general","level":"federal","race_status":"published","has_site":true},
  {"candidate_id":"FL-DOE-91715","legal_name":"James Pericola","race_id":"FL-11-general","level":"federal","race_status":"published","has_site":true},
  {"candidate_id":"FL-DOE-88517","legal_name":"Ralph Groves","race_id":"FL-11-general","level":"federal","race_status":"published","has_site":true},
  {"candidate_id":"FL-DOE-88868","legal_name":"Gus Michael Bilirakis","race_id":"FL-12-general","level":"federal","race_status":"published","has_site":true},
  {"candidate_id":"FL-DOE-89453","legal_name":"Kimberly Overman","race_id":"FL-12-general","level":"federal","race_status":"published","has_site":true},
  {"candidate_id":"FL-DOE-89778","legal_name":"Branden Scrivener","race_id":"FL-12-general","level":"federal","race_status":"published","has_site":true},
  {"candidate_id":"FL-DOE-91313","legal_name":"Mike Beltran","race_id":"FL-14-general","level":"federal","race_status":"published","has_site":true},
  {"candidate_id":"FL-DOE-88870","legal_name":"Kathy Castor","race_id":"FL-14-general","level":"federal","race_status":"published","has_site":true},
  {"candidate_id":"FL-DOE-92395","legal_name":"Brian Lambert","race_id":"FL-14-general","level":"federal","race_status":"published","has_site":true},
  {"candidate_id":"FL-DOE-89121","legal_name":"Laurel Lee","race_id":"FL-15-general","level":"federal","race_status":"published","has_site":true},
  {"candidate_id":"FL-DOE-89116","legal_name":"Robert People","race_id":"FL-15-general","level":"federal","race_status":"published","has_site":true},
  {"candidate_id":"FL-DOE-90251","legal_name":"Sydney Gruters","race_id":"FL-16-general","level":"federal","race_status":"published","has_site":true},
  {"candidate_id":"FL-DOE-90779","legal_name":"Kelly Kirschner","race_id":"FL-16-general","level":"federal","race_status":"published","has_site":true},
  {"candidate_id":"FL-DOE-89623","legal_name":"Mark Davis","race_id":"FL-16-general","level":"federal","race_status":"published","has_site":true},
  {"candidate_id":"FL-DOE-91278","legal_name":"Brent Andersen","race_id":"FL-20-general","level":"federal","race_status":"published","has_site":true},
  {"candidate_id":"FL-DOE-91577","legal_name":"Debbie Wasserman Schultz","race_id":"FL-20-general","level":"federal","race_status":"published","has_site":true},
  {"candidate_id":"FL-DOE-90814","legal_name":"Kedner Maxime","race_id":"FL-20-general","level":"federal","race_status":"published","has_site":true},
  {"candidate_id":"FL-DOE-92109","legal_name":"Casey Askar","race_id":"FL-22-general","level":"federal","race_status":"published","has_site":true},
  {"candidate_id":"FL-DOE-89301","legal_name":"Pia Dandiya","race_id":"FL-22-general","level":"federal","race_status":"published","has_site":true},
  {"candidate_id":"FL-DOE-90703","legal_name":"Te Mayonna Brown","race_id":"FL-24-general","level":"federal","race_status":"published","has_site":true},
  {"candidate_id":"FL-DOE-91544","legal_name":"Oliver G. Gilbert III","race_id":"FL-24-general","level":"federal","race_status":"published","has_site":true},
  {"candidate_id":"FL-DOE-89801","legal_name":"Scott Singer","race_id":"FL-25-general","level":"federal","race_status":"published","has_site":true},
  {"candidate_id":"FL-DOE-88911","legal_name":"Jared Moskowitz","race_id":"FL-25-general","level":"federal","race_status":"published","has_site":true},
  {"candidate_id":"FL-DOE-92357","legal_name":"Peter Jassenoff","race_id":"FL-25-general","level":"federal","race_status":"published","has_site":false},
  {"candidate_id":"FL-DOE-90330","legal_name":"Mario Diaz-Balart","race_id":"FL-26-general","level":"federal","race_status":"published","has_site":true},
  {"candidate_id":"FL-DOE-89980","legal_name":"Nicole Locklin","race_id":"FL-26-general","level":"federal","race_status":"published","has_site":true},
  {"candidate_id":"FL-DOE-92137","legal_name":"Deborah Ann Meidinger Hosey","race_id":"FL-26-general","level":"federal","race_status":"published","has_site":false},
  {"candidate_id":"FL-DOE-90721","legal_name":"Maria Elvira Salazar","race_id":"FL-27-general","level":"federal","race_status":"published","has_site":true},
  {"candidate_id":"FL-DOE-89933","legal_name":"Eliott Rodriguez","race_id":"FL-27-general","level":"federal","race_status":"published","has_site":true},
  {"candidate_id":"FL-DOE-91226","legal_name":"Carlos A. Gimenez","race_id":"FL-28-general","level":"federal","race_status":"published","has_site":true},
  {"candidate_id":"FL-DOE-91699","legal_name":"Phil \"Felipe\" Ehr","race_id":"FL-28-general","level":"federal","race_status":"published","has_site":true},
  {"candidate_id":"FL-DOE-90340","legal_name":"Eddy Rojas","race_id":"FL-28-general","level":"federal","race_status":"published","has_site":true},
  {"candidate_id":"FL-DOE-90696","legal_name":"Ryan Elijah","race_id":"FL-7-general","level":"federal","race_status":"published","has_site":true},
  {"candidate_id":"FL-DOE-90631","legal_name":"Bale Dalton","race_id":"FL-7-general","level":"federal","race_status":"published","has_site":true},
  {"candidate_id":"FL-DOE-92377","legal_name":"Christopher Dennison","race_id":"FL-7-general","level":"federal","race_status":"published","has_site":true},
  {"candidate_id":"FL-DOE-89522","legal_name":"Mike Haridopolos","race_id":"FL-8-general","level":"federal","race_status":"published","has_site":true},
  {"candidate_id":"FL-DOE-90831","legal_name":"Jennifer Jenkins","race_id":"FL-8-general","level":"federal","race_status":"published","has_site":true},
  {"candidate_id":"FL-DOE-91337","legal_name":"Dan Green","race_id":"FL-9-general","level":"federal","race_status":"published","has_site":true},
  {"candidate_id":"FL-DOE-89339","legal_name":"Darren Soto","race_id":"FL-9-general","level":"federal","race_status":"published","has_site":true},
  {"candidate_id":"FL-DOE-89119","legal_name":"Ashley Moody","race_id":"FL-SEN-general","level":"federal","race_status":"published","has_site":true},
  {"candidate_id":"FL-DOE-90009","legal_name":"Angie Nixon","race_id":"FL-SEN-general","level":"federal","race_status":"published","has_site":true},
  {"candidate_id":"FL-DOE-89955","legal_name":"Neil J. Gillespie","race_id":"FL-SEN-general","level":"federal","race_status":"published","has_site":true},
  {"candidate_id":"FL-VF-BRO-1179","legal_name":"Mark D. Bogen","race_id":"FL-BRO-CC2-general","level":"county","race_status":"listed","has_site":false},
  {"candidate_id":"FL-VF-BRO-1178","legal_name":"Lamar Fisher","race_id":"FL-BRO-CC4-general","level":"county","race_status":"listed","has_site":false},
  {"candidate_id":"FL-VF-BRO-1041","legal_name":"Caryl Sandler Shuham","race_id":"FL-BRO-CC6-general","level":"county","race_status":"listed","has_site":true},
  {"candidate_id":"FL-VF-BRO-1182","legal_name":"Robert McKinzie","race_id":"FL-BRO-CC8-general","level":"county","race_status":"listed","has_site":false},
  {"candidate_id":"FL-VF-BRO-1194","legal_name":"Maura McCarthy Bulman","race_id":"FL-BRO-SB1-general","level":"county","race_status":"published","has_site":true},
  {"candidate_id":"FL-VF-BRO-1191","legal_name":"Nicole Morst","race_id":"FL-BRO-SB4-general","level":"county","race_status":"published","has_site":true},
  {"candidate_id":"FL-VF-BRO-1184","legal_name":"Adam Cervera","race_id":"FL-BRO-SB6-general","level":"county","race_status":"listed","has_site":true},
  {"candidate_id":"FL-VF-BRO-1172","legal_name":"Roberto Fernandez III","race_id":"FL-BRO-SB6-general","level":"county","race_status":"listed","has_site":true},
  {"candidate_id":"FL-VF-BRO-1254","legal_name":"Cynthia Alceus Dominique","race_id":"FL-BRO-SB7-general","level":"county","race_status":"published","has_site":true},
  {"candidate_id":"FL-VF-BRO-1195","legal_name":"Allen Zeman","race_id":"FL-BRO-SBAL8-general","level":"county","race_status":"listed","has_site":true},
  {"candidate_id":"FL-VF-DAD-2964","legal_name":"Marleine Bastien","race_id":"FL-DAD-CC2-general","level":"county","race_status":"published","has_site":true},
  {"candidate_id":"FL-VF-DAD-2949","legal_name":"Vicki L. Lopez","race_id":"FL-DAD-CC5-general","level":"county","race_status":"published","has_site":true},
  {"candidate_id":"FL-VF-DAD-2998","legal_name":"Rob Piper","race_id":"FL-DAD-CC5-general","level":"county","race_status":"published","has_site":true},
  {"candidate_id":"FL-VF-DAD-3076","legal_name":"Linda Cothiere","race_id":"FL-DAD-SB1-general","level":"county","race_status":"published","has_site":true},
  {"candidate_id":"FL-VF-DAD-3070","legal_name":"Katrina Wilson","race_id":"FL-DAD-SB1-general","level":"county","race_status":"published","has_site":true},
  {"candidate_id":"FL-VF-DAD-2926","legal_name":"Dorothy Bendross-Mindingall","race_id":"FL-DAD-SB2-general","level":"county","race_status":"listed","has_site":false},
  {"candidate_id":"FL-VF-DAD-2953","legal_name":"Monica Colucci","race_id":"FL-DAD-SB8-general","level":"county","race_status":"listed","has_site":false},
  {"candidate_id":"FL-VF-HIL-2880","legal_name":"Jackie Toledo","race_id":"FL-HIL-CC1-general","level":"county","race_status":"published","has_site":true},
  {"candidate_id":"FL-VF-HIL-2640","legal_name":"Harry Cohen","race_id":"FL-HIL-CC1-general","level":"county","race_status":"published","has_site":true},
  {"candidate_id":"FL-VF-HIL-2646","legal_name":"Luiz F. F. Garcia","race_id":"FL-HIL-CC3-general","level":"county","race_status":"published","has_site":true},
  {"candidate_id":"FL-VF-HIL-2621","legal_name":"Gwen Myers","race_id":"FL-HIL-CC3-general","level":"county","race_status":"published","has_site":true},
  {"candidate_id":"FL-VF-HIL-2661","legal_name":"Stacy Hahn","race_id":"FL-HIL-CC5-general","level":"county","race_status":"published","has_site":true},
  {"candidate_id":"FL-VF-HIL-2636","legal_name":"Neil Manimala","race_id":"FL-HIL-CC5-general","level":"county","race_status":"published","has_site":true},
  {"candidate_id":"FL-VF-HIL-2620","legal_name":"Joshua Wostal","race_id":"FL-HIL-CC7-general","level":"county","race_status":"published","has_site":true},
  {"candidate_id":"FL-VF-HIL-2660","legal_name":"Aileen Rodriguez","race_id":"FL-HIL-CC7-general","level":"county","race_status":"published","has_site":true},
  {"candidate_id":"FL-VF-HIL-2677","legal_name":"Brittany Lyssy","race_id":"FL-HIL-SB2-general","level":"county","race_status":"published","has_site":true},
  {"candidate_id":"FL-VF-HIL-2675","legal_name":"Daniela Simic","race_id":"FL-HIL-SB2-general","level":"county","race_status":"published","has_site":true},
  {"candidate_id":"FL-VF-HIL-2672","legal_name":"Patricia \"Patti\" Rendon","race_id":"FL-HIL-SB4-general","level":"county","race_status":"listed","has_site":true},
  {"candidate_id":"FL-VF-HIL-2610","legal_name":"Kenneth \"Ken\" Gay","race_id":"FL-HIL-SB6-general","level":"county","race_status":"listed","has_site":true},
  {"candidate_id":"FL-VF-HIL-2645","legal_name":"Karen Perez","race_id":"FL-HIL-SB6-general","level":"county","race_status":"listed","has_site":true},
  {"candidate_id":"FL-VF-ORA-1290","legal_name":"Kamia Brown","race_id":"FL-ORA-CC2-general","level":"county","race_status":"published","has_site":true},
  {"candidate_id":"FL-VF-ORA-1384","legal_name":"Mike Crabb","race_id":"FL-ORA-CC2-general","level":"county","race_status":"published","has_site":true},
  {"candidate_id":"FL-VF-ORA-1260","legal_name":"Brian Jones","race_id":"FL-ORA-CC4-general","level":"county","race_status":"listed","has_site":true},
  {"candidate_id":"FL-VF-ORA-1279","legal_name":"Johanna Lopez","race_id":"FL-ORA-CC4-general","level":"county","race_status":"listed","has_site":true},
  {"candidate_id":"FL-VF-ORA-1295","legal_name":"Lawanna Gelzer","race_id":"FL-ORA-CC6-general","level":"county","race_status":"listed","has_site":true},
  {"candidate_id":"FL-VF-ORA-1265","legal_name":"Michael \"Mike\" Scott","race_id":"FL-ORA-CC6-general","level":"county","race_status":"listed","has_site":true},
  {"candidate_id":"FL-VF-ORA-1283","legal_name":"Patricia Rumph","race_id":"FL-ORA-CC7-general","level":"county","race_status":"published","has_site":true},
  {"candidate_id":"FL-VF-ORA-1271","legal_name":"Vicki Vargo","race_id":"FL-ORA-CC7-general","level":"county","race_status":"published","has_site":true},
  {"candidate_id":"FL-VF-ORA-1275","legal_name":"Jeannette Quinones Hernandez","race_id":"FL-ORA-CC8-general","level":"county","race_status":"published","has_site":true},
  {"candidate_id":"FL-VF-ORA-1272","legal_name":"Victor M. Torres Jr.","race_id":"FL-ORA-CC8-general","level":"county","race_status":"published","has_site":true},
  {"candidate_id":"FL-VF-ORA-1401","legal_name":"Roberta Walton Johnson","race_id":"FL-ORA-CLERK-general","level":"county","race_status":"listed","has_site":true},
  {"candidate_id":"FL-VF-ORA-1364","legal_name":"Terrell Thomas","race_id":"FL-ORA-CLERK-general","level":"county","race_status":"listed","has_site":true},
  {"candidate_id":"FL-VF-ORA-1239","legal_name":"Chris Messina","race_id":"FL-ORA-MAYOR-general","level":"county","race_status":"published","has_site":true},
  {"candidate_id":"FL-VF-ORA-1236","legal_name":"Tiffany Moore Russell","race_id":"FL-ORA-MAYOR-general","level":"county","race_status":"published","has_site":true},
  {"candidate_id":"FL-VF-ORA-1270","legal_name":"Melissa Lopez Marantes","race_id":"FL-ORA-SB1-general","level":"county","race_status":"listed","has_site":true},
  {"candidate_id":"FL-VF-ORA-1318","legal_name":"Gloria Reina O'Neal","race_id":"FL-ORA-SB2-general","level":"county","race_status":"published","has_site":true},
  {"candidate_id":"FL-VF-ORA-1314","legal_name":"Diana Moore","race_id":"FL-ORA-SB3-general","level":"county","race_status":"listed","has_site":true},
  {"candidate_id":"FL-VF-ORA-1242","legal_name":"Susanne Peña","race_id":"FL-ORA-SB3-general","level":"county","race_status":"listed","has_site":true},
  {"candidate_id":"FL-VF-ORA-1245","legal_name":"Angie Gallo","race_id":"FL-ORA-SBCHAIR-general","level":"county","race_status":"listed","has_site":false}
]
```

Check it against the planning-time hash:

```bash
"$NODE" -e '
const fx = require("./scripts/fixtures/roster/ballot-roster-2026-10-08.json");
const rows = fx.map((r) => [r.race_id, r.candidate_id, r.legal_name, r.race_status, r.has_site].join("|"))
  .sort((a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b)));
console.log(rows.length, require("node:crypto").createHash("md5").update(rows.join("\n")).digest("hex"));'
```
Expected: `106 5cd9b7dd8396e65da89136c1fadf058b`.

- [ ] **Step 2: Extend the test**

In `scripts/verify-roster-worksheet.ts`, add this import block directly below the `} from "./roster-reads-lib.ts";` line:

```ts
import {
  applyBlocks,
  checkWorksheet,
  fillTimes,
  generatedBlocks,
  labelFor,
  loadRoster,
  officialHost,
  ruleOf,
  timesFromRounds,
  type RosterRow,
} from "./roster-worksheet.ts";
```

Then insert this section directly above the line `if (failures) {` near the end of the file:

```ts
/* ---- 2. worksheet rules and the generator, on made-up rows ------------------ */

const fullRoster = loadRoster();
const raceIds = [...new Set(fullRoster.map((r) => r.race_id))];
check(
  "the roster fixture is the 2026-10-08 ballot: 106 candidates, 53 races, 9 without a site",
  fullRoster.length === 106 && raceIds.length === 53 && fullRoster.filter((r) => !r.has_site).length === 9,
);
check("every one of the 53 races has a label (§3.5)", raceIds.every((id) => labelFor(id) !== null));
check(
  "labels by race (§3.5), and none for an unknown id",
  labelFor("FL-20-general") === "Member of the U.S. House now" &&
    labelFor("FL-SEN-general") === "Member of the U.S. Senate now" &&
    labelFor("FL-GOV-general") === "Holds this office now" &&
    labelFor("FL-ORA-CLERK-general") === "Holds this office now" &&
    labelFor("FL-ORA-MAYOR-general") === "Holds this office now" &&
    labelFor("FL-DAD-CC5-general") === "Member of the Miami-Dade County Commission now" &&
    labelFor("FL-BRO-SBAL8-general") === "Member of the Broward County School Board now" &&
    labelFor("FL-ORA-SBCHAIR-general") === "Member of the Orange County School Board now" &&
    labelFor("FL-XYZ-general") === null,
);
check(
  "official hosts: the body's own site and house.gov count; Ballotpedia, the FEC and http do not",
  officialHost("https://clerk.house.gov/xml/lists/MemberData.xml") &&
    officialHost("https://soto.house.gov/") &&
    officialHost("https://www.ocps.net/school-board") &&
    !officialHost("https://ballotpedia.org/Florida") &&
    !officialHost("https://api.open.fec.gov/v1/candidates/") &&
    !officialHost("http://www.ocps.net/school-board"),
);

const MINI: RosterRow[] = [
  { candidate_id: "FL-DOE-1", legal_name: "Ann Member", race_id: "FL-20-general", level: "federal", race_status: "published", has_site: true },
  { candidate_id: "FL-DOE-2", legal_name: "Bo O'Neal", race_id: "FL-20-general", level: "federal", race_status: "published", has_site: true },
  { candidate_id: "FL-DOE-3", legal_name: "Cy Governor", race_id: "FL-GOV-general", level: "state", race_status: "published", has_site: false },
  { candidate_id: "FL-VF-ORA-4", legal_name: "Di Board", race_id: "FL-ORA-SBCHAIR-general", level: "county", race_status: "listed", has_site: false },
  { candidate_id: "FL-VF-HIL-5", legal_name: "Ed One", race_id: "FL-HIL-SB6-general", level: "county", race_status: "listed", has_site: true },
  { candidate_id: "FL-VF-HIL-6", legal_name: "Flo Two", race_id: "FL-HIL-SB6-general", level: "county", race_status: "listed", has_site: true },
];
const T1 = "2026-10-09T13:00Z";
const T2 = "2026-10-09T14:30Z";
const CLERK = "https://clerk.house.gov/xml/lists/MemberData.xml";
const HIL = "https://www.hillsboroughschools.org/page/school-board";
const MINI_MD = `# test worksheet

<!-- table:candidates -->
| candidate_id | legal_name | race_id | label | incumbent | holds_this_seat | source_url | read_1 | read_2 | second_page | evidence |
|---|---|---|---|---|---|---|---|---|---|---|
| FL-DOE-1 | Ann Member | FL-20-general | Member of the U.S. House now | Yes | No | ${CLERK} | ${T1} | ${T2} | https://member.house.gov/ | "FL25 Ann Member" |
| FL-DOE-2 | Bo O'Neal | FL-20-general | Member of the U.S. House now | No | No | ${CLERK} | ${T1} | ${T2} | — | "FL20 Vacancy due to the resignation" |
| FL-DOE-3 | Cy Governor | FL-GOV-general | Holds this office now | No | No | https://www.flgov.com/eog/ | ${T1} | ${T2} | — | "Governor Example Holder" |
| FL-VF-ORA-4 | Di Board | FL-ORA-SBCHAIR-general | Member of the Orange County School Board now | Yes | No | https://www.ocps.net/school-board | ${T1} | ${T2} | https://www.ocps.net/district-1 | "Di Board District 1" |
| FL-VF-HIL-5 | Ed One | FL-HIL-SB6-general | Member of the Hillsborough County School Board now | Yes | Yes | ${HIL} | ${T1} | ${T2} | https://www.hillsboroughschools.org/page/district-6 | "Ed One District 6" |
| FL-VF-HIL-6 | Flo Two | FL-HIL-SB6-general | Member of the Hillsborough County School Board now | Yes | No | ${HIL} | ${T1} | ${T2} | https://www.hillsboroughschools.org/page/district-2 | "Flo Two District 2" |

<!-- table:races -->
| race_id | incumbent_id | is_open_seat | own_seat_holder_today | note |
|---|---|---|---|---|
| FL-20-general | FL-DOE-1 | false | vacant |  |
| FL-GOV-general | NULL | true | Governor Example Holder |  |
| FL-ORA-SBCHAIR-general | FL-VF-ORA-4 | false | Chair Example |  |
| FL-HIL-SB6-general | FL-VF-HIL-5 | false | Ed One | two members run; Ed One holds District 6 |

<!-- table:fec -->
| candidate_id | race_id | fec_candidate_id | incumbent_challenge | election_districts | read_1 | read_2 |
|---|---|---|---|---|---|---|
| FL-DOE-1 | FL-20-general | H0FL00000 | I | 25, 25, 20 | ${T1} | ${T2} |
| FL-DOE-2 | FL-20-general | no match | — | — | ${T1} | ${T2} |

<!-- table:tickets -->
| candidate_id | governor | can_detail_url | raw_json | stored | read_1 | read_2 | reread_2026-10-17 | reread_2026-10-26 | reread_2026-11-02 |
|---|---|---|---|---|---|---|---|---|---|
| FL-DOE-3 | Cy Governor | https://dos.elections.myflorida.com/candidates/canDetail.asp?account=3 | \`${JSON.stringify(RAW_90630)}\` | Ruben A. Coto | ${T1} | ${T2} | — | — | — |

<!-- table:sites -->
| candidate_id | race_id | race_status | result | read_1 | read_2 | action | evidence |
|---|---|---|---|---|---|---|---|
| FL-DOE-3 | FL-GOV-general | published | none found | ${T1} | ${T2} | none | "domain parked" |
| FL-VF-ORA-4 | FL-ORA-SBCHAIR-general | listed | https://diboard.example/ | ${T1} | ${T2} | write now | "Di Board for School Board Chair" |
`;

const miniProblems = checkWorksheet(MINI_MD, MINI);
check("a complete made-up worksheet passes every rule", miniProblems.length === 0, miniProblems.join("; "));

/** Replace one exact line fragment and expect a problem mentioning `want`. */
function mutation(name: string, from: string, to: string, want: string) {
  if (!MINI_MD.includes(from)) {
    check(`mutation fixture: ${name}`, false, `fragment not found: ${from}`);
    return;
  }
  const problems = checkWorksheet(MINI_MD.replace(from, to), MINI);
  check(`caught: ${name}`, problems.some((p) => p.includes(want)), problems.join("; ") || "no problem raised");
}
mutation("a Yes with no second page", "| https://member.house.gov/ |", "| — |", "a Yes needs a second, different official page");
mutation(
  "a source that is not official (Ballotpedia)",
  `| FL-DOE-2 | Bo O'Neal | FL-20-general | Member of the U.S. House now | No | No | ${CLERK} |`,
  `| FL-DOE-2 | Bo O'Neal | FL-20-general | Member of the U.S. House now | No | No | https://ballotpedia.org/x |`,
  "is not an official https page",
);
mutation(
  "two reads less than an hour apart",
  `| ${CLERK} | ${T1} | ${T2} | https://member.house.gov/ |`,
  `| ${CLERK} | ${T1} | 2026-10-09T13:30Z | https://member.house.gov/ |`,
  "at least an hour apart",
);
mutation(
  "evidence longer than 15 words",
  '"FL25 Ann Member"',
  '"one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen"',
  "evidence must be",
);
mutation("is_open_seat that disagrees with incumbent_id", "| FL-20-general | FL-DOE-1 | false |", "| FL-20-general | FL-DOE-1 | true |", "is_open_seat must be true exactly");
mutation(
  "two members in one race: incumbent_id must be the one holding this seat",
  "| FL-HIL-SB6-general | FL-VF-HIL-5 | false |",
  "| FL-HIL-SB6-general | FL-VF-HIL-6 | false |",
  "incumbent_id must be FL-VF-HIL-5",
);
mutation(
  "holds this seat without being an incumbent",
  `| Member of the Hillsborough County School Board now | Yes | Yes |`,
  `| Member of the Hillsborough County School Board now | No | Yes |`,
  "holds this seat but is not an incumbent",
);
mutation(
  "a site found in a published race is not written now (D11)",
  "| published | none found | " + T1 + " | " + T2 + " | none |",
  "| published | https://cygov.example/ | " + T1 + " | " + T2 + " | write now |",
  "held until after Nov 3",
);
mutation(
  "a site result that is neither a find, 'none found' nor 'withheld'",
  "| published | none found |",
  "| published | maybe later |",
  "result must be 'none found', 'withheld'",
);
mutation("a stored running mate that is not D6 of the raw string", "| Ruben A. Coto |", "| Ruben  A. Coto |", "stored must be normalizeDoeText");
mutation("a missing candidate row", "| FL-VF-HIL-6 | Flo Two |", "| FL-VF-HIL-7 | Flo Two |", "candidates: missing FL-VF-HIL-6");
mutation("the Governor race is not open (spec §3.4)", "| FL-GOV-general | NULL | true |", "| FL-GOV-general | FL-DOE-3 | false |", "FL-GOV-general");

const blocks = generatedBlocks(MINI_MD, MINI, "membership");
check(
  "generated candidates: every row, names escaped, the first read's date, fec_id only where matched",
  blocks.candidates.length === 6 &&
    blocks.candidates[0] === "    ('FL-DOE-1', 'Ann Member', true, 'https://clerk.house.gov/xml/lists/MemberData.xml', '2026-10-09T00:00:00Z', 'H0FL00000')," &&
    blocks.candidates[1] === "    ('FL-DOE-2', 'Bo O''Neal', false, 'https://clerk.house.gov/xml/lists/MemberData.xml', '2026-10-09T00:00:00Z', NULL)," &&
    blocks.candidates[5].endsWith("NULL)"),
  blocks.candidates.join("\n"),
);
check(
  "generated race overrides: only a race with two or more incumbents, naming the seat holder",
  blocks.race_overrides.join("\n") === "    ,('FL-HIL-SB6-general', 'FL-VF-HIL-5')",
  blocks.race_overrides.join("\n"),
);
check(
  "generated tickets and listed-race sites",
  blocks.tickets.join("\n") ===
    "    ('FL-DOE-3', 'Cy Governor', 'Ruben A. Coto', 'https://dos.elections.myflorida.com/candidates/canDetail.asp?account=3', '2026-10-09T00:00:00Z')" &&
    blocks.sites.join("\n") === "    ,('FL-VF-ORA-4', 'Di Board', 'https://diboard.example/', '2026-10-09T00:00:00Z')",
);
check(
  "generated totals: incumbents counted, sited = 97 + listed-race finds, the D1 rule named",
  blocks.totals.join("\n").includes("D1 rule: membership (Recommended)") &&
    blocks.totals.includes("  n_incumbents_expected CONSTANT int := 4;") &&
    blocks.totals.includes("  n_sited_expected      CONSTANT int := 98;"),
  blocks.totals.join("\n"),
);
const seatBlocks = generatedBlocks(MINI_MD, MINI, "seat");
check(
  "D1 TO FLIP (--d1 seat): only seat holders are incumbents, so no race needs an override",
  seatBlocks.candidates.filter((l) => l.includes(", true, ")).length === 1 &&
    seatBlocks.race_overrides.length === 0 &&
    seatBlocks.totals.includes("  n_incumbents_expected CONSTANT int := 1;"),
);

const TEMPLATE = [
  "x",
  "    -- BEGIN generated: candidates",
  "    stale",
  "    -- END generated: candidates",
  "    ('__none__', NULL::text)",
  "    -- BEGIN generated: race_overrides",
  "    -- END generated: race_overrides",
  "    -- BEGIN generated: tickets",
  "    -- END generated: tickets",
  "    -- BEGIN generated: sites",
  "    -- END generated: sites",
  "  -- BEGIN generated: totals",
  "  -- END generated: totals",
  "",
].join("\n");
const once = applyBlocks(TEMPLATE, blocks);
check(
  "applyBlocks replaces each block between its markers and is idempotent",
  !once.includes("stale") && once.includes("'Bo O''Neal'") && applyBlocks(once, blocks) === once,
);
check("ruleOf reads the D1 rule back from the SQL", ruleOf(once) === "membership" && ruleOf(applyBlocks(TEMPLATE, seatBlocks)) === "seat");
check("applyBlocks refuses SQL without the markers", throws(() => applyBlocks("SELECT 1;", blocks)));

const roundA = {
  "house-clerk": { key: "house-clerk", url: CLERK, readAt: "2026-10-09T13:00:41.123Z", ok: true },
  "fec-h-08": { key: "fec-h-08", url: "https://api.open.fec.gov/v1/candidates/?district=08", readAt: "2026-10-09T13:02:05.000Z", ok: true },
  "fec-s": { key: "fec-s", url: "https://api.open.fec.gov/v1/candidates/?office=S", readAt: "2026-10-09T13:03:00.000Z", ok: true },
  "atg-home": { key: "atg-home", url: "https://www.myfloridalegal.com/", readAt: "2026-10-09T13:04:00.000Z", ok: false },
};
const roundB = {
  "house-clerk": { key: "house-clerk", url: CLERK, readAt: "2026-10-09T14:31:09.000Z", ok: true },
  "fec-h-08": { key: "fec-h-08", url: "https://api.open.fec.gov/v1/candidates/?district=08", readAt: "2026-10-09T14:32:00.000Z", ok: true },
  "fec-s": { key: "fec-s", url: "https://api.open.fec.gov/v1/candidates/?office=S", readAt: "2026-10-09T14:33:00.000Z", ok: true },
  "atg-home": { key: "atg-home", url: "https://www.myfloridalegal.com/", readAt: "2026-10-09T14:34:00.000Z", ok: true },
};
const tm = timesFromRounds(roundA, roundB);
check(
  "read times: by URL, FEC keys by race, minutes in UTC, a key missed in either round left out",
  tm.get(CLERK)?.join(" ") === "2026-10-09T13:00Z 2026-10-09T14:31Z" &&
    tm.get("fec:FL-8-general")?.join(" ") === "2026-10-09T13:02Z 2026-10-09T14:32Z" &&
    tm.get("fec:FL-SEN-general")?.join(" ") === "2026-10-09T13:03Z 2026-10-09T14:33Z" &&
    !tm.has("https://www.myfloridalegal.com/"),
  JSON.stringify([...tm]),
);
const blankTimes = MINI_MD.split(T1).join("").split(T2).join("");
const filled = fillTimes(
  blankTimes,
  new Map<string, readonly [string, string]>([
    [CLERK, [T1, T2]],
    ["https://www.flgov.com/eog/", [T1, T2]],
    ["https://www.ocps.net/school-board", [T1, T2]],
    [HIL, [T1, T2]],
    ["https://dos.elections.myflorida.com/candidates/canDetail.asp?account=3", [T1, T2]],
    ["https://diboard.example/", [T1, T2]],
    ["fec:FL-20-general", [T1, T2]],
  ]),
);
const afterFill = checkWorksheet(filled, MINI);
check(
  "fillTimes fills every row whose page was read in both rounds, and leaves a row with no URL alone",
  afterFill.length === 1 && afterFill[0].startsWith("sites FL-DOE-3: read_1/read_2"),
  afterFill.join("; "),
);
```

- [ ] **Step 3: Run it and watch it fail**

Run: `"$NODE" scripts/verify-roster-worksheet.ts`
Expected: exits non-zero with `ERR_MODULE_NOT_FOUND` for `scripts/roster-worksheet.ts`.

- [ ] **Step 4: Write the worksheet module**

Create `scripts/roster-worksheet.ts`:

```ts
/* The roster-completeness worksheet, and the SQL written from it
   (docs/superpowers/specs/2026-10-08-roster-completeness-design.md §3.1, §3.4).

     node scripts/roster-worksheet.ts --skeleton            print an empty worksheet
     node scripts/roster-worksheet.ts --fill-times r1 r2    fill read_1/read_2 from two rounds
     node scripts/roster-worksheet.ts --check               list every problem; exit 1 if any
     node scripts/roster-worksheet.ts --write-migration [--d1 membership|seat]
                                                            rewrite the generated blocks of
                                                            supabase/migrations/0049_roster_completeness.sql

   The worksheet (docs/general-election/roster-completeness-2026-10.md) is
   written by hand from the reads in .roster-reads/ (scripts/roster-reads.ts).
   Its machine tables follow a `<!-- table:<name> -->` marker. The migration's
   data is GENERATED from it, between `-- BEGIN generated: <name>` and
   `-- END generated: <name>` lines, so the SQL can never drift from what the
   founder reviews; scripts/verify-roster-worksheet.ts fails if it does.

   --d1 picks which worksheet column becomes candidate.is_incumbent:
   membership (Recommended, D1): serves today in the office or on the body
   the race elects to; seat (D1's TO FLIP): holds this race's own seat. Both
   columns are always filled, so a flip is this flag, not a new read. */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { canDetailUrl, normalizeDoeText, worksheetTime } from "./roster-reads-lib.ts";

export const ROOT = resolve(import.meta.dirname, "..");
export const WORKSHEET_PATH = "docs/general-election/roster-completeness-2026-10.md";
export const MIGRATION_PATH = "supabase/migrations/0049_roster_completeness.sql";
export const ROSTER_FIXTURE = "scripts/fixtures/roster/ballot-roster-2026-10-08.json";
/** Ballot candidates with an official_site before this migration (0036, 0038, 0039). */
export const SITED_BEFORE = 97;
export const DASH = "—";

export interface RosterRow {
  candidate_id: string;
  legal_name: string;
  race_id: string;
  level: "federal" | "state" | "county";
  race_status: "published" | "listed";
  has_site: boolean;
}

export type D1Rule = "membership" | "seat";
export type Row = Record<string, string>;

export function loadRoster(root = ROOT): RosterRow[] {
  return JSON.parse(readFileSync(join(root, ROSTER_FIXTURE), "utf8")) as RosterRow[];
}

/* ---- labels (§3.5) ----------------------------------------------------
   The display PR (PR 2) owns the label table voters see, in
   src/lib/incumbency.ts. This copy only fills and checks the worksheet's
   label column; PR 2's verify-incumbent-chip.ts maps the same 53 race ids. */

export const OFFICE_LABEL = "Holds this office now";
const COUNTY_NAME: Record<string, string> = {
  BRO: "Broward",
  DAD: "Miami-Dade",
  HIL: "Hillsborough",
  ORA: "Orange",
};

export function labelFor(raceId: string): string | null {
  if (/^FL-\d+-general$/.test(raceId)) return "Member of the U.S. House now";
  if (raceId === "FL-SEN-general") return "Member of the U.S. Senate now";
  if (/^FL-(GOV|ATG|CFO|AGR)-general$/.test(raceId)) return OFFICE_LABEL;
  if (raceId === "FL-ORA-MAYOR-general" || raceId === "FL-ORA-CLERK-general") return OFFICE_LABEL;
  const m = /^FL-(BRO|DAD|HIL|ORA)-(CC|SB)[A-Z0-9]*-general$/.exec(raceId);
  if (m) return `Member of the ${COUNTY_NAME[m[1]]} County ${m[2] === "CC" ? "Commission" : "School Board"} now`;
  return null;
}

/* ---- sources ------------------------------------------------------------
   A source of record or a second page is an official host: the office's or
   body's own site, the House Clerk, house.gov / senate.gov. Ballotpedia,
   the FEC, news and campaign sites never decide a row (§3.3). A county
   Supervisor of Elections host counts only for a page listing CURRENT
   officeholders; its 2026 candidate list never states incumbency
   (0031:41-43). Add a host here only with a line in the worksheet's Method
   section saying whose site it is. */

export const OFFICIAL_HOSTS = [
  "house.gov",
  "senate.gov",
  "flgov.com",
  "myfloridalegal.com",
  "myfloridacfo.com",
  "fdacs.gov",
  "broward.org",
  "miamidade.gov",
  "hcfl.gov",
  "orangecountyfl.net",
  "browardschools.com",
  "dadeschools.net",
  "hillsboroughschools.org",
  "ocps.net",
  "myorangeclerk.com",
  "browardvotes.gov",
  "votehillsborough.gov",
  "voteorangefl.gov",
] as const;

export function officialHost(url: string): boolean {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    return u.protocol === "https:" && OFFICIAL_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

const TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}Z$/;
const FEC_ID = /^[HS]\d[A-Z]{2}\d{5}$/;
const ORIGIN = /^https:\/\/[a-z0-9.-]+\/$/;

const hourApart = (a: string, b: string) =>
  TIME.test(a) && TIME.test(b) && Date.parse(b) - Date.parse(a) >= 60 * 60 * 1000;
export function evidenceOk(cell: string): boolean {
  const m = /^"(.+)"$/.exec(cell);
  if (!m) return false;
  const words = m[1].trim().split(/\s+/).filter(Boolean).length;
  return words >= 1 && words <= 15;
}

/* ---- tables -------------------------------------------------------------- */

export const COLUMNS = {
  candidates: ["candidate_id", "legal_name", "race_id", "label", "incumbent", "holds_this_seat", "source_url", "read_1", "read_2", "second_page", "evidence"],
  races: ["race_id", "incumbent_id", "is_open_seat", "own_seat_holder_today", "note"],
  fec: ["candidate_id", "race_id", "fec_candidate_id", "incumbent_challenge", "election_districts", "read_1", "read_2"],
  tickets: ["candidate_id", "governor", "can_detail_url", "raw_json", "stored", "read_1", "read_2", "reread_2026-10-17", "reread_2026-10-26", "reread_2026-11-02"],
  sites: ["candidate_id", "race_id", "race_status", "result", "read_1", "read_2", "action", "evidence"],
} as const;
export type TableName = keyof typeof COLUMNS;

const splitRow = (line: string) =>
  line.replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
const tableRow = (cells: string[]) => `| ${cells.join(" | ")} |`;

/** The rows of the table after `<!-- table:<name> -->`. Throws on a missing
    marker, a wrong header or a row with the wrong number of cells. */
export function parseTable(md: string, name: TableName): Row[] {
  const marker = `<!-- table:${name} -->`;
  const at = md.indexOf(marker);
  if (at < 0) throw new Error(`worksheet: no ${marker}`);
  const lines = md.slice(at + marker.length).split("\n").map((l) => l.trim());
  let i = 0;
  while (i < lines.length && !lines[i].startsWith("|")) i++;
  const rows: string[][] = [];
  for (; i < lines.length && lines[i].startsWith("|"); i++) rows.push(splitRow(lines[i]));
  const [header, , ...body] = rows;
  const want = COLUMNS[name] as readonly string[];
  if (!header || header.join("|") !== want.join("|")) {
    throw new Error(`worksheet: table ${name} header must be | ${want.join(" | ")} |`);
  }
  return body.map((cells, k) => {
    if (cells.length !== want.length) {
      throw new Error(`worksheet: table ${name} row ${k + 1} has ${cells.length} cells, expected ${want.length}`);
    }
    return Object.fromEntries(want.map((h, j) => [h, cells[j]]));
  });
}

export interface Worksheet {
  candidates: Row[];
  races: Row[];
  fec: Row[];
  tickets: Row[];
  sites: Row[];
}

export function parseWorksheet(md: string): Worksheet {
  return {
    candidates: parseTable(md, "candidates"),
    races: parseTable(md, "races"),
    fec: parseTable(md, "fec"),
    tickets: parseTable(md, "tickets"),
    sites: parseTable(md, "sites"),
  };
}

const rawOf = (cell: string) => cell.replace(/^`/, "").replace(/`$/, "");

/** incumbent_id per race under a rule (§3.1): the one candidate with the
    fact; NULL when none; when two or more, the one holding this race's own
    seat, else NULL. */
export function expectedIncumbents(ws: Worksheet, roster: RosterRow[], rule: D1Rule) {
  const byId = new Map(ws.candidates.map((c) => [c.candidate_id, c]));
  const out = new Map<string, { incumbent: string | null; count: number }>();
  for (const raceId of [...new Set(roster.map((r) => r.race_id))]) {
    const inRace = roster.filter((r) => r.race_id === raceId).map((r) => byId.get(r.candidate_id));
    const fact = inRace.filter((c) => c && (rule === "seat" ? c.holds_this_seat : c.incumbent) === "Yes");
    const seat = inRace.filter((c) => c && c.holds_this_seat === "Yes");
    const incumbent =
      fact.length === 1 ? fact[0]!.candidate_id : fact.length > 1 && seat.length === 1 ? seat[0]!.candidate_id : null;
    out.set(raceId, { incumbent, count: fact.length });
  }
  return out;
}

function sameSet(problems: string[], what: string, got: string[], want: string[]) {
  const g = new Set(got);
  const w = new Set(want);
  for (const id of want) if (!g.has(id)) problems.push(`${what}: missing ${id}`);
  for (const id of got) if (!w.has(id)) problems.push(`${what}: unexpected ${id}`);
  if (g.size !== got.length) problems.push(`${what}: an id appears twice`);
}

/** Every rule the worksheet must meet before SQL is written from it. */
export function checkWorksheet(md: string, roster: RosterRow[]): string[] {
  const problems: string[] = [];
  let ws: Worksheet;
  try {
    ws = parseWorksheet(md);
  } catch (err) {
    return [(err as Error).message];
  }
  const rosterById = new Map(roster.map((r) => [r.candidate_id, r]));

  /* candidates */
  sameSet(problems, "candidates", ws.candidates.map((c) => c.candidate_id), roster.map((r) => r.candidate_id));
  for (const c of ws.candidates) {
    const r = rosterById.get(c.candidate_id);
    if (!r) continue;
    const p = (msg: string) => problems.push(`candidates ${c.candidate_id}: ${msg}`);
    if (c.legal_name !== r.legal_name) p(`legal_name "${c.legal_name}" is not "${r.legal_name}"`);
    if (c.race_id !== r.race_id) p(`race_id ${c.race_id} is not ${r.race_id}`);
    if (c.label !== labelFor(r.race_id)) p(`label must be "${labelFor(r.race_id)}"`);
    if (!["Yes", "No"].includes(c.incumbent)) p("incumbent must be Yes or No");
    if (!["Yes", "No"].includes(c.holds_this_seat)) p("holds_this_seat must be Yes or No");
    if (c.holds_this_seat === "Yes" && c.incumbent !== "Yes") p("holds this seat but is not an incumbent");
    if (labelFor(r.race_id) === OFFICE_LABEL && c.holds_this_seat !== c.incumbent) {
      p("a one-holder office: holds_this_seat must equal incumbent");
    }
    if (!officialHost(c.source_url)) p(`source_url ${c.source_url || "(empty)"} is not an official https page`);
    if (!hourApart(c.read_1, c.read_2)) p("read_1/read_2 must be YYYY-MM-DDTHH:MMZ, at least an hour apart");
    if (c.incumbent === "Yes") {
      if (!officialHost(c.second_page) || c.second_page === c.source_url) {
        p("a Yes needs a second, different official page");
      }
    } else if (c.second_page !== DASH) p(`second_page must be ${DASH} for a No`);
    if (!evidenceOk(c.evidence)) p("evidence must be the page's own words in quotes, 1 to 15 words");
  }

  /* races */
  const raceIds = [...new Set(roster.map((r) => r.race_id))];
  sameSet(problems, "races", ws.races.map((r) => r.race_id), raceIds);
  const expected = expectedIncumbents(ws, roster, "membership");
  for (const raceId of raceIds) {
    const holders = ws.candidates.filter((c) => rosterById.get(c.candidate_id)?.race_id === raceId && c.holds_this_seat === "Yes");
    if (holders.length > 1) problems.push(`races ${raceId}: ${holders.length} candidates hold this seat`);
  }
  for (const row of ws.races) {
    const e = expected.get(row.race_id);
    if (!e) continue;
    const p = (msg: string) => problems.push(`races ${row.race_id}: ${msg}`);
    const want = e.incumbent ?? "NULL";
    if (row.incumbent_id !== want) p(`incumbent_id must be ${want} (from the candidates table)`);
    if (row.is_open_seat !== (row.incumbent_id === "NULL" ? "true" : "false")) p("is_open_seat must be true exactly when incumbent_id is NULL");
    if (!row.own_seat_holder_today) p("own_seat_holder_today is empty");
  }
  const spec: [string, string][] = [
    ["FL-GOV-general", "NULL"],
    ["FL-ATG-general", "FL-DOE-89041"],
    ["FL-HIL-SB4-general", "FL-VF-HIL-2672"],
  ];
  for (const [raceId, want] of spec) {
    const row = ws.races.find((r) => r.race_id === raceId);
    if (row && row.incumbent_id !== want) {
      problems.push(`races ${raceId}: the spec's assertion (§3.4) expects ${want}; put the disagreement to the founder`);
    }
  }

  /* fec */
  const federal = roster.filter((r) => r.level === "federal");
  sameSet(problems, "fec", ws.fec.map((f) => f.candidate_id), federal.map((r) => r.candidate_id));
  for (const f of ws.fec) {
    const r = rosterById.get(f.candidate_id);
    if (!r) continue;
    const p = (msg: string) => problems.push(`fec ${f.candidate_id}: ${msg}`);
    if (f.race_id !== r.race_id) p(`race_id must be ${r.race_id}`);
    const matched = FEC_ID.test(f.fec_candidate_id);
    if (!matched && !["no match", "not read"].includes(f.fec_candidate_id)) p("fec_candidate_id must be an FEC id, 'no match' or 'not read'");
    if (matched && !["I", "C", "O"].includes(f.incumbent_challenge)) p("incumbent_challenge must be I, C or O");
    if (!matched && f.incumbent_challenge !== DASH) p(`incumbent_challenge must be ${DASH} without a match`);
    if (f.fec_candidate_id === "not read") {
      if (f.read_1 !== DASH || f.read_2 !== DASH) p(`read_1/read_2 must be ${DASH} when not read`);
    } else if (!hourApart(f.read_1, f.read_2)) p("read_1/read_2 must be at least an hour apart");
  }

  /* tickets */
  const gov = roster.filter((r) => r.race_id === "FL-GOV-general");
  sameSet(problems, "tickets", ws.tickets.map((t) => t.candidate_id), gov.map((r) => r.candidate_id));
  for (const t of ws.tickets) {
    const p = (msg: string) => problems.push(`tickets ${t.candidate_id}: ${msg}`);
    if (t.can_detail_url !== canDetailUrl(t.candidate_id.replace(/^FL-DOE-/, ""))) p("can_detail_url is not this candidate's canDetail page");
    if (!t.governor) p("governor (the name as the DoE page prints it) is empty");
    let raw: unknown;
    try {
      raw = JSON.parse(rawOf(t.raw_json));
    } catch {
      p("raw_json must be a JSON string");
    }
    if (typeof raw === "string") {
      let stored = "";
      try {
        stored = normalizeDoeText(raw);
      } catch (err) {
        p((err as Error).message);
      }
      if (!t.stored || t.stored !== stored) p(`stored must be normalizeDoeText(raw) = "${stored}"`);
    }
    if (!hourApart(t.read_1, t.read_2)) p("read_1/read_2 must be at least an hour apart");
    for (const col of ["reread_2026-10-17", "reread_2026-10-26", "reread_2026-11-02"]) {
      if (t[col] !== DASH && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}Z (same|CHANGED)$/.test(t[col])) {
        p(`${col} must be ${DASH} or "<time> same" / "<time> CHANGED"`);
      }
    }
  }

  /* sites */
  const unsited = roster.filter((r) => !r.has_site);
  sameSet(problems, "sites", ws.sites.map((s) => s.candidate_id), unsited.map((r) => r.candidate_id));
  for (const s of ws.sites) {
    const r = rosterById.get(s.candidate_id);
    if (!r) continue;
    const p = (msg: string) => problems.push(`sites ${s.candidate_id}: ${msg}`);
    if (s.race_id !== r.race_id || s.race_status !== r.race_status) p(`race must be ${r.race_id} (${r.race_status})`);
    const found = ORIGIN.test(s.result);
    /* "withheld": a genuine site that is not stored, as Colucci's compromised
       one was (founder decision 2026-09-25). */
    if (!found && !["none found", "withheld"].includes(s.result)) {
      p("result must be 'none found', 'withheld' or a site origin like https://example.com/");
    }
    if (!["write now", "hold until after Nov 3", "none"].includes(s.action)) p("action must be 'write now', 'hold until after Nov 3' or 'none'");
    if (!found && s.action !== "none") p("action must be 'none' when nothing was found");
    if (found && r.race_status === "published" && s.action !== "hold until after Nov 3") p("a find in a published race is held until after Nov 3 (D11)");
    if (found && r.race_status === "listed" && s.action !== "write now") p("a find in a listed race is written now (D11)");
    if (!hourApart(s.read_1, s.read_2)) p("read_1/read_2 must be at least an hour apart");
    if (!evidenceOk(s.evidence)) p("evidence must be in quotes, 1 to 15 words");
  }
  return problems;
}

/* ---- read times ----------------------------------------------------------- */

/** Fills read_1/read_2 from the two rounds' read times, keyed by URL for the
    candidates (source_url), tickets (can_detail_url) and sites (result, when
    it is a URL), and by `fec:<race_id>` for the FEC rows. A row whose page was
    not read in both rounds, and an FEC row marked "not read", keeps what it
    has. Pure: the CLI builds `times` from .roster-reads/<round>/index.json. */
export function fillTimes(md: string, times: ReadonlyMap<string, readonly [string, string]>): string {
  let table: TableName | null = null;
  let rowIndex = 0;
  return md
    .split("\n")
    .map((line) => {
      const marker = /^<!-- table:(\w+) -->$/.exec(line.trim());
      if (marker) {
        table = marker[1] in COLUMNS ? (marker[1] as TableName) : null;
        rowIndex = 0;
        return line;
      }
      if (!table || !line.trim().startsWith("|")) {
        if (table && line.trim() !== "") table = null;
        return line;
      }
      rowIndex++;
      if (rowIndex <= 2) return line;
      const cols = COLUMNS[table] as readonly string[];
      const cells = splitRow(line.trim());
      if (cells.length !== cols.length) return line;
      const row = Object.fromEntries(cols.map((c, j) => [c, cells[j]]));
      const key =
        table === "candidates" ? row.source_url
        : table === "tickets" ? row.can_detail_url
        : table === "sites" ? row.result
        : table === "fec" && row.fec_candidate_id !== "not read" ? `fec:${row.race_id}`
        : null;
      const t = key ? times.get(key) : undefined;
      if (!t) return line;
      cells[cols.indexOf("read_1")] = t[0];
      cells[cols.indexOf("read_2")] = t[1];
      return tableRow(cells);
    })
    .join("\n");
}

export interface IndexEntry {
  key: string;
  url: string;
  readAt: string;
  ok: boolean;
}

/** URL (and fec:<race_id>) -> [round a time, round b time], for every key
    read in both rounds. */
export function timesFromRounds(a: Record<string, IndexEntry>, b: Record<string, IndexEntry>) {
  const times = new Map<string, readonly [string, string]>();
  for (const key of Object.keys(a)) {
    const ea = a[key];
    const eb = b[key];
    if (!ea?.ok || !eb?.ok) continue;
    const pair = [worksheetTime(ea.readAt), worksheetTime(eb.readAt)] as const;
    const fec = /^fec-(?:h-(\d{2})|s)$/.exec(key);
    if (fec) times.set(`fec:FL-${fec[1] ? String(Number(fec[1])) : "SEN"}-general`, pair);
    else times.set(ea.url, pair);
  }
  return times;
}

/* ---- the SQL -------------------------------------------------------------- */

export type BlockName = "candidates" | "race_overrides" | "tickets" | "sites" | "totals";
const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
const dateOf = (t: string) => `${t.slice(0, 10)}T00:00:00Z`;
const INDENT = "    ";

export function generatedBlocks(md: string, roster: RosterRow[], rule: D1Rule): Record<BlockName, string[]> {
  const ws = parseWorksheet(md);
  const cand = new Map(ws.candidates.map((c) => [c.candidate_id, c]));
  const fec = new Map(ws.fec.map((f) => [f.candidate_id, f]));
  const candidates = roster.map((r, i) => {
    const c = cand.get(r.candidate_id)!;
    const isInc = (rule === "seat" ? c.holds_this_seat : c.incumbent) === "Yes";
    const f = fec.get(r.candidate_id)?.fec_candidate_id ?? "";
    const fecSql = FEC_ID.test(f) ? q(f) : "NULL";
    const comma = i < roster.length - 1 ? "," : "";
    return `${INDENT}(${q(r.candidate_id)}, ${q(r.legal_name)}, ${isInc}, ${q(c.source_url)}, ${q(dateOf(c.read_1))}, ${fecSql})${comma}`;
  });
  const race_overrides: string[] = [];
  for (const [raceId, e] of expectedIncumbents(ws, roster, rule)) {
    if (e.count >= 2) race_overrides.push(`${INDENT},(${q(raceId)}, ${e.incumbent ? q(e.incumbent) : "NULL"})`);
  }
  const gov = roster.filter((r) => r.race_id === "FL-GOV-general");
  const tickets = gov.map((r, i) => {
    const t = ws.tickets.find((x) => x.candidate_id === r.candidate_id)!;
    const comma = i < gov.length - 1 ? "," : "";
    return `${INDENT}(${q(r.candidate_id)}, ${q(r.legal_name)}, ${q(t.stored)}, ${q(t.can_detail_url)}, ${q(dateOf(t.read_1))})${comma}`;
  });
  const writes = ws.sites.filter((s) => s.action === "write now");
  const sites = writes.map((s) => {
    const r = roster.find((x) => x.candidate_id === s.candidate_id)!;
    return `${INDENT},(${q(s.candidate_id)}, ${q(r.legal_name)}, ${q(s.result)}, ${q(dateOf(s.read_1))})`;
  });
  const n = roster.filter((r) => (rule === "seat" ? cand.get(r.candidate_id)?.holds_this_seat : cand.get(r.candidate_id)?.incumbent) === "Yes").length;
  const totals = [
    `  -- D1 rule: ${rule}${rule === "membership" ? " (Recommended)" : " (TO FLIP)"}. Regenerate: node scripts/roster-worksheet.ts --write-migration --d1 ${rule}`,
    `  n_incumbents_expected CONSTANT int := ${n};`,
    `  n_sited_expected      CONSTANT int := ${SITED_BEFORE + writes.length};`,
  ];
  return { candidates, race_overrides, tickets, sites, totals };
}

/** Replaces each generated block's lines, leaving its marker lines. */
export function applyBlocks(sql: string, blocks: Record<BlockName, string[]>): string {
  let out = sql;
  for (const name of Object.keys(blocks) as BlockName[]) {
    const re = new RegExp(
      `(^[ \\t]*-- BEGIN generated: ${name}\\n)[\\s\\S]*?(^[ \\t]*-- END generated: ${name}$)`,
      "m",
    );
    if (!re.test(out)) throw new Error(`migration: no generated block "${name}"`);
    out = out.replace(re, (_m, begin: string, end: string) => begin + blocks[name].map((l) => `${l}\n`).join("") + end);
  }
  return out;
}

export function ruleOf(sql: string): D1Rule {
  return /-- D1 rule: seat\b/.test(sql) ? "seat" : "membership";
}

/* ---- the skeleton ---------------------------------------------------------- */

const tableHead = (name: TableName) =>
  [`<!-- table:${name} -->`, `| ${COLUMNS[name].join(" | ")} |`, `|${COLUMNS[name].map(() => "---").join("|")}|`];

export function skeleton(roster: RosterRow[]): string {
  const races = [...new Set(roster.map((r) => r.race_id))];
  return [
    "## Candidates",
    "",
    ...tableHead("candidates"),
    ...roster.map((r) => tableRow([r.candidate_id, r.legal_name, r.race_id, labelFor(r.race_id) ?? "", "", "", "", "", "", "", ""])),
    "",
    "## Races",
    "",
    ...tableHead("races"),
    ...races.map((id) => tableRow([id, "", "", "", ""])),
    "",
    "## FEC cross-check",
    "",
    ...tableHead("fec"),
    ...roster.filter((r) => r.level === "federal").map((r) => tableRow([r.candidate_id, r.race_id, "", "", "", "", ""])),
    "",
    "## Running mates",
    "",
    ...tableHead("tickets"),
    ...roster
      .filter((r) => r.race_id === "FL-GOV-general")
      .map((r) => tableRow([r.candidate_id, "", canDetailUrl(r.candidate_id.replace(/^FL-DOE-/, "")), "", "", "", "", DASH, DASH, DASH])),
    "",
    "## No-site re-checks",
    "",
    ...tableHead("sites"),
    ...roster.filter((r) => !r.has_site).map((r) => tableRow([r.candidate_id, r.race_id, r.race_status, "", "", "", "", ""])),
    "",
  ].join("\n");
}

/* ---- CLI -------------------------------------------------------------------- */

if (process.argv[1] && resolve(process.argv[1]) === import.meta.filename) {
  const args = process.argv.slice(2);
  const roster = loadRoster();
  if (args.includes("--skeleton")) {
    process.stdout.write(skeleton(roster));
  } else if (args.includes("--fill-times")) {
    const at = args.indexOf("--fill-times");
    const index = (round: string) => {
      const file = join(ROOT, ".roster-reads", round, "index.json");
      if (!existsSync(file)) throw new Error(`no ${file}: run scripts/roster-reads.ts --round ${round} first`);
      return JSON.parse(readFileSync(file, "utf8")) as Record<string, IndexEntry>;
    };
    const times = timesFromRounds(index(args[at + 1]), index(args[at + 2]));
    const file = join(ROOT, WORKSHEET_PATH);
    const before = readFileSync(file, "utf8");
    const after = fillTimes(before, times);
    writeFileSync(file, after);
    const changed = after.split("\n").filter((l, i) => l !== before.split("\n")[i]).length;
    console.log(`filled read times on ${changed} row(s) of ${WORKSHEET_PATH} from ${times.size} page(s) read in both rounds`);
  } else if (args.includes("--check") || args.includes("--write-migration")) {
    const md = readFileSync(join(ROOT, WORKSHEET_PATH), "utf8");
    const problems = checkWorksheet(md, roster);
    for (const p of problems) console.log(`FAIL  ${p}`);
    console.log(`${problems.length} problem(s) in ${WORKSHEET_PATH}`);
    if (problems.length) process.exit(1);
    if (args.includes("--write-migration")) {
      const ruleArg = args[args.indexOf("--d1") + 1];
      const rule: D1Rule = args.includes("--d1") && ruleArg === "seat" ? "seat" : "membership";
      const file = join(ROOT, MIGRATION_PATH);
      writeFileSync(file, applyBlocks(readFileSync(file, "utf8"), generatedBlocks(md, roster, rule)));
      console.log(`wrote the generated blocks of ${MIGRATION_PATH} (D1 rule: ${rule})`);
    }
  } else {
    console.error("usage: node scripts/roster-worksheet.ts --skeleton | --fill-times <a> <b> | --check | --write-migration [--d1 membership|seat]");
    process.exit(2);
  }
}
```

- [ ] **Step 5: Run the test and watch it pass**

Run: `"$NODE" scripts/verify-roster-worksheet.ts`
Expected: every line `ok` (18 from Task 1, then the fixture, labels, hosts, the made-up worksheet, 12 `caught:` lines, the generator, D1 TO FLIP, read times and `applyBlocks` checks), the last line `roster worksheet: all checks passed`, exit 0.

- [ ] **Step 6: Type-check and lint**

Run:
```bash
"$NODE" node_modules/typescript/bin/tsc --noEmit --strict --erasableSyntaxOnly --target es2022 --module esnext --moduleResolution bundler --allowImportingTsExtensions --skipLibCheck --types node scripts/roster-worksheet.ts scripts/verify-roster-worksheet.ts
"$NODE" node_modules/eslint/bin/eslint.js scripts/roster-worksheet.ts scripts/verify-roster-worksheet.ts
```
Expected: no output, exit 0.

- [ ] **Step 7: Commit**

```bash
git add scripts/fixtures/roster/ballot-roster-2026-10-08.json scripts/roster-worksheet.ts scripts/verify-roster-worksheet.ts
git commit -F - <<'EOF'
Roster worksheet: the rules every row must meet and the SQL written from it

The worksheet's tables are parsed and checked against the 2026-10-08 ballot
fixture (106 candidates, 53 races): two reads an hour apart, an official
source, a second official page for every Yes, 15-word evidence, incumbent_id
and is_open_seat derived from the candidate rows, D6 for running mates, D11
for sites. The migration's data blocks are generated from it, under D1's
membership rule or its TO FLIP (--d1 seat). Spec §3.1, §3.3, §3.4.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 3: The read tool and its source list

**Files:**
- Modify: `.gitignore` (append)
- Create: `scripts/roster-sources.ts`
- Create: `scripts/roster-reads.ts`

**Interfaces:**
- Consumes: Task 1's parsers, `worksheetTime`, `canDetailUrl`; `loadEnvLocal(scriptUrl)` from `scripts/env-local.ts`; `INGEST_AGENT`, `MIN_PAGE_TEXT_CHARS`, `looksLikeBotChallenge`, `visibleTextLength` from `src/lib/candidate-site.ts`.
- Produces: `SOURCES: readonly Source[]`, `HOUSE_DISTRICTS`, `GOV_ACCOUNTS`, `interface Source { key; url; via: "fetch" | "chrome"; parse: "house" | "senate" | "doe" | "text"; note? }` in `scripts/roster-sources.ts`. On disk, per round: `.roster-reads/<round>/index.json` (`{ [key]: { key, url, via, readAt, ok, bytes, sha256, error? } }`, the shape `timesFromRounds` reads), `.roster-reads/<round>/facts.json` (`house-clerk: { seats }`, `senate-list: { senators }`, `doe-<n>: RunningMateRead`, `fec-h-<dd>` and `fec-s: { rows }`, text pages: `{ title, names }`), the raw body per key, and `<key>.txt` for text pages.

- [ ] **Step 1: Ignore the raw reads**

Append to `.gitignore`:

```gitignore

# Roster-completeness reads (scripts/roster-reads.ts). Raw pages, never
# committed: the DoE candidate pages carry campaign addresses and phones.
.roster-reads/
```

- [ ] **Step 2: Write the source list**

Create `scripts/roster-sources.ts`:

```ts
/* Every page the roster-completeness worksheet reads, by key
   (docs/superpowers/specs/2026-10-08-roster-completeness-design.md §3.3).

   scripts/roster-reads.ts reads this list once per round; the worksheet cites
   these URLs. Adding a page (a member's own page for a Yes, a body's
   per-seat page) is an edit here, so the second round reads exactly what the
   first read. The FEC reads are not listed here: roster-reads.ts builds them
   from HOUSE_DISTRICTS because they carry the key.

   via: "fetch"  plain HTTPS GET with our user agent (the XML lists).
        "chrome" headless Chromium (Google Chrome, --dump-dom), its own user
                 agent unaltered: Cloudflare challenges the DoE pages and
                 several county sites render their member lists in script.
   parse: which helper in roster-reads-lib.ts reads the body. */

import { canDetailUrl } from "./roster-reads-lib.ts";

export type Via = "fetch" | "chrome";
export type Parse = "house" | "senate" | "doe" | "text";

export interface Source {
  key: string;
  url: string;
  via: Via;
  parse: Parse;
  /** What the 2026-10-08 planning read saw, where it matters. */
  note?: string;
}

/** The 16 U.S. House races in scope (race ids FL-<n>-general). */
export const HOUSE_DISTRICTS = [7, 8, 9, 10, 11, 12, 14, 15, 16, 20, 22, 24, 25, 26, 27, 28] as const;

/** DoE account numbers of the eight Governor ballot candidates: the <n> of
    FL-DOE-<n>, in ballot order (0044). */
export const GOV_ACCOUNTS = ["89042", "89243", "84076", "90630", "89571", "88529", "90433", "89630"] as const;

const page = (key: string, url: string, note?: string): Source => ({
  key,
  url,
  via: "chrome",
  parse: "text",
  ...(note ? { note } : {}),
});

export const SOURCES: readonly Source[] = [
  /* Federal: the sources of record (§3.3). */
  { key: "house-clerk", url: "https://clerk.house.gov/xml/lists/MemberData.xml", via: "fetch", parse: "house" },
  { key: "senate-list", url: "https://www.senate.gov/general/contact_information/senators_cfm.xml", via: "fetch", parse: "senate" },
  page("house-directory", "https://www.house.gov/representatives", "where each member's own house.gov site is listed (second read for a Yes)"),

  /* Running mates (§3.6): the DoE per-candidate page. */
  ...GOV_ACCOUNTS.map((n): Source => ({ key: `doe-${n}`, url: canDetailUrl(n), via: "chrome", parse: "doe" })),

  /* Statewide: the office's own site, naming the current holder. */
  page("gov-eog", "https://www.flgov.com/eog/", "title 'Governor Ron DeSantis | Executive Office of the Governor' on 2026-10-08"),
  page("atg-home", "https://www.myfloridalegal.com/", "403 Forbidden to headless Chromium on 2026-10-08: read in the browser pane (plan Task 4)"),
  page("cfo-home", "https://www.myfloridacfo.com/", "'Meet Your Chief Financial Officer Blaise Ingoglia' on 2026-10-08"),
  page("agr-home", "https://www.fdacs.gov/", "'Commissioner Wilton Simpson' on 2026-10-08"),

  /* County commissions. */
  page("bro-cc-list", "https://www.broward.org/Commission/Pages/Commissioners.aspx", "no member names in the DOM on 2026-10-08; the nine district pages name each seat's commissioner"),
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => page(`bro-cc-d${d}`, `https://www.broward.org/district${d}`)),
  page("dad-cc-list", "https://www.miamidade.gov/global/government/commission/home.page", "lists 'Marleine Bastien District 2', 'Vicki L. Lopez District 5' on 2026-10-08"),
  page("hil-cc-list", "https://hcfl.gov/government/board-of-county-commissioners", "lists all seven commissioners by district on 2026-10-08"),
  page("ora-cc-list", "https://www.orangecountyfl.net/OpenGovernment/BoardofCountyCommissioners.aspx", "lists the Mayor and six district commissioners on 2026-10-08; also the Mayor's source"),

  /* School boards. */
  page("bro-sb-list", "https://www.browardschools.com/school-board", "members appear only in a photo caption on 2026-10-08; find the board-members page"),
  page("dad-sb-list", "https://www.dadeschools.net/schoolboard/", "no member names in the DOM on 2026-10-08; find the members page"),
  page("hil-sb-list", "https://www.hillsboroughschools.org/page/school-board", "headless read did not finish on 2026-10-08"),
  page("ora-sb-list", "https://www.ocps.net/school-board", "lists 'Teresa Jacobs Chair', 'Angie Gallo District 1' on 2026-10-08"),

  /* Orange County Clerk of the Courts. */
  page("ora-clerk", "https://www.myorangeclerk.com/", "reports 'the departure of Clerk Tiffany Moore Russell' on 2026-10-08"),
];
```

- [ ] **Step 3: Write the read tool**

Create `scripts/roster-reads.ts`:

```ts
/* Read-only reads for the roster-completeness worksheet
   (docs/superpowers/specs/2026-10-08-roster-completeness-design.md §3.3, §3.6).

     node scripts/roster-reads.ts --round r1 [--only <key-prefix>] [--force]
     node scripts/roster-reads.ts --compare r1 r2 [--only <key-prefix>]
     node scripts/roster-reads.ts --find r1 "<name>" [--only <key-prefix>]

   --round   reads every page in scripts/roster-sources.ts plus the FEC
             cross-check, and writes .roster-reads/<round>/: the raw body of
             each page, its text (<key>.txt), index.json (when each key was
             read, and whether it worked) and facts.json (what the parsers in
             roster-reads-lib.ts found). A round resumes: a key already read in
             it is skipped unless --force.
   --compare checks two rounds agree, key by key, and that each key's reads
             are at least an hour apart (§3.3: two independent reads). It
             prints both read times in the worksheet's format. Exit 1 on any
             disagreement.
   --find    prints, for each page read in a round, at most 15 words around a
             name: the worksheet's evidence column.

   READ-ONLY. Nothing here writes to any database, and nothing is committed:
   .roster-reads/ is gitignored because the DoE pages carry each campaign's
   address, phone and treasurer. Only the worksheet, written by hand from
   these files, goes into the repo.

   The FEC reads use FEC_API_KEY from .env.local (loaded by env-local.ts,
   never printed, never written: the logged URL omits it). Without it the FEC
   keys are recorded as "FEC not read"; the FEC decides nothing (§3.3). On an
   HTTP 429 the round stops with exit 3; run the same command after an hour and
   it resumes where it stopped.

   Headless reads use Google Chrome (CHROME_PATH overrides the path) with a
   throwaway profile, its own user agent unaltered, and a hard 90 s limit. A
   page that answers with a challenge, a 401/403 page or almost no text is
   recorded as not read; it is never retried with a different identity. */

import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { loadEnvLocal } from "./env-local.ts";
import {
  INGEST_AGENT,
  MIN_PAGE_TEXT_CHARS,
  looksLikeBotChallenge,
  visibleTextLength,
} from "../src/lib/candidate-site.ts";
import {
  namesOnPage,
  pageText,
  parseFecCandidates,
  parseHouseFlorida,
  parseRunningMate,
  parseSenateFlorida,
  snippet,
  worksheetTime,
} from "./roster-reads-lib.ts";
import { HOUSE_DISTRICTS, SOURCES } from "./roster-sources.ts";

const ROOT = resolve(import.meta.dirname, "..");
const OUT = join(ROOT, ".roster-reads");
const UA = `${INGEST_AGENT}/1.0 (+https://github.com/JasonJosephIT/know-your-vote)`;
const CHROME =
  process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const execFileP = promisify(execFile);

interface ReadSource {
  key: string;
  url: string;
  via: "fetch" | "chrome" | "fec";
  parse: "house" | "senate" | "doe" | "text" | "fec";
}

interface IndexEntry {
  key: string;
  url: string;
  via: string;
  readAt: string;
  ok: boolean;
  bytes: number;
  sha256: string;
  error?: string;
}

const FEC_BASE = "https://api.open.fec.gov/v1/candidates/";
const fecUrl = (extra: Record<string, string>) =>
  `${FEC_BASE}?${new URLSearchParams({ state: "FL", election_year: "2026", per_page: "100", ...extra })}`;

function allSources(): ReadSource[] {
  const fec: ReadSource[] = [
    ...HOUSE_DISTRICTS.map((d): ReadSource => {
      const dd = String(d).padStart(2, "0");
      return { key: `fec-h-${dd}`, url: fecUrl({ office: "H", district: dd }), via: "fec", parse: "fec" };
    }),
    { key: "fec-s", url: fecUrl({ office: "S" }), via: "fec", parse: "fec" },
  ];
  return [...SOURCES, ...fec];
}

const rosterNames: string[] = (
  JSON.parse(
    readFileSync(join(ROOT, "scripts/fixtures/roster/ballot-roster-2026-10-08.json"), "utf8"),
  ) as { legal_name: string }[]
).map((r) => r.legal_name);

const readJson = <T>(file: string, fallback: T): T =>
  existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as T) : fallback;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function plainGet(url: string): Promise<{ status: number; body: string }> {
  const res = await fetch(url, {
    headers: { "user-agent": UA },
    redirect: "follow",
    signal: AbortSignal.timeout(60_000),
  });
  return { status: res.status, body: await res.text() };
}

async function chromeDom(url: string): Promise<string> {
  const profile = mkdtempSync(join(tmpdir(), "kyv-roster-chrome-"));
  try {
    const { stdout } = await execFileP(
      CHROME,
      [
        "--headless=new",
        "--disable-gpu",
        "--no-first-run",
        "--no-default-browser-check",
        `--user-data-dir=${profile}`,
        "--virtual-time-budget=15000",
        "--dump-dom",
        url,
      ],
      { timeout: 90_000, killSignal: "SIGKILL", maxBuffer: 64 * 1024 * 1024 },
    );
    return stdout;
  } finally {
    rmSync(profile, { recursive: true, force: true });
  }
}

class RateLimited extends Error {}

/** Belt and braces: the key never reaches a file or the terminal. */
const scrub = (text: string) => {
  const key = process.env.FEC_API_KEY;
  return key ? text.split(key).join("<FEC_API_KEY>") : text;
};

async function readOne(s: ReadSource): Promise<{ body: string; ext: string; facts: unknown; problem?: string }> {
  if (s.via === "fec") {
    const key = process.env.FEC_API_KEY;
    if (!key) return { body: "", ext: "json", facts: null, problem: "FEC_API_KEY not set: FEC not read" };
    const got = await plainGet(`${s.url}&api_key=${encodeURIComponent(key)}`);
    const status = got.status;
    const body = scrub(got.body);
    if (status === 429) throw new RateLimited("FEC answered 429 (rate limit)");
    if (status !== 200) return { body, ext: "json", facts: null, problem: `HTTP ${status}` };
    const parsed = parseFecCandidates(JSON.parse(body));
    return parsed.ok
      ? { body, ext: "json", facts: { rows: parsed.rows } }
      : { body, ext: "json", facts: null, problem: parsed.reason };
  }
  if (s.via === "fetch") {
    const { status, body } = await plainGet(s.url);
    if (status !== 200) return { body, ext: "html", facts: null, problem: `HTTP ${status}` };
    if (s.parse === "house") return { body, ext: "xml", facts: { seats: parseHouseFlorida(body) } };
    if (s.parse === "senate") return { body, ext: "xml", facts: { senators: parseSenateFlorida(body) } };
    const text = pageText(body);
    return { body, ext: "html", facts: { names: namesOnPage(text, rosterNames) } };
  }
  const body = await chromeDom(s.url);
  const title = /<title>([^<]*)<\/title>/i.exec(body)?.[1]?.trim() ?? "";
  if (looksLikeBotChallenge(body) || /^40[13]\b/.test(title) || visibleTextLength(body) < MIN_PAGE_TEXT_CHARS) {
    return { body, ext: "html", facts: null, problem: `not read: challenge, refusal or empty page (title "${title}")` };
  }
  if (s.parse === "doe") {
    const rm = parseRunningMate(body);
    return rm
      ? { body, ext: "html", facts: rm }
      : { body, ext: "html", facts: null, problem: "no Running Mate field" };
  }
  const text = pageText(body);
  return { body, ext: "html", facts: { title, names: namesOnPage(text, rosterNames) } };
}

const args = process.argv.slice(2);
const opt = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const only = opt("only");
const selected = (keys: string[]) => keys.filter((k) => !only || k.startsWith(only));

async function round(name: string) {
  loadEnvLocal(import.meta.url);
  const dir = join(OUT, name);
  mkdirSync(dir, { recursive: true });
  const indexFile = join(dir, "index.json");
  const factsFile = join(dir, "facts.json");
  const index = readJson<Record<string, IndexEntry>>(indexFile, {});
  const facts = readJson<Record<string, unknown>>(factsFile, {});
  const sources = allSources().filter((s) => selected([s.key]).length === 1);
  for (const s of sources) {
    if (!args.includes("--force") && index[s.key]?.ok) {
      console.log(`  skip ${s.key} (read ${index[s.key].readAt})`);
      continue;
    }
    const readAt = new Date().toISOString();
    try {
      const r = await readOne(s);
      writeFileSync(join(dir, `${s.key}.${r.ext}`), r.body);
      /* Text only for member and office pages: a DoE page also carries the
         campaign's address and phone, and facts.json already holds its
         running-mate field. */
      if (s.parse === "text") writeFileSync(join(dir, `${s.key}.txt`), pageText(r.body));
      index[s.key] = {
        key: s.key,
        url: s.url,
        via: s.via,
        readAt,
        ok: !r.problem,
        bytes: Buffer.byteLength(r.body),
        sha256: createHash("sha256").update(r.body).digest("hex"),
        ...(r.problem ? { error: r.problem } : {}),
      };
      if (r.facts) facts[s.key] = r.facts;
      console.log(`${r.problem ? "MISS" : "  ok"} ${s.key} ${worksheetTime(readAt)}${r.problem ? ` - ${r.problem}` : ""}`);
    } catch (err) {
      index[s.key] = { key: s.key, url: s.url, via: s.via, readAt, ok: false, bytes: 0, sha256: "", error: scrub((err as Error).message.split("\n")[0]) };
      console.log(`MISS ${s.key} - ${index[s.key].error}`);
      if (err instanceof RateLimited) {
        writeFileSync(indexFile, JSON.stringify(index, null, 2));
        writeFileSync(factsFile, JSON.stringify(facts, null, 2));
        console.error(`stopped: ${err.message}. Re-run this command after an hour; it resumes here.`);
        process.exit(3);
      }
    }
    writeFileSync(indexFile, JSON.stringify(index, null, 2));
    writeFileSync(factsFile, JSON.stringify(facts, null, 2));
    await sleep(1500);
  }
  const missed = Object.values(index).filter((e) => !e.ok && selected([e.key]).length === 1);
  console.log(`\nround ${name}: ${sources.length - missed.length} read, ${missed.length} not read`);
}

/** What must agree between two reads of a key. Page text changes (news,
    banners), so for a page it is the set of roster names on it; for the
    structured sources it is the parsed fact itself. */
function comparable(key: string, f: unknown): string {
  if (f == null) return "null";
  if (key.startsWith("fec-")) {
    const rows = (f as { rows: { candidate_id: string; incumbent_challenge: string | null }[] }).rows;
    return JSON.stringify(rows.map((r) => `${r.candidate_id}:${r.incumbent_challenge}`).sort());
  }
  if (key.startsWith("doe-")) {
    const d = f as { candidate: string | null; office: string | null; stored: string };
    return JSON.stringify([d.candidate, d.office, d.stored]);
  }
  if (key === "house-clerk" || key === "senate-list") return JSON.stringify(f);
  return JSON.stringify(((f as { names?: string[] }).names ?? []).slice().sort());
}

function compare(a: string, b: string) {
  const ia = readJson<Record<string, IndexEntry>>(join(OUT, a, "index.json"), {});
  const ib = readJson<Record<string, IndexEntry>>(join(OUT, b, "index.json"), {});
  const fa = readJson<Record<string, unknown>>(join(OUT, a, "facts.json"), {});
  const fb = readJson<Record<string, unknown>>(join(OUT, b, "facts.json"), {});
  let problems = 0;
  for (const key of selected([...new Set([...Object.keys(ia), ...Object.keys(ib)])].sort())) {
    const ea = ia[key];
    const eb = ib[key];
    const times = `${ea ? worksheetTime(ea.readAt) : "-"}  ${eb ? worksheetTime(eb.readAt) : "-"}`;
    let why = "";
    if (!ea?.ok || !eb?.ok) why = `not read in ${!ea?.ok ? a : b}${(!ea?.ok ? ea : eb)?.error ? ` (${(!ea?.ok ? ea : eb)?.error})` : ""}`;
    else if (Math.abs(Date.parse(eb.readAt) - Date.parse(ea.readAt)) < 60 * 60 * 1000) why = "reads less than an hour apart";
    else if (comparable(key, fa[key]) !== comparable(key, fb[key])) why = `DISAGREE: ${comparable(key, fa[key])} vs ${comparable(key, fb[key])}`;
    if (why) problems++;
    console.log(`${why ? "FAIL" : "  ok"}  ${key.padEnd(18)} ${times}${why ? `  ${why}` : ""}`);
  }
  console.log(`\n${problems} problem(s)`);
  process.exit(problems ? 1 : 0);
}

function find(roundName: string, name: string) {
  const index = readJson<Record<string, IndexEntry>>(join(OUT, roundName, "index.json"), {});
  for (const key of selected(Object.keys(index).sort())) {
    const file = join(OUT, roundName, `${key}.txt`);
    if (!existsSync(file)) continue;
    const s = snippet(readFileSync(file, "utf8"), name);
    if (s) console.log(`${key.padEnd(18)} "${s}"`);
  }
}

const roundName = opt("round");
const cmpAt = args.indexOf("--compare");
const findAt = args.indexOf("--find");
if (roundName) await round(roundName);
else if (cmpAt >= 0 && args[cmpAt + 1] && args[cmpAt + 2]) compare(args[cmpAt + 1], args[cmpAt + 2]);
else if (findAt >= 0 && args[findAt + 1] && args[findAt + 2]) find(args[findAt + 1], args[findAt + 2]);
else {
  console.error(
    'usage: node scripts/roster-reads.ts --round <name> [--only <prefix>] [--force]\n' +
      '       node scripts/roster-reads.ts --compare <round-a> <round-b> [--only <prefix>]\n' +
      '       node scripts/roster-reads.ts --find <round> "<name>" [--only <prefix>]',
  );
  process.exit(2);
}
```

- [ ] **Step 4: Type-check and lint**

Run:
```bash
"$NODE" node_modules/typescript/bin/tsc --noEmit --strict --erasableSyntaxOnly --target es2022 --module esnext --moduleResolution bundler --allowImportingTsExtensions --skipLibCheck --types node scripts/roster-reads.ts scripts/roster-sources.ts
"$NODE" node_modules/eslint/bin/eslint.js scripts/roster-reads.ts scripts/roster-sources.ts
```
Expected: no output, exit 0.

- [ ] **Step 5: Smoke-test it on two pages (read-only GETs)**

Run:
```bash
"$NODE" --no-warnings scripts/roster-reads.ts --round smoke --only house-clerk
"$NODE" --no-warnings scripts/roster-reads.ts --round smoke --only doe-90630
"$NODE" --no-warnings scripts/roster-reads.ts --round smoke --only house-clerk
"$NODE" -e 'const f = require("./.roster-reads/smoke/facts.json"); console.log(f["doe-90630"].stored, "|", f["house-clerk"].seats.find((s) => s.district === 25).name)'
"$NODE" --no-warnings scripts/roster-reads.ts --compare smoke smoke; echo "exit $?"
git status --short
```
Expected: `  ok house-clerk <time>`; `  ok doe-90630 <time>` (headless Chrome, up to 90 s); then `  skip house-clerk (read ...)` (a round resumes); then `Ruben A. Coto | Debbie Wasserman Schultz` (or, if the DoE page now differs, the page's current values: stop and report); then two `FAIL ... reads less than an hour apart` lines and `exit 1` (the gap rule works); `git status` shows `.gitignore` and the two new scripts, nothing under `.roster-reads/`. If Chrome is not at `/Applications/Google Chrome.app`, set `CHROME_PATH` to its binary and re-run.

Then remove the smoke round: `rm -rf .roster-reads/smoke`

- [ ] **Step 6: Commit**

```bash
git add .gitignore scripts/roster-sources.ts scripts/roster-reads.ts
git commit -F - <<'EOF'
Roster reads: a read-only tool that reads every source once per round

roster-reads.ts reads the House and Senate lists, the eight DoE canDetail
pages, the statewide and county member pages (headless Chrome, its own user
agent) and the FEC cross-check into gitignored .roster-reads/<round>/, then
compares two rounds: the facts must agree and each key's reads must be at
least an hour apart (spec §3.3). Nothing is written anywhere else; the FEC key
never reaches a file.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 4: Round 1, and finding the pages that decide each row

This task is research. It changes only `scripts/roster-sources.ts`; its output is `.roster-reads/r1/`. Note the time each part finishes: round 2 (Task 6) must read every key at least an hour later.

**Files:**
- Modify: `scripts/roster-sources.ts` (append entries to `SOURCES`)

- [ ] **Step 1: Confirm the live roster has not moved since the fixture**

With the Supabase MCP `execute_sql` (project `pqracitpmzpiqfnzlngw`; SELECT only), run:

```sql
SELECT count(*) AS n,
       md5(string_agg(x.row, E'\n' ORDER BY x.row COLLATE "C")) AS roster_md5
  FROM (SELECT r.race_id || '|' || c.candidate_id || '|' || c.legal_name || '|' || rp.status || '|' || (c.official_site IS NOT NULL)::text AS row
          FROM race r
          JOIN race_publication rp ON rp.race_id = r.race_id
          CROSS JOIN LATERAL unnest(r.candidate_ids) AS u(cid)
          JOIN candidate c ON c.candidate_id = u.cid
         WHERE c.ballot_status = 'ballot') x;
```
Expected: `n` 106, `roster_md5` `5cd9b7dd8396e65da89136c1fadf058b`. A different hash means a candidate, name, race, status or site changed: stop, list the rows with the same SELECT minus the aggregate, and report it (spec §7: a roster problem gets its own reviewed migration; this plan's fixture and assertions assume this roster). If the MCP is not available in this session, say so in the PR body and continue: the migration's live DO block re-counts at apply time.

- [ ] **Step 2: Read every listed source once**

Run: `"$NODE" --no-warnings scripts/roster-reads.ts --round r1`
Expected (about 10-20 minutes: each headless read can take up to 90 s): one line per key. On 2026-10-08 these were known to miss or to need more pages: `atg-home` (403), `bro-cc-list` (no names), `dad-sb-list` (no names), `hil-sb-list` (did not finish). `fec-*` lines read `MISS ... FEC_API_KEY not set: FEC not read` if the key is absent; that is allowed. An exit with `stopped: FEC answered 429` means re-run the same command after an hour: it resumes.

Print what the structured reads found:

```bash
"$NODE" -e '
const f = require("./.roster-reads/r1/facts.json");
for (const s of f["house-clerk"].seats) console.log("FL" + String(s.district).padStart(2, "0") + "  " + (s.name ?? "VACANT: " + s.vacancy));
for (const s of f["senate-list"].senators) console.log("SEN  " + s.name + "  " + s.senateClass + "  " + s.website);
for (const [k, v] of Object.entries(f)) if (k.startsWith("doe-")) console.log(k, "|", v.election, "|", v.office, "|", v.candidate, "|", v.stored);
for (const [k, v] of Object.entries(f)) if (v && v.names) console.log(k.padEnd(18), v.names.join("; "));'
```
Expected: 28 Florida seats; 2 senators; 8 `doe-` lines each `2026 General Election | Governor | <name> | <running mate>`; one line per page read, listing the roster candidates whose surname appears on it. A `doe-` line that is not "2026 General Election" and "Governor", or a missing one: stop and report.

- [ ] **Step 3: Find a page that decides each county body and office**

For each body, the source must be the body's own list of current members, or the office's own page naming its holder (spec §3.3). Where r1 shows no member names, look through the page's links for the members page:

```bash
grep -o 'href="[^"]*"' .roster-reads/r1/dad-sb-list.html | sort -u | grep -i -E "member|board|district" | head -40
```
(same for `bro-sb-list`, `hil-sb-list` once it reads, and any other list without names). For Broward's commission, whose list renders no names, the nine district pages `bro-cc-d1`..`bro-cc-d9` together are the member list: each names its seat's commissioner. Record in the worksheet's Method section, for each body, which pages make up its member list.

Append what you find to `SOURCES` in `scripts/roster-sources.ts`, inside the array, under a new comment, one `page(...)` per URL with a key named for the body, for example:

```ts
  /* Added during round 1 (plan Task 4). */
  page("dad-sb-members", "https://www.dadeschools.net/<the members page found>"),
```
Use only official hosts (`OFFICIAL_HOSTS` in `scripts/roster-worksheet.ts`). If a body's members can only be found on another official host (for example a county Supervisor of Elections page that lists CURRENT officeholders, never its 2026 candidate list), add that host to `OFFICIAL_HOSTS` in the same commit with a comment saying whose site it is, and say so in the Method section.

- [ ] **Step 4: Add the second official page for every likely Yes**

From Step 2's output, list each ballot candidate who appears as a current member or holder. For each, append a `page("second-<candidate_id>", "<url>")` entry: the member's own house.gov site (find it in the House directory read: `grep -o 'https://[a-z0-9-]*\.house\.gov' .roster-reads/r1/house-directory.html | sort -u`), the senator's site from the Senate XML's `website`, the officeholder's own page on the office's site, or the member's own page on the county body's site (find it in the list page's links, as in Step 3). Never guess a URL: it must appear in a page already read, and its read in Step 6 must name the person as a current member or holder.

- [ ] **Step 5: Re-check the nine candidates with no site**

For each of `FL-DOE-92357` Jassenoff, `FL-DOE-92137` Hosey, `FL-DOE-89630` Datto, `FL-VF-BRO-1179` Bogen, `FL-VF-BRO-1178` Fisher, `FL-VF-BRO-1182` McKinzie, `FL-VF-DAD-2926` Bendross-Mindingall, `FL-VF-DAD-2953` Colucci and `FL-VF-ORA-1245` Gallo: start from the leads and reasons in `docs/general-election/candidate-sites-2026-09-24.md` ("Candidates with no site", and the 2026-09-25 re-check), then a web search for the name and the 2026 office (leads only). Append each candidate URL worth reading as `page("site-<candidate_id>", "<url>")`. Under the `candidate-sites-2026-09-24.md` method a site counts only when the page itself names the candidate and the 2026 office (title, `og:title`, or the "Paid for by" disclaimer), read in both rounds; the stored value is the canonical origin `https://host/`. Colucci's site (genuine, compromised with injected casino spam on 2026-09-25) counts only if no injected content is found anywhere on the pages read; otherwise her result is `withheld`.

- [ ] **Step 6: Read the pages added in Steps 3-5**

Run: `"$NODE" --no-warnings scripts/roster-reads.ts --round r1`
Expected: `skip` for every key read in Step 2, `ok` or `MISS` for each new key. Repeat Steps 3-6 until every body and office has a page that decides it, or the gap is written down for the founder.

- [ ] **Step 7: Read in the browser pane what headless Chrome cannot**

For a key still missing with a refusal (on 2026-10-08, `atg-home`): open the URL in the visible browser pane (`mcp__Claude_Browser__navigate`, then `mcp__Claude_Browser__get_page_text`), and note the UTC time of the read. That is round 1 for that page; round 2 repeats it at least an hour later. If the browser pane is refused too, use another page on the office's own host that names the current holder, found from links already read. Never change the user agent. Write the method used into the worksheet's Method section.

- [ ] **Step 8: Commit the source list**

```bash
"$NODE" node_modules/eslint/bin/eslint.js scripts/roster-sources.ts scripts/roster-worksheet.ts
git add scripts/roster-sources.ts scripts/roster-worksheet.ts
git commit -F - <<'EOF'
Roster reads: the member pages, second pages and site leads found in round 1

Adds to the source list every page that decides a row: each county body's
member list (or its per-seat pages where no list names members), the second
official page for each candidate the first round found serving, and the
campaign-site leads for the nine candidates with no site. Round 2 reads
exactly this list.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```
(`scripts/roster-worksheet.ts` is only staged if `OFFICIAL_HOSTS` changed.)

---

### Task 5: Draft the worksheet from round 1

**Files:**
- Create: `docs/general-election/roster-completeness-2026-10.md`

- [ ] **Step 1: Create the worksheet with its prose and empty tables**

Write this header to `docs/general-election/roster-completeness-2026-10.md`:

````markdown
# Roster completeness worksheet, October 2026

**Status:** for the founder's review in the pull request from `claude/roster-completeness`. Nothing
here reaches a voter. The values ship in `supabase/migrations/0049_roster_completeness.sql`, which
the founder applies only after the pull request merges and a separate yes (spec D10). Spec:
`docs/superpowers/specs/2026-10-08-roster-completeness-design.md` §3.1, §3.3, §3.4.

The migration's data is generated from the tables below
(`node scripts/roster-worksheet.ts --write-migration`), and `scripts/verify-roster-worksheet.ts`
fails if the two differ. To change a value, change it here and regenerate.

## How to read the tables

- **incumbent** (D1, Recommended pending founder confirmation): Yes when the candidate serves today
  in the office, or on the body, the race elects to. For the U.S. House, the U.S. Senate, a county
  commission or a school board that means a sitting member of that body, whatever seat or district
  they hold. For Governor, Attorney General, Chief Financial Officer, Commissioner of Agriculture,
  Orange County Mayor and Orange County Clerk of the Courts it means holding the office.
- **holds_this_seat** (D1's TO FLIP): Yes only when the candidate holds this race's own seat
  number. Not stored under D1; `--write-migration --d1 seat` would store it instead, with no new
  read.
- A **No** is a checked No: `source_url` lists the body's current members, or names the office's
  current holder, without this candidate.
- **source_url** decides the row. **second_page** is a different official page naming each Yes as a
  current member or holder.
- **read_1 / read_2**: the two independent reads of the page, in UTC, at least an hour apart.
  `incumbency_verified_at` stores read_1's date.
- **evidence**: the page's own words, at most 15.
- **label**: the line voters would see beside every candidate in the race, if the display ships
  (spec §3.5, PR 2).
- Ballotpedia is a lead and a cross-check only. The county Supervisor of Elections candidate lists
  confirm ballot placement, never incumbency. The FEC decides nothing. No rule reads party.
- Races: `incumbent_id` is the one candidate with incumbent Yes; NULL when none; with two or more,
  the one holding this race's own seat, else NULL. `is_open_seat` is true exactly when
  `incumbent_id` is NULL. Neither is shown to voters (D4).
- Running mates: the Division of Elections' canDetail page. `raw_json` is the field as read, as a
  JSON string; `stored` is it with entities decoded and whitespace collapsed (D6). Later re-reads go
  in the `reread_*` columns as `<time> same` or `<time> CHANGED`.
- No-site re-checks (D11): a find in a listed race is written now; a find in a published race is
  held until after Nov 3; `withheld` marks a genuine site that is not stored.

## Method

<!-- write: the round 1 and round 2 windows (UTC); the Chrome version ("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --version); every page read in the browser pane instead of headless Chrome, and why; for each county body, the pages that make up its member list; any host added to OFFICIAL_HOSTS and whose site it is; whether the FEC was read; for the Governor rows, that Art. IV, section 5(b) of the Florida constitution and the DoE GOV ballot rows are context, not the source. -->

## Summary

<!-- write: incumbents under D1 (N of 106) and under its TO FLIP (M of 106); the open races; running mates 8 of 8; the nine site re-check results; the number of questions below. -->

## Questions for the founder

<!-- write: one bullet per disagreement between reads or sources, per row that could not be read twice, and per spec expectation the reads contradict; or "None." -->
````

Then append the empty tables: `"$NODE" --no-warnings scripts/roster-worksheet.ts --skeleton >> docs/general-election/roster-completeness-2026-10.md`

Run: `"$NODE" --no-warnings scripts/roster-worksheet.ts --check | tail -1`
Expected: `FAIL` lines and a last line of several hundred problems (every judgment cell is empty), exit 1. The tables parse; the content is still to come.

- [ ] **Step 2: Fill the candidates table**

One row per candidate, already in ballot order. Columns:
- `incumbent`: `Yes` when the deciding page names the candidate as a current member of the body (House, Senate, county commission, school board) or the current holder of the office (Governor, Attorney General, CFO, Agriculture, Orange Mayor, Orange Clerk), else `No`.
- `holds_this_seat`: `Yes` only when they hold this race's own seat number (House district = race district; the county district this race elects; for the one-holder offices, the same as `incumbent`; for the Senate race, the Class III seat Moody holds, if an official page says the 2026 race is for it, else put the question to the founder). Never Yes when `incumbent` is No.
- `source_url`: the deciding page's URL exactly as in `scripts/roster-sources.ts`, so Task 6 can match its read times: `https://clerk.house.gov/xml/lists/MemberData.xml` for the 40 House rows, `https://www.senate.gov/general/contact_information/senators_cfm.xml` for the 3 Senate rows, the office's page for the statewide and Orange office rows, the body's member page for the county rows.
- `read_1`, `read_2`: leave both empty; Task 6 fills them from the two rounds' read times (`--fill-times`), matched on `source_url`. Only a page read in the browser pane gets its round 1 time typed now, as `YYYY-MM-DDTHH:MMZ`.
- `second_page`: for a Yes, its `second-<candidate_id>` URL; for a No, `—`.
- `evidence`: at most 15 of the page's own words, in double quotes: `"$NODE" --no-warnings scripts/roster-reads.ts --find r1 "<surname or name>"` prints them. For the XML lists, quote the district and name the way the list has them, for example `"FL25 Debbie Wasserman Schultz"`, or for a No the line for this race's own seat, for example `"FL20 Vacancy due to the resignation of Sheila Cherfilus-McCormick, April 21, 2026."`. For a No on a body, quote the line naming this race's seat holder.

- [ ] **Step 3: Fill the races table**

For each race: `incumbent_id` per spec §3.1 (the one candidate with `incumbent` Yes; `NULL` when none; with two or more, the one whose `holds_this_seat` is Yes, else `NULL`); `is_open_seat` `true` exactly when `incumbent_id` is `NULL`; `own_seat_holder_today` who holds this race's own seat today, from the same reads (a name, `vacant`, or `new seat (no holder)` for Orange Commission Districts 7 and 8); `note` free text, or empty. `--check` computes `incumbent_id` from the candidates table and reports any race row that disagrees.

- [ ] **Step 4: Fill the FEC table**

Print the FEC fields read in round 1:

```bash
"$NODE" -e '
const f = require("./.roster-reads/r1/facts.json");
for (const k of Object.keys(f).filter((k) => k.startsWith("fec-")).sort()) {
  console.log("== " + k);
  for (const r of f[k].rows) console.log("  " + r.candidate_id + "  " + r.incumbent_challenge + "  " + r.name + "  districts " + r.election_districts.join(", "));
}'
```
For each of the 43 federal candidates, leave `read_1` and `read_2` empty (Task 6 fills them by race) and match their FEC row by hand (name, allowing the FEC's spelling, for example "GILESPIE, NEIL JOSEPH" for Neil J. Gillespie) and write `fec_candidate_id`, `incumbent_challenge` (`I`, `C` or `O`) and `election_districts` (comma-separated). No row: `no match`, `—`, `—`. FEC not read: `not read`, `—`, `—`, and `—` in both read columns. An FEC "I" on someone the Clerk does not list is FEC lag (spec §2.4): it changes nothing.

- [ ] **Step 5: Fill the running-mates table**

Print the rows from round 1:

```bash
"$NODE" -e '
const f = require("./.roster-reads/r1/facts.json");
for (const n of ["89042", "89243", "84076", "90630", "89571", "88529", "90433", "89630"]) {
  const d = f["doe-" + n];
  if (!d) { console.log("MISSING doe-" + n); continue; }
  console.log(["", "FL-DOE-" + n, d.candidate, "https://dos.elections.myflorida.com/candidates/canDetail.asp?account=" + n,
    "`" + JSON.stringify(d.raw) + "`", d.stored, "", "", "—", "—", "—", ""].join(" | ").trim());
}'
```
Replace the eight skeleton rows of the tickets table with these lines. The read columns stay empty: Task 6 fills them, matched on `can_detail_url`.

- [ ] **Step 6: Fill the no-site table**

For each of the nine: `result` is the accepted site's origin (`https://host/`), `none found`, or `withheld` (Colucci, if her site is still compromised); `action` is `write now` for a find in a listed race, `hold until after Nov 3` for a find in a published race, `none` otherwise; `read_1` and `read_2` stay empty when `result` is a URL read in both rounds (Task 6 fills them); otherwise type the times of the two passes that looked for a site, at least an hour apart; `evidence` is at most 15 words in quotes: the page's words naming the candidate and the office, or what the page showed (for example `"This domain is for sale"`).

- [ ] **Step 7: Write the Method, Summary and Questions sections**

Replace each `<!-- write: ... -->` comment in the header with what it asks for.

- [ ] **Step 8: Check the draft**

Run: `"$NODE" --no-warnings scripts/roster-worksheet.ts --check | grep -v "read_1/read_2" | tail -5`
Expected: only the last line, `N problem(s) in docs/general-election/roster-completeness-2026-10.md`: every one of the N problems is a missing read time. Fix anything else before committing.

- [ ] **Step 9: Commit the draft**

```bash
git add docs/general-election/roster-completeness-2026-10.md
git commit -F - <<'EOF'
Roster worksheet: draft from round 1

Every ballot candidate's incumbency with its deciding page, second page and
evidence; every race's incumbent_id; the FEC cross-check; the eight DoE
running-mate reads; the nine site re-checks. The second read times follow in
round 2.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 6: Round 2, comparison, and the finished worksheet

**Files:**
- Modify: `docs/general-election/roster-completeness-2026-10.md`

- [ ] **Step 1: Read everything again, at least an hour after round 1**

Check that the latest round 1 read is more than 60 minutes old: `"$NODE" -e 'const i = require("./.roster-reads/r1/index.json"); console.log(Object.values(i).map((e) => e.readAt).sort().at(-1), new Date().toISOString())'`. Then run: `"$NODE" --no-warnings scripts/roster-reads.ts --round r2`
Repeat each browser-pane read from Task 4 Step 7 and note its time.

- [ ] **Step 2: Compare the rounds**

Run: `"$NODE" --no-warnings scripts/roster-reads.ts --compare r1 r2`
Expected: `  ok` on every key and `0 problem(s)`. For each `FAIL`:
- `reads less than an hour apart`: re-read that key later with `--round r2 --only <key> --force`.
- `not read in r1` or `not read in r2`: re-run that round (it resumes). A key you read in the browser pane both times shows here as not read; that is expected, and its times are typed by hand in Step 3. So are `fec-*` keys when `FEC_API_KEY` is absent: their FEC rows say `not read`.
- `DISAGREE` on a page: compare the two reads around the names that differ (`--find r1 "<name>"` and `--find r2 "<name>"`). If only a news item or banner differs and the member list itself agrees, write that in the Method section. If the member list or the holder differs, or a structured fact differs (a House seat, a senator, a running mate, an FEC row), it is a question for the founder: write it under "Questions for the founder", read the source a third time at least an hour later (`--round r3`, then `--compare r2 r3`), and if the reads still disagree, do not continue to Task 7: commit the worksheet as it stands and report BLOCKED with the questions.

- [ ] **Step 3: Fill the read times**

Run: `"$NODE" --no-warnings scripts/roster-worksheet.ts --fill-times r1 r2`
Expected: `filled read times on N row(s) ...`. Then type the times this cannot fill: the round 2 time of each browser-pane read, and the site rows with no page URL.

- [ ] **Step 4: Check the finished worksheet**

Run: `"$NODE" --no-warnings scripts/roster-worksheet.ts --check`
Expected: `0 problem(s) in docs/general-election/roster-completeness-2026-10.md`, exit 0. A problem naming `FL-GOV-general`, `FL-ATG-general` or `FL-HIL-SB4-general` means the reads contradict an assertion the spec makes (§3.4): put it under "Questions for the founder" and report BLOCKED; do not edit the check.

- [ ] **Step 5: Finish the Summary and Questions sections**

Summary: incumbents under D1 (count of `incumbent` Yes) and under its TO FLIP (count of `holds_this_seat` Yes), the open races, 8 of 8 running mates, the nine re-check results. Questions: one bullet per open question, or `None.`

- [ ] **Step 6: Commit**

```bash
git add docs/general-election/roster-completeness-2026-10.md
git commit -F - <<'EOF'
Roster worksheet: round 2 read, compared and complete

Every source read twice, at least an hour apart, with both reads agreeing;
read times filled from both rounds. The worksheet passes every rule in
scripts/roster-worksheet.ts.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 7: Migration 0049 and its harness cases

**Files:**
- Modify (test): `scripts/verify-migrations.mjs` (header list after line 90; new block above the final `if (failures > 0) {`)
- Create: `supabase/migrations/0049_roster_completeness.sql`
- Modify (test): `scripts/verify-roster-worksheet.ts` (imports; section 3)
- Modify: `supabase/migrations/README.md` (row 0049)

**Interfaces:**
- Consumes: `generatedBlocks`, `applyBlocks`, `ruleOf`, `checkWorksheet`, `MIGRATION_PATH`, `WORKSHEET_PATH`, `ROOT` (Task 2); the worksheet (Task 6); in the harness, `files`, `db`, `check`, `expectConstraintViolation`, `readFile`, `path`, `migrationsDir`, `root` (already defined at the top of `scripts/verify-migrations.mjs`).
- Produces: `supabase/migrations/0049_roster_completeness.sql` with marker blocks `candidates`, `race_overrides`, `tickets`, `sites`, `totals`.

- [ ] **Step 1: Write the failing harness cases**

In `scripts/verify-migrations.mjs`, in the header comment, directly after the line `        races 0033 seeds at draft stay invisible.` (line 90), add:

```js
    20. 0049_roster_completeness (roster-completeness spec §3.2, §6): the five
        candidate columns; all 49 seeded county ballot candidates sourced; the
        five CHECKs; the trigger refuses B4's exact UPDATE on a sourced row as
        cap_tool_wrapper (which holds no EXECUTE) and lets through an unchanged
        value, a change with a new source and date, and the running-mate
        takedown; anon reads the new columns only on a listed race; the file
        re-applies with its DoE-absent notice; it sorts before any
        *_content_freeze.sql; and its whole-ballot assertions pass on a
        replica of the 2026-10-08 ballot.
```

Then, near the end of the file, find:

```js
await db.exec("RESET ROLE;");

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
```
and insert this block between the blank line and `if (failures > 0) {`:

```js
/* 20. 0049_roster_completeness (docs/superpowers/specs/2026-10-08-roster-
   completeness-design.md §3.2, §6). Runs last and builds its own fixtures, so
   the earlier blocks' changes to r-pub and r-draft cannot move it. */
const rosterFile = files.find((f) => f.endsWith("_roster_completeness.sql"));
await check("0049 roster_completeness exists and sorts after 0047", async () => {
  if (!rosterFile) throw new Error("no *_roster_completeness.sql in supabase/migrations");
  if (!(rosterFile > "0047_candidate_lead_kind.sql")) throw new Error(`${rosterFile} sorts before 0047`);
});
/* §3.2: a replay inside the freeze window must apply these UPDATEs before the
   content-freeze guard exists, or every CI run in the freeze fails. */
await check("0049 sorts before any *_content_freeze.sql", async () => {
  const freeze = files.find((f) => f.endsWith("_content_freeze.sql"));
  if (freeze && rosterFile && !(rosterFile < freeze)) {
    throw new Error(`${rosterFile} sorts after ${freeze}`);
  }
});
await check("0049 adds the five candidate columns with their types", async () => {
  const r = await db.query(
    `SELECT column_name, data_type FROM information_schema.columns
      WHERE table_name = 'candidate'
        AND column_name IN ('incumbency_source','incumbency_verified_at','running_mate',
                            'running_mate_source','running_mate_verified_at')
      ORDER BY column_name;`
  );
  const got = r.rows.map((x) => `${x.column_name}:${x.data_type}`).join(",");
  const want =
    "incumbency_source:text,incumbency_verified_at:timestamp with time zone," +
    "running_mate:text,running_mate_source:text,running_mate_verified_at:timestamp with time zone";
  if (got !== want) throw new Error(`saw ${got}`);
});
await check("0049 gives all 49 seeded county ballot candidates an incumbency source and date", async () => {
  const r = await db.query(
    `SELECT count(*)::int AS n,
            count(*) FILTER (WHERE c.incumbency_source IS NOT NULL
                               AND c.incumbency_verified_at IS NOT NULL)::int AS sourced
       FROM race r, unnest(r.candidate_ids) cid
       JOIN candidate c ON c.candidate_id = cid
      WHERE r.level = 'county' AND c.ballot_status = 'ballot';`
  );
  const { n, sourced } = r.rows[0];
  if (n !== 49 || sourced !== 49) throw new Error(`${sourced} of ${n} county ballot candidates sourced, expected 49 of 49`);
});
await check("0049 county races: is_open_seat = (incumbent_id IS NULL), and FL-HIL-SB4-general names Rendon", async () => {
  const r = await db.query(
    `SELECT count(*) FILTER (WHERE is_open_seat <> (incumbent_id IS NULL))::int AS bad,
            max(incumbent_id) FILTER (WHERE race_id = 'FL-HIL-SB4-general') AS sb4
       FROM race WHERE level = 'county';`
  );
  if (r.rows[0].bad !== 0) throw new Error(`${r.rows[0].bad} county race(s) disagree`);
  if (r.rows[0].sb4 !== "FL-VF-HIL-2672") throw new Error(`FL-HIL-SB4-general names ${r.rows[0].sb4}`);
});
/* The DoE roster (state and federal rows) is not seeded offline, so the DO
   block must stop at its notice rather than fail. Re-applying the whole file
   also proves it idempotent: the trigger lets an unchanged value through. */
await check("0049 re-applies cleanly and notes that the DoE roster is absent offline", async () => {
  const notices = [];
  const sql = await readFile(path.join(migrationsDir, rosterFile), "utf8");
  await db.exec(sql, { onNotice: (n) => notices.push(n.message) });
  if (!notices.some((m) => /DoE roster absent/.test(m))) {
    throw new Error(`no DoE-absent notice; saw ${JSON.stringify(notices)}`);
  }
});

/* Own fixtures: a listed Governor race and a draft race, one candidate each. */
await db.exec(`
  INSERT INTO race (race_id, office, level, election, candidate_ids) VALUES
    ('r-roster-listed', 'Governor',  'state',   'general', ARRAY['c-roster-gov']),
    ('r-roster-draft',  'US Senate', 'federal', 'general', ARRAY['c-roster-draft']);
  INSERT INTO race_publication (race_id, status, published_at) VALUES
    ('r-roster-listed', 'listed', NULL),
    ('r-roster-draft',  'draft',  NULL);
  INSERT INTO candidate (candidate_id, legal_name, party, office_sought, qualifying_status) VALUES
    ('c-roster-gov',   'Roster Governor', 'NPA', 'Governor',  'qualified'),
    ('c-roster-draft', 'Roster Draft',    'NPA', 'US Senate', 'qualified');
`);

await expectConstraintViolation(
  "0049 CHECK rejects an incumbency source without a date",
  "UPDATE candidate SET incumbency_source = 'https://example.gov/members' WHERE candidate_id = 'c-roster-gov';",
  /candidate_incumbency_sourced/
);
await expectConstraintViolation(
  "0049 CHECK rejects a true is_incumbent with no source",
  "UPDATE candidate SET is_incumbent = true WHERE candidate_id = 'c-roster-gov';",
  /candidate_incumbent_needs_source/
);
await expectConstraintViolation(
  "0049 CHECK rejects a running mate on a non-Governor row",
  `UPDATE candidate SET running_mate = 'Test Mate', running_mate_source = 'https://example.gov/c',
          running_mate_verified_at = '2026-10-09T00:00:00Z' WHERE candidate_id = 'c-roster-draft';`,
  /candidate_running_mate_governor/
);
await expectConstraintViolation(
  "0049 CHECK rejects two of the three running-mate columns",
  "UPDATE candidate SET running_mate = 'Test Mate', running_mate_source = 'https://example.gov/c' WHERE candidate_id = 'c-roster-gov';",
  /candidate_running_mate_sourced/
);
await expectConstraintViolation(
  "0049 CHECK rejects a running mate with a doubled space",
  `UPDATE candidate SET running_mate = 'Test  Mate', running_mate_source = 'https://example.gov/c',
          running_mate_verified_at = '2026-10-09T00:00:00Z' WHERE candidate_id = 'c-roster-gov';`,
  /candidate_running_mate_clean/
);

await check("0049: no API role holds EXECUTE on candidate_sourced_fact_guard", async () => {
  const r = await db.query(
    `SELECT has_function_privilege('cap_tool_wrapper', 'public.candidate_sourced_fact_guard()', 'EXECUTE') AS capw,
            has_function_privilege('cap_readonly',     'public.candidate_sourced_fact_guard()', 'EXECUTE') AS capr,
            has_function_privilege('anon',             'public.candidate_sourced_fact_guard()', 'EXECUTE') AS anon,
            has_function_privilege('authenticated',    'public.candidate_sourced_fact_guard()', 'EXECUTE') AS auth;`
  );
  const g = r.rows[0];
  if (g.capw || g.capr || g.anon || g.auth) throw new Error(`EXECUTE held: ${JSON.stringify(g)}`);
});

/* B4's write, word for word (Civic Awareness (Know Your Vote)/toollayer/
   cap_toollayer/store.py:245-247, %s as $n), as the role B4 connects as. The
   subject is any county row 0049 sourced, so the check does not depend on
   whom the worksheet found to be an incumbent. */
const B4_UPDATE = "UPDATE candidate SET is_incumbent = $1, fec_id = COALESCE($2, fec_id) WHERE candidate_id = $3";
const subject = await db
  .query(
    `SELECT candidate_id, is_incumbent, incumbency_source, incumbency_verified_at
       FROM candidate WHERE candidate_id LIKE 'FL-VF-%' AND incumbency_verified_at IS NOT NULL
      ORDER BY candidate_id LIMIT 1;`
  )
  .then((r) => r.rows[0], () => undefined);
await db.exec("SET ROLE cap_tool_wrapper;");
await check("0049 trigger: B4's UPDATE cannot flip a sourced is_incumbent, though cap_tool_wrapper has no EXECUTE", async () => {
  if (!subject) throw new Error("no county candidate carries a 0049 source");
  try {
    await db.query(B4_UPDATE, [!subject.is_incumbent, null, subject.candidate_id]);
  } catch (err) {
    if (/is_incumbent changed without a new incumbency_source/.test(err.message)) return;
    throw new Error(`unexpected error: ${err.message}`);
  }
  throw new Error(`B4's UPDATE flipped ${subject.candidate_id}`);
});
await check("0049 trigger: B4's UPDATE with the unchanged value passes", async () => {
  if (!subject) throw new Error("no county candidate carries a 0049 source");
  await db.query(B4_UPDATE, [subject.is_incumbent, null, subject.candidate_id]);
});
await check("0049 trigger: a changed is_incumbent with a new source and date passes (a tripwire, not a lock)", async () => {
  if (!subject) throw new Error("no county candidate carries a 0049 source");
  await db.query(
    `UPDATE candidate SET is_incumbent = NOT is_incumbent,
            incumbency_source = 'https://example.gov/correction',
            incumbency_verified_at = '2026-10-20T00:00:00Z'
      WHERE candidate_id = $1`,
    [subject.candidate_id]
  );
  await db.query(
    `UPDATE candidate SET is_incumbent = $2, incumbency_source = $3, incumbency_verified_at = $4
      WHERE candidate_id = $1`,
    [subject.candidate_id, subject.is_incumbent, subject.incumbency_source, subject.incumbency_verified_at]
  );
});
await db.exec("RESET ROLE;");

await check("0049: a Governor row takes a sourced running mate", async () => {
  await db.exec(`
    UPDATE candidate SET running_mate = 'First Mate', running_mate_source = 'https://example.gov/can?account=1',
           running_mate_verified_at = '2026-10-09T00:00:00Z'
     WHERE candidate_id = 'c-roster-gov';
  `);
});
await check("0049 trigger: a changed running_mate without a new source or date is refused", async () => {
  try {
    await db.exec("UPDATE candidate SET running_mate = 'Second Mate' WHERE candidate_id = 'c-roster-gov';");
  } catch (err) {
    if (/running_mate changed without a new running_mate_source/.test(err.message)) return;
    throw new Error(`unexpected error: ${err.message}`);
  }
  throw new Error("running_mate changed with no new source");
});
await check("0049 trigger: clearing all three running-mate columns passes (the takedown, spec §3.10)", async () => {
  await db.exec(
    `UPDATE candidate SET running_mate = NULL, running_mate_source = NULL, running_mate_verified_at = NULL
      WHERE candidate_id = 'c-roster-gov';`
  );
});

await check("0049: both fixture candidates take an incumbency source and date", async () => {
  await db.exec(`
    UPDATE candidate SET incumbency_source = 'https://example.gov/members',
           incumbency_verified_at = '2026-10-09T00:00:00Z'
     WHERE candidate_id IN ('c-roster-gov', 'c-roster-draft');
  `);
});
await db.exec("SET ROLE anon;");
await check("0049: anon reads the new columns on a listed race's candidate, not on a draft race's", async () => {
  const r = await db.query(
    `SELECT candidate_id, incumbency_source, incumbency_verified_at, running_mate
       FROM candidate WHERE candidate_id IN ('c-roster-gov', 'c-roster-draft') ORDER BY candidate_id;`
  );
  const got = r.rows.map((x) => `${x.candidate_id}:${x.incumbency_source}`).join(",");
  if (got !== "c-roster-gov:https://example.gov/members") throw new Error(`saw [${got}]`);
});
await db.exec("RESET ROLE;");

/* The whole-ballot half of 0049's DO block runs only where the DoE roster
   exists, which offline is nowhere. Rehearse it on a replica of the
   2026-10-08 ballot built from the roster fixture: the 57 state and federal
   candidates and their 21 races, every race's publication status as it was
   that day, the harness's own r-* races moved out of the general election.
   All inside a transaction that is rolled back, so nothing after this sees it.
   This is the check that the live apply's assertions agree with the
   worksheet's totals before the founder runs it. */
await check("0049 whole-ballot assertions pass on a replica of the 2026-10-08 ballot", async () => {
  const roster = JSON.parse(
    await readFile(path.join(root, "scripts/fixtures/roster/ballot-roster-2026-10-08.json"), "utf8")
  );
  const notices = [];
  await db.exec("BEGIN;");
  try {
    await db.exec("UPDATE race SET election = 'primary' WHERE race_id NOT LIKE 'FL-%';");
    const doe = roster.filter((r) => r.level !== "county");
    for (const r of doe) {
      await db.query(
        `INSERT INTO candidate (candidate_id, legal_name, party, office_sought, qualifying_status, official_site)
         VALUES ($1, $2, 'NPA', $3, 'qualified', $4);`,
        [r.candidate_id, r.legal_name, r.race_id === "FL-GOV-general" ? "Governor" : "Replica office",
         r.has_site ? "https://example.org/" : null]
      );
    }
    for (const raceId of [...new Set(doe.map((r) => r.race_id))]) {
      const inRace = doe.filter((r) => r.race_id === raceId);
      await db.query(
        `INSERT INTO race (race_id, office, level, election, candidate_ids) VALUES ($1, 'Replica', $2, 'general', $3);`,
        [raceId, inRace[0].level, inRace.map((r) => r.candidate_id)]
      );
    }
    for (const raceId of [...new Set(roster.map((r) => r.race_id))]) {
      const status = roster.find((r) => r.race_id === raceId).race_status;
      await db.query(
        `INSERT INTO race_publication (race_id, status, published_at)
         VALUES ($1, $2, CASE WHEN $2 = 'published' THEN now() END)
         ON CONFLICT (race_id) DO UPDATE SET status = EXCLUDED.status, published_at = EXCLUDED.published_at;`,
        [raceId, status]
      );
    }
    const sql = await readFile(path.join(migrationsDir, rosterFile), "utf8");
    await db.exec(sql, { onNotice: (n) => notices.push(n.message) });
  } finally {
    await db.exec("ROLLBACK;");
  }
  if (!notices.some((m) => /^0049: 106 ballot candidates sourced/.test(m))) {
    throw new Error(`the whole-ballot branch did not finish; notices: ${JSON.stringify(notices)}`);
  }
});
```

- [ ] **Step 2: Run the harness and watch the new cases fail**

Run: `"$NODE" scripts/verify-migrations.mjs 2>&1 | grep -E "0049|check\(s\) failed"`
Expected: `  ok  0049 sorts before any *_content_freeze.sql` and 20 `FAIL  0049 ...` lines (the file does not exist yet), then `20 check(s) failed`.

- [ ] **Step 3: Write the migration**

Create `supabase/migrations/0049_roster_completeness.sql` exactly as below. Every generated block is empty here; Step 4 fills them from the worksheet. Never edit a generated line by hand.

```sql
-- 0049_roster_completeness.sql
-- Verified incumbency for every ballot candidate and race, running mates for
-- the eight Governor tickets, and the listed-race sites a re-check found.
-- Spec: docs/superpowers/specs/2026-10-08-roster-completeness-design.md
-- (§3.1 what the words mean, §3.2 schema, §3.3-3.4 the reads and the data).
--
-- THE DATA IS GENERATED. Every value between a "BEGIN generated" and an
-- "END generated" line is written by `node scripts/roster-worksheet.ts
-- --write-migration` from docs/general-election/roster-completeness-2026-10.md,
-- where each row carries its source URL, both read times and the page's own
-- words. scripts/verify-roster-worksheet.ts fails if the two ever differ. Edit
-- the worksheet, never these lines.
--
-- WHAT "INCUMBENT" MEANS HERE (D1, Recommended pending founder confirmation):
-- the candidate serves today in the office, or on the body, the race elects
-- to. For the U.S. House, the Senate, a county commission or a school board
-- that is membership, whatever seat they hold: Wasserman Schultz (holds
-- District 25, runs in FL-20) and Moskowitz (holds 23, runs in FL-25) are
-- members of the House. A false here is a CHECKED false: the source lists the
-- body's current members, or names the office's holder, without them. Until
-- this file, false only meant "unknown" (0031, 0038, src/lib/incumbency.ts).
-- The worksheet also records the narrower fact (holds this race's own seat);
-- D1's TO FLIP is `--write-migration --d1 seat`, no new read.
--
-- race.incumbent_id is derived here from the candidate rows: the one ballot
-- candidate with is_incumbent, NULL when none; a race with two or more gets
-- the seat holder named in the worksheet, or NULL. is_open_seat is exactly
-- (incumbent_id IS NULL). Neither is shown to voters (D4).
--
-- RUNNING MATES (D5, D6): the Division of Elections' canDetail page for each
-- ticket, the "Running Mate" field with entities decoded and whitespace
-- collapsed (normalizeDoeText), nothing else changed.
--
-- SITES (D11): only a re-check find in a LISTED race is written; a find in a
-- published race waits in the worksheet until after Nov 3, because its brief
-- was built without it. The UPDATE below refuses a published-race row anyway.
--
-- GUARDS, added after the data so every existing row satisfies them:
--   * CHECKs: a source always has its date; a true is_incumbent needs a
--     source; the three running-mate columns are set together, only on a
--     Governor row, and never carry doubled or edge whitespace.
--   * candidate_sourced_fact_guard: on a row that already has a source, a
--     changed is_incumbent or running_mate must arrive with a new source or
--     date in the same statement. B4's write (toollayer store.py:245-247)
--     names neither, so it fails on any value it would change. A tripwire,
--     not a lock: the control is still that no agent writes these columns
--     (D10). EXECUTE on the function is revoked by name (the lesson of 0020);
--     Postgres checks EXECUTE on a trigger function when the trigger is
--     created, not when it fires, so the trigger fires for every writer.
--
-- ORDER: this file must sort before 0050_content_freeze.sql (ledger,
-- supabase/migrations/README.md): a replay inside the freeze window applies
-- the guard after these UPDATEs, not before them.
--
-- Nothing here is voter-facing on apply: SHOW_INCUMBENT_CHIP stays false and
-- no page reads running_mate until the display PR (claude/roster-display).
-- New columns reach the anon roster through the existing row policy (0033).
--
-- Idempotent: every statement re-runs. A re-run with the same values passes
-- the trigger, because no value changes.

-- (1) Columns.
ALTER TABLE candidate
  ADD COLUMN IF NOT EXISTS incumbency_source        text,
  ADD COLUMN IF NOT EXISTS incumbency_verified_at   timestamptz,
  ADD COLUMN IF NOT EXISTS running_mate             text,
  ADD COLUMN IF NOT EXISTS running_mate_source      text,
  ADD COLUMN IF NOT EXISTS running_mate_verified_at timestamptz;

-- (2) Incumbency for all 106 ballot candidates, joined on id AND legal name so
-- a wrong id updates nothing and the count assertion below fails. fec_id only
-- where the FEC cross-check matched a federal row by hand; COALESCE keeps
-- NULL otherwise.
UPDATE candidate c
   SET is_incumbent           = v.is_incumbent,
       incumbency_source      = v.source,
       incumbency_verified_at = v.verified_at::timestamptz,
       fec_id                 = COALESCE(v.fec_id, c.fec_id)
  FROM (VALUES
    -- BEGIN generated: candidates
    -- END generated: candidates
  ) AS v(candidate_id, legal_name, is_incumbent, source, verified_at, fec_id)
 WHERE c.candidate_id = v.candidate_id
   AND c.legal_name   = v.legal_name;

-- (3) race.incumbent_id from the candidate rows: the one ballot candidate with
-- is_incumbent, else NULL. Races with two or more are left to (4).
UPDATE race r
   SET incumbent_id = s.one_inc
  FROM (SELECT r2.race_id,
               count(*) FILTER (WHERE c.is_incumbent)          AS n_inc,
               max(c.candidate_id) FILTER (WHERE c.is_incumbent) AS one_inc
          FROM race r2
          JOIN candidate c ON c.candidate_id = ANY (r2.candidate_ids)
         WHERE r2.election = 'general' AND c.ballot_status = 'ballot'
         GROUP BY r2.race_id) s
 WHERE r.race_id = s.race_id
   AND s.n_inc <= 1
   AND r.incumbent_id IS DISTINCT FROM s.one_inc;

-- (4) A race with two or more incumbents: the worksheet's seat holder, or NULL.
-- The first row matches no race; it keeps the list valid when none is needed.
UPDATE race r
   SET incumbent_id = v.incumbent_id
  FROM (VALUES
    ('__none__', NULL::text)
    -- BEGIN generated: race_overrides
    -- END generated: race_overrides
  ) AS v(race_id, incumbent_id)
 WHERE r.race_id = v.race_id
   AND r.incumbent_id IS DISTINCT FROM v.incumbent_id;

-- (5) is_open_seat is exactly (incumbent_id IS NULL), on every general race.
UPDATE race
   SET is_open_seat = (incumbent_id IS NULL)
 WHERE election = 'general'
   AND is_open_seat IS DISTINCT FROM (incumbent_id IS NULL);

-- (6) Running mates for the eight Governor tickets, all in one statement.
UPDATE candidate c
   SET running_mate             = v.running_mate,
       running_mate_source      = v.source,
       running_mate_verified_at = v.verified_at::timestamptz
  FROM (VALUES
    -- BEGIN generated: tickets
    -- END generated: tickets
  ) AS v(candidate_id, legal_name, running_mate, source, verified_at)
 WHERE c.candidate_id  = v.candidate_id
   AND c.legal_name    = v.legal_name
   AND c.office_sought = 'Governor';

-- (7) A site the re-check found for a candidate in a LISTED race (D11).
UPDATE candidate c
   SET official_site         = v.official_site,
       site_last_verified_at = v.verified_at::timestamptz
  FROM (VALUES
    ('__none__', '', '', '2026-10-08T00:00:00Z')
    -- BEGIN generated: sites
    -- END generated: sites
  ) AS v(candidate_id, legal_name, official_site, verified_at)
 WHERE c.candidate_id = v.candidate_id
   AND c.legal_name   = v.legal_name
   AND EXISTS (SELECT 1
                 FROM race r
                 JOIN race_publication rp ON rp.race_id = r.race_id
                WHERE c.candidate_id = ANY (r.candidate_ids)
                  AND rp.status = 'listed');

-- (8) Constraints, after the data.
ALTER TABLE candidate DROP CONSTRAINT IF EXISTS candidate_incumbency_sourced;
ALTER TABLE candidate ADD CONSTRAINT candidate_incumbency_sourced
  CHECK ((incumbency_source IS NULL) = (incumbency_verified_at IS NULL));

ALTER TABLE candidate DROP CONSTRAINT IF EXISTS candidate_incumbent_needs_source;
ALTER TABLE candidate ADD CONSTRAINT candidate_incumbent_needs_source
  CHECK (NOT is_incumbent OR incumbency_verified_at IS NOT NULL);

ALTER TABLE candidate DROP CONSTRAINT IF EXISTS candidate_running_mate_sourced;
ALTER TABLE candidate ADD CONSTRAINT candidate_running_mate_sourced
  CHECK ((running_mate IS NULL) = (running_mate_source IS NULL)
     AND (running_mate IS NULL) = (running_mate_verified_at IS NULL));

ALTER TABLE candidate DROP CONSTRAINT IF EXISTS candidate_running_mate_governor;
ALTER TABLE candidate ADD CONSTRAINT candidate_running_mate_governor
  CHECK (running_mate IS NULL OR office_sought = 'Governor');

ALTER TABLE candidate DROP CONSTRAINT IF EXISTS candidate_running_mate_clean;
ALTER TABLE candidate ADD CONSTRAINT candidate_running_mate_clean
  CHECK (running_mate IS NULL
      OR running_mate = btrim(regexp_replace(running_mate, '\s+', ' ', 'g')));

-- (9) The guard on changing a sourced value, last.
CREATE OR REPLACE FUNCTION public.candidate_sourced_fact_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.is_incumbent IS DISTINCT FROM OLD.is_incumbent
     AND OLD.incumbency_verified_at IS NOT NULL
     AND NEW.incumbency_source      IS NOT DISTINCT FROM OLD.incumbency_source
     AND NEW.incumbency_verified_at IS NOT DISTINCT FROM OLD.incumbency_verified_at THEN
    RAISE EXCEPTION 'candidate %: is_incumbent changed without a new incumbency_source or incumbency_verified_at', OLD.candidate_id
      USING ERRCODE = 'P0001';
  END IF;
  IF NEW.running_mate IS DISTINCT FROM OLD.running_mate
     AND NEW.running_mate IS NOT NULL
     AND OLD.running_mate_verified_at IS NOT NULL
     AND NEW.running_mate_source      IS NOT DISTINCT FROM OLD.running_mate_source
     AND NEW.running_mate_verified_at IS NOT DISTINCT FROM OLD.running_mate_verified_at THEN
    RAISE EXCEPTION 'candidate %: running_mate changed without a new running_mate_source or running_mate_verified_at', OLD.candidate_id
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.candidate_sourced_fact_guard()
  FROM PUBLIC, anon, authenticated, cap_tool_wrapper, cap_readonly;

DROP TRIGGER IF EXISTS candidate_sourced_fact_guard ON candidate;
CREATE TRIGGER candidate_sourced_fact_guard
  BEFORE UPDATE OF is_incumbent, running_mate ON candidate
  FOR EACH ROW EXECUTE FUNCTION public.candidate_sourced_fact_guard();

-- (10) Assert the result. The county roster is seeded by 0031/0032/0038, so
-- the county assertions hold in the offline harness too; the whole-ballot ones
-- need the DoE roster and run only on the live project.
DO $$
DECLARE
  n int;
  -- BEGIN generated: totals
  -- END generated: totals
BEGIN
  SELECT count(*) INTO n
    FROM race r, unnest(r.candidate_ids) cid
    JOIN candidate c ON c.candidate_id = cid
   WHERE r.level = 'county' AND c.ballot_status = 'ballot'
     AND c.incumbency_source IS NOT NULL AND c.incumbency_verified_at IS NOT NULL;
  IF n <> 49 THEN
    RAISE EXCEPTION '0049: % of the 49 county ballot candidates carry an incumbency source', n;
  END IF;

  -- Every incumbent_id names a ballot candidate of that race who has is_incumbent.
  SELECT count(*) INTO n FROM race r
   WHERE r.election = 'general' AND r.incumbent_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM candidate c
                      WHERE c.candidate_id = r.incumbent_id
                        AND c.candidate_id = ANY (r.candidate_ids)
                        AND c.ballot_status = 'ballot' AND c.is_incumbent);
  IF n > 0 THEN
    RAISE EXCEPTION '0049: % race(s) name an incumbent_id who is not an incumbent on their ballot', n;
  END IF;

  -- A race with exactly one incumbent names that one.
  SELECT count(*) INTO n
    FROM race r
    CROSS JOIN LATERAL (
      SELECT count(*) FILTER (WHERE c.is_incumbent)            AS n_inc,
             max(c.candidate_id) FILTER (WHERE c.is_incumbent) AS one_inc
        FROM candidate c
       WHERE c.candidate_id = ANY (r.candidate_ids) AND c.ballot_status = 'ballot') s
   WHERE r.election = 'general' AND s.n_inc = 1 AND r.incumbent_id IS DISTINCT FROM s.one_inc;
  IF n > 0 THEN
    RAISE EXCEPTION '0049: % race(s) with one incumbent do not name them', n;
  END IF;

  SELECT count(*) INTO n FROM race
   WHERE election = 'general' AND is_open_seat <> (incumbent_id IS NULL);
  IF n > 0 THEN
    RAISE EXCEPTION '0049: % race(s) where is_open_seat disagrees with incumbent_id', n;
  END IF;

  IF (SELECT incumbent_id FROM race WHERE race_id = 'FL-HIL-SB4-general') IS DISTINCT FROM 'FL-VF-HIL-2672' THEN
    RAISE EXCEPTION '0049: FL-HIL-SB4-general must name Patti Rendon (FL-VF-HIL-2672)';
  END IF;

  SELECT count(*) INTO n FROM race r, unnest(r.candidate_ids) cid
    JOIN candidate c ON c.candidate_id = cid
   WHERE r.race_id = 'FL-GOV-general';
  IF n = 0 THEN
    RAISE NOTICE '0049: DoE roster absent (offline harness) - whole-ballot assertions not run';
    RETURN;
  END IF;

  SELECT count(*) INTO n FROM race WHERE election = 'general';
  IF n <> 53 THEN
    RAISE EXCEPTION '0049: % general races, expected 53', n;
  END IF;

  SELECT count(DISTINCT c.candidate_id) INTO n FROM race r, unnest(r.candidate_ids) cid
    JOIN candidate c ON c.candidate_id = cid
   WHERE r.election = 'general' AND c.ballot_status = 'ballot'
     AND c.incumbency_source IS NOT NULL AND c.incumbency_verified_at IS NOT NULL;
  IF n <> 106 THEN
    RAISE EXCEPTION '0049: % of 106 ballot candidates carry an incumbency source', n;
  END IF;

  SELECT count(DISTINCT c.candidate_id) INTO n FROM race r, unnest(r.candidate_ids) cid
    JOIN candidate c ON c.candidate_id = cid
   WHERE r.election = 'general' AND c.ballot_status = 'ballot' AND c.is_incumbent;
  IF n <> n_incumbents_expected THEN
    RAISE EXCEPTION '0049: % ballot candidates are incumbents, the worksheet says %', n, n_incumbents_expected;
  END IF;

  IF (SELECT incumbent_id FROM race WHERE race_id = 'FL-GOV-general') IS NOT NULL THEN
    RAISE EXCEPTION '0049: FL-GOV-general must be open';
  END IF;
  IF (SELECT incumbent_id FROM race WHERE race_id = 'FL-ATG-general') IS DISTINCT FROM 'FL-DOE-89041' THEN
    RAISE EXCEPTION '0049: FL-ATG-general must name James Uthmeier (FL-DOE-89041)';
  END IF;

  SELECT count(*) INTO n FROM race r, unnest(r.candidate_ids) cid
    JOIN candidate c ON c.candidate_id = cid
   WHERE r.race_id = 'FL-GOV-general' AND c.ballot_status = 'ballot'
     AND c.running_mate IS NOT NULL;
  IF n <> 8 THEN
    RAISE EXCEPTION '0049: % of 8 Governor tickets carry a running mate', n;
  END IF;

  SELECT count(DISTINCT c.candidate_id) INTO n FROM race r, unnest(r.candidate_ids) cid
    JOIN candidate c ON c.candidate_id = cid
   WHERE r.election = 'general' AND c.ballot_status = 'ballot' AND c.official_site IS NOT NULL;
  IF n <> n_sited_expected THEN
    RAISE EXCEPTION '0049: % ballot candidates have an official_site, expected %', n, n_sited_expected;
  END IF;

  RAISE NOTICE '0049: 106 ballot candidates sourced, % incumbents, 8 running mates, % sited',
    n_incumbents_expected, n_sited_expected;
END $$;
```

- [ ] **Step 4: Generate the data from the worksheet**

Run: `"$NODE" --no-warnings scripts/roster-worksheet.ts --write-migration`
Expected: `0 problem(s) in docs/general-election/roster-completeness-2026-10.md` and `wrote the generated blocks of supabase/migrations/0049_roster_completeness.sql (D1 rule: membership)`. Inspect the result: `grep -n -A3 "BEGIN generated: totals" supabase/migrations/0049_roster_completeness.sql` shows the incumbent total equal to the worksheet Summary's D1 count and `n_sited_expected` = 97 plus the `write now` rows.

- [ ] **Step 5: Run the harness and watch it pass**

Run: `"$NODE" scripts/verify-migrations.mjs 2>&1 | grep -E "0049|FAIL|passed|failed"`
Expected: 22 lines mentioning 0049, all `  ok` (`migration applies: 0049_roster_completeness.sql` and the 21 cases, the last `0049 whole-ballot assertions pass on a replica of the 2026-10-08 ballot`), no `FAIL`, and `All migration + RLS checks passed.`

If the replica check fails with an assertion message, the worksheet and the migration disagree about the ballot (for example an incumbent total, a sited count, or a spec assertion): fix the worksheet, regenerate (Step 4), and run again. Do not change the assertion.

- [ ] **Step 6: Check the migration against the worksheet**

In `scripts/verify-roster-worksheet.ts`, add above the first `import {`:

```ts
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
```

Replace the `./roster-worksheet.ts` import block with:

```ts
import {
  MIGRATION_PATH,
  ROOT,
  WORKSHEET_PATH,
  applyBlocks,
  checkWorksheet,
  fillTimes,
  generatedBlocks,
  labelFor,
  loadRoster,
  officialHost,
  ruleOf,
  timesFromRounds,
  type RosterRow,
} from "./roster-worksheet.ts";
```

And insert this section directly above `if (failures) {`:

```ts
/* ---- 3. the real worksheet and migration ----------------------------------- */

const wsFile = join(ROOT, WORKSHEET_PATH);
const sqlFile = join(ROOT, MIGRATION_PATH);
check(`${WORKSHEET_PATH} exists`, existsSync(wsFile));
check(`${MIGRATION_PATH} exists`, existsSync(sqlFile));
if (existsSync(wsFile) && existsSync(sqlFile)) {
  const md = readFileSync(wsFile, "utf8");
  const sql = readFileSync(sqlFile, "utf8");
  const problems = checkWorksheet(md, fullRoster);
  check("the worksheet passes every rule", problems.length === 0, `${problems.length} problem(s): ${problems.slice(0, 8).join("; ")}`);
  if (problems.length === 0) {
    check(
      "the migration's generated blocks are exactly what the worksheet produces",
      applyBlocks(sql, generatedBlocks(md, fullRoster, ruleOf(sql))) === sql,
      "run: node scripts/roster-worksheet.ts --write-migration",
    );
  }
}
```

Run: `"$NODE" --no-warnings scripts/verify-roster-worksheet.ts | tail -6`
Expected: `  ok  ... exists` twice, `  ok  the worksheet passes every rule`, `  ok  the migration's generated blocks are exactly what the worksheet produces`, then `roster worksheet: all checks passed`.

- [ ] **Step 7: Prove two guards bite (temporary edits, reverted)**

```bash
cp supabase/migrations/0049_roster_completeness.sql .roster-reads/0049.sql.bak
"$NODE" -e '
const fs = require("fs"), p = "supabase/migrations/0049_roster_completeness.sql";
fs.writeFileSync(p, fs.readFileSync(p, "utf8").replace(/REVOKE ALL ON FUNCTION public\.candidate_sourced_fact_guard\(\)\n  FROM PUBLIC, anon, authenticated, cap_tool_wrapper, cap_readonly;\n/, ""));'
"$NODE" scripts/verify-migrations.mjs 2>&1 | grep FAIL
cp .roster-reads/0049.sql.bak supabase/migrations/0049_roster_completeness.sql
"$NODE" -e '
const fs = require("fs"), p = "supabase/migrations/0049_roster_completeness.sql";
fs.writeFileSync(p, fs.readFileSync(p, "utf8").replace(", false, \x27https://", ", true, \x27https://"));'
"$NODE" --no-warnings scripts/verify-roster-worksheet.ts | grep FAIL
cp .roster-reads/0049.sql.bak supabase/migrations/0049_roster_completeness.sql
"$NODE" --no-warnings scripts/verify-roster-worksheet.ts | tail -1
"$NODE" scripts/verify-migrations.mjs 2>&1 | tail -1
```
Expected, in order: `FAIL  0049: no API role holds EXECUTE on candidate_sourced_fact_guard` (without the REVOKE, the API roles keep EXECUTE); `FAIL  the migration's generated blocks are exactly what the worksheet produces ...` (a hand-edited value is caught); then, restored, `roster worksheet: all checks passed` and `All migration + RLS checks passed.`

- [ ] **Step 8: Record the file in the ledger**

In `supabase/migrations/README.md`, row 0049 (line 65), replace the state cell text `not written. Cut-off: applied by Thu 10-15 12:00 EDT` with:

```text
**written** on `claude/roster-completeness`, **not applied**: the founder applies it after the PR merges and a separate yes (spec D10). Cut-off: applied by Thu 10-15 12:00 EDT, or it waits until after Nov 3
```

- [ ] **Step 9: Type-check and lint**

Run:
```bash
"$NODE" node_modules/typescript/bin/tsc --noEmit --strict --erasableSyntaxOnly --target es2022 --module esnext --moduleResolution bundler --allowImportingTsExtensions --skipLibCheck --types node scripts/verify-roster-worksheet.ts scripts/roster-reads.ts
"$NODE" node_modules/eslint/bin/eslint.js scripts/verify-roster-worksheet.ts scripts/verify-migrations.mjs
```
Expected: no output, exit 0.

- [ ] **Step 10: Commit**

```bash
git add supabase/migrations/0049_roster_completeness.sql supabase/migrations/README.md scripts/verify-migrations.mjs scripts/verify-roster-worksheet.ts
git commit -F - <<'EOF'
0049_roster_completeness: verified incumbency, running mates, open seats (not applied)

Five additive candidate columns; incumbency with its source and first read
date for all 106 ballot candidates, joined on id and legal name; race
incumbent_id derived in SQL and is_open_seat = (incumbent_id IS NULL) on all
53; the eight running mates; listed-race site finds only. Then five CHECKs
and candidate_sourced_fact_guard, which refuses a changed is_incumbent or
running_mate on a sourced row unless a new source or date comes with it
(B4's UPDATE fails), with EXECUTE revoked by name. The data is generated
from docs/general-election/roster-completeness-2026-10.md and checked for
drift. verify-migrations.mjs covers spec §6 and rehearses the live-only
assertions on a replica of the 2026-10-08 ballot. Sorts before
0050_content_freeze. Not applied: the founder applies it after merge and a
separate yes.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 8: Full verification and the pull request

**Files:** none changed, unless a check fails.

- [ ] **Step 1: Run every check**

Run:
```bash
"$NODE" scripts/verify-all.mjs 2>&1 | tail -6
"$NODE" node_modules/typescript/bin/tsc --noEmit
"$NODE" node_modules/typescript/bin/tsc --noEmit --strict --erasableSyntaxOnly --target es2022 --module esnext --moduleResolution bundler --allowImportingTsExtensions --skipLibCheck --types node scripts/roster-reads-lib.ts scripts/roster-sources.ts scripts/roster-reads.ts scripts/roster-worksheet.ts scripts/verify-roster-worksheet.ts
"$NODE" node_modules/eslint/bin/eslint.js scripts/roster-reads-lib.ts scripts/roster-sources.ts scripts/roster-reads.ts scripts/roster-worksheet.ts scripts/verify-roster-worksheet.ts scripts/verify-migrations.mjs
```
Expected: `verify-all` reports one more pass and one more script than Task 1 Step 1 (`verify-roster-worksheet.ts`; on 2026-10-08 that was `69 passed (1 offline only), 1 failed, 2 skipped (needs env), 72 total`), `verify-migrations.mjs` passing, and the same known failure (`verify-news-neutrality.ts`) and two skips, nothing else; both `tsc` runs and `eslint` print nothing. No `next build` is needed: nothing under `src/` changed.

- [ ] **Step 2: Confirm the scope**

Run:
```bash
git diff --name-only origin/main...HEAD
git diff --stat origin/main...HEAD -- src
grep -n "export const SHOW_INCUMBENT_CHIP" src/lib/incumbency.ts
git status --short
```
Expected: the names list holds only `.gitignore`, `docs/general-election/roster-completeness-2026-10.md`, `docs/superpowers/plans/2026-10-08-roster-data.md`, `scripts/fixtures/roster/ballot-roster-2026-10-08.json`, `scripts/roster-reads-lib.ts`, `scripts/roster-reads.ts`, `scripts/roster-sources.ts`, `scripts/roster-worksheet.ts`, `scripts/verify-migrations.mjs`, `scripts/verify-roster-worksheet.ts`, `supabase/migrations/0049_roster_completeness.sql` and `supabase/migrations/README.md` (the README also carries the base branch's ledger commit `08384c5`); the `src` diff is empty; `SHOW_INCUMBENT_CHIP = false` unchanged; nothing uncommitted and nothing under `.roster-reads/`.

- [ ] **Step 3: Push the branch and open the pull request (never merge)**

```bash
git push -u origin claude/roster-completeness
```
Write the body to `.roster-reads/pr-body.md` (gitignored) from this text, with the counts filled in from the worksheet Summary and the verify-all summary line pasted in:

```markdown
## What

Rollout steps 3-4 (PR 1) of `docs/superpowers/specs/2026-10-08-roster-completeness-design.md`:

- **The worksheet**, `docs/general-election/roster-completeness-2026-10.md`. For each of the 106 ballot candidates: whether they serve today in the office or on the body their race elects to (D1), and whether they hold this race's own seat (D1's TO FLIP), each with its deciding official page, two reads at least an hour apart, a second official page for every Yes, and the page's own words. For each of the 53 races: `incumbent_id` and `is_open_seat`. The FEC cross-check, the eight DoE running-mate reads and the nine site re-checks. Incumbents: N of 106 under D1, M of 106 under its TO FLIP. Open races: (list). Questions for the founder: (count, or none).
- **`supabase/migrations/0049_roster_completeness.sql`, NOT APPLIED.** Five additive `candidate` columns; the data, generated from the worksheet; five CHECKs; the `candidate_sourced_fact_guard` trigger with EXECUTE revoked by name; the DO-block assertions. Sorts before `0050_content_freeze.sql`.
- **The read tooling** (`scripts/roster-reads.ts`, `roster-reads-lib.ts`, `roster-sources.ts`, `roster-worksheet.ts`), offline tests (`scripts/verify-roster-worksheet.ts`), and the spec §6 cases in `scripts/verify-migrations.mjs` (block 20), which also rehearse the live-only assertions on a replica of the 2026-10-08 ballot.

Nothing voter-facing changes: no file under `src/` is touched, and `SHOW_INCUMBENT_CHIP` stays `false`.

## Decisions this PR encodes

(Copy the sixteen numbered items of "Decisions this PR encodes" from `docs/superpowers/plans/2026-10-08-roster-data.md` here, unchanged.)

## For the founder

1. Review the worksheet (every row's URL and quoted evidence, and its Questions section) together with the migration. Approving it confirms D4, D6, D9 and D11, which the data encodes (spec §5 step 5).
2. Merge order: PR #131 (`0046_uthmeier_incumbent.sql`) and the ledger PR (`claude/migration-ledger-2026-10-09`) first, then this one.
3. After the merge, and only with your separate yes: apply it with the Supabase MCP `apply_migration` (name `0049_roster_completeness`), read the new columns back as `anon` on one listed and one published race, and run gate queries 2 and 3 of spec §3.11 read-only. Cut-off: applied by Thu 10-15 12:00 EDT, or it waits until after Nov 3.
4. Running-mate re-reads on Sat 10-17, Mon 10-26 and Mon 11-02 (spec §3.6), by a read-only session: `node scripts/roster-reads.ts --round 2026-10-17 --only doe-`, then compare each `stored` value in `.roster-reads/2026-10-17/facts.json` with the worksheet's running-mates table. A difference is a correction (spec §3.10), never an automatic write.

## Not in this PR

The display, `src/lib/incumbency.ts`, `src/lib/running-mate.ts` (where PR 2 moves `normalizeDoeText`), `src/types/schema.ts`, the cache keys and R5's running-mate names: PR 2, `claude/roster-display`. Contact: the agent retrofit.

## Checks

- `node scripts/verify-all.mjs`: (paste its summary line). The one failure is the known live-data `verify-news-neutrality.ts`.
- `tsc --noEmit` (the project, and strict standalone on the new scripts) and `eslint`: clean.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

Then:
```bash
gh pr create --base main --head claude/roster-completeness \
  --title "Roster completeness: verified incumbency, running mates, open seats (0049, unapplied)" \
  --body-file .roster-reads/pr-body.md
```
Expected: the PR URL. Do not merge it and do not apply the migration.

---

## Self-review

- Spec coverage: §3.1 (D1 both columns, incumbent_id rule, is_open_seat) → Tasks 2, 5, 7; §3.2 (columns, five CHECKs, trigger, revoke, no race constraint, order before 0050) → Task 7; §3.3 (fetched and read, two reads an hour apart, second page for a Yes, headless Chromium, Ballotpedia and SoE as leads only, FEC cross-check with the project key and the 429 rule, per-level sources) → Tasks 3, 4, 6 and the checker in Task 2; §3.4 (worksheet rows per candidate, race, ticket and no-site candidate; data order; DO-block assertions; idempotence) → Tasks 5-7; §3.6 D6 and the canDetail reads → Tasks 1, 4, 5; §3.7 re-checks and D11 → Tasks 4, 5, 7; §6 verify-migrations cases (applies after 0047, five columns, each CHECK, trigger as `cap_tool_wrapper` with B4's statement, new source passes, unchanged passes, takedown passes, anon listed vs draft, county assertions and DoE-absent notice, ordering before content_freeze) → Task 7. The re-reads on 10-17, 10-26 and 11-02 are after this PR; the worksheet's tickets table has their columns, and the PR body gives the command.
- Out of scope, untouched: the display, `incumbency.ts`, `running-mate.ts`, `schema.ts`, cache keys, R5, contact.
