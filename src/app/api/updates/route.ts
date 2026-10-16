import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { FL_COUNTIES } from "@/lib/fl-counties";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { resendApiKey, updatesSignupConfigured } from "@/lib/server-keys";
import { updatesSignup } from "@/lib/updates-signup";

/* The stay-informed signup on /civics: adds the email to the Resend
   segment the updates are sent to (RESEND_UPDATES_SEGMENT_ID), with the
   county as a contact property for county news. That is all it stores, and
   only in Resend; Resend's broadcasts carry the unsubscribe link.

   Resend needs a `county` contact property and the segment set up in its
   dashboard first. Without the key or the segment id the route answers 503
   and the page doesn't offer the form (updatesSignupConfigured).

   Never logged: the body is an email address. A 400 names its field, as
   /api/voting-info does, so the form puts the message under it. */

export async function POST(request: NextRequest) {
  const { allowed } = rateLimit(`updates:${clientKey(request)}`, 5, 60_000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests — give it a minute and try again." },
      { status: 429 }
    );
  }

  let parsed;
  try {
    parsed = updatesSignup.safeParse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { error: issue?.message ?? "Invalid request", field: issue?.path[0] },
      { status: 400 }
    );
  }

  const segmentId = process.env.RESEND_UPDATES_SEGMENT_ID;
  if (!updatesSignupConfigured() || !segmentId) {
    return NextResponse.json(
      { error: "Signups aren't switched on yet — nothing was saved." },
      { status: 503 }
    );
  }

  /* One spelling per address, as /api/voting-info does. */
  const email = parsed.data.email.toLowerCase();
  const county = FL_COUNTIES.find((c) => c.fips === parsed.data.countyFips)!.name;
  const contacts = new Resend(resendApiKey()).contacts;

  /* A new address is created in the segment. One already in Resend (an
     earlier signup, or someone who unsubscribed and is asking again) is
     updated and added to the segment instead. */
  const created = await contacts.create({
    email,
    unsubscribed: false,
    properties: { county },
    segments: [{ id: segmentId }],
  });
  if (created.error) {
    const updated = await contacts.update({ email, unsubscribed: false, properties: { county } });
    const added = updated.error ? null : await contacts.segments.add({ email, segmentId });
    if (!added || added.error) {
      return NextResponse.json(
        { error: "We couldn't sign you up just now — try again shortly." },
        { status: 502 }
      );
    }
  }

  return NextResponse.json({ ok: true });
}
