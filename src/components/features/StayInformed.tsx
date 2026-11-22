"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { DONATE_URL } from "@/components/features/SitePrompts";
import { track } from "@/lib/analytics";
import { FL_COUNTIES } from "@/lib/fl-counties";
import { COUNTY_MESSAGE, EMAIL_MESSAGE, updatesSignup } from "@/lib/updates-signup";

/* The end of /civics: Donate (Zeffy, in a new window, as the header's
   Donate pill), and "Stay more informed", which opens the signup in place:
   an email and a county, posted to /api/updates. Without signupEnabled
   (updatesSignupConfigured) the signup isn't offered, because it could only
   fail.

   The email is echoed back on the voter's own screen only, never into a
   URL or track(). updates_signed_up carries no props. */

type Field = "email" | "countyFips";
type Stage =
  | { kind: "closed" }
  | { kind: "open"; errors: Partial<Record<Field, string>>; message?: string }
  | { kind: "sending" }
  | { kind: "done" };

export function StayInformed({ signupEnabled }: { signupEnabled: boolean }) {
  const [stage, setStage] = useState<Stage>({ kind: "closed" });
  const [email, setEmail] = useState("");
  const [countyFips, setCountyFips] = useState("");
  const id = useId();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = updatesSignup.safeParse({ email, countyFips });
    if (!parsed.success) {
      const errors: Partial<Record<Field, string>> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as Field;
        errors[field] ??= field === "email" ? EMAIL_MESSAGE : COUNTY_MESSAGE;
      }
      setStage({ kind: "open", errors });
      return;
    }
    setStage({ kind: "sending" });
    try {
      const res = await fetch("/api/updates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (res.ok) {
        track("updates_signed_up");
        setStage({ kind: "done" });
        return;
      }
      const body = (await res.json().catch(() => ({}))) as { error?: string; field?: Field };
      const message = body.error ?? "We couldn't sign you up just now — try again shortly.";
      setStage(
        body.field === "email" || body.field === "countyFips"
          ? { kind: "open", errors: { [body.field]: message } }
          : { kind: "open", errors: {}, message }
      );
    } catch {
      setStage({ kind: "open", errors: {}, message: "We couldn't reach the server — try again." });
    }
  }

  const errors = stage.kind === "open" ? stage.errors : {};

  return (
    <section aria-labelledby={`${id}-h`} className="flex flex-col gap-4">
      <h2 id={`${id}-h`} className="text-h2">
        Want to stay more informed?
      </h2>
      <p className="text-body">
        Know Your Vote is free and run by a nonprofit. A donation keeps it going.
      </p>
      <div className="flex flex-wrap gap-3">
        <a
          href={DONATE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-md bg-primary px-[20px] py-3 text-label text-on-primary hover:bg-primary-hover"
        >
          Donate
        </a>
        {signupEnabled && stage.kind === "closed" && (
          <Button variant="secondary" onClick={() => setStage({ kind: "open", errors: {} })}>
            Stay more informed
          </Button>
        )}
      </div>

      {stage.kind === "done" && (
        <p className="text-body" role="status">
          You&rsquo;re signed up. We&rsquo;ll send {email} county news, updates and civic
          updates. Every email has an unsubscribe link.
        </p>
      )}

      {(stage.kind === "open" || stage.kind === "sending") && (
        <form noValidate onSubmit={submit} className="flex max-w-[420px] flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor={`${id}-email`} className="text-label">
              Your email
            </label>
            <Input
              id={`${id}-email`}
              type="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? `${id}-email-err` : undefined}
            />
            {errors.email && (
              <p id={`${id}-email-err`} role="alert" className="text-body-sm text-error">
                {errors.email}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={`${id}-county`} className="text-label">
              Your county
            </label>
            <p id={`${id}-county-hint`} className="text-body-sm text-on-surface-muted">
              For news and updates about your own county, plus civic updates for all of Florida.
            </p>
            <select
              id={`${id}-county`}
              value={countyFips}
              onChange={(e) => setCountyFips(e.target.value)}
              aria-invalid={Boolean(errors.countyFips)}
              aria-describedby={`${id}-county-hint${errors.countyFips ? ` ${id}-county-err` : ""}`}
              className="w-full rounded-md border border-border-input bg-surface px-[14px] py-3 text-body text-on-surface focus:border-primary aria-[invalid=true]:border-error"
            >
              <option value="">Choose your county</option>
              {FL_COUNTIES.map((c) => (
                <option key={c.fips} value={c.fips}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.countyFips && (
              <p id={`${id}-county-err`} role="alert" className="text-body-sm text-error">
                {errors.countyFips}
              </p>
            )}
          </div>
          {stage.kind === "open" && stage.message && (
            <p role="alert" className="text-body-sm text-error">
              {stage.message}
            </p>
          )}
          <p className="text-body-sm text-on-surface-muted">
            We keep your email and county, nothing else, and never sell or share them. Unsubscribe
            any time.
          </p>
          <Button type="submit" disabled={stage.kind === "sending"}>
            {stage.kind === "sending" ? "Signing you up…" : "Sign me up"}
          </Button>
        </form>
      )}
    </section>
  );
}
