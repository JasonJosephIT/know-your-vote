/* App-owned tables (PRD § 3) and shared response shapes. */

/* `news_item.relation` — CHECK-constrained in migration 0017. One definition
   of the two tiers, owned by the matcher that assigns them. */
import type { NewsRelation } from "@/lib/news-match";
export type { NewsRelation };

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

/* Migration 0005 widened item_type to four values and added candidate_id;
   this type was left behind and no longer matched the live database. */
export type NewsItemType =
  | "pipeline_event"
  | "official_link"
  | "candidate_news"
  | "election_news";

export interface NewsItem {
  id: string;
  race_id: string | null;
  candidate_id: string | null;
  metro: string | null;
  county_fips: string | null;
  item_type: NewsItemType;
  title: string;
  summary: string | null;
  url: string | null;
  source_id: string | null;
  published_at: string;
  /* How this row was matched to its candidate (migration 0017, PRD §6).
     NULL on rows that are not a candidate match at all. */
  relation: NewsRelation | null;
}

/* Contact & logistics layer written by the R2 refresher (migration 0005) —
   same anon-read visibility class as news_item, never brief content. */
export interface CandidateContact {
  candidate_id: string;
  campaign_email: string | null;
  campaign_phone: string | null;
  mailing_address: string | null;
  contact_url: string | null;
  source_url: string;
  last_verified_at: string;
  verified_by: string;
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
  /* County FIPS — the durable location key (zip_district, the DoE files and
     COVERED_COUNTIES are all keyed on it, and it reaches all 67 counties).
     `county` above is its display name. */
  countyFips?: string;
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
  /* What this candidate has SAID about the issues the voter picked —
     described on its own terms, not measured against the voter's answers.
     Renamed from alignmentNote in TASK-065: in a two-way general, "aligns
     with you" is a verdict even when nothing is ranked. */
  stanceSummary: string;
  /* Which of the voter's chosen issues this candidate has a stated position
     on. A coverage fact, not a score. */
  issuesCovered: string[];
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
