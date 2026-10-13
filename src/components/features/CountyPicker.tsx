"use client";

import { COVERED_COUNTIES } from "@/lib/counties";

/* The "or pick your county" path (FR-001), for an address we can't place on
   a Florida ballot. It used to confirm the district for a split ZIP too
   (DistrictConfirm); that went with the ZIP option (2026-10-12), because an
   address lands in one census block and so in one district. An old shared
   ?zip= link to a split ZIP is answered by YourRaces, server side. */

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
