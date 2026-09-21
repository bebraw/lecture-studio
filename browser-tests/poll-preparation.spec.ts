import { expect } from "@playwright/test";
import { test } from "./audience-fixture.ts";
import { fixture } from "../tests/fixture.ts";
import { AudiencePoll } from "../lib/audience-poll.ts";

test("Obsidian polls prepare new rooms and protect votes from changed definitions", async ({
  audience,
  page,
}) => {
  const id = "conference-prediction";
  const endpoint = new URL("/presenter/rooms/" + id + "/prepare", audience.url)
    .href;
  const definition = {
    question: "Which prediction holds?",
    options: [
      { id: "fast", label: "Faster" },
      { id: "same", label: "Unchanged" },
    ],
    defaultId: "same",
  };
  const prepare = (body: unknown) =>
    audience.request(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  expect(
    (
      await fetch(endpoint, {
        method: "POST",
        body: JSON.stringify(definition),
      })
    ).status,
  ).toBe(401);
  expect(
    (
      await prepare({
        ...definition,
        options: [definition.options[0], definition.options[0]],
      })
    ).status,
  ).toBe(400);
  const poll = new AudiencePoll({
    origin: audience.url,
    token: "fixture",
    room: id,
    fetcher: (url, init) => audience.request(url, init),
  });
  poll.configure(definition);
  await poll.prepare();
  expect(poll.snapshot).toMatchObject({
    status: "locked",
    totalVotes: 0,
    choices: definition.options,
  });
  await poll.act("open");
  await audience.admin("/presenter/stage", {
    live: true,
    mode: "material",
    title: "Prediction",
    html: "",
    projectionKind: "poll",
    pollId: id,
  });
  await page.goto(audience.url);
  await expect(page.locator("h1")).toHaveText(definition.question);
  await page.getByLabel("Faster").check();
  await page.getByRole("button", { name: /vote/i }).click();
  await poll.act("lock");
  expect(poll.snapshot?.totalVotes).toBe(1);
  expect((await prepare(definition)).status).toBe(200);
  for (const changed of [
    { ...definition, question: "A different question?" },
    {
      ...definition,
      options: [{ id: "fast", label: "Slower" }, definition.options[1]],
    },
    { ...definition, options: [...definition.options].reverse() },
    { ...definition, defaultId: "fast" },
  ]) {
    const rejected = await prepare(changed);
    expect(rejected.status).toBe(409);
    expect(await rejected.text()).toBe(
      "Poll definition conflicts with existing votes or open voting",
    );
  }
  const after: unknown = await audience
    .request(new URL("/api/rooms/" + id, audience.url).href, {})
    .then((r) => r.json());
  expect(after).toMatchObject({
    totalVotes: 1,
    choices: [
      { id: "fast", label: "Faster", votes: 1 },
      { id: "same", label: "Unchanged", votes: 0 },
    ],
  });
  await audience.admin("/presenter/reset-lecture");
  expect(
    (
      await prepare({
        ...definition,
        question: "Revised after explicit reset?",
      })
    ).status,
  ).toBe(200);
});

test("loading a presentation prepares authored polls and reloads only on demand", async ({
  audience,
  page,
}) => {
  const path = "Lectures/Test/Presentations/Prediction.md";
  const definition = {
    version: 1,
    title: "Conference",
    start: "predict",
    steps: [
      {
        id: "predict",
        type: "poll",
        title: "Prediction",
        room: "obsidian-prediction",
        poll: {
          question: "Before the example?",
          options: [
            { id: "yes", label: "Yes" },
            { id: "no", label: "No" },
          ],
          defaultId: "no",
        },
      },
    ],
  };
  const library = {
    status: "Connected",
    list: async () => [{ path, label: "Conference" }],
    read: async () => ({
      sections: [
        {
          heading: "Presentation",
          body: "```json\n" + JSON.stringify(definition) + "\n```",
        },
      ],
    }),
    close: async () => {},
  };
  const poll = new AudiencePoll({
    origin: audience.url,
    token: "fixture",
    fetcher: (url, init) => audience.request(url, init),
  });
  const { stop, address } = await fixture({ library, poll });
  try {
    await page.goto(address.deskUrl);
    await page.locator("#presentation-name").click();
    await page.locator("#presentation-load").click();
    await expect(page.locator("#audience-readiness")).toContainText(
      "1 polls prepared",
    );
    const roomUrl = new URL("/rooms/obsidian-prediction", audience.url);
    expect(await fetch(roomUrl).then((r) => r.text())).toContain(
      "Before the example?",
    );
    definition.steps[0]!.poll.question = "Revised prediction?";
    expect(await fetch(roomUrl).then((r) => r.text())).not.toContain(
      "Revised prediction?",
    );
    await page.locator("#presentation-name").click();
    await page
      .getByRole("button", { name: "Reload from Obsidian", exact: true })
      .click();
    await expect
      .poll(() => fetch(roomUrl).then((r) => r.text()))
      .toContain("Revised prediction?");
  } finally {
    await stop();
  }
});
