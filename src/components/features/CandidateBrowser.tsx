import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PartyChip } from "@/components/ui/PartyChip";
import { PolicyAreaChip } from "@/components/ui/PolicyAreaChip";
import { SaveToggle } from "@/components/ui/SaveToggle";
import { browseCandidates, type DecidedSeat } from "@/lib/directory";
import { safeHttpUrl } from "@/lib/format";
import { policyAreaLabel } from "@/lib/policy-areas";
import { COVERED_COUNTIES } from "@/lib/counties";

/* Browse every candidate across the four covered counties — including the
   holders of seats already decided, marked as not printed on the ballot —
   statewide, congressional and county races alike, whether the race has a
   full brief yet or only its roster (the `listed` tier, 0033). Searchable by
   name, office, or party; filterable by county and by policy area. Plain GET
   form, server-rendered, equal treatment throughout.

   A card links to "Read their brief" only when there is one (the race is
   published); otherwise "About this candidate", which lands on the roster
   listing. Promising a brief that is still in review would be the one
   untrue thing this page could say.

   The policy-area filter narrows WHO IS LISTED, never how they are ranked or
   described: inside a race the ballot-order rule still decides the order, and
   a candidate with a stated position in the chosen area is shown the same way
   as any other. Areas come from the issue titles the pipeline wrote (see
   src/lib/policy-areas.ts), so filtering cannot surface a judgment this app
   made about a candidate. */
const DECIDED_LINE: Record<DecidedSeat, string> = {
  unopposed: "Elected without opposition — not printed on the ballot",
  elected_in_primary:
    "Decided in the August primary — not printed on the ballot",
};

export async function CandidateBrowser({
  q,
  countyFips,
  area,
}: {
  q?: string;
  countyFips?: string;
  area?: string;
}) {
  const results = await browseCandidates({ q, countyFips, area });
  /* From the taxonomy, not from the options list: an area the current search
     empties still has a name, and the copy below has to use it. */
  const areaLabel = results.area ? policyAreaLabel(results.area) : null;

  return (
    <div className="flex flex-col gap-5">
      <form
        method="GET"
        action="/candidates"
        className="flex flex-col gap-3 sm:flex-row sm:items-center"
      >
        <input type="hidden" name="view" value="browse" />
        <label htmlFor="candidate-q" className="sr-only">
          Search candidates by name, office, or party
        </label>
        <input
          id="candidate-q"
          name="q"
          defaultValue={results.q}
          placeholder="Search by name, office, or party"
          className="w-full rounded-md border border-border-strong bg-surface px-[14px] py-3 text-body text-on-surface placeholder:text-on-surface-muted focus:border-primary focus:shadow-[inset_0_0_0_1px_var(--color-primary)] focus:outline-none"
        />
        <label htmlFor="candidate-county" className="sr-only">
          County
        </label>
        <select
          id="candidate-county"
          name="county"
          defaultValue={countyFips ?? ""}
          className="rounded-md border border-border-strong bg-surface px-3 py-3 text-body text-on-surface focus:border-primary focus:outline-none"
        >
          <option value="">All four counties</option>
          {COVERED_COUNTIES.map((c) => (
            <option key={c.fips} value={c.fips}>
              {c.name}
            </option>
          ))}
        </select>
        <label htmlFor="candidate-area" className="sr-only">
          Policy area
        </label>
        <select
          id="candidate-area"
          name="area"
          defaultValue={results.area ?? ""}
          className="rounded-md border border-border-strong bg-surface px-3 py-3 text-body text-on-surface focus:border-primary focus:outline-none"
        >
          <option value="">Any policy area</option>
          {results.areaOptions.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label} ({o.count})
            </option>
          ))}
        </select>
        <Button type="submit">Search</Button>
      </form>

      {/* "On the ballot" only while it is true: once a decided seat is in the
          set, some of these races are not printed, so the line counts them
          instead of claiming the whole set is on the ballot. */}
      <p className="text-caption text-on-surface-muted" role="status">
        {results.total} candidate{results.total === 1 ? "" : "s"} across{" "}
        {results.races.length} race{results.races.length === 1 ? "" : "s"}
        {results.decidedRaces === 0
          ? " on the ballot"
          : results.races.length === 1
            ? ", a seat already decided"
            : `, ${results.decidedRaces} of them ${
                results.decidedRaces === 1 ? "a seat" : "seats"
              } already decided`}
        {results.q ? ` matching “${results.q}”` : ""}
        {areaLabel ? ` with a stated position on ${areaLabel}` : ""} — shown in
        ballot order, every race, every party.
      </p>

      {results.total === 0 ? (
        <p className="text-body text-on-surface-muted">
          {areaLabel
            ? `No candidates in this search have a stated position on ${areaLabel} in a full brief. Positions come only from races whose briefs are finished, so try another area or clear the filter to see everyone.`
            : "No candidates match that search. Try a shorter name, an office like “Governor”, or clear the search to see everyone."}
        </p>
      ) : (
        results.races.map(({ race, candidates }) => (
          <section key={race.race_id} className="flex flex-col gap-3">
            <h2 className="text-h3">
              <Link href={`/races/${race.race_id}`} className="hover:underline">
                {race.office}
              </Link>{" "}
              {/* A county race's office already names its county and seat
                  ("Orange County Commission, District 2"); its district code
                  is an internal key, not something a voter reads. */}
              {race.level !== "county" && (
                <span className="text-caption font-medium text-on-surface-muted">
                  {race.district ?? "Statewide"}
                </span>
              )}
            </h2>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {candidates.map((c) => (
                <li key={c.candidate_id}>
                  <Card className="flex h-full flex-col gap-2 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-label">
                        <Link
                          href={`/candidates/${c.candidate_id}`}
                          className="hover:underline"
                        >
                          {c.legal_name}
                        </Link>
                      </h3>
                      <PartyChip party={c.party} />
                    </div>
                    {/* A seat settled before November. Same card as everyone
                        else's, plus the one fact that changes what a voter
                        can do about it. */}
                    {c.decided && (
                      <p className="text-caption text-on-surface-muted">
                        {DECIDED_LINE[c.decided]}
                      </p>
                    )}
                    {/* The areas this candidate has a stated position in.
                        Plain text, not links: the filter above is one tap
                        away, and a card full of links reads badly aloud. */}
                    {c.policyAreas.length > 0 && (
                      <ul
                        aria-label={`Policy areas ${c.legal_name} has stated positions on`}
                        className="flex flex-wrap gap-2"
                      >
                        {c.policyAreas.map((a) => (
                          <li key={a.id}>
                            <PolicyAreaChip label={a.label} />
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="mt-auto flex flex-wrap gap-x-3 gap-y-1 text-caption text-on-surface-muted">
                      <Link
                        href={`/candidates/${c.candidate_id}`}
                        className="text-primary underline underline-offset-2"
                      >
                        {c.hasBrief
                          ? "Read their brief"
                          : "About this candidate"}
                      </Link>
                      {/* The campaign's own site — always selected, never
                          shown until now. Routed through safeHttpUrl like
                          every other stored URL, so a bad row renders no link
                          rather than a javascript: one. */}
                      {safeHttpUrl(c.official_site) && (
                        <a
                          href={safeHttpUrl(c.official_site) ?? undefined}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary underline underline-offset-2"
                        >
                          Official site
                        </a>
                      )}
                      <SaveToggle candidateId={c.candidate_id} />
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
