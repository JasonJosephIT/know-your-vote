"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Button } from "@/components/ui/Button";
import { CaretGlyph, ErrorGlyph, LockGlyph } from "@/components/ui/Glyphs";
import { Input } from "@/components/ui/Input";
import { CountyPicker } from "@/components/features/CountyPicker";
import { track } from "@/lib/analytics";
import { COVERED_COUNTIES, coveredCountyNames } from "@/lib/counties";
import { STATEWIDE_BALLOT_HREF } from "@/lib/coverage";
import { writeDistrictCookie } from "@/lib/district-cookie";
import { locationFieldCopy } from "@/lib/scope-copy";
import { supervisorLink } from "@/lib/supervisors";
/* Type-only from address-lookup.ts: a value import would ship zod to every
   page with this field. The text rule comes from the zod-free module. */
import type { AddressSuggestion } from "@/lib/address-lookup";
import { looksLikeStreetAddress } from "@/lib/address-text";
import type { CoveredDistrict } from "@/lib/resolve";
import type { ResolveResult } from "@/types/app";

/* One field, one kind of answer: a street address (founder, 2026-10-12:
   the ZIP option is gone).

   An address resolves to a census block and therefore to exactly one
   district, with nothing to confirm. A ZIP can only ever answer "one of
   these two districts" (75 covered ZIPs span two), and 29 of the covered
   non-split ZIPs even contain a sliver the ZIP answers wrongly without
   saying so. So a bare ZIP is refused with a field error that says what to
   add; a ZIP inside the address is fine, and the geocoder needs it or the city.

   An address gets there one of two ways (src/app/api/address/resolve),
   both through our server to Google:
   - suggestEnabled: it completes as you type (Google Places), and the
     suggestion you pick posts its place id.
   - you type the whole address and press Enter without picking, and the
     text goes to Google's geocoder. With suggestEnabled off the field is a
     plain text box, not a combobox.

   Underneath is the district picker, which needs no third party at all.
   It is the way to go on without sharing an address, the fallback when a
   lookup fails, and, with ADDRESS_LOOKUP_OFF set, all there is: no field.
   It is a visible second route, open under a divider with its own
   question (Mobbin AD7, Apple), unless the page passes pickerCollapsed
   (home, where it sits behind a toggle). Every error ends in a button that
   opens it and moves focus to it (AD2, Zalando), never in "try your ZIP".
   When the district list can't be read, links to each covered county and
   the statewide ballot take the picker's place.

   Whatever route the voter takes, the outcome is the same: a district and a
   county in a cookie, and a URL carrying those two values -- never the
   address. */

let errorSeq = 0;

/* What an error says (Mobbin NS1, Walmart): one short lead, which is the
   only line announced, then, for an address Google couldn't match, a
   "What to check" list of one to three fixes. The way on (the district
   picker, or trying again) is a button under it, not more words. */
type ErrorCopy = { lead: string; checks?: readonly string[] };

type Stage =
  | { kind: "idle" }
  | { kind: "loading" }
  /* `field` (the default) marks an error about what was typed, which sits on
     the field; false marks one that isn't (the network or the server
     failed). `entered` is the typed address the answer is about, echoed on
     screen only. `seq` is new for every error, so the alert remounts and is
     read again even when the same message comes back twice. */
  | {
      kind: "error";
      copy: ErrorCopy;
      field?: boolean;
      entered?: string;
      seq: number;
    }
  | { kind: "outOfCoverage" };

/* What one lookup sends: a picked suggestion's point, or a typed address. */
type Lookup = { placeId: string; sessionToken: string } | { address: string };

const MIN_ADDRESS_CHARS = 5;
const DEBOUNCE_MS = 250;

/* The address answers that are about what was typed (a 422 from the resolve
   route), each with the fixes it needs. */
