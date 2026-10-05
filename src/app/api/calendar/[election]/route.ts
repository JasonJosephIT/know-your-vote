import { NextRequest, NextResponse } from "next/server";
import { verifiedElectionEvents } from "@/lib/notifications/election-events";
import { buildElectionCalendar, ELECTION_LABEL } from "@/lib/notifications/ics";
import { eventsForCounty } from "@/lib/notifications/schedule";
import { createServiceClient } from "@/lib/supabase/service";

/* GET /api/calendar/[election].ics — verified dates as a calendar file
   (plan A6). The zero-infrastructure reminder channel: no email, no
   subscription row, the voter's own calendar app does the reminding.
   Unverified rows never appear (verifiedElectionEvents filters them).

   ?county=<FIPS> gives that county's dates where it has its own (0043):
   all four covered counties run early voting Oct 19 to Nov 1, wider than
   the statewide Oct 24 to Oct 31. Without it, or for a county with no rows
   of its own, the statewide dates. The banner, the races view and the
   welcome email link the county file when they know the county. */

const FIPS_RE = /^\d{5}$/;

export async function GET(
  request: NextRequest,
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

  const county = request.nextUrl.searchParams.get("county");
  const events = eventsForCounty(
    await verifiedElectionEvents(service, election),
    county && FIPS_RE.test(county) ? county : null
  );
  return new NextResponse(buildElectionCalendar(election, events), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${election}.ics"`,
      /* Dates change ~never once verified; let the CDN hold them an hour. */
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
