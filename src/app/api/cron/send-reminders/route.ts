import * as Sentry from "@sentry/nextjs";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { emailSenderConfigured, remindersPaused } from "@/lib/notifications/config";
import {
  verifiedStatewideEvents,
  type ElectionEvent,
} from "@/lib/notifications/election-events";
import {
  dueReminders,
  easternToday,
  nextReminder,
} from "@/lib/notifications/schedule";
import { renderTemplate, type Rendered } from "@/lib/notifications/templates";
import { secretEquals } from "@/lib/secret-compare";
import { resendApiKey } from "@/lib/server-keys";
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
   accept. Runs once daily (vercel.json); re-runs are safe by construction.

   One addition for the launch (handoff 2026-10-04, §2.2), Recommended
   (pending founder confirmation): a REHEARSAL mode, a POST whose JSON body
   is {"rehearse":"<address>"}, marked below. Between Oct 5 and Oct 20 no
   reminder is due, so a plain manual trigger answers {"due":0} and proves
   only that the secret and env are right; the first real send would be
   Oct 21, the day before the vote-by-mail deadline, with one day to fix
   anything. A rehearsal sends the NEXT scheduled reminder, word for word,
   to one address that already holds an active subscription, under a
   synthetic "rehearsal:" key in notification_send_log — so the claim, the
   template, Resend's batch API and the unsubscribe link are all exercised
   weeks early, without touching the real dedupe key or anyone else's
   inbox. Runbook: docs/general-election/reminders-e2e-runbook.md. */

export const maxDuration = 60;

const BATCH_SIZE = 100;
/* Resend's default API limit is 2 requests per second (per team, when last
   checked). Back-to-back batch calls past 200 recipients could draw a 429,
   which the loop below treats as a failed send: claim released, and the
   manual re-run re-mails everyone already reached. Pacing the calls costs
   about half a second per 100 recipients; at maxDuration 60 that still
   covers several thousand, far above the 2026 cohort. */
