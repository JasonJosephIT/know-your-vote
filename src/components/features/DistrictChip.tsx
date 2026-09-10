"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { coveredCounty } from "@/lib/counties";
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
   at all rather than flipping from "Set your district" to a district. */

export function DistrictChip({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const raw = useSyncExternalStore(
    subscribeDistrictCookie,
    districtCookieSnapshot,
    districtCookieServerSnapshot
  );
  const choice = useMemo(() => parseDistrictCookie(raw), [raw]);

  /* null is "not hydrated yet", distinct from "" which is "no district set". */
  if (raw === null) return <span className={className} aria-hidden />;

  /* The cookie's parser checks shape, not coverage, so the coverage check lands
     here -- and an uncovered county reads as no district at all rather than as a
     chip that cannot produce a ballot. The ballot pages reach the same answer by
     a different route: resolveDistrict returns null for that county. */
  const county = choice ? coveredCounty(choice.countyFips) : undefined;

  if (!choice || !county) {
    return (
      <Link
        href="/candidates?view=races&change=1"
        className={`flex items-center rounded-full border border-border-strong px-3 py-1 text-caption text-on-surface-muted hover:border-primary hover:text-primary ${className}`}
      >
        Set your district
      </Link>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`Your district: ${choice.district}, ${county.name} County. Change or forget it.`}
        className="flex items-center gap-1 rounded-full border border-border-strong bg-surface px-3 py-1 text-caption text-on-surface hover:border-primary hover:text-primary"
      >
        <span className="font-medium">{choice.district}</span>
        <span className="text-on-surface-muted">· {county.name}</span>
        <span aria-hidden>▾</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-1 w-44 overflow-hidden rounded-md border border-border-strong bg-surface shadow-elevation-2"
        >
          <Link
            role="menuitem"
            href="/candidates?view=races&change=1"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-left text-body-sm text-on-surface hover:bg-primary-muted hover:text-primary-hover"
          >
            Change district
          </Link>
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              /* clearDistrictCookie notifies the store, so the chip updates
                 itself -- there is no local copy to keep in step. */
              clearDistrictCookie();
              setOpen(false);
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
