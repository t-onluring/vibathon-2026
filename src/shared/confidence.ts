import type { Tier } from "./types.js";

/**
 * Confidence tier — graded-quality dimension shown alongside `HealthStatus`.
 * A source can be `active` (operational) yet `low` (poor reach/parse), or
 * `blocked` (no last_post detected) yet `mid` (channel reachable, modest
 * signals). Tier and status answer different questions.
 *
 * `null`/`undefined`/`NaN` → `"no-data"`: the source was not checked
 * (unmonitored) so it carries no real score. This sentinel keeps unmonitored
 * out of the `low` bucket — without it, unmonitored sources would pollute
 * AVG SCORE and the "Rendah" count.
 *
 * Thresholds (decided 2026-07-05):
 *   - high:    score >= 0.7
 *   - mid:     0.4–0.699
 *   - low:     < 0.4   (only sources that were actually checked)
 *   - no-data: null/undefined/NaN (never checked)
 *
 * Shared between `scripts/lib/score.ts` (server-side `by_tier` in snapshots)
 * and the client (per-region tier counts + legacy fallback). Single source
 * of truth so thresholds never drift between server and UI.
 */
export function confidenceTier(score: number | null | undefined): Tier {
  if (score === null || score === undefined || Number.isNaN(score)) return "no-data";
  if (score >= 0.7) return "high";
  if (score >= 0.4) return "mid";
  return "low";
}
