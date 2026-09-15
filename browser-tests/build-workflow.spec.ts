import { audienceProtocol } from "../shared/audience-protocol.ts";
import { test, expect } from "@playwright/test";
import { fixture } from "../tests/fixture.ts";
import { AudiencePoll, themePoll } from "../lib/audience-poll.ts";
test("a frozen vote feeds the explicit build without launching during navigation", async ({
  context,
}) => {
  const path = "Lectures/Web Development 2026/Presentations/Build.md";
  const definition = {
    version: 1,
    title: "Build",
    start: "vote",
    steps: [
      {
        id: "vote",
        type: "poll",
        title: "Choose a theme",
        room: "webdev-2026",
        poll: themePoll(),
        next: "build",
      },
      {
        id: "build",
        type: "build",
        title: "Build the app",
        body: "Implement the seminar view.",
        uses: [
          {
            poll: "vote",
            instructions: {
              editorial: "Use editorial styling.",
              "retro-web": "Use retro styling.",
              playful: "Use playful styling.",
            },
          },
        ],
      },
    ],
  };
  const sessions: (string | null)[] = [];
  let opened = false;
  const poll = new AudiencePoll({
    origin: "https://audience.invalid",
    token: "test",
    fetcher: async (url, init) => {
      if (url.endsWith("/api/capabilities"))
        return Response.json(audienceProtocol);
      if (url.endsWith("/presenter/stage"))
        return new Response(null, { status: 204 });
      if (url.endsWith("/open-session")) {
        sessions.push(new Headers(init.headers).get("X-Lecture-Session"));
        opened = true;
      }
      if (url.endsWith("/lock")) opened = false;
      return Response.json({
        status: opened ? "open" : "locked",
        revision: 2,
        totalVotes: 3,
        choices: themePoll().options.map((o, i) => ({
          ...o,
          votes: i === 1 ? 3 : 0,
        })),
      });
    },
  });
  const library = {
    status: "Connected · fixture",
    list: async () => [{ path, label: "Build" }],
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
  const { stop, address, bridge } = await fixture({ poll, library });
  try {
    const desk = await context.newPage();
    await desk.goto(address.deskUrl);
    await desk.locator("#presentation-name").click();
    await desk.locator("#presentation-load").click();
    await desk.locator("#live-toggle").click();
    expect(bridge.lastPrompt).toBeUndefined();
    await expect(desk.locator("#graph-open")).toBeHidden();
    expect(sessions).toHaveLength(1);
    await desk.locator("#graph-close").click();
    await expect(desk.locator("#current-stage")).toContainText(
      "Selected: Retro web",
    );
    await desk.locator("#graph-next").click();
    await expect(desk.locator("#graph-prompt")).toContainText(
      "Use retro styling.",
    );
    expect(bridge.lastPrompt).toBeUndefined();
    await desk.locator("#graph-previous").click();
    await expect(desk.locator("#current-stage")).toContainText(
      "Selected: Retro web",
    );
    expect(sessions).toHaveLength(1);
    await desk.locator("#graph-next").click();
    await desk.locator("#graph-build").click();
    await expect.poll(() => bridge.lastPrompt).toContain("Use retro styling.");
    await expect(desk.locator("#graph-build")).toBeDisabled();
    const original = bridge.lastPrompt;
    bridge.state = {
      ...bridge.state,
      status: "ready",
      outcome: "failed",
      turnId: null,
      requests: [],
    };
    await expect(
      desk.getByRole("button", { name: "Retry this build" }),
    ).toBeEnabled();
    await desk.getByRole("button", { name: "Retry this build" }).click();
    await expect(desk.locator("#graph-build")).toBeDisabled();
    expect(bridge.lastPrompt).toBe(original);
  } finally {
    await stop();
  }
});
