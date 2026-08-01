"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

/* "Re-check" for the on-demand neutrality lint (handoff A2 §C.3). The lint runs
   server-side inside the Overview render; re-checking is just a server
   re-render (router.refresh) — honest and silent, no client-side lint copy, no
   animation. Disabled + labelled "Re-checking…" while the transition is
   pending so the operator sees it working. */
export function RecheckButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="secondary"
      className="text-caption"
      disabled={pending}
      onClick={() => startTransition(() => router.refresh())}
    >
      {pending ? "Re-checking…" : "Re-check"}
    </Button>
  );
}
