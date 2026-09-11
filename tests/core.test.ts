import type { ApiPath } from "../shared/api.ts";
import { httpResult } from "./http-result.ts";
import type { Bridge } from "../shared/models.ts";
import test from "node:test";
import assert from "node:assert/strict";
import { scopedPath, sections, renderMarkdown } from "../lib/material.ts";
import { scope, initialDraft } from "../lib/narrative.ts";
import { createStudio, validDemoUrl } from "../server.ts";
import { connectionConfig } from "../lib/obsidian.ts";

test("notes stay within the lecture scope", () => {
  assert.equal(
    scopedPath(scope + "/Concepts/example.md"),
    scope + "/Concepts/example.md",
  );
  for (const path of [
    "Personal/private.md",
    scope + "/../private.md",
    scope + "/x/../../private.md",
    scope + "\\private.md",
  ])
    assert.throws(() => scopedPath(path));
});
test("note sections omit frontmatter and allow explicit selection", () => {
  const note = sections(
    "---\nsecret: hidden\n---\n# Test\n## Stage block\nVisible\n## Presenter\nPrivate",
  );
  assert.equal(note.title, "Test");
  assert.deepEqual(
    note.sections.map((s) => s.body),
    ["Visible", "Private"],
  );
});
test("material does not execute HTML or load remote images implicitly", () => {
  const html = renderMarkdown(
    "<script>alert(1)</script> [x](javascript:alert(1)) ![sample](https://example.com/a.png)",
  );
  assert.ok(!html.includes("<script>"));
  assert.ok(!html.includes('href="javascript:'));
  assert.ok(!html.includes("<img"));
  assert.match(
    renderMarkdown("![sample](https://example.com/a.png)", {
      allowRemoteImages: true,
    }),
    /referrerpolicy="no-referrer"/,
  );
});
test("local connector and app URLs reject credential-bearing or remote insecure endpoints", () => {
  assert.throws(() =>
    connectionConfig({}, { OBSIDIAN_MCP_URL: "https://example.com/mcp" }),
  );
  assert.throws(() =>
    validDemoUrl("javascript:alert(1)", "http://127.0.0.1:4317"),
  );
  assert.throws(() =>
    validDemoUrl("https://example.com/?token=secret", "http://127.0.0.1:4317"),
  );
  assert.equal(
    validDemoUrl("http://127.0.0.1:8787", "http://127.0.0.1:4317"),
    "http://127.0.0.1:8787/",
  );
});
test("stage is read-only; draft, note reads, and builds do not implicitly publish", async (t) => {
  const { studio, address, bridge } = await fixture();
  t.after(() => studio.server.close());
  const req = async <P extends ApiPath>(
    path: P,
    value?: unknown,
    token = address.deskToken,
    extra = {},
  ) => {
    const response = await fetch(address.origin + "/api/" + path, {
      headers: {
        Authorization: "Bearer " + token,
        Origin: address.origin,
        ...(value === undefined ? {} : { "content-type": "application/json" }),
        ...extra,
      },
      ...(value === undefined
        ? {}
        : { method: "POST", body: JSON.stringify(value) }),
    });
    return httpResult(path, response);
  };
  assert.equal((await req("desk", undefined, address.stageToken)).status, 401);
  assert.equal(
    (await req("blank", { blank: true }, address.stageToken)).status,
    401,
  );
  assert.equal(
    (
      await req("stage", undefined, address.stageToken, {
        Origin: "https://evil.example",
      })
    ).status,
    403,
  );
  const original = (await req("stage", undefined, address.stageToken)).data();
  await req("library");
  await req(`note?path=${encodeURIComponent(scope + "/Example.md")}`);
  await req("draft", { ...initialDraft(), body: "PRIVATE DRAFT" });
  await req("act", { act: "agents" });
  await req("codex/connect", {});
  await req("codex/start", { brief: "PRIVATE BUILD" });
  assert.deepEqual(
    (await req("stage", undefined, address.stageToken)).data().html,
    original.html,
  );
  assert.equal(bridge.lastPrompt, "PRIVATE BUILD");
  const publicText = JSON.stringify(
    (await req("stage", undefined, address.stageToken)).data(),
  );
  for (const text of [
    "PRIVATE DRAFT",
    "PRIVATE BUILD",
    "private-output",
    "private-note",
    "workspace",
  ])
    assert.ok(!publicText.includes(text));
  assert.equal(
    (await req(`note?path=${encodeURIComponent("Personal/private.md")}`))
      .status,
    400,
  );
  await req("publish", {
    ...initialDraft(),
    title: "Deliberate publication",
    body: "Now visible",
  });
  assert.match(
    (await req("stage", undefined, address.stageToken)).data().html,
    /Now visible/,
  );
  assert.equal((await req("save", {})).status, 400);
});
export async function fixture() {
  const bridge: Bridge & { lastPrompt?: string } = {
    state: {
      status: "disconnected",
      activity: "Not connected",
      models: [],
      messages: [{ id: "1", text: "private-output" }],
      requests: [],
      turnId: null,
      threadId: null,
    },
    snapshot() {
      return this.state;
    },
    async connect() {
      this.state = { ...this.state, status: "ready" };
    },
    async start(prompt: string) {
      this.lastPrompt = prompt;
      this.state = { ...this.state, status: "working", turnId: "fake-turn" };
    },
    async interrupt() {
      this.state = { ...this.state, status: "ready", turnId: null };
    },
    answer() {},
    close() {},
  };
  const library = {
    status: "Fixture",
    async list() {
      return [{ path: scope + "/Example.md", label: "Example" }];
    },
    async read(path: string) {
      return {
        path,
        title: "Progressive enhancement",
        sections: [
          { heading: "Stage block", body: "A capability that survives." },
          { heading: "Presenter", body: "private-note" },
          {
            heading: "Visual",
            body: "```mermaid\nflowchart LR\nA[HTML] --> B[Enhancement]\n```",
          },
        ],
      };
    },
    async close() {},
  };
  const studio = createStudio({ bridge, library, port: 0, persist: false });
  return { studio, bridge, address: await studio.start() };
}
