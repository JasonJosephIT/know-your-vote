import { NextRequest } from "next/server";
import {
  subscriptionStore,
  unsubscribeResponse,
} from "@/lib/notifications/unsubscribe";
import { createServiceClient } from "@/lib/supabase/service";

/* The unsubscribe link (PRD § 4: the token is the credential). GET (and
   HEAD, which Next.js answers with GET) shows a confirm page and never
   writes, because mail scanners open links; POST, from that page's button
   or from a mail app's one-click Unsubscribe (RFC 8058), unsubscribes.
   Both answer HTML pages. The why, the pages and the queries are in
   src/lib/notifications/unsubscribe.ts, which
   scripts/verify-unsubscribe.ts drives. */

/* createServiceClient throws without the service-role key; inside
   unsubscribeResponse that is the "try again shortly" page, a 503. */
const openStore = () => subscriptionStore(createServiceClient());

export async function GET(request: NextRequest) {
  return unsubscribeResponse(
    "GET",
    request.nextUrl.searchParams.get("token"),
    openStore
  );
}

export async function POST(request: NextRequest) {
  return unsubscribeResponse(
    "POST",
    request.nextUrl.searchParams.get("token"),
    openStore
  );
}
