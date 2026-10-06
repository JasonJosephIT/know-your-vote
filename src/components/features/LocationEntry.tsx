"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  CountyPicker,
  DistrictConfirm,
} from "@/components/features/CountyPicker";
import { track } from "@/lib/analytics";
import { coveredCountyNames } from "@/lib/counties";
import { STATEWIDE_BALLOT_HREF } from "@/lib/coverage";
import type { UncoveredPart } from "@/lib/uncovered-zip-parts";
import { writeDistrictCookie } from "@/lib/district-cookie";
import { locationFieldCopy } from "@/lib/scope-copy";
import type { AddressSuggestion } from "@/lib/address-lookup";
import type { CoveredDistrict } from "@/lib/resolve";
import type { ResolveResult } from "@/types/app";

/* One field, two kinds of answer.

   Digits are a ZIP and never leave for Google -- five of them go to the existing
   /api/resolve, split-district confirmation included. Anything with a letter is
   an address: it completes as you type through our own proxy, and the one you
   pick resolves to a census block and therefore to exactly one district, with
   nothing to confirm. That difference is the point. A ZIP can only ever answer
   "one of these two districts"; 29 of the covered non-split ZIPs even contain a
   sliver the ZIP answers wrongly without saying so.

   Underneath is the district picker, which needs no third party at all.

   Whatever route the voter takes, the outcome is the same: a district and a
   county in a cookie, and a URL carrying those two values -- never the address,
   never the ZIP. */

let errorSeq = 0;

type Stage =
  | { kind: "idle" }
  | { kind: "loading" }
  /* `field` (the default) marks an error about what was typed, which sits on
     the field; false marks one that isn't (the network or the server
     failed). `seq` is new for every error, so the alert remounts and is
     read again even when the same message comes back twice. */
  | { kind: "error"; message: string; field?: boolean; seq: number }
  | {
      kind: "split";
      zip: string;
      districts: string[];
      countyFips?: string;
      uncoveredPart?: UncoveredPart;
    }
  | { kind: "outOfCoverage" };

const MIN_ADDRESS_CHARS = 5;
const DEBOUNCE_MS = 250;

/* The field's words follow addressEnabled (locationFieldCopy): without a
   geocoder it takes a ZIP only, so it must not ask for an address. The
   default placeholder used to be "Your address or ZIP code" whatever the
   flag said, and the races view and the home page both rendered it so in
   production, where /privacy says the field takes a ZIP. */
