import Link from "next/link";
import { InstallCard } from "@/components/features/InstallCard";
import { ZipEntry } from "@/components/features/ZipEntry";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-[680px] flex-1 flex-col justify-center gap-5 px-5 py-8">
      <h1 className="text-display">Your ballot, laid out fairly.</h1>
      <p className="text-body-lg text-on-surface-muted">
        See everyone on your ballot — what they say, what they&apos;ve done,
        and what&apos;s been verified. Equal space, equal scrutiny, every claim
        linked to a source. About a minute, no account, no agenda.
      </p>
      <ZipEntry />
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
