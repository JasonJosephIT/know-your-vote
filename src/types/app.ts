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

/* pipeline_event/official_link are app/pipeline-authored; candidate_news/
   election_news are agent-authored (R1/R3, migration 0005). */
export type NewsItemType =
  "pipeline_event" | "official_link" | "candidate_news" | "election_news";

export interface NewsItem {
  id: string;
  race_id: string | null;
  metro: string | null;
  candidate_id: string | null;
  item_type: NewsItemType;
  title: string;
  summary: string | null;
  url: string | null;
  source_id: string | null;
  published_at: string;
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
