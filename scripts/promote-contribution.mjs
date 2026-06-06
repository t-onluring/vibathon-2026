import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const DEFAULT_SOURCES_PATH = join(ROOT, "data", "sources.json");
const DEFAULT_ARCHIVE_DIR = join(ROOT, "data", "contributions", "archive", "promoted");

const SOURCES_PATH = process.env.SOURCES_PATH ?? DEFAULT_SOURCES_PATH;
const ARCHIVE_DIR = process.env.CONTRIBUTIONS_ARCHIVE_PROMOTED_DIR ?? DEFAULT_ARCHIVE_DIR;
const SKIP_VALIDATE_SOURCES = process.env.SKIP_VALIDATE_SOURCES === "1";

const ALLOWED_PLATFORMS = new Set(["tg", "yt", "ig", "web", "wa"]);
const ALLOWED_TYPES = new Set(["channel", "group", "topic", "site", "profile"]);
const REQUIRED_FIELDS = ["name", "platform", "source_type", "url", "handle", "region", "evidence_url", "submitted_by"];

function usage() {
  console.log(`Usage:\n  node scripts/promote-contribution.mjs <pending-file> [--dry-run|--apply]\n\nDefault mode is --dry-run. Use --apply to mutate data/sources.json and archive the pending file.`);
}

