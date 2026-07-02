import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PartyChip } from "@/components/ui/PartyChip";
import { SaveToggle } from "@/components/ui/SaveToggle";
import { browseCandidates } from "@/lib/directory";
import { COVERED_COUNTIES } from "@/lib/resolve";

/* Browse every candidate in every published race across the four covered
   counties — searchable by name, office, or party; filterable by county.
   Plain GET form, server-rendered, equal treatment throughout. */
export async function CandidateBrowser({
  q,
  countyFips,
}: {
  q?: string;
  countyFips?: string;
}) {
  const results = await browseCandidates({ q, countyFips });

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
        <Button type="submit">Search</Button>
      </form>

      <p className="text-caption text-on-surface-muted" role="status">
        {results.total} candidate{results.total === 1 ? "" : "s"} across{" "}
        {results.races.length} published race
        {results.races.length === 1 ? "" : "s"}
        {results.q ? ` matching “${results.q}”` : ""} — shown in ballot order,
        every race, every party.
      </p>

      {results.total === 0 ? (
        <p className="text-body text-on-surface-muted">
          No candidates match that search. Try a shorter name, an office like
          &quot;Governor&quot;, or clear the search to see everyone.
        </p>
      ) : (
        results.races.map(({ race, candidates }) => (
          <section key={race.race_id} className="flex flex-col gap-3">
            <h2 className="text-h3">
              <Link href={`/races/${race.race_id}`} className="hover:underline">
                {race.office}
              </Link>{" "}
              <span className="text-caption font-medium text-on-surface-muted">
                {race.district ?? "Statewide"}
              </span>
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
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-caption text-on-surface-muted">
                      <Link
                        href={`/candidates/${c.candidate_id}`}
                        className="text-primary underline underline-offset-2"
                      >
                        Read their brief
                      </Link>
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
