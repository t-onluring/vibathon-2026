import assert from "node:assert/strict";
import { parseTelegramHtml } from "./lib/fetch-telegram.js";
import {
  computeConfidenceScore,
  freshnessScore,
  statusFromAge,
} from "./lib/score.js";

let passed = 0;
function test(name: string, fn: () => void) {
  fn();
  passed++;
  console.log(`✅ ${name}`);
}

// ---- fixtures -------------------------------------------------------------

function channelHtml(opts: {
  counterValue?: string;
  counterType?: string;
  postDates?: string[];
}): string {
  const counter =
    opts.counterValue !== undefined
      ? `<div class="tgme_channel_info_counter"><span class="counter_value">${opts.counterValue}</span><span class="counter_type">${opts.counterType ?? "subscribers"}</span></div>`
      : "";
  const posts = (opts.postDates ?? [])
    .map((d) => `<div class="tgme_widget_message_date"><time datetime="${d}"></time></div>`)
    .join("");
  return `<html><body><div class="tgme_channel_info">${counter}</div>${posts}</body></html>`;
}

const HOUR_MS = 3_600_000;
function isoHoursAgo(hours: number): string {
  return new Date(Date.now() - hours * HOUR_MS).toISOString();
}

// ---- parseTelegramHtml ----------------------------------------------------

test("parseTelegramHtml: subscribers + latest post date", () => {
  const html = channelHtml({
    counterValue: "12.5K",
    counterType: "subscribers",
    postDates: [
      "2026-06-01T10:00:00+00:00",
      "2026-06-05T10:00:00+00:00", // latest
      "2026-06-03T10:00:00+00:00",
    ],
  });
  const m = parseTelegramHtml(html);
  assert.equal(m.subscribers, 12_500, "12.5K → 12500");
  assert.equal(m.last_post_at, "2026-06-05T10:00:00.000Z", "picks latest datetime");
  assert.ok(typeof m.last_post_age_hours === "number" && m.last_post_age_hours! > 0);
});

test("parseTelegramHtml: members counter (group) parsed, no post dates", () => {
  const html = channelHtml({ counterValue: "1 234", counterType: "members" });
  const m = parseTelegramHtml(html);
  assert.equal(m.subscribers, 1_234, "'1 234' → 1234");
  assert.equal(m.last_post_at, null, "no message dates → null");
  assert.equal(m.last_post_age_hours, null);
});

test("parseTelegramHtml: 'M' suffix human number", () => {
  const m = parseTelegramHtml(channelHtml({ counterValue: "1.2M", counterType: "subscribers" }));
  assert.equal(m.subscribers, 1_200_000);
});

test("parseTelegramHtml: empty/garbage HTML → all null", () => {
  const m = parseTelegramHtml("<html><body>nothing here</body></html>");
  assert.equal(m.subscribers, null);
  assert.equal(m.last_post_at, null);
  assert.equal(m.last_post_age_hours, null);
});

test("parseTelegramHtml: age reflects recency (~48h)", () => {
  const m = parseTelegramHtml(channelHtml({ postDates: [isoHoursAgo(48)] }));
  assert.ok(m.last_post_age_hours !== null);
  assert.ok(
    Math.abs(m.last_post_age_hours! - 48) < 1,
    `expected ~48h, got ${m.last_post_age_hours}`,
  );
});

// ---- score.ts -------------------------------------------------------------

test("statusFromAge: active/stale/dead boundaries", () => {
  assert.equal(statusFromAge(0), "active");
  assert.equal(statusFromAge(167), "active"); // < 168h (7d)
  assert.equal(statusFromAge(168), "stale"); // >= 7d, < 30d
  assert.equal(statusFromAge(719), "stale");
  assert.equal(statusFromAge(720), "dead"); // >= 30d
  assert.equal(statusFromAge(null), "error");
});

test("freshnessScore: tiered buckets", () => {
  assert.equal(freshnessScore(null), 0);
  assert.equal(freshnessScore(1), 100); // < 72h
  assert.equal(freshnessScore(100), 80); // < 168h
  assert.equal(freshnessScore(200), 50); // < 336h
  assert.equal(freshnessScore(500), 20); // < 720h
  assert.equal(freshnessScore(1000), 0); // >= 720h
});

test("computeConfidenceScore: all signals ok + fresh → 1.00", () => {
  assert.equal(
    computeConfidenceScore({ http_reachable: true, content_parseable: true, freshness_score: 1 }),
    1,
  );
});

test("computeConfidenceScore: tiered freshness drives the score (no extraction)", () => {
  // reach + content + fresh=0.8 (3–7 days) → 0.25 + 0.40 + 0.28 = 0.93
  assert.equal(
    computeConfidenceScore({ http_reachable: true, content_parseable: true, freshness_score: 0.8 }),
    0.93,
  );
  // fresh=0.5 (7–14 days) → 0.25 + 0.40 + 0.175 = 0.825 → "0.82" (JS toFixed rounding)
  assert.equal(
    computeConfidenceScore({ http_reachable: true, content_parseable: true, freshness_score: 0.5 }),
    0.82,
  );
  // fresh=0.2 (14–30 days) → 0.25 + 0.40 + 0.07 = 0.72
  assert.equal(
    computeConfidenceScore({ http_reachable: true, content_parseable: true, freshness_score: 0.2 }),
    0.72,
  );
  // fresh=0 (> 30 days) but still reachable + parseable → 0.65
  assert.equal(
    computeConfidenceScore({ http_reachable: true, content_parseable: true, freshness_score: 0 }),
    0.65,
  );
});

