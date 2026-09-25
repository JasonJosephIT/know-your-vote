/* One outbound pointer to a nonpartisan reference (founder call 2026-09-25,
   spec docs/superpowers/specs/2026-09-25-quiz-replacement-design.md). A
   plain link and nothing else: no logo, image or embed, so the page makes
   no request to the third party until someone clicks. That keeps the
   privacy page's promise. Vote411 is deliberately not linked: its operator
   takes sides on ballot measures. */
export function OutsideResources() {
  return (
    <aside
      aria-label="Another view"
      className="flex flex-col gap-1 rounded-md border border-border bg-surface-muted px-4 py-3"
    >
      <h2 className="text-label">Another view</h2>
      <p className="text-body-sm text-on-surface-muted">
        Ballotpedia, a nonpartisan encyclopedia, has a sample-ballot lookup and
        candidates&apos; own survey answers.
      </p>
      <a
        href="https://ballotpedia.org/Sample_Ballot_Lookup"
        target="_blank"
        rel="noreferrer"
        className="text-label text-primary underline underline-offset-2"
      >
        Look up your ballot on Ballotpedia
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    </aside>
  );
}
