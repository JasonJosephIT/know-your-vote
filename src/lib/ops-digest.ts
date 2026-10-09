/* R4's digest rules (spec
   docs/superpowers/specs/2026-10-08-agent-retrofit-design.md §3.7): what
   digest.json counts, flags and lists. scripts/ops-digest.ts does the
   SELECTs and file reads and hands the rows to buildDigest; every rule that
   decides a number or a flag is here, pure, with the clock passed in, so
   scripts/verify-ops-digest.ts drives it with fixtures.

   Relative imports with the .ts extension, and only modules plain Node can
   load: agent-budget.ts and ballot-order.ts import nothing, counties.ts and
   notifications/schedule.ts import types only. */

import { BUDGETS, TASK_AGENTS, heldUntil, parseTaskRuns, type BudgetAgent, type TaskRun } from "./agent-budget.ts";
import { orderCandidates, orderRaces } from "./ballot-order.ts";
import { COVERED_COUNTIES } from "./counties.ts";
import type { ElectionEvent } from "./notifications/election-events.ts";
import {
  countiesWithOwnDates,
  dueRemindersByScope,
  easternToday,
  isoDaysBefore,
  nextReminder,
} from "./notifications/schedule.ts";

/* ---- constants ---------------------------------------------------------- */

/* race.election and election_event.election for the cycle the guide serves.
   Copies of ACTIVE_ELECTION_KIND and ACTIVE_ELECTION in src/lib/election.ts,
   which imports through the @/ alias that plain Node and the scripts' strict
   tsc run cannot resolve. scripts/verify-ops-digest.ts checks they match. */
export const ELECTION_KIND = "general";
export const ELECTION = "general_2026";

export const SWEEP_ROUTE = "/api/cron/news-sweep";
/* Spec §3.7 item 3: flagged when no R1 row is recorded within 6 hours of a
   scheduled fire. A row up to 10 minutes before the fire still counts, for
   clock skew between Vercel and the database. */
export const SWEEP_GRACE_HOURS = 6;
export const SWEEP_EARLY_MINUTES = 10;
export const SWEEP_WINDOW_DAYS = 14;
/* A published race with no pipeline_event row this long after publishing
   means the daily refresh-news cron (0 10 * * *) has not run since. */
export const HEARTBEAT_HOURS = 26;
export const REMINDER_WINDOW_DAYS = 7;
/* vercel.json runs /api/cron/send-reminders at 0 14 * * * (UTC);
   scripts/verify-ops-digest.ts checks the file still says so. A subscriber
   who signed up after that day's send was not owed it. */
export const REMINDER_SEND_HOUR_UTC = 14;
export const FEED_WINDOW_DAYS = 30;
export const DECIDED_WINDOW_DAYS = 7;
export const FLAG_WINDOW_DAYS = 14;
export const LEAD_WINDOW_DAYS = 14;
/* The symmetric-coverage flag: one candidate in a race has at least three
   times another's `named` stories, and at least COVERAGE_MIN of them, so a
   single story against none is not an alarm. */
export const COVERAGE_RATIO = 3;
export const COVERAGE_MIN = 3;
/* list_task_runs limit, per task (spec §3.7 item 1: "the routine's last
   three runs"). */
export const TASK_RUNS_PER_TASK = 3;
/* Spec §3.7 item 8. */
export const WAITING_KINDS = ["manual_news", "gated_diff", "date_mismatch", "candidate_lead"] as const;
export const NEWS_ITEM_TYPES = ["candidate_news", "election_news", "official_link", "pipeline_event"] as const;
export const AGENT_NEWS_TYPES = ["candidate_news", "election_news"] as const;

export const WATCHDOG_TASK = "cap-rw-watchdog";

export type DigestAgent = "R1" | "R2" | "R3" | "R4" | "R5" | "watch";

/* Spec §3.7 item 1: R1 (the sweep), R2 to R5 and the watchdog, with the
   console's labels (src/components/admin/AgentsConsole.tsx). R1 is a Vercel
   cron, not a routine, so it has no task. The R2 to R5 task ids are
   TASK_AGENTS's, which scripts/verify-ops-digest.ts checks. */
export const DIGEST_AGENTS: readonly { agent: DigestAgent; label: string; task: string | null }[] = [
  { agent: "R1", label: "News sweep (cron)", task: null },
  { agent: "R2", label: "Logistics checks", task: "cap-r2-contact-refresher" },
  { agent: "R3", label: "Election notices", task: "cap-r3-election-news" },
  { agent: "R4", label: "Ops digest", task: "cap-r4-ops-digest" },
  { agent: "R5", label: "Candidate leads", task: "cap-r5-candidate-leads" },
  { agent: "watch", label: "Watchdog", task: WATCHDOG_TASK },
];

/** The scheduled-task ids R4 reads with list_task_runs, and whose budget each runs on. */
export const DIGEST_TASKS: Readonly<Record<string, BudgetAgent>> = { ...TASK_AGENTS, [WATCHDOG_TASK]: "watch" };

/* Run reports: YYYY-MM-DD-R<n>.md, or -DRYRUN.md for a dry run. The date in
   the name is the run's; file times are not, since the July reports were
   copied on 2026-09-07. */
