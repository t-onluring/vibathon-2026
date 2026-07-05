export type { Platform, Priority, HealthStatus, Source } from "../../src/shared/types.js";
import type { Platform, HealthStatus, Source } from "../../src/shared/types.js";
export type { ConfidenceSignals } from "./score.js";

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
  /**
   * Canonical check names: "http_fetch", "content_parse", "freshness",
   * and (Phase 2) "extraction_quality". Kept as a loose string so new
   * checkers can introduce names without a breaking enum change.
   */
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

export interface PlatformChecker {
  /** Platform key, e.g. "tg", "web", "wa". */
  readonly platform: Platform;
  /** Whether this source can be monitored by this adapter in the current phase. */
  canMonitor(source: Source): boolean;
  /** Check one source and return a standard snapshot item. Must handle its own errors. */
  check(source: Source): Promise<SnapshotItem>;
  /** Optional delay after this checker runs, used by the orchestrator for rate limiting. */
  readonly staggerMs?: number;
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
