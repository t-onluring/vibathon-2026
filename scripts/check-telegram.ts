import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchTelegramChannel } from "./lib/fetch-telegram.js";
import { confidenceScoreFromMetrics, statusFromAge } from "./lib/score.js";
import type {
  CheckItem,
  LatestSummary,
  SnapshotItem,
  Source,
  SourcesFile,
} from "./lib/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SOURCES_PATH = join(ROOT, "data", "sources.json");
const HEALTH_DIR = join(ROOT, "data", "health");
const LATEST_PATH = join(ROOT, "data", "latest.json");

const STAGGER_MS = 5_000;
const SNAPSHOT_VERSION = "v1.0.0";

async function loadSources(): Promise<Source[]> {
  const raw = await readFile(SOURCES_PATH, "utf-8");
  const file: SourcesFile = JSON.parse(raw);
  return file.sources;
}

function canMonitorTelegram(source: Source): boolean {
  return source.platform === "tg" && (source.source_type === "channel" || source.source_type === "group");
}

function makeChecks(source: Source, metrics: { subscribers: number | null; last_post_at: string | null }): CheckItem[] {
  return [
    {
      name: "http_fetch",
      ok: true,
      details: `Fetched public Telegram preview for @${source.handle}`,
    },
    {
      name: "content_parse",
      ok: metrics.last_post_at !== null || metrics.subscribers !== null,
      details:
        metrics.last_post_at !== null || metrics.subscribers !== null
          ? `Parsed metrics from public HTML (subs=${metrics.subscribers ?? "n/a"}, last_post=${metrics.last_post_at ?? "n/a"})`
          : "Public HTML did not expose parsable Telegram metrics",
    },
    {
      name: "freshness",
      ok: metrics.last_post_at !== null,
      details: metrics.last_post_at !== null
        ? `Last post detected at ${metrics.last_post_at}`
        : "No last post timestamp detected in public HTML",
    },
  ];
}

async function checkTelegramSource(source: Source): Promise<SnapshotItem> {
  const last_checked_at = new Date().toISOString();
  try {
    const metrics = await fetchTelegramChannel(source.handle);
    const checks = makeChecks(source, metrics);
    const status = statusFromAge(metrics.last_post_age_hours);
    const confidence_score = confidenceScoreFromMetrics(metrics);

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
      confidence_score: 0,
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
}

function unmonitoredSnapshot(source: Source, last_checked_at: string): SnapshotItem {
  return {
    source_id: source.id,
    last_checked_at,
    platform: source.platform,
    status: "unmonitored",
    confidence_score: 0,
    checks: [
      {
        name: "monitoring",
        ok: false,
        details: `No active checker strategy for ${source.platform}/${source.source_type} in this phase`,
      },
    ],
    metrics: {},
  };
}

function summarize(snapshots: SnapshotItem[], totalSources: number): LatestSummary {
  const by_status = {
    active: 0,
    stale: 0,
    dead: 0,
    blocked: 0,
    error: 0,
    unmonitored: 0,
  } as LatestSummary["by_status"];

  for (const s of snapshots) by_status[s.status]++;

  return {
    generated_at: new Date().toISOString(),
    version: SNAPSHOT_VERSION,
    total_sources: totalSources,
    monitored_sources: snapshots.filter((s) => s.status !== "unmonitored").length,
    by_status,
    snapshots,
  };
}

async function main() {
  console.log("[health-check] loading sources...");
  const sources = await loadSources();
  const tgSources = sources.filter(canMonitorTelegram);
  const otherSources = sources.filter((s) => !canMonitorTelegram(s));
  console.log(`[health-check] ${tgSources.length} tg channel/group sources to check`);

  const snapshots: SnapshotItem[] = [];
  const checkedAtRunStart = new Date().toISOString();

  for (let i = 0; i < tgSources.length; i++) {
    const src = tgSources[i];
    console.log(`[${i + 1}/${tgSources.length}] checking ${src.handle} (${src.source_type})...`);
    const snap = await checkTelegramSource(src);
    snapshots.push(snap);
    console.log(
      `  → status=${snap.status}, confidence=${snap.confidence_score}, last_post=${
        (snap.metrics as { last_post_at?: string | null }).last_post_at ?? "n/a"
      }`
    );
    if (i < tgSources.length - 1) {
      await new Promise((r) => setTimeout(r, STAGGER_MS));
    }
  }

  for (const src of otherSources) {
    snapshots.push(unmonitoredSnapshot(src, checkedAtRunStart));
  }

  await mkdir(HEALTH_DIR, { recursive: true });
  const dateKey = new Date().toISOString().slice(0, 10);
  const archivePath = join(HEALTH_DIR, `${dateKey}.json`);

  const summary = summarize(snapshots, sources.length);

  await writeFile(archivePath, JSON.stringify(summary, null, 2), "utf-8");
  await writeFile(LATEST_PATH, JSON.stringify(summary, null, 2), "utf-8");

  console.log(`\n[health-check] done.`);
  console.log(`  archive: ${archivePath}`);
  console.log(`  latest : ${LATEST_PATH}`);
  console.log(`  summary:`, summary.by_status);
}

main().catch((err) => {
  console.error("[health-check] FAILED:", err);
  process.exit(1);
});