export const REPORT_FILE = /^(\d{4}-\d{2}-\d{2})-(R[1-5])(-DRYRUN)?\.md$/;

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/* ---- row shapes (what scripts/ops-digest.ts selects) -------------------- */

export interface AgentRunRow {
  agent: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  items_written: number | null;
  summary: string | null;
}
export interface ReviewRow {
  id: string;
  kind: string;
  source: string;
  status: string;
  created_at: string;
  decided_at: string | null;
  apply_error: string | null;
}
export interface RaceRow {
  race_id: string;
  office: string;
  candidate_ids: string[] | null;
  info_last_verified_at: string | null;
}
export interface PublicationRow {
  race_id: string;
  status: string;
  published_at: string | null;
}
export interface CandidateRow {
  candidate_id: string;
  legal_name: string;
  party: string | null;
  ballot_status: string | null;
  site_last_verified_at: string | null;
}
export interface ProfileRow {
  candidate_id: string;
  race_id: string;
  audit: unknown;
}
export interface NewsRow {
  id: string;
  item_type: string;
  race_id: string | null;
  candidate_id: string | null;
  metro: string | null;
  county_fips: string | null;
  relation: string | null;
  source_id: string | null;
  published_at: string;
}
export interface PipelineEventRow {
  race_id: string | null;
  published_at: string;
}
export interface SendLogRow {
  dedupe_key: string;
  sent_at: string;
  recipient_count: number | null;
}
/** An active subscription: its ZIP and when it was made. Never the address. */
export interface SubscriptionRow {
  zip5: string;
  consent_at: string;
}
export interface ReportFile {
  name: string;
  path: string;
}

/* ---- small helpers ------------------------------------------------------ */

const byText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const time = (iso: string | null | undefined) => (iso ? Date.parse(iso) : Number.NaN);

/** DB and report text bound for a page R4 writes by hand: one line, no
    control characters, no angle brackets (so nothing can open a tag even if
    R4 forgets to escape), at most `max` characters. */
export function clean(text: string | null | undefined, max = 200): string {
  const one = (text ?? "")
    .replace(/[\x00-\x1F\x7F-\x9F]+/g, " ")
    .replace(/</g, "‹")
    .replace(/>/g, "›")
    .replace(/\s+/g, " ")
    .trim();
  return one.length > max ? `${one.slice(0, max - 1)}…` : one;
}

/** "5 h" under two days, else "3 days". */
export function formatAge(ms: number): string {
  const hours = Math.max(0, Math.floor(ms / HOUR));
  return hours >= 48 ? `${Math.floor(hours / 24)} days` : `${hours} h`;
}

export function countyLabel(fips: string): string {
  const county = COVERED_COUNTIES.find((c) => c.fips === fips);
  return county ? `${county.name} County` : `county ${fips}`;
}

/** Counts of rows by a key tuple, sorted by the key. */
function tally<T>(rows: readonly T[], key: (row: T) => string[]): { key: string[]; count: number }[] {
  const seen = new Map<string, { key: string[]; count: number }>();
  for (const row of rows) {
    const k = key(row);
    const id = JSON.stringify(k);
    const entry = seen.get(id);
    if (entry) entry.count++;
    else seen.set(id, { key: k, count: 1 });
  }
  return [...seen.values()].sort((a, b) => byText(JSON.stringify(a.key), JSON.stringify(b.key)));
}

/* ---- 1. runs ------------------------------------------------------------ */

function isBudgetAgent(agent: string): agent is BudgetAgent {
  return agent in BUDGETS;
}

/** An agent_run row still `running` at twice its agent's wall clock. R1's
    rows are written at the end of a run, so they are never `running`. */
export function stuckAgentRun(row: AgentRunRow, now: Date): boolean {
  if (row.status !== "running" || !isBudgetAgent(row.agent)) return false;
  const started = time(row.started_at);
  return !Number.isNaN(started) && now.getTime() >= heldUntil(row.agent, new Date(started)).getTime();
}

/** A routine run list_task_runs reports `running` at twice its budget: "stuck:
    stop it in the app" (spec §3.7 item 1). The same rule as the watchdog's
    isStuck, over R4's task list, which adds the watchdog itself. */
export function stuckTaskRun(run: TaskRun, now: Date): boolean {
  const agent = DIGEST_TASKS[run.task_id];
  if (!agent || run.status !== "running") return false;
  return now.getTime() >= heldUntil(agent, new Date(time(run.started_at))).getTime();
}

/** R4 wrote task-runs.json from list_task_runs, so it is untrusted input,
    read with the watchdog's parser. A bad file is a digest line, not a
    failed digest. */
export function readTaskRuns(text: string): { runs: TaskRun[]; problems: string[] } {
  if (!text.trim()) return { runs: [], problems: ["task-runs.json is empty"] };
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { runs: [], problems: ["task-runs.json is not valid JSON"] };
  }
  const parsed = parseTaskRuns(raw);
  if (!parsed.ok) return { runs: [], problems: [`task-runs.json: ${parsed.error}`] };
  return { runs: parsed.runs, problems: parsed.skipped.map((s) => `task-runs.json: skipped ${s}`) };
}

/** Each agent's newest report: the latest date in the file name; on the
    same date a real run beats a dry run. */
