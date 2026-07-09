import type { ReactNode } from "react";

/* The single honest-degradation idiom for the console (roadmap Build
   Philosophy 10). Whenever a panel or action cannot run because a dependency is
   absent — a missing env var, an unapplied migration, a closed laptop — it
   renders this and names EXACTLY what is missing, instead of faking data or
   hiding the gap. Every later panel reuses it, so degraded states look and read
   the same everywhere. */
export function DegradedBanner({
  missing,
  children,
}: {
  missing: string;
  children?: ReactNode;
}) {
  return (
    <div
      role="status"
      className="rounded-md border border-border-strong bg-surface-muted px-4 py-3 text-body-sm text-on-surface"
    >
      <span className="font-semibold text-warning">Not configured</span>
      <span className="text-on-surface-muted"> — this needs </span>
      <code className="rounded-sm bg-surface px-1 py-[2px] font-mono text-caption text-on-surface">
        {missing}
      </code>
      {children ? (
        <p className="mt-2 text-caption text-on-surface-muted">{children}</p>
      ) : null}
    </div>
  );
}
