import { NextResponse } from "next/server";
import { adminApiGuard } from "@/lib/admin/api";
import { getHealth } from "@/lib/admin/monitor";

/* GET /api/health (design.md § 4; PRD AFR-004). Reports Supabase reachability,
   0005/0006 applied-or-not, newest agent_run per agent, and the daily-cron
   heartbeat age.

   AUTH-GATED ON PURPOSE: an unauthenticated caller gets 401 and learns nothing
   — no ops detail leaks anon (design.md § 4). This is NOT a public liveness
   probe; it is the operator's health view. Always live (no cache): the whole
   point is a current answer. */
export const dynamic = "force-dynamic";

export async function GET() {
  const gate = await adminApiGuard();
  if (gate instanceof NextResponse) return gate;

  const health = await getHealth();
  return NextResponse.json(health);
}
