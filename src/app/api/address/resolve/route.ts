import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import type { CensusBlock } from "@/lib/address-lookup";
import { looksLikeStreetAddress } from "@/lib/address-text";
import { blockForAddress, blockForCoordinates } from "@/lib/census-block";
import { addressCoverage } from "@/lib/coverage";
import { addressEntryEnabled } from "@/lib/geocode";
import {
  resolveBlock,
  resolveDistrict,
  resolveStatewideOnly,
} from "@/lib/resolve";
import type { ResolveResult } from "@/types/app";

/* Census block -> district -> ballot, from one of two inputs.

   { lat, lon }: Pelias returned the coordinate alongside the suggestion, so
   the browser posts the coordinate of the address the voter picked and the
   Census Bureau sees only that.

   { address }: no Pelias (production), so the voter typed the whole address
   and pressed Enter. It goes to the Census Bureau's one-line geocoder, which
   answers the block in the same call. The address is in this request's
   body, never a URL, and nothing here is logged or stored.

   Trusting a client-supplied coordinate costs nothing: the district picker
   already lets anyone choose any district outright, so there is no privilege to
   escalate -- only a ballot to look at. The bounds check below is a sanity
   guard against nonsense, not a security control. */
const body = z.union([
  z.object({
    lat: z.number().gte(24.3963).lte(31.0011),
    lon: z.number().gte(-87.6349).lte(-79.9743),
  }),
  z.object({ address: z.string().trim().min(5).max(200) }),
]);

const OUT_OF_COVERAGE: ResolveResult = {
  zip: "",
  inCoverage: false,
  races: [],
  message: "We don't cover this area yet.",
};

/* 422 is "Census answered, and the answer is about what was typed": the
   field says what to fix. `reason` picks the words (LocationEntry). */
function unmatched(
  reason: "none" | "needsPlace" | "placeConflict" | "checkStreet" | "ambiguous"
) {
  return NextResponse.json({ error: "No single match", reason }, { status: 422 });
}

export async function POST(request: NextRequest) {
  if (!addressEntryEnabled()) {
    return NextResponse.json(
      { error: "Address lookup is off — use your ZIP or choose your district." },
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
    let block: CensusBlock | null;
    if ("address" in parsed.data) {
      /* No house number or no street: Census can't place it, so it isn't
         sent. The field said so before submitting; this is the same rule. */
      if (!looksLikeStreetAddress(parsed.data.address)) return unmatched("none");
      const match = await blockForAddress(parsed.data.address);
      if (match?.kind === "outOfState") return NextResponse.json(OUT_OF_COVERAGE);
      if (match?.kind === "ambiguous") {
        /* The voter's words fit more than one block. When every one of them
           sits in the same district and county, that is still one answer;
           otherwise ask. resolveBlock reads a cached table, not the
           network, so this costs nothing per block. */
        const places = await Promise.all(
          match.blocks.map((b) => resolveBlock(b.geoid))
        );
        const answers = new Set(
          places.map((p) => (p ? `${p.district}|${p.countyFips}` : "statewide"))
        );
        if (answers.size !== 1) return unmatched("ambiguous");
        block = match.blocks[0];
      } else if (match && match.kind !== "match") {
        return unmatched(match.kind);
      } else {
        block = match?.block ?? null;
      }
    } else {
      block = await blockForCoordinates(parsed.data.lat, parsed.data.lon);
    }
    if (!block) {
      return NextResponse.json(
        {
          error:
            "We couldn't match that address to a district — try your ZIP or choose your district.",
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
