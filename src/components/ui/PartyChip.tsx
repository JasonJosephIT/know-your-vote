import type { Party } from "@/types/schema";

const labels: Record<Party, string> = {
  REP: "REP",
  DEM: "DEM",
  NPA: "NPA",
  other: "Other",
};

/* Hard rule from design.md: identical neutral treatment for every party —
   parties are never color-coded. */
export function PartyChip({ party }: { party: Party }) {
  return (
    <span className="inline-flex items-center rounded-full bg-surface-muted px-[10px] py-[3px] text-caption text-on-surface-muted">
      {labels[party] ?? party}
    </span>
  );
}
