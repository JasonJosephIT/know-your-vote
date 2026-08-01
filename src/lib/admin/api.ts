import "server-only";

import { NextResponse } from "next/server";
import { checkAdmin } from "./guard";

/* The API-route half of the authorization boundary (design.md § 4/§ 5). Every
   /api/admin/* handler and /api/health calls this FIRST and returns the
   NextResponse verbatim when it comes back — so an unauthenticated caller gets a
   JSON 401 (never a redirect to an HTML page, never any ops detail), and a
   signed-in-but-not-allowlisted caller gets 403. On success it hands back the
   operator's email for the audit trail (admin_action.actor).

   Usage:
     const gate = await adminApiGuard();
     if (gate instanceof NextResponse) return gate;
     // gate.email is the allowlisted operator */
export async function adminApiGuard(): Promise<
  { email: string } | NextResponse
> {
  const gate = await checkAdmin();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  return { email: gate.email };
}
