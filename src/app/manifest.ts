import type { MetadataRoute } from "next";

// Know Your Vote — PWA web app manifest (served by Next.js at /manifest.webmanifest).
// Colors are design.md tokens (resolved hex): theme = KYV Green #2F6B4F (primary),
// background = warm sand #F6F3EC (background). Icons are the Mobile-surface PWA icons
// (Reversed colorway: cream KYV monogram on solid green). Maskable variants keep the
// monogram inside the 80% safe circle for adaptive masks.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Know Your Vote, Know Your Ballot, Know Your Options",
    short_name: "Know Your Vote",
    description:
      "See everyone on your ballot, what they say, what they've done, and all facts no cap. Every claim linked to a source.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "en-US",
    dir: "ltr",
    categories: ["government", "education", "news"],
    background_color: "#F6F3EC",
    theme_color: "#2F6B4F",
    icons: [
      {
        src: "/brand/mobile/pwa-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/mobile/pwa-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/mobile/pwa-icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/brand/mobile/pwa-icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    screenshots: [
      {
        src: "/brand/mobile/screenshot-1-ballot.png",
        sizes: "1290x2796",
        type: "image/png",
        form_factor: "narrow",
        label: "Enter your ZIP to see your ballot",
      },
      {
        src: "/brand/mobile/screenshot-2-race.png",
        sizes: "1290x2796",
        type: "image/png",
        form_factor: "narrow",
        label: "Every race, side by side and equal",
      },
    ],
  };
}
