/* Guardrail for R4's digest (spec
   docs/superpowers/specs/2026-10-08-agent-retrofit-design.md §3.7, §6): the
   backlog by kind and source, the oldest pending age, the three-times flag
   over `named` rows only, the stuck-run rule, the missed-sweep rule against
   vercel.json schedules `0 11 * * 1,4` and `0 11 * * *`, published races with
   no pipeline_event, and a due reminder with a log row, without one and with
   no subscriber. Then scripts/ops-digest.ts itself: its source holds no write
   call and never selects an address, and run against a fake PostgREST server
   it sends only GET and HEAD, writes no file, refuses an unknown argument and
   fails closed on a read error.

   Offline. The fake server is in this process, so the script runs with an
   async spawn; its env names the fake server and a fake key, and
   process.loadEnvFile never replaces a variable already present, so a
   .env.local cannot point it anywhere else.

   Run: node scripts/verify-ops-digest.ts */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BUDGETS, TASK_AGENTS, type TaskRun } from "../src/lib/agent-budget.ts";
import type { ElectionEvent } from "../src/lib/notifications/election-events.ts";
import {
  COVERAGE_MIN,
  COVERAGE_RATIO,
  DIGEST_AGENTS,
  DIGEST_TASKS,
  ELECTION,
  ELECTION_KIND,
  REMINDER_SEND_HOUR_UTC,
  SWEEP_ROUTE,
  WATCHDOG_TASK,
  ballotTier,
  buildDigest,
  clean,
  cronScheduleFor,
  feedSummary,
  logisticsSummary,
  namedCoverage,
  newestReports,
  parseCron,
  pipelineState,
  readTaskRuns,
  refreshHeartbeat,
  reminderCheck,
  reviewQueue,
  runsSection,
  stuckAgentRun,
  stuckTaskRun,
  sweepFires,
  type AgentRunRow,
  type CandidateRow,
  type CronSchedule,
  type DigestInput,
  type NewsRow,
  type PublicationRow,
  type RaceRow,
  type ReviewRow,
} from "../src/lib/ops-digest.ts";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

let failures = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) return;
  failures++;
  console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
}
const j = (v: unknown) => JSON.stringify(v);

/* Monday 2026-10-12, 08:00 in Florida: R4's weekly slot. */
const NOW = new Date("2026-10-12T12:00:00.000Z");
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const ago = (ms: number) => new Date(NOW.getTime() - ms).toISOString();

/* ---- constants agree with the files they copy -------------------------- */

{
  const election = read("src/lib/election.ts");
  check("ELECTION is src/lib/election.ts's ACTIVE_ELECTION", election.includes(`export const ACTIVE_ELECTION = "${ELECTION}" as const;`));
  check("ELECTION_KIND is src/lib/election.ts's ACTIVE_ELECTION_KIND",
    election.includes(`export const ACTIVE_ELECTION_KIND: ElectionKind = "${ELECTION_KIND}";`));
  for (const [task, agent] of Object.entries(TASK_AGENTS)) {
    check(`the digest reads ${task} as ${agent}, as the watchdog does`,
      DIGEST_AGENTS.some((a) => a.agent === agent && a.task === task) && DIGEST_TASKS[task] === agent);
  }
  check("the digest reads the watchdog's task on the watch budget", DIGEST_TASKS[WATCHDOG_TASK] === "watch");
  const consoleSrc = read("src/components/admin/AgentsConsole.tsx");
  for (const { agent, label } of DIGEST_AGENTS.filter((a) => a.agent !== "watch")) {
    check(`the digest labels ${agent} "${label}" as the console does`, consoleSrc.includes(`{ id: "${agent}", role: "${label}", `));
  }
  const vercel = JSON.parse(read("vercel.json")) as unknown;
  const sweep = cronScheduleFor(vercel, SWEEP_ROUTE);
  check("vercel.json's news-sweep schedule parses", typeof sweep === "string" && !("error" in parseCron(sweep)), j(sweep));
  check(`vercel.json still sends reminders at ${REMINDER_SEND_HOUR_UTC}:00 UTC`,
    cronScheduleFor(vercel, "/api/cron/send-reminders") === `0 ${REMINDER_SEND_HOUR_UTC} * * *`);
}

