/* Neutral quiz question set (TASK-032). Questions map to the spine issues
   used across the covered races. Wording rules: no leading language, no
   valence words, options describe approaches at the same register and
   length, and every question offers a no-strong-view option. */

export interface QuizQuestion {
  id: string;
  issueTitle: string;
  prompt: string;
  kind: "choice" | "freeText";
  options?: Array<{ id: string; label: string }>;
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: "economy",
    issueTitle: "Economy & Affordability",
    prompt:
      "When it comes to everyday costs, which approach sounds most like you?",
    kind: "choice",
    options: [
      { id: "targeted-relief", label: "Targeted relief programs for specific costs like housing and utilities" },
      { id: "lower-fees", label: "Lower fees, taxes, and regulation across the board" },
      { id: "wages-jobs", label: "Direct investment in wages, jobs, and training" },
      { id: "no-view", label: "No strong view — I'd rather read the candidates' own words" },
    ],
  },
  {
    id: "education",
    issueTitle: "Education",
    prompt: "On public education, which comes closest to your priority?",
    kind: "choice",
    options: [
      { id: "teacher-pay", label: "Raising teacher pay and classroom funding" },
      { id: "school-choice", label: "Expanding families' options for where students enroll" },
      { id: "career-paths", label: "More vocational and career-path programs" },
      { id: "no-view", label: "No strong view on this one" },
    ],
  },
  {
    id: "healthcare",
    issueTitle: "Healthcare",
    prompt: "On healthcare, which comes closest to your priority?",
    kind: "choice",
    options: [
      { id: "expand-access", label: "Expanding coverage and community clinic access" },
      { id: "lower-costs", label: "Lowering costs through competition and price transparency" },
      { id: "rural-care", label: "Keeping hospitals and clinics open where they're scarce" },
      { id: "no-view", label: "No strong view on this one" },
    ],
  },
  {
    id: "housing",
    issueTitle: "Housing",
    prompt: "On housing, which comes closest to your priority?",
    kind: "choice",
    options: [
      { id: "build-more", label: "Making it easier and faster to build more housing" },
      { id: "buyer-help", label: "Down-payment and first-time-buyer assistance" },
      { id: "renter-protections", label: "Stronger protections and stability for renters" },
      { id: "no-view", label: "No strong view on this one" },
    ],
  },
  {
    id: "environment",
    issueTitle: "Environment & Water",
    prompt: "On Florida's environment and water, which comes closest to your priority?",
    kind: "choice",
    options: [
      { id: "water-quality", label: "Water quality and restoration projects" },
      { id: "growth-balance", label: "Balancing environmental rules with growth and development" },
      { id: "resilience", label: "Preparing infrastructure for storms and flooding" },
      { id: "no-view", label: "No strong view on this one" },
    ],
  },
  {
    id: "immigration",
    issueTitle: "Immigration",
    prompt: "On immigration, which comes closest to your priority?",
    kind: "choice",
    options: [
      { id: "enforcement", label: "Stronger enforcement and border staffing" },
      { id: "legal-pathways", label: "Faster, clearer legal-status processing" },
      { id: "both", label: "Both enforcement and legal pathways together" },
      { id: "no-view", label: "No strong view on this one" },
    ],
  },
  {
    id: "free-response",
    issueTitle: "",
    prompt:
      "Anything else that matters to you this election? (Optional — a sentence or two.)",
    kind: "freeText",
  },
];
