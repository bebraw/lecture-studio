import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BuildTimings } from "../lib/build-timings.ts";

test("timings preserve distinct attempts, first preview, model and terminal duration across restart", async () => {
  const dir = await mkdtemp(join(tmpdir(), "lecture-timing-"));
  try {
    const file = join(dir, "history.json");
    const log = new BuildTimings(file);
    await log.load();
    const first = log.begin(
      "demo",
      "Demo",
      "fast-model",
      "private prompt",
      1000,
    );
    log.preview(first.id, 5000);
    log.preview(first.id, 7000);
    log.finish(first.id, "completed", 11000);
    log.finish(first.id, "interrupted", 15000);
    const second = log.begin(
      "demo",
      "Demo",
      "other-model",
      "private prompt",
      20000,
    );
    assert.notEqual(first.id, second.id);
    assert.equal(first.promptHash, second.promptHash);
    assert.equal(first.previewAt, new Date(5000).toISOString());
    assert.equal(first.finishedAt, new Date(11000).toISOString());
    await log.flush();
    assert.ok(!(await readFile(file, "utf8")).includes("private prompt"));
    const restored = new BuildTimings(file);
    await restored.load();
    assert.equal(restored.rows[0]?.model, "fast-model");
    assert.equal(restored.rows[1]?.outcome, "unknown");
    assert.equal(restored.rows[1]?.finishedAt, null);
    for (let i = 0; i < 201; i++)
      restored.begin("demo", "Demo", "fast", String(i));
    assert.equal(restored.rows.length, 200);
    await restored.flush();
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("an unreadable history is preserved and timing failures do not block builds", async () => {
  const dir = await mkdtemp(join(tmpdir(), "lecture-timing-"));
  try {
    const file = join(dir, "history.json");
    await writeFile(file, "corrupt history");
    const log = new BuildTimings(file);
    await log.load();
    assert.match(log.warning, /preserved/);
    const row = log.begin("demo", "Demo", "model", "prompt", 10000);
    log.finish(row.id, "failed", 0);
    assert.equal(row.startedAt, row.finishedAt);
    await log.flush();
    assert.equal(await readFile(file, "utf8"), "corrupt history");
    const blocked = new BuildTimings(join(file, "child.json"));
    blocked.begin("demo", "Demo", "model", "prompt");
    await blocked.flush();
    assert.match(blocked.warning, /saving failed/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
