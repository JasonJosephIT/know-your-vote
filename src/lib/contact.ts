/* The one public mailbox the site names: corrections, questions about /terms,
   "anything here reads as slanted" on /methodology, and every brief's "Flag
   this brief as biased" link (CandidateBrief).

   Recommended (pending founder confirmation) — a11y-perf-2026-10-04.md fix 13
   and its "Recommendations pending founder confirmation" table: one shared
   constant, pointing at the founder mailbox. The flag link on main still mails
   flag@knowyourvote.example, a reserved domain that can never receive mail,
   on all 36 published race pages; /terms already defined this same address
   locally and the methodology rewrite named it inline.

   TO FLIP (a different mailbox, e.g. a dedicated flag@ inbox): change this
   one string. Every mailto and every printed address reads it, so nothing
   else needs editing. */
export const CONTACT_EMAIL = "hello@knowyour.vote";
