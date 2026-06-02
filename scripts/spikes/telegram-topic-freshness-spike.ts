import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { Api } from "telegram/tl";

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
  source: {
    source_id: string;
    handle: string;
    mode: "mtproto-auth-spike";
  };
  auth: {
    method: "mtproto";
    has_api_id: boolean;
    has_api_hash: boolean;
    has_session_string: boolean;
  };
  run: {
    status: "ok" | "blocked" | "error" | "needs_setup";
    message: string;
  };
  topics: TopicFreshnessItem[];
};

type TelegramEntity = Parameters<TelegramClient["iterMessages"]>[0];

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const OUTPUT_PATH = process.env.SPIKE_OUTPUT_PATH ?? join(ROOT, "data", "spikes", "telegram-topic-freshness.json");

const HOURS = {
  ACTIVE: 24 * 7,
  STALE: 24 * 30,
};

function classifyFreshness(lastPostAt: string | null): "active" | "stale" | "dead" | "blocked" {
  if (!lastPostAt) return "blocked";
  const age = (Date.now() - new Date(lastPostAt).getTime()) / 3_600_000;
  if (!Number.isFinite(age)) return "blocked";
  if (age < HOURS.ACTIVE) return "active";
  if (age < HOURS.STALE) return "stale";
  return "dead";
}

