import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import type { Platform, HealthStatus, Source } from "../../shared/types";

const ROOT = process.cwd();
const DOCS_DIR = join(ROOT, "data", "docs");
const SOURCES_PATH = join(ROOT, "data", "sources.json");
const LATEST_PATH = join(ROOT, "data", "latest.json");

export type { Platform, HealthStatus, Priority, Source } from "../../shared/types";

export interface CheckItem {
  name: string;
  ok: boolean;
  details: string;
}

export interface Snapshot {
  source_id: string;
  last_checked_at: string;
  platform: Platform;
  status: HealthStatus;
  confidence_score: number;
  checks: CheckItem[];
  metrics: {
    subscribers?: number | null;
    last_post_at?: string | null;
    last_post_age_hours?: number | null;
  };
  error?: string;
}

export interface LatestSummary {
  generated_at: string;
  version: string;
  total_sources: number;
  monitored_sources: number;
  by_status: Record<HealthStatus, number>;
  snapshots: Snapshot[];
}

export interface DocFile {
  slug: string;
  title: string;
  content: string;
}

function normalizeSnapshot(raw: any): Snapshot {
  const confidence = typeof raw?.confidence_score === "number"
    ? raw.confidence_score
    : typeof raw?.reliability_score === "number"
      ? raw.reliability_score > 1 ? raw.reliability_score / 100 : raw.reliability_score
      : 0;

  return {
    source_id: String(raw?.source_id ?? ""),
    last_checked_at: String(raw?.last_checked_at ?? raw?.checked_at ?? ""),
    platform: raw?.platform,
    status: raw?.status ?? "unmonitored",
    confidence_score: confidence,
    checks: Array.isArray(raw?.checks) ? raw.checks : [],
    metrics: raw?.metrics ?? {},
    error: typeof raw?.error === "string" ? raw.error : undefined,
  };
}

function normalizeLatest(raw: any): LatestSummary | null {
  if (!raw || !Array.isArray(raw.snapshots)) return null;

  const snapshots: Snapshot[] = raw.snapshots.map((item: unknown) => normalizeSnapshot(item));
  const monitored_sources = typeof raw?.monitored_sources === "number"
    ? raw.monitored_sources
    : typeof raw?.monitored === "number"
      ? raw.monitored
      : snapshots.filter((s: Snapshot) => s.status !== "unmonitored").length;

  const by_status: Record<HealthStatus, number> = {
    active: raw?.by_status?.active ?? 0,
    stale: raw?.by_status?.stale ?? 0,
    dead: raw?.by_status?.dead ?? 0,
    blocked: raw?.by_status?.blocked ?? 0,
    error: raw?.by_status?.error ?? 0,
    unmonitored: raw?.by_status?.unmonitored ?? 0,
  };

  return {
    generated_at: String(raw.generated_at ?? ""),
    version: String(raw.version ?? "v1.0.0"),
    total_sources: typeof raw.total_sources === "number" ? raw.total_sources : snapshots.length,
    monitored_sources,
    by_status,
    snapshots,
  };
}

export async function loadDocs(): Promise<DocFile[]> {
  let entries: string[] = [];
  try {
    entries = await readdir(DOCS_DIR);
  } catch {
    return [];
  }

  const sorted = entries
    .filter((f) => f.endsWith(".md"))
    .sort((a, b) => a.localeCompare(b));

  const docs: DocFile[] = [];
  for (const filename of sorted) {
    try {
      const content = await readFile(join(DOCS_DIR, filename), "utf-8");
      const titleMatch = content.match(/^#\s+(.+)$/m);
      docs.push({
        slug: filename.replace(/\.md$/, ""),
        title: titleMatch ? titleMatch[1].trim() : filename,
        content,
      });
    } catch {
      continue;
    }
  }
  return docs;
}

export async function loadSources(): Promise<Source[]> {
  try {
    const raw = await readFile(SOURCES_PATH, "utf-8");
    const json = JSON.parse(raw) as { sources: Source[] };
    return json.sources;
  } catch {
    return [];
  }
}

export async function loadLatest(): Promise<LatestSummary | null> {
  try {
    const raw = await readFile(LATEST_PATH, "utf-8");
    return normalizeLatest(JSON.parse(raw));
  } catch {
    return null;
  }
}
