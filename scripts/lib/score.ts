import type { HealthStatus, TelegramMetrics } from "./types.js";

const HOURS = {
  THREE_DAYS: 72,
  SEVEN_DAYS: 168,
  FOURTEEN_DAYS: 336,
  THIRTY_DAYS: 720,
};

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

/**
 * MVP score = freshness only (40% weight in full formula, but we use 100% here
 * since other signals — consistency, volume, engagement, diversity — need
 * historical data we don't have on first run).
 */
export function reliabilityScore(metrics: TelegramMetrics): number {
  const fresh = freshnessScore(metrics.last_post_age_hours);
  return Math.round(fresh);
}
