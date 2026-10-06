import Link from "next/link";
import type { ReactNode } from "react";

/* The ballot lists' shared shell (inspiration pass 2026-10-05): one bordered
   list with a row per race or ballot question, used by the landing page
   (SharedBallot, BallotQuestions), Your races and County races, so every
   list of things on the ballot looks and works the same.

   The row's title is its only link. The link's ::after covers the row, so
   the whole row is clickable while the link's accessible name stays the
   title alone; everything else in the row is read as its text. The title
   is primary green, the site's link colour (interface review 2026-10-05):
   in ink with an underline only on hover, these rows, the page's main
   links, read as plain text, and touch screens have no hover. Server
   components, no client JavaScript (verify-shared-ballot walks this). */

export function LinkRowList({ children }: { children: ReactNode }) {
  return (
    <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
      {children}
    </ul>
  );
}

export function LinkRow({
  href,
  title,
  aside,
  headingLevel = "h3",
  children,
}: {
  href: string;
  title: ReactNode;
  /* Short status text beside the title, e.g. "Full brief". */
  aside?: ReactNode;
  headingLevel?: "h3" | "h4";
  children?: ReactNode;
}) {
  const Heading = headingLevel;
  return (
    <li className="relative flex flex-col gap-1 px-5 py-4 transition-colors first:rounded-t-lg last:rounded-b-lg hover:bg-background">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <Heading className="text-h3">
          <Link
            href={href}
            className="text-primary after:absolute after:inset-0 after:rounded-[inherit] hover:text-primary-hover hover:underline"
          >
            {title}
          </Link>
        </Heading>
        {aside && <p className="text-caption text-on-surface-muted">{aside}</p>}
      </div>
      {children}
    </li>
  );
}