export function newestReports(
  files: readonly ReportFile[],
): Map<string, { name: string; path: string; date: string; dry_run: boolean }> {
  const out = new Map<string, { name: string; path: string; date: string; dry_run: boolean }>();
  for (const f of files) {
    const m = REPORT_FILE.exec(f.name);
    if (!m) continue;
    const entry = { name: f.name, path: f.path, date: m[1], dry_run: m[3] !== undefined };
    const have = out.get(m[2]);
    if (!have || entry.date > have.date || (entry.date === have.date && have.dry_run && !entry.dry_run)) {
      out.set(m[2], entry);
    }
  }
  return out;
}

export interface RunsEntry {
  agent: DigestAgent;
  label: string;
  task: string | null;
  budget_min: number | null;
  newest_run: AgentRunRow | null;
  stuck_runs: string[];
  newest_report: { name: string; path: string; date: string; dry_run: boolean } | null;
  task_runs: { status: string; started_at: string; last_activity_at: string | null; stuck: boolean }[];
}

export function runsSection(
  agentRuns: readonly AgentRunRow[],
  reports: readonly ReportFile[],
  taskRuns: readonly TaskRun[],
  now: Date,
): RunsEntry[] {
  const newest = newestReports(reports);
  return DIGEST_AGENTS.map(({ agent, label, task }) => {
    const rows = agentRuns.filter((r) => r.agent === agent).sort((a, b) => time(b.started_at) - time(a.started_at));
    const top = rows[0];
    return {
      agent,
      label,
      task,
      budget_min: agent === "R1" ? null : BUDGETS[agent].wallClockMin,
      newest_run: top ? { ...top, summary: top.summary === null ? null : clean(top.summary, 300) } : null,
      stuck_runs: rows.filter((r) => stuckAgentRun(r, now)).map((r) => r.started_at),
      newest_report: agent === "watch" ? null : (newest.get(agent) ?? null),
      task_runs: taskRuns
        .filter((r) => task !== null && r.task_id === task)
        .sort((a, b) => time(b.started_at) - time(a.started_at))
        .slice(0, TASK_RUNS_PER_TASK)
        .map((r) => ({
          status: clean(r.status, 40),
          started_at: r.started_at,
          last_activity_at: r.last_activity_at,
          stuck: stuckTaskRun(r, now),
        })),
    };
  });
}

/* ---- 2. review queue ---------------------------------------------------- */

export interface ReviewQueue {
  pending_total: number;
  pending: { kind: string; source: string; count: number }[];
  oldest_pending: { kind: string; created_at: string; age: string }[];
  decided_7d: { kind: string; source: string; status: string; count: number }[];
  apply_errors: { id: string; kind: string; source: string; created_at: string; apply_error: string }[];
}

export function reviewQueue(rows: readonly ReviewRow[], now: Date): ReviewQueue {
  const pending = rows.filter((r) => r.status === "pending");
  const oldest = new Map<string, ReviewRow>();
  for (const r of pending) {
    const have = oldest.get(r.kind);
    if (!have || time(r.created_at) < time(have.created_at)) oldest.set(r.kind, r);
  }
  const since = now.getTime() - DECIDED_WINDOW_DAYS * DAY;
  const decided = rows.filter((r) => r.status !== "pending" && time(r.decided_at) >= since);
  return {
    pending_total: pending.length,
    pending: tally(pending, (r) => [r.kind, r.source]).map(({ key: [kind, source], count }) => ({ kind, source, count })),
    oldest_pending: [...oldest.values()]
      .sort((a, b) => byText(a.kind, b.kind))
      .map((r) => ({ kind: r.kind, created_at: r.created_at, age: formatAge(now.getTime() - time(r.created_at)) })),
    decided_7d: tally(decided, (r) => [r.kind, r.source, r.status]).map(({ key: [kind, source, status], count }) => ({
      kind,
      source,
      status,
      count,
    })),
    apply_errors: pending
      .filter((r) => r.apply_error !== null && r.apply_error.trim() !== "")
      .sort((a, b) => time(a.created_at) - time(b.created_at))
      .map((r) => ({ id: r.id, kind: r.kind, source: r.source, created_at: r.created_at, apply_error: clean(r.apply_error, 300) })),
  };
}

/* ---- 3. crons ----------------------------------------------------------- */

export interface CronSchedule {
  expr: string;
  minutes: number[];
  hours: number[];
  /** 0 = Sunday; null = every day. */
  weekdays: number[] | null;
}

/** The schedule of `route` in vercel.json, or why it cannot be read. */
export function cronScheduleFor(vercel: unknown, route: string): string | { error: string } {
  const crons = (vercel as { crons?: unknown } | null)?.crons;
  if (!Array.isArray(crons)) return { error: "vercel.json has no crons list" };
  const entry = crons.find((c) => typeof c === "object" && c !== null && (c as { path?: unknown }).path === route) as
    | { schedule?: unknown }
    | undefined;
  return typeof entry?.schedule === "string" ? entry.schedule : { error: `vercel.json has no schedule for ${route}` };
}

/** The cron forms Vercel's sweep schedule uses: minute and hour lists, every
    day of the month, every month, and every weekday or a weekday list (ranges
    allowed). Anything else is refused by name rather than misread. */
