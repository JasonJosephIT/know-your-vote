import { Card } from "@/components/ui/Card";
import { getCandidateNews } from "@/lib/briefs";
import { formatNewsDate, safeHttpUrl } from "@/lib/format";

/* Candidate-scoped news written by the R1 curator: neutral restatements of
   on-the-record events, every item cited to an allowlisted source. Renders
   nothing until R1 has written items for this candidate — an empty section
   on every page would be noise, and the feed-balance check lives in R4, not
   in the layout. */
export async function CandidateNews({ candidateId }: { candidateId: string }) {
  const items = await getCandidateNews(candidateId);
  if (items.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <header className="flex flex-col gap-1">
        <h2 className="text-h2">In the news</h2>
        <p className="text-body-sm text-on-surface-muted">
          On-the-record events, restated neutrally and cited — no polls, no
          endorsements, no hot takes.
        </p>
      </header>
      <ul className="flex flex-col gap-3">
        {items.map((item) => {
          const url = safeHttpUrl(item.url);
          return (
            <li key={item.id}>
              <Card className="flex flex-col gap-1">
                <p className="font-mono text-mono text-on-surface-muted">
                  {formatNewsDate(item.published_at)}
                </p>
                <h3 className="text-h3">{item.title}</h3>
                {item.summary && (
                  <p className="text-body-sm text-on-surface-muted">
                    {item.summary}
                  </p>
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
        })}
      </ul>
    </section>
  );
}
