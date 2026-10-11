"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import { artSize, artSrc } from "./Art";
import { walkSchedule } from "./hero-walk";
import s from "./HeroRotator.module.css";

/* The home hero walk (replaces the 2026-10-11 swap rotator; design from
   the hero-rotator research and judge pass the same day).

   Eight Floridians stroll left to right in one slow procession across the
   still, feathered sunburst. Each walks from a single still pose: a 4px
   step bob with a 1px dip at contact (640ms), a ±0.6deg sway about the feet
   (1280ms), and a ground ellipse that narrows as the body rises. Every
   5.12s the next one passes the centre. After one lap (40.96s of visible
   running time) every walker has crossed exactly once and the line rests
   in exactly its first-paint pose. All motion is CSS keyframes in
   HeroRotator.module.css: no timers, no per-frame React state.

   Neutrality: the eight share one size, speed, keyframe set and play state
   (phase offsets only), each is on screen for the same time per lap, none
   overlaps another, and the walker in the still (the "lead") is drawn at
   random per page view by the home page, so every one leads equally often
   across visitors.

   Gates. The only breakpoint is Tailwind's `hidden lg:block` on the root:
   below lg the root is display:none, the lazy lead never loads, the
   IntersectionObserver reports nothing, and the other seven never mount.
   Walkers 1-7 mount only once the hero has been on screen with motion
   allowed, load at low priority, and the walk starts only after all eight
   have loaded and decoded, so a walker never appears half-drawn. Under
   prefers-reduced-motion the still is all there is: one image, no button.
   Offscreen or in a hidden tab, everything freezes, so the lap counts only
   time someone could see.

   WCAG 2.2.2: the motion lasts more than five seconds, so one native
   button pauses all of it, a pause holds for the rest of the visit, and
   the walk also stops by itself after one lap. The button's label changes
   (Pause / Play animation) and it carries no aria-pressed, so a screen
   reader announces one state, not two. The art layer is aria-hidden and
   holds nothing focusable. */

const MOTION_QUERY = "(prefers-reduced-motion: no-preference)";
/* Below Tailwind's lg (64rem, also a media-query rem, so the same font-size
   basis) the lead's <source> is a 1x1 blank: the cell is display:none
   there, and a lazy <img> alone still fetched in Chrome. */
const BELOW_LG = "(width < 64rem)";
const BLANK =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

function subscribeMedia(query: string) {
  return (onChange: () => void) => {
    const mql = window.matchMedia(query);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  };
}
const subscribeMotion = subscribeMedia(MOTION_QUERY);
function subscribeVisibility(onChange: () => void) {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}

/* The viewer's pause, held in memory for the visit: it survives moving
   between pages of the site (the module stays loaded), not a fresh load.
   Not written to device storage, so nothing new needs disclosing on
   /privacy (scripts/verify-no-stored-location.ts allows only the keys
   listed there). */
let memPaused = false;
const pauseListeners = new Set<() => void>();
function subscribePause(cb: () => void) {
  pauseListeners.add(cb);
  return () => {
    pauseListeners.delete(cb);
  };
}
function readPause(): boolean {
  return memPaused;
}
function writePause(v: boolean) {
  memPaused = v;
  pauseListeners.forEach((cb) => cb());
}

/* Loaded and decoded as the walker itself, never the blank the lead's
   <source> shows below lg: after a narrow first load the lead switches to
   its WebP when the window widens, and readiness waits for that load. A
   broken image rejects, which keeps the still. */
const isFrame = (img: HTMLImageElement) =>
  img.complete && img.naturalWidth > 1 && img.currentSrc.endsWith(".webp");
function whenReady(img: HTMLImageElement, signal: AbortSignal): Promise<void> {
  const loaded = isFrame(img)
    ? Promise.resolve()
    : new Promise<void>((resolve, reject) => {
        const onLoad = () => {
          if (isFrame(img)) resolve();
        };
        img.addEventListener("load", onLoad, { signal });
        img.addEventListener("error", () => reject(new Error("load")), {
          once: true,
          signal,
        });
      });
  return loaded.then(() => img.decode());
}

