import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { geocoderConfigured, suggestAddresses } from "@/lib/geocode";

/* POST, not GET, and that is not a style choice: the body carries a partial home
   address. A GET would put it in the URL, which means the access log, the
   Referer header and the browser's own history. Nothing here is logged or
   stored (spec §8).

   The 5-character floor and the client's debounce are the cost control. On a
   self-hosted Pelias that is load rather than money, but the floor earns its
   keep either way: a two-character prefix matches half of Florida. */
const body = z.object({
  q: z.string().min(5).max(120),
});

export async function POST(request: NextRequest) {
  const { allowed } = rateLimit(
    `addr-suggest:${clientKey(request)}`,
    30,
    60_000
  );
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests — give it a minute and try again." },
      { status: 429 }
    );
  }

  /* Address completion is optional. With no geocoder configured the field still
     takes a ZIP and the district picker still works, so this is a degraded
     feature rather than a broken page. */
  if (!geocoderConfigured()) {
    return NextResponse.json(
      { suggestions: [], unavailable: true },
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

  /* suggestAddresses swallows its own failures and returns []; an empty dropdown
     is the right answer for "we could not complete that", and the voter still
     has ZIP and the picker. */
  const suggestions = await suggestAddresses(parsed.data.q);
  return NextResponse.json({ suggestions });
}
