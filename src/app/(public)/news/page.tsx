import { NewsFeed } from "@/components/features/NewsFeed";

export const metadata = { title: "Local electoral news — Know Your Vote" };

export default function NewsPage() {
  return (
    <main className="mx-auto flex w-full max-w-[680px] flex-1 flex-col gap-5 px-5 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-h1">Local electoral news</h1>
        <p className="text-body-sm text-on-surface-muted">
          A calm daily digest of what actually changed — pipeline updates and
          official sources only, no hot takes.
        </p>
      </header>
      <NewsFeed />
    </main>
  );
}
