import { readFile } from "node:fs/promises";
import { URL } from "node:url";

const TIMEOUT_MS = 12000;

function withTimeout(ms) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return { controller, clear: () => clearTimeout(id) };
}

async function probe(url) {
  const { controller, clear } = withTimeout(TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": "vibathon-link-check/1.0" },
    });
    clear();
    if (res.status < 400) return { ok: true, status: res.status, method: "HEAD" };

    const retry = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": "vibathon-link-check/1.0" },
    });
    return { ok: retry.status < 400, status: retry.status, method: "GET" };
  } catch (err) {
    clear();
    return { ok: false, status: 0, error: err instanceof Error ? err.message : String(err) };
  }
}

async function main() {
  const raw = await readFile(new URL("../data/sources.json", import.meta.url), "utf-8");
  const data = JSON.parse(raw);
  const sources = Array.isArray(data.sources) ? data.sources : [];

  console.log(`Checking ${sources.length} source links (warning-only)...`);

  let failed = 0;
  for (const s of sources) {
    const result = await probe(s.url);
    if (result.ok) {
      console.log(`✅ ${s.id} ${s.url} -> ${result.status} (${result.method ?? "HEAD"})`);
    } else {
      failed += 1;
      console.log(`⚠️ ${s.id} ${s.url} -> failed (${result.status || result.error || "unknown"})`);
    }
  }

  if (failed > 0) {
    console.log(`\n⚠️ Link check finished with ${failed} warning(s).`);
  } else {
    console.log("\n✅ Link check finished with no warnings.");
  }
}

main().catch((err) => {
  console.log(`⚠️ Link check runtime warning: ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 0;
});
