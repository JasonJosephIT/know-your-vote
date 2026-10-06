export default function RaceLoading() {
  return (
    /* min-h-svh: the streamed brief replaces this skeleton in the same
       response, and every published brief is taller than a window. Without it the
       footer painted at about y=848 on desktop and was pushed off screen by
       the swap, a 0.08 layout shift (production re-run, 2026-10-05). */
    <main className="mx-auto flex min-h-svh w-full max-w-[1120px] flex-1 flex-col gap-5 px-5 py-8">
      {/* Each bar is one line of the text it stands in for (h-[1lh] at that
          text's size). h-9 and h-5 are this theme's spacing tokens, 96px and
          24px, which drew the title bar 2.6x the H1 it replaces (interface
          review 2026-10-05). */}
      <div className="h-[1lh] w-72 animate-pulse rounded-md bg-surface-muted text-h1" />
      <div className="h-[1lh] w-96 max-w-full animate-pulse rounded-md bg-surface-muted text-body-sm" />
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="h-[480px] animate-pulse rounded-lg bg-surface-muted" />
        ))}
      </div>
    </main>
  );
}
