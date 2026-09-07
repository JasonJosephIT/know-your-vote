import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAnonServerClient } from "@/lib/supabase/server";
import { resolveZip, ZIP_RE } from "@/lib/resolve";
import { newsLabels, type NewsSource } from "@/lib/news-labels";
import type { NewsItemType } from "@/types/app";

/* This project has no generated Supabase types, so an embedded select widens
   to a union including GenericStringError. One cast at the boundary is
   honest about that; casting each field afterwards is not. */
type NewsRow = {
  id: string;
  race_id: string | null;
  candidate_id: string | null;
  metro: string | null;
  item_type: NewsItemType;
  title: string;
  summary: string | null;
  url: string | null;
  published_at: string;
  source: NewsSource | NewsSource[] | null;
};

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

  const { data, error } = await supabase
    .from("news_item")
    .select(
      "id, race_id, candidate_id, metro, item_type, title, summary, url, published_at, "
        + "source(publisher, type, lean_tag)",
    )
    .or(scopes.join(","))
    .order("published_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: "Couldn't load the feed — try again." }, { status: 500 });
  }

  return NextResponse.json({
    items: ((data ?? []) as unknown as NewsRow[]).map((i) => {
      /* PostgREST returns a to-one embed as an object, but older versions and
         some relationship shapes return a one-element array. Normalize both
         rather than trusting one. */
      const raw = i.source;
      const source = Array.isArray(raw) ? (raw[0] ?? null) : (raw ?? null);
      const labels = newsLabels(source);
      return {
        id: i.id,
        itemType: i.item_type,
        title: i.title,
        summary: i.summary,
        url: i.url,
        raceId: i.race_id,
        candidateId: i.candidate_id,
        publishedAt: i.published_at,
        publisher: source?.publisher ?? null,
        kind: labels.kind,
        lean: labels.lean,
        isOpinion: labels.isOpinion,
      };
    }),
  });
}
