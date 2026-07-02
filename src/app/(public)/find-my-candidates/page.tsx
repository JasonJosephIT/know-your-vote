import { Quiz } from "@/components/features/Quiz";

export const metadata = { title: "Find my candidates — Know Your Vote" };

export default function FindMyCandidatesPage() {
  return (
    <main className="mx-auto flex w-full max-w-[680px] flex-1 flex-col gap-5 px-5 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-h1">Find my candidates</h1>
        <p className="text-body-sm text-on-surface-muted">
          Discover candidates worth a closer look — never who to vote for.
        </p>
      </header>
      <Quiz />
    </main>
  );
}
