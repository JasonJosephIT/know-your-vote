"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/Button";

/* The two first-visit prompts, in order. Cookies first: the Google Ads tag
   does not load until the visitor accepts, and declining keeps the site
   cookie-free apart from kyv.district. Donate second, and never on the same
   page as the cookie choice — it waits for the next page they open, so nobody
   gets two popups back to back. Each is answered once and remembered on the
   device; both keys are named on /privacy. */

export const CONSENT_KEY = "kyv.ads-consent";
const DONATE_KEY = "kyv.donate-dismissed";
export const DONATE_URL =
  "https://www.zeffy.com/en-US/donation-form/know-your-vote";
const ADS_ID = "AW-18487967912";

type Consent = "granted" | "denied" | null;

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null; /* private mode — prompts fall back to once per page load */
  }
}

function write(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

const hydratedSubscribe = () => () => {};

export function SitePrompts() {
  const hydrated = useSyncExternalStore(
    hydratedSubscribe,
    () => true,
    () => false
  );
  const pathname = usePathname();
  /* undefined = not read yet; the stored values are read once after hydration. */
  const [consent, setConsent] = useState<Consent | undefined>(undefined);
  const [donateDone, setDonateDone] = useState(true);
  /* The page the cookie choice was made on — donate waits until they leave it. */
  const [decidedOn, setDecidedOn] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    const stored = read(CONSENT_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of device storage after hydration
    setConsent(stored === "granted" || stored === "denied" ? stored : null);
    setDonateDone(read(DONATE_KEY) === "1");
  }, [hydrated]);

  if (!hydrated || consent === undefined) return null;
  /* The operator console is its own surface; no voter prompts there. */
  if (pathname.startsWith("/admin")) return null;

  const decide = (choice: "granted" | "denied") => {
    write(CONSENT_KEY, choice);
    setConsent(choice);
    setDecidedOn(pathname);
  };

  const dismissDonate = () => {
    write(DONATE_KEY, "1");
    setDonateDone(true);
  };

  const showDonate =
    consent !== null && !donateDone && decidedOn !== pathname;

  return (
    <>
      {consent === "granted" && <GoogleTag />}
      {consent === null && <ConsentBanner onDecide={decide} />}
      {showDonate && <DonateDialog onClose={dismissDonate} />}
    </>
  );
}

/* Google tag (gtag.js). It reports the page URL, and the no-JS ZIP path lands
   on /candidates?zip=…, so the ZIP is dropped from page_location and
   page_referrer before Google sees them — /privacy promises a ZIP is never
   kept. */
function GoogleTag() {
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${ADS_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-tag" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
function kyvNoZip(u){try{var x=new URL(u);x.searchParams.delete('zip');return x.href;}catch(e){return '';}}
gtag('config', '${ADS_ID}', {
  page_location: kyvNoZip(window.location.href),
  page_referrer: kyvNoZip(document.referrer)
});`}
      </Script>
    </>
  );
}

/* Not a modal: the site is fully usable while it is open. Sits above the
   mobile bottom nav, bottom-left on desktop. */
function ConsentBanner({
  onDecide,
}: {
  onDecide: (choice: "granted" | "denied") => void;
}) {
  return (
    <section
      aria-label="Cookie choice"
      className="fixed inset-x-3 bottom-[calc(96px+env(safe-area-inset-bottom))] z-50 rounded-md border border-border bg-surface p-4 shadow-elevation-2 md:inset-x-auto md:bottom-5 md:left-5 md:max-w-[400px]"
    >
      <p className="text-label">Cookies for our Google ads</p>
      <p className="mt-1 text-body-sm text-on-surface-muted">
        We advertise on Google. If you accept, Google&apos;s ad tag sets
        cookies so we can tell whether an ad brought you here. Decline and it
        never loads — the site works exactly the same.{" "}
        <Link
          href="/privacy"
          className="text-primary underline underline-offset-2"
        >
          Details
        </Link>
      </p>
      <div className="mt-3 flex gap-2">
        <Button className="px-4 py-2" onClick={() => onDecide("granted")}>
          Accept
        </Button>
        <Button
          variant="secondary"
          className="px-4 py-2"
          onClick={() => onDecide("denied")}
        >
          Decline
        </Button>
      </div>
    </section>
  );
}

function DonateDialog({ onClose }: { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="donate-title"
        className="relative w-full max-w-[420px] rounded-md bg-surface p-6 shadow-elevation-2"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          ref={closeRef}
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute top-3 right-3 rounded-sm p-1 text-on-surface-muted hover:text-on-surface"
        >
          <svg
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            className="size-4"
            aria-hidden
          >
            <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
          </svg>
        </button>
        <h2 id="donate-title" className="text-h3">
          Keep Know Your Vote free
        </h2>
        <p className="mt-2 text-body text-on-surface-muted">
          No account, no paywall, every claim linked to a source. If this
          helps you vote, a donation keeps it running.
        </p>
        <div className="mt-4 flex gap-2">
          <a
            href={DONATE_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-md bg-primary px-[20px] py-3 text-label text-on-primary hover:bg-primary-hover"
          >
            Donate
          </a>
          <Button variant="secondary" onClick={onClose}>
            Not now
          </Button>
        </div>
      </div>
    </div>
  );
}

/* For /privacy: forget the cookie choice and reload, so the banner asks again
   and an accepted tag stops loading. */
export function ResetAdsConsent() {
  return (
    <button
      type="button"
      onClick={() => {
        try {
          window.localStorage.removeItem(CONSENT_KEY);
        } catch {
          /* ignore */
        }
        window.location.reload();
      }}
      className="text-primary underline underline-offset-2"
    >
      Change your cookie choice
    </button>
  );
}
