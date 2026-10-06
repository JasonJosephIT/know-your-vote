import Link from "next/link";

/* One policy area, named. Same neutral chip as PartyChip and for the same
   reason: the README's "party chips are never colour-coded" rule exists so the
   UI cannot imply a verdict, and an area rendered in its own colour would
   start ranking issues against each other. Every area, every time, in one
   style.

   With `href` the chip is a link into the browse filter for that area, which
   is the only reason a voter would tap it. Without one it is plain text. The
   link takes the link colour (interface review 2026-10-05): with the exact
   classes of the static PartyChip beside it, a voter could not tell the
   chip that goes somewhere from the label that doesn't. Same colour for
   every area, so no area is ranked against another. */
export function PolicyAreaChip({
  label,
  href,
}: {
  label: string;
  href?: string;
}) {
  const className =
    "inline-flex items-center rounded-full bg-surface-muted px-[10px] py-[3px] text-caption text-on-surface-muted";

  if (!href) return <span className={className}>{label}</span>;
  return (
    <Link
      href={href}
      className={`${className.replace("text-on-surface-muted", "text-primary")} transition-colors hover:text-primary-hover hover:underline`}
    >
      {label}
    </Link>
  );
}

/** Where the browse surface lists everyone with a stated position in an area. */
export const policyAreaHref = (id: string) =>
  `/candidates?area=${encodeURIComponent(id)}`;
