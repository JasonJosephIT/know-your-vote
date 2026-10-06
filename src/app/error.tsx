"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-[680px] flex-1 flex-col items-start justify-center gap-4 px-5 py-8">
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