/* ---- clean ------------------------------------------------------------- */

check("clean strips control characters and angle brackets", clean("a\x1b[2K <script>b</script>\nc") === "a [2K ‹script›b‹/script› c",
  clean("a\x1b[2K <script>b</script>\nc"));
check("clean cuts to its limit", clean("x".repeat(50), 10) === `${"x".repeat(9)}…`);

/* ---- 2. review queue: backlog by kind and source, oldest age ----------- */

const rv = (id: string, kind: string, source: string, status: string, created: number, decided: number | null = null, applyError: string | null = null): ReviewRow => ({
  id,
  kind,
  source,
  status,
  created_at: ago(created),
  decided_at: decided === null ? null : ago(decided),
  apply_error: applyError,
});
const REVIEW: ReviewRow[] = [
  rv("a1", "manual_news", "agent:R1", "pending", 4 * DAY),
  rv("a2", "manual_news", "agent:R1", "pending", 1 * DAY),
  rv("a3", "manual_news", "agent:R1", "pending", 2 * HOUR),
  rv("a4", "manual_news", "operator", "pending", 6 * DAY),
  rv("a5", "candidate_lead", "agent:R5", "pending", 3 * HOUR),
  rv("a6", "candidate_lead", "agent:R5", "pending", 5 * HOUR),
  rv("a7", "gated_diff", "agent:R2", "pending", 20 * HOUR, null, "freeze: <refused>"),
  rv("a8", "manual_news", "agent:R1", "approved", 5 * DAY, 2 * DAY),
  rv("a9", "manual_news", "agent:R1", "rejected", 12 * DAY, 10 * DAY),
  rv("a10", "candidate_lead", "agent:R5", "rejected", 20 * DAY, 1 * DAY),
];
{
  const q = reviewQueue(REVIEW, NOW);
  check("pending total", q.pending_total === 7, String(q.pending_total));
  check("pending by kind and source", j(q.pending) === j([
    { kind: "candidate_lead", source: "agent:R5", count: 2 },
    { kind: "gated_diff", source: "agent:R2", count: 1 },
    { kind: "manual_news", source: "agent:R1", count: 3 },
    { kind: "manual_news", source: "operator", count: 1 },
  ]), j(q.pending));
  check("the oldest pending item per kind, with its age", j(q.oldest_pending) === j([
    { kind: "candidate_lead", created_at: ago(5 * HOUR), age: "5 h" },
    { kind: "gated_diff", created_at: ago(20 * HOUR), age: "20 h" },
    { kind: "manual_news", created_at: ago(6 * DAY), age: "6 days" },
  ]), j(q.oldest_pending));
  check("decided in the last 7 days, by kind, source and outcome", j(q.decided_7d) === j([
    { kind: "candidate_lead", source: "agent:R5", status: "rejected", count: 1 },
    { kind: "manual_news", source: "agent:R1", status: "approved", count: 1 },
  ]), j(q.decided_7d));
  check("pending items with an apply_error, cleaned", q.apply_errors.length === 1 && q.apply_errors[0].id === "a7" &&
    q.apply_errors[0].apply_error === "freeze: ‹refused›", j(q.apply_errors));
}

/* ---- 5. the three-times flag, over `named` rows only ------------------- */

