/* App-owned tables (PRD § 3) and shared response shapes. */

export type Metro = "miami" | "fort_lauderdale" | "tampa" | "orlando";

export interface ZipDistrict {
  zip5: string;
  county_fips: string;
  county_name: string;
  congressional_district: string;
  metro: Metro | null;
  is_split: boolean;
  in_coverage: boolean;
}

export type PublicationStatus = "draft" | "in_review" | "published";

export interface RacePublication {
  race_id: string;
  status: PublicationStatus;
  published_at: string | null;
  note: string | null;
}

export interface NewsItem {
  id: string;
  race_id: string | null;
  metro: string | null;
  item_type: "pipeline_event" | "official_link";
  title: string;
  summary: string | null;
  url: string | null;
  source_id: string | null;
  published_at: string;
}

export interface VotingInfoSubscription {
  id: string;
  email: string;
  zip5: string;
  consent_at: string;
  unsubscribe_token: string;
  last_sent_at: string | null;
  active: boolean;
}

/* GET /api/resolve response (PRD § 4). */
export interface ResolveRaceSummary {
  raceId: string;
  office: string;
  level: string;
  district: string | null;
  published: boolean;
}

export interface ResolveResult {
  zip: string;
  inCoverage: boolean;
  county?: string;
  district?: string;
  metro?: Metro | null;
  isSplit?: boolean;
  candidateDistricts?: string[];
  needsCountyConfirm?: boolean;
  races: ResolveRaceSummary[];
  message?: string;
}

/* POST /api/quiz response (PRD § 4). */
export interface QuizResultCandidate {
  candidateId: string;
  legalName: string;
  party: string;
  raceId: string;
  office: string;
  alignmentNote: string;
  alignedIssues: string[];
}

export interface QuizResponse {
  races: Array<{ raceId: string; office: string }>;
  results: QuizResultCandidate[];
  disclaimer: string;
}

/* Ballot measures (0010). App-owned, unlike the pipeline's race tables. */
export type MeasureSide = "support" | "oppose";

export interface BallotMeasure {
  measure_id: string;
  election: string;
  number: string;
  official_title: string;
  ballot_summary: string;
  full_text_url: string;
  placed_by: "legislature" | "citizen_initiative" | "commission" | "local";
  /* Florida requires 60% for a constitutional amendment. Stored per measure
     because local measures differ. */
  threshold_pct: number;
  jurisdiction: string;
  display_order: number;
}

export interface MeasureArgument {
  argument_id: string;
  measure_id: string;
  side: MeasureSide;
  text: string;
  source_id: string;
  attributed: boolean;
  display_order: number;
}
