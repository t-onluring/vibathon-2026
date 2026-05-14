import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchTelegramChannel } from "./lib/fetch-telegram.js";
import { reliabilityScore, statusFromAge } from "./lib/score.js";
import type {
  HealthSnapshot,
  HealthStatus,
  LatestSummary,
  Source,
  SourcesFile,
} from "./lib/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SOURCES_PATH = join(ROOT, "data", "sources.json");
const HEALTH_DIR = join(ROOT, "data", "health");
const LATEST_PATH = join(ROOT, "data", "latest.json");

const STAGGER_MS = 5_000;

async function loadSources(): Promise<Source[]> {
  const raw = await readFile(SOURCES_PATH, "utf-8");
  const file: SourcesFile = JSON.parse(raw);
  return file.sources;
}

async function checkOne(source: Source): Promise<HealthSnapshot> {
  const checked_at = new Date().toISOString();
  try {
    const metrics = await fetchTelegramChannel(source.handle);
    const status = statusFromAge(metrics.last_post_age_hours);
    const score = reliabilityScore(metrics);
    return {
      source_id: source.id,
      checked_at,
      platform: source.platform,
      status,
      reliability_score: score,
      metrics,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      source_id: source.id,
      checked_at,
      platform: source.platform,
      status: "error",
      reliability_score: 0,
      metrics: {},
      error: message,
    };
  }
}

function unmonitoredSnapshot(source: Source, checked_at: string): HealthSnapshot {
  return {
    source_id: source.id,
    checked_at,
    platform: source.platform,
    status: "unmonitored",
    reliability_score: 0,
    metrics: {},
  };
}

function summarize(snapshots: HealthSnapshot[], totalSources: number): LatestSummary {
  const by_status: Record<HealthStatus, number> = {
    active: 0,
    stale: 0,
    dead: 0,
    blocked: 0,
    error: 0,
    unmonitored: 0,
  };
  for (const s of snapshots) by_status[s.status]++;

  return {
    generated_at: new Date().toISOString(),
    total_sources: totalSources,
    monitored: snapshots.filter((s) => s.status !== "unmonitored").length,
    by_status,
    snapshots,
  };
}

async function main() {
  console.log("[health-check] loading sources...");
  const sources = await loadSources();
  const tgSources = sources.filter((s) => s.platform === "telegram");
  const otherSources = sources.filter((s) => s.platform !== "telegram");
  console.log(`[health-check] ${tgSources.length} telegram sources to check`);

  const snapshots: HealthSnapshot[] = [];
  const checkedAtRunStart = new Date().toISOString();

  for (let i = 0; i < tgSources.length; i++) {
    const src = tgSources[i];
    console.log(`[${i + 1}/${tgSources.length}] checking ${src.handle}...`);
    const snap = await checkOne(src);
    snapshots.push(snap);
    console.log(
      `  → status=${snap.status}, score=${snap.reliability_score}, last_post=${
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
