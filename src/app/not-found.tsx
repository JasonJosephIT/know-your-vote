import Link from "next/link";
import { Art } from "@/components/brand/Art";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-[680px] flex-1 flex-col items-start justify-center gap-4 px-5 py-8">
      {/* Site illustration layer (design.md). A spot illustration on its
          own row above the heading, under no text. lg+ only, like every
          other spot piece (rule 4 has no 404 exception). No page-wide
          wallpaper here: a background lies under the heading and the link,
          which the illustration rules forbid (see globals.css on body). */}
      <Art name="error-404-funk" height={220} className="hidden lg:block" />
      <h1 className="text-h1">We couldn&rsquo;t find that page</h1>
      <p className="text-body text-on-surface-muted">
        Check the address, or start from the races we cover.
      </p>
      {/* Not "your ballot": without a district the home page is the races
          every Florida voter shares, not anyone's whole ballot (the wording
          the home page retired; interface review 2026-10-05). */}
      <Link href="/" className="text-label text-primary underline underline-offset-2">
        See the races we cover
      </Link>
    </main>
  );
}
