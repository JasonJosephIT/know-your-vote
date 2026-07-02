/* Read-model types mirroring CAP_Schema_v1.md (pipeline-owned, read-only
   for this app) exactly as stored in Supabase. */

export type Party = "REP" | "DEM" | "NPA" | "other";

export type Verdict =
  | "accurate"
  | "mostly_accurate"
  | "mixed"
  | "mostly_inaccurate"
  | "inaccurate"
  | "unverifiable";

export type ClaimBucket = "verifiable_fact" | "stated_position" | "outside_opinion";

export type VerificationStatus = "verified" | "single_source" | "unverified";

export type RaceLevel = "federal" | "state";

export type ElectionKind = "primary" | "general";

export interface KeyDates {
  primary_date?: string;
  general_date?: string;
  registration_deadline?: string;
}

export interface Race {
  race_id: string;
  office: string;
  level: RaceLevel;
  district: string | null;
  election: ElectionKind;
  is_open_seat: boolean;
  incumbent_id: string | null;
  candidate_ids: string[];
  key_dates: KeyDates;
}

export interface Candidate {
  candidate_id: string;
  legal_name: string;
  party: Party;
  office_sought: string;
  is_incumbent: boolean;
  qualifying_status: "qualified" | "withdrawn" | "other";
  prior_offices: string[];
  official_site: string | null;
  fec_id: string | null;
}

export interface CandidateSocialAccount {
  id: string;
  candidate_id: string;
  platform: string;
  handle: string;
  handle_norm: string;
  url: string | null;
  provenance: "linked_from_official_site" | "doe_filing" | "fec_filing";
  provenance_source_id: string | null;
  status: "verified" | "unverified" | "disputed";
  verified_at: string | null;
}

export interface Source {
  source_id: string;
  url: string;
  url_norm: string;
  publisher: string;
  type: "factual_reporting" | "opinion" | "primary_doc" | "candidate_self";
  lean_tag: "left" | "center-left" | "center" | "center-right" | "right" | "N/A";
  retrieved_at: string;
}

export interface Claim {
  claim_id: string;
  candidate_id: string;
  race_id: string;
  issue_id: string | null;
  text: string;
  bucket: ClaimBucket;
  attributed: boolean;
  derived_from: string | null;
  verdict: Verdict | null;
  verification: VerificationStatus;
}

export interface Issue {
  issue_id: string;
  race_id: string;
  tier: "spine" | "candidate";
  candidate_id: string | null;
  title: string;
  description: string | null;
  source_id: string | null;
  display_order: number;
}

export interface Position {
  position_id: string;
  candidate_id: string;
  race_id: string;
  issue_id: string;
  stance_summary: string;
  claim_ids: string[];
  attributed: boolean;
  coverage: "stated" | "no_stated_position_found";
}

export interface ProfileAudit {
  word_count?: number;
  verifiable_fact_count?: number;
  stated_position_count?: number;
  fact_checks_performed?: number;
  spine_issue_count?: number;
  spine_issues_covered?: number;
  balance_check_passed?: boolean;
  flag_reason?:
    | "scrutiny_halt"
    | "stated_position_asymmetry"
    | "issue_coverage_asymmetry"
    | null;
  flagged_at?: string | null;
}

export interface Profile {
  candidate_id: string;
  race_id: string;
  facts: string[];
  positions: string[];
  opinions: string[];
  audit: ProfileAudit;
}
