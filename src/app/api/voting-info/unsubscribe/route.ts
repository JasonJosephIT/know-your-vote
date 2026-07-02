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
    .select("id");

  if (error || !data || data.length === 0) {
    return NextResponse.json({ error: "Unknown token" }, { status: 404 });
  }

  return new NextResponse(
    "You're unsubscribed. We won't email you again unless you ask.",
    { status: 200, headers: { "Content-Type": "text/plain" } }
  );
}
