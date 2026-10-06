"use client";

import Link from "next/link";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useRouter } from "next/navigation";
import { coveredCounty } from "@/lib/counties";
import { RETIRED_DISTRICT_PAIRS } from "@/lib/uncovered-zip-parts";
import { CaretGlyph } from "@/components/ui/Glyphs";
import {
  clearDistrictCookie,
  districtCookieServerSnapshot,
  districtCookieSnapshot,
  parseDistrictCookie,
  subscribeDistrictCookie,
} from "@/lib/district-cookie";

/* The saved district, always visible.

   Storage the voter can see beats storage buried in a settings page, and that is
   most of what makes the cookie defensible at all (spec §8). So this is not an
   ornament: it is the disclosure, and Forget is the delete button.

   Read after mount rather than during render. Reading cookies server-side in the
   nav would opt every route into dynamic rendering, and the nav is in the root
   layout -- the ISR detail pages would lose their caching for a chip. The cost
   is one frame with nothing there, which is why the empty state renders nothing
   at all rather than flipping from "Choose your district" to a district. */

export function DistrictChip({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  /* Set by "Forget my district", whose button unmounts with the panel and
     takes focus with it (interface review 2026-10-05). The chip then turns
     into the "Choose your district" link, and focus goes there so it isn't
     left on <body>; the link says the district is gone while it holds that
     focus. Local to this instance: the nav renders the chip twice (top bar
     and desktop nav), and only the one that was used should take focus. */
  const [forgot, setForgot] = useState(false);
  const setLinkRef = useRef<HTMLAnchorElement>(null);
  const raw = useSyncExternalStore(
    subscribeDistrictCookie,
    districtCookieSnapshot,
    districtCookieServerSnapshot
  );
  const choice = useMemo(() => parseDistrictCookie(raw), [raw]);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  /* A disclosure, not a menu (a11y audit 2026-10-04, fix 12). It used to say
     role="menu" and role="menuitem", which promise arrow-key navigation that
     was never there; a screen reader would announce a menu and then not
     behave like one. Now it is a button with aria-expanded that shows a link
     and a button, both reached with Tab, and Escape closes it.

     The listener is on the document rather than the chip because Safari does
     not focus a button on click, so after a mouse open the key would not
     reach the chip. Focus goes back to the button only when it was in the
     chip, or nowhere: Escape pressed elsewhere on the page closes the panel
     without moving focus out from under the visitor. */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const active = document.activeElement;
      const focusWasHere =
        !active ||
        active === document.body ||
        Boolean(wrapperRef.current?.contains(active));
      setOpen(false);
      if (focusWasHere) buttonRef.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (forgot) setLinkRef.current?.focus({ preventScroll: true });
  }, [forgot]);

  /* null is "not hydrated yet", distinct from "" which is "no district set". */
  if (raw === null) return <span className={className} aria-hidden />;

  /* The cookie's parser checks shape, not coverage, so the coverage check lands
     here -- and an uncovered county reads as no district at all rather than as a
     chip that cannot produce a ballot. The ballot pages reach the same answer by
     a different route: resolveDistrict returns null for that county. */
  const county = choice ? coveredCounty(choice.countyFips) : undefined;
  /* A pair no covered ballot carries (FL-7 in Orange, retired by 0045) is no
     district either: the home page and /candidates already treat it so. */
  const retired =
    choice !== null &&
    RETIRED_DISTRICT_PAIRS.has(`${choice.district}|${choice.countyFips}`);

  if (!choice || !county || retired) {
    return (
      <Link
        ref={setLinkRef}
        href="/candidates?view=races&change=1"
        onBlur={() => setForgot(false)}
        className={`flex items-center rounded-full border border-border-strong px-3 py-1 text-caption text-on-surface-muted transition-colors hover:border-primary hover:text-primary ${className}`}
      >
        Choose your district
        {/* After the visible words, so the name still starts with them
            (WCAG 2.5.3 Label in Name). */}
        {forgot && <span className="sr-only">: your district was forgotten</span>}
      </Link>
    );
  }

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={`Your district: ${choice.district}, ${county.name} County. Change or forget it.`}
        className="flex items-center gap-1 rounded-full border border-border-strong bg-surface px-3 py-1 text-caption text-on-surface transition-colors hover:border-primary hover:text-primary"
      >
        <span className="font-medium">{choice.district}</span>
        <span className="text-on-surface-muted">· {county.name}</span>
        <CaretGlyph />
      </button>

      {open && (
        <div
          id={panelId}
          className="absolute right-0 z-50 mt-1 w-44 overflow-hidden rounded-md border border-border-strong bg-surface shadow-elevation-2"
        >
          <Link
            href="/candidates?view=races&change=1"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-left text-body-sm text-on-surface hover:bg-primary-muted hover:text-primary-hover"
          >
            Change district
          </Link>
          <button
            type="button"
            onClick={() => {
              /* clearDistrictCookie notifies the store, so the chip updates
                 itself -- there is no local copy to keep in step. */
              clearDistrictCookie();
              setOpen(false);
              setForgot(true);
              /* The ballot pages read this server-side, so the page has to be
                 re-fetched for the change to show. */
              router.refresh();
            }}
            className="block w-full px-4 py-2 text-left text-body-sm text-on-surface hover:bg-primary-muted hover:text-primary-hover"
          >
            Forget my district
          </button>
        </div>
      )}
    </div>
  );
}
