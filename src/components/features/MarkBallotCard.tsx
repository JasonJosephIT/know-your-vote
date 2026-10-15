import Link from "next/link";

/* The way in to Mark your ballot (/ballot), on the home page under the
   official sample-ballot links and at the top of the Candidates hub, which
   is where an entered address lands (founder 2026-10-14). On the hub it
   took the place of "Another view", a pointer to Ballotpedia's
   sample-ballot lookup that stood in while we had no ballot of our own to
   mark.

   "The races and amendments we cover", never "your sample ballot": the
   county's is the official one, and ours leaves out judges, Florida House
   and Senate seats and city races (NOT_COVERED_SENTENCE). `href` carries a
   location when the page has one; with none, /ballot reads the saved
   district. No line icon: those are kept for the official tasks
   (verify-task-icons). A server component with no client JavaScript. */
export function MarkBallotCard({ href = "/ballot" }: { href?: string }) {
  return (
    <aside
      aria-labelledby="mark-ballot-card"
      className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4"
    >
      <h2 id="mark-ballot-card" className="text-h3">
        Mark your ballot
      </h2>
      <p className="text-body-sm text-on-surface-muted lg:max-w-[65ch]">
        The races and amendments we cover, laid out in ballot order. Mark your
        choices and print them to take with you. They stay on this device.
      </p>
      <Link
        href={href}
        className="inline-flex min-h-[44px] w-fit items-center rounded-md border border-border-strong bg-surface px-4 text-label text-primary transition-colors hover:border-primary hover:bg-primary-muted hover:text-primary-hover"
      >
        Open your ballot
      </Link>
    </aside>
  );
}
