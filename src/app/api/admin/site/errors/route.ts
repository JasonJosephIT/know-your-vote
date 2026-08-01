import { NextResponse } from "next/server";
import { checkAdmin } from "@/lib/admin/guard";
import { getSentryIssues } from "@/lib/admin/site";

/* GET /api/admin/site/errors (design.md § 4; AFR-041).
   Two honest degraded shapes: `unavailable` (no token — panel names the var)
   vs `idle` (token wired but Sentry has no events yet). Dynamic, like the
   deployments route; the ~60s cache is on the Sentry fetch. */
export async function GET() {
  const gate = await checkAdmin();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const result = await getSentryIssues();
  switch (result.kind) {
    case "unavailable":
      return NextResponse.json({ unavailable: `${result.missing} missing` });
    case "idle":
      return NextResponse.json({ idle: true, fetchedAt: result.fetchedAt });
    case "error":
      return NextResponse.json(
        { error: "Sentry API error", status: result.status },
        { status: 502 }
      );
    case "ok":
      return NextResponse.json({
        issues: result.issues,
        fetchedAt: result.fetchedAt,
      });
  }
}
