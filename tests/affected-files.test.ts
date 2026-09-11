import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, renameSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { affectedFiles, affectedChecks } from "../scripts/affected-files.ts";

test("affected checks preserve full fallback and select documentation, runtime and browser gates", () => {
  assert.deepEqual(affectedChecks(null), ["check"]);
  assert.deepEqual(affectedChecks([]), []);
  assert.deepEqual(affectedChecks(["README.md"]), ["format:check"]);
  for (const path of [
    "package-lock.json",
    "audience/package.json",
    ".oxlintrc.json",
    "scripts/new.ts",
    "docs/tool.ts",
  ])
    assert.deepEqual(affectedChecks([path]), ["check"]);
  assert.ok(affectedChecks(["lib/material.ts"]).includes("test:coverage"));
  assert.ok(affectedChecks(["audience/worker.ts"]).includes("build:worker"));
  assert.ok(affectedChecks(["public/desk.ts"]).includes("test:browser"));
});

test("push detection includes deletions, both sides of renames, spaces and working changes", () => {
  const root = mkdtempSync(join(tmpdir(), "lecture-affected-"));
  const git = (...args: string[]) =>
    execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  try {
    git("init");
    git("config", "user.name", "Fixture");
    git("config", "user.email", "fixture@example.invalid");
    writeFileSync(join(root, "old.ts"), "export {};\n");
    git("add", ".");
    git("-c", "core.hooksPath=/dev/null", "commit", "-m", "Initial");
    const base = git("rev-parse", "HEAD^{commit}");
    renameSync(join(root, "old.ts"), join(root, "new file.ts"));
    git("add", "-A");
    git("-c", "core.hooksPath=/dev/null", "commit", "-m", "Rename");
    const head = git("rev-parse", "HEAD^{commit}");
    const input = `refs/heads/main ${head} refs/heads/main ${base}\n`;
    writeFileSync(join(root, "untracked.ts"), "export {};\n");
    assert.deepEqual(affectedFiles(root, input), [
      "new file.ts",
      "old.ts",
      "untracked.ts",
    ]);
    assert.equal(
      affectedFiles(root, input.replace(base, "0".repeat(40))),
      null,
    );
    assert.equal(
      affectedFiles(root, input.replace(base, "1".repeat(40))),
      null,
    );
    assert.throws(
      () => affectedFiles(root, input.replace(head, base)),
      /Check out/,
    );
    assert.throws(() => affectedFiles(root, "malformed"), /Malformed/);
    assert.equal(affectedFiles(root), null);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
