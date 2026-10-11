import type { RacePhotos } from "@/lib/headshots";

/* One candidate's headshot (src/lib/headshots.ts). Renders nothing unless the
   race's photos came back, which happens only when every candidate in the
   race has one, so a card never shows a face its neighbour lacks.

   Same size, crop and frame for everyone: a square, rounded, neutral border,
   no colour, no badge. alt is empty because the name is the heading right
   beside it; a screen reader would otherwise hear the name twice. The
   credit links to the page the photo came from (an official bio or the
   campaign's site), which is also how a takedown request finds us.

   Plain <img>: the file is already a 400px square WebP in our own bucket,
   so next/image's resizing adds nothing but a remote-host allowlist. */
export function CandidatePhoto({
  photos,
  candidateId,
  size = "md",
  showCredit = false,
}: {
  photos: RacePhotos | null;
  candidateId: string;
  size?: "md" | "lg";
  showCredit?: boolean;
}) {
  const photo = photos?.get(candidateId);
  if (!photo) return null;
  const px = size === "lg" ? 120 : 72;
  return (
    <figure className="flex flex-col gap-1">
      {/* eslint-disable-next-line @next/next/no-img-element -- a pre-cropped
          400px WebP from our own bucket; see the comment above. */}
      <img
        src={photo.src}
        alt=""
        width={px}
        height={px}
        loading="lazy"
        decoding="async"
        className="aspect-square rounded-md border border-border bg-surface-muted object-cover"
        style={{ width: px, height: px }}
      />
      {showCredit && (
        <figcaption className="text-caption text-on-surface-muted">
          Photo:{" "}
          <a
            href={photo.sourcePageUrl}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2 hover:text-on-surface"
          >
            {photo.credit}
          </a>
        </figcaption>
      )}
    </figure>
  );
}
