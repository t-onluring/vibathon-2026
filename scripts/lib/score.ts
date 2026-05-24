import type { HealthStatus, TelegramMetrics } from "./types.js";

const HOURS = {
  THREE_DAYS: 72,
  SEVEN_DAYS: 168,
  FOURTEEN_DAYS: 336,
  THIRTY_DAYS: 720,
};

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export function freshnessScore(lastPostAgeHours: number | null): number {
  if (lastPostAgeHours === null) return 0;
  if (lastPostAgeHours < HOURS.THREE_DAYS) return 100;
  if (lastPostAgeHours < HOURS.SEVEN_DAYS) return 80;
  if (lastPostAgeHours < HOURS.FOURTEEN_DAYS) return 50;
  if (lastPostAgeHours < HOURS.THIRTY_DAYS) return 20;
  return 0;
}

export function statusFromAge(lastPostAgeHours: number | null): HealthStatus {
  if (lastPostAgeHours === null) return "error";
  if (lastPostAgeHours < HOURS.SEVEN_DAYS) return "active";
  if (lastPostAgeHours < HOURS.THIRTY_DAYS) return "stale";
  return "dead";
}

export function confidenceScoreFromChecks(checks: {
  httpFetch: boolean;
  contentParse: boolean;
  freshness: boolean;
}): number {
  return round(
    (checks.httpFetch ? 0.4 : 0) +
    (checks.contentParse ? 0.35 : 0) +
    (checks.freshness ? 0.25 : 0)
  );
}

export function confidenceScoreFromMetrics(metrics: TelegramMetrics): number {
  return confidenceScoreFromChecks({
    httpFetch: true,
    contentParse: metrics.last_post_at !== null || metrics.subscribers !== null,
    freshness: metrics.last_post_at !== null,
  });
}
