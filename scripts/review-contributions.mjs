import { readdir, readFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const DEFAULT_PENDING_DIR = join(ROOT, "data", "contributions", "pending");
const DEFAULT_SOURCES_PATH = join(ROOT, "data", "sources.json");

const PENDING_DIR = process.env.CONTRIBUTIONS_PENDING_DIR ?? DEFAULT_PENDING_DIR;
const SOURCES_PATH = process.env.SOURCES_PATH ?? DEFAULT_SOURCES_PATH;

const ALLOWED_PLATFORMS = new Set(["tg", "yt", "ig", "web", "wa"]);
const ALLOWED_TYPES = new Set(["channel", "group", "topic", "site", "profile"]);
const REQUIRED_FIELDS = ["name", "platform", "source_type", "url", "handle", "region", "evidence_url", "submitted_by"];

function displayPath(file) {
  const rel = relative(ROOT, file);
  return rel.startsWith("..") ? file : rel;
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}

function isValidHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function canonicalHandle(value) {
  return String(value ?? "").replace(/^@+/, "").trim().toLowerCase();
}

async function listPendingFiles() {
  let entries = [];
  try {
    entries = await readdir(PENDING_DIR);
  } catch {
    return [];
  }

  return entries
    .filter((entry) => entry.endsWith(".json"))
    .sort((a, b) => a.localeCompare(b))
    .map((entry) => join(PENDING_DIR, entry));
}

async function loadSources() {
  const raw = await readFile(SOURCES_PATH, "utf-8");
  const sourcesFile = JSON.parse(raw);
  return Array.isArray(sourcesFile.sources) ? sourcesFile.sources : [];
}

function validateContribution({ item, file, existingUrls, existingHandlePlatform, existingIds, seenUrls, seenHandlePlatform }) {
  const rel = displayPath(file);
  const errors = [];
  const warnings = [];

  for (const field of REQUIRED_FIELDS) {
    if (!isNonEmptyString(item[field])) errors.push(`missing required string field '${field}'`);
  }

  if (!ALLOWED_PLATFORMS.has(item.platform)) errors.push(`platform '${item.platform}' is invalid`);
  if (!ALLOWED_TYPES.has(item.source_type)) errors.push(`source_type '${item.source_type}' is invalid`);
  if (!isValidHttpUrl(item.url)) errors.push("url must be valid http/https URL");
  if (!isValidHttpUrl(item.evidence_url)) errors.push("evidence_url must be valid http/https URL");

  if (item.category !== undefined && (!Array.isArray(item.category) || item.category.some((value) => !isNonEmptyString(value)))) {
    errors.push("category must be an array of non-empty strings when provided");
  }

  if (item.tags !== undefined && (!Array.isArray(item.tags) || item.tags.some((value) => !isNonEmptyString(value)))) {
    errors.push("tags must be an array of non-empty strings when provided");
  }

  const urlKey = String(item.url ?? "").toLowerCase();
  if (urlKey && existingUrls.has(urlKey)) errors.push(`url duplicates existing source '${existingUrls.get(urlKey)}'`);
  if (urlKey && seenUrls.has(urlKey)) errors.push(`url duplicates pending contribution '${seenUrls.get(urlKey)}'`);
  if (urlKey) seenUrls.set(urlKey, rel);

  const handleKey = `${item.platform}::${canonicalHandle(item.handle)}`;
  if (item.source_type !== "topic") {
    if (existingHandlePlatform.has(handleKey)) errors.push(`handle duplicates existing source '${existingHandlePlatform.get(handleKey)}'`);
    if (seenHandlePlatform.has(handleKey)) errors.push(`handle duplicates pending contribution '${seenHandlePlatform.get(handleKey)}'`);
    seenHandlePlatform.set(handleKey, rel);
  }

  if (item.source_type === "topic") {
    if (!isNonEmptyString(item.parent_id)) errors.push("parent_id is required for source_type=topic");
    if (!isNonEmptyString(item.topic_id)) {
      errors.push("topic_id is required for source_type=topic");
    } else if (!/^\d+$/.test(item.topic_id)) {
      errors.push("topic_id must be numeric for source_type=topic");
    }
    if (isNonEmptyString(item.parent_id) && !existingIds.has(item.parent_id)) {
      errors.push(`parent_id '${item.parent_id}' does not exist in data/sources.json`);
    }
  }

  if (!item.category) warnings.push("category not provided; promote script will omit it");
  if (!item.tags) warnings.push("tags not provided; promote script will omit them");

  return { rel, errors, warnings, readiness: errors.length === 0 ? "ready" : "blocked" };
}

function printReview({ file, item, result }) {
  console.log(`\n- ${displayPath(file)}`);
  console.log(`  name: ${item.name ?? "(missing)"}`);
  console.log(`  platform/type: ${item.platform ?? "?"}/${item.source_type ?? "?"}`);
  console.log(`  region: ${item.region ?? "(missing)"}`);
  if (item.source_type === "topic") {
    console.log(`  parent/topic: ${item.parent_id ?? "(missing)"}/${item.topic_id ?? "(missing)"}`);
  }
  console.log(`  evidence: ${isValidHttpUrl(item.evidence_url) ? "ok" : "invalid"}`);
  console.log(`  readiness: ${result.readiness}`);

  for (const warning of result.warnings) console.log(`  ⚠️ ${warning}`);
  for (const error of result.errors) console.log(`  ❌ ${error}`);
}

async function main() {
  const sources = await loadSources();
  const existingUrls = new Map(sources.map((source) => [String(source.url).toLowerCase(), source.id]));
  const existingHandlePlatform = new Map(
    sources.map((source) => [`${source.platform}::${canonicalHandle(source.handle)}`, source.id])
  );
  const existingIds = new Set(sources.map((source) => source.id));
  const seenUrls = new Map();
  const seenHandlePlatform = new Map();

  const files = await listPendingFiles();
  if (files.length === 0) {
    console.warn("⚠️ No pending contribution JSON files found");
    return;
  }

  console.log(`Pending contributions: ${files.length}`);
  let invalid = 0;

  for (const file of files) {
    let item;
    try {
      item = JSON.parse(await readFile(file, "utf-8"));
    } catch (err) {
      invalid += 1;
      console.log(`\n- ${displayPath(file)}`);
      console.log(`  readiness: blocked`);
      console.log(`  ❌ invalid JSON: ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }

    const result = validateContribution({
      item,
      file,
      existingUrls,
      existingHandlePlatform,
      existingIds,
      seenUrls,
      seenHandlePlatform,
    });
    if (result.errors.length > 0) invalid += 1;
    printReview({ file, item, result });
  }

  if (invalid > 0) {
    console.error(`\n❌ ${invalid} pending contribution file(s) need attention`);
    process.exitCode = 1;
    return;
  }

  console.log(`\n✅ ${files.length} pending contribution file(s) ready`);
}

main().catch((err) => {
  console.error(`❌ ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