const cand = (id: string, name: string, party: string | null, stamp: string | null = null): CandidateRow => ({
  candidate_id: id,
  legal_name: name,
  party,
  ballot_status: "ballot",
  site_last_verified_at: stamp,
});
const CANDIDATES: CandidateRow[] = [
  cand("c-gov-d", "Dana Diaz", "DEM", "2026-09-21T00:00:00+00:00"),
  cand("c-gov-r", "Rae Ruiz", "REP", "2026-09-25T00:00:00+00:00"),
  cand("c-gov-n", "Nia North", "NPA"),
  cand("c-ag-d", "Al Dunn", "DEM", "2026-09-22T00:00:00+00:00"),
  cand("c-ag-r", "Bo Reyes", "REP", "2026-09-22T00:00:00+00:00"),
  cand("c-cc-a", "Ann Able", "", "2026-09-23T00:00:00+00:00"),
  cand("c-cc-b", "Ben Baker", "", "2026-09-23T00:00:00+00:00"),
  cand("c-cfo-r", "Cy Rowe", "REP", "2026-09-23T00:00:00+00:00"),
  { ...cand("c-gov-w", "Withdrawn Person", "DEM"), ballot_status: "withdrawn" },
];
const RACES: RaceRow[] = [
  { race_id: "FL-GOV-general", office: "Governor", candidate_ids: ["c-gov-d", "c-gov-r", "c-gov-n", "c-gov-w"], info_last_verified_at: null },
  { race_id: "FL-AG-general", office: "Attorney General", candidate_ids: ["c-ag-r", "c-ag-d"], info_last_verified_at: ago(2 * DAY) },
  { race_id: "FL-DAD-CC2-general", office: "County Commission District 2", candidate_ids: ["c-cc-b", "c-cc-a"], info_last_verified_at: null },
  { race_id: "FL-CFO-general", office: "Chief Financial Officer", candidate_ids: ["c-cfo-r"], info_last_verified_at: null },
  { race_id: "FL-DRAFT-general", office: "Commissioner of Agriculture", candidate_ids: [], info_last_verified_at: null },
];
const PUBS: PublicationRow[] = [
  { race_id: "FL-GOV-general", status: "published", published_at: ago(10 * DAY) },
  { race_id: "FL-AG-general", status: "published", published_at: ago(27 * HOUR) },
  { race_id: "FL-DAD-CC2-general", status: "listed", published_at: null },
  { race_id: "FL-CFO-general", status: "published", published_at: ago(25 * HOUR) },
  { race_id: "FL-DRAFT-general", status: "draft", published_at: null },
  { race_id: "FL-OLD-primary", status: "published", published_at: null },
];
const news = (id: string, over: Partial<NewsRow>): NewsRow => ({
  id,
  item_type: "candidate_news",
  race_id: null,
  candidate_id: null,
  metro: null,
  county_fips: null,
  relation: null,
  source_id: "src",
  published_at: ago(2 * DAY),
  ...over,
});
const named = (id: string, candidate: string, n: number, relation = "named", age = 2 * DAY) =>
  Array.from({ length: n }, (_, i) => news(`${id}-${i}`, { candidate_id: candidate, relation, published_at: ago(age) }));
const RECENT: NewsRow[] = [
  ...named("g", "c-gov-r", 3),
  ...named("gd", "c-gov-d", 1),
  ...named("gdr", "c-gov-d", 9, "related"),
  ...named("old", "c-gov-n", 4, "named", 40 * DAY),
  ...named("ag", "c-ag-d", 2),
  ...named("cc", "c-cc-a", 6),
  ...named("ccb", "c-cc-b", 2),
  ...named("cfo", "c-cfo-r", 5),
  news("e1", { item_type: "election_news", county_fips: "12086" }),
  news("e2", { item_type: "election_news", county_fips: "12086" }),
  news("e3", { item_type: "election_news" }),
  news("e4", { item_type: "election_news", metro: "tampa", source_id: null }),
  news("e5", { item_type: "election_news", county_fips: "12095", published_at: ago(31 * DAY) }),
  news("p1", { item_type: "pipeline_event", race_id: "FL-GOV-general", source_id: null }),
];
const TIER = ballotTier(RACES, PUBS, CANDIDATES);
{
  check("the ballot tier is the published and listed races, in office order",
    j(TIER.map((t) => t.race_id)) === j(["FL-GOV-general", "FL-AG-general", "FL-CFO-general", "FL-DAD-CC2-general"]), j(TIER.map((t) => t.race_id)));
  check("a tier race lists its ballot candidates in ballot order, without the withdrawn one",
    j(TIER[0].candidates.map((c) => c.candidate_id)) === j(["c-gov-r", "c-gov-d", "c-gov-n"]), j(TIER[0].candidates.map((c) => c.candidate_id)));
  const cov = namedCoverage(TIER, RECENT, NOW);
  const gov = cov.find((c) => c.race_id === "FL-GOV-general");
  check("named counts per candidate, in ballot order; related and older rows never count",
    j(gov?.candidates.map((c) => c.named)) === j([3, 1, 0]), j(gov?.candidates));
  check(`a race is flagged at ${COVERAGE_RATIO} times another and at least ${COVERAGE_MIN} stories`, gov?.flagged === true);
  check("2 against 0 is under the floor and not flagged", cov.find((c) => c.race_id === "FL-AG-general")?.flagged === false);
  check("6 against 2 is flagged", cov.find((c) => c.race_id === "FL-DAD-CC2-general")?.flagged === true);
  check("a one-candidate race is never compared", !cov.some((c) => c.race_id === "FL-CFO-general"));
  const withRelated = namedCoverage(TIER, [...RECENT, ...named("gdr2", "c-gov-n", 20, "related")], NOW);
  check("piling up related rows never clears or raises a flag",
    j(withRelated.find((c) => c.race_id === "FL-GOV-general")?.candidates.map((c) => c.named)) === j([3, 1, 0]));
  const evened = namedCoverage(TIER, [...RECENT, ...named("gd2", "c-gov-d", 1), ...named("gn2", "c-gov-n", 2)], NOW);
  check("3 against 2 and 2 is not flagged", evened.find((c) => c.race_id === "FL-GOV-general")?.flagged === false);
}

