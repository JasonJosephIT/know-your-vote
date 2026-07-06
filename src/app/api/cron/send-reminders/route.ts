import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { verifiedStatewideEvents } from "@/lib/notifications/election-events";
import { dueReminders } from "@/lib/notifications/schedule";
import { renderTemplate } from "@/lib/notifications/templates";
import { secretEquals } from "@/lib/secret-compare";
import { createServiceClient } from "@/lib/supabase/service";

/* Daily reminder cron (plan A8). The whole delivery machine: for each
   founder-verified election_event × REMINDER_OFFSETS rule due today,
   claim the send in notification_send_log (INSERT ... ON CONFLICT DO
   NOTHING is the idempotency — §6-H: no outbox, no drain), expand the
   cohort from voting_info_subscription, render the registry template, and
   send via Resend in batches of 100.

   Failure semantics follow the design doc §7: a failed send DELETES its
   claim so a manual re-run retries it — some recipients may get a
   duplicate, but a silent no-send on deadline day is the outcome we never
   accept. Runs once daily (vercel.json); re-runs are safe by construction. */

export const maxDuration = 60;

const BATCH_SIZE = 100;
const PAGE_SIZE = 1000;
/* The "never mass-send by accident" fuse. The 2026 list is a four-metro
   opt-in cohort; if it ever reads > 50k something upstream is corrupt. */
const COHORT_FUSE = 50_000;

export async function POST(request: NextRequest) {
  return run(request);
}

/* Vercel Cron invokes with GET and `Authorization: Bearer ${CRON_SECRET}`;
   POST + x-cron-secret is the manual/API contract (same as refresh-news). */
export async function GET(request: NextRequest) {
  return run(request);
}

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return (
    secretEquals(request.headers.get("x-cron-secret"), secret) ||
    secretEquals(request.headers.get("authorization"), `Bearer ${secret}`)
  );
}

async function run(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (process.env.NOTIFICATIONS_PAUSED) {
    return NextResponse.json({
      paused: true,
      note: "NOTIFICATIONS_PAUSED is set — no reminders considered or sent.",
    });
  }

  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    return NextResponse.json(
      { error: "Email delivery isn't configured — nothing was sent." },
      { status: 503 }
    );
  }

  let service;
  try {
    service = createServiceClient();
  } catch {
    return NextResponse.json(
      { error: "Service credentials missing — nothing was sent." },
      { status: 503 }
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const events = await verifiedStatewideEvents(service);
  const due = dueReminders(events, today);
  if (due.length === 0) {
    return NextResponse.json({ due: 0, sent: [], skipped: [] });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const origin = request.nextUrl.origin;
  const sent: { dedupe_key: string; recipients: number }[] = [];
  const skipped: string[] = [];
  let subscriberCount: number | null = null;

  for (const { event, template_id, dedupe_key: dedupeKey } of due) {
    /* Claim. ignoreDuplicates makes this INSERT ... ON CONFLICT DO NOTHING;
       an empty result means another run already owns this send. */
    const { data: claimed, error: claimError } = await service
      .from("notification_send_log")
      .upsert(
        { dedupe_key: dedupeKey },
        { onConflict: "dedupe_key", ignoreDuplicates: true }
      )
      .select("dedupe_key");
    if (claimError) {
      return NextResponse.json(
        { error: `Claim failed for ${dedupeKey} — aborting run.`, sent },
        { status: 502 }
      );
    }
    if (!claimed || claimed.length === 0) {
      skipped.push(dedupeKey);
      continue;
    }

    const releaseClaim = () =>
      service.from("notification_send_log").delete().eq("dedupe_key", dedupeKey);

    const { count, error: countError } = await service
      .from("voting_info_subscription")
      .select("email", { count: "exact", head: true })
      .eq("active", true);
    if (countError || count === null) {
      await releaseClaim();
      return NextResponse.json(
        { error: "Cohort count failed — claim released, nothing sent.", sent },
        { status: 502 }
      );
    }
    subscriberCount = count;
    if (count > COHORT_FUSE) {
      await releaseClaim();
      Sentry.captureException(
        new Error(`send-reminders fuse: cohort ${count} > ${COHORT_FUSE}`)
      );
      return NextResponse.json(
        { error: "Cohort size fuse tripped — nothing sent.", sent },
        { status: 500 }
      );
    }

    const rendered = renderTemplate(template_id, {
      election: event.election,
      date: event.event_date,
      details_url: event.details_url,
    });

    let recipients = 0;
    try {
      for (let from = 0; from < count; from += PAGE_SIZE) {
        const { data: page, error: pageError } = await service
          .from("voting_info_subscription")
          .select("email, unsubscribe_token")
          .eq("active", true)
          .order("unsubscribe_token")
          .range(from, from + PAGE_SIZE - 1);
        if (pageError) throw new Error(pageError.message);

        for (let i = 0; i < (page ?? []).length; i += BATCH_SIZE) {
          const chunk = (page ?? []).slice(i, i + BATCH_SIZE);
          const { error: sendError } = await resend.batch.send(
            chunk.map((sub) => ({
              from: process.env.EMAIL_FROM!,
              to: sub.email,
              subject: rendered.subject ?? rendered.title,
              text: `${rendered.body}\n\nYou get these reminders because you asked for voting info. Unsubscribe: ${origin}/api/voting-info/unsubscribe?token=${sub.unsubscribe_token}`,
            }))
          );
          if (sendError) throw new Error(sendError.message);
          recipients += chunk.length;
        }
      }
    } catch (err) {
      /* Retry-forward: release the claim so a manual re-run retries this
         reminder. Duplicates for already-sent recipients are the accepted
         cost; a silent no-send is not (design doc §7). */
      await releaseClaim();
      Sentry.captureException(err);
      return NextResponse.json(
        {
          error: `Send failed for ${dedupeKey} after ${recipients} recipients — claim released for manual re-run.`,
          sent,
        },
        { status: 502 }
      );
    }

    await service
      .from("notification_send_log")
      .update({ recipient_count: recipients })
      .eq("dedupe_key", dedupeKey);
    sent.push({ dedupe_key: dedupeKey, recipients });
  }

  /* Founder digest (plan A9): only on days something actually went out —
     zero-activity days send nothing at all. Best-effort: a digest failure
     never fails a run that already delivered reminders. */
  if (sent.length > 0) {
    try {
      await resend.emails.send({
        from: process.env.EMAIL_FROM!,
        to: process.env.EMAIL_FROM!,
        subject: `Know Your Vote reminders digest — ${today}`,
        text: [
          "Reminders sent today:",
          ...sent.map((s) => `  ${s.dedupe_key} -> ${s.recipients} recipients`),
          skipped.length > 0
            ? `Skipped (already sent): ${skipped.join(", ")}`
            : "",
          subscriberCount !== null
            ? `Active subscribers: ${subscriberCount}`
            : "",
        ]
          .filter(Boolean)
          .join("\n"),
      });
    } catch {
      /* digest is best-effort */
    }
  }

  return NextResponse.json({ due: due.length, sent, skipped });
}
