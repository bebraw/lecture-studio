import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, stat, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

test("Q&A provisioning stores a scoped key privately, never logs it and refuses overwrite", async () => {
  const directory = await mkdtemp(join(tmpdir(), "qa-credentials-"));
  try {
    const key = "a".repeat(64),
      master = "b".repeat(64),
      output = join(directory, "private.json");
    const mock =
      "globalThis.fetch = async (url, options) => { if(options.headers.authorization !== 'Bearer " +
      master +
      "') throw new Error('Missing credential'); return Response.json({audienceUrl:'https://example.org/q/event',moderatorUrl:'https://example.org/q/event/moderate',moderatorKey:'" +
      key +
      "'}); };";
    const args = [
      "--import",
      "tsx",
      "--import",
      "data:text/javascript," + encodeURIComponent(mock),
      resolve("scripts/qa-session.ts"),
      "create",
      "event",
      "Test event",
      output,
    ];
    const env = {
      ...process.env,
      LECTURE_POLL_ORIGIN: "https://example.org",
      LECTURE_POLL_TOKEN: master,
    };
    const first = spawnSync(process.execPath, args, { env, encoding: "utf8" });
    assert.equal(first.status, 0, first.stderr);
    assert.doesNotMatch(
      first.stdout + first.stderr,
      new RegExp(key + "|" + master),
    );
    assert.match(await readFile(output, "utf8"), new RegExp(key));
    assert.equal((await stat(output)).mode & 0o777, 0o600);
    const second = spawnSync(process.execPath, args, { env, encoding: "utf8" });
    assert.notEqual(second.status, 0);
    assert.match(second.stderr, /EEXIST/);
    const invalid = spawnSync(
      process.execPath,
      [...args.slice(0, -1), join(directory, "invalid.json")],
      {
        env: { ...env, LECTURE_POLL_ORIGIN: "http://remote.example" },
        encoding: "utf8",
      },
    );
    assert.notEqual(invalid.status, 0);
    assert.match(invalid.stderr, /HTTPS audience origin/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
