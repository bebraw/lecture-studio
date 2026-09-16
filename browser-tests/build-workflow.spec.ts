import { audienceProtocol } from "../shared/audience-protocol.ts";
import { test, expect } from "@playwright/test";
import { fixture } from "../tests/fixture.ts";
import { AudiencePoll, themePoll } from "../lib/audience-poll.ts";

test("a slow demo can be skipped, revisited and stopped without blocking the next build", async ({
  page,
}) => {
  const path = "Lectures/Web Development 2026/Presentations/Slow.md";
  const definition = {
    version: 1,
    title: "Slow demo",
    start: "build-document",
    steps: [
      {
        id: "build-document",
        type: "build",
        title: "First build",
        body: "Build first",
        next: "check",
      },
      {
        id: "check",
        type: "material",
        title: "Demo checkpoint",
        previewOf: "build-document",
        next: "after",
      },
      {
        id: "after",
        type: "material",
        title: "Continue lecture",
        body: "Keep explaining",
        next: "second",
      },
      {
        id: "second",
        type: "build",
        title: "Second build",
        body: "Build second",
      },
    ],
  };
  const { address, bridge, stop } = await fixture({
    library: {
      status: "Connected · fixture",
      list: async () => [{ path, label: "Slow demo" }],
      read: async () => ({
        sections: [
          {
            heading: "Presentation",
            body: "```json\n" + JSON.stringify(definition) + "\n```",
          },
        ],
      }),
      close: async () => {},
    },
  });
  try {
    await page.goto(address.deskUrl);
    await page.locator("#presentation-name").click();
    await page.locator("#presentation-load").click();
    await page.locator("#live-toggle").click();
    await page.locator("#graph-build").click();
    await expect(
      page.getByRole("button", { name: "Stop build", exact: true }),
    ).toBeVisible();
    await expect(page.locator("#background-build-notice")).toContainText(
      "First build is still active",
    );
    await page.locator("#graph-next").click();
    await page
      .getByRole("button", { name: "Skip demo →", exact: true })
      .click();
    const stage = page.frameLocator("#current-stage > iframe").locator("body");
    await expect(stage).toContainText("Keep explaining");
    expect(bridge.state.turnId).toBe("fake-turn");
    await page.locator("#build-timings summary").click();
    await expect(page.locator("#build-timings tbody tr")).toHaveCount(1);
    await expect(page.locator("#build-timings tbody")).toContainText(
      "Codex default",
    );
    // A late completion must not replace the slide the lecturer has moved to.
    bridge.state = {
      ...bridge.state,
      status: "ready",
      outcome: "completed",
      turnId: null,
      requests: [],
    };
    await expect(page.locator("#background-build-notice")).toBeHidden();
    await expect(stage).toContainText("Keep explaining");
    await page.locator('[data-step-id="check"]').click();
    await expect(
      page.getByRole("button", { name: "Skip demo →", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Skip demo →", exact: true })
      .click();
    await page.locator("#graph-next").click();
    await page.locator("#graph-build").click();
    await expect.poll(() => bridge.lastPrompt).toContain("Build second");
    await expect(page.locator("#graph-build")).toBeDisabled();
    await page.getByRole("button", { name: "Stop build", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Retry this build", exact: true }),
    ).toBeEnabled();
    await expect(page.locator('[data-step-id="second"]')).toHaveAttribute(
      "aria-current",
      "step",
    );
    await page
      .getByRole("button", { name: "Retry this build", exact: true })
      .click();
    await expect(page.locator("#graph-build")).toBeDisabled();
    expect(bridge.state.turnId).toBe("fake-turn");
    await expect(page.locator("#build-timings tbody tr")).toHaveCount(3);
    await expect(page.locator("#build-timings tbody")).toContainText(
      "completed",
    );
    await expect(page.locator("#build-timings tbody")).toContainText(
      "interrupted",
    );
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download timing history" }).click();
    expect((await download).suggestedFilename()).toBe(
      "lecture-build-timings.json",
    );
  } finally {
    await stop();
  }
});

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
    await expect(
      desk.frameLocator("#current-stage > iframe").locator("body"),
    ).toContainText("Selected: Retro web");
    await desk.locator("#graph-next").click();
    await expect(desk.locator("#graph-prompt")).toContainText(
      "Use retro styling.",
    );
    expect(bridge.lastPrompt).toBeUndefined();
    await desk.locator("#graph-previous").click();
    await expect(
      desk.frameLocator("#current-stage > iframe").locator("body"),
    ).toContainText("Selected: Retro web");
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
