import { audienceProtocol } from "../shared/audience-protocol.ts";
import { test, expect } from "@playwright/test";
import { fixture } from "../tests/fixture.ts";
import { AudiencePoll } from "../lib/audience-poll.ts";

test("desk previews actual poll projection and long questions fit the stage", async ({
  context,
}) => {
  const title =
    "When you use the web today, what feels unnecessarily difficult?";
  const options = [
    "Finding information",
    "Repeating information",
    "Navigating interfaces",
    "Knowing what to trust",
  ].map((label, i) => ({ id: "option-" + i, label }));
  const config = { question: title, options, defaultId: "option-0" };
  const poll = new AudiencePoll({
    origin: "https://lecture-votes-20260909-bfbeb2745cce.survivejs.workers.dev",
    token: "fixture",
    fetcher: async (url) =>
      url.endsWith("/api/capabilities")
        ? Response.json(audienceProtocol)
        : Response.json({
            status: url.endsWith("/open-session") ? "open" : "locked",
            revision: 1,
            totalVotes: 0,
            choices: options.map((o) => ({ ...o, votes: 0 })),
          }),
  });
  const path = "Lectures/Web Development 2026/Presentations/Test.md";
  const definition = {
    version: 1,
    title: "Test",
    start: "vote",
    steps: [
      {
        id: "vote",
        type: "poll",
        title,
        room: "webdev-2026-friction",
        poll: config,
      },
    ],
  };
  const library = {
    status: "Fixture",
    list: async () => [{ path, label: "Test" }],
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
  const { stop, address } = await fixture({ library, poll });
  try {
    const desk = await context.newPage(),
      stage = await context.newPage();
    await desk.goto(address.deskUrl);
    await stage.goto(address.stageUrl);
    await desk.locator("#presentation-name").click();
    await desk.locator("#presentations-list").click();
    await desk.locator("#presentation-load").click();
    await desk.locator("#live-toggle").click();
    await expect(desk.locator("#projection-status")).toHaveText(
      "On stage: Poll",
    );
    await desk.locator("#graph-results").click();
    await expect(desk.locator("#projection-status")).toHaveText(
      "On stage: Results",
    );
    await expect(
      desk.frameLocator("#current-stage > iframe").locator("body"),
    ).toContainText("Finding information: 0");
    await expect(desk.locator("#graph-results")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await desk.locator("#graph-question").click();
    await expect(
      desk.frameLocator("#current-stage > iframe").locator("body"),
    ).not.toContainText("Finding information: 0");
    await expect(stage.locator("#stage-content h1")).toHaveText(title);
    for (const viewport of [
      { width: 1920, height: 1080 },
      { width: 1280, height: 720 },
      { width: 1024, height: 600 },
      { width: 390, height: 844 },
    ]) {
      await stage.setViewportSize(viewport);
      await expect
        .poll(() =>
          stage
            .locator("#stage-content")
            .evaluate(
              (el) =>
                el.scrollHeight <= el.clientHeight + 1 &&
                el.scrollWidth <= el.clientWidth + 1,
            ),
        )
        .toBe(true);
      const footer = await stage.locator(".stage-bottom").boundingBox();
      expect(footer!.y + footer!.height).toBeLessThanOrEqual(viewport.height);
    }
    await stage.setViewportSize({ width: 1280, height: 720 });
    await stage.screenshot({ path: "test-results/stage-long-question.png" });
    await desk.screenshot({ path: "test-results/desk-projection.png" });
  } finally {
    await stop();
  }
});
