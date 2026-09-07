"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { ReviewKind } from "@/types/admin";

/* Per-card approve/reject controls (handoff A3 §C; design.md § 5). Approve
   applies the fixed effect server-side; reject records the decision. A
   fail-closed approve returns 200 with apply_error — the item stays pending and
   the exact reason is shown inline, retryable. Approving a gated field
   (gated_diff / date_mismatch writes a content-plane column) requires an
   explicit confirm step first. */

const GATED_KINDS: ReviewKind[] = ["gated_diff", "date_mismatch"];

export function DecisionControls({
  id,
  kind,
}: {
  id: string;
  kind: ReviewKind;
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(action: "approve" | "reject") {
    setBusy(true);
    setApplyError(null);
    setError(null);
    try {
      const res = await fetch(`/api/admin/review/${id}/decision`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, note: note.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 409) {
        setError("Already decided in another tab.");
        router.refresh();
        return;
      }
      if (!res.ok) {
        setError(data?.missing ? `Unavailable — needs ${data.missing}.` : (data?.error ?? `Failed (HTTP ${res.status}).`));
        return;
      }
      if (data?.apply_error) {
        setApplyError(data.apply_error); // stays pending, retryable
        router.refresh();
        return;
      }
      router.refresh(); // approved/applied or rejected — row re-renders
    } catch {
      setError("Network error — decision not sent.");
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  function onApprove() {
    if (GATED_KINDS.includes(kind) && !confirming) {
      setConfirming(true);
      return;
    }
    void decide("approve");
  }

  return (
    <div className="flex flex-col gap-2 border-t border-border pt-3">
      <Input
        aria-label="Decision note (optional)"
        placeholder="Note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="text-body-sm"
      />

      {applyError ? (
        <p role="alert" className="text-caption text-error">
          Fail-closed — still pending: {applyError}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-caption text-error">
          {error}
        </p>
      ) : null}

      {confirming ? (
        <div className="flex flex-col gap-2 rounded-md border border-border-strong bg-surface-muted p-3">
          <p className="text-caption text-on-surface">
            Approving writes a gated field on the content plane. Confirm?
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="primary"
              disabled={busy}
              onClick={() => void decide("approve")}
            >
              {busy ? "Applying…" : "Confirm approve"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => setConfirming(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="primary" disabled={busy} onClick={onApprove}>
            {busy ? "Working…" : "Approve"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() => void decide("reject")}
          >
            Reject
          </Button>
        </div>
      )}
    </div>
  );
}
