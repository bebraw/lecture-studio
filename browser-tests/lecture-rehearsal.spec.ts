import { readFile } from "node:fs/promises";
import { expect } from "@playwright/test";
import { parse } from "valibot";
import { test } from "./audience-fixture.ts";
import { fixture } from "../tests/fixture.ts";
import { AudiencePoll } from "../lib/audience-poll.ts";
import { sections } from "../lib/material.ts";
import { parsePresentation } from "../lib/presentation.ts";
import { parseApiResponse } from "../shared/api.ts";
import { audienceResponseSchema } from "../shared/audience-schemas.ts";
import { feedbackSchema } from "../shared/schemas.ts";

test("real lecture rehearses every audience activity and build checkpoint", async ({
  audience,
  page,
}) => {
  test.setTimeout(120000);
  const markdown = await readFile(
    new URL("../docs/presentations/web-development-2026.md", import.meta.url),
    "utf8",
  );
  const deck = parsePresentation(sections(markdown));
  const path = "Lectures/Web Development 2026/Presentations/Rehearsal.md";
  const poll = new AudiencePoll({
    origin: audience.url.replace(/\/$/, ""),
    token: "fixture",
    fetcher: audience.request,
  });
  const local = await fixture({
    poll,
    library: {
      status: "Connected · rehearsal",
      list: async () => [{ path, label: deck.title }],
      read: async () => sections(markdown),
      close: async () => {},
    },
  });
  const call = async (op: string, body: object = {}) => {
    const response = await fetch(
      local.address.origin + "/api/presentation/" + op,
      {
        method: "POST",
        headers: {
          origin: local.address.origin,
          authorization: "Bearer " + local.address.deskToken,
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );
    const value: unknown = await response.json();
    expect(response.status, JSON.stringify(value)).toBe(200);
    return parseApiResponse("desk", value);
  };
  const show = async (id: string) => {
    await call("select", { id });
    return call("show");
  };
  const publicState = async () =>
    parse(
      audienceResponseSchema,
      await (await fetch(new URL("/api/audience", audience.url))).json(),
    );
  const feedback = async (body: object) =>
    parse(
      feedbackSchema,
      await (await audience.admin("/presenter/feedback", body)).json(),
    );
  const rounds = new Map<string, string>();
  try {
    await call("load", { path });
    const firstCloud = deck.steps.find((s) => s.wordCloud)!;
    await call("select", { id: firstCloud.id });
    await call("live", { live: true });
    const cold = await feedback({ action: "close" });
    expect(cold.config?.round).toBeTruthy();
    await call("live", { live: false });
    await call("live", { live: true });
    const resumed = await feedback({ action: "close" });
    expect(resumed.config?.round).toBe(cold.config?.round);
    await page.goto(audience.url);
    let previousPoll = false;
    for (const step of deck.steps) {
      const shown = await show(step.id);
      if (step.type === "poll") {
        expect(shown.graphPoll?.snapshot?.status).toBe("open");
        await expect
          .poll(async () => (await publicState()).poll?.id)
          .toBe(step.room);
        const vote = await fetch(new URL("/rooms/" + step.room, audience.url), {
          method: "POST",
          redirect: "manual",
          headers: {
            origin: new URL(audience.url).origin,
            "content-type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({ choice: step.poll!.options[0]!.id }),
        });
        expect(vote.status).toBe(303);
      } else if (previousPoll) {
        await expect.poll(async () => (await publicState()).poll).toBeNull();
        expect(shown.projection.title).toBe(step.title);
      }
      previousPoll = step.type === "poll";
      if (step.wordCloud) {
        const config = parse(
          feedbackSchema,
          await (
            await audience.request(
              new URL("/presenter/feedback", audience.url).href,
              { method: "GET" },
            )
          ).json(),
        ).config;
        expect(config?.open).toBe(true);
        rounds.set(step.id, config!.round);
        for (let i = 0; i < 12; i++) {
          const response = await fetch(new URL("/api/feedback", audience.url), {
            method: "POST",
            headers: {
              origin: new URL(audience.url).origin,
              "content-type": "application/json",
            },
            body: JSON.stringify({
              round: config!.round,
              text: i < 6 ? "date" : "clear source",
            }),
          });
          expect(response.status).toBe(201);
        }
        const submitted = await feedback({ action: "close" });
        for (const item of submitted.items)
          await feedback({ action: "approve", id: item.id });
      }
      if (step.type === "build") {
        expect(shown.presentation?.resolved.missing).toEqual([]);
        if (step.wordsFrom)
          expect(shown.presentation?.resolved.prompt).toContain(
            '"text":"date"',
          );
        local.bridge.state = {
          ...local.bridge.state,
          status: "ready",
          turnId: null,
          requests: [],
        };
        const started = await call("build");
        expect(started.presentation?.runs.at(-1)?.status).toBe("running");
        local.bridge.state = {
          ...local.bridge.state,
          status: "ready",
          outcome: "failed",
          turnId: null,
          requests: [],
        };
        const retry = await call("build", { retry: true });
        expect(retry.presentation?.runs.at(-1)?.prompt).toBe(
          started.presentation?.runs.at(-1)?.prompt,
        );
        local.bridge.state = {
          ...local.bridge.state,
          status: "ready",
          outcome: "completed",
          turnId: null,
          requests: [],
        };
      }
      expect(shown.projection.html.length).toBeLessThan(18000);
    }
    for (const [id, round] of rounds) {
      await show(id);
      const restored = await feedback({ action: "close" });
      expect(restored.config?.round).toBe(round);
      expect(restored.items).toHaveLength(12);
    }
    await call("live", { live: false });
    expect((await publicState()).poll).toBeNull();
  } finally {
    await local.stop();
  }
});
