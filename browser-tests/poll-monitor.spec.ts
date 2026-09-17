import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { fixture } from "../tests/fixture.ts";
import { AudiencePoll } from "../lib/audience-poll.ts";
import { audienceProtocol } from "../shared/audience-protocol.ts";

test("lecturer sees incoming and changed votes without projecting results", async ({
  context,
}) => {
  const options = [
    { id: "a", label: "Clearer navigation" },
    { id: "b", label: "Faster feedback" },
  ];
  let votes = [0, 0];
  let revision = 0;
  let status = "locked";
  const poll = new AudiencePoll({
    origin: "https://lecture-votes-20260909-bfbeb2745cce.survivejs.workers.dev",
    token: "fixture",
    fetcher: async (url) => {
      if (url.endsWith("/api/capabilities"))
        return Response.json(audienceProtocol);
      if (url.endsWith("/open-session")) status = "open";
      if (url.endsWith("/lock")) status = "locked";
      return Response.json({
        status,
        revision,
        totalVotes: votes.reduce((a, b) => a + b, 0),
        choices: options.map((option, i) => ({ ...option, votes: votes[i] })),
      });
    },
  });
  const path = "Lectures/Test/Presentations/Votes.md";
  const definition = {
    version: 1,
    title: "Vote feedback",
    start: "vote",
    steps: [
      {
        id: "vote",
        type: "poll",
        title: "What would help?",
        room: "webdev-2026-friction",
        poll: { question: "What would help?", options, defaultId: "a" },
      },
      { id: "next", type: "material", title: "Continue" },
    ],
  };
  const library = {
    status: "Connected · fixture",
    list: async () => [{ path, label: "Votes" }],
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
  const { stop, address } = await fixture({ library, poll });
  try {
    const desk = await context.newPage();
    const stage = await context.newPage();
    await desk.goto(address.deskUrl);
    await stage.goto(address.stageUrl);
    await desk.locator("#presentation-name").click();
    await desk.locator("#presentation-load").click();
    await desk.locator("#live-toggle").click();
    const monitor = desk.locator("#poll-monitor");
    await expect(monitor).toBeVisible();
    await expect(monitor).toContainText("Voting open");
    await expect(monitor).toContainText("0 votes");
    votes = [2, 1];
    revision++;
    await expect(monitor.locator(".poll-monitor-total")).toHaveText("3 votes", {
      timeout: 10000,
    });
    await expect(monitor.locator('[data-option-id="a"]')).toContainText(
      "2 · 67%",
    );
    await expect(monitor.locator(".poll-monitor-activity")).toContainText(
      "+3 votes",
    );
    await expect(desk.locator("#projection-status")).toHaveText(
      "On stage: Poll",
    );
    await expect(stage.locator("#poll-monitor")).toHaveCount(0);
    await expect(stage.locator("body")).not.toContainText("Last change");
    votes = [1, 2];
    revision++;
    await expect(monitor.locator('[data-option-id="b"]')).toContainText(
      "2 · 67%",
      { timeout: 10000 },
    );
    await expect(monitor.locator(".poll-monitor-activity")).toContainText(
      "Votes updated",
    );
    await expect(
      monitor.locator('[data-option-id="a"] .poll-monitor-delta'),
    ).toHaveText("-1");
    await desk.screenshot({
      path: test.info().outputPath("lecture-poll-monitor.png"),
      fullPage: true,
    });
    expect(
      (await new AxeBuilder({ page: desk }).include("#poll-monitor").analyze())
        .violations,
    ).toEqual([]);
    await desk.locator("#graph-close").click();
    await expect(monitor).toContainText("Voting closed");
    await desk.locator("#graph-next").click();
    await expect(monitor).toBeHidden();
  } finally {
    await stop();
  }
});
