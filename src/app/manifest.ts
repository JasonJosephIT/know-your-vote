import type { MetadataRoute } from "next";

/* Colors are the design tokens from docs/design.md (background, primary). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Know Your Vote",
    short_name: "KnowYourVote",
    description:
      "See everyone on your ballot — what they say, what they've done, and what's been verified.",
    start_url: "/?shell=pwa",
    display: "standalone",
    background_color: "#F6F3EC",
    theme_color: "#2F6B4F",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
