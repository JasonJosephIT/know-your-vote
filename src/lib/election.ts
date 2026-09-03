import type { ElectionKind } from "@/types/schema";

/* The one place that says which election the app is currently serving
   (TASK-057).

   Two vocabularies exist in the schema and they are NOT interchangeable:

     race.election          'primary' | 'general'   — the ElectionKind enum
     election_event.election 'primary_2026' | 'general_2026' — cycle-scoped

   Keeping both here means switching cycles is one edit rather than a hunt
   through nine call sites, and it makes the pairing explicit so a future
   'general' never gets matched against a 'general_2026' row or vice versa.

   Every read of the race table filters on ACTIVE_ELECTION_KIND. Today the
   database happens to hold a single cycle, so omitting the filter appears
   to work — that is luck, not a guarantee, and it stops being true the
   moment a 2028 primary row lands beside these. */

/* Cycle key for election_event, notification templates, and the ICS feed. */
export const ACTIVE_ELECTION = "general_2026" as const;

/* Enum value on the race table. */
export const ACTIVE_ELECTION_KIND: ElectionKind = "general";

/* Voter-facing name. Used in copy; keep it plain, never "the big one". */
export const ACTIVE_ELECTION_LABEL = "2026 Florida general election";
