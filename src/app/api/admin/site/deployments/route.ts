import { NextResponse } from "next/server";
import { checkAdmin } from "@/lib/admin/guard";
import { getDeployments } from "@/lib/admin/site";

/* GET /api/admin/site/deployments (design.md § 4; AFR-040).
   checkAdmin() reads the session cookie, so this handler is dynamic — the ~60s
   cache lives on the Vercel fetch inside getDeployments(), not the route. The
   in-handler check is the real boundary (proxy is UX only). */
export async function GET() {
  const gate = await checkAdmin();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const result = await getDeployments();
  switch (result.kind) {
    case "unavailable":
      return NextResponse.json({ unavailable: `${result.missing} missing` });
    case "error":
      return NextResponse.json(
        { error: "Vercel API error", status: result.status },
        { status: 502 }
      );
    case "ok":
      return NextResponse.json({
        production: result.production,
        previews: result.previews,
        fetchedAt: result.fetchedAt,
      });
  }
}
