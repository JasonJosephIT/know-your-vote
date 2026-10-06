import * as Sentry from "@sentry/nextjs";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import {
  activeSubscribers,
  BATCH_PACING_MS,
  BATCH_SIZE,
  COHORT_FUSE,
  reminderText,
  zipCounties,
  type Subscriber,
} from "@/lib/notifications/cohort";
import { emailSenderConfigured, remindersPaused } from "@/lib/notifications/config";
import {
  verifiedElectionEvents,
  type ElectionEvent,
} from "@/lib/notifications/election-events";
import {
  countiesWithOwnDates,
  dueRemindersByScope,
  easternToday,
  eventsForCounty,
  nextReminder,
} from "@/lib/notifications/schedule";
import { reminderParams, renderTemplate } from "@/lib/notifications/templates";
import { secretEquals } from "@/lib/secret-compare";
import { resendApiKey } from "@/lib/server-keys";
import { createServiceClient } from "@/lib/supabase/service";

/* Daily reminder cron (plan A8). The whole delivery machine: for each
   founder-verified election_event × REMINDER_OFFSETS rule due today,
   claim the send in notification_send_log (INSERT ... ON CONFLICT DO
   NOTHING is the idempotency — §6-H: no outbox, no drain), expand the
   cohort from voting_info_subscription, render the registry template, and
   send via Resend in batches of 100.

   County dates (0043): a county with rows of its own gets reminders on its
   own dates, under its own dedupe key, and the statewide reminder for that
   date skips its subscribers (dueRemindersByScope). A subscriber's county
   comes from their ZIP (zip_district), the same map the signup used.

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

/* BATCH_SIZE, BATCH_PACING_MS and COHORT_FUSE, and the cohort helpers
   activeSubscribers, zipCounties and reminderText, live in
   src/lib/notifications/cohort.ts, shared with the manual correction send
   (src/app/api/cron/send-correction/route.ts). They moved there unchanged. */

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
  const events = await verifiedElectionEvents(service);
  /* Links in the email come from src/lib/site-url.ts (reminderText), never
     from this request: Vercel Cron can reach the route on the deployment's
     own *.vercel.app address rather than knowyour.vote. */

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
    return rehearse(service, events, today, rehearsal.to);
  }
  /* ---- end REHEARSAL --------------------------------------------------- */

  const due = dueRemindersByScope(events, today);
  if (due.length === 0) {
    return NextResponse.json({ due: 0, sent: [], skipped: [] });
  }

  /* The cohort is read once, before anything is claimed, so a failed read
     leaves nothing to release. */
  const { count, error: countError } = await service
    .from("voting_info_subscription")
    .select("email", { count: "exact", head: true })
    .eq("active", true);
  if (countError || count === null) {
    return NextResponse.json(
      { error: "Cohort count failed — nothing claimed, nothing sent.", sent: [] },
      { status: 502 }
    );
  }
  const subscriberCount = count;
  if (count > COHORT_FUSE) {
    Sentry.captureException(
      new Error(`send-reminders fuse: cohort ${count} > ${COHORT_FUSE}`)
    );
    return NextResponse.json(
      { error: "Cohort size fuse tripped — nothing sent.", sent: [] },
      { status: 500 }
    );
  }

  let cohort: Subscriber[];
  try {
    cohort = await activeSubscribers(service, count, countiesWithOwnDates(events));
  } catch {
    return NextResponse.json(
      { error: "Cohort read failed — nothing claimed, nothing sent.", sent: [] },
      { status: 502 }
    );
  }

  const resend = new Resend(resendApiKey());
  const sent: { dedupe_key: string; recipients: number }[] = [];
  const skipped: string[] = [];
  /* Due today but no subscriber is in its scope — the statewide early
     voting reminder while every subscriber's county has its own date. Not
     claimed, so nothing is recorded as sent. */
  const noRecipients: string[] = [];
  /* Paces every batch call in the run, not just within one reminder: on
     Oct 19 each county's early-voting reminder is its own send, so one run
     makes several calls back to back. */
  let batchCalls = 0;

  for (const { reminder, scopes } of due) {
    const { event, template_id, dedupe_key: dedupeKey } = reminder;

    /* One reminder per address, not per subscription. Rows are unique on
       (email, zip5), so a voter who signed up from two ZIPs holds two rows.
       The first row in token order is the one mailed, and its unsubscribe
       link is the one the voter sees. Lower-cased because rows stored
       before the signup route lower-cased addresses may differ only in
       case. A voter subscribed from ZIPs in two counties with dates of
       their own gets each county's reminder, each naming its county. */
    const mailed = new Set<string>();
    const recipients = cohort.filter((sub) => {
      if (!scopes.includes(sub.scope)) return false;
      const address = sub.email.toLowerCase();
      if (mailed.has(address)) return false;
      mailed.add(address);
      return true;
    });
    if (recipients.length === 0) {
      noRecipients.push(dedupeKey);
      continue;
    }

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

    const rendered = renderTemplate(template_id, reminderParams(event));

    let delivered = 0;
    try {
      for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
        const chunk = recipients.slice(i, i + BATCH_SIZE);
        if (batchCalls++ > 0) {
          await new Promise((r) => setTimeout(r, BATCH_PACING_MS));
        }
        const { error: sendError } = await resend.batch.send(
          chunk.map((sub) => ({
            from: process.env.EMAIL_FROM!,
            to: sub.email,
            subject: rendered.subject ?? rendered.title,
            text: reminderText(rendered, sub.unsubscribe_token),
          }))
        );
        if (sendError) throw new Error(sendError.message);
        delivered += chunk.length;
      }
    } catch (err) {
      /* Retry-forward: release the claim so a manual re-run retries this
         reminder. Duplicates for already-sent recipients are the accepted
         cost; a silent no-send is not (design doc §7). */
      await releaseClaim();
      Sentry.captureException(err);
      return NextResponse.json(
        {
          error: `Send failed for ${dedupeKey} after ${delivered} recipients — claim released for manual re-run.`,
          sent,
        },
        { status: 502 }
      );
    }

    await service
      .from("notification_send_log")
      .update({ recipient_count: delivered })
      .eq("dedupe_key", dedupeKey);
    sent.push({ dedupe_key: dedupeKey, recipients: delivered });
  }

  /* Founder digest (plan A9): only on days something was due — zero-activity
     days send nothing at all. A due reminder that reached no one is
     reported too: before the county rows it was claimed and logged with 0
     recipients, and the digest said so. It now goes unclaimed, and this is
     where the founder still sees it — including the case where 0043 was
     stamped after Oct 19 and the Oct 24 statewide reminder no longer
     covers any subscriber. Best-effort: a digest failure never fails a run
     that already delivered reminders. */
  if (sent.length > 0 || noRecipients.length > 0) {
    try {
      await resend.emails.send({
        from: process.env.EMAIL_FROM!,
        to: process.env.EMAIL_FROM!,
        subject: `Know Your Vote reminders digest — ${today}`,
        text: [
          sent.length > 0 ? "Reminders sent today:" : "No reminder was sent today.",
          ...sent.map((s) => `  ${s.dedupe_key} -> ${s.recipients} recipients`),
          skipped.length > 0
            ? `Skipped (already sent): ${skipped.join(", ")}`
            : "",
          noRecipients.length > 0
            ? `Due today but sent to no one (no active subscriber in its scope): ${noRecipients.join(", ")}`
            : "",
          `Active subscriptions (one per address and ZIP): ${subscriberCount}`,
        ]
          .filter(Boolean)
          .join("\n"),
      });
    } catch {
      /* digest is best-effort */
    }
  }

  return NextResponse.json({ due: due.length, sent, skipped, noRecipients });
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
  to: string
) {
  /* Signups are stored lower-cased; the exact spelling is tried too, for
     any row saved before that. */
  const { data: subs, error: subError } = await service
    .from("voting_info_subscription")
    .select("email, unsubscribe_token, zip5")
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

  /* The next reminder THIS subscriber will get: their county's dates when
     it has its own (0043), the statewide ones otherwise — the same scope
     the scheduled run gives them. */
  let county: string | null;
  try {
    county = (await zipCounties(service, [sub.zip5])).get(sub.zip5) ?? null;
  } catch {
    return NextResponse.json(
      { error: "ZIP lookup failed — nothing was sent." },
      { status: 502 }
    );
  }
  const scope = county && countiesWithOwnDates(events).includes(county) ? county : null;
  const next = nextReminder(eventsForCounty(events, scope), today);
  if (!next) {
    return NextResponse.json(
      { error: "No upcoming reminder to rehearse — nothing was sent." },
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

  const rendered = renderTemplate(
    next.reminder.template_id,
    reminderParams(next.reminder.event)
  );
  const resend = new Resend(resendApiKey());
  const { error: sendError } = await resend.batch.send([
    {
      from: process.env.EMAIL_FROM!,
      to: sub.email,
      subject: `[Rehearsal] ${rendered.subject ?? rendered.title}`,
      text: reminderText(rendered, sub.unsubscribe_token),
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
