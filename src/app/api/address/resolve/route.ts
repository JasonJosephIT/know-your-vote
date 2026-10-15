import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import type { Point } from "@/lib/address-lookup";
import { looksLikeStreetAddress } from "@/lib/address-text";
import { blockForCoordinates } from "@/lib/census-block";
import { addressCoverage } from "@/lib/coverage";
import {
  addressEntryEnabled,
  geocodeAddress,
  placeLocation,
} from "@/lib/geocode";
import {
  resolveBlock,
  resolveDistrict,
  resolveStatewideOnly,
} from "@/lib/resolve";
import type { ResolveResult } from "@/types/app";

/* Address -> point (Google) -> census block (Census) -> district -> ballot,
   from one of two inputs.

   { placeId, sessionToken }: the voter picked a Google suggestion. Place
   Details answers its point, in the same billing session as the
   suggestions.

   { address }: the voter typed the address and pressed Enter without
   picking. Google's Geocoding API answers the point, and every result is
   checked against the voter's words first (address-lookup.ts).

   Either way the address is in this request's body, never a URL, and
   nothing here is logged or stored; the Census Bureau sees only the point. */
const body = z.union([
  z.object({
    placeId: z.string().min(1).max(300),
    sessionToken: z.string().uuid(),
  }),
  z.object({ address: z.string().trim().min(5).max(200) }),
]);

const OUT_OF_COVERAGE: ResolveResult = {
  zip: "",
  inCoverage: false,
  races: [],
  message: "We don't cover this area yet.",
};

/* 422 is "Google answered, and the answer is about what was typed": the
   field says what to fix. `reason` picks the words (LocationEntry). */
function unmatched(
  reason: "none" | "needsPlace" | "placeConflict" | "checkStreet" | "ambiguous"
) {
  return NextResponse.json({ error: "No single match", reason }, { status: 422 });
}

export async function POST(request: NextRequest) {
  if (!addressEntryEnabled()) {
    return NextResponse.json(
      { error: "Address lookup is off — choose your district." },
      { status: 503 }
    );
  }
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
    let point: Point | null;
    if ("address" in parsed.data) {
      /* No house number or no street: no geocoder can place it, so it isn't
         sent. The field said so before submitting; this is the same rule. */
      if (!looksLikeStreetAddress(parsed.data.address)) return unmatched("none");
      const match = await geocodeAddress(parsed.data.address);
      if (match?.kind === "outOfState") return NextResponse.json(OUT_OF_COVERAGE);
      if (match?.kind === "ambiguous") {
        /* The voter's words fit more than one point. When every one of them
           sits in the same district and county, that is still one answer;
           otherwise ask. resolveBlock reads a cached table, not the
           network; each point is one Census call. */
        const places = await Promise.all(
          match.points.map(async (p) => {
            const b = await blockForCoordinates(p.lat, p.lon);
            const placed = b ? await resolveBlock(b.geoid) : null;
            return placed ? `${placed.district}|${placed.countyFips}` : "statewide";
          })
        );
        if (new Set(places).size !== 1) return unmatched("ambiguous");
        point = match.points[0];
      } else if (match && match.kind !== "match") {
        return unmatched(match.kind);
      } else {
        point = match?.point ?? null;
      }
    } else {
      point = await placeLocation(parsed.data.placeId, parsed.data.sessionToken);
    }
    const block = point ? await blockForCoordinates(point.lat, point.lon) : null;
    if (!block) {
      return NextResponse.json(
        {
          error:
            "We couldn't match that address to a district — choose your district.",
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
       coordinate or the address, and either is the voter's home. */
    return NextResponse.json(
      { error: "Something went wrong looking that up — try again." },
      { status: 500 }
    );
  }
}
