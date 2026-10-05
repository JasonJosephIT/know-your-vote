"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ADS_TAG_ENABLED } from "@/lib/ads";

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
    /* The button that had focus is about to disappear with the banner, and
       focus would fall to <body>: screen readers announce nothing and some
       browsers restart Tab from the top (production re-run, 2026-10-05).
       Hand it to the page content, the skip link's own target, which
       already takes programmatic focus (tabIndex -1) and shows no ring. */
    document.getElementById("content")?.focus({ preventScroll: true });
  };

  const dismissDonate = () => {
    write(DONATE_KEY, "1");
    setDonateDone(true);
  };

  /* With the tag switched off there is no cookie question, so the donation
     prompt has nothing to wait for. */
  const showDonate =
    !donateDone &&
    (!ADS_TAG_ENABLED || (consent !== null && decidedOn !== pathname));

  return (
    <>
      {ADS_TAG_ENABLED && consent === "granted" && <GoogleTag />}
      {ADS_TAG_ENABLED && consent === null && (
        <ConsentBanner onDecide={decide} />
      )}
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

/* Room left between the top of the cookie banner and whatever Tab scrolls to
   above it: the 2px focus ring sits 2px outside its element. */
const OVERLAY_GAP = 8;

/* Not a modal: the site is fully usable while it is open. Sits above the
   mobile bottom nav, bottom-left on desktop.

   Because it is fixed, it used to cover whatever Tab reached near the bottom
   of the window (a11y audit 2026-10-04, fix 1; WCAG 2.4.11 Focus Not
   Obscured). While it is open it publishes its height, plus OVERLAY_GAP, as
   --kyv-overlay-bottom on <html>. globals.css adds that to the root
   scroll-padding-bottom, so focus scrolls clear of the banner, and the
   <body>'s min-h- and pb- classes in layout.tsx add it to the minimum
   height and bottom padding, so the last stops on a page (the footer's
   links) have room to scroll clear. The ResizeObserver keeps the value
   right as the text rewraps at another width or zoom level, and the
   variable is removed when the banner closes.
   Recommended (pending founder confirmation). To flip: remove this effect
   and the var() term from globals.css and layout.tsx, or move the phone
   banner into the page flow. */
function ConsentBanner({
  onDecide,
}: {
  onDecide: (choice: "granted" | "denied") => void;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const banner = ref.current;
    if (!banner) return;
    const root = document.documentElement;
    const publish = () => {
      root.style.setProperty(
        "--kyv-overlay-bottom",
        `${banner.offsetHeight + OVERLAY_GAP}px`
      );
    };
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(banner);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--kyv-overlay-bottom");
    };
  }, []);

  return (
    <section
      ref={ref}
      aria-label="Cookie choice"
      className="fixed inset-x-3 bottom-[calc(96px+env(safe-area-inset-bottom))] z-50 rounded-md border border-border bg-surface p-4 shadow-elevation-2 md:inset-x-auto md:bottom-5 md:left-5 md:max-w-[400px]"
    >
      {/* Kept to the question itself (founder, 2026-10-05). /privacy names
          the ad provider and what it receives; Details links there. */}
      <p className="text-label">Cookies</p>
      <p className="mt-1 text-body-sm text-on-surface-muted">
        We use advertising cookies to see whether our ads bring people here.
        Decline and the site works the same.{" "}
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

/* The donation prompt, on a native <dialog> opened with showModal() (a11y
   audit 2026-10-04, fix 2; WCAG 2.4.3 Focus Order, and the ARIA modal dialog
   pattern). The aria-modal <div> it replaces let the third Tab move into the
   page behind the overlay, and Escape closed it but left focus wherever it
   was. showModal() makes the rest of the page inert, so focus stays inside,
   and turns Escape into a cancel event, handled here as "Not now". Focus
   starts on Close, as before, and goes back on close to whatever had it when
   the prompt opened.

   The <dialog> box itself has no padding (the p-6 is on the inner <div>), so
   a click whose target is the <dialog> element landed on its ::backdrop, and
   closes it as a click on the old overlay did. w-[calc(100%-2rem)] keeps the
   old overlay's 16px side margins on a phone. The backdrop is the old
   overlay's black at 40%, written as a literal colour: bg-black/40 compiles
   to var(--color-black), and ::backdrop inherits no custom properties before
   Safari 17.4 and Chrome 122, which Next 16 still supports, so the dim would
   vanish there. */
function DonateDialog({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    if (!dialog.open) dialog.showModal();
    closeRef.current?.focus();
    return () => {
      /* By now React has usually removed the dialog already. Closing it
         anyway covers the development double mount, which runs this cleanup
         on a dialog that stays in the page and then opens it again. */
      if (dialog.open) dialog.close();
      if (opener?.isConnected) opener.focus();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="donate-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-[420px] rounded-md bg-surface p-0 text-on-surface shadow-elevation-2 backdrop:bg-[rgb(0_0_0/0.4)]"
    >
      <div className="relative p-6">
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
    </dialog>
  );
}

/* For /privacy: forget the cookie choice and reload, so the banner asks again
   and an accepted tag stops loading. With ADS_TAG_ENABLED off there is no
   choice to change, so it renders nothing. */
export function ResetAdsConsent() {
  if (!ADS_TAG_ENABLED) return null;
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
