export type { Platform, Priority, HealthStatus, Source } from "../../src/shared/types.js";
import type { Platform, HealthStatus, Source } from "../../src/shared/types.js";

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
