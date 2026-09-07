/* Feed-shaping rules — candidate-news-PRD.md §7 (task C9).

   Pure and dependency-free so the one rule that matters here is testable
   without a DB: scripts/verify-news-feed.ts drives this file.

   The rule: §6 gives one article one news_item row PER CANDIDATE it matched
   (the `uq_news_item_url_candidate` index is keyed on (url, candidate_id), so
   that is already legal). A story naming three candidates is therefore three
   rows — correct on three candidate pages, and wrong in a feed, where a voter
   would scroll past the same headline three times.

   Deduping is not just "keep one". Which one you keep is an attribution
   decision: a card that says "View the candidate" while the story named three
   of them would quietly pick a winner, which is exactly the editorial
   discretion §6 removes from the matcher. So when a URL spans more than one
   candidate, the merged card drops the candidate link rather than choosing. */

export interface FeedRow {
  id: string;
  url: string | null;
  candidateId: string | null;
  publishedAt: string;
}

/** Collapse rows that are the same article. Input order is preserved for the
    survivors, so a caller that sorted by date keeps its sort.

    A row with no URL is never merged — pipeline_event rows legitimately have
    none, and two of them are two events, not one story seen twice. */
export function dedupeByUrl<T extends FeedRow>(rows: readonly T[]): T[] {
  const firstAt = new Map<string, number>();
  const out: T[] = [];

  for (const row of rows) {
    if (!row.url) {
      out.push(row);
      continue;
    }
    const seen = firstAt.get(row.url);
    if (seen === undefined) {
      firstAt.set(row.url, out.length);
      out.push(row);
      continue;
    }
    /* Same story, different candidate row. Keep the first (the caller's sort
       decides which that is) but stop it claiming a single candidate. */
    const kept = out[seen];
    if (kept.candidateId !== null && kept.candidateId !== row.candidateId) {
      out[seen] = { ...kept, candidateId: null };
    }
  }

  return out;
}
