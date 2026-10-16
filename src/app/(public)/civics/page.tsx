import { CivicsQuiz } from "@/components/features/CivicsQuiz";
import { LocationEntry } from "@/components/features/LocationEntry";
import { StayInformed } from "@/components/features/StayInformed";
import { CIVICS_QUESTIONS, isStale } from "@/lib/civics-quiz";
import { coveredCountyNames } from "@/lib/counties";
import { addressEntryEnabled, geocoderConfigured } from "@/lib/geocode";
import { easternToday } from "@/lib/notifications/schedule";
import { getCoveredDistricts } from "@/lib/resolve";
import { NOT_COVERED_SENTENCE } from "@/lib/scope-copy";
import { updatesSignupConfigured } from "@/lib/server-keys";

/* "Do you know civics?": where every "Who's my ___?" ad lands (spec
   docs/superpowers/specs/2026-10-15-civics-quiz-landing-design.md). Six
   questions with the same answer for every Florida voter, then the address
   box into the ballot guide, then Donate and the stay-informed signup.

   The address is asked only at the hand-off, where it is used: the six
   answers need no location, so the quiz takes none (spec §6). The mayor
   question, which needs one, comes with city data (spec §8, v1.1).

   Re-rendered hourly so isStale sees today's date, not the build's. */
export const revalidate = 3600;

export const metadata = {
  title: "Do you know civics? — Know Your Vote",
  description:
    "Six quick questions about who holds Florida's offices now, every answer sourced. Then see who's on your ballot.",
};

export default async function CivicsPage() {
  const today = easternToday();
  const questions = CIVICS_QUESTIONS.map((q) => ({ ...q, stale: isStale(q.checkedAt, today) }));
  const districts = await getCoveredDistricts().catch(() => []);

  return (
    <main className="mx-auto flex w-full max-w-[680px] flex-1 flex-col gap-8 px-5 py-8">
      <header className="flex flex-col gap-2">
        <p className="text-overline uppercase tracking-[0.08em] text-accent-strong">Civics quiz</p>
        <h1 className="text-h1">Do you know civics?</h1>
        <p className="text-body-lg text-on-surface-muted">
          Six questions about who holds Florida&rsquo;s offices right now. Think of each
          answer, then check it. Every answer comes from an official source.
        </p>
      </header>

      <CivicsQuiz questions={questions} />

      <section aria-labelledby="ballot-h" className="flex flex-col gap-3">
        <h2 id="ballot-h" className="text-h2">
          Now see who&rsquo;s on your ballot
        </h2>
        <p className="text-body">
          Every Florida ballot has the statewide races and the amendments. Add your address
          for your U.S. House race and, in {coveredCountyNames()} counties, your county
          races. We keep only the district, never the address.
        </p>
        <LocationEntry
          submitLabel="See my ballot"
          addressEnabled={addressEntryEnabled()}
          suggestEnabled={geocoderConfigured()}
          districts={districts}
          pickerCollapsed
          privacyNote={false}
        />
        <p className="text-body-sm text-on-surface-muted">{NOT_COVERED_SENTENCE}</p>
      </section>

      <StayInformed signupEnabled={updatesSignupConfigured()} />
    </main>
  );
}
