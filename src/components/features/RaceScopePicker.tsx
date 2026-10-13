import { Button } from "@/components/ui/Button";
import { COVERED_COUNTIES } from "@/lib/counties";
import {
  RACE_SCOPE_PARAM,
  raceScopeValue,
  type DistrictOption,
  type RaceScope,
} from "@/lib/race-scope";

/* "Show races for": one control on the home page and in Candidates → Your
   races, so a voter can narrow either page to the statewide races, one
   county's races or one U.S. House district's race, and get the whole page
   back with "All races" (founder, 2026-10-13).

   A plain GET form and a native select, server-rendered with no client
   JavaScript: it works with scripts off, the choice lands in the URL as
   ?show= (parseRaceScope reads it), and the result can be reloaded or
   shared. Nothing is saved anywhere, and nothing about where the voter
   lives goes in the URL: the hidden inputs are what the page passes in, and
   /candidates passes only the district and county already in its URL,
   never a ZIP or an address.

   Applied on submit, never on change (WCAG 3.2.2 On Input), for the reason
   the district picker in LocationEntry gives: a collapsed select fires
   change on every arrow key on Windows and on type-ahead everywhere, so
   navigating on change would move a keyboard or screen-reader user off the
   page before they had read the list. Same select recipe as that picker
   and every other select on the site: 16px (text-body), so iOS Safari
   doesn't zoom, and border-border-input.

   The options are the covered counties (COVERED_COUNTIES) and each covered
   district once, by number, named the way the district picker names them
   ("FL-27 · Miami-Dade"). With no districts (the read failed) the district
   group is left out rather than shown empty. The select is full width on a
   phone and its own width from sm up, so a long option never pushes the
   page sideways at 320px. */

export function RaceScopePicker({
  action,
  scope,
  districts,
  hidden = {},
}: {
  action: string;
  scope: RaceScope;
  districts: readonly DistrictOption[];
  /* Carried through the submit unchanged, e.g. view=races. */
  hidden?: Record<string, string>;
}) {
  return (
    <form
      action={action}
      method="get"
      className="flex flex-col gap-2 rounded-lg border border-border bg-surface px-4 py-4"
    >
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <label htmlFor="race-scope" className="text-label text-on-surface">
        Show races for
      </label>
      <div className="flex flex-wrap items-center gap-2">
        {/* Keyed by the choice: "See all races" is a client-side link,
            and React keeps an uncontrolled select's value across a render,
            so without a new key it would still read the old choice. */}
        <select
          key={raceScopeValue(scope)}
          id="race-scope"
          name={RACE_SCOPE_PARAM}
          defaultValue={raceScopeValue(scope)}
          className="w-full min-w-0 rounded-md border border-border-input bg-surface px-3 py-3 text-body text-on-surface focus:border-primary sm:w-auto"
        >
          <option value="all">All races</option>
          <option value="statewide">Statewide races</option>
          <optgroup label="County races">
            {COVERED_COUNTIES.map((c) => (
              <option key={c.fips} value={`county-${c.fips}`}>
                {c.name} County
              </option>
            ))}
          </optgroup>
          {districts.length > 0 && (
            <optgroup label="U.S. House district">
              {districts.map((d) => (
                <option key={d.district} value={`district-${d.district}`}>
                  {d.counties ? `${d.district} · ${d.counties}` : d.district}
                </option>
              ))}
            </optgroup>
          )}
        </select>
        <Button type="submit" variant="secondary">
          Show
        </Button>
      </div>
    </form>
  );
}
