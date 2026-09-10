import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { placeLocation, placesConfigured } from "@/lib/geocode";
import { blockForCoordinates } from "@/lib/census-block";
import { resolveBlock, resolveDistrict } from "@/lib/resolve";
import type { ResolveResult } from "@/types/app";

/* Place -> coordinate -> census block -> district -> ballot.

   The address is never part of this: the request carries a place id, Google
   answers with a coordinate, and Census sees only that coordinate. Nothing on
   this path is logged or stored. */
const body = z.object({
  placeId: z.string().min(1).max(300),
  sessionToken: z.string().uuid(),
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
  if (!placesConfigured()) {
    return NextResponse.json(
      { error: "Address lookup is unavailable." },
      { status: 503 }
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
    const place = await placeLocation(
      parsed.data.placeId,
      parsed.data.sessionToken
    );
    if (!place) {
      return NextResponse.json(
        {
          error:
            "We couldn't pin that address — try your ZIP or pick your district.",
        },
        { status: 502 }
      );
    }

    const block = await blockForCoordinates(place.lat, place.lng);
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
    if (block.state !== "12") return NextResponse.json(OUT_OF_COVERAGE);

    const resolved = await resolveBlock(block.geoid);
    if (!resolved) return NextResponse.json(OUT_OF_COVERAGE);

    const result = await resolveDistrict(
      resolved.countyFips,
      resolved.district
    );
    if (!result) return NextResponse.json(OUT_OF_COVERAGE);
    return NextResponse.json(result);
  } catch {
    /* No logging, deliberately: an error message on this path can carry the
       coordinate, and a coordinate is the voter's home. */
    return NextResponse.json(
      { error: "Something went wrong looking that up — try again." },
      { status: 500 }
    );
  }
}
