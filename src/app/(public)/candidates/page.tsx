import { SavedCandidates } from "@/components/features/SavedCandidates";

export const metadata = { title: "Candidates you're keeping in mind — Know Your Vote" };

export default function CandidatesPage() {
  return (
    <main className="mx-auto flex w-full max-w-[680px] flex-1 flex-col gap-5 px-5 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-h1">Keeping in mind</h1>
        <p className="text-body-sm text-on-surface-muted">
          Candidates you&apos;ve saved, with their official links in one place.
        </p>
      </header>
      <SavedCandidates />
    </main>
  );
}
