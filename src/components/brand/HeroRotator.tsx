"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { artSize, artSrc, type ArtName } from "./Art";

/* The home hero's walkers: eight Floridians who take turns crossing a
   feathered sunburst. Only the walker changes; the sunburst stays put.

   One cycle per walker:
     hold  ~2.4s  the sharp frame
     out   140ms  the leaving walker's -blur-out frame, drifting 24px right
                  and fading
     in    140ms  the next walker's -blur-in frame, settling from -18px
   then the next walker's sharp frame holds.

   Decorative like every other piece (aria-hidden, nothing focusable). It
   stands still for prefers-reduced-motion (first walker, no timers) and
   pauses while the tab is hidden or the hero is scrolled away. The first
   walker loads eagerly; the other 23 frames are fetched and decoded after
   first paint, and the cycle starts only once they are ready, so a frame
   swap never shows a blank. Hidden below lg, where the first walker isn't
   downloaded at all (an empty <source> wins the <picture>).

   It moves for longer than five seconds, so it carries a Pause button
   (WCAG 2.2.2 Pause, Stop, Hide). The button is the one real control here:
   it sits outside the aria-hidden art, in the rotator's own corner, never
   over the lede text. Whenever motion stops (paused, reduced motion turned
   on, tab hidden, scrolled away) the sharp frame shows, never a half-faded
   blur frame. */

const WALKERS = [
  "person-phone-reader",
  "walker-nurse",
  "walker-lineworker",
  "walker-fisherman",
  "walker-teacher",
  "walker-student",
  "walker-chef",
  "walker-prosthetic",
] as const;

const HOLD_MS = 2400;
const BLUR_MS = 140;
const LG_QUERY = "(min-width: 1024px)";
const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";
const EMPTY_GIF =
  "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";

type Phase = "hold" | "out" | "in";

function frame(i: number, phase: Phase): ArtName {
  const walker = WALKERS[i];
  if (phase === "out") return `rotator/${walker}-blur-out`;
  if (phase === "in") return `rotator/${walker}-blur-in`;
  return `rotator/${walker}`;
}

function subscribeMedia(query: string) {
  return (onChange: () => void) => {
    const mql = window.matchMedia(query);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  };
}
const subscribeReduced = subscribeMedia(REDUCED_QUERY);
function subscribeVisibility(onChange: () => void) {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}

export function HeroRotator({ className = "" }: { className?: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [i, setI] = useState(0);
  const [phase, setPhase] = useState<Phase>("hold");
  const [ready, setReady] = useState(false);
  const [onScreen, setOnScreen] = useState(false);
  const [paused, setPaused] = useState(false);

  // The server renders the still version: reduced motion, tab "hidden".
  const reduced = useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(REDUCED_QUERY).matches,
    () => true,
  );
  const tabVisible = useSyncExternalStore(
    subscribeVisibility,
    () => document.visibilityState === "visible",
    () => false,
  );
  const running = ready && onScreen && tabVisible && !reduced && !paused;
  // Stopped mid-swap shows the sharp frame of whoever is on stage.
  const shown: Phase = running ? phase : "hold";

  // Off-screen (or display:none below lg) counts as paused.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) =>
      setOnScreen(entry.isIntersecting),
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // After first paint, fetch and decode every other frame, wide screens
  // only and never under reduced motion.
  useEffect(() => {
    if (reduced || !window.matchMedia(LG_QUERY).matches) return;
    let cancelled = false;
    const start = window.setTimeout(() => {
      const frames = WALKERS.flatMap((_, n) =>
        (["hold", "out", "in"] as const).map((p) => frame(n, p)),
      ).filter((f) => f !== frame(0, "hold"));
      Promise.allSettled(
        frames.map((f) => {
          const img = new Image();
          img.src = artSrc(f);
          return img.decode();
        }),
      ).then(() => {
        if (!cancelled) setReady(true);
      });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(start);
    };
  }, [reduced]);

  // hold -> out -> in (next walker) -> hold.
  useEffect(() => {
    if (!running) return;
    const t = window.setTimeout(
      () => {
        if (phase === "hold") setPhase("out");
        else if (phase === "out") {
          setI((n) => (n + 1) % WALKERS.length);
          setPhase("in");
        } else setPhase("hold");
      },
      phase === "hold" ? HOLD_MS : BLUR_MS,
    );
    return () => window.clearTimeout(t);
  }, [running, phase, i]);

  // The blur frames' drift and fade. The image is keyed by frame, so each
  // phase gets a fresh element and this runs once per frame.
  useEffect(() => {
    const el = imgRef.current;
    if (!el || shown === "hold" || typeof el.animate !== "function") return;
    const keyframes =
      shown === "out"
        ? [
            { transform: "translateX(0)", opacity: 1 },
            { transform: "translateX(24px)", opacity: 0 },
          ]
        : [
            { transform: "translateX(-18px)", opacity: 0.6 },
            { transform: "translateX(0)", opacity: 1 },
          ];
    const anim = el.animate(keyframes, {
      duration: BLUR_MS,
      easing: "ease-out",
      fill: "forwards",
    });
    return () => anim.cancel();
  }, [i, shown]);

  const name = frame(i, shown);
  const { width, height } = artSize(name);
  const first = i === 0 && shown === "hold";

  return (
    <div
      ref={rootRef}
      className={`relative hidden h-full min-h-[300px] w-full lg:block ${className}`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 select-none overflow-hidden"
      >
      {/* The sunburst, feathered by a radial mask so it has no hard edge. */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "url(/brand/site/textures/bg-sunburst.svg)",
          backgroundSize: "cover",
          backgroundPosition: "center bottom",
          maskImage:
            "radial-gradient(ellipse 60% 70% at 50% 75%, black 40%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 60% 70% at 50% 75%, black 40%, transparent 100%)",
        }}
      />
      <picture key={name}>
        {first && <source media="(max-width: 1023.98px)" srcSet={EMPTY_GIF} />}
        {/* Plain <img> in a <picture> (the lint rule allows that): pre-sized
            450x600 WebP frames from public/, swapped every few hundred ms;
            next/image would only add wrappers and srcset churn. */}
        <img
          ref={imgRef}
          src={artSrc(name)}
          alt=""
          width={width}
          height={height}
          /* Frames after the first are mounted only once preloaded and
             decoded, so eager costs no extra fetch and avoids a lazy-load
             gap mid-transition. */
          loading="eager"
          decoding={first ? "async" : "sync"}
          fetchPriority={first ? "high" : undefined}
          draggable={false}
          className="absolute inset-x-0 bottom-0 mx-auto block h-full w-auto max-w-none"
        />
      </picture>
      </div>
      {!reduced && (
        <button
          type="button"
          onClick={() => setPaused((v) => !v)}
          aria-pressed={paused}
          className="absolute right-2 bottom-2 rounded-full border border-border bg-surface/90 px-3 py-1 text-caption text-on-surface-muted hover:text-on-surface"
        >
          {paused ? "Play animation" : "Pause animation"}
        </button>
      )}
    </div>
  );
}
