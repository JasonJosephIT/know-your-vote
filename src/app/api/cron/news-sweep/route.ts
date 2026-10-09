import { NextRequest, NextResponse } from "next/server";
import { secretEquals } from "@/lib/secret-compare";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/service";
import { enqueueIntake, runSweep } from "@/lib/news-intake";
import { cronRunRow, type CronOutcome } from "@/lib/agent-budget";

/* The news intake, daily at 11:00 UTC (vercel.json; news-source-integrity
   §3.5, founder decision D9, recommended and pending confirmation; it ran
   Mondays and Thursdays from 2026-10-06). Most feeds hold under three days of
   stories, so a twice-weekly run missed what fell off between runs; daily
   leaves only the feeds the depth line below names as shallow. It sweeps
   every usable outlet for the last 14 days and queues
   what it finds as PENDING review items: stories naming a candidate on the
   ballot, and election stories that name no one (statewide or county-scoped).
   Nothing here is voter-facing. A row reaches the site only once an operator
   approves it in /admin, the same boundary every other news row crosses.

   The 14-day window overlaps the previous run on purpose, so a story an outlet
   publishes late isn't missed; anything already queued, decided or published
   is skipped (src/lib/news-intake.ts).

   Before this, intake was a hand-run pair of scripts that had never run end to
   end, and the newest article on the site was weeks old. The scripts still
   work and run this same code: node scripts/news-sweep.ts | node
   scripts/news-enqueue.ts. */

/* Up to 24 feeds at up to 20s each, plus sitemap days with a 1s gap. */
export const maxDuration = 300;

const WINDOW_DAYS = 14;

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return (
    secretEquals(request.headers.get("x-cron-secret"), secret) ||
    secretEquals(request.headers.get("authorization"), `Bearer ${secret}`)
  );
}

/* Vercel Cron invokes with GET and `Authorization: Bearer ${CRON_SECRET}`;
   POST with x-cron-secret is the manual form, as for refresh-news. */
export async function GET(request: NextRequest) {
  return run(request);
}
export async function POST(request: NextRequest) {
  return run(request);
}

async function run(request: NextRequest) {
  const startedAt = new Date();
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let service;
  try {
    service = createServiceClient();
  } catch {
    return NextResponse.json(
      { error: "Service credentials missing — nothing swept or queued." },
      { status: 503 }
    );
  }

  const failures: string[] = [];
  let sweep;
  try {
    sweep = await runSweep({ days: WINDOW_DAYS, log: (line) => failures.push(line.trim()) });
  } catch (err) {
    const error = (err as Error).message;
    await recordRun(service, { startedAt, finishedAt: new Date(), sweepLine: null, queueLine: null, queued: 0, error });
    return NextResponse.json({ error }, { status: 502 });
  }

  /* Feed depth, one line per run, logged before queueing so a run that fails
     to queue still records it. The line also goes into the run's agent_run
     summary (news-source-integrity §3.5), which lasts longer than Vercel's
     runtime logs; the response carries the shallow feeds for a manual POST. */
  console.log(sweep.depthLine);

  let result;
  try {
    result = await enqueueIntake(service, sweep.articles);
  } catch (err) {
    const error = (err as Error).message;
    await recordRun(service, { startedAt, finishedAt: new Date(), sweepLine: sweep.summary, depthLine: sweep.depthLine, queueLine: null, queued: 0, error });
    return NextResponse.json({ sweep: sweep.summary, shallowFeeds: sweep.shallowFeeds, error }, { status: 502 });
  }

  await recordRun(service, {
    startedAt,
    finishedAt: new Date(),
    sweepLine: sweep.summary,
    depthLine: sweep.depthLine,
    queueLine: result.summary,
    queued: result.queued,
    error: null,
  });
  return NextResponse.json({
    sweep: sweep.summary,
    shallowFeeds: sweep.shallowFeeds,
    fetchFailures: failures,
    queue: result.summary,
    queued: result.queued,
    skipped: result.skipped,
    candidateMatches: result.attachments,
    electionStories: result.elections,
  });
}

/* One agent_run row per run, written at the end: the cron is R1 now (spec
   docs/superpowers/specs/2026-10-08-agent-retrofit-design.md §3.1). The 401
   and 503 paths write none (no caller to trust, no credentials to write
   with), and neither does a run the platform kills at maxDuration; R4's
   missed-run rule catches all three. A failed log write is logged and never
   fails the cron: the queued items are the run's real output. */
async function recordRun(service: SupabaseClient, outcome: CronOutcome): Promise<void> {
  try {
    const { error } = await service.from("agent_run").insert(cronRunRow(outcome));
    if (error) console.error(`news-sweep: run log not written: ${error.message}`);
  } catch (err) {
    console.error(`news-sweep: run log not written: ${(err as Error).message}`);
  }
}