export function parseCron(expr: string): CronSchedule | { error: string } {
  const refused = {
    error: `unsupported schedule "${expr}": the digest reads minute and hour lists, every day of the month, every month and an optional weekday list`,
  };
  const fields = expr.trim().split(/\s+/);
  if (fields.length !== 5) return refused;
  const list = (field: string, max: number, ranges: boolean): number[] | null => {
    const out: number[] = [];
    for (const part of field.split(",")) {
      const m = /^(\d{1,2})(?:-(\d{1,2}))?$/.exec(part);
      if (!m || (m[2] !== undefined && !ranges)) return null;
      const from = Number(m[1]);
      const to = m[2] === undefined ? from : Number(m[2]);
      if (from > max || to > max || to < from) return null;
      for (let v = from; v <= to; v++) out.push(v);
    }
    return [...new Set(out)].sort((a, b) => a - b);
  };
  const minutes = list(fields[0], 59, false);
  const hours = list(fields[1], 23, false);
  if (!minutes || !hours || fields[2] !== "*" || fields[3] !== "*") return refused;
  let weekdays: number[] | null = null;
  if (fields[4] !== "*") {
    const days = list(fields[4], 7, true);
    if (!days) return refused;
    weekdays = [...new Set(days.map((d) => d % 7))].sort((a, b) => a - b);
  }
  return { expr, minutes, hours, weekdays };
}

/** Every fire of `s` (UTC, as Vercel runs crons) from `from` to `to`, inclusive. */
export function scheduledFires(s: CronSchedule, from: Date, to: Date): Date[] {
  const out: Date[] = [];
  const day = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  for (; day.getTime() <= to.getTime(); day.setUTCDate(day.getUTCDate() + 1)) {
    if (s.weekdays && !s.weekdays.includes(day.getUTCDay())) continue;
    for (const h of s.hours) {
      for (const m of s.minutes) {
        const t = day.getTime() + h * HOUR + m * MINUTE;
        if (t >= from.getTime() && t <= to.getTime()) out.push(new Date(t));
      }
    }
  }
  return out.sort((a, b) => a.getTime() - b.getTime());
}

export type FireStatus = "ran" | "failed" | "missed" | "waiting" | "before_logging";
export interface SweepFire {
  at: string;
  status: FireStatus;
  items: number | null;
}

/** Each scheduled sweep in the last 14 days against the R1 rows the cron
    wrote (spec §3.7 item 3). A fire is `ran` or `failed` when an R1 row
    started within 6 hours of it (10 minutes early allowed); `waiting` while
    those 6 hours are not over; `before_logging` when its 6 hours ended before
    the first R1 row ever recorded (or none is recorded at all), since the cron
    writes rows only from agents PR A on; `missed` otherwise. */
export function sweepFires(s: CronSchedule, r1Runs: readonly AgentRunRow[], firstR1At: Date | null, now: Date): SweepFire[] {
  const grace = SWEEP_GRACE_HOURS * HOUR;
  const early = SWEEP_EARLY_MINUTES * MINUTE;
  const runs = r1Runs
    .filter((r) => r.agent === "R1" && !Number.isNaN(time(r.started_at)))
    .sort((a, b) => time(a.started_at) - time(b.started_at));
  return scheduledFires(s, new Date(now.getTime() - SWEEP_WINDOW_DAYS * DAY), now).map((at) => {
    const t = at.getTime();
    const hit = runs.find((r) => time(r.started_at) >= t - early && time(r.started_at) <= t + grace);
    let status: FireStatus;
    if (hit) status = hit.status === "failed" ? "failed" : "ran";
    else if (now.getTime() < t + grace) status = "waiting";
    else if (firstR1At === null || t + grace < firstR1At.getTime()) status = "before_logging";
    else status = "missed";
    return { at: at.toISOString(), status, items: hit ? hit.items_written : null };
  });
}

/** review_item rows from `source` per Eastern calendar day, oldest first,
    zeros included: the sweep's queue volume (spec §3.7 item 3). */
export function queuedByDay(
  rows: readonly ReviewRow[],
  source: string,
  now: Date,
  days: number,
): { day: string; queued: number }[] {
  const today = easternToday(now);
  const out = Array.from({ length: days }, (_, i) => ({ day: isoDaysBefore(today, days - 1 - i), queued: 0 }));
  const index = new Map(out.map((d, i) => [d.day, i]));
  for (const r of rows) {
    if (r.source !== source || Number.isNaN(time(r.created_at))) continue;
    const i = index.get(easternToday(new Date(time(r.created_at))));
    if (i !== undefined) out[i].queued++;
  }
  return out;
}

/** The refresh-news heartbeat (spec §2.7, §3.7 item 3): the newest
    pipeline_event, and the published races that still have none more than 26
    hours after publishing. Expected empty; otherwise the daily cron has not
    run since. */
export function refreshHeartbeat(
  events: readonly PipelineEventRow[],
  publications: readonly PublicationRow[],
  now: Date,
): { newest_pipeline_event: string | null; unannounced: { race_id: string; published_at: string }[] } {
  const announced = new Set(events.map((e) => e.race_id));
  const newest = events.reduce<string | null>(
    (best, e) => (best === null || time(e.published_at) > time(best) ? e.published_at : best),
    null,
  );
  const cutoff = now.getTime() - HEARTBEAT_HOURS * HOUR;
  return {
    newest_pipeline_event: newest,
    unannounced: publications
      .filter((p) => p.status === "published" && !announced.has(p.race_id) && time(p.published_at) < cutoff)
      .map((p) => ({ race_id: p.race_id, published_at: p.published_at as string }))
      .sort((a, b) => byText(a.race_id, b.race_id)),
  };
}