const UNMATCHED: Record<string, ErrorCopy> = {
  none: {
    lead: "We couldn't match that address.",
    checks: ["The house number and street", "The city and ZIP code"],
  },
  /* The ZIP, not "city or ZIP": Google also answers with its own spelling
     of the city ("Sunny Isles" is SUNNY ISLES BEACH), and a ZIP settles it
     whatever the voter calls the place. */
  needsPlace: {
    lead: "We couldn't match that address.",
    checks: ["The ZIP code: add it, so we're sure which one you mean"],
  },
  /* A city and a ZIP that point to different places. Not "leave the ZIP
     off": in Broward the city alone can find another city's copy of the
     same street. */
  placeConflict: {
    lead: "We couldn't match that address.",
    checks: [
      "The city and ZIP code, as they appear on your mail: they point to different places",
      "The street",
    ],
  },
  /* Google found the place, but another direction, type or house number. */
  checkStreet: {
    lead: "We couldn't match that address.",
    checks: [
      "The house number",
      "The direction, like N or SW",
      "The street type, like St or Ave",
    ],
  },
  ambiguous: {
    lead: "That address matches more than one place.",
    checks: [
      "The ZIP code",
      "The street's direction, like N or SW, if it has one",
    ],
  },
};

/* A bare ZIP (or ZIP+4): the one answer the field refuses outright. */
const ZIP_ALONE =
  "A ZIP code alone can't tell us your district. Add your house number and street.";

/* The text buttons under an error ("Edit address", "Choose your district
   instead"): a link's look, at least 24px tall (WCAG 2.5.8). */
const TEXT_BUTTON =
  "inline-flex min-h-[24px] w-fit items-center text-body-sm text-primary underline underline-offset-2 hover:text-primary-hover";

/* false while the server renders and the page hydrates, true after. The
   address path runs here, by POST, so until hydration the submit button is
   disabled: a disabled default button also blocks Enter (HTML's implicit
   submission), so nothing ever submits natively. The field has no `name`
   besides, so even a native submit would carry no address. */
const subscribeNothing = () => () => {};
function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false
  );
}

/* Without JavaScript the address form can't work (it posts from here), and
   a GET would put the address in a URL. So it is hidden then, with the
   picker's whole block (its divider, toggle and form), and the noscript
   links stand in. */
const NO_SCRIPT_CSS = "#location-form,#district-picker-route{display:none}";

/* The field shows only while addressEnabled (addressEntryEnabled()): with
   address lookup switched off (ADDRESS_LOOKUP_OFF) there is no field, and
   the district picker shows open. It never falls back to a ZIP. */
