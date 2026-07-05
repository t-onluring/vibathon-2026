import type { HealthStatus } from "./types.js";

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

/**
 * Discrete health status. Derived from the same freshness buckets used by
 * `freshnessScore` so the status thresholds can never drift from the score:
 *   - active: score >= 80  (last post < 7 days)
 *   - stale:  score 1–50   (last post 7–30 days)
 *   - dead:   score 0      (last post >= 30 days)
 *   - error:  age unknown
 */
export function statusFromAge(lastPostAgeHours: number | null): HealthStatus {
  if (lastPostAgeHours === null) return "error";
  const score = freshnessScore(lastPostAgeHours);
  if (score >= 80) return "active";
  if (score > 0) return "stale";
  return "dead";
}

/**
 * Platform-agnostic confidence signals. Each platform checker fills the
 * signals it can actually measure — no adapter writes an ad-hoc formula.
 *
 * `freshness_score` is always normalized to 0.0–1.0 (i.e. `freshnessScore(age) / 100`).
 * `extraction_quality` is optional and only populated in Phase 2 once
 * `scripts/extract/text-extractor.ts` exists; until then it carries no weight.
 *
 * Semantics: passing `extraction_quality: 0` means extraction ran and produced
 * no valid events (weights rebalance to 20/30/30/20, lowering the score vs the
 * base 25/40/35); omitting the field means extraction wasn't attempted yet
 * (base weights apply). Don't conflate the two.
 *
 * Canonical check names that map to these signals: "http_fetch",
 * "content_parse", "freshness", and (Phase 2) "extraction_quality".
 */
export interface ConfidenceSignals {
  http_reachable: boolean;
  content_parseable: boolean;
  freshness_score: number; // 0.0–1.0
  extraction_quality?: number; // 0.0–1.0 (Phase 2)
}

const WEIGHTS_BASE = { http: 0.25, content: 0.4, freshness: 0.35 } as const;
const WEIGHTS_WITH_EXTRACTION = {
  http: 0.2,
  content: 0.3,
  freshness: 0.3,
  extraction: 0.2,
} as const;

function clamp01(n: number): number {
  // NaN is rejected upstream in computeConfidenceScore; this only handles
  // out-of-range drift from callers that forget the /100 normalization.
  if (n <= 0) return 0;
  if (n >= 1) return 1;
  return n;
}

/**
 * Compute `confidence_score` from normalized signals. Replaces the
 * Telegram-only `confidenceScoreFromMetrics` (Phase 1.5) so every platform
 * checker shares one contract.
 *
 * Weights:
 *   - without extraction: http 25% / content 40% / freshness 35%
 *   - with extraction:    http 20% / content 30% / freshness 30% / extraction 20%
 *
 * The score is always in [0.0, 1.0]. NaN inputs for `freshness_score` or
 * `extraction_quality` are rejected defensively (callers must normalize);
 * out-of-range values are clamped.
 */
export function computeConfidenceScore(signals: ConfidenceSignals): number {
  if (Number.isNaN(signals.freshness_score)) {
    throw new RangeError(
      "ConfidenceSignals.freshness_score must be a normalized 0.0–1.0 number, got NaN",
    );
  }
  if (signals.extraction_quality !== undefined && Number.isNaN(signals.extraction_quality)) {
    throw new RangeError("ConfidenceSignals.extraction_quality must be 0.0–1.0, got NaN");
  }

  const hasExtraction = signals.extraction_quality !== undefined;
  const fresh = clamp01(signals.freshness_score);
  const extraction = hasExtraction ? clamp01(signals.extraction_quality as number) : 0;

  const raw = hasExtraction
    ? WEIGHTS_WITH_EXTRACTION.http * (signals.http_reachable ? 1 : 0) +
      WEIGHTS_WITH_EXTRACTION.content * (signals.content_parseable ? 1 : 0) +
      WEIGHTS_WITH_EXTRACTION.freshness * fresh +
      WEIGHTS_WITH_EXTRACTION.extraction * extraction
    : WEIGHTS_BASE.http * (signals.http_reachable ? 1 : 0) +
      WEIGHTS_BASE.content * (signals.content_parseable ? 1 : 0) +
      WEIGHTS_BASE.freshness * fresh;

  return Number(raw.toFixed(2));
}

/**
 * Confidence tier — the graded-quality dimension shown alongside the
 * operational `HealthStatus`. Distinct from status: a source can be
 * `active` (operational) yet `low` (poor reach/parse), or `blocked`
 * (no last_post detected) yet `mid` (channel reachable, modest signals).
 *
 * `null`/`undefined`/`NaN` → `"no-data"`: the source was not checked
 * (unmonitored) so it carries no real score. This is the sentinel that
 * keeps unmonitored out of the `low` bucket — without it, the 15
 * unmonitored sources would pollute AVG SCORE and the "Rendah" count.
 *
 * Thresholds (decided 2026-07-05):
 *   - high:    score >= 0.7
 *   - mid:     0.4–0.699
 *   - low:     < 0.4   (only sources that were actually checked)
 *   - no-data: null/undefined/NaN (never checked)
 */
export { confidenceTier } from "../../src/shared/confidence.js";
