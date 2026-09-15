import { parse, object, string } from "valibot";
import { stringValue } from "../shared/errors.ts";
import type { Stage } from "../shared/models.ts";
import test from "node:test";
import assert from "node:assert/strict";
import { audienceStage, AudienceStageSync } from "../lib/audience-stage.ts";
test("audience publication omits private fields and explains local demos", () => {
  const privateStage = {
    title: "Demo",
    mode: "demo",
    demoUrl: "http://localhost:5173/",
    brief: "PRIVATE",
    notes: "PRIVATE",
    codex: { messages: ["PRIVATE"] },
    workspace: "PRIVATE",
  };
  const stage = audienceStage(privateStage);
  assert.equal(stage.mode, "material");
  assert.equal(stage.demoUrl, "");
  assert.doesNotMatch(JSON.stringify(stage), /PRIVATE|localhost/);
  assert.equal(
    audienceStage({ mode: "demo", demoUrl: "https://example.com/" }).mode,
    "demo",
  );
});
test("audience sync serializes writes and coalesces intermediate slides", async () => {
  const sent: Partial<Stage>[] = [],
    releases: (() => void)[] = [];
  const sync = new AudienceStageSync({
    origin: "https://audience.invalid",
    token: "test",
    fetcher: async (_url, options) => {
      sent.push(
        parse(
          object({ title: string() }),
          JSON.parse(stringValue(options.body, "stage body")),
        ),
      );
      await new Promise<void>((resolve) => releases.push(resolve));
      return new Response(null, { status: 204 });
    },
  });
  sync.publish({ title: "One" });
  sync.publish({ title: "Two" });
  sync.publish({ title: "Three" });
  assert.equal(sent.length, 1);
  releases.shift()!();
  try {
    await assert.doesNotReject(async () => {
      const deadline = Date.now() + 2000;
      while (sent.length < 2 && Date.now() < deadline)
        await new Promise((resolve) => setTimeout(resolve, 10));
      assert.equal(sent.length, 2);
      assert.equal(sent[1]?.title, "Three");
    });
  } finally {
    releases.shift()?.();
    sync.close();
  }
});

test("audience projection preserves only published fields and clones nested state", () => {
  const published = {
    live: true,
    act: "agents",
    mode: "material",
    title: "Shared",
    html: "<p>Public</p>",
    source: "Lecture",
    diagram: "ages",
    demoUrl: "",
    version: 7,
    slidePosition: { number: 7, total: 78, progress: 0.08 },
    slideType: "material",
    theme: { text: "#123456" },
    blank: false,
    build: { status: "ready" },
  };
  const result = audienceStage({ ...published, brief: "PRIVATE" });
  assert.deepEqual(result, published);
  published.theme.text = "#ffffff";
  published.build.status = "working";
  assert.equal(result.theme!.text, "#123456");
  assert.equal(result.build!.status, "ready");
  assert.deepEqual(audienceStage({}), {});
});

test("audience demos require credential-free public HTTPS addresses", () => {
  for (const demoUrl of [
    "bad",
    "http://example.com/",
    "https://user@example.com/",
    "https://u:p@example.com/",
    "https://example.com/?secret=x",
    "https://example.com/#secret",
    "https://localhost/",
    "https://127.0.0.1/",
    "https://10.0.0.1/",
    "https://192.168.1.1/",
    "https://172.16.0.1/",
    "https://172.31.0.1/",
    "https://[::1]/",
  ]) {
    const result = audienceStage({ mode: "demo", demoUrl });
    assert.equal(result.mode, "material", demoUrl);
    assert.equal(result.demoUrl, "");
    assert.match(result.html!, /projected demonstration/);
  }
  for (const demoUrl of [
    "https://example.com/app",
    "https://172.15.0.1/",
    "https://172.32.0.1/",
  ])
    assert.deepEqual(audienceStage({ mode: "demo", demoUrl }), {
      mode: "demo",
      demoUrl,
    });
});

test("audience delivery reports failure and closed sync never publishes", async () => {
  let calls = 0;
  const sync = new AudienceStageSync({
    origin: "https://audience.invalid",
    token: "private",
    fetcher: async () => {
      calls++;
      return new Response(null, { status: 503 });
    },
  });
  try {
    await assert.rejects(
      () => sync.deliver({ title: "Shared" }),
      /unavailable/,
    );
    assert.equal(sync.busy, false);
    assert.equal(sync.sent, "");
  } finally {
    sync.close();
  }
  sync.publish({ title: "Later" });
  await sync.flush();
  assert.equal(calls, 1);
  await assert.rejects(
    () => sync.deliver({ title: "Later" }),
    /not confirmed|unavailable/,
  );
  const disconnected = new AudienceStageSync({
    fetcher: async () => {
      throw new Error("No connection");
    },
  });
  await disconnected.deliver({ title: "Private" });
  assert.equal(disconnected.pending, "");
});