/* ---- 5. the rest of the feed ------------------------------------------- */

{
  const sourceless = [news("s1", { item_type: "election_news", source_id: null, published_at: ago(90 * DAY) }),
    news("s2", { item_type: "official_link", source_id: null })];
  const feed = feedSummary(RECENT, sourceless, TIER, NOW);
  check("rows by item_type over 30 days, zeros included",
    j(feed.by_type_30d) === j({ candidate_news: 28, election_news: 4, official_link: 0, pipeline_event: 1 }), j(feed.by_type_30d));
  check("election_news by scope: each covered county, statewide, then legacy metros",
    j(feed.election_by_scope_30d.map((s) => [s.scope, s.count])) ===
      j([["county:12086", 2], ["county:12011", 0], ["county:12057", 0], ["county:12095", 0], ["statewide", 1], ["metro:tampa", 1]]),
    j(feed.election_by_scope_30d));
  check("scope labels name the county", feed.election_by_scope_30d[0].label === "Miami-Dade County");
  check("sourceless counts agent rows of any age, never official_link", j(feed.sourceless) === j({ count: 1, ids: ["s1"] }), j(feed.sourceless));
}

/* ---- 1. the stuck-run rule --------------------------------------------- */

{
  const r3 = (startedAgo: number, status = "running"): AgentRunRow =>
    ({ agent: "R3", started_at: ago(startedAgo), finished_at: null, status, items_written: null, summary: null });
  const twice = 2 * BUDGETS.R3.wallClockMin * MIN;
  check("an R3 run is stuck at twice its 40 min budget", stuckAgentRun(r3(twice), NOW));
  check("and not a second before", !stuckAgentRun(r3(twice - 1000), NOW));
  check("a finished run is never stuck", !stuckAgentRun(r3(10 * twice, "ok"), NOW));
  check("an R1 row is never stuck (the cron writes at the end)",
    !stuckAgentRun({ ...r3(10 * twice), agent: "R1" }, NOW));
  const task = (task_id: string, startedAgo: number, status = "running"): TaskRun =>
    ({ task_id, session_id: `s-${task_id}-${startedAgo}`, status, started_at: ago(startedAgo), last_activity_at: null });
  check("the watchdog's own run is stuck at twice its 5 min budget", stuckTaskRun(task(WATCHDOG_TASK, 10 * MIN), NOW));
  check("and not before", !stuckTaskRun(task(WATCHDOG_TASK, 10 * MIN - 1000), NOW));
  check("R5's routine run is stuck at 90 min", stuckTaskRun(task("cap-r5-candidate-leads", 90 * MIN), NOW));
  check("a succeeded run is never stuck", !stuckTaskRun(task("cap-r5-candidate-leads", 900 * MIN, "succeeded"), NOW));
  check("a task R4 does not know is never stuck", !stuckTaskRun(task("cap-r1-candidate-news", 900 * MIN), NOW));
  const runs = runsSection(
    [r3(twice + MIN), { ...r3(3 * DAY, "ok"), finished_at: ago(3 * DAY - MIN), summary: "line one\nline <two>" }],
    [{ name: "2026-10-08-R3.md", path: "/r/2026-10-08-R3.md" }],
    [task("cap-r3-election-news", 3 * HOUR), task("cap-r3-election-news", 7 * DAY, "succeeded"),
      task("cap-r3-election-news", 14 * DAY, "succeeded"), task("cap-r3-election-news", 21 * DAY, "failed")],
    NOW,
  );
  const r3entry = runs.find((r) => r.agent === "R3");
  check("runs lists R1, R2 to R5 and the watchdog", j(runs.map((r) => r.agent)) === j(["R1", "R2", "R3", "R4", "R5", "watch"]));
  check("R3's newest agent_run row is the running one, and it is stuck",
    r3entry?.newest_run?.status === "running" && r3entry.stuck_runs.length === 1, j(r3entry));
  check("the routine's last three runs, newest first, the running one stuck",
    j(r3entry?.task_runs.map((t) => [t.status, t.stuck])) === j([["running", true], ["succeeded", false], ["succeeded", false]]), j(r3entry?.task_runs));
  check("R3's newest report", r3entry?.newest_report?.name === "2026-10-08-R3.md");
}

