import { campaignSite } from "@/lib/campaign-website";

/* One website slot on every candidate card, on all five surfaces
   (CandidateBrief, ListedCandidateCard, the RaceCompare roster card,
   CandidateBrowser and SavedCandidates): "Campaign website: <host>" or
   "Campaign website: none listed" (spec 2026-10-08-roster-completeness
   §3.7, D7, Recommended pending founder confirmation). The label is the same
   on every card; only the value differs, as the name does. It replaces a
   link that appeared only where a site was stored, so in FL-GOV seven cards
   carried it and one did not.

   "Campaign website" is true of every stored value: the collection stored
   campaign sites only (docs/general-election/candidate-sites-2026-09-24.md).
   "None listed" describes our list, not the candidate.

   TO FLIP (D7): a link only in races where every candidate has a stored
   site. The race page would decide that once per race and pass it in, and
   this component would print nothing on every card of a race that fails it.

   Accessibility (a11y-perf-2026-10-04.md): the link keeps the candidate's
   name as a visually hidden suffix after its visible text (fix 6) and a
   24 px minimum height (fix 9; min-h-[24px] because this theme's spacing-6
   is 32 px). The label is one string that ends in its space, so the space is
   never a whitespace-only text node of its own (CandidateBrowser explains
   why those go missing from accessible text). */
export function CampaignWebsite({
  url,
  name,
}: {
  url: string | null | undefined;
  name: string;
}) {
  const site = campaignSite(url);
  return (
    <span>
      {"Campaign website: "}
      {site ? (
        <a
          href={site.href}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-[24px] items-center underline underline-offset-2 hover:text-on-surface"
        >
          {site.host}
          <span className="sr-only">: {name}</span>
        </a>
      ) : (
        "none listed"
      )}
    </span>
  );
}
