import { readFile } from "node:fs/promises";
import { URL } from "node:url";

const ALLOWED_PLATFORMS = new Set(["telegram", "instagram", "facebook", "whatsapp", "website", "youtube"]);
const ALLOWED_PRIORITIES = new Set(["high", "medium", "low", "archived"]);
const REQUIRED_FIELDS = ["id", "name", "platform", "url", "handle", "category", "region", "priority", "added_at"];

function fail(msg) {
  console.error(`❌ ${msg}`);
  process.exitCode = 1;
}

function ok(msg) {
  console.log(`✅ ${msg}`);
}

function isValidDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(new Date(value).getTime());
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
  const seenUrls = new Set();
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

    if (!isValidUrl(s.url)) {
      fail(`${where}.url '${s.url}' must be valid http/https URL`);
    } else {
      const key = String(s.url).trim().toLowerCase();
      if (seenUrls.has(key)) fail(`${where}.url '${s.url}' is duplicated`);
      seenUrls.add(key);
    }

    if (typeof s.handle !== "string" || s.handle.trim() === "") {
      fail(`${where}.handle must be non-empty string`);
    } else {
      const key = `${String(s.platform).toLowerCase()}::${s.handle.toLowerCase()}`;
      if (seenHandlePlatform.has(key)) {
        fail(`${where}.handle '${s.handle}' duplicated for platform '${s.platform}'`);
      }
      seenHandlePlatform.add(key);
    }

    if (!Array.isArray(s.category) || s.category.length === 0 || s.category.some((v) => typeof v !== "string" || v.trim() === "")) {
      fail(`${where}.category must be non-empty string array`);
    }

    if (typeof s.region !== "string" || s.region.trim() === "") {
      fail(`${where}.region must be non-empty string`);
    }

    if (!ALLOWED_PRIORITIES.has(s.priority)) {
      fail(`${where}.priority '${s.priority}' is invalid`);
    }

    if (!isValidDate(s.added_at)) {
      fail(`${where}.added_at '${s.added_at}' must be YYYY-MM-DD`);
    }
  });

  if (process.exitCode === 1) return;
  ok(`Validated ${data.sources.length} sources`);
}

main().catch((err) => {
  fail(err instanceof Error ? err.message : String(err));
});
