import test from "node:test";
import assert from "node:assert/strict";
import { AudiencePoll } from "../lib/audience-poll.ts";
import { feedbackRequest } from "../lib/feedback.ts";
import type { Fetcher } from "../shared/models.ts";
const service = (fetcher: Fetcher) =>
  new AudiencePoll({
    origin: "https://audience.invalid",
    token: "private-token",
    fetcher,
  });
test("feedback transport authenticates privately and preserves GET/POST intent", async () => {
  const snapshot = { config: null, items: [] };
  const calls: RequestInit[] = [];
  const poll = service(async (url, init) => {
    assert.equal(url, "https://audience.invalid/presenter/feedback");
    calls.push(init);
    return Response.json(snapshot);
  });
  assert.deepEqual(await feedbackRequest(poll), snapshot);
  await feedbackRequest(poll, { action: "close" });
  assert.equal(calls[0]!.method, "GET");
  assert.equal(calls[0]!.body, undefined);
  assert.equal(calls[1]!.method, "POST");
  assert.equal(calls[1]!.body, JSON.stringify({ action: "close" }));
  assert.equal(
    new Headers(calls[1]!.headers).get("authorization"),
    "Bearer private-token",
  );
  assert.equal(calls[1]!.redirect, "error");
});
test("feedback transport bounds responses and reports service failures", async () => {
  for (const [response, message] of [
    [new Response(null, { status: 404 }), /Deploy the updated/],
    [
      Response.json({ error: "Service offline" }, { status: 503 }),
      /Service offline/,
    ],
    [Response.json({}, { status: 500 }), /Feedback service unavailable/],
    [new Response("x".repeat(1000001)), /too large/],
    [new Response(null, { status: 204 }), /empty response/],
  ] as const)
    await assert.rejects(
      () => feedbackRequest(service(async () => response)),
      message,
    );
  const disconnected = service(async () => {
    throw new Error("Should not fetch");
  });
  disconnected.token = "";
  await assert.rejects(
    () => feedbackRequest(disconnected),
    /Connect an audience service/,
  );
});
