import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, mkdir, symlink, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  listSource,
  readSource,
  sourceExcerpt,
} from "../lib/source-browser.ts";

test("source browsing excludes hidden, generated, linked and oversized files", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "lecture-source-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(
    join(root, "app.ts"),
    "const title = '<script>alert(1)</script>';\nreturn title;",
  );
  await writeFile(join(root, ".env"), "secret");
  await mkdir(join(root, "node_modules"));
  await writeFile(join(root, "node_modules", "dependency.js"), "hidden");
  await symlink(join(root, "app.ts"), join(root, "link.ts"));
  assert.deepEqual((await listSource(root)).files, ["app.ts"]);
  for (const path of [
    "../app.ts",
    ".env",
    "node_modules/dependency.js",
    "link.ts",
    "/app.ts",
    "a\\b.ts",
  ])
    await assert.rejects(() => readSource(root, path));
  await writeFile(join(root, "large.ts"), "x".repeat(128 * 1024 + 1));
  await assert.rejects(() => readSource(root, "large.ts"), /128 KiB/);
  await writeFile(join(root, "binary.ts"), Buffer.from([0, 1]));
  await assert.rejects(() => readSource(root, "binary.ts"), /text source/);
  const source = await readSource(root, "app.ts");
  assert.match(sourceExcerpt(source, source.revision, 1, 1), /const title/);
  assert.throws(() => sourceExcerpt(source, "old", 1, 1), /changed/);
  assert.throws(() => sourceExcerpt(source, source.revision, 0, 1), /12 lines/);
  assert.throws(
    () => sourceExcerpt(source, source.revision, 1, 19),
    /12 lines/,
  );
  await writeFile(join(root, "app.ts"), "```\n# Not a slide heading\n```");
  const fence = await readSource(root, "app.ts");
  assert.ok(sourceExcerpt(fence, fence.revision, 1, 3).startsWith("````ts"));
});
