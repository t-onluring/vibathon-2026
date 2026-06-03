import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SOURCES_PATH = join(ROOT, "data", "sources.json");
const LATEST_PATH = join(ROOT, "data", "latest.json");
const OUTPUT_DIR = join(ROOT, "public", "v1");

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf-8"));
}

async function writeJson(filename, value) {
  await writeFile(join(OUTPUT_DIR, filename), stableJson(value), "utf-8");
}

const sourcesDoc = await readJson(SOURCES_PATH);
const latestDoc = await readJson(LATEST_PATH);

if (!Array.isArray(sourcesDoc.sources)) {
  throw new Error("data/sources.json must contain sources[]");
}

if (!Array.isArray(latestDoc.snapshots)) {
  throw new Error("data/latest.json must contain snapshots[]");
}

const sourcesById = new Map(sourcesDoc.sources.map((source) => [source.id, source]));
const activeSnapshots = latestDoc.snapshots.filter((snapshot) => snapshot.status === "active");
const activeSources = activeSnapshots
  .map((snapshot) => sourcesById.get(snapshot.source_id))
  .filter(Boolean);

const activeDoc = {
  generated_at: latestDoc.generated_at,
  version: latestDoc.version,
  total_sources: activeSources.length,
  sources: activeSources,
};

await mkdir(OUTPUT_DIR, { recursive: true });
await writeJson("sources.json", sourcesDoc);
await writeJson("latest.json", latestDoc);
await writeJson("active.json", activeDoc);

console.log(`[generate-api] wrote ${join("public", "v1", "sources.json")}`);
console.log(`[generate-api] wrote ${join("public", "v1", "latest.json")}`);
console.log(`[generate-api] wrote ${join("public", "v1", "active.json")}`);