function displayPath(file) {
  const rel = relative(ROOT, file);
  return rel.startsWith("..") ? file : rel;
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
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

function canonicalSegment(value) {
  return String(value ?? "")
    .replace(/^@+/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function canonicalHandle(value) {
  return String(value ?? "").replace(/^@+/, "").trim().toLowerCase();
}

function stripPlatformPrefix(id, platform) {
  const prefix = `${platform}-`;
  return String(id ?? "").startsWith(prefix) ? String(id).slice(prefix.length) : String(id ?? "");
}

function generatedId(item) {
  if (item.source_type === "topic") {
    const parent = canonicalSegment(stripPlatformPrefix(item.parent_id, item.platform));
    return `${item.platform}-${parent}-topic-${item.topic_id}`;
  }
  return `${item.platform}-${canonicalSegment(item.handle)}`;
}

function buildNotes(item) {
  const parts = [];
  if (isNonEmptyString(item.notes)) parts.push(item.notes.trim().replace(/\s+$/g, ""));
  parts.push(`Submitted by ${item.submitted_by}.`);
  parts.push(`Evidence: ${item.evidence_url}.`);
  return parts.join(" ");
}

function buildSource(item, id) {
  const source = {
    id,
    name: item.name,
    platform: item.platform,
    url: item.url,
    handle: canonicalHandle(item.handle),
    region: item.region,
    language: item.language ?? "id",
    priority: typeof item.priority === "number" && Number.isFinite(item.priority) ? item.priority : 2,
    verified: typeof item.verified === "boolean" ? item.verified : false,
    added_at: item.added_at ?? todayDate(),
    notes: buildNotes(item),
    source_type: item.source_type,
  };

  if (Array.isArray(item.category)) source.category = [...item.category];
  if (Array.isArray(item.tags)) source.tags = [...item.tags];
  if (item.source_type === "topic") {
    source.parent_id = item.parent_id;
    source.topic_id = String(item.topic_id);
  }
  if (isNonEmptyString(item.partnership_status)) source.partnership_status = item.partnership_status;
  if (typeof item.has_api === "boolean") source.has_api = item.has_api;
  if (isNonEmptyString(item.monitor_status)) source.monitor_status = item.monitor_status;

  return source;
}

async function exists(path) {
  try {
    await readFile(path, "utf-8");
    return true;
  } catch {
    return false;
  }
}

async function loadPending(file) {
  const raw = await readFile(file, "utf-8");
  return JSON.parse(raw);
}

async function loadSourcesFile() {
  const raw = await readFile(SOURCES_PATH, "utf-8");
  return JSON.parse(raw);
}

function validatePreflight({ item, sources, id, archivePath }) {
  const errors = [];

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

  if (item.source_type === "topic") {
    if (!isNonEmptyString(item.parent_id)) errors.push("parent_id is required for source_type=topic");
    if (!isNonEmptyString(item.topic_id)) {
      errors.push("topic_id is required for source_type=topic");
    } else if (!/^\d+$/.test(String(item.topic_id))) {
      errors.push("topic_id must be numeric for source_type=topic");
    }
  }

  const ids = new Set(sources.map((source) => source.id));
  if (id && ids.has(id)) errors.push(`generated id '${id}' duplicates existing source`);

  const urlKey = String(item.url ?? "").toLowerCase();
  const duplicateUrl = sources.find((source) => String(source.url).toLowerCase() === urlKey);
  if (duplicateUrl) errors.push(`url duplicates existing source '${duplicateUrl.id}'`);

  if (item.source_type !== "topic") {
    const handleKey = `${item.platform}::${canonicalHandle(item.handle)}`;
    const duplicateHandle = sources.find((source) => source.source_type !== "topic" && `${source.platform}::${canonicalHandle(source.handle)}` === handleKey);
    if (duplicateHandle) errors.push(`handle duplicates existing source '${duplicateHandle.id}'`);
  }

  if (item.source_type === "topic" && isNonEmptyString(item.parent_id) && !ids.has(item.parent_id)) {
    errors.push(`parent_id '${item.parent_id}' does not exist in data/sources.json`);
  }

  if (archivePath) {
    // Checked asynchronously by caller before writes; this message is used for preview context only.
  }

  return errors;
}

function printPreview({ inputFile, sourcesFile, archivePath, source, mode }) {
  console.log(`[promote-contribution] mode: ${mode}`);
  console.log(`[promote-contribution] input: ${displayPath(inputFile)}`);
  console.log(`[promote-contribution] sources: ${displayPath(sourcesFile)}`);
  console.log(`[promote-contribution] archive: ${displayPath(archivePath)}`);
  console.log("[promote-contribution] proposed source:");
  console.log(JSON.stringify(source, null, 2));
}

function runValidateSources() {
  if (SKIP_VALIDATE_SOURCES) {
    console.warn("⚠️ Skipping validate:sources because SKIP_VALIDATE_SOURCES=1");
    return;
  }

  const result = spawnSync(process.execPath, [join(ROOT, "scripts", "validate-sources.mjs")], {
    cwd: ROOT,
    env: { ...process.env, STRICT_TOPIC_ID: "1", SOURCES_PATH },
    encoding: "utf-8",
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) {
    throw new Error(`validate-sources failed with exit code ${result.status}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    usage();
    return;
  }

  const apply = args.includes("--apply");
  const dryRun = args.includes("--dry-run") || !apply;
  const positional = args.filter((arg) => !arg.startsWith("--"));
  const inputFile = positional[0] ? resolve(positional[0]) : null;

  if (!inputFile) {
    usage();
    throw new Error("pending-file argument is required");
  }

  if (apply && args.includes("--dry-run")) {
    throw new Error("Use either --dry-run or --apply, not both");
  }

  const [item, sourcesFile] = await Promise.all([loadPending(inputFile), loadSourcesFile()]);
  const sources = Array.isArray(sourcesFile.sources) ? sourcesFile.sources : [];
  const id = generatedId(item);
  const source = buildSource(item, id);
  const archivePath = join(ARCHIVE_DIR, basename(inputFile));

  const errors = validatePreflight({ item, sources, id, archivePath });
  if (await exists(archivePath)) errors.push(`archive target already exists: ${displayPath(archivePath)}`);

  if (errors.length > 0) {
    console.error("❌ Cannot promote contribution:");
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }

  printPreview({ inputFile, sourcesFile: SOURCES_PATH, archivePath, source, mode: dryRun ? "dry-run" : "apply" });

  if (dryRun) {
    console.log("[promote-contribution] dry-run complete; no files changed. Re-run with --apply to mutate.");
    return;
  }

  const nextSourcesFile = {
    ...sourcesFile,
    updated_at: todayDate(),
    sources: [...sources, source],
  };

  await mkdir(dirname(SOURCES_PATH), { recursive: true });
  await mkdir(ARCHIVE_DIR, { recursive: true });
  await writeFile(SOURCES_PATH, `${JSON.stringify(nextSourcesFile, null, 2)}\n`, "utf-8");
  await rename(inputFile, archivePath);

  runValidateSources();

  console.log("[promote-contribution] applied:", {
    source_id: source.id,
    total_sources: nextSourcesFile.sources.length,
    archived_to: displayPath(archivePath),
  });
}

main().catch((err) => {
  console.error(`❌ ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
