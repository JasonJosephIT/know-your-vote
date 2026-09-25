import Link from "next/link";
import { ClaimList, NoStatedPosition } from "@/components/features/ClaimList";
import type { IssueRow } from "@/lib/issue-pick";

/* One section per chosen issue, with the candidates side by side in ballot
   order and the same column rule as RaceCompare (at most 3 across, stacking
   on mobile). Each cell holds only what the candidate said, with its
   sources. IssueRow carries nothing else, so nothing else can render here.
   The full record is one click away on the candidate's page. */
export function IssueRows({ rows }: { rows: IssueRow[] }) {
  return (
    <div className="flex flex-col gap-8">
      {rows.map((row) => (
        <section
          key={row.subIssueId}
          className="flex flex-col gap-3 border-t border-border pt-4"
        >
          <h2 className="text-h2">{row.title}</h2>
          <div
            className="grid grid-cols-1 items-start gap-5 md:grid-cols-[repeat(var(--cols),minmax(0,1fr))]"
            style={{ "--cols": Math.min(row.cells.length, 3) } as React.CSSProperties}
          >
            {row.cells.map((cell) => (
              <article
                key={cell.candidateId}
                className="flex flex-col gap-2 rounded-md border border-border p-4"
              >
                <h3 className="text-h3">
                  <Link
                    href={`/candidates/${cell.candidateId}`}
                    className="underline-offset-2 hover:underline"
                  >
                    {cell.name}
                  </Link>
                </h3>
                {cell.coverage === "no_stated_position_found" && <NoStatedPosition />}
                {cell.say.length > 0 && <ClaimList items={cell.say} />}
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
