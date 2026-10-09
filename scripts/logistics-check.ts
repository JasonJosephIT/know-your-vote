/* R2's tool: the deterministic steps of the logistics checks (spec
   docs/superpowers/specs/2026-10-08-agent-retrofit-design.md §3.6). The
   agent reads the official date pages and writes observations.json; every
   other read, comparison and write is here.

     context              the ballot roster (published and listed races) and
                          the general_2026 dates to read; prints context.json.
                          Writes nothing.
     sites                fetch each candidate's official_site homepage; prints
                          sites.json; stamps candidate.site_last_verified_at
                          for `live` sites only.
     check                observations.json on stdin; read the DoE extract and
                          the four VoterFocus lists; print the plan. Writes
                          nothing.
     queue [--dry-run]    check again, then insert each new diff as a pending
                          review_item (source agent:R2) and stamp
                          race.info_last_verified_at on confirmed races.

   Nothing here changes a voter-facing value: a status change or a date
   correction is a review item an operator decides in /admin, and the two
   stamps are read only by the admin monitor. Every value a step compares
   against, and every candidate it fetches or stamps, is read from the
   database by that step, never from a file the agent can write. Fail-closed:
   an error exits non-zero before any write. */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "./env-local.ts";
import { isAllowedByRobots } from "../src/lib/candidate-site.ts";
import { coveredCounty } from "../src/lib/counties.ts";
import { ACTIVE_ELECTION } from "../src/lib/election.ts";
import { loadBallotRoster, USER_AGENT, type BallotRosterCandidate } from "../src/lib/news-intake.ts";
import {
  GOVERNOR_RACE_ID,
  R2_SOURCE,
  DOE_EXTRACT_URL,
  buildCheck,
  canDetailUrl,
  classifySite,
  doeExtractForm,
  doeOfficeGroup,
  eventKey,
  parseDoeExtract,
  parseObservations,
  parseVoterFocus,
  planR2Queue,
  reviewItemKey,
  robotsText,
  runningMateOnPage,
  siteHost,
  voterFocusListUrl,
  type CheckResult,
  type DoeOfficeGroup,
  type DoeStatusRow,
  type ElectionEventRow,
  type Observations,
  type SiteOutcome,
  type SiteResponse,
  type VoterFocusRow,
} from "../src/lib/logistics-check.ts";

loadEnvLocal(import.meta.url);

const [command, ...args] = process.argv.slice(2);
const log = (line: string) => console.error(line);

function die(message: string): never {
  console.error(`logistics-check: ${message}`);
  process.exit(1);
}

/** Parse this command's arguments against an allow-list and refuse anything
    else: a typo such as `--dryrun` must stop the run, never fall back to the
    writing path. */
function flags(bare: string[]): Set<string> {
  const unknown = args.filter((a) => !bare.includes(a));
  if (unknown.length > 0) die(`${command}: unknown argument(s) ${unknown.join(" ")}`);
  return new Set(args);
}

function database(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) die("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  return createClient(url, key);
}

async function stdinObservations(): Promise<Observations> {
  const text = await new Promise<string>((resolve, reject) => {
    let buf = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (c) => (buf += c));
    process.stdin.on("end", () => resolve(buf));
    process.stdin.on("error", reject);
  });
  if (!text.trim()) die("nothing on stdin: write observations.json first");
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (err) {
    die(`observations.json is not valid JSON: ${String(err)}`);
  }
  const parsed = parseObservations(raw);
  if (!parsed.ok) die(`run refused, nothing read or written: ${parsed.error}`);
  return parsed.value;
}

async function roster(db: SupabaseClient): Promise<BallotRosterCandidate[]> {
  const rows = await loadBallotRoster(db).catch((err: Error) => die(err.message));
  if (rows.length === 0) die("the ballot roster is empty; refusing to call every status confirmed");
  return rows;
}

async function events(db: SupabaseClient): Promise<(ElectionEventRow & { verified: boolean })[]> {
  const { data, error } = await db
    .from("election_event")
    .select("election, event_type, county_fips, event_date, details_url, verified_by")
    .eq("election", ACTIVE_ELECTION);
  if (error) die(`could not read election_event: ${error.message}`);
  const rows = (data ?? []) as (ElectionEventRow & { verified_by: string | null })[];
  if (rows.length === 0) die(`no ${ACTIVE_ELECTION} election_event rows`);
  return rows
    .map((r) => ({
      election: r.election,
      event_type: r.event_type,
      county_fips: r.county_fips,
      event_date: r.event_date,
      details_url: r.details_url,
      verified: r.verified_by !== null,
    }))
    .sort((a, b) => eventKey(a).localeCompare(eventKey(b)));
}

