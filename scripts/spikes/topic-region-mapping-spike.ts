import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

type CheckItem = { name: string; ok: boolean; details: string };

type TopicFreshnessItem = {
  topic_id: string;
  topic_title: string;
  last_post_at: string | null;
  status: "active" | "stale" | "dead" | "blocked" | "error";
  checks: CheckItem[];
};

type SpikeArtifact = {
  generated_at: string;
  source: { source_id: string; handle: string; mode: string };
  auth: Record<string, unknown>;
  run: { status: string; message: string };
  topics: TopicFreshnessItem[];
};

type MappingRule = {
  topic_title: string;
  region: string;
  source_id: string;
};

type MappingFile = {
  version: string;
  updated_at: string;
  parent_source_id: string;
  match_mode: string;
  ignored_topic_titles?: string[];
  rules: MappingRule[];
};

type MappedTopic = TopicFreshnessItem & {
  normalized_topic_title: string;
  ignored: boolean;
  mapped: boolean;
  mapped_region: string | null;
  mapped_source_id: string | null;
};

type MappingArtifact = {
  generated_at: string;
  input_file: string;
  mapping_file: string;
  parent_source_id: string;
  summary: {
    total_topics: number;
    mapped_topics: number;
    ignored_topics: number;
    unmapped_topics: number;
  };
  topics: MappedTopic[];
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");

const INPUT_PATH = process.env.TG_SPIKE_INPUT_PATH ?? join(ROOT, "data", "spikes", "telegram-topic-freshness.json");
const MAP_PATH = process.env.TG_TOPIC_MAP_PATH ?? join(ROOT, "data", "spikes", "topic-region-map.json");
const OUTPUT_PATH = process.env.TG_MAPPING_OUTPUT_PATH ?? join(ROOT, "data", "spikes", "telegram-topic-freshness-mapped.json");

function normalizeTopicTitle(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildRuleMap(rules: MappingRule[]): Map<string, MappingRule> {
  const m = new Map<string, MappingRule>();
  for (const rule of rules) {
    m.set(normalizeTopicTitle(rule.topic_title), rule);
  }
  return m;
}

function buildIgnoredSet(topicTitles: string[] = []): Set<string> {
  return new Set(topicTitles.map(normalizeTopicTitle));
}

async function main() {
  const inputRaw = await readFile(INPUT_PATH, "utf-8");
  const mapRaw = await readFile(MAP_PATH, "utf-8");

  const input = JSON.parse(inputRaw) as SpikeArtifact;
  const mapping = JSON.parse(mapRaw) as MappingFile;

  const ruleMap = buildRuleMap(mapping.rules);
  const ignoredSet = buildIgnoredSet(mapping.ignored_topic_titles);

  const topics: MappedTopic[] = (input.topics ?? []).map((topic) => {
    const normalized = normalizeTopicTitle(topic.topic_title || "");
    const rule = ruleMap.get(normalized);
    const ignored = ignoredSet.has(normalized);

    return {
      ...topic,
      normalized_topic_title: normalized,
      ignored,
      mapped: !ignored && Boolean(rule),
      mapped_region: ignored ? null : rule?.region ?? null,
      mapped_source_id: ignored ? null : rule?.source_id ?? null,
    };
  });

  const mappedCount = topics.filter((t) => t.mapped).length;
  const ignoredCount = topics.filter((t) => t.ignored).length;

  const output: MappingArtifact = {
    generated_at: new Date().toISOString(),
    input_file: INPUT_PATH,
    mapping_file: MAP_PATH,
    parent_source_id: mapping.parent_source_id,
    summary: {
      total_topics: topics.length,
      mapped_topics: mappedCount,
      ignored_topics: ignoredCount,
      unmapped_topics: topics.length - mappedCount - ignoredCount,
    },
    topics,
  };

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, JSON.stringify(output, null, 2), "utf-8");

  console.log("[track-b-map] input:", INPUT_PATH);
  console.log("[track-b-map] map:", MAP_PATH);
  console.log("[track-b-map] output:", OUTPUT_PATH);
  console.log("[track-b-map] summary:", output.summary);
}

main().catch((err) => {
  console.error("[track-b-map] FAILED:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
