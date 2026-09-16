import { parseApiResponse } from "../shared/api.ts";
import { httpResult } from "./http-result.ts";
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  Rehearsals,
  START_COMMIT,
  validateWorkspace,
} from "../lib/rehearsals.ts";
import { fixture } from "./fixture.ts";

test("first Live on isolates a fresh app; pause resumes it and restart prepares another", async (t) => {
  let created = 0,
    fail = false;
  const path = "Lectures/Web Development 2026/Presentations/Fresh.md";
  const local = await fixture({
    rehearsals: {
      current: async (p) => p,
      create: async () => {
        if (fail) throw new Error("offline");
        return `/fresh/rehearsal-${++created}`;
      },
    },
    library: {
      status: "Connected",
      list: async () => [{ path, label: "Fresh" }],
      read: async () => ({
        sections: [
          {
            heading: "Presentation",
            body: '```json\n{"version":1,"title":"Fresh","start":"intro","steps":[{"id":"intro","type":"title","title":"Intro","body":""}]}\n```',
          },
        ],
      }),
      close: async () => {},
    },
  });
  t.after(local.stop);
  const post = async (op: string, body: object) =>
    fetch(local.address.origin + "/api/presentation/" + op, {
      method: "POST",
      headers: {
        origin: local.address.origin,
        authorization: "Bearer " + local.address.deskToken,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });
  await post("load", { path });
  local.bridge.state.messages = [
    { id: "old", text: "old preview http://localhost:9999" },
  ];
  assert.equal((await post("live", { live: true })).status, 200);
  assert.equal(local.studio.snapshot().workspace, "/fresh/rehearsal-1");
  assert.equal(local.bridge.state.messages.length, 0);
  await post("live", { live: false });
  await post("live", { live: true });
  assert.equal(created, 1);
  await post("live", { live: false });
  await post("load", { path });
  fail = true;
  assert.equal((await post("live", { live: true })).status, 400);
  assert.equal(local.studio.snapshot().live, false);
  assert.equal(local.studio.snapshot().workspace, "/fresh/rehearsal-1");
  fail = false;
  await post("live", { live: true });
  assert.equal(local.studio.snapshot().workspace, "/fresh/rehearsal-2");
});

test("first connection prepares a missing default without resetting the lecture", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "studio-first-connect-"));
  const defaultWorkspace = resolve(process.cwd(), "../lecture-demo");
  try {
    await access(defaultWorkspace);
    t.skip("Default checkout already exists");
    return;
  } catch {}
  let created = 0;
  const local = await fixture({
    workspace: defaultWorkspace,
    rehearsals: {
      current: async (path) => path,
      create: async () => {
        created++;
        return join(root, "rehearsal-001");
      },
    },
  });
  t.after(local.stop);
  const post = async (path: string, body = {}) => {
    const res = await fetch(local.address.origin + "/api/" + path, {
      method: "POST",
      headers: {
        Origin: local.address.origin,
        Authorization: "Bearer " + local.address.deskToken,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });
    assert.equal(res.status, 200);
    return parseApiResponse("desk", await res.json());
  };
  await post("act", { act: "agents" });
  const connected = await post("codex/connect");
  assert.equal(created, 1);
  assert.equal(connected.activeAct, "agents");
  assert.equal(connected.codex.status, "ready");
  assert.equal(connected.workspace, join(root, "rehearsal-001"));
  await post("codex/connect");
  assert.equal(created, 1);
});

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

test("builder rejects the controller and unrelated workspaces", async () => {
  await assert.rejects(
    () => validateWorkspace(join(tmpdir(), "missing-" + crypto.randomUUID())),
    /workspace is missing or inaccessible/,
  );
  await assert.rejects(
    () => validateWorkspace(process.cwd()),
    /studio checkout/,
  );
  const unrelated = await mkdtemp(join(tmpdir(), "unrelated-app-"));
  await assert.rejects(
    () => validateWorkspace(unrelated),
    /reviewed lecture starter/,
  );
});
