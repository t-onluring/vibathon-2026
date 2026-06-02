import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import type { Platform, HealthStatus, Source } from "../../shared/types";

const ROOT = process.cwd();
const DOCS_DIR = join(ROOT, "data", "docs");
const SOURCES_PATH = join(ROOT, "data", "sources.json");
const LATEST_PATH = join(ROOT, "data", "latest.json");

export type { Platform, HealthStatus, Priority, Source } from "../../shared/types";

export interface Snapshot {
  source_id: string;
  last_checked_at: string;
  platform: Platform;
  status: HealthStatus;
  confidence_score: number;
  checks: {
    name: string;
    ok: boolean;
    details: string;
  }[];
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
    return JSON.parse(raw) as LatestSummary;
  } catch {
    return null;
  }
}
