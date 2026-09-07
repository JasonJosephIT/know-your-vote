import "server-only";

import { createAnonServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

/* Scope reference lists for the Submit forms' race/candidate/metro selects
   (handoff A3 §A). The operator attaches a manual submission to a race,
   candidate, and/or metro; these are the option lists. Read with the service
   role so ALL races/candidates are selectable (drafts included), falling back
   to the anon client — which sees only published rows — when the service key
   is absent. */

export interface RaceRef {
  race_id: string;
  office: string;
  district: string | null;
}
export interface CandidateRef {
  candidate_id: string;
  legal_name: string;
}

/* Voter-app coverage metros (src/types/app.ts `Metro`), as a runtime list. */
export const METROS = ["miami", "fort_lauderdale", "tampa", "orlando"] as const;

export async function getScopeRefs(): Promise<{
  races: RaceRef[];
  candidates: CandidateRef[];
}> {
  let client;
  try {
    client = createServiceClient();
  } catch {
    client = await createAnonServerClient();
  }

  const [racesRes, candsRes] = await Promise.all([
    client.from("race").select("race_id, office, district").order("office"),
    client.from("candidate").select("candidate_id, legal_name").order("legal_name"),
  ]);

  return {
    races: (racesRes.data ?? []) as RaceRef[],
    candidates: (candsRes.data ?? []) as CandidateRef[],
  };
}
