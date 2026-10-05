import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAnonServerClient } from "@/lib/supabase/server";
import { COVERED_COUNTIES, resolveZip, ZIP_RE } from "@/lib/resolve";
import { dedupeByUrl } from "@/lib/news-feed";
import { ISSUE_FILTER_IDS, issueFilterIds } from "@/lib/news-issues";
import { type NewsSource } from "@/lib/news-labels";
import { outletForUrl } from "@/lib/news-sources";
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
  image_url: string | null;
  /* Migration 0027. NULL = never characterized, {} = characterized with
     nothing over threshold. Both render; the API flattens both to [] because
     a card has nothing to show in either case, and the distinction is the
     characterizer's to report, not the reader's to decode. */
  issues: string[] | null;
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
  /* The issue filter (/news `?issue=`). A category or sub-issue id from the
     taxonomy; anything else is IGNORED rather than a 400 — a stale link to an
     id retired by a TAXONOMY_VERSION bump should still show the feed, not an
     error. `.catch` is what makes an unknown value fall back to "no filter". */
  issue: z
    .enum(ISSUE_FILTER_IDS as [string, ...string[]])
    .optional()
    .catch(undefined),
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
    issue: request.nextUrl.searchParams.get("issue") ?? undefined,
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

  let query = supabase
    .from("news_item")
    .select(
      "id, race_id, candidate_id, metro, county_fips, item_type, title, summary, url, published_at, image_url, issues, " +
        "source(publisher, type, lean_tag)"
    )
    .or(scopes.join(","));

  /* The issue filter narrows WITHIN the scope above, never replaces it: a
     Broward reader filtering on housing sees Broward-plus-statewide housing
     stories, not every housing story in the state.

     `overlaps` is `issues && ARRAY[...]`, the GIN-indexed query migration 0027
     was built for. `issueFilterIds` expands a category into itself plus its
     sub-issues, because categories are derived for display and not stored —
     filtering on the bare category id would match nothing. A row whose
     `issues` is NULL or {} cannot match any filter, which is correct: only an
     unfiltered feed promises every stored row. */
  const filterIds = issueFilterIds(parsed.data.issue);
  if (filterIds) query = query.overlaps("issues", filterIds);

  const { data, error } = await query
    .order("published_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json(
      { error: "Couldn't load the feed — try again." },
      { status: 500 }
    );
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
    }))
  );

  return NextResponse.json({
    items: rows.map((i) => {
      /* PostgREST returns a to-one embed as an object, but older versions and
         some relationship shapes return a one-element array. Normalize both
         rather than trusting one. */
      const raw = i.source;
      const source = Array.isArray(raw) ? (raw[0] ?? null) : (raw ?? null);
      /* The source row travels whole; the card derives its own labels with
         `newsCardLabels`. Deliberately NO `lean` in this payload — lean is
         disclosed on the outlet page, not on a card (news-fairness.md §1, as
         amended 2026-09-19), and a value the client never receives is one no
         card can render by accident. The lean still reaches a reader, one tap
         away and in full, including when no rating exists.

         `outletDomain` is resolved HERE rather than in the browser so the
         client bundle does not have to carry the whole outlet list to draw a
         link. Null for rows that belong to no listed outlet — an official
         resource or a pipeline update has no outlet page to go to. */
      const outlet = i.url ? outletForUrl(i.url) : null;
      return {
        id: i.id,
        itemType: i.item_type,
        title: i.title,
        summary: i.summary,
        url: i.url,
        imageUrl: i.image_url ?? null,
        raceId: i.race_id,
        candidateId: i.candidateId,
        countyFips: i.county_fips,
        publishedAt: i.published_at,
        issues: i.issues ?? [],
        source,
        outletDomain: outlet?.domain ?? null,
      };
    }),
  });
}
