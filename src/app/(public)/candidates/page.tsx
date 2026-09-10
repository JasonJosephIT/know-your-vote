import Link from "next/link";
import { cookies } from "next/headers";
import { DISTRICT_COOKIE, parseDistrictCookie } from "@/lib/district-cookie";
import { CandidateBrowser } from "@/components/features/CandidateBrowser";
import { SavedCandidates } from "@/components/features/SavedCandidates";
import { YourRaces } from "@/components/features/YourRaces";

export const metadata = { title: "Candidates — Know Your Vote" };

type View = "browse" | "races" | "saved";

const TABS: Array<{ view: View; label: string }> = [
  { view: "browse", label: "Browse candidates" },
  { view: "races", label: "Your races" },
  { view: "saved", label: "Keeping in mind" },
];

const SUBTITLES: Record<View, string> = {
  browse:
    "Every candidate in every published race across the four covered counties — equal space, equal scrutiny.",
  races: "Your ballot by ZIP or county, races laid out side by side.",
  saved: "Candidates you've saved, with their official links in one place.",
};

export default async function CandidatesPage({
  searchParams,
}: {
  searchParams: Promise<{
    view?: string;
    q?: string;
    county?: string;
    zip?: string;
    district?: string;
    change?: string;
  }>;
}) {
  const sp = await searchParams;

  /* The saved district, unless the URL already carries a location or the voter
     came here to change it. Reading cookies makes this route dynamic — which is
     why only this page and the landing page do it, and why the chip reads them
     client-side instead. A URL location always wins, and never writes the
     cookie: sharing a ballot must not move someone else's district. */
  const saved = sp.change
    ? null
    : parseDistrictCookie((await cookies()).get(DISTRICT_COOKIE)?.value);
  const hasUrlLocation = Boolean(sp.zip || sp.county || sp.district);
  const zip = sp.zip;
  const district =
    sp.district ?? (hasUrlLocation ? undefined : saved?.district);
  const county = sp.county ?? (hasUrlLocation ? undefined : saved?.countyFips);

  const requested = TABS.find((t) => t.view === sp.view)?.view;
  /* Arriving with a location (from the landing page's ZIP entry) means the
     voter wants their races even without an explicit view param. */
  const view: View = requested ?? (zip || county ? "races" : "browse");

  /* The races tab keeps any location already in the URL. */
  const tabHref = (tab: View) => {
    if (tab === "races") {
      const params = new URLSearchParams({ view: "races" });
      if (zip) params.set("zip", zip);
      if (district) params.set("district", district);
      if (!zip && county) params.set("county", county);
      return `/candidates?${params}`;
    }
    return tab === "browse" ? "/candidates" : `/candidates?view=${tab}`;
  };

  return (
    <main className="mx-auto flex w-full max-w-[680px] flex-1 flex-col gap-5 px-5 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-h1">Candidates</h1>
        <p className="text-body-sm text-on-surface-muted">{SUBTITLES[view]}</p>
      </header>

      <nav aria-label="Candidate views" className="flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const active = tab.view === view;
          return (
            <Link
              key={tab.view}
              href={tabHref(tab.view)}
              aria-current={active ? "page" : undefined}
              className={`rounded-full px-4 py-2 text-caption transition-colors ${
                active
                  ? "bg-primary-muted text-primary-hover"
                  : "bg-surface-muted text-on-surface-muted hover:text-on-surface"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {view === "browse" && (
        <CandidateBrowser q={sp.q} countyFips={sp.county} />
      )}
      {view === "races" && (
        <YourRaces zip={zip} district={district} county={county} />
      )}
      {view === "saved" && <SavedCandidates />}
    </main>
  );
}