export function HeroRotator({
  lead: leadProp,
  className = "",
}: {
  /** Which walker stands in the still; the home page draws it per view. */
  lead: number;
  className?: string;
}) {
  /* The first value wins, so a server re-render (router.refresh after a
     ZIP entry) can't reshuffle a walk in progress. */
  const [lead] = useState(leadProp);
  const rootRef = useRef<HTMLDivElement>(null);
  const leadRef = useRef<HTMLDivElement>(null);
  const imgs = useRef(new Map<string, HTMLImageElement>());
  const [onScreen, setOnScreen] = useState(false);
  const [ready, setReady] = useState(false);
  const [lapDone, setLapDone] = useState(false);

  // The server renders the still: no motion, tab "hidden", not paused.
  const motionOk = useSyncExternalStore(
    subscribeMotion,
    () => window.matchMedia(MOTION_QUERY).matches,
    () => false
  );
  const tabVisible = useSyncExternalStore(
    subscribeVisibility,
    () => document.visibilityState === "visible",
    () => false
  );
  const userPaused = useSyncExternalStore(
    subscribePause,
    readPause,
    () => false
  );

  // Walkers 1-7 mount once the hero has been seen with motion allowed, and
  // stay mounted once decoded.
  const cast = ready || (motionOk && onScreen);
  const run = motionOk && ready && !lapDone;
  const paused = userPaused || !onScreen || !tabVisible;
  const showButton = motionOk && ready;
  const playing = !lapDone && !userPaused;
  const walkers = walkSchedule(lead).slice(0, cast ? 8 : 1);

  /* Apply a pause now, not at the next frame. A hidden Chrome tab renders no
     frames, so the data-paused rule would never be matched while the tab is
     away and the lap would keep running unseen; reading the computed play
     state forces the style recalc that freezes it. Resuming needs no help:
     the tab is visible again, so the next frame applies it. */
  useLayoutEffect(() => {
    if (!paused || !run || !leadRef.current) return;
    void getComputedStyle(leadRef.current).animationPlayState;
  }, [paused, run]);

  // At least a quarter on screen counts as on screen; display:none (below
  // lg) never intersects.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        // Batched entries arrive oldest first; the newest is the truth.
        const entry = entries[entries.length - 1];
        const seen = entry.intersectionRatio >= 0.25;
        /* After a narrow first load the lead's <picture> should switch from
           the blank to its WebP when the window widens; browsers re-pick on
           a viewport change, and re-setting src (a relevant mutation) makes
           sure of it if one didn't. */
        const lead = leadRef.current?.querySelector("img");
        if (seen && lead && !lead.currentSrc.endsWith(".webp")) {
          lead.src = lead.getAttribute("src") ?? lead.src;
        }
        setOnScreen(seen);
      },
      { threshold: [0, 0.25] }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // All eight loaded and decoded, then ready. Any failure keeps the still.
  useEffect(() => {
    if (!cast || ready) return;
    const list = [...imgs.current.values()];
    if (list.length !== walkSchedule(lead).length) return;
    const ac = new AbortController();
    Promise.all(list.map((img) => whenReady(img, ac.signal))).then(
      () => {
        if (!ac.signal.aborted) setReady(true);
      },
      () => {}
    );
    return () => ac.abort();
  }, [cast, ready, lead]);

  function toggle() {
    if (lapDone) {
      writePause(false);
      setLapDone(false);
    } else writePause(!userPaused);
  }

  return (
    <div
      ref={rootRef}
      className={`${s.root} relative hidden h-full min-h-[300px] w-full lg:block ${className}`}
      data-run={run ? "" : undefined}
      data-paused={paused ? "" : undefined}
      onAnimationEnd={(e) => {
        // Only the travel animation runs on a walker box, and only it ends
        // (bob, shadow and sway are infinite): this is the lap's end.
        if (e.target === leadRef.current) setLapDone(true);
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 select-none overflow-hidden"
      >
        {/* The sunburst, feathered by a radial mask so it has no hard edge.
            It never moves. */}
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
        {walkers.map((w) => {
          const name = `rotator/${w.name}` as const;
          const { width, height } = artSize(name);
          return (
            <div
              key={w.name}
              ref={w.j === 0 ? leadRef : undefined}
              className={s.walker}
              data-lead={w.j === 0 ? "" : undefined}
              style={
                {
                  "--x0": `${w.x0}px`,
                  "--belt-delay": `${w.beltDelayMs}ms`,
                  "--belt-count": String(w.beltCount),
                  "--gait-delay": `${w.gaitDelayMs}ms`,
                } as CSSProperties
              }
            >
              <span className={s.shadow} />
              <picture className={s.bob}>
                {w.j === 0 && <source media={BELOW_LG} srcSet={BLANK} />}
                {/* Plain <img> in a <picture> (the lint rule allows it): a
                    pre-sized 450x600 WebP from public/, drawn at 180x240;
                    next/image's resizing adds nothing here. */}
                <img
                  ref={(el) => {
                    if (el) imgs.current.set(w.name, el);
                    else imgs.current.delete(w.name);
                  }}
                  className={s.sway}
                  src={artSrc(name)}
                  alt=""
                  width={width}
                  height={height}
                  /* The lead loads with the page at lg and is a blank
                     below it (its <source>), so phones fetch nothing; the
                     rest mount only when they're about to be needed and
                     fetch at low priority. */
                  loading="eager"
                  fetchPriority={w.j === 0 ? undefined : "low"}
                  decoding="async"
                  draggable={false}
                />
              </picture>
            </div>
          );
        })}
        {/* Edge fades in the page colour: walkers emerge through the text
            side and leave through the right, never with a hard clip. */}
        <div className="absolute inset-y-0 left-0 w-[18%] bg-linear-to-r from-background to-transparent" />
        <div className="absolute inset-y-0 right-0 w-[14%] bg-linear-to-l from-background to-transparent" />
      </div>
      {showButton && (
        <button
          type="button"
          onClick={toggle}
          className={`${s.chip} absolute top-[8px] right-[8px] inline-flex h-[32px] items-center gap-1.5 rounded-full border border-border bg-surface/90 px-3 text-caption text-on-surface-muted transition-colors hover:text-on-surface`}
        >
          <svg
            aria-hidden="true"
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="currentColor"
          >
            {playing ? (
              <>
                <rect x="1.5" y="1" width="2.5" height="8" rx="0.5" />
                <rect x="6" y="1" width="2.5" height="8" rx="0.5" />
              </>
            ) : (
              <path d="M2 1 9 5 2 9Z" />
            )}
          </svg>
          {playing ? "Pause" : "Play"}{" "}
          <span className="sr-only">animation</span>
        </button>
      )}
    </div>
  );
}
