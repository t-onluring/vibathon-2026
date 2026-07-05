export type Platform = "tg" | "yt" | "ig" | "web" | "wa";

export type Priority = number;

export type HealthStatus = "active" | "stale" | "dead" | "blocked" | "error" | "unmonitored";

/**
 * Confidence tier — graded-quality dimension shown alongside `HealthStatus`.
 * See `confidenceTier()` in scripts/lib/score.ts for the threshold mapping.
 * `no-data` = source was not checked (unmonitored) — distinct from `low`.
 */
export type Tier = "high" | "mid" | "low" | "no-data";

export interface Source {
  id: string;
  name: string;
  platform: Platform;
  source_type: string;
  url: string;
  handle: string;
  category?: string[];
  region: string;
  language: string;
  priority: Priority;
  tags?: string[];
  verified?: boolean;
  added_at: string;
  parent_id?: string;
  topic_id?: string;
  notes?: string;
  partnership_status?: string;
  has_api?: boolean;
  monitor_status?: "not_yet_monitored";
}
