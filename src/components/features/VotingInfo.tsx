"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorGlyph, LockGlyph } from "@/components/ui/Glyphs";
import { Input } from "@/components/ui/Input";
import { track } from "@/lib/analytics";
import type { OfficialSources } from "@/lib/notifications/config";

let errorSeq = 0;

type Field = "zip" | "email" | "consent";
type FieldErrors = Partial<Record<Field, string>>;

/* Form order: focus goes to the first field with a problem. */
const FIELDS: readonly Field[] = ["zip", "email", "consent"];

/* The ZIP and email words are the ones /api/voting-info answers with, so a
   value this form lets through and the route refuses reads the same
   (src/app/api/voting-info/route.ts). */
const MESSAGES: Record<Field, string> = {
  zip: "Enter a 5-digit ZIP code.",
  email: "Enter an email address, like name@example.com.",
  consent: "Check the consent box first — we only email people who ask.",
};

type Stage =
  | { kind: "idle" }
  | { kind: "sending" }
  /* The address as the voter typed it, echoed back on their own screen
     only: never into a URL or track(). */
  | { kind: "sent"; email: string }
  /* Problems with what was typed or ticked, each under its own field
     (Mobbin catalog 2026-10-12, RS5 Claude). `seq` is new for every check
     that finds one, so the messages remount and are read again even when
     the same one comes back; fixing a field drops only its own message. */
  | { kind: "invalid"; errors: FieldErrors; seq: number }
  /* The server or the network failed (429, 502, 503, no answer): about no
     field, so it sits above the button, for the whole form. */
  | { kind: "error"; message: string; seq: number };

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
     and the welcome email stop promising reminders.

   The ZIP stays through Nov 3 (founder decision D4 (a), 2026-10-13): it
   picks the county whose dates the emails carry. */
