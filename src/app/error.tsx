"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-[680px] flex-1 flex-col items-start justify-center gap-4 px-5 py-8">
      {/* The 404's spot, on its own row above the heading and under no
          text: 120px on a phone, 220px from lg, as on the 404 (design.md's
          closed list of phone art, 2026-10-14: one spot each on the 404 and
          the error page, the same piece). One img sized by class, not Art:
          this is a client component, and Art would pull art-sizes.json into
          its chunk. width and height reserve the box, so nothing shifts;
          it is decoration, so aria-hidden, alt="", no pointer events. */}
      <span aria-hidden="true" className="pointer-events-none select-none">
        {/* eslint-disable-next-line @next/next/no-img-element -- a pre-sized
            WebP; Art would pull art-sizes.json into this client chunk */}
        <img
          src="/brand/site/illustrations/error-404-funk-sm.webp"
          alt=""
          width={472}
          height={600}
          loading="lazy"
          decoding="async"
          draggable={false}
          className="block h-[120px] w-auto max-w-none lg:h-[220px]"
        />
      </span>
      <h1 className="text-h1">Something went wrong</h1>
      {/* Names the way out, and doesn't promise "your ballot" (interface
          review 2026-10-05). */}
      <p className="text-body text-on-surface-muted">
        That&rsquo;s on us, not you. Try again, or start from the races we
        cover.
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <Button onClick={reset}>Try again</Button>
        <Link href="/" className="text-label text-primary underline underline-offset-2">
          See the races we cover
        </Link>
      </div>
    </main>
  );
}