const BATCH_PACING_MS = 600;
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

  if (remindersPaused()) {
    return NextResponse.json({
      paused: true,
      note: "NOTIFICATIONS_PAUSED is set — no reminders considered or sent.",
    });
  }

  /* emailSenderConfigured is the same Resend key + EMAIL_FROM check this
     line always made, now shared with the signup route and the pages that
     decide whether to offer a signup (src/lib/notifications/config.ts). */
  if (!emailSenderConfigured()) {
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

  /* Florida's calendar day, not UTC's (easternToday explains the manual
     re-run that UTC got wrong). At the scheduled 14:00 UTC the two agree. */
  const today = easternToday();
  const events = await verifiedStatewideEvents(service);
  const origin = request.nextUrl.origin;

  /* ---- REHEARSAL (launch handoff §2.2) ---------------------------------
     Only for a POST whose JSON body names an address. Vercel Cron sends a
     bare GET, so the scheduled run cannot enter this branch. To remove the
     mode, delete this block and the rehearsalRequest() and rehearse()
     functions below. */
  const rehearsal = await rehearsalRequest(request);
  if (rehearsal && "invalid" in rehearsal) {
    return NextResponse.json({ error: rehearsal.invalid }, { status: 400 });
  }
  if (rehearsal) {
    return rehearse(service, events, today, rehearsal.to, origin);
  }
  /* ---- end REHEARSAL --------------------------------------------------- */

  const due = dueReminders(events, today);
  if (due.length === 0) {
    return NextResponse.json({ due: 0, sent: [], skipped: [] });
  }

  const resend = new Resend(resendApiKey());
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
    let batches = 0;
    /* One reminder per address, not per subscription. Rows are unique on
       (email, zip5), so a voter who signed up from two ZIPs holds two rows,
       and reminders are statewide, the same for every ZIP. The first row
       in token order is the one mailed, and its unsubscribe link is the
       one the voter sees. Lower-cased because rows stored before the
       signup route lower-cased addresses may differ only in case. */
    const mailed = new Set<string>();
    try {
      for (let from = 0; from < count; from += PAGE_SIZE) {
        const { data: page, error: pageError } = await service
          .from("voting_info_subscription")
          .select("email, unsubscribe_token")
          .eq("active", true)
          .order("unsubscribe_token")
          .range(from, from + PAGE_SIZE - 1);
        if (pageError) throw new Error(pageError.message);

        const fresh = (page ?? []).filter((sub) => {
          const address = sub.email.toLowerCase();
          if (mailed.has(address)) return false;
          mailed.add(address);
          return true;
        });
        for (let i = 0; i < fresh.length; i += BATCH_SIZE) {
          const chunk = fresh.slice(i, i + BATCH_SIZE);
          if (batches++ > 0) {
            await new Promise((r) => setTimeout(r, BATCH_PACING_MS));
          }
          const { error: sendError } = await resend.batch.send(
            chunk.map((sub) => ({
              from: process.env.EMAIL_FROM!,
              to: sub.email,
              subject: rendered.subject ?? rendered.title,
              text: reminderText(rendered, origin, sub.unsubscribe_token),
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
            ? `Active subscriptions (one per address and ZIP): ${subscriberCount}`
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

/* The text every reminder carries. One function for the real send and the
   rehearsal, so a rehearsal can never show copy the cohort will not get. */
function reminderText(
  rendered: Rendered,
  origin: string,
  unsubscribeToken: string
): string {
  return `${rendered.body}\n\nYou get these reminders because you asked for voting info. Unsubscribe: ${origin}/api/voting-info/unsubscribe?token=${unsubscribeToken}`;
}

/* REHEARSAL (see the header). The address travels in the POST body, never
   the URL: Vercel's request logs record every URL with its query string,
   and an address there would sit in those logs for their retention
   period. A body is not logged. Anything that is not a rehearsal is left
   exactly as it was before this mode existed: GET, an empty POST, a body
   that is not JSON, or JSON without a "rehearse" key all run the normal
   schedule. */
async function rehearsalRequest(
  request: NextRequest
): Promise<{ to: string } | { invalid: string } | null> {
  if (request.nextUrl.searchParams.has("rehearse")) {
    return {
      invalid:
        'Send the rehearsal address in a JSON body, {"rehearse":"<address>"}, not in the URL. Nothing was sent.',
    };
  }
  if (request.method !== "POST") return null;
  let body: unknown;
  try {
    const raw = await request.text();
    if (raw.trim() === "") return null;
    body = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof body !== "object" || body === null || !("rehearse" in body)) {
    return null;
  }
  const to = (body as { rehearse: unknown }).rehearse;
  return typeof to === "string" && to.trim() !== ""
    ? { to: to.trim() }
    : { invalid: '"rehearse" must be an email address. Nothing was sent.' };
}

/* REHEARSAL (see the header). Sends the next scheduled reminder to ONE
   address, and only to an address with an active subscription: the caller
   already holds CRON_SECRET, and this keeps the mode from mailing anyone
   who did not sign up. The subject says "[Rehearsal]"; the body is the real
   one, unsubscribe link included, so the link can be tested too. The claim
   is a synthetic key, unique per run and never a real dedupe_key, so the
   scheduled send for that day is untouched. It stays in
   notification_send_log as the record that the rehearsal ran; like every
   row there it holds a key and a count, never an address. */
async function rehearse(
  service: SupabaseClient,
  events: ElectionEvent[],
  today: string,
  to: string,
  origin: string
) {
  const next = nextReminder(events, today);
  if (!next) {
    return NextResponse.json(
      { error: "No upcoming reminder to rehearse — nothing was sent." },
      { status: 404 }
    );
  }

  /* Signups are stored lower-cased; the exact spelling is tried too, for
     any row saved before that. */
  const { data: subs, error: subError } = await service
    .from("voting_info_subscription")
    .select("email, unsubscribe_token")
    .in("email", [...new Set([to, to.toLowerCase()])])
    .eq("active", true)
    .limit(1);
  if (subError) {
    return NextResponse.json(
      { error: "Subscription lookup failed — nothing was sent." },
      { status: 502 }
    );
  }
  const sub = subs?.[0];
  if (!sub) {
    return NextResponse.json(
      {
        error:
          "No active subscription for that address — sign it up on the site first. Nothing was sent.",
      },
      { status: 404 }
    );
  }

  const dedupeKey = `rehearsal:${next.reminder.dedupe_key}:${new Date().toISOString()}`;
  const { error: claimError } = await service
    .from("notification_send_log")
    .insert({ dedupe_key: dedupeKey });
  if (claimError) {
    return NextResponse.json(
      { error: "Rehearsal claim failed — nothing was sent." },
      { status: 502 }
    );
  }

  const rendered = renderTemplate(next.reminder.template_id, {
    election: next.reminder.event.election,
    date: next.reminder.event.event_date,
    details_url: next.reminder.event.details_url,
  });
  const resend = new Resend(resendApiKey());
  const { error: sendError } = await resend.batch.send([
    {
      from: process.env.EMAIL_FROM!,
      to: sub.email,
      subject: `[Rehearsal] ${rendered.subject ?? rendered.title}`,
      text: reminderText(rendered, origin, sub.unsubscribe_token),
    },
  ]);
  if (sendError) {
    await service.from("notification_send_log").delete().eq("dedupe_key", dedupeKey);
    return NextResponse.json(
      { error: `Rehearsal send failed: ${sendError.message} — claim released.` },
      { status: 502 }
    );
  }

  await service
    .from("notification_send_log")
    .update({ recipient_count: 1 })
    .eq("dedupe_key", dedupeKey);
  return NextResponse.json({
    rehearsal: true,
    dedupe_key: dedupeKey,
    template_id: next.reminder.template_id,
    real_send_date: next.day,
    recipients: 1,
  });
}