export type ReminderStatus = "sent" | "no_subscriber" | "missed";
export interface ReminderDue {
  day: string;
  dedupe_key: string;
  template_id: string;
  scopes: string[];
  subscribers: number;
  status: ReminderStatus;
  recipients: number | null;
}

/** The reminders due on each of the 7 Eastern days before today, the way
    the cron computes them (dueRemindersByScope over every verified row),
    against notification_send_log. A due reminder with no log row is
    `no_subscriber` when nobody in its scopes had subscribed before that day's
    14:00 UTC send (the cron writes no row then, §2.7), and `missed`
    otherwise. Subscriber scope is the cron's: the ZIP's county when that
    county has dates of its own, else statewide. */
export function reminderCheck(
  events: readonly ElectionEvent[],
  sendLog: readonly SendLogRow[],
  subscriptions: readonly SubscriptionRow[],
  zipCounty: ReadonlyMap<string, string>,
  now: Date,
): {
  active_subscriptions: number;
  due: ReminderDue[];
  next: { day: string; dedupe_key: string; template_id: string } | null;
} {
  const list = [...events];
  const own = countiesWithOwnDates(list);
  const subs = subscriptions.map((s) => {
    const county = zipCounty.get(s.zip5) ?? null;
    return { scope: county && own.includes(county) ? county : null, since: time(s.consent_at) };
  });
  const sent = new Map(sendLog.map((l) => [l.dedupe_key, l]));
  const today = easternToday(now);
  const due: ReminderDue[] = [];
  for (let i = REMINDER_WINDOW_DAYS; i >= 1; i--) {
    const day = isoDaysBefore(today, i);
    const sendAt = Date.parse(`${day}T${String(REMINDER_SEND_HOUR_UTC).padStart(2, "0")}:00:00.000Z`);
    for (const { reminder, scopes } of dueRemindersByScope(list, day)) {
      const subscribers = subs.filter((s) => s.since < sendAt && scopes.includes(s.scope)).length;
      const row = sent.get(reminder.dedupe_key);
      due.push({
        day,
        dedupe_key: reminder.dedupe_key,
        template_id: reminder.template_id,
        scopes: scopes.map((s) => s ?? "statewide"),
        subscribers,
        status: row ? "sent" : subscribers === 0 ? "no_subscriber" : "missed",
        recipients: row ? row.recipient_count : null,
      });
    }
  }
  const next = nextReminder(list, today);
  return {
    active_subscriptions: subscriptions.length,
    due,
    next: next ? { day: next.day, dedupe_key: next.reminder.dedupe_key, template_id: next.reminder.template_id } : null,
  };
}

/* ---- 4. R5 -------------------------------------------------------------- */

export function leadSummary(rows: readonly ReviewRow[], now: Date): { by_status: Record<string, number>; queued_14d: number } {
  const leads = rows.filter((r) => r.kind === "candidate_lead");
  const byStatus: Record<string, number> = { pending: 0, approved: 0, rejected: 0 };
  for (const r of leads) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
  const since = now.getTime() - LEAD_WINDOW_DAYS * DAY;
  return { by_status: byStatus, queued_14d: leads.filter((r) => time(r.created_at) >= since).length };
}

/* ---- 5. feed ------------------------------------------------------------ */

/** Where an election_news row shows: a county, a legacy metro, a race or
    candidate, or statewide (the /news query's reading, src/lib/news-scope.ts). */
export function electionScope(r: NewsRow): string {
  if (r.county_fips) return `county:${r.county_fips.trim()}`;
  if (r.metro) return `metro:${r.metro}`;
  if (r.race_id || r.candidate_id) return "race";
  return "statewide";
}

export function scopeLabel(scope: string): string {
  if (scope === "statewide") return "Statewide";
  if (scope === "race") return "A race or candidate";
  if (scope.startsWith("county:")) return countyLabel(scope.slice("county:".length));
  return `Legacy metro: ${scope.slice("metro:".length)}`;
}

export interface TierRace {
  race_id: string;
  office: string;
  status: string;
  info_last_verified_at: string | null;
  candidates: CandidateRow[];
}

/** The ballot tier (spec D8): races of the guide's election that are
    published or listed, each with the candidates in its candidate_ids whose
    ballot_status is 'ballot', in ballot order (src/lib/ballot-order.ts);
    races in ballot order of their offices. 106 candidates in 53 races on
    2026-10-08. */
export function ballotTier(
  races: readonly RaceRow[],
  publications: readonly PublicationRow[],
  candidates: readonly CandidateRow[],
): TierRace[] {
  const status = new Map(publications.map((p) => [p.race_id, p.status]));
  const byId = new Map(candidates.map((c) => [c.candidate_id, c]));
  const tier = races
    .filter((r) => {
      const s = status.get(r.race_id);
      return s === "published" || s === "listed";
    })
    .map((r) => {
      const ids = r.candidate_ids ?? [];
      const onBallot = ids
        .map((id) => byId.get(id))
        .filter((c): c is CandidateRow => c !== undefined && c.ballot_status === "ballot");
      return {
        race_id: r.race_id,
        office: r.office,
        status: status.get(r.race_id) as string,
        info_last_verified_at: r.info_last_verified_at,
        candidates: orderCandidates(onBallot, ids),
      };
    });
  return orderRaces(tier.map((t) => ({ office: t.office, raceId: t.race_id, t }))).map((x) => x.t);
}

