/* The all-or-none rule for candidate headshots, pure and dependency-free so
   scripts/verify-headshots.ts runs it in plain Node. The read and the URL
   live in src/lib/headshots.ts; why the rule exists is written there. */

export interface CandidatePhoto {
  src: string;
  credit: string;
  sourcePageUrl: string;
}

export type RacePhotos = ReadonlyMap<string, CandidatePhoto>;

export type PhotoRow = {
  candidate_id: string;
  storage_path: string;
  credit: string;
  source_page_url: string;
};

/** Pure: the all-or-none rule, apart from the read so it can be tested. */
export function allOrNone(
  candidateIds: readonly string[],
  rows: readonly PhotoRow[],
  toUrl: (path: string) => string | null
): RacePhotos | null {
  if (candidateIds.length === 0) return null;
  const byId = new Map(rows.map((r) => [r.candidate_id, r]));
  const out = new Map<string, CandidatePhoto>();
  for (const id of candidateIds) {
    const row = byId.get(id);
    const src = row ? toUrl(row.storage_path) : null;
    if (!row || !src) return null;
    out.set(id, {
      src,
      credit: row.credit,
      sourcePageUrl: row.source_page_url,
    });
  }
  return out;
}
