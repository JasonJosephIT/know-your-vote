import { MeasureThreshold } from "@/components/features/MeasureThreshold";

/* "What your vote does": what a YES and a NO do on a Florida constitutional
   amendment, before the ballot text (inspiration pass 2026-10-05, after
   Ballotpedia's yes/no boxes).

   MECHANICS ONLY (founder 2026-10-05). The two boxes say what any YES or NO
   does to the Constitution and nothing about this amendment's content, so
   the page still keeps "We write none of it" (founder 2026-09-23: the site
   never writes a case for or against). What a YES approves is the ballot
   summary, quoted verbatim right below, and the boxes point there rather
   than paraphrase it.

   The two boxes look the same on purpose: same border, same surface, same
   type, YES then NO in the order the ballot prints them. A coloured YES
   would read as a recommendation, the same reason the ladder's columns and
   the party chips are uncoloured.

   They are WORDED the same too ("Equal space, equal scrutiny — in words
   too", docs/voice-and-tone.md). Each box says only what the vote is, a
   mirror of the other; what happens next depends on everyone's votes, so
   it is said once, under both, for both outcomes. An earlier draft had NO
   "keep the Constitution as it is", which is false for every NO voter
   whenever the amendment passes (review 2026-10-05).

   The blank-vote line is true only for the 60% rule. Art. XI s.5(e), Fla.
   Const., counts "sixty percent of the electors voting on the measure", so
   an undervote counts toward neither side (checked against flsenate.gov
   2026-10-05). A new state tax under Art. XI s.7 needs two-thirds of the
   voters voting in the ELECTION, where a blank counts like a NO, so the
   line is left out for any other threshold rather than stated wrongly. */
const ART_XI_S5 = "https://www.flsenate.gov/Laws/Constitution#A11S05";

export function MeasureVoteMeaning({ pct }: { pct: number }) {
  const blankCountsForNeither = Number(pct) === 60;
  return (
    <section aria-labelledby="your-vote" className="flex flex-col gap-3">
      <h2 id="your-vote" className="text-h2">
        What your vote does
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Box label="Voting YES">
          Approves the change in the ballot summary below.
        </Box>
        <Box label="Voting NO">
          Rejects the change in the ballot summary below.
        </Box>
      </div>
      <p className="max-w-[680px] text-body-sm text-on-surface">
        If it passes, the change becomes part of the Florida Constitution. If
        it fails, nothing in the Constitution changes because of it.
      </p>
      <MeasureThreshold pct={pct} />
      {blankCountsForNeither && (
        <p className="max-w-[680px] text-body-sm text-on-surface-muted">
          Leaving this question blank counts toward neither side: the 60% is
          of the people who vote on it.{" "}
          <a
            href={ART_XI_S5}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-[24px] items-center underline underline-offset-2 hover:text-on-surface"
          >
            Florida Constitution, Article XI, Section 5
          </a>
        </p>
      )}
    </section>
  );
}

function Box({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border border-l-4 border-l-border-strong bg-surface px-4 py-3">
      <h3 className="text-label">{label}</h3>
      <p className="text-body-sm text-on-surface">{children}</p>
    </div>
  );
}