export interface CoverageRace {
  race_id: string;
  office: string;
  candidates: { candidate_id: string; name: string; named: number }[];
  flagged: boolean;
}

/** `named` candidate_news rows per ballot candidate over 30 days, for each
    race with two or more ballot candidates and at least one such row. A race
    is flagged when its highest count is at least COVERAGE_MIN and at least
    COVERAGE_RATIO times its lowest. `related` rows never count: they attach
    to every candidate an ambiguous surname admits. */
export function namedCoverage(tier: readonly TierRace[], recent: readonly NewsRow[], now: Date): CoverageRace[] {
  const since = now.getTime() - FEED_WINDOW_DAYS * DAY;
  const named = new Map<string, number>();
  for (const r of recent) {
    if (r.item_type !== "candidate_news" || r.relation !== "named" || !r.candidate_id) continue;
    if (time(r.published_at) < since) continue;
    named.set(r.candidate_id, (named.get(r.candidate_id) ?? 0) + 1);
  }
  return tier
    .filter((t) => t.candidates.length >= 2 && t.candidates.some((c) => (named.get(c.candidate_id) ?? 0) > 0))
    .map((t) => {
      const candidates = t.candidates.map((c) => ({
        candidate_id: c.candidate_id,
        name: clean(c.legal_name, 120),
        named: named.get(c.candidate_id) ?? 0,
      }));
      const counts = candidates.map((c) => c.named);
      const max = Math.max(...counts);
      const min = Math.min(...counts);
      return { race_id: t.race_id, office: clean(t.office, 120), candidates, flagged: max >= COVERAGE_MIN && max >= COVERAGE_RATIO * min };
    });
}

export function feedSummary(
  recent: readonly NewsRow[],
  sourceless: readonly NewsRow[],
  tier: readonly TierRace[],
  now: Date,
): {
  by_type_30d: Record<string, number>;
  election_by_scope_30d: { scope: string; label: string; count: number }[];
  named_coverage: CoverageRace[];
  sourceless: { count: number; ids: string[] };
} {
  const since = now.getTime() - FEED_WINDOW_DAYS * DAY;
  const rows = recent.filter((r) => time(r.published_at) >= since);
  const byType: Record<string, number> = Object.fromEntries(NEWS_ITEM_TYPES.map((t) => [t, 0]));
  for (const r of rows) byType[r.item_type] = (byType[r.item_type] ?? 0) + 1;
  const scopes = new Map<string, number>(COVERED_COUNTIES.map((c) => [`county:${c.fips}`, 0]));
  scopes.set("statewide", 0);
  const extra = new Map<string, number>();
  for (const r of rows) {
    if (r.item_type !== "election_news") continue;
    const scope = electionScope(r);
    const into = scopes.has(scope) ? scopes : extra;
    into.set(scope, (into.get(scope) ?? 0) + 1);
  }
  const ordered = [...scopes, ...[...extra].sort((a, b) => byText(a[0], b[0]))];
  const agentTypes: readonly string[] = AGENT_NEWS_TYPES;
  const missing = sourceless.filter((r) => agentTypes.includes(r.item_type) && r.source_id === null);
  return {
    by_type_30d: byType,
    election_by_scope_30d: ordered.map(([scope, count]) => ({ scope, label: scopeLabel(scope), count })),
    named_coverage: namedCoverage(tier, recent, now),
    sourceless: { count: missing.length, ids: missing.map((r) => r.id).sort(byText).slice(0, 20) },
  };
}

/* ---- 6. logistics ------------------------------------------------------- */

/** An election_event row as the digest selects it: never verified_by (an
    operator's address); `verified` comes from the verified read. */
export type ElectionEventRow = ElectionEvent;

export function logisticsSummary(
  tier: readonly TierRace[],
  events: readonly ElectionEventRow[],
  verifiedIds: ReadonlySet<string>,
  contactRows: number,
): {
  tier_candidates: number;
  site_verified: { oldest: string | null; newest: string | null; never: number };
  races: { total: number; info_verified: number };
  election_events: { event_type: string; scope: string; event_date: string; verified: boolean }[];
  candidate_contact_rows: number;
} {
  const candidates = new Map<string, CandidateRow>();
  for (const t of tier) for (const c of t.candidates) candidates.set(c.candidate_id, c);
  const stamps = [...candidates.values()]
    .map((c) => c.site_last_verified_at)
    .filter((s): s is string => s !== null && !Number.isNaN(time(s)))
    .sort((a, b) => time(a) - time(b));
  return {
    tier_candidates: candidates.size,
    site_verified: {
      oldest: stamps[0] ?? null,
      newest: stamps.length > 0 ? stamps[stamps.length - 1] : null,
      never: candidates.size - stamps.length,
    },
    races: { total: tier.length, info_verified: tier.filter((t) => t.info_last_verified_at !== null).length },
    election_events: events
      .map((e) => ({
        event_type: e.event_type,
        scope: e.county_fips ? countyLabel(e.county_fips) : "Statewide",
        event_date: e.event_date,
        verified: verifiedIds.has(e.id),
      }))
      .sort((a, b) => byText(a.event_date, b.event_date) || byText(a.scope, b.scope) || byText(a.event_type, b.event_type)),
    candidate_contact_rows: contactRows,
  };
}

