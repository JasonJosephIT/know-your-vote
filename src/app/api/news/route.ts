import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAnonServerClient } from "@/lib/supabase/server";
import { COVERED_COUNTIES, resolveZip, ZIP_RE } from "@/lib/resolve";
import { dedupeByUrl } from "@/lib/news-feed";
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
  county_fips: string | null;
  item_type: NewsItemType;
  title: string;
  summary: string | null;
  url: string | null;
  published_at: string;
  source: NewsSource | NewsSource[] | null;
};

const COUNTY_FIPS = COVERED_COUNTIES.map((c) => c.fips);

const params = z.object({
  zip: z.string().regex(ZIP_RE).optional(),
  metro: z.enum(["miami", "fort_lauderdale", "tampa", "orlando"]).optional(),
  /* The feed's county filter (§7). Constrained to covered counties so the
     scope clause can never be built from arbitrary input. */
  county: z.enum(COUNTY_FIPS as [string, ...string[]]).optional(),
  district: z
    .string()
    .regex(/^FL-\d{1,2}$/)
    .optional(),
});

/* News scoped to the voter: items for their races, their county, their
   metro, or statewide (race_id, metro and county all null). Newest first
   (FR-009).

   County is the durable scope (§7): zip_district, the DoE files and
   COVERED_COUNTIES are all keyed on FIPS, and Florida has 67 counties, while
   `metro` holds four display values and cannot grow. Both are honoured —
   `metro` still has live rows. */
export async function GET(request: NextRequest) {
  const parsed = params.safeParse({
    zip: request.nextUrl.searchParams.get("zip") ?? undefined,
    metro: request.nextUrl.searchParams.get("metro") ?? undefined,
    county: request.nextUrl.searchParams.get("county") ?? undefined,
    district: request.nextUrl.searchParams.get("district") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid location" }, { status: 400 });
  }

  let metro = parsed.data.metro ?? null;
  /* An explicit ?county= wins: it is the voter asking to look at another
     county, and a ZIP-derived county must not override that choice. */
  let county: string | null = parsed.data.county ?? null;
  let raceIds: string[] = [];
  if (parsed.data.zip) {
    const resolved = await resolveZip(parsed.data.zip, parsed.data.district);
    if (resolved.inCoverage) {
      metro = (resolved.metro as typeof metro) ?? metro;
      county = county ?? resolved.countyFips ?? null;
      raceIds = resolved.races.map((r) => r.raceId);
    }
  }

  const supabase = await createAnonServerClient();
  /* The statewide scope must exclude county-scoped items too, or a Broward
     story with no race and no metro would reach every voter in the state. */
  const scopes = ["and(race_id.is.null,metro.is.null,county_fips.is.null)"];
  if (metro) scopes.push(`metro.eq.${metro}`);
  if (county) scopes.push(`county_fips.eq.${county}`);
  if (raceIds.length > 0) scopes.push(`race_id.in.(${raceIds.join(",")})`);

  const { data, error } = await supabase
    .from("news_item")
    .select(
      "id, race_id, candidate_id, metro, county_fips, item_type, title, summary, url, published_at, "
        + "source(publisher, type, lean_tag)",
    )
    .or(scopes.join(","))
    .order("published_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: "Couldn't load the feed — try again." }, { status: 500 });
  }

  /* One article matched to several candidates is several rows (§6) and one
     card. Dedupe AFTER the sort so "keep the first" is the newest.

     Note the limit above counts ROWS, not cards: once §6's matcher runs, a
     story on three candidates spends three of the 50. That is fine while the
     feed shows a page and not a count, and it is C8's to revisit if the
     shortfall ever shows. */
  const rows = dedupeByUrl(
    ((data ?? []) as unknown as NewsRow[]).map((i) => ({
      ...i,
      candidateId: i.candidate_id,
      publishedAt: i.published_at,
    })),
  );

  return NextResponse.json({
    items: rows.map((i) => {
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
        candidateId: i.candidateId,
        countyFips: i.county_fips,
        publishedAt: i.published_at,
        publisher: source?.publisher ?? null,
        kind: labels.kind,
        lean: labels.lean,
        isOpinion: labels.isOpinion,
      };
    }),
  });
}
