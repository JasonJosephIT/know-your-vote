"use client";

import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

/* Dismissible "Get the app" affordance (plan A3). Chromium gets the real
   install prompt via beforeinstallprompt; iOS Safari has no API, so it gets
   the two-tap Share → Add to Home Screen steps. Hidden when already running
   standalone or after dismissal. Never an interstitial — renders in page flow. */

const DISMISS_KEY = "kyv.install-dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/* Module-scope capture: Chrome fires beforeinstallprompt once, often before
   React mounts. Holding it here instead of in an effect avoids the race. */
let capturedPrompt: BeforeInstallPromptEvent | null = null;
const promptListeners = new Set<() => void>();
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    capturedPrompt = e as BeforeInstallPromptEvent;
    promptListeners.forEach((l) => l());
  });
}

function subscribePrompt(listener: () => void) {
  promptListeners.add(listener);
  return () => promptListeners.delete(listener);
}

const hydratedSubscribe = () => () => {};

export function InstallCard() {
  const hydrated = useSyncExternalStore(
    hydratedSubscribe,
    () => true,
    () => false
  );
  const installPrompt = useSyncExternalStore(
    subscribePrompt,
    () => capturedPrompt,
    () => null
  );
  const [dismissed, setDismissed] = useState(false);

  if (!hydrated || dismissed) return null;

  /* Client-only environment reads — safe after the hydration gate. */
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      (navigator as { standalone?: boolean }).standalone === true);
  let stored = false;
  try {
    stored = window.localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    /* private mode — card stays dismissible per session only */
  }
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  if (standalone || stored) return null;
  if (!installPrompt && !isIOS) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  const install = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    /* Either way the prompt is spent — Chrome won't re-fire it this visit. */
    dismiss();
  };

  return (
    <Card className="relative">
      <button
        type="button"
        aria-label="Dismiss"
        onClick={dismiss}
        className="absolute top-3 right-3 rounded-sm p-1 text-on-surface-muted hover:text-on-surface"
      >
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" className="size-4" aria-hidden>
          <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
        </svg>
      </button>
      <p className="text-label">Get the app</p>
      {installPrompt ? (
        <>
          <p className="mt-1 text-body-sm text-on-surface-muted">
            Install Know Your Vote on your home screen — same site, one tap
            away.
          </p>
          <Button variant="secondary" className="mt-3" onClick={install}>
            Install
          </Button>
        </>
      ) : (
        <p className="mt-1 text-body-sm text-on-surface-muted">
          Add Know Your Vote to your home screen: tap the Share button, then
          &ldquo;Add to Home Screen&rdquo;.
        </p>
      )}
    </Card>
  );
}
