import * as Sentry from "@sentry/nextjs";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { coveredCounty } from "@/lib/counties";
import {
  activeSubscribers,
  BATCH_PACING_MS,
  BATCH_SIZE,
  COHORT_FUSE,
  reminderText,
  zipCounties,
} from "@/lib/notifications/cohort";
import { emailSenderConfigured } from "@/lib/notifications/config";
import {
  CORRECTION_EVENT_TYPE,
  correctionDedupeKey,
  correctionReaches,
  correctionTarget,
  parseCorrectionRequest,
  renderCorrection,
  type ElectionEventRow,
} from "@/lib/notifications/correction";
import {
  verifiedElectionEvents,
  type ElectionEvent,
} from "@/lib/notifications/election-events";
import { countiesWithOwnDates, easternToday } from "@/lib/notifications/schedule";
import type { Rendered } from "@/lib/notifications/templates";
import { secretEquals } from "@/lib/secret-compare";
import { resendApiKey } from "@/lib/server-keys";
import { createServiceClient } from "@/lib/supabase/service";

/* Manual correction send (design doc §7 playbook; plan C3). The one
   pre-approved manual broadcast: the `correction` template, stating a date
   the founder has already verified, to every active subscriber that date
   applies to now. That is not limited to the people the wrong date
   reached: someone who subscribed after it went out gets the correction
   too. Every decision that needs no database is in
   src/lib/notifications/correction.ts, driven by
   scripts/verify-correction.ts. Runbook:
   docs/general-election/reminders-e2e-runbook.md, "Sending a correction".

   Who calls it: the founder, by hand, with CORRECTION_SECRET in an
   x-correction-secret header. Not CRON_SECRET: that one is held by Vercel
   Cron and by any scheduled caller, and it should not also be able to
   mail the whole list. Without CORRECTION_SECRET set the route refuses
   everything (503). Vercel Cron never calls it: the route is not in
   vercel.json and exports POST only, so a GET answers 405.

   Everything comes from the JSON body; a URL carrying any query parameter
   is refused (400) before anything is read. The rehearsal's reason holds
   here too: Vercel's request logs keep every URL with its query string,
   and a rehearsal address there would stay in them. It also means the dry
   run and the send are the same document with one key changed.

   Three modes, exactly one per call:
   - {"dry_run": true}: the rendered subject and text and the recipient
     count. Sends nothing and writes nothing (it reads the send log, to say
     whether this correction already went out).
   - {"rehearse": "<address>"}: sends the correction to that one address,
     which must hold an active subscription, with "[Rehearsal]" in the
     subject, under a synthetic "rehearsal:" key, like the reminder cron's
     rehearsal. It also says whether that address is in the real cohort.
   - {"confirm_recipients": N, "confirm_key": K}: the real send, and only
     when N equals the recipient count right now and K is this
     correction's dedupe_key. The founder cannot mass-send by accident: the
     only way to both is this correction's dry run, which shows the email.

   Before any mode, the guard (correctionTarget): the date and details_url
   must be those of a verified election_event row of the type the label
   names, statewide, or the county's own row when county_fips is given.

   NOTIFICATIONS_PAUSED is deliberately NOT consulted. The playbook pauses
   the reminders while a correction is prepared, so a correction is exactly
   what gets sent while they are paused. If the pause blocked it, sending
   the correction would mean first resuming the very schedule that sent the
   wrong date. Its own secret, the verified-date guard and the confirmed
   key and count are this route's safety instead.

   The real send follows send-reminders: the cohort is read and the fuse
   checked before anything is claimed; the claim is INSERT ... ON CONFLICT
   DO NOTHING on correction:<election>:<event_type>:<date>[:<county>], so a
   second send of the same correction answers "already sent"; addresses
   are mailed once each, lower-cased; batches of 100 with BATCH_PACING_MS
   between calls; and any send failure releases the claim, so a re-run
   retries (some recipients may get a duplicate, the accepted cost, design
   doc §7). A short digest goes to EMAIL_FROM afterwards. */

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  if (!process.env.CORRECTION_SECRET) {
    return NextResponse.json(
      {
        error:
          "Corrections are off: CORRECTION_SECRET is not set in this environment. Nothing was sent.",
      },
      { status: 503 }
    );
  }
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (Array.from(request.nextUrl.searchParams.keys()).length > 0) {
    return NextResponse.json(
      {
        error:
          "Send every field in the JSON body, nothing in the URL. Nothing was sent.",
      },
      { status: 400 }
    );
  }

  let raw = "";
  try {
    raw = await request.text();
  } catch {
    /* an unreadable body parses as invalid below */
  }
  const parsed = parseCorrectionRequest(raw);
  if ("invalid" in parsed) {
    return NextResponse.json({ error: parsed.invalid }, { status: 400 });
  }
  const { params, countyFips, mode } = parsed.request;

  /* A dry run sends nothing, so it needs no sender; the other two do. */
  if (mode.kind !== "dry_run" && !emailSenderConfigured()) {
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

  /* The guard reads the candidate rows with verified_by, so an unverified
     row is refused by name rather than reported missing. */
  const eventType = CORRECTION_EVENT_TYPE[params.event_label];
  const { data: rows, error: rowsError } = await service
    .from("election_event")
    .select("id, county_fips, event_type, election, event_date, rule, details_url, verified_by")
    .eq("election", params.election)
    .eq("event_type", eventType);
  if (rowsError) {
    return NextResponse.json(
      { error: "election_event read failed — nothing was sent." },
      { status: 502 }
    );
  }
  const guard = correctionTarget((rows ?? []) as ElectionEventRow[], params, countyFips);
  if ("refused" in guard) {
    return NextResponse.json(
      { error: `${guard.refused} Nothing was sent.` },
      { status: 422 }
    );
  }
  const { target } = guard;

  /* Scope comes from the verified rows the reminders read, so the
     correction reaches exactly the subscribers that row applies to. That
     reader answers [] on a failed read; the target missing from it means
     the read failed (or the row lost its stamp since the guard read). */
  const events = await verifiedElectionEvents(service, params.election);
  if (!events.some((e) => e.id === target.id)) {
    return NextResponse.json(
      { error: "Verified dates read failed — nothing was sent." },
      { status: 502 }
    );
  }

  const rendered = renderCorrection(target, params.event_label);
  const dedupeKey = correctionDedupeKey(target);
  const origin = request.nextUrl.origin;
  const scopeLabel = target.county_fips
    ? `${coveredCounty(target.county_fips)?.name ?? target.county_fips} County`
    : "statewide";

  if (mode.kind === "rehearse") {
    return rehearse(service, events, target, rendered, dedupeKey, mode.to, origin);
  }

  /* The cohort is read once, before anything is claimed, so a failed read
     leaves nothing to release. */
  const { count, error: countError } = await service
    .from("voting_info_subscription")
    .select("email", { count: "exact", head: true })
    .eq("active", true);
  if (countError || count === null) {
    return NextResponse.json(
      { error: "Cohort count failed — nothing claimed, nothing sent." },
      { status: 502 }
    );
  }
  if (count > COHORT_FUSE) {
    Sentry.captureException(
      new Error(`send-correction fuse: cohort ${count} > ${COHORT_FUSE}`)
    );
    return NextResponse.json(
      { error: "Cohort size fuse tripped — nothing sent." },
      { status: 500 }
    );
  }

  let cohort;
  try {
    cohort = await activeSubscribers(service, count, countiesWithOwnDates(events));
  } catch {
    return NextResponse.json(
      { error: "Cohort read failed — nothing claimed, nothing sent." },
      { status: 502 }
    );
  }

  /* One email per address, as the reminders do: the first row in token
     order is the one mailed, and its unsubscribe link is the one the voter
     sees. Lower-cased because rows stored before the signup route
     lower-cased addresses may differ only in case. */
  const mailed = new Set<string>();
  const recipients = cohort.filter((sub) => {
    if (!correctionReaches(events, target, sub.scope)) return false;
    const address = sub.email.toLowerCase();
    if (mailed.has(address)) return false;
    mailed.add(address);
    return true;
  });
  const subject = rendered.subject ?? rendered.title;

  if (mode.kind === "dry_run") {
    const { data: logged, error: logError } = await service
      .from("notification_send_log")
      .select("sent_at, recipient_count")
      .eq("dedupe_key", dedupeKey)
      .maybeSingle();
    return NextResponse.json({
      dry_run: true,
      dedupe_key: dedupeKey,
      scope: scopeLabel,
      /* null when the log could not be read: unknown, not "no". */
      already_sent: logError ? null : Boolean(logged),
      subject,
      text: reminderText(rendered, origin, "<unsubscribe token>"),
      recipients: recipients.length,
      active_subscriptions: count,
      next:
        recipients.length === 0
          ? "No active subscriber is in this correction's scope: there is nothing to send."
          : `To send, POST the same fields with "confirm_recipients": ${recipients.length} and "confirm_key": "${dedupeKey}" in place of "dry_run".`,
    });
  }

  /* ---- the real send ---------------------------------------------------- */

  if (recipients.length === 0) {
    return NextResponse.json(
      {
        error:
          "No active subscriber is in this correction's scope — nothing claimed, nothing sent.",
      },
      { status: 404 }
    );
  }
  /* The key ties the send to this correction's own dry run; the count is
     not echoed: the way to both is that dry run, which also shows the email
     about to go out. */
  if (mode.confirmKey !== dedupeKey) {
    return NextResponse.json(
      {
        error: `confirm_key is not this correction's key. Run the dry run for these exact fields and copy the dedupe_key it reports. Nothing was sent.`,
      },
      { status: 409 }
    );
  }
  if (mode.confirmRecipients !== recipients.length) {
    return NextResponse.json(
      {
        error: `confirm_recipients is ${mode.confirmRecipients}, which is not the number of addresses this correction reaches now. Run the dry run again and confirm the count it reports. Nothing was sent.`,
      },
      { status: 409 }
    );
  }

  /* Claim. ignoreDuplicates makes this INSERT ... ON CONFLICT DO NOTHING;
     an empty result means this correction was already sent. */
  const { data: claimed, error: claimError } = await service
    .from("notification_send_log")
    .upsert(
      { dedupe_key: dedupeKey },
      { onConflict: "dedupe_key", ignoreDuplicates: true }
    )
    .select("dedupe_key");
  if (claimError) {
    return NextResponse.json(
      { error: `Claim failed for ${dedupeKey} — nothing was sent.` },
      { status: 502 }
    );
  }
  if (!claimed || claimed.length === 0) {
    return NextResponse.json(
      {
        already_sent: true,
        dedupe_key: dedupeKey,
        error: `Already sent: ${dedupeKey} is in notification_send_log. Nothing was sent again.`,
      },
      { status: 409 }
    );
  }

  const resend = new Resend(resendApiKey());
  let delivered = 0;
  /* Paces every batch call in the run, as send-reminders does. */
  let batchCalls = 0;
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
          subject,
          text: reminderText(rendered, origin, sub.unsubscribe_token),
        }))
      );
      if (sendError) throw new Error(sendError.message);
      delivered += chunk.length;
    }
  } catch (err) {
    /* Retry-forward, as in send-reminders: release the claim so a re-run
       retries the whole correction. Duplicates for the recipients already
       reached are the accepted cost; a correction that silently never
       finishes is not (design doc §7). */
    await service.from("notification_send_log").delete().eq("dedupe_key", dedupeKey);
    Sentry.captureException(err);
    return NextResponse.json(
      {
        error: `Send failed for ${dedupeKey} after ${delivered} recipients — claim released. Fix the cause, then dry-run and send again; the first ${delivered} get a duplicate.`,
      },
      { status: 502 }
    );
  }

  await service
    .from("notification_send_log")
    .update({ recipient_count: delivered })
    .eq("dedupe_key", dedupeKey);

  /* Founder digest, as after a reminder send. Best-effort: a digest
     failure never fails a send that already went out. */
  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM!,
      to: process.env.EMAIL_FROM!,
      subject: `Know Your Vote correction sent — ${easternToday()}`,
      text: [
        `Correction sent: ${dedupeKey} -> ${delivered} recipients (${scopeLabel})`,
        `Subject: ${subject}`,
        ``,
        rendered.body,
        ``,
        `Active subscriptions (one per address and ZIP): ${count}`,
      ].join("\n"),
    });
  } catch {
    /* digest is best-effort */
  }

  return NextResponse.json({
    sent: true,
    dedupe_key: dedupeKey,
    scope: scopeLabel,
    recipients: delivered,
  });
}

