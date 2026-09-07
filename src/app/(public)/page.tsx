import Link from "next/link";
import { DeadlineBanner } from "@/components/features/DeadlineBanner";
import { InstallCard } from "@/components/features/InstallCard";
import { SharedBallot } from "@/components/features/SharedBallot";
import { ZipEntry } from "@/components/features/ZipEntry";

/* Ballot first, ZIP optional (TASK-067).

   The page used to be a ZIP wall: a headline and a text field, with the
   ballot behind them. In the general election that gate asked a question
   whose answer changes one race out of nine, so the ballot moved in front of
   it and the ZIP field became an upgrade.

   The headline changed with it. "Your ballot" was a promise this page cannot
   keep without a ZIP — what it shows is everything on *every* Florida ballot,
   which is most of yours but not all of it. The ZIP prompt below says what it
   adds rather than the headline overclaiming what is already there. */

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-[680px] flex-1 flex-col gap-6 px-5 py-8">
      <h1 className="text-display">Everything on every Florida ballot.</h1>
      <p className="text-body-lg text-on-surface-muted">
        See everyone you can vote for — what they say, what they&apos;ve done,
        and what&apos;s been verified. Equal space, equal scrutiny, every claim
        linked to a source. No ZIP, no account, no agenda.
      </p>
      <DeadlineBanner />

      <SharedBallot />

      <section className="flex flex-col gap-3 border-t border-border pt-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-h3">Add your U.S. House race</h2>
          {/* No storage claim here on purpose. ZIP still goes through
              writeLocation into kyv.location until TASK-070 drops it, so
              "never stored" would be false today; TASK-070/071 own that
              claim and the privacy page that has to match it. */}
          <p className="text-caption text-on-surface-muted">
            Your congressional district race is the one part of your ballot
            that isn&apos;t on this list, because it depends on where you live.
            Add your ZIP and we&apos;ll add it — or skip it and read the rest.
          </p>
        </div>
        <ZipEntry submitLabel="Add my House race" placeholder="Your ZIP code" />
      </section>

      <InstallCard />

      <p className="text-caption text-on-surface-muted">
        We describe what each candidate says, has done, and what&apos;s
        verified. You decide.{" "}
        <Link href="/methodology" className="underline underline-offset-2 hover:text-on-surface">
          How we stay fair
        </Link>{" "}
        ·{" "}
        <Link href="/privacy" className="underline underline-offset-2 hover:text-on-surface">
          Privacy
        </Link>
      </p>
    </main>
  );
}
