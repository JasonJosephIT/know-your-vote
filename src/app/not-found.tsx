import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-[680px] flex-1 flex-col items-start justify-center gap-4 px-5 py-8">
      <h1 className="text-h1">We couldn&apos;t find that page</h1>
      <p className="text-body text-on-surface-muted">
        Double-check the address, or start from your ballot.
      </p>
      <Link href="/" className="text-label text-primary underline underline-offset-2">
        See my ballot
      </Link>
    </main>
  );
}
