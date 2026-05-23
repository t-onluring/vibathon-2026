import { readFile } from "node:fs/promises";
import { URL } from "node:url";

const VERSION_RE = /^v\d+\.\d+\.\d+$/;

function fail(msg) {
  console.error(`❌ ${msg}`);
  process.exitCode = 1;
}

function ok(msg) {
  console.log(`✅ ${msg}`);
}

async function main() {
  const latestRaw = await readFile(new URL("../data/latest.json", import.meta.url), "utf-8");
  const latest = JSON.parse(latestRaw);

  if (typeof latest.version !== "string" || !VERSION_RE.test(latest.version)) {
    fail(`data/latest.json version must match vMAJOR.MINOR.PATCH, got '${latest.version}'`);
    return;
  }

  ok(`Version format valid: ${latest.version}`);
}

main().catch((err) => fail(err instanceof Error ? err.message : String(err)));