/* ---- 1. task-runs.json and the newest reports -------------------------- */

{
  check("an empty task-runs.json is a problem line", readTaskRuns("  ").problems[0] === "task-runs.json is empty");
  check("a task-runs.json that is not JSON is a problem line", readTaskRuns("{").problems[0] === "task-runs.json is not valid JSON");
  check("a task-runs.json that is not an array is a problem line", /must be a JSON array/.test(readTaskRuns("{}").problems[0] ?? ""));
  const mixed = readTaskRuns(j([{ task_id: "cap-r4-ops-digest", session_id: "a\nb", status: "running", started_at: ago(HOUR) },
    { task_id: "cap-r4-ops-digest", session_id: "ok1", status: "succeeded", started_at: ago(7 * DAY), last_activity_at: null }]));
  check("a bad row is skipped and named by index; the good row is kept",
    mixed.runs.length === 1 && /skipped run 0: session_id/.test(mixed.problems[0] ?? ""), j(mixed));
  const newest = newestReports(["2026-07-06-R2.md", "2026-09-14-R2.md", "2026-07-02-R2-DRYRUN.md", "2026-07-03-R1-DRYRUN.md",
    "2026-07-03-R1.md", "CAP_Ops_Digest_latest.html", "notes.md"].map((name) => ({ name, path: `/r/${name}` })));
  check("the newest report is by the date in its name", newest.get("R2")?.name === "2026-09-14-R2.md");
  check("on one date a real run beats a dry run", newest.get("R1")?.name === "2026-07-03-R1.md" && newest.get("R1")?.dry_run === false);
  check("other files are ignored", newest.size === 2, j([...newest.keys()]));
}

/* ---- 3. the missed-sweep rule against vercel.json ---------------------- */

