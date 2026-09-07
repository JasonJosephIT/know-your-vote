import { Quiz } from "@/components/features/Quiz";

export const metadata = { title: "Where do I stand? — Know Your Vote" };

export default function WhereIStandPage() {
  return (
    <main className="mx-auto flex w-full max-w-[680px] flex-1 flex-col gap-5 px-5 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-h1">Where do I stand?</h1>
        <p className="text-body-sm text-on-surface-muted">
          A short quiz on the issues — then what every candidate in Florida&apos;s
          statewide races has said about the ones you picked. No ZIP needed; add
          one at the end for your U.S. House race. We don&apos;t score the match,
          and we never say who to vote for.
        </p>
      </header>
      <Quiz />
    </main>
  );
}
