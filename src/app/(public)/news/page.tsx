import { NewsFeed } from "@/components/features/NewsFeed";

export const metadata = { title: "Electoral news — Know Your Vote" };

export default function NewsPage() {
  return (
    <main className="mx-auto flex w-full max-w-[680px] flex-1 flex-col gap-5 px-5 py-8">
      <header className="flex flex-col gap-1">
        {/* "Local" came off with the ZIP gate (TASK-069): with no location
            this page is statewide, and calling that local would be the same
            overclaim the landing page dropped in TASK-067. */}
        <h1 className="text-h1">Electoral news</h1>
        <p className="text-body-sm text-on-surface-muted">
          A calm digest of what actually changed — election news, candidate
          news, pipeline updates, and official sources only, no hot takes.
          Statewide by default; add your ZIP to see your metro and races too.
        </p>
      </header>
      <NewsFeed />
    </main>
  );
}