{
  const schedule = (expr: string) => {
    const s = cronScheduleFor({ crons: [{ path: "/api/cron/refresh-news", schedule: "0 10 * * *" }, { path: SWEEP_ROUTE, schedule: expr }] }, SWEEP_ROUTE);
    const parsed = typeof s === "string" ? parseCron(s) : s;
    if ("error" in parsed) throw new Error(parsed.error);
    return parsed as CronSchedule;
  };
  const r1 = (at: string, status = "ok"): AgentRunRow =>
    ({ agent: "R1", started_at: at, finished_at: at, status, items_written: status === "failed" ? null : 4, summary: "swept" });
  const rows = [r1("2026-10-05T11:00:20.000Z"), r1("2026-10-08T11:03:00.000Z", "failed")];
  const first = new Date("2026-10-05T11:00:20.000Z");
  const twiceWeekly = sweepFires(schedule("0 11 * * 1,4"), rows, first, NOW);
  check("0 11 * * 1,4: four fires in 14 days, judged against the R1 rows",
    j(twiceWeekly.map((f) => [f.at.slice(0, 10), f.status])) ===
      j([["2026-10-01", "before_logging"], ["2026-10-05", "ran"], ["2026-10-08", "failed"], ["2026-10-12", "waiting"]]), j(twiceWeekly));
  const daily = sweepFires(schedule("0 11 * * *"), rows, first, NOW);
  check("0 11 * * *: fourteen fires; a day with no R1 row after logging began is missed",
    daily.length === 14 && j(daily.filter((f) => f.status === "missed").map((f) => f.at.slice(0, 10))) ===
      j(["2026-10-06", "2026-10-07", "2026-10-09", "2026-10-10", "2026-10-11"]), j(daily));
  check("a fire is waiting until its 6 hours are over", daily[daily.length - 1].status === "waiting");
  check("with no R1 row ever, nothing is called missed",
    sweepFires(schedule("0 11 * * *"), [], null, NOW).every((f) => f.status === "before_logging" || f.status === "waiting"));
  const late = sweepFires(schedule("0 11 * * 1,4"), [r1("2026-10-05T10:52:00.000Z"), r1("2026-10-08T18:00:00.000Z")], first, NOW);
  check("a row 8 minutes early counts; a row 7 hours late does not",
    late[1].status === "ran" && late[2].status === "missed", j(late));
  for (const bad of ["*/5 * * * *", "0 11 1 * *", "0 11 * * MON", "0 24 * * *", "0 11 * *"]) {
    check(`parseCron refuses "${bad}"`, "error" in parseCron(bad));
  }
  const wk = parseCron("30 6,18 * * 1-5,7");
  check("parseCron reads lists, ranges and 7 as Sunday",
    !("error" in wk) && j(wk.hours) === j([6, 18]) && j(wk.weekdays) === j([0, 1, 2, 3, 4, 5]), j(wk));
  check("a vercel.json with no sweep entry says so", j(cronScheduleFor({ crons: [] }, SWEEP_ROUTE)) === j({ error: `vercel.json has no schedule for ${SWEEP_ROUTE}` }));
}

/* ---- 3. refresh-news: published races with no pipeline_event ----------- */

{
  const hb = refreshHeartbeat([{ race_id: "FL-GOV-general", published_at: ago(10 * DAY) }], PUBS, NOW);
  check("the newest pipeline_event", hb.newest_pipeline_event === ago(10 * DAY));
  check("only a published race past 26 hours with no event is listed",
    j(hb.unannounced) === j([{ race_id: "FL-AG-general", published_at: ago(27 * HOUR) }]), j(hb.unannounced));
}

/* ---- 3. reminders: with a log row, without one, with no subscriber ----- */

const ev = (id: string, event_type: ElectionEvent["event_type"], event_date: string, county_fips: string | null = null): ElectionEvent =>
  ({ id, event_type, election: "general_2026", county_fips, event_date, rule: null, details_url: "https://dos.fl.gov/elections/" });
const EVENTS: ElectionEvent[] = [
  ev("e-reg", "registration_deadline", "2026-10-12"),
  ev("e-vbm", "vbm_request_deadline", "2026-10-08"),
  ev("e-ev-dad", "early_voting_start", "2026-10-09", "12086"),
  ev("e-ev-bro", "early_voting_start", "2026-10-09", "12011"),
  ev("e-day", "election_day", "2026-11-03"),
];
const SUBS = [
  { zip5: "33101", consent_at: "2026-10-01T15:00:00.000Z" },
  { zip5: "32801", consent_at: "2026-10-10T20:00:00.000Z" },
];
const ZIPS = new Map([["33101", "12086"], ["32801", "12095"]]);
{
  const rem = reminderCheck(EVENTS, [{ dedupe_key: "general_2026:registration_deadline:T-7:email", sent_at: "2026-10-05T14:00:05Z", recipient_count: 2 }],
    SUBS, ZIPS, NOW);
  const status = Object.fromEntries(rem.due.map((d) => [d.dedupe_key, [d.day, d.status, d.subscribers]]));
  check("a due reminder with a log row is sent",
    j(status["general_2026:registration_deadline:T-7:email"]) === j(["2026-10-05", "sent", 1]), j(status));
  check("a due reminder with a subscriber in scope and no log row is missed; a later signup is not owed it",
    j(status["general_2026:vbm_request_deadline:T-1:email"]) === j(["2026-10-07", "missed", 1]), j(status));
  check("a county reminder goes to that county's subscribers only",
    j(status["general_2026:early_voting_start:T-0:email:12086"]) === j(["2026-10-09", "missed", 1]), j(status));
  check("a due reminder whose scope has no subscriber is expected to have no row",
    j(status["general_2026:early_voting_start:T-0:email:12011"]) === j(["2026-10-09", "no_subscriber", 0]), j(status));
  check("a statewide reminder reaches a subscriber in a county with no dates of its own",
    j(status["general_2026:registration_deadline:T-1:email"]) === j(["2026-10-11", "missed", 2]), j(status));
  check("only the 7 days before today are judged", rem.due.every((d) => d.day >= "2026-10-05" && d.day <= "2026-10-11") && rem.due.length === 5,
    j(rem.due.map((d) => d.day)));
  check("the next reminder", j(rem.next) === j({ day: "2026-11-03", dedupe_key: "general_2026:election_day:T-0:email", template_id: "election_day" }), j(rem.next));
  check("active subscriptions are a count", rem.active_subscriptions === 2);
}

