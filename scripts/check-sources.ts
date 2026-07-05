import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { CHECKERS } from "./lib/checkers/index.js";
import { confidenceTier } from "./lib/score.js";
import type {
  LatestSummary,
  PlatformChecker,
  SnapshotItem,
  Source,
  SourcesFile,
  Tier,
} from "./lib/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SOURCES_PATH = join(ROOT, "data", "sources.json");
const HEALTH_DIR = join(ROOT, "data", "health");
const LATEST_PATH = join(ROOT, "data", "latest.json");

const DEFAULT_STAGGER_MS = 5_000;
const SNAPSHOT_VERSION = "v1.0.0";

async function loadSources(): Promise<Source[]> {
  const raw = await readFile(SOURCES_PATH, "utf-8");
  const file: SourcesFile = JSON.parse(raw);
  return file.sources;
}

function findChecker(source: Source): PlatformChecker | undefined {
  return CHECKERS.find((checker) => checker.canMonitor(source));
}

function unmonitoredSnapshot(source: Source, last_checked_at: string): SnapshotItem {
  return {
    source_id: source.id,
    last_checked_at,
    platform: source.platform,
    status: "unmonitored",
    // `null` (not 0) — this source was never checked, so it has no real
    // score. `confidenceTier(null) === "no-data"` keeps it out of the
    // "Rendah" bucket and out of AVG SCORE. See score.ts confidenceTier.
    confidence_score: null,
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

  const by_tier = {
    high: 0,
    mid: 0,
    low: 0,
    "no-data": 0,
  } as Record<Tier, number>;

  for (const s of snapshots) {
    by_status[s.status]++;
    by_tier[confidenceTier(s.confidence_score)]++;
  }

  return {
    generated_at: new Date().toISOString(),
    version: SNAPSHOT_VERSION,
    total_sources: totalSources,
    monitored_sources: snapshots.filter((s) => s.status !== "unmonitored").length,
    by_status,
    by_tier,
    snapshots,
  };
}

function lastPostForLog(snapshot: SnapshotItem): string {
  return (snapshot.metrics as { last_post_at?: string | null }).last_post_at ?? "n/a";
}

function describeSource(source: Source): string {
  return source.handle ? `${source.handle} (${source.source_type})` : `${source.id} (${source.source_type})`;
}

async function delay(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function main() {
  console.log("[health-check] loading sources...");
  const sources = await loadSources();
  const monitoredSources = sources
    .map((source) => ({ source, checker: findChecker(source) }))
    .filter((entry): entry is { source: Source; checker: PlatformChecker } => entry.checker !== undefined);

  console.log(`[health-check] ${monitoredSources.length} sources to check with ${CHECKERS.length} checker(s)`);

  const snapshots: SnapshotItem[] = [];
  const checkedAtRunStart = new Date().toISOString();

  for (let i = 0; i < monitoredSources.length; i++) {
    const { source, checker } = monitoredSources[i];
    console.log(
      `[${i + 1}/${monitoredSources.length}] checking ${describeSource(source)} via ${checker.platform} checker...`
    );
    const snap = await checker.check(source);
    snapshots.push(snap);
    console.log(`  → status=${snap.status}, confidence=${snap.confidence_score}, last_post=${lastPostForLog(snap)}`);
    if (i < monitoredSources.length - 1) {
      await delay(checker.staggerMs ?? DEFAULT_STAGGER_MS);
    }
  }

  for (const source of sources) {
    if (!findChecker(source)) {
      snapshots.push(unmonitoredSnapshot(source, checkedAtRunStart));
    }
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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error("[health-check] FAILED:", err);
    process.exit(1);
  });
}
