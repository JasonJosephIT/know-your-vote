"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { track } from "@/lib/analytics";

type Stage =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent" }
  | { kind: "error"; message: string };

export function VotingInfo({ zip: initialZip = "" }: { zip?: string }) {
  const [zip, setZip] = useState(initialZip);
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [stage, setStage] = useState<Stage>({ kind: "idle" });

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!consent) {
      setStage({
        kind: "error",
        message: "Check the consent box first — we only email people who ask.",
      });
      return;
    }
    setStage({ kind: "sending" });
    try {
      const res = await fetch("/api/voting-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zip, email, consent }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStage({ kind: "error", message: data.error ?? "That didn't send — try again." });
        return;
      }
      track("voting_info_requested");
      setStage({ kind: "sent" });
    } catch {
      setStage({ kind: "error", message: "That didn't send — try again." });
    }
  }

  if (stage.kind === "sent") {
    return (
      <p className="rounded-md bg-primary-muted px-4 py-3 text-body-sm text-primary-hover" role="status">
        Sent! Check your inbox for your polling place and key dates. There&apos;s
        an unsubscribe link in the email.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5">
      <h2 className="text-h3">Get your polling place by email</h2>
      <p className="text-body-sm text-on-surface-muted">
        One email with where to vote and the key deadlines — the only time we
        ever ask for anything personal.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          aria-label="ZIP code"
          inputMode="numeric"
          maxLength={5}
          placeholder="ZIP code"
          value={zip}
          onChange={(e) => setZip(e.target.value.replace(/\D/g, ""))}
          className="sm:max-w-[140px]"
        />
        <Input
          aria-label="Email address"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <label className="flex items-start gap-2 text-body-sm text-on-surface-muted">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-1 size-4 accent-[var(--color-primary)]"
        />
        Yes — email me my polling place and deadlines. We store only your email
        and ZIP, never link them to your browsing, and every email has an
        unsubscribe link.
      </label>
      {stage.kind === "error" && (
        <p role="alert" className="text-body-sm text-error">
          {stage.message}
        </p>
      )}
      <Button type="submit" disabled={stage.kind === "sending"} className="w-fit">
        {stage.kind === "sending" ? "Sending…" : "Email my voting info"}
      </Button>
    </form>
  );
}