/* ---- 6, 7: logistics and pipeline state -------------------------------- */

{
  const lg = logisticsSummary(TIER, EVENTS, new Set(["e-reg", "e-vbm", "e-ev-dad", "e-day"]), 0);
  check("tier candidates are counted once each", lg.tier_candidates === 8, String(lg.tier_candidates));
  check("site stamps: oldest, newest, never",
    j(lg.site_verified) === j({ oldest: "2026-09-21T00:00:00+00:00", newest: "2026-09-25T00:00:00+00:00", never: 1 }), j(lg.site_verified));
  check("races with info_last_verified_at", j(lg.races) === j({ total: 4, info_verified: 1 }), j(lg.races));
  check("an election_event row not in the verified read is unverified",
    lg.election_events.filter((e) => !e.verified).map((e) => e.scope).join() === "Broward County", j(lg.election_events));
  const ps = pipelineState(RACES, PUBS, [
    { candidate_id: "c-gov-r", race_id: "FL-GOV-general", audit: { balance_check_passed: true, flag_reason: "stated_position_asymmetry", flagged_at: ago(3 * DAY) } },
    { candidate_id: "c-gov-d", race_id: "FL-GOV-general", audit: { balance_check_passed: true, flag_reason: "scrutiny_halt", flagged_at: ago(20 * DAY) } },
    { candidate_id: "c-ag-d", race_id: "FL-AG-general", audit: { balance_check_passed: false } },
    { candidate_id: "c-ag-r", race_id: "FL-AG-general", audit: {} },
  ], NOW);
  check("races by publication status", j(ps.races_by_status) === j({ published: 3, listed: 1, in_review: 0, draft: 1, none: 0 }), j(ps.races_by_status));
  check("profiles by audit.balance_check_passed", j(ps.profiles_by_balance_check) === j({ true: 2, false: 1, missing: 1 }));
  check("profiles flagged in the last 14 days, with their reason",
    j(ps.flagged_14d.map((f) => [f.candidate_id, f.flag_reason])) === j([["c-gov-r", "stated_position_asymmetry"]]), j(ps.flagged_14d));
}

/* ---- 9. open risks, from one whole digest ------------------------------ */

