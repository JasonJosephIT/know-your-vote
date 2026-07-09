import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";
import { verifiedStatewideEvents } from "@/lib/notifications/election-events";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { resolveZip, ZIP_RE } from "@/lib/resolve";
import { createServiceClient } from "@/lib/supabase/service";

/* Where-to-vote opt-in email (FR-010) — the ONLY flow that handles personal
   data. Stores exactly email + zip + consent timestamp + unsubscribe token,
   nothing else, and never claims success when delivery failed (PRD § 11). */

const OFFICIAL_SOURCES: Record<string, { name: string; url: string }> = {
  "Miami-Dade": {
    name: "Miami-Dade Supervisor of Elections",
    url: "https://www.miamidade.gov/global/elections/home.page",
  },
  Broward: {
    name: "Broward Supervisor of Elections",
    url: "https://www.browardvotes.gov",
  },
  Hillsborough: {
    name: "Hillsborough Supervisor of Elections",
    url: "https://www.votehillsborough.gov",
  },
  Orange: {
    name: "Orange County Supervisor of Elections",
    url: "https://www.ocfelections.gov",
  },
};

const body = z.object({
  zip: z.string().regex(ZIP_RE, "Invalid ZIP"),
  email: z.string().email("Invalid email").max(254),
  consent: z.literal(true, { message: "Consent required" }),
});

function formatDate(iso?: string) {
  if (!iso) return null;
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

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
  const { zip, email } = parsed.data;

  const resolved = await resolveZip(zip);
  if (!resolved.inCoverage || !resolved.county) {
    return NextResponse.json(
      { error: "We don't cover that ZIP yet — we can only send info for the four covered metros." },
      { status: 400 }
    );
  }
  const source = OFFICIAL_SOURCES[resolved.county];

  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
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

  /* Dates come from founder-verified election_event rows (plan A5) — an
     unverified or missing row simply drops its line from the email. */
  const events = await verifiedStatewideEvents(service, "general_2026");
  const byType = new Map(events.map((e) => [e.event_type, e]));
  const general = formatDate(
    resolved.races.length > 0 ? byType.get("election_day")?.event_date : undefined
  );
  const registration = formatDate(byType.get("registration_deadline")?.event_date);
  const unsubscribeUrl = `${request.nextUrl.origin}/api/voting-info/unsubscribe?token=${subscription.unsubscribe_token}`;

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error: sendError } = await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: `Where to vote in ${resolved.county} County`,
    text: [
      `Here's your voting info for ZIP ${zip} (${resolved.county} County${resolved.district ? `, ${resolved.district}` : ""}).`,
      ``,
      `Your polling place and sample ballot:`,
      `${source?.name ?? "Your county Supervisor of Elections"} — ${source?.url ?? "https://dos.fl.gov/elections/"}`,
      `(Precinct lookup on that site shows your exact polling place.)`,
      ``,
      registration ? `Registration deadline: ${registration}` : ``,
      general ? `General election: ${general}` : ``,
      registration || general
        ? `Add the key dates to your calendar: ${request.nextUrl.origin}/api/calendar/general_2026.ics`
        : ``,
      `Florida is a closed-primary state — party registration determines your primary ballot.`,
      ``,
      `Your ballot, laid out fairly: ${request.nextUrl.origin}`,
      ``,
      `You asked for this one-time email. Unsubscribe: ${unsubscribeUrl}`,
    ]
      .filter((line) => line !== ``)
      .join("\n"),
  });

  if (sendError) {
    return NextResponse.json(
      { error: "We saved your request but the email didn't send — try again shortly." },
      { status: 502 }
    );
  }

  await service
    .from("voting_info_subscription")
    .update({ last_sent_at: new Date().toISOString() })
    .eq("unsubscribe_token", subscription.unsubscribe_token);

  return NextResponse.json({ ok: true });
}