function toIso(value: unknown): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(String(value));
  return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function getNumber(value: unknown, key: string): number {
  const n = Number(asRecord(value)[key] ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function getString(value: unknown, key: string, fallback: string): string {
  const v = asRecord(value)[key];
  return typeof v === "string" ? v : fallback;
}

function newestIso(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return new Date(a).getTime() >= new Date(b).getTime() ? a : b;
}

async function getLatestReplyDate(client: TelegramClient, entity: TelegramEntity, topMessageId: number): Promise<string | null> {
  if (!Number.isFinite(topMessageId) || topMessageId <= 0) return null;

  try {
    for await (const msg of client.iterMessages(entity, { replyTo: topMessageId, limit: 1 })) {
      return toIso(asRecord(msg).date);
    }
  } catch {
    return null;
  }

  return null;
}

async function fetchForumTopicFreshness(client: TelegramClient, handle: string): Promise<TopicFreshnessItem[]> {
  const entity = await client.getEntity(handle.startsWith("@") ? handle : `@${handle}`);

  const res = await client.invoke(
    new Api.channels.GetForumTopics({
      channel: entity as unknown as Api.TypeInputChannel,
      offsetDate: 0,
      offsetId: 0,
      offsetTopic: 0,
      limit: 100,
    })
  );

  const topicsRaw = asRecord(res).topics ?? [];
  if (!Array.isArray(topicsRaw) || topicsRaw.length === 0) {
    return [];
  }

  const rootMessagesRaw = asRecord(res).messages ?? [];
  const rootMessageDateById = new Map<number, string | null>();
  if (Array.isArray(rootMessagesRaw)) {
    for (const msg of rootMessagesRaw) {
      const id = getNumber(msg, "id");
      if (!id) continue;
      rootMessageDateById.set(id, toIso(asRecord(msg).date));
    }
  }

  const topMessageIds = topicsRaw
    .map((t) => getNumber(t, "topMessage"))
    .filter((id: number) => Number.isFinite(id) && id > 0);

  const topMessageDateById = new Map<number, string | null>(rootMessageDateById);
  if (topMessageIds.length > 0) {
    try {
      const messages = await client.getMessages(entity, { ids: topMessageIds });
      const arr = Array.isArray(messages) ? messages : [messages];
      for (const msg of arr) {
        const id = getNumber(msg, "id");
        if (!id) continue;
        topMessageDateById.set(id, toIso(asRecord(msg).date));
      }
    } catch {
      // keep empty map; topic checks will explain missing date
    }
  }

  const topics: TopicFreshnessItem[] = [];

  for (const t of topicsRaw) {
    const rawTopicId = getNumber(t, "id");
    const topicId = rawTopicId ? String(rawTopicId) : "unknown-topic-id";
    const topicTitle = getString(t, "title", `Topic ${topicId}`);
    const topMessageId = getNumber(t, "topMessage");
    const topMessageDate = topMessageDateById.get(topMessageId) ?? null;
    const latestReplyDate = await getLatestReplyDate(client, entity, topMessageId);
    const lastPostAt = newestIso(latestReplyDate, topMessageDate);
    const status = classifyFreshness(lastPostAt);

    const checks: CheckItem[] = [
      {
        name: "auth_bootstrap",
        ok: true,
        details: "Authenticated MTProto session connected.",
      },
      {
        name: "forum_topics_fetch",
        ok: true,
        details: `Forum topic metadata loaded for ${topicTitle} (id=${topicId}).`,
      },
      {
        name: "freshness",
        ok: lastPostAt !== null,
        details:
          latestReplyDate !== null
            ? `Last post timestamp resolved from latest reply in topic topMessage id=${topMessageId}.`
            : topMessageDate !== null
              ? `Last post timestamp resolved from root topMessage id=${topMessageId}; no newer reply timestamp found.`
              : "No resolvable last_post_at from topic replies or topMessage in this run.",
      },
    ];

    topics.push({
      topic_id: topicId,
      topic_title: topicTitle,
      last_post_at: lastPostAt,
      status,
      checks,
    });
  }

  return topics;
}

async function main() {
  const handle = process.env.TG_TARGET_HANDLE ?? "sijadwalkajian";
  const sourceId = process.env.TG_TARGET_SOURCE_ID ?? "tg-sijadwalkajian";

  const hasApiId = Boolean(process.env.TG_API_ID);
  const hasApiHash = Boolean(process.env.TG_API_HASH);
  const hasSession = Boolean(process.env.TG_SESSION_STRING);

  const ready = hasApiId && hasApiHash && hasSession;

  if (!ready) {
    const artifact: SpikeArtifact = {
      generated_at: new Date().toISOString(),
      source: { source_id: sourceId, handle, mode: "mtproto-auth-spike" },
      auth: {
        method: "mtproto",
        has_api_id: hasApiId,
        has_api_hash: hasApiHash,
        has_session_string: hasSession,
      },
      run: {
        status: "needs_setup",
        message: "Missing one or more required secrets (TG_API_ID, TG_API_HASH, TG_SESSION_STRING).",
      },
      topics: [],
    };

    await mkdir(dirname(OUTPUT_PATH), { recursive: true });
    await writeFile(OUTPUT_PATH, JSON.stringify(artifact, null, 2), "utf-8");

    console.log("[track-b-spike] wrote artifact:", OUTPUT_PATH);
    console.log("[track-b-spike] run status:", artifact.run.status);
    console.log("[track-b-spike] message:", artifact.run.message);
    return;
  }

  const apiId = Number(process.env.TG_API_ID);
  const apiHash = String(process.env.TG_API_HASH);
  const sessionString = String(process.env.TG_SESSION_STRING);

  const client = new TelegramClient(new StringSession(sessionString), apiId, apiHash, {
    connectionRetries: 2,
  });

  let artifact: SpikeArtifact;

  try {
    await client.connect();
    const topics = await fetchForumTopicFreshness(client, handle);

    const hasAnyTopic = topics.length > 0;
    const hasAnyTimestamp = topics.some((t) => t.last_post_at !== null);

    artifact = {
      generated_at: new Date().toISOString(),
      source: { source_id: sourceId, handle, mode: "mtproto-auth-spike" },
      auth: {
        method: "mtproto",
        has_api_id: true,
        has_api_hash: true,
        has_session_string: true,
      },
      run: hasAnyTopic
        ? hasAnyTimestamp
          ? {
              status: "ok",
              message: `Fetched ${topics.length} forum topics and resolved freshness timestamps for ${topics.filter((t) => t.last_post_at !== null).length}.`,
            }
          : {
              status: "blocked",
              message: `Fetched ${topics.length} forum topics but no last_post_at timestamps could be resolved in this run.`,
            }
        : {
            status: "blocked",
            message: "No forum topics were returned from Telegram for the target handle.",
          },
      topics,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    artifact = {
      generated_at: new Date().toISOString(),
      source: { source_id: sourceId, handle, mode: "mtproto-auth-spike" },
      auth: {
        method: "mtproto",
        has_api_id: true,
        has_api_hash: true,
        has_session_string: true,
      },
      run: {
        status: "error",
        message,
      },
      topics: [
        {
          topic_id: "__run__",
          topic_title: "Run Error",
          last_post_at: null,
          status: "error",
          checks: [
            { name: "auth_bootstrap", ok: false, details: message },
            { name: "topic_fetch", ok: false, details: "Topic retrieval failed." },
          ],
        },
      ],
    };
  } finally {
    await client.disconnect().catch(() => undefined);
  }

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, JSON.stringify(artifact, null, 2), "utf-8");

  console.log("[track-b-spike] wrote artifact:", OUTPUT_PATH);
  console.log("[track-b-spike] run status:", artifact.run.status);
  console.log("[track-b-spike] message:", artifact.run.message);
  console.log("[track-b-spike] topics:", artifact.topics.length);
}

main().catch((err) => {
  console.error("[track-b-spike] FAILED:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