/* ---- 7. pipeline state -------------------------------------------------- */

export function pipelineState(
  races: readonly RaceRow[],
  publications: readonly PublicationRow[],
  profiles: readonly ProfileRow[],
  now: Date,
): {
  races_by_status: Record<string, number>;
  profiles_by_balance_check: { true: number; false: number; missing: number };
  flagged_14d: { candidate_id: string; race_id: string; flag_reason: string | null; flagged_at: string }[];
} {
  const status = new Map(publications.map((p) => [p.race_id, p.status]));
  const byStatus: Record<string, number> = { published: 0, listed: 0, in_review: 0, draft: 0, none: 0 };
  for (const r of races) {
    const s = status.get(r.race_id) ?? "none";
    byStatus[s] = (byStatus[s] ?? 0) + 1;
  }
  const balance = { true: 0, false: 0, missing: 0 };
  const since = now.getTime() - FLAG_WINDOW_DAYS * DAY;
  const flagged: { candidate_id: string; race_id: string; flag_reason: string | null; flagged_at: string }[] = [];
  for (const p of profiles) {
    const audit = (typeof p.audit === "object" && p.audit !== null ? p.audit : {}) as Record<string, unknown>;
    const passed = audit.balance_check_passed;
    if (passed === true) balance.true++;
    else if (passed === false) balance.false++;
    else balance.missing++;
    const at = audit.flagged_at;
    if (typeof at === "string" && time(at) >= since) {
      const reason = audit.flag_reason;
      flagged.push({
        candidate_id: p.candidate_id,
        race_id: p.race_id,
        flag_reason: typeof reason === "string" ? clean(reason, 80) : null,
        flagged_at: at,
      });
    }
  }
  flagged.sort((a, b) => byText(a.race_id, b.race_id) || byText(a.candidate_id, b.candidate_id));
  return { races_by_status: byStatus, profiles_by_balance_check: balance, flagged_14d: flagged };
}

/* ---- 8, 9 and the whole digest ----------------------------------------- */

export interface DigestInput {
  /** The run's local date, YYYY-MM-DD (what `start` printed). */
  date: string;
  outputs: { latest: string; latest_exists: boolean; monthly: string; monthly_exists: boolean };
  /** vercel.json, parsed, or null when it could not be read. */
  vercel: unknown;
  /** task-runs.json as R4 wrote it. */
  taskRunsText: string;
  reports: readonly ReportFile[];
  agentRuns: readonly AgentRunRow[];
  review: readonly ReviewRow[];
  /** race rows of ELECTION_KIND. */
  races: readonly RaceRow[];
  /** every race_publication row. */
  publications: readonly PublicationRow[];
  candidates: readonly CandidateRow[];
  profiles: readonly ProfileRow[];
  /** news_item rows published in the last 30 days, every type. */
  recentNews: readonly NewsRow[];
  /** candidate_news / election_news rows with no source_id, any date. */
  sourcelessNews: readonly NewsRow[];
  pipelineEvents: readonly PipelineEventRow[];
  /** every ELECTION row of election_event, verified or not. */
  events: readonly ElectionEventRow[];
  /** every verified row, any election: what the reminder cron reads. */
  verifiedEvents: readonly ElectionEvent[];
  sendLog: readonly SendLogRow[];
  /** active subscriptions only. */
  subscriptions: readonly SubscriptionRow[];
  zipCounty: ReadonlyMap<string, string>;
  contactRows: number;
}

/** Everything but the risk lines, which are read off it. */
export function digestCore(input: DigestInput, now: Date) {
  const tasks = readTaskRuns(input.taskRunsText);
  const tier = ballotTier(input.races, input.publications, input.candidates);
  const schedule = cronScheduleFor(input.vercel, SWEEP_ROUTE);
  const parsed = typeof schedule === "string" ? parseCron(schedule) : schedule;
  const r1 = input.agentRuns.filter((r) => r.agent === "R1");
  const firstR1 = r1.reduce<number | null>((min, r) => {
    const t = time(r.started_at);
    return Number.isNaN(t) || (min !== null && min <= t) ? min : t;
  }, null);
  const since14 = now.getTime() - SWEEP_WINDOW_DAYS * DAY;
  const reviewSection = reviewQueue(input.review, now);
  const runs = runsSection(input.agentRuns, input.reports, tasks.runs, now);
  const pendingOf = (kind: string) => input.review.filter((r) => r.kind === kind && r.status === "pending").length;

  const core = {
    generated_at: now.toISOString(),
    date: input.date,
    outputs: input.outputs,
    runs,
    task_runs_problems: tasks.problems,
    review_queue: reviewSection,
    crons: {
      news_sweep: {
        schedule: typeof schedule === "string" ? schedule : null,
        error: "error" in parsed ? parsed.error : null,
        never_logged: firstR1 === null,
        fires: "error" in parsed ? [] : sweepFires(parsed, r1, firstR1 === null ? null : new Date(firstR1), now),
        runs_14d: r1
          .filter((r) => time(r.started_at) >= since14)
          .sort((a, b) => time(b.started_at) - time(a.started_at))
          .map((r) => ({ ...r, summary: r.summary === null ? null : clean(r.summary, 300) })),
        queued_by_day: queuedByDay(input.review, "agent:R1", now, SWEEP_WINDOW_DAYS),
      },
      refresh_news: refreshHeartbeat(input.pipelineEvents, input.publications, now),
      reminders: reminderCheck(input.verifiedEvents, input.sendLog, input.subscriptions, input.zipCounty, now),
    },
    r5: leadSummary(input.review, now),
    feed: feedSummary(input.recentNews, input.sourcelessNews, tier, now),
    logistics: logisticsSummary(tier, input.events, new Set(input.verifiedEvents.map((e) => e.id)), input.contactRows),
    pipeline: pipelineState(input.races, input.publications, input.profiles, now),
    waiting_on_jason: {
      pending: Object.fromEntries(WAITING_KINDS.map((k) => [k, pendingOf(k)])) as Record<(typeof WAITING_KINDS)[number], number>,
      stuck: [] as string[],
    },
  };
  core.waiting_on_jason.stuck = stuckLines(core.runs);
  return core;
}

