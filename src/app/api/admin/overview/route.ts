import { NextResponse } from "next/server";
import { adminApiGuard } from "@/lib/admin/api";
import { getOverview } from "@/lib/admin/monitor";

/* GET /api/admin/overview (design.md § 4; PRD AFR-001). The six-section
   snapshot the Overview page renders — each section carries its own
   PanelState (ok / empty / degraded / error) so numbers are always measured,
   never estimated. Auth-gated; always live (no cache, design.md § 5). */
export const dynamic = "force-dynamic";

export async function GET() {
  const gate = await adminApiGuard();
  if (gate instanceof NextResponse) return gate;

  const overview = await getOverview();
  return NextResponse.json(overview);
}