const base = (over: Partial<DigestInput> = {}): DigestInput => ({
  date: "2026-10-12",
  outputs: { latest: "/p/CAP_Ops_Digest_latest.html", latest_exists: true, monthly: "/p/CAP_Ops_Digest_2026-10.html", monthly_exists: false },
  vercel: { crons: [{ path: SWEEP_ROUTE, schedule: "0 11 * * 1,4" }] },
  taskRunsText: "[]",
  reports: [],
  agentRuns: ["2026-10-01T11:00:30Z", "2026-10-05T11:00:30Z", "2026-10-08T11:00:30Z"].map((at) =>
    ({ agent: "R1", started_at: at, finished_at: at, status: "ok", items_written: 3, summary: "ok" })),
  review: [],
  races: [],
  publications: [],
  candidates: [],
  profiles: [],
  recentNews: [],
  sourcelessNews: [],
  pipelineEvents: [],
  events: [],
  verifiedEvents: [],
  sendLog: [],
  subscriptions: [],
  zipCounty: new Map(),
  contactRows: 0,
  ...over,
});
{
  const quiet = buildDigest(base(), NOW);
  check("a healthy system has no open risk", quiet.open_risks.length === 0, j(quiet.open_risks));
  check("digest.json carries the outputs R4 writes to", quiet.outputs.monthly_exists === false && quiet.date === "2026-10-12");

  const loud = buildDigest(base({
    taskRunsText: j([{ task_id: "cap-r5-candidate-leads", session_id: "s1", status: "running", started_at: ago(2 * HOUR), last_activity_at: null }]),
    agentRuns: [
      { agent: "R1", started_at: "2026-10-05T11:00:30Z", finished_at: null, status: "ok", items_written: 3, summary: null },
      { agent: "R1", started_at: "2026-10-08T11:00:30Z", finished_at: null, status: "failed", items_written: null, summary: "error: boom" },
      { agent: "R2", started_at: ago(3 * HOUR), finished_at: null, status: "running", items_written: null, summary: null },
    ],
    review: REVIEW,
    races: RACES,
    publications: PUBS,
    candidates: CANDIDATES,
    recentNews: RECENT,
    sourcelessNews: [news("s1", { item_type: "election_news", source_id: null })],
    pipelineEvents: [{ race_id: "FL-GOV-general", published_at: ago(10 * DAY) }, { race_id: "FL-CFO-general", published_at: ago(25 * HOUR) }],
    events: EVENTS,
    verifiedEvents: EVENTS.filter((e) => e.id !== "e-ev-bro"),
    subscriptions: SUBS,
    zipCounty: ZIPS,
  }), NOW);
  const risks = loud.open_risks.join("\n");
  for (const [name, re] of [
    ["a stuck agent_run row", /Logistics checks \(R2\): the run started .* stop it in the app/],
    ["a stuck routine run", /Candidate leads \(cap-r5-candidate-leads\): running since .* stop it in the app/],
    ["a failed sweep", /News sweep: the run for 2026-10-08T11:00:00.000Z failed/],
    ["a race published with no pipeline_event", /Refresh-news: FL-AG-general was published/],
    ["a missed reminder", /Reminders: general_2026:vbm_request_deadline:T-1:email was due 2026-10-07/],
    ["a coverage flag, as counts in ballot order", /Coverage: in FL-GOV-general, named stories per candidate over 30 days are 3 \/ 1 \/ 0/],
    ["sourceless rows", /Feed: 1 candidate_news\/election_news row\(s\) have no source_id/],
    ["an apply_error", /Review queue: 1 pending item\(s\) carry an apply_error/],
    ["an unverified date", /Dates: 1 general_2026 election_event row\(s\) are not verified/],
  ] as const) {
    check(`open risks name ${name}`, re.test(risks), risks);
  }
  check("waiting on Jason: pending counts for the four kinds",
    j(loud.waiting_on_jason.pending) === j({ manual_news: 4, gated_diff: 1, date_mismatch: 0, candidate_lead: 2 }), j(loud.waiting_on_jason.pending));
  check("waiting on Jason lists the stuck runs", loud.waiting_on_jason.stuck.length === 2, j(loud.waiting_on_jason.stuck));
  check("R5: leads by status and queued in 14 days",
    j(loud.r5) === j({ by_status: { pending: 2, approved: 0, rejected: 1 }, queued_14d: 2 }), j(loud.r5));
  check("the sweep's queue volume per day, 14 days, zeros included",
    loud.crons.news_sweep.queued_by_day.length === 14 && loud.crons.news_sweep.queued_by_day.reduce((n, d) => n + d.queued, 0) === 5,
    j(loud.crons.news_sweep.queued_by_day));
  const none = buildDigest(base({ agentRuns: [] }), NOW);
  check("no R1 row ever is one risk line, not one per fire",
    none.open_risks.length === 1 && /no run is recorded in agent_run yet/.test(none.open_risks[0]), j(none.open_risks));
  const badCron = buildDigest(base({ vercel: { crons: [{ path: SWEEP_ROUTE, schedule: "*/30 * * * *" }] } }), NOW);
  check("an unreadable sweep schedule is a risk line", badCron.open_risks.some((r) => r.startsWith("News sweep: unsupported schedule")), j(badCron.open_risks));
}

if (failures > 0) {
  console.error(`\nverify-ops-digest: ${failures} failure(s)`);
  process.exit(1);
}
console.log("verify-ops-digest: OK");
