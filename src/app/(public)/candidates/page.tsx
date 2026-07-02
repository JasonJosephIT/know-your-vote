import Link from "next/link";
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
  }>;
}) {
  const sp = await searchParams;
  const requested = TABS.find((t) => t.view === sp.view)?.view;
  /* Arriving with a location (from the landing page's ZIP entry) means the
     voter wants their races even without an explicit view param. */
  const view: View = requested ?? (sp.zip || sp.county ? "races" : "browse");

  /* The races tab keeps any location already in the URL. */
  const tabHref = (tab: View) => {
    if (tab === "races") {
      const params = new URLSearchParams({ view: "races" });
      if (sp.zip) params.set("zip", sp.zip);
      if (sp.district) params.set("district", sp.district);
      if (!sp.zip && sp.county) params.set("county", sp.county);
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
        <YourRaces
          zip={sp.zip}
          district={sp.district}
          county={sp.zip ? undefined : sp.county}
        />
      )}
      {view === "saved" && <SavedCandidates />}
    </main>
  );
}
