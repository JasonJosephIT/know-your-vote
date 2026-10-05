# One refresh before early voting, with a cut-off (plan, 2026-10-04)

Launch handoff §3, founder decisions 5 (intermittent bot walls) and 7 (a refresh before early voting). **This is a plan. Nothing in it has been run**: no site fetched, no Jev call, no database write. Every published brief is still the 2026-09-29 snapshot (`apply-2026-10-04.md`).

## The calls this plan rests on

| # | Decision | Recommended (pending founder confirmation) | How to flip |
| - | -------- | ------------------------------------------- | ----------- |
| 5 | Intermittent bot walls | **One more identical re-run** for every candidate whose site read in an earlier run and was walled on 2026-09-29. **Never solve a captcha.** The five candidates are in [`rerun-targets-2026-10.tsv`](rerun-targets-2026-10.tsv). | Without a refresh: skip Step 1c. With a refresh, the five are fetched like every other candidate, so decision 5 has nothing left to switch off. To read the rule as whole-site walls only, delete Eliott Rodriguez's line from the TSV. |
| 7 | A refresh before early voting | **One refresh, with a cut-off:** the gates below, then a **freeze from 10-18 to 11-03**, with corrections only. | No refresh: do nothing. The 2026-09-29 snapshot stays, and `BRIEF_SNAPSHOT_DATE` is unchanged. Other dates: edit the gate table. |
| 7a | A site, or any page, that read on 09-29 is walled in the refresh, even after its one re-run | **Keep that candidate's whole 2026-09-29 run.** A wall is a failed fetch, not a change on the site, so their quotes stay. This covers a walled page as well as a walled site: a page that gave passages on 09-29 and is walled now must not show up in triage as a changed passage set (Step 1d). Name them on the methodology page (Step 4). | Record silence instead: `"run": null` with the wall as the reason, as for Beltran on 09-29. For a walled page only, the flip is to take the refreshed run as it is (the page's quotes drop out). |
| 7b | Rebuilding a published race whose brief changed (MCP `DELETE`s hang) | **Path B1:** the founder runs that race's whole `brief.sql` in one non-MCP session. The race stays published, dark only until the audit write-back. | **Path B2:** take the race to `listed` first, the founder runs only its three `DELETE`s, and the rest follows 2026-10-04 exactly (Step 4). |

### Who the decision 5 re-run covers, and why these five

The handoff named Taddeo and Shuham. The 2026-09-25 ingest (`../policy-runs/passages-2026-09-25/index.json`) shows two more who read before. The run logs show one candidate walled at the page rather than the site.

| Candidate | Race | Read before | Walled on 2026-09-29 | Race state |
| --------- | ---- | ----------- | -------------------- | ---------- |
| Mike Beltran | FL-14 | 09-25: 34 passages, 3 pages | keyword crawl, Jev-link run and its re-run | published (he is silent) |
| Pia Dandiya | FL-22 | 09-25: 62 passages, 3 pages | keyword crawl, Jev-link run and its re-run | published (she is silent) |
| Eliott Rodriguez | FL-27 | `/issues`: 50 passages on 09-25 and in the 09-29 keyword crawl | Jev-link run: `/issues` "rendered, but only 23 characters". The homepage read, so the ingest exited 0 and was never retried. | published, with no spine coverage (`../listed-races-2026-10-04.md` §5) |
| Caryl Sandler Shuham | Broward CC6 | 09-25 and the 09-29 keyword crawl: 42 passages | Jev-link run and its re-run (the challenge rendered an empty page) | listed. Decided in August, so not on the November ballot. |
| Annette Taddeo | FL-CFO | 09-25 (on the third try) and the 09-29 keyword crawl: 10 passages | Jev-link run and its re-run | listed. A brief is likely if her site reads. |

**Not in the decision 5 re-run** (the TSV, used alone under Step 1c):
- **Rob Piper and Dean Abrams.** Their sites never read in any run.
- **Jeannette Quiñones Hernández.** Her robots.txt refuses Anthropic's crawlers by name, and that is honoured.
- **Pages never read before.** Karen Perez `/about` and Mike Scott's business case study rendered 23 characters on 09-29, but neither page was read in an earlier run.

