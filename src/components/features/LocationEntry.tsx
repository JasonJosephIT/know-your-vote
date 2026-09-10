"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  CountyPicker,
  DistrictConfirm,
} from "@/components/features/CountyPicker";
import { track } from "@/lib/analytics";
import { writeDistrictCookie } from "@/lib/district-cookie";
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

type Stage =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "split"; zip: string; districts: string[] }
  | { kind: "outOfCoverage" };

const MIN_ADDRESS_CHARS = 5;
const DEBOUNCE_MS = 250;

export function LocationEntry({
  submitLabel = "See my ballot",
  placeholder = "Your address or ZIP code",
  addressEnabled = false,
  districts = [],
}: {
  submitLabel?: string;
  placeholder?: string;
  addressEnabled?: boolean;
  districts?: CoveredDistrict[];
} = {}) {
  const router = useRouter();
  const listId = useId();
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
        setStage({
          kind: "error",
          message:
            "We couldn't match that address to a district. Try your ZIP, or pick your district below.",
        });
        return;
      }
      const data: ResolveResult = await res.json();
      if (!data.inCoverage) {
        setStage({ kind: "outOfCoverage" });
        return;
      }
      if (!data.district || !data.countyFips) {
        setStage({
          kind: "error",
          message: "We couldn't pin that address — pick your district below.",
        });
        return;
      }
      commit(
        { district: data.district, countyFips: data.countyFips },
        "address"
      );
    } catch {
      setStage({
        kind: "error",
        message: "Something went wrong — give it another try.",
      });
    }
  }

  async function resolveZipCode(zip: string, district?: string) {
    setStage({ kind: "loading" });
    try {
      const params = new URLSearchParams({ zip });
      if (district) params.set("district", district);
      const res = await fetch(`/api/resolve?${params}`);
      if (!res.ok) {
        setStage({
          kind: "error",
          message:
            "We couldn't match that ZIP. Double-check it, or pick your district below.",
        });
        return;
      }
      const data: ResolveResult = await res.json();
      if (!data.inCoverage) {
        setStage({ kind: "outOfCoverage" });
        return;
      }
      if (data.needsCountyConfirm && data.candidateDistricts) {
        setStage({ kind: "split", zip, districts: data.candidateDistricts });
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
      setStage({
        kind: "error",
        message: "Something went wrong — give it another try.",
      });
    }
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (looksLikeZip) {
      if (!/^\d{5}$/.test(trimmed)) {
        setStage({
          kind: "error",
          message: "ZIP codes are 5 digits — double-check yours.",
        });
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
    setStage({
      kind: "error",
      message: addressEnabled
        ? "Pick your address from the list, or enter your 5-digit ZIP."
        : "Enter your 5-digit ZIP, or pick your district below.",
    });
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
          it server side. Address completion needs JavaScript; the district
          picker below does not. */}
      <form
        onSubmit={submit}
        action="/candidates"
        method="get"
        className="flex w-full flex-col gap-3 sm:flex-row"
      >
        <input type="hidden" name="view" value="races" />
        <label htmlFor="location" className="sr-only">
          Your address or ZIP code
        </label>
        <div className="relative flex w-full flex-col sm:max-w-[320px]">
          <Input
            id="location"
            name="zip"
            role="combobox"
            aria-expanded={visible.length > 0}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={
              highlighted >= 0 ? `${listId}-${highlighted}` : undefined
            }
            autoComplete="street-address"
            placeholder={placeholder}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (stage.kind === "error") setStage({ kind: "idle" });
            }}
            onKeyDown={onKeyDown}
          />
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

      {stage.kind === "error" && (
        <p role="alert" className="text-body-sm text-error">
          {stage.message}
        </p>
      )}

      {stage.kind === "outOfCoverage" && (
        <div className="flex flex-col gap-3" role="status">
          <p className="text-body-sm text-on-surface-muted">
            We don&apos;t cover that area yet — right now we cover the Miami,
            Fort Lauderdale, Tampa, and Orlando metros. You can still browse a
            covered county:
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
          onPick={(district) => void resolveZipCode(stage.zip, district)}
        />
      )}

      {stage.kind !== "outOfCoverage" && districts.length > 0 && (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setShowPicker((v) => !v)}
            className="w-fit text-body-sm text-on-surface-muted underline underline-offset-2 hover:text-on-surface"
          >
            or choose your district
          </button>
          {showPicker && (
            <>
              <label htmlFor="district-picker" className="sr-only">
                Your congressional district
              </label>
              <select
                id="district-picker"
                defaultValue=""
                className="w-fit rounded-md border border-border-strong bg-surface px-3 py-2 text-body-sm text-on-surface"
                onChange={(e) => {
                  const chosen = districts.find(
                    (d) => `${d.district}|${d.countyFips}` === e.target.value
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
            </>
          )}
        </div>
      )}
    </div>
  );
}
