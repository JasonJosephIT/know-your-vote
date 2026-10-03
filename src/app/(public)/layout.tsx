import Link from "next/link";

/* Voter pages only: the operator console lives outside this group, so it
   never gets the footer. Fragment, not a wrapper, so each page's <main>
   stays a direct child of the body's flex column and keeps its flex-1. */
export default function PublicLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      {children}
      <footer className="mx-auto flex w-full max-w-[680px] flex-wrap gap-x-4 gap-y-1 border-t border-border px-5 py-4 text-caption text-on-surface-muted">
        {[
          ["/about", "About"],
          ["/methodology", "How we stay fair"],
          ["/privacy", "Privacy"],
          ["/terms", "Terms"],
        ].map(([href, label]) => (
          <Link
            key={href}
            href={href}
            className="underline underline-offset-2 hover:text-on-surface"
          >
            {label}
          </Link>
        ))}
      </footer>
    </>
  );
}