In a full refresh (Step 1b), Piper, Abrams, Perez and Scott do get the standing one identical re-run that every failure gets, because a 23-character render counts as a walled page there. That is the 09-29 rule, not decision 5. Quiñones Hernández is never re-run.

The TSV's rows are copied byte for byte from `ingest-targets-2026-09-29.tsv`. Its format is the same 4 columns, and its sites equal the live `candidate.official_site` (checked 2026-10-04 with the roster hash below).

## Calendar

| Gate | By | What | Who |
| ---- | -- | ---- | --- |
| 0 | **Wed 10-07** | Answers to 5, 7, 7a and 7b. `TYPESAFE_API_KEY` made available to the session's environment. | Founder |
| 1 | **Mon 10-12** | Re-ingest plus Step 2 for every target, then the one identical re-run of every failure (Step 1). The decision 5 candidates are re-run here. | Agent |
| 2 | **Wed 10-14** | Reviews of changed runs, plans, `brief.sql`, local reference, audit previews, fingerprint triage, and a summary for the founder (Step 2). | Agent |
| 3 | **Thu 10-15** | Founder's yes: all changed races, or a named set (Step 3). | Founder |
| 4 | **Sat 10-17** | Apply, fingerprint check, audit at 150, `anon` read-back, publish; `BRIEF_SNAPSHOT_DATE` updated and deployed; live pages checked (Step 4). | Agent, plus the founder for non-MCP SQL |
| Freeze | **Sun 10-18 to Tue 11-03** | No content changes except corrections (see "The freeze"). | Both |

For reference: the vote-by-mail request deadline is 10-22, early voting runs 10-24 to 10-31, and Election Day is 11-03 (all `verified_by` in `election_event`).

**The cut-off:**
- If Gate 1 or Gate 2 is missed, the refresh stops. Nothing has been applied, so nothing needs undoing, and the 2026-09-29 snapshot stays everywhere.
- If Gate 4 runs out of time, the races already applied stay. Each passed its own checks. The rest keep their 2026-09-29 brief, and the methodology sentence names them (Step 4.4).
- Nothing from the refresh is applied after 10-17.

## Step 1: fetch (Gate 1)

Run from the repository root. `TYPESAFE_API_KEY` must be in the environment, set in the shell for that session only and **never written to a file**. Both the link picker (`--links jev`) and Step 2 call Jev.

**1.0 The roster has not moved.** This is a `SELECT` through the MCP. On 2026-10-04 at about 20:25 UTC it returned `97 | 471681f38b0829d3ed09cf9b71a6fece`, the same hash `jev-targets-2026-09-29.tsv` gives for `candidate_id|official_site` sorted in C order. If either number differs, list the differences for the founder before fetching. A new or changed site needs its own verification and a database write first (`../candidate-sites-2026-09-24.md`), and is out of scope here.

```sql
SELECT count(*) AS n,
       md5(string_agg(c.candidate_id || '|' || c.official_site, E'\n' ORDER BY c.candidate_id COLLATE "C")) AS h
FROM race r JOIN candidate c ON c.candidate_id = ANY (r.candidate_ids)
WHERE c.ballot_status = 'ballot' AND c.official_site IS NOT NULL;
```

**1.0 "The same command" still holds.** `git log` on these four files should show nothing after `cdd5a23` (2026-09-30):
- `scripts/candidate-site-ingest.ts`
- `scripts/candidate-policy-noul.ts`
- `src/lib/link-noul.ts`
- `src/lib/policy-noul.ts`

The new runs' `provenance` must read `jev:jev-1.13.0/tax-7/q-e7282116`, as the published briefs' runs do. If either check fails, stop and tell the founder: it is no longer the same command.