export type DigestCore = ReturnType<typeof digestCore>;

/** digest.json: the sections of spec §3.7 in order, then the open risks. */
export function buildDigest(input: DigestInput, now: Date): DigestCore & { open_risks: string[] } {
  const core = digestCore(input, now);
  return { ...core, open_risks: openRisks(core) };
}

export type Digest = ReturnType<typeof buildDigest>;

function stuckLines(runs: readonly RunsEntry[]): string[] {
  const out: string[] = [];
  for (const a of runs) {
    for (const s of a.stuck_runs) {
      out.push(`${a.label} (${a.agent}): the run started ${s} has no finish and is past twice its ${a.budget_min} min budget: stop it in the app.`);
    }
    for (const t of a.task_runs) {
      if (t.stuck) {
        out.push(`${a.label} (${a.task}): running since ${t.started_at}, past twice its ${a.budget_min} min budget: stop it in the app.`);
      }
    }
  }
  return out;
}

/** One line per threshold crossed (spec §3.7 item 9). R4 adds the lint's
    findings and what R2's report lists; everything else is here. */
export function openRisks(d: DigestCore): string[] {
  const out: string[] = [...d.waiting_on_jason.stuck];
  for (const p of d.task_runs_problems) out.push(`Task runs: ${p}.`);
  const sweep = d.crons.news_sweep;
  if (sweep.error) out.push(`News sweep: ${sweep.error}.`);
  if (sweep.never_logged) {
    out.push("News sweep: no run is recorded in agent_run yet. Expected until agents PR A is deployed; after that it means the sweep cron is not running.");
  }
  for (const f of sweep.fires) {
    if (f.status === "missed") out.push(`News sweep: no run recorded within ${SWEEP_GRACE_HOURS} h of the scheduled ${f.at}.`);
    if (f.status === "failed") out.push(`News sweep: the run for ${f.at} failed; see its summary under Crons.`);
  }
  for (const u of d.crons.refresh_news.unannounced) {
    out.push(`Refresh-news: ${u.race_id} was published ${u.published_at} and has no pipeline_event row: the daily cron has not run since.`);
  }
  for (const r of d.crons.reminders.due) {
    if (r.status === "missed") out.push(`Reminders: ${r.dedupe_key} was due ${r.day} for ${r.subscribers} subscriber(s) and has no send-log row.`);
  }
  for (const c of d.feed.named_coverage) {
    if (c.flagged) {
      out.push(
        `Coverage: in ${c.race_id}, named stories per candidate over ${FEED_WINDOW_DAYS} days are ${c.candidates.map((x) => x.named).join(" / ")} (ballot order): one has ${COVERAGE_RATIO} times another or more.`,
      );
    }
  }
  if (d.feed.sourceless.count > 0) {
    out.push(`Feed: ${d.feed.sourceless.count} candidate_news/election_news row(s) have no source_id (zero once 0014 is applied).`);
  }
  if (d.review_queue.apply_errors.length > 0) {
    out.push(`Review queue: ${d.review_queue.apply_errors.length} pending item(s) carry an apply_error.`);
  }
  const unverified = d.logistics.election_events.filter((e) => !e.verified).length;
  if (unverified > 0) {
    out.push(`Dates: ${unverified} ${ELECTION} election_event row(s) are not verified, so no page or reminder uses them.`);
  }
  return out;
}

/** The stderr line the wrapper prints for R4. */
export function summaryLine(d: Digest): string {
  const sweep = d.crons.news_sweep;
  const missed = sweep.fires.filter((f) => f.status === "missed").length;
  return (
    `digest: ${d.review_queue.pending_total} pending review item(s); ` +
    `news sweep: ${sweep.fires.length} scheduled, ${missed} missed${sweep.never_logged ? " (no run logged yet)" : ""}; ` +
    `reminders missed: ${d.crons.reminders.due.filter((r) => r.status === "missed").length}; ` +
    `${d.open_risks.length} open risk(s)`
  );
}
