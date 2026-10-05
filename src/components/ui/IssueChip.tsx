import Link from "next/link";

/* One news issue tag, named — the characterizer's output on a story card
   (src/lib/news-issues.ts `issueChips`).

   Same size and type as PolicyAreaChip so a card does not shout about its
   tags, but in the design system's `chip` treatment (docs/design.md: "Chips
   (saved filters, issue tags) use the soft primary-muted fill") rather than
   PolicyAreaChip's grey. The two mean different things — a policy area is
   something a candidate took a position on, an issue tag is what a model
   judged a news story to be about — and a reader should not mistake one for
   the other. Every issue, every time, in one style: an issue rendered in its
   own colour would start ranking issues against each other, the same reason
   parties are never colour-coded.

   With `href` the chip is a link into the /news issue filter. Without one it
   is plain text. */
export function IssueChip({ label, href }: { label: string; href?: string }) {
  const className =
    "inline-flex items-center rounded-full bg-primary-muted px-[10px] py-[3px] text-caption text-primary-hover";

  if (!href) return <span className={className}>{label}</span>;
  return (
    <Link
      href={href}
      className={`${className} hover:underline underline-offset-2`}
    >
      {label}
    </Link>
  );
}

/** The /news feed filtered to one issue. `county` is carried through so
    tapping a tag keeps the county the reader was looking at. */
export const issueHref = (id: string, county?: string | null) => {
  const qs = new URLSearchParams();
  if (county) qs.set("county", county);
  qs.set("issue", id);
  return `/news?${qs.toString()}`;
};