/** The governor candidates' stored running mates, or column false while
    candidate.running_mate does not exist (roster-completeness 0049). */
async function storedRunningMates(
  db: SupabaseClient,
  people: readonly BallotRosterCandidate[],
): Promise<{ column: boolean; stored: Record<string, string | null> }> {
  const ids = people.filter((c) => c.raceId === GOVERNOR_RACE_ID).map((c) => c.candidateId);
  if (ids.length === 0) return { column: true, stored: {} };
  const { data, error } = await db.from("candidate").select("candidate_id, running_mate").in("candidate_id", ids);
  if (error) {
    if (error.code === "42703") return { column: false, stored: {} };
    die(`could not read running mates: ${error.message}`);
  }
  const stored: Record<string, string | null> = {};
  for (const r of (data ?? []) as { candidate_id: string; running_mate: string | null }[]) {
    stored[r.candidate_id] = r.running_mate;
  }
  return { column: true, stored };
}

/** One GET with our user agent, or null. Never throws. */
async function get(url: string, accept: string, timeoutMs = 20_000): Promise<SiteResponse | null> {
  try {
    const res = await fetch(url, {
      headers: { "user-agent": USER_AGENT, accept },
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
    });
    return { status: res.status, finalUrl: res.url || url, body: await res.text() };
  } catch {
    return null;
  }
}

/** The DoE extract for one office group, reduced to four columns at once.
    null, logged, when it cannot be read. */