**1a. If decision 7 is yes: the full refresh** (97 candidates, decision 5's five included). Each run goes into a new `refresh-2026-10/` folder, so the 2026-09-29 folders that the published briefs cite are never overwritten.

```bash
B=docs/general-election/brief-runs
awk -F'\t' -v OFS='\t' 'NR==1{print;next}{sub(/\/reingest-2026-09-29$/,"",$5);$5=$5"/refresh-2026-10";print}' \
  "$B/jev-targets-2026-09-29.tsv" > "$B/refresh-targets-2026-10.tsv"
bash "$B/jev-driver-2026-09-29.sh" "$B/refresh-targets-2026-10.tsv"
```

**1b. At least one hour after 1a ends: one identical re-run of every failure.** This is the standing 2026-09-29 rule ("one identical re-run of every failure"), now with walled pages counted as failures. It is the step that gives the decision 5 candidates their re-run. robots.txt opt-outs are never re-run.

```bash
B=docs/general-election/brief-runs
{
  printf 'race_id\tcandidate_id\tname\tofficial_site\tout_dir\n'
  tail -n +2 "$B/refresh-targets-2026-10.tsv" | while IFS=$'\t' read -r race cid name site out; do
    d="$B/$out"
    code=$(awk -F'\t' '$1=="exit"{print $2}' "$d/meta.tsv" 2>/dev/null)
    grep -q '^robots\.txt disallows' "$d/ingest.log" 2>/dev/null && continue
    if [ "$code" != "0" ] || grep -qE 'bot challenge did not clear|rendered, but only [0-9]{1,2} characters' "$d/ingest.log" 2>/dev/null; then
      printf '%s\t%s\t%s\t%s\t%s\n' "$race" "$cid" "$name" "$site" "$out"
    fi
  done
} > "$B/refresh-retry-targets-2026-10.tsv"
# Keep each first attempt, as on 2026-09-29 (attempt-1-failed/).
tail -n +2 "$B/refresh-retry-targets-2026-10.tsv" | cut -f5 | while read -r out; do
  mkdir -p "$B/$out/attempt-1-failed"
  find "$B/$out" -maxdepth 1 -type f -exec mv {} "$B/$out/attempt-1-failed/" \;
done
bash "$B/jev-driver-2026-09-29.sh" "$B/refresh-retry-targets-2026-10.tsv"
```

**What the two patterns match, and why.**
- `rendered, but only [0-9]{1,2} characters`: a page that rendered under 100 characters. Every short render in the 09-29 logs is 23 characters but one: Taddeo's and Dan Green's first attempts (challenge pages: Green's site read on its re-run, Taddeo's stayed walled), Rodriguez `/issues`, Perez `/about` and Scott's case study. The one exception is a real page and is left out: Rendon's About page logs "rendered, but only 200 characters", which is the ingest's own `MIN_PAGE_TEXT_CHARS`. An earlier draft of this plan used `[0-9]+`, which matched Rendon.
- `^robots\.txt disallows`: only the whole-site refusal, which starts its log line ("robots.txt disallows … — stopping."). A single page skipped for robots.txt is logged indented ("  skipped, robots.txt disallows it …") and does not exempt a walled site from its re-run.

**Checked on 2026-10-04 against the real 2026-09-29 logs**: this block, verbatim except for the driver line, run in a scratch copy of every 09-29 run folder's `meta.tsv` and `ingest.log`, with `jev-targets-2026-09-29.tsv` as the target file. It selects 9: Beltran, Dandiya, Rodriguez, Shuham and Taddeo (decision 5); Piper and Abrams (never read); Perez and Scott (23-character pages). It leaves out Rendon (200 characters) and Quiñones Hernández (robots.txt), and every other run. The move was checked on copies of those 9 folders' logs, FL-GOV's `reingest-2026-09-29/` layout included. Re-running a page that turns out not to be a wall is harmless: the same command gives the same result. There is no second re-run.

**1c. If decision 5 is yes and decision 7 is no: the five alone.** The output goes into `rerun-2026-10/`. Then Steps 2 to 4 cover only FL-14, FL-22, FL-27, Broward CC6 and FL-CFO.

```bash
B=docs/general-election/brief-runs
awk -F'\t' -v OFS='\t' 'NR==1{print $0,"out_dir";next}{r=$1;sub(/-general$/,"",r);print $0,r"/"$2"/rerun-2026-10"}' \
  "$B/rerun-targets-2026-10.tsv" > "$B/rerun-jev-targets-2026-10.tsv"
bash "$B/jev-driver-2026-09-29.sh" "$B/rerun-jev-targets-2026-10.tsv"
```

**Three ways to get this wrong:**
- **Never pass `rerun-targets-2026-10.tsv` (4 columns) straight to `jev-driver-2026-09-29.sh`.** The driver reads the output folder from a 5th column. With 4, every run writes into `brief-runs/` itself, and the five parallel runs write over each other's files. Always derive the 5-column file first, as above.
- **Do not run `ingest-driver-2026-09-29.sh`.** Its only form is `bash docs/general-election/brief-runs/ingest-driver-2026-09-29.sh`: it takes no target file (`TARGETS` is fixed to `ingest-targets-2026-09-29.tsv`). It writes over the 09-29 folders that the published briefs cite, it runs no Step 2, and the keyword link-picking it ran on 09-29 no longer exists: `--links jev` has been the ingest default since `a6f9c94`. `jev-driver-2026-09-29.sh` is the identical command: the Jev-link ingest plus the two-gate Step 2 that the published briefs rest on.
- **Do not run `jev-reports-2026-09-29.mjs` as it is.** It reads `jev-targets-2026-09-29.tsv` and rewrites `ingest-jev-2026-09-29.md` and every 09-29 `ingest-report.md`. Copy it to `jev-reports-2026-10.mjs` and change only the targets path and the summary filename.

**The rules from 2026-09-29 do not change:** robots.txt (our token and every Anthropic token), Crawl-delay, one request at a time per host, the browser fallback, **no captcha solving**, the 8-page cap, and 0.85 on both gates.

**1d. Fallback (7a): keep the 2026-09-29 run where something that read then is walled now.** Run after 1b's re-run ends. Under 1c, run it after 1c, reading `rerun-jev-targets-2026-10.tsv` and writing `rerun-keep-0929-2026-10.tsv`. The 2026-09-29 run each published brief rests on is the `out_dir` in `jev-targets-2026-09-29.tsv`, looked up by candidate. It is not always the new folder's parent: FL-GOV's runs are in `reingest-2026-09-29/`, and its parent folder holds the older 09-27 run.

```bash
B=docs/general-election/brief-runs
tail -n +2 "$B/refresh-targets-2026-10.tsv" | while IFS=$'\t' read -r race cid name site out; do
  d="$B/$out"
  old="$B/$(awk -F'\t' -v c="$cid" '$2==c{print $5}' "$B/jev-targets-2026-09-29.tsv")/passages.jsonl"
  [ -s "$old" ] || continue   # nothing read on 2026-09-29, so nothing to keep
  walled=$(grep -oE '(bot challenge did not clear in the browser|rendered, but only [0-9]{1,2} characters of text): [^ ]+' "$d/ingest.log" 2>/dev/null |
    sed -E 's/^.*: //' | sort -u |
    while read -r url; do grep -qF "\"url\":\"$url\"" "$old" && echo "$url"; done | paste -sd' ' -)
  code=$(awk -F'\t' '$1=="exit"{print $2}' "$d/meta.tsv" 2>/dev/null)
  if [ -n "$walled" ]; then
    printf '%s\t%s\t%s\tkeep\t%s\n' "$race" "$cid" "$name" "$walled"
  elif [ "$code" != "0" ]; then
    printf '%s\t%s\t%s\task\texit %s: see %s/ingest.log\n' "$race" "$cid" "$name" "$code" "$out"
  fi
done > "$B/refresh-keep-0929-2026-10.tsv"
```

- **`keep`:** a whole site, or one page, that gave passages on 2026-09-29 is walled now, after its one re-run. That candidate's plan entry points at the 2026-09-29 run (in `plans-2026-10-refresh.ts`, take their `out_dir` from `jev-targets-2026-09-29.tsv` instead), and Step 2.1 does not compare them: their passage set is the 09-29 one, so their reviewed claims stay. This is the case that would otherwise drop verified quotes, as it would have for Rodriguez if his `/issues` page had been in his 09-29 run.
- **`ask`:** the site read on 2026-09-29 and failed now some other way (a timeout, a certificate error, a 404, an expired domain). Put it in the Step 2 summary for the founder. A timeout is a failed fetch like a wall (keep 2026-09-29); a site that is gone may be a real change (record silence, or take the race to Path C).
- A page walled now that was **not** read on 2026-09-29 changes nothing: the 09-29 run never had its passages.
- Under the flip: `keep` candidates get `"run": null` with the wall as the reason (a walled site), or keep the refreshed run as it is (a walled page).

**Checked on 2026-10-04** in a scratch copy: the real `jev-targets-2026-09-29.tsv` and 2026-09-29 `passages.jsonl` files, the 1a `awk`, and simulated refresh logs. The results were:
- `keep` for a walled page that read on 09-29 (Scott's affordable-housing case study), a walled site that read on 09-29 (Frost), and a walled FL-GOV site (Jewett, whose 09-29 run is in `reingest-2026-09-29/`);
- `ask` for a timeout on a site that read on 09-29 (Groves);
- nothing for a walled page not in the 09-29 run (Rodriguez `/issues`), Rendon's 200-character page, a walled site with no 09-29 passages (Taddeo), and every benign run.

Under 1c, the 1c `awk` gave the five `rerun-2026-10/` folders, and a walled Rodriguez homepage gave `keep`. A first draft looked for the 09-29 run in the new folder's parent, which missed Jewett. The lookup above replaced it.

## Step 2: review and build (Gate 2)

1. **Which runs changed.** First take out every `keep` line in `refresh-keep-0929-2026-10.tsv` (Step 1d): those candidates keep their 2026-09-29 run and are not compared. For every other candidate, compare the passages that clear both gates and match an issue (id, text, issues) in the new `run.json` with the 2026-09-30 run.
   - Where the set is identical, the 2026-09-30 review stands.
   - Where it differs, run Step 3 again: one reviewer subagent per run on `FL-GOV/profiler-review-prompt.md`, unchanged.
   - Jev's scores move by a few hundredths between runs, so expect some passages near 0.85 to flip.
2. **Withheld passages.** The founder's standing rule from 2026-09-30 (the middle path) applies to every new check-3 flag. Withhold a passage only when it is a past record with no commitment, and keep forward-looking wording with the reviewer's note.
   - Write `withheld-2026-10.json`: the 09-30 list plus the new entries.
   - `scripts/brief-rows-sql.ts` refuses to build if an entry no longer names a policy passage in its run. Drop any such entry with a note: that passage is no longer emitted anyway.
3. **Plans.** Copy `plans-2026-10-03.ts` to `plans-2026-10-refresh.ts`, changing only its inputs:
   - a fresh roster `SELECT`;
   - `refresh-targets-2026-10.tsv` (or `rerun-jev-targets-2026-10.tsv` under 1c) for the run folders;
   - a re-run of a copy of `spine-analysis-2026-10-03.ts`.

   In that copy, read the silence reason from the "Result" cell only, as `plans-2026-10-03.ts` does. The 10-03 analysis mislabelled five walls as robots.txt (`../listed-races-2026-10-04.md`, "How this was produced").

   The rules don't change: the spine by office, `word_count_pct = 150`, and a race with no claim stays `listed`. Plans go to `<RACE>/refresh-2026-10/plan.json`, FL-GOV included, never over an applied `plan.json`.
4. **`brief.sql`.** Build it from each plan with `scripts/brief-rows-sql.ts`, unchanged.
5. **Local reference.** Build a PGlite database from:
   - every repo migration;
   - the live roster;
   - the briefs live today: FL-GOV's `rebuild-2026-09-29/brief.sql` and the 35 `<RACE>/brief.sql`;
   - then the refreshed `brief.sql` files.

   Compute the five hashes per race with the query in `apply-fingerprint-35.sql`, widened to every race that has a refreshed brief (FL-GOV and any newly briefed listed race included).
6. **Triage.** Run the same query live (a `SELECT`) and compare:
   - **identical:** nothing to apply;
   - **a listed race gets its first claim:** Path A;
   - **a published race's hashes differ:** Path B1 or B2 (decision 7b);
   - **a published race is left with no claim:** Path C.
7. **Audit preview.** Run `balance_audit_core` at `word_count_pct = 150` on each changed race's reference profiles.
8. **Summary.** Write `refresh-2026-10.md`: per race, the counts, every claim added or removed (quoted), the path, and the audit preview; every `keep` candidate with the walled site or page; every `ask` line with the log excerpt; then the one question for Gate 3.

## Step 3: the founder's yes (Gate 3)

"Apply and publish the refresh for all N changed races, or a named set?" Ask 7a and 7b here too, if they were not answered at Gate 0.

## Step 4: apply, verify, publish (Gate 4), in the order of `apply-2026-10-04.md`

For every race in the yes set, the five steps of 2026-10-04 in their order:
1. Apply `brief.sql`.
2. Check the live fingerprints against the local reference: **0 mismatches**, or stop.
3. Run `balance_audit_core(profiles, thresholds={"word_count_pct": 150})` on the live profiles (copy `audit-2026-10-04.py` with the date changed). Write the result back in one `UPDATE`, in FL-GOV's shape:
   - `balance_check_passed = true`;
   - `flag_reason` and `flagged_at` on the candidates at the minimum of the first flag raised;
   - `null` on everyone else.
4. Read back as `anon`.
5. Run `set_race_publication(race_id, 'published', 'founder', reason)`, with a reason that cites the founder's answer, the counts, the audit and the file.

**Path A: a listed race gets its first brief (for example FL-CFO, if Taddeo reads).** Exactly 2026-10-04:
- A read shows 0 claims, positions, issues and profiles for the race.
- `brief.sql` goes in without its three `DELETE`s (no-ops), split mechanically at statement boundaries into MCP calls of at most about 17 KB, each its own transaction.
  - The 2026-10-04 splitter is not in the repo. Write it again: split at `;` outside single-quoted strings and `$$` blocks, in file order.
  - Before any call goes live, check locally that the pieces reproduce the reference. The live fingerprint proves it again afterwards.
- Every call is scanned for invisible characters (send U+200B as `chr(8203) || …`).
- Then steps 2 to 5. The race is `listed` throughout, so no reader sees a half-built brief.

**Path B: a published race whose brief changed (FL-14, FL-22 and FL-27 would be among them if Beltran, Dandiya or Rodriguez read).** Its three `DELETE`s now remove real rows. Through the MCP, a `DELETE` hung until the 60-second timeout on 2026-10-04, even as a no-op (`apply-2026-10-04.md`).
- **Correction to the handoff.** Taking the race to `listed` hides it, but it does not remove its old rows. Without the deletes, old claims would sit next to the new ones once it is published again. The deletes are needed on both paths below. Only the session that runs them changes.
- **B1 (recommended, pending founder confirmation):**
  1. The founder runs the race's whole `brief.sql` in a non-MCP session: the Supabase dashboard SQL editor, or `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f <RACE>/refresh-2026-10/brief.sql`. The connection string goes in the environment, never in a file.
  2. The file is one transaction (`BEGIN` … `COMMIT`), so readers see the old brief until it commits. The profile upsert then replaces `audit`, and the race is dark (it renders the roster) until the write-back in step 3. That is the same window as FL-GOV on 2026-09-30, about 13 minutes.
  3. The agent runs steps 2 to 4 through the MCP straight after. The race stays `published`, so step 5 is skipped, as on 2026-09-30.
  4. Do every B1 race in one sitting.
- **B2:**
  1. `set_race_publication(race_id, 'listed', 'founder', 'refresh rebuild')`.
  2. The founder runs only the deletes, in the SQL editor:

     ```sql
     BEGIN;
     DELETE FROM claim    WHERE race_id = '<RACE>-general';  -- claim_source cascades
     DELETE FROM position WHERE race_id = '<RACE>-general';
     DELETE FROM issue    WHERE race_id = '<RACE>-general';
     COMMIT;
     ```

  3. The rest runs as Path A, then publish.
  4. The roster-only window is longer: from step 1 to the publish, plus up to 3600 s of a cached roster page afterwards.
- **While dark or listed, the page shows the roster.** What the cards say depends on the path (`listingCardLine` in `src/lib/listing-copy.ts`, once `RaceListing.tsx` passes the race's status to it):
  - **B1 (dark, still `published`):** "Brief in review — …", which is true while the brief is rebuilt.
  - **B2 (taken to `listed`):** with `LISTED_IS_FINAL = true`, "No brief for this race. … we have not found one here", which is not true of a race whose brief is being rebuilt. That is one more reason B1 is recommended. Under B2, keep the window short and do every B2 race in one sitting.
  - The same holds for a correction takedown in the freeze (`set_race_publication(…, 'listed', …)`): the cards read "No brief for this race" until the race is published again.
- **Unverified hypothesis about the hang.** The MCP's `execute_sql` tool describes itself as "Destructive statements may require the user to confirm before they run". A `DELETE` waiting for an approval that nobody gives in an unattended session would look exactly like the 60-second hang. This was not tested, because this session may not run a `DELETE`. If it holds, an attended session where the founder approves the prompt is a third way.

**Path C: a published race that is left with no claim.** Run `set_race_publication(race_id, 'listed', 'founder', reason)`. The rows can stay, because `anon` cannot read them at `listed`.

**After the last race:**
1. **Fingerprints.** Save the hashes to `apply-fingerprints-2026-10-1x.json`, and write `apply-2026-10-1x.md` in the shape of `apply-2026-10-04.md`, with the `admin_action` ids.
2. **The snapshot date.** Set `BRIEF_SNAPSHOT_DATE` in `src/app/(public)/methodology/page.tsx` to the UTC date Step 1a started. That is the one constant behind every "as of" line on that page, and its comment says to update it on a refresh. Do this only if every published race was either re-applied or found identical in triage. Otherwise, leave it and add the exception below.
3. **The exception.** If any candidate kept a 2026-09-29 run (7a, a walled site or a walled page alike), or any race kept its 2026-09-29 brief (the cut-off), the page's "We read the candidates' sites on …" sentence must name them. For example: "…on October 8, 2026 (September 29 for <names>, whose sites, or a page of them, we could not read again)."
4. **Deploy.** Ship the constant through the usual PR to `main`.
5. **Live pages.** Request each changed race twice after the page cache expires (3600 s), and record a quote and the "No stated position found" count per race, as `apply-2026-10-04.md` does under "Live pages".

## The freeze (10-18 to 11-03)

Corrections only, each with the founder's yes and the Step 4 checks for the races it touches.

**What is a correction:**
- a quote that does not match its source byte for byte;
- a passage attributed to the wrong candidate or race;
- a roster fact that changed: a withdrawal, a death, or a court-ordered ballot change;
- a link that now points somewhere hacked, as Colucci's did.

**What is not:**
- new or changed content on a candidate's site;
- a campaign asking to add positions.

Either kind of request is recorded in a dated file.

**Fastest safe response:** `set_race_publication(race_id, 'listed', …)` takes a brief down at once and keeps the roster. It is one `SELECT` through the same door, with no `DELETE`. While it is down, its cards read "No brief for this race" (Step 4, Path B).

## Cost and effort, from 2026-09-29 and 2026-10-04

- **Fetch:** 97 sites took 7 minutes, six at a time.
- **Jev:** Step 2 cost about $0.64 (15.2M input tokens), plus about 480 small link judgements.
- **Reviews:** one subagent per changed run (90 on 2026-09-30).
- **Apply:** 38 MCP calls took 35 new briefs on 2026-10-04. This time only changed races go in, and each published one needs the founder for B1 or B2.

## Rollback

As in `apply-2026-10-04.md`:
- **Per race:** `set_race_publication(race_id, 'listed', 'founder', reason)` takes it down at once.
- **To restore a race's 2026-09-29 brief:** re-apply `<RACE>/brief.sql` by Path B, then check it against `apply-fingerprints-2026-10-04.json`. For FL-GOV, re-apply `FL-GOV/rebuild-2026-09-29/brief.sql` and check it against its `apply-2026-09-30.md` hashes.
- **Sources stay:** the `source` table is shared across races.
