import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { blockForCoordinates } from "@/lib/census-block";
import { addressCoverage } from "@/lib/coverage";
import {
  resolveBlock,
  resolveDistrict,
  resolveStatewideOnly,
} from "@/lib/resolve";
import type { ResolveResult } from "@/types/app";

/* Coordinate -> census block -> district -> ballot.

   No address is on this path at all. Pelias returned the coordinate alongside
   the suggestion, so the browser posts the coordinate of the address the voter
   picked and the Census Bureau sees only that. Nothing here is logged or
   stored.

   Trusting a client-supplied coordinate costs nothing: the district picker
   already lets anyone choose any district outright, so there is no privilege to
   escalate -- only a ballot to look at. The bounds check below is a sanity
   guard against nonsense, not a security control. */
const body = z.object({
  lat: z.number().gte(24.3963).lte(31.0011),
  lon: z.number().gte(-87.6349).lte(-79.9743),
});

const OUT_OF_COVERAGE: ResolveResult = {
  zip: "",
  inCoverage: false,
  races: [],
  message: "We don't cover this area yet.",
};

export async function POST(request: NextRequest) {
  const { allowed } = rateLimit(
    `addr-resolve:${clientKey(request)}`,
    20,
    60_000
  );
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
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const block = await blockForCoordinates(parsed.data.lat, parsed.data.lon);
    if (!block) {
      return NextResponse.json(
        {
          error:
            "We couldn't match that address to a district — try your ZIP or pick your district.",
        },
        { status: 502 }
      );
    }

    /* Florida is 12. A non-Florida address is out of coverage rather than an
       error: this is a Florida voter guide, and the copy should say so. */
    if (addressCoverage(block.state, null) === "out_of_state") {
      return NextResponse.json(OUT_OF_COVERAGE);
    }

    /* Coverage is decided by the address, not by the ZIP table. A Florida
       block we cannot place in a district still has the statewide ballot, so
       it gets that ballot and an honest "statewide only" -- never "we don't
       cover this area", which hid races the voter really has. */
    const placed = await resolveBlock(block.geoid);
    const result =
      addressCoverage(block.state, placed) === "district" && placed
        ? await resolveDistrict(placed.countyFips, placed.district)
        : null;
    return NextResponse.json(result ?? (await resolveStatewideOnly()));
  } catch {
    /* No logging, deliberately: an error message on this path can carry the
       coordinate, and a coordinate is the voter's home. */
    return NextResponse.json(
      { error: "Something went wrong looking that up — try again." },
      { status: 500 }
    );
  }
}
