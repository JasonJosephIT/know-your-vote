import { Card } from "@/components/ui/Card";
import { getCandidateNews, type CandidateNewsItem } from "@/lib/briefs";
import { formatNewsDate, safeHttpUrl } from "@/lib/format";
import { selectNewsSlots } from "@/lib/news-slots";

/* Candidate-scoped news written by the R1 curator: neutral restatements of
   on-the-record events, every item cited to an allowlisted source. Renders
   nothing until R1 has written items for this candidate — an empty section
   on every page would be noise, and the feed-balance check lives in R4, not
   in the layout.

   Two tiers, never mixed silently (candidate-news-PRD.md §6). A `related`
   story is one that did NOT name this candidate — it is about their race, or
   it named a surname that could have been several people. Presenting it
   alongside a story that named them would let a voter read "Also about this
   race" as "about this candidate", which is the one misreading the tier
   exists to prevent. So the divider is a heading, not a styling cue. */
function NewsCard({ item }: { item: CandidateNewsItem }) {
  const url = safeHttpUrl(item.url);
  return (
    <li>
      <Card className="flex flex-col gap-1">
        <p className="font-mono text-mono text-on-surface-muted">
          {formatNewsDate(item.published_at)}
        </p>
        <h4 className="text-h3">{item.title}</h4>
        {item.summary && (
          <p className="text-body-sm text-on-surface-muted">{item.summary}</p>
        )}
        {url && (
          <p className="text-caption">
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="text-primary underline underline-offset-2"
            >
              Read the source
            </a>
          </p>
        )}
      </Card>
    </li>
  );
}

/* `slots` is the per-candidate slot count N of news-fairness.md §2 — every
   ballot-tier candidate in a race gets the same one. It is intentionally
   OPTIONAL and has no default: §5 says N comes from real per-candidate counts
   once N5 measures them, and N5 has no data yet. Left unset, the selector
   still orders the items by the fairness rule and caps nothing. */
export async function CandidateNews({
  candidateId,
  slots,
}: {
  candidateId: string;
  slots?: number;
}) {
  const items = await getCandidateNews(candidateId);
  if (items.length === 0) return null;

  /* One application of the rule, in one place (src/lib/news-slots.ts): tier
     first, then lean spread, then type spread, then recency. The tier split
     below only regroups what the selector already chose and ordered — it does
     not re-rank anything. */
  const { slots: selected, shortfall } = selectNewsSlots(items, slots);
  const related = selected.filter((i) => i.relation === "related");
  const named = selected.filter((i) => i.relation !== "related");

  return (
    <section className="flex flex-col gap-3">
      <header className="flex flex-col gap-1">
        <h2 className="text-h2">In the news</h2>
        <p className="text-body-sm text-on-surface-muted">
          On-the-record events, restated neutrally and cited — no polls, no
          endorsements, no hot takes.
        </p>
      </header>

      {named.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {named.map((item) => (
            <NewsCard key={item.id} item={item} />
          ))}
        </ul>
      ) : (
        /* Shortfall is stated, not hidden (news-fairness.md §2). "Nothing
           named this candidate" is information a voter should have, and it is
           different from an empty page. */
        <p className="text-body-sm text-on-surface-muted">
          No stories named this candidate in the last 30 days.
        </p>
      )}

      {related.length > 0 && (
        <>
          <header className="flex flex-col gap-1 border-t border-border pt-3">
            <h3 className="text-h3">Also about this race</h3>
            <p className="text-body-sm text-on-surface-muted">
              These stories did not name this candidate — they cover the race,
              or a name that could have been more than one person on the
              ballot. Every candidate in the race gets the same ones.
            </p>
          </header>
          <ul className="flex flex-col gap-3">
            {related.map((item) => (
              <NewsCard key={item.id} item={item} />
            ))}
          </ul>
        </>
      )}

      {/* Shortfall is stated, never padded (news-fairness.md §2). The press
          covered this candidate less; the honest response is to say how many
          stories there were, not to fill the gap with something else. */}
      {shortfall > 0 && (
        <p className="text-body-sm text-on-surface-muted">
          Only {selected.length} {selected.length === 1 ? "story" : "stories"} found
          for this candidate in the last 30 days.
        </p>
      )}
    </section>
  );
}
