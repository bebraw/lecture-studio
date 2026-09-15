import { test, expect } from "@playwright/test";
import { fixture } from "../tests/fixture.ts";

test("desk preview shares Stage typography and layout for titles and dividers", async ({
  browser,
}) => {
  const path = "Lectures/Web Development 2026/Presentations/Parity.md";
  const definition = {
    version: 1,
    title: "Parity",
    start: "opening",
    steps: [
      {
        id: "opening",
        type: "title",
        chapter: "Opening",
        title: "Web development: past, present, and possible futures",
        body: "A lecture about the web.\n\nLecturer · 2026",
        next: "past",
      },
      {
        id: "past",
        type: "title",
        chapter: "Past",
        title: "Past",
        body: "Finding and connecting knowledge",
      },
    ],
  };
  const local = await fixture({
    library: {
      status: "Connected · fixture",
      list: async () => [{ path, label: "Parity" }],
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
  const desk = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const stage = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
  });
  try {
    await desk.goto(local.address.deskUrl);
    await desk.locator("#presentation-name").click();
    await desk.locator("#presentation-load").click();
    await desk.locator("#live-toggle").click();
    await stage.goto(local.address.stageUrl);
    for (const title of [definition.steps[0]!.title, "Past"]) {
      const preview = desk.frameLocator("#current-stage > iframe");
      await expect(stage.locator("h1")).toHaveText(title);
      await expect(preview.locator("h1")).toHaveText(title);
      const geometry = (el: Element) => {
        const css = getComputedStyle(el);
        return [
          css.fontFamily,
          css.fontSize,
          css.lineHeight,
          css.width,
          css.height,
          css.marginBottom,
          css.color,
        ];
      };
      for (const selector of [
        "h1",
        ".stage-copy",
        ".stage-copy > p:last-child",
        "#stage-content",
      ]) {
        expect(await preview.locator(selector).evaluate(geometry)).toEqual(
          await stage.locator(selector).evaluate(geometry),
        );
      }
      await expect(preview.locator("body")).toHaveCSS(
        "background-color",
        await stage
          .locator("body")
          .evaluate((el) => getComputedStyle(el).backgroundColor),
      );
      await desk.setViewportSize({ width: 1000, height: 800 });
      expect(await preview.locator("h1").evaluate(geometry)).toEqual(
        await stage.locator("h1").evaluate(geometry),
      );
      if (title !== "Past") await desk.locator("#graph-next").click();
    }
  } finally {
    await local.stop();
  }
});
