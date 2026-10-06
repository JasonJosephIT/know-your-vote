"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { track } from "@/lib/analytics";
import type { OfficialSources } from "@/lib/notifications/config";

type Stage =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent" }
  /* `consent` marks the one error that belongs to a field (the box), so it
     can sit on that field; the rest come from the server and aren't. */
  | { kind: "error"; message: string; consent?: boolean };

/* The voting-info signup (FR-010): one email now with where to vote (the
   county's official precinct lookup) and the key dates, then the deadline
   reminders (send-reminders cron), which mail every active subscription.
   The copy says both, because the privacy page already does and the second
   email must not surprise anyone. It says "where to vote", not "your
   polling place": the email links to the lookup, it does not name the
   place.

   Both flags come from a server component, because the env behind them is
   secret (src/lib/notifications/config.ts; launch handoff 2026-10-04, §2):
   - emailEnabled is emailDeliveryConfigured(). When delivery is not
     configured the form could only end in a 503, so it is not offered:
     the voter gets the official sources the email would have pointed to
     instead, and nothing to fill in.
   - remindersOn is !remindersPaused(). While NOTIFICATIONS_PAUSED stops
     the cron (design doc §7: a wrong date caught, sends held), the form
     and the welcome email stop promising reminders. */
export function VotingInfo({
  zip: initialZip = "",
  emailEnabled,
  remindersOn,
  sources,
  heading = "Get your polling place by email",
  intro,
  countyFips,
}: {
  zip?: string;
  emailEnabled: boolean;
  remindersOn: boolean;
  /* Needed only for the no-email fallback. */
  sources?: OfficialSources;
  heading?: string;
  /* Defaults to the races view's wording for remindersOn. */
  intro?: string;
  /* The county the races view resolved, so the calendar link gives that
     county's dates (its early voting runs wider than the statewide
     window). */
  countyFips?: string;
}) {
  const [zip, setZip] = useState(initialZip);
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [stage, setStage] = useState<Stage>({ kind: "idle" });
  const consentRef = useRef<HTMLInputElement>(null);
  const consentErrorId = useId();
  const consentError = stage.kind === "error" && stage.consent === true;

  /* Errors that announce (interface review 2026-10-05): the consent error is
     the box's own, so focus goes to the box, which reports itself invalid
     and reads the message as its description. */
  useEffect(() => {
    if (consentError) consentRef.current?.focus();
  }, [consentError]);

  if (!emailEnabled) {
    return sources ? <OfficialSourcesCard sources={sources} /> : null;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!consent) {
      setStage({
        kind: "error",
        message: "Check the consent box first — we only email people who ask.",
        consent: true,
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
      const data = (await res.json()) as { error?: string };
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
    /* The form, and the focused button with it, is gone, so focus moves to
       the message that replaced it: that move is the announcement (a status
       region inserted already holding its text is read inconsistently), and
       focus doesn't fall to <body> (interface review 2026-10-05; the same
       failure SitePrompts fixes for the cookie banner). */
    return (
      <p
        ref={(el) => el?.focus()}
        tabIndex={-1}
        className="rounded-md bg-primary-muted px-4 py-3 text-body-sm text-primary-hover focus:outline-none"
      >
        {remindersOn
          ? "Sent. Check your inbox for where to vote and the key dates. A short reminder follows as each remaining deadline comes up, and every email has an unsubscribe link."
          : "Sent. Check your inbox for where to vote and the key dates. The email has an unsubscribe link."}
      </p>
    );
  }

  return (
    <Card>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <h2 className="text-h3">{heading}</h2>
        <p className="text-body-sm text-on-surface-muted">
          {intro ??
            (remindersOn
              ? "One email now with where to vote and the key deadlines, then a short reminder as each remaining deadline comes up, through Election Day. It's the only time we ever ask for anything personal."
              : "One email with where to vote and the key deadlines — the only time we ever ask for anything personal.")}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          {/* Visible labels that stay put once the voter types (WCAG
              3.3.2), and autocomplete tokens so autofill and assistive
              tools know these ask for a postal code and an email (WCAG
              1.3.5): production re-run, 2026-10-05. */}
          <label className="flex flex-col gap-1 text-label text-on-surface sm:max-w-[140px]">
            ZIP code
            <Input
              name="zip"
              autoComplete="postal-code"
              inputMode="numeric"
              maxLength={5}
              placeholder="33130"
              value={zip}
              onChange={(e) => setZip(e.target.value.replace(/\D/g, ""))}
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-label text-on-surface">
            Email address
            <Input
              name="email"
              autoComplete="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
        </div>
        <label className="flex items-start gap-2 text-body-sm text-on-surface-muted">
          <input
            ref={consentRef}
            type="checkbox"
            checked={consent}
            aria-invalid={consentError || undefined}
            aria-describedby={consentError ? consentErrorId : undefined}
            onChange={(e) => {
              setConsent(e.target.checked);
              if (consentError) setStage({ kind: "idle" });
            }}
            className="mt-1 size-4 shrink-0 accent-[var(--color-primary)]"
          />
          <span>
            {remindersOn
              ? "Yes — email me where to vote and the key deadlines now, and a reminder as each remaining deadline comes up."
              : "Yes — email me where to vote and the key deadlines."}{" "}
            We store only your email and ZIP, never link them to your
            browsing, and every email has an unsubscribe link.
          </span>
        </label>
        {stage.kind === "error" && stage.consent && (
          <p id={consentErrorId} className="text-body-sm text-error">
            {stage.message}
          </p>
        )}
        {stage.kind === "error" && !stage.consent && (
          <p role="alert" className="text-body-sm text-error">
            {stage.message}
          </p>
        )}
        <Button type="submit" disabled={stage.kind === "sending"} className="w-fit">
          {stage.kind === "sending" ? "Sending…" : "Email my voting info"}
        </Button>
        <p className="text-caption text-on-surface-muted">
          No email needed:{" "}
          <a
            href={`/api/calendar/general_2026.ics${countyFips ? `?county=${countyFips}` : ""}`}
            className="underline underline-offset-2 hover:text-on-surface"
          >
            add the key dates straight to your calendar
          </a>
          .
        </p>
      </form>
    </Card>
  );
}

/* The fallback. Same offices the email names (officialSources), so a voter
   gets the same answer either way, just without the inbox. No calendar link
   here: the .ics route needs the same service-role key whose absence is the
   likeliest reason this card is showing. */
function OfficialSourcesCard({ sources }: { sources: OfficialSources }) {
  const link = "text-primary underline underline-offset-2 hover:text-primary-hover";
  return (
    <Card className="flex flex-col gap-2">
      <h2 className="text-h3">Find your polling place</h2>
      <p className="text-body-sm text-on-surface-muted">
        {sources.office ? (
          <>
            The{" "}
            <a href={sources.office.url} className={link}>
              {sources.office.name}
            </a>{" "}
            lists your polling place, its hours and your sample ballot. Its
            precinct lookup shows exactly where you vote.
          </>
        ) : (
          <>
            Your county Supervisor of Elections lists your polling place, its
            hours and your sample ballot, and the{" "}
            <a href={sources.state.url} className={link}>
              {sources.state.name}
            </a>{" "}
            can point you to yours.
          </>
        )}
      </p>
      <p className="text-caption text-on-surface-muted">
        Registration, vote-by-mail and early voting dates are on the{" "}
        <a href={sources.dates.url} className="underline underline-offset-2 hover:text-on-surface">
          {sources.dates.name}
        </a>
        .
      </p>
    </Card>
  );
}
