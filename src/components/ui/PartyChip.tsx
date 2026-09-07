import { partyLabel } from "@/lib/party-label";
import type { Party } from "@/types/schema";

/* Hard rule from design.md: identical neutral treatment for every party —
   parties are never color-coded. What to print (and when to print nothing)
   is party-label.ts, which is pure so the neutrality rules there can be
   verified offline. */
export function PartyChip({ party }: { party: Party }) {
  const label = partyLabel(party);
  if (label === null) return null;
  return (
    <span className="inline-flex items-center rounded-full bg-surface-muted px-[10px] py-[3px] text-caption text-on-surface-muted">
      {label}
    </span>
  );
}
