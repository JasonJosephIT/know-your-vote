"use client";

/* Two jobs (FR-001): the "or pick your county" path, and district
   confirmation for split ZIPs — we never auto-pick a district. */

const COUNTIES = [
  { fips: "12086", name: "Miami-Dade", metro: "Miami" },
  { fips: "12011", name: "Broward", metro: "Fort Lauderdale" },
  { fips: "12057", name: "Hillsborough", metro: "Tampa" },
  { fips: "12095", name: "Orange", metro: "Orlando" },
];

export function CountyPicker({
  onPick,
}: {
  onPick: (county: { fips: string; name: string }) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-body-sm text-on-surface-muted">Pick your county:</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {COUNTIES.map((c) => (
          <button
            key={c.fips}
            type="button"
            onClick={() => onPick(c)}
            className="rounded-md border border-border-strong bg-surface px-4 py-3 text-left text-label text-primary transition-colors hover:border-primary hover:bg-primary-muted hover:text-primary-hover"
          >
            {c.name}
            <span className="block text-caption font-normal text-on-surface-muted">
              {c.metro} metro
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function DistrictConfirm({
  districts,
  onPick,
}: {
  districts: string[];
  onPick: (district: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-body-sm text-on-surface-muted">
        Your ZIP spans more than one congressional district. Pick yours to be
        sure we show the right races:
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
      <p className="text-caption text-on-surface-muted">
        Not sure? Your voter registration card or{" "}
        <a
          className="underline"
          href="https://www.fldoe.org"
          target="_blank"
          rel="noreferrer"
        >
          your county Supervisor of Elections
        </a>{" "}
        lists your district.
      </p>
    </div>
  );
}