export function LocationEntry({
  submitLabel = "See my races",
  placeholder,
  addressEnabled = false,
  districts = [],
}: {
  submitLabel?: string;
  placeholder?: string;
  addressEnabled?: boolean;
  districts?: CoveredDistrict[];
} = {}) {
  const field = locationFieldCopy(addressEnabled);
  const router = useRouter();
  const listId = useId();
  const errorId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [stage, setStage] = useState<Stage>({ kind: "idle" });
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [showPicker, setShowPicker] = useState(false);

  /* One session token per autocomplete session, spent on the resolve call and
     then replaced. This is what makes the paired calls bill as one session. */
  const abort = useRef<AbortController | null>(null);

  const trimmed = value.trim();
  const looksLikeZip = /^\d+$/.test(trimmed);
  const addressMode =
    addressEnabled && trimmed.length >= MIN_ADDRESS_CHARS && !looksLikeZip;

  /* Derived, not cleared in an effect. Typing a digit turns off address mode and
     the dropdown has to go with it -- doing that with setState inside the effect
     is what React 19's set-state-in-effect rule warns about, and deriving is
     simply correct anyway: there is nothing to remember. */
  const visible = addressMode ? suggestions : [];
  const fieldError = stage.kind === "error" && stage.field !== false;

  /* Errors that announce (interface review 2026-10-05). An error about what
     was typed belongs to the field: the field reports itself invalid and
     names the message as its description, and the message is a role=alert
     so it is read wherever focus is (pressing Enter in the field leaves
     focus there, and nothing else would speak it).

     Focus moves to the field only when it was lost or sits on this form's
     own submit button, which "Looking up…" disables: never away from a
     control the voter moved to while waiting. */
  useEffect(() => {
    if (!fieldError) return;
    const active = document.activeElement;
    const submitButton = inputRef.current?.form?.querySelector('[type="submit"]');
    if (!active || active === document.body || active === submitButton) {
      inputRef.current?.focus();
    }
  }, [fieldError, stage]);

  function fail(message: string, field = true) {
    setStage({ kind: "error", message, field, seq: ++errorSeq });
  }
  const highlighted = addressMode ? activeIndex : -1;

  /* Suggestions, debounced. A keystroke is a billed request, so this waits for a
     pause, needs five characters, and cancels whatever is still in flight. */
  useEffect(() => {
    if (!addressMode) return;
    const timer = setTimeout(async () => {
      abort.current?.abort();
      const controller = new AbortController();
      abort.current = controller;
      try {
        const res = await fetch("/api/address/suggest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ q: trimmed }),
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
        /* Aborted or offline. An empty dropdown is the honest state; ZIP and the
           picker are both still there. */
        setSuggestions([]);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [addressMode, trimmed]);

  /* The one place a district is committed, whatever produced it. */
  function commit(
    choice: { district: string; countyFips: string },
    via: "address" | "zip" | "picker"
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

  /* The suggestion already carries its coordinate, so this posts the point and
     nothing else -- the address itself never leaves the browser on this call. */
  async function resolveAddress(pick: { lat: number; lon: number }) {
    setStage({ kind: "loading" });
    setSuggestions([]);
    try {
      const res = await fetch("/api/address/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: pick.lat, lon: pick.lon }),
      });
      if (!res.ok) {
        /* 400, 429 and 5xx are all ours or the geocoder's, never what the
           voter typed: not a field error. */
        fail(
          "We couldn't look up that address just now. Try your ZIP, or pick your district below.",
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
        fail("We couldn't pin that address — pick your district below.");
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

  async function resolveZipCode(zip: string, district?: string) {
    setStage({ kind: "loading" });
    try {
      const params = new URLSearchParams({ zip });
      if (district) params.set("district", district);
      const res = await fetch(`/api/resolve?${params}`);
      if (!res.ok) {
        /* /api/resolve answers 400 only for a malformed ZIP, which submit()
           already rules out, and 500 when the lookup fails; an unmatched
           ZIP comes back 200 and out of coverage. So this is a server
           failure, not the field's. */
        fail(
          res.status === 400
            ? "ZIP codes are 5 digits — double-check yours."
            : "Something went wrong — give it another try.",
          res.status === 400
        );
        return;
      }
      const data: ResolveResult = await res.json();
      if (!data.inCoverage) {
        setStage({ kind: "outOfCoverage" });
        return;
      }
      if (data.needsCountyConfirm && data.candidateDistricts) {
        setStage({
          kind: "split",
          zip,
          districts: data.candidateDistricts,
          countyFips: data.countyFips,
          uncoveredPart: data.uncoveredPart,
        });
        return;
      }
      track("zip_resolved");
      if (data.district && data.countyFips) {
        commit({ district: data.district, countyFips: data.countyFips }, "zip");
        return;
      }
      /* In coverage but no district -- county only. Keep the existing answer. */
      router.push(`/candidates?view=races&county=${data.countyFips ?? ""}`);
    } catch {
      fail("Something went wrong — give it another try.", false);
    }
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (looksLikeZip) {
      if (!/^\d{5}$/.test(trimmed)) {
        fail("ZIP codes are 5 digits — double-check yours.");
        return;
      }
      void resolveZipCode(trimmed);
      return;
    }
    /* An address with the dropdown open: Enter takes the highlighted one, or the
       first if none is highlighted. */
    const picked = visible[highlighted] ?? visible[0];
    if (picked) {
      void resolveAddress(picked);
      return;
    }
    fail(
      addressEnabled
        ? "Pick your address from the list, or enter your 5-digit ZIP."
        : "Enter your 5-digit ZIP, or pick your district below."
    );
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

  return (
    <div className="flex w-full flex-col gap-4">
      {/* action/method is the no-JavaScript path, and it is ZIP-only: the browser
          does a plain GET to /candidates?view=races&zip=… and YourRaces resolves
          it server side. Address completion needs JavaScript, and so does the
          district picker below (its toggle and its submit both run here). */}
      <form
        onSubmit={submit}
        action="/candidates"
        method="get"
        className="flex w-full flex-col gap-3 sm:flex-row sm:items-start"
      >
        <input type="hidden" name="view" value="races" />
        <label htmlFor="location" className="sr-only">
          {field.label}
        </label>
        <div className="relative flex w-full flex-col sm:max-w-[320px]">
          <Input
            ref={inputRef}
            id="location"
            name="zip"
            aria-invalid={fieldError || undefined}
            aria-describedby={fieldError ? errorId : undefined}
            role="combobox"
            aria-expanded={visible.length > 0}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={
              highlighted >= 0 ? `${listId}-${highlighted}` : undefined
            }
            autoComplete={field.autoComplete}
            inputMode={addressEnabled ? undefined : "numeric"}
            placeholder={placeholder ?? field.label}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (stage.kind === "error") setStage({ kind: "idle" });
            }}
            onKeyDown={onKeyDown}
          />
          {stage.kind === "error" && stage.field !== false && (
            <p
              key={stage.seq}
              id={errorId}
              role="alert"
              className="mt-2 text-body-sm text-error"
            >
              {stage.message}
            </p>
          )}
          {visible.length > 0 && (
            <ul
              id={listId}
              role="listbox"
              aria-label="Address matches"
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
                    void resolveAddress(s);
                  }}
                >
                  {s.text}
                </li>
              ))}
            </ul>
          )}
        </div>
        <Button type="submit" disabled={stage.kind === "loading"}>
          {stage.kind === "loading" ? "Looking up…" : submitLabel}
        </Button>
      </form>

      {/* Always visible, not only after a miss: a voter outside the four
          counties should know before typing that their House and county
          races are not here yet. */}
      <p className="text-body-sm text-on-surface-muted">
        Full statewide coverage isn&rsquo;t available yet. Every Florida voter
        gets the statewide races and amendments; U.S. House and county races
        are only for {coveredCountyNames()} counties so far.
      </p>

      {stage.kind === "error" && stage.field === false && (
        <p key={stage.seq} role="alert" className="text-body-sm text-error">
          {stage.message}
        </p>
      )}

      {stage.kind === "outOfCoverage" && (
        <div className="flex flex-col gap-3" role="status">
          <p className="text-body-sm text-on-surface-muted">
            We can&rsquo;t place that location on a ballot yet. Full statewide
            coverage isn&rsquo;t available: we have U.S. House and county races
            only for {coveredCountyNames()} counties.
            {addressEnabled
              ? " If you live in Florida, enter your street address instead — your address, not your ZIP, decides what we can show."
              : ""}
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

      {stage.kind === "split" && (
        <DistrictConfirm
          districts={stage.districts}
          countyFips={stage.countyFips}
          uncoveredPart={stage.uncoveredPart}
          onPick={(district) => void resolveZipCode(stage.zip, district)}
        />
      )}

      {stage.kind !== "outOfCoverage" && districts.length > 0 && (
        <div className="flex flex-col gap-2">
          {/* A disclosure: it shows and hides the picker below, so it says
              whether it is open (WCAG 4.1.2; same pattern as DistrictChip,
              a11y-perf-2026-10-04.md fix 12). */}
          <button
            type="button"
            aria-expanded={showPicker}
            aria-controls="district-picker-form"
            onClick={() => setShowPicker((v) => !v)}
            className="w-fit text-body-sm text-on-surface-muted underline underline-offset-2 hover:text-on-surface"
          >
            or choose your district
          </button>
          {showPicker && (
            /* Saved on submit, never on change (WCAG 3.2.2 On Input;
               interface review 2026-10-05). A collapsed <select> fires
               change on every arrow key on Windows and on type-ahead
               everywhere, and every option starts "FL-", so committing on
               change saved the first district and navigated away on the
               first keystroke: a keyboard or screen-reader user could not
               browse the list. `required` on the disabled placeholder keeps
               an empty submit from doing anything. The select takes the
               same recipe as every other select on the site (16px, so iOS
               Safari doesn't zoom; border-input, fix 10). */
            <form
              id="district-picker-form"
              className="flex flex-wrap items-center gap-2"
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
              <label htmlFor="district-picker" className="sr-only">
                Your congressional district
              </label>
              <select
                id="district-picker"
                name="district"
                defaultValue=""
                required
                className="w-fit rounded-md border border-border-input bg-surface px-3 py-3 text-body text-on-surface focus:border-primary"
              >
                <option value="" disabled>
                  Pick your district…
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
              <Button type="submit" variant="secondary">
                See my races
              </Button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
