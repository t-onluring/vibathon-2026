import { mkdtemp, readFile, rm, writeFile, mkdir, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const REVIEW_SCRIPT = join(ROOT, "scripts", "review-contributions.mjs");
const PROMOTE_SCRIPT = join(ROOT, "scripts", "promote-contribution.mjs");

function baseSourcesFile() {
  return {
    $schema: "./schema/source.schema.json",
    version: "test",
    updated_at: "2026-06-01",
    license: "CC-BY-SA-4.0",
    sources: [
      {
        id: "tg-sijadwalkajian",
        name: "Sijadwal Kajian",
        platform: "tg",
        source_type: "group",
        url: "https://t.me/sijadwalkajian",
        handle: "sijadwalkajian",
        category: ["jadwal", "kajian"],
        region: "nasional",
        language: "id",
        priority: 1,
        tags: ["telegram"],
        verified: true,
        added_at: "2026-06-01",
      },
    ],
  };
}

function validChannelContribution() {
  return {
    name: "Kajian Kota Contoh",
    platform: "tg",
    source_type: "channel",
    url: "https://t.me/kajiancontoh",
    handle: "kajiancontoh",
    region: "kota-contoh",
    category: ["kajian", "jadwal"],
    tags: ["kajian", "jadwal"],
    evidence_url: "https://t.me/kajiancontoh",
    submitted_by: "tester",
    notes: "Akun publik aktif.",
  };
}

function validTopicContribution() {
  return {
    name: "Sijadwal Kajian - Jakarta",
    platform: "tg",
    source_type: "topic",
    parent_id: "tg-sijadwalkajian",
    topic_id: "201",
    url: "https://t.me/sijadwalkajian/201",
    handle: "sijadwalkajian",
    region: "jakarta",
    category: ["kajian", "jadwal"],
    tags: ["telegram-topic"],
    evidence_url: "https://t.me/sijadwalkajian/201",
    submitted_by: "tester",
  };
}

async function setupFixture() {
  const dir = await mkdtemp(join(tmpdir(), "vibathon-contrib-test-"));
  const pendingDir = join(dir, "pending");
  const archiveDir = join(dir, "archive", "promoted");
  const sourcesPath = join(dir, "sources.json");
  await mkdir(pendingDir, { recursive: true });
  await mkdir(archiveDir, { recursive: true });
  await writeJson(sourcesPath, baseSourcesFile());
  return { dir, pendingDir, archiveDir, sourcesPath };
}

async function writeJson(path, value) {
  await mkdir(resolve(path, ".."), { recursive: true }).catch(() => undefined);
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf-8");
}

function run(script, args, fixture) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd: ROOT,
    env: {
      ...process.env,
      SOURCES_PATH: fixture.sourcesPath,
      CONTRIBUTIONS_PENDING_DIR: fixture.pendingDir,
      CONTRIBUTIONS_ARCHIVE_PROMOTED_DIR: fixture.archiveDir,
    },
    encoding: "utf-8",
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function expectStatus(result, expected, name) {
  if (result.status !== expected) {
    console.error(result.stdout);
    console.error(result.stderr);
    throw new Error(`${name}: expected exit ${expected}, got ${result.status}`);
  }
}

async function test(name, fn) {
  const fixture = await setupFixture();
  try {
    await fn(fixture);
    console.log(`✅ ${name}`);
  } finally {
    await rm(fixture.dir, { recursive: true, force: true });
  }
}

await test("review: no pending files succeeds with warning", async (fixture) => {
  const result = run(REVIEW_SCRIPT, [], fixture);
  expectStatus(result, 0, "review no pending");
  assert(result.stderr.includes("No pending contribution") || result.stdout.includes("No pending contribution"), "expected no pending warning");
});

await test("review: valid channel pending is ready", async (fixture) => {
  await writeJson(join(fixture.pendingDir, "kajiancontoh.json"), validChannelContribution());
  const result = run(REVIEW_SCRIPT, [], fixture);
  expectStatus(result, 0, "review valid channel");
  assert(result.stdout.includes("readiness: ready"), "expected ready output");
});

await test("review: valid topic pending is ready", async (fixture) => {
  await writeJson(join(fixture.pendingDir, "topic.json"), validTopicContribution());
  const result = run(REVIEW_SCRIPT, [], fixture);
  expectStatus(result, 0, "review valid topic");
  assert(result.stdout.includes("parent/topic: tg-sijadwalkajian/201"), "expected topic summary");
});

await test("review: invalid JSON fails", async (fixture) => {
  await writeFile(join(fixture.pendingDir, "bad.json"), "{ nope", "utf-8");
  const result = run(REVIEW_SCRIPT, [], fixture);
  expectStatus(result, 1, "review invalid JSON");
});

await test("review: duplicate URL fails", async (fixture) => {
  const item = validChannelContribution();
  item.url = "https://t.me/sijadwalkajian";
  await writeJson(join(fixture.pendingDir, "duplicate.json"), item);
  const result = run(REVIEW_SCRIPT, [], fixture);
  expectStatus(result, 1, "review duplicate URL");
  assert(result.stdout.includes("duplicates existing source"), "expected duplicate message");
});

await test("review: topic parent missing fails", async (fixture) => {
  const item = validTopicContribution();
  item.parent_id = "tg-missing";
  await writeJson(join(fixture.pendingDir, "topic.json"), item);
  const result = run(REVIEW_SCRIPT, [], fixture);
  expectStatus(result, 1, "review missing parent");
});

await test("promote: missing file fails", async (fixture) => {
  const result = run(PROMOTE_SCRIPT, [join(fixture.pendingDir, "missing.json")], fixture);
  expectStatus(result, 1, "promote missing file");
});

await test("promote: duplicate handle fails with no writes", async (fixture) => {
  const item = validChannelContribution();
  item.url = "https://t.me/another-url";
  item.handle = "sijadwalkajian";
  const input = join(fixture.pendingDir, "duplicate-handle.json");
  await writeJson(input, item);
  const before = await readFile(fixture.sourcesPath, "utf-8");
  const result = run(PROMOTE_SCRIPT, [input, "--apply"], fixture);
  expectStatus(result, 1, "promote duplicate handle");
  const after = await readFile(fixture.sourcesPath, "utf-8");
  assert(before === after, "sources should not change on duplicate handle");
  assert(existsSync(input), "pending should not be archived on failure");
});

await test("promote: dry-run valid channel previews with no writes", async (fixture) => {
  const input = join(fixture.pendingDir, "kajiancontoh.json");
  await writeJson(input, validChannelContribution());
  const before = await readFile(fixture.sourcesPath, "utf-8");
  const result = run(PROMOTE_SCRIPT, [input], fixture);
  expectStatus(result, 0, "promote dry run channel");
  assert(result.stdout.includes('"id": "tg-kajiancontoh"'), "expected generated id");
  const after = await readFile(fixture.sourcesPath, "utf-8");
  assert(before === after, "dry-run should not mutate sources");
  assert(existsSync(input), "dry-run should not archive pending file");
});

await test("promote: dry-run valid topic uses topic-aware id", async (fixture) => {
  const input = join(fixture.pendingDir, "topic.json");
  await writeJson(input, validTopicContribution());
  const result = run(PROMOTE_SCRIPT, [input], fixture);
  expectStatus(result, 0, "promote dry run topic");
  assert(result.stdout.includes('"id": "tg-sijadwalkajian-topic-201"'), "expected topic-aware generated id");
});

await test("promote: apply valid channel appends source and archives pending", async (fixture) => {
  const input = join(fixture.pendingDir, "kajiancontoh.json");
  await writeJson(input, validChannelContribution());
  const result = run(PROMOTE_SCRIPT, [input, "--apply"], fixture);
  expectStatus(result, 0, "promote apply channel");
  const sourcesFile = JSON.parse(await readFile(fixture.sourcesPath, "utf-8"));
  assert(sourcesFile.sources.some((source) => source.id === "tg-kajiancontoh"), "expected promoted source");
  assert(sourcesFile.updated_at !== "2026-06-01", "expected updated_at to change");
  assert(!existsSync(input), "expected pending file to move");
  assert(existsSync(join(fixture.archiveDir, "kajiancontoh.json")), "expected archived pending file");
  const pendingEntries = await readdir(fixture.pendingDir);
  assert(pendingEntries.length === 0, "expected empty pending dir after archive");
});

console.log("\n✅ contribution script smoke tests passed");
