import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAnonServerClient } from "@/lib/supabase/server";
import { resolveZip, ZIP_RE } from "@/lib/resolve";

const params = z.object({
  zip: z.string().regex(ZIP_RE).optional(),
  metro: z.enum(["miami", "fort_lauderdale", "tampa", "orlando"]).optional(),
  district: z
    .string()
    .regex(/^FL-\d{1,2}$/)
    .optional(),
});

/* News scoped to the voter: items for their races, their metro, or
   statewide (race_id and metro both null). Newest first (FR-009). */
export async function GET(request: NextRequest) {
  const parsed = params.safeParse({
    zip: request.nextUrl.searchParams.get("zip") ?? undefined,
    metro: request.nextUrl.searchParams.get("metro") ?? undefined,
    district: request.nextUrl.searchParams.get("district") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid location" }, { status: 400 });
  }

  let metro = parsed.data.metro ?? null;
  let raceIds: string[] = [];
  if (parsed.data.zip) {
    const resolved = await resolveZip(parsed.data.zip, parsed.data.district);
    if (resolved.inCoverage) {
      metro = (resolved.metro as typeof metro) ?? metro;
      raceIds = resolved.races.map((r) => r.raceId);
    }
  }

  const supabase = await createAnonServerClient();
  const scopes = ["and(race_id.is.null,metro.is.null)"];
  if (metro) scopes.push(`metro.eq.${metro}`);
  if (raceIds.length > 0) scopes.push(`race_id.in.(${raceIds.join(",")})`);

  /* Explicit row type: the select string is computed, so supabase-js can't
     parse a literal column list into a type. candidate_id is optional —
     absent entirely on the legacy-shape fallback below. */
  type FeedRow = {
    id: string;
    race_id: string | null;
    metro: string | null;
    candidate_id?: string | null;
    item_type: string;
    title: string;
    summary: string | null;
    url: string | null;
    published_at: string;
  };

  const query = (withCandidateId: boolean) =>
    supabase
      .from("news_item")
      .select(
        withCandidateId
          ? "id, race_id, metro, candidate_id, item_type, title, summary, url, published_at"
          : "id, race_id, metro, item_type, title, summary, url, published_at"
      )
      .or(scopes.join(","))
      .order("published_at", { ascending: false })
      .limit(50)
      .returns<FeedRow[]>();

  /* candidate_id arrives with migration 0005 (CAP_Refresh_Agents_Plan §5).
     Until that lands, Postgres reports the column as undefined (42703 /
     PostgREST PGRST204) — fall back to the legacy shape so the feed keeps
     working, degrading honestly like the rest of the app. */
  let { data, error } = await query(true);
  if (error && /^(42703|PGRST204)$/.test(error.code ?? "")) {
    ({ data, error } = await query(false));
  }

  if (error) {
    return NextResponse.json(
      { error: "Couldn't load the feed — try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    items: (data ?? []).map((i) => ({
      id: i.id,
      itemType: i.item_type,
      title: i.title,
      summary: i.summary,
      url: i.url,
      raceId: i.race_id,
      candidateId: i.candidate_id ?? null,
      publishedAt: i.published_at,
    })),
  });
}