export function VotingInfo({
  zip: initialZip = "",
  emailEnabled,
  remindersOn,
  sources,
  heading = "Get your polling place by email",
  intro,
  zipHint,
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
  /* Said under the ZIP label, before anyone types: which ZIPs the emails
     cover (Mobbin catalog 2026-10-12, RS1 Legora). The home card passes
     it; the races view, which has already placed the voter in a covered
     county, passes nothing. */
  zipHint?: string;
  /* The county the races view resolved, so the calendar link gives that
     county's dates (its early voting runs wider than the statewide
     window). */
  countyFips?: string;
}) {
  const [zip, setZip] = useState(initialZip);
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [stage, setStage] = useState<Stage>({ kind: "idle" });
  const id = useId();
  const zipRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const consentRef = useRef<HTMLInputElement>(null);

  /* Errors that announce (interface review 2026-10-05; RS5). Focus goes to
     the first field with a problem, which reports itself invalid and reads
     its message as its description; after "Use a different email", to the
     email field. The target is set in the handler and used once here,
     after the render that marks the field, so a later re-render, or a
     keystroke that clears one message, never pulls focus back. */
  const focusNext = useRef<Field | null>(null);
  useEffect(() => {
    const field = focusNext.current;
    focusNext.current = null;
    if (field === "zip") zipRef.current?.focus();
    else if (field === "email") emailRef.current?.focus();
    else if (field === "consent") consentRef.current?.focus();
  }, [stage]);

  /* "Check your inbox" takes focus once, when the form turns into it. A
     stable ref and an effect keyed on the stage, not an inline callback
     ref: React re-runs a new callback ref on every render, which would pull
     focus back here (and scroll to it) after any later re-render, such as
     the router.refresh() of "Forget my district" (review 2026-10-05). */
  const sentRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (stage.kind === "sent") sentRef.current?.focus({ preventScroll: true });
  }, [stage.kind]);

  if (!emailEnabled) {
    return sources ? <OfficialSourcesCard sources={sources} /> : null;
  }

  function showInvalid(errors: FieldErrors) {
    focusNext.current = FIELDS.find((f) => errors[f]) ?? null;
    setStage({ kind: "invalid", errors, seq: ++errorSeq });
  }

  function clearError(field: Field) {
    setStage((s) => {
      if (s.kind !== "invalid" || !s.errors[field]) return s;
      const errors = { ...s.errors };
      delete errors[field];
      return Object.keys(errors).length > 0 ? { ...s, errors } : { kind: "idle" };
    });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    /* Checked here, before anything is sent, so every problem shows at
       once, under its own field. The form is noValidate: the browser's own
       bubble shows one problem at a time, in its words, and then goes. */
    const found: FieldErrors = {};
    if (!/^\d{5}$/.test(zip)) found.zip = MESSAGES.zip;
    if (!email.trim() || emailRef.current?.validity.typeMismatch) found.email = MESSAGES.email;
    if (!consent) found.consent = MESSAGES.consent;
    if (Object.keys(found).length > 0) {
      showInvalid(found);
      return;
    }
    setStage({ kind: "sending" });
    try {
      const res = await fetch("/api/voting-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zip, email, consent }),
      });
      const data = (await res.json()) as { error?: string; field?: string };
      if (!res.ok) {
        const message = data.error ?? "That didn't send — try again.";
        /* A 400 about one field names it: the key decides where the
           message goes, never its words. */
        if (data.field === "zip" || data.field === "email") {
          showInvalid({ [data.field]: message });
        } else {
          setStage({ kind: "error", message, seq: ++errorSeq });
        }
        return;
      }
      track("voting_info_requested");
      setStage({ kind: "sent", email: email.trim() });
    } catch {
      setStage({ kind: "error", message: "That didn't send — try again.", seq: ++errorSeq });
    }
  }

  /* Back to the form with the ZIP and the box as they were, and focus in
     the email field: a mistyped address is fixed without reloading (RS2
     Langdock). */
  function changeEmail() {
    focusNext.current = "email";
    setStage({ kind: "idle" });
  }

  const errors = stage.kind === "invalid" ? stage.errors : {};
  const seq = stage.kind === "invalid" ? stage.seq : 0;
  const describedBy = (...ids: (string | false | undefined)[]) =>
    ids.filter(Boolean).join(" ") || undefined;

  /* The Card and its heading stay put whichever body shows, so the layout
     doesn't jump and the voter keeps their place (RS2 Langdock, with Sana
     AI folded in). */
  return (
    <Card className="flex flex-col gap-3">
      <h2 id={`${id}-heading`} className="text-h3">
        {heading}
      </h2>
      {stage.kind === "sent" ? (
        /* "Sent." isn't true of every success: the route sends the welcome
           email at most once a day per address and ZIP (three a day per
           address) and answers a repeat with the same status and body as a
           send, so the form can't tell them apart
           (src/lib/notifications/welcome-throttle.ts). "We sent" holds for
           a repeat today as well, and the line after it says so.

           Focus moving to the heading is the announcement, at every width.
           At lg and up, and only when the voter hasn't asked for reduced
           motion, the message also fades in over motion.base (founder
           decision D2 (a), 2026-10-13: below lg nothing moves). */
        <div className="flex flex-col gap-2 rounded-md bg-primary-muted p-4 text-primary-hover lg:motion-safe:transition-opacity lg:motion-safe:duration-200 lg:motion-safe:starting:opacity-0">
          <h3 ref={sentRef} tabIndex={-1} className="text-label focus:outline-none">
            Check your inbox
          </h3>
          <p className="text-body-sm">
            We sent where to vote and the key dates to{" "}
            <span className="font-medium">{stage.email}</span>.
          </p>
          <p className="text-body-sm">
            {remindersOn
              ? "A short reminder follows as each remaining deadline comes up, and every email has an unsubscribe link."
              : "The email has an unsubscribe link."}
          </p>
          <p className="text-body-sm">
            Already signed up today with this ZIP? It&rsquo;s the email you
            already have.
          </p>
          <button
            type="button"
            onClick={changeEmail}
            className="inline-flex min-h-[24px] w-fit items-center text-body-sm underline underline-offset-2 hover:text-on-surface"
          >
            Use a different email
          </button>
        </div>
      ) : (
        <form
          onSubmit={submit}
          noValidate
          aria-labelledby={`${id}-heading`}
          className="flex flex-col gap-3"
        >
          <p className="text-body-sm text-on-surface-muted">
            {intro ??
              (remindersOn
                ? "One email now with where to vote and the key deadlines, then a short reminder as each remaining deadline comes up, through Election Day. It's the only time we ever ask for anything personal."
                : "One email with where to vote and the key deadlines — the only time we ever ask for anything personal.")}
          </p>
          {/* Visible labels that stay put once the voter types (WCAG
              3.3.2), and autocomplete tokens so autofill and assistive
              tools know these ask for a postal code and an email (WCAG
              1.3.5): production re-run, 2026-10-05. The fields stack at
              every width, so a hint or an error under one has room to
              read on one or two lines. */}
          <div className="flex flex-col gap-1">
            <label htmlFor={`${id}-zip`} className="text-label text-on-surface">
              ZIP code
            </label>
            {zipHint && (
              <p id={`${id}-zip-hint`} className="text-body-sm text-on-surface-muted">
                {zipHint}
              </p>
            )}
            <Input
              ref={zipRef}
              id={`${id}-zip`}
              name="zip"
              autoComplete="postal-code"
              inputMode="numeric"
              maxLength={5}
              placeholder="33130"
              value={zip}
              aria-invalid={errors.zip ? true : undefined}
              aria-describedby={describedBy(
                zipHint && `${id}-zip-hint`,
                errors.zip && `${id}-zip-error`
              )}
              onChange={(e) => {
                setZip(e.target.value.replace(/\D/g, ""));
                clearError("zip");
              }}
              className="sm:max-w-[140px]"
            />
            {errors.zip && <ErrorLine key={seq} id={`${id}-zip-error`} message={errors.zip} />}
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={`${id}-email`} className="text-label text-on-surface">
              Email address
            </label>
            <Input
              ref={emailRef}
              id={`${id}-email`}
              name="email"
              autoComplete="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={describedBy(errors.email && `${id}-email-error`)}
              onChange={(e) => {
                setEmail(e.target.value);
                clearError("email");
              }}
              className="sm:max-w-[400px]"
            />
            {errors.email && (
              <ErrorLine key={seq} id={`${id}-email-error`} message={errors.email} />
            )}
          </div>
          {/* The box's label is the consent sentence and nothing else, its
              words unchanged until the founder signs off a rewording; the
              storage promise has its own line under the button (RS1
              Legora). A 20px box: size-5 is 24px on this scale. */}
          <div className="flex flex-col gap-1">
            <label className="flex min-h-[24px] items-start gap-2 text-body-sm text-on-surface">
              <input
                ref={consentRef}
                type="checkbox"
                checked={consent}
                aria-invalid={errors.consent ? true : undefined}
                aria-describedby={describedBy(errors.consent && `${id}-consent-error`)}
                onChange={(e) => {
                  setConsent(e.target.checked);
                  clearError("consent");
                }}
                className="size-[20px] shrink-0 accent-[var(--color-primary)]"
              />
              <span>
                {remindersOn
                  ? "Yes — email me where to vote and the key deadlines now, and a reminder as each remaining deadline comes up."
                  : "Yes — email me where to vote and the key deadlines."}
              </span>
            </label>
            {errors.consent && (
              <ErrorLine key={seq} id={`${id}-consent-error`} message={errors.consent} />
            )}
          </div>
          {stage.kind === "error" && <ErrorLine key={stage.seq} message={stage.message} />}
          <Button type="submit" disabled={stage.kind === "sending"} className="w-fit">
            {stage.kind === "sending" ? "Sending…" : "Email my voting info"}
          </Button>
          <p className="flex items-start gap-1 text-body-sm text-on-surface-muted">
            <span className="mt-[3px] flex shrink-0">
              <LockGlyph />
            </span>
            <span>
              We store only your email and ZIP, never link them to your
              browsing, and every email has an unsubscribe link.{" "}
              <Link href="/privacy" className="underline underline-offset-2 hover:text-on-surface">
                How we handle it
              </Link>
            </span>
          </p>
          <p className="text-body-sm text-on-surface-muted">
            No email needed:{" "}
            <a
              href={`/api/calendar/general_2026.ics${countyFips ? `?county=${countyFips}` : ""}`}
              className="underline underline-offset-2 hover:text-on-surface"
            >
              add the key dates to your calendar (downloads a file)
            </a>
            .
          </p>
        </form>
      )}
    </Card>
  );
}

/* One error line: the glyph, then the words, in the error colour (AD1
   Square). A role=alert, so it is read wherever focus is: pressing Enter in
   a field leaves focus there, and nothing else would speak it. A field's
   line carries the id its field names as its description. */
function ErrorLine({ id, message }: { id?: string; message: string }) {
  return (
    <p id={id} role="alert" className="flex items-start gap-1 text-body-sm text-error">
      <span className="mt-[3px] flex shrink-0">
        <ErrorGlyph />
      </span>
      <span>{message}</span>
    </p>
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