/* CORRECTION_SECRET, its own secret (see the header), in its own header,
   compared in constant time. No Bearer form: nothing scheduled calls this. */
function authorized(request: NextRequest): boolean {
  const secret = process.env.CORRECTION_SECRET;
  if (!secret) return false;
  return secretEquals(request.headers.get("x-correction-secret"), secret);
}

/* REHEARSAL: the correction, word for word, to ONE address that already
   holds an active subscription, as send-reminders' rehearsal does. The
   subject says "[Rehearsal]"; the text is the real one, unsubscribe link
   included. The claim is a synthetic key, unique per run, so the real
   correction's key stays free. Like every row in notification_send_log,
   it holds a key and a count, never an address. in_cohort says whether
   the real send would reach this address (a county correction reaches only
   that county's subscribers). */
async function rehearse(
  service: SupabaseClient,
  events: ElectionEvent[],
  target: ElectionEvent,
  rendered: Rendered,
  dedupeKey: string,
  to: string,
  origin: string
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

  const rehearsalKey = `rehearsal:${dedupeKey}:${new Date().toISOString()}`;
  const { error: claimError } = await service
    .from("notification_send_log")
    .insert({ dedupe_key: rehearsalKey });
  if (claimError) {
    return NextResponse.json(
      { error: "Rehearsal claim failed — nothing was sent." },
      { status: 502 }
    );
  }

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
    await service.from("notification_send_log").delete().eq("dedupe_key", rehearsalKey);
    return NextResponse.json(
      { error: `Rehearsal send failed: ${sendError.message} — claim released.` },
      { status: 502 }
    );
  }

  await service
    .from("notification_send_log")
    .update({ recipient_count: 1 })
    .eq("dedupe_key", rehearsalKey);
  return NextResponse.json({
    rehearsal: true,
    dedupe_key: rehearsalKey,
    real_dedupe_key: dedupeKey,
    in_cohort: correctionReaches(events, target, scope),
    recipients: 1,
  });
}
