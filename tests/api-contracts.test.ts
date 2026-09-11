import { test } from "node:test";
import assert from "node:assert/strict";
import { parseApiResponse, validateApiRequest } from "../shared/api.ts";
import { fixture } from "./fixture.ts";

test("API schemas accept real snapshots and reject malformed nested responses", async () => {
  const { studio } = await fixture();
  try {
    const snapshot = studio.snapshot();
    assert.deepEqual(parseApiResponse("desk", snapshot), snapshot);
    assert.deepEqual(
      parseApiResponse("stage", snapshot.projection),
      snapshot.projection,
    );
    assert.throws(
      () =>
        parseApiResponse("desk", {
          ...snapshot,
          codex: { ...snapshot.codex, messages: [{ id: "one", text: 42 }] },
        }),
      /Invalid response/,
    );
    assert.throws(
      () => parseApiResponse("stage", { ...snapshot.projection, html: {} }),
      /Invalid response/,
    );
    assert.throws(
      () =>
        parseApiResponse("feedback", {
          config: null,
          items: [{ id: "one", text: {}, status: "pending" }],
        }),
      /Invalid response/,
    );
    assert.throws(
      () =>
        parseApiResponse("search?q=test", {
          matches: [{ path: "x", title: "X", snippet: "text", score: 1 }],
          unavailable: 0,
        }),
      /Invalid response/,
    );
    const stage = parseApiResponse("stage", {
      ...snapshot.projection,
      privateNotes: "never render",
    });
    assert.equal("privateNotes" in stage, false);
  } finally {
    await studio.server[Symbol.asyncDispose]();
  }
});

test("API commands reject wrong fields, unknown routes and wrong value types", () => {
  validateApiRequest("codex/start", {
    brief: "Build the reviewed increment",
    model: "example",
  });
  validateApiRequest("presentation/live", { live: true });
  for (const [path, body] of [
    ["codex/start", { brief: 1 }],
    ["codex/start", { brief: "ok", approvalPolicy: "never" }],
    ["codex/answer", { id: "one", decision: "accept-all" }],
    ["presentation/live", { live: "true" }],
    ["reset-lecture", { confirm: false }],
    ["nonexistent", {}],
  ] as const)
    assert.throws(() => validateApiRequest(path, body), /API command/);
});
