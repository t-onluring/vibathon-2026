import { readFile } from "node:fs/promises";
import { URL } from "node:url";

function fail(msg) {
  console.error(`❌ ${msg}`);
  process.exitCode = 1;
}

function ok(msg) {
  console.log(`✅ ${msg}`);
}

async function main() {
  const sourcesRaw = await readFile(new URL("../data/sources.json", import.meta.url), "utf-8");
  const latestRaw = await readFile(new URL("../data/latest.json", import.meta.url), "utf-8");

  const sourcesDoc = JSON.parse(sourcesRaw);
  const latestDoc = JSON.parse(latestRaw);

  if (!Array.isArray(sourcesDoc.sources)) {
    fail("data/sources.json must contain a top-level sources[] array");
    return;
  }

  if (!Array.isArray(latestDoc.snapshots)) {
    fail("data/latest.json must contain snapshots[] array");
    return;
  }

  const ids = new Set(sourcesDoc.sources.map((s) => s.id));
  const missing = latestDoc.snapshots
    .map((s) => s?.source_id)
    .filter((id) => typeof id !== "string" || !ids.has(id));

  if (missing.length > 0) {
    fail(`Found ${missing.length} invalid snapshot source_id values: ${missing.join(", ")}`);
    return;
  }

  ok(`Validated snapshot/source relation for ${latestDoc.snapshots.length} snapshots`);
}

main().catch((err) => fail(err instanceof Error ? err.message : String(err)));
