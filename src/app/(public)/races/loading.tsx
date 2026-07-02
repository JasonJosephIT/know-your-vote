export default function RacesLoading() {
  return (
    <main className="mx-auto flex w-full max-w-[680px] flex-1 flex-col gap-5 px-5 py-8">
      <div className="h-9 w-48 animate-pulse rounded-md bg-surface-muted" />
      <div className="h-5 w-64 animate-pulse rounded-md bg-surface-muted" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-24 animate-pulse rounded-lg bg-surface-muted" />
      ))}
    </main>
  );
}
