import { Card } from "@/components/ui/Card";
import { safeHttpUrl } from "@/lib/format";

/* Analytics & Web Vitals links-out card (AFR-042). v1 does NOT pull these via
   API — it links out honestly with an "enable to integrate" note. Plausible is
   the one we can speak to today: if NEXT_PUBLIC_PLAUSIBLE_DOMAIN is set the
   voter app is already reporting, so we mark it "linked" and deep-link the live
   dashboard; otherwise it reads "enable to integrate" like the Vercel rows. */

type AnalyticsLink = {
  name: string;
  status: string;
  href: string;
};

function analyticsLinks(): AnalyticsLink[] {
  const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN?.trim();
  return [
    {
      name: "Vercel Analytics",
      status: "enable to integrate",
      href: "https://vercel.com/docs/analytics",
    },
    {
      name: "Speed Insights",
      status: "enable to integrate",
      href: "https://vercel.com/docs/speed-insights",
    },
    plausibleDomain
      ? {
          name: "Plausible",
          status: "linked",
          href: `https://plausible.io/${plausibleDomain}`,
        }
      : {
          name: "Plausible",
          status: "enable to integrate",
          href: "https://plausible.io",
        },
  ];
}

export function AnalyticsLinksCard() {
  const links = analyticsLinks();

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-overline">Analytics &amp; Web Vitals</h2>
      <div className="flex flex-col">
        {links.map((link) => {
          const href = safeHttpUrl(link.href);
          return (
            <div
              key={link.name}
              className="flex items-center justify-between gap-3 border-b border-border py-3 last:border-b-0"
            >
              <div className="min-w-0">
                <p className="text-body-sm text-on-surface">{link.name}</p>
                <p className="text-caption text-on-surface-muted">
                  {link.status}
                </p>
              </div>
              {href ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Open ${link.name} (opens in a new tab)`}
                  className="inline-flex w-fit shrink-0 items-center justify-center rounded-md border border-border-strong bg-surface px-4 py-2 text-label text-primary transition-colors hover:border-primary hover:bg-primary-muted hover:text-primary-hover"
                >
                  Open ↗
                </a>
              ) : null}
            </div>
          );
        })}
      </div>
      <p className="text-caption text-on-surface-muted">
        v1.1 pulls these via API once the products are enabled.
      </p>
    </Card>
  );
}
