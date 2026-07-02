"use client";

import { Button } from "@/components/ui/Button";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-[680px] flex-1 flex-col items-start justify-center gap-4 px-5 py-8">
      <h1 className="text-h1">Something went wrong</h1>
      <p className="text-body text-on-surface-muted">
        That&apos;s on us, not you. Give it another try — your ballot is still
        here.
      </p>
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
