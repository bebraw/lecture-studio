import { parseApiResponse } from "../shared/api.ts";
import { parse } from "valibot";
import { audienceStageSchema } from "../shared/audience-schemas.ts";
import { stringValue } from "../shared/errors.ts";
import type { Stage } from "../shared/models.ts";
import test from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./fixture.ts";
import { AudiencePoll, themePoll } from "../lib/audience-poll.ts";
test("only published slides sync; polling never replaces another projected slide", async () => {
  const writes: Partial<Stage>[] = [];
  let cleanups = 0;
  const collections: string[] = [];
  let status = "open",
    revision = 1;
  const poll = new AudiencePoll({
    origin: "https://audience.invalid",
    token: "private",
    fetcher: async (url, init) => {
      if (url.endsWith("/presenter/feedback")) {
        collections.push(stringValue(init.body, "feedback body"));
        return Response.json({ config: null, items: [] });
      }
      if (url.endsWith("/presenter/close-polls")) {
        cleanups++;
        status = "locked";
        return new Response(null, { status: 204 });
      }
      if (url.endsWith("/presenter/stage")) {
        writes.push(
          parse(
            audienceStageSchema,
            JSON.parse(stringValue(init.body, "stage body")),
          ),
        );
        return new Response(null, { status: 204 });
      }
      if (url.endsWith("/open-session")) status = "open";
      if (url.endsWith("/lock")) status = "locked";
      return Response.json({
        status,
        revision: revision++,
        totalVotes: 0,
        choices: themePoll().options.map((o) => ({ ...o, votes: 0 })),
      });
    },
  });
  const path = "Lectures/Web Development 2026/Presentations/Test.md";
  const definition = {
    version: 1,
    title: "Test",
    start: "title",
    steps: [
      {
        id: "title",
        type: "title",
        title: "Public title",
        notes: "PRIVATE",
        wordCloud: true,
        next: "vote",
      },
      {
        id: "vote",
        type: "poll",
        title: "Theme",
        room: "webdev-2026",
        poll: themePoll(),
        next: "vote-next",
      },
      {
        id: "vote-next",
        type: "poll",
        title: "Next poll",
        room: "webdev-2026-priority",
        poll: { ...themePoll(), question: "What next?" },
      },
    ],
  };
  const library = {
    status: "Fixture",
    list: async () => [{ path, label: path }],
    read: async () => ({
      sections: [
        {
          heading: "Presentation",
          body:
            "\x60\x60\x60json\n" +
            JSON.stringify(definition) +
            "\n\x60\x60\x60",
        },
      ],
    }),
    close: async () => {},
  };
  const { studio, address } = await fixture({ poll, library });
  const call = async (op: string, body: unknown = {}) => {
    const response = await fetch(address.origin + "/api/presentation/" + op, {
      method: "POST",
      headers: {
        origin: address.origin,
        authorization: "Bearer " + address.deskToken,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const value: unknown = await response.json();
    assert.equal(response.status, 200, JSON.stringify(value));
    return parseApiResponse("desk", value);
  };
  const wait = () => new Promise((resolve) => setTimeout(resolve, 1100));
  try {
    await call("load", { path });
    await wait();
    assert.equal(writes.at(-1)!.live, false);
    assert.equal(writes.at(-1)!.title, "Waiting for the lecturer");
    await call("live", { live: true });
    assert.equal(cleanups, 1);
    assert.deepEqual(JSON.parse(collections[0]!), {
      action: "start",
      mode: "words",
      prompt: "Public title",
    });
    await call("show");
    assert.equal(
      collections.length,
      1,
      "Showing the same slide preserves responses",
    );
    assert.equal(status, "locked");
    await wait();
    assert.equal(writes.at(-1)!.title, "Public title");
    await call("select", { id: "vote" });
    await wait();
    assert.equal(writes.at(-1)!.title, "Public title");
    assert.equal(
      collections.length,
      1,
      "Private selection leaves collection open",
    );
    const opened = await call("show");
    assert.deepEqual(JSON.parse(collections[1]!), { action: "close" });
    assert.equal(opened.graphPoll?.snapshot?.status, "open");
    await wait();
    assert.equal(writes.at(-1)!.title, themePoll().question);
    assert.equal(writes.at(-1)!.projectionKind, "question");
    await call("poll-refresh");
    await wait();
    assert.equal(writes.at(-1)!.title, themePoll().question);
    await call("poll-question");
    await wait();
    assert.match(writes.at(-1)!.html!, /Editorial/);
    assert.doesNotMatch(writes.at(-1)!.html!, /Editorial: 0/);
    await call("poll-results");
    await wait();
    assert.match(writes.at(-1)!.html!, /Editorial: 0/);
    assert.equal(writes.at(-1)!.projectionKind, "results");
    const nextPoll = await call("next");
    assert.equal(nextPoll.graphPoll?.snapshot?.status, "open");
    assert.equal(nextPoll.projection.projectionKind, "question");
    await wait();
    assert.equal(writes.at(-1)!.title, "What next?");
    // Returning shows the saved results, without reopening the earlier poll.
    const previousPoll = await call("previous");
    assert.ok(previousPoll.graphPoll?.frozen);
    assert.equal(previousPoll.projection.projectionKind, "results");
    await call("poll-open");
    // The open vote is no longer the selected slide when broadcasting stops.
    await call("select", { id: "title" });
    await call("show");
    const stopped = await call("live", { live: false });
    assert.equal(stopped.live, false);
    assert.equal(status, "locked");
    await call("select", { id: "vote" });
    const resumed = await call("live", { live: true });
    assert.equal(resumed.graphPoll?.snapshot?.status, "locked");
    assert.ok(resumed.graphPoll?.frozen);
    assert.equal(resumed.projection.projectionKind, "results");
    await call("live", { live: false });
    assert.equal(writes.at(-1)!.live, false);
    await call("select", { id: "title" });
    await call("show");
    await wait();
    assert.equal(writes.at(-1)!.title, "Waiting for the lecturer");
    await call("live", { live: true });
    await wait();
    assert.equal(writes.at(-1)!.title, "Public title");
    assert.equal(cleanups, 1, "Resuming does not reset the lecture again");
    assert.doesNotMatch(
      JSON.stringify(writes),
      /PRIVATE|private-output|workspace/,
    );
  } finally {
    await new Promise((resolve) => studio.server.close(resolve));
  }
});
