import Link from "next/link";
import { PartyChip } from "@/components/ui/PartyChip";
import { Chip } from "@/components/ui/Chip";
import { SaveToggle } from "@/components/ui/SaveToggle";
import { safeHttpUrl } from "@/lib/format";
import { showIncumbentChip } from "@/lib/incumbency";
import { listingCardLine } from "@/lib/listing-copy";
import type {
  ListedCandidate,
  RaceListing as RaceListingData,
} from "@/lib/listing";

/* One candidate on a listed race: the roster facts and nothing else (design
   brief, `listed` tier). Every field here is public record from the DoE or a
   county Supervisor of Elections, or a verified account; there is no slot for
   a position, a claim or a summary, so there is nothing to invent.

   The structure is identical for every candidate, including the one muted
   line under the name (listingCardLine: "No brief for this race" or "Brief
   in review", by the race's status and founder decision 4, or the
   unfinished-brief line for a race in UNFINISHED_BRIEF_RACES, BC15) —
   which is the same sentence on every card, chosen by the race and never
   by the candidate, so it can never read as a remark about one person. It
   exists so an empty card is not mistaken for "this candidate has no
   positions".

   Header markup mirrors CandidateBrief's header so a race moving from listed
   to published changes what is under the name, not the name block itself.
   That includes the Incumbent chip's gate, showIncumbentChip, which is off
   for every candidate until incumbency is filled for all of them
   (src/lib/incumbency.ts), and the accessibility fixes from
   a11y-perf-2026-10-04.md: the candidate's name as a visually hidden suffix
   on "Keep in mind" and "Official site" (fix 6; WCAG 2.4.4, 2.4.6, label
   first for 2.5.3), and a 24 px minimum height on the site and social links
   (fix 9; WCAG 2.5.8 Target Size; min-h-[24px] because this theme's
   spacing-6 is 32 px). The unlinked handle gets the same box so its text
   lines up with the links beside it. */
export function ListedCandidateCard({
  data,
  status,
  raceId,
  headingLevel = "h2",
  linkToDetail = true,
}: {
  data: ListedCandidate;
  status: RaceListingData["status"];
  raceId: string;
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
              className="text-primary hover:text-primary-hover hover:underline"
            >
              {candidate.legal_name}
            </Link>
          ) : (
            candidate.legal_name
          )}
        </Heading>
        <div className="flex flex-wrap items-center gap-2">
          <PartyChip party={candidate.party} />
          {showIncumbentChip(candidate) && <Chip>Incumbent</Chip>}
          <SaveToggle
            candidateId={candidate.candidate_id}
            name={candidate.legal_name}
          />
        </div>
        <p className="flex flex-wrap gap-x-3 gap-y-1 text-caption text-on-surface-muted">
          {officialSite && (
            <a
              href={officialSite}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-[24px] items-center underline underline-offset-2 hover:text-on-surface"
            >
              Official site
              <span className="sr-only">: {candidate.legal_name}</span>
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
                className="inline-flex min-h-[24px] items-center underline underline-offset-2 hover:text-on-surface"
              >
                {label}
              </a>
            ) : (
              <span
                key={s.id}
                className="inline-flex min-h-[24px] items-center"
              >
                {label}
              </span>
            );
          })}
        </p>
      </header>

      <p className="text-body-sm text-on-surface-muted">
        {listingCardLine(status, raceId)}
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
        <ListedCandidateCard
          key={c.candidate.candidate_id}
          data={c}
          status={listing.status}
          raceId={listing.race.race_id}
        />
      ))}
    </div>
  );
}
