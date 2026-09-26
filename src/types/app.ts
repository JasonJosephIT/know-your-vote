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

/* `listed` (migration 0033) is the roster tier: the race, its ballot-tier
   candidates and the publication status itself are anon-readable, while every
   brief table (profile, issue, position, claim, claim_source) stays gated on
   `published`. See docs/general-election/listed-tier-2026-09-23.md. */
export type PublicationStatus = "draft" | "in_review" | "listed" | "published";

export interface RacePublication {
  race_id: string;
  status: PublicationStatus;
  published_at: string | null;
  note: string | null;
}

/* Migration 0005 widened item_type to four values and added candidate_id;
   this type was left behind and no longer matched the live database. */
export type NewsItemType =
  "pipeline_event" | "official_link" | "candidate_news" | "election_news";

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
  /* Hero image for the story card, from the outlet's own feed (migration 0029).
     NULL is a real and common state, not a backlog — many feeds carry no image
     and the card has a text-only variant. */
  image_url: string | null;
  /* Issue tags from the characterizer (migration 0027). NULL means never
     characterized, [] means characterized with nothing over threshold. Both
     render as "no tags"; neither ever hides the row (design spec §4.2). */
  issues: string[] | null;
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
  /* Which tier made the race visible (0033). Optional because cached shapes
     written before this field existed come back without it, and `undefined`
     has to mean the weaker claim — treat as `listed`, never as `published`. */
  status?: "listed" | "published";
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
  /* How much of the ballot this result places. "district": a congressional
     district resolved (its House race may still be unpublished -- see
     districtRaceMissing). "statewide": a Florida location we cannot place in a
     district yet, so `races` is only the ballot every Florida voter shares.
     Absent reads as "district", which is what every result meant before the
     field existed. */
  coverage?: "district" | "statewide";
}

/* Ballot measures (0010, 0034). App-owned, unlike the pipeline's race tables. */
export type MeasureStance = "support" | "oppose" | "neutral";

/* The credibility ladder, top to bottom. The tier is RESOURCE_TIER[kind] in
   src/lib/measure-ladder.ts and nowhere else. */
export type MeasureKind =
  | "official"
  | "analysis"
  | "reporting"
  | "argument"
  | "commentary";

/* Format is NOT credibility: a think tank's video is `analysis` + `video`. */
export type MeasureFormat = "document" | "article" | "video" | "audio";

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

/* One outside resource about a measure (0034). Publisher, URL, type and
   lean come from the joined `source` row, never duplicated here. */
export interface MeasureResource {
  resource_id: string;
  measure_id: string;
  source_id: string;
  stance: MeasureStance;
  kind: MeasureKind;
  format: MeasureFormat;
  title: string;
  author: string | null;
  /* ISO date (YYYY-MM-DD) or null when the resource is undated. */
  published_at: string | null;
  duration_seconds: number | null;
  /* ≤140 chars of attribution, never summary (spec F4). */
  note: string | null;
  display_order: number;
}
