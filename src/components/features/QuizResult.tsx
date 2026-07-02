"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { PartyChip } from "@/components/ui/PartyChip";
import { SaveToggle } from "@/components/ui/SaveToggle";
import type { QuizResponse } from "@/types/app";
import type { Party } from "@/types/schema";

/* Full field, neutral order, no ranking — the disclaimer is part of the
   feature, not fine print (FR-007). */
export function QuizResults({ response }: { response: QuizResponse }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="rounded-md bg-accent-muted px-4 py-3 text-body-sm text-accent-strong">
        {response.disclaimer}
      </p>

      {response.races.map((race) => {
        const candidates = response.results.filter((r) => r.raceId === race.raceId);
        if (candidates.length === 0) return null;
        return (
          <section key={race.raceId} className="flex flex-col gap-3">
            <h2 className="text-h2">
              <Link href={`/races/${race.raceId}`} className="hover:underline">
                {race.office}
              </Link>
            </h2>
            <ul className="flex flex-col gap-3">
              {candidates.map((c) => (
                <li key={c.candidateId}>
                  <Card className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-h3">
                        <Link
                          href={`/candidates/${c.candidateId}`}
                          className="hover:underline"
                        >
                          {c.legalName}
                        </Link>
                      </h3>
                      <PartyChip party={c.party as Party} />
                      <SaveToggle candidateId={c.candidateId} />
                    </div>
                    <p className="text-body-sm">{c.alignmentNote}</p>
                    {c.alignedIssues.length > 0 && (
                      <p className="flex flex-wrap gap-2">
                        {c.alignedIssues.map((issue) => (
                          <Chip key={issue}>{issue}</Chip>
                        ))}
                      </p>
                    )}
                    <Link
                      href={`/candidates/${c.candidateId}`}
                      className="text-caption text-primary underline underline-offset-2"
                    >
                      Read their full brief
                    </Link>
                  </Card>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <p className="text-caption text-on-surface-muted">
        Every candidate in your races is shown, in ballot order. We describe
        stated positions only — you decide.
      </p>
    </div>
  );
}
