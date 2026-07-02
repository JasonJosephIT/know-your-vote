import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAnonServerClient } from "@/lib/supabase/server";

const params = z.object({
  ids: z
    .string()
    .transform((s) => s.split(",").filter(Boolean))
    .pipe(z.array(z.string().regex(/^[\w-]+$/)).max(50)),
});

/* Summaries for the device-local saved list. Anon + RLS: only candidates in
   published races resolve; stale saved ids simply drop out. */
export async function GET(request: NextRequest) {
  const parsed = params.safeParse({
    ids: request.nextUrl.searchParams.get("ids") ?? "",
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid ids" }, { status: 400 });
  }

  const supabase = await createAnonServerClient();
  const [candidatesRes, socialsRes] = await Promise.all([
    supabase
      .from("candidate")
      .select("candidate_id, legal_name, party, office_sought, official_site")
      .in("candidate_id", parsed.data.ids),
    supabase
      .from("candidate_social_account")
      .select("candidate_id, handle, platform, url")
      .in("candidate_id", parsed.data.ids)
      .eq("status", "verified"),
  ]);

  const socials = socialsRes.data ?? [];
  const order = new Map(parsed.data.ids.map((id, i) => [id, i]));
  const candidates = (candidatesRes.data ?? [])
    .sort(
      (a, b) =>
        (order.get(a.candidate_id) ?? 0) - (order.get(b.candidate_id) ?? 0)
    )
    .map((c) => ({
      ...c,
      handles: socials.filter((s) => s.candidate_id === c.candidate_id),
    }));

  return NextResponse.json({ candidates });
}
