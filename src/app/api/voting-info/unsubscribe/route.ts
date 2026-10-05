import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

/* The token is the credential (PRD § 4). */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  if (!/^[a-f0-9]{32}$/.test(token)) {
    return NextResponse.json({ error: "Unknown token" }, { status: 404 });
  }

  let service;
  try {
    service = createServiceClient();
  } catch {
    return NextResponse.json(
      { error: "Unsubscribe isn't available right now — try again shortly." },
      { status: 503 }
    );
  }

  const { data, error } = await service
    .from("voting_info_subscription")
    .update({ active: false })
    .eq("unsubscribe_token", token)
    .select("email");

  if (error || !data || data.length === 0) {
    return NextResponse.json({ error: "Unknown token" }, { status: 404 });
  }

  /* Rows are unique on (email, zip5), so a voter who signed up from two ZIPs
     holds two rows, and the cron (which dedupes by address) keeps mailing
     them while either row is active. The page below promises "we won't email
     you again", so every row for the address goes. Exact match on purpose:
     the signup route stores addresses trimmed and lower-cased, and ilike would
     read "_" in an address as a wildcard and could stop someone else's mail.
     A failure here is not reported: the token's own row is already off. */
  const email = data[0].email;
  if (email) {
    await service
      .from("voting_info_subscription")
      .update({ active: false })
      .eq("email", email)
      .eq("active", true);
  }

  return new NextResponse(
    "You're unsubscribed. We won't email you again unless you ask.",
    { status: 200, headers: { "Content-Type": "text/plain" } }
  );
}
