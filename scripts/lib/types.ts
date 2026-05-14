export type Platform = "telegram" | "instagram" | "facebook" | "whatsapp" | "website" | "youtube";

export type Priority = "high" | "medium" | "low" | "archived";

export type HealthStatus = "active" | "stale" | "dead" | "blocked" | "error" | "unmonitored";

export interface Source {
  id: string;
  name: string;
  platform: Platform;
  url: string;
  handle: string;
  category: string[];
  region: string;
  language: string;
  priority: Priority;
  tags: string[];
  verified: boolean;
  added_at: string;
  notes?: string;
  partnership_status?: string;
  has_api?: boolean;
  monitor_status?: "not_yet_monitored";
}

export interface SourcesFile {
  $schema?: string;
  version: string;
  updated_at: string;
  license: string;
  sources: Source[];
}

export interface TelegramMetrics {
  subscribers: number | null;
  last_post_at: string | null;
  last_post_age_hours: number | null;
}

export interface HealthSnapshot {
  source_id: string;
  checked_at: string;
  platform: Platform;
  status: HealthStatus;
  reliability_score: number;
  metrics: TelegramMetrics | Record<string, unknown>;
  error?: string;
}

export interface LatestSummary {
  generated_at: string;
  total_sources: number;
  monitored: number;
  by_status: Record<HealthStatus, number>;
  snapshots: HealthSnapshot[];
}
