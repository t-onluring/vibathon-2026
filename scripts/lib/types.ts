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

export interface CheckItem {
  name: string;
  ok: boolean;
  details: string;
}

export interface SnapshotItem {
  source_id: string;
  last_checked_at: string;
  platform: Platform;
  status: HealthStatus;
  confidence_score: number;
  checks: CheckItem[];
  metrics: TelegramMetrics | Record<string, unknown>;
  error?: string;
}

export type HealthSnapshot = SnapshotItem;

export interface LatestSummary {
  generated_at: string;
  version: string;
  total_sources: number;
  monitored_sources: number;
  by_status: Record<HealthStatus, number>;
  snapshots: SnapshotItem[];
}
