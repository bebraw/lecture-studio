import { parseApiResponse } from "../shared/api.ts";
import { httpResult } from "./http-result.ts";
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Rehearsals, START_COMMIT } from "../lib/rehearsals.ts";
import { fixture } from "./fixture.ts";

test("numbered checkouts retain earlier attempts and verify the pinned starter", async () => {
  const root = await mkdtemp(join(tmpdir(), "studio-rehearsals-"));
  const calls: string[][] = [];
  const manager = new Rehearsals(root, async (bin, args) => {
    calls.push([bin, ...args]);
    return { stdout: args[0] === "rev-parse" ? START_COMMIT : "" };
  });
  const one = await manager.create(),
    two = await manager.create();
  assert.ok(one.endsWith("rehearsal-001"));
  assert.ok(two.endsWith("rehearsal-002"));
  await access(one);
  assert.equal(await manager.current("fallback"), two);
  assert.equal(calls.filter((c) => c[0] === "npm" && c[1] === "ci").length, 2);
  const bad = new Rehearsals(root, async () => ({ stdout: "wrong" }));
  await assert.rejects(() => bad.create(), /reviewed commit/);
  assert.equal(await manager.current("fallback"), two);
});

test("reset and fresh rehearsal are confirmed, private, and preserve the workspace on setup failure", async (t) => {
  let resolveSetup: ((path: string) => void) | undefined;
  const rehearsals = {
    current: async (path: string) => path,
    create: () => new Promise<string>((resolve) => (resolveSetup = resolve)),
  };
  const { studio, address, bridge } = await fixture({ rehearsals });
  t.after(() => studio.server.close());
  const post = async (
    path: string,
    body: unknown,
    token = address.deskToken,
  ) => {
    const res = await fetch(address.origin + "/api/" + path, {
      method: "POST",
      headers: {
        Origin: address.origin,
        Authorization: "Bearer " + token,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });
    return httpResult("desk", res);
  };
  const desk = async () =>
    parseApiResponse(
      "desk",
      await (
        await fetch(address.origin + "/api/desk", {
          headers: { Authorization: "Bearer " + address.deskToken },
        })
      ).json(),
    );
  assert.equal((await post("reset-lecture", {})).status, 400);
  assert.equal(
    (await post("new-rehearsal", { confirm: true }, address.stageToken)).status,
    401,
  );
  const old = await desk();
  await post("act", { act: "agents" });
  bridge.state.messages = [{ id: "old", text: "http://localhost:8799/" }];
  const reset = (await post("reset-lecture", { confirm: true })).data();
  assert.equal(reset.workspace, old.workspace);
  assert.equal(reset.activeAct, "opening");
  assert.equal(reset.codex.messages.length, 0);
  assert.equal(reset.codex.status, "disconnected");
  assert.equal((await post("new-rehearsal", { confirm: true })).status, 202);
  assert.equal((await post("new-rehearsal", { confirm: true })).status, 409);
  assert.ok(resolveSetup);
  resolveSetup("/fresh/rehearsal-001");
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal((await desk()).workspace, "/fresh/rehearsal-001");
  rehearsals.create = async () => {
    throw new Error("offline");
  };
  await post("new-rehearsal", { confirm: true });
  await new Promise((resolve) => setTimeout(resolve, 10));
  const failed = await desk();
  assert.equal(failed.rehearsalJob.status, "failed");
  assert.equal(failed.workspace, "/fresh/rehearsal-001");
});
