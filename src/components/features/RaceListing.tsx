import Link from "next/link";
import { PartyChip } from "@/components/ui/PartyChip";
import { Chip } from "@/components/ui/Chip";
import { SaveToggle } from "@/components/ui/SaveToggle";
import { safeHttpUrl } from "@/lib/format";
import { BRIEF_IN_REVIEW_LINE } from "@/lib/listing-copy";
import type {
  ListedCandidate,
  RaceListing as RaceListingData,
} from "@/lib/listing";

/* One candidate on a listed race: the roster facts and nothing else (design
   brief, `listed` tier). Every field here is public record from the DoE or a
   county Supervisor of Elections, or a verified account; there is no slot for
   a position, a claim or a summary, so there is nothing to invent.

   The structure is identical for every candidate, including the one muted
   "Brief in review" line — which is the same sentence on every card so it can
   never read as a remark about one person. It exists so an empty card is not
   mistaken for "this candidate has no positions": the positions are not
   missing, they are not written yet, for anyone in the race.

   Header markup mirrors CandidateBrief's header so a race moving from listed
   to published changes what is under the name, not the name block itself. */
export function ListedCandidateCard({
  data,
  headingLevel = "h2",
  linkToDetail = true,
}: {
  data: ListedCandidate;
  headingLevel?: "h1" | "h2" | "h3";
  linkToDetail?: boolean;
}) {
  const { candidate, socials } = data;
  const Heading = headingLevel;
  const officialSite = safeHttpUrl(candidate.official_site);

  return (
    <article className="flex h-full flex-col gap-4 rounded-lg border border-border bg-surface p-5">
      <header className="flex flex-col gap-2">
        <Heading className={headingLevel === "h1" ? "text-h1" : "text-h2"}>
          {linkToDetail ? (
            <Link
              href={`/candidates/${candidate.candidate_id}`}
              className="hover:underline"
            >
              {candidate.legal_name}
            </Link>
          ) : (
            candidate.legal_name
          )}
        </Heading>
        <div className="flex flex-wrap items-center gap-2">
          <PartyChip party={candidate.party} />
          {candidate.is_incumbent && <Chip>Incumbent</Chip>}
          <SaveToggle candidateId={candidate.candidate_id} />
        </div>
        <p className="flex flex-wrap gap-x-3 gap-y-1 text-caption text-on-surface-muted">
          {officialSite && (
            <a
              href={officialSite}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 hover:text-on-surface"
            >
              Official site
            </a>
          )}
          {socials.map((s) => {
            const url = safeHttpUrl(s.url);
            const label = `${s.handle} (${s.platform})`;
            return url ? (
              <a
                key={s.id}
                href={url}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2 hover:text-on-surface"
              >
                {label}
              </a>
            ) : (
              <span key={s.id}>{label}</span>
            );
          })}
        </p>
      </header>

      <p className="text-body-sm text-on-surface-muted">
        {BRIEF_IN_REVIEW_LINE}
      </p>

      <footer className="mt-auto flex flex-wrap gap-x-4 gap-y-1 border-t border-border pt-3 text-caption text-on-surface-muted">
        <Link
          href="/methodology"
          className="underline underline-offset-2 hover:text-on-surface"
        >
          How we stay fair
        </Link>
      </footer>
    </article>
  );
}

/* Same grid as RaceCompare, copied rather than shared so the published
   layout cannot shift under a change made for the listing: equal-width
   columns on desktop, an equal-treatment stack on mobile, ballot order,
   reading order matching visual order. */
export function RaceListing({ listing }: { listing: RaceListingData }) {
  const count = listing.candidates.length;
  return (
    <div
      className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-[repeat(var(--cols),minmax(0,1fr))]"
      style={{ "--cols": Math.min(count, 3) } as React.CSSProperties}
    >
      {listing.candidates.map((c) => (
        <ListedCandidateCard key={c.candidate.candidate_id} data={c} />
      ))}
    </div>
  );
}
