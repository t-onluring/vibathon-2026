import { readFile } from "node:fs/promises";
import { URL } from "node:url";

const ALLOWED_PLATFORMS = new Set(["tg", "yt", "ig", "web", "wa"]);
const REQUIRED_FIELDS = ["id", "name", "platform", "source_type", "url", "handle", "region", "priority", "added_at"];

function fail(msg) {
  console.error(`❌ ${msg}`);
  process.exitCode = 1;
}

function ok(msg) {
  console.log(`✅ ${msg}`);
}

function isValidDateOrDateTime(value) {
  if (typeof value !== "string") return false;
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/;
  const isoDateTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/;
  return (dateOnly.test(value) || isoDateTime.test(value)) && Number.isFinite(new Date(value).getTime());
}

function isValidUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

async function main() {
  const fileUrl = new URL("../data/sources.json", import.meta.url);
  const raw = await readFile(fileUrl, "utf-8");
  const data = JSON.parse(raw);

  if (!Array.isArray(data.sources)) {
    fail("data/sources.json must have top-level 'sources' array");
    return;
  }

  const seenIds = new Set();
  const seenHandlePlatform = new Set();

  data.sources.forEach((s, idx) => {
    const where = `sources[${idx}]`;

    for (const f of REQUIRED_FIELDS) {
      if (!(f in s)) fail(`${where} missing required field '${f}'`);
    }

    if (typeof s.id !== "string" || s.id.trim() === "") {
      fail(`${where}.id must be non-empty string`);
    } else if (seenIds.has(s.id)) {
      fail(`${where}.id '${s.id}' is duplicated`);
    } else {
      seenIds.add(s.id);
    }

    if (typeof s.name !== "string" || s.name.trim() === "") {
      fail(`${where}.name must be non-empty string`);
    }

    if (!ALLOWED_PLATFORMS.has(s.platform)) {
      fail(`${where}.platform '${s.platform}' is invalid`);
    }

    if (typeof s.id === "string" && typeof s.platform === "string" && !s.id.startsWith(`${s.platform}-`)) {
      fail(`${where}.id '${s.id}' must start with '${s.platform}-'`);
    }

    if (!isValidUrl(s.url)) {
      fail(`${where}.url '${s.url}' must be valid http/https URL`);
    }

    if (typeof s.handle !== "string" || s.handle.trim() === "") {
      fail(`${where}.handle must be non-empty string`);
    } else {
      const key = `${String(s.platform).toLowerCase()}::${String(s.handle).toLowerCase()}`;
      if (s.source_type !== "topic" && seenHandlePlatform.has(key)) {
        fail(`${where}.handle '${s.handle}' duplicated for platform '${s.platform}'`);
      }
      seenHandlePlatform.add(key);
    }

    if (typeof s.region !== "string" || s.region.trim() === "") {
      fail(`${where}.region must be non-empty string`);
    }

    if (typeof s.priority !== "number" || !Number.isFinite(s.priority)) {
      fail(`${where}.priority must be a number`);
    }

    if (!isValidDateOrDateTime(s.added_at)) {
      fail(`${where}.added_at '${s.added_at}' must be YYYY-MM-DD or ISO datetime`);
    }

    if (s.source_type === "topic") {
      if (typeof s.parent_id !== "string" || s.parent_id.trim() === "") {
        fail(`${where}.parent_id is required for source_type=topic`);
      }
      if (typeof s.topic_id !== "string" || s.topic_id.trim() === "") {
        fail(`${where}.topic_id is required for source_type=topic`);
      }
    }
  });

  const ids = new Set(data.sources.map((s) => s.id));
  data.sources.forEach((s, idx) => {
    if (s.source_type === "topic" && !ids.has(s.parent_id)) {
      fail(`sources[${idx}].parent_id '${s.parent_id}' not found in sources.id`);
    }
  });

  if (process.exitCode === 1) return;
  ok(`Validated ${data.sources.length} sources`);
}

main().catch((err) => {
  fail(err instanceof Error ? err.message : String(err));
});