test("computeConfidenceScore: floor 0.25 when only reach is ok (parse fail)", () => {
  assert.equal(
    computeConfidenceScore({ http_reachable: true, content_parseable: false, freshness_score: 0 }),
    0.25,
  );
});

test("computeConfidenceScore: everything fails → 0.00", () => {
  assert.equal(
    computeConfidenceScore({ http_reachable: false, content_parseable: false, freshness_score: 0 }),
    0,
  );
});

test("computeConfidenceScore: out-of-range freshness is clamped, not errors", () => {
  assert.equal(
    computeConfidenceScore({ http_reachable: true, content_parseable: true, freshness_score: 5 }),
    1,
  ); // clamps to 1.0 → full
  assert.equal(
    computeConfidenceScore({ http_reachable: true, content_parseable: false, freshness_score: -3 }),
    0.25,
  ); // clamps to 0 → floor
});

test("computeConfidenceScore: NaN freshness is rejected (defensive contract)", () => {
  assert.throws(
    () => computeConfidenceScore({ http_reachable: true, content_parseable: true, freshness_score: NaN }),
    RangeError,
  );
  assert.throws(
    () =>
      computeConfidenceScore({
        http_reachable: true,
        content_parseable: true,
        freshness_score: 0.5,
        extraction_quality: NaN,
      }),
    RangeError,
  );
});

test("computeConfidenceScore: extraction_quality rebalances weights (Phase 2 preview)", () => {
  // fresh + content + reach + extraction=0.85 → 0.20 + 0.30 + 0.30 + 0.17 = 0.97
  assert.equal(
    computeConfidenceScore({
      http_reachable: true,
      content_parseable: true,
      freshness_score: 1,
      extraction_quality: 0.85,
    }),
    0.97,
  );
  // mid source (fresh=0.5) with extraction=0.5 → 0.20 + 0.30 + 0.15 + 0.10 = 0.75
  assert.equal(
    computeConfidenceScore({
      http_reachable: true,
      content_parseable: true,
      freshness_score: 0.5,
      extraction_quality: 0.5,
    }),
    0.75,
  );
});

test("computeConfidenceScore: extraction weights sum to 1.0 (full signals → 1.00)", () => {
  assert.equal(
    computeConfidenceScore({
      http_reachable: true,
      content_parseable: true,
      freshness_score: 1,
      extraction_quality: 1,
    }),
    1,
  );
});

test("computeConfidenceScore: extraction_quality:0 differs from omitted (rebalance vs base)", () => {
  // Omitted (base weights 25/40/35) → 1.00; explicit 0 (rebalanced 20/30/30/20) → 0.80.
  // "measured as bad" ≠ "not measured".
  assert.equal(
    computeConfidenceScore({ http_reachable: true, content_parseable: true, freshness_score: 1 }),
    1,
  );
  assert.equal(
    computeConfidenceScore({
      http_reachable: true,
      content_parseable: true,
      freshness_score: 1,
      extraction_quality: 0,
    }),
    0.8,
  );
});

test("computeConfidenceScore: telegram-checker signal mapping reproduces per-platform table", () => {
  // Mirrors scripts/lib/checkers/telegram-checker.ts: build signals from
  // TelegramMetrics the same way the checker does, then assert the issue's
  // documented TG scores.
  function tgScore(metrics: { last_post_age_hours: number | null; last_post_at: string | null; subscribers: number | null }) {
    return computeConfidenceScore({
      http_reachable: true,
      content_parseable: metrics.last_post_at !== null || metrics.subscribers !== null,
      freshness_score:
        metrics.last_post_age_hours !== null ? freshnessScore(metrics.last_post_age_hours) / 100 : 0,
    });
  }
  assert.equal(tgScore({ subscribers: 100, last_post_at: "x", last_post_age_hours: 48 }), 1); // < 3d
  assert.equal(tgScore({ subscribers: 100, last_post_at: "x", last_post_age_hours: 120 }), 0.93); // 3–7d
  assert.equal(tgScore({ subscribers: 100, last_post_at: "x", last_post_age_hours: 240 }), 0.82); // 7–14d
  assert.equal(tgScore({ subscribers: 100, last_post_at: "x", last_post_age_hours: 480 }), 0.72); // 14–30d
  assert.equal(tgScore({ subscribers: 100, last_post_at: "x", last_post_age_hours: 960 }), 0.65); // > 30d
  // group-gated: members counter, no last_post_at → 0.65 (intentional regression from old 0.75)
  assert.equal(tgScore({ subscribers: 1234, last_post_at: null, last_post_age_hours: null }), 0.65);
  // parse fail but fetch ok → floor 0.25
  assert.equal(tgScore({ subscribers: null, last_post_at: null, last_post_age_hours: null }), 0.25);
});

console.log(`\n✅ telegram parser + score tests passed (${passed})`);
