import type { Verdict } from "@/types/schema";

/* Verdict color rides on the leading dot; the label is always readable
   on-surface text (design.md verdict-badge spec, WCAG AA on surface-muted).
   Meaning never depends on color alone — the label carries it. */
const styles: Record<Verdict, { label: string; dot: string }> = {
  accurate: { label: "Accurate", dot: "bg-verdict-accurate" },
  mostly_accurate: { label: "Mostly Accurate", dot: "bg-verdict-mostly-accurate" },
  mixed: { label: "Mixed", dot: "bg-verdict-mixed" },
  mostly_inaccurate: { label: "Mostly Inaccurate", dot: "bg-verdict-mostly-inaccurate" },
  inaccurate: { label: "Inaccurate", dot: "bg-verdict-inaccurate" },
  unverifiable: { label: "Unverifiable", dot: "bg-verdict-unverifiable" },
};

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const s = styles[verdict];
  if (!s) return null;
  return (
    <span className="inline-flex items-center gap-[6px] rounded-full bg-surface-muted px-[10px] py-1 text-caption text-on-surface">
      <span aria-hidden className={`size-2 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}
