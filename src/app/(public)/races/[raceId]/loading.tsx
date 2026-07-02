export default function RaceLoading() {
  return (
    <main className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col gap-5 px-5 py-8">
      <div className="h-9 w-72 animate-pulse rounded-md bg-surface-muted" />
      <div className="h-5 w-96 max-w-full animate-pulse rounded-md bg-surface-muted" />
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="h-[480px] animate-pulse rounded-lg bg-surface-muted" />
        ))}
      </div>
    </main>
  );
}