async function doeRows(group: DoeOfficeGroup): Promise<DoeStatusRow[] | null> {
  try {
    const res = await fetch(DOE_EXTRACT_URL, {
      method: "POST",
      headers: { "user-agent": USER_AGENT, "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(doeExtractForm(group)).toString(),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
      log(`  DoE ${group}: HTTP ${res.status}`);
      return null;
    }
    const rows = parseDoeExtract(await res.text());
    if (rows === null) log(`  DoE ${group}: the answer is not the candidate extract`);
    return rows;
  } catch (err) {
    log(`  DoE ${group}: ${(err as Error).name}`);
    return null;
  }
}

/** Everything `check` and `queue` compare, read fresh from the database and
    the two official sources. One request at a time per host: the DoE
    extract and the canDetail pages share one host, the four VoterFocus
    lists another. */
async function runCheck(db: SupabaseClient, observations: Observations): Promise<CheckResult> {
  const people = await roster(db);
  const dates = await events(db);
  const mates = await storedRunningMates(db, people);
  const groups = [
    ...new Set(
      people
        .filter((c) => c.candidateId.startsWith("FL-DOE-"))
        .map((c) => doeOfficeGroup(c.level))
        .filter((g): g is DoeOfficeGroup => g !== null),
    ),
  ].sort();
  const counties = [
    ...new Set(
      people
        .filter((c) => c.candidateId.startsWith("FL-VF-") && c.countyFips !== null)
        .map((c) => c.countyFips as string),
    ),
  ].sort();

  const doe: Partial<Record<DoeOfficeGroup, DoeStatusRow[] | null>> = {};
  const pages: Record<string, string | null | undefined> = {};
  const doeChain = (async () => {
    for (const g of groups) doe[g] = await doeRows(g);
    if (!mates.column) return;
    for (const c of people.filter((p) => p.raceId === GOVERNOR_RACE_ID)) {
      const res = await get(canDetailUrl(c.candidateId.slice("FL-DOE-".length)), "text/html");
      pages[c.candidateId] = res && res.status === 200 ? runningMateOnPage(res.body) : undefined;
    }
  })();
  const voterFocus: Record<string, VoterFocusRow[] | null> = {};
  const vfChain = (async () => {
    for (const fips of counties) {
      const county = coveredCounty(fips);
      if (!county) continue;
      const res = await get(voterFocusListUrl(county.voterFocusSlug), "text/html");
      voterFocus[fips] = res && res.status === 200 ? parseVoterFocus(res.body) : null;
      if (voterFocus[fips] === null) log(`  VoterFocus ${county.name}: ${res ? `HTTP ${res.status}` : "no response"}`);
    }
  })();
  await Promise.all([doeChain, vfChain]);

  return buildCheck({
    roster: people,
    events: dates,
    observations,
    doe,
    voterFocus,
    runningMates: { column: mates.column, stored: mates.stored, pages },
    now: new Date(),
  });
}

function summaryLine(r: Extract<CheckResult, { ok: true }>): string {
  return (
    `statuses read ${r.statuses.read} of ${r.statuses.roster} (${r.statuses.doe} DoE, ${r.statuses.voterFocus} VoterFocus), ` +
    `${r.statuses.changed} changed; dates observed ${r.dates.observed} of ${r.dates.events}, ${r.dates.changed} changed, ` +
    `${r.dates.unreadablePages} page(s) unreadable; ${r.confirmedRaces.length} race(s) confirmed; ${r.report.length} report line(s)`
  );
}

/* ---- sites --------------------------------------------------------------- */

/* `sites` must end inside its wrapper timeout (540 s, a minute under the Bash
   tool's ceiling). No new fetch starts after this; a site not reached is
   `unchecked`, "time budget reached". */
const SITES_SOFT_LIMIT_MS = 420_000;
const SITES_HOSTS_AT_ONCE = 6;

interface SiteResult {
  candidate_id: string;
  name: string;
  race_id: string;
  url: string;
  outcome: SiteOutcome;
  detail: string;
  final_url: string | null;
  robots_note: string | null;
}

async function checkSites(people: readonly BallotRosterCandidate[], started: number): Promise<SiteResult[]> {
  const targets = people.filter((c) => c.officialSite);
  const byHost = new Map<string, BallotRosterCandidate[]>();
  for (const c of targets) {
    const host = siteHost(c.officialSite as string) ?? `invalid:${c.candidateId}`;
    byHost.set(host, [...(byHost.get(host) ?? []), c]);
  }
  const hosts = [...byHost.keys()];
  const results: SiteResult[] = [];
  const base = (c: BallotRosterCandidate) => ({
    candidate_id: c.candidateId,
    name: c.legalName,
    race_id: c.raceId,
    url: c.officialSite as string,
  });
  const late = () => Date.now() - started > SITES_SOFT_LIMIT_MS;
  let next = 0;
  async function worker() {
    while (next < hosts.length) {
      const host = hosts[next++];
      const group = byHost.get(host) ?? [];
      if (host.startsWith("invalid:")) {
        for (const c of group) {
          results.push({ ...base(c), outcome: "dead", detail: "official_site is not a URL", final_url: null, robots_note: null });
        }
        continue;
      }
      if (late()) {
        for (const c of group) {
          results.push({ ...base(c), outcome: "unchecked", detail: "time budget reached", final_url: null, robots_note: null });
        }
        continue;
      }
      const robots = robotsText(await get(new URL("/robots.txt", group[0].officialSite as string).toString(), "text/plain"));
      for (const c of group) {
        if (late()) {
          results.push({ ...base(c), outcome: "unchecked", detail: "time budget reached", final_url: null, robots_note: robots.note });
          continue;
        }
        if (!isAllowedByRobots(robots.text, c.officialSite as string)) {
          results.push({ ...base(c), outcome: "robots", detail: "robots.txt disallows our agent or Anthropic's", final_url: null, robots_note: robots.note });
          continue;
        }
        const res = await get(c.officialSite as string, "text/html,application/xhtml+xml");
        const verdict = classifySite(c.officialSite as string, res);
        results.push({ ...base(c), ...verdict, final_url: res?.finalUrl ?? null, robots_note: robots.note });
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(SITES_HOSTS_AT_ONCE, hosts.length) }, () => worker()));
  const order = new Map(targets.map((c, i) => [`${c.candidateId}|${c.raceId}`, i]));
  return results.sort((a, b) => (order.get(`${a.candidate_id}|${a.race_id}`) ?? 0) - (order.get(`${b.candidate_id}|${b.race_id}`) ?? 0));
}

/* ---- commands ------------------------------------------------------------ */

if (command === "context") {
  flags([]);
  const db = database();
  const people = await roster(db);
  const dates = await events(db);
  const mates = await storedRunningMates(db, people);
  /* The pages to read, each with the rows it backs. No stored date: the
     agent reads the page blind and `check` compares. */
  const pages = [...new Set(dates.map((e) => e.details_url))].map((url) => ({
    url,
    events: dates
      .filter((e) => e.details_url === url)
      .map((e) => ({ election: e.election, event_type: e.event_type, county_fips: e.county_fips })),
  }));
  const out = {
    candidates: people.map((c) => ({
      candidate_id: c.candidateId,
      name: c.legalName,
      race_id: c.raceId,
      office: c.office,
      level: c.level,
      county_fips: c.countyFips,
      county: c.countyFips ? (coveredCounty(c.countyFips)?.name ?? null) : null,
      publication: c.publication,
      qualifying_status: c.qualifyingStatus,
      official_site: c.officialSite,
    })),
    events: dates.map((e) => ({
      election: e.election,
      event_type: e.event_type,
      county_fips: e.county_fips,
      county: e.county_fips ? (coveredCounty(e.county_fips)?.name ?? e.county_fips) : "statewide",
      details_url: e.details_url,
      verified: e.verified,
    })),
    pages,
    running_mates: mates.column ? "compared" : "not compared: candidate.running_mate does not exist yet",
  };
  const published = people.filter((c) => c.publication === "published").length;
  log(
    `context: ${people.length} ballot candidate(s) (${published} in published races, ${people.length - published} in listed), ` +
      `${dates.length} ${ACTIVE_ELECTION} date(s) on ${pages.length} page(s); running mates ${out.running_mates}`,
  );
  console.log(JSON.stringify(out, null, 1));
} else if (command === "sites") {
  flags([]);
  const started = Date.now();
  const db = database();
  const people = await roster(db);
  const results = await checkSites(people, started);
  const live = [...new Set(results.filter((r) => r.outcome === "live").map((r) => r.candidate_id))];
  if (live.length > 0) {
    /* Only this column changes, so the content freeze lets it through by name
       (ballot-content-completion BC9). */
    const { error } = await db
      .from("candidate")
      .update({ site_last_verified_at: new Date().toISOString() })
      .in("candidate_id", live);
    if (error) die(`could not stamp site_last_verified_at: ${error.message}`);
  }
  const counts: Record<string, number> = {};
  for (const r of results) counts[r.outcome] = (counts[r.outcome] ?? 0) + 1;
  const noSite = people.length - results.length;
  log(
    `sites: ${results.length} checked of ${people.length} (${noSite} with no official_site): ` +
      ["live", "challenge", "moved", "parked", "dead", "robots", "unchecked"].map((o) => `${o} ${counts[o] ?? 0}`).join(", ") +
      `; stamped site_last_verified_at on ${live.length}`,
  );
  console.log(JSON.stringify({ counts, no_site: noSite, stamped: live.length, sites: results }, null, 1));
} else if (command === "check") {
  flags([]);
  const observations = await stdinObservations();
  const db = database();
  const result = await runCheck(db, observations);
  if (!result.ok) die(`run refused, nothing written: ${result.error}`);
  log(`check: ${summaryLine(result)}`);
  console.log(JSON.stringify(result, null, 1));
} else if (command === "queue") {
  const dryRun = flags(["--dry-run"]).has("--dry-run");
  const observations = await stdinObservations();
  const db = database();
  const result = await runCheck(db, observations);
  if (!result.ok) die(`run refused, nothing written: ${result.error}`);
  const { data, error } = await db
    .from("review_item")
    .select("kind, payload")
    .eq("source", R2_SOURCE)
    .in("kind", ["gated_diff", "date_mismatch"]);
  if (error) die(`could not read R2's earlier review items: ${error.message}`);
  const existing = new Set(
    ((data ?? []) as { kind: string; payload: unknown }[])
      .map((r) => reviewItemKey(r.kind, r.payload))
      .filter((k): k is string => k !== null),
  );
  const plan = planR2Queue(result.diffs, existing);
  if (!plan.ok) die(`batch refused, nothing written:\n  ${plan.errors.join("\n  ")}`);
  const byKind = (k: string) => plan.rows.filter((r) => r.kind === k).length;
  const counts = `gated_diff ${byKind("gated_diff")}, date_mismatch ${byKind("date_mismatch")}`;
  if (dryRun) {
    log(
      `queue-dry: ${summaryLine(result)}. Would queue ${plan.rows.length} (${counts}), skip ${plan.skipped.length} ` +
        `already queued or decided, and stamp info_last_verified_at on ${result.confirmedRaces.length} race(s)`,
    );
    console.log(JSON.stringify({ rows: plan.rows, skipped: plan.skipped, confirmed_races: result.confirmedRaces, report: result.report }, null, 1));
  } else {
    if (plan.rows.length > 0) {
      const { error: insertError } = await db.from("review_item").insert(plan.rows);
      if (insertError) die(`could not queue: ${insertError.message}`);
    }
    if (result.confirmedRaces.length > 0) {
      /* Only this column changes, so the content freeze lets it through by
         name (ballot-content-completion BC9). */
      const { error: stampError } = await db
        .from("race")
        .update({ info_last_verified_at: new Date().toISOString() })
        .in("race_id", result.confirmedRaces);
      if (stampError) die(`queued ${plan.rows.length}, but could not stamp info_last_verified_at: ${stampError.message}`);
    }
    log(
      `queue: ${summaryLine(result)}. Queued ${plan.rows.length} pending (${counts}), skipped ${plan.skipped.length} ` +
        `already queued or decided; stamped info_last_verified_at on ${result.confirmedRaces.length} race(s). ` +
        "Nothing is voter-facing until approved in /admin.",
    );
    console.log(JSON.stringify({ queued: plan.rows.length, skipped: plan.skipped, confirmed_races: result.confirmedRaces, report: result.report }, null, 1));
  }
} else {
  die("usage: logistics-check.ts context | sites | check < observations.json | queue [--dry-run] < observations.json");
}
