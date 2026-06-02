import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

type CheckItem = { name: string; ok: boolean; details: string };

type MappedTopicInput = {
  topic_id: string;
  topic_title: string;
  last_post_at: string | null;
  status: "active" | "stale" | "dead" | "blocked" | "error";
  checks: CheckItem[];
  normalized_topic_title: string;
  ignored?: boolean;
  mapped: boolean;
  mapped_region: string | null;
  mapped_source_id: string | null;
};

type MappingArtifactInput = {
  generated_at: string;
  input_file: string;
  mapping_file: string;
  parent_source_id: string;
  summary: {
    total_topics: number;
    mapped_topics: number;
    ignored_topics?: number;
    unmapped_topics: number;
  };
  topics: MappedTopicInput[];
};

type EvaluatedTopic = MappedTopicInput & {
  evaluated_status: "active" | "stale" | "dead" | "blocked" | "ignored" | "error";
  evaluation_reason: string;
  freshness_age_hours: number | null;
};

type EvaluatedArtifact = {
  generated_at: string;
  source_artifact: string;
  policy: {
    active_lt_hours: number;
    stale_lt_hours: number;
    dead_gte_hours: number;
  };
  summary: {
    total_topics: number;
    active: number;
    stale: number;
    dead: number;
    blocked: number;
    ignored: number;
    error: number;
  };
  topics: EvaluatedTopic[];
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");

const INPUT_PATH = process.env.TG_MAPPED_INPUT_PATH ?? join(ROOT, "data", "spikes", "telegram-topic-freshness-mapped.json");
const OUTPUT_PATH = process.env.TG_EVAL_OUTPUT_PATH ?? join(ROOT, "data", "spikes", "telegram-topic-freshness-evaluated.json");

const HOURS = {
  ACTIVE_LT: 24 * 7,
  STALE_LT: 24 * 30,
  DEAD_GTE: 24 * 30,
};

function hoursSince(iso: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  return (Date.now() - t) / 3_600_000;
}

function evaluateTopic(topic: MappedTopicInput): EvaluatedTopic {
  const ageHours = hoursSince(topic.last_post_at);

  const hasFetchFailure = topic.checks.some((c) => c.name === "http_fetch" && !c.ok);
  if (hasFetchFailure) {
    return {
      ...topic,
      evaluated_status: "error",
      evaluation_reason: "http_fetch failed from source artifact checks",
      freshness_age_hours: ageHours,
    };
  }

  if (topic.ignored) {
    return {
      ...topic,
      evaluated_status: "ignored",
      evaluation_reason: "topic intentionally ignored by topic-region-map policy",
      freshness_age_hours: ageHours,
    };
  }

  if (!topic.mapped) {
    return {
      ...topic,
      evaluated_status: "blocked",
      evaluation_reason: "topic title not mapped to known region/source key",
      freshness_age_hours: ageHours,
    };
  }

  if (ageHours === null) {
    return {
      ...topic,
      evaluated_status: "blocked",
      evaluation_reason: "no last_post_at available from authenticated spike output",
      freshness_age_hours: null,
    };
  }

  if (ageHours < HOURS.ACTIVE_LT) {
    return {
      ...topic,
      evaluated_status: "active",
      evaluation_reason: `freshness within ${HOURS.ACTIVE_LT}h active threshold`,
      freshness_age_hours: Math.round(ageHours * 10) / 10,
    };
  }

  if (ageHours < HOURS.STALE_LT) {
    return {
      ...topic,
      evaluated_status: "stale",
      evaluation_reason: `freshness between ${HOURS.ACTIVE_LT}h and ${HOURS.STALE_LT}h`,
      freshness_age_hours: Math.round(ageHours * 10) / 10,
    };
  }

  return {
    ...topic,
    evaluated_status: "dead",
    evaluation_reason: `freshness >= ${HOURS.DEAD_GTE}h dead threshold`,
    freshness_age_hours: Math.round(ageHours * 10) / 10,
  };
}

async function main() {
  const raw = await readFile(INPUT_PATH, "utf-8");
  const input = JSON.parse(raw) as MappingArtifactInput;

  const topics = (input.topics ?? []).map(evaluateTopic);

  const summary = {
    total_topics: topics.length,
    active: topics.filter((t) => t.evaluated_status === "active").length,
    stale: topics.filter((t) => t.evaluated_status === "stale").length,
    dead: topics.filter((t) => t.evaluated_status === "dead").length,
    blocked: topics.filter((t) => t.evaluated_status === "blocked").length,
    ignored: topics.filter((t) => t.evaluated_status === "ignored").length,
    error: topics.filter((t) => t.evaluated_status === "error").length,
  };

  const out: EvaluatedArtifact = {
    generated_at: new Date().toISOString(),
    source_artifact: INPUT_PATH,
    policy: {
      active_lt_hours: HOURS.ACTIVE_LT,
      stale_lt_hours: HOURS.STALE_LT,
      dead_gte_hours: HOURS.DEAD_GTE,
    },
    summary,
    topics,
  };

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, JSON.stringify(out, null, 2), "utf-8");

  console.log("[track-b-eval] input:", INPUT_PATH);
  console.log("[track-b-eval] output:", OUTPUT_PATH);
  console.log("[track-b-eval] summary:", summary);
}

main().catch((err) => {
  console.error("[track-b-eval] FAILED:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
