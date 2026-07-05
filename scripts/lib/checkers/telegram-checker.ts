import { fetchTelegramChannel } from "../fetch-telegram.js";
import { computeConfidenceScore, freshnessScore, statusFromAge } from "../score.js";
import type { CheckItem, ConfidenceSignals, PlatformChecker, SnapshotItem, Source } from "../types.js";

function makeChecks(source: Source, metrics: { subscribers: number | null; last_post_at: string | null }): CheckItem[] {
  const hasParsedSignal = metrics.last_post_at !== null || metrics.subscribers !== null;
  const freshnessDetails = metrics.last_post_at !== null
    ? `Last post detected at ${metrics.last_post_at}`
    : source.source_type === "group"
      ? "No last post timestamp detected. Public Telegram HTML only exposed the group join gate / member count."
      : "No last post timestamp detected in public HTML";

  return [
    {
      name: "http_fetch",
      ok: true,
      details: `Fetched public Telegram preview for @${source.handle}`,
    },
    {
      name: "content_parse",
      ok: hasParsedSignal,
      details: hasParsedSignal
        ? `Parsed metrics from public HTML (subs=${metrics.subscribers ?? "n/a"}, last_post=${metrics.last_post_at ?? "n/a"})`
        : "Public HTML did not expose parsable Telegram metrics",
    },
    {
      name: "freshness",
      ok: metrics.last_post_at !== null,
      details: freshnessDetails,
    },
  ];
}

function classifyTelegramStatus(metrics: { last_post_at: string | null; last_post_age_hours: number | null }) {
  // Without a detectable last post (e.g. group join gate, or public HTML that
  // doesn't expose message timestamps) we can't assess freshness → blocked.
  if (metrics.last_post_at === null) {
    return "blocked" as const;
  }
  return statusFromAge(metrics.last_post_age_hours);
}

export const telegramChecker: PlatformChecker = {
  platform: "tg",
  staggerMs: 5_000,
  canMonitor(source) {
    return source.platform === "tg" && (source.source_type === "channel" || source.source_type === "group");
  },
  async check(source): Promise<SnapshotItem> {
    const last_checked_at = new Date().toISOString();
    try {
      const metrics = await fetchTelegramChannel(source.handle);
      const checks = makeChecks(source, metrics);
      const status = classifyTelegramStatus(metrics);
      const signals: ConfidenceSignals = {
        http_reachable: true, // we only reach here when fetch succeeded
        content_parseable: metrics.last_post_at !== null || metrics.subscribers !== null,
        freshness_score:
          metrics.last_post_age_hours !== null ? freshnessScore(metrics.last_post_age_hours) / 100 : 0,
      };
      const confidence_score = computeConfidenceScore(signals);

      return {
        source_id: source.id,
        last_checked_at,
        platform: source.platform,
        status,
        confidence_score,
        checks,
        metrics,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        source_id: source.id,
        last_checked_at,
        platform: source.platform,
        status: "error",
        // `null` (not 0): the fetch failed, so we have no real signal to
        // score. `confidenceTier(null) === "no-data"` keeps error out of the
        // "Rendah" bucket — error means "we couldn't measure", not "low".
        // Same sentinel as unmonitored; the `status` field still tells them
        // apart (error vs unmonitored).
        confidence_score: null,
        checks: [
          {
            name: "http_fetch",
            ok: false,
            details: message,
          },
          {
            name: "content_parse",
            ok: false,
            details: "Skipped because fetch failed",
          },
          {
            name: "freshness",
            ok: false,
            details: "Skipped because fetch failed",
          },
        ],
        metrics: {},
        error: message,
      };
    }
  },
};
