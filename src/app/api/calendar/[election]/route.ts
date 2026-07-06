import { NextRequest, NextResponse } from "next/server";
import { verifiedStatewideEvents } from "@/lib/notifications/election-events";
import { buildElectionCalendar, ELECTION_LABEL } from "@/lib/notifications/ics";
import { createServiceClient } from "@/lib/supabase/service";

/* GET /api/calendar/[election].ics — verified statewide dates as a calendar
   file (plan A6). The zero-infrastructure reminder channel: no email, no
   subscription row, the voter's own calendar app does the reminding.
   Unverified rows never appear (verifiedStatewideEvents filters them). */

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ election: string }> }
) {
  const { election: raw } = await params;
  if (!raw.endsWith(".ics")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const election = raw.slice(0, -".ics".length);
  if (!(election in ELECTION_LABEL)) {
    return NextResponse.json({ error: "Unknown election" }, { status: 404 });
  }

  let service;
  try {
    service = createServiceClient();
  } catch {
    return NextResponse.json(
      { error: "Calendar data isn't available right now — try again shortly." },
      { status: 503 }
    );
  }

  const events = await verifiedStatewideEvents(service, election);
  return new NextResponse(buildElectionCalendar(election, events), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${election}.ics"`,
      /* Dates change ~never once verified; let the CDN hold them an hour. */
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