export function LocationEntry({
  submitLabel = "See my races",
  placeholder,
  addressEnabled = false,
  suggestEnabled = false,
  districts = [],
  pickerCollapsed = false,
  privacyNote = true,
  coverageNote = true,
}: {
  submitLabel?: string;
  placeholder?: string;
  /* The field takes a street address (addressEntryEnabled()). */
  addressEnabled?: boolean;
  /* It also suggests addresses as the voter types (geocoderConfigured():
     a Google key). Never true without addressEnabled. */
  suggestEnabled?: boolean;
  districts?: CoveredDistrict[];
  /* The district picker sits behind an "Or choose your district" toggle
     instead of showing open. Home passes it; YourRaces (frozen) passes
     nothing and gets the open picker. Ignored with no field: the picker is
     then the only route. */
  pickerCollapsed?: boolean;
  /* The line under the field saying where a typed address goes and what is
     kept. Home passes false: its House step already says so. */
  privacyNote?: boolean;
  /* The "Full statewide coverage" note under the field. The home page's
     House step says the same in its own paragraph and passes false. */
  coverageNote?: boolean;
} = {}) {
  const hintId = useId();
  const router = useRouter();
  const listId = useId();
  const errorId = useId();
  const pickerHelpId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLSelectElement>(null);
  const [value, setValue] = useState("");
  const [stage, setStage] = useState<Stage>({ kind: "idle" });
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  /* Open from the start unless the page asks for it collapsed, and always
     open with the switch off: the picker is then the only way to a
     district, so it is not behind a toggle. */
  const collapsible = addressEnabled && pickerCollapsed;
  const [showPicker, setShowPicker] = useState(!collapsible);
  const hydrated = useHydrated();
  /* The same words on the server and in the browser: the field takes an
     address or is not there, so nothing changes at hydration. */
  const field = locationFieldCopy(addressEnabled);
  /* No county yet, so the Division of Elections' list of all 67. */
  const supervisor = supervisorLink();

  /* The suggestion request still in flight, cancelled by the next one. */
  const abort = useRef<AbortController | null>(null);
  /* Google's session token: the suggestions typed toward one address and
     the pick that ends them bill as one session. A new one after each pick. */
  const session = useRef<string | null>(null);
  const sessionToken = () => (session.current ??= crypto.randomUUID());
  /* The last lookup sent, so "Try again" sends the same one. */
  const lastPick = useRef<Lookup | null>(null);
  /* Set by "Choose your district instead" while the picker is still closed:
     focus moves to it once it has rendered. */
  const focusPickerNext = useRef(false);

  const trimmed = value.trim();
  const digitsOnly = /^[\d\s-]+$/.test(trimmed);
  const zipAlone = /^\d{5}(?:[\s-]?\d{4})?$/.test(trimmed);
  const suggesting =
    suggestEnabled &&
    addressEnabled &&
    trimmed.length >= MIN_ADDRESS_CHARS &&
    !digitsOnly;

  /* Derived, not cleared in an effect. Typing only digits turns off
     suggestions and the dropdown has to go with it -- doing that with
     setState inside the effect is what React 19's set-state-in-effect rule
     warns about, and deriving is simply correct anyway: there is nothing to
     remember. */
  const visible = suggesting ? suggestions : [];
  const highlighted = suggesting ? activeIndex : -1;
  const fieldError = stage.kind === "error" && stage.field !== false;

  /* Errors that announce (interface review 2026-10-05). An error about what
     was typed belongs to the field: the field reports itself invalid and
     names the message as its description, and the message is a role=alert
     so it is read wherever focus is (pressing Enter in the field leaves
     focus there, and nothing else would speak it).

     Focus moves to the field only when it was lost or sits on this form's
     own submit button, which "Looking up…" disables: never away from a
     control the voter moved to while waiting. A failure that isn't about
     the field does the same, because "Try again" unmounts as the retry
     starts and would leave focus on <body>; from the field, Enter retries
     too. */
  const anyError = stage.kind === "error";
  useEffect(() => {
    if (!anyError) return;
    const active = document.activeElement;
    const submitButton = inputRef.current?.form?.querySelector('[type="submit"]');
    if (!active || active === document.body || active === submitButton) {
      inputRef.current?.focus();
    }
  }, [anyError, stage]);

  /* The picker appears without animation; focus moving to it is the cue
     (AD2). */
  useEffect(() => {
    if (showPicker && focusPickerNext.current) {
      focusPickerNext.current = false;
      pickerRef.current?.focus();
    }
  }, [showPicker]);

  function fail(copy: string | ErrorCopy, field = true, entered?: string) {
    setStage({
      kind: "error",
      copy: typeof copy === "string" ? { lead: copy } : copy,
      field,
      entered,
      seq: ++errorSeq,
    });
  }

  /* "Choose your district instead": open the picker if the page keeps it
     collapsed, and move focus to its select. */
  function choosePicker() {
    if (pickerRef.current) {
      pickerRef.current.focus();
      return;
    }
    focusPickerNext.current = true;
    setShowPicker(true);
  }

  /* "Edit address": back to the field with the text kept, caret at the
     end. */
  function editAddress() {
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }

  /* Combobox semantics only when there can be a list (interface review
     2026-10-05). Without suggestions, which is production, the field is a
     plain text box; announcing it as an autocomplete promised a list of
     suggestions that never appears. */
  const combobox = suggestEnabled
    ? {
        role: "combobox" as const,
        "aria-expanded": visible.length > 0,
        "aria-controls": listId,
        "aria-autocomplete": "list" as const,
        "aria-activedescendant":
          highlighted >= 0 ? `${listId}-${highlighted}` : undefined,
      }
    : {};

  /* Suggestions, debounced. A keystroke is a billed request, so this waits for a
     pause, needs five characters, and cancels whatever is still in flight. */
  useEffect(() => {
    if (!suggesting) return;
    const timer = setTimeout(async () => {
      abort.current?.abort();
      const controller = new AbortController();
      abort.current = controller;
      try {
        const res = await fetch("/api/address/suggest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ q: trimmed, sessionToken: sessionToken() }),
          signal: controller.signal,
        });
        if (!res.ok) {
          setSuggestions([]);
          return;
        }
        const data: { suggestions?: AddressSuggestion[] } = await res.json();
        setSuggestions(data.suggestions ?? []);
        setActiveIndex(-1);
      } catch {
        /* Aborted or offline. An empty dropdown is the honest state; the
           typed address and the picker are both still there. */
        setSuggestions([]);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [suggesting, trimmed]);

  /* The one place a district is committed, whatever produced it. */
  function commit(
    choice: { district: string; countyFips: string },
    via: "address" | "picker"
  ) {
    writeDistrictCookie(choice);
    track("district_set", { via });
    const q = new URLSearchParams({
      view: "races",
      district: choice.district,
      county: choice.countyFips,
    });
    router.push(`/candidates?${q}`);
  }

  /* A picked suggestion posts its place id; a typed address posts the text.
     Both in the body, never a URL. */
  async function resolveAddress(pick: Lookup) {
    lastPick.current = pick;
    if ("placeId" in pick) session.current = null;
    setStage({ kind: "loading" });
    setSuggestions([]);
    try {
      const res = await fetch("/api/address/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pick),
      });
      if (res.status === 422) {
        /* Google answered, about what was typed: the field says what to
           check, and echoes a typed address back (on screen only, from
           this component's state: never into track(), a log or a URL). A
           picked suggestion has no typed address to echo. */
        const data: { reason?: string } = await res.json().catch(() => ({}));
        fail(
          UNMATCHED[data.reason ?? ""] ?? UNMATCHED.none,
          true,
          "address" in pick ? pick.address : undefined
        );
        return;
      }
      if (!res.ok) {
        /* 400, 429 and 5xx are all ours or the geocoder's, never what the
           voter typed: not a field error. */
        fail(
          "We couldn't look up that address just now. Try again in a minute, or choose your district.",
          false
        );
        return;
      }
      const data: ResolveResult = await res.json();
      if (!data.inCoverage) {
        setStage({ kind: "outOfCoverage" });
        return;
      }
      /* A Florida address outside the counties we can place in a district:
         the statewide ballot is still theirs. Nothing is written to the
         district cookie -- there is no district to remember. */
      if (data.coverage === "statewide") {
        router.push(STATEWIDE_BALLOT_HREF);
        return;
      }
      if (!data.district || !data.countyFips) {
        fail("We couldn't place that address in a district.");
        return;
      }
      commit(
        { district: data.district, countyFips: data.countyFips },
        "address"
      );
    } catch {
      fail("Something went wrong — give it another try.", false);
    }
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    /* A ZIP alone names up to two districts, so it isn't sent anywhere:
       the field says what to add. */
    if (zipAlone) {
      fail(ZIP_ALONE);
      return;
    }
    /* An address with the dropdown open: Enter takes the highlighted one, or the
       first if none is highlighted. */
    const picked = visible[highlighted] ?? visible[0];
    if (picked) {
      void resolveAddress({ placeId: picked.id, sessionToken: sessionToken() });
      return;
    }
    /* No suggestion to take: the typed address itself, if it has a house
       number and a street. */
    if (!looksLikeStreetAddress(trimmed)) {
      fail("Enter your house number and street, with your city or ZIP code.");
      return;
    }
    void resolveAddress({ address: trimmed });
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (visible.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => (i + 1) % visible.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => (i <= 0 ? visible.length - 1 : i - 1));
    } else if (event.key === "Escape") {
      setSuggestions([]);
      setActiveIndex(-1);
    }
  }

  /* With no districts to list (the read failed), the picker has nothing to
     show, so the county links stand in, for everyone and with the field on
     or off: they are where every error's "choose your district below"
     leads, and with the switch off they are all there is. */
  const linksOnly = districts.length === 0;

  return (
    <div className="flex w-full flex-col gap-4">
      {/* No action, no method and no name on the field: the address only
          ever leaves in a POST body from submit(), never in a URL (the
          access log, the history, the next page's Referer). Without
          JavaScript this form is hidden and the noscript links below take
          its place. */}
      {addressEnabled && (
        <form
          id="location-form"
          onSubmit={submit}
          className="flex w-full flex-col gap-2"
        >
          {/* A visible label that stays put once the voter types, with an
              example as the placeholder, the same pattern as the reminder
              form (interface review 2026-10-05: the label was sr-only and
              the placeholder repeated it, so the field lost its name at the
              first keystroke). Above the row, so the field and button still
              line up. */}
          <label htmlFor="location" className="text-label text-on-surface">
            {field.label}
          </label>
          {field.hint && (
            <p id={hintId} className="-mt-1 text-body-sm text-on-surface-muted">
              {field.hint}
            </p>
          )}
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-start">
            <div className="relative flex w-full flex-col sm:max-w-[320px]">
              <Input
                ref={inputRef}
                id="location"
                aria-invalid={fieldError || undefined}
                aria-describedby={
                  [field.hint ? hintId : "", fieldError ? errorId : ""]
                    .filter(Boolean)
                    .join(" ") || undefined
                }
                {...combobox}
                autoComplete={field.autoComplete}
                placeholder={placeholder ?? field.example}
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  if (stage.kind === "error") setStage({ kind: "idle" });
                }}
                onKeyDown={onKeyDown}
              />
              {/* An error about what was typed, under the field (Mobbin
                  NS1, Walmart, inline rather than in a side sheet). Only the
                  lead is an alert; the field's description is the lead and
                  the checks, so returning to the field reads both. Then the
                  typed address, for a long one the field cuts off, and the
                  two ways on. */}
              {stage.kind === "error" && stage.field !== false && (
                <div key={stage.seq} className="mt-2 flex flex-col gap-2">
                  <div id={errorId} className="flex flex-col gap-1">
                    <p
                      role="alert"
                      className="flex items-start gap-1 text-body-sm text-error"
                    >
                      <span className="flex h-[1lh] shrink-0 items-center">
                        <ErrorGlyph />
                      </span>
                      <span>{stage.copy.lead}</span>
                    </p>
                    {stage.copy.checks && (
                      <>
                        <p className="text-body-sm text-on-surface">
                          What to check:
                        </p>
                        <ul className="flex list-disc flex-col gap-1 pl-5 text-body-sm text-on-surface">
                          {stage.copy.checks.map((c) => (
                            <li key={c}>{c}</li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                  {stage.entered && (
                    <p className="text-body-sm text-on-surface-muted [overflow-wrap:anywhere]">
                      You entered:{" "}
                      <span className="text-on-surface">{stage.entered}</span>
                    </p>
                  )}
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {stage.entered && (
                      <button
                        type="button"
                        onClick={editAddress}
                        className={TEXT_BUTTON}
                      >
                        Edit address
                      </button>
                    )}
                    {districts.length > 0 && (
                      <button
                        type="button"
                        onClick={choosePicker}
                        className={TEXT_BUTTON}
                      >
                        Choose your district instead
                      </button>
                    )}
                  </div>
                </div>
              )}
              {/* With suggestions on, the list is always in the DOM (hidden
                  while empty), so the field's aria-controls always points at
                  it. */}
              {suggestEnabled && (
                <ul
                  id={listId}
                  role="listbox"
                  aria-label="Address matches"
                  hidden={visible.length === 0}
                  className="absolute top-full z-20 mt-1 w-full overflow-hidden rounded-md border border-border-strong bg-surface shadow-elevation-2"
                >
                  {visible.map((s, i) => (
                    <li
                      key={s.id}
                      id={`${listId}-${i}`}
                      role="option"
                      aria-selected={i === highlighted}
                      className={`cursor-pointer px-4 py-3 text-left text-body-sm ${
                        i === highlighted
                          ? "bg-primary-muted text-primary-hover"
                          : "text-on-surface"
                      }`}
                      onMouseEnter={() => setActiveIndex(i)}
                      onMouseDown={(e) => {
                        /* mousedown, not click: blur would close the list first. */
                        e.preventDefault();
                        void resolveAddress({ placeId: s.id, sessionToken: sessionToken() });
                      }}
                    >
                      {s.text}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <Button type="submit" disabled={!hydrated || stage.kind === "loading"}>
              {stage.kind === "loading" ? "Looking up…" : submitLabel}
            </Button>
          </div>
          {/* A failure that isn't about what was typed (Google down, 429,
              the network) sits right under the button the voter just
              pressed, above the coverage note (AD1, NS1), with a retry of
              the same lookup and the picker. */}
          {stage.kind === "error" && stage.field === false && (
            <div key={stage.seq} className="flex flex-col gap-2">
              <p
                role="alert"
                className="flex items-start gap-1 text-body-sm text-error"
              >
                <span className="flex h-[1lh] shrink-0 items-center">
                  <ErrorGlyph />
                </span>
                <span>{stage.copy.lead}</span>
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    if (lastPick.current) void resolveAddress(lastPick.current);
                  }}
                >
                  Try again
                </Button>
                {districts.length > 0 && (
                  <button
                    type="button"
                    onClick={choosePicker}
                    className={TEXT_BUTTON}
                  >
                    Choose your district instead
                  </button>
                )}
              </div>
            </div>
          )}
          {/* Where a typed address goes and what is kept, beside the field
              it is about (Mobbin AD3, komoot). Worded from /privacy's
              address section: our server sends the text to Google, and
              Census gets only the point. Never "we never see your address":
              our server passes it on. */}
          {privacyNote && (
            <p className="flex items-start gap-1 text-body-sm text-on-surface-muted">
              <span className="flex h-[1lh] shrink-0 items-center">
                <LockGlyph />
              </span>
              <span>
                What you type goes from our server to Google to find the
                address, and the U.S. Census Bureau gets only its map point.{" "}
                We keep only the district, on this device.{" "}
                <Link
                  href="/privacy"
                  className="text-primary underline underline-offset-2 hover:text-primary-hover"
                >
                  How we handle it
                </Link>
              </span>
            </p>
          )}
        </form>
      )}

      {/* The no-JavaScript path: every district as a plain link to its
          races, the same URL the picker commits to (without JavaScript
          nothing is remembered). The header chip renders nothing before
          hydration, so these are the only way forward then. With no
          districts to list, the county links further down are already plain
          links, so this only says why the field is gone and hides it. */}
      {(addressEnabled || !linksOnly) && (
        <noscript>
          {linksOnly ? (
            <p className="text-body-sm text-on-surface-muted">
              Finding your district from an address needs JavaScript.
            </p>
          ) : (
            <DistrictLinks
              districts={districts}
              lead={
                addressEnabled
                  ? "Finding your district from an address needs JavaScript. Choose it here instead:"
                  : "Choose your district:"
              }
            />
          )}
          <style>{NO_SCRIPT_CSS}</style>
        </noscript>
      )}

      {/* Always visible, not only after a miss: a voter outside the four
          counties should know before typing that their House and county
          races are not here yet. Where the field sits under a paragraph
          that already says so (the home page), coverageNote is false. */}
      {coverageNote && (
        <p className="text-body-sm text-on-surface-muted">
          Full statewide coverage isn&rsquo;t available yet. Every Florida
          voter gets the statewide races and amendments; U.S. House and county
          races are only for {coveredCountyNames()} counties so far.
        </p>
      )}

      {/* Only an address outside Florida lands here: a Florida address
          outside the covered counties goes to the statewide ballot. */}
      {stage.kind === "outOfCoverage" && (
        <div className="flex flex-col gap-3" role="status">
          <p className="text-body-sm text-on-surface-muted">
            We can&rsquo;t place that address on a Florida ballot. Check the
            street, city and ZIP code you typed — this guide covers Florida
            only.
          </p>
          <Link
            href={STATEWIDE_BALLOT_HREF}
            className="w-fit text-body-sm text-primary underline underline-offset-2"
          >
            See the statewide ballot every Florida voter shares
          </Link>
          <p className="text-body-sm text-on-surface-muted">
            Or browse a covered county:
          </p>
          <CountyPicker
            onPick={(county) =>
              router.push(`/candidates?view=races&county=${county.fips}`)
            }
          />
        </div>
      )}

      {linksOnly && stage.kind !== "outOfCoverage" && (
        <DistrictLinks
          districts={districts}
          lead={
            addressEnabled
              ? "Or choose your county, or see the statewide ballot:"
              : "Choose your county, or see the statewide ballot:"
          }
        />
      )}

      {/* The district picker, a visible second route (Mobbin AD7, Apple):
          under a divider when the field is above it, with its own question,
          a help line and its own button. Home collapses it behind a toggle
          (pickerCollapsed). Without JavaScript the whole block is hidden
          (NO_SCRIPT_CSS) and the noscript links stand in. */}
      {stage.kind !== "outOfCoverage" && districts.length > 0 && (
        <div
          id="district-picker-route"
          className={`flex flex-col gap-2 ${addressEnabled ? "border-t border-border pt-4" : ""}`}
        >
          {/* A disclosure: it shows and hides the picker below, so it says
              whether it is open (WCAG 4.1.2; same pattern as DistrictChip,
              a11y-perf-2026-10-04.md fix 12). Only where the page collapses
              the picker; with the switch off there is no field to disclose
              it from, so no toggle. A link's colour at 24px tall (AD2,
              Zalando); the caret flips with no transition, like the home
              page's carets. */}
          {collapsible && (
            <button
              id="district-picker-toggle"
              type="button"
              aria-expanded={showPicker}
              aria-controls="district-picker-form"
              onClick={() => setShowPicker((v) => !v)}
              className="inline-flex min-h-[24px] w-fit items-center gap-1 text-body-sm text-primary underline underline-offset-2 hover:text-primary-hover"
            >
              Or choose your district
              <span className={`inline-flex ${showPicker ? "rotate-180" : ""}`}>
                <CaretGlyph />
              </span>
            </button>
          )}
          {showPicker && (
            /* Saved on submit, never on change (WCAG 3.2.2 On Input;
               interface review 2026-10-05). A collapsed <select> fires
               change on every arrow key on Windows and on type-ahead
               everywhere, and every option starts "FL-", so committing on
               change saved the first district and navigated away on the
               first keystroke: a keyboard or screen-reader user could not
               browse the list. `required` on the disabled placeholder keeps
               an empty submit from doing anything, and nothing is
               preselected. The select takes the same recipe as every other
               select on the site (16px, so iOS Safari doesn't zoom;
               border-input, fix 10). Its submit waits for hydration like
               the field's: this form is in the server render, and a native
               submit would land on a URL nothing reads. */
            <form
              id="district-picker-form"
              className="flex flex-col gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const value = new FormData(e.currentTarget).get("district");
                const chosen = districts.find(
                  (d) => `${d.district}|${d.countyFips}` === value
                );
                if (chosen) {
                  commit(
                    {
                      district: chosen.district,
                      countyFips: chosen.countyFips,
                    },
                    "picker"
                  );
                }
              }}
            >
              <label htmlFor="district-picker" className="text-label text-on-surface">
                Know your congressional district?
              </label>
              {/* From the split-ZIP prompt, which went with the ZIP option:
                  the voter who doesn't know their district is the one
                  choosing from this list. It describes the select, at the
                  14px floor (it was a 13px caption). */}
              <p
                id={pickerHelpId}
                className="-mt-1 text-body-sm text-on-surface-muted"
              >
                Not sure? Your voter registration card or{" "}
                <a
                  className="text-primary underline underline-offset-2 hover:text-primary-hover"
                  href={supervisor.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {supervisor.label}
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>{" "}
                lists it.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  ref={pickerRef}
                  id="district-picker"
                  name="district"
                  defaultValue=""
                  required
                  aria-describedby={pickerHelpId}
                  className="w-fit rounded-md border border-border-input bg-surface px-3 py-3 text-body text-on-surface focus:border-primary"
                >
                  <option value="" disabled>
                    Choose your district…
                  </option>
                  {districts.map((d) => (
                    <option
                      key={`${d.district}|${d.countyFips}`}
                      value={`${d.district}|${d.countyFips}`}
                    >
                      {d.district} · {d.countyName}
                    </option>
                  ))}
                </select>
                <Button type="submit" variant="secondary" disabled={!hydrated}>
                  See my races
                </Button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

/* The way to a district as plain links, which need no JavaScript: each
   covered district, or, with no districts to list (the read failed), each
   covered county and the statewide ballot. */
function DistrictLinks({
  districts,
  lead,
}: {
  districts: CoveredDistrict[];
  lead: string;
}) {
  const links =
    districts.length > 0
      ? districts.map((d) => ({
          key: `${d.district}|${d.countyFips}`,
          href: `/candidates?view=races&district=${d.district}&county=${d.countyFips}`,
          label: `${d.district} · ${d.countyName}`,
        }))
      : [
          ...COVERED_COUNTIES.map((c) => ({
            key: c.fips,
            href: `/candidates?view=races&county=${c.fips}`,
            label: `${c.name} County`,
          })),
          {
            key: "statewide",
            href: STATEWIDE_BALLOT_HREF,
            label: "The statewide ballot",
          },
        ];
  return (
    <div className="flex flex-col gap-2">
      <p className="text-body-sm text-on-surface-muted">{lead}</p>
      <ul className="flex flex-wrap gap-2">
        {links.map((l) => (
          <li key={l.key}>
            <Link
              href={l.href}
              className="block rounded-md border border-border-strong bg-surface px-4 py-3 text-label text-primary transition-colors hover:border-primary hover:bg-primary-muted hover:text-primary-hover"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
