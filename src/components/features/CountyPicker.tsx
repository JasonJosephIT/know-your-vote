"use client";

import Link from "next/link";
import { COVERED_COUNTIES, coveredCounty } from "@/lib/counties";
import { STATEWIDE_BALLOT_HREF } from "@/lib/coverage";
import { supervisorLink } from "@/lib/supervisors";
import type { UncoveredPart } from "@/lib/uncovered-zip-parts";

/* Two jobs (FR-001): the "or pick your county" path, and district
   confirmation for split ZIPs — we never auto-pick a district. */

export function CountyPicker({
  onPick,
}: {
  onPick: (county: { fips: string; name: string }) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-body-sm text-on-surface-muted">Pick your county:</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {COVERED_COUNTIES.map((c) => (
          <button
            key={c.fips}
            type="button"
            onClick={() => onPick(c)}
            className="rounded-md border border-border-strong bg-surface px-4 py-3 text-left text-label text-primary transition-colors hover:border-primary hover:bg-primary-muted hover:text-primary-hover"
          >
            {c.name}
            <span className="block text-caption font-normal text-on-surface-muted">
              {c.metroLabel} metro
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* `countyFips` is the split ZIP's county (every split ZIP lies in one), so
   the help line can name that county's Supervisor of Elections. Without it
   the line links the state's list of all 67 Supervisors.

   `uncoveredPart` is set for a ZIP that crosses into a county we don't
   cover (uncovered-zip-parts.ts: two Orange ZIPs reach into Seminole, four
   Hillsborough ZIPs into Pasco). The buttons are then the covered county's
   districts, and a line below names the other side's House race and links
   it, without saving a district: saving one would file a Seminole or Pasco
   voter under Orange or Hillsborough County, with that county's races and
   dates. */
export function DistrictConfirm({
  districts,
  countyFips,
  uncoveredPart,
  onPick,
}: {
  districts: string[];
  countyFips?: string;
  uncoveredPart?: UncoveredPart;
  onPick: (district: string) => void;
}) {
  const supervisor = supervisorLink(countyFips);
  const countyName = countyFips ? coveredCounty(countyFips)?.name : undefined;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-body-sm text-on-surface-muted">
        {uncoveredPart && countyName
          ? `Your ZIP is partly in ${countyName} County and partly in ${uncoveredPart.county} County. If you live in the ${countyName} County part, pick your congressional district:`
          : "Your ZIP spans more than one congressional district. Pick yours to be sure we show the right races:"}
      </p>
      <div className="flex flex-wrap gap-2">
        {districts.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => onPick(d)}
            className="rounded-md border border-border-strong bg-surface px-4 py-3 text-label text-primary transition-colors hover:border-primary hover:bg-primary-muted hover:text-primary-hover"
          >
            {d}
          </button>
        ))}
      </div>
      {uncoveredPart && (
        <p className="text-body-sm text-on-surface-muted">
          In the {uncoveredPart.county} County part? Your U.S. House race is{" "}
          <Link
            href={`/races/${uncoveredPart.raceId}`}
            className="text-primary underline underline-offset-2 hover:text-primary-hover"
          >
            {uncoveredPart.district}
          </Link>
          . We don&apos;t cover {uncoveredPart.county} County&apos;s local races
          yet;{" "}
          <Link
            href={STATEWIDE_BALLOT_HREF}
            className="text-primary underline underline-offset-2 hover:text-primary-hover"
          >
            see the statewide ballot
          </Link>
          .
        </p>
      )}
      <p className="text-caption text-on-surface-muted">
        Not sure? Your voter registration card or{" "}
        <a
          className="underline"
          href={supervisor.url}
          target="_blank"
          rel="noreferrer"
        >
          {supervisor.label}
        </a>{" "}
        lists your district.
      </p>
    </div>
  );
}
