import { unstable_cache } from "next/cache";
import { createAnonServerClient } from "@/lib/supabase/server";
import { allOrNone, type PhotoRow, type RacePhotos } from "@/lib/race-photos";

export type { CandidatePhoto, RacePhotos } from "@/lib/race-photos";

/* Candidate headshots (founder, 2026-10-11; migration 0056).

   ALL OR NONE PER RACE, the same rule as incumbency and running mates
   (src/lib/incumbency.ts, src/lib/running-mate.ts): racePhotosFor returns
   the race's photos only when every ballot candidate in it has a verified
   one. A race where one candidate's photo is missing or unchecked shows no
   faces at all, rather than faces for some and a blank for others, which
   would make the photo-less candidate look like the odd one out.

   Where the photos come from (founder, 2026-10-11): an official government
   portrait where one exists, otherwise the campaign's own published photo.
   We keep a square crop in the public candidate-photos bucket, with the
   source page and a credit, and take one down on request. Anon reads only
   verified rows of candidates in listed or published races (0056's policy),
   so an unchecked photo can't reach this reader even by mistake.

   Silent on failure: before 0056 is applied the read errors, and an error
   means no photos, never a broken page. */

const BUCKET = "candidate-photos";

function publicUrl(path: string): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base.replace(/\/$/, "")}/storage/v1/object/public/${BUCKET}/${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

const readPhotos = unstable_cache(
  async (ids: string[]): Promise<PhotoRow[]> => {
    const supabase = await createAnonServerClient();
    const { data, error } = await supabase
      .from("candidate_photo")
      .select("candidate_id, storage_path, credit, source_page_url")
      .in("candidate_id", ids);
    if (error) return [];
    return (data ?? []) as PhotoRow[];
  },
  ["candidate-photos", "v1"],
  { revalidate: 3600, tags: ["candidate-photos"] }
);

/** The race's photos, keyed by candidate_id, or null when any candidate in
    the race lacks a verified one. Pass every ballot candidate in the race
    (the same list incumbencyFor gets). */
export async function racePhotosFor(
  candidates: readonly { candidate_id: string }[]
): Promise<RacePhotos | null> {
  const ids = [...new Set(candidates.map((c) => c.candidate_id))].sort();
  if (ids.length === 0) return null;
  try {
    return allOrNone(ids, await readPhotos(ids), publicUrl);
  } catch {
    return null;
  }
}
