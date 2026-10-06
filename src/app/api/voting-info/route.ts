import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";
import {
  emailSenderConfigured,
  officialSources,
  remindersPaused,
} from "@/lib/notifications/config";
import { verifiedElectionEvents } from "@/lib/notifications/election-events";
import { easternToday, eventsForCounty } from "@/lib/notifications/schedule";
import { welcomeEmail } from "@/lib/notifications/templates";
import { welcomeSentWithinWindow } from "@/lib/notifications/welcome-throttle";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { resolveZip, ZIP_RE } from "@/lib/resolve";
import { resendApiKey } from "@/lib/server-keys";
import { siteOrigin, unsubscribeHeaders, unsubscribeUrl } from "@/lib/site-url";
import { createServiceClient } from "@/lib/supabase/service";

/* Where-to-vote opt-in email (FR-010) — the ONLY flow that handles personal
   data. Stores email, zip, consent timestamp, unsubscribe token, whether
   the address is still subscribed and when the welcome was last sent,
   nothing else, and never claims success when delivery failed (PRD § 11).

   The welcome email goes at most once a day per address and ZIP, and at
   most three times a day per address (src/lib/notifications/
   welcome-throttle.ts): a repeat is saved but sends nothing, and answers
   with the status and body a send does. */

const body = z.object({
  zip: z.string().regex(ZIP_RE, "Invalid ZIP"),
  email: z.string().email("Invalid email").max(254),
  consent: z.literal(true, { message: "Consent required" }),
});

export async function POST(request: NextRequest) {
  const { allowed } = rateLimit(`voting-info:${clientKey(request)}`, 5, 60_000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests — give it a minute and try again." },
      { status: 429 }
    );
  }

  let parsed;
  try {
    parsed = body.safeParse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Invalid request";
    return NextResponse.json({ error: first }, { status: 400 });
  }
  const { zip } = parsed.data;
  /* One address, one spelling. The table is unique on (email, zip5) and
     email is case-sensitive TEXT, so "Ana@x.com" and "ana@x.com" used to be
     two subscriptions and two copies of every reminder. Mail providers
     treat the address case-insensitively in practice; the live table held
     no mixed-case rows when this landed (2026-10-04, 0 rows in all). */
  const email = parsed.data.email.trim().toLowerCase();

  const resolved = await resolveZip(zip);
  if (!resolved.inCoverage || !resolved.county) {
    return NextResponse.json(
      { error: "We don't cover that ZIP yet — we can only send info for the four covered metros." },
      { status: 400 }
    );
  }
  const sources = officialSources(resolved.county);

  /* Same check, same 503, same words as before src/lib/notifications/
     config.ts existed — it is now the one place that decides it. A missing
     service-role key still lands in the createServiceClient catch below,
     exactly as it did. */
  if (!emailSenderConfigured()) {
    return NextResponse.json(
      { error: "Email delivery isn't configured yet — nothing was sent or stored." },
      { status: 503 }
    );
  }

  let service;
  try {
    service = createServiceClient();
  } catch {
    return NextResponse.json(
      { error: "We couldn't save your request — nothing was sent. Try again shortly." },
      { status: 503 }
    );
  }

  const { data: subscription, error: upsertError } = await service
    .from("voting_info_subscription")
    .upsert(
      { email, zip5: zip, active: true },
      { onConflict: "email,zip5" }
    )
    .select("unsubscribe_token")
    .single();
  if (upsertError || !subscription) {
    return NextResponse.json(
      { error: "We couldn't save your request — nothing was sent. Try again shortly." },
      { status: 503 }
    );
  }

  /* One welcome email per address and ZIP per 24 hours (three per address),
     so this endpoint can't be used to flood someone's inbox or spend the
     Resend quota. The row above is saved (or switched back on) either way.
     A skipped send returns the status and body a real one does; it answers
     sooner, which welcome-throttle.ts lists among its known limits. If the
     check itself fails, nothing is sent and the voter is told so, as for a
     failed send. */
  let sentRecently: boolean;
  try {
    sentRecently = await welcomeSentWithinWindow(service, email, zip);
  } catch {
    return NextResponse.json(
      { error: "We saved your request but the email didn't send — try again shortly." },
      { status: 502 }
    );
  }
  if (sentRecently) return signedUp();

  /* Dates come from founder-verified election_event rows (plan A5), the
     voter's county's own where it has them (0043: early voting opens Oct 19
     in all four covered counties). The copy, and which dates it lists on a
     given Florida day, live in welcomeEmail (src/lib/notifications/
     templates.ts), where scripts/verify-reminder-schedule.ts renders it for
     every day of the run-up. */
  const events = eventsForCounty(
    await verifiedElectionEvents(service, "general_2026"),
    resolved.countyFips ?? null
  );
  const message = welcomeEmail({
    zip,
    county: resolved.county,
    district: resolved.district ?? null,
    office: sources.office,
    stateUrl: sources.state.url,
    /* The site's fixed address (src/lib/site-url.ts), not this request's:
       a signup that arrives on a preview or *.vercel.app address must
       still send links to the site. */
    origin: siteOrigin(),
    unsubscribeUrl: unsubscribeUrl(subscription.unsubscribe_token),
    events,
    today: easternToday(),
    hasRaces: resolved.races.length > 0,
    remindersOn: !remindersPaused(),
  });

  const resend = new Resend(resendApiKey());
  const { error: sendError } = await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: email,
    subject: message.subject,
    text: message.text,
    /* The mail app's own Unsubscribe button, on the same link as the
       email's footer (RFC 8058; src/lib/site-url.ts). */
    headers: unsubscribeHeaders(subscription.unsubscribe_token),
  });

  if (sendError) {
    return NextResponse.json(
      { error: "We saved your request but the email didn't send — try again shortly." },
      { status: 502 }
    );
  }

  /* The stamp the 24-hour check reads. Best-effort, as before: if it
     fails, the next signup for this address sends again. */
  await service
    .from("voting_info_subscription")
    .update({ last_sent_at: new Date().toISOString() })
    .eq("unsubscribe_token", subscription.unsubscribe_token);

  return signedUp();
}

/* The one success answer, whether this request sent the welcome email or
   skipped it as a repeat within 24 hours. One function, so the two can
   never drift apart. */
function signedUp() {
  return NextResponse.json({ ok: true });
}
